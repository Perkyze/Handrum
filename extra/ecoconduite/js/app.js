/* Kiosk flow: home -> how-to -> 4 scenarios (animation, timed question,
   research notes) -> results. Scoring, idle reset, sounds. */
(function () {
  'use strict';
  const Eco = window.Eco, S = Eco.SCENARIOS, D = Eco.D;
  const $ = (id) => document.getElementById(id);

  const QT = 20;            // seconds per question
  const BASE = 500;         // points for a right answer
  const SPEED = 500;        // max speed bonus, linear on time left
  const STREAK = 150;       // per consecutive right answer after the first
  const IDLE_GAME = 90;     // s without a touch before returning home
  const IDLE_RESULTS = 40;
  const CIRC = 2 * Math.PI * 52;

  const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const svg = (id) => '<svg><use href="#' + id + '"/></svg>';
  const streakBonus = (s) => (s > 1 ? STREAK * (s - 1) : 0);

  /* ---------------- Sound (tiny Web Audio cues) ---------------- */
  Eco.sfx = (function () {
    let ac = null;
    function unlock() {
      try {
        if (!ac) {
          const A = window.AudioContext || window.webkitAudioContext;
          if (A) ac = new A();
        }
        if (ac && ac.state === 'suspended') ac.resume();
      } catch (e) { /* audio is optional */ }
    }
    function tone(f, d, type, g, when) {
      if (!ac) return;
      try {
        const t = ac.currentTime + (when || 0);
        const o = ac.createOscillator(), gn = ac.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t);
        gn.gain.setValueAtTime(0, t);
        gn.gain.linearRampToValueAtTime(g || 0.05, t + 0.012);
        gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(gn).connect(ac.destination);
        o.start(t);
        o.stop(t + d + 0.03);
      } catch (e) { /* ignore */ }
    }
    return {
      unlock,
      tap: () => tone(620, 0.07, 'triangle', 0.035),
      pop: () => { tone(523, 0.12, 'sine', 0.05); tone(784, 0.16, 'sine', 0.045, 0.08); },
      tick: () => tone(1046, 0.05, 'square', 0.018),
      right: () => { tone(659, 0.12, 'triangle', 0.06); tone(880, 0.14, 'triangle', 0.06, 0.09); tone(1318, 0.24, 'triangle', 0.05, 0.18); },
      wrong: () => { tone(330, 0.18, 'sine', 0.06); tone(247, 0.28, 'sine', 0.05, 0.13); },
      fanfare: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'triangle', 0.05, i * 0.11)); },
    };
  })();

  /* ---------------- Canvas surfaces ---------------- */
  function surface(canvas) {
    const s = { canvas, ctx: canvas.getContext('2d'), W: 0, H: 0, dpr: 1, dirty: true };
    s.fit = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight; // layout size, ignores transforms
      if (w < 2 || h < 2) return false;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const pw = Math.round(w * dpr), ph = Math.round(h * dpr);
      if (canvas.width !== pw || canvas.height !== ph) { canvas.width = pw; canvas.height = ph; }
      s.W = w; s.H = h; s.dpr = dpr; s.dirty = false;
      return true;
    };
    if (window.ResizeObserver) new ResizeObserver(() => { s.dirty = true; }).observe(canvas);
    return s;
  }
  function begin(s) {
    if ((s.dirty || !s.W) && !s.fit()) return false;
    s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    return true;
  }
  const surfaces = {
    home: surface($('home-canvas')),
    stage: surface($('stage-canvas')),
    confetti: surface($('confetti')),
  };
  window.addEventListener('resize', () => {
    Object.values(surfaces).forEach((s) => { s.dirty = true; });
    measureSheet();
  });

  /* ---------------- State ---------------- */
  const st = {
    screen: 'home', idx: 0, score: 0, scoreTarget: 0, shown: 0, streak: 0, results: [],
    scene: null, attract: new Eco.AttractScene(), sceneDelay: 0,
    qActive: false, qElapsed: 0, lastNum: -1, ptsText: '',
    sheet: null, sheetH: 0, vh: 0,
    run: 0, lastTouch: performance.now(), modal: false,
    captionText: '', titleOn: false,
    ring: null, ringT: 0, confetti: null, confT: 0,
    resShown: 0, resT: 0, memBest: 0,
  };
  function later(ms, fn) {
    const run = st.run;
    setTimeout(() => { if (run === st.run) fn(); }, ms);
  }

  /* ---------------- Best score of the day (per device) ---------------- */
  function dayKey() {
    const d = new Date();
    return 'eco-best-' + d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }
  function getBest() {
    try { return parseInt(localStorage.getItem(dayKey()) || '0', 10) || 0; } catch (e) { return st.memBest; }
  }
  function setBest(v) {
    st.memBest = v;
    try { localStorage.setItem(dayKey(), String(v)); } catch (e) { /* private mode */ }
  }
  function updateBest() {
    const b = getBest();
    $('best-chip').hidden = b <= 0;
    $('best-today').textContent = fmt(b);
  }

  /* ---------------- Screens ---------------- */
  function show(name) {
    document.querySelectorAll('.screen').forEach((el) => el.classList.toggle('is-active', el.id === 'screen-' + name));
    st.screen = name;
    st.lastTouch = performance.now();
  }
  function goHome() {
    st.run++;
    st.scene = null; st.qActive = false; st.ring = null; st.confetti = null;
    closeSheets();
    hideModal();
    $('toast').classList.remove('is-on');
    st.attract = new Eco.AttractScene();
    updateBest();
    show('home');
  }
  function startGame() {
    Eco.sfx.unlock();
    keepAwake();
    st.score = 0; st.scoreTarget = 0; st.shown = 0; st.streak = 0; st.results = [];
    $('score').textContent = '0';
    renderStreak();
    show('howto');
  }
  function beginScenarios(at) {
    show('game');
    startScenario(at || 0);
  }

  /* ---------------- HUD ---------------- */
  function renderSteps() {
    $('steps').innerHTML = S.map((s, i) => {
      const r = st.results[i];
      let cls = 'step', ic = String(i + 1);
      if (r) { cls += r.correct ? ' is-right' : ' is-wrong'; ic = svg(r.correct ? 'i-check' : 'i-x'); }
      else if (i === st.idx) cls += ' is-current';
      return '<li class="' + cls + '"><span class="step-ic">' + ic + '</span><span class="step-label">' + s.short + '</span></li>';
    }).join('');
  }
  function renderStreak() {
    const el = $('streak');
    if (st.streak >= 2) {
      $('streak-n').textContent = '×' + st.streak;
      el.hidden = false;
      el.style.animation = 'none';
      void el.offsetWidth;
      el.style.animation = '';
    } else el.hidden = true;
  }
  function scoreFrame(dt) {
    if (Math.abs(st.shown - st.scoreTarget) < 0.5) return;
    st.shown += (st.scoreTarget - st.shown) * (1 - Math.exp(-7 * dt));
    if (Math.abs(st.shown - st.scoreTarget) < 0.5) st.shown = st.scoreTarget;
    $('score').textContent = fmt(st.shown);
  }

  /* ---------------- Sheets & captions ---------------- */
  function sheetEl(name) { return $(name === 'q' ? 'sheet-q' : 'sheet-info'); }
  function measureSheet() {
    st.sheetH = st.sheet ? sheetEl(st.sheet).offsetHeight : 0;
  }
  function openSheet(name) {
    ['q', 'info'].forEach((n) => sheetEl(n).classList.toggle('is-open', n === name));
    st.sheet = name;
    measureSheet();
  }
  function closeSheets() {
    sheetEl('q').classList.remove('is-open');
    sheetEl('info').classList.remove('is-open');
    st.sheet = null; st.sheetH = 0;
  }
  function setCaption(text) {
    const cap = $('caption'), span = $('caption-text');
    st.captionText = text;
    if (!text) { cap.classList.add('is-hidden'); return; }
    if (cap.classList.contains('is-hidden')) {
      span.textContent = text;
      cap.classList.remove('is-hidden');
      return;
    }
    span.classList.add('swap');
    setTimeout(() => {
      if (st.captionText !== text) return;
      span.textContent = text;
      span.classList.remove('swap');
    }, 200);
  }

  /* ---------------- Scenario flow ---------------- */
  function startScenario(i) {
    st.run++;
    st.idx = i;
    const def = S[i];
    st.scene = Eco.makeScene(i);
    st.scene.onQuestion = openQuestion;
    st.qActive = false; st.ring = null; st.vh = 0;
    st.sceneDelay = 0.8;
    closeSheets();
    renderSteps();
    $('tag-n').textContent = 'Scénario ' + (i + 1) + '/' + S.length;
    $('tag-title').textContent = def.title;
    $('tc-n').textContent = 'Scénario ' + (i + 1) + ' sur ' + S.length;
    $('tc-title').textContent = D.fr(def.title);
    $('tc-sub').textContent = D.fr(def.subtitle);
    const tc = $('title-card');
    tc.classList.add('is-on');
    st.titleOn = true;
    $('scene-tag').classList.add('is-hidden');
    setCaption('');
    later(1700, () => {
      tc.classList.remove('is-on');
      st.titleOn = false;
      $('scene-tag').classList.remove('is-hidden');
    });
  }

  function openQuestion() {
    const def = S[st.idx];
    $('q-text').textContent = D.fr('« ' + def.question + ' »');
    const qa = $('q-actions');
    qa.classList.remove('is-locked');
    qa.querySelectorAll('.answer').forEach((b) => { b.className = 'answer'; });
    st.qActive = true; st.qElapsed = 0; st.lastNum = -1; st.ptsText = '';
    setCaption('');
    updateTimer(QT);
    openSheet('q');
    Eco.sfx.pop();
  }

  function updateTimer(rem) {
    $('timer-bar').style.strokeDashoffset = String(CIRC * (1 - rem / QT));
    const n = Math.ceil(rem);
    if (n !== st.lastNum) {
      $('timer-num').textContent = String(n);
      if (n <= 5 && n > 0 && st.lastNum !== -1) Eco.sfx.tick();
      st.lastNum = n;
      $('timer').classList.toggle('is-low', rem <= 5);
    }
    const txt = '+' + fmt(BASE + Math.round((SPEED * rem) / QT) + streakBonus(st.streak + 1)) + ' pts';
    if (txt !== st.ptsText) { $('timer-pts').textContent = txt; st.ptsText = txt; }
  }

  function answer(val) {
    if (!st.qActive) return;
    st.qActive = false;
    const def = S[st.idx];
    const rem = Math.max(0, QT - st.qElapsed);
    const timeout = val === null;
    const correct = !timeout && val === def.answer;
    const pts = { base: 0, speed: 0, streak: 0 };
    if (correct) {
      st.streak++;
      pts.base = BASE;
      pts.speed = Math.round((SPEED * rem) / QT);
      pts.streak = streakBonus(st.streak);
    } else st.streak = 0;
    const total = pts.base + pts.speed + pts.streak;
    st.score += total;
    st.results[st.idx] = { correct, timeout, val, pts, total };

    const qa = $('q-actions');
    qa.classList.add('is-locked');
    qa.querySelectorAll('.answer').forEach((b) => {
      const bv = b.dataset.answer === 'true';
      if (bv === def.answer) b.classList.add(correct ? 'is-correct' : 'is-reveal');
      else if (bv === val) b.classList.add('is-wrong', 'shake');
      else b.classList.add('is-dim');
    });

    const toast = $('toast');
    toast.classList.toggle('is-miss', !correct);
    $('toast-ic').innerHTML = svg(correct ? 'i-check' : timeout ? 'i-timer' : 'i-x');
    $('toast-text').textContent = correct ? 'Bonne réponse !'.replace(' !', ' !') : timeout ? 'Temps écoulé' : 'Pas tout à fait';
    $('toast-pts').textContent = correct ? '+' + fmt(total) : '';
    toast.classList.add('is-on');
    if (correct) {
      Eco.sfx.right();
      later(520, () => fly('+' + fmt(total), $('toast-pts'), $('score')));
      later(1250, () => {
        st.scoreTarget = st.score;
        const sc = document.querySelector('.score');
        sc.classList.remove('bump'); void sc.offsetWidth; sc.classList.add('bump');
      });
    } else {
      Eco.sfx.wrong();
    }
    renderStreak();
    renderSteps();
    if (st.scene) st.scene.resume();
    later(1500, () => toast.classList.remove('is-on'));
    later(1350, openInfo);
  }

  function fly(text, fromEl, toEl) {
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    if (!a.width) return;
    const f = document.createElement('div');
    f.className = 'fly';
    f.textContent = text;
    document.body.appendChild(f);
    const fw = f.offsetWidth, fh = f.offsetHeight;
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    f.style.left = x0 - fw / 2 + 'px';
    f.style.top = y0 - fh / 2 + 'px';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      f.style.transform = 'translate(' + (b.left + b.width / 2 - x0) + 'px,' + (b.top + b.height / 2 - y0) + 'px) scale(0.55)';
      f.style.opacity = '0.2';
    }));
    setTimeout(() => f.remove(), 900);
  }

  function chip(label, v) {
    return '<span>' + label + ' <b>+' + fmt(v) + '</b></span>';
  }

  function openInfo() {
    const def = S[st.idx], r = st.results[st.idx];
    $('v-badge').textContent = def.answer ? 'VRAI' : 'FAUX';
    const you = $('v-you');
    if (r.timeout) {
      you.className = 'verdict-you miss';
      you.innerHTML = svg('i-timer') + 'Temps écoulé';
    } else {
      you.className = 'verdict-you ' + (r.correct ? 'ok' : 'miss');
      you.innerHTML = svg(r.correct ? 'i-check' : 'i-x') + D.fr('Ta réponse : ' + (r.val ? 'Vrai' : 'Faux'));
    }
    $('k-fig').textContent = D.fr(def.fig);
    $('k-cap').textContent = D.fr(def.figCap);
    $('i-answer').innerHTML = D.fr(def.explain);
    $('i-why').innerHTML = D.fr(def.why);
    $('i-sources').innerHTML = def.sources.map((s) => '<span class="src">' + D.fr(s) + '</span>').join('');
    buildMini(def.mini);
    $('pts-break').innerHTML = r.correct
      ? chip('Bonne réponse', r.pts.base) + chip('Rapidité', r.pts.speed) + (r.pts.streak ? chip('Série ×' + st.streak, r.pts.streak) : '')
      : '<span class="zero">0 point · la série repart à zéro</span>';
    $('btn-next').firstChild.textContent = st.idx < S.length - 1 ? 'Scénario suivant' : 'Voir mon score';
    sheetEl('q').classList.remove('is-open');
    later(160, () => openSheet('info'));
  }

  function buildMini(m) {
    const el = $('mini');
    el.className = 'mini';
    st.ring = null;
    if (m.type === 'bars') {
      el.innerHTML =
        '<div class="mini-cap">' + D.fr(m.caption) + '</div>' +
        m.rows.map((r) =>
          '<div class="bar-row"><span>' + r.label + '</span><div class="bar"><i class="' + (r.tone === 'ok' ? 'ok' : '') +
          '" style="--w:' + ((r.value / m.max) * 100).toFixed(1) + '%"></i></div><em>' + D.fr(r.text) + '</em></div>'
        ).join('') +
        (m.chips ? '<div class="mini-chips">' + m.chips.map((c) => '<span>' + D.fr(c) + '</span>').join('') + '</div>' : '');
      later(520, () => el.classList.add('go'));
    } else if (m.type === 'ring') {
      el.innerHTML = '<div class="ring-wrap"><canvas id="ring"></canvas><p>' + D.fr(m.caption) + '</p></div>';
      st.ring = surface($('ring'));
      st.ringT = 0;
    } else if (m.type === 'tiles') {
      el.innerHTML = '<div class="tiles">' + m.tiles.map((t) => '<div class="tile"><b>' + D.fr(t.big) + '</b><span>' + D.fr(t.small) + '</span></div>').join('') + '</div>';
    }
  }

  // Sugiyama-style ring: 22 cars, a jam that drifts backwards.
  function drawRing(dt) {
    const s = st.ring;
    if (!s || !begin(s)) return;
    st.ringT += dt;
    const ctx = s.ctx, W = s.W, H = s.H, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 12, t = st.ringT;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = '#323B48';
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(244,242,234,0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    const n = 22, w = 0.9, psi = -0.28 * t, a = 0.62;
    for (let i = 0; i < n; i++) {
      const u = (i / n) * Math.PI * 2 + w * t;
      const th = u - a * Math.sin(u - psi);
      const jam = Math.cos(u - psi);
      ctx.save();
      ctx.translate(cx + Math.cos(th) * R, cy + Math.sin(th) * R);
      ctx.rotate(th + Math.PI / 2);
      ctx.fillStyle = jam > 0.55 ? '#FF5A4E' : i === 0 ? '#E86A33' : '#E9E6DE';
      D.rr(ctx, -3.2, -5.5, 6.4, 11, 2.5);
      ctx.fill();
      ctx.restore();
    }
  }

  function next() {
    if (st.idx < S.length - 1) startScenario(st.idx + 1);
    else showResults();
  }

  /* ---------------- Results ---------------- */
  function showResults() {
    st.run++;
    closeSheets();
    st.scene = null; st.ring = null;
    st.scoreTarget = st.score;
    const correct = st.results.filter((r) => r && r.correct).length;
    const rank = Eco.RANKS.find((r) => st.score >= r.min);
    $('res-rank').textContent = rank.title;
    $('res-rank-text').textContent = D.fr(rank.text);
    $('res-correct').textContent = correct + '/' + S.length + ' bonnes réponses';
    const prev = getBest();
    const isNew = st.score > prev && st.score > 0;
    if (isNew) setBest(st.score);
    $('res-best').textContent = D.fr('Record du jour : ' + fmt(Math.max(prev, st.score)));
    $('res-new').hidden = !isNew;
    $('res-dots').innerHTML = S.map((s, i) => {
      const ok = st.results[i] && st.results[i].correct;
      return '<span class="res-dot' + (ok ? ' ok' : '') + '">' + svg(ok ? 'i-check' : 'i-x') + '</span>';
    }).join('');
    $('recap').innerHTML = S.map((s, i) => {
      const ok = st.results[i] && st.results[i].correct;
      return '<li><span class="recap-ic' + (ok ? ' ok' : '') + '">' + svg(ok ? 'i-check' : 'i-x') + '</span><div><b>' +
        D.fr(s.title) + '</b><p>' + D.fr(s.takeaway) + '</p></div></li>';
    }).join('');
    st.resShown = 0; st.resT = 0;
    $('res-score').textContent = '0';
    $('res-auto').textContent = '';
    show('results');
    if (isNew || correct >= 3) later(450, () => { confettiBurst(); Eco.sfx.fanfare(); });
  }

  function confettiBurst() {
    const cols = ['#E86A33', '#3D7A5D', '#16324F', '#E7B54A', '#B2D2BA'];
    st.confetti = [];
    for (let i = 0; i < 150; i++) {
      st.confetti.push({
        x: 0.5 + (Math.random() - 0.5) * 0.3, y: 0.35,
        vx: (Math.random() - 0.5) * 1.3, vy: -0.6 - Math.random() * 0.9,
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 10,
        c: cols[i % cols.length], s: 6 + Math.random() * 7,
      });
    }
    st.confT = 0;
  }
  function confettiFrame(dt) {
    const s = surfaces.confetti;
    if (!begin(s)) return;
    s.ctx.clearRect(0, 0, s.W, s.H);
    if (!st.confetti) return;
    st.confT += dt;
    for (const p of st.confetti) {
      p.vy += 1.1 * dt;
      p.vx *= 1 - 0.6 * dt;
      p.x += p.vx * dt * 0.6;
      p.y += p.vy * dt * 0.6;
      p.r += p.vr * dt;
      s.ctx.save();
      s.ctx.translate(p.x * s.W, p.y * s.H);
      s.ctx.rotate(p.r);
      s.ctx.fillStyle = p.c;
      s.ctx.globalAlpha = Math.max(0, 1 - Math.max(0, st.confT - 3) / 1.5);
      s.ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      s.ctx.restore();
    }
    if (st.confT > 4.6) st.confetti = null;
  }

  /* ---------------- Modal ---------------- */
  function showModal() { st.modal = true; $('modal-quit').hidden = false; }
  function hideModal() { st.modal = false; $('modal-quit').hidden = true; }

  /* ---------------- Keep the screen on (where supported) ---------------- */
  let wakeLock = null;
  async function keepAwake() {
    try {
      if ('wakeLock' in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      }
    } catch (e) { /* not available */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && st.screen !== 'home') keepAwake(); });

  /* ---------------- Main loop ---------------- */
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (st.screen === 'home') {
      st.attract.tick(dt);
      const s = surfaces.home;
      if (begin(s)) st.attract.render(s.ctx, { W: s.W, H: s.H, vh: s.H });
    } else if (st.screen === 'game' && st.scene) {
      gameFrame(dt);
    } else if (st.screen === 'results') {
      st.resT += dt;
      const k = D.ease.out(D.clamp(st.resT / 1.6, 0, 1));
      const v = Math.round(st.score * k);
      if (v !== st.resShown) { st.resShown = v; $('res-score').textContent = fmt(v); }
    }
    if (st.screen === 'results' || st.confetti) confettiFrame(dt);
    scoreFrame(dt);
    idleCheck(now);
    requestAnimationFrame(frame);
  }

  function gameFrame(dt) {
    const sc = st.scene;
    if (!st.modal) {
      if (st.sceneDelay > 0) st.sceneDelay -= dt;
      else sc.tick(dt);
      if (st.qActive) {
        st.qElapsed += dt;
        const rem = Math.max(0, QT - st.qElapsed);
        updateTimer(rem);
        if (rem <= 0) answer(null);
      }
    }
    const cap = st.scene && st.scene.phase === 'intro' && !st.titleOn && st.sceneDelay <= 0 ? D.fr(st.scene.caption()) : '';
    if (cap !== st.captionText) setCaption(cap);
    const s = surfaces.stage;
    if (!begin(s)) return;
    const target = s.H - (st.sheet ? st.sheetH + 24 : 0);
    st.vh = st.vh ? st.vh + (target - st.vh) * (1 - Math.exp(-6 * dt)) : target;
    s.ctx.clearRect(0, 0, s.W, s.H);
    sc.render(s.ctx, { W: s.W, H: s.H, vh: Math.max(150, st.vh) });
    if (st.ring) drawRing(dt);
  }

  function idleCheck(now) {
    if (st.screen === 'home') return;
    const limit = (st.screen === 'results' ? IDLE_RESULTS : IDLE_GAME) * 1000;
    if (st.qActive) { st.lastTouch = Math.max(st.lastTouch, now - limit + 5000); return; }
    const left = limit - (now - st.lastTouch);
    if (st.screen === 'results') {
      const txt = left < 15000 ? 'Retour à l’accueil dans ' + Math.ceil(left / 1000) + ' s' : '';
      if ($('res-auto').textContent !== txt) $('res-auto').textContent = txt;
    }
    if (left <= 0) goHome();
  }

  /* ---------------- Input ---------------- */
  document.addEventListener('pointerdown', () => { st.lastTouch = performance.now(); }, { passive: true });
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('dblclick', (e) => e.preventDefault());

  const tap = (id, fn) => $(id).addEventListener('click', () => { Eco.sfx.tap(); fn(); });
  tap('btn-start', startGame);
  tap('btn-howto-back', goHome);
  tap('btn-go', () => beginScenarios(0));
  tap('btn-next', next);
  tap('btn-quit', showModal);
  tap('btn-stay', hideModal);
  tap('btn-leave', goHome);
  tap('btn-home', goHome);
  tap('btn-replay', startGame);
  $('q-actions').addEventListener('click', (e) => {
    const b = e.target.closest('.answer');
    if (b) answer(b.dataset.answer === 'true');
  });

  // Keyboard shortcuts for testing on a laptop: V / F to answer, Enter to continue.
  document.addEventListener('keydown', (e) => {
    st.lastTouch = performance.now();
    const k = e.key.toLowerCase();
    if (st.screen === 'game' && st.qActive && (k === 'v' || k === 'f')) answer(k === 'v');
    else if (k === 'enter') {
      if (st.screen === 'home') startGame();
      else if (st.screen === 'howto') beginScenarios(0);
      else if (st.screen === 'game' && st.sheet === 'info') next();
      else if (st.screen === 'results') startGame();
    }
  });

  /* ---------------- Boot ---------------- */
  updateBest();
  const params = new URLSearchParams(location.search);
  const jump = parseInt(params.get('scene') || '', 10);
  if (jump >= 1 && jump <= S.length) {
    st.results = [];
    beginScenarios(jump - 1);
  }
  Eco.debug = { st, answer, next, showResults, goHome };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    Object.values(surfaces).forEach((s) => { s.dirty = true; });
  });
  requestAnimationFrame(frame);
})();
