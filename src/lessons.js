/* ================================================================
   SUDOKU · COACH — leçons de l'onglet « Apprendre »
   Chaque leçon est une position vérifiée illustrant une technique :
   - given    : valeurs affichées {index: chiffre}
   - notes    : candidats affichés {index: [chiffres]}
   - removals : candidats barrés à la révélation {index: [chiffres]}
   - unit     : cases teintées (zone étudiée)
   - focus    : cases encadrées (cases clés de la technique)
   - target   : case résolue, answer : chiffre trouvé
   ================================================================ */
import { ROWS, COLS, BOXES } from "./engine.js";
import { LESSONS_EN } from "./lessonsEn.js";

export const LESSONS = [
  {
    id: "naked-single",
    num: 1,
    level: "classic",
    title: "Candidat unique",
    concept:
      "Une case ne « voit » plus qu’un seul chiffre possible : les chiffres déjà posés dans sa ligne, sa colonne et son bloc éliminent les 8 autres. C’est la technique de base — toujours commencer par elle.",
    question: "Quel chiffre va en L5C5 ?",
    hint: "Écris 1 à 9, puis barre chaque chiffre que la case voit dans sa ligne, sa colonne et son bloc. Que reste-t-il ?",
    given: { 36: 1, 37: 2, 44: 3, 4: 4, 13: 5, 30: 6, 50: 8, 32: 9 },
    notes: {},
    removals: {},
    unit: [...ROWS[4], ...COLS[4], ...BOXES[4]],
    focus: [],
    target: 40,
    answer: 7,
    steps: [
      "La case **L5C5** voit : ligne 5 → {1, 2, 3} · colonne 5 → {4, 5} · bloc central → {6, 8, 9}.",
      "Huit chiffres sont donc exclus : 1, 2, 3, 4, 5, 6, 8 et 9.",
      "Il ne reste qu’un seul candidat : le **7** → **L5C5 = 7**.",
    ],
  },
  {
    id: "hidden-single",
    num: 2,
    level: "classic",
    title: "Single caché",
    concept:
      "On ne regarde plus une case, mais une zone entière (ligne, colonne ou bloc) en suivant UN chiffre : s’il n’a plus qu’une seule case disponible dans la zone, il s’y place — même si cette case a encore d’autres candidats.",
    question: "Où va le 5 dans le bloc haut-gauche ?",
    hint: "Suis le 5 : quelles cases libres du bloc sont « vues » par un 5 déjà posé (même ligne ou même colonne) ?",
    given: { 0: 2, 1: 9, 10: 7, 20: 4, 6: 5, 13: 5, 45: 5 },
    notes: {},
    removals: {},
    unit: BOXES[0],
    focus: [6, 13, 45],
    target: 19,
    answer: 5,
    steps: [
      "Question : où placer le **5** dans le bloc haut-gauche ? Cases libres : L1C3, L2C1, L2C3, L3C1, L3C2.",
      "**L1C3** : impossible — le 5 de **L1C7** occupe déjà la ligne 1. **L2C1** et **L2C3** : impossible — le 5 de **L2C5** bloque la ligne 2.",
      "**L3C1** : impossible — le 5 de **L6C1** occupe déjà la colonne 1.",
      "**L3C2** ne voit aucun 5 : c’est la seule place restante → **L3C2 = 5**.",
    ],
  },
  {
    id: "naked-pair",
    num: 3,
    level: "classic",
    title: "Paire nue",
    concept:
      "Deux cases d’une même zone ne contiennent que les deux mêmes candidats. Ces deux chiffres sont « réservés » à ces deux cases (peu importe l’ordre) : on peut donc les barrer partout ailleurs dans la zone.",
    question: "La paire {3, 8} de la ligne 4 débloque une case : laquelle, et avec quel chiffre ?",
    hint: "Repère les deux cases de la ligne 4 qui partagent exactement les mêmes deux candidats… puis barre ces chiffres ailleurs.",
    given: { 29: 1, 31: 2, 35: 9 },
    notes: {
      27: [3, 8], 28: [3, 8], 30: [4, 5, 8],
      32: [3, 5, 7], 33: [3, 6, 8], 34: [4, 6, 7],
    },
    removals: { 30: [8], 32: [3], 33: [3, 8] },
    unit: ROWS[3],
    focus: [27, 28],
    target: 33,
    answer: 6,
    steps: [
      "**L4C1** et **L4C2** ne contiennent que {3, 8} : où que finissent le 3 et le 8 de la ligne 4, ce sera dans ces deux cases.",
      "On retire donc 3 et 8 des autres cases de la ligne : L4C4 −{8}, L4C6 −{3}, L4C7 −{3, 8}.",
      "**L4C7** passe de {3, 6, 8} à {6} → **L4C7 = 6**. Une paire nue vient de fabriquer un candidat unique.",
    ],
  },
  {
    id: "pointing-pair",
    num: 4,
    level: "classic",
    title: "Paire pointante",
    concept:
      "Dans un bloc, un chiffre n’est possible que sur une seule ligne (ou colonne). Comme il finira forcément dans le bloc sur cette ligne, on peut le barrer sur le reste de la ligne, en dehors du bloc.",
    question: "Observe les 4 du bloc haut-droit… quel chiffre va en L2C4 ?",
    hint: "Dans le bloc haut-droit, où le 4 est-il encore possible ? Remarque l’alignement de ces cases.",
    given: { 6: 9, 7: 1, 25: 6 },
    notes: {
      16: [4, 5], 17: [4, 8], 8: [3, 7], 24: [2, 5], 26: [2, 3],
      10: [3, 4, 6], 12: [4, 7],
    },
    removals: { 10: [4], 12: [4] },
    unit: [...BOXES[2], ...ROWS[1]],
    focus: [16, 17],
    target: 12,
    answer: 7,
    steps: [
      "Dans le bloc haut-droit, le **4** n’apparaît que dans **L2C7** et **L2C9** — deux cases de la même **ligne 2**.",
      "Le 4 de ce bloc sera donc forcément l’une de ces deux cases → aucune autre case de la ligne 2 ne peut être un 4 : L2C2 −{4}, L2C4 −{4}.",
      "**L2C4** passe de {4, 7} à {7} → **L2C4 = 7**.",
    ],
  },
  {
    id: "claiming",
    num: 5,
    level: "classic",
    title: "Réduction bloc/ligne",
    concept:
      "C’est la paire pointante en sens inverse : sur une ligne (ou colonne), un chiffre n’est possible que dans un seul bloc. Il « appartient » donc à ce bloc via cette ligne : on le barre des autres cases du bloc.",
    question: "Suis le 6 de la colonne 5… quel chiffre va en L5C4 ?",
    hint: "Dans la colonne 5, quelles cases peuvent encore recevoir un 6 ? Dans quel bloc tombent-elles toutes ?",
    given: { 4: 3, 58: 4, 76: 5 },
    notes: {
      13: [1, 8], 22: [1, 9], 31: [2, 6], 40: [6, 7], 49: [2, 7], 67: [8, 9],
      39: [5, 6], 32: [6, 8, 9],
    },
    removals: { 39: [6], 32: [6] },
    unit: [...COLS[4], ...BOXES[4]],
    focus: [31, 40],
    target: 39,
    answer: 5,
    steps: [
      "Sur la **colonne 5**, le **6** n’est possible qu’en **L4C5** et **L5C5** — toutes deux dans le **bloc central**.",
      "Le 6 de la colonne 5 tombera donc dans ce bloc → les autres cases du bloc central ne peuvent pas être un 6 : L5C4 −{6}, L4C6 −{6}.",
      "**L5C4** passe de {5, 6} à {5} → **L5C4 = 5**.",
    ],
  },
  {
    id: "hidden-pair",
    num: 6,
    level: "classic",
    title: "Duo caché",
    concept:
      "Deux chiffres n’apparaissent que dans les deux mêmes cases d’une zone : ces cases leur sont réservées. Leurs autres candidats s’effacent — et ce grand nettoyage débloque souvent la suite.",
    question: "Trouve le duo caché du bloc bas-gauche… quelle case se débloque ensuite ?",
    hint: "Passe les chiffres en revue un par un : lesquels n’apparaissent que dans les deux mêmes cases du bloc ?",
    given: { 56: 3, 65: 7 },
    notes: {
      54: [1, 5], 55: [5, 6], 63: [4, 6], 64: [2, 4, 6, 9],
      72: [4, 5], 73: [4, 5, 6], 74: [1, 2, 5, 9],
    },
    removals: { 64: [4, 6], 74: [1, 5] },
    unit: BOXES[6],
    focus: [64, 74],
    target: 54,
    answer: 1,
    steps: [
      "Dans le bloc bas-gauche, suis le **2** et le **9** : chacun n’apparaît que dans **L8C2** et **L9C3**.",
      "Ces deux cases sont donc réservées au duo {2, 9} → leurs autres candidats s’effacent : L8C2 −{4, 6}, L9C3 −{1, 5}.",
      "Conséquence : le **1** du bloc n’a plus qu’une seule place possible, **L7C1** → **L7C1 = 1**. Un duo caché vient de débloquer un single caché.",
    ],
  },
  {
    id: "x-wing",
    num: 7,
    level: "intermediate",
    title: "X-Wing",
    concept:
      "Un chiffre n’a plus que deux places sur deux lignes, et ces places tombent dans les deux mêmes colonnes : elles forment un rectangle. Le chiffre occupera une diagonale ou l’autre — dans tous les cas, il est « réservé » à ces deux colonnes. On le barre donc ailleurs dans ces colonnes.",
    question: "Le 4 est bloqué sur les lignes 1 et 5 : quel chiffre se libère en L3C2 ?",
    hint: "Suis le 4 sur les lignes 1 et 5 : dans quelles colonnes se cache-t-il ? Remarque le rectangle.",
    given: {},
    notes: {
      1: [4, 8], 5: [4, 9], 37: [4, 6], 41: [4, 5],
      19: [4, 7], 68: [2, 4],
    },
    removals: { 19: [4], 68: [4] },
    unit: [...COLS[1], ...COLS[5]],
    focus: [1, 5, 37, 41],
    target: 19,
    answer: 7,
    steps: [
      "Suis le **4** sur les lignes 1 et 5 : dans chacune, il ne reste que deux cases possibles — **L1C2/L1C6** et **L5C2/L5C6**, toutes dans les colonnes 2 et 6.",
      "Ces quatre cases forment un rectangle (**X-Wing**). Sur chaque colonne, le 4 sera pris par l’une des deux lignes → aucune autre case des colonnes 2 et 6 ne peut être un 4 : L3C2 −{4}, L8C6 −{4}.",
      "**L3C2** passe de {4, 7} à {7} → **L3C2 = 7**.",
    ],
  },
  {
    id: "xy-wing",
    num: 8,
    level: "intermediate",
    title: "XY-Wing",
    concept:
      "Trois cases à deux candidats reliées en Y : un pivot {a, b}, et deux « pinces » {a, c} et {b, c} qu’il voit. Quelle que soit la valeur du pivot, l’une des pinces vaudra c. Toute case qui voit les deux pinces perd donc le c.",
    question: "Le pivot L5C5 et ses deux pinces débloquent L1C1 : avec quel chiffre ?",
    hint: "Repère le pivot {1, 2}. Ses deux pinces partagent un même troisième chiffre : lequel ?",
    given: {},
    notes: { 40: [1, 2], 36: [1, 3], 4: [2, 3], 0: [3, 7] },
    removals: { 0: [3] },
    unit: [0, 4, 36, 40],
    focus: [40, 36, 4],
    target: 0,
    answer: 7,
    steps: [
      "**L5C5** ne contient que {1, 2}. Ses deux pinces : **L5C1** = {1, 3} (même ligne) et **L1C5** = {2, 3} (même colonne).",
      "Si L5C5 = 1, alors L5C1 = 3 ; si L5C5 = 2, alors L1C5 = 3. Dans tous les cas, **un 3 apparaît en L5C1 ou L1C5**.",
      "**L1C1** voit ces deux pinces : elle ne peut pas être un 3. Elle passe de {3, 7} à {7} → **L1C1 = 7**.",
    ],
  },
  {
    id: "swordfish",
    num: 9,
    level: "intermediate",
    title: "Swordfish",
    concept:
      "Le X-Wing en plus grand : un chiffre se répartit sur trois lignes, entièrement contenu dans trois colonnes (deux ou trois cases par ligne). Ces trois colonnes se partageront le chiffre sur ces lignes → on le barre ailleurs dans ces colonnes.",
    question: "Le 3 dessine un Swordfish sur les lignes 1, 5 et 9 : que devient L3C3 ?",
    hint: "Suis le 3 sur les lignes 1, 5 et 9 : combien de colonnes différentes occupe-t-il en tout ?",
    given: {},
    notes: {
      2: [3, 5], 4: [3, 6], 40: [3, 7], 42: [3, 8], 74: [1, 3], 78: [2, 3],
      20: [3, 9],
    },
    removals: { 20: [3] },
    unit: [...COLS[2], ...COLS[4], ...COLS[6]],
    focus: [2, 4, 40, 42, 74, 78],
    target: 20,
    answer: 9,
    steps: [
      "Suis le **3** sur les lignes 1, 5 et 9 : il se limite à chaque fois aux colonnes 3, 5 et 7 (six cases en surbrillance).",
      "Ces trois colonnes se partageront les 3 de ces trois lignes (**Swordfish**) → aucune autre case des colonnes 3, 5 et 7 ne peut être un 3 : L3C3 −{3}.",
      "**L3C3** passe de {3, 9} à {9} → **L3C3 = 9**.",
    ],
  },
  {
    id: "skyscraper",
    num: 10,
    level: "intermediate",
    title: "Skyscraper",
    concept:
      "Un chiffre forme deux « liens forts » (deux cases seulement) sur deux lignes, et ces liens partagent une même colonne (la base). Comme la base ne peut pas porter le chiffre deux fois, l’un des deux « toits » le porte forcément : toute case voyant les deux toits perd ce chiffre.",
    question: "Les deux liens forts du 5 se rejoignent sur la colonne 1 : quel chiffre va en L2C6 ?",
    hint: "Le 5 n’a que deux places sur la ligne 1 et deux sur la ligne 4. Que partagent ces liens ?",
    given: {},
    notes: {
      0: [1, 5], 4: [2, 5], 27: [3, 5], 32: [4, 5],
      14: [5, 8],
    },
    removals: { 14: [5] },
    unit: [0, 4, 27, 32, 14],
    focus: [0, 4, 27, 32],
    target: 14,
    answer: 8,
    steps: [
      "Le **5** n’a que deux places sur la ligne 1 (**L1C1**, **L1C5**) et deux sur la ligne 4 (**L4C1**, **L4C6**). Les deux « pieds » L1C1 et L4C1 partagent la colonne 1 : c’est la base.",
      "La base ne peut pas porter deux 5 → l’un des deux « toits » (**L1C5** ou **L4C6**) est forcément un 5.",
      "**L2C6** voit ces deux toits (par la colonne 6 et par le bloc) : elle perd le 5 et passe de {5, 8} à {8} → **L2C6 = 8**.",
    ],
  },
  {
    id: "remote-pairs",
    num: 11,
    level: "intermediate",
    title: "Remote Pairs",
    concept:
      "Une chaîne de cases ne contenant que la même paire {a, b}, reliées de proche en proche. Le long de la chaîne, a et b s’alternent (deux « couleurs »). Toute case extérieure qui voit deux maillons de couleurs opposées ne peut être ni a ni b.",
    question: "La chaîne {1, 2} serpente jusqu’à cerner L1C9 : quel chiffre s’y pose ?",
    hint: "Colorie la chaîne en alternance. Quelles cases L1C9 voit-elle aux deux extrémités ?",
    given: {},
    notes: {
      0: [1, 2], 4: [1, 2], 40: [1, 2], 44: [1, 2],
      8: [2, 5],
    },
    removals: { 8: [2] },
    unit: [0, 4, 40, 44, 8],
    focus: [0, 4, 40, 44],
    target: 8,
    answer: 5,
    steps: [
      "Quatre cases ne contiennent que {1, 2} et s’enchaînent : **L1C1 – L1C5 – L5C5 – L5C9**. On les colorie en alternance.",
      "Le 1 et le 2 s’échangent le long de la chaîne : les extrémités **L1C1** et **L5C9** sont de couleurs opposées — l’une porte le 1, l’autre le 2.",
      "**L1C9** voit ces deux extrémités : elle ne peut être ni 1 ni 2. Elle perd le 2 et passe de {2, 5} à {5} → **L1C9 = 5**.",
    ],
  },
  {
    id: "xyz-wing",
    num: 12,
    level: "advanced",
    title: "XYZ-Wing",
    concept:
      "Le cousin du XY-Wing avec un pivot à TROIS candidats {x, y, z}, relié à deux pinces {x, z} et {y, z}. Quelle que soit la valeur du pivot, un z apparaît dans le trio — mais ici le pivot peut être z lui-même : on ne barre z que dans les cases qui voient les trois cases à la fois.",
    question: "Pivot en L5C4, pinces en L5C1 et L4C5… quel chiffre va en L5C5 ?",
    hint: "Teste les trois valeurs possibles du pivot L5C4. Dans chaque scénario, où apparaît le 9 ?",
    given: {},
    notes: { 39: [2, 5, 9], 36: [2, 9], 31: [5, 9], 40: [4, 9], 41: [7, 8, 9] },
    removals: { 40: [9], 41: [9] },
    unit: [...ROWS[4], ...BOXES[4]],
    focus: [39, 36, 31],
    target: 40,
    answer: 4,
    steps: [
      "Le **pivot L5C4** contient {2, 5, 9} ; ses pinces : **L5C1** {2, 9} (même ligne) et **L4C5** {5, 9} (même bloc).",
      "Trois scénarios : pivot = 2 → L5C1 = 9 · pivot = 5 → L4C5 = 9 · pivot = 9 → le pivot lui-même est un 9.",
      "Dans les trois cas, un 9 apparaît dans le trio → toute case qui voit **les trois** ne peut pas être un 9 : L5C5 −{9}, L5C6 −{9}.",
      "**L5C5** passe de {4, 9} à {4} → **L5C5 = 4**.",
    ],
  },
  {
    id: "w-wing",
    num: 13,
    level: "advanced",
    title: "W-Wing",
    concept:
      "Deux cases éloignées partagent exactement la même paire {a, b} sans se voir. Si un lien fort sur b les relie (une unité où b n'a que deux places, chacune voyant l'une des deux cases), alors l'une des deux cases vaut forcément a — et on barre a partout où l'on voit les deux.",
    question: "Deux paires {4, 7} reliées par les 7 de la colonne 5… quel chiffre va en L6C2 ?",
    hint: "Dans la colonne 5, le 7 n'a que deux places. Suppose chacune vraie à tour de rôle : que deviennent L2C2 et L6C8 ?",
    given: {},
    notes: { 10: [4, 7], 52: [4, 7], 13: [3, 7], 49: [7, 9], 46: [4, 8], 16: [1, 4, 6] },
    removals: { 46: [4], 16: [4] },
    unit: [...COLS[4]],
    focus: [10, 52, 13, 49],
    target: 46,
    answer: 8,
    steps: [
      "**L2C2** et **L6C8** partagent la même paire {4, 7} sans se voir. Dans la **colonne 5**, le 7 n'a que deux places : **L2C5** et **L6C5**.",
      "Si L2C5 = 7 → L2C2 perd son 7 (même ligne) → **L2C2 = 4**. Si L6C5 = 7 → L6C8 perd son 7 → **L6C8 = 4**.",
      "Dans tous les cas, l'une des deux paires vaut **4** → toute case qui voit les deux barre le 4 : L6C2 −{4}, L2C8 −{4}.",
      "**L6C2** passe de {4, 8} à {8} → **L6C2 = 8**.",
    ],
  },
  {
    id: "kite",
    num: 14,
    level: "advanced",
    title: "2-String Kite",
    concept:
      "Un cerf-volant : pour un chiffre, une ligne à deux places et une colonne à deux places, dont une place de chacune tombe dans le même bloc. Ces deux-là ne peuvent pas être vraies ensemble → au moins l'une des deux extrémités libres porte le chiffre : on le barre à leur croisement.",
    question: "Le 3 forme un cerf-volant entre la ligne 2 et la colonne 7… quel chiffre va en L8C5 ?",
    hint: "Dans le bloc haut-droit, L2C9 et L3C7 peuvent-ils être tous les deux des 3 ? Déroule les conséquences.",
    given: {},
    notes: { 13: [3, 8], 17: [3, 5], 24: [2, 3], 69: [3, 4], 67: [3, 6] },
    removals: { 67: [3] },
    unit: [...ROWS[1], ...COLS[6]],
    focus: [13, 17, 24, 69],
    target: 67,
    answer: 6,
    steps: [
      "Suis le **3** : ligne 2 → seulement **L2C5** et **L2C9** · colonne 7 → seulement **L3C7** et **L8C7**. Et **L2C9** + **L3C7** partagent le bloc haut-droit.",
      "Si L2C5 n'est pas un 3 → L2C9 = 3 → L3C7 ne peut plus l'être (même bloc) → **L8C7 = 3**. Donc L2C5 ou L8C7 est forcément un 3.",
      "**L8C5** voit ces deux extrémités (colonne 5 pour l'une, ligne 8 pour l'autre) → L8C5 −{3}.",
      "**L8C5** passe de {3, 6} à {6} → **L8C5 = 6**.",
    ],
  },
  {
    id: "empty-rectangle",
    num: 15,
    level: "advanced",
    title: "Empty Rectangle",
    concept:
      "Dans un bloc, tous les candidats d'un chiffre tiennent dans une ligne + une colonne (le reste du bloc est « vide »). Combiné à un lien fort ailleurs, cela permet de barrer le chiffre à un croisement précis : si la case visée était vraie, le bloc n'aurait plus aucune place pour ce chiffre.",
    question: "Les 6 du bloc central tiennent dans la ligne 5 et la colonne 4… quel chiffre va en L5C8 ?",
    hint: "Suppose L5C8 = 6, et suis les conséquences : que devient le lien fort de la ligne 8, puis le bloc central ?",
    given: {},
    notes: { 30: [6, 8], 39: [5, 6], 40: [2, 6], 41: [6, 7], 48: [3, 6], 66: [1, 6], 70: [4, 6], 43: [6, 9] },
    removals: { 43: [6] },
    unit: [...BOXES[4], ...ROWS[7]],
    focus: [66, 70],
    target: 43,
    answer: 9,
    steps: [
      "Dans le **bloc central**, le 6 ne se trouve que dans la **ligne 5** et la **colonne 4** (L4C4, L5C4, L5C5, L5C6, L6C4) — le reste du rectangle est vide.",
      "Autre indice : dans la **ligne 8**, le 6 n'a que deux places, **L8C4** et **L8C8** — et L8C4 est justement en colonne 4.",
      "Suppose **L5C8 = 6** : la ligne 5 et la colonne 8 se vident → L8C8 ≠ 6 → **L8C4 = 6** → la colonne 4 se vide aussi… et le bloc central n'a plus aucune place pour son 6. Contradiction → L5C8 −{6}.",
      "**L5C8** passe de {6, 9} à {9} → **L5C8 = 9**.",
    ],
  },
  {
    id: "coloring",
    num: 16,
    level: "advanced",
    title: "Coloriage",
    concept:
      "On suit UN chiffre à travers ses liens conjugués (unités où il n'a que deux places) en coloriant les cases en alternance : une couleur est vraie, l'autre fausse. Si deux cases de la MÊME couleur se retrouvent dans une même zone, cette couleur est fausse partout — et l'autre est vraie partout.",
    question: "Colorie les 5 de la chaîne… quel chiffre va en L8C3 ?",
    hint: "Alterne ➊ / ➋ le long des liens. Deux cases ➊ ne partagent-elles pas le même bloc ?",
    given: {},
    // Le 5 de L1C2 garde 3 places au 5 dans le bloc haut-gauche : le bloc n'est
    // pas un lien conjugué de la chaîne, c'est la zone où la couleur ➊ « wrap ».
    notes: { 1: [2, 5], 11: [5, 8], 65: [3, 5], 69: [5, 6], 24: [2, 5], 18: [5, 9] },
    removals: { 11: [5], 69: [5], 18: [5] },
    unit: [...COLS[2], ...ROWS[7], ...COLS[6], ...ROWS[2]],
    focus: [11, 65, 69, 24, 18],
    target: 65,
    answer: 5,
    steps: [
      "Chaîne de liens conjugués sur le **5** : colonne 3 {L2C3, L8C3} → ligne 8 {L8C3, L8C7} → colonne 7 {L8C7, L3C7} → ligne 3 {L3C7, L3C1}.",
      "Colorie en alternance : L2C3 ➊, L8C3 ➋, L8C7 ➊, L3C7 ➋, L3C1 ➊. Une couleur est entièrement vraie, l'autre entièrement fausse.",
      "Or **L2C3 ➊** et **L3C1 ➊** partagent le bloc haut-gauche : la couleur ➊ mettrait deux 5 dans le même bloc → ➊ est fausse partout : L2C3, L8C7 et L3C1 perdent leur 5.",
      "La couleur ➋ est donc vraie : **L8C3 = 5** (et L3C7 = 5).",
    ],
  },
  {
    id: "sue-de-coq",
    num: 17,
    level: "advanced",
    title: "Sue de Coq",
    concept:
      "Un comptage serré à cheval entre une ligne et un bloc : deux cases d'intersection dont les candidats viennent d'un pool de quatre chiffres, plus une bivalue dans la ligne et une bivalue dans le bloc qui se partagent ce pool sans se chevaucher. Le compte est juste-juste — chaque chiffre du pool a sa place réservée, et on nettoie tout autour.",
    question: "Quatre chiffres {1, 2, 5, 7} pour quatre cases… quel chiffre va en L1C5 ?",
    hint: "L1C8 prend un chiffre de {1, 2}, L3C1 un de {5, 7}. Que reste-t-il pour les deux cases d'intersection L1C1 et L1C2 ?",
    given: {},
    notes: { 0: [1, 2, 5], 1: [2, 5, 7], 7: [1, 2], 18: [5, 7], 4: [1, 2, 4], 10: [5, 8, 9] },
    removals: { 4: [1, 2], 10: [5] },
    unit: [...ROWS[0], ...BOXES[0]],
    focus: [0, 1, 7, 18],
    target: 4,
    answer: 4,
    steps: [
      "Le pool {1, 2, 5, 7} : **L1C1** {1, 2, 5} et **L1C2** {2, 5, 7} (intersection ligne 1 ∩ bloc), **L1C8** {1, 2} dans la ligne, **L3C1** {5, 7} dans le bloc.",
      "L1C8 prend un chiffre de {1, 2} — l'intersection, qui la voit, ne peut garder que l'autre. L3C1 prend un chiffre de {5, 7} — même chose. Les deux cases d'intersection contiennent donc exactement un chiffre de {1, 2} et un de {5, 7}.",
      "Bilan : le 1 et le 2 sont entièrement casés dans la ligne 1 (L1C8 + intersection) → on les barre ailleurs dans la ligne : L1C5 −{1, 2}. Et le 5 et le 7 sont casés dans le bloc → L2C2 −{5}.",
      "**L1C5** passe de {1, 2, 4} à {4} → **L1C5 = 4**.",
    ],
  },
];

/* Traductions EN (lessonsEn.js) attachées à chaque leçon : L.en est lu par
   coachCopy (conceptSentence) et par lessonText. Les champs positionnels
   restent uniques aux deux langues. */
for (const L of LESSONS) L.en = LESSONS_EN[L.id];

/* Les champs texte d'une leçon dans la langue demandée — repli FR champ par
   champ si une traduction manquait. */
export function lessonText(L, lang = "fr") {
  if (lang !== "en" || !L.en) {
    return { title: L.title, concept: L.concept, question: L.question, hint: L.hint, steps: L.steps };
  }
  return {
    title: L.en.title || L.title,
    concept: L.en.concept || L.concept,
    question: L.en.question || L.question,
    hint: L.en.hint || L.hint,
    steps: Array.isArray(L.en.steps) && L.en.steps.length ? L.en.steps : L.steps,
  };
}
