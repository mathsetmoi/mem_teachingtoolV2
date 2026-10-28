// =============================================================
// CE QUE MONTRE LA BIBLIOTHÈQUE (un modèle pur)
// Quels classeurs vont dans « Récents » et dans « Tous les classeurs »,
// dans quel ordre, et ce qu'on écrit sur leurs cartes : « Modifié
// aujourd'hui à 14 h 05 · 12 pages », le texte du lecteur d'écran
// (« Symétrie centrale, 12 pages, modifié aujourd'hui à 14 h 05 »), le
// titre des petites icônes de la clé et du Drive (« Sur la clé il y a 3
// jours »). L'écran lui-même est dans bibliotheque.ts.
//
// Ce fichier est pur (sans DOM ni IndexedDB) : il se teste sous Node.
// =============================================================
import type { FicheClasseur, FicheDossier } from './demarrage'
import { LONGUEUR_NOM_CLASSEUR } from './demarrage'
import { pagesLisibles } from '../fichier'
import { dateCourteMajuscule, seancesDansLOrdre } from '../seances'
import { heureLisible } from '../revue/bande'

/** Le nombre de classeurs dans « Récents » */
export const RECENTS = 6

const MINUTE = 60_000
const HEURE = 60 * MINUTE
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Les jours entre t et maintenant, comptés au calendrier (0 : aujourd'hui,
 *  1 : hier), à midi pour ne pas tomber sur un changement d'heure */
function joursEntre(t: number, maintenant: number): number {
  const midi = (x: number) => { const d = new Date(x); d.setHours(12, 0, 0, 0); return d.getTime() }
  return Math.round((midi(maintenant) - midi(t)) / 86_400_000)
}

/** Une date à côté d'un nom (sans le jour de la semaine, qui l'allonge) :
 *  « le 7 octobre » cette année, « le 30 septembre 2025 » une autre */
function jourCourt(t: number, maintenant: number): string {
  const d = new Date(t)
  const jour = d.getDate() === 1 ? '1er' : String(d.getDate())
  return d.getFullYear() === new Date(maintenant).getFullYear() ? `le ${jour} ${MOIS[d.getMonth()]}` : `le ${jour} ${MOIS[d.getMonth()]} ${d.getFullYear()}`
}

/** « aujourd'hui à 14 h 05 », « hier à 9 h 30 », « le 7 octobre » (cette
 *  année), « le 30 septembre 2025 » : la date d'une carte */
export function quandCourt(t: number, maintenant: number): string {
  const j = joursEntre(t, maintenant)
  if (j === 0) return `aujourd'hui à ${heureLisible(t)}`
  if (j === 1) return `hier à ${heureLisible(t)}`
  return jourCourt(t, maintenant)
}

/** Depuis quand, en relatif : « à l'instant », « il y a 7 min », « il y a
 *  3 h » (le même jour), « hier », « il y a 3 jours » (moins d'une
 *  semaine), puis « le 7 octobre » : le titre des icônes de la clé et du
 *  Drive. Une date à venir (l'horloge d'une autre machine) : « à l'instant ». */
export function depuisQuand(t: number, maintenant: number): string {
  const d = maintenant - t
  if (d < MINUTE) return 'à l\'instant'
  if (d < HEURE) return `il y a ${Math.floor(d / MINUTE)} min`
  const j = joursEntre(t, maintenant)
  if (j <= 0) return `il y a ${Math.floor(d / HEURE)} h`
  if (j === 1) return 'hier'
  if (j < 7) return `il y a ${j} jours`
  return jourCourt(t, maintenant)
}

/** Les classeurs les plus récemment ouverts, n au plus (ceux qu'on n'a
 *  jamais ouverts ici n'y sont pas) ; à égalité, le plus récemment modifié.
 *  fiches : les classeurs visibles (voir demarrage.visible). */
