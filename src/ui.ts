// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import type { CoursPropose } from './seance-preparee-vue'
import type { App, Interface, Prise } from './app'
import { COULEURS } from './app'
import type { Bout, Forme, MarquePoint, Outil, TypeForme } from './types'
import type { Fond } from './types'
import { RevueEnClasse } from './revue/revue'
import { Publication } from './publication/fenetre'
import { Catalogue } from './catalogue-vue'
import { Constructeur } from './constructeur'
import { Flash } from './flash'
import type { NomInstrument } from './instruments'
import { OutilsDeClasse } from './outils-classe'
import type { ClasseurCherche, Destination } from './recherche-vue'
import { FenetreRecherche } from './recherche-vue'
import type { ContenuClasseur } from './recherche'
import type { Menu } from './menus'
import { ENTREES, allerAuxEntrees, basculerMenu, installerMenus, placerMenu } from './menus'
import { reglages } from './reglages'
import type { Doigt } from './reglages'
import { CTRL, TELEPHONE, tableauCache } from './navigateur'
import { Sauvegarde } from './sauvegarde'
import { icone } from './icones'
import { BarreActions } from './barre-actions'
import { Apercus } from './sorties/apercu'
import { VignetteEnonce } from './enonce'
import { Vignettes } from './pages/vignettes'
import { Trieuse } from './pages/trieuse'
import type { TypePointeur } from './pointeurs'
import type { Surveillance } from './classeurs/surveillance'
import type { ActionEtat } from './classeurs/etat'
import type { EnregistrementCle } from './classeurs/cle'
import type { CopieDrive } from './classeurs/copie-drive'
import type { Bibliotheque } from './classeurs/bibliotheque'
import type { Fichiers } from './classeurs/fichiers'
import { BandeauxSeances } from './seances-vue'
import { ajouterMethodes } from './methodes'
import { methodesConstruction } from './ui/construction'
import { methodesPlacements } from './ui/placements'
import { methodesMenus } from './ui/menus'
import { methodesClasseur } from './ui/classeur'
import { methodesBarres } from './ui/barres'
import { methodesMenuComplet } from './ui/menu-complet'
import { methodesFiguresFormules } from './ui/figures-formules'

/** Le rôle du doigt : la marque de son bouton, son titre, ce qu'on en dit */
export const DOIGTS: { id: Doigt; nom: string; aide: string; marque: string; titre: string; dit: string }[] = [
  { id: 'dessine', nom: 'Le doigt dessine', aide: 'avec l\'outil choisi, comme le stylet', marque: '✎',
    titre: 'Rôle du doigt : il dessine', dit: 'Le doigt dessine.' },
  { id: 'deplace', nom: 'Le doigt déplace et sélectionne', aide: 'le stylet écrit ; le doigt déplace la vue, prend et déplace les objets', marque: '✥',
    titre: 'Rôle du doigt : il déplace la vue et sélectionne', dit: 'Le doigt déplace la vue et sélectionne ; le stylet écrit.' },
  { id: 'auto', nom: 'Auto', aide: 'le doigt dessine jusqu\'au premier stylet posé sur l\'écran', marque: 'A',
    titre: 'Rôle du doigt : auto (il dessine tant qu\'aucun stylet n\'a touché l\'écran)', dit: 'Auto : le doigt dessine jusqu\'au premier stylet posé sur l\'écran.' },
]

/** L'aide de « Copier en image » (le menu ⋯ du menu complet) */
export const TITRE_IMAGE = 'Une image PNG, à coller dans l\'ENT ou Pronote'
/** L'aide de « Envoyer vers… » (le menu ⋯ du menu complet ; pas dans la
 *  barre d'actions, qui garde les gestes de tous les jours : « Options » y mène) */
export const TITRE_ENVOI = 'Déplacer ou copier sur une autre page'
/** Le titre du bouton ⋯ du menu complet, qui ouvre le menu de ces deux-là
 *  et, depuis le lot 5, de l'ordre (premier plan, avancer, reculer,
 *  arrière-plan) et de « Protéger » (verrouiller, fixer en fond) */
const TITRE_PLUS = 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page, premier plan, arrière-plan, verrouiller'
/** Le même bouton ⋯, dans le menu court d'un objet verrouillé (lot 5) */
export const TITRE_PLUS_VERROUILLE = 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page'

/** Le menu du bouton ⋯ de la barre du haut, et ce qu'il a : le classeur, et
 *  depuis le lot 5 les réglages de cet appareil (« Contraste renforcé »,
 *  « Noms sous les outils ») ; son titre, son nom lu et celui de son menu le
 *  disent (vérification « conformité » du lot 5 : on n'y cherchait pas le
 *  contraste du vidéoprojecteur). Sous son icône, son nom court reste
 *  « Fichier » : c'est là, comme Fichier → Options d'un traitement de
 *  texte, que l'on cherche les réglages. */
