// =============================================================
// LA GÉOMÉTRIE DES FIGURES
// 1. Reconnaître : un tracé à main levée devient un vrai carré,
//    rectangle, triangle, polygone ou cercle.
// 2. Coder : côtés de même longueur et angles droits.
// 3. Transformer : translation, rotation, symétries, homothétie.
// Tout est en coordonnées monde (40 unités = 1 cm, y vers le bas).
// =============================================================
import type { Cercle, Forme, Polygone } from './types'
import { uid } from './types'
import { distanceAuSegment } from './geometrie'

export type P = { x: number; y: number }

const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)
const DEG = Math.PI / 180

/** Sommets absolus d'un polygone */
export function sommetsDe(f: Polygone): P[] {
  const r: P[] = []
  for (let i = 0; i + 1 < f.pts.length; i += 2) r.push({ x: f.x + f.pts[i], y: f.y + f.pts[i + 1] })
  return r
}

/** Range des sommets absolus dans un polygone (premier sommet = (x, y)) */
export function versRelatif(pts: P[]): { x: number; y: number; pts: number[] } {
  const o = pts[0]
  return { x: o.x, y: o.y, pts: pts.flatMap(p => [Math.round((p.x - o.x) * 10) / 10, Math.round((p.y - o.y) * 10) / 10]) }
}

export function centreDe(f: Polygone | Cercle): P {
  if (f.type === 'cercle') return { x: f.x, y: f.y }
  const s = sommetsDe(f)
  return { x: s.reduce((a, p) => a + p.x, 0) / s.length, y: s.reduce((a, p) => a + p.y, 0) / s.length }
}

// =============================================================
// 1. RECONNAISSANCE
// =============================================================
export type Reconnue =
  | { type: 'polygone'; pts: P[]; ferme: boolean; nom: string }
  | { type: 'cercle'; c: P; r: number; nom: string }

function longueur(p: P[]) {
  let l = 0
  for (let i = 1; i < p.length; i++) l += dist(p[i - 1], p[i])
  return l
}

/** n points également espacés le long du tracé */
function reechantillonner(p: P[], n: number): P[] {
  const pas = longueur(p) / (n - 1)
  if (!pas) return [p[0]]
  const r: P[] = [p[0]]
  let reste = 0
  for (let i = 1; i < p.length; i++) {
    let a = p[i - 1]
    const b = p[i]
    let d = dist(a, b)
    while (reste + d >= pas && r.length < n) {
      const t = (pas - reste) / d
      a = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) }
      r.push(a)
      d = dist(a, b)
      reste = 0
    }
    reste += d
  }
  while (r.length < n) r.push(p[p.length - 1])
  return r
}

/** Ramer-Douglas-Peucker : indices des points gardés entre i et j */
function rdp(p: P[], i: number, j: number, eps: number, garde: number[]) {
  let max = 0, k = -1
  for (let m = i + 1; m < j; m++) {
    const d = distanceAuSegment(p[m].x, p[m].y, p[i].x, p[i].y, p[j].x, p[j].y)
    if (d > max) { max = d; k = m }
  }
  if (k >= 0 && max > eps) { rdp(p, i, k, eps, garde); garde.push(k); rdp(p, k, j, eps, garde) }
}

/** Droite des moindres carrés (point + direction) d'un nuage de points */
function droite(p: P[]): { o: P; u: P } {
  const o = { x: p.reduce((a, q) => a + q.x, 0) / p.length, y: p.reduce((a, q) => a + q.y, 0) / p.length }
  let sxx = 0, syy = 0, sxy = 0
  for (const q of p) { const dx = q.x - o.x, dy = q.y - o.y; sxx += dx * dx; syy += dy * dy; sxy += dx * dy }
  const a = 0.5 * Math.atan2(2 * sxy, sxx - syy)
  return { o, u: { x: Math.cos(a), y: Math.sin(a) } }
}

function intersection(d1: { o: P; u: P }, d2: { o: P; u: P }): P | null {
  const det = d1.u.x * d2.u.y - d1.u.y * d2.u.x
  if (Math.abs(det) < 1e-6) return null
  const t = ((d2.o.x - d1.o.x) * d2.u.y - (d2.o.y - d1.o.y) * d2.u.x) / det
  return { x: d1.o.x + t * d1.u.x, y: d1.o.y + t * d1.u.y }
}

