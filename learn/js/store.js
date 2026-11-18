/* Backbeat — saved progress and settings (localStorage, per device). */
(function () {
  'use strict';
  const KEY = 'backbeat.v1';
  const DEF = () => ({
    v: 1, onboarded: false, head: 1,          // head: how many chapters are open from the start
    lessons: {},                              // id -> { best (0-100), stars, plays }
    xp: 0, trophies: [], opened: [], seen: [],
    days: [],                                 // ISO dates with at least one lesson played
    settings: { daw: 'handpad', custom: null, offset: 0, volume: 0.8, click: 0.6, guide: true },
  });
  let cache = null;
  function load() {
    if (cache) return cache;
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (e) { s = null; }
    const d = DEF();
    cache = s ? Object.assign(d, s, { settings: Object.assign(d.settings, s.settings || {}) }) : d;
    return cache;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) { /* private mode: keep it in memory */ } }
  function update(fn) { const s = load(); fn(s); save(); return s; }

  const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function streak() {
    const s = load();
    const set = new Set(s.days);
    const d = new Date();
    if (!set.has(today())) d.setDate(d.getDate() - 1);   // today not played yet: the streak is still alive
    let n = 0;
    for (;;) {
      const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (!set.has(k)) break;
      n++; d.setDate(d.getDate() - 1);
    }
    return n;
  }

  const TITLES = ['Garage newbie', 'Beat keeper', 'Groove rookie', 'Pocket player', 'Fill master', 'Session drummer', 'Tour drummer', 'Headliner'];
  function levelInfo(xp) {
    const per = 150;
    const level = 1 + Math.floor(xp / per);
    return { level, pct: (xp % per) / per, into: xp % per, per, title: TITLES[Math.min(level - 1, TITLES.length - 1)] };
  }

  // Chapters: open if within the head start, if the previous one is complete, or once opened before.
  function chapters() {
    const s = load(), L = window.Lessons;
    let prevDone = true;
    return L.CHAPTERS.map((ch, ci) => {
      const done = ch.ids.filter((id) => s.lessons[id]).length;
      const complete = done === ch.ids.length;
      const open = ci < s.head || prevDone || s.opened.includes(ci);
      prevDone = complete;
      return { open, complete, done, total: ch.ids.length, fresh: open && ci > 0 && !s.seen.includes(ci) && s.onboarded };
    });
  }
  function markSeen() {
    update((s) => { chapters().forEach((c, ci) => { if (c.open) { if (!s.seen.includes(ci)) s.seen.push(ci); if (!s.opened.includes(ci)) s.opened.push(ci); } }); });
  }

  // Save a finished lesson. Returns what changed, for the results screen.
  function finishLesson(les, pct) {
    const before = chapters();
    const lvBefore = levelInfo(load().xp).level;
    const stars = pct >= 90 ? 3 : pct >= 70 ? 2 : 1;
    let xp = 10 + stars * 10, trophy = null, first = false;
    update((s) => {
      const rec = s.lessons[les.id];
      first = !rec;
      if (!first) xp = Math.round(xp / 2);
      s.lessons[les.id] = { best: Math.max(pct, rec ? rec.best : 0), stars: Math.max(stars, rec ? rec.stars : 0), plays: (rec ? rec.plays : 0) + 1 };
      if (!s.days.includes(today())) s.days.push(today());
      s.daily = { date: today(), n: (s.daily && s.daily.date === today() ? s.daily.n : 0) + 1 };
      s.xp += xp;
    });
    const after = chapters();
    after.forEach((c, ci) => {
      if (c.complete && !before[ci].complete && !load().trophies.includes(ci)) {
        trophy = ci;
        update((s) => { s.trophies.push(ci); s.xp += 60; });
      }
    });
    const lv = levelInfo(load().xp);
    return { stars, xp: xp + (trophy !== null ? 60 : 0), trophy, first, levelUp: lv.level > lvBefore ? lv : null };
  }

  window.Store = {
    load, save, update, chapters, markSeen, finishLesson, levelInfo, streak,
    todayCount: () => { const d = load().daily; return d && d.date === today() ? d.n : 0; },
    reset: () => { const keep = load().settings; cache = DEF(); cache.settings = keep; save(); },
  };
})();
