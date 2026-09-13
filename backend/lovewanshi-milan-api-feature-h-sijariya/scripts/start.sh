#!/usr/bin/env bash
set -euo pipefail

systemctl start lovewanshi-milan
echo "Started; ValidateService will confirm health"
exit 0