export const MENU_FICHIER = 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil'
/** Le bouton ⋯ de la barre du haut */
/** Les séances au menu du classeur ; les autres : « Toutes les séances… » */
export const SEANCES_AU_MENU = 6
export const TITRE_FICHIER = `${MENU_FICHIER} (${CTRL} + S, ${CTRL} + O, ${CTRL} + P)`
/** Le même bouton ⋯, au téléphone (lot 5, K10) : « Plus », qui a aussi tout
 *  ce que la barre du haut n'y montre pas */
export const TITRE_PLUS_TELEPHONE = 'Plus : la page, les outils de cours, le classeur, cet appareil'
/** Le texte caché que lit le lecteur d'écran sur le bouton du classeur : toutes les lignes de l'état */
export const ID_ETAT = 'etat-classeur-description'
/** Un message à bouton reste tant de ms (voir message) ; la bibliothèque
 *  seule a le sien (main.ts), à la même règle */
export const DUREE_MESSAGE_ACTION = 7000

/** La forme du bouton du classeur (voir UI.placerBoutonClasseur) :
 *  'large' (sa barre, le nom et l'état), 'etroit' (sa barre, l'icône et le
 *  point), 'dans-la-barre' (le premier élément de la barre du haut, l'icône
 *  et le point), 'cache' (le point sur le bouton ⋯) */
export type FormeBoutonClasseur = 'large' | 'etroit' | 'dans-la-barre' | 'cache'

/** Au-delà de cette hauteur, la barre du haut est sur plusieurs rangées (une rangée : 58 px) */
export const PLUSIEURS_RANGEES = 80

/** Les plus longs des textes courts de l'état (voir etat.ts) : la forme large
 *  du bouton du classeur n'est prise que s'ils y tiennent entiers. Le premier
 *  surtout, qui dit que rien d'autre ne protège le classeur. */
export const COURTS_LES_PLUS_LONGS = ['Seulement dans ce navigateur', 'Fichier : le 28 septembre']
/** Ce que la barre du classeur large prend autour du texte (style.css) : la
 *  barre (6 px de marge et 1 px de bord de chaque côté), le bouton (10 px à
 *  gauche, 12 px à droite), l'icône (24 px) et l'écart (8 px) */
export const AUTOUR_DU_TEXTE = 2 * (6 + 1) + 10 + 12 + 24 + 8

/** Le bouton « › » : la page suivante, ou, sur la dernière page, une page de
 *  plus. Son titre commence toujours par « Page suivante » ; jamais
 *  « Nouvelle page », le nom du bouton + d'à côté, qui reste seul à le porter. */
export const TITRE_SUIVANTE = 'Page suivante (Page ↓)'
export const TITRE_AJOUT = 'Page suivante : en ajouter une (c\'est la dernière)'

/** Un écran tactile (ou un pointeur grossier) : le doigt a un rôle à régler */
export function appareilTactile(): boolean {
  return navigator.maxTouchPoints > 0 || (typeof matchMedia === 'function' && matchMedia('(any-pointer: coarse)').matches)
}

export const TYPES_FORMES: { id: TypeForme; nom: string; touche: string }[] = [
  { id: 'rectangle', nom: 'Rectangle (Maj : carré)', touche: 'R' },
  { id: 'cercle', nom: 'Cercle, depuis son centre', touche: 'C' },
  { id: 'polygone', nom: 'Polygone : cliquer chaque sommet, revenir au premier pour fermer', touche: 'G' },
]

export const FONDS_FIGURE = [...COULEURS, { nom: 'Jaune', valeur: '#e0a800' }]

/** La section ouverte dans le menu complet : celles d'une figure (contour,
 *  fond, transformer) ; « couleur » : la couleur et la taille d'une formule,
 *  la couleur et l'épaisseur de plusieurs objets */
export type Section = 'contour' | 'fond' | 'transformer' | 'couleur' | null

/** « 2 », « -0,5 », « 1/3 » → nombre */
export function nombre(t: string): number | null {
  const v = t.trim().replace(',', '.').replace('−', '-')
  const m = v.match(/^(-?[\d.]+)\s*\/\s*([\d.]+)$/)
  const n = m ? Number(m[1]) / Number(m[2]) : Number(v)
  return v && Number.isFinite(n) ? n : null
}

