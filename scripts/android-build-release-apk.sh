#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/android-prepare.sh"

echo "==> Building release APK"
echo "==> Note: proper long-term updates require a valid release signing setup"
cd "$ROOT_DIR/android"
./gradlew assembleRelease

echo "==> Release APK task finished"
echo "$APK_PATH"