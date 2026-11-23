'use strict';

// ---------------------------------------------------------------------------
// The Handpad's eight pads, numbered like the physical pad. Notes follow the
// General MIDI drum map, so the hardware, this app and any DAW agree by
// default. Users can remap with "Learn".
// The keys mirror the pad: 2 3 4 = toms (top left), 8 9 0 = cymbals (top
// right), V N = snare and kick (the two big pads at the bottom).
// at: x, y, width, height on the pad's 860 × 396 outline (same as Backbeat).
// ---------------------------------------------------------------------------
const PADS = [
  { id: 'tom1',  num: 1, name: 'Tom 1',      note: 48, key: '2', hue: 255, at: [24, 44, 106, 78] },
  { id: 'tom2',  num: 2, name: 'Tom 2',      note: 45, key: '3', hue: 320, at: [144, 24, 106, 78] },
  { id: 'floor', num: 3, name: 'Floor Tom',  note: 43, key: '4', hue: 30,  at: [273, 53, 106, 78] },
  { id: 'snare', num: 4, name: 'Snare',      note: 38, key: 'v', hue: 48,  at: [257, 256, 138, 110] },
  { id: 'kick',  num: 5, name: 'Kick',       note: 36, key: 'n', hue: 0,   at: [465, 256, 138, 110] },
  { id: 'open',  num: 6, name: 'Open Hat',   note: 46, key: '8', hue: 155, at: [481, 53, 106, 78], choke: 'hat' },
  { id: 'hat',   num: 7, name: 'Closed Hat', note: 42, key: '9', hue: 195, at: [610, 24, 106, 78], choke: 'hat' },
  { id: 'ride',  num: 8, name: 'Ride',       note: 51, key: '0', hue: 85,  at: [730, 44, 106, 78] },
];

const STORAGE_KEY = 'drumpads.v1';

function defaultState() {
  return {
    notes: Object.fromEntries(PADS.map(p => [p.id, p.note])),
    volume: 0.8,
    curve: 1,
    channel: 'any',
  };
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    // keep learned notes for pads that still exist (the old kit had other pads)
    if (saved) return { ...defaultState(), ...saved, notes: Object.fromEntries(PADS.map(p => [p.id, saved.notes?.[p.id] ?? p.note])) };
  } catch {}
  return defaultState();
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

const state = loadState();
const samples = {};      // padId -> { name, buffer } for user-dropped audio files
let learningPadId = null;

// ---------------------------------------------------------------------------
// Audio engine: synthesized drums with the Web Audio API (no sample files).
// ---------------------------------------------------------------------------
let ctx, master, noiseBuf;
const chokeGroups = {};  // group -> GainNode of the voice currently sounding

function initAudio() {
  ctx = new AudioContext({ latencyHint: 'interactive' });
  master = ctx.createGain();
  master.gain.value = state.volume;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -10;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
}

function env(t, peak, decay) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  return g;
}

function noise(t, dur) {
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  s.start(t);
  s.stop(t + dur);
  return s;
}

function osc(type, freq, t, dur) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.start(t);
  o.stop(t + dur);
  return o;
}

function filter(type, freq, q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

// Six detuned square waves, the classic 808 cymbal/hat source. mult shifts the cluster.
function metal(t, dur, mult = 1.5) {
  const sum = ctx.createGain();
  sum.gain.value = 1 / 6;
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
    osc('square', f * mult, t, dur).connect(sum);
  }
  return sum;
}

// A tuned tom: the head starts a little sharp, settles on its note, then sags.
function tom(f, len) {
  return (t, a, out) => {
    const o = osc('sine', f * 1.5, t, len + 0.1);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.035);
    o.frequency.exponentialRampToValueAtTime(f * 0.82, t + len);
    o.connect(env(t, a * 0.95, len)).connect(out);
    const o2 = osc('sine', f * 2.6, t, len * 0.5);
    o2.frequency.exponentialRampToValueAtTime(f * 1.6, t + 0.05);
    o2.connect(env(t, a * 0.22, len * 0.35)).connect(out);
    noise(t, 0.04).connect(filter('lowpass', 2600)).connect(env(t, a * 0.22, 0.035)).connect(out);
  };
}

