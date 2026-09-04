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
    "concept": "Every empty cell has a few possible digits: these are its [[candidates]]. When a cell keeps only one, that digit must be the right one. This is the [[naked single]] — the most basic technique, always try it first.",
    "question": "Which digit goes in cell R5C5?",
    "hint": "Write the digits 1 to 9 on paper. [[Cross out]] every digit that cell R5C5 [[sees]] in its [[row]], its [[column]] and its [[box]]. What is left?",
    "steps": [
      "Look at cell **R5C5**. Its [[row]] already holds 1, 2 and 3. Its [[column]] holds 4 and 5, and its [[box]] holds 6, 8 and 9.",
      "[[Cross out]] these eight digits in the cell: 1, 2, 3, 4, 5, 6, 8 and 9 are impossible.",
      "Only one [[candidate]] is left: the **7**. So write **7** in cell **R5C5**."
    ]
  },
  "hidden-single": {
    "title": "Hidden single",
    "concept": "Follow a single digit inside a [[zone]]: if it has only one possible place left, it goes there. This is the [[hidden single]]. The cell may hold other [[candidates]]: it does not matter, that digit has nowhere else to go.",
    "question": "Where does the 5 go in the top-left box?",
    "hint": "Follow the 5. Which free cells of the box are [[seen]] by a 5 already placed, on the same row or the same column?",
    "steps": [
      "Look for where to place the **5** in the top-left box. Its free cells are R1C3, R2C1, R2C3, R3C1 and R3C2.",
      "Look at the 5 in **R1C7**: it already occupies row 1, so **R1C3** is impossible. The 5 in **R2C5** occupies row 2: **R2C1** and **R2C3** are impossible.",
      "Look at the 5 in **R6C1**: it already occupies column 1, so **R3C1** is impossible.",
      "Only **R3C2** is left: it [[sees]] no 5. So write **5** in **R3C2**."
    ]
  },
  "naked-pair": {
    "title": "Naked pair",
    "concept": "Two cells of the same [[zone]] accept only the same two digits: this is a [[naked pair]]. Those two digits are reserved for those two cells, in one order or the other. So you can [[cross out]] both digits everywhere else in the zone.",
    "question": "The 3 and 8 pair in row 4 unlocks one cell. Which one, and with which digit?",
    "hint": "Spot the two cells of row 4 that share exactly the same two [[candidates]]. Then cross out those digits elsewhere in the row.",
    "steps": [
      "Look at **R4C1** and **R4C2**: each accepts only 3 and 8. The 3 and the 8 of row 4 must go in these two cells. This is a [[naked pair]].",
      "So no other cell of row 4 can be a 3 or an 8. Cross out the 8 in **R4C4**, the 3 in **R4C6**, and the 3 and the 8 in **R4C7**.",
      "In **R4C7**, only the **6** remains. So write **6** in **R4C7**: the naked pair has created a [[naked single]]."
    ]
  },
  "pointing-pair": {
    "title": "Pointing pair",
    "concept": "Inside a [[box]], a digit sometimes has its remaining places on a single [[row]] only. That digit must end up in the box, on that row. So you can [[cross out]] that digit on the rest of the row, outside the box. This is the [[pointing pair]].",
    "question": "Follow the 4s in the top-right box. Which digit goes in cell R2C4?",
    "hint": "Find the cells of the top-right box that can still take a 4. Look at how they line up.",
    "steps": [
      "Follow the **4** in the top-right box. It has only two places left: **R2C7** and **R2C9**, both on [[row]] 2. This is a [[pointing pair]].",
      "So the box's 4 will be **R2C7** or **R2C9**. No other cell of row 2 can be a 4. [[Cross out]] the 4 in **R2C2** and in **R2C4**.",
      "In cell **R2C4**, only the **7** remains. So write **7** in **R2C4**."
    ]
  },
  "claiming": {
    "title": "Box/line reduction",
    "concept": "On a [[row]] or a [[column]], a digit sometimes has its remaining places inside a single [[box]] only. That digit must end up in that box, on that line. You can [[cross out]] that digit from the other cells of the box: this is the [[box/line reduction]], the pointing pair in reverse.",
    "question": "Follow the 6 in column 5. Which digit goes in cell R5C4?",
    "hint": "In column 5, which cells can still take a 6? Which box do they all fall into?",
    "steps": [
      "Follow the **6** in column 5: it has only two places left, **R4C5** and **R5C5**. Both are in the center box.",
      "So the 6 of column 5 will land in the center box. No other cell of that box can be a 6. Cross out the 6 in **R5C4** and in **R4C6**.",
      "In cell **R5C4**, only the **5** remains. So write **5** in **R5C4**."
    ]
  },
  "hidden-pair": {
    "title": "Hidden pair",
    "concept": "Two digits each have only two places in a [[zone]], and those are the same two cells: this is a [[hidden pair]]. Those two cells are reserved for them. You can [[cross out]] all their other [[candidates]], and that cleanup often unlocks the next move.",
    "question": "Find the hidden pair in the bottom-left box. Which cell gets unlocked next?",
    "hint": "Go through the digits one by one. Which ones appear only in the same two cells of the box?",
    "steps": [
      "In the bottom-left box, follow the **2** then the **9**: each appears only in **R8C2** and **R9C3**. This is a [[hidden pair]].",
      "Those two cells are reserved for the 2 and the 9. Cross out their other candidates: the 4 and the 6 in **R8C2**, the 1 and the 5 in **R9C3**.",
      "The **1** of the box has only one place left: **R7C1**. So write **1** in **R7C1**: the hidden pair has unlocked a [[hidden single]]."
    ]
  },
  "x-wing": {
    "title": "X-Wing",
    "concept": "Sometimes a digit has only two places left in each of two [[rows]], in the same two [[columns]]. Those four cells draw a rectangle: this is the [[X-Wing]]. The digit will take one corner at the top and one at the bottom, one per column. So it is reserved for those two columns: [[cross out]] that digit everywhere else in them.",
    "question": "The 4 is locked on rows 1 and 5. Which digit gets freed in cell R3C2?",
    "hint": "Follow the 4 on row 1, then on row 5. Which columns does it fall into? Look at the rectangle.",
    "steps": [
      "Follow the **4** on row 1: only **R1C2** and **R1C6** remain. On row 5, only **R5C2** and **R5C6** remain. All these places fall in [[columns]] 2 and 6.",
      "These four cells draw a rectangle: an [[X-Wing]]. Each column will take a 4 on row 1 or row 5. No other cell of columns 2 and 6 can be a 4: [[cross out]] the 4 in **R3C2** and in **R8C6**.",
      "In cell **R3C2**, only the **7** remains. So write **7** in **R3C2**."
    ]
  },
  "xy-wing": {
    "title": "XY-Wing",
    "concept": "Three cells with two [[candidates]] form a Y: a [[pivot]] and two [[pincers]] it [[sees]]. The pivot hesitates between a and b, one pincer between a and c, the other between b and c. Whatever the pivot is, one pincer will be c: any cell that sees both pincers loses the c. This is the [[XY-Wing]].",
    "question": "The pivot R5C5 and its two pincers unlock R1C1. With which digit?",
    "hint": "Spot the pivot that hesitates between 1 and 2. Its two pincers share the same third digit: which one?",
    "steps": [
      "The [[pivot]] **R5C5** hesitates between 1 and 2. Its first [[pincer]] **R5C1** hesitates between 1 and 3, on the same row. Its second pincer **R1C5** hesitates between 2 and 3, on the same column.",
      "If R5C5 is 1, then R5C1 is 3. If R5C5 is 2, then R1C5 is 3. Either way, a 3 appears in **R5C1** or in **R1C5**.",
      "**R1C1** sees both pincers: it cannot be a 3. Cross out the 3 in R1C1: only the **7** remains. So write **7** in **R1C1**."
    ]
  },
  "swordfish": {
    "title": "Swordfish",
    "concept": "A digit spreads across three [[rows]], and all its places fall in the same three [[columns]]: this is the [[Swordfish]], a bigger X-Wing. Those three columns will share the digit across those rows. So you can [[cross out]] that digit elsewhere in those columns.",
    "question": "The 3 draws a Swordfish on rows 1, 5 and 9. What happens to cell R3C3?",
    "hint": "Follow the 3 on rows 1, 5 and 9. How many different columns does it occupy in total?",
    "steps": [
      "Follow the **3** on three rows. Row 1: **R1C3** and **R1C5**; row 5: **R5C5** and **R5C7**; row 9: **R9C3** and **R9C7**. It never leaves columns 3, 5 and 7.",
      "Those three columns will share the 3s of those three rows: this is a [[Swordfish]]. No other cell of columns 3, 5 and 7 can be a 3. Cross out the 3 in **R3C3**.",
      "In cell **R3C3**, only the **9** remains. So write **9** in **R3C3**."
    ]
  },
  "skyscraper": {
    "title": "Skyscraper",
    "concept": "A digit forms two [[strong links]] on two [[rows]], and those links share the same [[column]]: this is the [[Skyscraper]]. That column is the base, the two other cells are the roofs. The base cannot hold the digit twice: one of the two roofs must hold it. Any cell that [[sees]] both roofs loses that digit.",
    "question": "The two strong links on 5 meet in column 1. Which digit goes in cell R2C6?",
    "hint": "The 5 has only two places on row 1 and two on row 4. What do those two links share?",
    "steps": [
      "Follow the **5**: on row 1, it has only **R1C1** and **R1C5**; on row 4, it has only **R4C1** and **R4C6**. The feet R1C1 and R4C1 share column 1: that is the base.",
      "The base cannot hold two 5s. So one of the two roofs, **R1C5** or **R4C6**, must be a 5.",
      "**R2C6** sees both roofs, through column 6 and through the box: it loses the 5. Cross out the 5 in R2C6: only the **8** remains. So write **8** in **R2C6**."
    ]
  },
  "remote-pairs": {
    "title": "Remote pairs",
    "concept": "Several cells accept only the same two digits and follow one another step by step: these are [[Remote Pairs]]. Along the chain, the two digits alternate, like two [[colors]]. Any outside cell that [[sees]] two links of opposite colors can be neither digit.",
    "question": "The 1 and 2 chain snakes its way to R1C9. Which digit goes there?",
    "hint": "Color the chain alternately. Which cells does R1C9 see at the two ends?",
    "steps": [
      "Four cells accept only 1 and 2 and form a chain: **R1C1**, **R1C5**, **R5C5** then **R5C9**. Color them alternately.",
      "The 1 and the 2 swap places along the chain. The ends **R1C1** and **R5C9** have opposite colors: one holds the 1, the other the 2.",
      "**R1C9** sees both ends: it can be neither 1 nor 2. Cross out the 2 in R1C9: only the **5** remains. So write **5** in **R1C9**."
    ]
  },
  "xyz-wing": {
    "title": "XYZ-Wing",
    "concept": "The cousin of the XY-Wing, with a [[pivot]] holding three [[candidates]]: this is the [[XYZ-Wing]]. The pivot hesitates between x, y and z; one pincer between x and z, the other between y and z. Whatever the pivot is, a z appears in the trio, sometimes in the pivot itself. So you only cross out the z in cells that [[see]] all three.",
    "question": "Pivot in R5C4, pincers in R5C1 and R4C5. Which digit goes in cell R5C5?",
    "hint": "Test the three possible values of the pivot R5C4. In each scenario, where does the 9 appear?",
    "steps": [
      "The [[pivot]] **R5C4** hesitates between 2, 5 and 9. Its [[pincer]] **R5C1** hesitates between 2 and 9, on the same row. Its pincer **R4C5** hesitates between 5 and 9, in the same box.",
      "If the pivot is 2, then R5C1 is 9. If it is 5, then R4C5 is 9. If it is 9, the pivot itself is the 9.",
      "In all three scenarios, a 9 appears in the trio. Any cell that sees **all three** cannot be a 9. Cross out the 9 in **R5C5** and in **R5C6**.",
      "In cell **R5C5**, only the **4** remains. So write **4** in **R5C5**."
    ]
  },
  "w-wing": {
    "title": "W-Wing",
    "concept": "Two distant cells hold only the same two digits a and b, without [[seeing]] each other. Joined by a [[strong link]] on b, they form a [[W-Wing]]. The strong link is a zone where b has only two places, each seeing one of the two cells. One of the two cells must then be a: [[cross out]] a everywhere that sees both.",
    "question": "Two 4 and 7 pairs linked by the 7s in column 5. Which digit goes in cell R6C2?",
    "hint": "In column 5, the 7 has only two places. Suppose each one true in turn: what happens to R2C2 and R6C8?",
    "steps": [
      "**R2C2** and **R6C8** both hesitate between 4 and 7, without seeing each other. In **column 5**, the 7 has only two places: **R2C5** and **R6C5**. This is a [[strong link]].",
      "If R2C5 is 7, then R2C2 loses its 7 and is **4**. If R6C5 is 7, then R6C8 loses its 7 and is **4**.",
      "Either way, one of the two pairs is 4: this is a [[W-Wing]]. Any cell that sees both loses the 4. Cross out the 4 in **R6C2** and in **R2C8**.",
      "In cell **R6C2**, only the **8** remains. So write **8** in **R6C2**."
    ]
  },
  "kite": {
    "title": "2-String Kite",
    "concept": "A digit has two places on a [[row]] and two on a [[column]], one of each in the same [[box]]: this is the [[2-String Kite]]. Those two places in the box cannot both be true. So one of the two free ends holds the digit: [[cross out]] that digit where they cross.",
    "question": "The 3 forms a kite between row 2 and column 7. Which digit goes in cell R8C5?",
    "hint": "In the top-right box, can R2C9 and R3C7 both be 3s? Follow the consequences.",
    "steps": [
      "Follow the **3**: on row 2, only **R2C5** and **R2C9**; on column 7, only **R3C7** and **R8C7**. And **R2C9** and **R3C7** share the top-right box.",
      "If R2C5 is not a 3, then R2C9 is 3. R3C7 can no longer be one, same box, so **R8C7** is 3. Thus R2C5 or R8C7 must be a 3.",
      "**R8C5** sees both ends: R2C5 through column 5, R8C7 through row 8. It cannot be a 3. Cross out the 3 in **R8C5**.",
      "In cell **R8C5**, only the **6** remains. So write **6** in **R8C5**."
    ]
  },
  "empty-rectangle": {
    "title": "Empty rectangle",
    "concept": "In a [[box]], all [[candidates]] of a digit fit in one row plus one column, and the rest is empty: this is the [[Empty Rectangle]]. Combined with a [[strong link]] elsewhere, it crosses out the digit at a precise crossing. If the target cell were true, the box would have no place left for that digit.",
    "question": "The 6s of the center box fit in row 5 and column 4. Which digit goes in cell R5C8?",
    "hint": "Suppose R5C8 equals 6, and follow the consequences. What happens to the strong link of row 8, then to the center box?",
    "steps": [
      "In the **center box**, the 6 sits only in **row 5** and **column 4**: R4C4, R5C4, R5C5, R5C6 and R6C4. The rest of the rectangle is empty.",
      "Another clue: in **row 8**, the 6 has only two places, **R8C4** and **R8C8**. This is a [[strong link]], and R8C4 sits precisely in column 4.",
      "Suppose **R5C8** equals 6: row 5 and column 8 empty out, so R8C8 loses the 6 and **R8C4** is 6. Column 4 empties out too, and the center box has no place left for its 6. Contradiction: cross out the 6 in R5C8.",
      "In cell **R5C8**, only the **9** remains. So write **9** in **R5C8**."
    ]
  },
  "coloring": {
    "title": "Coloring",
    "concept": "Follow a single digit through its [[strong links]], coloring the cells in two alternating [[colors]]: this is [[Coloring]]. One color is true everywhere, the other false everywhere. If two cells of the same color end up in the same zone, that color is false everywhere, and the other is true everywhere.",
    "question": "Color the 5s along the chain. Which digit goes in cell R8C3?",
    "hint": "Alternate ➊ and ➋ along the links. Do two ➊ cells not share the same box?",
    "steps": [
      "Follow the **5** from [[strong link]] to strong link. Column 3: R2C3 and R8C3, then row 8: R8C3 and R8C7. Column 7: R8C7 and R3C7, then row 3: R3C7 and R3C1.",
      "Color alternately: R2C3 ➊, R8C3 ➋, R8C7 ➊, R3C7 ➋, R3C1 ➊. One color is entirely true, the other entirely false.",
      "But **R2C3** ➊ and **R3C1** ➊ share the top-left box: color ➊ would put two 5s in the same box. So it is false everywhere. Cross out the 5 in R2C3, in R8C7 and in R3C1.",
      "Color ➋ is therefore true. Write **5** in **R8C3**, and also in R3C7."
    ]
  },
  "sue-de-coq": {
    "title": "Sue de Coq",
    "concept": "A tight count straddling a [[row]] and a [[box]]: this is the [[Sue de Coq]]. Two intersection cells draw from a pool of four digits. One cell of the row and one cell of the box, with two [[candidates]] each, split that pool without overlapping. Every digit of the pool then has its reserved place: you clean up all around.",
    "question": "Four digits 1, 2, 5 and 7 for four cells. Which digit goes in cell R1C5?",
    "hint": "R1C8 takes one digit among 1 and 2, R3C1 one digit among 5 and 7. What is left for the two intersection cells R1C1 and R1C2?",
    "steps": [
      "The pool is 1, 2, 5 and 7. At the crossing of row 1 and the box, **R1C1** hesitates between 1, 2 and 5, and **R1C2** between 2, 5 and 7. In the row, **R1C8** hesitates between 1 and 2; in the box, **R3C1** between 5 and 7.",
      "R1C8 takes one digit among 1 and 2: the intersection, which sees it, keeps only the other. R3C1 takes one digit among 5 and 7: same thing. So R1C1 and R1C2 hold exactly one digit among 1 and 2, and one among 5 and 7.",
      "Tally: the 1 and the 2 are settled in row 1, between R1C8 and the intersection. Cross out the 1 and the 2 in **R1C5**. The 5 and the 7 are settled in the box: cross out the 5 in **R2C2**.",
      "In cell **R1C5**, only the **4** remains. So write **4** in **R1C5**."
    ]
  }
};
