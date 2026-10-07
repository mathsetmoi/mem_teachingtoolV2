// =============================================================
// LES INSTRUMENTS AU REPLAY : LA PISTE, ET CE QU'ON EN REJOUE
// Au tableau, la règle se pose, le rapporteur tourne, le compas s'écarte
// puis trace son arc. Ce n'est pas le document (les instruments ne sont
// pas des formes) : c'est une PISTE à côté du film, qui note ce que la
// couche des instruments a montré, au temps réel.
//
// Le format : un MORCEAU est ce qu'un instrument a fait d'un seul tenant,
// sur une page. { t, p, n, c?, q?, v?, d } :
// - t : l'heure de la première pose (ms ; depuis 1970 dans la piste, depuis
//   l'image d'avant dans le film élève) ; p : la page (piste seulement) ;
// - n : l'instrument ; c : 1 s'il est mené par le constructeur ;
// - q : la partie tenue (corps, rotation, pointe, mine, tête), s'il y en a une ;
// - v : 0 s'il est rangé (pas de poses) ; s : 1 pour un « saut » (film
//   seulement) : l'état vrai remis en place, sans mouvement à montrer ;
// - d : les poses, à plat, des entiers : [dt, x, y, a, r] (r pour le compas
//   seulement). x, y, r en dixièmes d'unité monde, a en dix-millièmes de
//   radian. La première est absolue (dt = 0), les suivantes des écarts.
//   L'angle est « déroulé » : il ne saute jamais de 2π d'une pose à l'autre.
// Le tracé fait aux instruments (l'arc sous la mine, le trait le long de la
// règle) a ses propres morceaux : { t, p, k: 'arc' | 'seg', s: [couleur,
// taille], g, d }. Arc : g = [cx, cy, r, a0], d = [dt, a1]… ; segment :
// g = [ax, ay], d = [dt, zx, zy]… (écarts, comme les poses).
//
// Le rejeu : le geste aux instruments fait partie du tracé de l'image, comme
// le trait écrit à la main (voir main-levee.ts). Les mouvements passent à leur
// vitesse réelle, les petits arrêts d'une manipulation gardent leur rythme, les
// longs silences sont tassés comme partout.
// Tout est pur : rien ici ne dessine ni n'écrit.
// =============================================================
import type { EtatInstrument, NomInstrument, Partie } from '../instruments'
import type { Figure } from '../types'
import { COUDE, tasser } from './rythme'

// ---------- Le format ----------
export interface MorceauPoses {
  t: number
  p?: string
  n: NomInstrument
  c?: 1
  q?: Partie
  v?: 0
  s?: 1
  d: number[]
}
export interface MorceauTrace {
  t: number
  p?: string
  k: 'arc' | 'seg'
  s: [string, number]
  g: number[]
  d: number[]
}
export type Morceau = MorceauPoses | MorceauTrace

const NOMS: ReadonlySet<string> = new Set(['regle', 'equerre', 'rapporteur', 'compas'])
const PARTIES: ReadonlySet<string> = new Set(['corps', 'rotation', 'pointe', 'mine', 'tete'])

/** Les tolérances : deux poses plus proches que ceci sont la même à l'œil
 *  (0,5 unité = 0,12 mm ; 2 mrad) */
export const TOLERANCE = { xy: 0.5, a: 0.002, r: 0.5 }
/** Le plus grand entier accepté dans une pose (au-delà : un fichier abîmé) */
const BORNE = 1e10
/** Le plus long écart entre deux poses d'un morceau (ms) */
const DT_MAX = 600_000
/** Au plus tant d'entiers dans un morceau */
const LONGUEUR_MAX = 200_000

// ---------- Les poses en clair ----------
/** Une pose : l'heure (ms), la position de l'origine, l'angle, l'écartement */
export interface Pose { t: number; x: number; y: number; a: number; r: number }

/** Ramène un angle dans ]−π, π] */
export function enrouler(a: number): number {
  a = a % (2 * Math.PI)
  if (a > Math.PI) a -= 2 * Math.PI
  else if (a <= -Math.PI) a += 2 * Math.PI
  return a
}

const d10 = (v: number) => Math.round(v * 10)
const d4 = (a: number) => Math.round(a * 1e4)

