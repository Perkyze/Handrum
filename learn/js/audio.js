/* Backbeat — the Handpad kit synthesised with Web Audio (same voices as the Handpad web app), a metronome click,
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
  // six detuned square waves: the classic 808 cymbal source. mult shifts the whole cluster up or down.
  function metal(t, dur, mult) {
    const sum = ctx.createGain(); sum.gain.value = 1 / 6;
    [205.3, 304.4, 369.6, 522.7, 540, 800].forEach((f) => osc('square', f * (mult || 1.5), t, dur).connect(sum));
    return sum;
  }
  // a tuned tom: the head starts a little sharp, settles on its note, then sags as it rings out
  const tom = (f, len) => (t, a, out) => {
    const o = osc('sine', f * 1.5, t, len + 0.1);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    o.frequency.exponentialRampToValueAtTime(f * 0.82, t + len);
    o.connect(env(t, a * 0.95, len)).connect(out);
    const o2 = osc('sine', f * 2.6, t, len * 0.5);           // the higher overtone that makes it sound like a drum, not a beep
    o2.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
    o2.connect(env(t, a * 0.22, len * 0.35)).connect(out);
    noise(t, 0.04).connect(filter('lowpass', 2600)).connect(env(t, a * 0.22, 0.035)).connect(out);
  };
  // The Handpad kit: three toms a fourth/fifth apart, snare, kick, closed and open hi-hat, ride.
  const VOICES = {
    kick(t, a, out) {
      const o = osc('sine', 165, t, 0.7);
      o.frequency.exponentialRampToValueAtTime(55, t + 0.06);
      o.frequency.exponentialRampToValueAtTime(44, t + 0.4);
      o.connect(env(t, a, 0.55)).connect(out);
      const c = osc('triangle', 1100, t, 0.03);                 // beater click
      c.frequency.exponentialRampToValueAtTime(240, t + 0.02);
      c.connect(env(t, a * 0.3, 0.022)).connect(out);
      noise(t, 0.02).connect(filter('bandpass', 3200, 0.8)).connect(env(t, a * 0.2, 0.012)).connect(out);
    },
    snare(t, a, out) {
      [[180, 0.55, 0.12], [330, 0.28, 0.07]].forEach(([f, g, d]) => {    // the drum head
        const o = osc('triangle', f * 1.2, t, d + 0.05);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
        o.connect(env(t, a * g, d)).connect(out);
      });
      noise(t, 0.35).connect(filter('bandpass', 5200, 0.6)).connect(env(t, a * 0.62, 0.22)).connect(out);   // the wires
      noise(t, 0.12).connect(filter('highpass', 1200)).connect(env(t, a * 0.35, 0.09)).connect(out);        // the crack
    },
    hat(t, a, out) {
      metal(t, 0.12).connect(filter('highpass', 7000)).connect(filter('bandpass', 10000)).connect(env(t, a * 0.75, 0.055)).connect(out);
      noise(t, 0.04).connect(filter('highpass', 8500)).connect(env(t, a * 0.22, 0.03)).connect(out);
    },
    open(t, a, out) {
      metal(t, 1.1).connect(filter('highpass', 7000)).connect(filter('bandpass', 10000)).connect(env(t, a * 0.75, 0.8)).connect(out);
      noise(t, 0.8).connect(filter('highpass', 8000)).connect(env(t, a * 0.2, 0.5)).connect(out);
    },
    tom1: tom(210, 0.42),
    tom2: tom(155, 0.52),
    floor: tom(100, 0.72),
    ride(t, a, out) {
      metal(t, 0.6, 2.2).connect(filter('bandpass', 3600, 1.8)).connect(env(t, a * 0.8, 0.45)).connect(out);   // the stick's "ping"
      [[2350, 1.3], [3480, 0.9]].forEach(([f, d]) => osc('sine', f, t, d + 0.1).connect(env(t, a * 0.07, d)).connect(out));   // the bell tone
      metal(t, 2.4).connect(filter('highpass', 5500)).connect(env(t, a * 0.3, 2.1)).connect(out);   // the long wash
      noise(t, 0.015).connect(filter('highpass', 5000)).connect(env(t, a * 0.2, 0.01)).connect(out);
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

  // dev helper: render one voice offline and measure it, e.g. await Sound.render('ride') in the console
  async function render(id, vel, secs) {
    const live = [ctx, noiseBuf];
    const off = new OfflineAudioContext(1, Math.round(44100 * (secs || 2.5)), 44100);
    ctx = off;
    noiseBuf = off.createBuffer(1, off.sampleRate * 2, off.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    VOICES[id](0, Math.pow((vel || 100) / 127, 0.9), off.destination);
    [ctx, noiseBuf] = live;
    const buf = await off.startRendering(), x = buf.getChannelData(0);
    let peak = 0, sum = 0, last = 0;
    for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) peak = v; sum += v * v; if (v > 0.001) last = i; }
    return { id, peak: +peak.toFixed(3), rms: +Math.sqrt(sum / x.length).toFixed(4), ringsFor: +(last / 44100).toFixed(2), buffer: buf };
  }

  window.Sound = {
    unlock, hit, click, schedule, sfx, render,
    now: () => (ctx ? ctx.currentTime : 0),
    latency: () => (ctx ? (ctx.outputLatency || ctx.baseLatency || 0) : 0),
    stop: () => { if (ctx) newBus(); },
    setVolume: (v) => { vol = v; if (master) master.gain.value = v; },
    setClick: (v) => { clickVol = v; },
    get ready() { return !!ctx; },
  };
})();
