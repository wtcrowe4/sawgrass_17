#!/usr/bin/env bash
# snap.sh -- screenshot the dev scene using WINDOWS-side Chrome.
#
# Usage: scripts/snap.sh <out.png> [url] [budgetMs]
#
# WHY THIS SHAPE (rewritten 2026-08-01):
#   The previous version drove Chrome over CDP on localhost:9223. That relied
#   on WSL mirrored networking, which was DISABLED on 2026-07-30 (see
#   %USERPROFILE%\.wslconfig -- Tailscale + Modern Standby resume caused
#   Wsl/Service/0x8007274c timeouts). Under NAT:
#     - Windows -> WSL localhost still works (localhostForwarding=true), so
#       Chrome can load http://localhost:3001 from the WSL dev server.
#     - WSL -> Windows localhost does NOT, and binding CDP to the gateway IP
#       is blocked by the Hyper-V firewall on vEthernet (WSL).
#   So: no socket from WSL. Chrome writes the PNG to the Windows filesystem
#   and we read it back through /mnt/c. Chrome exits on its own after the
#   capture, so there is no lingering process to leak.
#
#   NEVER launch chromium inside WSL against this scene -- it falls back to
#   SwiftShader and the R3F frame loop pins ~8 cores until killed.
#
# Appends ?nointro=1 so the cinematic camera sweep is skipped; virtual time
# does not advance useFrame deltas, so the intro would freeze mid-flight.
set -euo pipefail
OUT="${1:?usage: snap.sh <out.png> [url] [budgetMs]}"
URL="${2:-http://localhost:3001}"
BUDGET="${3:-20000}"

CHROME_EXE="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
WIN_DIR='C:\temp\claude-shots'
WSL_DIR="/mnt/c/temp/claude-shots"
NAME="snap-$$.png"
PROFILE="C:\\temp\\claude-shot-profile-$$"

case "$URL" in
  *\?*) URL="${URL}&nointro=1" ;;
  *)    URL="${URL}?nointro=1" ;;
esac

mkdir -p "$WSL_DIR"
rm -f "$WSL_DIR/$NAME"

# --headless (old) is required: --headless=new ignores --screenshot here.
# Unique profile per run: a shared profile dir deadlocks if a prior Chrome
# has not fully released its lock. Hard timeout because --virtual-time-budget
# only advances while the page is idle, and R3F's rAF loop never goes idle --
# without this Chrome can hang forever instead of writing the frame.
timeout 90 "$CHROME_EXE" --headless --disable-gpu --hide-scrollbars --no-first-run \
  --user-data-dir="$PROFILE" \
  --window-size=1280,720 --virtual-time-budget="$BUDGET" \
  --screenshot="$WIN_DIR\\$NAME" "$URL" > /dev/null 2>&1 || true

if [ ! -s "$WSL_DIR/$NAME" ]; then
  echo "snap.sh: chrome wrote no image (is the dev server up on $URL ?)" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
cp "$WSL_DIR/$NAME" "$OUT"
rm -f "$WSL_DIR/$NAME"
rm -rf "/mnt/c/temp/$(basename "${PROFILE//\\//}")" 2>/dev/null || true
echo "wrote $OUT"
