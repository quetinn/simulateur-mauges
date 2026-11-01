# 01 — Architecture du simulateur

> Objectif : un simulateur **rapide** (réponse < 100 ms à chaque réglage), **robuste** (résultats identiques au moteur
> Python de référence, aucune panne pendant la soutenance) et **soigné** (lisible au projecteur, crédible pour des élus).

## 1. Vue d'ensemble

```
 donnees/ (Python, hors du dépôt web)                     simulateur/ (dépôt GitHub → GitHub Pages)
 ┌──────────────────────────────┐   export   ┌──────────────────────────────────────────────────────────┐
 │ 02 traitement → mauges_*.csv │──────────▶ │ public/data/  meta.json · annee_*.bin · geo.json ·       │
 │ moteur_ref.py (référence)    │            │               precalcul.json                              │
 │ 13 trajectoires · 12 tornade │            │ tests/golden.json (135 cas)                               │
 │ 14_export_simulateur.py      │            │                                                          │
 └──────────────────────────────┘            │  Navigateur                                               │
                                             │  ┌──────────────┐  postMessage  ┌──────────────────────┐ │
                                             │  │ Thread UI     │─────────────▶│ Web Worker            │ │
                                             │  │ React + store │◀─────────────│ engine/ (TS pur)      │ │
                                             │  │ (Zustand)     │   résultats   │ données en mémoire    │ │
                                             │  └──────────────┘               └──────────────────────┘ │
                                             │  Leaflet + tuiles OSM · uPlot · composants SVG maison     │
                                             └──────────────────────────────────────────────────────────┘
```

Principes :
1. **Séparation stricte données / moteur / interface.** Les données et le schéma des paramètres viennent de Python ;
   le moteur est une bibliothèque TS pure ; l'interface ne fait qu'afficher et piloter.
2. **Le moteur ne vit que dans le worker** (repli sur le thread principal si le worker échoue).
3. **Un seul état source** (store Zustand) : paramètres courants + année(s) + vue. Tout le reste est dérivé.
4. **Tout ce qui est lourd et fixe est précalculé en Python** (grille de trajectoires, tornade) ; tout ce qui dépend
   des curseurs est calculé en direct.

## 2. Pile technique (versions : dernières stables à l'initialisation, puis figées dans `package-lock.json`)

| Besoin | Choix | Pourquoi |
|---|---|---|
| Build / dev | **Vite** + `@vitejs/plugin-react` | rapide, `base` configurable pour GitHub Pages |
| UI | **React 18/19 + TypeScript strict** | décision du groupe ; écosystème ; bien maîtrisé par Claude Code |
| État | **Zustand** (+ middleware `subscribeWithSelector`) | store minimal, sélecteurs fins, pas de boilerplate |
| Worker | **Comlink** au-dessus d'un `Worker` module Vite (`new Worker(new URL(...), { type: "module" })`) | appels typés, pas de protocole maison |
| Validation des données | **zod** | valider `meta.json` / `geo.json` au chargement, typer les paramètres |
| Graphiques horaires (8 760 points × plusieurs séries) | **uPlot** | canvas, < 50 Ko, fluide sur 1 an horaire, zoom natif |
| Petits graphiques (barres, jauges, tornade, carte de chaleur) | **SVG maison** (composants React) | contrôle total du style, accessibilité, pas de dépendance |
| Carte | **Leaflet + react-leaflet**, tuiles **OpenStreetMap** (ou Plan IGN via data.geopf.fr) | décision du groupe (fond de carte) ; voir §8 pour le hors-ligne |
| Polices | Archivo, Atkinson Hyperlegible, IBM Plex Mono via **@fontsource** (auto-hébergées) | pas d'appel à Google Fonts pendant la soutenance |
| Tests | **Vitest** (unitaires + parité golden + propriétés avec **fast-check**), **Playwright** (e2e, captures) | parité numérique bloquante, non-régression visuelle |
| Qualité | ESLint (typescript-eslint, react-hooks, jsx-a11y), Prettier | |
| PWA / hors-ligne | **vite-plugin-pwa** (Workbox) | mise en cache de l'application, des données et des tuiles consultées |
| Déploiement | **GitHub Actions** → `actions/deploy-pages` | build + tests à chaque push sur `main` |

