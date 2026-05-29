# ─────────────────────────────────────────────────────────────
# EC2 instance — Node.js backend (via Nginx + PM2)
# ─────────────────────────────────────────────────────────────

# Latest Ubuntu 22.04 LTS AMI (arm64 for Graviton / x86_64 for standard)
data "aws_ami" "ubuntu_22" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ── SSH key pair ────────────────────────────────────────────
# Terraform generates the key pair; private key is stored in tfstate
# AND written to disk as task-manager-key.pem (gitignored)

resource "tls_private_key" "ec2" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2" {
  key_name   = "${var.app_name}-key"
  public_key = tls_private_key.ec2.public_key_openssh
}

# Write private key to disk so you can SSH manually
resource "local_sensitive_file" "ec2_private_key" {
  content         = tls_private_key.ec2.private_key_pem
  filename        = "${path.module}/../../task-manager-key.pem"
  file_permission = "0600"
}

# ── Security Group ──────────────────────────────────────────
# CloudFront managed prefix list for the EC2 security group
data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

resource "aws_security_group" "backend" {
  name        = "${var.app_name}-backend-sg"
  description = "Task Manager backend - SSH + HTTP from CloudFront only"

  # SSH — restrict to your IP in production (var.ec2_ssh_allowed_cidr)
  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.ec2_ssh_allowed_cidr]
  }

  # HTTP port 80 — only CloudFront origin IPs (managed prefix list)
  ingress {
    description     = "HTTP from CloudFront"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  # All outbound traffic allowed (needed for npm, MongoDB Atlas, SSM)
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.app_name}-backend-sg"
  }
}

# ── IAM instance profile (EC2 → SSM Parameter Store) ───────
resource "aws_iam_role" "ec2" {
  name = "${var.app_name}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "ec2_ssm" {
  name = "${var.app_name}-ec2-ssm-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/taskmanager/*"
      },
      {
        # Required for SSM to decrypt SecureString parameters
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "ssm.${var.aws_region}.amazonaws.com"
          }
        }
      }
    ]
  })
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.app_name}-ec2-profile"
  role = aws_iam_role.ec2.name
}

# ── EC2 Instance ────────────────────────────────────────────
resource "aws_instance" "backend" {
  ami                    = data.aws_ami.ubuntu_22.id
  instance_type          = var.ec2_instance_type
  key_name               = aws_key_pair.ec2.key_name
  vpc_security_group_ids = [aws_security_group.backend.id]
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  # Enable termination protection in prod — comment out if you need to destroy
  # disable_api_termination = true

  root_block_device {
    volume_size           = 20
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true
  }

  # User data: run once on first boot to install all required software
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    app_name   = var.app_name
    aws_region = var.aws_region
  }))

  tags = {
    Name = "${var.app_name}-backend"
  }

  # Re-run user data if the script changes
  user_data_replace_on_change = false
}

# ── Elastic IP ──────────────────────────────────────────────
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "${var.app_name}-backend-eip"
  }
}
