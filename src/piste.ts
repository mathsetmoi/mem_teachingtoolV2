// =============================================================
// LA PISTE DES INSTRUMENTS : CE QUE LA CLASSE A VU D'EUX
// Les instruments ne sont pas des formes : les poser, les tourner ou les
// ouvrir ne crée aucune étape du film. Pour que le replay les montre, on
// note à part ce que la couche des instruments a montré, quand elle l'a
// montré, quelle qu'en soit l'origine (un geste, le constructeur, un
// instrument qu'on montre ou qu'on range, l'état rendu au chargement).
//
// Deux entrées :
// - le TÉMOIN du rendu (peinture), appelé à chaque fois que la couche des
//   instruments se repeint. Pendant un trait au stylo elle ne se repeint
//   pas : le trait ne paie rien. Un déplacement de la caméra la repeint
//   sans rien noter (rien n'a changé) ;
// - le TRACÉ en cours aux instruments (trace) : l'arc sous la mine, le trait
//   le long d'un bord. Sans lui, on ne saurait pas où en est le crayon le
//   long de la règle (la règle, elle, ne bouge pas). Il est daté quand la
//   couche « direct » le peint (peintureDirect), comme les poses le sont à
//   leur peinture : l'arc et la mine du compas restent ensemble au replay.
//
// Ce qu'on note : des morceaux (voir revoir/instruments-film.ts pour le
// format), une pose au plus par instrument et par image, au plus 60 par
// seconde, et seulement quand quelque chose change. Un morceau se ferme
// quand on lâche ou prend une autre partie, quand l'instrument paraît ou est
// rangé, quand on change de page, après 250 ms sans changement, ou au-delà
// de 1 200 poses. Celui d'un instrument qui paraît ou qu'on lâche, sans
// bouger, n'a qu'une pose : il se ferme aussitôt. On le simplifie alors (les poses qu'une ligne droite entre
// leurs voisines retrouve s'en vont), puis on l'écrit dans le document,
// hors des pages, un peu plus tard : le lever du pointeur reste immédiat.
// =============================================================
import type { EtatInstrument, NomInstrument, Partie } from './instruments'
import type { Echantillon, Morceau, MorceauPoses, MorceauTrace, Pose } from './revoir/instruments-film'
import { cleDe, encoderPoses, encoderTrace, enrouler, versMilliDegres } from './revoir/instruments-film'

/** Un instrument tel que le rendu le peint */
export interface Peint { nom: NomInstrument; etat: EtatInstrument; actif: Partie | null }

/** Le tracé en cours sous un instrument, tel que la couche « direct » le montre */
export type TraceInstrument =
  | { k: 'arc'; x: number; y: number; r: number; a0: number; a1: number; couleur: string; taille: number }
  | { k: 'seg'; ax: number; ay: number; zx: number; zy: number; couleur: string; taille: number }

/** L'heure et les minuteurs (remplaçables dans les tests) */
export interface Horloge {
  maintenant(): number
  date(): number
  plusTard(f: () => void, ms: number): unknown
  annuler(id: unknown): void
}
const HORLOGE: Horloge = {
  maintenant: () => performance.now(),
  date: () => Date.now(),
  plusTard: (f, ms) => setTimeout(f, ms),
  annuler: id => clearTimeout(id as ReturnType<typeof setTimeout>),
}

/** Moins de ce temps après la précédente (ms), une pose la remplace : 60 par seconde au plus */
export const PAS_POSE = 15
/** Sans changement pendant ce temps (ms), le morceau se ferme */
export const REPOS_MORCEAU = 250
/** Au-delà de tant de poses, le morceau se ferme (un autre suit) */
export const POSES_MAX = 1200
/** Après un arrêt plus long que ceci (ms), on note que l'instrument était
 *  resté immobile jusqu'à l'image d'avant : le replay ne le fait pas glisser */
const ARRET = 60
/** Une image d'écran, à peu près (ms) */
const IMAGE = 17
/** Deux morceaux d'un même instrument sont au moins à tant de ms l'un de l'autre */
const ECART_MORCEAUX = 5
/** Les tolérances de la simplification, un peu sous celles du replay pour
 *  laisser la place à l'arrondi des entiers (dixième d'unité, millième de degré) */
const TOL = { xy: 0.42, a: 0.0019, r: 0.44 }

interface Vu { nom: NomInstrument; c: boolean; e: EtatInstrument; actif: Partie | null; t: number }
interface Ouvert { nom: NomInstrument; c: boolean; q: Partie | null; p: string; date: number; poses: Pose[]; brut: number }
interface TraceOuvert { k: 'arc' | 'seg'; p: string; couleur: string; taille: number; g: number[]; date: number; ech: Echantillon[] }

