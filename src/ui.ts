// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import katex from 'katex'
import type { App, Interface, Prise } from './app'
import { COULEURS, TAILLES, TOUTE_LA_SELECTION, poigneeDuRayon } from './app'
import type { Bout, Figure, Forme, Formule, MarquePoint, Outil, TypeForme } from './types'
import { CM, FONDS } from './types'
import type { P, Transformation } from './formes'
import { centreDe, image, placesDesNoms, sommetsDe, versRelatif } from './formes'
import { etapesImage } from './construction'
import { RevueEnClasse } from './revue/revue'
import { Publication } from './publication/fenetre'
import { Constructeur } from './constructeur'
import { Seance } from './seance'
import type { NomInstrument } from './instruments'
import { INSTRUMENTS } from './instruments'
import type { Menu } from './menus'
import { allerAuxEntrees, basculerMenu, fermerMenu, focusAuClavier, focusNullePart, installerMenus, ouvrirMenu, placerMenu, refaireEnGardantLeFocus } from './menus'
import { choisirGestes, choisirMolette, reglages } from './reglages'
import type { Doigt, Molette } from './reglages'
import { CTRL } from './navigateur'
import { Sauvegarde } from './sauvegarde'
import { zoneEntreBarres } from './camera'
import type { Bords } from './camera'
import { TAILLES_FORMULE, changerCouleur, changerEpaisseur, changerPointilles, habillageCommun, titreDuMenu } from './habillage'
import { icone } from './icones'
import { BarreActions } from './barre-actions'

/** Le rôle du doigt : la marque de son bouton, son titre, ce qu'on en dit */
const DOIGTS: { id: Doigt; nom: string; aide: string; marque: string; titre: string; dit: string }[] = [
  { id: 'dessine', nom: 'Le doigt dessine', aide: 'avec l\'outil choisi, comme le stylet', marque: '✎',
    titre: 'Rôle du doigt : il dessine', dit: 'Le doigt dessine.' },
  { id: 'deplace', nom: 'Le doigt déplace et sélectionne', aide: 'le stylet écrit ; le doigt déplace la vue, prend et déplace les objets', marque: '✥',
    titre: 'Rôle du doigt : il déplace la vue et sélectionne', dit: 'Le doigt déplace la vue et sélectionne ; le stylet écrit.' },
  { id: 'auto', nom: 'Auto', aide: 'le doigt dessine jusqu\'au premier stylet posé sur l\'écran', marque: 'A',
    titre: 'Rôle du doigt : auto (il dessine tant qu\'aucun stylet n\'a touché l\'écran)', dit: 'Auto : le doigt dessine jusqu\'au premier stylet posé sur l\'écran.' },
]

/** Un écran tactile (ou un pointeur grossier) : le doigt a un rôle à régler */
function appareilTactile(): boolean {
  return navigator.maxTouchPoints > 0 || (typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches)
}

const TYPES_FORMES: { id: TypeForme; nom: string; touche: string }[] = [
  { id: 'rectangle', nom: 'Rectangle (Maj : carré)', touche: 'R' },
  { id: 'cercle', nom: 'Cercle, depuis son centre', touche: 'C' },
  { id: 'polygone', nom: 'Polygone : cliquer chaque sommet, revenir au premier pour fermer', touche: 'G' },
]

const FONDS_FIGURE = [...COULEURS, { nom: 'Jaune', valeur: '#e0a800' }]

/** La section ouverte dans le menu complet : celles d'une figure (contour,
 *  fond, transformer) ; « couleur » : la couleur et la taille d'une formule,
 *  la couleur et l'épaisseur de plusieurs objets */
type Section = 'contour' | 'fond' | 'transformer' | 'couleur' | null

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

function bouton(nom: string, titre: string, action: (e: Event) => void, classe = '') {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'bouton ' + classe
  b.innerHTML = icone(nom)
  b.title = titre
  b.setAttribute('aria-label', titre)
  b.addEventListener('click', action)
  return b
}

/** Grise un bouton de la barre (ou le rend), sans toucher au DOM s'il l'est déjà */
function griser(b: HTMLButtonElement, gris: boolean) {
  if (b.disabled === gris) return
  b.disabled = gris
  b.setAttribute('aria-disabled', String(gris))
}

export class UI implements Interface {
  private outils = new Map<Outil, HTMLButtonElement>()
  private pastilles: HTMLButtonElement[] = []
  private tailles: HTMLButtonElement[] = []
  private boutonSupprimer!: HTMLButtonElement
  /** La poubelle de la barre du haut : supprimer la page (l'effacer, seule) */
  private boutonJeter!: HTMLButtonElement
  private boutonAnnuler!: HTMLButtonElement
  private boutonRetablir!: HTMLButtonElement
  private rang!: HTMLSpanElement
  private choixFond!: HTMLSelectElement
  private boutonAimant!: HTMLButtonElement
  private zoomTexte!: HTMLButtonElement
  private barreHaut!: HTMLElement
  private barreZoom!: HTMLElement
  /** Le menu du bouton % : 100 %, tout voir, voir la sélection, la molette */
  private menuZoom!: Menu
  /** « Revenir au contenu », quand plus rien de la page n'est à l'écran */
  private retour!: HTMLButtonElement
  private minuterieRetour = 0
  private barreOutils!: HTMLElement
  private toast!: HTMLDivElement
  /** Ce que montre le message : le dernier message ordinaire, et le dernier
   *  qui porte une action, chacun jusqu'à son échéance (voir message) */
  private toastSimple: { el: HTMLElement; fin: number } | null = null
  private toastAction: { el: HTMLElement; fin: number; cle?: string } | null = null
  private minuterieToast = 0
  private dialogue: HTMLDialogElement | null = null
  private boutonReconnaissance!: HTMLButtonElement
  private choixFormes!: HTMLDivElement
  private choixTraits!: HTMLDivElement
  private boutonsTraits = new Map<string, HTMLButtonElement>()
  private boutonsFormes = new Map<TypeForme, HTMLButtonElement>()
  /** Le menu complet de ce qui est pris : un objet, ou plusieurs (voir majPanneau) */
  private panneau!: HTMLDivElement
  private clePanneau = ''
  private idPanneau = ''
  /** Les objets du menu commun de plusieurs objets, tels qu'il les a montrés :
   *  il se refait quand l'un d'eux change (une forme changée est un nouvel objet) */
  private formesPanneau: Forme[] = []
  private section: Section = null
  private revue!: RevueEnClasse
  private publication!: Publication
  private constructeur!: Constructeur
  private seance!: Seance
  private choixInstruments!: HTMLDivElement
  private boutonInstruments!: HTMLButtonElement
  private boutonsInstruments = new Map<NomInstrument, HTMLButtonElement>()
  private menuPartie!: HTMLDivElement
  private partie: { id: string; prise: Prise } | null = null
  /** Le rôle du doigt : son bouton (sur un appareil tactile) et son menu */
  private boutonDoigt!: HTMLButtonElement
  private menuDoigt!: Menu
  /** Enregistrer le tableau dans un fichier, en ouvrir un : le bouton ⋯ et son menu */
  sauvegarde!: Sauvegarde
  private menuFichier!: Menu
  /** Le menu de la page (un clic droit dans le vide) : il n'a pas de bouton */
  private menuPage!: Menu
  /** La barre d'actions au-dessus de ce qui est pris (voir barre-actions.ts) */
  private barreActions!: BarreActions

