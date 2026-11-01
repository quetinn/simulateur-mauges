// parite_app.mjs — Contrôle de parité du moteur embarqué dans app/index.html (docs/07 §3 tâche 2).
// 1. Le bloc « const MOTEUR = (function(){…})(); » de app/index.html doit être identique, au caractère près, à celui
//    de maquette/maquette.html.
// 2. Ce moteur rejoue les 135 cas de tests/golden.json sur les données de app/data.js (tolérance relative 1e-6).
// Usage (depuis la racine du simulateur ou d'ailleurs) : node tests/parite_app.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import vm from "node:vm";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..");
const lire = (p) => readFileSync(join(RACINE, p), "utf8");

// ---- 1. comparaison textuelle du bloc moteur
const DEBUT = "const MOTEUR = (function(){", FIN = "})();";
function blocMoteur(html, nom) {
  const i = html.indexOf(DEBUT);
  if (i < 0) throw new Error(`${nom} : bloc « ${DEBUT} » introuvable`);
  const j = html.indexOf(FIN, html.indexOf("return { chargerAnnee", i));
  if (j < 0) throw new Error(`${nom} : fin du bloc moteur introuvable`);
  return html.slice(i, j + FIN.length).replace(/\r\n/g, "\n");
}
const mApp = blocMoteur(lire("app/index.html"), "app/index.html");
const mRef = blocMoteur(lire("maquette/maquette.html"), "maquette/maquette.html");
let echec = 0;
if (mApp !== mRef) {
  const a = mApp.split("\n"), b = mRef.split("\n"); let k = 0; while (k < a.length && a[k] === b[k]) k++;
  console.log(`KO moteur différent de maquette/maquette.html à la ligne ${k + 1} du bloc :\n  app : ${a[k]}\n  réf : ${b[k]}`);
  echec++;
} else console.log(`Moteur identique à maquette/maquette.html (${mApp.split("\n").length} lignes).`);

// ---- 2. rejeu des cas golden avec le moteur de l'app et les données de app/data.js
const ctx = vm.createContext({ Float32Array, Float64Array, Int32Array, Uint8Array, Math, Object, Array });
vm.runInContext(lire("app/data.js") + "\n;globalThis.META = META; globalThis.BIN = BIN;", ctx);
vm.runInContext(mApp + "\n;globalThis.MOTEUR = MOTEUR;", ctx);
const { META, BIN, MOTEUR } = ctx;
const g = JSON.parse(lire("tests/golden.json"));
const defauts = Object.fromEntries(Object.entries(META.parametres).map(([k, v]) => [k, v.defaut]));
const ANS = {};
for (const a of META.annees) {
  const buf = Buffer.from(BIN[a], "base64"), ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  ANS[a] = MOTEUR.chargerAnnee(ab, META.n_heures[a], META.colonnes, META.constantes);
}
let casOk = 0, pire = 0;
for (const c of g.cas) {
  const r = MOTEUR.simuler(ANS[c.annee], { ...c.parametres, annee: c.annee }, defauts, META.profils);
  let ok = true;
  for (const [k, v] of Object.entries(c.attendu)) {
    if (typeof v === "boolean") { if (r[k] !== v) { ok = false; console.log("KO", c.id, k, r[k], v); } continue; }
    const e = Math.abs(r[k] - v) / Math.max(Math.abs(v), 1);
    pire = Math.max(pire, e);
    if (!(e <= g.tolerance_relative)) { ok = false; console.log("KO", c.id, k, r[k], v, e.toExponential(2)); }
  }
  if (ok) casOk++;
}
if (casOk !== g.cas.length) echec++;
console.log(`${casOk}/${g.cas.length} cas golden verts (écart relatif max ${pire.toExponential(2)}).`);
console.log(echec ? "PARITÉ : ÉCHEC" : "PARITÉ : OK");
process.exit(echec ? 1 : 0);
