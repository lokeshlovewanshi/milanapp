#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# First-boot bootstrap. Runs once, as root.
#
# Installs the runtime, the CodeDeploy agent and nginx, then stops. It does
# NOT deploy the application - GitHub Actions does that. Keeping the two
# separate means a broken release never requires rebuilding the server.
#
# Output: /var/log/cloud-init-output.log
# ---------------------------------------------------------------------------
set -euxo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq \
  openjdk-17-jre-headless \
  nginx \
  certbot python3-certbot-nginx \
  mysql-client \
  ruby-full wget curl unzip jq

# --- AWS CLI ---------------------------------------------------------------
# Deliberately NOT `apt-get install awscli`. Ubuntu 24.04 dropped the package
# ("no installation candidate"), and because this script runs under `set -e`
# that one line aborted the whole bootstrap - no service user, no directories,
# no unit file. The official v2 installer is version-independent.
#
# The deploy needs this: it pulls the jar from S3 with the instance role.
if ! command -v aws >/dev/null; then
  curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q -o /tmp/awscliv2.zip -d /tmp
  /tmp/aws/install --update
  # v2 installs to /usr/local/bin, which is not on root's PATH under every
  # non-login shell (SSM's, for one).
  ln -sf /usr/local/bin/aws /usr/bin/aws
  rm -rf /tmp/awscliv2.zip /tmp/aws
fi
aws --version

# --- Service account -------------------------------------------------------
# No login shell, no home directory: it exists to own a process.
id -u gahoi &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin gahoi

install -d -m 755 -o gahoi -g gahoi /opt/gahoi-milan
install -d -m 755 -o gahoi -g gahoi /var/log/gahoi-milan
install -d -m 750 -o root  -g gahoi /etc/gahoi-milan

# --- Swap ------------------------------------------------------------------
# A t3.small has 2 GB, which is enough for normal operation - so this swap is
# a safety net for the spikes (an apt upgrade during a deploy) rather than
# part of steady state. swappiness=10 keeps the kernel out of it until it
# genuinely needs it.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl -w vm.swappiness=10
  echo 'vm.swappiness=10' >> /etc/sysctl.conf
fi

# --- CodeDeploy agent ------------------------------------------------------
# The bucket name is region-specific; there is no global endpoint.
cd /tmp
wget -q "https://aws-codedeploy-${region}.s3.${region}.amazonaws.com/latest/install"
chmod +x ./install
./install auto
systemctl enable codedeploy-agent
systemctl start codedeploy-agent

# --- Environment file ------------------------------------------------------
# A placeholder, written only if nothing is there yet. The real values arrive
# with the first deploy: the GitHub Actions workflow assembles this file from
# repository secrets and ships it base64-encoded, which is why the guard below
# matters - re-running bootstrap must not clobber a deployed config.
if [ ! -f /etc/gahoi-milan/gahoi-milan.env ]; then
  cat > /etc/gahoi-milan/gahoi-milan.env <<ENVFILE
AWS_REGION=${region}
SERVER_PORT=8080
ENVFILE

  chown root:gahoi /etc/gahoi-milan/gahoi-milan.env
  chmod 640 /etc/gahoi-milan/gahoi-milan.env
fi

# --- nginx placeholder -----------------------------------------------------
# Serves the health check over plain HTTP so the first deployment can be
# validated before a certificate exists. Replaced by the real config once the
# domain resolves and certbot has run.
cat > /etc/nginx/sites-available/gahoi-milan <<'NGINX'
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 12M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/gahoi-milan /etc/nginx/sites-enabled/gahoi-milan
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
systemctl enable nginx

timedatectl set-timezone Asia/Kolkata

# --- Unattended security updates -------------------------------------------
apt-get install -y -qq unattended-upgrades
echo 'Unattended-Upgrade::Automatic-Reboot "false";' > /etc/apt/apt.conf.d/51unattended-upgrades-local

echo "bootstrap complete: $(date -Is)" > /var/log/gahoi-milan/bootstrap.done