## 3. Arborescence du dépôt

```
simulateur-mauges/
├── CLAUDE.md · README.md · docs/ · maquette/ · reference-js/
├── public/
│   ├── data/                      ← produit par Python (ne pas éditer)
│   └── icons/ · manifest
├── tests/golden.json · tests/golden_series_2022_14j.json
├── e2e/                           ← Playwright
├── scripts/check-data.ts          ← tailles, sha256, cohérence meta ↔ .bin
└── src/
    ├── main.tsx · App.tsx · router.tsx (3 vues : /demo, /elu, /expert ; HashRouter pour GitHub Pages)
    ├── engine/                    ← TS pur, AUCUN import React/DOM
    │   ├── types.ts               Annee, Parametres, Resultat, Series
    │   ├── profils.ts             masques horaires, répartition par jour, profil VE non piloté, remplissage du surplus
    │   ├── batterie.ts            boucle batterie (2 pilotages)
    │   ├── simuler.ts             chaîne complète (cf. 02_SPEC_MOTEUR)
    │   ├── economie.ts            gain, VAN, facteur d'annuité
    │   ├── agregats.ts            moyennes / min / max multi-années, journées types, monotone, bilans mensuels
    │   ├── index.ts
    │   ├── golden.test.ts         135 cas → bloquant
    │   ├── series.test.ts         séries horaires 14 j (debug)
    │   └── proprietes.test.ts     invariants (bilans énergétiques, bornes, monotonie)
    ├── worker/
    │   ├── engine.worker.ts       charge les .bin une fois, expose simuler / simulerToutesAnnees / dimensionnerBatterie
    │   └── client.ts              wrapper Comlink + repli thread principal + annulation (jeton de requête)
    ├── data/
    │   ├── schemas.ts             zod : Meta, Geo, Precalcul
    │   ├── load.ts                fetch (BASE_URL), validation, sha256 (SubtleCrypto)
    │   └── presets.ts             préréglages lus dans meta.presets
    ├── state/
    │   ├── store.ts               params, anneeMode ("typique" | 2021…2025 | "toutes"), vue, scénario actif
    │   ├── url.ts                 synchronisation params ↔ URL (lien partageable, uniquement les écarts au défaut)
    │   └── useSimulation.ts       déclenche le worker (rafale → dernier gagnant), expose { resultat, multi, statut }
    ├── features/
    │   ├── demo/                  parcours guidé 5 étapes (soutenance)
    │   ├── controls/              rail de réglages généré depuis meta.parametres (+ variantes « élu » simplifiées)
    │   ├── kpi/                   bande d'indicateurs, verdict, jauge d'écrêtement
    │   ├── journee/               journée type été/hiver (aire empilée + seuil 120 %)
    │   ├── annee/                 vue horaire uPlot, monotone, état de charge
    │   ├── bilan/                 bilan mensuel production / conso / surplus
    │   ├── carte/                 Leaflet, communes, postes sources (saturation)
    │   ├── economie/              CAPEX, gain, VAN, coût par point d'autonomie
    │   ├── trajectoires/          carte de chaleur PV × éolien (précalcul) + point courant
    │   ├── sensibilite/           tornade (précalcul)
    │   ├── hypotheses/            tableau des hypothèses + sources (depuis meta.parametres)
    │   └── export/                CSV / JSON des résultats, copie du lien
    ├── ui/                        Slider, Toggle, Segmented, Card, Stat, Tooltip, InfoSource, Tabs, Badge…
    ├── charts/                    primitives SVG (axes, barres, aire), adaptateur uPlot, palette
    ├── i18n/fr.ts                 tous les textes
    └── styles/tokens.css · global.css
```

## 4. Données et contrat d'interface