/** Simplifie une suite datée : garde les deux bouts, et entre eux ce qu'une
 *  ligne droite (dans le temps) entre les gardées ne retrouve pas à `erreur`
 *  ≤ 1 près (Douglas-Peucker, dans le temps). Rend les indices gardés. */
export function simplifier(n: number, t: (i: number) => number, erreur: (i: number, a: number, b: number, u: number) => number): number[] {
  if (n <= 2) return Array.from({ length: n }, (_, i) => i)
  const garde = new Uint8Array(n)
  garde[0] = garde[n - 1] = 1
  const pile: [number, number][] = [[0, n - 1]]
  while (pile.length) {
    const [a, b] = pile.pop()!
    let pire = -1, max = 1
    const ta = t(a), tb = t(b)
    for (let i = a + 1; i < b; i++) {
      const u = tb > ta ? (t(i) - ta) / (tb - ta) : 0
      const e = erreur(i, a, b, u)
      if (e > max) { max = e; pire = i }
    }
    if (pire >= 0) { garde[pire] = 1; pile.push([a, pire], [pire, b]) }
  }
  const r: number[] = []
  for (let i = 0; i < n; i++) if (garde[i]) r.push(i)
  return r
}

export function simplifierPoses(p: readonly Pose[]): Pose[] {
  return simplifier(p.length, i => p[i].t, (i, a, b, u) => {
    const A = p[a], B = p[b], P = p[i]
    const dx = P.x - (A.x + (B.x - A.x) * u), dy = P.y - (A.y + (B.y - A.y) * u)
    const da = P.a - (A.a + (B.a - A.a) * u), dr = P.r - (A.r + (B.r - A.r) * u)
    // Le carré des écarts, rapportés à leur tolérance : pas de racine
    return Math.max((dx * dx + dy * dy) / (TOL.xy * TOL.xy), (da * da) / (TOL.a * TOL.a), (dr * dr) / (TOL.r * TOL.r))
  }).map(i => p[i])
}

function simplifierTrace(e: readonly Echantillon[], angle: boolean): Echantillon[] {
  return simplifier(e.length, i => e[i].t, (i, a, b, u) => {
    let m = 0
    e[i].v.forEach((v, j) => { m = Math.max(m, Math.abs(v - (e[a].v[j] + (e[b].v[j] - e[a].v[j]) * u)) / (angle ? TOL.a : TOL.xy)) })
    return m
  }).map(i => e[i])
}

const memeEtatExact = (a: EtatInstrument, b: EtatInstrument) => a.x === b.x && a.y === b.y && a.a === b.a && a.r === b.r

export class Piste {
  /** Ce que la couche montrait à la dernière peinture, par instrument */
  private vus = new Map<string, Vu>()
  private ouverts = new Map<string, Ouvert>()
  private trace_: TraceOuvert | null = null
  /** Le tracé donné depuis la dernière peinture de la couche « direct » : on le date à la suivante */
  private enAttenteDePeinture: TraceInstrument | null = null
  /** Le tracé s'est arrêté, mais son dernier état n'a pas encore paru : on le ferme à la peinture */
  private fermerApresPeinture = false
  /** L'heure de la peinture d'avant, et la page qu'on regardait */
  private precedente = -Infinity
  private pageVue: string | null = null
  private minuterie: unknown = null
  /** Les morceaux fermés, pas encore écrits : on ne les simplifie et ne les
   *  encode qu'au moment de les écrire, hors de l'image d'écran */
  private enAttente: (() => Morceau)[] = []
  private envoi: unknown = null

  /** noter : écrit des morceaux dans le document ; page : la page qu'on regarde */
  constructor(private noter: (m: Morceau[]) => void, private page: () => string, private h: Horloge = HORLOGE) {}

  // ---------- Le témoin du rendu ----------
  /** La couche des instruments vient d'être peinte avec ces instruments
   *  (ceux du professeur, puis ceux du constructeur), à l'image d'écran t */
  peinture(duProf: readonly Peint[], constructeur: readonly Peint[], t = this.h.maintenant()) {
    const page = this.page()
    if (page !== this.pageVue) {
      // Ce qui était ouvert appartient à la page d'avant
      if (this.pageVue !== null) this.fermerTout()
      this.pageVue = page
    }
    let nb = 0
    for (const i of duProf) { nb++; this.voir(cleDe(i.nom, false), i, false, t, page) }
    for (const i of constructeur) { nb++; this.voir(cleDe(i.nom, true), i, true, t, page) }
    if (this.vus.size > nb) {
      const presents = new Set([...duProf.map(i => cleDe(i.nom, false)), ...constructeur.map(i => cleDe(i.nom, true))])
      for (const [cle, v] of this.vus) {
        if (presents.has(cle)) continue
        // Rangé : ce qui était ouvert se ferme, et l'on note qu'il s'en va
        this.fermer(cle)
        const m = this.morceau({ t: Math.round(this.dateDe(t)), p: page, n: v.nom, v: 0, d: [] }, v.c)
        this.ecrire(() => m)
        this.vus.delete(cle)
      }
    }
    this.precedente = t
    if (this.ouverts.size) this.armer()
  }

