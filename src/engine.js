"use strict";
// ---------- сохранение и настройки ----------
const SAVE = "pristav-save-v3", SET = "pristav-settings";
// сохранение: карьера (звание, деньги, снаряжение) и текущая смена, если она не закончена
function loadSave() { try { const s = JSON.parse(localStorage.getItem(SAVE)); return s && s.v === 3 ? s : null; } catch (e) { return null; } }
function writeSave() { try { localStorage.setItem(SAVE, JSON.stringify({ v: 3, career: CAREER, shift: S && !S.over ? S : null })); } catch (e) {} Cloud.schedulePush(); }
function clearSave() { writeSave(); }
let settings = { sound: true, music: true, best: 0 };
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET)) || {}); } catch (e) {}
function writeSettings() { try { localStorage.setItem(SET, JSON.stringify(settings)); } catch (e) {} Cloud.schedulePush(); }

// ---------- звук (WebAudio, включается после касания) ----------
const Snd = {
  ctx: null, noiseBuf: null,
  init() {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try { this.ctx = new AC(); const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n); const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; } catch (e) { this.ctx = null; }
  },
  tone(f, dur, type, vol, to, delay) {
    const c = this.ctx, t0 = c.currentTime + (delay || 0), o = c.createOscillator(), gn = c.createGain();
    o.type = type || "square"; o.frequency.setValueAtTime(f, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    gn.gain.setValueAtTime(vol || .06, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(gn).connect(c.destination); o.start(t0); o.stop(t0 + dur + .02);
  },
  noise(dur, vol, freq, delay) {
    const c = this.ctx, t0 = c.currentTime + (delay || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), gn = c.createGain();
    s.buffer = this.noiseBuf; fl.type = "lowpass"; fl.frequency.value = freq || 800;
    gn.gain.setValueAtTime(vol || .12, t0); gn.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    s.connect(fl).connect(gn).connect(c.destination); s.start(t0); s.stop(t0 + dur + .02);
  },
  play(name) {
    if (!settings.sound || !this.ctx) return;
    try {
      switch (name) {
        case "tap": this.tone(620, .03, "square", .03); break;
        case "step": for (let i = 0; i < 4; i++) this.noise(.07, .16, 420, i * .26); break;
        case "knock": for (let i = 0; i < 3; i++) { this.tone(110, .09, "sine", .18, 60, i * .16); this.noise(.05, .08, 900, i * .16); } break;
        case "bell": this.tone(880, .5, "sine", .09, null, 0); this.tone(660, .7, "sine", .09, null, .32); break;
        case "creak": this.tone(150, .6, "sawtooth", .035, 85, 0); this.tone(158, .6, "sawtooth", .02, 90, 0); break;
        case "stamp": this.noise(.1, .22, 1200); this.tone(80, .14, "sine", .25, 45); break;
        case "beep": this.tone(1000, .22, "square", .05); this.tone(1000, .22, "square", .05, null, .3); break;
        case "ring": for (let i = 0; i < 4; i++) { this.tone(880, .09, "sine", .06, null, i * .22); this.tone(660, .09, "sine", .06, null, i * .22 + .1); } break;
        case "coin": this.tone(1318, .08, "square", .04); this.tone(1760, .18, "square", .04, null, .08); break;
        case "bad": this.tone(160, .35, "sawtooth", .06, 80); break;
        case "good": this.tone(523, .1, "square", .04); this.tone(659, .1, "square", .04, null, .1); this.tone(784, .2, "square", .04, null, .2); break;
      }
    } catch (e) {}
  }
};
document.addEventListener("pointerdown", () => { Snd.init(); Music.sync(); }, { passive: true });
document.addEventListener("click", (e) => { if (e.target.closest && e.target.closest("button")) Snd.play("tap"); });

// ---------- вспомогательное ----------
const $ = (s) => document.querySelector(s);
const fmt = (n) => n.toLocaleString("ru-RU") + " ₽";
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function shuffle(arr, r) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function hexMix(h, f) {
  const n = parseInt(h.slice(1), 16); let r = n >> 16, g2 = (n >> 8) & 255, b = n & 255; const t = f < 0 ? 0 : 255, a = Math.abs(f);
  r = Math.round(r + (t - r) * a); g2 = Math.round(g2 + (t - g2) * a); b = Math.round(b + (t - b) * a);
  return "#" + ((1 << 24) | (r << 16) | (g2 << 8) | b).toString(16).slice(1);
}
const ease = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const byId = (arr) => Object.fromEntries(arr.map((x) => [x.id, x]));
const CASE = byId(CASES), VIS = byId(VISITORS), EV = byId(EVENTS);
function legalMax(c) { if (c.trap) return 0; return Math.min(c.debt, c.items.reduce((a, i) => a + (i.exempt || i.foreign ? 0 : i.w), 0)); }
const LABELS = { cash: "Взыскано", law: "Закон", heart: "Совесть", safety: "Безопасность", complaints: "Жалобы", boss: "Начальник", bribe: "Взятка" };

// ---------- расписание и состояние ----------
function buildSchedule(seed, days, rank) {
  const r = rng(seed), rk = rank || 0;
  const dang = shuffle(VISITORS.filter((v) => v.danger).map((v) => v.id), r), safe = shuffle(VISITORS.filter((v) => !v.danger).map((v) => v.id), r);
  // дни не повторяют друг друга: разный порядок дел, размер смены на входе и «причуда» дня
  const pick = (a) => a[Math.floor(r() * a.length)];
  const nd = [rk < 2 ? pick([1, 2]) : pick([2, 3])], ns = [rk < 1 ? pick([1, 2]) : pick([2, 3])];
  const twists = [rk < 1 ? "normal" : pick(["normal", "normal", "broken", "trial"])];
  const col = shuffle(EVENTS.filter((e) => e.src === "colleague").map((e) => e.id), r), nei = shuffle(EVENTS.filter((e) => e.src === "neighbor").map((e) => e.id), r);
  const TM = ["08:50", "09:30", "11:00", "11:20", "12:30", "13:00", "15:30"];
  return days.map((d, i) => {
    const tw = twists[i], debts = shuffle(d.debtors, r);
    const court = shuffle(dang.splice(0, nd[i] + (tw === "trial" ? 1 : 0)).concat(safe.splice(0, ns[i])), r);
    const mid = shuffle([{ t: "debt", id: debts[0] }, { t: "debt", id: debts[1] }, { t: "debt", id: debts[2] }, { t: "event", id: nei[i] }, { t: "event", id: col[i] }, { t: "court", ids: court, twist: tw }], r);
    return [{ t: "event", id: "b" + (1 + Math.floor(r() * 4)) }].concat(mid).map((s, k) => Object.assign(s, { time: TM[k] }));
  });
}
function planFor(sched, days) {
  return sched.map((steps, i) => {
    const sum = steps.filter((s) => s.t === "debt").reduce((a, s) => a + legalMax(CASE[s.id]), 0);
    return Math.max(1000, Math.round(sum * days[i].factor / 1000) * 1000);
  });
}
let S = null;
function fresh() {
  const seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0, rank = rankOf(CAREER.xp), r = rng(seed ^ 0x5bd1e995);
  // смена: район по званию, одно рукописное дело (если есть непоказанное) и сгенерированные
  const dists = RANK_DISTS.slice(0, Math.min(RANK_DISTS.length, rank + 1)), dist = dists[Math.floor(r() * dists.length)];
  const hand = DAYS.filter((d) => d.dist === dist).reduce((a, d) => a.concat(d.debtors), []).filter((id) => !CAREER.seen.includes(id));
  const gen = {}, ids = [];
  for (let i = 0; i < 3; i++) {
    if (i === 0 && hand.length && r() < 0.6) { ids.push(hand[Math.floor(r() * hand.length)]); continue; }
    const c = genCase(r, dist, rank, gen); gen[c.id] = c; CASE[c.id] = c; ids.push(c.id);
  }
  const days = [{ name: "СМЕНА № " + (CAREER.shifts + 1), dist, debtors: ids, factor: Math.min(0.8, 0.5 + 0.04 * rank) }];
  const sched = buildSchedule(seed, days, rank);
  return { v: 3, days, gen, seed, day: 0, step: 0, phase: "morning", picks: [], vis: 0, tone: null, toneText: "", note: "", result: null, tainted: false,
    stats: { cash: 0, law: 0, heart: 0, safety: 0, complaints: 0 }, boss: 0, bribe: 0, salary: 0, reprimands: 0,
    sched, plans: planFor(sched, days), dayStart: { cash: 0, law: 0, complaints: 0, inc: 0 }, review: null, epi: [], log: [], over: null, incidents: 0, protocols: 0, q: {} };
}
function stat(k, d) { if (k in S.stats) S.stats[k] += d; else S[k] = (S[k] || 0) + d; }
function applyFx(fx) {
  const tags = [];
  for (const k in fx) { const d = fx[k]; if (!d) continue; stat(k, d); const good = (k === "complaints" || k === "bribe") ? d < 0 : d > 0;
    tags.push([good ? "ok" : "bad", LABELS[k] + " " + (d > 0 ? "+" : "−") + (k === "cash" ? fmt(Math.abs(d)) : Math.abs(d))]); }
  return tags;
}

// ---------- рисование ----------
const cv = $("#scene"), g = cv.getContext("2d");
g.imageSmoothingEnabled = false;
function R(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
let T = 0, sc = { kind: "street", key: "" };
function drawIcon(canvas, key) {
  const g2 = canvas.getContext("2d"); g2.clearRect(0, 0, 16, 16);
  for (const [x, y, w, h, c] of ICONS[key] || []) { g2.fillStyle = c; g2.fillRect(x, y, w, h); }
}
function person(p, ox, oy, o) {
  o = o || {}; oy += (Math.floor(T / 7) % 2) ? 1 : 0;
  const ex = [].concat(p.extra || []), sk = p.skin, skd = hexMix(sk, -.2), skl = hexMix(sk, .12), sh = p.shirt, mood = o.mood || "calm";
  const hr = p.hair, hrd = hexMix(hr, -.3);
  R(ox - 12, oy + 30, 24, 3, sh); R(ox - 18, oy + 33, 36, 3, sh); R(ox - 22, oy + 36, 44, 40, sh); R(ox + 8, oy + 36, 14, 40, "rgba(0,0,0,.16)");
  R(ox - 4, oy + 24, 8, 8, skd);
  if (ex.includes("tie")) { R(ox - 6, oy + 31, 12, 2, "#e8e8ee"); R(ox - 2, oy + 33, 4, 16, "#1a1a22"); }
  if (ex.includes("scarf")) { R(ox - 10, oy + 29, 20, 5, "#d04a4a"); R(ox - 10, oy + 29, 20, 1, "#e87a7a"); R(ox - 8, oy + 34, 4, 8, "#d04a4a"); }
  if (ex.includes("medal")) { R(ox + 8, oy + 40, 5, 6, "#e0b24a"); R(ox + 9, oy + 38, 3, 2, "#c4473a"); }
  R(ox - 10, oy + 2, 20, 18, sk); R(ox - 9, oy + 20, 18, 3, sk); R(ox - 7, oy + 23, 14, 2, sk);
  R(ox + 7, oy + 4, 3, 16, skd); R(ox - 12, oy + 11, 2, 5, sk); R(ox + 10, oy + 11, 2, 5, skd);
  const st = p.style;
  if (st === "short") { R(ox - 11, oy - 1, 22, 6, hr); R(ox - 11, oy + 5, 2, 5, hr); R(ox + 9, oy + 5, 2, 5, hr); }
  else if (st === "bun") { R(ox - 11, oy - 1, 22, 6, hr); R(ox - 5, oy - 6, 10, 5, hr); R(ox - 11, oy + 5, 2, 6, hr); R(ox + 9, oy + 5, 2, 6, hr); }
  else if (st === "long") { R(ox - 11, oy - 1, 22, 6, hr); R(ox - 12, oy + 3, 4, 30, hr); R(ox + 8, oy + 3, 4, 30, hr); }
  else if (st === "curly") { R(ox - 12, oy - 3, 24, 8, hr); R(ox - 13, oy + 3, 4, 10, hr); R(ox + 9, oy + 3, 4, 10, hr); R(ox - 8, oy - 4, 4, 2, hr); R(ox + 2, oy - 4, 5, 2, hr); }
  else if (st === "bald") { R(ox - 11, oy + 4, 2, 6, hr); R(ox + 9, oy + 4, 2, 6, hr); R(ox - 5, oy + 2, 6, 1, skl); }
  if (ex.includes("cap")) { R(ox - 12, oy - 2, 24, 6, "#2a3a5a"); R(ox - 12, oy + 3, 26, 2, "#1a2438"); R(ox - 2, oy - 1, 4, 2, "#d9a441"); }
  if (ex.includes("helmet")) { R(ox - 12, oy - 4, 24, 8, "#e8c030"); R(ox - 13, oy + 3, 26, 2, "#c8a020"); R(ox - 1, oy - 4, 2, 8, "#c8a020"); }
  if (ex.includes("hat")) { R(ox - 8, oy - 12, 16, 11, "#1a1a22"); R(ox - 13, oy - 2, 26, 3, "#1a1a22"); R(ox - 8, oy - 4, 16, 2, "#d04a4a"); }
  const by = mood === "happy" ? 7 : 8;
  if (mood === "angry") { R(ox - 7, oy + 8, 2, 1, hrd); R(ox - 5, oy + 9, 3, 1, hrd); R(ox + 5, oy + 8, 2, 1, hrd); R(ox + 2, oy + 9, 3, 1, hrd); }
  else if (mood === "worried" || mood === "sad") { R(ox - 7, oy + 9, 2, 1, hrd); R(ox - 5, oy + 8, 3, 1, hrd); R(ox + 5, oy + 9, 2, 1, hrd); R(ox + 2, oy + 8, 3, 1, hrd); }
  else { R(ox - 7, oy + by, 5, 1, hrd); R(ox + 2, oy + by, 5, 1, hrd); }
  const blink = (T % 44) < 2, gz = Math.round(Math.sin(T / 31)) ;
  if (blink) { R(ox - 7, oy + 11, 5, 1, skd); R(ox + 2, oy + 11, 5, 1, skd); }
  else { R(ox - 7, oy + 10, 5, 3, "#f4f4f4"); R(ox + 2, oy + 10, 5, 3, "#f4f4f4"); R(ox - 5 + gz, oy + 10, 2, 3, "#1a1a22"); R(ox + 4 + gz, oy + 10, 2, 3, "#1a1a22"); }
  R(ox - 1, oy + 13, 2, 5, skd); R(ox - 2, oy + 17, 4, 1, skd);
  if (p.old) { R(ox - 5, oy + 5, 10, 1, skd); R(ox - 7, oy + 17, 1, 3, skd); R(ox + 6, oy + 17, 1, 3, skd); }
  if (ex.includes("beard")) R(ox - 9, oy + 16, 18, 8, hr);
  if (ex.includes("mustache")) R(ox - 5, oy + 17, 10, 2, hr);
  const mc = ex.includes("beard") ? "#c88a80" : "#7a3a32";
  if (mood === "happy") { R(ox - 3, oy + 19, 1, 1, mc); R(ox - 2, oy + 20, 4, 1, mc); R(ox + 2, oy + 19, 1, 1, mc); }
  else if (mood === "sad" || mood === "worried") { R(ox - 3, oy + 21, 1, 1, mc); R(ox - 2, oy + 20, 4, 1, mc); R(ox + 2, oy + 21, 1, 1, mc); }
  else if (mood === "angry") R(ox - 3, oy + 20, 6, 2, "#5a2a24");
  else R(ox - 3, oy + 20, 6, 1, mc);
  if (ex.includes("glasses")) { R(ox - 8, oy + 9, 7, 1, "#2b2b33"); R(ox + 1, oy + 9, 7, 1, "#2b2b33"); R(ox - 8, oy + 13, 7, 1, "#2b2b33"); R(ox + 1, oy + 13, 7, 1, "#2b2b33"); R(ox - 8, oy + 9, 1, 5, "#2b2b33"); R(ox + 7, oy + 9, 1, 5, "#2b2b33"); R(ox - 1, oy + 11, 2, 1, "#2b2b33"); }
}
function dog(x, y) {
  R(x, y + 10, 30, 12, "#8a6a42"); R(x + 24, y + 4, 14, 12, "#8a6a42"); R(x + 36, y + 9, 5, 4, "#2a1c10"); R(x + 28, y + 6, 2, 2, "#1a1a1a");
  R(x + 22, y + 2, 4, 8, "#6a4a2a"); R(x + 2, y + 22, 4, 6, "#6a4a2a"); R(x + 22, y + 22, 4, 6, "#6a4a2a"); R(x - 5, y + 8 + (T % 12 < 6 ? 0 : 2), 6, 3, "#8a6a42");
}
function sceneDoor() {
  const D = DISTRICTS[sc.dist || "old"];
  if (sc.delay > 0) { sc.delay--; if (sc.delay === 0) Snd.play("creak"); }
  else sc.open += (sc.target - sc.open) * 0.18;
  R(0, 0, 96, 72, D.wall); for (let x = 0; x < 96; x += 8) R(x, 0, 1, 72, "rgba(0,0,0,.12)");
  R(0, 60, 96, 12, D.floor); R(10, 4, 76, 68, D.frame); R(14, 8, 68, 64, D.inside); R(14, 56, 68, 16, D.hall);
  const w = Math.round(68 * (1 - sc.open * 0.88)), gx = 14 + w, gw = 68 - w;
  if (sc.p && gw > 2) { g.save(); g.beginPath(); g.rect(gx, 8, gw, 64); g.clip(); const gc = gx + gw / 2; const ox = Math.round(gc + (48 - gc) * ease(sc.open, .6, 1)); person(sc.p, ox, 20, sc); g.restore(); }
  if (w > 0) {
    const dc = D.door, dd = hexMix(dc, -.18); R(14, 8, w, 64, dc); R(14, 8, w, 2, hexMix(dc, .2));
    if (w > 30) { R(18, 14, w - 8, 20, dd); R(18, 40, w - 8, 26, dd); }
    R(14 + w - 2, 8, 2, 64, hexMix(dc, -.4)); if (w > 14) R(14 + w - 7, 38, 3, 3, "#d8c070"); if (sc.open < .05) { R(46, 16, 3, 3, "#101010"); R(20, 24, 2, 14, "#c8c8d0"); }
  }
  if (sc.chain && sc.open > .05 && sc.open < .6 && gw > 4) { R(gx - 1, 36, gw + 1, 1, "#d8c070"); R(gx - 1, 36, 2, 3, "#d8c070"); }
  R(14, 8, 3, 64, D.frame); R(79, 8, 3, 64, D.frame); R(14, 8, 68, 3, D.frame);
}
function sceneRoom() {
  const D = DISTRICTS[sc.dist || "old"];
  R(0, 0, 96, 72, hexMix(D.wall, .25)); for (let y = 0; y < 48; y += 6) R(0, y, 96, 1, "rgba(0,0,0,.1)");
  R(0, 48, 96, 24, "#5a4a3a"); for (let x = 0; x < 96; x += 12) R(x, 48, 1, 24, "rgba(0,0,0,.2)");
  R(60, 8, 26, 24, "#3a2a1e"); R(62, 10, 22, 20, "#78a8d0"); R(72, 10, 2, 20, "#3a2a1e"); R(62, 19, 22, 2, "#3a2a1e");
  R(8, 36, 40, 12, "#6a3a30"); R(8, 30, 40, 6, "#8a4a3a"); R(16, 40, 14, 20, "rgba(0,0,0,.15)");
}
function sceneCourt() {
  R(0, 0, 96, 72, "#aaa294"); R(0, 0, 96, 6, "#6a6252"); for (let x = 6; x < 96; x += 20) R(x, 6, 6, 40, "#c8c0b0");
  R(0, 46, 96, 26, "#7a7468"); for (let x = 0; x < 96; x += 16) R(x, 46, 1, 26, "rgba(0,0,0,.2)");
  const beep = sc.beeping && (T % 6 < 3);
  R(20, 18, 56, 4, "#2a2e3a"); R(20, 18, 4, 36, "#2a2e3a"); R(72, 18, 4, 36, "#2a2e3a"); R(40, 14, 16, 4, beep ? "#ff3030" : "#d04a3a");
  if (beep) { R(24, 22, 48, 1, "#ff6060"); }
  if (sc.p) person(sc.p, 48, 22, sc);
}
// кабинет пристава: главное меню. Предметы на сцене это кнопки (hotspots)
function sceneOffice() {
  R(0, 0, 96, 72, "#3a3d4a"); R(0, 0, 96, 4, "#2a2c36"); R(0, 46, 96, 2, "#2a2c36");
  R(0, 54, 96, 18, "#4a3a2c"); for (let x = 0; x < 96; x += 12) R(x, 54, 1, 18, "rgba(0,0,0,.25)"); R(0, 54, 96, 1, "#2a1f19");
  R(30, 6, 36, 24, "#1a1a22"); R(32, 8, 32, 20, "#1c2a44"); R(47, 8, 2, 20, "#1a1a22"); R(32, 17, 32, 2, "#1a1a22"); R(56, 10, 4, 4, "#f0e8c0");
  R(33, 20, 6, 8, "#161c30"); R(41, 16, 7, 12, "#161c30"); R(51, 19, 6, 9, "#161c30"); R(58, 15, 5, 13, "#161c30");
  for (let i = 0; i < 5; i++) R(34 + i * 6, 22 + (i % 2) * 2, 1, 1, ((T >> 5) + i) % 4 ? "#e8c860" : "#3a3a44");
  R(3, 13, 22, 42, "#2a1f19"); R(5, 15, 18, 40, "#6a4a30"); R(8, 18, 12, 10, "#9ac4d8"); R(8, 32, 12, 18, "#7a5638"); R(19, 35, 3, 3, "#e0b24a");
  R(72, 20, 22, 36, "#5a6068"); R(74, 22, 18, 32, "#8a9099"); R(78, 34, 10, 10, "#d9a441"); R(81, 37, 4, 4, "#2b2b33"); R(74, 26, 18, 1, "#5a6068"); R(74, 48, 18, 1, "#5a6068");
  R(32, 32, 32, 16, "#3a2a1c"); R(34, 34, 28, 12, "#a4733c"); R(36, 36, 6, 5, "#f3ecd4"); R(44, 36, 8, 4, "#f3ecd4"); R(54, 37, 6, 6, "#f3ecd4"); R(48, 42, 5, 3, "#e0b24a");
  R(14, 56, 68, 5, "#8a5a34"); R(14, 61, 68, 11, "#6a4224"); R(18, 61, 4, 11, "#4a2e18"); R(74, 61, 4, 11, "#4a2e18");
  R(78, 50, 2, 6, "#2b2b33"); R(75, 48, 8, 3, (T >> 6) % 9 ? "#e8c860" : "#b89a40");
}
function sceneLogo() {
  R(0, 0, 96, 72, "#161826");
  for (let i = 0; i < 16; i++) R((i * 37 + 5) % 96, (i * 13) % 34, 1, 1, (i + (T >> 4)) % 5 === 0 ? "#6a6a7a" : "#f0e8c0");
  R(0, 60, 96, 12, "#0e1018"); R(2, 44, 18, 28, "#222638"); R(76, 38, 18, 34, "#262a3e");
  for (let y = 48; y < 68; y += 6) { R(6, y, 3, 3, "#e8c860"); R(12, y, 3, 3, (y + (T >> 5)) % 4 ? "#e8c860" : "#3a3a44"); }
  for (let y = 42; y < 68; y += 6) { R(80, y, 3, 3, "#e8c860"); R(87, y, 3, 3, "#e8c860"); }
  const x = 48;
  R(x - 18, 4, 36, 28, "#d9a441"); R(x - 16, 32, 32, 4, "#d9a441"); R(x - 12, 36, 24, 4, "#d9a441"); R(x - 8, 40, 16, 3, "#d9a441"); R(x - 4, 43, 8, 2, "#d9a441");
  R(x - 15, 7, 30, 22, "#2a2e3a"); R(x - 13, 29, 26, 3, "#2a2e3a"); R(x - 10, 32, 20, 3, "#2a2e3a"); R(x - 6, 35, 12, 3, "#2a2e3a"); R(x - 3, 38, 6, 2, "#2a2e3a");
  R(x - 9, 11, 18, 4, "#e8c860"); R(x - 9, 11, 4, 16, "#e8c860"); R(x + 5, 11, 4, 16, "#e8c860");
  g.textAlign = "center"; g.textBaseline = "top"; g.fillStyle = "#f4ecd0";
  g.font = "8px 'Press Start 2P', monospace"; g.fillText("ПРИСТАВ", x, 47);
  g.fillStyle = "#d9a441"; g.font = "6px 'Press Start 2P', monospace"; g.fillText("СМЕНА", x, 58);
  g.textAlign = "left";
}
function sceneStreet() {
  const D = DISTRICTS[sc.dist || "old"];
  R(0, 0, 96, 72, "#1a1c28"); for (let i = 0; i < 14; i++) R((i * 37) % 96, (i * 17) % 30, 1, 1, "#f0e8c0");
  R(6, 22, 24, 50, hexMix(D.wall, -.5)); R(34, 14, 28, 58, hexMix(D.wall, -.4)); R(66, 26, 24, 46, hexMix(D.wall, -.55));
  for (let y = 18; y < 68; y += 8) { R(40, y, 4, 4, "#e8c860"); R(50, y, 4, 4, ((y + T / 20) | 0) % 5 === 0 ? "#3a3a44" : "#e8c860"); R(10, y + 6, 3, 4, "#e8c860"); R(72, y + 2, 3, 4, "#e8c860"); }
  R(0, 66, 96, 6, "#101218"); R(28, 50, 4, 16, "#3a3d4a");
}
function sceneDesk() {
  R(0, 0, 96, 72, "#2c3040"); R(0, 44, 96, 28, "#5a4030");
  R(8, 20, 28, 30, "#e0d8b8"); R(12, 26, 20, 2, "#7a7458"); R(12, 32, 20, 2, "#7a7458"); R(12, 38, 14, 2, "#7a7458");
  R(48, 10, 40, 34, "#8a8a98"); R(50, 12, 36, 24, "#5fb3c4"); R(60, 44, 20, 4, "#2a2a30");
}
function sceneCall() {
  R(0, 0, 96, 72, "#2c3040"); R(0, 52, 96, 20, "#5a4030"); R(12, 6, 72, 46, "#1a1e28"); R(14, 8, 68, 42, "#2a3a50");
  if (sc.p) { g.save(); g.beginPath(); g.rect(14, 8, 68, 42); g.clip(); person(sc.p, 48, 10, sc); g.restore(); }
  const ring = sc.ringing && (T % 8 < 4); R(34, 54, 28, 8, ring ? "#d9a441" : "#2a2a30"); R(40, 50, 16, 4, ring ? "#d9a441" : "#3a3a44");
  R(14, 8, 68, 1, "#6a7a90"); R(14, 49, 68, 1, "#6a7a90"); R(14, 8, 1, 42, "#6a7a90"); R(81, 8, 1, 42, "#6a7a90");
}
function sceneStair() {
  const D = DISTRICTS[sc.dist || "old"];
  R(0, 0, 96, 72, D.wall); for (let y = 0; y < 72; y += 6) R(0, y, 96, 1, "rgba(0,0,0,.1)");
  R(0, 58, 96, 14, D.floor); R(66, 6, 22, 30, "#3a2a1e"); R(68, 8, 18, 26, "#78a8d0"); R(76, 8, 2, 26, "#3a2a1e");
  for (let i = 0; i < 4; i++) R(0, 58 - i * 3, 96 - i * 4, 3, hexMix(D.floor, i * .05));
  if (sc.dog) dog(28, 36); else if (sc.p) person(sc.p, 40, 18, sc);
}
function render() {
  T++; const k = sc.kind; Music.mood = k === "court" ? 1 : 0;
  if (k === "door") sceneDoor(); else if (k === "room") sceneRoom(); else if (k === "court") sceneCourt();
  else if (k === "desk") sceneDesk(); else if (k === "call") sceneCall(); else if (k === "stair") sceneStair(); else if (k === "logo") sceneLogo(); else if (k === "office") sceneOffice(); else sceneStreet();
}
// сцена пересоздаётся только при смене ключа
function scn(kind, key, o) { if (sc.kind === kind && sc.key === key) { if (o && o.mood) sc.mood = o.mood; return sc; } sc = Object.assign({ kind, key, open: 0, target: 0.3, delay: 8, mood: "calm", dist: S && S.days ? S.days[S.day].dist : "old" }, o || {}); return sc; }

// ---------- интерфейс ----------
function hud() {
  const a = S.stats;
  const h = [["Взыскано", a.cash.toLocaleString("ru-RU"), false], ["Закон", a.law, a.law < 0], ["Совесть", a.heart, a.heart < 0], ["Жалобы", a.complaints, a.complaints > 3], ["Безопасн.", a.safety, a.safety < 0]];
  $("#hud").innerHTML = h.map(([t, v, bad]) => `<div class="${bad ? "bad" : ""}">${t}<b>${esc(v)}</b></div>`).join("");
}
function where() {
  const st = S.sched[S.day][S.step];
  $("#whereL").textContent = `Смена ${CAREER.shifts + 1} · ${DISTRICTS[S.days[S.day].dist].name}`;
  $("#whereR").textContent = S.phase === "morning" ? "Утро" : st ? st.time : "Вечер";
}
function setActions(list) {
  const el = $("#actions"); el.innerHTML = "";
  for (const a of list) { const b = document.createElement("button"); b.textContent = a.label; if (a.cls) b.className = a.cls; if (a.disabled) b.disabled = true; b.addEventListener("click", a.fn); el.appendChild(b); }
}
function panel(html) { $("#panel").innerHTML = html; $("#hot").innerHTML = ""; }
// предметы кабинета поверх сцены: {x, y (в % сцены), icon, label, state, off, big, fn}
function hotspots(list) {
  const el = $("#hot"); el.innerHTML = "";
  for (const h of list) {
    const b = document.createElement("button"); b.className = "hs" + (h.big ? " big" : "") + (h.off ? " off" : "");
    b.style.left = h.x + "%"; b.style.top = h.y + "%"; b.setAttribute("aria-label", h.label + (h.state ? ": " + h.state : ""));
    const cnv = document.createElement("canvas"); cnv.width = 16; cnv.height = 16; drawIcon(cnv, h.icon);
    const t = document.createElement("span"); t.textContent = h.label; b.append(cnv, t);
    if (h.state) { const s = document.createElement("small"); s.textContent = h.state; b.appendChild(s); }
    b.addEventListener("click", h.fn); el.appendChild(b);
  }
}
function tagsHtml(tags) { return `<div>${tags.map(([k, t]) => `<span class="tag ${k}">${esc(t)}</span>`).join("")}</div>`; }
function sfxFor(tags, cash) { if (tags.some(([k]) => k === "bad")) Snd.play("bad"); else if (cash > 0) { Snd.play("stamp"); Snd.play("coin"); } else Snd.play("good"); }

// ---------- меню ----------
// стартовый экран: логотип, описание, вход и регистрация (игра только после входа)
function landing() {
  S = null; sc = { kind: "logo", key: "logo" };
  $("#hud").innerHTML = ""; $("#whereL").textContent = "Заречинск"; $("#whereR").textContent = "ОПВ № 7";
  panel(`<h2>ПРИСТАВ: СМЕНА</h2>
    <p>Сатирическая игра про неделю судебного пристава в вымышленном Заречинске. Четыре района, двенадцать должников, суд с металлодетектором и начальник, который звонит вовремя.</p>
    <ul class="feat"><li>Решайте между законом, совестью и планом</li><li>Спрашивайте, обыскивайте, составляйте протоколы</li><li>Прогресс и рекорд хранятся в облаке</li></ul>
    <p class="who">Все персонажи и организации вымышлены. 16+: чёрный юмор, без жестокости. Для игры нужен аккаунт.</p>`);
  setActions([{ label: "Войти", cls: "primary", fn: () => authScreen("in") }, { label: "Регистрация", fn: () => authScreen("up") }]);
}
function menu() {
  if (!Cloud.user) return landing();
  S = null; sc = { kind: "office", key: "office" };
  $("#hud").innerHTML = ""; $("#whereL").textContent = "Заречинск"; $("#whereR").textContent = "Кабинет";
  const rk = rankOf(CAREER.xp), cur = RANKS[rk], nx = RANKS[rk + 1], pct = nx ? Math.floor((CAREER.xp - cur.xp) / (nx.xp - cur.xp) * 100) : 100;
  panel(`<h2>ПРИСТАВ: СМЕНА</h2>
    <p><b>${esc(cur.n)}</b> · ${esc(Cloud.user)}</p>
    <div class="bars"><div class="bar"><span>Опыт</span><b>${CAREER.xp}</b><i><span style="width:${pct}%"></span></i></div></div>
    <p class="who">${nx ? "До звания «" + esc(nx.n) + "»: " + (nx.xp - CAREER.xp) + " оп." : "Высшее звание."} Смен: ${CAREER.shifts} · Деньги: ${esc(fmt(CAREER.money))} · Лучший результат: ${settings.best || 0} из 100.</p>
    <p class="who">Смена занимает 5–10 минут. Район и дела каждый раз новые, с ростом звания открываются новые районы.</p>`);
  const sv = loadSave(), cont = sv && sv.shift && !sv.shift.over, hs = [];
  hs.push({ x: 15, y: 47, big: true, icon: "door", label: cont ? "ПРОДОЛЖИТЬ" : "СМЕНА", fn: cont ? () => { S = sv.shift; Object.assign(CASE, S.gen || {}); enteredKey = ""; run(); } : startShift });
  if (cont) hs.push({ x: 15, y: 12, icon: "calendar", label: "НОВАЯ", fn: startShift });
  hs.push({ x: 85, y: 52, big: true, icon: "safe", label: "СКЛАД", fn: shop });
  hs.push({ x: 50, y: 40, icon: "trophy", label: "РЕКОРДЫ", fn: board });
  hs.push({ x: 29, y: 81, icon: "book", label: "ПРАВИЛА", fn: howTo });
  hs.push({ x: 50, y: 81, icon: "speaker", label: "ЗВУК", state: settings.sound ? "вкл" : "выкл", off: !settings.sound, fn: () => { settings.sound = !settings.sound; writeSettings(); menu(); } });
  hs.push({ x: 71, y: 81, icon: "radio", label: "МУЗЫКА", state: settings.music ? "вкл" : "выкл", off: !settings.music, fn: () => { settings.music = !settings.music; writeSettings(); Music.sync(); menu(); } });
  hs.push({ x: 88, y: 12, icon: "exit", label: "ВЫЙТИ", fn: logout });
  hotspots(hs);
  setActions([]);
}
function startShift() { S = fresh(); enteredKey = ""; run(); }
function shop() {
  sc = { kind: "street", key: "shop", dist: "old" };
  panel(`<h2>СКЛАД</h2><p class="who">Деньги: ${esc(fmt(CAREER.money))}. Снаряжение действует во всех сменах.</p>` +
    UPGRADES.map((u) => `<div class="note"><b>${esc(u.n)}</b>${hasUp(u.id) ? " (куплено)" : " · " + esc(fmt(u.cost))}<br>${esc(u.d)}</div>`).join(""));
  const list = UPGRADES.filter((u) => !hasUp(u.id)).map((u) => ({ label: "Купить: " + u.n + " — " + fmt(u.cost), disabled: CAREER.money < u.cost, fn: () => { CAREER.money -= u.cost; CAREER.up[u.id] = 1; writeSave(); Snd.play("coin"); shop(); } }));
  list.push({ label: "Назад", cls: "primary", fn: menu });
  setActions(list);
}
function logout() {
  Cloud.signOut();
  try { localStorage.removeItem(SAVE); localStorage.removeItem(SET); } catch (e) {}
  settings.sound = true; settings.music = true; settings.best = 0; CAREER = newCareer(); Music.stop(); $("#snd").textContent = "♪";
  menu();
}
// облако -> устройство после входа: сохранение из облака главнее, пустое облако получает то, что уже есть на устройстве
async function syncAfterLogin() {
  try {
    const row = await Cloud.pull();
    if (row) {
      if (row.data && row.data.v === 3) { localStorage.setItem(SAVE, JSON.stringify(row.data)); CAREER = Object.assign(newCareer(), row.data.career || {}); }
      const cs = row.settings || {};
      if (typeof cs.sound === "boolean") settings.sound = cs.sound;
      settings.best = Math.max(settings.best || 0, cs.best || 0);
      writeSettings();
    }
    await Cloud.push();
  } catch (e) {}
  $("#snd").textContent = settings.sound ? "♪" : "×";
}
function authScreen(mode) {
  const up = mode === "up";
  sc = { kind: "street", key: "auth", dist: "old" };
  panel(`<h2>${up ? "РЕГИСТРАЦИЯ" : "ВХОД"}</h2>
    <p>${up ? "Логин нужен для входа, почта на случай связи. Прогресс и рекорд будут в облаке: играть можно с любого телефона." : "Введите логин и пароль, которые вы указали при регистрации."}</p>
    <div class="form"><label>Логин<input id="f_user" autocomplete="username" autocapitalize="none" spellcheck="false" maxlength="16" placeholder="latin_login"></label>
    ${up ? `<label>Почта<input id="f_mail" type="email" autocomplete="email" autocapitalize="none" placeholder="you@mail.ru"></label>` : ""}
    <label>Пароль<input id="f_pass" type="password" autocomplete="${up ? "new-password" : "current-password"}" placeholder="от 6 символов"></label></div>
    <p class="who" id="msg"></p>`);
  let busy = false;
  const go = async () => {
    if (busy) return; busy = true; const msg = $("#msg"); msg.textContent = "Подождите…";
    try {
      if (up) await Cloud.signUp($("#f_user").value, $("#f_mail").value, $("#f_pass").value); else await Cloud.signIn($("#f_user").value, $("#f_pass").value);
      msg.textContent = "Готово, загружаю профиль…"; await syncAfterLogin(); Snd.play("good"); menu();
    } catch (e) { msg.textContent = e.message && /^(Логин|Введите|Пароль|Такой|Неверный|Регистрация)/.test(e.message) ? e.message : Cloud.human(e); Snd.play("bad"); busy = false; }
  };
  setActions([{ label: up ? "Зарегистрироваться" : "Войти", cls: "primary", fn: go }, { label: up ? "У меня уже есть аккаунт" : "Нет аккаунта: регистрация", fn: () => authScreen(up ? "in" : "up") }, { label: "Назад", fn: landing }]);
}
function board() {
  sc = { kind: "street", key: "board", dist: "old" };
  panel(`<h2>ТАБЛИЦА РЕКОРДОВ</h2><p class="who" id="msg">Загружаю…</p><div id="rows"></div>`);
  setActions([{ label: "Назад", cls: "primary", fn: menu }]);
  Cloud.leaderboard().then((rows) => {
    if (!$("#rows")) return;
    $("#msg").textContent = rows.length ? "Лучшие результаты недели (оценка из 100)." : "Пока никого. Станьте первым.";
    $("#rows").innerHTML = `<ol class="board">${rows.map((r) => `<li class="${r.username === Cloud.user ? "me" : ""}"><span>${esc(r.username)}</span><b>${r.score}</b></li>`).join("")}</ol>`;
  }).catch((e) => { if ($("#msg")) $("#msg").textContent = Cloud.human(e); });
}
function howTo() {
  sc = { kind: "street", key: "how", dist: "old" };
  panel(`<h2>КАК ИГРАТЬ</h2>
    <p>Одна смена: три должника, дежурство на входе в суд, звонок начальника и пара событий. Минут на пять-десять. За смену вы получаете опыт, премию и звание.</p>
    <p>У должника три шага: поговорить, сверить документы, описать имущество. Нельзя изымать защищённое законом (жильё, лекарства, детское, орудия труда) и чужое. Бывает тёзка и уже оплаченный долг.</p>
    <p>На входе в суд спросите о цели визита и о запрещённом, посмотрите сумку и коробки. Рамка молчит не всегда честно: при подозрении проводите личный обыск. Найденное оформляйте протоколом. Пропустите опасного человека, и пострадают судья, заседатели, участники процесса или граждане.</p>
    <p class="who">Деньги тратьте на складе: справочник, детектор, напарник, машина. Три провальные смены подряд ведут к понижению.</p>`);
  setActions([{ label: "Назад", cls: "primary", fn: menu }]);
}

// ---------- ход игры ----------
let enteredKey = "";
function run() {
  writeSave(); hud(); where();
  if (S.over) return endScreen();
  if (S.phase === "morning") return morning();
  const st = S.sched[S.day][S.step];
  if (!st) return dayDone();
  const key = S.day + ":" + S.step;
  if (enteredKey !== key) { enteredKey = key; onEnter(st); }
  if (st.t === "debt") debtScreen(CASE[st.id]); else if (st.t === "event") eventScreen(EV[st.id], st); else courtScreen(st);
}
function onEnter(st) {
  if (st.t === "debt") { Snd.play("step"); setTimeout(() => { if (sc.kind === "door") { Snd.play("knock"); Snd.play("bell"); } }, 700); }
  else if (st.t === "event" && st.id[0] === "b") Snd.play("ring"); else Snd.play("step");
}
function next() { S.step += 1; S.phase = "start"; S.picks = []; S.vis = 0; S.q = {}; S.note = ""; S.result = null; S.tainted = false; run(); }

function morning() {
  const d = S.days[S.day], D = DISTRICTS[d.dist]; scn("street", "m" + S.day, { dist: d.dist });
  let html = `<h2>${d.name}</h2>`;
  if (S.review) {
    const r = S.review, rn = { bonus: ["ПРЕМИЯ 3 000 ₽", "ok", "Начальник кисло улыбнулся и подписал бумагу."], rep: ["ВЫГОВОР", "bad", "Лыков зачитал приказ, не поднимая глаз."], note: ["ЗАМЕЧАНИЕ УСТНОЕ", "ok", "«Работайте». Ни хвалы, ни наказания."] }[r.kind];
    html += `<div class="note"><b>Итоги вчерашнего дня.</b><br>Взыскано: ${esc(fmt(r.gained))} при плане ${esc(fmt(r.plan))}. Жалоб за день: ${r.comp}.${r.inc ? " Инцидентов на входе в суд: " + r.inc + "." : ""}</div><span class="tag ${rn[1]}">${rn[0]}</span><p>${esc(rn[2])}</p>`;
  }
  const ct = S.sched[S.day].find((x) => x.t === "court"), tw = { broken: "В суде сегодня сломана рамка металлодетектора: на неё нельзя полагаться.", trial: "В суде громкое дело: народу больше обычного, и опасных тоже." }[ct && ct.twist];
  if (tw) html += `<div class="note">${esc(tw)}</div>`;
  html += `<p class="who">Район: ${esc(D.name)}. ${esc(D.blurb)}</p><p>План на день: <b>${esc(fmt(S.plans[S.day]))}</b>. Три адреса, дежурство в суде и телефон, который не замолкает.</p>`;
  panel(html);
  setActions([{ label: "Выйти на смену", cls: "primary", fn: () => { S.phase = "start"; S.step = 0; S.dayStart = { cash: S.stats.cash, law: S.stats.law, complaints: S.stats.complaints, inc: S.incidents || 0 }; run(); } }]);
}
function dayDone() {
  const d = S.day, a = S.stats, ds = S.dayStart, gained = a.cash - ds.cash, comp = a.complaints - ds.complaints, law = a.law - ds.law, plan = S.plans[d];
  let kind = "note";
  const inc = (S.incidents || 0) - (ds.inc || 0);
  if (gained >= plan && comp <= 1 && law >= -1 && !inc) kind = "bonus"; else if (gained < plan * 0.4 || comp >= 4 || law <= -4 || inc >= 2) kind = "rep";
  if (kind === "bonus") { S.salary += 3000; stat("boss", 1); Snd.play("good"); } else if (kind === "rep") { S.reprimands += 1; stat("boss", -1); Snd.play("bad"); }
  S.review = { day: d, gained, plan, comp, law, kind, inc };
  S.over = (a.complaints >= 8 || a.law <= -8 || (S.incidents || 0) >= 3) ? "fired" : "end";
  enteredKey = ""; run();
}

// ----- должник -----
function debtScreen(c) {
  const sk = "d" + c.id; const doorScene = () => scn("door", sk, { p: c.person, chain: true, dist: S.days[S.day].dist });
  if (S.phase === "start") {
    doorScene();
    panel(`<h2>${esc(c.name)}</h2><p class="who">Долг: ${esc(fmt(c.debt))} · Взыскатель: ${esc(c.creditor)}</p><p>${esc(c.intro)}</p><q>${esc(c.line)}</q>`);
    setActions([
      { label: "Строго по протоколу", fn: () => tone(c, "strict") },
      { label: "Поговорить по-человечески", fn: () => tone(c, "kind") },
      { label: "Надавить: «Откройте или взломаем»", cls: "danger", fn: () => tone(c, "hard") }
    ]);
  } else if (S.phase === "talk") {
    doorScene(); panel(`<h2>${esc(c.name)}</h2><p>${esc(S.toneText)}</p><div class="note">Заметка: ${esc(c.hint)}</div>${hasUp("handbook") ? `<div class="note">Справочник: защищено законом вещей: ${c.items.filter((i) => i.exempt || i.foreign).length}.${c.trap ? " В бумагах что-то не так." : ""}</div>` : ""}`);
    setActions([{ label: "К документам", cls: "primary", fn: () => { S.phase = "docs"; run(); } }]);
  } else if (S.phase === "docs") { doorScene(); sc.target = 1; docs(c); }
  else if (S.phase === "inspect") inspect(c);
  else if (S.phase === "result") { doorScene(); sc.target = 1; resultScreen(); }
}
function tone(c, t) {
  const sk = scn("door", "d" + c.id, { p: c.person });
  if (t === "strict") { S.toneText = "Вы представились и зачитали постановление. Должник слушает молча и не спорит."; sk.mood = "worried"; }
  if (t === "kind") { stat("heart", 1); S.toneText = "Вы присели на табурет и выслушали. Должник заметно расслабился и показал документы без споров."; sk.mood = "happy"; }
  if (t === "hard") { stat("heart", -1); stat("law", -1); stat("complaints", 1); S.toneText = "Вы пригрозили вскрытием двери. Должник побледнел, но жалобу потом точно напишет."; sk.mood = "angry"; Snd.play("knock"); }
  sk.target = 1; sk.chain = false; Snd.play("creak"); S.tone = t; S.phase = "talk"; run();
}
function docs(c) {
  const p = c.passport || { name: c.name, born: c.born };
  panel(`<h2>СВЕРКА ДОКУМЕНТОВ</h2>
    <div class="docs">
      <div class="doc"><h3>В ДЕЛЕ</h3>${esc(c.name)}<br>Год рождения: ${c.born}<br>Долг: ${esc(fmt(c.debt))}${c.contract ? "<br>Договор № " + c.contract : ""}</div>
      <div class="doc"><h3>ПАСПОРТ</h3>${esc(p.name)}<br>Год рождения: ${p.born}<br>Прописка: Заречинск</div>
      ${c.receipt ? `<div class="doc wide"><h3>БУМАГА ОТ ДОЛЖНИКА</h3>${esc(c.receipt)}</div>` : ""}
    </div><p>Что скажете?</p>`);
  setActions([
    { label: "Всё сходится, к описи", fn: () => {
      if (c.trap === "name") { stat("law", -1); S.tainted = true; S.note = "Вы пропустили несовпадение отчества. Любое изъятие теперь будет незаконным."; }
      else if (c.trap === "paid") { stat("law", -1); S.tainted = true; S.note = "Вы не заметили чек: долг уже погашен. Любое изъятие теперь будет незаконным."; }
      S.phase = "inspect"; run(); } },
    { label: "Это не тот человек", cls: "danger", fn: () => {
      if (c.trap === "name") { stat("law", 2); stat("heart", 1); S.log.push({ id: c.id, out: "m" }); S.result = { title: "ТЁЗКА НАЙДЕН", text: "Вы вернули дело: это другой человек, тёзка. Должник пожал вам руку и впервые за долгое время улыбнулся.", cash: 0, tags: [["ok", "Закон +2"], ["ok", "Совесть +1"]] }; S.phase = "result"; sc.mood = "happy"; Snd.play("good"); }
      else { stat("complaints", 1); stat("law", -1); S.note = "Вы зря заподозрили подлог, потеряли время и получили выговор." + (c.trap === "paid" ? " Долг, между прочим, погашен." : ""); if (c.trap === "paid") S.tainted = true; S.phase = "inspect"; Snd.play("bad"); }
      run(); } },
    { label: "Долг уже оплачен", fn: () => {
      if (c.trap === "paid") { stat("law", 2); stat("heart", 1); S.log.push({ id: c.id, out: "m" }); S.result = { title: "ДОЛГ ПОГАШЕН", text: "Чек настоящий: взыскатель зачёл платёж на другой договор. Вы вернули дело на пересмотр. Должник перекрестился и угостил вас чаем.", cash: 0, tags: [["ok", "Закон +2"], ["ok", "Совесть +1"]] }; S.phase = "result"; sc.mood = "happy"; Snd.play("good"); }
      else { stat("complaints", 1); stat("law", -1); S.note = "Бумага не закрывает долг: сумма или период не те. Взыскатель недоволен."; if (c.trap === "name") S.tainted = true; S.phase = "inspect"; Snd.play("bad"); }
      run(); } }
  ]);
}
function inspect(c) {
  scn("room", "r" + c.id, { dist: S.days[S.day].dist });
  panel(`<h2>ОПИСЬ ИМУЩЕСТВА</h2>${S.note ? `<div class="note">${esc(S.note)}</div>` : ""}
    <p>Долг: ${esc(fmt(c.debt))}. Выберите вещи для изъятия, нажатие показывает комментарий.</p>
    <div class="grid" id="grid"></div><div class="note" id="note">Нажмите на вещь, чтобы осмотреть её.</div><p id="sum"></p>`);
  const grid = $("#grid");
  c.items.forEach((it, idx) => {
    const b = document.createElement("button"); b.className = "item" + (S.picks.includes(idx) ? " on" : "");
    const cnv = document.createElement("canvas"); cnv.width = 16; cnv.height = 16; drawIcon(cnv, it.k);
    const t = document.createElement("div"); t.textContent = it.n; const w = document.createElement("small"); w.textContent = it.w ? fmt(it.w) : "—";
    b.append(cnv, t, w);
    b.addEventListener("click", () => { const at = S.picks.indexOf(idx); if (at >= 0) S.picks.splice(at, 1); else S.picks.push(idx); b.classList.toggle("on"); $("#note").textContent = it.note; refresh(c); writeSave(); });
    grid.appendChild(b);
  });
  refresh(c);
}
function refresh(c) {
  const sel = S.picks.map((i) => c.items[i]), sum = sel.reduce((a, b) => a + b.w, 0);
  $("#sum").textContent = `Выбрано: ${sel.length} шт., ${fmt(sum)} из ${fmt(c.debt)}`;
  setActions([
    { label: sel.length ? "Изъять выбранное" : "Ничего не выбрано", cls: "primary", disabled: !sel.length, fn: () => seize(c) },
    { label: "Дать отсрочку на 14 дней", fn: () => defer(c) },
    { label: "Закрыть дело без изъятия", cls: "danger", fn: () => closeCase(c) }
  ]);
}
function finishDebt(title, text, cash, tags, out, mood) {
  S.log.push({ id: S.sched[S.day][S.step].id, out }); S.result = { title, text, cash, tags }; S.phase = "result"; sc.mood = mood || "calm"; stat("cash", cash); sfxFor(tags, cash); run();
}
function seize(c) {
  const sel = S.picks.map((i) => c.items[i]), bad = sel.filter((i) => i.exempt || i.foreign), good = sel.filter((i) => !i.exempt && !i.foreign);
  const tags = []; let cash = Math.min(c.debt, good.reduce((a, b) => a + b.w, 0)), text, out = "s";
  if (S.tainted || c.trap) {
    stat("law", -3); stat("complaints", 2); cash = 0; out = "bad";
    text = c.trap === "paid" ? "Вы изъяли имущество у человека, который уже всё выплатил. МФО извинится письмом, но вещи вы вернёте сами." : "Вы изъяли имущество у человека, который ничего не должен. Завтра об этом напишут в местных новостях.";
    tags.push(["bad", "Закон −3"], ["bad", "Жалобы +2"]);
  } else {
    if (bad.length) {
      stat("law", -2 * bad.length); stat("complaints", bad.length); out = "bad";
      const fr = bad.filter((i) => i.foreign), pr = bad.filter((i) => !i.foreign);
      text = (pr.length ? "Среди вещей защищённые законом: " + pr.map((i) => i.n.toLowerCase()).join(", ") + ". " : "") + (fr.length ? "Среди вещей чужие: " + fr.map((i) => i.n.toLowerCase()).join(", ") + ". " : "") + "Придётся вернуть и объясняться.";
      tags.push(["bad", `Закон −${2 * bad.length}`], ["bad", `Жалобы +${bad.length}`]);
    } else { stat("law", 1); tags.push(["ok", "Закон +1"]); text = "Опись составлена по закону. Вещи погружены в служебную машину."; }
    if (c.hardship > 0 && good.length) { stat("heart", -c.hardship); tags.push(["bad", `Совесть −${c.hardship}`]); text += " Должник смотрел вам вслед из окна."; }
  }
  finishDebt("ИЗЪЯТИЕ", text, cash, tags, out, "sad");
}
function defer(c) {
  const tags = []; let text, out = "m";
  if (S.tainted || c.trap) { text = "Отсрочка выдана по делу, которого нет. Все довольны, кроме закона."; stat("law", -1); tags.push(["bad", "Закон −1"]); }
  else if (c.hardship === 0) { stat("law", -1); out = "bad"; text = "Отсрочка выдана. Через три дня должник блокирует телефон. Вас обвёл вокруг пальца человек в халате."; tags.push(["bad", "Обманули"], ["bad", "Закон −1"]); }
  else { stat("heart", 1); text = "Отсрочка оформлена, взыскатель недоволен, но человек получил передышку."; tags.push(["ok", "Совесть +1"]); }
  finishDebt("ОТСРОЧКА", text, 0, tags, out, "happy");
}
function closeCase(c) {
  const tags = [["bad", "Закон −1"]]; let text, out = "m"; stat("law", -1);
  if (S.tainted || c.trap) { text = "Дело закрыто. Формально без оснований, фактически по справедливости."; }
  else if (c.hardship === 0) { stat("complaints", 1); out = "bad"; tags.push(["bad", "Жалобы +1"]); text = "Закрыть дело без оснований вам не дали: взыскатель добился проверки."; }
  else { stat("heart", 1); tags.push(["ok", "Совесть +1"]); text = "Вы закрыли дело. Формально без оснований, неформально по-человечески. Начальник вздохнул и поставил подпись."; }
  finishDebt("ДЕЛО ЗАКРЫТО", text, 0, tags, out, "happy");
}
function resultScreen() {
  const r = S.result;
  panel(`<h2>${esc(r.title)}</h2>${tagsHtml(r.tags)}<p>${esc(r.text)}</p><p class="who">${r.cash ? "Взыскано: " + esc(fmt(r.cash)) : "Без взыскания."}</p>`);
  setActions([{ label: "Следующий адрес", cls: "primary", fn: next }]);
}

// ----- события -----
function eventScreen(e, st) {
  const dist = S.days[S.day].dist, kind = e.src === "boss" ? "call" : "stair";
  const o = { p: e.look, dist, dog: !!e.dog, ringing: e.src === "boss" && S.phase === "start" };
  const s = scn(kind, "e" + e.id, o); if (S.phase === "evres") s.ringing = false;
  if (S.phase === "evres") {
    panel(`<h2>${esc(e.title)}</h2>${tagsHtml(S.result.tags)}<p>${esc(S.result.text)}</p>`);
    setActions([{ label: "Дальше", cls: "primary", fn: next }]); return;
  }
  panel(`<h2>${esc(e.title)}</h2><p class="who">${esc(e.who)}</p><p>${esc(e.text)}</p>`);
  setActions(e.choices.map((c) => ({ label: c.label, fn: () => {
    const tags = applyFx(c.fx || {}); if (c.epi) S.epi.push(c.epi);
    S.result = { text: c.text, tags }; S.phase = "evres"; s.ringing = false; if (tags.length) sfxFor(tags, 0); run(); } })));
}

// ----- суд -----
function courtScreen(st) {
  const v = VIS[st.ids[S.vis]], n = st.ids.length;
  if (!v) { scn("court", "cend", { p: null }); panel(`<h2>ДЕЖУРСТВО ЗАВЕРШЕНО</h2><p>Смена на входе окончена. Рамка металлодетектора молчит впервые за день.</p>`); setActions([{ label: "К следующему адресу", cls: "primary", fn: next }]); return; }
  const s = scn("court", "v" + v.id, { p: v.look });
  const q = S.q = S.q || {}, visible = v.danger && !v.hide, onBody = v.hide && !v.sealed, broken = st.twist === "broken";
  // найден запрещённый предмет: протокол даёт закон, изъятие без него это нарушение порядка
  const seized = [{ label: "Составить протокол и изъять", cls: "primary", fn: () => cOut(v, "proto") }, { label: "Изъять без протокола", fn: () => cOut(v, "conf") }, { label: "Не пускать в здание", cls: "danger", fn: () => cOut(v, "refuse") }];
  if (S.phase === "start") {
    s.beeping = v.beep && !broken; if (s.beeping && !q.beeped) { q.beeped = true; setTimeout(() => Snd.play("beep"), 200); }
    let html = `<h2>${esc(v.name)}</h2><p>${esc(v.intro)}</p><p class="who">Рамка: ${broken ? "сегодня сломана, ей нельзя верить." : v.beep ? "ПИЩИТ." : "молчит."}</p>`;
    if (hasUp("detector")) html += `<p class="who">Детектор: ${detectorSays(v, S.seed)}</p>`;
    if (S.vis === 0 && st.twist === "trial") html += `<p class="who">Сегодня громкое дело: народу больше обычного.</p>`;
    if (q.purpose) html += `<p class="who">Цель визита?</p><q>${esc(v.say)}</q>`;
    if (q.ask) html += `<p class="who">Есть запрещённые предметы?</p><q>${esc(askAnswer(v))}</q>`;
    panel(html + `<p class="who">Посетитель ${S.vis + 1} из ${n}</p>`);
    const list = [];
    if (!q.purpose) list.push({ label: "Спросить: с какой целью пришли?", fn: () => { q.purpose = true; run(); } });
    if (!q.ask) list.push({ label: "Спросить: есть запрещённое?", fn: () => { q.ask = true; run(); } });
    list.push({ label: "Досмотреть сумку", cls: "primary", fn: () => { S.phase = "bag"; run(); } });
    list.push({ label: "Личный обыск", fn: () => { S.phase = "frisk"; run(); } });
    list.push({ label: "Пропустить без досмотра", fn: () => cOut(v, "allow") });
    list.push({ label: "Не пускать", cls: "danger", fn: () => cOut(v, "blind") });
    setActions(list);
  } else if (S.phase === "bag") {
    s.beeping = false;
    panel(`<h2>СОДЕРЖИМОЕ СУМКИ</h2><p>${v.bag.map(esc).join("<br>")}</p><div class="note">${visible ? esc(v.dangerNote || "Есть предмет, запрещённый к проносу в здание суда.") : v.sealed ? "Коробка запечатана: «НЕ ВСКРЫВАТЬ». Что внутри, неизвестно." : "В сумке ничего запрещённого."}</div>`);
    const more = [];
    if (v.sealed) more.push({ label: "Вскрыть коробку", cls: "primary", fn: () => { S.phase = "box"; run(); } });
    more.push({ label: "Извиниться и пропустить", cls: v.sealed ? "" : "primary", fn: () => cOut(v, "pass") }, { label: "Личный обыск", fn: () => { S.phase = "frisk"; run(); } });
    setActions(visible ? seized : more);
  } else if (S.phase === "box") {
    s.beeping = false;
    panel(`<h2>КОРОБКА ВСКРЫТА</h2><p>${esc(v.boxOpen)}</p>${v.hide ? `<div class="note">Найдено: <b>${esc(v.hide.item)}</b>.</div>` : ""}`);
    setActions(v.hide ? seized : [{ label: "Извиниться и пропустить", cls: "primary", fn: () => cOut(v, "boxok") }]);
  } else if (S.phase === "frisk") {
    s.beeping = false;
    const found = onBody ? `<div class="note">Найдено: <b>${esc(v.hide.item)}</b>. Запрещено к проносу в суд.</div>` : visible ? `<div class="note">${esc(v.dangerNote || "Сверх найденного в сумке ничего нет.")}</div>` : `<div class="note">Карманы, обувь, одежда: ничего запрещённого.${v.sealed ? " Подозрительна только коробка." : ""}</div>`;
    panel(`<h2>ЛИЧНЫЙ ОБЫСК</h2><p>Вы просите вывернуть карманы и снять верхнюю одежду.</p>${found}`);
    const back = [{ label: "Извиниться и пропустить", cls: v.sealed ? "" : "primary", fn: () => cOut(v, "frisk") }];
    if (v.sealed) back.unshift({ label: "Вскрыть коробку", cls: "primary", fn: () => { S.phase = "box"; run(); } });
    setActions(onBody || visible ? seized : back);
  } else if (S.phase === "cres") {
    s.beeping = false; panel(`<h2>${esc(S.result.title)}</h2>${tagsHtml(S.result.tags)}<p>${esc(S.result.text)}</p>`);
    setActions([{ label: "Следующий", cls: "primary", fn: () => { S.vis += 1; S.phase = "start"; S.q = {}; run(); } }]);
  }
}
function askAnswer(v) {
  if (v.ask) return v.ask;
  if (!v.danger) return "Нет, только личные вещи.";
  return v.soft ? "Ну… вязание же можно?" : "Да ничего такого… сумку посмотрите, сами всё увидите.";
}
// пропущенный опасный человек: страдает судья, заседатель, участник процесса или гражданин
function incident(v, lead) {
  S.incidents = (S.incidents || 0) + 1;
  let h = 0; for (const ch of v.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const harm = HARM[(h + (S.seed >>> 0) + S.day) % HARM.length];
  return { fx: { safety: hasUp("partner") ? -1 : -2, law: -1, complaints: 1 }, title: "ИНЦИДЕНТ", text: lead + " " + harm.text + " " + (v.inc || "Охрана смотрит на вас молча.") };
}
function cOut(v, kind) {
  let fx = {}, text = "", title = "РЕЗУЛЬТАТ";
  if (kind === "allow") {
    if (v.danger && !v.soft) { const r = incident(v, "Пропустили без досмотра."); fx = r.fx; title = r.title; text = r.text; }
    else if (v.soft) { fx = { law: -1 }; text = v.softAllow; }
    else if (v.friend) { fx = { boss: 1 }; text = v.allowQuip || v.quip; }
    else { fx = { law: 1 }; text = v.quip; }
  } else if (kind === "proto") {
    S.protocols = (S.protocols || 0) + 1;
    fx = { safety: 1, law: 2 }; if (v.soft) fx.heart = -1; if (v.friend) fx.boss = -1;
    text = (v.confQuip || "Предмет изъят под расписку. Человек проходит без нарушений.") + " Протокол составлен и подписан.";
  } else if (kind === "conf") {
    fx = { safety: 1, law: -1 }; if (v.soft) fx.heart = 1; if (v.friend) fx.boss = 1;
    text = (v.confQuip || "Предмет изъят. Человек проходит без нарушений.") + " Протокола нет: формально вы нарушили порядок.";
  } else if (kind === "boxok") {
    fx = { complaints: 1 }; text = "Коробку вскрыли зря, курьер обижен, но осторожность не лишняя. " + v.quip;
  } else if (kind === "frisk" && v.hide) {
    const r = incident(v, "Карманы были чистыми, а опасное лежало " + v.hide.where + ", которую вы так и не вскрыли."); fx = r.fx; title = r.title; text = r.text;
  } else if (kind === "frisk") {
    fx = { complaints: v.beep ? 0 : (v.serial ? 2 : 1) }; if (v.friend) fx.boss = -1;
    text = v.beep ? "Рамка пищала не зря: металл оказался законным. Человек понимающе кивает. " + v.quip : "Обыск ничего не дал, человек обижен и обещает жалобу. " + v.quip;
  } else if (kind === "refuse") { fx = { safety: 1, complaints: 1 }; text = "Не пустили. Человек обещает жалобу, но в здание не прошёл."; }
  else if (kind === "pass") {
    if (v.hide) { const r = incident(v, v.sealed ? "Коробку «не вскрывать» так и не вскрыли, а внутри было опасное." : "В сумке было чисто, но опасное лежало " + v.hide.where + ", а вы не проверили человека лично."); fx = r.fx; title = r.title; text = r.text; }
    else { fx = { complaints: 1 }; if (v.serial) fx.complaints = 2; if (v.friend) fx.boss = -1; text = "Человек проходит, ворча про досмотр. " + v.quip; }
  } else if (kind === "blind") {
    if (v.danger) { fx = { safety: 1, complaints: 1 }; text = "Не пустили, и, как выяснилось, не зря. Человек уходит, обещая написать куда следует."; }
    else { fx = { complaints: 2, law: -1 }; text = "Вы отказали без причин. Человек возмущён, очередь шумит, жалоба уже пишется."; if (v.friend) fx.boss = -2; }
  }
  const tags = applyFx(fx); S.result = { title, text, tags }; S.phase = "cres"; sfxFor(tags, 0); run();
}

// ----- финал смены -----
function endScreen() {
  scn("desk", "end", {}); const a = S.stats, planAll = S.plans.reduce((x, y) => x + y, 0);
  const cash = Math.min(100, Math.round(a.cash / planAll * 100)), law = Math.max(0, Math.min(100, 50 + a.law * 4)), heart = Math.max(0, Math.min(100, 50 + a.heart * 5)), safe = Math.max(0, Math.min(100, 50 + a.safety * 12));
  let score = Math.round((cash + law + heart + safe) / 4); if (S.over === "fired") score = Math.min(score, 30);
  let end = "avg";
  if (S.over === "fired") end = "fired"; else if (S.bribe >= 2 || a.law <= -7) end = "probe";
  else if (cash >= 80 && law >= 60 && heart >= 55) end = "model"; else if (cash >= 80 && heart < 40) end = "iron";
  else if (heart >= 65 && cash < 60) end = "human"; else if (cash < 35) end = "weak";
  const [title, text] = ENDINGS[end];
  if (!S.reward) {
    S.reward = settleShift(S, score); S.score = score;
    if (score > (settings.best || 0)) { settings.best = score; writeSettings(); }
    Cloud.submitScore(score, S.day, end).catch(() => {}); writeSave();
  }
  const rw = S.reward, rv = S.review || {}, rn = { bonus: "Премия 3 000 ₽", rep: "Выговор", note: "Замечание устное" }[rv.kind] || "";
  const bar = (n, v) => `<div class="bar ${v < 40 ? "low" : ""}"><span>${esc(n)}</span><b>${v}%</b><i><span style="width:${v}%"></span></i></div>`;
  const fates = S.log.map((l) => { const c = CASE[l.id]; return `<li><b>${esc(c.name.split(" ").slice(0, 2).join(" "))}.</b> ${esc(l.out === "m" ? c.fate.m : c.fate.s)}</li>`; }).join("");
  panel(`<h2>${esc(title)}</h2><p>${esc(text)}</p>
    <div class="bars">${bar("План смены: " + fmt(a.cash) + " из " + fmt(planAll), cash)}${bar("Законность", law)}${bar("Совесть", heart)}${bar("Безопасность суда", safe)}</div>
    <div class="note"><b>Итоги смены.</b> Оценка ${score} из 100${rn ? " · " + esc(rn) : ""}<br>Опыт: +${rw.xp} · Деньги: +${esc(fmt(rw.money))}<br>Звание: <b>${esc(RANKS[rw.rank1].n)}</b>${rw.rankUp ? " (повышение!)" : ""}${rw.demoted ? " (понижение за три провала подряд)" : ""}${rw.newDist ? "<br>Открыт новый район: " + esc(DISTRICTS[rw.newDist].name) : ""}</div>
    <p class="who">Жалоб: ${a.complaints} · Протоколов: ${S.protocols || 0} · Инцидентов на входе: ${S.incidents || 0}</p>
    ${fates ? `<div class="note"><b>Что стало с людьми.</b><ul>${fates}</ul></div>` : ""}`);
  Snd.play(end === "model" || end === "avg" || end === "human" ? "good" : "bad");
  setActions([{ label: "Новая смена", cls: "primary", fn: startShift }, { label: "Склад и снаряжение", fn: shop }, { label: "В меню", fn: menu }]);
}

$("#snd").addEventListener("click", () => { const on = !(settings.sound || settings.music); settings.sound = on; settings.music = on; writeSettings(); Music.sync(); $("#snd").textContent = on ? "♪" : "×"; if (!S) menu(); });
$("#snd").textContent = settings.sound || settings.music ? "♪" : "×";
{ const sv = loadSave(); if (sv && sv.career) CAREER = Object.assign(newCareer(), sv.career); }
setInterval(render, 83);
menu();
