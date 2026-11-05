#!/usr/bin/env bash
# 重新產生兩張分享預覽圖（1200 × 630 PNG），需要 Microsoft Edge。
# 用法：在專案根目錄執行  bash og/render.sh
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"

EDGE="/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
[ -x "$EDGE" ] || EDGE="/c/Program Files/Microsoft/Edge/Application/msedge.exe"

PROFILE="$(mktemp -d)"
trap 'rm -rf "$PROFILE"' EXIT

TEMPLATE="file:///$(cygpath -m "$ROOT/og/og-image.html")"

render() { # $1 = 輸出檔, $2 = 網址參數
  "$EDGE" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
    --force-device-scale-factor=1 --window-size=1200,630 \
    --virtual-time-budget=10000 \
    --user-data-dir="$(cygpath -w "$PROFILE")" \
    --screenshot="$(cygpath -w "$ROOT/$1")" \
    "$TEMPLATE?$2" >/dev/null 2>&1
  echo "已產生 $1"
}

# GROOVE STATION 首頁
render og-image.png "e=CITY%20POP%20%C3%97%20FUNK&t=GROOVE%20STATION&l=1960%20%E2%80%94%202026"

# TOKYO NIGHTS 東京站 特輯（日文小字：シティポップ・コレクション）
render tokyo-nights/og-image.png "e=%E3%82%B7%E3%83%86%E3%82%A3%E3%83%9D%E3%83%83%E3%83%97%E3%83%BB%E3%82%B3%E3%83%AC%E3%82%AF%E3%82%B7%E3%83%A7%E3%83%B3&t=TOKYO%20NIGHTS&s=%E6%9D%B1%E4%BA%AC%E7%AB%99&l=1960%20%E2%80%94%202026%20%C2%B7%20%E6%97%A5%E6%9C%AC%20City%20Pop"
