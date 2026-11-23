/* Backbeat — drawings: the on-screen kit (tap it, or watch it light up), the drum grid and the beat counter.
   Everything returns an HTML string; app.js wires up the taps and the highlights. */
(function () {
  'use strict';
  const K = window.Kit;
  // Where each pad sits on the Handpad (viewBox 860 × 396): x, y, width, height. Same layout as the physical pad:
  // toms 1 2 3 top left and cymbals 6 7 8 top right (the middle one of each trio raised), snare 4 and kick 5 big at the bottom.
  const PADS = {
    tom1: [24, 44, 106, 78], tom2: [144, 24, 106, 78], floor: [273, 53, 106, 78],
    open: [481, 53, 106, 78], hat: [610, 24, 106, 78], ride: [730, 44, 106, 78],
    snare: [257, 256, 138, 110], kick: [465, 256, 138, 110],
  };

  function kit(on) {
    const lit = on && on.length ? new Set(on) : null;
    let s = '<svg class="kitsvg" viewBox="0 0 860 396" role="group" aria-label="Handpad: tap a pad to play it">' +
      '<rect class="kit-body" x="1" y="1" width="858" height="394" rx="40"/>' +
      '<text class="kit-mark" x="430" y="200" text-anchor="middle">HANDPAD</text>';
    K.DRUMS.forEach((d) => {
      const [x, y, w, ht] = PADS[d.id];
      const big = ht > 90, rx = big ? 22 : 18, cx = x + w / 2, cy = y + ht / 2;
      const key = K.keyFor(d.id);
      s += '<g class="pad' + (big ? ' big' : '') + (lit && !lit.has(d.id) ? ' dim' : '') + (lit && lit.has(d.id) ? ' lit' : '') + '" data-id="' + d.id + '" role="button" tabindex="-1" aria-label="Pad ' + d.pad + ', ' + d.name + ', key ' + key + '" style="--c:' + d.color + ';--cd:' + d.dark + '">' +
        '<rect class="glow" x="' + (x - 9) + '" y="' + (y - 9) + '" width="' + (w + 18) + '" height="' + (ht + 18) + '" rx="' + (rx + 9) + '"/>' +
        '<rect x="' + x + '" y="' + (y + 7) + '" width="' + w + '" height="' + ht + '" rx="' + rx + '" fill="' + d.dark + '"/>' +
        '<g class="face"><rect class="head" x="' + x + '" y="' + y + '" width="' + w + '" height="' + ht + '" rx="' + rx + '" fill="' + d.color + '"/>' +
        // cymbals get a little cymbal in the corner, drums a lighter head
        (d.cym ? '<circle cx="' + (x + w - 17) + '" cy="' + (y + 17) + '" r="8" fill="none" stroke="rgba(21,18,43,.35)" stroke-width="2.5"/><circle cx="' + (x + w - 17) + '" cy="' + (y + 17) + '" r="2.6" fill="rgba(21,18,43,.4)"/>'
          : '<rect x="' + (x + 7) + '" y="' + (y + 7) + '" width="' + (w - 14) + '" height="' + (ht - 14) + '" rx="' + (rx - 6) + '" fill="#fff" opacity=".26"/>') +
        '<text class="num" x="' + (x + 13) + '" y="' + (y + 22) + '">' + d.pad + '</text>' +
        '<text class="k" x="' + cx + '" y="' + (cy + (big ? 8 : 6)) + '" text-anchor="middle">' + esc(key) + '</text>' +
        '<text class="n" x="' + cx + '" y="' + (y + ht - (big ? 16 : 11)) + '" text-anchor="middle">' + esc(d.short || d.name) + '</text></g></g>';
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