export function recents(fiches: readonly FicheClasseur[], n = RECENTS): FicheClasseur[] {
  return fiches.filter(f => f.ouvert > 0)
    .sort((a, b) => (b.ouvert - a.ouvert) || (b.modifie - a.modifie) || (a.id < b.id ? -1 : 1))
    .slice(0, Math.max(0, n))
}

/** Le tri par date : le plus récemment modifié d'abord ; à égalité, le plus
 *  récemment créé, puis par nom (comme un humain le lit : « Chapitre 2 »
 *  avant « Chapitre 10 »), puis par id (un ordre stable) */
export function parDate(fiches: readonly FicheClasseur[]): FicheClasseur[] {
  return [...fiches].sort((a, b) => (b.modifie - a.modifie) || (b.cree - a.cree)
    || a.nom.localeCompare(b.nom, 'fr', { numeric: true, sensitivity: 'base' }) || (a.id < b.id ? -1 : 1))
}

type Dossiers = ReadonlyMap<string, FicheDossier>

/** Le classeur est à la racine de la bibliothèque : sans dossier, ou dans
 *  un dossier qui n'existe plus (il ne doit pas se perdre) */
export function aLaRacine(f: FicheClasseur, dossiers: Dossiers): boolean {
  return f.dossier === null || !dossiers.has(f.dossier)
}

/** « Modifié aujourd'hui à 14 h 05 · 12 pages ». Un classeur dont on ne sait
 *  pas encore la date (le premier, repris, jamais rouvert depuis) :
 *  « Pas encore ouvert depuis la mise à jour » ; le nombre de pages
 *  seulement s'il est connu. */
export function libelleCarte(f: FicheClasseur, maintenant: number): string {
  const parts: string[] = []
  if (f.modifie > 0) parts.push(`Modifié ${quandCourt(f.modifie, maintenant)}`)
  else if (f.cree > 0) parts.push(`Créé ${quandCourt(f.cree, maintenant)}`)
  if (f.pages !== null && f.pages > 0) parts.push(pagesLisibles(f.pages))
  return parts.length ? parts.join(' · ') : 'Pas encore ouvert depuis la mise à jour'
}

/** Ce que dit la ligne « séances » sous la carte d'un classeur : « 4
 *  séances », « 1 séance » ; null : rien à déplier (aucune séance où l'on a
 *  écrit, ou le classeur n'a pas été ouvert depuis qu'il en garde la liste) */
export function libelleSeances(f: FicheClasseur): string | null {
  const n = f.listeSeances?.length ?? 0
  return n ? `${n} séance${n > 1 ? 's' : ''}` : null
}

/** Une ligne de la liste dépliée : « Lun 19 oct 8h », son nom s'il en a un,
 *  « 3 pages » */
export interface LigneSeance { id: string; date: string; nom: string | null; pages: string }

/** Les séances d'un classeur, la plus récente d'abord (ou dans l'ordre
 *  choisi à la main, voir seances.seancesDansLOrdre) */
export function lignesDesSeances(f: FicheClasseur): LigneSeance[] {
  return seancesDansLOrdre(f.listeSeances ?? [])
    .map(s => ({ id: s.id, date: dateCourteMajuscule(s.debut), nom: s.nom ?? null, pages: pagesLisibles(s.pages) }))
}

/** Une séance dans la liste « Séances » de la bibliothèque : d'où elle vient
 *  (le classeur, son dossier), sa date, ses pages */
export interface RangeeSeance { classeur: string; seance: string; nomClasseur: string; chemin: string; debut: number; date: string; nom: string | null; pages: string }

/** Les séances de ces classeurs, la plus récente d'abord, rangées par mois
 *  (« Octobre 2026 »). `chemin` dit le dossier d'un classeur. */
