# Task Manager — Terraform Infrastructure

Provisions the complete AWS infrastructure for the Task Manager app:
- **S3** — Angular SPA static files (private, CloudFront OAC only)
- **CloudFront** — HTTPS CDN; serves SPA from S3, routes `/api/*` to EC2
- **EC2 t3.small** — Node.js backend (Ubuntu 22.04, Nginx, PM2)
- **Elastic IP** — static IP for EC2
- **IAM** — EC2 instance profile (SSM access) + GitHub Actions deploy user
- **SSM Parameter Store** — MongoDB URI + JWT secret (encrypted SecureString)

**Estimated cost: ~$16.50/month** (EC2 ~$15 + S3/CloudFront ~$0.87 + Route53 $0.50)

---

## Prerequisites

1. **Terraform ≥ 1.6** — [install](https://developer.hashicorp.com/terraform/install)
2. **AWS CLI** configured with credentials that have AdministratorAccess (or a scoped policy)
3. **MongoDB Atlas M0 cluster** — free tier at [cloud.mongodb.com](https://cloud.mongodb.com)
   - Create cluster → Connect → Drivers → copy the `mongodb+srv://` connection string
   - Network access: add `0.0.0.0/0` temporarily; **tighten to EC2 Elastic IP after `terraform apply`**

---

## Step-by-step

### 1. Configure variables

```bash
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — fill in your mongodb_uri and jwt_secret
```

> **`terraform.tfvars` is gitignored.** Never commit it — it contains your database credentials.

### 2. Initialize Terraform

```bash
terraform init
```

### 3. Preview what will be created

```bash
terraform plan
```

Review the output. You should see ~20 resources being created.

### 4. Apply (create all infrastructure)

```bash
terraform apply
```

Type `yes` when prompted. Takes **5–10 minutes** (EC2 boot + software install via user_data).

### 5. Check outputs

```bash
terraform output
```

Key outputs:
- `cloudfront_url` — your live app URL (open this in a browser!)
- `ec2_public_ip` — EC2 Elastic IP
- `ec2_ssh_command` — ready-to-run SSH command
- `github_secrets_summary` — all secrets to add to GitHub

### 6. Retrieve sensitive outputs

```bash
# GitHub Actions deploy credentials
terraform output -raw github_actions_secret_access_key

# EC2 SSH private key (already saved to task-manager-key.pem, but also here)
terraform output -raw ec2_ssh_private_key
```

### 7. Add GitHub Actions secrets

Go to: **github.com/akash-solanki-196471/task_manager → Settings → Secrets and variables → Actions**

Add these 7 secrets (values from `terraform output`):

| Secret | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | `terraform output github_actions_access_key_id` |
| `AWS_SECRET_ACCESS_KEY` | `terraform output -raw github_actions_secret_access_key` |
| `S3_BUCKET_NAME` | `terraform output s3_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `terraform output cloudfront_distribution_id` |
| `EC2_HOST` | `terraform output ec2_public_ip` |
| `EC2_SSH_PRIVATE_KEY` | `terraform output -raw ec2_ssh_private_key` |
| `ALLOWED_ORIGINS` | `terraform output cloudfront_url` |

### 8. Tighten MongoDB Atlas network access

After apply, add your EC2 Elastic IP (`terraform output ec2_public_ip`) to the Atlas network allowlist and remove `0.0.0.0/0`.

### 9. Seed the admin user (first deploy only)

```bash
# SSH into EC2
ssh -i task-manager-key.pem ubuntu@$(terraform output -raw ec2_public_ip)

# On EC2:
cd /opt/task-manager/backend
node seed_admin.js
```

### 10. Deploy the application

Push to `aws-deployment` — GitHub Actions runs automatically:

```bash
git push origin aws-deployment
```

Watch the Actions tab in GitHub for the deploy progress.

### 11. Verify

```bash
# Health check
curl $(terraform output -raw cloudfront_url)/api/health

# SPA routing (should return 200, not 404)
curl -I $(terraform output -raw cloudfront_url)/login
```

---

## EC2 Bootstrap timing

The EC2 instance runs `user_data.sh` on first boot. This takes **3–5 minutes** after `terraform apply` completes. 

Check bootstrap progress:
```bash
ssh -i task-manager-key.pem ubuntu@EC2_IP
tail -f /var/log/user-data.log
```

Wait until you see `=== Bootstrap complete ===` before running the GitHub Actions deploy.

---

## Destroy all resources

```bash
terraform destroy
```

> ⚠️ This permanently deletes everything including the S3 bucket and EC2 instance. The app will go offline.

---

## Files

| File | Purpose |
|---|---|
| `main.tf` | Provider config + Terraform backend |
| `variables.tf` | Input variable definitions |
| `terraform.tfvars.example` | Template — copy to `terraform.tfvars` |
| `s3.tf` | S3 bucket + OAC |
| `cloudfront.tf` | CloudFront distribution |
| `ec2.tf` | EC2 instance + key pair + security group + Elastic IP + IAM instance profile |
| `user_data.sh` | EC2 first-boot script (Node, Nginx, PM2, repo clone, PM2 start) |
| `iam.tf` | GitHub Actions IAM user + deploy policy |
| `ssm.tf` | SSM Parameter Store (MongoDB URI + JWT secret) |
| `outputs.tf` | All values you need post-apply |
