/* ================================================================
   Détection de la coquille native Capacitor.
   Le bridge injecte window.Capacitor avant le chargement de l'app :
   pas besoin d'importer @capacitor/core (le bundle web reste intact,
   et ce module reste importable sous Node pour scripts/check.mjs).
   ================================================================ */

export function isNative() {
  return (
    typeof window !== "undefined" &&
    !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())
  );
}
