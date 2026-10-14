// =============================================================
// VERROUILLER ET FIXER EN FOND : CE QUE LES COMMANDES ÉCRIVENT
// Deux façons de protéger ce qui est sur une page (lot 5) :
// - VERROUILLER (tout objet) : il ne bouge plus et ne se prend plus, ni
//   au clic, ni au cadre, ni au lasso, ni à la gomme, ni à Ctrl + A ;
//   seul son menu court s'ouvre encore (clic droit, bouton du stylet,
//   appui long), pour le déverrouiller ;
// - FIXER EN FOND (une image seulement : un énoncé importé) : elle passe
//   sous tout le reste et ne se prend plus du tout, pas même au clic
//   droit ; on écrit et on entoure par-dessus, la gomme ne l'efface pas,
//   et c'est le menu de la page qui la détache, la copie ou l'envoie.
// Ce fichier calcule ce que chaque commande change (Tableau.modifier
// l'écrit en UNE transaction : un Ctrl + Z, une étape du film), ce qui bouge
// avec ce qu'on pousse, et ce que dit un collage qui a posé de quoi ne pas
// se prendre. L'application (app.ts) l'écrit, les menus (ui.ts) le
// proposent. Rien ici ne touche au DOM : le calcul se vérifie sous Node.
// L'invariant du fond (D25) : sur une page, toute image fixée a un z plus
// petit que toute image qui ne l'est pas. Le lot 5 peint par calques et
// n'en dépend pas ; mais la version d'avant (fdf3f72), son lecteur déjà en
// cache chez les élèves et son export PDF ne rangent les images que par z :
// sans lui, une image libre passerait chez eux sous l'énoncé fixé.
// =============================================================
import { dansImage } from './geometrie'
import type { Forme, ImageForme } from './types'
import { libre } from './types'

/** Ce qu'une commande change à une forme (voir Tableau.modifier : une clé
 *  qui vaut undefined quitte la forme) */
export type Changement = { id: string; patch: Partial<Forme> }

const parZ = (a: Forme, b: Forme) => a.z - b.z

/** Verrouiller (oui) ou déverrouiller ces formes : seulement celles dont
 *  l'état change. Jamais une image fixée en fond : c'est le décor, il n'a
 *  pas de verrou (le menu de la page la détache). Déverrouiller retire la
 *  clé (verrou: undefined) : un objet libre est comme avant le lot 5. */
export function changementsVerrou(formes: readonly Forme[], ids: Iterable<string>, oui: boolean): Changement[] {
  const veut = new Set(ids)
  return formes.filter(f => veut.has(f.id) && !f.fixe && !!f.verrou !== oui)
    .map(f => ({ id: f.id, patch: { verrou: oui ? true : undefined } }))
}

/** Fixer en fond ces images de la page (`formes` : toute la page) : chacune
 *  devient fixe, perd son verrou (le décor n'en a pas besoin) et son groupe
 *  (une image fixée sort de son groupe), et passe sous TOUT ce qui est sur
 *  la page, dans l'ordre qu'elles avaient entre elles : la k-ième (par z) des
 *  n prend le plus petit z de la page − (n − k). Une image déjà fixée, ou
 *  ce qui n'est pas une image, ne change pas. */
export function changementsFixer(formes: readonly Forme[], ids: Iterable<string>): Changement[] {
  const veut = new Set(ids)
  const images = formes.filter(f => f.type === 'image' && !f.fixe && veut.has(f.id)).sort(parZ)
  if (!images.length) return []
  let min = Infinity
  for (const f of formes) if (f.z < min) min = f.z
  const n = images.length
  return images.map((f, k) => ({ id: f.id, patch: { fixe: true, verrou: undefined, groupe: undefined, z: min - (n - k) } }))
}

/** Détacher du fond ces images fixées : elles ne sont plus fixes. S'il en
 *  reste d'autres sur la page de z plus grand que l'une d'elles (plusieurs
 *  images fixées), l'invariant du fond casserait (une image libre sous une
 *  image fixée) : celles qu'on détache prennent alors, dans leur ordre, des
 *  z neufs strictement entre le plus grand z des images qui restent fixées
 *  et le plus petit z des images libres (ou le plus grand + 1, + 2… s'il n'y
 *  en a pas) : elles deviennent les plus basses des images libres. Sinon
 *  chacune garde son z, déjà au-dessus de toute image restée fixée et sous
 *  toute image libre. Un fichier qui a perdu l'invariant (repassé par la
 *  version d'avant) n'a pas d'écart entre les deux : elles passent juste
 *  au-dessus des images restées fixées. */