/** Angle intérieur (en degrés) au sommet b */
function angle(a: P, b: P, c: P) {
  const u = { x: a.x - b.x, y: a.y - b.y }, v = { x: c.x - b.x, y: c.y - b.y }
  const cos = (u.x * v.x + u.y * v.y) / (Math.hypot(u.x, u.y) * Math.hypot(v.x, v.y) || 1)
  return Math.acos(Math.max(-1, Math.min(1, cos))) / DEG
}

function erreurPolygone(p: P[], s: P[], ferme: boolean) {
  let e = 0
  for (const q of p) {
    let m = Infinity
    const n = ferme ? s.length : s.length - 1
    for (let i = 0; i < n; i++) {
      const a = s[i], b = s[(i + 1) % s.length]
      m = Math.min(m, distanceAuSegment(q.x, q.y, a.x, a.y, b.x, b.y))
    }
    e += m
  }
  return e / p.length
}

/** Sommets d'une ligne fermée : RDP, puis on retire les faux sommets
 *  (presque alignés) et on recale chaque coin à l'intersection des côtés. */
function coins(p: P[], eps: number): P[] | null {
  const n = p.length
  // On coupe la boucle au point le plus éloigné du départ
  let loin = 0
  for (let i = 1; i < n; i++) if (dist(p[i], p[0]) > dist(p[loin], p[0])) loin = i
  const garde = [0]
  rdp(p, 0, loin, eps, garde); garde.push(loin); rdp(p, loin, n - 1, eps, garde)
  let idx = garde
  // Faux sommets : angle presque plat
  let change = true
  while (change && idx.length > 3) {
    change = false
    for (let k = 0; k < idx.length; k++) {
      const a = p[idx[(k - 1 + idx.length) % idx.length]], b = p[idx[k]], c = p[idx[(k + 1) % idx.length]]
      if (angle(a, b, c) > 150 || dist(a, b) < eps * 1.2) { idx = idx.filter((_, m) => m !== k); change = true; break }
    }
  }
  if (idx.length < 3 || idx.length > 8) return null
  // Chaque côté : droite des moindres carrés sur sa partie centrale
  const cotes = idx.map((d, k) => {
    let f = idx[(k + 1) % idx.length]
    if (f <= d) f += n
    const morceau: P[] = []
    const marge = Math.floor((f - d) * 0.2)
    for (let m = d + marge; m <= f - marge; m++) morceau.push(p[m % n])
    return droite(morceau.length >= 2 ? morceau : [p[d], p[f % n]])
  })
  return cotes.map((c, k) => intersection(cotes[(k - 1 + cotes.length) % cotes.length], c) ?? p[idx[k]])
}

/** Sens direct (inverse des aiguilles d'une montre à l'écran), en
 *  commençant par le sommet en bas à gauche : l'usage pour nommer ABCD. */
export function ranger(s: P[]): P[] {
  let aire = 0
  for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; aire += a.x * b.y - b.x * a.y }
  const r = aire > 0 ? [...s].reverse() : [...s]            // y vers le bas : aire < 0 = sens direct
  let d = 0
  for (let i = 1; i < r.length; i++) {
    if (r[i].y - r[i].x > r[d].y - r[d].x + 1e-6) d = i      // le plus bas et le plus à gauche
  }
  return [...r.slice(d), ...r.slice(0, d)]
}

/** Un angle presque horizontal ou vertical le devient (à 7° près) */
function redresser(a: number) {
  const q = Math.round(a / (Math.PI / 2)) * (Math.PI / 2)
  return Math.abs(a - q) < 12 * DEG ? q : a
}

