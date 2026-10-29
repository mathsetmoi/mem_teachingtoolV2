// =============================================================
// LA CORBEILLE DU CLASSEUR
// Les pages supprimées (la poubelle de la barre du haut, Supprimer dans la
// trieuse) et les séances supprimées depuis la bibliothèque (lot 9)
// attendent ici, une vue de la trieuse. Depuis le lot 17, la liste est
// RANGÉE PAR SÉANCE, tout par date de suppression, la plus récente en haut :
// - une séance dont toutes les pages sont dans la corbeille fait UN bloc
//   (« Activité d'intro · Lun 5 oct 8h · 4 pages », « Supprimée hier à
//   16 h 20 », ses vignettes numérotées, « Remettre la séance » et
//   « Supprimer définitivement ») ;
// - une page seule garde sa carte (vignette, nom, « Page 3 · séance de
//   lundi », quand elle a été supprimée, « Remettre », « Supprimer
//   définitivement ») ; une page dont on ne connaît pas la séance dit
//   « Séance inconnue ».
// « Remettre » rend une page à sa place d'avant (après sa voisine si elle
// est encore là, sinon à la fin), dans sa séance d'origine, même passée,
// avec toute son histoire ; « Remettre la séance » rend ses pages d'un coup
// (Tableau.rendrePages, le mécanisme même d'« Annuler » du lot 9 : la fiche
// de la séance n'a jamais quitté le classeur, son nom, sa date et son rang
// reviennent d'eux-mêmes). « Supprimer définitivement » (une page, une
// séance) ou « Vider la corbeille » (tout), après une question. En option,
// décochée au départ et propre à l'appareil (voir reglages.ts,
// 'mem-corbeille-30-jours'), la corbeille vide tout seul, QUAND ON L'OUVRE
// (jamais à l'ouverture du classeur : ouvrir un classeur n'écrit pas un
// octet), ce qui y attend depuis plus de 30 jours ; jamais une page dont on
// ne connaît pas l'heure de suppression.
// OÙ C'EST NOTÉ : rien de nouveau. Une page est dans la corbeille quand sa
// Y.Map est dans la carte `pages` du document, qu'elle n'est plus dans
// `ordre`, qu'elle a quelque chose (une forme, un nom) et que la carte de
// premier niveau `corbeille` (id → { t, apres, index, definitif }) ne la
// marque pas définitive (voir Tableau.dansLaCorbeille). Le regroupement par
// séance se lit dans ce que le document garde déjà : `t` (l'heure de la
// suppression, la même pour toutes les pages d'une séance supprimée),
// `index` (la place d'alors), `seanceDesPages` (la séance d'une page, jamais
// effacée pour une page jetée) et `seances` (la fiche, conservée). Ces
// cartes sont hors des pages : y écrire n'est ni une étape du film, ni une
// étape d'annulation ; elles survivent au rechargement et au fichier .memc
// sans autre code. Le retrait de l'ordre, lui, est une étape « seulOrdre »
// (jamais un geste). Une page jetée avant la corbeille (lot 2, sans entrée)
// y est aussi, et se remet à la fin ; une page effacée par l'ancienne
// suppression (sa Y.Map détruite) n'y est jamais.
// Remettre passe par le journal de la trieuse (« Annuler » renvoie la page,
// ou la séance, dans la corbeille). Supprimer définitivement n'efface rien :
// la page garde sa Y.Map et son histoire, elle ne revient seulement plus
// parmi les pages, par aucun chemin (ni Ctrl+Z, ni « Annuler ») ; dans la
// revue, elle reste une « Page jetée » du tiroir « Que revoir ? » avec toute
// son histoire, et une séance passée qui l'a vue s'exporte comme avant.
// C'est confirmé par une question : hors du journal, qui se vide (aucune de
// ses actions ne pourrait plus se défaire exactement).
// Les fonctions du haut sont pures (testées sous Node, tests/corbeille.test.ts).
// =============================================================
import type { Tableau } from '../document'
import type { Entree, JournalPages } from './journal'
import type { Vignettes } from './vignettes'
import type { SeanceDuClasseur } from '../seances'
import { dateCourteMajuscule, deLaSeance, libelleSeance } from '../seances'
import { pagesLisibles, quandLisible } from '../fichier'
import { icone } from '../icones'
import { fermerSurLeFond } from '../dialogue'
import { JOURS_CORBEILLE, choisirCorbeille30Jours, reglages } from '../reglages'

/** Une page de la corbeille, telle que la donne Tableau.pagesDeLaCorbeille
 *  (index : sa place d'alors dans l'ordre ; null sans entrée) */
export interface PageDeLaCorbeille { id: string; t: number | null; index: number | null; derniere: number | null; ancienne: boolean }

/** Ce qu'il faut du document pour ranger la corbeille par séance (voir
 *  contexteDe ; les essais le fabriquent à la main) */
export interface ContexteCorbeille {
  /** La séance qu'une page a notée (Tableau.seanceNoteeDe), même hors de l'ordre */
  seanceDe: (page: string) => string | null | undefined
  /** L'ordre des pages du classeur */
  ordre: readonly string[]
  /** La place où une page de la corbeille reviendrait (Tableau.placeDeRemise) */
  placeDe: (page: string) => number
  /** La séance du jour (son id ; null sans séances) */
  jour: string | null
}

