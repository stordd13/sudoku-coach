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
import { ROWS, COLS, UNITS, PEERS, rowOf, colOf, boxOf, combos } from "./grid.js";

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

/* ---------- A6. X-Wing à nageoire (finned / sashimi) ----------
   Deux lignes de base où le chiffre tient dans deux colonnes de couverture,
   à l'exception d'une ou plusieurs « nageoires », toutes dans un même bloc.
   Soit une nageoire porte le chiffre (ses voisines de bloc le perdent), soit
   aucune et c'est un X-Wing (éventuellement sashimi : une ligne n'a qu'une
   case en couverture) qui réserve les deux colonnes. Dans les deux cas, les
   cases des colonnes de couverture situées dans le bloc des nageoires, hors
   lignes de base, perdent le chiffre. Sans nageoire → laissé à xWing. */
export function findFinnedXWingE(cands, prefer) {
  const orient = [
    { base: ROWS, cross: COLS, lineIdx: rowOf, crossIdx: colOf, lineType: "row" },
    { base: COLS, cross: ROWS, lineIdx: colOf, crossIdx: rowOf, lineType: "col" },
  ];
  for (const o of orient) {
    for (let d = 1; d <= 9; d++) {
      const linePos = o.base.map((cells) => cells.filter((i) => cands[i].has(d)));
      const eligible = [];
      for (let li = 0; li < 9; li++) if (linePos[li].length >= 2 && linePos[li].length <= 5) eligible.push(li);
      for (const [l1, l2] of combos(eligible, 2)) {
        const all = [...linePos[l1], ...linePos[l2]];
        const crossAll = [...new Set(all.map(o.crossIdx))].sort(asc);
        if (crossAll.length < 3) continue; // 2 colonnes exactement = X-Wing pur
        for (const C of combos(crossAll, 2)) {
          const inC = (i) => C.includes(o.crossIdx(i));
          const fins = all.filter((i) => !inC(i));
          if (!fins.length) continue;
          const finBox = boxOf(fins[0]);
          if (fins.some((f) => boxOf(f) !== finBox)) continue;
          if (!linePos[l1].some(inC) || !linePos[l2].some(inC)) continue;
          const removals = [];
          for (const cx of C) {
            for (const i of o.cross[cx]) {
              const li = o.lineIdx(i);
              if (li === l1 || li === l2 || boxOf(i) !== finBox) continue;
              if (cands[i].has(d)) removals.push({ cell: i, digits: [d] });
            }
          }
          if (!accept(removals, prefer)) continue;
          return {
            kind: "finnedXWing", digit: d, lineType: o.lineType, lines: [l1, l2], cross: C,
            fins, finBox, corners: all.filter(inC), cells: all, digits: [d], removals,
          };
        }
      }
    }
  }
  return null;
}

/* ---------- A2. X-Chain ----------
   Un seul chiffre. Lien fort = unité où il n'a que deux places (si l'une est
   fausse, l'autre est vraie) ; lien faible = deux cases qui se voient (si
   l'une est vraie, l'autre est fausse). Chaîne fort, faible, …, fort (nombre
   de liens impair, ≤ MAX_LINKS) : « si le départ n'est pas d, l'arrivée l'est »,
   donc l'une des deux extrémités porte d et toute case qui voit les deux le
   perd. Parcours en largeur sur les états (case, allumée) → la chaîne la plus
   courte d'abord ; longueurs 3, 5, 7 explorées dans cet ordre pour tout
   départ, afin qu'une chaîne de 3 (skyscraper, kite…) prime toujours. */
const MAX_LINKS = 7;
export function findXChainE(cands, prefer) {
  for (let d = 1; d <= 9; d++) {
    const has = (i) => cands[i].has(d);
    const strong = new Map();
    const addStrong = (a, b, unit) => {
      if (!strong.has(a)) strong.set(a, []);
      strong.get(a).push({ to: b, unit });
    };
    for (const u of UNITS) {
      const pos = u.cells.filter(has);
      if (pos.length === 2) { addStrong(pos[0], pos[1], u); addStrong(pos[1], pos[0], u); }
    }
    if (!strong.size) continue;
    const nodes = [...strong.keys()].sort(asc);
    for (const n of nodes) strong.get(n).sort((x, y) => x.to - y.to);
    // BFS depuis (start, éteinte) : état = case * 2 + (allumée ? 1 : 0).
    const bfs = (start, maxLinks) => {
      const dist = new Map(), parent = new Map();
      const key = (cell, on) => cell * 2 + (on ? 1 : 0);
      const queue = [[start, false]];
      dist.set(key(start, false), 0);
      while (queue.length) {
        const [cell, on] = queue.shift();
        const dk = dist.get(key(cell, on));
        if (dk >= maxLinks) continue;
        if (!on) {
          for (const { to, unit } of strong.get(cell) || []) {
            const k = key(to, true);
            if (dist.has(k)) continue;
            dist.set(k, dk + 1); parent.set(k, { cell, on, unit });
            queue.push([to, true]);
          }
        } else {
          for (const p of [...PEERS[cell]].sort(asc)) {
            if (!has(p) || !strong.has(p)) continue;
            const k = key(p, false);
            if (dist.has(k)) continue;
            dist.set(k, dk + 1); parent.set(k, { cell, on, unit: null });
            queue.push([p, false]);
          }
        }
      }
      return { dist, parent, key };
    };
    const rebuild = (start, end, { parent, key }) => {
      const chain = [end], links = [];
      let cell = end, on = true;
      while (cell !== start || on) {
        const pr = parent.get(key(cell, on));
        links.unshift({ from: pr.cell, to: cell, strong: on, unit: pr.unit });
        cell = pr.cell; on = pr.on;
        chain.unshift(cell);
      }
      return { chain, links };
    };
    for (let L = 3; L <= MAX_LINKS; L += 2) {
      for (const start of nodes) {
        const b = bfs(start, L);
        for (const end of nodes) {
          if (end === start || b.dist.get(b.key(end, true)) !== L) continue;
          const { chain, links } = rebuild(start, end, b);
          if (new Set(chain).size !== chain.length) continue; // chemin simple seulement
          // Les maillons eux-mêmes ne sont jamais éliminés (le pas à pas les surligne).
          const removals = [];
          for (let z = 0; z < 81; z++) {
            if (chain.includes(z) || !has(z)) continue;
            if (sees(z, start) && sees(z, end)) removals.push({ cell: z, digits: [d] });
          }
          if (!accept(removals, prefer)) continue;
          return {
            kind: "xChain", digit: d, chain, links,
            linkUnits: links.filter((l) => l.strong).map((l) => l.unit),
            cells: chain, digits: [d], removals,
          };
        }
      }
    }
  }
  return null;
}

/* Rempli technique par technique (A1 → A6) ; un kind absent est ignoré par
   engine.js (filtre typeof === "function"). Jellyfish = findFish(4), dans
   engine.js avec X-Wing et Swordfish. */
export const PALIER_A_FINDERS = {
  nakedTriple: findNakedTripleE, hiddenTriple: findHiddenTripleE,
  nakedQuad: findNakedQuadE, hiddenQuad: findHiddenQuadE,
  finnedXWing: findFinnedXWingE,
  xChain: findXChainE,
};

export { accept, sees };
