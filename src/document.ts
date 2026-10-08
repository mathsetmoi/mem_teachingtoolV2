// =============================================================
// LE DOCUMENT
// Tout ce qui est écrit vit dans UN document Yjs (un CRDT).
// - Il s'enregistre dans le navigateur (IndexedDB).
// - L'annulation (Y.UndoManager) ne défait que les gestes (les
//   transactions « locales »), jamais le chargement depuis le disque.
// =============================================================
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import type { Fond, Forme, Trait } from './types'
import type { Morceau } from './revoir/instruments-film'
import { uid } from './types'

export const ORIGINE_LOCALE = 'locale'
const ORIGINE_FILM = 'film'
/** Les écritures de la piste des instruments : ni étape du film, ni annulation */
const ORIGINE_PISTE = 'piste'
/** Deux changements à moins de 400 ms l'un de l'autre font une seule étape
 *  d'annulation (le stylo qui se reprend, un nom qu'on retouche) */
const CAPTURE = 400

/** Une étape du film : quand, sur quelle page, et l'état du document.
 *  ms : si l'étape pose un trait tracé à la main, le temps passé sur chacun
 *  de ses points (voir revoir/main-levee.ts) ; l'étape est prise au lever. */
export interface Etape { t: number; page: string; s: Uint8Array; ms?: number[] }

/** Ce qu'il y avait sur une page à une étape du film */
export interface ImagePage { fond: Fond; origine: { x: number; y: number }; formes: Forme[] }

/** Tout le tableau à une étape du film : l'ordre des pages, et chacune
 *  avec ses formes. Les formes sont les objets mêmes du document : une forme
 *  qui n'a pas changé d'une étape à l'autre est le même objet. */
export interface EtatTableau {
  ordre: string[]
  pages: Map<string, { fond: Fond; origine: { x: number; y: number }; formes: Map<string, Forme> }>
}

export class Tableau {
  // gc: false — le document garde ce qui a été effacé. C'est ce qui permet
  // au lecteur de le reconstruire tel qu'il était à n'importe quelle étape.
  readonly doc = new Y.Doc({ gc: false })
  readonly ordre: Y.Array<string>                 // ordre des pages
  readonly pages: Y.Map<Y.Map<unknown>>           // id → { fond, formes }
  readonly film: Y.Array<Etape>                   // une étape par geste, pour le lecteur
  /** Ce que les instruments ont fait, au temps réel (voir piste.ts) : à côté
   *  du film, hors des pages. Ni étape, ni annulation, ni forme. */
  readonly piste: Y.Array<Morceau>
  /** La page que l'on regarde : notée avec chaque étape du film */
  pageVue = ''
  readonly annulation: Y.UndoManager
  readonly moi = uid()
  private local: IndexeddbPersistence | null
  /** Les temps du trait que pose la transaction en cours (voir poserTrace) */
  private tempsDuTrace: number[] | null = null

  /** nomLocal : la base du navigateur où le tableau s'enregistre (null : nulle part, pour les tests) */
  constructor(nomLocal: string | null) {
    this.ordre = this.doc.getArray('ordre')
    this.pages = this.doc.getMap('pages')
    this.film = this.doc.getArray('film')
    this.piste = this.doc.getArray('piste')
    // Portée : toutes les pages et ce qu'elles contiennent. Seules les
    // transactions marquées « locale » sont retenues.
    this.annulation = new Y.UndoManager(this.pages, {
      trackedOrigins: new Set([ORIGINE_LOCALE]),
      captureTimeout: CAPTURE,
    })
    this.local = nomLocal ? new IndexeddbPersistence(nomLocal, this.doc) : null

    // Chaque geste qui touche aux pages devient une étape du film. Pas le
    // chargement depuis le disque : ces étapes-là y sont déjà.
    this.doc.on('afterTransaction', (tr: Y.Transaction) => {
      if (tr.origin === ORIGINE_FILM || (this.local && tr.origin === this.local)) return
      if (!tr.changedParentTypes.size || ![...tr.changedParentTypes.keys()].some(t => this.dansLesPages(t))) return
      const etape: Etape = { t: Date.now(), page: this.pageVue, s: Y.encodeSnapshot(Y.snapshot(this.doc)) }
      if (this.tempsDuTrace) { etape.ms = this.tempsDuTrace; this.tempsDuTrace = null }
      queueMicrotask(() => this.doc.transact(() => this.film.push([etape]), ORIGINE_FILM))
    })
  }

  private dansLesPages(t: Y.AbstractType<any>): boolean {
    for (let x: Y.AbstractType<any> | null = t; x; x = x.parent as Y.AbstractType<any> | null) {
      if (x === this.pages || x === this.ordre) return true
    }
    return false
  }

