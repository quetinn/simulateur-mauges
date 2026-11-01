# 07 — Sprint final avant la soutenance (2 novembre 2026)

**Ce document remplace `05_PLAN_IMPLEMENTATION.md` jusqu'à la soutenance du 3/11.** Le portage React + TypeScript
(phases 0-9) n'a pas été commencé et ne peut pas l'être en un jour. On part donc de la maquette enrichie par Imran,
copiée dans `app/`, et on la fiabilise. Le plan React reste valable pour après la soutenance.

## 1. Point de départ

| Élément | État |
|---|---|
| `app/index.html` | Copie de `maquette Imran/maquette_Imran.html` du 1/11 (interface Imran) |
| `app/data.js` | Données du 21/10 (`META`, `GEO`, `BIN`), identiques à `public/data/` |
| `app/vendor/` | Leaflet 1.9.4, ECharts 5.5.1, polices (Archivo, Atkinson Hyperlegible, IBM Plex Mono) en local |
| Moteur (`const MOTEUR` dans `index.html`) | Identique ligne à ligne à celui de `maquette/maquette.html`, lui-même aligné sur `reference-js/moteur.mjs` (135 cas golden verts) |
| `public/data/precalcul.json` | Trajectoires (360 lignes PV × éolien × paquet × horizon) et tornade (36 lignes) — **pas encore utilisés** |

L'application doit s'ouvrir **par double-clic** (`file://`) : pas de `fetch`, les données sont chargées par des balises
`<script src>` qui définissent des constantes globales (`META`, `GEO`, `BIN`, et `PRECALC` à créer).

## 2. Prévu / fait / reste

| Fonction prévue (03_SPEC_UI) | État au 1/11 | À faire |
|---|---|---|
| Moteur validé, 3 vues, préréglages, curseurs, toutes les solutions, horizon 2035, année météo | ✅ | — |
| Bande d'indicateurs + fourchette 2021-2025, jauge d'écrêtement, verdict par règles | ✅ (7 tuiles, ordre de la fiche) | Remettre la **part achetée au réseau**, le repère « parc actuel », le « M€ par point » |
| Journée type hiver/été, bilan mensuel | ✅ (ECharts) | — |
| Carte des communes et postes S3REnR | ✅ Leaflet + densité + info-bulles | Fond gris clair par défaut, étiquettes, bascule « projets orientés » |
| Bouton « taille minimale de batterie » | ✅ | — |
| Bascule économique détail / gros (0,194 / 0,061 €/kWh) | ❌ | P1 |
| Année « Les 5 années (moyenne) » | ❌ | P2 |
| Vue Démo 5 étapes, phrases calculées | ✅ | Placement à 1366×768, mode projection |
| Mode projection (touche P) | ❌ retiré | P0 |
| Expert : formulaire complet, 2 semaines h/h + SOC, tableau 2021-2025 | ✅ | — |
| Expert : trajectoires (carte de chaleur), tornade | ❌ | P1 (données prêtes) |
| Expert : méthode et sources | ❌ | P1 |
| Expert : monotones | ❌ | P2 |
| Export CSV/JSON, lien partageable (paramètres dans l'URL) | ❌ | P1 (lien) / P2 (export) |
| Fonctionnement hors ligne | ❌ (CDN + Google Fonts + tuiles) | **P0** |
| Contrôle de parité du moteur de l'app | ❌ | **P0** |
| Publication GitHub Pages, PWA | ❌ | P2 (optionnel) |

## 3. Tâches, par priorité

### P0 — indispensable pour la soutenance
1. **Hors ligne.** Remplacer dans `index.html` les liens unpkg / jsDelivr / Google Fonts par `vendor/…`.
   Garder le repli existant quand les tuiles ne chargent pas. Ajouter un fond « Sans fond de carte » propre.
2. **Parité du moteur.** Écrire `tests/parite_app.mjs` (Node) qui extrait le bloc `const MOTEUR = (function(){…})();`
   de `app/index.html`, le compare **textuellement** à celui de `maquette/maquette.html` et rejoue les 135 cas de
   `tests/golden.json` (tolérance 1e-6) sur `app/data.js`. Il doit passer avant et après chaque modification.
   **Ne jamais modifier le moteur.**
3. **Indicateurs (fiche : énergie produite, taux de couverture, surplus, déficit, pointe d'injection).**
   - Vocabulaire unique partout : **« Taux de couverture (heure par heure) »** (terme de la fiche) ; supprimer
     « autonomie » des textes restants.
   - Remplacer la tuile « Surplus / déficit » (solde net trompeur) par deux valeurs : **surplus envoyé au réseau**
     (GWh, dont écrêté) et **déficit acheté au réseau** (GWh et **% de la consommation**, indicateur de souveraineté).
   - Remettre dans la tuile couverture « parc actuel : X % » et dans la tuile coût « X M€ par point de couverture ».
4. **Démo (projection 1366×768 et 1920×1080).** Masquer la barre de commandes du bas en vue Démo ; le panneau
   d'étape ne doit masquer ni la tuile mise en avant ni le verdict ; rétablir le **mode projection** (touche P,
   police 18 px, réglages repliés). Vérifier les 5 étapes avec les valeurs de l'annexe de `06_DECISIONS.md`.
5. **Carte.** Fond par défaut « Plan clair (Esri gris clair) » ; étiquettes de communes sans chevauchement avec les
   plaques de postes (placer au point intérieur / centroïde pondéré, ou décalage calculé, pas en pixels fixes).
6. **Textes.** Pied de page : « 135 cas de référence » ; README de `app/` à jour (fichiers réels, ouverture par
   double-clic, aucune dépendance réseau sauf les tuiles).

### P1 — fort intérêt pour le jury et le rapport
7. **Trajectoires** (vue Expert) : générer `app/precalcul.js` (`const PRECALC = …`) depuis `public/data/precalcul.json`
   par un petit script (`scripts/precalcul_js.mjs`) ; carte de chaleur PV (×1 → ×3) × éolien (×1 → ×2), sélecteur
   paquet (aucune, ballons, batterie, ballons + batterie) et horizon ; valeur = taux de couverture ; cellules non
   conformes (écrêtement max > 5 %) marquées ✕ ; point du scénario courant ; cellule cliquable = applique le scénario.
8. **Tornade** (Expert) depuis `PRECALC.tornade` : barres bas/haut autour de la référence, couverture et écrêtement.
9. **Bascule économique** dans la tuile coût et le formulaire : prix de l'électricité évitée 0,194 (détail,
   défaut) / 0,061 €/kWh (gros) → la VAN de B + batterie passe d'environ −243 à −292 M€ (vue pointe).
