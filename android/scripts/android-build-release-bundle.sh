#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BUNDLE_PATH="$ROOT_DIR/android/app/build/outputs/bundle/release/app-release.aab"
KEYSTORE_PROPERTIES_PATH="$ROOT_DIR/android/keystore.properties"

cd "$ROOT_DIR"

"$ROOT_DIR/android/scripts/android-prepare.sh"

if [[ ! -f "$KEYSTORE_PROPERTIES_PATH" ]]; then
	echo "==> Missing Android release signing config: $KEYSTORE_PROPERTIES_PATH"
	echo "==> Create it from android/keystore.properties.example before building a Play Store bundle"
	exit 1
fi

echo "==> Building release App Bundle"
echo "==> Using release signing config from $KEYSTORE_PROPERTIES_PATH"
cd "$ROOT_DIR/android"
bash ./gradlew bundleRelease

echo "==> Release bundle task finished"
echo "$BUNDLE_PATH"