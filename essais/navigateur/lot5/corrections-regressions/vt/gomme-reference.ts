// LA RÉFÉRENCE FIGÉE de couperTrait (src/gomme.ts), telle qu'elle était
// avant l'optimisation de la vérification des régressions du lot 5 (le
// coup d'œil sur la boîte de la capsule) : couper-reference.test.ts vérifie
// que la version actuelle coupe EXACTEMENT comme elle. Ne pas la modifier.
// =============================================================
// LA GOMME QUI EFFACE LÀ OÙ ELLE PASSE (lot 5)
// La gomme de toujours efface en entier ce qu'elle touche. Celle-ci (le
// réglage « Effacer seulement là où elle passe », voir reglages.ts) coupe un
// trait à main levée, du stylo ou du surligneur : ce qui est sous elle part,
// le reste demeure, en un, deux morceaux ou davantage, qui restent des
// traits comme les autres (leur couleur, leur épaisseur, leur opacité, la
// pression de chaque point, leur place dans l'ordre, leur groupe).
//
// Entre deux mouvements, la gomme a glissé d'un point a à un point b : ce
// qu'elle efface est la capsule autour du segment [ab] (le disque de la
// gomme promené de a à b), élargie de la demi-épaisseur du trait, puisque
// c'est son encre qu'on efface et non sa ligne médiane. Une gomme rapide ne
// saute donc rien entre deux mouvements (la leçon de tldraw).
//
// Ce qui reste garde ses points d'origine, tels quels : seul un côté du
// trait qui entre dans la capsule ou en sort reçoit un point nouveau, à
// l'endroit exact où il la franchit (sa position et sa pression
// interpolées) ; un côté qui la traverse sans qu'aucun de ses bouts n'y
// soit (un trait agrandi, aux points espacés) en reçoit deux. Ajouter des
// points partout, en recoupant chaque côté, changerait le contour que
// perfect-freehand dessine pour ce qui reste (la critique du lot 5 l'a
// mesuré) : un morceau doit se voir comme la partie du trait qu'il était.
// Une miette (moins de deux points, ou plus courte que la moitié du rayon
// de la gomme et que la demi-épaisseur du trait) part avec le reste.
//
// Pur : ni DOM, ni document. L'application (app.ts) promène la gomme et
// écrit les morceaux (Tableau.couperTraits), le rendu les montre pendant le
// coup sans tout repeindre.
// =============================================================
import type { Trait } from '../../../../../src/types'
import { uid } from '../../../../../src/types'
import { distanceAuSegment } from '../../../../../src/geometrie'

type P = { x: number; y: number }

/** Deux paramètres à moins de cela sont le même point du côté : la gomme qui
 *  frôle un côté sans y entrer ne le coupe pas */
const FROLE = 1e-6

/** La part [s0, s1] (dans [0, 1]) du côté p → q qui est dans la capsule de
 *  rayon R autour de [ab] ; null : il ne la touche pas. La capsule est
 *  convexe : sa trace sur une droite est un seul intervalle, l'enveloppe de
 *  ses traces sur les deux disques des bouts et sur le rectangle du milieu. */
export function traverse(p: P, q: P, a: P, b: P, R: number): [number, number] | null {
  const dx = q.x - p.x, dy = q.y - p.y
  // Un côté de longueur nulle : un point, dedans ou non
  if (dx === 0 && dy === 0) return distanceAuSegment(p.x, p.y, a.x, a.y, b.x, b.y) <= R ? [0, 1] : null
  let s0 = Infinity, s1 = -Infinity
  const garder = (u: number, v: number) => { if (u <= v) { s0 = Math.min(s0, u); s1 = Math.max(s1, v) } }
  // Les deux disques des bouts
  const A = dx * dx + dy * dy
  for (const c of [a, b]) {
    const ex = p.x - c.x, ey = p.y - c.y
    const B = 2 * (dx * ex + dy * ey), C = ex * ex + ey * ey - R * R
    const disc = B * B - 4 * A * C
    if (disc < 0) continue
    const rac = Math.sqrt(disc)
    garder((-B - rac) / (2 * A), (-B + rac) / (2 * A))
  }
  // Le rectangle du milieu, de [ab] élargi de R de chaque côté
  const L = Math.hypot(b.x - a.x, b.y - a.y)
  if (L > 0) {
    const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L
    let lo = -Infinity, hi = Infinity
    // α(s) = α0 + s·dα dans [0, L] ; β(s) = β0 + s·dβ dans [−R, R]
    const borner = (v0: number, dv: number, min: number, max: number) => {
      if (dv === 0) { if (v0 < min || v0 > max) { lo = Infinity; hi = -Infinity } return }
      let u = (min - v0) / dv, v = (max - v0) / dv
      if (u > v) [u, v] = [v, u]
      lo = Math.max(lo, u); hi = Math.min(hi, v)
    }
    const ex = p.x - a.x, ey = p.y - a.y
    borner(ex * ux + ey * uy, dx * ux + dy * uy, 0, L)
    borner(-ex * uy + ey * ux, -dx * uy + dy * ux, -R, R)
    garder(lo, hi)
  }
  s0 = Math.max(0, s0); s1 = Math.min(1, s1)
  return s0 <= s1 ? [s0, s1] : null
}

/** Arrondis comme App.traitDe : les coordonnées au dixième, la pression au centième */
const dixieme = (v: number) => Math.round(v * 10) / 10
const centieme = (v: number) => Math.round(v * 100) / 100

