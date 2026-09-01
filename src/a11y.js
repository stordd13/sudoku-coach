/* ================================================================
   Accessibilité — module PUR (labels générés, testés dans check.mjs).
   Le label d'une case n'annonce QUE ce qu'un voyant voit : la valeur
   (donnée ou posée) et les NOTES du joueur — jamais les candidats
   calculés, sinon le lecteur d'écran divulguerait la solution.
   ================================================================ */
import { rowOf, colOf } from "./engine.js";

/* « 2, 3 et 5 » / « 2, 3 and 5 ». */
function listDigits(ds, tFn) {
  if (ds.length === 1) return String(ds[0]);
  return ds.slice(0, -1).join(", ") + tFn("a11y.and") + ds[ds.length - 1];
}

/* « Ligne 3, colonne 7 — vide, notes 2 et 5 » / « … — 8, donnée de départ »
   (+ « , en conflit »). tFn = le t() d'i18n (injecté : module testable). */
export function cellAriaLabel({ index, value, given, noteDigits = [], conflict = false }, tFn) {
  const pos = tFn("a11y.cell.pos", { row: rowOf(index) + 1, col: colOf(index) + 1 });
  let state;
  if (value) {
    state = given ? tFn("a11y.cell.given", { d: value }) : tFn("a11y.cell.placed", { d: value });
  } else if (noteDigits.length) {
    state = tFn(noteDigits.length === 1 ? "a11y.cell.notes.one" : "a11y.cell.notes.other",
      { list: listDigits(noteDigits, tFn) });
  } else {
    state = tFn("a11y.cell.empty");
  }
  return `${pos} — ${state}${conflict ? tFn("a11y.cell.conflict") : ""}`;
}
