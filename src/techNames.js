/* ================================================================
   Noms des 17 techniques — SOURCE UNIQUE (module pur, zéro import).
   Avant ce module, les noms vivaient en 4 endroits (lessons.js,
   describeElim, FEM_TITLES de coachCopy, EXO_NAME_BY_ID + liste inline
   d'App.jsx) — l'i18n imposait de les consolider. Ordre = numérotation
   des leçons (1 → 17), utilisé tel quel par frTechList().
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
  xWing: { fr: "X-Wing", en: "X-Wing", proper: true, lesson: "x-wing" },
  xyWing: { fr: "XY-Wing", en: "XY-Wing", proper: true, lesson: "xy-wing" },
  swordfish: { fr: "Swordfish", en: "Swordfish", proper: true, lesson: "swordfish" },
  skyscraper: { fr: "Skyscraper", en: "Skyscraper", proper: true, lesson: "skyscraper" },
  remotePair: { fr: "Remote Pairs", en: "Remote pairs", proper: true, plural: true, lesson: "remote-pairs" },
  xyzWing: { fr: "XYZ-Wing", en: "XYZ-Wing", proper: true, lesson: "xyz-wing" },
  wWing: { fr: "W-Wing", en: "W-Wing", proper: true, lesson: "w-wing" },
  kite: { fr: "2-String Kite", en: "2-String Kite", proper: true, lesson: "kite" },
  emptyRectangle: { fr: "Empty Rectangle", en: "Empty rectangle", proper: true, elide: true, lesson: "empty-rectangle" },
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

/* Liste FR des 17 techniques dans l'ordre des leçons — panneaux « au-delà
   du coach » (stuckAll, révélation). */
export function frTechList() {
  return Object.values(TECH_NAMES)
    .map((t) => (t.proper ? t.fr : t.fr.charAt(0).toLowerCase() + t.fr.slice(1)))
    .join(", ");
}