  /** Le tableau tel qu'il était à une étape du film. On le lit directement
   *  dans l'instantané, sans reconstruire de document : c'est possible parce
   *  que le document garde tout (gc: false), et cent fois plus rapide. */
  etatA(etape: Etape): EtatTableau {
    const snap = Y.decodeSnapshot(etape.s)
    const ordre = (Y.typeListToArraySnapshot(this.ordre, snap) as string[])
    const pages: EtatTableau['pages'] = new Map()
    const toutes = Y.typeMapGetAllSnapshot(this.pages, snap) as Record<string, unknown>
    for (const [id, p] of Object.entries(toutes)) {
      if (p instanceof Y.Map) pages.set(id, this.lirePage(p, snap))
    }
    return { ordre, pages }
  }

  /** Une page telle qu'elle était à une étape du film. On ne lit que cette
   *  page-là dans l'instantané : sur un tableau de plusieurs pages, c'est
   *  environ cinq fois moins de travail que de relire tout le tableau, pour
   *  exactement le même résultat. */
  pageA(etape: Etape, page: string): ImagePage | null {
    const snap = Y.decodeSnapshot(etape.s)
    const p = Y.typeMapGetSnapshot(this.pages, page, snap)
    if (!(p instanceof Y.Map)) return null
    const l = this.lirePage(p, snap)
    return { fond: l.fond, origine: l.origine, formes: [...l.formes.values()].sort((a, b) => a.z - b.z) }
  }

  /** La forme `id` était-elle déjà passée sur la page à cette étape du film,
   *  ou avant ? Pour une forme absente à cette étape qui paraît ensuite, c'est
   *  qu'elle revient : rendue par Ctrl+Z ou Ctrl+Y, telle qu'on l'a déjà vue.
   *  Le document garde tout (gc: false) : chaque valeur prise par la forme
   *  reste chaînée à la précédente ; il suffit de savoir si la toute première
   *  existait déjà à cette étape. */
  dejaPassee(etape: Etape, page: string, id: string): boolean {
    const snap = Y.decodeSnapshot(etape.s)
    const p = Y.typeMapGetSnapshot(this.pages, page, snap)
    const formes = p instanceof Y.Map ? Y.typeMapGetSnapshot(p, 'formes', snap) : null
    if (!(formes instanceof Y.Map)) return false
    let v = formes._map.get(id)
    if (!v) return false
    while (v.left instanceof Y.Item) v = v.left
    return (snap.sv.get(v.id.client) ?? 0) > v.id.clock
  }

  /** Le fond, l'origine et les formes d'une page dans un instantané */
  private lirePage(p: Y.Map<unknown>, snap: Y.Snapshot): { fond: Fond; origine: { x: number; y: number }; formes: Map<string, Forme> } {
    const formes = Y.typeMapGetSnapshot(p, 'formes', snap)
    const liste = formes instanceof Y.Map ? Y.typeMapGetAllSnapshot(formes, snap) as Record<string, Forme | undefined> : {}
    // Un document dont Yjs a fait le ménage (gc) peut avoir perdu le
    // contenu des formes effacées : on ne garde que de vraies formes
    const presentes = new Map<string, Forme>()
    for (const [k, f] of Object.entries(liste)) if (f && typeof f === 'object' && typeof (f as Forme).type === 'string') presentes.set(k, f)
    return {
      fond: (Y.typeMapGetSnapshot(p, 'fond', snap) as Fond) || 'blanc',
      origine: (Y.typeMapGetSnapshot(p, 'origine', snap) as { x: number; y: number }) || { x: 0, y: 0 },
      formes: presentes,
    }
  }

  /** La même page, lue en reconstruisant tout le document (l'ancienne façon,
   *  lente) : sert aux tests, pour vérifier que la lecture rapide dit pareil */
  pageReconstruite(etape: Etape, page: string): ImagePage | null {
    const d = Y.createDocFromSnapshot(this.doc, Y.decodeSnapshot(etape.s))
    const p = d.getMap('pages').get(page) as Y.Map<unknown> | undefined
    if (!p) { d.destroy(); return null }
    const formes = p.get('formes')
    const r: ImagePage = {
      fond: (p.get('fond') as Fond) || 'blanc',
      origine: (p.get('origine') as { x: number; y: number }) || { x: 0, y: 0 },
      formes: formes instanceof Y.Map ? Array.from((formes as Y.Map<Forme>).values()).sort((a, b) => a.z - b.z) : [],
    }
    d.destroy()
    return r
  }

