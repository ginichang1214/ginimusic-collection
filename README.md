# GROOVE STATION

四條音樂路線的總站。每條路線是一座城市的律動，各有一個車站頁面：

| 路線 | 車站 | 曲風 | 網址 |
| --- | --- | --- | --- |
| GROOVE STATION（首頁） | 總站 | 四條路線全部 | https://ginichang1214.github.io/ginimusic-collection/ |
| TOKYO NIGHTS | 東京站 | 日本 City Pop | https://ginichang1214.github.io/ginimusic-collection/tokyo-nights/ |
| TAIPEI IMAGE | 台北站 | 華語流行、R&B、嘻哈 | https://ginichang1214.github.io/ginimusic-collection/taipei-image/ |
| FUNK & SOUL TRAIN | 紐奧良站 | Funk、Soul | https://ginichang1214.github.io/ginimusic-collection/funk-soul-train/ |
| HIP HOP R&B TOWN | 亞特蘭大站 | Hip Hop、R&B | https://ginichang1214.github.io/ginimusic-collection/hiphop-rnb-town/ |

目前收錄 246 首：東京站 33、台北站 86、紐奧良站 59、亞特蘭大站 68。

## 網站上有什麼

- **車站分頁**：每一頁最上面都有五個分頁，可以在首頁和四個車站之間切換。
- **翻牌看板**：
  - 首頁的看板有四個月台，一條路線一個，每排輪流翻出那條路線的年代和歌名，點一排就跳到那首歌。
  - 各站的「本站時刻表」也是翻牌看板，上面還有跑馬燈到站廣播，下面有「下一站」連結。四站繞成一圈：東京 → 台北 → 紐奧良 → 亞特蘭大 → 東京。
- **路線導覽車票**：首頁的四張車票，有每站的小故事和代表曲。
- **集章**：去過的車站會在首頁車票上蓋「已到站」章，四站集滿會顯示「全線制霸」。記錄只存在訪客自己的瀏覽器裡。
- **背景音樂**：首頁右下角的〈Last Train Groove 末班車〉是本站原創，用瀏覽器即時合成，不需要音檔。瀏覽器不允許網頁自己出聲，所以要等訪客按下才播放。
- **篩選與搜尋**：依路線（首頁）或曲風（各站）、氛圍、年代篩選，可以搜尋歌名、歌手、專輯，也能依年份或歌手排序。
- **今晚聽哪首？**：從目前的篩選結果隨機挑一首，看板也會跟著翻到那首。
- **收聽連結**：每首歌都有 YouTube、Spotify、Apple Music 連結。有填直接連結就開那首歌，沒填就開平台搜尋頁。本站不提供音檔。
- **隱藏的迪斯可版**：首頁另一款主視覺（鏡球、光束、會閃的地板）先藏起來了，網址加 `?hero=disco` 才看得到。

純 HTML、CSS、JavaScript，不需要安裝任何套件。

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `tracks.js` | 所有曲目資料（四條路線共用） |
| `lines.js` | 路線設定：名稱、顏色、網址、車站小故事、代表曲 |
| `common.js`、`common.css` | 共用程式和樣式：車站分頁、翻牌看板、篩選、曲目卡片、集章 |
| `index.html`、`styles.css`、`app.js` | 首頁：站名牌、黑膠唱片和城市夜景、四月台看板、路線圖、車票 |
| `bgm.js` | 首頁背景音樂〈Last Train Groove 末班車〉和播放按鈕 |
| `station/station.js`、`station/station.css` | 四個車站共用的頁面模板和各站背景 |
| `tokyo-nights/`、`taipei-image/`、`funk-soul-train/`、`hiphop-rnb-town/` | 各車站的頁面和分享預覽圖 |
| `og-image.png` | 首頁的分享預覽圖（1200 × 630） |
| `og/` | 分享預覽圖的範本和產生腳本 |

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
  line: 'taipei',           // 放在哪一站：tokyo、taipei、neworleans、atlanta
  genre: '華語 R&B',         // 卡片上的曲風小標，車站頁的曲風篩選會自動出現
  title: '歌名',
  romaji: 'Ge Ming',        // 顯示在翻牌看板上，只能用英文字母和數字（中文歌填拼音或英文歌名）
  artist: '歌手',
  artistEn: 'Artist Name',  // 英文歌手就跟 artist 一樣
  year: 2005,               // 1960 到 2026，會自動分到對應年代
  album: '專輯名稱',         // 單曲填 null
  moods: ['夜晚', '戀愛'],   // 可用：夜晚、夏日、都會、戀愛、兜風、派對
  note: '一句話介紹。',
  youtube: 'https://music.youtube.com/watch?v=…', // 選填：直接連到這首歌
  // spotify、appleMusic 也可以照樣填
},
```

要新增一條路線，在 `lines.js` 加一筆設定，再照現有車站的資料夾複製一個新的 `index.html`，把 `<body data-line="…">` 改成新路線的 id。

## 重新產生分享預覽圖

改了網站名稱或視覺後，先開本機伺服器（台北、紐奧良、亞特蘭大三站是直接截車站頁面），再用 Microsoft Edge 產生五張預覽圖：

```bash
bash og/render.sh
```

首頁的文字直接改 `og/groove-station.html`，東京站的文字在 `og/render.sh` 裡改。

推送後，Facebook 和 LINE 可能還會顯示舊圖。到 Facebook 的 [Sharing Debugger](https://developers.facebook.com/tools/debug/) 貼上網址，按「再抓一次」就會更新。

## 更新線上網站

網站用 GitHub Pages 從 `main` 分支發佈。改完後提交並推送，一兩分鐘內就會更新：

```bash
git add .
git commit -m "新增歌曲"
git push
```
