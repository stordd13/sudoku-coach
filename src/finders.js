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

/* ---------- A3. XY-Chain ----------
   Suite de cases à deux candidats où chaque case voit la suivante et lui
   passe un chiffre : si c0 n'est pas z, c0 vaut a0, donc c1 (qui voit c0 et
   contient a0) vaut a1, … jusqu'à cn qui vaut z. L'une des deux extrémités
   porte donc z : toute case hors chaîne qui voit c0 et cn perd z. Longueur
   3..MAX_CELLS cases (3 = XY-Wing, servi avant par son propre finder),
   approfondissement itératif → la plus courte d'abord. */
const MAX_CELLS = 8;
export function findXYChainE(cands, prefer) {
  const bi = [];
  for (let i = 0; i < 81; i++) if (cands[i].size === 2) bi.push(i);
  if (bi.length < 3) return null;
  const nextOf = new Map();
  for (const i of bi) nextOf.set(i, bi.filter((j) => j !== i && sees(i, j)));
  const other = (i, d) => [...cands[i]].find((x) => x !== d);
  let found = null;
  const dfs = (path, carried, z, L) => {
    const cur = path[path.length - 1];
    if (path.length === L) {
      if (carried !== z) return false;
      const start = path[0];
      const removals = [];
      for (let w = 0; w < 81; w++) {
        if (path.includes(w) || !cands[w].has(z)) continue;
        if (sees(w, start) && sees(w, cur)) removals.push({ cell: w, digits: [z] });
      }
      if (!accept(removals, prefer)) return false;
      const chainDigits = path.map((c, k) => (k === 0 ? other(c, z) : null));
      found = { path: path.slice(), z, removals, chainDigits };
      return true;
    }
    for (const nx of nextOf.get(cur)) {
      if (path.includes(nx) || !cands[nx].has(carried)) continue;
      path.push(nx);
      if (dfs(path, other(nx, carried), z, L)) return true;
      path.pop();
    }
    return false;
  };
  for (let L = 3; L <= MAX_CELLS; L++) {
    for (const start of bi) {
      for (const z of [...cands[start]].sort(asc)) {
        if (dfs([start], other(start, z), z, L)) {
          const { path, removals } = found;
          // Chiffres portés : c0 = a0 (≠ z), puis chaque case perd le chiffre reçu.
          const carried = [];
          let d = other(path[0], z);
          carried.push(d);
          for (let k = 1; k < path.length; k++) { d = other(path[k], d); carried.push(d); }
          return {
            kind: "xyChain", z, chain: path, carried,
            cells: path, digits: [z], removals,
          };
        }
      }
    }
  }
  return null;
}

/* ---------- A4. Rectangle unique (types 1 à 4) ----------
   Quatre cases vides sur deux lignes, deux colonnes et EXACTEMENT deux blocs,
   toutes candidates à a et b : si elles finissaient en deux paires a/b, on
   pourrait les échanger et la grille aurait deux solutions. Une grille à
   solution unique interdit ce « motif mortel » — précondition d'unicité
   (UNIQUENESS_KINDS dans engine.js, jamais sur une grille ambiguë).
   Type 1 : trois coins = {a,b} → le quatrième perd a et b.
   Type 2 : deux sols {a,b}, deux toits {a,b,c} alignés → un toit porte c :
            les cases voyant les deux toits perdent c.
   Type 4 : dans une unité commune aux toits, a n'a que ces deux places →
            aucun toit ne peut être b (sinon deux paires a/b) : b quitte les toits.
   Type 3 : les toits portent en plus deux chiffres E, l'un des deux les porte
            (case bivalue virtuelle) ; avec une vraie bivalue E de l'unité
            commune, paire nue : E quitte le reste de l'unité.
   Passe 1 : tous les types 1 ; passe 2 : types 2, 4, 3 (du plus lisible au
   moins lisible). */
