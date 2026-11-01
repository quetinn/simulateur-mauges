# 04 — Design system « Bocage & réseau »

Direction demandée : **institutionnel clair, mais pas banal**. Le simulateur doit inspirer confiance comme un document
de collectivité, et se reconnaître au premier coup d'œil comme l'outil des Mauges.

## 1. Concept
Deux mondes se croisent dans le sujet : le **bocage des Mauges** (haies, parcelles, vert profond, cartes IGN) et
l'**ingénierie du réseau** (postes sources, plaques signalétiques, courbes horaires, seuils). L'interface emprunte :
- au **relevé cartographique** : fond « papier calque froid », traits fins, légendes en petites capitales, échelles ;
- à la **signalétique électrique** : codes de postes (`CHEMI`, `SSMO5`) en plaques à chasse fixe, seuil 120 % en
  tirets, jauges graduées ;
- un **motif signature** : la *bande des 24 heures* (nuit / jour / midi solaire) qui sert d'axe à toutes les journées
  types et de séparateur visuel dans l'en-tête.

À éviter : dégradés violets, crème + serif, néons sur fond noir, cartes arrondies partout, émojis.

## 2. Couleurs (tokens CSS — `src/styles/tokens.css`)
Thème clair (principal, projection). Un thème sombre est fourni pour le confort, sans être prioritaire.

| Token | Clair | Sombre | Usage |
|---|---|---|---|
| `--bg` | `#F3F6F4` | `#121816` | fond « calque froid » (léger biais vert) |
| `--panel` | `#FFFFFF` | `#1A2220` | panneaux, tuiles |
| `--ink` | `#14222B` | `#E8EEEB` | texte principal |
| `--ink-2` | `#4A5A63` | `#A9B6B1` | texte secondaire |
| `--ink-3` | `#5F6D73` (1/11 : était `#6E7C82`, 4,3:1, sous AA) | `#7F8C88` | légendes, axes (≥ 4,5:1 sur `--bg` et `--panel`) |
| `--line` | `#D6DFDA` | `#2C3633` | filets, grilles (recessifs) |
| `--accent` | `#1F5F8B` « bleu Loire » | `#5B9BD0` | éléments interactifs, focus, sélection |
| `--bocage` | `#2F5D3A` | `#7FB08A` | identité (logo, titres de section), jamais pour un état |
| `--seuil` | `#C2410C` | `#F08A4B` | ligne de seuil 120 % et limite 5 % (repère, pas un état) |

