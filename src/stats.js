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
