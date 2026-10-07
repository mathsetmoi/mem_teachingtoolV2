// =============================================================
// LE TRACÉ À MAIN LEVÉE, AU RYTHME DE LA MAIN
// Au tableau, chaque point d'un trait arrive à son heure : la main
// accélère dans les droites, ralentit dans les boucles, marque un temps
// au rebroussement, puis se lève avant la lettre suivante. Le film note
// ce rythme point par point, pour que le replay forme les lettres comme
// elles se sont formées en direct.
//
// Le format : pour un trait de n points, n entiers « ms ». ms[i] est le
// temps (en ms) que la plume a passé sur le point i avant d'atteindre le
// suivant ; pour le dernier, avant le lever du stylo (ou l'arrêt qui
// finit le trait). Leur somme est la durée du tracé, du poser au lever :
// l'étape du film étant prise au lever, le poser s'en déduit, et avec lui
// le vrai temps stylo levé entre deux traits. Ce sont de petits entiers
// (un à trois chiffres de 60 à 240 Hz), bornés, qui se compressent bien.
//
// Ce temps est noté dans l'ÉTAPE du film qui pose le trait, pas dans le
// trait : un trait recopié par symétrie, rendu par Ctrl+Z ou déplacé n'a
// pas été tracé à ce moment-là, il n'a donc pas de rythme à rejouer (il
// paraît comme avant). Un film sans ces temps se rejoue comme avant.
// Tout est pur : rien ici ne dessine ni n'écrit.
// =============================================================
import type { TraitDirect } from '../rendu'
import type { Trait } from '../types'
import { COUDE, tasser } from './rythme'

/** Le plus long temps noté sur un point (ms) : au-delà, on note cette valeur.
 *  Une minute stylo posé sans bouger : rien de réel ne s'en approche. */
export const MS_MAX = 60_000

/** Les temps d'un trait. `instants` : l'heure de chacun de ses points, `fin` :
 *  celle du lever, sur la même horloge (ms). On arrondit les heures depuis le
 *  premier point, pas les écarts : aucune erreur ne s'accumule le long du trait. */
export function tempsDesPoints(instants: readonly number[], fin: number): number[] {
  const n = instants.length, t0 = instants[0]
  const r: number[] = []
  let avant = 0
  for (let i = 1; i <= n; i++) {
    const t = Math.round((i < n ? instants[i] : fin) - t0)
    // Une heure inconnue ou qui recule (deux horloges) ne vaut rien : 0
    const ecart = Number.isFinite(t) ? t - avant : 0
    r.push(Math.max(0, Math.min(MS_MAX, ecart)))
    if (Number.isFinite(t)) avant = Math.max(avant, t)
  }
  return r
}

/** Les temps tels qu'on les relit : des entiers de 0 à MS_MAX, un par point
 *  (n : le nombre de points du trait, s'il est connu). null : rien d'utilisable. */
export function lireTemps(ms: unknown, n?: number): number[] | null {
  if (!Array.isArray(ms) || !ms.length || (n !== undefined && ms.length !== n)) return null
  for (const v of ms) if (!Number.isInteger(v) || v < 0 || v > MS_MAX) return null
  return ms as number[]
}

/** Un temps passé sur un point, tel qu'on le montre : un long arrêt stylo
 *  posé (une explication, le surligneur tenu sur un mot) est tassé comme un
 *  silence ; le reste est gardé tel quel */
const montre = (ms: number) => ms <= COUDE ? ms : tasser(ms)

/** Les deux durées d'un tracé (ms) : `vecue`, du poser au lever, et `duree`,
 *  celle qu'on montre à l'allure Normale (longs arrêts tassés). null : pas de temps. */
export function dureesDuTrace(ms: unknown): { vecue: number; duree: number } | null {
  const t = lireTemps(ms)
  if (!t) return null
  let vecue = 0, duree = 0
  for (const v of t) { vecue += v; duree += montre(v) }
  return { vecue, duree }
}

/** Un trait prêt à se retracer au rythme de la main */
export interface Main {
  trait: Trait
  /** L'instant où paraît chaque point, depuis le poser (ms, à l'allure Normale) */
  instants: number[]
  /** La durée montrée du tracé, du poser au lever (ms, à l'allure Normale) */
  duree: number
  /** La durée vécue, du poser au lever (ms) : ôtée de l'écart entre deux
   *  étapes, elle donne le temps stylo levé avant le trait */
  vecue: number
}

/** Le trait et ses temps, s'ils vont ensemble (null : il paraîtra comme avant) */
export function main(trait: Trait, ms: unknown): Main | null {
  if (!trait || trait.type !== 'trait' || !Array.isArray(trait.pts)) return null
  const t = lireTemps(ms, Math.floor(trait.pts.length / 3))
  if (!t) return null
  const instants: number[] = []
  let duree = 0, vecue = 0
  for (const v of t) { instants.push(duree); duree += montre(v); vecue += v }
  return { trait, instants, duree, vecue }
}

/** L'attente montrée avant un trait tracé à la main : le temps stylo levé
 *  (l'écart entre les deux étapes, moins le tracé), tassé s'il est long.
 *  Pas de plancher : la main qui se relève aussitôt se relève aussitôt. */
export function leve(dt: number, m: { vecue: number }): number {
  return tasser(dt - m.vecue, 0)
}

/** Combien de points la main a posés à l'instant `tau` du tracé (ms depuis
 *  le poser, à l'allure Normale) : tous ceux qui sont arrivés, aucun d'avance,
 *  aucun inventé entre deux */
export function pointsPoses(m: Main, tau: number): number {
  const t = m.instants
  if (!(tau >= 0)) return Math.min(1, t.length)
  let bas = 0, haut = t.length - 1, r = 0
  while (bas <= haut) {
    const k = (bas + haut) >> 1
    if (t[k] <= tau) { r = k; bas = k + 1 } else haut = k - 1
  }
  return r + 1
}

/** Le trait tel qu'il est pendant qu'on l'écrit, ses n premiers points :
 *  exactement ce que la couche « direct » montre sous le stylo au tableau
 *  (mêmes points, mêmes pressions, en coordonnées du monde) */
export function traitEnCours(m: Main, n: number): TraitDirect {
  const t = m.trait
  n = Math.max(0, Math.min(n, Math.floor(t.pts.length / 3)))
  const pts = new Array<number>(3 * n)
  for (let i = 0; i < n; i++) {
    pts[3 * i] = t.x + t.pts[3 * i]
    pts[3 * i + 1] = t.y + t.pts[3 * i + 1]
    pts[3 * i + 2] = t.pts[3 * i + 2]
  }
  return { pts, couleur: t.couleur, taille: t.taille, opacite: t.opacite, pression: t.pression }
}
