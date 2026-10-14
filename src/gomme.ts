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
import type { Trait } from './types'
import { uid } from './types'
import { distanceAuSegment } from './geometrie'

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
  // La boîte de la capsule : un point, un côté qui n'y entre pas n'y touche
  // pas, sans autre calcul (sur une spirale de 5000 points, presque tous)
  const cx1 = Math.min(A.x, B.x) - R, cx2 = Math.max(A.x, B.x) + R, cy1 = Math.min(A.y, B.y) - R, cy2 = Math.max(A.y, B.y) + R
  const dedans = (i: number) => {
    const x = q[3 * i], y = q[3 * i + 1]
    return x >= cx1 && x <= cx2 && y >= cy1 && y <= cy2 && distanceAuSegment(x, y, A.x, A.y, B.x, B.y) <= R
  }
  if (n === 1) return dedans(0) ? [] : null
  // Écarter vite : la boîte des points loin de celle de la capsule
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (let i = 0; i < q.length; i += 3) {
    if (q[i] < x1) x1 = q[i]; if (q[i] > x2) x2 = q[i]
    if (q[i + 1] < y1) y1 = q[i + 1]; if (q[i + 1] > y2) y2 = q[i + 1]
  }
  if (x2 < cx1 || x1 > cx2 || y2 < cy1 || y1 > cy2) return null

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
  const cote = (i: number) => {
    const px = q[3 * i], py = q[3 * i + 1], qx = q[3 * i + 3], qy = q[3 * i + 4]
    if (Math.max(px, qx) < cx1 || Math.min(px, qx) > cx2 || Math.max(py, qy) < cy1 || Math.min(py, qy) > cy2) return null
    return traverse({ x: px, y: py }, { x: qx, y: qy }, A, B, R)
  }

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

// ---------- Les longs traits pendant le coup ----------
// Un long trait d'un seul geste (une spirale, des hachures, une écriture
// liée : des milliers de points) que la gomme coupe à chaque mouvement
// donnait à chaque fois un long morceau neuf. Le repeindre en entier (son
// contour par perfect-freehand, et toute sa boîte : presque toute la
// spirale) coûtait plus qu'une peinture entière de la page, et la gomme
// traînait derrière la plume sur un poste lent (la vérification du lot 5).
// Pendant le coup, un long morceau ne se repeint donc que là où il change à
// l'écran, ses deux bouts (boutsDe : là où la gomme l'a coupé, et ce que
// perfect-freehand y lisse), et ne se redessine que dans le rectangle sale,
// par fenêtres de ses points (fenetresDe). Ailleurs, l'écran garde le
// contour du trait d'avant la coupe : le même, à une fraction de pixel près
// (le lissage et la pression simulée de perfect-freehand oublient vite d'où
// ils partent). Au lever, la scène se repeint entière, au contour exact.

/** Au-delà de tant de points, un morceau est long (voir ci-dessus) : un mot,
 *  une lettre en ont bien moins, et se repeignent toujours en entier. Le
 *  rendu ne redessine un long morceau que par fenêtres. */
export const LONG_MORCEAU = 150
/** Un morceau plus grand que cela à l'écran (px, son plus grand côté) ne se
 *  repeint aussi qu'à ses bouts : la moitié d'un anneau de la spirale n'a
 *  que 80 points, mais sa boîte couvre la moitié de la spirale. Aux points
 *  espacés (un grand geste), le contour d'un morceau est celui du trait
 *  entier dès une quinzaine de pixels de la coupe. */
export const GRAND_MORCEAU = 200

/** Ce qu'un bout de long morceau, ou une fenêtre de part et d'autre de ce
 *  qu'elle montre, prend de points au moins, et de tracé au moins (en
 *  unités du monde, d'après l'épaisseur du trait) */
export const BORD = { points: 6, longueur: (taille: number) => 3 * taille + 8 }

type Boite = { x: number; y: number; l: number; h: number }

/** Les boîtes (monde) des bouts d'un morceau t qui ont changé depuis le
 *  trait (ou le morceau) m d'où la gomme vient de le couper : de chaque côté
 *  où son premier ou son dernier point n'est plus celui de m, BORD.points
 *  points et BORD.longueur de tracé au moins, agrandies de son épaisseur
 *  (son encre déborde ses points). Un bout resté celui de m (le bout de la
 *  spirale, loin de la gomme) ne change pas à l'écran. Un morceau plus
 *  court que ses deux bouts n'a qu'une boîte, la sienne. */