/** Les poses d'un morceau, à plat (voir le format). Les heures sont arrondies
 *  depuis la première pose, pas d'un écart à l'autre : rien ne s'accumule. */
export function encoderPoses(poses: readonly Pose[], avecR: boolean): number[] {
  const d: number[] = []
  if (!poses.length) return d
  const t0 = poses[0].t
  let pt = 0, px = 0, py = 0, pa = 0, pr = 0
  poses.forEach((p, i) => {
    const t = Math.round(p.t - t0), x = d10(p.x), y = d10(p.y), a = d4(p.a), r = d10(p.r)
    if (i === 0) { d.push(0, x, y, a); if (avecR) d.push(r) }
    else { d.push(Math.max(0, t - pt), x - px, y - py, a - pa); if (avecR) d.push(r - pr) }
    pt = Math.max(pt, t); px = x; py = y; pa = a; pr = r
  })
  return d
}

/** Des entiers bornés ? */
function entiers(d: unknown, borne = BORNE): d is number[] {
  if (!Array.isArray(d) || d.length > LONGUEUR_MAX) return false
  for (const v of d) if (!Number.isInteger(v) || Math.abs(v) > borne) return false
  return true
}

/** Les poses relues (heures depuis la première pose). null : d est abîmé. */
export function decoderPoses(d: unknown, avecR: boolean): Pose[] | null {
  const pas = avecR ? 5 : 4
  if (!entiers(d) || !d.length || d.length % pas || d[0] !== 0) return null
  const r: Pose[] = []
  let t = 0, x = 0, y = 0, a = 0, rr = 0
  for (let i = 0; i < d.length; i += pas) {
    const dt = d[i]
    if (dt < 0 || dt > DT_MAX) return null
    t += dt; x += d[i + 1]; y += d[i + 2]; a += d[i + 3]; if (avecR) rr += d[i + 4]
    if (Math.abs(x) > BORNE || Math.abs(y) > BORNE || Math.abs(a) > BORNE || Math.abs(rr) > BORNE || rr < 0) return null
    r.push({ t, x: x / 10, y: y / 10, a: a / 1e4, r: rr / 10 })
  }
  return r
}

/** Un échantillon de tracé : l'heure (ms), et a1 (arc) ou [zx, zy] (segment) */
export interface Echantillon { t: number; v: number[] }

/** Les échantillons d'un tracé, à plat. `angle` : une seule valeur, en radians (l'arc) */
export function encoderTrace(ech: readonly Echantillon[], angle: boolean): number[] {
  const d: number[] = []
  if (!ech.length) return d
  const t0 = ech[0].t, q = angle ? d4 : d10
  let pt = 0, prec: number[] = []
  ech.forEach((e, i) => {
    const t = Math.round(e.t - t0), v = e.v.map(q)
    if (i === 0) d.push(0, ...v)
    else d.push(Math.max(0, t - pt), ...v.map((x, j) => x - prec[j]))
    pt = Math.max(pt, t); prec = v
  })
  return d
}

function decoderTrace(d: unknown, angle: boolean): Echantillon[] | null {
  const n = angle ? 1 : 2, pas = n + 1
  if (!entiers(d) || !d.length || d.length % pas || d[0] !== 0) return null
  const r: Echantillon[] = []
  let t = 0
  const v = new Array<number>(n).fill(0)
  for (let i = 0; i < d.length; i += pas) {
    if (d[i] < 0 || d[i] > DT_MAX) return null
    t += d[i]
    for (let j = 0; j < n; j++) v[j] += d[i + 1 + j]
    r.push({ t, v: v.map(x => angle ? x / 1e4 : x / 10) })
  }
  return r
}

// ---------- Les morceaux relus ----------
/** Un morceau de poses relu : ses poses datées sur l'horloge de la piste (ou du film) */
export interface Piece {
  cle: string                 // l'instrument : son nom, suivi de « + » s'il est au constructeur
  n: NomInstrument
  c: boolean
  q: Partie | null
  visible: boolean
  saut: boolean
  p: string | null
  t0: number
  poses: Pose[]               // vide si l'instrument est rangé
}
/** Un morceau de tracé relu */
export interface PieceTrace {
  p: string | null
  t0: number
  k: 'arc' | 'seg'
  couleur: string
  taille: number
  g: number[]                 // en clair : [cx, cy, r, a0] ou [ax, ay]
  ech: Echantillon[]          // datés sur l'horloge de la piste (ou du film)
}

