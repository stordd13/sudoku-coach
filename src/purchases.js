/* ================================================================
   Achat « Scan illimité » via RevenueCat — natif uniquement.
   Sur le web, tout est no-op : le freemium actuel ne change pas.
   NB : ce module lit import.meta.env (comme App.jsx) — il ne doit
   jamais être importé par scripts/check.mjs (Node ne le parse pas).
   ================================================================ */

import { isNative } from "./native.js";

const ENTITLEMENT = "unlimited_scans";

/* Certaines méthodes du SDK renvoient l'objet nu, d'autres { customerInfo }. */
function infoOf(x) {
  return x && x.customerInfo ? x.customerInfo : x;
}
function hasUnlimited(info) {
  return !!(info && info.entitlements && info.entitlements.active && info.entitlements.active[ENTITLEMENT]);
}
function isCancel(e) {
  return !!e && (String(e.code) === "1" || /cancel/i.test(String(e.message || "")));
}

let sdk = null;
let configured = false;
async function getSdk() {
  if (!sdk) {
    const { Purchases } = await import("@revenuecat/purchases-capacitor");
    sdk = Purchases;
  }
  return sdk;
}

/* Initialise le SDK au boot natif et renvoie l'état de l'entitlement.
   onChange est rappelé à chaque mise à jour (achat, restauration…).
   Sans clé (étape 4.0 pas encore faite) : false — freemium inchangé. */
export async function initPurchases(onChange) {
  if (!isNative()) return false;
  const apiKey = import.meta.env.VITE_REVENUECAT_IOS_KEY;
  if (!apiKey) return false;
  const Purchases = await getSdk();
  if (!configured) {
    configured = true; // StrictMode monte deux fois en dev : une seule configuration
    await Purchases.configure({ apiKey });
    await Purchases.addCustomerInfoUpdateListener((info) => {
      onChange(hasUnlimited(infoOf(info)));
    });
  }
  try {
    const res = await Purchases.getCustomerInfo();
    return hasUnlimited(infoOf(res));
  } catch (e) {
    return false; // premier lancement hors-ligne : le SDK se resynchronisera
  }
}

/* Offre courante ({ price, pkg }) ou null si indisponible (produit pas prêt,
   réseau coupé…) — l'appelant retombe alors sur le panneau « bientôt ». */
export async function getOffer() {
  try {
    const Purchases = await getSdk();
    const res = await Purchases.getOfferings();
    const pkg = res && res.current && res.current.availablePackages && res.current.availablePackages[0];
    if (!pkg) return null;
    return { price: (pkg.product && pkg.product.priceString) || "", pkg };
  } catch (e) {
    return null;
  }
}

/* true : entitlement actif ; "cancelled" : abandon utilisateur ; jette sinon. */
export async function buy(pkg) {
  const Purchases = await getSdk();
  try {
    const res = await Purchases.purchasePackage({ aPackage: pkg });
    return hasUnlimited(infoOf(res));
  } catch (e) {
    if (isCancel(e)) return "cancelled";
    throw e;
  }
}

/* true si la restauration retrouve l'entitlement. */
export async function restore() {
  const Purchases = await getSdk();
  const res = await Purchases.restorePurchases();
  return hasUnlimited(infoOf(res));
}
