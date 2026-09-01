/* ================================================================
   i18n — module PUR (importé par check.mjs sous Node, pas
   d'import.meta.env, navigator gardé par typeof).
   t(key, params) : interpolation {x} ; repli langue → fr → clé brute.
   La langue active vit ici (variable de module) ; App la synchronise
   depuis le réglage à chaque render et garde un état pour re-rendre.
   T7 pose la plomberie avec quelques clés pilotes (onglets, réglages) ;
   le balayage complet de la microcopy arrive en T8.
   ================================================================ */

let lang = "fr";

/* Langue du navigateur : en* → en, tout le reste → fr (marché historique). */
export function detectLang() {
  const nav = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return /^en/i.test(nav) ? "en" : "fr";
}

export function setLang(l) {
  lang = l === "en" ? "en" : "fr";
}
export function getLang() {
  return lang;
}

export function t(key, params) {
  const s = (DICTS[lang] && DICTS[lang][key]) ?? DICTS.fr[key] ?? key;
  return params
    ? s.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m))
    : s;
}

export const DICTS = {
  fr: {
    "tabs.play": "🎮 Jouer",
    "tabs.learn": "📚 Apprendre",
    "common.home": "← Accueil",
    "settings.title": "⚙️ Réglages",
    "settings.aria": "Réglages",
    "settings.theme": "Thème",
    "settings.theme.auto": "Auto",
    "settings.theme.light": "Clair",
    "settings.theme.dark": "Sombre",
    "settings.lang": "Langue",
    "settings.lang.auto": "Auto",
    "settings.hideTimer": "Masquer le chrono",
    "settings.hideTimer.hint": "Le temps reste mesuré pour tes stats.",
  },
  en: {
    "tabs.play": "🎮 Play",
    "tabs.learn": "📚 Learn",
    "common.home": "← Home",
    "settings.title": "⚙️ Settings",
    "settings.aria": "Settings",
    "settings.theme": "Theme",
    "settings.theme.auto": "Auto",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.lang": "Language",
    "settings.lang.auto": "Auto",
    "settings.hideTimer": "Hide the timer",
    "settings.hideTimer.hint": "Time is still tracked for your stats.",
  },
};
