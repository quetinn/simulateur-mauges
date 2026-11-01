// precalcul_js.mjs — Génère app/precalcul.js (const PRECALC = …) depuis public/data/precalcul.json (docs/07 §3 tâche 7).
// Le JSON vient de Python (donnees/scripts/12_tornade.py et 13_trajectoire.py) et contient des NaN (batterie introuvable) :
// ils deviennent null. Aucune valeur n'est modifiée. Usage (depuis la racine du simulateur) : node app/scripts/precalcul_js.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const brut = readFileSync(join(RACINE, "public/data/precalcul.json"), "utf8");
const data = JSON.parse(brut.replace(/(?<=[:\[,]\s*)NaN(?=\s*[,\]}])/g, "null"));
const sortie = join(RACINE, "app/precalcul.js");
writeFileSync(sortie, `// Généré par app/scripts/precalcul_js.mjs depuis public/data/precalcul.json — ne pas modifier à la main.
// trajectoires : moyennes 2021-2025 (ecret_max = pire année) ; tornade : sensibilités autour de B / C + batterie.
const PRECALC = ${JSON.stringify(data)};
`);
console.log(`${sortie} : ${data.trajectoires.length} trajectoires, ${data.tornade.length} lignes de tornade.`);
