/* ================================================================
   Client du coach (v2.4, B3) : askCoach(fn, args, { onSlow }) → Promise du
   même résultat que l'appel synchrone à nextStep / buildPlan.
   Stratégie :
   1. Appel synchrone plafonné au palier 4 (rapide : p95 ≈ 40 ms) ; s'il
      aboutit, réponse immédiate. Sa durée sert de mesure préalable : au-delà
      de SLOW_MS une fois, l'appareil est marqué lent et tout part au worker.
   2. Sinon l'état exige le palier 5 : appel COMPLET posté au Worker. Le
      résultat est strictement identique à l'appel synchrone complet (le
      préfixe des paliers ≤ 4 est rejoué, déterministe — cf. engine.js).
   3. Worker indisponible (pas de Worker, erreur, échec de chargement) →
      repli synchrone. onSlow est appelé au bout de SLOW_UI_MS si le worker
      n'a pas encore répondu (overlay « Le coach réfléchit… »).
   Le budget de 800 ms de la spec est une cible mesurée au banc (p95 sur les
   états de palier 5), jamais une coupure : on ne tronque pas un résultat.
   Module navigateur (Worker, import.meta.url) — pas importé par check.mjs.
   ================================================================ */
import { nextStep, buildPlan } from "./engine.js";

const FNS = { nextStep, buildPlan };
const SYNC_TIER = 4;
const SLOW_MS = 150;
const SLOW_UI_MS = 300;

let worker = null; // null : pas encore créé · false : indisponible · Worker
let seq = 0;
let slow = false;
const pending = new Map();

function getWorker() {
  if (worker !== null) return worker;
  if (typeof Worker === "undefined") { worker = false; return worker; }
  try {
    const w = new Worker(new URL("./coach.worker.js", import.meta.url), { type: "module" });
    w.onmessage = (e) => {
      const p = pending.get(e.data && e.data.id);
      if (!p) return;
      pending.delete(e.data.id);
      if (e.data.error) p.reject(new Error(e.data.error));
      else p.resolve(e.data.result);
    };
    w.onerror = () => {
      // Chargement ou exécution en échec : tout le monde repasse en synchrone.
      for (const p of pending.values()) p.reject(new Error("worker"));
      pending.clear();
      try { w.terminate(); } catch { /* déjà mort */ }
      worker = false;
    };
    worker = w;
  } catch {
    worker = false;
  }
  return worker;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function askCoach(fn, args, { onSlow } = {}) {
  const f = FNS[fn];
  const opts = args[args.length - 1] || {};
  const w = getWorker();
  if (!w) return Promise.resolve(f(...args));
  if (!slow) {
    const t0 = now();
    const quick = f(...args.slice(0, -1), { ...opts, maxTier: SYNC_TIER });
    if (now() - t0 > SLOW_MS) slow = true;
    if (quick) return Promise.resolve(quick);
  }
  const id = ++seq;
  const timer = onSlow ? setTimeout(onSlow, SLOW_UI_MS) : null;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    try { w.postMessage({ id, fn, args }); } catch (err) { pending.delete(id); reject(err); }
  })
    .catch(() => f(...args))
    .finally(() => { if (timer) clearTimeout(timer); });
}

/* Pour les tests manuels : true si les calculs de palier 5 partent au worker. */
export function coachWorkerAvailable() {
  return !!getWorker();
}
