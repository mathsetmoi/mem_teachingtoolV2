import type { Forme } from './types'

export function distanceAuSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const vx = bx - ax, vy = by - ay
  const l2 = vx * vx + vy * vy
  let t = l2 ? ((px - ax) * vx + (py - ay) * vy) / l2 : 0
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy))
}

export type Boite = { x: number; y: number; l: number; h: number }

/** La forme passe-t-elle à moins de r du point (x, y) ? */
export function touche(f: Forme, x: number, y: number, r: number, boite: (f: Forme) => Boite): boolean {
  const b = boite(f)
  const infinie = f.type === 'polygone' && !!f.prolonge       // une droite dépasse son cadre
  if (!infinie && (x < b.x - r || x > b.x + b.l + r || y < b.y - r || y > b.y + b.h + r)) return false
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
    if (f.prolonge && n === 2) {
      // Distance à la droite (ou à la demi-droite)
      const ax = q[0], ay = q[1], vx = q[2] - ax, vy = q[3] - ay, l = Math.hypot(vx, vy) || 1
      const t = ((lx - ax) * vx + (ly - ay) * vy) / l
      if (f.prolonge === 'demi' && t < 0) return Math.hypot(lx - ax, ly - ay) <= r + f.taille / 2
      return Math.abs((lx - ax) * vy - (ly - ay) * vx) / l <= r + f.taille / 2
    }
    const fin = f.ferme ? n : n - 1
    for (let i = 0; i < fin; i++) {
      const j = (i + 1) % n
      if (distanceAuSegment(lx, ly, q[2 * i], q[2 * i + 1], q[2 * j], q[2 * j + 1]) <= r + f.taille / 2) return true
    }
    return !!f.fond && f.ferme && dedans(lx, ly, q)
  }
  if (f.type === 'image') return dansImage(f, x, y, r)
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

/** Les quatre coins d'une image, dans l'ordre (haut-gauche, haut-droit, bas-droit, bas-gauche de l'image) */
export function coinsImage(f: { x: number; y: number; l: number; h: number; m: [number, number, number, number] }) {
  const [a, b, c, d] = f.m
  const p = (u: number, v: number) => ({ x: f.x + a * u + c * v, y: f.y + b * u + d * v })
  return [p(0, 0), p(f.l, 0), p(f.l, f.h), p(0, f.h)]
}

/** Le point (x, y) est-il sur l'image, à `marge` près (unités monde) ? On le
 *  ramène dans le repère de l'image, qui peut être tournée ou retournée. */
export function dansImage(f: { x: number; y: number; l: number; h: number; m: [number, number, number, number] },
  x: number, y: number, marge = 0): boolean {
  const [a, b, c, d] = f.m, det = a * d - b * c
  if (Math.abs(det) < 1e-12) return false
  const dx = x - f.x, dy = y - f.y
  const u = (d * dx - c * dy) / det, v = (-b * dx + a * dy) / det
  const k = marge / Math.sqrt(Math.abs(det))
  return u >= -k && u <= f.l + k && v >= -k && v <= f.h + k
}

// ---------- Ce que vise la sélection ----------
// touche() dit seulement si une forme passe près d'un point (la gomme s'en
// sert). Pour prendre un objet, il faut savoir de combien on l'a manqué, et
// distinguer son tracé de son intérieur : un trait écrit dans un grand cadre
// doit se prendre avant le cadre, le bord le plus proche l'emportant. Les
// trois fonctions qui suivent le disent ; app.ts (cibleSous) choisit.

/** La distance (unités monde) du point (x, y) à ce qu'on voit du TRACÉ de la
 *  forme, épaisseur déduite (0 sur le trait lui-même). Un intérieur ne compte
 *  pas : une formule touchée dans sa boîte, une image, l'intérieur d'une
 *  figure coloriée sont des « pleins » (voir interieur) ; leur distance est
 *  Infinity, ou celle des côtés pour une figure. `boite` : la boîte de la
 *  forme (une formule se mesure à l'écran). */
