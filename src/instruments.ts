// =============================================================
// LES INSTRUMENTS : RÈGLE, ÉQUERRE, RAPPORTEUR, COMPAS
// Ce ne sont pas des formes du tableau : on les pose, on les tourne,
// on s'en sert, et ils restent là où on les a laissés. Ils ne
// s'effacent pas et ne passent pas dans l'annulation.
//
// Chacun a une ORIGINE, d'où l'on mesure : le zéro de la règle, le
// coin droit de l'équerre, le centre du rapporteur, la pointe du compas.
// C'est autour d'elle qu'il tourne, et c'est elle qui s'accroche aux
// points de la figure quand on le pose.
//
// Repère de l'instrument : u le long de son bord, v à 90° (vers le bas
// de l'écran quand l'instrument est droit). Coordonnées monde, 40 = 1 cm.
// =============================================================
import { CM } from './types'

export type NomInstrument = 'regle' | 'equerre' | 'rapporteur' | 'compas'
export const INSTRUMENTS: { id: NomInstrument; nom: string }[] = [
  { id: 'regle', nom: 'Règle' },
  { id: 'equerre', nom: 'Équerre' },
  { id: 'rapporteur', nom: 'Rapporteur' },
  { id: 'compas', nom: 'Compas' },
]

/** Position (de l'origine), angle (radians) ; pour le compas, r = écartement */
export interface EtatInstrument { x: number; y: number; a: number; r: number }

/** Ce qu'on attrape : le corps (déplacer), la poignée (tourner) ;
 *  pour le compas, la pointe, la mine (écarter) ou la tête (tracer) */
export type Partie = 'corps' | 'rotation' | 'pointe' | 'mine' | 'tete'

type P = { x: number; y: number }

const REGLE = { debut: -0.6 * CM, l: 20 * CM, fin: 20.6 * CM, largeur: 2.6 * CM }
const EQUERRE = { a: 12 * CM, b: 7 * CM }
const RAPPORTEUR = { r: 6 * CM }
const PLASTIQUE = 'rgba(214, 230, 250, 0.62)'
const BORD = 'rgba(40, 70, 120, 0.85)'
const ENCRE = '#1b2a44'

export function etatParDefaut(nom: NomInstrument, centre: P): EtatInstrument {
  switch (nom) {
    // Chacun à sa place dans la vue, pour qu'ils ne s'empilent pas
    case 'regle': return { x: centre.x - REGLE.l / 2, y: centre.y + 4.5 * CM, a: 0, r: 0 }
    case 'equerre': return { x: centre.x - 13 * CM, y: centre.y + 2.5 * CM, a: 0, r: 0 }
    case 'rapporteur': return { x: centre.x + 8 * CM, y: centre.y + 2.5 * CM, a: 0, r: 0 }
    case 'compas': return { x: centre.x - 2 * CM, y: centre.y + 1 * CM, a: 0, r: 4 * CM }
  }
}

// ---------- Repère ----------
function repere(e: EtatInstrument) {
  const u = { x: Math.cos(e.a), y: Math.sin(e.a) }, v = { x: -u.y, y: u.x }
  const pt = (s: number, t: number): P => ({ x: e.x + u.x * s + v.x * t, y: e.y + u.y * s + v.y * t })
  return { u, v, pt }
}

/** Le contour du corps (pour savoir si on le touche) */
function contour(nom: NomInstrument, e: EtatInstrument): P[] {
  const { pt } = repere(e)
  switch (nom) {
    case 'regle': return [pt(REGLE.debut, 0), pt(REGLE.fin, 0), pt(REGLE.fin, REGLE.largeur), pt(REGLE.debut, REGLE.largeur)]
    case 'equerre': return [pt(0, 0), pt(EQUERRE.a, 0), pt(0, -EQUERRE.b)]
    case 'rapporteur': {
      const r: P[] = [pt(-RAPPORTEUR.r, 0.35 * CM)]
      for (let k = 0; k <= 36; k++) { const f = Math.PI * k / 36; r.push(pt(-Math.cos(f) * RAPPORTEUR.r, -Math.sin(f) * RAPPORTEUR.r)) }
      r.push(pt(RAPPORTEUR.r, 0.35 * CM))
      return r
    }
    case 'compas': return []
  }
}

