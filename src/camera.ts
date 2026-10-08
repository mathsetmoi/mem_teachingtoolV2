// écran = monde × z + (x, y)
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 20

export class Camera {
  x = 0
  y = 0
  z = 1

  versMonde(sx: number, sy: number) { return { x: (sx - this.x) / this.z, y: (sy - this.y) / this.z } }
  versEcran(wx: number, wy: number) { return { x: wx * this.z + this.x, y: wy * this.z + this.y } }

  /** Zoome en gardant sous le doigt le point du tableau qui y était. */
  zoomerAutour(sx: number, sy: number, facteur: number) {
    const avant = this.versMonde(sx, sy)
    this.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.z * facteur))
    this.x = sx - avant.x * this.z
    this.y = sy - avant.y * this.z
  }

  deplacer(dx: number, dy: number) { this.x += dx; this.y += dy }

  /** Zone du monde visible dans un écran l × h */
  visible(l: number, h: number) {
    const a = this.versMonde(0, 0)
    return { x: a.x, y: a.y, l: l / this.z, h: h / this.z }
  }

  /** Cadre une zone du monde (centre + dimensions) dans l'écran. */
  cadrer(cx: number, cy: number, lm: number, hm: number, l: number, h: number) {
    this.z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min(l / lm, h / hm)))
    this.x = l / 2 - cx * this.z
    this.y = h / 2 - cy * this.z
  }

  copie() { const c = new Camera(); c.x = this.x; c.y = this.y; c.z = this.z; return c }
}

/** La caméra qui montre la boîte b (monde) entière dans le rectangle r de
 *  l'écran, centrée, avec une marge, sans dépasser le zoom zMax : un petit
 *  contenu reste à ce zoom et se centre. Une boîte plate (un seul point, un
 *  trait horizontal) ne compte que dans l'autre sens, ou pas du tout. */
export function vuePour(b: { x: number; y: number; l: number; h: number }, r: { x: number; y: number; l: number; h: number },
  zMax: number, marge = 32): { x: number; y: number; z: number } {
  const haut = Math.min(zMax, ZOOM_MAX)
  const zl = b.l > 0 ? (r.l - 2 * marge) / b.l : Infinity
  const zh = b.h > 0 ? (r.h - 2 * marge) / b.h : Infinity
  const z = Math.max(ZOOM_MIN, Math.min(haut, zl, zh))
  return { x: r.x + r.l / 2 - (b.x + b.l / 2) * z, y: r.y + r.h / 2 - (b.y + b.h / 2) * z, z }
}

/** Un rectangle de l'écran par ses bords */
export interface Bords { left: number; top: number; right: number; bottom: number }

/** Ce qu'on voit du tableau entre les barres, dans une zone l × h (les barres
 *  en coordonnées de la zone, null quand elles sont cachées) : à gauche celle
 *  des outils, en haut celle du haut, dans le coin en bas à droite celle du
 *  zoom. C'est là que « Tout voir » cadre la page. Par ordre de préférence :
 *  - entre les trois barres (un ordinateur, une tablette) ;
 *  - à côté de la barre du zoom, jusqu'en bas : sur un téléphone en paysage,
 *    la bande au-dessus d'elle est trop basse, mais elle ne tient qu'un coin ;
 *  - sous la barre du haut, jusqu'en bas (le coin du zoom couvre alors un
 *    peu du contenu, jamais son haut) ;
 *  - en dernier recours, toute la zone avec une marge, dans la seule
 *    dimension où il ne reste presque rien. */
export function zoneEntreBarres(l: number, h: number, b: { outils: Bords | null; haut: Bords | null; zoom: Bords | null }) {
  const MIN = 200
  const x = (b.outils ? b.outils.right : 0) + 16, y = (b.haut ? b.haut.bottom : 0) + 12
  const droite = l - 16, bas = h - 12
  const candidats = [{ x, y, l: droite - x, h: (b.zoom ? b.zoom.top : h) - 12 - y }]
  if (b.zoom) candidats.push({ x, y, l: b.zoom.left - 12 - x, h: bas - y })
  for (const c of candidats) if (c.l >= MIN && c.h >= MIN) return c
  const large = droite - x >= MIN, haut = bas - y >= 120
  return {
    x: large ? x : 16, l: large ? droite - x : Math.max(0, l - 32),
    y: haut ? y : 16, h: haut ? bas - y : Math.max(0, h - 32),
  }
}