`public/data/meta.json` (validé par zod au démarrage) :
- `annees` [2021…2025], `n_heures` {année: 8760|8784}, `debut_utc`, `colonnes` (ordre des colonnes des `.bin`), `dtype` "float32-le".
- `constantes` : `Ppv_A`, `Peol_A`, `conso_2024_MWh`, parts sectorielles, résidences principales, logements fossiles,
  voitures des ménages, `degres_heures_16_moyen`.
- `parametres` : `{ clé: { defaut, min, max, pas, unite, groupe, libelle, source, choix? } }` → **source unique** des formulaires.
- `presets` : `{ id: { libelle, p: {…écarts au défaut} } }` (A, B, C, B/C + batterie, recommandées, 2035).
- `profils` : plages horaires des modèles VE / ECS (fenêtres, parts).
- `annee_typique` (2022), `sha256` des `.bin`, `version_donnees`.

`annee_<a>.bin` : `Float32Array` little-endian ; colonnes **concaténées** (et non entrelacées) dans l'ordre de `colonnes` :
`fc_pv, fc_eol, autres, c_reel, temp, heure, jour, doy` ; longueur = `8 × n_heures`. ~280 Ko par année (≈ 1,4 Mo,
servis compressés par GitHub Pages).

`geo.json` : `communes` (FeatureCollection WGS84, contours simplifiés, `pv_MW`, `eol_MW`, population) ; `postes`
(code, nom, lon/lat, parc des Mauges PV/éolien, capacité réservée, restant à affecter, file d'attente, taux de
remplissage, date) ; `pv_diffus_non_affecte_MW`.

`precalcul.json` : `trajectoires` (grille PV × éolien × paquet × horizon : couverture, écrêtement moyen/max, batterie
minimale, VAN, faisabilité, postes) ; `tornade` (facteurs × scénario × famille).

**Versionnage** : `meta.version_donnees` est affichée dans le pied de page ; un changement de données sans relancer
les tests golden est détecté par `npm run data:check` (sha256) en CI.

## 5. Moteur et worker

- API du moteur (pure, synchrone) :
  `simuler(annee: Annee, p: Partial<Parametres>, opts?: { series?: boolean }): Resultat`
  `simulerToutesAnnees(p): { parAnnee: Record<number, Resultat>, moyenne, min, max }`
  `dimensionnerBatterie(p, contrainte = 0.05): { puissance_fraction, energie_MWh } | null` (recherche par dichotomie sur
  `bat_puissance`, contrainte « chaque année ≤ 5 % »).
- Le worker charge les 5 `.bin` une fois (≈ 1,4 Mo), construit les objets `Annee` (Float64Array) et répond aux requêtes.
- **Stratégie de calcul progressive** à chaque changement de paramètre :
  1. année affichée avec séries horaires (≈ 6 ms) → rendu immédiat des KPI et graphiques ;
  2. les 5 années sans séries (≈ 30 ms) → fourchettes min-max et verdict « chaque année » ;
  3. à la demande seulement : dimensionnement de batterie (≤ 15 simulations × 5 ans ≈ 0,5 s, avec indicateur).
- **Annulation** : chaque requête porte un numéro ; le client ignore toute réponse dont le numéro n'est pas le dernier
  (les curseurs envoient au plus une requête par image, `requestAnimationFrame` + dernier gagnant).
- **Transferts** : les séries horaires renvoyées sont des `Float32Array` transférées (`Comlink.transfer`) pour éviter les copies.
- **Repli** : si le worker ne démarre pas (navigateur ancien, CSP), le client importe le moteur sur le thread principal.

## 6. État, navigation, liens partageables

- Store : `{ params, anneeMode, vue, presetActif, journee: "ete"|"hiver", seriesVisibles, projection: boolean }`.
- L'URL contient **uniquement les écarts au défaut** (`#/elu?m_pv=1.25&m_eol=1.5&ecs_deplace=1`) → un lien reproduit
  exactement un scénario (utile pour le rapport et les questions du jury). Validation et bornage par le schéma.
- Trois vues (routes) partageant le même store : **Démo** (`/demo`), **Élu** (`/elu`, accueil), **Expert** (`/expert`).

