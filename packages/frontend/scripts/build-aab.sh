#!/usr/bin/env bash
# Builds a signed Android App Bundle (.aab) for Google Play Console.
#
# Requires these env vars (never commit their values):
#   GYMERR_KEYSTORE_PATH      absolute path to the release .keystore
#   GYMERR_KEYSTORE_PASSWORD
#   GYMERR_KEY_ALIAS
#   GYMERR_KEY_PASSWORD
#
# Usage:
#   GYMERR_KEYSTORE_PATH=/path/to/gymerr-release.keystore \
#   GYMERR_KEYSTORE_PASSWORD=... \
#   GYMERR_KEY_ALIAS=gymerr \
#   GYMERR_KEY_PASSWORD=... \
#   npm run android:bundle

set -euo pipefail

missing=()
for var in GYMERR_KEYSTORE_PATH GYMERR_KEYSTORE_PASSWORD GYMERR_KEY_ALIAS GYMERR_KEY_PASSWORD; do
  if [ -z "${!var:-}" ]; then
    missing+=("$var")
  fi
done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing required env var(s): ${missing[*]}" >&2
  echo "See scripts/build-aab.sh for usage." >&2
  exit 1
fi
if [ ! -f "$GYMERR_KEYSTORE_PATH" ]; then
  echo "Keystore not found at: $GYMERR_KEYSTORE_PATH" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

echo "==> Building web assets"
npm run build

echo "==> Syncing into Android project"
npx cap sync android

echo "==> Building signed release bundle"
cd android
./gradlew bundleRelease

echo ""
echo "Done. AAB at:"
echo "  packages/frontend/android/app/build/outputs/bundle/release/app-release.aab"
