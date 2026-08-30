import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
  ROWS, COLS, BOXES, PEERS, rowOf, colOf, cellName,
  candidatesFromGrid, conflictSet, isComplete, solveGrid, buildPlan, SAMPLES,
  snyderNotes, generatePuzzle, completedUnits,
} from "./engine.js";
import { getExercise, KIND_BY_LESSON } from "./exercises.js";
import { LESSONS } from "./lessons.js";

/* ---------- Palette « papier quadrillé + surligneur » ---------- */
const C = {
  paper: "#F1F4F3", surface: "#FFFFFF", ink: "#1F272E",
  line: "#C9D1CE", teal: "#12766F", tealSoft: "#DDEFEC",
  blue: "#2B6CB0", blueSoft: "#E4ECF7",
  red: "#B3372E", redSoft: "#F9E3E1",
  yellow: "#F2C40F", yellowSoft: "#FFF3B8",
  gray: "#7C8894", givenBg: "#F6F8F7",
};
const NUMFONT = `'Avenir Next', 'Futura', 'Century Gothic', -apple-system, sans-serif`;
const DISPLAYFONT = `'Futura', 'Century Gothic', 'Trebuchet MS', sans-serif`;
const W = "min(94vw, 430px)";
const STORAGE_KEY = "sudoku-coach-v1";

/* ---------- Niveaux de difficulté (générateur) ---------- */
const LEVELS = {
  1: { name: "Facile", desc: "Candidats uniques et singles cachés" },
  2: { name: "Moyen", desc: "+ alignements (paires pointantes, réductions bloc/ligne)" },
  3: { name: "Difficile", desc: "+ paires nues et paires cachées" },
  4: { name: "Expert", desc: "+ X-Wing, XY-Wing, Skyscraper, Swordfish…" },
  5: { name: "Diabolique", desc: "Coloriage, Sue de Coq… voire au-delà du coach" },
};
const MAX_LEVEL = 5;

/* ---------- Petits composants UI ---------- */
function Rich({ text }) {
  const parts = String(text).split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? <strong key={i} style={{ color: C.ink }}>{p}</strong> : <span key={i}>{p}</span>
      )}
    </>
  );
}
function Btn({ children, onClick, variant = "ghost", disabled, active, grow, title }) {
  const base = {
    fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, padding: "10px 12px",
    borderRadius: 12, border: "1px solid", cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    flex: grow ? 1 : "none", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap",
    WebkitTapHighlightColor: "transparent", transition: "background .15s",
    minHeight: 44, touchAction: "manipulation",
  };
  const styles = {
    primary: { background: C.ink, color: "#fff", borderColor: C.ink },
    accent: { background: C.teal, color: "#fff", borderColor: C.teal },
    ghost: { background: "#fff", color: C.ink, borderColor: "#D8DEDC" },
  };
  const st = { ...base, ...styles[variant] };
  if (active) { st.background = C.teal; st.color = "#fff"; st.borderColor = C.teal; }
  return (
    <button type="button" title={title} disabled={disabled} onClick={onClick} style={st}>
      {children}
    </button>
  );
}
function LinkBtn({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", color: "#5A6763", textDecoration: "underline", fontSize: 12.5, cursor: "pointer", padding: "13px 8px", fontFamily: "inherit", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
      {children}
    </button>
  );
}
function Card({ emoji, title, sub, onClick, accent }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", textAlign: "left", background: "#fff", color: C.ink,
      border: `1px solid ${accent ? C.teal : "#E2E7E5"}`, borderRadius: 14,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
      cursor: "pointer", fontFamily: "inherit",
      boxShadow: accent ? `0 8px 24px rgba(18,118,111,0.16)` : "0 8px 24px rgba(31,39,46,0.08)",
      WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 15.5 }}>{title}</span>
        {sub ? <span style={{ fontSize: 12.5, color: "#5A6763", lineHeight: 1.4 }}>{sub}</span> : null}
      </span>
      <span style={{ marginLeft: "auto", color: C.gray, fontSize: 16 }}>›</span>
    </button>
  );
}

/* ================================================================
   Onglet APPRENDRE
   ================================================================ */
