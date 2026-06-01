#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/android-prepare.sh"

echo "==> Building debug APK"
cd "$ROOT_DIR/android"
./gradlew assembleDebug

echo "==> Debug APK created"
echo "$APK_PATH"