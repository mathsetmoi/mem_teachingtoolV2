// =============================================================
// LES SÉANCES D'UN CLASSEUR (lot 6)
// Un classeur est un chapitre ; il se range en séances, chacune avec SES
// pages, numérotées à partir de 1. Une séance commence quand on la crée
// (« Nouvelle séance », la fenêtre d'accueil) : on n'a plus à la deviner
// dans le film.
//
// Ce qui est écrit dans le document (deux cartes de premier niveau, hors des
// pages : ni étape du film, ni pile d'annulation, comme les noms des pages
// et la corbeille ; un fichier .memc les garde sans autre code) :
// - 'seances' : id → { debut, nom?, depuis?, ancienne? } ;
// - 'seanceDesPages' : page → id de sa séance (une page n'est que d'une
//   séance).
// L'ordre des pages reste UN seul, l'ordre global du document : les pages
// d'une séance sont les pages de l'ordre qui sont à elle, dans cet ordre.
// Une version d'avant le lot 6 ignore les deux cartes et voit toutes les
// pages, séance après séance (une séance neuve met sa page 1 au bout de
// l'ordre, une page ajoutée se place à côté de celle qu'on regarde). Une
// page qu'elle a ajoutée n'a pas de séance : elle est de la séance de la
// page qui la précède dans l'ordre (à défaut, de la suivante ; à défaut, de
// la dernière séance), sans que rien ne s'écrive.
//
// Ce fichier est pur (ni interface ni base) : il se teste sous Node.
// =============================================================

/** Ce que le document garde d'une séance. debut : l'heure de sa création
 *  (Date.now()) ; c'est aussi la clé de sa publication (Publier republie au
 *  même lien). depuis : pour une séance reprise du découpage d'avant (la
 *  migration), l'heure de la première étape du film qui est d'elle (une page
 *  née juste avant le premier geste) ; sans lui, debut. ancienne : née de
 *  la migration (son nom par défaut est sa date). rang : sa place quand le
 *  professeur a choisi l'ordre à la main (voir seancesDansLOrdre) ; une
 *  version d'avant l'ignore et range par dates. */
export interface FicheSeance { debut: number; nom?: string; depuis?: number; ancienne?: true; rang?: number }

/** Une séance, avec ses pages (dans l'ordre du document) */
export interface SeanceDuClasseur {
  id: string
  debut: number
  depuis: number
  nom: string | null
  ancienne: boolean
  /** Sa place choisie à la main (null : celle de sa date) */
  rang: number | null
  pages: string[]
}

/** Un nom de séance tient en 60 caractères */
export const LONGUEUR_NOM_SEANCE = 60
/** Une séance sans activité depuis plus d'une heure : on en propose une nouvelle */
export const UNE_HEURE = 60 * 60 * 1000

/** Une fiche de séance qui se lit (un document abîmé, une autre version) */
export function ficheValable(v: unknown): v is FicheSeance {
  return !!v && typeof v === 'object' && typeof (v as FicheSeance).debut === 'number' && Number.isFinite((v as FicheSeance).debut)
}

/** Les séances, de la plus ancienne à la plus récente (par début, puis par
 *  id : deux onglets qui en créent une au même instant ont le même ordre) */