10. **Lien partageable** : paramètres modifiés encodés dans le `#hash` (écarts au défaut, valeurs bornées au
    chargement, bandeau si ajustées) ; bouton « Copier le lien ».
11. **Méthode et sources** (Expert) : tableau des hypothèses généré depuis `META.parametres` (valeur, unité, source),
    étapes de traitement des données (6 lignes), limites (`02_SPEC_MOTEUR.md` §6).

### P2 — si le temps le permet
12. Export CSV (indicateurs des 5 années, série horaire de l'année) et JSON des paramètres.
13. Option d'année « 2021-2025 (moyenne) ».
14. Monotones (injection nette, consommation).
15. Bascule carte « projets orientés vers les postes libres ».
16. Publication GitHub Pages (dépôt `simulateur-mauges`, dossier `app/` à la racine de la branche `gh-pages`).

## 4. Critères d'acceptation
- `node tests/parite_app.mjs` → 135/135, moteur identique.
- `app/index.html` ouvert par double-clic, **Wi-Fi coupé** : graphiques, carte (contours + postes), polices OK.
- Valeurs 2022 des préréglages = annexe de `06_DECISIONS.md` (A 42,1 % · B 49,8 % / 9,3 % · B + batterie 54,4 % /
  186 M€ · Recommandé 55,9 % / 3,3 % · 2035 38,0 %).
- Aucune erreur dans la console ; parcours Démo complet en moins de 2 minutes à 1366×768.
- Rien de modifié dans `public/data/`, `tests/golden.json`, `reference-js/`, ni dans `../maquette Imran/` (archive).

## 5. Méthode de travail
- Une tâche = un commit (`fix(app): …`, `feat(app): …`), parité relancée avant chaque commit.
- Vérifier visuellement après chaque tâche (captures Playwright 1366×768 et 1920×1080 dans `app/captures/`).
- En cas de doute sur un chiffre ou une hypothèse : **s'arrêter et demander**, ne pas modifier le moteur ni les données.
