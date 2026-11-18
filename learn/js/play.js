/* Backbeat — the three kinds of exercise.
   Each returns { el, start(), stop() } and calls hooks.done({ acc, ... }) when finished.
   hooks.target(ids) tells the screen which kit pads to light up. Hits arrive through Kit.on(). */
(function () {
  'use strict';
  const { h, clamp } = window.Dom;
  const K = window.Kit, A = window.Sound, L = window.Lessons;
  const PERFECT = 0.05, GOOD = 0.12;   // seconds either side of the beat

  // =====================================================================
  // Note highway: gems slide right-to-left; hit each one as it crosses the line.
  // =====================================================================
  function highway(ex, hooks) {
    const div = ex.div || 4;
    const P = L.parse(ex.pat, div);
    const perBar = div * 4;
    const patSteps = Math.ceil(P.steps / perBar) * perBar;
    const lanes = K.DRUMS.filter((d) => P.notes.some((n) => n.id === d.id));
    const laneOf = Object.fromEntries(lanes.map((d, i) => [d.id, i]));
    const loops = ex.loops || 2;
    const spb = 60 / ex.bpm, step = spb / div;
    const countIn = 4;

    const canvas = h('canvas', { class: 'hw-canvas', 'aria-hidden': 'true' });
    const live = h('div', { class: 'hw-live' },
      h('span', { class: 'hw-pts' }, h('b', null, '0'), ' pts'),
      h('span', { class: 'hw-combo' }, ''),
      h('span', { class: 'hw-acc' }, ''));
    const sr = h('p', { class: 'sr', 'aria-live': 'polite' });
    const el = h('div', { class: 'hw' }, canvas, live, sr);
    const ctx = canvas.getContext('2d');

    let notes = [], beats = [], T0 = 0, end = 0, lat = 0, mode = 'idle', raf = 0, off = null;
    let st = null;            // running score
    const pops = [];          // floating judgement labels
    const flashes = {};       // lane -> time of last hit

    function build(preview) {
      notes = []; beats = [];
      const firstBeat = T0;                       // count-in starts here
      const t1 = T0 + countIn * spb;               // bar 1 starts here
      const block = ex.echo ? patSteps * 2 : patSteps;
      for (let l = 0; l < loops; l++) {
        const base = l * block;
        P.notes.forEach((n) => {
          if (ex.echo) {
            notes.push({ t: t1 + (base + n.step) * step, id: n.id, demo: true, acc: n.acc });
            notes.push({ t: t1 + (base + patSteps + n.step) * step, id: n.id, demo: preview, acc: n.acc });
          } else notes.push({ t: t1 + (base + n.step) * step, id: n.id, demo: preview, acc: n.acc });
        });
      }
      notes.sort((a, b) => a.t - b.t);
      const totalBeats = countIn + (loops * block) / div;
      for (let b = 0; b <= totalBeats; b++) beats.push({ t: firstBeat + b * spb, n: b - countIn, bar: (b - countIn) % 4 === 0 });
      end = t1 + (loops * block) * step;
    }

    function begin(preview) {
      stop(true);
      A.unlock();
      const s = K.settings;
      lat = A.latency() + (s ? s.offset : 0) / 1000;
      T0 = A.now() + 0.35;
      build(preview);
      // clicks on every beat (count-in accented), demo notes play themselves
      const ev = beats.slice(0, -1).map((b) => ({ click: true, accent: b.n < 0 ? b.n === -countIn : b.bar, t: b.t }));
      notes.forEach((n) => { if (n.demo) ev.push({ id: n.id, t: n.t, vel: n.acc ? 120 : 95 }); });
      A.schedule(ev);
      st = { perfect: 0, good: 0, miss: 0, extra: 0, pts: 0, combo: 0, best: 0, early: 0, late: 0 };
      mode = preview ? 'preview' : 'run';
      el.classList.toggle('preview', !!preview);
      updateLive();
      off = K.on(onHit);
      if (hooks.target) hooks.target(lanes.map((d) => d.id));
      loop();
    }

    function onHit(id) {
      flashes[id] = A.now();
      if (mode !== 'run') return;
      const t = A.now() - lat;
      if (t < T0 + (countIn - 0.5) * spb) return;   // warming up during the count-in is fine
      let best = null, bd = 1e9;
      for (const n of notes) {
        if (n.demo || n.j || n.id !== id) continue;
        const d = Math.abs(n.t - t);
        if (d < bd) { bd = d; best = n; }
        if (n.t - t > GOOD) break;
      }
      if (best && bd <= GOOD) {
        const dt = t - best.t;
        best.j = bd <= PERFECT ? 'perfect' : 'good';
        best.jt = A.now();
        st[best.j]++;
        if (best.j === 'good') st[dt < 0 ? 'early' : 'late']++;
        st.combo++; st.best = Math.max(st.best, st.combo);
        const mult = 1 + Math.min(3, Math.floor(st.combo / 8));
        st.pts += (best.j === 'perfect' ? 100 : 50) * mult;
        pops.push({ text: best.j === 'perfect' ? 'Perfect!' : dt < 0 ? 'Early' : 'Late', lane: laneOf[id], t: A.now(), c: best.j === 'perfect' ? '#3ddc97' : '#ffd23f' });
      } else {
        st.extra++;
        pops.push({ text: 'Extra', lane: laneOf[id] !== undefined ? laneOf[id] : null, t: A.now(), c: '#aaa3d0' });
      }
      updateLive();
    }

    function updateLive() {
      if (!st) return;
      live.querySelector('.hw-pts b').textContent = st.pts.toLocaleString('en-US');
      const mult = 1 + Math.min(3, Math.floor(st.combo / 8));
      live.querySelector('.hw-combo').textContent = st.combo >= 4 ? `🔥 ${st.combo} combo${mult > 1 ? ' · ×' + mult : ''}` : '';
      const judged = st.perfect + st.good + st.miss;
      live.querySelector('.hw-acc').textContent = judged ? `${score()}%` : '';
    }
    function total() { return notes.filter((n) => !n.demo).length; }
    function score() {
      const judged = st.perfect + st.good + st.miss;
      if (!judged) return 0;
      return Math.round(clamp((st.perfect + st.good * 0.6 - st.extra * 0.25) / judged, 0, 1) * 100);
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      const now = A.now();
      if (mode === 'run') {
        for (const n of notes) {
          if (!n.demo && !n.j && now - lat > n.t + GOOD) {
            n.j = 'miss'; n.jt = now; st.miss++; st.combo = 0;
            pops.push({ text: 'Miss', lane: laneOf[n.id], t: now, c: '#ff6b6b' });
            updateLive();
          }
        }
      }
      draw(now);
      if (now > end + 0.5) finish();
    }

    function finish() {
      const was = mode;
      stop(true);
      if (was === 'run') {
        const res = Object.assign({ acc: Math.round(clamp((st.perfect + st.good * 0.6 - st.extra * 0.25) / Math.max(1, total()), 0, 1) * 100), total: total() }, st);
        sr.textContent = `Finished: ${res.acc} percent.`;
        hooks.done(res);
      } else if (hooks.previewed) hooks.previewed();
      draw(A.now());
    }

    function stop(quiet) {
      cancelAnimationFrame(raf);
      if (off) { off(); off = null; }
      if (mode !== 'idle') A.stop();
      mode = 'idle';
      el.classList.remove('preview');
      if (!quiet) draw(A.now());
    }

    // ---------- drawing ----------
    let Wd = 0, Ht = 0, dpr = 1;
    const TOP = 24, LABEL = 64;
    function laneH() { return Wd < 420 ? 38 : 44; }
    function size() {
      dpr = window.devicePixelRatio || 1;
      Wd = el.clientWidth || 320;
      Ht = TOP + lanes.length * laneH() + 8;
      canvas.width = Math.round(Wd * dpr); canvas.height = Math.round(Ht * dpr);
      canvas.style.height = Ht + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(A.now());
    }
    const ro = window.ResizeObserver ? new ResizeObserver(size) : null;

    function draw(now) {
      if (!Wd) return;
      const lh = laneH(), hitX = LABEL + 26;
      const pxBeat = clamp(Wd * 0.26, 96, 160), pps = pxBeat / spb;
      const view = (mode === 'idle' && !T0) ? null : now;
      const xOf = (t) => hitX + (t + lat - (view === null ? T0 : view)) * pps;
      ctx.clearRect(0, 0, Wd, Ht);
      // lanes
      lanes.forEach((d, i) => {
        const y = TOP + i * lh;
        ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.06)';
        ctx.fillRect(0, y, Wd, lh);
      });
      // echo: shade the bars that play by themselves
      if (ex.echo && notes.length) {
        const block = patSteps * 2 * step, t1 = T0 + countIn * spb;
        for (let l = 0; l < loops; l++) {
          const a = xOf(t1 + l * block), b = xOf(t1 + l * block + patSteps * step);
          if (b < 0 || a > Wd) continue;
          ctx.fillStyle = 'rgba(155,123,255,.13)';
          ctx.fillRect(Math.max(a, LABEL), TOP, b - Math.max(a, LABEL), lanes.length * lh);
          ctx.fillStyle = '#c9b8ff'; ctx.font = '700 11px "DM Sans", sans-serif'; ctx.textAlign = 'left';
          if (a + 6 > LABEL) ctx.fillText('LISTEN', a + 6, TOP + 12);
          const c = xOf(t1 + l * block + patSteps * step);
          if (c + 6 > LABEL && c < Wd) { ctx.fillStyle = '#ffd23f'; ctx.fillText('YOUR TURN', c + 6, TOP + 12); }
        }
      }
      // beat lines and counts
      ctx.textAlign = 'center';
      beats.forEach((b) => {
        const x = xOf(b.t);
        if (x < LABEL || x > Wd + 10) return;
        ctx.fillStyle = b.n < 0 ? 'rgba(255,210,63,.25)' : b.bar ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)';
        ctx.fillRect(x - (b.bar ? 1 : 0.5), TOP, b.bar ? 2 : 1, lanes.length * lh);
        ctx.fillStyle = b.n < 0 ? '#ffd23f' : b.bar ? '#f6f2ff' : '#aaa3d0';
        ctx.font = (b.bar || b.n < 0 ? '800 ' : '600 ') + '12px "DM Sans", sans-serif';
        ctx.fillText(b.n < 0 ? String(b.n + countIn + 1) : String(((b.n % 4) + 4) % 4 + 1), x, 15);
      });
      // hit line
      ctx.fillStyle = 'rgba(255,210,63,.18)'; ctx.fillRect(hitX - 10, TOP, 20, lanes.length * lh);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(hitX - 1.5, TOP, 3, lanes.length * lh);
      // lane targets + labels
      lanes.forEach((d, i) => {
        const y = TOP + i * lh + lh / 2, r = lh * 0.34;
        const fl = flashes[d.id] !== undefined ? Math.max(0, 1 - (now - flashes[d.id]) / 0.18) : 0;
        ctx.beginPath(); ctx.arc(hitX, y, r + 3 + fl * 5, 0, 7);
        ctx.strokeStyle = fl ? d.color : 'rgba(255,255,255,.35)'; ctx.lineWidth = 2.5; ctx.stroke();
        if (fl) { ctx.globalAlpha = fl * 0.5; ctx.fillStyle = d.color; ctx.fill(); ctx.globalAlpha = 1; }
      });
      // notes
      notes.forEach((n) => {
        const x = xOf(n.t);
        if (x < LABEL - 20 || x > Wd + 30) return;
        const i = laneOf[n.id], y = TOP + i * lh + lh / 2, r = lh * 0.34, d = K.byId(n.id);
        if (n.j === 'perfect' || n.j === 'good') {
          const k = (now - n.jt) / 0.25;
          if (k > 1) return;
          ctx.beginPath(); ctx.arc(hitX, y, r + k * 14, 0, 7);
          ctx.strokeStyle = d.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.stroke(); ctx.globalAlpha = 1;
          return;
        }
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7);
        if (n.demo && mode !== 'preview' && ex.echo) {
          ctx.strokeStyle = d.color; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7; ctx.stroke(); ctx.globalAlpha = 1;
          return;
        }
        ctx.fillStyle = n.j === 'miss' ? '#5d5785' : d.color; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + r * 0.25, r, 0.15 * Math.PI, 0.85 * Math.PI); ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = n.j === 'miss' ? '#aaa3d0' : '#15122b';
        ctx.font = '800 ' + Math.round(r * 0.95) + 'px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(K.keyFor(n.id).slice(0, 3), x, y + 1);
        ctx.textBaseline = 'alphabetic';
      });
      // labels drawn last so gems slide under them
      ctx.fillStyle = '#1c1838'; ctx.fillRect(0, TOP, LABEL, lanes.length * lh);
      lanes.forEach((d, i) => {
        const y = TOP + i * lh + lh / 2;
        ctx.fillStyle = d.color; ctx.fillRect(0, TOP + i * lh + 4, 4, lh - 8);
        ctx.textAlign = 'left'; ctx.font = '700 12px "DM Sans", sans-serif'; ctx.fillStyle = '#f6f2ff';
        ctx.fillText(d.short || d.name, 10, y - 2);
        ctx.font = '700 11px "DM Sans", sans-serif'; ctx.fillStyle = '#aaa3d0';
        ctx.fillText(K.keyFor(d.id), 10, y + 12);
      });
      // floating judgements
      for (let k = pops.length - 1; k >= 0; k--) {
        const p = pops[k], a = (now - p.t) / 0.6;
        if (a > 1) { pops.splice(k, 1); continue; }
        const y = p.lane === null ? TOP + 14 : TOP + p.lane * lh + lh / 2 - a * 16 - 4;
        ctx.globalAlpha = 1 - a; ctx.fillStyle = p.c; ctx.font = '800 14px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(p.text, hitX + 22, y); ctx.globalAlpha = 1;
      }
      // count-in numbers
      if (mode !== 'idle' && now < T0 + countIn * spb && now >= T0 - 0.05) {
        const b = Math.floor((now + lat * 0 - T0) / spb), k = ((now - T0) % spb) / spb;
        ctx.globalAlpha = 1 - k * 0.7; ctx.fillStyle = '#ffd23f';
        ctx.font = '800 ' + Math.round(Math.min(64, lanes.length * lh * 0.8)) + 'px "Bricolage Grotesque", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(Math.max(1, b + 1)), (LABEL + Wd) / 2 + 30, TOP + lanes.length * lh / 2);
        ctx.textBaseline = 'alphabetic'; ctx.globalAlpha = 1;
      }
      if (mode === 'idle' && !st) {
        ctx.fillStyle = 'rgba(21,18,43,.55)'; ctx.fillRect(LABEL, TOP, Wd - LABEL, lanes.length * lh);
      }
    }

    // initial frame: the first notes waiting to the right of the line
    T0 = 0; build(false);
    const t1 = countIn * spb;
    notes.forEach((n) => { n.t -= t1 - 0.6 * spb; });
    beats.forEach((b) => { b.t -= t1 - 0.6 * spb; });
    requestAnimationFrame(() => { size(); if (ro) ro.observe(el); });
    return {
      el,
      start: () => begin(false),
      preview: () => begin(true),
      stop: () => { stop(); if (ro) ro.disconnect(); },
      get running() { return mode !== 'idle'; },
    };
  }

  // =====================================================================
  // Find the drum: hit the drums in the row, in order. No timer.
  // =====================================================================
  function find(ex, hooks) {
    let i = 0, right = 0, wrong = 0, off = null;
    const chips = ex.seq.map((id) => {
      const d = K.byId(id);
      return h('span', { class: 'fchip', style: { '--c': d.color }, onanimationend: (e) => e.currentTarget.classList.remove('shake') }, h('b', null, d.short || d.name), h('kbd', null, K.keyFor(id)));
    });
    const msg = h('p', { class: 'fmsg', 'aria-live': 'polite' }, '');
    const el = h('div', { class: 'find' }, h('div', { class: 'frow' }, chips), msg);
    function mark() {
      chips.forEach((c, k) => { c.classList.toggle('cur', k === i); c.classList.toggle('ok', k < i); });
      if (i < ex.seq.length) {
        const d = K.byId(ex.seq[i]);
        msg.textContent = `Hit the ${d.name.toLowerCase()} (${K.keyFor(d.id)})`;
        if (hooks.target) hooks.target([d.id]);
      }
    }
    function onHit(id) {
      if (i >= ex.seq.length) return;
      if (id === ex.seq[i]) {
        right++; i++;
        mark();
        if (i >= ex.seq.length) {
          msg.textContent = 'Nice!';
          A.sfx('good');
          if (off) { off(); off = null; }
          setTimeout(() => hooks.done({ acc: Math.round(right / (right + wrong) * 100), right, wrong }), 450);
        }
      } else {
        wrong++;
        const c = chips[i];
        c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake');
        msg.textContent = `That was the ${K.byId(id).name.toLowerCase()}. Look for ${K.byId(ex.seq[i]).name.toLowerCase()} (${K.keyFor(ex.seq[i])}).`;
      }
    }
    return {
      el,
      start: () => { A.unlock(); i = 0; right = 0; wrong = 0; mark(); if (off) off(); off = K.on(onHit); },
      stop: () => { if (off) { off(); off = null; } },
    };
  }

  // =====================================================================
  // Ear: a drum plays; hit the one you heard.
  // =====================================================================
  function ear(ex, hooks) {
    const r = window.makeRng(Date.now() >>> 0);
    const rounds = [];
    for (let k = 0; k < ex.n; k++) {
      let id;
      do { id = r.pick(ex.pool); } while (k > 1 && id === rounds[k - 1] && id === rounds[k - 2]);
      rounds.push(id);
    }
    // make sure every drum in the pool comes up at least once
    ex.pool.forEach((id, k) => { if (!rounds.includes(id) && k < rounds.length) rounds[rounds.length - 1 - k] = id; });
    let i = 0, first = true, score = 0, off = null, lock = false, timer = 0;
    const dots = rounds.map(() => h('i'));
    const msg = h('p', { class: 'fmsg', 'aria-live': 'polite' }, '');
    const replay = h('button', { class: 'ghost hear big-hear', onclick: () => play() }, '🔊 Play it again');
    const el = h('div', { class: 'ear' }, h('div', { class: 'edots' }, dots), msg, replay);
    const play = () => { A.unlock(); A.hit(rounds[i], 105); };
    function round() {
      first = true; lock = false;
      dots.forEach((d, k) => d.classList.toggle('cur', k === i));
      msg.textContent = 'Listen… which drum is it? Hit it.';
      if (hooks.target) hooks.target(ex.pool);
      timer = setTimeout(play, 450);
    }
    function onHit(id) {
      if (lock || i >= rounds.length) return;
      const want = rounds[i];
      if (id === want) {
        lock = true;
        if (first) score++;
        dots[i].className = first ? 'ok' : 'meh';
        msg.textContent = `Yes! That was the ${K.byId(want).name.toLowerCase()}.`;
        A.sfx('good');
        i++;
        timer = setTimeout(() => {
          if (i >= rounds.length) { if (off) { off(); off = null; } hooks.done({ acc: Math.round(score / rounds.length * 100), score, n: rounds.length }); }
          else round();
        }, 900);
      } else {
        first = false;
        msg.textContent = `Not quite, that’s the ${K.byId(id).name.toLowerCase()}. Listen again…`;
        timer = setTimeout(play, 700);
      }
    }
    return {
      el,
      start: () => { i = 0; score = 0; dots.forEach((d) => { d.className = ''; }); if (off) off(); off = K.on(onHit); round(); },
      stop: () => { clearTimeout(timer); if (off) { off(); off = null; } },
    };
  }

  window.Play = { highway, find, ear };
})();
