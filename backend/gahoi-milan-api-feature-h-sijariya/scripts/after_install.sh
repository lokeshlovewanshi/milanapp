#!/usr/bin/env bash
# AfterInstall - the unit file may have changed with this revision, so reload
# systemd before anything tries to start it.
set -euo pipefail

systemctl daemon-reload
systemctl enable gahoi-milan

# Fail loudly and early rather than watching the service crash-loop with a
# NullPointerException from an unresolved ${PLACEHOLDER}.
if [ ! -f /etc/gahoi-milan/gahoi-milan.env ]; then
  echo "MISSING /etc/gahoi-milan/gahoi-milan.env - create it from gahoi-milan.env.example" >&2
  exit 1
fi

# Only SECRET_ID matters here now - everything else comes from Secrets Manager
# at startup. Checking for DB_PASSWORD would fail on a correctly configured box.
for required in SECRET_ID AWS_REGION; do
  value=$(grep "^$required=" /etc/gahoi-milan/gahoi-milan.env | cut -d= -f2- || true)
  if [ -z "$value" ]; then
    echo "MISSING value for $required in /etc/gahoi-milan/gahoi-milan.env" >&2
    exit 1
  fi
done

echo "Environment file looks complete"
exit 0
