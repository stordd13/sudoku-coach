/* ================================================================
   SUDOKU · COACH — microcopies « leçon guidée » (👣), côté UI.
   Module pur (testable dans check.mjs) : engine ne peut pas importer
   les leçons sans cycle, donc le fil d'Ariane et l'indice 1 annoncé
   se construisent ici, depuis les champs structurés de buildPlan
   (techKind, chainKinds, keyKind, techZone) et le concept des leçons.
   ================================================================ */
import { cellName } from "./engine.js";
import { LESSON_BY_KIND } from "./exercises.js";

// Première phrase du champ `concept` de la leçon du kind — la définition de
// référence de chaque technique, jamais dupliquée (découpe à la première
// ponctuation forte ; le « : » n'en est pas une).
export function conceptSentence(kind) {
  const L = LESSON_BY_KIND[kind];
  if (!L) return "";
  const m = L.concept.match(/^[^.!?…]*[.!?…]/);
  return (m ? m[0] : L.concept).trim();
}

const singleShort = (plan) => (plan.techKind === "hiddenSingle" ? "Single caché" : "Candidat unique");

// Fil d'Ariane du badge : « Single caché (ligne 3) » sans chaîne,
// « Paire pointante → Single caché » à 1-2 étapes, « 3 éliminations → … » à 3+.
export function techBreadcrumb(plan) {
  const n = plan.chainKinds.length;
  if (!n) {
    return plan.techKind === "hiddenSingle" && plan.techZone
      ? `Single caché (${plan.techZone.replace(/^le |^la /, "")})`
      : singleShort(plan);
  }
  if (n >= 3) return `${n} éliminations → ${singleShort(plan)}`;
  return [...plan.chain.map((s) => s.title), singleShort(plan)].join(" → ");
}

const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
// « chercher une paire pointante » mais « un duo caché », « des remote pairs ».
const FEM_TITLES = new Set(["Paire nue", "Paire pointante", "Réduction bloc/ligne"]);
const techPhrase = (title) =>
  title === "Remote Pairs"
    ? "des **remote pairs**"
    : `${FEM_TITLES.has(title) ? "une" : "un"} **${title.toLowerCase()}**`;
// « absents de la ligne 3 », « du bloc central », « du côté des 2 lignes ».
const ofZone = (zone) =>
  zone.startsWith("le ") ? `du ${zone.slice(3)}`
    : zone.startsWith("les ") ? `des ${zone.slice(4)}`
    : `de ${zone}`;

// Indice 1 de la leçon guidée : une phrase de concept (leçon du keyKind) +
// une phrase d'orientation. Rien de la réponse : ni chiffre, ni cases des
// étapes — seules les zones sont nommées.
export function stepHint1(plan) {
  const base = plan.techKind === "hiddenSingle"
    ? `Dans ${plan.techZone}, un chiffre n’a plus qu’une seule place possible. Prends les chiffres encore absents ${ofZone(plan.techZone)} et suis-les un par un.`
    : `Fais l’inventaire de la case ${cellName(plan.target)} : parcours sa ligne, sa colonne et son bloc, et barre mentalement chaque chiffre déjà posé. Un seul survivra.`;
  const orient = plan.chainKinds.length
    ? `La case ne cède pas directement : commence par chercher ${techPhrase(plan.chain[0].title)} du côté ${ofZone(plan.chain[0].zone)}. Ensuite seulement, ${lowerFirst(base)}`
    : base;
  return `${conceptSentence(plan.keyKind)} ${orient}`;
}
