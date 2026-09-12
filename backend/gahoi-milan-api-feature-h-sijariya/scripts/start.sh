#!/usr/bin/env bash
set -euo pipefail

systemctl start gahoi-milan
echo "Started; ValidateService will confirm health"
exit 0