function embellir(s: P[]): { pts: P[]; nom: string } {
  const n = s.length
  const cotes = s.map((p, i) => dist(p, s[(i + 1) % n]))
  const angles = s.map((p, i) => angle(s[(i - 1 + n) % n], p, s[(i + 1) % n]))
  const moy = cotes.reduce((a, b) => a + b, 0) / n
  const egaux = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol * Math.max(a, b)
  const c = { x: s.reduce((a, p) => a + p.x, 0) / n, y: s.reduce((a, p) => a + p.y, 0) / n }

  if (n === 4 && angles.every(a => Math.abs(a - 90) < 15)) {
    // Orientation moyenne des côtés, modulo 90° (moyenne sur l'angle quadruplé)
    let sx = 0, sy = 0
    for (let i = 0; i < 4; i++) {
      const a = Math.atan2(s[(i + 1) % 4].y - s[i].y, s[(i + 1) % 4].x - s[i].x) * 4
      sx += Math.cos(a); sy += Math.sin(a)
    }
    const t = redresser(Math.atan2(sy, sx) / 4)
    const u = { x: Math.cos(t), y: Math.sin(t) }, v = { x: -u.y, y: u.x }
    // Demi-largeurs : projection des sommets sur les deux axes
    let l = 0, h = 0
    for (const p of s) {
      l += Math.abs((p.x - c.x) * u.x + (p.y - c.y) * u.y) / 4
      h += Math.abs((p.x - c.x) * v.x + (p.y - c.y) * v.y) / 4
    }
    const carre = egaux(l, h, 0.15)
    if (carre) l = h = (l + h) / 2
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
      ({ x: c.x + a * l * u.x + b * h * v.x, y: c.y + a * l * u.y + b * h * v.y }))
    return { pts, nom: carre ? 'Carré' : 'Rectangle' }
  }

  if (n === 4) {
    const [A, B, C, D] = s
    const dir = (a: P, b: P) => Math.atan2(b.y - a.y, b.x - a.x)
    const ecart = (a: number, b: number) => { const d = Math.abs(a - b) % Math.PI; return Math.min(d, Math.PI - d) / DEG }
    // Losange : quatre côtés presque égaux. Diagonales perpendiculaires.
    if (cotes.every(x => egaux(x, moy, 0.15))) {
      const t = redresser(dir(A, C))
      const u = { x: Math.cos(t), y: Math.sin(t) }, v = { x: -u.y, y: u.x }
      const d1 = dist(A, C) / 2, d2 = dist(B, D) / 2
      const sens = (B.x - c.x) * v.x + (B.y - c.y) * v.y > 0 ? 1 : -1
      return { nom: 'Losange', pts: [
        { x: c.x - d1 * u.x, y: c.y - d1 * u.y }, { x: c.x + sens * d2 * v.x, y: c.y + sens * d2 * v.y },
        { x: c.x + d1 * u.x, y: c.y + d1 * u.y }, { x: c.x - sens * d2 * v.x, y: c.y - sens * d2 * v.y }] }
    }
    // Parallélogramme : côtés opposés presque parallèles et de même longueur
    if (ecart(dir(A, B), dir(D, C)) < 10 && ecart(dir(A, D), dir(B, C)) < 10 &&
        egaux(cotes[0], cotes[2], 0.18) && egaux(cotes[1], cotes[3], 0.18)) {
      let u = { x: (B.x - A.x + C.x - D.x) / 2, y: (B.y - A.y + C.y - D.y) / 2 }
      const v = { x: (D.x - A.x + C.x - B.x) / 2, y: (D.y - A.y + C.y - B.y) / 2 }
      const t = redresser(Math.atan2(u.y, u.x)), lu = Math.hypot(u.x, u.y)
      u = { x: lu * Math.cos(t), y: lu * Math.sin(t) }
      return { nom: 'Parallélogramme', pts: [
        { x: c.x - u.x / 2 - v.x / 2, y: c.y - u.y / 2 - v.y / 2 }, { x: c.x + u.x / 2 - v.x / 2, y: c.y + u.y / 2 - v.y / 2 },
        { x: c.x + u.x / 2 + v.x / 2, y: c.y + u.y / 2 + v.y / 2 }, { x: c.x - u.x / 2 + v.x / 2, y: c.y - u.y / 2 + v.y / 2 }] }
    }
  }

  if (n === 3) {
    // La base : le côté le plus proche de l'horizontale
    let b = 0
    const pente = (i: number) => {
      const a = s[i], d = s[(i + 1) % 3]
      return Math.abs(Math.atan2(d.y - a.y, d.x - a.x) % Math.PI)
    }
    for (let i = 1; i < 3; i++) if (Math.min(pente(i), Math.PI - pente(i)) < Math.min(pente(b), Math.PI - pente(b))) b = i
    const A = s[b], B = s[(b + 1) % 3], C = s[(b + 2) % 3]
    const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }
    const t = redresser(Math.atan2(B.y - A.y, B.x - A.x))
    const u = { x: Math.cos(t), y: Math.sin(t) }
    const cote = (C.x - m.x) * -u.y + (C.y - m.y) * u.x > 0 ? 1 : -1   // de quel côté est le sommet
    const nrm = { x: -u.y * cote, y: u.x * cote }
    if (cotes.every(x => egaux(x, moy, 0.1))) {
      const k = moy / 2, hh = moy * Math.sqrt(3) / 2
      return { nom: 'Triangle équilatéral', pts: [
        { x: m.x - k * u.x, y: m.y - k * u.y }, { x: m.x + k * u.x, y: m.y + k * u.y },
        { x: m.x + hh * nrm.x, y: m.y + hh * nrm.y }] }
    }
    const base = dist(A, B), haut = (C.x - m.x) * nrm.x + (C.y - m.y) * nrm.y
    const A2 = { x: m.x - base / 2 * u.x, y: m.y - base / 2 * u.y }, B2 = { x: m.x + base / 2 * u.x, y: m.y + base / 2 * u.y }
    if (egaux(dist(C, A), dist(C, B), 0.08)) {
      return { nom: 'Triangle isocèle', pts: [A2, B2, { x: m.x + haut * nrm.x, y: m.y + haut * nrm.y }] }
    }
    // Angle droit en un sommet : on le rend exact
    for (let i = 0; i < 3; i++) {
      if (Math.abs(angles[i] - 90) < 10) {
        const S = s[i], P1 = s[(i + 1) % 3], P2 = s[(i + 2) % 3]
        const t1 = redresser(Math.atan2(P1.y - S.y, P1.x - S.x))
        const d1 = dist(S, P1), d2 = dist(S, P2)
        const u1 = { x: Math.cos(t1), y: Math.sin(t1) }
        const sens = (P2.x - S.x) * -u1.y + (P2.y - S.y) * u1.x > 0 ? 1 : -1
        const r = [S, { x: S.x + d1 * u1.x, y: S.y + d1 * u1.y }, { x: S.x - u1.y * sens * d2, y: S.y + u1.x * sens * d2 }]
        const out: P[] = []; out[i] = r[0]; out[(i + 1) % 3] = r[1]; out[(i + 2) % 3] = r[2]
        return { nom: 'Triangle rectangle', pts: out }
      }
    }
    return { nom: 'Triangle', pts: s }
  }

  // Polygone régulier si tous les côtés et tous les angles se ressemblent
  const reg = 180 - 360 / n
  if (n >= 5 && cotes.every(x => egaux(x, moy, 0.15)) && angles.every(a => Math.abs(a - reg) < 12)) {
    const R = s.reduce((a, p) => a + dist(p, c), 0) / n
    const t0 = Math.atan2(s[0].y - c.y, s[0].x - c.x)
    return { nom: 'Polygone régulier', pts: s.map((_, i) => ({ x: c.x + R * Math.cos(t0 + i * 2 * Math.PI / n * (angleSens(s))), y: c.y + R * Math.sin(t0 + i * 2 * Math.PI / n * (angleSens(s))) })) }
  }
  return { nom: n === 4 ? 'Quadrilatère' : 'Polygone', pts: s }
}

