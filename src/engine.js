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
const UNITS = [
  ...ROWS.map((cells, i) => ({ type: "row", index: i, cells })),
  ...COLS.map((cells, i) => ({ type: "col", index: i, cells })),
  ...BOXES.map((cells, i) => ({ type: "box", index: i, cells })),
];
export const PEERS = Array.from({ length: 81 }, (_, i) => {
  const s = new Set();
  for (const u of UNITS) if (u.cells.includes(i)) u.cells.forEach((j) => { if (j !== i) s.add(j); });
  return s;
});
const BOX_NAMES = [
  "haut-gauche", "haut-centre", "haut-droit",
  "milieu-gauche", "central", "milieu-droit",
  "bas-gauche", "bas-centre", "bas-droit",
];

export const rowOf = (i) => Math.floor(i / 9);
export const colOf = (i) => i % 9;
const boxOf = (i) => Math.floor(rowOf(i) / 3) * 3 + Math.floor(colOf(i) / 3);
export const cellName = (i) => `L${rowOf(i) + 1}C${colOf(i) + 1}`;
function unitLabel(u) {
  if (u.type === "row") return `la ligne ${u.index + 1}`;
  if (u.type === "col") return `la colonne ${u.index + 1}`;
  return `le bloc ${BOX_NAMES[u.index]}`;
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

// ⚠️ L'ordre est un contrat : ordre pédagogique de findElim, ET source de
// l'ordre intra-palier de FINDERS_BY_TIER (gradation → déterminisme des seeds
// de génération). Ne pas réordonner.
const ELIM_FINDERS = [
  [findNakedPairE, "nakedPair"], [findPointingE, "pointing"],
  [findClaimingE, "claiming"], [findHiddenPairE, "hiddenPair"],
  [findXWingE, "xWing"], [findXYWingE, "xyWing"],
  [findXYZWingE, "xyzWing"], [findWWingE, "wWing"],
  [findSwordfishE, "swordfish"], [findKiteE, "kite"],
  [findSkyscraperE, "skyscraper"], [findEmptyRectangleE, "emptyRectangle"],
  [findRemotePairE, "remotePair"], [findColoringE, "coloring"],
  [findSueDeCoqE, "sueDeCoq"],
];
// Accès par kind (tests et UI) : les finders de base ne sont pas exportés un à un.
export const ELIM_FINDER_BY_KIND = Object.fromEntries(
  ELIM_FINDERS.map(([f, kind]) => [kind, f])
);
const findElim = (cands, prefer, maxTier = 5) => {
  for (const [f, kind] of ELIM_FINDERS) {
    if (TIER_OF_KIND[kind] > maxTier) continue;
    const e = f(cands, prefer);
    if (e) return e;
  }
  return null;
};
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
      text: `Le pivot **${cellName(e.pivot)}** {${e.x}, ${e.y}} est relié aux pinces **${cellName(e.pincers[0])}** {${e.x}, ${e.c}} et **${cellName(e.pincers[1])}** {${e.y}, ${e.c}}. Si le pivot vaut ${e.x} → ${cellName(e.pincers[0])} = ${e.c} ; s’il vaut ${e.y} → ${cellName(e.pincers[1])} = ${e.c}. Dans les deux cas, un **${e.c}** apparaît dans l’une des pinces → toute case voyant les deux pinces le perd : ${remTxt}.`,
    };
  }
  if (e.kind === "xyzWing") {
    return {
      title: "XYZ-Wing", zone: `le pivot ${cellName(e.pivot)}`, cells: involved,
      text: `Le pivot **${cellName(e.pivot)}** {${e.x}, ${e.y}, ${e.z}} est relié aux pinces **${cellName(e.pincers[0])}** {${e.x}, ${e.z}} et **${cellName(e.pincers[1])}** {${e.y}, ${e.z}}. Si le pivot vaut ${e.x} → ${cellName(e.pincers[0])} = ${e.z} ; s’il vaut ${e.y} → ${cellName(e.pincers[1])} = ${e.z} ; s’il vaut ${e.z}, il est lui-même le ${e.z}. Dans les trois cas, un **${e.z}** apparaît dans le trio → seules les cases voyant **les trois** le perdent : ${remTxt}.`,
    };
  }
  if (e.kind === "wWing") {
    const [A, B] = e.bivalues, [e1, e2] = e.link;
    return {
      title: "W-Wing", zone: `la paire {${e.a}, ${e.b}}`, cells: involved,
      text: `**${cellName(A)}** et **${cellName(B)}** portent la même paire {${e.a}, ${e.b}} sans se voir. Dans ${unitLabel(e.linkUnit)}, le **${e.b}** n’a que deux places : ${cellName(e1)} (qui voit ${cellName(A)}) et ${cellName(e2)} (qui voit ${cellName(B)}) — l’une des deux est forcément un ${e.b}. Si ${cellName(e1)} = ${e.b} → ${cellName(A)} = ${e.a} ; si ${cellName(e2)} = ${e.b} → ${cellName(B)} = ${e.a}. Dans tous les cas, un **${e.a}** apparaît → toute case voyant ${cellName(A)} et ${cellName(B)} perd le ${e.a} : ${remTxt}.`,
    };
  }
  if (e.kind === "kite") {
    return {
      title: "2-String Kite", zone: `le ${e.digit}`, cells: involved,
      text: `Le **${e.digit}** n’a que deux places sur la ligne ${e.row + 1} et deux sur la colonne ${e.col + 1}, dont ${e.blockPair.map(cellName).join(" et ")} dans le même bloc : elles ne peuvent pas porter le ${e.digit} toutes les deux → l’une des extrémités libres (${e.ends.map(cellName).join(", ")}) le porte forcément. Toute case voyant ces deux extrémités perd le ${e.digit} : ${remTxt}.`,
    };
  }
  if (e.kind === "emptyRectangle") {
    const t = e.removals[0].cell, [X, Y] = e.link;
    const row = e.linkLine.type === "row";
    const shareTxt = row ? "même colonne" : "même ligne";
    const erLineX = row ? `la colonne ${e.erCol + 1}` : `la ligne ${e.erRow + 1}`;
    const erLineT = row ? `la ligne ${e.erRow + 1}` : `la colonne ${e.erCol + 1}`;
    return {
      title: "Empty Rectangle", zone: `le bloc ${BOX_NAMES[e.box]}`, cells: involved,
      text: `Sur ${unitLabel(e.linkLine)}, le **${e.digit}** n’a que deux places : ${cellName(X)} et ${cellName(Y)}. Dans le bloc **${BOX_NAMES[e.box]}**, tous les **${e.digit}** tiennent dans la ligne ${e.erRow + 1} et la colonne ${e.erCol + 1} — le reste du rectangle est vide. Si ${cellName(t)} était un ${e.digit}, ${cellName(Y)} perdrait le sien (${shareTxt}) → ${cellName(X)} = ${e.digit} → ${erLineX} se viderait, et ${cellName(t)} viderait lui-même ${erLineT} : le bloc n’aurait plus aucune place pour le ${e.digit} → ${remTxt}.`,
    };
  }
  if (e.kind === "coloring") {
    const chainTxt = e.chainCells.map(cellName).join(", ");
    if (e.rule === 2) {
      return {
        title: "Coloriage", zone: `le ${e.digit}`, cells: involved,
        text: `En suivant les liens conjugués du **${e.digit}** (${chainTxt}), on colorie les cases en deux couleurs alternées : l’une est entièrement vraie, l’autre entièrement fausse. Or ${e.wrap.map(cellName).join(" et ")} partagent ${unitLabel(e.wrapUnit)} avec la même couleur : cette couleur est fausse partout → ${remTxt}.`,
      };
    }
    return {
      title: "Coloriage", zone: `le ${e.digit}`, cells: involved,
      text: `En suivant les liens conjugués du **${e.digit}** (${chainTxt}), on colorie les cases en deux couleurs alternées — l’une des deux est forcément vraie. Toute case extérieure voyant les deux couleurs ne peut donc pas porter le ${e.digit} : ${remTxt}.`,
    };
  }
  if (e.kind === "sueDeCoq") {
    return {
      title: "Sue de Coq", zone: unitLabel(e.line), cells: involved,
      text: `**${e.inter.map(cellName).join("** et **")}** (intersection de ${unitLabel(e.line)} et du bloc ${BOX_NAMES[e.box]}) puisent dans le pool {${listD(e.S)}}. **${cellName(e.lineBi)}** {${listD(e.pairLine)}} réserve sa paire côté ligne, **${cellName(e.boxBi)}** {${listD(e.pairBox)}} la sienne côté bloc : chaque chiffre du pool a sa place → on retire {${listD(e.pairLine)}} du reste de ${unitLabel(e.line)} et {${listD(e.pairBox)}} du reste du bloc : ${remTxt}.`,
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
  const hint1 = `Ne fixe pas la case toute seule : élargis le regard ${unit.type === "box" ? "au" : "à la"} **${uL.replace(/^le |^la /, "")}** en entier. Un chiffre n’y a plus qu’une seule place possible — repère-le en balayant les chiffres déjà posés dans les lignes et colonnes qui traversent cette zone.`;
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
    else if (e.kind === "coloring") {
      e.linkUnits.forEach((u) => u.cells.forEach((c) => addNeed(c, e.digit)));
    }
    else (e.cells || []).forEach((c) => addNeed(c, 0)); // nakedPair, xyWing, xyzWing, sueDeCoq, remotePair…
  }
  return kept;
}