**Séries (validées daltonisme par `validate_palette.js`, ordre fixe — la couleur suit l'entité, jamais le rang)** :

| Entité | Clair | Sombre |
|---|---|---|
| Solaire | `#EDA100` | `#C98500` |
| Éolien | `#2A78D6` | `#3987E5` |
| Ballons d'eau chaude | `#1BAF7A` | `#199E70` |
| Véhicules électriques | `#EB6834` | `#D95926` |
| Batterie (charge / décharge / état) | `#6250D6` | `#9085E9` |
| Pompes à chaleur | `#E87BA4` | `#D55181` |
| Consommation de base | `--ink` (trait 2 px) | `--ink` |
| Autres ENR (bio, hydro) | `--ink-3` | `--ink-3` |

Résultat du validateur (clair) : CVD ΔE adjacent min 9,2 ; vision normale 24,0 ; solaire, ballons et PAC < 3:1 sur
fond clair → **libellés directs obligatoires** + tableau « Voir les données ». Sombre : tous les tests passent.

**États (réservés, jamais utilisés pour une série, toujours icône + texte)** : conforme `#0CA30C` (✓), vigilance
`#FAB219` (!), dépassement `#D03B3B` (✕).

## 3. Typographie (auto-hébergée via @fontsource)
| Rôle | Police | Réglages |
|---|---|---|
| Titres, grands chiffres | **Archivo** (largeur 87,5 %, graisses 600/700) | chiffres tabulaires ; titres `text-wrap: balance` |
| Texte, interface | **Atkinson Hyperlegible** (400/700) | conçue pour la lisibilité à distance → projection |
| Données, codes, unités | **IBM Plex Mono** (400/500) | codes de postes, unités en petites capitales, valeurs de tableaux |

Échelle (base 16 px ; 18 px en mode projection) : 12 · 14 · 16 · 20 · 24 · 32 · 48 (chiffres des tuiles) · 64 (Démo).
Unités : toujours séparées par une espace fine insécable, en Plex Mono, 0,7 em, `--ink-2` (« 55,2 % », « 147 MW »).

## 4. Mise en page
- Grille 12 colonnes, gouttière 24 px, marges latérales ≥ 16 px ; rail de réglages 320 px fixe (≥ 1 200 px).
- Panneaux : fond `--panel`, filet 1 px `--line`, rayon **4 px** (net, « document »), **pas d'ombre** sauf tiroirs et
  info-bulles. La mise en relief vient de l'espacement et des filets, pas des ombres.
- En-tête : nom + sélecteur de vue + année ; sous l'en-tête, la **bande des 24 heures** fine (dégradé nuit → jour → nuit)
  sert de signature.
- Espacements : multiples de 4 (4, 8, 12, 16, 24, 32, 48).

## 5. Composants clés
- **Tuile KPI** : libellé en petites capitales (`letter-spacing: .06em`), valeur Archivo 48 px, unité Plex Mono,
  ligne de fourchette « 2021-2025 : 37-46 % » ; pastille d'état si pertinent ; bouton « D'où vient ce chiffre ? » (i).
- **Jauge d'écrêtement** : règle graduée 0-25 % façon instrument, repère vertical à 5 % (`--seuil`), curseur de valeur,
  zone min-max des 5 années en ombré.
- **Curseur** : piste fine, poignée carrée 16 px (signalétique), valeur affichée à droite en Plex Mono, repères des
  scénarios A/B/C sur la piste (petites encoches étiquetées).
- **Interrupteur de solution** : ligne avec icône simple (soleil, éolienne, ballon, prise, batterie), titre, effet
  attendu en une ligne, réglage dépliable.
- **Plaque de poste** : code en Plex Mono dans un cadre 1 px (`CHEMI`), nom en dessous, barre de remplissage.
- **Verdict** : encadré filet gauche 3 px de la couleur d'état + icône + phrase.

## 6. Graphiques (méthode dataviz)
- Traits 2 px ; aires empilées avec 1 px de séparation couleur de fond ; marqueurs ≥ 8 px ; extrémités de barres
  arrondies 2 px côté valeur.
- Grille et axes en `--line` / `--ink-3`, jamais plus contrastés que les données.
- **Un seul axe Y par graphique** (l'état de charge de la batterie a son propre graphique aligné en dessous).
- Libellés directs pour ≤ 4 séries + légende toujours présente dès 2 séries ; textes en couleurs d'encre, jamais en
  couleur de série.
- Info-bulle à réticule sur les courbes, info-bulle par marque sur les barres ; zones de survol plus grandes que les marques.
- Seuil 120 % : tirets 4-3, `--seuil`, étiqueté « seuil de vigilance (120 % de la conso) ».

## 7. Mouvement
- Transitions de chiffres 200 ms (interpolation numérique), glissement des curseurs 150 ms, graphiques sans animation
  à chaque recalcul (la réactivité est l'animation). `prefers-reduced-motion` : tout à 0 ms.
- Un seul moment « orchestré » : l'enchaînement des étapes de la vue Démo.

## 8. Carte
- Fond : OSM (ou Plan IGN) **désaturé** (`filter: grayscale(.85) contrast(.9) brightness(1.05)` sur la couche de tuiles)
  pour que les données ressortent ; contours des communes en `--bocage` 1,5 px, remplissage séquentiel vert (MW) ;
  postes en cercles + plaque au survol ; remplissage S3REnR : bleu → `--seuil` → état dépassement avec motif hachuré
  (lisible en impression et en daltonisme).
- Attribution visible en bas à droite.