function angleSens(s: P[]) {
  let aire = 0
  for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length]; aire += a.x * b.y - b.x * a.y }
  return aire > 0 ? 1 : -1
}

/** Au-delà de ce déplacement (px d'écran), la plume a bougé */
export const PLUME_BOUGE = 1.5

/**
 * Le stylet est-il resté immobile (« maintenu », voir reconnaitre) ? On
 * mesure le déplacement depuis l'ancrage, l'endroit où la plume s'est posée
 * ou a bougé pour la dernière fois, et non d'un point au suivant : sur un
 * stylet rapide (200 à 240 Hz), une plume lente avance de moins d'un pixel
 * et demi par point sans jamais s'arrêter. La mesure ne dépend donc pas de
 * la fréquence du stylet ; une main posée qui tremble à peine reste immobile.
 */
export class Immobilite {
  private x: number
  private y: number
  constructor(p: P) { this.x = p.x; this.y = p.y }

  /** La plume arrive en p (monde), au zoom `zoom` : a-t-elle bougé ? Si oui, l'ancrage la suit. */
  bouge(p: P, zoom: number): boolean {
    if (!(Math.hypot(p.x - this.x, p.y - this.y) * zoom > PLUME_BOUGE)) return false
    this.x = p.x; this.y = p.y
    return true
  }
}

