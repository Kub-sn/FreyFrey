#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"

echo "==> Building web app"
npm run build

echo "==> Syncing Capacitor Android project"
npx cap sync android

echo "==> Android project is prepared"