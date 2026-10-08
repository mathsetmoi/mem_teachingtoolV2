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

// ---------- Ce que prend un cadre ou un lasso ----------
// Une boîte qui touche le cadre ne suffit pas : un long trait en diagonale
// serait pris par un cadre posé dans un coin vide de sa boîte. Un objet est
// pris s'il est à plus de moitié dans la zone, mesuré sur ce qu'on en voit :
// la longueur de son tracé, ou la surface d'une image ou d'une formule.

/** Au plus autant de morceaux testés par trait : un trait de mille points ne
 *  coûte pas plus qu'un trait de soixante, et un lasso autour d'une page
 *  chargée se lâche sans attendre */
const MORCEAUX_PAR_TRAIT = 64

/** La part (de 0 à 1) de la forme qui est dans la zone. dansZone(x, y) dit si
 *  un point du monde y est (le cadre, ou le lasso par la règle pair-impair de
 *  dedans). Un tracé se mesure à sa longueur, chaque morceau testé en son
 *  milieu : les segments d'un trait (regroupés au-delà de 64), chaque côté
 *  d'un polygone ou d'un ancien segment coupé en 8, 48 points sur un cercle
 *  ou un arc. Un point seul y est ou n'y est pas. Une droite est infinie : on
 *  la prend si ses deux points de définition sont dedans. Une formule (dans sa
 *  boîte, `boite`, mesurée à l'écran) et une image (dans son parallélogramme)
 *  se mesurent à leur surface, sur une grille de 7 × 7. */
export function partDedans(f: Forme, dansZone: (x: number, y: number) => boolean, boite: Boite | null): number {
  // Des morceaux pesés : la somme des poids de ceux qui sont dedans, sur le total
  let dans = 0, total = 0
  const morceau = (x: number, y: number, poids: number) => { total += poids; if (dansZone(x, y)) dans += poids }
  /** Le côté (ax, ay)–(bx, by) coupé en k morceaux égaux */
  const cote = (ax: number, ay: number, bx: number, by: number, k: number) => {
    const l = Math.hypot(bx - ax, by - ay) / k
    for (let i = 0; i < k; i++) { const t = (i + 0.5) / k; morceau(ax + (bx - ax) * t, ay + (by - ay) * t, l) }
  }
  const part = () => (total > 0 ? dans / total : 0)
  const grille = (point: (u: number, v: number) => { x: number; y: number }) => {
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const p = point((i + 0.5) / 7, (j + 0.5) / 7); morceau(p.x, p.y, 1) }
    return part()
  }
  switch (f.type) {
    case 'trait': {
      const p = f.pts, n = p.length / 3
      if (n < 1) return 0
      const seul = () => (dansZone(f.x + p[0], f.y + p[1]) ? 1 : 0)
      if (n === 1) return seul()
      // Les segments consécutifs se regroupent par paquets de g : chaque paquet
      // pèse sa longueur et se teste au milieu de son segment du milieu
      const segs = n - 1, g = Math.ceil(segs / MORCEAUX_PAR_TRAIT)
      for (let k = 0; k < segs; k += g) {
        const fin = Math.min(segs, k + g)
        let l = 0
        for (let i = k; i < fin; i++) l += Math.hypot(p[3 * i + 3] - p[3 * i], p[3 * i + 4] - p[3 * i + 1])
        const i = k + Math.floor((fin - k) / 2)
        morceau(f.x + (p[3 * i] + p[3 * i + 3]) / 2, f.y + (p[3 * i + 1] + p[3 * i + 4]) / 2, l)
      }
      // Un trait sans longueur (tous ses points au même endroit) : un point seul
      return total > 0 ? part() : seul()
    }
    case 'polygone': {
      const q = f.pts, n = q.length / 2
      if (n < 1) return 0
      if (n === 1) return dansZone(f.x + q[0], f.y + q[1]) ? 1 : 0
      if (f.prolonge && n === 2) return dansZone(f.x + q[0], f.y + q[1]) && dansZone(f.x + q[2], f.y + q[3]) ? 1 : 0
      const fin = f.ferme ? n : n - 1
      for (let i = 0; i < fin; i++) {
        const j = (i + 1) % n
        cote(f.x + q[2 * i], f.y + q[2 * i + 1], f.x + q[2 * j], f.y + q[2 * j + 1], 8)
      }
      return total > 0 ? part() : (dansZone(f.x + q[0], f.y + q[1]) ? 1 : 0)
    }
    case 'cercle': {
      const a0 = f.arc ? f.arc.a0 : 0, da = f.arc ? f.arc.a1 - f.arc.a0 : 2 * Math.PI
      for (let i = 0; i < 48; i++) { const a = a0 + da * (i + 0.5) / 48; morceau(f.x + f.r * Math.cos(a), f.y + f.r * Math.sin(a), 1) }
      return part()
    }
    case 'segment':
      cote(f.x, f.y, f.x + f.dx, f.y + f.dy, 8)
      return total > 0 ? part() : (dansZone(f.x, f.y) ? 1 : 0)
    case 'formule':
      if (!boite) return 0
      return grille((u, v) => ({ x: boite.x + u * boite.l, y: boite.y + v * boite.h }))
    case 'image': {
      const [a, b, c, d] = f.m
      return grille((u, v) => ({ x: f.x + a * u * f.l + c * v * f.h, y: f.y + b * u * f.l + d * v * f.h }))
    }
  }
}