  constructor(private app: App, private racine: HTMLElement) {
    // Les menus d'abord : leur Échap passe avant celui des panneaux (voir menus.ts)
    installerMenus()
    this.construire()
    app.ui = this
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
    // Le rôle du doigt, après « Déplacer la vue » : seulement sur un appareil
    // tactile (sur le poste de la classe, souris et tablette graphique, il n'a
    // pas de sens). Il ouvre son menu, à droite de la barre.
    this.boutonDoigt = bouton('doigt', 'Rôle du doigt', e => this.basculerReglageDoigt((e as MouseEvent).detail === 0))
    this.boutonDoigt.setAttribute('aria-haspopup', 'menu'); this.boutonDoigt.setAttribute('aria-expanded', 'false')
    this.boutonDoigt.hidden = !appareilTactile()
    outils.appendChild(this.boutonDoigt)
    const menuDoigt = document.createElement('div')
    menuDoigt.className = 'menu-flottant'; menuDoigt.setAttribute('role', 'menu'); menuDoigt.setAttribute('aria-label', 'Rôle du doigt')
    menuDoigt.hidden = true
    this.menuDoigt = { el: menuDoigt, bouton: this.boutonDoigt }
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
    // Annuler et rétablir n'agissent que sur la page visible : grisés quand
    // elle n'a rien à défaire ou à refaire (ils gardent leur place)
    this.boutonAnnuler = bouton('annuler', `Annuler sur cette page (${CTRL}+Z)`, () => app.annuler())
    this.boutonRetablir = bouton('retablir', `Rétablir sur cette page (${CTRL}+Y)`, () => app.retablir())
    outils.append(this.boutonAnnuler, this.boutonRetablir)
    // La poubelle garde sa place, grisée quand rien n'est choisi : la barre ne
    // saute plus à chaque sélection
    this.boutonSupprimer = bouton('poubelle', 'Supprimer la sélection (Suppr)', () => app.supprimerSelection(), 'danger')
    outils.appendChild(this.boutonSupprimer)
    this.barreOutils = outils
    // Sur un écran bas, la barre défile (voir style.css) : les choix des Formes
    // et du Segment suivent leur bouton, le menu du doigt le sien
    outils.addEventListener('scroll', () => {
      this.maj()
      if (!this.menuDoigt.el.hidden) this.placerMenuDoigt()
    }, { passive: true })

    // ----- Barre des pages, en haut à droite -----
    const haut = document.createElement('div')
    haut.className = 'barre barre-haut'
    this.barreHaut = haut
    const avant = bouton('avant', 'Page précédente (Page ↑)', () => app.pageSuivante(-1))
    this.rang = document.createElement('span'); this.rang.className = 'rang'
    const apres = bouton('apres', 'Page suivante (Page ↓)', () => app.pageSuivante(1))
    const nouvelle = bouton('plus', 'Nouvelle page', () => app.nouvellePage())
    // Pas de question : la page part tout de suite, et s'annule (le message
    // « Page N supprimée · Annuler », ou Ctrl+Z). Le second clic d'un
    // double-clic, et tout clic trop tôt après une suppression, ne font rien :
    // un double-clic jetterait deux pages, et le second message chasserait
    // le premier « Annuler ».
    let jeteeA = -Infinity
    const jeter = this.boutonJeter = bouton('poubelle', 'Supprimer cette page', e => {
      const maintenant = performance.now()
      if ((e as MouseEvent).detail > 1 || maintenant - jeteeA < 600) return
      jeteeA = maintenant
      app.supprimerPage()
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
    // Enregistrer le tableau dans un fichier, en ouvrir un : un menu discret
    // au bout de la barre, sous son bouton, aligné à droite
    this.sauvegarde = new Sauvegarde(app, t => this.message(t), this.racine)
    const fichier = bouton('points', `Enregistrer ou ouvrir un tableau (${CTRL} + S, ${CTRL} + O)`, e => {
      if (menuFichier.hidden) this.construireMenuFichier()
      basculerMenu(this.menuFichier)
      if (menuFichier.hidden) return
      placerMenu(menuFichier, fichier.getBoundingClientRect(), 'dessous')
      if ((e as MouseEvent).detail === 0) menuFichier.querySelector<HTMLElement>('.menu-item')?.focus()
    }, 'points')
    fichier.setAttribute('aria-haspopup', 'menu'); fichier.setAttribute('aria-expanded', 'false')
    const menuFichier = document.createElement('div')
    menuFichier.className = 'menu-flottant menu-large'; menuFichier.setAttribute('role', 'menu'); menuFichier.setAttribute('aria-label', 'Enregistrer ou ouvrir un tableau')
    menuFichier.hidden = true
    this.menuFichier = { el: menuFichier, bouton: fichier }
    haut.append(avant, this.rang, apres, nouvelle, jeter, this.choixFond, this.boutonAimant, this.boutonReconnaissance, importer, this.boutonInstruments, construire, automatismes, revoir, publier, fichier)

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

    // ----- Zoom, en bas à droite -----
    // Le pourcentage ouvre un petit menu : 100 %, tout voir, voir la
    // sélection, et ce que fait la molette de la souris
    const zoom = document.createElement('div')
    zoom.className = 'barre barre-zoom'
    this.barreZoom = zoom
    this.zoomTexte = document.createElement('button')
    this.zoomTexte.type = 'button'; this.zoomTexte.className = 'zoom-texte'; this.zoomTexte.title = 'Zoom et molette de la souris'
    this.zoomTexte.setAttribute('aria-haspopup', 'menu'); this.zoomTexte.setAttribute('aria-expanded', 'false')
    const menu = document.createElement('div')
    menu.className = 'menu-flottant'; menu.setAttribute('role', 'menu'); menu.setAttribute('aria-label', 'Zoom et molette de la souris')
    menu.hidden = true
    this.menuZoom = { el: menu, bouton: this.zoomTexte }
    this.zoomTexte.addEventListener('click', e => {
      if (menu.hidden) this.construireMenuZoom()
      basculerMenu(this.menuZoom)
      if (menu.hidden) return
      placerMenu(menu, zoom.getBoundingClientRect(), 'dessus')
      // Ouvert au clavier : la première entrée prend la main
      if (e.detail === 0) menu.querySelector<HTMLElement>('.menu-item')?.focus()
    })
    zoom.append(bouton('moins', `Dézoomer (${CTRL} + −)`, () => app.zoomer(1 / 1.25)), this.zoomTexte,
      bouton('plus', `Zoomer (${CTRL} + +)`, () => app.zoomer(1.25)), bouton('cadre', 'Tout voir (Maj + 1)', () => app.toutVoir()))

    // ----- Revenir au contenu, quand on s'en est éloigné -----
    this.retour = document.createElement('button')
    this.retour.type = 'button'; this.retour.className = 'retour-contenu'; this.retour.hidden = true
    this.retour.title = 'Tout voir (Maj + 1)'
    this.retour.innerHTML = icone('cadre') + '<span>Revenir au contenu</span>'
    this.retour.addEventListener('click', () => app.toutVoir())

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

    // ----- Le menu complet de ce qui est pris (un objet, ou plusieurs) -----
    this.panneau = document.createElement('div')
    this.panneau.className = 'panneau-forme'
    this.panneau.setAttribute('role', 'toolbar')
    this.panneau.setAttribute('aria-label', 'Options')

    // ----- Le menu de la page, posé là où l'on a appuyé (voir ouvrirMenuPage) -----
    const menuPage = document.createElement('div')
    menuPage.className = 'menu-flottant menu-large'; menuPage.setAttribute('role', 'menu'); menuPage.setAttribute('aria-label', 'Page')
    menuPage.hidden = true
    this.menuPage = { el: menuPage }

    this.racine.append(outils, haut, zoom, this.retour, menu, menuDoigt, menuFichier, menuPage, this.toast, this.choixFormes, this.choixTraits, this.panneau, this.choixInstruments)
    // ----- La barre d'actions, au-dessus de ce qui est pris -----
    // Elle ne recouvre ni la barre d'outils (sauf sur un téléphone, où elle
    // n'y tient pas), ni la barre du haut
    this.barreActions = new BarreActions(app, this.racine, () => ({
      gauche: this.barreOutils.getBoundingClientRect().right,
      haut: this.barreHaut.getBoundingClientRect().bottom,
    }))
    this.revue = new RevueEnClasse(this.app, this.racine)
    this.publication = new Publication(app, this.racine)
    this.constructeur = new Constructeur(app, this.racine, t => this.message(t, undefined, true))
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
    for (const [id, b] of this.outils) b.classList.toggle('actif', app.outil === id)
    const doigt = DOIGTS.find(d => d.id === reglages.doigt)!
    if (this.boutonDoigt.dataset.badge !== doigt.marque) this.boutonDoigt.dataset.badge = doigt.marque
    const titre = doigt.id === 'auto' && reglages.styletDirect ? 'Rôle du doigt : auto (stylet détecté : il déplace la vue)' : doigt.titre
    if (this.boutonDoigt.title !== titre) { this.boutonDoigt.title = titre; this.boutonDoigt.setAttribute('aria-label', titre) }
    this.pastilles.forEach((b, i) => b.classList.toggle('actif', COULEURS[i].valeur === app.couleur))
    this.tailles.forEach((b, i) => b.classList.toggle('actif', TAILLES[i].valeur === app.taille))
    const rien = !(app.selection.size || app.partie)
    griser(this.boutonSupprimer, rien)
    griser(this.boutonAnnuler, !app.peutAnnuler())
    griser(this.boutonRetablir, !app.peutRetablir())

    const pages = app.pages, i = pages.indexOf(app.page)
    this.rang.textContent = pages.length ? `${i + 1} / ${pages.length}` : '…'
    const titreJeter = pages.length <= 1 ? 'Effacer la page' : 'Supprimer cette page'
    if (this.boutonJeter.title !== titreJeter) { this.boutonJeter.title = titreJeter; this.boutonJeter.setAttribute('aria-label', titreJeter) }
    this.choixFond.value = app.fond
    this.boutonAimant.classList.toggle('actif', app.aimant)
    this.boutonReconnaissance.classList.toggle('actif', app.reconnaissance)
    for (const [id, b] of this.boutonsFormes) b.classList.toggle('actif', app.typeForme === id)
    for (const [id, b] of this.boutonsTraits) b.classList.toggle('actif', app.typeTrait === id)
    // Le petit panneau à côté de l'outil choisi (Formes ou Segment)
    for (const [panneau, outil] of [[this.choixFormes, 'forme'], [this.choixTraits, 'segment']] as const) {
      panneau.hidden = app.outil !== outil
      if (panneau.hidden) continue
      const r = this.outils.get(outil)!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, r.top - 6) + 'px'
    }
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
    this.majMenuPartie()
    this.zoomTexte.textContent = Math.round(app.cam.z * 100) + ' %'
    this.majRetour()
    // Après le menu complet : elle ne paraît que s'il est fermé
    this.barreActions.maj()
  }

  /** Ferme ce qui flotte au-dessus du tableau : le petit menu ouvert, le menu
   *  d'un morceau (le morceau n'est plus choisi), le panneau d'options, la
   *  liste des instruments. Vrai si quelque chose était ouvert : l'appui sur
   *  le tableau qui l'a fermé ne fait rien d'autre (voir App.bas).
   *  garderOptions : l'appui prend l'objet même du panneau, qui reste. */
  fermerMenus(garderOptions = false): boolean {
    const app = this.app
    let ferme = fermerMenu()
    if (!this.menuPartie.hidden) { this.fermerMenuPartie(); app.choisirPartie(null); ferme = true }
    if (!garderOptions) {
      if (!this.panneau.hidden) ferme = true
      app.options = null
    }
    if (!this.choixInstruments.hidden) { this.choixInstruments.hidden = true; ferme = true }
    if (ferme) this.maj()
    return ferme
  }

  /** Le clavier dans le menu complet ou le menu d'un morceau de figure,
   *  ouverts au clic droit, à l'appui long, au double-clic ou par
   *  « Options », comme dans le menu du système (les petits menus, celui de
   *  la page compris, font de même : voir menus.ts) :
   *  - le focus hors du menu (sur la page après un clic droit, ou sur un
   *    bouton) : ↓, → et Début mènent à sa première entrée ; ↑, ← et Fin à
   *    la dernière ; Tab et Maj+Tab aussi, depuis la page seulement (depuis
   *    un bouton, Tab passe au suivant comme d'habitude) ;
   *  - dans le menu : les flèches passent d'un bouton à l'autre, en
   *    tournant (pas par ses champs, que Tab atteint : voir BOUTONS) ;
   *    Début et Fin vont aux bouts ; Espace appuie sur le bouton
   *    (au relâcher, comme partout) au lieu d'armer « Espace + glisser »,
   *    si le focus y est venu du clavier (après un clic sur un bouton du
   *    menu, Espace + glisser déplace toujours la vue).
   *  L'objet n'est donc pas poussé, ni la vue déplacée, tant que le menu est
   *  ouvert : sans menu, les flèches font comme avant. Un champ de saisie du
   *  menu garde ses touches (App.clavier ne l'écoute pas). */
  clavierMenu(e: KeyboardEvent): boolean {
    if (e.ctrlKey || e.metaKey || e.altKey) return false
    const m = !this.menuPartie.hidden ? this.menuPartie : !this.panneau.hidden ? this.panneau : null
    if (!m) return false
    const dedans = m.contains(document.activeElement)
    if (dedans && e.key === ' ' && focusAuClavier(document.activeElement)) return true
    const fleches: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -Infinity, End: Infinity }
    const sens = fleches[e.key] ?? (e.key === 'Tab' && !dedans && focusNullePart() ? (e.shiftKey ? -1 : 1) : undefined)
    if (sens === undefined || !allerAuxEntrees(m, sens)) return false
    e.preventDefault()
    return true
  }

