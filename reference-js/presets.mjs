import { readFileSync } from "node:fs";
import { chargerAnnee, simuler } from "./moteur.mjs";
const D = "../public/data/", meta = JSON.parse(readFileSync(D + "meta.json"));
const def = Object.fromEntries(Object.entries(meta.parametres).map(([k, v]) => [k, v.defaut]));
const an = {}; for (const a of meta.annees) { const b = readFileSync(D + `annee_${a}.bin`); an[a] = chargerAnnee(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), meta.n_heures[a], meta.colonnes, meta.constantes); }
const f = (x, d = 1) => x.toFixed(d);
console.log("| Préréglage | Autonomie h/h 2022 | moy. [min-max] 2021-25 | Écrêtement 2022 | moy. [max] | Conforme 5 ans | Pointe inj. 2022 (MW) | CAPEX (M€) |");
for (const [id, pr] of Object.entries(meta.presets)) {
  const rs = meta.annees.map(a => simuler(an[a], { ...pr.p, annee: a }, def, meta.profils));
  const r22 = rs[meta.annees.indexOf(2022)];
  const ch = rs.map(r => r.couverture_horaire * 100), ec = rs.map(r => r.ecretement_part * 100);
  const mean = v => v.reduce((s, x) => s + x, 0) / v.length;
  console.log(`| ${id} | ${f(r22.couverture_horaire*100)} % | ${f(mean(ch))} [${f(Math.min(...ch))}-${f(Math.max(...ch))}] % | ${f(r22.ecretement_part*100)} % | ${f(mean(ec))} [${f(Math.max(...ec))}] % | ${rs.every(r=>r.conforme)?"oui":"non"} | ${f(r22.pointe_injection_MW,0)} | ${f(r22.capex_batterie_EUR/1e6,0)} |`);
}