/** Un bloc de la liste. 'seance' : une séance dont plus aucune page n'est
 *  dans l'ordre, avec ses pages de la corbeille (triées par leur place
 *  d'alors), l'heure de suppression la plus récente et la dernière écriture
 *  la plus récente (pour les pages sans heure). 'page' : une page seule,
 *  avec sa séance (null : inconnue), le numéro qu'elle aurait dans sa séance
 *  si on la remettait (null sans séance) et si c'est la séance du jour. La
 *  clé nomme le bloc dans la liste ('seance:' + id de séance, ou l'id de la
 *  page). */
export type BlocCorbeille =
  | { genre: 'seance'; cle: string; seance: SeanceDuClasseur; pages: PageDeLaCorbeille[]; t: number | null; derniere: number | null }
  | { genre: 'page'; cle: string; page: PageDeLaCorbeille; seance: SeanceDuClasseur | null; numero: number | null; duJour: boolean }

/** Le numéro qu'une page remise aurait dans sa séance : les pages de la
 *  séance qui la précéderaient dans l'ordre, plus un (place : où elle
 *  reviendrait dans l'ordre global) */
export function numeroDansLaSeance(pagesDeLaSeance: readonly string[], ordre: readonly string[], place: number): number {
  const rang = new Map(ordre.map((p, i) => [p, i]))
  let n = 0
  for (const p of pagesDeLaSeance) { const k = rang.get(p); if (k !== undefined && k < place) n++ }
  return n + 1
}

/** Range les pages de la corbeille (dans l'ordre que donne
 *  Tableau.pagesDeLaCorbeille : la dernière supprimée d'abord, celles sans
 *  heure à la fin) en blocs : une page dont la séance n'a plus aucune page
 *  dans l'ordre va dans le bloc de sa séance (placé là où tombe sa page la
 *  plus récente), les autres restent des pages seules ; une page sans
 *  séance connue (pas d'entrée dans seanceDesPages, fiche absente, tableau
 *  sans séances) est une page seule « sans séance ». Pur. */
export function grouperLaCorbeille(pages: readonly PageDeLaCorbeille[], seances: readonly SeanceDuClasseur[], c: ContexteCorbeille): BlocCorbeille[] {
  const parId = new Map(seances.map(s => [s.id, s]))
  const blocs: BlocCorbeille[] = []
  const parSeance = new Map<string, BlocCorbeille & { genre: 'seance' }>()
  for (const p of pages) {
    const v = c.seanceDe(p.id)
    const s = typeof v === 'string' ? parId.get(v) : undefined
    if (s && !s.pages.length) {
      let b = parSeance.get(s.id)
      if (!b) { b = { genre: 'seance', cle: 'seance:' + s.id, seance: s, pages: [], t: null, derniere: null }; parSeance.set(s.id, b); blocs.push(b) }
      b.pages.push(p)
      if (p.t !== null && (b.t === null || p.t > b.t)) b.t = p.t
      if (p.derniere !== null && (b.derniere === null || p.derniere > b.derniere)) b.derniere = p.derniere
      continue
    }
    blocs.push({ genre: 'page', cle: p.id, page: p, seance: s ?? null, numero: s ? numeroDansLaSeance(s.pages, c.ordre, c.placeDe(p.id)) : null, duJour: !!s && s.id === c.jour })
  }
  const place = (p: PageDeLaCorbeille) => p.index ?? Number.MAX_SAFE_INTEGER
  for (const b of parSeance.values()) b.pages.sort((x, y) => place(x) - place(y))
  return blocs
}

/** Ce que le document donne au regroupement */
export function contexteDe(t: Tableau): ContexteCorbeille {
  return { seanceDe: p => t.seanceNoteeDe(p), ordre: t.ordre.toArray(), placeDe: p => t.placeDeRemise(p), jour: t.derniereSeance()?.id ?? null }
}

/** La liste de la corbeille d'un tableau, rangée par séance */
export function blocsDeLaCorbeille(t: Tableau): BlocCorbeille[] {
  return grouperLaCorbeille(t.pagesDeLaCorbeille(), t.seancesDuClasseur(), contexteDe(t))
}

/** Ce que « Remettre la séance » rend (et ce que « Supprimer
 *  définitivement » un bloc marque) : les pages du bloc, et les pages VIDES
 *  de la séance parties avec elles (hors de l'ordre, une entrée de corbeille
 *  qui n'est pas définitive : la corbeille ne montre jamais une page vide,
 *  mais la séance doit revenir telle qu'elle était, sa page 1 vide comprise,
 *  comme avec « Annuler » du lot 9), triées par leur place d'alors */
export function pagesDuBloc(t: Tableau, b: { seance: { id: string }; pages: readonly PageDeLaCorbeille[] }): string[] {
  const ordre = new Set(t.ordre.toArray())
  const vues = new Set(b.pages.map(p => p.id))
  const loin = Number.MAX_SAFE_INTEGER
  const l: { id: string; index: number }[] = b.pages.map(p => ({ id: p.id, index: p.index ?? loin }))
  for (const [id, e] of t.corbeille) {
    if (vues.has(id) || ordre.has(id) || !e || e.definitif || !t.pages.has(id) || t.seanceNoteeDe(id) !== b.seance.id) continue
    l.push({ id, index: typeof e.index === 'number' ? e.index : loin })
  }
  return l.sort((x, y) => x.index - y.index).map(x => x.id)
}

