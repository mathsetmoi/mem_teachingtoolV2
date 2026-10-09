// =============================================================
// LA TRIEUSE DES PAGES
// Toutes les pages en vignettes, plein écran : on y va à une page (un clic,
// un toucher, Entrée, son numéro tapé au clavier) et on les range (les
// glisser à la souris, à la tablette graphique ou au doigt ; Ctrl + Maj +
// flèches au clavier). On y choisit plusieurs pages (Maj + clic, Ctrl +
// clic, Espace, Ctrl + A ; au doigt, « Choisir plusieurs »), et chaque
// vignette a son menu (le bouton ⋯, le clic droit, le bouton du stylet, la
// touche Menu) : aller, renommer, dupliquer avec l'histoire, insérer une
// page vide avant ou après, changer le fond, supprimer (vers la corbeille).
// Ce qu'on y fait s'annule (Ctrl+Z dans la trieuse, « Annuler » du message)
// par son propre journal (voir journal.ts ; les actions elles-mêmes sont
// dans actions.ts) : aucune pile d'annulation de page n'est touchée.
// Plein écran plutôt qu'un panneau sur le côté : la page est infinie et le
// vidéoprojecteur montre tout à la classe ; un panneau prendrait un
// cinquième du tableau pour quatre vignettes, la grille en montre quinze à
// vingt-cinq (soixante en défilant), laisse la place de glisser loin, sert
// telle quelle au téléphone (deux colonnes) et fait un moment d'organisation
// clair pour la classe. Comme la revue, elle couvre le tableau : body reçoit
// la classe en-trieuse, sous laquelle plus rien n'écrit sur la page cachée
// (voir navigateur.tableauCache), et le reste de l'écran devient inerte.
// Ses vignettes viennent de pages/vignettes.ts : les canevas ne sont dans
// le document que tant qu'elle est ouverte (fermée, elle ne coûte rien).
// Ce qui sort des pages y a sa place : « Exporter en PDF » dans le bandeau
// (tout le tableau) et dans celui des pages choisies, « Copier en image »
// et « Exporter en PDF… » dans le menu d'une vignette ; Ctrl + P exporte
// les pages choisies, sinon tout le tableau (voir sorties/export-pdf.ts).
// La corbeille (corbeille.ts) est une vue de la trieuse : son bouton dans
// le bandeau (« Corbeille (3) ») remplace la grille par les pages
// supprimées, qu'on y remet ou supprime définitivement ; Échap ou
// « Pages » ramènent à la grille.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import { JournalPages } from './journal'
import type { Entree } from './journal'
import type { Vignettes } from './vignettes'
import type { Apercus } from '../sorties/apercu'
import type { CibleExport } from '../sorties/export-pdf'
import { barreDInsertion, lignesDe, placeDInsertion, vitesseDefilement } from './glisser'
import type { Rect } from './glisser'
import * as actions from './actions'
import { VueCorbeille, compterCorbeille, libelleCorbeille } from './corbeille'
import { APPUI_LONG, SEUIL_GLISSER, ecranTactile, typePointeur } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import type { Menu } from '../menus'
import { ENTREES, allerAuxEntrees, avale, entreeMenu, fermerMenu, filetMenu, menuOuvert, ouvrirMenu, placerMenu, titreMenu } from '../menus'
import { CTRL, MAC, toucheMarquePage, toucheMenu } from '../navigateur'
import { pagesLisibles } from '../fichier'
import { icone } from '../icones'
import { FONDS } from '../types'
import type { Fond } from '../types'

/** Ce que la trieuse demande à l'interface */
export interface HoteTrieuse {
  /** Un message en bas de l'écran, au-dessus de la trieuse ; cle 'trieuse'
   *  pour ses « Annuler » (ils s'en vont à la fermeture) */
  message(texte: string, action?: { libelle: string; faire: () => void; cle?: string }): void
  oublierAction(cle?: string): void
  /** Ce qu'on voit du tableau entre les barres : le rapport des vignettes */
  zoneLibre(): { l: number; h: number }
  maj(): void
  /** La boîte du contenu d'une page (l'origine du repère qu'on lui donne) */
  readonly apercus: Apercus
  /** « Copier en image » du menu d'une vignette : la page en PNG dans le
   *  presse-papiers du système (voir sorties/image.ts) ; la trieuse reste
   *  ouverte. Appelé dans le geste (le clic) : Safari l'exige. */
  copierPageEnImage(page: string): void
  /** « Exporter en PDF » : la fenêtre de l'export (voir sorties/export-pdf.ts),
   *  par-dessus la trieuse, qui reste ouverte et utilisable pendant l'export */
  exporterPdf(cible: CibleExport): void
}

/** La clé des messages de la trieuse (voir HoteTrieuse.message) */
const CLE = 'trieuse'
/** Deux chiffres tapés à moins de ce temps (ms) font un seul numéro (« 1 », « 2 » : la page 12) */
const ENTRE_CHIFFRES = 800
/** Un clic sur le nom d'une page attend ce temps (ms) qu'un second en fasse
 *  un double-clic (renommer) avant de mener à la page */
const DOUBLE_CLIC_NOM = 400

const AIDE_SOURIS = 'Cliquer sur une page pour y aller · la glisser pour la déplacer · taper son numéro · Échap : fermer'
const AIDE_DOIGT = 'Toucher une page pour y aller · la déplacer par ⋮⋮ ou par un appui long · × : fermer'
const AIDE_CHOIX = 'Toucher une page pour la choisir ou la retirer · « Choisir plusieurs » : terminer'

/** Le pointeur posé sur une carte, avant qu'il glisse (ou qu'il se lève :
 *  un clic, un toucher bref, qui mène à la page) */
interface Appui {
  id: number
  type: TypePointeur
  /** Le doigt, ou un stylet posé sur l'écran lui-même : la grille défile
   *  sous lui ; il ne tire une page que par sa poignée, ou après un appui long */
  direct: boolean
  page: string
  carte: HTMLElement
  x0: number; y0: number
  /** Parti de la poignée ⋮⋮ */
  poignee: boolean
  /** Parti du nom de la page (un double-clic le renomme) */
  nom: boolean
  /** Maj, ou Ctrl (⌘ sur Mac) : le clic choisit la page au lieu d'y aller */
  ajoute: boolean
  /** Il peut tirer la page dès qu'il passe son seuil (souris, tablette
   *  graphique, poignée) */
  arme: boolean
  /** Il a bougé avant l'appui long (le doigt fait défiler) : ce n'est plus un toucher */
  bouge: boolean
  minuterie: number
}

/** Des pages qu'on tire */
interface Glisse {
  id: number
  ids: string[]
  carte: HTMLElement
  /** Les cartes de toutes les pages tirées (estompées) */
  tirees: HTMLElement[]
  fantome: HTMLElement
  barre: HTMLElement
  /** Où le pointeur tient la carte (depuis son coin) */
  dx: number; dy: number
  /** Le dernier point du pointeur (fenêtre) */
  x: number; y: number
  /** La place d'arrivée (voir placeDInsertion) */
  place: number
  /** Ce qui reste d'un pas de défilement de moins d'un pixel */
  reste: number
  /** L'écart entre deux cartes de la grille (px) : la barre s'y pose */
  ecart: number
}

/** Le nom d'une page qu'on écrit, dans sa carte */
interface Saisie { page: string; input: HTMLInputElement }

export class Trieuse {
  readonly el: HTMLElement
  /** Le bandeau garde ici ses boutons (les pages choisies, Choisir
   *  plusieurs, Ajouter une page, Exporter en PDF, la corbeille) : il passe
   *  à la ligne sur un téléphone */
  readonly actions: HTMLElement
  /** Ce que le bandeau montre quand des pages sont choisies : leur nombre,
   *  Dupliquer, Supprimer, Exporter en PDF, Tout désélectionner */
  readonly groupeChoix: HTMLElement
  readonly journal: JournalPages
  /** La vue de la corbeille (voir corbeille.ts) */
  readonly corbeille: VueCorbeille
  /** Son bouton dans le bandeau : « Corbeille (3) » */
  private boutonCorbeille: HTMLButtonElement
  /** « Exporter en PDF » du bandeau (tout le tableau) : caché tant que des
   *  pages sont choisies (le bandeau des pages choisies a le sien) */
  private boutonPdf: HTMLButtonElement
  /** Les pages choisies (Maj + clic, Ctrl + clic, Espace, Ctrl + A,
   *  « Choisir plusieurs ») ; vide à l'ouverture */
  readonly selection = new Set<string>()
  private grille: HTMLElement
  private compte: HTMLElement
  private aide: HTMLElement
  private nombreChoisies: HTMLElement
  private boutonChoisir: HTMLButtonElement
  private cartes = new Map<string, HTMLElement>()
  /** L'ordre que montre la grille */
  private ordre: string[] = []
  /** La carte qui a le focus de la grille (un seul arrêt de Tab) */
  private focusId: string | null = null
  /** La taille des vignettes (px CSS) */
  private taille = { l: 0, h: 0 }
  private visibles = new Set<string>()
  private io: IntersectionObserver | null = null
  private ro: ResizeObserver | null = null
  private inertes: HTMLElement[] = []
  private retour: HTMLElement | null = null
  private auRetour: (() => void) | null = null
  private peinteAvant: Vignettes['onPeinte'] = null
  private chiffres = { texte: '', t: -Infinity }
  /** Le pointeur du dernier appui, où qu'il soit (le compteur touché au
   *  doigt ouvre la trieuse avec l'aide du doigt) */
  private dernierPointeur: TypePointeur | null = null
  private appui: Appui | null = null
  private glisse: Glisse | null = null
  private boucle = 0
  private remiseATaille = 0
  /** « Choisir plusieurs » allumé : chaque toucher choisit ou retire une
   *  page au lieu d'y aller */
  private modeChoix = false
  /** Le menu d'une vignette : un seul élément, refait à chaque ouverture */
  private menuEl: HTMLElement
  private menuCarte: { page: string; menu: Menu } | null = null
  /** Où le menu d'une vignette s'est posé la dernière fois (px, à l'écran) :
   *  le second temps de « Insérer une page… » prend la même place */
  private cadreMenu: { left: number; top: number; l: number } | null = null
  private saisie: Saisie | null = null
  /** Un clic sur le nom d'une page, qui attend de savoir s'il est le premier d'un double-clic */
  private clicNom: { page: string; minuterie: number } | null = null
  /** Les suppressions qui ont mené ailleurs : la page qu'on regardait et
   *  celle où l'on est arrivé (annuler y ramène, rétablir y renvoie) */
  private retours = new WeakMap<Entree, { regardee: string; arrivee: string }>()

