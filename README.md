# Sudoku·Coach

Solver de sudoku **pédagogique** : résous, comprends, progresse.

- 🎮 **Jouer** — saisis ou scanne une grille, joue avec notes, et demande au coach
  d'expliquer une case (🎯 précise ou 🎲 surprise) : 2 indices progressifs, puis la
  solution avec la technique détaillée pas à pas.
- 📚 **Apprendre** — une leçon illustrée et interactive pour chacune des 6 techniques
  du coach : candidat unique, single caché, paire nue, paire pointante, réduction
  bloc/ligne, duo caché.
- 📷 **Scanner** — photographie une grille (magazine, journal…) : elle est lue par
  l'IA via une fonction serveur (`/api/ocr`) qui garde ta clé API privée.

Tout le reste (solver, indices, notes, sauvegarde) tourne **dans le navigateur**,
sans compte ni serveur.

---

## Déployer sur Vercel (sans rien installer)

1. **Crée la clé API** (nécessaire seulement pour le scan photo)
   - Va sur [console.anthropic.com](https://console.anthropic.com) → crée un compte,
     ajoute un petit crédit, puis **API Keys → Create Key**. Copie la clé (`sk-ant-…`).
   - Chaque scan est facturé à l'usage sur cette clé (une image = un appel court).

2. **Mets le code sur GitHub**
   - Sur [github.com](https://github.com) : **New repository** (par ex. `sudoku-coach`, public ou privé).
   - Dans le dépôt vide : **uploading an existing file** → glisse **tout le contenu de ce
     dossier** (fichiers + dossiers `src`, `api`, `public`, `scripts`) → **Commit changes**.

3. **Importe dans Vercel**
   - Sur [vercel.com](https://vercel.com) : **Add New → Project** → importe le dépôt GitHub.
   - Framework détecté : **Vite** (ne rien changer).
   - Ouvre **Environment Variables** et ajoute :
     - `ANTHROPIC_API_KEY` = ta clé `sk-ant-…`
     - *(optionnel)* `OCR_MODEL` = `claude-haiku-4-5-20251001` pour un scan plus économique
       (défaut : `claude-sonnet-5`, plus fiable).
   - **Deploy** → tu obtiens une URL publique du type `https://sudoku-coach.vercel.app`.

4. **Partage & installe sur iPhone**
   - Envoie simplement l'URL à qui tu veux : **aucun compte n'est nécessaire** pour
     l'utiliser, scan compris.
   - Sur iPhone : ouvre l'URL dans **Safari** → bouton Partager → **« Sur l'écran
     d'accueil »**. L'appli s'ouvre alors en plein écran avec sa propre icône.
   - Pour un **widget** : app **Raccourcis** → nouveau raccourci « Ouvrir l'URL » →
     ajoute un widget Raccourcis sur l'écran d'accueil.

> 💡 Si tu modifies le code plus tard : mets à jour les fichiers sur GitHub,
> Vercel redéploie automatiquement — l'URL ne change pas.

---

## Développement local (optionnel)

```bash
npm install
npm run dev        # http://localhost:5173 (le scan nécessite Vercel ou `vercel dev`)
npm run check      # vérifie le moteur logique et les leçons
npm run build      # build de production
```

Pour tester le scan en local : `npm i -g vercel` puis `vercel dev`
(avec `ANTHROPIC_API_KEY` dans un fichier `.env`).

## Notes

- **Coûts** : seule la route `/api/ocr` consomme ta clé API. Le reste est statique.
  Si tu partages l'URL très largement et veux éviter les abus, on peut ajouter une
  limite de requêtes par IP — demande-le à Claude.
- **Vie privée** : les grilles et la progression sont sauvegardées uniquement dans
  le navigateur de chaque personne (localStorage). Rien n'est stocké côté serveur.
