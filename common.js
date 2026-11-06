// GROOVE STATION 首頁和各站頁面共用的程式：
// 小工具、車站分頁標籤、集章、翻牌看板、曲目清單（搜尋、篩選、排序、隨機推薦）。
// 要先載入 tracks.js 和 lines.js。
(() => {
  'use strict';

  const LINES = window.GROOVE_LINES || [];
  const TRACKS = window.GROOVE_TRACKS || [];
  const ALL = '全部';
  const MOODS = ['夜晚', '夏日', '都會', '戀愛', '兜風', '派對'];
  const YEAR_MIN = 1960;
  const YEAR_MAX = 2026;
  const DECADES = [];
  for (let d = YEAR_MIN; d <= YEAR_MAX; d += 10) DECADES.push(d);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lineById = Object.fromEntries(LINES.map((l) => [l.id, l]));

  // 資料檢查：路線填錯或年份超出範圍時在主控台提醒
  TRACKS.forEach((t) => {
    if (!lineById[t.line]) console.warn(`「${t.title}」的 line「${t.line}」不在 lines.js 裡，不會出現在任何車站。`);
    if (t.year < YEAR_MIN || t.year > YEAR_MAX) {
      console.warn(`「${t.title}」的年份 ${t.year} 不在 ${YEAR_MIN}–${YEAR_MAX} 之間，年代篩選會找不到它。`);
    }
  });

  // 建立 DOM 元素的小工具：文字一律用 textContent，不拼 HTML。
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style') el.style.cssText = value;
      else el.setAttribute(key, value);
    }
    for (const child of children.flat(Infinity)) {
      if (child != null) el.append(child);
    }
    return el;
  }

  // 固定種子的亂數，讓背景每次載入都畫得一樣
  function seeded(seed) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  const decadeOf = (year) => Math.floor(year / 10) * 10;
  const decadeLabel = (d) => (d < 2000 ? `${String(d).slice(2)} 年代` : `${d} 年代`);
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();

  // 標上語言，瀏覽器才會用對的字型（日文漢字和中文字形不一樣）
  const KANA = /[぀-ヿ]/;
  const HAN = /[㐀-鿿豈-﫿]/;
  function langOf(text, line) {
    if (KANA.test(text)) return 'ja';
    if (HAN.test(text)) return line === 'tokyo' ? 'ja' : 'zh-Hant';
    return 'en';
  }

  // key：tracks.js 裡可選填的直接連結欄位；沒填就用搜尋頁
  const LINKS = [
    { name: 'YouTube', key: 'youtube', search: (s) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}` },
    { name: 'Spotify', key: 'spotify', search: (s) => `https://open.spotify.com/search/${encodeURIComponent(s)}` },
    { name: 'Apple Music', key: 'appleMusic', search: (s) => `https://music.apple.com/search?term=${encodeURIComponent(s)}` },
  ];

  const nextLine = (id) => {
    const i = LINES.findIndex((l) => l.id === id);
    return LINES[(i + 1) % LINES.length];
  };

  // ================================================================
  //  車站分頁標籤（每一頁最上面那排）
  //  base：從目前頁面回到網站根目錄的路徑，首頁是 ''，各站是 '../'
  // ================================================================
  function stationTabs(current, base) {
    const tabs = [
      { id: 'home', label: 'GROOVE STATION', href: base || './', color: '#ffd23f' },
      ...LINES.map((l) => ({ id: l.id, label: l.tab, href: base + l.path, color: l.color })),
    ];
    const list = h('ul', {}, tabs.map((t) => h('li', {},
      h('a', { href: t.href, style: `--c:${t.color}`, 'aria-current': t.id === current ? 'page' : null }, t.label))));
    const nav = h('nav', { class: 'station-tabs', 'aria-label': '車站分頁' }, list);
    // 手機上分頁會橫向捲動，把目前這頁捲進畫面
    requestAnimationFrame(() => {
      const on = list.querySelector('[aria-current]');
      if (on && list.scrollWidth > list.clientWidth) list.scrollLeft = on.parentElement.offsetLeft - 16;
    });
    return nav;
  }

  // ================================================================
  //  集章：去過的車站記在這台瀏覽器裡，首頁的車票會蓋上「已到站」
  // ================================================================
  const STAMP_KEY = 'groove-station:stamps';
  function getStamps() {
    try {
      return JSON.parse(localStorage.getItem(STAMP_KEY) || '{}') || {};
    } catch {
      return {};
    }
  }
  function addStamp(id) {
    try {
      const stamps = getStamps();
      if (!stamps[id]) {
        stamps[id] = new Date().toISOString().slice(0, 10);
        localStorage.setItem(STAMP_KEY, JSON.stringify(stamps));
      }
    } catch {
      // 無痕模式或封鎖儲存空間時就不集章，網站照常運作
    }
  }

  // ================================================================
  //  翻牌看板
  // ================================================================
  const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  function flapText(s) {
    return s.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  }

  // 把一排翻牌換成新文字；animate 時每格先亂翻一下再停在正確字母
  function setFlap(flap, text, animate) {
    const cells = [...flap.children];
    const chars = text.padEnd(cells.length, ' ').slice(0, cells.length);
    cells.forEach((cell, i) => {
      clearInterval(cell._timer);
      const target = chars[i];
      if (!animate || reduceMotion || cell.textContent === target) {
        cell.classList.remove('flipping');
        cell.textContent = target;
        return;
      }
      cell.classList.add('flipping');
      const stopAt = Date.now() + 180 + i * 45;
      cell._timer = setInterval(() => {
        if (Date.now() >= stopAt) {
          clearInterval(cell._timer);
          cell.classList.remove('flipping');
          cell.textContent = target;
        } else {
          cell.textContent = FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)];
        }
      }, 60);
    });
  }

  // 歌名比看板長時，盡量在空格處斷開
  function fitText(s, n) {
    if (s.length <= n) return s;
    const cut = s.lastIndexOf(' ', n);
    return cut > n * 0.5 ? s.slice(0, cut) : s.slice(0, n);
  }

  const flap = (n) => h('span', { class: 'flap' }, Array.from({ length: n }, () => h('b', {}, ' ')));

  /**
   * 建立一面翻牌看板。
   * title：看板左上角的標題
   * rows：每排一個 { platform, pool }，pool 是這排會輪播的歌
   * tagLabel / tagOf / colorOf：第二欄的標題、每首歌要顯示的標籤文字和顏色
   * onSelect(track)：點一排時呼叫
   * 放進畫面後要呼叫 start()；show(track) 會把那首歌翻到它所屬的那排
   */
  function createBoard({ title, rows: defs, tagLabel, tagOf, colorOf, onSelect, interval = 5000, riders }) {
    const rows = defs.map((def, i) => {
      const row = h('button', { type: 'button', class: 'board-row' },
        flap(2),
        h('span', { class: 'line-tag' }, h('i'), h('span')),
        h('span', { class: 'year' }, flap(4)),
        flap(1), // 歌名的格數等放進畫面後依寬度決定
        h('span', { class: 'status' }, h('i'), h('span', { class: 'on-time' }, '準點'), h('span', { class: 'boarding' }, '登車中')),
      );
      setFlap(row.children[0], String(def.platform ?? i + 1).padStart(2, '0'), false);
      row.def = def;
      row.addEventListener('click', () => row.track && onSelect?.(row.track));
      return row;
    });

    const clock = h('span', { class: 'board-clock' });
    const tick = () => {
      const d = new Date();
      clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    // 累計旅客：有傳 riders()（回傳人數的函式）才顯示，讀到數字後用翻牌跳出來
    const ridersEl = riders
      ? h('span', { class: 'board-riders', hidden: true }, h('span', { class: 'riders-label' }, '累計旅客'), flap(7))
      : null;

    const el = h('div', { class: 'board', role: 'group', 'aria-label': `${title}：點一排跳到那首歌` },
      h('div', { class: 'board-top', 'aria-hidden': 'true' },
        h('span', { class: 'board-title' }, title),
        h('span', { class: 'board-meta' }, ridersEl, clock)),
      h('div', { class: 'board-row board-head', 'aria-hidden': 'true' },
        h('span', {}, '月台'), h('span', {}, tagLabel), h('span', {}, '年份'), h('span', {}, '下一首'), h('span', {}, '狀態')),
      ...rows,
    );

    // 依歌名欄的實際寬度，算出放得下幾格翻牌
    function fitTitles() {
      for (const row of rows) {
        const titleFlap = row.children[3];
        const cell = titleFlap.firstChild.getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(titleFlap).columnGap) || 3;
        const n = Math.max(6, Math.floor((titleFlap.clientWidth + gap) / (cell + gap)));
        if (titleFlap.children.length !== n) {
          titleFlap.replaceChildren(...Array.from({ length: n }, () => h('b', {}, ' ')));
        }
      }
    }

    function setRow(row, t, animate) {
      row.track = t;
      const [, tag, year, titleFlap] = row.children;
      const color = colorOf(t);
      const updateTag = () => {
        tag.style.setProperty('--c', color);
        tag.lastChild.textContent = tagOf(t);
        row.style.setProperty('--line', color);
      };
      setFlap(year.firstChild, String(t.year), animate);
      setFlap(titleFlap, fitText(flapText(t.romaji), titleFlap.children.length), animate);
      // 標籤等字母翻完再換，才不會跟看板對不上
      if (animate && !reduceMotion) setTimeout(updateTag, 180 + titleFlap.children.length * 45);
      else updateTag();
      if (animate) {
        rows.forEach((r) => r.classList.remove('is-boarding'));
        row.classList.add('is-boarding');
      }
      row.setAttribute('aria-label', `${tagOf(t)}，${t.year} 年〈${t.title}〉${t.artist}，點一下跳到這首歌`);
    }

    const shown = () => rows.map((r) => r.track);
    const pickFor = (row) => {
      const pool = row.def.pool.filter((t) => !shown().includes(t));
      return pool[Math.floor(Math.random() * pool.length)] || row.def.pool[0];
    };

    function start() {
      tick();
      setInterval(tick, 10000);
      if (ridersEl) {
        Promise.resolve()
          .then(riders)
          .then((n) => {
            if (!Number.isFinite(n) || n < 0) return;
            ridersEl.hidden = false;
            setFlap(ridersEl.lastChild, String(n).padStart(7, '0').slice(-7), true);
          })
          .catch(() => {}); // 讀不到人數（例如統計服務還沒開放）就不顯示
      }
      fitTitles();
      rows.forEach((r) => r.def.pool.length && setRow(r, pickFor(r), false));
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          fitTitles();
          rows.forEach((r) => r.track && setRow(r, r.track, false));
        }, 200);
      });
      // 每隔幾秒輪流換一排，每條路線都會輪到
      if (!reduceMotion) {
        let next = 0;
        setInterval(() => {
          if (document.hidden) return;
          const row = rows[next++ % rows.length];
          if (row.def.pool.length > 1) setRow(row, pickFor(row), true);
        }, interval);
      }
    }

    function show(t) {
      const row = rows.find((r) => r.def.pool.includes(t)) || rows[0];
      setRow(row, t, true);
    }

    return { el, start, show };
  }

  // ================================================================
  //  曲目清單：搜尋、篩選按鈕、排序、卡片、隨機推薦
  // ================================================================
  const SORTERS = {
    'year-asc': (a, b) => a.year - b.year || a.romaji.localeCompare(b.romaji),
    'year-desc': (a, b) => b.year - a.year || a.romaji.localeCompare(b.romaji),
    artist: (a, b) => a.artistEn.localeCompare(b.artistEn) || a.year - b.year,
  };

  /**
   * tracks：要列出的歌
   * groups：要顯示的篩選列，可用 'line'、'genre'、'mood'、'decade'
   * accentOf(track, i)：每張卡片的唱片顏色
   * showLine：卡片上要不要標出車站名稱（首頁用）
   * onPick(track)：「今晚聽哪首？」挑到歌時呼叫
   * onFilter(state)：篩選改變時呼叫
   */
  function createCatalog({ tracks, groups, accentOf, showLine = false, onPick, onFilter }) {
    const $ = (sel) => document.querySelector(sel);
    const els = {
      grid: $('#grid'),
      filters: $('#filters'),
      search: $('#search'),
      sort: $('#sort'),
      count: $('#count'),
      empty: $('#empty'),
      stats: $('#stats'),
      shuffle: $('#shuffle'),
    };
    const state = { query: '', line: ALL, genre: ALL, mood: ALL, decade: ALL, sort: 'year-asc' };
    tracks.forEach((t, i) => { t.accent = accentOf(t, i); });

    const countBy = (fn) => tracks.filter(fn).length;
    const GROUPS = {
      line: {
        label: '路線',
        options: () => LINES.filter((l) => tracks.some((t) => t.line === l.id))
          .map((l) => ({ value: l.id, label: l.station, color: l.color, count: countBy((t) => t.line === l.id) })),
        test: (t, v) => t.line === v,
      },
      genre: {
        label: '曲風',
        options: () => [...new Set(tracks.map((t) => t.genre))]
          .map((g) => ({ value: g, label: g, count: countBy((t) => t.genre === g) })),
        test: (t, v) => t.genre === v,
      },
      mood: {
        label: '氛圍',
        options: () => MOODS.filter((m) => tracks.some((t) => t.moods.includes(m)))
          .map((m) => ({ value: m, label: `#${m}` })),
        test: (t, v) => t.moods.includes(v),
      },
      decade: {
        label: '年代',
        allLabel: `${YEAR_MIN}–${YEAR_MAX}`,
        options: () => DECADES.map((d) => ({ value: d, label: decadeLabel(d), count: countBy((t) => decadeOf(t.year) === d) })),
        test: (t, v) => decadeOf(t.year) === v,
      },
    };

    function renderStats() {
      if (!els.stats || !tracks.length) return;
      const artists = new Set(tracks.map((t) => t.artist)).size;
      const decades = new Set(tracks.map((t) => decadeOf(t.year))).size;
      const lines = new Set(tracks.map((t) => t.line)).size;
      els.stats.replaceChildren(...[
        showLine ? h('span', {}, h('b', {}, String(lines)), ' 條路線') : null,
        h('span', {}, h('b', {}, String(tracks.length)), ' 首名曲'),
        h('span', {}, h('b', {}, String(artists)), ' 位歌手'),
        h('span', {}, h('b', {}, String(decades)), ' 個年代'),
      ].filter(Boolean));
    }

    const chipGroups = [];
    function renderFilters() {
      for (const key of groups) {
        const group = GROUPS[key];
        const options = group.options();
        if (key === 'genre' && options.length < 2) continue; // 只有一種曲風就不用篩
        const chips = h('div', { class: 'chips', role: 'group', 'aria-labelledby': `${key}-label` });
        for (const opt of [{ value: ALL, label: group.allLabel || ALL }, ...options]) {
          const chip = h('button', {
            type: 'button',
            class: opt.color ? 'chip chip-line' : 'chip',
            'data-value': String(opt.value),
            style: opt.color ? `--c:${opt.color}` : null,
          },
          opt.color ? h('i', { 'aria-hidden': 'true' }) : null,
          opt.label,
          opt.count != null ? h('span', { class: 'chip-count' }, String(opt.count)) : null);
          if (opt.count === 0) chip.disabled = true;
          chip.addEventListener('click', () => setFilter(key, opt.value));
          chips.append(chip);
        }
        chipGroups.push([chips, key]);
        els.filters.append(h('div', { class: 'filter-row' },
          h('span', { class: 'filter-label', id: `${key}-label` }, group.label), chips));
      }
      syncChips();
    }

    function syncChips() {
      for (const [chips, key] of chipGroups) {
        for (const chip of chips.children) {
          chip.setAttribute('aria-pressed', String(chip.dataset.value === String(state[key])));
        }
      }
      onFilter?.(state);
    }

    function setFilter(key, value) {
      state[key] = value;
      syncChips();
      render();
    }

    function card(t) {
      const line = lineById[t.line];
      const query = `${t.artist} ${t.title}`;
      return h('li', { class: 'card', id: `track-${t.id}`, tabindex: '-1', style: `--accent:${t.accent}` },
        h('div', { class: 'disc', 'aria-hidden': 'true' }, h('span', { class: 'label' }, String(t.year))),
        h('div', { class: 'info' },
          h('p', { class: 'genre' }, showLine && line ? `${line.station} · ${t.genre}` : t.genre),
          h('h3', { class: 'title', lang: langOf(t.title, t.line) }, t.title),
          same(t.romaji, t.title) ? null : h('p', { class: 'romaji' }, t.romaji),
          h('p', { class: 'artist' },
            h('span', { lang: langOf(t.artist, t.line) }, t.artist),
            same(t.artistEn, t.artist) ? null : h('span', { class: 'en' }, ` · ${t.artistEn}`),
          ),
          h('p', { class: 'meta' }, `${t.year} · `, t.album ? h('span', { lang: langOf(t.album, t.line) }, `《${t.album}》`) : '單曲'),
          h('p', { class: 'note' }, t.note),
          h('ul', { class: 'tags', 'aria-label': '氛圍' }, t.moods.map((m) => h('li', {}, `#${m}`))),
        ),
        h('div', { class: 'links' },
          LINKS.map((l) => h('a', {
            href: t[l.key] || l.search(query),
            target: '_blank',
            rel: 'noopener noreferrer',
            'aria-label': t[l.key] ? `在 ${l.name} 收聽〈${t.title}〉` : `在 ${l.name} 搜尋〈${t.title}〉`,
          }, l.name)),
        ),
      );
    }

    function filtered() {
      const q = state.query.trim().toLowerCase();
      return tracks
        .filter((t) => groups.every((key) => state[key] === ALL || GROUPS[key].test(t, state[key])))
        .filter((t) => !q || [t.title, t.romaji, t.artist, t.artistEn, t.album || '', t.genre, lineById[t.line]?.station || '']
          .some((s) => s.toLowerCase().includes(q)))
        .sort(SORTERS[state.sort]);
    }

    function render() {
      const list = filtered();
      els.grid.replaceChildren(...list.map(card));
      els.count.textContent = `顯示 ${list.length} / ${tracks.length} 首`;
      els.empty.hidden = list.length > 0;
    }

    function resetFilters() {
      state.query = '';
      for (const key of groups) state[key] = ALL;
      els.search.value = '';
      syncChips();
      render();
    }

    // 讓某首歌的卡片發光、轉唱片並捲過去；被篩選掉的話先清掉篩選
    function spotlight(t) {
      if (!document.getElementById(`track-${t.id}`)) resetFilters();
      els.grid.querySelectorAll('.spotlight').forEach((el) => {
        el.classList.remove('spotlight');
        el.querySelector('.badge')?.remove();
      });
      const el = document.getElementById(`track-${t.id}`);
      if (!el) return;
      el.classList.add('spotlight');
      el.prepend(h('span', { class: 'badge' }, '今晚就聽這首'));
      el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    }

    // 隨機挑一首：從目前篩選結果裡挑
    function shuffle() {
      let list = filtered();
      if (!list.length) {
        resetFilters();
        list = filtered();
      }
      if (!list.length) return;
      const current = els.grid.querySelector('.spotlight');
      let pick;
      do {
        pick = list[Math.floor(Math.random() * list.length)];
      } while (list.length > 1 && current && current.id === `track-${pick.id}`);
      spotlight(pick);
      onPick?.(pick);
    }

    els.search.addEventListener('input', (e) => {
      state.query = e.target.value;
      render();
    });
    els.sort.addEventListener('change', (e) => {
      state.sort = e.target.value;
      render();
    });
    els.shuffle?.addEventListener('click', shuffle);

    renderStats();
    renderFilters();
    render();

    return { state, setFilter, spotlight, render };
  }

  // 頁尾：其他車站的連結
  function footerStations(current, base) {
    return h('p', { class: 'footer-stations' },
      '路線：',
      LINES.map((l, i) => [
        i ? '・' : null,
        l.id === current
          ? h('span', { style: `--c:${l.color}`, 'aria-current': 'page' }, l.station)
          : h('a', { href: base + l.path, style: `--c:${l.color}` }, l.station),
      ]),
    );
  }

  window.Groove = {
    ALL,
    LINES,
    TRACKS,
    DECADES,
    YEAR_MIN,
    YEAR_MAX,
    reduceMotion,
    lineById,
    nextLine,
    h,
    seeded,
    decadeOf,
    decadeLabel,
    stationTabs,
    footerStations,
    getStamps,
    addStamp,
    createBoard,
    createCatalog,
  };
})();
