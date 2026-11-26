/* Drawing toolkit for the kiosk's canvas scenes: palette, camera, and
   top-down / side-view primitives (road, cars, people, labels). */
(function () {
  'use strict';
  const Eco = (window.Eco = window.Eco || {});

  const FNUM = '"Space Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif';
  const FTXT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

  // Design-system colours plus a muted "world" palette derived from them.
  const C = {
    surface: '#F6F5F0',
    ink: '#1E293B',
    ink2: '#475569',
    structure: '#16324F',
    action: '#E86A33',
    ok: '#3D7A5D',
    miss: '#B4432A',
    grass: '#D5E3CF',
    grass2: '#C8DBC2',
    tree: '#8DB89A',
    treeLight: '#B2D2BA',
    asphalt: '#323B48',
    asphalt2: '#2A323D',
    line: '#F4F2EA',
    yellow: '#E7B54A',
    sidewalk: '#E9E5DA',
    curb: '#CEC8B8',
    glass: '#1E293B',
    amber: '#FFB020',
    traffic: ['#C9CFD8', '#B5C0CC', '#DAD6CC', '#ECEAE4', '#A9B7C6'],
    roof: ['#E6E0D2', '#D9D2C2', '#CFD7DE', '#E2DBCA', '#C9D3C7'],
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
  const ease = {
    out: (t) => 1 - Math.pow(1 - t, 3),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    back: (t) => {
      const c1 = 1.70158, c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    },
  };
  function hash(n) {
    const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return x - Math.floor(x);
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
    ctx.fill();
  }
  // French typography: non-breaking space before : ; ? ! % and inside « ».
  function fr(s) {
    return String(s)
      .replace(/ ([:;?!%»])/g, ' $1')
      .replace(/(\d) (km\/h|km|m|s|psi|kPa|min|voitures|mètres)(?![\wÀ-ÿ])/g, '$1 $2')
      .replace(/« /g, '« ');
  }

  /* Camera: world metres -> screen pixels. (x, y) is the world point shown
     at screen (W*ax, vh/2), where vh is the height left above any sheet. */
  class Cam {
    constructor() {
      this.x = 0; this.y = 0; this.ppm = 14; this.ax = 0.5;
      this.tx = 0; this.ty = 0; this.tppm = 14; this.tax = null;
      this.W = 1000; this.H = 600; this.vh = 600;
    }
    setView(v) { this.W = v.W; this.H = v.H; this.vh = v.vh; }
    sx(wx) { return (wx - this.x) * this.ppm + this.W * this.ax; }
    sy(wy) { return (wy - this.y) * this.ppm + this.vh / 2; }
    wx0() { return this.x - (this.W * this.ax) / this.ppm; }
    wx1() { return this.x + (this.W * (1 - this.ax)) / this.ppm; }
    wy0() { return this.y - this.vh / 2 / this.ppm; }
    wy1() { return this.y + (this.H - this.vh / 2) / this.ppm; }
    frame(x0, x1, o = {}) {
      const m = o.margin == null ? 0.06 : o.margin;
      let p = (this.W * (1 - 2 * m)) / (x1 - x0);
      if (o.min) p = Math.max(p, o.min);
      if (o.max) p = Math.min(p, o.max);
      if (o.spanY) p = Math.min(p, (this.vh * 0.9) / o.spanY);
      this.tppm = p;
      const ax = this.tax == null ? this.ax : this.tax;
      this.tx = (x0 + x1) / 2 + ((ax - 0.5) * this.W) / p;
    }
    // Eases toward the target. The target's own motion since last frame is
    // fed forward, so a tracked car does not lag; jumps (re-targeting) are not.
    follow(dt, k) {
      const a = 1 - Math.exp(-k * dt);
      let ff = this._ltx == null ? 0 : this.tx - this._ltx;
      if (Math.abs(ff) > 2.5) ff = 0;
      this._ltx = this.tx;
      this.x += ff + (this.tx - this.x) * a;
      this.y += (this.ty - this.y) * a;
      this.ppm += (this.tppm - this.ppm) * a;
      if (this.tax != null) this.ax += (this.tax - this.ax) * a;
    }
    snap() {
      this.x = this.tx; this.y = this.ty; this.ppm = this.tppm; this._ltx = this.tx;
      if (this.tax != null) this.ax = this.tax;
    }
  }

  function band(ctx, cam, y0, y1, color) {
    const a = cam.sy(y0), b = cam.sy(y1);
    ctx.fillStyle = color;
    ctx.fillRect(0, a, cam.W, b - a);
  }
  function hline(ctx, cam, wy, color, w) {
    ctx.fillStyle = color;
    ctx.fillRect(0, cam.sy(wy) - w / 2, cam.W, w);
  }
  function dashes(ctx, cam, wy, color, w, dash, gap) {
    const period = dash + gap;
    const k0 = Math.floor(cam.wx0() / period) - 1, k1 = Math.ceil(cam.wx1() / period) + 1;
    ctx.fillStyle = color;
    const y = cam.sy(wy) - w / 2;
    for (let k = k0; k <= k1; k++) {
      const x = cam.sx(k * period);
      ctx.fillRect(x, y, dash * cam.ppm, w);
    }
  }

  // Highway-style road centred on y = 0. type: 'oneway' | 'twoway'.
  function road(ctx, cam, o) {
    const lw = o.laneW || 4, n = o.lanes || 2, half = (n * lw) / 2, sh = o.shoulder == null ? 1.1 : o.shoulder;
    band(ctx, cam, -half - sh, half + sh, C.asphalt);
    band(ctx, cam, -half - sh, -half - sh + 0.25, C.asphalt2);
    band(ctx, cam, half + sh - 0.25, half + sh, C.asphalt2);
    const w = Math.max(1.5, cam.ppm * 0.16);
    if (o.type === 'twoway') {
      hline(ctx, cam, -half, C.line, w);
      hline(ctx, cam, half, C.line, w);
      hline(ctx, cam, -0.18, C.yellow, w);
      hline(ctx, cam, 0.18, C.yellow, w);
    } else {
      hline(ctx, cam, -half, C.yellow, w);
      hline(ctx, cam, half, C.line, w);
      for (let i = 1; i < n; i++) dashes(ctx, cam, -half + i * lw, C.line, w, 3, 6);
    }
  }

  function trees(ctx, cam, y0, y1, seed, o = {}) {
    const cell = o.cell || 8, dens = o.density == null ? 0.75 : o.density;
    const rMin = o.rMin || 1.4, rMax = o.rMax || 2.8, p = cam.ppm;
    const k0 = Math.floor((cam.wx0() - rMax) / cell) - 1, k1 = Math.ceil((cam.wx1() + rMax) / cell) + 1;
    for (let k = k0; k <= k1; k++) {
      if (hash(k * 1.37 + seed) > dens) continue;
      const wx = k * cell + hash(k * 2.71 + seed) * cell * 0.9;
      const wy = y0 + (y1 - y0) * hash(k * 3.17 + seed * 1.3);
      const r = (rMin + (rMax - rMin) * hash(k * 5.03 + seed * 2.1)) * p;
      const x = cam.sx(wx), y = cam.sy(wy);
      ctx.fillStyle = 'rgba(30,60,40,0.13)';
      circle(ctx, x + r * 0.22, y + r * 0.3, r);
      ctx.fillStyle = o.color || C.tree;
      circle(ctx, x, y, r);
      ctx.fillStyle = o.light || C.treeLight;
      circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.48);
    }
  }

  // Top-down car facing +x, centred on world (cx, cy).
  function carTop(ctx, cam, cx, cy, o) {
    const p = cam.ppm, L = (o.len || 4.6) * p, W = (o.wid || 1.95) * p;
    const x = cam.sx(cx), y = cam.sy(cy);
    if (x < -L * 2 || x > cam.W + L * 2) return;
    const r = Math.min(W * 0.34, L * 0.2);
    ctx.save();
    ctx.translate(x, y);
    if (o.rot) ctx.rotate(o.rot);
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    if (o.brake > 0.02) {
      const g = ctx.createRadialGradient(-L / 2, 0, 0, -L / 2, 0, W * 1.3);
      g.addColorStop(0, 'rgba(255,59,47,' + 0.6 * o.brake + ')');
      g.addColorStop(1, 'rgba(255,59,47,0)');
      ctx.fillStyle = g;
      circle(ctx, -L / 2, 0, W * 1.3);
    }
    if (o.hazard) {
      for (const hx of [-L / 2, L / 2]) for (const hy of [-W * 0.4, W * 0.4]) {
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, W * 0.8);
        g.addColorStop(0, 'rgba(255,176,32,0.85)');
        g.addColorStop(1, 'rgba(255,176,32,0)');
        ctx.fillStyle = g;
        circle(ctx, hx, hy, W * 0.8);
      }
    }
    ctx.fillStyle = 'rgba(15,23,42,0.22)';
    rr(ctx, -L / 2 + p * 0.12, -W / 2 + p * 0.22, L, W, r);
    ctx.fill();
    ctx.fillStyle = '#0F172A';
    const wl = L * 0.17, wt = W * 0.16;
    for (const fx of [-L * 0.29, L * 0.27]) {
      rr(ctx, fx - wl / 2, -W / 2 - wt * 0.3, wl, wt, wt * 0.4); ctx.fill();
      rr(ctx, fx - wl / 2, W / 2 - wt * 0.7, wl, wt, wt * 0.4); ctx.fill();
    }
    ctx.fillStyle = o.color;
    rr(ctx, -L / 2, -W / 2, L, W, r);
    ctx.fill();
    ctx.fillStyle = 'rgba(15,23,42,0.07)';
    rr(ctx, -L / 2 + 2, W * 0.12, L - 4, W * 0.36, r * 0.6);
    ctx.fill();
    ctx.fillStyle = C.glass;
    rr(ctx, L * 0.06, -W * 0.37, L * 0.17, W * 0.74, W * 0.14); ctx.fill();
    rr(ctx, -L * 0.37, -W * 0.34, L * 0.11, W * 0.68, W * 0.12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, -L * 0.23, -W * 0.36, L * 0.26, W * 0.72, W * 0.12); ctx.fill();
    ctx.fillStyle = '#FFF6DA';
    rr(ctx, L / 2 - L * 0.055, -W * 0.42, L * 0.04, W * 0.2, 2); ctx.fill();
    rr(ctx, L / 2 - L * 0.055, W * 0.22, L * 0.04, W * 0.2, 2); ctx.fill();
    ctx.fillStyle = o.brake > 0.3 ? '#FF4436' : '#B42318';
    rr(ctx, -L / 2 + L * 0.012, -W * 0.42, L * 0.04, W * 0.2, 2); ctx.fill();
    rr(ctx, -L / 2 + L * 0.012, W * 0.22, L * 0.04, W * 0.2, 2); ctx.fill();
    if (o.ring > 0.01) {
      ctx.strokeStyle = 'rgba(255,255,255,' + o.ring + ')';
      ctx.lineWidth = 3;
      rr(ctx, -L / 2 - 6, -W / 2 - 6, L + 12, W + 12, r + 6);
      ctx.stroke();
    }
    ctx.restore();
  }

  function cyclistTop(ctx, cam, wx, wy, phase, color) {
    const p = cam.ppm * 1.45, x = cam.sx(wx), y = cam.sy(wy);
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(15,23,42,0.18)';
    rr(ctx, -0.85 * p, -0.12 * p + 3, 1.8 * p, 0.3 * p, 0.15 * p); ctx.fill();
    ctx.fillStyle = '#1F2937';
    rr(ctx, -0.95 * p, -0.07 * p, 1.9 * p, 0.14 * p, 0.07 * p); ctx.fill();
    // pedalling knees
    const k = Math.sin(phase) * 0.18 * p;
    ctx.fillStyle = '#334155';
    rr(ctx, -0.05 * p + k, -0.3 * p, 0.32 * p, 0.14 * p, 0.07 * p); ctx.fill();
    rr(ctx, -0.05 * p - k, 0.16 * p, 0.32 * p, 0.14 * p, 0.07 * p); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-0.15 * p, 0, 0.3 * p, 0.27 * p, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, 0.1 * p);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -0.2 * p); ctx.lineTo(0.55 * p, -0.24 * p);
    ctx.moveTo(0, 0.2 * p); ctx.lineTo(0.55 * p, 0.24 * p);
    ctx.stroke();
    ctx.fillStyle = '#fff';
    circle(ctx, 0.05 * p, 0, 0.17 * p);
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0.05 * p, 0, 0.17 * p, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }

  function pedTop(ctx, cam, wx, wy, dir, phase, shirt) {
    const p = Math.max(cam.ppm * 1.7, 12), x = cam.sx(wx), y = cam.sy(wy);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(dir);
    ctx.fillStyle = 'rgba(15,23,42,0.18)';
    circle(ctx, 2, 3, 0.36 * p);
    const s = Math.sin(phase * 6) * 0.2 * p;
    ctx.fillStyle = '#334155';
    rr(ctx, -0.08 * p + s, -0.2 * p, 0.26 * p, 0.13 * p, 0.06 * p); ctx.fill();
    rr(ctx, -0.08 * p - s, 0.07 * p, 0.26 * p, 0.13 * p, 0.06 * p); ctx.fill();
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.ellipse(0, 0, 0.17 * p, 0.32 * p, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3B2A20';
    circle(ctx, 0, 0, 0.15 * p);
    ctx.fillStyle = '#E2B48F';
    circle(ctx, 0.04 * p, 0, 0.1 * p);
    ctx.restore();
  }

  function ballTop(ctx, cam, wx, wy, rot) {
    const p = cam.ppm, x = cam.sx(wx), y = cam.sy(wy), r = Math.max(7, 0.5 * p);
    ctx.save();
    ctx.fillStyle = 'rgba(15,23,42,0.2)';
    circle(ctx, x + 2, y + 3, r);
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.fillStyle = '#fff';
    circle(ctx, 0, 0, r);
    ctx.fillStyle = '#E2483D';
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, (i * 2 * Math.PI) / 3, (i * 2 * Math.PI) / 3 + Math.PI / 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#F2C14E';
    circle(ctx, 0, 0, r * 0.28);
    ctx.restore();
  }

  // Speed label (white card, ink border) with its bottom-centre at (x, y).
  function bubble(ctx, x, y, num, unit, o = {}) {
    const s = o.s || 1, fn = Math.round(22 * s), fu = Math.round(10 * s);
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = '700 ' + fn + 'px ' + FNUM;
    const wn = ctx.measureText(num).width;
    ctx.font = '700 ' + fu + 'px ' + FNUM;
    const wu = ctx.measureText(unit).width;
    const w = Math.max(wn, wu, 30) + 24 * s, h = fn + fu + 13 * s;
    const bx = Math.round(x - w / 2), by = Math.round(o.below ? y : y - h);
    ctx.shadowColor = 'rgba(15,23,42,0.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#fff';
    rr(ctx, bx, by, w, h, 9 * s);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.lineWidth = 2 * s;
    ctx.strokeStyle = o.border || C.ink;
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ink;
    ctx.font = '700 ' + fn + 'px ' + FNUM;
    ctx.fillText(num, bx + w / 2, by + 5 * s + fn * 0.86);
    ctx.font = '700 ' + fu + 'px ' + FNUM;
    ctx.fillStyle = C.ink2;
    ctx.fillText(unit, bx + w / 2, by + h - 6 * s);
    if (o.tag) {
      ctx.font = '700 ' + Math.round(10 * s) + 'px ' + FTXT;
      const tw = ctx.measureText(o.tag).width + 14 * s, th = 17 * s;
      const tx = bx + w / 2 - tw / 2, ty = o.below ? by + h - 4 * s : by - th + 5 * s;
      ctx.fillStyle = o.tagBg || C.structure;
      rr(ctx, tx, ty, tw, th, th / 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.textBaseline = 'middle';
      ctx.fillText(o.tag, bx + w / 2, ty + th / 2 + 0.5);
    }
    ctx.restore();
    return { x: bx, y: by, w, h };
  }

  function pill(ctx, x, y, text, o = {}) {
    text = fr(text);
    const fs = o.fs || 15;
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.font = (o.weight || 700) + ' ' + fs + 'px ' + (o.num ? FNUM : FTXT);
    const tw = ctx.measureText(text).width, dot = o.dot ? 15 : 0, padX = o.padX || 14;
    const w = tw + padX * 2 + dot, h = fs + (o.padY || 16);
    let bx = x - w / 2;
    if (o.align === 'left') bx = x;
    if (o.align === 'right') bx = x - w;
    const by = y - h / 2;
    if (!o.flat) {
      ctx.shadowColor = 'rgba(15,23,42,0.16)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 3;
    }
    ctx.fillStyle = o.bg || '#fff';
    rr(ctx, bx, by, w, h, h / 2);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    if (o.stroke) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = o.stroke;
      ctx.stroke();
    }
    if (o.dot) {
      ctx.fillStyle = o.dot;
      circle(ctx, bx + padX + 4.5, y, 4.5);
    }
    ctx.fillStyle = o.color || C.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, bx + padX + dot, y + 1);
    ctx.restore();
    return { x: bx, y: by, w, h };
  }

  function alertPop(ctx, x, y, k, color) {
    if (k <= 0) return;
    const r = 15 * ease.back(Math.min(1, k));
    ctx.save();
    ctx.fillStyle = color || C.amber;
    ctx.shadowColor = 'rgba(15,23,42,0.25)';
    ctx.shadowBlur = 10;
    circle(ctx, x, y, r);
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.ink;
    ctx.font = '800 ' + Math.round(r * 1.3) + 'px ' + FTXT;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', x, y + 1);
    ctx.restore();
  }

  // Graduated ruler (metres) drawn under a road. ytop in pixels.
  function ruler(ctx, cam, x0, x1, ytop, o = {}) {
    const h = 30, a = cam.sx(x0), b = cam.sx(x1);
    ctx.save();
    ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
    ctx.shadowColor = 'rgba(15,23,42,0.14)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = '#fff';
    rr(ctx, a - 16, ytop, b - a + 40, h, 8);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.ink;
    ctx.lineWidth = 1.5;
    ctx.font = '700 11px ' + FNUM;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const step = cam.ppm < 5 ? 10 : 5;
    for (let m = x0; m <= x1 + 0.01; m += step) {
      const x = cam.sx(m), major = m % 10 === 0, lab = m % 20 === 0;
      ctx.beginPath();
      ctx.moveTo(x, ytop);
      ctx.lineTo(x, ytop + (lab ? 12 : major ? 9 : 5));
      ctx.stroke();
      if (lab) ctx.fillText(String(m), x, ytop + h - 5);
    }
    ctx.textAlign = 'left';
    ctx.fillStyle = C.ink2;
    ctx.fillText('m', b + 10, ytop + h - 5);
    ctx.restore();
  }

  Eco.D = {
    C, FNUM, FTXT, clamp, lerp, prog, ease, hash, rr, circle, fr, Cam,
    band, hline, dashes, road, trees, carTop, cyclistTop, pedTop, ballTop,
    bubble, pill, alertPop, ruler,
  };
})();
