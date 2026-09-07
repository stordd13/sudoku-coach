/* Script de fumée permanent (R2, v2.4) — l'app BUILDÉE dans un Chromium
   headless (Playwright). Lancer : npm run smoke   (build + ce script)
   Prérequis une fois : npx playwright install chromium
   Scénarios :
     1. gagner une grille Facile via 👣 (Étape suivante → Voir la solution →
        Tout voir → Placer), jusqu'à « Grille terminée » ;
     2. recharger deux fois → Stats : ligne Facile = 1 / 1 ;
     3. scan hors-ligne → message « Pas de connexion » ;
     4. thème sombre → au rechargement, jamais de passage par le clair.
   Sélecteurs par rôle et texte (français : locale fr-FR forcée) — aucun
   data-testid dans l'app. Échec = code 1 + capture dans SMOKE_DIR (ou le
   dossier temporaire). */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = Number(process.env.SMOKE_PORT) || 4173;
const URL = `http://localhost:${PORT}/`;
const SHOTS = process.env.SMOKE_DIR || join(tmpdir(), "sudoku-coach-smoke");
mkdirSync(SHOTS, { recursive: true });
const T0 = Date.now();
let failures = 0;
const ok = (cond, label) => {
  if (cond) console.log("  ✓", label);
  else { failures++; console.error("  ✗ ÉCHEC :", label); }
};

let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.error("Playwright absent : npm i -D playwright && npx playwright install chromium");
  process.exit(1);
}

/* ---------- Serveur : vite preview sur dist/ ---------- */
const server = spawn("npx", ["vite", "preview", "--port", String(PORT), "--strictPort"], { stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (d) => { serverLog += d; });
server.stderr.on("data", (d) => { serverLog += d; });
const waitForServer = async () => {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(URL); if (r.ok) return true; } catch { /* pas encore */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};
if (!(await waitForServer())) {
  console.error("vite preview ne répond pas sur", URL, "\n", serverLog);
  server.kill();
  process.exit(1);
}
console.log(`Fumée sur ${URL} (dist/ via vite preview)`);

let browser;
try {
  browser = await chromium.launch();
} catch (err) {
  console.error("Chromium indisponible — lance : npx playwright install chromium\n", err.message);
  server.kill();
  process.exit(1);
}
const context = await browser.newContext({ locale: "fr-FR", viewport: { width: 420, height: 860 } });
const page = await context.newPage();
page.setDefaultTimeout(15000);
const shot = (name) => page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }).catch(() => {});
const step = async (label, fn) => {
  try { await fn(); }
  catch (err) { failures++; console.error("  ✗ ÉCHEC :", label, "—", err.message.split("\n")[0]); await shot(label.replace(/\W+/g, "_")); }
};
const btn = (re) => page.getByRole("button", { name: re });
const generatingGone = () => page.getByText(/Génération de la grille/).waitFor({ state: "hidden", timeout: 30000 });

/* ---------- 1. Gagner une Facile via 👣 ---------- */
await step("1. partie Facile gagnée via 👣", async () => {
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await btn(/Une nouvelle grille/).first().click();
  await btn(/Facile/).first().click();
  await generatingGone();
  await page.getByRole("group", { name: /Grille de sudoku/ }).waitFor();
  let moves = 0;
  const wonPanel = page.getByText(/Grille terminée/);
  const won = () => wonPanel.waitFor({ timeout: 700 }).then(() => true, () => false);
  for (; moves < 81; moves++) {
    if (await won()) break;
    await btn(/Étape suivante/).first().click();
    const see = btn(/Voir la solution/);
    // Après le dernier chiffre, le panneau de victoire arrive après l'animation :
    // on attend l'un ou l'autre.
    const first = await Promise.race([
      see.waitFor({ timeout: 20000 }).then(() => "see", () => "timeout"),
      wonPanel.waitFor({ timeout: 20000 }).then(() => "won", () => "timeout"),
    ]);
    if (first === "won") break;
    if (first !== "see") throw new Error("ni « Voir la solution » ni « Grille terminée » après 👣");
    await see.click();
    const all = btn(/^Tout voir$/);
    if (await all.isVisible().catch(() => false)) await all.click();
    const place = btn(/Placer le/);
    await place.waitFor();
    await place.click();
  }
  await page.getByText(/Grille terminée/).waitFor();
  ok(moves > 0 && moves < 81, `grille Facile terminée en ${moves} appuis 👣`);
});

/* ---------- 2. Recharger ×2 → Stats = 1 / 1 ---------- */
await step("2. rechargements et Stats", async () => {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  const home = btn(/Accueil/).first();
  if (await home.isVisible().catch(() => false)) await home.click();
  await btn(/Stats/).first().click();
  const row = page.getByText(/^Facile$/).first().locator("..");
  await row.waitFor();
  const text = (await row.textContent()) || "";
  ok(/1\s*\/\s*1/.test(text), `Stats : ligne Facile = 1 / 1 (« ${text.replace(/\s+/g, " ").trim()} »)`);
  await btn(/Accueil/).first().click();
});

/* ---------- 3. Scan hors-ligne → message réseau ---------- */
await step("3. scan hors-ligne", async () => {
  await btn(/Saisir une grille/).first().click();
  await page.getByRole("group", { name: /Grille de sudoku/ }).waitFor();
  await context.setOffline(true);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.setInputFiles('input[type="file"]', { name: "grille.png", mimeType: "image/png", buffer: png });
  const status = page.getByRole("status");
  await status.getByText(/Pas de connexion/).waitFor();
  ok(true, "scan hors-ligne : « Pas de connexion » affiché, aucun appel réseau");
  await context.setOffline(false);
});

/* ---------- 4. Thème sombre : pas de flash clair au rechargement ---------- */
await step("4. thème sombre sans flash", async () => {
  await page.getByRole("button", { name: /Réglages/ }).first().click();
  await btn(/^Sombre$/).first().click();
  // Le script d'init tourne avant la création de <html> : on observe document
  // (arrivée de la racine, puis chaque changement de data-theme).
  await page.addInitScript(() => {
    window.__themes = [];
    const push = (el) => window.__themes.push(el.getAttribute("data-theme"));
    new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "childList") for (const n of m.addedNodes) if (n === document.documentElement) push(n);
        if (m.type === "attributes" && m.target === document.documentElement) push(m.target);
      }
    }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-theme"] });
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  const early = await page.evaluate(() => ({
    theme: document.documentElement.getAttribute("data-theme"),
    bg: getComputedStyle(document.documentElement).backgroundColor,
    seen: window.__themes,
  }));
  await page.waitForLoadState("load");
  await page.waitForTimeout(500); // laisse React monter et appliquer son effet de thème
  const late = await page.evaluate(() => ({ theme: document.documentElement.getAttribute("data-theme"), seen: window.__themes || ["(journal absent)"] }));
  ok(early.theme === "dark" && early.bg === "rgb(20, 24, 27)", `dès domcontentloaded : data-theme=dark, fond ${early.bg}`);
  ok(late.theme === "dark" && !late.seen.includes("light"), `après chargement : toujours sombre, séquence [${late.seen.join(", ")}] sans « light »`);
});

await browser.close();
server.kill();
console.log(`\n  ℹ temps total : ${((Date.now() - T0) / 1000).toFixed(1)} s${failures ? ` — captures dans ${SHOTS}` : ""}`);
console.log(failures === 0 ? "\nFUMÉE OK ✓" : `\n${failures} ÉCHEC(S) ✗`);
process.exit(failures === 0 ? 0 : 1);
