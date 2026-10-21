// =============================================================
// LA RECHERCHE : LA FENÊTRE
// Ctrl F (⌘ F), depuis le tableau, ou le champ « Rechercher » à côté du nom
// du classeur, ouvre une fenêtre au milieu de l'écran : on tape, les
// résultats viennent en trois groupes.
// - OUTILS : les boutons et réglages par leur nom ou ce qu'ils font
//   (« rapporteur » pose le rapporteur, « Seyès » change le fond,
//   « minuteur » le lance, « médiatrice » ouvre le programme de
//   construction avec la phrase), le catalogue, les automatismes. Entrée
//   fait l'action.
// - FORMULES ÉCRITES : celles des pages de tous les classeurs de ce
//   navigateur, avec des mots simples (« racine », « fraction », « pi »,
//   « carré » : voir recherche.ts). Un clic ouvre la page, la formule
//   prise ; une page d'une séance passée s'ouvre en lecture.
// - CLASSEURS, PAGES ET SÉANCES : par leur nom, leur classe (le dossier),
//   le nom des pages, la date des séances.
// Sans accent ni majuscule à respecter. Les autres classeurs sont lus dans
// leur base, en lecture seule, à l'ouverture de la fenêtre (les résultats
// les rejoignent quand ils sont lus) ; rien n'est écrit nulle part.
// ↑ ↓ choisissent, Entrée ouvre, Échap efface le texte puis ferme.
// =============================================================
import katex from 'katex'
import type { ContenuClasseur } from './recherche'
import { dateEnMots, morceaux, motsDeFormule, score } from './recherche'
import { fermerSurLeFond } from './dialogue'
import { icone } from './icones'

/** Une action trouvable : un outil, un réglage, une fenêtre */
export interface Action {
  titre: string
  /** D'autres mots qui la trouvent (ce qu'elle fait, ses synonymes) */
  mots?: string
  /** Ce qu'elle fait, en petit */
  detail?: string
  icone?: string
  touche?: string
  /** Le genre, devant le titre (« Fond », « Catalogue »…) */
  genre?: string
  faire: () => void
}

/** Un classeur de la bibliothèque, tel que la recherche le voit */
export interface ClasseurCherche {
  id: string
  nom: string
  /** La classe (le dossier, ou celle qu'il hérite), son chemin */
  classe: string | null
  chemin: string
  modifie: number
  /** Le classeur ouvert dans cet onglet */
  courant: boolean
  /** Son contenu, lu (null : pas encore, ou illisible) */
  contenu: ContenuClasseur | null
}

/** Où aller : le classeur, et une page (une formule prise), ou une séance */
export interface Destination { classeur: string; page?: string; forme?: string; seance?: string }

export interface HoteRecherche {
  actions(): Action[]
  /** Les classeurs, sans leur contenu (vite) */
  classeurs(): Promise<ClasseurCherche[]>
  /** Le contenu d'un classeur (lu dans sa base, ou le tableau ouvert) */
  contenu(c: ClasseurCherche): Promise<ContenuClasseur | null>
  aller(d: Destination): void
}

export interface Resultat {
  groupe: 'outils' | 'formules' | 'classeurs'
  score: number
  titre: string
  genre?: string
  detail?: string
  note?: string
  latex?: string
  /** Un texte tapé : montré à plat, à la place de sa formule */
  texte?: string
  icone?: string
  touche?: string
  faire: () => void
}

const GROUPES: { id: Resultat['groupe']; titre: string; max: number }[] = [
  { id: 'outils', titre: 'Outils', max: 6 },
  { id: 'formules', titre: 'Formules et textes écrits', max: 8 },
  { id: 'classeurs', titre: 'Classeurs, pages et séances', max: 8 },
]

