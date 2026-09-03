/* Choix de la stratégie de notation du bouton « ✍️ Noter ».
   Module pur (importé par check.mjs sous Node — pas d'import.meta.env). */

export const NOTATION_PREFS = ["auto", "snyder", "complete"];

/* lk : sortie de levelKey (stats.js) — "1".."5" pour une grille générée,
   "custom" pour une grille scannée/saisie.
   pref : réglage utilisateur "auto" | "snyder" | "complete" (inconnu → auto).
   → "snyder" | "complete". En auto : Snyder pour les niveaux 1-2 et les
   grilles sans niveau, notation complète à partir du niveau 3. */
export function notationFor(lk, pref = "auto") {
  if (pref === "snyder" || pref === "complete") return pref;
  return lk === "3" || lk === "4" || lk === "5" ? "complete" : "snyder";
}