  /** Un instrument peint : rien à noter s'il n'a pas changé */
  private voir(cle: string, i: Peint, c: boolean, t: number, page: string) {
    const v = this.vus.get(cle)
    if (v && v.actif === i.actif && memeEtatExact(v.e, i.etat)) return
    const e = { x: i.etat.x, y: i.etat.y, a: i.etat.a, r: i.etat.r }
    const o = this.ouverts.get(cle)
    if (v && o && o.q === i.actif && o.poses.length < POSES_MAX) this.ajouter(o, e, t)
    else {
      if (o) this.fermer(cle)
      // Le morceau part du repos (la pose d'avant, à la peinture d'avant) :
      // le replay ne fait pas glisser l'instrument pendant le silence qui
      // précède. Si cette pose vient d'être notée (le morceau d'avant finit
      // dessus), on ne la répète pas : deux morceaux du même instrument ne se
      // chevauchent jamais, même à la milliseconde près des dates
      const poses: Pose[] = []
      const repos = v ? Math.max(this.precedente, t - IMAGE) : t
      if (v && repos >= v.t + ECART_MORCEAUX && repos < t && !memeEtatExact(v.e, e)) poses.push({ t: repos, ...v.e })
      const premier = poses[0]?.a ?? e.a
      poses.push({ t, x: e.x, y: e.y, r: e.r, a: premier + enrouler(e.a - premier) })
      this.ouverts.set(cle, { nom: i.nom, c, q: i.actif, p: page, date: this.dateDe(poses[0].t), poses, brut: e.a })
      // Un instrument qui paraît, ou qu'on lâche, sans bouger : une seule pose, notée
      // tout de suite (s'il bouge ensuite, un autre morceau suivra celui-ci)
      if (!i.actif && (!v || memeEtatExact(v.e, e))) this.fermer(cle)
    }
    this.vus.set(cle, { nom: i.nom, c, e, actif: i.actif, t })
  }

  private ajouter(o: Ouvert, e: EtatInstrument, t: number) {
    const n = o.poses.length, der = o.poses[n - 1]
    // L'angle déroulé : l'écart avec la pose d'avant, ramené dans ]−π, π]
    const p: Pose = { t, x: e.x, y: e.y, r: e.r, a: der.a + enrouler(e.a - o.brut) }
    o.brut = e.a
    // L'instrument est resté là jusqu'à la peinture d'avant (les autres ont pu
    // bouger, ou la caméra) ; après un long arrêt, au moins jusqu'à l'image d'avant
    const tenu = Math.max(this.precedente, t - der.t > ARRET ? t - IMAGE : -Infinity)
    if (tenu > der.t && tenu < t) {
      o.poses.push({ ...der, t: tenu })
      o.poses.push(p)
    } else if (n >= 2 && der.t - o.poses[n - 2].t < PAS_POSE) o.poses[n - 1] = p
    else o.poses.push(p)
  }

  // ---------- Le tracé aux instruments ----------
  /** Le tracé en cours sous un instrument (null : il s'arrête). On le note
   *  quand la couche « direct » le peint, pas avant (voir peintureDirect) */
  trace(f: TraceInstrument | null) {
    // Un tracé arrêté qui attendait encore de paraître : il s'arrête ici
    if (this.fermerApresPeinture) this.viderTrace()
    if (f) { this.enAttenteDePeinture = f; return }
    // Le dernier état, s'il n'a pas encore paru, sera daté à sa peinture
    if (this.enAttenteDePeinture) { this.fermerApresPeinture = true; return }
    // Le crayon a pu rester immobile avant le lever : au tableau, le tracé est
    // resté à l'écran jusque-là. On note qu'il a tenu jusqu'à l'arrêt, comme
    // pour les poses : le replay ne l'efface pas avant que la figure paraisse
    const o = this.trace_, t = this.h.maintenant()
    const der = o?.ech[o.ech.length - 1]
    if (der && t - der.t > ARRET) o!.ech.push({ t, v: der.v })
    this.fermerTrace()
  }

  /** La couche « direct » vient d'être peinte, à l'image d'écran t : le tracé en cours a paru */
  peintureDirect(t = this.h.maintenant()) {
    const f = this.enAttenteDePeinture
    if (f) { this.enAttenteDePeinture = null; this.noterTrace(f, t) }
    if (this.fermerApresPeinture) { this.fermerApresPeinture = false; this.fermerTrace() }
  }

