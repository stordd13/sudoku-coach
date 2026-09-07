/* Banc de grilles dures — « mesuré, pas promis ».
   Lancer : npm run bench            (≈ 2-4 min)
            BENCH_QUICK=1 npm run bench   (tour rapide : grilles nommées,
                                           10 top95, 10 générées)

   Pour chaque grille : le gradeur (solveHumanly → résolue ? tier max ? mur ?)
   et le VRAI chemin du joueur (nextStep en boucle : une recherche globale par
   appui 👣, comme dans l'app → terminée ? bloquée à combien de cases ?), plus
   le temps de chaque appui 👣 (p50/p95) et un échantillon 🎯 (buildPlan sur
   une case, tous les 10 coups).

   Assertions (échec = code 1) : aucune exception ; aucune élimination ne
   contredit la solution unique ; aucun chiffre posé par le chemin joueur ne
   contredit la solution. Les pourcentages sont des ℹ à cibles indicatives. */
import { readFileSync } from "node:fs";
import {
  solveGrid, solveHumanlySteps, buildPlan, nextStep, generatePuzzle, makeRng, isComplete, TECH_TIER,
} from "../src/engine.js";

const QUICK = !!process.env.BENCH_QUICK;
const T0 = Date.now();
let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("  ✓", label);
  else { failures++; console.error("  ✗ ÉCHEC :", label); }
};
const pct = (n, d) => (d ? `${Math.round((100 * n) / d)} %` : "—");
const quantile = (arr, q) => {
  if (!arr.length) return 0;
  const s = arr.slice().sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const parse = (s) => s.split("").map((ch) => (ch === "." ? 0 : Number(ch)));

/* ---------- Fixtures ---------- */
const FIXTURES = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
const collectionOf = (f) => f.id.replace(/-\d+$/, "").replace(/^hardest$|^ai-escargot$/, "hardest");
let entries = FIXTURES.map((f) => ({ ...f, collection: collectionOf(f) }));
if (QUICK) {
  let top = 0;
  entries = entries.filter((f) => f.collection !== "top95" || top++ < 10);
}
const N_GEN = QUICK ? 10 : 50;
console.log(`Banc de grilles dures${QUICK ? " (rapide)" : ""} : ${entries.length} fixtures + ${N_GEN} générées niveau 5`);
{
  const tg = Date.now();
  for (let k = 0; k < N_GEN; k++) {
    const p = generatePuzzle(5, makeRng(50000 + k), { timeBoxMs: Infinity, maxAttempts: 60 });
    entries.push({
      id: `gen5-${String(k).padStart(2, "0")}`, name: `générée niveau 5 (seed ${50000 + k}, grade ${p.level})`,
      grid: p.grid, se: null, source: "generatePuzzle(5, makeRng(seed))", collection: "gen5",
    });
  }
  console.log(`  ℹ ${N_GEN} grilles générées en ${Date.now() - tg} ms`);
}

/* ---------- Mesure d'une grille ---------- */
function measure(f) {
  const g = parse(f.grid);
  const { count, solution } = solveGrid(g);
  if (count !== 1) return { ...f, error: `solution non unique (count=${count})` };
  // 1. Gradeur instrumenté : chaque élimination est confrontée à la solution.
  let badElim = 0;
  const r = solveHumanlySteps(g, (step) => {
    if (step.type === "elim") {
      for (const rm of step.e.removals) if (rm.digits.includes(solution[rm.cell])) badElim++;
    }
    return false;
  }, 5);
  // 2. Chemin joueur : un appui 👣 (nextStep) par coup ; 🎯 échantillonné.
  const w = g.slice();
  const hintMs = [], aimMs = [], tier5Ms = [];
  const bKinds = { aic: 0, alsXz: 0 };
  let mismatches = 0, moves = 0;
  for (let guard = 0; guard < 81; guard++) {
    if (moves % 10 === 0) {
      const cell = w.findIndex((v) => v === 0);
      if (cell >= 0) { const a0 = performance.now(); buildPlan(w, cell); aimMs.push(performance.now() - a0); }
    }
    const t0 = performance.now();
    const p = nextStep(w);
    const ms = performance.now() - t0;
    hintMs.push(ms);
    if (!p) break;
    // Appuis de palier 5 : le plan mobilise une technique de tier 5 (cible v2.4 : p95 < 800 ms).
    if (p.chainKinds.some((k) => TECH_TIER[k] === 5)) tier5Ms.push(ms);
    for (const k of p.chainKinds) if (k in bKinds) bKinds[k]++;
    if (p.digit !== solution[p.target]) mismatches++;
    w[p.target] = p.digit;
    moves++;
  }
  return {
    ...f, empties: g.filter((v) => !v).length,
    solved: r.solved, maxTier: r.maxTier, counts: r.counts, badElim,
    done: isComplete(w), left: w.filter((v) => !v).length, moves, mismatches, hintMs, aimMs, tier5Ms, bKinds,
  };
}

const rows = [];
for (const f of entries) {
  try {
    rows.push(measure(f));
  } catch (err) {
    rows.push({ ...f, error: `exception : ${err && err.stack ? err.stack.split("\n").slice(0, 3).join(" | ") : err}` });
  }
}

/* ---------- Tableau par grille ---------- */
const TIER_NAME = { 0: "—", 1: "singles", 2: "alignements", 3: "paires", 4: "poissons/ailes", 5: "coloriage/AIC/ALS" };
console.log("\n| grille | SE | tier max | mur | joueur | restantes | coups | 👣 p95 |");
console.log("|---|---|---|---|---|---|---|---|");
for (const r of rows) {
  if (r.error) { console.log(`| ${r.id} | ${r.se ?? "—"} | ERREUR | | | | | ${r.error} |`); continue; }
  console.log(`| ${r.id} | ${r.se ?? "—"} | ${r.maxTier} (${TIER_NAME[r.maxTier]}) | ${r.solved ? "non" : "OUI"} | ${r.done ? "terminée" : "bloquée"} | ${r.left} | ${r.moves} | ${quantile(r.hintMs, 0.95).toFixed(1)} ms |`);
}

/* ---------- Agrégats ---------- */
const valid = rows.filter((r) => !r.error);
const aggregate = (label, list) => {
  if (!list.length) return;
  const noWall = list.filter((r) => r.solved).length;
  const done = list.filter((r) => r.done).length;
  const byTier = {};
  for (const r of list) {
    const k = r.solved ? `tier ${r.maxTier}` : "mur";
    byTier[k] = (byTier[k] || 0) + 1;
  }
  const dist = Object.entries(byTier).sort().map(([k, n]) => `${k} ${pct(n, list.length)}`).join(", ");
  console.log(`  ℹ ${label} (${list.length}) : sans mur ${pct(noWall, list.length)} · joueur terminé ${pct(done, list.length)} · ${dist}`);
};
console.log("\nAgrégats :");
aggregate("toutes", valid);
for (const c of [...new Set(valid.map((r) => r.collection))]) aggregate(`collection ${c}`, valid.filter((r) => r.collection === c));
const rated = valid.filter((r) => typeof r.se === "number");
if (rated.length) {
  aggregate("SE ≤ 7 (cible palier A : ≥ 80 % sans mur)", rated.filter((r) => r.se <= 7));
  aggregate("SE 7–8,5", rated.filter((r) => r.se > 7 && r.se <= 8.5));
  aggregate("SE > 8,5", rated.filter((r) => r.se > 8.5));
} else {
  console.log("  ℹ aucune fixture ne porte de note SE : la cible « ≥ 80 % des SE ≤ 7 » n'est pas évaluable, lire les collections.");
}
aggregate("non notées (hors générées)", valid.filter((r) => r.se === null && r.collection !== "gen5"));
const allHint = valid.flatMap((r) => r.hintMs);
const allAim = valid.flatMap((r) => r.aimMs);
const maxOf = (arr) => arr.reduce((m, x) => (x > m ? x : m), 0);
console.log(`  ℹ 👣 nextStep sur ${allHint.length} appuis : p50 ${quantile(allHint, 0.5).toFixed(1)} ms · p95 ${quantile(allHint, 0.95).toFixed(1)} ms · max ${maxOf(allHint).toFixed(1)} ms`);
console.log(`  ℹ 🎯 buildPlan (échantillon, ${allAim.length} appels) : p50 ${quantile(allAim, 0.5).toFixed(1)} ms · p95 ${quantile(allAim, 0.95).toFixed(1)} ms · max ${maxOf(allAim).toFixed(1)} ms`);
{
  const t5 = valid.flatMap((r) => r.tier5Ms);
  const aic = valid.reduce((n, r) => n + r.bKinds.aic, 0), als = valid.reduce((n, r) => n + r.bKinds.alsXz, 0);
  console.log(`  ℹ 👣 sur les appuis de palier 5 (${t5.length}) : p50 ${quantile(t5, 0.5).toFixed(1)} ms · p95 ${quantile(t5, 0.95).toFixed(1)} ms · max ${maxOf(t5).toFixed(1)} ms (cible indicative p95 < 800 ms)`);
  console.log(`  ℹ palier B mobilisé par le chemin joueur : AIC ${aic} fois, ALS-XZ ${als} fois`);
}
const walls = valid.filter((r) => !r.solved);
if (walls.length) {
  const at = {};
  for (const r of walls) at[r.maxTier] = (at[r.maxTier] || 0) + 1;
  console.log(`  ℹ murs par tier atteint : ${Object.entries(at).map(([t, n]) => `tier ${t} → ${n}`).join(", ")}`);
}

/* ---------- Assertions ---------- */
console.log("\nAssertions :");
ok(rows.every((r) => !r.error), `aucune exception ni grille non unique${rows.some((r) => r.error) ? ` — ${rows.filter((r) => r.error).map((r) => `${r.id}: ${r.error}`).join(" ; ")}` : ""}`);
ok(valid.every((r) => r.badElim === 0), `aucune élimination ne contredit la solution (${valid.reduce((n, r) => n + r.badElim, 0)} en défaut)`);
ok(valid.every((r) => r.mismatches === 0), `aucun chiffre du chemin joueur ne contredit la solution (${valid.reduce((n, r) => n + r.mismatches, 0) } en défaut)`);
// Gradeur et 👣 suivent la même procédure (B0 : mêmes éliminations, carte
// recalculée à chaque placement) : gradée résoluble ⟺ terminée, par
// construction. Toute divergence est un bug à traiter, pas une statistique.
{
  const falseWall = valid.filter((r) => r.solved && !r.done).map((r) => r.id);
  const extra = valid.filter((r) => !r.solved && r.done).map((r) => r.id);
  ok(falseWall.length === 0, `aucun faux mur : gradée résoluble ⇒ terminée par 👣${falseWall.length ? ` — ${falseWall.join(", ")}` : ""}`);
  ok(extra.length === 0, `aucune surprise : terminée par 👣 ⇒ gradée résoluble${extra.length ? ` — ${extra.join(", ")}` : ""}`);
}

console.log(`\n  ℹ temps total : ${((Date.now() - T0) / 1000).toFixed(1)} s`);
console.log(failures === 0 ? "\nBANC OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
