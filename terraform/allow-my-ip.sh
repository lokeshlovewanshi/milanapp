#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Point the SSH rule at wherever you are right now.
#
#   cd terraform && ./allow-my-ip.sh
#
# Home broadband hands out a new address every few days, and the security group
# allows exactly one /32. When it changes, SSH stops answering - it times out
# rather than refusing, which reads like the server is down. That has already
# cost an afternoon on this project.
#
# Goes through Terraform rather than calling the EC2 API directly, on purpose.
# Editing the security group by hand works for about ten seconds and then
# terraform.tfvars disagrees with reality, so the next `terraform apply` quietly
# locks you out again by putting the old address back. Updating the variable and
# applying keeps one source of truth.
#
#   --direct   skip Terraform and change the group immediately. For when you are
#              locked out and in a hurry; re-run without it afterwards so state
#              catches up.
#   --dry-run  print what would change and stop.
# ---------------------------------------------------------------------------

set -euo pipefail

cd "$(dirname "$0")"

TFVARS="terraform.tfvars"
TARGET="aws_vpc_security_group_ingress_rule.app_ssh"

DIRECT=false
DRY_RUN=false
for arg in "$@"; do
  case "$arg" in
    --direct)  DIRECT=true ;;
    --dry-run) DRY_RUN=true ;;
    -h|--help) sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "Unknown option: $arg (try --help)" >&2; exit 2 ;;
  esac
done

# --- what is my address ----------------------------------------------------
#
# AWS's own endpoint, with a second opinion behind it. These services do go
# down, and a script that silently writes an empty CIDR would remove your only
# way in.

