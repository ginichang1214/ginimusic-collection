(() => {
  'use strict';

  const tracks = window.CITY_POP_TRACKS || [];
  const ALL = '全部';
  const MOODS = ['夜晚', '夏日', '都會', '戀愛', '兜風'];
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

  const state = { query: '', mood: ALL, decade: ALL, sort: 'year-asc' };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    grid: $('#grid'),
    moods: $('#moods'),
    decades: $('#decades'),
    search: $('#search'),
    sort: $('#sort'),
    count: $('#count'),
    empty: $('#empty'),
    stats: $('#stats'),
    shuffle: $('#shuffle'),
    skyline: $('#skyline'),
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

  // 每首歌固定一個唱片標籤顏色；年份超出範圍時在主控台提醒
  tracks.forEach((t, i) => {
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
    for (const [container, key] of [[els.moods, 'mood'], [els.decades, 'decade']]) {
      for (const chip of container.children) {
        chip.setAttribute('aria-pressed', String(chip.dataset.value === String(state[key])));
      }
    }
  }

  function renderChips() {
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
        h('h3', { class: 'title', lang: 'ja' }, t.title),
        same(t.romaji, t.title) ? null : h('p', { class: 'romaji' }, t.romaji),
        h('p', { class: 'artist' },
          h('span', { lang: 'ja' }, t.artist),
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
      .filter((t) => state.mood === ALL || t.moods.includes(state.mood))
      .filter((t) => state.decade === ALL || decadeOf(t.year) === state.decade)
      .filter((t) => !q || [t.title, t.romaji, t.artist, t.artistEn, t.album || '']
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

    els.grid.querySelectorAll('.spotlight').forEach((el) => {
      el.classList.remove('spotlight');
      el.querySelector('.badge')?.remove();
    });

    const el = document.getElementById(`track-${pick.id}`);
    el.classList.add('spotlight');
    el.prepend(h('span', { class: 'badge' }, '今晚就聽這首'));
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    el.focus({ preventScroll: true });
  }

  // 用固定亂數種子畫城市天際線，每次載入長得一樣
  function drawSkyline() {
    const W = 1200;
    const H = 230;
    let seed = 11;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    const parts = [];

    // 遠景
    for (let x = 0; x < W;) {
      const w = 50 + rand() * 80;
      const hgt = 90 + rand() * 120;
      parts.push(`<rect class="bld far" x="${x.toFixed(1)}" y="${(H - hgt).toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}"/>`);
      x += w + rand() * 10;
    }

    // 近景與窗戶
    for (let x = -10; x < W;) {
      const w = 40 + rand() * 70;
      const hgt = 50 + rand() * 150;
      const y = H - hgt;
      parts.push(`<rect class="bld" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}"/>`);
      if (hgt > 150 && rand() > 0.4) {
        parts.push(`<rect class="bld" x="${(x + w / 2 - 1).toFixed(1)}" y="${(y - 22).toFixed(1)}" width="2" height="22"/>`);
      }
      for (let wy = y + 12; wy < H - 10; wy += 15) {
        for (let wx = x + 8; wx < x + w - 10; wx += 11) {
          if (rand() > 0.64) {
            parts.push(`<rect class="win${rand() > 0.7 ? ' c' : ''}" x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="4" height="6"/>`);
          }
        }
      }
      x += w + 2 + rand() * 6;
    }

    els.skyline.innerHTML = parts.join('');
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

  drawSkyline();
  renderStats();
  renderChips();
  render();
})();
