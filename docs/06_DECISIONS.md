# 06 — Journal des décisions (ADR courtes)

Format : contexte → décision → conséquences. Les décisions de méthode sur les données sont dans
`donnees/JOURNAL_METHODE.md` (§9 à §11) ; ici, celles qui concernent le simulateur.

| # | Date | Décision | Raison | Conséquence |
|---|---|---|---|---|
| D1 | 13/10 | Calcul **dans le navigateur** (moteur TS) | Réactivité < 100 ms, pas de serveur, lien partageable | Portage à maintenir en parité avec Python → tests golden bloquants |
| D2 | 13/10 | **React + TypeScript + Vite** | Choix du groupe ; écosystème ; Claude Code | Bundle plus lourd que Svelte, compensé par le découpage par vue |
| D3 | 13/10 | Diffusion **GitHub Pages** | Lien public, mises à jour simples | Dépendance réseau → PWA + plan C local (01_ARCHITECTURE §8) |
| D4 | 13/10 | **Carte avec fond OSM** | Choix du groupe | Tuiles mises en cache, repli SVG, attribution obligatoire |
| D5 | 13/10 | Style **institutionnel clair, pas banal** (« Bocage & réseau ») | Choix du groupe ; projection | Thème sombre secondaire |
| D6 | 13/10 | **Toutes les solutions** dans le simulateur (batterie 2 pilotages, écrêtement statique, ballons, VE pilotés, combinaison) | Simulateur « ultra complet » ; la fiche demande d'en **tester** une : la batterie reste la solution chiffrée du rapport | Les autres apparaissent comme leviers complémentaires |
| D7 | 13/10 | Hypothèses 2035 et flexibilités : **fiches Projets 1 et 3** + RTE BP2025 + ADEME/RTE (ECS) | Cohérence avec l'emprunt au Projet 6 pour l'économie | Tous réglables, sources affichées |
| D8 | 13/10 | **Schéma des paramètres exporté depuis Python** (`meta.parametres`) | Une seule source de vérité | L'interface ne contient aucune hypothèse en dur |
| D9 | 13/10 | **Uplot** pour l'horaire, **SVG maison** pour le reste | Performance sur 8 784 points ; contrôle du style | Deux familles de graphiques à harmoniser via tokens |
| D10 | 13/10 | Année affichée par défaut : **année typique 2022** + fourchette 2021-2025 | Décision du groupe (JOURNAL §10.2) | KPI « valeur 2022 » + « fourchette » |
| D11 | 13/10 | Contrainte « écrêtement ≤ 5 % **chaque année** » pour le verdict et le dimensionnement | Robustesse face à l'aléa météo | Batterie minimale plus grande qu'en moyenne |
| D12 | 17/10 | Consommation : **part raccordée à RTE (≈ 15-16 %) en profil plat** dans les deux méthodes de reconstruction | Le site RTE (industriel) n'a pas de saisonnalité (conso RPT nationale hiver/été 0,96) ; JOURNAL §15 | Pointe de conso −8 % ; écrêtement −0,2 à −0,7 pt ; golden régénérés |
| D13 | 17/10 | Économie : **base officielle** (NREL ATB 2025 395 €/kWh, O&M 4 %/an, 15 ans ; RTE FE2050 4 % ; TRVE 0,194 €/kWh ; CRE surplus 0,02 €/kWh) ; vue « prix de gros » 0,061 €/kWh et Projet 6 en sensibilité | Sources officielles demandées par l'enseignant ; JOURNAL §16 | Nouveau paramètre `om_bat`, indicateur `om_annuel_EUR`, VAN = (gain − O&M)·fa − CAPEX ; golden 135 cas |

| D14 | 21/10 | **O&M de la batterie en €/kW/an** (`om_bat` = 49 €/kW/an × puissance), au lieu de 4 % du CAPEX | Audit : NREL 2025 définit l'O&M comme 4 %/an du coût en $/kW d'une batterie **4 h** (1 336 $/kW → 53,4 $/kW/an) ; 4 % du CAPEX d'une 2 h la sous-estimait d'≈ 36 % | O&M batterie B 7,4 → 11,5 M€/an (> gain annuel) ; VAN B −161 → −207 M€ ; conclusions renforcées ; sensibilités 250 / 500 €/kWh avec O&M proportionnel (31 / 62 €/kW/an) |
| D15 | 21/10 | **Tolérance de 1e-6 MW** dans le comptage des heures de vigilance | En pilotage « pointe », `P − ch` vaut exactement `s·C` : le comptage dépendait d'erreurs d'arrondi (écart Python / golden jusqu'à 32 % sur cet indicateur) | C pointe : 602 → 580 h ; autres configurations inchangées ; golden régénérés |
| D16 | 21/10 | Préréglage « Recommandé + batterie » = **taille minimale avec ballons à midi : 283 MWh** (`bat_puissance` 0,8) | Il embarquait 353 MWh, minimum valable *sans* ballons | CAPEX 140 → 112 M€ |

## Annexe — valeurs de référence des préréglages (moteur validé, données du 21/10/2026 : profil RTE plat, économie officielle, O&M NREL en €/kW/an)
À utiliser comme critères d'acceptation (phase 4) et pour vérifier les textes.

| Préréglage | Autonomie h/h 2022 | Moyenne [min-max] 2021-25 | Écrêtement 2022 | Moyenne [max] | Conforme 5 ans | Pointe d'injection 2022 | CAPEX | O&M |
|---|---|---|---|---|---|---|---|---|
| A | 42,1 % | 41,6 [38,4-44,2] % | 0,6 % | 0,6 [0,9] % | oui | 71 MW | 0 | 0 |
| B | 49,8 % | 49,5 [46,6-51,9] % | 9,3 % | 8,2 [10,3] % | non | 129 MW | 0 | 0 |
| C | 61,9 % | 61,7 [58,8-64,0] % | 22,4 % | 21,0 [23,7] % | non | 228 MW | 0 | 0 |
| B + batterie (pointe) | 54,4 % | 53,5 [49,9-57,2] % | 0,6 % | 0,4 [0,8] % | oui | 129 MW | 186 M€ | 11,5 M€/an |
| C + batterie (pointe) | 74,0 % | 73,1 [68,7-76,4] % | 7,0 % | 6,2 [8,9] % | non | 228 MW | 279 M€ | 17,3 M€/an |
| Recommandé sans stockage | 55,9 % | 55,4 [51,5-58,4] % | 3,3 % | 3,2 [4,1] % | oui | 111 MW | 0 | 0 |
| Variante avec batterie (283 MWh) | 64,1 % | 63,5 [59,7-66,5] % | 3,5 % | 3,4 [4,7] % | oui | 141 MW | 112 M€ | 6,9 M€/an |
| 2035 (parc actuel) | 38,0 % | 37,4 [34,7-39,9] % | 0,5 % | 0,5 [0,8] % | oui | 66 MW | 0 | 0 |

Note : `maquette/maquette.html` a été régénérée le 21/10/2026 avec ces données (référence visuelle ; les valeurs qui font foi sont celles de `public/data/` et de ce tableau).
