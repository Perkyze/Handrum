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

Three tabs in a floating glass dock at the bottom: **Learn** (the trail), **Jam** (free play with a metronome
and a hit monitor) and **Settings**. Built desktop-first, still responsive:

- **Learn on a PC** uses the "Studio rails" layout picked in `design/style-picker.html`: the 8-stop tour and
  your pad status on the left, the scenic trail in the middle (chunky coins with name chips), and Up next,
  streak and today's goal on the right. Clicking a coin drops a card under it (start, replay, practice, hear it).
- **Under 1024 px** the rails fold away and "Up next" floats above the dock.
- Buttons are glass pills.

- **Learn**: a drum tour through eight places (garage, backyard party, street corner, beach bonfire,
  jungle camp, desert highway, mountain lodge, festival stage). Each chapter holds three lessons and a trophy;
  finishing all three opens the next place. 24 lessons go from kick and snare to the rock beat (lesson 3),
  open hats, the ride, four-on-the-floor, half-time, toms and fills, boom bap, sixteenths, funk, shuffle,
  reggae and full song sections.
- **A lesson** is 1–2 cards (read, look at the pad or the drum grid, listen, try it on the pad), then
  **three steps**, each doing a different job (no "same pattern, a bit faster" repeats):
  - 🎯 **Find it**: hit the drums shown, in order, no timer.
  - 👂 **Ear**: hear a drum, hit the one you heard.
  - 🎮 **Play along**: a note highway. After a 4-click count-in, gems slide to the line; hit each one on time.
    Perfect (±50 ms) / Good (±120 ms) / Miss, combos multiply points.
  - **Echo**: the first bar plays by itself (hollow gems), you copy it in the next bar.
- **Practice** is for anything not dialed in yet. It loops a groove round after round (count-in each time):
  90 %+ makes the next round 5 BPM faster, under 60 % makes it 5 BPM slower. Reaching 90 % at the groove's own
  tempo "dials it in" (+15 XP once). Open it from a play step's result ("Practice slower" is highlighted under
  75 %), from the lesson results, from the 🔁 button on a finished lesson's trail card, or from Jam → Practice a groove.
- Each step keeps your best score. Lesson stars: 3 at 90 %+, 2 at 70 %+, otherwise 1. XP, levels, a day streak.
  Progress lives in localStorage (per browser). Saves from the old 7-drum curriculum are migrated: lessons that
  were merged carry their stars over, and old custom binds are reset.

## Inputs and binds

Every input ends up in the same place, so they all play the game:

- **Handpad over serial** (our ESP32-DevKitC boards, `USE_USB_MIDI 0`): Settings → Connect serial.
- **Any MIDI pad** (USB or Bluetooth MIDI, or an ESP32-S3 Handpad): Settings → Connect MIDI.
- **Computer keyboard**, or **tapping the pad** on screen.

The on-screen pad is the Handpad's real layout, and so are the keys:

| # | Pad | Key | Note |
|---|---|---|---|
| 1 | Tom 1 | 2 | 48 |
| 2 | Tom 2 | 3 | 45 |
| 3 | Floor tom | 4 | 43 |
| 4 | Snare | V | 38 |
| 5 | Kick | N | 36 |
| 6 | Open hi-hat | 8 | 46 |
| 7 | Closed hi-hat | 9 | 42 |
| 8 | Ride | 0 | 51 |

Keys are matched by what they type, then by where they are, so the same physical keys work on AZERTY and
with Shift held. There's no crash on the Handpad: lessons use kick + open hi-hat together as the big accent.

**Settings → Your DAW** picks a preset. All presets use the General MIDI notes above, which is what those
DAWs' default drum kits expect; a preset changes how note names are shown (36 is C1 in most DAWs, C2 in
REAPER, C3 in FL Studio) and the one-line setup tip. The keys stay the pad's layout in every preset.

**Custom binds**: press **Learn** next to any drum, then press a key or hit a pad. It switches to the
Custom preset (copied from the current one); a key or note already in use swaps with the other drum.

**Timing**: Settings → Calibrate plays 16 clicks; hit along and it measures your average offset
(useful over Bluetooth MIDI).

## Where things are

| File | What it does |
| --- | --- |
| `js/kit.js` | The Handpad's eight pads, keys, DAW presets, current binds, keyboard / MIDI / serial input |
| `js/audio.js` | The synthesised Handpad kit (same voices as `web/`), metronome click, scheduling on the audio clock |
| `js/lessons.js` | Lesson cards, exercises, patterns, grooves and chapters |
| `js/play.js` | The three exercise engines: note highway, find it, ear |
| `js/scenery.js` | Tiny SVG scenery kit (from Tonic) |
| `js/trail.js` | The eight places on the trail, drum-tour props, the drum mascot |
| `js/render.js` | The on-screen Handpad, the drum grid and the beat counter |
| `js/store.js` | Saved progress, practice records, chapters, streak, XP, the v1 → v2 save migration |
| `js/app.js` | Screens and game flow, including Practice |

To add a lesson, add an entry to `LESSONS` in `js/lessons.js` and put its id in a chapter. Patterns are
one string per drum, one character per step (`x` hit, `.` rest, 16 steps per bar). Drum letters:
`k` kick, `s` snare, `h` closed hi-hat, `o` open hi-hat, `r` ride, `t` tom 1, `m` tom 2, `f` floor tom.

```js
{ h: 'x.x. x.x. x.x. x.x.', s: '.... x... .... x...', k: 'x... .... x... ....' }  // the rock beat
```

From the browser console: `Backbeat.lesson('rock')`, `Backbeat.ex('rock', 2)`, `Backbeat.practice('rock')`,
and `await Sound.render('ride')` to measure a drum voice offline.