export function seancesParMois(fiches: readonly FicheClasseur[], chemin: (f: FicheClasseur) => string): { mois: string; seances: RangeeSeance[] }[] {
  const toutes: RangeeSeance[] = []
  for (const f of fiches) {
    for (const s of f.listeSeances ?? []) {
      toutes.push({ classeur: f.id, seance: s.id, nomClasseur: f.nom, chemin: chemin(f), debut: s.debut, date: dateCourteMajuscule(s.debut), nom: s.nom ?? null, pages: pagesLisibles(s.pages) })
    }
  }
  toutes.sort((a, b) => b.debut - a.debut || (a.seance < b.seance ? -1 : a.seance > b.seance ? 1 : a.classeur < b.classeur ? -1 : 1))
  const groupes: { mois: string; seances: RangeeSeance[] }[] = []
  for (const r of toutes) {
    const m = new Date(r.debut).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const mois = m.charAt(0).toUpperCase() + m.slice(1)
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.mois === mois) dernier.seances.push(r)
    else groupes.push({ mois, seances: [r] })
  }
  return groupes
}

/** Le titre de la petite icône de la clé (null : pas d'enregistrement
 *  automatique sur une clé) : « Sur la clé il y a 3 jours (Symétrie.memc) ».
 *  C'est la date de la dernière écriture réussie, pas une promesse : l'état
 *  du classeur ouvert dit le reste. */
export function titreCle(f: FicheClasseur, maintenant: number): string | null {
  const c = f.cle
  if (!c) return null
  const nom = c.nom ? ` (${c.nom})` : ''
  return c.t ? `Sur la clé ${depuisQuand(c.t, maintenant)}${nom}` : `Enregistrement automatique sur la clé${nom} : pas encore écrit`
}

/** Le titre de la petite icône du Drive (null : pas de copie) */
export function titreDrive(f: FicheClasseur, maintenant: number): string | null {
  const d = f.drive
  if (!d) return null
  return d.t ? `Sur le Drive ${depuisQuand(d.t, maintenant)}` : 'Copie sur le Drive : pas encore faite'
}

/** Ce que lit le lecteur d'écran sur une carte : « Symétrie centrale, 12
 *  pages, modifié aujourd'hui à 14 h 05 », puis, s'il y a lieu, ses
 *  étiquettes de niveau (« niveau 5e B »), son dossier quand un filtre les
 *  montre tous ensemble (« dans 5e B › Géométrie »), « ouvert dans cet
 *  onglet », la clé et le Drive (les icônes et les puces, elles, sont
 *  muettes) */
export function texteLecteur(f: FicheClasseur, maintenant: number, o: { ouvertIci?: boolean; etiquettes?: readonly string[]; chemin?: string } = {}): string {
  const parts = [f.nom]
  if (f.pages !== null && f.pages > 0) parts.push(pagesLisibles(f.pages))
  if (f.modifie > 0) parts.push(`modifié ${quandCourt(f.modifie, maintenant)}`)
  else if (f.cree > 0) parts.push(`créé ${quandCourt(f.cree, maintenant)}`)
  else parts.push('pas encore ouvert depuis la mise à jour')
  if (o.etiquettes?.length) parts.push(`${o.etiquettes.length > 1 ? 'niveaux' : 'niveau'} ${o.etiquettes.join(', ')}`)
  if (o.chemin) parts.push(`dans ${o.chemin}`)
  if (o.ouvertIci) parts.push('ouvert dans cet onglet')
  const cle = titreCle(f, maintenant), drive = titreDrive(f, maintenant)
  if (cle) parts.push(cle.charAt(0).toLowerCase() + cle.slice(1))
  if (drive) parts.push(drive.charAt(0).toLowerCase() + drive.slice(1))
  return parts.join(', ')
}

/** « Aucun classeur », « 1 classeur », « 12 classeurs » */
export function nombreDeClasseurs(n: number): string {
  return n === 0 ? 'Aucun classeur' : `${n} classeur${n > 1 ? 's' : ''}`
}

/** Le nom d'un classeur tel qu'on le range : les blancs réunis, sans
 *  caractère de contrôle, 60 caractères au plus ; null s'il ne reste rien */
export function nomDeClasseur(texte: string): string | null {
  const propre = String(texte ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim()
  const court = [...propre].slice(0, LONGUEUR_NOM_CLASSEUR).join('').trim()
  return court || null
}
