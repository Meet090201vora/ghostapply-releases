#!/usr/bin/env bash
# GhostApply engine installer for macOS/Linux testers.
#
# Users run this one line in Terminal (also shown inside the app when the
# engine is missing):
#
#   curl -fsSL https://raw.githubusercontent.com/Meet090201vora/ghostapply-releases/main/get.sh | bash
#
# It downloads the GhostApply engine (from the latest public release) into the
# per-user data folder, sets up the Python environment, and tells the desktop
# app where to find it. Safe to re-run: it keeps the existing virtualenv and
# backend/.env, and re-running updates the engine in place.
#
# NOTE: the canonical copy lives in the private GhostApply repo (scripts/get.sh)
# and is published to the public ghostapply-releases repo automatically.
set -euo pipefail

PUBLIC_REPO="Meet090201vora/ghostapply-releases"
ENGINE_URL="https://github.com/$PUBLIC_REPO/releases/latest/download/ghostapply-engine.tar.gz"
case "$(uname -s)" in
  Darwin) DATA="$HOME/Library/Application Support/GhostApply" ;;
  *) DATA="${XDG_CONFIG_HOME:-$HOME/.config}/GhostApply" ;;
esac
APP="$DATA/app"

echo "== GhostApply engine installer =="

if ! command -v python3 >/dev/null 2>&1; then
  echo "Python 3.11+ is required. Install it from https://www.python.org/downloads/ and run this again."
  exit 1
fi

echo "Downloading the GhostApply engine..."
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/engine"
curl -fsSL "$ENGINE_URL" | tar -xz -C "$TMP/engine"

SOURCE="$TMP/engine"
if [ ! -d "$SOURCE/backend" ]; then
  # Tolerate a single wrapping folder.
  SOURCE="$(find "$TMP/engine" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
fi

mkdir -p "$DATA"
# Keep the virtualenv and .env across updates.
[ -d "$APP/.venv" ] && mv "$APP/.venv" "$TMP/keep-venv"
[ -f "$APP/backend/.env" ] && cp "$APP/backend/.env" "$TMP/keep.env"
rm -rf "$APP"
mv "$SOURCE" "$APP"
[ -d "$TMP/keep-venv" ] && mv "$TMP/keep-venv" "$APP/.venv"
[ -f "$TMP/keep.env" ] && cp "$TMP/keep.env" "$APP/backend/.env"

chmod +x "$APP/scripts/setup.sh" "$APP/scripts/start.sh"
"$APP/scripts/setup.sh"

printf '%s' "$APP" > "$DATA/install-root.txt"

echo
echo "All set!"
echo "Open GhostApply (or click 'Try again' if it is already open)."