/* ---------- Difficulté : base (type de conclusion) + poids des étapes élaguées ---------- */
const ELIM_WEIGHTS = {
  pointing: 2, claiming: 2, nakedPair: 3, hiddenPair: 4,
  xWing: 5, skyscraper: 6, xyWing: 6, swordfish: 6,
  xyzWing: 6, wWing: 6, kite: 7, emptyRectangle: 7, remotePair: 7,
  coloring: 8, sueDeCoq: 8,
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

export function buildPlan(grid, target) {
  if (grid[target] !== 0) return null;
  const baseCands = candidatesFromGrid(grid, target);
  const prefer = new Set([...PEERS[target], target]);
  // Recherche par paliers : une preuve SIMPLE vaut mieux qu'une preuve COURTE.
  // On retente la recherche complète avec un plafond de technique croissant ;
  // la première preuve aboutie est donc celle du palier minimal nécessaire.
  for (const maxTier of [2, 3, 4, 5]) {
    const cands = allCands(grid);
    const chain = [];
    // MAX_CHAIN+1 itérations : la dernière teste le single créé par la 8e élim.
    for (let k = 0; k <= MAX_CHAIN; k++) {
      const cs = [...cands[target]];
      if (cs.length === 1) {
        const kept = pruneChain(grid, chain, { type: "naked", target, digit: cs[0], baseCands });
        const plan = finalizeNaked(grid, target, cs[0], kept.map(describeElim), baseCands);
        plan.rawChain = kept;
        plan.difficulty = planDifficulty(1, kept);
        return tagPlan(plan, "nakedSingle", kept, null);
      }
      const hs = findHiddenSingleFor(grid, cands, target);
      if (hs) {
        const kept = pruneChain(grid, chain, { type: "hidden", target, digit: hs.digit, unit: hs.unit });
        const plan = finalizeHidden(grid, target, hs.digit, hs.unit, kept.map(describeElim));
        plan.rawChain = kept;
        plan.difficulty = planDifficulty(2, kept);
        return tagPlan(plan, "hiddenSingle", kept, unitLabel(hs.unit));
      }
      if (chain.length >= MAX_CHAIN) break; // palier suivant
      const e = findElim(cands, prefer, maxTier) || findElim(cands, null, maxTier);
      if (!e) break; // palier suivant
      applyElim(cands, e);
      chain.push(e); // objets bruts — describeElim n'est appelé qu'après élagage
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
   1 = singles · 2 = alignements · 3 = paires · 4 = poissons/ailes · 5 = coloriage/Sue de Coq */
const TIER_OF_KIND = {
  pointing: 2, claiming: 2, nakedPair: 3, hiddenPair: 3,
  xWing: 4, xyWing: 4, xyzWing: 4, wWing: 4, swordfish: 4,
  kite: 4, skyscraper: 4, emptyRectangle: 4, remotePair: 4,
  coloring: 5, sueDeCoq: 5,
};
// Dérivé de ELIM_FINDERS : mêmes finders, groupés par palier (l'ordre
// intra-palier suit l'ordre pédagogique — contrat de déterminisme, cf. supra).
const FINDERS_BY_TIER = [2, 3, 4, 5].map((t) =>
  ELIM_FINDERS.filter(([, kind]) => TIER_OF_KIND[kind] === t).map(([f]) => f)
);
// Contrairement à findElim (ordre pédagogique), la gradation cherche tier par
// tier ascendant : une grille « alignements » ne doit pas être gradée « paires »
// juste parce qu'une paire nue se présentait en premier.
function findElimTiered(cands, cap) {
  for (let t = 0; t < FINDERS_BY_TIER.length; t++) {
    if (t + 2 > cap) return null;
    for (const f of FINDERS_BY_TIER[t]) {
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
function solveHumanlySteps(grid, onStep, cap = 5) {
  const g = grid.slice();
  const cands = allCands(g); // persistants : les éliminations s'y accumulent
  const counts = {};
  let maxTier = 0;
  let elimRun = 0; // éliminations enchaînées depuis le dernier placement
  const place = (i, d) => {
    elimRun = 0;
    g[i] = d;
    cands[i] = new Set();
    PEERS[i].forEach((p) => cands[p].delete(d));
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
    if (elimRun >= MAX_CHAIN) return { solved: false, maxTier, counts };
    const e = findElimTiered(cands, cap);
    if (!e) return { solved: false, maxTier, counts };
    if (onStep && onStep({
      type: "elim", e,
      values: g.slice(),
      cands: cands.map((s) => [...s].sort((a, b) => a - b)),
    })) return { solved: false, aborted: true, maxTier, counts };
    applyElim(cands, e);
    elimRun++;
    counts[e.kind] = (counts[e.kind] || 0) + 1;
    maxTier = Math.max(maxTier, TIER_OF_KIND[e.kind]);
  }
  return { solved: false, maxTier, counts };
}
export const solveHumanly = (grid, cap = 5) => solveHumanlySteps(grid, null, cap);

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
      unit = [...e.unit.cells]; break;
    case "pointing": case "claiming":
      unit = [...BOXES[e.box], ...e.line.cells]; break;
    case "xWing": case "swordfish": {
      const cross = e.lineType === "row" ? COLS : ROWS;
      unit = e.cross.flatMap((c) => cross[c]); break;
    }
    case "kite":
      unit = [...ROWS[e.row], ...COLS[e.col]]; break;
    case "emptyRectangle":
      unit = [...BOXES[e.box], ...e.linkLine.cells]; break;
    case "wWing":
      unit = [...e.linkUnit.cells, ...e.cells]; break;
    case "sueDeCoq":
      unit = [...e.line.cells, ...BOXES[e.box]]; break;
    case "coloring":
      unit = e.linkUnits.flatMap((u) => u.cells); break;
    default: // skyscraper, xyWing, xyzWing, remotePair
      unit = [...e.cells, ...e.removals.map((r) => r.cell)];
  }
  return { unit, focus: [...e.cells] };
}

// « Regarde du côté de {zone} » avec la contraction française qui va bien.
function hintFromZone(e, zone) {
  // Pour les poissons, la zone (« 2 lignes ») est moins parlante que le chiffre.
  const z = e.kind === "xWing" || e.kind === "swordfish" ? `le ${e.digit}` : zone;
  const de = z.startsWith("le ") ? `du ${z.slice(3)}`
    : z.startsWith("les ") ? `des ${z.slice(4)}` : `de ${z}`;
  return `Regarde du côté ${de}.`;
}

// Emballe une élimination trouvée en exercice complet — notes, removals,
// surlignage, explication, indice et bonus — depuis des valeurs + candidats.
export function packageExercise(kind, e, values, candsArr) {
  const notes = {};
  for (let i = 0; i < 81; i++) {
    if (values[i] === 0 && candsArr[i].length) notes[i] = candsArr[i];
  }
  const removals = {};
  for (const r of e.removals) {
    removals[r.cell] = [...new Set([...(removals[r.cell] || []), ...r.digits])]
      .sort((a, b) => a - b);
  }
  const d = describeElim(e);
  const { unit, focus } = elimHighlight(e);
  const ex = {
    kind, given: values, notes, removals, unit, focus,
    explain: [d.text], hint: hintFromZone(e, d.zone),
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
const exerciseFromElim = (kind, step) => packageExercise(kind, step.e, step.values, step.cands);

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
function exerciseFromSingle(kind, g) {
  const cands = allCands(g);
  for (let t = 0; t < 81; t++) {
    if (g[t] !== 0) continue;
    if (kind === "nakedSingle") {
      if (cands[t].size !== 1) continue;
    } else {
      // Un vrai single caché : plusieurs candidats, mais une seule place pour lui.
      if (cands[t].size < 2 || !findHiddenSingleFor(g, cands, t)) continue;
    }
    const plan = buildPlan(g, t);
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
export function buildConstructiveExercise(kind, { budgetMs = 1500, rng = Math.random } = {}) {
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
    return packageExercise(kind, patternOk(g), g, cands.map((s) => [...s].sort((x, y) => x - y)));
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
export function findTechniqueExercise(kind, { timeBoxMs = 4000, rng = Math.random } = {}) {
  const deadline = Date.now() + timeBoxMs;
  const frac = RAW_FRACTION_BY_KIND[kind] !== undefined ? RAW_FRACTION_BY_KIND[kind] : 2 / 3;
  const rawDeadline = Date.now() + timeBoxMs * frac;
  const isSingle = kind === "nakedSingle" || kind === "hiddenSingle";
  let worked = null; // première capture travaillée, servie en repli
  while (Date.now() < deadline) {
    if (worked && Date.now() >= rawDeadline) return worked;
    const g = digUnguarded(generateFullGrid(rng), rng);
    if (isSingle) {
      const ex = exerciseFromSingle(kind, g);
      if (ex) return ex; // l'état initial est brut par construction
      continue;
    }
    let found = null;
    solveHumanlySteps(g, (step) => {
      if (step.type !== "elim" || step.e.kind !== kind) return false;
      if (isRawCapture(step)) { found = exerciseFromElim(kind, step); return true; }
      if (!worked) {
        worked = exerciseFromElim(kind, step);
        worked.workedNotes = true;
      }
      return true; // les élims s'accumulent : cette grille ne redeviendra pas brute
    });
    if (found) return found;
  }
  return worked;
}
