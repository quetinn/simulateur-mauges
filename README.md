# Simulateur ENR — Mauges Communauté (application de soutenance)

Application web statique qui montre ce que deviennent le taux de couverture (heure par heure), les surplus, le
déficit, l'écrêtement et le réseau quand on développe le solaire et l'éolien sur Mauges Communauté.
Projet 2 « Intégration des ENR », cours Smart Grids, ESIEE Paris, 2026.

## Ouvrir l'application
- **En ligne** : https://quetinn.github.io/simulateur-mauges/ (GitHub Pages, branche `gh-pages`).
- **Hors ligne (secours)** : double-cliquer sur `index.html` (Chrome ou Edge). Aucune installation, aucun serveur.
  Tout est embarqué : seules les tuiles du fond de carte viennent d'Internet. Sans réseau, la carte s'affiche
  « Sans fond de carte » (contours des communes et postes sources seuls).

## Utilisation
- **Élu** : préréglages, curseurs de production et de solutions, indicateurs, verdict, journée type, carte, bilan mensuel.
- **Démo** : parcours en 5 étapes pour la soutenance (→, espace, touches 1 à 5 ou boutons ; ← pour revenir).
  Le mode projection s'active tout seul.
- **Expert** : deux semaines heure par heure, monotones, trajectoires (carte de chaleur cliquable), sensibilité
  (tornade), toutes les hypothèses (formulaire), indicateurs 2021-2025 avec export CSV / JSON, méthode et sources.
- **Touche P** (ou bouton « Projection ») : mode projection, texte 18 px et réglages repliés.
- **Année météo** : 2021 à 2025, ou « 2021-2025 (moyenne) » pour des indicateurs moyens.
- **Lien du scénario** : les réglages modifiés sont dans l'adresse (`#m_pv=2&bat_pilotage=pointe`) ;
  bouton « Copier le lien du scénario ».
- Bouton (i) de chaque indicateur : définition, unité et source.

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Interface et moteur de calcul (bloc `const MOTEUR`, identique à `../maquette/maquette.html`, **ne pas modifier**) |
| `data.js` | Données (`META`, `GEO`, `BIN`) produites par `donnees/scripts/14_export_simulateur.py`, **ne pas modifier à la main** |
| `precalcul.js` | Trajectoires et tornade (`PRECALC`), généré par `scripts/precalcul_js.mjs` depuis `../public/data/precalcul.json` |
| `vendor/leaflet/` | Leaflet 1.9.4 (carte) |
| `vendor/echarts/` | Apache ECharts 5.5.1 (graphiques) |
| `vendor/fonts/` | Archivo, Atkinson Hyperlegible, IBM Plex Mono (licence SIL OFL) |
| `scripts/captures.mjs` | Outil de développement : captures Playwright (non nécessaire à l'application) |
| `scripts/precalcul_js.mjs` | Outil de développement : régénère `precalcul.js` (`node app/scripts/precalcul_js.mjs`) |
| `scripts/publier_pages.sh` | Republie `app/` sur GitHub Pages après un commit sur `main` (`sh app/scripts/publier_pages.sh`) |
| `captures/` | Captures de contrôle avant / après chaque tâche (non nécessaire à l'application) |

L'application n'utilise ni `fetch`, ni modules ES, ni CDN : elle fonctionne aussi bien en `file://` qu'en `https://`.

## Vérifications (depuis la racine `simulateur/`)
```bash
node tests/parite_app.mjs
```
Contrôle que le moteur de l'app est identique à celui de la maquette et rejoue les 135 cas de référence
(`tests/golden.json`, tolérance relative 1e-6). Doit afficher `135/135` et `PARITÉ : OK`.

```bash
npm install
node app/scripts/captures.mjs <dossier> [--reseau] [--projection] [--vues elu,demo,expert]
```
Captures 1366×768 et 1920×1080 dans `app/captures/<dossier>/`, réseau coupé par défaut, avec un rapport
(requêtes réseau, erreurs console).

## Sources des données
ODRÉ, Enedis, RTE Eco2Mix, Météo-France, INSEE, Caparéseau (S3REnR), IGN (contours). Économie : NREL ATB 2025,
RTE, CRE (Projet 6 en sensibilité). Fond de carte : Esri / OpenStreetMap contributeurs.
