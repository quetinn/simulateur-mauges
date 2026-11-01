// captures.mjs — Captures Playwright de app/index.html ouvert en file:// (docs/07 §5).
// Usage : node app/scripts/captures.mjs <dossier> [--reseau] [--projection] [--vues elu,demo,expert]
//   <dossier>     sous-dossier de app/captures/ (ex. avant, apres-t1)
//   --reseau      laisse passer Internet ; par défaut toute requête http(s) est bloquée (test « Wi-Fi coupé »)
//   --projection  active le mode projection (touche P) avant les captures
// Sortie : app/captures/<dossier>/<largeur>x<hauteur>_<vue>.png et un rapport (requêtes réseau, erreurs console).
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const APP = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const dossier = args.find(a => !a.startsWith("--")) || "courant";
const reseau = args.includes("--reseau"), projection = args.includes("--projection");
const iv = args.indexOf("--vues"), vues = iv >= 0 ? args[iv + 1].split(",") : ["elu", "demo", "expert"];
const TAILLES = [[1366, 768], [1920, 1080]];
const OUT = join(APP, "captures", dossier);
mkdirSync(OUT, { recursive: true });

const url = pathToFileURL(join(APP, "index.html")).href;
const browser = await chromium.launch();
const rapport = [];
for (const [w, h] of TAILLES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: "light", locale: "fr-FR" });
  const bloquees = [], erreurs = [];
  await ctx.route(/^https?:/, r => { bloquees.push(r.request().url()); return reseau ? r.continue() : r.abort("internetdisconnected"); });
  if (!reseau) await ctx.setOffline(true); // comme « Wi-Fi coupé » : navigator.onLine === false
  const page = await ctx.newPage();
  page.on("console", m => { if (m.type() === "error") erreurs.push(m.text()); });
  page.on("pageerror", e => erreurs.push("pageerror: " + e.message));
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1200);
  const tag = `${w}x${h}`;
  const shot = async (nom, full = false) => { await page.screenshot({ path: join(OUT, `${tag}_${nom}.png`), fullPage: full }); };
  if (projection) { await page.keyboard.press("p"); await page.waitForTimeout(500); }
  if (vues.includes("elu")) {
    await page.click("#t-elu"); await page.waitForTimeout(600);
    await shot("elu"); await shot("elu_pleine", true);
  }
  if (vues.includes("demo")) {
    await page.click("#t-demo"); await page.waitForTimeout(900);
    const n = await page.evaluate(() => document.querySelectorAll("#demo-steps button").length);
    for (let k = 1; k <= (+n || 5); k++) {
      if (k > 1) { await page.focus("body"); await page.keyboard.press("ArrowRight"); await page.waitForTimeout(1100); }
      await shot(`demo${k}`);
    }
  }
  if (vues.includes("expert")) {
    await page.click("#t-expert"); await page.waitForTimeout(900);
    await shot("expert"); await shot("expert_pleine", true);
  }
  rapport.push(`${tag} : ${bloquees.length} requête(s) http(s) ${reseau ? "passées" : "bloquées"}${bloquees.length ? "\n  " + [...new Set(bloquees.map(u => new URL(u).host))].join("\n  ") : ""}\n${tag} : ${erreurs.length} erreur(s) console${erreurs.length ? "\n  " + [...new Set(erreurs)].map(e => `${e} (×${erreurs.filter(x => x === e).length})`).join("\n  ") : ""}`);
  await ctx.close();
}
await browser.close();
const txt = `Captures « ${dossier} » — ${new Date().toISOString()} — réseau ${reseau ? "ouvert" : "coupé"}${projection ? " — mode projection" : ""}\n${rapport.join("\n")}\n`;
writeFileSync(join(OUT, "rapport.txt"), txt);
console.log(txt);