/** Où l'on attrape pour tourner l'instrument */
function poigneeRotation(nom: NomInstrument, e: EtatInstrument): P {
  const { pt } = repere(e)
  if (nom === 'regle') return pt(REGLE.fin + 0.9 * CM, REGLE.largeur / 2)
  if (nom === 'equerre') return pt(EQUERRE.a - 1.6 * CM, -0.55 * CM)
  return pt(RAPPORTEUR.r + 0.9 * CM, 0)
}

// ---------- Le compas ----------
/** Pointe, mine, charnière et tête (la molette qu'on tourne) */
export function partiesDuCompas(e: EtatInstrument) {
  const P = { x: e.x, y: e.y }
  const M = { x: e.x + e.r * Math.cos(e.a), y: e.y + e.r * Math.sin(e.a) }
  const jambe = Math.max(8 * CM, e.r / 2 + 0.6 * CM)
  const h = Math.sqrt(Math.max(0, jambe * jambe - (e.r / 2) ** 2))
  // La charnière est du côté du haut de l'écran
  let n = { x: Math.sin(e.a), y: -Math.cos(e.a) }
  if (n.y > 0) n = { x: -n.x, y: -n.y }
  const milieu = { x: (P.x + M.x) / 2, y: (P.y + M.y) / 2 }
  const H = { x: milieu.x + n.x * h, y: milieu.y + n.y * h }
  const T = { x: H.x + n.x * 1.1 * CM, y: H.y + n.y * 1.1 * CM }
  return { P, M, H, T, n }
}

// ---------- Ce que touche le pointeur ----------
const dist = (a: P, b: P) => Math.hypot(a.x - b.x, a.y - b.y)

function dedans(p: P, poly: P[]) {
  let oui = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) oui = !oui
  }
  return oui
}

function distanceAuSegment(p: P, a: P, b: P) {
  const vx = b.x - a.x, vy = b.y - a.y, l2 = vx * vx + vy * vy
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / l2)) : 0
  return Math.hypot(p.x - a.x - t * vx, p.y - a.y - t * vy)
}

/** `rayon` : la portée de la main, en unités monde */
export function toucher(nom: NomInstrument, e: EtatInstrument, w: P, rayon: number): Partie | null {
  if (nom === 'compas') {
    const c = partiesDuCompas(e)
    if (dist(w, c.T) < rayon * 1.6) return 'tete'
    if (dist(w, c.M) < rayon * 1.3) return 'mine'
    if (dist(w, c.P) < rayon * 1.3) return 'pointe'
    if (distanceAuSegment(w, c.H, c.P) < rayon || distanceAuSegment(w, c.H, c.M) < rayon || dist(w, c.H) < rayon * 1.5) return 'corps'
    return null
  }
  if (dist(w, poigneeRotation(nom, e)) < rayon * 1.4) return 'rotation'
  return dedans(w, contour(nom, e)) ? 'corps' : null
}

/** Un bord droit, le long duquel le crayon glisse. `gradue` : on y lit des
 *  centimètres depuis l'origine `o`. */
export interface Bord { o: P; u: P; debut: number; fin: number; gradue: boolean }

export function bords(nom: NomInstrument, e: EtatInstrument): Bord[] {
  const { u, v, pt } = repere(e)
  const o = pt(0, 0)
  switch (nom) {
    case 'regle': return [{ o, u, debut: REGLE.debut, fin: REGLE.fin, gradue: true }]
    case 'equerre': {
      const A = pt(EQUERRE.a, 0), B = pt(0, -EQUERRE.b), l = dist(A, B)
      return [
        { o, u, debut: 0, fin: EQUERRE.a, gradue: true },
        { o, u: { x: -v.x, y: -v.y }, debut: 0, fin: EQUERRE.b, gradue: true },
        { o: B, u: { x: (A.x - B.x) / l, y: (A.y - B.y) / l }, debut: 0, fin: l, gradue: false },
      ]
    }
    case 'rapporteur': return [{ o, u, debut: -RAPPORTEUR.r, fin: RAPPORTEUR.r, gradue: true }]
    case 'compas': return []
  }
}

// ---------- Dessin ----------
export function dessinerInstrument(c: CanvasRenderingContext2D, nom: NomInstrument, e: EtatInstrument, z: number, actif: Partie | null) {
  c.save()
  c.lineJoin = 'round'; c.lineCap = 'round'
  if (nom === 'compas') dessinerCompas(c, e, z, actif)
  else {
    const corps = contour(nom, e)
    c.beginPath(); corps.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.closePath()
    c.fillStyle = PLASTIQUE; c.fill()
    c.strokeStyle = BORD; c.lineWidth = 1.4 / z; c.stroke()
    if (nom === 'regle') graduerRegle(c, e, z)
    else if (nom === 'equerre') graduerEquerre(c, e, z)
    else graduerRapporteur(c, e, z)
    poignee(c, poigneeRotation(nom, e), z, actif === 'rotation', 'rotation')
  }
  c.restore()
}