fetch_ip() {
  local ip
  for url in https://checkip.amazonaws.com https://api.ipify.org https://ifconfig.me/ip; do
    ip=$(curl -fsS --max-time 10 "$url" 2>/dev/null | tr -d '[:space:]') || continue
    # Validate rather than trust: a captive portal or an error page returns 200
    # with HTML, and that would sail straight into the security group.
    if [[ $ip =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
      echo "$ip"
      return 0
    fi
  done
  return 1
}

if ! MY_IP=$(fetch_ip); then
  echo "Could not determine your public IP address." >&2
  echo "Every lookup service failed or returned something that was not an IPv4 address." >&2
  exit 1
fi

# --- what is actually allowed ----------------------------------------------
#
# The live security group, not terraform.tfvars. Those two disagree more often
# than you would think: an apply that failed halfway, a rule someone removed in
# the console, a --direct run that was never reconciled. Trusting the file meant
# this script would print "Already correct - nothing to do" while SSH carried on
# timing out, which is the single most confusing way for it to fail - it says
# the thing is fine and the thing is not fine.
#
# Prints nothing and returns 1 when AWS cannot be reached, so a missing or
# expired credential degrades to the old file-based check rather than blocking
# a script you may be running precisely because you are locked out.

find_sg_id() {
  local id
  id=$(terraform output -raw app_security_group_id 2>/dev/null || true)
  if [[ -z "$id" || "$id" == "None" ]]; then
    id=$(aws ec2 describe-security-groups \
      --filters "Name=group-name,Values=lovewanshi-milan-app" \
      --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || true)
  fi
  [[ -n "$id" && "$id" != "None" ]] && echo "$id"
}

live_ssh_cidr() {
  local sg_id
  sg_id=$(find_sg_id) || return 1
  [[ -z "$sg_id" ]] && return 1

  # Every port-22 ingress CIDR, newline separated. More than one means the group
  # has accumulated rules and needs a --direct run to sweep them.
  aws ec2 describe-security-group-rules \
    --filters "Name=group-id,Values=$sg_id" \
    --query "SecurityGroupRules[?FromPort==\`22\`&&IsEgress==\`false\`].CidrIpv4" \
    --output text 2>/dev/null | tr '\t' '\n' | grep -v '^$' || return 1
}

NEW_CIDR="${MY_IP}/32"
CURRENT_CIDR=$(grep -E '^\s*ssh_allowed_cidr' "$TFVARS" 2>/dev/null | sed -E 's/.*"(.*)".*/\1/' || true)

LIVE_CIDRS=$(live_ssh_cidr || true)
LIVE_COUNT=$(grep -c . <<< "${LIVE_CIDRS:-}" || true)

echo "your address : $MY_IP"
echo "in tfvars    : ${CURRENT_CIDR:-<not set>}"
if [[ -n "$LIVE_CIDRS" ]]; then
  echo "on the group : $(tr '\n' ' ' <<< "$LIVE_CIDRS")"
else
  echo "on the group : <could not read - check AWS credentials>"
fi

# Drift is worth saying out loud even when we are about to fix it, because it
# means someone changed one and not the other and will hit this again.
if [[ -n "$LIVE_CIDRS" && -n "$CURRENT_CIDR" && "$LIVE_CIDRS" != "$CURRENT_CIDR" ]]; then
  echo
  echo "note: the file and the group disagree. The group is what SSH obeys."
fi

if [[ -n "$LIVE_CIDRS" ]]; then
  # The group is the authority. Only skip the work when it already allows
  # exactly this address and nothing else - a second lingering rule is still
  # something to clean up even though SSH would work.
  if [[ "$LIVE_CIDRS" == "$NEW_CIDR" && "$LIVE_COUNT" -eq 1 && "$CURRENT_CIDR" == "$NEW_CIDR" ]]; then
    echo
    echo "Already correct - nothing to do."
    # Not an error. This script is meant to be run reflexively before SSH, so
    # the common case is that nothing has changed.
    exit 0
  fi
elif [[ "$CURRENT_CIDR" == "$NEW_CIDR" ]]; then
  # Fell back to the file because AWS was unreachable. Say so rather than
  # implying the group was checked.
  echo
  echo "tfvars already says $NEW_CIDR, and the group could not be read."
  echo "If SSH still times out, run with --direct once AWS credentials work."
  exit 0
fi

if [[ "$DRY_RUN" == true ]]; then
  echo
  echo "Would change ssh_allowed_cidr to $NEW_CIDR"
  exit 0
fi

# --- direct mode -----------------------------------------------------------

if [[ "$DIRECT" == true ]]; then
  echo
  echo "Direct mode: changing the security group without Terraform."

  SG_ID=$(find_sg_id || true)

  if [[ -z "$SG_ID" ]]; then
    echo "Could not find the security group. Run without --direct." >&2
    exit 1
  fi

  # Revoke every existing port-22 rule before adding the new one. Adding
  # without revoking leaves the old address allowed, and after a few weeks the
  # group is a list of cafes you once worked from.
  OLD_RULES=$(aws ec2 describe-security-group-rules \
    --filters "Name=group-id,Values=$SG_ID" \
    --query "SecurityGroupRules[?FromPort==\`22\`&&IsEgress==\`false\`].SecurityGroupRuleId" \
    --output text)

  if [[ -n "$OLD_RULES" && "$OLD_RULES" != "None" ]]; then
    # shellcheck disable=SC2086
    aws ec2 revoke-security-group-ingress \
      --group-id "$SG_ID" \
      --security-group-rule-ids $OLD_RULES >/dev/null
    echo "  revoked $(wc -w <<< "$OLD_RULES" | tr -d ' ') old rule(s)"
  fi

  aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --ip-permissions "IpProtocol=tcp,FromPort=22,ToPort=22,IpRanges=[{CidrIp=$NEW_CIDR,Description='SSH from the operator only'}]" \
    >/dev/null

  echo "  allowed $NEW_CIDR on $SG_ID"
  echo
  echo "Terraform now disagrees with reality. Re-run this script without"
  echo "--direct when you have a moment, or the next apply will put the old"
  echo "address back and lock you out again."
  exit 0
fi

# --- terraform mode --------------------------------------------------------

if ! command -v terraform >/dev/null; then
  echo "terraform is not installed. Use --direct, or install it." >&2
  exit 1
fi

echo
if [[ -n "$CURRENT_CIDR" ]]; then
  # -i '' is the BSD/macOS form. GNU sed wants -i with no argument, so this is
  # written to work on both rather than assuming a mac.
  sed -i.bak -E "s|^([[:space:]]*ssh_allowed_cidr[[:space:]]*=[[:space:]]*).*|\1\"$NEW_CIDR\"|" "$TFVARS"
  rm -f "${TFVARS}.bak"
else
  printf '\nssh_allowed_cidr = "%s"\n' "$NEW_CIDR" >> "$TFVARS"
fi
echo "updated $TFVARS -> $NEW_CIDR"

# -target is normally a smell, but it is right here: this script exists to
# change one rule, and a full apply would sweep up unrelated drift that has not
# been reviewed. State on this project has drifted before.
terraform apply -target="$TARGET" -auto-approve

echo
echo "Done. SSH should answer now:"
echo "  ssh -i ~/.ssh/lovewanshi-milan.pem ubuntu@\$(terraform output -raw api_public_ip 2>/dev/null || echo '<host>')"
echo
echo "Commit the terraform.tfvars change so the next person's apply does not"
echo "revert it."
