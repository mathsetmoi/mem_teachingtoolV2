// =============================================================
// LA VUE DE LA CORBEILLE DE LA BIBLIOTHÈQUE
// Le bouton « Corbeille (3) » du bandeau de la bibliothèque la montre à la
// place des cartes : les dossiers et les classeurs supprimés, le dernier
// d'abord (voir corbeille.elementsDeLaCorbeille). Chacun en carte : l'aperçu
// de sa première page (ou les petits carreaux ; un dossier, sa grande icône
// dans sa couleur), son nom, « Supprimé aujourd'hui à 10 h 05 » (« · 4
// classeurs » pour un dossier), « Était dans : 5e B » ; ses deux boutons de
// 44 px l'un sous l'autre, « Remettre » et « Supprimer définitivement ». En
// haut : « Bibliothèque » (le retour ; Échap aussi) et « Vider la
// corbeille ». Elle ne fait que montrer et demander : remettre, effacer,
// vider sont à la bibliothèque (voir bibliotheque.ts), qui la refait à
// chaque changement. Comme la corbeille des pages (pages/corbeille.ts) :
// l'ordre de Tab suit les boutons ; le focus qui était sur une carte qui
// s'en va passe à la suivante (au même bouton), sinon à « Bibliothèque ».
// =============================================================
import type { FicheClasseur, FicheDossier } from './demarrage'
import type { ElementCorbeille } from './corbeille'
import { cleElement, contenuDuDossier, dateDeSuppression, elementsDeLaCorbeille, etaitDans } from './corbeille'
import { couleurDe } from './arbre'
import { icone } from '../icones'

/** Ce que la vue demande à la bibliothèque */
export interface HoteVueCorbeille {
  fiches(): readonly FicheClasseur[]
  dossiers(): ReadonlyMap<string, FicheDossier>
  /** L'aperçu d'un classeur, en adresse objet (null : pas d'aperçu) */
  image(id: string): string | null
  remettre(cle: string): void
  supprimerDefinitivement(cle: string): void
  vider(): void
  /** Retour aux cartes de la bibliothèque */
  revenir(): void
}

/** La grande icône d'un dossier (la même que sur sa carte) */
const SVG_DOSSIER = '<svg viewBox="0 0 48 38" aria-hidden="true"><path class="dos" d="M2 6a4 4 0 014-4h11.5l4.5 5h20a4 4 0 014 4v3H2z"/><path class="face" d="M2 12h44v20a4 4 0 01-4 4H6a4 4 0 01-4-4z"/></svg>'

interface Carte { el: HTMLElement; nom: HTMLElement; date: HTMLElement; ou: HTMLElement; image: HTMLImageElement | null; remettre: HTMLButtonElement; supprimer: HTMLButtonElement }

export class VueCorbeilleBiblio {
  readonly el: HTMLElement
  private grille: HTMLElement
  private compte: HTMLElement
  private vide: HTMLElement
  private boutonVider: HTMLButtonElement
  readonly retour: HTMLButtonElement
  private cartes = new Map<string, Carte>()
  private liste: string[] = []

  constructor(private hote: HoteVueCorbeille) {
    const el = this.el = document.createElement('section')
    el.className = 'biblio-vue-corbeille'
    el.setAttribute('aria-labelledby', 'biblio-titre-corbeille')
    el.hidden = true
    const tete = Object.assign(document.createElement('div'), { className: 'biblio-corbeille-tete' })
    this.retour = this.bouton('Bibliothèque', 'avant', () => this.hote.revenir(), 'Revenir aux classeurs (Échap)')
    this.retour.setAttribute('aria-label', 'Revenir à la bibliothèque')
    this.retour.dataset.action = 'corbeille-retour'
    const titre = Object.assign(document.createElement('h3'), { id: 'biblio-titre-corbeille', textContent: 'Corbeille de la bibliothèque' })
    this.compte = Object.assign(document.createElement('span'), { className: 'biblio-compte' })
    this.boutonVider = this.bouton('Vider la corbeille', 'poubelle', () => this.hote.vider(), 'Effacer de ce navigateur tout ce qui est dans la corbeille')
    this.boutonVider.classList.add('danger', 'biblio-vider')
    this.boutonVider.dataset.action = 'vider-corbeille'
    tete.append(this.retour, titre, this.compte, this.boutonVider)
    const note = Object.assign(document.createElement('p'), { className: 'biblio-corbeille-note',
      textContent: 'Les classeurs et les dossiers supprimés attendent ici : Remettre les rend à leur place. Rien n\'est effacé de ce navigateur tant qu\'on ne vide pas la corbeille. Les pages et les séances supprimées d\'un classeur sont dans la corbeille de ce classeur (Maj + P, Corbeille).' })
    this.grille = document.createElement('ul')
    this.grille.className = 'biblio-corbeille-grille'
    this.grille.setAttribute('aria-label', 'Les classeurs et les dossiers de la corbeille, le dernier supprimé d\'abord')
    this.vide = Object.assign(document.createElement('p'), { className: 'biblio-corbeille-vide', textContent: 'La corbeille est vide.', hidden: true })
    el.append(tete, note, this.grille, this.vide)
  }

