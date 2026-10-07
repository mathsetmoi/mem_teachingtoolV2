// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import katex from 'katex'
import type { App, Interface, Prise } from './app'
import { COULEURS, TAILLES } from './app'
import type { Bout, Figure, Forme, MarquePoint, Outil, TypeForme } from './types'
import { CM, FONDS } from './types'
import type { P, Transformation } from './formes'
import { centreDe, image, versRelatif } from './formes'
import { etapesImage } from './construction'
import { RevueEnClasse } from './revue/revue'
import { Publication } from './publication/fenetre'
import { Constructeur } from './constructeur'
import { Seance } from './seance'
import type { NomInstrument } from './instruments'
import { INSTRUMENTS } from './instruments'

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
  point: 'M7 7l7 7M14 7l-7 7M16 17.5h4M16.5 21l1.75-6 1.75 6',
  'trait-segment': 'M6 18L18 6M4.5 16.5l3 3M16.5 4.5l3 3',
  'trait-droite': 'M3 21L21 3',
  'trait-demi': 'M6 18L21 3M4.5 16.5l3 3',
  rectangle: 'M4 6h16v12H4z',
  cercle: 'M12 20a8 8 0 100-16 8 8 0 100 16z',
  polygone: 'M12 3l8 6-3 10H7L4 9z',
  reconnaissance: 'M4 17c2-6 5-9 9-9M14 4h6v6M20 4l-7 7M4 20h6',
  revue: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2M10.5 9.5v5l4-2.5z',
  publier: 'M12 15V3M7.5 7.5L12 3l4.5 4.5M5 13v6a2 2 0 002 2h10a2 2 0 002-2v-6',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5a1.5 1.5 0 100-.01',
  instruments: 'M3 17L17 3l4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2',
  regle: 'M2 9h20v6H2zM6 9v3M10 9v2M14 9v3M18 9v2',
  equerre: 'M4 20V4l16 16zM4 15h5v5',
  rapporteur: 'M3 17a9 9 0 0118 0zM12 17V12M12 8V9M7 11l1 1M17 11l-1 1',
  compas: 'M12 3v2M12 5l-6 15M12 5l6 15M9.5 13h5',
  construction: 'M4 5h9M4 10h7M4 15h5M15 20l2-9 2 9M17 11V8M15.6 16h2.8',
  automatismes: 'M12 21a8 8 0 100-16 8 8 0 100 16zM12 9v4l2.5 2.5M10 2h4M12 2v3',
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

const MARQUES: { id: MarquePoint; nom: string; d: string }[] = [
  { id: 'aucun', nom: 'Aucune marque', d: 'M5 19L19 5' },
  { id: 'point', nom: 'Point', d: 'M12 12h.01" style="stroke-width:7' },
  { id: 'croix', nom: 'Croix', d: 'M7 7l10 10M17 7L7 17' },
  { id: 'plus', nom: 'Croix droite', d: 'M12 5v14M5 12h14' },
  { id: 'rond', nom: 'Rond', d: 'M12 16a4 4 0 100-8 4 4 0 100 8z' },
]
const BOUTS: { id: Bout; nom: string; d: string }[] = [
  { id: 'aucun', nom: 'Extrémité simple', d: 'M3 12h16' },
  { id: 'fleche', nom: 'Flèche', d: 'M3 12h14M13 7l6 5-6 5' },
  { id: 'trait', nom: 'Trait', d: 'M3 12h16M19 6v12' },
  { id: 'crochet', nom: 'Crochet', d: 'M3 12h16M19 6v12M19 6h-3M19 18h-3' },
]

const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

