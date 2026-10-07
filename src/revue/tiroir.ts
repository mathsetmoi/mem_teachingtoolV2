// =============================================================
// QUE REVOIR ?
// Le tiroir où le professeur choisit ce qu'il montre : la page affichée
// (sa dernière séance, ou toute son histoire), une séance entière, ou une
// page jetée depuis. Tout s'y calcule sur les métadonnées du film (l'heure
// et la page notées à chaque étape), en un seul passage, même sur un film de
// plusieurs semaines. Seule exception : la naissance d'une page (qui n'est
// pas un geste) se vérifie dans l'instantané, une fois par page montrée.
// Les listes longues (séances, pages jetées) arrivent par paquets.
// Les lignes sont de grandes cibles, faciles à toucher au tableau.
// =============================================================
import type { Etape } from '../document'
import type { Seance } from '../revoir/exporter'
import { DECOUPAGES } from '../revoir/exporter'
import type { Portion } from './bande'
import { heureLisible, jourDuMois, jourLisible, listeDesPages, pluriel, seancesDeLaPage } from './bande'

/** Ce que le tiroir doit savoir pour se remplir, et à qui répondre */
export interface Contexte {
  film: readonly Etape[]
  seances: readonly Seance[]
  /** La page de l'image affichée */
  pageVue: string
  nommer: (page: string) => string
  pagesActuelles: readonly string[]
  /** L'étape i ne fait-elle que créer sa page, vide ? (elle ne compte pas comme un geste) */
  naissance(i: number): boolean
  portion: Portion | null
  arretAuxParties: boolean
  /** Le silence qui sépare deux séances, en ms */
  ecart: number
  surPortion(p: Portion): void
  surArret(b: boolean): void
  surEcart(ms: number): void
}

const PAR_PAQUET = 12
const MINUTE = 60_000

/** « mardi 6 octobre », « aujourd'hui » */
const jour = (t: number) => { const j = jourLisible(t); return j.charAt(0).toLowerCase() + j.slice(1) }

/** Comment le tiroir rend la main en se fermant */
export type Retour = 'bouton' | 'personne'

export class Tiroir {
  readonly el: HTMLElement
  private c: Contexte | null = null
  /** Combien de séances, et de pages jetées, on montre */
  private combien = PAR_PAQUET
  private combienJetees = PAR_PAQUET

  /** bouton : « Que revoir ? », qui reprend le focus ; barre et pastille : ce que le tiroir ne doit pas couvrir */
  constructor(private bouton: HTMLElement, private barre: HTMLElement, private scene: HTMLElement, private pastille: HTMLElement) {
    const el = this.el = document.createElement('section')
    el.className = 'revue-tiroir'
    el.setAttribute('role', 'dialog')
    el.setAttribute('aria-label', 'Que revoir ?')
    el.hidden = true
  }

  get ouvert() { return !this.el.hidden }

  ouvrir(c: Contexte) {
    if (!this.ouvert) { this.combien = PAR_PAQUET; this.combienJetees = PAR_PAQUET }
    this.c = c
    this.remplir()
    this.placer()
    this.el.hidden = false
    ;(this.el.querySelector('.revue-choix.ici') as HTMLElement | null ?? this.el.querySelector('.revue-choix') as HTMLElement | null)?.focus()
  }

  /** Au-dessus de la barre et sous la pastille, sans déborder de l'écran. À
   *  refaire chaque fois que l'écran tourne ou que la barre change de hauteur. */
  placer() {
    const bas = this.barre.offsetHeight + 24
    const haut = Math.max(100, this.pastille.getBoundingClientRect().bottom + 12)
    const ecran = this.scene.clientHeight - bas - 12
    this.el.style.bottom = `calc(max(12px, env(safe-area-inset-bottom)) + ${bas}px)`
    // Sous la pastille si la place le permet ; sinon par-dessus, mais jamais au-delà du haut de l'écran
    this.el.style.maxHeight = `${Math.max(Math.min(160, ecran - 8), ecran - haut)}px`
  }

