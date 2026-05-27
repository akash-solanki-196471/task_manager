# ─────────────────────────────────────────────────────────────
# SSM Parameter Store — secrets for the backend
#
# Values come from terraform.tfvars (never committed to git).
# EC2 and GitHub Actions read these at deploy/boot time.
# ─────────────────────────────────────────────────────────────

resource "aws_ssm_parameter" "mongodb_uri" {
  name        = "/taskmanager/MONGODB_URI"
  description = "MongoDB Atlas connection string for task-manager"
  type        = "SecureString"
  value       = var.mongodb_uri

  tags = {
    Name = "${var.app_name}-mongodb-uri"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/taskmanager/JWT_SECRET"
  description = "JWT signing secret for task-manager"
  type        = "SecureString"
  value       = var.jwt_secret

  tags = {
    Name = "${var.app_name}-jwt-secret"
  }
}
