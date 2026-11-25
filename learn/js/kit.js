/* Backbeat — the drums, the DAW presets and every way to hit them.
   A "bind" is what triggers a drum: a computer key and/or a MIDI note.
   Every input (Handpad over serial, any MIDI pad, the keyboard, a tap on screen) ends up in Input.emit(drumId). */
(function () {
  'use strict';

  // seeded random numbers (shared by the scenery and the lessons)
  window.makeRng = function (seed) {
    let a = seed >>> 0;
    const r = function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    r.int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    return r;
  };

  // The Handpad's eight pads. Notes follow General MIDI (channel 10), like the Handpad firmware.
  // ch: the one-letter code used in lesson patterns. pad: the number printed on the physical pad (1–8).
  // Listed in keyboard order, left hand to right hand: 2 3 4 V | N 8 9 0 (the same order as the pad numbers).
  // That's the lane order in the game: top to bottom when the highway runs sideways, left to right when it runs down.
  // hand: the hand that plays it on the keyboard. Ring, middle and index fingers rest on the number row, thumbs on V and N.
  const DRUMS = [
    { id: 'tom1', ch: 't', pad: 1, hand: 'L', name: 'Tom 1', note: 48, color: '#9b7bff', dark: '#6a4fd0' },
    { id: 'tom2', ch: 'm', pad: 2, hand: 'L', name: 'Tom 2', note: 45, color: '#ff7ac6', dark: '#c4458f' },
    { id: 'floor', ch: 'f', pad: 3, hand: 'L', name: 'Floor tom', short: 'Floor', note: 43, color: '#ff9f43', dark: '#c66e17' },
    { id: 'snare', ch: 's', pad: 4, hand: 'L', name: 'Snare', note: 38, color: '#ffd23f', dark: '#c9960a' },
    { id: 'kick', ch: 'k', pad: 5, hand: 'R', name: 'Kick', note: 36, color: '#ff6b6b', dark: '#c44343' },
    { id: 'open', ch: 'o', pad: 6, hand: 'R', name: 'Open hi-hat', short: 'Open hat', note: 46, color: '#3ddc97', dark: '#1d9a66', cym: true },
    { id: 'hat', ch: 'h', pad: 7, hand: 'R', name: 'Closed hi-hat', short: 'Hi-hat', note: 42, color: '#4cc9f0', dark: '#2489b0', cym: true },
    { id: 'ride', ch: 'r', pad: 8, hand: 'R', name: 'Ride', note: 51, color: '#b6e35a', dark: '#7da52c', cym: true },
  ];
  const byId = (id) => DRUMS.find((d) => d.id === id);
  const byCh = (c) => DRUMS.find((d) => d.ch === c);
  const byPad = () => DRUMS.slice().sort((a, b) => a.pad - b.pad);

  // The keyboard mirrors the pad: 2 3 4 for the toms (top left), 8 9 0 for the cymbals (top right),
  // V and N for snare and kick (the two big pads at the bottom).
  const KEYS = { tom1: '2', tom2: '3', floor: '4', snare: 'v', kick: 'n', open: '8', hat: '9', ride: '0' };
  const HANDPAD = Object.fromEntries(DRUMS.map((d) => [d.id, { key: KEYS[d.id], note: d.note }]));

  // DAW presets. The keys always follow the pad's layout; what a preset changes is how its DAW names notes
  // (oct: note name = letter + (floor(note / 12) + oct), so 36 is C1 with -2, C2 with -1, C3 with 0) and the setup tip.
  const DAWS = [
    { id: 'handpad', name: 'No DAW — Handpad on its own', short: 'Handpad', oct: -2,
      tip: 'The pad’s own map: General MIDI notes on channel 10. The keys sit where the pads are: 2 3 4 for the toms, 8 9 0 for the cymbals, V and N for snare and kick.' },
    { id: 'ableton', name: 'Ableton Live', oct: -2,
      tip: 'A Drum Rack starts at C1 on the bottom-left pad and its kits follow General MIDI, so every Handpad pad lands on the matching drum.' },
    { id: 'fl', name: 'FL Studio', oct: 0,
      tip: 'FPC’s default layout uses General MIDI notes. FL calls note 36 “C3”, so its note names read two octaves higher than most DAWs.' },
    { id: 'logic', name: 'Logic Pro', oct: -2,
      tip: 'Drum Kit Designer and Drum Machine Designer follow General MIDI: kick on C1, ride on D♯2.' },
    { id: 'garageband', name: 'GarageBand', oct: -2,
      tip: 'Drummer and the drum kits follow General MIDI: kick on C1, ride on D♯2.' },
    { id: 'protools', name: 'Pro Tools', oct: -2,
      tip: 'Most drum instruments follow General MIDI (kick on C1). Check the tom notes if your kit has more than three toms.' },
    { id: 'cubase', name: 'Cubase', oct: -2,
      tip: 'Groove Agent kits follow General MIDI: kick on C1, ride on D♯2.' },
    { id: 'studioone', name: 'Studio One', oct: -2,
      tip: 'Impact XT starts at C1 and its kits follow General MIDI.' },
    { id: 'bitwig', name: 'Bitwig Studio', oct: -2,
      tip: 'Drum Machine starts at C1 and its kits follow General MIDI.' },
    { id: 'reaper', name: 'REAPER', oct: -1,
      tip: 'Most drum plugins follow General MIDI. REAPER calls note 36 “C2”.' },
    { id: 'custom', name: 'Custom binds', short: 'Custom', oct: -2,
      tip: 'Your own map. Press Learn next to a drum, then hit a key or a pad.' },
  ];
  DAWS.forEach((d) => { d.binds = d.id === 'custom' ? null : HANDPAD; });
  const daw = (id) => DAWS.find((d) => d.id === id) || DAWS[0];

  const NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const noteName = (n, oct) => NAMES[n % 12] + (Math.floor(n / 12) + (oct === undefined ? -2 : oct));
  const keyLabel = (k) => !k ? '—' : k === ' ' ? 'Space' : k.length === 1 ? k.toUpperCase() : k.replace(/^Arrow/, '');

  // ---------- current binds ----------
  let settings = null;           // set by Kit.use(settings) from the store
  let map = {};                  // drumId -> { key, note }
  function use(s) {
    settings = s;
    const d = daw(s.daw);
    map = JSON.parse(JSON.stringify(d.id === 'custom' ? (s.custom || HANDPAD) : d.binds));
    DRUMS.forEach((dr) => { if (!map[dr.id]) map[dr.id] = { key: null, note: dr.note }; });
  }
  const bind = (id) => map[id] || { key: null, note: null };
  const keyFor = (id) => keyLabel(bind(id).key);
  const drumForKey = (k) => k ? DRUMS.find((d) => map[d.id] && map[d.id].key === k) : null;
  const drumForNote = (n) => DRUMS.find((d) => map[d.id] && map[d.id].note === n);
  // the key printed on a physical key, whatever the layout (AZERTY's 2 key types "é"): Digit2 → "2", KeyV → "v"
  const codeKey = (code) => /^Digit\d$/.test(code || '') ? code.slice(5) : /^Key[A-Z]$/.test(code || '') ? code.slice(3).toLowerCase() : null;

  // ---------- input ----------
  const listeners = new Set();
  let learner = null;            // a function waiting for the next raw key or note (Settings → Learn)
  const status = { midi: [], serial: false, last: null };
  const statusListeners = new Set();
  const changed = () => statusListeners.forEach((f) => f(status));

  function emit(id, vel, src) {
    status.last = { id, vel, src, at: performance.now() };
    listeners.forEach((f) => f(id, vel, src));
  }
  // keys the app itself uses, so they can't be bound
  const RESERVED = ['Enter', 'Escape', 'Tab', 'Backspace', 'Shift', 'Control', 'Alt', 'Meta', 'CapsLock'];
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('input, select, textarea')) return;
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (learner) {
      if (RESERVED.includes(k)) { if (k === 'Escape') { learner(null); learner = null; } return; }
      e.preventDefault(); e.stopImmediatePropagation();
      const f = learner; learner = null; f({ key: k });
      return;
    }
    const d = drumForKey(k) || drumForKey(codeKey(e.code));
    if (e.repeat) { if (d) e.preventDefault(); return; }
    if (d) { e.preventDefault(); e.stopImmediatePropagation(); emit(d.id, 100, 'key'); }
  }, true);

  function onNote(note, vel, src) {
    if (learner) { const f = learner; learner = null; f({ note }); return; }
    const d = drumForNote(note);
    if (d) emit(d.id, vel, src);
    else status.last = { id: null, note, vel, src, at: performance.now() };
  }
  function handleMidi(bytes, src) {
    const [st, d1, d2 = 0] = bytes;
    if ((st & 0xf0) === 0x90 && d2 > 0) onNote(d1, d2, src);
  }
  // byte-stream parser for serial (running status, skips realtime/system bytes) — same as the Handpad web app
  function midiParser(onMessage) {
    let st = 0, data = [];
    return (b) => {
      if (b >= 0xf8) return;
      if (b & 0x80) { st = b >= 0xf0 ? 0 : b; data = []; return; }
      if (!st) return;
      data.push(b);
      const need = (st & 0xf0) === 0xc0 || (st & 0xf0) === 0xd0 ? 1 : 2;
      if (data.length === need) { onMessage([st, ...data]); data = []; }
    };
  }

  let midiAccess = null;
  async function connectMidi() {
    if (!navigator.requestMIDIAccess) return 'MIDI needs Chrome or Edge.';
    try { midiAccess = await navigator.requestMIDIAccess(); } catch (e) { return 'MIDI permission was refused.'; }
    const refresh = () => {
      status.midi = [];
      for (const input of midiAccess.inputs.values()) {
        status.midi.push(input.name);
        input.onmidimessage = (e) => handleMidi(e.data, 'midi');
      }
      changed();
    };
    midiAccess.onstatechange = refresh;
    refresh();
    return status.midi.length ? null : 'No MIDI device found. Plug in the pad, or use serial for an ESP32 DevKit.';
  }
  async function connectSerial() {
    if (!('serial' in navigator)) return 'Serial needs Chrome or Edge.';
    let port;
    try { port = await navigator.serial.requestPort(); await port.open({ baudRate: 115200 }); } catch (e) { return 'Serial not connected.'; }
    status.serial = true; changed();
    (async () => {
      const parse = midiParser((m) => handleMidi(m, 'serial'));
      const reader = port.readable.getReader();
      try {
        for (;;) { const { value, done } = await reader.read(); if (done) break; for (const b of value) parse(b); }
      } catch (e) { /* unplugged */ } finally {
        reader.releaseLock(); await port.close().catch(() => {});
        status.serial = false; changed();
      }
    })();
    return null;
  }

  window.Kit = {
    DRUMS, DAWS, HANDPAD, byId, byCh, byPad, daw, noteName, keyLabel, RESERVED,
    use, bind, keyFor, drumForKey, drumForNote,
    on: (f) => { listeners.add(f); return () => listeners.delete(f); },
    onStatus: (f) => { statusListeners.add(f); return () => statusListeners.delete(f); },
    emit, status, connectMidi, connectSerial, handleMidi,
    learn: (f) => { learner = f; },
    cancelLearn: () => { learner = null; },
    get settings() { return settings; },
  };
})();
