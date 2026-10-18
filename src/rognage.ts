// =============================================================
// ROGNER UNE IMAGE (retouches après le lot 5) : LE CALCUL
// Ne garder qu'une partie d'une image importée (la photo d'un énoncé, prise
// avec le bureau autour). « Rogner », dans la barre d'actions d'une image
// seule et dans son menu ⋯, montre l'image entière, la partie gardée claire
// et le reste assombri, avec huit poignées : quatre coins, quatre côtés. On
// les tire, on peut aussi glisser la partie gardée ; Entrée, « Terminer » ou
// un clic à côté de l'image rogne, Échap annule.
// La partie gardée se compte dans le repère de l'image (u le long de son
// bord du haut, v le long de son bord de gauche, de 0 à l et à h) : elle
// tourne et se déforme avec elle. Rogner, c'est une image neuve, faite des
// seuls pixels gardés, posée exactement là où ils étaient (sa matrice ne
// change pas, son coin passe au coin de la partie gardée) : la version
// d'avant, le replay et la copie la voient comme une image ordinaire, et
// Ctrl + Z rend l'image entière (l'ancienne reste dans la banque). Tout est
// pur ici (aucun DOM) : il se teste sous Node ; l'App câble les gestes, le
// rendu peint.
// =============================================================
import type { P } from './formes'
import type { ImageForme } from './types'

/** La partie gardée, dans le repère de l'image (u0 < u1 dans [0, l], v0 < v1 dans [0, h]) */
export interface PartieGardee { u0: number; v0: number; u1: number; v1: number }

/** Ce qu'on tient pendant qu'on rogne : un coin (0 haut-gauche, 1 haut-droit,
 *  2 bas-droit, 3 bas-gauche), un côté (0 haut, 1 droite, 2 bas, 3 gauche)
 *  ou la partie gardée entière, qu'on glisse */
export type PriseRognage = { quoi: 'coin' | 'cote'; i: number } | { quoi: 'dedans' }

/** Le plus petit côté gardé, en pixels de l'image */
export const COTE_GARDE_MIN = 8

/** Un point du monde dans le repère de l'image (null : une image écrasée) */
export function versImage(f: Pick<ImageForme, 'x' | 'y' | 'm'>, p: P): P | null {
  const [a, b, c, d] = f.m, det = a * d - b * c
  if (!Number.isFinite(det) || Math.abs(det) < 1e-12) return null
  const x = p.x - f.x, y = p.y - f.y
  return { x: (d * x - c * y) / det, y: (-b * x + a * y) / det }
}

/** Un point du repère de l'image dans le monde */
export function versMonde(f: Pick<ImageForme, 'x' | 'y' | 'm'>, u: number, v: number): P {
  const [a, b, c, d] = f.m
  return { x: f.x + a * u + c * v, y: f.y + b * u + d * v }
}

/** Les quatre coins de la partie gardée dans le monde (haut-gauche,
 *  haut-droit, bas-droit, bas-gauche de l'image) */
export function coinsGardes(f: Pick<ImageForme, 'x' | 'y' | 'm'>, r: PartieGardee): P[] {
  return [versMonde(f, r.u0, r.v0), versMonde(f, r.u1, r.v0), versMonde(f, r.u1, r.v1), versMonde(f, r.u0, r.v1)]
}

/** Toute l'image : rien n'est encore rogné */
export function toute(f: Pick<ImageForme, 'l' | 'h'>): PartieGardee {
  return { u0: 0, v0: 0, u1: f.l, v1: f.h }
}

/**
 * Ce que prend un appui en s (px d'écran) pendant qu'on rogne : la poignée la
 * plus proche à `portee` px (un coin d'abord à égalité, puis un côté), sinon
 * la partie gardée si l'appui est dedans, sinon null (à côté : on a fini).
 * ecran : du monde à l'écran.
 */
export function priseRognage(f: Pick<ImageForme, 'x' | 'y' | 'm'>, r: PartieGardee, s: P, ecran: (p: P) => P, portee: number): PriseRognage | null {
  const c = coinsGardes(f, r).map(ecran)
  let mieux: PriseRognage | null = null, dmin = Infinity
  const essayer = (p: P, prise: PriseRognage) => {
    const d = Math.hypot(p.x - s.x, p.y - s.y)
    if (d <= portee && d < dmin - 1e-9) { dmin = d; mieux = prise }
  }
  c.forEach((p, i) => essayer(p, { quoi: 'coin', i }))
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4]
    essayer({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, { quoi: 'cote', i })
  }
  if (mieux) return mieux
  // Dedans : le point est du même côté de chacun des quatre bords
  let signe = 0
  for (let i = 0; i < 4; i++) {
    const a = c[i], b = c[(i + 1) % 4]
    const v = (b.x - a.x) * (s.y - a.y) - (b.y - a.y) * (s.x - a.x)
    if (Math.abs(v) < 1e-9) continue
    if (signe === 0) signe = Math.sign(v)
    else if (Math.sign(v) !== signe) return null
  }
  return { quoi: 'dedans' }
}

