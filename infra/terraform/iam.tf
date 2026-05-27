# ─────────────────────────────────────────────────────────────
# IAM user for GitHub Actions CI/CD
#
# Minimal permissions:
#   - S3: read/write/delete on the frontend bucket only
#   - CloudFront: create invalidations on this distribution only
#
# The access key is written to outputs — copy to GitHub Secrets.
# ─────────────────────────────────────────────────────────────

resource "aws_iam_user" "github_actions" {
  name = "${var.app_name}-github-actions-deploy"
  path = "/ci/"

  tags = {
    Purpose = "GitHub Actions CI/CD deployments"
  }
}

resource "aws_iam_user_policy" "github_actions_deploy" {
  name = "${var.app_name}-deploy-policy"
  user = aws_iam_user.github_actions.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "S3FrontendDeploy"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.frontend.arn,
          "${aws_s3_bucket.frontend.arn}/*"
        ]
      },
      {
        Sid    = "CloudFrontInvalidate"
        Effect = "Allow"
        Action = ["cloudfront:CreateInvalidation"]
        Resource = aws_cloudfront_distribution.main.arn
      }
    ]
  })
}

resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name
}