export const cleDe = (n: NomInstrument, c: boolean) => c ? n + '+' : n

/** Relit un morceau ; null s'il est abîmé. `relatif` : t est un écart (film élève), borné */
export function lireMorceau(m: unknown, relatif = false): Piece | PieceTrace | null {
  if (!m || typeof m !== 'object') return null
  const o = m as Record<string, unknown>
  const t = o.t
  if (typeof t !== 'number' || !Number.isFinite(t) || (relatif && (t < 0 || t > 1e9))) return null
  const p = typeof o.p === 'string' ? o.p : null
  if (o.p !== undefined && p === null) return null
  if (o.k !== undefined) {
    if (o.k !== 'arc' && o.k !== 'seg') return null
    const s = o.s
    if (!Array.isArray(s) || s.length !== 2 || typeof s[0] !== 'string' || s[0].length > 64 || typeof s[1] !== 'number' || !(s[1] > 0 && s[1] <= 100)) return null
    const arc = o.k === 'arc'
    if (!entiers(o.g) || o.g.length !== (arc ? 4 : 2)) return null
    if (arc && o.g[2] < 0) return null
    const ech = decoderTrace(o.d, arc)
    if (!ech) return null
    const g = o.g.map((v, i) => arc && i === 3 ? v / 1e4 : v / 10)
    return { p, t0: t, k: o.k, couleur: s[0], taille: s[1], g, ech: ech.map(e => ({ t: t + e.t, v: e.v })) }
  }
  if (typeof o.n !== 'string' || !NOMS.has(o.n)) return null
  if (o.c !== undefined && o.c !== 1) return null
  if (o.q !== undefined && (typeof o.q !== 'string' || !PARTIES.has(o.q))) return null
  if (o.v !== undefined && o.v !== 0) return null
  if (o.s !== undefined && o.s !== 1) return null
  const n = o.n as NomInstrument, c = o.c === 1
  if (o.v === 0) {
    if (o.d !== undefined && !(Array.isArray(o.d) && o.d.length === 0)) return null
    return { cle: cleDe(n, c), n, c, q: null, visible: false, saut: o.s === 1, p, t0: t, poses: [] }
  }
  const poses = decoderPoses(o.d, n === 'compas')
  if (!poses) return null
  return { cle: cleDe(n, c), n, c, q: (o.q as Partie | undefined) ?? null, visible: true, saut: o.s === 1, p, t0: t, poses: poses.map(x => ({ ...x, t: t + x.t })) }
}

/** Le morceau à écrire pour une pièce (dans le film : t devient un écart depuis `origine`, sans page) */
export function ecrireMorceau(x: Piece | PieceTrace, origine = 0, avecPage = false): Morceau {
  const t = Math.round(x.t0 - origine)
  if ('k' in x) {
    const arc = x.k === 'arc'
    const m: MorceauTrace = { t, k: x.k, s: [x.couleur, x.taille], g: x.g.map((v, i) => arc && i === 3 ? d4(v) : d10(v)), d: encoderTrace(x.ech, arc) }
    if (avecPage && x.p !== null) m.p = x.p
    return m
  }
  const m: MorceauPoses = { t, n: x.n, d: x.visible ? encoderPoses(x.poses, x.n === 'compas') : [] }
  if (avecPage && x.p !== null) m.p = x.p
  if (x.c) m.c = 1
  if (x.q) m.q = x.q
  if (!x.visible) m.v = 0
  if (x.saut) m.s = 1
  // L'ordre des clés ne compte pas pour le lecteur ; d en dernier se lit mieux
  const { d, ...reste } = m
  return { ...reste, d }
}

// ---------- L'état des instruments ----------
/** Un instrument tel qu'on le voit : où il est, ce qu'on en tient, et son rang
 *  dans la pile (le plus grand est dessus : le dernier montré ou pris) */
export interface InstrumentVu { n: NomInstrument; c: boolean; etat: EtatInstrument; q: Partie | null; rang: number }
export type EtatInstruments = Map<string, InstrumentVu>

