// moteur.mjs — Portage JavaScript de référence de donnees/scripts/moteur_ref.py (validé sur tests/golden.json).
// Sert (1) de spécification exécutable pour le moteur TypeScript du simulateur, (2) de moteur à la maquette.
// Conventions : pas horaire, 1 MW = 1 MWh/h ; tableaux Float64Array ; aucune allocation dans la boucle batterie.

// Tolérance (MW) du comptage des heures de vigilance : en pilotage « pointe », P − ch vaut exactement s·C (audit 21/10/2026).
const TOL_SEUIL = 1e-6;

export function chargerAnnee(buffer, n, colonnes, constantes) {
  const f32 = new Float32Array(buffer);
  const col = (nom) => Float64Array.from(f32.subarray(colonnes.indexOf(nom) * n, (colonnes.indexOf(nom) + 1) * n));
  const a = { n, fc_pv: col("fc_pv"), fc_eol: col("fc_eol"), autres: col("autres"), c_reel: col("c_reel"), temp: col("temp"),
              heure: Int32Array.from(col("heure")), jour: Int32Array.from(col("jour")), doy: Int32Array.from(col("doy")), const: constantes };
  a.nJours = 0; for (let i = 0; i < n; i++) if (a.jour[i] + 1 > a.nJours) a.nJours = a.jour[i] + 1;
  let s = 0; for (let i = 0; i < n; i++) s += a.c_reel[i]; a.sommeC = s;
  return a;
}

const masque = (heure, [a, b]) => {
  const m = new Uint8Array(heure.length);
  for (let i = 0; i < heure.length; i++) { const h = heure[i]; m[i] = a < b ? (h >= a && h < b) : (h >= a || h < b); }
  return m;
};

function repartirParJour(an, eJour, m) {
  const nb = new Float64Array(an.nJours), out = new Float64Array(an.n);
  for (let i = 0; i < an.n; i++) nb[an.jour[i]] += m[i];
  for (let i = 0; i < an.n; i++) if (m[i]) out[i] = eJour[an.jour[i]] / Math.max(nb[an.jour[i]], 1);
  return out;
}

function profilVeNonPilote(an, eJour, d, P) {
  const arr = new Float64Array(24);
  let [a, b] = P.VE_ARRIVEE_SOIR; for (let h = a; h < b; h++) arr[h] += P.VE_PART_SOIR / (b - a);
  [a, b] = P.VE_ARRIVEE_JOUR; for (let h = a; h < b; h++) arr[h] += (1 - P.VE_PART_SOIR) / (b - a);
  const nk = Math.ceil(d) + 1, noyau = new Float64Array(nk); let sk = 0;
  for (let k = 0; k < nk; k++) { noyau[k] = Math.max(0, Math.min(1, d - k)); sk += noyau[k]; }
  for (let k = 0; k < nk; k++) noyau[k] /= sk;
  const prof = new Float64Array(48 + nk);
  for (let h = 0; h < 24; h++) for (let k = 0; k < nk; k++) prof[h + k] += arr[h] * noyau[k];
  const p24 = new Float64Array(24); let s = 0;
  for (let h = 0; h < 24; h++) { p24[h] = prof[h] + prof[h + 24]; s += p24[h]; }
  const out = new Float64Array(an.n);
  for (let i = 0; i < an.n; i++) out[i] = eJour[an.jour[i]] * p24[an.heure[i]] / s;
  return out;
}

function remplirSurplus(an, surplus, eJour, pMax, fenetre) {
  const alloc = new Float64Array(an.n), reste = Float64Array.from(eJour), m = masque(an.heure, fenetre), idx = [];
  for (let i = 0; i < an.n; i++) if (m[i] && surplus[i] > 0) idx.push(i);
  idx.sort((i, j) => (an.jour[i] - an.jour[j]) || (surplus[j] - surplus[i]) || (i - j)); // = np.lexsort((-surplus, jour)), stable
  for (const i of idx) {
    const j = an.jour[i]; if (reste[j] <= 0) continue;
    const x = Math.min(surplus[i], pMax, reste[j]); alloc[i] = x; reste[j] -= x;
  }
  return { alloc, reste };
}

export function batterie(P, C, E, Pb, rdt, soc0, pilotage, seuil) {
  const n = P.length, ch = new Float64Array(n), dch = new Float64Array(n), soc = new Float64Array(n);
  if (E <= 0 || pilotage === "aucune") return { ch, dch, soc };
  const eta = Math.sqrt(rdt), k = pilotage === "pointe" ? seuil : 1.0; let s = soc0 * E;
  for (let h = 0; h < n; h++) {
    const net = P[h] - C[h];
    if (net > 0) { const x = Math.min(Math.max(P[h] - k * C[h], 0), Pb, (E - s) / eta); ch[h] = x; s += x * eta; }
    else if (net < 0) { const x = Math.min(-net, Pb, s * eta); dch[h] = x; s -= x / eta; }
    soc[h] = s;
  }
  return { ch, dch, soc };
}