  /** Ferme le tiroir. « bouton » : le focus revient sur « Que revoir ? » (au
   *  clavier). « personne » : fermé d'un geste sur le tableau, le focus ne va
   *  nulle part, pour qu'Espace lise au lieu de rouvrir le tiroir. */
  fermer(retour: Retour = 'bouton') {
    if (!this.ouvert) return
    const avait = this.el.contains(document.activeElement)
    this.el.hidden = true
    this.el.replaceChildren()
    this.c = null
    if (retour === 'bouton') this.bouton.focus()
    else if (avait || document.activeElement === this.bouton) (document.activeElement as HTMLElement).blur()
  }

  // ---------- Le contenu ----------
  private remplir() {
    const c = this.c!
    const el = this.el
    el.replaceChildren()
    const titre = document.createElement('h2')
    titre.textContent = 'Que revoir ?'
    el.append(titre)

    // Un seul passage sur le film : combien d'étapes par page, et quand. La
    // première d'une page est sa naissance (si elle n'a fait que la créer,
    // vide) : on garde aussi l'heure de la suivante, son vrai premier geste.
    const parPage = new Map<string, { gestes: number; premier: number; ensuite: number; dernier: number; nee: number }>()
    c.film.forEach((e, i) => {
      if (!e.page) return
      const m = parPage.get(e.page)
      if (!m) parPage.set(e.page, { gestes: 1, premier: e.t, ensuite: e.t, dernier: e.t, nee: i })
      else { if (m.gestes === 1) m.ensuite = e.t; m.gestes++; m.dernier = e.t }
    })
    /** La naissance de la page p, si elle tombe entre les étapes de et a : elle n'est pas un geste */
    const neeEntre = (p: string, de: number, a: number) => {
      const i = parPage.get(p)?.nee ?? -1
      return i >= de && i <= a && c.naissance(i)
    }
    const gestesDe = (p: string) => { const m = parPage.get(p)!; return m.gestes - (neeEntre(p, 0, c.film.length - 1) ? 1 : 0) }

    // La page affichée, si elle a déjà reçu un geste
    const vue = parPage.get(c.pageVue)
    const derniere = c.seances.find(s => s.pages.includes(c.pageVue))
    if (vue && derniere && gestesDe(c.pageVue) > 0) {
      let gestes = 0, de = Infinity, a = -Infinity
      for (let i = derniere.de; i <= derniere.a; i++) {
        const e = c.film[i]
        if (e?.page !== c.pageVue || (i === vue.nee && c.naissance(i))) continue
        gestes++; de = Math.min(de, e.t); a = Math.max(a, e.t)
      }
      const nbSeances = seancesDeLaPage(c, c.seances, c.pageVue).length
      const depuis = c.naissance(vue.nee) ? vue.ensuite : vue.premier
      const sec = this.section(c.nommer(c.pageVue))
      sec.append(
        this.choix('Sa dernière séance', `${jour(de)}, ${heureLisible(de)} → ${heureLisible(a)} · ${pluriel(gestes, 'geste')}`,
          { genre: 'seance', seance: derniere, page: c.pageVue }),
        this.choix('Toute son histoire', `${pluriel(nbSeances, 'séance')} depuis le ${jourDuMois(depuis)} · ${pluriel(gestesDe(c.pageVue), 'geste')}`,
          { genre: 'page', page: c.pageVue }),
      )
    }

    // Les séances, les plus récentes d'abord, groupées par jour
    if (c.seances.length) {
      const sec = this.section('Séances')
      let jourCourant = ''
      for (const s of c.seances.slice(0, this.combien)) {
        const j = jourLisible(s.debut)
        if (j !== jourCourant) {
          jourCourant = j
          const t = document.createElement('h4'); t.textContent = j
          sec.append(t)
        }
        const gestes = s.gestes - s.pages.filter(p => neeEntre(p, s.de, s.a)).length
        sec.append(this.choix(`${heureLisible(s.debut)} → ${heureLisible(s.fin)}`, `${listeDesPages(s.pages, c.pagesActuelles)} · ${pluriel(gestes, 'geste')}`,
          { genre: 'seance', seance: s, page: null }, 'revue-seance'))
      }
      if (c.seances.length > this.combien) this.plusAnciennes(sec, '.revue-seance', this.combien, () => { this.combien += PAR_PAQUET })
    }

    // Les pages jetées, les plus récemment écrites d'abord : leur histoire reste
    // dans le film (une page jetée sans avoir rien reçu n'a rien à montrer)
    const vivantes = new Set(c.pagesActuelles)
    const jetees = [...parPage].filter(([p, m]) => !vivantes.has(p) && (m.gestes > 1 || !c.naissance(m.nee))).sort((a, b) => b[1].dernier - a[1].dernier)
    if (jetees.length) {
      const sec = this.section('Pages jetées')
      for (const [p, m] of jetees.slice(0, this.combienJetees)) {
        sec.append(this.choix('Page jetée', `dernière écriture le ${jourDuMois(m.dernier)} à ${heureLisible(m.dernier)} · ${pluriel(gestesDe(p), 'geste')}`,
          { genre: 'page', page: p }, 'revue-jetee'))
      }
      if (jetees.length > this.combienJetees) this.plusAnciennes(sec, '.revue-jetee', this.combienJetees, () => { this.combienJetees += PAR_PAQUET })
    }

    // Les réglages
    const sec = this.section('Réglages')
    const arret = document.createElement('label')
    arret.className = 'revue-reglage'
    arret.innerHTML = '<input type="checkbox"><span>S\'arrêter à la fin de chaque partie</span>'
    const coche = arret.querySelector('input')!
    coche.checked = c.arretAuxParties
    coche.addEventListener('change', () => { if (this.c) { this.c.arretAuxParties = coche.checked; this.c.surArret(coche.checked) } })
    const ecart = document.createElement('label')
    ecart.className = 'revue-reglage'
    ecart.innerHTML = '<span>Nouvelle séance après une pause de</span><select></select>'
    const liste = ecart.querySelector('select')!
    for (const m of DECOUPAGES) liste.add(new Option(`${m} min`, String(m * MINUTE)))
    liste.value = String(c.ecart)
    liste.addEventListener('change', () => {
      this.c?.surEcart(Number(liste.value))
      // Le tiroir a été rempli à nouveau : on rend la main à la liste
      ;(this.el.querySelector('.revue-reglage select') as HTMLElement | null)?.focus()
    })
    sec.append(arret, ecart)
  }

