/* Backbeat — lessons and chapters.
   A lesson is a few cards to read, look at, listen to and try, then five exercises:
     find  — hit the drums shown, in order, no timer
     ear   — hear a drum, hit the one you heard
     play  — a note highway: hit each drum as it reaches the line, on the beat
     play + echo — the first bar plays by itself, you copy it in the next bar
   Patterns: one string per drum (k kick, s snare, h hi-hat, o open hat, t tom, f floor tom, c crash).
   Each character is one step: x = hit, X = accent, . = rest. Spaces and | are ignored.
   div = steps per beat (4 = sixteenths, the default; 3 = triplets). Card text can use {kick}, {snare}… for the
   player's current key. */
(function () {
  'use strict';
  const clean = (s) => (s || '').replace(/[\s|]/g, '');
  const len = (pat) => Math.max(...Object.values(pat).map((s) => clean(s).length));
  // join bars one after another
  function seq() {
    const pats = [...arguments], out = {};
    const chs = [...new Set(pats.flatMap((p) => Object.keys(p)))];
    chs.forEach((c) => { out[c] = pats.map((p) => { const n = len(p); return (clean(p[c]) + '.'.repeat(n)).slice(0, n); }).join(''); });
    return out;
  }

  // building blocks
  const Q4 = 'x... x... x... x...', E8 = 'x.x. x.x. x.x. x.x.', S16 = 'xxxx xxxx xxxx xxxx';
  const ON13 = 'x... .... x... ....', ON24 = '.... x... .... x...';
  const ROCK = { h: E8, s: ON24, k: ON13 };
  const FILL = { s: 'x.x. x.x. .... ....', t: '.... .... x.x. ....', f: '.... .... .... x.x.' };
  const CRASH_BAR = { c: 'x... .... .... ....', h: '..x. x.x. x.x. x.x.', s: ON24, k: ON13 };

  // exercise helpers
  const find = (title, seqIds) => ({ t: 'find', title, seq: seqIds });
  const ear = (title, pool, n) => ({ t: 'ear', title, pool, n: n || 4 });
  const play = (title, pat, bpm, loops, o) => Object.assign({ t: 'play', title, pat, bpm, loops: loops || 2 }, o);
  const echo = (title, pat, bpm, loops) => ({ t: 'play', title, pat, bpm, loops: loops || 2, echo: true });
  const kit = (on) => ({ kind: 'kit', on });
  const grid = (pat, o) => Object.assign({ kind: 'grid', pat }, o);

  const LESSONS = [
    // ---------- 1 · Meet the kit ----------
    { id: 'kick', icon: '🦶', title: 'The kick drum', blurb: 'The big low boom that every beat stands on',
      cards: [
        { h: 'Say hi to the kick', p: 'The <b>kick</b> (or bass drum) is the biggest drum. Drummers play it with a foot pedal; on Handpad it’s a pad you slap. It makes the low <b>boom</b> you feel in your chest.', v: kit(['kick']), a: { drum: 'kick' }, al: 'Hear the kick' },
        { h: 'Your kick key', p: 'Press <b>{kick}</b> or hit the kick pad. Go ahead, try it a few times on the kit below — it reacts to every hit.', v: kit(['kick']) },
        { h: 'Steady like a heartbeat', p: 'Lots of songs put a kick on <b>every beat</b>: boom, boom, boom, boom. The trick is keeping the space between hits even.', v: grid({ k: Q4 }), a: { pat: { k: Q4 }, bpm: 80, loops: 2 } },
      ],
      ex: [
        find('Hit the kick four times', ['kick', 'kick', 'kick', 'kick']),
        play('Four kicks, nice and slow', { k: Q4 }, 60),
        play('A bit faster', { k: Q4 }, 75),
        play('Kick on 1 and 3', { k: ON13 }, 70),
        play('Heartbeat at walking speed', { k: Q4 }, 90),
      ] },
    { id: 'snare', icon: '🥁', title: 'The snare drum', blurb: 'The sharp crack that answers the kick',
      cards: [
        { h: 'Meet the snare', p: 'The <b>snare</b> has metal wires under it, which give it that bright <b>crack</b>. If the kick is the “boom”, the snare is the “bap”.', v: kit(['snare']), a: { drum: 'snare' }, al: 'Hear the snare' },
        { h: 'Your snare key', p: 'Press <b>{snare}</b> or hit the snare pad. Then try kick ({kick}) and snare one after the other: boom… bap… boom… bap.', v: kit(['kick', 'snare']) },
        { h: 'Kick and snare take turns', p: 'Kick on beats <b>1 and 3</b>, snare on <b>2 and 4</b>. This little conversation is in almost every pop and rock song.', v: grid({ s: ON24, k: ON13 }), a: { pat: { s: ON24, k: ON13 }, bpm: 80, loops: 2 } },
      ],
      ex: [
        find('Find the snare', ['snare', 'kick', 'snare', 'snare', 'kick']),
        ear('Kick or snare? Hit what you hear', ['kick', 'snare']),
        play('Snare on 2 and 4', { s: ON24 }, 70),
        play('Boom… bap… boom… bap', { s: ON24, k: ON13 }, 70),
        play('Same groove, a little faster', { s: ON24, k: ON13 }, 85),
      ] },
    { id: 'hat', icon: '🛸', title: 'The hi-hat', blurb: 'Two cymbals that tick like a clock',
      cards: [
        { h: 'Meet the hi-hat', p: 'The <b>hi-hat</b> is two small cymbals clamped together. Closed, it makes a short <b>tss</b>. Drummers use it to keep time, like the ticking of a clock.', v: kit(['hat']), a: { drum: 'hat' }, al: 'Hear the hi-hat' },
        { h: 'Your hi-hat key', p: 'Press <b>{hat}</b> or hit the hi-hat pad. Now you know three drums: kick {kick}, snare {snare}, hi-hat {hat}.', v: kit(['kick', 'snare', 'hat']) },
        { h: 'Tick, tick, tick', p: 'Hi-hats often play <b>twice per beat</b>. Listen to how they fill the space between the beats.', v: grid({ h: E8 }), a: { pat: { h: E8 }, bpm: 80, loops: 2 } },
      ],
      ex: [
        find('Find the hi-hat', ['hat', 'hat', 'snare', 'hat', 'kick']),
        ear('Which drum was it?', ['kick', 'snare', 'hat']),
        play('Hi-hat on every beat', { h: Q4 }, 70),
        play('Twice per beat', { h: E8 }, 65),
        play('Keep ticking, faster', { h: E8 }, 80),
      ] },

    // ---------- 2 · Counting time ----------
    { id: 'count', icon: '🔢', title: 'Count to four', blurb: 'Beats, bars and the count-in',
      cards: [
        { h: 'Music walks in beats', p: 'Almost every song you know counts <b>1, 2, 3, 4</b>, then starts again. One round of four beats is called a <b>bar</b>.', v: { kind: 'beats' }, a: { clicks: 4, bpm: 80 }, al: 'Hear four beats' },
        { h: 'The click', p: 'A <b>metronome</b> clicks on every beat so you stay in time. Its speed is in <b>BPM</b>, beats per minute: 60 BPM is one click per second.', v: { kind: 'beats' }, a: { clicks: 8, bpm: 60 }, al: 'Hear 60 BPM' },
        { h: 'The count-in', p: 'Every exercise starts with <b>four clicks</b>: 1, 2, 3, 4. Don’t play yet — start on the <b>next</b> 1. The first click of each bar is higher.', v: { kind: 'beats' }, a: { clicks: 8, bpm: 80 }, al: 'Hear a count-in' },
      ],
      ex: [
        play('Snare on every beat', { s: Q4 }, 60),
        play('Kick on every beat', { k: Q4 }, 80),
        play('Hi-hat on every beat', { h: Q4 }, 95),
        play('Kick, snare, kick, snare', { s: ON24, k: ON13 }, 80),
        play('Two at once: kick + hi-hat together', { h: Q4, k: Q4 }, 70),
      ] },
    { id: 'backbeat', icon: '💥', title: 'The backbeat', blurb: 'Kick on 1 and 3, snare on 2 and 4',
      cards: [
        { h: 'Where people clap', p: 'At a concert, people clap on <b>2 and 4</b>. That’s the <b>backbeat</b>, and it’s the snare’s job. The kick holds down <b>1 and 3</b>.', v: grid({ s: ON24, k: ON13 }), a: { pat: { s: ON24, k: ON13 }, bpm: 90, loops: 2 } },
        { h: 'Copy me', p: 'New game: in an <b>echo</b> exercise, the first bar plays by itself (the notes are faded). Listen, then copy it in the next bar.', v: grid({ s: ON24, k: ON13 }) },
      ],
      ex: [
        play('The backbeat, slow', { s: ON24, k: ON13 }, 70),
        echo('Echo: listen, then copy', { s: ON24, k: ON13 }, 75),
        play('Backbeat at 85', { s: ON24, k: ON13 }, 85, 3),
        play('A sneaky extra kick', { s: ON24, k: 'x... .... x.x. ....' }, 75),
        play('Backbeat at 100', { s: ON24, k: ON13 }, 100, 3),
      ] },
    { id: 'eighths', icon: '⏱️', title: 'Eighth notes', blurb: 'Count “1 and 2 and” — twice as many hits',
      cards: [
        { h: 'The “and” between beats', p: 'Split each beat in two and count <b>1 & 2 & 3 & 4 &</b>. Each of those is an <b>eighth note</b>. The “&” lands exactly halfway.', v: grid({ h: E8 }), a: { pat: { h: E8 }, bpm: 70, loops: 2 } },
        { h: 'Even beats evenly', p: 'Speed doesn’t matter yet. <b>Even spacing</b> does: tick, tick, tick, tick, like a clock. Stay relaxed.', v: grid({ h: E8, k: ON13 }), a: { pat: { h: E8, k: ON13 }, bpm: 70, loops: 2 } },
      ],
      ex: [
        play('Hi-hat eighths', { h: E8 }, 60),
        play('Snare eighths', { s: E8 }, 70),
        echo('Echo: eighths and kicks', { h: E8, k: ON13 }, 70),
        play('Eighths + kick on 1 and 3', { h: E8, k: ON13 }, 70),
        play('Eighths + snare on 2 and 4', { h: E8, s: ON24 }, 70),
      ] },

    // ---------- 3 · Your first beat ----------
    { id: 'hatsnare', icon: '🤝', title: 'Hi-hat + snare', blurb: 'Two hands, one groove',
      cards: [
        { h: 'Hands working together', p: 'Real drummers keep the hi-hat going with one hand and drop the snare in with the other. On beats 2 and 4, <b>hi-hat and snare hit together</b>.', v: grid({ h: E8, s: ON24 }), a: { pat: { h: E8, s: ON24 }, bpm: 75, loops: 2 } },
        { h: 'Your keys', p: 'Hi-hat <b>{hat}</b>, snare <b>{snare}</b>. Try pressing both at once on the kit below.', v: kit(['hat', 'snare']) },
      ],
      ex: [
        play('Hi-hat and snare, slow', { h: E8, s: ON24 }, 65),
        play('Again at 80', { h: E8, s: ON24 }, 80),
        echo('Echo it back', { h: E8, s: ON24 }, 80),
        play('Snare on the last “&” too', { h: E8, s: '.... x... .... x.x.' }, 75),
        play('Hi-hat and snare at 95', { h: E8, s: ON24 }, 95, 3),
      ] },
    { id: 'rock', icon: '🎸', title: 'The rock beat', blurb: 'Hi-hat, snare and kick together',
      cards: [
        { h: 'Your first real beat', p: 'Hi-hat eighths, snare on 2 and 4, kick on 1 and 3. Put them together and you have the <b>rock beat</b> — thousands of songs use it.', v: grid(ROCK), a: { pat: ROCK, bpm: 90, loops: 2 } },
        { h: 'Build it in layers', p: 'If it feels like a lot, it is! We’ll stack it one layer at a time: hi-hat + kick first, then add the snare.', v: kit(['hat', 'snare', 'kick']) },
      ],
      ex: [
        play('Layer 1: hi-hat + kick', { h: E8, k: ON13 }, 60),
        play('All three, slow', ROCK, 60),
        echo('Echo: the rock beat', ROCK, 70),
        play('Rock beat at 80', ROCK, 80, 3),
        play('Rock beat at 95', ROCK, 95, 3),
      ] },
    { id: 'keepgoing', icon: '🔁', title: 'Keep it going', blurb: 'Four bars without stopping',
      cards: [
        { h: 'Grooves repeat', p: 'Drummers play the same bar again and again, and change a little detail now and then. Here are two versions with different kicks.', v: grid(seq(ROCK, { h: E8, s: ON24, k: 'x... ...x x... ....' })), a: { pat: seq(ROCK, { h: E8, s: ON24, k: 'x... ...x x... ....' }), bpm: 85, loops: 2 } },
        { h: 'Lost? Jump back in', p: 'If you lose the beat, don’t stop. Keep counting and jump back in on the next <b>1</b>.', v: grid(ROCK) },
      ],
      ex: [
        play('Four bars of rock', ROCK, 80, 4),
        play('Variation: kick on “2 &”', { h: E8, s: ON24, k: 'x... ..x. x... ....' }, 75),
        play('Variation: kick on “3 &”', { h: E8, s: ON24, k: 'x... .... x.x. ....' }, 80),
        play('Switch every bar', seq(ROCK, { h: E8, s: ON24, k: 'x... ..x. x... ....' }), 80, 2),
        play('Speed run!', ROCK, 105, 4),
      ] },

    // ---------- 4 · Cymbals & space ----------
    { id: 'openhat', icon: '🌊', title: 'The open hi-hat', blurb: 'Let it ring, then close it',
      cards: [
        { h: 'Open up', p: 'Lift your foot off the hi-hat pedal and the cymbals ring: <b>tssshh</b>. That’s the <b>open hi-hat</b>. Hit the closed hat again and it stops.', v: kit(['open', 'hat']), a: { drum: 'open' }, al: 'Hear the open hat' },
        { h: 'Your open-hat key', p: 'Press <b>{open}</b> for the open hat, <b>{hat}</b> for closed. Try open then closed: tssshh-t!', v: kit(['open', 'hat']) },
        { h: 'Open on the last “&”', p: 'A classic trick: open the hat on the <b>“&” of 4</b>, right before the bar starts again. It pulls you into the next bar.', v: grid({ o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...', s: ON24, k: ON13 }), a: { pat: { o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...', s: ON24, k: ON13 }, bpm: 85, loops: 2 } },
      ],
      ex: [
        find('Open, closed, open, closed', ['open', 'hat', 'open', 'hat']),
        ear('Open or closed?', ['hat', 'open', 'snare']),
        play('Open on the last “&”', { o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...' }, 70),
        play('Add kick and snare', { o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...', s: ON24, k: ON13 }, 70),
        play('Open-hat groove at 85', { o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...', s: ON24, k: ON13 }, 85, 3),
      ] },
    { id: 'crash', icon: '💫', title: 'The crash', blurb: 'Mark the start of something new',
      cards: [
        { h: 'Meet the crash', p: 'The <b>crash</b> is a big cymbal that explodes and rings out. Drummers hit it to say “new part!” — usually on beat 1, together with the kick.', v: kit(['crash']), a: { drum: 'crash' }, al: 'Hear the crash' },
        { h: 'Your crash key', p: 'Press <b>{crash}</b> or hit the crash pad. Crash + kick together = a big landing.', v: kit(['crash', 'kick']) },
        { h: 'Crash, then groove', p: 'Hit crash and kick on 1, then carry on with the rock beat. The crash replaces the first hi-hat.', v: grid(seq(CRASH_BAR, ROCK)), a: { pat: seq(CRASH_BAR, ROCK), bpm: 85, loops: 1 } },
      ],
      ex: [
        find('Find the crash', ['crash', 'kick', 'crash', 'hat']),
        ear('Crash, open hat or hi-hat?', ['crash', 'open', 'hat']),
        play('Crash + kick on 1', { c: 'x... .... .... ....', k: 'x... .... .... ....' }, 70, 3),
        play('Crash, then rock beat', seq(CRASH_BAR, ROCK), 70, 2),
        play('Crash every four bars', seq(CRASH_BAR, ROCK, ROCK, ROCK), 85, 1),
      ] },
    { id: 'rests', icon: '🤫', title: 'Rests', blurb: 'The space between notes is music too',
      cards: [
        { h: 'Silence counts', p: 'A <b>rest</b> is a beat where you don’t play. You still count it in your head. Good drummers are as precise with silence as with hits.', v: grid({ k: 'x... .... .... ....', s: '.... .... x... ....' }), a: { pat: { k: 'x... .... .... ....', s: '.... .... x... ....' }, bpm: 80, loops: 2 } },
        { h: 'Stop time', p: 'Bands love to <b>stop</b>: everyone hits together, then holds a bar of silence. When the groove comes back, it hits harder.', v: grid(seq(ROCK, { c: 'x... .... .... ....', k: 'x... .... .... ....' })), a: { pat: seq(ROCK, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Kick on 1, snare on 3', { k: 'x... .... .... ....', s: '.... .... x... ....' }, 70, 3),
        play('Two hits, two rests', { s: 'x... x... .... ....' }, 80, 3),
        echo('Echo with gaps', { k: 'x... .... x... ....', s: '.... .... .... x...' }, 75),
        play('Groove, then stop', seq(ROCK, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 75, 2),
        play('Stop-time at 90', seq(ROCK, ROCK, ROCK, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 90, 1),
      ] },

    // ---------- 5 · Toms & fills ----------
    { id: 'toms', icon: '🪘', title: 'Meet the toms', blurb: 'Tom and floor tom, the singing drums',
      cards: [
        { h: 'Two more drums', p: 'The <b>tom</b> sits above the kick and sounds higher. The <b>floor tom</b> stands on the floor and sounds deep and round. Toms are what make drum fills roll.', v: kit(['tom', 'floor']), a: { pat: { t: 'x... x... .... ....', f: '.... .... x... x...' }, bpm: 90, loops: 1 }, al: 'Hear the toms' },
        { h: 'Your tom keys', p: 'Tom <b>{tom}</b>, floor tom <b>{floor}</b>. Try going high to low: tom, tom, floor, floor.', v: kit(['tom', 'floor']) },
        { h: 'A jungle groove', p: 'Toms can also carry the beat. Floor tom eighths with the tom on 2 and 4 sounds like a tribal drum circle.', v: grid({ f: E8, t: ON24 }), a: { pat: { f: E8, t: ON24 }, bpm: 90, loops: 2 } },
      ],
      ex: [
        find('High, high, low, low', ['tom', 'tom', 'floor', 'floor']),
        ear('Tom, floor tom or snare?', ['tom', 'floor', 'snare']),
        play('Tom, tom, floor, floor', { t: 'x... x... .... ....', f: '.... .... x... x...' }, 70),
        play('Jungle groove', { f: E8, t: ON24 }, 75),
        play('Jungle groove + kick', { f: E8, t: ON24, k: ON13 }, 80),
      ] },
    { id: 'fill', icon: '🌀', title: 'Your first fill', blurb: 'Snare, tom, floor: roll around the kit',
      cards: [
        { h: 'What’s a fill?', p: 'A <b>fill</b> is a short break from the groove, usually at the end of a section. It travels around the kit, from high to low.', v: grid(FILL), a: { pat: FILL, bpm: 75, loops: 2 } },
        { h: 'Groove, fill, groove', p: 'Play the rock beat, swap the last bar for a fill, then come back. It tells the band (and the crowd) that something new is coming.', v: grid(seq(ROCK, FILL)), a: { pat: seq(ROCK, FILL), bpm: 85, loops: 1 } },
      ],
      ex: [
        play('The fill on its own, slow', FILL, 60),
        play('The fill at 75', FILL, 75),
        echo('Echo the fill', FILL, 70),
        play('Rock beat, then fill', seq(ROCK, FILL), 70, 2),
        play('Rock, rock, rock, fill', seq(ROCK, ROCK, ROCK, FILL), 85, 1),
      ] },
    { id: 'fillcrash', icon: '🎆', title: 'Land on the crash', blurb: 'End the fill with a bang',
      cards: [
        { h: 'Stick the landing', p: 'After a fill, hit <b>crash + kick on the next 1</b>. That’s the landing, and it feels great when it’s right on time.', v: grid(seq(FILL, CRASH_BAR)), a: { pat: seq(FILL, CRASH_BAR), bpm: 80, loops: 1 } },
      ],
      ex: [
        play('Fill, then crash', seq(FILL, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 65, 2),
        play('Fill into the groove', seq(FILL, CRASH_BAR), 70, 2),
        echo('Echo: fill and landing', seq(FILL, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 70, 1),
        play('Groove, fill, land', seq(ROCK, FILL, CRASH_BAR), 80, 1),
        play('The whole song section', seq(CRASH_BAR, ROCK, ROCK, FILL, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 90, 1),
      ] },

    // ---------- 6 · Famous grooves ----------
    { id: 'four', icon: '🪩', title: 'Four on the floor', blurb: 'Disco and house: a kick on every beat',
      cards: [
        { h: 'Dance music’s engine', p: 'Disco, house and techno put the <b>kick on every beat</b>. The open hi-hat goes on every <b>“&”</b> — that’s the “ts” in “boom-ts boom-ts”.', v: grid({ o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }), a: { pat: { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, bpm: 118, loops: 2 } },
      ],
      ex: [
        play('Boom-ts, boom-ts', { o: '..x. ..x. ..x. ..x.', k: Q4 }, 80),
        play('Add the snare (clap)', { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, 85),
        echo('Echo the house beat', { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, 95),
        play('Disco speed', { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, 110, 3),
        play('Club speed', { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, 122, 4),
      ] },
    { id: 'boombap', icon: '🎧', title: 'Boom bap', blurb: 'The hip-hop head-nod',
      cards: [
        { h: 'Nod your head', p: 'Classic hip-hop beats are slow and heavy. The kick moves around (“boom… b-boom”), the snare stays on 2 and 4 (“bap”).', v: grid({ h: E8, s: ON24, k: 'x... ..x. ..x. ....' }), a: { pat: { h: E8, s: ON24, k: 'x... ..x. ..x. ....' }, bpm: 88, loops: 2 } },
      ],
      ex: [
        play('Kick and snare only', { s: ON24, k: 'x... ..x. ..x. ....' }, 70),
        play('Add the hi-hat', { h: E8, s: ON24, k: 'x... ..x. ..x. ....' }, 70),
        echo('Echo the boom bap', { h: E8, s: ON24, k: 'x... ..x. ..x. ....' }, 80),
        play('A different kick', { h: E8, s: ON24, k: 'x... .... .xx. ....' }, 80),
        play('Head-nod speed', { h: E8, s: ON24, k: 'x... ..x. ..x. ....' }, 90, 3),
      ] },
    { id: 'halftime', icon: '🐢', title: 'Half-time', blurb: 'Snare only on 3: big and heavy',
      cards: [
        { h: 'Twice as slow, feels twice as big', p: 'Move the snare to <b>beat 3 only</b> and the same tempo suddenly feels huge and slow. Rock ballads, trap and metal breakdowns love this.', v: grid({ h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }), a: { pat: { h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }, bpm: 90, loops: 2 } },
      ],
      ex: [
        play('Snare on 3', { h: E8, s: '.... .... x... ....' }, 75),
        play('The half-time groove', { h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }, 75),
        echo('Echo it', { h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }, 80),
        play('Normal, then half-time', seq(ROCK, { h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }), 85, 2),
        play('Heavy at 95', { h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }, 95, 3),
      ] },

    // ---------- 7 · Sixteenths & funk ----------
    { id: 'sixteenths', icon: '🐇', title: 'Sixteenth notes', blurb: 'Count “1 e & a”: four hits per beat',
      cards: [
        { h: 'Split the beat in four', p: 'Count <b>1 e & a, 2 e & a…</b> Each syllable is a <b>sixteenth note</b>. At slow tempos they sound smooth; faster, they buzz.', v: grid({ h: S16 }), a: { pat: { h: S16 }, bpm: 70, loops: 2 } },
        { h: 'Stay loose', p: 'Sixteenths are fast. Keep your hand relaxed and let the hits flow; tense hands get tired and rush.', v: grid({ h: S16, s: ON24, k: ON13 }), a: { pat: { h: S16, s: ON24, k: ON13 }, bpm: 70, loops: 2 } },
      ],
      ex: [
        play('Sixteenths on the hi-hat, slow', { h: S16 }, 50),
        play('Sixteenths at 60', { h: S16 }, 60),
        play('Add kick on 1 and 3', { h: S16, k: ON13 }, 55),
        play('The sixteenth rock beat', { h: S16, s: ON24, k: ON13 }, 55),
        play('Sixteenth beat at 70', { h: S16, s: ON24, k: ON13 }, 70, 3),
      ] },
    { id: 'synco', icon: '🦘', title: 'Syncopation', blurb: 'Kicks that land between the beats',
      cards: [
        { h: 'Off the beat', p: '<b>Syncopation</b> means putting hits where you don’t expect them, on the “e”, “&” or “a”. It makes a groove bounce.', v: grid({ h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }), a: { pat: { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Kick on 1 and “1 a”', { h: E8, k: 'x..x .... x... ....' }, 65),
        play('Add the snare', { h: E8, s: ON24, k: 'x..x .... x... ....' }, 65),
        echo('Echo the bounce', { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, 70),
        play('Bouncy kick', { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, 75),
        play('Bounce at 90', { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, 90, 3),
      ] },
    { id: 'funk', icon: '🕺', title: 'Funk groove', blurb: 'Syncopated snare, swagger and all',
      cards: [
        { h: 'Get funky', p: 'Funk moves the snare off the beat too: one sneaks in on the “e” of 3. Add a busy kick and the groove starts to strut.', v: grid({ h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' }), a: { pat: { h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' }, bpm: 90, loops: 2 } },
      ],
      ex: [
        play('Snare: 2, “3 e”, 4', { h: E8, s: '.... x... .x.. x...' }, 65),
        play('Kick pattern on its own', { h: E8, k: 'x.x. .... ..x. .x..' }, 65),
        play('All together, slow', { h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' }, 65),
        echo('Echo the funk', { h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' }, 75),
        play('Funk at 90', { h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' }, 90, 3),
      ] },

    // ---------- 8 · Feel & flavour ----------
    { id: 'shuffle', icon: '💃', title: 'The shuffle', blurb: 'Swing: long-short, long-short',
      cards: [
        { h: 'Count in threes', p: 'Split each beat in <b>three</b> (“1 trip let”) and play only the first and last: <b>long-short, long-short</b>. That’s the shuffle, the bounce of blues and swing.', v: grid({ h: 'x.x x.x x.x x.x' }, { div: 3 }), a: { pat: { h: 'x.x x.x x.x x.x' }, bpm: 90, div: 3, loops: 2 } },
        { h: 'The shuffle beat', p: 'Keep the hi-hat swinging, snare on 2 and 4, kick on 1 and 3.', v: grid({ h: 'x.x x.x x.x x.x', s: '... x.. ... x..', k: 'x.. ... x.. ...' }, { div: 3 }), a: { pat: { h: 'x.x x.x x.x x.x', s: '... x.. ... x..', k: 'x.. ... x.. ...' }, bpm: 95, div: 3, loops: 2 } },
      ],
      ex: [
        play('Swing the hi-hat', { h: 'x.x x.x x.x x.x' }, 70, 2, { div: 3 }),
        play('Add the snare', { h: 'x.x x.x x.x x.x', s: '... x.. ... x..' }, 70, 2, { div: 3 }),
        play('The shuffle beat', { h: 'x.x x.x x.x x.x', s: '... x.. ... x..', k: 'x.. ... x.. ...' }, 75, 2, { div: 3 }),
        play('Shuffle with a pickup kick', { h: 'x.x x.x x.x x.x', s: '... x.. ... x..', k: 'x.. ... x.x ...' }, 80, 2, { div: 3 }),
        play('Shuffle at 95', { h: 'x.x x.x x.x x.x', s: '... x.. ... x..', k: 'x.. ... x.. ...' }, 95, 3, { div: 3 }),
      ] },
    { id: 'onedrop', icon: '🌴', title: 'Reggae one drop', blurb: 'Kick and snare together, only on 3',
      cards: [
        { h: 'Drop on three', p: 'In the reggae <b>one drop</b>, beat 1 is empty and the kick and snare land <b>together on 3</b>. It feels laid-back and floaty.', v: grid({ h: E8, s: '.... .... x... ....', k: '.... .... x... ....' }), a: { pat: { h: E8, s: '.... .... x... ....', k: '.... .... x... ....' }, bpm: 75, loops: 2 } },
      ],
      ex: [
        play('Kick + snare on 3', { s: '.... .... x... ....', k: '.... .... x... ....' }, 70, 3),
        play('Add the hi-hat', { h: E8, s: '.... .... x... ....', k: '.... .... x... ....' }, 70),
        echo('Echo the drop', { h: E8, s: '.... .... x... ....', k: '.... .... x... ....' }, 75),
        play('With an open hat', { h: 'x.x. x.x. x.x. x...', o: '.... .... .... ..x.', s: '.... .... x... ....', k: '.... .... x... ....' }, 75),
        play('One drop at 85', { h: E8, s: '.... .... x... ....', k: '.... .... x... ....' }, 85, 3),
      ] },
    { id: 'finale', icon: '🏟️', title: 'Headline show', blurb: 'Everything you learned, on the big stage',
      cards: [
        { h: 'Your big moment', p: 'Crash in, groove, fill, land. This is a real song section: everything from the trail in one go. Breathe, count the 4 clicks, and play.', v: grid(seq(CRASH_BAR, ROCK, ROCK, FILL)), a: { pat: seq(CRASH_BAR, ROCK, ROCK, FILL), bpm: 90, loops: 1 } },
      ],
      ex: [
        play('Warm-up: the rock beat', ROCK, 85, 3),
        play('Open-hat groove into a fill', seq({ o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...', s: ON24, k: ON13 }, FILL), 80, 2),
        play('Four on the floor, then stop', seq({ o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 }, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 105, 1),
        play('Half-time breakdown', seq({ h: E8, s: '.... .... x... ....', k: 'x... .... .... ..x.' }, FILL), 85, 2),
        play('Encore: the full song section', seq(CRASH_BAR, ROCK, ROCK, FILL, { c: 'x... .... .... ....', k: 'x... .... .... ....' }), 95, 1),
      ] },
  ];

  const CHAPTERS = [
    { title: 'Meet the kit', place: 'The Garage', mark: '🚪', ids: ['kick', 'snare', 'hat'] },
    { title: 'Counting time', place: 'Backyard Party', mark: '🎈', ids: ['count', 'backbeat', 'eighths'] },
    { title: 'Your first beat', place: 'Street Corner', mark: '🏙️', ids: ['hatsnare', 'rock', 'keepgoing'] },
    { title: 'Cymbals & space', place: 'Beach Bonfire', mark: '🔥', ids: ['openhat', 'crash', 'rests'] },
    { title: 'Toms & fills', place: 'Jungle Camp', mark: '🌿', ids: ['toms', 'fill', 'fillcrash'] },
    { title: 'Famous grooves', place: 'Desert Highway', mark: '🌵', ids: ['four', 'boombap', 'halftime'] },
    { title: 'Sixteenths & funk', place: 'Mountain Lodge', mark: '🏔️', ids: ['sixteenths', 'synco', 'funk'] },
    { title: 'Feel & flavour', place: 'Festival Stage', mark: '🎪', ids: ['shuffle', 'onedrop', 'finale'] },
  ];

  // Turn a pattern into timed notes. Returns { steps, div, notes: [{ step, id, acc }] }.
  function parse(pat, div) {
    const notes = [];
    let steps = 0;
    Object.keys(pat).forEach((c) => {
      const s = clean(pat[c]);
      steps = Math.max(steps, s.length);
      const d = window.Kit.byCh(c);
      for (let i = 0; i < s.length; i++) if (s[i] === 'x' || s[i] === 'X') notes.push({ step: i, id: d.id, acc: s[i] === 'X' });
    });
    notes.sort((a, b) => a.step - b.step);
    return { steps, div: div || 4, notes };
  }

  window.Lessons = { LESSONS, CHAPTERS, parse, clean, byId: (id) => LESSONS.find((l) => l.id === id) };
})();
