/* ================================================================
   SUDOKU · COACH — routeur d'exercices : un exercice garanti pour
   chacune des 17 techniques, à chaque fois, en moins de 4 s.
   Couche fine au-dessus du moteur (module séparé : lessons.js
   consomme engine.js au niveau module, engine ne peut donc pas
   importer les leçons sans cycle).
   ================================================================ */
import {
  findTechniqueExercise, buildConstructiveExercise,
  randomTransform, transformPosition, packageExercise,
  ELIM_FINDER_BY_KIND, buildPlan,
} from "./engine.js";
import { LESSONS } from "./lessons.js";

export const KIND_BY_LESSON = {
  "naked-single": "nakedSingle", "hidden-single": "hiddenSingle",
  "naked-pair": "nakedPair", "pointing-pair": "pointing", "claiming": "claiming",
  "hidden-pair": "hiddenPair", "x-wing": "xWing", "xy-wing": "xyWing",
  "swordfish": "swordfish", "skyscraper": "skyscraper", "remote-pairs": "remotePair",
  "xyz-wing": "xyzWing", "w-wing": "wWing", "kite": "kite",
  "empty-rectangle": "emptyRectangle", "coloring": "coloring", "sue-de-coq": "sueDeCoq",
};
export const LESSON_BY_KIND = Object.fromEntries(
  LESSONS.map((L) => [KIND_BY_LESSON[L.id], L])
);

// Position d'entraînement : transformation aléatoire de la position curatée de
// la leçon — le motif y est présent par construction et préservé par symétrie.
// Textes régénérés depuis l'élimination retrouvée par le finder (jamais
// remappés). Infaillible et instantané (~0,1 ms).
function transformExercise(kind, rng = Math.random) {
  const L = LESSON_BY_KIND[kind];
  const pos = transformPosition(
    {
      given: L.given, notes: L.notes, removals: L.removals,
      unit: L.unit, focus: L.focus, target: L.target, answer: L.answer,
    },
    randomTransform(rng)
  );
  const given = Array(81).fill(0);
  for (const [k, v] of Object.entries(pos.given)) given[Number(k)] = v;
  if (kind === "nakedSingle" || kind === "hiddenSingle") {
    const plan = buildPlan(given, pos.target);
    if (!plan) return null; // n'arrive pas : le single est préservé par symétrie
    return {
      kind, given, notes: {}, removals: {},
      unit: plan.unitCells, focus: [], target: pos.target, answer: plan.digit,
      explain: plan.paras, hint: plan.hint1, source: "transform",
    };
  }
  const candsArr = Array.from({ length: 81 }, (_, i) => pos.notes[i] || []);
  const cands = candsArr.map((a) => new Set(a));
  const prefer = new Set(Object.keys(pos.removals).map(Number));
  const e = ELIM_FINDER_BY_KIND[kind](cands, prefer) || ELIM_FINDER_BY_KIND[kind](cands, null);
  if (!e) return null; // n'arrive pas : le motif est préservé par symétrie
  const ex = packageExercise(kind, e, given, candsArr);
  ex.source = "transform";
  return ex;
}

/* Stratégie par technique, mesurée sur grilles aléatoires :
   - recherche : la technique y apparaît en < 600 ms en moyenne ;
   - construction : quasi introuvable en recherche (Remote Pairs : 0/1000)
     mais constructible en ~0,2 ms autour d'une grille pleine ;
   - transformation : coloring et Sue de Coq résistent aux deux voies. */
const SEARCH_KINDS = new Set([
  "nakedSingle", "hiddenSingle", "pointing", "claiming", "nakedPair",
  "hiddenPair", "xyWing", "xyzWing", "wWing", "emptyRectangle",
]);
const CONSTRUCT_KINDS = new Set(["xWing", "swordfish", "skyscraper", "kite", "remotePair"]);

// Un exercice, toujours : stratégie du kind, puis repli transformation.
export function getExercise(kind, { budgetMs = 3500, rng = Math.random } = {}) {
  let ex = null;
  if (SEARCH_KINDS.has(kind)) {
    ex = findTechniqueExercise(kind, { timeBoxMs: Math.round(budgetMs * 0.8), rng });
    if (ex) ex.source = "search";
  } else if (CONSTRUCT_KINDS.has(kind)) {
    ex = buildConstructiveExercise(kind, { budgetMs: Math.min(1500, Math.round(budgetMs * 0.5)), rng });
    if (ex) ex.source = "construct";
  }
  return ex || transformExercise(kind, rng);
}
