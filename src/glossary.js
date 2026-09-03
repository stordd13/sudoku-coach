/* ================================================================
   « Les mots du sudoku » — glossaire des termes techniques.
   Une définition = UNE phrase simple. Les textes balisent un terme
   avec [[terme]] (ou [[alias]]) ; Rich le rend touchable et ouvre
   la définition. Module pur (importé par check.mjs sous Node).
   ================================================================ */

export const GLOSSARY = [
  {
    id: "candidate",
    fr: { term: "candidat", aliases: ["candidats"], def: "Un chiffre encore possible dans une case vide." },
    en: { term: "candidate", aliases: ["candidates"], def: "A digit that is still possible in an empty cell." },
  },
  {
    id: "note",
    fr: { term: "note", aliases: ["notes", "noter"], def: "Un petit chiffre écrit dans une case pour se souvenir d’un candidat." },
    en: { term: "note", aliases: ["notes"], def: "A small digit written in a cell to remember a candidate." },
  },
  {
    id: "see",
    fr: { term: "voir", aliases: ["voit", "voient", "vue", "vues"], def: "Deux cases se « voient » quand elles partagent une ligne, une colonne ou un bloc." },
    en: { term: "see", aliases: ["sees", "seen"], def: "Two cells “see” each other when they share a row, a column, or a box." },
  },
  {
    id: "row",
    fr: { term: "ligne", aliases: ["lignes"], def: "Les 9 cases alignées de gauche à droite : chaque chiffre y va une seule fois." },
    en: { term: "row", aliases: ["rows"], def: "The 9 cells running left to right: each digit goes there exactly once." },
  },
  {
    id: "column",
    fr: { term: "colonne", aliases: ["colonnes"], def: "Les 9 cases alignées de haut en bas : chaque chiffre y va une seule fois." },
    en: { term: "column", aliases: ["columns"], def: "The 9 cells running top to bottom: each digit goes there exactly once." },
  },
  {
    id: "box",
    fr: { term: "bloc", aliases: ["blocs"], def: "Un des neuf carrés de 3 × 3 cases : chaque chiffre y va une seule fois." },
    en: { term: "box", aliases: ["boxes"], def: "One of the nine 3 × 3 squares: each digit goes there exactly once." },
  },
  {
    id: "zone",
    fr: { term: "zone", aliases: ["zones", "unité"], def: "Une ligne, une colonne ou un bloc — les trois suivent la même règle du « chaque chiffre une fois »." },
    en: { term: "zone", aliases: ["zones", "unit"], def: "A row, a column, or a box — all three follow the same “each digit once” rule." },
  },
  {
    id: "naked-single",
    fr: { term: "candidat unique", aliases: ["candidats uniques"], def: "Une case où il ne reste qu’un seul chiffre possible : on peut l’écrire." },
    en: { term: "naked single", aliases: ["naked singles"], def: "A cell with only one possible digit left: you can write it in." },
  },
  {
    id: "hidden-single",
    fr: { term: "single caché", aliases: ["singles cachés"], def: "Un chiffre qui n’a plus qu’une seule place possible dans une zone." },
    en: { term: "hidden single", aliases: ["hidden singles"], def: "A digit with only one possible place left in a zone." },
  },
  {
    id: "strike",
    fr: { term: "barrer", aliases: ["barre", "barré", "barrés", "éliminer", "élimination"], def: "Retirer un candidat d’une case parce qu’il est devenu impossible." },
    en: { term: "cross out", aliases: ["crossed out", "eliminate", "elimination"], def: "Removing a candidate from a cell because it has become impossible." },
  },
  {
    id: "pointing-pair",
    fr: { term: "paire pointante", aliases: ["paires pointantes"], def: "Dans un bloc, un chiffre dont toutes les places restantes tombent sur la même ligne ou colonne : on le barre sur le reste de cette ligne." },
    en: { term: "pointing pair", aliases: ["pointing pairs"], def: "A digit whose remaining places in a box all fall on the same row or column: cross it out on the rest of that line." },
  },
  {
    id: "x-wing-term",
    fr: { term: "X-Wing", aliases: [], def: "Un rectangle de quatre cases où un chiffre est bloqué sur deux lignes et deux colonnes : il se barre ailleurs dans ces colonnes." },
    en: { term: "X-Wing", aliases: [], def: "A rectangle of four cells where a digit is locked into two rows and two columns: cross it out elsewhere in those columns." },
  },
  {
    id: "pair",
    fr: { term: "paire", aliases: ["paires"], def: "Deux cases d’une même zone qui se partagent les deux mêmes chiffres." },
    en: { term: "pair", aliases: ["pairs"], def: "Two cells of the same zone that share the same two digits." },
  },
  {
    id: "strong-link",
    fr: { term: "lien fort", aliases: ["liens forts"], def: "Un chiffre qui n’a que deux places possibles dans une zone : si l’une est fausse, l’autre est vraie." },
    en: { term: "strong link", aliases: ["strong links"], def: "A digit with only two possible places in a zone: if one is false, the other is true." },
  },
  {
    id: "pivot",
    fr: { term: "pivot", aliases: [], def: "La case centrale d’un motif en Y, celle qui voit les deux pinces." },
    en: { term: "pivot", aliases: [], def: "The central cell of a Y-shaped pattern, the one that sees both pincers." },
  },
  {
    id: "pincer",
    fr: { term: "pince", aliases: ["pinces"], def: "Une des deux cases reliées au pivot : à elles deux, elles forcent une élimination." },
    en: { term: "pincer", aliases: ["pincers"], def: "One of the two cells linked to the pivot: together they force an elimination." },
  },
  {
    id: "color",
    fr: { term: "couleur", aliases: ["couleurs", "coloriage", "colorie"], def: "Marquer les cases d’une chaîne en deux couleurs alternées : l’une est vraie, l’autre fausse." },
    en: { term: "color", aliases: ["colors", "coloring"], def: "Marking the cells of a chain in two alternating colors: one is true, the other false." },
  },
];

const norm = (s) => String(s).toLowerCase().trim();

/* Le label d'un [[label]] → l'entrée du glossaire (terme ou alias, insensible
   à la casse) dans la langue demandée ; null si inconnu. */
export function lookupTerm(label, lang = "fr") {
  const l = norm(label);
  const side = lang === "en" ? "en" : "fr";
  for (const g of GLOSSARY) {
    const e = g[side];
    if (norm(e.term) === l || (e.aliases || []).some((a) => norm(a) === l)) return { id: g.id, ...e };
  }
  return null;
}

/* Les entrées {term, def} de l'écran « Les mots du sudoku ». */
export function glossaryList(lang = "fr") {
  const side = lang === "en" ? "en" : "fr";
  return GLOSSARY.map((g) => ({ id: g.id, term: g[side].term, def: g[side].def }));
}
