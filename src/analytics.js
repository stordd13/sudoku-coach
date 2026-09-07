/* ================================================================
   Événements d'usage anonymes (Vercel Web Analytics) — module PUR.
   - Schéma FERMÉ : noms d'événements et clés autorisés uniquement, valeurs
     tirées de listes closes (ou d'un motif strict) — jamais de texte libre,
     jamais de contenu de grille, jamais de donnée personnelle. check.mjs
     vérifie ce schéma (section 12).
   - trackEvent ne jette JAMAIS vers l'app : hors schéma → warn + false.
   - L'envoi réel (`send`) est injecté par main.jsx (track de
     @vercel/analytics) : no-op en natif, hors production, et si le paquet
     est indisponible. Ce module n'importe rien du paquet et ne lit pas
     import.meta.env (importé par check.mjs sous Node).
   - Sobriété (quota du tier gratuit) : dédoublonnage par session des
     événements « de découverte » et plafond MAX_EVENTS_PER_SESSION.
   ================================================================ */
import { TECH_NAMES } from "./techNames.js";

const LEVELS = ["1", "2", "3", "4", "5", "custom"];

export const EVENT_SCHEMA = Object.freeze({
  game_started: { level: LEVELS, origin: ["generated", "daily", "scan", "manual"] },
  game_won: {
    level: LEVELS,
    duration: ["lt5", "5to15", "15to30", "gt30"],
    hints: ["0", "1to3", "4plus"],
    assisted: ["0", "1"],
  },
  daily_done: { streak: ["1", "2to6", "7plus"] },
  scan_used: { result: ["ok", "error", "quota", "limit"] },
  lesson_viewed: { num: /^[1-9][0-9]?$/ },
  exercise_started: { kind: Object.keys(TECH_NAMES) },
  wall_hit: { level: LEVELS, kind: ["beyond", "multi", "wrong"] },
  paywall_shown: {},
});

/* Événements envoyés au plus une fois par session pour des props données. */
const DEDUPE = new Set(["lesson_viewed", "exercise_started", "wall_hit"]);
export const MAX_EVENTS_PER_SESSION = 20;

let config = { enabled: false, send: null, warn: (...a) => console.warn(...a) };
let seen = new Set();
let sent = 0;

export function configureAnalytics({ enabled = false, send = null, warn } = {}) {
  config = { enabled: !!enabled && typeof send === "function", send, warn: warn || config.warn };
}
export function resetAnalyticsForTests() {
  config = { enabled: false, send: null, warn: (...a) => console.warn(...a) };
  seen = new Set();
  sent = 0;
}

/* Valide contre le schéma fermé ; renvoie null si conforme, sinon le motif. */
export function validateEvent(name, props) {
  const schema = EVENT_SCHEMA[name];
  if (!schema) return `événement inconnu : ${name}`;
  if (!props || typeof props !== "object") return `props manquantes pour ${name}`;
  for (const key of Object.keys(props)) {
    if (!(key in schema)) return `clé inconnue ${key} pour ${name}`;
    const rule = schema[key], v = props[key];
    if (typeof v !== "string") return `valeur non textuelle pour ${name}.${key}`;
    const okv = rule instanceof RegExp ? rule.test(v) : rule.includes(v);
    if (!okv) return `valeur hors schéma pour ${name}.${key} : ${v}`;
  }
  for (const key of Object.keys(schema)) if (!(key in props)) return `clé manquante ${key} pour ${name}`;
  return null;
}

/* true si l'événement a été accepté (envoyé, ou no-op légitime) ; false s'il
   est hors schéma, dédoublonné, plafonné ou si l'envoi a échoué. Jamais d'exception. */
export function trackEvent(name, props = {}) {
  try {
    const why = validateEvent(name, props);
    if (why) { config.warn(`[analytics] ignoré — ${why}`); return false; }
    if (!config.enabled) return true;
    const key = `${name}:${JSON.stringify(props)}`;
    if (DEDUPE.has(name)) {
      if (seen.has(key)) return false;
      seen.add(key);
    }
    if (sent >= MAX_EVENTS_PER_SESSION) return false;
    sent++;
    config.send(name, props);
    return true;
  } catch (err) {
    try { config.warn("[analytics] envoi impossible", err); } catch { /* silencieux */ }
    return false;
  }
}

/* ---------- Seaux (jamais de valeur brute) ---------- */
export const durationBucket = (seconds) => {
  const m = (Number(seconds) || 0) / 60;
  return m < 5 ? "lt5" : m < 15 ? "5to15" : m < 30 ? "15to30" : "gt30";
};
export const hintsBucket = (n) => ((Number(n) || 0) <= 0 ? "0" : n <= 3 ? "1to3" : "4plus");
export const streakBucket = (n) => ((Number(n) || 0) <= 1 ? "1" : n <= 6 ? "2to6" : "7plus");
export const wallKind = (panelKind) =>
  ({ "wrong-digit": "wrong", "multi-sol": "multi", "beyond-coach": "beyond" })[panelKind] || null;
