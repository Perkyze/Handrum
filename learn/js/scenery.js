/* Tiny SVG scenery kit (from Tonic), used to draw the Learn trail.
   Every shape takes (x, y) = where it touches the ground, and s = scale (1 ≈ 50px tall). */
(function () {
  'use strict';
  const f = (n) => Math.round(n * 10) / 10;
  const g = (x, y, s, body, extra) => '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')"' + (extra || '') + '>' + body + '</g>';
  const shadow = (rx, op) => '<ellipse cx="0" cy="1" rx="' + rx + '" ry="' + (rx * 0.28) + '" fill="#000" opacity="' + (op || 0.13) + '"/>';

  // rolling band of land from y to the bottom of the box
  function hills(y, amp, color, seed, o) {
    o = Object.assign({ W: 390, H: 900, freq: 1, step: 10 }, o);
    const r = window.makeRng(seed), p1 = r() * 6.3, p2 = r() * 6.3;
    let d = 'M0 ' + o.H + ' L0 ';
    for (let x = 0; x <= o.W; x += o.step) {
      const yy = y + Math.sin(x / 390 * Math.PI * 2 * o.freq + p1) * amp + Math.sin(x / 390 * Math.PI * 5.3 * o.freq + p2) * amp * 0.35;
      d += (x ? ' L' + x + ' ' : '') + f(yy);
    }
    return '<path d="' + d + ' L' + o.W + ' ' + o.H + ' Z" fill="' + color + '"/>';
  }

  function pine(x, y, s, c, cd, o) {
    o = o || {};
    let b = shadow(15) + '<rect x="-2.5" y="-9" width="5" height="10" fill="' + (o.trunk || '#5b3b25') + '"/>';
    [[-7, 17, 22], [-20, 14, 20], [-32, 10, 18]].forEach(([by, hw, h]) => {
      b += '<polygon points="' + -hw + ',' + by + ' 0,' + (by - h) + ' 0,' + by + '" fill="' + c + '"/>' +
        '<polygon points="0,' + (by - h) + ' ' + hw + ',' + by + ' 0,' + by + '" fill="' + cd + '"/>';
      if (o.snow) b += '<polygon points="' + f(-hw * 0.55) + ',' + f(by - h * 0.45) + ' 0,' + (by - h) + ' ' + f(hw * 0.55) + ',' + f(by - h * 0.45) +
        ' ' + f(hw * 0.2) + ',' + f(by - h * 0.35) + ' 0,' + f(by - h * 0.5) + ' ' + f(-hw * 0.25) + ',' + f(by - h * 0.33) + '" fill="#fff"/>';
    });
    return g(x, y, s, b);
  }

  function roundTree(x, y, s, c, cd, o) {
    o = o || {};
    let b = shadow(17) + '<path d="M-2.5 0 L-2 -20 L2 -20 L2.5 0Z" fill="' + (o.trunk || '#6b4428') + '"/>' +
      '<circle cx="3" cy="-27" r="16" fill="' + cd + '"/><circle cx="-9" cy="-20" r="11" fill="' + cd + '"/><circle cx="12" cy="-18" r="11" fill="' + cd + '"/>' +
      '<circle cx="0" cy="-30" r="15" fill="' + c + '"/><circle cx="-10" cy="-22" r="10" fill="' + c + '"/><circle cx="10" cy="-21" r="9" fill="' + c + '"/>' +
      '<circle cx="-5" cy="-37" r="5" fill="#fff" opacity=".22"/>';
    if (o.dots) {
      const r = window.makeRng(Math.round(x * 7 + y));
      for (let i = 0; i < 9; i++) b += '<circle cx="' + f(r() * 30 - 15) + '" cy="' + f(-14 - r() * 28) + '" r="' + f(1.4 + r() * 1.3) + '" fill="' + o.dots + '"/>';
    }
    return g(x, y, s, b);
  }

  function acacia(x, y, s, c, cd) {
    const b = shadow(26, 0.16) +
      '<path d="M0 0 L-1 -18 L-12 -31 M-1 -18 L9 -33 M-1 -18 L1 -34" stroke="#4a3220" stroke-width="3" fill="none" stroke-linecap="round"/>' +
      '<ellipse cx="0" cy="-33" rx="29" ry="7" fill="' + cd + '"/><ellipse cx="-2" cy="-36" rx="25" ry="6" fill="' + c + '"/>' +
      '<ellipse cx="12" cy="-39" rx="12" ry="4" fill="' + c + '"/><ellipse cx="-8" cy="-38" rx="8" ry="2" fill="#fff" opacity=".15"/>';
    return g(x, y, s, b);
  }

  function palm(x, y, s, c, cd, lean) {
    const L = lean || 1;
    const tx = 10 * L;
    let b = shadow(14) + '<path d="M0 0 Q' + f(2 * L) + ' -22 ' + tx + ' -44" stroke="#a87443" stroke-width="5" fill="none" stroke-linecap="round"/>' +
      '<path d="M0 0 Q' + f(2 * L) + ' -22 ' + tx + ' -44" stroke="#8a5a30" stroke-width="5" fill="none" stroke-dasharray="1.5 4"/>';
    const fr = [[-30, 10], [-18, -6], [0, -12], [18, -6], [30, 10], [-8, 18], [10, 18]];
    fr.forEach(([dx, dy], i) => {
      b += '<path d="M' + tx + ' -44 Q' + f(tx + dx * 0.5) + ' ' + f(-56 + dy * 0.3) + ' ' + f(tx + dx) + ' ' + f(-44 + dy) +
        ' Q' + f(tx + dx * 0.45) + ' ' + f(-48 + dy * 0.4) + ' ' + tx + ' -44Z" fill="' + (i % 2 ? cd : c) + '"/>';
    });
    b += '<circle cx="' + (tx - 2) + '" cy="-42" r="2.4" fill="#5b3a1e"/><circle cx="' + (tx + 2) + '" cy="-41" r="2.4" fill="#5b3a1e"/>';
    return g(x, y, s, b);
  }

  function willow(x, y, s, c, cd) {
    let b = shadow(20) + '<path d="M-4 0 Q-2 -14 -6 -26 M4 0 Q2 -14 6 -26 M-4 0 L4 0 L2 -24 L-2 -24Z" fill="#4b3a2e" stroke="#4b3a2e" stroke-width="3"/>' +
      '<ellipse cx="0" cy="-32" rx="24" ry="14" fill="' + cd + '"/><ellipse cx="-3" cy="-35" rx="19" ry="10" fill="' + c + '"/>';
    for (let i = -22; i <= 22; i += 4) {
      const top = -32 + Math.abs(i) * 0.25, len = 18 + (Math.abs(i) % 8);
      b += '<path d="M' + i + ' ' + f(top) + ' q' + f(i * 0.06) + ' ' + f(len * 0.5) + ' ' + f(i * 0.1) + ' ' + len + '" stroke="' + (i % 8 ? c : cd) + '" stroke-width="2.6" fill="none" stroke-linecap="round"/>';
    }
    return g(x, y, s, b);
  }

  function bush(x, y, s, c, cd, dots) {
    let b = shadow(13) + '<circle cx="-7" cy="-6" r="8" fill="' + cd + '"/><circle cx="6" cy="-6" r="8" fill="' + cd + '"/>' +
      '<circle cx="0" cy="-11" r="9" fill="' + c + '"/><circle cx="-8" cy="-7" r="6" fill="' + c + '"/><circle cx="8" cy="-7" r="6" fill="' + c + '"/>';
    if (dots) b += '<circle cx="-4" cy="-12" r="1.6" fill="' + dots + '"/><circle cx="4" cy="-8" r="1.6" fill="' + dots + '"/><circle cx="-8" cy="-6" r="1.6" fill="' + dots + '"/>';
    return g(x, y, s, b);
  }

  function rock(x, y, s, c, cd) {
    return g(x, y, s, shadow(12) + '<path d="M-12 0 L-9 -9 L-1 -14 L9 -10 L13 0Z" fill="' + c + '"/><path d="M-1 -14 L9 -10 L13 0 L2 0Z" fill="' + cd + '"/>');
  }

  function flower(x, y, c) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ')"><path d="M0 0 V-6" stroke="#3f8f45" stroke-width="1.2"/>' +
      '<circle cx="-2" cy="-7" r="1.8" fill="' + c + '"/><circle cx="2" cy="-7" r="1.8" fill="' + c + '"/><circle cx="0" cy="-9" r="1.8" fill="' + c + '"/><circle cx="0" cy="-5.4" r="1.8" fill="' + c + '"/>' +
      '<circle cx="0" cy="-7.2" r="1.2" fill="#ffd23f"/></g>';
  }

  function tuft(x, y, c, s) {
    return g(x, y, s || 1, '<path d="M-6 0 Q-6 -6 -9 -10 Q-3 -6 -2 0 Q-1 -9 1 -13 Q2 -6 2 0 Q4 -7 9 -9 Q5 -4 6 0Z" fill="' + c + '"/>');
  }

  function cloud(x, y, s, c, op) {
    return g(x, y, s, '<ellipse cx="0" cy="0" rx="30" ry="11" fill="' + c + '"/><circle cx="-10" cy="-6" r="11" fill="' + c + '"/><circle cx="8" cy="-9" r="14" fill="' + c + '"/>', ' opacity="' + (op || 1) + '"');
  }

  function mountain(x, base, w, h, c, cd, cap) {
    const l = x - w / 2, r = x + w / 2, t = base - h;
    let s = '<polygon points="' + f(l) + ',' + base + ' ' + f(x) + ',' + f(t) + ' ' + f(r) + ',' + base + '" fill="' + c + '"/>' +
      '<polygon points="' + f(x) + ',' + f(t) + ' ' + f(r) + ',' + base + ' ' + f(x + w * 0.08) + ',' + base + '" fill="' + cd + '"/>';
    if (cap) {
      const k = 0.3;
      s += '<polygon points="' + f(x - w / 2 * k) + ',' + f(t + h * k) + ' ' + f(x) + ',' + f(t) + ' ' + f(x + w / 2 * k) + ',' + f(t + h * k) + ' ' +
        f(x + w * 0.07) + ',' + f(t + h * k * 0.75) + ' ' + f(x - w * 0.02) + ',' + f(t + h * k * 1.05) + ' ' + f(x - w * 0.09) + ',' + f(t + h * k * 0.8) + '" fill="' + cap + '"/>';
    }
    return s;
  }

  function cottage(x, y, s, wall, roof, lit) {
    const win = lit ? '#ffd36b' : '#7a8db0';
    const b = shadow(22, 0.18) + '<rect x="-18" y="-22" width="36" height="22" fill="' + wall + '"/>' +
      '<polygon points="-22,-21 0,-40 22,-21" fill="' + roof + '"/><rect x="9" y="-40" width="6" height="12" fill="' + roof + '"/>' +
      '<rect x="-12" y="-16" width="9" height="8" rx="1" fill="' + win + '"/><rect x="4" y="-13" width="7" height="13" fill="#6b4428"/>' +
      (lit ? '<circle cx="-7.5" cy="-12" r="14" fill="#ffd36b" opacity=".18"/>' : '');
    return g(x, y, s, b);
  }

  function mushroom(x, y, s) {
    return g(x, y, s, '<rect x="-2" y="-7" width="4" height="7" rx="1.5" fill="#fff4e0"/><path d="M-8 -6 Q0 -17 8 -6Z" fill="#e8463a"/>' +
      '<circle cx="-3" cy="-9" r="1.4" fill="#fff"/><circle cx="3" cy="-10" r="1.2" fill="#fff"/><circle cx="0" cy="-12.5" r="1" fill="#fff"/>');
  }

  function crystal(x, y, s, c) {
    return g(x, y, s, '<ellipse cx="0" cy="0" rx="16" ry="5" fill="' + c + '" opacity=".25"/>' +
      '<polygon points="-9,0 -12,-14 -7,-22 -4,-4" fill="' + c + '" opacity=".75"/><polygon points="-4,0 -3,-30 3,-36 6,-28 5,0" fill="' + c + '"/>' +
      '<polygon points="-3,-30 3,-36 1,0 -4,0" fill="#fff" opacity=".35"/><polygon points="5,0 10,-18 14,-14 11,0" fill="' + c + '" opacity=".8"/>', ' filter="url(#glow)"');
  }

  function snowman(x, y, s) {
    return g(x, y, s, shadow(12) + '<circle cx="0" cy="-9" r="10" fill="#fff"/><circle cx="0" cy="-24" r="7" fill="#fff"/>' +
      '<circle cx="-2.4" cy="-25.5" r="1" fill="#223"/><circle cx="2.4" cy="-25.5" r="1" fill="#223"/><path d="M0 -23.5 l6 1.5 -6 1z" fill="#ff8c2b"/>' +
      '<path d="M-7 -18 h14" stroke="#e8463a" stroke-width="3" stroke-linecap="round"/><path d="M4 -18 v7" stroke="#e8463a" stroke-width="3" stroke-linecap="round"/>' +
      '<rect x="-5" y="-36" width="10" height="6" fill="#223"/><rect x="-7.5" y="-31" width="15" height="2" fill="#223"/>');
  }

  function lamp(x, y, s) {
    return g(x, y, s, '<circle cx="0" cy="-34" r="16" fill="#ffd36b" opacity=".2"/><rect x="-1.2" y="-32" width="2.4" height="32" fill="#2d3346"/>' +
      '<path d="M-5 -32 h10 l-2 -6 h-6z" fill="#2d3346"/><circle cx="0" cy="-31" r="2.6" fill="#ffe7a3"/>');
  }

  // path through points (Catmull-Rom → cubic Bézier). Returns { d, samples }
  function curve(pts) {
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    const samples = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += ' C' + f(c1[0]) + ' ' + f(c1[1]) + ' ' + f(c2[0]) + ' ' + f(c2[1]) + ' ' + f(p2[0]) + ' ' + f(p2[1]);
      for (let t = 0; t <= 1; t += 0.05) {
        const u = 1 - t;
        samples.push([u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
          u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1]]);
      }
    }
    return { d, samples };
  }

  // Scatter things where they don't collide with the path, labels or each other.
  function Scatter(seed, samples, boxes) {
    const r = window.makeRng(seed);
    const items = [];
    const placed = [];
    function free(x, y, clear) {
      for (const p of samples) if (Math.hypot(p[0] - x, p[1] - y) < clear) return false;
      for (const b of boxes) if (x > b[0] - clear * 0.5 && x < b[2] + clear * 0.5 && y > b[1] - 6 && y < b[3] + clear * 1.4) return false;
      for (const p of placed) if (Math.hypot(p[0] - x, p[1] - y) < p[2]) return false;
      return true;
    }
    const api = {
      r,
      density: 1, pad: 0,
      add(n, area, clear, gap, draw) {
        n = Math.max(1, Math.round(n * api.density));
        clear += api.pad;
        let tries = 0, made = 0;
        while (made < n && tries < n * 40) {
          tries++;
          const x = area[0] + r() * (area[2] - area[0]), y = area[1] + r() * (area[3] - area[1]);
          if (!free(x, y, clear)) continue;
          placed.push([x, y, gap]);
          items.push([y, draw(x, y, r)]);
          made++;
        }
      },
      at(x, y, svg) { items.push([y, svg]); },
      svg() { return items.sort((a, b) => a[0] - b[0]).map((i) => i[1]).join(''); },
    };
    return api;
  }

  window.SCN = { f, g, hills, pine, roundTree, acacia, palm, willow, bush, rock, flower, tuft, cloud, mountain, cottage, mushroom, crystal, snowman, lamp, curve, Scatter };
})();
