#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUNDLE_PATH="$ROOT_DIR/android/app/build/outputs/bundle/release/app-release.aab"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/android-prepare.sh"

echo "==> Building release App Bundle"
echo "==> Note: uploadable Play Store bundles require a valid release signing setup"
cd "$ROOT_DIR/android"
./gradlew bundleRelease

echo "==> Release bundle task finished"
echo "$BUNDLE_PATH"