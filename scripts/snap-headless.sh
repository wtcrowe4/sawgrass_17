#!/usr/bin/env bash
# Headless screenshot that KEEPS WebGL on Omarchy (system chromium).
# The magic combo: ANGLE default + --ozone-platform=headless; plain
# --headless=new kills the GPU process on this box.
# Usage: scripts/snap-headless.sh out.png "http://localhost:3002/?nointro=1&cam=..."
set -euo pipefail
out="$1"; url="$2"
chromium --headless=new --enable-gpu \
  --use-gl=angle --use-angle=default --ozone-platform=headless \
  --window-size="${3:-1280,720}" --virtual-time-budget=12000 \
  --screenshot="$out" "$url" 2>/dev/null
