variable "aws_region" {
  description = "AWS region for all resources (except CloudFront which is global)"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Deployment environment label (used in resource names and tags)"
  type        = string
  default     = "production"
}

variable "app_name" {
  description = "Application name prefix for all resource names"
  type        = string
  default     = "task-manager"
}

variable "ec2_instance_type" {
  description = "EC2 instance type for the backend API server"
  type        = string
  default     = "t3.small"
}

variable "ec2_ssh_allowed_cidr" {
  description = "CIDR block allowed to SSH into the EC2 instance. Restrict to your IP for security."
  type        = string
  default     = "0.0.0.0/0"  # Change to 'YOUR.IP.HERE/32' before production use
}

variable "mongodb_uri" {
  description = "MongoDB Atlas connection string (mongodb+srv://...). Stored in SSM SecureString."
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT signing secret (minimum 32 chars). Stored in SSM SecureString."
  type        = string
  sensitive   = true
}
