/* ================================================================
   SUDOKU · COACH — moteur logique (pur JS, sans UI)
   ================================================================ */
import { TECH_NAMES } from "./techNames.js";
import { ROWS, COLS, BOXES, UNITS, PEERS, rowOf, colOf, boxOf, combos } from "./grid.js";
import { PALIER_A_FINDERS } from "./finders.js";

/* ---------- Constantes de grille (géométrie dans grid.js) ---------- */
export { ROWS, COLS, BOXES, PEERS, rowOf, colOf };
const BOX_NAMES = {
  fr: [
    "haut-gauche", "haut-centre", "haut-droit",
    "milieu-gauche", "central", "milieu-droit",
    "bas-gauche", "bas-centre", "bas-droit",
  ],
  en: [
    "top-left", "top-center", "top-right",
    "middle-left", "center", "middle-right",
    "bottom-left", "bottom-center", "bottom-right",
  ],
};

/* « L3C7 » en FR, « R3C7 » en EN (convention internationale). */
export const cellName = (i, lang = "fr") =>
  `${lang === "en" ? "R" : "L"}${rowOf(i) + 1}C${colOf(i) + 1}`;
function unitLabel(u, lang = "fr") {
  if (lang === "en") {
    if (u.type === "row") return `row ${u.index + 1}`;
    if (u.type === "col") return `column ${u.index + 1}`;
    return `the ${BOX_NAMES.en[u.index]} box`;
  }
  if (u.type === "row") return `la ligne ${u.index + 1}`;
  if (u.type === "col") return `la colonne ${u.index + 1}`;
  return `le bloc ${BOX_NAMES.fr[u.index]}`;
}
const listD = (arr) =>
  arr && arr.length ? arr.slice().sort((a, b) => a - b).join(", ") : "—";

/* ---------- Grilles d'exemple ---------- */
export const SAMPLES = [
  "530070000600195000098000060800060003400803001700020006060000280000419005000080079",
  "000000907000420180000705026100904000050000040000507009920108000034059000507000000",
];

/* ---------- Bases ---------- */
export function candidatesFromGrid(grid, i) {
  if (grid[i] !== 0) return [];
  const used = new Set();
  PEERS[i].forEach((p) => { if (grid[p]) used.add(grid[p]); });
  const cs = [];
  for (let d = 1; d <= 9; d++) if (!used.has(d)) cs.push(d);
  return cs;
}
export const allCands = (grid) =>
  Array.from({ length: 81 }, (_, i) => new Set(candidatesFromGrid(grid, i)));
// Un « single posable » sur les candidats bruts : case à candidat unique
// (naked) ou chiffre n'ayant plus qu'une place dans une unité (hidden).
function firstSingle(grid) {
  const cands = allCands(grid);
  for (let i = 0; i < 81; i++) {
    if (cands[i].size === 1) return { cell: i, digit: [...cands[i]][0] };
  }
  for (const u of UNITS) {
    for (let d = 1; d <= 9; d++) {
      if (u.cells.some((c) => grid[c] === d)) continue;
      const spots = u.cells.filter((c) => cands[c].has(d));
      if (spots.length === 1) return { cell: spots[0], digit: d };
    }
  }
  return null;
}
export const hasAnySingle = (grid) => firstSingle(grid) !== null;
function presentDigits(grid, cells) {
  const s = new Set();
  cells.forEach((i) => { if (grid[i]) s.add(grid[i]); });
  return [...s].sort((a, b) => a - b);
}
export function conflictSet(grid) {
  const bad = new Set();
  for (const u of UNITS) {
    const seen = {};
    for (const i of u.cells) {
      const v = grid[i];
      if (!v) continue;
      if (seen[v] !== undefined) { bad.add(i); bad.add(seen[v]); }
      else seen[v] = i;
    }
  }
  return bad;
}
export const isComplete = (g) => !g.some((v) => v === 0) && conflictSet(g).size === 0;
// Unités nouvellement complétées (remplies, 9 chiffres distincts) entre deux
// états de grille — sert au balayage « surligneur » de l'UI.
export function completedUnits(before, after) {
  const res = [];
  for (const u of UNITS) {
    if (u.cells.some((i) => after[i] === 0)) continue;
    if (new Set(u.cells.map((i) => after[i])).size !== 9) continue; // conflit
    if (u.cells.every((i) => before[i] !== 0)) continue;
    res.push(u);
  }
  return res;
}

/* ---------- Notation Snyder : un chiffre n'est noté que là où il n'a
   que 2 places possibles dans un bloc ---------- */
export function snyderNotes(grid) {
  const notes = Array.from({ length: 81 }, () => []);
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      if (BOXES[b].some((i) => grid[i] === d)) continue;
      const spots = BOXES[b].filter((i) => grid[i] === 0 && candidatesFromGrid(grid, i).includes(d));
      if (spots.length === 2) spots.forEach((i) => notes[i].push(d));
    }
  }
  notes.forEach((a) => a.sort((x, y) => x - y));
  return notes;
}

/* ---------- Résolution (backtracking + comptage de solutions) ---------- */
export function solveGrid(grid) {
  const g = grid.slice();
  let count = 0, first = null;
  const candsOf = (i) => {
    const used = new Set();
    PEERS[i].forEach((p) => { if (g[p]) used.add(g[p]); });
    const cs = [];
    for (let d = 1; d <= 9; d++) if (!used.has(d)) cs.push(d);
    return cs;
  };
  function pick() {
    let bi = -1, bcs = null;
    for (let i = 0; i < 81; i++) {
      if (g[i] === 0) {
        const cs = candsOf(i);
        if (cs.length === 0) return { i, cs };
        if (!bcs || cs.length < bcs.length) {
          bi = i; bcs = cs;
          if (cs.length === 1) return { i: bi, cs: bcs };
        }
      }
    }
    return bi === -1 ? null : { i: bi, cs: bcs };
  }
  function bt() {
    if (count >= 2) return;
    const p = pick();
    if (p === null) { count++; if (!first) first = g.slice(); return; }
    if (p.cs.length === 0) return;
    for (const d of p.cs) {
      g[p.i] = d;
      bt();
      g[p.i] = 0;
      if (count >= 2) return;
    }
  }
  bt();
  return { count, solution: first };
}

/* ---------- Techniques humaines ---------- */
export function findHiddenSingleFor(grid, cands, t) {
  const units = [
    { type: "box", index: boxOf(t), cells: BOXES[boxOf(t)] },
    { type: "row", index: rowOf(t), cells: ROWS[rowOf(t)] },
    { type: "col", index: colOf(t), cells: COLS[colOf(t)] },
  ];
  for (const u of units) {
    for (const d of cands[t]) {
      let alone = true;
      for (const j of u.cells) {
        if (j !== t && grid[j] === 0 && cands[j].has(d)) { alone = false; break; }
      }
      if (alone) return { digit: d, unit: u };
    }
  }
  return null;
}

function findNakedPairE(cands, prefer) {
  for (const u of UNITS) {
    const twos = u.cells.filter((i) => cands[i].size === 2);
    for (let a = 0; a < twos.length; a++) for (let b = a + 1; b < twos.length; b++) {
      const A = twos[a], B = twos[b];
      const dA = [...cands[A]].sort((x, y) => x - y);
      const dB = [...cands[B]].sort((x, y) => x - y);
      if (dA[0] !== dB[0] || dA[1] !== dB[1]) continue;
      const removals = [];
      for (const j of u.cells) {
        if (j === A || j === B) continue;
        const rem = dA.filter((d) => cands[j].has(d));
        if (rem.length) removals.push({ cell: j, digits: rem });
      }
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      return { kind: "nakedPair", unit: u, cells: [A, B], digits: dA, removals };
    }
  }
  return null;
}
function findPointingE(cands, prefer) {
  for (let b = 0; b < 9; b++) {
    for (let d = 1; d <= 9; d++) {
      const pos = BOXES[b].filter((i) => cands[i].has(d));
      if (pos.length < 2 || pos.length > 3) continue;
      const rs = new Set(pos.map(rowOf)), csn = new Set(pos.map(colOf));
      let line = null;
      if (rs.size === 1) { const r = [...rs][0]; line = { type: "row", index: r, cells: ROWS[r] }; }
      else if (csn.size === 1) { const c = [...csn][0]; line = { type: "col", index: c, cells: COLS[c] }; }
      if (!line) continue;
      const removals = line.cells
        .filter((j) => boxOf(j) !== b && cands[j].has(d))
        .map((j) => ({ cell: j, digits: [d] }));
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      return { kind: "pointing", box: b, digit: d, line, cells: pos, removals };
    }
  }
  return null;
}
function findClaimingE(cands, prefer) {
  const lines = [
    ...ROWS.map((cells, i) => ({ type: "row", index: i, cells })),
    ...COLS.map((cells, i) => ({ type: "col", index: i, cells })),
  ];
  for (const line of lines) {
    for (let d = 1; d <= 9; d++) {
      const pos = line.cells.filter((i) => cands[i].has(d));
      if (pos.length < 2 || pos.length > 3) continue;
      const bs = new Set(pos.map(boxOf));
      if (bs.size !== 1) continue;
      const b = [...bs][0];
      const removals = BOXES[b]
        .filter((j) => !line.cells.includes(j) && cands[j].has(d))
        .map((j) => ({ cell: j, digits: [d] }));
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      return { kind: "claiming", box: b, digit: d, line, cells: pos, removals };
    }
  }
  return null;
}
function findHiddenPairE(cands, prefer) {
  for (const u of UNITS) {
    const posByD = {};
    for (let d = 1; d <= 9; d++) posByD[d] = u.cells.filter((i) => cands[i].has(d));
    for (let a = 1; a <= 8; a++) for (let b = a + 1; b <= 9; b++) {
      const pa = posByD[a], pb = posByD[b];
      if (pa.length !== 2 || pb.length !== 2) continue;
      if (pa[0] !== pb[0] || pa[1] !== pb[1]) continue;
      const removals = [];
      for (const cell of pa) {
        const others = [...cands[cell]].filter((x) => x !== a && x !== b);
        if (others.length) removals.push({ cell, digits: others });
      }
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      return { kind: "hiddenPair", unit: u, cells: pa, digits: [a, b], removals };
    }
  }
  return null;
}
/* ---------- Techniques intermédiaires ---------- */

// X-Wing (size 2), Swordfish (size 3) et Jellyfish (size 4) : même « poisson ».
const FISH_KIND = { 2: "xWing", 3: "swordfish", 4: "jellyfish" };
function findFish(cands, size, prefer) {
  const orient = [
    { cross: COLS, lineIdx: rowOf, crossIdx: colOf, lineType: "row" },
    { cross: ROWS, lineIdx: colOf, crossIdx: rowOf, lineType: "col" },
  ];
  for (const o of orient) {
    const baseLines = o.lineType === "row" ? ROWS : COLS;
    for (let d = 1; d <= 9; d++) {
      const linePos = baseLines.map((cells) => cells.filter((i) => cands[i].has(d)));
      const eligible = [];
      for (let li = 0; li < 9; li++) {
        if (linePos[li].length >= 2 && linePos[li].length <= size) eligible.push(li);
      }
      for (const combo of combos(eligible, size)) {
        const crossSet = new Set();
        combo.forEach((li) => linePos[li].forEach((i) => crossSet.add(o.crossIdx(i))));
        if (crossSet.size !== size) continue;
        const cells = [];
        combo.forEach((li) => linePos[li].forEach((i) => cells.push(i)));
        const comboSet = new Set(combo);
        const removals = [];
        for (const cx of crossSet) {
          for (const i of o.cross[cx]) {
            if (comboSet.has(o.lineIdx(i))) continue;
            if (cands[i].has(d)) removals.push({ cell: i, digits: [d] });
          }
        }
        if (!removals.length) continue;
        if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
        return {
          kind: FISH_KIND[size],
          digit: d, size, lineType: o.lineType,
          lines: combo, cross: [...crossSet], cells, digits: [d], removals,
        };
      }
    }
  }
  return null;
}
export const findXWingE = (cands, prefer) => findFish(cands, 2, prefer);
export const findSwordfishE = (cands, prefer) => findFish(cands, 3, prefer);
export const findJellyfishE = (cands, prefer) => findFish(cands, 4, prefer);

// Skyscraper : deux liens forts (un chiffre, 2 cases) partageant une base ;
// toute case voyant les deux « toits » perd ce chiffre.
export function findSkyscraperE(cands, prefer) {
  const orient = [
    { lines: ROWS, crossOf: colOf },
    { lines: COLS, crossOf: rowOf },
  ];
  for (const o of orient) {
    for (let d = 1; d <= 9; d++) {
      const strong = [];
      for (let li = 0; li < 9; li++) {
        const p = o.lines[li].filter((i) => cands[i].has(d));
        if (p.length === 2) strong.push(p);
      }
      for (let a = 0; a < strong.length; a++) for (let b = a + 1; b < strong.length; b++) {
        const A = strong[a], B = strong[b];
        for (const ai of [0, 1]) for (const bi of [0, 1]) {
          if (o.crossOf(A[ai]) !== o.crossOf(B[bi])) continue;
          const baseA = A[ai], baseB = B[bi];
          const roofA = A[1 - ai], roofB = B[1 - bi];
          if (roofA === roofB) continue;
          if (o.crossOf(roofA) === o.crossOf(roofB)) continue; // c'est un X-Wing
          const removals = [];
          for (let i = 0; i < 81; i++) {
            if (i === roofA || i === roofB) continue;
            if (cands[i].has(d) && PEERS[roofA].has(i) && PEERS[roofB].has(i)) {
              removals.push({ cell: i, digits: [d] });
            }
          }
          if (!removals.length) continue;
          if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
          return {
            kind: "skyscraper", digit: d,
            base: [baseA, baseB], roof: [roofA, roofB],
            cells: [baseA, baseB, roofA, roofB], digits: [d], removals,
          };
        }
      }
    }
  }
  return null;
}

// XY-Wing : pivot {a,b}, pinces {a,c} et {b,c} → on retire c des cases voyant les deux pinces.
export function findXYWingE(cands, prefer) {
  const bi = [];
  for (let i = 0; i < 81; i++) if (cands[i].size === 2) bi.push(i);
  for (const pivot of bi) {
    for (const p1 of bi) {
      if (p1 === pivot || !PEERS[pivot].has(p1)) continue;
      for (const p2 of bi) {
        if (p2 === pivot || p2 === p1 || !PEERS[pivot].has(p2)) continue;
        const s1 = cands[p1], s2 = cands[p2];
        const cCommon = [...s1].filter((x) => s2.has(x) && !cands[pivot].has(x));
        if (cCommon.length !== 1) continue;
        const c = cCommon[0];
        const o1 = [...s1].find((x) => x !== c);
        const o2 = [...s2].find((x) => x !== c);
        if (o1 === undefined || o2 === undefined || o1 === o2) continue;
        if (!cands[pivot].has(o1) || !cands[pivot].has(o2)) continue;
        const removals = [];
        for (let i = 0; i < 81; i++) {
          if (i === pivot || i === p1 || i === p2) continue;
          if (cands[i].has(c) && PEERS[p1].has(i) && PEERS[p2].has(i)) {
            removals.push({ cell: i, digits: [c] });
          }
        }
        if (!removals.length) continue;
        if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
        // Pince 1 = celle du plus petit chiffre, pour un texte {x, y} lisible.
        const [x, y, q1, q2] = o1 < o2 ? [o1, o2, p1, p2] : [o2, o1, p2, p1];
        return {
          kind: "xyWing", pivot, pincers: [q1, q2], c, x, y,
          cells: [pivot, q1, q2], digits: [c], removals,
        };
      }
    }
  }
  return null;
}