/** La pose d'une pièce à l'instant t : interpolée entre deux poses, tenue avant et après */
export function poseA(poses: readonly Pose[], t: number): Pose {
  const n = poses.length
  if (t <= poses[0].t) return poses[0]
  if (t >= poses[n - 1].t) return poses[n - 1]
  let bas = 0, haut = n - 1
  while (haut - bas > 1) { const m = (bas + haut) >> 1; if (poses[m].t <= t) bas = m; else haut = m }
  const a = poses[bas], b = poses[haut], u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1
  return { t, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, a: a.a + (b.a - a.a) * u, r: a.r + (b.r - a.r) * u }
}

const etatDe = (p: Pose): EtatInstrument => ({ x: p.x, y: p.y, a: p.a, r: p.r })

/** Deux états pareils à l'œil (même position à 0,5 unité près, même angle à 2 mrad près, à un tour près) */
export function memeEtat(a: EtatInstrument, b: EtatInstrument): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= TOLERANCE.xy && Math.abs(enrouler(a.a - b.a)) <= TOLERANCE.a && Math.abs(a.r - b.r) <= TOLERANCE.r
}

/** Les pièces d'un instrument, rangées par heure, pour trouver vite celle qui vaut à un instant */
interface Fil { pieces: Piece[]; t0: number[]; rangs: number[] }

/** Un index des pièces : l'état des instruments à n'importe quel instant,
 *  depuis un état de départ (`base`). Une pièce prise en main (q) ou qui fait
 *  paraître son instrument le fait passer dessus. */
export class IndexPieces {
  private fils = new Map<string, Fil>()
  readonly pieces: Piece[]
  constructor(pieces: readonly Piece[], readonly base: EtatInstruments = new Map()) {
    this.pieces = [...pieces].sort((a, b) => a.t0 - b.t0)
    let rang = 0
    for (const i of base.values()) rang = Math.max(rang, i.rang)
    const visibles = new Set(base.keys())
    for (const x of this.pieces) {
      let f = this.fils.get(x.cle)
      if (!f) { f = { pieces: [], t0: [], rangs: [] }; this.fils.set(x.cle, f) }
      const avant = f.rangs.length ? f.rangs[f.rangs.length - 1] : base.get(x.cle)?.rang ?? 0
      const promue = x.visible && (x.q !== null || !visibles.has(x.cle))
      if (x.visible) visibles.add(x.cle); else visibles.delete(x.cle)
      f.pieces.push(x); f.t0.push(x.t0); f.rangs.push(promue ? ++rang : avant)
    }
  }

  /** L'état des instruments à l'instant t (les pièces commencées à t ou avant) */
  etatA(t: number): EtatInstruments {
    const r: EtatInstruments = new Map(this.base)
    for (const [cle, f] of this.fils) {
      let bas = 0, haut = f.t0.length - 1, i = -1
      while (bas <= haut) { const m = (bas + haut) >> 1; if (f.t0[m] <= t) { i = m; bas = m + 1 } else haut = m - 1 }
      if (i < 0) continue
      const x = f.pieces[i]
      if (!x.visible) { r.delete(cle); continue }
      r.set(cle, { n: x.n, c: x.c, etat: etatDe(poseA(x.poses, t)), q: x.q, rang: f.rangs[i] })
    }
    return r
  }

  /** L'état au bout de toutes les pièces */
  get fin(): EtatInstruments { return this.etatA(Infinity) }
}

/** Deux états pareils à l'œil : les mêmes instruments, aux mêmes poses */
export function memesEtats(a: EtatInstruments, b: EtatInstruments): boolean {
  if (a.size !== b.size) return false
  for (const [cle, x] of a) {
    const y = b.get(cle)
    if (!y || !memeEtat(x.etat, y.etat)) return false
  }
  return true
}

/** Les instruments d'un état dans l'ordre où on les dessine : ceux du
 *  professeur, puis ceux du constructeur, chacun par rang */
export function dansLOrdre(e: EtatInstruments): { prof: InstrumentVu[]; constructeur: InstrumentVu[] } {
  const tous = [...e.values()].sort((a, b) => a.rang - b.rang)
  return { prof: tous.filter(i => !i.c), constructeur: tous.filter(i => i.c) }
}

