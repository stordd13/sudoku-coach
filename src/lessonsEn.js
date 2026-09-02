/* ================================================================
   Traductions anglaises des 17 leçons — champs texte uniquement
   (title, concept, question, hint, steps). Les champs positionnels
   (given, notes, removals, unit, focus, target, answer) restent dans
   lessons.js, uniques aux deux langues. Générées puis vérifiées
   leçon par leçon (notation RxCy, chiffres identiques au FR, gras
   conservé) ; cohérence verrouillée par check.mjs.
   ================================================================ */

export const LESSONS_EN = {
  "naked-single": {
    "title": "Naked single",
    "concept": "A cell only \"sees\" one possible digit left: the digits already placed in its row, column and box eliminate the other 8. This is the most basic technique — always start with it.",
    "question": "Which digit goes in R5C5?",
    "hint": "Write out 1 to 9, then cross off every digit the cell sees in its row, column and box. What is left?",
    "steps": [
      "Cell **R5C5** sees: row 5 → {1, 2, 3} · column 5 → {4, 5} · center box → {6, 8, 9}.",
      "That rules out eight digits: 1, 2, 3, 4, 5, 6, 8 and 9.",
      "Only one candidate remains: **7** → **R5C5 = 7**."
    ]
  },
  "hidden-single": {
    "title": "Hidden single",
    "concept": "Instead of looking at one cell, you scan a whole unit (row, column or box) following ONE digit: if only one cell in the unit can still take it, that is where it goes — even if that cell still has other candidates.",
    "question": "Where does the 5 go in the top-left box?",
    "hint": "Follow the 5: which empty cells of the box are \"seen\" by a 5 already placed (same row or same column)?",
    "steps": [
      "Question: where does the **5** go in the top-left box? Empty cells: R1C3, R2C1, R2C3, R3C1, R3C2.",
      "**R1C3**: impossible — the 5 in **R1C7** already occupies row 1. **R2C1** and **R2C3**: impossible — the 5 in **R2C5** blocks row 2.",
      "**R3C1**: impossible — the 5 in **R6C1** already occupies column 1.",
      "**R3C2** sees no 5: it is the only spot left → **R3C2 = 5**."
    ]
  },
  "naked-pair": {
    "title": "Naked pair",
    "concept": "Two cells in the same unit contain only the same two candidates. Those two digits are \"reserved\" for those two cells (in either order): you can therefore cross them off everywhere else in the unit.",
    "question": "The {3, 8} pair in row 4 unlocks one cell: which one, and with which digit?",
    "hint": "Spot the two cells in row 4 that share exactly the same two candidates… then cross those digits off elsewhere.",
    "steps": [
      "**R4C1** and **R4C2** contain only {3, 8}: wherever the 3 and the 8 of row 4 end up, it will be in these two cells.",
      "So remove 3 and 8 from the other cells in the row: R4C4 −{8}, R4C6 −{3}, R4C7 −{3, 8}.",
      "**R4C7** drops from {3, 6, 8} to {6} → **R4C7 = 6**. A naked pair has just created a naked single."
    ]
  },
  "pointing-pair": {
    "title": "Pointing pair",
    "concept": "Inside a box, a digit is only possible on a single row (or column). Since it must end up in the box on that row, you can cross it out on the rest of the row, outside the box.",
    "question": "Look at the 4s in the top-right box… which digit goes in R2C4?",
    "hint": "In the top-right box, where can the 4 still go? Notice how those cells line up.",
    "steps": [
      "In the top-right box, the **4** appears only in **R2C7** and **R2C9** — two cells in the same **row 2**.",
      "The box's 4 must therefore be one of these two cells → no other cell in row 2 can be a 4: R2C2 −{4}, R2C4 −{4}.",
      "**R2C4** goes from {4, 7} to {7} → **R2C4 = 7**."
    ]
  },
  "claiming": {
    "title": "Box/line reduction",
    "concept": "This is the pointing pair in reverse: on a row (or column), a digit is only possible inside a single box. It therefore \"belongs\" to that box through this row: you cross it out of the box's other cells.",
    "question": "Follow the 6 in column 5… which digit goes in R5C4?",
    "hint": "In column 5, which cells can still take a 6? Which box do they all fall into?",
    "steps": [
      "In **column 5**, the **6** is only possible in **R4C5** and **R5C5** — both in the **center box**.",
      "Column 5's 6 will therefore land in that box → the other cells of the center box cannot be a 6: R5C4 −{6}, R4C6 −{6}.",
      "**R5C4** goes from {5, 6} to {5} → **R5C4 = 5**."
    ]
  },
  "hidden-pair": {
    "title": "Hidden pair",
    "concept": "Two digits appear only in the same two cells of a unit: those cells are reserved for them. Their other candidates disappear — and this big cleanup often unlocks the next move.",
    "question": "Find the hidden pair in the bottom-left box… which cell gets unlocked next?",
    "hint": "Go through the digits one by one: which ones appear only in the same two cells of the box?",
    "steps": [
      "In the bottom-left box, follow the **2** and the **9**: each appears only in **R8C2** and **R9C3**.",
      "These two cells are therefore reserved for the pair {2, 9} → their other candidates disappear: R8C2 −{4, 6}, R9C3 −{1, 5}.",
      "As a result, the **1** in the box has only one possible place left, **R7C1** → **R7C1 = 1**. A hidden pair has just unlocked a hidden single."
    ]
  },
  "x-wing": {
    "title": "X-Wing",
    "concept": "A digit is down to two possible spots in two rows, and those spots fall in the same two columns: they form a rectangle. The digit will occupy one diagonal or the other — either way, it is \"reserved\" for those two columns. So you cross it out everywhere else in those columns.",
    "question": "The 4 is locked in rows 1 and 5: which digit gets freed up in R3C2?",
    "hint": "Follow the 4 across rows 1 and 5: which columns does it hide in? Notice the rectangle.",
    "steps": [
      "Follow the **4** across rows 1 and 5: each row has only two possible cells left — **R1C2/R1C6** and **R5C2/R5C6**, all in columns 2 and 6.",
      "These four cells form a rectangle (**X-Wing**). In each column, the 4 will be claimed by one of the two rows → no other cell in columns 2 and 6 can be a 4: R3C2 −{4}, R8C6 −{4}.",
      "**R3C2** goes from {4, 7} to {7} → **R3C2 = 7**."
    ]
  },
  "xy-wing": {
    "title": "XY-Wing",
    "concept": "Three bi-value cells linked in a Y: a pivot {a, b} and two \"pincers\" {a, c} and {b, c} that it sees. Whatever value the pivot takes, one of the pincers will be c. So any cell that sees both pincers loses c.",
    "question": "The pivot R5C5 and its two pincers unlock R1C1: with which digit?",
    "hint": "Spot the {1, 2} pivot. Its two pincers share the same third digit: which one?",
    "steps": [
      "**R5C5** holds only {1, 2}. Its two pincers: **R5C1** = {1, 3} (same row) and **R1C5** = {2, 3} (same column).",
      "If R5C5 = 1, then R5C1 = 3; if R5C5 = 2, then R1C5 = 3. Either way, **a 3 appears in R5C1 or R1C5**.",
      "**R1C1** sees both pincers: it cannot be a 3. It goes from {3, 7} to {7} → **R1C1 = 7**."
    ]
  },
  "swordfish": {
    "title": "Swordfish",
    "concept": "The X-Wing scaled up: a digit spreads across three rows, entirely contained in three columns (two or three cells per row). Those three columns will share the digit across those rows → you cross it out everywhere else in those columns.",
    "question": "The 3 draws a Swordfish on rows 1, 5 and 9: what happens to R3C3?",
    "hint": "Follow the 3 across rows 1, 5 and 9: how many different columns does it occupy in total?",
    "steps": [
      "Follow the **3** across rows 1, 5 and 9: each time it is confined to columns 3, 5 and 7 (six highlighted cells).",
      "Those three columns will share the 3s of these three rows (**Swordfish**) → no other cell in columns 3, 5 and 7 can be a 3: R3C3 −{3}.",
      "**R3C3** goes from {3, 9} to {9} → **R3C3 = 9**."
    ]
  },
  "skyscraper": {
    "title": "Skyscraper",
    "concept": "A digit forms two “strong links” (only two possible cells) in two rows, and those links share the same column (the base). Since the base cannot hold the digit twice, one of the two “roofs” must hold it: any cell that sees both roofs loses this digit.",
    "question": "The two strong links on 5 meet in column 1: which digit goes in R2C6?",
    "hint": "The 5 has only two places in row 1 and two in row 4. What do these links share?",
    "steps": [
      "The **5** has only two places in row 1 (**R1C1**, **R1C5**) and two in row 4 (**R4C1**, **R4C6**). The two “feet” R1C1 and R4C1 share column 1: that is the base.",
      "The base cannot hold two 5s → one of the two “roofs” (**R1C5** or **R4C6**) must be a 5.",
      "**R2C6** sees both roofs (via column 6 and via the box): it loses the 5 and goes from {5, 8} to {8} → **R2C6 = 8**."
    ]
  },
  "remote-pairs": {
    "title": "Remote pairs",
    "concept": "A chain of cells all holding only the same pair {a, b}, linked one to the next. Along the chain, a and b alternate (two “colors”). Any outside cell that sees two links of opposite colors can be neither a nor b.",
    "question": "The {1, 2} chain snakes its way around to corner R1C9: which digit goes there?",
    "hint": "Color the chain alternately. Which cells does R1C9 see at the two ends?",
    "steps": [
      "Four cells hold only {1, 2} and form a chain: **R1C1 – R1C5 – R5C5 – R5C9**. Color them alternately.",
      "The 1 and the 2 swap places along the chain: the ends **R1C1** and **R5C9** have opposite colors — one holds the 1, the other the 2.",
      "**R1C9** sees both ends: it can be neither 1 nor 2. It loses the 2 and goes from {2, 5} to {5} → **R1C9 = 5**."
    ]
  },
  "xyz-wing": {
    "title": "XYZ-Wing",
    "concept": "The XY-Wing’s cousin, with a pivot holding THREE candidates {x, y, z}, linked to two pincers {x, z} and {y, z}. Whatever the pivot’s value, a z appears in the trio — but here the pivot itself can be z: you only eliminate z from cells that see all three cells at once.",
    "question": "Pivot in R5C4, pincers in R5C1 and R4C5… which digit goes in R5C5?",
    "hint": "Test the three possible values of the pivot R5C4. In each scenario, where does the 9 appear?",
    "steps": [
      "The **pivot R5C4** holds {2, 5, 9}; its pincers: **R5C1** {2, 9} (same row) and **R4C5** {5, 9} (same box).",
      "Three scenarios: pivot = 2 → R5C1 = 9 · pivot = 5 → R4C5 = 9 · pivot = 9 → the pivot itself is a 9.",
      "In all three cases, a 9 appears in the trio → any cell that sees **all three** cannot be a 9: R5C5 −{9}, R5C6 −{9}.",
      "**R5C5** goes from {4, 9} to {4} → **R5C5 = 4**."
    ]
  },
  "w-wing": {
    "title": "W-Wing",
    "concept": "Two distant cells share exactly the same pair {a, b} without seeing each other. If a strong link on b connects them (a unit where b has only two places, each seeing one of the two cells), then one of the two cells must be a — so you eliminate a from every cell that sees both.",
    "question": "Two {4, 7} pairs linked by the 7s in column 5… which digit goes in R6C2?",
    "hint": "In column 5, the 7 has only two places. Try each one in turn: what happens to R2C2 and R6C8?",
    "steps": [
      "**R2C2** and **R6C8** share the same pair {4, 7} without seeing each other. In **column 5**, the 7 has only two places: **R2C5** and **R6C5**.",
      "If R2C5 = 7 → R2C2 loses its 7 (same row) → **R2C2 = 4**. If R6C5 = 7 → R6C8 loses its 7 → **R6C8 = 4**.",
      "Either way, one of the two pairs is a **4** → every cell that sees both drops the 4: R6C2 −{4}, R2C8 −{4}.",
      "**R6C2** goes from {4, 8} to {8} → **R6C2 = 8**."
    ]
  },
  "kite": {
    "title": "2-String Kite",
    "concept": "A kite: for one digit, a row with two places and a column with two places, with one place from each landing in the same box. Those two can't both be true → at least one of the two free ends holds the digit: eliminate it where they intersect.",
    "question": "The 3 forms a kite between row 2 and column 7… which digit goes in R8C5?",
    "hint": "In the top-right box, can R2C9 and R3C7 both be 3s? Follow the consequences.",
    "steps": [
      "Track the **3**: row 2 → only **R2C5** and **R2C9** · column 7 → only **R3C7** and **R8C7**. And **R2C9** + **R3C7** share the top-right box.",
      "If R2C5 is not a 3 → R2C9 = 3 → R3C7 can no longer be one (same box) → **R8C7 = 3**. So R2C5 or R8C7 must be a 3.",
      "**R8C5** sees both of those ends (column 5 for one, row 8 for the other) → R8C5 −{3}.",
      "**R8C5** goes from {3, 6} to {6} → **R8C5 = 6**."
    ]
  },
  "empty-rectangle": {
    "title": "Empty rectangle",
    "concept": "In one box, all the candidates for a digit fit in a single row + a single column (the rest of the box is \"empty\"). Combined with a strong link elsewhere, this lets you eliminate the digit at a precise intersection: if the target cell were true, the box would have no place left for that digit.",
    "question": "The 6s in the central box fit in row 5 and column 4… which digit goes in R5C8?",
    "hint": "Suppose R5C8 = 6 and follow the consequences: what happens to the strong link in row 8, then to the central box?",
    "steps": [
      "In the **central box**, the 6 appears only in **row 5** and **column 4** (R4C4, R5C4, R5C5, R5C6, R6C4) — the rest of the rectangle is empty.",
      "Another clue: in **row 8**, the 6 has only two places, **R8C4** and **R8C8** — and R8C4 sits precisely in column 4.",
      "Suppose **R5C8 = 6**: row 5 and column 8 empty out → R8C8 ≠ 6 → **R8C4 = 6** → column 4 empties out too… and the central box has no place left for its 6. Contradiction → R5C8 −{6}.",
      "**R5C8** goes from {6, 9} to {9} → **R5C8 = 9**."
    ]
  },
  "coloring": {
    "title": "Coloring",
    "concept": "You track ONE digit through its conjugate links (units where it has only two places), coloring the cells alternately: one color is true, the other false. If two cells of the SAME color end up in the same unit, that color is false everywhere — and the other is true everywhere.",
    "question": "Color the 5s along the chain… which digit goes in R8C3?",
    "hint": "Alternate ➊ / ➋ along the links. Don't two ➊ cells share the same box?",
    "steps": [
      "Chain of conjugate links on the **5**: column 3 {R2C3, R8C3} → row 8 {R8C3, R8C7} → column 7 {R8C7, R3C7} → row 3 {R3C7, R3C1}.",
      "Color alternately: R2C3 ➊, R8C3 ➋, R8C7 ➊, R3C7 ➋, R3C1 ➊. One color is entirely true, the other entirely false.",
      "But **R2C3 ➊** and **R3C1 ➊** share the top-left box: color ➊ would put two 5s in the same box → ➊ is false everywhere: R2C3, R8C7 and R3C1 lose their 5.",
      "Color ➋ is therefore true: **R8C3 = 5** (and R3C7 = 5)."
    ]
  },
  "sue-de-coq": {
    "title": "Sue de Coq",
    "concept": "A tight count straddling a row and a box: two intersection cells whose candidates come from a pool of four digits, plus a bi-value cell in the row and a bi-value cell in the box that split this pool without overlapping. The count is exact — every digit in the pool has its reserved spot, and you clean up everything around it.",
    "question": "Four digits {1, 2, 5, 7} for four cells… which digit goes in R1C5?",
    "hint": "R1C8 takes one digit from {1, 2}, R3C1 one from {5, 7}. What is left for the two intersection cells R1C1 and R1C2?",
    "steps": [
      "The pool {1, 2, 5, 7}: **R1C1** {1, 2, 5} and **R1C2** {2, 5, 7} (intersection row 1 ∩ box), **R1C8** {1, 2} in the row, **R3C1** {5, 7} in the box.",
      "R1C8 takes one digit from {1, 2} — the intersection, which sees it, can only keep the other. R3C1 takes one digit from {5, 7} — same thing. So the two intersection cells hold exactly one digit from {1, 2} and one from {5, 7}.",
      "Tally: the 1 and the 2 are fully accounted for in row 1 (R1C8 + intersection) → cross them out elsewhere in the row: R1C5 −{1, 2}. And the 5 and the 7 are accounted for in the box → R2C2 −{5}.",
      "**R1C5** goes from {1, 2, 4} to {4} → **R1C5 = 4**."
    ]
  }
};
