/* ================================================================
   /api/ocr — fonction serverless Vercel
   Reçoit { image: <base64 jpeg>, media_type } et renvoie { grid: "81 chiffres" }.
   La clé API reste côté serveur : variable d'environnement ANTHROPIC_API_KEY.
   Modèle configurable via la variable OCR_MODEL (défaut : claude-sonnet-5 ;
   claude-haiku-4-5-20251001 est une option plus économique).
   ================================================================ */

const OCR_PROMPT = `Tu lis la photo d'une grille de sudoku (9x9). Réponds UNIQUEMENT avec ce JSON, sans aucun texte autour ni balises markdown :
{"grid":"<81 caractères>"}
Règles : lis la grille ligne par ligne, du haut vers le bas puis de gauche à droite. Un caractère par case : le chiffre (1-9) si la case contient un chiffre définitif (imprimé, ou écrit en grand au centre), 0 si la case est vide. Ignore les petites annotations de coin (candidats). Si l'image ne contient pas de grille lisible, réponds {"grid":"ERROR"}.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Méthode non autorisée" });
    return;
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
        model: process.env.OCR_MODEL || "claude-sonnet-5",
        max_tokens: 300,
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

    let grid = null;
    try { grid = JSON.parse(clean).grid; } catch (e) { /* fallback ci-dessous */ }
    if (!grid) {
      const m = clean.match(/[0-9]{81}/);
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
