#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Build the jar locally and ship it to the server.
#
#   ./deploy/deploy.sh ubuntu@10.30.1.102 ~/.ssh/lovewanshi_milan_dev
#   ./deploy/deploy.sh ubuntu@10.30.1.102 ~/.ssh/lovewanshi_milan_dev 152.67.7.218
#
# Keeps the previous jar so a bad deploy can be rolled back in one command.
# ---------------------------------------------------------------------------
set -euo pipefail

TARGET="${1:-}"
KEY="${2:-}"
BASTION="${3:-${BASTION_HOST:-152.67.7.218}}"

if [[ -z "$TARGET" ]]; then
  echo "Usage: $0 user@host [path/to/key.pem] [bastion_ip]" >&2
  exit 1
fi

SSH_OPTS=(-o "StrictHostKeyChecking=accept-new")
SCP_OPTS=(-o "StrictHostKeyChecking=accept-new")
if [[ -n "$KEY" ]]; then
  SSH_OPTS+=(-i "$KEY")
  SCP_OPTS+=(-i "$KEY")
fi
if [[ -n "$BASTION" && "$BASTION" != "none" && "$BASTION" != "false" ]]; then
  SSH_OPTS+=(-J "ubuntu@$BASTION")
  SCP_OPTS+=(-J "ubuntu@$BASTION")
fi

cd "$(dirname "$0")/.."

echo "==> Building"
# Tests are skipped deliberately: this script ships an artefact, it is not a
# CI gate. Run ./gradlew test yourself before deploying anything real.
./gradlew clean bootJar -x test

JAR=$(ls -t build/libs/*.jar | grep -v plain | head -1)
if [[ ! -f "$JAR" ]]; then
  echo "No jar produced in build/libs" >&2
  exit 1
fi
echo "    $JAR ($(du -h "$JAR" | cut -f1))"

echo "==> Uploading"
# Upload to a staging path first. Overwriting app.jar directly would corrupt
# the running service's file if the transfer dropped halfway.
scp "${SCP_OPTS[@]}" "$JAR" "$TARGET:/tmp/app-new.jar"

echo "==> Installing and restarting"
ssh "${SSH_OPTS[@]}" "$TARGET" 'bash -s' <<'REMOTE'
set -euo pipefail

# Keep one generation back for rollback.
if [[ -f /opt/lovewanshi-milan/app.jar ]]; then
  sudo cp /opt/lovewanshi-milan/app.jar /opt/lovewanshi-milan/app.previous.jar
fi

sudo mv /tmp/app-new.jar /opt/lovewanshi-milan/app.jar
sudo chown lovewanshi:lovewanshi /opt/lovewanshi-milan/app.jar
sudo chmod 644 /opt/lovewanshi-milan/app.jar

sudo systemctl restart lovewanshi-milan

# Wait for the health endpoint rather than sleeping a fixed number of seconds:
# a cold JVM plus Hibernate validation can take 40 seconds on a t3.micro, and
# a fixed sleep either wastes time or reports success too early.
echo -n "    waiting for health"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/actuator/health 2>/dev/null | grep -q '"status":"UP"'; then
    echo " - UP"
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo
echo "Service did not come up. Last 40 log lines:" >&2
sudo journalctl -u lovewanshi-milan -n 40 --no-pager >&2
echo >&2
echo "Roll back with:" >&2
echo "  sudo cp /opt/lovewanshi-milan/app.previous.jar /opt/lovewanshi-milan/app.jar" >&2
echo "  sudo systemctl restart lovewanshi-milan" >&2
exit 1
REMOTE

echo "==> Deployed"
