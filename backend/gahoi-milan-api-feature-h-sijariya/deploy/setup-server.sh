#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One-time provisioning for a fresh Ubuntu 24.04 EC2 instance.
#
#   scp setup-server.sh ubuntu@YOUR-EC2-IP:~
#   ssh ubuntu@YOUR-EC2-IP
#   chmod +x setup-server.sh && sudo ./setup-server.sh
#
# Installs Java, nginx and certbot, creates the service account and swap, and
# leaves the machine ready for the first deploy. Safe to re-run.
# ---------------------------------------------------------------------------
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo." >&2
  exit 1
fi

echo "==> Updating packages"
apt-get update -qq
apt-get upgrade -y -qq

echo "==> Installing Java 17, nginx, certbot, MySQL client"
apt-get install -y -qq \
  openjdk-17-jre-headless \
  nginx \
  certbot python3-certbot-nginx \
  mysql-client \
  unzip curl

echo "==> Installing the AWS CLI"
# Deliberately NOT `apt-get install awscli`. Ubuntu 24.04 dropped the package,
# and under `set -e` that one failure aborts everything below it. The official
# v2 installer does not depend on the distro's Python packaging.
#
# The deploy needs this: it pulls the jar from S3 with the instance role.
if ! command -v aws >/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install --update
  # v2 lands in /usr/local/bin, which is not on root's PATH under every
  # non-login shell - SSM's, for one.
  ln -sf /usr/local/bin/aws /usr/bin/aws
  rm -rf /tmp/awscliv2.zip /tmp/aws
fi
echo "    $(aws --version)"

echo "==> Creating the service account"
# No login shell and no home directory: this account exists to own a process,
# and giving it either would only widen what a compromise reaches.
id -u gahoi &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin gahoi

echo "==> Creating directories"
install -d -m 755 -o gahoi -g gahoi /opt/gahoi-milan
install -d -m 755 -o gahoi -g gahoi /var/log/gahoi-milan
install -d -m 750 -o root  -g gahoi /etc/gahoi-milan

echo "==> Environment file"
# The deploy refuses to run without this. It holds no credentials - only which
# Secrets Manager secret to read; the instance role supplies the rest.
if [[ ! -f /etc/gahoi-milan/gahoi-milan.env ]]; then
  cat > /etc/gahoi-milan/gahoi-milan.env <<'ENVFILE'
SECRET_ID=gahoi-milan/prod
AWS_REGION=ap-south-1
SERVER_PORT=8080
ENVFILE
  echo "    created"
else
  echo "    already present - leaving it alone"
fi
chown root:gahoi /etc/gahoi-milan/gahoi-milan.env
chmod 640 /etc/gahoi-milan/gahoi-milan.env

echo "==> Adding swap"
# A t3.small has 2 GB, enough for the 1 GB heap plus the OS in normal use.
# Swap covers the spikes - an apt upgrade landing during a deploy - so a
# momentary overshoot is a slow minute rather than an OOM kill. swappiness=10
# keeps the kernel out of it until it genuinely needs it.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "    2 GB swap added"
else
  echo "    swap already present"
fi

echo "==> Configuring the firewall"
# Only SSH and web. The API port 8080 is deliberately NOT opened: nginx
# reaches it over loopback, and leaving it exposed would let anyone bypass
# TLS and the rate limits by talking to Java directly.
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

echo "==> Enabling unattended security updates"
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades

echo "==> Setting the timezone"
timedatectl set-timezone Asia/Kolkata

cat <<'DONE'

===========================================================================
Server ready. Next:

  1. Copy your environment file:
       sudo cp gahoi-milan.env.example /etc/gahoi-milan/gahoi-milan.env
       sudo nano /etc/gahoi-milan/gahoi-milan.env       # fill in every value
       sudo chown root:gahoi /etc/gahoi-milan/gahoi-milan.env
       sudo chmod 640 /etc/gahoi-milan/gahoi-milan.env

  2. Install the systemd unit:
       sudo cp gahoi-milan.service /etc/systemd/system/
       sudo systemctl daemon-reload
       sudo systemctl enable gahoi-milan

  3. Point your domain's A record at this server's public IP, then:
       sudo cp nginx-gahoi-milan.conf /etc/nginx/sites-available/gahoi-milan
       sudo ln -sf /etc/nginx/sites-available/gahoi-milan \
            /etc/nginx/sites-enabled/gahoi-milan
       sudo rm -f /etc/nginx/sites-enabled/default
       sudo certbot --nginx -d api.gahoimarriage.in
       sudo nginx -t && sudo systemctl reload nginx

  4. Deploy the jar from your Mac:
       ./deploy/deploy.sh ubuntu@YOUR-EC2-IP
===========================================================================
DONE