export function boutsDe(t: Trait, m: Trait): Boite[] {
  const q = t.pts, n = Math.floor(q.length / 3), qm = m.pts, nm = Math.floor(qm.length / 3)
  if (!n) return []
  const meme = (i: number, j: number) => Math.abs(t.x + q[3 * i] - m.x - qm[3 * j]) <= 0.06 && Math.abs(t.y + q[3 * i + 1] - m.y - qm[3 * j + 1]) <= 0.06
  const neufDebut = !nm || !meme(0, 0), neufFin = !nm || !meme(n - 1, nm - 1)
  const lmin = BORD.longueur(t.taille)
  const boite = (de: number, a: number): Boite => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = de; i <= a; i++) {
      const x = q[3 * i], y = q[3 * i + 1]
      if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y
    }
    const m = t.taille
    return { x: t.x + x1 - m, y: t.y + y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
  }
  const debut = jusqua(q, 0, 1, n, BORD.points, lmin), fin = jusqua(q, n - 1, -1, n, BORD.points, lmin)
  if (debut >= fin) return neufDebut || neufFin ? [boite(0, n - 1)] : []
  return [...(neufDebut ? [boite(0, debut)] : []), ...(neufFin ? [boite(fin, n - 1)] : [])]
}

/** De l'indice i, dans le sens s (±1), l'indice où l'on a parcouru au moins
 *  k points et l de tracé (borné aux bouts du trait) */
function jusqua(q: readonly number[], i: number, s: 1 | -1, n: number, k: number, l: number): number {
  let compte = 0, fait = 0
  while (compte < k || fait < l) {
    const j = i + s
    if (j < 0 || j >= n) break
    fait += Math.hypot(q[3 * j] - q[3 * i], q[3 * j + 1] - q[3 * i + 1])
    i = j; compte++
  }
  return i
}

/** Le côté i → i + 1 du trait (ou son point seul) touche-t-il la boîte w
 *  (monde) agrandie de ce qu'il faut pour que son encre n'y entre pas sans
 *  que le côté y touche (voir margeDEncre) ? Rend la fonction, pour tous
 *  les côtés. */
function cotesPres(t: Trait, w: Boite, marge: number): (i: number) => boolean {
  const q = t.pts, n = Math.floor(q.length / 3), e = marge + margeDEncre(t)
  const x1 = w.x - e - t.x, y1 = w.y - e - t.y, x2 = w.x + w.l + e - t.x, y2 = w.y + w.h + e - t.y
  return (i: number) => {
    const j = Math.min(i + 1, n - 1)
    const ax = q[3 * i], ay = q[3 * i + 1], bx = q[3 * j], by = q[3 * j + 1]
    return Math.max(ax, bx) >= x1 && Math.min(ax, bx) <= x2 && Math.max(ay, by) >= y1 && Math.min(ay, by) <= y2
  }
}

/** Jusqu'où l'encre d'un trait peut s'écarter de ses côtés : son épaisseur,
 *  et le lissage de perfect-freehand (streamline), dont la ligne suit les
 *  points avec du retard, de moins des deux tiers de l'écart entre deux
 *  points (le plus grand, compté large) */
function margeDEncre(t: Trait): number {
  const q = t.pts
  let l = 0
  for (let i = 3; i + 1 < q.length; i += 3) l = Math.max(l, Math.abs(q[i] - q[i - 3]) + Math.abs(q[i + 1] - q[i - 2]))
  return t.taille + l
}

/** L'encre du trait t peut-elle entrer dans la boîte w (monde), agrandie de
 *  marge ? Plus fin que sa boîte : la moitié d'un anneau de spirale a une
 *  boîte qui couvre la moitié de la spirale, mais ne passe que par un bord
 *  du rectangle sale. Vrai dans le doute. */
export function passePres(t: Trait, w: Boite, marge: number): boolean {
  const n = Math.floor(t.pts.length / 3)
  if (!n) return false
  const touche = cotesPres(t, w, marge)
  for (let i = 0; i < Math.max(1, n - 1); i++) if (touche(i)) return true
  return false
}

/** Les fenêtres d'un long trait à redessiner dans la boîte w (monde) : les
 *  suites de ses côtés près de w (agrandie de `marge`, voir cotesPres),
 *  réunies quand moins de 2·BORD.points points les séparent, puis
 *  prolongées de chaque côté de BORD (là, le contour d'une fenêtre est
 *  celui du trait entier, et son bout rond tombe loin de w). En indices de
 *  points [début, fin[, dans l'ordre du tracé, sans chevauchement. */
export function fenetresDe(t: Trait, w: Boite, marge: number): [number, number][] {
  const q = t.pts, n = Math.floor(q.length / 3)
  if (!n) return []
  const touche = cotesPres(t, w, marge)
  const lmin = BORD.longueur(t.taille), cotes = Math.max(1, n - 1)
  const r: [number, number][] = []
  let i = 0
  while (i < cotes) {
    if (!touche(i)) { i++; continue }
    let fin = i
    for (let j = i + 1; j < cotes && j - fin <= 2 * BORD.points; j++) if (touche(j)) fin = j
    const a = jusqua(q, i, -1, n, BORD.points, lmin), b = jusqua(q, Math.min(fin + 1, n - 1), 1, n, BORD.points, lmin) + 1
    if (r.length && a <= r[r.length - 1][1]) r[r.length - 1][1] = Math.max(r[r.length - 1][1], b)
    else r.push([a, b])
    i = fin + 1
  }
  return r
}
