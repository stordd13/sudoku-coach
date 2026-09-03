/* Vérifications automatiques : moteur + leçons + exemples.
   Lancer : npm run check */
import {
  PEERS, BOXES, COLS, candidatesFromGrid, allCands, conflictSet,
  findHiddenSingleFor, solveGrid, buildPlan, stuckPanelKind, SAMPLES, cellName, rowOf, colOf,
  findXWingE, findSwordfishE, findSkyscraperE, findXYWingE, findRemotePairE,
  findXYZWingE, findWWingE, findKiteE, findEmptyRectangleE,
  findColoringE, findSueDeCoqE,
  snyderNotes,
  makeRng, generateFullGrid, solveHumanly, generatePuzzle, isComplete,
  findTechniqueExercise, ELIM_FINDER_BY_KIND, completedUnits,
  randomTransform, transformPosition, buildConstructiveExercise, hasAnySingle,
  packageExercise,
} from "../src/engine.js";
import { LESSONS } from "../src/lessons.js";
import {
  DAILY_LEVELS, dailySeed, dailyLevelFor, dailyPuzzle, localDateStr,
  currentStreak, bestStreak, monthCells,
} from "../src/daily.js";
import { addSegment, formatClock, emptyStats, normalizeStats, levelKey, recordStart, recordWin, helpRate } from "../src/stats.js";
import { C_LIGHT, C_DARK, getPalette, cssVars, META_COLOR } from "../src/theme.js";
import { TECH_NAMES, techName, frWithArticle, frTechList } from "../src/techNames.js";
import { DICTS, t, setLang, getLang, detectLang } from "../src/i18n.js";
import { cellAriaLabel } from "../src/a11y.js";
import { readFileSync } from "node:fs";
import { getExercise, KIND_BY_LESSON, LESSON_BY_KIND } from "../src/exercises.js";
import { techBreadcrumb, stepHint1, conceptSentence } from "../src/coachCopy.js";
import { notationFor, NOTATION_PREFS } from "../src/notation.js";
import { lessonStepScript, planStepScript, exerciseStepScript, stepReveal } from "../src/stepper.js";

const T0 = Date.now();
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
{
  // Fixture du bug réel (scan avec un chiffre d'énoncé manquant) : doit
  // déclencher le panneau bloquant « plusieurs solutions » au « Commencer ».
  const AMBIG = "630009080007000100800040000700826350003957801008000702300592000000000000004000023";
  ok(solveGrid(AMBIG.split("").map(Number)).count > 1, "fixture multi-solutions : count > 1");
}

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

/* ---------- 2a. hasAnySingle : détection d'un single posable ---------- */
console.log("hasAnySingle :");
{
  ok(hasAnySingle(SAMPLES[0].split("").map(Number)) === true, "grille facile de départ : un single existe");
  ok(hasAnySingle(Array(81).fill(0)) === false, "grille vide : aucun single");
  ok(hasAnySingle(generateFullGrid(makeRng(4))) === false, "grille pleine : aucun single");
  // Position de la leçon 2 : 7 givens (aucun candidat unique possible),
  // mais le 5 n'a qu'une place dans le bloc haut-gauche → single caché.
  const g2 = Array(81).fill(0);
  for (const [k, v] of Object.entries(LESSONS[1].given)) g2[Number(k)] = v;
  ok(g2.every((v, i) => v !== 0 || candidatesFromGrid(g2, i).length > 1), "leçon 2 : aucun candidat unique");
  ok(hasAnySingle(g2) === true, "leçon 2 : le single caché est détecté");
}

/* ---------- 2b. Preuves par paliers : le plus SIMPLE avant le plus COURT ---------- */
console.log("Preuves par paliers :");
const REPRO_STEPWISE = "000000381610083450483500006001050943054030627030402815100800534090300168348005000";
{
  const g = REPRO_STEPWISE.split("").map(Number);
  const p = buildPlan(g, 24); // L3C7
  ok(p && p.digit === 2, "repro L3C7 : conclusion = 2");
  ok(p.chain.length === 2 && p.chain.every((s) => s.title === "Paire pointante"),
    "repro L3C7 : preuve par 2 paires pointantes (techniques simples d'abord)");
  ok(p.chain.every((s) => s.text.includes("**2**")), "repro L3C7 : toutes les étapes portent sur le 2");
  ok(p.techKind === "hiddenSingle" && p.keyKind === "pointing"
    && JSON.stringify(p.chainKinds) === JSON.stringify(["pointing", "pointing"]),
    "repro L3C7 : champs structurés — techKind hiddenSingle, chainKinds [pointing ×2], keyKind pointing");

  // Palier minimal, pas d'escalade : tier 3 suffit → pas de technique tier 4.
  const g0 = SAMPLES[0].split("").map(Number);
  const p30 = buildPlan(g0, 30); // L4C4
  ok(p30 && p30.digit === 7 && p30.chain.length === 1 && p30.chain[0].title === "Duo caché",
    "L4C4 : preuve tier 3 (duo caché), pas d'escalade");
  ok(JSON.stringify(p30.chainKinds) === JSON.stringify(["hiddenPair"]) && p30.keyKind === "hiddenPair",
    "L4C4 : champs structurés — chainKinds [hiddenPair], keyKind hiddenPair");

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
  const direct = plans.find((p) => p.chainKinds.length === 0);
  ok(!!direct && direct.keyKind === direct.techKind
    && (direct.techKind === "nakedSingle" ? direct.techZone === null : typeof direct.techZone === "string"),
    "plan direct : keyKind = techKind, techZone cohérente");
}

