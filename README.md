# TOKYO NIGHTS 東京夜色

日本 City Pop 名曲的單頁網站，範圍從 1960 到 2026 年：60 年代的歌謠曲源頭、70～80 年代的黃金期、90 年代的澀谷系，一路到 2020 年代的新世代。目前收錄 33 首、28 位歌手。

- 依氛圍篩選：#夜晚、#夏日、#都會、#戀愛、#兜風
- 依年代篩選：60 年代到 2020 年代，按鈕上會顯示每個年代有幾首
- 可以搜尋歌名、歌手或專輯，也能依年份或歌手排序
- 「今晚聽哪首？」按鈕會從目前篩選結果中隨機挑一首
- 每首歌都有 YouTube、Spotify、Apple Music 連結：有填直接連結就開那首歌，沒填就開平台搜尋頁。本站不提供音檔

純 HTML、CSS、JavaScript，不需要安裝任何套件。

線上網站：https://ginichang1214.github.io/citypop-collection/

## 檔案

| 檔案 | 用途 |
| --- | --- |
| `index.html` | 頁面結構 |
| `styles.css` | 樣式（黃昏城市、黑膠唱片卡片） |
| `app.js` | 篩選、搜尋、排序、隨機推薦、畫天際線 |
| `tracks.js` | 曲目資料 |

## 本機預覽

直接用瀏覽器打開 `index.html` 就可以看。或在這個資料夾執行：

```bash
python -m http.server 5173
```

再打開 http://localhost:5173

## 新增歌曲

打開 `tracks.js`，照同樣的格式在陣列裡加一筆：

```js
{
  id: 'song-id',            // 不可重複，用英文和連字號
  title: '日文歌名',
  romaji: 'Romaji Title',
  artist: '歌手（日文）',
  artistEn: 'Artist Name',
  year: 1983,               // 1960 到 2026，會自動分到對應年代
  album: '專輯名稱',         // 單曲填 null
  moods: ['夜晚', '都會'],   // 可用：夜晚、夏日、都會、戀愛、兜風
  note: '一句話介紹。',
  youtube: 'https://music.youtube.com/watch?v=…', // 選填：直接連到這首歌
  // spotify、appleMusic 也可以照樣填
},
```

## 更新線上網站

網站用 GitHub Pages 從 `main` 分支發佈。改完後提交並推送，一兩分鐘內就會更新：

```bash
git add .
git commit -m "新增歌曲"
git push
```