export const MARQUES: { id: MarquePoint; nom: string; d: string }[] = [
  { id: 'aucun', nom: 'Aucune marque', d: 'M5 19L19 5' },
  { id: 'point', nom: 'Point', d: 'M12 12h.01" style="stroke-width:7' },
  { id: 'croix', nom: 'Croix', d: 'M7 7l10 10M17 7L7 17' },
  { id: 'plus', nom: 'Croix droite', d: 'M12 5v14M5 12h14' },
  { id: 'rond', nom: 'Rond', d: 'M12 16a4 4 0 100-8 4 4 0 100 8z' },
]
export const BOUTS: { id: Bout; nom: string; d: string }[] = [
  { id: 'aucun', nom: 'Extrémité simple', d: 'M3 12h16' },
  { id: 'fleche', nom: 'Flèche', d: 'M3 12h14M13 7l6 5-6 5' },
  { id: 'trait', nom: 'Trait', d: 'M3 12h16M19 6v12' },
  { id: 'crochet', nom: 'Crochet', d: 'M3 12h16M19 6v12M19 6h-3M19 18h-3' },
]

export const html = (t: string) => t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export const OUTILS: { id: Outil; nom: string; touche: string }[] = [
  { id: 'stylo', nom: 'Stylo', touche: 'P' },
  { id: 'surligneur', nom: 'Surligneur', touche: 'H' },
  { id: 'gomme', nom: 'Gomme', touche: 'E' },
  { id: 'point', nom: 'Point : un clic le pose et le nomme', touche: 'X' },
  { id: 'segment', nom: 'Segment, droite, demi-droite (Maj : angles de 15°)', touche: 'L' },
  { id: 'forme', nom: 'Formes : rectangle, cercle, polygone', touche: 'R, C, G' },
  { id: 'formule', nom: 'Formule', touche: 'F' },
  { id: 'texte', nom: 'Texte : cliquez et tapez au clavier (glisser : choisir sa largeur)', touche: 'T' },
  { id: 'selection', nom: 'Sélectionner et déplacer', touche: 'V' },
  { id: 'main', nom: 'Déplacer la vue', touche: 'Espace' },
]

/** Les outils qui restent dans la barre des outils au téléphone (lot 5,
 *  K10) : ceux de tous les instants ; les autres sont dans « Autres outils » */
export const ESSENTIELS: readonly Outil[] = ['stylo', 'gomme', 'selection']
/** La grille « Autres outils » du téléphone, dans l'ordre de la barre du
 *  poste de la classe ; le Doigt et « Supprimer la sélection » la suivent */
export const AUTRES_OUTILS: readonly Outil[] = ['surligneur', 'point', 'segment', 'forme', 'formule', 'texte', 'main']

export const RACCOURCIS_LATEX = [
  ['\\frac{a}{b}', '\\frac{}{}'], ['\\sqrt{x}', '\\sqrt{}'], ['x^{n}', '^{}'], ['x_{n}', '_{}'],
  ['\\vec{u}', '\\vec{}'], ['\\overrightarrow{AB}', '\\overrightarrow{}'], ['\\in', '\\in '],
  ['\\mathbb{R}', '\\mathbb{R}'], ['\\leqslant', '\\leqslant '], ['\\infty', '\\infty'],
  ['\\pi', '\\pi'], ['\\lim', '\\lim_{x \\to }'],
  // Les ensembles de nombres (2nde)
  ['\\notin', '\\notin '], ['\\subset', '\\subset '], ['\\not\\subset', '\\not\\subset '], ['\\cap', '\\cap '], ['\\cup', '\\cup '],
  ['\\varnothing', '\\varnothing'], ['\\mathbb{N}', '\\mathbb{N}'], ['\\mathbb{Z}', '\\mathbb{Z}'], ['\\mathbb{D}', '\\mathbb{D}'],
  ['\\mathbb{Q}', '\\mathbb{Q}'], ['\\mathbb{R}^{*}_{+}', '\\mathbb{R}^{*}_{+}'], ['+\\infty', '+\\infty'],
]

export function bouton(nom: string, titre: string, action: (e: Event) => void, classe = '') {
  const b = document.createElement('button')
  b.type = 'button'
  b.className = 'bouton ' + classe
  b.innerHTML = icone(nom)
  b.title = titre
  b.setAttribute('aria-label', titre)
  b.addEventListener('click', action)
  return b
}

/** Les noms sous les outils (lot 5, voir UI.majNomsOutils) : le mot court
 *  de chaque outil, sous son icône */
export const NOMS_OUTILS: Record<Outil, string> = {
  stylo: 'Stylo', surligneur: 'Surligneur', gomme: 'Gomme', point: 'Point', segment: 'Segment',
  forme: 'Formes', formule: 'Formule', texte: 'Texte', selection: 'Sélection', main: 'Vue',
}