export function distanceAuTrace(f: Forme, x: number, y: number, boite: Boite | null): number {
  const sans = (d: number, e: number) => Math.max(0, d - e)
  switch (f.type) {
    case 'formule': {
      if (!boite) return Infinity
      const dx = Math.max(boite.x - x, 0, x - (boite.x + boite.l)), dy = Math.max(boite.y - y, 0, y - (boite.y + boite.h))
      return dx === 0 && dy === 0 ? Infinity : Math.hypot(dx, dy)
    }
    case 'image': return Infinity
    case 'segment': return sans(distanceAuSegment(x, y, f.x, f.y, f.x + f.dx, f.y + f.dy), f.taille / 2)
    case 'cercle': {
      const a = Math.atan2(y - f.y, x - f.x)
      // Hors de l'arc, c'est l'un de ses deux bouts qui est le plus près
      if (f.arc && !dansLArc(a, f.arc)) {
        const bout = (t: number) => Math.hypot(x - f.x - f.r * Math.cos(t), y - f.y - f.r * Math.sin(t))
        return sans(Math.min(bout(f.arc.a0), bout(f.arc.a1)), f.taille / 2)
      }
      return sans(Math.abs(Math.hypot(x - f.x, y - f.y) - f.r), f.taille / 2)
    }
    case 'polygone': {
      const q = f.pts, n = q.length / 2, lx = x - f.x, ly = y - f.y
      if (n === 1) return sans(Math.hypot(lx - q[0], ly - q[1]), 6)          // un point seul, comme touche
      if (f.prolonge && n === 2) {
        // La droite (ou la demi-droite) : sur toute sa longueur
        const ax = q[0], ay = q[1], vx = q[2] - ax, vy = q[3] - ay, l = Math.hypot(vx, vy) || 1
        const t = ((lx - ax) * vx + (ly - ay) * vy) / l
        if (f.prolonge === 'demi' && t < 0) return sans(Math.hypot(lx - ax, ly - ay), f.taille / 2)
        return sans(Math.abs((lx - ax) * vy - (ly - ay) * vx) / l, f.taille / 2)
      }
      let d = Infinity
      const fin = f.ferme ? n : n - 1
      for (let i = 0; i < fin; i++) {
        const j = (i + 1) % n
        d = Math.min(d, distanceAuSegment(lx, ly, q[2 * i], q[2 * i + 1], q[2 * j], q[2 * j + 1]))
      }
      return sans(d, f.taille / 2)
    }
    case 'trait': {
      const p = f.pts, lx = x - f.x, ly = y - f.y
      if (p.length < 3) return Infinity
      let d = p.length === 3 ? Math.hypot(lx - p[0], ly - p[1]) : Infinity
      for (let i = 0; i + 5 < p.length; i += 3) d = Math.min(d, distanceAuSegment(lx, ly, p[i], p[i + 1], p[i + 3], p[i + 4]))
      return sans(d, f.taille / 2)
    }
  }
}

/** Le point (x, y) est-il DANS la forme ? 'plein' : une formule (sa boîte),
 *  une image, une figure fermée coloriée ; on la prend là, et elle cache ce
 *  qui est sous elle. 'nu' : une figure fermée sans fond (un polygone fermé
 *  d'au moins trois sommets, un cercle entier) ; l'outil Sélection la prend
 *  aussi par là, après les tracés proches. null : rien qui ait un dedans (un
 *  trait, même refermé, une ligne ouverte, une droite, un arc). */
export function interieur(f: Forme, x: number, y: number, boite: Boite | null): 'plein' | 'nu' | null {
  switch (f.type) {
    case 'formule':
      return boite && x >= boite.x && x <= boite.x + boite.l && y >= boite.y && y <= boite.y + boite.h ? 'plein' : null
    case 'image': return dansImage(f, x, y) ? 'plein' : null
    case 'polygone':
      if (!f.ferme || f.prolonge || f.pts.length < 6 || !dedans(x - f.x, y - f.y, f.pts)) return null
      return f.fond ? 'plein' : 'nu'
    case 'cercle':
      if (f.arc || Math.hypot(x - f.x, y - f.y) > f.r) return null
      return f.fond ? 'plein' : 'nu'
  }
  return null
}

/** L'aire de la forme (unités monde au carré) : entre deux intérieurs qui se
 *  recouvrent, le plus petit l'emporte (un triangle dessiné dans un grand
 *  rectangle se prend par son milieu). Sans dedans : l'aire de sa boîte. */
export function aireDe(f: Forme, boite: Boite | null): number {
  if (f.type === 'polygone') {
    const q = f.pts, n = q.length / 2
    let s = 0
    for (let i = 0, j = n - 1; i < n; j = i++) s += q[2 * j] * q[2 * i + 1] - q[2 * i] * q[2 * j + 1]
    return Math.abs(s) / 2
  }
  if (f.type === 'cercle') return Math.PI * f.r * f.r
  if (f.type === 'image') return Math.abs(f.m[0] * f.m[3] - f.m[1] * f.m[2]) * f.l * f.h
  return boite ? boite.l * boite.h : 0
}