// ---------- La piste du tableau ----------
/** Couper une pièce à la fenêtre ]a, b] : ce qui en tombe dedans, avec une
 *  pose interpolée à chaque bord qu'elle déborde. null : rien dedans. */
export function couper(x: Piece, a: number, b: number): Piece | null {
  if (!x.visible || x.poses.length < 2) return x.t0 > a && x.t0 <= b ? x : null
  const premiere = x.poses[0].t, derniere = x.poses[x.poses.length - 1].t
  if (derniere <= a || premiere > b) return null
  const poses: Pose[] = []
  if (premiere <= a) poses.push({ ...poseA(x.poses, a), t: a })
  for (const p of x.poses) if (p.t > a && p.t <= b) poses.push(p)
  if (derniere > b && poses[poses.length - 1]?.t !== b) poses.push({ ...poseA(x.poses, b), t: b })
  return { ...x, t0: poses[0].t, poses }
}

/** Couper un tracé à la fenêtre ]a, b] */
export function couperTrace(x: PieceTrace, a: number, b: number): PieceTrace | null {
  const e = x.ech, premiere = e[0].t, derniere = e[e.length - 1].t
  if (e.length < 2) return premiere > a && premiere <= b ? x : null
  if (derniere <= a || premiere > b) return null
  const val = (t: number) => {
    let i = 0
    while (i + 1 < e.length && e[i + 1].t <= t) i++
    if (i + 1 >= e.length) return e[i].v
    const u = (t - e[i].t) / Math.max(1e-9, e[i + 1].t - e[i].t)
    return e[i].v.map((v, j) => v + (e[i + 1].v[j] - v) * u)
  }
  const ech: Echantillon[] = []
  if (premiere <= a) ech.push({ t: a, v: val(a) })
  for (const s of e) if (s.t > a && s.t <= b) ech.push(s)
  if (derniere > b && ech[ech.length - 1]?.t !== b) ech.push({ t: b, v: val(b) })
  return { ...x, t0: ech[0].t, ech }
}

/** La piste du tableau, relue : on la lit une fois, et l'on y cherche l'état
 *  des instruments à une heure donnée, ou ce qu'ils ont fait entre deux heures.
 *  Un morceau abîmé est laissé de côté (les autres valent). */
export class LecturePiste {
  readonly poses: Piece[] = []
  readonly traces: PieceTrace[] = []
  private index: IndexPieces
  /** La plus longue durée d'un morceau : un morceau qui touche ]a, b] commence après a − elle */
  private plusLong = { poses: 0, traces: 0 }
  constructor(morceaux: readonly unknown[]) {
    for (const m of morceaux) {
      const x = lireMorceau(m)
      if (!x) continue
      if ('k' in x) { this.traces.push(x); this.plusLong.traces = Math.max(this.plusLong.traces, x.ech[x.ech.length - 1].t - x.t0) }
      else { this.poses.push(x); if (x.poses.length) this.plusLong.poses = Math.max(this.plusLong.poses, x.poses[x.poses.length - 1].t - x.t0) }
    }
    this.traces.sort((a, b) => a.t0 - b.t0)
    this.index = new IndexPieces(this.poses)
    this.poses = this.index.pieces
  }

  /** Le premier indice d'une liste triée par t0 dont le t0 est ≥ t */
  private static depuis(l: readonly { t0: number }[], t: number): number {
    let bas = 0, haut = l.length
    while (bas < haut) { const m = (bas + haut) >> 1; if (l[m].t0 < t) bas = m + 1; else haut = m }
    return bas
  }

  get vide() { return !this.poses.length && !this.traces.length }

  /** L'état des instruments à l'heure T (ms depuis 1970) */
  etatA(T: number): EtatInstruments { return this.index.etatA(T) }

  /** Ce que les instruments ont fait dans ]a, b], sur la page p (null : toutes),
   *  coupé aux bords de la fenêtre */
  dans(a: number, b: number, p: string | null = null): { poses: Piece[]; traces: PieceTrace[] } {
    const poses: Piece[] = [], traces: PieceTrace[] = []
    for (let i = LecturePiste.depuis(this.poses, a - this.plusLong.poses - 1); i < this.poses.length; i++) {
      const x = this.poses[i]
      if (x.t0 > b) break
      if (p !== null && x.p !== p) continue
      const c = couper(x, a, b)
      if (c) poses.push(c)
    }
    for (let i = LecturePiste.depuis(this.traces, a - this.plusLong.traces - 1); i < this.traces.length; i++) {
      const x = this.traces[i]
      if (x.t0 > b) break
      if (p !== null && x.p !== p) continue
      const c = couperTrace(x, a, b)
      if (c) traces.push(c)
    }
    return { poses, traces }
  }

