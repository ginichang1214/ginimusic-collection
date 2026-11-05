(() => {
  'use strict';

  const tracks = window.CITY_POP_TRACKS || [];
  const ALL = '全部';
  const MOODS = ['夜晚', '夏日', '都會', '戀愛', '兜風'];
  const ACCENTS = ['#ff6fa8', '#5fe3e8', '#ffa36b', '#b6a5ff', '#ffd97a', '#7ef0b5'];
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LINKS = [
    { name: 'YouTube', url: (s) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s)}` },
    { name: 'Spotify', url: (s) => `https://open.spotify.com/search/${encodeURIComponent(s)}` },
    { name: 'Apple Music', url: (s) => `https://music.apple.com/search?term=${encodeURIComponent(s)}` },
  ];

  const SORTERS = {
    'year-asc': (a, b) => a.year - b.year || a.romaji.localeCompare(b.romaji),
    'year-desc': (a, b) => b.year - a.year || a.romaji.localeCompare(b.romaji),
    artist: (a, b) => a.artistEn.localeCompare(b.artistEn) || a.year - b.year,
  };

  const state = { query: '', mood: ALL, sort: 'year-asc' };

  const $ = (sel) => document.querySelector(sel);
  const els = {
    grid: $('#grid'),
    chips: $('#chips'),
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

  // 每首歌固定一個唱片標籤顏色
  tracks.forEach((t, i) => { t.accent = ACCENTS[i % ACCENTS.length]; });

  function renderStats() {
    if (!tracks.length) return;
    const artists = new Set(tracks.map((t) => t.artist)).size;
    const years = tracks.map((t) => t.year);
    els.stats.replaceChildren(
      h('span', {}, h('b', {}, String(tracks.length)), ' 首名曲'),
      h('span', {}, h('b', {}, String(artists)), ' 位歌手'),
      h('span', {}, h('b', {}, `${Math.min(...years)}–${Math.max(...years)}`), ' 年'),
    );
  }

  function syncChips() {
    for (const chip of els.chips.children) {
      chip.setAttribute('aria-pressed', String(chip.dataset.mood === state.mood));
    }
  }

  function renderChips() {
    for (const mood of [ALL, ...MOODS]) {
      const chip = h('button', { type: 'button', class: 'chip', 'data-mood': mood }, mood === ALL ? mood : `#${mood}`);
      chip.addEventListener('click', () => {
        state.mood = mood;
        syncChips();
        render();
      });
      els.chips.append(chip);
    }
    syncChips();
  }

  function card(t) {
    const query = `${t.artist} ${t.title}`;
    return h('li', { class: 'card', id: `track-${t.id}`, tabindex: '-1', style: `--accent:${t.accent}` },
      h('div', { class: 'disc', 'aria-hidden': 'true' }, h('span', { class: 'label' }, String(t.year))),
      h('div', { class: 'info' },
        h('h3', { class: 'title', lang: 'ja' }, t.title),
        t.romaji !== t.title ? h('p', { class: 'romaji' }, t.romaji) : null,
        h('p', { class: 'artist' }, h('span', { lang: 'ja' }, t.artist), h('span', { class: 'en' }, ` · ${t.artistEn}`)),
        h('p', { class: 'meta' }, `${t.year} · ${t.album ? `《${t.album}》` : '單曲'}`),
        h('p', { class: 'note' }, t.note),
        h('ul', { class: 'tags', 'aria-label': '氛圍' }, t.moods.map((m) => h('li', {}, `#${m}`))),
      ),
      h('div', { class: 'links' },
        LINKS.map((l) => h('a', {
          href: l.url(query),
          target: '_blank',
          rel: 'noopener noreferrer',
          'aria-label': `在 ${l.name} 搜尋〈${t.romaji}〉`,
        }, l.name)),
      ),
    );
  }

  function filtered() {
    const q = state.query.trim().toLowerCase();
    return tracks
      .filter((t) => state.mood === ALL || t.moods.includes(state.mood))
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
