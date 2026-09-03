/* ================================================================
   SUDOKU · COACH — microcopies « leçon guidée » (👣), côté UI.
   Module pur (testable dans check.mjs) : engine ne peut pas importer
   les leçons sans cycle, donc le fil d'Ariane et l'indice 1 annoncé
   se construisent ici, depuis les champs structurés de buildPlan
   (techKind, chainKinds, keyKind, techZone) et le concept des leçons.
   Bilingue : les titres/zones du plan arrivent déjà dans la bonne
   langue (buildPlan(lang)) ; seuls l'habillage grammatical et le
   concept sont générés ici, par langue (structures distinctes, pas
   du mot-à-mot — la grammaire genrée FR disparaît en EN).
   ================================================================ */
import { cellName } from "./engine.js";
import { LESSON_BY_KIND } from "./exercises.js";
import { TECH_NAMES, techName } from "./techNames.js";

// Première phrase du champ `concept` de la leçon du kind — la définition de
// référence de chaque technique, jamais dupliquée (découpe à la première
// ponctuation forte ; le « : » n'en est pas une). En EN : le champ `en` de la
// leçon quand il existe (T12), sinon repli FR.
export function conceptSentence(kind, lang = "fr") {
  const L = LESSON_BY_KIND[kind];
  if (!L) return "";
  const concept = lang === "en" && L.en && L.en.concept ? L.en.concept : L.concept;
  const m = concept.match(/^[^.!?…]*[.!?…]/);
  return (m ? m[0] : concept).trim();
}

const singleShort = (plan, lang = "fr") =>
  techName(plan.techKind === "hiddenSingle" ? "hiddenSingle" : "nakedSingle", lang);

// Fil d'Ariane du badge : « Single caché (ligne 3) » sans chaîne, sinon les
// étapes puis la conclusion — titres consécutifs identiques regroupés
// (« 2 × Paire pointante → Single caché ») ; au-delà de 2 groupes distincts,
// repli compté (« 4 éliminations → Single caché »). Les titres de plan.chain
// sont déjà dans la langue du plan.
export function techBreadcrumb(plan, lang = "fr") {
  if (!plan.chain.length) {
    return plan.techKind === "hiddenSingle" && plan.techZone
      ? `${techName("hiddenSingle", lang)} (${plan.techZone.replace(/^(le |la |the )/, "")})`
      : singleShort(plan, lang);
  }
  const groups = [];
  for (const { title } of plan.chain) {
    const last = groups[groups.length - 1];
    if (last && last.title === title) last.count++;
    else groups.push({ title, count: 1 });
  }
  if (groups.length > 2) {
    return `${plan.chain.length} ${lang === "en" ? "eliminations" : "éliminations"} → ${singleShort(plan, lang)}`;
  }
  return [
    ...groups.map((g) => (g.count > 1 ? `${g.count} × ${g.title}` : g.title)),
    singleShort(plan, lang),
  ].join(" → ");
}

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// « chercher une paire pointante » mais « un duo caché », « des remote pairs » —
// genre et nombre portés par les drapeaux de TECH_NAMES (source unique).
const techPhraseFr = (kind) => {
  const tech = TECH_NAMES[kind];
  return tech.plural ? `des **${tech.fr.toLowerCase()}**` : `${tech.fem ? "une" : "un"} **${tech.fr.toLowerCase()}**`;
};
// EN : article a/an (« an x-wing », « a naked pair »), pluriels sans article.
const techPhraseEn = (kind) => {
  const tech = TECH_NAMES[kind];
  const name = tech.en.toLowerCase();
  if (tech.plural) return `**${name}**`;
  return `a${/^[aeioux]/.test(name) ? "n" : ""} **${name}**`;
};
// « absents de la ligne 3 », « du bloc central », « du côté des 2 lignes ».
const ofZone = (zone) =>
  zone.startsWith("le ") ? `du ${zone.slice(3)}`
    : zone.startsWith("les ") ? `des ${zone.slice(4)}`
    : `de ${zone}`;

// Indice 1 de la leçon guidée : une phrase de concept (leçon du keyKind) +
// une phrase d'orientation. Rien de la réponse : ni chiffre, ni cases des
// étapes — seules les zones sont nommées.
export function stepHint1(plan, lang = "fr") {
  if (lang === "en") {
    const base = plan.techKind === "hiddenSingle"
      ? `In ${plan.techZone}, one digit has only one possible place left: that is a [[hidden single]]. Take the digits still missing from ${plan.techZone}. Follow them one by one.`
      : `Take stock of cell ${cellName(plan.target, "en")}: sweep its row, its column and its box, and mentally cross out every digit already placed. Only one will survive.`;
    const orient = plan.chainKinds.length
      ? `The cell doesn’t yield directly: first look for ${techPhraseEn(plan.chainKinds[0])} around ${plan.chain[0].zone}. Only then, ${lowerFirst(base)}`
      : base;
    return `${conceptSentence(plan.keyKind, "en")} ${orient}`.trim();
  }
  const base = plan.techKind === "hiddenSingle"
    ? `Dans ${plan.techZone}, un chiffre n’a plus qu’une seule place possible : c’est un [[single caché]]. Prends les chiffres encore absents ${ofZone(plan.techZone)}. Suis-les un par un.`
    : `Fais l’inventaire de la case ${cellName(plan.target)} : parcours sa ligne, sa colonne et son bloc, et barre mentalement chaque chiffre déjà posé. Un seul survivra.`;
  const orient = plan.chainKinds.length
    ? `La case ne cède pas directement : commence par chercher ${techPhraseFr(plan.chainKinds[0])} du côté ${ofZone(plan.chain[0].zone)}. Ensuite seulement, ${lowerFirst(base)}`
    : base;
  return `${conceptSentence(plan.keyKind)} ${orient}`;
}
