// =============================================================
// LA BOBINE : LE FILM ÉLÈVE, PRÊT À REJOUER
// L'image k du film, c'est l'état de départ plus les k premiers gestes.
// Pour sauter n'importe où sans tout rejouer, on garde un état complet
// toutes les 32 images : aller à l'image k coûte au plus 31 gestes.
// Le temps : avant chaque image, une attente ; puis, si le geste a tracé
// un trait à la main (et que le film a noté son rythme), le tracé lui-même,
// à la vitesse de la main. L'attente est alors le vrai temps stylo levé.
// Si les instruments ont bougé avant le geste (le film le note depuis qu'il
// les montre), leur manipulation fait partie du tracé : elle passe avant le
// trait, à sa vitesse réelle, et l'attente est le silence d'avant elle. Au
// dernier geste d'une page, ce qu'ils y font ensuite (son épilogue : on range
// l'équerre) finit le tracé, après la figure ; le geste suivant ne rejoue
// pas ce temps-là une seconde fois.
// Rien ici n'écrit ailleurs qu'en mémoire.
// =============================================================
import type { Fond, Forme } from '../types'
import type { Chapitre, FilmEleve } from './format'
import type { Main } from './main-levee'
import { leve, main } from './main-levee'
import { PLANCHER, tasser } from './rythme'
import type { EtatInstruments, GesteAuxInstruments, Piece, PieceTrace } from './instruments-film'
import { IndexPieces, dejaTracee, finDesPieces, horaire, lireInstruments } from './instruments-film'

const TOUS_LES = 32

interface EtatPage { fond: Fond; origine: { x: number; y: number }; formes: Map<string, Forme>; supprimee?: boolean }
type Etat = Map<string, EtatPage>

export interface Image { page: string; fond: Fond; origine: { x: number; y: number }; formes: Forme[] }
export interface Boite { x: number; y: number; l: number; h: number }

/** Copie d'un état : les formes ne changent jamais, on ne copie que les listes */
const copie = (e: Etat): Etat => new Map([...e].map(([id, p]) => [id, { ...p, formes: new Map(p.formes) }]))

export class Bobine {
  /** Nombre d'images : l'état de départ, puis une par geste */
  readonly n: number
  readonly chapitres: Chapitre[]
  /** Temps écoulé à chaque image, au rythme d'origine tassé, en ms */
  readonly temps: number[]
  private reperes: Etat[] = []
  /** Pour chaque image, les formes qui y APPARAISSENT pour la première fois
   *  (pas celles qui changent, ni celles qui reviennent : voir ajoutees) */
  private ajouts: Set<string>[] = [new Set()]
  /** Pour chaque image, le trait qui s'y trace à la main, au rythme noté (null : aucun) */
  private mains: (Main | null)[] = [null]
  /** Pour chaque image, vrai si elle remplace aussitôt le trait que l'image
   *  d'avant vient de tracer : la figure reconnue au lever du stylo */
  private reconnues: boolean[] = [false]
  /** L'état des instruments à chaque image, son épilogue compris (vide : le film ne les montre pas) */
  private etats: EtatInstruments[] = []
  /** L'état des instruments au geste de chaque image, avant son épilogue */
  private auGeste: EtatInstruments[] = []
  /** Pour chaque image, ce que les instruments font avant son geste (null : rien ne bouge) */
  private manips: (GesteAuxInstruments | null)[] = []
  /** Pour chaque image, l'épilogue de sa page : ce que les instruments y font
   *  après le geste, avant qu'on la quitte (null : rien ne bouge) */
  private epilogues: (GesteAuxInstruments | null)[] = []
  /** Pour chaque image, le temps vécu (ms) que l'épilogue de l'image d'avant a
   *  déjà montré : son attente ne le compte pas une seconde fois */
  private decalages: number[] = []

