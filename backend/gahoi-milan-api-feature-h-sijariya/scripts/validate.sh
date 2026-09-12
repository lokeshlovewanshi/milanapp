#!/usr/bin/env bash
# ValidateService - the gate. A non-zero exit fails the deployment, which
# triggers the automatic rollback on the deployment group.
set -uo pipefail

HEALTH="http://127.0.0.1:8080/actuator/health"

# A cold JVM plus Hibernate schema validation takes 30-60s on a t3.micro, so
# poll rather than sleeping a fixed time: a fixed sleep either wastes a minute
# or declares success before the app is listening.
echo -n "Waiting for $HEALTH"
for _ in $(seq 1 45); do
  if curl -fsS --max-time 3 "$HEALTH" 2>/dev/null | grep -q '"status":"UP"'; then
    echo " - UP"
    exit 0
  fi
  echo -n "."
  sleep 2
done

echo
echo "Health check never passed. Last 60 log lines:" >&2
journalctl -u gahoi-milan -n 60 --no-pager >&2
exit 1
