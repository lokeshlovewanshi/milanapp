#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# First-boot bootstrap for the Oracle Always Free dev box. Runs once, as root.
#
# MySQL is NOT on this box - it's a separate Always Free HeatWave MySQL DB
# system (mysql.tf) in a private subnet, reached over the VCN. That's a
# different free allocation from this box's Ampere A1 compute limit, so
# self-hosting would only have cost this box CPU/RAM for nothing. There is no
# CodeDeploy/S3 pipeline either: deploys here are a manual scp + systemd
# restart (see terraform-oracle/README.md).
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
  curl unzip jq

# --- OS firewall -------------------------------------------------------------
# Oracle's Ubuntu images ship a REJECT-all rule further down the INPUT chain,
# on top of (separately) the OCI Security List. Both layers need to allow a
# port, or the service never sees a packet despite the Security List being
# correct - and a hardcoded insert position (an earlier version of this
# script used `-I INPUT 6`) can land AFTER that REJECT rule depending on the
# image's exact default ruleset, making the ACCEPT rule dead code that never
# matches anything. Insert immediately before wherever REJECT actually is
# instead of guessing a fixed line number.
#
# 8080 is for the load balancer's direct backend traffic (load_balancer.tf) -
# 80/443 are for nginx, though nothing terminates TLS there for this
# LB-fronted setup today; kept for direct per-instance debugging.
REJECT_LINE=$(iptables -L INPUT --line-numbers -n | awk '/REJECT/{print $1; exit}')
for port in 80 443 8080; do
  iptables -I INPUT "$REJECT_LINE" -m state --state NEW -p tcp --dport "$port" -j ACCEPT
done
netfilter-persistent save || true

# --- Application database ---------------------------------------------------
# The DB system gives you a MySQL server with an admin user - not a specific
# schema. Terraform already waited for it to reach ACTIVE before this instance
# was created, but "ACTIVE" and "accepting connections" aren't quite the same
# moment, so retry rather than fail the whole bootstrap on a race.
for i in $(seq 1 10); do
  if mysql -h "${db_host}" -P "${db_port}" -u "${db_username}" -p"${db_password}" \
       -e "CREATE DATABASE IF NOT EXISTS ${db_name};"; then
    break
  fi
  [ "$i" -eq 10 ] && { echo "MySQL never became reachable"; exit 1; }
  sleep 10
done

# --- Service account ---------------------------------------------------------
id -u lovewanshi &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin lovewanshi

install -d -m 755 -o lovewanshi -g lovewanshi /opt/lovewanshi-milan
install -d -m 755 -o lovewanshi -g lovewanshi /var/log/lovewanshi-milan
install -d -m 750 -o root  -g lovewanshi /etc/lovewanshi-milan

# --- Environment file ---------------------------------------------------------
# Placeholder - the real app secrets (JWT key, Firebase, mail, etc.) get
# copied in by hand during the first deploy, same as application-local's
# gitignored application.properties. This file only carries the DB creds
# terraform already knows, so a fresh deploy has a working DB connection
# from the first boot.
if [ ! -f /etc/lovewanshi-milan/lovewanshi-milan.env ]; then
  cat > /etc/lovewanshi-milan/lovewanshi-milan.env <<ENVFILE
SERVER_PORT=8080
DB_URL=jdbc:mysql://${db_host}:${db_port}/${db_name}
DB_USERNAME=${db_username}
DB_PASSWORD=${db_password}
ENVFILE

  chown root:lovewanshi /etc/lovewanshi-milan/lovewanshi-milan.env
  chmod 640 /etc/lovewanshi-milan/lovewanshi-milan.env
fi

# --- systemd unit --------------------------------------------------------
cat > /etc/systemd/system/lovewanshi-milan.service <<'UNIT'
[Unit]
Description=Lovewanshi Milan API (dev, Oracle)
After=network.target

[Service]
Type=simple
User=lovewanshi
Group=lovewanshi
EnvironmentFile=/etc/lovewanshi-milan/lovewanshi-milan.env
ExecStart=/usr/bin/java -jar /opt/lovewanshi-milan/app.jar --spring.profiles.active=local
WorkingDirectory=/opt/lovewanshi-milan
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/lovewanshi-milan/app.log
StandardError=append:/var/log/lovewanshi-milan/app.log

ProtectSystem=full
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
UNIT

systemctl daemon-reload
systemctl enable lovewanshi-milan

# --- nginx placeholder ---------------------------------------------------
# Plain HTTP until the dev-api subdomain resolves here and certbot has run
# (see README.md step 4) - identical reasoning to prod's placeholder.
cat > /etc/nginx/sites-available/lovewanshi-milan <<'NGINX'
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

ln -sf /etc/nginx/sites-available/lovewanshi-milan /etc/nginx/sites-enabled/lovewanshi-milan
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
systemctl enable nginx

timedatectl set-timezone Asia/Kolkata

echo "bootstrap complete: $(date -Is)" > /var/log/lovewanshi-milan/bootstrap.done