/** Donne à un bouton des barres son nom court, sous son icône (lot 5) : un
 *  <span class="libelle">, caché sauf sous body.noms-outils (voir
 *  style.css). Le mot est dans data-libelle, et la feuille de style
 *  l'écrit (content: attr(data-libelle)) : le texte du bouton reste vide,
 *  comme avant (son nom lu, son titre, ce que cherchent les essais par le
 *  texte — « Annuler », « Supprimer » d'une fenêtre ou d'un menu — ne
 *  changent pas), et aria-hidden : le lecteur d'écran lit son titre. */
export function nommer(b: HTMLElement, mot: string): HTMLSpanElement {
  const s = document.createElement('span')
  s.className = 'libelle'; s.dataset.libelle = mot; s.setAttribute('aria-hidden', 'true')
  b.appendChild(s)
  b.classList.add('nomme')
  return s
}

/** Grise un bouton de la barre (ou le rend), sans toucher au DOM s'il l'est déjà */
export function griser(b: HTMLButtonElement, gris: boolean) {
  if (b.disabled === gris) return
  b.disabled = gris
  b.setAttribute('aria-disabled', String(gris))
}

export class UI implements Interface {
  outils = new Map<Outil, HTMLButtonElement>()
  pastilles: HTMLButtonElement[] = []
  /** Les pastilles sont-elles peintes pour une page de nuit ? */
  pastillesDeNuit = false
  /** La grille 2 × 2 des pastilles, dans la barre des outils (gains rapides, lot 16) */
  grillePastilles!: HTMLDivElement
  /** « Épaisseur du trait » (gains rapides, lot 16) : un seul bouton, qui
   *  montre l'épaisseur de l'outil en main et ouvre le menu des trois */
  boutonEpaisseur!: HTMLButtonElement
  /** Le trait dessiné sur ce bouton (sa hauteur, --d, suit l'épaisseur) */
  traitEpaisseur!: HTMLSpanElement
  menuEpaisseur!: Menu
  /** L'épaisseur que montre le bouton (le nom de TAILLES), pour ne le refaire que si elle change */
  epaisseurMontree = ''
  /** Les noms sous les outils se montrent-ils (body.noms-outils) ? Voir majNomsOutils */
  nomsMontres = false
  /** Annuler et Rétablir (gains rapides, lot 16) : en tête de la barre du
   *  haut, toujours dans l'écran ; au téléphone, dans la barre du bas (voir
   *  placerHistorique : les mêmes deux boutons, déplacés d'une barre à l'autre) */
  boutonAnnuler!: HTMLButtonElement
  boutonRetablir!: HTMLButtonElement
  /** Le petit filet vertical qui les sépare de ‹, dans la barre du haut */
  filetHistorique!: HTMLElement
  /** Le compteur « 3 / 7 », suivi du nom de la page s'il y en a un (« · Exercice 12 p. 84 ») :
   *  un bouton, qui ouvre la trieuse des pages (Maj + P) */
  rang!: HTMLButtonElement
  /** La séance, devant le numéro (lot 6) : « Séance du mar 14 oct 14h · » */
  rangSeance!: HTMLDivElement
  /** Son texte (« Séance du mar 14 oct 14h ») ; le bouton « Séance précédente » est à côté */
  rangSeanceTexte!: HTMLSpanElement
  rangNumero!: HTMLSpanElement
  rangNom!: HTMLSpanElement
  /** Ce dont dépend la largeur du compteur (le nombre de chiffres du total,
   *  une page nommée ou non dans le tableau, la taille de la fenêtre) : sa
   *  clé, et s'il reste à la régler (voir reglerCompteur) */
  cleCompteur = ''
  compteurARegler = true
  /** « Séance précédente » (lot 6), caché sans séance d'avant */
  boutonPrecedente!: HTMLButtonElement
  /** « › » : la page suivante, ou une page de plus sur la dernière (voir maj) */
  boutonApres!: HTMLButtonElement
  /** Le numéro de la page en grand, un instant, quand on change de page (voir annoncerPage) */
  annonce!: HTMLDivElement
  annonceNumero!: HTMLSpanElement
  annonceNom!: HTMLSpanElement
  minuterieAnnonce = 0
  /** L'heure du dernier changement de page (performance.now()) : un clic sur
   *  « › » qui la suit de moins de 600 ms ne crée pas de page */
  changementDePage = -Infinity
  /** Le bouton du fond (lot 5 : il remplace la liste déroulante) : la
   *  vignette du fond de la page, qui ouvre le menu des fonds en vignettes
   *  (voir menu-fonds.ts) ; le fond qu'elle montre, et son canevas */
  boutonFond!: HTMLButtonElement
  vignetteFond!: HTMLCanvasElement
  fondMontre: Fond | null = null
  /** …et sa vignette est-elle de nuit ? */
  fondMontreDeNuit = false
  menuFonds!: Menu
  zoomTexte!: HTMLButtonElement
  barreHaut!: HTMLElement
  barreZoom!: HTMLElement
  /** Le menu du bouton % : 100 %, tout voir, voir la sélection, la molette */
  menuZoom!: Menu
  /** « Revenir au contenu », quand plus rien de la page n'est à l'écran */
  retour!: HTMLButtonElement
  minuterieRetour = 0
  barreOutils!: HTMLElement
  toast!: HTMLDivElement
  /** Ce que montre le message : le dernier message ordinaire, et le dernier
   *  qui porte une action, chacun jusqu'à son échéance (voir message) */
  toastSimple: { el: HTMLElement; fin: number } | null = null
  toastAction: { el: HTMLElement; fin: number; cle?: string } | null = null
  minuterieToast = 0
  dialogue: HTMLDialogElement | null = null
  choixFormes!: HTMLDivElement
  choixTraits!: HTMLDivElement
  boutonsTraits = new Map<string, HTMLButtonElement>()
  boutonsFormes = new Map<TypeForme, HTMLButtonElement>()
  /** Le menu complet de ce qui est pris : un objet, ou plusieurs (voir majPanneau) */
  panneau!: HTMLDivElement
  clePanneau = ''
  idPanneau = ''
  /** Les objets du menu commun de plusieurs objets, tels qu'il les a montrés :
   *  il se refait quand l'un d'eux change (une forme changée est un nouvel objet) */
  formesPanneau: Forme[] = []
  section: Section = null
  revue!: RevueEnClasse
  publication!: Publication
  constructeur!: Constructeur
  catalogue!: Catalogue
  /** Le flash d'automatismes (voir flash.ts) */
  flash!: Flash
  choixInstruments!: HTMLDivElement
  boutonInstruments!: HTMLButtonElement
  /** Les outils de classe (rideau, minuteur, tirage au sort ; le laser est à l'App) */
  outilsDeClasse!: OutilsDeClasse
  boutonOutilsClasse!: HTMLButtonElement
  menuOutilsClasse!: Menu
  /** Le niveau du classeur ouvert (son dossier de niveau), que la
   *  bibliothèque connaît (main.ts) : le tirage au sort y prend sa liste */
  classeDuClasseur: () => Promise<{ id: string; nom: string } | null> = async () => null
  /** La recherche (Ctrl F, le champ à côté du nom du classeur ; voir
   *  recherche-vue.ts) */
  recherche!: FenetreRecherche
  champRecherche!: HTMLButtonElement
  /** Ce que la bibliothèque donne à la recherche (main.ts) : les classeurs
   *  de ce navigateur, le contenu d'un classeur fermé, et l'ouverture d'un
   *  autre classeur. Sans bibliothèque : le classeur ouvert seul. */
  idClasseur = ''
  rechercheClasseurs: () => Promise<ClasseurCherche[]> = async () =>
    [{ id: this.idClasseur, nom: 'Ce classeur', classe: null, chemin: '', modifie: Date.now(), courant: true, contenu: null }]
  contenuClasseur: (c: ClasseurCherche) => Promise<ContenuClasseur | null> = async () => null
  ouvrirAilleurs: (d: Destination) => void = () => {}
  boutonsInstruments = new Map<NomInstrument, HTMLButtonElement>()
  menuPartie!: HTMLDivElement
  partie: { id: string; prise: Prise } | null = null
  /** Le rôle du doigt : son bouton (sur un appareil tactile) et son menu */
  boutonDoigt!: HTMLButtonElement
  menuDoigt!: Menu
  /** Le menu de la Gomme (lot 5) : ce qu'elle efface et sa taille ; il
   *  s'ouvre en retouchant la Gomme déjà en main, au clic droit ou à l'appui
   *  long sur son bouton, et par E quand elle est en main */
  menuGomme!: Menu
  /** L'appui long du doigt sur le bouton de la Gomme, qui attend d'ouvrir
   *  son menu */
  appuiLongGomme = 0
  /** Quand le clic droit ou l'appui long a ouvert le menu de la Gomme : le
   *  clic qui suit le lever du même appui (sans nouvel appui sur le bouton)
   *  ne le referme pas */
  gommeOuverteA = -Infinity
  /** Enregistrer le classeur dans un fichier, en ouvrir un : le bouton ⋯ et son menu */
  sauvegarde!: Sauvegarde
  menuFichier!: Menu
  /** Le menu du classeur : ses séances, puis la bibliothèque (voir construireMenuSeances) */
  menuSeances!: Menu
  /** Le menu de la page (un clic droit dans le vide) : il n'a pas de bouton */
  menuPage!: Menu
  /** Le menu du bouton ⋯ du menu complet : « Copier en image », « Envoyer
   *  vers… » (son bouton change quand le menu complet se refait) */
  menuPlus!: Menu
  /** La barre d'actions au-dessus de ce qui est pris (voir barre-actions.ts) */
  barreActions!: BarreActions
  /** Peindre une page hors de l'écran : les vignettes, l'image copiée, le PDF
   *  (voir sorties/apercu.ts) ; le réglage du fond imprimé */
  apercus!: Apercus
  /** La vignette de l'énoncé, quand il est sorti de l'écran par le haut */
  vignetteEnonce!: VignetteEnonce
  /** Les vignettes des pages, pour la trieuse, la corbeille et « Envoyer
   *  vers… » (voir pages/vignettes.ts) : rien ne s'y peint tant qu'aucune
   *  n'est à l'écran */
  vignettes!: Vignettes
  /** La trieuse des pages : toutes les pages en vignettes, plein écran (voir
   *  pages/trieuse.ts) ; le compteur, Maj + P et le menu de la page l'ouvrent */
  trieuse!: Trieuse
  /** Les bandeaux des séances (lot 6, voir seances-vue.ts) */
  bandeauxSeances!: BandeauxSeances
  /** Le bouton du classeur (lot 4) : le nom du classeur et l'état de sa
   *  sauvegarde, dans sa propre barre à gauche de la barre du haut ; il
   *  ouvre la bibliothèque (voir placerBoutonClasseur) */
  barreClasseur!: HTMLDivElement
  boutonClasseur!: HTMLButtonElement
  nomClasseur!: HTMLSpanElement
  etatClasseur!: HTMLSpanElement
  pointClasseur!: HTMLSpanElement
  /** Toutes les lignes de l'état, pour le lecteur d'écran (aria-describedby) */
  descriptionEtat!: HTMLDivElement
  /** La forme du bouton du classeur, réglée avec le compteur */
  formeClasseur: FormeBoutonClasseur = 'large'
  /** Le texte caché qui mesure les textes courts de l'état (voir placeDeLaFormeLarge) */
  mesureCourt: HTMLSpanElement | null = null
  /** Le bouton ⋯ et son point, quand le bouton du classeur est caché */
  boutonFichier!: HTMLButtonElement
  pointFichier!: HTMLSpanElement
  /** Le bloc de l'état en tête du menu ⋯, quand il est ouvert */
  blocEtat: HTMLElement | null = null
  /** Le bandeau discret : seulement pour une action qui demande un clic */
  bandeau!: HTMLDivElement
  /** L'état de la sauvegarde du classeur (voir classeurs/surveillance.ts) */
  surveillance: Surveillance | null = null
  /** Ce que propose chaque action de l'état (un bouton) : les morceaux qui
   *  savent la faire l'inscrivent ; une action sans inscription n'a pas de
   *  bouton. Le libellé peut se recalculer (« Ranger « 2nde » dans un
   *  dossier… » suit le niveau du classeur, lot 18). */
  actionsEtat = new Map<ActionEtat, { libelle: string | (() => string); faire: () => void }>()
  /** La forme du menu ⋯ ouvert (ses entrées dépendent de l'état) : quand
   *  elle change pendant qu'il est ouvert, il se refait */
  formeMenuFichier = ''
  /** L'enregistrement automatique sur la clé (null : impossible ici) */
  cle: EnregistrementCle | null = null
  /** La copie à sens unique sur le Drive (lot 4 C10 ; null : le repli, sans bibliothèque) */
  drive: CopieDrive | null = null
  /** La bibliothèque des classeurs (lot 4 C5) : le bouton du classeur et
   *  « Bibliothèque des classeurs… » du menu ⋯ l'ouvrent ; null : l'index ne
   *  s'ouvre pas dans ce navigateur (le repli) */
  bibliotheque: Bibliotheque | null = null
  /** Ouvrir des fichiers (lot 4 C9 ; null : le repli, sans bibliothèque) */
  fichiers: Fichiers | null = null
  /** L'index de la bibliothèque ne s'ouvre pas (le repli) : le bouton du
   *  classeur le dit */
  sansBibliotheque = false
  // ----- La mise en page du téléphone (lot 5, K10 ; voir style.css) -----
  /** La requête de la mise en page du téléphone (src/navigateur.ts), suivie */
  private requeteTelephone: MediaQueryList | null = typeof matchMedia === 'function' ? matchMedia(TELEPHONE) : null
  /** « Couleur » : un rond de la couleur en main ; il ouvre les pastilles et
   *  les tailles (menuCouleur) */
  boutonCouleur!: HTMLButtonElement
  rondCouleur!: HTMLSpanElement
  menuCouleur!: Menu
  /** Sur un écran qu'on touche, hors du téléphone (contrôle final du lot 5) :
   *  la grille des pastilles et le bouton de l'épaisseur de la barre des
   *  outils sont-ils repliés dans « Couleur », faute de place ? Voir
   *  majCouleursRepliees */
  couleursRepliees = false
  /** « Autres outils » : les points, ou l'icône de celui qu'on tient s'il en
   *  est ; il ouvre la grille des autres outils (menuAutres) */
  boutonAutres!: HTMLButtonElement
  menuAutres!: Menu
  /** « Nouvelle page » (+) : sous 360 px de large, au téléphone, elle passe dans « Plus » */
  boutonNouvelle!: HTMLButtonElement
  /** Le choix d'un fichier d'image (le bouton Image, et « Importer une image… » de « Plus ») */
  choixFichier!: HTMLInputElement
  /** Le pointeur qui a touché « Importer une image » (voir choisirImage) */
  pointeurImport: TypePointeur | undefined
  /** Le menu des fonds ouvert depuis « Plus » au téléphone : le même menu,
   *  rattaché au bouton « Plus » (le bouton du fond y est caché) */
  menuFondsPlus!: Menu
  /** La place que prend la barre du bas (--haut-barre-bas), telle que posée */
  hautBarreBas = -1
  /** Ce qui a décidé la dernière place du message (voir placerToast) */
  cleToast = ''

