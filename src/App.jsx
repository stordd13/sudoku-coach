import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import {
  ROWS, COLS, BOXES, PEERS, rowOf, colOf, cellName,
  candidatesFromGrid, conflictSet, isComplete, solveGrid, buildPlan, stuckPanelKind, SAMPLES,
  snyderNotes, generatePuzzle, completedUnits,
} from "./engine.js";
import { dailyPuzzle, dailyLevelFor, localDateStr, monthCells, currentStreak, bestStreak } from "./daily.js";
import { addSegment, formatClock, emptyStats, normalizeStats, levelKey, recordStart, recordWin, helpRate } from "./stats.js";
import { getExercise, KIND_BY_LESSON, LESSON_BY_KIND } from "./exercises.js";
import { techBreadcrumb, stepHint1 } from "./coachCopy.js";
import { LESSONS, lessonText } from "./lessons.js";
import { version as APP_VERSION } from "../package.json";
import { KEYS, loadAll, readSync, persist } from "./storage.js";
import { isNative, haptic } from "./native.js";
import { initPurchases, getOffer, buy, restore } from "./purchases.js";
import { C_LIGHT, C_DARK, cssVars, META_COLOR } from "./theme.js";
import { TECH_NAMES, withArticle, frTechList } from "./techNames.js";
import { t, setLang, getLang, detectLang } from "./i18n.js";
import { notationFor } from "./notation.js";
import { cellAriaLabel } from "./a11y.js";

/* ---------- Palette « papier quadrillé + surligneur » ----------
   Les hex vivent dans theme.js (C_LIGHT/C_DARK) ; ici chaque clé devient une
   variable CSS — les styles inline restent identiques, et le thème bascule
   en posant data-theme sur <html> (effet plus bas), sans re-render. */
const C = Object.fromEntries(Object.keys(C_LIGHT).map((k) => [k, `var(--sc-${k})`]));
const NUMFONT = `'Avenir Next', 'Futura', 'Century Gothic', -apple-system, sans-serif`;
const DISPLAYFONT = `'Futura', 'Century Gothic', 'Trebuchet MS', sans-serif`;
const W = "min(94vw, 430px)";

/* Web : VITE_API_BASE absente → URL relative (même origine, comme avant).
   Natif (build --mode ios) : URL absolue du déploiement Vercel via .env.ios. */
const API_BASE = import.meta.env.VITE_API_BASE || "";

/* Quota freemium volontairement côté client : contournable (vider le stockage
   suffit). La vraie protection de la clé API, c'est la limite par IP de /api/ocr
   et le plafond de dépense Anthropic — ici on dose juste l'usage gratuit. */
const FREE_SCANS = 50;

/* ---------- Réglages (persistés via KEYS.settings) ---------- */
const DEFAULT_SETTINGS = { hideTimer: false, theme: "auto", lang: "auto", notation: "auto" };

/* ---------- Niveaux de difficulté (générateur) — libellés via i18n ---------- */
const LEVEL_IDS = [1, 2, 3, 4, 5];
const levelName = (n) => t(`level.${n}.name`);
const MAX_LEVEL = 5;

/* Pluriel : clé .one ou .other selon n (pas de moteur de pluriel). */
const tn = (base, n, params) => t(n === 1 ? `${base}.one` : `${base}.other`, { n, ...params });

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
function Btn({ children, onClick, variant = "ghost", disabled, active, grow, title, ariaLabel, ariaPressed }) {
  const base = {
    fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, padding: "10px 12px",
    borderRadius: 12, border: "1px solid", cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    flex: grow ? 1 : "none", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap",
    WebkitTapHighlightColor: "transparent", transition: "background .15s",
    minHeight: 44, touchAction: "manipulation",
  };
  const styles = {
    primary: { background: C.ink, color: C.onInk, borderColor: C.ink },
    accent: { background: C.teal, color: C.onAccent, borderColor: C.teal },
    ghost: { background: C.surface, color: C.ink, borderColor: C.border },
  };
  const st = { ...base, ...styles[variant] };
  if (active) { st.background = C.teal; st.color = C.onAccent; st.borderColor = C.teal; }
  return (
    <button type="button" title={title} aria-label={ariaLabel} aria-pressed={ariaPressed}
      disabled={disabled} onClick={onClick} style={st}>
      {children}
    </button>
  );
}
function LinkBtn({ children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: "none", border: "none", color: C.textSoft, textDecoration: "underline", fontSize: 12.5, cursor: "pointer", padding: "13px 8px", fontFamily: "inherit", minHeight: 44, touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}>
      {children}
    </button>
  );
}
function Card({ emoji, title, sub, onClick, accent }) {
  return (
    <button type="button" onClick={onClick} style={{
      width: "100%", textAlign: "left", background: C.surface, color: C.ink,
      border: `1px solid ${accent ? C.teal : C.borderSoft}`, borderRadius: 14,
      padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
      cursor: "pointer", fontFamily: "inherit",
      boxShadow: accent ? `0 8px 24px ${C.accentShadow}` : "0 8px 24px rgba(31,39,46,0.08)",
      WebkitTapHighlightColor: "transparent",
    }}>
      <span style={{ fontSize: 26, lineHeight: 1 }}>{emoji}</span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 800, fontSize: 15.5 }}>{title}</span>
        {sub ? <span style={{ fontSize: 12.5, color: C.textSoft, lineHeight: 1.4 }}>{sub}</span> : null}
      </span>
      <span style={{ marginLeft: "auto", color: C.gray, fontSize: 16 }}>›</span>
    </button>
  );
}
/* « mardi 1 septembre » / « Tuesday 1 September » — parse en heure LOCALE
   (T00:00:00 sans Z) pour ne pas décaler le jour affiché selon le fuseau. */
const dateLocale = () => (getLang() === "en" ? "en-GB" : "fr-FR");
function fmtDailyDate(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" });
}
/* Mini-calendrier du mois : une pastille par jour, pleine quand le défi est
   réussi, cerclée pour aujourd'hui, estompée pour les jours à venir. */