  /** Ce que les instruments ont fait dans ]a, b] sur la page p, daté depuis a
   *  (ce qu'attend horaire) */
  fenetre(a: number, b: number, p: string): { poses: Piece[]; traces: PieceTrace[] } {
    const d = this.dans(a, b, p)
    return {
      poses: d.poses.map(x => ({ ...x, t0: x.t0 - a, poses: x.poses.map(q => ({ ...q, t: q.t - a })) })),
      traces: d.traces.map(x => ({ ...x, t0: x.t0 - a, ech: x.ech.map(e => ({ t: e.t - a, v: e.v })) })),
    }
  }

  /** L'heure du premier morceau de la page p dans ]a, b] (null : aucun) */
  premierDans(a: number, b: number, p: string): number | null {
    const d = this.dans(a, b, p)
    let t = Infinity
    for (const x of d.poses) t = Math.min(t, x.t0)
    for (const x of d.traces) t = Math.min(t, x.t0)
    return t === Infinity ? null : t
  }
}

// ---------- Le rejeu d'une image ----------
/** Ce que les instruments font avant une image du replay, tel qu'on le montre.
 *  τ : le temps montré depuis le début de la manipulation (ms, allure Normale). */
export interface GesteAuxInstruments {
  /** L'attente montrée avant la manipulation (le silence d'avant, tassé) */
  attente: number
  /** La durée montrée de la manipulation (sans le trait écrit à la main qui peut suivre) */
  duree: number
  /** Le temps réel où rien n'a bougé dans la fenêtre (ms) : pour les pas de la revue */
  immobile: number
  /** L'état au début de la manipulation, et à la fin */
  depart: EtatInstruments
  fin: EtatInstruments
  etatA(tau: number): EtatInstruments
  /** Le tracé en cours sous l'instrument à l'instant τ (null : aucun) */
  apercuA(tau: number): Figure | null
  /** Les figures tracées sous les instruments pendant la manipulation, finies */
  traces: Figure[]
  /** L'instant réel (ms depuis le début de la fenêtre) que montre τ */
  instant(tau: number): number
}

/** La figure d'un tracé quand son échantillon vaut v */
function figureDuTrace(x: PieceTrace, v: number[]): Figure {
  const base = { id: 'apercu-instrument', z: 0, auteur: '', couleur: x.couleur, taille: x.taille }
  if (x.k === 'arc') {
    const [cx, cy, r, a0] = x.g, a1 = v[0]
    const f: Figure = { ...base, type: 'cercle', x: cx, y: cy, r }
    // Le tour complet donne le cercle, comme au tableau
    if (Math.abs(a1 - a0) < 2 * Math.PI - 0.02) f.arc = { a0, a1 }
    return f
  }
  const [ax, ay] = x.g
  return { ...base, type: 'polygone', ferme: false, x: ax, y: ay, pts: [0, 0, Math.round((v[0] - ax) * 10) / 10, Math.round((v[1] - ay) * 10) / 10] }
}

/** La valeur d'un tracé à l'instant t (null : il n'est pas en cours) */
function valeurDuTrace(x: PieceTrace, t: number): number[] | null {
  const e = x.ech
  if (t < e[0].t || t > e[e.length - 1].t) return null
  let bas = 0, haut = e.length - 1
  while (haut - bas > 1) { const m = (bas + haut) >> 1; if (e[m].t <= t) bas = m; else haut = m }
  const a = e[bas], b = e[haut]
  if (b.t <= a.t || t <= a.t) return a.v
  const u = (t - a.t) / (b.t - a.t)
  return a.v.map((v, j) => v + (b.v[j] - v) * u)
}

/** Une pièce bouge-t-elle (au moins deux poses différentes) ? */
function bouge(x: Piece): boolean {
  const p0 = x.poses[0]
  for (const p of x.poses) if (p.x !== p0.x || p.y !== p0.y || p.a !== p0.a || p.r !== p0.r) return true
  return false
}

