// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import katex from 'katex'
import type { App, Interface } from './app'
import { COULEURS, TAILLES } from './app'
import type { Figure, Forme, Outil, TypeForme } from './types'
import { CM, FONDS } from './types'
import type { P, Transformation } from './formes'
import { centreDe } from './formes'

const ICONES: Record<string, string> = {
  stylo: 'M4 20l4-1L19 8l-3-3L5 16l-1 4zM14 7l3 3',
  surligneur: 'M14 4l6 6-8 8H6v-6zM4 21h9',
  gomme: 'M8 20h12M4.5 15.5l9-9 6 6-7.5 7.5H8.5z',
  segment: 'M6 18L18 6M4 18a2 2 0 104 0 2 2 0 10-4 0M16 6a2 2 0 104 0 2 2 0 10-4 0',
  formule: 'M3 13h3l3 7 4-16h8',
  selection: 'M5 3l14 8-6.5 1.8L10.5 19z',
  main: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3',
  annuler: 'M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3',
  retablir: 'M15 14l5-5-5-5M20 9H10a6 6 0 000 12h3',
  poubelle: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  plus: 'M12 5v14M5 12h14',
  moins: 'M5 12h14',
  avant: 'M15 6l-6 6 6 6',
  apres: 'M9 6l6 6-6 6',
  aimant: 'M6 4v8a6 6 0 0012 0V4h-4v8a2 2 0 01-4 0V4zM6 8h4M14 8h4',
  partager: 'M4 13v7h16v-7M12 3v12M8 7l4-4 4 4',
  forme: 'M3 11h8v8H3zM17 13a4 4 0 100-8 4 4 0 100 8z',
  rectangle: 'M4 6h16v12H4z',
  cercle: 'M12 20a8 8 0 100-16 8 8 0 100 16z',
  polygone: 'M12 3l8 6-3 10H7L4 9z',
  reconnaissance: 'M4 17c2-6 5-9 9-9M14 4h6v6M20 4l-7 7M4 20h6',
}

const TYPES_FORMES: { id: TypeForme; nom: string; touche: string }[] = [
  { id: 'rectangle', nom: 'Rectangle (Maj : carré)', touche: 'R' },
  { id: 'cercle', nom: 'Cercle, depuis son centre', touche: 'C' },
  { id: 'polygone', nom: 'Polygone : cliquer chaque sommet, revenir au premier pour fermer', touche: 'G' },
]

const FONDS_FIGURE = [...COULEURS, { nom: 'Jaune', valeur: '#e0a800' }]

/** « 2 », « -0,5 », « 1/3 » → nombre */
function nombre(t: string): number | null {
  const v = t.trim().replace(',', '.').replace('−', '-')
  const m = v.match(/^(-?[\d.]+)\s*\/\s*([\d.]+)$/)
  const n = m ? Number(m[1]) / Number(m[2]) : Number(v)
  return v && Number.isFinite(n) ? n : null
}

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const OUTILS: { id: Outil; nom: string; touche: string }[] = [
  { id: 'stylo', nom: 'Stylo', touche: 'P' },
  { id: 'surligneur', nom: 'Surligneur', touche: 'H' },
  { id: 'gomme', nom: 'Gomme', touche: 'E' },
  { id: 'segment', nom: 'Segment (Maj : angles de 15°)', touche: 'L' },
  { id: 'forme', nom: 'Formes : rectangle, cercle, polygone', touche: 'R, C, G' },
  { id: 'formule', nom: 'Formule', touche: 'F' },
  { id: 'selection', nom: 'Sélectionner et déplacer', touche: 'V' },
  { id: 'main', nom: 'Déplacer la vue', touche: 'Espace' },
]