// Remote Pairs : chaîne de cases {a,b} identiques, coloration alternée ;
// toute case voyant deux maillons de couleurs opposées perd a et b.
export function findRemotePairE(cands, prefer) {
  const groups = {};
  for (let i = 0; i < 81; i++) {
    if (cands[i].size !== 2) continue;
    const key = [...cands[i]].sort((x, y) => x - y).join(",");
    (groups[key] || (groups[key] = [])).push(i);
  }
  for (const key of Object.keys(groups)) {
    const nodes = groups[key];
    if (nodes.length < 4) continue;
    const [a, b] = key.split(",").map(Number);
    const comp = {}, color = {}, badComp = new Set();
    let cid = 0;
    for (const start of nodes) {
      if (comp[start] !== undefined) continue;
      comp[start] = cid; color[start] = 0;
      const queue = [start];
      while (queue.length) {
        const cur = queue.shift();
        for (const nb of nodes) {
          if (nb === cur || !PEERS[cur].has(nb)) continue;
          if (comp[nb] === undefined) { comp[nb] = cid; color[nb] = color[cur] ^ 1; queue.push(nb); }
          else if (comp[nb] === cid && color[nb] === color[cur]) badComp.add(cid);
        }
      }
      cid++;
    }
    const compSize = {};
    for (const n of nodes) compSize[comp[n]] = (compSize[comp[n]] || 0) + 1;
    const nodeSet = new Set(nodes);
    for (let x = 0; x < nodes.length; x++) for (let y = x + 1; y < nodes.length; y++) {
      const p = nodes[x], q = nodes[y];
      if (comp[p] !== comp[q] || badComp.has(comp[p]) || compSize[comp[p]] < 4) continue;
      if (color[p] === color[q]) continue;
      const removals = [];
      for (let i = 0; i < 81; i++) {
        if (nodeSet.has(i)) continue;
        if (!PEERS[p].has(i) || !PEERS[q].has(i)) continue;
        const rem = [a, b].filter((d) => cands[i].has(d));
        if (rem.length) removals.push({ cell: i, digits: rem });
      }
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      const chain = nodes.filter((n) => comp[n] === comp[p]);
      return { kind: "remotePair", ends: [p, q], cells: chain, digits: [a, b], removals };
    }
  }
  return null;
}

/* ---------- Techniques expertes ---------- */
// XYZ-Wing : pivot {x,y,z} à trois candidats, pinces {x,z} et {y,z} vues par le
// pivot → un z apparaît forcément dans le trio (pivot compris) : on retire z des
// cases qui voient les trois.
export function findXYZWingE(cands, prefer) {
  const tri = [], bi = [];
  for (let i = 0; i < 81; i++) {
    if (cands[i].size === 3) tri.push(i);
    else if (cands[i].size === 2) bi.push(i);
  }
  for (const pivot of tri) {
    const pincers = bi.filter((p) => PEERS[pivot].has(p) && [...cands[p]].every((d) => cands[pivot].has(d)));
    for (let a = 0; a < pincers.length; a++) for (let b = a + 1; b < pincers.length; b++) {
      const p1 = pincers[a], p2 = pincers[b];
      const inter = [...cands[p1]].filter((d) => cands[p2].has(d));
      if (inter.length !== 1) continue;
      const z = inter[0];
      if (new Set([...cands[p1], ...cands[p2]]).size !== 3) continue;
      const removals = [];
      for (let i = 0; i < 81; i++) {
        if (i === pivot || i === p1 || i === p2) continue;
        if (cands[i].has(z) && PEERS[pivot].has(i) && PEERS[p1].has(i) && PEERS[p2].has(i)) {
          removals.push({ cell: i, digits: [z] });
        }
      }
      if (!removals.length) continue;
      if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
      // Pince 1 = celle du plus petit chiffre, pour un texte {x, y, z} lisible.
      const o1 = [...cands[p1]].find((d) => d !== z);
      const o2 = [...cands[p2]].find((d) => d !== z);
      const [x, y, q1, q2] = o1 < o2 ? [o1, o2, p1, p2] : [o2, o1, p2, p1];
      return {
        kind: "xyzWing", pivot, pincers: [q1, q2], z, x, y,
        cells: [pivot, q1, q2], digits: [z], removals,
      };
    }
  }
  return null;
}

// W-Wing : deux bivalues identiques {a,b} qui ne se voient pas, reliées par un
// lien fort sur b (une unité où b n'a que 2 places, chacune voyant l'une des
// deux) → l'une des deux vaut a : on retire a des cases voyant les deux.
export function findWWingE(cands, prefer) {
  const groups = {};
  for (let i = 0; i < 81; i++) {
    if (cands[i].size !== 2) continue;
    const key = [...cands[i]].sort((x, y) => x - y).join(",");
    (groups[key] || (groups[key] = [])).push(i);
  }
  for (const key of Object.keys(groups)) {
    const nodes = groups[key];
    if (nodes.length < 2) continue;
    const [d1, d2] = key.split(",").map(Number);
    for (let x = 0; x < nodes.length; x++) for (let y = x + 1; y < nodes.length; y++) {
      const A = nodes[x], B = nodes[y];
      if (PEERS[A].has(B)) continue;
      for (const [a, b] of [[d1, d2], [d2, d1]]) {
        for (const u of UNITS) {
          const pos = u.cells.filter((i) => cands[i].has(b));
          if (pos.length !== 2) continue;
          if (pos.includes(A) || pos.includes(B)) continue;
          const [e1, e2] = pos;
          if (!(PEERS[e1].has(A) && PEERS[e2].has(B)) && !(PEERS[e1].has(B) && PEERS[e2].has(A))) continue;
          const removals = [];
          for (let i = 0; i < 81; i++) {
            if (i === A || i === B) continue;
            if (cands[i].has(a) && PEERS[A].has(i) && PEERS[B].has(i)) {
              removals.push({ cell: i, digits: [a] });
            }
          }
          if (!removals.length) continue;
          if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
          // Orientation pour le texte : link[0] voit A, link[1] voit B.
          const link = PEERS[e1].has(A) && PEERS[e2].has(B) ? [e1, e2] : [e2, e1];
          return {
            kind: "wWing", a, b, bivalues: [A, B], link, linkUnit: u,
            cells: [A, B, ...link], digits: [a], removals,
          };
        }
      }
    }
  }
  return null;
}

// 2-String Kite : pour un chiffre, une ligne à 2 places et une colonne à
// 2 places dont une place de chacune tombe dans le même bloc → l'une des deux
// extrémités libres porte le chiffre : on le retire des cases voyant les deux.
export function findKiteE(cands, prefer) {
  for (let d = 1; d <= 9; d++) {
    const rowPos = ROWS.map((cells) => cells.filter((i) => cands[i].has(d)));
    const colPos = COLS.map((cells) => cells.filter((i) => cands[i].has(d)));
    for (let r = 0; r < 9; r++) {
      if (rowPos[r].length !== 2) continue;
      for (let c = 0; c < 9; c++) {
        if (colPos[c].length !== 2) continue;
        for (const rp of rowPos[r]) for (const cp of colPos[c]) {
          if (rp === cp || boxOf(rp) !== boxOf(cp)) continue;
          const free1 = rowPos[r].find((i) => i !== rp);
          const free2 = colPos[c].find((i) => i !== cp);
          if (free1 === free2) continue;
          const removals = [];
          for (let i = 0; i < 81; i++) {
            if (i === rp || i === cp || i === free1 || i === free2) continue;
            if (cands[i].has(d) && PEERS[free1].has(i) && PEERS[free2].has(i)) {
              removals.push({ cell: i, digits: [d] });
            }
          }
          if (!removals.length) continue;
          if (prefer && !removals.some((rm) => prefer.has(rm.cell))) continue;
          return {
            kind: "kite", digit: d, row: r, col: c, blockPair: [rp, cp],
            ends: [free1, free2], cells: [rp, cp, free1, free2], digits: [d], removals,
          };
        }
      }
    }
  }
  return null;
}

// Empty Rectangle : dans un bloc, tous les candidats d tiennent dans une ligne r
// et une colonne c ; un lien fort sur d ailleurs, avec une extrémité alignée sur
// c (resp. r) → l'autre extrémité interdit d au croisement avec r (resp. c).
export function findEmptyRectangleE(cands, prefer) {
  for (let b = 0; b < 9; b++) {
    const boxRows = [...new Set(BOXES[b].map(rowOf))];
    const boxCols = [...new Set(BOXES[b].map(colOf))];
    for (let d = 1; d <= 9; d++) {
      const pos = BOXES[b].filter((i) => cands[i].has(d));
      if (pos.length < 2) continue;
      for (const r of boxRows) for (const c of boxCols) {
        if (pos.some((p) => rowOf(p) !== r && colOf(p) !== c)) continue;
        // ER non trivial (sinon c'est un simple alignement, traité bien avant)
        if (!pos.some((p) => rowOf(p) === r && colOf(p) !== c)) continue;
        if (!pos.some((p) => colOf(p) === c && rowOf(p) !== r)) continue;
        // Orientation 1 : lien fort dans une ligne hors bloc, une extrémité en colonne c
        for (let r2 = 0; r2 < 9; r2++) {
          if (boxRows.includes(r2)) continue;
          const lp = ROWS[r2].filter((i) => cands[i].has(d));
          if (lp.length !== 2) continue;
          const X = lp.find((i) => colOf(i) === c);
          if (X === undefined) continue;
          const Y = lp.find((i) => i !== X);
          if (boxCols.includes(colOf(Y))) continue;
          const t = r * 9 + colOf(Y);
          if (!cands[t].has(d)) continue;
          if (prefer && !prefer.has(t)) continue;
          return {
            kind: "emptyRectangle", digit: d, box: b, erRow: r, erCol: c,
            link: [X, Y], linkLine: { type: "row", index: r2, cells: ROWS[r2] },
            cells: [...pos, X, Y], digits: [d], removals: [{ cell: t, digits: [d] }],
          };
        }
        // Orientation 2 : lien fort dans une colonne hors bloc, une extrémité en ligne r
        for (let c2 = 0; c2 < 9; c2++) {
          if (boxCols.includes(c2)) continue;
          const lp = COLS[c2].filter((i) => cands[i].has(d));
          if (lp.length !== 2) continue;
          const X = lp.find((i) => rowOf(i) === r);
          if (X === undefined) continue;
          const Y = lp.find((i) => i !== X);
          if (boxRows.includes(rowOf(Y))) continue;
          const t = rowOf(Y) * 9 + c;
          if (!cands[t].has(d)) continue;
          if (prefer && !prefer.has(t)) continue;
          return {
            kind: "emptyRectangle", digit: d, box: b, erRow: r, erCol: c,
            link: [X, Y], linkLine: { type: "col", index: c2, cells: COLS[c2] },
            cells: [...pos, X, Y], digits: [d], removals: [{ cell: t, digits: [d] }],
          };
        }
      }
    }
  }
  return null;
}

// Coloriage : pour un chiffre, on suit les liens conjugués (unités où il n'a que
// 2 places) en coloriant les cases en alternance. Règle 1 : une case externe qui
// voit les deux couleurs perd le chiffre. Règle 2 (« wrap ») : deux cases de même
// couleur dans une même unité → cette couleur est fausse partout.
export function findColoringE(cands, prefer) {
  for (let d = 1; d <= 9; d++) {
    const adj = new Map();
    const addEdge = (a, b, u) => {
      if (!adj.has(a)) adj.set(a, []);
      adj.get(a).push({ to: b, unit: u });
    };
    for (const u of UNITS) {
      const pos = u.cells.filter((i) => cands[i].has(d));
      if (pos.length === 2) { addEdge(pos[0], pos[1], u); addEdge(pos[1], pos[0], u); }
    }
    if (!adj.size) continue;
    const color = new Map();
    for (let start = 0; start < 81; start++) {
      if (!adj.has(start) || color.has(start)) continue;
      color.set(start, 0);
      const comp = [start], queue = [start], linkUnits = [];
      const seenUnits = new Set();
      let odd = false;
      while (queue.length) {
        const cur = queue.shift();
        for (const { to, unit } of adj.get(cur)) {
          if (!seenUnits.has(unit)) { seenUnits.add(unit); linkUnits.push(unit); }
          if (!color.has(to)) { color.set(to, color.get(cur) ^ 1); comp.push(to); queue.push(to); }
          else if (color.get(to) === color.get(cur)) odd = true;
        }
      }
      // Cycle impair = position contradictoire (n'arrive pas sur une grille saine)
      if (odd || comp.length < 2) continue;
      const colors = [comp.filter((c) => color.get(c) === 0), comp.filter((c) => color.get(c) === 1)];
      const compSet = new Set(comp);
      // Règle 1 : case externe voyant les deux couleurs
      const removals = [];
      for (let i = 0; i < 81; i++) {
        if (compSet.has(i) || !cands[i].has(d)) continue;
        if (colors[0].some((c) => PEERS[i].has(c)) && colors[1].some((c) => PEERS[i].has(c))) {
          removals.push({ cell: i, digits: [d] });
        }
      }
      if (removals.length && (!prefer || removals.some((r) => prefer.has(r.cell)))) {
        return {
          kind: "coloring", digit: d, rule: 1, chainCells: comp, colors, linkUnits,
          cells: comp, digits: [d], removals,
        };
      }
      // Règle 2 (« wrap ») : deux cases de même couleur dans une même unité
      for (const k of [0, 1]) {
        for (const u of UNITS) {
          const inU = colors[k].filter((c) => u.cells.includes(c));
          if (inU.length < 2) continue;
          const wrapRem = colors[k].map((c) => ({ cell: c, digits: [d] }));
          if (prefer && !wrapRem.some((r) => prefer.has(r.cell))) continue;
          return {
            kind: "coloring", digit: d, rule: 2, chainCells: comp, colors,
            wrap: inU.slice(0, 2), wrapUnit: u, linkUnits,
            cells: comp, digits: [d], removals: wrapRem,
          };
        }
      }
    }
  }
  return null;
}

// Sue de Coq (forme classique restreinte) : deux cases d'intersection ligne∩bloc
// puisant dans un pool de 4 chiffres, une bivalue dans la ligne et une dans le
// bloc se partageant le pool sans se chevaucher → le compte est juste-juste :
// la paire ligne se nettoie du reste de la ligne, la paire bloc du reste du bloc.
export function findSueDeCoqE(cands, prefer) {
  const lines = [
    ...ROWS.map((cells, i) => ({ type: "row", index: i, cells })),
    ...COLS.map((cells, i) => ({ type: "col", index: i, cells })),
  ];
  for (const line of lines) {
    const boxes = [...new Set(line.cells.map(boxOf))];
    for (const b of boxes) {
      const inter = line.cells.filter((i) => boxOf(i) === b);
      const active = inter.filter((i) => cands[i].size > 0);
      if (active.length !== 2) continue;
      const [i1, i2] = active;
      if (cands[i1].size < 2 || cands[i2].size < 2) continue;
      const S = new Set([...cands[i1], ...cands[i2]]);
      if (S.size !== 4) continue;
      for (const lineBi of line.cells) {
        if (boxOf(lineBi) === b || cands[lineBi].size !== 2) continue;
        if (![...cands[lineBi]].every((d) => S.has(d))) continue;
        for (const boxBi of BOXES[b]) {
          if (line.cells.includes(boxBi) || cands[boxBi].size !== 2) continue;
          if (![...cands[boxBi]].every((d) => S.has(d))) continue;
          if ([...cands[lineBi]].some((d) => cands[boxBi].has(d))) continue;
          const pairLine = [...cands[lineBi]].sort((x, y) => x - y);
          const pairBox = [...cands[boxBi]].sort((x, y) => x - y);
          const removals = [];
          for (const j of line.cells) {
            if (inter.includes(j) || j === lineBi) continue;
            const rem = pairLine.filter((d) => cands[j].has(d));
            if (rem.length) removals.push({ cell: j, digits: rem });
          }
          for (const j of BOXES[b]) {
            if (inter.includes(j) || j === boxBi) continue;
            const rem = pairBox.filter((d) => cands[j].has(d));
            if (rem.length) removals.push({ cell: j, digits: rem });
          }
          if (!removals.length) continue;
          if (prefer && !removals.some((r) => prefer.has(r.cell))) continue;
          return {
            kind: "sueDeCoq", line, box: b, inter: active, lineBi, boxBi,
            pairLine, pairBox, S: [...S].sort((x, y) => x - y),
            cells: [i1, i2, lineBi, boxBi], digits: [...S].sort((x, y) => x - y), removals,
          };
        }
      }
    }
  }
  return null;
}

