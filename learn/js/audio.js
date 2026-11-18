/* Backbeat — drum sounds synthesised with Web Audio (same voices as the Handpad web app), a metronome click,
   and a scheduler that plays patterns on the audio clock. No sample files. */
(function () {
  'use strict';
  let ctx = null, master = null, noiseBuf = null, bus = null;
  let vol = 0.8, clickVol = 0.6;

  function init() {
    if (ctx) return;
    ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    master = ctx.createGain();
    master.gain.value = vol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10; comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    newBus();
  }
  // everything scheduled goes through a bus, so stop() can silence what is still queued
  function newBus() {
    if (bus) { const old = bus; old.gain.setTargetAtTime(0, ctx.currentTime, 0.01); setTimeout(() => old.disconnect(), 200); }
    bus = ctx.createGain();
    bus.connect(master);
  }
  function unlock() { init(); if (ctx.state === 'suspended') ctx.resume(); }

  function env(t, peak, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + 0.001);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    return g;
  }
  function noise(t, dur) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t); s.stop(t + dur); return s; }
  function osc(type, f, t, dur) { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.start(t); o.stop(t + dur); return o; }
  function filter(type, f, q) { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q || 1; return b; }
  function metal(t, dur) {
    const sum = ctx.createGain(); sum.gain.value = 1 / 6;
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => osc('square', f * 1.5, t, dur).connect(sum));
    return sum;
  }
  const tom = (from, to, len) => (t, a, out) => {
    const o = osc('sine', from, t, len + 0.1);
    o.frequency.exponentialRampToValueAtTime(to, t + len * 0.6);
    o.connect(env(t, a, len)).connect(out);
    noise(t, 0.03).connect(filter('lowpass', 3000)).connect(env(t, a * 0.2, 0.03)).connect(out);
  };
  const VOICES = {
    kick(t, a, out) {
      const o = osc('sine', 150, t, 0.6);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.15);
      o.connect(env(t, a, 0.5)).connect(out);
      noise(t, 0.02).connect(filter('highpass', 2000)).connect(env(t, a * 0.3, 0.015)).connect(out);
    },
    snare(t, a, out) {
      noise(t, 0.3).connect(filter('highpass', 1200)).connect(env(t, a * 0.8, 0.2)).connect(out);
      const o = osc('triangle', 190, t, 0.2);
      o.frequency.exponentialRampToValueAtTime(160, t + 0.1);
      o.connect(env(t, a * 0.6, 0.1)).connect(out);
    },
    hat(t, a, out) { metal(t, 0.1).connect(filter('bandpass', 10000)).connect(filter('highpass', 7000)).connect(env(t, a * 0.7, 0.06)).connect(out); },
    open(t, a, out) { metal(t, 0.6).connect(filter('bandpass', 10000)).connect(filter('highpass', 7000)).connect(env(t, a * 0.7, 0.45)).connect(out); },
    tom: tom(200, 130, 0.45),
    floor: tom(120, 72, 0.6),
    crash(t, a, out) {
      metal(t, 1.7).connect(filter('highpass', 5000)).connect(env(t, a * 0.5, 1.5)).connect(out);
      noise(t, 1.7).connect(filter('highpass', 6000)).connect(env(t, a * 0.35, 1.2)).connect(out);
    },
  };
  const hatChoke = { g: null };

  // play one drum now (or at audio time `when`). gain 0..1.
  function hit(id, vel, when, scheduled) {
    if (!ctx) return;
    const t = Math.max(when || 0, ctx.currentTime);
    const out = ctx.createGain();
    out.connect(scheduled ? bus : master);
    if (id === 'hat' || id === 'open') {           // a closed hat cuts a ringing open hat
      if (hatChoke.g) hatChoke.g.gain.setTargetAtTime(0, t, 0.01);
      hatChoke.g = out;
    }
    VOICES[id](t, Math.pow((vel || 100) / 127, 0.9), out);
  }
  function click(accent, when) {
    if (!ctx || clickVol <= 0) return;
    const t = Math.max(when || 0, ctx.currentTime);
    const o = osc('square', accent ? 1760 : 1175, t, 0.05);
    o.connect(filter('bandpass', accent ? 1760 : 1175, 4)).connect(env(t, clickVol * (accent ? 0.9 : 0.55), 0.04)).connect(bus);
  }

  // Play a list of events [{ t (audio time), id }] and clicks; returns the end time.
  function schedule(events) {
    events.forEach((e) => { if (e.click) click(e.accent, e.t); else hit(e.id, e.vel || 100, e.t, true); });
  }
  // little UI sounds
  function sfx(kind) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const seq = { good: [[784, 0], [1175, 0.07]], bad: [[220, 0], [180, 0.09]], win: [[523, 0], [659, 0.08], [784, 0.16], [1047, 0.26]], tick: [[1500, 0]] }[kind] || [];
    seq.forEach(([f, d]) => { const o = osc('triangle', f, t + d, 0.25); o.connect(env(t + d, 0.18, 0.22)).connect(master); });
  }

  window.Sound = {
    unlock, hit, click, schedule, sfx,
    now: () => (ctx ? ctx.currentTime : 0),
    latency: () => (ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0),
    stop: () => { if (ctx) newBus(); },
    setVolume: (v) => { vol = v; if (master) master.gain.value = v; },
    setClick: (v) => { clickVol = v; },
    get ready() { return !!ctx; },
  };
})();