## 7. Performance — budgets (vérifiés en CI quand c'est possible)

| Mesure | Budget |
|---|---|
| Simulation d'une année (worker) | ≤ 10 ms (mesuré : 5,8 ms en Node) |
| 5 années | ≤ 50 ms |
| Du curseur à l'affichage mis à jour | ≤ 100 ms (perçu instantané) |
| JS initial (gzip, hors données) | ≤ 250 Ko |
| Données (gzip) | ≤ 1 Mo |
| Premier affichage utile (4G, cache vide) | ≤ 2,5 s ; ≤ 1 s en cache |
| Rendu graphique horaire (8 784 pts × 6 séries) | ≤ 16 ms par image (uPlot) |

Leviers : pas de re-rendu React des graphiques à chaque requête intermédiaire (mise à jour uPlot via `setData`) ;
`React.memo` + sélecteurs Zustand fins ; aucun calcul dans les composants (tout vient du worker ou de `agregats.ts`).

## 8. Robustesse et soutenance

- **Tests de parité bloquants** (135 cas golden, tolérance 1e-6) + tests de propriétés : bilans
  `C = direct + décharge + import` et `P = direct + charge + export` à chaque heure, `0 ≤ SOC ≤ E`,
  écrêtement croissant quand le PV augmente (à batterie nulle), etc.
- **Validation des entrées** (zod) et **bornage** de chaque paramètre ; affichage d'un message clair si les données
  sont absentes ou corrompues (sha256).
- **Error boundaries** par panneau (une carte qui ne charge pas n'empêche pas les KPI).
- **Hors-ligne le jour J** (le site est en ligne et la carte utilise des tuiles OSM) :
  1. PWA (vite-plugin-pwa) : précache de l'application et de `public/data/` ; mise en cache *runtime* des tuiles
     consultées (stratégie `CacheFirst`, limite ~2 000 tuiles) → ouvrir le site une fois la veille avec la zone des
     Mauges aux zooms 9-13 suffit.
  2. **Repli carte** : si les tuiles échouent, la carte bascule sur un rendu SVG des contours (sans fond) ; les postes
     et leur saturation restent visibles.
  3. Plan C : `npm run build && npm run preview` sur le PC de soutenance (copie locale du dépôt).
- **Respect de la politique d'usage des tuiles OSM** : attribution visible « © OpenStreetMap contributors », pas de
  préchargement massif ; alternative sans contrainte : Plan IGN (`https://data.geopf.fr/wmts`).
- **Déterminisme** : aucun aléatoire, aucune dépendance à l'heure locale du navigateur (les heures locales viennent des données).

## 9. Accessibilité et projection
- Clavier complet (curseurs `role="slider"` avec flèches / Page Haut-Bas), focus visible, ordre logique.
- Couleurs des séries validées (daltonisme) + libellés directs + tableau équivalent sous chaque graphique (bouton « Voir les données »).
- **Mode projection** (touche `P` ou bouton) : base typographique 18 px, KPI plus grands, animations réduites.
- `lang="fr"`, nombres formatés `Intl.NumberFormat("fr-FR")` (espace fine insécable des milliers, virgule décimale).

## 10. Déploiement (GitHub Pages)
- `vite.config.ts` : `base: "/simulateur-mauges/"` ; toutes les URL de données via `import.meta.env.BASE_URL`.
- Routage par **hash** (`HashRouter`) → pas de 404 sur rafraîchissement.
- Workflow `.github/workflows/deploy.yml` : `npm ci` → `npm run lint` → `npm run typecheck` → `npm run test` →
  `npm run data:check` → `npm run build` → `actions/upload-pages-artifact` → `actions/deploy-pages`.
- Les tests golden **bloquent** le déploiement.

## 11. Hors périmètre (assumé)
Pas de serveur, pas de compte, pas de saisie de données personnelles ; pas d'optimisation prédictive de la batterie
(pilotage par règles) ; pas de calcul de flux de puissance dans le réseau (analyse par poste source et par capacité).