  /** Note tout de suite ce qui attendait sa peinture, et ferme le tracé s'il était arrêté */
  private viderTrace() {
    if (this.enAttenteDePeinture) { this.noterTrace(this.enAttenteDePeinture); this.enAttenteDePeinture = null }
    if (this.fermerApresPeinture) { this.fermerApresPeinture = false; this.fermerTrace() }
  }

  private noterTrace(f: TraceInstrument, t = this.h.maintenant()) {
    const page = this.page()
    const g = f.k === 'arc' ? [f.x, f.y, f.r, f.a0] : [f.ax, f.ay]
    const v = f.k === 'arc' ? [f.a1] : [f.zx, f.zy]
    let o = this.trace_
    const entier = (x: number, i: number) => f.k === 'arc' && i === 3 ? versMilliDegres(x) : Math.round(x * 10)
    const memeFixe = (a: number[], b: number[]) => a.every((x, i) => entier(x, i) === entier(b[i], i))
    if (o && (o.k !== f.k || o.p !== page || o.couleur !== f.couleur || o.taille !== f.taille || !memeFixe(o.g, g))) { this.fermerTrace(); o = null }
    if (!o) { this.trace_ = { k: f.k, p: page, couleur: f.couleur, taille: f.taille, g, date: this.dateDe(t), ech: [{ t, v }] }; return }
    const e = o.ech, n = e.length, der = e[n - 1]
    if (der.v.every((x, i) => x === v[i])) return
    if (t - der.t > ARRET) { e.push({ t: Math.max(der.t, t - IMAGE), v: der.v }); e.push({ t, v }) }
    else if (n >= 2 && der.t - e[n - 2].t < PAS_POSE) e[n - 1] = { t, v }
    else e.push({ t, v })
  }

  private fermerTrace() {
    const o = this.trace_
    if (!o) return
    this.trace_ = null
    this.ecrire(() => {
      const arc = o.k === 'arc'
      const m: MorceauTrace = {
        t: Math.round(o.date), p: o.p, k: o.k, s: [o.couleur, o.taille],
        g: o.g.map((v, i) => arc && i === 3 ? versMilliDegres(v) : Math.round(v * 10)), d: encoderTrace(simplifierTrace(o.ech, arc), arc),
      }
      return m
    })
  }

  // ---------- Fermer, écrire ----------
  private dateDe(t: number) { return this.h.date() - (this.h.maintenant() - t) }

  private morceau(m: MorceauPoses, c: boolean): MorceauPoses {
    if (c) m.c = 1
    // d en dernier : il se lit mieux
    const { d, ...reste } = m
    return { ...reste, d }
  }

  private fermer(cle: string) {
    const o = this.ouverts.get(cle)
    if (!o) return
    this.ouverts.delete(cle)
    this.ecrire(() => {
      const m: MorceauPoses = { t: Math.round(o.date), p: o.p, n: o.nom, d: [] }
      if (o.q) m.q = o.q
      m.d = encoderPoses(simplifierPoses(o.poses), o.nom === 'compas')
      return this.morceau(m, o.c)
    })
  }

  /** Ferme ce qui est ouvert depuis trop longtemps sans changement */
  private verifier = () => {
    this.minuterie = null
    const t = this.h.maintenant()
    for (const [cle, o] of this.ouverts) if (t - o.poses[o.poses.length - 1].t >= REPOS_MORCEAU) this.fermer(cle)
    if (this.ouverts.size) this.armer()
  }

  private armer() {
    if (this.minuterie !== null) return
    let plusVieux = Infinity
    for (const o of this.ouverts.values()) plusVieux = Math.min(plusVieux, o.poses[o.poses.length - 1].t)
    this.minuterie = this.h.plusTard(this.verifier, Math.max(1, plusVieux + REPOS_MORCEAU - this.h.maintenant()))
  }

  /** Ferme tous les morceaux ouverts */
  fermerTout() {
    for (const cle of [...this.ouverts.keys()]) this.fermer(cle)
    this.viderTrace()
    this.fermerTrace()
  }

  /** Ferme tout et écrit tout de suite (la page se ferme) */
  vider() {
    this.fermerTout()
    if (this.minuterie !== null) { this.h.annuler(this.minuterie); this.minuterie = null }
    if (this.envoi !== null) { this.h.annuler(this.envoi); this.envoi = null }
    this.envoyer()
  }

  /** On écrit un peu plus tard, hors du geste et de l'image d'écran : le lever
   *  du pointeur reste immédiat, et la simplification ne retarde aucune image */
  private ecrire(m: () => Morceau) {
    this.enAttente.push(m)
    if (this.envoi === null) this.envoi = this.h.plusTard(() => { this.envoi = null; this.envoyer() }, 0)
  }

  private envoyer() {
    if (!this.enAttente.length) return
    const l = this.enAttente
    this.enAttente = []
    this.noter(l.map(f => f()))
  }
}
