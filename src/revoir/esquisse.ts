// =============================================================
// LE TRACÉ EN TRAIN DE SE FAIRE
// Une forme qui vient d'apparaître se dessine sous les yeux, comme la
// main l'a tracée : le trait suit son chemin, le segment s'allonge, le
// cercle s'ouvre comme au compas, le polygone se construit côté après
// côté. On avance à vitesse de plume constante (la longueur parcourue,
// pas le nombre de points), dans des bornes qui gardent le geste lisible
// sans retarder le suivant.
// Le décor d'une figure (noms, codage, remplissage, bouts) ne vient
// qu'une fois la figure finie : c'est ainsi qu'on l'écrit au tableau.
// Formules et images n'ont pas de tracé : elles apparaissent d'un coup.
// Tout est pur : une forme entre, une autre forme sort, rien n'est modifié.
// =============================================================
import type { Forme } from '../types'

/** Vitesse de la plume, en unités monde par ms, à l'allure Normale (≈ 27 cm/s) */
export const PLUME = 1.1
/** Durées extrêmes d'un tracé, en ms */
export const TRACE_MIN = 150
export const TRACE_MAX = 1100

type Point = { x: number; y: number }

/** Les formes qui ont un tracé : les autres apparaissent d'un coup */
export function seDessine(f: Forme): boolean {
  return f.type === 'trait' || f.type === 'segment' || f.type === 'polygone' || f.type === 'cercle'
}

/** Les sommets d'un polygone dans l'ordre du tracé (relatifs à x, y) */
function chemin(f: Extract<Forme, { type: 'polygone' }>): Point[] {
  const r: Point[] = []
  for (let i = 0; i + 1 < f.pts.length; i += 2) r.push({ x: f.pts[i], y: f.pts[i + 1] })
  if (f.prolonge && r.length >= 2) return r.slice(0, 2)       // droite ou demi-droite : le tracé va de A à B
  if (f.ferme && r.length > 2) r.push(r[0])
  return r
}

const somme = (pts: Point[]) => {
  let l = 0
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
  return l
}

/** Les points d'un trait, regroupés (x, y, pression) */
function pointsDuTrait(pts: number[]): { x: number; y: number; p: number }[] {
  const r: { x: number; y: number; p: number }[] = []
  for (let i = 0; i + 2 < pts.length; i += 3) r.push({ x: pts[i], y: pts[i + 1], p: pts[i + 2] })
  return r
}

/** La longueur parcourue par la main pour tracer la forme, en unités monde */
export function longueur(f: Forme): number {
  switch (f.type) {
    case 'trait': return somme(pointsDuTrait(f.pts))
    case 'segment': return Math.hypot(f.dx, f.dy)
    case 'polygone': return somme(chemin(f))
    case 'cercle': return f.r * (f.arc ? Math.abs(f.arc.a1 - f.arc.a0) : 2 * Math.PI)
    default: return 0
  }
}

/** Le temps de tracé d'un groupe de formes apparues ensemble (0 : rien à tracer) */
export function dureeDuTrace(formes: Forme[]): number {
  let plusLongue = -1
  for (const f of formes) if (seDessine(f)) plusLongue = Math.max(plusLongue, longueur(f))
  if (plusLongue < 0) return 0
  return Math.max(TRACE_MIN, Math.min(TRACE_MAX, plusLongue / PLUME))
}

/** Le début d'un chemin, jusqu'à la longueur `cible` : les points passés,
 *  et le dernier point placé sur le côté en cours (`mel` mêle deux points) */
function debutDuChemin<T extends Point>(pts: T[], cible: number, mel: (a: T, b: T, u: number) => T): T[] {
  if (!pts.length) return []
  const r: T[] = [pts[0]]
  let fait = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    if (fait + d <= cible) { r.push(b); fait += d; continue }
    const u = d > 0 ? (cible - fait) / d : 0
    if (u > 0) r.push(mel(a, b, u))
    break
  }
  return r
}

const entre = (a: number, b: number, u: number) => a + (b - a) * u

/** La forme telle qu'elle est quand la fraction t de son tracé est faite.
 *  À t = 1 (ou pour une forme sans tracé), c'est la forme elle-même. */
export function esquisse(f: Forme, t: number): Forme {
  t = t > 0 ? Math.min(1, t) : 0
  if (t >= 1 || !seDessine(f)) return f
  switch (f.type) {
    case 'trait': {
      const pts = pointsDuTrait(f.pts)
      const faits = debutDuChemin(pts, t * somme(pts), (a, b, u) => ({ x: entre(a.x, b.x, u), y: entre(a.y, b.y, u), p: entre(a.p, b.p, u) }))
      return { ...f, pts: faits.flatMap(q => [q.x, q.y, q.p]) }
    }
    case 'segment':
      return { ...f, dx: f.dx * t, dy: f.dy * t }
    case 'polygone': {
      const pts = chemin(f)
      const faits = debutDuChemin(pts, t * somme(pts), (a, b, u) => ({ x: entre(a.x, b.x, u), y: entre(a.y, b.y, u) }))
      return {
        ...f, pts: faits.flatMap(q => [q.x, q.y]),
        ferme: false, prolonge: undefined, sommets: false, codage: false, fond: null, stylePoints: undefined,
      }
    }
    case 'cercle': {
      const a0 = f.arc ? f.arc.a0 : -Math.PI / 2
      const balayage = f.arc ? f.arc.a1 - f.arc.a0 : 2 * Math.PI
      return { ...f, arc: { a0, a1: a0 + balayage * t }, codage: false, sommets: false, fond: null }
    }
  }
  return f
}
