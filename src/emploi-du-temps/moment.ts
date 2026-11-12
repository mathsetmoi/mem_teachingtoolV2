// =============================================================
// L'EMPLOI DU TEMPS À L'HEURE QU'IL EST
// Ce que « Bonjour ! » et la bulle « … arrive » demandent : l'emploi du
// temps relu dans la bibliothèque, les créneaux d'aujourd'hui (le lien de
// Pronote, quand on l'a, pour son établissement), le créneau du moment et
// le classeur qu'il ouvre.
// =============================================================
import type { Registre } from '../classeurs/registre'
import type { FicheClasseur, FicheDossier } from '../classeurs/demarrage'
import { estSeancesIsolees } from '../classeurs/isolees'
import {
  COULEURS, REGLAGE_EMPLOI_DU_TEMPS, classeurDuCreneau, colorier, creneauDuMoment, creneauxDuJour, etablissementDe, heureDite, jourEtMinute,
  lireEmploiDuTemps, nomDuCreneau, prochainCreneau, semaineDe, avecSemainesAB, type Creneau, type EmploiDuTemps, type JourDuLien,
} from './donnees'
import { coursDuJour } from './ics'
import { lusDesLiens } from './pronote'

/** L'emploi du temps de la bibliothèque (vide : rien de saisi) */
export async function lireEDT(registre: Registre): Promise<EmploiDuTemps> {
  try { return lireEmploiDuTemps(await registre.reglage(REGLAGE_EMPLOI_DU_TEMPS)) } catch { return lireEmploiDuTemps(null) }
}

export async function ecrireEDT(registre: Registre, e: EmploiDuTemps): Promise<void> {
  await registre.ecrireReglage(REGLAGE_EMPLOI_DU_TEMPS, e)
}

/** Ce que les liens de Pronote gardés disent de ce jour (null : aucun ne le couvre) */
export function jourDesLiens(e: EmploiDuTemps, t: number): JourDuLien | null {
  const etablissements = new Set<string>()
  const creneaux: Creneau[] = []
  for (const [nom, lu] of Object.entries(lusDesLiens())) {
    const l = coursDuJour(lu.cours, lu.couvre, t, e)
    if (!l) continue
    etablissements.add(nom)
    creneaux.push(...l)
  }
  return etablissements.size ? { etablissements, creneaux } : null
}

/** La couleur d'un établissement (Bleu sans nom) */
export function couleurDe(e: EmploiDuTemps, etablissement: string | null) {
  return COULEURS[(etablissement && e.couleurs[etablissement]) || 0] ?? COULEURS[0]
}

/** Un créneau tel que « Bonjour ! » et la bulle le montrent */
export interface CreneauVu {
  creneau: Creneau
  nom: string
  etablissement: string | null
  couleur: (typeof COULEURS)[number]
  /** Le classeur qu'il ouvre (null : la classe n'en a aucun) */
  classeur: FicheClasseur | null
}

/** L'heure du créneau à côté de maintenant : « dans 7 minutes », « en cours
 *  depuis 7 minutes », « à 14 h 05 » */
export function quandDit(c: Creneau, t: number): string {
  const { minute } = jourEtMinute(t)
  if (c.debut > minute) {
    const n = c.debut - minute
    return n <= 15 ? `dans ${n} minute${n > 1 ? 's' : ''}` : `à ${heureDite(c.debut)}`
  }
  const n = minute - c.debut
  return n < 1 ? 'commence maintenant' : `en cours depuis ${n} minute${n > 1 ? 's' : ''}`
}

export interface Moment {
  edt: EmploiDuTemps
  dossiers: FicheDossier[]
  classeurs: FicheClasseur[]
  /** Le créneau du moment (10 minutes avant, ou en cours) */
  maintenant: CreneauVu | null
  /** Le prochain créneau du jour, quand il n'y a pas de créneau maintenant */
  prochain: CreneauVu | null
  /** La semaine du jour, quand les semaines A et B ont un sens */
  semaine: 'A' | 'B' | null
  /** Les créneaux du jour, pour la bulle */
  jour: Creneau[]
}

/** Tout ce qu'il faut à « Bonjour ! », relu à l'instant ; null : pas
 *  d'emploi du temps (ou pas de bibliothèque) */
export async function momentPresent(registre: Registre, t = Date.now()): Promise<Moment | null> {
  let edt: EmploiDuTemps, dossiers: FicheDossier[], classeurs: FicheClasseur[]
  try { [edt, dossiers, classeurs] = await Promise.all([lireEDT(registre), registre.dossiers(), registre.classeurs()]) } catch { return null }
  if (!edt.creneaux.length) return null
  const vivants = dossiers.filter(d => !d.corbeille)
  const jour = creneauxDuJour(edt, t, vivants, jourDesLiens(edt, t))
  const vu = (c: Creneau | null): CreneauVu | null => {
    if (!c) return null
    const etablissement = etablissementDe(c.dossier, vivants)
    return { creneau: c, nom: nomDuCreneau(c, vivants), etablissement, couleur: couleurDe(edt, etablissement), classeur: classeurDuCreneau(c, classeurs, vivants, estSeancesIsolees) }
  }
  const maintenant = vu(creneauDuMoment(jour, t))
  return {
    edt, dossiers: vivants, classeurs, jour, maintenant,
    prochain: maintenant ? null : vu(prochainCreneau(jour, t)),
    semaine: avecSemainesAB(edt) ? semaineDe(edt, t) : null,
  }
}

/** Le même, pour un créneau donné (la bulle) */
export function creneauVu(m: Moment, c: Creneau): CreneauVu {
  const etablissement = etablissementDe(c.dossier, m.dossiers)
  return { creneau: c, nom: nomDuCreneau(c, m.dossiers), etablissement, couleur: couleurDe(m.edt, etablissement), classeur: classeurDuCreneau(c, m.classeurs, m.dossiers, estSeancesIsolees) }
}

/** Les couleurs des établissements de l'emploi du temps, à jour */
export function colorie(e: EmploiDuTemps, dossiers: readonly FicheDossier[]): EmploiDuTemps {
  return colorier(e, e.creneaux.map(c => etablissementDe(c.dossier, dossiers)).filter((x): x is string => !!x))
}