/** Le rejeu d'une fenêtre : ce que les instruments y font, sur le temps
 *  montré. `poses`, `traces` : les pièces de la fenêtre, datées depuis son
 *  début (ms) ; `base` : l'état au début ; W : la durée réelle de la fenêtre ;
 *  `vecue` : la durée du trait écrit à la main qui la finit (0 : aucun) ;
 *  `plancher` : l'attente la plus courte. null : rien n'y bouge, l'image se
 *  rejoue comme avant (l'attente et le tracé restent ceux d'aujourd'hui).
 *
 *  Les ÉVÉNEMENTS sont les mouvements, les apparitions, les rangements et les
 *  tracés ; pas les sauts, ni le seul changement de la partie tenue (la
 *  pastille qui s'éteint au lever). Les temps immobiles entre eux (G0 avant le
 *  premier, puis G1… jusqu'au poser du trait ou au geste) : les courts (au
 *  plus COUDE) sont gardés tels quels ; les longs se partagent, au prorata, un
 *  seul silence tassé (un long silence coupé en deux par un geste ne compte
 *  pas double). L'attente est la part de G0 ; la manipulation, le reste. */
export function horaire(poses: readonly Piece[], traces: readonly PieceTrace[], base: EtatInstruments, W: number, vecue: number, plancher: number): GesteAuxInstruments | null {
  const F = Math.max(0, W - vecue)
  const index = new IndexPieces(poses, base)
  // Les événements, en intervalles de temps réel
  const ev: [number, number][] = []
  const visibles = new Set(base.keys())
  for (const x of index.pieces) {
    const avait = visibles.has(x.cle)
    if (x.visible) visibles.add(x.cle); else visibles.delete(x.cle)
    if (x.saut) continue
    if (x.visible && x.poses.length > 1 && bouge(x)) ev.push([x.poses[0].t, x.poses[x.poses.length - 1].t])
    else if (x.visible !== avait) ev.push([x.t0, x.t0])
  }
  for (const x of traces) ev.push([x.ech[0].t, x.ech[x.ech.length - 1].t])
  const dedans = ev.map(([a, b]) => [Math.max(0, Math.min(F, a)), Math.max(0, Math.min(F, b))] as [number, number])
    .filter(([a]) => a <= F).sort((p, q) => p[0] - q[0])
  if (!dedans.length) return null
  // Les intervalles qui se recouvrent n'en font qu'un
  const E: [number, number][] = []
  for (const [a, b] of dedans) {
    const der = E[E.length - 1]
    if (der && a <= der[1]) der[1] = Math.max(der[1], b)
    else E.push([a, b])
  }
  // Les temps immobiles : G0 avant le premier, puis entre eux, puis jusqu'à F
  const G = [E[0][0]]
  for (let i = 1; i < E.length; i++) G.push(E[i][0] - E[i - 1][1])
  G.push(F - E[E.length - 1][1])
  const longs = G.reduce((s, g) => s + (g > COUDE ? g : 0), 0)
  const montreLong = longs > 0 ? tasser(longs, 0) : 0
  const montre = (g: number) => g <= COUDE ? Math.max(0, g) : g / longs * montreLong
  const attente = Math.max(plancher, montre(G[0]))
  // La carte du temps réel au temps montré, par morceaux : chaque événement à
  // sa vitesse, chaque silence d'après tassé à sa part
  const carte: { r0: number; r1: number; t0: number; t1: number }[] = []
  let tau = 0
  E.forEach(([a, b], i) => {
    carte.push({ r0: a, r1: b, t0: tau, t1: tau + (b - a) }); tau += b - a
    const g = G[i + 1], m = montre(g)
    carte.push({ r0: b, r1: b + Math.max(0, g), t0: tau, t1: tau + m }); tau += m
  })
  const duree = tau
  // Avant la manipulation (τ < 0), l'état d'avant le premier événement ; à τ = 0, son début
  const reel = (t: number): number => {
    if (t < 0) return E[0][0] - 1e-6
    if (!(t > 0)) return E[0][0]
    if (t >= duree) return F
    let bas = 0, haut = carte.length - 1
    while (bas < haut) { const m = (bas + haut) >> 1; if (carte[m].t1 < t) bas = m + 1; else haut = m }
    const s = carte[bas]
    return s.t1 > s.t0 ? s.r0 + (t - s.t0) / (s.t1 - s.t0) * (s.r1 - s.r0) : s.r1
  }
  const etatA = (t: number) => index.etatA(Math.min(F, reel(t)))
  const apercuA = (t: number): Figure | null => {
    const r = reel(t)
    for (let i = traces.length - 1; i >= 0; i--) {
      const v = valeurDuTrace(traces[i], r)
      if (v) return figureDuTrace(traces[i], v)
    }
    return null
  }
  const finies = traces.filter(x => x.ech[0].t <= F).map(x => figureDuTrace(x, x.ech[x.ech.length - 1].v))
  return { attente, duree, immobile: G.reduce((s, g) => s + Math.max(0, g), 0), depart: etatA(0), fin: etatA(duree), etatA, apercuA, traces: finies, instant: reel }
}

