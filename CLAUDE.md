# CLAUDE.md — Simulateur ENR Mauges Communauté

Instructions permanentes pour Claude Code. À lire avant toute tâche. Les documents détaillés sont dans `docs/`.

> **Jusqu'à la soutenance du 3 novembre 2026, on travaille UNIQUEMENT dans `app/`** (maquette HTML enrichie,
> ouverte par double-clic) selon **`docs/07_SPRINT_FINAL.md`**, qui remplace le plan React (`docs/05`).
> Les règles React / TypeScript / Vite plus bas ne s'appliquent qu'après la soutenance.

## Le projet en une phrase
Simulateur web qui montre aux élus de Mauges Communauté ce que deviennent le taux de couverture heure par heure,
les surplus, le déficit, l'écrêtement et le réseau quand on développe le solaire et l'éolien, avec ou sans batterie,
ballons d'eau chaude déplacés, VE pilotés et électrification 2035. Projet étudiant ESIEE (cours Smart Grids),
soutenance le **3 novembre 2026** (10 min dont environ 2 min de démonstration).

## Règles non négociables
1. **Le moteur de calcul est une spécification, pas une création.** Le bloc `const MOTEUR = (function(){…})();` de
   `app/index.html` est identique à celui de `maquette/maquette.html` et fidèle à `donnees/scripts/moteur_ref.py` et
   `reference-js/moteur.mjs`. **Ne pas le modifier.** Les **135 cas de `tests/golden.json`** doivent rester verts
   (tolérance relative 1e-6) ; `node tests/parite_app.mjs` le vérifie.
2. **Aucune hypothèse en dur dans l'interface.** Valeurs par défaut, bornes, unités, libellés et sources viennent de
   `META.parametres` (`app/data.js`, copie de `public/data/meta.json`).
3. **Ne jamais modifier à la main** `public/data/`, `app/data.js`, `tests/`, `reference-js/` ni le dossier
   `../maquette Imran/` (archive). Les données sont produites par `donnees/scripts/14_export_simulateur.py`.
4. **Interface en français.** Vocabulaire de la fiche du projet : **« taux de couverture (heure par heure) »**,
   énergie produite, surplus, déficit, pointe d'injection, écrêtement, heures de vigilance. Plus de mot « autonomie ».
5. **Chaque chiffre affiché a une unité et une source** (bouton (i) « comment lire cet indicateur »).
6. **Hors ligne** : l'application doit fonctionner Wi-Fi coupé (bibliothèques et polices dans `app/vendor/`) ;
   seules les tuiles du fond de carte viennent d'Internet, avec repli sans fond.
7. **Accessibilité** : clavier complet, contraste AA, aucune information portée par la couleur seule,
   `prefers-reduced-motion` respecté.

## Commandes (phase actuelle)
- Ouvrir `app/index.html` dans Chrome ou Edge (double-clic).
- `node tests/parite_app.mjs` — parité du moteur de l'app (135 cas).
- `node reference-js/test_golden.mjs` (depuis `reference-js/`) — parité du portage JS de référence.
- Captures : script Playwright `app/scripts/captures.mjs` (à créer) en 1366×768 et 1920×1080.

## Conventions
- Noms de domaine en français, comme le moteur : `couverture_horaire`, `ecretement_part`…
- Unités : MW, MWh / GWh, % à 1 décimale, € en M€ à 0 décimale.
- Styles : variables CSS existantes (`--ink`, `--accent`, `--seuil`, `--s-pv`…), voir `docs/04_DESIGN_SYSTEM.md`.
- Commits petits : `fix(app): …`, `feat(app): …`, `test(app): …`.

## Où trouver quoi
| Besoin | Fichier |
|---|---|
| **Tâches du sprint final et critères d'acceptation** | **`docs/07_SPRINT_FINAL.md`** |
| Application à faire évoluer | `app/index.html`, `app/data.js`, `app/vendor/` |
| Valeurs de référence des préréglages | annexe de `docs/06_DECISIONS.md` |
| Formules et algorithmes du moteur | `docs/02_SPEC_MOTEUR.md` (+ `reference-js/moteur.mjs`) |
| Écrans, contenus, interactions prévus | `docs/03_SPEC_UI.md` |
| Couleurs, typo, composants, graphiques | `docs/04_DESIGN_SYSTEM.md` |
| Décisions et leurs raisons | `docs/06_DECISIONS.md` |
| Trajectoires et tornade précalculées | `public/data/precalcul.json` |
| Maquette d'origine (21/10) | `maquette/maquette.html` |
| Plan React d'après soutenance | `docs/01_ARCHITECTURE.md`, `docs/05_PLAN_IMPLEMENTATION.md` |
