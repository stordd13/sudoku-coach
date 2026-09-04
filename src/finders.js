/* ================================================================
   SUDOKU · COACH — finders du palier A (v2.3) : triplets/quadruplets,
   poissons à nageoire, jellyfish, X-Chain, XY-Chain, rectangle unique,
   BUG+1. Module pur : même contrat que les finders d'engine.js —
     (cands: Set[81], prefer: Set<case> | null) → élimination | null
   avec élimination = { kind, cells, digits, removals: [{cell, digits}], … }.
   Déterministe (ordre d'itération fixe), premier motif trouvé ; `prefer`
   exige qu'au moins un removal touche une case préférée ; une case sans
   candidat compte comme résolue. engine.js insère ces finders dans
   ELIM_FINDERS par leur kind (ordre pédagogique = contrat).
   ================================================================ */
import { UNITS, PEERS, combos } from "./grid.js";

// Garde commune : removals non vides et, si prefer, au moins une case visée.
const accept = (removals, prefer) =>
  removals.length > 0 && (!prefer || removals.some((r) => prefer.has(r.cell)));
const sees = (a, b) => PEERS[a].has(b);
const asc = (a, b) => a - b;

/* ---------- A1. Sous-ensembles nus et cachés (triplets, quadruplets) ----------
   Nu : `size` cases d'une unité (2..size candidats chacune) dont l'union des
   candidats fait exactement `size` chiffres → ces chiffres quittent le reste
   de l'unité. Caché : `size` chiffres (2..size places chacun — 1 place serait
   un single caché) dont l'union des places fait exactement `size` cases → ces
   cases perdent leurs autres candidats. Généralise nakedPair / hiddenPair. */
function nakedSubsetFinder(size, kind) {
  return (cands, prefer) => {
    for (const u of UNITS) {
      const pool = u.cells.filter((i) => cands[i].size >= 2 && cands[i].size <= size);
      if (pool.length < size) continue;
      for (const cells of combos(pool, size)) {
        const union = new Set();
        cells.forEach((i) => cands[i].forEach((d) => union.add(d)));
        if (union.size !== size) continue;
        const digits = [...union].sort(asc);
        const removals = [];
        for (const j of u.cells) {
          if (cells.includes(j)) continue;
          const rem = digits.filter((d) => cands[j].has(d));
          if (rem.length) removals.push({ cell: j, digits: rem });
        }
        if (!accept(removals, prefer)) continue;
        return { kind, unit: u, cells, digits, removals };
      }
    }
    return null;
  };
}
function hiddenSubsetFinder(size, kind) {
  return (cands, prefer) => {
    for (const u of UNITS) {
      const posByD = {}, present = [];
      for (let d = 1; d <= 9; d++) {
        const pos = u.cells.filter((i) => cands[i].has(d));
        if (pos.length >= 2 && pos.length <= size) { posByD[d] = pos; present.push(d); }
      }
      if (present.length < size) continue;
      for (const digits of combos(present, size)) {
        const union = new Set();
        digits.forEach((d) => posByD[d].forEach((i) => union.add(i)));
        if (union.size !== size) continue;
        const cells = [...union].sort(asc);
        const removals = [];
        for (const cell of cells) {
          const others = [...cands[cell]].filter((x) => !digits.includes(x)).sort(asc);
          if (others.length) removals.push({ cell, digits: others });
        }
        if (!accept(removals, prefer)) continue;
        return { kind, unit: u, cells, digits, removals };
      }
    }
    return null;
  };
}
export const findNakedTripleE = nakedSubsetFinder(3, "nakedTriple");
export const findHiddenTripleE = hiddenSubsetFinder(3, "hiddenTriple");
export const findNakedQuadE = nakedSubsetFinder(4, "nakedQuad");
export const findHiddenQuadE = hiddenSubsetFinder(4, "hiddenQuad");

/* Rempli technique par technique (A1 → A6) ; un kind absent est ignoré par
   engine.js (filtre typeof === "function"). */
export const PALIER_A_FINDERS = {
  nakedTriple: findNakedTripleE, hiddenTriple: findHiddenTripleE,
  nakedQuad: findNakedQuadE, hiddenQuad: findHiddenQuadE,
};

export { accept, sees };
