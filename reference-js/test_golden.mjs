import { readFileSync } from "node:fs";
import { chargerAnnee, simuler } from "./moteur.mjs";
const D = "../public/data/", meta = JSON.parse(readFileSync(D + "meta.json")), g = JSON.parse(readFileSync("../tests/golden.json"));
const defauts = Object.fromEntries(Object.entries(meta.parametres).map(([k, v]) => [k, v.defaut]));
const an = {}; for (const a of meta.annees) { const b = readFileSync(D + `annee_${a}.bin`); an[a] = chargerAnnee(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), meta.n_heures[a], meta.colonnes, meta.constantes); }
let ko = 0, pire = 0, t0 = performance.now();
for (const c of g.cas) {
  const r = simuler(an[c.annee], { ...c.parametres, annee: c.annee }, defauts, meta.profils);
  for (const [k, v] of Object.entries(c.attendu)) {
    if (typeof v === "boolean") { if (r[k] !== v) { ko++; console.log("KO", c.id, k, r[k], v); } continue; }
    const e = Math.abs(r[k] - v) / Math.max(Math.abs(v), 1);
    pire = Math.max(pire, e);
    if (e > g.tolerance_relative) { ko++; if (ko < 15) console.log("KO", c.id, k, r[k], v, e); }
  }
}
const dt = (performance.now() - t0) / g.cas.length;
console.log(`${g.cas.length} cas, ${ko} écart(s) hors tolérance, écart relatif max ${pire.toExponential(2)}, ${dt.toFixed(1)} ms/simulation`);
process.exit(ko ? 1 : 0);
