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
