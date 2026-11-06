#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
SSH_DIR="$HOME/.ssh"
DATA_DIR="$HOME/.cipherx-pagerx/data"
KNOWN_HOSTS="$SSH_DIR/pager_known_hosts"
KEY_PATH="$SSH_DIR/pagerx_ed25519"

if ! command -v pkg >/dev/null 2>&1; then
  echo "Run this script inside Termux on Android."
  exit 1
fi

pkg update -y
pkg install -y nodejs-lts openssh unzip binutils openjdk-17

mkdir -p "$SSH_DIR" "$DATA_DIR"
chmod 700 "$SSH_DIR"

if [ ! -f "$KEY_PATH" ]; then
  ssh-keygen -t ed25519 -N "" -C "cipherx-pagerx-android" -f "$KEY_PATH"
fi
chmod 600 "$KEY_PATH"
chmod 644 "$KEY_PATH.pub"

if [ ! -f "$KNOWN_HOSTS" ]; then
  touch "$KNOWN_HOSTS"
  chmod 600 "$KNOWN_HOSTS"
fi

if [ ! -f "$BACKEND/.env" ]; then
  OPERATOR_PASSWORD="$(node -e "process.stdout.write(require('crypto').randomBytes(24).toString('hex'))")"
  VAULT_MASTER_KEY="$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))")"
  cat > "$BACKEND/.env" <<EOF
PORT=8080
OPERATOR_USER=operator
OPERATOR_PASSWORD=$OPERATOR_PASSWORD
VAULT_MASTER_KEY=$VAULT_MASTER_KEY
DATA_DIR=$DATA_DIR
PAGERX_KNOWN_HOSTS_FILE=$KNOWN_HOSTS
PAGERX_SSH_KEY_PATH=$KEY_PATH
EOF
  chmod 600 "$BACKEND/.env"
  echo
  echo "Generated CIPHERX backend login:"
  echo "Username: operator"
  echo "Password: $OPERATOR_PASSWORD"
  echo "Save this password privately. It will not be shown again."
else
  echo "Existing backend .env kept unchanged."
fi

cd "$BACKEND"
npm install

echo
echo "Setup complete."
echo "Pager SSH public key (add this to /root/.ssh/authorized_keys on your Pager):"
cat "$KEY_PATH.pub"
echo
echo "Next: verify/add the Pager SSH host key to:"
echo "$KNOWN_HOSTS"
echo "Then start the backend with: bash scripts/start-termux-backend.sh"