/**
 * Le tracé (points absolus) est-il une figure ?
 * - Une figure fermée assez grande est reconnue d'office.
 * - Un trait ouvert ne l'est que si le stylet est resté immobile à la fin
 *   (« maintenu ») : sinon chaque « 1 » ou chaque « − » écrit au tableau
 *   deviendrait un segment.
 * `zoom` sert à juger la taille à l'écran.
 */
export function reconnaitre(brut: P[], maintenu: boolean, zoom: number): Reconnue | null {
  if (brut.length < 5) return null
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const p of brut) { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y) }
  const D = Math.hypot(x2 - x1, y2 - y1)
  if (D * zoom < 60) return null                       // trop petit : c'est de l'écriture
  const L = longueur(brut)
  const debut = brut[0], fin = brut[brut.length - 1]

  if (dist(debut, fin) > Math.max(0.22 * D, 0.1 * L)) {
    if (!maintenu) return null
    const p = reechantillonner(brut, 48)
    if (dist(debut, fin) > 0.92 * L) return { type: 'polygone', ferme: false, pts: [debut, fin], nom: 'Segment' }
    const garde = [0]; rdp(p, 0, p.length - 1, 0.035 * L, garde); garde.push(p.length - 1)
    if (garde.length > 6) return null
    return { type: 'polygone', ferme: false, pts: garde.map(i => p[i]), nom: 'Ligne brisée' }
  }

  const p = reechantillonner([...fermer(brut), brut[0]], 72)
  const cercle = ajusterCercle(p)
  const s = coins(p, 0.035 * longueur(p))

  // Un polygone n'est retenu que si TOUS ses coins sont francs : un cercle
  // tremblé a des bosses, pas des coins. Sinon, c'est un cercle (comme au
  // tableau : on voulait un cercle, on n'a pas su le tracer rond).
  if (s && s.length <= 6 && erreurPolygone(p, s, true) < 0.06 * D && s.every(v => nettete(p, v) >= 38)) {
    const e = embellir(ranger(s))
    return { type: 'polygone', ferme: true, pts: ranger(e.pts), nom: e.nom }
  }
  const rapport = (x2 - x1) / ((y2 - y1) || 1)
  if (cercle.erreur < 0.16 && rapport > 0.6 && rapport < 1.66) return { type: 'cercle', c: cercle.c, r: cercle.r, nom: 'Cercle' }
  return null
}

/** Le trait qui dépasse son point de départ (ou s'arrête un peu avant)
 *  laisserait une pointe : on coupe là où la fin repasse au plus près du début. */
function fermer(t: P[]): P[] {
  const n = t.length, q = Math.max(2, Math.floor(n * 0.25))
  let best = Infinity, bi = 0, bj = n - 1
  for (let i = 0; i < q; i++) for (let j = n - q; j < n; j++) {
    const d = dist(t[i], t[j])
    if (d < best) { best = d; bi = i; bj = j }
  }
  return t.slice(bi, bj + 1)
}