/* ---------- 2c'. Coach 👣 : mapping leçon, fil d'Ariane, indice 1 ---------- */
console.log("Coach 👣 (leçon guidée) :");
{
  // Mapping kind → leçon : exhaustif (15 kinds d'élimination + 2 singles) et
  // conforme à la numérotation des leçons.
  const EXPECTED = {
    nakedSingle: 1, hiddenSingle: 2, nakedPair: 3, pointing: 4, claiming: 5,
    hiddenPair: 6, xWing: 7, xyWing: 8, swordfish: 9, skyscraper: 10,
    remotePair: 11, xyzWing: 12, wWing: 13, kite: 14, emptyRectangle: 15,
    coloring: 16, sueDeCoq: 17,
  };
  const kinds = [...Object.keys(ELIM_FINDER_BY_KIND), "nakedSingle", "hiddenSingle"];
  ok(kinds.length === 17 && kinds.every((k) => !!LESSON_BY_KIND[k]),
    "mapping exhaustif : chaque kind du moteur a sa leçon");
  ok(Object.entries(EXPECTED).every(([k, n]) => LESSON_BY_KIND[k] && LESSON_BY_KIND[k].num === n),
    "numéros de leçon conformes (nakedSingle 1 … sueDeCoq 17)");

  // 4 plans représentatifs : nu direct, caché direct, chaîne 1 étape, chaîne 2 étapes.
  const g0 = SAMPLES[0].split("").map(Number);
  const plans = [];
  for (let i = 0; i < 81; i++) {
    if (g0[i] !== 0) continue;
    const q = buildPlan(g0, i);
    if (q) plans.push(q);
  }
  const nakedDirect = plans.find((q) => q.techKind === "nakedSingle" && !q.chainKinds.length);
  const hiddenDirect = plans.find((q) => q.techKind === "hiddenSingle" && !q.chainKinds.length);
  const chain1 = buildPlan(g0, 30); // L4C4 : duo caché puis single
  const chain2 = buildPlan(REPRO_STEPWISE.split("").map(Number), 24); // L3C7 : 2 pointantes

  ok(!!nakedDirect && techBreadcrumb(nakedDirect) === "Candidat unique",
    "fil d'Ariane nu direct : « Candidat unique »");
  ok(!!hiddenDirect && /^Single caché \((ligne|colonne|bloc) /.test(techBreadcrumb(hiddenDirect)),
    "fil d'Ariane caché direct : « Single caché (zone) »");
  ok(techBreadcrumb(chain2) === "2 × Paire pointante → Single caché",
    "fil d'Ariane 2 étapes identiques : regroupées en « 2 × »");
  ok(techBreadcrumb({ ...chain2, chain: Array(3).fill({ title: "Paire pointante" }) })
    === "3 × Paire pointante → Single caché", "fil d'Ariane 3 étapes identiques : « 3 × »");
  ok(techBreadcrumb({
    ...chain2,
    chain: [{ title: "Paire pointante" }, { title: "Paire nue" }, { title: "Duo caché" }],
  }) === "3 éliminations → Single caché", "fil d'Ariane 3 groupes distincts : compte replié");

  // Critère de revue : technique nommée, une idée par phrase, aucune réponse.
  for (const [label, q] of [
    ["candidat nu", nakedDirect], ["single caché", hiddenDirect],
    ["chaîne 1 étape", chain1], ["chaîne 2 étapes", chain2],
  ]) {
    ok(!!q && stepHint1(q).length > 0 && !stepHint1(q).includes(`**${q.digit}**`),
      `indice 1 (${label}) : construit, chiffre non divulgué`);
    if (q) console.log(`  ℹ indice 1 (${label}) : ${stepHint1(q)}`);
  }
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

/* ---------- 2e. Notation : notationFor ---------- */
console.log("Notation (bouton Noter) :");
{
  const truth = [
    // [levelKey, pref, attendu]
    ["1", "auto", "snyder"], ["2", "auto", "snyder"], ["custom", "auto", "snyder"],
    ["3", "auto", "complete"], ["4", "auto", "complete"], ["5", "auto", "complete"],
    ["1", "snyder", "snyder"], ["2", "snyder", "snyder"], ["3", "snyder", "snyder"],
    ["4", "snyder", "snyder"], ["5", "snyder", "snyder"], ["custom", "snyder", "snyder"],
    ["1", "complete", "complete"], ["2", "complete", "complete"], ["3", "complete", "complete"],
    ["4", "complete", "complete"], ["5", "complete", "complete"], ["custom", "complete", "complete"],
  ];
  let bad = 0;
  for (const [lk, pref, want] of truth) {
    if (notationFor(lk, pref) !== want) { bad++; console.error(`    ✗ notationFor(${lk}, ${pref}) ≠ ${want}`); }
  }
  ok(bad === 0, `table de vérité 6 niveaux × 3 préférences (${truth.length} cas)`);
  ok(notationFor("2", "n'importe quoi") === "snyder" && notationFor("4", "n'importe quoi") === "complete",
    "préférence inconnue → comportement auto");
  ok(notationFor(undefined) === "snyder" && notationFor("weird") === "snyder",
    "levelKey inattendu → Snyder (le choix prudent)");
  ok(NOTATION_PREFS.join(",") === "auto,snyder,complete", "NOTATION_PREFS expose les trois réglages");
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

/* ---------- 3e. Stepper des leçons : stepCells / stepStrikes ---------- */
console.log("Stepper des leçons :");
for (const L of LESSONS) {
  console.log(` [${L.num}] ${L.title}`);
  ok(Array.isArray(L.stepCells) && Array.isArray(L.stepStrikes)
    && L.stepCells.length === L.steps.length && L.stepStrikes.length === L.steps.length,
    "stepCells et stepStrikes alignés sur steps");
  // Union des strikes == removals (mêmes cases, mêmes chiffres)
  const union = {};
  for (const st of L.stepStrikes) {
    for (const [k, arr] of Object.entries(st)) {
      union[k] = [...new Set([...(union[k] || []), ...arr])];
    }
  }
  const remKeys = Object.keys(L.removals).sort();
  const sameKeys = JSON.stringify(Object.keys(union).sort()) === JSON.stringify(remKeys);
  const sameDigits = sameKeys && remKeys.every((k) =>
    JSON.stringify([...union[k]].sort()) === JSON.stringify([...L.removals[k]].sort()));
  ok(sameKeys && sameDigits, "l'union des stepStrikes == removals");
  // Chaque case surlignée appartient aux zones de la leçon
  const zones = new Set([...L.unit, ...L.focus, L.target]);
  const badCell = L.stepCells.flat().filter((i) => !zones.has(i));
  ok(badCell.length === 0, `cases d'étape dans unit ∪ focus ∪ cible${badCell.length ? ` (hors zone : ${badCell.join(",")})` : ""}`);
  // Chaque strike barre un candidat réellement affiché
  let bad = 0;
  for (const st of L.stepStrikes) {
    for (const [k, arr] of Object.entries(st)) {
      const shown = L.notes[Number(k)] || [];
      for (const d of arr) if (!shown.includes(d)) bad++;
    }
  }
  ok(bad === 0, "les strikes portent sur des candidats affichés");
}

/* ---------- 3f. Stepper : dérivation pure (stepper.js) ---------- */
console.log("Stepper — dérivation pure :");
{
  const sameStrikes = (a, b) => JSON.stringify(
    Object.fromEntries(Object.entries(a).map(([k, v]) => [k, [...v].sort()]).sort())
  ) === JSON.stringify(
    Object.fromEntries(Object.entries(b).map(([k, v]) => [k, [...v].sort()]).sort())
  );
  // Leçon 4 (paire pointante) : 3 étapes, conclusion à la dernière.
  const L4 = LESSONS.find((l) => l.id === "pointing-pair");
  const sL = lessonStepScript(L4);
  ok(sL && sL.length === 3 && !sL[0].conclusion && sL[2].conclusion,
    "leçon 4 : script de 3 étapes, conclusion en dernière");
  ok(lessonStepScript({ steps: ["a"], stepCells: [[1], [2]], stepStrikes: [{}] }) === null,
    "champs désalignés → null (repli tout-d'un-bloc)");
  // Plan à chaîne (fixture 2b) : 2 pointantes + conclusion.
  const gRS = REPRO_STEPWISE.split("").map(Number);
  const plan = buildPlan(gRS, 24);
  const sP = planStepScript(plan);
  ok(sP && sP.length === plan.chain.length + 1 && sP[sP.length - 1].conclusion,
    `plan R3C7 : ${plan.chain.length} maillons + 1 conclusion`);
  const rawNorm = (i) => {
    const out = {};
    for (const r of plan.rawChain[i].removals) out[r.cell] = [...new Set([...(out[r.cell] || []), ...r.digits])].sort((a, b) => a - b);
    return out;
  };
  ok(sP.slice(0, -1).every((s, i) => JSON.stringify(s.strikes) === JSON.stringify(rawNorm(i))),
    "strikes de l'étape i == removals de rawChain[i]");
  ok(sP[sP.length - 1].cells.length && sP[sP.length - 1].cells.every((c) => plan.unitCells.includes(c)),
    "la conclusion surligne la zone du single");
  ok(planStepScript({ kind: "ok", chain: [] }) === null && planStepScript(null) === null,
    "plan direct (chaîne vide) ou absent → null");
  // stepReveal : accumulation passé/courant, « tout voir » == union totale.
  const v0 = stepReveal(sP, 0), v1 = stepReveal(sP, 1), vAll = stepReveal(sP, "all");
  ok(v0 && Object.keys(v0.struckPast).length === 0 && sameStrikes(v0.struckNow, Object.fromEntries(Object.entries(sP[0].strikes).map(([k, v]) => [k, new Set(v)]))),
    "étape 0 : rien au passé, strikes courants en rouge");
  ok(v1 && sameStrikes(v1.struckPast, Object.fromEntries(Object.entries(sP[0].strikes).map(([k, v]) => [k, new Set(v)]))),
    "étape 1 : les strikes de l'étape 0 passent au passé");
  {
    const union = {};
    for (const s of sP) {
      for (const [k, arr] of Object.entries(s.strikes)) {
        if (!union[k]) union[k] = new Set();
        for (const d of arr) union[k].add(d);
      }
    }
    ok(vAll.showAnswer && Object.keys(vAll.struckPast).length === 0 && sameStrikes(vAll.struckNow, union),
      "« tout voir » : union totale des strikes + réponse visible");
  }
  ok(!v0.showAnswer && stepReveal(sP, sP.length - 1).showAnswer, "la réponse n'apparaît qu'à la conclusion");
  // Exercice packagé (position de la leçon 4) : explainCells présent.
  const given4 = Array(81).fill(0);
  for (const [k, v] of Object.entries(L4.given)) given4[Number(k)] = v;
  const candsArr4 = Array.from({ length: 81 }, (_, i) => L4.notes[i] || []);
  const e4 = ELIM_FINDER_BY_KIND.pointing(candsArr4.map((a) => new Set(a)), new Set(Object.keys(L4.removals).map(Number)));
  const ex4 = packageExercise("pointing", e4, given4, candsArr4);
  ok(Array.isArray(ex4.explainCells) && ex4.explainCells.length === ex4.explain.length,
    "packageExercise : explainCells parallèle à explain");
  const sE = exerciseStepScript(ex4);
  ok(sE && sE.length === ex4.explain.length && sE[sE.length - 1].conclusion
    && JSON.stringify(sE[sE.length - 1].strikes) === JSON.stringify(ex4.removals),
    "exercice : la dernière étape porte les removals et la conclusion");
  ok(exerciseStepScript({ explain: ["x"], unit: [3, 4], removals: {} })[0].cells.join(",") === "3,4",
    "exercice sans explainCells → repli sur unit");
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
    // Chrono découplé de la validité : assert généreux (deadline interne 3 s),
    // portable sur machine lente tout en gardant un garde-fou anti-boucle.
    ok(dt <= 4000, `niveau ${lvl} : généré en ${dt} ms (≤ 4 s)`);
  }

  // Niveaux 4 et 5 : log informatif (décision « Diabolique » selon les temps).
  for (const lvl of [4, 5]) {
    const t0 = Date.now();
    const p = generatePuzzle(lvl, makeRng(9000 + lvl));
    console.log(`  ℹ niveau ${lvl} : ${Date.now() - t0} ms, grade réel ${p.level}, ${p.givens} givens`);
  }
}

/* ---------- 5b. Parties intégrales : le chemin RÉEL du joueur ----------
   solveHumanly grade les grilles, mais le joueur, lui, avance par buildPlan
   (👣/🎯). Cette section joue des parties entières par ce chemin-là : c'est le
   test qui manquait quand des grilles « gradées résolubles » se bloquaient en
   jeu (asymétrie corrigée par MAX_CHAIN, partagé entre les deux moteurs). */
console.log("Parties intégrales (chemin du joueur) :");
{
  // Boucle 👣 déterministe : meilleur plan sur toutes les cases vides,
  // difficulté minimale (premier ex æquo), placement — comme randomHint,
  // mais sans tirage au sort et sans écarter les désaccords : un plan dont le
  // chiffre contredit la solution est un bug de déduction, pas un blocage.
  const playThrough = (grid, sol) => {
    const g = grid.slice();
    let mismatches = 0, moves = 0;
    for (let guard = 0; guard < 81; guard++) {
      let best = null;
      for (let i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        const p = buildPlan(g, i);
        if (!p) continue;
        if (p.digit !== sol[i]) mismatches++;
        if (!best || p.difficulty < best.difficulty) best = p;
      }
      if (!best) break; // blocage : plus aucune case déductible
      g[best.target] = best.digit;
      moves++;
    }
    return { done: isComplete(g), mismatches, moves, left: g.filter((v) => !v).length };
  };

  // Seeds fixes (cf. section 5 : en changer si une évolution du moteur fait
  // tomber l'un d'eux en fallback de niveau).
  for (const lvl of [1, 2, 3, 4]) {
    const t0 = Date.now();
    for (let s = 0; s < 3; s++) {
      const p = generatePuzzle(lvl, makeRng(lvl * 100000 + s * 137 + 11));
      ok(p.level === lvl, `niveau ${lvl} seed ${s} : niveau atteint (réel=${p.level})`);
      const r = playThrough(p.grid.split("").map(Number), p.solution.split("").map(Number));
      ok(r.done, `niveau ${lvl} seed ${s} : partie terminée (${r.moves} coups${r.done ? "" : `, ${r.left} cases restantes`})`);
      ok(r.mismatches === 0, `niveau ${lvl} seed ${s} : zéro chiffre contredisant la solution`);
    }
    console.log(`  ℹ niveau ${lvl} : 3 parties jouées en ${Date.now() - t0} ms`);
  }

  // Fixture de régression : état réel autrefois bloqué (28 cases restantes,
  // résoluble tier 4, aucun plan trouvable avec l'ancien plafond de 4).
  const REPRO = "905704830380025079007839005056382907809576300273941500600257190700498050590003704";
  const g = REPRO.split("").map(Number);
  const { count, solution } = solveGrid(g);
  ok(count === 1, "fixture repro : solution unique");
  const reproPlans = g.map((v, i) => (v === 0 ? buildPlan(g, i) : null)).filter(Boolean);
  ok(reproPlans.length > 0, "fixture repro : au moins une case produit un plan");
  // Cet état exige le palier 4 : la preuve par paliers doit l'atteindre.
  const TIER4 = new Set(["xWing", "xyWing", "xyzWing", "wWing", "swordfish", "kite", "skyscraper", "emptyRectangle", "remotePair"]);
  ok(reproPlans.some((p) => p.rawChain.some((e) => TIER4.has(e.kind))),
    "fixture repro : au moins un plan mobilise une technique de palier 4");
  const r = playThrough(g, solution);
  ok(r.done && r.mismatches === 0, `fixture repro : partie terminée depuis l'état bloqué (${r.moves} coups)`);
}

/* ---------- 5c. Routage du panneau « bloqué » : table de vérité ---------- */
console.log("Routage du panneau bloqué (stuckPanelKind) :");
{
  const T = [ // [multiSol, hasWrongDigit, anyPlan] → attendu
    [false, false, false, "beyond-coach"],
    [false, false, true,  null],
    [false, true,  false, "wrong-digit"],
    [false, true,  true,  null],
    [true,  false, false, "multi-sol"],
    [true,  false, true,  null],
    [true,  true,  false, "wrong-digit"], // priorité : erreur prouvée avant multi-solutions
    [true,  true,  true,  null],
  ];
  for (const [multiSol, hasWrongDigit, anyPlan, want] of T) {
    const got = stuckPanelKind({ multiSol, hasWrongDigit, anyPlan });
    ok(got === want, `multiSol=${multiSol} wrong=${hasWrongDigit} anyPlan=${anyPlan} → ${String(want)}`);
  }
}

/* ---------- 5d. Défi du jour : déterminisme, niveaux, séries ---------- */
console.log("Défi du jour :");
{
  // Déterminisme strict : deux appels même date → même grille. Date de
  // semaine (niveau 2, gardé, rapide) pour contenir le coût du double appel.
  const A = dailyPuzzle("2026-09-01");
  const B = dailyPuzzle("2026-09-01");
  ok(A.grid === B.grid && A.solution === B.solution, "même date → même grille et même solution");
  ok(A.targetLevel === 2 && A.dateStr === "2026-09-01", "mardi 2026-09-01 → niveau cible 2, date portée");
  ok(solveGrid(A.grid.split("").map(Number)).count === 1, "grille du jour : solution unique");
  const C = dailyPuzzle("2026-09-02");
  ok(C.grid !== A.grid, "dates différentes → grilles différentes");

  // Niveau par jour de semaine [2,2,3,3,3,4,4] (lun→dim), calculé en UTC :
  // relire "YYYY-MM-DD" via getDay() local décalerait d'un jour selon le fuseau.
  const week = ["2026-08-31", "2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-05", "2026-09-06"];
  ok(JSON.stringify(week.map(dailyLevelFor)) === JSON.stringify(DAILY_LEVELS),
    `niveaux lun→dim = [${week.map(dailyLevelFor).join(", ")}] (piège dimanche/lundi couvert)`);
  ok(new Set(week.map(dailySeed)).size === 7, "7 dates → 7 seeds distinctes");

  // Date locale : composants locaux zéro-paddés (pas d'ISO/UTC ici).
  ok(localDateStr(new Date(2026, 0, 5)) === "2026-01-05", "localDateStr(5 janvier 2026) = 2026-01-05");

  // Séries — sémantique Wordle : « aujourd'hui pas encore fait » ne casse pas
  // la série ; seul un jour RÉVOLU manquant la casse.
  ok(currentStreak({}, "2026-09-01") === 0, "série vide = 0");
  ok(currentStreak({ "2026-09-01": true }, "2026-09-01") === 1, "aujourd'hui seul = 1");
  ok(currentStreak({ "2026-08-31": true, "2026-09-01": true }, "2026-09-01") === 2,
    "hier + aujourd'hui = 2 (franchissement de mois)");
  ok(currentStreak({ "2026-08-30": true, "2026-08-31": true }, "2026-09-01") === 2,
    "hier ✓, aujourd'hui pas encore fait → la série reste vivante (2)");
  ok(currentStreak({ "2026-08-30": true }, "2026-09-01") === 0, "un jour révolu manquant casse la série");
  ok(currentStreak({ "2025-12-31": true, "2026-01-01": true }, "2026-01-01") === 2,
    "franchissement d'année : 2");
  ok(bestStreak({}) === 0, "record d'une carte vide = 0");
  ok(bestStreak({
    "2026-02-27": true, "2026-02-28": true, "2026-03-01": true, // 2026 non bissextile : suite de 3
    "2026-03-05": true, "2026-03-06": true,
  }) === 3, "record = plus longue suite consécutive (3), trous ignorés");

  // Mini-calendrier.
  const cells = monthCells("2026-09-15");
  ok(cells.length === 30 && cells[0].day === 1 && cells[29].dateStr === "2026-09-30",
    "monthCells : 30 jours en septembre 2026");
  ok(cells[0].dow === 2, "monthCells : le 1er septembre 2026 est un mardi (dow=2)");

  // Pire cas objectivé (informatif, dépend de la machine) : tentatives et
  // temps consommés, grille par grille. Par défaut 2 semaines à partir d'un
  // lundi (chaque case de DAILY_LEVELS deux fois, dont 4 jours de niveau 4) ;
  // balayage complet : DAILY_SWEEP=365 npm run check.
  const days = Math.max(1, Number(process.env.DAILY_SWEEP) || 14);
  let worst = { ms: -1 }, uniqueFails = 0, fallbacks = 0;
  const t0 = Date.now();
  for (let i = 0; i < days; i++) {
    const ds = new Date(Date.UTC(2026, 8, 7) + i * 86400000).toISOString().slice(0, 10);
    const t = Date.now();
    const p = dailyPuzzle(ds);
    const ms = Date.now() - t;
    if (solveGrid(p.grid.split("").map(Number)).count !== 1) uniqueFails++;
    if (p.level !== p.targetLevel) fallbacks++;
    if (ms > worst.ms) worst = { ms, ds, attempts: p.attempts, level: p.targetLevel };
  }
  ok(uniqueFails === 0, `balayage ${days} jours : toutes les grilles à solution unique`);
  console.log(`  ℹ balayage ${days} jours en ${((Date.now() - t0) / 1000).toFixed(1)} s — pire : ${worst.ds}`
    + ` (${worst.ms} ms, ${worst.attempts} tentatives, niveau ${worst.level}), fallbacks : ${fallbacks}`);
}

/* ---------- 5e. Chrono : segments horodatés et affichage ---------- */
console.log("Chrono (stats.js) :");
{
  ok(formatClock(0) === "0:00", "formatClock(0) = 0:00");
  ok(formatClock(67) === "1:07", "formatClock(67) = 1:07");
  ok(formatClock(727) === "12:07", "formatClock(727) = 12:07");
  ok(formatClock(3727) === "1:02:07", "formatClock(3727) = 1:02:07 (heures si nécessaires)");
  ok(formatClock(-5) === "0:00" && formatClock(NaN) === "0:00", "valeurs dégénérées → 0:00");
  ok(addSegment(10, 1000, 6000) === 15, "addSegment : 10 s + segment de 5 s = 15 s");
  ok(addSegment(10, 6000, 1000) === 10, "segment négatif (horloge qui recule) ignoré");
  ok(addSegment(10, 5000, 5000) === 10, "segment nul ignoré");
  ok(addSegment(10, NaN, 6000) === 10 && addSegment(10, 1000, undefined) === 10,
    "timestamps invalides ignorés");
}

/* ---------- 5f. Stats : reducers purs et immuables ---------- */
console.log("Stats (agrégation) :");
{
  ok(levelKey(3) === "3" && levelKey(null) === "custom" && levelKey(undefined) === "custom",
    "levelKey : niveaux 1-5 → chaîne, sinon custom");
  const s0 = emptyStats();
  const s1 = recordStart(s0, "2");
  const s2 = recordStart(s1, "2");
  ok(s2.started["2"] === 2 && s0.started["2"] === undefined && s1.started["2"] === 1,
    "recordStart compte par niveau sans muter l'entrée");
  const w1 = recordWin(s2, { levelKey: "2", seconds: 300, hints: 2, assisted: false });
  ok(w1.finished["2"] === 1 && w1.bestTime["2"] === 300, "première victoire : terminée + meilleur temps");
  ok(s2.finished["2"] === undefined && s2.bestTime["2"] === undefined, "recordWin ne mute pas l'entrée");
  const w2 = recordWin(w1, { levelKey: "2", seconds: 400, hints: 0, assisted: false });
  ok(w2.bestTime["2"] === 300, "un temps plus lent ne régresse jamais le record");
  const w3 = recordWin(w2, { levelKey: "2", seconds: 200, hints: 0, assisted: true });
  ok(w3.bestTime["2"] === 300 && w3.finished["2"] === 3,
    "partie assistée (Tout résoudre / Révéler) : terminée mais sans record");
  const w4 = recordWin(w3, { levelKey: "2", seconds: 250, hints: 1, assisted: false });
  ok(w4.bestTime["2"] === 250, "un meilleur temps honnête bat le record");
  ok(w4.hints === 3 && w4.hintGames === 2, "cumul des indices (3) et des parties aidées (2)");
  ok(Math.abs(helpRate(w4) - 3 / 4) < 1e-9, "taux d'aide = indices / parties terminées");
  ok(helpRate(emptyStats()) === 0, "taux d'aide sans partie terminée = 0");
  // Une partie abandonnée ne compte que « commencée » — choix assumé : pas de
  // décompte d'abandon, le ratio terminées/commencées suffit.
  ok(recordStart(emptyStats(), "custom").started.custom === 1
    && recordStart(emptyStats(), "custom").finished.custom === undefined,
    "partie abandonnée = commencée seulement (clé custom)");

  // Blindage : une valeur chargée corrompue ne doit jamais faire jeter les
  // reducers (sinon crash permanent : l'exception précède le persist).
  for (const [label, bad] of [["objet partiel", { hints: 0 }], ["tableau", []], ["nombre", 5], ["null", null], ["chaîne", "x"]]) {
    const n = normalizeStats(bad);
    let threw = false;
    try { helpRate(recordWin(recordStart(n, "2"), { levelKey: "2", seconds: 100 })); } catch (e) { threw = true; }
    ok(!threw && n.started && n.finished && n.bestTime, `normalizeStats(${label}) : forme sûre, reducers sans exception`);
  }
  const valid = recordWin(recordStart(emptyStats(), "3"), { levelKey: "3", seconds: 200, hints: 1 });
  ok(JSON.stringify(normalizeStats(valid)) === JSON.stringify(valid), "normalizeStats préserve un objet valide");
}

/* ---------- 5g. Thème : palettes clair/sombre synchronisées ---------- */
console.log("Thème :");
{
  const lk = Object.keys(C_LIGHT), dk = Object.keys(C_DARK);
  ok(lk.length === dk.length && lk.every((k) => dk.includes(k)),
    `C_LIGHT et C_DARK exposent les mêmes clés (${lk.length})`);
  const colorRe = /^(#[0-9A-Fa-f]{6}|rgba\(\d+,\d+,\d+,(0?\.\d+|1)\))$/;
  ok(lk.every((k) => colorRe.test(C_LIGHT[k])), "C_LIGHT : hex #RRGGBB ou rgba() valides");
  ok(dk.every((k) => colorRe.test(C_DARK[k])), "C_DARK : hex #RRGGBB ou rgba() valides");
  ok(getPalette("dark") === C_DARK && getPalette("light") === C_LIGHT && getPalette("auto") === C_LIGHT,
    "getPalette : dark → sombre, tout le reste → clair");
  const vars = cssVars(C_LIGHT);
  ok(lk.every((k) => vars.includes(`--sc-${k}:`)), "cssVars produit une variable par clé");
  // Palette claire historique intouchée (échantillon des 14 clés d'origine).
  ok(C_LIGHT.paper === "#F1F4F3" && C_LIGHT.ink === "#1F272E" && C_LIGHT.teal === "#12766F"
    && C_LIGHT.yellow === "#F2C40F" && C_LIGHT.yellowSoft === "#FFF3B8" && C_LIGHT.red === "#B3372E",
    "palette claire historique inchangée");
  ok(META_COLOR.light === C_LIGHT.paper && META_COLOR.dark === C_DARK.paper, "META_COLOR suit les fonds de page");
  // index.html duplique le fond sombre (script anti-flash) : verrouiller la synchro.
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  ok(html.includes("data-theme"), "index.html : script anti-flash présent");
  ok(html.includes(C_DARK.paper), "index.html : fond sombre synchronisé avec C_DARK.paper");
  ok(html.includes(C_LIGHT.paper), "index.html : fond clair synchronisé avec C_LIGHT.paper");
}

/* ---------- 5h. Noms de techniques : source unique ---------- */
console.log("Noms de techniques :");
{
  const kinds = Object.keys(TECH_NAMES);
  ok(kinds.length === 17, `17 techniques nommées (${kinds.length})`);
  ok(kinds.every((k) => TECH_NAMES[k].fr && TECH_NAMES[k].en && TECH_NAMES[k].lesson),
    "fr, en et leçon non vides partout");
  ok([...Object.keys(ELIM_FINDER_BY_KIND), "nakedSingle", "hiddenSingle"].every((k) => !!TECH_NAMES[k]),
    "chaque kind du moteur a son entrée");
  ok(Object.entries(KIND_BY_LESSON).every(([lessonId, kind]) => TECH_NAMES[kind].lesson === lessonId),
    "mapping kind ↔ leçon cohérent avec exercises.js");
  // Les titres des leçons restent la référence d'affichage : zéro dérive.
  ok(LESSONS.every((L) => TECH_NAMES[KIND_BY_LESSON[L.id]].fr === L.title),
    "chaque titre de leçon === TECH_NAMES.fr");
  ok(techName("pointing") === "Paire pointante" && techName("pointing", "en") === "Pointing pair"
    && techName("pointing", "xx") === "Paire pointante", "techName : fr par défaut, repli fr");
  ok(frWithArticle("emptyRectangle") === "l’Empty Rectangle", "élision : l’Empty Rectangle");
  ok(frWithArticle("remotePair") === "les Remote Pairs", "pluriel : les Remote Pairs");
  ok(frWithArticle("pointing") === "la paire pointante" && frWithArticle("claiming") === "la réduction bloc/ligne",
    "féminins en minuscule : la paire pointante, la réduction bloc/ligne");
  ok(frWithArticle("coloring") === "le coloriage" && frWithArticle("xWing") === "le X-Wing",
    "casse : le coloriage (commun) mais le X-Wing (propre)");
  const list = frTechList();
  ok(list.startsWith("candidat unique, single caché") && list.endsWith("coloriage, Sue de Coq")
    && list.split(", ").length === 17, "frTechList : les 17, dans l'ordre des leçons");
}

/* ---------- 5i. i18n : parité des dictionnaires, t(), replis ---------- */
console.log("i18n :");
{
  const fk = Object.keys(DICTS.fr), ek = Object.keys(DICTS.en);
  ok(fk.length === ek.length && fk.every((k) => ek.includes(k)),
    `dictionnaires fr/en : mêmes clés (${fk.length})`);
  const ph = (s) => (String(s).match(/\{\w+\}/g) || []).sort().join(",");
  ok(fk.every((k) => ph(DICTS.fr[k]) === ph(DICTS.en[k])),
    "mêmes placeholders {…} des deux côtés (clé par clé)");
  ok(fk.every((k) => DICTS.fr[k] !== "" && DICTS.en[k] !== ""), "aucune traduction vide");
  ok(getLang() === "fr", "langue par défaut : fr");
  setLang("en");
  ok(t("settings.theme") === "Theme", "t() lit le dictionnaire actif (en)");
  setLang("fr");
  ok(t("settings.theme") === "Thème", "retour au fr");
  ok(t("clé.inexistante") === "clé.inexistante", "clé absente partout → clé brute");
  // Node ≥ 21 expose navigator.language (locale de l'OS) : on vérifie juste
  // que la détection renvoie une langue supportée, pas une valeur précise.
  ok(detectLang() === "fr" || detectLang() === "en", "detectLang → fr ou en, jamais autre chose");
  ok((setLang("xx"), getLang()) === "fr", "langue inconnue → fr");
  // Interpolation et repli en → fr (clés temporaires, retirées ensuite).
  DICTS.fr._tmp = "{n} restants"; DICTS.en._tmp = "{n} left"; DICTS.fr._onlyFr = "seulement fr";
  ok(t("_tmp", { n: 3 }) === "3 restants", "interpolation {n} en fr");
  setLang("en");
  ok(t("_tmp", { n: 3 }) === "3 left", "interpolation {n} en en");
  ok(t("_onlyFr") === "seulement fr", "clé absente en en → repli fr");
  setLang("fr");
  delete DICTS.fr._tmp; delete DICTS.en._tmp; delete DICTS.fr._onlyFr;
}

/* ---------- 5j. A11y : labels de cases (jamais les candidats calculés) ---------- */
console.log("A11y (cellAriaLabel) :");
{
  const mk = (o) => cellAriaLabel(o, t);
  ok(mk({ index: 20, value: 0 }) === "Ligne 3, colonne 3 — vide", "case vide");
  ok(mk({ index: 20, value: 0, noteDigits: [5] }) === "Ligne 3, colonne 3 — vide, note 5", "une note");
  ok(mk({ index: 20, value: 0, noteDigits: [2, 5] }) === "Ligne 3, colonne 3 — vide, notes 2 et 5",
    "notes du joueur (la source est notes[i], jamais candidatesFromGrid)");
  ok(mk({ index: 20, value: 0, noteDigits: [2, 3, 5] }) === "Ligne 3, colonne 3 — vide, notes 2, 3 et 5",
    "trois notes : virgules puis « et »");
  ok(mk({ index: 3, value: 8, given: true }) === "Ligne 1, colonne 4 — 8, donnée de départ", "donnée de départ");
  ok(mk({ index: 3, value: 4, conflict: true }) === "Ligne 1, colonne 4 — 4, posé, en conflit", "posé, en conflit");
  setLang("en");
  ok(mk({ index: 20, value: 0, noteDigits: [2, 5] }) === "Row 3, column 3 — empty, notes 2 and 5", "EN : notes");
  ok(mk({ index: 3, value: 8, given: true }) === "Row 1, column 4 — 8, given", "EN : given");
  ok(mk({ index: 3, value: 4, conflict: true }) === "Row 1, column 4 — 4, placed, in conflict", "EN : conflit");
  setLang("fr");
}

/* ---------- 5k. A11y : contraste AA des deux thèmes (WCAG 2.x) ---------- */
console.log("Contraste AA :");
{
  const srgbLuminance = (hex) => {
    const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
    const n = parseInt(hex.slice(1), 16);
    return 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  };
  const contrastRatio = (a, b) => {
    const la = srgbLuminance(a), lb = srgbLuminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  ok(Math.abs(contrastRatio("#FFFFFF", "#000000") - 21) < 0.01, "sanité : blanc/noir = 21:1");
  // Paires (fg, bg, seuil, usage). 4.5 = texte essentiel ; 3.0 = secondaire
  // (notes décoratives, icônes) — `faint` est assumé décoratif, pas AA-texte.
  const PAIRS = [
    ["ink", "paper", 4.5, "texte principal / fond papier"],
    ["ink", "surface", 4.5, "texte principal / cartes"],
    ["textStrong", "surface", 4.5, "paragraphes de leçon"],
    ["textSoft", "surface", 4.5, "sous-titres de cartes"],
    ["textSoft", "chipBg", 4.5, "badge niveau, chip chrono"],
    ["textSoft", "tabsBg", 4.5, "onglet inactif"],
    ["blue", "surface", 4.5, "chiffres posés"],
    ["blue", "blueSoft", 4.5, "chiffre surligné même valeur"],
    ["blue", "yellowSoft", 4.5, "chiffre posé en zone de plan"],
    ["blue", "tealSoft", 4.5, "chiffre posé sélectionné"],
    ["red", "surface", 4.5, "chiffre en conflit"],
    ["red", "redSoft", 4.5, "chiffre en conflit, fond conflit"],
    ["ink", "givenBg", 4.5, "données de départ"],
    ["ink", "tealSoft", 4.5, "donnée sélectionnée"],
    ["ink", "yellowSoft", 4.5, "donnée en zone de plan"],
    ["onInk", "ink", 4.5, "bouton primaire"],
    ["onAccent", "teal", 4.5, "bouton accent / chip active"],
    ["teal", "surface", 4.5, "meilleurs temps (stats)"],
    ["hintInk", "hintBg", 4.5, "titres des cartes d'étape"],
    ["techInk", "yellowSoft", 4.5, "pastille technique"],
    ["warnInk", "warnBg", 4.5, "avertissements"],
    ["msgInfoFg", "msgInfoBg", 4.5, "bandeau info"],
    ["msgSuccessFg", "msgSuccessBg", 4.5, "bandeau succès"],
    ["gray", "surface", 3.0, "notes dans les cases (secondaire)"],
    ["iconMuted", "surface", 3.0, "✕ de fermeture (icône)"],
    ["faint", "paper", 3.0, "notes discrètes — décoratif, exempté 4.5"],
    ["faint", "surface", 3.0, "compteur de scans, mois du calendrier"],
  ];
  for (const [name, palette] of [["clair", C_LIGHT], ["sombre", C_DARK]]) {
    let worst = { r: 99 }, failures0 = failures;
    for (const [fg, bg, min, label] of PAIRS) {
      const r = contrastRatio(palette[fg], palette[bg]);
      ok(r >= min, `thème ${name} : ${fg}/${bg} = ${r.toFixed(2)} ≥ ${min} (${label})`);
      if (r < worst.r) worst = { r, fg, bg };
    }
    console.log(`  ℹ thème ${name} : pire paire ${worst.fg}/${worst.bg} à ${worst.r.toFixed(2)}${failures === failures0 ? "" : " — ÉCHECS ci-dessus"}`);
  }
}

/* ---------- 5l. i18n moteur : plans, descriptions et exercices en anglais ---------- */
console.log("i18n moteur (EN) :");
{
  ok(cellName(20) === "L3C3" && cellName(20, "en") === "R3C3" && cellName(20, "fr") === "L3C3",
    "cellName : L3C3 par défaut, R3C3 en anglais");

  // Un texte EN ne doit contenir ni gabarit FR ni notation LxCy.
  const FR_MARKERS = /(ligne|colonne|bloc |chiffre|case |L\d+C\d+|’ )/;
  const isEnglish = (s) => !FR_MARKERS.test(s);

  // Plans EN sur toutes les cases explicables de SAMPLES[0] : hint1/hint2/
  // paras/étapes/tech balayés d'un coup (singles + petites éliminations).
  const g0 = SAMPLES[0].split("").map(Number);
  let plansEn = 0, frLeaks = 0, rcSeen = 0;
  for (let i = 0; i < 81; i++) {
    if (g0[i] !== 0) continue;
    const p = buildPlan(g0, i, "en");
    if (!p) continue;
    plansEn++;
    const texts = [p.hint1, p.hint2, ...p.paras, p.tech, ...p.chain.map((s) => s.text), ...p.chain.map((s) => s.title)];
    if (!texts.every(isEnglish)) { frLeaks++; console.error("    fuite FR en", cellName(i, "en")); }
    if (texts.some((s) => /R\d+C\d+/.test(s))) rcSeen++;
  }
  ok(plansEn > 0, `${plansEn} plans générés en anglais`);
  ok(frLeaks === 0, "aucun gabarit FR dans les plans EN (hint1, hint2, paras, étapes, tech)");
  ok(rcSeen > 0, "la notation R3C7 apparaît dans les plans EN");
  // Les mêmes plans en FR restent inchangés (défaut).
  const pFr = buildPlan(g0, g0.indexOf(0), undefined);
  ok(pFr === null || /L\d+C\d+|ligne|colonne|bloc/.test([pFr.hint1, ...pFr.paras].join(" ")),
    "sans lang, les plans restent FR");

  // Chaîne de 2 pointantes (fixture 2b) : étapes + fil d'Ariane + indice 1 EN.
  const gRS = REPRO_STEPWISE.split("").map(Number);
  const pEn = buildPlan(gRS, 24, "en");
  ok(pEn && pEn.digit === 2 && pEn.chain.length === 2
    && pEn.chain.every((s) => s.title === "Pointing pair") && pEn.chain.every((s) => isEnglish(s.text)),
    "repro R3C7 : 2 étapes « Pointing pair » décrites en anglais");
  ok(techBreadcrumb(pEn, "en") === "2 × Pointing pair → Hidden single",
    "fil d'Ariane EN : « 2 × Pointing pair → Hidden single »");
  ok(stepHint1(pEn, "en").includes("first look for a **pointing pair** around"),
    "indice 1 EN : orientation anglaise (le concept restera FR jusqu'aux leçons EN)");

  // Les 15 éliminations : chaque branche describeElim EN via packageExercise
  // sur la position de la leçon (mêmes cands que la section 4).
  for (const L of LESSONS) {
    const kind = KIND_BY_LESSON[L.id];
    if (kind === "nakedSingle" || kind === "hiddenSingle") continue;
    const given = Array(81).fill(0);
    for (const [k, v] of Object.entries(L.given)) given[Number(k)] = v;
    const candsArr = Array.from({ length: 81 }, (_, i) => L.notes[i] || []);
    const cands = candsArr.map((a) => new Set(a));
    const prefer = new Set(Object.keys(L.removals).map(Number));
    const e = ELIM_FINDER_BY_KIND[kind](cands, prefer) || ELIM_FINDER_BY_KIND[kind](cands, null);
    ok(!!e, `${kind} : motif retrouvé pour le test EN`);
    if (!e) continue;
    const ex = packageExercise(kind, e, given, candsArr, "en");
    ok(isEnglish(ex.explain[0]) && /R\d+C\d+/.test(ex.explain[0]),
      `${kind} : explication EN (${ex.explain[0].slice(0, 42)}…)`);
    ok(ex.hint.startsWith("Look around "), `${kind} : indice EN (${ex.hint})`);
  }

  // getExercise de bout en bout en anglais (recherche réelle, seed fixe).
  const exEn = getExercise("pointing", { budgetMs: 1500, rng: makeRng(7001), lang: "en" });
  ok(!!exEn && isEnglish(exEn.explain.join(" ")) && isEnglish(exEn.hint),
    "getExercise(lang: en) : hint et explication en anglais");
}

/* ---------- 5m. Leçons EN : exhaustivité et fidélité mécanique ---------- */
console.log("Leçons EN :");
{
  const allEn = (L) => [L.en.title, L.en.concept, L.en.question, L.en.hint, ...L.en.steps].join(" ");
  ok(LESSONS.every((L) => L.en && L.en.title && L.en.concept && L.en.question && L.en.hint
    && Array.isArray(L.en.steps) && L.en.steps.every((s) => s.length > 0)),
    "chaque leçon a sa traduction complète (title, concept, question, hint, steps)");
  ok(LESSONS.every((L) => L.en.steps.length === L.steps.length), "même nombre de steps fr/en");
  ok(LESSONS.every((L) => !/L\d+C\d+/.test(allEn(L))), "notation : aucun LxCy résiduel en anglais");
  // Chaque RxCy EN doit exister en LxCy dans la leçon FR (mêmes numéros) : la
  // traduction ne peut ni inventer ni décaler une référence de case.
  let badRefs = 0;
  for (const L of LESSONS) {
    const frText = `${L.concept} ${L.question} ${L.hint} ${L.steps.join(" ")}`;
    const frRefs = new Set((frText.match(/L(\d+C\d+)/g) || []).map((m) => m.slice(1)));
    for (const m of allEn(L).match(/R(\d+C\d+)/g) || []) {
      if (!frRefs.has(m.slice(1))) { badRefs++; console.error(`    [${L.id}] référence inventée : R${m.slice(1)}`); }
    }
  }
  ok(badRefs === 0, "chaque RxCy EN correspond à un LxCy FR (aucune invention)");
  ok(LESSONS.every((L) => [L.en.concept, L.en.question, L.en.hint, ...L.en.steps]
    .every((s) => ((s.match(/\*\*/g) || []).length % 2) === 0)), "markdown ** équilibré dans chaque chaîne EN");
  ok(LESSONS.every((L) => L.en.title === TECH_NAMES[KIND_BY_LESSON[L.id]].en),
    "titres EN = TECH_NAMES.en (aucune dérive)");
  const FRISH = /( le | la | les | des | une | dans | chaque |é|è|ê|ç|à|ù)/;
  ok(LESSONS.every((L) => !FRISH.test(` ${allEn(L)} `)), "aucun français résiduel (heuristique accents + mots outils)");
  // L'indice 1 du coach devient 100 % anglais : conceptSentence lit L.en.
  const cs = conceptSentence("pointing", "en");
  ok(cs.length > 0 && !FRISH.test(` ${cs} `) && /[.!?]$/.test(cs),
    `conceptSentence EN : première phrase anglaise complète (${cs.slice(0, 48)}…)`);
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
  ok(!ex.explainCells || ex.explainCells.length === ex.explain.length,
    `${kind} : explainCells parallèle à explain`);
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
      // Vrai par construction (les singles sont épuisés avant chaque élim) —
      // figé ici. Sans objet pour nakedSingle/hiddenSingle : le single EST l'exercice.
      if (ex && kind !== "nakedSingle" && kind !== "hiddenSingle")
        ok(hasAnySingle(ex.given) === false, `${kind} (seed ${seed}) : aucun single posable`);
    }
    console.log(`  ℹ ${kind} : moyenne ${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms, notes brutes ${raw}/3`);
  }
  {
    const t0 = Date.now();
    const ex = findTechniqueExercise("xWing", { timeBoxMs: 8000, rng: makeRng(7) });
    ok(checkExercise("xWing", ex), "xWing : exercice trouvé (time-box 8 s)");
    if (ex) ok(hasAnySingle(ex.given) === false, "xWing : aucun single posable");
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
// Budget de TEST (8 s), découplé du budget de prod (1,5 s dans getExercise) :
// on valide ici la correction de la construction, pas la latence — la garantie
// utilisateur est couverte par la section 9 (repli transformation inclus).
// L'assert chrono n'attrape plus qu'une boucle infinie.
console.log("Génération constructive :");
for (const kind of ["xWing", "swordfish", "skyscraper", "kite", "remotePair"]) {
  const times = [];
  for (const seed of [101, 202, 303]) {
    const t0 = Date.now();
    const ex = buildConstructiveExercise(kind, { budgetMs: 8000, rng: makeRng(seed) });
    const dt = Date.now() - t0;
    times.push(dt);
    ok(checkExercise(kind, ex), `${kind} (seed ${seed}) : construit et validé (${dt} ms)`);
    ok(dt <= 8000, `${kind} (seed ${seed}) : ≤ 8 s`);
    if (ex) {
      const g = ex.given.map((v) => v);
      ok(solveGrid(g).count === 1, `${kind} (seed ${seed}) : solution unique`);
      ok(hasAnySingle(g) === false, `${kind} (seed ${seed}) : aucun single posable`);
      const givens = g.reduce((n, v) => n + (v !== 0), 0);
      ok(givens >= 28 && givens <= 50, `${kind} (seed ${seed}) : ${givens} givens ∈ [28, 50]`);
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
    if (!checkExercise(kind, ex)) allOk = false;
    if (ex) sources[ex.source] = (sources[ex.source] || 0) + 1;
  }
  ok(allOk, `${kind} : 5/5 exercices valides`);
  ok(times.every((t) => t <= 4000), `${kind} : chacun en ≤ 4 s (garantie produit)`);
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

  const daily = {
    done: { "2026-08-31": true, "2026-09-01": true },
    puzzles: { "2026-09-01": { grid: "1".repeat(81), solution: "2".repeat(81), level: 2, targetLevel: 2 } },
  };
  await persist(KEYS.daily, daily);
  ok(JSON.stringify((await loadAll())[KEYS.daily]) === JSON.stringify(daily),
    "KEYS.daily : round-trip persist/loadAll (réussites + grille du jour)");

  await persist(KEYS.settings, { hideTimer: true, theme: "auto", lang: "auto" });
  ok((await loadAll())[KEYS.settings].hideTimer === true, "KEYS.settings : round-trip persist/loadAll");

  const st = recordWin(recordStart(emptyStats(), "3"), { levelKey: "3", seconds: 421, hints: 1 });
  await persist(KEYS.stats, st);
  ok(JSON.stringify((await loadAll())[KEYS.stats]) === JSON.stringify(st),
    "KEYS.stats : round-trip persist/loadAll");

  backing.set(KEYS.scans, "6"); // valeur héritée de l'ancien code (brute, sans JSON)
  ok(readSync(KEYS.scans) === 6, "compteur hérité de l'ancien format relu tel quel");
  backing.set(KEYS.save, "{pas du json");
  ok((await loadAll())[KEYS.save] === null, "JSON corrompu → null (pas d'exception)");
  delete globalThis.localStorage;
}

/* ---------- 11. API /api/ocr : CORS pour le WebView natif ---------- */
console.log("API /api/ocr (CORS) :");
{
  // Déterministe et sans réseau : pas de clé API ni d'Upstash dans le test —
  // valeurs d'origine sauvegardées puis restaurées en fin de section.
  const ENV_KEYS = ["ANTHROPIC_API_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"];
  const savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
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

  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

console.log(`\n  ℹ temps total : ${((Date.now() - T0) / 1000).toFixed(1)} s`);
console.log(failures === 0 ? "\nTOUT EST OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
