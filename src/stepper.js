/* ================================================================
   Révélation pas à pas — dérivation pure des « scripts » d'étapes.
   Un script = [{ cells: [index], strikes: {index: [chiffres]},
   conclusion: bool }] ; une entrée par étape de texte affichée.
   Module pur (importé par check.mjs sous Node — pas d'import.meta.env).
   ================================================================ */

/* Leçon curatée → script depuis stepCells/stepStrikes (parallèles à steps).
   null si les champs manquent ou sont désalignés → l'UI révèle d'un bloc. */
export function lessonStepScript(L) {
  if (!L || !Array.isArray(L.stepCells) || !Array.isArray(L.stepStrikes)) return null;
  if (L.stepCells.length !== L.steps.length || L.stepStrikes.length !== L.steps.length) return null;
  return L.steps.map((_, i) => ({
    cells: L.stepCells[i] || [],
    strikes: L.stepStrikes[i] || {},
    conclusion: i === L.steps.length - 1,
  }));
}

/* removals bruts du moteur [{cell, digits}] → {index: [chiffres]} triés. */
function normalizeRemovals(removals) {
  const out = {};
  for (const r of removals || []) {
    out[r.cell] = [...new Set([...(out[r.cell] || []), ...r.digits])].sort((a, b) => a - b);
  }
  return out;
}

/* Plan du coach (kind "ok") → une étape par maillon de la chaîne (cells du
   describeElim + removals du rawChain), puis une étape conclusion sur la zone
   du single. null si la chaîne est vide : la conclusion s'affiche directement. */
export function planStepScript(plan) {
  if (!plan || plan.kind !== "ok" || !Array.isArray(plan.chain) || !plan.chain.length) return null;
  const raw = plan.rawChain || [];
  const steps = plan.chain.map((s, i) => ({
    cells: s.cells || [],
    strikes: normalizeRemovals(raw[i] && raw[i].removals),
    conclusion: false,
  }));
  steps.push({ cells: plan.unitCells || [], strikes: {}, conclusion: true });
  return steps;
}

/* Exercice (packageExercise ou single via buildPlan) → une étape par texte
   d'explain ; la dernière porte les removals et la conclusion. cells par
   étape via explainCells, repli sur unit. */
export function exerciseStepScript(ex) {
  if (!ex || !Array.isArray(ex.explain) || !ex.explain.length) return null;
  const n = ex.explain.length;
  return ex.explain.map((_, i) => ({
    cells: (Array.isArray(ex.explainCells) && Array.isArray(ex.explainCells[i]) && ex.explainCells[i].length)
      ? ex.explainCells[i]
      : ex.unit || [],
    strikes: i === n - 1 ? ex.removals || {} : {},
    conclusion: i === n - 1,
  }));
}

/* État d'affichage à l'étape ix (nombre) ou "all" (tout voir) :
   - cells      : Set des cases à encadrer (vide en "all" → rendu classique)
   - struckPast : {index: Set} candidats barrés par les étapes passées
   - struckNow  : {index: Set} candidats barrés par l'étape courante (rouge)
   - showAnswer : la conclusion est atteinte (réponse en teal) */
export function stepReveal(script, ix) {
  if (!Array.isArray(script) || !script.length) return null;
  const add = (tgt, strikes) => {
    for (const [k, arr] of Object.entries(strikes || {})) {
      const key = Number(k);
      if (!tgt[key]) tgt[key] = new Set();
      for (const d of arr) tgt[key].add(d);
    }
  };
  const last = script.length - 1;
  if (ix === "all") {
    const struckNow = {};
    for (const s of script) add(struckNow, s.strikes);
    return { ix: last, total: script.length, cells: new Set(), struckPast: {}, struckNow, showAnswer: true };
  }
  const cur = Math.max(0, Math.min(Number(ix) || 0, last));
  const struckPast = {}, struckNow = {};
  for (let i = 0; i < cur; i++) add(struckPast, script[i].strikes);
  add(struckNow, script[cur].strikes);
  return {
    ix: cur, total: script.length, cells: new Set(script[cur].cells || []),
    struckPast, struckNow, showAnswer: !!script[cur].conclusion,
  };
}
