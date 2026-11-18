/* Backbeat — drawings: the on-screen kit (tap it, or watch it light up), the drum grid and the beat counter.
   Everything returns an HTML string; app.js wires up the taps and the highlights. */
(function () {
  'use strict';
  const K = window.Kit;
  // where each pad sits on the kit drawing (viewBox 310 × 200): x, y, radius. Laid out like a drum kit seen from the stool.
  const PADS = { crash: [100, 38, 30], open: [40, 78, 24], hat: [55, 142, 26], tom: [186, 54, 26], snare: [124, 124, 30], floor: [266, 118, 33], kick: [192, 162, 34] };

  function kit(on) {
    const lit = on && on.length ? new Set(on) : null;
    let s = '<svg class="kitsvg" viewBox="0 0 310 200" role="group" aria-label="Drum kit: tap a drum to play it">';
    K.DRUMS.forEach((d) => {
      const [x, y, r] = PADS[d.id];
      const cym = d.id === 'crash' || d.id === 'hat' || d.id === 'open';
      const key = K.keyFor(d.id);
      s += '<g class="pad' + (lit && !lit.has(d.id) ? ' dim' : '') + (lit && lit.has(d.id) ? ' lit' : '') + '" data-id="' + d.id + '" role="button" tabindex="-1" aria-label="' + d.name + ', key ' + key + '" style="--c:' + d.color + ';--cd:' + d.dark + '">' +
        '<circle class="glow" cx="' + x + '" cy="' + y + '" r="' + (r + 7) + '"/>' +
        '<circle cx="' + x + '" cy="' + (y + 4) + '" r="' + r + '" fill="' + d.dark + '"/>' +
        '<circle class="head" cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + d.color + '"/>' +
        (cym ? '<circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.62) + '" fill="none" stroke="rgba(0,0,0,.12)" stroke-width="1.5"/><circle cx="' + x + '" cy="' + y + '" r="' + (r * 0.2) + '" fill="rgba(0,0,0,.18)"/>'
          : '<circle cx="' + x + '" cy="' + y + '" r="' + (r - 5) + '" fill="#fff" opacity=".28"/>') +
        '<text class="k" x="' + x + '" y="' + (y + (r > 26 ? 2 : 3)) + '" text-anchor="middle">' + esc(key) + '</text>' +
        '<text class="n" x="' + x + '" y="' + (y + r * 0.62) + '" text-anchor="middle">' + esc(d.short || d.name) + '</text></g>';
    });
    return s + '</svg>';
  }
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const COUNTS = { 4: ['1', 'e', '&', 'a'], 3: ['1', 'tri', 'let'], 2: ['1', '&'] };
  // A drum grid: one row per drum, one column per step, one block per bar (bars wrap).
  function grid(pat, div) {
    div = div || 4;
    const P = window.Lessons.parse(pat, div);
    const perBar = div * 4;
    const bars = Math.ceil(P.steps / perBar);
    const used = K.DRUMS.filter((d) => P.notes.some((n) => n.id === d.id));
    const has = new Set(P.notes.map((n) => n.id + ':' + n.step));
    let s = '<div class="grid" style="--n:' + perBar + '">';
    for (let b = 0; b < bars; b++) {
      s += '<div class="gbar">' + (bars > 1 ? '<span class="gbar-n">Bar ' + (b + 1) + '</span>' : '') + '<div class="grow head"><span></span>';
      for (let i = 0; i < perBar; i++) {
        const c = COUNTS[div][i % div];
        s += '<b data-s="' + (b * perBar + i) + '" class="' + (i % div === 0 ? 'beat' : '') + '">' + (i % div === 0 ? Math.floor(i / div) + 1 : c) + '</b>';
      }
      s += '</div>';
      used.forEach((d) => {
        s += '<div class="grow"><span style="color:' + d.color + '">' + esc(d.short || d.name) + '</span>';
        for (let i = 0; i < perBar; i++) {
          const st = b * perBar + i;
          s += '<i data-s="' + st + '" class="' + (has.has(d.id + ':' + st) ? 'on' : '') + (i % div === 0 ? ' beat' : '') + '" style="--c:' + d.color + '"></i>';
        }
        s += '</div>';
      });
      s += '</div>';
    }
    return s + '</div>';
  }

  function beats() {
    return '<div class="beats">' + [1, 2, 3, 4].map((n) => '<i data-b="' + (n - 1) + '">' + n + '</i>').join('') + '</div>';
  }

  window.Render = { kit, grid, beats, esc, PADS };
})();
