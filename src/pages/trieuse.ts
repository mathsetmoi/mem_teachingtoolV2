// =============================================================
// LA TRIEUSE DES PAGES
// Toutes les pages en vignettes, plein écran : on y va à une page (un clic,
// un toucher, Entrée, son numéro tapé au clavier) et on les range (les
// glisser à la souris, à la tablette graphique ou au doigt ; Ctrl + Maj +
// flèches au clavier). Ce qu'on y fait s'annule (Ctrl+Z dans la trieuse,
// « Annuler » du message) par son propre journal (voir journal.ts) : aucune
// pile d'annulation de page n'est touchée.
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
// Les morceaux suivants y ajoutent leurs boutons (le conteneur `actions`
// du bandeau) : plusieurs pages à la fois, renommer, insérer, dupliquer,
// supprimer, la corbeille, l'image copiée, le PDF.
// =============================================================
import * as Y from 'yjs'
import type { App } from '../app'
import { JournalPages } from './journal'
import type { Entree } from './journal'
import type { Vignettes } from './vignettes'
import { barreDInsertion, lignesDe, placeDInsertion, vitesseDefilement } from './glisser'
import type { Rect } from './glisser'
import { APPUI_LONG, SEUIL_GLISSER, ecranTactile, typePointeur } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import { menuOuvert } from '../menus'
import { toucheMarquePage } from '../navigateur'
import { pagesLisibles } from '../fichier'
import { icone } from '../icones'

/** Ce que la trieuse demande à l'interface */
export interface HoteTrieuse {
  /** Un message en bas de l'écran, au-dessus de la trieuse ; cle 'trieuse'
   *  pour ses « Annuler » (ils s'en vont à la fermeture) */
  message(texte: string, action?: { libelle: string; faire: () => void; cle?: string }): void
  oublierAction(cle?: string): void
  /** Ce qu'on voit du tableau entre les barres : le rapport des vignettes */
  zoneLibre(): { l: number; h: number }
  maj(): void
}

/** La clé des messages de la trieuse (voir HoteTrieuse.message) */
const CLE = 'trieuse'
/** Deux chiffres tapés à moins de ce temps (ms) font un seul numéro (« 1 », « 2 » : la page 12) */
const ENTRE_CHIFFRES = 800

const AIDE_SOURIS = 'Cliquer sur une page pour y aller · la glisser pour la déplacer · taper son numéro · Échap : fermer'
const AIDE_DOIGT = 'Toucher une page pour y aller · la déplacer par ⋮⋮ ou par un appui long · × : fermer'

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
  /** Il peut tirer la page dès qu'il passe son seuil (souris, tablette
   *  graphique, poignée) */
  arme: boolean
  /** Il a bougé avant l'appui long (le doigt fait défiler) : ce n'est plus un toucher */
  bouge: boolean
  minuterie: number
}

/** Une page qu'on tire */
interface Glisse {
  id: number
  ids: string[]
  carte: HTMLElement
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

export class Trieuse {
  readonly el: HTMLElement
  /** Le bandeau garde ici les boutons des morceaux suivants (plusieurs
   *  pages, la corbeille, le PDF) : il passe à la ligne sur un téléphone */
  readonly actions: HTMLElement
  readonly journal: JournalPages
  /** Les pages choisies (Maj + clic, au morceau suivant) : vide ici */
  readonly selection = new Set<string>()
  private grille: HTMLElement
  private compte: HTMLElement
  private aide: HTMLElement
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