const OUTILS: { id: Outil; nom: string; touche: string }[] = [
  { id: 'stylo', nom: 'Stylo', touche: 'P' },
  { id: 'surligneur', nom: 'Surligneur', touche: 'H' },
  { id: 'gomme', nom: 'Gomme', touche: 'E' },
  { id: 'point', nom: 'Point : un clic le pose et le nomme', touche: 'X' },
  { id: 'segment', nom: 'Segment, droite, demi-droite (Maj : angles de 15°)', touche: 'L' },
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
  private choixTraits!: HTMLDivElement
  private boutonsTraits = new Map<string, HTMLButtonElement>()
  private boutonsFormes = new Map<TypeForme, HTMLButtonElement>()
  private panneau!: HTMLDivElement
  private clePanneau = ''
  private idPanneau = ''
  private section: 'contour' | 'fond' | 'transformer' | null = null
  private revue!: RevueEnClasse
  private publication!: Publication
  private constructeur!: Constructeur
  private seance!: Seance
  private choixInstruments!: HTMLDivElement
  private boutonInstruments!: HTMLButtonElement
  private boutonsInstruments = new Map<NomInstrument, HTMLButtonElement>()
  private menuPartie!: HTMLDivElement
  private partie: { id: string; prise: Prise } | null = null

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
    // Pas de confirm() : dans une page intégrée (l'aperçu, un ENT), le
    // navigateur le bloque et répond « non » sans rien montrer
    const jeter = bouton('poubelle', 'Supprimer cette page', async () => {
      const seule = app.pages.length <= 1
      const n = app.pages.indexOf(app.page) + 1
      const ok = await this.confirmer(seule ? 'Effacer la page ?' : `Supprimer la page ${n} ?`,
        seule ? 'Le tableau n\'a qu\'une page : tout ce qui y est écrit sera effacé. Ctrl+Z pour revenir.'
          : 'La page et tout ce qu\'elle contient disparaissent.', seule ? 'Effacer la page' : 'Supprimer la page')
      if (!ok) return
      if (seule) app.viderPage(); else app.supprimerPage()
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
    this.boutonInstruments = bouton('instruments', 'Instruments : règle, équerre, rapporteur, compas', () => {
      this.choixInstruments.hidden = !this.choixInstruments.hidden; this.maj()
    }, 'outil')
    const construire = bouton('construction', 'Programme de construction, étape par étape', () => {
      if (this.constructeur.ouvert) this.constructeur.fermer(); else this.constructeur.ouvrir()
    })
    // Importer une image : bouton, ou coller (Ctrl+V), ou glisser le fichier sur le tableau
    const choixFichier = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', hidden: true })
    choixFichier.addEventListener('change', () => { const f = choixFichier.files?.[0]; if (f) app.importerImage(f); choixFichier.value = '' })
    const importer = bouton('image', 'Importer une image (ou coller avec Ctrl+V, ou glisser le fichier)', () => choixFichier.click())
    this.racine.appendChild(choixFichier)
    const automatismes = bouton('automatismes', 'Automatismes : 10 questions minutées', () => this.seance.ouvrir())
    const revoir = bouton('revue', 'Revoir la construction : une page, une séance, pas à pas', () => this.ouvrirRevue(revoir))
    const publier = bouton('publier', 'Publier le replay pour les élèves', () => this.publication.ouvrir())
    this.outilsPage = [nouvelle, jeter, this.choixFond, this.boutonAimant, this.boutonReconnaissance, importer, this.boutonInstruments, construire, automatismes, revoir, publier]
    haut.append(avant, this.rang, apres, nouvelle, jeter, this.choixFond, this.boutonAimant, this.boutonReconnaissance, importer, this.boutonInstruments, construire, automatismes, revoir, publier)

    // ----- Les instruments, sous leur bouton -----
    this.choixInstruments = document.createElement('div')
    this.choixInstruments.className = 'barre choix-instruments'
    this.choixInstruments.hidden = true
    for (const i of INSTRUMENTS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'option instrument'
      b.innerHTML = icone(i.id) + `<span>${i.nom}</span>`
      b.addEventListener('click', () => { app.basculerInstrument(i.id); this.maj() })
      this.boutonsInstruments.set(i.id, b)
      this.choixInstruments.appendChild(b)
    }

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

    // ----- Segment, droite ou demi-droite, à côté de l'outil Segment -----
    this.choixTraits = document.createElement('div')
    this.choixTraits.className = 'barre choix-formes'
    for (const [id, nom] of [['segment', 'Segment [AB]'], ['droite', 'Droite (AB)'], ['demi', 'Demi-droite [AB)']] as const) {
      const b = bouton('trait-' + id, nom, () => { app.typeTrait = id; app.choisirOutil('segment') }, 'outil')
      this.boutonsTraits.set(id, b); this.choixTraits.appendChild(b)
    }

    // ----- Options de la forme sélectionnée -----
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-forme'
    this.panneau.setAttribute('role', 'toolbar')
    this.panneau.setAttribute('aria-label', 'Options de la figure')

    this.racine.append(outils, haut, zoom, this.bandeau, this.toast, this.choixFormes, this.choixTraits, this.panneau, this.choixInstruments)
    this.revue = new RevueEnClasse(this.app, this.racine)
    this.publication = new Publication(app, this.racine)
    this.constructeur = new Constructeur(app, this.racine, t => this.message(t))
    this.seance = new Seance(this.racine)

    // ----- Menu d'un morceau de figure (point, extrémité, nom, rayon) -----
    this.menuPartie = document.createElement('div')
    this.menuPartie.className = 'menu-partie'
    this.menuPartie.setAttribute('role', 'dialog')
    this.menuPartie.hidden = true
    this.racine.appendChild(this.menuPartie)
    document.addEventListener('pointerdown', e => {
      if (!this.menuPartie.hidden && !this.menuPartie.contains(e.target as Node) && !(e.target as HTMLElement).closest('#zone')) this.fermerMenuPartie()
    }, true)
    window.addEventListener('keydown', e => { if (e.key === 'Escape') this.fermerMenuPartie() })
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
    for (const [id, b] of this.boutonsTraits) b.classList.toggle('actif', app.typeTrait === id)
    // Le petit panneau à côté de l'outil choisi (Formes ou Segment)
    for (const [panneau, outil] of [[this.choixFormes, 'forme'], [this.choixTraits, 'segment']] as const) {
      panneau.hidden = app.outil !== outil || !ecrit
      if (panneau.hidden) continue
      const r = this.outils.get(outil)!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, r.top - 6) + 'px'
    }
    this.etat.hidden = !this.partager
    for (const [id, b] of this.boutonsInstruments) {
      const oui = app.instrumentVisible(id)
      b.classList.toggle('actif', oui); b.setAttribute('aria-pressed', String(oui))
    }
    this.boutonInstruments.classList.toggle('actif', !this.choixInstruments.hidden || [...this.boutonsInstruments.keys()].some(i => app.instrumentVisible(i)))
    if (!this.choixInstruments.hidden) {
      const r = this.boutonInstruments.getBoundingClientRect()
      this.choixInstruments.style.top = (r.bottom + 10) + 'px'
      this.choixInstruments.style.left = Math.max(8, Math.min(r.left + r.width / 2 - this.choixInstruments.offsetWidth / 2, window.innerWidth - this.choixInstruments.offsetWidth - 8)) + 'px'
    }
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
    const app = this.app
    // Le panneau se ferme dès que l'objet n'est plus seul sélectionné
    if (app.options && !(app.selection.size === 1 && app.selection.has(app.options))) app.options = null
    const f = app.peutEcrire && !app.enLecture ? app.formeChoisie() : null
    if (!f || f.id !== app.options || f.type === 'formule' || f.type === 'segment') { this.panneau.hidden = true; this.clePanneau = ''; return }
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
    const gauche = this.barreOutils.hidden ? 8 : this.barreOutils.getBoundingClientRect().right + 8
    const left = Math.max(gauche, Math.min(z.left + (a.x + c.x) / 2 - l / 2, window.innerWidth - l - 8))
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

    if (segment && f.type === 'polygone') {
      // Segment, droite ou demi-droite : on passe de l'un à l'autre d'un clic
      for (const [id, nom] of [[undefined, 'Segment'], ['droite', 'Droite'], ['demi', 'Demi-droite']] as const) {
        action(nom, nom === 'Segment' ? 'Segment [AB]' : nom === 'Droite' ? 'Droite (AB)' : 'Demi-droite [AB)', () => app.habiller(f, { prolonge: id } as never), f.prolonge === id)
      }
    }
    if (figure) {
      action(f.type === 'cercle' ? 'Centre' : segment ? (f.type === 'polygone' && f.prolonge ? 'Points' : 'Extrémités') : 'Sommets', 'Afficher les points et leurs noms',
        () => app.basculerSommets(figure), !!figure.sommets)
      if (!segment) action('Codage', 'Côtés de même longueur, angles droits', () => app.habiller(f, { codage: !figure.codage }), !!figure.codage)
    }
    if (f.type !== 'image') action('Contour', 'Couleur, épaisseur, pointillés', () => ouvrir('contour'), this.section === 'contour')
    if (figure && ((f.type === 'cercle' && !f.arc) || (f.type === 'polygone' && f.ferme))) action('Fond', 'Remplir la figure', () => ouvrir('fond'), this.section === 'fond')
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

  /** Ce qu'on a choisi dans « Transformer » : gardé quand le panneau se refait */
  private transfo = { type: 'symetrie-axiale', axe: '', centre: '', angle: '90', k: '2', vecteur: '', vx: '3', vy: '0' }

  private sectionTransformer(f: Forme) {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section transformer'
    const T = this.transfo
    const sommets: { nom: string; p: P }[] = f.type === 'polygone'
      ? app.sommetsDe(f).map((p, i) => ({ nom: f.sommets && f.noms?.[i] ? f.noms[i] : String(i + 1), p })) : []
    const centreFig = f.type === 'polygone' || f.type === 'cercle' ? centreDe(f)
      : (() => { const b = app.rendu.boite(f); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } })()
    const origine = app.origineRepere

    // Seulement ce qui est sur le tableau : la figure elle-même, les points
    // nommés et les droites tracées de la page, le repère s'il y en a un
    const centres: { cle: string; nom: string; p: P }[] = [{ cle: 'centre', nom: f.type === 'cercle' ? 'Centre du cercle' : f.type === 'image' ? "Centre de l'image" : 'Centre de la figure', p: centreFig }]
    sommets.forEach((v, i) => centres.push({ cle: 'som:' + i, nom: 'Sommet ' + v.nom, p: v.p }))
    const deja = new Set(sommets.map(v => v.nom))
    for (const [nom, p] of app.pointsNommes()) if (!deja.has(nom)) centres.push({ cle: 'pt:' + nom, nom: 'Point ' + nom, p })
    if (origine) centres.push({ cle: 'origine', nom: 'Origine du repère', p: origine })

    const axes: { cle: string; nom: string; a: P; b: P }[] = app.droitesDeLaPage(f.id).map(d => ({ cle: 'seg:' + d.id, nom: d.nom, a: d.a, b: d.b }))
    const n = sommets.length, ferme = f.type === 'polygone' && f.ferme
    if (n >= 2) for (let i = 0; i < (ferme ? n : n - 1); i++) {
      const a = sommets[i], b = sommets[(i + 1) % n]
      axes.push({ cle: 'cote:' + i, nom: `Côté (${a.nom}${b.nom})`, a: a.p, b: b.p })
    }
    if (origine) {
      axes.push({ cle: 'ox', nom: 'Axe des abscisses', a: origine, b: { x: origine.x + 1, y: origine.y } })
      axes.push({ cle: 'oy', nom: 'Axe des ordonnées', a: origine, b: { x: origine.x, y: origine.y + 1 } })
    }

    const vecteurs: { cle: string; nom: string; dx: number; dy: number }[] = []
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i !== j && vecteurs.length < 12) vecteurs.push({ cle: `v:${i}:${j}`, nom: `Vecteur ${sommets[i].nom}${sommets[j].nom}`, dx: sommets[j].p.x - sommets[i].p.x, dy: sommets[j].p.y - sommets[i].p.y })
    }

    // Le choix gardé, s'il existe encore ; sinon le premier de la liste
    if (!axes.some(a => a.cle === T.axe)) T.axe = axes[0]?.cle ?? ''
    if (!centres.some(c => c.cle === T.centre)) T.centre = centres[0].cle
    if (T.vecteur !== 'libre' && !vecteurs.some(v => v.cle === T.vecteur)) T.vecteur = vecteurs[0]?.cle ?? 'libre'

    const options = (l: { cle: string; nom: string }[], actuel: string) => l.map(o => `<option value="${o.cle}"${o.cle === actuel ? ' selected' : ''}>${html(o.nom)}</option>`).join('')
    const types = [['symetrie-axiale', 'Symétrie axiale'], ['symetrie-centrale', 'Symétrie centrale'], ['rotation', 'Rotation'], ['translation', 'Translation'], ['homothetie', 'Homothétie']]
    s.innerHTML = `
      <label class="champ"><span>Transformation</span><select class="t-type">${types.map(([v, t]) => `<option value="${v}"${v === T.type ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
      <div class="champ choix-sur-tableau" data-pour="symetrie-axiale"><span>Axe</span>
        <select class="t-axe"${axes.length ? '' : ' hidden'}>${options(axes, T.axe)}</select>${axes.length ? '' : '<em>Aucune droite sur la page</em>'}
        <button type="button" class="secondaire petit designer-axe" title="Cliquer sur une droite du tableau"${axes.length ? '' : ' hidden'}>Désigner</button>
        <button type="button" class="secondaire petit tracer-axe" title="Tracer l'axe sur le tableau (deux clics)">Tracer</button></div>
      <div class="champ choix-sur-tableau" data-pour="symetrie-centrale rotation homothetie"><span>Centre</span>
        <select class="t-centre">${options(centres, T.centre)}</select>
        <button type="button" class="secondaire petit designer-centre" title="Cliquer sur un point du tableau">Désigner</button>
        <button type="button" class="secondaire petit tracer-centre" title="Placer le centre sur le tableau (un clic)">Tracer</button></div>
      <label class="champ" data-pour="rotation"><span>Angle (°, sens direct)</span><input class="saisie t-angle" value="${html(T.angle)}" inputmode="decimal"></label>
      <label class="champ" data-pour="homothetie"><span>Rapport k</span><input class="saisie t-k" value="${html(T.k)}" inputmode="decimal"></label>
      <label class="champ" data-pour="translation"><span>Vecteur</span><select class="t-vecteur">${options(vecteurs, T.vecteur)}<option value="libre"${T.vecteur === 'libre' ? ' selected' : ''}>Coordonnées (en cm)</option></select></label>
      <div class="champ coords" data-pour="libre"><span>x ; y</span><input class="saisie t-vx" value="${html(T.vx)}" inputmode="decimal" aria-label="x"><input class="saisie t-vy" value="${html(T.vy)}" inputmode="decimal" aria-label="y"></div>
      <label class="interrupteur instruments-transfo"><input type="checkbox"${this.constructeur.instruments ? ' checked' : ''}><span>Pas à pas avec les instruments</span></label>
      <div class="actions"><button type="button" class="secondaire pas-a-pas">Pas à pas</button><button type="button" class="principal construire">Construire l'image</button></div>`
    const q = <T extends HTMLElement>(c: string) => s.querySelector(c) as T
    const type = q<HTMLSelectElement>('.t-type'), vecteur = q<HTMLSelectElement>('.t-vecteur')
    const lire = () => {
      T.type = type.value; T.vecteur = vecteur.value
      T.axe = q<HTMLSelectElement>('.t-axe').value; T.centre = q<HTMLSelectElement>('.t-centre').value
      T.angle = q<HTMLInputElement>('.t-angle').value; T.k = q<HTMLInputElement>('.t-k').value
      T.vx = q<HTMLInputElement>('.t-vx').value; T.vy = q<HTMLInputElement>('.t-vy').value
    }
    const montrer = () => {
      s.querySelectorAll<HTMLElement>('[data-pour]').forEach(el => {
        const pour = el.dataset.pour!.split(' ')
        el.hidden = pour[0] === 'libre' ? !(type.value === 'translation' && vecteur.value === 'libre') : !pour.includes(type.value)
      })
    }
    s.addEventListener('change', () => { lire(); montrer() })
    s.addEventListener('input', lire)
    montrer()

    // Désigner ou tracer sur le tableau : le choix revient dans la liste
    const refaire = () => { this.clePanneau = ''; this.maj() }
    q('.designer-axe').addEventListener('click', () => app.designer('axe', axes.map(a => ({ cle: a.cle, a: a.a, b: a.b })), cle => { T.axe = cle; refaire() }))
    q('.tracer-axe').addEventListener('click', () => app.tracerAxe(id => { T.axe = 'seg:' + id; refaire() }))
    q('.designer-centre').addEventListener('click', () => app.designer('centre', centres.map(c => ({ cle: c.cle, a: c.p })), cle => { T.centre = cle; refaire() }))
    q('.tracer-centre').addEventListener('click', () => app.tracerCentre(nom => { T.centre = 'pt:' + nom; refaire() }))
    q<HTMLInputElement>('.instruments-transfo input').addEventListener('change', e => { this.constructeur.instruments = (e.target as HTMLInputElement).checked })

    /** La transformation choisie, et comment en parler dans les consignes */
    const transformation = (): { t: Transformation; noms: { axe?: string; centre?: string } } | null => {
      lire()
      const centre = centres.find(c => c.cle === T.centre)!
      const nomCentre = centre.cle.startsWith('pt:') ? centre.cle.slice(3) : centre.cle.startsWith('som:') ? centre.nom.replace('Sommet ', '') : centre.cle === 'origine' ? 'O' : 'le centre'
      switch (T.type) {
        case 'symetrie-axiale': {
          const a = axes.find(x => x.cle === T.axe)
          if (!a) { this.message('Choisis l\'axe : désigne une droite du tableau, ou trace-la.'); return null }
          const m = a.nom.match(/\((.+)\)/)
          return { t: { type: 'symetrie-axiale', a: a.a, b: a.b }, noms: { axe: m ? `(${m[1]})` : "l'axe" } }
        }
        case 'symetrie-centrale': return { t: { type: 'symetrie-centrale', c: centre.p }, noms: { centre: nomCentre } }
        case 'rotation': {
          const angle = nombre(T.angle)
          if (angle === null) { this.message('Angle : un nombre de degrés, par exemple 90'); return null }
          return { t: { type: 'rotation', c: centre.p, angle }, noms: { centre: nomCentre } }
        }
        case 'homothetie': {
          const k = nombre(T.k)
          if (!k) { this.message('Rapport : un nombre non nul, par exemple 2, −0,5 ou 1/3'); return null }
          return { t: { type: 'homothetie', c: centre.p, k }, noms: { centre: nomCentre } }
        }
        default: {
          if (T.vecteur !== 'libre') { const v = vecteurs.find(x => x.cle === T.vecteur)!; return { t: { type: 'translation', dx: v.dx, dy: v.dy }, noms: {} } }
          const vx = nombre(T.vx), vy = nombre(T.vy)
          if (vx === null || vy === null) { this.message('Coordonnées : deux nombres, en centimètres'); return null }
          return { t: { type: 'translation', dx: vx * CM, dy: -vy * CM }, noms: {} }       // y vers le haut, comme au cahier
        }
      }
    }
    q('.construire').addEventListener('click', () => {
      const r = transformation(); if (!r) return
      this.section = null
      app.transformer(f, r.t)
    })
    q('.pas-a-pas').addEventListener('click', () => {
      const r = transformation(); if (!r) return
      this.section = null
      app.selection.clear(); this.maj()
      // Une image dont on a repéré la figure : on construit l'image de CETTE
      // figure (ses sommets nommés), et l'image se pose avec elle à la fin
      let source: Forme = f, aussi: Forme[] = []
      const finale = image(f, r.t, app.tableau.moi)
      let imgSource: Forme = finale
      if (f.type === 'image') {
        const liees = app.liees(f.id)
        const pg = liees.find(g => g.type === 'polygone' && g.ferme)
        const points = liees.filter(g => g.type === 'polygone' && !g.ferme && g.pts.length === 2) as Extract<Figure, { type: 'polygone' }>[]
        if (pg) {
          source = pg
          imgSource = { ...image(pg, r.t, app.tableau.moi), lie: finale.id } as Forme
          aussi = [finale, ...liees.filter(g => g !== pg).map(g => ({ ...image(g, r.t, app.tableau.moi), lie: finale.id }) as Forme)]
        } else if (points.length) {
          // Les points placés à la main sur l'image : on construit l'image de
          // chacun, puis l'image se pose sur eux
          const pts = points.map(g => app.sommetsDe(g)[0])
          source = { ...points[0], id: 'source', ...versRelatif(pts), noms: points.map(g => g.noms?.[0] ?? ''), sommets: true } as Forme
          imgSource = finale             // les points A', B'… naissent des étapes, liés à elle
        }
      }
      const noms = source.type === 'polygone' && source.sommets && source.noms ? ' de ' + source.noms.join('') : ''
      const titre = `${types.find(x => x[0] === T.type)![1]} : construction de l'image${noms}.`
      this.constructeur.jouerEtapes(etapesImage(source, r.t, imgSource, r.noms, aussi), titre)
    })
    return s
  }

  // ----- Menu d'un morceau de figure -----
  ouvrirMenuPartie(id: string, prise: Prise, x: number, y: number) {
    this.partie = { id, prise }
    this.construireMenuPartie()
    const m = this.menuPartie
    m.hidden = false
    m.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - m.offsetWidth - 8)) + 'px'
    m.style.top = Math.max(8, Math.min(y + 14, window.innerHeight - m.offsetHeight - 8)) + 'px'
  }

  /** La revue prend tout l'écran : le programme de construction se ferme
   *  d'abord (son clavier passerait avant le sien, et il écrit au tableau).
   *  Un instrument qu'il amenait finit pourtant son trajet à l'image d'après,
   *  et resterait seul sur le tableau : on le range quand le tableau revient
   *  (ou, si la revue n'a rien eu à montrer, deux images plus tard). */
  private ouvrirRevue(b: HTMLElement) {
    const construisait = this.constructeur.ouvert
    if (construisait) this.constructeur.fermer()
    this.fermerMenuPartie()
    const ranger = () => {
      const r = this.app.rendu
      if (this.constructeur.ouvert || !r.instrumentsAnimes.length) return
      r.instrumentsAnimes = []
      r.redessinerInstruments()
    }
    this.revue.ouvrir(b, construisait ? ranger : undefined)
    if (construisait && !this.revue.ouvert) requestAnimationFrame(() => requestAnimationFrame(ranger))
  }

  fermerMenuPartie() {
    if (this.menuPartie.hidden) return
    this.menuPartie.hidden = true
    this.partie = null
  }

  private construireMenuPartie() {
    const app = this.app, m = this.menuPartie
    const f0 = this.partie && app.forme(this.partie.id)
    if (!this.partie || !f0 || (f0.type !== 'polygone' && f0.type !== 'cercle')) return this.fermerMenuPartie()
    const f = f0 as Figure
    const prise = this.partie.prise
    const refaire = () => this.construireMenuPartie()
    m.replaceChildren()

    const titre = document.createElement('h3')
    const ligne = (etiquette: string) => {
      const l = document.createElement('div'); l.className = 'rang-menu'
      const t = document.createElement('span'); t.textContent = etiquette
      l.appendChild(t); m.appendChild(l); return l
    }
    const choix = (l: HTMLElement, nom: string, contenu: string, actif: boolean, faire: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'choix' + (actif ? ' actif' : ''); b.title = nom; b.setAttribute('aria-label', nom)
      b.setAttribute('aria-pressed', String(actif)); b.innerHTML = contenu
      b.addEventListener('click', () => { faire(); refaire() })
      l.appendChild(b); return b
    }
    const couleurs = (l: HTMLElement, actuelle: string | undefined, faire: (c: string | undefined) => void) => {
      choix(l, 'Couleur de la figure', '<span class="meme">=</span>', !actuelle, () => faire(undefined))
      for (const c of COULEURS) choix(l, c.nom, `<span class="rond" style="background:${c.valeur}"></span>`, actuelle === c.valeur, () => faire(c.valeur))
    }
    const icone = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`
    const nomDe = (i: number) => f.noms?.[i]?.replace(/_(\d+)/, '$1') || ''

    if (prise.quoi === 'rayon' && f.type === 'cercle') {
      titre.textContent = 'Rayon'; m.appendChild(titre)
      const l = ligne('r (cm)')
      const champ = Object.assign(document.createElement('input'), { className: 'saisie', inputMode: 'decimal' })
      champ.value = String(Math.round(f.r / CM * 100) / 100).replace('.', ',')
      champ.addEventListener('change', () => {
        const v = nombre(champ.value)
        if (v && v > 0) app.habiller(f, { r: v * CM } as never); else this.message('Rayon : un nombre positif, en centimètres')
      })
      l.appendChild(champ)
      return
    }

    const i = prise.quoi === 'rayon' ? 0 : prise.i
    const ouvert = f.type === 'polygone' && !f.ferme
    const extremite = ouvert && !(f.type === 'polygone' && f.prolonge) && (i === 0 || i === f.pts.length / 2 - 1)
    const nom = nomDe(i)

    if (prise.quoi === 'nom') {
      const st = f.styleNoms?.[i] ?? {}
      titre.textContent = 'Nom ' + nom; m.appendChild(titre)
      const lt = ligne('Texte')
      const champ = Object.assign(document.createElement('input'), { className: 'saisie nom' })
      champ.value = f.noms?.[i] ?? ''
      champ.addEventListener('change', () => { app.renommerPoint(f, i, champ.value); refaire() })
      lt.appendChild(champ)
      couleurs(ligne('Couleur'), st.couleur, c => app.reglerPartie(f, 'styleNoms', i, { couleur: c }))
      const ltaille = ligne('Taille')
      for (const [n, v] of [['Petit', 16], ['Normal', 22], ['Grand', 32]] as const) {
        choix(ltaille, n, `<span style="font-size:${v * 0.62}px">A</span>`, (st.taille ?? 22) === v, () => app.reglerPartie(f, 'styleNoms', i, { taille: v === 22 ? undefined : v }))
      }
      const lstyle = ligne('Style')
      choix(lstyle, 'Italique', '<i>A</i>', !st.droit, () => app.reglerPartie(f, 'styleNoms', i, { droit: undefined }))
      choix(lstyle, 'Droit', 'A', !!st.droit, () => app.reglerPartie(f, 'styleNoms', i, { droit: true }))
      const la = ligne('')
      choix(la, 'Remettre à sa place', 'Replacer', false, () => app.replacerNom(f, i))
      choix(la, 'Masquer ce nom', 'Masquer', false, () => { app.reglerPartie(f, 'styleNoms', i, { cache: true }); this.fermerMenuPartie() })
      return
    }

    // Un point : sommet, extrémité ou centre
    const st = f.stylePoints?.[i] ?? {}
    titre.textContent = (f.type === 'cercle' ? 'Centre ' : f.type === 'polygone' && f.prolonge ? 'Point ' : extremite ? 'Extrémité ' : 'Sommet ') + nom
    m.appendChild(titre)
    const ln = ligne('Nom')
    const champ = Object.assign(document.createElement('input'), { className: 'saisie nom', placeholder: '—' })
    champ.value = f.sommets ? (f.noms?.[i] ?? '') : ''
    champ.addEventListener('change', () => { app.renommerPoint(f, i, champ.value); refaire() })
    ln.appendChild(champ)
    if (f.sommets && f.styleNoms?.[i]?.cache) choix(ln, 'Afficher le nom', 'Afficher', false, () => app.reglerPartie(f, 'styleNoms', i, { cache: undefined }))
    const marqueActuelle = st.marque ?? (f.sommets && f.type === 'polygone' && !(st.bout && st.bout !== 'aucun') ? 'point' : 'aucun')
    const lm = ligne('Point')
    for (const k of MARQUES) choix(lm, k.nom, icone(k.d), marqueActuelle === k.id, () => app.reglerPartie(f, 'stylePoints', i, { marque: k.id }))
    if (extremite) {
      const lb = ligne('Extrémité')
      for (const k of BOUTS) choix(lb, k.nom, icone(k.d), (st.bout ?? 'aucun') === k.id, () => app.reglerPartie(f, 'stylePoints', i, { bout: k.id === 'aucun' ? undefined : k.id }))
    }
    couleurs(ligne('Couleur'), st.couleur, c => app.reglerPartie(f, 'stylePoints', i, { couleur: c }))
    const lt = ligne('Taille')
    for (const [n, v, d] of [['Petit', 0.7, 3], ['Normal', 1, 5], ['Grand', 1.6, 8]] as const) {
      choix(lt, n, `<span class="rond" style="width:${d * 2}px;height:${d * 2}px;background:currentColor"></span>`, (st.taille ?? 1) === v, () => app.reglerPartie(f, 'stylePoints', i, { taille: v === 1 ? undefined : v }))
    }
  }

  message(texte: string) {
    this.toast.textContent = texte
    this.toast.classList.add('visible')
    clearTimeout((this.toast as unknown as { t: number }).t)
    ;(this.toast as unknown as { t: number }).t = window.setTimeout(() => this.toast.classList.remove('visible'), Math.max(2600, texte.length * 60))
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

  /** Une question oui/non, dans l'outil lui-même */
  confirmer(titre: string, texte: string, oui: string): Promise<boolean> {
    return new Promise(resolve => {
      const d = this.nouveauDialogue(titre)
      const corps = d.querySelector('.corps')!
      corps.innerHTML = `<p></p><div class="actions"><button type="button" class="secondaire">Annuler</button><button type="button" class="principal danger-plein"></button></div>`
      corps.querySelector('p')!.textContent = texte
      const b = corps.querySelector('.principal') as HTMLButtonElement
      b.textContent = oui
      let fini = false
      const finir = (v: boolean) => { if (fini) return; fini = true; if (d.open) d.close(); d.remove(); resolve(v) }
      b.addEventListener('click', () => finir(true))
      corps.querySelector('.secondaire')!.addEventListener('click', () => finir(false))
      d.addEventListener('close', () => finir(false))
      d.showModal(); b.focus()
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
      try { champ.value = localStorage.getItem('mem-prenom') || '' } catch { /* navigateur sans mémoire : on redemandera */ }
      const ok = () => {
        const v = champ.value.trim() || 'Élève'
        try { localStorage.setItem('mem-prenom', v) } catch { /* tant pis : le prénom ne sera pas proposé la prochaine fois */ }
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