// The Handpad kit. Same voices as Backbeat (learn/js/audio.js): keep them in sync.
const VOICES = {
  kick(t, a, out) {
    const o = osc('sine', 165, t, 0.7);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.06);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.4);
    o.connect(env(t, a, 0.55)).connect(out);
    const c = osc('triangle', 1100, t, 0.03);
    c.frequency.exponentialRampToValueAtTime(240, t + 0.02);
    c.connect(env(t, a * 0.3, 0.022)).connect(out);
    noise(t, 0.02).connect(filter('bandpass', 3200, 0.8)).connect(env(t, a * 0.2, 0.012)).connect(out);
  },
  snare(t, a, out) {
    for (const [f, g, d] of [[180, 0.55, 0.12], [330, 0.28, 0.07]]) {
      const o = osc('triangle', f * 1.2, t, d + 0.05);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.025);
      o.connect(env(t, a * g, d)).connect(out);
    }
    noise(t, 0.35).connect(filter('bandpass', 5200, 0.6)).connect(env(t, a * 0.62, 0.22)).connect(out);
    noise(t, 0.12).connect(filter('highpass', 1200)).connect(env(t, a * 0.35, 0.09)).connect(out);
  },
  hat(t, a, out) {
    metal(t, 0.12).connect(filter('highpass', 7000)).connect(filter('bandpass', 10000))
      .connect(env(t, a * 0.75, 0.055)).connect(out);
    noise(t, 0.04).connect(filter('highpass', 8500)).connect(env(t, a * 0.22, 0.03)).connect(out);
  },
  open(t, a, out) {
    metal(t, 1.1).connect(filter('highpass', 7000)).connect(filter('bandpass', 10000))
      .connect(env(t, a * 0.75, 0.8)).connect(out);
    noise(t, 0.8).connect(filter('highpass', 8000)).connect(env(t, a * 0.2, 0.5)).connect(out);
  },
  tom1: tom(210, 0.42),
  tom2: tom(155, 0.52),
  floor: tom(100, 0.72),
  ride(t, a, out) {
    metal(t, 0.6, 2.2).connect(filter('bandpass', 3600, 1.8)).connect(env(t, a * 0.8, 0.45)).connect(out);
    for (const [f, d] of [[2350, 1.3], [3480, 0.9]]) osc('sine', f, t, d + 0.1).connect(env(t, a * 0.07, d)).connect(out);
    metal(t, 2.4).connect(filter('highpass', 5500)).connect(env(t, a * 0.3, 2.1)).connect(out);
    noise(t, 0.015).connect(filter('highpass', 5000)).connect(env(t, a * 0.2, 0.01)).connect(out);
  },
};

function velocityToGain(vel) {
  return Math.pow(vel / 127, state.curve);
}

function playPad(pad, vel) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.connect(master);

  // Choke: a new hit in the group cuts the previous one (closed hat stops open hat).
  if (pad.choke) {
    chokeGroups[pad.choke]?.gain.setTargetAtTime(0, t, 0.01);
    chokeGroups[pad.choke] = out;
  }

  const a = velocityToGain(vel);
  const sample = samples[pad.id];
  if (sample) {
    const src = ctx.createBufferSource();
    src.buffer = sample.buffer;
    const g = ctx.createGain();
    g.gain.value = a;
    src.connect(g).connect(out);
    src.start(t);
  } else {
    VOICES[pad.id](t, a, out);
  }
  flashPad(pad, vel);
}

// ---------------------------------------------------------------------------
// Input handling. Every source (hardware MIDI, serial, keyboard, mouse) ends
// up in noteOn() or playPad(), so they all behave the same.
// ---------------------------------------------------------------------------
function padForNote(note) {
  return PADS.find(p => state.notes[p.id] === note);
}

function noteOn(note, vel, source) {
  if (learningPadId) {
    const learner = PADS.find(p => p.id === learningPadId);
    const other = padForNote(note);
    if (other && other !== learner) state.notes[other.id] = state.notes[learner.id]; // swap
    state.notes[learner.id] = note;
    learningPadId = null;
    saveState();
    renderPads();
  }
  const pad = padForNote(note);
  if (pad) playPad(pad, vel);
  log(source, note, vel, pad);
}

function handleMidi(bytes, source) {
  const [status, d1, d2 = 0] = bytes;
  const cmd = status & 0xf0;
  const ch = (status & 0x0f) + 1;
  if (state.channel !== 'any' && ch !== Number(state.channel)) return;
  if (cmd === 0x90 && d2 > 0) noteOn(d1, d2, `${source} ch${ch}`);
  // Note Off (0x80, or Note On with velocity 0) is ignored: drums are one-shot.
}