export function findUniqueRectangleE(cands, prefer) {
  const rects = [];
  for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++) {
    for (let c1 = 0; c1 < 9; c1++) for (let c2 = c1 + 1; c2 < 9; c2++) {
      const corners = [r1 * 9 + c1, r1 * 9 + c2, r2 * 9 + c1, r2 * 9 + c2];
      if (new Set(corners.map(boxOf)).size !== 2) continue;
      if (corners.some((i) => cands[i].size < 2)) continue;
      const common = [];
      for (let d = 1; d <= 9; d++) if (corners.every((i) => cands[i].has(d))) common.push(d);
      if (common.length >= 2) rects.push({ corners, common });
    }
  }
  const extrasOf = (i, a, b) => [...cands[i]].filter((d) => d !== a && d !== b).sort(asc);
  for (const pass of [1, 2]) {
    for (const { corners, common } of rects) {
      for (const [a, b] of combos(common, 2)) {
        const floor = corners.filter((i) => cands[i].size === 2);
        const roof = corners.filter((i) => cands[i].size !== 2);
        const base = { kind: "uniqueRectangle", a, b, corners, floor, roof, digits: [a, b] };
        if (pass === 1) {
          if (floor.length !== 3) continue;
          const t = roof[0];
          const removals = [{ cell: t, digits: [a, b] }];
          if (!accept(removals, prefer)) continue;
          return { ...base, type: 1, cells: corners, removals };
        }
        if (floor.length !== 2) continue;
        const [x, y] = roof;
        if (rowOf(x) !== rowOf(y) && colOf(x) !== colOf(y)) continue; // toits en diagonale
        const ex = extrasOf(x, a, b), ey = extrasOf(y, a, b);
        // Type 2
        if (ex.length === 1 && ey.length === 1 && ex[0] === ey[0]) {
          const c = ex[0];
          const removals = [];
          for (let i = 0; i < 81; i++) {
            if (corners.includes(i) || !cands[i].has(c)) continue;
            if (sees(i, x) && sees(i, y)) removals.push({ cell: i, digits: [c] });
          }
          if (accept(removals, prefer)) return { ...base, type: 2, extra: c, cells: corners, removals };
        }
        const shared = UNITS.filter((u) => u.cells.includes(x) && u.cells.includes(y));
        // Type 4
        for (const u of shared) {
          for (const [keep, drop] of [[a, b], [b, a]]) {
            const pos = u.cells.filter((i) => cands[i].has(keep));
            if (pos.length !== 2 || !pos.includes(x) || !pos.includes(y)) continue;
            const removals = [{ cell: x, digits: [drop] }, { cell: y, digits: [drop] }];
            if (!accept(removals, prefer)) continue;
            return { ...base, type: 4, unit: u, locked: keep, readDigits: [keep], cells: corners, removals };
          }
        }
        // Type 3 (restreint : deux extras + une vraie bivalue identique)
        const E = [...new Set([...ex, ...ey])].sort(asc);
        if (E.length === 2) {
          for (const u of shared) {
            const k = u.cells.find((i) => !corners.includes(i) && cands[i].size === 2 && E.every((d) => cands[i].has(d)));
            if (k === undefined) continue;
            const removals = [];
            for (const i of u.cells) {
              if (i === x || i === y || i === k) continue;
              const rem = E.filter((d) => cands[i].has(d));
              if (rem.length) removals.push({ cell: i, digits: rem });
            }
            if (!accept(removals, prefer)) continue;
            return { ...base, type: 3, unit: u, extras: E, partner: k, readDigits: E, cells: [...corners, k], removals };
          }
        }
      }
    }
  }
  return null;
}

/* ---------- A5. BUG+1 ----------
   Une grille où toutes les cases vides sont bivalues et où chaque candidat
   apparaît exactement deux fois dans chaque unité aurait deux solutions
   (« BUG », bivalue universal grave). Si une seule case fait exception avec
   trois candidats, le chiffre qui apparaît trois fois dans sa ligne, sa
   colonne et son bloc est celui qui évite le BUG : la case le porte, ses deux
   autres candidats s'effacent. Précondition d'unicité (UNIQUENESS_KINDS). */
export function findBug1E(cands, prefer) {
  let tri = -1;
  for (let i = 0; i < 81; i++) {
    const n = cands[i].size;
    if (n === 0 || n === 2) continue;
    if (n === 3 && tri === -1) { tri = i; continue; }
    return null; // une 2e case non bivalue, ou une case à 4+ candidats
  }
  if (tri === -1) return null;
  // Le chiffre en trop : celui qui apparaît 3 fois dans les trois unités de la
  // case ; tous les autres chiffres apparaissent 0 ou 2 fois dans chaque unité.
  let extra = null;
  for (const u of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const n = u.cells.filter((i) => cands[i].has(d)).length;
      if (n === 0 || n === 2) continue;
      if (n !== 3 || !u.cells.includes(tri) || !cands[tri].has(d)) return null;
      if (extra !== null && extra !== d) return null;
      extra = d;
    }
  }
  if (extra === null) return null;
  const removals = [{ cell: tri, digits: [...cands[tri]].filter((d) => d !== extra).sort(asc) }];
  if (!accept(removals, prefer)) return null;
  return { kind: "bug1", cell: tri, digit: extra, cells: [tri], digits: [extra], removals };
}