const RACCOURCIS_LATEX = [
  ['\\frac{a}{b}', '\\frac{}{}'], ['\\sqrt{x}', '\\sqrt{}'], ['x^{n}', '^{}'], ['x_{n}', '_{}'],
  ['\\vec{u}', '\\vec{}'], ['\\overrightarrow{AB}', '\\overrightarrow{}'], ['\\in', '\\in '],
  ['\\mathbb{R}', '\\mathbb{R}'], ['\\leqslant', '\\leqslant '], ['\\infty', '\\infty'],
  ['\\pi', '\\pi'], ['\\lim', '\\lim_{x \\to }'],
]

function icone(nom: string) {
  return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONES[nom]}"/></svg>`
}

function bouton(nom: string, titre: string, action: () => void, classe = '') {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'bouton ' + classe
  b.innerHTML = icone(nom)
  b.title = titre
  b.setAttribute('aria-label', titre)
  b.addEventListener('click', action)
  return b
}

export class UI implements Interface {
  private outils = new Map<Outil, HTMLButtonElement>()
  private pastilles: HTMLButtonElement[] = []
  private tailles: HTMLButtonElement[] = []
  private boutonSupprimer!: HTMLButtonElement
  private rang!: HTMLSpanElement
  private choixFond!: HTMLSelectElement
  private boutonAimant!: HTMLButtonElement
  private zoomTexte!: HTMLButtonElement
  private etat!: HTMLSpanElement
  private bandeau!: HTMLDivElement
  private barreOutils!: HTMLElement
  private outilsPage: HTMLElement[] = []
  private toast!: HTMLDivElement
  private dialogue: HTMLDialogElement | null = null
  private boutonReconnaissance!: HTMLButtonElement
  private choixFormes!: HTMLDivElement
  private boutonsFormes = new Map<TypeForme, HTMLButtonElement>()
  private panneau!: HTMLDivElement
  private clePanneau = ''
  private idPanneau = ''
  private section: 'contour' | 'fond' | 'transformer' | null = null

  /** `partager` absent : le partage avec les élèves est désactivé. */
  constructor(private app: App, private racine: HTMLElement, private partager: (() => Promise<string | null>) | null) {
    this.construire()
    app.ui = this
    app.tableau.surEtat = () => this.maj()
    this.maj()
  }