export function seancesTriees(seances: Iterable<[string, unknown]>): { id: string; fiche: FicheSeance }[] {
  const l: { id: string; fiche: FicheSeance }[] = []
  for (const [id, v] of seances) if (ficheValable(v)) l.push({ id, fiche: v })
  return l.sort((a, b) => (a.fiche.debut - b.fiche.debut) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** Range les pages de l'ordre par séance (voir l'en-tête : une page sans
 *  séance valable prend celle de la page d'avant, sinon de la suivante,
 *  sinon la dernière séance). Rend chaque séance, même sans page, de la
 *  plus ancienne à la plus récente ; vide s'il n'y a pas de séance. */
export function rangerLesPages(ordre: readonly string[], seances: Iterable<[string, unknown]>, seanceDe: (page: string) => unknown): SeanceDuClasseur[] {
  const triees = seancesTriees(seances)
  if (!triees.length) return []
  const r = triees.map(({ id, fiche }) => ({
    id, debut: fiche.debut, depuis: typeof fiche.depuis === 'number' && Number.isFinite(fiche.depuis) ? fiche.depuis : fiche.debut,
    nom: typeof fiche.nom === 'string' && fiche.nom.trim() ? fiche.nom.trim() : null, ancienne: !!fiche.ancienne,
    rang: typeof fiche.rang === 'number' && Number.isFinite(fiche.rang) ? fiche.rang : null, pages: [] as string[],
  }))
  const parId = new Map(r.map(s => [s.id, s]))
  const attente: string[] = []
  let derniere: SeanceDuClasseur | null = null
  for (const p of ordre) {
    const v = seanceDe(p)
    const s = typeof v === 'string' ? parId.get(v) : undefined
    if (s) {
      // Les pages d'avant, sans séance, en tête de l'ordre : celle-ci
      for (const q of attente) s.pages.push(q)
      attente.length = 0
      s.pages.push(p); derniere = s
    } else if (derniere) derniere.pages.push(p)
    else attente.push(p)
  }
  if (attente.length) r[r.length - 1].pages.push(...attente)
  return r
}

/** Les séances où l'on a écrit (une page au moins), telles que la fiche du
 *  classeur les garde pour la bibliothèque : de la plus ancienne à la plus
 *  récente */
export function resumeDesSeances(l: readonly SeanceDuClasseur[]): { id: string; debut: number; nom?: string; rang?: number; pages: number }[] {
  return l.filter(s => s.pages.length > 0).map(s => ({ id: s.id, debut: s.debut, ...(s.nom ? { nom: s.nom } : {}), ...(s.rang !== null ? { rang: s.rang } : {}), pages: s.pages.length }))
}

// ---------- L'ordre choisi à la main ----------
// Les séances se montrent la plus récente d'abord. Le professeur peut en
// changer l'ordre (glisser une séance, « Monter », « Descendre ») : chaque
// séance reçoit alors un rang, un nombre qui remplace sa date pour la
// ranger (et pour elle seule : le film, Publier et la revue lisent toujours
// les dates). Les rangs sont tirés de la date la plus récente du classeur,
// en descendant d'une milliseconde par place : une séance neuve, qui n'a
// pas de rang, a une date plus récente que tous, et se met en haut.
// « Remettre dans l'ordre des dates » retire tous les rangs.

/** Ce qui range une séance : son rang, sinon sa date */
export function cleDeRangement(s: { debut: number; rang?: number | null }): number {
  return typeof s.rang === 'number' && Number.isFinite(s.rang) ? s.rang : s.debut
}

/** Des séances dans l'ordre où on les montre : la première en haut (la plus
 *  récente, ou celle que le professeur y a mise) */
export function seancesDansLOrdre<T extends { id: string; debut: number; rang?: number | null }>(l: readonly T[]): T[] {
  return [...l].sort((a, b) => (cleDeRangement(b) - cleDeRangement(a)) || (b.debut - a.debut) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

/** L'ordre a-t-il été choisi à la main (une séance au moins a un rang, et
 *  l'ordre montré n'est pas celui des dates) ? */
export function ordreALaMain(l: readonly { id: string; debut: number; rang?: number | null }[]): boolean {
  if (!l.some(s => typeof s.rang === 'number')) return false
  const parDates = [...l].sort((a, b) => (b.debut - a.debut) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)).map(s => s.id).join(',')
  return seancesDansLOrdre(l).map(s => s.id).join(',') !== parDates
}

/** Les rangs d'un ordre choisi (ids, la première en haut) : id → rang */
export function rangsDeLOrdre(ids: readonly string[], debuts: readonly number[]): Map<string, number> {
  const haut = debuts.length ? Math.max(...debuts) : 0
  return new Map(ids.map((id, i) => [id, haut - i]))
}

/** L'ordre après avoir déplacé la séance `id` d'un cran (−1 : vers le haut,
 *  +1 : vers le bas), ou à la place `vers` (sa place dans l'ordre d'après) ;
 *  null : rien ne bouge */
export function ordreApres(ids: readonly string[], id: string, o: { pas?: -1 | 1; vers?: number }): string[] | null {
  const i = ids.indexOf(id)
  if (i < 0) return null
  const j = o.vers !== undefined ? Math.max(0, Math.min(ids.length - 1, o.vers)) : i + (o.pas ?? 0)
  if (j === i || j < 0 || j >= ids.length) return null
  const r = ids.filter(x => x !== id)
  r.splice(j, 0, id)
  return r
}

/** La séance d'une page selon ce rangement (null : aucune séance) */
export function seanceDeLaPage(rangees: readonly SeanceDuClasseur[], page: string): SeanceDuClasseur | null {
  for (const s of rangees) if (s.pages.includes(page)) return s
  return null
}

/** Un nom de séance mis au propre (comme celui d'une page : les blancs
 *  réunis, 60 caractères au plus) ; null : pas de nom */
export function nomDeSeance(nom: string | null | undefined): string | null {
  if (typeof nom !== 'string') return null
  const n = nom.replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim()
  const court = [...n].slice(0, LONGUEUR_NOM_SEANCE).join('').trimEnd()
  return court || null
}

// ---------- Les mots des dates ----------
const JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi']
const JOURS_COURTS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam']
const MOIS_COURTS = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc']
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** « 14h », « 8h05 » */
export function heureCourte(t: number): string {
  const d = new Date(t)
  return `${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`
}
/** « 14 h », « 8 h 05 » (dans une phrase) */
export function heureDite(t: number): string {
  const d = new Date(t)
  return `${d.getHours()} h${d.getMinutes() ? ' ' + String(d.getMinutes()).padStart(2, '0') : ''}`
}
/** « mar 14 oct 14h » : le compteur, la trieuse */
export function dateCourte(t: number): string {
  const d = new Date(t)
  return `${JOURS_COURTS[d.getDay()]} ${d.getDate()} ${MOIS_COURTS[d.getMonth()]} ${heureCourte(t)}`
}
/** « Lun 13 oct 8h » : en tête de ligne */
export function dateCourteMajuscule(t: number): string {
  const s = dateCourte(t)
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const memeJour = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString()

/** Quand, dit dans une phrase, par rapport à maintenant : « 14 h » (le même
 *  jour), « lundi 8 h » (dans la semaine), « lundi 13 octobre » au-delà */
export function quandDit(t: number, maintenant: number): string {
  if (memeJour(t, maintenant)) return heureDite(t)
  const d = new Date(t)
  if (maintenant - t < 6 * 24 * UNE_HEURE && t <= maintenant) return `${JOURS[d.getDay()]} ${heureDite(t)}`
  return `${JOURS[d.getDay()]} ${d.getDate()} ${MOIS[d.getMonth()]}`
}

/** Le nom d'une séance tel qu'on le lit : son nom, sinon « Séance du mar 14 oct 14h » */
export function libelleSeance(s: { debut: number; nom: string | null }): string {
  return s.nom ?? `Séance du ${dateCourte(s.debut)}`
}

/** Une séance dite dans une phrase (« la séance de lundi », « vous la
 *  regardez ») : « de lundi » (dans la semaine), « de 8 h » (aujourd'hui),
 *  « du 13 octobre » (plus ancienne) ; son nom entre guillemets si elle en a
 *  un. avecHeure : « de lundi 8 h ». */
export function deLaSeance(s: { debut: number; nom: string | null }, maintenant: number, avecHeure = false): string {
  if (s.nom) return `« ${s.nom} »`
  const d = new Date(s.debut)
  if (memeJour(s.debut, maintenant)) return `de ${heureDite(s.debut)}`
  if (maintenant - s.debut < 6 * 24 * UNE_HEURE && s.debut <= maintenant) return `de ${JOURS[d.getDay()]}${avecHeure ? ' ' + heureDite(s.debut) : ''}`
  return `du ${d.getDate()} ${MOIS[d.getMonth()]}`
}

/** « Lundi 8 h », « 14 h », « Lundi 13 octobre » : en tête de phrase */
export function quandMajuscule(t: number, maintenant: number): string {
  const q = quandDit(t, maintenant)
  return q.charAt(0).toUpperCase() + q.slice(1)
}

// ---------- La migration des classeurs d'avant le lot 6 ----------
/** Ce qu'il faut écrire pour ranger en séances un classeur d'avant le lot 6
 *  (aucune séance, des pages) : les séances que repérait le découpage d'avant
 *  (seancesDuFilm : un silence de plus de 20 minutes, ou un autre jour, en
 *  commence une autre) deviennent des séances nommées par leur date (pas de
 *  nom : leur libellé est leur date), et chaque page va dans la séance où
 *  elle est NÉE : la dernière séance repérée qui commence (sa première étape,
 *  la naissance d'une page qui précède son premier geste comprise) avant la
 *  première étape du film notée sur la page, ou la première séance si elle
 *  est née avant toutes. Une page dont le film ne dit rien (un tableau très
 *  ancien) n'est rangée nulle part : elle suit sa voisine (voir
 *  rangerLesPages). Un classeur sans aucun geste (un classeur neuf, des
 *  pages vides) a une seule séance, de la première étape de son film.
 *  Le début de chaque séance est l'heure de son premier geste, comme avant :
 *  Publier retrouve le lien d'une séance déjà publiée (sa clé est ce début).
 *  depuis : l'heure de sa première étape (la naissance d'une page juste
 *  avant le premier geste). Les identifiants sont tirés de ces heures : deux
 *  onglets qui rangent le même classeur au même moment écrivent la même
 *  chose. */
export function migration(
  film: readonly { t: number; page: string }[],
  decoupage: readonly { de: number; debut: number }[],
  pages: Iterable<string>,
  maintenant: number,
): { seances: [string, FicheSeance][]; seanceDe: [string, string][] } {
  const asc = [...decoupage].sort((a, b) => a.debut - b.debut)
  const seances: [string, FicheSeance][] = []
  const debuts: number[] = []
  if (!asc.length) {
    const t = film.length ? film[0].t : maintenant
    seances.push([`ancienne-${t}`, { debut: t, ancienne: true }])
    debuts.push(-1)
  } else {
    for (const s of asc) {
      const depuis = film[s.de]?.t ?? s.debut
      const fiche: FicheSeance = { debut: s.debut, ancienne: true }
      if (depuis !== s.debut) fiche.depuis = depuis
      seances.push([`ancienne-${s.debut}`, fiche])
      debuts.push(s.de)
    }
  }
  const naissances = new Map<string, number>()
  film.forEach((e, i) => { if (e.page && !naissances.has(e.page)) naissances.set(e.page, i) })
  const seanceDe: [string, string][] = []
  const pleines = new Set<string>()
  const toutes = [...pages]
  for (const p of toutes) {
    const b = naissances.get(p)
    if (b === undefined) continue
    let k = 0
    for (let j = 0; j < debuts.length; j++) if (debuts[j] <= b) k = j
    seanceDe.push([p, seances[k][0]])
    pleines.add(seances[k][0])
  }
  // Une séance repérée où aucune page n'est née (on a continué, le
  // lendemain, les pages de la veille) n'a pas de pages : elle ne devient
  // pas une séance. Sa plage du film va à la séance d'avant (voir
  // exporter.seancesExplicitesDuFilm), qui la publie avec elle (les pages
  // où l'on a écrit pendant une séance reprise du découpage d'avant sont
  // proposées : voir pagesAPublier). Il en reste toujours au moins une.
  const gardees = seances.filter(([id]) => pleines.has(id))
  return { seances: gardees.length ? gardees : seances.slice(-1), seanceDe }
}
