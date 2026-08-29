/* Vérifications automatiques : moteur + leçons + exemples.
   Lancer : npm run check */
import {
  PEERS, BOXES, candidatesFromGrid, allCands, conflictSet,
  findHiddenSingleFor, solveGrid, buildPlan, SAMPLES, cellName, rowOf, colOf,
  findXWingE, findSwordfishE, findSkyscraperE, findXYWingE, findRemotePairE,
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

/* ---------- 2b. Élagage de la chaîne : régression L3C7 ---------- */
console.log("Élagage de la chaîne :");
{
  const g = "000000381610083450483500006001050943054030627030402815100800534090300168348005000".split("").map(Number);
  const p = buildPlan(g, 24); // L3C7
  ok(p && p.digit === 2, "repro L3C7 : conclusion = 2");
  ok(p.chain.length === 2, `repro L3C7 : chaîne élaguée à 2 étapes (${p.chain.length})`);
  ok(p.chain.every((s) => s.text.includes("**2**")), "repro L3C7 : toutes les étapes portent sur le 2");
}

/* ---------- 2c. Difficulté : « Étape suivante » choisit la plus simple ---------- */
console.log("Difficulté des plans :");
{
  const g = SAMPLES[0].split("").map(Number);
  const plans = [];
  for (let i = 0; i < 81; i++) {
    if (g[i] !== 0) continue;
    const p = buildPlan(g, i);
    if (p) plans.push(p);
  }
  ok(plans.every((p) => Number.isFinite(p.difficulty)), "chaque plan porte une difficulté");
  const min = Math.min(...plans.map((p) => p.difficulty));
  ok(plans.every((p) => min <= p.difficulty), `la difficulté minimale (${min}) est ≤ à toutes les autres`);
  ok(plans.some((p) => p.difficulty <= 2), "au moins un plan de difficulté 1 ou 2 en début de partie");
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
  } else if (L.id === "x-wing" || L.id === "swordfish") {
    const before = L.notes[L.target] || [], rem = L.removals[L.target] || [];
    const after = before.filter((d) => !rem.includes(d));
    ok(after.length === 1 && after[0] === L.answer,
      `après poisson, ${cellName(L.target)} = {${after.join(",")}} (attendu ${L.answer})`);
    const size = L.id === "x-wing" ? 2 : 3;
    const inter = L.focus.map((f) => new Set(L.notes[f] || []))
      .reduce((acc, s) => new Set([...acc].filter((x) => s.has(x))));
    ok(inter.size === 1, "les cases focus partagent un seul chiffre (le poisson)");
    const rows = new Set(L.focus.map(rowOf)), cols = new Set(L.focus.map(colOf));
    ok(Math.min(rows.size, cols.size) === size, `géométrie ${size}×${size} du poisson`);
  } else if (L.id === "skyscraper") {
    const before = L.notes[L.target] || [], rem = L.removals[L.target] || [];
    const after = before.filter((d) => !rem.includes(d));
    ok(after.length === 1 && after[0] === L.answer,
      `après Skyscraper, ${cellName(L.target)} = {${after.join(",")}} (attendu ${L.answer})`);
    const inter = L.focus.map((f) => new Set(L.notes[f] || []))
      .reduce((acc, s) => new Set([...acc].filter((x) => s.has(x))));
    ok(inter.size === 1 && [...inter][0] === rem[0],
      "les 4 cases partagent le chiffre éliminé");
  } else if (L.id === "xy-wing") {
    const [pivot, p1, p2] = L.focus;
    ok((L.notes[pivot] || []).length === 2, "le pivot n'a que deux candidats");
    const s1 = new Set(L.notes[p1] || []), s2 = new Set(L.notes[p2] || []);
    const c = [...s1].filter((x) => s2.has(x) && !(L.notes[pivot] || []).includes(x));
    ok(c.length === 1, "les pinces partagent un seul chiffre absent du pivot");
    const before = L.notes[L.target] || [], rem = L.removals[L.target] || [];
    const after = before.filter((d) => !rem.includes(d));
    ok(after.length === 1 && after[0] === L.answer && rem[0] === c[0],
      `après XY-Wing, ${cellName(L.target)} = ${L.answer} (retrait du ${c[0]})`);
  } else if (L.id === "remote-pairs") {
    const key = (i) => (L.notes[i] || []).slice().sort((a, b) => a - b).join(",");
    ok(L.focus.length >= 4 && L.focus.every((f) => (L.notes[f] || []).length === 2 && key(f) === key(L.focus[0])),
      "au moins 4 cases partagent la même paire");
    const pair = L.notes[L.focus[0]] || [];
    const before = L.notes[L.target] || [], rem = L.removals[L.target] || [];
    const after = before.filter((d) => !rem.includes(d));
    ok(after.length === 1 && after[0] === L.answer && rem.every((d) => pair.includes(d)),
      `après Remote Pairs, ${cellName(L.target)} = ${L.answer}`);
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

/* ---------- 4. Techniques intermédiaires : détection sur motifs isolés ---------- */
console.log("Techniques intermédiaires :");
{
  const S = (...d) => new Set(d);
  const empty = () => Array.from({ length: 81 }, () => new Set());
  const idx = (r, c) => r * 9 + c;
  const hit = (e, cell, d) => !!e && e.removals.some((x) => x.cell === cell && x.digits.includes(d));

  // X-Wing : le 4 est confiné aux colonnes 2 et 6 sur les lignes 1 et 5.
  {
    const g = empty();
    [[0, 1], [0, 5], [4, 1], [4, 5]].forEach(([r, c]) => (g[idx(r, c)] = S(4)));
    g[idx(2, 1)] = S(4, 7);
    const e = findXWingE(g, null);
    ok(e && e.kind === "xWing" && hit(e, idx(2, 1), 4), "X-Wing retire le 4 en L3C2");
  }
  // Swordfish : le 3 sur 3 lignes, confiné à 3 colonnes.
  {
    const g = empty();
    [[0, 2], [0, 4], [4, 4], [4, 6], [8, 2], [8, 6]].forEach(([r, c]) => (g[idx(r, c)] = S(3)));
    g[idx(2, 2)] = S(3, 9);
    const e = findSwordfishE(g, null);
    ok(e && e.kind === "swordfish" && hit(e, idx(2, 2), 3), "Swordfish retire le 3 en L3C3");
  }
  // Skyscraper : deux liens forts du 5 partageant la colonne 1.
  {
    const g = empty();
    g[idx(0, 0)] = S(5); g[idx(0, 4)] = S(5); g[idx(3, 0)] = S(5); g[idx(3, 5)] = S(5);
    g[idx(1, 5)] = S(5, 8);
    const e = findSkyscraperE(g, null);
    ok(e && e.kind === "skyscraper" && hit(e, idx(1, 5), 5), "Skyscraper retire le 5 en L2C6");
  }
  // XY-Wing : pivot {1,2}, pinces {1,3} et {2,3}.
  {
    const g = empty();
    g[idx(4, 4)] = S(1, 2); g[idx(4, 0)] = S(1, 3); g[idx(0, 4)] = S(2, 3); g[idx(0, 0)] = S(3, 7);
    const e = findXYWingE(g, null);
    ok(e && e.kind === "xyWing" && hit(e, idx(0, 0), 3), "XY-Wing retire le 3 en L1C1");
  }
  // Remote Pairs : chaîne {1,2} de 4 maillons.
  {
    const g = empty();
    g[idx(0, 0)] = S(1, 2); g[idx(0, 4)] = S(1, 2); g[idx(4, 4)] = S(1, 2); g[idx(4, 8)] = S(1, 2);
    g[idx(0, 8)] = S(2, 5);
    const e = findRemotePairE(g, null);
    ok(e && e.kind === "remotePair" && hit(e, idx(0, 8), 2), "Remote Pairs retire le 2 en L1C9");
  }
}

console.log(failures === 0 ? "\nTOUT EST OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
