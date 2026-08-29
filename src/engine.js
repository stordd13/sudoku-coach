/* ================================================================
   SUDOKU · COACH — moteur logique (pur JS, sans UI)
   ================================================================ */

/* ---------- Constantes de grille ---------- */
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
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of UNITS) if (u.cells.includes(i)) u.cells.forEach((j) => { if (j !== i) s.add(j); });
  return s;
});
export const BOX_NAMES = [
  "haut-gauche", "haut-centre", "haut-droit",
  "milieu-gauche", "central", "milieu-droit",
  "bas-gauche", "bas-centre", "bas-droit",
];

export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
export const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
export const cellName = (i) => `L${rowOf(i) + 1}C${colOf(i) + 1}`;
export function unitLabel(u) {
  if (u.type === "row") return `la ligne ${u.index + 1}`;
  if (u.type === "col") return `la colonne ${u.index + 1}`;
  return `le bloc ${BOX_NAMES[u.index]}`;
}
export const listD = (arr) =>
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
export function presentDigits(grid, cells) {
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
function combos(arr, k) {
  const res = [];
  const rec = (start, acc) => {
    if (acc.length === k) { res.push(acc.slice()); return; }
    for (let i = start; i < arr.length; i++) { acc.push(arr[i]); rec(i + 1, acc); acc.pop(); }
  };
  rec(0, []);
  return res;
}

// X-Wing (size 2) et Swordfish (size 3) : même « poisson », généralisé.
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
          kind: size === 2 ? "xWing" : "swordfish",
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
        return {
          kind: "xyWing", pivot, pincers: [p1, p2], c,
          cells: [pivot, p1, p2], digits: [c], removals,
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
      return {
        kind: "xyzWing", pivot, pincers: [p1, p2], z,
        cells: [pivot, p1, p2], digits: [z], removals,
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
          return {
            kind: "wWing", a, b, bivalues: [A, B], link: [e1, e2], linkUnit: u,
            cells: [A, B, e1, e2], digits: [a], removals,
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

const findElim = (cands, prefer) =>
  findNakedPairE(cands, prefer) || findPointingE(cands, prefer) ||
  findClaimingE(cands, prefer) || findHiddenPairE(cands, prefer) ||
  findXWingE(cands, prefer) || findXYWingE(cands, prefer) ||
  findXYZWingE(cands, prefer) || findWWingE(cands, prefer) ||
  findSwordfishE(cands, prefer) || findKiteE(cands, prefer) ||
  findSkyscraperE(cands, prefer) || findEmptyRectangleE(cands, prefer) ||
  findRemotePairE(cands, prefer);
function applyElim(cands, e) {
  for (const r of e.removals) for (const d of r.digits) cands[r.cell].delete(d);
}
function describeElim(e) {
  const remTxt = e.removals.map((r) => `${cellName(r.cell)} −{${r.digits.join(", ")}}`).join(" · ");
  const involved = [...e.cells, ...e.removals.map((r) => r.cell)];
  if (e.kind === "nakedPair") {
    const [A, B] = e.cells, [x, y] = e.digits;
    return {
      title: "Paire nue", zone: unitLabel(e.unit), cells: involved,
      text: `Dans ${unitLabel(e.unit)}, **${cellName(A)}** et **${cellName(B)}** n’acceptent chacune que {${x}, ${y}}. Ces deux chiffres sont donc réservés à ces deux cases → on les retire du reste de la zone : ${remTxt}.`,
    };
  }
  if (e.kind === "pointing") {
    return {
      title: "Paire pointante", zone: `le bloc ${BOX_NAMES[e.box]}`, cells: involved,
      text: `Dans le bloc **${BOX_NAMES[e.box]}**, le **${e.digit}** ne peut aller qu’en ${unitLabel(e.line)} (${e.cells.map(cellName).join(", ")}). Il occupera forcément l’une de ces cases → on retire le ${e.digit} du reste de ${unitLabel(e.line)} : ${remTxt}.`,
    };
  }
  if (e.kind === "claiming") {
    return {
      title: "Réduction bloc/ligne", zone: unitLabel(e.line), cells: involved,
      text: `Sur ${unitLabel(e.line)}, le **${e.digit}** est confiné au bloc **${BOX_NAMES[e.box]}** (${e.cells.map(cellName).join(", ")}). Il occupera l’une de ces cases → on retire le ${e.digit} des autres cases de ce bloc : ${remTxt}.`,
    };
  }
  if (e.kind === "xWing" || e.kind === "swordfish") {
    const name = e.kind === "xWing" ? "X-Wing" : "Swordfish";
    const base = e.lineType === "row" ? "lignes" : "colonnes";
    const perp = e.lineType === "row" ? "colonnes" : "lignes";
    return {
      title: name, zone: `${e.size} ${base}`, cells: involved,
      text: `Le **${e.digit}** est confiné aux mêmes ${e.size} ${perp} sur ${e.size} ${base} (${e.cells.map(cellName).join(", ")}). Ces ${e.size} ${perp} accueilleront le ${e.digit} sur ces ${base} → on le retire du reste de ces ${perp} : ${remTxt}.`,
    };
  }
  if (e.kind === "skyscraper") {
    return {
      title: "Skyscraper", zone: `le ${e.digit}`, cells: involved,
      text: `Le **${e.digit}** forme deux liens forts qui partagent une base (${e.base.map(cellName).join(", ")}). L’un des deux « toits » (${e.roof.map(cellName).join(", ")}) est donc forcément un ${e.digit} → toute case voyant ces deux toits perd le ${e.digit} : ${remTxt}.`,
    };
  }
  if (e.kind === "xyWing") {
    return {
      title: "XY-Wing", zone: `le pivot ${cellName(e.pivot)}`, cells: involved,
      text: `**${cellName(e.pivot)}** (pivot) et ses pinces ${e.pincers.map(cellName).join(", ")} forment un XY-Wing : quelle que soit la valeur du pivot, l’une des pinces vaut **${e.c}**. Toute case voyant les deux pinces perd donc le ${e.c} : ${remTxt}.`,
    };
  }
  if (e.kind === "xyzWing") {
    return {
      title: "XYZ-Wing", zone: `le pivot ${cellName(e.pivot)}`, cells: involved,
      text: `**${cellName(e.pivot)}** (pivot à trois candidats) et ses pinces ${e.pincers.map(cellName).join(", ")} forment un XYZ-Wing : quelle que soit la valeur du pivot, un **${e.z}** apparaît dans le trio — pivot compris. Toute case voyant les trois cases perd donc le ${e.z} : ${remTxt}.`,
    };
  }
  if (e.kind === "wWing") {
    return {
      title: "W-Wing", zone: `la paire {${e.a}, ${e.b}}`, cells: involved,
      text: `**${cellName(e.bivalues[0])}** et **${cellName(e.bivalues[1])}** portent la même paire {${e.a}, ${e.b}} sans se voir. Dans ${unitLabel(e.linkUnit)}, le **${e.b}** n’a que deux places (${e.link.map(cellName).join(", ")}), chacune voyant l’une des deux paires → l’une des deux vaut forcément **${e.a}** : toute case voyant les deux perd le ${e.a} : ${remTxt}.`,
    };
  }
  if (e.kind === "kite") {
    return {
      title: "2-String Kite", zone: `le ${e.digit}`, cells: involved,
      text: `Le **${e.digit}** n’a que deux places sur la ligne ${e.row + 1} et deux sur la colonne ${e.col + 1}, dont ${e.blockPair.map(cellName).join(" et ")} dans le même bloc : elles ne peuvent pas porter le ${e.digit} toutes les deux → l’une des extrémités libres (${e.ends.map(cellName).join(", ")}) le porte forcément. Toute case voyant ces deux extrémités perd le ${e.digit} : ${remTxt}.`,
    };
  }
  if (e.kind === "emptyRectangle") {
    return {
      title: "Empty Rectangle", zone: `le bloc ${BOX_NAMES[e.box]}`, cells: involved,
      text: `Dans le bloc **${BOX_NAMES[e.box]}**, tous les **${e.digit}** tiennent dans la ligne ${e.erRow + 1} et la colonne ${e.erCol + 1} — le reste du rectangle est vide. Avec le lien fort ${e.link.map(cellName).join("–")}, un ${e.digit} en ${cellName(e.removals[0].cell)} viderait ce bloc de toutes ses places pour le ${e.digit} : ${remTxt}.`,
    };
  }
  if (e.kind === "remotePair") {
    const [x, y] = e.digits;
    return {
      title: "Remote Pairs", zone: `la paire {${x}, ${y}}`, cells: involved,
      text: `Ces cases ne contiennent que {${x}, ${y}} et s’enchaînent en alternant les deux valeurs (${e.cells.map(cellName).join(", ")}). Toute case voyant deux maillons de couleurs opposées ne peut être ni ${x} ni ${y} : ${remTxt}.`,
    };
  }
  const [a, b] = e.digits;
  return {
    title: "Duo caché", zone: unitLabel(e.unit), cells: involved,
    text: `Dans ${unitLabel(e.unit)}, les chiffres **${a}** et **${b}** n’apparaissent que dans ${cellName(e.cells[0])} et ${cellName(e.cells[1])}. Ces deux cases leur sont réservées : leurs autres candidats s’effacent (${remTxt}).`,
  };
}

/* ---------- Plan pédagogique pour une case ---------- */
function blockReason(grid, j, d, unit) {
  const r = rowOf(j), c = colOf(j);
  let k = ROWS[r].find((x) => grid[x] === d);
  if (k !== undefined) return `impossible, un ${d} occupe déjà sa ligne (${cellName(k)})`;
  k = COLS[c].find((x) => grid[x] === d);
  if (k !== undefined) return `impossible, un ${d} occupe déjà sa colonne (${cellName(k)})`;
  if (unit.type !== "box") {
    k = BOXES[boxOf(j)].find((x) => grid[x] === d);
    if (k !== undefined) return `impossible, un ${d} est déjà dans son bloc (${cellName(k)})`;
  }
  return `le ${d} y a été éliminé par les étapes ci-dessus`;
}
function finalizeNaked(grid, t, digit, chain, baseCands) {
  const r = rowOf(t) + 1, c = colOf(t) + 1, b = boxOf(t), name = cellName(t);
  const rowD = presentDigits(grid, ROWS[r - 1]);
  const colD = presentDigits(grid, COLS[c - 1]);
  const boxD = presentDigits(grid, BOXES[b]);
  const paras = [];
  paras.push(`**Technique : candidat unique** (naked single). On dresse l’inventaire de tout ce que la case ${name} « voit ».`);
  paras.push(`• Ligne ${r} : ${listD(rowD)}  ·  Colonne ${c} : ${listD(colD)}  ·  Bloc ${BOX_NAMES[b]} : ${listD(boxD)}`);
  if (chain.length) {
    const removed = baseCands.filter((d) => d !== digit);
    paras.push(`Avec la grille seule, les candidats de ${name} étaient {${listD(baseCands)}}. Les éliminations ci-dessus retirent ${listD(removed)}.`);
  }
  paras.push(`Tous les autres chiffres étant exclus, il ne reste que le **${digit}** → **${name} = ${digit}**.`);
  const hint1 = chain.length
    ? `La case ${name} résiste au comptage simple. Cherche d’abord une **${chain[0].title.toLowerCase()}** du côté de ${chain[0].zone} : elle éliminera des candidats utiles.`
    : `Isole la case ${name} : parcours sa ligne, sa colonne et son bloc, et barre mentalement chaque chiffre déjà posé. Compte ce qui survit…`;
  const hint2 = chain.length
    ? `${chain[0].text} — Maintenant, refais l’inventaire des candidats de ${name} : il n’en reste presque plus.`
    : `Sa ligne écarte déjà {${listD(rowD)}} et sa colonne {${listD(colD)}}. Ajoute les chiffres du bloc… un seul survivant.`;
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `Candidat unique${chain.length ? " (après éliminations)" : ""}`,
    unitCells: [...ROWS[r - 1], ...COLS[c - 1], ...BOXES[b]],
  };
}
function finalizeHidden(grid, t, digit, unit, chain) {
  const name = cellName(t), uL = unitLabel(unit);
  const filled = [], free = [];
  for (const j of unit.cells) {
    if (j === t) continue;
    if (grid[j] !== 0) filled.push(`${cellName(j)}=${grid[j]}`);
    else free.push(`• ${cellName(j)} : ${blockReason(grid, j, digit, unit)}`);
  }
  const paras = [];
  paras.push(`**Technique : single caché** (hidden single). Question : où peut aller le **${digit}** dans ${uL} ?`);
  if (filled.length) paras.push(`Cases déjà occupées : ${filled.join(", ")}.`);
  if (free.length) {
    paras.push(`Cases libres restantes — pourquoi le ${digit} y est impossible :`);
    paras.push(...free);
  }
  paras.push(`Une seule case de ${uL} peut encore accueillir le ${digit} → **${name} = ${digit}**.`);
  const hint1 = `Ne fixe pas la case toute seule : élargis le regard à **${uL}** en entier. Un chiffre n’y a plus qu’une seule place possible — repère-le en balayant les chiffres déjà posés dans les lignes et colonnes qui traversent cette zone.`;
  const hint2 = `Le chiffre à placer est le **${digit}**. Passe en revue chaque case libre de ${uL} : toutes sauf une « voient » déjà un ${digit} (même ligne, même colonne ou même bloc).`;
  const typeFr = unit.type === "box" ? "bloc" : unit.type === "row" ? "ligne" : "colonne";
  return {
    kind: "ok", target: t, digit, chain, hint1, hint2, paras,
    tech: `Single caché (${typeFr})${chain.length ? " + éliminations" : ""}`,
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
    else if (e.kind === "hiddenPair") e.unit.cells.forEach((c) => { addNeed(c, e.digits[0]); addNeed(c, e.digits[1]); });
    else if (e.kind === "skyscraper") {
      lineThrough(e.base[0], e.roof[0]).forEach((c) => addNeed(c, e.digit));
      lineThrough(e.base[1], e.roof[1]).forEach((c) => addNeed(c, e.digit));
    }
    else if (e.kind === "xWing" || e.kind === "swordfish") {
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
    else (e.cells || []).forEach((c) => addNeed(c, 0)); // nakedPair, xyWing, xyzWing, remotePair…
  }
  return kept;
}

/* ---------- Difficulté : base (type de conclusion) + poids des étapes élaguées ---------- */
const ELIM_WEIGHTS = {
  pointing: 2, claiming: 2, nakedPair: 3, hiddenPair: 4,
  xWing: 5, skyscraper: 6, xyWing: 6, swordfish: 6,
  xyzWing: 6, wWing: 6, kite: 7, emptyRectangle: 7, remotePair: 7,
};
const planDifficulty = (base, kept) =>
  base + kept.reduce((s, e) => s + (ELIM_WEIGHTS[e.kind] || 5), 0);

export function buildPlan(grid, target) {
  if (grid[target] !== 0) return null;
  const baseCands = candidatesFromGrid(grid, target);
  const cands = allCands(grid);
  const prefer = new Set([...PEERS[target], target]);
  const chain = [];
  for (let k = 0; k < 8; k++) {
    const cs = [...cands[target]];
    if (cs.length === 1) {
      const kept = pruneChain(grid, chain, { type: "naked", target, digit: cs[0], baseCands });
      const plan = finalizeNaked(grid, target, cs[0], kept.map(describeElim), baseCands);
      plan.rawChain = kept;
      plan.difficulty = planDifficulty(1, kept);
      return plan;
    }
    const hs = findHiddenSingleFor(grid, cands, target);
    if (hs) {
      const kept = pruneChain(grid, chain, { type: "hidden", target, digit: hs.digit, unit: hs.unit });
      const plan = finalizeHidden(grid, target, hs.digit, hs.unit, kept.map(describeElim));
      plan.rawChain = kept;
      plan.difficulty = planDifficulty(2, kept);
      return plan;
    }
    if (chain.length >= 4) return null;
    const e = findElim(cands, prefer) || findElim(cands, null);
    if (!e) return null;
    applyElim(cands, e);
    chain.push(e); // objets bruts — describeElim n'est appelé qu'après élagage
  }
  return null;
}
