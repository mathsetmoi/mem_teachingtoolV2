import type { Forme } from './types'

export function distanceAuSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax, vy = by - ay
  const l2 = vx * vx + vy * vy
  let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

type Boite = { x: number; y: number; l: number; h: number }

/** La forme passe-t-elle à moins de r du point (x, y) ? */
export function touche(f: Forme, x: number, y: number, r: number, boite: (f: Forme) => Boite): boolean {
  const b = boite(f)
  if (x < b.x - r || x > b.x + b.l + r || y < b.y - r || y > b.y + b.h + r) return false
  if (f.type === 'formule') return true
  if (f.type === 'segment') return distanceAuSegment(x, y, f.x, f.y, f.x + f.dx, f.y + f.dy) <= r + f.taille / 2
  if (f.type === 'cercle') {
    const d = Math.hypot(x - f.x, y - f.y)
    if (f.arc && !dansLArc(Math.atan2(y - f.y, x - f.x), f.arc)) return false
    return Math.abs(d - f.r) <= r + f.taille / 2 || (!f.arc && !!f.fond && d <= f.r)
  }
  if (f.type === 'polygone') {
    const q = f.pts, n = q.length / 2, lx = x - f.x, ly = y - f.y
    if (n === 1) return Math.hypot(lx - q[0], ly - q[1]) <= r + 6         // un point seul
    const fin = f.ferme ? n : n - 1
    for (let i = 0; i < fin; i++) {
      const j = (i + 1) % n
      if (distanceAuSegment(lx, ly, q[2 * i], q[2 * i + 1], q[2 * j], q[2 * j + 1]) <= r + f.taille / 2) return true
    }
    return !!f.fond && f.ferme && dedans(lx, ly, q)
  }
  const lx = x - f.x, ly = y - f.y, seuil = r + f.taille / 2
  const p = f.pts
  if (p.length === 3) return Math.hypot(lx - p[0], ly - p[1]) <= seuil
  for (let i = 0; i + 5 < p.length; i += 3) {
    if (distanceAuSegment(lx, ly, p[i], p[i + 1], p[i + 3], p[i + 4]) <= seuil) return true
  }
  return false
}

export function chevauche(a: Boite, b: Boite) {
  return a.x < b.x + b.l && a.x + a.l > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

/** Rectangle normalisé à partir de deux coins */
export function rectangle(x1: number, y1: number, x2: number, y2: number): Boite {
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), l: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }
}

/** Le point est-il dans le polygone ? (règle pair-impair) */
export function dedans(x: number, y: number, q: number[]) {
  let oui = false
  for (let i = 0, j = q.length / 2 - 1; i < q.length / 2; j = i++) {
    const xi = q[2 * i], yi = q[2 * i + 1], xj = q[2 * j], yj = q[2 * j + 1]
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) oui = !oui
  }
  return oui
}

/** L'angle a tombe-t-il dans l'arc parcouru de a0 à a1 ? */
export function dansLArc(a: number, arc: { a0: number; a1: number }) {
  const lo = Math.min(arc.a0, arc.a1), hi = Math.max(arc.a0, arc.a1)
  const t = ((a - lo) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI)
  return t <= hi - lo
}
