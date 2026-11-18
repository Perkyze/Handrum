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

  // The seven drums a beginner meets. Notes follow General MIDI (channel 10), like the Handpad firmware.
  // ch: the one-letter code used in lesson patterns.
  const DRUMS = [
    { id: 'crash', ch: 'c', name: 'Crash', note: 49, color: '#ff7ac6', dark: '#c4458f' },
    { id: 'open', ch: 'o', name: 'Open hi-hat', short: 'Open hat', note: 46, color: '#3ddc97', dark: '#1d9a66' },
    { id: 'hat', ch: 'h', name: 'Hi-hat', note: 42, color: '#4cc9f0', dark: '#2489b0' },
    { id: 'tom', ch: 't', name: 'Tom', note: 45, color: '#9b7bff', dark: '#6a4fd0' },
    { id: 'snare', ch: 's', name: 'Snare', note: 38, color: '#ffd23f', dark: '#c9960a' },
    { id: 'floor', ch: 'f', name: 'Floor tom', short: 'Floor', note: 43, color: '#ff9f43', dark: '#c66e17' },
    { id: 'kick', ch: 'k', name: 'Kick', note: 36, color: '#ff6b6b', dark: '#c44343' },
  ];
  const byId = (id) => DRUMS.find((d) => d.id === id);
  const byCh = (c) => DRUMS.find((d) => d.ch === c);

  // Computer-keyboard layouts DAWs use to play notes, with the octave set so the first key is note 36 (the kick).
  // "home": A W S E D F T G Y H U J K O L P ; '  (Ableton, Logic, GarageBand…)
  // "tracker": Z S X D C V G B H N J M , L . ; /  (FL Studio, Cubase, REAPER…)
  const HOME = { 36: 'a', 37: 'w', 38: 's', 39: 'e', 40: 'd', 41: 'f', 42: 't', 43: 'g', 44: 'y', 45: 'h', 46: 'u', 47: 'j', 48: 'k', 49: 'o', 50: 'l', 51: 'p', 52: ';', 53: "'" };
  const TRACKER = { 36: 'z', 37: 's', 38: 'x', 39: 'd', 40: 'c', 41: 'v', 42: 'g', 43: 'b', 44: 'h', 45: 'n', 46: 'j', 47: 'm', 48: ',', 49: 'l', 50: '.', 51: ';', 52: '/' };
  const fromLayout = (L) => Object.fromEntries(DRUMS.map((d) => [d.id, { key: L[d.note], note: d.note }]));

  // oct: how the DAW names octaves. Note name = letter + (floor(note / 12) + oct): 36 is C1 with -2, C2 with -1, C3 with 0.
  const DAWS = [
    { id: 'handpad', name: 'No DAW — Handpad on its own', short: 'Handpad', oct: -2,
      binds: { crash: { key: ';', note: 49 }, open: { key: 'f', note: 46 }, hat: { key: 'd', note: 42 }, tom: { key: 'j', note: 45 },
        snare: { key: 's', note: 38 }, floor: { key: 'k', note: 43 }, kick: { key: 'a', note: 36 } },
      tip: 'The pad’s own map: General MIDI notes on channel 10. The keys match the Handpad web app.' },
    { id: 'ableton', name: 'Ableton Live', oct: -2, binds: fromLayout(HOME),
      tip: 'A Drum Rack starts at C1 on the bottom-left pad. For the keyboard, turn on Computer MIDI Keyboard (M), then press Z twice so the octave reads C1.' },
    { id: 'fl', name: 'FL Studio', oct: 0, binds: fromLayout(TRACKER),
      tip: 'FPC’s default layout uses General MIDI notes (kick on pad 2, snare on pad 6, closed hat on pad 3). FL calls note 36 “C3”. With Typing keyboard to piano on, set the octave so Z plays C3.' },
    { id: 'logic', name: 'Logic Pro', oct: -2, binds: fromLayout(HOME),
      tip: 'Drum Kit Designer and Drum Machine Designer follow General MIDI (kick on C1). Open Musical Typing (⌘K) and press Z twice so it starts at C1.' },
    { id: 'garageband', name: 'GarageBand', oct: -2, binds: fromLayout(HOME),
      tip: 'Drummer and drum kits follow General MIDI (kick on C1). Open Musical Typing (⌘K) and press Z twice so it starts at C1.' },
    { id: 'protools', name: 'Pro Tools', oct: -2, binds: fromLayout(HOME),
      tip: 'Most drum instruments follow General MIDI (kick on C1). If you play from the computer keyboard, set its octave so A plays C1.' },
    { id: 'cubase', name: 'Cubase', oct: -2, binds: fromLayout(TRACKER),
      tip: 'Groove Agent kits follow General MIDI (kick on C1). Open the Virtual Keyboard (Alt+K) and shift the octave so Z plays C1.' },
    { id: 'studioone', name: 'Studio One', oct: -2, binds: fromLayout(HOME),
      tip: 'Impact XT starts at C1 and its kits follow General MIDI. If you play from the QWERTY keyboard, set the octave so A plays C1.' },
    { id: 'bitwig', name: 'Bitwig Studio', oct: -2, binds: fromLayout(HOME),
      tip: 'Drum Machine starts at C1 and its kits follow General MIDI. For the computer keyboard, set the octave so A plays C1.' },
    { id: 'reaper', name: 'REAPER', oct: -1, binds: fromLayout(TRACKER),
      tip: 'Most drum plugins follow General MIDI. REAPER calls note 36 “C2”. In the Virtual MIDI Keyboard (Alt+B), set the octave so Z plays C2.' },
    { id: 'custom', name: 'Custom binds', short: 'Custom', oct: -2, binds: null,
      tip: 'Your own map. Press Learn next to a drum, then hit a key or a pad.' },
  ];
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
    map = JSON.parse(JSON.stringify(d.id === 'custom' ? (s.custom || DAWS[0].binds) : d.binds));
    DRUMS.forEach((dr) => { if (!map[dr.id]) map[dr.id] = { key: null, note: dr.note }; });
  }
  const bind = (id) => map[id] || { key: null, note: null };
  const keyFor = (id) => keyLabel(bind(id).key);
  const drumForKey = (k) => DRUMS.find((d) => map[d.id] && map[d.id].key === k);
  const drumForNote = (n) => DRUMS.find((d) => map[d.id] && map[d.id].note === n);

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
    if (e.repeat) { if (drumForKey(k)) e.preventDefault(); return; }
    const d = drumForKey(k);
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
    DRUMS, DAWS, byId, byCh, daw, noteName, keyLabel, RESERVED,
    use, bind, keyFor, drumForKey, drumForNote,
    on: (f) => { listeners.add(f); return () => listeners.delete(f); },
    onStatus: (f) => { statusListeners.add(f); return () => statusListeners.delete(f); },
    emit, status, connectMidi, connectSerial, handleMidi,
    learn: (f) => { learner = f; },
    cancelLearn: () => { learner = null; },
    get settings() { return settings; },
  };
})();
