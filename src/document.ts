// =============================================================
// LE DOCUMENT
// Tout ce qui est écrit vit dans UN document Yjs (un CRDT).
// - Il s'enregistre dans le navigateur (IndexedDB).
// - L'annulation (une Y.UndoManager par page) ne défait que les gestes
//   (les transactions « locales ») de la page qu'on regarde, jamais le
//   chargement depuis le disque.
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
 *  de ses points (voir revoir/main-levee.ts) ; l'étape est prise au lever.
 *  seulOrdre : l'étape ne change que l'ordre des pages (une page jetée, une
 *  page rendue), rien sur aucune page ; ce n'est un geste nulle part (ni
 *  dans la revue, ni dans les séances, ni dans le film élève). Le champ est
 *  facultatif : un tableau d'avant n'en a pas, un lecteur d'avant l'ignore,
 *  et le fichier .memc garde sa version. */
export interface Etape { t: number; page: string; s: Uint8Array; ms?: number[]; seulOrdre?: true }

/** Une page jetée depuis une page (voir Tableau.jeterPage) : de quoi la
 *  remettre à sa place, et savoir quand Ctrl+Z doit la rendre. apres : la
 *  page qui la précédait (null : elle était en tête) ; index : sa place
 *  d'alors ; profondeur : la longueur de la pile de la page d'arrivée au
 *  moment du jet. */