  constructor(readonly app: App, readonly racine: HTMLElement) {
    // Les menus d'abord : leur Échap passe avant celui des panneaux (voir menus.ts)
    installerMenus()
    this.construire()
    app.ui = this
    // Les deux réglages de l'affichage de cet appareil (lot 5) : le contraste
    // renforcé (la feuille de style suit body.contraste ; le rendu, l'App l'a
    // déjà posé) et les noms sous les outils, qui s'éteignent dans la mise en
    // page du téléphone et reviennent en la quittant
    document.body.classList.toggle('contraste', reglages.contraste)
    this.majNomsOutils()
    this.majCouleursRepliees()
    // La mise en page du téléphone (lot 5, K10) : body.telephone la suit ; en
    // y entrant ou en en sortant (une fenêtre qu'on rétrécit, un téléphone
    // qu'on tourne : le paysage y reste), les barres changent : le compteur et
    // le bouton du classeur se règlent de nouveau, ce qui flotte se replace
    document.body.classList.toggle('telephone', this.telephone)
    const q = this.requeteTelephone
    if (q) {
      const suivre = () => {
        document.body.classList.toggle('telephone', q.matches)
        this.compteurARegler = true
        this.placerHistorique()
        this.majNomsOutils()
        this.majCouleursRepliees()
        this.maj()
      }
      if (q.addEventListener) q.addEventListener('change', suivre); else q.addListener?.(suivre)
    }
    this.maj()
  }

