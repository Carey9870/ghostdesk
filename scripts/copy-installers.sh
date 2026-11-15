#!/usr/bin/env bash
# path: scripts/copy-installers.sh
# purpose: Copies the installers you built locally (Linux .AppImage/.deb/.rpm) into apps/web/public/downloads so the website's Download button serves them.
set -euo pipefail
BUNDLE="apps/desktop/src-tauri/target/release/bundle"
DEST="apps/web/public/downloads"
mkdir -p "$DEST"
shopt -s nullglob
files=("$BUNDLE"/appimage/*.AppImage "$BUNDLE"/deb/*.deb "$BUNDLE"/rpm/*.rpm)
if [ ${#files[@]} -eq 0 ]; then
  echo "No installers found in $BUNDLE. Run: pnpm --filter @ghostdesk/desktop tauri build" >&2
  exit 1
fi
cp -v "${files[@]}" "$DEST/"
echo "Done. Open http://localhost:3000 and click Download."