/** Cercle des moindres carrés (méthode de Kåsa) ; erreur relative au rayon */
function ajusterCercle(p: P[]): { c: P; r: number; erreur: number } {
  const n = p.length
  const mx = p.reduce((a, q) => a + q.x, 0) / n, my = p.reduce((a, q) => a + q.y, 0) / n
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0
  for (const q of p) {
    const u = q.x - mx, v = q.y - my
    suu += u * u; svv += v * v; suv += u * v
    suuu += u * u * u; svvv += v * v * v; suvv += u * v * v; svuu += v * u * u
  }
  const det = suu * svv - suv * suv
  let c = { x: mx, y: my }
  if (Math.abs(det) > 1e-9) {
    const b1 = (suuu + suvv) / 2, b2 = (svvv + svuu) / 2
    c = { x: mx + (b1 * svv - b2 * suv) / det, y: my + (b2 * suu - b1 * suv) / det }
  }
  const r = p.reduce((a, q) => a + dist(q, c), 0) / n
  return { c, r, erreur: p.reduce((a, q) => a + Math.abs(dist(q, c) - r), 0) / n / (r || 1) }
}

/** Combien le tracé tourne (en degrés) autour du sommet v, sur une courte distance */
function nettete(p: P[], v: P): number {
  const n = p.length - 1                 // le dernier point répète le premier
  let i0 = 0
  for (let i = 1; i < n; i++) if (dist(p[i], v) < dist(p[i0], v)) i0 = i
  const k = 4
  let max = 0
  for (let d = -2; d <= 2; d++) {
    const i = (i0 + d + n) % n
    const a = p[(i - k + n) % n], b = p[i], c = p[(i + k) % n]
    max = Math.max(max, 180 - angle(a, b, c))
  }
  return max
}

// =============================================================
// 2. CODAGE
// =============================================================
export interface Codage {
  traits: { a: P; b: P; n: number }[]          // côté [ab] marqué de n petits traits
  droits: { s: P; u: P; v: P }[]                // angle droit en s, entre les directions u et v
}

export function codageDe(f: Polygone): Codage {
  const s = sommetsDe(f), n = s.length
  const res: Codage = { traits: [], droits: [] }
  if (n < 2) return res
  const nb = f.ferme ? n : n - 1
  const cotes = Array.from({ length: nb }, (_, i) => ({ a: s[i], b: s[(i + 1) % n], l: dist(s[i], s[(i + 1) % n]) }))
  // Côtés de même longueur (à 1,5 % près) : 1, 2, 3… traits par groupe
  const groupe = new Array(nb).fill(-1)
  let g = 0
  for (let i = 0; i < nb; i++) {
    if (groupe[i] >= 0) continue
    const membres = [i]
    for (let j = i + 1; j < nb; j++) {
      if (groupe[j] < 0 && Math.abs(cotes[i].l - cotes[j].l) <= 0.015 * Math.max(cotes[i].l, cotes[j].l)) membres.push(j)
    }
    if (membres.length > 1) { g++; for (const m of membres) { groupe[m] = g; res.traits.push({ a: cotes[m].a, b: cotes[m].b, n: g }) } }
  }
  // Angles droits (à 1,5° près)
  for (let i = 0; i < n; i++) {
    if (!f.ferme && (i === 0 || i === n - 1)) continue
    const a = s[(i - 1 + n) % n], b = s[i], c = s[(i + 1) % n]
    if (Math.abs(angle(a, b, c) - 90) < 1.5) {
      const la = dist(a, b), lc = dist(c, b)
      res.droits.push({ s: b, u: { x: (a.x - b.x) / la, y: (a.y - b.y) / la }, v: { x: (c.x - b.x) / lc, y: (c.y - b.y) / lc } })
    }
  }
  return res
}

/** Où écrire le nom de chaque sommet : à l'extérieur, sur la bissectrice */
/** Écart entre un point et son nom, en unités monde : assez pour que la
 *  lettre ne touche ni la croix du point ni les côtés */
export const ECART_NOMS = 24

export function placesDesNoms(f: Polygone | Cercle, ecart = ECART_NOMS): P[] {
  const auto = placesAuto(f, ecart)
  const points = f.type === 'cercle' ? [{ x: f.x, y: f.y }] : sommetsDe(f)
  return auto.map((p, i) => {
    const o = f.posNoms?.[i]
    return o ? { x: points[i].x + o.x, y: points[i].y + o.y } : p
  })
}

/** Un nom tourne autour de son point, sans s'en éloigner ni le recouvrir */
export const ECART_NOM = { min: 14, max: 70 }
export function bornerDecalage(o: P): P {
  const l = Math.hypot(o.x, o.y) || 1
  const d = Math.max(ECART_NOM.min, Math.min(ECART_NOM.max, l))
  return { x: o.x / l * d, y: o.y / l * d }
}

