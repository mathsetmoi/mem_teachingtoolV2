// =============================================================
// LA VUE « SÉANCES » DE LA BIBLIOTHÈQUE
// Le bouton « Séances » du bandeau la montre à la place des cartes : toutes
// les séances de la bibliothèque, la plus récente d'abord, rangées par mois.
// Chaque ligne dit la date, le classeur (et son dossier), les pages ; un clic
// ouvre le classeur à cette séance. Deux choix en haut : « Chapitre en
// cours » (le classeur ouvert dans cet onglet ; c'est le choix de départ
// quand il y en a un) et « Tous les chapitres ». Elle ne fait que montrer et
// demander : ouvrir une séance est à la bibliothèque (voir bibliotheque.ts),
// qui la refait à chaque changement. Échap ramène aux cartes.
// =============================================================
import type { FicheClasseur } from './demarrage'
import { seancesParMois } from './liste'

/** Ce que la vue demande à la bibliothèque */
export interface HoteVueSeances {
  fiches(): readonly FicheClasseur[]
  /** Le classeur ouvert dans cet onglet (null : aucun) */
  classeurOuvert(): FicheClasseur | null
  chemin(f: FicheClasseur): string
  voir(classeur: string, seance: string): void
  revenir(): void
}

export class VueSeancesBiblio {
  readonly el: HTMLElement
  readonly retour: HTMLButtonElement
  private choixChapitre: HTMLButtonElement
  private choixTous: HTMLButtonElement
  private compte: HTMLElement
  private corps: HTMLElement
  private vide: HTMLElement
  /** true : seulement le classeur ouvert ; décidé à l'ouverture, puis par les deux choix */
  private chapitre = false

  constructor(private hote: HoteVueSeances) {
    const el = this.el = document.createElement('section')
    el.className = 'biblio-vue-seances'
    el.setAttribute('aria-labelledby', 'biblio-titre-seances')
    el.hidden = true
    const tete = Object.assign(document.createElement('div'), { className: 'biblio-seances-tete' })
    this.retour = Object.assign(document.createElement('button'), { type: 'button', className: 'biblio-bouton', textContent: 'Bibliothèque' })
    this.retour.title = 'Revenir aux classeurs (Échap)'
    this.retour.setAttribute('aria-label', 'Revenir à la bibliothèque')
    this.retour.dataset.action = 'seances-retour'
    this.retour.addEventListener('click', () => this.hote.revenir())
    const titre = Object.assign(document.createElement('h3'), { id: 'biblio-titre-seances', textContent: 'Séances' })
    this.compte = Object.assign(document.createElement('span'), { className: 'biblio-compte' })
    const choix = Object.assign(document.createElement('div'), { className: 'biblio-seances-choix' })
    choix.setAttribute('role', 'group'); choix.setAttribute('aria-label', 'Quelles séances montrer')
    this.choixChapitre = this.creerChoix('Chapitre en cours', 'seances-chapitre', true)
    this.choixTous = this.creerChoix('Tous les chapitres', 'seances-tous', false)
    choix.append(this.choixChapitre, this.choixTous)
    tete.append(this.retour, titre, this.compte, choix)
    this.corps = Object.assign(document.createElement('div'), { className: 'biblio-seances-corps' })
    this.vide = Object.assign(document.createElement('p'), { className: 'biblio-seances-vide', hidden: true })
    el.append(tete, this.corps, this.vide)
  }

  get ouverte() { return !this.el.hidden }

  private creerChoix(texte: string, action: string, chapitre: boolean): HTMLButtonElement {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'biblio-seances-choix-bouton', textContent: texte })
    b.dataset.action = action
    b.addEventListener('click', () => { this.chapitre = chapitre; this.maj() })
    return b
  }

  /** Le chapitre en cours d'abord, quand un classeur est ouvert */
  ouvrir() {
    if (this.ouverte) return
    this.chapitre = this.hote.classeurOuvert() !== null
    this.el.hidden = false
    this.maj()
    const premier = this.corps.querySelector<HTMLElement>('button.seance-ligne') ?? this.retour
    premier.focus({ preventScroll: true })
  }

  fermer() {
    if (!this.ouverte) return
    this.el.hidden = true
    this.corps.replaceChildren()
  }

  maj() {
    if (!this.ouverte) return
    const ouvert = this.hote.classeurOuvert()
    if (!ouvert) this.chapitre = false
    this.choixChapitre.disabled = !ouvert
    this.choixChapitre.setAttribute('aria-pressed', String(this.chapitre))
    this.choixTous.setAttribute('aria-pressed', String(!this.chapitre))
    const fiches = this.chapitre && ouvert ? this.hote.fiches().filter(f => f.id === ouvert.id) : this.hote.fiches()
    const groupes = seancesParMois(fiches, f => this.hote.chemin(f))
    const n = groupes.reduce((t, g) => t + g.seances.length, 0)
    this.compte.textContent = n ? `${n} séance${n > 1 ? 's' : ''}` : ''
    const actif = document.activeElement as HTMLElement | null
    const cleActive = actif?.classList.contains('seance-ligne') ? actif.dataset.cle : null
    const blocs: HTMLElement[] = []
    for (const g of groupes) {
      const bloc = Object.assign(document.createElement('section'), { className: 'seances-mois' })
      const h = Object.assign(document.createElement('h4'), { textContent: g.mois })
      const ul = document.createElement('ul')
      ul.className = 'seances-liste'
      for (const r of g.seances) {
        const li = document.createElement('li')
        const b = Object.assign(document.createElement('button'), { type: 'button', className: 'seance-ligne' })
        b.dataset.cle = `${r.classeur}:${r.seance}`
        b.dataset.action = 'ouvrir-seance'
        const date = Object.assign(document.createElement('span'), { className: 'seance-date', textContent: r.date })
        const classeur = Object.assign(document.createElement('span'), { className: 'seance-classeur', textContent: r.nomClasseur })
        const chemin = Object.assign(document.createElement('span'), { className: 'seance-chemin', textContent: r.chemin })
        const pages = Object.assign(document.createElement('span'), { className: 'seance-pages', textContent: r.pages })
        b.append(date, classeur, chemin, pages)
        if (r.nom) b.append(Object.assign(document.createElement('span'), { className: 'seance-nom', textContent: r.nom }))
        b.setAttribute('aria-label', `${r.date}, ${r.nomClasseur}, ${r.chemin}, ${r.pages}${r.nom ? ', ' + r.nom : ''}`)
        b.addEventListener('click', () => this.hote.voir(r.classeur, r.seance))
        li.append(b); ul.append(li)
      }
      bloc.append(h, ul); blocs.push(bloc)
    }
    this.corps.replaceChildren(...blocs)
    this.corps.hidden = !n
    this.vide.textContent = this.chapitre
      ? 'Ce classeur n\'a pas encore de séance. Les séances apparaissent dès qu\'on y écrit.'
      : 'Aucune séance pour l\'instant.'
    this.vide.hidden = n > 0
    if (cleActive) (this.corps.querySelector<HTMLElement>(`[data-cle="${CSS.escape(cleActive)}"]`) ?? this.retour).focus({ preventScroll: true })
  }
}
