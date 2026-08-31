/* ================================================================
   Persistance de l'app — seule porte d'entrée d'App.jsx vers le stockage.
   Web : localStorage (clés et octets identiques à avant — JSON.stringify(6)
   === "6", donc les sauvegardes existantes restent lisibles telles quelles).
   Natif : @capacitor/preferences (iOS peut purger le localStorage des
   WebViews), avec un miroir mémoire pour les lectures synchrones et une
   reprise unique des éventuelles valeurs localStorage (migration douce).
   ================================================================ */

import { isNative } from "./native.js";

export const KEYS = {
  save: "sudoku-coach-v1",
  scans: "sudoku-coach-scansUsed",
  exos: "sudoku-coach-exos-v2",
};

/* L'ancien compteur de scans était stocké brut ("4") — c'est du JSON valide,
   safeParse le relit donc sans cas particulier. */
function safeParse(raw) {
  if (raw == null) return null;
  try { return JSON.parse(raw); } catch (e) { return null; }
}

function readLocal(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function writeLocal(key, raw) {
  try { localStorage.setItem(key, raw); } catch (e) { /* best-effort */ }
}

/* Miroir mémoire (natif) : permet readSync entre deux écritures asynchrones. */
const mem = {};
let prefsPlugin = null;
async function getPrefs() {
  if (!prefsPlugin) {
    const { Preferences } = await import("@capacitor/preferences");
    prefsPlugin = Preferences;
  }
  return prefsPlugin;
}

/* Charge toutes les clés en une fois, au boot. Renvoie { clé: valeur|null }. */
export async function loadAll() {
  const out = {};
  if (!isNative()) {
    for (const key of Object.values(KEYS)) out[key] = safeParse(readLocal(key));
    return out;
  }
  const Preferences = await getPrefs();
  for (const key of Object.values(KEYS)) {
    let raw = null;
    try { raw = (await Preferences.get({ key })).value; } catch (e) { /* best-effort */ }
    if (raw == null) {
      // Reprise unique : une ancienne session PWA a pu laisser des données
      // dans le localStorage du WebView — on les adopte dans Preferences.
      raw = readLocal(key);
      if (raw != null) { try { await Preferences.set({ key, value: raw }); } catch (e) { /* best-effort */ } }
    }
    mem[key] = raw;
    out[key] = safeParse(raw);
  }
  return out;
}

/* Lecture synchrone (relecture multi-onglets du compteur, cache d'exercices).
   Web : localStorage direct ; natif : miroir mémoire tenu à jour par persist. */
export function readSync(key) {
  return safeParse(isNative() ? mem[key] : readLocal(key));
}

/* Écriture (débouncée par l'appelant). Natif : miroir à jour immédiatement,
   écriture Preferences en tâche de fond (fire-and-forget). */
export function persist(key, value) {
  const raw = JSON.stringify(value);
  if (!isNative()) {
    writeLocal(key, raw);
    return Promise.resolve();
  }
  mem[key] = raw;
  return getPrefs()
    .then((Preferences) => Preferences.set({ key, value: raw }))
    .catch(() => { /* best-effort */ });
}
