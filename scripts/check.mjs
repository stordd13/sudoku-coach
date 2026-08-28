/* Vérifications automatiques : moteur + leçons + exemples.
   Lancer : npm run check */
import {
  PEERS, BOXES, candidatesFromGrid, allCands, conflictSet,
  findHiddenSingleFor, solveGrid, buildPlan, SAMPLES, cellName,
} from "../src/engine.js";
import { LESSONS } from "../src/lessons.js";

let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("  ✓", label);
  else { failures++; console.error("  ✗ ÉCHEC :", label); }
};

/* ---------- 1. Grilles d'exemple : solution unique ---------- */
console.log("Exemples :");
SAMPLES.forEach((s, i) => {
  const g = s.split("").map(Number);
  const { count } = solveGrid(g);
  ok(count === 1, `SAMPLES[${i}] a une solution unique (count=${count})`);
});

/* ---------- 2. Moteur : plan pédagogique sur l'exemple 1 ---------- */
console.log("Moteur (buildPlan sur l'exemple 1) :");
{
  const g = SAMPLES[0].split("").map(Number);
  const { solution } = solveGrid(g);
  let solvable = 0, mismatches = 0, errors = 0;
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    try {
      const p = buildPlan(g, i);
      if (p) {
        solvable++;
        if (p.digit !== solution[i]) { mismatches++; console.error("    désaccord en", cellName(i)); }
      }
    } catch (e) { errors++; console.error("    exception en", cellName(i), e.message); }
  }
  ok(errors === 0, `aucune exception (${errors})`);
  ok(mismatches === 0, `tous les plans concordent avec la solution (${mismatches} désaccord)`);
  ok(solvable > 0, `${solvable} cases immédiatement explicables`);
}

/* ---------- 3. Leçons : cohérence interne ---------- */
console.log("Leçons :");
for (const L of LESSONS) {
  console.log(` [${L.num}] ${L.title}`);
  // 3a. Les valeurs affichées ne se contredisent pas entre elles
  const g = Array(81).fill(0);
  for (const [k, v] of Object.entries(L.given)) g[Number(k)] = v;
  ok(conflictSet(g).size === 0, "valeurs affichées sans conflit");
  // 3b. Aucun candidat affiché ne contredit une valeur visible
  let candClash = 0;
  for (const [k, arr] of Object.entries(L.notes)) {
    const i = Number(k);
    for (const d of arr) {
      for (const p of PEERS[i]) if (g[p] === d) candClash++;
      if (g[i] !== 0) candClash++;
    }
  }
  ok(candClash === 0, "candidats affichés compatibles avec les valeurs");
  // 3c. La cible et la réponse sont cohérentes
  if (L.id === "naked-single") {
    const cs = candidatesFromGrid(g, L.target);
    ok(cs.length === 1 && cs[0] === L.answer, `candidat unique = ${L.answer} (trouvé {${cs.join(",")}})`);
  } else if (L.id === "hidden-single") {
    const cands = allCands(g);
    const hs = findHiddenSingleFor(g, cands, L.target);
    ok(!!hs && hs.digit === L.answer && hs.unit.type === "box",
      `single caché ${L.answer} dans le bloc en ${cellName(L.target)}`);
  } else if (L.id === "hidden-pair") {
    // le 1 n'apparaît que dans target et dans la case nettoyée (74)
    const with1 = BOXES[6].filter((i) => (L.notes[i] || []).includes(1));
    ok(with1.length === 2 && with1.includes(L.target) && with1.includes(74),
      "le 1 n'apparaît que dans L7C1 et L9C3 avant nettoyage");
    ok((L.removals[74] || []).includes(1), "le nettoyage retire bien le 1 de L9C3");
    // les deux chiffres du duo n'apparaissent que dans les cases focus
    for (const d of [2, 9]) {
      const cellsWithD = BOXES[6].filter((i) => (L.notes[i] || []).includes(d));
      ok(cellsWithD.length === 2 && L.focus.every((f) => cellsWithD.includes(f)),
        `le ${d} n'apparaît que dans les deux cases du duo`);
    }
  } else {
    // paires nue / pointante / claiming : notes[target] − removals[target] = [answer]
    const before = L.notes[L.target] || [];
    const rem = L.removals[L.target] || [];
    const after = before.filter((d) => !rem.includes(d));
    ok(after.length === 1 && after[0] === L.answer,
      `après élimination, ${cellName(L.target)} = {${after.join(",")}} (attendu ${L.answer})`);
  }
  // 3d. Les removals ne retirent que des candidats réellement affichés
  let remClash = 0;
  for (const [k, arr] of Object.entries(L.removals)) {
    const shown = L.notes[Number(k)] || [];
    for (const d of arr) if (!shown.includes(d)) remClash++;
  }
  ok(remClash === 0, "les éliminations portent sur des candidats affichés");
}

console.log(failures === 0 ? "\nTOUT EST OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