function dateCourte(t: number): string {
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }).replace('.', '')
}
function dateLongue(t: number): string {
  const s = new Date(t).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Ce que trouve une requête : les actions, puis, pour chaque classeur, son
 *  nom, ses pages, ses séances et ses formules. Trié par score dans chaque
 *  groupe (le classeur ouvert un peu devant, puis le plus récent). */
export function chercher(requete: string, actions: readonly Action[], classeurs: readonly ClasseurCherche[], aller: (d: Destination) => void): Resultat[] {
  const r: Resultat[] = []
  if (!requete.trim()) return r
  for (const a of actions) {
    const s = score(requete, `${a.titre} ${a.genre ?? ''} ${a.mots ?? ''} ${a.detail ?? ''}`)
    const t = score(requete, a.titre)
    if (s !== null) r.push({ groupe: 'outils', score: s + (t !== null ? 1 : 0), titre: a.titre, genre: a.genre, detail: a.detail, icone: a.icone, touche: a.touche, faire: a.faire })
  }
  const plusRecent = [...classeurs].sort((a, b) => b.modifie - a.modifie)
  plusRecent.forEach((c, rang) => {
    const bonus = (c.courant ? 0.3 : 0) - Math.min(rang, 50) * 0.002
    const ou = c.classe ? ` · ${c.classe}` : ''
    const sc = score(requete, c.nom)
    const sChemin = sc === null ? score(requete, `${c.nom} ${c.chemin}`) : null
    if (sc !== null || sChemin !== null) {
      r.push({ groupe: 'classeurs', score: (sc ?? (sChemin! - 0.5)) + bonus, titre: c.nom, genre: 'Classeur', icone: 'classeurs',
        note: `${c.classe ? c.classe + ' · ' : ''}modifié le ${dateCourte(c.modifie)}`, faire: () => aller({ classeur: c.id }) })
    }
    const k = c.contenu
    if (!k) return
    for (const p of k.pages) {
      if (!p.nom) continue
      const s = score(requete, p.nom)
      if (s === null) continue
      r.push({ groupe: 'classeurs', score: s - 0.2 + bonus, titre: p.nom, genre: 'Page', icone: 'feuille',
        note: `${c.nom} · page ${p.numero}${p.seance ? ' · séance du ' + dateCourte(p.seance.debut) : ''}`, faire: () => aller({ classeur: c.id, page: p.id }) })
    }
    for (const s of k.seances) {
      const v = score(requete, `${s.nom ?? ''} ${dateEnMots(s.debut)} seance`)
      if (v === null) continue
      r.push({ groupe: 'classeurs', score: v - 0.3 + bonus, titre: dateLongue(s.debut), genre: 'Séance', icone: 'calendrier',
        note: `${s.nom ? s.nom + ' · ' : ''}${c.nom}${ou} · ${s.pages} page${s.pages > 1 ? 's' : ''}`, faire: () => aller({ classeur: c.id, seance: s.id }) })
    }
    const pages = new Map(k.pages.map(p => [p.id, p]))
    for (const f of k.formules) {
      const s = score(requete, motsDeFormule(f))
      if (s === null) continue
      const p = pages.get(f.page)
      r.push({ groupe: 'formules', score: s + bonus, titre: `${c.nom} · page ${p?.numero ?? '?'}`, latex: f.latex, texte: f.texte,
        note: [p?.seance ? 'Séance du ' + dateCourte(p.seance.debut) : '', c.classe ?? ''].filter(Boolean).join(' · '),
        faire: () => aller({ classeur: c.id, page: f.page, forme: f.id }) })
    }
  })
  return r.sort((a, b) => b.score - a.score)
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, classe = '', texte = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag)
  if (classe) e.className = classe
  if (texte) e.textContent = texte
  return e
}

/** Le texte, ce qui est trouvé surligné (<mark>) */
function surligne(texte: string, requete: string): DocumentFragment {
  const f = document.createDocumentFragment()
  for (const m of morceaux(texte, requete)) f.appendChild(m.trouve ? el('mark', '', m.t) : document.createTextNode(m.t))
  return f
}

const MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
export const TOUCHE_RECHERCHE = MAC ? '⌘ F' : 'Ctrl F'

/** La fenêtre de recherche (une seule à la fois) */
export class FenetreRecherche {
  private d: HTMLDialogElement | null = null
  private champ!: HTMLInputElement
  private liste!: HTMLElement
  private pied!: HTMLElement
  private actions: Action[] = []
  private classeurs: ClasseurCherche[] = []
  private resultats: Resultat[] = []
  private choisi = 0
  private lecture = 0

  constructor(private racine: HTMLElement, private hote: HoteRecherche) {}

  get ouverte() { return !!this.d?.open }

  ouvrir(texte = '') {
    if (this.d?.open) { this.champ.focus(); this.champ.select(); return }
    const d = this.d = el('dialog', 'dialogue dialogue-recherche')
    d.setAttribute('aria-label', 'Rechercher')
    const tete = el('div', 'recherche-champ')
    tete.innerHTML = icone('loupe')
    const champ = this.champ = el('input')
    champ.type = 'search'; champ.placeholder = 'Un outil, une formule, un classeur, une page…'
    champ.setAttribute('aria-label', 'Rechercher'); champ.setAttribute('role', 'combobox'); champ.setAttribute('aria-expanded', 'true')
    champ.setAttribute('aria-controls', 'recherche-liste'); champ.autocomplete = 'off'; champ.spellcheck = false
    champ.value = texte
    const echap = el('kbd', '', 'Échap')
    tete.append(champ, echap)
    const liste = this.liste = el('div', 'recherche-liste'); liste.id = 'recherche-liste'; liste.setAttribute('role', 'listbox')
    const pied = this.pied = el('div', 'recherche-pied')
    d.append(tete, liste, pied)
    this.racine.appendChild(d)
    fermerSurLeFond(d, () => d.close())
    d.addEventListener('close', () => { d.remove(); if (this.d === d) this.d = null })
    d.addEventListener('cancel', e => { if (this.champ.value) { e.preventDefault(); this.champ.value = ''; this.rafraichir() } })
    champ.addEventListener('input', () => { this.choisi = 0; this.rafraichir() })
    champ.addEventListener('keydown', e => this.clavier(e))
    d.showModal()
    champ.focus()
    this.actions = this.hote.actions()
    this.rafraichir()
    void this.lire()
  }

