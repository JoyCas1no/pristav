// ---------- карьера: звания, опыт, деньги, снаряжение ----------
const RANKS = [
  { n: "Стажёр", xp: 0 }, { n: "Младший пристав", xp: 120 }, { n: "Пристав", xp: 320 }, { n: "Старший пристав", xp: 620 },
  { n: "Ведущий пристав", xp: 1000 }, { n: "Начальник участка", xp: 1500 }, { n: "Заместитель начальника отдела", xp: 2200 }, { n: "Начальник отдела", xp: 3000 }
];
const RANK_DISTS = ["old", "shore", "zone", "dacha"];
const UPGRADES = [
  { id: "handbook", n: "Справочник пристава", cost: 2000, d: "У должника подсказывает, сколько вещей защищено законом, и намекает на подвох в бумагах." },
  { id: "detector", n: "Ручной детектор", cost: 2500, d: "На входе в суд мигает на подозрительных посетителей. Не всегда точно, как и любой прибор." },
  { id: "partner", n: "Напарник-стажёр", cost: 4500, d: "Если на входе всё же случится инцидент, пострадавших меньше: Безопасность падает на 1 меньше." },
  { id: "car", n: "Служебная машина", cost: 6000, d: "Премия за каждую смену растёт на 1000 ₽: на такси вы больше не тратитесь." }
];
function newCareer() { return { xp: 0, money: 0, shifts: 0, up: {}, seen: [], streak: 0, protocols: 0, incidents: 0 }; }
let CAREER = newCareer();
function rankOf(xp) { let r = 0; for (let k = 0; k < RANKS.length; k++) if (xp >= RANKS[k].xp) r = k; return r; }
const hasUp = (id) => !!(CAREER.up && CAREER.up[id]);
function hashStr(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
// детектор: опасных ловит почти всегда, у честных иногда ложно мигает
function detectorSays(v, seed) {
  const h = (hashStr(v.id) + (seed >>> 0)) % 10;
  const alarm = v.danger ? h < 8 : h < 1;
  return alarm ? "мигает жёлтым: что-то есть." : "молчит.";
}
// итоги смены: опыт, деньги, повышение или понижение. Вызывается один раз за смену.
function settleShift(S, score) {
  const rank0 = rankOf(CAREER.xp), rv = S.review || {}, fired = S.over === "fired";
  const bonus = rv.kind === "bonus", rep = rv.kind === "rep", inc = S.incidents || 0;
  const xp = fired ? 0 : Math.max(0, Math.max(5, score) + (bonus ? 20 : 0) - (rep ? 15 : 0) - 10 * inc);
  const money = fired ? 0 : 500 + score * 15 + (bonus ? 3000 : 0) + (hasUp("car") ? 1000 : 0);
  CAREER.xp += xp; CAREER.money += money; CAREER.shifts += 1; CAREER.protocols += S.protocols || 0; CAREER.incidents += inc;
  CAREER.streak = (fired || rep) ? CAREER.streak + 1 : 0;
  let demoted = false;
  if (CAREER.streak >= 3) { CAREER.streak = 0; if (rank0 > 0) { CAREER.xp = RANKS[rank0].xp - 1; demoted = true; } }
  (S.days[0].debtors || []).forEach((id) => CAREER.seen.push(id)); CAREER.seen = CAREER.seen.slice(-18);
  const rank1 = rankOf(CAREER.xp);
  return { xp, money, rank0, rank1, rankUp: rank1 > rank0, demoted, newDist: rank1 > rank0 && rank1 < RANK_DISTS.length ? RANK_DISTS[rank1] : null };
}