/** Cette figure, parue au geste, est-elle l'une de celles tracées sous les
 *  instruments (même centre et même rayon à 1 unité près pour un arc, mêmes
 *  bouts pour un segment) ? On ne la retrace pas : on l'a vue se tracer. */
export function dejaTracee(f: Figure, traces: readonly Figure[]): boolean {
  const pres = (a: number, b: number) => Math.abs(a - b) <= 1
  for (const t of traces) {
    if (f.type === 'cercle' && t.type === 'cercle') {
      if (pres(f.x, t.x) && pres(f.y, t.y) && pres(f.r, t.r)) return true
    } else if (f.type === 'polygone' && t.type === 'polygone' && f.pts.length === 4 && t.pts.length === 4) {
      const a = { x: f.x, y: f.y }, b = { x: f.x + f.pts[2], y: f.y + f.pts[3] }
      const c = { x: t.x, y: t.y }, d = { x: t.x + t.pts[2], y: t.y + t.pts[3] }
      const meme = (p: typeof a, q: typeof a) => pres(p.x, q.x) && pres(p.y, q.y)
      if ((meme(a, c) && meme(b, d)) || (meme(a, d) && meme(b, c))) return true
    }
  }
  return false
}

// ---------- Le film élève ----------
/** Les instruments d'un film élève, relus et vérifiés : l'état à l'image 0,
 *  et pour chaque geste, ses pièces (datées depuis l'image d'avant). */
export interface InstrumentsDuFilm {
  depart: EtatInstruments
  avant: number
  etapes: ({ poses: Piece[]; traces: PieceTrace[] } | null)[]
}

/** Relit les instruments d'un film. Au moindre défaut, null : le film se
 *  rejoue comme s'il n'en avait pas. Un film sans instruments : null aussi. */
export function lireInstruments(film: { instruments?: unknown; avant?: unknown; etapes: readonly unknown[] }): InstrumentsDuFilm | null {
  const avant = film.avant === undefined ? 0 : film.avant
  if (typeof avant !== 'number' || !Number.isFinite(avant) || avant < 0 || avant > 3_600_000) return null
  let present = film.instruments !== undefined || avant > 0
  const depart: EtatInstruments = new Map()
  if (film.instruments !== undefined) {
    if (!Array.isArray(film.instruments)) return null
    let rang = 0
    for (const m of film.instruments) {
      const x = lireMorceau(m, true)
      if (!x || 'k' in x || !x.visible) return null
      depart.set(x.cle, { n: x.n, c: x.c, etat: etatDe(x.poses[x.poses.length - 1]), q: x.q, rang: ++rang })
    }
  }
  const etapes: InstrumentsDuFilm['etapes'] = []
  for (const e of film.etapes) {
    const inst = e && typeof e === 'object' ? (e as { inst?: unknown }).inst : undefined
    if (inst === undefined) { etapes.push(null); continue }
    if (!Array.isArray(inst)) return null
    present = true
    const poses: Piece[] = [], traces: PieceTrace[] = []
    for (const m of inst) {
      const x = lireMorceau(m, true)
      if (!x) return null
      if ('k' in x) traces.push(x); else poses.push(x)
    }
    etapes.push({ poses, traces })
  }
  return present ? { depart, avant, etapes } : null
}
