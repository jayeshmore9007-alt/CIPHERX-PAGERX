#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"
if [ ! -f .env ]; then
  echo "Missing backend/.env. Run bash scripts/setup-termux-backend.sh first."
  exit 1
fi
exec npm start