/** « Supprimée aujourd'hui à 10 h 05 » ; pour une page jetée avant la
 *  corbeille (sans heure de suppression) : « Supprimée avant cette version ·
 *  dernière écriture hier à 9 h 12 ». Sert aussi aux blocs de séance (leur
 *  heure la plus récente). */
export function dateDeSuppression(x: Pick<PageDeLaCorbeille, 't' | 'derniere'>, maintenant = Date.now()): string {
  if (x.t !== null && Number.isFinite(x.t)) return `Supprimée ${quandLisible(x.t, maintenant)}`
  const d = x.derniere !== null && Number.isFinite(x.derniere) ? ` · dernière écriture ${quandLisible(x.derniere, maintenant)}` : ''
  return `Supprimée avant cette version${d}`
}

/** L'en-tête d'un bloc de séance : « Séance du lun 5 oct 8h · 4 pages »,
 *  ou avec son nom « Activité d'intro · Lun 5 oct 8h · 4 pages » (comme les
 *  séances passées de la trieuse) */
export function libelleBloc(b: { seance: { debut: number; nom: string | null }; pages: readonly unknown[] }): string {
  const s = b.seance
  return `${s.nom ? `${s.nom} · ${dateCourteMajuscule(s.debut)}` : libelleSeance(s)} · ${pagesLisibles(b.pages.length)}`
}

/** Sous une page seule : « Page 3 · séance de lundi », « Page 3 · séance du
 *  jour », « Page 3 · « Activité d'intro » » ; « Séance inconnue » quand on
 *  ne sait pas d'où elle vient */
export function sousTitrePage(b: { seance: { debut: number; nom: string | null } | null; numero: number | null; duJour: boolean }, maintenant = Date.now()): string {
  if (!b.seance || b.numero === null) return 'Séance inconnue'
  const ou = b.duJour ? 'séance du jour' : b.seance.nom ? deLaSeance(b.seance, maintenant) : `séance ${deLaSeance(b.seance, maintenant)}`
  return `Page ${b.numero} · ${ou}`
}

/** Le message d'une page remise, compté DANS SA SÉANCE (pas dans l'ordre du
 *  classeur) : « Page remise : c'est la page 3 » dans la séance du jour (ou
 *  sans séances) ; « Page remise dans la séance de lundi : c'est sa page 3 »
 *  dans une séance passée (« dans la séance « Activité d'intro » » si elle a
 *  un nom) */
export function texteRemise(o: { numero: number; seance: { debut: number; nom: string | null } | null; duJour: boolean }, maintenant = Date.now()): string {
  if (!o.seance || o.duJour) return `Page remise : c'est la page ${o.numero}`
  return `Page remise dans la séance ${deLaSeance(o.seance, maintenant)} : c'est sa page ${o.numero}`
}

/** « Séance remise : « Activité d'intro » (4 pages) » ; quand elle redevient
 *  la séance du jour (la plus récente du classeur), le message le dit */
export function texteSeanceRemise(s: { debut: number; nom: string | null }, n: number, redevientDuJour: boolean): string {
  const base = `Séance remise : « ${libelleSeance(s)} » (${pagesLisibles(n)})`
  return redevientDuJour ? `${base}. Elle redevient la séance du jour.` : base
}

/** Combien de pages dans la corbeille (le bouton du bandeau) : sans relire
 *  le film, contrairement à pagesDeLaCorbeille */
export function compterCorbeille(t: Tableau): number {
  const ordre = new Set(t.ordre.toArray())
  let n = 0
  for (const id of t.pages.keys()) if (t.dansLaCorbeille(id, ordre)) n++
  return n
}

/** Le libellé du bouton du bandeau : « Corbeille (3) » (il reste court : la
 *  place au téléphone), et son nom pour un lecteur d'écran : « Corbeille du
 *  classeur : 3 pages », « Corbeille du classeur : vide » */
export function libelleCorbeille(n: number): { texte: string; nom: string } {
  return n ? { texte: `Corbeille (${n})`, nom: `Corbeille du classeur : ${pagesLisibles(n)}` } : { texte: 'Corbeille', nom: 'Corbeille du classeur : vide' }
}

/** Ce que la question dit avant de vider la corbeille de n pages */
export function texteVider(n: number): string {
  return n > 1
    ? `Les ${n} pages de la corbeille seront supprimées définitivement : elles ne pourront plus être remises parmi les pages. Leur histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).`
    : 'La page de la corbeille sera supprimée définitivement : elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).'
}

/** Ce que la question dit avant de supprimer définitivement une séance de n pages */
export function texteSupprimerSeance(n: number): string {
  return n > 1
    ? `Ses ${n} pages ne pourront plus être remises parmi les pages. Leur histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).`
    : 'Sa page ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).'
}

const TEXTE_UNE = 'Elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).'

/** Les pages à vider d'office (la case « 30 jours ») : celles dont l'heure
 *  de suppression est connue et plus vieille que `jours` jours ; JAMAIS une
 *  page sans heure (jetée avant la corbeille). Pur. */
