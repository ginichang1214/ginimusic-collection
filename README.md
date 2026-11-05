# GROOVE STATION

City Pop 與 Funk 名曲的單頁網站，範圍從 1960 到 2026 年。目前收錄 62 首、54 位歌手（City Pop 33 首、Funk 29 首）。

另外保留了日本 City Pop 特輯 **TOKYO NIGHTS 東京站**（`tokyo-nights/`），是網站加入 Funk 之前的版本，兩頁互相連結。

- 依曲風、氛圍、年代篩選，按鈕上會顯示每類有幾首
- 可以搜尋歌名、歌手、專輯或曲風，也能依年份或歌手排序
- 「今晚聽哪首？」按鈕會從目前篩選結果中隨機挑一首
- 每首歌都有 YouTube、Spotify、Apple Music 連結：有填直接連結就開那首歌，沒填就開平台搜尋頁。本站不提供音檔
- 分享到 LINE、Facebook、X 時會顯示預覽圖（`og-image.png`）

純 HTML、CSS、JavaScript，不需要安裝任何套件。

| 頁面 | 網址 |
| --- | --- |
| GROOVE STATION（首頁） | https://ginichang1214.github.io/citypop-collection/ |
| TOKYO NIGHTS 東京站（特輯） | https://ginichang1214.github.io/citypop-collection/tokyo-nights/ |

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 首頁結構、分享預覽標籤 |
| `styles.css` | 樣式（黃昏城市、黑膠唱片卡片） |
| `app.js` | 篩選、搜尋、排序、隨機推薦、畫天際線 |
| `tracks.js` | 曲目資料 |
| `og-image.png` | 首頁的分享預覽圖（1200 × 630） |
| `og/og-image.html` | 分享預覽圖的範本 |
| `og/render.sh` | 重新產生兩張分享預覽圖 |
| `tokyo-nights/` | TOKYO NIGHTS 東京站特輯，獨立的一套檔案，改首頁不會影響它 |

## 本機預覽

在這個資料夾執行：

```bash
python -m http.server 5173
```

再打開 http://localhost:5173

## 新增歌曲

打開 `tracks.js`，照同樣的格式在陣列裡加一筆：

```js
{
  id: 'song-id',            // 不可重複，用英文和連字號
  genre: 'Funk',            // City Pop、Funk；填新的曲風名稱，篩選按鈕會自動出現
  title: '歌名',
  romaji: 'Romaji Title',   // 英文歌就跟 title 一樣
  artist: '歌手',
  artistEn: 'Artist Name',  // 英文歌手就跟 artist 一樣
  year: 1983,               // 1960 到 2026，會自動分到對應年代
  album: '專輯名稱',         // 單曲填 null
  moods: ['夜晚', '派對'],   // 可用：夜晚、夏日、都會、戀愛、兜風、派對
  note: '一句話介紹。',
  youtube: 'https://music.youtube.com/watch?v=…', // 選填：直接連到這首歌
  // spotify、appleMusic 也可以照樣填
},
```

## 重新產生分享預覽圖

改了網站名稱或視覺後，用 Microsoft Edge 重新產生兩張預覽圖（文字在 `og/render.sh` 裡改）：

```bash
bash og/render.sh
```

推送後，Facebook 和 LINE 可能還會顯示舊圖。到 Facebook 的 [Sharing Debugger](https://developers.facebook.com/tools/debug/) 貼上網址，按「再抓一次」就會更新。

## 更新線上網站

網站用 GitHub Pages 從 `main` 分支發佈。改完後提交並推送，一兩分鐘內就會更新：

```bash
git add .
git commit -m "新增歌曲"
git push
```
