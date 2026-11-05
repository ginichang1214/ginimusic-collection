// 首頁背景音樂〈Last Train Groove 末班車〉：本站原創，用 Web Audio 在瀏覽器裡即時合成，不需要音檔。
// 100 BPM 的 City Pop／放克律動：電鋼琴和弦、放克貝斯、鼓組，每隔一輪加一段主旋律，底下有一點黑膠沙沙聲。
// 瀏覽器不允許網頁自己發出聲音，所以要等訪客按右下角的按鈕才開始播放。
(() => {
  'use strict';

  const TITLE = 'Last Train Groove 末班車';
  const BPM = 100;
  const STEP = 60 / BPM / 4; // 一個十六分音符
  const SWING = 0.12; // 反拍十六分音符往後拖一點，比較有律動
  const LOOKAHEAD = 0.15; // 預先排程的秒數

  const midi = (n) => 440 * 2 ** ((n - 69) / 12);

  // 8 小節循環（F 大調）：IV – iii – ii – V 的城市流行進行
  // root：貝斯根音（MIDI），chord：電鋼琴和弦音
  const BARS = [
    { root: 46, chord: [57, 62, 65, 69] },           // B♭maj9
    { root: 45, chord: [55, 60, 64, 67] },           // Am7
    { root: 43, chord: [53, 57, 62, 65] },           // Gm9
    { root: 48, chord: [55, 58, 62, 65] },           // C9sus4
    { root: 46, chord: [57, 62, 65, 69] },           // B♭maj9
    { root: 45, chord: [55, 60, 64, 67], turn: 50 }, // Am7 → D7（第 3 拍換）
    { root: 43, chord: [53, 57, 62, 65] },           // Gm9
    { root: 48, chord: [52, 58, 62, 64], end: true },// C7
  ];
  const D7 = [54, 57, 60, 64];

  // 電鋼琴的切分節奏（第幾個十六分音符、長度）
  const COMP = [[0, 3], [6, 2], [10, 1], [14, 2]];
  const COMP_B = [[0, 2], [3, 2], [8, 3], [11, 1], [14, 1]];
  // 貝斯：[第幾格, 相對根音的半音, 長度]
  const BASS = [[0, 0, 3], [3, 12, 1], [6, 7, 2], [8, 0, 2], [10, 10, 1], [11, 12, 1], [14, 7, 2]];
  // 主旋律（第 5–8 小節，每隔一輪出現）：[小節, 格, MIDI, 長度]
  const LEAD = [
    [4, 0, 72, 4], [4, 6, 74, 2], [4, 8, 77, 5],
    [5, 0, 76, 3], [5, 4, 72, 2], [5, 8, 69, 6],
    [6, 0, 70, 2], [6, 4, 74, 2], [6, 6, 77, 2], [6, 8, 79, 5],
    [7, 0, 76, 6], [7, 8, 72, 7],
  ];

  let ctx = null;
  let master = null;
  let buses = null;
  let noise = null;
  let timer = null;
  let nextTime = 0;
  let step = 0;
  let playing = false;
  let resumeOnShow = false;

  function setup() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 9000;
    master.connect(comp).connect(tone).connect(ctx.destination);

    // 電鋼琴加一點顫音（tremolo）
    const keys = ctx.createGain();
    keys.gain.value = 0.8;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 4.6;
    lfoDepth.gain.value = 0.18;
    lfo.connect(lfoDepth).connect(keys.gain);
    lfo.start();
    keys.connect(master);

    const bus = (v) => {
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(master);
      return g;
    };
    buses = { keys, bass: bus(0.75), drums: bus(0.7), lead: bus(0.5) };

    // 白噪音（小鼓、Hi-hat、黑膠沙沙聲共用）
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    // 黑膠沙沙聲
    const crackle = ctx.createBufferSource();
    crackle.buffer = noise;
    crackle.loop = true;
    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'bandpass';
    crackleFilter.frequency.value = 2400;
    crackleFilter.Q.value = 0.7;
    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.012;
    crackle.connect(crackleFilter).connect(crackleGain).connect(master);
    crackle.start();
  }

  // ---------- 樂器 ----------
  function epiano(note, t, len) {
    const f = midi(note);
    const car = ctx.createOscillator();
    const mod = ctx.createOscillator();
    const modGain = ctx.createGain();
    const amp = ctx.createGain();
    car.type = 'sine';
    mod.type = 'sine';
    car.frequency.value = f;
    mod.frequency.value = f;
    // 敲下去的瞬間金屬感比較重，之後變圓潤：像 Rhodes 電鋼琴
    modGain.gain.setValueAtTime(f * 1.4, t);
    modGain.gain.exponentialRampToValueAtTime(f * 0.12, t + 0.35);
    mod.connect(modGain).connect(car.frequency);
    // 音量包絡：快速敲下 → 慢慢衰減（按得越久衰減越多，最多到 0.03）→ 放開後收掉
    const hold = Math.max(len, 0.05);
    const sustain = 0.07 * (0.03 / 0.07) ** (Math.min(hold, 0.5) / 0.5);
    const end = t + hold + 0.25;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
    amp.gain.exponentialRampToValueAtTime(sustain, t + hold);
    amp.gain.exponentialRampToValueAtTime(0.0001, end);
    car.connect(amp).connect(buses.keys);
    car.start(t);
    mod.start(t);
    car.stop(end + 0.05);
    mod.stop(end + 0.05);
  }

  function bass(note, t, len) {
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = midi(note);
    filter.type = 'lowpass';
    filter.Q.value = 7;
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(260, t + 0.18);
    const end = t + len * 0.9;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.32, t + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.18, t + 0.12);
    amp.gain.setValueAtTime(0.18, end);
    amp.gain.exponentialRampToValueAtTime(0.0001, end + 0.06);
    osc.connect(filter).connect(amp).connect(buses.bass);
    osc.start(t);
    osc.stop(end + 0.1);
  }

  function lead(note, t, len) {
    const osc = ctx.createOscillator();
    const vib = ctx.createOscillator();
    const vibDepth = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = midi(note);
    vib.frequency.value = 5.5;
    vibDepth.gain.setValueAtTime(0, t);
    vibDepth.gain.linearRampToValueAtTime(midi(note) * 0.006, t + 0.3);
    vib.connect(vibDepth).connect(osc.frequency);
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    const end = t + len;
    amp.gain.setValueAtTime(0.0001, t);
    amp.gain.exponentialRampToValueAtTime(0.05, t + 0.03);
    amp.gain.setValueAtTime(0.05, end - 0.05);
    amp.gain.exponentialRampToValueAtTime(0.0001, end + 0.12);
    osc.connect(filter).connect(amp).connect(buses.lead);
    osc.start(t);
    vib.start(t);
    osc.stop(end + 0.15);
    vib.stop(end + 0.15);
  }

  function kick(t) {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    amp.gain.setValueAtTime(0.9, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(amp).connect(buses.drums);
    osc.start(t);
    osc.stop(t + 0.4);
  }

  function noiseHit(t, { type, freq, q = 1, gain, decay }) {
    const src = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const amp = ctx.createGain();
    src.buffer = noise;
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(filter).connect(amp).connect(buses.drums);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  }

  function snare(t) {
    noiseHit(t, { type: 'bandpass', freq: 1900, q: 0.8, gain: 0.45, decay: 0.18 });
    const body = ctx.createOscillator();
    const amp = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(200, t);
    body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
    amp.gain.setValueAtTime(0.25, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    body.connect(amp).connect(buses.drums);
    body.start(t);
    body.stop(t + 0.12);
  }

  const hat = (t, open, accent) => noiseHit(t, { type: 'highpass', freq: 7500, gain: accent ? 0.13 : 0.07, decay: open ? 0.22 : 0.035 });

  // ---------- 排程 ----------
  function scheduleStep(s, t) {
    const loop = Math.floor(s / (16 * BARS.length));
    const barIndex = Math.floor(s / 16) % BARS.length;
    const pos = s % 16;
    const bar = BARS[barIndex];

    // 鼓：大鼓 1、2 拍後半、3 拍；小鼓 2、4 拍；Hi-hat 十六分音符，8 小節最後補一下開放 Hi-hat
    if (pos === 0 || pos === 7 || pos === 10 || (bar.end && pos === 13)) kick(t);
    if (pos === 4 || pos === 12) snare(t);
    if (bar.end && pos === 15) snare(t);
    hat(t, pos === 14 && barIndex % 2 === 1, pos % 4 === 2);

    // 電鋼琴
    const comp = barIndex % 2 ? COMP_B : COMP;
    for (const [at, len] of comp) {
      if (at !== pos) continue;
      const chord = bar.turn && pos >= 8 ? D7 : bar.chord;
      chord.forEach((n) => epiano(n, t, len * STEP));
    }

    // 貝斯
    for (const [at, interval, len] of BASS) {
      if (at !== pos) continue;
      const root = bar.turn && pos >= 8 ? bar.turn : bar.root;
      bass(root + interval - 12, t, len * STEP);
    }

    // 主旋律：第一輪先不出來，之後每隔一輪出現
    if (loop % 2 === 1) {
      for (const [b, at, note, len] of LEAD) {
        if (b === barIndex && at === pos) lead(note, t, len * STEP);
      }
    }
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      const swing = step % 2 ? SWING * STEP : 0;
      scheduleStep(step, nextTime + swing);
      nextTime += STEP;
      step++;
    }
  }

  // ---------- 手機（特別是 iPhone）----------
  // iPhone 的靜音開關會把 Web Audio 一起靜音，但 <audio> 播放的聲音不受影響。
  // 新版 Safari 可以直接把網頁的音訊類型設成「播放」；舊版就同時播一段無聲的 <audio>，
  // 讓整頁的聲音改走媒體播放的通道。都要在訪客按下按鈕的當下呼叫才有效。
  let silentAudio = null;
  function silentWavUrl() {
    const rate = 8000;
    const n = rate / 2; // 0.5 秒的無聲 8-bit WAV
    const buf = new ArrayBuffer(44 + n);
    const v = new DataView(buf);
    const str = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE');
    str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    str(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }
  function unlockMobileAudio() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'playback';
    } catch {
      // 不支援就算了，下面的無聲 <audio> 會接手
    }
    if (!silentAudio) {
      silentAudio = document.createElement('audio');
      silentAudio.src = silentWavUrl();
      silentAudio.loop = true;
      silentAudio.setAttribute('playsinline', '');
      silentAudio.preload = 'auto';
    }
    silentAudio.play().catch(() => {});
  }

  async function play() {
    unlockMobileAudio();
    if (!ctx) setup();
    try {
      await ctx.resume();
    } catch {
      // 有些手機第一次會失敗，下面再檢查一次
    }
    if (ctx.state !== 'running') {
      // 手機被來電或其他 App 打斷後，音訊可能卡在暫停狀態，請訪客再按一次
      button.querySelector('.bgm-text span').textContent = '手機擋住了聲音・請再點一次';
      return;
    }
    playing = true;
    nextTime = ctx.currentTime + 0.08;
    step = 0;
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.linearRampToValueAtTime(0.42, ctx.currentTime + 1.5); // 慢慢淡入
    clearInterval(timer);
    timer = setInterval(scheduler, 25);
    scheduler();
    update();
  }

  function pause() {
    if (!ctx) return;
    playing = false;
    clearInterval(timer);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.5);
    setTimeout(() => {
      if (playing) return;
      ctx.suspend();
      silentAudio?.pause();
    }, 600);
    update();
  }

  // 切到別的分頁時先暫停，回來再接著播（背景分頁的計時器會變慢，節奏會亂掉）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) {
      resumeOnShow = true;
      pause();
    } else if (!document.hidden && resumeOnShow) {
      resumeOnShow = false;
      play();
    }
  });

  // ---------- 右下角的播放按鈕 ----------
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bgm';
  button.innerHTML = `
    <span class="bgm-disc" aria-hidden="true"></span>
    <span class="bgm-text"><b></b><span></span></span>
    <span class="bgm-eq" aria-hidden="true"><i></i><i></i><i></i></span>`;
  button.querySelector('b').textContent = `♫ ${TITLE}`;

  function update() {
    button.classList.toggle('is-playing', playing);
    button.setAttribute('aria-pressed', String(playing));
    button.setAttribute('aria-label', playing ? `暫停背景音樂〈${TITLE}〉` : `播放背景音樂〈${TITLE}〉`);
    button.querySelector('.bgm-text span').textContent = playing ? '播放中・點一下暫停' : '車站 BGM・點一下播放';
  }

  if (window.AudioContext || window.webkitAudioContext) {
    // 手機點一下有時會觸發兩次 click（剛播就被暫停，聽起來像沒聲音），太接近的第二次就忽略
    let lastToggle = 0;
    button.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastToggle < 500) return;
      lastToggle = now;
      resumeOnShow = false;
      if (playing) pause();
      else play();
    });
    update();
    document.body.append(button);
  }
})();
