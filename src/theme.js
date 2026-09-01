/* ================================================================
   Thème — module PUR (importé par check.mjs : audit de contraste, tests).
   Les composants ne consomment JAMAIS ces hex directement : App.jsx expose
   `C` = { clé: "var(--sc-clé)" } et injecte les deux jeux de variables dans
   un <style> (`:root` clair, `:root[data-theme="dark"]` sombre). Basculer le
   thème = poser data-theme sur <html>, aucun re-render nécessaire.
   Le script anti-flash d'index.html duplique paper/dark — synchronisation
   verrouillée par un test de check.mjs.
   ================================================================ */

/* Palette claire historique « papier quadrillé + surligneur » : les 14
   premières clés sont figées, les suivantes promeuvent les hex qui vivaient
   en dur dans App.jsx (mêmes valeurs, aucun changement visuel). */
export const C_LIGHT = {
  paper: "#F1F4F3", surface: "#FFFFFF", ink: "#1F272E",
  line: "#C9D1CE", teal: "#12766F", tealSoft: "#DDEFEC",
  blue: "#2B6CB0", blueSoft: "#E4ECF7",
  red: "#B3372E", redSoft: "#F9E3E1",
  yellow: "#F2C40F", yellowSoft: "#FFF3B8",
  gray: "#7C8894", givenBg: "#F6F8F7",
  // — promus depuis App.jsx —
  peer: "#F3F6F5",        // cases voisines de la sélection
  textStrong: "#3C464D",  // paragraphes de leçon
  textSoft: "#5A6763",    // sous-titres, légendes
  faint: "#98A29D",       // notes discrètes (version, sauvegarde)
  iconMuted: "#8A948F",   // ✕ de fermeture
  border: "#D8DEDC",      // bordures de boutons/pavé
  borderSoft: "#E2E7E5",  // bordures de cartes/panneaux
  dashed: "#B9C4C0",      // encarts pointillés
  chipBg: "#EFF2F1",      // pastilles (niveau, indice n/2, chrono)
  tabsBg: "#E3E8E6",      // fond de la barre d'onglets
  gridPaper: "#E5EAE8",   // quadrillage du fond papier
  glass: "rgba(255,255,255,0.8)",   // encarts translucides
  overlay: "rgba(241,244,243,0.85)", // voile de génération/scan
  onInk: "#FFFFFF",       // texte sur fond C.ink (boutons primaires, tuile chiffre)
  onAccent: "#FFFFFF",    // texte sur fond C.teal (boutons accent, chips actives)
  hintBg: "#FFFBEA", hintBorder: "#EBDB9B", hintInk: "#8A6D0B", // cartes d'étape
  techInk: "#7A620A",     // texte de la pastille technique (sur yellowSoft)
  warnBg: "#FBEFDD", warnBorder: "#EDD98F", warnInk: "#8A5A16", // avertissements
  msgInfoBg: "#E9F0EE", msgInfoFg: "#2B4A44",
  msgSuccessBg: "#E1F3E8", msgSuccessFg: "#176A45",
};

/* Palette sombre dérivée : papier → encre profonde, surfaces relevées,
   accents éclaircis pour rester lisibles (AA vérifié par check.mjs, T10). */
export const C_DARK = {
  paper: "#14181B", surface: "#1E2428", ink: "#E8ECEA",
  line: "#3A4448", teal: "#3FB7AA", tealSoft: "#16332F",
  blue: "#82B4E8", blueSoft: "#1D2B3D",
  red: "#E58A80", redSoft: "#432320",
  yellow: "#E8C34A", yellowSoft: "#3A3312",
  gray: "#9AA6A1", givenBg: "#262D31",
  peer: "#232A2E",
  textStrong: "#CBD3D0",
  textSoft: "#AEB9B4",
  faint: "#7C8884",
  iconMuted: "#8A948F",
  border: "#353F44",
  borderSoft: "#2C3438",
  dashed: "#45514E",
  chipBg: "#262D31",
  tabsBg: "#10161A",
  gridPaper: "#1B2023",
  glass: "rgba(30,36,40,0.8)",
  overlay: "rgba(20,24,27,0.85)",
  onInk: "#14181B",
  onAccent: "#0F1A18",
  hintBg: "#2C2712", hintBorder: "#4A4120", hintInk: "#E3C86B",
  techInk: "#E3C86B",
  warnBg: "#362B18", warnBorder: "#554628", warnInk: "#E5B369",
  msgInfoBg: "#1E2E2A", msgInfoFg: "#AFCFC6",
  msgSuccessBg: "#1C3226", msgSuccessFg: "#95D5B2",
};

export function getPalette(theme) {
  return theme === "dark" ? C_DARK : C_LIGHT;
}

/* « --sc-paper:#F1F4F3;--sc-surface:… » pour le <style> injecté. */
export function cssVars(palette) {
  return Object.entries(palette).map(([k, v]) => `--sc-${k}:${v}`).join(";");
}

/* <meta name="theme-color"> suit le fond de page. */
export const META_COLOR = { light: C_LIGHT.paper, dark: C_DARK.paper };