function placesAuto(f: Polygone | Cercle, ecart: number): P[] {
  if (f.type === 'cercle') return [{ x: f.x - ecart * 0.7, y: f.y + ecart * 0.7 }]
  const s = sommetsDe(f), n = s.length
  const c = centreDe(f)
  return s.map((b, i) => {
    let d: P
    if (n === 1) return { x: b.x + ecart * 0.8, y: b.y - ecart * 0.8 }   // un point seul : en haut à droite
    else if (!f.ferme && (i === 0 || i === n - 1)) {
      const o = s[i === 0 ? 1 : n - 2]
      d = { x: b.x - o.x, y: b.y - o.y }
    } else {
      const a = s[(i - 1 + n) % n], e = s[(i + 1) % n]
      const la = dist(a, b) || 1, le = dist(e, b) || 1
      d = { x: -((a.x - b.x) / la + (e.x - b.x) / le), y: -((a.y - b.y) / la + (e.y - b.y) / le) }
      if (Math.hypot(d.x, d.y) < 0.1) d = { x: -(e.y - a.y), y: e.x - a.x }
      // Sommet rentrant : la bissectrice pointe vers l'intérieur, on la retourne
      if (f.ferme && (d.x * (b.x - c.x) + d.y * (b.y - c.y)) < 0) d = { x: -d.x, y: -d.y }
    }
    const l = Math.hypot(d.x, d.y) || 1
    return { x: b.x + d.x / l * ecart, y: b.y + d.y / l * ecart }
  })
}

// ---------- Noms ----------
const LETTRES = 'ABCDEFGHIJKLMNPQRSTUVWXYZ'      // O est gardé pour les centres

/** n noms libres sur la page, dans l'ordre alphabétique */
export function nomsLibres(n: number, formes: Forme[], centre = false): string[] {
  const pris = new Set<string>()
  for (const f of formes) if ((f.type === 'polygone' || f.type === 'cercle') && f.noms) f.noms.forEach(x => pris.add(x))
  if (centre) {
    for (const x of ['O', 'Ω', ...LETTRES]) if (!pris.has(x)) return [x]
  }
  const r: string[] = []
  for (let tour = 0; r.length < n; tour++) {
    for (const l of LETTRES) {
      const nom = tour ? l + '_' + tour : l
      if (!pris.has(nom)) r.push(nom)
      if (r.length === n) break
    }
  }
  return r
}

export const prime = (nom: string) => nom + "'"

// =============================================================
// 3. TRANSFORMATIONS
// =============================================================
export type Transformation =
  | { type: 'translation'; dx: number; dy: number }
  | { type: 'rotation'; c: P; angle: number }          // degrés, sens direct (à l'écran)
  | { type: 'symetrie-centrale'; c: P }
  | { type: 'symetrie-axiale'; a: P; b: P }
  | { type: 'homothetie'; c: P; k: number }

export function applicateur(t: Transformation): (p: P) => P {
  switch (t.type) {
    case 'translation': return p => ({ x: p.x + t.dx, y: p.y + t.dy })
    case 'symetrie-centrale': return p => ({ x: 2 * t.c.x - p.x, y: 2 * t.c.y - p.y })
    case 'homothetie': return p => ({ x: t.c.x + t.k * (p.x - t.c.x), y: t.c.y + t.k * (p.y - t.c.y) })
    case 'rotation': {
      // y vers le bas : le sens direct à l'écran est l'inverse du sens du repère monde
      const co = Math.cos(t.angle * DEG), si = Math.sin(t.angle * DEG)
      return p => {
        const dx = p.x - t.c.x, dy = p.y - t.c.y
        return { x: t.c.x + dx * co + dy * si, y: t.c.y - dx * si + dy * co }
      }
    }
    case 'symetrie-axiale': {
      const l = dist(t.a, t.b) || 1
      const u = { x: (t.b.x - t.a.x) / l, y: (t.b.y - t.a.y) / l }
      return p => {
        const k = (p.x - t.a.x) * u.x + (p.y - t.a.y) * u.y
        const h = { x: t.a.x + k * u.x, y: t.a.y + k * u.y }
        return { x: 2 * h.x - p.x, y: 2 * h.y - p.y }
      }
    }
  }
}

