# 03 — Spécification de l'interface

Trois vues sur le même état : **Démo** (soutenance, 1 min), **Élu** (accueil, exploration guidée), **Expert**
(annexe technique). Un en-tête commun porte le nom, le sélecteur de vue, le sélecteur d'année et le bouton « Projection ».

## 1. Vocabulaire (vue Élu et Démo)
| Terme moteur | Libellé élu | Infobulle |
|---|---|---|
| `couverture_horaire` | **Autonomie heure par heure** | Part de la consommation du territoire couverte, heure par heure, par la production locale (batterie comprise). |
| `couverture` | Production / consommation sur l'année | Production annuelle rapportée à la consommation annuelle. Peut dépasser l'autonomie réelle : un surplus de midi ne couvre pas la nuit. |
| `ecretement_part` | **Énergie perdue (écrêtement)** | Production qu'il faudrait couper pour que l'injection ne dépasse jamais 120 % de la consommation, en % de la production. Limite : 5 %. |
| `heures_vigilance` | Heures de vigilance réseau | Heures où la production dépasse 120 % de la consommation locale. |
| `pointe_injection_MW` | Pointe d'injection | Puissance maximale renvoyée vers le réseau amont. |
| `pointe_conso_MW` / `pointe_soutirage_MW` | Pointe d'appel au réseau | Puissance maximale demandée au réseau. |
| `surplus_exporte_MWh` | Surplus envoyé au réseau | |
| `deficit_importe_MWh` | Électricité achetée au réseau | |
| Batterie `glouton` / `pointe` | « Stocker tout surplus » / « Stocker seulement les excès » | |

## 2. Vue Élu (`/elu`, page d'accueil)

Disposition (≥ 1 200 px) : rail de réglages à gauche (320 px), contenu à droite. En dessous de 900 px : réglages dans
un tiroir au-dessus du contenu.

**En-tête du contenu — « Le scénario en une ligne »** : phrase générée, par ex. « Solaire 147 MW (+25 %), éolien
172 MW (+50 %), ballons d'eau chaude à midi, sans batterie — année 2022 ».

**Bande d'indicateurs (5 tuiles)** — valeur de l'année affichée en grand, fourchette 2021-2025 en dessous :
1. Autonomie heure par heure (%), avec la valeur du parc actuel en repère (« A : 41 % »).
2. Énergie perdue (écrêtement) : jauge horizontale 0-25 % avec repère à 5 % ; pastille d'état
   **Conforme** / **Non conforme** (icône + texte, jamais la couleur seule) ; mention « chaque année » ou
   « dépassé en 2023 ».
3. Heures de vigilance réseau.
4. Pointe d'injection (MW) et pointe d'appel (MW).
5. Coût : « Aucun investissement de stockage » ou CAPEX batterie + exploitation-maintenance (M€/an) + VAN sur `duree_analyse` ans
   + « X M€ par point d'autonomie ». Bascule « Électricité évitée au tarif de détail / au prix de gros » (0,194 / 0,061 €/kWh) ;
   la vue détail est présentée comme la plus favorable à la batterie.

**Verdict** (encadré sous la bande) : 1-3 phrases générées par règles, par ex. « Conforme à la limite de 5 % toutes les
années. 87 MW à raccorder : à orienter vers Recouvrance, Vallet, St-Georges et Cholet, les postes de St-Pierre-
Montlimart et du Genêt étant saturés. » Règles dans `features/kpi/verdict.ts` (testées).

**Graphique principal — « Une journée type »** : sélecteur Hiver / Été (jour ouvré moyen du mois de janvier / juillet
de l'année affichée). Aires empilées de la production (éolien, solaire), courbe de consommation (base + PAC + VE +
ballons empilés en clair), seuil 120 % en tirets, charge / décharge de la batterie en barres fines sous l'axe.
Libellés directs en bout de courbe.

**Bilan mensuel** : barres groupées production / consommation par mois, surplus et écrêtement en segments.

**Carte** (Leaflet, fond OpenStreetMap ou Plan IGN atténué) : contours des 6 communes (remplissage selon MW installés),
postes sources en cercles (taille = MW raccordés, couleur + motif = taux de remplissage S3REnR **après** l'ajout du
scénario, réparti au prorata du parc actuel = lecture « homothétique »), info-bulle : capacité réservée, restant à
affecter, ajout du scénario, dépassement. Légende avec icônes. Bascule « Lecture : projets orientés vers les postes libres ».

