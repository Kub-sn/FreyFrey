#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

if [[ -z "${CAPACITOR_ANDROID_STUDIO_PATH:-}" ]]; then
	candidate_paths=(
		"$HOME/.local/share/JetBrains/Toolbox/apps/android-studio/bin/studio"
		"$HOME/android-studio/bin/studio.sh"
		"/opt/android-studio/bin/studio.sh"
		"/usr/local/android-studio/bin/studio.sh"
	)

	for candidate in "${candidate_paths[@]}"; do
		if [[ -x "$candidate" ]]; then
			export CAPACITOR_ANDROID_STUDIO_PATH="$candidate"
			break
		fi
	done
fi

cd "$ROOT_DIR"

"$ROOT_DIR/android/scripts/android-prepare.sh"

echo "==> Opening Android Studio project"

if [[ -n "${CAPACITOR_ANDROID_STUDIO_PATH:-}" ]]; then
	echo "==> Using Android Studio at $CAPACITOR_ANDROID_STUDIO_PATH"
else
	echo "==> Android Studio launcher not auto-detected. Set CAPACITOR_ANDROID_STUDIO_PATH if 'npx cap open android' fails."
fi

npx cap open android