  /** La mise en page du téléphone est-elle celle de l'écran (lot 5, K10) ? */
  get telephone(): boolean { return !!this.requeteTelephone?.matches }

  get attention() { return this.surveillance?.texte.niveau === 'attention' }

  /** La bibliothèque des classeurs (lot 4, C5), par-dessus le classeur : le
   *  bouton du classeur (un clic, Entrée, Espace) et « Bibliothèque des
   *  classeurs… » du menu ⋯. Pas pendant la revue, une séance, la trieuse,
   *  une fenêtre ouverte, ni en plein geste ; avant, comme pour la trieuse,
   *  ce qui attend se pose, un placement s'annule, le programme de
   *  construction se ferme, les menus et le message à action aussi. retour :
   *  ce qui reprend le focus à sa fermeture. Dans le repli (l'index ne
   *  s'ouvre pas), un message le dit. */
  ouvrirBibliotheque(retour: HTMLElement | null = this.boutonClasseur) {
    const app = this.app, b = this.bibliotheque
    if (b?.ouvert || tableauCache(app) || this.revue.ouvert || this.trieuse.ouvert || document.querySelector('dialog[open]') || app.enGeste) return
    if (!b) {
      // (pendant le chargement du classeur, elle n'est pas encore là)
      if (this.sansBibliotheque) this.message(`La bibliothèque des classeurs ne s'ouvre pas dans ce navigateur : seul « ${app.classeur.nom} » est disponible. Enregistrez-le dans un fichier.`)
      return
    }
    app.poserCeQuiAttend()
    if (app.placement) app.echap()
    const ranger = this.fermerConstruction()
    this.fermerMenus()
    this.oublierAction()
    b.ouvrir({ retour, auRetour: ranger })
    // La barre d'actions ne paraît pas sous la bibliothèque
    this.maj()
  }