  entrerDansMenu() {
    if (!this.panneau.hidden) allerAuxEntrees(this.panneau, -Infinity)
  }

  /** Ce qu'on voit du tableau entre les barres, en coordonnées de la zone :
   *  c'est là que « Tout voir » cadre la page (voir zoneEntreBarres) */
  zoneLibre() {
    const z = this.app.rendu.scene.getBoundingClientRect()
    const bords = (el: HTMLElement): Bords | null => {
      const r = el.getBoundingClientRect()
      return r.width && r.height ? { left: r.left - z.left, top: r.top - z.top, right: r.right - z.left, bottom: r.bottom - z.top } : null
    }
    return zoneEntreBarres(z.width, z.height, { outils: bords(this.barreOutils), haut: bords(this.barreHaut), zoom: bords(this.barreZoom) })
  }

  /** La pastille « Revenir au contenu » : elle paraît une seconde après qu'on
   *  a perdu de vue tout ce qui est écrit, et part dès qu'on le retrouve */
  private majRetour() {
    const app = this.app
    if (app.enLecture || !app.contenuHorsVue()) {
      clearTimeout(this.minuterieRetour); this.minuterieRetour = 0
      this.retour.hidden = true
      return
    }
    if (!this.retour.hidden || this.minuterieRetour) return
    this.minuterieRetour = window.setTimeout(() => {
      this.minuterieRetour = 0
      if (!app.enLecture && app.contenuHorsVue()) this.retour.hidden = false
    }, 1000)
  }

