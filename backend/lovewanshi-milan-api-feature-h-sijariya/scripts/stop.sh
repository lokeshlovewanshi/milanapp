#!/usr/bin/env bash
# ApplicationStop - runs from the PREVIOUS revision, so it does not run at all
# on the first ever deployment. Must never fail when there is nothing to stop.
set -uo pipefail

if systemctl list-unit-files | grep -q '^lovewanshi-milan.service'; then
  echo "Stopping lovewanshi-milan"
  systemctl stop lovewanshi-milan || true

  # systemctl returns as soon as SIGTERM is sent. Deleting the jar while the
  # old JVM still holds it leaves the process running against a phantom file.
  for _ in $(seq 1 20); do
    systemctl is-active --quiet lovewanshi-milan || break
    sleep 1
  done
else
  echo "No service installed yet - first deployment"
fi

exit 0
