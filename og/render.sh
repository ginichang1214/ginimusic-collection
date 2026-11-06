#!/usr/bin/env bash
# 重新產生五張分享預覽圖（1200 × 630 PNG），需要 Microsoft Edge。
# 用法：在專案根目錄執行  bash og/render.sh
# 台北站、紐奧良站、亞特蘭大站直接截各站頁面（網址加 ?og 會切成預覽圖模式），要先開本機伺服器：
#   python -m http.server 5173
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SERVER="http://localhost:5173"

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -x "$EDGE" ] || EDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

shoot() { # $1 = 輸出檔, $2 = 網址
  local profile
  profile="$(mktemp -d)"
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
    --force-device-scale-factor=1 --window-size=1200,630 \
    --virtual-time-budget=10000 \
    --user-data-dir="$(cygpath -w "$profile")" \
    --screenshot="$(cygpath -w "$ROOT/$1")" \
    "$2" >/dev/null 2>&1
  rm -rf "$profile" 2>/dev/null || true # Edge 有時還沒放開暫存資料夾，刪不掉就算了
  echo "已產生 $1"
}
template() { echo "file:///$(cygpath -m "$ROOT/og/$1")?${2:-}"; }

# GROOVE STATION 首頁：站名牌、翻牌看板、黑膠唱片、城市夜景（文字直接改 og/groove-station.html）
shoot og-image.png "$(template groove-station.html)"

# TOKYO NIGHTS 東京站：黃昏城市（日文小字：シティポップ・コレクション）
shoot tokyo-nights/og-image.png "$(template tokyo-nights.html "e=%E3%82%B7%E3%83%86%E3%82%A3%E3%83%9D%E3%83%83%E3%83%97%E3%83%BB%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3&t=TOKYO%20NIGHTS&s=%E6%9D%B1%E4%BA%AC%E7%AB%99&l=1960%20%E2%80%94%202026%20%C2%B7%20%E6%97%A5%E6%9C%AC%20City%20Pop")"

# 其他三站：直接截車站頁面的主視覺
if curl -s -o /dev/null "$SERVER/"; then
  for dir in taipei-image funk-soul-train hiphop-rnb-town; do
    shoot "$dir/og-image.png" "$SERVER/$dir/?og"
  done
else
  echo "沒有偵測到 $SERVER，跳過台北站、紐奧良站、亞特蘭大站（先執行 python -m http.server 5173）"
fi
