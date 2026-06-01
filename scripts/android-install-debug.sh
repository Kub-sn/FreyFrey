#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/android-build-debug-apk.sh"

echo "==> Installing debug APK on connected Android device"
cd "$ROOT_DIR/android"
./gradlew installDebug