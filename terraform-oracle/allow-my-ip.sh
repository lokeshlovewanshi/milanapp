#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Restrict Bastion SSH (port 22) in Oracle Cloud to your PC's current public IP.
#
# Usage:
#   cd terraform-oracle && ./allow-my-ip.sh
#
# Flags:
#   --open         Open port 22 to 0.0.0.0/0 (e.g. for GitHub Actions CI)
#   --add <CIDR>   Add an additional CIDR alongside your PC IP (e.g. --add 1.2.3.4/32)
#   --dry-run      Print detected IP and target changes without applying
#   -h, --help     Show this help message
# ---------------------------------------------------------------------------

set -euo pipefail

cd "$(dirname "$0")"

TFVARS="terraform.tfvars"
TARGET="oci_core_security_list.lb"

DRY_RUN=false
OPEN_ALL=false
EXTRA_CIDR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --open)
      OPEN_ALL=true
      shift
      ;;
    --add)
      EXTRA_CIDR="${2:-}"
      if [[ -z "$EXTRA_CIDR" ]]; then
        echo "Error: --add requires a CIDR argument (e.g. --add 1.2.3.4/32)" >&2
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      sed -n '2,13p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown option: $1 (try --help)" >&2
      exit 2
      ;;
  esac
done

if [[ ! -f "$TFVARS" ]]; then
  echo "Error: $TFVARS not found in $(pwd)." >&2
  echo "Please copy terraform.tfvars.example to terraform.tfvars first." >&2
  exit 1
fi

# Fetch current public IPv4
fetch_ip() {
  local ip
  for url in https://checkip.amazonaws.com https://api.ipify.org https://ifconfig.me/ip https://icanhazip.com; do
    ip=$(curl -fsS --max-time 6 "$url" 2>/dev/null | tr -d '[:space:]') || continue
    if [[ $ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      echo "$ip"
      return 0
    fi
  done
  return 1
}

if [[ "$OPEN_ALL" == true ]]; then
  CIDR_LIST='["0.0.0.0/0"]'
  DISPLAY_MSG="0.0.0.0/0 (unrestricted)"
else
  if ! MY_IP=$(fetch_ip); then
    echo "Error: Could not determine your public IP address." >&2
    echo "Please check your internet connection or run with --open." >&2
    exit 1
  fi

  if [[ -n "$EXTRA_CIDR" ]]; then
    CIDR_LIST="[\"${MY_IP}/32\", \"${EXTRA_CIDR}\"]"
    DISPLAY_MSG="${MY_IP}/32 and ${EXTRA_CIDR}"
  else
    CIDR_LIST="[\"${MY_IP}/32\"]"
    DISPLAY_MSG="${MY_IP}/32"
  fi
fi

echo "============================================================"
echo " Detected IP: $DISPLAY_MSG"
echo " Target Rule: Bastion Port 22 (SSH) in Security List ($TARGET)"
echo "============================================================"

if [[ "$DRY_RUN" == true ]]; then
  echo "[DRY RUN] Would update $TFVARS with:"
  echo "bastion_ssh_allowed_cidrs = $CIDR_LIST"
  echo "[DRY RUN] Would run: terraform apply -target=$TARGET -auto-approve"
  exit 0
fi

# Update or append bastion_ssh_allowed_cidrs in terraform.tfvars
if grep -qE '^\s*bastion_ssh_allowed_cidrs\s*=' "$TFVARS"; then
  # Replace existing line (compatible with both BSD/macOS and GNU sed)
  sed -i.bak -E "s|^\s*bastion_ssh_allowed_cidrs\s*=.*|bastion_ssh_allowed_cidrs = ${CIDR_LIST}|" "$TFVARS"
  rm -f "${TFVARS}.bak"
else
  printf '\nbastion_ssh_allowed_cidrs = %s\n' "$CIDR_LIST" >> "$TFVARS"
fi

echo "==> Updated $TFVARS: bastion_ssh_allowed_cidrs = $CIDR_LIST"
echo "==> Applying security list update in Oracle Cloud..."

TF_VAR_db_password="${TF_VAR_db_password:-dummy-unused-for-security-list-update}" terraform apply -target="$TARGET" -auto-approve

echo
echo "============================================================"
echo " SUCCESS: Bastion SSH is now open for $DISPLAY_MSG"
echo "============================================================"
echo "You can now connect via SSH:"
echo "  Direct Bastion:  ssh -i ~/.ssh/gahoi_milan_dev ubuntu@152.67.7.218"
echo "  Proxy to App 0:  ssh -J ubuntu@152.67.7.218 -i ~/.ssh/gahoi_milan_dev ubuntu@10.30.1.102"
echo "  MySQL Tunnel:    ssh -L 3306:10.30.2.173:3306 -i ~/.ssh/gahoi_milan_dev ubuntu@152.67.7.218"
echo "============================================================"