function DailyDots({ cells, done, today }) {
  const doneCount = cells.reduce((n, c) => n + (done[c.dateStr] ? 1 : 0), 0);
  const month = new Date(today + "T00:00:00").toLocaleDateString(dateLocale(), { month: "long" });
  return (
    <div style={{
      width: "100%", background: C.glass, border: `1px solid ${C.borderSoft}`,
      borderRadius: 10, padding: "8px 12px", display: "flex", flexDirection: "column",
      gap: 6, alignItems: "center",
    }}>
      <div style={{ fontSize: 11, color: C.faint, fontWeight: 600 }}>
        {month[0].toUpperCase() + month.slice(1)}
        {doneCount ? tn("daily.month", doneCount) : ""}
      </div>
      <div aria-hidden="true" style={{ display: "flex", flexWrap: "wrap", gap: 5, justifyContent: "center" }}>
        {cells.map((c) => (
          <span key={c.dateStr} style={{
            width: 9, height: 9, borderRadius: 999,
            background: done[c.dateStr] ? C.teal : C.borderSoft,
            boxShadow: c.dateStr === today ? `0 0 0 2px ${C.tealSoft}, 0 0 0 3px ${C.teal}` : "none",
            opacity: c.dateStr > today ? 0.35 : 1,
          }} />
        ))}
      </div>
    </div>
  );
}
/* ---------- Écran 📊 Stats : cartes chiffres-clés + détail par niveau ---------- */
function StatTile({ value, label }) {
  return (
    <div style={{
      background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14,
      padding: "12px 8px", display: "flex", flexDirection: "column",
      alignItems: "center", gap: 2, minWidth: 0,
    }}>
      <span style={{ fontSize: 22, fontWeight: 800, fontFamily: NUMFONT, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </span>
      <span style={{ fontSize: 11, color: C.textSoft, textAlign: "center", lineHeight: 1.3 }}>{label}</span>
    </div>
  );
}
function StatsView({ stats, dailyDone }) {
  const s = stats || emptyStats();
  const totalFinished = Object.values(s.finished).reduce((a, b) => a + b, 0);
  const streak = currentStreak(dailyDone, localDateStr());
  const record = bestStreak(dailyDone);
  const rate = helpRate(s);
  const rows = ["1", "2", "3", "4", "5", "custom"].filter((k) => s.started[k] || s.finished[k]);
  const rowName = (k) => (k === "custom" ? t("stats.custom") : levelName(Number(k)));
  return (
    <>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        <StatTile value={totalFinished} label={t("stats.finished")} />
        <StatTile value={streak ? `${streak} 🔥` : "0"} label={t("stats.streak")} />
        <StatTile value={record} label={t("stats.bestStreak")} />
      </div>
      <div style={{
        background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14,
        padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8,
      }}>
        {rows.length === 0 ? (
          <div style={{ fontSize: 13, color: C.textSoft }}>
            {t("stats.empty")}
          </div>
        ) : (
          <>
            <div style={{ display: "flex", fontSize: 11, fontWeight: 700, color: C.textSoft, textTransform: "uppercase", letterSpacing: ".04em" }}>
              <span style={{ flex: 1 }}>{t("stats.colLevel")}</span>
              <span style={{ width: 86, textAlign: "right" }}>{t("stats.colDone")}</span>
              <span style={{ width: 86, textAlign: "right" }}>{t("stats.colBest")}</span>
            </div>
            {rows.map((k) => (
              <div key={k} style={{ display: "flex", fontSize: 13.5, alignItems: "baseline" }}>
                <span style={{ flex: 1, fontWeight: 700 }}>{rowName(k)}</span>
                <span style={{ width: 86, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                  {s.finished[k] || 0} / {s.started[k] || 0}
                </span>
                <span style={{ width: 86, textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 700, color: s.bestTime[k] != null ? C.teal : C.faint }}>
                  {s.bestTime[k] != null ? formatClock(s.bestTime[k]) : "—"}
                </span>
              </div>
            ))}
          </>
        )}
      </div>
      {totalFinished > 0 && (
        <div style={{ fontSize: 12, color: C.textSoft, textAlign: "center" }}>
          {rate ? t(rate < 2 ? "stats.helpRate.one" : "stats.helpRate.other", { n: rate.toFixed(1) })
            : t("stats.noHints")}
        </div>
      )}
    </>
  );
}

/* Rangée de réglage à choix multiples (Thème, Langue…). */
function SegmentRow({ label, options, value, onChange }) {
  return (
    <div style={{
      width: "100%", background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14,
      padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8,
    }}>
      <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
      <div style={{ display: "flex", background: C.tabsBg, borderRadius: 10, padding: 3 }}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value}
            onClick={() => onChange(o.value)} style={{
            flex: 1, border: "none", borderRadius: 8, padding: "7px 0",
            fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: "inherit",
            background: value === o.value ? C.surface : "transparent",
            color: value === o.value ? C.ink : C.textSoft,
            boxShadow: value === o.value ? "0 1px 4px rgba(31,39,46,0.12)" : "none",
            WebkitTapHighlightColor: "transparent", minHeight: 36, touchAction: "manipulation",
          }}>{o.label}</button>
        ))}
      </div>
    </div>
  );
}
/* Rangée de réglage avec interrupteur (écran ⚙️ Réglages). */
function ToggleRow({ label, hint, value, onChange }) {
  return (
    <div style={{
      width: "100%", background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14,
      padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
    }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        {hint ? <span style={{ fontSize: 12, color: C.textSoft, lineHeight: 1.4 }}>{hint}</span> : null}
      </span>
      <button type="button" onClick={() => onChange(!value)} aria-pressed={value} style={{
        marginLeft: "auto", flex: "none", width: 46, height: 28, borderRadius: 999,
        border: "none", background: value ? C.teal : C.border, cursor: "pointer",
        position: "relative", transition: "background .15s", padding: 0,
        WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
      }}>
        <span style={{
          position: "absolute", top: 3, left: value ? 21 : 3, width: 22, height: 22,
          borderRadius: 999, background: "#fff", transition: "left .15s",
          boxShadow: "0 1px 3px rgba(31,39,46,0.25)",
        }} />
      </button>
    </div>
  );
}
function ScanQuotaNote({ left, onUnlocked }) {
  if (left <= 0) {
    if (isNative()) return <PaywallCard onUnlocked={onUnlocked} />;
    return (
      <div style={{
        width: "100%", fontSize: 12.5, color: C.textSoft, background: C.glass,
        border: `1px dashed ${C.dashed}`, borderRadius: 10, padding: "10px 12px", textAlign: "center",
      }}>
        {t("scan.out.web")}
      </div>
    );
  }
  if (left < 3) {
    return (
      <div style={{ width: "100%", fontSize: 11.5, color: C.faint, textAlign: "center" }}>
        {tn("scan.left", left)}
      </div>
    );
  }
  return null;
}
/* Paywall natif (RevenueCat) : remplace le panneau d'attente quand les scans
   gratuits sont épuisés. Si l'offre est indisponible (clé absente, produit pas
   prêt, hors-ligne), on retombe sur le même panneau « bientôt » que le web. */
function PaywallCard({ onUnlocked }) {
  const [offer, setOffer] = useState(null); // null = chargement | false = indisponible | { price, pkg }
  const [busy, setBusy] = useState(null); // null | "buy" | "restore"
  const [note, setNote] = useState(null);
  useEffect(() => {
    let alive = true;
    getOffer().then((o) => { if (alive) setOffer(o || false); });
    return () => { alive = false; };
  }, []);
  async function onBuy() {
    setBusy("buy"); setNote(null);
    try {
      const r = await buy(offer.pkg);
      if (r === true) onUnlocked();
      else if (r !== "cancelled") setNote(t("paywall.buyFailed"));
    } catch (e) { setNote(t("paywall.buyFailed")); }
    setBusy(null);
  }
  async function onRestore() {
    setBusy("restore"); setNote(null);
    try {
      if (await restore()) onUnlocked();
      else setNote(t("paywall.noPurchase"));
    } catch (e) { setNote(t("paywall.restoreFailed")); }
    setBusy(null);
  }
  const box = {
    width: "100%", background: C.glass, border: `1px dashed ${C.dashed}`,
    borderRadius: 10, padding: "12px", textAlign: "center",
    display: "flex", flexDirection: "column", gap: 8,
  };
  if (offer === null) {
    return <div style={box}><div style={{ fontSize: 12.5, color: C.textSoft }}>{t("paywall.loading")}</div></div>;
  }
  if (offer === false) {
    return <div style={box}><div style={{ fontSize: 12.5, color: C.textSoft }}>{t("scan.out.web")}</div></div>;
  }
  return (
    <div style={box}>
      <div style={{ fontSize: 12.5, color: C.textSoft }}>{t("paywall.used", { n: FREE_SCANS })}</div>
      <Btn variant="accent" grow disabled={!!busy} onClick={onBuy}>
        {busy === "buy" ? t("paywall.busy") : t("paywall.buy", { price: offer.price })}
      </Btn>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <LinkBtn onClick={busy ? undefined : onRestore}>
          {busy === "restore" ? t("paywall.restoring") : t("paywall.restore")}
        </LinkBtn>
      </div>
      {note && <div style={{ fontSize: 12, color: C.red }}>{note}</div>}
      <div style={{ fontSize: 11, color: C.faint }}>{t("paywall.oneTime")}</div>
    </div>
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
/* ----- Exercices : libellés (dérivés de techNames.js) et cache local ----- */
const KIND_BY_LESSON_ID = Object.fromEntries(
  Object.entries(TECH_NAMES).map(([kind, tech]) => [tech.lesson, kind])
);
const exoName = (lessonId) => withArticle(KIND_BY_LESSON_ID[lessonId], getLang());
/* Le cache fige hint/explain dans la langue de génération : au changement de
   langue, il est invalidé via l'estampille __lang (les vieux caches sans
   estampille sont réputés FR). */
function loadExoCache() {
  const c = readSync(KEYS.exos);
  if (!c || typeof c !== "object") return {};
  if ((c.__lang || "fr") !== getLang()) return {};
  return c;
}
function saveExoCache(c) {
  c.__lang = getLang();
  persist(KEYS.exos, c);
}

/* La leçon sélectionnée (ix) vit dans App : le coach (📚 Revoir cette
   technique) doit pouvoir l'imposer depuis l'écran de jeu. */
function LearnView({ ix, onSelectIx }) {
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [exo, setExo] = useState(null); // null | "searching" | exercice
  const refillRef = useRef(new Set()); // kinds en cours de refill (anti-cumul)
  const L = LESSONS[ix];
  const LT = lessonText(L, getLang());
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
      const ex = getExercise(kind, { budgetMs: 600, lang: getLang() });
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
      const ex = getExercise(kind, { lang: getLang() }); // jamais null : repli transformation
      setRevealed(false); setShowHint(false);
      setExo(ex);
      if (ex) refillCache(kind);
    }, 50);
  }
  function backToGuided() { setExo(null); setRevealed(false); setShowHint(false); }

  const board = isExo
    ? (revealed ? exo : { ...exo, unit: [], focus: [], target: undefined })
    : L;
  const question = isExo ? t("learn.findIt", { name: exoName(L.id) }) : LT.question;
  const hint = isExo ? exo.hint : LT.hint;
  return (
    <>
      <div style={{ width: W, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2, alignItems: "center" }}>
        {LESSONS.map((l, i) => {
          const newSection = i === 0 || LESSONS[i - 1].level !== l.level;
          const sectionLabel =
            l.level === "advanced" ? t("learn.section.advanced") :
            l.level === "intermediate" ? t("learn.section.intermediate") : t("learn.section.classic");
          return (
            <Fragment key={l.id}>
              {newSection && (
                <span style={{
                  flex: "0 0 auto", fontSize: 10, fontWeight: 800, letterSpacing: 0.5,
                  textTransform: "uppercase", color: C.gray, whiteSpace: "nowrap",
                  padding: i === 0 ? "0 2px" : "0 4px 0 8px",
                  borderLeft: i === 0 ? "none" : `1px solid ${C.borderSoft}`,
                }}>{sectionLabel}</span>
              )}
              <button type="button" onClick={() => onSelectIx(i)} style={{
                flex: "0 0 auto", border: `1px solid ${i === ix ? C.teal : C.border}`,
                background: i === ix ? C.teal : C.surface, color: i === ix ? C.onAccent : C.ink,
                borderRadius: 999, padding: "7px 12px", fontSize: 12.5, fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                WebkitTapHighlightColor: "transparent",
                minHeight: 44, touchAction: "manipulation",
              }}>
                {l.num} · {lessonText(l, getLang()).title}
              </button>
            </Fragment>
          );
        })}
      </div>

      <div style={{
        width: W, background: C.surface, border: `1px solid ${C.borderSoft}`, borderRadius: 14,
        padding: "12px 14px", display: "flex", flexDirection: "column", gap: 6,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>{LT.title}</div>
        <p style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, color: C.textStrong }}>{LT.concept}</p>
      </div>

      <div style={{ position: "relative" }}>
        <LessonBoard lesson={board} revealed={revealed} />
        {exo === "searching" && (
          <div style={{
            position: "absolute", inset: 0, background: C.overlay,
            borderRadius: 10, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5,
          }}>
            <div style={{
              width: 34, height: 34, border: `3px solid ${C.line}`, borderTopColor: C.teal,
              borderRadius: "50%", animation: "scspin .9s linear infinite",
            }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: C.msgInfoFg }}>{t("learn.searching")}</div>
          </div>
        )}
      </div>
      {Object.keys(board.notes || {}).length > 0 && (
        <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
          {t("learn.candidatesNote")}
        </div>
      )}
      {isExo && (
        <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
          {exo.source === "transform" ? t("learn.training") : t("learn.real")}
          {exo.workedNotes ? t("learn.workedNotes") : ""}
        </div>
      )}

      <div style={{
        width: W, background: C.surface, border: `1px solid ${C.borderSoft}`,
        borderTop: `5px solid ${C.yellow}`, borderRadius: 14, padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 9,
        boxShadow: "0 8px 24px rgba(31,39,46,0.08)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14.5 }}>🎓 {question}</div>
        {showHint && !revealed && (
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: C.textSoft }}>💡 <Rich text={hint} /></p>
        )}
        {revealed && !isExo && (
          <>
            {LT.steps.map((s, i) => (
              <div key={i} style={{
                border: `1px solid ${C.hintBorder}`, background: C.hintBg,
                borderRadius: 10, padding: "8px 10px", fontSize: 13.5, lineHeight: 1.5,
              }}>
                <Rich text={s} />
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, background: C.ink, color: C.onInk,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, fontWeight: 800, fontFamily: NUMFONT,
              }}>{L.answer}</div>
              <div style={{ fontSize: 13, color: C.gray }}>
                {t("learn.in")} <strong style={{ color: C.ink }}>{cellName(L.target, getLang())}</strong>
              </div>
            </div>
          </>
        )}
        {revealed && isExo && (
          <>
            {exo.explain.map((s, i) => (
              <div key={i} style={{
                border: `1px solid ${C.hintBorder}`, background: C.hintBg,
                borderRadius: 10, padding: "8px 10px", fontSize: 13.5, lineHeight: 1.5,
              }}>
                <Rich text={s} />
              </div>
            ))}
            {exo.target != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: C.ink, color: C.onInk,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, fontWeight: 800, fontFamily: NUMFONT,
                }}>{exo.answer}</div>
                <div style={{ fontSize: 13, color: C.gray }}>
                  {t("learn.in")} <strong style={{ color: C.ink }}>{cellName(exo.target, getLang())}</strong>
                  {Object.keys(exo.removals).length ? t("learn.elimNote") : ""}
                </div>
              </div>
            )}
            {exo.source !== "transform" && (
              <div style={{ fontSize: 11.5, color: C.gray }}>
                {t("learn.multiSpot")}
              </div>
            )}
          </>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          {!revealed && <Btn grow onClick={() => setShowHint(true)} disabled={showHint || exo === "searching"}>{t("learn.hint")}</Btn>}
          {!revealed && <Btn variant="accent" grow onClick={() => setRevealed(true)} disabled={exo === "searching"}>{t("btn.seeSolution")}</Btn>}
          {revealed && <Btn grow onClick={() => { setRevealed(false); setShowHint(false); }}>{t("learn.hide")}</Btn>}
          {revealed && !isExo && ix < LESSONS.length - 1 && (
            <Btn variant="primary" grow onClick={() => onSelectIx(ix + 1)}>{t("learn.nextTech")}</Btn>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Btn grow onClick={newExercise} disabled={exo === "searching"}>
            {t("learn.newExample")}
          </Btn>
        </div>
      </div>
      {isExo && <LinkBtn onClick={backToGuided}>{t("learn.backGuided")}</LinkBtn>}
      <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
        {t("learn.footer")}
      </div>
    </>
  );
}

/* ================================================================
   Onglet JOUER
   ================================================================ */
export default function App() {
  const [tab, setTab] = useState("play");
  const [lessonIx, setLessonIx] = useState(0); // leçon affichée dans Apprendre (remonté pour 📚 Revoir)
  const [screen, setScreen] = useState("home"); // 'home' | 'levels' | 'board' | 'stats' | 'settings'
  /* Synchrone sur le web (localStorage) ; en natif le miroir mémoire est vide
     au premier rendu — corrigé juste après par loadAll() au boot. */
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS, ...(readSync(KEYS.settings) || {}) }));
  function updateSettings(patch) {
    setSettings((s) => {
      const next = { ...s, ...patch };
      persist(KEYS.settings, next);
      return next;
    });
  }
  /* Langue : réglage manuel ou auto (navigator.language). setLang au RENDER,
     pas en effet : les t() de ce render doivent déjà lire le bon dictionnaire. */
  const lang = settings.lang === "en" || settings.lang === "fr" ? settings.lang : detectLang();
  setLang(lang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const [grid, setGrid] = useState(Array(81).fill(0));
  const [givens, setGivens] = useState(Array(81).fill(false));
  const [notes, setNotes] = useState(Array.from({ length: 81 }, () => []));
  const [phase, setPhase] = useState("edit"); // 'edit' | 'play'
  const [gameLevel, setGameLevel] = useState(null); // 1-4 (grille générée) | null (scan/manuel)
  /* Origine de la partie : null (libre/scan) ou { type: "daily", date }.
     Persisté dans KEYS.save — un défi repris le lendemain garde sa réussite. */
  const [gameOrigin, setGameOrigin] = useState(null);
  const [dailyDone, setDailyDone] = useState({}); // { "YYYY-MM-DD": true }
  const [elapsed, setElapsed] = useState(0); // miroir d'elapsedRef pour affichage + persistance
  const [, setClockTick] = useState(0); // re-render 1 s pour l'affichage du chrono
  const [stats, setStats] = useState(() => normalizeStats(readSync(KEYS.stats)));
  const [hintsUsed, setHintsUsed] = useState(0); // 👣/🎯 utilisés dans la partie courante
  const [assisted, setAssisted] = useState(false); // Tout résoudre / Révéler → pas de record
  const [generating, setGenerating] = useState(false);
  const [sel, setSel] = useState(null);
  const [noteMode, setNoteMode] = useState(false);
  /* Dernier mode appliqué par « Noter » ("snyder" | "complete" | null) —
     pilote le LinkBtn de bascule ponctuelle. Le ref garde le flash
     pédagogique à une seule apparition par partie. */
  const [lastNotation, setLastNotation] = useState(null);
  const notationFlashRef = useRef(false);
  const [plan, setPlan] = useState(null);
  const [level, setLevel] = useState(0); // 0 indice1, 1 indice2, 2 solution
  const [msg, setMsg] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scansUsed, setScansUsed] = useState(0); // chargé au boot via loadAll()
  const [unlimited, setUnlimited] = useState(false); // entitlement RevenueCat (natif)
  const scansLeft = unlimited ? Infinity : Math.max(0, FREE_SCANS - scansUsed);
  const [solRef, setSolRef] = useState(null);
  /* Grille à plusieurs solutions (scan/saisie) : solRef n'est qu'UNE solution
     parmi d'autres — on ne s'en sert plus pour juger les chiffres du joueur
     (conflits uniquement), sinon « Vérifier » accuse à tort. Jamais persisté :
     recalculé au restore par le même solveGrid. */
  const [multiSol, setMultiSol] = useState(false);
  /* Panneau bloquant « plusieurs solutions » avant verrouillage (M1) : la grille
     reste éditable pendant qu'il est ouvert — on re-résout au « Jouer quand même ». */
  const [multiSolPrompt, setMultiSolPrompt] = useState(false);
  const [errorCells, setErrorCells] = useState(new Set());
  const [loaded, setLoaded] = useState(false);
  /* Animations (T3) — stamps pour rejouer les keyframes via un changement de key */
  const [pop, setPop] = useState(null); // {cell, stamp} : chiffre qui vient d'être posé
  const [sweep, setSweep] = useState(null); // {delays: Map(cell→ms), stamp} : zone complétée
  const [padPulse, setPadPulse] = useState(null); // {digit, stamp} : chiffre épuisé
  const [celebrate, setCelebrate] = useState(null); // stamp : grille terminée
  const [shake, setShake] = useState(null); // {cells: Set, stamp} : erreurs / conflits

  const histRef = useRef([]);
  const wonHandledRef = useRef(false); // garde StrictMode/re-renders de l'effet de victoire
  const segStartRef = useRef(null); // timestamp du segment de chrono ouvert (jamais persisté)
  const elapsedRef = useRef(0); // total en secondes — source de vérité, lue à la victoire
  const fileRef = useRef(null);
  const panelRef = useRef(null);
  const msgTimer = useRef(null);
  const errTimer = useRef(null);
  const sampleIx = useRef(0);
  const sweepTimer = useRef(null);
  const celebTimer = useRef(null);

  /* ----- déclencheurs d'animations (appelés aux sites de pose uniquement) ----- */
  const popCell = (cell) => { haptic("light"); setPop({ cell, stamp: Date.now() }); };
  const doShake = (cells) => { haptic("error"); setShake({ cells: new Set(cells), stamp: Date.now() }); };
  function animateMove(before, ng, d) {
    if (ng.filter((v) => v === d).length === 9) setPadPulse({ digit: d, stamp: Date.now() });
    if (isComplete(ng)) {
      haptic("success");
      setCelebrate(Date.now());
      if (celebTimer.current) clearTimeout(celebTimer.current);
      celebTimer.current = setTimeout(() => setCelebrate(null), 1700);
      return;
    }
    const units = completedUnits(before, ng);
    if (!units.length) return;
    haptic("success");
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

  /* ----- compteurs de partie : remise à zéro (nouvelle grille, verrouillage,
     recommencer) — chrono, indices utilisés, drapeau « assistée » ----- */
  function resetClock() {
    elapsedRef.current = 0;
    setElapsed(0);
    // Segment ouvert : repart de maintenant, la fermeture n'ajoutera donc ~rien.
    if (segStartRef.current != null) segStartRef.current = Date.now();
    setHintsUsed(0);
    setAssisted(false);
  }

  /* ----- stats : mise à jour + persistance en un point unique ----- */
  function bumpStats(fn) {
    setStats((s) => {
      const next = fn(s || emptyStats());
      persist(KEYS.stats, next);
      return next;
    });
  }

  /* ----- messages ----- */
  function flash(text, type, ms) {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMsg({ text, type: type || "info" });
    msgTimer.current = setTimeout(() => setMsg(null), ms || 4600);
  }

  /* ----- historique ----- */
  function pushHist() {
    histRef.current.push({ grid: grid.slice(), notes: notes.map((a) => a.slice()) });
    if (histRef.current.length > 60) histRef.current.shift();
  }
  function undo() {
    const h = histRef.current.pop();
    if (!h) { flash(t("flash.nothingToUndo")); return; }
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
    if (sel === null) { flash(t("flash.touchCellFirst")); return; }
    if (phase === "edit") {
      pushHist();
      const ng = grid.slice();
      ng[sel] = ng[sel] === d ? 0 : d;
      setGrid(ng);
      if (ng[sel] !== 0) popCell(sel);
      return;
    }
    if (givens[sel]) { flash(t("flash.givenCell"), "warn"); return; }
    if (noteMode) {
      if (grid[sel] !== 0) { flash(t("flash.eraseFirst")); return; }
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
      flash(t("flash.conflict"), "warn");
    }
    else if (isComplete(ng)) flash(t("flash.won"), "success");
  }
  function eraseSel() {
    clearErrors();
    if (sel === null) { flash(t("flash.touchCell")); return; }
    if (phase === "play" && givens[sel]) { flash(t("flash.givenCell"), "warn"); return; }
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[sel] = 0; nn[sel] = [];
    setGrid(ng); setNotes(nn);
  }

  /* ----- cycle de vie de la grille ----- */
  function newGame(lvl) {
    setScreen("board"); setGenerating(true);
    setPlan(null); setSel(null); setNoteMode(false); clearErrors(); resetNotationCue();
    // setTimeout : laisse React peindre l'overlay avant l'appel synchrone.
    setTimeout(() => {
      try {
        const p = generatePuzzle(lvl);
        const g = p.grid.split("").map(Number);
        setGrid(g);
        setGivens(g.map((v) => v !== 0));
        setNotes(Array.from({ length: 81 }, () => []));
        setSolRef(p.solution.split("").map(Number));
        setMultiSol(false); setMultiSolPrompt(false); // générée = solution unique garantie
        setPhase("play");
        setGameLevel(p.level);
        setGameOrigin(null);
        resetClock();
        bumpStats((s) => recordStart(s, levelKey(p.level)));
        histRef.current = [];
        if (p.level === lvl) flash(t("flash.newGrid", { name: levelName(p.level) }), "success");
        else flash(t("flash.fallbackGrid", { want: levelName(lvl), got: levelName(p.level) }), "warn");
      } finally {
        setGenerating(false);
      }
    }, 50);
  }
  /* ----- défi du jour ----- */
  function startDaily() {
    const today = localDateStr();
    // Le défi du jour est déjà en cours → reprendre la partie, pas régénérer.
    if (phase === "play" && !won && gameOrigin && gameOrigin.type === "daily" && gameOrigin.date === today) {
      setScreen("board");
      return;
    }
    setScreen("board"); setGenerating(true);
    setPlan(null); setSel(null); setNoteMode(false); clearErrors(); resetNotationCue();
    // setTimeout : laisse React peindre l'overlay avant l'appel synchrone —
    // indispensable ici, la génération du défi n'a pas de time-box (cf. daily.js).
    setTimeout(() => {
      try {
        const store = readSync(KEYS.daily) || {};
        let p = store.puzzles && store.puzzles[today];
        if (!p || String(p.grid || "").length !== 81 || String(p.solution || "").length !== 81) {
          p = dailyPuzzle(today);
          // Une génération par jour et par appareil : seule celle du jour est gardée.
          persist(KEYS.daily, { done: store.done || {}, puzzles: { [today]: p } });
        }
        const g = p.grid.split("").map(Number);
        setGrid(g);
        setGivens(g.map((v) => v !== 0));
        setNotes(Array.from({ length: 81 }, () => []));
        setSolRef(p.solution.split("").map(Number));
        setMultiSol(false); setMultiSolPrompt(false);
        setPhase("play");
        setGameLevel(p.level);
        setGameOrigin({ type: "daily", date: today });
        resetClock();
        bumpStats((s) => recordStart(s, levelKey(p.level)));
        histRef.current = [];
        if (p.level === p.targetLevel) flash(t("flash.dailyStart", { date: fmtDailyDate(today), name: levelName(p.level) }), "success");
        else flash(t("flash.dailyFallback", { want: levelName(p.targetLevel), got: levelName(p.level) }), "warn");
      } finally {
        setGenerating(false);
      }
    }, 50);
  }
  function lockGrid(solution, multi) {
    setSolRef(solution);
    setMultiSol(multi);
    setGivens(grid.map((v) => v !== 0));
    setPhase("play");
    setGameLevel(null);
    setGameOrigin(null);
    resetClock();
    bumpStats((s) => recordStart(s, "custom"));
    histRef.current = [];
    setPlan(null); setNoteMode(false); resetNotationCue();
    if (multi) flash(t("flash.lockedMulti"), "warn");
    else flash(t("flash.locked"), "success");
  }
  function startPlay() {
    const filled = grid.filter((v) => v).length;
    if (filled < 8) { flash(t("flash.needGivens"), "warn"); return; }
    if (conflictSet(grid).size) { flash(t("flash.conflictBeforeStart"), "warn"); return; }
    const { count, solution } = solveGrid(grid);
    if (count === 0 || !solution) { flash(t("flash.noSolution"), "warn"); return; }
    if (count > 1) { setMultiSolPrompt(true); return; }
    lockGrid(solution, false);
  }
  function playAnyway() {
    setMultiSolPrompt(false);
    // Re-résout l'état COURANT : la grille a pu être corrigée pendant que le panneau était ouvert.
    const { count, solution } = solveGrid(grid);
    if (count === 0 || !solution) { flash(t("flash.noSolution"), "warn"); return; }
    lockGrid(solution, count > 1);
  }
  function backToEdit() {
    setPhase("edit"); setGivens(Array(81).fill(false));
    setSolRef(null); setMultiSol(false); setMultiSolPrompt(false); setPlan(null); setNoteMode(false); setGameLevel(null); setGameOrigin(null);
    resetNotationCue();
    resetClock();
    flash(t("flash.editMode"));
  }
  function clearAll() {
    pushHist();
    setGrid(Array(81).fill(0));
    setNotes(Array.from({ length: 81 }, () => []));
    setGivens(Array(81).fill(false));
    setPhase("edit"); setSolRef(null); setMultiSol(false); setMultiSolPrompt(false); setPlan(null); setSel(null); setGameLevel(null); setGameOrigin(null);
    resetNotationCue();
    resetClock();
  }
  function restartPuzzle() {
    pushHist();
    setGrid(grid.map((v, i) => (givens[i] ? v : 0)));
    setNotes(Array.from({ length: 81 }, () => []));
    setPlan(null);
    resetClock();
    flash(t("flash.restarted"));
  }
  function loadSample() {
    const s = SAMPLES[sampleIx.current % SAMPLES.length];
    sampleIx.current++;
    pushHist();
    setGrid(s.split("").map(Number));
    setNotes(Array.from({ length: 81 }, () => []));
    setGivens(Array(81).fill(false));
    setPhase("edit"); setSolRef(null); setMultiSol(false); setMultiSolPrompt(false); setPlan(null); setSel(null);
    flash(t("flash.sampleLoaded"));
  }

  /* ----- solve complet ----- */
  function solveAll() {
    const baseGrid = phase === "play" ? grid.map((v, i) => (givens[i] ? v : 0)) : grid;
    const { count, solution } = solveGrid(baseGrid);
    if (!solution) { flash(t("flash.unsolvable"), "warn"); return; }
    pushHist();
    if (phase === "play") setAssisted(true); // complétée par le solveur : pas de record
    let wrong = 0;
    if (phase === "play") grid.forEach((v, i) => { if (v && !givens[i] && v !== solution[i]) wrong++; });
    setGrid(solution);
    setNotes(Array.from({ length: 81 }, () => []));
    setPlan(null);
    // Grille ambiguë : pas de décompte « corrigés » — il comparerait le joueur
    // à une branche arbitraire alors que la sienne peut être tout aussi valide.
    if (count > 1) flash(t("flash.multiSolved"), "warn", 9000);
    else flash(wrong ? tn("flash.solvedFixed", wrong) : t("flash.solved"), "success");
  }

  /* ----- coach : case précise / aléatoire ----- */
  function hintForCell() {
    if (phase !== "play") { flash(t("flash.startFirst")); return; }
    if (sel === null) { flash(t("flash.selectEmpty")); return; }
    const target = sel;
    if (grid[target] !== 0) {
      const cell = cellName(target, getLang()), d = grid[target];
      if (givens[target]) flash(t("flash.partOfPuzzle", { cell }));
      else if (multiSol) flash(
        conflictSet(grid).has(target)
          ? t("flash.conflictAt", { d, cell })
          : t("flash.coherentMulti", { cell, d }),
        conflictSet(grid).has(target) ? "warn" : "info"
      );
      else if (solRef) flash(
        d === solRef[target] ? t("flash.correct", { cell, d }) : t("flash.wrong", { d, cell }),
        d === solRef[target] ? "success" : "warn"
      );
      else flash(t("flash.hasDigit", { cell }));
      return;
    }
    const p = buildPlan(grid, target, getLang());
    if (p && (!solRef || multiSol || p.digit === solRef[target])) { setPlan(p); setLevel(0); setHintsUsed((h) => h + 1); }
    else {
      const kind = stuckPlanFor(false);
      if (kind === "wrong-digit") setPlan({ kind: "stuckError" });
      else if (kind === "multi-sol") setPlan({ kind: "stuckMulti", target });
      else setPlan({ kind: "stuck", target }); // grille unique : panneau par case inchangé
      setLevel(0);
    }
  }
  // Quand plus rien n'est déductible : choisir le panneau honnête. Sur grille
  // ambiguë, seule une contradiction prouve une erreur (solRef n'est qu'une
  // solution parmi d'autres) — cohérent avec « Vérifier » (checkErrors).
  function stuckPlanFor(anyPlan) {
    const hasWrongDigit = multiSol
      ? [...conflictSet(grid)].some((i) => !givens[i])
      : !!solRef && grid.some((v, i) => v && !givens[i] && v !== solRef[i]);
    return stuckPanelKind({ multiSol, hasWrongDigit, anyPlan });
  }
  function randomHint() {
    if (phase !== "play") { flash(t("flash.startFirst")); return; }
    const empties = [];
    grid.forEach((v, i) => { if (!v) empties.push(i); });
    if (!empties.length) { flash(t("flash.gridComplete"), "success"); return; }
    const plans = [];
    for (const i of empties) {
      const p = buildPlan(grid, i, getLang());
      // multiSol : solRef n'est qu'une solution possible — si le joueur en suit
      // une autre, un plan valide peut la contredire ; on ne filtre donc pas.
      if (p && (!solRef || multiSol || p.digit === solRef[i])) plans.push(p);
    }
    if (!plans.length) {
      const kind = stuckPlanFor(false);
      setPlan({ kind: { "wrong-digit": "stuckError", "multi-sol": "stuckMulti", "beyond-coach": "stuckAll" }[kind] });
      setLevel(0);
      return;
    }
    const min = Math.min(...plans.map((p) => p.difficulty));
    const easiest = plans.filter((p) => p.difficulty === min);
    const p = easiest[Math.floor(Math.random() * easiest.length)];
    p.revealTech = true; // leçon guidée : la technique est annoncée dès l'indice 1
    setSel(p.target); setPlan(p); setLevel(0);
    setHintsUsed((h) => h + 1);
  }
  // 📚 Revoir cette technique (👣) : bascule sur l'onglet Apprendre, leçon du keyKind.
  function openLesson(kind) {
    const L = LESSON_BY_KIND[kind];
    if (!L) return;
    const ix = LESSONS.findIndex((l) => l.id === L.id);
    if (ix >= 0) setLessonIx(ix);
    setTab("learn");
  }
  function revealAnyway(target) {
    if (!solRef) { flash(t("flash.noSolutionAvailable"), "warn"); return; }
    setAssisted(true); // chiffre révélé : la partie n'entre plus au tableau des records
    let d = solRef[target];
    if (multiSol) {
      // solRef peut contredire la branche (valide) suivie par le joueur :
      // on résout depuis l'état COURANT pour révéler un chiffre compatible.
      const { solution } = solveGrid(grid);
      if (!solution) { flash(t("flash.contradiction"), "warn"); return; }
      d = solution[target];
    }
    setPlan({
      kind: "ok", target, digit: d, chain: [], hint1: "", hint2: "",
      tech: t("reveal.tech"),
      paras: [
        t("reveal.p1", { list: frTechList(getLang()), cell: cellName(target, getLang()) }),
        t("reveal.p2", { cell: cellName(target, getLang()), d }),
        t("reveal.p3"),
      ],
      unitCells: [],
    });
    setLevel(2);
  }
  // Mur légitime (stuckAll) : révèle LA case vide au moins de candidats —
  // celle qui a le plus de chances de relancer les déductions du coach.
  function revealLeastCandidates() {
    let best = null, bestN = 10;
    for (let i = 0; i < 81; i++) {
      if (grid[i] !== 0) continue;
      const n = candidatesFromGrid(grid, i).length;
      if (n < bestN) { bestN = n; best = i; }
    }
    if (best === null) { closePlan(); return; }
    setSel(best);
    revealAnyway(best);
  }
  function placeFromPlan() {
    if (!plan || plan.kind !== "ok" || plan.target == null) return;
    const target = plan.target, d = plan.digit;
    if (grid[target] !== 0) { setPlan(null); return; }
    clearErrors();
    pushHist();
    const ng = grid.slice(); const nn = notes.map((a) => a.slice());
    ng[target] = d; nn[target] = [];
    PEERS[target].forEach((p) => {
      const k = nn[p].indexOf(d);
      if (k >= 0) nn[p].splice(k, 1);
    });
    setGrid(ng); setNotes(nn); setSel(target); setPlan(null);
    popCell(target); animateMove(grid, ng, d);
    if (isComplete(ng)) flash(t("flash.won"), "success");
    else flash(t("flash.placed", { cell: cellName(target, getLang()), d }), "success");
  }
  function closePlan() { setPlan(null); setLevel(0); }

  /* ----- vérification des erreurs à l'instant t ----- */
  function checkErrors() {
    if (phase !== "play") { flash(t("flash.playOnly")); return; }
    const placed = [];
    grid.forEach((v, i) => { if (v && !givens[i]) placed.push(i); });
    if (solRef && !multiSol) {
      const wrong = placed.filter((i) => grid[i] !== solRef[i]);
      if (!wrong.length) {
        flash(tn("flash.noErrors", placed.length), "success");
        return;
      }
      showErrors(wrong);
      flash(tn("flash.errors", wrong.length), "warn");
    } else {
      // Grille à solutions multiples : pas de référence unique, on vérifie les conflits.
      const wrong = [...conflictSet(grid)].filter((i) => !givens[i]);
      if (!wrong.length) {
        flash(tn("flash.noConflicts", placed.length), "success");
        return;
      }
      showErrors(wrong);
      flash(tn("flash.conflicts", wrong.length), "warn");
    }
  }

  /* ----- « ✍️ Noter » (bascule : efface s'il y a des notes, sinon note selon la stratégie) ----- */
  function applyNotation(mode) {
    if (mode === "snyder") { setNotes(snyderNotes(grid)); return; }
    const nn = Array.from({ length: 81 }, () => []);
    for (let i = 0; i < 81; i++) if (grid[i] === 0) nn[i] = candidatesFromGrid(grid, i);
    setNotes(nn);
  }
  function resetNotationCue() {
    setLastNotation(null);
    notationFlashRef.current = false;
  }
  /* Bascule ponctuelle : re-note CETTE grille dans l'autre mode, sans toucher
     à la préférence Réglages. */
  function switchNotation() {
    const other = lastNotation === "snyder" ? "complete" : "snyder";
    pushHist();
    applyNotation(other);
    setLastNotation(other);
    flash(t(`flash.notation.applied.${other}`));
  }
  function applyNotes() {
    if (phase !== "play") { flash(t("flash.playOnly")); return; }
    pushHist();
    if (notes.some((a) => a.length)) {
      setNotes(Array.from({ length: 81 }, () => []));
      setLastNotation(null);
      flash(t("flash.notesCleared"));
      return;
    }
    const mode = notationFor(levelKey(gameLevel), settings.notation);
    applyNotation(mode);
    setLastNotation(mode);
    if (notationFlashRef.current) {
      flash(t(`flash.notation.applied.${mode}`));
      return;
    }
    notationFlashRef.current = true;
    const fromPref = settings.notation === "snyder" || settings.notation === "complete";
    const key = fromPref
      ? `flash.notation.pref.${mode}`
      : mode === "complete"
        ? "flash.notation.complete.level"
        : gameLevel ? "flash.notation.snyder.level" : "flash.notation.snyder.custom";
    flash(t(key, { level: gameLevel ? levelName(gameLevel) : "" }), "info", 9000);
  }

  /* ----- OCR photo (via /api/ocr sur Vercel) ----- */
  function imageUrlToJpegBase64(url, maxDim, cleanup) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const done = (settle, arg) => { if (cleanup) cleanup(); settle(arg); };
      img.onload = () => {
        try {
          const sc = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * sc));
          const h = Math.max(1, Math.round(img.height * sc));
          const cv = document.createElement("canvas");
          cv.width = w; cv.height = h;
          cv.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = cv.toDataURL("image/jpeg", 0.85);
          done(resolve, dataUrl.split(",")[1]);
        } catch (e) { done(reject, e); }
      };
      img.onerror = () => done(reject, new Error("image"));
      img.src = url;
    });
  }
  function unlockScans() {
    setUnlimited(true);
    flash(t("flash.unlocked"), "success");
  }
  function openScan() {
    if (scansLeft <= 0) {
      flash(isNative() ? t("flash.scansOutNative") : t("flash.scansOutWeb"), "info");
      return;
    }
    if (isNative()) { scanNative(); return; }
    if (fileRef.current) fileRef.current.click();
  }
  async function onPhoto(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    await processScan(url, () => URL.revokeObjectURL(url));
  }
  /* Natif : la caméra du système (plus fluide que l'input fichier du WebView),
     puis le même pipeline de redimensionnement et d'appel API que le web. */
  async function scanNative() {
    let shot;
    try {
      const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
      shot = await Camera.getPhoto({
        resultType: CameraResultType.Base64,
        quality: 85,
        correctOrientation: true,
        source: CameraSource.Prompt,
        promptLabelHeader: t("cam.header"),
        promptLabelPicture: t("cam.picture"),
        promptLabelPhoto: t("cam.photo"),
        promptLabelCancel: t("cam.cancel"),
      });
    } catch (err) {
      return; // annulation (ou permission refusée) : on n'affiche rien
    }
    if (!shot || !shot.base64String) return;
    await processScan(`data:image/jpeg;base64,${shot.base64String}`);
  }
  const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;
  async function processScan(srcUrl, cleanup) {
    if (offline()) {
      if (cleanup) cleanup();
      flash(t("flash.offline"), "warn");
      return;
    }
    setScreen("board"); // le scan peut être lancé depuis l'accueil
    setScanning(true);
    try {
      const b64 = await imageUrlToJpegBase64(srcUrl, 1150, cleanup);
      const res = await fetch(`${API_BASE}/api/ocr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: b64, media_type: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Zéro changement serveur : l'UI traduit par code de statut, le texte
        // du serveur (FR) part en console pour le debug.
        if (data && data.error) console.warn("api/ocr:", res.status, data.error);
        flash(res.status === 429 ? t("flash.scanLimit") : t("flash.scanServerError"), "warn");
        return;
      }
      const s = String(data.grid || "").replace(/[^0-9]/g, "");
      if (s.length !== 81) { flash(t("flash.scanBadFormat"), "warn"); return; }
      const ng = s.split("").map(Number);
      const filledCount = ng.filter((v) => v).length;
      pushHist();
      setGrid(ng);
      setNotes(Array.from({ length: 81 }, () => []));
      setGivens(Array(81).fill(false));
      setPhase("edit"); setSolRef(null); setMultiSol(false); setMultiSolPrompt(false); setPlan(null); setSel(null); setGameLevel(null);
      resetNotationCue();
      if (!unlimited) {
        const used = (Number(readSync(KEYS.scans)) || 0) + 1; // relit le storage (robuste multi-onglets)
        persist(KEYS.scans, used);
        setScansUsed(used);
      }
      flash(t("flash.scanOk", { n: filledCount }), "success");
    } catch (err) {
      // Réseau tombé pendant l'appel : ne pas accuser la photo à tort.
      if (offline()) {
        flash(t("flash.offline"), "warn");
      } else {
        flash(t("flash.scanFailed"), "warn");
      }
    } finally {
      setScanning(false);
    }
  }

  /* ----- persistance (storage.js : localStorage sur le web, Preferences en natif) ----- */
  useEffect(() => {
    (async () => {
      try {
        const data = await loadAll();
        const s = data[KEYS.save];
        if (s && Array.isArray(s.grid) && s.grid.length === 81) {
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
            const { count, solution } = solveGrid(gb);
            if (solution) {
              setSolRef(solution); setMultiSol(count > 1); setPhase("play");
              // Grille restaurée DÉJÀ complète : la victoire a été comptée
              // dans la session où elle a eu lieu — sans cette garde, `won`
              // redeviendrait vrai au boot et recordWin serait rejoué à
              // chaque lancement (stats gonflées, finished > started).
              if (isComplete(s.grid)) wonHandledRef.current = true;
            }
          }
          if (s.level >= 1 && s.level <= 5) setGameLevel(s.level);
          if (s.origin && s.origin.type === "daily" && typeof s.origin.date === "string") {
            setGameOrigin({ type: "daily", date: s.origin.date });
          }
          if (Number.isFinite(s.elapsed) && s.elapsed > 0) {
            elapsedRef.current = s.elapsed;
            setElapsed(s.elapsed);
          }
          if (Number.isFinite(s.hintsUsed) && s.hintsUsed > 0) setHintsUsed(s.hintsUsed);
          if (s.assisted === true) setAssisted(true);
        }
        const d = data[KEYS.daily];
        if (d && d.done && typeof d.done === "object") setDailyDone(d.done);
        const st = data[KEYS.settings];
        if (st && typeof st === "object") setSettings((s) => ({ ...s, ...st }));
        const sd = data[KEYS.stats];
        if (sd != null) setStats(normalizeStats(sd));
        const used = Number(data[KEYS.scans]);
        if (Number.isFinite(used) && used > 0) setScansUsed(used);
      } catch (e) { /* première visite ou stockage indisponible */ }
      setLoaded(true);
    })();
  }, []);
  useEffect(() => {
    // Natif : RevenueCat au boot. setUnlimited(true) seulement — un échec
    // ponctuel (hors-ligne) ne doit pas rétrograder un achat déjà connu.
    initPurchases((active) => { if (active) setUnlimited(true); })
      .then((active) => { if (active) setUnlimited(true); })
      .catch(() => { /* SDK indisponible : freemium inchangé */ });
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => {
      persist(KEYS.save, { grid, givens, notes, phase, level: gameLevel, origin: gameOrigin, elapsed, hintsUsed, assisted });
    }, 400);
    return () => clearTimeout(t);
  }, [grid, givens, notes, phase, gameLevel, gameOrigin, elapsed, hintsUsed, assisted, loaded]);

  /* ----- thème : Auto suit le système ; data-theme pilote les variables CSS ----- */
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = settings.theme === "dark" || (settings.theme !== "light" && mq.matches) ? "dark" : "light";
      document.documentElement.dataset.theme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", META_COLOR[resolved]);
    };
    apply();
    if (settings.theme !== "auto") return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [settings.theme]);

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

  /* ----- panneau coach / multi-solutions : scroll en vue ----- */
  useEffect(() => {
    if ((plan || multiSolPrompt) && panelRef.current) {
      setTimeout(() => {
        panelRef.current && panelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 60);
    }
  }, [plan, level, multiSolPrompt]);

  /* ----- dérivés ----- */
  const conflicts = useMemo(() => conflictSet(grid), [grid]);
  const won = useMemo(() => phase === "play" && isComplete(grid), [phase, grid]);
  const counts = useMemo(() => {
    const m = {};
    grid.forEach((v) => { if (v) m[v] = (m[v] || 0) + 1; });
    return m;
  }, [grid]);
  const hasNotes = useMemo(() => notes.some((a) => a.length), [notes]);

  /* ----- chrono : segments horodatés, en pause hors écran ----- */
  const timerRunning = phase === "play" && tab === "play" && screen === "board" && !won;
  useEffect(() => {
    if (!timerRunning) return;
    segStartRef.current = Date.now();
    const close = () => {
      const t0 = segStartRef.current;
      segStartRef.current = null;
      if (t0 != null) {
        elapsedRef.current = addSegment(elapsedRef.current, t0, Date.now());
        setElapsed(elapsedRef.current);
      }
    };
    // App en arrière-plan (ou onglet caché) : le temps ne court pas.
    const onVis = () => {
      if (document.visibilityState === "hidden") close();
      else if (segStartRef.current == null) segStartRef.current = Date.now();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); close(); };
  }, [timerRunning]);
  useEffect(() => {
    if (!timerRunning) return;
    // Tick d'affichage 1 s ; toutes les 15 s, replie le segment ouvert dans
    // `elapsed` (persisté avec la sauvegarde) : un kill de l'app ne perd
    // jamais plus de 15 s de jeu. Le comptage, lui, reste horodaté.
    let n = 0;
    const id = setInterval(() => {
      n++;
      if (n % 15 === 0 && segStartRef.current != null && document.visibilityState !== "hidden") {
        const t0 = segStartRef.current;
        segStartRef.current = Date.now();
        elapsedRef.current = addSegment(elapsedRef.current, t0, segStartRef.current);
        setElapsed(elapsedRef.current);
      } else {
        setClockTick((t) => t + 1);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [timerRunning]);
  const shownSeconds = elapsed + (timerRunning && segStartRef.current != null
    ? Math.max(0, Math.round((Date.now() - segStartRef.current) / 1000)) : 0);

  /* ----- victoire : stats + réussite du défi (une fois par victoire).
     Déclaré APRÈS le useMemo de `won` (deps lues au render) et après l'effet
     chrono : son cleanup a déjà replié le segment ouvert dans elapsedRef. ----- */
  useEffect(() => {
    if (!won) { wonHandledRef.current = false; return; }
    if (wonHandledRef.current) return; // StrictMode et re-renders
    wonHandledRef.current = true;
    const seconds = addSegment(elapsedRef.current, segStartRef.current, Date.now());
    bumpStats((s) => recordWin(s, { levelKey: levelKey(gameLevel), seconds, hints: hintsUsed, assisted }));
    if (gameOrigin && gameOrigin.type === "daily" && !dailyDone[gameOrigin.date]) {
      // Fusionner le `done` RELU du store (pas seulement l'état React, hydraté
      // au boot) : un autre onglet a pu enregistrer des réussites entre-temps —
      // les écraser casserait sa série. Même approche que startDaily.
      const store = readSync(KEYS.daily) || {};
      const nextDone = { ...(store.done || {}), ...dailyDone, [gameOrigin.date]: true };
      setDailyDone(nextDone);
      persist(KEYS.daily, { ...store, done: nextDone });
      const streak = currentStreak(nextDone, localDateStr());
      flash(streak > 1 ? t("flash.dailyStreak", { n: streak }) : t("flash.dailyDone"), "success", 7000);
    }
  }, [won, gameOrigin, dailyDone, gameLevel, hintsUsed, assisted]);
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
    if (sel !== null && i !== sel && PEERS[sel].has(i)) bg = C.peer;
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
    info: { bg: C.msgInfoBg, fg: C.msgInfoFg },
    success: { bg: C.msgSuccessBg, fg: C.msgSuccessFg },
    warn: { bg: C.warnBg, fg: C.warnInk },
  };
  const pStyle = { fontSize: 14, lineHeight: 1.55, margin: 0 };

  /* ================================ RENDER ================================ */
  return (
    <div style={{
      minHeight: "100vh", backgroundColor: C.paper,
      backgroundImage: `linear-gradient(${C.gridPaper} 1px, transparent 1px), linear-gradient(90deg, ${C.gridPaper} 1px, transparent 1px)`,
      backgroundSize: "26px 26px",
      padding: "calc(14px + env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) calc(44px + env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
      display: "flex", flexDirection: "column",
      alignItems: "center", gap: 12, color: C.ink,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      <style>{`:root{${cssVars(C_LIGHT)}}
:root[data-theme="dark"]{${cssVars(C_DARK)}}
button:focus-visible,[role="button"]:focus-visible{outline:2px solid var(--sc-teal);outline-offset:-2px}
@keyframes scspin{to{transform:rotate(360deg)}} summary::-webkit-details-marker{display:none}
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
          <rect x="1.5" y="1.5" width="27" height="27" rx="3" fill={C.surface} stroke={C.ink} strokeWidth="2" />
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
          <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>{t("app.tagline")}</div>
        </div>
        <button type="button" aria-label={t("settings.aria")} title={t("settings.aria")}
          onClick={() => { setTab("play"); setScreen("settings"); }} style={{
            marginLeft: "auto", background: "none", border: "none", fontSize: 20,
            cursor: "pointer", padding: 0, minWidth: 44, minHeight: 44,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "inherit", WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
          }}>⚙️</button>
      </header>

      {/* ---------- Onglets ---------- */}
      <div role="tablist" style={{ width: W, display: "flex", background: C.tabsBg, borderRadius: 12, padding: 3 }}>
        {[["play", t("tabs.play")], ["learn", t("tabs.learn")]].map(([k, l]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} style={{
            flex: 1, border: "none", borderRadius: 10, padding: "8px 0",
            fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: "inherit",
            background: tab === k ? C.surface : "transparent",
            color: tab === k ? C.ink : C.textSoft,
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
      {tab === "learn" ? <LearnView ix={lessonIx} onSelectIx={setLessonIx} /> : screen === "home" ? (
        <>
          {/* ---------- Accueil ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            {(() => {
              const today = localDateStr();
              const inProgress = phase === "play" && !won
                && gameOrigin && gameOrigin.type === "daily" && gameOrigin.date === today;
              const state = dailyDone[today] ? t("daily.state.done") : inProgress ? t("daily.state.inprogress") : t("daily.state.todo");
              return (
                <>
                  <Card accent={!dailyDone[today]} emoji="🗓️" title={t("daily.title")}
                    sub={`${fmtDailyDate(today)} · ${levelName(dailyLevelFor(today))} · ${state}`}
                    onClick={startDaily} />
                  <DailyDots cells={monthCells(today)} done={dailyDone} today={today} />
                </>
              );
            })()}
            {phase === "play" && !won && (
              <Card accent emoji="▶︎" title={t("home.resume")}
                sub={`${gameLevel ? t("home.levelPrefix", { name: levelName(gameLevel) }) : ""}${tn("home.cellsLeft", grid.filter((v) => !v).length)}`}
                onClick={() => setScreen("board")} />
            )}
            <Card emoji="🎲" title={t("home.play")} sub={t("home.play.sub")}
              onClick={() => setScreen("levels")} />
            {scansLeft > 0 && (
              <Card emoji="📷" title={t("home.scan")} sub={t("home.scan.sub")}
                onClick={openScan} />
            )}
            <ScanQuotaNote left={scansLeft} onUnlocked={unlockScans} />
            <Card emoji="📚" title={t("home.learn")} sub={t("home.learn.sub", { n: LESSONS.length })}
              onClick={() => setTab("learn")} />
            <Card emoji="📊" title={t("home.stats")} sub={t("home.stats.sub")}
              onClick={() => setScreen("stats")} />
          </div>
          <LinkBtn onClick={() => { if (phase === "play") clearAll(); setScreen("board"); }}>
            {t("home.manual")}
          </LinkBtn>
          <div style={{ fontSize: 11, color: C.faint }}>v{APP_VERSION}</div>
        </>
      ) : screen === "levels" ? (
        <>
          {/* ---------- Choix de difficulté ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t("levels.title")}</div>
            {LEVEL_IDS.map((n, i) => (
              <Card key={n} emoji={["🟢", "🟡", "🟠", "🔴", "🟣"][i] || "🎲"} title={levelName(n)}
                onClick={() => newGame(n)} />
            ))}
          </div>
          <LinkBtn onClick={() => setScreen("home")}>{t("common.home")}</LinkBtn>
        </>
      ) : screen === "stats" ? (
        <>
          {/* ---------- Stats ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t("stats.title")}</div>
            <StatsView stats={stats} dailyDone={dailyDone} />
          </div>
          <LinkBtn onClick={() => setScreen("home")}>{t("common.home")}</LinkBtn>
        </>
      ) : screen === "settings" ? (
        <>
          {/* ---------- Réglages ---------- */}
          <div style={{ width: W, display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>{t("settings.title")}</div>
            <SegmentRow label={t("settings.theme")} value={settings.theme}
              options={[
                { value: "auto", label: t("settings.theme.auto") },
                { value: "light", label: t("settings.theme.light") },
                { value: "dark", label: t("settings.theme.dark") },
              ]}
              onChange={(v) => updateSettings({ theme: v })} />
            <SegmentRow label={t("settings.lang")} value={settings.lang === "fr" || settings.lang === "en" ? settings.lang : "auto"}
              options={[
                { value: "auto", label: t("settings.lang.auto") },
                { value: "fr", label: "Français" },
                { value: "en", label: "English" },
              ]}
              onChange={(v) => updateSettings({ lang: v })} />
            <SegmentRow label={t("settings.notation")} value={settings.notation}
              options={[
                { value: "auto", label: t("settings.notation.auto") },
                { value: "snyder", label: t("settings.notation.snyder") },
                { value: "complete", label: t("settings.notation.complete") },
              ]}
              onChange={(v) => updateSettings({ notation: v })} />
            <ToggleRow label={t("settings.hideTimer")} hint={t("settings.hideTimer.hint")}
              value={settings.hideTimer} onChange={(v) => updateSettings({ hideTimer: v })} />
          </div>
          <LinkBtn onClick={() => setScreen("home")}>{t("common.home")}</LinkBtn>
        </>
      ) : (
        <>
          {/* ---------- Message / bannière ---------- */}
          {msg ? (
            <div role="status" aria-live="polite" style={{
              width: W, fontSize: 13, fontWeight: 600, lineHeight: 1.45,
              background: msgColors[msg.type].bg, color: msgColors[msg.type].fg,
              borderRadius: 10, padding: "9px 12px",
            }}>
              {msg.text}
            </div>
          ) : phase === "edit" ? (
            <div style={{
              width: W, fontSize: 12.5, color: C.textSoft, background: C.glass,
              border: `1px dashed ${C.dashed}`, borderRadius: 10, padding: "8px 12px", textAlign: "center",
            }}>
              {t("board.editBanner")}
            </div>
          ) : null}

          {/* ---------- Badges : niveau (générée) / plusieurs solutions / chrono ---------- */}
          {phase === "play" && (gameLevel || multiSol || !settings.hideTimer) ? (
            <div style={{ width: W, display: "flex", alignItems: "center", gap: 8 }}>
              {gameLevel ? (
                <span key={celebrate ? `b${celebrate}` : "lvl"}
                  className={celebrate ? "sc-pulse" : undefined} style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
                  color: C.textSoft, background: C.chipBg, border: `1px solid ${C.borderSoft}`,
                  borderRadius: 999, padding: "3px 10px", display: "inline-block",
                  animationDelay: celebrate ? "800ms" : undefined,
                }}>
                  {t("board.levelBadge", { name: levelName(gameLevel) })}
                </span>
              ) : null}
              {multiSol ? (
                <button type="button" onClick={() => flash(t("multiSol.explain"), "warn", 9000)} style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: ".05em", textTransform: "uppercase",
                  color: C.warnInk, background: C.warnBg, border: `1px solid ${C.warnBorder}`,
                  borderRadius: 999, padding: "3px 10px", cursor: "pointer",
                  fontFamily: "inherit", WebkitTapHighlightColor: "transparent", touchAction: "manipulation",
                }}>
                  {t("board.multiSolBadge")}
                </button>
              ) : null}
              {!settings.hideTimer ? (
                <span style={{
                  marginLeft: "auto", fontSize: 11, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                  color: C.textSoft, background: C.chipBg, border: `1px solid ${C.borderSoft}`,
                  borderRadius: 999, padding: "3px 10px",
                }}>
                  ⏱ {formatClock(shownSeconds)}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* ---------- Grille ---------- */}
          <div style={{ position: "relative" }}>
            <div role="group" aria-label={t("a11y.grid")} style={{
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
                    role="button"
                    aria-label={cellAriaLabel({
                      index: i, value: v, given: phase === "play" && givens[i],
                      noteDigits: notes[i], conflict: conflicts.has(i),
                    }, t)}
                    tabIndex={i === (sel ?? 40) ? 0 : -1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(i); }
                    }}
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
                position: "absolute", inset: 0, background: C.overlay,
                borderRadius: 10, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10, zIndex: 5,
              }}>
                <div style={{
                  width: 34, height: 34, border: `3px solid ${C.line}`, borderTopColor: C.teal,
                  borderRadius: "50%", animation: "scspin .9s linear infinite",
                }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: C.msgInfoFg }}>
                  {scanning ? t("overlay.scanning") : t("overlay.generating")}
                </div>
              </div>
            )}
          </div>

          <div style={{ width: W, fontSize: 11.5, color: C.gray, textAlign: "center" }}>
            {phase === "edit"
              ? t("board.help.edit")
              : noteMode
                ? t("board.help.notes")
                : t("board.help.play")}
            {phase === "play" && (
              <div style={{ marginTop: 2 }}>
                {t("board.help.padCount")}
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
                  aria-label={remaining > 0 ? tn("a11y.pad.digit", remaining, { d }) : t("a11y.pad.digitDone", { d })}
                  onClick={() => padPress(d)} style={{
                  background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
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
            <button type="button" onClick={eraseSel} aria-label={t("a11y.pad.erase")} style={{
              background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
              padding: "7px 0 5px", display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 1, cursor: "pointer",
              boxShadow: "0 1px 0 rgba(31,39,46,0.05)", WebkitTapHighlightColor: "transparent",
              fontFamily: "inherit", minHeight: 44,
            }}>
              <span style={{ fontSize: 19 }}>⌫</span>
              <span style={{ fontSize: 9.5, color: C.gray, fontWeight: 600 }}>{t("pad.erase")}</span>
            </button>
          </div>

          {/* ---------- Barres d'action ---------- */}
          {phase === "edit" ? (
            <div style={{ width: W, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="primary" grow onClick={startPlay}>{t("btn.start")}</Btn>
                <Btn variant="accent" grow onClick={openScan} disabled={scanning || !scansLeft}>{t("btn.scan")}</Btn>
              </div>
              <ScanQuotaNote left={scansLeft} onUnlocked={unlockScans} />
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                <LinkBtn onClick={() => setScreen("home")}>{t("common.home")}</LinkBtn>
                <LinkBtn onClick={loadSample}>{t("link.loadSample")}</LinkBtn>
                <LinkBtn onClick={clearAll}>{t("link.clearAll")}</LinkBtn>
                <LinkBtn onClick={undo}>{t("btn.undo")}</LinkBtn>
              </div>
            </div>
          ) : (
            <div style={{ width: W, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn variant="accent" grow onClick={hintForCell}>{t("btn.explain")}</Btn>
                <Btn grow onClick={randomHint}>{t("btn.nextStep")}</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow active={noteMode} ariaPressed={noteMode} onClick={() => setNoteMode((m) => !m)}>{t("btn.notes")}</Btn>
                <Btn grow active={hasNotes} ariaPressed={hasNotes} onClick={applyNotes}>{t("btn.note")}</Btn>
              </div>
              {lastNotation && hasNotes && (
                <div style={{ display: "flex", justifyContent: "center" }}>
                  <LinkBtn onClick={switchNotation}>
                    {lastNotation === "snyder" ? t("link.noteComplete") : t("link.noteSnyder")}
                  </LinkBtn>
                </div>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow onClick={checkErrors}>{t("btn.check")}</Btn>
                <Btn onClick={undo} title={t("btn.undo")} ariaLabel={t("btn.undo")}>↩︎</Btn>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Btn grow onClick={openScan} disabled={scanning || !scansLeft}>{t("btn.scan")}</Btn>
                <Btn grow onClick={solveAll}>{t("btn.solveAll")}</Btn>
              </div>
              <ScanQuotaNote left={scansLeft} onUnlocked={unlockScans} />
              <div style={{ display: "flex", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                <LinkBtn onClick={() => setScreen("home")}>{t("common.home")}</LinkBtn>
                <LinkBtn onClick={backToEdit}>{t("link.modify")}</LinkBtn>
                <LinkBtn onClick={restartPuzzle}>{t("link.restart")}</LinkBtn>
              </div>
            </div>
          )}

          {/* ---------- Panneau multi-solutions (bloquant, avant verrouillage) ---------- */}
          {phase === "edit" && multiSolPrompt && (
            <section ref={panelRef} style={{
              width: W, background: C.surface, borderRadius: 14,
              border: `1px solid ${C.borderSoft}`, borderTop: `5px solid ${C.yellow}`,
              boxShadow: "0 12px 32px rgba(31,39,46,0.12)",
              padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9,
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{t("panel.multiSol.title")}</div>
              <p style={pStyle}>
                {t("panel.multiSol.body")}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Btn variant="primary" grow onClick={() => setMultiSolPrompt(false)}>{t("btn.checkEntry")}</Btn>
                <Btn grow onClick={playAnyway}>{t("btn.playAnyway")}</Btn>
              </div>
            </section>
          )}

          {/* ---------- Panneau fin de partie ---------- */}
          {won && (
            <section style={{
              width: W, background: C.surface, borderRadius: 14,
              border: `1px solid ${C.borderSoft}`, borderTop: `5px solid ${C.teal}`,
              boxShadow: "0 12px 32px rgba(31,39,46,0.12)",
              padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9,
            }}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>{t("panel.won.title")}</div>
              {gameLevel ? (
                <>
                  <p style={pStyle}>{t("panel.won.body", { name: levelName(gameLevel) })}</p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Btn variant="accent" grow onClick={() => newGame(gameLevel)}>
                      {t("btn.newSame", { name: levelName(gameLevel) })}
                    </Btn>
                    {gameLevel < MAX_LEVEL && (
                      <Btn variant="primary" grow onClick={() => newGame(gameLevel + 1)}>
                        {t("btn.levelUp")}
                      </Btn>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn variant="accent" grow onClick={() => setScreen("levels")}>{t("btn.newGrid")}</Btn>
                  <Btn grow onClick={() => setScreen("home")}>{t("btn.home")}</Btn>
                </div>
              )}
            </section>
          )}

          {/* ---------- Panneau Coach ---------- */}
          {plan && (
            <section ref={panelRef} style={{
              width: W, background: C.surface, borderRadius: 14,
              border: `1px solid ${C.borderSoft}`, borderTop: `5px solid ${C.yellow}`,
              boxShadow: "0 12px 32px rgba(31,39,46,0.12)",
              padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 9,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 17 }}>🎓</span>
                <div style={{ fontWeight: 800, fontSize: 15 }}>
                  {t("coach.title")}{plan.target != null ? ` — ${cellName(plan.target, getLang())}` : ""}
                </div>
                <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                  {plan.kind === "ok" && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: C.textSoft,
                      background: C.chipBg, borderRadius: 999, padding: "3px 9px",
                    }}>
                      {level < 2 ? t("coach.hintBadge", { n: level + 1 }) : t("coach.solution")}
                    </span>
                  )}
                  <button type="button" onClick={closePlan} aria-label={t("a11y.closeCoach")} style={{
                    background: "none", border: "none", fontSize: 16, color: C.iconMuted,
                    cursor: "pointer", padding: 0, fontFamily: "inherit",
                    minWidth: 44, minHeight: 44, margin: "-10px -12px -10px -4px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    touchAction: "manipulation", WebkitTapHighlightColor: "transparent",
                  }}>✕</button>
                </div>
              </div>

              {plan.kind === "stuckError" && (
                <>
                  <p style={pStyle}>
                    {t("coach.stuckError.body")}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="primary" grow onClick={() => { closePlan(); checkErrors(); }}>{t("btn.check")}</Btn>
                    <Btn grow onClick={closePlan}>{t("common.close")}</Btn>
                  </div>
                </>
              )}

              {plan.kind === "stuckAll" && (
                <>
                  <p style={pStyle}>
                    {t("coach.stuckAll.body", { list: frTechList(getLang()) })}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="primary" grow onClick={solveAll}>{t("btn.solveAllShort")}</Btn>
                    <Btn grow onClick={revealLeastCandidates}>{t("btn.revealCell")}</Btn>
                    <Btn grow onClick={closePlan}>{t("common.close")}</Btn>
                  </div>
                </>
              )}

              {plan.kind === "stuckMulti" && (
                <>
                  <p style={pStyle}>
                    <Rich text={t("coach.stuckMulti.body")} />
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="primary" grow onClick={backToEdit}>{t("btn.editGrid")}</Btn>
                    <Btn grow onClick={() => (plan.target != null ? revealAnyway(plan.target) : revealLeastCandidates())}>{t("btn.revealCell")}</Btn>
                    <Btn grow onClick={closePlan}>{t("common.close")}</Btn>
                  </div>
                </>
              )}

              {plan.kind === "stuck" && (
                <>
                  <p style={pStyle}>
                    <Rich text={t("coach.stuck.body", { cell: cellName(plan.target, getLang()) })} />
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <Btn variant="accent" grow onClick={randomHint}>{t("btn.nextStep")}</Btn>
                    <Btn grow onClick={() => revealAnyway(plan.target)}>{t("btn.revealAnyway")}</Btn>
                  </div>
                </>
              )}

              {plan.kind === "ok" && (
                <>
                  {(level >= 1 || plan.revealTech) && (
                    <div style={{
                      alignSelf: "flex-start", fontSize: 11, fontWeight: 800,
                      letterSpacing: ".05em", textTransform: "uppercase", color: C.techInk,
                      background: C.yellowSoft, border: `1px solid ${C.warnBorder}`,
                      borderRadius: 999, padding: "3px 10px",
                    }}>
                      {plan.revealTech ? techBreadcrumb(plan, getLang()) : plan.tech}
                    </div>
                  )}
                  {plan.revealTech
                    ? <p style={pStyle}><Rich text={stepHint1(plan, getLang())} /></p>
                    : plan.hint1 ? <p style={pStyle}><Rich text={plan.hint1} /></p> : null}
                  {plan.revealTech && (
                    <LinkBtn onClick={() => openLesson(plan.keyKind)}>
                      {t("btn.reviewTech")}
                    </LinkBtn>
                  )}
                  {level >= 1 && plan.hint2 ? <p style={pStyle}><Rich text={plan.hint2} /></p> : null}
                  {level >= 2 && (
                    <>
                      {plan.chain.map((s, ixx) => (
                        <div key={ixx} style={{
                          border: `1px solid ${C.hintBorder}`, background: C.hintBg,
                          borderRadius: 10, padding: "8px 10px",
                        }}>
                          <div style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: ".06em",
                            textTransform: "uppercase", color: C.hintInk,
                          }}>
                            {t("coach.stepTitle", { n: ixx + 1, title: s.title })}
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
                          width: 46, height: 46, borderRadius: 12, background: C.ink, color: C.onInk,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 24, fontWeight: 800, fontFamily: NUMFONT,
                        }}>
                          {plan.digit}
                        </div>
                        <div style={{ fontSize: 13, color: C.gray }}>
                          {t("coach.toPlace")} <strong style={{ color: C.ink }}>{cellName(plan.target, getLang())}</strong>
                        </div>
                      </div>
                    </>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    {level === 0 && <Btn variant="accent" grow onClick={() => setLevel(1)}>{t("btn.oneMoreHint")}</Btn>}
                    {level < 2 && <Btn grow onClick={() => setLevel(2)}>{t("btn.seeSolution")}</Btn>}
                    {level >= 2 && <Btn variant="primary" grow onClick={placeFromPlan}>{t("btn.place", { d: plan.digit })}</Btn>}
                    {level >= 2 && <Btn grow onClick={closePlan}>{t("common.close")}</Btn>}
                  </div>
                </>
              )}
            </section>
          )}

          <div style={{ fontSize: 11, color: C.faint }}>{t("board.autosave")}</div>
        </>
      )}
      </div>

      {tab !== "learn" && (
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />
      )}
    </div>
  );
}
