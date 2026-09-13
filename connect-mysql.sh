#!/usr/bin/env bash
# ==============================================================================
# Connect to Oracle Cloud MySQL Database via OCI Managed Bastion (Serverless)
#
# Usage:
#   ./connect-mysql.sh        (uses local port 3307)
#   ./connect-mysql.sh 3308   (custom local port)
# ==============================================================================

set -euo pipefail

LOCAL_PORT="${1:-3307}"
BASTION_ID="ocid1.bastion.oc1.ap-mumbai-1.amaaaaaaant6llaa6n6m4ex5ivg63kk22ie6kyd334cie2l5d7xljz7zlbea"
MYSQL_IP="10.30.2.173"
MYSQL_PORT="3306"
REGION="ap-mumbai-1"
SSH_KEY="$HOME/.ssh/lovewanshi_milan_dev"
SSH_PUB_KEY="$HOME/.ssh/lovewanshi_milan_dev.pub"

# Find OCI CLI
if command -v oci >/dev/null 2>&1; then
  OCI_BIN="oci"
elif [ -x "/Library/Frameworks/Python.framework/Versions/3.12/bin/oci" ]; then
  OCI_BIN="/Library/Frameworks/Python.framework/Versions/3.12/bin/oci"
else
  echo "Error: 'oci' CLI not found. Install via 'pip install oci-cli'"
  exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
  echo "Error: SSH private key not found at $SSH_KEY"
  exit 1
fi

if [ ! -f "$SSH_PUB_KEY" ]; then
  echo "Generating public key from $SSH_KEY..."
  ssh-keygen -y -f "$SSH_KEY" > "$SSH_PUB_KEY"
fi

# Check if ports are already in use; clean up stale ssh processes if found
for p in "$LOCAL_PORT" $( [ "$LOCAL_PORT" = "3307" ] && echo "3308" ); do
  OLD_PID=$(lsof -ti :"$p" 2>/dev/null || true)
  if [ -n "$OLD_PID" ]; then
    echo "Port $p was held by PID $OLD_PID. Releasing..."
    kill -9 $OLD_PID 2>/dev/null || true
    sleep 1
  fi
done

FORWARD_OPTS=(-L "${LOCAL_PORT}:${MYSQL_IP}:${MYSQL_PORT}")
if [ "$LOCAL_PORT" = "3307" ]; then
  FORWARD_OPTS+=(-L "3308:${MYSQL_IP}:${MYSQL_PORT}")
fi

echo "=== Checking for active OCI Bastion session ==="
EXISTING_SESSION=$("$OCI_BIN" bastion session list \
  --bastion-id "$BASTION_ID" \
  --session-lifecycle-state ACTIVE \
  --all \
  --query 'data[? "target-resource-details"."target-resource-private-ip-address"==`10.30.2.173` && "target-resource-details"."target-resource-port"==`3306`].id | [0]' \
  --output raw 2>/dev/null || true)

if [ -n "$EXISTING_SESSION" ] && [ "$EXISTING_SESSION" != "None" ]; then
  SESSION_ID="$EXISTING_SESSION"
  echo "Reusing active session: $SESSION_ID"
else
  echo "Creating new 3-hour session on OCI Managed Bastion..."
  SESSION_JSON=$("$OCI_BIN" bastion session create-port-forwarding \
    --bastion-id "$BASTION_ID" \
    --display-name "mysql-wb-$(date +%s)" \
    --ssh-public-key-file "$SSH_PUB_KEY" \
    --key-type "PUB" \
    --session-ttl 10800 \
    --target-private-ip "$MYSQL_IP" \
    --target-port "$MYSQL_PORT" \
    --wait-for-state SUCCEEDED)

  SESSION_ID=$(echo "$SESSION_JSON" | jq -r '.data.resources[0].identifier // .data.id')
  echo "Session created: $SESSION_ID"
  echo "Waiting 10s for bastion proxies to synchronize authorization key..."
  sleep 10
fi

BASTION_ENDPOINT="host.bastion.${REGION}.oci.oraclecloud.com"

# Cleanup on exit
cleanup() {
  echo ""
  echo "=== Disconnecting MySQL tunnel ==="
  if [ -n "${TUNNEL_PID:-}" ]; then
    kill "$TUNNEL_PID" 2>/dev/null || true
  fi
  echo "Tunnel closed."
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

echo "=== Opening SSH tunnel on localhost:$LOCAL_PORT (and 3308) ==="
TUNNEL_READY=false
for attempt in $(seq 1 12); do
  ssh -i "$SSH_KEY" \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o ServerAliveInterval=30 \
      -o ServerAliveCountMax=3 \
      -o ConnectTimeout=10 \
      -N "${FORWARD_OPTS[@]}" -p 22 \
      "${SESSION_ID}@${BASTION_ENDPOINT}" &
  TUNNEL_PID=$!

  # Check if port is open
  for _ in $(seq 1 8); do
    if nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
      TUNNEL_READY=true
      break 2
    fi
    sleep 1
  done

  kill "$TUNNEL_PID" 2>/dev/null || true
  wait "$TUNNEL_PID" 2>/dev/null || true
  echo "Session key syncing on bastion proxy (attempt $attempt/12)... retrying in 4s"
  sleep 4
done

if [ "$TUNNEL_READY" != "true" ]; then
  echo "Error: Could not connect to OCI Bastion after 12 attempts."
  exit 1
fi

cat << 'MSG'

==============================================================================
🐬  MySQL Database Tunnel is ACTIVE!
==============================================================================
Connect with MySQL Workbench or any DB client:
  • Hostname: 127.0.0.1
  • Port:     3307 or 3308
  • Username: admin (or your DB user)
  • Password: (your DB password)

Or CLI:
  mysql -h 127.0.0.1 -P 3307 -u admin -p
==============================================================================
Press [Ctrl + C] to close the connection tunnel when finished.
==============================================================================
MSG

# Keep running and automatically reconnect if dropped (until Ctrl+C)
while true; do
  wait "$TUNNEL_PID" || true
  echo "⚠️  Tunnel connection dropped, reconnecting in 2s..."
  sleep 2
  ssh -i "$SSH_KEY" \
      -o StrictHostKeyChecking=no \
      -o UserKnownHostsFile=/dev/null \
      -o ServerAliveInterval=15 \
      -o ServerAliveCountMax=6 \
      -o ConnectTimeout=10 \
      -o TCPKeepAlive=yes \
      -N "${FORWARD_OPTS[@]}" -p 22 \
      "${SESSION_ID}@${BASTION_ENDPOINT}" &
  TUNNEL_PID=$!
  sleep 2
  if nc -z 127.0.0.1 "$LOCAL_PORT" 2>/dev/null; then
    echo "✅ Reconnected to MySQL tunnel on localhost:$LOCAL_PORT"
  fi
done
