/* ================================================================
   Défi du jour — la même grille pour tout le monde, sans serveur.
   Module pur (importé par check.mjs sous Node) : la seed vient de la date
   "YYYY-MM-DD", la génération est bornée en tentatives (jamais en temps).
   Le déterminisme ne vaut qu'à version identique du moteur : une évolution
   des finders change les grilles futures — accepté, rien à figer côté
   serveur. Seul contact avec l'horloge : le paramètre par défaut de
   localDateStr, injectable en test.
   ================================================================ */

import { generatePuzzle, makeRng } from "./engine.js";

/* Niveau du défi par jour de semaine, lundi → dimanche. */
export const DAILY_LEVELS = [2, 2, 3, 3, 3, 4, 4];

/* Seed FNV-1a 32 bits de la date — stable, bien répartie, sans dépendance. */
export function dailySeed(dateStr) {
  let h = 0x811c9dc5;
  for (let i = 0; i < dateStr.length; i++) {
    h ^= dateStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/* Jour de semaine calculé en UTC : "YYYY-MM-DD" est parsé en UTC par Date,
   le relire via getDay() (local) décalerait le niveau d'un jour pour une
   partie du globe — même grille mais niveau affiché différent. */
export function dailyLevelFor(dateStr) {
  const dow = new Date(dateStr + "T00:00:00Z").getUTCDay(); // 0 = dimanche
  return DAILY_LEVELS[(dow + 6) % 7];
}

/* La grille du jour. timeBoxMs: Infinity → un appareil lent produit la même
   grille qu'un rapide (voir generatePuzzle). En cas de fallback après les
   400 tentatives, level (grade réel) peut différer de targetLevel — le même
   fallback pour tout le monde, l'UI affiche le grade réel. */
export function dailyPuzzle(dateStr) {
  const targetLevel = dailyLevelFor(dateStr);
  const p = generatePuzzle(targetLevel, makeRng(dailySeed(dateStr)), { timeBoxMs: Infinity });
  return { ...p, targetLevel, dateStr };
}

/* Date locale de l'appareil (le défi bascule à minuit local, façon Wordle). */
export function localDateStr(d = new Date()) {
  const p2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

/* Décale une date "YYYY-MM-DD" de n jours — arithmétique en UTC, insensible
   aux changements d'heure locaux. */
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* Série courante — sémantique Wordle : « aujourd'hui pas encore fait » ne
   casse PAS la série (à 8 h du matin, celle d'hier est vivante) ; elle ne
   casse que si un jour révolu manque. */
export function currentStreak(doneMap, todayStr) {
  let day = doneMap[todayStr] ? todayStr : shiftDate(todayStr, -1);
  let n = 0;
  while (doneMap[day]) { n++; day = shiftDate(day, -1); }
  return n;
}

/* Record : la plus longue suite de jours consécutifs réussis. */
export function bestStreak(doneMap) {
  const days = Object.keys(doneMap).filter((d) => doneMap[d]).sort();
  let best = 0, run = 0, prev = null;
  for (const day of days) {
    run = prev !== null && shiftDate(prev, 1) === day ? run + 1 : 1;
    if (run > best) best = run;
    prev = day;
  }
  return best;
}

/* Les jours du mois contenant dateStr, pour le mini-calendrier de l'accueil :
   [{ dateStr, day, dow }] avec dow en 0 = dimanche … 6 = samedi (UTC). */
export function monthCells(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells = [];
  for (let day = 1; day <= lastDay; day++) {
    const ds = `${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ dateStr: ds, day, dow: new Date(ds + "T00:00:00Z").getUTCDay() });
  }
  return cells;
}
