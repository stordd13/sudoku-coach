/* ================================================================
   /api/ocr — fonction serverless Vercel
   Reçoit { image: <base64 jpeg>, media_type } et renvoie { grid: "81 chiffres" }.
   La clé API reste côté serveur : variable d'environnement ANTHROPIC_API_KEY.
   Modèle configurable via la variable OCR_MODEL (défaut : claude-opus-4-8, le plus
   fiable en vision ; claude-sonnet-5 est un peu plus rapide, claude-haiku-4-5 le
   moins cher mais nettement moins précis pour la lecture de grille).
   ================================================================ */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Laisse le déploiement Vercel prendre jusqu'à 60 s (la transcription pas-à-pas
// d'Opus peut dépasser le défaut de 10 s sur une photo dense).
export const maxDuration = 60;

// Limite anti-abus : RATE_LIMIT_PER_DAY scans / jour / IP (fenêtre glissante).
// Sans UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN (dev local) : pas de limite.
const RATE_LIMIT_PER_DAY = 10;

let ratelimiter = null;
let warnedNoUpstash = false;
function getRatelimiter() {
  if (ratelimiter) return ratelimiter;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (!warnedNoUpstash) {
      console.warn("Upstash non configuré : /api/ocr sans limite par IP (ok en dev).");
      warnedNoUpstash = true;
    }
    return null;
  }
  ratelimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_PER_DAY, "1 d"),
    prefix: "ocr",
  });
  return ratelimiter;
}

const OCR_PROMPT = `Tu es un expert en lecture de grilles de sudoku. On te donne la photo d'une grille 9×9.

Procède méthodiquement, une ligne à la fois, du haut vers le bas :
- Pour chaque ligne, lis les 9 cases de gauche à droite.
- Écris le chiffre (1-9) imprimé ou écrit en GRAND au centre de la case, ou 0 si la case est vide.
- Ignore les petites annotations de coin (candidats/notes).
- Sers-toi des bordures ÉPAISSES qui délimitent les blocs 3×3 pour ne pas décaler l'alignement.
- Chaque ligne fait EXACTEMENT 9 caractères. Vérifie ce compte avant de passer à la suivante.

Transcris d'abord les 9 lignes (une par ligne, ex. "L1: 5 3 0 0 7 0 0 0 0").
Puis, tout à la fin, donne ta réponse finale sur une seule ligne au format JSON strict, sans aucun texte après :
{"grid":"<les 81 chiffres, lignes concaténées>"}

Si l'image ne contient pas de grille de sudoku lisible, réponds simplement {"grid":"ERROR"}.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
  }
  const limiter = getRatelimiter();
  if (limiter) {
    try {
      // Sur Vercel, x-forwarded-for est réécrit par la plateforme : le premier
      // élément est l'IP réelle du client, non falsifiable.
      const fwd = String(req.headers["x-forwarded-for"] || "");
      const ip = (fwd.split(",")[0] || "").trim() || String(req.headers["x-real-ip"] || "") || "ip-inconnue";
      const { success } = await limiter.limit(ip);
      if (!success) {
        res.status(429).json({ error: "Limite de scans atteinte pour aujourd'hui — réessaie demain." });
        return;
      }
    } catch (e) {
      // Fail-open : une panne Upstash ne doit pas casser le scan ; le filet
      // ultime est le plafond de dépense sur la clé Anthropic.
      console.warn("Rate-limit indisponible, requête laissée passer :", e && e.message);
    }
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY manquante côté serveur" });
    return;
  }
  try {
    const { image, media_type } = req.body || {};
    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "image manquante" });
      return;
    }
    // Garde-fou : refuse les images anormalement lourdes (~4 Mo max en base64)
    if (image.length > 4_000_000) {
      res.status(413).json({ error: "image trop lourde" });
      return;
    }

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.OCR_MODEL || "claude-opus-4-8",
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: media_type || "image/jpeg",
                  data: image,
                },
              },
              { type: "text", text: OCR_PROMPT },
            ],
          },
        ],
      }),
    });

    const data = await r.json().catch(() => null);
    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || "erreur API";
      res.status(502).json({ error: msg });
      return;
    }

    const txt = ((data && data.content) || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const clean = txt.replace(/```json|```/g, "").trim();

    // Le modèle transcrit ligne par ligne puis finit par {"grid":"..."} :
    // on récupère la DERNIÈRE occurrence du champ grid (la réponse finale).
    let grid = null;
    const gridMatches = [...clean.matchAll(/"grid"\s*:\s*"([^"]*)"/g)];
    if (gridMatches.length) grid = gridMatches[gridMatches.length - 1][1];
    if (!grid) {
      const m = clean.match(/[0-9]{81}/); // repli : une suite brute de 81 chiffres
      grid = m ? m[0] : null;
    }
    if (!grid || grid === "ERROR") {
      res.status(422).json({ error: "grille illisible sur la photo" });
      return;
    }
    const s = String(grid).replace(/[^0-9]/g, "");
    if (s.length !== 81) {
      res.status(422).json({ error: "format inattendu" });
      return;
    }
    res.status(200).json({ grid: s });
  } catch (e) {
    res.status(500).json({ error: "erreur serveur" });
  }
}