export function pagesAVider(pages: readonly Pick<PageDeLaCorbeille, 'id' | 't'>[], maintenant: number, jours = JOURS_CORBEILLE): string[] {
  const limite = jours * 86_400_000
  return pages.filter(p => p.t !== null && Number.isFinite(p.t) && maintenant - p.t > limite).map(p => p.id)
}

/** Ce que dit le vidage d'office : « 12 pages de plus de 30 jours supprimées
 *  définitivement (elles restent dans Revoir la construction) » */
export function texteVidage(n: number, jours = JOURS_CORBEILLE): string {
  return n > 1
    ? `${n} pages de plus de ${jours} jours supprimées définitivement (elles restent dans Revoir la construction)`
    : `1 page de plus de ${jours} jours supprimée définitivement (elle reste dans Revoir la construction)`
}

/** La case à cocher, et ce qu'elle annonce quand on la coche alors que des
 *  pages attendent déjà depuis plus de 30 jours : elles partiront à la
 *  prochaine ouverture de la corbeille (jamais sur un simple clic de case) */
export const TEXTE_CASE_30 = `Vider tout seul ce qui est ici depuis plus de ${JOURS_CORBEILLE} jours`
export function texteCaseCochee(n: number, jours = JOURS_CORBEILLE): string {
  return n > 1
    ? `${n} pages de plus de ${jours} jours : elles seront supprimées définitivement à la prochaine ouverture de la corbeille.`
    : `1 page de plus de ${jours} jours : elle sera supprimée définitivement à la prochaine ouverture de la corbeille.`
}

/** Ce que la vue demande à la trieuse */
export interface HoteCorbeille {
  readonly tableau: Tableau
  readonly journal: JournalPages
  readonly vignettes: Vignettes
  message(texte: string): void
  /** Un message avec son « Annuler » (le journal de la trieuse) */
  annoncer(texte: string, e: Entree): void
  /** Le message à action de cette clé s'en va (« Page N supprimée · Annuler »
   *  du tableau, clé 'page:' + id : il ne pourrait plus rien rendre) */
  oublierAction(cle?: string): void
  /** Le journal de la trieuse se vide, et son dernier « Annuler » s'en va */
  oublierJournal(): void
  /** La vue se ferme, les pages reviennent : page, la page remise (montrée,
   *  avec le focus : sa carte si elle est du jour, sa vignette dans sa
   *  séance passée dépliée sinon) ; null : le focus retourne au bouton
   *  « Corbeille » (rendreFocus : seulement s'il était dans la vue) */
  revenir(page: string | null, rendreFocus: boolean): void
}

/** Une ligne de la liste et ce qu'on y met à jour : la carte d'une page
 *  seule, ou le bloc d'une séance (sa rangée de vignettes se refait quand
 *  ses pages ou leurs noms changent : `rangeeCle`) */
interface Carte { genre: 'page'; el: HTMLElement; nom: HTMLElement; ou: HTMLElement; date: HTMLElement; remettre: HTMLButtonElement; supprimer: HTMLButtonElement }
interface BlocVue { genre: 'seance'; el: HTMLElement; titre: HTMLElement; date: HTMLElement; rangee: HTMLElement; rangeeCle: string; remettre: HTMLButtonElement; supprimer: HTMLButtonElement }
type Ligne = Carte | BlocVue

/** La taille des vignettes d'un bloc de séance (celle des séances passées de la trieuse) */
const VIGNETTE_BLOC = { l: 144, h: 90 }

export class VueCorbeille {
  readonly el: HTMLElement
  private grille: HTMLElement
  private compte: HTMLElement
  private vide: HTMLElement
  private boutonVider: HTMLButtonElement
  private retour: HTMLButtonElement
  private case30: HTMLInputElement
  private lignes = new Map<string, Ligne>()
  /** Les blocs montrés, dans l'ordre de la liste */
  private blocs: BlocCorbeille[] = []
  /** Les pages montrées (dans les blocs et les cartes) */
  private ids: string[] = []
  private taille = { l: 0, h: 0 }
  private ro: ResizeObserver | null = null
  private remiseATaille = 0
  /** Une mise à jour attend la fin de la transaction (l'ordre et la corbeille changent ensemble) */
  private majPrevue = false
  /** La question ouverte (Supprimer définitivement, Vider) */
  private question: HTMLDialogElement | null = null