  /** « Plus anciennes » au bas d'une liste coupée : le paquet suivant arrive,
   *  et le focus va à la première des lignes qui viennent d'arriver */
  private plusAnciennes(sec: HTMLElement, lignes: string, rang: number, agrandir: () => void) {
    const plus = document.createElement('button')
    plus.type = 'button'; plus.className = 'revue-plus'
    plus.textContent = 'Plus anciennes'
    plus.addEventListener('click', () => {
      agrandir()
      this.remplir()
      ;(this.el.querySelectorAll(lignes)[rang] as HTMLElement | undefined)?.focus()
    })
    sec.append(plus)
  }

  private section(titre: string): HTMLElement {
    const s = document.createElement('div')
    s.className = 'revue-section'
    const h = document.createElement('h3')
    h.textContent = titre
    s.append(h)
    this.el.append(s)
    return s
  }

  /** Une ligne du tiroir : la choisir ferme le tiroir et montre la portion */
  private choix(texte: string, detail: string, p: Portion, classe = ''): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = `revue-choix ${classe}`.trim()
    b.append(texte)
    const small = document.createElement('small')
    small.textContent = detail
    b.append(small)
    if (memePortion(p, this.c!.portion)) b.classList.add('ici')
    b.addEventListener('click', () => {
      const c = this.c
      this.fermer()
      c?.surPortion(p)
    })
    return b
  }
}

/** Deux portions désignent-elles la même chose ? */
export function memePortion(a: Portion, b: Portion | null): boolean {
  if (!b || a.genre !== b.genre || a.page !== b.page) return false
  return a.genre === 'page' || (b.genre === 'seance' && a.seance.de === b.seance.de && a.seance.a === b.seance.a)
}