  /** Une entrée d'un petit menu : un choix fait le ferme, puis agit. coche :
   *  un choix parmi d'autres (menuitemradio), coché ou non ; avec caseACocher,
   *  un réglage qu'on allume ou qu'on coupe (menuitemcheckbox). */
  private entreeMenu(m: HTMLElement, texte: string, faire: () => void, o: { touche?: string; aide?: string; coche?: boolean; caseACocher?: boolean; inactif?: boolean } = {}) {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'menu-item'
    b.setAttribute('role', o.coche === undefined ? 'menuitem' : o.caseACocher ? 'menuitemcheckbox' : 'menuitemradio')
    if (o.coche !== undefined) b.setAttribute('aria-checked', String(o.coche))
    if (o.inactif) b.setAttribute('aria-disabled', 'true')
    b.innerHTML = `<span class="coche">${o.coche ? icone('coche') : ''}</span><span class="libelle"></span>` + (o.touche ? `<span class="touche">${html(o.touche)}</span>` : '')
    const libelle = b.querySelector('.libelle')!
    libelle.textContent = texte
    if (o.aide) libelle.appendChild(Object.assign(document.createElement('small'), { textContent: o.aide }))
    b.addEventListener('click', () => {
      if (o.inactif) return
      fermerMenu()
      faire()
    })
    m.appendChild(b)
  }

