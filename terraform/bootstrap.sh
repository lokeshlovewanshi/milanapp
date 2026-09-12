#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# One command from "nothing" to "infrastructure running".
#
#   cd terraform && ./bootstrap.sh
#
# Checks the tools, verifies AWS credentials, creates the SSH key pair, works
# out your public IP, writes terraform.tfvars, generates a database password
# and runs plan then apply. Safe to re-run: every step is skipped if already
# done.
# ---------------------------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")"

bold() { printf "\033[1m%s\033[0m\n" "$1"; }
ok()   { printf "  \033[32mok\033[0m   %s\n" "$1"; }
warn() { printf "  \033[33m!\033[0m    %s\n" "$1"; }
die()  { printf "  \033[31mfail\033[0m %s\n" "$1" >&2; exit 1; }

REGION="${AWS_REGION:-ap-south-1}"
KEY_NAME="gahoi-milan"
KEY_PATH="$HOME/.ssh/${KEY_NAME}.pem"
SECRETS_FILE="$HOME/.gahoi-milan-secrets.txt"

# --- 1. Tools --------------------------------------------------------------
bold "1. Checking tools"

if ! command -v aws >/dev/null; then
  die "aws CLI not found. Install it:  brew install awscli"
fi
ok "aws $(aws --version 2>&1 | cut -d' ' -f1 | cut -d/ -f2)"

if ! command -v terraform >/dev/null; then
  die "terraform not found. Install it:  brew tap hashicorp/tap && brew install hashicorp/tap/terraform"
