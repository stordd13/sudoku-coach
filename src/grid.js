/* ================================================================
   SUDOKU · COACH — géométrie de la grille (module pur, zéro import).
   Partagé par engine.js (qui ré-exporte ROWS/COLS/BOXES/PEERS/rowOf/
   colOf pour ses importeurs historiques) et finders.js (palier A).
   ================================================================ */
export const ROWS = Array.from({ length: 9 }, (_, r) =>
  Array.from({ length: 9 }, (_, c) => r * 9 + c)
);
export const COLS = Array.from({ length: 9 }, (_, c) =>
  Array.from({ length: 9 }, (_, r) => r * 9 + c)
);
export const BOXES = Array.from({ length: 9 }, (_, b) => {
  const br = Math.floor(b / 3) * 3, bc = (b % 3) * 3, cs = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) cs.push((br + r) * 9 + bc + c);
  return cs;
});
export const UNITS = [
  ...ROWS.map((cells, i) => ({ type: "row", index: i, cells })),
  ...COLS.map((cells, i) => ({ type: "col", index: i, cells })),
  ...BOXES.map((cells, i) => ({ type: "box", index: i, cells })),
];
// Lignes et colonnes seulement (unités « droites »), même objets que UNITS.
export const LINES = UNITS.filter((u) => u.type !== "box");
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of UNITS) if (u.cells.includes(i)) u.cells.forEach((j) => { if (j !== i) s.add(j); });
  return s;
});
export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);

// Toutes les combinaisons de k éléments de arr, dans l'ordre lexicographique.
export function combos(arr, k) {
  const res = [];
  const rec = (start, acc) => {
    if (acc.length === k) { res.push(acc.slice()); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return res;
}
