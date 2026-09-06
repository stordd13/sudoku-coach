/* ================================================================
   Noms des techniques du coach — SOURCE UNIQUE (module pur, zéro import).
   Avant ce module, les noms vivaient en 4 endroits (lessons.js,
   describeElim, FEM_TITLES de coachCopy, EXO_NAME_BY_ID + liste inline
   d'App.jsx) — l'i18n imposait de les consolider. Ordre = ordre
   pédagogique (les kinds à leçon suivent la numérotation des leçons),
   utilisé tel quel par frTechList() ; le nombre de techniques se dérive
   d'ici (jamais en dur ailleurs).
   Champs : lesson (id de la leçon propre, ou null) ; revise (kind sans
   leçon : la leçon mère à revoir — triplet caché → « Triplets »).
   Drapeaux : fem (une/la), plural (des/les), elide (l'), proper (garde
   sa casse après article : « le X-Wing » mais « le coloriage »).
   ================================================================ */

export const TECH_NAMES = {
  nakedSingle: { fr: "Candidat unique", en: "Naked single", lesson: "naked-single" },
  hiddenSingle: { fr: "Single caché", en: "Hidden single", lesson: "hidden-single" },
  nakedPair: { fr: "Paire nue", en: "Naked pair", fem: true, lesson: "naked-pair" },
  pointing: { fr: "Paire pointante", en: "Pointing pair", fem: true, lesson: "pointing-pair" },
  claiming: { fr: "Réduction bloc/ligne", en: "Box/line reduction", fem: true, lesson: "claiming" },
  hiddenPair: { fr: "Duo caché", en: "Hidden pair", lesson: "hidden-pair" },
  nakedTriple: { fr: "Triplet nu", en: "Naked triple", lesson: "triples", lessonTitle: "Triplets", lessonTitleEn: "Triples" },
  hiddenTriple: { fr: "Triplet caché", en: "Hidden triple", lesson: null, revise: "triples" },
  nakedQuad: { fr: "Quadruplet nu", en: "Naked quad", lesson: null, revise: "triples" },
  hiddenQuad: { fr: "Quadruplet caché", en: "Hidden quad", lesson: null, revise: "triples" },
  xWing: { fr: "X-Wing", en: "X-Wing", proper: true, lesson: "x-wing" },
  finnedXWing: { fr: "X-Wing à nageoire", en: "Finned X-Wing", proper: true, lesson: null, revise: "x-wing" },
  xyWing: { fr: "XY-Wing", en: "XY-Wing", proper: true, lesson: "xy-wing" },
  swordfish: { fr: "Swordfish", en: "Swordfish", proper: true, lesson: "swordfish" },
  jellyfish: { fr: "Jellyfish", en: "Jellyfish", proper: true, lesson: null, revise: "swordfish" },
  skyscraper: { fr: "Skyscraper", en: "Skyscraper", proper: true, lesson: "skyscraper" },
  remotePair: { fr: "Remote Pairs", en: "Remote pairs", proper: true, plural: true, lesson: "remote-pairs" },
  xChain: { fr: "X-Chain", en: "X-Chain", proper: true, fem: true, lesson: null, revise: "skyscraper" },
  xyzWing: { fr: "XYZ-Wing", en: "XYZ-Wing", proper: true, lesson: "xyz-wing" },
  wWing: { fr: "W-Wing", en: "W-Wing", proper: true, lesson: "w-wing" },
  xyChain: { fr: "XY-Chain", en: "XY-Chain", proper: true, fem: true, lesson: "xy-chain" },
  kite: { fr: "2-String Kite", en: "2-String Kite", proper: true, lesson: "kite" },
  emptyRectangle: { fr: "Empty Rectangle", en: "Empty rectangle", proper: true, elide: true, lesson: "empty-rectangle" },
  uniqueRectangle: { fr: "Rectangle unique", en: "Unique rectangle", lesson: "unique-rectangle" },
  bug1: { fr: "BUG+1", en: "BUG+1", proper: true, lesson: "bug-plus-one" },
  coloring: { fr: "Coloriage", en: "Coloring", lesson: "coloring" },
  sueDeCoq: { fr: "Sue de Coq", en: "Sue de Coq", proper: true, lesson: "sue-de-coq" },
};

export function techName(kind, lang = "fr") {
  const t = TECH_NAMES[kind];
  return t ? (t[lang] || t.fr) : "";
}

/* « le candidat unique », « la paire pointante », « les Remote Pairs »,
   « l'Empty Rectangle » — forme utilisée par les consignes d'exercice. */
export function frWithArticle(kind) {
  const t = TECH_NAMES[kind];
  if (!t) return "";
  const name = t.proper ? t.fr : t.fr.charAt(0).toLowerCase() + t.fr.slice(1);
  if (t.elide) return `l’${name}`;
  if (t.plural) return `les ${name}`;
  return `${t.fem ? "la" : "le"} ${name}`;
}

/* Forme avec article selon la langue : « la paire pointante » / « the
   pointing pair ». */
export function withArticle(kind, lang = "fr") {
  if (lang !== "en") return frWithArticle(kind);
  const t = TECH_NAMES[kind];
  if (!t) return "";
  return `the ${t.proper ? t.en : t.en.toLowerCase()}`;
}

/* Liste de toutes les techniques dans l'ordre pédagogique — panneaux
   « au-delà du coach » (stuckAll, révélation). */
export function frTechList(lang = "fr") {
  return Object.values(TECH_NAMES)
    .map((t) => {
      const name = lang === "en" ? t.en : t.fr;
      return t.proper ? name : name.charAt(0).toLowerCase() + name.slice(1);
    })
    .join(", ");
}
