# ─────────────────────────────────────────────────────────────
# Outputs — values needed after `terraform apply`
# ─────────────────────────────────────────────────────────────

output "cloudfront_url" {
  description = "Your application URL (add https:// prefix)"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "cloudfront_distribution_id" {
  description = "Add this as GitHub Secret: CLOUDFRONT_DISTRIBUTION_ID"
  value       = aws_cloudfront_distribution.main.id
}

output "s3_bucket_name" {
  description = "Add this as GitHub Secret: S3_BUCKET_NAME"
  value       = aws_s3_bucket.frontend.id
}

output "ec2_public_ip" {
  description = "EC2 Elastic IP — add this as GitHub Secret: EC2_HOST. Also allowlist in MongoDB Atlas."
  value       = aws_eip.backend.public_ip
}

output "ec2_public_dns" {
  description = "EC2 public DNS hostname"
  value       = aws_eip.backend.public_dns
}

output "ec2_ssh_command" {
  description = "Command to SSH into the EC2 instance"
  value       = "ssh -i task-manager-key.pem ubuntu@${aws_eip.backend.public_ip}"
}

output "github_actions_access_key_id" {
  description = "Add this as GitHub Secret: AWS_ACCESS_KEY_ID"
  value       = aws_iam_access_key.github_actions.id
}

output "github_actions_secret_access_key" {
  description = "Add this as GitHub Secret: AWS_SECRET_ACCESS_KEY"
  value       = aws_iam_access_key.github_actions.secret
  sensitive   = true
}

output "ec2_ssh_private_key" {
  description = "Add this as GitHub Secret: EC2_SSH_PRIVATE_KEY (the full PEM file contents)"
  value       = tls_private_key.ec2.private_key_pem
  sensitive   = true
}

output "github_secrets_summary" {
  description = "Summary of all GitHub Actions secrets to configure"
  value = <<-EOT
    ┌─────────────────────────────────────────────────────────────────┐
    │  GitHub Actions Secrets — set at repo Settings → Secrets        │
    ├────────────────────────────────┬────────────────────────────────┤
    │  AWS_ACCESS_KEY_ID             │  (see github_actions_access_key_id output)
    │  AWS_SECRET_ACCESS_KEY         │  run: terraform output -raw github_actions_secret_access_key
    │  S3_BUCKET_NAME                │  ${aws_s3_bucket.frontend.id}
    │  CLOUDFRONT_DISTRIBUTION_ID    │  ${aws_cloudfront_distribution.main.id}
    │  EC2_HOST                      │  ${aws_eip.backend.public_ip}
    │  EC2_SSH_PRIVATE_KEY           │  run: terraform output -raw ec2_ssh_private_key
    │  ALLOWED_ORIGINS               │  https://${aws_cloudfront_distribution.main.domain_name}
    └────────────────────────────────┴────────────────────────────────┘
  EOT
}