  constructor(private hote: HoteCorbeille) {
    const el = this.el = document.createElement('div')
    el.className = 'trieuse-corbeille'
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Corbeille du classeur')
    el.hidden = true
    const tete = document.createElement('div'); tete.className = 'corbeille-tete'
    this.retour = this.bouton('Pages', 'avant', () => this.fermer(), 'Revenir aux pages (Échap)')
    this.retour.setAttribute('aria-label', 'Revenir aux pages')
    this.retour.classList.add('corbeille-retour')
    const titre = Object.assign(document.createElement('h2'), { textContent: 'Corbeille du classeur' })
    this.compte = Object.assign(document.createElement('span'), { className: 'trieuse-compte' })
    this.boutonVider = this.bouton('Vider la corbeille', 'poubelle', () => this.demanderVider(), 'Supprimer définitivement toutes les pages de la corbeille')
    this.boutonVider.classList.add('danger', 'corbeille-vider')
    tete.append(this.retour, titre, this.compte, this.boutonVider)
    const note = Object.assign(document.createElement('p'), { className: 'corbeille-note',
      textContent: 'Les séances et les pages supprimées de ce classeur attendent ici : Remettre les rend à leur place, avec toute leur histoire. Les classeurs supprimés, eux, sont dans la corbeille de la bibliothèque.' })
    // La case « 30 jours » : un réglage de l'appareil, lu à chaque ouverture
    // (voir ouvrir) ; cocher ne vide rien tout de suite (un clic de trop ne
    // doit rien supprimer : décocher suffit à se rattraper)
    const option = Object.assign(document.createElement('label'), { className: 'corbeille-option' })
    this.case30 = Object.assign(document.createElement('input'), { type: 'checkbox', className: 'corbeille-case-30' })
    this.case30.checked = reglages.corbeille30Jours
    this.case30.addEventListener('change', () => this.choisir30(this.case30.checked))
    option.append(this.case30, Object.assign(document.createElement('span'), { textContent: TEXTE_CASE_30 }))
    this.grille = document.createElement('ul')
    this.grille.className = 'corbeille-grille'
    this.grille.setAttribute('aria-label', 'Les séances et les pages de la corbeille, la dernière supprimée d\'abord')
    this.vide = Object.assign(document.createElement('p'), { className: 'corbeille-vide', textContent: 'La corbeille est vide.', hidden: true })
    el.append(tete, note, option, this.grille, this.vide)
    // Ni le menu du navigateur sur une vignette (« Enregistrer l'image »)
    el.addEventListener('contextmenu', e => e.preventDefault())
  }

  get ouverte() { return !this.el.hidden }
  /** Une question est ouverte (Échap la ferme d'abord) */
  get enQuestion() { return !!this.question }

  private bouton(texte: string, nomIcone: string, faire: () => void, titre: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'trieuse-bouton'; b.title = titre
    b.innerHTML = icone(nomIcone)
    b.append(Object.assign(document.createElement('span'), { className: 'libelle', textContent: texte }))
    b.addEventListener('click', faire)
    return b
  }