// Byte-stream MIDI parser for serial. Handles running status and skips
// realtime/system messages. Web MIDI already delivers whole messages.
function createMidiParser(onMessage) {
  let status = 0;
  let data = [];
  return byte => {
    if (byte >= 0xf8) return;
    if (byte & 0x80) {
      status = byte >= 0xf0 ? 0 : byte;
      data = [];
      return;
    }
    if (!status) return;
    data.push(byte);
    const cmd = status & 0xf0;
    const needed = cmd === 0xc0 || cmd === 0xd0 ? 1 : 2;
    if (data.length === needed) {
      onMessage([status, ...data]);
      data = [];
    }
  };
}

// --- Web MIDI (USB MIDI boards, BLE MIDI paired at OS level, any MIDI pad) ---
let midiAccess = null;

async function connectMidi() {
  if (!navigator.requestMIDIAccess) {
    setPill('midi-status', 'MIDI: not supported (use Chrome/Edge)', false);
    return;
  }
  try {
    midiAccess = await navigator.requestMIDIAccess();
  } catch (err) {
    setPill('midi-status', 'MIDI: permission denied', false);
    return;
  }
  midiAccess.onstatechange = refreshMidiInputs;
  refreshMidiInputs();
}

function refreshMidiInputs() {
  const names = [];
  for (const input of midiAccess.inputs.values()) {
    if (input.state !== 'connected') continue;
    input.onmidimessage = e => handleMidi(e.data, input.name);
    names.push(input.name);
  }
  const list = document.getElementById('midi-devices');
  list.replaceChildren(...names.map(n => Object.assign(document.createElement('li'), { textContent: n })));
  setPill('midi-status', names.length ? `MIDI: ${names.length} device${names.length > 1 ? 's' : ''}` : 'MIDI: no devices', names.length > 0);
}

// --- Web Serial (boards without native USB, sending raw MIDI bytes) ---
async function connectSerial() {
  if (!('serial' in navigator)) {
    setPill('serial-status', 'Serial: not supported (use Chrome/Edge)', false);
    return;
  }
  let port;
  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
  } catch (err) {
    setPill('serial-status', 'Serial: not connected', false);
    return;
  }
  const btn = document.getElementById('serial-btn');
  btn.disabled = true;
  setPill('serial-status', 'Serial: connected', true);

  const parse = createMidiParser(msg => handleMidi(msg, 'serial'));
  const reader = port.readable.getReader();
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      for (const byte of value) parse(byte);
    }
  } catch (err) {
    console.warn('Serial read stopped:', err);
  } finally {
    reader.releaseLock();
    await port.close().catch(() => {});
    btn.disabled = false;
    setPill('serial-status', 'Serial: disconnected', false);
  }
}

// --- Keyboard and pointer, for playing without hardware ---
document.addEventListener('keydown', e => {
  if (e.target.closest('input, select')) return;
  if (e.key === 'Escape' && learningPadId) {
    learningPadId = null;
    renderPads();
    return;
  }
  if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
  // match the typed key, else the physical key (Shift+2 types "@", AZERTY's 2 key types "é")
  const code = /^Digit\d$/.test(e.code) ? e.code.slice(5) : /^Key[A-Z]$/.test(e.code) ? e.code.slice(3).toLowerCase() : null;
  const pad = PADS.find(p => p.key === e.key.toLowerCase()) || PADS.find(p => p.key === code);
  if (!pad) return;
  const vel = e.shiftKey ? 127 : 96;
  playPad(pad, vel);
  log('keyboard', state.notes[pad.id], vel, pad);
});

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------
const padEls = {};

