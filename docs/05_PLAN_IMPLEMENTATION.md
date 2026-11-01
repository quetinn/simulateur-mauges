# 05 — Plan d'implémentation avec Claude Code

Rythme visé : semaine du 20/10 (phases 0-5) et semaine du 27/10 (phases 6-9), gel le **31/10**.
Chaque phase = une branche + une PR ; Claude Code ne passe à la suivante que si tous les critères sont verts.
Les « Consigne » sont des messages à copier dans Claude Code.

---
### Phase 0 — Initialisation (≈ 1 h)
**Consigne** : « Lis CLAUDE.md et docs/. Initialise un projet Vite React TypeScript strict dans ce dépôt sans écraser
docs/, public/data/, tests/, reference-js/, maquette/. Ajoute ESLint (typescript-eslint, react-hooks, jsx-a11y),
Prettier, Vitest, Playwright, zod, zustand, comlink, uplot, leaflet, react-leaflet, @fontsource/archivo,
@fontsource/atkinson-hyperlegible, @fontsource/ibm-plex-mono, vite-plugin-pwa. Configure `base` pour GitHub Pages
(`/simulateur-mauges/`), HashRouter, les scripts npm de CLAUDE.md et le workflow GitHub Actions de 01_ARCHITECTURE §10. »
**Critères** : `npm run build`, `lint`, `typecheck` OK ; page vide déployée sur GitHub Pages ; polices locales.

### Phase 1 — Moteur TypeScript + parité (≈ 3 h) — **bloquante**
**Consigne** : « Porte reference-js/moteur.mjs en TypeScript dans src/engine/ selon docs/02_SPEC_MOTEUR.md
(fichiers types, profils, batterie, simuler, economie, agregats). Écris golden.test.ts qui charge public/data/*.bin et
tests/golden.json et vérifie les 135 cas (tolérance relative 1e-6), series.test.ts (golden_series_2022_14j.json) et
proprietes.test.ts (fast-check : bilans, bornes du SOC, ch·dch = 0). Ajoute un banc de performance (Vitest bench). »
**Critères** : 135/135 verts ; propriétés vertes ; ≤ 10 ms par année en bench ; aucun import DOM/React dans `engine/`.

### Phase 2 — Données, worker, état (≈ 3 h)
**Consigne** : « Implémente data/schemas.ts (zod) et data/load.ts (BASE_URL, sha256), worker/engine.worker.ts avec
Comlink (simuler, simulerToutesAnnees, dimensionnerBatterie), worker/client.ts (dernier gagnant, repli thread
principal), state/store.ts, state/url.ts (écarts au défaut, bornage), state/useSimulation.ts (calcul progressif :
année affichée avec séries puis 5 années). Ajoute scripts/check-data.ts et npm run data:check. »
**Critères** : un composant de debug affiche les KPI d'A, B, C identiques aux golden ; changer l'URL change le scénario ;
couper le worker → repli fonctionne ; erreurs de données affichées proprement.

### Phase 3 — Fondations visuelles (≈ 3 h)
**Consigne** : « Applique docs/04_DESIGN_SYSTEM.md : tokens.css (clair + sombre), typographie, composants ui/ (Slider
avec encoches A/B/C, Toggle, Segmented, Card, Stat, Tooltip, InfoSource, Badge d'état, Gauge), en-tête avec bande des
24 heures, mode projection (touche P). Reprends l'esthétique de maquette/maquette.html. »
**Critères** : page de démonstration des composants ; navigation clavier complète ; axe DevTools sans erreur ;
contraste AA vérifié.

### Phase 4 — Vue Élu : indicateurs, verdict, journée type, bilan (≈ 5 h)
**Consigne** : « Construis la vue /elu selon docs/03_SPEC_UI.md §2 : rail de réglages version élu (généré depuis
meta.parametres avec une liste blanche), bande de 5 KPI avec fourchette 2021-2025, jauge d'écrêtement, verdict par
règles (verdict.ts + tests), graphique journée type hiver/été (SVG), bilan mensuel. Textes dans i18n/fr.ts. »
**Critères** : les préréglages A, B, C, recommandé, 2035 donnent les valeurs de `docs/06_DECISIONS.md` (annexe chiffres) ;
réponse < 100 ms au curseur (Performance panel) ; responsive jusqu'à 400 px.

### Phase 5 — Carte (≈ 4 h)
**Consigne** : « Ajoute features/carte : Leaflet + tuiles OSM désaturées (attribution), communes depuis geo.json,
postes sources avec remplissage S3REnR après l'ajout du scénario (lecture homothétique et lecture « projets orientés »),
info-bulles, légende ; repli SVG si les tuiles échouent ; cache des tuiles via vite-plugin-pwa (CacheFirst). »
**Critères** : carte lisible au projecteur ; débrancher le réseau après une première visite → carte toujours affichée.

### Phase 6 — Vue Expert (≈ 6 h)
**Consigne** : « Construis /expert selon 03_SPEC_UI §4 : formulaire complet généré depuis le schéma (groupes, sources,
écarts surlignés), année heure par heure en uPlot (zoom, semaine par semaine, SOC dans un graphique aligné), monotones,
comparaison 2021-2025 en petits multiples, trajectoires (precalcul) avec point courant, tornade, méthode et sources,
export CSV/JSON et lien. »
**Critères** : 8 784 points × 6 séries fluides ; exports ouverts sans erreur dans un tableur ; lien reproduit le scénario.

### Phase 7 — Vue Démo (≈ 3 h)
**Consigne** : « Construis /demo : 5 étapes de 03_SPEC_UI §3, plein écran, navigation flèches/espace, chiffres en
direct dans des gabarits de phrases, transitions sobres, mode projection forcé. »
**Critères** : parcours complet chronométré ≤ 60 s ; aucun texte figé contredisant les chiffres.

### Phase 8 — Hors-ligne, déploiement, qualité (≈ 3 h)
**Consigne** : « Configure vite-plugin-pwa (précache app + data, cache runtime tuiles), écrans d'erreur, Playwright :
parcours Élu (préréglage → KPI attendus), Démo (5 étapes), Expert (export) + captures de non-régression visuelle ;
budgets de 01_ARCHITECTURE §7 en CI (taille du bundle). »
**Critères** : CI verte ; Lighthouse ≥ 90 (performance, accessibilité) ; fonctionne hors-ligne après une visite.

### Phase 9 — Finitions et répétition (≈ 2 h)
Relecture des textes avec le groupe, vérification des chiffres contre le rapport, répétition de la démo sur le PC et le
projecteur de la salle, plan C (`npm run preview` en local) prêt sur clé USB.

---
## Checklist « jour J »
- [ ] Ouvrir le site la veille sur le PC de soutenance (cache PWA + tuiles), puis tester hors-ligne.
- [ ] Vue Démo testée sur le projecteur (mode projection).
- [ ] Copie locale du dépôt + `npm run preview` prête.
- [ ] Liens partageables des scénarios clés notés dans le rapport.