export function changementsDetacher(formes: readonly Forme[], ids: Iterable<string>): Changement[] {
  const veut = new Set(ids)
  const partent = formes.filter(f => f.type === 'image' && f.fixe && veut.has(f.id)).sort(parZ)
  if (!partent.length) return []
  let haut = -Infinity, bas = Infinity
  for (const f of formes) {
    if (f.type !== 'image' || veut.has(f.id)) continue
    if (f.fixe) haut = Math.max(haut, f.z)
    else bas = Math.min(bas, f.z)
  }
  if (partent.every(f => f.z > haut)) return partent.map(f => ({ id: f.id, patch: { fixe: undefined } }))
  const n = partent.length
  let zs = Number.isFinite(bas) && bas > haut ? partent.map((_, k) => haut + (bas - haut) * (k + 1) / (n + 1)) : null
  // Des z trop proches pour se distinguer (les nombres à virgule ont une fin)
  if (zs && !zs.every((z, k) => z > (k ? zs![k - 1] : haut) && z < bas)) zs = null
  zs ??= partent.map((_, k) => haut + k + 1)
  return partent.map((f, k) => ({ id: f.id, patch: { fixe: undefined, z: zs![k] } }))
}

/** L'invariant du fond tient-il sur cette page ? (toute image fixée sous
 *  toute image libre, par z) */
export function fondEnOrdre(formes: readonly Forme[]): boolean {
  let haut = -Infinity, bas = Infinity
  for (const f of formes) {
    if (f.type !== 'image') continue
    if (f.fixe) haut = Math.max(haut, f.z)
    else bas = Math.min(bas, f.z)
  }
  return haut < bas
}

/** Ce qui bouge quand on pousse (les flèches) ou qu'on glisse la
 *  sélection : ce qui y est libre, ET les points repérés sur une image qui
 *  bouge, quel que soit leur verrou (un point qui resterait derrière ne
 *  serait plus sur ce qu'il marque ; c'est déjà ce que peint le glisser).
 *  Une forme verrouillée de la sélection (son menu ouvert) ne bouge pas. */
export function quiBouge(formes: readonly Forme[], selection: ReadonlySet<string>): Forme[] {
  const mobiles = new Set<string>()
  for (const f of formes) if (selection.has(f.id) && libre(f)) mobiles.add(f.id)
  if (!mobiles.size) return []
  return formes.filter(f => mobiles.has(f.id) || ((f.type === 'polygone' || f.type === 'cercle') && !!f.lie && mobiles.has(f.lie)))
}

/** Les images fixées en fond sous ce point du monde, la plus haute d'abord
 *  (`formes` dans l'ordre d'affichage, ou dans n'importe quel ordre : elles
 *  se rangent par z) */
export function fixesSous(formes: readonly Forme[], x: number, y: number): ImageForme[] {
  return formes.filter((f): f is ImageForme => f.type === 'image' && !!f.fixe && dansImage(f, x, y)).sort((a, b) => b.z - a.z)
}

/** Ce que dit un collage (ou une duplication) qui a posé de quoi ne pas se
 *  prendre : il n'est pas sélectionné, et sans ce message on croirait que
 *  rien n'a été collé. rappelVerrou, rappelFond : comment le déverrouiller,
 *  comment détacher l'image, dans les mots du pointeur (voir pointeurs.ts).
 *  null : tout ce qui est posé est libre (et sélectionné). */
export function texteCollage(posees: readonly Forme[], rappelVerrou: string, rappelFond: string): string | null {
  const non = posees.filter(f => !libre(f))
  if (!non.length) return null
  if (non.length === posees.length) {
    if (non.every(f => f.fixe)) return (non.length > 1 ? 'Images collées dans le fond. ' : 'Image collée dans le fond. ') + rappelFond
    if (non.every(f => !f.fixe)) return `Collé, verrouillé. ${rappelVerrou}`
  }
  return 'Collé ; ce qui est verrouillé ou fixé en fond n\'est pas sélectionné.'
}

/** Combien d'objets ces formes font aux yeux du professeur : un point
 *  repéré sur une image qui est aussi du nombre compte avec elle (verrouiller
 *  une image et ses deux points, c'est verrouiller un objet) */
export function compterObjets(formes: readonly Forme[]): number {
  const ids = new Set(formes.map(f => f.id))
  return formes.filter(f => !((f.type === 'polygone' || f.type === 'cercle') && f.lie && ids.has(f.lie))).length
}

/** « 1 objet verrouillé sur cette page », « 3 objets verrouillés… » */
export function accorder(n: number, singulier: string, pluriel: string): string {
  return n === 1 ? `1 ${singulier}` : `${n} ${pluriel}`
}

/** La première lettre en minuscule (un rappel après un deux-points) */
export function minuscule(s: string): string { return s.charAt(0).toLowerCase() + s.slice(1) }
