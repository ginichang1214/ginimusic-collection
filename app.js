// GROOVE STATION 首頁：四條路線的總站。
// 主視覺（車站分頁、翻牌看板、年代路線圖、黑膠唱片和城市夜景）、路線導覽車票、全部曲目清單。
(() => {
  'use strict';

  const G = window.Groove;
  const { h, lineById, reduceMotion } = G;
  const tracks = G.TRACKS.filter((t) => lineById[t.line]);
  const $ = (sel) => document.querySelector(sel);
  const els = {
    hero: $('#hero'),
    heroArt: $('#hero-art'),
    heroBoard: $('#hero-board'),
    guide: $('#lines-guide'),
    footer: $('#footer'),
  };

  // 首頁視覺：預設是車站版；迪斯可版先隱藏，網址加 ?hero=disco 才看得到
  const HERO_THEME = new URLSearchParams(location.search).get('hero') === 'disco' ? 'disco' : 'station';
  let heroHooks = {};

  const catalog = G.createCatalog({
    tracks,
    groups: ['line', 'mood', 'decade'],
    accentOf: (t) => lineById[t.line].color,
    showLine: true,
    onPick: (t) => heroHooks.onPick?.(t),
    onFilter: (state) => {
      // 路線圖的站牌跟著年代篩選亮起來
      for (const stop of document.querySelectorAll('.route button')) {
        stop.setAttribute('aria-pressed', String(stop.dataset.value === String(state.decade)));
      }
    },
  });

  // ================================================================
  //  主視覺
  // ================================================================
  function setupHero() {
    els.hero.classList.remove('hero--disco', 'hero--station');
    els.hero.classList.add(`hero--${HERO_THEME}`);
    document.body.classList.remove('theme-disco', 'theme-station');
    document.body.classList.add(`theme-${HERO_THEME}`);
    els.hero.prepend(G.stationTabs('home', ''));
    heroHooks = HERO_THEME === 'station' ? buildStation() : buildDisco();
  }

  // ---------- 迪斯可舞池（隱藏版）：鏡球、光束、閃爍的地板 ----------
  function buildDisco() {
    const rand = G.seeded(7);
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

  // ---------- 車站版：四個月台的翻牌看板 + 年代路線圖 ----------
  function buildStation() {
    // 一條路線一個月台，每排輪流翻出那條路線的歌
    const board = G.createBoard({
      title: 'GROOVE STATION 出發時刻表 · DEPARTURES',
      rows: G.LINES.map((l) => ({ platform: l.no, pool: tracks.filter((t) => t.line === l.id) })),
      tagLabel: '開往',
      tagOf: (t) => lineById[t.line].station,
      colorOf: (t) => lineById[t.line].color,
      onSelect: (t) => catalog.spotlight(t),
      interval: 4500,
      riders: goatCounterTotal,
    });

    // 路線圖：四條路線並行，每一站是一個年代，點了就篩選那個年代的歌
    const route = h('div', { class: 'route-wrap' },
      h('div', { class: 'route-lines', 'aria-hidden': 'true' }, G.LINES.map((l) => h('i', { style: `background:${l.color}` }))),
      h('ol', { class: 'route', 'aria-label': '年代路線圖：點一站篩選那個年代' },
        G.DECADES.map((d) => {
          const stop = h('button', { type: 'button', 'data-value': String(d), 'aria-pressed': 'false', 'aria-label': `${G.decadeLabel(d)}站` },
            `${String(d).slice(2)}s`);
          stop.addEventListener('click', () => {
            catalog.setFilter('decade', catalog.state.decade === d ? G.ALL : d);
            $('.controls').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
          });
          return h('li', {}, stop);
        })),
    );

    // 背景：黑膠唱片像月亮一樣掛在城市夜景後面
    els.heroArt.replaceChildren(buildVinyl());
    els.heroArt.insertAdjacentHTML('beforeend', cityNightSvg());
    els.heroBoard.replaceChildren(board.el, route);
    board.start();
    return { onPick: (t) => board.show(t) };
  }

  // 累計旅客：讀 GoatCounter 公開的全站累計人數
  // （要在 GoatCounter 的設定裡打開「Allow adding visitor counts on your website」才讀得到）
  async function goatCounterTotal() {
    const res = await fetch('https://ginichang.goatcounter.com/counter/TOTAL.json');
    if (!res.ok) throw new Error(`GoatCounter ${res.status}`);
    const data = await res.json();
    return parseInt(String(data.count).replace(/[^0-9]/g, ''), 10);
  }

  // 右側慢慢轉的黑膠唱片（反光固定不動，只有唱片在轉）；標籤上四條線是四條路線的顏色
  function buildVinyl() {
    const stripes = G.LINES.map((l, i) => `<rect x="-100" y="${-13 + i * 6.5}" width="200" height="5.5" fill="${l.color}"/>`).join('');
    const disc = h('div', { class: 'vinyl-disc' });
    disc.innerHTML = `
      <svg class="vinyl-label" viewBox="-100 -100 200 200" aria-hidden="true">
        <defs>
          <path id="vinyl-arc-top" d="M -72 0 A 72 72 0 0 1 72 0"/>
          <path id="vinyl-arc-bottom" d="M -80 0 A 80 80 0 0 0 80 0"/>
        </defs>
        <circle r="100" fill="#ffd23f"/>
        ${stripes}
        <circle r="92" fill="none" stroke="#14161d" stroke-width="1.5" opacity="0.35"/>
        <text class="vinyl-title"><textPath href="#vinyl-arc-top" startOffset="50%">GROOVE STATION</textPath></text>
        <text class="vinyl-sub"><textPath href="#vinyl-arc-bottom" startOffset="50%">${G.LINES.length} LINES · SIDE A · 33⅓</textPath></text>
        <circle r="5" fill="#0e1016"/>
      </svg>`;
    return h('div', { class: 'vinyl' }, disc, h('div', { class: 'vinyl-sheen' }));
  }

  // 城市夜景：右邊的大樓比較高，才不會擋到左邊的標題；
  // 但也不能太高，才不會把後面的唱片擋掉太多
  function cityNightSvg() {
    const rand = G.seeded(23);
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
      if (hgt > 300) tall.push({ x, w, y });
      x += w + 2 + rand() * 6;
    }

    // 高樓頂端的航空警示燈
    for (const b of tall) {
      extras += `<circle class="beacon" cx="${r(b.x + b.w / 2)}" cy="${r(b.y - 6)}" r="3.5" style="--delay:-${(rand() * 2.4).toFixed(1)}s"/>`;
    }
    // 霓虹招牌：四條路線的顏色
    tall.slice(-(G.LINES.length + 1), -1).forEach((b, i) => {
      extras += `<rect class="neon" x="${r(b.x + 8)}" y="${r(b.y + 26)}" width="14" height="70" rx="3" stroke="${G.LINES[i % G.LINES.length].color}"/>`;
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

  // ================================================================
  //  路線導覽：每條路線一張車票，去過的車站會蓋上「已到站」
  // ================================================================
  function picksOf(line, list) {
    const byId = line.picks.map((id) => list.find((t) => t.id === id)).filter(Boolean);
    if (byId.length) return byId;
    // 沒指定代表曲時，挑最早、中間、最新各一首
    const sorted = [...list].sort((a, b) => a.year - b.year);
    return [...new Set([sorted[0], sorted[Math.floor(sorted.length / 2)], sorted[sorted.length - 1]])].filter(Boolean);
  }

  function renderGuide() {
    const stamps = G.getStamps();
    const visited = G.LINES.filter((l) => stamps[l.id]).length;
    const done = visited === G.LINES.length;

    const tickets = G.LINES.map((l) => {
      const list = tracks.filter((t) => t.line === l.id);
      const years = list.map((t) => t.year);
      return h('li', { class: 'ticket', style: `--c:${l.color}` },
        h('div', { class: 'ticket-stub', 'aria-hidden': 'true' },
          h('span', { class: 'ticket-code' }, l.code),
          h('span', { class: 'ticket-no' }, `LINE ${l.no}`)),
        h('div', { class: 'ticket-body' },
          h('p', { class: 'ticket-line' }, `${l.name} · ${l.genres}`),
          h('h3', {}, l.station, h('small', {}, l.city)),
          h('p', { class: 'ticket-story' }, l.story),
          list.length ? h('p', { class: 'ticket-picks' },
            h('span', {}, '代表曲'),
            picksOf(l, list).map((t, i) => [i ? ' · ' : null, h('b', {}, t.title)])) : null,
          h('div', { class: 'ticket-foot' },
            h('span', { class: 'ticket-meta' },
              list.length ? `${list.length} 首 · ${Math.min(...years)}–${Math.max(...years)}` : '即將開通'),
            h('a', { class: 'ticket-go', href: l.path }, `搭乘前往${l.station} →`)),
        ),
        stamps[l.id]
          ? h('span', { class: 'stamp', title: `${stamps[l.id]} 到過${l.station}` }, '已到站', h('small', {}, stamps[l.id].replaceAll('-', '.')))
          : null,
      );
    });

    els.guide.replaceChildren(
      h('div', { class: 'guide-head' },
        h('div', {},
          h('h2', { id: 'guide-title' }, h('small', {}, `${G.LINES.length} LINES · ${G.LINES.length} STATIONS`), '路線導覽'),
          h('p', { class: 'guide-lead' }, '每條路線是一座城市的律動。挑一站下車，聽聽那裡的故事。')),
        h('p', { class: 'stamp-card' },
          h('span', { class: 'stamp-dots', 'aria-hidden': 'true' },
            G.LINES.map((l) => h('i', { class: stamps[l.id] ? 'on' : null, style: `--c:${l.color}` }))),
          done ? '四站集章完成，全線制霸！' : `集章 ${visited} / ${G.LINES.length}：到過的車站會在車票上蓋章`),
      ),
      h('ul', { class: 'tickets' }, tickets),
    );
  }

  setupHero();
  renderGuide();
  els.footer.append(G.footerStations('home', ''));
})();
