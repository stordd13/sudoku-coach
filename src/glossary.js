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
    id: "chain",
    fr: { term: "chaîne", aliases: ["chaînes"], def: "Une suite de cases reliées par des liens, où chaque case force la suivante." },
    en: { term: "chain", aliases: ["chains"], def: "A series of cells joined by links, where each cell forces the next." },
  },
  {
    id: "weak-link",
    fr: { term: "lien faible", aliases: ["liens faibles"], def: "Deux cases qui se voient et portent le même candidat : si l’une est vraie, l’autre est fausse." },
    en: { term: "weak link", aliases: ["weak links"], def: "Two cells that see each other and share a candidate: if one is true, the other is false." },
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
    id: "naked-triple",
    fr: { term: "triplet nu", aliases: ["triplets nus", "triplet", "triplets"], def: "Trois cases d’une zone qui, à elles trois, n’acceptent que trois chiffres : ces chiffres leur sont réservés." },
    en: { term: "naked triple", aliases: ["naked triples", "triple", "triples"], def: "Three cells of a zone that, together, accept only three digits: those digits are reserved for them." },
  },
  {
    id: "hidden-triple",
    fr: { term: "triplet caché", aliases: ["triplets cachés"], def: "Trois chiffres qui n’ont de place que dans trois cases d’une zone : ces cases perdent leurs autres candidats." },
    en: { term: "hidden triple", aliases: ["hidden triples"], def: "Three digits that fit only in three cells of a zone: those cells lose their other candidates." },
  },
  {
    id: "naked-quad",
    fr: { term: "quadruplet nu", aliases: ["quadruplet", "quadruplets"], def: "Quatre cases d’une zone qui, à elles quatre, n’acceptent que quatre chiffres : ces chiffres leur sont réservés." },
    en: { term: "naked quad", aliases: ["quad", "quads"], def: "Four cells of a zone that, together, accept only four digits: those digits are reserved for them." },
  },
  {
    id: "hidden-quad",
    fr: { term: "quadruplet caché", aliases: [], def: "Quatre chiffres qui n’ont de place que dans quatre cases d’une zone : ces cases perdent leurs autres candidats." },
    en: { term: "hidden quad", aliases: [], def: "Four digits that fit only in four cells of a zone: those cells lose their other candidates." },
  },
  {
    id: "fin",
    fr: { term: "nageoire", aliases: ["nageoires"], def: "La case en trop qui empêche un poisson d’être parfait, tolérée quand elle reste dans le bloc où l’on élimine." },
    en: { term: "fin", aliases: ["fins"], def: "The extra cell that keeps a fish from being perfect, tolerated when it stays in the box where you eliminate." },
  },
  {
    id: "finned-x-wing",
    fr: { term: "X-Wing à nageoire", aliases: ["X-Wings à nageoire"], def: "Un X-Wing presque parfait, dont la nageoire dépasse dans un bloc : on n’élimine que dans ce bloc." },
    en: { term: "Finned X-Wing", aliases: ["finned X-Wing"], def: "An almost perfect X-Wing whose fin sticks out into one box: you only eliminate inside that box." },
  },
  {
    id: "jellyfish",
    fr: { term: "Jellyfish", aliases: [], def: "Le poisson à quatre lignes : un chiffre confiné aux quatre mêmes colonnes sur quatre lignes y est réservé." },
    en: { term: "Jellyfish", aliases: [], def: "The four-row fish: a digit confined to the same four columns on four rows is reserved for them." },
  },
  {
    id: "bivalue",
    fr: { term: "bivalue", aliases: ["bivalues", "case bivalue", "cases bivalues"], def: "Une case qui n’a plus que deux candidats." },
    en: { term: "bivalue", aliases: ["bivalue cell", "bivalue cells"], def: "A cell with only two candidates left." },
  },
  {
    id: "xy-chain",
    fr: { term: "XY-Chain", aliases: ["XY-Chains"], def: "Une chaîne de cases bivalues où chaque case force la suivante : l’une des deux extrémités porte le chiffre commun." },
    en: { term: "XY-Chain", aliases: ["XY-Chains"], def: "A chain of bivalue cells where each cell forces the next: one of the two ends holds the shared digit." },
  },
  {
    id: "x-chain",
    fr: { term: "X-Chain", aliases: ["X-Chains"], def: "Une chaîne sur un seul chiffre, liens forts et faibles alternés : l’une des deux extrémités porte le chiffre." },
    en: { term: "X-Chain", aliases: ["X-Chains"], def: "A chain on a single digit, alternating strong and weak links: one of the two ends holds the digit." },
  },
  {
    id: "unique-rectangle",
    fr: { term: "rectangle unique", aliases: ["rectangles uniques"], def: "Quatre cases sur deux lignes, deux colonnes et deux blocs qui ne peuvent pas finir en deux paires identiques, sinon la grille aurait deux solutions." },
    en: { term: "unique rectangle", aliases: ["unique rectangles"], def: "Four cells on two rows, two columns and two boxes that cannot end as two identical pairs, or the grid would have two solutions." },
  },
  {
    id: "bug-plus-one",
    fr: { term: "BUG+1", aliases: ["BUG"], def: "Toutes les cases vides sont bivalues sauf une à trois candidats : elle prend le chiffre présent trois fois dans ses zones, sinon la grille aurait deux solutions." },
    en: { term: "BUG+1", aliases: ["BUG"], def: "Every empty cell is bivalue except one with three candidates: it takes the digit that appears three times in its zones, or the grid would have two solutions." },
  },
  {
    id: "aic",
    fr: { term: "AIC", aliases: ["chaîne AIC", "chaînes AIC", "chaîne d’inférence", "chaîne d’inférence alternée"], def: "Une chaîne sur plusieurs chiffres, liens forts et faibles alternés : l’une des deux extrémités est vraie." },
    en: { term: "AIC", aliases: ["AICs", "AIC chain", "alternating inference chain"], def: "A chain over several digits, alternating strong and weak links: one of the two ends is true." },
  },
  {
    id: "als",
    fr: { term: "ensemble presque verrouillé", aliases: ["ALS", "ALS-XZ", "ensembles presque verrouillés"], def: "Des cases d’une même zone qui ont ensemble un candidat de plus que de cases : retire-leur un chiffre et tous les autres se placent." },
    en: { term: "almost locked set", aliases: ["ALS", "ALS-XZ", "almost locked sets"], def: "Cells of one zone that together hold one more candidate than there are cells: take one digit away and all the others get placed." },
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
