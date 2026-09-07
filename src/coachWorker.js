/* ================================================================
   Répartiteur du coach — module PUR (importé par coach.worker.js dans le
   navigateur et par check.mjs sous Node). Une requête { id, fn, args }
   → { id, result } ou { id, error }. fn ∈ nextStep | buildPlan : les
   résultats sont des objets plats (structuredClone-ables), describeElim
   ayant déjà tourné ici. Jamais d'exception vers l'appelant.
   ================================================================ */
import { nextStep, buildPlan } from "./engine.js";

const FNS = { nextStep, buildPlan };

export function handleRequest({ id, fn, args } = {}) {
  const f = FNS[fn];
  if (!f) return { id, error: `fn inconnue : ${fn}` };
  try {
    return { id, result: f(...(Array.isArray(args) ? args : [])) };
  } catch (err) {
    return { id, error: String((err && err.message) || err) };
  }
}
