#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/release/app-release.apk"
KEYSTORE_PROPERTIES_PATH="$ROOT_DIR/android/keystore.properties"

cd "$ROOT_DIR"

"$ROOT_DIR/scripts/android-prepare.sh"

if [[ ! -f "$KEYSTORE_PROPERTIES_PATH" ]]; then
	echo "==> Missing Android release signing config: $KEYSTORE_PROPERTIES_PATH"
	echo "==> Create it from android/keystore.properties.example before building a signed release APK"
	exit 1
fi

echo "==> Building release APK"
echo "==> Using release signing config from $KEYSTORE_PROPERTIES_PATH"
cd "$ROOT_DIR/android"
bash ./gradlew assembleRelease

echo "==> Release APK task finished"
echo "$APK_PATH"