  constructor(private app: App, private racine: HTMLElement, private hote: HoteTrieuse, private vignettes: Vignettes) {
    const el = this.el = document.createElement('section')
    el.className = 'trieuse'
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Pages')
    el.hidden = true
    const tete = document.createElement('div'); tete.className = 'trieuse-tete'
    const titre = Object.assign(document.createElement('h2'), { textContent: 'Pages' })
    this.compte = Object.assign(document.createElement('span'), { className: 'trieuse-compte' })
    this.actions = Object.assign(document.createElement('div'), { className: 'trieuse-actions' })
    // Les pages choisies : leur nombre (dit au lecteur d'écran), et ce qu'on peut leur faire
    this.groupeChoix = Object.assign(document.createElement('div'), { className: 'trieuse-choix', hidden: true })
    this.nombreChoisies = Object.assign(document.createElement('span'), { className: 'trieuse-nombre' })
    this.nombreChoisies.setAttribute('role', 'status')
    // Sur un téléphone, ces boutons et « Ajouter une page » ne montrent que
    // leur icône (leur nom reste le même), et la croix de « Tout
    // désélectionner » passe devant le nombre (comme Google Photos) : le
    // bandeau tient en trois lignes
    const deselectionner = this.bouton('Tout désélectionner', 'fermer', () => this.viderChoix(), 'Tout désélectionner (Échap)', true)
    deselectionner.classList.add('trieuse-deselectionner')
    this.groupeChoix.append(this.nombreChoisies,
      this.bouton('Dupliquer', 'dupliquer', () => this.dupliquer(this.choisies()), `Dupliquer les pages choisies, avec leur histoire (${CTRL} + D)`, true),
      this.bouton('Supprimer', 'poubelle', () => this.supprimer(this.choisies()), 'Supprimer les pages choisies (Suppr)', true),
      this.bouton('Exporter en PDF', 'pdf', () => this.hote.exporterPdf({ pages: this.choisies() }), `Les pages choisies en PDF, en feuilles A4 (${CTRL} + P)`, true),
      deselectionner)
    // Au doigt (un écran tactile) : Maj + clic n'existe pas, cet interrupteur le remplace
    this.boutonChoisir = this.bouton('Choisir plusieurs', 'coche', () => this.basculerModeChoix(), 'Choisir plusieurs pages : chaque toucher en choisit une ou la retire')
    this.boutonChoisir.classList.add('trieuse-choisir')
    this.boutonChoisir.setAttribute('aria-pressed', 'false')
    // « Ajouter une page », jamais « Nouvelle page » : c'est le nom du bouton
    // du tableau, que des essais cherchent par une partie de son nom
    const ajouter = this.bouton('Ajouter une page', 'plus', () => this.ajouterALaFin(), 'Ajouter une page vide à la fin', true)
    // La corbeille : son libellé dit combien de pages y attendent (il reste
    // écrit sur un téléphone : on y lit le nombre)
    this.boutonCorbeille = this.bouton('Corbeille', 'poubelle', () => this.ouvrirCorbeille(), 'Les pages supprimées : les remettre, ou les supprimer définitivement')
    this.boutonCorbeille.classList.add('trieuse-bouton-corbeille')
    this.boutonPdf = this.bouton('Exporter en PDF', 'pdf', () => this.hote.exporterPdf('tout'), `Toutes les pages en PDF, cadrées sur leur contenu, en feuilles A4 (${CTRL} + P)`, true)
    this.actions.append(this.groupeChoix, this.boutonChoisir, ajouter, this.boutonPdf, this.boutonCorbeille)
    const fermer = document.createElement('button')
    fermer.type = 'button'; fermer.className = 'bouton trieuse-fermer'; fermer.innerHTML = icone('fermer')
    fermer.title = 'Fermer les pages (Échap)'; fermer.setAttribute('aria-label', 'Fermer les pages')
    fermer.addEventListener('click', () => this.fermer())
    tete.append(titre, this.compte, this.actions, fermer)
    this.grille = document.createElement('div'); this.grille.className = 'trieuse-grille'
    this.grille.setAttribute('role', 'listbox'); this.grille.setAttribute('aria-label', 'Les pages, dans l\'ordre')
    this.grille.setAttribute('aria-multiselectable', 'true')
    this.aide = Object.assign(document.createElement('p'), { className: 'trieuse-aide' })
    // Le menu d'une vignette : un enfant de la trieuse (les menus de la racine
    // sont inertes tant qu'elle est ouverte), un petit menu comme les autres
    this.menuEl = document.createElement('div')
    this.menuEl.className = 'menu-flottant menu-vignette'; this.menuEl.setAttribute('role', 'menu')
    this.menuEl.hidden = true
    // Le second temps de « Insérer une page… » (le choix du fond) : le second
    // clic d'un double-clic sur « Insérer… » tomberait sur un fond, il
    // n'arrive pas aux entrées (en capture, sur le menu : avant elles)
    this.menuEl.addEventListener('click', e => {
      if (e.detail > 1 && this.menuEl.dataset.temps === 'fond') e.stopPropagation()
    }, true)
    this.journal = new JournalPages(app.tableau)
    this.corbeille = new VueCorbeille({
      tableau: app.tableau, journal: this.journal, vignettes,
      message: t => this.hote.message(t),
      annoncer: (t, e) => this.annoncer(t, e),
      oublierAction: c => this.hote.oublierAction(c),
      oublierJournal: () => { this.journal.vider(); this.hote.oublierAction(CLE) },
      revenir: (page, rendreFocus) => this.revenirDeLaCorbeille(page, rendreFocus),
    })
    el.append(tete, this.grille, this.aide, this.corbeille.el, this.menuEl)
    racine.appendChild(el)
    this.brancherPointeurs()
    // Ni le menu du navigateur (« Enregistrer l'image » d'un canevas), ni
    // celui qu'ouvre l'appui long sur Android ; sauf dans le champ du nom
    // (y coller un nom)
    el.addEventListener('contextmenu', e => { if (!(e.target as Element).closest?.('input')) e.preventDefault() })
    document.addEventListener('pointerdown', e => { this.dernierPointeur = typePointeur(e.pointerType) }, true)
  }

  get ouvert() { return !this.el.hidden }