  // ---------- Ouvrir, fermer ----------
  /** La vue s'ouvre (le bouton « Corbeille » de la trieuse). La case
   *  « 30 jours » cochée : ce qui attend depuis plus de 30 jours est d'abord
   *  supprimé définitivement, et un message le dit. Le focus va au premier
   *  « Remettre » (la dernière suppression), ou à « Pages ». */
  ouvrir() {
    if (this.ouverte) return
    this.el.hidden = false
    this.blocs = []; this.ids = []
    this.case30.checked = reglages.corbeille30Jours
    const vides = reglages.corbeille30Jours ? this.vider30() : 0
    this.maj()
    this.majTailles()
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(this.remiseATaille)
      this.remiseATaille = requestAnimationFrame(() => this.majTailles())
    })
    this.ro.observe(this.grille)
    const premier = this.blocs.length ? this.lignes.get(this.blocs[0].cle)!.remettre : this.retour
    premier.focus({ preventScroll: true })
    if (vides) this.hote.message(texteVidage(vides))
  }

  /** Retour aux pages (« Pages », Échap). page : la page à montrer (une
   *  page remise, ou la première d'une séance remise). Les vignettes
   *  quittent le document (elles ne se repeignent plus). sansRetour : la
   *  trieuse se ferme (rien à montrer). */
  fermer(page: string | null = null, sansRetour = false) {
    if (!this.ouverte) return
    this.question?.close()
    const avaitFocus = this.el.contains(document.activeElement)
    this.ro?.disconnect(); this.ro = null
    cancelAnimationFrame(this.remiseATaille)
    this.el.hidden = true
    this.grille.replaceChildren()
    this.lignes.clear(); this.blocs = []; this.ids = []
    if (!sansRetour) this.hote.revenir(page, avaitFocus || page !== null)
  }

  /** La corbeille, l'ordre ou les séances ont changé (une remise, une
   *  suppression, un nom de séance changé depuis la bibliothèque, un autre
   *  onglet) : la liste se refait à la fin de la transaction */
  prevoirMaj() {
    if (!this.ouverte || this.majPrevue) return
    this.majPrevue = true
    queueMicrotask(() => { this.majPrevue = false; if (this.ouverte) this.maj() })
  }

  // ---------- La case « 30 jours » ----------
  /** La case cochée ou décochée : le réglage de l'appareil. Cochée alors que
   *  des pages attendent déjà depuis plus de 30 jours : on dit qu'elles
   *  partiront à la prochaine ouverture (rien ne se supprime sur ce clic). */
  private choisir30(oui: boolean) {
    choisirCorbeille30Jours(oui)
    if (!oui) return
    const n = pagesAVider(this.hote.tableau.pagesDeLaCorbeille(), Date.now()).length
    if (n) this.hote.message(texteCaseCochee(n))
  }

  /** Les pages de plus de 30 jours deviennent définitives (comme Supprimer
   *  définitivement : rien n'est effacé, leur histoire reste). Rend combien. */
  private vider30(): number {
    const t = this.hote.tableau
    const ids = pagesAVider(t.pagesDeLaCorbeille(), Date.now())
    if (!ids.length) return 0
    const n = t.supprimerDefinitivement(ids)
    for (const id of ids) this.hote.oublierAction('page:' + id)
    if (n) this.hote.oublierJournal()
    return n
  }

  // ---------- La liste ----------
  /** Une ligne par bloc (voir grouperLaCorbeille), la dernière suppression
   *  d'abord (les lignes déjà là sont gardées, avec leurs vignettes) ; le
   *  focus qui était sur une ligne partie va à la suivante (ou à la
   *  précédente, ou à « Pages »). */
  private maj() {
    const t = this.hote.tableau
    const blocs = blocsDeLaCorbeille(t)
    const cles = blocs.map(b => b.cle)
    const ids = blocs.flatMap(b => b.genre === 'seance' ? b.pages.map(p => p.id) : [b.page.id])
    const actif = document.activeElement as HTMLElement | null
    const ligneActive = actif?.closest?.('.carte-corbeille, .bloc-corbeille') as HTMLElement | null
    const cleActive = ligneActive?.dataset.cle ?? null
    const rangActif = cleActive ? this.blocs.findIndex(b => b.cle === cleActive) : -1
    const boutonActif = ligneActive && actif ? (actif === this.lignes.get(cleActive!)?.supprimer ? 'supprimer' : 'remettre') : null
    const vues = new Set(cles)
    for (const [cle, l] of this.lignes) if (!vues.has(cle)) { l.el.remove(); this.lignes.delete(cle) }
    let avant: Element | null = this.grille.firstElementChild
    const maintenant = Date.now()
    for (const b of blocs) {
      let l = this.lignes.get(b.cle)
      if (!l) { l = b.genre === 'seance' ? this.creerBloc(b) : this.creerCarte(b.page.id); this.lignes.set(b.cle, l) }
      if (l.el !== avant) this.grille.insertBefore(l.el, avant)
      else avant = avant.nextElementSibling
      if (b.genre === 'seance' && l.genre === 'seance') this.majBloc(l, b, maintenant)
      else if (b.genre === 'page' && l.genre === 'page') this.majCarte(l, b, maintenant)
    }
    this.blocs = blocs; this.ids = ids
    this.compte.textContent = ids.length ? pagesLisibles(ids.length) : ''
    this.vide.hidden = ids.length > 0
    this.grille.hidden = !ids.length
    this.boutonVider.disabled = !ids.length
    this.boutonVider.setAttribute('aria-disabled', String(!ids.length))
    // Les vignettes de la corbeille d'abord
    this.hote.vignettes.prioriser(ids)
    // Le focus perdu avec sa ligne : la suivante, la précédente, sinon « Pages »
    if (cleActive && !vues.has(cleActive) && this.ouverte) {
      const suivante = cles[Math.min(Math.max(0, rangActif), cles.length - 1)]
      const l = suivante ? this.lignes.get(suivante) : null
      ;(l ? (boutonActif === 'supprimer' ? l.supprimer : l.remettre) : this.retour).focus({ preventScroll: true })
    }
  }

  // ---------- Une page seule ----------
  private creerCarte(id: string): Carte {
    const el = document.createElement('li')
    el.className = 'carte-corbeille'; el.dataset.page = id; el.dataset.cle = id
    const image = Object.assign(document.createElement('div'), { className: 'carte-image' })
    image.setAttribute('aria-hidden', 'true')
    const nom = Object.assign(document.createElement('div'), { className: 'corbeille-nom' })
    const ou = Object.assign(document.createElement('div'), { className: 'corbeille-ou' })
    const date = Object.assign(document.createElement('div'), { className: 'corbeille-date' })
    const boutons = Object.assign(document.createElement('div'), { className: 'corbeille-boutons' })
    const remettre = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-remettre', textContent: 'Remettre' })
    remettre.addEventListener('click', () => this.remettre(id))
    const supprimer = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-supprimer danger', textContent: 'Supprimer définitivement' })
    supprimer.addEventListener('click', () => this.demanderSupprimer(id))
    boutons.append(remettre, supprimer)
    el.append(image, nom, ou, date, boutons)
    const c: Carte = { genre: 'page', el, nom, ou, date, remettre, supprimer }
    if (this.taille.l) this.poserVignette(c, id)
    return c
  }

  private majCarte(c: Carte, b: BlocCorbeille & { genre: 'page' }, maintenant: number) {
    const nom = this.hote.tableau.nomDe(b.page.id)
    const texte = nom ?? 'Page sans nom'
    if (c.nom.textContent !== texte) { c.nom.textContent = texte; c.nom.title = nom ?? '' }
    c.nom.classList.toggle('sans-nom', !nom)
    const ou = sousTitrePage(b, maintenant)
    if (c.ou.textContent !== ou) c.ou.textContent = ou
    c.ou.classList.toggle('inconnue', !b.seance)
    const date = dateDeSuppression(b.page, maintenant)
    if (c.date.textContent !== date) c.date.textContent = date
    // Le nom de la carte et de ses boutons, pour un lecteur d'écran
    const sujet = nom ? `« ${nom} »` : 'la page sans nom'
    const minuscule = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
    c.el.setAttribute('aria-label', `${texte}, ${minuscule(ou)}, ${minuscule(date)}`)
    c.remettre.setAttribute('aria-label', `Remettre ${sujet} parmi les pages`)
    c.supprimer.setAttribute('aria-label', `Supprimer définitivement ${sujet}`)
  }

  // ---------- Un bloc de séance ----------
  private creerBloc(b: BlocCorbeille & { genre: 'seance' }): BlocVue {
    const el = document.createElement('li')
    el.className = 'bloc-corbeille'; el.dataset.cle = b.cle; el.dataset.seance = b.seance.id
    const tete = Object.assign(document.createElement('div'), { className: 'bloc-corbeille-tete' })
    const titre = Object.assign(document.createElement('div'), { className: 'bloc-corbeille-titre' })
    const date = Object.assign(document.createElement('div'), { className: 'corbeille-date' })
    tete.append(titre, date)
    const rangee = Object.assign(document.createElement('div'), { className: 'bloc-corbeille-pages' })
    const boutons = Object.assign(document.createElement('div'), { className: 'corbeille-boutons' })
    const remettre = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-remettre', textContent: 'Remettre la séance' })
    remettre.addEventListener('click', () => this.remettreSeance(b.cle))
    const supprimer = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-supprimer danger', textContent: 'Supprimer définitivement' })
    supprimer.addEventListener('click', () => this.demanderSupprimerSeance(b.cle))
    boutons.append(remettre, supprimer)
    el.append(tete, rangee, boutons)
    return { genre: 'seance', el, titre, date, rangee, rangeeCle: '', remettre, supprimer }
  }

  private majBloc(l: BlocVue, b: BlocCorbeille & { genre: 'seance' }, maintenant: number) {
    const t = this.hote.tableau
    const titre = libelleBloc(b)
    if (l.titre.textContent !== titre) l.titre.textContent = titre
    const date = dateDeSuppression(b, maintenant)
    if (l.date.textContent !== date) l.date.textContent = date
    // La rangée des vignettes, numérotées 1…n, le nom de la page dessous :
    // refaite seulement si les pages ou leurs noms ont changé
    const noms = b.pages.map(p => t.nomDe(p.id))
    const cle = b.pages.map((p, i) => `${p.id}:${noms[i] ?? ''}`).join('|')
    if (cle !== l.rangeeCle) {
      l.rangeeCle = cle
      l.rangee.replaceChildren()
      b.pages.forEach((p, i) => {
        const v = Object.assign(document.createElement('div'), { className: 'corbeille-vignette' })
        v.dataset.page = p.id
        const nom = noms[i]
        v.title = `Page ${i + 1}${nom ? ` · ${nom}` : ''}`
        v.setAttribute('role', 'img'); v.setAttribute('aria-label', v.title)
        v.append(this.hote.vignettes.vignette(p.id, VIGNETTE_BLOC.l, VIGNETTE_BLOC.h), Object.assign(document.createElement('span'), { className: 'numero', textContent: String(i + 1) }))
        if (nom) v.append(Object.assign(document.createElement('span'), { className: 'nom', textContent: nom }))
        l.rangee.append(v)
      })
    }
    const sujet = `la séance « ${libelleSeance(b.seance)} » (${pagesLisibles(b.pages.length)})`
    l.el.setAttribute('aria-label', `${titre}, ${date.charAt(0).toLowerCase()}${date.slice(1)}`)
    l.remettre.setAttribute('aria-label', `Remettre ${sujet} parmi les pages`)
    l.supprimer.setAttribute('aria-label', `Supprimer définitivement ${sujet}`)
  }

  /** La taille des vignettes des cartes : celle des cartes de la grille (le
   *  même rapport que la trieuse, --rapport, posé sur elle) ; les blocs ont
   *  les leurs, fixes */
  private majTailles() {
    if (!this.ouverte) return
    const image = this.grille.querySelector<HTMLElement>('.carte-image')
    if (!image) return
    const l = image.clientWidth, h = image.clientHeight
    if (!(l > 0 && h > 0) || (Math.abs(l - this.taille.l) < 1 && Math.abs(h - this.taille.h) < 1)) return
    this.taille = { l, h }
    for (const [cle, c] of this.lignes) if (c.genre === 'page') this.poserVignette(c, cle)
  }

  private poserVignette(c: Carte, id: string) {
    const v = this.hote.vignettes.vignette(id, this.taille.l, this.taille.h)
    const image = c.el.querySelector('.carte-image')!
    const ancien = image.querySelector('canvas')
    if (ancien === v) return
    if (ancien) ancien.replaceWith(v)
    else image.prepend(v)
  }

  // ---------- Remettre ----------
  /** La page revient parmi les pages, à sa place d'avant (voir
   *  Tableau.remettrePage), dans sa séance, par le journal de la trieuse ; on
   *  revient aux pages, la page montrée avec le focus ; « Page remise : c'est
   *  la page 4 » (compté dans sa séance ; « Page remise dans la séance de
   *  lundi : c'est sa page 3 » hors de la séance du jour), avec « Annuler ». */
  private remettre(id: string) {
    const t = this.hote.tableau
    let place = -1
    const e = this.hote.journal.faire('page remise', () => { place = t.remettrePage(id) })
    if (!e || place < 0) { this.hote.message('Cette page n\'est plus dans la corbeille.'); this.maj(); return }
    // Le message de la poubelle qui la rendait n'a plus d'objet
    this.hote.oublierAction('page:' + id)
    const s = t.seanceDe(id), jour = t.derniereSeance()
    const numero = s ? s.pages.indexOf(id) + 1 : place + 1
    this.fermer(id)
    this.hote.annoncer(texteRemise({ numero, seance: s, duJour: !s || !jour || s.id === jour.id }), e)
  }

  /** Toute la séance revient (Tableau.rendrePages : ses pages, triées par
   *  leur place d'alors, chacune après sa voisine), par le journal de la
   *  trieuse ; sa fiche n'a jamais quitté le classeur (nom, date, rang). On
   *  revient aux pages, sur sa première page ; « Séance remise : « … »
   *  (4 pages) », avec « Annuler » ; si elle redevient la séance du jour
   *  (la plus récente du classeur), le message le dit. */
  private remettreSeance(cle: string) {
    const b = this.blocs.find(x => x.cle === cle)
    if (!b || b.genre !== 'seance') return
    const t = this.hote.tableau
    const ids = pagesDuBloc(t, b)
    const jourAvant = t.derniereSeance()?.id ?? null
    let n = 0
    const e = this.hote.journal.faire('séance remise', () => { n = t.rendrePages(ids) })
    if (!e || !n) { this.hote.message('Cette séance n\'est plus dans la corbeille.'); this.maj(); return }
    for (const id of ids) this.hote.oublierAction('page:' + id)
    const s = t.seancesDuClasseur().find(x => x.id === b.seance.id) ?? b.seance
    const jour = t.derniereSeance()?.id ?? null
    this.fermer(s.pages[0] ?? ids[0])
    this.hote.annoncer(texteSeanceRemise(s, n, jour === s.id && jour !== jourAvant), e)
  }

  // ---------- Supprimer définitivement, vider ----------
  private demanderSupprimer(id: string) {
    if (!this.lignes.has(id)) return
    void this.demander({
      titre: 'Supprimer définitivement cette page ?', texte: TEXTE_UNE, bouton: 'Supprimer définitivement',
    }).then(oui => { if (oui) this.supprimerDefinitivement([id], 'page') })
  }

  private demanderSupprimerSeance(cle: string) {
    const b = this.blocs.find(x => x.cle === cle)
    if (!b || b.genre !== 'seance') return
    const ids = b.pages.map(p => p.id)
    void this.demander({
      titre: 'Supprimer définitivement cette séance ?', texte: texteSupprimerSeance(ids.length), bouton: 'Supprimer définitivement',
    }).then(oui => {
      if (!oui) return
      // Ses pages vides parties avec elle ne reviendront pas non plus
      const t = this.hote.tableau
      t.marquerDefinitives(pagesDuBloc(t, b).filter(id => !ids.includes(id)))
      this.supprimerDefinitivement(ids, 'seance')
    })
  }

  private demanderVider() {
    const n = this.ids.length
    if (!n) return
    void this.demander({ titre: 'Vider la corbeille ?', texte: texteVider(n), bouton: 'Vider la corbeille' })
      .then(oui => { if (oui) this.supprimerDefinitivement([...this.ids], 'tout') })
  }

  /** Les pages ne reviendront plus (Tableau.supprimerDefinitivement : leur
   *  entrée le dit, leurs marques d'annulation s'en vont ; rien d'autre ne
   *  change, leur histoire reste). Le message « Page N supprimée · Annuler »
   *  encore à l'écran s'en va (il ne peut plus rien rendre), et le journal
   *  de la trieuse se vide : l'état des pages a changé hors de lui. */
  private supprimerDefinitivement(ids: string[], quoi: 'page' | 'seance' | 'tout') {
    const n = this.hote.tableau.supprimerDefinitivement(ids)
    for (const id of ids) this.hote.oublierAction('page:' + id)
    if (!n) { this.maj(); return }
    this.hote.oublierJournal()
    this.maj()
    this.hote.message(quoi === 'tout' ? `Corbeille vidée (${pagesLisibles(n)})` : quoi === 'seance' ? `Séance supprimée définitivement (${pagesLisibles(n)})` : 'Page supprimée définitivement')
  }

  /** Une question dans une fenêtre de l'outil (pas confirm()), créée au
   *  moment de s'ouvrir (jamais inerte), modale : « Annuler » a le focus
   *  d'abord ; Échap ou un clic à côté la ferment sans rien faire (la
   *  corbeille reste ouverte). Le focus revient où il était. Vrai : on a
   *  confirmé. */
  private demander(o: { titre: string; texte: string; bouton: string }): Promise<boolean> {
    this.question?.close()
    return new Promise(ok => {
      const avant = document.activeElement as HTMLElement | null
      const d = document.createElement('dialog')
      d.className = 'dialogue dialogue-corbeille'
      d.innerHTML = `<h2></h2><div class="corps"><p></p><div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="button" class="principal danger-plein" data-a="oui"></button></div></div>`
      d.querySelector('h2')!.textContent = o.titre
      d.querySelector('p')!.textContent = o.texte
      const oui = d.querySelector<HTMLButtonElement>('[data-a="oui"]')!, non = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
      oui.textContent = o.bouton
      let reponse = false
      d.addEventListener('close', () => {
        d.remove()
        if (this.question === d) this.question = null
        if (avant?.isConnected && !this.el.hidden) avant.focus({ preventScroll: true })
        ok(reponse)
      })
      fermerSurLeFond(d, () => d.close())
      non.addEventListener('click', () => d.close())
      oui.addEventListener('click', () => { reponse = true; d.close() })
      document.body.appendChild(d)
      this.question = d
      d.showModal()
      non.focus()
    })
  }
}
