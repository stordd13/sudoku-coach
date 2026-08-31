import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Le manifest existant (public/manifest.webmanifest) est servi tel quel.
      manifest: false,
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,webmanifest}"],
        // /api/* reste réseau uniquement : jamais servi par le fallback SPA.
        // /confidentialite est une vraie page statique (fiche App Store) :
        // sans cette exclusion, le service worker servirait index.html à la place.
        navigateFallbackDenylist: [/^\/api\//, /^\/confidentialite/],
      },
    }),
  ],
});