  constructor(readonly film: FilmEleve) {
    this.n = film.etapes.length + 1
    const depart: Etat = new Map()
    for (const p of film.pages) depart.set(p.id, { fond: p.fond, origine: p.origine, formes: new Map(p.formes.map(f => [f.id, f])) })
    let e = depart
    this.reperes.push(copie(e))
    /** Les formes déjà montrées, sur une page ou une autre */
    const vues = new Set<string>()
    for (const p of film.pages) for (const f of p.formes) vues.add(f.id)
    for (let k = 1; k < this.n; k++) {
      const a = new Set<string>(); this.ajouts.push(a)
      this.appliquer(e, k, a)
      for (const id of a) if (vues.has(id)) a.delete(id); else vues.add(id)
      if (k % TOUS_LES === 0) this.reperes.push(copie(e))
      const g = film.etapes[k - 1]
      let m: Main | null = null
      if (g?.ms && Array.isArray(g.o)) {
        for (const o of g.o) if (Array.isArray(o) && o[0] === '=' && o[1]?.type === 'trait' && a.has(o[1].id) && (m = main(o[1], g.ms))) break
      }
      this.mains.push(m)
      const avant = this.mains[k - 1]
      this.reconnues.push(!!avant && !!g && g.dt <= PLANCHER && g.p === film.etapes[k - 2]?.p && Array.isArray(g.o)
        && g.o.some(o => Array.isArray(o) && o[0] === '-' && o[1] === avant.trait.id))
    }
    // Les instruments : l'état à chaque image, et ce qu'ils font avant chaque geste.
    // Un film sans instruments, ou aux instruments abîmés, se rejoue comme avant.
    const inst = lireInstruments(film)
    if (inst) {
      let e = inst.depart, decalage = 0
      this.etats.push(e); this.auGeste.push(e); this.manips.push(null); this.epilogues.push(null); this.decalages.push(0)
      for (let k = 1; k < this.n; k++) {
        const w = inst.etapes[k - 1], g = film.etapes[k - 1]
        let geste: GesteAuxInstruments | null = null, epilogue: GesteAuxInstruments | null = null
        if (w) {
          const m = this.mains[k]
          const W = Math.max(0, Number(g.dt) || 0) + (k === 1 ? inst.avant : 0)
          // La fenêtre commence où l'épilogue de l'image d'avant s'est arrêté
          geste = horaire(decaler(w.poses, decalage), decalerTraces(w.traces, decalage), e, Math.max(0, W - decalage), m?.vecue ?? 0, m || this.reconnues[k] ? 0 : PLANCHER)
          if (w.poses.length) e = new IndexPieces(w.poses, e).fin
        }
        this.auGeste.push(e); this.decalages.push(decalage)
        decalage = 0
        if (w?.apres) {
          // L'épilogue se joue jusqu'à son dernier mouvement, sans le silence qui le suit
          const fin = finDesPieces(w.apres.poses, w.apres.traces)
          epilogue = horaire(w.apres.poses, w.apres.traces, e, fin, 0, 0)
          if (w.apres.poses.length) e = new IndexPieces(w.apres.poses, e).fin
          if (epilogue) decalage = fin
        }
        this.etats.push(e); this.manips.push(geste); this.epilogues.push(epilogue)
      }
    }
    this.temps = [0]
    for (let k = 1; k < this.n; k++) this.temps.push(this.temps[k - 1] + this.delai(k))
    this.chapitres = (film.chapitres.length ? film.chapitres : [{ i: 0, titre: 'La séance' }])
      .filter(c => c.i >= 0 && c.i < this.n).sort((a, b) => a.i - b.i)
  }

  get duree() { return this.temps[this.n - 1] }

  /** Le temps entre l'image k-1 finie et l'image k finie : l'attente, puis le tracé */
  delai(k: number) { return this.attente(k) + this.trace(k) }

  /** Le temps d'attente avant l'image k (avant que son tracé à la main commence) :
   *  l'intervalle vécu, tassé (voir rythme.ts). Avant un trait tracé à la main,
   *  c'est le temps stylo levé ; avant la figure reconnue, l'instant du lever. */
  attente(k: number) {
    if (k <= 0 || k >= this.n) return 0
    const g = this.manips[k]
    if (g) return g.attente
    const dt = this.film.etapes[k - 1].dt - (this.decalages[k] ?? 0), m = this.mains[k]
    if (m) return leve(dt, m)
    if (this.reconnues[k]) return tasser(dt, 0)
    return tasser(dt)
  }

  /** Le temps que met l'image k à se tracer : la manipulation des instruments,
   *  puis le trait écrit à la main, puis l'épilogue de sa page (0 : elle
   *  paraît d'un coup, ou ses figures se dessinent pendant l'attente suivante) */
  trace(k: number) { return (this.manips[k]?.duree ?? 0) + (this.mains[k]?.duree ?? 0) + this.dureeEpilogue(k) }

