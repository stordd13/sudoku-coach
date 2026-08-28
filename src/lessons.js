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

export const LESSONS = [
  {
    id: "naked-single",
    num: 1,
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
];