**Rail de réglages (version élu)** :
- *Scénarios* : boutons A · B · C · Recommandé · 2035.
- *Production* : Solaire (+0 % … +300 %, affiché en MW et en %), Éolien (+0 % … +200 %).
- *Solutions* (interrupteurs + 1 réglage chacun) : Batterie (taille en MWh, « Stocker tout surplus / seulement les excès »,
  bouton « Taille minimale pour respecter 5 % »), Ballons d'eau chaude à midi (% des ballons), Recharge des VE pilotée
  (% des VE, visible en 2035), Plafond d'injection solaire (% de la puissance).
- *Horizon* : Aujourd'hui / 2035 (affiche « 30 600 VE, 13 100 logements en PAC »).
- *Année météo* : 2021…2025 · Typique (2022) · « Les 5 années » (les KPI affichent alors la moyenne).
- Lien « Réglages avancés » → vue Expert avec le même scénario.

## 3. Vue Démo (`/demo`) — parcours de soutenance (≈ 60 s)
Plein écran, mode projection activé, une étape par clic (→ / espace / bouton), chaque étape = préréglage + KPI mis en
avant + une phrase. Animation de transition des chiffres (200 ms, désactivée si mouvement réduit).
1. **Aujourd'hui** (A) : « 232 MW de solaire et d'éolien couvrent 42 % de la consommation, heure par heure. »
2. **Doubler le solaire** (B) : « L'autonomie monte à 50 %, mais 9 % de la production serait perdue : au-delà de la limite de 5 %. »
3. **Ajouter la batterie de la fiche** (B + batterie) : « Conforme… pour 186 M€ d'investissement et 12 M€ d'entretien par an, plus que ce que la batterie fait gagner. »
4. **Miser sur l'éolien et les ballons** (recommandé) : « 56 % d'autonomie, conforme chaque année, sans stockage. »
5. **Où raccorder ?** (carte) : « Deux postes sont saturés : il faut orienter les projets. »
Les chiffres affichés viennent du moteur en direct (pas de texte figé : la phrase est un gabarit avec des valeurs).

## 4. Vue Expert (`/expert`)
Onglets :
1. **Paramètres** — formulaire complet généré depuis `meta.parametres`, groupé (`meteo`, `production`, `ecretement`,
   `conso`, `ve`, `pac`, `ecs`, `batterie`, `economie`), chaque champ avec unité, bornes et source ; bouton
   « Réinitialiser le groupe » ; écarts au défaut surlignés.
2. **Année heure par heure** — uPlot : P (PV, éolien), C (base, PAC, VE, ballons), charge/décharge, SOC (axe séparé
   dans un 2ᵉ graphique aligné, jamais deux axes Y sur le même graphique), seuil 120 % ; zoom par glisser, navigation
   semaine par semaine ; sélecteur de séries.
3. **Monotones** — injection nette triée, consommation triée, avec repères (seuil, pointe).
4. **Comparaison 2021-2025** — petits multiples par indicateur (barres par année + moyenne).
5. **Trajectoires** — carte de chaleur PV × éolien (`precalcul.trajectoires`), paquets et horizon sélectionnables,
   point du scénario courant, cellules non conformes marquées ✕, contrainte postes en grisé.
6. **Sensibilité** — tornade (`precalcul.tornade`).
7. **Méthode et sources** — tableau des hypothèses (depuis le schéma), limites (§6 de 02_SPEC_MOTEUR), version des données, liens vers le dépôt.
8. **Export** — CSV des indicateurs (année ou 5 années), CSV horaire de l'année affichée, JSON des paramètres, lien partageable.

## 5. États et micro-interactions
- **Calcul** : pas de spinner pour < 150 ms ; au-delà (dimensionnement de batterie), barre fine sous l'en-tête et
  bouton qui affiche « Calcul… ».
- **Données absentes / corrompues** : écran d'erreur explicite (« Les données n'ont pas pu être chargées.
  Recharger la page ; si le problème persiste, vérifier la connexion. »).
- **Valeur hors bornes dans l'URL** : bornée silencieusement, petit bandeau « Le lien contenait des valeurs hors limites ;
  elles ont été ajustées ».
- **Changement de préréglage** : les curseurs glissent vers leurs nouvelles valeurs (150 ms).
- **Survol** : tout point de graphique donne heure, valeurs et unités ; toute tuile KPI a « D'où vient ce chiffre ? ».

## 6. Contenus fixes à rédiger (fr.ts)
Titre : « Mauges Communauté — jusqu'où développer le solaire et l'éolien ? » ; sous-titre ; textes d'aide de chaque
réglage ; textes du verdict ; mentions de sources (ODRÉ, Enedis, RTE Eco2Mix, Météo-France, INSEE, Caparéseau) ;
avertissement « Outil pédagogique — projet étudiant ESIEE Paris, 2026 ».