  /** Un bouton du bandeau : une icône et son libellé, qui est aussi son nom
   *  (aria-label : il le garde quand le téléphone ne montre que l'icône,
   *  iconeSeule) */
  private bouton(texte: string, nomIcone: string, faire: () => void, titre: string, iconeSeule = false): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'trieuse-bouton' + (iconeSeule ? ' icone-seule' : ''); b.title = titre
    b.setAttribute('aria-label', texte)
    b.innerHTML = icone(nomIcone)
    b.append(Object.assign(document.createElement('span'), { className: 'libelle', textContent: texte }))
    b.addEventListener('click', () => { if (!this.glisse) faire() })
    return b
  }

  // ---------- Ouvrir, fermer ----------
  /** retour : l'élément qui reprend le focus à la fermeture (le compteur,
   *  quand on l'a ouverte au clavier) ; auRetour : appelé quand le tableau
   *  revient (ranger un instrument du programme de construction) */
  ouvrir(o: { retour?: HTMLElement | null; auRetour?: (() => void) | null } = {}) {
    if (this.ouvert) return
    this.retour = o.retour ?? null
    this.auRetour = o.auRetour ?? null
    document.body.classList.add('en-trieuse')
    // Le reste de l'écran ne répond plus, ni au clavier ni au lecteur
    // d'écran, comme pour la revue ; sauf le message (il passe au-dessus
    // d'elle, avec ses « Annuler ») et les fenêtres (une fenêtre ouverte
    // depuis la trieuse doit répondre)
    this.inertes = []
    for (const c of this.racine.children) {
      if (c === this.el || !(c instanceof HTMLElement) || c.inert || c.classList.contains('toast') || c instanceof HTMLDialogElement) continue
      c.inert = true; this.inertes.push(c)
    }
    this.el.classList.toggle('sans-tactile', !ecranTactile())
    this.selection.clear(); this.modeChoix = false
    this.majAide(this.dernierPointeur ?? this.app.dernierPointeur)
    this.chiffres = { texte: '', t: -Infinity }
    this.el.hidden = false
    this.peinteAvant = this.vignettes.onPeinte
    this.vignettes.onPeinte = (page, c) => { this.peinte(page, c); this.peinteAvant?.(page, c) }
    this.focusId = this.app.page
    this.io = new IntersectionObserver(evts => this.surVisibles(evts), { root: this.grille, rootMargin: '120px 0px' })
    this.refaire()
    this.majChoix()
    this.majTailles()
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(this.remiseATaille)
      this.remiseATaille = requestAnimationFrame(() => this.majTailles())
    })
    this.ro.observe(this.grille)
    window.addEventListener('keydown', this.surTouche, true)
    window.visualViewport?.addEventListener('resize', this.surClavierVirtuel)
    this.app.tableau.ordre.observe(this.surChangement)
    this.app.tableau.noms.observe(this.surChangement)
    this.app.tableau.corbeille.observe(this.surCorbeille)
    // La page qu'on regarde, au milieu, avec le focus
    const c = this.focusId ? this.cartes.get(this.focusId) : null
    if (c) {
      const g = this.grille, r = c.getBoundingClientRect(), gr = g.getBoundingClientRect()
      g.scrollTop += (r.top + r.height / 2) - (gr.top + gr.height / 2)
      c.focus({ preventScroll: true })
    }
  }

  /** Échap, ×, Maj + P, ou aller à une page (page). Le nom qu'on écrivait
   *  est gardé ; le menu d'une vignette se ferme, la sélection s'oublie. Le
   *  journal se vide et le dernier « Annuler » de la trieuse s'en va :
   *  depuis le tableau, on n'annule pas un changement qu'on ne voit plus (la
   *  corbeille reste le filet ; Ctrl+Z rend la page qu'on regardait, si on
   *  l'a supprimée ici). Les canevas quittent le document : ils ne se
   *  repeignent plus. */
  fermer(o: { page?: string } = {}) {
    if (!this.ouvert) return
    this.annulerGlisser()
    this.annulerAppui()
    this.annulerClicNom()
    if (this.menuCarte) fermerMenu()
    this.finirSaisie(true)
    this.corbeille.fermer(null, true)
    this.el.classList.remove('en-corbeille')
    window.removeEventListener('keydown', this.surTouche, true)
    window.visualViewport?.removeEventListener('resize', this.surClavierVirtuel)
    this.app.tableau.ordre.unobserve(this.surChangement)
    this.app.tableau.noms.unobserve(this.surChangement)
    this.app.tableau.corbeille.unobserve(this.surCorbeille)
    this.io?.disconnect(); this.io = null
    this.ro?.disconnect(); this.ro = null
    cancelAnimationFrame(this.remiseATaille)
    this.vignettes.onPeinte = this.peinteAvant; this.peinteAvant = null
    this.vignettes.prioriser([])
    this.journal.vider()
    this.hote.oublierAction(CLE)
    this.selection.clear(); this.modeChoix = false
    this.el.hidden = true
    this.grille.replaceChildren()
    this.cartes.clear(); this.ordre = []; this.visibles.clear()
    document.body.classList.remove('en-trieuse')
    for (const c of this.inertes) c.inert = false
    this.inertes = []
    // Le tableau revient, puis la page choisie (son numéro s'annonce)
    if (o.page && o.page !== this.app.page && this.app.pages.includes(o.page)) this.app.allerPage(o.page)
    this.hote.maj()
    const retour = this.retour
    this.retour = null
    if (retour?.isConnected) retour.focus()
    const apres = this.auRetour
    this.auRetour = null
    apres?.()
  }

  /** Aller à une page : la trieuse se ferme, et l'on arrive sur la page
   *  (celle qu'on regardait : la trieuse se ferme seulement) */
  aller(id: string) { this.fermer({ page: id }) }

  // ---------- La grille ----------
  /** L'ordre ou les noms ont changé (une action, une annulation, un autre
   *  onglet) : la grille se refait, le focus et le défilement restent */
  private surChangement = () => { if (this.ouvert) this.refaire() }
  /** La corbeille a changé (une page supprimée définitivement, un autre
   *  onglet) : le bouton du bandeau, et la vue si elle est ouverte */
  private surCorbeille = () => {
    if (!this.ouvert) return
    this.majBoutonCorbeille()
    this.corbeille.prevoirMaj()
  }

  /** Met la grille à jour : une carte par page, dans l'ordre (les cartes
   *  existantes sont gardées, seules celles qui ne sont pas à leur place
   *  bougent), leurs numéros, leurs noms, la page actuelle, les pages
   *  choisies. Une page partie quitte la sélection ; son menu ou son nom
   *  qu'on écrivait s'en vont avec elle. */
  private refaire() {
    const g = this.grille, pages = this.app.pages
    const actif = document.activeElement
    const avaitFocus = !!actif && g.contains(actif)
    const defilement = g.scrollTop
    const vues = new Set(pages)
    const choisies = this.selection.size
    for (const [id, c] of this.cartes) {
      if (vues.has(id)) continue
      this.io?.unobserve(c); c.remove(); this.cartes.delete(id); this.visibles.delete(id); this.selection.delete(id)
    }
    if (this.menuCarte && !vues.has(this.menuCarte.page)) fermerMenu()
    if (this.saisie && !vues.has(this.saisie.page)) this.finirSaisie(false)
    // « Choisir plusieurs » s'éteint quand la sélection se vide
    if (choisies && !this.selection.size) this.modeChoix = false
    if (!this.focusId || !vues.has(this.focusId)) this.focusId = vues.has(this.app.page) ? this.app.page : pages[0] ?? null
    let avant: Element | null = g.firstElementChild
    pages.forEach((id, i) => {
      let c = this.cartes.get(id)
      if (!c) { c = this.creerCarte(id); this.cartes.set(id, c) }
      if (c !== avant) g.insertBefore(c, avant)
      else avant = avant.nextElementSibling
      this.majCarte(c, id, i)
    })
    this.ordre = pages
    this.compte.textContent = pagesLisibles(pages.length)
    this.majChoix()
    // Une page partie ou revenue change la corbeille (et un nom, ses cartes)
    this.majBoutonCorbeille()
    this.corbeille.prevoirMaj()
    // Déplacer une carte dans le document lui ôte le focus : il revient
    g.scrollTop = defilement
    if (avaitFocus && this.focusId && !g.contains(document.activeElement)) this.cartes.get(this.focusId)?.focus({ preventScroll: true })
    if (this.glisse) this.suivre(this.glisse.x, this.glisse.y)
  }

  private creerCarte(id: string): HTMLElement {
    const c = document.createElement('div')
    c.className = 'carte'; c.setAttribute('role', 'option'); c.dataset.page = id; c.tabIndex = -1
    const image = Object.assign(document.createElement('div'), { className: 'carte-image' })
    const numero = Object.assign(document.createElement('span'), { className: 'carte-numero' })
    const vide = Object.assign(document.createElement('span'), { className: 'carte-vide', textContent: 'Page vide', hidden: true })
    const poignee = Object.assign(document.createElement('span'), { className: 'carte-poignee', textContent: '⋮⋮' })
    const coche = Object.assign(document.createElement('span'), { className: 'carte-coche' })
    coche.innerHTML = icone('coche')
    for (const x of [numero, vide, poignee, coche]) x.setAttribute('aria-hidden', 'true')
    // Le menu de la page : hors de l'ordre de Tab (un seul arrêt pour toute
    // la grille) ; au clavier, la touche Menu l'ouvre
    const options = document.createElement('button')
    options.type = 'button'; options.className = 'carte-options'; options.tabIndex = -1
    options.innerHTML = icone('points')
    options.setAttribute('aria-haspopup', 'menu'); options.setAttribute('aria-expanded', 'false')
    options.addEventListener('click', e => {
      const page = c.dataset.page!
      if (this.glisse) return
      if (this.menuCarte?.page === page && this.menuCarte.menu.bouton === options) { fermerMenu(); return }
      this.focusCarte(page, { defiler: false })
      this.ouvrirMenuCarte(page, { bouton: options, clavier: e.detail === 0 })
    })
    image.append(numero, vide, poignee, coche, options)
    const nom = Object.assign(document.createElement('div'), { className: 'carte-nom' })
    nom.setAttribute('aria-hidden', 'true')
    c.append(image, nom)
    if (this.taille.l) this.poserVignette(c, id)
    this.io?.observe(c)
    return c
  }

  /** Le numéro, le nom, la page actuelle, le focus, le choix d'une carte */
  private majCarte(c: HTMLElement, id: string, i: number) {
    const nom = this.app.tableau.nomDe(id), actuelle = id === this.app.page
    const numero = String(i + 1)
    const n = c.querySelector('.carte-numero')!
    if (n.textContent !== numero) n.textContent = numero
    const nc = c.querySelector('.carte-nom')!, texte = nom ?? ''
    if (nc.textContent !== texte) { nc.textContent = texte; (nc as HTMLElement).title = texte ? `${texte} (double-clic : renommer)` : '' }
    const o = c.querySelector<HTMLElement>('.carte-options')!, titre = `Options de la page ${i + 1}`
    if (o.title !== titre) { o.title = titre; o.setAttribute('aria-label', titre) }
    c.classList.toggle('actuelle', actuelle)
    if (actuelle) c.setAttribute('aria-current', 'page'); else c.removeAttribute('aria-current')
    const choisie = String(this.selection.has(id))
    if (c.getAttribute('aria-selected') !== choisie) c.setAttribute('aria-selected', choisie)
    const t = id === this.focusId ? 0 : -1
    if (c.tabIndex !== t) c.tabIndex = t
    this.majVide(c, id, i)
  }

  /** « Page vide » sur la vignette d'une page sans rien, et le nom de la
   *  carte pour un lecteur d'écran : « Page 5, Exercice 12 p. 84, vide, page
   *  actuelle » (la vignette est un canevas, et « Page vide » y est
   *  aria-hidden : sans cela, rien ne distinguerait une page vide d'une page
   *  écrite). Refait quand la vignette est peinte (la page a changé). */
  private majVide(c: HTMLElement, id: string, i = this.ordre.indexOf(id)) {
    const v = c.querySelector<HTMLElement>('.carte-vide')!, vide = this.vignettes.vide(id)
    if (v.hidden === vide) v.hidden = !vide
    const nom = this.app.tableau.nomDe(id), actuelle = id === this.app.page
    const label = `Page ${i + 1}${nom ? `, ${nom}` : ''}${vide ? ', vide' : ''}${actuelle ? ', page actuelle' : ''}`
    if (c.getAttribute('aria-label') !== label) c.setAttribute('aria-label', label)
  }

  /** La taille des vignettes : la largeur d'une colonne, au rapport de ce
   *  qu'on voit du tableau entre les barres (de 4:3 à 16:9). Quand elle
   *  change (la fenêtre, l'écran qu'on tourne), chaque carte reçoit le
   *  canevas de la nouvelle taille. */
  private majTailles() {
    if (!this.ouvert) return
    const z = this.hote.zoneLibre()
    const rapport = z.l > 0 && z.h > 0 ? Math.min(16 / 9, Math.max(4 / 3, z.l / z.h)) : 16 / 10
    // Sur la trieuse entière : les cartes de la corbeille ont le même rapport
    this.el.style.setProperty('--rapport', rapport.toFixed(4))
    const image = this.grille.querySelector<HTMLElement>('.carte-image')
    if (!image) return
    const l = image.clientWidth, h = image.clientHeight
    if (!(l > 0 && h > 0) || (Math.abs(l - this.taille.l) < 1 && Math.abs(h - this.taille.h) < 1)) return
    this.taille = { l, h }
    for (const [id, c] of this.cartes) this.poserVignette(c, id)
  }

  private poserVignette(c: HTMLElement, id: string) {
    const v = this.vignettes.vignette(id, this.taille.l, this.taille.h)
    const ancien = c.querySelector('.carte-image canvas')
    if (ancien === v) return
    if (ancien) ancien.replaceWith(v)
    else c.querySelector('.carte-image')!.prepend(v)
  }

  /** Une vignette vient d'être peinte (les essais au navigateur le lisent) */
  private peinte(page: string, canevas: HTMLCanvasElement) {
    const c = this.cartes.get(page)
    if (!c || !c.contains(canevas)) return
    c.dataset.peinte = 'oui'
    this.majVide(c, page)
  }

  /** Les cartes visibles d'abord, dans l'ordre des pages */
  private surVisibles(evts: IntersectionObserverEntry[]) {
    for (const e of evts) {
      const id = (e.target as HTMLElement).dataset.page
      if (!id) continue
      if (e.isIntersecting) this.visibles.add(id); else this.visibles.delete(id)
    }
    // La corbeille ouverte : ses vignettes passent d'abord (la grille est cachée)
    if (!this.corbeille.ouverte) this.vignettes.prioriser(this.ordre.filter(id => this.visibles.has(id)))
  }

  // ---------- La corbeille ----------
  /** Le libellé du bouton du bandeau : « Corbeille (3) » ; son nom « Corbeille : 3 pages », « Corbeille : vide » */
  private majBoutonCorbeille() {
    const { texte, nom } = libelleCorbeille(compterCorbeille(this.app.tableau))
    const l = this.boutonCorbeille.querySelector('.libelle')!
    if (l.textContent !== texte) l.textContent = texte
    if (this.boutonCorbeille.getAttribute('aria-label') !== nom) this.boutonCorbeille.setAttribute('aria-label', nom)
  }

  /** Le bouton « Corbeille » : la vue de la corbeille prend la place de la
   *  grille (le menu ouvert se ferme, le nom qu'on écrivait est gardé ; les
   *  pages choisies le restent, Échap les retrouve au retour) */
  private ouvrirCorbeille() {
    if (this.glisse || this.corbeille.ouverte) return
    this.annulerAppui(); this.annulerClicNom()
    if (this.menuCarte) fermerMenu()
    this.finirSaisie(true)
    this.el.classList.add('en-corbeille')
    this.corbeille.ouvrir()
  }

  /** La vue de la corbeille s'est fermée : la grille revient. page : une
   *  page qu'on vient de remettre, montrée avec le focus ; sinon le focus
   *  retourne au bouton « Corbeille » (s'il était dans la vue) */
  private revenirDeLaCorbeille(page: string | null, rendreFocus: boolean) {
    this.el.classList.remove('en-corbeille')
    if (!this.ouvert) return
    this.majBoutonCorbeille()
    this.vignettes.prioriser(this.ordre.filter(id => this.visibles.has(id)))
    if (page && this.cartes.has(page)) this.focusCarte(page)
    else if (rendreFocus) this.boutonCorbeille.focus()
  }

  /** La ligne d'aide, selon le dernier pointeur : la souris et la tablette
   *  graphique cliquent et glissent ; le doigt et le stylet sur l'écran
   *  touchent, et tirent par la poignée ou un appui long ; « Choisir
   *  plusieurs » allumé, un toucher choisit */
  private majAide(type: TypePointeur = this.dernierPointeur ?? this.app.dernierPointeur) {
    const doigt = type === 'touch' || (type === 'pen' && ecranTactile())
    const t = this.modeChoix ? AIDE_CHOIX : doigt ? AIDE_DOIGT : AIDE_SOURIS
    if (this.aide.textContent !== t) this.aide.textContent = t
  }

  // ---------- Le focus ----------
  /** Le focus va à la carte d'une page (un seul arrêt de Tab : elle seule
   *  a tabindex 0), défilée pour se voir si besoin */
  private focusCarte(id: string, o: { defiler?: boolean } = {}) {
    const c = this.cartes.get(id)
    if (!c) return
    if (this.focusId !== id) {
      const avant = this.focusId ? this.cartes.get(this.focusId) : null
      if (avant) avant.tabIndex = -1
      this.focusId = id
    }
    c.tabIndex = 0
    c.focus({ preventScroll: true })
    if (o.defiler !== false) this.montrer(c)
  }

  /** Défile la grille juste assez pour que la carte s'y voie entière (au
   *  dessus du clavier virtuel, quand il couvre le bas de l'écran) */
  private montrer(c: HTMLElement) {
    const g = this.grille, r = c.getBoundingClientRect(), gr = g.getBoundingClientRect(), marge = 12
    const vv = window.visualViewport
    const bas = vv ? Math.min(gr.bottom, vv.offsetTop + vv.height) : gr.bottom
    if (r.top < gr.top + marge) g.scrollTop -= gr.top + marge - r.top
    else if (r.bottom > bas - marge) g.scrollTop += Math.min(r.bottom - (bas - marge), r.top - (gr.top + marge))
  }

  /** Le clavier virtuel paraît (on renomme une page au doigt) : la carte
   *  qu'on renomme reste visible au-dessus de lui */
  private surClavierVirtuel = () => {
    const s = this.saisie, c = s ? this.cartes.get(s.page) : null
    if (c) this.montrer(c)
  }

  /** Les rectangles des cartes, dans l'ordre des pages */
  private rects(): Rect[] {
    return this.ordre.map(id => {
      const r = this.cartes.get(id)!.getBoundingClientRect()
      return { x: r.left, y: r.top, l: r.width, h: r.height }
    })
  }

  /** ↑ ↓ : la carte de la ligne d'avant ou d'après la plus proche en x,
   *  selon la mise en page réelle de la grille */
  private carteVoisine(id: string, sens: 1 | -1): string | null {
    const rects = this.rects(), lignes = lignesDe(rects), i = this.ordre.indexOf(id)
    const k = lignes.findIndex(l => l.includes(i))
    const ligne = lignes[k + sens]
    if (k < 0 || !ligne) return null
    const x = rects[i].x + rects[i].l / 2
    let meilleur = ligne[0]
    for (const j of ligne) if (Math.abs(rects[j].x + rects[j].l / 2 - x) < Math.abs(rects[meilleur].x + rects[meilleur].l / 2 - x)) meilleur = j
    return this.ordre[meilleur]
  }

  // ---------- Les pages choisies ----------
  /** Les pages choisies, dans l'ordre */
  private choisies(): string[] { return this.ordre.filter(id => this.selection.has(id)) }

  /** Ce sur quoi agit une touche (Suppr, Ctrl + D) : les pages choisies, ou
   *  celle qui a le focus */
  private visees(): string[] { return actions.pagesVisees(this.app.pages, this.selection, this.focusId) }

  private basculerChoix(id: string) {
    if (this.selection.has(id)) this.selection.delete(id)
    else this.selection.add(id)
    // « Choisir plusieurs » s'éteint quand la sélection se vide
    if (!this.selection.size) this.modeChoix = false
    this.majChoix()
  }

  /** Ctrl + A : toutes les pages */
  private toutChoisir() {
    for (const id of this.ordre) this.selection.add(id)
    this.majChoix()
  }

  /** Échap, « Tout désélectionner » : plus rien de choisi, « Choisir
   *  plusieurs » éteint */
  private viderChoix() {
    this.selection.clear()
    this.modeChoix = false
    this.majChoix()
  }

  private basculerModeChoix() {
    this.modeChoix = !this.modeChoix
    this.majChoix()
  }

  /** Les cartes (aria-selected, la coche) et le bandeau (le nombre de pages
   *  choisies et ce qu'on peut leur faire ; l'interrupteur) suivent la
   *  sélection. Un bouton du bandeau qui se cache en gardant le focus le
   *  rend à la grille. */
  private majChoix() {
    for (const [id, c] of this.cartes) {
      const choisie = String(this.selection.has(id))
      if (c.getAttribute('aria-selected') !== choisie) c.setAttribute('aria-selected', choisie)
    }
    const n = this.selection.size
    this.el.classList.toggle('en-choix', this.modeChoix || n > 0)
    this.boutonChoisir.setAttribute('aria-pressed', String(this.modeChoix))
    const texte = n ? `${n} page${n > 1 ? 's' : ''} choisie${n > 1 ? 's' : ''}` : ''
    if (this.nombreChoisies.textContent !== texte) this.nombreChoisies.textContent = texte
    const cache = !n
    if (this.groupeChoix.hidden !== cache) {
      const perdu = (cache && this.groupeChoix.contains(document.activeElement)) || (!cache && this.boutonPdf === document.activeElement)
      this.groupeChoix.hidden = cache
      // Un seul « Exporter en PDF » à la fois : celui des pages choisies, ou celui de tout le tableau
      this.boutonPdf.hidden = !cache
      if (perdu && this.focusId) this.focusCarte(this.focusId, { defiler: false })
    }
    this.majAide()
  }

  // ---------- Le clavier ----------
  /** Sur window, en capture, posé à l'ouverture : il passe après ceux des
   *  menus (posés au démarrage) et avant le clavier du tableau, qu'il
   *  arrête pour ce qu'il traite (ce qu'il ne traite pas passe : Ctrl + S
   *  enregistre toujours ; le tableau caché se tait de lui-même). Une
   *  fenêtre (la question de la corbeille), un menu ouvert (celui d'une
   *  vignette), un champ (le nom d'une page) gardent leurs touches, dans cet
   *  ordre. La vue de la corbeille a les siennes (voir plus bas). Échap,
   *  ensuite : un glisser en cours, la sélection, puis la trieuse. */
  private surTouche = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement
    // Une fenêtre par-dessus garde son clavier, Échap compris (la question
    // de la corbeille : Échap la ferme, la corbeille reste)
    if (cible.closest?.('dialog') || document.querySelector('dialog[open]')) return
    // Un menu ouvert (celui d'une vignette) : menus.ts traite Échap, les
    // flèches et Tab ; sinon ↑ ↓ changeraient de carte derrière lui, et Suppr
    // supprimerait la page
    if (menuOuvert() || cible.closest?.('.menu-flottant')) return
    // Un champ (le nom d'une page) garde ses touches, Échap et Entrée
    // compris (voir renommer) ; Ctrl + D n'y ouvre pas le marque-page du
    // navigateur
    if (cible.closest?.('input, textarea, select, [contenteditable]')) { if (toucheMarquePage(e)) e.preventDefault(); return }
    const fait = () => { e.preventDefault(); e.stopPropagation() }
    const raccourci = (e.ctrlKey || e.metaKey) && !e.altKey
    const lettre = e.key.toLowerCase()
    // Ctrl + P (⌘ + P), ici comme dans la corbeille : le PDF des pages
    // choisies, sinon de tout le tableau, jamais l'impression de la page web
    // (Ctrl + Maj + P reste au navigateur)
    if (raccourci && !e.shiftKey && lettre === 'p') {
      fait()
      if (!e.repeat && !this.glisse) this.hote.exporterPdf(this.selection.size ? { pages: this.choisies() } : 'tout')
      return
    }
    // La vue de la corbeille : Échap ramène aux pages ; Maj + P ferme la
    // trieuse ; Ctrl+Z / Ctrl+Y vont au journal (« Annuler » une remise) ;
    // Tab, Entrée, Espace restent aux boutons. Rien de la grille (ni Suppr,
    // ni les flèches) ; Ctrl + D et Ctrl + A ne vont pas au navigateur.
    if (this.corbeille.ouverte) {
      if (e.key === 'Escape') { fait(); this.corbeille.fermer(); return }
      if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && lettre === 'p') { fait(); if (!e.repeat) this.fermer(); return }
      if (raccourci && (lettre === 'z' || lettre === 'y')) { fait(); if (lettre === 'y' || e.shiftKey) this.retablir(); else this.annuler(); return }
      if (toucheMarquePage(e) || (raccourci && lettre === 'a')) fait()
      return
    }
    if (e.key === 'Escape') {
      fait()
      if (this.glisse) { this.annulerGlisser(); return }
      this.annulerAppui()
      if (this.selection.size || this.modeChoix) { this.viderChoix(); return }
      this.fermer()
      return
    }
    // Pendant qu'on tire une page, les autres touches ne font rien (comme au
    // tableau pendant un geste) : le lâcher déplacerait des pages qu'une
    // annulation ou un déplacement au clavier viendraient de changer
    if (this.glisse) { fait(); return }
    // Maj + P : la referme (la lettre par e.key, en AZERTY comme en QWERTY)
    if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && lettre === 'p') { fait(); if (!e.repeat) this.fermer(); return }
    if (raccourci && (lettre === 'z' || lettre === 'y')) { fait(); if (lettre === 'y' || e.shiftKey) this.retablir(); else this.annuler(); return }
    // Ctrl + Maj + ← / → (⌘ + Maj sur Mac) : la page qui a le focus (les
    // pages choisies, si elle en est) avance ou recule d'une place
    if (raccourci && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      fait()
      if (this.focusId) this.deplacerDUnePlace(this.focusId, e.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    // Ctrl + D (⌘ + D) : dupliquer, jamais le marque-page du navigateur ;
    // avec Maj (tous les onglets en marque-pages), rien
    if (toucheMarquePage(e)) { fait(); if (!e.shiftKey && !e.repeat) this.dupliquer(this.visees()); return }
    // Ctrl + A : toutes les pages (pas le texte de la page)
    if (raccourci && !e.shiftKey && lettre === 'a') { fait(); this.toutChoisir(); return }
    if (raccourci || e.altKey || e.metaKey) return
    const surCarte = !!cible.closest?.('.carte')
    const nullePart = cible === document.body || cible === document.documentElement || cible === this.el || cible === this.grille
    // Des chiffres : le numéro d'une page (avec ou sans Maj : en AZERTY, les
    // chiffres du haut la demandent), lus par la touche
    const chiffre = /^(?:Digit|Numpad)([0-9])$/.exec(e.code)
    if (chiffre) { fait(); this.tapeChiffre(chiffre[1]); return }
    if (!surCarte && !nullePart) return
    const o = this.ordre, id = this.focusId ?? o[0]
    if (!id) return
    // La touche Menu, Maj + F10 : le menu de la page qui a le focus, le focus dans sa première entrée
    if (toucheMenu(e)) { fait(); if (!e.repeat) this.ouvrirMenuCarte(id, { clavier: true }); return }
    const i = o.indexOf(id)
    let vers: string | null | undefined
    switch (e.key) {
      case 'ArrowLeft': vers = o[i - 1]; break
      case 'ArrowRight': vers = o[i + 1]; break
      case 'ArrowUp': vers = this.carteVoisine(id, -1); break
      case 'ArrowDown': vers = this.carteVoisine(id, 1); break
      case 'Home': vers = o[0]; break
      case 'End': vers = o[o.length - 1]; break
      case 'Enter': fait(); if (!e.repeat) this.aller(id); return
      // Espace : choisit la page qui a le focus, ou la retire (sans faire défiler la grille)
      case ' ': fait(); if (!e.repeat) this.basculerChoix(id); return
      case 'F2': fait(); if (!e.repeat) this.renommer(id); return
      case 'Delete': case 'Backspace': fait(); if (!e.repeat) this.supprimer(this.visees()); return
      default: return
    }
    fait()
    if (vers) this.focusCarte(vers)
  }

  /** Un chiffre tapé : à moins de 800 ms du précédent, il s'y ajoute ; le
   *  focus va à la carte de ce numéro (Entrée l'ouvre) */
  private tapeChiffre(d: string) {
    const t = performance.now()
    const texte = (t - this.chiffres.t < ENTRE_CHIFFRES ? this.chiffres.texte : '') + d
    this.chiffres = { texte, t }
    const n = Number(texte), o = this.ordre
    if (n >= 1 && n <= o.length) this.focusCarte(o[n - 1])
    else if (n > o.length) this.hote.message(`Pas de page ${n} : il y en a ${o.length}.`)
  }

  // ---------- Le menu d'une vignette ----------
  /** Le menu d'une page : par son bouton ⋯ (sous lui), au clic droit ou au
   *  bouton du stylet (là où l'on a appuyé), à la touche Menu (sous le
   *  bouton ⋯, le focus dans la première entrée). Sur une page choisie
   *  parmi plusieurs, ce qu'on peut faire à toutes : les dupliquer, les
   *  supprimer. Un petit menu comme les autres (menus.ts) : Échap, un
   *  choix ou un appui ailleurs le ferment ; le focus revient à la carte.
   *  « Insérer une page avant… / après… » le refait à la même place, en
   *  second temps (o.insertion) : le fond de la page neuve, voir plus bas. */
  private ouvrirMenuCarte(page: string, o: { bouton?: HTMLElement; x?: number; y?: number; clavier?: boolean; insertion?: 'avant' | 'apres'; pointeY?: number }) {
    const c = this.cartes.get(page)
    if (!c || this.glisse) return
    this.finirSaisie(true)
    const m = this.menuEl
    m.replaceChildren()
    m.dataset.temps = o.insertion ? 'fond' : ''
    const i = this.ordre.indexOf(page)
    const choisies = this.choisies()
    // L'entrée qui prend le focus à l'ouverture (le second temps de l'insertion)
    let defaut: HTMLButtonElement | null = null
    if (o.insertion) {
      // Le fond de la page qu'on insère : les quatre, celui de sa voisine (la
      // page du menu) coché, avec le focus, pris par Entrée ; un choix insère
      // la page à ce fond, en une seule action (une entrée du journal, un
      // seul « Annuler »). Le second clic d'un double-clic sur « Insérer… »,
      // qui tomberait ici sur un fond, ne fait rien (voir le constructeur).
      const cote = o.insertion, fond = this.app.tableau.fondDe(page)
      const ou = cote === 'avant' ? 'avant' : 'après'
      m.setAttribute('aria-label', `Fond de la page insérée ${ou} la page ${i + 1}`)
      titreMenu(m, `Page vide ${ou} la page ${i + 1} : son fond`)
      for (const f of FONDS) {
        const b = entreeMenu(m, f.nom, () => this.inserer(page, cote, f.id), { coche: f.id === fond, aide: f.id === fond ? `Celui de la page ${i + 1}` : undefined })
        if (f.id === fond) defaut = b
      }
    } else if (this.selection.has(page) && choisies.length > 1) {
      const n = choisies.length
      m.setAttribute('aria-label', `${n} pages`)
      titreMenu(m, `${n} pages`)
      entreeMenu(m, 'Dupliquer', () => this.dupliquer(choisies), { touche: `${CTRL} + D`, aide: 'Avec leur histoire, chacune juste après elle-même' })
      entreeMenu(m, 'Exporter en PDF…', () => this.hote.exporterPdf({ pages: choisies }), { touche: `${CTRL} + P`,
        aide: 'Cadrées sur leur contenu, en feuilles A4', inactif: choisies.every(p => this.vignettes.vide(p)) })
      entreeMenu(m, 'Supprimer', () => this.supprimer(choisies), { touche: 'Suppr' })
    } else {
      const fond = this.app.tableau.fondDe(page)
      m.setAttribute('aria-label', `Page ${i + 1}`)
      entreeMenu(m, 'Aller à cette page', () => this.aller(page), { touche: 'Entrée' })
      filetMenu(m)
      entreeMenu(m, 'Renommer…', () => this.renommer(page), { touche: 'F2' })
      entreeMenu(m, 'Dupliquer', () => this.dupliquer([page]), { touche: `${CTRL} + D`, aide: 'Une copie juste après, avec toute son histoire' })
      // Le fond se choisit en second temps (à la même place, voir plus bas ;
      // pointeY : la hauteur du clic, rien au clavier)
      entreeMenu(m, 'Insérer une page avant…', e => this.ouvrirMenuCarte(page, { ...o, insertion: 'avant', pointeY: e.detail ? e.clientY : undefined }))
      entreeMenu(m, 'Insérer une page après…', e => this.ouvrirMenuCarte(page, { ...o, insertion: 'apres', pointeY: e.detail ? e.clientY : undefined }))
      filetMenu(m)
      titreMenu(m, 'Fond')
      for (const f of FONDS) entreeMenu(m, f.nom, () => this.changerFond(page, f.id), { coche: f.id === fond })
      filetMenu(m)
      // Ce qui sort de la page : son image, pour l'ENT ou Pronote, et son PDF
      // (la fenêtre propose aussi tout le tableau) ; la trieuse reste ouverte
      entreeMenu(m, 'Copier en image', () => this.hote.copierPageEnImage(page), {
        aide: `Une image PNG, à coller dans l'ENT ou Pronote (${CTRL}+V)`, inactif: this.vignettes.vide(page) })
      // Grisé sur une page vide, comme « Copier en image » et comme
      // « Exporter la page en PDF… » au tableau (le bandeau et Ctrl + P
      // restent là pour tout le tableau)
      entreeMenu(m, 'Exporter en PDF…', () => this.hote.exporterPdf({ page }), { aide: 'Cadrée sur son contenu, en feuilles A4', inactif: this.vignettes.vide(page) })
      entreeMenu(m, 'Supprimer', () => this.supprimer([page]), { touche: 'Suppr' })
    }
    const options = c.querySelector<HTMLElement>('.carte-options')!
    const menu: Menu = { el: m, bouton: o.bouton, fermer: () => this.surMenuFerme(menu) }
    this.menuCarte = { page, menu }
    // Le second temps de l'insertion garde la boîte du premier (même bord
    // gauche, même largeur au moins) ; choisi au pointeur, il se pose de
    // sorte que le fond de la voisine soit sous lui (un second clic au même
    // endroit le prend ; celui d'un double-clic ne fait rien), sinon au même
    // coin ; toujours dans l'écran
    const cadre = o.insertion ? this.cadreMenu : null
    m.style.minWidth = cadre ? cadre.l + 'px' : ''
    ouvrirMenu(menu)
    if (cadre) {
      const top = defaut && o.pointeY !== undefined ? o.pointeY - defaut.offsetTop - defaut.offsetHeight / 2 : cadre.top
      m.style.left = cadre.left + 'px'
      m.style.top = Math.max(8, Math.min(top, window.innerHeight - m.offsetHeight - 8)) + 'px'
    } else if (o.bouton || o.x === undefined || o.y === undefined) placerMenu(m, options.getBoundingClientRect(), 'dessous')
    else placerMenu(m, new DOMRect(o.x, o.y, 0, 0), 'droite')
    this.cadreMenu = { left: parseFloat(m.style.left) || 0, top: parseFloat(m.style.top) || 0, l: m.offsetWidth }
    if (defaut) defaut.focus({ preventScroll: true })
    else if (o.clavier) allerAuxEntrees(m, 1, ENTREES)
  }

  /** Le menu d'une vignette vient de se fermer : le focus qui y était (ou
   *  sur son bouton ⋯, ou nulle part) revient à la carte, d'où le clavier
   *  continue ; un choix qui le prend ensuite (le champ du nom) le garde. */
  private surMenuFerme(menu: Menu) {
    if (this.menuCarte?.menu !== menu) return
    const page = this.menuCarte.page
    this.menuCarte = null
    const a = document.activeElement
    const perdu = !a || a === document.body || this.menuEl.contains(a) || !!(a as HTMLElement).closest?.('.carte-options')
    if (perdu && this.ouvert && this.cartes.has(page)) this.focusCarte(page, { defiler: false })
  }

  // ---------- Renommer ----------
  /** F2, « Renommer… », un double-clic sur le nom : un champ dans la carte,
   *  prérempli, tout choisi. Entrée ou quitter le champ garde le nom, Échap
   *  le laisse tel qu'il était ; un nom vide le retire. Au doigt, le clavier
   *  virtuel paraît et la carte reste visible au-dessus de lui. */
  private renommer(page: string) {
    const c = this.cartes.get(page)
    if (!c || this.glisse) return
    if (this.saisie?.page === page) { this.saisie.input.focus(); return }
    this.finirSaisie(true)
    this.focusCarte(page)
    const input = document.createElement('input')
    input.type = 'text'; input.className = 'carte-saisie'; input.maxLength = 60
    input.placeholder = 'Nom de la page (facultatif)'
    input.setAttribute('aria-label', `Nom de la page ${this.ordre.indexOf(page) + 1}`)
    input.autocomplete = 'off'; input.enterKeyHint = 'done'
    input.value = this.app.tableau.nomDe(page) ?? ''
    const s: Saisie = { page, input }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); this.finirSaisie(true, true) }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.finirSaisie(false, true) }
    })
    input.addEventListener('blur', () => { if (this.saisie === s) this.finirSaisie(true) })
    c.querySelector<HTMLElement>('.carte-nom')!.hidden = true
    c.classList.add('en-saisie')
    c.appendChild(input)
    this.saisie = s
    input.focus({ preventScroll: true })
    input.select()
    this.montrer(c)
  }

  /** Le champ du nom se ferme : garder (Entrée, le focus parti ailleurs, la
   *  trieuse qui se ferme) ou non (Échap) ; rendreFocus : le focus revient à
   *  la carte (au clavier). Le nom gardé passe par le journal, avec un
   *  message et son « Annuler ». */
  private finirSaisie(garder: boolean, rendreFocus = false) {
    const s = this.saisie
    if (!s) return
    this.saisie = null
    const texte = s.input.value
    const c = this.cartes.get(s.page)
    s.input.remove()
    if (c) { c.querySelector<HTMLElement>('.carte-nom')!.hidden = false; c.classList.remove('en-saisie') }
    if (rendreFocus && c) this.focusCarte(s.page, { defiler: false })
    if (!garder) return
    const r = actions.renommer(this.app.tableau, this.journal, s.page, texte)
    if (r) this.annoncer(r.nom ? 'Page renommée' : 'Nom de la page retiré', r.entree)
  }

  // ---------- Insérer, ajouter, changer le fond ----------
  /** Une page vide juste avant ou juste après, au fond choisi au second
   *  temps du menu (celui de cette page, par défaut) */
  private inserer(page: string, cote: 'avant' | 'apres', fond: Fond) {
    const r = actions.inserer(this.app.tableau, this.journal, page, cote, fond)
    if (!r) return
    this.focusCarte(r.page)
    this.annoncer(`Page vide insérée : c'est la page ${r.rang + 1}`, r.entree)
  }

  /** « Ajouter une page » du bandeau : une page vide à la fin, au fond de la dernière */
  private ajouterALaFin() {
    const r = actions.ajouterALaFin(this.app.tableau, this.journal)
    if (!r) return
    this.focusCarte(r.page)
    this.annoncer(`Page ajoutée à la fin (page ${r.rang + 1})`, r.entree)
  }

  /** Un fond du menu : le repère prend son origine au centre de ce qui est
   *  écrit sur la page ; la vignette se repeint (la page a changé) */
  private changerFond(page: string, fond: Fond) {
    const t = this.app.tableau
    const boite = fond === 'repere' ? this.hote.apercus.boite(t.formesDe(page)?.values() ?? []) : null
    const e = actions.changerFond(t, this.journal, page, fond, boite)
    if (e) this.annoncer(`Fond changé (page ${this.ordre.indexOf(page) + 1})`, e)
  }

  // ---------- Dupliquer, supprimer ----------
  /** Duplique ces pages avec leur histoire, chacune juste après elle-même
   *  (sans marque d'annulation : le journal les annule) ; chaque copie
   *  s'ouvrira sur la vue gardée de son original. La première copie prend
   *  le focus. */
  private dupliquer(ids: string[]) {
    if (!ids.length || this.glisse) return
    const r = actions.dupliquer(this.app.tableau, this.journal, ids)
    if (!r) return
    for (const { de, copie } of r.copies) this.app.copierVue(de, copie)
    const premiere = r.copies[0]
    this.focusCarte(premiere.copie)
    const pages = this.app.pages
    this.annoncer(r.copies.length > 1 ? `${r.copies.length} pages dupliquées`
      : `Page ${pages.indexOf(premiere.de) + 1} dupliquée : la copie est la page ${pages.indexOf(premiere.copie) + 1}`, r.entree)
  }

  /** Supprime ces pages (vers la corbeille). Jamais toutes. Si celle qu'on
   *  regarde en est, on va d'abord sur une page qui reste (voir
   *  actions.pageDArrivee ; sans annonce, le tableau est caché) : après la
   *  fermeture, Ctrl+Z l'y rend, comme après la poubelle de la barre du
   *  haut. Le focus va à la carte qui prend leur place. */
  private supprimer(ids: string[]) {
    if (!ids.length || this.glisse) return
    const ordre = this.app.pages
    const liste = ordre.filter(id => ids.includes(id))
    if (liste.length >= ordre.length) return this.hote.message('Il doit rester au moins une page.')
    const regardee = this.app.page
    // La carte qui prendra le focus : la première qui reste après la première supprimée, sinon avant
    const premiere = ordre.indexOf(liste[0])
    const suivante = ordre.slice(premiere).find(id => !liste.includes(id)) ?? [...ordre.slice(0, premiere)].reverse().find(id => !liste.includes(id))
    const r = actions.supprimer(this.app.tableau, this.journal, liste, { regardee, aller: p => this.app.allerPage(p) })
    if (r === 'tout') return this.hote.message('Il doit rester au moins une page.')
    if (!r) return
    if (r.arrivee !== regardee) this.retours.set(r.entree, { regardee, arrivee: r.arrivee })
    // La page actuelle a pu changer : la carte encadrée suit
    this.refaire()
    if (suivante) this.focusCarte(suivante)
    const n = r.retirees.length
    this.annoncer(n > 1 ? `${n} pages supprimées` : `Page ${r.numeros[0]}${r.vides.length ? ' (vide)' : ''} supprimée`, r.entree)
  }

  // ---------- Ranger, annuler ----------
  /** Un message qui dit l'action faite, avec son « Annuler » (au-dessus de
   *  la trieuse ; il s'en va à la fermeture) */
  private annoncer(texte: string, e: Entree) {
    this.hote.message(texte, { libelle: 'Annuler', faire: () => this.annulerDepuisMessage(e), cle: CLE })
  }

  /** Déplace des pages (journal, message « Annuler ») : elles vont, dans
   *  leur ordre, juste avant la page qui est à l'indice `avant` (voir
   *  Tableau.deplacerPages). Rien si l'ordre ne change pas. */
  private deplacer(ids: string[], avant: number) {
    const libelle = ids.length > 1 ? `${ids.length} pages déplacées` : 'page déplacée'
    const e = this.journal.faire(libelle, () => { this.app.tableau.deplacerPages(ids, avant) })
    if (!e) return
    this.focusCarte(this.focusId && ids.includes(this.focusId) ? this.focusId : ids[0])
    const k = this.app.pages.indexOf(ids[0])
    this.annoncer(ids.length > 1 ? `${ids.length} pages déplacées` : `Page déplacée : c'est maintenant la page ${k + 1}`, e)
  }

  /** Ctrl + Maj + ← / → : la page qui a le focus, ou toutes les pages
   *  choisies si elle en est (regroupées, dans leur ordre) */
  private deplacerDUnePlace(id: string, sens: 1 | -1) {
    const ids = this.selection.has(id) ? this.choisies() : [id]
    const avant = actions.placeDUnPas(this.app.pages, ids, sens)
    if (avant === null) return
    if (avant === 'debut') return this.hote.message(ids.length > 1 ? 'Elles sont déjà en tête.' : 'C\'est déjà la première page.')
    if (avant === 'fin') return this.hote.message(ids.length > 1 ? 'Elles sont déjà à la fin.' : 'C\'est déjà la dernière page.')
    this.deplacer(ids, avant)
  }

  private annuler() {
    const e = this.journal.aAnnuler
    const r = this.journal.annuler()
    if (r === 'rien') return this.hote.message('Rien à annuler dans les pages')
    if (r === 'change') return this.hote.message('Les pages ont changé depuis : rien à annuler.')
    this.apresDefaire(e, 'annuler')
    this.hote.oublierAction(CLE)
    this.hote.message(`Annulé : ${e?.libelle ?? 'page déplacée'}`)
  }

  private retablir() {
    const e = this.journal.aRetablir
    const r = this.journal.retablir()
    if (r === 'rien') return this.hote.message('Rien à rétablir dans les pages')
    if (r === 'change') return this.hote.message('Les pages ont changé depuis : rien à rétablir.')
    this.apresDefaire(e, 'retablir')
    this.hote.oublierAction(CLE)
    this.hote.message(`Rétabli : ${e?.libelle ?? 'page déplacée'}`)
  }

  /** « Annuler » du message d'une action : seulement si elle est encore la
   *  dernière et que les pages sont telles qu'elle les a laissées */
  private annulerDepuisMessage(e: Entree) {
    if (!this.ouvert) return
    if (this.journal.annulerSi(e) === 'fait') { this.apresDefaire(e, 'annuler'); this.hote.message(`Annulé : ${e.libelle}`) }
    else this.hote.message('Les pages ont changé depuis : rien à annuler.')
  }

  /** Une suppression qui avait mené ailleurs vient d'être annulée : on
   *  revient sur la page qu'on regardait ; rétablie : on retourne sur la
   *  page d'arrivée (le tableau, lui, était allé sur la première). La
   *  carte encadrée suit. */
  private apresDefaire(e: Entree | null, sens: 'annuler' | 'retablir') {
    const r = e ? this.retours.get(e) : undefined
    if (!r) return
    const vers = sens === 'annuler' ? r.regardee : r.arrivee
    if (this.app.page !== vers && this.app.pages.includes(vers)) { this.app.allerPage(vers); this.refaire() }
  }

  // ---------- Pointeurs : aller, choisir, ouvrir le menu, glisser ----------
  /** Les pages qu'on tire en partant de cette carte : toutes les pages
   *  choisies (dans leur ordre) si elle en est, sinon elle seule */
  private idsATirer(page: string): string[] {
    return this.selection.has(page) && this.selection.size > 1 ? this.choisies() : [page]
  }

  /** À la souris et à la tablette graphique (un stylet sans écran tactile :
   *  la Wacom de la classe), le glisser part de n'importe où sur la carte,
   *  dès 4 px (6 au stylet), sans appui long. Au doigt et au stylet posé
   *  sur l'écran, seulement par la poignée (dès 8 px) ou après un appui long
   *  (500 ms sans bouger de plus de 8 px) : sinon le doigt fait défiler la
   *  grille (touch-action: pan-y) ; l'appui long n'ouvre jamais le menu.
   *  Parti du vide de la grille, un glisser ne fait rien à la souris et à
   *  la tablette, et fait défiler au doigt. Un clic, un toucher bref mènent
   *  à la page (Maj ou Ctrl, « Choisir plusieurs » : la choisissent) ; le
   *  lever qui suit un glisser, non. Le clic droit, le bouton du stylet, Ctrl
   *  + clic sur Mac ouvrent le menu de la page, à l'appui. */
  private brancherPointeurs() {
    const g = this.grille
    g.addEventListener('pointerdown', e => this.surBas(e))
    g.addEventListener('pointermove', e => this.surBouge(e))
    g.addEventListener('pointerup', e => this.surLeve(e, false))
    g.addEventListener('pointercancel', e => this.surLeve(e, true))
    // La grille perd le pointeur qu'elle tenait (pas la carte qui le lui
    // passe au début d'un glisser au doigt) : le glisser s'arrête, rien ne bouge
    g.addEventListener('lostpointercapture', e => { if (e.target === g && this.glisse?.id === e.pointerId) this.annulerGlisser() })
    // Une page tirée au doigt : la grille ne défile plus sous lui (son
    // touch-action, pan-y, le laisserait faire) ; elle défile seule près du bord
    g.addEventListener('touchmove', e => { if (this.glisse || (this.appui?.arme && this.appui.direct)) e.preventDefault() }, { passive: false })
    // L'aide suit le pointeur, où qu'il appuie dans la trieuse
    this.el.addEventListener('pointerdown', e => this.majAide(typePointeur(e.pointerType)), true)
    g.addEventListener('dragstart', e => e.preventDefault())
  }

  private surBas(e: PointerEvent) {
    const cible = e.target as HTMLElement
    // Le champ du nom a ses propres événements (et son menu du navigateur)
    if (cible.closest('.carte-saisie')) return
    if (this.appui || this.glisse) return              // un second doigt : rien
    const carte = cible.closest<HTMLElement>('.carte')
    const page = carte?.dataset.page
    if (!carte || !page || !this.grille.contains(carte)) return
    // Le clic droit (le bouton du stylet en est un ; sur Mac, Ctrl + clic) :
    // le menu de la page, à l'APPUI du bouton, comme au tableau, n'importe
    // où sur la carte (son bouton ⋯ compris). Le focus va d'abord à la carte
    // (l'appui le lui donnerait ensuite, et fermerait le menu).
    const droit = e.button === 2 || (MAC && e.ctrlKey && e.button === 0 && e.pointerType !== 'touch')
    if (droit) {
      this.annulerClicNom()
      this.focusCarte(page, { defiler: false })
      this.ouvrirMenuCarte(page, { x: e.clientX, y: e.clientY })
      return
    }
    // Le bouton ⋯ a son propre clic
    if (cible.closest('.carte-options')) return
    if (e.button !== 0) return
    // L'appui qui vient de fermer un menu ne fait rien d'autre
    if (avale(e)) return
    const type = typePointeur(e.pointerType)
    const direct = type === 'touch' || (type === 'pen' && ecranTactile())
    const poignee = !!cible.closest('.carte-poignee')
    // Parti du nom : un double-clic le renomme (voir clic)
    const nom = !!cible.closest('.carte-nom')
    this.focusCarte(page, { defiler: false })
    const a: Appui = { id: e.pointerId, type, direct, page, carte, x0: e.clientX, y0: e.clientY, poignee, nom,
      ajoute: e.shiftKey || (MAC ? e.metaKey : e.ctrlKey), arme: !direct || poignee, bouge: false, minuterie: 0 }
    if (!a.arme) a.minuterie = window.setTimeout(() => this.appuiLong(a), APPUI_LONG)
    else try { this.grille.setPointerCapture(e.pointerId) } catch { /* pointeur déjà parti */ }
    this.appui = a
  }

  /** L'appui long du doigt : la page se soulève, prête à suivre le doigt */
  private appuiLong(a: Appui) {
    if (this.appui !== a || a.bouge || this.glisse) return
    a.arme = true
    this.annulerClicNom()
    try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
    this.commencer(a, a.x0, a.y0)
  }

  private surBouge(e: PointerEvent) {
    const g = this.glisse
    if (g) { if (e.pointerId === g.id) { g.x = e.clientX; g.y = e.clientY; this.suivre(g.x, g.y) } return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    const d = Math.hypot(e.clientX - a.x0, e.clientY - a.y0)
    if (!a.arme) {
      // Le doigt part avant l'appui long : il fait défiler, ce n'est plus un toucher
      if (d > SEUIL_GLISSER.touch) { a.bouge = true; clearTimeout(a.minuterie) }
      return
    }
    const seuil = a.direct ? SEUIL_GLISSER.touch : SEUIL_GLISSER[a.type]
    if (d >= seuil) { this.annulerClicNom(); this.commencer(a, e.clientX, e.clientY) }
  }

  private surLeve(e: PointerEvent, annule: boolean) {
    if (this.glisse?.id === e.pointerId) { if (annule) this.annulerGlisser(); else this.lacher(); return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    this.annulerAppui()
    if (annule || a.bouge) return
    this.clic(a, e)
  }

  /** Un clic, un toucher bref sur une carte : Maj ou Ctrl (⌘), ou « Choisir
   *  plusieurs » allumé, la choisissent ou la retirent ; sur le nom, on
   *  attend un instant qu'un second clic en fasse un double-clic (renommer) ;
   *  sinon on va à la page. */
  private clic(a: Appui, e: PointerEvent) {
    if (a.ajoute || this.modeChoix) { this.annulerClicNom(); this.basculerChoix(a.page); return }
    if (a.nom) {
      if (this.clicNom?.page === a.page) { this.annulerClicNom(); this.renommer(a.page); return }
      this.annulerClicNom()
      const page = a.page, x = e.clientX, y = e.clientY
      this.clicNom = { page, minuterie: window.setTimeout(() => {
        this.clicNom = null
        if (!this.ouvert || this.saisie || menuOuvert() || !this.app.pages.includes(page)) return
        this.aller(page)
        avalerLeSecondAppui(x, y)
      }, DOUBLE_CLIC_NOM) }
      return
    }
    this.annulerClicNom()
    this.aller(a.page)
    avalerLeSecondAppui(e.clientX, e.clientY)
  }

  private annulerClicNom() {
    if (!this.clicNom) return
    clearTimeout(this.clicNom.minuterie)
    this.clicNom = null
  }

  private annulerAppui() {
    const a = this.appui
    if (!a) return
    clearTimeout(a.minuterie)
    this.appui = null
  }

  /** La page part : la carte s'estompe (et celles des autres pages tirées),
   *  un fantôme suit le pointeur (le nombre de pages dessus, s'il y en a
   *  plusieurs), une barre bleue marque la place d'arrivée, la grille défile
   *  près du bord */
  private commencer(a: Appui, x: number, y: number) {
    this.annulerAppui()
    if (this.menuCarte) fermerMenu()
    this.finirSaisie(true)
    const carte = a.carte, r = carte.getBoundingClientRect()
    const ids = this.idsATirer(a.page)
    const fantome = carte.cloneNode(true) as HTMLElement
    fantome.className = 'carte trieuse-fantome'
    for (const k of ['role', 'tabindex', 'aria-label', 'aria-selected', 'aria-current', 'data-page']) fantome.removeAttribute(k)
    fantome.querySelector('.carte-options')?.remove()
    fantome.setAttribute('aria-hidden', 'true')
    if (ids.length > 1) fantome.dataset.nombre = String(ids.length)
    fantome.style.width = r.width + 'px'; fantome.style.height = r.height + 'px'
    const source = carte.querySelector('canvas'), copie = fantome.querySelector('canvas')
    if (source && copie) { copie.width = source.width; copie.height = source.height; copie.getContext('2d')?.drawImage(source, 0, 0) }
    const barre = Object.assign(document.createElement('div'), { className: 'trieuse-place' })
    barre.setAttribute('aria-hidden', 'true')
    this.el.append(fantome, barre)
    const tirees = ids.map(id => this.cartes.get(id)).filter((c): c is HTMLElement => !!c)
    for (const c of tirees) c.classList.add('tiree')
    this.el.classList.add('en-glisser')
    const ecart = parseFloat(getComputedStyle(this.grille).columnGap) || 16
    this.glisse = { id: a.id, ids, carte, tirees, fantome, barre, dx: a.x0 - r.left, dy: a.y0 - r.top, x, y, place: this.ordre.indexOf(a.page), reste: 0, ecart }
    try { this.grille.setPointerCapture(a.id) } catch { /* pointeur déjà parti */ }
    this.suivre(x, y)
    cancelAnimationFrame(this.boucle)
    this.boucle = requestAnimationFrame(this.defiler)
  }

  /** Le fantôme suit le pointeur ; la barre marque la place d'arrivée,
   *  dans ce qu'on voit de la grille */
  private suivre(x: number, y: number) {
    const g = this.glisse
    if (!g) return
    g.fantome.style.transform = `translate(${x - g.dx}px, ${y - g.dy}px) rotate(1.5deg)`
    const rects = this.rects()
    g.place = placeDInsertion(rects, x, y)
    const b = barreDInsertion(rects, g.place, y, g.ecart)
    const gr = this.grille.getBoundingClientRect()
    const haut = b ? Math.max(b.y, gr.top) : 0, bas = b ? Math.min(b.y + b.h, gr.bottom) : 0
    g.barre.hidden = !b || bas <= haut
    if (b && bas > haut) {
      g.barre.style.left = (b.x - 2) + 'px'
      g.barre.style.top = haut + 'px'
      g.barre.style.height = (bas - haut) + 'px'
    }
  }

  /** Une image : près du bord haut ou bas, la grille défile seule (voir
   *  vitesseDefilement), et la place d'arrivée suit */
  private defiler = () => {
    const g = this.glisse
    if (!g) return
    const gr = this.grille.getBoundingClientRect()
    g.reste += vitesseDefilement(g.y, gr.top, gr.bottom)
    const pas = Math.trunc(g.reste)
    if (pas) {
      g.reste -= pas
      const avant = this.grille.scrollTop
      this.grille.scrollTop = avant + pas
      if (this.grille.scrollTop !== avant) this.suivre(g.x, g.y)
      else g.reste = 0
    }
    this.boucle = requestAnimationFrame(this.defiler)
  }

  /** Le glisser s'arrête : le fantôme et la barre s'en vont, les cartes reviennent */
  private finirGlisser(): Glisse | null {
    const g = this.glisse
    if (!g) return null
    this.glisse = null
    cancelAnimationFrame(this.boucle); this.boucle = 0
    g.fantome.remove(); g.barre.remove()
    for (const c of g.tirees) c.classList.remove('tiree')
    this.el.classList.remove('en-glisser')
    try { if (this.grille.hasPointerCapture(g.id)) this.grille.releasePointerCapture(g.id) } catch { /* déjà relâché */ }
    return g
  }

  /** Échap, pointercancel : rien ne bouge */
  private annulerGlisser() { this.finirGlisser() }

  /** Le lâcher : les pages vont à leur place d'arrivée (journal, message « Annuler ») */
  private lacher() {
    const g = this.finirGlisser()
    if (!g) return
    if (!(this.app.tableau.pages.get(g.ids[0]) instanceof Y.Map)) return
    this.deplacer(g.ids, g.place)
  }
}

/** Ce qui suit le clic ou le toucher qui a fermé la trieuse et mené à une
 *  page : la vignette n'est plus là, et ce qui vient ensuite tomberait sur
 *  le bouton du tableau qui était dessous (un outil, une couleur, la Gomme,
 *  le menu du rôle du doigt…) ou sur la page (un point d'encre au Stylo, le
 *  menu d'un objet au double-clic). Deux cas : le clic de compatibilité du
 *  toucher (mousedown, mouseup, click, que le navigateur envoie APRÈS le
 *  pointerup, en visant ce qui est maintenant sous le doigt) ; et le second
 *  clic d'un double-clic par habitude, à la souris, à la plume de la
 *  tablette graphique ou au doigt (un preventDefault sur son pointerdown
 *  supprime mousedown et mouseup, pas le click). Dans la demi-seconde qui
 *  suit (le lever et le click d'un second appui, 300 ms de plus), à moins
 *  de 40 px du premier, ils ne font rien. Un appui ailleurs passe. */
export function avalerLeSecondAppui(x: number, y: number, ms = 500) {
  const fin = performance.now() + ms
  const pres = (e: MouseEvent) => Math.hypot(e.clientX - x, e.clientY - y) <= 40
  // L'appui (pointerdown, et le mousedown du toucher) : dans la demi-seconde
  const surBas = (e: MouseEvent) => {
    if (performance.now() > fin) return
    if (!pres(e)) return
    e.preventDefault(); e.stopPropagation()
  }
  // Le lever et le clic qui en naissent : un peu plus longtemps
  const surSuite = (e: MouseEvent) => {
    if (performance.now() > fin + 300) return finir()
    if (!pres(e)) return
    e.preventDefault(); e.stopPropagation()
  }
  const surDouble = (e: MouseEvent) => {
    if (performance.now() > fin + 300) return finir()
    e.preventDefault(); e.stopPropagation()
  }
  const ecoutes: [string, (e: MouseEvent) => void][] = [
    ['pointerdown', surBas], ['mousedown', surBas], ['mouseup', surSuite], ['click', surSuite], ['dblclick', surDouble],
  ]
  function finir() { for (const [t, f] of ecoutes) window.removeEventListener(t, f as EventListener, true) }
  for (const [t, f] of ecoutes) window.addEventListener(t, f as EventListener, true)
  window.setTimeout(finir, ms + 300)
}
