'use strict';

// ---------------------------------------------------------------------------
// Pad definitions. Notes follow the General MIDI drum map, so the hardware,
// this app and any DAW agree by default. Users can remap with "Learn".
// ---------------------------------------------------------------------------
const PADS = [
  { id: 'kick',  name: 'Kick',       note: 36, key: 'a', hue: 15 },
  { id: 'snare', name: 'Snare',      note: 38, key: 's', hue: 40 },
  { id: 'chh',   name: 'Closed Hat', note: 42, key: 'd', hue: 60, choke: 'hat' },
  { id: 'ohh',   name: 'Open Hat',   note: 46, key: 'f', hue: 80, choke: 'hat' },
  { id: 'tomL',  name: 'Low Tom',    note: 45, key: 'j', hue: 190 },
  { id: 'tomH',  name: 'High Tom',   note: 48, key: 'k', hue: 210 },
  { id: 'clap',  name: 'Clap',       note: 39, key: 'l', hue: 280 },
  { id: 'crash', name: 'Crash',      note: 49, key: ';', hue: 320 },
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
    if (saved) return { ...defaultState(), ...saved };
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

// Six detuned square waves, the classic 808 cymbal/hat source.
function metal(t, dur) {
  const sum = ctx.createGain();
  sum.gain.value = 1 / 6;
  for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
    osc('square', f * 1.5, t, dur).connect(sum);
  }
  return sum;
}

function tom(from, to) {
  return (t, a, out) => {
    const o = osc('sine', from, t, 0.6);
    o.frequency.exponentialRampToValueAtTime(to, t + 0.3);
    o.connect(env(t, a, 0.5)).connect(out);
    noise(t, 0.03).connect(filter('lowpass', 3000)).connect(env(t, a * 0.2, 0.03)).connect(out);
  };
}

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
  chh(t, a, out) {
    metal(t, 0.1).connect(filter('bandpass', 10000)).connect(filter('highpass', 7000))
      .connect(env(t, a * 0.7, 0.06)).connect(out);
  },
  ohh(t, a, out) {
    metal(t, 0.6).connect(filter('bandpass', 10000)).connect(filter('highpass', 7000))
      .connect(env(t, a * 0.7, 0.45)).connect(out);
  },
  tomL: tom(140, 85),
  tomH: tom(220, 150),
  clap(t, a, out) {
    for (let i = 0; i < 3; i++) {
      const ti = t + i * 0.011;
      noise(ti, 0.02).connect(filter('bandpass', 1300, 1.5)).connect(env(ti, a * 0.8, 0.02)).connect(out);
    }
    const tail = t + 0.033;
    noise(tail, 0.25).connect(filter('bandpass', 1300, 1.5)).connect(env(tail, a * 0.6, 0.18)).connect(out);
  },
  crash(t, a, out) {
    metal(t, 1.7).connect(filter('highpass', 5000)).connect(env(t, a * 0.5, 1.5)).connect(out);
    noise(t, 1.7).connect(filter('highpass', 6000)).connect(env(t, a * 0.35, 1.2)).connect(out);
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
  const pad = PADS.find(p => p.key === e.key.toLowerCase());
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
    el.className = 'pad' + (learningPadId === pad.id ? ' learning' : '');
    el.style.setProperty('--hue', pad.hue);

    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = pad.name;

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
