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

/* Retour haptique — no-op strict sur le web.
   "light" : un chiffre posé ; "success" : zone ou grille complétée ;
   "error" : conflit ou erreurs au Vérifier. */
export async function haptic(kind) {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import("@capacitor/haptics");
    if (kind === "light") await Haptics.impact({ style: ImpactStyle.Light });
    else if (kind === "success") await Haptics.notification({ type: NotificationType.Success });
    else if (kind === "error") await Haptics.notification({ type: NotificationType.Error });
  } catch (e) { /* jamais bloquant */ }
}
