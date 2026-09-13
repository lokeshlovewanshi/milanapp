#!/usr/bin/env bash
# BeforeInstall - make sure the destinations exist and keep one jar back for
# rollback. Runs before CodeDeploy copies the new files in.
set -euo pipefail

id -u lovewanshi &>/dev/null || useradd --system --no-create-home --shell /usr/sbin/nologin lovewanshi

install -d -m 755 -o lovewanshi -g lovewanshi /opt/lovewanshi-milan
install -d -m 755 -o lovewanshi -g lovewanshi /var/log/lovewanshi-milan
install -d -m 750 -o root  -g lovewanshi /etc/lovewanshi-milan

if [ -f /opt/lovewanshi-milan/app.jar ]; then
  cp /opt/lovewanshi-milan/app.jar /opt/lovewanshi-milan/app.previous.jar
  echo "Previous jar kept at /opt/lovewanshi-milan/app.previous.jar"
fi

exit 0