function renderPads() {
  const container = document.getElementById('pads');
  container.replaceChildren();
  for (const pad of PADS) {
    const el = document.createElement('div');
    el.className = 'pad' + (learningPadId === pad.id ? ' learning' : '') + (pad.at[3] > 90 ? ' big' : '');
    el.style.setProperty('--hue', pad.hue);
    // placed where it sits on the physical pad
    const [x, y, w, h] = pad.at;
    Object.assign(el.style, { left: `${x / 8.6}%`, top: `${y / 3.96}%`, width: `${w / 8.6}%`, height: `${h / 3.96}%` });

    const name = document.createElement('div');
    name.className = 'name';
    name.innerHTML = `<span class="num">${pad.num}</span> ${pad.name}`;

    const sample = document.createElement('div');
    sample.className = 'sample';
    if (samples[pad.id]) {
      sample.textContent = '● ' + samples[pad.id].name;
      sample.title = 'Double-click to go back to the built-in sound';
      sample.addEventListener('dblclick', e => {
        e.stopPropagation();
        delete samples[pad.id];
        renderPads();
      });
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    const info = document.createElement('span');
    info.textContent = learningPadId === pad.id
      ? 'Hit a pad…'
      : `Note ${state.notes[pad.id]} · ${pad.key.toUpperCase()}`;
    const learn = document.createElement('button');
    learn.className = 'learn';
    learn.textContent = learningPadId === pad.id ? 'Cancel' : 'Learn';
    learn.addEventListener('pointerdown', e => e.stopPropagation());
    learn.addEventListener('click', () => {
      learningPadId = learningPadId === pad.id ? null : pad.id;
      renderPads();
    });
    meta.append(info, learn);

    el.append(name, sample, meta);

    // Tap position sets velocity: top of the pad is loud, bottom is soft.
    el.addEventListener('pointerdown', e => {
      const r = el.getBoundingClientRect();
      const vel = Math.round(127 - ((e.clientY - r.top) / r.height) * 87);
      playPad(pad, vel);
      log('pointer', state.notes[pad.id], vel, pad);
    });

    el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('dragover'); });
    el.addEventListener('dragleave', () => el.classList.remove('dragover'));
    el.addEventListener('drop', async e => {
      e.preventDefault();
      el.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (!file || !ctx) return;
      try {
        samples[pad.id] = { name: file.name, buffer: await ctx.decodeAudioData(await file.arrayBuffer()) };
        renderPads();
      } catch {
        alert(`Could not decode "${file.name}" as audio.`);
      }
    });

    padEls[pad.id] = el;
    container.append(el);
  }
}

function flashPad(pad, vel) {
  const el = padEls[pad.id];
  el.classList.add('hit');
  el.style.setProperty('--hit', (vel / 127).toFixed(2));
  requestAnimationFrame(() => requestAnimationFrame(() => {
    el.classList.remove('hit');
    el.style.setProperty('--hit', 0);
  }));
}

function log(source, note, vel, pad) {
  const list = document.getElementById('log');
  const li = document.createElement('li');
  if (!pad) li.className = 'unmapped';
  const time = new Date().toLocaleTimeString([], { hour12: false });
  for (const [cls, text] of [['', time], ['', `n${note}`], ['who', pad ? pad.name : 'unmapped'], ['', `v${vel}`]]) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    li.append(span);
  }
  li.title = source;
  list.prepend(li);
  while (list.children.length > 50) list.lastChild.remove();
}

function setPill(id, text, on) {
  const el = document.getElementById(id);
  el.textContent = text;
  el.classList.toggle('on', on);
}

function updateLatency() {
  if (!ctx) return;
  const ms = (ctx.baseLatency + (ctx.outputLatency || 0)) * 1000;
  document.getElementById('latency').textContent = `Latency: ${ms.toFixed(1)} ms`;
}

function initControls() {
  const volume = document.getElementById('volume');
  volume.value = state.volume;
  volume.addEventListener('input', () => {
    state.volume = Number(volume.value);
    if (master) master.gain.setTargetAtTime(state.volume, ctx.currentTime, 0.02);
    saveState();
  });

  const curve = document.getElementById('curve');
  const curveVal = document.getElementById('curve-val');
  curve.value = state.curve;
  curveVal.textContent = `(${state.curve})`;
  curve.addEventListener('input', () => {
    state.curve = Number(curve.value);
    curveVal.textContent = `(${state.curve})`;
    saveState();
  });

  const channel = document.getElementById('channel');
  for (let ch = 1; ch <= 16; ch++) {
    channel.append(new Option(ch === 10 ? '10 (drums)' : String(ch), String(ch)));
  }
  channel.value = state.channel;
  channel.addEventListener('change', () => { state.channel = channel.value; saveState(); });

  document.getElementById('midi-btn').addEventListener('click', connectMidi);
  document.getElementById('serial-btn').addEventListener('click', connectSerial);
  document.getElementById('reset-btn').addEventListener('click', () => {
    state.notes = defaultState().notes;
    saveState();
    renderPads();
  });

  document.getElementById('start-btn').addEventListener('click', async () => {
    initAudio();
    await ctx.resume();
    document.getElementById('start-overlay').hidden = true;
    updateLatency();
    setInterval(updateLatency, 2000);
  });
}

initControls();
renderPads();