/**
 * Le trait t, après que la gomme a glissé de a à b (monde), de rayon r
 * (monde). null : elle ne touche aucun de ses côtés, il ne change pas. [] :
 * il part en entier. Sinon, ses morceaux, dans l'ordre du tracé : chacun
 * garde tout du trait (sa couleur, sa taille, son opacité, sa pression, son
 * z, son groupe, son auteur), ses points relatifs à son premier ; le plus
 * long garde l'identifiant du trait, les autres en reçoivent un neuf.
 */
export function couperTrait(t: Trait, a: P, b: P, r: number): Trait[] | null {
  const q = t.pts, n = Math.floor(q.length / 3)
  if (!n) return null
  const R = r + t.taille / 2
  // Tout se calcule dans le repère du trait : ses points restent tels quels
  const A = { x: a.x - t.x, y: a.y - t.y }, B = { x: b.x - t.x, y: b.y - t.y }
  const dedans = (i: number) => distanceAuSegment(q[3 * i], q[3 * i + 1], A.x, A.y, B.x, B.y) <= R
  if (n === 1) return dedans(0) ? [] : null
  // Écarter vite : la boîte des points loin de celle de la capsule
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (let i = 0; i < q.length; i += 3) {
    if (q[i] < x1) x1 = q[i]; if (q[i] > x2) x2 = q[i]
    if (q[i + 1] < y1) y1 = q[i + 1]; if (q[i + 1] > y2) y2 = q[i + 1]
  }
  if (x2 < Math.min(A.x, B.x) - R || x1 > Math.max(A.x, B.x) + R || y2 < Math.min(A.y, B.y) - R || y1 > Math.max(A.y, B.y) + R) return null

  const point = (i: number) => [q[3 * i], q[3 * i + 1], q[3 * i + 2]]
  /** Le point du côté i → i + 1 au paramètre s, arrondi */
  const entre = (i: number, s: number) => {
    const j = i + 1
    return [dixieme(q[3 * i] + s * (q[3 * j] - q[3 * i])), dixieme(q[3 * i + 1] + s * (q[3 * j + 1] - q[3 * i + 1])),
      centieme(q[3 * i + 2] + s * (q[3 * j + 2] - q[3 * i + 2]))]
  }
  /** Ajoute p au bout de la suite, sauf s'il redit le dernier point */
  const ajouter = (suite: number[], p: number[]) => {
    const k = suite.length
    if (k >= 3 && Math.abs(suite[k - 3] - p[0]) < 0.05 && Math.abs(suite[k - 2] - p[1]) < 0.05) return
    suite.push(p[0], p[1], p[2])
  }
  const cote = (i: number) => traverse({ x: q[3 * i], y: q[3 * i + 1] }, { x: q[3 * i + 3], y: q[3 * i + 4] }, A, B, R)

  const suites: number[][] = []
  let touche = false
  let dI = dedans(0)
  let cour: number[] | null = dI ? null : point(0)
  if (dI) touche = true
  for (let i = 0; i + 1 < n; i++) {
    const dJ = dedans(i + 1)
    if (!dI && !dJ) {
      // Les deux bouts dehors : le côté traverse-t-il la capsule ?
      const it = cote(i)
      if (it && it[1] - it[0] > FROLE) {
        touche = true
        ajouter(cour!, entre(i, it[0])); suites.push(cour!)
        cour = []; ajouter(cour, entre(i, it[1])); ajouter(cour, point(i + 1))
      } else ajouter(cour!, point(i + 1))
    } else if (!dI && dJ) {
      // Il entre : la suite finit là où il franchit le bord
      touche = true
      const it = cote(i)
      ajouter(cour!, entre(i, it ? it[0] : 1)); suites.push(cour!)
      cour = null
    } else if (dI && !dJ) {
      // Il sort : une suite commence là où il franchit le bord
      const it = cote(i)
      cour = []; ajouter(cour, entre(i, it ? it[1] : 0)); ajouter(cour, point(i + 1))
    }
    // (les deux bouts dedans : la capsule est convexe, tout le côté l'est)
    dI = dJ
  }
  if (cour) suites.push(cour)
  if (!touche) return null

  // Les miettes partent
  const miette = Math.max(r / 2, t.taille / 2)
  const gardees = suites.map(s => ({ s, l: longueur(s) })).filter(x => x.s.length >= 6 && x.l >= miette)
  if (!gardees.length) return []
  let long = 0
  gardees.forEach((x, k) => { if (x.l > gardees[long].l) long = k })
  return gardees.map(({ s }, k) => {
    const x0 = s[0], y0 = s[1], pts: number[] = []
    for (let i = 0; i < s.length; i += 3) pts.push(dixieme(s[i] - x0), dixieme(s[i + 1] - y0), centieme(s[i + 2]))
    return { ...t, id: k === long ? t.id : uid(), x: t.x + x0, y: t.y + y0, pts }
  })
}

/** La longueur d'une suite de points à plat [x, y, pression, …] */
export function longueur(s: readonly number[]): number {
  let l = 0
  for (let i = 3; i + 1 < s.length; i += 3) l += Math.hypot(s[i] - s[i - 3], s[i + 1] - s[i - 2])
  return l
}

/** Lequel des morceaux d'un trait coupé garde son identifiant : le plus long
 *  (le premier, à longueur égale) ; −1 s'il n'y en a pas */
export function lePlusLong(morceaux: readonly Trait[]): number {
  let k = -1, max = -1
  morceaux.forEach((m, i) => { const l = longueur(m.pts); if (l > max) { max = l; k = i } })
  return k
}
