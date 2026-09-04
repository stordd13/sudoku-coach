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
    en: { term: "see", aliases: ["sees", "seen", "seeing"], def: "Two cells “see” each other when they share a row, a column, or a box." },
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
  /* ---- Noms de techniques (balisés [[…]] à leur première occurrence) ---- */
  {
    id: "naked-pair",
    fr: { term: "paire nue", aliases: ["paires nues"], def: "Deux cases d’une zone qui n’acceptent que les deux mêmes chiffres : on barre ces chiffres ailleurs dans la zone." },
    en: { term: "naked pair", aliases: ["naked pairs"], def: "Two cells of a zone that accept only the same two digits: cross those digits out elsewhere in the zone." },
  },
  {
    id: "claiming",
    fr: { term: "réduction bloc/ligne", aliases: ["réductions bloc/ligne"], def: "Sur une ligne ou une colonne, un chiffre dont toutes les places restantes tombent dans le même bloc : on le barre du reste du bloc." },
    en: { term: "box/line reduction", aliases: ["box/line reductions"], def: "On a row or column, a digit whose remaining places all fall in the same box: cross it out from the rest of the box." },
  },
  {
    id: "hidden-pair",
    fr: { term: "duo caché", aliases: ["duos cachés"], def: "Deux chiffres qui n’ont que les deux mêmes cases possibles dans une zone : ces cases perdent leurs autres candidats." },
    en: { term: "hidden pair", aliases: ["hidden pairs"], def: "Two digits that share the same two possible cells in a zone: those cells lose their other candidates." },
  },
  {
    id: "xy-wing",
    fr: { term: "XY-Wing", aliases: [], def: "Un pivot à deux candidats et deux pinces qu’il voit : quel que soit le pivot, une pince porte le chiffre commun, barré partout où l’on voit les deux pinces." },
    en: { term: "XY-Wing", aliases: [], def: "A two-candidate pivot and two pincers it sees: whatever the pivot is, one pincer holds the shared digit, crossed out wherever both pincers are seen." },
  },
  {
    id: "swordfish",
    fr: { term: "Swordfish", aliases: [], def: "Un chiffre réparti sur trois lignes et confiné à trois colonnes : on le barre ailleurs dans ces colonnes." },
    en: { term: "Swordfish", aliases: [], def: "A digit spread over three rows and confined to three columns: cross it out elsewhere in those columns." },
  },
  {
    id: "skyscraper",
    fr: { term: "Skyscraper", aliases: [], def: "Deux liens forts d’un chiffre qui partagent une colonne : l’un des deux toits porte le chiffre, barré partout où l’on voit les deux." },
    en: { term: "Skyscraper", aliases: [], def: "Two strong links on a digit that share a column: one of the two roofs holds the digit, crossed out wherever both are seen." },
  },
  {
    id: "remote-pairs",
    fr: { term: "Remote Pairs", aliases: ["remote pair"], def: "Une chaîne de cases à la même paire, coloriée en alternance : une case qui voit deux couleurs opposées ne peut porter aucun des deux chiffres." },
    en: { term: "Remote pairs", aliases: ["remote pair"], def: "A chain of cells with the same pair, colored alternately: a cell that sees two opposite colors can hold neither digit." },
  },
  {
    id: "xyz-wing",
    fr: { term: "XYZ-Wing", aliases: [], def: "Un pivot à trois candidats et deux pinces : le chiffre commun se barre seulement dans les cases qui voient les trois." },
    en: { term: "XYZ-Wing", aliases: [], def: "A three-candidate pivot and two pincers: the shared digit is crossed out only in cells that see all three." },
  },
  {
    id: "w-wing",
    fr: { term: "W-Wing", aliases: [], def: "Deux cases à la même paire, reliées par un lien fort sur l’un des chiffres : l’autre chiffre se barre partout où l’on voit les deux." },
    en: { term: "W-Wing", aliases: [], def: "Two cells with the same pair, joined by a strong link on one digit: the other digit is crossed out wherever both are seen." },
  },
  {
    id: "kite",
    fr: { term: "2-String Kite", aliases: ["cerf-volant"], def: "Une ligne et une colonne à deux places pour un chiffre, reliées par un bloc : le chiffre se barre au croisement des deux extrémités libres." },
    en: { term: "2-String Kite", aliases: ["kite"], def: "A row and a column with two places for a digit, joined through a box: the digit is crossed out where the two free ends cross." },
  },
  {
    id: "empty-rectangle",
    fr: { term: "Empty Rectangle", aliases: [], def: "Dans un bloc, les candidats d’un chiffre tiennent dans une ligne et une colonne : avec un lien fort ailleurs, le chiffre se barre à un croisement précis." },
    en: { term: "Empty rectangle", aliases: [], def: "In a box, the candidates of a digit fit in one row and one column: with a strong link elsewhere, the digit is crossed out at a precise crossing." },
  },
  {
    id: "sue-de-coq",
    fr: { term: "Sue de Coq", aliases: [], def: "Deux cases à cheval entre une ligne et un bloc qui puisent dans quatre chiffres, partagés avec une case de la ligne et une du bloc : chaque chiffre a sa place, on nettoie autour." },
    en: { term: "Sue de Coq", aliases: [], def: "Two cells straddling a row and a box that draw from four digits, split with one cell of the row and one of the box: every digit has its place, so clean up around them." },
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