export function simuler(an, pIn, defauts, profils, avecSeries = false) {
  const p = { ...defauts, ...pIn }, k = an.const, n = an.n, nJ = an.nJours;
  // 1. production
  const PcPv = p.m_pv * k.Ppv_A, P = new Float64Array(n), pv = new Float64Array(n), eol = new Float64Array(n);
  let ecretStat = 0, Pbrut = 0;
  for (let i = 0; i < n; i++) {
    const brut = PcPv * an.fc_pv[i]; pv[i] = Math.min(brut, p.pv_plafond * PcPv); ecretStat += brut - pv[i];
    eol[i] = p.m_eol * k.Peol_A * an.fc_eol[i]; P[i] = pv[i] + eol[i] + an.autres[i]; Pbrut += brut + eol[i] + an.autres[i];
  }
  // 2. consommation
  const C0 = new Float64Array(n); const fv = p.variante_conso === "vol2024" ? k.conso_2024_MWh / an.sommeC : 1;
  for (let i = 0; i < n; i++) C0[i] = an.c_reel[i] * fv;
  let cPac = new Float64Array(n), cVeNp = new Float64Array(n), cVeTar = new Float64Array(n), eVePil = new Float64Array(nJ), nVe = 0, nPac = 0;
  if (p.horizon === "2035") {
    const f = k.part_residentiel * p.pop_facteur * (1 - p.renovation) + k.part_tertiaire * p.pop_facteur + (1 - k.part_residentiel - k.part_tertiaire);
    for (let i = 0; i < n; i++) C0[i] *= f;
    nPac = Math.min(p.pac_part * k.residences_principales_2023 * p.pop_facteur, k.logements_fossiles_2023);
    const G = p.besoin_chauffage / k.degres_heures_16_moyen;
    for (let i = 0; i < n; i++) cPac[i] = nPac * G * Math.max(0, p.t_base_chauffage - an.temp[i]) / p.pac_cop;
    nVe = p.part_ve * k.voitures_menages_2023 * p.pop_facteur;
    const eVe = nVe * p.km_jour * p.conso_ve / 100 / p.rdt_recharge / 1000, partTar = Math.max(0, 1 - p.ve_non_pilote - p.ve_pilote);
    const dCharge = (p.km_jour * p.conso_ve / 100 / p.rdt_recharge) / p.p_borne;
    cVeNp = profilVeNonPilote(an, new Float64Array(nJ).fill(eVe * p.ve_non_pilote), dCharge, profils);
    cVeTar = repartirParJour(an, new Float64Array(nJ).fill(eVe * partTar), masque(an.heure, profils.HC_NUIT));
    eVePil.fill(eVe * p.ve_pilote);
  }
  const C1 = new Float64Array(n); for (let i = 0; i < n; i++) C1[i] = C0[i] + cPac[i] + cVeNp[i] + cVeTar[i];
  // 3. flexibilités
  let cVePil = new Float64Array(n), sPil = 0; for (let j = 0; j < nJ; j++) sPil += eVePil[j];
  if (sPil > 0) {
    const nPil = nVe * p.ve_pilote, jourE = eVePil.map((e) => e * p.ve_dispo_journee), surplus = new Float64Array(n);
    for (let i = 0; i < n; i++) surplus[i] = P[i] - C1[i];
    const { alloc, reste } = remplirSurplus(an, surplus, jourE, nPil * p.p_borne / 1000, profils.FENETRE_JOUR);
    const nuitE = new Float64Array(nJ); for (let j = 0; j < nJ; j++) nuitE[j] = eVePil[j] * (1 - p.ve_dispo_journee) + reste[j];
    const nuit = repartirParJour(an, nuitE, masque(an.heure, profils.HC_NUIT));
    for (let i = 0; i < n; i++) cVePil[i] = alloc[i] + nuit[i];
  }
  const C2 = new Float64Array(n); for (let i = 0; i < n; i++) C2[i] = C1[i] + cVePil[i];
  let ecsR = new Float64Array(n), ecsA = new Float64Array(n);
  if (p.ecs_deplace > 0) {
    const nEcs = p.ecs_part * k.residences_principales_2023 * (p.horizon === "2035" ? p.pop_facteur : 1) * p.ecs_deplace;
    const sd = new Float64Array(nJ), cnt = new Float64Array(nJ);
    for (let i = 0; i < n; i++) { sd[an.jour[i]] += an.doy[i]; cnt[an.jour[i]] += 1; }
    const eJ = new Float64Array(nJ);
    for (let j = 0; j < nJ; j++) eJ[j] = nEcs * p.ecs_conso / 365 * (1 + profils.ECS_SAISON * Math.cos(2 * Math.PI * (sd[j] / Math.max(cnt[j], 1) - 15) / 365));
    ecsR = repartirParJour(an, eJ, masque(an.heure, profils.ECS_NUIT));
    const surplus = new Float64Array(n); for (let i = 0; i < n; i++) surplus[i] = P[i] - C2[i];
    const { alloc, reste } = remplirSurplus(an, surplus, eJ, nEcs * p.ecs_p / 1000, profils.ECS_JOUR);
    const rep = repartirParJour(an, reste, masque(an.heure, profils.ECS_NUIT));
    for (let i = 0; i < n; i++) ecsA[i] = alloc[i] + rep[i];
  }
  const C = new Float64Array(n); for (let i = 0; i < n; i++) C[i] = C2[i] - ecsR[i] + ecsA[i];
  // 4. batterie
  const E = p.bat_pilotage !== "aucune" ? p.bat_puissance * PcPv * p.bat_duree : 0, Pb = p.bat_puissance * PcPv;
  const { ch, dch, soc } = batterie(P, C, E, Pb, p.bat_rdt, p.bat_soc0, p.bat_pilotage, p.seuil_vigilance);
  // 5. indicateurs
  let sP = 0, sC = 0, auto = 0, exp = 0, imp = 0, injMax = -Infinity, cMax = -Infinity, soutMax = -Infinity, hv = 0, ecretDyn = 0, sDch = 0, veAbs = 0, sPac = 0, sVe = 0, sEcs = 0;
  const inj = avecSeries ? new Float64Array(n) : null;
  for (let i = 0; i < n; i++) {
    const d = Math.min(P[i], C[i]); sP += P[i]; sC += C[i]; auto += d + dch[i];
    exp += Math.max(P[i] - C[i], 0) - ch[i]; imp += Math.max(C[i] - P[i], 0) - dch[i];
    const x = P[i] - C[i] - ch[i] + dch[i]; if (inj) inj[i] = x;
    if (x > injMax) injMax = x; if (-x > soutMax) soutMax = -x; if (C[i] > cMax) cMax = C[i];
    if (P[i] - ch[i] > p.seuil_vigilance * C[i] + TOL_SEUIL) hv++;
    ecretDyn += Math.max(x - (p.seuil_vigilance - 1) * C[i], 0); sDch += dch[i];
    veAbs += Math.min(cVePil[i], Math.max(P[i] - C1[i], 0)); sPac += cPac[i]; sVe += cVeNp[i] + cVeTar[i] + cVePil[i]; sEcs += ecsR[i];
  }
  const ecret = ecretStat + ecretDyn;
  const fa = p.taux_actu > 0 ? (1 - Math.pow(1 + p.taux_actu, -p.duree_analyse)) / p.taux_actu : p.duree_analyse;
  const r = {
    production_MWh: sP, production_brute_MWh: Pbrut, consommation_MWh: sC, couverture: sP / sC, couverture_horaire: auto / sC,
    autoconso_MWh: auto, surplus_exporte_MWh: exp, deficit_importe_MWh: imp, pointe_injection_MW: injMax, pointe_conso_MW: cMax,
    pointe_soutirage_MW: soutMax, heures_vigilance: hv, ecretement_statique_MWh: ecretStat, ecretement_dynamique_MWh: ecretDyn,
    ecretement_MWh: ecret, ecretement_part: ecret / Pbrut, conforme: ecret / Pbrut <= p.ecretement_max + 1e-12,
    bat_energie_MWh: E, bat_decharge_MWh: sDch, bat_cycles: E ? sDch / E : 0, ve_nb: nVe, pac_nb: nPac, conso_pac_MWh: sPac,
    conso_ve_MWh: sVe, ve_surplus_absorbe_MWh: veAbs, ecs_deplace_MWh: sEcs,
    valeur_annuelle_EUR: 1000 * (-imp * p.prix_achat + (exp - ecretDyn) * p.prix_surplus), capex_batterie_EUR: E * 1000 * p.cout_bat, om_annuel_EUR: E > 0 ? Pb * 1000 * p.om_bat : 0, facteur_annuite: fa,
  };
  if (avecSeries) r.series = { P, C, C0, pac: cPac, ve_np: cVeNp, ve_tar: cVeTar, ve_pil: cVePil, ecs_retire: ecsR, ecs_ajoute: ecsA, ch, dch, soc, inj, pv, eol };
  return r;
}
