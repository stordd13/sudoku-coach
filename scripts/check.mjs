/* Vérifications automatiques : moteur + leçons + exemples.
   Lancer : npm run check */
import {
  PEERS, BOXES, COLS, ROWS, candidatesFromGrid, allCands, conflictSet,
  findHiddenSingleFor, solveGrid, buildPlan, nextStep, stuckPanelKind, SAMPLES, cellName, rowOf, colOf,
  findXWingE, findSwordfishE, findSkyscraperE, findXYWingE, findRemotePairE,
  findXYZWingE, findWWingE, findKiteE, findEmptyRectangleE,
  findColoringE, findSueDeCoqE,
  snyderNotes,
  makeRng, generateFullGrid, solveHumanly, generatePuzzle, isComplete,
  findTechniqueExercise, ELIM_FINDER_BY_KIND, completedUnits,
  randomTransform, transformPosition, buildConstructiveExercise, hasAnySingle,
  packageExercise, TECH_TIER, UNIQUENESS_KINDS, solveHumanlySteps,
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
import { getExercise, KIND_BY_LESSON, LESSON_BY_KIND, lessonToRevise } from "../src/exercises.js";
import { techBreadcrumb, stepHint1, conceptSentence } from "../src/coachCopy.js";
import { notationFor, NOTATION_PREFS } from "../src/notation.js";
import { lessonStepScript, planStepScript, exerciseStepScript, stepReveal } from "../src/stepper.js";
import { GLOSSARY, lookupTerm, glossaryList } from "../src/glossary.js";

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
  // Mapping kind → leçon : exhaustif (chaque kind d'élimination + 2 singles,
  // via sa leçon propre ou la leçon mère) et conforme à la numérotation.
  const EXPECTED = {
    nakedSingle: 1, hiddenSingle: 2, nakedPair: 3, pointing: 4, claiming: 5,
    hiddenPair: 6, nakedTriple: 7, xWing: 8, xyWing: 9, swordfish: 10, skyscraper: 11,
    remotePair: 12, xyzWing: 13, wWing: 14, xyChain: 15, kite: 16, emptyRectangle: 17,
    uniqueRectangle: 18, bug1: 19, coloring: 20, sueDeCoq: 21,
  };
  const kinds = [...Object.keys(ELIM_FINDER_BY_KIND), "nakedSingle", "hiddenSingle"];
  ok(kinds.length === Object.keys(TECH_NAMES).length && kinds.every((k) => !!lessonToRevise(k)),
    `mapping exhaustif : chacun des ${kinds.length} kinds du moteur a sa leçon (propre ou à revoir)`);
  ok(Object.entries(EXPECTED).every(([k, n]) => LESSON_BY_KIND[k] && LESSON_BY_KIND[k].num === n),
    `numéros de leçon conformes (nakedSingle 1 … sueDeCoq ${LESSONS.length})`);

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

/* ---------- 2f. nextStep (👣) : une recherche globale par appui ---------- */
console.log("nextStep (👣) :");
{
  const PLAN_KEYS = ["kind", "target", "digit", "chain", "rawChain", "hint1", "hint2", "paras", "tech",
    "unitCells", "difficulty", "techKind", "chainKinds", "keyKind", "techZone"];
  const g0 = SAMPLES[0].split("").map(Number);
  const sol0 = solveGrid(g0).solution;
  for (const lang of ["fr", "en"]) {
    const p = nextStep(g0, lang);
    ok(!!p && PLAN_KEYS.every((k) => k in p), `${lang} : plan de la forme exacte de buildPlan (${PLAN_KEYS.length} clés)`);
    const ref = buildPlan(g0, p.target, lang);
    ok(ref && ref.digit === p.digit && ref.chain.length === 0 && p.chain.length === 0,
      `${lang} : palier 1 sur l'exemple 1 (${cellName(p.target, lang)} = ${p.digit}, chaîne vide, difficulté ${p.difficulty})`);
    ok(p.digit === sol0[p.target] && (p.difficulty === 1 || p.difficulty === 2), `${lang} : chiffre juste, difficulté 1 ou 2`);
  }
  const a = nextStep(g0), b = nextStep(g0);
  ok(a.target === b.target && a.digit === b.digit && a.techKind === b.techKind, "déterministe : deux appuis identiques");
  // Un état de milieu de partie : chaîne non vide, chiffre juste, keyKind d'un palier ≥ 2.
  const gs = REPRO_STEPWISE.split("").map(Number);
  const sols = solveGrid(gs).solution;
  const ps = nextStep(gs);
  ok(!!ps && ps.chain.length > 0 && ps.rawChain.length === ps.chain.length && ps.digit === sols[ps.target]
    && ps.chainKinds.every((k) => TECH_TIER[k] >= 2),
    `REPRO_STEPWISE : ${cellName(ps ? ps.target : 0)} = ${ps ? ps.digit : "?"} après ${ps ? ps.chain.length : 0} élimination(s) (${ps ? ps.chainKinds.join("+") : ""})`);
  ok(!!ps && ps.chain.every((st, i) => st.title && st.text && Array.isArray(st.cells) && Array.isArray(ps.rawChain[i].removals)),
    "REPRO_STEPWISE : chaque étape porte title/text/cells et ses removals bruts (stepper)");
  // Précondition d'unicité, en jouant des parties entières sur 20 fixtures du banc.
  const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
  let leaks = 0, games = 0;
  for (const f of FIX.slice(0, 20)) {
    const g = f.grid.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
    for (let guard = 0; guard < 81; guard++) {
      const p = nextStep(g, "fr", { allowUniqueness: false });
      if (!p) break;
      if (p.chainKinds.some((k) => UNIQUENESS_KINDS.has(k))) leaks++;
      g[p.target] = p.digit;
    }
    games++;
  }
  ok(leaks === 0, `allowUniqueness:false → jamais de rectangle unique / BUG+1 dans ${games} parties jouées par nextStep`);
  // Grille pleine ou sans single ni élimination : null, sans exception.
  ok(nextStep(sol0) === null, "grille pleine → null");
}

/* ---------- 2g. Worker du coach : même plan via handleRequest + structuredClone ---------- */
console.log("Worker du coach (répartiteur pur) :");
{
  const { handleRequest } = await import("../src/coachWorker.js");
  const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
  const parse = (g) => g.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
  // 10 états : 5 grilles de départ + 5 états de partie (après 15 coups de 👣).
  const states = FIX.slice(0, 5).map((f) => parse(f.grid));
  for (const f of FIX.slice(5, 10)) {
    const w = parse(f.grid);
    for (let k = 0; k < 15; k++) { const p = nextStep(w); if (!p) break; w[p.target] = p.digit; }
    states.push(w);
  }
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  let okNext = 0, okAim = 0;
  for (const g of states) {
    const r = handleRequest({ id: 7, fn: "nextStep", args: [g, "fr", { allowUniqueness: true }] });
    if (r.id === 7 && !("error" in r) && same(structuredClone(r.result), nextStep(g, "fr", { allowUniqueness: true }))) okNext++;
    const cell = g.findIndex((v) => v === 0);
    const a = handleRequest({ id: 8, fn: "buildPlan", args: [g, cell, "en", { allowUniqueness: true }] });
    if (a.id === 8 && !("error" in a) && same(structuredClone(a.result), buildPlan(g, cell, "en", { allowUniqueness: true }))) okAim++;
  }
  ok(okNext === states.length, `nextStep via handleRequest + structuredClone == appel direct (${okNext}/${states.length} états)`);
  ok(okAim === states.length, `buildPlan via handleRequest + structuredClone == appel direct (${okAim}/${states.length} états)`);
  ok(handleRequest({ id: 1, fn: "nope", args: [] }).error && handleRequest({}).error && handleRequest({ id: 2, fn: "nextStep", args: null }).error,
    "fn inconnue, requête vide ou args absents → { error }, jamais d'exception");
  // maxTier : un null à 4 suivi d'un appel complet == appel complet direct (identité du client).
  const g = parse(FIX.find((f) => f.id === "reddit-2026").grid);
  const w = g.slice();
  let tier5State = null;
  for (let k = 0; k < 81; k++) {
    const p4 = nextStep(w, "fr", { maxTier: 4 });
    if (!p4) { tier5State = w.slice(); break; }
    w[p4.target] = p4.digit;
  }
  ok(!!tier5State, "grille Reddit : un état exige le palier 5 (nextStep à maxTier 4 rend null)");
  const full = tier5State && nextStep(tier5State);
  ok(full && TECH_TIER[full.keyKind] === 5 && same(full, handleRequest({ id: 3, fn: "nextStep", args: [tier5State, "fr", {}] }).result),
    `… l'appel complet y trouve un plan de palier 5 (${full && full.keyKind}), identique via le répartiteur`);
  const cell0 = SAMPLES[1].split("").map(Number).findIndex((v) => v === 0);
  const p2 = buildPlan(SAMPLES[1].split("").map(Number), cell0, "fr", { maxTier: 2 });
  ok(!p2 || p2.chainKinds.every((k) => TECH_TIER[k] <= 2), "buildPlan maxTier 2 : jamais de technique au-delà du palier 2");
  ok(same(nextStep(g, "fr", { maxTier: 5 }), nextStep(g)), "maxTier 5 (défaut) == appel sans option");
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
  } else if (L.id === "triples") {
    // Triplet nu {1,2,3} en L5C1/L5C4/L5C8 ; conclusion : single caché du 1 en colonne 2.
    const union = new Set(L.focus.flatMap((f) => L.notes[f] || []));
    ok(L.focus.length === 3 && union.size === 3, "trois cases focus, trois chiffres en tout");
    const others = ROWS[4].filter((i) => !L.focus.includes(i) && L.notes[i]);
    ok(others.length === 3 && others.every((i) => (L.removals[i] || []).some((d) => union.has(d))),
      "chacune des trois autres cases de la ligne perd un chiffre du triplet");
    const left = COLS[1].filter((i) => {
      const shown = (L.notes[i] || []).filter((d) => !(L.removals[i] || []).includes(d));
      return shown.includes(L.answer);
    });
    ok(left.length === 1 && left[0] === L.target,
      `après nettoyage, le ${L.answer} n'a plus qu'une place en colonne 2 → ${cellName(L.target)}`);
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
  const nLinks = (pl) => pl.chain.reduce((n, st) => n + (Array.isArray(st.links) ? st.links.length : 0), 0);
  ok(sP && sP.length === plan.chain.length + nLinks(plan) + 1 && sP[sP.length - 1].conclusion,
    `plan R3C7 : ${plan.chain.length} maillons (+ ${nLinks(plan)} liens) + 1 conclusion`);
  const rawNorm = (i) => {
    const out = {};
    for (const r of plan.rawChain[i].removals) out[r.cell] = [...new Set([...(out[r.cell] || []), ...r.digits])].sort((a, b) => a - b);
    return out;
  };
  ok(sP.slice(0, -1).every((s) => s.linkIx !== null || JSON.stringify(s.strikes) === JSON.stringify(rawNorm(s.chainIx))),
    "strikes de l'étape d'un maillon == removals de rawChain[chainIx]");
  // Un lien par étape : plan synthétique à 2 maillons, 2 liens sur le premier.
  {
    const syn = {
      kind: "ok", unitCells: [0, 1, 2],
      chain: [{ cells: [1, 2], links: [{ cells: [1], text: "a" }, { cells: [1, 2], text: "b" }] }, { cells: [3] }],
      rawChain: [{ removals: [{ cell: 5, digits: [6] }] }, { removals: [{ cell: 7, digits: [1] }] }],
    };
    const sc = planStepScript(syn);
    ok(sc && sc.length === 5 && JSON.stringify(sc.map((x) => [x.chainIx, x.linkIx])) === JSON.stringify([[0, 0], [0, 1], [0, null], [1, null], [null, null]]),
      "un lien par étape : [0,0] [0,1] [0,∅] [1,∅] puis conclusion");
    ok(sc[0].cells.join() === "1" && sc[1].cells.join() === "1,2" && Object.keys(sc[0].strikes).length === 0 && Object.keys(sc[1].strikes).length === 0,
      "étapes de lien : cases du lien, aucun strike");
    ok(JSON.stringify(sc[2].strikes) === JSON.stringify({ 5: [6] }) && JSON.stringify(sc[3].strikes) === JSON.stringify({ 7: [1] }) && sc[4].conclusion && !sc[3].conclusion,
      "étapes de maillon : removals normalisés ; la conclusion en dernier");
    ok(stepReveal(sc, 1).cells.has(2) && !stepReveal(sc, 1).cells.has(3) && sameStrikes(stepReveal(sc, 3).struckPast, { 5: new Set([6]) }),
      "stepReveal : le lien courant surligne ses cases, les strikes des maillons passés s'accumulent");
  }
  // Invariant sur de vrais plans : longueur = maillons + liens + 1, chainIx croissant,
  // et au moins une chaîne à liens (X-Chain / XY-Chain) rencontrée sur les fixtures.
  {
    const FIXS = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
    const plans = [];
    const g0 = SAMPLES[0].split("").map(Number);
    g0.forEach((v, i) => { if (!v) { const pl = buildPlan(g0, i); if (pl) plans.push(pl); } });
    let withLinks = 0;
    for (const f of FIXS) {
      if (withLinks >= 2) break;
      const w = f.grid.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
      for (let guard = 0; guard < 81 && withLinks < 2; guard++) {
        const pl = nextStep(w);
        if (!pl) break;
        if (nLinks(pl)) { plans.push(pl); withLinks++; }
        w[pl.target] = pl.digit;
      }
    }
    const good = plans.every((pl) => {
      const sc = planStepScript(pl);
      if (!pl.chain.length) return sc === null;
      const mono = sc.every((x, i) => i === 0 || x.chainIx === null || x.chainIx >= sc[i - 1].chainIx);
      const linkCells = sc.every((x) => x.linkIx === null || JSON.stringify(x.cells) === JSON.stringify(pl.chain[x.chainIx].links[x.linkIx].cells));
      return sc.length === pl.chain.length + nLinks(pl) + 1 && mono && linkCells;
    });
    ok(good && withLinks >= 1, `invariant du script sur ${plans.length} plans réels (dont ${withLinks} chaînes à liens) : maillons + liens + 1, chainIx croissant, cases du lien`);
  }
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

/* ---------- 3g. Glossaire « Les mots du sudoku » ---------- */
console.log("Glossaire :");
{
  ok(GLOSSARY.length >= 12, `au moins 12 termes (${GLOSSARY.length})`);
  const incomplete = GLOSSARY.filter((g) =>
    !g.id || !g.fr || !g.en || !g.fr.term || !g.fr.def || !g.en.term || !g.en.def);
  ok(incomplete.length === 0, "chaque entrée a id + term/def dans les deux langues");
  // Une définition = UNE phrase (une seule ponctuation forte, à la fin).
  const multi = GLOSSARY.filter((g) => [g.fr.def, g.en.def].some((d) => {
    const strong = d.match(/[.!?](?!\s*»?\s*$)/g); // ponctuation forte non finale
    return strong !== null || !/[.!?]\s*»?\s*$/.test(d);
  }));
  ok(multi.length === 0, `une seule phrase par définition${multi.length ? ` (${multi.map((g) => g.id).join(",")})` : ""}`);
  ok(GLOSSARY.every((g) => lookupTerm(g.fr.term, "fr") && lookupTerm(g.en.term, "en")),
    "lookupTerm retrouve chaque terme dans sa langue");
  ok(GLOSSARY.every((g) => (g.fr.aliases || []).every((a) => lookupTerm(a, "fr"))
    && (g.en.aliases || []).every((a) => lookupTerm(a, "en"))),
    "lookupTerm retrouve chaque alias");
  ok(lookupTerm("Candidat", "fr") && lookupTerm("CANDIDATE", "en") && lookupTerm("inconnu-xyz", "fr") === null,
    "insensible à la casse ; inconnu → null");
  ok(glossaryList("fr").length === GLOSSARY.length && glossaryList("en").length === GLOSSARY.length
    && glossaryList("fr").every((e) => e.term && e.def),
    "glossaryList expose term + def dans les deux langues");
  // Chaque [[…]] rencontré dans les leçons existe dans le glossaire (fr et en).
  let unknown = [];
  for (const L of LESSONS) {
    const scan = (texts, lg) => {
      for (const s of texts) {
        for (const m of String(s).matchAll(/\[\[(.+?)\]\]/g)) {
          if (!lookupTerm(m[1], lg)) unknown.push(`${L.id}/${lg}:[[${m[1]}]]`);
        }
      }
    };
    scan([L.concept, L.question, L.hint, ...L.steps], "fr");
    if (L.en) scan([L.en.concept, L.en.question, L.en.hint, ...(L.en.steps || [])], "en");
  }
  ok(unknown.length === 0, `chaque [[terme]] des leçons est au glossaire${unknown.length ? ` (${unknown.join(" · ")})` : ""}`);
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

/* ---------- 4b. Palier A (v2.3) : motifs isolés, positif ET négatif ---------- */
console.log("Palier A (v2.3) :");
{
  const S = (...d) => new Set(d);
  const empty = () => Array.from({ length: 81 }, () => new Set());
  const idx = (r, c) => r * 9 + c;
  const hit = (e, cell, d) => !!e && e.removals.some((x) => x.cell === cell && x.digits.includes(d));
  const lessonById = (id) => LESSONS.find((l) => l.id === id);
  const fromNotes = (notes) => {
    const g = empty();
    for (const [k, arr] of Object.entries(notes)) g[Number(k)] = new Set(arr);
    return g;
  };
  const F = ELIM_FINDER_BY_KIND;
  const NEW_KINDS = ["nakedTriple", "hiddenTriple", "nakedQuad", "hiddenQuad"];
  const PALIER_A = [...NEW_KINDS, "finnedXWing", "jellyfish", "xChain", "xyChain", "uniqueRectangle", "bug1"];
  ok(PALIER_A.every((k) => typeof F[k] === "function"), `finders du palier A branchés : ${PALIER_A.join(", ")}`);

  // Triplet nu : la leçon (ligne 5) et un cas presque valide (union de 4 chiffres).
  {
    const e = F.nakedTriple(fromNotes(lessonById("triples").notes), null);
    ok(e && e.kind === "nakedTriple" && hit(e, idx(4, 1), 1) && hit(e, idx(4, 4), 2) && hit(e, idx(4, 8), 3)
      && e.cells.join() === [idx(4, 0), idx(4, 3), idx(4, 7)].join(),
      "triplet nu de la leçon : retire 1 de L5C2, 2 de L5C5, 3 de L5C9");
    const g = empty();
    g[idx(0, 0)] = S(1, 2); g[idx(0, 1)] = S(2, 3); g[idx(0, 2)] = S(3, 4); g[idx(0, 5)] = S(1, 4, 9);
    ok(F.nakedTriple(g, null) === null, "négatif : trois cases à quatre chiffres ne font pas un triplet nu");
  }
  // Triplet caché : la même position lue à l'envers ; négatif : un chiffre déborde.
  {
    const e = F.hiddenTriple(fromNotes(lessonById("triples").notes), null);
    ok(e && e.kind === "hiddenTriple" && e.digits.join() === "4,5,6" && hit(e, idx(4, 1), 1) && hit(e, idx(4, 7 + 1), 3),
      "triplet caché {4,5,6} de la leçon : mêmes éliminations");
    const g = fromNotes(lessonById("triples").notes);
    g[idx(4, 0)] = S(1, 2, 4); // le 4 a maintenant une 3e place hors des trois cases
    ok(F.hiddenTriple(g, null) === null, "négatif : un chiffre du triplet caché qui déborde annule le motif");
  }
  // Quadruplet nu : {1,2,3,4} sur quatre cases d'une colonne ; négatif : union de 5.
  {
    const g = empty();
    g[idx(0, 0)] = S(1, 2); g[idx(2, 0)] = S(2, 3); g[idx(4, 0)] = S(3, 4); g[idx(6, 0)] = S(1, 4);
    g[idx(8, 0)] = S(2, 5, 7);
    const e = F.nakedQuad(g, null);
    ok(e && e.kind === "nakedQuad" && hit(e, idx(8, 0), 2) && e.removals.length === 1,
      "quadruplet nu en colonne 1 : retire le 2 de L9C1");
    g[idx(6, 0)] = S(1, 4, 6);
    ok(F.nakedQuad(g, null) === null, "négatif : quatre cases à cinq chiffres ne font pas un quadruplet nu");
  }
  // Quadruplet caché : {1,2,3,4} confinés à quatre cases d'un bloc, le reste
  // du bloc porte 5..9 ; négatif : le 1 déborde sur une 5e case.
  {
    const g = empty();
    const cells = [idx(0, 0), idx(0, 1), idx(1, 0), idx(1, 1)];
    g[cells[0]] = S(1, 2, 5); g[cells[1]] = S(2, 3, 6); g[cells[2]] = S(3, 4, 7); g[cells[3]] = S(4, 1, 8);
    g[idx(2, 2)] = S(5, 6, 7, 8, 9); g[idx(2, 0)] = S(5, 9); g[idx(2, 1)] = S(6, 9);
    g[idx(0, 2)] = S(7, 9); g[idx(1, 2)] = S(8, 9);
    const e = F.hiddenQuad(g, null);
    ok(e && e.kind === "hiddenQuad" && e.digits.join() === "1,2,3,4" && hit(e, cells[0], 5) && hit(e, cells[3], 8),
      "quadruplet caché {1,2,3,4} dans le bloc haut-gauche : nettoie les extras");
    g[idx(2, 2)] = S(1, 5, 6, 7, 8, 9);
    ok(F.hiddenQuad(g, null) === null, "négatif : un chiffre du quadruplet caché qui déborde annule le motif");
  }
  // X-Wing à nageoire : lignes 1 et 5, colonnes 2 et 6, nageoire L5C4 (bloc
  // central) → seule la case du bloc central dans la colonne 6 perd le 4.
  {
    const g = empty();
    g[idx(0, 1)] = S(4, 8); g[idx(0, 5)] = S(4, 9); g[idx(4, 1)] = S(4, 6); g[idx(4, 5)] = S(4, 5);
    g[idx(4, 3)] = S(4, 7); // la nageoire
    g[idx(3, 5)] = S(2, 4); // victime : bloc central, colonne 6
    g[idx(7, 5)] = S(3, 4); // hors du bloc de la nageoire : épargnée
    const e = F.finnedXWing(g, null);
    ok(e && e.kind === "finnedXWing" && e.fins.join() === String(idx(4, 3)) && hit(e, idx(3, 5), 4)
      && e.removals.length === 1, "X-Wing à nageoire : retire le 4 de L4C6 seulement (bloc de la nageoire)");
    ok(F.xWing(g, null) === null, "le X-Wing pur ne voit pas ce motif (la nageoire l'empêche)");
    // Sashimi : le coin L5C6 disparaît, la nageoire reste → même élimination.
    g[idx(4, 5)] = S(5);
    const s = F.finnedXWing(g, null);
    ok(s && hit(s, idx(3, 5), 4), "sashimi : sans le coin L5C6, la nageoire suffit encore");
    // Négatifs : nageoires dans deux blocs différents ; aucune nageoire.
    g[idx(4, 5)] = S(4, 5); g[idx(4, 7)] = S(1, 4);
    ok(F.finnedXWing(g, null) === null, "négatif : deux nageoires dans deux blocs → rien");
    const pure = empty();
    [[0, 1], [0, 5], [4, 1], [4, 5]].forEach(([r, c]) => (pure[idx(r, c)] = S(4)));
    pure[idx(2, 1)] = S(4, 7);
    ok(F.finnedXWing(pure, null) === null && !!F.xWing(pure, null), "négatif : sans nageoire, c'est un X-Wing, pas un X-Wing à nageoire");
  }
  // Jellyfish : le 5 sur 4 lignes tient dans 4 colonnes ; négatif : 5 colonnes.
  {
    const g = empty();
    const rows = [0, 2, 5, 8], cols = [1, 3, 6, 7];
    for (const r of rows) for (const c of cols) g[idx(r, c)] = S(5, 9);
    g[idx(4, 3)] = S(1, 5); g[idx(6, 7)] = S(2, 5);
    const e = F.jellyfish(g, null);
    ok(e && e.kind === "jellyfish" && hit(e, idx(4, 3), 5) && hit(e, idx(6, 7), 5) && e.removals.length === 2,
      "Jellyfish : retire le 5 de L5C4 et L7C8");
    ok(F.swordfish(g, null) === null, "le Swordfish ne voit pas ce motif à 4 lignes");
    g[idx(2, 0)] = S(5, 8); // la ligne 3 déborde sur une 5e colonne
    ok(F.jellyfish(g, null) === null, "négatif : cinq colonnes ne font pas un Jellyfish");
  }
  ok(TECH_TIER.finnedXWing === 4 && TECH_TIER.jellyfish === 4, "X-Wing à nageoire et Jellyfish : palier 4");
  // X-Chain : six 7 reliés par des liens forts (ligne 1, colonne 5, ligne 4,
  // colonne 9, ligne 7, bloc haut-gauche) ; une chaîne de 5 liens élimine le
  // 7 d'une case qui voit ses deux extrémités.
  {
    const g = empty();
    g[idx(0, 0)] = S(1, 7); g[idx(0, 4)] = S(2, 7); g[idx(3, 4)] = S(3, 7); g[idx(3, 8)] = S(4, 7);
    g[idx(6, 8)] = S(5, 7); g[idx(6, 2)] = S(6, 7); g[idx(1, 2)] = S(7, 9);
    const e = F.xChain(g, null);
    const alternates = (links) => links.every((l, i) => l.strong === (i % 2 === 0));
    ok(e && e.kind === "xChain" && e.links.length === 5 && alternates(e.links)
      && e.chain.length === 6 && new Set(e.chain).size === 6 && e.removals.length === 1
      && hit(e, idx(0, 4), 7) && !e.chain.includes(idx(0, 4)),
      "X-Chain de 5 liens (fort, faible, fort, faible, fort) : retire le 7 hors de la chaîne");
    ok(e && e.linkUnits.length === 3 && e.linkUnits.every((u) => u && u.cells), "X-Chain : une unité par lien fort (prémisses de pruneChain)");
    // Plus courte d'abord : avec un lien direct, une chaîne de 3 prime.
    g[idx(1, 4)] = S(7, 8); g[idx(0, 4)] = S(2); // le 7 quitte L1C5 : bloc haut-centre = {L2C5}, colonne 5 = {L2C5, L4C5}
    const e3 = F.xChain(g, null);
    ok(!e3 || e3.links.length <= 5, "X-Chain : jamais plus longue que nécessaire");
    // Négatif : boucle fermée de quatre 7 sans case extérieure → rien à éliminer.
    const h = empty();
    h[idx(0, 0)] = S(1, 7); h[idx(0, 4)] = S(2, 7); h[idx(3, 4)] = S(3, 7); h[idx(3, 0)] = S(4, 7);
    ok(F.xChain(h, null) === null, "négatif : boucle fermée de quatre cases, aucune case extérieure → rien");
  }
  ok(TECH_TIER.xChain === 4, "X-Chain : palier 4");
  // XY-Chain : la leçon (4 bivalues de L1C1 à L4C9, z = 3) ; propriétés de la
  // chaîne ; la plus courte d'abord ; négatif : l'extrémité ne rend pas z.
  {
    const L = lessonById("xy-chain");
    const e = F.xyChain(fromNotes(L.notes), new Set([8, 27]));
    ok(e && e.kind === "xyChain" && e.z === 3 && e.chain.length === 4 && hit(e, 8, 3) && hit(e, 27, 3)
      && e.removals.length === 2, "XY-Chain de la leçon : retire le 3 de L1C9 et L4C1");
    ok(e && e.carried[e.carried.length - 1] === e.z && e.carried[0] !== e.z
      && e.chain.every((c, k) => k === 0 || PEERS[c].has(e.chain[k - 1])),
      "XY-Chain : chaque case voit la précédente, le chiffre porté revient à z au bout");
    ok(F.xyWing(fromNotes(L.notes), null) === null, "la leçon XY-Chain ne contient aucun XY-Wing (pas de sous-chaîne de 3)");
    // Plus courte d'abord : un XY-Wing présent est rendu comme chaîne de 3.
    const w = fromNotes(lessonById("xy-wing").notes);
    const e3 = F.xyChain(w, null);
    ok(e3 && e3.chain.length === 3, "XY-Chain : sur la position XY-Wing, une chaîne de 3 cases (jamais plus)");
    const g = empty();
    g[idx(0, 0)] = S(3, 5); g[idx(0, 4)] = S(5, 7); g[idx(3, 4)] = S(7, 9); g[idx(3, 0)] = S(3, 6);
    ok(F.xyChain(g, null) === null, "négatif : chaîne dont l'extrémité ne rend pas z → rien");
  }
  ok(TECH_TIER.xyChain === 4, "XY-Chain : palier 4");
  // Rectangle unique : type 1 (leçon), puis types 2, 4, 3 synthétiques ;
  // négatifs : quatre blocs, coin résolu, toits en diagonale.
  {
    const L = lessonById("unique-rectangle");
    const e1 = F.uniqueRectangle(fromNotes(L.notes), null);
    ok(e1 && e1.type === 1 && hit(e1, 13, 3) && hit(e1, 13, 8) && e1.removals.length === 1,
      "rectangle unique type 1 (leçon) : retire 3 et 8 de L2C5");
    const g = empty();
    g[idx(0, 0)] = S(3, 8); g[idx(0, 4)] = S(3, 8); g[idx(1, 0)] = S(3, 6, 8); g[idx(1, 4)] = S(3, 6, 8); g[idx(1, 2)] = S(6, 9);
    const e2 = F.uniqueRectangle(g, null);
    ok(e2 && e2.type === 2 && e2.extra === 6 && hit(e2, idx(1, 2), 6) && e2.removals.length === 1,
      "type 2 : les toits partagent l'extra 6, L2C3 le perd");
    const h = empty();
    h[idx(0, 0)] = S(3, 8); h[idx(0, 4)] = S(3, 8); h[idx(1, 0)] = S(3, 6, 8); h[idx(1, 4)] = S(3, 8, 9); h[idx(1, 7)] = S(1, 8);
    const e4 = F.uniqueRectangle(h, null);
    ok(e4 && e4.type === 4 && e4.locked === 3 && hit(e4, idx(1, 0), 8) && hit(e4, idx(1, 4), 8),
      "type 4 : le 3 de la ligne 2 est confiné aux toits, le 8 les quitte");
    const k = empty();
    k[idx(0, 0)] = S(3, 8); k[idx(0, 4)] = S(3, 8); k[idx(1, 0)] = S(3, 6, 8); k[idx(1, 4)] = S(3, 8, 9);
    k[idx(1, 7)] = S(6, 9); k[idx(1, 2)] = S(1, 3, 6); k[idx(1, 6)] = S(2, 8, 9);
    const e3 = F.uniqueRectangle(k, null);
    ok(e3 && e3.type === 3 && e3.extras.join() === "6,9" && e3.partner === idx(1, 7) && hit(e3, idx(1, 2), 6) && hit(e3, idx(1, 6), 9),
      "type 3 : toits {6,9} + bivalue L2C8 = paire nue virtuelle, la ligne 2 se nettoie");
    const n = empty();
    n[idx(0, 0)] = S(3, 8); n[idx(0, 4)] = S(3, 8); n[idx(3, 0)] = S(3, 8); n[idx(3, 4)] = S(3, 6, 8);
    ok(F.uniqueRectangle(n, null) === null, "négatif : rectangle sur quatre blocs → rien");
    const m = empty();
    m[idx(0, 0)] = S(3, 8); m[idx(0, 4)] = S(3, 8); m[idx(1, 0)] = S(3); m[idx(1, 4)] = S(3, 6, 8);
    ok(F.uniqueRectangle(m, null) === null, "négatif : un coin résolu → rien");
    const d = empty();
    d[idx(0, 0)] = S(3, 8); d[idx(0, 4)] = S(3, 6, 8); d[idx(1, 0)] = S(3, 6, 8); d[idx(1, 4)] = S(3, 8); d[idx(1, 2)] = S(6, 9);
    ok(F.uniqueRectangle(d, null) === null, "négatif : toits en diagonale → pas de type 2");
  }
  ok(TECH_TIER.uniqueRectangle === 4 && UNIQUENESS_KINDS.has("uniqueRectangle"), "rectangle unique : palier 4, précondition d'unicité");
  // BUG+1 : la leçon (fin de partie réelle, L2C7 = 7) ; négatifs : deux cases
  // trivalues, un chiffre présent quatre fois dans une unité.
  {
    const L = lessonById("bug-plus-one");
    const e = F.bug1(fromNotes(L.notes), null);
    ok(e && e.kind === "bug1" && e.cell === 15 && e.digit === 7 && hit(e, 15, 1) && hit(e, 15, 3) && e.removals.length === 1,
      "BUG+1 de la leçon : L2C7 porte le 7, le 1 et le 3 s'effacent");
    const g = fromNotes(L.notes);
    g[16] = S(1, 3, 9);
    ok(F.bug1(g, null) === null, "négatif : deux cases à trois candidats → rien");
    const h = fromNotes(L.notes);
    h[9] = S(3, 9); // le 9 apparaît maintenant 3 fois en ligne 2 sans être dans la trivalue, le 7 n'y est plus que 2 fois
    ok(F.bug1(h, null) === null, "négatif : un chiffre déséquilibré hors de la case trivalue → rien");
  }
  ok(TECH_TIER.bug1 === 4 && UNIQUENESS_KINDS.has("bug1"), "BUG+1 : palier 4, précondition d'unicité");
  // ---- Palier B (v2.4) : AIC — type 1 (6 nœuds), négatif (lien faible manquant), type 2.
  // Note : une AIC de 4 nœuds non réductible à une pointante/réduction n'existe
  // pas (une paire bilocale vue de l'extérieur est alignée dans un bloc) ;
  // le plus petit cas réel est à 6 nœuds.
  {
    const g = empty();
    g[idx(0, 0)] = S(2, 6, 9); g[idx(1, 1)] = S(4, 6, 7); g[idx(1, 7)] = S(4, 8, 9); g[idx(6, 7)] = S(4, 6); g[idx(6, 0)] = S(5, 6);
    const e = F.aic(g, null);
    const isUnit = (v, type, index) => !!v && v.type === type && v.index === index;
    ok(e && e.kind === "aic" && e.type === 1 && e.z === 6 && e.chain.length === 6 && e.links.length === 5
      && e.cells.join() === [0, 10, 16, 61].join() && e.removals.length === 1 && hit(e, idx(6, 0), 6),
      "AIC type 1 : 6 nœuds L1C1→L2C2→L2C8→L7C8, retire le 6 de L7C1");
    ok(e && e.links.every((l, i) => l.strong === (i % 2 === 0)) && isUnit(e.links[0].via, "box", 0) && e.links[1].via === "cell"
      && isUnit(e.links[2].via, "row", 1) && e.links[3].via === "peer" && e.links[4].via === "cell",
      "AIC : liens fort/faible alternés — bloc, même case, ligne, voisines, bivalue");
    ok(e && e.linkUnits.length === 2 && e.linkUnits.every((u) => u && u.cells) && e.ends.join() === "0,61",
      "AIC : unités des liens forts bilocaux (prémisses de pruneChain), extrémités");
    ok(F.xChain(g, null) === null && F.xyChain(g, null) === null && F.coloring(g, null) === null && F.pointing(g, null) === null,
      "rien de plus simple ne s'applique (X-Chain, XY-Chain, coloriage, pointante)");
    const n = g.map((x) => new Set(x)); n[idx(6, 7)] = S(6, 8);
    ok(F.aic(n, null) === null, "négatif : lien faible manquant (L7C8 sans 4) → chaîne rompue, rien");
    const g2 = g.map((x) => new Set(x)); g2[idx(1, 4)] = S(1, 4);
    const e2 = F.aic(g2, null);
    ok(e2 && e2.type === 2 && e2.x === 6 && e2.y === 4 && e2.cells.join() === [10, 0, 54, 61, 16].join()
      && e2.removals.length === 1 && hit(e2, idx(1, 1), 4),
      "AIC type 2 : extrémités L2C2 (6) et L2C8 (4) se voient, L2C2 perd le 4");
    ok(F.aic(g, null) && JSON.stringify(F.aic(g, null)) === JSON.stringify(e), "AIC : déterministe (deux appels identiques)");
  }
  // Liens groupés : état réel (hardest-08, 10e élimination du gradeur) où la
  // chaîne passe par le groupe {L5C8, L5C9} sur le 4 ; négatif : un 4 de plus
  // sur une 3e ligne du bloc éclate le groupe (trois morceaux → pas de lien).
  {
    const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
    const f = FIX.find((x) => x.id === "hardest-08");
    const grid = f.grid.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
    const { solution } = solveGrid(grid);
    let state = null;
    solveHumanlySteps(grid, (st) => {
      if (st.type === "elim" && st.e.kind === "aic" && st.e.chain.some((n) => n.cell === null)) state = st.cands.map((a) => new Set(a));
      return !!state;
    }, 5);
    const e = state && F.aic(state, null);
    const grp = e && e.chain.find((n) => n.cell === null);
    ok(!!grp && grp.cells.join() === "43,44" && grp.digit === 4 && e.type === 1 && e.z === 6 && hit(e, 55, 6)
      && e.chain[0].cell === 37 && e.chain[e.chain.length - 1].cell === 60,
      "AIC groupée (hardest-08) : L5C2 → {L5C8, L5C9} → L6C7 → L7C7 sur 4 puis 6, L7C2 perd le 6");
    ok(e && e.removals.every((r) => !r.digits.includes(solution[r.cell])) && e.links.some((l) => l.strong && l.from.cell === null && l.via.type === "box")
      && e.links.some((l) => !l.strong && l.to.cell === null && l.via === "peer"),
      "AIC groupée : lien faible case→groupe (même ligne), lien fort groupe→case lu dans le bloc, élimination compatible avec la solution");
    ok(e && e.chain.every((n) => n.cell !== null || (n.cells.length >= 2 && n.cells.length <= 3)) && e.ends.every((c) => typeof c === "number"),
      "AIC groupée : groupes de 2-3 cases, extrémités simples");
    const n = state.map((x) => new Set(x)); n[idx(3, 6)] = new Set([...n[idx(3, 6)], 4]);
    const e2 = F.aic(n, null);
    ok(!e2 || !e2.chain.some((x) => x.cell === null && x.cells.join() === "43,44"),
      "négatif : un 4 de plus en L4C7 éclate le groupe {L5C8, L5C9} du bloc (trois lignes) → plus de lien groupé");
  }
  // ALS-XZ : A = {L1C1, L1C2, L1C3} (ligne 1, {1,2,4,7}), B = {L2C1, L2C5}
  // (ligne 2, {2,4,8}), 2 commun restreint (L2C1 voit L1C2 et L1C3), z = 4 :
  // L2C3 voit L1C1, L1C3, L2C1 et L2C5 → perd le 4. Négatif : la case à 2 de
  // B part en L2C7, elle ne voit plus L1C2 : 2 n'est plus restreint.
  {
    const g = empty();
    g[idx(0, 0)] = S(1, 4, 7); g[idx(0, 1)] = S(1, 2, 7); g[idx(0, 2)] = S(2, 4, 7); g[idx(0, 4)] = S(2, 5, 9); g[idx(0, 6)] = S(4, 5);
    g[idx(1, 0)] = S(2, 4, 8); g[idx(1, 4)] = S(4, 8); g[idx(1, 2)] = S(4, 9); g[idx(6, 0)] = S(4, 6); g[idx(7, 2)] = S(4, 6);
    const e = F.alsXz(g, null);
    ok(e && e.kind === "alsXz" && e.a.cells.join() === "0,1,2" && e.b.cells.join() === "9,13" && e.x === 2 && e.z === 4
      && e.removals.length === 1 && hit(e, idx(1, 2), 4),
      "ALS-XZ : {L1C1,L1C2,L1C3} et {L2C1,L2C5}, 2 commun restreint, L2C3 perd le 4");
    ok(e && e.a.unit.type === "row" && e.a.unit.index === 0 && e.b.unit.index === 1 && e.a.digits.join() === "1,2,4,7" && e.b.digits.join() === "2,4,8"
      && e.xCells.join() === "1,2,9" && e.cells.length === 5,
      "ALS-XZ : unités, chiffres et cases x portées pour l'explication");
    ok(F.xyWing(g, null) === null && F.xyzWing(g, null) === null && F.nakedQuad(g, null) === null && F.aic(g, null) === null && F.pointing(g, null) === null,
      "rien de plus simple (ni AIC) ne s'applique");
    const n = g.map((x) => new Set(x)); n[idx(1, 0)] = S(); n[idx(1, 6)] = S(2, 4, 8);
    ok(F.alsXz(n, null) === null, "négatif : commun non restreint → rien");
    // Un ALS d'une seule case (bivalue) est admis : deux bivalues = paire nue → servie avant.
    const p = empty(); p[idx(0, 0)] = S(3, 8); p[idx(0, 4)] = S(3, 8); p[idx(0, 7)] = S(3, 9);
    ok(F.nakedPair(p, null) !== null, "deux bivalues à la même paire : c'est la paire nue qui parle en premier");
  }
  ok(TECH_TIER.aic === 5 && TECH_TIER.alsXz === 5, "AIC et ALS-XZ : palier 5");
  {
    const order = Object.keys(F);
    ok(order.indexOf("coloring") < order.indexOf("aic") && order.indexOf("aic") < order.indexOf("alsXz") && order.indexOf("alsXz") < order.indexOf("sueDeCoq"),
      "findElim : coloring < aic < alsXz < sueDeCoq (ordre de la spec v2.4)");
  }
  // Sûreté sur fuzz : 60 états réels (éliminations de palier ≥ 4 et murs des
  // fixtures) — aucune élimination des finders du palier B ne contredit la solution.
  {
    const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
    const parse = (g) => g.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
    const states = [];
    for (const f of FIX) {
      if (states.length >= 60) break;
      const grid = parse(f.grid);
      const { solution } = solveGrid(grid);
      let last = null, taken = 0;
      const r = solveHumanlySteps(grid, (st) => {
        if (st.type === "elim") {
          last = st.cands.map((a) => new Set(a));
          // Un état de palier ≥ 4 par fixture (étalement), plus l'état de mur.
          if (TECH_TIER[st.e.kind] >= 4 && taken === 0) { taken++; states.push({ id: f.id, cands: st.cands.map((a) => new Set(a)), solution }); }
        }
        return false;
      }, 5);
      if (!r.solved && last) states.push({ id: `${f.id} (mur)`, cands: last, solution });
    }
    const valid = states.every((st) => st.cands.every((c, i) => c.size === 0 || c.has(st.solution[i])));
    ok(states.length >= 60 && valid, `${states.length} états prélevés, tous compatibles avec la solution`);
    const PALIER_B = ["aic", "alsXz"].filter((k) => typeof F[k] === "function");
    let bad = 0, found = {};
    for (const st of states) {
      for (const k of PALIER_B) {
        const e = F[k](st.cands, null);
        if (!e) continue;
        found[k] = (found[k] || 0) + 1;
        for (const rm of e.removals) if (rm.digits.includes(st.solution[rm.cell])) bad++;
        if (e.removals.some((rm) => e.cells.includes(rm.cell) && e.kind === "aic" && e.type === 1)) bad++;
      }
    }
    ok(bad === 0, `fuzz palier B (${PALIER_B.join(", ")}) : aucune élimination ne contredit la solution (${bad} en défaut)`);
    console.log(`  ℹ palier B sur ${states.length} états : ${PALIER_B.map((k) => `${k} ${found[k] || 0}`).join(", ")}`);
  }
  // Ordre pédagogique et paliers : triplets/quads au palier 3, entre paires et poissons.
  ok(NEW_KINDS.every((k) => TECH_TIER[k] === 3), "triplets et quadruplets : palier 3");
  {
    const order = Object.keys(F);
    ok(order.indexOf("hiddenPair") < order.indexOf("nakedTriple") && order.indexOf("hiddenQuad") < order.indexOf("xWing"),
      "findElim : nakedTriple … hiddenQuad entre hiddenPair et xWing");
  }
}

/* ---------- 4c. Fixtures du banc et précondition d'unicité ---------- */
console.log("Fixtures du banc :");
{
  const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
  const parse = (g) => g.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
  ok(FIX.length >= 30 && FIX.every((f) => f.id && f.name && /^[0-9.]{81}$/.test(f.grid) && "se" in f && f.source),
    `${FIX.length} fixtures bien formées (id, name, grid 81, se, source)`);
  ok(new Set(FIX.map((f) => f.id)).size === FIX.length, "identifiants de fixtures uniques");
  ok(FIX.every((f) => solveGrid(parse(f.grid)).count === 1), "chaque fixture a une solution unique");
  ok(FIX.some((f) => f.id === "reddit-2026") && FIX.some((f) => f.id === "ai-escargot"), "la grille Reddit et AI Escargot sont présentes");
  // Cible v2.4 : la grille Reddit (point fixe des 27 techniques de v2.3) se
  // termine par 👣 sans contredire la solution, et le gradeur la résout.
  {
    const f = FIX.find((x) => x.id === "reddit-2026");
    const g = parse(f.grid);
    const { solution } = solveGrid(g);
    const w = g.slice();
    let mismatches = 0, kinds = new Set();
    for (let guard = 0; guard < 81; guard++) {
      const p = nextStep(w);
      if (!p) break;
      if (p.digit !== solution[p.target]) mismatches++;
      p.chainKinds.forEach((k) => kinds.add(k));
      w[p.target] = p.digit;
    }
    ok(isComplete(w) && mismatches === 0 && kinds.has("aic"), `grille Reddit terminée par 👣 grâce à l'AIC (techniques : ${[...kinds].join(", ")})`);
    ok(solveHumanly(g, 5).solved, "grille Reddit : gradée résoluble (palier 5)");
    let solved = 0;
    for (const x of FIX) if (solveHumanly(parse(x.grid), 5).solved) solved++;
    console.log(`  ℹ fixtures gradées résolubles : ${solved}/${FIX.length}`);
  }
  // Précondition d'unicité : sans allowUniqueness, aucune technique d'unicité
  // ne sort du gradeur ; avec, elles apparaissent sur au moins une fixture.
  const kindsSeen = (grid, allowUniqueness) => {
    const seen = new Set();
    solveHumanlySteps(grid, (st) => { if (st.type === "elim") seen.add(st.e.kind); return false; }, 5, { allowUniqueness });
    return seen;
  };
  let withU = 0, leak = 0;
  for (const f of FIX.slice(0, 40)) {
    const g = parse(f.grid);
    if ([...kindsSeen(g, true)].some((k) => UNIQUENESS_KINDS.has(k))) withU++;
    if ([...kindsSeen(g, false)].some((k) => UNIQUENESS_KINDS.has(k))) leak++;
  }
  ok(leak === 0, "allowUniqueness:false → jamais de rectangle unique / BUG+1 (40 fixtures)");
  console.log(`  ℹ techniques d'unicité mobilisées avec allowUniqueness:true : ${withU}/40 fixtures`);
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
  // Depuis B0, le joueur avance par nextStep (une recherche globale par appui,
  // exactement ce que fait 👣) ; on chronomètre chaque appui.
  const stepTimes = [];
  const playThrough = (grid, sol) => {
    const g = grid.slice();
    let mismatches = 0, moves = 0;
    for (let guard = 0; guard < 81; guard++) {
      const t0 = performance.now();
      const p = nextStep(g);
      stepTimes.push(performance.now() - t0);
      if (!p) break; // blocage : plus aucune case déductible
      if (p.digit !== sol[p.target]) mismatches++;
      g[p.target] = p.digit;
      moves++;
    }
    return { done: isComplete(g), mismatches, moves, left: g.filter((v) => !v).length };
  };

  // Seeds fixes (cf. section 5 : en changer si une évolution du moteur fait
  // tomber l'un d'eux en fallback de niveau).
  const quantile = (arr, q) => { const s = arr.slice().sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };
  for (const lvl of [1, 2, 3, 4]) {
    const t0 = Date.now();
    const from = stepTimes.length;
    for (let s = 0; s < 3; s++) {
      const p = generatePuzzle(lvl, makeRng(lvl * 100000 + s * 137 + 11));
      ok(p.level === lvl, `niveau ${lvl} seed ${s} : niveau atteint (réel=${p.level})`);
      const grid = p.grid.split("").map(Number);
      const r = playThrough(grid, p.solution.split("").map(Number));
      ok(r.done, `niveau ${lvl} seed ${s} : partie terminée (${r.moves} coups${r.done ? "" : `, ${r.left} cases restantes`})`);
      ok(r.mismatches === 0, `niveau ${lvl} seed ${s} : zéro chiffre contredisant la solution`);
      // Accord gradeur ↔ joueur : gradée résoluble ⟺ terminée par nextStep.
      ok(solveHumanly(grid, 5).solved === r.done, `niveau ${lvl} seed ${s} : gradeur et nextStep d'accord`);
    }
    const times = stepTimes.slice(from);
    const p95 = quantile(times, 0.95);
    console.log(`  ℹ niveau ${lvl} : 3 parties jouées en ${Date.now() - t0} ms — 👣 p50 ${quantile(times, 0.5).toFixed(1)} ms · p95 ${p95.toFixed(1)} ms (${times.length} appuis)`);
    // Cible B0 : 👣 < 100 ms sur les niveaux 1-3 (une recherche par appui).
    if (lvl <= 3) ok(p95 < 100, `niveau ${lvl} : 👣 p95 < 100 ms (${p95.toFixed(1)} ms)`);
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
  const TIER4 = new Set(Object.keys(TECH_TIER).filter((k) => TECH_TIER[k] === 4));
  ok(reproPlans.some((p) => p.rawChain.some((e) => TIER4.has(e.kind))),
    "fixture repro : au moins un plan mobilise une technique de palier 4");
  const r = playThrough(g, solution);
  ok(r.done && r.mismatches === 0, `fixture repro : partie terminée depuis l'état bloqué (${r.moves} coups)`);
  // Faux mur du banc (v2.3) : top95-83 est gradée résoluble, mais le joueur,
  // en posant les cases dans un autre ordre, tombait sur huit alignements
  // d'affilée qui épuisaient MAX_CHAIN. Les alignements ne comptent plus
  // dans le budget (même règle dans les deux moteurs) : la partie se termine.
  {
    const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
    const f = FIX.find((x) => x.id === "top95-83");
    const g83 = f.grid.split("").map((ch) => (ch === "." ? 0 : Number(ch)));
    const sol83 = solveGrid(g83).solution;
    ok(solveHumanly(g83, 5).solved, "top95-83 : gradée résoluble");
    const r83 = playThrough(g83, sol83);
    ok(r83.done && r83.mismatches === 0, `top95-83 : partie terminée par le chemin joueur (${r83.moves} coups) — plus de faux mur`);
  }
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
  // Grilles figées depuis 2.3.1 (relevées avant le palier B) : les finders de
  // palier 5 ne courent qu'après l'échec des paliers ≤ 4, donc un grade ≤ 4
  // reste ≤ 4 et les défis (niveaux 2-4) ne bougent pas. Toute modification
  // de l'ordre des tiers ≤ 4, de MAX_CHAIN/MAX_CHAIN_ALL ou de CHAIN_FREE_KINDS
  // casse ce verrou — et change les défis futurs : à assumer explicitement.
  ok(dailyPuzzle("2026-09-09").grid === "010003046400060003009000120100030000000216000000070005057000200300080009290300050"
    && dailyPuzzle("2026-09-12").grid === "190000000050000200400902508070010300080409020003070080304701002009000030000000046",
    "défis 2026-09-09 (niveau 3) et 2026-09-12 (niveau 4) identiques à 2.3.1");

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
  const N_KINDS = Object.keys(ELIM_FINDER_BY_KIND).length + 2;
  ok(kinds.length === N_KINDS, `${N_KINDS} techniques nommées (${kinds.length})`);
  ok(kinds.every((k) => TECH_NAMES[k].fr && TECH_NAMES[k].en && (TECH_NAMES[k].lesson || TECH_NAMES[k].revise)),
    "fr, en et leçon (propre ou à revoir) non vides partout");
  ok(kinds.every((k) => !TECH_NAMES[k].revise || LESSONS.some((L) => L.id === TECH_NAMES[k].revise)),
    "chaque `revise` pointe vers une leçon existante");
  ok([...Object.keys(ELIM_FINDER_BY_KIND), "nakedSingle", "hiddenSingle"].every((k) => !!TECH_NAMES[k]),
    "chaque kind du moteur a son entrée");
  ok(Object.entries(KIND_BY_LESSON).every(([lessonId, kind]) => TECH_NAMES[kind].lesson === lessonId)
    && kinds.filter((k) => TECH_NAMES[k].lesson).every((k) => KIND_BY_LESSON[TECH_NAMES[k].lesson] === k),
    "mapping kind ↔ leçon cohérent avec exercises.js (bijection sur les kinds à leçon)");
  ok(JSON.stringify(kinds.filter((k) => TECH_NAMES[k].lesson).map((k) => TECH_NAMES[k].lesson))
    === JSON.stringify(LESSONS.map((L) => L.id)),
    "les kinds à leçon suivent l'ordre des leçons");
  // Les titres des leçons restent la référence d'affichage : zéro dérive.
  // Une leçon qui couvre plusieurs kinds (« Triplets ») déclare son titre
  // dans TECH_NAMES.lessonTitle ; sinon le titre est le nom de la technique.
  ok(LESSONS.every((L) => { const T = TECH_NAMES[KIND_BY_LESSON[L.id]]; return (T.lessonTitle || T.fr) === L.title; }),
    "chaque titre de leçon === TECH_NAMES.fr (ou lessonTitle)");
  ok(techName("pointing") === "Paire pointante" && techName("pointing", "en") === "Pointing pair"
    && techName("pointing", "xx") === "Paire pointante", "techName : fr par défaut, repli fr");
  ok(frWithArticle("emptyRectangle") === "l’Empty Rectangle", "élision : l’Empty Rectangle");
  ok(frWithArticle("remotePair") === "les Remote Pairs", "pluriel : les Remote Pairs");
  ok(frWithArticle("pointing") === "la paire pointante" && frWithArticle("claiming") === "la réduction bloc/ligne",
    "féminins en minuscule : la paire pointante, la réduction bloc/ligne");
  ok(frWithArticle("coloring") === "le coloriage" && frWithArticle("xWing") === "le X-Wing",
    "casse : le coloriage (commun) mais le X-Wing (propre)");
  const list = frTechList();
  ok(list.startsWith("candidat unique, single caché") && list.endsWith("coloriage, chaîne AIC, ALS-XZ, Sue de Coq")
    && list.split(", ").length === N_KINDS, `frTechList : les ${N_KINDS}, dans l'ordre pédagogique`);
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
  ok(LESSONS.every((L) => { const T = TECH_NAMES[KIND_BY_LESSON[L.id]]; return L.en.title === (T.lessonTitleEn || T.en); }),
    "titres EN = TECH_NAMES.en (aucune dérive)");
  const FRISH = /( le | la | les | des | une | dans | chaque |é|è|ê|ç|à|ù)/;
  ok(LESSONS.every((L) => !FRISH.test(` ${allEn(L)} `)), "aucun français résiduel (heuristique accents + mots outils)");
  // L'indice 1 du coach devient 100 % anglais : conceptSentence lit L.en.
  const cs = conceptSentence("pointing", "en");
  ok(cs.length > 0 && !FRISH.test(` ${cs} `) && /[.!?]$/.test(cs),
    `conceptSentence EN : première phrase anglaise complète (${cs.slice(0, 48)}…)`);
}

/* ---------- 5n. Fidélité fr ↔ en des 17 leçons (permanent) ---------- */
console.log("Fidélité fr ↔ en des leçons :");
{
  const refs = (s) => (String(s).match(/[LR]\d+C\d+/g) || []).map((r) => r.slice(1)).sort();
  // Les {…} peuvent contenir des chiffres OU des cases (leçon 16) : on
  // neutralise la lettre de notation (LxCy/RxCy) avant de comparer.
  const sets = (s) => (String(s).match(/\{[^}]*\}/g) || [])
    .map((x) => x.replace(/\s+/g, "").replace(/[LR](\d+C\d+)/g, "$1")).sort();
  for (const L of LESSONS) {
    const fr = [L.concept, L.question, L.hint, ...L.steps].join(" ");
    const en = [L.en.concept, L.en.question, L.en.hint, ...L.en.steps].join(" ");
    const okRefs = JSON.stringify(refs(fr)) === JSON.stringify(refs(en));
    const okSets = JSON.stringify(sets(fr)) === JSON.stringify(sets(en));
    const okLen = L.steps.length === L.en.steps.length;
    ok(okRefs, `[${L.num}] mêmes cases citées fr/en${okRefs ? "" : ` (fr: ${refs(fr).join(",")} ≠ en: ${refs(en).join(",")})`}`);
    ok(okSets, `[${L.num}] mêmes ensembles {…} cités fr/en${okSets ? "" : ` (fr: ${sets(fr).join(" ")} ≠ en: ${sets(en).join(" ")})`}`);
    ok(okLen, `[${L.num}] même nombre d'étapes fr/en`);
  }
}

/* ---------- 5o. Lint de lisibilité (charte 3c) ---------- */
console.log("Lint de lisibilité (charte 3c) :");
{
  // Une phrase ≤ 25 mots ; une étape ≤ 3 phrases ; jamais de « −{ » ni de « → ».
  const lint = (raw, { maxSentences = Infinity } = {}) => {
    const errs = [];
    if (raw.includes("−{")) errs.push("contient −{");
    if (raw.includes("→")) errs.push("contient →");
    const s = String(raw).replace(/\*\*/g, "").replace(/\[\[(.+?)\]\]/g, "$1");
    const sentences = s.split(/[.!?…]+/).map((x) => x.trim()).filter(Boolean);
    if (sentences.length > maxSentences) errs.push(`${sentences.length} phrases`);
    for (const sent of sentences) {
      const words = (sent.match(/\S+/g) || []).length;
      if (words > 25) errs.push(`phrase de ${words} mots : « ${sent.slice(0, 40)}… »`);
    }
    return errs;
  };
  const lintAll = (label, texts, opts) => {
    const errs = texts.flatMap((t) => lint(t, opts));
    ok(errs.length === 0, `${label}${errs.length ? ` — ${errs.join(" ; ")}` : ""}`);
  };
  // Les 17 leçons (3d) : étapes (≤ 3 phrases) + concept/question/indice.
  for (const L of LESSONS) {
    const id = L.id;
    lintAll(`${id} : steps fr`, L.steps, { maxSentences: 3 });
    lintAll(`${id} : steps en`, L.en.steps, { maxSentences: 3 });
    lintAll(`${id} : concept/question/indice fr`, [L.concept, L.question, L.hint]);
    lintAll(`${id} : concept/question/indice en`, [L.en.concept, L.en.question, L.en.hint]);
  }
  // 3 plans par langue à chaîne 100 % pointing/xWing (cibles fixées en dur —
  // seuls les textes des branches réécrites et le gabarit hiddenSingle sont
  // lintés ; paras/hint2 attendront la généralisation 3d).
  const PLAN_FIXTURES = [
    [REPRO_STEPWISE, 24],
    [SAMPLES[0], 23],
    [SAMPLES[0], 26],
  ];
  for (const lang of ["fr", "en"]) {
    for (const [s, cell] of PLAN_FIXTURES) {
      const p = buildPlan(s.split("").map(Number), cell, lang);
      ok(p && p.chain.length > 0 && p.chainKinds.every((k) => k === "pointing" || k === "xWing"),
        `plan ${lang} ${cellName(cell, lang)} : chaîne pointing/xWing (${p ? p.chainKinds.join("+") : "null"})`);
      lintAll(`plan ${lang} ${cellName(cell, lang)} : étapes de chaîne`, p.chain.map((st) => st.text), { maxSentences: 3 });
      if (p.techKind === "hiddenSingle") {
        lintAll(`plan ${lang} ${cellName(cell, lang)} : indice 1 (gabarit single caché)`, [stepHint1(p, lang)]);
      }
    }
  }
  // Palier B (sans leçon) : textes AIC (type 1 et 2) et ALS-XZ, résumé +
  // maillons + indice, dans les deux langues, sur les états de test de 4b.
  {
    const S = (...d) => new Set(d);
    const emptyC = () => Array.from({ length: 81 }, () => new Set());
    const ix = (r, c) => r * 9 + c;
    const g = emptyC();
    g[ix(0, 0)] = S(2, 6, 9); g[ix(1, 1)] = S(4, 6, 7); g[ix(1, 7)] = S(4, 8, 9); g[ix(6, 7)] = S(4, 6); g[ix(6, 0)] = S(5, 6);
    const g2 = g.map((x) => new Set(x)); g2[ix(1, 4)] = S(1, 4);
    const FIX = JSON.parse(readFileSync(new URL("../fixtures/hard-grids.json", import.meta.url), "utf8"));
    let grouped = null;
    solveHumanlySteps(FIX.find((x) => x.id === "hardest-08").grid.split("").map((ch) => (ch === "." ? 0 : Number(ch))), (st) => {
      if (st.type === "elim" && st.e.kind === "aic" && st.e.chain.some((n) => n.cell === null)) grouped = st.cands.map((a) => new Set(a));
      return !!grouped;
    }, 5);
    const h = emptyC();
    h[ix(0, 0)] = S(1, 4, 7); h[ix(0, 1)] = S(1, 2, 7); h[ix(0, 2)] = S(2, 4, 7); h[ix(0, 4)] = S(2, 5, 9); h[ix(0, 6)] = S(4, 5);
    h[ix(1, 0)] = S(2, 4, 8); h[ix(1, 4)] = S(4, 8); h[ix(1, 2)] = S(4, 9); h[ix(6, 0)] = S(4, 6); h[ix(7, 2)] = S(4, 6);
    const STATES = [["aic type 1", "aic", g], ["aic type 2", "aic", g2], ["aic groupée", "aic", grouped], ["alsXz", "alsXz", h]];
    for (const [label, kind, cands] of STATES) {
      if (typeof ELIM_FINDER_BY_KIND[kind] !== "function") continue;
      const e = ELIM_FINDER_BY_KIND[kind](cands, null);
      for (const lang of ["fr", "en"]) {
        const ex = packageExercise(kind, e, Array(81).fill(0), cands.map((x) => [...x]), lang);
        lintAll(`palier B ${lang} ${label} : explain (résumé + maillons)`, ex.explain, { maxSentences: 3 });
        lintAll(`palier B ${lang} ${label} : indice`, [ex.hint]);
      }
    }
  }
  // 3 exercices par langue : pointing (leçon 4), xWing (leçon 7), pointing
  // transformé (seed fixe) — lint des textes explain uniquement.
  const exoFromLesson = (id, kind, lang, transform) => {
    const L = LESSONS.find((l) => l.id === id);
    let pos = { given: L.given, notes: L.notes, removals: L.removals, unit: L.unit, focus: L.focus, target: L.target, answer: L.answer };
    if (transform) pos = transformPosition(pos, transform);
    const given = Array(81).fill(0);
    for (const [k, v] of Object.entries(pos.given)) given[Number(k)] = v;
    const candsArr = Array.from({ length: 81 }, (_, i) => pos.notes[i] || []);
    const e = ELIM_FINDER_BY_KIND[kind](candsArr.map((a) => new Set(a)), new Set(Object.keys(pos.removals).map(Number)))
      || ELIM_FINDER_BY_KIND[kind](candsArr.map((a) => new Set(a)), null);
    return e && packageExercise(kind, e, given, candsArr, lang);
  };
  for (const lang of ["fr", "en"]) {
    const exos = [
      ["pointing (leçon 4)", exoFromLesson("pointing-pair", "pointing", lang)],
      ["xWing (leçon 7)", exoFromLesson("x-wing", "xWing", lang)],
      ["pointing transformé", exoFromLesson("pointing-pair", "pointing", lang, randomTransform(makeRng(42)))],
    ];
    for (const [label, ex] of exos) {
      ok(!!ex, `exercice ${lang} ${label} : construit`);
      if (ex) lintAll(`exercice ${lang} ${label} : explain`, ex.explain, { maxSentences: 3 });
    }
  }
  // 3d — échantillon complet : les 13 branches describeElim sur les positions
  // des leçons (explain + indice) et tous les plans de SAMPLES[0] (hint1,
  // hint2, paras, étapes de chaîne, indice 1 guidé), dans les deux langues.
  for (const lang of ["fr", "en"]) {
    for (const L of LESSONS) {
      const kind = KIND_BY_LESSON[L.id];
      if (kind === "nakedSingle" || kind === "hiddenSingle") continue;
      const ex = exoFromLesson(L.id, kind, lang);
      ok(!!ex, `exercice ${lang} ${kind} : construit`);
      if (!ex) continue;
      lintAll(`exercice ${lang} ${kind} : explain`, ex.explain, { maxSentences: 3 });
      lintAll(`exercice ${lang} ${kind} : indice`, [ex.hint]);
    }
    const g0 = SAMPLES[0].split("").map(Number);
    const errs = [];
    let n = 0;
    for (let i = 0; i < 81; i++) {
      if (g0[i] !== 0) continue;
      const p = buildPlan(g0, i, lang);
      if (!p) continue;
      n++;
      const tag = (e) => `${cellName(i, lang)}: ${e}`;
      for (const txt of [p.hint1, p.hint2, ...p.paras, stepHint1(p, lang)]) errs.push(...lint(txt).map(tag));
      for (const st of p.chain) errs.push(...lint(st.text, { maxSentences: 3 }).map(tag));
    }
    ok(n > 0 && errs.length === 0,
      `plans ${lang} de SAMPLES[0] (${n}) : hint1, hint2, paras, étapes et indice 1 conformes${errs.length ? ` — ${errs.slice(0, 5).join(" ; ")}` : ""}`);
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

/* ---------- 9. Acceptation : un exercice garanti pour chaque technique enseignée ---------- */
console.log(`Acceptation getExercise (${LESSONS.length} techniques × 5 appels) :`);
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

/* ---------- 12. Analytics : schéma fermé, jamais d'exception, aucun réseau ---------- */
console.log("Analytics (événements d'usage) :");
{
  const {
    EVENT_SCHEMA, MAX_EVENTS_PER_SESSION, configureAnalytics, resetAnalyticsForTests, trackEvent, validateEvent,
    durationBucket, hintsBucket, streakBucket, wallKind,
  } = await import("../src/analytics.js");
  // Aucun appel réseau possible pendant la section : fetch jette.
  const savedFetch = globalThis.fetch;
  globalThis.fetch = () => { throw new Error("réseau interdit dans check"); };
  const SPEC = {
    game_started: ["level", "origin"], game_won: ["level", "duration", "hints", "assisted"],
    daily_done: ["streak"], scan_used: ["result"], lesson_viewed: ["num"], exercise_started: ["kind"],
    wall_hit: ["level", "kind"], paywall_shown: [],
  };
  ok(Object.keys(EVENT_SCHEMA).sort().join() === Object.keys(SPEC).sort().join(), "les 8 événements de la spec, aucun autre");
  ok(Object.entries(SPEC).every(([n, keys]) => Object.keys(EVENT_SCHEMA[n]).sort().join() === keys.slice().sort().join()),
    "chaque événement porte exactement les clés de la spec");
  const closed = (rule) => (rule instanceof RegExp) || (Array.isArray(rule) && rule.length > 0 && rule.every((v) => typeof v === "string"));
  ok(Object.values(EVENT_SCHEMA).every((s) => Object.values(s).every(closed)), "chaque clé a une liste fermée de chaînes (ou un motif strict) : aucun texte libre");
  const FORBIDDEN = /grid|text|email|name|id$|user|ip|photo|image/i;
  ok(Object.values(EVENT_SCHEMA).every((s) => Object.keys(s).every((k) => !FORBIDDEN.test(k))), "aucune clé de type grille / texte / identité");
  ok(EVENT_SCHEMA.exercise_started.kind.includes("xyChain") && EVENT_SCHEMA.exercise_started.kind.length === Object.keys(TECH_NAMES).length,
    "exercise_started.kind = les kinds de TECH_NAMES");
  ok(EVENT_SCHEMA.game_started.level.join() === "1,2,3,4,5,custom", "level : 1..5 ou custom");
  ok(validateEvent("lesson_viewed", { num: "21" }) === null && validateEvent("lesson_viewed", { num: "0" }) && validateEvent("lesson_viewed", { num: "abc" }),
    "lesson_viewed.num : un numéro de leçon, rien d'autre");

  // Envoi valide → send appelé une fois avec le nom et les props exacts.
  const sentLog = [], warnLog = [];
  const spy = (name, props) => sentLog.push([name, { ...props }]);
  resetAnalyticsForTests();
  configureAnalytics({ enabled: true, send: spy, warn: (m) => warnLog.push(String(m)) });
  ok(trackEvent("game_won", { level: "2", duration: "5to15", hints: "1to3", assisted: "0" }) === true
    && sentLog.length === 1 && sentLog[0][0] === "game_won" && JSON.stringify(sentLog[0][1]) === JSON.stringify({ level: "2", duration: "5to15", hints: "1to3", assisted: "0" }),
    "événement conforme → envoyé une fois, props exactes");
  ok(trackEvent("paywall_shown") === true && sentLog.length === 2, "événement sans props → envoyé (props par défaut {})");
  // Hors schéma → ignoré + warn, jamais d'exception.
  const before = sentLog.length, wBefore = warnLog.length;
  ok(trackEvent("grid_seen", { level: "1" }) === false && trackEvent("game_won", { level: "2", duration: "5to15", hints: "1to3", assisted: "0", grid: "1234" }) === false
    && trackEvent("scan_used", { result: "maybe" }) === false && trackEvent("game_started", { level: "1" }) === false
    && trackEvent("game_started", { level: 1, origin: "daily" }) === false,
    "nom inconnu, clé inconnue, valeur hors liste, clé manquante, valeur non textuelle → ignorés");
  ok(sentLog.length === before && warnLog.length === wBefore + 5 && warnLog.slice(-5).every((m) => m.includes("[analytics] ignoré")),
    "… rien d'envoyé, un warn par refus");
  // Dédoublonnage par session (lesson_viewed / exercise_started / wall_hit).
  const b2 = sentLog.length;
  ok(trackEvent("lesson_viewed", { num: "3" }) === true && trackEvent("lesson_viewed", { num: "3" }) === false
    && trackEvent("lesson_viewed", { num: "4" }) === true && sentLog.length === b2 + 2, "lesson_viewed dédoublonné par session (mêmes props)");
  ok(trackEvent("wall_hit", { level: "5", kind: "beyond" }) === true && trackEvent("wall_hit", { level: "5", kind: "beyond" }) === false, "wall_hit dédoublonné");
  ok(trackEvent("game_started", { level: "1", origin: "generated" }) === true && trackEvent("game_started", { level: "1", origin: "generated" }) === true,
    "game_started jamais dédoublonné (une partie = un événement)");
  // Plafond par session.
  resetAnalyticsForTests();
  configureAnalytics({ enabled: true, send: spy, warn: () => {} });
  sentLog.length = 0;
  for (let i = 0; i < MAX_EVENTS_PER_SESSION + 5; i++) trackEvent("game_started", { level: "1", origin: "generated" });
  ok(sentLog.length === MAX_EVENTS_PER_SESSION && MAX_EVENTS_PER_SESSION <= 20, `plafond ${MAX_EVENTS_PER_SESSION} événements par session (sobriété)`);
  // Désactivé → validé mais jamais envoyé ; send qui jette → false sans propager.
  resetAnalyticsForTests();
  sentLog.length = 0; warnLog.length = 0;
  configureAnalytics({ enabled: false, send: spy, warn: (m) => warnLog.push(String(m)) });
  ok(trackEvent("daily_done", { streak: "7plus" }) === true && sentLog.length === 0, "désactivé (natif, dev) → no-op, rien d'envoyé");
  ok(trackEvent("daily_done", { streak: "8" }) === false && warnLog.length === 1, "désactivé → le schéma est quand même validé (warn en dev)");
  resetAnalyticsForTests();
  configureAnalytics({ enabled: true, send: () => { throw new Error("boom"); }, warn: () => {} });
  let threw = false;
  try { ok(trackEvent("scan_used", { result: "ok" }) === false, "send qui jette → false"); } catch { threw = true; }
  ok(!threw, "… et jamais d'exception vers l'app");
  resetAnalyticsForTests();
  configureAnalytics({ enabled: true, send: "pas une fonction" });
  ok(trackEvent("scan_used", { result: "ok" }) === true, "paquet indisponible (send absent) → no-op");
  // Seaux.
  ok(durationBucket(60) === "lt5" && durationBucket(299) === "lt5" && durationBucket(300) === "5to15" && durationBucket(15 * 60) === "15to30"
    && durationBucket(31 * 60) === "gt30", "durationBucket : bornes 5 / 15 / 30 min");
  ok(hintsBucket(0) === "0" && hintsBucket(3) === "1to3" && hintsBucket(4) === "4plus", "hintsBucket : 0 / 1-3 / 4+");
  ok(streakBucket(1) === "1" && streakBucket(6) === "2to6" && streakBucket(7) === "7plus", "streakBucket : 1 / 2-6 / 7+");
  ok(wallKind("wrong-digit") === "wrong" && wallKind("multi-sol") === "multi" && wallKind("beyond-coach") === "beyond" && wallKind(null) === null,
    "wallKind : panneaux bloqués → kinds du schéma");
  ok([durationBucket(1), hintsBucket(1), streakBucket(2)].every((v, i) => EVENT_SCHEMA[["game_won", "game_won", "daily_done"][i]][["duration", "hints", "streak"][i]].includes(v)),
    "les seaux produisent des valeurs du schéma");
  const src = readFileSync(new URL("../src/analytics.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  ok(!src.includes("@vercel/analytics") && !src.includes("import.meta.env"), "analytics.js n'importe pas le paquet et ne lit pas import.meta.env (hors commentaires)");
  const main = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
  ok(main.includes('<Analytics mode="production" />') && main.includes("configureAnalytics({ enabled: !!import.meta.env.PROD && !isNative()"),
    "main.jsx : mode=\"production\" explicite, envoi seulement en prod hors natif");
  const priv = readFileSync(new URL("../public/confidentialite/index.html", import.meta.url), "utf8");
  ok(priv.includes("événements d’usage anonymes") && priv.includes("anonymous usage events"), "/confidentialite mentionne les événements d'usage (fr + en)");
  globalThis.fetch = savedFetch;
  resetAnalyticsForTests();
}

/* ---------- 13. Porte du scan : jamais d'impasse payante (R1) ---------- */
console.log("Porte du scan (scanGate) :");
{
  const { scanGate, LOW_SCANS } = await import("../src/scanGate.js");
  const T = (left, purchasesReady, unlimited) => scanGate({ left, purchasesReady, unlimited });
  ok(T(0, true, true).allowed && T(0, true, true).panel === null && T(0, false, true).allowed, "illimité → ouvert, aucun panneau, quelle que soit l'offre");
  ok(T(5, false, false).allowed && T(5, false, false).panel === null && T(5, true, false).panel === null, "5 restants → ouvert, aucun panneau");
  ok(T(2, false, false).allowed && T(2, false, false).panel === "low" && T(1, true, false).panel === "low", `moins de ${LOW_SCANS} restants → ouvert, panneau « il reste »`);
  ok(!T(0, true, false).allowed && T(0, true, false).panel === "paywall", "quota épuisé + offre chargée → paywall, scan fermé");
  ok(T(0, false, false).allowed && T(0, false, false).panel === "grace", "quota épuisé SANS offre (clé absente, offering vide, erreur, web) → scan ouvert, « en attendant, continue »");
  ok(T(-3, false, false).panel === "grace" && scanGate({}).panel === "grace" && scanGate({ left: Infinity }).allowed, "valeurs dégénérées : négatif ou absent = épuisé ; Infinity = ouvert");
  const all = [[0, true, false], [0, false, false], [2, false, false], [5, true, false], [0, false, true]].map(([a, b, c]) => T(a, b, c));
  ok(all.every((g) => g.allowed || g.panel === "paywall"), "le scan n'est fermé QUE derrière un paywall réel (jamais d'impasse)");
  ok(DICTS.fr["scan.grace"] && DICTS.en["scan.grace"] && !("scan.out.web" in DICTS.fr) && !("flash.scansOutWeb" in DICTS.fr),
    "i18n : message « en attendant, continue » fr+en, anciens messages « bientôt » retirés");
}

console.log(`\n  ℹ temps total : ${((Date.now() - T0) / 1000).toFixed(1)} s`);
console.log(failures === 0 ? "\nTOUT EST OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
