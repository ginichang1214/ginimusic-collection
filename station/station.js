// 各車站頁面共用的程式。頁面在 <body data-line="…"> 標明是哪一站，
// 這裡負責：分頁標籤、主視覺背景、本站時刻表（翻牌看板）、到站廣播、曲目清單、頁尾。
// 網址加 ?og 會切成 1200 × 630 的分享預覽圖模式（og/render.sh 用）。
(() => {
  'use strict';

  const G = window.Groove;
  const { h } = G;
  const lineId = document.body.dataset.line;
  const line = G.lineById[lineId];
  const next = G.nextLine(lineId);
  const tracks = G.TRACKS.filter((t) => t.line === lineId);
  const isOg = new URLSearchParams(location.search).has('og');

  // 每站卡片唱片標籤的配色
  const PALETTES = {
    tokyo: ['#ff6fa8', '#5fe3e8', '#ffa36b', '#b6a5ff', '#ffd97a', '#7ef0b5'],
    taipei: ['#4fd8e6', '#ff8fb1', '#ffd97a', '#9be7c4', '#b6a5ff'],
    neworleans: ['#ffa36b', '#ffd23f', '#f0715a', '#5fc9b8', '#f3dcc0'],
    atlanta: ['#a98bff', '#ff6fd8', '#5fe3e8', '#ffd23f', '#7ef0b5'],
  };
  const palette = PALETTES[lineId] || PALETTES.tokyo;
  const genres = [...new Set(tracks.map((t) => t.genre))];
  const genreColor = (g) => palette[genres.indexOf(g) % palette.length];

  // ================================================================
  //  背景
  // ================================================================

  // 城市天際線：遠景一排、近景一排加窗戶（東京站的畫法，其他站換參數）
  function skyline(rand, { W = 1200, H = 230, far = [90, 120], near = [50, 150], antenna = 150 } = {}) {
    const parts = [];
    for (let x = 0; x < W;) {
      const w = 50 + rand() * 80;
      const hgt = far[0] + rand() * far[1];
      parts.push(`<rect class="bld far" x="${x.toFixed(1)}" y="${(H - hgt).toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}"/>`);
      x += w + rand() * 10;
    }
    for (let x = -10; x < W;) {
      const w = 40 + rand() * 70;
      const hgt = near[0] + rand() * near[1];
      const y = H - hgt;
      parts.push(`<rect class="bld" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${hgt.toFixed(1)}"/>`);
      if (hgt > antenna && rand() > 0.4) {
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
    return parts.join('');
  }

  // 台北 101：八節往上開的「竹節」，每節頂端的燈會慢慢換顏色
  function taipei101() {
    let segs = '';
    for (let i = 0; i < 8; i++) {
      const y = 220 + i * 58;
      segs += `<polygon class="seg" points="41,${y} 159,${y} 146,${y + 58} 54,${y + 58}"/>`;
      segs += `<rect class="lit" x="41" y="${y}" width="118" height="3.5" style="animation-delay:-${(i * 0.6).toFixed(1)}s"/>`;
      segs += `<rect class="glass" x="62" y="${y + 12}" width="76" height="2"/><rect class="glass" x="64" y="${y + 30}" width="72" height="2"/>`;
    }
    return `
      <svg class="t101" viewBox="0 0 200 1000" aria-hidden="true">
        <defs>
          <linearGradient id="t101-seg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#29436f"/><stop offset="1" stop-color="#14254a"/></linearGradient>
          <linearGradient id="t101-base" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3360"/><stop offset="1" stop-color="#0d1a36"/></linearGradient>
          <filter id="t101-glow" x="-0.2" y="-3" width="1.4" height="7"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        </defs>
        <rect class="spire" x="98.5" y="0" width="3" height="112"/>
        <rect class="crown" x="92" y="110" width="16" height="32"/>
        <rect class="crown" x="86" y="140" width="28" height="40"/>
        <polygon class="crown" points="78,180 122,180 118,220 82,220"/>
        <rect class="lit" x="78" y="178" width="44" height="3" />
        ${segs}
        <circle class="lit" cx="100" cy="700" r="9"/>
        <polygon fill="url(#t101-base)" points="58,684 142,684 162,1000 38,1000"/>
        <rect class="glass" x="70" y="740" width="60" height="2"/><rect class="glass" x="66" y="800" width="68" height="2"/><rect class="glass" x="62" y="860" width="76" height="2"/>
      </svg>`;
  }

  // 亞特蘭大：黃金時刻的街景。遠方是亞特蘭大天際線（Bank of America Plaza 的尖塔），
  // 近處是棕櫚樹和電線桿的剪影
  function goldenHourScene() {
    const r1 = (n) => n.toFixed(1);
    const leaf = (tx, ty, ang, len) => {
      const a = (ang * Math.PI) / 180;
      const ex = tx + Math.cos(a) * len;
      const ey = ty + Math.sin(a) * len + len * 0.35; // 葉尖往下垂
      const mx = (tx + ex) / 2;
      const my = (ty + ey) / 2 - len * 0.22;
      const nx = -Math.sin(a) * 10;
      const ny = Math.cos(a) * 10;
      return `<path d="M${r1(tx)} ${r1(ty)} Q${r1(mx + nx)} ${r1(my + ny)} ${r1(ex)} ${r1(ey)} Q${r1(mx - nx)} ${r1(my - ny)} ${r1(tx)} ${r1(ty)}Z"/>`;
    };
    const palm = (x, hgt, lean, i) => {
      const tx = x + lean;
      const ty = 760 - hgt;
      const len = 70 + hgt * 0.12;
      const leaves = [-168, -140, -112, -80, -52, -24, 4, 176].map((a) => leaf(tx, ty, a, len * (0.85 + ((a + 200) % 3) * 0.08))).join('');
      return `
        <path d="M${x - 9} 760 Q${r1(x - 4 + lean * 0.35)} ${r1(760 - hgt / 2)} ${r1(tx - 4)} ${ty} L${r1(tx + 4)} ${ty} Q${r1(x + 4 + lean * 0.35)} ${r1(760 - hgt / 2)} ${x + 9} 760 Z"/>
        <g class="fronds" style="animation-delay:-${(i * 0.9).toFixed(1)}s">${leaves}<circle cx="${tx}" cy="${ty}" r="9"/></g>`;
    };
    const palms = [[110, 520, -30], [235, 420, 22], [395, 340, -14], [1020, 380, 24], [1185, 540, -22], [1330, 430, 30], [1490, 520, -26]]
      .map(([x, hgt, lean], i) => palm(x, hgt, lean, i)).join('');
    // 手機只看得到畫面中間，另外補兩棵只在手機上出現的棕櫚樹
    const mobilePalms = [[612, 470, -16], [992, 420, 18]].map(([x, hgt, lean], i) => palm(x, hgt, lean, i + 7)).join('');
    // 電線桿和垂下來的電線
    const pole = (x, top) => `
      <rect x="${x - 5}" y="${top}" width="10" height="${760 - top}"/>
      <rect x="${x - 60}" y="${top + 26}" width="120" height="7"/>
      <rect x="${x - 44}" y="${top + 56}" width="88" height="6"/>`;
    const wires = [0, 1, 2].map((k) => {
      const y1 = 286 + k * 10;
      const y2 = 362 + k * 10;
      return `<path d="M-20 ${y2 + 30} Q140 ${y2 + 60} 300 ${y2}"/><path d="M300 ${y2} Q780 ${y2 + 90} 1250 ${y1}"/><path d="M1250 ${y1} Q1440 ${y1 + 50} 1620 ${y1 + 20}"/>`;
    }).join('');
    // 遠方的亞特蘭大天際線（霧霧的）
    const skyline = `
      <rect x="470" y="690" width="60" height="70"/><rect x="540" y="660" width="48" height="100"/>
      <rect x="612" y="606" width="34" height="154" rx="4"/><rect x="608" y="620" width="42" height="8" rx="3"/>
      <rect x="660" y="672" width="56" height="88"/>
      <rect x="738" y="566" width="44" height="194"/><polygon points="738,566 782,566 770,532 750,532"/><rect x="759" y="494" width="2.5" height="40"/>
      <rect x="796" y="640" width="52" height="120"/>
      <rect x="862" y="604" width="36" height="156"/><polygon points="862,604 898,604 880,578"/>
      <rect x="912" y="680" width="70" height="80"/><rect x="990" y="700" width="50" height="60"/>`;
    return `
      <svg class="gh-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs>
          <linearGradient id="gh-road" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4630"/><stop offset="0.18" stop-color="#3a271e"/><stop offset="1" stop-color="#15100e"/></linearGradient>
        </defs>
        <g class="gh-city">${skyline}</g>
        <rect x="0" y="758" width="1600" height="142" fill="url(#gh-road)"/>
        <g class="gh-wires">${wires}</g>
        <g class="gh-silhouette">${pole(300, 330)}${pole(1250, 250)}${palms}<g class="palms-mobile">${mobilePalms}</g></g>
      </svg>`;
  }

  // 前景的 lowrider（跳跳車）：前輪一直彈起來，像街頭車展的油壓表演
  function lowrider() {
    const wheel = (cx) => {
      let spokes = '';
      for (let a = 0; a < 180; a += 12) {
        const rad = (a * Math.PI) / 180;
        spokes += `<line x1="${(cx + Math.cos(rad) * 22).toFixed(1)}" y1="${(150 + Math.sin(rad) * 22).toFixed(1)}" x2="${(cx - Math.cos(rad) * 22).toFixed(1)}" y2="${(150 - Math.sin(rad) * 22).toFixed(1)}"/>`;
      }
      return `<circle cx="${cx}" cy="150" r="34" fill="#0d0b0b"/><circle cx="${cx}" cy="150" r="24" fill="#dfe3ea"/>
        <g stroke="#8d93a3" stroke-width="1.2">${spokes}</g><circle cx="${cx}" cy="150" r="7" fill="#f6f8fb" stroke="#8d93a3"/>`;
    };
    return `
      <svg class="lowrider" viewBox="0 0 600 200" aria-hidden="true">
        <defs>
          <linearGradient id="lr-paint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9a8cff"/><stop offset="0.32" stop-color="#4c48e6"/><stop offset="1" stop-color="#1d1872"/></linearGradient>
          <linearGradient id="lr-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd690"/><stop offset="1" stop-color="#4b2f63"/></linearGradient>
        </defs>
        <ellipse class="lr-shadow" cx="310" cy="186" rx="280" ry="10"/>
        <g class="lr-body">
          <path fill="url(#lr-paint)" d="M18 152 L18 114 Q20 101 38 99 L160 92 L206 52 Q216 41 236 41 L352 41 Q370 41 384 53 L432 92 L562 101 Q582 103 584 118 L584 152 Z"/>
          <path fill="url(#lr-glass)" d="M214 54 L292 54 L292 89 L176 91 Z"/>
          <path fill="url(#lr-glass)" d="M300 54 L356 54 Q368 54 376 62 L404 89 L300 89 Z"/>
          <path d="M32 121 H572" stroke="#f1f3f8" stroke-width="3"/>
          <path d="M236 44 H350" stroke="#c9c3ff" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
          <rect x="8" y="130" width="24" height="14" rx="4" fill="#e9ecf2"/>
          <rect x="572" y="128" width="24" height="16" rx="4" fill="#e9ecf2"/>
          <rect x="575" y="107" width="12" height="11" rx="2" fill="#fff3b8"/>
          <rect x="19" y="105" width="10" height="9" rx="2" fill="#ff5a4a"/>
          <path d="M108 152 A42 42 0 0 1 192 152 Z" fill="#120c22"/>
          <path d="M428 152 A42 42 0 0 1 512 152 Z" fill="#120c22"/>
          ${wheel(150)}${wheel(470)}
        </g>
      </svg>`;
  }

  const ART = {
    // 東京：黃昏的海灣、條紋夕陽和天際線
    tokyo(art) {
      art.append(h('div', { class: 'stars' }), h('div', { class: 'glow' }), h('div', { class: 'sun' }));
      art.insertAdjacentHTML('beforeend',
        `<svg class="skyline" viewBox="0 0 1200 230" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${skyline(G.seeded(11))}</svg>`);
      art.append(h('div', { class: 'water' }));
    },

    // 台北：藍色時刻的天空、遠山、101 和開過高架的捷運
    taipei(art) {
      art.append(h('div', { class: 'stars' }));
      art.insertAdjacentHTML('beforeend', `
        <svg class="tp-hills" viewBox="0 0 1200 300" preserveAspectRatio="none" aria-hidden="true">
          <path class="far" d="M0 300 L0 170 C 120 120, 220 110, 320 150 S 520 90, 640 140 S 860 70, 980 130 S 1130 120, 1200 140 L1200 300 Z"/>
          <path class="near" d="M0 300 L0 225 C 160 185, 300 200, 420 215 S 700 172, 820 200 S 1060 180, 1200 208 L1200 300 Z"/>
        </svg>`);
      art.insertAdjacentHTML('beforeend', taipei101());
      art.insertAdjacentHTML('beforeend',
        `<svg class="tp-city" viewBox="0 0 1200 200" preserveAspectRatio="xMidYMax slice" aria-hidden="true">${skyline(G.seeded(31), { H: 200, far: [60, 90], near: [40, 110], antenna: 120 })}</svg>`);
      art.append(h('div', { class: 'mrt' }, h('div', { class: 'mrt-train' })));
    },

    // 新奧爾良：70 年代放克海報的圓點直條，慢慢上下滑動；底下是法國區的鐵欄杆陽台
    neworleans(art) {
      const COLORS = ['#6e1d36', '#a8323a', '#d95f2e', '#eea23f', '#f4dcb4'];
      const cols = h('div', { class: 'funk-cols' });
      for (let c = 0; c < 24; c++) {
        const col = h('div', { class: c % 2 ? 'funk-col up' : 'funk-col' });
        for (let i = 0; i < 22; i++) col.append(h('i', { style: `background:${COLORS[(i + c) % COLORS.length]}` }));
        cols.append(col);
      }
      art.append(cols, h('div', { class: 'funk-shade' }));
      art.insertAdjacentHTML('beforeend', `
        <svg class="nola-balcony" aria-hidden="true">
          <defs>
            <pattern id="rail" width="64" height="96" patternUnits="userSpaceOnUse">
              <rect x="0" y="0" width="64" height="9"/>
              <rect x="0" y="62" width="64" height="5"/>
              <rect x="0" y="86" width="64" height="10"/>
              <rect x="0" y="0" width="7" height="96"/>
              <rect x="20" y="9" width="3" height="80"/><rect x="41" y="9" width="3" height="80"/>
              <circle cx="32" cy="36" r="10" fill="none" stroke-width="3"/>
              <circle cx="32" cy="36" r="3"/>
              <path d="M10 62 Q 21 44 32 62 Q 43 44 54 62" fill="none" stroke-width="3"/>
            </pattern>
          </defs>
          <rect width="100%" height="96" fill="url(#rail)"/>
        </svg>`);
    },

    // 亞特蘭大：黃金時刻的街頭，棕櫚樹、電線桿、遠方天際線，加上一台一直跳的 lowrider
    atlanta(art) {
      art.insertAdjacentHTML('beforeend', goldenHourScene());
      art.insertAdjacentHTML('beforeend', lowrider());
    },
  };

  // ================================================================
  //  組裝頁面
  // ================================================================
  if (isOg) document.body.classList.add('og');
  else G.addStamp(lineId); // 集章：到過這站了

  document.querySelector('.hero').prepend(G.stationTabs(lineId, '../'));
  ART[lineId]?.(document.getElementById('hero-art'));

  let catalog;
  const board = G.createBoard({
    title: `${line.station} ${line.city} · 出發時刻表`,
    rows: [1, 2, 3].map((n) => ({ platform: n, pool: tracks })),
    tagLabel: '曲風',
    tagOf: (t) => t.genre,
    colorOf: (t) => genreColor(t.genre),
    onSelect: (t) => catalog.spotlight(t),
    interval: 6000,
  });

  // 到站廣播：跑馬燈
  const announce = `歡迎搭乘 ${line.name}　本站是 ${line.station} ${line.city}　共有 ${tracks.length} 首歌在月台等你，點時刻表上的歌就會帶你過去　下一站：${next.station} ${next.city}　請在月台黃線後候車 ♪`;
  const marquee = h('div', { class: 'marquee', 'aria-hidden': 'true' },
    h('div', { class: 'marquee-track' }, h('span', {}, announce), h('span', {}, announce)));

  const nextStop = h('a', { class: 'next-stop', href: `../${next.path}`, style: `--c:${next.color}` },
    h('span', { class: 'next-label' }, '下一站'),
    h('b', {}, next.tab),
    h('span', { 'aria-hidden': 'true' }, '→'));

  const timetable = document.getElementById('timetable');
  timetable.append(h('div', { class: 'timetable-inner' }, marquee, board.el, nextStop));
  board.start();

  catalog = G.createCatalog({
    tracks,
    groups: ['genre', 'mood', 'decade'],
    accentOf: (t, i) => palette[i % palette.length],
    onPick: (t) => board.show(t),
  });

  document.getElementById('footer').append(
    G.footerStations(lineId, '../'),
    h('p', {}, '回到 ', h('a', { href: '../' }, 'GROOVE STATION 首頁'), '，看四條路線的介紹。'),
  );
})();