/** Graduations le long de l'axe s (de l'origine), traits vers `dedans` */
function graduer(c: CanvasRenderingContext2D, e: EtatInstrument, z: number, longueur: number, dir: P, dedans: P, chiffres: boolean) {
  const o = { x: e.x, y: e.y }
  const mmVisibles = 4 * z >= 3                 // un millimètre fait-il au moins 3 pixels ?
  c.strokeStyle = ENCRE; c.fillStyle = ENCRE
  c.beginPath()
  for (let mm = 0; mm <= Math.round(longueur / 4); mm++) {
    const cm = mm % 10 === 0, demi = mm % 5 === 0
    if (!cm && !demi && !mmVisibles) continue
    const l = cm ? 0.55 * CM : demi ? 0.38 * CM : 0.22 * CM
    const p = { x: o.x + dir.x * mm * 4, y: o.y + dir.y * mm * 4 }
    c.moveTo(p.x, p.y); c.lineTo(p.x + dedans.x * l, p.y + dedans.y * l)
  }
  c.lineWidth = 1 / z; c.stroke()
  if (!chiffres) return
  c.font = `600 ${0.36 * CM}px "Atkinson Hyperlegible", system-ui, sans-serif`
  c.textAlign = 'center'; c.textBaseline = 'middle'
  const angle = Math.atan2(dir.y, dir.x)
  for (let k = 0; k * CM <= longueur + 1; k++) {
    const p = { x: o.x + dir.x * k * CM + dedans.x * 0.85 * CM, y: o.y + dir.y * k * CM + dedans.y * 0.85 * CM }
    c.save(); c.translate(p.x, p.y); c.rotate(angle); c.fillText(String(k), 0, 0); c.restore()
  }
}

function graduerRegle(c: CanvasRenderingContext2D, e: EtatInstrument, z: number) {
  const { u, v } = repere(e)
  graduer(c, e, z, REGLE.l, u, v, true)
}

function graduerEquerre(c: CanvasRenderingContext2D, e: EtatInstrument, z: number) {
  const { u, v } = repere(e)
  const haut = { x: -v.x, y: -v.y }
  graduer(c, e, z, EQUERRE.a - 1 * CM, u, haut, true)
  graduer(c, e, z, EQUERRE.b - 1.8 * CM, haut, u, false)
  // Le petit carré de l'angle droit
  const k = 0.7 * CM, o = { x: e.x, y: e.y }
  c.beginPath()
  c.moveTo(o.x + u.x * k, o.y + u.y * k)
  c.lineTo(o.x + u.x * k + haut.x * k, o.y + u.y * k + haut.y * k)
  c.lineTo(o.x + haut.x * k, o.y + haut.y * k)
  c.strokeStyle = ENCRE; c.lineWidth = 1.2 / z; c.stroke()
}

function graduerRapporteur(c: CanvasRenderingContext2D, e: EtatInstrument, z: number) {
  const { u, v } = repere(e)
  const o = { x: e.x, y: e.y }, R = RAPPORTEUR.r
  // direction de l'angle φ, compté dans le sens direct depuis u
  const dir = (f: number) => ({ x: u.x * Math.cos(f) - v.x * Math.sin(f), y: u.y * Math.cos(f) - v.y * Math.sin(f) })
  c.strokeStyle = ENCRE; c.fillStyle = ENCRE
  c.beginPath()
  for (let d = 0; d <= 180; d++) {
    const l = d % 10 === 0 ? 0.6 * CM : d % 5 === 0 ? 0.4 * CM : 0.22 * CM
    if (d % 5 && R * Math.PI / 180 * z < 2.2) continue
    const w = dir(d * Math.PI / 180)
    c.moveTo(o.x + w.x * R, o.y + w.y * R); c.lineTo(o.x + w.x * (R - l), o.y + w.y * (R - l))
  }
  // Ligne de foi et centre
  c.moveTo(o.x - u.x * R, o.y - u.y * R); c.lineTo(o.x + u.x * R, o.y + u.y * R)
  const k = 0.3 * CM
  c.moveTo(o.x - v.x * k, o.y - v.y * k); c.lineTo(o.x + v.x * k * 0.5, o.y + v.y * k * 0.5)
  c.lineWidth = 1 / z; c.stroke()
  // Les deux échelles : 0 à droite (extérieure), 0 à gauche (intérieure)
  c.textAlign = 'center'; c.textBaseline = 'middle'
  for (let d = 0; d <= 180; d += 10) {
    const w = dir(d * Math.PI / 180), rot = Math.atan2(w.y, w.x) + Math.PI / 2
    for (const [rr, val, taille, gras] of [[R - 0.95 * CM, d, 0.32, 700], [R - 1.45 * CM, 180 - d, 0.26, 500]] as const) {
      c.font = `${gras} ${taille * CM}px "Atkinson Hyperlegible", system-ui, sans-serif`
      c.save(); c.translate(o.x + w.x * rr, o.y + w.y * rr); c.rotate(rot); c.fillText(String(val), 0, 0); c.restore()
    }
  }
}