/** L'image d'une forme : une nouvelle forme, aux noms « primés ». */
export function image(f: Forme, t: Transformation, auteur: string): Forme {
  const g = applicateur(t)
  const base = { id: uid(), z: Date.now(), auteur }
  switch (f.type) {
    case 'image': {
      // On transforme le coin et les deux côtés : la symétrie retourne l'image
      const o = g({ x: f.x, y: f.y })
      const [a, b, c, d] = f.m
      const u = g({ x: f.x + a, y: f.y + b }), v = g({ x: f.x + c, y: f.y + d })
      return { ...f, ...base, x: o.x, y: o.y, m: [u.x - o.x, u.y - o.y, v.x - o.x, v.y - o.y] }
    }
    case 'polygone': {
      const r = versRelatif(sommetsDe(f).map(g))
      const { brut: _, ...reste } = f
      return { ...reste, ...base, ...r, noms: f.noms?.map(prime), posNoms: decalagesImages(f, g) }
    }
    case 'cercle': {
      const c = g({ x: f.x, y: f.y })
      const { brut: _, ...reste } = f
      let arc = f.arc
      if (arc) {
        // L'image d'un arc : on suit son point de départ ; une symétrie axiale
        // renverse le sens de parcours, les autres transformations le gardent
        const d = g({ x: f.x + Math.cos(arc.a0), y: f.y + Math.sin(arc.a0) })
        const a0 = Math.atan2(d.y - c.y, d.x - c.x)
        const sens = t.type === 'symetrie-axiale' ? -1 : 1
        arc = { a0, a1: a0 + sens * (arc.a1 - arc.a0) }
      }
      return { ...reste, ...base, arc, x: c.x, y: c.y, r: f.r * (t.type === 'homothetie' ? Math.abs(t.k) : 1), noms: f.noms?.map(prime), posNoms: decalagesImages(f, g) }
    }
    case 'trait': {
      const abs: P[] = []
      for (let i = 0; i + 2 < f.pts.length; i += 3) abs.push(g({ x: f.x + f.pts[i], y: f.y + f.pts[i + 1] }))
      const o = abs[0]
      const pts: number[] = []
      abs.forEach((p, i) => pts.push(Math.round((p.x - o.x) * 10) / 10, Math.round((p.y - o.y) * 10) / 10, f.pts[i * 3 + 2]))
      return { ...f, ...base, x: o.x, y: o.y, pts }
    }
    case 'segment': {
      const a = g({ x: f.x, y: f.y }), b = g({ x: f.x + f.dx, y: f.y + f.dy })
      return { ...f, ...base, x: a.x, y: a.y, dx: b.x - a.x, dy: b.y - a.y }
    }
    case 'formule': {
      const a = g({ x: f.x, y: f.y })
      return { ...f, ...base, x: a.x, y: a.y }
    }
  }
}

/** Un nom déplacé à la main suit la transformation : le symétrique de « A
 *  au-dessus à gauche » est « A' au-dessus à droite ». Même écart au point. */
function decalagesImages(f: Polygone | Cercle, g: (p: P) => P) {
  if (!f.posNoms) return undefined
  const points = f.type === 'cercle' ? [{ x: f.x, y: f.y }] : sommetsDe(f)
  return f.posNoms.map((o, i) => {
    if (!o) return null
    const a = g(points[i]), b = g({ x: points[i].x + o.x, y: points[i].y + o.y })
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1, d = Math.hypot(o.x, o.y)
    return { x: (b.x - a.x) / l * d, y: (b.y - a.y) / l * d }
  })
}

/** Points remarquables d'une forme, pour choisir un centre */
export function pointsDe(f: Forme): { nom: string; p: P }[] {
  if (f.type === 'polygone') {
    const s = sommetsDe(f)
    return s.map((p, i) => ({ nom: f.noms?.[i] ? 'Sommet ' + f.noms[i] : 'Sommet n° ' + (i + 1), p }))
  }
  return []
}