fi
ok "terraform $(terraform version -json 2>/dev/null | sed -n 's/.*"terraform_version": *"\([^"]*\)".*/\1/p' || terraform version | head -1)"

# --- 2. Credentials --------------------------------------------------------
bold "2. Checking AWS credentials"

if ! IDENTITY=$(aws sts get-caller-identity --output json 2>/dev/null); then
  die "Not authenticated. Run:  aws configure --profile gahoi   (then: export AWS_PROFILE=gahoi)"
fi

ACCOUNT=$(echo "$IDENTITY" | sed -n 's/.*"Account": *"\([^"]*\)".*/\1/p')
ARN=$(echo "$IDENTITY" | sed -n 's/.*"Arn": *"\([^"]*\)".*/\1/p')
ok "account $ACCOUNT"
ok "identity $ARN"

# Refuse to run with a key listed in ~/.gahoi-milan-blocked-keys (one access
# key ID per line). Applying with a credential that has leaked would hand the
# whole stack to whoever else already has it.
#
# The list lives outside the repo on purpose: naming a compromised key in a
# public repository tells people exactly what to go looking for in the history.
BLOCKED_KEYS="$HOME/.gahoi-milan-blocked-keys"
CURRENT_KEY=$(aws configure get aws_access_key_id 2>/dev/null || true)
if [[ -n "$CURRENT_KEY" && -f "$BLOCKED_KEYS" ]] && grep -qxF "$CURRENT_KEY" "$BLOCKED_KEYS"; then
  die "Access key $CURRENT_KEY is on your blocked list. Create a new one in IAM, deactivate that one, then re-run."
fi

# --- 3. SSH key pair -------------------------------------------------------
bold "3. SSH key pair"

if aws ec2 describe-key-pairs --key-names "$KEY_NAME" --region "$REGION" >/dev/null 2>&1; then
  ok "key pair '$KEY_NAME' already exists in AWS"
  [[ -f "$KEY_PATH" ]] || warn "but $KEY_PATH is missing locally - you will not be able to SSH in"
else
  mkdir -p "$HOME/.ssh"
  aws ec2 create-key-pair \
    --key-name "$KEY_NAME" \
    --region "$REGION" \
    --query 'KeyMaterial' --output text > "$KEY_PATH"
  chmod 400 "$KEY_PATH"
  ok "created $KEY_PATH  (AWS cannot re-issue this - back it up)"
fi

# --- 4. Your public IP -----------------------------------------------------
bold "4. Your public IP"

MY_IP=$(curl -fsS --max-time 10 https://checkip.amazonaws.com | tr -d '[:space:]')
[[ -n "$MY_IP" ]] || die "Could not determine your public IP"
ok "$MY_IP  (SSH will be restricted to this address)"
warn "on a different network later? update ssh_allowed_cidr and re-apply"

# --- 5. terraform.tfvars ---------------------------------------------------
bold "5. Variables"

if [[ -f terraform.tfvars ]]; then
  ok "terraform.tfvars exists - leaving it alone"

  # Variables that used to exist. Terraform warns about every value it cannot
  # match to a declaration, and the warning survives until the line is gone.
  for stale in db_engine aurora_min_capacity aurora_max_capacity enable_ipv6; do
    if grep -q "^$stale" terraform.tfvars; then
      sed -i.bak "/^$stale/d" terraform.tfvars
      rm -f terraform.tfvars.bak
      warn "removed obsolete variable '$stale' from terraform.tfvars"
    fi
  done
  # Keep the SSH rule pointed at wherever you are now.
  if ! grep -q "$MY_IP/32" terraform.tfvars; then
    warn "ssh_allowed_cidr does not match your current IP; updating it"
    sed -i.bak "s|ssh_allowed_cidr *=.*|ssh_allowed_cidr = \"$MY_IP/32\"|" terraform.tfvars
    rm -f terraform.tfvars.bak
  fi
else
  sed -e "s|YOUR.IP.HERE/32|$MY_IP/32|" terraform.tfvars.example > terraform.tfvars
  ok "wrote terraform.tfvars"
fi

# --- 6. Database password --------------------------------------------------
bold "6. Database password"

if [[ -n "${TF_VAR_db_password:-}" ]]; then
  ok "using TF_VAR_db_password from the environment"
elif grep -q '^DB_PASSWORD=' "$SECRETS_FILE" 2>/dev/null; then
  export TF_VAR_db_password=$(grep '^DB_PASSWORD=' "$SECRETS_FILE" | cut -d= -f2-)
  ok "reusing the password from $SECRETS_FILE"
else
  # RDS rejects / @ " and spaces in master passwords, so strip them rather
  # than discovering it after a four-minute apply.
  GENERATED=$(openssl rand -base64 32 | tr -d '/@" ' | cut -c1-24)
  export TF_VAR_db_password="$GENERATED"

  umask 077
  {
    echo "# Gahoi Milan production secrets - generated $(date -Iseconds)"
    echo "# Keep this file. Terraform will not show the password again."
    echo "DB_PASSWORD=$GENERATED"
    echo "JWT_SECRET=$(openssl rand -base64 48 | tr -d '\n')"
    echo "NOTIFICATIONS_ADMIN_SECRET=$(openssl rand -hex 32)"
  } >> "$SECRETS_FILE"

  ok "generated and saved to $SECRETS_FILE (mode 600)"
  warn "that file is the only copy - back it up somewhere safe"
fi

# --- 7. Plan ---------------------------------------------------------------
bold "7. Terraform"

terraform init -input=false
terraform plan -input=false -out=tfplan

echo
bold "Review the plan above."
echo "  Creating 36 resources. About \$40/month once promotional credits run out."
echo "  RDS alone takes 8-12 minutes."
echo
read -r -p "Type 'yes' to apply: " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { rm -f tfplan; die "Aborted."; }

terraform apply -input=false tfplan
rm -f tfplan

# --- 8. What next ----------------------------------------------------------
echo
bold "Done."
terraform output -raw next_steps

cat <<EOF

Secrets are in $SECRETS_FILE
SSH key is at  $KEY_PATH

Connect with:
  $(terraform output -raw ssh_command 2>/dev/null || echo "see: terraform output ssh_command")
EOF
