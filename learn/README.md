# Backbeat — learn drums with your Handpad

A browser game that teaches drums to complete beginners. Built on the same idea and look as
Tonic's Learn tab: a trail through illustrated places, short lessons, stars and trophies.
Plain HTML/JS, no build step, no dependencies, no audio files.

## Play it

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

then open http://localhost:8140 in Chrome or Edge (Web MIDI and Web Serial need them, and need `localhost` or https).
Double-clicking `index.html` also works for keyboard play.

## How it works

Three tabs along the bottom: **Learn** (the trail), **Jam** (free play with a metronome and a hit monitor)
and **Settings**.

- **Learn**: a drum tour through eight places (garage, backyard party, street corner, beach bonfire,
  jungle camp, desert highway, mountain lodge, festival stage). Each chapter holds three lessons and a trophy;
  finishing all three opens the next place. 24 lessons go from "this is the kick" to the rock beat, fills,
  four-on-the-floor, boom bap, half-time, sixteenths, funk, shuffle and reggae.
- **A lesson** is 1–3 cards (read, look at the kit or the drum grid, listen, try it on the kit), then
  five steps:
  - 🎯 **Find it**: hit the drums shown, in order, no timer.
  - 👂 **Ear**: hear a drum, hit the one you heard.
  - 🎮 **Play along**: a note highway. After a 4-click count-in, gems slide to the line; hit each one on time.
    Perfect (±50 ms) / Good (±120 ms) / Miss, combos multiply points.
  - **Echo**: the first bar plays by itself (hollow gems), you copy it in the next bar.
- Each step keeps your best score. Lesson stars: 3 at 90 %+, 2 at 70 %+, otherwise 1. XP, levels, a day streak.
  Progress lives in localStorage (per browser).

## Inputs and binds

Every input ends up in the same place, so they all play the game:

- **Handpad over serial** (our ESP32-DevKitC boards, `USE_USB_MIDI 0`): Settings → Connect serial.
- **Any MIDI pad** (USB or Bluetooth MIDI, or an ESP32-S3 Handpad): Settings → Connect MIDI.
- **Computer keyboard**, or **tapping the kit** on screen.

**Settings → Your DAW** picks a preset. The pad is meant to play the user's DAW too, so each preset uses
that DAW's default drum map and computer-keyboard layout:

| Preset | Keys (kick, snare, hi-hat, open hat, tom, floor tom, crash) | Note names |
|---|---|---|
| Handpad (no DAW) | A S D F J K ; (same as `web/`) | 36 = C1 |
| Ableton Live, Logic Pro, GarageBand, Pro Tools, Studio One, Bitwig | A S T U H G O ("A = C" layout, octave set to C1) | 36 = C1 |
| FL Studio | Z X G J N B L (typing keyboard, Z row) | 36 = C3 |
| Cubase | Z X G J N B L (Virtual Keyboard, Z row) | 36 = C1 |
| REAPER | Z X G J N B L (Virtual MIDI Keyboard, Z row) | 36 = C2 |

All presets use General MIDI notes (kick 36, snare 38, closed hat 42, open hat 46, tom 45, floor tom 43,
crash 49), which is what those DAWs' default drum kits expect. Each preset shows a one-line tip on how to set
up that DAW. The keyboard layouts for Pro Tools, Studio One and Bitwig are the common "A = C" layout and
are worth double-checking on a real install.

**Custom binds**: press **Learn** next to any drum, then press a key or hit a pad. It switches to the
Custom preset (copied from the current one); a key or note already in use swaps with the other drum.

**Timing**: Settings → Calibrate plays 16 clicks; hit along and it measures your average offset
(useful over Bluetooth MIDI).

## Where things are

| File | What it does |
| --- | --- |
| `js/kit.js` | The seven drums, DAW presets, current binds, keyboard / MIDI / serial input |
| `js/audio.js` | Synthesised drums (same voices as `web/`), metronome click, scheduling on the audio clock |
| `js/lessons.js` | Lesson cards, exercises, patterns and chapters |
| `js/play.js` | The three exercise engines: note highway, find it, ear |
| `js/scenery.js` | Tiny SVG scenery kit (from Tonic) |
| `js/trail.js` | The eight places on the trail, drum-tour props, the drum mascot |
| `js/render.js` | The on-screen kit, the drum grid and the beat counter |
| `js/store.js` | Saved progress, chapters, streak, XP |
| `js/app.js` | Screens and game flow |

To add a lesson, add an entry to `LESSONS` in `js/lessons.js` and put its id in a chapter. Patterns are
one string per drum, one character per step (`x` hit, `.` rest, 16 steps per bar):

```js
{ h: 'x.x. x.x. x.x. x.x.', s: '.... x... .... x...', k: 'x... .... x... ....' }  // the rock beat
```

From the browser console: `Backbeat.lesson('rock')`, `Backbeat.ex('rock', 3)`.