// ⚠️ L'ordre est un contrat : ordre pédagogique de findElim (simple → complexe),
// ET source de l'ordre intra-palier de FINDERS_BY_TIER (gradation →
// déterminisme des seeds de génération). Ne pas réordonner. Les finders du
// palier A (v2.3) vivent dans finders.js et s'insèrent ici par leur kind.
const PA = PALIER_A_FINDERS;
const ELIM_FINDERS = [
  [findNakedPairE, "nakedPair"], [findPointingE, "pointing"],
  [findClaimingE, "claiming"], [findHiddenPairE, "hiddenPair"],
  [PA.nakedTriple, "nakedTriple"], [PA.hiddenTriple, "hiddenTriple"],
  [PA.nakedQuad, "nakedQuad"], [PA.hiddenQuad, "hiddenQuad"],
  [findXWingE, "xWing"], [PA.finnedXWing, "finnedXWing"],
  [findXYWingE, "xyWing"],
  [findXYZWingE, "xyzWing"], [findWWingE, "wWing"],
  [findSwordfishE, "swordfish"], [findJellyfishE, "jellyfish"],
  [findKiteE, "kite"],
  [findSkyscraperE, "skyscraper"], [findEmptyRectangleE, "emptyRectangle"],
  [findRemotePairE, "remotePair"],
  [PA.xChain, "xChain"], [PA.xyChain, "xyChain"],
  [PA.uniqueRectangle, "uniqueRectangle"], [PA.bug1, "bug1"],
  [findColoringE, "coloring"],
  [PA.aic, "aic"], [PA.alsXz, "alsXz"],
  [findSueDeCoqE, "sueDeCoq"],
].filter(([f]) => typeof f === "function");
// Accès par kind (tests et UI) : les finders de base ne sont pas exportés un à un.
export const ELIM_FINDER_BY_KIND = Object.fromEntries(
  ELIM_FINDERS.map(([f, kind]) => [kind, f])
);
/* Techniques valides SEULEMENT si la grille a une solution unique (rectangle
   unique, BUG+1) : jamais proposées sur une grille ambiguë (multiSol). */
export const UNIQUENESS_KINDS = new Set(["uniqueRectangle", "bug1"]);
const skipKind = (kind, opts) => !opts.allowUniqueness && UNIQUENESS_KINDS.has(kind);
const findElim = (cands, prefer, maxTier = 5, opts = { allowUniqueness: true }) => {
  for (const [f, kind] of ELIM_FINDERS) {
    if (TIER_OF_KIND[kind] > maxTier || skipKind(kind, opts)) continue;
    const e = f(cands, prefer);
    if (e) return e;
  }
  return null;
};
function applyElim(cands, e) {
  for (const r of e.removals) for (const d of r.digits) cands[r.cell].delete(d);
}
/* Éliminations en toutes lettres (charte 3c) : « barre le 4 de L2C2 et de
   L2C4 » — jamais de « −{ } ». Regroupe par chiffre commun quand possible. */