  /** Le temps que l'épilogue de l'image k prend à la fin de son tracé : le
   *  silence d'avant son premier mouvement, puis ses mouvements (0 : aucun) */
  dureeEpilogue(k: number) { const e = this.epilogues[k]; return e ? e.attente + e.duree : 0 }

  /** Le film montre-t-il les instruments ? */
  get avecInstruments() { return this.etats.length > 0 }

  /** Les instruments à l'image k, son geste et son épilogue finis (null : le film ne les montre pas) */
  instruments(k: number): EtatInstruments | null {
    return this.etats.length ? this.etats[Math.max(0, Math.min(this.n - 1, k))] : null
  }

  /** Les instruments au geste de l'image k, avant son épilogue (null : le film ne les montre pas) */
  instrumentsAuGeste(k: number): EtatInstruments | null {
    return this.auGeste.length ? this.auGeste[Math.max(0, Math.min(this.n - 1, k))] : null
  }

  /** Ce que les instruments font avant le geste de l'image k (null : rien ne bouge) */
  geste(k: number): GesteAuxInstruments | null { return this.manips[k] ?? null }

  /** L'épilogue de la page de l'image k : ce que les instruments y font après
   *  son geste, avant qu'on la quitte (null : rien ne bouge) */
  epilogue(k: number): GesteAuxInstruments | null { return this.epilogues[k] ?? null }

  /** Parmi les figures qui apparaissent à l'image k, celles qu'on a vues se
   *  tracer sous les instruments : elles ne se redessinent pas */
  tracees(k: number): Set<string> {
    const g = this.manips[k], r = new Set<string>()
    if (!g?.traces.length) return r
    for (const f of this.nouvelles(k)) if ((f.type === 'cercle' || f.type === 'polygone') && this.ajoutees(k).has(f.id) && dejaTracee(f, g.traces)) r.add(f.id)
    return r
  }

  /** Le trait que l'image k trace à la main, et son rythme (null : aucun) */
  main(k: number): Main | null { return this.mains[k] ?? null }

  /** L'image k remplace-t-elle aussitôt le trait que l'image d'avant vient de
   *  tracer (une figure reconnue) ? Elle paraît alors d'un coup, comme au tableau */
  reconnue(k: number): boolean { return !!this.reconnues[k] }

  /** La page qu'on regarde à l'image k : celle du geste */
  page(k: number): string {
    const e = this.film.etapes
    if (!e.length) return this.film.pages[0]?.id ?? ''
    return e[Math.max(0, Math.min(e.length, k) - 1)].p
  }

  /** Le numéro d'une page (1, 2…) dans l'ordre du tableau */
  numero(page: string) { return this.film.ordre.indexOf(page) + 1 }
  get nombreDePages() { return this.film.ordre.length }

  /** Ce qu'on voit à l'image k */
  image(k: number, page = this.page(k)): Image {
    k = Math.max(0, Math.min(this.n - 1, k))
    const r = Math.floor(k / TOUS_LES)
    const e = copie(this.reperes[r])
    for (let j = r * TOUS_LES + 1; j <= k; j++) this.appliquer(e, j)
    const p = e.get(page)
    return {
      page,
      fond: p?.fond ?? 'blanc',
      origine: p?.origine ?? { x: 0, y: 0 },
      formes: p && !p.supprimee ? [...p.formes.values()].sort((a, b) => a.z - b.z) : [],
    }
  }

  /** Les formes qui apparaissent ou changent à l'image k */
  nouvelles(k: number): Forme[] {
    if (k <= 0 || k >= this.n) return []
    return this.film.etapes[k - 1].o.filter(o => o[0] === '=').map(o => o[1] as Forme)
  }

  /** Les formes qui apparaissent à l'image k pour la première fois du film :
   *  une forme déplacée n'y est pas, ni une forme déjà montrée qui revient
   *  (rendue par Ctrl+Z ou Ctrl+Y) : au tableau, elle revient d'un coup */
  ajoutees(k: number): Set<string> { return this.ajouts[k] ?? new Set() }

