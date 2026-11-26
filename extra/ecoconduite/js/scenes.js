/* The four scenario animations plus the home-screen loop.
   Each scene plays its "intro" until qAt, slows into it, then holds (the
   question is on screen). resume() lets the animation carry on (outro). */
(function () {
  'use strict';
  const Eco = (window.Eco = window.Eco || {});
  const D = Eco.D, C = D.C;
  const { clamp, lerp, prog, ease, hash, rr, circle, band, trees, carTop, bubble, pill } = D;
  const kmh = (v) => String(Math.round(v * 3.6));
  const num = (x, d) => x.toFixed(d).replace('.', ',');

  class Scene {
    constructor() {
      this.t = 0; this.real = 0; this.holdT = 0;
      this.phase = 'intro';
      this.cam = new D.Cam();
      this.captions = [];
      this.qAt = Infinity;
      this.started = false;
    }
    tick(dt) {
      this.real += dt;
      if (this.phase === 'hold') {
        this.holdT += dt;
      } else {
        let rate = 1;
        if (this.phase === 'intro') {
          const left = this.qAt - this.t;
          if (left < 1) rate = clamp(left, 0.22, 1); // slow-motion into the question
        }
        let rem = dt * rate;
        while (rem > 1e-6) {
          const h = Math.min(rem, 1 / 120);
          this.step(h);
          this.t += h;
          rem -= h;
          if (this.phase === 'intro' && this.t >= this.qAt) {
            this.phase = 'hold';
            if (this.onQuestion) this.onQuestion();
            break;
          }
        }
      }
      if (this.started) this.camera(dt);
    }
    resume() {
      if (this.phase !== 'outro') this.phase = 'outro';
    }
    caption() {
      let c = '';
      for (const [t, txt] of this.captions) if (this.t >= t) c = txt;
      return c;
    }
    render(ctx, view) {
      this.cam.setView(view);
      if (!this.started) {
        this.camera(0.016);
        this.cam.snap();
        this.started = true;
      }
      this.draw(ctx, view);
    }
    get answered() { return this.phase === 'outro'; }
  }

  /* ------------------------------------------------------------------ */
  /* Scénario 1 — Anticiper (rue de quartier, ballon, piéton, cycliste)  */
  /* ------------------------------------------------------------------ */
  class CityScene extends Scene {
    constructor() {
      super();
      this.qAt = 7.0;
      this.V = 50 / 3.6; this.tSee = 3.0; this.react = 1.5; this.dec = 7;
      this.car = { x: 0, v: this.V, brake: 0 };
      this.m = {};
      this.restartAt = null;
      this.ped = { x: 90.5, y: -7.5, dir: 0, ph: 0, st: 'walk' };
      this.ball = { x: 82.5, y: -7.6, rot: 0 };
      this.captions = [
        [0, 'Rue de quartier à 50 km/h. Un cycliste roule à ta droite.'],
        [1.6, 'Un piéton s’approche du passage.'],
        [3.0, 'Un ballon surgit entre deux voitures !'],
        [3.35, 'Temps de réaction : ton pied n’a pas encore bougé…'],
        [4.5, 'Freinage d’urgence.'],
      ];
      this.parked = [];
      for (let k = -12; k <= 34; k++) {
        const x = k * 6.6 + hash(k * 1.3) * 1.0;
        if ((x > 75.5 && x < 89.5) || (x > 94.5 && x < 105.5)) continue;
        const forced = Math.abs(x - 73) < 3.4 || Math.abs(x - 92) < 3.4;
        if (!forced && hash(k * 3.1 + 2) > 0.8) continue;
        this.parked.push({ x, c: C.traffic[Math.floor(hash(k * 9.7) * C.traffic.length)] });
      }
    }
    step(h) {
      const t = this.t, c = this.car, tB = this.tSee + this.react;
      if (t < tB) {
        c.v = this.V; c.brake = 0;
      } else if (this.restartAt === null) {
        if (c.v > 0) {
          c.v = Math.max(0, c.v - this.dec * h); c.brake = 1;
          if (c.v === 0) this.m.stop = c.x;
        } else c.brake = 0.55;
      } else {
        c.v = Math.min(this.V, c.v + (c.v < 30 / 3.6 ? 1.5 : 0.9) * h);
        c.brake = Math.max(0, c.brake - h * 3);
      }
      if (this.m.see === undefined && t >= this.tSee) this.m.see = c.x;
      if (this.m.brk === undefined && t >= tB) this.m.brk = c.x;
      c.x += c.v * h;

      const b = this.ball;
      if (t >= 2.85) {
        const vy = this.phase === 'intro' || this.phase === 'hold' ? 2.3 : 2.3 * clamp((7.0 - b.y) / 2.5, 0, 1);
        b.y += vy * h;
        b.rot += (vy * h) / 0.36;
      }

      const p = this.ped;
      if (p.st === 'walk') {
        p.x += 1.4 * h; p.ph += h * 1.4; p.dir = 0;
        if (p.x >= 99.2) { p.x = 99.2; p.st = 'wait'; }
      } else if (p.st === 'wait') {
        p.dir += (Math.PI / 2 - p.dir) * Math.min(1, h * 6);
        if (this.answered && t > this.qAt + 0.35) p.st = 'cross';
      } else if (p.st === 'cross') {
        p.dir = Math.PI / 2; p.y += 3.0 * h; p.ph += h * 3.0;
        if (p.y >= 7.0) p.st = 'away';
      } else {
        p.dir += (0 - p.dir) * Math.min(1, h * 6); p.x += 1.4 * h; p.ph += h * 1.4;
      }
      if (this.restartAt === null && (p.st === 'cross' || p.st === 'away') && p.y > 4.3) this.restartAt = t;
    }
    camera(dt) {
      const cam = this.cam, c = this.car;
      cam.ax = 0.25;
      const tracking = this.t < this.tSee + 0.5 || (this.restartAt !== null && this.t > this.restartAt + 2.6);
      if (tracking) {
        cam.tppm = Math.min(clamp(cam.W / 58, 8, 26), (cam.vh * 0.92) / 21);
        cam.tx = c.x + 4;
        cam.follow(dt, 2.5);
      } else {
        cam.frame(38, 105, { margin: 0.03, spanY: 21 });
        cam.follow(dt, 2.0);
      }
      cam.ty = -0.3;
    }
    drawBlocks(ctx) {
      const cam = this.cam, p = cam.ppm;
      const cell = 15, k0 = Math.floor(cam.wx0() / cell) - 1, k1 = Math.ceil(cam.wx1() / cell) + 1;
      for (let k = k0; k <= k1; k++) {
        const w = cell - 1.6 - hash(k * 1.9) * 3, d = 9 + hash(k * 4.3) * 9, set = 1.6 + hash(k * 7.7) * 1.4;
        const x = cam.sx(k * cell), y1 = cam.sy(-9 - set), y0 = cam.sy(-9 - set - d);
        ctx.fillStyle = 'rgba(15,23,42,0.08)';
        ctx.fillRect(x + 4, y0 + 5, w * p, y1 - y0);
        ctx.fillStyle = C.roof[Math.floor(hash(k * 2.2) * C.roof.length)];
        ctx.fillRect(x, y0, w * p, y1 - y0);
        ctx.fillStyle = 'rgba(15,23,42,0.06)';
        ctx.fillRect(x + w * p * 0.6, y0 + (y1 - y0) * 0.25, w * p * 0.22, (y1 - y0) * 0.3);
      }
      const hc = 14, j0 = Math.floor(cam.wx0() / hc) - 1, j1 = Math.ceil(cam.wx1() / hc) + 1;
      for (let k = j0; k <= j1; k++) {
        if (hash(k * 3.3 + 5) > 0.86) continue;
        const w = 8 + hash(k * 2.9) * 3, d = 7 + hash(k * 6.1) * 2.5, set = 4.2 + hash(k * 8.3) * 1.8;
        const x = cam.sx(k * hc + 1), y0 = cam.sy(8.4 + set), y1 = cam.sy(8.4 + set + d);
        ctx.fillStyle = '#DCD8CD';
        ctx.fillRect(x + w * p - 3.2 * p, cam.sy(8.4), 3 * p, y0 - cam.sy(8.4));
        ctx.fillStyle = 'rgba(15,23,42,0.1)';
        ctx.fillRect(x + 4, y0 + 5, w * p, y1 - y0);
        const col = C.roof[Math.floor(hash(k * 5.5) * C.roof.length)];
        ctx.fillStyle = col;
        ctx.fillRect(x, y0, w * p, (y1 - y0) / 2);
        ctx.fillStyle = 'rgba(15,23,42,0.12)';
        ctx.fillRect(x, y0 + (y1 - y0) / 2, w * p, (y1 - y0) / 2);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(x, y0 + (y1 - y0) / 2, w * p, (y1 - y0) / 2);
        ctx.globalAlpha = 1;
      }
    }
    draw(ctx) {
      const cam = this.cam, W = cam.W, H = cam.H, p = cam.ppm, t = this.t, c = this.car, m = this.m;
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, 0, W, H);
      this.drawBlocks(ctx);
      trees(ctx, cam, 9.6, 11.5, 21, { cell: 11, density: 0.7, rMin: 1.4, rMax: 2.3 });
      band(ctx, cam, -9, -6, C.sidewalk);
      band(ctx, cam, 5.4, 8.4, C.sidewalk);
      ctx.fillStyle = 'rgba(15,23,42,0.05)';
      for (let k = Math.floor(cam.wx0() / 3); k <= Math.ceil(cam.wx1() / 3); k++) {
        const x = cam.sx(k * 3);
        ctx.fillRect(x, cam.sy(-9), 1, 3 * p);
        ctx.fillRect(x, cam.sy(5.4), 1, 3 * p);
      }
      band(ctx, cam, -6, 5.4, C.asphalt);
      band(ctx, cam, -6.15, -6, C.curb);
      band(ctx, cam, 5.4, 5.55, C.curb);
      const lw = Math.max(1.5, p * 0.13);
      D.hline(ctx, cam, -0.2, C.yellow, lw);
      D.hline(ctx, cam, 0.2, C.yellow, lw);
      D.hline(ctx, cam, 3.6, C.line, lw);
      // painted bike symbol
      for (let k = Math.floor(cam.wx0() / 45) - 1; k <= Math.ceil(cam.wx1() / 45); k++) {
        const x = cam.sx(k * 45 + 20), y = cam.sy(4.5);
        ctx.strokeStyle = 'rgba(244,242,234,0.55)';
        ctx.lineWidth = Math.max(1.2, p * 0.08);
        ctx.beginPath();
        ctx.arc(x - 0.45 * p, y, 0.28 * p, 0, Math.PI * 2);
        ctx.arc(x + 0.45 * p, y, 0.28 * p, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(244,242,234,0.92)';
      for (let y = -5.7; y < 5.2; y += 1.3) {
        ctx.fillRect(cam.sx(98.4), cam.sy(y), 3.2 * p, 0.62 * p);
      }

      // Reaction + braking zones on the car's lane.
      const fade = this.restartAt !== null ? 1 - prog(t, this.restartAt + 2.2, this.restartAt + 3.4) : 1;
      if (m.see !== undefined && fade > 0) {
        const rEnd = m.brk !== undefined ? m.brk : c.x;
        const zy0 = cam.sy(0.45), zy1 = cam.sy(3.15);
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.fillStyle = 'rgba(255,176,32,0.32)';
        ctx.fillRect(cam.sx(m.see), zy0, (rEnd - m.see) * p, zy1 - zy0);
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2;
        ctx.strokeStyle = C.amber;
        ctx.strokeRect(cam.sx(m.see), zy0, (rEnd - m.see) * p, zy1 - zy0);
        if (m.brk !== undefined) {
          const bEnd = m.stop !== undefined ? m.stop : c.x;
          ctx.fillStyle = 'rgba(244,242,234,0.2)';
          ctx.fillRect(cam.sx(m.brk), zy0, (bEnd - m.brk) * p, zy1 - zy0);
          ctx.strokeStyle = 'rgba(244,242,234,0.85)';
          ctx.strokeRect(cam.sx(m.brk), zy0, (bEnd - m.brk) * p, zy1 - zy0);
        }
        ctx.restore();
      }

      for (const pc of this.parked) carTop(ctx, cam, pc.x, -4.8, { color: pc.c, rot: Math.PI });
      D.cyclistTop(ctx, cam, 58 + 5 * t, 4.5, t * 5, C.ok);
      const ring = 0.9 * (1 - prog(t, 1.6, 2.6)) * (0.55 + 0.45 * Math.sin(this.real * 6));
      carTop(ctx, cam, c.x - 2.3, 1.8, { color: C.action, brake: c.brake, ring });
      if (t >= 2.85) D.ballTop(ctx, cam, this.ball.x, this.ball.y, this.ball.rot);
      D.pedTop(ctx, cam, this.ped.x, this.ped.y, this.ped.dir, this.ped.ph, C.structure);

      // Labels
      if (t < 3.4) pill(ctx, cam.sx(58 + 5 * t), cam.sy(4.5) + 0.9 * p + 16, 'Cycliste', { fs: 13, dot: C.ok, alpha: 1 - prog(t, 2.8, 3.4) });
      if (t > 1.3 && t < 5.4) pill(ctx, cam.sx(this.ped.x), cam.sy(this.ped.y) - 0.7 * p - 18, 'Piéton', { fs: 13, dot: C.structure, alpha: Math.min(prog(t, 1.3, 1.8), 1 - prog(t, 4.9, 5.4)) });
      if (t >= 3 && t < 5.2) D.alertPop(ctx, cam.sx(this.ball.x), cam.sy(this.ball.y) - 0.36 * p - 20, prog(t, 3, 3.35) * (1 - prog(t, 4.9, 5.2)));

      if (m.see !== undefined && fade > 0) {
        const rEnd = m.brk !== undefined ? m.brk : c.x;
        const ly = cam.sy(6.9);
        let rl;
        if (t < this.tSee + this.react) rl = 'Réaction · ' + num(t - this.tSee, 1) + ' s';
        else if (this.phase === 'intro') rl = 'Réaction · 1,5 s';
        else if (this.phase === 'hold') rl = 'Réaction : ? m';
        else rl = 'Réaction ≈ 21 m';
        const pulse = this.phase === 'hold' ? 0.75 + 0.25 * Math.sin(this.real * 5) : 1;
        if (rEnd - m.see > 0.5) pill(ctx, cam.sx((m.see + rEnd) / 2), ly, rl, { fs: 14, dot: C.amber, alpha: fade * pulse });
        if (m.brk !== undefined) {
          const bEnd = m.stop !== undefined ? m.stop : c.x;
          const bl = this.answered ? 'Freinage ≈ 14 m' : 'Freinage';
          if (bEnd - m.brk > 0.5) pill(ctx, cam.sx((m.brk + bEnd) / 2), ly, bl, { fs: 14, dot: '#94A3B8', alpha: fade });
        }
      }
      bubble(ctx, cam.sx(c.x - 2.3), cam.sy(1.8) - 1.25 * p, kmh(c.v), 'km/h', { tag: 'TOI' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scénario 2 — Effet accordéon                                         */
  /* ------------------------------------------------------------------ */
  class WaveScene extends Scene {
    constructor() {
      super();
      this.V = 70 / 3.6; this.N = 7; this.tau = 0.45; this.T0 = 2.0; this.hero = 5; this.gap = 16;
      this.cars = [];
      for (let i = 0; i < this.N; i++) {
        const m = Math.max(0, 34 - i * 9) / 3.6, a = 5.5 + 0.45 * i, s = this.T0 + i * this.tau;
        const e = s + (this.V - m) / a;
        this.cars.push({
          i, x: -i * this.gap, v: this.V, m, a, s, e, r: m > 0 ? e + 0.45 + 0.12 * i : null,
          brake: 0, dec: 0, color: i === this.hero ? C.action : C.traffic[(i * 2 + 1) % C.traffic.length],
        });
      }
      this.lastE = this.cars[this.N - 1].e;
      this.qAt = this.lastE + 0.6;
      this.captions = [
        [0, 'Une file de voitures roule à vitesse constante.'],
        [this.T0, 'La première freine d’un coup… sans aucune raison.'],
        [this.T0 + 1.2, 'Chaque voiture freine un peu plus fort que celle devant.'],
        [this.T0 + 3.0, 'La vague remonte la file… jusqu’à l’arrêt complet.'],
      ];
    }
    vAt(c, t) {
      if (t < c.s) return this.V;
      if (t < c.e) return this.V - c.a * (t - c.s);
      if (c.r === null || t < c.r) return c.m;
      return Math.min(this.V, c.m + (c.m > 0 ? 1.8 : 2.1) * (t - c.r));
    }
    resume() {
      if (this.phase === 'outro') return;
      super.resume();
      let k = 0;
      for (const c of this.cars) if (c.r === null) { c.r = this.qAt + 0.5 + k * 0.65; k++; }
    }
    step(h) {
      const t = this.t, cs = this.cars;
      for (const c of cs) {
        const v = this.vAt(c, t);
        c.dec = (c.v - v) / h;
        c.v = v;
        c.x += v * h;
      }
      for (let i = 1; i < this.N; i++) if (cs[i].x > cs[i - 1].x - 6.4) cs[i].x = cs[i - 1].x - 6.4;
      for (const c of cs) {
        const target = c.dec > 0.5 ? clamp(c.dec / 8, 0.4, 1) : c.v < 0.3 ? 0.5 : 0;
        c.brake += (target - c.brake) * Math.min(1, h * 12);
      }
    }
    camera(dt) {
      const cam = this.cam, cs = this.cars, hero = cs[this.hero];
      cam.ax = 0.5;
      const last = cs[this.N - 1].x;
      const late = this.t > this.T0 + 2.2;
      const back = late ? last - 26 : last - 7, front = late ? last + 82 : Math.min(cs[0].x + 4, last + 105);
      cam.frame(back, front, { margin: 0.04, max: cam.W / 55, spanY: 17 });
      cam.ty = 0.7;
      cam.follow(dt, 2.5);
    }
    draw(ctx) {
      const cam = this.cam, W = cam.W, H = cam.H, p = cam.ppm, t = this.t, cs = this.cars;
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, 0, W, H);
      trees(ctx, cam, -16, -7.5, 3, { cell: 9, density: 0.8 });
      trees(ctx, cam, 8.5, 18, 7, { cell: 9, density: 0.6 });
      D.road(ctx, cam, { lanes: 2, laneW: 4, type: 'twoway', shoulder: 0.7 });

      const ph = 22 * t, sp = 48;
      for (let j = Math.floor((cam.wx0() - 10 + ph) / sp); j <= Math.ceil((cam.wx1() + 10 + ph) / sp); j++) {
        if (hash(j * 4.1 + 1) > 0.6) continue;
        carTop(ctx, cam, j * sp - ph, -2, { color: C.traffic[Math.floor(hash(j * 2.3) * C.traffic.length)], rot: Math.PI });
      }

      // Braking wave glow
      const waveOn = t >= this.T0 && (this.phase !== 'outro' || t < this.qAt + 0.8);
      let wx = null;
      if (waveOn) {
        const k = clamp((t - this.T0) / this.tau, 0, this.N - 1), i0 = Math.floor(k), i1 = Math.min(this.N - 1, i0 + 1);
        wx = lerp(cs[i0].x, cs[i1].x, k - i0) - 2.3;
        const g = ctx.createRadialGradient(cam.sx(wx), cam.sy(2), 0, cam.sx(wx), cam.sy(2), 9 * p);
        g.addColorStop(0, 'rgba(255,59,47,0.38)');
        g.addColorStop(1, 'rgba(255,59,47,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cam.sx(wx) - 9 * p, cam.sy(-1), 18 * p, 6 * p);
      }
      cs.forEach((c, i) => {
        const ring = i === this.hero ? 0.9 * (1 - prog(t, 1.4, 2.4)) * (0.55 + 0.45 * Math.sin(this.real * 6)) : 0;
        carTop(ctx, cam, c.x - 2.3, 2, { color: c.color, brake: c.brake, ring });
      });

      const top = cam.sy(-4.7), bottom = cam.sy(4.7);
      if (waveOn && wx !== null) {
        const a = this.phase === 'outro' ? 1 - prog(t, this.qAt, this.qAt + 0.8) : 1;
        const label = t > this.lastE ? 'Arrêt complet' : '← Vague de freinage';
        pill(ctx, cam.sx(wx), top - 22, label, { fs: 14, dot: '#FF3B2F', alpha: a });
      }
      if (t > this.lastE) {
        const a = this.phase === 'outro' ? 1 - prog(t, this.qAt + 1.5, this.qAt + 2.3) : prog(t, this.lastE, this.lastE + 0.4);
        const mid = (cs[4].x + cs[this.N - 1].x) / 2 - 2.3;
        pill(ctx, cam.sx(mid) + 40, bottom + 92, 'Aucun obstacle · aucun accident · aucun feu', { fs: 14, dot: C.ok, alpha: a, align: 'left' });
      }
      const lead = cs[0], hero = cs[this.hero];
      bubble(ctx, clamp(cam.sx(lead.x - 2.3), 40, W - 40), bottom + 10, kmh(lead.v), 'km/h', { below: true });
      bubble(ctx, cam.sx(hero.x - 2.3), bottom + 10, kmh(hero.v), 'km/h', { below: true, tag: 'TOI' });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scénario 3 — 100 vs 120 km/h, distance d'arrêt                       */
  /* ------------------------------------------------------------------ */
  class SpeedScene extends Scene {
    constructor() {
      super();
      this.tb = 2.2; this.react = 1.5; this.dec = 7; this.obsX = 142; this.len = 5.2;
      const A = { v0: 100 / 3.6, y: 2, color: C.ok };
      const B = { v0: 120 / 3.6, y: -2, color: C.action };
      for (const c of [A, B]) { c.v = c.v0; c.x = -c.v0 * this.tb; c.brake = 0; c.stopX = null; }
      this.A = A; this.B = B;
      this.qAt = this.tb + this.react + B.v0 / this.dec + 0.7;
      this.queue = [];
      for (const y of [-2, 2]) for (let j = 0; j < 4; j++) {
        this.queue.push({ x: this.obsX + 2.6 + j * 6.8 + (y > 0 ? 1.2 : 0), y, v: 0, c: C.traffic[(j + (y > 0 ? 2 : 0)) % C.traffic.length] });
      }
      this.passSpeed = null;
      this.captions = [
        [0, 'Autoroute : une voiture à 100 km/h, l’autre à 120 km/h.'],
        [this.tb, 'Obstacle ! Les deux conducteurs le voient au même moment.'],
        [this.tb + this.react, 'Les deux freinent à fond.'],
        [this.tb + 4.6, 'Regarde où chacune s’arrête.'],
      ];
    }
    step(h) {
      const t = this.t, tr = this.tb + this.react;
      for (const c of [this.A, this.B]) {
        if (t < tr) { c.v = c.v0; c.brake = 0; }
        else if (!this.answered || t < this.qAt + 3.4) {
          if (c.v > 0) {
            c.v = Math.max(0, c.v - this.dec * h); c.brake = 1;
            if (c.v === 0) c.stopX = c.x;
          } else c.brake = 0.5;
        } else {
          c.v = Math.min(c.v0, c.v + 2.6 * h);
          c.brake = Math.max(0, c.brake - 3 * h);
        }
        c.x += c.v * h;
      }
      if (this.passSpeed === null && this.B.x >= this.A.v0 * this.react + (this.A.v0 * this.A.v0) / (2 * this.dec)) this.passSpeed = this.B.v * 3.6;
      if (this.answered && t > this.qAt + 1.8) for (const q of this.queue) { q.v = Math.min(30, q.v + 3 * h); q.x += q.v * h; }
    }
    camera(dt) {
      const cam = this.cam, t = this.t;
      cam.ax = 0.5;
      const framed = t > this.tb + 0.3 && !(this.answered && t > this.qAt + 4.4);
      if (framed) {
        cam.frame(-16, this.obsX + 18, { margin: 0.02, spanY: 18 });
        cam.follow(dt, 1.8);
      } else {
        const mid = (this.A.x + this.B.x) / 2 - 2.6;
        cam.tppm = Math.min(clamp(cam.W / 72, 6, 22), (cam.vh * 0.9) / 18);
        cam.tx = mid + 6;
        cam.follow(dt, 2.4);
      }
      cam.ty = 1.4;
    }
    draw(ctx) {
      const cam = this.cam, W = cam.W, H = cam.H, p = cam.ppm, t = this.t, A = this.A, B = this.B;
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, 0, W, H);
      trees(ctx, cam, -22, -7, 11, { cell: 10, density: 0.75, rMin: 1.6, rMax: 3 });
      trees(ctx, cam, 13, 26, 17, { cell: 10, density: 0.6, rMin: 1.6, rMax: 3 });
      D.road(ctx, cam, { lanes: 2, laneW: 4, type: 'oneway', shoulder: 1.2 });
      const top = cam.sy(-5.2), bot = cam.sy(5.2);

      const blink = Math.floor(this.real * 2.6) % 2 === 0 && t >= this.tb && !(this.answered && t > this.qAt + 1.8);
      for (const q of this.queue) carTop(ctx, cam, q.x, q.y, { color: q.c, hazard: blink, len: this.len, wid: 2.2 });

      // Detection line at 0 m
      if (t >= this.tb) {
        const a = Math.min(prog(t, this.tb, this.tb + 0.3), this.answered ? 1 - prog(t, this.qAt + 4, this.qAt + 4.8) : 1);
        ctx.save();
        ctx.globalAlpha = a;
        ctx.setLineDash([7, 6]);
        ctx.strokeStyle = 'rgba(244,242,234,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cam.sx(0), top);
        ctx.lineTo(cam.sx(0), bot);
        ctx.stroke();
        ctx.restore();
      }
      for (const c of [A, B]) {
        if (c.stopX === null) continue;
        const a = this.answered ? 1 - prog(t, this.qAt + 4.4, this.qAt + 5.2) : 1;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = c.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cam.sx(c.stopX), cam.sy(c.y - 2.4));
        ctx.lineTo(cam.sx(c.stopX), bot + 10);
        ctx.stroke();
        ctx.restore();
      }
      carTop(ctx, cam, A.x - 2.6, A.y, { color: A.color, brake: A.brake, len: this.len, wid: 2.2 });
      carTop(ctx, cam, B.x - 2.6, B.y, { color: B.color, brake: B.brake, len: this.len, wid: 2.2 });

      // Ruler + flags
      const rA = Math.min(prog(t, this.tb + 0.2, this.tb + 0.8), this.answered ? 1 - prog(t, this.qAt + 4.4, this.qAt + 5.2) : 1);
      const rTop = bot + 10;
      if (rA > 0) D.ruler(ctx, cam, 0, 150, rTop, { alpha: rA });
      const flagY = rTop + 30 + 20;
      for (const c of [A, B]) {
        if (c.stopX === null) continue;
        const val = c === A ? '97 m' : '129 m';
        const label = this.answered ? val : '? m';
        pill(ctx, cam.sx(c.stopX), flagY, label, { num: true, fs: 15, bg: c.color, color: '#fff', alpha: rA, flat: true });
      }
      // Speed bubbles while moving
      if (A.stopX === null) bubble(ctx, cam.sx(A.x - 2.6), rA > 0.05 ? flagY - 12 : bot + 10, kmh(A.v), 'km/h', { below: true, border: C.ok });
      if (B.stopX === null) bubble(ctx, cam.sx(B.x - 2.6), top - 10, kmh(B.v), 'km/h', { border: C.action });

      if (t >= this.tb) {
        const a = this.answered ? 1 - prog(t, this.qAt + 1.6, this.qAt + 2.2) : prog(t, this.tb, this.tb + 0.3);
        const qx = Math.min(cam.sx(this.obsX + 10), W - 90);
        pill(ctx, qx, top - 24, 'Obstacle', { fs: 14, dot: C.amber, alpha: a });
        D.alertPop(ctx, qx, top - 62, a * prog(t, this.tb, this.tb + 0.4));
      }
      if (this.answered && A.stopX !== null && B.stopX !== null) {
        const a = prog(t, this.qAt + 0.2, this.qAt + 0.6) * (1 - prog(t, this.qAt + 4.4, this.qAt + 5.2));
        const x0 = cam.sx(A.stopX), x1 = cam.sx(B.stopX), y = top - 18;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.strokeStyle = C.structure;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x0, y + 8); ctx.lineTo(x0, y); ctx.lineTo(x1, y); ctx.lineTo(x1, y + 8);
        ctx.stroke();
        ctx.restore();
        pill(ctx, (x0 + x1) / 2, y, '+32 m', { num: true, fs: 16, bg: C.structure, color: '#fff', alpha: a });
        if (this.passSpeed) {
          pill(ctx, x0 - 46, bot + 10 + 30 + 20, 'À ce point, la voiture à 120 roule encore à ' + Math.round(this.passSpeed) + ' km/h', { fs: 14, dot: C.action, alpha: a, align: 'right' });
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Scénario 4 — Pression des pneus (vue de côté)                        */
  /* ------------------------------------------------------------------ */
  class TireScene extends Scene {
    constructor() {
      super();
      this.V = 50 / 3.6; this.tBrake = 2.0; this.dec = 5.2;
      this.zoomAt = 4.2; this.eyeAt = 5.1; this.gaugeIn = 6.0; this.needle = [6.2, 7.3];
      this.qAt = 7.9;
      this.car = { x: 0, v: this.V };
      this.psi = 0; this.rot = 0; this.squash = 0.03; this.basePpm = 120;
      this.captions = [
        [0, 'Une voiture roule normalement.'],
        [this.tBrake, 'Petit arrêt : on regarde le pneu avant de près…'],
        [this.eyeAt, 'À l’œil, il a l’air parfaitement normal.'],
        [this.gaugeIn, 'Le manomètre, lui, dit autre chose.'],
      ];
    }
    step(h) {
      const t = this.t, c = this.car;
      if (t < this.tBrake) c.v = this.V;
      else if (!this.answered || t < this.qAt + 4.4) c.v = Math.max(0, c.v - this.dec * h);
      else c.v = Math.min(this.V, c.v + 2.4 * h);
      c.x += c.v * h;
      this.rot += (c.v * h) / 0.33;
      if (t < this.needle[0]) this.psi = 0;
      else this.psi = 27 * ease.back(prog(t, this.needle[0], this.needle[1]));
      if (this.answered) {
        const k = ease.inOut(prog(t, this.qAt + 0.6, this.qAt + 2.8));
        this.psi = 27 + 8 * k;
        this.squash = lerp(0.03, 0.014, k);
      }
    }
    camera(dt) {
      const cam = this.cam, t = this.t, c = this.car;
      this.basePpm = Math.min(cam.W / 9.5, (cam.vh * 0.34) / 1.45);
      const zoom = t >= this.zoomAt && !(this.answered && t > this.qAt + 3.6);
      if (zoom) {
        cam.tax = 0.34; cam.tx = c.x + 3.55; cam.ty = -0.36;
        cam.tppm = Math.min(cam.W / 3.4, (cam.vh * 0.5) / 0.66);
        cam.follow(dt, 2.0);
      } else {
        cam.tax = 0.5; cam.tx = c.x + 2.25; cam.ty = -0.8;
        cam.tppm = this.basePpm;
        cam.follow(dt, 2.4);
      }
    }
    sp(x, h) { return [this.cam.sx(x), this.cam.sy(-h)]; }
    drawBackground(ctx) {
      const cam = this.cam, W = cam.W, H = cam.H, gy = cam.sy(-0.45), bp = this.basePpm;
      const g = ctx.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, '#F6F5F0');
      g.addColorStop(1, '#E7EEE4');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, gy + 2);
      const layer = (f, base, amp, freq, color, seed) => {
        const off = cam.x * bp * f;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, gy + 2);
        for (let x = 0; x <= W + 24; x += 24) {
          const u = (x + off) * freq;
          const y = gy - base - amp * (0.55 + 0.3 * Math.sin(u + seed) + 0.15 * Math.sin(u * 2.3 + seed * 2));
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, gy + 2);
        ctx.closePath();
        ctx.fill();
      };
      layer(0.08, bp * 0.9, bp * 1.1, 0.004, '#DCE7D8', 1);
      layer(0.2, bp * 0.3, bp * 0.8, 0.007, '#CADDC6', 4);
      // mid-ground trees + posts
      const f = 0.5, pp = bp * f, sp = 7;
      const wx0 = cam.x * f - (W * cam.ax) / pp - 4, wx1 = wx0 + W / pp + 8;
      for (let k = Math.floor(wx0 / sp); k <= Math.ceil(wx1 / sp); k++) {
        if (hash(k * 1.7 + 3) > 0.7) continue;
        const wx = k * sp + hash(k * 2.3) * 4;
        const x = (wx - cam.x * f) * pp + W * cam.ax;
        const th = (1.3 + hash(k * 5.1) * 1.0) * pp, r = (0.55 + hash(k * 3.7) * 0.35) * pp;
        ctx.fillStyle = '#8E9E8E';
        ctx.fillRect(x - 0.08 * pp, gy - th, 0.16 * pp, th);
        ctx.fillStyle = hash(k * 9.1) > 0.5 ? '#9CC2A6' : '#86B394';
        circle(ctx, x, gy - th, r);
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        circle(ctx, x - r * 0.3, gy - th - r * 0.3, r * 0.45);
      }
      // road (seen from the side) and near verge
      const r0 = cam.sy(-0.45), r1 = cam.sy(0.6);
      ctx.fillStyle = C.asphalt;
      ctx.fillRect(0, r0, W, r1 - r0);
      ctx.fillStyle = 'rgba(244,242,234,0.5)';
      ctx.fillRect(0, r0, W, Math.max(1, cam.ppm * 0.03));
      D.dashes(ctx, cam, 0.3, C.line, Math.max(2, cam.ppm * 0.06), 3, 6);
      ctx.fillStyle = C.curb;
      ctx.fillRect(0, r1, W, Math.max(2, cam.ppm * 0.08));
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, r1 + Math.max(2, cam.ppm * 0.08), W, H);
    }
    wheel(ctx, wx, squash) {
      const cam = this.cam, p = cam.ppm, r = 0.33;
      const [x, y] = this.sp(wx, r - squash), g = cam.sy(0);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - r * p * 1.6, y - r * p * 1.6, r * p * 3.2, g - (y - r * p * 1.6));
      ctx.clip();
      ctx.fillStyle = '#151B26';
      circle(ctx, x, y, r * p);
      // slight sidewall bulge at the contact patch
      ctx.beginPath();
      ctx.ellipse(x, g - squash * p * 1.2, r * p * (0.7 + squash * 4), squash * p * 3 + 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = Math.max(1, 0.025 * p);
      ctx.beginPath(); ctx.arc(x, y, r * p * 0.86, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#D7DCE3';
      circle(ctx, x, y, 0.215 * p);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = Math.max(1, 0.012 * p);
      ctx.beginPath(); ctx.arc(x, y, 0.215 * p, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#A3AEBD';
      ctx.lineWidth = Math.max(2, 0.04 * p);
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const a = this.rot + (i * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 0.05 * p, y + Math.sin(a) * 0.05 * p);
        ctx.lineTo(x + Math.cos(a) * 0.19 * p, y + Math.sin(a) * 0.19 * p);
        ctx.stroke();
      }
      ctx.fillStyle = '#64748B';
      circle(ctx, x, y, 0.045 * p);
      const va = this.rot + Math.PI / 5;
      const vx = x + Math.cos(va) * 0.2 * p, vy = y + Math.sin(va) * 0.2 * p;
      ctx.fillStyle = '#0F172A';
      circle(ctx, vx, vy, Math.max(2, 0.018 * p));
      return { x, y, r: r * p, vx, vy };
    }
    drawCar(ctx) {
      const cam = this.cam, p = cam.ppm, c = this.car, X = c.x;
      const P = (a, b) => this.sp(X + a, b);
      ctx.save();
      ctx.fillStyle = 'rgba(15,23,42,0.18)';
      ctx.beginPath();
      ctx.ellipse(cam.sx(X + 2.25), cam.sy(0.02), 2.4 * p, 0.09 * p, 0, 0, Math.PI * 2);
      ctx.fill();
      const body = [[0.05, 0.36], [0, 0.62], [0.06, 0.9], [0.22, 0.99], [1.05, 1.03], [1.55, 1.42], [2.95, 1.45], [3.5, 1.05], [4.3, 0.94], [4.5, 0.73], [4.48, 0.42], [4.35, 0.32]];
      ctx.fillStyle = C.action;
      ctx.beginPath();
      body.forEach(([a, b], i) => { const [x, y] = P(a, b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(15,23,42,0.1)';
      ctx.beginPath();
      [[0.05, 0.36], [0.02, 0.55], [4.49, 0.55], [4.35, 0.32]].forEach(([a, b], i) => { const [x, y] = P(a, b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fill();
      const glass = (pts) => {
        ctx.beginPath();
        pts.forEach(([a, b], i) => { const [x, y] = P(a, b); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
        ctx.closePath();
        ctx.fill();
      };
      ctx.fillStyle = C.glass;
      glass([[1.22, 1.06], [1.63, 1.36], [2.24, 1.38], [2.24, 1.06]]);
      glass([[2.36, 1.06], [2.36, 1.38], [2.9, 1.38], [3.33, 1.06]]);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      glass([[2.5, 1.08], [2.5, 1.34], [2.62, 1.34], [2.62, 1.08]]);
      ctx.strokeStyle = 'rgba(15,23,42,0.25)';
      ctx.lineWidth = Math.max(1, 0.012 * p);
      ctx.beginPath();
      let [x, y] = P(2.3, 1.04); ctx.moveTo(x, y); [x, y] = P(2.3, 0.4); ctx.lineTo(x, y);
      [x, y] = P(3.42, 1.0); ctx.moveTo(x, y); [x, y] = P(3.42, 0.45); ctx.lineTo(x, y);
      ctx.stroke();
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      [x, y] = P(1.95, 0.88); rr(ctx, x, y, 0.18 * p, 0.04 * p, 2); ctx.fill();
      [x, y] = P(3.05, 0.88); rr(ctx, x, y, 0.18 * p, 0.04 * p, 2); ctx.fill();
      ctx.fillStyle = '#FFF3D1';
      [x, y] = P(4.32, 0.84); rr(ctx, x, y, 0.16 * p, 0.08 * p, 3); ctx.fill();
      ctx.fillStyle = '#C0352B';
      [x, y] = P(0.0, 0.86); rr(ctx, x, y, 0.1 * p, 0.12 * p, 3); ctx.fill();
      ctx.fillStyle = '#0F172A';
      for (const wx of [0.9, 3.55]) { const [a, b] = P(wx, 0.33); circle(ctx, a, b, 0.385 * p); }
      ctx.restore();
      this.wheel(ctx, X + 0.9, 0.014);
      return this.wheel(ctx, X + 3.55, this.squash);
    }
    drawGauge(ctx, wh) {
      const cam = this.cam, t = this.t;
      const kIn = prog(t, this.gaugeIn, this.gaugeIn + 0.45);
      if (kIn <= 0) return;
      const fade = this.answered ? 1 - prog(t, this.qAt + 3.0, this.qAt + 3.5) : 1;
      if (fade <= 0) return;
      const R = clamp(Math.min(cam.vh * 0.3, cam.W * 0.12), 56, 118);
      let gx = wh.x + wh.r + 36 + R;
      gx = Math.min(gx, cam.W - R - 20);
      const gy = clamp(wh.y - R * 0.15, R + 16, cam.vh - R - 12);
      const s = ease.back(kIn) * ease.out(fade);
      // hose
      ctx.save();
      ctx.globalAlpha = Math.min(1, fade * 3);
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      const hx = gx - R * 0.72, hy = gy + R * 0.7;
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.bezierCurveTo(hx - R * 0.6, hy + R * 0.9, wh.vx + 60, wh.vy + 70, wh.vx, wh.vy);
      ctx.stroke();
      if (this.answered && t > this.qAt + 0.6 && t < this.qAt + 2.8) {
        ctx.fillStyle = '#9CC9B1';
        for (let i = 0; i < 6; i++) {
          const u = (this.real * 1.4 + i / 6) % 1;
          const bx = Math.pow(1 - u, 3) * hx + 3 * Math.pow(1 - u, 2) * u * (hx - R * 0.6) + 3 * (1 - u) * u * u * (wh.vx + 60) + u * u * u * wh.vx;
          const by = Math.pow(1 - u, 3) * hy + 3 * Math.pow(1 - u, 2) * u * (hy + R * 0.9) + 3 * (1 - u) * u * u * (wh.vy + 70) + u * u * u * wh.vy;
          circle(ctx, bx, by, 3.5);
        }
      }
      ctx.translate(gx, gy);
      ctx.scale(s, s);
      ctx.shadowColor = 'rgba(15,23,42,0.22)';
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#fff';
      circle(ctx, 0, 0, R);
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 4;
      ctx.strokeStyle = C.ink;
      ctx.beginPath(); ctx.arc(0, 0, R - 2, 0, Math.PI * 2); ctx.stroke();
      const a0 = (135 * Math.PI) / 180, sweep = (270 * Math.PI) / 180, maxP = 50;
      const ang = (v) => a0 + (v / maxP) * sweep;
      ctx.lineWidth = R * 0.1;
      ctx.strokeStyle = 'rgba(61,122,93,0.85)';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.78, ang(33), ang(37)); ctx.stroke();
      ctx.strokeStyle = 'rgba(180,67,42,0.25)';
      ctx.beginPath(); ctx.arc(0, 0, R * 0.78, ang(0), ang(30)); ctx.stroke();
      ctx.strokeStyle = C.ink;
      ctx.fillStyle = C.ink;
      ctx.font = '700 ' + Math.round(R * 0.13) + 'px ' + D.FNUM;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let v = 0; v <= maxP; v += 5) {
        const a = ang(v), major = v % 10 === 0;
        ctx.lineWidth = major ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86);
        ctx.lineTo(Math.cos(a) * R * (major ? 0.72 : 0.78), Math.sin(a) * R * (major ? 0.72 : 0.78));
        ctx.stroke();
        if (major) ctx.fillText(String(v), Math.cos(a) * R * 0.58, Math.sin(a) * R * 0.58);
      }
      const jitter = this.phase === 'hold' ? Math.sin(this.real * 18) * 0.12 : 0;
      const v = this.psi + jitter, na = ang(clamp(v, -1, 52));
      const low = this.psi < 32.5;
      ctx.strokeStyle = low ? C.miss : C.ok;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(-Math.cos(na) * R * 0.12, -Math.sin(na) * R * 0.12);
      ctx.lineTo(Math.cos(na) * R * 0.74, Math.sin(na) * R * 0.74);
      ctx.stroke();
      ctx.fillStyle = C.ink;
      circle(ctx, 0, 0, R * 0.07);
      ctx.font = '700 ' + Math.round(R * 0.34) + 'px ' + D.FNUM;
      ctx.fillStyle = low ? C.miss : C.ok;
      ctx.fillText(String(Math.round(this.psi)), 0, R * 0.42);
      ctx.font = '700 ' + Math.round(R * 0.12) + 'px ' + D.FNUM;
      ctx.fillStyle = C.ink2;
      ctx.fillText('psi', 0, R * 0.66);
      ctx.restore();
      const settled = t > this.needle[1];
      if (settled) {
        const a = fade * prog(t, this.needle[1], this.needle[1] + 0.3);
        if (!this.answered || this.psi < 34.5) {
          pill(ctx, gx, gy - R - 26, '−8 psi (−56 kPa) sous la recommandation', { fs: 14, dot: C.miss, alpha: a });
        } else {
          pill(ctx, gx, gy - R - 26, '35 psi · pression recommandée', { fs: 14, dot: C.ok, alpha: a });
        }
      }
    }
    draw(ctx) {
      const cam = this.cam, t = this.t;
      this.drawBackground(ctx);
      const wh = this.drawCar(ctx);
      const zoomK = clamp((cam.ppm - this.basePpm) / (this.basePpm * 0.8), 0, 1);
      if (zoomK < 0.6) {
        bubble(ctx, cam.sx(this.car.x + 2.25), cam.sy(-1.45) - 12, kmh(this.car.v), 'km/h', { alpha: 1 - zoomK / 0.6, tag: 'TOI' });
      }
      if (t > this.eyeAt) {
        const a = prog(t, this.eyeAt, this.eyeAt + 0.3) * (this.answered ? 1 - prog(t, this.qAt + 0.2, this.qAt + 0.6) : 1);
        pill(ctx, wh.x, wh.y - wh.r - 30, 'À l’œil : rien d’anormal', { fs: 14, dot: C.ok, alpha: a });
      }
      this.drawGauge(ctx, wh);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Accueil — deux voitures, 2 secondes d'écart                          */
  /* ------------------------------------------------------------------ */
  class AttractScene extends Scene {
    constructor() {
      super();
      this.v = 25;
      this.me = 0; // front bumper of the sage car
    }
    step(h) { this.me += this.v * h; }
    camera(dt) {
      const cam = this.cam;
      cam.ax = 0.5;
      cam.frame(this.me - 12, this.me + 50 + 4.6 + 10, { margin: 0.05, spanY: 13 });
      cam.ty = 0.4;
      cam.follow(dt, 3);
    }
    draw(ctx) {
      const cam = this.cam, W = cam.W, H = cam.H, t = this.t;
      ctx.fillStyle = C.grass;
      ctx.fillRect(0, 0, W, H);
      trees(ctx, cam, -16, -7, 5, { cell: 8, density: 0.8 });
      trees(ctx, cam, 7.5, 18, 9, { cell: 8, density: 0.7 });
      D.road(ctx, cam, { lanes: 2, laneW: 4, type: 'oneway', shoulder: 1 });
      const sp = 46, off = 28 * t;
      for (let j = Math.floor((cam.wx0() - 10 - off) / sp); j <= Math.ceil((cam.wx1() + 10 - off) / sp); j++) {
        if (hash(j * 3.7 + 2) > 0.55) continue;
        carTop(ctx, cam, j * sp + off, -2, { color: C.traffic[Math.floor(hash(j * 1.9) * C.traffic.length)] });
      }
      const front = this.me, leadRear = this.me + 50;
      ctx.fillStyle = 'rgba(178,210,186,0.95)';
      for (let x = front + 1.2; x < leadRear - 0.8; x += 1.6) D.circle(ctx, cam.sx(x), cam.sy(2), Math.max(2, cam.ppm * 0.12));
      carTop(ctx, cam, front - 2.3, 2, { color: C.ok });
      carTop(ctx, cam, leadRear + 2.3, 2, { color: C.structure });
      pill(ctx, cam.sx((front + leadRear) / 2), cam.sy(4.9) + 22, '≥ 2 secondes d’écart', { fs: 15, dot: C.ok });
    }
  }

  Eco.makeScene = (i) => new [CityScene, WaveScene, SpeedScene, TireScene][i]();
  Eco.AttractScene = AttractScene;
})();