/* ---------- A7. AIC — chaîne d'inférence alternée (palier B, v2.4) ----------
   Nœud = (case, chiffre) — ou (groupe de cases, chiffre), voir plus bas.
   Lien FORT (« si l'un est faux, l'autre est vrai ») :
   bivalue (case ≠ x ⇒ case = y, via "cell") ou chiffre bilocalisé dans une
   unité (A ≠ d ⇒ B = d, via = l'unité). Lien FAIBLE (« si l'un est vrai,
   l'autre est faux ») : même case (case = x ⇒ case ≠ y, via "cell") ou deux
   voisines portant d (A = d ⇒ B ≠ d, via "peer"). Chaîne fort, faible, …,
   fort (liens impairs, ≤ MAX_AIC_LINKS, ≤ 10 nœuds) : « si le départ est
   faux, l'arrivée est vraie », l'une des deux extrémités est donc vraie.
   Type 1 : même chiffre z aux deux bouts → toute case hors chaîne voyant les
   deux extrémités perd z. Type 2 : chiffres x ≠ y, extrémités qui se voient →
   le départ perd y, l'arrivée perd x.
   Recherche : DFS à approfondissement itératif (3, 5, 7, 9 liens) → la plus
   courte d'abord ; départs par nœud croissant ; chemins simples (jamais deux
   fois la même case, sauf deux nœuds contigus d'une même case) ; un nœud
   éteint doit repartir par un lien fort (filtre exact sur les faibles).
   Budget AIC_BUDGET en expansions (déterministe, jamais l'horloge) → null.
   Les X-Chain (un chiffre) et XY-Chain (bivalues) sont des AIC particulières
   servies avant par leurs finders : ce finder n'est appelé qu'après leur
   échec sur la même carte, aucun filtrage n'est nécessaire. */
const MAX_AIC_LINKS = 9;
const AIC_BUDGET = 200000;
/* Liens groupés (décidés par le banc v2.4 : +4 points « sans mur » sur les
   157 grilles, 55 → 59 %) : un nœud peut être un GROUPE de 2-3 cases d'un
   même chiffre dans une intersection bloc∩ligne. Lien fort groupe↔case ou
   groupe↔groupe quand les places du chiffre dans une unité se partagent
   exactement en deux morceaux (ligne → par bloc ; bloc → par ligne, puis par
   colonne) ; lien faible quand toutes les cases d'un nœud voient toutes
   celles de l'autre. Les extrémités restent des cases simples. */
