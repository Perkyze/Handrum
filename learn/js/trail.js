/* Backbeat — the Learn trail: a drum tour through eight illustrated places, one per chapter.
   Same mechanics as Tonic's trail: each place has its own sky, ground, props and weather; cloud banks hide the seams.
   Trail.render(ci, avoid) returns the scenery for one chapter as an HTML string (SVG + weather + seam).
   Coordinates are in a 390 × 900 box per chapter; the coins are placed by app.js at Trail.stops(ci). */
(function () {
  'use strict';
  const S = window.SCN, f = S.f, g = S.g;
  const rng = window.makeRng;
  const W = 390, H = 900;
  const shadow = (rx, op) => '<ellipse cx="0" cy="1" rx="' + rx + '" ry="' + (rx * 0.28) + '" fill="#000" opacity="' + (op || 0.13) + '"/>';

  // ---------- drum-tour props (x, y = ground contact; s = scale) ----------
  function kitProp(x, y, s, shell) {
    shell = shell || '#e8463a';
    return g(x, y, s, shadow(26) +
      '<path d="M-26 0 V-34 M26 0 V-38 M-19 0 V-18" stroke="#5a5f70" stroke-width="1.6"/>' +
      '<ellipse cx="-26" cy="-34" rx="9" ry="2" fill="#f0c95a"/><ellipse cx="26" cy="-38" rx="10" ry="2.2" fill="#f0c95a"/>' +
      '<rect x="12" y="-17" width="12" height="15" rx="1.5" fill="' + shell + '"/><ellipse cx="18" cy="-17" rx="6" ry="1.8" fill="#fdf8ec"/>' +
      '<circle cx="0" cy="-12" r="12" fill="' + shell + '"/><circle cx="0" cy="-12" r="8.5" fill="#fdf8ec"/><circle cx="0" cy="-12" r="3" fill="' + shell + '" opacity=".5"/>' +
      '<ellipse cx="-6" cy="-27" rx="5.5" ry="3.6" fill="' + shell + '"/><ellipse cx="6" cy="-27" rx="5.5" ry="3.6" fill="' + shell + '"/>' +
      '<ellipse cx="-6" cy="-29" rx="5" ry="1.6" fill="#fdf8ec"/><ellipse cx="6" cy="-29" rx="5" ry="1.6" fill="#fdf8ec"/>' +
      '<rect x="-25" y="-21" width="11" height="5" fill="#cfd5e2"/><ellipse cx="-19.5" cy="-21" rx="5.5" ry="1.6" fill="#fff"/>');
  }
  function garageProp(x, y, s) {
    return g(x, y, s, shadow(46, 0.18) +
      '<rect x="-42" y="-54" width="84" height="54" fill="#f3e3c8"/><rect x="-42" y="-54" width="84" height="5" fill="#e3cfae"/>' +
      '<polygon points="-50,-52 0,-80 50,-52" fill="#b5523b"/><polygon points="0,-80 50,-52 8,-52" fill="#9a4330"/>' +
      '<rect x="-30" y="-42" width="60" height="42" fill="#2b2238"/>' +
      '<rect x="-30" y="-26" width="60" height="26" fill="#ffd36b" opacity=".22"/>' +
      kitProp(0, -2, 0.7, '#ffd23f').replace('<g ', '<g opacity=".95" ') +
      '<rect x="-30" y="-42" width="60" height="15" fill="#d5dbe7"/>' +
      [0, 1, 2].map((i) => '<rect x="-30" y="' + (-38 + i * 4.5) + '" width="60" height="1" fill="#b4bccd"/>').join('') +
      '<rect x="-34" y="-46" width="68" height="4" fill="#e3cfae"/>' +
      '<circle cx="0" cy="-64" r="5" fill="#2b2238"/><circle cx="0" cy="-64" r="3" fill="#ffd36b"/>');
  }
  function amp(x, y, s) {
    return g(x, y, s, shadow(12) + '<rect x="-11" y="-22" width="22" height="22" rx="2" fill="#2d2d3a"/><rect x="-8" y="-17" width="16" height="14" rx="1.5" fill="#4a4a5c"/>' +
      '<circle cx="0" cy="-10" r="5" fill="#2d2d3a"/><rect x="-8" y="-21" width="16" height="2" fill="#f0c95a"/>');
  }
  function balloon(x, y, s, c) {
    return g(x, y, s, '<path d="M0 0 q-4 -10 0 -18 q4 -8 0 -16" stroke="#8a8aa0" stroke-width="1" fill="none"/>' +
      '<ellipse cx="0" cy="-42" rx="8" ry="10" fill="' + c + '"/><path d="M-1.5 -32 h3 l-1.5 2z" fill="' + c + '"/><ellipse cx="-3" cy="-46" rx="2" ry="3" fill="#fff" opacity=".45"/>');
  }
  function bunting(x1, y1, x2, y2, cols) {
    const mx = (x1 + x2) / 2, my = Math.max(y1, y2) + 18;
    let s = '<path d="M' + x1 + ' ' + y1 + ' Q' + mx + ' ' + my + ' ' + x2 + ' ' + y2 + '" stroke="#6b5a4a" stroke-width="1.2" fill="none"/>';
    for (let i = 1; i < 10; i++) {
      const t = i / 10, u = 1 - t;
      const px = u * u * x1 + 2 * u * t * mx + t * t * x2, py = u * u * y1 + 2 * u * t * my + t * t * y2;
      s += '<polygon points="' + f(px - 5) + ',' + f(py) + ' ' + f(px + 5) + ',' + f(py) + ' ' + f(px) + ',' + f(py + 11) + '" fill="' + cols[i % cols.length] + '"/>';
    }
    return s;
  }
  function pole(x, y, h) { return '<rect x="' + (x - 1.5) + '" y="' + (y - h) + '" width="3" height="' + h + '" fill="#7a5a3a"/>'; }
  function cactus(x, y, s) {
    return g(x, y, s, shadow(12) + '<rect x="-5" y="-40" width="10" height="40" rx="5" fill="#4c9a52"/>' +
      '<path d="M-5 -20 h-6 a3 3 0 0 1 -3 -3 v-10" stroke="#4c9a52" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<path d="M5 -26 h6 a3 3 0 0 0 3 -3 v-8" stroke="#3f8645" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<rect x="-1" y="-38" width="2" height="36" fill="#3f8645" opacity=".6"/><circle cx="0" cy="-41" r="2.5" fill="#ff7ac6"/>');
  }
  function van(x, y, s, c) {
    return g(x, y, s, shadow(34, 0.2) + '<rect x="-32" y="-28" width="64" height="22" rx="6" fill="' + c + '"/>' +
      '<path d="M20 -28 h6 a6 6 0 0 1 6 6 v6 h-12z" fill="#bfe4ff"/><rect x="-26" y="-24" width="12" height="8" rx="2" fill="#bfe4ff"/><rect x="-10" y="-24" width="12" height="8" rx="2" fill="#bfe4ff"/>' +
      '<rect x="-32" y="-14" width="64" height="4" fill="#fff" opacity=".7"/><text x="-4" y="-16.5" font-size="6" font-weight="800" fill="' + c + '" text-anchor="middle" font-family="sans-serif">TOUR</text>' +
      '<circle cx="-18" cy="-5" r="6" fill="#2b2b36"/><circle cx="-18" cy="-5" r="2.5" fill="#bbb"/><circle cx="18" cy="-5" r="6" fill="#2b2b36"/><circle cx="18" cy="-5" r="2.5" fill="#bbb"/>');
  }
  function bonfire(x, y, s) {
    return g(x, y, s, '<circle cx="0" cy="-14" r="34" fill="#ffb347" opacity=".18"/>' + shadow(18, 0.2) +
      '<rect x="-16" y="-5" width="32" height="6" rx="3" fill="#6b4428" transform="rotate(14)"/><rect x="-16" y="-5" width="32" height="6" rx="3" fill="#5b3820" transform="rotate(-14)"/>' +
      '<g class="flame"><path d="M0 -36 C10 -22 12 -12 0 -4 C-12 -12 -10 -22 0 -36Z" fill="#ff7a2b"/><path d="M0 -26 C6 -18 7 -11 0 -6 C-7 -11 -6 -18 0 -26Z" fill="#ffd23f"/></g>' +
      '<circle class="smoke" cx="2" cy="-44" r="5" fill="#d9d2e9" opacity=".6"/><circle class="smoke" cx="-3" cy="-50" r="4" fill="#d9d2e9" opacity=".5" style="animation-delay:-2s"/>');
  }
  function djembe(x, y, s, c) {
    c = c || '#a8693a';
    return g(x, y, s, shadow(8) + '<path d="M-8 -26 Q-9 -16 -3 -12 L-5 0 H5 L3 -12 Q9 -16 8 -26Z" fill="' + c + '"/>' +
      '<path d="M-7 -24 L-2 -14 L2 -24 L6 -14" stroke="#f3e3c8" stroke-width=".9" fill="none"/>' +
      '<ellipse cx="0" cy="-26" rx="8" ry="2.6" fill="#f3e3c8"/>');
  }
  function tent(x, y, s, c, cd) {
    return g(x, y, s, shadow(26) + '<polygon points="-26,0 0,-34 26,0" fill="' + c + '"/><polygon points="0,-34 26,0 4,0" fill="' + cd + '"/>' +
      '<polygon points="-6,0 0,-16 6,0" fill="#2b2238"/><path d="M0 -34 v-6" stroke="#6b4428" stroke-width="1.5"/><path d="M0 -40 l7 2 -7 2z" fill="#ffd23f"/>');
  }
  function leafPlant(x, y, s, c, cd) {
    let b = shadow(16);
    [[-40, 18], [-15, 22], [15, 22], [40, 18], [0, 24]].forEach(([a, l], i) => {
      b += '<ellipse cx="0" cy="' + (-l / 2) + '" rx="5.5" ry="' + (l / 2) + '" fill="' + (i % 2 ? cd : c) + '" transform="rotate(' + a + ')"/>';
    });
    return g(x, y, s, b);
  }
  function hydrant(x, y, s) {
    return g(x, y, s, shadow(6) + '<rect x="-4" y="-14" width="8" height="14" rx="2" fill="#e8463a"/><rect x="-6" y="-10" width="12" height="3" rx="1.5" fill="#c43a2f"/><circle cx="0" cy="-15" r="4" fill="#e8463a"/>');
  }
  function buckets(x, y, s) {
    return g(x, y, s, shadow(16) + '<path d="M-14 0 L-12 -14 H-2 L0 0Z" fill="#f2a33a"/><path d="M2 0 L4 -12 H13 L15 0Z" fill="#4cc9f0"/>' +
      '<ellipse cx="-7" cy="-14" rx="5" ry="1.5" fill="#c9821f"/><ellipse cx="8.5" cy="-12" rx="4.5" ry="1.4" fill="#2489b0"/>' +
      '<path d="M-10 -20 l8 6 M14 -18 l-6 6" stroke="#d9b98a" stroke-width="1.6" stroke-linecap="round"/>');
  }
  function bench(x, y, s) {
    return g(x, y, s, shadow(14) + '<rect x="-14" y="-9" width="28" height="3" fill="#a5734a"/><rect x="-14" y="-15" width="28" height="3" fill="#a5734a"/>' +
      '<path d="M-11 0 V-9 M11 0 V-9" stroke="#3b3f4f" stroke-width="2"/>');
  }
  function speakerTower(x, y, s) {
    let b = shadow(14, 0.25);
    for (let i = 0; i < 3; i++) b += '<rect x="-12" y="' + (-22 - i * 22) + '" width="24" height="21" rx="2" fill="#1b1838"/><circle cx="0" cy="' + (-11.5 - i * 22) + '" r="7" fill="#2f2a5c"/><circle cx="0" cy="' + (-11.5 - i * 22) + '" r="3" fill="#4a4390"/>';
    return g(x, y, s, b);
  }
  function crowd(x, y, s, r) {
    let b = '';
    for (let i = 0; i < 5; i++) {
      const dx = -20 + i * 10 + (r() - 0.5) * 3, hh = 14 + r() * 5;
      b += '<g class="bop" style="animation-delay:-' + f(r() * 0.5) + 's"><rect x="' + f(dx - 4) + '" y="' + f(-hh) + '" width="8" height="' + f(hh) + '" rx="4" fill="#120d2e"/>' +
        '<circle cx="' + f(dx) + '" cy="' + f(-hh - 4) + '" r="4.2" fill="#120d2e"/>' +
        (r() < 0.4 ? '<path d="M' + f(dx + 3) + ' ' + f(-hh + 2) + ' l5 -14" stroke="#120d2e" stroke-width="3" stroke-linecap="round"/>' : '') + '</g>';
    }
    return g(x, y, s, b);
  }
  function building(x, base, w, h, c, win) {
    let s = '<rect x="' + f(x - w / 2) + '" y="' + f(base - h) + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>';
    for (let yy = base - h + 8; yy < base - 8; yy += 12) for (let xx = x - w / 2 + 6; xx < x + w / 2 - 6; xx += 10) s += '<rect x="' + f(xx) + '" y="' + f(yy) + '" width="5" height="6" fill="' + win + '"/>';
    return s;
  }

  // Eight places. ac: the chapter colour (coins, banner, cards). seam: colour of the cloud bank below it.
  const BIOMES = [
    { name: 'The Garage', ac: '#d9603a', seam: '#f2fbff', trail: ['#e6e1d8', '#c4bcae'], draw: garage, fx: fxFireflies },
    { name: 'Backyard Party', ac: '#2f9e62', seam: '#f4f8ff', trail: ['#f7e9bd', '#e3cd8c'], draw: backyard, fx: fxBalloons },
    { name: 'Street Corner', ac: '#4f63d2', seam: '#ffe6d9', trail: 'road', draw: street, fx: fxPigeons },
    { name: 'Beach Bonfire', ac: '#e0567f', seam: '#eefbef', trail: 'planks', draw: beach, fx: fxGlints },
    { name: 'Jungle Camp', ac: '#2a7f72', seam: '#fff1d6', trail: ['#dcbf90', '#b8945f'], draw: jungle, fx: fxFog },
    { name: 'Desert Highway', ac: '#c2621f', seam: '#f4f7ff', trail: 'road', draw: desert, fx: fxHaze },
    { name: 'Mountain Lodge', ac: '#2f86d0', seam: '#3a2f7a', trail: ['#ffffff', '#b8cbec'], draw: lodge, fx: fxSnow },
    { name: 'Festival Stage', ac: '#8f6bff', seam: null, trail: 'lights', draw: festival, fx: fxNight },
  ];
  // one S-curve that continues from place to place, 4 coins each (3 lessons + trophy)
  BIOMES.forEach((b, ci) => {
    b.stops = [0, 1, 2, 3].map((j) => [Math.round(195 + 88 * Math.sin((ci * 4 + j) * Math.PI / 4)), [300, 420, 540, 665][j]]);
    b.inX = 195;
    b.outX = ci < BIOMES.length - 1 ? 195 : null;
  });
  const shade = (hx, k) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hx.slice(i, i + 2), 16) * k).toString(16).padStart(2, '0')).join('');
  const sky = (id, a, b, h) => '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient></defs>' +
    '<rect width="' + W + '" height="' + (h + 40) + '" fill="url(#' + id + ')"/>';

  function trailSvg(b, d) {
    const t = b.trail;
    if (t === 'road') return '<path d="' + d + '" stroke="rgba(0,0,0,.18)" stroke-width="30" fill="none" stroke-linecap="round" transform="translate(0 3)"/>' +
      '<path d="' + d + '" stroke="#5b6275" stroke-width="28" fill="none" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="#ffd23f" stroke-width="2.5" fill="none" stroke-dasharray="10 12"/>';
    if (t === 'planks') return '<path d="' + d + '" stroke="#8a5d38" stroke-width="22" fill="none" stroke-linecap="round" opacity=".35"/>' +
      '<path d="' + d + '" stroke="#c99263" stroke-width="18" fill="none" stroke-linecap="round"/><path d="' + d + '" stroke="#a5734a" stroke-width="18" fill="none" stroke-dasharray="2 7"/>';
    if (t === 'lights') return '<path d="' + d + '" stroke="#8f7bff" stroke-width="22" fill="none" opacity=".2" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="#3a2f7a" stroke-width="14" fill="none" stroke-linecap="round"/>' +
      '<path class="chase" d="' + d + '" stroke="#ffd23f" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="0.1 16"/>';
    return '<path d="' + d + '" stroke="' + t[1] + '" stroke-width="24" fill="none" stroke-linecap="round"/>' +
      '<path d="' + d + '" stroke="' + t[0] + '" stroke-width="18" fill="none" stroke-linecap="round"/>' +
      (b.name === 'Mountain Lodge' ? '<path d="' + d + '" stroke="#c9d8f2" stroke-width="5" fill="none" stroke-dasharray="3 9" stroke-linecap="round"/>' : '');
  }

  // ---------- the eight scenes ----------
  function garage(sc) {
    let s = sky('s1', '#ffc79a', '#ffeccc', 230) +
      '<circle cx="80" cy="150" r="54" fill="#ffd28a" opacity=".45"/><circle cx="80" cy="150" r="32" fill="#ffad5c"/>' +
      S.cloud(270, 60, 0.9, '#fff4e6', 0.9) + S.cloud(330, 150, 0.6, '#fff4e6', 0.8) +
      S.cottage(30, 214, 0.7, '#f1d7c0', '#a65a48', true) + S.cottage(340, 212, 0.75, '#dfe6f0', '#5a6b8f', true) +
      S.hills(212, 5, '#b5dd92', 11, { freq: 0.8 }) + S.hills(232, 8, '#a5d483', 12) +
      S.hills(300, 12, '#95c973', 13) + S.hills(460, 16, '#87bf66', 14) + S.hills(640, 16, '#7ab55b', 15) + S.hills(800, 14, '#6eaa51', 16);
    sc.at(195, 166, garageProp(195, 166, 1.15));
    sc.add(1, [250, 160, 330, 230], 30, 60, (x, y) => S.g(x, y, 1, '<rect x="-1.5" y="-18" width="3" height="18" fill="#6b4428"/><rect x="-7" y="-26" width="14" height="9" rx="4" fill="#4f63d2"/><rect x="5" y="-30" width="2" height="7" fill="#e8463a"/>'));
    sc.add(4, [10, 260, 380, 860], 46, 100, (x, y, r) => S.cottage(x, y, 0.8 + r() * 0.3, ['#f1d7c0', '#dfe6f0', '#f5e6a8'][Math.floor(r() * 3)], ['#a65a48', '#5a6b8f', '#5f8a4f'][Math.floor(r() * 3)], r() < 0.6));
    sc.add(8, [10, 250, 380, 870], 32, 46, (x, y, r) => S.roundTree(x, y, 0.8 + r() * 0.5, '#5cbf5f', '#43a14b', { dots: r() < 0.3 ? '#ff9f43' : null }));
    sc.add(8, [10, 260, 380, 880], 24, 28, (x, y, r) => S.bush(x, y, 0.9 + r() * 0.4, '#56b85a', '#3e9a47', r() < 0.5 ? '#ffd23f' : null));
    sc.add(3, [10, 300, 380, 880], 22, 40, (x, y) => amp(x, y, 1));
    sc.add(40, [5, 250, 385, 895], 14, 9, (x, y, r) => S.flower(x, y, ['#fff', '#ffd23f', '#ff8fbf', '#ff9f43'][Math.floor(r() * 4)]));
    sc.add(16, [5, 250, 385, 895], 12, 12, (x, y, r) => S.tuft(x, y, '#4fa64f', 0.8 + r() * 0.5));
    return s;
  }

  function backyard(sc) {
    let s = sky('s2', '#a8dcff', '#eaf8ff', 230) +
      '<g class="rays" opacity=".35">' + [...Array(12)].map((_, i) => '<rect x="327" y="10" width="6" height="40" rx="3" fill="#fff6b0" transform="rotate(' + i * 30 + ' 330 80)"/>').join('') + '</g>' +
      '<circle cx="330" cy="80" r="44" fill="#fff4a8" opacity=".45"/><circle cx="330" cy="80" r="27" fill="#ffe066"/>' +
      S.cloud(90, 70, 0.9, '#fff', 0.95) + S.cloud(220, 150, 0.6, '#fff', 0.85) +
      S.hills(205, 8, '#bfe8b0', 21, { freq: 0.8 }) +
      '<g>' + [...Array(40)].map((_, i) => '<rect x="' + (i * 10) + '" y="200" width="7" height="30" rx="2" fill="#f7efe1"/>').join('') + '<rect x="0" y="208" width="390" height="3" fill="#e6dcc8"/><rect x="0" y="222" width="390" height="3" fill="#e6dcc8"/></g>' +
      S.hills(232, 8, '#a6dd95', 22, { freq: 1.2 }) + S.hills(300, 12, '#8fd47f', 23) + S.hills(450, 16, '#80ca70', 24) + S.hills(630, 18, '#72be64', 25) + S.hills(790, 16, '#66b259', 26) +
      pole(250, 290, 56) + pole(380, 280, 56) + bunting(250, 236, 380, 226, ['#ff6b6b', '#ffd23f', '#4cc9f0', '#3ddc97', '#ff7ac6']);
    sc.add(1, [260, 740, 340, 860], 40, 90, (x, y) => kitProp(x, y, 1.3, '#4f63d2') + amp(x + 40, y + 6, 1) + amp(x - 42, y + 4, 0.9));
    sc.add(1, [30, 300, 70, 700], 30, 80, (x, y) => S.g(x, y, 1, shadow(26) + '<rect x="-26" y="-14" width="52" height="5" rx="2" fill="#c98a52"/><path d="M-20 0 L-14 -9 M20 0 L14 -9" stroke="#8a5a30" stroke-width="3"/>' +
      '<rect x="-14" y="-24" width="16" height="10" rx="2" fill="#2d2d3a"/><circle cx="-10" cy="-19" r="3" fill="#555"/><circle cx="-2" cy="-19" r="3" fill="#555"/><circle cx="12" cy="-18" r="4" fill="#ff6b6b"/>'));
    sc.add(5, [10, 260, 380, 860], 30, 40, (x, y, r) => balloon(x, y, 0.9 + r() * 0.3, ['#ff6b6b', '#ffd23f', '#4cc9f0', '#9b7bff', '#ff7ac6'][Math.floor(r() * 5)]));
    sc.add(7, [10, 260, 380, 870], 34, 50, (x, y, r) => r() < 0.5 ? S.roundTree(x, y, 0.8 + r() * 0.5, '#ffb7d5', '#f08cb8', { dots: '#fff' }) : S.roundTree(x, y, 0.8 + r() * 0.5, '#5cbf5f', '#43a14b'));
    sc.add(8, [10, 260, 380, 880], 24, 28, (x, y, r) => S.bush(x, y, 0.9 + r() * 0.4, '#56b85a', '#3e9a47', r() < 0.5 ? '#fff' : null));
    sc.add(50, [5, 250, 385, 895], 14, 9, (x, y, r) => S.flower(x, y, ['#fff', '#ffd23f', '#ff8fbf', '#b49bff'][Math.floor(r() * 4)]));
    sc.add(18, [5, 250, 385, 895], 12, 12, (x, y, r) => S.tuft(x, y, '#4fa64f', 0.8 + r() * 0.5));
    return s;
  }

  function street(sc) {
    const r = rng(31);
    let sky1 = sky('s3', '#bfe0ff', '#f1f7ff', 230) + S.cloud(300, 60, 0.8, '#fff', 0.9) + S.cloud(70, 110, 0.6, '#fff', 0.8);
    let city = '';
    for (let x = 0; x < 400; x += 26 + r() * 10) city += building(x, 232, 22 + r() * 18, 60 + r() * 90, ['#9fb4d6', '#8ea5cc', '#a9bcdc'][Math.floor(r() * 3)], '#d6e4f7');
    for (let x = 10; x < 400; x += 34 + r() * 12) city += building(x, 236, 28 + r() * 16, 40 + r() * 60, ['#7f93bd', '#8a9cc4'][Math.floor(r() * 2)], '#c4d4ee');
    let s = sky1 + city +
      S.hills(234, 2, '#c8ced9', 31, { freq: 0.5 }) + S.hills(300, 4, '#bec5d2', 32, { freq: 0.6 }) + S.hills(460, 5, '#b4bccb', 33, { freq: 0.6 }) +
      S.hills(640, 5, '#aab3c4', 34, { freq: 0.6 }) + S.hills(800, 4, '#a0aabd', 35, { freq: 0.6 }) +
      [...Array(12)].map((_, i) => '<rect x="' + (i * 34 - 6) + '" y="252" width="22" height="5" rx="1" fill="#fff" opacity=".55"/>').join('');
    sc.add(1, [40, 740, 140, 860], 30, 60, (x, y) => buckets(x, y, 1.6));
    sc.add(5, [10, 270, 380, 880], 30, 60, (x, y) => S.lamp(x, y, 1.2));
    sc.add(6, [10, 270, 380, 880], 30, 46, (x, y, r) => S.g(x, y, 1, '<rect x="-12" y="-8" width="24" height="8" rx="2" fill="#8a6a4a"/>') + S.roundTree(x, y - 7, 0.7 + r() * 0.3, '#5cbf5f', '#43a14b'));
    sc.add(5, [10, 270, 380, 880], 20, 30, (x, y) => hydrant(x, y, 1.1));
    sc.add(4, [10, 270, 380, 880], 26, 40, (x, y) => bench(x, y, 1.1));
    sc.add(3, [10, 300, 380, 880], 24, 50, (x, y) => amp(x, y, 1));
    return s;
  }

  function beach(sc) {
    let s = sky('s4', '#ff9a8b', '#ffd3a5', 230) +
      '<circle cx="250" cy="200" r="70" fill="#fff0b8" opacity=".3"/><circle cx="250" cy="200" r="44" fill="#fff0b8"/>' +
      S.cloud(90, 80, 0.8, '#ffe1d6', 0.9) + S.cloud(330, 120, 0.6, '#ffe1d6', 0.8) +
      '<rect x="0" y="200" width="390" height="130" fill="#5f8fc0"/><rect x="0" y="200" width="390" height="8" fill="#ffb59a" opacity=".55"/>' +
      [[40, 240], [120, 262], [210, 232], [300, 255], [350, 290], [80, 300]].map(([x, y]) => '<path d="M' + x + ' ' + y + ' h26" stroke="#bfe0ff" stroke-width="2" stroke-linecap="round" opacity=".7"/>').join('') +
      S.hills(318, 6, '#f6dcae', 41, { freq: 0.7 }) + S.hills(330, 8, '#f3cf95', 42) + S.hills(470, 12, '#ecc283', 43) + S.hills(640, 14, '#e4b673', 44) + S.hills(800, 12, '#dba864', 45);
    sc.add(1, [270, 750, 330, 860], 30, 90, (x, y) => bonfire(x, y, 1.4) + djembe(x - 40, y + 10, 1.1) + djembe(x + 42, y + 6, 1, '#8a5530'));
    sc.add(6, [0, 330, 390, 880], 36, 60, (x, y, r) => S.palm(x, y, 0.9 + r() * 0.5, '#4fae5c', '#3b8f47', r() < 0.5 ? -1 : 1));
    sc.add(3, [0, 340, 390, 880], 26, 50, (x, y, r) => S.g(x, y, 1, '<rect x="-4" y="-34" width="8" height="34" rx="4" fill="' + ['#4cc9f0', '#ff7ac6', '#ffd23f'][Math.floor(r() * 3)] + '" transform="rotate(' + f((r() - 0.5) * 20) + ')"/>'));
    sc.add(8, [0, 340, 390, 890], 16, 18, (x, y, r) => S.rock(x, y, 0.5 + r() * 0.4, '#c9a27a', '#b08860'));
    sc.add(14, [0, 340, 390, 895], 10, 10, (x, y, r) => S.g(x, y, 1, '<path d="M-3 0 a3 3 0 0 1 6 0z" fill="' + (r() < 0.5 ? '#fff4e0' : '#ffc4b0') + '"/>'));
    return s;
  }

  function jungle(sc) {
    let s = sky('s5', '#bfe8c8', '#e9f8dc', 230) +
      S.mountain(70, 232, 220, 120, '#8fcf9c', '#7fc08c') + S.mountain(300, 232, 260, 150, '#86c794', '#76b884') +
      '<rect x="300" y="110" width="24" height="122" fill="#bfe9ff"/><rect class="fall" x="300" y="110" width="24" height="122" fill="url(#fallp)"/>' +
      '<defs><pattern id="fallp" width="24" height="20" patternUnits="userSpaceOnUse"><rect width="24" height="20" fill="none"/><path d="M4 0 v8 M14 6 v10 M20 2 v6" stroke="#fff" stroke-width="2" stroke-linecap="round"/></pattern></defs>' +
      '<ellipse cx="312" cy="236" rx="40" ry="8" fill="#9fdcf2"/>' +
      S.hills(236, 6, '#6fb57a', 51) + S.hills(300, 12, '#5ea86b', 52) + S.hills(460, 15, '#4f9a5d', 53) + S.hills(640, 16, '#438c51', 54) + S.hills(800, 14, '#387e46', 55);
    sc.add(1, [50, 750, 120, 860], 30, 80, (x, y) => tent(x, y, 1.4, '#ff9f43', '#d9792a') + djembe(x - 40, y + 8, 1.2) + djembe(x + 38, y + 10, 1.1, '#8a5530'));
    sc.add(8, [0, 250, 390, 880], 34, 50, (x, y, r) => S.palm(x, y, 0.9 + r() * 0.5, '#3fae5c', '#2e8f47', r() < 0.5 ? -1 : 1));
    sc.add(10, [0, 250, 390, 890], 26, 30, (x, y, r) => leafPlant(x, y, 0.9 + r() * 0.5, '#4fbf6a', '#36a052'));
    sc.add(8, [0, 260, 390, 890], 22, 24, (x, y, r) => S.bush(x, y, 0.9 + r() * 0.3, '#3e9a47', '#2f7f3a', '#ff7ac6'));
    sc.add(8, [0, 260, 390, 890], 16, 18, (x, y, r) => S.mushroom(x, y, 0.8 + r() * 0.4));
    return s;
  }

  function desert(sc) {
    let s = sky('s6', '#ffd57e', '#ff985a', 230) + '<circle cx="300" cy="170" r="70" fill="#fff0b8" opacity=".35"/><circle cx="300" cy="170" r="44" fill="#fff0b8"/>' +
      '<path d="M0 232 V196 h44 l8 -20 h70 l10 20 h20 V232Z M220 232 V204 l12 -14 h66 l14 14 h78 V232Z" fill="#e08a55"/>' +
      '<path d="M0 232 V214 h60 l6 -8 h40 l8 8 h30 V232Z" fill="#cf7646" opacity=".8"/>' +
      S.hills(226, 4, '#f2c97e', 61, { freq: 0.6 }) + S.hills(300, 10, '#ebbb6e', 62) + S.hills(460, 12, '#e1ad60', 63) + S.hills(640, 14, '#d69f53', 64) + S.hills(800, 12, '#ca9147', 65);
    sc.add(1, [270, 750, 330, 860], 30, 90, (x, y) => van(x, y, 1.4, '#4f63d2'));
    sc.add(1, [44, 320, 64, 640], 20, 60, (x, y) => S.g(x, y, 1, shadow(10) + '<rect x="-1.5" y="-40" width="3" height="40" fill="#7a5a3a"/><rect x="-24" y="-44" width="48" height="16" rx="3" fill="#2f9e62"/>' +
      '<text x="0" y="-33" font-size="7.5" font-weight="800" fill="#fff" text-anchor="middle" font-family="sans-serif">NEXT GIG →</text>'));
    sc.add(9, [0, 250, 390, 880], 30, 50, (x, y, r) => cactus(x, y, 0.8 + r() * 0.6));
    sc.add(10, [0, 250, 390, 890], 18, 20, (x, y, r) => S.rock(x, y, 0.6 + r() * 0.5, '#c98b52', '#b07440'));
    sc.add(24, [0, 250, 390, 895], 14, 14, (x, y, r) => S.tuft(x, y, r() < 0.5 ? '#c7a24a' : '#a98734', 0.8 + r() * 0.5));
    return s;
  }

  function lodge(sc) {
    let s = sky('s7', '#cfe0ff', '#f2f6ff', 230) +
      S.mountain(60, 232, 220, 140, '#b8c9ec', '#a4b8e2', '#fff') + S.mountain(220, 232, 280, 190, '#aabde6', '#97addc', '#fff') + S.mountain(370, 232, 200, 120, '#b8c9ec', '#a4b8e2', '#fff') +
      S.hills(232, 6, '#eef4ff', 71) + S.hills(300, 10, '#e5edfb', 72) + S.hills(460, 14, '#dbe5f7', 73) + S.hills(640, 14, '#d1ddf2', 74) + S.hills(800, 12, '#c7d5ee', 75);
    sc.add(1, [60, 760, 110, 860], 30, 90, (x, y) => S.cottage(x, y, 1.6, '#8a5a3a', '#5b3a24', true) + kitProp(x + 50, y + 8, 0.8, '#2f86d0'));
    const pc = [['#3d8f7f', '#2e7566'], ['#2f7d6e', '#24645a'], ['#4a7f9c', '#3a6a85']];
    sc.add(16, [0, 250, 390, 890], 28, 26, (x, y, r) => { const c = pc[Math.floor(r() * 3)]; return S.pine(x, y, 0.7 + r() * 0.7, c[0], c[1], { snow: true }); });
    sc.add(3, [0, 280, 390, 880], 22, 40, (x, y) => S.snowman(x, y, 1));
    sc.add(8, [0, 260, 390, 890], 16, 18, (x, y, r) => S.rock(x, y, 0.6 + r() * 0.4, '#b4c2dd', '#9cadcf'));
    return s;
  }

  function festival(sc) {
    const r = rng(81);
    let stars = '';
    for (let i = 0; i < 50; i++) stars += '<circle class="tw" cx="' + f(r() * 390) + '" cy="' + f(r() * 220) + '" r="' + f(0.6 + r() * 1.2) + '" fill="#fff" style="animation-delay:-' + f(r() * 3) + 's"/>';
    let s = sky('s8', '#0a0f2e', '#2a1f5c', 320) + stars +
      '<circle cx="60" cy="70" r="18" fill="#fff6d6"/><circle cx="68" cy="64" r="16" fill="#0a0f2e"/>' +
      '<defs><linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ffd23f" stop-opacity=".45"/><stop offset="1" stop-color="#ffd23f" stop-opacity="0"/></linearGradient>' +
      '<linearGradient id="beam2" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff7ac6" stop-opacity=".4"/><stop offset="1" stop-color="#ff7ac6" stop-opacity="0"/></linearGradient></defs>' +
      '<g class="sweep"><polygon points="120,250 40,0 100,0" fill="url(#beam)"/></g><g class="sweep b"><polygon points="270,250 290,0 350,0" fill="url(#beam2)"/></g>' +
      S.hills(250, 6, '#2a2160', 82) + S.hills(320, 10, '#241b55', 83) + S.hills(480, 14, '#1f174b', 84) + S.hills(650, 14, '#1a1342', 85) + S.hills(810, 12, '#150f38', 86) +
      // the main stage, at the end of the trail
      '<g><rect x="215" y="825" width="170" height="60" fill="#1b1838"/><rect x="215" y="818" width="170" height="10" fill="#3a2f7a"/>' +
      '<rect x="222" y="750" width="156" height="68" fill="#120d2e"/><path d="M222 750 h156" stroke="#5a4fb0" stroke-width="4"/>' +
      '<g class="tw">' + [...Array(7)].map((_, i) => '<circle cx="' + (232 + i * 22) + '" cy="754" r="3.5" fill="' + ['#ffd23f', '#ff7ac6', '#4cc9f0'][i % 3] + '"/>').join('') + '</g>' +
      '<polygon points="250,756 230,818 270,818" fill="#ffd23f" opacity=".12"/><polygon points="350,756 330,818 370,818" fill="#ff7ac6" opacity=".12"/></g>';
    sc.at(300, 818, kitProp(300, 818, 1.3, '#8f6bff'));
    sc.at(205, 885, speakerTower(205, 885, 0.9));
    sc.add(3, [10, 300, 380, 600], 40, 90, (x, y) => speakerTower(x, y, 0.8));
    sc.add(7, [10, 320, 380, 740], 40, 50, (x, y) => crowd(x, y, 1, r));
    sc.add(4, [10, 320, 380, 880], 30, 50, (x, y, rr) => tent(x, y, 0.9, ['#ff7ac6', '#4cc9f0', '#ffd23f'][Math.floor(rr() * 3)], '#3a2f7a'));
    sc.add(6, [10, 320, 380, 890], 22, 30, (x, y) => S.lamp(x, y, 1));
    return s;
  }

  // ---------- weather overlays ----------
  function fxFireflies() {
    const r = rng(3);
    return [...Array(14)].map(() => '<i class="ffly" style="left:' + f(r() * 95) + '%;top:' + f(25 + r() * 70) + '%;animation-delay:-' + f(r() * 6) + 's;animation-duration:' + f(5 + r() * 4) + 's"></i>').join('');
  }
  function fxBalloons() { return [[12, 0], [55, 3], [82, 6], [33, 9]].map(([l, d]) => '<span class="rise" style="left:' + l + '%;animation-delay:-' + d + 's">🎈</span>').join(''); }
  const BIRD = '<svg viewBox="0 0 18 8"><path d="M0 2 Q4 -1 9 5 Q13 -1 18 2" stroke="#4a4f66" stroke-width="1.6" fill="none"/></svg>';
  function fxPigeons() { return [[9, 0], [12, 0.7], [10, 1.4]].map(([t, d]) => '<span class="bird" style="top:' + t + '%;animation-duration:18s;animation-delay:-' + (d + 3) + 's">' + BIRD + '</span>').join(''); }
  function fxGlints() {
    const r = rng(9);
    return [...Array(14)].map(() => '<i class="glint" style="left:' + f(5 + r() * 90) + '%;top:' + f(23 + r() * 12) + '%;animation-delay:-' + f(r() * 2.4) + 's"></i>').join('') +
      [[12, 2], [15, 2.5]].map(([t, d]) => '<span class="bird" style="top:' + t + '%;animation-duration:20s;animation-delay:-' + d * 3 + 's">' + BIRD.replace('#4a4f66', '#fff') + '</span>').join('');
  }
  function fxFog() { return [30, 58, 84].map((t, i) => '<div class="fog" style="top:' + t + '%;animation-delay:-' + i * 4 + 's"></div>').join(''); }
  function fxHaze() { return '<div class="haze"></div>' + [[10, 0], [13, 0.6]].map(([t, d]) => '<span class="bird" style="top:' + t + '%;animation-duration:16s;animation-delay:-' + (d + 4) + 's">' + BIRD.replace('#4a4f66', '#3a2410') + '</span>').join(''); }
  function fxSnow() { return '<div class="snow"></div><div class="snow b"></div>'; }
  function fxNight() { return '<div class="shoot"></div>'; }
  function seam(c, seed) {
    const r = rng(300 + seed);
    let s = '<svg viewBox="0 0 390 150" preserveAspectRatio="none"><defs><linearGradient id="sg' + seed + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c + '" stop-opacity="0"/>' +
      '<stop offset=".35" stop-color="' + c + '" stop-opacity=".9"/><stop offset=".65" stop-color="' + c + '" stop-opacity=".9"/><stop offset="1" stop-color="' + c + '" stop-opacity="0"/></linearGradient></defs>' +
      '<rect width="390" height="150" fill="url(#sg' + seed + ')"/>';
    for (let x = -20; x < 420; x += 26 + r() * 18) s += '<circle cx="' + f(x) + '" cy="' + f(62 + r() * 26) + '" r="' + f(20 + r() * 18) + '" fill="' + c + '" opacity="' + f(0.75 + r() * 0.25) + '"/>';
    return s + '</svg>';
  }

  // The Backbeat buddy: a little snare drum with two waving hands (Handpad is played with hands)
  function mascot() {
    const ink = '#15122b';
    return '<svg viewBox="0 0 80 100" aria-hidden="true">' +
      '<ellipse cx="40" cy="95" rx="24" ry="4" fill="rgba(0,0,0,.18)"/>' +
      '<path d="M14 48 V80 A26 9 0 0 0 66 80 V48Z" fill="#ffd23f"/>' +
      '<path d="M14 52 L24 76 L34 52 L44 76 L54 52 L64 76" stroke="#c9960a" stroke-width="2" fill="none" stroke-linejoin="round" opacity=".55"/>' +
      '<path d="M14 80 A26 9 0 0 0 66 80" stroke="#ff6b6b" stroke-width="5" fill="none"/>' +
      '<ellipse cx="40" cy="48" rx="26" ry="9" fill="#fdf8ec" stroke="#ff6b6b" stroke-width="4"/>' +
      '<ellipse cx="32" cy="46" rx="8" ry="2.5" fill="#fff"/>' +
      '<circle cx="32" cy="63" r="4.2" fill="' + ink + '"/><circle cx="48" cy="63" r="4.2" fill="' + ink + '"/>' +
      '<circle cx="33.3" cy="61.6" r="1.4" fill="#fff"/><circle cx="49.3" cy="61.6" r="1.4" fill="#fff"/>' +
      '<path d="M34 69q6 6 12 0" stroke="' + ink + '" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<circle cx="24" cy="70" r="3.4" fill="#ff7a9a" opacity=".55"/><circle cx="56" cy="70" r="3.4" fill="#ff7a9a" opacity=".55"/>' +
      '<g class="wave-l"><path d="M14 60 Q4 54 6 40" stroke="#ffd23f" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="6" cy="36" r="6" fill="#ffe3a8"/><path d="M2 32 v-5 M5 31 v-6 M8 31 v-6 M11 33 v-4" stroke="#ffe3a8" stroke-width="2.4" stroke-linecap="round"/></g>' +
      '<g class="wave-r"><path d="M66 60 Q76 54 74 40" stroke="#ffd23f" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="74" cy="36" r="6" fill="#ffe3a8"/><path d="M78 32 v-5 M75 31 v-6 M72 31 v-6 M69 33 v-4" stroke="#ffe3a8" stroke-width="2.4" stroke-linecap="round"/></g>' +
      '</svg>';
  }

  // Scenery for chapter ci. avoid: extra [x0, y0, x1, y1] boxes to keep clear (name tags, the mascot).
  function render(ci, avoid) {
    const b = BIOMES[ci];
    const pts = [[b.inX, ci ? -10 : 150]].concat(b.stops);
    if (b.outX !== null) pts.push([b.outX, H + 10]);
    const cv = S.curve(pts);
    const boxes = b.stops.map(([x, y]) => [x - 50, y - 50, x + 50, y + 40]).concat(avoid || []);
    const sc = S.Scatter(100 + ci * 17, cv.samples, boxes);
    sc.samples = cv.samples;
    sc.density = 0.6;
    sc.pad = 14;
    const scene = b.draw(sc);
    const svg = '<svg class="tr-bg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs>' +
      '<filter id="blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>' +
      '<filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
      scene + trailSvg(b, cv.d) + sc.svg() + '</svg>';
    return svg + '<div class="tr-fx" aria-hidden="true">' + b.fx() + '</div>' +
      (b.seam ? '<div class="tr-seam" aria-hidden="true">' + seam(b.seam, ci) + '</div>' : '');
  }

  // the tour van on its own, for the zone-to-zone travel card
  const vanSvg = (c) => '<svg viewBox="-36 -34 72 36" aria-hidden="true">' + van(0, 0, 1, c) + '</svg>';

  window.Trail = { W, H, BIOMES, render, mascot, shade, van: vanSvg, stops: (ci) => BIOMES[ci].stops };
})();
