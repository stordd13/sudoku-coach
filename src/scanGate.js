/* ================================================================
   Porte du scan — module PUR (importé par check.mjs). Règle R1 v2.4 :
   « jamais d'impasse payante ». Le quota local épuisé ne bloque que si un
   achat est réellement possible (offre RevenueCat chargée) ; sinon — clé
   absente, offering vide, erreur de chargement, ou simplement le web où
   aucun achat n'existe — le scan reste possible avec un message « en
   attendant, continue » (le serveur garde ses propres limites). Dès que
   l'offre charge, le paywall reprend.
     left           : scans gratuits restants (Infinity si illimité)
     purchasesReady : l'offre d'achat est chargée et achetable
     unlimited      : entitlement actif
   → { allowed, panel: null | "low" | "grace" | "paywall" }
   ================================================================ */
export const LOW_SCANS = 3;

export function scanGate({ left = 0, purchasesReady = false, unlimited = false } = {}) {
  if (unlimited) return { allowed: true, panel: null };
  if (left > 0) return { allowed: true, panel: left < LOW_SCANS ? "low" : null };
  return purchasesReady
    ? { allowed: false, panel: "paywall" }
    : { allowed: true, panel: "grace" };
}