const nid = (cell, d) => cell * 10 + d;
export function findAicE(cands, prefer) {
  // Registre des nœuds : id → { id, cells, digit, cell (case simple ou null) }.
  const nodes = new Map();
  const nodeOf = (cells, d) => {
    const id = cells.length === 1 ? nid(cells[0], d) : `g:${cells.join("-")}:${d}`;
    if (!nodes.has(id)) nodes.set(id, { id, cells: cells.slice().sort(asc), digit: d, cell: cells.length === 1 ? cells[0] : null });
    return nodes.get(id);
  };
  const strong = new Map();
  const addStrong = (a, b, via) => {
    if (!strong.has(a.id)) strong.set(a.id, []);
    const list = strong.get(a.id);
    if (list.some((t) => t.node === b)) return; // paire bilocale en ligne ET bloc : première unité
    list.push({ node: b, via });
  };
  for (let i = 0; i < 81; i++) {
    if (cands[i].size !== 2) continue;
    const [x, y] = [...cands[i]].sort(asc);
    const nx = nodeOf([i], x), ny = nodeOf([i], y);
    addStrong(nx, ny, "cell"); addStrong(ny, nx, "cell");
  }
  for (const u of UNITS) {
    for (let d = 1; d <= 9; d++) {
      const pos = u.cells.filter((i) => cands[i].has(d));
      if (pos.length === 2) {
        const a = nodeOf([pos[0]], d), b = nodeOf([pos[1]], d);
        addStrong(a, b, u); addStrong(b, a, u);
      } else if (pos.length >= 3 && pos.length <= 6) {
        // Partition des places par intersection croisée : ligne → par bloc ;
        // bloc → par ligne, puis par colonne. Exactement deux morceaux → lien fort.
        const splits = u.type === "box" ? [rowOf, colOf] : [boxOf];
        for (const key of splits) {
          const parts = new Map();
          for (const c of pos) { const k = key(c); if (!parts.has(k)) parts.set(k, []); parts.get(k).push(c); }
          if (parts.size !== 2) continue;
          const [pa, pb] = [...parts.values()];
          const a = nodeOf(pa, d), b = nodeOf(pb, d);
          addStrong(a, b, u); addStrong(b, a, u);
        }
      }
    }
  }
  if (!strong.size) return null;
  const rank = (n) => (n.cell !== null ? nid(n.cell, n.digit) : 1000 + n.cells[0] * 10 + n.digit + n.cells.length * 0.001);
  for (const list of strong.values()) list.sort((p, q) => rank(p.node) - rank(q.node));
  const starts = [...nodes.values()].filter((n) => n.cell !== null && strong.has(n.id)).sort((p, q) => rank(p) - rank(q));
  const byDigit = Array.from({ length: 10 }, () => []);
  for (const n of nodes.values()) if (strong.has(n.id)) byDigit[n.digit].push(n);
  for (const l of byDigit) l.sort((p, q) => rank(p) - rank(q));
  const seesAll = (A, B) => A.cells.every((a) => B.cells.every((b) => a !== b && sees(a, b)));
  const weakMemo = new Map();
  const weak = (node) => {
    if (weakMemo.has(node.id)) return weakMemo.get(node.id);
    const out = [];
    if (node.cell !== null) {
      for (const x of [...cands[node.cell]].sort(asc)) {
        if (x !== node.digit && strong.has(nid(node.cell, x))) out.push({ node: nodeOf([node.cell], x), via: "cell" });
      }
    }
    for (const other of byDigit[node.digit]) if (other !== node && seesAll(node, other)) out.push({ node: other, via: "peer" });
    weakMemo.set(node.id, out);
    return out;
  };
  let exp = 0, found = null;
  const path = [], links = [], used = new Set();
  const leaf = () => {
    const s = path[0], e = path[path.length - 1];
    if (e.cell === null) return false; // extrémités simples seulement
    const chainCells = [];
    for (const n of path) for (const c of n.cells) if (!chainCells.includes(c)) chainCells.push(c);
    let removals = [], type;
    if (s.digit === e.digit) {
      type = 1;
      for (let z = 0; z < 81; z++) {
        if (chainCells.includes(z) || !cands[z].has(s.digit)) continue;
        if (sees(z, s.cell) && sees(z, e.cell)) removals.push({ cell: z, digits: [s.digit] });
      }
    } else if (sees(s.cell, e.cell)) {
      type = 2;
      if (cands[s.cell].has(e.digit)) removals.push({ cell: s.cell, digits: [e.digit] });
      if (cands[e.cell].has(s.digit)) removals.push({ cell: e.cell, digits: [s.digit] });
    } else return false;
    if (!accept(removals, prefer)) return false;
    const linkUnits = [];
    for (const l of links) if (l.strong && l.via !== "cell" && !linkUnits.includes(l.via)) linkUnits.push(l.via);
    const pub = (n) => ({ cell: n.cell, cells: n.cells.slice(), digit: n.digit });
    found = {
      kind: "aic", type, chain: path.map(pub), links: links.map((l) => ({ from: pub(l.from), to: pub(l.to), strong: l.strong, via: l.via })),
      linkUnits, ends: [s.cell, e.cell], cells: chainCells,
      digits: type === 1 ? [s.digit] : [s.digit, e.digit].sort(asc), removals,
    };
    if (type === 1) found.z = s.digit; else { found.x = s.digit; found.y = e.digit; }
    return true;
  };
  const dfs = (on, L) => {
    if (++exp > AIC_BUDGET) throw AIC_BUDGET;
    const cur = path[path.length - 1];
    if (path.length - 1 === L) return leaf();
    const nbrs = on ? weak(cur) : strong.get(cur.id);
    for (const { node: nb, via } of nbrs) {
      const moved = nb.cell === null || cur.cell === null || nb.cell !== cur.cell;
      if (moved && nb.cells.some((c) => used.has(c))) continue;
      if (!moved && path.length >= 2 && path[path.length - 2].cell === nb.cell) continue; // 3e nœud dans la case
      if (moved) for (const c of cur.cells) used.add(c);
      path.push(nb);
      links.push({ from: cur, to: nb, strong: !on, via });
      if (dfs(!on, L)) return true;
      links.pop(); path.pop();
      if (moved) for (const c of cur.cells) used.delete(c);
    }
    return false;
  };
  try {
    for (let L = 3; L <= MAX_AIC_LINKS; L += 2) {
      for (const n of starts) {
        path.length = 0; links.length = 0; used.clear();
        path.push(n);
        if (dfs(false, L)) return found;
      }
    }
  } catch (err) {
    if (err !== AIC_BUDGET) throw err;
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
  xChain: findXChainE, xyChain: findXYChainE,
  uniqueRectangle: findUniqueRectangleE, bug1: findBug1E,
  aic: findAicE,
};

export { accept, sees };