function dessinerCompas(c: CanvasRenderingContext2D, e: EtatInstrument, z: number, actif: Partie | null) {
  const { P, M, H, T } = partiesDuCompas(e)
  // Les jambes : métal pour la pointe, bois et mine pour l'autre
  c.lineWidth = 0.32 * CM
  c.strokeStyle = 'rgba(110, 122, 140, 0.92)'
  c.beginPath(); c.moveTo(H.x, H.y); c.lineTo(P.x, P.y); c.stroke()
  c.strokeStyle = 'rgba(70, 110, 170, 0.92)'
  c.beginPath(); c.moveTo(H.x, H.y); c.lineTo(M.x, M.y); c.stroke()
  // La pointe et la mine, fines au bout
  c.lineWidth = 1.6 / z
  c.strokeStyle = '#2b2f36'
  for (const B of [P, M]) {
    const l = Math.hypot(H.x - B.x, H.y - B.y) || 1
    const k = Math.min(0.8 * CM, l / 4)
    c.beginPath(); c.moveTo(B.x + (H.x - B.x) / l * k, B.y + (H.y - B.y) / l * k); c.lineTo(B.x, B.y); c.stroke()
  }
  // Charnière et tête
  c.fillStyle = '#5b6b82'
  c.beginPath(); c.arc(H.x, H.y, 0.35 * CM, 0, Math.PI * 2); c.fill()
  c.strokeStyle = '#5b6b82'; c.lineWidth = 0.22 * CM
  c.beginPath(); c.moveTo(H.x, H.y); c.lineTo(T.x, T.y); c.stroke()
  poignee(c, T, z, actif === 'tete', 'tete')
  poignee(c, M, z, actif === 'mine', 'mine')
  // La pointe : un petit cercle là où elle pique
  c.strokeStyle = '#2b2f36'; c.lineWidth = 1.4 / z
  c.beginPath(); c.arc(P.x, P.y, 3 / z, 0, Math.PI * 2); c.stroke()
}

/** Une pastille qu'on attrape : flèche tournante (tourner, tracer) ou ↔ (écarter) */
function poignee(c: CanvasRenderingContext2D, p: P, z: number, actif: boolean, sorte: 'rotation' | 'tete' | 'mine') {
  const r = (sorte === 'mine' ? 8 : 11) / z
  c.save()
  c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2)
  c.fillStyle = actif ? '#3b6fb6' : '#ffffff'; c.fill()
  c.strokeStyle = '#3b6fb6'; c.lineWidth = 1.6 / z; c.stroke()
  c.strokeStyle = actif ? '#ffffff' : '#3b6fb6'; c.lineWidth = 1.5 / z
  c.beginPath()
  if (sorte === 'mine') { c.moveTo(p.x - r * 0.5, p.y); c.lineTo(p.x + r * 0.5, p.y) }
  else {
    c.arc(p.x, p.y, r * 0.5, -Math.PI * 0.9, Math.PI * 0.4)
    const a = Math.PI * 0.4, q = { x: p.x + Math.cos(a) * r * 0.5, y: p.y + Math.sin(a) * r * 0.5 }
    c.moveTo(q.x - r * 0.3, q.y); c.lineTo(q.x, q.y); c.lineTo(q.x, q.y - r * 0.3)
  }
  c.stroke()
  c.restore()
}

/** L'angle lisible d'un instrument (degrés, sens direct, 0 = horizontal) */
export function angleLisible(a: number) {
  const d = Math.round(((-a * 180 / Math.PI) % 360 + 360) % 360)
  return (d === 360 ? 0 : d) + '°'
}
