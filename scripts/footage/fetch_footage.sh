#!/bin/bash
# Re-create the footage library from scripts/footage_manifest.csv.
#  1. downloads each clip through Pexels' public download link (same as the site's Download button;
#     it returns the highest resolution Pexels offers, 4K where available) into footage_src/ (gitignored)
#  2. makes 2304x1296 16:9 proxies in assets/footage/ (centre-cropped; 1.2x the frame so slow
#     push-ins stay sharp; native fps kept so 60 fps clips give real slow motion)
# Usage (from the repo root):  bash scripts/footage/fetch_footage.sh
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/footage_src"; OUT="$ROOT/assets/footage"
mkdir -p "$SRC" "$OUT"
python3 - "$ROOT/scripts/footage_manifest.csv" > /tmp/ih_ids.txt <<'EOF'
import csv, sys
for r in csv.DictReader(open(sys.argv[1])): print(r['code'], r['pexels_id'])
EOF
while read -r code id; do
  if [ ! -s "$SRC/$code.mp4" ]; then
    url=$(curl -s -o /dev/null -A "Mozilla/5.0" -w "%{redirect_url}" "https://www.pexels.com/download/video/$id/")
    [ -z "$url" ] && { echo "$code ($id): no download link — download it manually from the page in footage_manifest.csv"; continue; }
    curl -s -f -L --retry 3 -o "$SRC/$code.part" "$url" && mv "$SRC/$code.part" "$SRC/$code.mp4"
    echo "$code downloaded"
  fi
  if [ ! -s "$OUT/$code.mp4" ]; then
    pre=""
    # B03 is strongly blue-teal at source: desaturate then warm so it matches the golden palette
    [ "$code" = "B03" ] && pre="hue=s=0.3,colorbalance=rs=.08:bs=-.09:rm=.15:gm=.02:bm=-.16:rh=.06:bh=-.08,eq=brightness=0.04,"
    ffmpeg -hide_banner -loglevel error -y -i "$SRC/$code.mp4" -an \
      -vf "scale=2304:1296:force_original_aspect_ratio=increase:flags=lanczos,crop=2304:1296,${pre}format=yuv420p" \
      -c:v libx264 -preset medium -crf 19 -g 30 -movflags +faststart "$OUT/$code.mp4"
    echo "$code proxy ready"
  fi
done < /tmp/ih_ids.txt
