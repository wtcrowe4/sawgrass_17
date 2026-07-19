#!/usr/bin/env bash
# snap.sh -- GPU-rendered screenshot of the dev scene with a bounded browser
# lifecycle. Renders on the WINDOWS side (RTX via ANGLE d3d11) so WSL CPU
# stays flat; the browser is always closed when the capture ends.
#
# Usage: scripts/snap.sh <out.png> [url] [waitMs] [evalExpr]
#   evalExpr runs before the screenshot (e.g. click a pin button and settle).
#
# Never launch SwiftShader chromium in WSL for this scene -- the R3F frame
# loop pins ~8 cores until the process is killed.
set -euo pipefail
OUT="${1:?usage: snap.sh <out.png> [url] [waitMs] [evalExpr]}"
URL="${2:-http://localhost:3001}"
WAIT="${3:-25000}"
EVAL="${4:-}"
PORT=9223
CHROME_EXE="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"
PROFILE='C:\temp\claude-chrome-profile'
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cleanup() {
  # belt and braces: ask politely via CDP first (done in cdp-capture.mjs),
  # then make sure nothing with our profile survives on the Windows side
  taskkill.exe /F /FI "IMAGENAME eq chrome.exe" /FI "WINDOWTITLE eq about:blank*" > /dev/null 2>&1 || true
  curl -s --max-time 1 "localhost:$PORT/json/version" > /dev/null 2>&1 && \
    taskkill.exe /F /IM chrome.exe /FI "COMMANDLINE eq *claude-chrome-profile*" > /dev/null 2>&1 || true
}
trap cleanup EXIT

if ! curl -s --max-time 1 "localhost:$PORT/json/version" > /dev/null 2>&1; then
  "$CHROME_EXE" --headless=new --remote-debugging-port=$PORT --no-first-run \
    --window-size=1280,720 --user-data-dir="$PROFILE" about:blank > /dev/null 2>&1 &
  for _ in $(seq 1 20); do
    curl -s --max-time 1 "localhost:$PORT/json/version" > /dev/null 2>&1 && break
    sleep 0.5
  done
fi

CDP_HOST="localhost:$PORT" CDP_CLOSE=1 node "$DIR/cdp-capture.mjs" "$URL" "$WAIT" "$OUT" ${EVAL:+"$EVAL"}