  /** La fenêtre « Autres sauvegardes » (lot 18 : la copie sur le Drive par
   *  connexion Google, toute la bibliothèque dans un fichier, récupérer une
   *  sauvegarde, les niveaux sur le Drive) ; posée par main.ts. Sans elle
   *  (le repli), le menu ⋯ n'a pas l'entrée. */
  autresSauvegardes: (() => void) | null = null
  /** « Déplacer le classeur… » du menu ⋯ (lot 18, morceau C2 : la fenêtre
   *  « Déplacer « Fractions » vers… », et son fichier suit) ; posée par
   *  main.ts ; l'entrée est grise tant qu'elle manque */
  deplacerClasseur: (() => void) | null = null
  /** Les prochains cours de la classe du classeur ouvert, d'après
   *  l'emploi du temps (« Préparer une séance… », lot 25) ; posée par
   *  main.ts (sans bibliothèque : aucune proposition, une date à choisir) */
  coursAPreparer: (() => Promise<CoursPropose[]>) | null = null
  /** « Emploi du temps… » du menu ⋯ (lot 2 de l'audit) : la fenêtre « Mon
   *  emploi du temps » ; posée par main.ts (sans bibliothèque, pas d'entrée) */
  emploiDuTemps: (() => void) | null = null

  /** Le bouton ⋯ du menu complet, avant Supprimer : son petit menu a
   *  « Copier en image » (une image PNG pour l'ENT ou Pronote, à ne pas
   *  confondre avec « Copier et ouvrir Pronote » de Publier, qui copie un lien)
   *  et « Envoyer vers… » (une autre page), puis l'ordre (lot 5 : voir
   *  construireMenuPlus). Ils étaient dans la rangée ; ils
   *  la faisaient passer sur deux lignes (le menu d'un rectangle de 728 à
   *  820 px de large, de 54 à 96 px de haut), qui ne tenait plus au-dessus
   *  de la figure et venait la couvrir. ⋯ ne coûte que 42 px : la rangée
   *  reste sur une ligne comme avant le lot 3. */
  boutonPlus(ligne: HTMLElement, titre = this.app.membrePris() ? TITRE_PLUS + ', sortir du groupe' : TITRE_PLUS) {
    const m = this.menuPlus
    const b = bouton('points', titre, e => {
      if (m.el.hidden) this.construireMenuPlus()
      basculerMenu(m)
      if (m.el.hidden) return
      placerMenu(m.el, b.getBoundingClientRect(), 'dessous')
      // Ouvert au clavier (Entrée, Espace) : le focus sur sa première entrée
      if ((e as MouseEvent).detail === 0) allerAuxEntrees(m.el, 1, ENTREES)
    }, 'points plus')                                   // ses points sont gras, comme ceux du ⋯ de la barre du haut
    b.setAttribute('aria-haspopup', 'menu')
    b.setAttribute('aria-expanded', String(!m.el.hidden))
    m.bouton = b
    ligne.appendChild(b)
  }

  /** Ce qu'on a choisi dans « Transformer » : gardé quand le panneau se refait */
  transfo = { type: 'symetrie-axiale', axe: '', centre: '', angle: '90', k: '2', vecteur: '', vx: '3', vy: '0' }
}

// Les méthodes rangées dans ui/, par sujet : elles s'ajoutent à la classe
// (même comportement que si elles y étaient écrites).
type MethodesConstruction = typeof methodesConstruction
type MethodesPlacements = typeof methodesPlacements
type MethodesMenus = typeof methodesMenus
type MethodesClasseur = typeof methodesClasseur
type MethodesBarres = typeof methodesBarres
type MethodesMenuComplet = typeof methodesMenuComplet
type MethodesFiguresFormules = typeof methodesFiguresFormules
export interface UI extends MethodesConstruction, MethodesPlacements, MethodesMenus, MethodesClasseur, MethodesBarres, MethodesMenuComplet, MethodesFiguresFormules {}
ajouterMethodes(UI, methodesConstruction, methodesPlacements, methodesMenus, methodesClasseur, methodesBarres, methodesMenuComplet, methodesFiguresFormules)