function remWords(removals, lang = "fr") {
  const en = lang === "en";
  const cn = (i) => cellName(i, lang);
  const byDigit = new Map();
  for (const r of removals) {
    for (const d of r.digits) {
      if (!byDigit.has(d)) byDigit.set(d, []);
      if (!byDigit.get(d).includes(r.cell)) byDigit.get(d).push(r.cell);
    }
  }
  const cellsTxt = (cells) => {
    const n = cells.map(cn);
    return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} ${en ? "and" : "et"} ${n[n.length - 1]}`;
  };
  const digits = [...byDigit.keys()].sort((x, y) => x - y);
  const key = (d) => byDigit.get(d).slice().sort((x, y) => x - y).join(",");
  if (digits.length > 1 && digits.every((d) => key(d) === key(digits[0]))) {
    // Mêmes cases pour tous les chiffres : « barre le 2 et le 9 de L8C2 ».
    const ds = digits.join(en ? " and the " : " et le ");
    return en ? `cross out the ${ds} in ${cellsTxt(byDigit.get(digits[0]))}`
      : `barre le ${ds} de ${cellsTxt(byDigit.get(digits[0]))}`;
  }
  const segs = digits
    .map((d) => (en ? `the ${d} in ${cellsTxt(byDigit.get(d))}` : `le ${d} de ${cellsTxt(byDigit.get(d))}`));
  const joined = segs.length === 1 ? segs[0]
    : `${segs.slice(0, -1).join(", ")}${en ? ", and " : ", et "}${segs[segs.length - 1]}`;
  return en ? `cross out ${joined}` : `barre ${joined}`;
}
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);
/* « 1, 2 et 3 » / « 1, 2 and 3 » — liste de chiffres en toutes lettres. */
function andList(arr, lang = "fr") {
  const a = (arr || []).slice().sort((x, y) => x - y);
  if (!a.length) return lang === "en" ? "nothing yet" : "rien encore";
  if (a.length === 1) return String(a[0]);
  return `${a.slice(0, -1).join(", ")} ${lang === "en" ? "and" : "et"} ${a[a.length - 1]}`;
}
/* Une élimination → { title, zone, cells, text } dans la langue demandée.
   Deux corps distincts (pas du mot-à-mot) : la grammaire FR (articles,
   contractions) ne se paramètre pas proprement. */
function describeElim(e, lang = "fr") {
  return lang === "en" ? describeElimEn(e) : describeElimFr(e);
}
function describeElimFr(e) {
  const rem = remWords(e.removals, "fr");
  const involved = [...e.cells, ...e.removals.map((r) => r.cell)];
  const cl = (cells) => cells.map(cellName).join(", ");
  // « **L5C1**, **L5C4** et **L5C8** » — cases en gras, liste en toutes lettres.
  const bold = (cells) => {
    const n = cells.map((i) => `**${cellName(i)}**`);
    return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} et ${n[n.length - 1]}`;
  };
  if (e.kind === "nakedPair") {
    const [A, B] = e.cells, [x, y] = e.digits;
    return {
      title: TECH_NAMES.nakedPair.fr, zone: unitLabel(e.unit), cells: involved,
      text: `Dans ${unitLabel(e.unit)}, **${cellName(A)}** et **${cellName(B)}** n’acceptent que ${x} et ${y} : c’est une [[paire nue]], ces deux chiffres leur sont réservés. Aucune autre case de la zone ne peut les porter. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "nakedTriple" || e.kind === "nakedQuad") {
    const n = e.kind === "nakedTriple" ? "trois" : "quatre";
    const name = e.kind === "nakedTriple" ? "triplet nu" : "quadruplet nu";
    return {
      title: TECH_NAMES[e.kind].fr, zone: unitLabel(e.unit), cells: involved,
      text: `Dans ${unitLabel(e.unit)}, ${bold(e.cells)} n’acceptent à elles ${n} que ${andList(e.digits)} : c’est un [[${name}]]. Ces ${n} chiffres leur sont réservés, aucune autre case de la zone ne peut les porter. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "hiddenTriple" || e.kind === "hiddenQuad") {
    const n = e.kind === "hiddenTriple" ? "trois" : "quatre";
    const name = e.kind === "hiddenTriple" ? "triplet caché" : "quadruplet caché";
    return {
      title: TECH_NAMES[e.kind].fr, zone: unitLabel(e.unit), cells: involved,
      text: `Dans ${unitLabel(e.unit)}, les chiffres ${andList(e.digits)} n’apparaissent que dans ${bold(e.cells)} : c’est un [[${name}]]. Ces ${n} cases leur sont réservées, leurs autres candidats s’effacent. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "pointing") {
    return {
      title: TECH_NAMES.pointing.fr, zone: `le bloc ${BOX_NAMES.fr[e.box]}`, cells: involved,
      text: `Dans le bloc **${BOX_NAMES.fr[e.box]}**, suis le **${e.digit}** : il ne peut aller que sur ${unitLabel(e.line)}, en ${e.cells.map(cellName).join(" ou ")}. Il occupera forcément l’une de ces cases. Aucune autre case de ${unitLabel(e.line)} ne peut donc être un ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "claiming") {
    return {
      title: TECH_NAMES.claiming.fr, zone: unitLabel(e.line), cells: involved,
      text: `Sur ${unitLabel(e.line)}, suis le **${e.digit}** : il ne peut aller que dans le bloc **${BOX_NAMES.fr[e.box]}**, en ${e.cells.map(cellName).join(" ou ")}. Il occupera forcément l’une de ces cases. Aucune autre case de ce bloc ne peut donc être un ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "xWing") {
    const base = e.lineType === "row" ? "lignes" : "colonnes";
    const perp = e.lineType === "row" ? "colonnes" : "lignes";
    return {
      title: TECH_NAMES.xWing.fr, zone: `${e.size} ${base}`, cells: involved,
      text: `Suis le **${e.digit}** : sur 2 ${base}, il n’a plus que deux places, dans les mêmes 2 ${perp} (${cl(e.cells)}). Ces quatre cases dessinent un rectangle : un [[X-Wing]]. Aucune autre case de ces 2 ${perp} ne peut être un ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "swordfish") {
    const base = e.lineType === "row" ? "lignes" : "colonnes";
    const perp = e.lineType === "row" ? "colonnes" : "lignes";
    return {
      title: TECH_NAMES.swordfish.fr, zone: `${e.size} ${base}`, cells: involved,
      text: `Suis le **${e.digit}** sur 3 ${base} : il tient dans les mêmes 3 ${perp} (${cl(e.cells)}). Ces 3 ${perp} se partageront le ${e.digit} sur ces ${base}, c’est un [[Swordfish]] : aucune autre case de ces ${perp} ne peut être un ${e.digit}. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "jellyfish") {
    const base = e.lineType === "row" ? "lignes" : "colonnes";
    const perp = e.lineType === "row" ? "colonnes" : "lignes";
    const nums = (arr) => andList(arr.map((x) => x + 1));
    return {
      title: TECH_NAMES.jellyfish.fr, zone: `${e.size} ${base}`, cells: involved,
      text: `Suis le **${e.digit}** sur les ${base} ${nums(e.lines)} : il tient dans les ${perp} ${nums(e.cross)}. Ces 4 ${perp} se partageront le ${e.digit} sur ces ${base}, c’est un [[Jellyfish]] : aucune autre case de ces ${perp} ne peut être un ${e.digit}. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "finnedXWing") {
    const base = e.lineType === "row" ? "lignes" : "colonnes";
    const perp = e.lineType === "row" ? "colonnes" : "lignes";
    const nums = (arr) => andList(arr.map((x) => x + 1));
    const fins = e.fins.map(cellName).join(" et ");
    return {
      title: TECH_NAMES.finnedXWing.fr, zone: `le ${e.digit}`, cells: involved,
      text: `Suis le **${e.digit}** sur les ${base} ${nums(e.lines)} : presque un [[X-Wing]] dans les ${perp} ${nums(e.cross)}. Seule la [[nageoire]] **${fins}** dépasse, dans le bloc ${BOX_NAMES.fr[e.finBox]} : si elle porte le ${e.digit}, ses voisines le perdent, sinon le X-Wing joue. Dans les deux cas, ${rem}.`,
    };
  }
  if (e.kind === "xChain") {
    const s0 = cellName(e.chain[0]), s1 = cellName(e.chain[e.chain.length - 1]);
    const links = e.links.map((l) => ({
      cells: [l.from, l.to],
      text: l.strong
        ? `Si ${cellName(l.from)} n’est pas un ${e.digit}, alors ${cellName(l.to)} est un ${e.digit} : dans ${unitLabel(l.unit)}, le ${e.digit} n’a que ces deux places.`
        : `Si ${cellName(l.from)} est un ${e.digit}, alors ${cellName(l.to)} n’en est pas un : elles se voient.`,
    }));
    return {
      title: TECH_NAMES.xChain.fr, zone: `le ${e.digit}`, cells: involved, links,
      text: `Suis le **${e.digit}** le long d’une [[chaîne]] de ${e.chain.length} cases, de **${s0}** à **${s1}** : [[liens forts]] et [[liens faibles]] alternent, c’est une [[X-Chain]]. Si ${s0} n’est pas un ${e.digit}, alors ${s1} en est un : l’une des deux extrémités porte le ${e.digit}. Toute case qui voit les deux extrémités perd le ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "xyChain") {
    const c0 = cellName(e.chain[0]), cn = cellName(e.chain[e.chain.length - 1]);
    const links = e.chain.map((c, k) => ({
      cells: k === 0 ? [c] : [e.chain[k - 1], c],
      text: k === 0
        ? `Si ${cellName(c)} n’est pas un ${e.z}, alors elle vaut ${e.carried[0]}.`
        : `${cellName(c)} voit ${cellName(e.chain[k - 1])} : elle perd le ${e.carried[k - 1]} et vaut ${e.carried[k]}.`,
    }));
    return {
      title: TECH_NAMES.xyChain.fr, zone: `le ${e.z}`, cells: involved, links,
      text: `Suis la [[chaîne]] de ${e.chain.length} cases à deux [[candidats]], de **${c0}** à **${cn}** : chaque case force la suivante, c’est une [[XY-Chain]]. Si ${c0} n’est pas un ${e.z}, la chaîne se referme et ${cn} vaut ${e.z} : l’une des deux extrémités porte le ${e.z}. Toute case qui voit les deux extrémités perd le ${e.z} : ${rem}.`,
    };
  }
  if (e.kind === "aic") {
    const s0 = cellName(e.ends[0]), s1 = cellName(e.ends[1]);
    const links = e.links.map((l) => ({
      cells: l.from.cell === l.to.cell ? [l.from.cell] : [l.from.cell, l.to.cell],
      text: l.strong
        ? (l.via === "cell"
          ? `Si ${cellName(l.from.cell)} n’est pas un ${l.from.digit}, alors elle vaut ${l.to.digit} : elle n’a que ces deux candidats.`
          : `Si ${cellName(l.from.cell)} n’est pas un ${l.from.digit}, alors ${cellName(l.to.cell)} est un ${l.to.digit} : dans ${unitLabel(l.via)}, le ${l.to.digit} n’a que ces deux places.`)
        : (l.via === "cell"
          ? `Si ${cellName(l.from.cell)} est un ${l.from.digit}, alors elle n’est pas un ${l.to.digit}.`
          : `Si ${cellName(l.from.cell)} est un ${l.from.digit}, alors ${cellName(l.to.cell)} n’en est pas un : elles se voient.`),
    }));
    const intro = `Suis une [[chaîne]] de ${e.cells.length} cases, de **${s0}** à **${s1}** : [[liens forts]] et [[liens faibles]] alternent sur plusieurs chiffres, c’est une [[AIC]].`;
    if (e.type === 1) {
      return {
        title: TECH_NAMES.aic.fr, zone: `le ${e.z}`, cells: involved, links,
        text: `${intro} Si ${s0} n’est pas un ${e.z}, alors ${s1} en est un : l’une des deux porte le ${e.z}. Toute case qui voit les deux perd le ${e.z} : ${rem}.`,
      };
    }
    return {
      title: TECH_NAMES.aic.fr, zone: `les ${e.x} et ${e.y}`, cells: involved, links,
      text: `${intro} Si ${s0} n’est pas un ${e.x}, alors ${s1} est un ${e.y} : ${s0} vaut ${e.x} ou ${s1} vaut ${e.y}. Comme elles se voient, aucune ne peut prendre le chiffre de l’autre : ${rem}.`,
    };
  }
  if (e.kind === "uniqueRectangle") {
    const { a, b } = e;
    const zone = `le rectangle ${a}-${b}`;
    const open = `${bold(e.corners)} pourraient toutes porter ${a} et ${b} : c’est un [[rectangle unique]] en germe.`;
    if (e.type === 1) {
      const t = e.roof[0];
      return {
        title: TECH_NAMES.uniqueRectangle.fr, zone, cells: involved,
        text: `${open} Si ${cellName(t)} valait ${a} ou ${b}, ces quatre cases formeraient deux paires ${a}/${b} interchangeables et la grille aurait deux solutions. Comme elle n’en a qu’une, ${rem}.`,
      };
    }
    const [x, y] = e.roof;
    if (e.type === 2) {
      return {
        title: TECH_NAMES.uniqueRectangle.fr, zone, cells: involved,
        text: `${open} ${e.floor.map(cellName).join(" et ")} n’ont que ${a} et ${b} ; ${cellName(x)} et ${cellName(y)} ont en plus le ${e.extra}. L’un de ces deux toits porte forcément le ${e.extra}, sinon deux solutions : ${rem}.`,
      };
    }
    if (e.type === 4) {
      const drop = e.locked === a ? b : a;
      return {
        title: TECH_NAMES.uniqueRectangle.fr, zone, cells: involved,
        text: `${open} Dans ${unitLabel(e.unit)}, le ${e.locked} n’a que deux places, les toits ${cellName(x)} et ${cellName(y)} : si l’un est ${drop}, l’autre est ${e.locked}. On retomberait sur deux paires ${a}/${b} et deux solutions : ${rem}.`,
      };
    }
    const [p, q] = e.extras;
    return {
      title: TECH_NAMES.uniqueRectangle.fr, zone, cells: involved,
      text: `${bold(e.corners)} menacent un [[rectangle unique]] sur ${a} et ${b} : l’un des toits porte un extra, ${p} ou ${q}. Les toits valent ensemble une case [[bivalue]] ${p} ou ${q} ; avec ${cellName(e.partner)} (${p} ou ${q}), c’est une [[paire nue]] dans ${unitLabel(e.unit)}. Aucune autre case de la zone ne peut porter ${p} ou ${q} : ${rem}.`,
    };
  }
  if (e.kind === "bug1") {
    const name = cellName(e.cell), others = andList(e.removals[0].digits);
    return {
      title: TECH_NAMES.bug1.fr, zone: `la case ${name}`, cells: involved,
      text: `Toutes les cases vides sont [[bivalues]], sauf **${name}** qui hésite entre ${andList([...e.removals[0].digits, e.digit])}. Si elle n’en avait que deux, chaque chiffre apparaîtrait deux fois par zone et la grille aurait deux solutions ([[BUG+1]]). Le ${e.digit} apparaît trois fois dans sa ligne, sa colonne et son bloc : c’est lui, ${rem}.`,
    };
  }
  if (e.kind === "skyscraper") {
    return {
      title: TECH_NAMES.skyscraper.fr, zone: `le ${e.digit}`, cells: involved,
      text: `Le **${e.digit}** forme deux [[liens forts]], qui partagent une même base (${cl(e.base)}) : c’est un [[Skyscraper]]. La base ne peut pas porter deux ${e.digit}, donc l’un des deux toits (${cl(e.roof)}) est forcément un ${e.digit}. Toute case qui voit ces deux toits perd le ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "xyWing") {
    return {
      title: TECH_NAMES.xyWing.fr, zone: `le pivot ${cellName(e.pivot)}`, cells: involved,
      text: `Le [[pivot]] **${cellName(e.pivot)}** hésite entre ${e.x} et ${e.y} ; ses [[pinces]] **${cellName(e.pincers[0])}** (${e.x} ou ${e.c}) et **${cellName(e.pincers[1])}** (${e.y} ou ${e.c}) le voient. Si le pivot vaut ${e.x}, ${cellName(e.pincers[0])} vaut ${e.c} ; s’il vaut ${e.y}, ${cellName(e.pincers[1])} vaut ${e.c} : un ${e.c} apparaît donc dans une pince. Toute case qui voit les deux pinces perd le ${e.c} ([[XY-Wing]]) : ${rem}.`,
    };
  }
  if (e.kind === "xyzWing") {
    return {
      title: TECH_NAMES.xyzWing.fr, zone: `le pivot ${cellName(e.pivot)}`, cells: involved,
      text: `Le [[pivot]] **${cellName(e.pivot)}** hésite entre ${e.x}, ${e.y} et ${e.z} ; ses [[pinces]] **${cellName(e.pincers[0])}** (${e.x} ou ${e.z}) et **${cellName(e.pincers[1])}** (${e.y} ou ${e.z}) le voient. Quelle que soit la valeur du pivot, un ${e.z} apparaît dans le trio, parfois dans le pivot lui-même. Seules les cases qui voient les trois perdent le ${e.z} ([[XYZ-Wing]]) : ${rem}.`,
    };
  }
  if (e.kind === "wWing") {
    const [A, B] = e.bivalues, [e1, e2] = e.link;
    return {
      title: TECH_NAMES.wWing.fr, zone: `la paire {${e.a}, ${e.b}}`, cells: involved,
      text: `**${cellName(A)}** et **${cellName(B)}** hésitent toutes les deux entre ${e.a} et ${e.b}, sans se voir. Dans ${unitLabel(e.linkUnit)}, le ${e.b} n’a que deux places, ${cellName(e1)} et ${cellName(e2)}, chacune voyant l’une des deux cases. ${capFirst(rem)} : ces cases voient ${cellName(A)} et ${cellName(B)}, et l’une des deux vaut ${e.a} ([[W-Wing]]).`,
    };
  }
  if (e.kind === "kite") {
    return {
      title: TECH_NAMES.kite.fr, zone: `le ${e.digit}`, cells: involved,
      text: `Le **${e.digit}** n’a que deux places sur la ligne ${e.row + 1} et deux sur la colonne ${e.col + 1}, dont ${e.blockPair.map(cellName).join(" et ")} dans le même bloc. ${e.blockPair.map(cellName).join(" et ")} ne peuvent pas être vrais ensemble : l’une des extrémités libres, ${e.ends.map(cellName).join(" ou ")}, porte forcément le ${e.digit} ([[2-String Kite]]). Toute case qui voit ces deux extrémités perd le ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "emptyRectangle") {
    const t = e.removals[0].cell, [X, Y] = e.link;
    return {
      title: TECH_NAMES.emptyRectangle.fr, zone: `le bloc ${BOX_NAMES.fr[e.box]}`, cells: involved,
      text: `Sur ${unitLabel(e.linkLine)}, le **${e.digit}** n’a que deux places, ${cellName(X)} et ${cellName(Y)}. Dans le bloc **${BOX_NAMES.fr[e.box]}**, tous les ${e.digit} tiennent dans la ligne ${e.erRow + 1} et la colonne ${e.erCol + 1}, le reste est vide ([[Empty Rectangle]]). Si ${cellName(t)} était un ${e.digit}, ${cellName(X)} vaudrait ${e.digit} et le bloc n’aurait plus de place pour le ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "coloring") {
    const chainTxt = cl(e.chainCells);
    if (e.rule === 2) {
      return {
        title: TECH_NAMES.coloring.fr, zone: `le ${e.digit}`, cells: involved,
        text: `Suis le **${e.digit}** de [[lien fort]] en lien fort : ${chainTxt}. Colorie ces cases en deux [[couleurs]] alternées ; or ${e.wrap.map(cellName).join(" et ")} partagent ${unitLabel(e.wrapUnit)} avec la même couleur. Cette couleur est donc fausse partout : ${rem}.`,
      };
    }
    return {
      title: TECH_NAMES.coloring.fr, zone: `le ${e.digit}`, cells: involved,
      text: `Suis le **${e.digit}** de [[lien fort]] en lien fort : ${chainTxt}. Colorie ces cases en deux [[couleurs]] alternées : l’une des deux couleurs est forcément vraie. Toute case extérieure qui voit les deux couleurs ne peut pas porter le ${e.digit} : ${rem}.`,
    };
  }
  if (e.kind === "sueDeCoq") {
    return {
      title: TECH_NAMES.sueDeCoq.fr, zone: unitLabel(e.line), cells: involved,
      text: `**${e.inter.map(cellName).join("** et **")}**, à l’intersection de ${unitLabel(e.line)} et du bloc ${BOX_NAMES.fr[e.box]}, puisent dans le pool ${andList(e.S)} ([[Sue de Coq]]). **${cellName(e.lineBi)}** hésite entre ${andList(e.pairLine)} côté ligne, **${cellName(e.boxBi)}** entre ${andList(e.pairBox)} côté bloc. Chaque chiffre du pool a donc sa place réservée : ${rem}.`,
    };
  }
  if (e.kind === "remotePair") {
    const [x, y] = e.digits;
    return {
      title: TECH_NAMES.remotePair.fr, zone: `la paire {${x}, ${y}}`, cells: involved,
      text: `Ces cases n’acceptent que ${x} et ${y} et s’enchaînent en alternant les deux valeurs, comme deux [[couleurs]] : ${cl(e.cells)}. C’est une chaîne de [[Remote Pairs]] : une case qui voit deux maillons de couleurs opposées ne peut être ni ${x} ni ${y}. ${capFirst(rem)}.`,
    };
  }
  const [a, b] = e.digits;
  return {
    title: TECH_NAMES.hiddenPair.fr, zone: unitLabel(e.unit), cells: involved,
    text: `Dans ${unitLabel(e.unit)}, les chiffres **${a}** et **${b}** n’apparaissent que dans ${cellName(e.cells[0])} et ${cellName(e.cells[1])} : c’est un [[duo caché]]. Ces deux cases leur sont réservées, leurs autres candidats s’effacent. ${capFirst(rem)}.`,
  };
}
function describeElimEn(e) {
  const cn = (i) => cellName(i, "en");
  const uL = (u) => unitLabel(u, "en");
  const rem = remWords(e.removals, "en");
  const involved = [...e.cells, ...e.removals.map((r) => r.cell)];
  const cl = (cells) => cells.map(cn).join(", ");
  const bold = (cells) => {
    const n = cells.map((i) => `**${cn(i)}**`);
    return n.length === 1 ? n[0] : `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}`;
  };
  if (e.kind === "nakedPair") {
    const [A, B] = e.cells, [x, y] = e.digits;
    return {
      title: TECH_NAMES.nakedPair.en, zone: uL(e.unit), cells: involved,
      text: `In ${uL(e.unit)}, **${cn(A)}** and **${cn(B)}** accept only ${x} and ${y}: this is a [[naked pair]], those two digits are reserved for them. No other cell of the zone can hold them. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "nakedTriple" || e.kind === "nakedQuad") {
    const n = e.kind === "nakedTriple" ? "three" : "four";
    const name = e.kind === "nakedTriple" ? "naked triple" : "naked quad";
    return {
      title: TECH_NAMES[e.kind].en, zone: uL(e.unit), cells: involved,
      text: `In ${uL(e.unit)}, ${bold(e.cells)} together accept only ${andList(e.digits, "en")}: this is a [[${name}]]. Those ${n} digits are reserved for them, no other cell of the zone can hold them. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "hiddenTriple" || e.kind === "hiddenQuad") {
    const n = e.kind === "hiddenTriple" ? "three" : "four";
    const name = e.kind === "hiddenTriple" ? "hidden triple" : "hidden quad";
    return {
      title: TECH_NAMES[e.kind].en, zone: uL(e.unit), cells: involved,
      text: `In ${uL(e.unit)}, the digits ${andList(e.digits, "en")} appear only in ${bold(e.cells)}: this is a [[${name}]]. Those ${n} cells are reserved for them, their other candidates vanish. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "pointing") {
    return {
      title: TECH_NAMES.pointing.en, zone: `the ${BOX_NAMES.en[e.box]} box`, cells: involved,
      text: `In the **${BOX_NAMES.en[e.box]}** box, follow the **${e.digit}**: it can only go on ${uL(e.line)}, in ${e.cells.map(cn).join(" or ")}. It must occupy one of those cells. So no other cell of ${uL(e.line)} can be a ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "claiming") {
    return {
      title: TECH_NAMES.claiming.en, zone: uL(e.line), cells: involved,
      text: `On ${uL(e.line)}, follow the **${e.digit}**: it can only go in the **${BOX_NAMES.en[e.box]}** box, in ${e.cells.map(cn).join(" or ")}. It must occupy one of those cells. So no other cell of that box can be a ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "xWing") {
    const base = e.lineType === "row" ? "rows" : "columns";
    const perp = e.lineType === "row" ? "columns" : "rows";
    return {
      title: TECH_NAMES.xWing.en, zone: `${e.size} ${base}`, cells: involved,
      text: `Follow the **${e.digit}**: in 2 ${base}, it has only two places left, in the same 2 ${perp} (${cl(e.cells)}). Those four cells draw a rectangle: an [[X-Wing]]. No other cell of those 2 ${perp} can be a ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "swordfish") {
    const base = e.lineType === "row" ? "rows" : "columns";
    const perp = e.lineType === "row" ? "columns" : "rows";
    return {
      title: TECH_NAMES.swordfish.en, zone: `${e.size} ${base}`, cells: involved,
      text: `Follow the **${e.digit}** on 3 ${base}: it stays within the same 3 ${perp} (${cl(e.cells)}). Those 3 ${perp} will share the ${e.digit} on those ${base}, a [[Swordfish]]: no other cell of those ${perp} can be a ${e.digit}. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "jellyfish") {
    const base = e.lineType === "row" ? "rows" : "columns";
    const perp = e.lineType === "row" ? "columns" : "rows";
    const nums = (arr) => andList(arr.map((x) => x + 1), "en");
    return {
      title: TECH_NAMES.jellyfish.en, zone: `${e.size} ${base}`, cells: involved,
      text: `Follow the **${e.digit}** on ${base} ${nums(e.lines)}: it fits in ${perp} ${nums(e.cross)}. Those 4 ${perp} will share the ${e.digit} on those ${base}, this is a [[Jellyfish]]: no other cell of those ${perp} can be a ${e.digit}. ${capFirst(rem)}.`,
    };
  }
  if (e.kind === "finnedXWing") {
    const base = e.lineType === "row" ? "rows" : "columns";
    const perp = e.lineType === "row" ? "columns" : "rows";
    const nums = (arr) => andList(arr.map((x) => x + 1), "en");
    const fins = e.fins.map(cn).join(" and ");
    return {
      title: TECH_NAMES.finnedXWing.en, zone: `the ${e.digit}`, cells: involved,
      text: `Follow the **${e.digit}** on ${base} ${nums(e.lines)}: almost an [[X-Wing]] in ${perp} ${nums(e.cross)}. Only the [[fin]] **${fins}** sticks out, in the ${BOX_NAMES.en[e.finBox]} box: if it holds the ${e.digit}, its neighbours lose it, otherwise the X-Wing applies. Either way, ${rem}.`,
    };
  }
  if (e.kind === "xChain") {
    const s0 = cn(e.chain[0]), s1 = cn(e.chain[e.chain.length - 1]);
    const links = e.links.map((l) => ({
      cells: [l.from, l.to],
      text: l.strong
        ? `If ${cn(l.from)} is not a ${e.digit}, then ${cn(l.to)} is a ${e.digit}: in ${uL(l.unit)}, the ${e.digit} has only those two places.`
        : `If ${cn(l.from)} is a ${e.digit}, then ${cn(l.to)} is not: they see each other.`,
    }));
    return {
      title: TECH_NAMES.xChain.en, zone: `the ${e.digit}`, cells: involved, links,
      text: `Follow the **${e.digit}** along a [[chain]] of ${e.chain.length} cells, from **${s0}** to **${s1}**: [[strong links]] and [[weak links]] alternate, this is an [[X-Chain]]. If ${s0} is not a ${e.digit}, then ${s1} is one: one of the two ends holds the ${e.digit}. Any cell that sees both ends loses the ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "xyChain") {
    const c0 = cn(e.chain[0]), cEnd = cn(e.chain[e.chain.length - 1]);
    const links = e.chain.map((c, k) => ({
      cells: k === 0 ? [c] : [e.chain[k - 1], c],
      text: k === 0
        ? `If ${cn(c)} is not a ${e.z}, then it is a ${e.carried[0]}.`
        : `${cn(c)} sees ${cn(e.chain[k - 1])}: it loses the ${e.carried[k - 1]} and becomes ${e.carried[k]}.`,
    }));
    return {
      title: TECH_NAMES.xyChain.en, zone: `the ${e.z}`, cells: involved, links,
      text: `Follow the [[chain]] of ${e.chain.length} two-[[candidate]] cells, from **${c0}** to **${cEnd}**: each cell forces the next, this is an [[XY-Chain]]. If ${c0} is not a ${e.z}, the chain closes and ${cEnd} becomes ${e.z}: one of the two ends holds the ${e.z}. Any cell that sees both ends loses the ${e.z}: ${rem}.`,
    };
  }
  if (e.kind === "aic") {
    const s0 = cn(e.ends[0]), s1 = cn(e.ends[1]);
    const links = e.links.map((l) => ({
      cells: l.from.cell === l.to.cell ? [l.from.cell] : [l.from.cell, l.to.cell],
      text: l.strong
        ? (l.via === "cell"
          ? `If ${cn(l.from.cell)} is not a ${l.from.digit}, then it is a ${l.to.digit}: it has only those two candidates.`
          : `If ${cn(l.from.cell)} is not a ${l.from.digit}, then ${cn(l.to.cell)} is a ${l.to.digit}: in ${uL(l.via)}, the ${l.to.digit} has only those two places.`)
        : (l.via === "cell"
          ? `If ${cn(l.from.cell)} is a ${l.from.digit}, then it is not a ${l.to.digit}.`
          : `If ${cn(l.from.cell)} is a ${l.from.digit}, then ${cn(l.to.cell)} is not: they see each other.`),
    }));
    const intro = `Follow a [[chain]] of ${e.cells.length} cells, from **${s0}** to **${s1}**: [[strong links]] and [[weak links]] alternate over several digits, this is an [[AIC]].`;
    if (e.type === 1) {
      return {
        title: TECH_NAMES.aic.en, zone: `the ${e.z}`, cells: involved, links,
        text: `${intro} If ${s0} is not a ${e.z}, then ${s1} is one: one of the two ends holds the ${e.z}. Any cell that sees both ends loses the ${e.z}: ${rem}.`,
      };
    }
    return {
      title: TECH_NAMES.aic.en, zone: `the ${e.x} and ${e.y}`, cells: involved, links,
      text: `${intro} If ${s0} is not a ${e.x}, then ${s1} is a ${e.y}: ${s0} is ${e.x} or ${s1} is ${e.y}. Since they see each other, neither can take the other’s digit: ${rem}.`,
    };
  }
  if (e.kind === "uniqueRectangle") {
    const { a, b } = e;
    const zone = `the ${a}-${b} rectangle`;
    const open = `${bold(e.corners)} could all hold ${a} and ${b}: a [[unique rectangle]] in the making.`;
    if (e.type === 1) {
      const t = e.roof[0];
      return {
        title: TECH_NAMES.uniqueRectangle.en, zone, cells: involved,
        text: `${open} If ${cn(t)} were ${a} or ${b}, those four cells would form two interchangeable ${a}/${b} pairs and the grid would have two solutions. Since it has only one, ${rem}.`,
      };
    }
    const [x, y] = e.roof;
    if (e.type === 2) {
      return {
        title: TECH_NAMES.uniqueRectangle.en, zone, cells: involved,
        text: `${open} ${e.floor.map(cn).join(" and ")} hold only ${a} and ${b}; ${cn(x)} and ${cn(y)} also hold the ${e.extra}. One of those two roof cells must hold the ${e.extra}, otherwise two solutions: ${rem}.`,
      };
    }
    if (e.type === 4) {
      const drop = e.locked === a ? b : a;
      return {
        title: TECH_NAMES.uniqueRectangle.en, zone, cells: involved,
        text: `${open} In ${uL(e.unit)}, the ${e.locked} has only two places, the roof cells ${cn(x)} and ${cn(y)}: if one is ${drop}, the other is ${e.locked}. That would bring back two ${a}/${b} pairs and two solutions: ${rem}.`,
      };
    }
    const [p, q] = e.extras;
    return {
      title: TECH_NAMES.uniqueRectangle.en, zone, cells: involved,
      text: `${bold(e.corners)} threaten a [[unique rectangle]] on ${a} and ${b}: one of the roof cells holds an extra, ${p} or ${q}. Together the roof cells count as one [[bivalue]] cell ${p} or ${q}; with ${cn(e.partner)} (${p} or ${q}), that is a [[naked pair]] in ${uL(e.unit)}. No other cell of the zone can hold ${p} or ${q}: ${rem}.`,
    };
  }
  if (e.kind === "bug1") {
    const name = cn(e.cell);
    return {
      title: TECH_NAMES.bug1.en, zone: `cell ${name}`, cells: involved,
      text: `Every empty cell is [[bivalue]], except **${name}** which hesitates between ${andList([...e.removals[0].digits, e.digit], "en")}. If it had only two, every digit would appear twice per zone and the grid would have two solutions ([[BUG+1]]). The ${e.digit} appears three times in its row, column and box: it is the one, ${rem}.`,
    };
  }
  if (e.kind === "skyscraper") {
    return {
      title: TECH_NAMES.skyscraper.en, zone: `the ${e.digit}`, cells: involved,
      text: `The **${e.digit}** forms two [[strong links]] that share the same base (${cl(e.base)}): this is a [[Skyscraper]]. The base cannot hold two ${e.digit}s, so one of the two roofs (${cl(e.roof)}) must be a ${e.digit}. Any cell that sees both roofs loses the ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "xyWing") {
    return {
      title: TECH_NAMES.xyWing.en, zone: `the pivot ${cn(e.pivot)}`, cells: involved,
      text: `The [[pivot]] **${cn(e.pivot)}** hesitates between ${e.x} and ${e.y}; its [[pincers]] **${cn(e.pincers[0])}** (${e.x} or ${e.c}) and **${cn(e.pincers[1])}** (${e.y} or ${e.c}) see it. If the pivot is ${e.x}, ${cn(e.pincers[0])} is ${e.c}; if it is ${e.y}, ${cn(e.pincers[1])} is ${e.c}: so a ${e.c} appears in one pincer. Any cell that sees both pincers loses the ${e.c} ([[XY-Wing]]): ${rem}.`,
    };
  }
  if (e.kind === "xyzWing") {
    return {
      title: TECH_NAMES.xyzWing.en, zone: `the pivot ${cn(e.pivot)}`, cells: involved,
      text: `The [[pivot]] **${cn(e.pivot)}** hesitates between ${e.x}, ${e.y} and ${e.z}; its [[pincers]] **${cn(e.pincers[0])}** (${e.x} or ${e.z}) and **${cn(e.pincers[1])}** (${e.y} or ${e.z}) see it. Whatever the pivot is, a ${e.z} appears in the trio, sometimes in the pivot itself. Only cells that see all three lose the ${e.z} ([[XYZ-Wing]]): ${rem}.`,
    };
  }
  if (e.kind === "wWing") {
    const [A, B] = e.bivalues, [e1, e2] = e.link;
    return {
      title: TECH_NAMES.wWing.en, zone: `the pair {${e.a}, ${e.b}}`, cells: involved,
      text: `**${cn(A)}** and **${cn(B)}** both hesitate between ${e.a} and ${e.b}, without seeing each other. In ${uL(e.linkUnit)}, the ${e.b} has only two places, ${cn(e1)} and ${cn(e2)}, each seeing one of the two cells. ${capFirst(rem)}: those cells see ${cn(A)} and ${cn(B)}, and one of the two is ${e.a} ([[W-Wing]]).`,
    };
  }
  if (e.kind === "kite") {
    return {
      title: TECH_NAMES.kite.en, zone: `the ${e.digit}`, cells: involved,
      text: `The **${e.digit}** has only two places on row ${e.row + 1} and two on column ${e.col + 1}, including ${e.blockPair.map(cn).join(" and ")} in the same box. ${e.blockPair.map(cn).join(" and ")} cannot both be true: one of the free ends, ${e.ends.map(cn).join(" or ")}, must hold the ${e.digit} ([[2-String Kite]]). Any cell that sees both ends loses the ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "emptyRectangle") {
    const tc = e.removals[0].cell, [X, Y] = e.link;
    return {
      title: TECH_NAMES.emptyRectangle.en, zone: `the ${BOX_NAMES.en[e.box]} box`, cells: involved,
      text: `On ${uL(e.linkLine)}, the **${e.digit}** has only two places, ${cn(X)} and ${cn(Y)}. In the **${BOX_NAMES.en[e.box]}** box, all the ${e.digit}s fit in row ${e.erRow + 1} and column ${e.erCol + 1}, the rest is empty ([[Empty Rectangle]]). If ${cn(tc)} were a ${e.digit}, ${cn(X)} would be ${e.digit} and the box would have no ${e.digit} left: ${rem}.`,
    };
  }
  if (e.kind === "coloring") {
    const chainTxt = cl(e.chainCells);
    if (e.rule === 2) {
      return {
        title: TECH_NAMES.coloring.en, zone: `the ${e.digit}`, cells: involved,
        text: `Follow the **${e.digit}** from [[strong link]] to strong link: ${chainTxt}. Color those cells in two alternating [[colors]]; yet ${e.wrap.map(cn).join(" and ")} share ${uL(e.wrapUnit)} with the same color. That color is therefore false everywhere: ${rem}.`,
      };
    }
    return {
      title: TECH_NAMES.coloring.en, zone: `the ${e.digit}`, cells: involved,
      text: `Follow the **${e.digit}** from [[strong link]] to strong link: ${chainTxt}. Color those cells in two alternating [[colors]]: one of the two colors must be true. Any outside cell that sees both colors cannot hold the ${e.digit}: ${rem}.`,
    };
  }
  if (e.kind === "sueDeCoq") {
    return {
      title: TECH_NAMES.sueDeCoq.en, zone: uL(e.line), cells: involved,
      text: `**${e.inter.map(cn).join("** and **")}**, at the crossing of ${uL(e.line)} and the ${BOX_NAMES.en[e.box]} box, draw from the pool ${andList(e.S, "en")} ([[Sue de Coq]]). **${cn(e.lineBi)}** hesitates between ${andList(e.pairLine, "en")} on the line side, **${cn(e.boxBi)}** between ${andList(e.pairBox, "en")} on the box side. So every digit of the pool has its reserved place: ${rem}.`,
    };
  }
  if (e.kind === "remotePair") {
    const [x, y] = e.digits;
    return {
      title: TECH_NAMES.remotePair.en, zone: `the pair {${x}, ${y}}`, cells: involved,
      text: `These cells accept only ${x} and ${y} and chain together, alternating the two values like two [[colors]]: ${cl(e.cells)}. This is a chain of [[Remote Pairs]]: a cell that sees two links of opposite colors can be neither ${x} nor ${y}. ${capFirst(rem)}.`,
    };
  }
  const [a, b] = e.digits;
  return {
    title: TECH_NAMES.hiddenPair.en, zone: uL(e.unit), cells: involved,
    text: `In ${uL(e.unit)}, the digits **${a}** and **${b}** appear only in ${cn(e.cells[0])} and ${cn(e.cells[1])}: this is a [[hidden pair]]. Those two cells are reserved for them, their other candidates vanish. ${capFirst(rem)}.`,
  };
}

/* ---------- Plan pédagogique pour une case ---------- */
function blockReason(grid, j, d, unit, lang = "fr") {
  const en = lang === "en";
  const cn = (i) => cellName(i, lang);
  const r = rowOf(j), c = colOf(j);
  let k = ROWS[r].find((x) => grid[x] === d);
  if (k !== undefined) return en
    ? `impossible — a ${d} already sits in its row (${cn(k)})`
    : `impossible, un ${d} occupe déjà sa ligne (${cn(k)})`;
  k = COLS[c].find((x) => grid[x] === d);
  if (k !== undefined) return en
    ? `impossible — a ${d} already sits in its column (${cn(k)})`
    : `impossible, un ${d} occupe déjà sa colonne (${cn(k)})`;
  if (unit.type !== "box") {
    k = BOXES[boxOf(j)].find((x) => grid[x] === d);
    if (k !== undefined) return en
      ? `impossible — a ${d} is already in its box (${cn(k)})`
      : `impossible, un ${d} est déjà dans son bloc (${cn(k)})`;
  }
  return en
    ? `the ${d} was eliminated there by the steps above`
    : `le ${d} y a été éliminé par les étapes ci-dessus`;
}
function finalizeNaked(grid, t, digit, chain, baseCands, lang = "fr") {
  if (lang === "en") return finalizeNakedEn(grid, t, digit, chain, baseCands);
  const r = rowOf(t) + 1, c = colOf(t) + 1, b = boxOf(t), name = cellName(t);
  const rowD = presentDigits(grid, ROWS[r - 1]);
  const colD = presentDigits(grid, COLS[c - 1]);
  const boxD = presentDigits(grid, BOXES[b]);
  const paras = [];
  paras.push(`**Technique : [[candidat unique]]**. Fais l’inventaire de tout ce que la case ${name} voit.`);
  paras.push(`Ligne ${r} : ${andList(rowD)}. Colonne ${c} : ${andList(colD)}. Bloc ${BOX_NAMES.fr[b]} : ${andList(boxD)}.`);
  if (chain.length) {
    const removed = baseCands.filter((d) => d !== digit);
    paras.push(`Avec la grille seule, les candidats de ${name} étaient ${andList(baseCands)}. Les éliminations ci-dessus retirent ${andList(removed)}.`);
  }
  paras.push(`Tous les autres chiffres sont exclus : il ne reste que le **${digit}**. Écris donc **${digit}** dans **${name}**.`);
  const hint1 = chain.length
    ? `La case ${name} résiste au comptage simple. Cherche d’abord une **${chain[0].title.toLowerCase()}** du côté de ${chain[0].zone} : elle éliminera des candidats utiles.`
    : `Isole la case ${name} : parcours sa ligne, sa colonne et son bloc, et barre mentalement chaque chiffre déjà posé. Compte ce qui survit…`;
  const hint2 = chain.length
    ? `${chain[0].text} Maintenant, refais l’inventaire des candidats de ${name} : il n’en reste presque plus.`
    : `Sa ligne écarte déjà ${andList(rowD)} et sa colonne ${andList(colD)}. Ajoute les chiffres du bloc : un seul survivant.`;
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `${TECH_NAMES.nakedSingle.fr}${chain.length ? " (après éliminations)" : ""}`,
    unitCells: [...ROWS[r - 1], ...COLS[c - 1], ...BOXES[b]],
  };
}
function finalizeNakedEn(grid, t, digit, chain, baseCands) {
  const r = rowOf(t) + 1, c = colOf(t) + 1, b = boxOf(t), name = cellName(t, "en");
  const rowD = presentDigits(grid, ROWS[r - 1]);
  const colD = presentDigits(grid, COLS[c - 1]);
  const boxD = presentDigits(grid, BOXES[b]);
  const boxName = `${BOX_NAMES.en[b][0].toUpperCase()}${BOX_NAMES.en[b].slice(1)}`;
  const paras = [];
  paras.push(`**Technique: [[naked single]].** Take stock of everything cell ${name} sees.`);
  paras.push(`Row ${r}: ${andList(rowD, "en")}. Column ${c}: ${andList(colD, "en")}. ${boxName} box: ${andList(boxD, "en")}.`);
  if (chain.length) {
    const removed = baseCands.filter((d) => d !== digit);
    paras.push(`From the grid alone, the candidates of ${name} were ${andList(baseCands, "en")}. The eliminations above remove ${andList(removed, "en")}.`);
  }
  paras.push(`Every other digit is excluded: only the **${digit}** remains. So write **${digit}** in **${name}**.`);
  const hint1 = chain.length
    ? `Cell ${name} resists simple counting. First look for a **${chain[0].title.toLowerCase()}** around ${chain[0].zone}: it will eliminate useful candidates.`
    : `Isolate cell ${name}: sweep its row, its column and its box, and mentally cross out every digit already placed. Count what survives…`;
  const hint2 = chain.length
    ? `${chain[0].text} Now redo the inventory of the candidates of ${name}: almost none are left.`
    : `Its row already rules out ${andList(rowD, "en")} and its column ${andList(colD, "en")}. Add the digits of the box: a single survivor.`;
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `${TECH_NAMES.nakedSingle.en}${chain.length ? " (after eliminations)" : ""}`,
    unitCells: [...ROWS[r - 1], ...COLS[c - 1], ...BOXES[b]],
  };
}
function finalizeHidden(grid, t, digit, unit, chain, lang = "fr") {
  if (lang === "en") return finalizeHiddenEn(grid, t, digit, unit, chain);
  const name = cellName(t), uL = unitLabel(unit);
  const filled = [], free = [];
  for (const j of unit.cells) {
    if (j === t) continue;
    if (grid[j] !== 0) filled.push(cellName(j));
    else free.push(`• ${cellName(j)} : ${blockReason(grid, j, digit, unit)}`);
  }
  const paras = [];
  paras.push(`**Technique : [[single caché]]**. Question : où peut aller le **${digit}** dans ${uL} ?`);
  if (filled.length) paras.push(`Cases déjà occupées : ${filled.join(", ")}.`);
  if (free.length) {
    paras.push(`Cases libres restantes, et pourquoi le ${digit} y est impossible :`);
    paras.push(...free);
  }
  paras.push(`Une seule case de ${uL} peut encore accueillir le ${digit}. Écris donc **${digit}** dans **${name}**.`);
  const hint1 = `Ne fixe pas la case toute seule : élargis le regard ${unit.type === "box" ? "au" : "à la"} **${uL.replace(/^le |^la /, "")}** en entier. Un chiffre n’y a plus qu’une seule place possible. Repère-le en balayant les chiffres déjà posés dans les lignes et colonnes qui traversent cette zone.`;
  const hint2 = `Le chiffre à placer est le **${digit}**. Passe en revue chaque case libre de ${uL} : toutes sauf une voient déjà un ${digit}, sur la même ligne, colonne ou bloc.`;
  const typeFr = unit.type === "box" ? "bloc" : unit.type === "row" ? "ligne" : "colonne";
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `${TECH_NAMES.hiddenSingle.fr} (${typeFr})${chain.length ? " + éliminations" : ""}`,
    unitCells: [...unit.cells],
  };
}
function finalizeHiddenEn(grid, t, digit, unit, chain) {
  const cn = (i) => cellName(i, "en");
  const name = cn(t), uL = unitLabel(unit, "en");
  const filled = [], free = [];
  for (const j of unit.cells) {
    if (j === t) continue;
    if (grid[j] !== 0) filled.push(cn(j));
    else free.push(`• ${cn(j)}: ${blockReason(grid, j, digit, unit, "en")}`);
  }
  const paras = [];
  paras.push(`**Technique: [[hidden single]].** Question: where can the **${digit}** go in ${uL}?`);
  if (filled.length) paras.push(`Cells already occupied: ${filled.join(", ")}.`);
  if (free.length) {
    paras.push(`Remaining free cells, and why the ${digit} is impossible there:`);
    paras.push(...free);
  }
  paras.push(`Only one cell of ${uL} can still host the ${digit}. So write **${digit}** in **${name}**.`);
  const hint1 = `Do not stare at the cell alone: widen your view to the whole **${uL.replace(/^the /, "")}**. One digit has only one possible place left there. Spot it by sweeping the digits already placed in the rows and columns crossing that zone.`;
  const hint2 = `The digit to place is the **${digit}**. Review each free cell of ${uL}: all but one already see a ${digit}, on the same row, column or box.`;
  const typeEn = unit.type === "box" ? "box" : unit.type === "row" ? "row" : "column";
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `${TECH_NAMES.hiddenSingle.en} (${typeEn})${chain.length ? " + eliminations" : ""}`,
    unitCells: [...unit.cells],
  };
}
/* ---------- Élagage de la chaîne : ne garder que les étapes utiles ---------- */
function valueBlocks(grid, c, d) {
  return ROWS[rowOf(c)].some((x) => grid[x] === d)
    || COLS[colOf(c)].some((x) => grid[x] === d)
    || BOXES[boxOf(c)].some((x) => grid[x] === d);
}
function lineThrough(a, b) {
  return rowOf(a) === rowOf(b) ? ROWS[rowOf(a)] : COLS[colOf(a)];
}
function pruneChain(grid, chain, goal) {
  // needs : cell -> Set de chiffres dont l'élimination est utile (0 = n'importe lequel)
  const needs = new Map();
  const addNeed = (c, d) => { if (!needs.has(c)) needs.set(c, new Set()); needs.get(c).add(d); };
  const isNeeded = (c, d) => { const s = needs.get(c); return !!s && (s.has(d) || s.has(0)); };
  if (goal.type === "naked") {
    for (const d of goal.baseCands) if (d !== goal.digit) addNeed(goal.target, d);
  } else {
    for (const c of goal.unit.cells)
      if (c !== goal.target && grid[c] === 0 && !valueBlocks(grid, c, goal.digit))
        addNeed(c, goal.digit);
  }
  const kept = [];
  for (let i = chain.length - 1; i >= 0; i--) {
    const e = chain[i];
    if (!e.removals.some((r) => r.digits.some((d) => isNeeded(r.cell, d)))) continue;
    kept.unshift(e);
    // Prémisses de l'étape gardée : ce qu'elle « lit » devient à son tour nécessaire
    if (e.kind === "pointing") BOXES[e.box].forEach((c) => addNeed(c, e.digit));
    else if (e.kind === "claiming") e.line.cells.forEach((c) => addNeed(c, e.digit));
    else if (e.kind === "hiddenPair" || e.kind === "hiddenTriple" || e.kind === "hiddenQuad") {
      e.unit.cells.forEach((c) => e.digits.forEach((d) => addNeed(c, d)));
    }
    else if (e.kind === "skyscraper") {
      lineThrough(e.base[0], e.roof[0]).forEach((c) => addNeed(c, e.digit));
      lineThrough(e.base[1], e.roof[1]).forEach((c) => addNeed(c, e.digit));
    }
    else if (e.kind === "xWing" || e.kind === "swordfish" || e.kind === "jellyfish" || e.kind === "finnedXWing") {
      const base = e.lineType === "row" ? ROWS : COLS;
      e.lines.forEach((li) => base[li].forEach((c) => addNeed(c, e.digit)));
    }
    else if (e.kind === "wWing") {
      e.cells.forEach((c) => addNeed(c, 0));
      e.linkUnit.cells.forEach((c) => addNeed(c, e.b));
    }
    else if (e.kind === "kite") {
      ROWS[e.row].forEach((c) => addNeed(c, e.digit));
      COLS[e.col].forEach((c) => addNeed(c, e.digit));
    }
    else if (e.kind === "emptyRectangle") {
      BOXES[e.box].forEach((c) => addNeed(c, e.digit));
      e.linkLine.cells.forEach((c) => addNeed(c, e.digit));
    }
    else if (e.kind === "coloring") {
      e.linkUnits.forEach((u) => u.cells.forEach((c) => addNeed(c, e.digit)));
    }
    else if (e.kind === "xChain") {
      // Liens forts : les unités lues ; liens faibles : les cases de la chaîne (elles portent d).
      e.linkUnits.forEach((u) => u.cells.forEach((c) => addNeed(c, e.digit)));
      e.chain.forEach((c) => addNeed(c, e.digit));
    }
    else if (e.kind === "uniqueRectangle") {
      // Les coins (et la bivalue partenaire) en entier ; types 3/4 : l'unité lue × chiffres lus.
      e.cells.forEach((c) => addNeed(c, 0));
      if (e.unit) (e.readDigits || []).forEach((d) => e.unit.cells.forEach((c) => addNeed(c, d)));
    }
    else if (e.kind === "bug1") {
      // Prémisse globale : l'état bivalue de TOUTES les cases vides.
      for (let c = 0; c < 81; c++) if (grid[c] === 0) addNeed(c, 0);
    }
    else if (e.kind === "aic") {
      // Seuls les liens FORTS lisent la carte : bivalue → toute la case ;
      // bilocal → l'unité lue × ce chiffre. Les liens faibles (même case,
      // voisines) sont de la géométrie pure : une élimination antérieure ne
      // peut que les casser, jamais les créer — aucune prémisse.
      for (const l of e.links) {
        if (!l.strong) continue;
        if (l.via === "cell") addNeed(l.from.cell, 0);
        else l.via.cells.forEach((c) => addNeed(c, l.from.digit));
      }
    }
    else if (e.kind === "alsXz") {
      // Les deux ensembles en entier (n cases, n+1 chiffres : chaque
      // élimination sur ces cases compte) ; le reste est géométrique.
      e.cells.forEach((c) => addNeed(c, 0));
    }
    else (e.cells || []).forEach((c) => addNeed(c, 0)); // nakedPair/Triple/Quad, xyWing, xyzWing, xyChain, sueDeCoq, remotePair…
  }
  return kept;
}

/* ---------- Difficulté : base (type de conclusion) + poids des étapes élaguées ---------- */
const ELIM_WEIGHTS = {
  pointing: 2, claiming: 2, nakedPair: 3, hiddenPair: 4,
  nakedTriple: 4, hiddenTriple: 5, nakedQuad: 5, hiddenQuad: 5,
  xWing: 5, finnedXWing: 6, skyscraper: 6, xyWing: 6, swordfish: 6,
  xyzWing: 6, wWing: 6, kite: 7, emptyRectangle: 7, remotePair: 7,
  jellyfish: 7, xChain: 7, xyChain: 7, uniqueRectangle: 7, bug1: 7,
  coloring: 8, sueDeCoq: 8, aic: 9, alsXz: 9,
};
const planDifficulty = (base, kept) =>
  base + kept.reduce((s, e) => s + (ELIM_WEIGHTS[e.kind] || 5), 0);

/* Champs structurés pour l'UI (fil d'Ariane 👣, leçon à revoir) :
   - techKind  : type de conclusion ("nakedSingle" | "hiddenSingle") ;
   - chainKinds: kinds des étapes élaguées, dans l'ordre ;
   - keyKind   : kind de tier max de la chaîne (premier en cas d'égalité),
                 sinon techKind ;
   - techZone  : zone du single caché (« la ligne 3 »), null pour un naked. */
function tagPlan(plan, techKind, kept, techZone) {
  plan.techKind = techKind;
  plan.chainKinds = kept.map((e) => e.kind);
  plan.keyKind = plan.chainKinds.length
    ? plan.chainKinds.reduce((a, b) => ((TIER_OF_KIND[b] || 0) > (TIER_OF_KIND[a] || 0) ? b : a))
    : techKind;
  plan.techZone = techZone;
  return plan;
}

/* Plafond d'éliminations enchaînées entre deux placements — PARTAGÉ entre
   buildPlan (chemin de jeu 👣/🎯) et solveHumanlySteps (gradeur de génération).
   Invariant : gradé résoluble ⟺ finissable en jeu. Deux bornes différentes
   recréeraient des grilles certifiées résolubles mais infinissables en partie. */
const MAX_CHAIN = 8;
/* Les alignements (paire pointante, réduction bloc/ligne) sont des
   observations de notation : un joueur les barre au fil de l'eau sans les
   « compter ». Ils ne consomment pas le budget MAX_CHAIN (mesuré au banc :
   huit alignements d'affilée faisaient un faux mur), mais un plafond global
   MAX_CHAIN_ALL borne toujours la chaîne. Même règle dans les deux moteurs. */
const CHAIN_FREE_KINDS = new Set(["pointing", "claiming"]);
const MAX_CHAIN_ALL = 3 * MAX_CHAIN;
const chainCost = (chain) => chain.reduce((n, e) => n + (CHAIN_FREE_KINDS.has(e.kind) ? 0 : 1), 0);
const chainExhausted = (chain) => chain.length >= MAX_CHAIN_ALL || chainCost(chain) >= MAX_CHAIN;

export function buildPlan(grid, target, lang = "fr", { allowUniqueness = true } = {}) {
  if (grid[target] !== 0) return null;
  const opts = { allowUniqueness };
  const baseCands = candidatesFromGrid(grid, target);
  const prefer = new Set([...PEERS[target], target]);
  // Recherche par paliers : une preuve SIMPLE vaut mieux qu'une preuve COURTE.
  // On retente la recherche complète avec un plafond de technique croissant ;
  // la première preuve aboutie est donc celle du palier minimal nécessaire.
  for (const maxTier of [2, 3, 4, 5]) {
    const cands = allCands(grid);
    const chain = [];
    // MAX_CHAIN_ALL+1 itérations : la dernière teste le single créé par la dernière élim.
    for (let k = 0; k <= MAX_CHAIN_ALL; k++) {
      const cs = [...cands[target]];
      if (cs.length === 1) {
        const kept = pruneChain(grid, chain, { type: "naked", target, digit: cs[0], baseCands });
        const plan = finalizeNaked(grid, target, cs[0], kept.map((x) => describeElim(x, lang)), baseCands, lang);
        plan.rawChain = kept;
        plan.difficulty = planDifficulty(1, kept);
        return tagPlan(plan, "nakedSingle", kept, null);
      }
      const hs = findHiddenSingleFor(grid, cands, target);
      if (hs) {
        const kept = pruneChain(grid, chain, { type: "hidden", target, digit: hs.digit, unit: hs.unit });
        const plan = finalizeHidden(grid, target, hs.digit, hs.unit, kept.map((x) => describeElim(x, lang)), lang);
        plan.rawChain = kept;
        plan.difficulty = planDifficulty(2, kept);
        return tagPlan(plan, "hiddenSingle", kept, unitLabel(hs.unit, lang));
      }
      if (chainExhausted(chain)) break; // palier suivant
      const e = findElim(cands, prefer, maxTier, opts) || findElim(cands, null, maxTier, opts);
      if (!e) break; // palier suivant
      applyElim(cands, e);
      chain.push(e); // objets bruts — describeElim n'est appelé qu'après élagage
    }
  }
  return null;
}

/* ---------- 👣 nextStep : UNE recherche globale par appui ----------
   Le premier single de la carte (candidat unique avant single caché, index
   croissant) : palier 1 = balayage direct des candidats bruts, sans finder ;
   sinon une seule carte partagée où l'on applique les éliminations du palier
   ≤ cap (ordre du gradeur, findElimTiered) jusqu'à ce qu'un single apparaisse
   quelque part, cap croissant 2 → 5. Le plan a exactement la forme de
   buildPlan (chaîne élaguée par besoins pour la case trouvée) : UI inchangée.
   Déterministe. buildPlan reste l'outil de 🎯 (une case choisie). */
function singleOnMap(grid, cands) {
  for (let i = 0; i < 81; i++) {
    if (grid[i] === 0 && cands[i].size === 1) return { cell: i, digit: [...cands[i]][0], type: "naked" };
  }
  for (let i = 0; i < 81; i++) {
    if (grid[i] !== 0) continue;
    const hs = findHiddenSingleFor(grid, cands, i);
    if (hs) return { cell: i, digit: hs.digit, type: "hidden", unit: hs.unit };
  }
  return null;
}
function planFromSingle(grid, s, chain, lang) {
  if (s.type === "naked") {
    const baseCands = candidatesFromGrid(grid, s.cell);
    const kept = pruneChain(grid, chain, { type: "naked", target: s.cell, digit: s.digit, baseCands });
    const plan = finalizeNaked(grid, s.cell, s.digit, kept.map((x) => describeElim(x, lang)), baseCands, lang);
    plan.rawChain = kept;
    plan.difficulty = planDifficulty(1, kept);
    return tagPlan(plan, "nakedSingle", kept, null);
  }
  const kept = pruneChain(grid, chain, { type: "hidden", target: s.cell, digit: s.digit, unit: s.unit });
  const plan = finalizeHidden(grid, s.cell, s.digit, s.unit, kept.map((x) => describeElim(x, lang)), lang);
  plan.rawChain = kept;
  plan.difficulty = planDifficulty(2, kept);
  return tagPlan(plan, "hiddenSingle", kept, unitLabel(s.unit, lang));
}
export function nextStep(grid, lang = "fr", { allowUniqueness = true } = {}) {
  const opts = { allowUniqueness };
  // Palier 1 : singles sur les candidats bruts, une passe.
  const raw = allCands(grid);
  const direct = singleOnMap(grid, raw);
  if (direct) return planFromSingle(grid, direct, [], lang);
  // Paliers 2 → 5 : findElimTiered est déterministe et trié par palier, la
  // séquence au cap suivant répète le préfixe ; on repart proprement pour
  // garder « preuve simple avant preuve courte ».
  for (const cap of [2, 3, 4, 5]) {
    const cands = allCands(grid);
    const chain = [];
    for (let k = 0; k <= MAX_CHAIN_ALL; k++) {
      const s = singleOnMap(grid, cands);
      if (s) return planFromSingle(grid, s, chain, lang);
      if (chainExhausted(chain)) break;
      const e = findElimTiered(cands, cap, opts);
      if (!e) break;
      applyElim(cands, e);
      chain.push(e);
    }
  }
  return null;
}

/* ---------- Routage du panneau « bloqué » (👣/🎯) ----------
   Priorité : erreur prouvée > grille ambiguë > mur légitime.
   anyPlan=true → null : le coach a un plan, pas de panneau bloqué. */
export function stuckPanelKind({ multiSol, hasWrongDigit, anyPlan }) {
  if (anyPlan) return null;
  if (hasWrongDigit) return "wrong-digit";
  if (multiSol) return "multi-sol";
  return "beyond-coach";
}

/* ================================================================
   GÉNÉRATION — grille pleine, gradation « humaine », creusage
   ================================================================ */

// RNG déterministe (mulberry32) pour des tests reproductibles.
export function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateFullGrid(rng = Math.random) {
  const g = Array(81).fill(0);
  function fill(i) {
    if (i === 81) return true;
    const cs = shuffle(candidatesFromGrid(g, i), rng);
    for (const d of cs) {
      g[i] = d;
      if (fill(i + 1)) return true;
      g[i] = 0;
    }
    return false;
  }
  fill(0);
  return g;
}

/* Paliers de difficulté (gradation) :
   1 = singles · 2 = alignements · 3 = paires, triplets, quadruplets ·
   4 = poissons (à nageoire, jellyfish), ailes, chaînes X/XY, unicité ·
   5 = coloriage, AIC, ALS-XZ, Sue de Coq (palier B, v2.4). Exporté sous le
   nom TECH_TIER (tests, banc). */
const TIER_OF_KIND = {
  pointing: 2, claiming: 2, nakedPair: 3, hiddenPair: 3,
  nakedTriple: 3, hiddenTriple: 3, nakedQuad: 3, hiddenQuad: 3,
  xWing: 4, finnedXWing: 4, xyWing: 4, xyzWing: 4, wWing: 4, swordfish: 4, jellyfish: 4,
  kite: 4, skyscraper: 4, emptyRectangle: 4, remotePair: 4,
  xChain: 4, xyChain: 4, uniqueRectangle: 4, bug1: 4,
  coloring: 5, aic: 5, alsXz: 5, sueDeCoq: 5,
};
export const TECH_TIER = TIER_OF_KIND;
// Dérivé de ELIM_FINDERS : mêmes finders, groupés par palier (l'ordre
// intra-palier suit l'ordre pédagogique — contrat de déterminisme, cf. supra).
const FINDERS_BY_TIER = [2, 3, 4, 5].map((t) =>
  ELIM_FINDERS.filter(([, kind]) => TIER_OF_KIND[kind] === t).map(([f, kind]) => [f, kind])
);
// Contrairement à findElim (ordre pédagogique), la gradation cherche tier par
// tier ascendant : une grille « alignements » ne doit pas être gradée « paires »
// juste parce qu'une paire nue se présentait en premier.
function findElimTiered(cands, cap, opts = { allowUniqueness: true }) {
  for (let t = 0; t < FINDERS_BY_TIER.length; t++) {
    if (t + 2 > cap) return null;
    for (const [f, kind] of FINDERS_BY_TIER[t]) {
      if (skipKind(kind, opts)) continue;
      const e = f(cands, null);
      if (e) return e;
    }
  }
  return null;
}

// Simule un humain : singles jusqu'au point fixe, sinon une élimination (du
// palier le plus bas possible, jamais au-delà de cap), et on recommence.
// Version instrumentée : onStep (optionnel) reçoit chaque événement —
//   { type: "place", cell, digit, via: "single" | "hiddenSingle" }
//   { type: "elim", e, values, cands } — values et cands copiés AU MOMENT T,
//     avant application (cands : 81 tableaux triés).
// onStep qui retourne true interrompt la résolution (aborted: true).
// Sans onStep : zéro copie, zéro allocation — comportement de solveHumanly.
export function solveHumanlySteps(grid, onStep, cap = 5, { allowUniqueness = true } = {}) {
  const opts = { allowUniqueness };
  const g = grid.slice();
  // Carte de candidats recalculée à CHAQUE placement (B0) : le joueur, lui,
  // repart des candidats bruts à chaque appui 👣 (nextStep) — sa grille ne se
  // souvient pas des éliminations. Garder une carte persistante surestimait
  // ce qu'il peut faire (faux murs mesurés au banc). Même ordre d'éliminations
  // que nextStep (findElimTiered) : gradée résoluble ⟺ 👣 termine.
  const cands = allCands(g);
  const counts = {};
  let maxTier = 0;
  let elimRun = 0; // éliminations « coûteuses » enchaînées depuis le dernier placement
  let elimRunAll = 0; // toutes éliminations confondues (plafond global)
  const place = (i, d) => {
    elimRun = 0; elimRunAll = 0;
    g[i] = d;
    for (let j = 0; j < 81; j++) cands[j] = new Set(candidatesFromGrid(g, j));
  };
  for (let iter = 0; iter < 2000; iter++) {
    // 1. Singles jusqu'au point fixe
    let placed = true;
    while (placed) {
      placed = false;
      for (let i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        if (cands[i].size === 0) return { solved: false, maxTier, counts };
        if (cands[i].size === 1) {
          const d = [...cands[i]][0];
          place(i, d);
          counts.single = (counts.single || 0) + 1;
          maxTier = Math.max(maxTier, 1);
          placed = true;
          if (onStep && onStep({ type: "place", cell: i, digit: d, via: "single" }))
            return { solved: false, aborted: true, maxTier, counts };
        }
      }
      for (let i = 0; i < 81; i++) {
        if (g[i] !== 0) continue;
        const hs = findHiddenSingleFor(g, cands, i);
        if (hs) {
          place(i, hs.digit);
          counts.hiddenSingle = (counts.hiddenSingle || 0) + 1;
          maxTier = Math.max(maxTier, 1);
          placed = true;
          if (onStep && onStep({ type: "place", cell: i, digit: hs.digit, via: "hiddenSingle" }))
            return { solved: false, aborted: true, maxTier, counts };
        }
      }
    }
    if (!g.some((v) => v === 0)) return { solved: true, maxTier, counts };
    // 2. Une élimination du palier le plus bas possible — bornée par MAX_CHAIN
    // entre deux placements, comme buildPlan : au-delà, la grille est déclarée
    // non résoluble « humainement » (le joueur ne pourrait pas la finir en jeu).
    if (elimRunAll >= MAX_CHAIN_ALL || elimRun >= MAX_CHAIN) return { solved: false, maxTier, counts };
    const e = findElimTiered(cands, cap, opts);
    if (!e) return { solved: false, maxTier, counts };
    if (onStep && onStep({
      type: "elim", e,
      values: g.slice(),
      cands: cands.map((s) => [...s].sort((a, b) => a - b)),
    })) return { solved: false, aborted: true, maxTier, counts };
    applyElim(cands, e);
    elimRunAll++;
    if (!CHAIN_FREE_KINDS.has(e.kind)) elimRun++;
    counts[e.kind] = (counts[e.kind] || 0) + 1;
    maxTier = Math.max(maxTier, TIER_OF_KIND[e.kind]);
  }
  return { solved: false, maxTier, counts };
}
export const solveHumanly = (grid, cap = 5, opts) => solveHumanlySteps(grid, null, cap, opts);

/* Niveaux 1-4 : Facile / Moyen / Difficile / Expert (5 : Diabolique).
   Grille pleine → creusage par paires symétriques (unicité obligatoire ; pour
   les niveaux 1-3, on ne retire une paire que si la grille reste résoluble
   sans dépasser le palier visé) → acceptée si le grade tombe juste. */
export function generatePuzzle(level, rng = Math.random, { maxAttempts = 400, timeBoxMs = 3000 } = {}) {
  // timeBoxMs: Infinity → borne en TENTATIVES uniquement. Indispensable au
  // défi du jour (« la même grille pour tous ») : une deadline horloge
  // couperait la boucle plus tôt sur un appareil lent et produirait une
  // grille différente. Le résultat reste alors déterministe à rng donné —
  // mais seulement à version identique du moteur (tout changement des
  // finders ou de MAX_CHAIN change les grades, donc les grilles).
  const deadline = timeBoxMs === Infinity ? null : Date.now() + timeBoxMs;
  let best = null;
  // Le vrai plafond est la deadline : une tentative gardée (niveaux 1-3) ne
  // coûte que ~10 ms, autant en tenter beaucoup plutôt que s'arrêter à 40.
  let attempt = 0;
  for (; attempt < maxAttempts && (!deadline || Date.now() < deadline); attempt++) {
    const full = generateFullGrid(rng);
    const g = full.slice();
    const pairs = shuffle(
      [...Array.from({ length: 40 }, (_, i) => [i, 80 - i]), [40]], rng
    );
    const guarded = level <= 3;
    let lastGrade = null;
    for (const pair of pairs) {
      const saved = pair.map((i) => g[i]);
      pair.forEach((i) => { g[i] = 0; });
      const undo = () => pair.forEach((i, k) => { g[i] = saved[k]; });
      if (solveGrid(g).count !== 1) { undo(); continue; }
      if (guarded) {
        const r = solveHumanly(g, level);
        if (!r.solved) { undo(); continue; }
        lastGrade = r;
      }
    }
    const r = guarded && lastGrade ? lastGrade : solveHumanly(g, 5);
    const grade = r && r.solved ? Math.max(1, r.maxTier) : 5;
    const givens = g.filter((v) => v !== 0).length;
    const okRange = givens >= 22 && givens <= 45;
    if (grade === level && okRange) {
      return { grid: g.join(""), solution: full.join(""), level, givens, attempts: attempt + 1 };
    }
    const score = Math.abs(grade - level) * 10 + (okRange ? 0 : 5);
    if (!best || score < best.score) {
      best = { grid: g.join(""), solution: full.join(""), level: grade, givens, score };
    }
  }
  delete best.score;
  best.attempts = attempt;
  return best; // meilleure grille obtenue, avec son niveau réel
}

/* ================================================================
   EXERCICES — capture d'états réels pour l'onglet Apprendre
   ================================================================ */

// Creusage rapide NON gardé (unicité seule) : donne une grille difficile où les
// techniques apparaissent naturellement. generatePuzzle (3 s/grille pour viser
// un grade exact) serait inutilisable dans le time-box d'une recherche.
function digUnguarded(full, rng) {
  const g = full.slice();
  const pairs = shuffle(
    [...Array.from({ length: 40 }, (_, i) => [i, 80 - i]), [40]], rng
  );
  for (const pair of pairs) {
    const saved = pair.map((i) => g[i]);
    pair.forEach((i) => { g[i] = 0; });
    if (solveGrid(g).count !== 1) pair.forEach((i, k) => { g[i] = saved[k]; });
  }
  return g;
}

// Cases à teinter (unit) / encadrer (focus) pour un exercice — même logique que
// le surlignage du coach : la ou les zones que le motif « lit », plus ses cases.
function elimHighlight(e) {
  let unit;
  switch (e.kind) {
    case "nakedPair": case "hiddenPair":
    case "nakedTriple": case "hiddenTriple": case "nakedQuad": case "hiddenQuad":
      unit = [...e.unit.cells]; break;
    case "pointing": case "claiming":
      unit = [...BOXES[e.box], ...e.line.cells]; break;
    case "xWing": case "swordfish": case "jellyfish": {
      const cross = e.lineType === "row" ? COLS : ROWS;
      unit = e.cross.flatMap((c) => cross[c]); break;
    }
    case "finnedXWing": {
      const base = e.lineType === "row" ? ROWS : COLS;
      unit = [...e.lines.flatMap((l) => base[l]), ...BOXES[e.finBox]]; break;
    }
    case "kite":
      unit = [...ROWS[e.row], ...COLS[e.col]]; break;
    case "emptyRectangle":
      unit = [...BOXES[e.box], ...e.linkLine.cells]; break;
    case "wWing":
      unit = [...e.linkUnit.cells, ...e.cells]; break;
    case "sueDeCoq":
      unit = [...e.line.cells, ...BOXES[e.box]]; break;
    case "coloring": case "xChain": case "aic":
      unit = [...e.linkUnits.flatMap((u) => u.cells), ...e.cells]; break;
    case "alsXz":
      unit = [...e.a.unit.cells, ...e.b.unit.cells, ...e.removals.map((r) => r.cell)]; break;
    case "uniqueRectangle":
      unit = [...e.cells, ...(e.unit ? e.unit.cells : []), ...e.removals.map((r) => r.cell)]; break;
    case "bug1":
      unit = [...ROWS[rowOf(e.cell)], ...COLS[colOf(e.cell)], ...BOXES[boxOf(e.cell)]]; break;
    default: // skyscraper, xyWing, xyzWing, remotePair
      unit = [...e.cells, ...e.removals.map((r) => r.cell)];
  }
  return { unit, focus: [...e.cells] };
}

// « Regarde du côté de {zone} » avec la contraction française qui va bien.
const FISH_ZONE = new Set(["xWing", "swordfish", "jellyfish", "finnedXWing"]);
function hintFromZone(e, zone, lang = "fr") {
  // Pour les poissons, la zone (« 2 lignes ») est moins parlante que le chiffre.
  if (lang === "en") {
    const z = FISH_ZONE.has(e.kind) ? `the ${e.digit}` : zone;
    return `Look around ${z}.`;
  }
  const z = FISH_ZONE.has(e.kind) ? `le ${e.digit}` : zone;
  const de = z.startsWith("le ") ? `du ${z.slice(3)}`
    : z.startsWith("les ") ? `des ${z.slice(4)}` : `de ${z}`;
  return `Regarde du côté ${de}.`;
}

// Emballe une élimination trouvée en exercice complet — notes, removals,
// surlignage, explication, indice et bonus — depuis des valeurs + candidats.
export function packageExercise(kind, e, values, candsArr, lang = "fr") {
  const notes = {};
  for (let i = 0; i < 81; i++) {
    if (values[i] === 0 && candsArr[i].length) notes[i] = candsArr[i];
  }
  const removals = {};
  for (const r of e.removals) {
    removals[r.cell] = [...new Set([...(removals[r.cell] || []), ...r.digits])]
      .sort((a, b) => a - b);
  }
  const d = describeElim(e, lang);
  const { unit, focus } = elimHighlight(e);
  // Chaînes : un maillon par étape après le résumé (stepper des exercices).
  const links = d.links || [];
  const ex = {
    kind, given: values, notes, removals, unit, focus,
    explain: [d.text, ...links.map((l) => l.text)],
    explainCells: [d.cells, ...links.map((l) => l.cells)],
    hint: hintFromZone(e, d.zone, lang),
  };
  // Bonus : une case qui passe à candidat unique après application (l'unicité
  // de la solution garantit que ce candidat est le bon chiffre).
  for (const [cell, digs] of Object.entries(removals)) {
    const left = notes[cell].filter((x) => !digs.includes(x));
    if (left.length === 1 && notes[cell].length > 1) {
      ex.target = Number(cell);
      ex.answer = left[0];
      break;
    }
  }
  return ex;
}
const exerciseFromElim = (kind, step, lang = "fr") =>
  packageExercise(kind, step.e, step.values, step.cands, lang);

/* ---------- Transformations : symétries du sudoku ----------
   Toute position reste logiquement identique sous permutation des chiffres,
   des lignes au sein d'une bande, des colonnes au sein d'une pile, des bandes,
   des piles, et transposition. Un motif présent dans la position d'origine est
   présent (déplacé/renuméroté) dans la position transformée. */
export function randomTransform(rng = Math.random) {
  const linePerm = () => {
    // perm[ancienne ligne] = nouvelle ligne : bandes mélangées, puis les
    // 3 lignes au sein de chaque bande.
    const bands = shuffle([0, 1, 2], rng);
    const perm = Array(9);
    for (let b = 0; b < 3; b++) {
      const inner = shuffle([0, 1, 2], rng);
      for (let i = 0; i < 3; i++) perm[b * 3 + i] = bands[b] * 3 + inner[i];
    }
    return perm;
  };
  return {
    digitPerm: [0, ...shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)],
    rowPerm: linePerm(),
    colPerm: linePerm(),
    transpose: rng() < 0.5,
  };
}

// pos = format leçon/exercice : { given, notes, removals, unit, focus,
// target, answer }. Convention : (r, c) → (rowPerm[r], colPerm[c]), PUIS
// transposition. Forme préservée (given array ou objet). Les textes ne sont
// jamais remappés : les régénérer via finder + packageExercise.
export function transformPosition(pos, t) {
  const mapCell = (i) => {
    let r = t.rowPerm[rowOf(i)], c = t.colPerm[colOf(i)];
    if (t.transpose) [r, c] = [c, r];
    return r * 9 + c;
  };
  const mapDigit = (d) => t.digitPerm[d];
  const mapDigits = (arr) => arr.map(mapDigit).sort((a, b) => a - b);
  const mapObj = (obj, mapVal) => {
    const out = {};
    for (const [k, v] of Object.entries(obj)) out[mapCell(Number(k))] = mapVal(v);
    return out;
  };
  const out = {};
  if (Array.isArray(pos.given)) {
    const g = Array(81).fill(0);
    pos.given.forEach((v, i) => { if (v) g[mapCell(i)] = mapDigit(v); });
    out.given = g;
  } else {
    out.given = mapObj(pos.given || {}, mapDigit);
  }
  out.notes = mapObj(pos.notes || {}, mapDigits);
  out.removals = mapObj(pos.removals || {}, mapDigits);
  out.unit = (pos.unit || []).map(mapCell);
  out.focus = (pos.focus || []).map(mapCell);
  if (pos.target !== undefined) out.target = mapCell(pos.target);
  if (pos.answer !== undefined) out.answer = mapDigit(pos.answer);
  return out;
}

// Singles : on cherche dans l'état INITIAL d'une grille creusée — buildPlan
// fournit la preuve complète (paras, unitCells, indices contextuels).
function exerciseFromSingle(kind, g, lang = "fr") {
  const cands = allCands(g);
  for (let t = 0; t < 81; t++) {
    if (g[t] !== 0) continue;
    if (kind === "nakedSingle") {
      if (cands[t].size !== 1) continue;
    } else {
      // Un vrai single caché : plusieurs candidats, mais une seule place pour lui.
      if (cands[t].size < 2 || !findHiddenSingleFor(g, cands, t)) continue;
    }
    const plan = buildPlan(g, t, lang);
    if (!plan || plan.chain.length) continue; // preuve directe uniquement
    return {
      kind, given: g.slice(), notes: {}, removals: {},
      unit: plan.unitCells, focus: [], target: t, answer: plan.digit,
      explain: plan.paras, hint: plan.hint1,
    };
  }
  return null;
}

/* ---------- Génération constructive (motifs rares) ----------
   Recette « solution d'abord » : le squelette du motif est choisi directement
   dans une grille pleine S (un chiffre y apparaît une fois par ligne/colonne/
   bloc — k lignes donnent donc k colonnes distinctes), on vide les cases du
   motif + une ou deux victimes, et un oracle (finder du kind sur les candidats
   bruts + unicité de la solution) valide chaque tentative (~0,1 ms). */
const colOfDigitInRow = (S, r, d) => colOf(ROWS[r].find((i) => S[i] === d));
const rowOfDigitInCol = (S, c, d) => rowOf(COLS[c].find((i) => S[i] === d));
const bandOf = (r) => Math.floor(r / 3);
const pileOf = (c) => Math.floor(c / 3);
const ALL9 = [0, 1, 2, 3, 4, 5, 6, 7, 8];

// Vide les givens de valeur d qui voient `cell` (sinon d n'y serait pas
// candidat). false si une case protégée devrait être vidée.
function carveSupport(g, cell, d, protectedSet) {
  for (const p of PEERS[cell]) {
    if (g[p] !== d) continue;
    if (protectedSet.has(p)) return false;
    g[p] = 0;
  }
  return true;
}

// X-Wing (size 2) / Swordfish (size 3) : k lignes, les colonnes du chiffre
// dans S, tout le croisement vidé, victimes dans les colonnes hors lignes.
function skeletonFish(size) {
  return (S, rng) => {
    const g = S.slice();
    const d = 1 + Math.floor(rng() * 9);
    const rows = shuffle(ALL9.slice(), rng).slice(0, size);
    const cols = rows.map((r) => colOfDigitInRow(S, r, d));
    const protectedSet = new Set(rows.flatMap((r) => ROWS[r]));
    const pattern = rows.flatMap((r) => cols.map((c) => r * 9 + c));
    pattern.forEach((i) => { g[i] = 0; });
    for (const i of pattern) if (!carveSupport(g, i, d, protectedSet)) return null;
    const rowSet = new Set(rows);
    const victims = [];
    const spots = shuffle(cols.flatMap((c) => COLS[c].filter((i) => !rowSet.has(rowOf(i)))), rng);
    for (const v of spots) {
      if (victims.length >= 2) break;
      g[v] = 0;
      if (!carveSupport(g, v, d, protectedSet)) return null;
      victims.push(v);
    }
    return victims.length ? { g, victims } : null;
  };
}

// Skyscraper : lignes de bandes ≠ dont les toits (colonnes du d dans S)
// partagent la même pile, base commune hors pile ; victime dans
// box(toit) ∩ colonne de l'autre toit.
function skeletonSkyscraper(S, rng) {
  const g = S.slice();
  for (const d of shuffle(ALL9.map((x) => x + 1), rng)) {
    const colD = ALL9.map((r) => colOfDigitInRow(S, r, d));
    const pairs = [];
    for (let r1 = 0; r1 < 9; r1++) for (let r2 = r1 + 1; r2 < 9; r2++) {
      if (bandOf(r1) === bandOf(r2)) continue;
      if (colD[r1] === colD[r2] || pileOf(colD[r1]) !== pileOf(colD[r2])) continue;
      pairs.push([r1, r2]);
    }
    if (!pairs.length) continue;
    const [r1, r2] = pairs[Math.floor(rng() * pairs.length)];
    const ct1 = colD[r1], ct2 = colD[r2];
    const cb = shuffle(ALL9.filter((c) => pileOf(c) !== pileOf(ct1)), rng)[0];
    const protectedSet = new Set([...ROWS[r1], ...ROWS[r2]]);
    const pattern = [r1 * 9 + ct1, r2 * 9 + ct2, r1 * 9 + cb, r2 * 9 + cb];
    pattern.forEach((i) => { g[i] = 0; });
    for (const i of pattern) if (!carveSupport(g, i, d, protectedSet)) return null;
    const spots = [];
    for (let k = 0; k < 3; k++) {
      const ra = bandOf(r1) * 3 + k, rb = bandOf(r2) * 3 + k;
      if (ra !== r1) spots.push(ra * 9 + ct2);
      if (rb !== r2) spots.push(rb * 9 + ct1);
    }
    const v = shuffle(spots, rng).find((i) => g[i] !== 0);
    if (v === undefined) return null;
    g[v] = 0;
    if (!carveSupport(g, v, d, protectedSet)) return null;
    return { g, victims: [v] };
  }
  return null;
}

// 2-String Kite : autour d'un bloc, une ligne de sa bande (d hors pile) et une
// colonne de sa pile (d hors bande), deux cases vidées dans le bloc ;
// victime au croisement des extrémités libres.
function skeletonKite(S, rng) {
  const g = S.slice();
  for (const b of shuffle(ALL9.slice(), rng)) {
    const bandRows = [0, 1, 2].map((k) => Math.floor(b / 3) * 3 + k);
    const pileCols = [0, 1, 2].map((k) => (b % 3) * 3 + k);
    for (const d of shuffle(ALL9.map((x) => x + 1), rng)) {
      const rowsOk = bandRows.filter((r) => !pileCols.includes(colOfDigitInRow(S, r, d)));
      const colsOk = pileCols.filter((c) => !bandRows.includes(rowOfDigitInCol(S, c, d)));
      if (!rowsOk.length || !colsOk.length) continue;
      const r = rowsOk[Math.floor(rng() * rowsOk.length)];
      const c = colsOk[Math.floor(rng() * colsOk.length)];
      const cfree = colOfDigitInRow(S, r, d), rfree = rowOfDigitInCol(S, c, d);
      const cin = shuffle(pileCols.filter((x) => x !== c), rng)[0];
      const rin = shuffle(bandRows.filter((x) => x !== r), rng)[0];
      const pattern = [r * 9 + cfree, r * 9 + cin, rfree * 9 + c, rin * 9 + c];
      const protectedSet = new Set([...ROWS[r], ...COLS[c]]);
      pattern.forEach((i) => { g[i] = 0; });
      for (const i of pattern) if (!carveSupport(g, i, d, protectedSet)) return null;
      const v = rfree * 9 + cfree;
      if (g[v] === 0) return null;
      g[v] = 0;
      if (!carveSupport(g, v, d, protectedSet)) return null;
      return { g, victims: [v] };
    }
  }
  return null;
}

// Remote Pairs : marche dans S en alternant deux valeurs a/b de peer en peer
// (4 maillons, sans adjacence de même couleur), victime voyant les deux
// extrémités. Le creusage support des a/b visibles est indispensable pour
// rendre les maillons bivalués.
function skeletonRemotePair(S, rng) {
  const g = S.slice();
  const [a, b] = shuffle(ALL9.map((x) => x + 1), rng);
  const none = new Set();
  const cellsA = shuffle(Array.from({ length: 81 }, (_, i) => i).filter((i) => S[i] === a), rng);
  for (const c1 of cellsA) {
    for (const c2 of shuffle([...PEERS[c1]].filter((i) => S[i] === b), rng)) {
      for (const c3 of shuffle([...PEERS[c2]].filter((i) => S[i] === a && i !== c1 && !PEERS[c1].has(i)), rng)) {
        for (const c4 of shuffle([...PEERS[c3]].filter((i) => S[i] === b && i !== c2 && !PEERS[c2].has(i)), rng)) {
          const chain = [c1, c2, c3, c4];
          const v = shuffle(
            [...PEERS[c1]].filter((i) => PEERS[c4].has(i) && !chain.includes(i)), rng
          )[0];
          if (v === undefined) continue;
          chain.forEach((i) => { g[i] = 0; });
          g[v] = 0;
          for (const i of [...chain, v]) {
            carveSupport(g, i, a, none);
            carveSupport(g, i, b, none);
          }
          return { g, victims: [v] };
        }
      }
    }
  }
  return null;
}

const CONSTRUCTORS = {
  xWing: skeletonFish(2), swordfish: skeletonFish(3),
  skyscraper: skeletonSkyscraper, kite: skeletonKite, remotePair: skeletonRemotePair,
};

// Bornes d'un état d'exercice « propre » : assez creusé pour ressembler à une
// vraie partie, jamais si plein qu'un single traîne à côté du motif.
const GIVENS_MIN = 28, GIVENS_MAX = 50, GIVENS_TARGET = 34;

// Alterne deux passes jusqu'à convergence (grille inchangée sur un tour) :
// 1. creusage élargi — paires symétriques hors motif, retrait gardé seulement
//    si l'unicité tient ET que le finder retrouve un motif avec removals
//    (n'importe quelle instance) ;
// 2. balayage anti-singles — chaque single posable est rempli avec son chiffre
//    forcé (= valeur de la solution, l'unicité est préservée à chaque pas).
// false si le motif casse ou si la deadline tombe : la tentative est jetée.
function refineConstructive(g, patternOk, rng, deadline) {
  const pairs = shuffle([...Array.from({ length: 40 }, (_, i) => [i, 80 - i]), [40]], rng);
  let prev = "";
  while (Date.now() < deadline) {
    for (const pair of pairs) {
      if (Date.now() >= deadline) return false;
      if (g.reduce((n, v) => n + (v !== 0), 0) <= GIVENS_TARGET) break;
      const saved = pair.map((i) => g[i]);
      if (saved.every((v) => v === 0)) continue;
      pair.forEach((i) => { g[i] = 0; });
      if (solveGrid(g).count !== 1 || !patternOk(g)) pair.forEach((i, k) => { g[i] = saved[k]; });
    }
    let s;
    while ((s = firstSingle(g))) {
      if (Date.now() >= deadline) return false;
      g[s.cell] = s.digit;
      if (!patternOk(g)) return false; // motif cassé par le remplissage
    }
    const sig = g.join("");
    if (sig === prev) break; // convergé : plus aucun mouvement net
    prev = sig;
  }
  return !firstSingle(g) && !!patternOk(g);
}

// Construit une vraie grille autour du motif demandé. Chaque tentative est
// validée par l'oracle : finder du kind sur candidats bruts (prefer=victimes)
// + solution unique, puis raffinée (creusage + anti-singles) jusqu'à l'état
// « propre ». null si kind non couvert ou budget épuisé.
export function buildConstructiveExercise(kind, { budgetMs = 1500, rng = Math.random, lang = "fr" } = {}) {
  const build = CONSTRUCTORS[kind];
  if (!build) return null;
  const deadline = Date.now() + budgetMs;
  const finder = ELIM_FINDER_BY_KIND[kind];
  const patternOk = (g) => {
    const e = finder(allCands(g), null);
    return e && e.removals.length ? e : null;
  };
  while (Date.now() < deadline) {
    const sk = build(generateFullGrid(rng), rng);
    if (!sk) continue;
    if (!finder(allCands(sk.g), new Set(sk.victims))) continue;
    if (solveGrid(sk.g).count !== 1) continue;
    const g = sk.g;
    if (!refineConstructive(g, patternOk, rng, deadline)) continue;
    const givens = g.reduce((n, v) => n + (v !== 0), 0);
    if (givens < GIVENS_MIN || givens > GIVENS_MAX) continue;
    const cands = allCands(g);
    return packageExercise(kind, patternOk(g), g, cands.map((s) => [...s].sort((x, y) => x - y)), lang);
  }
  return null;
}

// Part du time-box réservée aux captures « brutes » (l'élim visée est la
// première de la résolution : notes affichées ≡ candidats bruts de la grille).
// Mesuré sur 1000 grilles : l'Empty Rectangle n'apparaît jamais en premier → 0.
const RAW_FRACTION_BY_KIND = { emptyRectangle: 0 };
function isRawCapture(step) {
  for (let i = 0; i < 81; i++) {
    if (step.values[i] !== 0) continue;
    const raw = candidatesFromGrid(step.values, i);
    const shown = step.cands[i];
    if (raw.length !== shown.length || raw.some((d, k) => shown[k] !== d)) return false;
  }
  return true;
}

// Cherche, dans le time-box, un état de grille réelle où la technique demandée
// est LA prochaine étape (les singles sont épuisés, rien de plus simple ne
// s'applique au même moment). Pendant les 2 premiers tiers du time-box, seules
// les captures brutes sont acceptées ; au-delà, la première capture
// « travaillée » rencontrée est servie en repli avec workedNotes: true.
// null si la configuration est trop rare.
export function findTechniqueExercise(kind, { timeBoxMs = 4000, rng = Math.random, lang = "fr" } = {}) {
  const deadline = Date.now() + timeBoxMs;
  const frac = RAW_FRACTION_BY_KIND[kind] !== undefined ? RAW_FRACTION_BY_KIND[kind] : 2 / 3;
  const rawDeadline = Date.now() + timeBoxMs * frac;
  const isSingle = kind === "nakedSingle" || kind === "hiddenSingle";
  let worked = null; // première capture travaillée, servie en repli
  while (Date.now() < deadline) {
    if (worked && Date.now() >= rawDeadline) return worked;
    const g = digUnguarded(generateFullGrid(rng), rng);
    if (isSingle) {
      const ex = exerciseFromSingle(kind, g, lang);
      if (ex) return ex; // l'état initial est brut par construction
      continue;
    }
    let found = null;
    solveHumanlySteps(g, (step) => {
      if (step.type !== "elim" || step.e.kind !== kind) return false;
      if (isRawCapture(step)) { found = exerciseFromElim(kind, step, lang); return true; }
      if (!worked) {
        worked = exerciseFromElim(kind, step, lang);
        worked.workedNotes = true;
      }
      return true; // les élims s'accumulent : cette grille ne redeviendra pas brute
    });
    if (found) return found;
  }
  return worked;
}
