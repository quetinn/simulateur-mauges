# Simulateur ENR — Mauges Communauté

**Application en ligne : https://quetinn.github.io/simulateur-mauges/** (hors ligne : ouvrir `app/index.html` par double-clic ; voir `app/README.md`).

Dossier de conception du simulateur du Projet 2 « Intégration des ENR » (ESIEE Paris, Smart Grids, 2026).

```
simulateur/
├── CLAUDE.md                 instructions permanentes pour Claude Code
├── docs/                     architecture, spécifications, design system, plan, décisions
├── public/data/              paquet de données exporté par donnees/scripts/14_export_simulateur.py (ne pas éditer)
│   ├── meta.json             schéma des paramètres, constantes, préréglages, colonnes des .bin
│   ├── annee_2021…2025.bin   séries horaires Float32 (8 colonnes × 8 760/8 784 h)
│   ├── geo.json              communes (contours simplifiés) + postes sources (Caparéseau)
│   └── precalcul.json        grille des trajectoires + tornade (résultats Python)
├── tests/
│   ├── golden.json           135 cas de référence (27 configurations × 5 années)
│   └── golden_series_2022_14j.json   séries horaires de référence (débogage du portage)
├── reference-js/             portage JS du moteur, validé : `node test_golden.mjs`
└── maquette/maquette.html    maquette fonctionnelle (moteur réel, année 2022 embarquée)
```

## Démarrer avec Claude Code
1. Créer un dépôt GitHub `simulateur-mauges` et y copier ce dossier.
2. Ouvrir Claude Code à la racine et lui demander : « Lis CLAUDE.md et docs/, puis exécute la phase 0 de
   docs/05_PLAN_IMPLEMENTATION.md ». Enchaîner les phases une par une, en vérifiant les critères d'acceptation.
3. Après toute modification des données ou des hypothèses côté Python : relancer
   `python donnees/scripts/14_export_simulateur.py`, puis `npm run test` (les golden doivent rester verts).

## État au 13/10/2026
- Moteur de référence Python : `donnees/scripts/moteur_ref.py` (reproduit `04_simulation.py` à 4·10⁻⁵).
- Portage JS : 135/135 cas golden à 8·10⁻¹⁴ près ; 6-7 ms par année simulée (Node 22). Données et golden régénérés le 21/10/2026 (audit : O&M en €/kW/an, tolérance du seuil de vigilance).
