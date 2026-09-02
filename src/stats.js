/* ================================================================
   Statistiques — module PUR (importé par check.mjs sous Node).
   T3 : logique de temps du chrono (segments horodatés, affichage).
   T4 y ajoutera l'agrégation des parties (commencées/terminées, records).
   ================================================================ */

/* Ajoute un segment [t0, t1] (ms) à un total en secondes. Les segments
   invalides, négatifs ou nuls sont ignorés — un visibilitychange en rafale
   ou une horloge qui recule ne doit jamais corrompre le temps de partie. */
export function addSegment(elapsed, t0, t1) {
  if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) return elapsed;
  return elapsed + Math.round((t1 - t0) / 1000);
}

/* « 12:07 », « 1:02:07 » — heures affichées seulement si nécessaires. */
export function formatClock(seconds) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const p2 = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${p2(m)}:${p2(r)}` : `${m}:${p2(r)}`;
}

/* ---------- Agrégation des parties (par clé "1".."5" ou "custom") ---------- */

export function emptyStats() {
  return { started: {}, finished: {}, bestTime: {}, hints: 0, hintGames: 0 };
}

/* Blindage des données chargées : un KEYS.stats partiel, tableau ou d'un
   autre type (écriture externe, restauration bancale) ferait jeter les
   reducers (`s.started[key]`) AVANT le persist — crash permanent jusqu'au
   vidage du stockage. Toute forme invalide repart d'emptyStats(), un objet
   valide est préservé champ par champ. */
export function normalizeStats(x) {
  const base = emptyStats();
  if (!x || typeof x !== "object" || Array.isArray(x)) return base;
  const dict = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v : {});
  const num = (v) => (Number.isFinite(v) && v >= 0 ? v : 0);
  return {
    started: dict(x.started), finished: dict(x.finished), bestTime: dict(x.bestTime),
    hints: num(x.hints), hintGames: num(x.hintGames),
  };
}

export function levelKey(gameLevel) {
  return gameLevel >= 1 && gameLevel <= 5 ? String(gameLevel) : "custom";
}

/* Reducers IMMUABLES : l'objet d'entrée n'est jamais modifié (l'appelant
   persiste le retour). */
export function recordStart(stats, key) {
  const s = stats || emptyStats();
  return { ...s, started: { ...s.started, [key]: (s.started[key] || 0) + 1 } };
}

export function recordWin(stats, { levelKey: key, seconds, hints = 0, assisted = false }) {
  const s = stats || emptyStats();
  const next = {
    ...s,
    finished: { ...s.finished, [key]: (s.finished[key] || 0) + 1 },
    bestTime: { ...s.bestTime },
    hints: s.hints + hints,
    hintGames: s.hintGames + (hints > 0 ? 1 : 0),
  };
  /* Choix produit : les indices 👣/🎯 ne privent PAS du record — on ne punit
     pas l'apprentissage (le taux d'aide affiché remet le contexte). Seules
     les parties « assistées » (Tout résoudre, Révéler une case) en excluent. */
  const t = Number(seconds);
  if (!assisted && Number.isFinite(t) && t > 0 && (next.bestTime[key] == null || t < next.bestTime[key])) {
    next.bestTime[key] = t;
  }
  return next;
}

/* Nombre moyen d'indices par partie terminée. */
export function helpRate(stats) {
  const s = stats || emptyStats();
  const totalFinished = Object.values(s.finished).reduce((a, b) => a + b, 0);
  return totalFinished ? s.hints / totalFinished : 0;
}
