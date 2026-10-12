#!/usr/bin/env bash
# Symmetric source-fidelity gate for the Saudia replica: both live and prototype were
# captured by the same interactive browser session + routine (live-capture.js), so the
# pixel and parity probes compare like with like. Usage: gate-sym.sh <slug> <width> [iterLabel]
set -euo pipefail
SLUG=$1; W=$2; ITER=${3:-iter}
R=/backups/nshahwan/saudiaeds/repo/stardust
G=$R/replica/gates/$SLUG-$W
P=${SRC:-/tmp/playwright/proto}/$SLUG-$W
mkdir -p "$G/proto-capture" "$G/$ITER"
cp "$P"/styles.json "$P"/meta.json "$G/proto-capture/"
node "$R/replica/stitch-chunks.mjs" "$P" "$G/proto.png" >/dev/null
node "$R/scripts/replica/pixel-compare.mjs" "$G/live.png" "$G/proto.png" --out "$G/diff.png" | tee "$G/$ITER/pixel.txt"
node "$R/replica/parity.mjs" "$SLUG" "$W" "$G/proto-capture/styles.json" > "$G/$ITER/parity-full.txt" || true
echo "--- parity (|dy|>2 or |dx|>2, first 30) ---"
awk 'NR==1 || /dy[+-]([3-9]|[0-9][0-9])/ || /dx[+-]([3-9]|[0-9][0-9])/' "$G/$ITER/parity-full.txt" | grep -v '^EXTRA' | head -30
cp "$G/proto.png" "$G/diff.png" "$G/$ITER/" 2>/dev/null || true