  private construire() {
    const app = this.app

    // ----- Barre des outils, à gauche -----
    const outils = document.createElement('nav')
    outils.className = 'barre barre-outils'
    outils.setAttribute('aria-label', 'Outils')
    for (const o of OUTILS) {
      const b = bouton(o.id, `${o.nom} (${o.touche})`, () => app.choisirOutil(o.id), 'outil')
      this.outils.set(o.id, b)
      outils.appendChild(b)
    }
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet' }))
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille'; b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => { app.couleur = c.valeur; if (app.outil !== 'surligneur' && app.outil !== 'segment' && app.outil !== 'formule') app.choisirOutil('stylo'); this.maj() })
      this.pastilles.push(b); outils.appendChild(b)
    }
    const rangee = document.createElement('div'); rangee.className = 'tailles'
    TAILLES.forEach((t, i) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille'; b.title = t.nom; b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => { app.taille = t.valeur; this.maj() })
      this.tailles.push(b); rangee.appendChild(b)
    })
    outils.appendChild(rangee)
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet' }))
    outils.appendChild(bouton('annuler', 'Annuler (Ctrl+Z)', () => app.annuler()))
    outils.appendChild(bouton('retablir', 'Rétablir (Ctrl+Y)', () => app.retablir()))
    this.boutonSupprimer = bouton('poubelle', 'Supprimer la sélection (Suppr)', () => app.supprimerSelection(), 'danger')
    outils.appendChild(this.boutonSupprimer)
    this.barreOutils = outils

    // ----- Barre des pages, en haut à droite -----
    const haut = document.createElement('div')
    haut.className = 'barre barre-haut'
    const avant = bouton('avant', 'Page précédente (Page ↑)', () => app.pageSuivante(-1))
    this.rang = document.createElement('span'); this.rang.className = 'rang'
    const apres = bouton('apres', 'Page suivante (Page ↓)', () => app.pageSuivante(1))
    const nouvelle = bouton('plus', 'Nouvelle page', () => app.nouvellePage())
    const jeter = bouton('poubelle', 'Supprimer cette page', () => {
      if (confirm('Supprimer cette page et tout ce qui y est écrit ?')) app.supprimerPage()
    }, 'danger')
    this.choixFond = document.createElement('select')
    this.choixFond.className = 'choix-fond'
    this.choixFond.setAttribute('aria-label', 'Fond de la page')
    for (const f of FONDS) this.choixFond.add(new Option(f.nom, f.id))
    this.choixFond.addEventListener('change', () => app.changerFond(this.choixFond.value as never))
    this.boutonAimant = bouton('aimant', 'Aimanter au quadrillage', () => { app.aimant = !app.aimant; this.maj() }, 'outil')
    this.boutonReconnaissance = bouton('reconnaissance', 'Le stylo redresse les figures (carré, cercle…)', () => {
      app.reconnaissance = !app.reconnaissance
      this.message(app.reconnaissance ? 'Le stylo reconnaît les figures' : 'Le stylo laisse les tracés à main levée')
      this.maj()
    }, 'outil')
    this.outilsPage = [nouvelle, jeter, this.choixFond, this.boutonAimant, this.boutonReconnaissance]
    haut.append(avant, this.rang, apres, nouvelle, jeter, this.choixFond, this.boutonAimant, this.boutonReconnaissance)

    if (app.role === 'prof' && this.partager) {
      const p = document.createElement('button')
      p.type = 'button'; p.className = 'partager'
      p.innerHTML = icone('partager') + '<span>Partager</span>'
      p.addEventListener('click', () => this.ouvrirPartage())
      haut.appendChild(p)
    }
    this.etat = document.createElement('span'); this.etat.className = 'etat'
    haut.appendChild(this.etat)

    // ----- Zoom, en bas à droite -----
    const zoom = document.createElement('div')
    zoom.className = 'barre barre-zoom'
    this.zoomTexte = document.createElement('button')
    this.zoomTexte.type = 'button'; this.zoomTexte.className = 'zoom-texte'; this.zoomTexte.title = 'Revenir à 100 %'
    this.zoomTexte.addEventListener('click', () => app.zoom100())
    zoom.append(bouton('moins', 'Dézoomer', () => app.zoomer(1 / 1.25)), this.zoomTexte, bouton('plus', 'Zoomer', () => app.zoomer(1.25)))

    // ----- Bandeau élève -----
    this.bandeau = document.createElement('div')
    this.bandeau.className = 'bandeau'

    this.toast = document.createElement('div')
    this.toast.className = 'toast'; this.toast.setAttribute('role', 'status')

    // ----- Choix de la forme, à côté de l'outil -----
    this.choixFormes = document.createElement('div')
    this.choixFormes.className = 'barre choix-formes'
    for (const t of TYPES_FORMES) {
      const b = bouton(t.id, `${t.nom} (${t.touche})`, () => { app.typeForme = t.id; app.choisirOutil('forme') }, 'outil')
      this.boutonsFormes.set(t.id, b); this.choixFormes.appendChild(b)
    }

    // ----- Options de la forme sélectionnée -----
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-forme'
    this.panneau.setAttribute('role', 'toolbar')
    this.panneau.setAttribute('aria-label', 'Options de la figure')

    this.racine.append(outils, haut, zoom, this.bandeau, this.toast, this.choixFormes, this.panneau)
  }

  maj() {
    const app = this.app
    const ecrit = app.peutEcrire
    this.barreOutils.hidden = !ecrit
    for (const [id, b] of this.outils) b.classList.toggle('actif', app.outil === id)
    this.pastilles.forEach((b, i) => b.classList.toggle('actif', COULEURS[i].valeur === app.couleur))
    this.tailles.forEach((b, i) => b.classList.toggle('actif', TAILLES[i].valeur === app.taille))
    this.boutonSupprimer.hidden = app.selection.size === 0

    const pages = app.pages, i = pages.indexOf(app.page)
    this.rang.textContent = pages.length ? `${i + 1} / ${pages.length}` : '…'
    this.choixFond.value = app.fond
    this.boutonAimant.classList.toggle('actif', app.aimant)
    this.boutonReconnaissance.classList.toggle('actif', app.reconnaissance)
    for (const [id, b] of this.boutonsFormes) b.classList.toggle('actif', app.typeForme === id)
    this.choixFormes.hidden = app.outil !== 'forme' || !ecrit
    if (!this.choixFormes.hidden) {
      const r = this.outils.get('forme')!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      this.choixFormes.style.left = (o.right + 8) + 'px'
      this.choixFormes.style.top = Math.max(8, r.top - 6) + 'px'
    }
    this.etat.hidden = !this.partager
    this.majPanneau()
    for (const el of this.outilsPage) el.hidden = app.role !== 'prof'
    this.zoomTexte.textContent = Math.round(app.cam.z * 100) + ' %'

    // État de la connexion, en mots simples
    const t = app.tableau
    const eleves = [...t.autres().values()].filter(p => p.role === 'eleve').length
    const textes: Record<string, string> = {
      'hors-ligne': 'Sur cet appareil',
      'connexion': 'Connexion…',
      'en-ligne': app.role === 'prof' ? (eleves ? `${eleves} élève${eleves > 1 ? 's' : ''} connecté${eleves > 1 ? 's' : ''}` : 'En ligne, aucun élève') : 'Connecté au tableau du prof',
      'injoignable': 'Serveur injoignable',
    }
    this.etat.textContent = textes[t.etat]
    this.etat.dataset.etat = t.etat

    // Élève : où en est-on par rapport au prof ?
    this.bandeau.replaceChildren()
    if (app.role === 'eleve') {
      if (!app.suivre) {
        const b = document.createElement('button')
        b.type = 'button'; b.textContent = 'Revenir au tableau du prof'
        b.addEventListener('click', () => app.revenirAuProf())
        this.bandeau.appendChild(b)
      }
      if (!ecrit) {
        const s = document.createElement('span'); s.textContent = 'Lecture seule'
        this.bandeau.appendChild(s)
      }
    }
    this.bandeau.hidden = !this.bandeau.childElementCount
  }

  // ----- Panneau d'options de la figure -----
  private majPanneau() {
    const f = this.app.peutEcrire ? this.app.formeChoisie() : null
    if (!f || f.type === 'formule' || f.type === 'segment') { this.panneau.hidden = true; this.clePanneau = ''; return }
    const { x: _x, y: _y, ...props } = f as Forme
    if (f.id !== this.idPanneau) { this.idPanneau = f.id; this.section = null }
    // On ne reconstruit que si la figure a changé : sinon un champ en
    // cours de saisie perdrait le curseur à chaque mise à jour.
    const cle = JSON.stringify(props) + '|' + this.section
    if (cle !== this.clePanneau) { this.construirePanneau(f); this.clePanneau = cle }
    this.panneau.hidden = false
    // Au-dessus de la figure, ou en dessous s'il n'y a pas la place
    const b = this.app.rendu.boite(f), cam = this.app.cam
    const z = this.app.rendu.scene.getBoundingClientRect()
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const l = this.panneau.offsetWidth, h = this.panneau.offsetHeight
    let top = z.top + a.y - h - 14
    if (top < 76) top = Math.min(z.top + c.y + 14, window.innerHeight - h - 8)
    const left = Math.max(8, Math.min(z.left + (a.x + c.x) / 2 - l / 2, window.innerWidth - l - 8))
    this.panneau.style.left = left + 'px'
    this.panneau.style.top = Math.max(8, top) + 'px'
  }

  private construirePanneau(f: Forme) {
    const app = this.app
    const p = this.panneau
    p.replaceChildren()
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const action = (texte: string, titre: string, faire: () => void, actif = false) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'option' + (actif ? ' actif' : ''); b.textContent = texte; b.title = titre
      b.setAttribute('aria-pressed', String(actif))
      b.addEventListener('click', faire)
      ligne.appendChild(b)
      return b
    }
    const ouvrir = (s: typeof this.section) => { this.section = this.section === s ? null : s; this.clePanneau = ''; this.maj() }
    const figure = f.type === 'polygone' || f.type === 'cercle' ? f as Figure : null
    const segment = f.type === 'polygone' && !f.ferme && f.pts.length === 4

    if (figure) {
      action(f.type === 'cercle' ? 'Centre' : segment ? 'Extrémités' : 'Sommets', 'Afficher les points et leurs noms',
        () => app.basculerSommets(figure), !!figure.sommets)
      if (!segment) action('Codage', 'Côtés de même longueur, angles droits', () => app.habiller(f, { codage: !figure.codage }), !!figure.codage)
    }
    action('Contour', 'Couleur, épaisseur, pointillés', () => ouvrir('contour'), this.section === 'contour')
    if (figure && (f.type === 'cercle' || (f.type === 'polygone' && f.ferme))) action('Fond', 'Remplir la figure', () => ouvrir('fond'), this.section === 'fond')
    action('Transformer', 'Translation, rotation, symétrie, homothétie', () => ouvrir('transformer'), this.section === 'transformer')
    if (figure?.brut) action('Main levée', 'Revenir au tracé d\'origine', () => app.revenirMainLevee(figure))
    action('Dupliquer', 'Une copie, décalée d\'un centimètre', () => app.dupliquer(f))
    const jeter = bouton('poubelle', 'Supprimer (Suppr)', () => app.supprimerSelection(), 'danger')
    ligne.appendChild(jeter)
    p.appendChild(ligne)

    // Noms des sommets, modifiables
    if (figure?.sommets && figure.noms) {
      const r = document.createElement('label'); r.className = 'noms'
      r.innerHTML = `<span>Noms</span><input class="saisie" spellcheck="false" aria-label="Noms des sommets">`
      const champ = r.querySelector('input')!
      champ.value = figure.noms.join(' ')
      champ.addEventListener('change', () => app.renommer(figure, champ.value))
      champ.addEventListener('keydown', e => { if (e.key === 'Enter') champ.blur() })
      p.appendChild(r)
    }

    if (this.section === 'contour') p.appendChild(this.sectionContour(f, figure))
    if (this.section === 'fond' && figure) p.appendChild(this.sectionFond(figure))
    if (this.section === 'transformer') p.appendChild(this.sectionTransformer(f))
  }

  private sectionContour(f: Forme, figure: Figure | null) {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section'
    const couleur = 'couleur' in f ? f.couleur : ''
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille' + (c.valeur === couleur ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => app.habiller(f, { couleur: c.valeur }))
      s.appendChild(b)
    }
    const taille = 'taille' in f ? f.taille : 0
    TAILLES.forEach((t, i) => {
      const valeur = f.type === 'trait' ? t.valeur * (f.opacite < 1 ? 5 : 1) : t.valeur
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille' + (Math.abs(valeur - taille) < 0.01 ? ' actif' : ''); b.title = t.nom
      b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => app.habiller(f, { taille: valeur }))
      s.appendChild(b)
    })
    if (figure) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'option' + (figure.tirets ? ' actif' : ''); b.textContent = 'Pointillés'
      b.setAttribute('aria-pressed', String(!!figure.tirets))
      b.addEventListener('click', () => app.habiller(f, { tirets: !figure.tirets }))
      s.appendChild(b)
    }
    return s
  }

  private sectionFond(f: Figure) {
    const s = document.createElement('div'); s.className = 'section'
    const aucun = document.createElement('button')
    aucun.type = 'button'; aucun.className = 'option' + (!f.fond ? ' actif' : ''); aucun.textContent = 'Aucun'
    aucun.addEventListener('click', () => this.app.habiller(f, { fond: null }))
    s.appendChild(aucun)
    for (const c of FONDS_FIGURE) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille' + (f.fond === c.valeur ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', 'Fond ' + c.nom.toLowerCase())
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => this.app.habiller(f, { fond: c.valeur }))
      s.appendChild(b)
    }
    return s
  }

  private sectionTransformer(f: Forme) {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section transformer'
    const sommets: { nom: string; p: P }[] = f.type === 'polygone'
      ? app.sommetsDe(f).map((p, i) => ({ nom: f.noms?.[i] ?? String(i + 1), p })) : []
    const centreFig = f.type === 'polygone' || f.type === 'cercle' ? centreDe(f)
      : (() => { const b = app.rendu.boite(f); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } })()
    const origine = app.origineRepere

    // Les centres possibles
    const centres: { nom: string; p: P }[] = [{ nom: f.type === 'cercle' ? 'Centre du cercle' : 'Centre de la figure', p: centreFig }]
    for (const v of sommets) centres.push({ nom: 'Sommet ' + v.nom, p: v.p })
    if (origine) centres.push({ nom: 'Origine du repère', p: origine })

    // Les axes possibles
    const axes: { nom: string; a: P; b: P }[] = []
    const n = sommets.length, ferme = f.type === 'polygone' && f.ferme
    for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const a = sommets[i], b = sommets[(i + 1) % n]
      axes.push({ nom: `Droite (${a.nom}${b.nom})`, a: a.p, b: b.p })
    }
    axes.push({ nom: 'Verticale par le centre', a: centreFig, b: { x: centreFig.x, y: centreFig.y + 1 } })
    axes.push({ nom: 'Horizontale par le centre', a: centreFig, b: { x: centreFig.x + 1, y: centreFig.y } })
    if (origine) {
      axes.push({ nom: 'Axe des abscisses', a: origine, b: { x: origine.x + 1, y: origine.y } })
      axes.push({ nom: 'Axe des ordonnées', a: origine, b: { x: origine.x, y: origine.y + 1 } })
    }

    // Les vecteurs possibles
    const vecteurs: { nom: string; dx: number; dy: number }[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i !== j && vecteurs.length < 12) vecteurs.push({ nom: `Vecteur ${sommets[i].nom}${sommets[j].nom}`, dx: sommets[j].p.x - sommets[i].p.x, dy: sommets[j].p.y - sommets[i].p.y })
    }

    const options = (l: { nom: string }[]) => l.map((o, i) => `<option value="${i}">${html(o.nom)}</option>`).join('')
    s.innerHTML = `
      <label class="champ"><span>Transformation</span><select class="t-type">
        <option value="symetrie-axiale">Symétrie axiale</option>
        <option value="symetrie-centrale">Symétrie centrale</option>
        <option value="rotation">Rotation</option>
        <option value="translation">Translation</option>
        <option value="homothetie">Homothétie</option>
      </select></label>
      <label class="champ" data-pour="symetrie-axiale"><span>Axe</span><select class="t-axe">${options(axes)}</select></label>
      <label class="champ" data-pour="symetrie-centrale rotation homothetie"><span>Centre</span><select class="t-centre">${options(centres)}</select></label>
      <label class="champ" data-pour="rotation"><span>Angle (°, sens direct)</span><input class="saisie t-angle" value="90" inputmode="decimal"></label>
      <label class="champ" data-pour="homothetie"><span>Rapport k</span><input class="saisie t-k" value="2" inputmode="decimal"></label>
      <label class="champ" data-pour="translation"><span>Vecteur</span><select class="t-vecteur">${options(vecteurs)}<option value="libre">Coordonnées (en cm)</option></select></label>
      <div class="champ coords" data-pour="libre"><span>x ; y</span><input class="saisie t-vx" value="3" inputmode="decimal" aria-label="x"><input class="saisie t-vy" value="0" inputmode="decimal" aria-label="y"></div>
      <div class="actions"><button type="button" class="principal">Construire l'image</button></div>`
    const q = <T extends HTMLElement>(c: string) => s.querySelector(c) as T
    const type = q<HTMLSelectElement>('.t-type'), vecteur = q<HTMLSelectElement>('.t-vecteur')
    const montrer = () => {
      s.querySelectorAll<HTMLElement>('[data-pour]').forEach(el => {
        const pour = el.dataset.pour!.split(' ')
        el.hidden = pour[0] === 'libre' ? !(type.value === 'translation' && vecteur.value === 'libre') : !pour.includes(type.value)
      })
    }
    if (!vecteurs.length) vecteur.value = 'libre'
    type.addEventListener('change', montrer); vecteur.addEventListener('change', montrer)
    montrer()

    q('.principal').addEventListener('click', () => {
      const centre = centres[Number(q<HTMLSelectElement>('.t-centre').value)].p
      let t: Transformation
      switch (type.value) {
        case 'symetrie-axiale': { const a = axes[Number(q<HTMLSelectElement>('.t-axe').value)]; t = { type: 'symetrie-axiale', a: a.a, b: a.b }; break }
        case 'symetrie-centrale': t = { type: 'symetrie-centrale', c: centre }; break
        case 'rotation': {
          const angle = nombre(q<HTMLInputElement>('.t-angle').value)
          if (angle === null) return this.message('Angle : un nombre de degrés, par exemple 90')
          t = { type: 'rotation', c: centre, angle }; break
        }
        case 'homothetie': {
          const k = nombre(q<HTMLInputElement>('.t-k').value)
          if (!k) return this.message('Rapport : un nombre non nul, par exemple 2, −0,5 ou 1/3')
          t = { type: 'homothetie', c: centre, k }; break
        }
        default: {
          if (vecteur.value !== 'libre') { const v = vecteurs[Number(vecteur.value)]; t = { type: 'translation', dx: v.dx, dy: v.dy }; break }
          const vx = nombre(q<HTMLInputElement>('.t-vx').value), vy = nombre(q<HTMLInputElement>('.t-vy').value)
          if (vx === null || vy === null) return this.message('Coordonnées : deux nombres, en centimètres')
          t = { type: 'translation', dx: vx * CM, dy: -vy * CM }          // y vers le haut, comme au cahier
        }
      }
      this.section = null
      app.transformer(f, t)
    })
    return s
  }

  message(texte: string) {
    this.toast.textContent = texte
    this.toast.classList.add('visible')
    clearTimeout((this.toast as unknown as { t: number }).t)
    ;(this.toast as unknown as { t: number }).t = window.setTimeout(() => this.toast.classList.remove('visible'), 2600)
  }

  // ----- Partage -----
  private async ouvrirPartage() {
    const lien = await this.partager?.()
    if (!lien) return
    const d = this.nouveauDialogue('Faire entrer la classe')
    const corps = d.querySelector('.corps')!
    corps.innerHTML = `
      <p>Les élèves ouvrent ce lien sur leur appareil. Ils voient votre tableau en direct et suivent vos changements de page.</p>
      <div class="lien"><input readonly aria-label="Lien élève"><button type="button" class="principal">Copier</button></div>
      <label class="interrupteur"><input type="checkbox"><span>Les élèves peuvent écrire</span></label>`
    const champ = corps.querySelector('input[readonly]') as HTMLInputElement
    champ.value = lien
    corps.querySelector('.lien button')!.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(lien) } catch { champ.select(); document.execCommand('copy') }
      this.message('Lien copié')
    })
    const coche = corps.querySelector('.interrupteur input') as HTMLInputElement
    coche.checked = this.app.tableau.reglages.get('elevesEcrivent') === true
    coche.addEventListener('change', () => this.app.tableau.reglages.set('elevesEcrivent', coche.checked))
    d.showModal()
  }

  // ----- Éditeur de formules -----
  editerFormule(latex: string, sx: number, sy: number): Promise<string | null> {
    return new Promise(resolve => {
      const d = this.nouveauDialogue(latex ? 'Modifier la formule' : 'Nouvelle formule', 'dialogue-formule')
      const corps = d.querySelector('.corps')!
      corps.innerHTML = `
        <div class="apercu" aria-live="polite"></div>
        <input class="saisie" spellcheck="false" autocomplete="off" placeholder="f(x) = \\frac{1}{x}" aria-label="Formule en LaTeX">
        <div class="raccourcis"></div>
        <div class="actions"><button type="button" class="secondaire">Annuler</button><button type="button" class="principal"></button></div>`
      const saisie = corps.querySelector('.saisie') as HTMLInputElement
      const apercu = corps.querySelector('.apercu') as HTMLDivElement
      const valider = corps.querySelector('.principal') as HTMLButtonElement
      const montrer = () => {
        const v = saisie.value.trim()
        katex.render(v || '\\text{Tapez une formule}', apercu, { throwOnError: false, displayMode: true })
        apercu.classList.toggle('vide', !v)
        valider.textContent = !v && latex ? 'Supprimer' : latex ? 'Mettre à jour' : 'Placer'
      }
      for (const [rendu, code] of RACCOURCIS_LATEX) {
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'raccourci'; b.title = code
        katex.render(rendu, b, { throwOnError: false })
        b.addEventListener('click', () => {
          const a = saisie.selectionStart ?? saisie.value.length
          saisie.setRangeText(code, a, saisie.selectionEnd ?? a, 'end')
          // On place le curseur dans la première accolade vide
          const vide = saisie.value.lastIndexOf('{}', a + code.length)
          if (vide >= a) saisie.setSelectionRange(vide + 1, vide + 1)
          saisie.focus(); montrer()
        })
        corps.querySelector('.raccourcis')!.appendChild(b)
      }
      let fini = false
      const finir = (v: string | null) => { if (fini) return; fini = true; d.close(); d.remove(); resolve(v) }
      saisie.value = latex
      saisie.addEventListener('input', montrer)
      saisie.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); finir(saisie.value.trim()) } })
      valider.addEventListener('click', () => finir(saisie.value.trim()))
      corps.querySelector('.secondaire')!.addEventListener('click', () => finir(null))
      d.addEventListener('close', () => finir(null))
      // Près de l'endroit visé, sans sortir de l'écran
      d.style.left = Math.max(12, Math.min(sx, window.innerWidth - 440)) + 'px'
      d.style.top = Math.max(12, Math.min(sy + 16, window.innerHeight - 330)) + 'px'
      d.show()
      montrer()
      saisie.focus()
    })
  }

  demanderNom(): Promise<string> {
    return new Promise(resolve => {
      const d = this.nouveauDialogue('Entrer dans la classe')
      const corps = d.querySelector('.corps')!
      corps.innerHTML = `<p>Votre prénom s'affichera à côté de votre curseur quand vous écrirez.</p>
        <input class="saisie" autocomplete="given-name" placeholder="Prénom" aria-label="Prénom">
        <div class="actions"><button type="button" class="principal">Entrer</button></div>`
      const champ = corps.querySelector('input') as HTMLInputElement
      try { champ.value = localStorage.getItem('mem-prenom') || '' } catch { /* stockage refusé */ }
      const ok = () => {
        const v = champ.value.trim() || 'Élève'
        try { localStorage.setItem('mem-prenom', v) } catch { /* stockage refusé */ }
        d.close(); d.remove(); resolve(v)
      }
      corps.querySelector('button')!.addEventListener('click', ok)
      champ.addEventListener('keydown', e => { if (e.key === 'Enter') ok() })
      d.addEventListener('cancel', e => e.preventDefault())
      d.showModal(); champ.focus()
    })
  }

  private nouveauDialogue(titre: string, classe = '') {
    this.dialogue?.remove()
    const d = document.createElement('dialog')
    d.className = 'dialogue ' + classe
    d.innerHTML = `<h2></h2><div class="corps"></div>`
    d.querySelector('h2')!.textContent = titre
    d.addEventListener('click', e => { if (e.target === d && d.open) d.close() })
    this.racine.appendChild(d)
    this.dialogue = d
    return d
  }
}
