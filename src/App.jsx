import { useState, useEffect, useRef, useMemo } from "react";
import {
  ROWS, COLS, BOXES, PEERS, rowOf, colOf, cellName,
  candidatesFromGrid, conflictSet, isComplete, solveGrid, buildPlan, SAMPLES,
} from "./engine.js";
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
      style={{ background: "none", border: "none", color: "#5A6763", textDecoration: "underline", fontSize: 12.5, cursor: "pointer", padding: 4, fontFamily: "inherit" }}>
      {children}
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
      userSelect: "none", WebkitUserSelect: "none",
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
function LearnView() {
  const [ix, setIx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const L = LESSONS[ix];
  useEffect(() => { setRevealed(false); setShowHint(false); }, [ix]);
  return (
    <>
      <div style={{ width: W, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
        {LESSONS.map((l, i) => (
          <button key={l.id} type="button" onClick={() => setIx(i)} style={{
            flex: "0 0 auto", border: `1px solid ${i === ix ? C.teal : "#D8DEDC"}`,
            background: i === ix ? C.teal : "#fff", color: i === ix ? "#fff" : C.ink,
            borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 700,
            cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
            WebkitTapHighlightColor: "transparent",
          }}>
            {l.num} · {l.title}
          </button>
        ))}
      </div>

      <div style={{
        width: W, background: "#fff", border: "1px solid #E2E7E5", borderRadius: 14,
        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{L.title}</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: "#3C464D" }}>{L.concept}</p>
      </div>

      <LessonBoard lesson={L} revealed={revealed} />

      <div style={{
        width: W, background: "#fff", border: "1px solid #E2E7E5",
        borderTop: `5px solid ${C.yellow}`, borderRadius: 14, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 9,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>🎓 {L.question}</div>
        {showHint && !revealed && (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "#5A6763" }}>💡 {L.hint}</p>
        )}
        {revealed && (
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
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          {!revealed && <Btn grow onClick={() => setShowHint(true)} disabled={showHint}>💡 Indice</Btn>}
          {!revealed && <Btn variant="accent" grow onClick={() => setRevealed(true)}>Voir la solution</Btn>}
          {revealed && <Btn grow onClick={() => { setRevealed(false); setShowHint(false); }}>Masquer</Btn>}
          {revealed && ix < LESSONS.length - 1 && (
            <Btn variant="primary" grow onClick={() => setIx(ix + 1)}>Technique suivante →</Btn>
          )}
        </div>
      </div>
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
  const [grid, setGrid] = useState(Array(81).fill(0));
  const [givens, setGivens] = useState(Array(81).fill(false));
  const [notes, setNotes] = useState(Array.from({ length: 81 }, () => []));
  const [phase, setPhase] = useState("edit"); // 'edit' | 'play'
  const [sel, setSel] = useState(null);
  const [noteMode, setNoteMode] = useState(false);
  const [plan, setPlan] = useState(null);
  const [level, setLevel] = useState(0); // 0 indice1, 1 indice2, 2 solution
  const [msg, setMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [solRef, setSolRef] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const histRef = useRef([]);
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  const msgTimer = useRef(null);
  const sampleIx = useRef(0);

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

  /* ----- saisie ----- */
  function padPress(d) {
    if (sel === null) { flash("Touche d’abord une case de la grille."); return; }
    if (phase === "edit") {
      pushHist();
      const ng = grid.slice();
      ng[sel] = ng[sel] === d ? 0 : d;
      setGrid(ng);
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
    const conf = conflictSet(ng);
    if (ng[sel] !== 0 && conf.has(sel)) flash("⚠️ Ce chiffre entre en conflit avec sa ligne, sa colonne ou son bloc.", "warn");
    else if (isComplete(ng)) flash("🎉 Grille terminée — bravo !", "success");
  }
  function eraseSel() {
    if (sel === null) { flash("Touche d’abord une case."); return; }
    if (phase === "play" && givens[sel]) { flash("Cette case fait partie de l’énoncé.", "warn"); return; }
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[sel] = 0; nn[sel] = [];
    setGrid(ng); setNotes(nn);
  }

  /* ----- cycle de vie de la grille ----- */
  function startPlay() {
    const filled = grid.filter((v) => v).length;
    if (filled < 8) { flash("Ajoute d’abord les chiffres de départ (ou charge un exemple).", "warn"); return; }
    if (conflictSet(grid).size) { flash("Un chiffre apparaît deux fois dans une zone — corrige avant de commencer.", "warn"); return; }
    const { count, solution } = solveGrid(grid);
    if (count === 0 || !solution) { flash("Aucune solution possible : vérifie la saisie.", "warn"); return; }
    setSolRef(solution);
    setGivens(grid.map((v) => v !== 0));
    setPhase("play");
    histRef.current = [];
    setPlan(null); setNoteMode(false);
    if (count > 1) flash("⚠️ Cette grille a plusieurs solutions — les déductions logiques seront limitées.", "warn");
    else flash("Grille verrouillée — à toi de jouer ✏️", "success");
  }
  function backToEdit() {
    setPhase("edit"); setGivens(Array(81).fill(false));
    setSolRef(null); setPlan(null); setNoteMode(false);
    flash("Mode saisie : modifie librement, puis « Commencer ».");
  }
  function clearAll() {
    pushHist();
    setGrid(Array(81).fill(0));
    setNotes(Array.from({ length: 81 }, () => []));
    setGivens(Array(81).fill(false));
    setPhase("edit"); setSolRef(null); setPlan(null); setSel(null);
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
    const p = plans[Math.floor(Math.random() * plans.length)];
    setSel(p.target); setPlan(p); setLevel(0);
  }
  function revealAnyway(t) {
    if (!solRef) { flash("Solution indisponible pour cette grille.", "warn"); return; }
    const d = solRef[t];
    setPlan({
      kind: "ok", target: t, digit: d, chain: [], hint1: "", hint2: "",
      tech: "Au-delà des techniques classiques",
      paras: [
        `Aucune des techniques enseignées ici (candidat unique, single caché, paires, alignements) ne permet de déduire **${cellName(t)}** dans la position actuelle.`,
        `La valeur vient de la résolution complète : **${cellName(t)} = ${d}**.`,
        `Conseil : commence par les cases accessibles (bouton 🎲) — celle-ci se débloquera naturellement en chemin.`,
      ],
      unitCells: [],
    });
    setLevel(2);
  }
  function placeFromPlan() {
    if (!plan || plan.kind !== "ok" || plan.target == null) return;
    const t = plan.target, d = plan.digit;
    if (grid[t] !== 0) { setPlan(null); return; }
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[t] = d; nn[t] = [];
    PEERS[t].forEach((p) => {
      const k = nn[p].indexOf(d);
      if (k >= 0) nn[p].splice(k, 1);
    });
    setGrid(ng); setNotes(nn); setSel(t); setPlan(null);
    if (isComplete(ng)) flash("🎉 Grille terminée — bravo !", "success");
    else flash(`✓ ${cellName(t)} = ${d} — bien joué !`, "success");
  }
  function closePlan() { setPlan(null); setLevel(0); }

  /* ----- notes automatiques ----- */
  function autoNotes() {
    if (phase !== "play") { flash("Disponible une fois la grille verrouillée."); return; }
    pushHist();
    const nn = notes.map((a) => a.slice());
    for (let i = 0; i < 81; i++) if (grid[i] === 0) nn[i] = candidatesFromGrid(grid, i);
    setNotes(nn);
    flash("🗒️ Candidats calculés et notés dans chaque case vide.");
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
      setPhase("edit"); setSolRef(null); setPlan(null); setSel(null);
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
        }
      }
    } catch (e) { /* première visite ou stockage indisponible */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ grid, givens, notes, phase }));
      } catch (e) { /* best-effort */ }
    }, 400);
    return () => clearTimeout(t);
  }, [grid, givens, notes, phase, loaded]);

  /* ----- clavier (desktop) ----- */
  useEffect(() => {
    function onKey(e) {
      if (tab !== "play") return;
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
  const counts = useMemo(() => {
    const m = {};
    grid.forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; });
    return m;
  }, [grid]);
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
      padding: "calc(14px + env(safe-area-inset-top)) 12px 44px",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 12, color: C.ink,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`@keyframes scspin{to{transform:rotate(360deg)}} summary::-webkit-details-marker{display:none}`}</style>

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
          }}>{l}</button>
        ))}
      </div>

      {tab === "learn" ? <LearnView /> : (
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

          {/* ---------- Grille ---------- */}
          <div style={{ position: "relative" }}>
            <div style={{
              width: W, aspectRatio: "1 / 1", display: "grid",
              gridTemplateColumns: "repeat(9, 1fr)", gridTemplateRows: "repeat(9, 1fr)",
              border: `2.5px solid ${C.ink}`, borderRadius: 10, overflow: "hidden",
              background: C.surface, boxShadow: "0 10px 30px rgba(31,39,46,0.10)",
              userSelect: "none", WebkitUserSelect: "none",
            }}>
              {Array.from({ length: 81 }, (_, i) => {
                const v = grid[i];
                return (
                  <div key={i} onClick={() => setSel(i)} style={cellStyle(i)}>
                    {v !== 0 ? (
                      <span style={{
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
                  </div>
                );
              })}
            </div>
            {scanning && (
              <div style={{
                position: "absolute", inset: 0, background: "rgba(241,244,243,0.85)",
                borderRadius: 10, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5,
              }}>
                <div style={{
                  width: 34, height: 34, border: "3px solid #C9D1CE", borderTopColor: C.teal,
                  borderRadius: "50%", animation: "scspin .9s linear infinite",
                }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: "#2B4A44" }}>Lecture de la photo…</div>
              </div>
            )}
          </div>

          <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
            {phase === "edit"
              ? "Touche une case, puis un chiffre du pavé. Retoucher le même chiffre l’efface."
              : noteMode
                ? "Mode notes : les chiffres s’écrivent en petit dans les coins."
                : "Sélectionne une case vide puis 🎯 pour une explication guidée."}
          </div>

          {/* ---------- Pavé numérique ---------- */}
          <div style={{ width: W, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, userSelect: "none" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => {
              const remaining = 9 - (counts[d] || 0);
              return (
                <button key={d} type="button" onClick={() => padPress(d)} style={{
                  background: "#FFFFFF", border: "1px solid #D8DEDC", borderRadius: 12,
                  padding: "7px 0 5px", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
                  boxShadow: "0 1px 0 rgba(31,39,46,0.05)", WebkitTapHighlightColor: "transparent",
                  opacity: remaining <= 0 ? 0.35 : 1, fontFamily: "inherit",
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
              fontFamily: "inherit",
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
                <LinkBtn onClick={loadSample}>Charger un exemple</LinkBtn>
                <LinkBtn onClick={clearAll}>Tout vider</LinkBtn>
                <LinkBtn onClick={undo}>Annuler</LinkBtn>
              </div>
            </div>
          ) : (
            <div style={{ width: W, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="accent" grow onClick={hintForCell}>🎯 Expliquer cette case</Btn>
                <Btn grow onClick={randomHint}>🎲 Case surprise</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow active={noteMode} onClick={() => setNoteMode((m) => !m)}>✏️ Notes</Btn>
                <Btn grow onClick={autoNotes}>🗒️ Auto-notes</Btn>
                <Btn onClick={undo} title="Annuler">↩︎</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow onClick={() => fileRef.current && fileRef.current.click()} disabled={scanning}>📷 Scanner</Btn>
                <Btn grow onClick={solveAll}>✅ Tout résoudre</Btn>
              </div>
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                <LinkBtn onClick={backToEdit}>Modifier la grille</LinkBtn>
                <LinkBtn onClick={restartPuzzle}>Recommencer</LinkBtn>
              </div>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />

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
                    cursor: "pointer", padding: "2px 6px", fontFamily: "inherit",
                  }}>✕</button>
                </div>
              </div>

              {plan.kind === "stuckAll" && (
                <>
                  <p style={pStyle}>
                    Plus aucune case n’est déductible avec les techniques du coach (candidat unique,
                    singles cachés, paires, alignements). La suite demande des techniques expertes —
                    chaînes, X-Wing…
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
                    avec des techniques classiques : il faut d’abord remplir d’autres cases (ou recourir
                    à des techniques expertes).
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="accent" grow onClick={randomHint}>🎲 Une case accessible</Btn>
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
  );
}
