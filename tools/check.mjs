// Сборка, node --check, проверка данных и автоигра на N случайных прохождений в vm с заглушками DOM.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
execFileSync(process.execPath, [path.join(root, "tools", "build.mjs")], { stdio: "inherit" });
const html = fs.readFileSync(path.join(root, "pristav.html"), "utf8");
const code = html.match(/<script>([\s\S]*)<\/script>/)[1];
const tmp = path.join(root, "tools", "_game.js");
fs.writeFileSync(tmp, code);
execFileSync(process.execPath, ["--check", tmp]);
fs.unlinkSync(tmp);
console.log("node --check: ok");

const N = Number(process.argv[2] || 200);
function stubEl() {
  const el = new Proxy(function () {}, {
    get(t, k) {
      if (k === "classList") return { toggle() {}, add() {}, remove() {}, contains: () => false };
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {}, set: () => true });
      if (k === "children" || k === "childNodes") return [];
      if (k in t.__props) return t.__props[k];
      return () => stubEl();
    },
    set(t, k, v) { t.__props[k] = v; return true; },
    apply() { return stubEl(); }
  });
  el.__props = {};
  return el;
}
const handler = { get(t, k) { return k === "__props" ? t.__props : undefined; } };
function mkEl() {
  const props = {};
  return new Proxy({ __props: props }, {
    get(t, k) {
      if (k in props) return props[k];
      if (k === "classList") return { toggle() {}, add() {}, remove() {}, contains: () => false };
      if (k === "getContext") return () => new Proxy({}, { get: () => () => {}, set: () => true });
      if (k === "target") return mkEl();
      return () => mkEl();
    },
    set(t, k, v) { props[k] = v; return true; }
  });
}
const store = new Map();
const ctxObj = {
  document: { querySelector: () => mkEl(), createElement: () => mkEl(), addEventListener() {} },
  localStorage: { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: (k) => store.delete(k) },
  setInterval() {}, setTimeout() {}, console, Math, Date, JSON, Object, Array, Map, Set, Number, String, parseInt, Promise
};
ctxObj.window = ctxObj;
const ctx = vm.createContext(ctxObj);
vm.runInContext(code, ctx, { filename: "game.js" });
vm.runInContext("var __acts = []; setActions = function (l) { __acts = l; };", ctx);

// проверка данных
const data = vm.runInContext(`({ CASES, VISITORS, EVENTS, DAYS, ICONS, legalMax, ENDINGS })`, ctx);
const errs = [];
const ids = new Set();
for (const c of data.CASES) {
  if (ids.has(c.id)) errs.push("дубликат " + c.id); ids.add(c.id);
  if (!c.fate || !c.fate.s || !c.fate.m) errs.push(c.id + ": нет fate");
  if (c.items.length < 4) errs.push(c.id + ": мало вещей");
  if (!c.items.some((i) => i.exempt || i.foreign)) errs.push(c.id + ": нет защищённой вещи");
  if (!c.items.some((i) => !i.exempt && !i.foreign) && !c.trap) errs.push(c.id + ": нет изымаемой вещи");
  for (const i of c.items) if (!data.ICONS[i.k]) errs.push(c.id + ": нет значка " + i.k);
  if (c.trap === "name" && !c.passport) errs.push(c.id + ": нет паспорта");
  if (c.trap === "paid" && !c.receipt) errs.push(c.id + ": нет чека");
}
const used = data.DAYS.flatMap((d) => d.debtors);
if (used.length !== data.CASES.length || new Set(used).size !== used.length) errs.push("должники по дням не совпадают с CASES");
for (const v of data.VISITORS) { if (!v.danger && !v.quip) errs.push(v.id + ": нет quip"); if (v.danger && !v.confQuip && !v.softAllow) errs.push(v.id + ": нет confQuip"); }
for (const e of data.EVENTS) if (e.choices.length < 3) errs.push(e.id + ": мало выборов");
if (errs.length) { console.error("ДАННЫЕ:\n" + errs.join("\n")); process.exit(1); }
console.log("данные: ok (должников " + data.CASES.length + ", посетителей " + data.VISITORS.length + ", событий " + data.EVENTS.length + ")");

// автоигра
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const endings = {}, plans = [];
for (let g = 0; g < N; g++) {
  vm.runInContext("menu(); S = fresh(); enteredKey = ''; run();", ctx);
  let guard = 0, seen = { debt: 0, ev: 0, court: 0 };
  while (guard++ < 600) {
    const over = vm.runInContext("S && S.over", ctx);
    const acts = vm.runInContext("__acts", ctx);
    if (over && acts.some((a) => a.label.includes("Сыграть"))) break;
    if (vm.runInContext("S.phase", ctx) === "inspect" && rnd() < 0.9) {
      const n = vm.runInContext("CASE[S.sched[S.day][S.step].id].items.length", ctx);
      const picks = []; for (let i = 0; i < n; i++) if (rnd() < 0.4) picks.push(i);
      vm.runInContext(`S.picks = ${JSON.stringify(picks)}; refresh(CASE[S.sched[S.day][S.step].id]);`, ctx);
    }
    const usable = vm.runInContext("__acts", ctx).filter((a) => !a.disabled);
    if (!usable.length) { console.error("нет действий, игра " + g + ", фаза " + vm.runInContext("S.phase", ctx)); process.exit(1); }
    usable[Math.floor(rnd() * usable.length)].fn();
  }
  if (guard >= 600) { console.error("зацикливание в игре " + g); process.exit(1); }
  const day = vm.runInContext("S.day", ctx), cnt = vm.runInContext("S.log.length", ctx);
  const e = vm.runInContext("S.over", ctx) + ":" + day; endings[e] = (endings[e] || 0) + 1;
  if (g === 0) plans.push(...vm.runInContext("S.plans", ctx));
}
console.log("планы по дням:", plans.join(", "));
console.log("итоги", N, "игр:", JSON.stringify(endings));
console.log("автоигра: ok");
