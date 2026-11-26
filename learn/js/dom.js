/* Backbeat — a tiny DOM helper shared by the screens. h('div', { class, onclick, style, html }, ...children) */
(function () {
  'use strict';
  function h(tag, props) {
    const e = document.createElement(tag);
    if (props) {
      for (const k in props) {
        const v = props[k];
        if (v === null || v === undefined || v === false) continue;
        if (k === 'class') e.className = v;
        else if (k === 'html') e.innerHTML = v;
        else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
        else if (k === 'style') { for (const s in v) { if (s.slice(0, 2) === '--') e.style.setProperty(s, v[s]); else e.style[s] = v[s]; } }
        else e.setAttribute(k, v === true ? '' : v);
      }
    }
    const add = (c) => {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) c.forEach(add);
      else e.appendChild(c.nodeType ? c : document.createTextNode(String(c)));
    };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return e;
  }
  window.Dom = { h, clamp: (x, lo, hi) => Math.max(lo, Math.min(hi, x)), reduced: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) };
})();