  constructor(private app: App, private racine: HTMLElement, private hote: HoteTrieuse, private vignettes: Vignettes) {
    const el = this.el = document.createElement('section')
    el.className = 'trieuse'
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Pages')
    el.hidden = true
    const tete = document.createElement('div'); tete.className = 'trieuse-tete'
    const titre = Object.assign(document.createElement('h2'), { textContent: 'Pages' })
    this.compte = Object.assign(document.createElement('span'), { className: 'trieuse-compte' })
    this.actions = Object.assign(document.createElement('div'), { className: 'trieuse-actions' })
    const fermer = document.createElement('button')
    fermer.type = 'button'; fermer.className = 'bouton trieuse-fermer'; fermer.innerHTML = icone('fermer')
    fermer.title = 'Fermer les pages (Échap)'; fermer.setAttribute('aria-label', 'Fermer les pages')
    fermer.addEventListener('click', () => this.fermer())
    tete.append(titre, this.compte, this.actions, fermer)
    this.grille = document.createElement('div'); this.grille.className = 'trieuse-grille'
    this.grille.setAttribute('role', 'listbox'); this.grille.setAttribute('aria-label', 'Les pages, dans l\'ordre')
    this.grille.setAttribute('aria-multiselectable', 'true')
    this.aide = Object.assign(document.createElement('p'), { className: 'trieuse-aide' })
    el.append(tete, this.grille, this.aide)
    racine.appendChild(el)
    this.journal = new JournalPages(app.tableau)
    this.brancherPointeurs()
    // Ni le menu du navigateur (« Enregistrer l'image » d'un canevas), ni
    // celui qu'ouvre l'appui long sur Android
    el.addEventListener('contextmenu', e => e.preventDefault())
    document.addEventListener('pointerdown', e => { this.dernierPointeur = typePointeur(e.pointerType) }, true)
  }

  get ouvert() { return !this.el.hidden }

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
    this.majAide(this.dernierPointeur ?? this.app.dernierPointeur)
    this.chiffres = { texte: '', t: -Infinity }
    this.el.hidden = false
    this.peinteAvant = this.vignettes.onPeinte
    this.vignettes.onPeinte = (page, c) => { this.peinte(page, c); this.peinteAvant?.(page, c) }
    this.focusId = this.app.page
    this.io = new IntersectionObserver(evts => this.surVisibles(evts), { root: this.grille, rootMargin: '120px 0px' })
    this.refaire()
    this.majTailles()
    this.ro = new ResizeObserver(() => {
      cancelAnimationFrame(this.remiseATaille)
      this.remiseATaille = requestAnimationFrame(() => this.majTailles())
    })
    this.ro.observe(this.grille)
    window.addEventListener('keydown', this.surTouche, true)
    this.app.tableau.ordre.observe(this.surChangement)
    this.app.tableau.noms.observe(this.surChangement)
    // La page qu'on regarde, au milieu, avec le focus
    const c = this.focusId ? this.cartes.get(this.focusId) : null
    if (c) {
      const g = this.grille, r = c.getBoundingClientRect(), gr = g.getBoundingClientRect()
      g.scrollTop += (r.top + r.height / 2) - (gr.top + gr.height / 2)
      c.focus({ preventScroll: true })
    }
  }

