terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }

  # Optional: uncomment to store Terraform state in S3 (recommended for teams).
  # Create the bucket manually FIRST, then uncomment and run `terraform init`.
  #
  # backend "s3" {
  #   bucket = "your-terraform-state-bucket"
  #   key    = "task-manager/terraform.tfstate"
  #   region = "us-east-1"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "task-manager"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront requires ACM certs in us-east-1 — even if your main region is different,
# we always create a us-east-1 provider alias for that purpose (unused here since we
# use the default CloudFront certificate, but kept for easy future expansion).
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Project     = "task-manager"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}
