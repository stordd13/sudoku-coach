/* Web Worker du coach (v2.4, B3) : exécute nextStep / buildPlan hors du fil
   principal quand l'état exige le palier 5 (cf. coachClient.js). Fichier
   navigateur uniquement (self) — jamais importé par check.mjs, qui teste
   handleRequest en direct. */
import { handleRequest } from "./coachWorker.js";

self.onmessage = (e) => {
  self.postMessage(handleRequest(e.data));
};