  /** Attend la copie locale ; crée une première page si le tableau est vide. */
  async charger(): Promise<void> {
    await this.local?.whenSynced
    if (this.ordre.length === 0) this.ajouterPage('carreaux', 0)
  }

  // ---------- Pages ----------
  ajouterPage(fond: Fond, position: number): string {
    const id = uid()
    // La création se note dans le film sur la NOUVELLE page, pas sur celle
    // qu'on regarde encore : le replay ne doit pas compter celle qu'on quitte
    const vue = this.pageVue
    this.pageVue = id
    try {
      this.doc.transact(() => {
        const p = new Y.Map<unknown>()
        p.set('fond', fond)
        p.set('formes', new Y.Map<Forme>())
        this.pages.set(id, p)
        this.ordre.insert(Math.min(position, this.ordre.length), [id])
      })
    } finally {
      // Sur un tableau neuf, on ne regardait aucune page : l'application vient
      // d'aller sur celle-ci (pendant la transaction), on la garde
      if (vue) this.pageVue = vue
    }
    return id
  }

  supprimerPage(id: string) {
    const i = this.ordre.toArray().indexOf(id)
    if (i < 0 || this.ordre.length <= 1) return
    this.doc.transact(() => { this.ordre.delete(i, 1); this.pages.delete(id) })
  }

  fondDe(page: string): Fond { return (this.pages.get(page)?.get('fond') as Fond) || 'blanc' }
  changerFond(page: string, fond: Fond, origine?: { x: number; y: number }) {
    const p = this.pages.get(page); if (!p) return
    this.doc.transact(() => { p.set('fond', fond); if (origine) p.set('origine', origine) })
  }
  origineDe(page: string) {
    return (this.pages.get(page)?.get('origine') as { x: number; y: number }) || { x: 0, y: 0 }
  }

  formesDe(page: string): Y.Map<Forme> | null {
    const f = this.pages.get(page)?.get('formes')
    return f instanceof Y.Map ? (f as Y.Map<Forme>) : null
  }

  // ---------- Formes : toutes passent par une transaction « locale » ----------
  poser(page: string, forme: Forme) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => formes.set(forme.id, forme), ORIGINE_LOCALE)
  }

  /** Pose un trait tracé à la main. L'étape du film qu'il fait naître note le
   *  temps passé sur chacun de ses points (ms, un par point) : le replay le
   *  retracera au rythme de la main. Le trait, lui, reste un trait comme les
   *  autres : une copie ou un Ctrl+Z ne reprend pas ce rythme. */
  poserTrace(page: string, trait: Trait, ms: number[]) {
    this.tempsDuTrace = ms.length && ms.length === trait.pts.length / 3 ? ms : null
    try { this.poser(page, trait) } finally { this.tempsDuTrace = null }
  }

  modifier(page: string, changements: { id: string; patch: Partial<Forme> }[]) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => {
      for (const { id, patch } of changements) {
        const f = formes.get(id)
        if (f) formes.set(id, { ...f, ...patch } as Forme)
      }
    }, ORIGINE_LOCALE)
  }

  supprimer(page: string, ids: Iterable<string>) {
    const formes = this.formesDe(page); if (!formes) return
    this.doc.transact(() => { for (const id of ids) formes.delete(id) }, ORIGINE_LOCALE)
  }

  /** Un geste = une étape d'annulation, même s'il dure longtemps. Un geste
   *  long resté ouvert (un lever perdu) ne déborde pas sur le suivant. */
  nouveauGeste() {
    this.annulation.captureTimeout = CAPTURE
    this.annulation.stopCapturing()
  }

  /** Un geste qui écrit plusieurs fois, à son rythme (un coup de gomme lent
   *  qui passe sur trois traits) : tout ce qu'il fait, jusqu'à finGesteLong,
   *  ne fait qu'UNE étape d'annulation, quel que soit le temps entre deux
   *  changements. Le film, lui, garde une étape par changement. */
  gesteLong() {
    this.annulation.stopCapturing()
    this.annulation.captureTimeout = Infinity
  }

  finGesteLong() {
    this.annulation.captureTimeout = CAPTURE
    this.annulation.stopCapturing()
  }

  /** Ajoute des morceaux à la piste des instruments. Hors des pages : le film
   *  n'en fait pas d'étape et l'annulation ne les voit pas. */
  noterPiste(m: Morceau | Morceau[]) {
    const l = Array.isArray(m) ? m : [m]
    if (l.length) this.doc.transact(() => this.piste.push(l), ORIGINE_PISTE)
  }
}
