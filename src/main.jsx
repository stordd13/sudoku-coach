import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { Analytics } from "@vercel/analytics/react";
import { track } from "@vercel/analytics";
import { isNative } from "./native.js";
import { configureAnalytics } from "./analytics.js";

/* Événements d'usage (src/analytics.js, schéma fermé) : envoyés seulement en
   production ET hors natif ; ailleurs le module est un no-op validant. Seul
   endroit avec App.jsx/purchases.js à lire import.meta.env (jamais importé
   par check.mjs). */
configureAnalytics({ enabled: !!import.meta.env.PROD && !isNative(), send: track });

/* Filet anti-écran-blanc : si l'app crashe au rendu, une carte propre
   remplace la page vide (les données restent en localStorage). */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (!this.state.crashed) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", background: "#F1F4F3", display: "flex",
        alignItems: "center", justifyContent: "center", padding: 16,
        fontFamily: "'Avenir Next', 'Futura', 'Century Gothic', -apple-system, sans-serif",
      }}>
        <div style={{
          width: "min(94vw, 430px)", background: "#fff", color: "#1F272E",
          border: "1px solid #E2E7E5", borderRadius: 14, padding: "18px 16px",
          boxShadow: "0 8px 24px rgba(31,39,46,0.08)", textAlign: "center",
          display: "flex", flexDirection: "column", gap: 12,
        }}>
          <div style={{ fontSize: 26 }}>😵</div>
          <div style={{ fontSize: 14, lineHeight: 1.55 }}>
            Oups, quelque chose s’est cassé. Tes données sont sauvegardées.
          </div>
          <button type="button" onClick={() => window.location.reload()} style={{
            fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, padding: "10px 12px",
            borderRadius: 12, border: "1px solid #1F272E", background: "#1F272E",
            color: "#fff", cursor: "pointer", minHeight: 44,
          }}>
            Recharger
          </button>
        </div>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      {/* Statistiques d'audience anonymes (Vercel Web Analytics), web
          uniquement : dans le WebView Capacitor l'endpoint n'existe pas,
          l'usage natif se lit dans App Store Connect. mode="production"
          explicite : le paquet ne trace rien s'il se croit en développement
          et la détection automatique n'est pas garantie sous Vite. */}
      {!isNative() && <Analytics mode="production" />}
    </ErrorBoundary>
  </React.StrictMode>
);
