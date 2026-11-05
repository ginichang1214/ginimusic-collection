# City Pop 集結

精選 70、80 年代日本 City Pop 名曲的單頁網站，總共 18 首、14 位歌手，年代從 1976 到 1985。

- 依氛圍篩選：#夜晚、#夏日、#都會、#戀愛、#兜風
- 可以搜尋歌名、歌手或專輯，也能依年份或歌手排序
- 「今晚聽哪首？」按鈕會隨機挑一首推薦
- 每首歌都有 YouTube、Spotify、Apple Music 的搜尋連結，本站不提供音檔

純 HTML、CSS、JavaScript，不需要安裝任何套件。

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
  year: 1983,
  album: '專輯名稱',         // 單曲填 null
  moods: ['夜晚', '都會'],   // 可用：夜晚、夏日、都會、戀愛、兜風
  note: '一句話介紹。',
},
```

## 發佈到 GitHub Pages

1. 把這個資料夾推到 GitHub 的公開儲存庫
2. 到儲存庫的 **Settings → Pages**，Source 選 **Deploy from a branch**，分支選 `main`、資料夾選 `/ (root)`
3. 等一兩分鐘，網站就會出現在 `https://<你的帳號>.github.io/<儲存庫名稱>/`