  /** Échap, ×, Maj + P, ou aller à une page (page). Le journal se vide et
   *  le dernier « Annuler » de la trieuse s'en va : depuis le tableau, on
   *  n'annule pas un changement qu'on ne voit plus (la corbeille reste le
   *  filet). Les canevas quittent le document : ils ne se repeignent plus. */
  fermer(o: { page?: string } = {}) {
    if (!this.ouvert) return
    this.annulerGlisser()
    this.annulerAppui()
    window.removeEventListener('keydown', this.surTouche, true)
    this.app.tableau.ordre.unobserve(this.surChangement)
    this.app.tableau.noms.unobserve(this.surChangement)
    this.io?.disconnect(); this.io = null
    this.ro?.disconnect(); this.ro = null
    cancelAnimationFrame(this.remiseATaille)
    this.vignettes.onPeinte = this.peinteAvant; this.peinteAvant = null
    this.vignettes.prioriser([])
    this.journal.vider()
    this.hote.oublierAction(CLE)
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
  /** L'ordre ou les noms ont changé (un déplacement, une annulation, un
   *  autre onglet) : la grille se refait, le focus et le défilement restent */
  private surChangement = () => { if (this.ouvert) this.refaire() }

  /** Met la grille à jour : une carte par page, dans l'ordre (les cartes
   *  existantes sont gardées, seules celles qui ne sont pas à leur place
   *  bougent), leurs numéros, leurs noms, la page actuelle */
  private refaire() {
    const g = this.grille, pages = this.app.pages
    const actif = document.activeElement
    const avaitFocus = !!actif && g.contains(actif)
    const defilement = g.scrollTop
    const vues = new Set(pages)
    for (const [id, c] of this.cartes) {
      if (vues.has(id)) continue
      this.io?.unobserve(c); c.remove(); this.cartes.delete(id); this.visibles.delete(id); this.selection.delete(id)
    }
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
    // Déplacer une carte dans le document lui ôte le focus : il revient
    g.scrollTop = defilement
    if (avaitFocus && this.focusId && document.activeElement !== this.cartes.get(this.focusId)) this.cartes.get(this.focusId)?.focus({ preventScroll: true })
    if (this.glisse) this.suivre(this.glisse.x, this.glisse.y)
  }

  private creerCarte(id: string): HTMLElement {
    const c = document.createElement('div')
    c.className = 'carte'; c.setAttribute('role', 'option'); c.dataset.page = id; c.tabIndex = -1
    const image = Object.assign(document.createElement('div'), { className: 'carte-image' })
    const numero = Object.assign(document.createElement('span'), { className: 'carte-numero' })
    const vide = Object.assign(document.createElement('span'), { className: 'carte-vide', textContent: 'Page vide', hidden: true })
    const poignee = Object.assign(document.createElement('span'), { className: 'carte-poignee', textContent: '⋮⋮' })
    for (const x of [numero, vide, poignee]) x.setAttribute('aria-hidden', 'true')
    image.append(numero, vide, poignee)
    const nom = Object.assign(document.createElement('div'), { className: 'carte-nom' })
    nom.setAttribute('aria-hidden', 'true')
    c.append(image, nom)
    if (this.taille.l) this.poserVignette(c, id)
    this.io?.observe(c)
    return c
  }

  /** Le numéro, le nom, la page actuelle, le focus d'une carte */
  private majCarte(c: HTMLElement, id: string, i: number) {
    const nom = this.app.tableau.nomDe(id), actuelle = id === this.app.page
    const numero = String(i + 1)
    const n = c.querySelector('.carte-numero')!
    if (n.textContent !== numero) n.textContent = numero
    const nc = c.querySelector('.carte-nom')!, texte = nom ?? ''
    if (nc.textContent !== texte) { nc.textContent = texte; (nc as HTMLElement).title = texte }
    const label = `Page ${i + 1}${nom ? `, ${nom}` : ''}${actuelle ? ', page actuelle' : ''}`
    if (c.getAttribute('aria-label') !== label) c.setAttribute('aria-label', label)
    c.classList.toggle('actuelle', actuelle)
    if (actuelle) c.setAttribute('aria-current', 'page'); else c.removeAttribute('aria-current')
    c.setAttribute('aria-selected', String(this.selection.has(id)))
    const t = id === this.focusId ? 0 : -1
    if (c.tabIndex !== t) c.tabIndex = t
    this.majVide(c, id)
  }

  /** « Page vide » sur la vignette d'une page sans rien */
  private majVide(c: HTMLElement, id: string) {
    const v = c.querySelector<HTMLElement>('.carte-vide')!, vide = this.vignettes.vide(id)
    if (v.hidden === vide) v.hidden = !vide
  }

  /** La taille des vignettes : la largeur d'une colonne, au rapport de ce
   *  qu'on voit du tableau entre les barres (de 4:3 à 16:9). Quand elle
   *  change (la fenêtre, l'écran qu'on tourne), chaque carte reçoit le
   *  canevas de la nouvelle taille. */
  private majTailles() {
    if (!this.ouvert) return
    const z = this.hote.zoneLibre()
    const rapport = z.l > 0 && z.h > 0 ? Math.min(16 / 9, Math.max(4 / 3, z.l / z.h)) : 16 / 10
    this.grille.style.setProperty('--rapport', rapport.toFixed(4))
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
    this.vignettes.prioriser(this.ordre.filter(id => this.visibles.has(id)))
  }

  /** La ligne d'aide, selon le dernier pointeur : la souris et la tablette
   *  graphique cliquent et glissent ; le doigt et le stylet sur l'écran
   *  touchent, et tirent par la poignée ou un appui long */
  private majAide(type: TypePointeur) {
    const doigt = type === 'touch' || (type === 'pen' && ecranTactile())
    const t = doigt ? AIDE_DOIGT : AIDE_SOURIS
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

  /** Défile la grille juste assez pour que la carte s'y voie entière */
  private montrer(c: HTMLElement) {
    const g = this.grille, r = c.getBoundingClientRect(), gr = g.getBoundingClientRect(), marge = 12
    if (r.top < gr.top + marge) g.scrollTop -= gr.top + marge - r.top
    else if (r.bottom > gr.bottom - marge) g.scrollTop += Math.min(r.bottom - (gr.bottom - marge), r.top - (gr.top + marge))
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

  // ---------- Le clavier ----------
  /** Sur window, en capture, posé à l'ouverture : il passe après ceux des
   *  menus (posés au démarrage) et avant le clavier du tableau, qu'il
   *  arrête pour ce qu'il traite (ce qu'il ne traite pas passe : Ctrl + S
   *  enregistre toujours ; le tableau caché se tait de lui-même). */
  private surTouche = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement
    // Une fenêtre par-dessus garde son clavier, Échap compris
    if (cible.closest?.('dialog')) return
    // Un menu ouvert (celui d'une vignette) : menus.ts traite Échap, les
    // flèches et Tab ; sinon ↑ ↓ changeraient de carte derrière lui
    if (menuOuvert() || cible.closest?.('.menu-flottant')) return
    // Un champ (le nom d'une page) garde ses touches ; Ctrl + D n'y ouvre
    // pas le marque-page du navigateur
    if (cible.closest?.('input, textarea, select, [contenteditable]')) { if (toucheMarquePage(e)) e.preventDefault(); return }
    const fait = () => { e.preventDefault(); e.stopPropagation() }
    const raccourci = (e.ctrlKey || e.metaKey) && !e.altKey
    const lettre = e.key.toLowerCase()
    if (e.key === 'Escape') {
      fait()
      if (this.glisse) { this.annulerGlisser(); return }
      this.annulerAppui()
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
    // Ctrl + Maj + ← / → (⌘ + Maj sur Mac) : la page qui a le focus avance ou recule d'une place
    if (raccourci && e.shiftKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      fait()
      if (this.focusId) this.deplacerDUnePlace(this.focusId, e.key === 'ArrowLeft' ? -1 : 1)
      return
    }
    // Ctrl + D : jamais le marque-page du navigateur (dupliquer, au morceau suivant)
    if (toucheMarquePage(e)) { fait(); return }
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
      // Espace : choisir une page, au morceau suivant ; il ne fait pas défiler la grille
      case ' ': fait(); return
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

  // ---------- Ranger, annuler ----------
  /** Déplace des pages (journal, message « Annuler ») : elles vont, dans
   *  leur ordre, juste avant la page qui est à l'indice `avant` (voir
   *  Tableau.deplacerPages). Rien si l'ordre ne change pas. */
  private deplacer(ids: string[], avant: number) {
    const libelle = ids.length > 1 ? `${ids.length} pages déplacées` : 'page déplacée'
    const e = this.journal.faire(libelle, () => { this.app.tableau.deplacerPages(ids, avant) })
    if (!e) return
    this.focusCarte(ids[0])
    const k = this.app.pages.indexOf(ids[0])
    this.hote.message(ids.length > 1 ? `${ids.length} pages déplacées` : `Page déplacée : c'est maintenant la page ${k + 1}`,
      { libelle: 'Annuler', faire: () => this.annulerDepuisMessage(e), cle: CLE })
  }

  private deplacerDUnePlace(id: string, sens: 1 | -1) {
    const i = this.app.pages.indexOf(id), n = this.app.pages.length
    if (i < 0) return
    if (i + sens < 0 || i + sens >= n) return this.hote.message(sens < 0 ? 'C\'est déjà la première page.' : 'C\'est déjà la dernière page.')
    this.deplacer([id], sens < 0 ? i - 1 : i + 2)
  }

  private annuler() {
    const e = this.journal.aAnnuler
    const r = this.journal.annuler()
    if (r === 'rien') return this.hote.message('Rien à annuler dans les pages')
    if (r === 'change') return this.hote.message('Les pages ont changé depuis : rien à annuler.')
    this.hote.oublierAction(CLE)
    this.hote.message(`Annulé : ${e?.libelle ?? 'page déplacée'}`)
  }

  private retablir() {
    const e = this.journal.aRetablir
    const r = this.journal.retablir()
    if (r === 'rien') return this.hote.message('Rien à rétablir dans les pages')
    if (r === 'change') return this.hote.message('Les pages ont changé depuis : rien à rétablir.')
    this.hote.oublierAction(CLE)
    this.hote.message(`Rétabli : ${e?.libelle ?? 'page déplacée'}`)
  }

  /** « Annuler » du message d'une action : seulement si elle est encore la
   *  dernière et que les pages sont telles qu'elle les a laissées */
  private annulerDepuisMessage(e: Entree) {
    if (!this.ouvert) return
    if (this.journal.annulerSi(e) === 'fait') this.hote.message(`Annulé : ${e.libelle}`)
    else this.hote.message('Les pages ont changé depuis : rien à annuler.')
  }

  // ---------- Glisser-déposer ----------
  /** Les pages qu'on tire en partant de cette carte : elle seule ici (la
   *  sélection, au morceau suivant) */
  private idsATirer(page: string): string[] { return [page] }

  /** À la souris et à la tablette graphique (un stylet sans écran tactile :
   *  la Wacom de la classe), le glisser part de n'importe où sur la carte,
   *  dès 4 px (6 au stylet), sans appui long. Au doigt et au stylet posé
   *  sur l'écran, seulement par la poignée (dès 8 px) ou après un appui long
   *  (500 ms sans bouger de plus de 8 px) : sinon le doigt fait défiler la
   *  grille (touch-action: pan-y). Parti du vide de la grille, un glisser ne
   *  fait rien à la souris et à la tablette (pas de cadre : Maj + clic, au
   *  morceau suivant), et fait défiler au doigt. Un clic, un toucher bref
   *  mènent à la page ; le lever qui suit un glisser, non. */
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
    if (this.appui || this.glisse) return              // un second doigt : rien
    if (e.button !== 0) return                         // le clic droit, le bouton du stylet
    const cible = e.target as HTMLElement
    const carte = cible.closest<HTMLElement>('.carte')
    const page = carte?.dataset.page
    if (!carte || !page || !this.grille.contains(carte)) return
    const type = typePointeur(e.pointerType)
    const direct = type === 'touch' || (type === 'pen' && ecranTactile())
    const poignee = !!cible.closest('.carte-poignee')
    this.focusCarte(page, { defiler: false })
    const a: Appui = { id: e.pointerId, type, direct, page, carte, x0: e.clientX, y0: e.clientY, poignee, arme: !direct || poignee, bouge: false, minuterie: 0 }
    if (!a.arme) a.minuterie = window.setTimeout(() => this.appuiLong(a), APPUI_LONG)
    else try { this.grille.setPointerCapture(e.pointerId) } catch { /* pointeur déjà parti */ }
    this.appui = a
  }

  /** L'appui long du doigt : la page se soulève, prête à suivre le doigt */
  private appuiLong(a: Appui) {
    if (this.appui !== a || a.bouge || this.glisse) return
    a.arme = true
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
    if (d >= seuil) this.commencer(a, e.clientX, e.clientY)
  }

  private surLeve(e: PointerEvent, annule: boolean) {
    if (this.glisse?.id === e.pointerId) { if (annule) this.annulerGlisser(); else this.lacher(); return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    this.annulerAppui()
    if (annule || a.bouge) return
    this.aller(a.page)
    avalerLeSecondAppui(e.clientX, e.clientY)
  }

  private annulerAppui() {
    const a = this.appui
    if (!a) return
    clearTimeout(a.minuterie)
    this.appui = null
  }

  /** La page part : la carte s'estompe, un fantôme suit le pointeur, une
   *  barre bleue marque la place d'arrivée, la grille défile près du bord */
  private commencer(a: Appui, x: number, y: number) {
    this.annulerAppui()
    const carte = a.carte, r = carte.getBoundingClientRect()
    const fantome = carte.cloneNode(true) as HTMLElement
    fantome.className = 'carte trieuse-fantome'
    for (const k of ['role', 'tabindex', 'aria-label', 'aria-selected', 'aria-current', 'data-page']) fantome.removeAttribute(k)
    fantome.setAttribute('aria-hidden', 'true')
    fantome.style.width = r.width + 'px'; fantome.style.height = r.height + 'px'
    const source = carte.querySelector('canvas'), copie = fantome.querySelector('canvas')
    if (source && copie) { copie.width = source.width; copie.height = source.height; copie.getContext('2d')?.drawImage(source, 0, 0) }
    const barre = Object.assign(document.createElement('div'), { className: 'trieuse-place' })
    barre.setAttribute('aria-hidden', 'true')
    this.el.append(fantome, barre)
    carte.classList.add('tiree')
    this.el.classList.add('en-glisser')
    const ids = this.idsATirer(a.page)
    const ecart = parseFloat(getComputedStyle(this.grille).columnGap) || 16
    this.glisse = { id: a.id, ids, carte, fantome, barre, dx: a.x0 - r.left, dy: a.y0 - r.top, x, y, place: this.ordre.indexOf(a.page), reste: 0, ecart }
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

  /** Le glisser s'arrête : le fantôme et la barre s'en vont, la carte revient */
  private finirGlisser(): Glisse | null {
    const g = this.glisse
    if (!g) return null
    this.glisse = null
    cancelAnimationFrame(this.boucle); this.boucle = 0
    g.fantome.remove(); g.barre.remove()
    g.carte.classList.remove('tiree')
    this.el.classList.remove('en-glisser')
    try { if (this.grille.hasPointerCapture(g.id)) this.grille.releasePointerCapture(g.id) } catch { /* déjà relâché */ }
    return g
  }

  /** Échap, pointercancel : rien ne bouge */
  private annulerGlisser() { this.finirGlisser() }

  /** Le lâcher : la page va à sa place d'arrivée (journal, message « Annuler ») */
  private lacher() {
    const g = this.finirGlisser()
    if (!g) return
    if (!(this.app.tableau.pages.get(g.ids[0]) instanceof Y.Map)) return
    this.deplacer(g.ids, g.place)
  }
}

/** Le second appui d'un double-clic (ou d'un double toucher) sur une
 *  vignette, par habitude : le premier a fermé la trieuse et mené à la page,
 *  le second tomberait sur le tableau (un point d'encre au Stylo, le menu
 *  d'un objet au double-clic). Dans la demi-seconde qui suit, à moins de
 *  40 px du premier, il ne fait rien. */
export function avalerLeSecondAppui(x: number, y: number, ms = 500) {
  const fin = performance.now() + ms
  const finir = () => {
    window.removeEventListener('pointerdown', surBas, true)
    window.removeEventListener('dblclick', surDouble, true)
  }
  const surBas = (e: PointerEvent) => {
    if (performance.now() > fin) return finir()
    if (Math.hypot(e.clientX - x, e.clientY - y) > 40) return
    e.preventDefault(); e.stopPropagation()
  }
  const surDouble = (e: MouseEvent) => {
    if (performance.now() > fin + 300) return finir()
    e.preventDefault(); e.stopPropagation()
  }
  window.addEventListener('pointerdown', surBas, true)
  window.addEventListener('dblclick', surDouble, true)
  window.setTimeout(finir, ms + 300)
}