function LessonBoard({ lesson, revealed }) {
  const unitSet = useMemo(() => new Set(lesson.unit || []), [lesson]);
  const focusSet = useMemo(() => new Set(lesson.focus || []), [lesson]);
  const removals = lesson.removals || {};
  return (
    <div style={{
      width: W, aspectRatio: "1 / 1", display: "grid",
      gridTemplateColumns: "repeat(9, 1fr)", gridTemplateRows: "repeat(9, 1fr)",
      border: `2.5px solid ${C.ink}`, borderRadius: 10, overflow: "hidden",
      background: C.surface, boxShadow: "0 10px 30px rgba(31,39,46,0.10)",
      userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation",
    }}>
      {Array.from({ length: 81 }, (_, i) => {
        const r = rowOf(i), c = colOf(i);
        const st = {
          background: unitSet.has(i) ? C.yellowSoft : C.surface,
          position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
          borderRight: c === 8 ? "none" : c % 3 === 2 ? `2px solid ${C.ink}` : `1px solid ${C.line}`,
          borderBottom: r === 8 ? "none" : r % 3 === 2 ? `2px solid ${C.ink}` : `1px solid ${C.line}`,
        };
        if (focusSet.has(i)) st.boxShadow = `inset 0 0 0 2px ${C.yellow}`;
        if (i === lesson.target) st.boxShadow = `inset 0 0 0 3px ${revealed ? C.teal : C.yellow}`;
        const v = lesson.given[i];
        const nts = lesson.notes[i];
        return (
          <div key={i} style={st}>
            {v ? (
              <span style={{ fontSize: "min(6.2vw, 27px)", fontWeight: 700, fontFamily: NUMFONT, color: C.ink }}>{v}</span>
            ) : nts ? (
              <div style={{
                position: "absolute", inset: 2, display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)",
              }}>
                {Array.from({ length: 9 }, (_, k) => {
                  const d = k + 1;
                  if (!nts.includes(d)) return <div key={d} />;
                  const removed = revealed && removals[i] && removals[i].includes(d);
                  const isAns = revealed && i === lesson.target && d === lesson.answer;
                  return (
                    <div key={d} style={{
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "min(2.8vw, 11px)", lineHeight: 1, fontFamily: NUMFONT,
                      fontWeight: isAns ? 800 : 600,
                      color: removed ? C.red : isAns ? C.teal : C.gray,
                      textDecoration: removed ? "line-through" : "none",
                    }}>{d}</div>
                  );
                })}
              </div>
            ) : revealed && i === lesson.target ? (
              <span style={{ fontSize: "min(6.2vw, 27px)", fontWeight: 700, fontFamily: NUMFONT, color: C.teal }}>
                {lesson.answer}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
/* ----- Exercices : libellés FR et cache local ----- */
const EXO_NAME_BY_ID = {
  "naked-single": "le candidat unique", "hidden-single": "le single caché",
  "naked-pair": "la paire nue", "pointing-pair": "la paire pointante",
  "claiming": "la réduction bloc/ligne", "hidden-pair": "le duo caché",
  "x-wing": "le X-Wing", "xy-wing": "le XY-Wing", "swordfish": "le Swordfish",
  "skyscraper": "le Skyscraper", "remote-pairs": "les Remote Pairs",
  "xyz-wing": "le XYZ-Wing", "w-wing": "le W-Wing", "kite": "le 2-String Kite",
  "empty-rectangle": "l’Empty Rectangle", "coloring": "le coloriage",
  "sue-de-coq": "le Sue de Coq",
};
const EXO_CACHE_KEY = "sudoku-coach-exos-v2"; // v2 : + champs source/workedNotes
function loadExoCache() {
  try {
    const c = JSON.parse(localStorage.getItem(EXO_CACHE_KEY) || "{}");
    return c && typeof c === "object" ? c : {};
  } catch (e) { return {}; }
}
function saveExoCache(c) {
  try { localStorage.setItem(EXO_CACHE_KEY, JSON.stringify(c)); } catch (e) { /* best-effort */ }
}

function LearnView() {
  const [ix, setIx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [exo, setExo] = useState(null); // null | "searching" | exercice
  const refillRef = useRef(new Set()); // kinds en cours de refill (anti-cumul)
  const L = LESSONS[ix];
  const isExo = exo !== null && typeof exo === "object";
  useEffect(() => { setRevealed(false); setShowHint(false); setExo(null); }, [ix]);

  // Reremplit le cache en tranches courtes pour ne pas geler l'interface
  // pendant que l'utilisateur travaille l'exercice servi.
  function refillCache(kind) {
    if (refillRef.current.has(kind)) return;
    refillRef.current.add(kind);
    let budget = 3000;
    const tick = () => {
      const cache = loadExoCache();
      const list = cache[kind] || [];
      if (list.length >= 3 || budget <= 0) { refillRef.current.delete(kind); return; }
      budget -= 600;
      const ex = getExercise(kind, { budgetMs: 600 });
      if (ex) { list.push(ex); cache[kind] = list; saveExoCache(cache); }
      setTimeout(tick, 300);
    };
    setTimeout(tick, 600);
  }

  function newExercise() {
    const kind = KIND_BY_LESSON[L.id];
    setRevealed(false); setShowHint(false);
    const cache = loadExoCache();
    const list = cache[kind] || [];
    if (list.length) {
      const ex = list.shift();
      cache[kind] = list;
      saveExoCache(cache);
      setExo(ex);
      refillCache(kind);
      return;
    }
    setExo("searching");
    // setTimeout : laisse React peindre l'overlay avant la recherche synchrone.
    setTimeout(() => {
      const ex = getExercise(kind); // jamais null : repli transformation
      setRevealed(false); setShowHint(false);
      setExo(ex);
      if (ex) refillCache(kind);
    }, 50);
  }
  function backToGuided() { setExo(null); setRevealed(false); setShowHint(false); }

  const board = isExo
    ? (revealed ? exo : { ...exo, unit: [], focus: [], target: undefined })
    : L;
  const question = isExo ? `Trouve ${EXO_NAME_BY_ID[L.id]} sur cette grille.` : L.question;
  const hint = isExo ? exo.hint : L.hint;
  return (
    <>
      <div style={{ width: W, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
        {LESSONS.map((l, i) => {
          const newSection = i === 0 || LESSONS[i - 1].level !== l.level;
          const sectionLabel =
            l.level === "advanced" ? "Avancé" :
            l.level === "intermediate" ? "Intermédiaire" : "Classiques";
          return (
            <Fragment key={l.id}>
              {newSection && (
                <span style={{
                  flex: "0 0 auto", fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  textTransform: "uppercase", color: C.gray, whiteSpace: "nowrap",
                  padding: i === 0 ? "0 2px" : "0 4px 0 8px",
                  borderLeft: i === 0 ? "none" : "1px solid #E2E7E5",
                }}>{sectionLabel}</span>
              )}
              <button type="button" onClick={() => setIx(i)} style={{
                flex: "0 0 auto", border: `1px solid ${i === ix ? C.teal : "#D8DEDC"}`,
                background: i === ix ? C.teal : "#fff", color: i === ix ? "#fff" : C.ink,
                borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                minHeight: 44, touchAction: "manipulation",
              }}>
                {l.num} · {l.title}
              </button>
            </Fragment>
          );
        })}
      </div>

      <div style={{
        width: W, background: "#fff", border: "1px solid #E2E7E5", borderRadius: 14,
        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{L.title}</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: "#3C464D" }}>{L.concept}</p>
      </div>

      <div style={{ position: "relative" }}>
        <LessonBoard lesson={board} revealed={revealed} />
        {exo === "searching" && (
          <div style={{
            position: "absolute", inset: 0, background: "rgba(241,244,243,0.85)",
            borderRadius: 10, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5,
          }}>
            <div style={{
              width: 34, height: 34, border: "3px solid #C9D1CE", borderTopColor: C.teal,
              borderRadius: "50%", animation: "scspin .9s linear infinite",
            }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: "#2B4A44" }}>Recherche d’un exemple…</div>
          </div>
        )}
      </div>
      {Object.keys(board.notes || {}).length > 0 && (
        <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
          Petits chiffres = tous les candidats encore possibles de la case.
        </div>
      )}
      {isExo && (
        <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
          {exo.source === "transform" ? "Position d’entraînement." : "Grille réelle."}
          {exo.workedNotes
            ? " Partie en cours : ces notes ont déjà été affinées par des techniques précédentes."
            : ""}
        </div>
      )}

      <div style={{
        width: W, background: "#fff", border: "1px solid #E2E7E5",
        borderTop: `5px solid ${C.yellow}`, borderRadius: 14, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 9,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>🎓 {question}</div>
        {showHint && !revealed && (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#5A6763" }}>💡 <Rich text={hint} /></p>
        )}
        {revealed && !isExo && (
          <>
            {L.steps.map((s, i) => (
              <div key={i} style={{
                border: "1px solid #EBDB9B", background: "#FFFBEA",
                borderRadius: 10, padding: "8px 10px", fontSize: 13.5, lineHeight: 1.5,
              }}>
                <Rich text={s} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: C.ink, color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800, fontFamily: NUMFONT,
              }}>{L.answer}</div>
              <div style={{ fontSize: 13, color: C.gray }}>
                en <strong style={{ color: C.ink }}>{cellName(L.target)}</strong>
              </div>
            </div>
          </>
        )}
        {revealed && isExo && (
          <>
            {exo.explain.map((s, i) => (
              <div key={i} style={{
                border: "1px solid #EBDB9B", background: "#FFFBEA",
                borderRadius: 10, padding: "8px 10px", fontSize: 13.5, lineHeight: 1.5,
              }}>
                <Rich text={s} />
              </div>
            ))}
            {exo.target != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: C.ink, color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, fontFamily: NUMFONT,
                }}>{exo.answer}</div>
                <div style={{ fontSize: 13, color: C.gray }}>
                  en <strong style={{ color: C.ink }}>{cellName(exo.target)}</strong>
                  {Object.keys(exo.removals).length ? " — l’élimination y laisse un candidat unique" : ""}
                </div>
              </div>
            )}
            {exo.source !== "transform" && (
              <div style={{ fontSize: 11.5, color: C.gray }}>
                Sur une grille réelle, le motif peut apparaître à plusieurs endroits — en voici un.
              </div>
            )}
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          {!revealed && <Btn grow onClick={() => setShowHint(true)} disabled={showHint || exo === "searching"}>💡 Indice</Btn>}
          {!revealed && <Btn variant="accent" grow onClick={() => setRevealed(true)} disabled={exo === "searching"}>Voir la solution</Btn>}
          {revealed && <Btn grow onClick={() => { setRevealed(false); setShowHint(false); }}>Masquer</Btn>}
          {revealed && !isExo && ix < LESSONS.length - 1 && (
            <Btn variant="primary" grow onClick={() => setIx(ix + 1)}>Technique suivante →</Btn>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn grow onClick={newExercise} disabled={exo === "searching"}>
            🎲 Nouvel exemple
          </Btn>
        </div>
      </div>
      {isExo && <LinkBtn onClick={backToGuided}>← Revenir à l’exemple guidé</LinkBtn>}
      <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
        Ces techniques sont exactement celles utilisées par le coach dans l’onglet Jouer.
      </div>
    </>
  );
}

/* ================================================================
   Onglet JOUER
   ================================================================ */
export default function App() {
  const [tab, setTab] = useState("play");
  const [screen, setScreen] = useState("home"); // 'home' | 'levels' | 'board'
  const [grid, setGrid] = useState(Array(81).fill(0));
  const [givens, setGivens] = useState(Array(81).fill(false));
  const [notes, setNotes] = useState(Array.from({ length: 81 }, () => []));
  const [phase, setPhase] = useState("edit"); // 'edit' | 'play'
  const [gameLevel, setGameLevel] = useState(null); // 1-4 (grille générée) | null (scan/manuel)
  const [generating, setGenerating] = useState(false);
  const [sel, setSel] = useState(null);
  const [noteMode, setNoteMode] = useState(false);
  const [plan, setPlan] = useState(null);
  const [level, setLevel] = useState(0); // 0 indice1, 1 indice2, 2 solution
  const [msg, setMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [solRef, setSolRef] = useState(null);
  const [errorCells, setErrorCells] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  /* Animations (T3) — stamps pour rejouer les keyframes via un changement de key */
  const [pop, setPop] = useState(null); // {cell, stamp} : chiffre qui vient d'être posé
  const [sweep, setSweep] = useState(null); // {delays: Map(cell→ms), stamp} : zone complétée
  const [padPulse, setPadPulse] = useState(null); // {digit, stamp} : chiffre épuisé
  const [celebrate, setCelebrate] = useState(null); // stamp : grille terminée
  const [shake, setShake] = useState(null); // {cells: Set, stamp} : erreurs / conflits

  const histRef = useRef([]);
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  const msgTimer = useRef(null);
  const errTimer = useRef(null);
  const sampleIx = useRef(0);
  const sweepTimer = useRef(null);
  const celebTimer = useRef(null);

  /* ----- déclencheurs d'animations (appelés aux sites de pose uniquement) ----- */
  const popCell = (cell) => setPop({ cell, stamp: Date.now() });
  const doShake = (cells) => setShake({ cells: new Set(cells), stamp: Date.now() });
  function animateMove(before, ng, d) {
    if (ng.filter((v) => v === d).length === 9) setPadPulse({ digit: d, stamp: Date.now() });
    if (isComplete(ng)) {
      setCelebrate(Date.now());
      if (celebTimer.current) clearTimeout(celebTimer.current);
      celebTimer.current = setTimeout(() => setCelebrate(null), 1700);
      return;
    }
    const units = completedUnits(before, ng);
    if (!units.length) return;
    const delays = new Map();
    for (const u of units) {
      u.cells.forEach((c, k) => {
        const ms = k * 40;
        if (!delays.has(c) || ms < delays.get(c)) delays.set(c, ms);
      });
    }
    setSweep({ delays, stamp: Date.now() });
    if (sweepTimer.current) clearTimeout(sweepTimer.current);
    sweepTimer.current = setTimeout(() => setSweep(null), 9 * 40 + 700);
  }

  /* ----- messages ----- */
  function flash(text, type) {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMsg({ text, type: type || "info" });
    msgTimer.current = setTimeout(() => setMsg(null), 4600);
  }

  /* ----- historique ----- */
  function pushHist() {
    histRef.current.push({ grid: grid.slice(), notes: notes.map((a) => a.slice()) });
    if (histRef.current.length > 60) histRef.current.shift();
  }
  function undo() {
    const h = histRef.current.pop();
    if (!h) { flash("Rien à annuler."); return; }
    setGrid(h.grid); setNotes(h.notes); setPlan(null);
  }

  /* ----- surlignage transitoire des erreurs (bouton Vérifier) ----- */
  function clearErrors() {
    if (errTimer.current) clearTimeout(errTimer.current);
    setErrorCells((s) => (s.size ? new Set() : s));
  }
  function showErrors(cells) {
    if (errTimer.current) clearTimeout(errTimer.current);
    setErrorCells(new Set(cells));
    doShake(cells);
    errTimer.current = setTimeout(() => setErrorCells(new Set()), 4000);
  }

  /* ----- saisie ----- */
  function padPress(d) {
    clearErrors();
    if (sel === null) { flash("Touche d’abord une case de la grille."); return; }
    if (phase === "edit") {
      pushHist();
      const ng = grid.slice();
      ng[sel] = ng[sel] === d ? 0 : d;
      setGrid(ng);
      if (ng[sel] !== 0) popCell(sel);
      return;
    }
    if (givens[sel]) { flash("Cette case fait partie de l’énoncé.", "warn"); return; }
    if (noteMode) {
      if (grid[sel] !== 0) { flash("Efface d’abord le chiffre pour annoter."); return; }
      pushHist();
      const nn = notes.map((a) => a.slice());
      const ixx = nn[sel].indexOf(d);
      if (ixx >= 0) nn[sel].splice(ixx, 1);
      else { nn[sel].push(d); nn[sel].sort((a, b) => a - b); }
      setNotes(nn);
      return;
    }
    pushHist();
    const ng = grid.slice();
    const nn = notes.map((a) => a.slice());
    if (ng[sel] === d) { ng[sel] = 0; }
    else {
      ng[sel] = d; nn[sel] = [];
      PEERS[sel].forEach((p) => {
        const k = nn[p].indexOf(d);
        if (k >= 0) nn[p].splice(k, 1);
      });
    }
    setGrid(ng); setNotes(nn);
    if (plan && plan.target === sel) setPlan(null);
    if (ng[sel] !== 0) { popCell(sel); animateMove(grid, ng, d); }
    const conf = conflictSet(ng);
    if (ng[sel] !== 0 && conf.has(sel)) {
      doShake([...conf]);
      flash("⚠️ Ce chiffre entre en conflit avec sa ligne, sa colonne ou son bloc.", "warn");
    }
    else if (isComplete(ng)) flash("🎉 Grille terminée — bravo !", "success");
  }
  function eraseSel() {
    clearErrors();
    if (sel === null) { flash("Touche d’abord une case."); return; }
    if (phase === "play" && givens[sel]) { flash("Cette case fait partie de l’énoncé.", "warn"); return; }
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[sel] = 0; nn[sel] = [];
    setGrid(ng); setNotes(nn);
  }

  /* ----- cycle de vie de la grille ----- */
  function newGame(lvl) {
    setScreen("board"); setGenerating(true);
    setPlan(null); setSel(null); setNoteMode(false); clearErrors();
    // setTimeout : laisse React peindre l'overlay avant l'appel synchrone.
    setTimeout(() => {
      try {
        const p = generatePuzzle(lvl);
        const g = p.grid.split("").map(Number);
        setGrid(g);
        setGivens(g.map((v) => v !== 0));
        setNotes(Array.from({ length: 81 }, () => []));
        setSolRef(p.solution.split("").map(Number));
        setPhase("play");
        setGameLevel(p.level);
        histRef.current = [];
        if (p.level === lvl) flash(`🎲 Grille ${LEVELS[p.level].name} — à toi de jouer ✏️`, "success");
        else flash(`Le niveau ${LEVELS[lvl].name} n'est pas sorti cette fois — voici une grille ${LEVELS[p.level].name}.`, "warn");
      } finally {
        setGenerating(false);
      }
    }, 50);
  }
  function startPlay() {
    const filled = grid.filter((v) => v).length;
    if (filled < 8) { flash("Ajoute d’abord les chiffres de départ (ou charge un exemple).", "warn"); return; }
    if (conflictSet(grid).size) { flash("Un chiffre apparaît deux fois dans une zone — corrige avant de commencer.", "warn"); return; }
    const { count, solution } = solveGrid(grid);
    if (count === 0 || !solution) { flash("Aucune solution possible : vérifie la saisie.", "warn"); return; }
    setSolRef(solution);
    setGivens(grid.map((v) => v !== 0));
    setPhase("play");
    setGameLevel(null);
    histRef.current = [];
    setPlan(null); setNoteMode(false);
    if (count > 1) flash("⚠️ Cette grille a plusieurs solutions — les déductions logiques seront limitées.", "warn");
    else flash("Grille verrouillée — à toi de jouer ✏️", "success");
  }
  function backToEdit() {
    setPhase("edit"); setGivens(Array(81).fill(false));
    setSolRef(null); setPlan(null); setNoteMode(false); setGameLevel(null);
    flash("Mode saisie : modifie librement, puis « Commencer ».");
  }
  function clearAll() {
    pushHist();
    setGrid(Array(81).fill(0));
    setNotes(Array.from({ length: 81 }, () => []));
    setGivens(Array(81).fill(false));
    setPhase("edit"); setSolRef(null); setPlan(null); setSel(null); setGameLevel(null);
  }
  function restartPuzzle() {
    pushHist();
    setGrid(grid.map((v, i) => (givens[i] ? v : 0)));
    setNotes(Array.from({ length: 81 }, () => []));
    setPlan(null);
    flash("Grille réinitialisée à l’énoncé.");
  }
  function loadSample() {
    const s = SAMPLES[sampleIx.current % SAMPLES.length];
    sampleIx.current++;
    pushHist();
    setGrid(s.split("").map(Number));
    setNotes(Array.from({ length: 81 }, () => []));
    setGivens(Array(81).fill(false));
    setPhase("edit"); setSolRef(null); setPlan(null); setSel(null);
    flash("Exemple chargé — vérifie puis « Commencer ».");
  }

  /* ----- solve complet ----- */
  function solveAll() {
    const baseGrid = phase === "play" ? grid.map((v, i) => (givens[i] ? v : 0)) : grid;
    const { solution } = solveGrid(baseGrid);
    if (!solution) { flash("Grille insoluble — corrige la saisie.", "warn"); return; }
    pushHist();
    let wrong = 0;
    if (phase === "play") grid.forEach((v, i) => { if (v && !givens[i] && v !== solution[i]) wrong++; });
    setGrid(solution);
    setNotes(Array.from({ length: 81 }, () => []));
    setPlan(null);
    flash(wrong ? `Résolu ✓ — ${wrong} de tes chiffres ${wrong > 1 ? "ont été corrigés" : "a été corrigé"}.` : "Résolu ✓", "success");
  }

  /* ----- coach : case précise / aléatoire ----- */
  function hintForCell() {
    if (phase !== "play") { flash("Appuie d’abord sur « Commencer » pour verrouiller la grille."); return; }
    if (sel === null) { flash("Sélectionne une case vide, puis retouche 🎯."); return; }
    const t = sel;
    if (grid[t] !== 0) {
      if (givens[t]) flash(`${cellName(t)} fait partie de l’énoncé.`);
      else if (solRef) flash(
        grid[t] === solRef[t] ? `✓ ${cellName(t)} = ${grid[t]} est correct.` : `✗ Le ${grid[t]} en ${cellName(t)} n’est pas le bon chiffre ici.`,
        grid[t] === solRef[t] ? "success" : "warn"
      );
      else flash(`${cellName(t)} contient déjà un chiffre.`);
      return;
    }
    const p = buildPlan(grid, t);
    if (p && (!solRef || p.digit === solRef[t])) { setPlan(p); setLevel(0); }
    else { setPlan({ kind: "stuck", target: t }); setLevel(0); }
  }
  function randomHint() {
    if (phase !== "play") { flash("Appuie d’abord sur « Commencer » pour verrouiller la grille."); return; }
    const empties = [];
    grid.forEach((v, i) => { if (!v) empties.push(i); });
    if (!empties.length) { flash("La grille est déjà complète 🎉", "success"); return; }
    const plans = [];
    for (const i of empties) {
      const p = buildPlan(grid, i);
      if (p && (!solRef || p.digit === solRef[i])) plans.push(p);
    }
    if (!plans.length) { setPlan({ kind: "stuckAll" }); setLevel(0); return; }
    const min = Math.min(...plans.map((p) => p.difficulty));
    const easiest = plans.filter((p) => p.difficulty === min);
    const p = easiest[Math.floor(Math.random() * easiest.length)];
    setSel(p.target); setPlan(p); setLevel(0);
  }
  function revealAnyway(t) {
    if (!solRef) { flash("Solution indisponible pour cette grille.", "warn"); return; }
    const d = solRef[t];
    setPlan({
      kind: "ok", target: t, digit: d, chain: [], hint1: "", hint2: "",
      tech: "Au-delà des techniques classiques",
      paras: [
        `Aucune des techniques enseignées ici (candidat unique, single caché, paires, alignements, X-Wing, XY-Wing, XYZ-Wing, W-Wing, Swordfish, 2-String Kite, Skyscraper, Empty Rectangle, Remote Pairs, coloriage, Sue de Coq) ne permet de déduire **${cellName(t)}** dans la position actuelle.`,
        `La valeur vient de la résolution complète : **${cellName(t)} = ${d}**.`,
        `Conseil : avance pas à pas (bouton 👣 Étape suivante) — celle-ci se débloquera naturellement en chemin.`,
      ],
      unitCells: [],
    });
    setLevel(2);
  }
  function placeFromPlan() {
    if (!plan || plan.kind !== "ok" || plan.target == null) return;
    const t = plan.target, d = plan.digit;
    if (grid[t] !== 0) { setPlan(null); return; }
    clearErrors();
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[t] = d; nn[t] = [];
    PEERS[t].forEach((p) => {
      const k = nn[p].indexOf(d);
      if (k >= 0) nn[p].splice(k, 1);
    });
    setGrid(ng); setNotes(nn); setSel(t); setPlan(null);
    popCell(t); animateMove(grid, ng, d);
    if (isComplete(ng)) flash("🎉 Grille terminée — bravo !", "success");
    else flash(`✓ ${cellName(t)} = ${d} — bien joué !`, "success");
  }
  function closePlan() { setPlan(null); setLevel(0); }

  /* ----- vérification des erreurs à l'instant t ----- */
  function checkErrors() {
    if (phase !== "play") { flash("Disponible une fois la grille verrouillée."); return; }
    const placed = [];
    grid.forEach((v, i) => { if (v && !givens[i]) placed.push(i); });
    if (solRef) {
      const wrong = placed.filter((i) => grid[i] !== solRef[i]);
      if (!wrong.length) {
        flash(`✅ Aucune erreur pour l’instant — ${placed.length} chiffre${placed.length > 1 ? "s" : ""} posé${placed.length > 1 ? "s" : ""}, continue !`, "success");
        return;
      }
      showErrors(wrong);
      flash(`❌ ${wrong.length} chiffre${wrong.length > 1 ? "s" : ""} erroné${wrong.length > 1 ? "s" : ""} — surligné${wrong.length > 1 ? "s" : ""} en rouge.`, "warn");
    } else {
      // Grille à solutions multiples : pas de référence unique, on vérifie les conflits.
      const wrong = [...conflictSet(grid)].filter((i) => !givens[i]);
      if (!wrong.length) {
        flash(`✅ Aucun conflit pour l’instant — ${placed.length} chiffre${placed.length > 1 ? "s" : ""} posé${placed.length > 1 ? "s" : ""} (grille à plusieurs solutions : seule la cohérence est vérifiable).`, "success");
        return;
      }
      showErrors(wrong);
      flash(`❌ ${wrong.length} chiffre${wrong.length > 1 ? "s" : ""} en conflit — surligné${wrong.length > 1 ? "s" : ""} en rouge (grille à plusieurs solutions : seule la cohérence est vérifiable).`, "warn");
    }
  }

  /* ----- notes automatiques (bascule : efface s'il y a des notes, sinon calcule) ----- */
  function autoNotes() {
    if (phase !== "play") { flash("Disponible une fois la grille verrouillée."); return; }
    pushHist();
    if (notes.some((a) => a.length)) {
      setNotes(Array.from({ length: 81 }, () => []));
      flash("Notes effacées — rappuie pour les recalculer.");
      return;
    }
    const nn = notes.map((a) => a.slice());
    let singles = 0;
    for (let i = 0; i < 81; i++) {
      if (grid[i] === 0) {
        nn[i] = candidatesFromGrid(grid, i);
        if (nn[i].length === 1) singles++;
      }
    }
    setNotes(nn);
    flash(singles
      ? "🗒️ Candidats calculés et notés dans chaque case vide. Les cases à candidat unique sont résolubles immédiatement 😉"
      : "🗒️ Candidats calculés et notés dans chaque case vide.");
  }
  function snyderMode() {
    if (phase !== "play") { flash("Disponible une fois la grille verrouillée."); return; }
    pushHist();
    setNotes(snyderNotes(grid));
    flash("✍️ Notation Snyder : notés uniquement les chiffres qui n’ont que 2 places possibles dans un bloc.");
  }

  /* ----- OCR photo (via /api/ocr sur Vercel) ----- */
  function fileToJpegBase64(file, maxDim) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        try {
          const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * sc));
          const h = Math.max(1, Math.round(img.height * sc));
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = cv.toDataURL("image/jpeg", 0.85);
          URL.revokeObjectURL(url);
          resolve(dataUrl.split(",")[1]);
        } catch (e) { URL.revokeObjectURL(url); reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
      img.src = url;
    });
  }
  async function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setScreen("board"); // le scan peut être lancé depuis l'accueil
    setScanning(true);
    try {
      const b64 = await fileToJpegBase64(file, 1150);
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, media_type: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        flash(`Scan : ${(data && data.error) || "erreur serveur"} — réessaie avec une photo nette, à plat.`, "warn");
        return;
      }
      const s = String(data.grid || "").replace(/[^0-9]/g, "");
      if (s.length !== 81) { flash("Scan : format inattendu — réessaie.", "warn"); return; }
      const ng = s.split("").map(Number);
      const filledCount = ng.filter((v) => v).length;
      pushHist();
      setGrid(ng);
      setNotes(Array.from({ length: 81 }, () => []));
      setGivens(Array(81).fill(false));
      setPhase("edit"); setSolRef(null); setPlan(null); setSel(null); setGameLevel(null);
      flash(`📷 ${filledCount} chiffres lus. Vérifie la grille (corrige au besoin) puis « Commencer ».`, "success");
    } catch (err) {
      flash("Scan impossible : cadre bien la grille, à plat, avec une lumière franche — puis réessaie.", "warn");
    } finally {
      setScanning(false);
    }
  }

  /* ----- persistance (localStorage) ----- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (Array.isArray(s.grid) && s.grid.length === 81) {
          setGrid(s.grid);
          const gv = Array.isArray(s.givens) && s.givens.length === 81 ? s.givens : Array(81).fill(false);
          setGivens(gv);
          setNotes(
            Array.isArray(s.notes) && s.notes.length === 81
              ? s.notes.map((a) => (Array.isArray(a) ? a : []))
              : Array.from({ length: 81 }, () => [])
          );
          if (s.phase === "play") {
            const gb = s.grid.map((v, i) => (gv[i] ? v : 0));
            const { solution } = solveGrid(gb);
            if (solution) { setSolRef(solution); setPhase("play"); }
          }
          if (s.level >= 1 && s.level <= 5) setGameLevel(s.level);
        }
      }
    } catch (e) { /* première visite ou stockage indisponible */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, givens, notes, phase, level: gameLevel }));
      } catch (e) { /* best-effort */ }
    }, 400);
    return () => clearTimeout(t);
  }, [grid, givens, notes, phase, gameLevel, loaded]);

  /* ----- clavier (desktop) ----- */
  useEffect(() => {
    function onKey(e) {
      if (tab !== "play" || screen !== "board") return;
      if (e.metaKey || e.ctrlKey) return;
      if (e.key >= "1" && e.key <= "9") padPress(parseInt(e.key, 10));
      else if (e.key === "Backspace" || e.key === "Delete" || e.key === "0") { e.preventDefault(); eraseSel(); }
      else if (e.key === "n" || e.key === "N") { if (phase === "play") setNoteMode((m) => !m); }
      else if (e.key.startsWith("Arrow")) {
        e.preventDefault();
        if (sel === null) { setSel(40); return; }
        let r = rowOf(sel), c = colOf(sel);
        if (e.key === "ArrowUp") r = Math.max(0, r - 1);
        if (e.key === "ArrowDown") r = Math.min(8, r + 1);
        if (e.key === "ArrowLeft") c = Math.max(0, c - 1);
        if (e.key === "ArrowRight") c = Math.min(8, c + 1);
        setSel(r * 9 + c);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  /* ----- panneau coach : scroll en vue ----- */
  useEffect(() => {
    if (plan && panelRef.current) {
      setTimeout(() => {
        panelRef.current && panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [plan, level]);

  /* ----- dérivés ----- */
  const conflicts = useMemo(() => conflictSet(grid), [grid]);
  const won = useMemo(() => phase === "play" && isComplete(grid), [phase, grid]);
  const counts = useMemo(() => {
    const m = {};
    grid.forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; });
    return m;
  }, [grid]);
  const hasNotes = useMemo(() => notes.some((a) => a.length), [notes]);
  const planHL = useMemo(() => {
    const res = { unit: new Set(), chain: new Set(), target: null };
    if (!plan) return res;
    if (plan.target != null) res.target = plan.target;
    if (plan.kind === "ok") {
      if (level >= 1 && plan.unitCells) plan.unitCells.forEach((c) => res.unit.add(c));
      if (level >= 2 && plan.chain) plan.chain.forEach((s) => (s.cells || []).forEach((c) => res.chain.add(c)));
    }
    return res;
  }, [plan, level]);

  function cellStyle(i) {
    const r = rowOf(i), c = colOf(i);
    let bg = C.surface;
    if (phase === "play" && givens[i]) bg = C.givenBg;
    if (sel !== null && i !== sel && PEERS[sel].has(i)) bg = "#F3F6F5";
    const sv = sel !== null ? grid[sel] : 0;
    if (sv && grid[i] === sv && i !== sel) bg = C.blueSoft;
    if (planHL.unit.has(i)) bg = C.yellowSoft;
    if (i === sel) bg = C.tealSoft;
    if (conflicts.has(i)) bg = C.redSoft;
    const st = {
      background: bg, position: "relative", display: "flex",
      alignItems: "center", justifyContent: "center",
      borderRight: c === 8 ? "none" : c % 3 === 2 ? `2px solid ${C.ink}` : `1px solid ${C.line}`,
      borderBottom: r === 8 ? "none" : r % 3 === 2 ? `2px solid ${C.ink}` : `1px solid ${C.line}`,
      cursor: "pointer", WebkitTapHighlightColor: "transparent",
    };
    if (planHL.chain.has(i)) st.boxShadow = `inset 0 0 0 2px ${C.yellow}`;
    if (i === sel) st.boxShadow = `inset 0 0 0 2px ${C.teal}`;
    if (planHL.target === i) st.boxShadow = `inset 0 0 0 3px ${C.yellow}`;
    if (errorCells.has(i)) st.boxShadow = `inset 0 0 0 3px ${C.red}`;
    return st;
  }

  const msgColors = {
    info: { bg: "#E9F0EE", fg: "#2B4A44" },
    success: { bg: "#E1F3E8", fg: "#176A45" },
    warn: { bg: "#FBEFDD", fg: "#8A5A16" },
  };
  const pStyle = { fontSize: 14, lineHeight: 1.55, margin: 0 };

  /* ================================ RENDER ================================ */
  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.paper,
      backgroundImage: "linear-gradient(#E5EAE8 1px, transparent 1px), linear-gradient(90deg, #E5EAE8 1px, transparent 1px)",
      backgroundSize: "26px 26px",
      padding: "calc(14px + env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(44px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 12, color: C.ink,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`@keyframes scspin{to{transform:rotate(360deg)}} summary::-webkit-details-marker{display:none}
@media (prefers-reduced-motion: no-preference){
  .sc-pop{animation:scpop .14s ease-out}
  @keyframes scpop{from{transform:scale(.85);opacity:.4}to{transform:scale(1);opacity:1}}
  .sc-sweep{animation:scsweep .5s ease-out}
  @keyframes scsweep{0%{opacity:0}30%{opacity:.9}100%{opacity:0}}
  .sc-shake{animation:scshake .2s linear}
  @keyframes scshake{0%,100%{transform:translateX(0)}25%{transform:translateX(-2.5px)}75%{transform:translateX(2.5px)}}
  .sc-pulse{animation:scpulse .45s ease-out}
  @keyframes scpulse{0%{transform:scale(1)}40%{transform:scale(1.12)}100%{transform:scale(1)}}
  .sc-screen{animation:scscreen .15s ease-out}
  @keyframes scscreen{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
}`}</style>

      {/* ---------- En-tête ---------- */}
      <header style={{ width: W, display: "flex", alignItems: "center", gap: 10 }}>
        <svg width="32" height="32" viewBox="0 0 30 30" aria-hidden="true">
          <rect x="1.5" y="1.5" width="27" height="27" rx="3" fill="#FFFFFF" stroke={C.ink} strokeWidth="2" />
          <rect x="10.5" y="1.5" width="9" height="9" fill={C.yellow} />
          <line x1="10.5" y1="2" x2="10.5" y2="28" stroke={C.ink} strokeWidth="1.4" />
          <line x1="19.5" y1="2" x2="19.5" y2="28" stroke={C.ink} strokeWidth="1.4" />
          <line x1="2" y1="10.5" x2="28" y2="10.5" stroke={C.ink} strokeWidth="1.4" />
          <line x1="2" y1="19.5" x2="28" y2="19.5" stroke={C.ink} strokeWidth="1.4" />
          <text x="15" y="8.8" textAnchor="middle" fontSize="7" fontWeight="700" fill={C.ink} fontFamily={DISPLAYFONT}>7</text>
        </svg>
        <div>
          <div style={{ fontFamily: DISPLAYFONT, letterSpacing: "0.16em", fontWeight: 700, fontSize: 19, textTransform: "uppercase" }}>
            Sudoku·Coach
          </div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>Résous, comprends, progresse.</div>
        </div>
      </header>

      {/* ---------- Onglets ---------- */}
      <div style={{ width: W, display: "flex", background: "#E3E8E6", borderRadius: 12, padding: 3 }}>
        {[["play", "🎮 Jouer"], ["learn", "📚 Apprendre"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)} style={{
            flex: 1, border: "none", borderRadius: 10, padding: "8px 0",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
            background: tab === k ? "#fff" : "transparent",
            color: tab === k ? C.ink : "#5A6763",
            boxShadow: tab === k ? "0 1px 4px rgba(31,39,46,0.12)" : "none",
            WebkitTapHighlightColor: "transparent",
            minHeight: 44, touchAction: "manipulation",
          }}>{l}</button>
        ))}
      </div>

      {/* Transition douce entre écrans : le wrapper keyé remonte à chaque changement */}
      <div key={tab === "learn" ? "learn" : `play:${screen}`} className="sc-screen" style={{
        width: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", gap: 12,
      }}>
      {tab === "learn" ? <LearnView /> : screen === "home" ? (
        <>
          {/* ---------- Accueil ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {phase === "play" && !won && (
              <Card accent emoji="▶︎" title="Reprendre la partie"
                sub={`${gameLevel ? `Niveau ${LEVELS[gameLevel].name} · ` : ""}${grid.filter((v) => !v).length} cases restantes`}
                onClick={() => setScreen("board")} />
            )}
            <Card emoji="🎲" title="Jouer" sub="Une nouvelle grille, de Facile à Diabolique"
              onClick={() => setScreen("levels")} />
            <Card emoji="📷" title="Scanner" sub="Photographie une grille de magazine ou de journal"
              onClick={() => fileRef.current && fileRef.current.click()} />
            <Card emoji="📚" title="Apprendre" sub={`${LESSONS.length} leçons, des bases aux techniques expertes`}
              onClick={() => setTab("learn")} />
          </div>
          <LinkBtn onClick={() => { if (phase === "play") clearAll(); setScreen("board"); }}>
            ✏️ Saisir une grille à la main
          </LinkBtn>
        </>
      ) : screen === "levels" ? (
        <>
          {/* ---------- Choix de difficulté ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>Choisis ta difficulté</div>
            {Object.entries(LEVELS).map(([n, l], i) => (
              <Card key={n} emoji={["🟢", "🟡", "🟠", "🔴", "🟣"][i] || "🎲"} title={l.name} sub={l.desc}
                onClick={() => newGame(Number(n))} />
            ))}
          </div>
          <LinkBtn onClick={() => setScreen("home")}>← Accueil</LinkBtn>
        </>
      ) : (
        <>
          {/* ---------- Message / bannière ---------- */}
          {msg ? (
            <div style={{
              width: W, fontSize: 13, fontWeight: 600, lineHeight: 1.45,
              background: msgColors[msg.type].bg, color: msgColors[msg.type].fg,
              borderRadius: 10, padding: "9px 12px",
            }}>
              {msg.text}
            </div>
          ) : phase === "edit" ? (
            <div style={{
              width: W, fontSize: 12.5, color: "#5A6763", background: "rgba(255,255,255,0.8)",
              border: "1px dashed #B9C4C0", borderRadius: 10, padding: "8px 12px", textAlign: "center",
            }}>
              Mode saisie — remplis ou scanne la grille, puis « Commencer ».
            </div>
          ) : null}

          {/* ---------- Badge de niveau ---------- */}
          {phase === "play" && gameLevel ? (
            <div style={{ width: W, display: "flex" }}>
              <span key={celebrate ? `b${celebrate}` : "lvl"}
                className={celebrate ? "sc-pulse" : undefined} style={{
                fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
                color: "#5A6763", background: "#EFF2F1", border: "1px solid #E2E7E5",
                borderRadius: 999, padding: "3px 10px", display: "inline-block",
                animationDelay: celebrate ? "800ms" : undefined,
              }}>
                🎲 Niveau · {LEVELS[gameLevel].name}
              </span>
            </div>
          ) : null}

          {/* ---------- Grille ---------- */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: W, aspectRatio: "1 / 1", display: "grid",
              gridTemplateColumns: "repeat(9, 1fr)", gridTemplateRows: "repeat(9, 1fr)",
              border: `2.5px solid ${C.ink}`, borderRadius: 10, overflow: "hidden",
              background: C.surface, boxShadow: "0 10px 30px rgba(31,39,46,0.10)",
              userSelect: "none", WebkitUserSelect: "none", touchAction: "manipulation",
            }}>
              {Array.from({ length: 81 }, (_, i) => {
                const v = grid[i];
                const shaking = shake && shake.cells.has(i);
                const sweepMs = sweep ? sweep.delays.get(i) : undefined;
                return (
                  <div key={shaking ? `${i}s${shake.stamp}` : i} onClick={() => setSel(i)}
                    className={shaking ? "sc-shake" : undefined} style={cellStyle(i)}>
                    {v !== 0 ? (
                      <span
                        key={pop && pop.cell === i ? `p${pop.stamp}` : undefined}
                        className={pop && pop.cell === i ? "sc-pop" : undefined}
                        style={{
                        fontSize: "min(6.2vw, 27px)",
                        fontWeight: phase === "play" && givens[i] ? 700 : 600,
                        fontFamily: NUMFONT, fontVariantNumeric: "tabular-nums",
                        color: conflicts.has(i) ? C.red : phase === "edit" || givens[i] ? C.ink : C.blue,
                      }}>
                        {v}
                      </span>
                    ) : notes[i].length > 0 ? (
                      <div style={{
                        position: "absolute", inset: 2, display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)",
                      }}>
                        {Array.from({ length: 9 }, (_, k) => {
                          const d = k + 1;
                          return (
                            <div key={d} style={{
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: "min(2.6vw, 10.5px)", lineHeight: 1, color: C.gray,
                              fontWeight: 600, fontFamily: NUMFONT,
                            }}>
                              {notes[i].includes(d) ? d : ""}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    {sweepMs !== undefined && (
                      <div key={`w${sweep.stamp}`} className="sc-sweep" style={{
                        position: "absolute", inset: 0, background: C.yellowSoft,
                        opacity: 0, pointerEvents: "none", animationDelay: `${sweepMs}ms`,
                      }} />
                    )}
                    {celebrate && (
                      <div key={`c${celebrate}`} className="sc-sweep" style={{
                        position: "absolute", inset: 0, background: C.yellowSoft,
                        opacity: 0, pointerEvents: "none",
                        animationDelay: `${(rowOf(i) + colOf(i)) * 30}ms`,
                      }} />
                    )}
                  </div>
                );
              })}
            </div>
            {(scanning || generating) && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(241,244,243,0.85)",
                borderRadius: 10, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5,
              }}>
                <div style={{
                  width: 34, height: 34, border: "3px solid #C9D1CE", borderTopColor: C.teal,
                  borderRadius: "50%", animation: "scspin .9s linear infinite",
                }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2B4A44" }}>
                  {scanning ? "Lecture de la photo…" : "Génération de la grille…"}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
            {phase === "edit"
              ? "Touche une case, puis un chiffre du pavé. Retoucher le même chiffre l’efface."
              : noteMode
                ? "Mode notes : les chiffres s’écrivent en petit dans les coins."
                : "Sélectionne une case vide puis 🎯 pour une explication, ou 👣 pour la case la plus simple."}
            {phase === "play" && (
              <div style={{ marginTop: 2 }}>
                Sous chaque chiffre du pavé : combien il en reste à placer — grisé ✓ quand les 9 sont posés.
              </div>
            )}
          </div>

          {/* ---------- Pavé numérique ---------- */}
          <div style={{ width: W, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, userSelect: "none", touchAction: "manipulation" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
              const remaining = 9 - (counts[d] || 0);
              const pulsing = padPulse && padPulse.digit === d;
              return (
                <button key={pulsing ? `${d}p${padPulse.stamp}` : d} type="button"
                  className={pulsing ? "sc-pulse" : undefined}
                  onClick={() => padPress(d)} style={{
                  background: "#FFFFFF", border: "1px solid #D8DEDC", borderRadius: 12,
                  padding: "7px 0 5px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
                  boxShadow: "0 1px 0 rgba(31,39,46,0.05)", WebkitTapHighlightColor: "transparent",
                  opacity: remaining <= 0 ? 0.35 : 1, fontFamily: "inherit", minHeight: 44,
                }}>
                  <span style={{
                    fontSize: 21, fontWeight: 700, fontFamily: NUMFONT,
                    color: noteMode && phase === "play" ? C.gray : C.ink,
                  }}>{d}</span>
                  <span style={{ fontSize: 9.5, color: C.gray, fontWeight: 600 }}>
                    {remaining > 0 ? remaining : "✓"}
                  </span>
                </button>
              );
            })}
            <button type="button" onClick={eraseSel} style={{
              background: "#FFFFFF", border: "1px solid #D8DEDC", borderRadius: 12,
              padding: "7px 0 5px", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
              boxShadow: "0 1px 0 rgba(31,39,46,0.05)", WebkitTapHighlightColor: "transparent",
              fontFamily: "inherit", minHeight: 44,
            }}>
              <span style={{ fontSize: 19 }}>⌫</span>
              <span style={{ fontSize: 9.5, color: C.gray, fontWeight: 600 }}>effacer</span>
            </button>
          </div>

          {/* ---------- Barres d'action ---------- */}
          {phase === "edit" ? (
            <div style={{ width: W, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" grow onClick={startPlay}>▶︎ Commencer</Btn>
                <Btn variant="accent" grow onClick={() => fileRef.current && fileRef.current.click()} disabled={scanning}>📷 Scanner</Btn>
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                <LinkBtn onClick={() => setScreen("home")}>← Accueil</LinkBtn>
                <LinkBtn onClick={loadSample}>Charger un exemple</LinkBtn>
                <LinkBtn onClick={clearAll}>Tout vider</LinkBtn>
                <LinkBtn onClick={undo}>Annuler</LinkBtn>
              </div>
            </div>
          ) : (
            <div style={{ width: W, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="accent" grow onClick={hintForCell}>🎯 Expliquer cette case</Btn>
                <Btn grow onClick={randomHint}>👣 Étape suivante</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow active={noteMode} onClick={() => setNoteMode((m) => !m)}>✏️ Notes</Btn>
                <Btn grow active={hasNotes} onClick={autoNotes}>🗒️ Auto-notes</Btn>
                <Btn grow onClick={snyderMode}>✍️ Snyder</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow onClick={checkErrors}>🔍 Vérifier</Btn>
                <Btn onClick={undo} title="Annuler">↩︎</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow onClick={() => fileRef.current && fileRef.current.click()} disabled={scanning}>📷 Scanner</Btn>
                <Btn grow onClick={solveAll}>✅ Tout résoudre</Btn>
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                <LinkBtn onClick={() => setScreen("home")}>← Accueil</LinkBtn>
                <LinkBtn onClick={backToEdit}>Modifier la grille</LinkBtn>
                <LinkBtn onClick={restartPuzzle}>Recommencer</LinkBtn>
              </div>
            </div>
          )}

          {/* ---------- Panneau fin de partie ---------- */}
          {won && (
            <section style={{
              width: W, background: "#FFFFFF", borderRadius: 14,
              border: "1px solid #E2E7E5", borderTop: `5px solid ${C.teal}`,
              boxShadow: "0 12px 32px rgba(31,39,46,0.12)",
              padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9,
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>🎉 Grille terminée — bravo !</div>
              {gameLevel ? (
                <>
                  <p style={pStyle}>Tu viens de boucler une grille {LEVELS[gameLevel].name}. On enchaîne ?</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="accent" grow onClick={() => newGame(gameLevel)}>
                      🎲 Nouvelle grille ({LEVELS[gameLevel].name})
                    </Btn>
                    {gameLevel < MAX_LEVEL && (
                      <Btn variant="primary" grow onClick={() => newGame(gameLevel + 1)}>
                        ⬆️ Niveau supérieur
                      </Btn>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="accent" grow onClick={() => setScreen("levels")}>🎲 Nouvelle grille</Btn>
                  <Btn grow onClick={() => setScreen("home")}>Accueil</Btn>
                </div>
              )}
            </section>
          )}

          {/* ---------- Panneau Coach ---------- */}
          {plan && (
            <section ref={panelRef} style={{
              width: W, background: "#FFFFFF", borderRadius: 14,
              border: "1px solid #E2E7E5", borderTop: `5px solid ${C.yellow}`,
              boxShadow: "0 12px 32px rgba(31,39,46,0.12)",
              padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17 }}>🎓</span>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  Coach{plan.target != null ? ` — ${cellName(plan.target)}` : ""}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  {plan.kind === "ok" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: "#5A6763",
                      background: "#EFF2F1", borderRadius: 999, padding: "3px 9px",
                    }}>
                      {level < 2 ? `Indice ${level + 1}/2` : "Solution"}
                    </span>
                  )}
                  <button type="button" onClick={closePlan} style={{
                    background: "none", border: "none", fontSize: 16, color: "#8A948F",
                    cursor: "pointer", padding: 0, fontFamily: "inherit",
                    minWidth: 44, minHeight: 44, margin: "-10px -12px -10px -4px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  }}>✕</button>
                </div>
              </div>

              {plan.kind === "stuckAll" && (
                <>
                  <p style={pStyle}>
                    Plus aucune case n’est déductible avec les techniques du coach (candidat unique,
                    singles cachés, paires, alignements, X-Wing, XY-Wing, XYZ-Wing, W-Wing, Swordfish,
                    2-String Kite, Skyscraper, Empty Rectangle, Remote Pairs, coloriage, Sue de Coq).
                    La suite demande des chaînes de forçage — au-delà du programme du coach.
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="primary" grow onClick={solveAll}>Tout résoudre</Btn>
                    <Btn grow onClick={closePlan}>Fermer</Btn>
                  </div>
                </>
              )}

              {plan.kind === "stuck" && (
                <>
                  <p style={pStyle}>
                    La case <strong>{cellName(plan.target)}</strong> n’est pas déductible pour l’instant
                    avec les techniques du coach : il faut d’abord remplir d’autres cases (ou recourir
                    à des chaînes de forçage).
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="accent" grow onClick={randomHint}>👣 Étape suivante</Btn>
                    <Btn grow onClick={() => revealAnyway(plan.target)}>Révéler quand même</Btn>
                  </div>
                </>
              )}

              {plan.kind === "ok" && (
                <>
                  {level >= 1 && (
                    <div style={{
                      alignSelf: "flex-start", fontSize: 11, fontWeight: 800,
                      letterSpacing: ".05em", textTransform: "uppercase", color: "#7A620A",
                      background: C.yellowSoft, border: "1px solid #EDD98F",
                      borderRadius: 999, padding: "3px 10px",
                    }}>
                      {plan.tech}
                    </div>
                  )}
                  {plan.hint1 ? <p style={pStyle}><Rich text={plan.hint1} /></p> : null}
                  {level >= 1 && plan.hint2 ? <p style={pStyle}><Rich text={plan.hint2} /></p> : null}
                  {level >= 2 && (
                    <>
                      {plan.chain.map((s, ixx) => (
                        <div key={ixx} style={{
                          border: "1px solid #EBDB9B", background: "#FFFBEA",
                          borderRadius: 10, padding: "8px 10px",
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                            textTransform: "uppercase", color: "#8A6D0B",
                          }}>
                            Étape {ixx + 1} — {s.title}
                          </div>
                          <div style={{ fontSize: 13.5, marginTop: 3, lineHeight: 1.5 }}>
                            <Rich text={s.text} />
                          </div>
                        </div>
                      ))}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {plan.paras.map((p, ixx) => (
                          <p key={ixx} style={pStyle}><Rich text={p} /></p>
                        ))}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: 12, background: C.ink, color: "#fff",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 24, fontWeight: 800, fontFamily: NUMFONT,
                        }}>
                          {plan.digit}
                        </div>
                        <div style={{ fontSize: 13, color: C.gray }}>
                          à placer en <strong style={{ color: C.ink }}>{cellName(plan.target)}</strong>
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {level === 0 && <Btn variant="accent" grow onClick={() => setLevel(1)}>💡 Un indice de plus</Btn>}
                    {level < 2 && <Btn grow onClick={() => setLevel(2)}>Voir la solution</Btn>}
                    {level >= 2 && <Btn variant="primary" grow onClick={placeFromPlan}>✏️ Placer le {plan.digit}</Btn>}
                    {level >= 2 && <Btn grow onClick={closePlan}>Fermer</Btn>}
                  </div>
                </>
              )}
            </section>
          )}

          <div style={{ fontSize: 11, color: "#98A29D" }}>Sauvegarde automatique sur cet appareil.</div>
        </>
      )}
      </div>

      {tab !== "learn" && (
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />
      )}
    </div>
  );
}
