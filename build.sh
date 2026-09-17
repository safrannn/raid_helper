#!/usr/bin/env bash

set -euox pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
FRONTEND="$ROOT/frontend"
SERVER="$ROOT/server"

echo "==> [1/2] Build frontend"
cd "$FRONTEND"
npm ci --silent
npm run build # next.config.js output path:frontend/out/
test -f "$FRONTEND/out/index.html" || { echo "frontend/out/index.html missing"; exit 1; }

echo "==> [2/2] Build cargo release binary (embeds frontend/out and database/raid_helper.db)"
cd "$SERVER"
cargo build --release --bin server

BIN="$SERVER/target/release/server"
echo
echo "Done: $BIN"
echo "Run it, then open http://localhost:3001"

# to build and run: ./build.sh --run
if [[ "${1:-}" == "--run" ]]; then
  exec "$BIN"
fi