  /** Le menu du zoom, refait à chaque ouverture (la sélection a pu changer) */
  private construireMenuZoom() {
    const app = this.app, m = this.menuZoom.el
    m.replaceChildren()
    const entree = (texte: string, faire: () => void, o: Parameters<UI['entreeMenu']>[3] = {}) => this.entreeMenu(m, texte, faire, o)
    const rien = !app.selection.size && !app.partie
    entree('100 %', () => app.zoom100(), { touche: `${CTRL} + 0` })
    entree('Tout voir', () => app.toutVoir(), { touche: 'Maj + 1' })
    entree('Voir la sélection', () => app.voirSelection(), { touche: 'Maj + 2', inactif: rien })
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Molette de la souris' }))
    const molette = (choix: Molette, texte: string, aide?: string) => entree(texte, () => {
      choisirMolette(choix)
      this.message(choix === 'defile' ? `La molette fait défiler la page ; ${CTRL} + molette zoome.`
        : 'La molette zoome (comme dans GeoGebra) ; Maj + molette fait défiler.')
    }, { coche: reglages.molette === choix, aide })
    molette('defile', 'Fait défiler', `${CTRL} + molette : zoomer`)
    molette('zoome', 'Zoome')
  }

  /** Le menu du bouton ⋯, refait à chaque ouverture (la date du dernier
   *  enregistrement a pu changer) */
  private construireMenuFichier() {
    const m = this.menuFichier.el, s = this.sauvegarde
    m.replaceChildren()
    this.entreeMenu(m, 'Enregistrer le tableau…', () => void s.enregistrer(), { touche: `${CTRL} + S`,
      aide: 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder sur la clé ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).' })
    this.entreeMenu(m, 'Ouvrir un tableau…', () => s.ouvrir(), { touche: `${CTRL} + O`,
      aide: 'Remplace le tableau de ce navigateur par celui d\'un fichier .memc.' })
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    m.appendChild(Object.assign(document.createElement('p'), { className: 'menu-note', textContent: s.etat() }))
  }

  /** Un fichier glissé sur le tableau (.memc, ou .mem) : comme « Ouvrir un tableau » */
  ouvrirTableau(f: File) { void this.sauvegarde.ouvrirFichier(f) }

  /** Le menu de la page : un clic droit dans le vide (voir App.demanderOptions).
   *  Il se pose au point de l'appui, à sa droite et vers le bas comme le
   *  menu du système (de l'autre côté s'il n'y a pas la place), et se ferme
   *  comme les autres petits menus : Échap, un choix, ou un appui ailleurs
   *  (qui ne laisse pas d'encre). m : le point du monde où « Coller ici »
   *  colle. Refait à chaque ouverture : la copie et la page ont pu changer. */
  ouvrirMenuPage(x: number, y: number, m: P) {
    const app = this.app, el = this.menuPage.el
    el.replaceChildren()
    this.entreeMenu(el, 'Coller ici', () => app.coller(m), { touche: `${CTRL} + V`, inactif: !app.peutColler(),
      aide: `Le dernier objet copié dans MEM ; ${CTRL} + V colle aussi une image ou ce qu'on a copié dans une autre version de MEM` })
    this.entreeMenu(el, 'Tout sélectionner', () => app.toutSelectionner(), { touche: `${CTRL} + A`, inactif: app.pageVide() })
    this.entreeMenu(el, 'Tout voir', () => app.toutVoir(), { touche: 'Maj + 1' })
    ouvrirMenu(this.menuPage)
    placerMenu(el, new DOMRect(x, y, 0, 0), 'droite')
  }

  /** Le menu du rôle du doigt : ouvert par son bouton, ou par « Changer »
   *  dans le message « Stylet détecté » */
  ouvrirReglageDoigt() {
    if (this.menuDoigt.el.hidden) this.basculerReglageDoigt(false)
  }

  private basculerReglageDoigt(auClavier: boolean) {
    const m = this.menuDoigt.el
    // Un stylet s'est posé sur l'écran : il est tactile, le bouton a sa place
    this.boutonDoigt.hidden = false
    if (m.hidden) this.construireMenuDoigt()
    basculerMenu(this.menuDoigt)
    if (m.hidden) return
    this.placerMenuDoigt()
    if (auClavier) m.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  }

  /** Le menu du doigt, à droite de la barre, à la hauteur de son bouton */
  private placerMenuDoigt() {
    const b = this.boutonDoigt.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuDoigt.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
  }

  private construireMenuDoigt() {
    const m = this.menuDoigt.el
    m.replaceChildren()
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Le doigt' }))
    for (const d of DOIGTS) {
      const aide = d.id === 'auto' && reglages.styletDirect ? 'stylet détecté : le doigt déplace la vue' : d.aide
      this.entreeMenu(m, d.nom, () => { this.app.choisirDoigt(d.id); this.message(d.dit) }, { coche: reglages.doigt === d.id, aide })
    }
    // Le toucher à deux doigts qui annule (à trois, qui rétablit) : allumé au
    // départ sur un écran tactile ; au TNI, une manche ou une paume peut en
    // faire un, on le coupe ici
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    m.appendChild(Object.assign(document.createElement('div'), { className: 'menu-titre', textContent: 'Gestes' }))
    this.entreeMenu(m, 'Deux doigts : annuler', () => {
      choisirGestes(!reglages.gestes)
      this.message(reglages.gestes ? 'Toucher à deux doigts : annuler ; à trois : rétablir.' : 'Gestes à deux et trois doigts coupés.')
    }, { coche: reglages.gestes, caseACocher: true, aide: 'trois doigts : rétablir · un toucher bref' })
  }

  // ----- Le menu complet de ce qui est pris -----
  /** Le menu complet (le panneau sous le nom d'avant) : celui de l'objet seul
   *  sélectionné dont app.options est l'identifiant, ou le menu commun d'une
   *  sélection de plusieurs objets (app.options vaut TOUTE_LA_SELECTION). Il
   *  se ferme dès que ce qu'il règle n'est plus choisi, se cache pendant
   *  qu'on le déplace (formeChoisie, formesChoisies) et revient au lâcher. */
  private majPanneau() {
    const app = this.app
    const plusieurs = app.options === TOUTE_LA_SELECTION
    if (plusieurs ? app.selection.size < 2 : app.options && !(app.selection.size === 1 && app.selection.has(app.options))) app.options = null
    let formes: Forme[] | null = null
    if (!app.enLecture && plusieurs) formes = app.formesChoisies()
    else if (!app.enLecture && app.options) { const f = app.formeChoisie(); if (f && f.id === app.options) formes = [f] }
    if (!formes?.length) { this.panneau.hidden = true; this.clePanneau = ''; this.formesPanneau = []; return }
    const id = plusieurs ? TOUTE_LA_SELECTION + formes.map(f => f.id).join(',') : formes[0].id
    if (id !== this.idPanneau) { this.idPanneau = id; this.section = null }
    if (plusieurs) {
      // Plusieurs objets : on refait le menu quand l'un d'eux a changé (une
      // forme changée, même déplacée, est un nouvel objet) ; comparer les
      // objets eux-mêmes ne coûte rien, même sur mille traits sélectionnés
      const cle = TOUTE_LA_SELECTION + '|' + this.section
      if (cle !== this.clePanneau || formes.length !== this.formesPanneau.length || formes.some((f, i) => f !== this.formesPanneau[i])) {
        refaireEnGardantLeFocus(this.panneau, () => this.construireMenuPlusieurs(formes!)); this.clePanneau = cle; this.formesPanneau = formes
      }
    } else {
      // Un objet : on ne reconstruit que s'il a changé (sauf sa place) : sinon
      // un champ en cours de saisie perdrait le curseur à chaque mise à jour
      const { x: _x, y: _y, ...props } = formes[0]
      const cle = JSON.stringify(props) + '|' + this.section
      if (cle !== this.clePanneau) { const f = formes[0]; refaireEnGardantLeFocus(this.panneau, () => this.construirePanneau(f)); this.clePanneau = cle; this.formesPanneau = [] }
    }
    this.panneau.hidden = false
    // Au-dessus de ce qu'il règle (toute la sélection), ou en dessous s'il
    // n'y a pas la place
    const b = plusieurs ? app.boiteDuContenu(formes) : app.rendu.boite(formes[0])
    if (!b) return
    const cam = app.cam, z = app.rendu.scene.getBoundingClientRect()
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const l = this.panneau.offsetWidth, h = this.panneau.offsetHeight
    let top = z.top + a.y - h - 14
    if (top < 76) top = Math.min(z.top + c.y + 14, window.innerHeight - h - 8)
    const gauche = this.barreOutils.getBoundingClientRect().right + 8
    const left = Math.max(gauche, Math.min(z.left + (a.x + c.x) / 2 - l / 2, window.innerWidth - l - 8))
    this.panneau.style.left = left + 'px'
    this.panneau.style.top = Math.max(8, top) + 'px'
  }

  /** Un bouton texte du menu, dans sa ligne */
  private optionMenu(ligne: HTMLElement, texte: string, titre: string, faire: () => void, actif = false) {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'option' + (actif ? ' actif' : ''); b.textContent = texte; b.title = titre
    b.setAttribute('aria-pressed', String(actif))
    b.addEventListener('click', faire)
    ligne.appendChild(b)
    return b
  }

  /** Ouvre (ou referme) une section du menu, qui se refait aussitôt */
  private basculerSection(s: Section) {
    this.section = this.section === s ? null : s
    this.clePanneau = ''
    this.maj()
  }

  private construirePanneau(f: Forme) {
    const app = this.app
    const p = this.panneau
    p.replaceChildren()
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const action = (texte: string, titre: string, faire: () => void, actif = false) => this.optionMenu(ligne, texte, titre, faire, actif)
    const ouvrir = (s: Section) => this.basculerSection(s)
    const figure = f.type === 'polygone' || f.type === 'cercle' ? f as Figure : null
    const segment = f.type === 'polygone' && !f.ferme && f.pts.length === 4
    const copier = () => action('Copier', `Copier (${CTRL}+C) : ${CTRL}+V la colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
    const jeter = () => ligne.appendChild(bouton('poubelle', 'Supprimer (Suppr)', () => app.supprimerSelection(), 'danger'))

    if (f.type === 'formule') {
      // Une formule : la modifier (comme son double-clic), sa couleur et sa
      // taille. Pas de « Transformer » : l'image d'une formule n'en déplace
      // que le coin, sans la tourner ni la retourner.
      p.setAttribute('aria-label', titreDuMenu(f))
      action('Modifier', 'Modifier la formule (double-clic)', () => app.modifierFormule(f))
      action('Couleur et taille', 'La couleur et la taille des caractères', () => ouvrir('couleur'), this.section === 'couleur')
      action('Dupliquer', `Une copie, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
      copier(); jeter()
      p.appendChild(ligne)
      if (this.section === 'couleur') p.appendChild(this.sectionFormule(f))
      return
    }
    // Le nom de ce qu'il règle : du trait, de l'image, du segment, du cercle…
    p.setAttribute('aria-label', titreDuMenu(f))

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
    action('Dupliquer', `Une copie, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
    copier(); jeter()
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

  /** Une pastille de couleur du menu (active : la couleur de l'objet, ou de tous) */
  private pastilleMenu(s: HTMLElement, c: { nom: string; valeur: string }, actif: boolean, faire: () => void) {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'pastille' + (actif ? ' actif' : ''); b.title = c.nom; b.setAttribute('aria-label', c.nom)
    b.setAttribute('aria-pressed', String(actif))
    b.style.setProperty('--teinte', c.valeur)
    b.addEventListener('click', faire)
    s.appendChild(b)
  }

  /** La couleur et la taille d'une formule : les quatre couleurs de la barre,
   *  et trois tailles de caractères */
  private sectionFormule(f: Formule) {
    const app = this.app
    const s = document.createElement('div'); s.className = 'section'
    for (const c of COULEURS) this.pastilleMenu(s, c, f.couleur === c.valeur, () => app.habiller(f, { couleur: c.valeur }))
    for (const t of TAILLES_FORMULE) this.optionMenu(s, t.nom, t.titre, () => app.habiller(f, { taille: t.valeur }), f.taille === t.valeur)
    return s
  }

  /** Le menu commun d'une sélection de plusieurs objets : « N objets » en
   *  tête, puis ce qu'on fait à tous d'un coup. Chaque action fait UNE étape
   *  d'annulation, quel que soit le nombre d'objets. */
  private construireMenuPlusieurs(formes: Forme[]) {
    const app = this.app, p = this.panneau
    p.replaceChildren()
    const n = formes.length
    p.setAttribute('aria-label', `Options des ${n} objets`)
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const titre = document.createElement('span'); titre.className = 'titre-selection'; titre.textContent = `${n} objets`
    ligne.appendChild(titre)
    const commun = habillageCommun(formes, TAILLES.map(t => t.valeur))
    // Des formules seules n'ont pas d'épaisseur, des images rien à régler
    if (commun.couleurs || commun.epaisseurs) {
      const texte = commun.epaisseurs ? 'Couleur, épaisseur' : 'Couleur'
      this.optionMenu(ligne, texte, commun.epaisseurs ? 'La couleur, l\'épaisseur et les pointillés de tous' : 'La couleur de tous', () => this.basculerSection('couleur'), this.section === 'couleur')
    }
    this.optionMenu(ligne, 'Dupliquer', `Une copie de tous, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
    this.optionMenu(ligne, 'Copier', `Copier (${CTRL}+C) : ${CTRL}+V les colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
    this.optionMenu(ligne, 'Couper', `Couper (${CTRL}+X) : ils partent, ${CTRL}+V les remet`, () => app.couper())
    ligne.appendChild(bouton('poubelle', `Supprimer les ${n} objets (Suppr)`, () => app.supprimerSelection(), 'danger'))
    p.appendChild(ligne)
    if (this.section !== 'couleur') return

    // Seulement ce que le code sait appliquer à chacun : la couleur (pas à une
    // image), l'épaisseur (traits et figures ; un trait de surligneur garde sa
    // largeur de surligneur), les pointillés (les figures). Un choix est
    // actif quand tous les objets qu'il concerne l'ont.
    const s = document.createElement('div'); s.className = 'section'
    if (commun.couleurs) for (const c of COULEURS) this.pastilleMenu(s, c, commun.couleur === c.valeur, () => app.habillerSelection(changerCouleur(c.valeur)))
    if (commun.epaisseurs) TAILLES.forEach((t, i) => {
      const actif = commun.taille === t.valeur
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'taille' + (actif ? ' actif' : ''); b.title = t.nom
      b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase()); b.setAttribute('aria-pressed', String(actif))
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => app.habillerSelection(changerEpaisseur(t.valeur)))
      s.appendChild(b)
    })
    if (commun.pointilles !== null) this.optionMenu(s, 'Pointillés', 'Les figures en pointillés', () => app.habillerSelection(changerPointilles(!commun.pointilles)), commun.pointilles)
    p.appendChild(s)
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
        <button type="button" class="secondaire petit designer-axe" title="Cliquer sur une droite de la page"${axes.length ? '' : ' hidden'}>Désigner</button>
        <button type="button" class="secondaire petit tracer-axe" title="Tracer l'axe sur la page (deux clics)">Tracer</button></div>
      <div class="champ choix-sur-tableau" data-pour="symetrie-centrale rotation homothetie"><span>Centre</span>
        <select class="t-centre">${options(centres, T.centre)}</select>
        <button type="button" class="secondaire petit designer-centre" title="Cliquer sur un point de la page">Désigner</button>
        <button type="button" class="secondaire petit tracer-centre" title="Placer le centre sur la page (un clic)">Tracer</button></div>
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
          if (!a) { this.message('Choisis l\'axe : désigne une droite de la page, ou trace-la.'); return null }
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
  /** Le menu s'ouvre collé au morceau (x, y : le pointeur, s'il fallait) */
  ouvrirMenuPartie(id: string, prise: Prise, x: number, y: number) {
    this.partie = { id, prise }
    if (!this.ancrePartie()) { this.partie = null; return }
    this.construireMenuPartie()
    this.menuPartie.hidden = false
    this.placerMenuPartie(x, y)
  }

  /** Où est, dans le monde, le morceau dont le menu est ouvert : un sommet,
   *  le centre ou le rayon d'un cercle, un nom (null : il n'existe plus) */
  private ancrePartie(): P | null {
    const p = this.partie, f = p && this.app.forme(p.id)
    if (!p || !f || (f.type !== 'polygone' && f.type !== 'cercle')) return null
    const pr = p.prise
    if (pr.quoi === 'rayon') return f.type === 'cercle' ? poigneeDuRayon(f) : null
    if (pr.quoi === 'nom') return placesDesNoms(f)[pr.i] ?? null
    return f.type === 'cercle' ? { x: f.x, y: f.y } : sommetsDe(f)[pr.i] ?? null
  }

  /** Le menu suit son morceau quand la vue bouge (zoom, déplacement), à
   *  14 px en bas à droite, sans sortir de la fenêtre */
  private placerMenuPartie(x?: number, y?: number) {
    const m = this.menuPartie, a = this.ancrePartie()
    if (a) {
      const z = this.app.rendu.scene.getBoundingClientRect(), e = this.app.cam.versEcran(a.x, a.y)
      x = z.left + e.x; y = z.top + e.y
    }
    if (x === undefined || y === undefined) return
    m.style.left = Math.max(8, Math.min(x + 14, window.innerWidth - m.offsetWidth - 8)) + 'px'
    m.style.top = Math.max(8, Math.min(y + 14, window.innerHeight - m.offsetHeight - 8)) + 'px'
  }

  /** À chaque mise à jour : le menu ouvert suit son morceau ; il se ferme si
   *  le morceau n'est plus choisi, ou n'existe plus (une annulation l'a ôté) */
  private majMenuPartie() {
    if (this.menuPartie.hidden) return
    const p = this.partie, a = this.app.partie
    const meme = !!p && !!a && a.id === p.id && a.prise.quoi === p.prise.quoi
      && (a.prise.quoi === 'rayon' || p.prise.quoi === 'rayon' || a.prise.i === p.prise.i)
    if (!meme || !this.ancrePartie()) { this.fermerMenuPartie(); return }
    this.placerMenuPartie()
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
    // La barre d'actions et le menu complet n'ont rien à faire pendant la revue
    this.maj()
  }

  fermerMenuPartie() {
    if (this.menuPartie.hidden) return
    this.menuPartie.hidden = true
    this.partie = null
  }

  /** Le menu d'un morceau, refait à chaque choix : le focus qui y était
   *  (un choix fait au clavier) y reste */
  private construireMenuPartie() {
    refaireEnGardantLeFocus(this.menuPartie, () => this.remplirMenuPartie())
  }

  private remplirMenuPartie() {
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

  /** Un message en bas de l'écran. Avec une action, un bouton suit le texte
   *  (« Changer ») et le message reste 7 s ; seul ce bouton reçoit les appuis,
   *  et seulement quand le message se voit. Il passe sous les menus et les
   *  panneaux (il ne cache pas ce qu'on va toucher), sauf pendant la revue
   *  et la séance d'automatismes, qui couvrent tout, et pour le programme de
   *  construction (dessus), dont le panneau prend presque tout l'écran d'une
   *  tablette.
   *  Un message ordinaire ne chasse pas un message à action encore à l'écran
   *  (« Stylet détecté … Changer », que suit souvent la figure reconnue du
   *  premier trait) : il s'écrit au-dessus de lui, et s'en va seul.
   *  Pendant la revue, un message à action ne se montre pas, et son bouton ne
   *  fait rien : un message ordinaire (F5, que la télécommande envoie) passe
   *  au-dessus de la revue, et « Annuler » d'une page qu'on vient de jeter
   *  écrirait alors dans le tableau, que la revue ne doit jamais changer. */
  message(texte: string, action?: { libelle: string; faire: () => void; cle?: string }, dessus = false) {
    this.toast.classList.toggle('dessus', dessus || this.app.enLecture)
    const el = document.createElement('span')
    el.className = 'ligne'
    el.append(texte)
    const maintenant = performance.now()
    if (action) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'action'; b.textContent = action.libelle
      b.addEventListener('click', () => {
        if (this.app.enLecture) return
        this.toastSimple = this.toastAction = null
        this.majToast()
        action.faire()
      })
      el.appendChild(b)
      this.toastAction = { el, fin: maintenant + 7000, cle: action.cle }
      this.toastSimple = null
    } else {
      this.toastSimple = { el, fin: maintenant + Math.max(2600, texte.length * 60) }
    }
    this.majToast()
  }

  /** Le message à action de cette clé s'en va, s'il est encore là : son
   *  bouton n'a plus rien à faire (la page qu'il rendait est revenue) */
  oublierAction(cle: string) {
    if (this.toastAction?.cle !== cle) return
    this.toastAction = null
    this.majToast()
  }

  /** Le message montre ce qui n'a pas encore passé son échéance ; plus rien,
   *  il s'efface (son texte reste le temps du fondu) */
  private majToast() {
    clearTimeout(this.minuterieToast)
    const maintenant = performance.now()
    if (this.toastSimple && this.toastSimple.fin <= maintenant) this.toastSimple = null
    if (this.toastAction && this.toastAction.fin <= maintenant) this.toastAction = null
    const parts = [this.toastSimple, this.app.enLecture ? null : this.toastAction].filter(p => p !== null)
    if (!parts.length) { this.toast.classList.remove('visible'); return }
    this.toast.replaceChildren(...parts.map(p => p.el))
    this.toast.classList.add('visible')
    this.minuterieToast = window.setTimeout(() => this.majToast(), Math.min(...parts.map(p => p.fin)) - maintenant)
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
      // Fermé (validé ou non), la barre d'actions revient sur la formule
      const finir = (v: string | null) => { if (fini) return; fini = true; d.close(); d.remove(); this.maj(); resolve(v) }
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
      // Ouvert, la barre d'actions s'efface : elle couvrirait la formule
      this.maj()
      montrer()
      saisie.focus()
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
