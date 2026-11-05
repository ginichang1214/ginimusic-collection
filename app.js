(() => {
  'use strict';

  const tracks = window.CITY_POP_TRACKS || [];
  const ALL = '全部';
  const MOODS = ['夜晚', '夏日', '都會', '戀愛', '兜風', '派對'];
  // 曲風照資料裡第一次出現的順序排；tracks.js 加了新曲風，按鈕會自動出現
  const GENRES = [...new Set(tracks.map((t) => t.genre || 'City Pop'))];
  const YEAR_MIN = 1960;
  const YEAR_MAX = 2026;
  const DECADES = [];
  for (let d = YEAR_MIN; d <= YEAR_MAX; d += 10) DECADES.push(d);
  const ACCENTS = ['#ff6fa8', '#5fe3e8', '#ffa36b', '#b6a5ff', '#ffd97a', '#7ef0b5'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // key：tracks.js 裡可選填的直接連結欄位；沒填就用搜尋頁
  const LINKS = [
    { name: 'YouTube', key: 'youtube', search: (s) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}` },
    { name: 'Spotify', key: 'spotify', search: (s) => `https://open.spotify.com/search/${encodeURIComponent(s)}` },
    { name: 'Apple Music', key: 'appleMusic', search: (s) => `https://music.apple.com/search?term=${encodeURIComponent(s)}` },
  ];

  const SORTERS = {
    'year-asc': (a, b) => a.year - b.year || a.romaji.localeCompare(b.romaji),
    'year-desc': (a, b) => b.year - a.year || a.romaji.localeCompare(b.romaji),
    artist: (a, b) => a.artistEn.localeCompare(b.artistEn) || a.year - b.year,
  };

  const state = { query: '', genre: ALL, mood: ALL, decade: ALL, sort: 'year-asc' };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    grid: $('#grid'),
    genres: $('#genres'),
    moods: $('#moods'),
    decades: $('#decades'),
    search: $('#search'),
    sort: $('#sort'),
    count: $('#count'),
    empty: $('#empty'),
    stats: $('#stats'),
    shuffle: $('#shuffle'),
    hero: $('#hero'),
    heroArt: $('#hero-art'),
    heroBoard: $('#hero-board'),
  };

  // 建立 DOM 元素的小工具：文字一律用 textContent，不拼 HTML。
  function h(tag, attrs = {}, ...children) {
    const el = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'class') el.className = value;
      else if (key === 'style') el.style.cssText = value;
      else el.setAttribute(key, value);
    }
    for (const child of children.flat()) {
      if (child != null) el.append(child);
    }
    return el;
  }

  const decadeOf = (year) => Math.floor(year / 10) * 10;
  const decadeLabel = (d) => (d < 2000 ? `${String(d).slice(2)} 年代` : `${d} 年代`);
  const same = (a, b) => a.toLowerCase() === b.toLowerCase();
  const hasJapanese = (s) => /[぀-ヿ㐀-鿿]/.test(s);

  // 每首歌固定一個唱片標籤顏色；年份超出範圍時在主控台提醒
  tracks.forEach((t, i) => {
    t.genre = t.genre || 'City Pop';
    t.accent = ACCENTS[i % ACCENTS.length];
    if (t.year < YEAR_MIN || t.year > YEAR_MAX) {
      console.warn(`「${t.title}」的年份 ${t.year} 不在 ${YEAR_MIN}–${YEAR_MAX} 之間，年代篩選會找不到它。`);
    }
  });

  function renderStats() {
    if (!tracks.length) return;
    const artists = new Set(tracks.map((t) => t.artist)).size;
    const decades = new Set(tracks.map((t) => decadeOf(t.year))).size;
    els.stats.replaceChildren(
      h('span', {}, h('b', {}, String(tracks.length)), ' 首名曲'),
      h('span', {}, h('b', {}, String(artists)), ' 位歌手'),
      h('span', {}, h('b', {}, String(decades)), ' 個年代'),
    );
  }

  // 一組篩選按鈕（氛圍或年代），按下後更新 state[key]
  function renderChipGroup(container, key, options) {
    for (const opt of options) {
      const chip = h('button', { type: 'button', class: 'chip', 'data-value': String(opt.value) },
        opt.label,
        opt.count != null ? h('span', { class: 'chip-count' }, String(opt.count)) : null,
      );
      if (opt.count === 0) chip.disabled = true;
      chip.addEventListener('click', () => {
        state[key] = opt.value;
        syncChips();
        render();
      });
      container.append(chip);
    }
  }

  function syncChips() {
    for (const [container, key] of [[els.genres, 'genre'], [els.moods, 'mood'], [els.decades, 'decade']]) {
      for (const chip of container.children) {
        chip.setAttribute('aria-pressed', String(chip.dataset.value === String(state[key])));
      }
    }
    // 車站版的路線圖站牌也跟著年代篩選亮起來
    for (const stop of document.querySelectorAll('.route button')) {
      stop.setAttribute('aria-pressed', String(stop.dataset.value === String(state.decade)));
    }
  }

  function renderChips() {
    renderChipGroup(els.genres, 'genre', [
      { value: ALL, label: ALL },
      ...GENRES.map((g) => ({ value: g, label: g, count: tracks.filter((t) => t.genre === g).length })),
    ]);
    renderChipGroup(els.moods, 'mood', [
      { value: ALL, label: ALL },
      ...MOODS.map((m) => ({ value: m, label: `#${m}` })),
    ]);
    renderChipGroup(els.decades, 'decade', [
      { value: ALL, label: `${YEAR_MIN}–${YEAR_MAX}` },
      ...DECADES.map((d) => ({
        value: d,
        label: decadeLabel(d),
        count: tracks.filter((t) => decadeOf(t.year) === d).length,
      })),
    ]);
    syncChips();
  }

  function card(t) {
    const query = `${t.artist} ${t.title}`;
    return h('li', { class: 'card', id: `track-${t.id}`, tabindex: '-1', style: `--accent:${t.accent}` },
      h('div', { class: 'disc', 'aria-hidden': 'true' }, h('span', { class: 'label' }, String(t.year))),
      h('div', { class: 'info' },
        h('p', { class: 'genre' }, t.genre),
        h('h3', { class: 'title', lang: hasJapanese(t.title) ? 'ja' : 'en' }, t.title),
        same(t.romaji, t.title) ? null : h('p', { class: 'romaji' }, t.romaji),
        h('p', { class: 'artist' },
          h('span', { lang: hasJapanese(t.artist) ? 'ja' : 'en' }, t.artist),
          same(t.artistEn, t.artist) ? null : h('span', { class: 'en' }, ` · ${t.artistEn}`),
        ),
        h('p', { class: 'meta' }, `${t.year} · ${t.album ? `《${t.album}》` : '單曲'}`),
        h('p', { class: 'note' }, t.note),
        h('ul', { class: 'tags', 'aria-label': '氛圍' }, t.moods.map((m) => h('li', {}, `#${m}`))),
      ),
      h('div', { class: 'links' },
        LINKS.map((l) => h('a', {
          href: t[l.key] || l.search(query),
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': t[l.key] ? `在 ${l.name} 收聽〈${t.romaji}〉` : `在 ${l.name} 搜尋〈${t.romaji}〉`,
        }, l.name)),
      ),
    );
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return tracks
      .filter((t) => state.genre === ALL || t.genre === state.genre)
      .filter((t) => state.mood === ALL || t.moods.includes(state.mood))
      .filter((t) => state.decade === ALL || decadeOf(t.year) === state.decade)
      .filter((t) => !q || [t.title, t.romaji, t.artist, t.artistEn, t.album || '', t.genre]
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
    state.genre = ALL;
    state.mood = ALL;
    state.decade = ALL;
    els.search.value = '';
    syncChips();
    render();
  }

  // 隨機挑一首：從目前篩選結果裡挑，挑中的卡片會轉動並標上「今晚就聽這首」
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

    spotlightTrack(pick);
    heroHooks.onPick?.(pick);
  }

  // 讓某首歌的卡片發光、轉唱片並捲過去；被篩選掉的話先清掉篩選
  function spotlightTrack(t) {
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

  // ================================================================
  //  首頁視覺：預設是車站版；迪斯可版先隱藏，網址加 ?hero=disco 才看得到
  // ================================================================
  const params = new URLSearchParams(location.search);
  const HERO_THEME = params.get('hero') === 'disco' ? 'disco' : 'station';
  let heroHooks = {};

  function setupHero() {
    els.hero.classList.remove('hero--disco', 'hero--station');
    els.hero.classList.add(`hero--${HERO_THEME}`);
    document.body.classList.remove('theme-disco', 'theme-station');
    document.body.classList.add(`theme-${HERO_THEME}`);
    heroHooks = HERO_THEME === 'station' ? buildStation() : buildDisco();
  }

  // 固定種子的亂數，讓每次載入的畫面一樣
  function seeded(seed) {
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  }

  // ---------- B 迪斯可舞池：鏡球、光束、閃爍的地板 ----------
  function buildDisco() {
    const rand = seeded(7);
    const colors = ['#ff6fa8', '#ffa36b', '#ffd23f', '#5fe3e8', '#b6a5ff', '#7ef0b5'];
    const floor = h('div', { class: 'disco-floor' });
    for (let i = 0; i < 16 * 7; i++) {
      const c = colors[Math.floor(rand() * colors.length)];
      const still = rand() > 0.45 ? (0.6 + rand() * 0.4).toFixed(2) : '0.16';
      floor.append(h('i', {
        style: `--c:${c};--d:${(1.6 + rand() * 2.4).toFixed(2)}s;--delay:-${(rand() * 4).toFixed(2)}s;--still:${still}`,
      }));
    }
    const sparkles = [[8, 14], [86, 10], [22, 34], [78, 38], [5, 50], [93, 54], [34, 7], [66, 18]]
      .map(([x, y], i) => h('span', { class: 'sparkle', style: `left:${x}%;top:${y}%;animation-delay:-${(i * 0.37).toFixed(2)}s` }));

    els.heroArt.replaceChildren(
      h('div', { class: 'disco-beams' }),
      ...sparkles,
      h('div', { class: 'disco-string' }),
      h('div', { class: 'disco-ball' }),
      h('div', { class: 'disco-floor-wrap' }, floor),
    );
    els.heroBoard.replaceChildren();
    return {};
  }

  // ---------- D 車站翻牌看板：輪播推薦歌曲 + 年代路線圖 ----------
  const FLAP_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const LINE_COLORS = { 'City Pop': '#ff6fa8', Funk: '#ffa36b' };

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

  function buildStation() {
    const flap = (n) => h('span', { class: 'flap' }, Array.from({ length: n }, () => h('b', {}, ' ')));

    const rows = [1, 2, 3, 4].map((n) => {
      const row = h('button', { type: 'button', class: 'board-row' },
        flap(2),
        h('span', { class: 'line-tag' }, h('i'), h('span')),
        h('span', { class: 'year' }, flap(4)),
        flap(1), // 歌名的格數等放進畫面後依寬度決定
      );
      setFlap(row.children[0], String(n).padStart(2, '0'), false);
      row.addEventListener('click', () => row.track && spotlightTrack(row.track));
      return row;
    });

    // 依歌名欄的實際寬度，算出放得下幾格翻牌
    function fitTitles() {
      for (const row of rows) {
        const title = row.children[3];
        const cell = title.firstChild.getBoundingClientRect().width;
        const gap = parseFloat(getComputedStyle(title).columnGap) || 3;
        const n = Math.max(6, Math.floor((title.clientWidth + gap) / (cell + gap)));
        if (title.children.length !== n) {
          title.replaceChildren(...Array.from({ length: n }, () => h('b', {}, ' ')));
        }
      }
    }

    function setRow(row, t, animate) {
      row.track = t;
      const [, tag, year, title] = row.children;
      const color = LINE_COLORS[t.genre] || '#b6a5ff';
      const updateTag = () => {
        tag.style.setProperty('--c', color);
        tag.lastChild.textContent = t.genre.toUpperCase();
        row.style.setProperty('--line', color);
      };
      setFlap(year.firstChild, String(t.year), animate);
      setFlap(title, fitText(flapText(t.romaji), title.children.length), animate);
      // 路線標籤等字母翻完再換，才不會跟看板對不上
      if (animate && !reduceMotion) setTimeout(updateTag, 180 + title.children.length * 45);
      else updateTag();
      row.setAttribute('aria-label', `${t.genre}，${t.year} 年〈${t.title}〉，點一下跳到這首歌`);
    }

    const shown = () => rows.map((r) => r.track);
    const pickNew = (genre) => {
      const pool = tracks.filter((t) => (!genre || t.genre === genre) && !shown().includes(t));
      return pool[Math.floor(Math.random() * pool.length)];
    };

    // 看板要先放進畫面才量得到寬度
    queueMicrotask(() => {
      fitTitles();
      // 先放 City Pop、Funk 各兩首，之後每 7 秒換掉一排
      ['City Pop', 'Funk', 'City Pop', 'Funk'].forEach((g, i) => setRow(rows[i], pickNew(g) || tracks[i], false));
    });
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        fitTitles();
        rows.forEach((r) => r.track && setRow(r, r.track, false));
      }, 200);
    });
    if (!reduceMotion) {
      setInterval(() => {
        if (document.hidden) return;
        const row = rows[Math.floor(Math.random() * rows.length)];
        const next = pickNew();
        if (next) setRow(row, next, true);
      }, 7000);
    }

    const board = h('div', { class: 'board', role: 'group', 'aria-label': '推薦看板：點一排跳到那首歌' },
      h('div', { class: 'board-row board-head', 'aria-hidden': 'true' },
        h('span', {}, '月台'), h('span', {}, '路線'), h('span', {}, '年份'), h('span', {}, '下一首')),
      ...rows,
    );

    // 路線圖：每一站是一個年代，點了就篩選那個年代的歌
    const route = h('ol', { class: 'route', 'aria-label': '年代路線圖：點一站篩選那個年代' },
      DECADES.map((d) => {
        const stop = h('button', { type: 'button', 'data-value': String(d), 'aria-pressed': 'false', 'aria-label': `${decadeLabel(d)}站` },
          `${String(d).slice(2)}s`);
        stop.addEventListener('click', () => {
          state.decade = state.decade === d ? ALL : d;
          syncChips();
          render();
          document.querySelector('.controls').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
        });
        return h('li', {}, stop);
      }),
    );

    // 背景：黑膠唱片像月亮一樣掛在城市夜景後面
    els.heroArt.replaceChildren(buildVinyl());
    els.heroArt.insertAdjacentHTML('beforeend', cityNightSvg());
    els.heroBoard.replaceChildren(board, route);
    return { onPick: (t) => setRow(rows[0], t, true) };
  }

  // 右側慢慢轉的黑膠唱片（反光固定不動，只有唱片在轉）
  function buildVinyl() {
    const label = `
      <svg class="vinyl-label" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <path id="vinyl-arc-top" d="M -72 0 A 72 72 0 0 1 72 0"/>
          <path id="vinyl-arc-bottom" d="M -80 0 A 80 80 0 0 0 80 0"/>
        </defs>
        <circle r="100" fill="#ffd23f"/>
        <rect x="-100" y="-13" width="200" height="11" fill="#ff6fa8"/>
        <rect x="-100" y="2" width="200" height="11" fill="#ffa36b"/>
        <circle r="92" fill="none" stroke="#14161d" stroke-width="1.5" opacity="0.35"/>
        <text class="vinyl-title"><textPath href="#vinyl-arc-top" startOffset="50%">GROOVE STATION</textPath></text>
        <text class="vinyl-sub"><textPath href="#vinyl-arc-bottom" startOffset="50%">CITY POP × FUNK · SIDE A · 33⅓</textPath></text>
        <circle r="5" fill="#0e1016"/>
      </svg>`;
    const disc = h('div', { class: 'vinyl-disc' });
    disc.innerHTML = label;
    return h('div', { class: 'vinyl' }, disc, h('div', { class: 'vinyl-sheen' }));
  }

  // 城市夜景：右邊的大樓比較高，才不會擋到左邊的標題；
  // 但也不能太高，才不會把後面的唱片擋掉太多
  function cityNightSvg() {
    const rand = seeded(23);
    const W = 1600;
    const H = 640;
    const r = (n) => n.toFixed(0);
    let back = '';
    let front = '';
    let wins = '';
    let extras = '';

    for (let x = -20; x < W;) {
      const w = 50 + rand() * 90;
      const hgt = 150 + Math.pow(Math.max(x, 0) / W, 1.8) * 270 + rand() * 50;
      back += `<rect x="${r(x)}" y="${r(H - hgt)}" width="${r(w)}" height="${r(hgt)}"/>`;
      x += w + 4;
    }

    const tall = [];
    for (let x = -10; x < W;) {
      const w = 60 + rand() * 80;
      const hgt = 100 + Math.pow(Math.max(x, 0) / W, 2) * 270 + rand() * 80;
      const y = H - hgt;
      front += `<rect x="${r(x)}" y="${r(y)}" width="${r(w)}" height="${r(hgt)}"/>`;
      for (let wy = y + 14; wy < H - 12; wy += 16) {
        for (let wx = x + 10; wx < x + w - 14; wx += 13) {
          if (rand() > 0.24) continue;
          const o = (0.35 + rand() * 0.6).toFixed(2);
          const twinkle = rand() < 0.05;
          wins += `<rect${twinkle ? ` class="tw" style="--d:${(3 + rand() * 4).toFixed(1)}s;--delay:-${(rand() * 6).toFixed(1)}s"` : ''} x="${r(wx)}" y="${r(wy)}" width="5" height="7" opacity="${o}"/>`;
        }
      }
      if (hgt > 320) tall.push({ x, w, y });
      x += w + 2 + rand() * 6;
    }

    // 高樓頂端的航空警示燈
    for (const b of tall) {
      extras += `<circle class="beacon" cx="${r(b.x + b.w / 2)}" cy="${r(b.y - 6)}" r="3.5" style="--delay:-${(rand() * 2.4).toFixed(1)}s"/>`;
    }
    // 兩塊霓虹招牌：City Pop 粉紅、Funk 橘色
    tall.slice(-3, -1).forEach((b, i) => {
      const c = i ? '#ffa36b' : '#ff6fa8';
      extras += `<rect class="neon" x="${r(b.x + 8)}" y="${r(b.y + 26)}" width="14" height="70" rx="3" stroke="${c}"/>`;
    });

    return `
      <svg class="city" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMax slice" aria-hidden="true">
        <defs>
          <filter id="neon-glow" x="-1" y="-1" width="3" height="3"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
          <linearGradient id="city-front" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a30"/><stop offset="1" stop-color="#0b0e1a"/></linearGradient>
        </defs>
        <g class="city-back">${back}</g>
        <g class="city-front" fill="url(#city-front)">${front}</g>
        <g class="city-windows">${wins}</g>
        <g class="city-extras">${extras}</g>
      </svg>`;
  }

  els.search.addEventListener('input', (e) => {
    state.query = e.target.value;
    render();
  });
  els.sort.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });
  els.shuffle.addEventListener('click', shuffle);

  setupHero();
  renderStats();
  renderChips();
  render();
})();