/** Le test « ce point est-il dans le lasso q ? », prêt pour des milliers de
 *  points : la même règle pair-impair que dedans, mais chaque côté est rangé
 *  dans les bandes horizontales qu'il traverse, et un point ne regarde que
 *  les côtés de sa bande. Un lasso tremblé de plusieurs centaines de côtés
 *  autour d'une page de 2000 traits se lâche ainsi en quelques millisecondes,
 *  au lieu de cinquante. */
export function dansLasso(q: number[]): (x: number, y: number) => boolean {
  const n = q.length / 2
  if (n < 3) return () => false
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (let i = 0; i < n; i++) {
    x1 = Math.min(x1, q[2 * i]); x2 = Math.max(x2, q[2 * i]); y1 = Math.min(y1, q[2 * i + 1]); y2 = Math.max(y2, q[2 * i + 1])
  }
  const nb = Math.max(1, Math.min(256, n)), h = (y2 - y1) / nb || 1
  const bande = (y: number) => Math.max(0, Math.min(nb - 1, Math.floor((y - y1) / h)))
  const bandes: number[][] = Array.from({ length: nb }, () => [])
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const a = q[2 * i + 1], b = q[2 * j + 1]
    for (let k = bande(Math.min(a, b)), fin = bande(Math.max(a, b)); k <= fin; k++) bandes[k].push(i, j)
  }
  return (x, y) => {
    if (x < x1 || x > x2 || y < y1 || y > y2) return false
    const c = bandes[bande(y)]
    let oui = false
    for (let k = 0; k < c.length; k += 2) {
      const i = c[k], j = c[k + 1]
      const xi = q[2 * i], yi = q[2 * i + 1], xj = q[2 * j], yj = q[2 * j + 1]
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) oui = !oui
    }
    return oui
  }
}

/** Le chemin à plat [x, y, x, y, …] simplifié (Douglas-Peucker) : un point qui
 *  s'écarte de moins de `tolerance` de la corde de ses voisins gardés s'en
 *  va ; les extrémités et les coins restent. Sans récursion : un lasso de
 *  milliers de points ne fait pas déborder la pile. */
export function simplifier(pts: number[], tolerance: number): number[] {
  const n = pts.length / 2
  if (n <= 2) return pts.slice()
  const garde = new Uint8Array(n)
  garde[0] = 1; garde[n - 1] = 1
  const pile: [number, number][] = [[0, n - 1]]
  while (pile.length) {
    const [a, b] = pile.pop()!
    let loin = -1, dmax = tolerance
    for (let i = a + 1; i < b; i++) {
      const d = distanceAuSegment(pts[2 * i], pts[2 * i + 1], pts[2 * a], pts[2 * a + 1], pts[2 * b], pts[2 * b + 1])
      if (d > dmax) { dmax = d; loin = i }
    }
    if (loin < 0) continue
    garde[loin] = 1
    pile.push([a, loin], [loin, b])
  }
  const r: number[] = []
  for (let i = 0; i < n; i++) if (garde[i]) r.push(pts[2 * i], pts[2 * i + 1])
  return r
}
