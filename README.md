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
       (défaut : `claude-opus-4-8`, le plus fiable).
     - *(optionnel, recommandé si tu partages l'URL)* `UPSTASH_REDIS_REST_URL` et
       `UPSTASH_REDIS_REST_TOKEN` : activent la limite anti-abus de **30 scans / jour / IP**
       sur `/api/ocr`. Pour les obtenir : [console.upstash.com](https://console.upstash.com)
       → compte gratuit → **Create Database** (Redis, région proche, le tier gratuit suffit
       largement) → onglet **REST API** → copie les deux valeurs. Sans ces variables, le
       scan fonctionne sans limite (pratique en local).
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

## Application iOS (Capacitor)

La même app web est emballée dans une coquille native iOS avec
[Capacitor](https://capacitorjs.com) (dossier `ios/`, dépendances gérées par
Swift Package Manager). Le cycle de travail, sur un Mac avec Xcode :

```bash
npm run build:ios      # build web dans dist/, avec l'URL d'API absolue (.env.ios)
npx cap sync ios       # copie dist/ dans la coquille + met à jour les plugins
npx cap open ios       # ouvre le projet dans Xcode (compiler / lancer / archiver)
```

Le build natif lit `.env.ios` (versionné, valeurs publiques uniquement) :
`VITE_API_BASE` pointe le déploiement Vercel pour que le scan fonctionne depuis
le WebView (`capacitor://localhost`). Le build web (`npm run build`) ne lit pas
ce fichier et garde son URL relative.

> ⚠️ Sur un clone frais, `ios/App/App/public` et `ios/App/App/capacitor.config.json`
> n'existent pas (fichiers générés, non versionnés) : lance **toujours**
> `npm run build:ios && npx cap sync ios` avant d'ouvrir Xcode, sinon la compilation échoue.

L'identifiant de l'app (`com.stordeur.sudokucoach`), son nom et le `webDir`
sont dans `capacitor.config.json`. La version web/PWA reste déployée sur Vercel
exactement comme avant — la coquille iOS n'y change rien.

## Hors-ligne (PWA)

L'appli embarque un service worker qui précache tout au premier chargement :
jeu, leçons, indices, notes et sauvegarde fonctionnent ensuite **sans réseau**.
Seul le **scan photo** exige une connexion (il appelle `/api/ocr`) — hors-ligne,
il échoue avec son message d'erreur habituel.

Test manuel :

1. Charge l'appli une fois (URL Vercel, ou `npm run build && npm run preview`).
2. Ferme-la, puis coupe le réseau (mode avion, ou DevTools → Network → Offline).
3. Rouvre l'appli → tout fonctionne, sauf le scan.

Les mises à jour se font toutes seules : la nouvelle version est téléchargée en
arrière-plan et devient active à l'ouverture suivante.

## Notes

- **Coûts** : seule la route `/api/ocr` consomme ta clé API. Le reste est statique.
  Si les variables Upstash sont configurées (voir plus haut), chaque IP est limitée à
  **30 scans par jour** — le filet de sécurité ultime reste un **plafond de dépense
  mensuel** sur ta clé, à définir dans la console Anthropic.
- **Vie privée** : les grilles et la progression sont sauvegardées uniquement dans
  le navigateur de chaque personne (localStorage). Rien n'est stocké côté serveur.