/**
 * La partie gardée quand on a tiré la prise de (du, dv), dans le repère de
 * l'image, depuis `depart` : un coin bouge ses deux bords, un côté le sien,
 * « dedans » glisse le tout. Jamais hors de l'image, jamais plus petite que
 * COTE_GARDE_MIN (ni que l'image, si elle est plus petite), toujours au
 * pixel près.
 */
export function tirerPartie(depart: PartieGardee, prise: PriseRognage, du: number, dv: number, f: Pick<ImageForme, 'l' | 'h'>): PartieGardee {
  const min = Math.min(COTE_GARDE_MIN, f.l, f.h)
  const borne = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
  let { u0, v0, u1, v1 } = depart
  if (prise.quoi === 'dedans') {
    const lu = u1 - u0, lv = v1 - v0
    u0 = borne(Math.round(u0 + du), 0, f.l - lu); v0 = borne(Math.round(v0 + dv), 0, f.h - lv)
    return { u0, v0, u1: u0 + lu, v1: v0 + lv }
  }
  // Les bords que bouge la prise : gauche, haut, droite, bas
  const coin = prise.quoi === 'coin'
  const gauche = coin ? prise.i === 0 || prise.i === 3 : prise.i === 3
  const droite = coin ? prise.i === 1 || prise.i === 2 : prise.i === 1
  const haut = coin ? prise.i === 0 || prise.i === 1 : prise.i === 0
  const bas = coin ? prise.i === 2 || prise.i === 3 : prise.i === 2
  if (gauche) u0 = borne(Math.round(u0 + du), 0, u1 - min)
  if (droite) u1 = borne(Math.round(u1 + du), u0 + min, f.l)
  if (haut) v0 = borne(Math.round(v0 + dv), 0, v1 - min)
  if (bas) v1 = borne(Math.round(v1 + dv), v0 + min, f.h)
  return { u0, v0, u1, v1 }
}

/** La partie gardée est-elle toute l'image (rien à rogner) ? */
export function rienARogner(f: Pick<ImageForme, 'l' | 'h'>, r: PartieGardee): boolean {
  return r.u0 <= 0 && r.v0 <= 0 && r.u1 >= f.l && r.v1 >= f.h
}

/**
 * L'image rognée : sa nouvelle place (le coin de la partie gardée), sa taille
 * (celle de la partie gardée), sa matrice inchangée ; src : celle des pixels
 * gardés. Les pixels de la source : px × py par unité de l'image (une image
 * plus fine que sa taille affichée, ou plus grosse). decoupe : le rectangle
 * à prendre dans la source, en pixels entiers, au moins 1 × 1.
 */
export function imageRognee(f: ImageForme, r: PartieGardee, src: string, px = 1, py = px):
  { patch: Pick<ImageForme, 'x' | 'y' | 'l' | 'h' | 'src'>; decoupe: { x: number; y: number; l: number; h: number } } {
  const o = versMonde(f, r.u0, r.v0)
  const x = Math.round(r.u0 * px), y = Math.round(r.v0 * py)
  const decoupe = { x, y, l: Math.max(1, Math.round(r.u1 * px) - x), h: Math.max(1, Math.round(r.v1 * py) - y) }
  return { patch: { x: o.x, y: o.y, l: r.u1 - r.u0, h: r.v1 - r.v0, src }, decoupe }
}

/** Le curseur au survol pendant qu'on rogne : la double flèche d'un coin
 *  (selon sa diagonale) ou d'un côté (selon son axe), tournée avec l'image ;
 *  « move » dans la partie gardée ; la flèche ordinaire à côté (un clic y
 *  finit). coins : ceux de la partie gardée (voir coinsGardes). */
export function curseurRognage(prise: PriseRognage | null, coins: P[]): string {
  if (!prise) return 'default'
  if (prise.quoi === 'dedans') return 'move'
  const centre = { x: (coins[0].x + coins[2].x) / 2, y: (coins[0].y + coins[2].y) / 2 }
  const q = prise.quoi === 'coin' ? coins[prise.i]
    : { x: (coins[prise.i].x + coins[(prise.i + 1) % 4].x) / 2, y: (coins[prise.i].y + coins[(prise.i + 1) % 4].y) / 2 }
  const a = ((Math.atan2(q.y - centre.y, q.x - centre.x) * 180 / Math.PI) % 180 + 180) % 180
  if (prise.quoi === 'coin') return a < 90 ? 'nwse-resize' : 'nesw-resize'
  return a >= 45 && a < 135 ? 'ns-resize' : 'ew-resize'
}
