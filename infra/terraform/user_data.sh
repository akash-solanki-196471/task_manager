#!/bin/bash
# EC2 bootstrap script — runs once on first launch
# Installs: Node 20, PM2, Nginx, AWS CLI v2, git
# Then clones the repo and sets up the backend service

set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "=== Task Manager EC2 Bootstrap ==="
echo "Started: $(date)"

# ── System updates ─────────────────────────────────────────
apt-get update -y
apt-get upgrade -y
apt-get install -y curl git nginx unzip

# ── Node.js 20 (via NodeSource) ────────────────────────────
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
echo "Node version: $(node -v)"
echo "npm version:  $(npm -v)"

# ── PM2 ────────────────────────────────────────────────────
npm install -g pm2
pm2 startup systemd -u ubuntu --hp /home/ubuntu
mkdir -p /var/log/pm2
chown ubuntu:ubuntu /var/log/pm2

# ── AWS CLI v2 ─────────────────────────────────────────────
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -q /tmp/awscliv2.zip -d /tmp
/tmp/aws/install
rm -rf /tmp/aws /tmp/awscliv2.zip
echo "AWS CLI version: $(aws --version)"

# ── Clone the repository ────────────────────────────────────
mkdir -p /opt/task-manager
git clone -b aws-deployment https://github.com/akash-solanki-196471/task_manager.git /opt/task-manager
chown -R ubuntu:ubuntu /opt/task-manager

# ── Fetch secrets from SSM and write .env ──────────────────
cd /opt/task-manager/backend

MONGODB_URI=$(aws ssm get-parameter \
  --name /taskmanager/MONGODB_URI \
  --with-decryption \
  --region ${aws_region} \
  --query Parameter.Value \
  --output text)

JWT_SECRET=$(aws ssm get-parameter \
  --name /taskmanager/JWT_SECRET \
  --with-decryption \
  --region ${aws_region} \
  --query Parameter.Value \
  --output text)

cat > /opt/task-manager/backend/.env <<EOF
NODE_ENV=production
PORT=5001
MONGODB_URI=$${MONGODB_URI}
JWT_SECRET=$${JWT_SECRET}
EOF

chown ubuntu:ubuntu /opt/task-manager/backend/.env
chmod 600 /opt/task-manager/backend/.env

# ── Install backend dependencies ───────────────────────────
cd /opt/task-manager/backend
sudo -u ubuntu npm ci --omit=dev

# ── Start backend with PM2 ─────────────────────────────────
sudo -u ubuntu pm2 start ecosystem.config.js --env production
sudo -u ubuntu pm2 save

# ── Nginx configuration ─────────────────────────────────────
cp /opt/task-manager/backend/nginx.conf /etc/nginx/sites-available/task-manager
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/task-manager /etc/nginx/sites-enabled/task-manager
nginx -t
systemctl enable nginx
systemctl restart nginx

echo "=== Bootstrap complete: $(date) ==="
echo "Backend running on port 5001 via Nginx on port 80"
