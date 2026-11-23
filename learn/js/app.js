/* Backbeat — screens and game flow. Three tabs: Learn (the trail), Jam (free play) and Settings (DAW, binds, pad). */
(function () {
  'use strict';
  const { h, clamp, reduced } = window.Dom;
  const K = window.Kit, A = window.Sound, S = window.Store, L = window.Lessons, R = window.Render, PL = window.Play, TR = window.Trail;
  const app = document.getElementById('app');
  const CHAPTERS = L.CHAPTERS;

  // ---------- settings → kit and sound ----------
  function applySettings() {
    const s = S.load().settings;
    K.use(s);
    A.setVolume(s.volume);
    A.setClick(s.click);
  }
  applySettings();

  // ---------- screen plumbing ----------
  let disposers = [], onKey = null;
  const later = (fn, ms) => { const id = setTimeout(fn, ms); disposers.push(() => clearTimeout(id)); return id; };
  // tab: 'learn' | 'jam' | 'settings' shows the floating dock; wide: the desktop three-column layout (Learn)
  function show(node, tab, wide) {
    disposers.forEach((f) => f());
    disposers = []; onKey = null;
    K.cancelLearn();
    A.stop();
    document.querySelectorAll('.confetti, .toast, .dock, .upbar, .tr-jump, .tr-arrive').forEach((n) => n.remove());
    app.textContent = '';
    app.classList.toggle('wide', !!wide);
    node.classList.add('screen');
    if (tab) { node.classList.add('tabbed'); document.body.appendChild(dock(tab)); }
    app.appendChild(node);
    window.scrollTo(0, 0);
  }
  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.target && e.target.closest && e.target.closest('input, select, textarea')) return;
    if (onKey) onKey(e);
  });
  const onButton = (e) => {
    const ae = document.activeElement;
    return (e.key === ' ' || e.key === 'Enter') && ae && ae.tagName === 'BUTTON' && !ae.disabled;
  };
  function toast(text) {
    document.querySelectorAll('.toast').forEach((n) => n.remove());
    const t = h('div', { class: 'toast', role: 'status' }, text);
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2600);
  }
  function confetti() {
    if (reduced) return;
    const box = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    const colors = K.DRUMS.map((d) => d.color);
    for (let i = 0; i < 70; i++) {
      box.appendChild(h('i', { style: {
        left: Math.random() * 100 + '%', background: colors[i % colors.length],
        animationDelay: Math.random() * 0.5 + 's', animationDuration: 1.6 + Math.random() * 1.4 + 's',
        transform: `rotate(${Math.random() * 360}deg)`, width: 6 + Math.random() * 6 + 'px', height: 8 + Math.random() * 10 + 'px',
      } }));
    }
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
  }

  // Every hit, from anywhere, makes a sound and lights its pad wherever a kit is on screen.
  K.on((id, vel) => {
    A.unlock();
    A.hit(id, vel);
    document.querySelectorAll('.pad[data-id="' + id + '"]').forEach((p) => { p.classList.remove('hit'); void p.getBBox(); p.classList.add('hit'); });
    document.querySelectorAll('[data-drum="' + id + '"]').forEach((p) => { p.classList.remove('flash'); void p.offsetWidth; p.classList.add('flash'); });
  });
  document.addEventListener('pointerdown', () => A.unlock(), { once: true });

  // ---------- small pieces ----------
  const logo = () => h('span', { class: 'logo', 'aria-hidden': 'true', html:
    '<svg viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#ffd23f"/><ellipse cx="32" cy="40" rx="18" ry="6" fill="#15122b"/><rect x="14" y="26" width="36" height="14" fill="#15122b"/><ellipse cx="32" cy="26" rx="18" ry="6" fill="#fdf8ec" stroke="#15122b" stroke-width="3"/><path d="M20 10 L30 22 M44 10 L34 22" stroke="#15122b" stroke-width="4" stroke-linecap="round"/></svg>' });
  const speaker = () => h('span', { class: 'ico', 'aria-hidden': 'true', html:
    '<svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a5 5 0 010 7M18.5 6a8.5 8.5 0 010 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' });
  const loopIcon = () => h('span', { class: 'ico', 'aria-hidden': 'true', html:
    '<svg viewBox="0 0 24 24"><path d="M4 12a6 6 0 0 1 6-6h8M15 3l3 3-3 3M20 12a6 6 0 0 1-6 6H6M9 21l-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  const starRow = (n) => h('span', { class: 'stars', 'aria-label': n + ' of 3 stars' }, [0, 1, 2].map((i) => h('i', { class: i < n ? 'on' : '' }, '★')));
  const bindHtml = (text) => text.replace(/\{(\w+)\}/g, (m, id) => K.byId(id) ? '<kbd class="bind" style="--c:' + K.byId(id).color + '">' + R.esc(K.keyFor(id)) + '</kbd>' : m);

  // the on-screen kit: tap a drum to play it
  function kitEl(on) {
    const el = h('div', { class: 'kit', html: R.kit(on) });
    el.addEventListener('pointerdown', (e) => {
      const p = e.target.closest('.pad');
      if (!p) return;
      e.preventDefault();
      K.emit(p.dataset.id, 100, 'tap');
    });
    el.target = (ids) => {
      const set = new Set(ids || []);
      el.querySelectorAll('.pad').forEach((p) => { p.classList.toggle('lit', set.has(p.dataset.id)); p.classList.toggle('dim', set.size > 0 && !set.has(p.dataset.id)); });
    };
    return el;
  }

  // ---------- navigation ----------
  const TAB_ICONS = {
    learn: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/></svg>',
    jam: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="9" rx="8" ry="3"/><path d="M4 9v7c0 1.7 3.6 3 8 3s8-1.3 8-3V9"/><path d="M8 3l3 5M16 3l-3 5"/></svg>',
    settings: '<svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/></svg>',
  };
  // the floating glass dock at the bottom of the window
  function dock(active) {
    const tabs = [['learn', 'Learn', lessons], ['jam', 'Jam', jam], ['settings', 'Settings', settings]];
    return h('nav', { class: 'dock', 'aria-label': 'Main' }, h('div', { class: 'dock-in' },
      tabs.map(([id, label, fn]) => h('button', { class: 'dk' + (id === active ? ' on' : ''), 'aria-current': id === active ? 'page' : null, onclick: () => { if (id !== active) fn(); } },
        h('span', { class: 'tab-ico', 'aria-hidden': 'true', html: TAB_ICONS[id] }), h('span', null, label)))));
  }
  function inputChip() {
    const st = K.status, d = K.daw(S.load().settings.daw);
    const pad = st.serial || st.midi.length;
    const chip = h('button', { class: 'chip inchip' + (pad ? ' on' : ''), onclick: settings, title: 'Input and DAW settings' },
      h('i', { class: 'dot' }), pad ? 'Pad' : 'Keys', h('small', null, ' · ' + (d.short || d.name)));
    return chip;
  }
  function topbar() {
    const st = S.load();
    const lv = S.levelInfo(st.xp);
    const streak = S.streak();
    return h('header', { class: 'top' },
      h('div', { class: 'brand' }, logo(), h('span', null, 'Backbeat')),
      h('div', { class: 'chips' },
        inputChip(),
        h('span', { class: 'chip streak' + (streak ? ' lit' : ''), title: 'Days in a row' }, '🔥 ', String(streak)),
        h('span', { class: 'chip lvchip', title: `Level ${lv.level}, ${lv.title}` },
          h('b', null, 'Lv ' + lv.level), h('span', { class: 'mini' }, h('i', { style: { width: Math.round(lv.pct * 100) + '%' } })))));
  }
  K.onStatus(() => { document.querySelectorAll('.inchip').forEach((c) => c.replaceWith(inputChip())); });

  // DAW picker used in onboarding and settings
  function dawSelect(onchange) {
    const cur = S.load().settings.daw;
    const sel = h('select', { class: 'select', id: 'daw', 'aria-label': 'Your DAW' },
      K.DAWS.map((d) => h('option', { value: d.id, selected: d.id === cur ? true : null }, d.name)));
    sel.addEventListener('change', () => {
      S.update((s) => {
        if (sel.value === 'custom' && !s.settings.custom) s.settings.custom = JSON.parse(JSON.stringify(K.daw(s.settings.daw === 'custom' ? 'handpad' : s.settings.daw).binds));
        s.settings.daw = sel.value;
      });
      applySettings();
      onchange(sel.value);
    });
    return sel;
  }
  // the keys mirror the pad, so the preview is the pad itself (tap it or press the keys)
  function keyPreview() {
    const k = kitEl([]);
    k.classList.add('kit-small');
    return k;
  }

  // =====================================================================
  // Onboarding
  // =====================================================================
  function onboarding() {
    let head = 1;
    const tiers = [[1, 'Never', 'Start from the very first drum'], [3, 'A little', 'Opens the first three chapters'], [8, 'Yes, I play', 'Opens every chapter']];
    const btns = tiers.map(([n, t, sub]) => h('button', { class: 'tier' + (n === 1 ? ' on' : ''), 'aria-pressed': n === 1 ? 'true' : 'false', onclick: () => select(n) }, h('strong', null, t), h('span', null, sub)));
    function select(n) { head = n; btns.forEach((b, i) => { b.classList.toggle('on', tiers[i][0] === n); b.setAttribute('aria-pressed', tiers[i][0] === n ? 'true' : 'false'); }); }
    const tip = h('p', { class: 'daw-tip' }, K.daw(S.load().settings.daw).tip);
    let prev = keyPreview();
    const sel = dawSelect((id) => { tip.textContent = K.daw(id).tip; const n = keyPreview(); prev.replaceWith(n); prev = n; });
    const go = () => {
      A.unlock();
      S.update((s) => { s.onboarded = true; s.head = head; });
      S.markSeen();
      lessons();
    };
    show(h('main', { class: 'onboard' },
      h('div', { class: 'brand big' }, logo(), h('span', null, 'Backbeat')),
      h('h1', null, 'Learn drums a few minutes at a time.'),
      h('ul', { class: 'pitch' },
        h('li', null, h('b', null, 'Start from zero. '), 'Your first real beat by lesson 3.'),
        h('li', null, h('b', null, 'Every lesson is a game. '), 'Three quick steps: hit the notes as they slide in, chase combos and stars.'),
        h('li', null, h('b', null, 'Practice when you need it. '), 'Any groove loops at your speed and climbs as you get it.'),
        h('li', null, h('b', null, 'Play your way. '), 'Your Handpad, any MIDI pad, the keyboard or a tap on screen.')),
      h('p', { class: 'eyebrow' }, 'Have you played drums before?'),
      h('div', { class: 'tiers' }, btns),
      h('p', { class: 'eyebrow' }, 'No pad yet? The keys sit where the pads are'),
      prev,
      h('p', { class: 'eyebrow' }, 'Which DAW do you use with your pad?'),
      h('div', { class: 'dawbox' }, sel, tip),
      h('button', { class: 'btn big', onclick: go }, 'Let’s play'),
      h('p', { class: 'fine' }, 'You can change your DAW and every key in Settings. Progress is saved on this device.')));
    onKey = (e) => { if (e.key === 'Enter' && !onButton(e)) go(); };
  }

  // =====================================================================
  // Learn trail (same mechanics as Tonic's Learn tab)
  // =====================================================================
  const LOCK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zm2 0h6V7a3 3 0 0 0-6 0z"/></svg>';
  const chapterColor = (ci) => { const ac = TR.BIOMES[ci].ac; return { '--ac': ac, '--acd': TR.shade(ac, 0.68) }; };
  const starsOf = (rec) => (rec ? rec.stars : 0);
  const STEP_ICON = { find: '🎯', ear: '👂', play: '🎮' };
  const stepMeta = (e) => e.t === 'play' ? `${e.bpm} BPM${e.echo ? ' · echo' : ''}` : e.t === 'find' ? 'no timer' : 'listen';

  // ---------- the card that drops down under a tapped stop (like Tonic's) ----------
  let popEl = null, popFor = null;
  function closePop() {
    if (!popEl) return;
    const p = popEl;
    p.classList.remove('on');
    setTimeout(() => p.remove(), 180);
    popEl = null; popFor = null;
  }
  const popGo = (label, fn) => h('button', { class: 'go', disabled: fn ? null : true, onclick: fn ? () => { A.unlock(); fn(); } : null }, label);
  // the steps of a lesson, as a list (Up next's "More info")
  const stepList = (les) => h('ol', { class: 'step-list' }, les.ex.map((e) => h('li', null, h('span', null, STEP_ICON[e.t]), e.title, h('em', null, stepMeta(e)))));
  function openPop(ci, les, key, node) {
    if (popFor === key) return closePop();
    closePop();
    const st = S.load(), info = S.chapters()[ci], ch = CHAPTERS[ci];
    const sec = node.closest('.tr-biome');
    let body, plain = false;
    if (!les) {
      plain = true;
      const todo = ch.ids.map((id) => L.byId(id)).find((l) => !st.lessons[l.id]);
      body = [h('span', { class: 'ic', 'aria-hidden': 'true' }, info.complete ? '🏆' : '🎁'),
        h('span', { class: 'eyebrow' }, `Chapter ${ci + 1} · ${ch.place}`),
        h('h3', null, info.complete ? 'Trophy won!' : 'Chapter trophy'),
        h('p', null, info.complete ? `You finished “${ch.title}”.` : 'Finish the three lessons to win it, plus 60 XP.'),
        h('ul', { class: 'pop-list' }, ch.ids.map((id) => { const l = L.byId(id), r = st.lessons[id];
          return h('li', { class: r ? 'done' : '' }, h('span', { 'aria-hidden': 'true' }, l.icon), l.title, r ? starRow(r.stars) : h('em', null, 'to do')); })),
        info.complete ? popGo('Replay the chapter', () => lesson(L.byId(ch.ids[0]), 0))
          : info.open && todo ? popGo(`Next: ${todo.title}`, () => lesson(todo, 0)) : popGo('🔒 Locked', null)];
    } else {
      const rec = st.lessons[les.id], n = L.LESSONS.indexOf(les) + 1;
      const bpms = les.ex.filter((e) => e.t === 'play').map((e) => e.bpm);
      const hear = les.cards.find((c) => c.a);
      plain = !info.open;
      body = [h('span', { class: 'ic', 'aria-hidden': 'true' }, les.icon),
        h('span', { class: 'eyebrow' }, `Lesson ${n} · ${ch.place}`),
        h('h3', null, les.title),
        h('div', { class: 'row' }, `${les.ex.length} steps · ${bpms.length ? `up to ${Math.max(...bpms)} BPM` : 'no timer'}`),
        rec ? h('div', { class: 'row best' }, starRow(starsOf(rec)), `Best ${rec.best}%`) : null,
        h('div', { class: 'pop-acts' },
          !info.open ? popGo(`🔒 Finish chapter ${ci} first`, null)
            : popGo(rec ? `Play again +${20} XP` : `Start +${40} XP`, () => lesson(les, 0)),
          rec && info.open ? h('button', { class: 'pop-hear', 'aria-label': 'Practice the groove', title: 'Practice the groove', onclick: () => { A.unlock(); practiceGroove(les, lessons); } }, loopIcon()) : null,
          hear && info.open ? h('button', { class: 'pop-hear', 'aria-label': 'Hear it', title: 'Hear it', onclick: () => demo(hear.a, document.body) }, speaker()) : null)];
    }
    const el = h('div', { class: 'tr-pop' + (plain ? ' plain' : ''), role: 'dialog', 'aria-label': les ? les.title : `Chapter ${ci + 1} trophy`, style: chapterColor(ci) }, body);
    sec.appendChild(el);
    // under the coin, kept inside the trail; the little arrow still points at the coin
    const sr = sec.getBoundingClientRect(), nr = node.querySelector('.coin').getBoundingClientRect();
    const w = el.offsetWidth, x = nr.left + nr.width / 2 - sr.left;
    const cx = clamp(x, w / 2 + 12, sr.width - w / 2 - 12);
    el.style.left = cx + 'px';
    el.style.top = (nr.bottom - sr.top + 18) + 'px';
    el.style.setProperty('--ax', (x - cx + w / 2) + 'px');
    void el.offsetWidth;
    el.classList.add('on');
    popEl = el; popFor = key;
    const r = el.getBoundingClientRect();
    if (r.bottom > innerHeight - 96) scrollBy({ top: r.bottom - innerHeight + 110, behavior: reduced ? 'auto' : 'smooth' });
    const go = el.querySelector('.go:not(:disabled)');
    if (go) go.focus({ preventScroll: true });
  }

  // ---------- Learn: tour rail · scenic trail · progress rail ----------
  function lessons() {
    const st = S.load();
    const isl = S.chapters();
    const chOf = (l) => CHAPTERS.findIndex((c) => c.ids.includes(l.id));
    const next = L.LESSONS.find((l) => !st.lessons[l.id] && isl[chOf(l)].open);
    const curCi = next ? chOf(next) : CHAPTERS.length - 1;
    const stars = L.LESSONS.reduce((s, l) => s + starsOf(st.lessons[l.id]), 0);
    const trophies = isl.filter((o) => o.complete).length;
    const at = (x, y) => ({ left: (x / TR.W * 100) + '%', top: (y / TR.H * 100) + '%' });
    let curNode = null, freshSec = null;

    const secs = CHAPTERS.map((ch, ci) => {
      const info = isl[ci];
      const stops = TR.stops(ci);
      const avoid = [], nodes = [];
      // a small dark name chip under each coin
      const chip = (x, y, off, state, title, sub, open) => {
        avoid.push([x - 80, y + off - 6, x + 80, y + off + 34]);
        return h('div', { class: 'tr-chip ' + state, 'aria-hidden': 'true', style: at(x, y + off), onclick: (e) => { e.stopPropagation(); open(); } }, h('b', null, title), sub ? h('small', null, sub) : null);
      };
      ch.ids.forEach((id, li) => {
        const les = L.byId(id), rec = st.lessons[id], n = L.LESSONS.indexOf(les) + 1;
        const state = !info.open ? 'locked' : rec ? 'done' : les === next ? 'current' : 'open';
        const [x, y] = stops[li];
        const open = () => openPop(ci, les, 'l' + id, node);
        const coin = h('button', { class: 'coin', 'aria-haspopup': 'dialog',
          'aria-label': `Lesson ${n}: ${les.title}${rec ? `, completed, ${starsOf(rec)} of 3 stars` : state === 'current' ? ', up next' : state === 'locked' ? ', locked' : ''}`,
          onclick: (e) => { e.stopPropagation(); open(); } },
          h('span', { class: 'tr-ico', 'aria-hidden': 'true' }, les.icon),
          state === 'locked' ? h('span', { class: 'tr-lock', 'aria-hidden': 'true', html: LOCK_SVG }) : null);
        const node = h('div', { class: 'tr-node ' + state, style: at(x, y) },
          state === 'current' ? [h('span', { class: 'tr-ring', 'aria-hidden': 'true' }), h('span', { class: 'tr-start', 'aria-hidden': 'true' }, 'Start')] : null, coin);
        nodes.push(node);
        nodes.push(chip(x, y, 40, state, `${n} · ${les.title}`, rec ? '★'.repeat(starsOf(rec)) + '☆'.repeat(3 - starsOf(rec)) : null, open));
        if (state === 'current') {
          curNode = node;
          const bx = clamp(x <= TR.W / 2 ? x - 86 : x + 86, 36, TR.W - 36);
          avoid.push([x - 60, y - 110, x + 60, y], [bx - 40, y - 80, bx + 40, y + 10]);
          nodes.push(h('div', { class: 'tr-buddy', style: at(bx, y), 'aria-hidden': 'true', html: TR.mascot() }));
        }
      });
      const [tx, ty] = stops[3];
      const tState = info.complete ? 'done' : info.open ? 'todo' : 'locked';
      const tOpen = () => openPop(ci, null, 't' + ci, tNode);
      const tCoin = h('button', { class: 'coin', 'aria-haspopup': 'dialog', 'aria-label': `Chapter ${ci + 1} trophy${info.complete ? ', won' : ''}`,
        onclick: (e) => { e.stopPropagation(); tOpen(); } }, h('span', { 'aria-hidden': 'true' }, info.complete ? '🏆' : '🎁'));
      const tNode = h('div', { class: 'tr-node trophy ' + tState, style: at(tx, ty) }, tCoin);
      nodes.push(tNode);
      nodes.push(chip(tx, ty, 46, tState, info.complete ? 'Trophy won' : 'Chapter trophy', info.complete ? '+60 XP' : null, tOpen));
      if (ci === CHAPTERS.length - 1) nodes.push(h('p', { class: 'tr-end' }, 'More tour dates coming soon 🤘'));
      const sec = h('section', { class: 'tr-biome' + (info.open ? '' : ' locked') + (info.fresh ? ' fresh' : ''), 'data-ci': ci, style: chapterColor(ci),
        'aria-label': `Chapter ${ci + 1}: ${ch.title}. ${info.open ? `${info.done} of ${info.total} lessons done` : 'Locked'}`, html: TR.render(ci, avoid) }, nodes);
      if (info.fresh && !freshSec) freshSec = sec;
      return sec;
    });

    // sticky chapter banner over the trail
    const banner = h('header', { class: 'tr-banner' });
    let shown = -1;
    function setBanner(ci) {
      if (ci === shown) return;
      shown = ci;
      const ch = CHAPTERS[ci], info = isl[ci], col = chapterColor(ci);
      banner.style.setProperty('--c', info.open ? col['--ac'] : '#5d5785');
      banner.style.setProperty('--cd', info.open ? col['--acd'] : '#3d3670');
      banner.textContent = '';
      banner.append(
        h('div', { class: 't' },
          h('span', { class: 'eyebrow' }, `${info.open ? '' : '🔒 '}Chapter ${ci + 1} of ${CHAPTERS.length} · ${ch.place}`),
          h('strong', null, ch.title),
          h('div', { class: 'tr-dots', 'aria-label': `${info.done} of ${info.total} lessons done` }, ch.ids.map((id) => h('i', { class: st.lessons[id] ? 'on' : '' })))),
        h('div', { class: 'tr-score' }, h('span', { 'aria-label': `${stars} of ${L.LESSONS.length * 3} stars` }, `⭐ ${stars}`), h('span', { 'aria-label': `${trophies} of ${CHAPTERS.length} trophies` }, `🏆 ${trophies}`)));
      tourRows.forEach((r, i) => r.classList.toggle('here', i === ci));
    }

    // left rail: the 8-stop tour + your pad
    const tourRows = CHAPTERS.map((ch, ci) => h('button', { class: 'tour-row' + (isl[ci].open ? '' : ' lock'), style: { '--c': TR.BIOMES[ci].ac },
      onclick: () => secs[ci].scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }) },
      h('i', { 'aria-hidden': 'true' }, ch.mark), h('span', null, h('b', null, ch.place), h('small', null, ch.title)),
      h('em', null, isl[ci].complete ? '🏆' : isl[ci].open ? `${isl[ci].done}/3` : '🔒')));
    const padSt = K.status, daw = K.daw(st.settings.daw), padOn = padSt.serial || padSt.midi.length;
    const lrail = h('aside', { class: 'lrail', 'aria-label': 'The tour' },
      h('section', { class: 'rcard' }, h('h5', null, 'The tour', h('span', null, `${trophies}/${CHAPTERS.length} 🏆`)), h('nav', { class: 'tour' }, tourRows)),
      h('section', { class: 'rcard padcard' + (padOn ? ' on' : '') },
        h('h5', null, 'Your pad'),
        h('p', null, h('i', { class: 'dot' }), padOn ? (padSt.serial ? 'Handpad connected (serial)' : padSt.midi[0]) : 'Keyboard for now'),
        h('small', null, `Binds follow ${daw.short || daw.name}`),
        h('button', { class: 'ghost small', onclick: settings }, padOn ? 'Pad settings' : 'Connect your pad')));

    // right rail: up next, streak, today's goal
    const todayN = S.todayCount(), goal = 2, streak = S.streak();
    const week = (() => {
      const d = new Date(), dow = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - dow);
      return ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((lbl, i) => {
        const x = new Date(d); x.setDate(d.getDate() + i);
        const k = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
        return h('span', { class: (st.days.includes(k) ? 'on' : '') + (i === dow ? ' today' : '') }, h('i', null, st.days.includes(k) ? '✓' : ''), lbl);
      });
    })();
    // "More info" folds the lesson's steps open right inside the card
    let upMore = null;
    if (next) {
      const drop = h('div', { class: 'up-drop', id: 'up-steps' }, h('div', null, h('p', { class: 'eyebrow' }, 'What you’ll do'), stepList(next)));
      const btn = h('button', { class: 'ghost small up-more', 'aria-expanded': 'false', 'aria-controls': 'up-steps', onclick: () => {
        const open = !drop.classList.contains('open');
        drop.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      } }, 'More info', h('span', { class: 'chev', 'aria-hidden': 'true', html: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>' }));
      upMore = [btn, drop];
    }
    const upCard = next
      ? h('section', { class: 'rcard up', style: chapterColor(curCi) },
        h('h5', null, 'Up next', h('span', null, `${next.ex.length} steps`)),
        h('div', { class: 'up-row' }, h('span', { class: 'up-ic' }, next.icon), h('div', null, h('strong', null, next.title), h('p', null, next.blurb))),
        h('div', { class: 'up-acts' },
          h('button', { class: 'btn', onclick: () => { A.unlock(); lesson(next, 0); } }, 'Start lesson', h('kbd', null, '↵'))),
        upMore)
      : h('section', { class: 'rcard up' }, h('h5', null, 'Tour complete'), h('p', null, 'Every lesson done. Replay any stop for 3 stars.'));
    const rrail = h('aside', { class: 'rrail', 'aria-label': 'Your progress' },
      upCard,
      h('section', { class: 'rcard' }, h('h5', null, 'Streak', h('span', null, `🔥 ${streak} day${streak === 1 ? '' : 's'}`)), h('div', { class: 'week' }, week)),
      h('section', { class: 'rcard goal' }, h('span', { class: 'ring', style: { '--p': Math.min(1, todayN / goal) } }, h('b', null, `${Math.min(todayN, goal)}/${goal}`)),
        h('div', null, h('strong', null, 'Today’s goal'), h('p', null, todayN >= goal ? 'Done for today. Nice drumming!' : todayN ? 'One more lesson to hit your goal' : `${goal} lessons a day. One keeps the streak.`))));

    // on smaller windows the right rail folds into this floating bar
    const upbar = next ? h('div', { class: 'upbar' }, h('span', { class: 'up-ic' }, next.icon), h('div', null, h('small', null, 'Up next'), h('strong', null, next.title)),
      h('button', { class: 'btn', onclick: () => { A.unlock(); lesson(next, 0); } }, 'Start', h('kbd', null, '↵'))) : null;

    const jump = h('button', { class: 'tr-jump hide', 'aria-label': 'Jump to your next lesson', html: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
      onclick: (e) => { e.stopPropagation(); if (curNode) curNode.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }); } });
    function onScroll() {
      const mid = innerHeight * 0.45;
      let ci = 0;
      secs.forEach((s, i) => { if (s.getBoundingClientRect().top < mid) ci = i; });
      setBanner(ci);
      if (curNode) {
        const r = curNode.getBoundingClientRect();
        jump.classList.toggle('hide', !(r.bottom < 110 || r.top > innerHeight - 110));
        jump.classList.toggle('is-up', r.bottom < 110);   // not 'up': that class styles the Up next card
      }
    }
    setBanner(0);
    show(h('main', { class: 'lessons' }, topbar(),
      h('div', { class: 'learn-grid' }, lrail, h('div', { class: 'trail-col' }, banner, h('div', { class: 'trail' }, secs)), rrail)), 'learn', true);
    // fixed elements live on <body>: the screen's entry animation would otherwise pin them to the screen
    if (upbar) document.body.appendChild(upbar);
    document.body.appendChild(jump);

    addEventListener('scroll', onScroll, { passive: true });
    const outside = (e) => { if (popEl && !popEl.contains(e.target)) closePop(); };
    document.addEventListener('click', outside);
    addEventListener('resize', closePop);   // it's placed in pixels under its coin
    disposers.push(() => { removeEventListener('scroll', onScroll); removeEventListener('resize', closePop); document.removeEventListener('click', outside); popEl = null; popFor = null; });

    // just finished a chapter: travel from its trophy to the new place instead of landing there
    const freshCi = freshSec ? +freshSec.dataset.ci : -1;
    const travel = freshSec && !reduced && freshCi > 0 && isl[freshCi - 1].complete;
    let cine = null;
    if (freshSec && !travel) {
      later(() => toast(`${CHAPTERS[freshCi].mark} Chapter ${freshCi + 1} · ${CHAPTERS[freshCi].place} is open!`), reduced ? 0 : 500);
      S.markSeen();
    }
    // the new place only counts as seen once you've travelled there, so leaving early keeps the trip waiting
    if (travel) cine = zoneTravel(secs[freshCi - 1], freshSec, freshCi,
      [secs[freshCi - 1].querySelector('.tr-node.trophy + .tr-chip'), tourRows[freshCi], jump], () => S.markSeen());
    else {
      const focus = freshSec ? freshSec.querySelector('.tr-node') : curNode;
      if (focus) focus.scrollIntoView({ block: 'center' });
    }
    onScroll();
    onKey = (e) => {
      if (cine && cine.running()) { e.preventDefault(); cine.skip(); return; }
      if (cine && cine.waiting() && e.key === 'Enter') { e.preventDefault(); cine.go(); return; }
      if (onButton(e)) return;
      if (e.key === 'Escape' && popEl) closePop();
      else if (e.key === 'Enter' && next && !popEl) { A.unlock(); lesson(next, 0); }
    };
  }

  // ---------- zone-to-zone travel ----------
  // Back on the trail after winning a trophy: the trophy celebrates and waits with a "Next stop" bubble.
  // Click it (or press Enter) and the camera pans down through the cloud seam, a "Next stop" tour card
  // drives by, then the new place colours in and its stops pop up. Any key, click or scroll skips the trip.
  // triggers: other elements that also start the trip (the trophy chip first, then the tour row and the jump button).
  function zoneTravel(fromSec, toSec, ci, triggers, onDone) {
    const ch = CHAPTERS[ci], col = chapterColor(ci);
    const trophy = fromSec.querySelector('.tr-node.trophy');
    const land = toSec.querySelector('.tr-node');
    const pieces = [...toSec.querySelectorAll('.tr-node, .tr-chip, .tr-buddy, .tr-end')];
    const tourRow = triggers.find((t) => t && t.classList.contains('tour-row'));
    const timers = [];
    let state = 'waiting', raf = 0, card = null, bubble = null;
    const at = (ms, fn) => timers.push(setTimeout(fn, ms));
    const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
    const landY = () => land.getBoundingClientRect().top + scrollY + land.offsetHeight / 2 - innerHeight / 2;

    toSec.classList.remove('fresh');
    toSec.classList.add('arriving');
    trophy.scrollIntoView({ block: 'center' });

    // 1 · the trophy you just won bounces and bursts, then waits for a click
    at(250, () => {
      trophy.classList.add('cele');
      trophy.appendChild(h('span', { class: 'ta-burst', 'aria-hidden': 'true' }, [...Array(12)].map((_, i) => h('i', { style: { '--a': i * 30 + 'deg' } }))));
      trophy.appendChild(h('span', { class: 'ta-xp', 'aria-hidden': 'true' }, '+60 XP'));
      A.sfx('good');
    });
    // the trophy's own label turns into the call to action (a bubble above would cover the last lesson's label)
    const chip = triggers[0], chipWas = chip ? [...chip.childNodes] : [];
    at(1500, () => {
      trophy.classList.add('ready');
      if (chip) { chip.classList.add('ta-go'); chip.replaceChildren(h('b', null, 'Next stop'), h('span', { class: 'ta-arrow' }, '→')); bubble = chip; }
      const coin = trophy.querySelector('.coin');
      coin.setAttribute('aria-label', `Trophy won. Travel to chapter ${ci + 1}, ${ch.place}`);
      coin.focus({ preventScroll: true });
    });
    // clicking the trophy (or a trigger) starts the trip instead of opening its pop-up
    const intercept = (e) => { if (state !== 'waiting') return; e.preventDefault(); e.stopPropagation(); go(); };
    const hosts = [trophy].concat(triggers).filter(Boolean);
    hosts.forEach((n) => n.addEventListener('click', intercept, true));

    function go() {
      if (state !== 'waiting') return;
      state = 'travel';
      A.unlock();
      timers.forEach(clearTimeout); timers.length = 0;
      hosts.forEach((n) => n.removeEventListener('click', intercept, true));
      document.body.classList.add('cine');
      trophy.classList.remove('ready');
      if (bubble) { bubble.classList.remove('ta-go'); bubble.replaceChildren(...chipWas); }
      // 2 · the camera rolls down the trail, through the clouds, into the next place.
      // Driven by the clock, not by frames: requestAnimationFrame stalls in hidden or unfocused windows,
      // so a timer ticks it too and a last snap makes sure the camera always lands.
      const y0 = scrollY, t0 = performance.now(), ms = 1800;
      const step = () => {
        if (state !== 'travel') return false;
        const k = Math.min(1, (performance.now() - t0) / ms);
        scrollTo(0, y0 + (landY() - y0) * ease(k));
        return k < 1;
      };
      const frame = () => { if (step()) raf = requestAnimationFrame(frame); };
      raf = requestAnimationFrame(frame);
      const tick = setInterval(() => { if (!step()) clearInterval(tick); }, 16);
      timers.push(tick);
      at(ms + 30, () => { clearInterval(tick); scrollTo(0, landY()); });
      // 3 · the "Next stop" tour card drives in
      at(ms - 250, () => {
        card = h('div', { class: 'tr-arrive', role: 'status', style: col },
          h('div', { class: 'ta-card' },
            h('span', { class: 'ta-eye' }, 'Next stop'),
            h('span', { class: 'ta-mark', 'aria-hidden': 'true' }, ch.mark),
            h('strong', null, ch.place),
            h('small', null, `Chapter ${ci + 1} · ${ch.title}`),
            h('div', { class: 'ta-road', 'aria-hidden': 'true' }, h('span', { class: 'ta-van', html: TR.van(TR.BIOMES[ci].ac) }))));
        document.body.appendChild(card);
        A.sfx('win');
      });
      // 4 · the card flies off, the new place colours in and its stops pop up one by one
      at(ms + 1350, () => { scrollTo(0, landY()); if (card) card.classList.add('out'); arrive(); });
      at(ms + 2650, finish);
      // listen for skips only after this click has finished bubbling
      setTimeout(() => {
        if (state !== 'travel') return;
        addEventListener('wheel', skip, { capture: true, passive: true });
        addEventListener('touchstart', skip, { capture: true, passive: true });
        addEventListener('pointerdown', skip, true);
      }, 0);
    }
    function arrive() {
      if (!toSec.classList.contains('arriving')) return;
      toSec.classList.remove('arriving');
      toSec.classList.add('arrived');
      pieces.forEach((p, i) => { p.style.animationDelay = (0.15 + i * 0.07).toFixed(2) + 's'; });
      if (tourRow) tourRow.classList.add('arrive');
    }
    function unlisten() {
      timers.forEach((t) => { clearTimeout(t); clearInterval(t); });
      cancelAnimationFrame(raf);
      hosts.forEach((n) => n.removeEventListener('click', intercept, true));
      removeEventListener('wheel', skip, true);
      removeEventListener('touchstart', skip, true);
      removeEventListener('pointerdown', skip, true);
      document.body.classList.remove('cine');
    }
    function finish() {
      if (state === 'done') return;
      state = 'done';
      unlisten();
      if (card) { const c = card; c.classList.add('out'); setTimeout(() => c.remove(), 400); }
      trophy.classList.remove('cele', 'ready');
      trophy.querySelectorAll('.ta-burst, .ta-xp').forEach((n) => n.remove());
      if (bubble && bubble.classList.contains('ta-go')) { bubble.classList.remove('ta-go'); bubble.replaceChildren(...chipWas); }
      arrive();
      const coin = land.querySelector('.coin');
      if (coin) coin.focus({ preventScroll: true });
      if (onDone) onDone();
    }
    function skip(e) {
      if (state !== 'travel') return;
      if (e && e.type === 'pointerdown') {
        // the tap only skips: swallow the click it turns into so it doesn't also open a pop-up
        e.preventDefault(); e.stopPropagation();
        const eat = (c) => { c.preventDefault(); c.stopPropagation(); };
        addEventListener('click', eat, { capture: true, once: true });
        setTimeout(() => removeEventListener('click', eat, true), 600);
      }
      cancelAnimationFrame(raf);
      scrollTo(0, landY());
      finish();
    }
    disposers.push(() => { if (state !== 'done') { state = 'done'; unlisten(); } });
    return { waiting: () => state === 'waiting', running: () => state === 'travel', go, skip };
  }

  // =====================================================================
  // Lesson cards
  // =====================================================================
  // plays a card's sound and animates its picture
  function demo(a, vis) {
    A.unlock(); A.stop();
    const t0 = A.now() + 0.1;
    const mark = (sel, cls, ms) => later(() => {
      vis.querySelectorAll('.' + cls).forEach((n) => n.classList.remove(cls));
      if (sel) vis.querySelectorAll(sel).forEach((n) => n.classList.add(cls));
    }, ms);
    if (a.drum) { K.emit(a.drum, 110, 'demo'); return; }
    if (a.clicks) {
      const spb = 60 / a.bpm;
      const ev = [];
      for (let i = 0; i < a.clicks; i++) { ev.push({ click: true, accent: i % 4 === 0, t: t0 + i * spb }); mark('[data-b="' + (i % 4) + '"]', 'now', (i * spb + 0.1) * 1000); }
      mark(null, 'now', (a.clicks * spb + 0.1) * 1000);
      A.schedule(ev);
      return;
    }
    const div = a.div || 4, P = L.parse(a.pat, div);
    const steps = Math.ceil(P.steps / (div * 4)) * div * 4, stepT = 60 / a.bpm / div, loops = a.loops || 1;
    const ev = [];
    for (let l = 0; l < loops; l++) {
      P.notes.forEach((n) => ev.push({ id: n.id, t: t0 + (l * steps + n.step) * stepT, vel: n.acc ? 120 : 100 }));
      for (let s = 0; s < steps; s++) {
        const ms = ((l * steps + s) * stepT + 0.1) * 1000;
        mark('[data-s="' + s + '"]', 'now', ms);
        P.notes.filter((n) => n.step === s).forEach((n) => later(() => {
          vis.querySelectorAll('.pad[data-id="' + n.id + '"]').forEach((p) => { p.classList.remove('hit'); void p.getBBox(); p.classList.add('hit'); });
        }, ms));
      }
    }
    mark(null, 'now', (loops * steps * stepT + 0.15) * 1000);
    A.schedule(ev);
  }

  // the back arrow at the left of a lesson's HUD: one screen back (the ✕ next to it goes straight to the trail)
  const backBtn = (label, fn) => h('button', { class: 'x hud-back', onclick: fn, 'aria-label': label, title: label + ' (Backspace)', html:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>' });

  function lesson(les, idx) {
    const card = les.cards[idx];
    const n = L.LESSONS.indexOf(les) + 1;
    const last = idx === les.cards.length - 1;
    let vis = null;
    if (card.v) {
      if (card.v.kind === 'kit') vis = kitEl(card.v.on);
      else if (card.v.kind === 'grid') vis = h('div', { class: 'visual', html: R.grid(card.v.pat, card.v.div) });
      else if (card.v.kind === 'beats') vis = h('div', { class: 'visual', html: R.beats() });
    }
    const play = () => { if (card.a) demo(card.a, vis || document.body); };
    const go = (d) => {
      if (d > 0 && last) return exercise(les, 0, []);
      const j = idx + d;
      if (j >= 0) lesson(les, j);
    };
    const back = () => (idx > 0 ? go(-1) : lessons());
    show(h('main', { class: 'lesson' },
      h('div', { class: 'hud' },
        backBtn(idx > 0 ? 'Previous card' : 'Back to the trail', back),
        h('button', { class: 'x', onclick: lessons, 'aria-label': 'Close lesson' }, '✕'),
        h('div', { class: 'segs' }, les.cards.map((_, i) => h('i', { class: i < idx ? 'ok' : i === idx ? 'cur' : '' })), h('i', { class: 'quizseg' })),
        h('div', { class: 'hud-step' }, `${idx + 1}/${les.cards.length}`)),
      h('article', { class: 'lcard' },
        h('div', { class: 'eyebrow' }, `Lesson ${n} · ${les.title}`),
        h('h2', null, card.h),
        h('p', { class: 'ltext', html: bindHtml(card.p) }),
        vis,
        card.a ? h('button', { class: 'ghost hear', onclick: play }, speaker(), card.al || 'Hear it') : null),
      h('div', { class: 'lnav' },
        idx > 0 ? h('button', { class: 'ghost', onclick: () => go(-1) }, '← Back') : h('span'),
        h('button', { class: 'btn', onclick: () => go(1) }, last ? `Play ${les.ex.length} steps` : 'Next', h('kbd', null, '↵')))));
    onKey = (e) => {
      if (onButton(e)) return;
      if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Backspace') { e.preventDefault(); back(); }
      else if (e.key === ' ') { e.preventDefault(); play(); }
      else if (e.key === 'Escape') lessons();
    };
  }

  // =====================================================================
  // Exercises
  // =====================================================================
  const TYPE = { find: '🎯 Find it', ear: '👂 Ear', play: '🎮 Play along' };
  function verdict(acc, timed) {
    return acc >= 90 ? [timed ? 'Perfect groove!' : 'Spot on!', 'great'] : acc >= 75 ? [timed ? 'Great timing!' : 'Great job!', 'good'] : acc >= 50 ? ['Nice, keep going', 'good'] : ['Tough one!', 'low'];
  }
  function exercise(les, i, scores) {
    const ex = les.ex[i];
    const kit = kitEl([]);
    let engine = null, phase = 'ready';
    const resBox = h('div', { class: 'exres', 'aria-live': 'polite' });
    const ctrls = h('div', { class: 'exctl' });
    const next = () => {
      if (i + 1 < les.ex.length) exercise(les, i + 1, scores);
      else results(les, scores);
    };
    let lastAcc = 0;
    function done(res) {
      scores[i] = Math.max(scores[i] || 0, res.acc);
      lastAcc = res.acc;
      phase = 'done';
      segs.children[i].className = res.acc >= 75 ? 'ok' : res.acc >= 50 ? 'meh' : 'no';
      const [title, tone] = verdict(res.acc, ex.t === 'play');
      resBox.className = 'exres on t-' + tone;
      resBox.textContent = '';
      let tip = null;
      if (ex.t === 'play') {
        if (res.early > res.late * 2 && res.early >= 3) tip = 'You’re rushing a little: wait for the click.';
        else if (res.late > res.early * 2 && res.late >= 3) tip = 'You’re a bit late. If it keeps happening with your pad, try Calibrate in Settings.';
        else if (res.extra >= 4) tip = 'A few extra hits: only play when a gem reaches the line.';
        if (res.acc < 75) tip = (tip ? tip + ' ' : '') + 'Not dialed in yet? Practice loops it slower and speeds up as you get it.';
      } else if (res.acc < 100) tip = ex.t === 'ear' ? 'Use “Play it again” as many times as you like.' : 'Look at the key on each chip before you hit.';
      [h('div', { class: 'exres-head' }, h('strong', null, `${res.acc}%`), h('span', null, title)),
        ex.t === 'play' ? h('div', { class: 'tiles' },
          tile('Perfect', res.perfect, 't-mint'), tile('Good', res.good, 't-yellow'), tile('Miss', res.miss, 't-coral'), tile('Points', res.pts.toLocaleString('en-US'), 't-violet')) : null,
        tip ? h('p', { class: 'extip' }, tip) : null].forEach((n) => { if (n) resBox.appendChild(n); });
      A.sfx(res.acc >= 75 ? 'win' : res.acc >= 50 ? 'good' : 'bad');
      setCtrls();
      later(() => { const b = ctrls.querySelector('.btn'); if (b) b.focus({ preventScroll: true }); }, 50);
    }
    const hooks = { done, target: (ids) => kit.target(ids), previewed: () => { phase = 'ready'; setCtrls(); } };
    engine = ex.t === 'find' ? PL.find(ex, hooks) : ex.t === 'ear' ? PL.ear(ex, hooks) : PL.highway(ex, hooks);

    function start() { A.unlock(); resBox.className = 'exres'; phase = 'run'; setCtrls(); engine.start(); }
    function preview() { phase = 'preview'; setCtrls(); engine.preview(); }
    function setCtrls() {
      ctrls.textContent = '';
      if (ex.t !== 'play') {
        if (phase === 'done') ctrls.append(h('button', { class: 'ghost', onclick: start }, '↻ Again'), h('button', { class: 'btn', onclick: next }, i + 1 < les.ex.length ? 'Next' : 'Finish', h('kbd', null, '↵')));
        return;
      }
      if (phase === 'run' || phase === 'preview') ctrls.append(h('button', { class: 'ghost', onclick: () => { engine.stop(); phase = 'ready'; setCtrls(); } }, '■ Stop'));
      else if (phase === 'done') ctrls.append(
        h('button', { class: 'ghost', onclick: start }, '↻ Try again'),
        h('button', { class: 'ghost' + (lastAcc < 75 ? ' hint' : ''), onclick: () => practice(les, ex, les.id + ':' + i, lastAcc < 75, () => exercise(les, i, scores)) }, lastAcc < 75 ? '🔁 Practice slower' : '🔁 Practice'),
        h('button', { class: 'btn', onclick: next }, i + 1 < les.ex.length ? 'Next' : 'Finish', h('kbd', null, '↵')));
      else ctrls.append(h('button', { class: 'ghost', onclick: preview }, speaker(), 'Hear it first'), h('button', { class: 'btn', onclick: start }, '▶ Start', h('kbd', null, '↵')));
    }
    const sub = ex.t === 'play'
      ? (ex.echo ? `${ex.bpm} BPM · after 4 clicks, listen to one bar, then copy it` : `${ex.bpm} BPM · wait for 4 clicks, then hit each gem as it reaches the line`)
      : ex.t === 'find' ? 'Hit the drums in order. No rush.' : 'Listen, then hit the drum you heard.';
    const segs = h('div', { class: 'segs' }, les.ex.map((_, k) => h('i', { class: k < i ? (scores[k] >= 75 ? 'ok' : scores[k] >= 50 ? 'meh' : 'no') : k === i ? 'cur' : '' })));
    // back: the previous step, or from the first step back to the lesson's last card
    const back = () => (i > 0 ? exercise(les, i - 1, scores) : lesson(les, les.cards.length - 1));
    show(h('main', { class: 'lesson exscreen' },
      h('div', { class: 'hud' },
        backBtn(i > 0 ? 'Previous step' : 'Back to the lesson', back),
        h('button', { class: 'x', onclick: lessons, 'aria-label': 'Close lesson' }, '✕'),
        segs,
        h('div', { class: 'hud-step' }, `${i + 1}/${les.ex.length}`)),
      h('article', { class: 'lcard excard' },
        h('div', { class: 'eyebrow' }, `${TYPE[ex.t]} · ${les.title}`),
        h('h2', null, ex.title),
        h('p', { class: 'exsub' }, sub),
        engine.el, resBox, ctrls),
      kit));
    disposers.push(() => engine.stop());   // after show(), which runs the previous screen's disposers
    setCtrls();
    if (ex.t !== 'play') later(start, 250);
    onKey = (e) => {
      if (onButton(e)) return;
      if (e.key === 'Escape') lessons();
      else if (e.key === 'Backspace') { e.preventDefault(); back(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (phase === 'done') next();
        else if (ex.t === 'play' && phase === 'ready') start();
      }
    };
  }
  const tile = (label, v, cls) => h('div', { class: 'tile ' + cls }, h('em', null, label), h('strong', null, String(v)));

  // =====================================================================
  // Results
  // =====================================================================
  function results(les, scores) {
    const acc = Math.round(scores.reduce((a, b) => a + (b || 0), 0) / les.ex.length);
    const out = S.finishLesson(les, acc);
    const tone = out.stars === 3 ? 'great' : out.stars === 2 ? 'good' : 'low';
    const ci = CHAPTERS.findIndex((c) => c.ids.includes(les.id));
    show(h('main', { class: 'results center' },
      h('div', { class: 'emblem e-' + tone },
        h('span', { class: 'emblem-ring' }), h('span', { class: 'emblem-ring r2' }),
        h('span', { class: 'emblem-core' }, les.icon),
        h('span', { class: 'emblem-stars', 'aria-label': out.stars + ' of 3 stars' }, [0, 1, 2].map((k) => h('i', { class: k < out.stars ? 'on' : '' }, '★')))),
      h('p', { class: 'eyebrow' }, `Lesson ${L.LESSONS.indexOf(les) + 1} complete`),
      h('h1', null, les.title),
      h('div', { class: 'tiles' }, tile('Accuracy', acc + '%', 't-mint'), tile('Stars', out.stars + ' / 3', 't-yellow'), tile('XP', '+' + out.xp, 't-violet')),
      out.trophy !== null ? h('div', { class: 'prize' }, h('span', { class: 'prize-ico' }, '🏆'),
        h('div', null, h('span', { class: 'eyebrow' }, `Chapter ${ci + 1} · ${CHAPTERS[ci].place}`), h('strong', null, 'Trophy won!'), h('span', null, `+60 XP. ${ci + 1 < CHAPTERS.length ? `Next stop: ${CHAPTERS[ci + 1].place}.` : 'You finished the tour!'}`))) : null,
      out.stars < 3 ? h('p', { class: 'fine' }, out.stars === 2 ? 'Score 90% or more for 3 stars. Practice loops the groove until it’s dialed in.' : 'Score 70% for 2 stars, 90% for 3. Practice the groove at your own pace, then replay.') : null,
      h('button', { class: 'btn big', onclick: lessons }, 'Back to the trail', h('kbd', null, '↵')),
      h('div', { class: 'row-center' },
        h('button', { class: 'ghost', onclick: () => lesson(les, 0) }, '↻ Replay lesson'),
        L.grooveOf(les) ? h('button', { class: 'ghost' + (out.stars < 2 ? ' hint' : ''), onclick: () => practiceGroove(les, lessons, out.stars < 2) }, '🔁 Practice the groove') : null)));
    A.sfx('win');
    if (out.stars === 3 || out.trophy !== null) confetti();
    if (out.levelUp) later(() => toast(`⬆️ Level ${out.levelUp.level}: ${out.levelUp.title}`), 700);
    onKey = (e) => { if (e.key === 'Enter' && !onButton(e)) lessons(); };
  }

  // =====================================================================
  // Practice: loop a groove until it's dialed in. Each round is a count-in, then the pattern (twice if it's one bar).
  // 90 %+ speeds the next round up by 5 BPM, under 60 % slows it down. 90 %+ at the step's own tempo = dialed in.
  // key: where the record is saved (a lesson id for its groove, "lesson:step" for a step). slow: start at 80 % tempo.
  // =====================================================================
  const round5 = (n) => Math.round(n / 5) * 5;
  function practiceGroove(les, back, slow) {
    const g = L.grooveOf(les);
    if (g) practice(les, g, les.id, !!slow, back);
  }
  function practice(les, ex, key, slow, back) {
    const target = ex.bpm, div = ex.div || 4;
    const bars = Math.ceil(L.parse(ex.pat, div).steps / (div * 4));
    const rec0 = S.practiceOf(key);
    let bpm = target, auto = true, going = false, engine = null, timer = 0;
    const kit = kitEl([]);
    const holder = h('div', { class: 'pr-hw' });
    const bpmOut = h('b', null, '');
    const meter = h('i');
    const badge = h('span', { class: 'pr-badge' + (rec0 && rec0.dialed ? ' on' : '') }, rec0 && rec0.dialed ? '✓ Dialed in' : `Goal: 90% at ${target} BPM`);
    const bestOut = h('span', { class: 'pr-best' }, rec0 && rec0.best ? `Best: ${rec0.best} BPM` : '');
    const log = h('div', { class: 'pr-log', 'aria-label': 'Rounds so far' });
    const msg = h('p', { class: 'pr-msg', 'aria-live': 'polite' }, slow ? 'Starting a bit slower. Nail a round and it speeds up.' : 'Hit Start, then play along. It keeps looping.');
    const ctrls = h('div', { class: 'exctl' });
    const autoBtn = h('button', { class: 'ghost small pr-auto on', 'aria-pressed': 'true', onclick: () => {
      auto = !auto; autoBtn.classList.toggle('on', auto); autoBtn.setAttribute('aria-pressed', String(auto));
      autoBtn.textContent = auto ? 'Auto tempo: on' : 'Auto tempo: off';
    } }, 'Auto tempo: on');
    function setBpm(v) {
      bpm = clamp(v, 40, target + 40);
      bpmOut.textContent = bpm;
      meter.style.width = Math.min(100, (bpm - 40) / Math.max(1, target - 40) * 100) + '%';
      meter.classList.toggle('at', bpm >= target);
      if (!going) build();
    }
    function build() {
      if (engine) engine.stop();
      engine = PL.highway({ pat: ex.pat, bpm, div, loops: bars > 1 ? 1 : 2 }, { done, target: (ids) => kit.target(ids) });
      holder.replaceChildren(engine.el);
    }
    function go() { clearTimeout(timer); A.unlock(); going = true; build(); engine.start(); setCtrls(); }
    function pause() { clearTimeout(timer); going = false; build(); setCtrls(); msg.textContent = 'Paused. Start again when you’re ready.'; }
    function done(res) {
      const out = S.practiced(key, bpm, res.acc, target);
      const was = bpm, step = !auto ? 0 : res.acc >= 90 ? 5 : res.acc < 60 ? -5 : 0;
      log.prepend(h('span', { class: res.acc >= 90 ? 'ok' : res.acc >= 60 ? 'meh' : 'no' }, `${res.acc}% @ ${was}${step > 0 ? ' ↑' : step < 0 ? ' ↓' : ''}`));
      while (log.children.length > 10) log.lastChild.remove();
      if (out.rec.best) bestOut.textContent = `Best: ${out.rec.best} BPM`;
      if (out.dialed) { badge.textContent = '✓ Dialed in · +15 XP'; badge.classList.add('on'); A.sfx('win'); confetti(); }
      else A.sfx(res.acc >= 90 ? 'good' : res.acc >= 60 ? 'tick' : 'bad');
      going = going && document.body.contains(holder);
      bpm = clamp(bpm + step, 40, target + 40);
      bpmOut.textContent = bpm;
      meter.style.width = Math.min(100, (bpm - 40) / Math.max(1, target - 40) * 100) + '%';
      meter.classList.toggle('at', bpm >= target);
      msg.textContent = out.dialed ? `Dialed in at ${was} BPM! Keep going for speed, or head back.`
        : res.acc >= 90 ? (step ? `Clean! Next round: ${bpm} BPM.` : 'Clean!')
        : res.acc >= 60 ? 'Close. Same tempo again.' : step ? `Slowing down to ${bpm} BPM.` : 'Keep at it.';
      if (going) timer = later(go, 1600);
      else setCtrls();
    }
    function setCtrls() {
      ctrls.replaceChildren(
        going ? h('button', { class: 'ghost', onclick: pause }, '■ Pause') : h('button', { class: 'btn', onclick: go }, '▶ Start', h('kbd', null, '↵')),
        h('button', { class: going ? 'btn' : 'ghost', onclick: back }, 'Done'));
    }
    show(h('main', { class: 'lesson exscreen practice' },
      h('div', { class: 'hud' },
        backBtn('Back', back),
        h('button', { class: 'x', onclick: lessons, 'aria-label': 'Close practice' }, '✕'),
        h('div', { class: 'hud-title' }, 'Practice'),
        h('div', { class: 'hud-step' }, '🔁')),
      h('article', { class: 'lcard excard' },
        h('div', { class: 'eyebrow' }, `🔁 Practice · ${les.title}`),
        h('h2', null, ex.title),
        h('p', { class: 'exsub' }, 'It loops, with a count-in each round. Score 90% and the next round is 5 BPM faster; under 60% it slows down.'),
        h('div', { class: 'pr-tempo' },
          h('div', { class: 'pr-dial' },
            h('button', { class: 'ghost small', 'aria-label': 'Slower', title: 'Slower (↓)', onclick: () => setBpm(bpm - 5) }, '−5'),
            h('div', { class: 'pr-bpm' }, bpmOut, h('small', null, 'BPM')),
            h('button', { class: 'ghost small', 'aria-label': 'Faster', title: 'Faster (↑)', onclick: () => setBpm(bpm + 5) }, '+5')),
          h('div', { class: 'pr-side' },
            h('div', { class: 'pr-meter', title: `Target ${target} BPM` }, meter),
            h('div', { class: 'pr-meta' }, badge, bestOut, autoBtn))),
        holder, msg, log, ctrls),
      kit));
    setBpm(slow ? Math.max(45, round5(target * 0.8)) : target);
    setCtrls();
    disposers.push(() => { clearTimeout(timer); if (engine) engine.stop(); });
    onKey = (e) => {
      if (onButton(e)) return;
      if (e.key === 'Enter') { e.preventDefault(); if (going) pause(); else go(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setBpm(bpm + 5); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setBpm(bpm - 5); }
      else if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); back(); }
    };
  }

  // =====================================================================
  // Jam: free play with a metronome and a hit monitor
  // =====================================================================
  function jam() {
    const kit = kitEl([]);
    const mon = h('p', { class: 'monitor', 'aria-live': 'polite' }, 'Hit something! Every hit shows up here, so it’s handy for checking your binds.');
    const bpmOut = h('b', null, '90');
    const range = h('input', { type: 'range', min: 40, max: 200, value: 90, 'aria-label': 'Tempo in BPM' });
    let bpm = 90, on = false, nextT = 0, beat = 0, timer = 0;
    const tick = () => {
      while (nextT < A.now() + 0.12) { A.click(beat % 4 === 0, nextT); nextT += 60 / bpm; beat++; }
    };
    const toggle = h('button', { class: 'ghost', onclick: () => {
      A.unlock(); on = !on;
      toggle.textContent = on ? '■ Stop click' : '▶ Start click';
      clearInterval(timer);
      if (on) { nextT = A.now() + 0.1; beat = 0; timer = setInterval(tick, 25); tick(); } else A.stop();
    } }, '▶ Start click');
    range.addEventListener('input', () => { bpm = +range.value; bpmOut.textContent = bpm; });
    const daw = K.daw(S.load().settings.daw);
    const describe = () => {
      const l = K.status.last;
      if (!l) return;
      if (!l.id) { mon.innerHTML = `MIDI note <b>${l.note}</b> (${K.noteName(l.note, daw.oct)}) isn’t bound to a drum. Set it in Settings → Learn.`; return; }
      const d = K.byId(l.id), b = K.bind(l.id);
      const src = { key: 'keyboard', midi: 'MIDI', serial: 'Handpad (serial)', tap: 'screen tap', demo: 'demo' }[l.src] || l.src;
      mon.innerHTML = `<b style="color:${d.color}">${d.name}</b> · key ${R.esc(K.keyLabel(b.key))} · note ${b.note} (${K.noteName(b.note, daw.oct)}) · from ${src}${l.src === 'midi' || l.src === 'serial' ? ' · velocity ' + l.vel : ''}`;
    };
    // every groove from the chapters you've opened, ready to loop in Practice
    const isl = S.chapters();
    const open = L.LESSONS.filter((l) => isl[CHAPTERS.findIndex((c) => c.ids.includes(l.id))].open && L.grooveOf(l));
    const pick = h('select', { class: 'select', 'aria-label': 'Groove to practice' }, open.map((l) => {
      const g = L.grooveOf(l), p = S.practiceOf(l.id);
      return h('option', { value: l.id }, `${l.icon} ${l.title} · ${g.title} (${g.bpm} BPM)${p && p.dialed ? ' ✓' : ''}`);
    }));
    const firstTodo = open.find((l) => !(S.practiceOf(l.id) || {}).dialed && S.load().lessons[l.id]);
    if (firstTodo) pick.value = firstTodo.id;
    const grooves = h('section', { class: 'card metro' },
      h('div', { class: 'metro-top' }, h('strong', null, 'Practice a groove'), h('span', { class: 'mute small' }, 'loops until it’s dialed in')),
      pick,
      h('button', { class: 'ghost', onclick: () => { A.unlock(); practiceGroove(L.byId(pick.value), jam); } }, '🔁 Practice'));
    show(h('main', { class: 'jam' }, topbar(),
      h('div', { class: 'learn-head' }, h('h1', null, 'Jam'), h('p', { class: 'mute' }, 'Play anything you like. The keys sit where the pads are.')),
      kit,
      mon,
      h('section', { class: 'card metro' }, h('div', { class: 'metro-top' }, h('strong', null, 'Metronome'), h('span', null, bpmOut, ' BPM')), range, toggle),
      open.length ? grooves : null), 'jam');
    // listeners go in after show(), which clears the previous screen's
    const off = K.on(() => describe());
    let lastNote = null;
    const poll = setInterval(() => { const l = K.status.last; if (l && !l.id && l !== lastNote) { lastNote = l; describe(); } }, 150);
    disposers.push(off, () => clearInterval(poll), () => clearInterval(timer));
  }

  // =====================================================================
  // Settings: DAW, binds, pad connection, timing, sound, progress
  // =====================================================================
  function settings() {
    const st = S.load();
    const wrap = h('main', { class: 'settings' });
    const daw = K.daw(st.settings.daw);
    let learning = null;

    const tip = h('p', { class: 'daw-tip' }, daw.tip);
    const sel = dawSelect(() => settings());
    const table = h('div', { class: 'binds', role: 'table', 'aria-label': 'Drum binds' },
      h('div', { class: 'brow bhead', role: 'row' }, h('span', null, 'Pad'), h('span', null, 'Key'), h('span', null, 'MIDI note'), h('span')),
      K.byPad().map((d) => {
        const b = K.bind(d.id);
        const learnBtn = h('button', { class: 'ghost small', onclick: () => learn(d.id, row, learnBtn) }, 'Learn');
        const row = h('div', { class: 'brow', role: 'row', 'data-drum': d.id, style: { '--c': d.color } },
          h('span', { class: 'bname' }, h('i', { class: 'dot' }), h('em', { class: 'bpad' }, String(d.pad)), d.name),
          h('span', null, h('kbd', { class: 'bind', style: { '--c': d.color } }, K.keyLabel(b.key))),
          h('span', { class: 'bnote' }, b.note == null ? '—' : `${b.note} · ${K.noteName(b.note, daw.oct)}`),
          learnBtn);
        return row;
      }));
    function learn(id, row, btn) {
      if (learning) { K.cancelLearn(); learning.row.classList.remove('learning'); learning.btn.textContent = 'Learn'; if (learning.id === id) { learning = null; return; } }
      learning = { id, row, btn };
      row.classList.add('learning');
      btn.textContent = 'Cancel';
      A.unlock();
      K.learn((got) => {
        row.classList.remove('learning');
        learning = null;
        if (!got) { btn.textContent = 'Learn'; return; }
        S.update((s) => {
          const base = s.settings.daw === 'custom' ? s.settings.custom : K.daw(s.settings.daw).binds;
          const c = JSON.parse(JSON.stringify(base || K.daw('handpad').binds));
          K.DRUMS.forEach((dr) => { if (!c[dr.id]) c[dr.id] = { key: null, note: dr.note }; });
          const field = got.key !== undefined ? 'key' : 'note';
          const val = got.key !== undefined ? got.key : got.note;
          // if another drum already uses it, the two swap
          K.DRUMS.forEach((dr) => { if (dr.id !== id && c[dr.id][field] === val) c[dr.id][field] = c[id][field]; });
          c[id][field] = val;
          s.settings.custom = c;
          s.settings.daw = 'custom';
        });
        applySettings();
        toast(`${K.byId(id).name} → ${got.key !== undefined ? 'key ' + K.keyLabel(got.key) : 'note ' + got.note}`);
        settings();
      });
    }
    const resetBinds = h('button', { class: 'ghost small', onclick: () => {
      S.update((s) => { s.settings.custom = JSON.parse(JSON.stringify(K.daw('handpad').binds)); });
      applySettings(); settings(); toast('Custom binds reset to the Handpad defaults');
    } }, 'Reset custom binds');

    // pad connection
    const padMsg = h('p', { class: 'mute small' }, '');
    const padStatus = () => {
      const s = K.status;
      padMsg.textContent = s.serial ? 'Handpad connected over serial.' : s.midi.length ? `MIDI: ${s.midi.join(', ')}` : 'No pad connected. You can still play with the keyboard or by tapping the kit.';
    };
    padStatus();
    const midiBtn = h('button', { class: 'ghost', onclick: async () => { const err = await K.connectMidi(); if (err) toast(err); padStatus(); } }, '🎹 Connect MIDI');
    const serialBtn = h('button', { class: 'ghost', onclick: async () => { const err = await K.connectSerial(); if (err) toast(err); padStatus(); } }, '🔌 Connect serial');

    // timing
    const offOut = h('b', null, st.settings.offset + ' ms');
    const offRange = h('input', { type: 'range', min: -150, max: 200, step: 5, value: st.settings.offset, 'aria-label': 'Timing offset in milliseconds' });
    offRange.addEventListener('input', () => { offOut.textContent = offRange.value + ' ms'; });
    offRange.addEventListener('change', () => { S.update((s) => { s.settings.offset = +offRange.value; }); applySettings(); });
    const calMsg = h('p', { class: 'mute small', 'aria-live': 'polite' }, '');
    const calBtn = h('button', { class: 'ghost', onclick: calibrate }, '🎯 Calibrate');
    function calibrate() {
      A.unlock(); A.stop();
      const spb = 60 / 90, t0 = A.now() + 0.4, n = 16;
      const clicks = [...Array(n)].map((_, i) => t0 + i * spb);
      A.schedule(clicks.map((t, i) => ({ click: true, accent: i % 4 === 0, t })));
      const deltas = [];
      calBtn.disabled = true;
      calMsg.textContent = 'Listen to 4 clicks, then hit any drum on every click…';
      const off = K.on(() => {
        const t = A.now() - A.latency();
        const near = clicks.reduce((b, c) => (Math.abs(c - t) < Math.abs(b - t) ? c : b), clicks[0]);
        if (near >= clicks[4] && Math.abs(near - t) < spb / 2) deltas.push(t - near);
      });
      later(() => {
        off(); calBtn.disabled = false;
        if (deltas.length < 6) { calMsg.textContent = 'Not enough hits. Try again and hit along with every click.'; return; }
        deltas.sort((a, b) => a - b);
        const ms = Math.round(deltas[Math.floor(deltas.length / 2)] * 1000 / 5) * 5;
        const v = clamp(ms, -150, 200);
        S.update((s) => { s.settings.offset = v; }); applySettings();
        offRange.value = v; offOut.textContent = v + ' ms';
        calMsg.textContent = `Done: your hits land ${Math.abs(v)} ms ${v >= 0 ? 'late' : 'early'} on average, so the game now allows for that.`;
      }, (0.4 + n * spb + 0.3) * 1000);
    }

    // sound
    const slider = (label, key) => {
      const r = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: st.settings[key], 'aria-label': label });
      r.addEventListener('input', () => { S.update((s) => { s.settings[key] = +r.value; }); applySettings(); });
      r.addEventListener('change', () => { if (key === 'click') { A.unlock(); A.click(true); } else K.emit('snare', 100, 'demo'); });
      return h('label', { class: 'srow' }, h('span', null, label), r);
    };

    let armed = false;
    const resetBtn = h('button', { class: 'ghost danger', onclick: () => {
      if (!armed) { armed = true; resetBtn.textContent = 'Tap again to erase all progress'; later(() => { armed = false; resetBtn.textContent = 'Reset progress'; }, 3000); return; }
      S.reset(); toast('Progress erased'); onboarding();
    } }, 'Reset progress');

    wrap.append(topbar(),
      h('div', { class: 'learn-head' }, h('h1', null, 'Settings')),
      h('section', { class: 'card' },
        h('h3', null, 'Your DAW'),
        h('p', { class: 'mute small' }, 'The Handpad sends General MIDI notes, which is what most DAW drum kits expect. Pick your DAW to see the notes the way it names them.'),
        sel, tip,
        table,
        h('div', { class: 'row-end' }, h('span', { class: 'mute small' }, daw.id === 'custom' ? 'Press Learn, then a key or a pad.' : 'Defaults are a starting point. Press Learn on any drum to make your own (switches to Custom).'),
          daw.id === 'custom' ? resetBinds : null)),
      h('section', { class: 'card' },
        h('h3', null, 'Connect your pad'),
        h('p', { class: 'mute small' }, 'Our ESP32 DevKit boards send MIDI over serial. A pad with USB or Bluetooth MIDI shows up under MIDI. Chrome or Edge.'),
        h('div', { class: 'row' }, midiBtn, serialBtn), padMsg),
      h('section', { class: 'card' },
        h('h3', null, 'Timing'),
        h('p', { class: 'mute small' }, 'If the game says “Late” when you feel on time (common over Bluetooth), calibrate once.'),
        h('div', { class: 'srow' }, h('span', null, 'Offset'), offRange, offOut),
        h('div', { class: 'row' }, calBtn), calMsg),
      h('section', { class: 'card' }, h('h3', null, 'Sound'), slider('Drums volume', 'volume'), slider('Click volume', 'click')),
      h('section', { class: 'card' }, h('h3', null, 'Progress'), h('p', { class: 'mute small' }, 'Saved in this browser only.'), resetBtn));
    show(wrap, 'settings');
    disposers.push(K.onStatus(padStatus));
    onKey = (e) => { if (e.key === 'Escape' && learning) { K.cancelLearn(); learning.row.classList.remove('learning'); learning.btn.textContent = 'Learn'; learning = null; } };
  }

  // ---------- start ----------
  if (S.load().onboarded) lessons(); else onboarding();
  // handy while developing: Backbeat.lesson('rock') or Backbeat.ex('rock', 3) from the console
  window.Backbeat = { lesson: (id) => lesson(L.byId(id), 0), ex: (id, i) => exercise(L.byId(id), i || 0, []), results: (id, acc) => results(L.byId(id), L.byId(id).ex.map(() => acc || 80)),
    practice: (id, slow) => practiceGroove(L.byId(id), lessons, slow), lessons, settings, jam };
})();
