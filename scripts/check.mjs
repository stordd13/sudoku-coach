/* Vérifications automatiques : moteur + leçons + exemples.
   Lancer : npm run check */
import {
  PEERS, BOXES, COLS, candidatesFromGrid, allCands, conflictSet,
  findHiddenSingleFor, solveGrid, buildPlan, SAMPLES, cellName, rowOf, colOf,
  findXWingE, findSwordfishE, findSkyscraperE, findXYWingE, findRemotePairE,
  findXYZWingE, findWWingE, findKiteE, findEmptyRectangleE,
  findColoringE, findSueDeCoqE,
  snyderNotes,
  makeRng, generateFullGrid, solveHumanly, generatePuzzle, isComplete,
  findTechniqueExercise, ELIM_FINDER_BY_KIND, completedUnits,
  randomTransform, transformPosition, buildConstructiveExercise,
} from "../src/engine.js";
import { LESSONS } from "../src/lessons.js";
import { getExercise, KIND_BY_LESSON } from "../src/exercises.js";

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

/* ---------- 2b. Preuves par paliers : le plus SIMPLE avant le plus COURT ---------- */
console.log("Preuves par paliers :");
{
  const g = "000000381610083450483500006001050943054030627030402815100800534090300168348005000".split("").map(Number);
  const p = buildPlan(g, 24); // L3C7
  ok(p && p.digit === 2, "repro L3C7 : conclusion = 2");
  ok(p.chain.length === 2 && p.chain.every((s) => s.title === "Paire pointante"),
    "repro L3C7 : preuve par 2 paires pointantes (techniques simples d'abord)");
  ok(p.chain.every((s) => s.text.includes("**2**")), "repro L3C7 : toutes les étapes portent sur le 2");

  // Palier minimal, pas d'escalade : tier 3 suffit → pas de technique tier 4.
  const g0 = SAMPLES[0].split("").map(Number);
  const p30 = buildPlan(g0, 30); // L4C4
  ok(p30 && p30.digit === 7 && p30.chain.length === 1 && p30.chain[0].title === "Duo caché",
    "L4C4 : preuve tier 3 (duo caché), pas d'escalade");

  // Et le budget MAX_CHAIN sert la simplicité : avant lui, la recherche palier 3
  // cassait au 4e maillon et escaladait au 2-String Kite (palier 4) ; avec lui,
  // L2C9 se prouve au palier 3 (chaîne plus longue, techniques plus simples).
  // Le palier 4 « réellement nécessaire » est couvert par la fixture de 5b.
  const p17 = buildPlan(g, 17); // L2C9
  ok(p17 && p17.digit === 9
    && p17.chain.every((s) => s.title === "Paire pointante" || s.title === "Paire nue"),
    "repro L2C9 : preuve palier 3 (pointantes + paire nue) grâce au budget MAX_CHAIN");
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

/* ---------- 2d. Notation Snyder ---------- */
console.log("Notation Snyder :");
{
  const g = SAMPLES[0].split("").map(Number);
  const notes = snyderNotes(g);
  let noted = 0, badCount = 0, badCand = 0, badPlaced = 0;
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const spots = BOXES[b].filter((i) => notes[i].includes(d));
      if (!spots.length) continue;
      noted++;
      if (spots.length !== 2) badCount++;
      if (spots.some((i) => g[i] !== 0 || !candidatesFromGrid(g, i).includes(d))) badCand++;
      if (BOXES[b].some((i) => g[i] === d)) badPlaced++;
    }
  }
  ok(noted > 0, `des chiffres sont notés (${noted} couples bloc/chiffre)`);
  ok(badCount === 0, "chaque chiffre noté apparaît exactement 2 fois dans son bloc");
  ok(badCand === 0, "chaque occurrence est un candidat valide d'une case vide");
  ok(badPlaced === 0, "aucun chiffre noté n'est déjà posé dans le bloc");
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
  } else if (L.id === "coloring") {
    // Le target garde {3, 5} : la conclusion vient d'un single caché en colonne 3.
    for (const c of [11, 69, 18])
      ok((L.removals[c] || []).includes(5), `le nettoyage retire le 5 de ${cellName(c)} (couleur ➊)`);
    const left = COLS[2].filter((i) => {
      const shown = (L.notes[i] || []).filter((d) => !(L.removals[i] || []).includes(d));
      return shown.includes(5);
    });
    ok(left.length === 1 && left[0] === L.target,
      "après coloriage, le 5 n'a plus qu'une place en colonne 3 → L8C3 = 5");
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

/* ---------- 4. Techniques intermédiaires et expertes : détection sur motifs isolés ---------- */
console.log("Techniques intermédiaires et expertes :");
{
  const S = (...d) => new Set(d);
  const empty = () => Array.from({ length: 81 }, () => new Set());
  const idx = (r, c) => r * 9 + c;
  const hit = (e, cell, d) => !!e && e.removals.some((x) => x.cell === cell && x.digits.includes(d));
  const lessonById = (id) => LESSONS.find((l) => l.id === id);
  // Cands synthétiques depuis les notes d'une leçon → appel DIRECT du finder
  // (via findElim, un motif plus simple pourrait légitimement être détecté d'abord).
  const fromNotes = (notes) => {
    const g = empty();
    for (const [k, arr] of Object.entries(notes)) g[Number(k)] = new Set(arr);
    return g;
  };

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
  // Techniques expertes : chaque finder retrouve l'élimination de sa leçon.
  {
    const e = findXYZWingE(fromNotes(lessonById("xyz-wing").notes), null);
    ok(e && e.kind === "xyzWing" && hit(e, idx(4, 4), 9), "XYZ-Wing retire le 9 en L5C5");
  }
  {
    const e = findWWingE(fromNotes(lessonById("w-wing").notes), null);
    ok(e && e.kind === "wWing" && hit(e, idx(5, 1), 4), "W-Wing retire le 4 en L6C2");
  }
  {
    const e = findKiteE(fromNotes(lessonById("kite").notes), null);
    ok(e && e.kind === "kite" && hit(e, idx(7, 4), 3), "2-String Kite retire le 3 en L8C5");
  }
  {
    const e = findEmptyRectangleE(fromNotes(lessonById("empty-rectangle").notes), null);
    ok(e && e.kind === "emptyRectangle" && hit(e, idx(4, 7), 6), "Empty Rectangle retire le 6 en L5C8");
  }
  {
    const e = findColoringE(fromNotes(lessonById("coloring").notes), null);
    ok(e && e.kind === "coloring" && e.rule === 2
      && hit(e, idx(1, 2), 5) && hit(e, idx(7, 6), 5) && hit(e, idx(2, 0), 5),
      "Coloriage (wrap) retire le 5 des trois cases ➊");
  }
  {
    const e = findSueDeCoqE(fromNotes(lessonById("sue-de-coq").notes), null);
    ok(e && e.kind === "sueDeCoq" && hit(e, idx(0, 4), 1) && hit(e, idx(0, 4), 2) && hit(e, idx(1, 1), 5),
      "Sue de Coq nettoie L1C5 −{1, 2} et L2C2 −{5}");
  }
}

/* ---------- 5. Génération : grille pleine, gradation, puzzles ---------- */
console.log("Génération :");
{
  const full = generateFullGrid(makeRng(42));
  ok(full.length === 81 && full.every((v) => v >= 1 && v <= 9), "grille pleine : 81 chiffres");
  ok(isComplete(full), "grille pleine : complète et sans conflit");

  // completedUnits : zones nouvellement complétées entre deux états
  {
    const before = full.slice(); before[0] = 0;
    const units = completedUnits(before, full);
    ok(units.length === 3
      && units.some((u) => u.type === "row" && u.index === 0)
      && units.some((u) => u.type === "col" && u.index === 0)
      && units.some((u) => u.type === "box" && u.index === 0),
      "completedUnits : poser la dernière case complète ligne, colonne et bloc");
    ok(completedUnits(full, full).length === 0, "completedUnits : rien si rien ne change");
    const bad = full.slice(); bad[0] = full[1]; // duplique un chiffre → conflit
    ok(completedUnits(before, bad).length === 0, "completedUnits : une zone en conflit ne compte pas");
  }

  SAMPLES.forEach((s, i) => {
    const r = solveHumanly(s.split("").map(Number));
    ok(r.solved, `solveHumanly résout SAMPLES[${i}] (maxTier=${r.maxTier})`);
  });

  // Seeds fixes : la génération est déterministe tant que moteur et RNG ne
  // changent pas. Si un seed tombe sur un fallback après une évolution du
  // moteur, en choisir un autre.
  for (const lvl of [1, 2, 3]) {
    const t0 = Date.now();
    const p = generatePuzzle(lvl, makeRng(1000 + lvl));
    const dt = Date.now() - t0;
    const g = p.grid.split("").map(Number);
    ok(solveGrid(g).count === 1, `niveau ${lvl} : solution unique`);
    ok(p.givens === g.filter((v) => v !== 0).length && p.givens >= 22 && p.givens <= 45,
      `niveau ${lvl} : ${p.givens} givens dans [22, 45]`);
    ok(p.level === lvl, `niveau ${lvl} : niveau atteint (réel=${p.level})`);
    const r = solveHumanly(g);
    ok(r.solved && Math.max(1, r.maxTier) === p.level, `niveau ${lvl} : re-grade conforme (maxTier=${r.maxTier})`);
    ok(dt < 3000, `niveau ${lvl} : généré en ${dt} ms (< 3000)`);
  }

  // Niveaux 4 et 5 : log informatif (décision « Diabolique » selon les temps).
  for (const lvl of [4, 5]) {
    const t0 = Date.now();
    const p = generatePuzzle(lvl, makeRng(9000 + lvl));
    console.log(`  ℹ niveau ${lvl} : ${Date.now() - t0} ms, grade réel ${p.level}, ${p.givens} givens`);
  }
}

/* ---------- 6. Exercices par technique (findTechniqueExercise) ---------- */
// Invariants d'un exercice, revérifiés par le finder — partagé par les
// sections 6 (recherche), 8 (constructif) et 9 (acceptation getExercise).
const checkExercise = (kind, ex) => {
  if (!ex) return false;
  ok(Array.isArray(ex.given) && ex.given.length === 81 && conflictSet(ex.given).size === 0,
    `${kind} : given sans conflit`);
  let remOk = true;
  for (const [c, ds] of Object.entries(ex.removals)) {
    const shown = ex.notes[c] || [];
    for (const d of ds) if (!shown.includes(d)) remOk = false;
  }
  ok(remOk, `${kind} : removals ⊆ notes case par case`);
  if (kind === "nakedSingle") {
    const cs = candidatesFromGrid(ex.given, ex.target);
    ok(cs.length === 1 && cs[0] === ex.answer,
      `${kind} : candidat unique ${ex.answer} en ${cellName(ex.target)}`);
  } else if (kind === "hiddenSingle") {
    const hs = findHiddenSingleFor(ex.given, allCands(ex.given), ex.target);
    ok(!!hs && hs.digit === ex.answer,
      `${kind} : single caché ${ex.answer} en ${cellName(ex.target)}`);
  } else {
    // Reconstruire les candidats depuis les notes → le finder correspondant
    // doit retrouver une élimination du même kind sur ces cases.
    const cands = Array.from({ length: 81 }, (_, i) => new Set(ex.notes[i] || []));
    const prefer = new Set(Object.keys(ex.removals).map(Number));
    const e = ELIM_FINDER_BY_KIND[kind](cands, prefer);
    ok(!!e && e.kind === kind, `${kind} : élimination revérifiée par le finder`);
    if (ex.target != null) {
      const after = (ex.notes[ex.target] || [])
        .filter((d) => !(ex.removals[ex.target] || []).includes(d));
      ok(after.length === 1 && after[0] === ex.answer,
        `${kind} : bonus — notes[target] − removals[target] = {${ex.answer}}`);
    }
  }
  return true;
};
console.log("Exercices par technique :");
{
  const COMMON = ["nakedSingle", "hiddenSingle", "pointing", "claiming", "nakedPair", "hiddenPair"];
  for (const kind of COMMON) {
    const times = [];
    let raw = 0;
    for (const seed of [11, 22, 33]) {
      const t0 = Date.now();
      const ex = findTechniqueExercise(kind, { timeBoxMs: 4000, rng: makeRng(seed) });
      times.push(Date.now() - t0);
      if (ex && !ex.workedNotes) raw++;
      ok(checkExercise(kind, ex), `${kind} (seed ${seed}) : exercice trouvé dans le time-box`);
    }
    console.log(`  ℹ ${kind} : moyenne ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms, notes brutes ${raw}/3`);
  }
  {
    const t0 = Date.now();
    const ex = findTechniqueExercise("xWing", { timeBoxMs: 8000, rng: makeRng(7) });
    ok(checkExercise("xWing", ex), "xWing : exercice trouvé (time-box 8 s)");
    console.log(`  ℹ xWing : ${Date.now() - t0} ms (n=1)`);
  }
}

/* ---------- 7. Transformations : symétries du sudoku ---------- */
console.log("Transformations :");
{
  const posOf = (L) => ({
    given: L.given, notes: L.notes, removals: L.removals,
    unit: L.unit, focus: L.focus, target: L.target, answer: L.answer,
  });
  const gridOf = (given) => {
    const g = Array(81).fill(0);
    for (const [k, v] of Object.entries(given)) g[Number(k)] = v;
    return g;
  };
  const identity = {
    digitPerm: Array.from({ length: 10 }, (_, d) => d),
    rowPerm: Array.from({ length: 9 }, (_, r) => r),
    colPerm: Array.from({ length: 9 }, (_, c) => c),
    transpose: false,
  };
  for (const L of LESSONS) {
    const kind = KIND_BY_LESSON[L.id];
    const pos = posOf(L);
    ok(JSON.stringify(transformPosition(pos, identity)) === JSON.stringify(pos),
      `[${L.num}] ${L.title} : transformation identité = no-op`);
    const problems = [];
    for (const seed of [1, 2, 3]) {
      const t = randomTransform(makeRng(500 + L.num * 10 + seed));
      const p = transformPosition(pos, t);
      const g = gridOf(p.given);
      // (a) valeurs transformées sans conflit
      if (conflictSet(g).size) { problems.push(`seed ${seed} : conflit`); continue; }
      // (b) candidats affichés compatibles avec les valeurs
      let clash = 0;
      for (const [k, arr] of Object.entries(p.notes)) {
        const i = Number(k);
        for (const d of arr) {
          for (const q of PEERS[i]) if (g[q] === d) clash++;
          if (g[i] !== 0) clash++;
        }
      }
      if (clash) { problems.push(`seed ${seed} : candidats`); continue; }
      // (c) le motif est retrouvé sur la position transformée
      if (kind === "nakedSingle") {
        const cs = candidatesFromGrid(g, p.target);
        if (!(cs.length === 1 && cs[0] === p.answer)) problems.push(`seed ${seed} : single`);
      } else if (kind === "hiddenSingle") {
        const hs = findHiddenSingleFor(g, allCands(g), p.target);
        if (!(hs && hs.digit === p.answer)) problems.push(`seed ${seed} : single caché`);
      } else {
        const cands = Array.from({ length: 81 }, (_, i) => new Set(p.notes[i] || []));
        const prefer = new Set(Object.keys(p.removals).map(Number));
        const e = ELIM_FINDER_BY_KIND[kind](cands, prefer);
        if (!(e && e.kind === kind && e.removals.some((r) => prefer.has(r.cell))))
          problems.push(`seed ${seed} : finder`);
      }
    }
    ok(problems.length === 0,
      `[${L.num}] ${L.title} : 3 transformations valides${problems.length ? ` (${problems.join(" · ")})` : ""}`);
  }
}

/* ---------- 8. Génération constructive : motifs rares sur vraies grilles ---------- */
console.log("Génération constructive :");
for (const kind of ["xWing", "swordfish", "skyscraper", "kite", "remotePair"]) {
  const times = [];
  for (const seed of [101, 202, 303]) {
    const t0 = Date.now();
    const ex = buildConstructiveExercise(kind, { budgetMs: 1500, rng: makeRng(seed) });
    const dt = Date.now() - t0;
    times.push(dt);
    ok(checkExercise(kind, ex) && dt < 1500, `${kind} (seed ${seed}) : construit et validé en ${dt} ms`);
    if (ex) {
      const g = ex.given.map((v) => v);
      ok(solveGrid(g).count === 1, `${kind} (seed ${seed}) : solution unique`);
    }
  }
  console.log(`  ℹ ${kind} (constructif) : moyenne ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms (n=3)`);
}

/* ---------- 9. Acceptation : un exercice garanti pour chacune des 17 techniques ---------- */
console.log("Acceptation getExercise (17 techniques × 5 appels) :");
for (const kind of Object.values(KIND_BY_LESSON)) {
  const times = [], sources = {};
  let allOk = true;
  for (const seed of [1, 2, 3, 4, 5]) {
    const t0 = Date.now();
    const ex = getExercise(kind, { budgetMs: 1500, rng: makeRng(7000 + seed) });
    const dt = Date.now() - t0;
    times.push(dt);
    if (!checkExercise(kind, ex) || dt >= 4000) allOk = false;
    if (ex) sources[ex.source] = (sources[ex.source] || 0) + 1;
  }
  ok(allOk, `${kind} : 5/5 exercices, chacun en < 4 s`);
  const src = Object.entries(sources).map(([s, n]) => `${s}×${n}`).join(" ");
  console.log(`  ℹ ${kind} : moyenne ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms — ${src}`);
}

/* ---------- 10. Stockage : implémentation web de storage.js ---------- */
console.log("Stockage (implémentation web) :");
{
  // Stub localStorage : sous Node il n'existe pas ; sans window, isNative()
  // est faux → storage.js prend le chemin web (localStorage).
  const backing = new Map();
  globalThis.localStorage = {
    getItem: (k) => (backing.has(k) ? backing.get(k) : null),
    setItem: (k, v) => backing.set(k, String(v)),
    removeItem: (k) => backing.delete(k),
  };
  const { KEYS, loadAll, readSync, persist } = await import("../src/storage.js");

  await persist(KEYS.scans, 4);
  ok(backing.get(KEYS.scans) === "4", "un nombre est stocké comme avant (octets = String(n))");
  const save = { grid: [7, 0, 3], givens: [true, false], phase: "play", level: 3 };
  await persist(KEYS.save, save);
  const all = await loadAll();
  ok(all[KEYS.scans] === 4, "loadAll relit le compteur de scans");
  ok(JSON.stringify(all[KEYS.save]) === JSON.stringify(save), "loadAll relit la sauvegarde (objet profond)");
  ok(all[KEYS.exos] === null, "clé absente → null");
  ok(readSync(KEYS.scans) === 4, "readSync relit une valeur persistée");

  backing.set(KEYS.scans, "6"); // valeur héritée de l'ancien code (brute, sans JSON)
  ok(readSync(KEYS.scans) === 6, "compteur hérité de l'ancien format relu tel quel");
  backing.set(KEYS.save, "{pas du json");
  ok((await loadAll())[KEYS.save] === null, "JSON corrompu → null (pas d'exception)");
  delete globalThis.localStorage;
}

/* ---------- 11. API /api/ocr : CORS pour le WebView natif ---------- */
console.log("API /api/ocr (CORS) :");
{
  // Déterministe et sans réseau : pas de clé API ni d'Upstash dans le test.
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
  const { default: handler } = await import("../api/ocr.js");
  const makeRes = () => ({
    statusCode: null,
    headers: {},
    body: undefined,
    ended: false,
    status(c) { this.statusCode = c; return this; },
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    json(o) { this.body = o; this.ended = true; },
    end() { this.ended = true; },
  });

  const preflight = makeRes();
  await handler({ method: "OPTIONS", headers: {} }, preflight);
  ok(preflight.statusCode === 204 && preflight.ended, "OPTIONS (préflight) → 204");
  ok(preflight.headers["access-control-allow-origin"] === "*", "OPTIONS : Access-Control-Allow-Origin *");
  ok(String(preflight.headers["access-control-allow-methods"] || "").includes("POST"), "OPTIONS : Access-Control-Allow-Methods contient POST");
  ok(String(preflight.headers["access-control-allow-headers"] || "").includes("Content-Type"), "OPTIONS : Access-Control-Allow-Headers contient Content-Type");

  const wrongMethod = makeRes();
  await handler({ method: "GET", headers: {} }, wrongMethod);
  ok(wrongMethod.statusCode === 405 && wrongMethod.headers["access-control-allow-origin"] === "*", "GET → 405 avec l'en-tête CORS");

  const noKey = makeRes();
  await handler({ method: "POST", headers: {}, body: { image: "x", media_type: "image/jpeg" } }, noKey);
  ok(noKey.statusCode === 500 && noKey.headers["access-control-allow-origin"] === "*", "POST sans clé serveur → 500 avec l'en-tête CORS");
}

console.log(failures === 0 ? "\nTOUT EST OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
