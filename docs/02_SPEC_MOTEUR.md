# 02 — Spécification du moteur de calcul

Références exécutables : `donnees/scripts/moteur_ref.py` (Python, référence) et `reference-js/moteur.mjs` (portage
JS validé : 135/135 cas golden, écart relatif max 8·10⁻¹⁴). **En cas de doute, le code de référence fait foi.**

## 1. Conventions
- Pas horaire, index `i = 0…n−1` (UTC, heure de début). `n` = 8 760 ou 8 784. 1 MW pendant 1 h = 1 MWh.
- Entrées lues dans `annee_<a>.bin` (Float32 → convertir en Float64 avant calcul) :
  `fc_pv[i]`, `fc_eol[i]` (facteurs de charge locaux calibrés, 0-1), `autres[i]` (MW, bio + hydro, constant),
  `c_reel[i]` (MW, consommation reconstruite des Mauges), `temp[i]` (°C), `heure[i]` (heure **locale** 0-23),
  `jour[i]` (index du jour **local**, 0…nJ−1), `doy[i]` (jour de l'année local).
- `p` = paramètres effectifs = `{...defauts(meta.parametres), ...p_utilisateur}` ; `k` = `meta.constantes` ;
  `profils` = `meta.profils`.
- Masque d'une plage horaire `[a, b)` : `a < b ? (a ≤ h < b) : (h ≥ a || h < b)` (plage qui passe minuit).

## 2. Chaîne de calcul

### 2.1 Production
```
PcPv      = m_pv · k.Ppv_A
pv_brut_i = PcPv · fc_pv_i
pv_i      = min(pv_brut_i, pv_plafond · PcPv)            // écrêtement statique (onduleurs)
eol_i     = m_eol · k.Peol_A · fc_eol_i
P_i       = pv_i + eol_i + autres_i
ecret_statique = Σ (pv_brut_i − pv_i)
P_brut_total   = Σ (pv_brut_i + eol_i + autres_i)
```

### 2.2 Consommation de base
```
C0_i = c_reel_i · (variante_conso = "vol2024" ? k.conso_2024_MWh / Σ c_reel : 1)
```
Horizon **2035** (sinon tous les termes ci-dessous valent 0) :
```
f   = k.part_residentiel · pop_facteur · (1 − renovation) + k.part_tertiaire · pop_facteur
      + (1 − k.part_residentiel − k.part_tertiaire)
C0_i ← C0_i · f
nPac = min(pac_part · k.residences_principales_2023 · pop_facteur, k.logements_fossiles_2023)
G    = besoin_chauffage / k.degres_heures_16_moyen                 // MWh utile par logement et par °C·h
pac_i = nPac · G · max(0, t_base_chauffage − temp_i) / pac_cop
nVe  = part_ve · k.voitures_menages_2023 · pop_facteur
eVe  = nVe · km_jour · conso_ve / 100 / rdt_recharge / 1000           // MWh par jour, vu du réseau
partTar = max(0, 1 − ve_non_pilote − ve_pilote)
dCharge = (km_jour · conso_ve / 100 / rdt_recharge) / p_borne         // durée de charge d'un VE (h)
ve_np_i  = profilVeNonPilote(eVe · ve_non_pilote, dCharge)            // §3.2
ve_tar_i = repartirParJour(eVe · partTar, masque HC_NUIT)             // §3.1
eVePil_j = eVe · ve_pilote
C1_i = C0_i + pac_i + ve_np_i + ve_tar_i
```

### 2.3 Flexibilités (dans cet ordre)
**VE pilotés** (si Σ eVePil > 0) :
```
nPil = nVe · ve_pilote
(alloc, reste_j) = remplirSurplus(surplus = P − C1, e_j = eVePil_j · ve_dispo_journee,
                                  pMax = nPil · p_borne / 1000, fenetre = FENETRE_JOUR)       // §3.3
nuit = repartirParJour(eVePil_j · (1 − ve_dispo_journee) + reste_j, masque HC_NUIT)
ve_pil_i = alloc_i + nuit_i
C2_i = C1_i + ve_pil_i
```
**Ballons d'eau chaude déplacés** (si `ecs_deplace > 0`) :
```
nEcs = ecs_part · k.residences_principales_2023 · (horizon = 2035 ? pop_facteur : 1) · ecs_deplace
doyMoyen_j = moyenne des doy_i du jour j
e_j = nEcs · ecs_conso / 365 · (1 + ECS_SAISON · cos(2π (doyMoyen_j − 15) / 365))
ecs_retire = repartirParJour(e_j, masque ECS_NUIT)                    // chauffe actuelle supposée de nuit
(alloc, reste_j) = remplirSurplus(P − C2, e_j, nEcs · ecs_p / 1000, ECS_JOUR)
ecs_ajoute = alloc + repartirParJour(reste_j, masque ECS_NUIT)
C_i = C2_i − ecs_retire_i + ecs_ajoute_i
```

### 2.4 Batterie
```
E  = (bat_pilotage ≠ "aucune") ? bat_puissance · PcPv · bat_duree : 0
Pb = bat_puissance · PcPv ;  η = √bat_rdt ;  s = bat_soc0 · E
k  = (bat_pilotage = "pointe") ? seuil_vigilance : 1
pour i = 0…n−1 :
   net = P_i − C_i
   si net > 0 : x = min(max(P_i − k·C_i, 0), Pb, (E − s)/η) ; ch_i = x ; s += x·η
   sinon si net < 0 : x = min(−net, Pb, s·η) ; dch_i = x ; s −= x/η
   soc_i = s
```
(Si `E ≤ 0` ou `bat_pilotage = "aucune"` : ch = dch = soc = 0.) Boucle sans allocation ; c'est la seule partie séquentielle.

### 2.5 Indicateurs
```
direct_i = min(P_i, C_i) ; export_i = max(P_i − C_i, 0) − ch_i ; import_i = max(C_i − P_i, 0) − dch_i
inj_i = P_i − C_i − ch_i + dch_i                          // > 0 injection nette, < 0 soutirage net
ecret_dyn_i = max(inj_i − (seuil_vigilance − 1) · C_i, 0)
ecretement = ecret_statique + Σ ecret_dyn_i ;  ecretement_part = ecretement / P_brut_total
conforme = ecretement_part ≤ ecretement_max + 1e-12
couverture = ΣP/ΣC ; couverture_horaire = Σ(direct + dch)/ΣC
pointe_injection = max inj ; pointe_soutirage = max(−inj) ; pointe_conso = max C
heures_vigilance = #{ i : P_i − ch_i > seuil_vigilance · C_i + TOL_SEUIL }      // TOL_SEUIL = 1e-6 MW
bat_cycles = Σdch / E (0 si E = 0)
ve_surplus_absorbe = Σ min(ve_pil_i, max(P_i − C1_i, 0))
valeur_annuelle_EUR = 1000 · (−Σimport · prix_achat + (Σexport − Σecret_dyn) · prix_surplus)
capex_batterie_EUR  = E · 1000 · cout_bat
om_annuel_EUR       = (E > 0) ? Pb · 1000 · om_bat : 0      // om_bat en €/kW/an (NREL 2025 : 4 %/an du coût $/kW d'une batterie 4 h → 49 €/kW/an)
facteur_annuite = taux_actu > 0 ? (1 − (1+taux_actu)^−duree_analyse) / taux_actu : duree_analyse
```
Économie d'une batterie : `gain = valeur(avec) − valeur(sans batterie, mêmes autres paramètres)` ;
`VAN = (gain − om_annuel) · facteur_annuite − capex` (O&M ajouté le 17/10/2026, hypothèses économiques officielles en base, Projet 6 en préréglage de sensibilité). Coût par point d'autonomie = `−VAN / (Δ couverture_horaire × 100)`.

Invariants vérifiés à chaque simulation (tests de propriétés) : `C = direct + dch + import` et
`P = direct + ch + export` (1e-6), `0 ≤ soc ≤ E`, `ch·dch = 0` à chaque heure.

## 3. Briques

### 3.1 `repartirParJour(e_j, masque)`
Pour chaque jour local `j`, `nb_j` = nombre d'heures du masque ; `out_i = masque_i ? e_{jour_i} / max(nb_{jour_i}, 1) : 0`.
Approximation assumée : une plage de nuit (22 h-6 h) est rattachée au jour **local de l'heure** (pas de report J+1).

### 3.2 `profilVeNonPilote(e_j, d)`
- Arrivées sur 24 h : `VE_PART_SOIR` (70 %) réparties uniformément sur `VE_ARRIVEE_SOIR` [18, 21) ; le reste sur
  `VE_ARRIVEE_JOUR` [7, 18).
- Noyau de charge de durée `d` (h) : `noyau_k = clamp(d − k, 0, 1)` pour `k = 0…⌈d⌉`, normalisé.
- Convolution arrivées × noyau sur 48 h, repli sur 24 h (`p24_h = prof_h + prof_{h+24}`).
- `out_i = e_{jour_i} · p24_{heure_i} / Σ p24`.

### 3.3 `remplirSurplus(surplus, e_j, pMax, fenetre)` — glouton
- Candidats : heures `i` dans la fenêtre avec `surplus_i > 0`.
- **Ordre** : jour croissant, puis surplus décroissant, puis **index croissant** en cas d'égalité
  (équivaut à `np.lexsort((−surplus, jour))`, tri stable). Ce point est indispensable pour la parité.
- Pour chaque candidat : si `reste_j > 0`, `x = min(surplus_i, pMax, reste_j)`, `alloc_i = x`, `reste_j −= x`.
- Retourne `alloc` et `reste_j` (énergie non placée → profil de repli).

## 4. Agrégats pour l'interface (`engine/agregats.ts`)
- Multi-années : moyenne, min, max de chaque indicateur ; `conforme_toutes_annees = ∀a conforme`.
- Journée type : moyenne par heure locale des séries sur les jours ouvrés (ou tous les jours) d'un mois / d'une saison.
- Bilan mensuel : Σ par mois de P, C, direct, export, écrêtement.
- Monotone : tri décroissant de `inj` (et de `C`).
- Dimensionnement : plus petite `bat_puissance` (durée fixée) telle que `max_a ecretement_part ≤ ecretement_max`
  (recherche dichotomique sur [0 ; 2], 12 itérations, puis arrondi au pas de 0,05).

## 5. Pièges de portage (déjà rencontrés et résolus dans `moteur.mjs`)
1. Lire les `.bin` en Float32, convertir en Float64 **avant** tout calcul (les golden sont calculés sur ces entrées arrondies).
2. `heure`, `jour`, `doy` sont stockés en float → `Int32Array.from(...)`.
3. Le tri du glouton doit être **stable** et inclure l'index en dernier critère.
4. `nJours = max(jour) + 1` (une année a 365 ou 366 jours locaux).
5. Les sommes peuvent différer dans le dernier chiffre (sommation naïve vs par paires en NumPy) : la tolérance 1e-6 l'absorbe.
6. `ecretement_part` est rapporté à la production **brute** (avant écrêtement statique), pas à `ΣP`.
7. `heures_vigilance` compare `P − ch` (sans la décharge) au seuil **plus une tolérance de 1e-6 MW** : en pilotage « pointe », la
   batterie ramène `P − ch` exactement sur `s·C` ; sans tolérance, le comptage dépend d'erreurs d'arrondi (corrigé le 21/10/2026).
8. `om_annuel_EUR` est proportionnel à la **puissance** de la batterie (`Pb`, en kW), pas à son CAPEX.

## 6. Limites du modèle (à afficher dans la vue « Méthode »)
Consommation reconstruite (volume local mesuré, forme régionale) ; production calibrée sur le registre ; pilotage de
batterie par règles (pas d'optimisation) ; flexibilités placées par jour (pas de report d'un jour sur l'autre) ; PAC à
COP constant ; pas de modélisation du réseau au-delà des postes sources ; hypothèses économiques pédagogiques
(fiche Projet 6). Voir `donnees/JOURNAL_METHODE.md` §0 bis, §9-11.