  /** Le chapitre de l'image k (son rang dans la liste) */
  chapitreDe(k: number) {
    let c = 0
    this.chapitres.forEach((ch, i) => { if (ch.i <= k) c = i })
    return c
  }
  /** La dernière image d'un chapitre */
  finDuChapitre(c: number) { return c + 1 < this.chapitres.length ? this.chapitres[c + 1].i - 1 : this.n - 1 }

  /** La zone occupée par une page sur tout le film : on la cadre une fois,
   *  sans que la vue saute à chaque geste */
  etendue(page: string): Boite | null {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    const voir = (f: Forme) => {
      const b = boiteDe(f); if (!b) return
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
    }
    this.film.pages.find(p => p.id === page)?.formes.forEach(voir)
    for (const e of this.film.etapes) if (e.p === page) for (const o of e.o) if (o[0] === '=') voir(o[1])
    return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
  }

  /** Applique le geste k (passage de l'image k-1 à l'image k) */
  private appliquer(e: Etat, k: number, ajouts?: Set<string>) {
    const g = this.film.etapes[k - 1]
    if (!g || !Array.isArray(g.o)) return
    let p = e.get(g.p)
    if (!p) { p = { fond: 'blanc', origine: { x: 0, y: 0 }, formes: new Map() }; e.set(g.p, p) }
    for (const o of g.o) {
      if (!Array.isArray(o)) continue
      if (o[0] === '=' && o[1] && typeof o[1] === 'object' && typeof o[1].id === 'string') {
        if (ajouts && !p.formes.has(o[1].id)) ajouts.add(o[1].id)
        p.formes.set(o[1].id, o[1]); p.supprimee = false
      }
      else if (o[0] === '-') p.formes.delete(o[1])
      else if (o[0] === 'f') { p.fond = o[1]; p.origine = { x: Number(o[2]) || 0, y: Number(o[3]) || 0 }; p.supprimee = false }
      else if (o[0] === 'x') { p.formes.clear(); p.supprimee = true }
    }
  }
}

/** Des pièces datées d'une fenêtre qui commence d ms plus tard */
function decaler(l: Piece[], d: number): Piece[] {
  return d ? l.map(x => ({ ...x, t0: x.t0 - d, poses: x.poses.map(p => ({ ...p, t: p.t - d })) })) : l
}
function decalerTraces(l: PieceTrace[], d: number): PieceTrace[] {
  return d ? l.map(x => ({ ...x, t0: x.t0 - d, ech: x.ech.map(e => ({ t: e.t - d, v: e.v })) })) : l
}

/** La boîte d'une forme, sans avoir besoin de la dessiner */
export function boiteDe(f: Forme): Boite | null {
  const depuis = (xs: number[], ys: number[], m: number) => {
    if (!xs.length) return null
    const x1 = Math.min(...xs), x2 = Math.max(...xs), y1 = Math.min(...ys), y2 = Math.max(...ys)
    return { x: x1 - m, y: y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
  }
  switch (f.type) {
    case 'trait': {
      const xs: number[] = [], ys: number[] = []
      for (let i = 0; i < f.pts.length; i += 3) { xs.push(f.x + f.pts[i]); ys.push(f.y + f.pts[i + 1]) }
      return depuis(xs, ys, f.taille)
    }
    case 'polygone': {
      const xs: number[] = [], ys: number[] = []
      for (let i = 0; i < f.pts.length; i += 2) { xs.push(f.x + f.pts[i]); ys.push(f.y + f.pts[i + 1]) }
      return depuis(xs, ys, f.taille + (f.sommets ? 28 : 0))
    }
    case 'cercle': return { x: f.x - f.r - 8, y: f.y - f.r - 8, l: 2 * f.r + 16, h: 2 * f.r + 16 }
    case 'segment': return depuis([f.x, f.x + f.dx], [f.y, f.y + f.dy], f.taille)
    case 'formule': return { x: f.x, y: f.y, l: Math.max(1, f.latex.length) * f.taille * 0.55, h: f.taille * 1.6 }
    case 'image': {
      const [a, b, c, d] = f.m
      const xs = [0, a * f.l, c * f.h, a * f.l + c * f.h].map(v => f.x + v)
      const ys = [0, b * f.l, d * f.h, b * f.l + d * f.h].map(v => f.y + v)
      return depuis(xs, ys, 0)
    }
  }
  return null
}