  get ouverte() { return !this.el.hidden }

  private bouton(texte: string, nomIcone: string, faire: () => void, titre: string): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'biblio-bouton'; b.title = titre
    b.innerHTML = icone(nomIcone)
    b.append(Object.assign(document.createElement('span'), { className: 'libelle', textContent: texte }))
    b.addEventListener('click', faire)
    return b
  }

  /** Le focus va au premier « Remettre » (le dernier supprimé), ou au retour */
  ouvrir() {
    if (this.ouverte) return
    this.el.hidden = false
    this.liste = []
    this.maj()
    const premier = this.liste.length ? this.cartes.get(this.liste[0])!.remettre : this.retour
    premier.focus({ preventScroll: true })
  }

  fermer() {
    if (!this.ouverte) return
    this.el.hidden = true
    this.grille.replaceChildren()
    this.cartes.clear(); this.liste = []
  }

  /** Une carte par élément, le dernier supprimé d'abord (les cartes déjà là
   *  sont gardées) ; le focus perdu avec sa carte va à la suivante */
  maj() {
    if (!this.ouverte) return
    const fiches = this.hote.fiches(), dossiers = this.hote.dossiers()
    const elements = elementsDeLaCorbeille(fiches, dossiers)
    const cles = elements.map(cleElement)
    const actif = document.activeElement as HTMLElement | null
    const carteActive = actif?.closest?.('.carte-corbeille-biblio') as HTMLElement | null
    const cleActive = carteActive?.dataset.cle ?? null
    const rangActif = cleActive ? this.liste.indexOf(cleActive) : -1
    const boutonActif = cleActive && actif === this.cartes.get(cleActive)?.supprimer ? 'supprimer' : 'remettre'
    const vues = new Set(cles)
    for (const [cle, c] of this.cartes) if (!vues.has(cle)) { c.el.remove(); this.cartes.delete(cle) }
    let avant: Element | null = this.grille.firstElementChild
    const maintenant = Date.now()
    for (const e of elements) {
      const cle = cleElement(e)
      let c = this.cartes.get(cle)
      if (!c) { c = this.creerCarte(e); this.cartes.set(cle, c) }
      if (c.el !== avant) this.grille.insertBefore(c.el, avant)
      else avant = avant.nextElementSibling
      this.majCarte(c, e, fiches, dossiers, maintenant)
    }
    this.liste = cles
    const n = cles.length
    const compte = n ? `${n} élément${n > 1 ? 's' : ''}` : ''
    if (this.compte.textContent !== compte) this.compte.textContent = compte
    this.vide.hidden = n > 0
    this.grille.hidden = !n
    this.boutonVider.disabled = !n
    this.boutonVider.setAttribute('aria-disabled', String(!n))
    if (cleActive && !vues.has(cleActive)) {
      const suivante = cles[Math.min(Math.max(0, rangActif), n - 1)]
      const c = suivante ? this.cartes.get(suivante) : null
      ;(c ? (boutonActif === 'supprimer' ? c.supprimer : c.remettre) : this.retour).focus({ preventScroll: true })
    }
  }

  private creerCarte(e: ElementCorbeille): Carte {
    const cle = cleElement(e)
    const el = document.createElement('li')
    el.className = 'carte-corbeille-biblio'; el.dataset.cle = cle
    el.dataset.genre = e.genre
    const apercu = Object.assign(document.createElement('span'), { className: e.genre === 'classeur' ? 'carte-apercu' : 'carte-apercu dossier-apercu' })
    apercu.setAttribute('aria-hidden', 'true')
    let image: HTMLImageElement | null = null
    if (e.genre === 'classeur') {
      image = Object.assign(document.createElement('img'), { className: 'apercu-image', alt: '', draggable: false, decoding: 'async', hidden: true })
      image.addEventListener('error', () => { image!.hidden = true; image!.removeAttribute('src') })
      apercu.append(image)
    } else apercu.innerHTML = SVG_DOSSIER
    const nom = Object.assign(document.createElement('span'), { className: 'corbeille-nom-biblio' })
    const date = Object.assign(document.createElement('span'), { className: 'corbeille-date-biblio' })
    const ou = Object.assign(document.createElement('span'), { className: 'corbeille-ou-biblio' })
    const boutons = Object.assign(document.createElement('div'), { className: 'corbeille-boutons' })
    const remettre = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-remettre', textContent: 'Remettre' })
    remettre.dataset.action = 'remettre'
    remettre.addEventListener('click', () => this.hote.remettre(cle))
    const supprimer = Object.assign(document.createElement('button'), { type: 'button', className: 'corbeille-supprimer danger', textContent: 'Supprimer définitivement' })
    supprimer.dataset.action = 'supprimer-definitivement'
    supprimer.addEventListener('click', () => this.hote.supprimerDefinitivement(cle))
    boutons.append(remettre, supprimer)
    el.append(apercu, nom, date, ou, boutons)
    return { el, nom, date, ou, image, remettre, supprimer }
  }

  private majCarte(c: Carte, e: ElementCorbeille, fiches: readonly FicheClasseur[], dossiers: ReadonlyMap<string, FicheDossier>, maintenant: number) {
    const poser = (x: HTMLElement, t: string) => { if (x.textContent !== t) x.textContent = t }
    const nom = e.genre === 'classeur' ? e.fiche.nom : e.dossier.nom
    poser(c.nom, nom)
    c.nom.title = nom
    let date: string
    if (e.genre === 'dossier') {
      const x = contenuDuDossier(e.dossier.id, fiches, dossiers)
      date = dateDeSuppression(e.t, maintenant, { classeurs: x.classeurs.length, dossiers: x.dossiers.length })
      const couleur = couleurDe(e.dossier.couleur).valeur
      if (c.el.style.getPropertyValue('--c') !== couleur) c.el.style.setProperty('--c', couleur)
    } else date = dateDeSuppression(e.t, maintenant)
    poser(c.date, date)
    const ou = etaitDans(e.genre === 'classeur' ? e.fiche.dossier : e.dossier.parent, dossiers)
    poser(c.ou, ou)
    // L'aperçu de la première page, quand il y en a un
    if (c.image && e.genre === 'classeur') {
      const url = this.hote.image(e.fiche.id)
      if (url) { if (c.image.getAttribute('src') !== url) c.image.src = url; c.image.hidden = false }
      else if (c.image.hasAttribute('src')) { c.image.removeAttribute('src'); c.image.hidden = true }
    }
    // Pour un lecteur d'écran : « Symétrie, classeur, supprimé aujourd'hui à 10 h 05, était dans : 5e B »
    const sujet = e.genre === 'classeur' ? `« ${nom} »` : `le dossier « ${nom} »`
    c.el.setAttribute('aria-label', `${nom}, ${e.genre === 'classeur' ? 'classeur' : 'dossier'}, ${date.charAt(0).toLowerCase()}${date.slice(1)}, ${ou.charAt(0).toLowerCase()}${ou.slice(1)}`)
    c.remettre.setAttribute('aria-label', `Remettre ${sujet}`)
    c.supprimer.setAttribute('aria-label', `Supprimer définitivement ${sujet}`)
  }
}
