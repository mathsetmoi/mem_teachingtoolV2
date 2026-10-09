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
 *  page rendue ou remise de la corbeille, une copie retirée, des pages
 *  déplacées), rien sur aucune page ; ce n'est un geste nulle part (ni dans
 *  la revue, ni dans les séances, ni dans le film élève). La corbeille et
 *  les noms des pages, qui s'écrivent parfois dans la même transaction, ne
 *  sont pas des pages : ils n'y comptent pas. Le champ est facultatif : un
 *  tableau d'avant n'en a pas, un lecteur d'avant l'ignore, et le fichier
 *  .memc garde sa version.
 *  naissance : l'étape est la naissance d'une copie de page (« Dupliquer la
 *  page », voir dupliquerPage). Ce n'est pas un geste non plus : la copie
 *  continue la page d'où elle vient, rien ne surgit. La revue et le film
 *  élève la reconnaissent déjà à la filiation (voir heritage.ts) ; la note
 *  sert au découpage en séances (seancesDuFilm), qui ne lit que le film :
 *  sans elle, une copie faite après le cours devenait une séance d'un geste
 *  (choisie d'office par Publier, sans rien à montrer), et une copie faite
 *  entre deux cours les réunissait. Facultative comme seulOrdre. */
export interface Etape { t: number; page: string; s: Uint8Array; ms?: number[]; seulOrdre?: true; naissance?: true }

/** L'entrée d'une page dans la corbeille (voir Tableau.corbeille). t : quand
 *  elle a quitté l'ordre (Date.now()) ; apres : la page qui la précédait
 *  (null : elle était en tête ; absent : on ne le sait pas) ; index : sa
 *  place d'alors ; definitif : supprimée définitivement, ou copie retirée par
 *  Ctrl+Z : elle ne se montre plus dans la corbeille et ne revient jamais. */
export interface EntreeCorbeille { t: number; apres?: string | null; index?: number; definitif?: true }

/** Ce qu'une marque d'annulation retient (voir Tableau.annuler). Une page
 *  jetée depuis une page : de quoi la remettre à sa place (apres : la page
 *  qui la précédait, null en tête ; index : sa place d'alors). Une page
 *  copiée (« Dupliquer la page ») : la copie, que Ctrl+Z retire tant qu'elle
 *  est vierge. profondeur : la longueur de la pile de la page marquée au
 *  moment de la marque ; Ctrl+Z la prend quand la pile n'est pas plus longue. */
type Marque =
  | { genre: 'jetee'; id: string; apres: string | null; index: number; profondeur: number }
  | { genre: 'copie'; id: string; profondeur: number }

/** Une étape d'une pile d'annulation (Yjs ne nomme pas son type) */
export type EtapeDePile = Y.UndoManager['undoStack'][number]

/** Ce que retient l'étape du retrait d'un envoi, dans la pile de la page de
 *  départ (sa méta 'envoi', voir Tableau.envoyer) : la page d'arrivée, les
 *  objets posés sur elle (les objets mêmes : ils y sont encore « tels quels »
 *  tant que la page d'arrivée rend le même objet), combien d'objets ont
 *  quitté la page de départ, et la nouvelle page créée pour eux. Après une
 *  annulation, l'étape à refaire retient aussi ceux qu'on a retirés de
 *  l'arrivée (à y reposer) et si la nouvelle page a quitté l'ordre. En
 *  mémoire seulement, comme les piles. */
interface Envoi {
  vers: string
  posees: Forme[]
  n: number
  nouvelle?: { id: string; place: number }
  retirees?: Forme[]
  pageRetiree?: boolean
}
/** La méta de l'arrivée d'une copie envoyée, dans la pile de la page d'arrivée */
interface CopieRecue { de: string; n: number }
const META_ENVOI = 'envoi'
const META_COPIE = 'envoi-copie'

/** Ce que rend Tableau.annuler : {} pour un geste ordinaire défait ; page :
 *  la page jetée depuis celle-ci qui revient ; copie et retour : la copie
 *  toute neuve qui s'en va, et son original ; envoi : un déplacement vers une
 *  autre page défait (vers : la page d'arrivée ; revenus : les objets
 *  revenus ; restes : ceux qui, modifiés depuis sur la page d'arrivée, y
 *  restent aussi ; absents : ceux qui n'y étaient plus et que rien n'y
 *  ramènera, effacés ou envoyés ailleurs depuis sur une page supprimée
 *  définitivement (seulement s'il y en a) ; pageRetiree : la nouvelle page
 *  créée pour eux, redevenue vide, a quitté l'ordre) ; copieRecue :
 *  l'arrivée d'une copie défaite sur la page d'arrivée (de : la page d'où
 *  elle venait ; n : les objets) ; envoiBloque : un déplacement qui ne se
 *  défait pas encore, RIEN n'a changé (vers : la page d'arrivée ; n : les
 *  objets qui en sont repartis par un autre envoi, ou y ont été effacés, et
 *  que la pile de cette page-là peut y ramener ; total : les objets de
 *  l'envoi ; voir annuler). */
export interface Annulation {
  page?: string
  copie?: string
  retour?: string
  envoi?: { vers: string; revenus: number; restes: number; absents?: number; pageRetiree: boolean }
  copieRecue?: CopieRecue
  envoiBloque?: { vers: string; n: number; total: number }
}

/** Ce que rend Tableau.retablir : faux s'il n'y avait rien à refaire, vrai
 *  pour un geste ordinaire refait ; pour un déplacement refait, la page
 *  d'arrivée, le nombre d'objets repartis, et si la nouvelle page créée pour
 *  eux est revenue dans l'ordre ; pour un déplacement qui ne se refait pas
 *  (sa page d'arrivée est supprimée définitivement : les objets y
 *  partiraient pour toujours), la page d'arrivée ; rien n'a changé. */
export type Retablissement = boolean
  | { envoi: { vers: string; repartis: number; pageRemise: boolean } }
  | { envoiImpossible: { vers: string } }

/** L'ordre, les noms et la corbeille d'un coup (voir Tableau.etatDesPages) :
 *  le cliché que garde le journal de la trieuse, avant et après chaque action. */
export interface EtatDesPages { ordre: string[]; noms: Record<string, string>; corbeille: Record<string, EntreeCorbeille> }

/** Un nom de page tient en 60 caractères */
export const LONGUEUR_NOM = 60
/** La chaîne des voisines suivie pour remettre une page (voir placeDeRetour) */
const PAS_DE_VOISINES = 64

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
  /** Les pages supprimées : id → EntreeCorbeille. Une page est dans la
   *  corbeille quand sa Y.Map est dans `pages`, hors de `ordre`, qu'elle a
   *  quelque chose (une forme, un nom) et que son entrée, s'il y en a une, ne
   *  la dit pas définitive (voir dansLaCorbeille). Une carte de premier
   *  niveau, hors des pages : y écrire ne fait aucune étape du film et
   *  n'entre dans aucune pile d'annulation ; elle survit au rechargement et
   *  au fichier .memc sans autre code. Une page jetée avant elle (lot 2) n'y
   *  a pas d'entrée : elle est quand même dans la corbeille. */
  readonly corbeille: Y.Map<EntreeCorbeille>
  /** Les noms des pages (facultatifs, 60 caractères) : id → nom. Hors des
   *  pages comme la corbeille : ni étape du film, ni annulation de page. */
  readonly noms: Y.Map<string>
  /** La page que l'on regarde : notée avec chaque étape du film */
  pageVue = ''
  readonly moi = uid()
  /** Une pile d'annulation par page (voir annulationDe) : en mémoire
   *  seulement, jamais dans le document ni dans un fichier */
  private piles = new Map<string, Y.UndoManager>()
  /** La fenêtre de capture des piles : 400 ms, sans fin pendant un geste long */
  private capture = CAPTURE
  /** Les marques d'annulation de chaque page, la plus récente en dernier :
   *  les pages jetées depuis elle (voir jeterPage), la copie qu'elle est
   *  (voir dupliquerPage). En mémoire seulement, comme les piles : après un
   *  rechargement, Ctrl+Z ne rend plus une page jetée (la corbeille, elle,
   *  la garde) et ne retire plus une copie. */
  private marques = new Map<string, Marque[]>()
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
  /** La transaction en cours fait naître une copie de page (voir
   *  dupliquerPage) : son étape le note */
  private naissanceDeCopie = false

  /** nomLocal : la base du navigateur où le tableau s'enregistre (null : nulle part, pour les tests) */
  constructor(nomLocal: string | null) {
    this.ordre = this.doc.getArray('ordre')
    this.pages = this.doc.getMap('pages')
    this.film = this.doc.getArray('film')
    this.piste = this.doc.getArray('piste')
    this.corbeille = this.doc.getMap('corbeille')
    this.noms = this.doc.getMap('nomsPages')
    // Une marque qui ne vaut plus s'en va tout de suite, quel que soit le
    // chemin (la trieuse, la corbeille, un fichier) : une copie partie puis
    // remise, une page jetée puis revenue, ne réveillent pas une vieille marque
    const elaguer = () => this.elaguerMarques()
    this.ordre.observe(elaguer)
    this.corbeille.observe(elaguer)
    this.local = nomLocal ? new IndexeddbPersistence(nomLocal, this.doc) : null

    // Chaque geste qui touche aux pages devient une étape du film. Pas le
    // chargement depuis le disque : ces étapes-là y sont déjà.
    this.doc.on('afterTransaction', (tr: Y.Transaction) => {
      if (tr.origin === ORIGINE_FILM || (this.local && tr.origin === this.local)) return
      const touches = [...tr.changedParentTypes.keys()].filter(x => this.dansLesPages(x))
      if (!touches.length) return
      const t = this.heureDuTrace !== null ? Math.max(this.heureDuTrace, this.derniereHeure) : Date.now()
      this.derniereHeure = t
      const etape: Etape = { t, page: this.pageVue, s: Y.encodeSnapshot(Y.snapshot(this.doc)) }
      if (this.tempsDuTrace) { etape.ms = this.tempsDuTrace; this.tempsDuTrace = null }
      // Jeter une page, la rendre, la remettre, déplacer des pages : seul
      // l'ordre change, aucune page. Le film le note, pour que personne n'y
      // compte un geste. On ne regarde que les types des pages : l'entrée de
      // corbeille écrite avec le retrait n'en est pas un.
      if (touches.every(x => x === this.ordre)) etape.seulOrdre = true
      else if (this.naissanceDeCopie) etape.naissance = true
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

  /** Jette une page : elle quitte l'ordre et entre dans la corbeille, rien
   *  d'autre. Sa Y.Map reste dans `pages`, intacte (le même objet, les mêmes
   *  formes, la même pile) : la rendre (rendrePage) la remet dans l'ordre sans
   *  rien recopier. Un undo de Yjs ne ressuscite pas un type effacé, il le
   *  recopie : les formes changeraient d'identité, et la revue comme le replay
   *  les croiraient neuves. depuis : la page où l'on se retrouve
   *  (l'application y est déjà allée) ; c'est sur elle que le jet se note, et
   *  sur elle qu'un Ctrl+Z, juste après, rend la page. Refuse (faux) la
   *  dernière page, une page hors de l'ordre, un depuis absent ou égal à la
   *  page.
   *  L'entrée de corbeille s'écrit dans la même transaction que le retrait :
   *  l'étape reste « seulOrdre » (la corbeille n'est pas une page). La
   *  transaction n'a pas d'origine : aucune pile ne la prend (Ctrl+Z passe
   *  par la marque, voir annuler). */
  jeterPage(id: string, depuis: string): boolean {
    const ordre = this.ordre.toArray()
    const i = ordre.indexOf(id)
    if (i < 0 || ordre.length <= 1 || id === depuis || !ordre.includes(depuis)) return false
    // Ce qu'on écrira ensuite sur `depuis` fera sa propre étape : la marque
    // se place entre les deux
    this.nouveauGeste()
    const apres = i > 0 ? ordre[i - 1] : null
    const vue = this.pageVue
    this.pageVue = depuis
    try {
      this.doc.transact(() => {
        this.ordre.delete(i, 1)
        this.corbeille.set(id, { t: Date.now(), apres, index: i })
      })
    } finally { this.pageVue = vue }
    this.marquer(depuis, { genre: 'jetee', id, apres, index: i, profondeur: this.annulationDe(depuis)?.undoStack.length ?? 0 })
    // ↶ s'allume sur la page d'arrivée, même si elle n'a encore aucun geste
    this.onPiles?.()
    return true
  }

  /** Jette plusieurs pages d'un coup (la trieuse) : UNE transaction, notée
   *  sur la page qu'on regarde (l'application est déjà allée sur une page qui
   *  reste). Ne retire jamais toutes les pages (rien, alors) ; ignore celles
   *  qui ne sont pas dans l'ordre. Chacune entre dans la corbeille avec sa
   *  voisine IMMÉDIATE d'avant (même si elle part aussi : remettrePage suit
   *  la chaîne, et deux voisines reviennent dans le bon ordre) et sa place
   *  d'avant. Rend les pages retirées, dans l'ordre.
   *  vue : la page qu'on regardait et celle où l'on vient d'arriver (sur
   *  laquelle l'étape se note). Si la première part et que la seconde reste,
   *  la marque d'un jet se pose sur la page d'arrivée, comme jeterPage :
   *  après la fermeture de la trieuse, Ctrl+Z y rend la page qu'on
   *  regardait, comme après la poubelle (deux façons de supprimer, un seul
   *  Ctrl+Z). Les autres pages n'ont pas de marque : la trieuse a son
   *  journal, et la corbeille est le filet. */
  jeterPages(ids: string[], o: { vue?: { page: string; depuis: string } } = {}): string[] {
    const ordre = this.ordre.toArray()
    const tirees = new Set(ids.filter(id => ordre.includes(id)))
    if (!tirees.size || tirees.size >= ordre.length) return []
    const v = o.vue
    const reste = !!v && ordre.includes(v.depuis) && !tirees.has(v.depuis)
    const marque = reste && tirees.has(v!.page)
    if (marque) this.nouveauGeste()
    const vue = this.pageVue
    if (reste) this.pageVue = v!.depuis
    const t = Date.now()
    try {
      this.doc.transact(() => {
        for (const [i, n] of plagesDe(ordre, tirees).reverse()) this.ordre.delete(i, n)
        ordre.forEach((id, i) => { if (tirees.has(id)) this.corbeille.set(id, { t, apres: i > 0 ? ordre[i - 1] : null, index: i }) })
      })
    } finally { this.pageVue = vue }
    if (marque) {
      // La marque retient la voisine d'avant qui RESTE, et la place parmi les
      // pages qui restent : sa voisine immédiate part peut-être aussi, et
      // Ctrl+Z la remettrait alors à sa place d'alors, après des pages qui la
      // suivaient (l'entrée de corbeille, elle, garde la voisine immédiate,
      // que remettrePage suit de proche en proche)
      const avant = ordre.slice(0, ordre.indexOf(v!.page)).filter(id => !tirees.has(id))
      this.marquer(v!.depuis, { genre: 'jetee', id: v!.page, apres: avant.length ? avant[avant.length - 1] : null, index: avant.length, profondeur: this.annulationDe(v!.depuis)?.undoStack.length ?? 0 })
    }
    this.onPiles?.()
    return ordre.filter(id => tirees.has(id))
  }

  /** Rend une page jetée (« Annuler » du message, Ctrl+Z) : elle revient
   *  juste après la page qui la précédait si celle-ci est encore là, sinon à
   *  sa place d'alors (ou au bout), et quitte la corbeille dans la même
   *  transaction. Sa marque s'en va, où qu'elle soit. L'étape se note sur la
   *  page rendue (comme ajouterPage) : le replay ne compte pas celle qu'on
   *  quitte. Rend sa nouvelle place, ou −1 s'il n'y a rien à faire (déjà dans
   *  l'ordre, effacée par l'ancienne suppression) ou si elle a été supprimée
   *  définitivement : celle-là ne revient jamais, et son entrée reste. */
  rendrePage(id: string): number {
    let marque: Marque | null = null
    for (const [p, l] of this.marques) {
      const k = l.findIndex(m => m.genre === 'jetee' && m.id === id)
      if (k >= 0) marque = l.splice(k, 1)[0]
      if (!l.length) this.marques.delete(p)
    }
    const ordre = this.ordre.toArray()
    const entree = this.entree(id)
    if (ordre.includes(id) || !(this.pages.get(id) instanceof Y.Map) || entree?.definitif) { if (marque) this.onPiles?.(); return -1 }
    // La marque dit la place ; à défaut (elle s'est perdue), l'entrée de la
    // corbeille, écrite au même moment, dit la même
    const ou = marque?.genre === 'jetee' ? marque : entree
    const voisine = typeof ou?.apres === 'string' ? ordre.indexOf(ou.apres) : -1
    const index = typeof ou?.index === 'number' ? ou.index : ordre.length
    const place = voisine >= 0 ? voisine + 1 : Math.max(0, Math.min(index, ordre.length))
    const vue = this.pageVue
    this.pageVue = id
    try {
      this.doc.transact(() => { this.ordre.insert(place, [id]); this.corbeille.delete(id) })
    } finally { if (vue) this.pageVue = vue }
    this.onPiles?.()
    return place
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

  // ---------- La corbeille ----------
  /** L'entrée d'une page dans la corbeille, si elle en a une qui se lit */
  private entree(id: string): EntreeCorbeille | null {
    const e = this.corbeille.get(id)
    return e && typeof e === 'object' ? e : null
  }

  /** La page est-elle dans la corbeille ? Sa Y.Map est là, hors de l'ordre,
   *  pas définitive, et elle a quelque chose à reprendre (une forme, ou un
   *  nom) : une page vide n'y figure pas, ce qui fait aussi disparaître une
   *  page vide insérée puis retirée. Une page effacée par l'ancienne
   *  suppression n'y est jamais. */
  dansLaCorbeille(id: string, ordre: ReadonlySet<string> = new Set(this.ordre.toArray())): boolean {
    if (ordre.has(id) || !(this.pages.get(id) instanceof Y.Map) || this.entree(id)?.definitif) return false
    return (this.formesDe(id)?.size ?? 0) > 0 || this.nomDe(id) !== null
  }

  /** Les pages de la corbeille, de la plus récemment supprimée à la plus
   *  ancienne. t : l'heure de l'entrée ; une page jetée avant la corbeille
   *  (lot 2) n'en a pas : t null, ancienne. derniere : l'heure de la dernière
   *  étape du film notée sur elle (un seul passage sur le film pour toutes) ;
   *  elle range les anciennes, et celles dont on ne sait rien vont à la fin. */
  pagesDeLaCorbeille(): { id: string; t: number | null; derniere: number | null; ancienne: boolean }[] {
    const ordre = new Set(this.ordre.toArray())
    const r: { id: string; t: number | null; derniere: number | null; ancienne: boolean }[] = []
    for (const id of this.pages.keys()) {
      if (!this.dansLaCorbeille(id, ordre)) continue
      const e = this.entree(id)
      r.push({ id, t: e && typeof e.t === 'number' ? e.t : null, derniere: null, ancienne: !e })
    }
    if (!r.length) return r
    const parPage = new Map(r.map(x => [x.id, x]))
    this.film.forEach(e => { const x = parPage.get(e.page); if (x) x.derniere = e.t })
    const quand = (x: { t: number | null; derniere: number | null }) => x.t ?? x.derniere
    return r.sort((a, b) => {
      const qa = quand(a), qb = quand(b)
      return qa === null ? (qb === null ? 0 : 1) : qb === null ? -1 : qb - qa
    })
  }

  /** Remet une page de la corbeille dans l'ordre. Sa place : juste après la
   *  première voisine trouvée DANS l'ordre en remontant la chaîne des
   *  `apres` ; une voisine hors de l'ordre qui a une entrée (dans la
   *  corbeille ou définitive) est sautée, on suit la sienne. Une chaîne qui
   *  finit en tête (null) : en tête. Une voisine sans entrée (effacée, ou
   *  jetée avant la corbeille), une page sans entrée ou sans voisine connue :
   *  à la fin. Ainsi deux voisines supprimées ensemble reviennent dans le bon
   *  ordre, quel que soit l'ordre des remises. Une transaction, notée sur la
   *  page remise (comme ajouterPage) : une étape seulOrdre. Rend sa nouvelle
   *  place, ou −1 si elle n'est pas dans la corbeille. */
  remettrePage(id: string): number {
    const ordre = this.ordre.toArray()
    if (!this.dansLaCorbeille(id, new Set(ordre))) return -1
    const place = this.placeDeRetour(id, ordre)
    const vue = this.pageVue
    this.pageVue = id
    try {
      this.doc.transact(() => { this.ordre.insert(place, [id]); this.corbeille.delete(id) })
    } finally { if (vue) this.pageVue = vue }
    // Une marque de jet qui l'attendait ne vaut plus : ↶ se remet à jour
    this.onPiles?.()
    return place
  }

  /** La place où remettre une page (voir remettrePage) */
  private placeDeRetour(id: string, ordre: string[]): number {
    const rang = new Map(ordre.map((p, i) => [p, i]))
    let e = this.entree(id)
    for (let pas = 0; pas < PAS_DE_VOISINES && e; pas++) {
      if (e.apres === null) return 0
      if (typeof e.apres !== 'string') return ordre.length
      const k = rang.get(e.apres)
      if (k !== undefined) return k + 1
      e = this.entree(e.apres)
    }
    return ordre.length
  }

  /** Supprime définitivement des pages de la corbeille : leur entrée le dit
   *  (definitif), et leurs marques d'annulation s'en vont (ni Ctrl+Z ni
   *  « Annuler » ne les remettent plus). Rien d'autre : la Y.Map reste dans
   *  `pages` (le passé d'une copie qui en hérite reste lisible, et la revue
   *  garde son histoire sous « Pages jetées »), aucune étape du film. Rend le
   *  nombre de pages marquées. */
  supprimerDefinitivement(ids: string[]): number {
    const ordre = new Set(this.ordre.toArray())
    const a = [...new Set(ids)].filter(id => this.dansLaCorbeille(id, ordre))
    if (!a.length) return 0
    const t = Date.now()
    this.doc.transact(() => { for (const id of a) this.corbeille.set(id, { ...(this.entree(id) ?? { t }), definitif: true }) })
    for (const id of a) this.oublierMarques(id)
    this.onPiles?.()
    return a.length
  }

  // ---------- Les noms ----------
  /** Le nom d'une page (null : elle n'en a pas) */
  nomDe(page: string): string | null {
    const n = this.noms.get(page)
    return typeof n === 'string' && n ? n : null
  }

  /** Nomme une page, ou lui retire son nom (vide, null). Le nom est mis au
   *  propre (voir nomPropre). Faux pour une page qui n'a pas de Y.Map, ou si
   *  rien ne change. Une transaction sans origine, hors des pages : ni étape
   *  du film, ni annulation de page. */
  renommerPage(page: string, nom: string | null): boolean {
    if (!(this.pages.get(page) instanceof Y.Map)) return false
    const propre = nomPropre(nom)
    if (propre ? this.noms.get(page) === propre : !this.noms.has(page)) return false
    this.doc.transact(() => { if (propre) this.noms.set(page, propre); else this.noms.delete(page) })
    return true
  }

  // ---------- La copie d'une page, avec son histoire ----------
  /** La page dont celle-ci est la copie (null : une page ordinaire, ou d'un
   *  tableau d'avant). La revue et l'exporteur lisent, avant la naissance de
   *  la copie (la première étape du film notée sur elle), l'état de cette
   *  page-là dans les instantanés. */
  herite(page: string): string | null {
    const p = this.pages.get(page)
    const h = p instanceof Y.Map ? p.get('herite') : null
    const de = h && typeof h === 'object' ? (h as { de?: unknown }).de : null
    return typeof de === 'string' && de && de !== page ? de : null
  }

  /** Duplique une page avec son histoire. La copie a le même fond, la même
   *  origine, le même nom suivi de « (copie) », et chaque forme SOUS LE MÊME
   *  IDENTIFIANT, en copie (aucun objet partagé) ; elle note `herite: { de }`.
   *  Elle se place juste après l'original (la fin s'il n'est pas dans
   *  l'ordre), ou à `position`. UNE transaction, notée sur la NOUVELLE page
   *  (comme ajouterPage) : c'est sa naissance (l'étape le note : naissance,
   *  voir Etape), et rien d'autre n'est à noter.
   *  Pourquoi les mêmes identifiants : au replay, une forme qui existait
   *  dans le passé hérité ne doit ni surgir ni se redessiner à la naissance
   *  de la copie, et la revue reconnaît les formes à leur identifiant. Rien
   *  du film n'est recopié : une copie coûte le poids de la page dans le
   *  document, jamais celui de son film.
   *  Pas d'origine : aucune pile ne la prend, celle de la copie commence
   *  vide, celle de l'original ne change pas. marque : Ctrl+Z sur la copie,
   *  tant qu'elle est vierge, la retire (« Dupliquer la page » au tableau ;
   *  la trieuse duplique sans marque, son journal l'annule). Rend la copie,
   *  ou null si la page n'a pas de Y.Map avec ses formes. */
  dupliquerPage(p: string, o: { position?: number; marque?: boolean } = {}): string | null {
    const source = this.pages.get(p)
    const formes = this.formesDe(p)
    if (!(source instanceof Y.Map) || !formes) return null
    const id = uid()
    const ordre = this.ordre.toArray()
    const k = ordre.indexOf(p)
    const position = Math.max(0, Math.min(o.position ?? (k >= 0 ? k + 1 : ordre.length), ordre.length))
    const nom = this.nomDe(p)
    const origine = source.get('origine')
    const vue = this.pageVue
    this.pageVue = id
    this.naissanceDeCopie = true
    try {
      this.doc.transact(() => {
        const m = new Y.Map<unknown>()
        m.set('fond', this.fondDe(p))
        if (origine && typeof origine === 'object') m.set('origine', JSON.parse(JSON.stringify(origine)))
        m.set('herite', { de: p })
        const f = new Y.Map<Forme>()
        for (const [fid, forme] of formes) f.set(fid, JSON.parse(JSON.stringify(forme)) as Forme)
        m.set('formes', f)
        this.pages.set(id, m)
        this.ordre.insert(position, [id])
        if (nom) this.noms.set(id, nomDeCopie(nom))
      })
    } finally { this.naissanceDeCopie = false; if (vue) this.pageVue = vue }
    if (o.marque) {
      this.marquer(id, { genre: 'copie', id, profondeur: 0 })
      this.onPiles?.()
    }
    return id
  }

  /** Retire une copie toute neuve (Ctrl+Z juste après « Dupliquer la page ») :
   *  elle quitte l'ordre, définitive (ce n'est pas une suppression : elle ne
   *  va pas dans la corbeille), et l'on revient sur son original. Refuse
   *  (null) ce qui n'est pas une copie dans l'ordre, une copie dont l'original
   *  n'est plus dans l'ordre (la retirer ferait disparaître le seul
   *  exemplaire visible), la seule page, et une copie qui n'est plus telle
   *  qu'à sa naissance (voir vierge : ce qu'on y a envoyé, son fond changé,
   *  ne disparaissent pas avec elle). La page de retour se choisit avant le
   *  retrait ; l'étape, seulOrdre, se note sur elle. Rend la page de retour. */
  retirerCopie(id: string): string | null {
    const ordre = this.ordre.toArray()
    const i = ordre.indexOf(id)
    const retour = this.herite(id)
    if (i < 0 || !retour || !ordre.includes(retour) || ordre.length <= 1 || !this.vierge(id)) return null
    const vue = this.pageVue
    this.pageVue = retour
    try {
      this.doc.transact(() => {
        this.ordre.delete(i, 1)
        this.corbeille.set(id, { t: Date.now(), apres: i > 0 ? ordre[i - 1] : null, index: i, definitif: true })
      })
    } finally { this.pageVue = vue }
    this.oublierMarques(id)
    this.onPiles?.()
    return retour
  }

  /** Ce que ferait le retrait de la copie toute neuve `id` (le bouton
   *  « Annuler » du message de « Dupliquer la page ») : 'oui', elle
   *  partirait ; 'ecrit', on y a fait des gestes, qu'il faut défaire d'abord
   *  (sa pile est plus longue qu'à la copie) ; 'non', elle ne peut plus être
   *  retirée ainsi (sa marque ne vaut plus : elle ou son original a quitté
   *  l'ordre ; elle est la seule page ; ou elle a changé hors de sa pile, un
   *  fond, des objets envoyés). Rien ne change. */
  retraitDeCopie(id: string): 'oui' | 'ecrit' | 'non' {
    const ordre = new Set(this.ordre.toArray())
    const m = this.marques.get(id)?.find(x => x.genre === 'copie' && x.id === id)
    if (!m || !this.marqueValable(m, ordre) || ordre.size <= 1) return 'non'
    if ((this.piles.get(id)?.undoStack.length ?? 0) > m.profondeur) return 'ecrit'
    return this.vierge(id) ? 'oui' : 'non'
  }

  /** La copie est-elle encore telle qu'à sa naissance (la première étape du
   *  film notée sur elle) : le même fond, la même origine, les mêmes formes
   *  au même contenu ? Ce qu'on y a fait puis défait ne compte pas (le
   *  contenu est revenu) ; ce qui y est arrivé hors de sa pile (des objets
   *  envoyés d'une autre page, un fond changé) compte. Avant que la
   *  naissance soit notée (le film la note juste après), rien n'a pu changer. */
  private vierge(id: string): boolean {
    const p = this.pages.get(id), formes = this.formesDe(id)
    if (!(p instanceof Y.Map) || !formes) return false
    let naissance: Etape | null = null
    for (const e of this.film.toArray()) if (e.page === id) { naissance = e; break }
    if (!naissance) return true
    const avant = this.lirePage(p, Y.decodeSnapshot(naissance.s))
    if (avant.fond !== this.fondDe(id) || JSON.stringify(avant.origine) !== JSON.stringify(this.origineDe(id)) || avant.formes.size !== formes.size) return false
    for (const [k, f] of formes) {
      const g = avant.formes.get(k)
      if (!g || (g !== f && JSON.stringify(g) !== JSON.stringify(f))) return false
    }
    return true
  }

  fondDe(page: string): Fond { return (this.pages.get(page)?.get('fond') as Fond) || 'blanc' }
  /** Change le fond d'une page, celle qu'on regarde ou une autre (la
   *  trieuse) : l'étape se note sur la page changée. */
  changerFond(page: string, fond: Fond, origine?: { x: number; y: number }) {
    const p = this.pages.get(page); if (!p) return
    const vue = this.pageVue
    this.pageVue = page
    try {
      this.doc.transact(() => { p.set('fond', fond); if (origine) p.set('origine', origine) })
    } finally { this.pageVue = vue }
  }
  origineDe(page: string) {
    return (this.pages.get(page)?.get('origine') as { x: number; y: number }) || { x: 0, y: 0 }
  }

  // ---------- Déplacer les pages ; l'état des pages ----------
  /** Déplace des pages (la trieuse) : elles vont, dans leur ordre, juste
   *  avant la page qui est à l'indice `avant` de l'ordre (voir deplacerDans).
   *  Faux si l'ordre ne change pas. UNE transaction qui retire seulement les
   *  pages tirées, puis les insère en bloc à leur place d'arrivée, et pas
   *  tout l'ordre : le document garde ce qu'on retire (gc: false), et chaque
   *  lecture d'un instantané le parcourt (60 pages, 200 déplacements : +76 Ko
   *  au lieu de +274 Ko, et deux fois moins de temps pour lire un état).
   *  Notée sur la page qu'on regarde : une étape seulOrdre, dans aucune
   *  pile. */
  deplacerPages(ids: string[], avant: number): boolean {
    const ordre = this.ordre.toArray()
    const apres = deplacerDans(ordre, ids, avant)
    if (apres.every((id, i) => id === ordre[i])) return false
    const tirees = new Set(ids.filter(id => ordre.includes(id)))
    const bloc = apres.filter(id => tirees.has(id))
    const k = apres.indexOf(bloc[0])
    this.doc.transact(() => {
      for (const [i, n] of plagesDe(ordre, tirees).reverse()) this.ordre.delete(i, n)
      this.ordre.insert(k, bloc)
    })
    return true
  }

  /** L'ordre, les noms et la corbeille, en copie (le journal de la trieuse) */
  etatDesPages(): EtatDesPages {
    const noms: Record<string, string> = {}
    for (const [k, v] of this.noms) if (typeof v === 'string') noms[k] = v
    const corbeille: Record<string, EntreeCorbeille> = {}
    for (const [k, v] of this.corbeille) if (v && typeof v === 'object') corbeille[k] = { ...v }
    return { ordre: this.ordre.toArray(), noms, corbeille }
  }

  /** Rend exactement un état des pages (Annuler dans la trieuse), en une
   *  transaction notée sur la page qu'on regarde. L'ordre doit se lire :
   *  chaque page a sa Y.Map, aucune deux fois, au moins une ; sinon rien du
   *  tout, et faux. Il change par le plus petit changement (voir
   *  changementsDOrdre) : la plus longue sous-suite commune reste en place.
   *  Les noms et les entrées de la corbeille sont rendus tels quels (les
   *  clés en trop s'en vont). Si l'ordre change, c'est une étape seulOrdre ;
   *  sinon, aucune étape. Vrai si quelque chose a changé. */
  retablirEtatDesPages(e: EtatDesPages): boolean {
    if (!e || !Array.isArray(e.ordre) || !e.ordre.length) return false
    const vus = new Set<string>()
    for (const id of e.ordre) {
      if (typeof id !== 'string' || vus.has(id) || !(this.pages.get(id) instanceof Y.Map)) return false
      vus.add(id)
    }
    const noms = e.noms ?? {}, corbeille = e.corbeille ?? {}
    const a = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k)
    const ch = changementsDOrdre(this.ordre.toArray(), e.ordre)
    const nomsARetirer = [...this.noms.keys()].filter(k => !a(noms, k))
    const nomsAPoser = Object.entries(noms).filter(([k, v]) => typeof v === 'string' && this.noms.get(k) !== v)
    const entreesARetirer = [...this.corbeille.keys()].filter(k => !a(corbeille, k))
    const entreesAPoser = Object.entries(corbeille).filter(([k, v]) => v && typeof v === 'object' && !memeEntree(this.corbeille.get(k), v))
    if (!ch.retirer.length && !ch.inserer.length && !nomsARetirer.length && !nomsAPoser.length && !entreesARetirer.length && !entreesAPoser.length) return false
    this.doc.transact(() => {
      for (const i of ch.retirer) this.ordre.delete(i, 1)
      for (const { i, id } of ch.inserer) this.ordre.insert(i, [id])
      for (const k of nomsARetirer) this.noms.delete(k)
      for (const [k, v] of nomsAPoser) this.noms.set(k, v)
      for (const k of entreesARetirer) this.corbeille.delete(k)
      for (const [k, v] of entreesAPoser) this.corbeille.set(k, { ...v })
    })
    return true
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

  // ---------- Envoyer des objets vers une autre page ----------
  /** Ce qu'on écrit pendant f se note dans le film sur cette page */
  private surLaPage<T>(page: string, f: () => T): T {
    const vue = this.pageVue
    this.pageVue = page
    try { return f() } finally { this.pageVue = vue }
  }

  /** Envoie des objets de la page `de` vers la page `vers` (« Envoyer
   *  vers… ») : posees, ce qui arrive (leurs copies, faites par collage :
   *  identifiants neufs, noms libres sur l'arrivée) ; ids, les objets de
   *  départ (seuls comptent ceux qui sont encore sur la page de départ).
   *  Pourquoi pas UNE transaction : une pile ne défait que ce qui est dans sa
   *  portée (sa page). Ctrl+Z sur la page de départ rendrait les objets en
   *  les laissant sur l'arrivée (un doublon caché) ; Ctrl+Z sur l'arrivée les
   *  y retirerait sans les rendre au départ (perdus). Et si le retrait
   *  n'était dans aucune pile, un Ctrl+Z sur la page de départ qui défait
   *  plus tard un ancien « déplacer X » y ressusciterait l'ancienne version
   *  de X, sa copie restant sur l'arrivée.
   *  DÉPLACER : deux transactions, l'arrivée d'abord (jamais un instant où
   *  l'objet n'est nulle part ; un navigateur qui s'arrêterait entre les
   *  deux laisserait au pis un doublon visible).
   *  1. L'arrivée, sans origine (dans aucune pile : Ctrl+Z sur l'arrivée ne
   *     retire jamais ce qui est arrivé, mais défait ce qu'on y a changé
   *     ensuite), notée sur la page d'arrivée.
   *  2. Le retrait, avec l'origine locale : sa propre étape de la pile de la
   *     page de départ, notée sur elle. Sa méta 'envoi' (voir Envoi) dit à
   *     annuler de retirer de l'arrivée ce qui y est encore tel quel, et à
   *     retablir de l'y reposer. Elle ne se pose que si le retrait a bien
   *     empilé UNE étape : sinon (rien n'a changé), elle tomberait sur le
   *     geste précédent de la page, et un Ctrl+Z retirerait des objets de
   *     l'arrivée en défaisant tout autre chose. Alors l'arrivée repart (sans
   *     origine, notée sur l'arrivée) et rien n'est envoyé.
   *  COPIER : la page de départ ne change pas ; l'arrivée est une étape de la
   *  pile de la page d'arrivée, comme un collage (Ctrl+Z y retire les
   *  copies, sous les yeux), avec la méta 'envoi-copie' (le message le dit).
   *  nouvelle : la page créée pour les recevoir (ajouterPage, juste avant) et
   *  sa place ; si rien n'est envoyé, elle repart, vide. Faux : rien n'est
   *  envoyé. */
  envoyer(de: string, vers: string, posees: Forme[], ids: string[], o: { deplacer: boolean; nouvelle?: { id: string; place: number } }): boolean {
    const depart = this.formesDe(de), arrivee = this.formesDe(vers)
    const presents = depart ? [...new Set(ids)].filter(id => depart.has(id)) : []
    const possible = !!depart && !!arrivee && de !== vers && posees.length > 0 && posees.every(f => !arrivee.has(f.id))
    if (!possible || (o.deplacer && !presents.length)) { this.retirerNouvelle(o.nouvelle); return false }
    if (!o.deplacer) {
      this.nouveauGeste()
      const u = this.annulationDe(vers)!
      const n = u.undoStack.length
      this.surLaPage(vers, () => this.poserPlusieurs(vers, posees))
      this.nouveauGeste()
      if (u.undoStack.length === n + 1) u.undoStack[u.undoStack.length - 1].meta.set(META_COPIE, { de, n: posees.length } satisfies CopieRecue)
      return true
    }
    // 1. L'arrivée, hors de toute pile
    this.surLaPage(vers, () => this.doc.transact(() => { for (const f of posees) arrivee!.set(f.id, f) }))
    // 2. Le retrait, sa propre étape de la pile de départ
    this.nouveauGeste()
    const u = this.annulationDe(de)!
    const n = u.undoStack.length
    this.surLaPage(de, () => this.supprimer(de, presents))
    this.nouveauGeste()
    if (u.undoStack.length !== n + 1) {
      this.surLaPage(vers, () => this.doc.transact(() => {
        for (const f of posees) if (arrivee!.get(f.id) === f) arrivee!.delete(f.id)
        this.retirerNouvelle(o.nouvelle)
      }))
      return false
    }
    const m: Envoi = { vers, posees: [...posees], n: presents.length }
    if (o.nouvelle) m.nouvelle = { ...o.nouvelle }
    u.undoStack[u.undoStack.length - 1].meta.set(META_ENVOI, m)
    return true
  }

  /** La nouvelle page créée pour un envoi quitte l'ordre si elle est vide
   *  (aucune forme, aucun nom ; elle n'entre pas dans la corbeille, où une
   *  page vide ne figure pas) et n'est pas la seule. Notée sur elle (seule,
   *  une étape seulOrdre). Vrai si elle est partie. */
  private retirerNouvelle(nouvelle?: { id: string }): boolean {
    if (!nouvelle) return false
    const id = nouvelle.id, i = this.ordre.toArray().indexOf(id)
    if (i < 0 || this.ordre.length <= 1 || (this.formesDe(id)?.size ?? 1) > 0 || this.nomDe(id) !== null) return false
    this.surLaPage(id, () => this.doc.transact(() => this.ordre.delete(i, 1)))
    return true
  }

  /** Où en sont, sur la page d'arrivée, les objets qu'un déplacement y a
   *  posés. telsQuels : encore là, le même objet (une annulation faite
   *  là-bas rend le même) ; restes : encore là, modifiés depuis ; bloques :
   *  partis de là-bas (effacés, ou renvoyés ailleurs par un autre envoi) par
   *  une étape que la pile de cette page peut encore défaire, sur une page
   *  qui peut revenir sous les yeux (voir pageAtteignable) : Ctrl+Z là-bas
   *  les y ramènerait ; absents : partis sans retour possible (la page
   *  d'arrivée est supprimée définitivement, ou plus rien ne les y ramène). */
  private bilanArrivee(m: Envoi): { telsQuels: Forme[]; restes: number; bloques: number; absents: number } {
    const b = this.formesDe(m.vers)
    const r = { telsQuels: [] as Forme[], restes: 0, bloques: 0, absents: 0 }
    if (!b) { r.absents = m.posees.length; return r }
    const atteignable = this.pageAtteignable(m.vers)
    for (const f of m.posees) {
      const g = b.get(f.id)
      if (g === f) r.telsQuels.push(f)
      else if (g) r.restes++
      else if (atteignable && this.pileRamene(m.vers, f.id)) r.bloques++
      else r.absents++
    }
    return r
  }

  /** Une page peut-elle revenir sous les yeux, pour qu'on y fasse Ctrl+Z ?
   *  Dans l'ordre ; dans la corbeille (on l'y remet) ; jetée avec une marque
   *  qui la rend encore (Ctrl+Z sur la page d'où on l'a jetée, même vide).
   *  Pas une page supprimée définitivement, ni une page vide hors de l'ordre
   *  sans marque : rien ne la montre plus. */
  private pageAtteignable(id: string): boolean {
    const ordre = new Set(this.ordre.toArray())
    if (ordre.has(id) || this.dansLaCorbeille(id, ordre)) return true
    for (const l of this.marques.values()) if (l.some(m => m.genre === 'jetee' && m.id === id && this.marqueValable(m, ordre))) return true
    return false
  }

  /** Les versions effacées de la forme `id` sur une page, de la plus récente
   *  à la plus ancienne. Le document les garde toutes (gc: false), chacune
   *  chaînée à la précédente (voir dejaPassee). */
  private versionsEffacees(formes: Y.Map<Forme>, id: string): Y.Item[] {
    const r: Y.Item[] = []
    for (let v: Y.Item | null = formes._map.get(id) ?? null; v; v = v.left instanceof Y.Item ? v.left : null) if (v.deleted) r.push(v)
    return r
  }

  /** Une étape de la pile de cette page, parmi celles que Ctrl+Z défera, a-t-elle
   *  effacé une version de la forme `id` (un coup de gomme, Suppr, un envoi
   *  vers une autre page) ? Ctrl+Z sur la page l'y ramènerait. */
  private pileRamene(page: string, id: string): boolean {
    const u = this.piles.get(page), formes = this.formesDe(page)
    if (!u || !u.undoStack.length || !formes) return false
    const versions = this.versionsEffacees(formes, id)
    return versions.length > 0 && u.undoStack.some(s => versions.some(v => Y.isDeleted(s.deletions, v.id)))
  }

  /** Les formes nommées que la pile d'une page peut y ramener, par Ctrl+Z ou
   *  Ctrl+Y : chaque version effacée d'une figure à noms (polygone, cercle)
   *  qu'une étape de sa pile rendrait (un triangle effacé, renommé, envoyé
   *  ailleurs). Ce qui ARRIVE d'un déplacement (« Envoyer vers… ») n'entre
   *  dans aucune pile : un Ctrl+Z sur la page d'arrivée peut ensuite défaire
   *  un geste plus ancien et ramener un triangle ABC à côté d'un ABC arrivé.
   *  Le collage d'un déplacement tient donc ces noms pour pris (au lot 2, un
   *  collage était une étape de la pile, défaite avant ce qui le précédait :
   *  le cas ne se posait pas). sauf : l'envoi en cours, de la page `de`, des
   *  objets `ids` ; un envoi de cette page vers la page `de` qui a posé l'un
   *  d'eux ne compte pas (l'aller-retour : le triangle ABC parti vers la page
   *  2 qu'on renvoie sur la page 1 y garde ses noms ; Ctrl+Z ne défait pas
   *  cet aller avant le retour, voir annuler). */
  formesQuiPeuventRevenir(page: string, sauf?: { de: string; ids: ReadonlySet<string> }): Forme[] {
    const u = this.piles.get(page), formes = this.formesDe(page)
    if (!u || !formes) return []
    const etapes = [...u.undoStack, ...u.redoStack].filter(s => {
      const m = s.meta.get(META_ENVOI) as Envoi | undefined
      return !(m && sauf && m.vers === sauf.de && m.posees.some(f => sauf.ids.has(f.id)))
    })
    if (!etapes.length) return []
    const r: Forme[] = []
    for (const id of formes._map.keys()) {
      for (const v of this.versionsEffacees(formes, id)) {
        const f = v.content.getContent()[0] as Forme | undefined
        if (!f || typeof f !== 'object' || (f.type !== 'polygone' && f.type !== 'cercle') || !f.noms?.length) continue
        if (etapes.some(s => Y.isDeleted(s.deletions, v.id))) r.push(f)
      }
    }
    return r
  }

  /** Après l'annulation d'un déplacement (les objets sont revenus au
   *  départ) : chaque objet posé qui est ENCORE TEL QUEL sur l'arrivée (le
   *  même objet ; une annulation faite là-bas rend le même) en part, sans
   *  origine, en une transaction notée sur l'arrivée ; la nouvelle page créée
   *  pour eux, si elle est vide (ce qu'on y a effacé compris : défait là-bas,
   *  il y referait un doublon), quitte l'ordre dans la même. Un objet modifié
   *  depuis sur l'arrivée y reste (un doublon visible, que la réponse
   *  annonce : rien de ce qu'on a fait là-bas n'est perdu). Un objet qui n'y
   *  est plus est compté (absents) : annuler n'arrive ici que si rien ne l'y
   *  ramènera (voir bilanArrivee). */
  private defaireArrivee(m: Envoi): { retirees: Forme[]; restes: number; absents: number; pageRetiree: boolean } {
    const b = this.formesDe(m.vers)
    const bilan = this.bilanArrivee(m)
    // bloques : seulement si Yjs a sauté l'étape d'en haut (sans effet) pour
    // défaire cet envoi-ci, plus ancien, sans qu'annuler l'ait regardé : on
    // le dit au moins
    const absents = bilan.absents + bilan.bloques
    if (!b) return { retirees: [], restes: 0, absents, pageRetiree: false }
    const retirees = bilan.telsQuels
    let pageRetiree = false
    if (retirees.length || m.nouvelle) {
      this.surLaPage(m.vers, () => this.doc.transact(() => {
        for (const f of retirees) b.delete(f.id)
        pageRetiree = this.retirerNouvelle(m.nouvelle)
      }))
    }
    return { retirees, restes: bilan.restes, absents, pageRetiree }
  }

  /** Avant de refaire un déplacement : ce qui était parti de l'arrivée y
   *  revient (les objets mêmes), et la nouvelle page, si elle avait quitté
   *  l'ordre, revient à sa place ; une transaction sans origine, notée sur
   *  l'arrivée. Rend ce qui a été reposé, et si la page est revenue. */
  private refaireArrivee(m: Envoi): { reposees: Forme[]; pageRemise: boolean } {
    const b = this.formesDe(m.vers)
    if (!b) return { reposees: [], pageRemise: false }
    const reposees = (m.retirees ?? []).filter(f => !b.has(f.id))
    const ordre = this.ordre.toArray()
    const remettre = !!m.pageRetiree && !!m.nouvelle && !ordre.includes(m.vers) && m.nouvelle.id === m.vers
    if (!reposees.length && !remettre) return { reposees, pageRemise: false }
    this.surLaPage(m.vers, () => this.doc.transact(() => {
      if (remettre) this.ordre.insert(Math.max(0, Math.min(m.nouvelle!.place, ordre.length)), [m.vers])
      for (const f of reposees) b.set(f.id, f)
    }))
    return { reposees, pageRemise: remettre }
  }

  /** L'étape que Ctrl+Z défera sur cette page : celle du haut de sa pile, si
   *  aucune marque ne passe avant elle (null sinon, ou si la pile est vide).
   *  Le bouton « Annuler » d'un envoi ne défait que son étape, si elle est
   *  encore la prochaine : sinon il défairait autre chose, qu'on ne voit pas. */
  prochaineAnnulation(page: string): EtapeDePile | null {
    const u = this.piles.get(page)
    const haut = u?.undoStack[u.undoStack.length - 1]
    if (!u || !haut) return null
    const m = this.derniereMarque(page)
    return m && u.undoStack.length <= m.profondeur ? null : haut
  }

  // ---------- Les marques d'annulation ----------
  /** Pose une marque sur une page (la plus récente en dernier) */
  private marquer(page: string, m: Marque) {
    const l = this.marques.get(page) ?? []
    l.push(m)
    this.marques.set(page, l)
  }

  /** Retire une marque de sa page */
  private oublierMarque(page: string, m: Marque) {
    const l = this.marques.get(page)
    const k = l ? l.indexOf(m) : -1
    if (k >= 0) l!.splice(k, 1)
    if (l && !l.length) this.marques.delete(page)
  }

  /** Toutes les marques qui parlent de cette page, où qu'elles soient */
  private oublierMarques(id: string) {
    for (const [p, l] of this.marques) {
      for (let k = l.length - 1; k >= 0; k--) if (l[k].id === id) l.splice(k, 1)
      if (!l.length) this.marques.delete(p)
    }
  }

  /** Une marque vaut-elle encore ? Une page jetée : tant qu'elle est hors de
   *  l'ordre, avec sa Y.Map, et pas supprimée définitivement. Une copie :
   *  tant qu'elle ET son original sont dans l'ordre ; sinon la retirer ne
   *  défairait plus une duplication, elle ferait disparaître le seul
   *  exemplaire visible (P et sa copie Q, P supprimée : retirer Q viderait le
   *  tableau). */
  private marqueValable(m: Marque, ordre: ReadonlySet<string>): boolean {
    if (m.genre === 'jetee') return !ordre.has(m.id) && this.pages.get(m.id) instanceof Y.Map && !this.entree(m.id)?.definitif
    const de = this.herite(m.id)
    return ordre.has(m.id) && de !== null && ordre.has(de)
  }

  /** Retire toutes les marques qui ne valent plus (l'ordre ou la corbeille
   *  vient de changer) ; ↶ se remet à jour s'il en est parti une */
  private elaguerMarques() {
    if (!this.marques.size) return
    const ordre = new Set(this.ordre.toArray())
    let parti = false
    for (const [p, l] of this.marques) {
      for (let k = l.length - 1; k >= 0; k--) if (!this.marqueValable(l[k], ordre)) { l.splice(k, 1); parti = true }
      if (!l.length) this.marques.delete(p)
    }
    if (parti) this.onPiles?.()
  }

  /** La dernière marque de cette page qui vaut encore (null : aucune). Celles
   *  qui ne valent plus (une page déjà revenue par le bouton du message, une
   *  copie partie autrement) s'en vont au passage. */
  private derniereMarque(page: string): Marque | null {
    const l = this.marques.get(page)
    if (!l) return null
    const ordre = new Set(this.ordre.toArray())
    for (let k = l.length - 1; k >= 0; k--) if (!this.marqueValable(l[k], ordre)) l.splice(k, 1)
    if (!l.length) { this.marques.delete(page); return null }
    return l[l.length - 1]
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
   *  jetée depuis celle-ci qui revient ; { copie, retour } quand c'est la
   *  copie toute neuve qu'on regarde qui s'en va (on revient sur son
   *  original). Une marque passe avant les gestes faits sur la page avant
   *  elle, après ceux faits depuis : elle retient la longueur de la pile au
   *  moment où elle s'est posée. Une marque qu'on ne peut plus suivre (la
   *  remise ou le retrait refusé) s'en va, et l'on passe à la suivante, puis
   *  à la pile. Rétablir ne rejette jamais une page et ne recrée jamais une
   *  copie (on ne jette pas une page sans la voir).
   *  Le retrait d'un envoi (voir envoyer) : les objets reviennent (les mêmes
   *  identifiants, leur dernière version), PUIS ceux qui sont encore tels
   *  quels sur la page d'arrivée en partent (voir defaireArrivee) ; la
   *  réponse dit combien sont revenus et combien, modifiés là-bas, y restent.
   *  Yjs ne recopie pas la méta d'une étape sur celle qu'il pousse dans la
   *  pile à refaire : on la recopie, avec ce qui est parti de l'arrivée.
   *  Un envoi dont des objets ont quitté la page d'arrivée par une étape que
   *  la pile de celle-ci peut encore défaire (renvoyés ailleurs : l'aller-
   *  retour 1 → 2 → 1, ou la chaîne 1 → 2 → 3 ; ou effacés là-bas) ne se
   *  défait PAS encore : { envoiBloque }, rien ne change. Le défaire
   *  laisserait un doublon caché (l'objet revenu ici, et son exemplaire
   *  renvoyé ailleurs, superposé ici même pour un aller-retour), ou en
   *  préparerait un (Ctrl+Z là-bas ramènerait l'objet effacé). On défait
   *  d'abord cela sur la page d'arrivée (son propre envoi se défait alors,
   *  et retire l'exemplaire renvoyé), puis l'envoi ici. Une page d'arrivée
   *  supprimée définitivement ne bloque rien : sa pile ne servira plus ; ce
   *  qui n'y était plus est compté (absents) et dit. */
  annuler(page: string): Annulation | null {
    const u = this.piles.get(page)
    for (let m = this.derniereMarque(page); m && (u?.undoStack.length ?? 0) <= m.profondeur; m = this.derniereMarque(page)) {
      if (m.genre === 'jetee') { if (this.rendrePage(m.id) >= 0) return { page: m.id } }
      else { const retour = this.retirerCopie(m.id); if (retour) return { copie: m.id, retour } }
      this.oublierMarque(page, m)
    }
    if (!u || !u.undoStack.length) return null
    const prevu = u.undoStack[u.undoStack.length - 1].meta.get(META_ENVOI) as Envoi | undefined
    if (prevu) {
      const bilan = this.bilanArrivee(prevu)
      if (bilan.bloques) return { envoiBloque: { vers: prevu.vers, n: bilan.bloques, total: prevu.posees.length } }
    }
    const avant = u.redoStack.length
    const e = u.undo()
    if (!e) return null
    const r = u.redoStack.length === avant + 1 ? u.redoStack[u.redoStack.length - 1] : null
    const envoi = e.meta.get(META_ENVOI) as Envoi | undefined
    if (envoi) {
      const fait = this.defaireArrivee(envoi)
      if (r) r.meta.set(META_ENVOI, { ...envoi, retirees: fait.retirees, pageRetiree: fait.pageRetiree } satisfies Envoi)
      return { envoi: { vers: envoi.vers, revenus: envoi.n, restes: fait.restes, ...(fait.absents ? { absents: fait.absents } : {}), pageRetiree: fait.pageRetiree } }
    }
    const copie = e.meta.get(META_COPIE) as CopieRecue | undefined
    if (copie) {
      if (r) r.meta.set(META_COPIE, copie)
      return { copieRecue: { ...copie } }
    }
    return {}
  }

  /** Refait le dernier geste défait sur cette page. Faux s'il n'y en avait
   *  pas ; vrai sinon, ou, pour un déplacement refait, ce qu'il a fait : ce
   *  qui était parti de l'arrivée y revient D'ABORD (et la nouvelle page à sa
   *  place, voir refaireArrivee), puis le retrait se refait (jamais un
   *  instant où l'objet n'est nulle part). La méta suit, sans ce qu'on vient
   *  de reposer : à la prochaine annulation, ces objets (les mêmes) sont de
   *  nouveau tels quels sur l'arrivée.
   *  Un déplacement dont la page d'arrivée est supprimée définitivement (ou
   *  effacée par l'ancienne suppression) ne se refait pas : les objets
   *  quitteraient cette page-ci pour une page qui ne revient jamais, et un
   *  rechargement (les piles ne sont qu'en mémoire) les perdrait pour de bon.
   *  L'étape reste à refaire, rien ne change : { envoiImpossible }. Une page
   *  seulement dans la corbeille, elle, les reçoit (on peut l'en remettre, et
   *  le message le dit). */
  retablir(page: string): Retablissement {
    const u = this.piles.get(page)
    if (!u || !u.redoStack.length) return false
    const haut = u.redoStack[u.redoStack.length - 1]
    const envoi = haut.meta.get(META_ENVOI) as Envoi | undefined
    if (envoi && (!this.formesDe(envoi.vers) || this.entree(envoi.vers)?.definitif)) return { envoiImpossible: { vers: envoi.vers } }
    const arrivee = envoi ? this.refaireArrivee(envoi) : null
    const avant = u.undoStack.length
    const e = u.redo()
    if (envoi && arrivee && e !== haut) {
      // Yjs a sauté l'étape (devenue sans effet) : ce qu'on vient de reposer
      // repart, rien ne reste en double
      const b = this.formesDe(envoi.vers)
      if (b && arrivee.reposees.length) this.surLaPage(envoi.vers, () => this.doc.transact(() => { for (const f of arrivee.reposees) if (b.get(f.id) === f) b.delete(f.id) }))
    }
    if (!e) return false
    const r = u.undoStack.length === avant + 1 ? u.undoStack[u.undoStack.length - 1] : null
    const refait = e.meta.get(META_ENVOI) as Envoi | undefined
    if (refait) {
      // L'étape refaite est un déplacement (celui d'en haut, ou un plus ancien
      // si Yjs a sauté celle d'en haut : on repose alors après coup)
      const a = e === haut && arrivee ? arrivee : this.refaireArrivee(refait)
      const m: Envoi = { vers: refait.vers, posees: refait.posees, n: refait.n }
      if (refait.nouvelle) m.nouvelle = refait.nouvelle
      if (r) r.meta.set(META_ENVOI, m)
      return { envoi: { vers: refait.vers, repartis: refait.n, pageRemise: a.pageRemise } }
    }
    const copie = e.meta.get(META_COPIE)
    if (copie && r) r.meta.set(META_COPIE, copie)
    return true
  }

  /** Y a-t-il un geste à défaire, à refaire, sur cette page ? Une page dont la
   *  pile n'existe pas encore n'a rien (on ne la crée pas pour le savoir) ;
   *  une marque qui vaut se défait (Ctrl+Z rend la page jetée depuis
   *  celle-ci, ou retire la copie toute neuve : ↶ s'allume dès la copie). */
  peutAnnuler(page: string): boolean { return (this.piles.get(page)?.undoStack.length ?? 0) > 0 || this.derniereMarque(page) !== null }
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

// ---------- Les pages : fonctions pures ----------

/** Un nom de page mis au propre : chaque suite de blancs (sauts de ligne,
 *  tabulations compris) devient une espace, les autres caractères de
 *  contrôle s'en vont, les bouts sont coupés, 60 caractères au plus (sans
 *  couper un caractère en deux). null : pas de nom. */
export function nomPropre(nom: string | null | undefined): string | null {
  if (typeof nom !== 'string') return null
  const n = nom.replace(/\s+/g, ' ').replace(/[\u0000-\u001f\u007f-\u009f]/g, '').replace(/ {2,}/g, ' ').trim()
  const court = [...n].slice(0, LONGUEUR_NOM).join('').trimEnd()
  return court || null
}

/** Le nom de la copie d'une page nommée N : « N (copie) », puis « N (copie 2) »,
 *  « N (copie 3) »… (jamais « (copie) (copie) ») ; 60 caractères au plus, en
 *  raccourcissant la base, jamais le suffixe. */
export function nomDeCopie(nom: string): string {
  const m = /^(.*?)\s*\(copie(?: (\d{1,9}))?\)$/.exec(nom)
  const base = m ? m[1] : nom
  const k = m ? (m[2] ? Number(m[2]) + 1 : 2) : 1
  const suffixe = k === 1 ? '(copie)' : `(copie ${k})`
  const court = [...base].slice(0, LONGUEUR_NOM - 1 - suffixe.length).join('').trimEnd()
  return court ? `${court} ${suffixe}` : suffixe
}

/** L'ordre après un déplacement : les pages ids (celles de l'ordre), dans
 *  leur ordre relatif, vont juste avant la page qui est à l'indice `avant`
 *  (à la fin si `avant` vaut la longueur ; si cette page est tirée aussi,
 *  avant la première page non tirée qui la suit). */
export function deplacerDans(ordre: readonly string[], ids: readonly string[], avant: number): string[] {
  const tirees = new Set(ids.filter(id => ordre.includes(id)))
  if (!tirees.size) return [...ordre]
  let ancre: string | null = null
  for (let i = Math.max(0, avant); i < ordre.length; i++) if (!tirees.has(ordre[i])) { ancre = ordre[i]; break }
  const reste = ordre.filter(id => !tirees.has(id))
  const bloc = ordre.filter(id => tirees.has(id))
  const k = ancre === null ? reste.length : reste.indexOf(ancre)
  return [...reste.slice(0, k), ...bloc, ...reste.slice(k)]
}

/** Le plus petit changement qui mène d'un ordre à un autre : on garde la plus
 *  longue sous-suite commune (calcul en n², rien pour quelques centaines de
 *  pages), on retire les autres pages (retirer : leurs indices dans `avant`,
 *  décroissants, à retirer dans cet ordre), puis on insère les pages
 *  manquantes (inserer : leur place dans `apres`, croissante, à insérer dans
 *  cet ordre). Le document garde tout ce qu'on retire (gc: false) : moins on
 *  retire, moins il grandit. */
export function changementsDOrdre(avant: readonly string[], apres: readonly string[]): { retirer: number[]; inserer: { i: number; id: string }[] } {
  const n = avant.length, m = apres.length
  // L[i][j] : la longueur de la plus longue sous-suite commune à avant[i..] et apres[j..]
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    L[i][j] = avant[i] === apres[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  }
  const gardesAvant = new Set<number>(), gardesApres = new Set<number>()
  for (let i = 0, j = 0; i < n && j < m;) {
    if (avant[i] === apres[j]) { gardesAvant.add(i); gardesApres.add(j); i++; j++ }
    else if (L[i + 1][j] >= L[i][j + 1]) i++
    else j++
  }
  const retirer: number[] = []
  for (let i = n - 1; i >= 0; i--) if (!gardesAvant.has(i)) retirer.push(i)
  const inserer: { i: number; id: string }[] = []
  for (let j = 0; j < m; j++) if (!gardesApres.has(j)) inserer.push({ i: j, id: apres[j] })
  return { retirer, inserer }
}

/** Les suites de pages tirées qui se touchent dans l'ordre : [début, longueur],
 *  croissantes (une suite se retire d'un coup) */
function plagesDe(ordre: readonly string[], tirees: ReadonlySet<string>): [number, number][] {
  const r: [number, number][] = []
  ordre.forEach((id, i) => {
    if (!tirees.has(id)) return
    const der = r[r.length - 1]
    if (der && der[0] + der[1] === i) der[1]++
    else r.push([i, 1])
  })
  return r
}

/** Deux entrées de corbeille disent-elles exactement la même chose ? */
function memeEntree(a: unknown, b: unknown): boolean {
  const texte = (x: unknown) => x && typeof x === 'object' ? JSON.stringify(x, Object.keys(x).sort()) : String(x)
  return texte(a) === texte(b)
}