interface Jetee { id: string; apres: string | null; index: number; profondeur: number }

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
  readonly moi = uid()
  /** Une pile d'annulation par page (voir annulationDe) : en mémoire
   *  seulement, jamais dans le document ni dans un fichier */
  private piles = new Map<string, Y.UndoManager>()
  /** La fenêtre de capture des piles : 400 ms, sans fin pendant un geste long */
  private capture = CAPTURE
  /** Les pages jetées depuis chaque page, la plus récente en dernier (voir
   *  jeterPage) : en mémoire seulement, comme les piles. Après un
   *  rechargement, une page jetée ne revient plus ; son histoire reste
   *  lisible dans la revue. */
  private jetees = new Map<string, Jetee[]>()
  /** Prévenu quand une pile change de longueur (une étape ajoutée, défaite,
   *  refaite, ou les étapes à refaire oubliées). Il l'est pendant la fin de la
   *  transaction, la pile déjà à jour : l'interface s'y remet (↶ ↷ grisés ou
   *  non), ce que les observateurs des pages ne peuvent pas faire, appelés
   *  par Yjs avant que la pile ait reçu le changement. */
  onPiles?: () => void
  private local: IndexeddbPersistence | null
  /** Les temps du trait que pose la transaction en cours (voir poserTrace) */
  private tempsDuTrace: number[] | null = null
  /** L'heure du lever de ce trait, s'il a attendu avant d'être posé */
  private heureDuTrace: number | null = null
  /** L'heure de la dernière étape notée : celle d'un trait qui a attendu ne
   *  passe jamais avant elle */
  private derniereHeure = 0

  /** nomLocal : la base du navigateur où le tableau s'enregistre (null : nulle part, pour les tests) */
  constructor(nomLocal: string | null) {
    this.ordre = this.doc.getArray('ordre')
    this.pages = this.doc.getMap('pages')
    this.film = this.doc.getArray('film')
    this.piste = this.doc.getArray('piste')
    this.local = nomLocal ? new IndexeddbPersistence(nomLocal, this.doc) : null

    // Chaque geste qui touche aux pages devient une étape du film. Pas le
    // chargement depuis le disque : ces étapes-là y sont déjà.
    this.doc.on('afterTransaction', (tr: Y.Transaction) => {
      if (tr.origin === ORIGINE_FILM || (this.local && tr.origin === this.local)) return
      if (!tr.changedParentTypes.size || ![...tr.changedParentTypes.keys()].some(t => this.dansLesPages(t))) return
      const t = this.heureDuTrace !== null ? Math.max(this.heureDuTrace, this.derniereHeure) : Date.now()
      this.derniereHeure = t
      const etape: Etape = { t, page: this.pageVue, s: Y.encodeSnapshot(Y.snapshot(this.doc)) }
      if (this.tempsDuTrace) { etape.ms = this.tempsDuTrace; this.tempsDuTrace = null }
      // Jeter une page, la rendre : seul l'ordre change, aucune page. Le
      // film le note, pour que personne n'y compte un geste.
      if ([...tr.changedParentTypes.keys()].every(x => x === this.ordre)) etape.seulOrdre = true
      this.heureDuTrace = null
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

  /** Remplace, dans la base du navigateur, tout le tableau par un autre (un
   *  fichier ouvert, voir fichier.ts). On recharge la page ensuite : le
   *  document en mémoire, lui, reste l'ancien.
   *  Une seule transaction vide le magasin et y range le nouveau tableau :
   *  si elle échoue (plus de place), rien n'a changé, l'ancien tableau reste
   *  entier. Le lien avec la base est coupé juste après l'avoir ouverte :
   *  plus rien de l'ancien document ne s'y écrit, et la base ne se ferme
   *  qu'une fois la transaction finie. Même base, même magasin. */
  async remplacerPar(etat: Uint8Array): Promise<void> {
    const local = this.local
    if (!local) throw new Error('Ce tableau n\'est enregistré nulle part.')
    await local.whenSynced
    const db = local.db
    if (!db) throw new Error('La base du navigateur n\'est pas ouverte.')
    const tr = db.transaction(['updates'], 'readwrite')
    const fin = new Promise<void>((ok, ko) => {
      tr.oncomplete = () => ok()
      tr.onabort = () => ko(tr.error ?? new Error('Transaction abandonnée.'))
    })
    const magasin = tr.objectStore('updates')
    magasin.clear()
    magasin.add(etat)
    this.local = null
    local.destroy()
    await fin
  }

  /** Plus rien ne s'écrit dans la base du navigateur (un autre onglet vient
   *  d'y ranger un autre tableau) : ce qu'on écrirait encore ici serait perdu
   *  au rechargement, mais n'abîmerait pas le nouveau. */
  couper() {
    this.local?.destroy()
    this.local = null
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

  /** Jette une page : elle quitte l'ordre, et rien d'autre. Sa Y.Map reste
   *  dans `pages`, intacte (le même objet, les mêmes formes, la même pile) :
   *  la rendre (rendrePage) la remet dans l'ordre sans rien recopier. Un
   *  undo de Yjs ne ressuscite pas un type effacé, il le recopie : les formes
   *  changeraient d'identité, et la revue comme le replay les croiraient
   *  neuves. depuis : la page où l'on se retrouve (l'application y est déjà
   *  allée) ; c'est sur elle que le jet se note, et sur elle qu'un Ctrl+Z,
   *  juste après, rend la page. Refuse (faux) la dernière page, une page
   *  hors de l'ordre, un depuis absent ou égal à la page.
   *  La transaction n'a pas d'origine : aucune pile ne la prend (Ctrl+Z
   *  passe par la marque, voir annuler). */
  jeterPage(id: string, depuis: string): boolean {
    const ordre = this.ordre.toArray()
    const i = ordre.indexOf(id)
    if (i < 0 || ordre.length <= 1 || id === depuis || !ordre.includes(depuis)) return false
    // Ce qu'on écrira ensuite sur `depuis` fera sa propre étape : la marque
    // se place entre les deux
    this.nouveauGeste()
    const vue = this.pageVue
    this.pageVue = depuis
    try { this.doc.transact(() => this.ordre.delete(i, 1)) } finally { this.pageVue = vue }
    const marques = this.jetees.get(depuis) ?? []
    marques.push({ id, apres: i > 0 ? ordre[i - 1] : null, index: i, profondeur: this.annulationDe(depuis)?.undoStack.length ?? 0 })
    this.jetees.set(depuis, marques)
    // ↶ s'allume sur la page d'arrivée, même si elle n'a encore aucun geste
    this.onPiles?.()
    return true
  }

  /** Rend une page jetée : elle revient juste après la page qui la
   *  précédait si celle-ci est encore là, sinon à sa place d'alors (ou au
   *  bout). Sa marque s'en va, où qu'elle soit. L'étape se note sur la page
   *  rendue (comme ajouterPage) : le replay ne compte pas celle qu'on quitte.
   *  Rend sa nouvelle place, ou −1 s'il n'y a rien à faire (déjà dans
   *  l'ordre, ou effacée par l'ancienne suppression). */
  rendrePage(id: string): number {
    let marque: Jetee | null = null
    for (const [p, l] of this.jetees) {
      const k = l.findIndex(m => m.id === id)
      if (k >= 0) marque = l.splice(k, 1)[0]
      if (!l.length) this.jetees.delete(p)
    }
    const ordre = this.ordre.toArray()
    if (ordre.includes(id) || !(this.pages.get(id) instanceof Y.Map)) { if (marque) this.onPiles?.(); return -1 }
    const voisine = marque?.apres ? ordre.indexOf(marque.apres) : -1
    const place = voisine >= 0 ? voisine + 1 : Math.min(marque?.index ?? ordre.length, ordre.length)
    const vue = this.pageVue
    this.pageVue = id
    try { this.doc.transact(() => this.ordre.insert(place, [id])) } finally { if (vue) this.pageVue = vue }
    this.onPiles?.()
    return place
  }

  /** La dernière page jetée depuis cette page et pas encore rendue (null :
   *  aucune). Les marques des pages déjà revenues (par le bouton du message)
   *  s'en vont au passage. */
  private derniereJetee(page: string): Jetee | null {
    const l = this.jetees.get(page)
    if (!l) return null
    const ordre = new Set(this.ordre.toArray())
    for (let k = l.length - 1; k >= 0; k--) if (ordre.has(l[k].id) || !(this.pages.get(l[k].id) instanceof Y.Map)) l.splice(k, 1)
    if (!l.length) { this.jetees.delete(page); return null }
    return l[l.length - 1]
  }

  /** L'ancienne suppression : la page quitte l'ordre ET sa Y.Map est effacée
   *  (hors annulation). L'application ne s'en sert plus (elle jette la page,
   *  voir jeterPage) ; elle reste pour les tests qui fabriquent des tableaux
   *  d'avant, que la revue et l'export doivent toujours lire. */
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
  // Chacune demande d'abord la pile de sa page (voir annulationDe).
  poser(page: string, forme: Forme) {
    const formes = this.formesDe(page); if (!formes) return
    this.annulationDe(page)
    this.doc.transact(() => formes.set(forme.id, forme), ORIGINE_LOCALE)
  }

  /** Pose plusieurs formes d'un coup (un collage, une duplication) : UNE
   *  transaction, donc une étape d'annulation (un Ctrl+Z retire tout le
   *  collage) et une étape du film (le replay les montre paraître ensemble). */
  poserPlusieurs(page: string, liste: Forme[]) {
    const formes = this.formesDe(page); if (!formes || !liste.length) return
    this.annulationDe(page)
    this.doc.transact(() => { for (const f of liste) formes.set(f.id, f) }, ORIGINE_LOCALE)
  }

  /** Pose un trait tracé à la main. L'étape du film qu'il fait naître note le
   *  temps passé sur chacun de ses points (ms, un par point) : le replay le
   *  retracera au rythme de la main. Le trait, lui, reste un trait comme les
   *  autres : une copie ou un Ctrl+Z ne reprend pas ce rythme. heure : celle
   *  du lever (Date.now()), quand le trait a attendu avant d'être posé (le
   *  point d'un simple toucher, qui attend un éventuel double-clic) ; sans
   *  elle, l'étape prend l'heure où il est posé. */
  poserTrace(page: string, trait: Trait, ms: number[], heure?: number) {
    this.tempsDuTrace = ms.length && ms.length === trait.pts.length / 3 ? ms : null
    this.heureDuTrace = heure ?? null
    try { this.poser(page, trait) } finally { this.tempsDuTrace = null; this.heureDuTrace = null }
  }

  modifier(page: string, changements: { id: string; patch: Partial<Forme> }[]) {
    const formes = this.formesDe(page); if (!formes) return
    this.annulationDe(page)
    this.doc.transact(() => {
      for (const { id, patch } of changements) {
        const f = formes.get(id)
        if (f) formes.set(id, { ...f, ...patch } as Forme)
      }
    }, ORIGINE_LOCALE)
  }

  supprimer(page: string, ids: Iterable<string>) {
    const formes = this.formesDe(page); if (!formes) return
    this.annulationDe(page)
    this.doc.transact(() => { for (const id of ids) formes.delete(id) }, ORIGINE_LOCALE)
  }

  // ---------- Annulation : une pile par page ----------
  /** La pile d'annulation d'une page, créée à la demande (null : la page
   *  n'existe pas). Sa portée est la page elle-même : une transaction qui
   *  écrit sur la page P n'entre que dans la pile de P, et Ctrl+Z sur une
   *  page ne peut plus défaire, sans rien montrer, ce qu'on a fait sur une
   *  autre. Chaque pile a son propre ensemble d'origines suivies : Yjs y
   *  ajoute la pile elle-même (ce qu'elle défait, elle peut le refaire) ;
   *  partagé, chaque pile suivrait aussi les annulations des autres.
   *  poser, modifier et supprimer la demandent AVANT d'écrire : créée au
   *  milieu d'une transaction englobante (la figure reconnue qui remplace son
   *  tracé), elle la reçoit quand même, Yjs lisant ses écouteurs au moment de
   *  finir la transaction. Une pile qui naît pendant un geste long (le coup de
   *  gomme sur une page relue du disque, où rien n'a encore été écrit cette
   *  fois) prend la fenêtre du moment : le coup reste une seule étape. */
  annulationDe(page: string): Y.UndoManager | null {
    const p = this.pages.get(page)
    if (!(p instanceof Y.Map)) return null
    const deja = this.piles.get(page)
    if (deja && deja.scope[0] === p) return deja
    deja?.destroy()
    const u = new Y.UndoManager(p, { trackedOrigins: new Set([ORIGINE_LOCALE]), captureTimeout: this.capture })
    const prevenir = () => this.onPiles?.()
    u.on('stack-item-added', prevenir)
    u.on('stack-item-popped', prevenir)
    u.on('stack-cleared', prevenir)
    this.piles.set(page, u)
    return u
  }

  /** La pile de la page qu'on regarde (à défaut, de la première page) :
   *  gardée pour les tests et le code d'avant, qui écrivent et annulent sur
   *  la page qu'ils regardent. L'application passe par annuler(page). */
  get annulation(): Y.UndoManager {
    const u = this.annulationDe(this.pageVue) ?? this.annulationDe(this.ordre.get(0))
    if (!u) throw new Error('Le tableau n\'a pas encore de page.')
    return u
  }

  /** Défait le dernier geste de cette page, et d'elle seule. Rend null s'il
   *  n'y avait rien à défaire, un objet sinon : { page } quand c'est une page
   *  jetée depuis celle-ci qui revient. Le jet passe avant les gestes faits
   *  sur la page avant lui, après ceux faits depuis : la marque retient la
   *  longueur de la pile au moment du jet. Rétablir ne rejette jamais une
   *  page (on ne jette pas une page sans la voir). */
  annuler(page: string): { page?: string } | null {
    const u = this.piles.get(page)
    const m = this.derniereJetee(page)
    if (m && (u?.undoStack.length ?? 0) <= m.profondeur) return this.rendrePage(m.id) >= 0 ? { page: m.id } : null
    if (!u || !u.undoStack.length) return null
    return u.undo() ? {} : null
  }

  /** Refait le dernier geste défait sur cette page. Vrai s'il y en avait un. */
  retablir(page: string): boolean {
    const u = this.piles.get(page)
    return !!u && u.redoStack.length > 0 && !!u.redo()
  }

  /** Y a-t-il un geste à défaire, à refaire, sur cette page ? Une page dont la
   *  pile n'existe pas encore n'a rien (on ne la crée pas pour le savoir) ;
   *  une page jetée depuis celle-ci se défait (Ctrl+Z la rend). */
  peutAnnuler(page: string): boolean { return (this.piles.get(page)?.undoStack.length ?? 0) > 0 || this.derniereJetee(page) !== null }
  peutRetablir(page: string): boolean { return (this.piles.get(page)?.redoStack.length ?? 0) > 0 }

  /** Un geste = une étape d'annulation, même s'il dure longtemps. Un geste
   *  long resté ouvert (un lever perdu) ne déborde pas sur le suivant. Toutes
   *  les piles : le geste suivant peut écrire sur une autre page (le point en
   *  attente se pose sur la sienne). */
  nouveauGeste() {
    this.capture = CAPTURE
    for (const u of this.piles.values()) { u.captureTimeout = CAPTURE; u.stopCapturing() }
  }

  /** Un geste qui écrit plusieurs fois, à son rythme (un coup de gomme lent
   *  qui passe sur trois traits) : tout ce qu'il fait, jusqu'à finGesteLong,
   *  ne fait qu'UNE étape d'annulation, quel que soit le temps entre deux
   *  changements. Le film, lui, garde une étape par changement. */
  gesteLong() {
    this.capture = Infinity
    for (const u of this.piles.values()) { u.stopCapturing(); u.captureTimeout = Infinity }
  }

  finGesteLong() { this.nouveauGeste() }

  /** Ajoute des morceaux à la piste des instruments. Hors des pages : le film
   *  n'en fait pas d'étape et l'annulation ne les voit pas. */
  noterPiste(m: Morceau | Morceau[]) {
    const l = Array.isArray(m) ? m : [m]
    if (l.length) this.doc.transact(() => this.piste.push(l), ORIGINE_PISTE)
  }
}
