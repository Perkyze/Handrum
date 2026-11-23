/* Backbeat — lessons and chapters.
   A lesson is one or two cards to read, look at, listen to and try, then three steps, each a different job:
     find  — hit the drums shown, in order, no timer
     ear   — hear a drum, hit the one you heard
     play  — a note highway: hit each drum as it reaches the line, on the beat
     play + echo — the first bar plays by itself, you copy it in the next bar
   Not dialed in yet? Any play step (and every lesson's groove) opens in Practice: it loops with a tempo
   that climbs when you're on it and backs off when you're not.
   Patterns: one string per drum, using the drum's letter:
     k kick, s snare, h closed hi-hat, o open hi-hat, r ride, t tom 1, m tom 2, f floor tom.
   Each character is one step: x = hit, X = accent, . = rest. Spaces and | are ignored.
   div = steps per beat (4 = sixteenths, the default; 3 = triplets). Card text can use {kick}, {snare}, {tom1}… for the
   player's current key. groove: what Practice loops for this lesson (defaults to its last play step). */
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
  const add = (a, b) => Object.assign({}, a, b);

  // ---------- building blocks ----------
  const Q4 = 'x... x... x... x...', E8 = 'x.x. x.x. x.x. x.x.', S16 = 'xxxx xxxx xxxx xxxx';
  const ONE = 'x... .... .... ....', ON13 = 'x... .... x... ....', ON24 = '.... x... .... x...', ON3 = '.... .... x... ....';
  const ROCK = { h: E8, s: ON24, k: ON13 };
  const RIDE = { r: E8, s: ON24, k: ON13 };                                   // the rock beat on the ride
  const OPEN4 = { o: '.... .... .... ..x.', h: 'x.x. x.x. x.x. x...' };     // open hat on the "&" of 4
  const OPENROCK = add(OPEN4, { s: ON24, k: ON13 });
  const FOUR = { o: '..x. ..x. ..x. ..x.', s: ON24, k: Q4 };                // four on the floor
  const HALF = { s: ON3, k: 'x... .... .... ..x.' };                        // half-time: snare on 3
  // No crash on the Handpad: a big hit is kick + open hi-hat together, which splashes.
  const STOP = { o: ONE, k: ONE };                                           // hit together, then silence
  const LAND = { o: ONE, h: '..x. x.x. x.x. x.x.', s: ON24, k: ON13 };      // splash on 1, then the groove
  const RIDE_IN = { o: ONE, r: '..x. x.x. x.x. x.x.', s: ON24, k: ON13 };   // splash on 1, then the groove on the ride
  // a fill goes around the kit, high to low: snare, tom 1, tom 2, floor tom, one beat each
  const FILL = { s: 'x.x. .... .... ....', t: '.... x.x. .... ....', m: '.... .... x.x. ....', f: '.... .... .... x.x.' };
  const FILL16 = { s: 'xxxx .... .... ....', t: '.... xxxx .... ....', m: '.... .... xxxx ....', f: '.... .... .... xxxx' };
  const MINI = { h: 'x.x. x.x. x.x. ....', s: '.... x... .... ....', k: ON13, t: '.... .... .... x...', f: '.... .... .... ..x.' };   // groove, then one beat of toms
  const BOOMBAP = { h: E8, s: ON24, k: 'x... ..x. ..x. ....' };
  const JUNGLE = { f: E8, t: '.... x... .... ....', m: '.... .... .... x...' };
  const FUNK = { h: E8, s: '.... x... .x.. x...', k: 'x.x. .... ..x. .x..' };
  const SH = 'x.x x.x x.x x.x';                                                 // shuffle: long-short in triplets
  const SHUF = { h: SH, s: '... x.. ... x..', k: 'x.. ... x.. ...' };
  const DROP = { h: E8, s: ON3, k: ON3 };                                        // reggae one drop

  // ---------- exercise helpers ----------
  const find = (title, seqIds) => ({ t: 'find', title, seq: seqIds });
  const ear = (title, pool, n) => ({ t: 'ear', title, pool, n: n || 4 });
  const play = (title, pat, bpm, loops, o) => Object.assign({ t: 'play', title, pat, bpm, loops: loops || 2 }, o);
  const echo = (title, pat, bpm, loops, o) => Object.assign({ t: 'play', title, pat, bpm, loops: loops || 2, echo: true }, o);
  const kit = (on) => ({ kind: 'kit', on });
  const grid = (pat, o) => Object.assign({ kind: 'grid', pat }, o);

  const LESSONS = [
    // ---------- 1 · Meet the Handpad ----------
    { id: 'kicksnare', icon: '🦶', title: 'Kick & snare', blurb: 'The two big pads: boom and bap',
      cards: [
        { h: 'The two big pads', p: 'The bottom pads are the <b>snare</b> ({snare}) and the <b>kick</b> ({kick}). The kick is the low <b>boom</b> you feel in your chest; the snare is the sharp <b>bap</b>. Try them on the pad below.', v: kit(['snare', 'kick']), a: { pat: { k: 'x... .... x... ....', s: '.... x... .... x...' }, bpm: 80, loops: 1 }, al: 'Hear boom, bap' },
        { h: 'They take turns', p: 'Kick on beats <b>1 and 3</b>, snare on <b>2 and 4</b>. It’s in almost every pop and rock song. Timed steps start with <b>four clicks</b>: count 1, 2, 3, 4, then come in on the next 1.', v: grid({ s: ON24, k: ON13 }), a: { pat: { s: ON24, k: ON13 }, bpm: 80, loops: 2 } },
      ],
      ex: [
        find('Find them', ['kick', 'snare', 'kick', 'kick', 'snare']),
        ear('Kick or snare? Hit what you hear', ['kick', 'snare']),
        play('Boom… bap… boom… bap', { s: ON24, k: ON13 }, 70),
      ] },
    { id: 'hihat', icon: '🛸', title: 'The hi-hat', blurb: 'Keep time like a clock: 1 & 2 &',
      cards: [
        { h: 'Meet the hi-hat', p: 'The <b>closed hi-hat</b> ({hat}) is two small cymbals clamped shut: a short <b>tss</b>. It sits top right, in the middle of the three cymbal pads. Drummers tick it to keep time.', v: kit(['hat']), a: { drum: 'hat' }, al: 'Hear the hi-hat' },
        { h: 'Twice per beat', p: 'Split each beat in two and count <b>1 & 2 & 3 & 4 &</b>. Those are <b>eighth notes</b>. Speed doesn’t matter yet: <b>even spacing</b> does.', v: grid({ h: E8 }), a: { pat: { h: E8 }, bpm: 75, loops: 2 } },
      ],
      ex: [
        play('Hi-hat on every beat', { h: Q4 }, 75),
        play('Twice per beat: 1 & 2 &', { h: E8 }, 70),
        play('Hi-hat + snare on 2 and 4', { h: E8, s: ON24 }, 70),
      ] },
    { id: 'rock', icon: '🎸', title: 'Your first beat', blurb: 'Hi-hat, snare and kick: the rock beat',
      cards: [
        { h: 'Put it together', p: 'Hi-hat eighths, snare on 2 and 4, kick on 1 and 3: the <b>rock beat</b>, in thousands of songs. On the Handpad, one hand ticks the hi-hat ({hat}) and the other rocks between kick ({kick}) and snare ({snare}).', v: grid(ROCK), a: { pat: ROCK, bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Layer 1: hi-hat + kick', { h: E8, k: ON13 }, 65),
        play('All three, slow', ROCK, 65),
        echo('Echo: listen, then copy', ROCK, 75),
      ],
      groove: play('The rock beat', ROCK, 85) },

    // ---------- 2 · Groove basics ----------
    { id: 'kickmoves', icon: '🔁', title: 'Move the kick', blurb: 'Same beat, new kick spots',
      cards: [
        { h: 'Grooves repeat, details change', p: 'Drummers keep one bar going and move a <b>kick</b> now and then. Count “1 & 2 & 3 & 4 &” and drop the extra kick on an “&”. Lost the beat? Don’t stop: jump back in on the next 1.', v: grid(seq(ROCK, add(ROCK, { k: 'x... .... x.x. ....' }))), a: { pat: seq(ROCK, add(ROCK, { k: 'x... .... x.x. ....' })), bpm: 85, loops: 1 } },
      ],
      ex: [
        play('Extra kick on “3 &”', add(ROCK, { k: 'x... .... x.x. ....' }), 75),
        play('Extra kick on “2 &”', add(ROCK, { k: 'x... ..x. x... ....' }), 75),
        play('Four bars, two kick spots', seq(ROCK, add(ROCK, { k: 'x... .... x.x. ....' }), ROCK, add(ROCK, { k: 'x... ..x. x... ....' })), 85, 1),
      ] },
    { id: 'openhat', icon: '🌊', title: 'The open hi-hat', blurb: 'Let it ring, then close it',
      cards: [
        { h: 'Open up', p: 'The <b>open hi-hat</b> ({open}) rings: <b>tssshh</b>. Hit the closed hi-hat ({hat}) right next to it and the ringing stops.', v: kit(['open', 'hat']), a: { pat: { o: 'x... .... x... ....', h: '.... x... .... x...' }, bpm: 80, loops: 1 }, al: 'Hear open, closed' },
        { h: 'Open on the last “&”', p: 'A classic trick: open the hat on the <b>“&” of 4</b>, right before the bar starts again. It pulls you into the next bar.', v: grid(OPENROCK), a: { pat: OPENROCK, bpm: 85, loops: 2 } },
      ],
      ex: [
        ear('Open or closed?', ['hat', 'open']),
        play('Open on the last “&”', OPEN4, 70),
        play('Add kick and snare', OPENROCK, 75),
      ] },
    { id: 'rests', icon: '🤫', title: 'Rests & stops', blurb: 'The space between notes is music too',
      cards: [
        { h: 'Silence counts', p: 'A <b>rest</b> is a beat where you don’t play, but you still count it. Bands love to <b>stop</b>: everyone hits together, holds the silence, and the groove comes back harder. Your big hit is <b>kick + open hi-hat</b> together.', v: grid(seq(ROCK, STOP)), a: { pat: seq(ROCK, STOP), bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Kick, snare, kick… rest on 4', { s: '.... x... .... ....', k: ON13 }, 80),
        play('Groove, then stop', seq(ROCK, STOP), 75),
        play('Three bars and a stop', seq(ROCK, ROCK, ROCK, STOP), 90, 1),
      ] },

    // ---------- 3 · Cymbals ----------
    { id: 'ride', icon: '🛎️', title: 'The ride', blurb: 'The big cymbal that goes ping',
      cards: [
        { h: 'Meet the ride', p: 'The <b>ride</b> ({ride}) is the cymbal pad on the far right. It goes <b>ping</b>, with a shimmer behind it. Drummers move to the ride when a song gets bigger.', v: kit(['ride', 'open', 'hat']), a: { drum: 'ride' }, al: 'Hear the ride' },
        { h: 'Hat or ride', p: 'Same beat, different colour: play the eighths on the ride instead of the hi-hat. Verse on the hat, chorus on the ride.', v: grid(seq(ROCK, RIDE)), a: { pat: seq(ROCK, RIDE), bpm: 85, loops: 1 } },
      ],
      ex: [
        find('The three cymbals', ['ride', 'hat', 'open', 'ride', 'hat']),
        play('The rock beat on the ride', RIDE, 75),
        play('A bar on the hat, a bar on the ride', seq(ROCK, RIDE), 80),
      ] },
    { id: 'four', icon: '🪩', title: 'Four on the floor', blurb: 'Disco and house: a kick on every beat',
      cards: [
        { h: 'Dance music’s engine', p: 'Disco, house and techno put the <b>kick on every beat</b> and the <b>open hi-hat</b> on every “&”: that’s the “ts” in <b>boom-ts boom-ts</b>.', v: grid(FOUR), a: { pat: FOUR, bpm: 118, loops: 2 } },
      ],
      ex: [
        play('Boom-ts, boom-ts', { o: FOUR.o, k: Q4 }, 85),
        echo('Echo the house beat', FOUR, 95),
        play('Club speed', FOUR, 118, 3),
      ] },
    { id: 'halftime', icon: '🐢', title: 'Half-time', blurb: 'Snare only on 3: big and heavy',
      cards: [
        { h: 'Twice as slow, feels twice as big', p: 'Move the snare to <b>beat 3 only</b> and the same tempo suddenly feels huge. Put it on the ride and it sounds like a stadium.', v: grid(add(HALF, { r: E8 })), a: { pat: add(HALF, { r: E8 }), bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Half-time on the hi-hat', add(HALF, { h: E8 }), 75),
        play('Now on the ride', add(HALF, { r: E8 }), 80),
        play('Normal, then half-time', seq(ROCK, add(HALF, { r: E8 })), 85),
      ] },

    // ---------- 4 · Toms & fills ----------
    { id: 'toms', icon: '🪘', title: 'Meet the toms', blurb: 'Three singing drums, high to low',
      cards: [
        { h: 'Three toms', p: 'Top left are the toms: <b>tom 1</b> ({tom1}) is the highest, <b>tom 2</b> ({tom2}) a bit lower, and the <b>floor tom</b> ({floor}) is deep and round. Toms are what make fills roll.', v: kit(['tom1', 'tom2', 'floor']), a: { pat: { t: 'x... .... .... ....', m: '.... x... .... ....', f: '.... .... x... ....' }, bpm: 90, loops: 1 }, al: 'Hear the toms' },
      ],
      ex: [
        find('High to low', ['tom1', 'tom2', 'floor', 'tom1', 'tom2', 'floor']),
        ear('Which tom?', ['tom1', 'tom2', 'floor'], 5),
        play('Down the toms', { t: 'x.x. .... .... ....', m: '.... x.x. .... ....', f: '.... .... x.x. x.x.' }, 70),
      ] },
    { id: 'fill', icon: '🌀', title: 'Your first fill', blurb: 'Snare, tom 1, tom 2, floor: around the kit',
      cards: [
        { h: 'What’s a fill?', p: 'A <b>fill</b> is a short break from the groove at the end of a section. This one moves one drum per beat, high to low: snare, tom 1, tom 2, floor tom. It tells everyone something new is coming.', v: grid(seq(ROCK, FILL)), a: { pat: seq(ROCK, FILL), bpm: 80, loops: 1 } },
      ],
      ex: [
        play('The fill on its own', FILL, 65),
        play('Rock beat, then fill', seq(ROCK, FILL), 70),
        play('Rock, rock, rock, fill', seq(ROCK, ROCK, ROCK, FILL), 85, 1),
      ] },
    { id: 'land', icon: '🎆', title: 'Land it', blurb: 'End the fill with a splash on 1',
      cards: [
        { h: 'Stick the landing', p: 'After a fill, hit <b>kick + open hi-hat</b> together on the next 1. It splashes like a crash, and it feels great when it’s right on time.', v: grid(seq(FILL, LAND)), a: { pat: seq(FILL, LAND), bpm: 80, loops: 1 } },
      ],
      ex: [
        play('Fill, then splash', seq(FILL, STOP), 65),
        play('Fill into the groove', seq(FILL, LAND), 70),
        play('Groove, fill, land', seq(ROCK, ROCK, FILL, LAND), 85, 1),
      ] },

    // ---------- 5 · Grooves & tiny fills ----------
    { id: 'jungle', icon: '🌿', title: 'Jungle toms', blurb: 'Let the toms carry the beat',
      cards: [
        { h: 'A drum circle', p: 'Toms can carry the beat too. <b>Floor tom</b> eighths with tom 1 on 2 and tom 2 on 4 sounds like a drum circle around a fire. Add the kick and it starts to stomp.', v: grid(add(JUNGLE, { k: ON13 })), a: { pat: add(JUNGLE, { k: ON13 }), bpm: 90, loops: 2 } },
      ],
      ex: [
        play('Floor eighths, toms on 2 and 4', JUNGLE, 70),
        play('Add the kick', add(JUNGLE, { k: ON13 }), 80),
        echo('Echo the stomp', add(JUNGLE, { k: 'x... ..x. x... ....' }), 85),
      ] },
    { id: 'boombap', icon: '🎧', title: 'Boom bap', blurb: 'The hip-hop head-nod',
      cards: [
        { h: 'Nod your head', p: 'Classic hip-hop beats are slow and heavy. The kick moves around (“boom… b-boom”), the snare stays on 2 and 4 (“bap”).', v: grid(BOOMBAP), a: { pat: BOOMBAP, bpm: 88, loops: 2 } },
      ],
      ex: [
        play('Kick and snare first', { s: ON24, k: BOOMBAP.k }, 70),
        play('Add the hi-hat', BOOMBAP, 75),
        play('Another kick, head-nod speed', add(BOOMBAP, { k: 'x... .... .xx. ....' }), 88, 3),
      ],
      groove: play('Boom bap', BOOMBAP, 90) },
    { id: 'minifill', icon: '🪃', title: 'Tiny fills', blurb: 'One beat of toms to end a phrase',
      cards: [
        { h: 'Small is enough', p: 'A fill doesn’t need a whole bar. Swap the <b>last beat</b> for tom 1 and floor tom and you’ve marked the end of the phrase without losing the groove.', v: grid(seq(ROCK, MINI)), a: { pat: seq(ROCK, MINI), bpm: 85, loops: 1 } },
      ],
      ex: [
        play('The last beat: tom, floor', MINI, 70),
        play('Three bars, then the tiny fill', seq(ROCK, ROCK, ROCK, MINI), 80, 1),
        play('Tiny fill, then splash', seq(ROCK, MINI, LAND, MINI), 90, 1),
      ] },

    // ---------- 6 · Sixteenths & funk ----------
    { id: 'sixteenths', icon: '🐇', title: 'Sixteenth notes', blurb: 'Count “1 e & a”: four hits per beat',
      cards: [
        { h: 'Split the beat in four', p: 'Count <b>1 e & a, 2 e & a…</b> Each syllable is a <b>sixteenth note</b>. Keep your hand loose: tense hands get tired and rush.', v: grid({ h: S16, s: ON24, k: ON13 }), a: { pat: { h: S16, s: ON24, k: ON13 }, bpm: 70, loops: 2 } },
      ],
      ex: [
        play('Sixteenths on the hi-hat', { h: S16 }, 55),
        play('Add kick and snare', { h: S16, s: ON24, k: ON13 }, 55),
        play('Sixteenth beat at 70', { h: S16, s: ON24, k: ON13 }, 70, 3),
      ] },
    { id: 'synco', icon: '🦘', title: 'Syncopation', blurb: 'Kicks that land between the beats',
      cards: [
        { h: 'Off the beat', p: '<b>Syncopation</b> means putting hits where you don’t expect them, on the “e”, “&” or “a”. It makes a groove bounce.', v: grid({ h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }), a: { pat: { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, bpm: 85, loops: 2 } },
      ],
      ex: [
        play('Kick on 1 and “1 a”', { h: E8, k: 'x..x .... x... ....' }, 65),
        play('The bouncy kick', { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, 70),
        echo('Echo the bounce', { h: E8, s: ON24, k: 'x..x ..x. ..x. ....' }, 85),
      ] },
    { id: 'funk', icon: '🕺', title: 'Funk groove', blurb: 'Syncopated snare, swagger and all',
      cards: [
        { h: 'Get funky', p: 'Funk moves the snare off the beat too: one sneaks in on the “e” of 3. Add a busy kick and the groove starts to strut.', v: grid(FUNK), a: { pat: FUNK, bpm: 90, loops: 2 } },
      ],
      ex: [
        play('Snare: 2, “3 e”, 4', { h: E8, s: FUNK.s }, 65),
        play('All together, slow', FUNK, 65),
        play('Funk at 85', FUNK, 85, 3),
      ] },

    // ---------- 7 · Feel & flavour ----------
    { id: 'shuffle', icon: '💃', title: 'The shuffle', blurb: 'Swing: long-short, long-short',
      cards: [
        { h: 'Count in threes', p: 'Split each beat in <b>three</b> (“1 trip let”) and play only the first and last: <b>long-short, long-short</b>. That’s the shuffle, the bounce of blues and swing.', v: grid(SHUF, { div: 3 }), a: { pat: SHUF, bpm: 90, div: 3, loops: 2 } },
      ],
      ex: [
        play('Swing the hi-hat', { h: SH }, 70, 2, { div: 3 }),
        play('The shuffle beat', SHUF, 75, 2, { div: 3 }),
        play('Shuffle on the ride', { r: SH, s: SHUF.s, k: SHUF.k }, 90, 3, { div: 3 }),
      ] },
    { id: 'onedrop', icon: '🌴', title: 'Reggae one drop', blurb: 'Kick and snare together, only on 3',
      cards: [
        { h: 'Drop on three', p: 'In the reggae <b>one drop</b>, beat 1 is empty and the kick and snare land <b>together on 3</b>. It feels laid-back and floaty.', v: grid(DROP), a: { pat: DROP, bpm: 75, loops: 2 } },
      ],
      ex: [
        play('Kick + snare on 3', { s: ON3, k: ON3 }, 70, 3),
        play('Add the hi-hat', DROP, 70),
        play('With an open hat', add(DROP, OPEN4), 80),
      ] },
    { id: 'roll', icon: '🌪️', title: 'Sixteenth rolls', blurb: 'Fast fills around the toms',
      cards: [
        { h: 'Roll around the kit', p: 'Same trip as your first fill, twice as fast: <b>four hits per drum</b>, snare, tom 1, tom 2, floor. Stay loose and let the hand bounce.', v: grid(FILL16), a: { pat: FILL16, bpm: 70, loops: 2 } },
      ],
      ex: [
        play('Snare, then tom 1', { s: FILL16.s, t: FILL16.t }, 60),
        play('All the way around', FILL16, 60),
        play('Groove, then roll', seq(ROCK, FILL16), 70),
      ] },

    // ---------- 8 · Headline show ----------
    { id: 'song', icon: '🎤', title: 'Verse and chorus', blurb: 'Hi-hat for the verse, ride for the chorus',
      cards: [
        { h: 'Songs have parts', p: 'The drums tell everyone where they are in a song: <b>hi-hat</b> for the verse, a <b>fill</b>, then a splash and the <b>ride</b> for the chorus.', v: grid(seq(ROCK, FILL, RIDE_IN)), a: { pat: seq(ROCK, FILL, RIDE_IN), bpm: 88, loops: 1 } },
      ],
      ex: [
        play('Verse, then fill', seq(ROCK, FILL), 80),
        play('Fill into the chorus', seq(FILL, RIDE_IN), 80),
        play('Verse, fill, chorus', seq(ROCK, ROCK, FILL, RIDE_IN), 90, 1),
      ] },
    { id: 'breakdown', icon: '🔥', title: 'The breakdown', blurb: 'Half-time on the floor tom, then back in',
      cards: [
        { h: 'Bring it down', p: 'In a <b>breakdown</b> the band drops to half-time and the floor tom takes over from the cymbals. Then a fill and a splash bring everyone back.', v: grid(seq(add(HALF, { f: E8 }), FILL, LAND)), a: { pat: seq(add(HALF, { f: E8 }), FILL, LAND), bpm: 85, loops: 1 } },
      ],
      ex: [
        play('Half-time on the floor tom', add(HALF, { f: E8 }), 80),
        play('Breakdown into a fill', seq(add(HALF, { f: E8 }), FILL), 80),
        play('Breakdown, fill, land', seq(add(HALF, { f: E8 }), add(HALF, { f: E8 }), FILL, LAND), 90, 1),
      ] },
    { id: 'finale', icon: '🏟️', title: 'Headline show', blurb: 'Everything you learned, on the big stage',
      cards: [
        { h: 'Your big moment', p: 'Verse, fill, chorus on the ride, fill, stop: a real song from start to finish. Breathe, count the 4 clicks, and play.', v: grid(seq(ROCK, ROCK, FILL, RIDE_IN, RIDE, FILL, STOP)), a: { pat: seq(ROCK, ROCK, FILL, RIDE_IN, RIDE, FILL, STOP), bpm: 95, loops: 1 } },
      ],
      ex: [
        play('Warm-up: rock with a tiny fill', seq(ROCK, MINI), 90),
        play('Four on the floor, then stop', seq(FOUR, FOUR, STOP), 110, 1),
        play('Encore: the whole song', seq(ROCK, ROCK, FILL, RIDE_IN, RIDE, FILL, STOP), 95, 1),
      ] },
  ];

  const CHAPTERS = [
    { title: 'Meet the Handpad', place: 'The Garage', mark: '🚪', ids: ['kicksnare', 'hihat', 'rock'] },
    { title: 'Groove basics', place: 'Backyard Party', mark: '🎈', ids: ['kickmoves', 'openhat', 'rests'] },
    { title: 'Cymbals', place: 'Street Corner', mark: '🏙️', ids: ['ride', 'four', 'halftime'] },
    { title: 'Toms & fills', place: 'Beach Bonfire', mark: '🔥', ids: ['toms', 'fill', 'land'] },
    { title: 'Grooves & tiny fills', place: 'Jungle Camp', mark: '🌿', ids: ['jungle', 'boombap', 'minifill'] },
    { title: 'Sixteenths & funk', place: 'Desert Highway', mark: '🌵', ids: ['sixteenths', 'synco', 'funk'] },
    { title: 'Feel & flavour', place: 'Mountain Lodge', mark: '🏔️', ids: ['shuffle', 'onedrop', 'roll'] },
    { title: 'Headline show', place: 'Festival Stage', mark: '🎪', ids: ['song', 'breakdown', 'finale'] },
  ];

  // What Practice loops for a lesson: its groove, or its last play step.
  const grooveOf = (les) => les.groove || les.ex.filter((e) => e.t === 'play').pop() || null;

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

  window.Lessons = { LESSONS, CHAPTERS, parse, clean, grooveOf, byId: (id) => LESSONS.find((l) => l.id === id) };
})();
