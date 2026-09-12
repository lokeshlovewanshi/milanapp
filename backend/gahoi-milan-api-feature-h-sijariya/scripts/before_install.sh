#!/usr/bin/env bash
# BeforeInstall - make sure the destinations exist and keep one jar back for
# rollback. Runs before CodeDeploy copies the new files in.
set -euo pipefail

id -u gahoi &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin gahoi

install -d -m 755 -o gahoi -g gahoi /opt/gahoi-milan
install -d -m 755 -o gahoi -g gahoi /var/log/gahoi-milan
install -d -m 750 -o root  -g gahoi /etc/gahoi-milan

if [ -f /opt/gahoi-milan/app.jar ]; then
  cp /opt/gahoi-milan/app.jar /opt/gahoi-milan/app.previous.jar
  echo "Previous jar kept at /opt/gahoi-milan/app.previous.jar"
fi

exit 0