  fermer() { this.d?.close() }

  /** Les classeurs, puis leur contenu un à un (le classeur ouvert d'abord) */
  private async lire() {
    const n = ++this.lecture
    try {
      this.classeurs = await this.hote.classeurs()
    } catch { this.classeurs = [] }
    if (n !== this.lecture || !this.d) return
    this.rafraichir()
    const ordre = [...this.classeurs].sort((a, b) => (+b.courant - +a.courant) || (b.modifie - a.modifie))
    let lus = 0
    for (const c of ordre) {
      try { c.contenu = await this.hote.contenu(c) } catch { c.contenu = null }
      if (n !== this.lecture || !this.d) return
      // Pas à chaque classeur : par paquets, pour que la liste ne saute pas sans cesse
      if (++lus % 8 === 0 || lus === ordre.length) this.rafraichir()
    }
  }

  private aller(r: Resultat) {
    this.fermer()
    r.faire()
  }

  private clavier(e: KeyboardEvent) {
    const n = this.resultats.length
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!n) return
      this.choisi = (this.choisi + (e.key === 'ArrowDown' ? 1 : -1) + n) % n
      this.marquer()
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const r = this.resultats[this.choisi]
      if (r) this.aller(r)
    }
  }

  private marquer() {
    this.liste.querySelectorAll<HTMLElement>('.res').forEach((b, i) => {
      const oui = i === this.choisi
      b.classList.toggle('choisi', oui)
      b.setAttribute('aria-selected', String(oui))
      if (oui) { b.scrollIntoView({ block: 'nearest' }); this.champ.setAttribute('aria-activedescendant', b.id) }
    })
  }

  private rafraichir() {
    if (!this.d) return
    const q = this.champ.value
    const tous = chercher(q, this.actions, this.classeurs, d => this.hote.aller(d))
    this.resultats = []
    this.liste.replaceChildren()
    for (const g of GROUPES) {
      const l = tous.filter(r => r.groupe === g.id).slice(0, g.max)
      if (!l.length) continue
      const s = el('div', 'recherche-groupe'); s.setAttribute('role', 'group')
      const h = el('h4', '', g.titre); h.id = 'recherche-g-' + g.id
      s.setAttribute('aria-labelledby', h.id)
      s.appendChild(h)
      for (const r of l) {
        const i = this.resultats.length
        this.resultats.push(r)
        const b = el('div', 'res'); b.id = 'recherche-r-' + i; b.setAttribute('role', 'option')
        if (r.texte !== undefined) {
          const f = el('span', 'res-formule res-texte')
          f.appendChild(surligne(r.texte.replace(/\s+/g, ' ').slice(0, 120), q))
          b.classList.add('avec-formule')
          b.appendChild(f)
        } else if (r.latex !== undefined) {
          const f = el('span', 'res-formule')
          try { f.innerHTML = katex.renderToString(r.latex, { throwOnError: false, output: 'html' }) } catch { f.textContent = r.latex }
          b.classList.add('avec-formule')
          b.appendChild(f)
        } else {
          const ic = el('span', 'res-icone'); ic.innerHTML = icone(r.icone ?? 'loupe'); b.appendChild(ic)
        }
        const t = el('span', 'res-titre')
        if (r.genre) { t.appendChild(el('b', '', r.genre)); t.append(' · ') }
        t.appendChild(surligne(r.titre, q))
        if (r.detail) { t.append(' '); t.appendChild(el('small', '', r.detail)) }
        b.appendChild(t)
        b.appendChild(el('small', 'res-note', r.note ?? ''))
        if (r.touche) b.appendChild(el('kbd', '', r.touche))
        b.addEventListener('click', () => this.aller(r))
        b.addEventListener('pointermove', () => { if (this.choisi !== i) { this.choisi = i; this.marquer() } })
        s.appendChild(b)
      }
      this.liste.appendChild(s)
    }
    if (this.choisi >= this.resultats.length) this.choisi = 0
    const enLecture = this.classeurs.some(c => !c.contenu)
    if (!q.trim()) this.liste.appendChild(el('p', 'recherche-vide', 'Tapez le nom d\'un outil (rapporteur, Seyès, minuteur…), des mots d\'une formule (racine, fraction, pi…), un classeur, une page ou une date.'))
    else if (!this.resultats.length) this.liste.appendChild(el('p', 'recherche-vide', enLecture ? 'Recherche dans les classeurs…' : 'Rien trouvé. L\'écriture au stylo ne se recherche pas.'))
    this.marquer()
    const n = this.classeurs.length
    this.pied.replaceChildren()
    const g = el('span'); g.innerHTML = '<kbd>↑</kbd> <kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ouvrir'
    this.pied.append(g, el('span', '', n ? `${enLecture ? 'Lecture des classeurs… · ' : ''}Tous les classeurs de ce navigateur (${n})` : 'Ce classeur'))
  }
}
