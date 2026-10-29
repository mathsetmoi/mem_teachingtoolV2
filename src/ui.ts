// =============================================================
// L'INTERFACE
// Elle ne décide de rien : elle montre l'état de l'application et
// lui transmet les clics. Tout est reconstruit par « maj() ».
// =============================================================
import katex from 'katex'
import type { ActionMessage, App, Interface, Prise } from './app'
import { COULEURS, TAILLES, TOUTE_LA_SELECTION, poigneeDuRayon } from './app'
import type { Bout, Figure, Forme, Formule, MarquePoint, Outil, TypeForme } from './types'
import type { Fond } from './types'
import { CM, libre } from './types'
import type { P, Transformation } from './formes'
import { centreDe, image, placesDesNoms, sommetsDe, versRelatif } from './formes'
import { etapesImage } from './construction'
import { RevueEnClasse } from './revue/revue'
import { Publication } from './publication/fenetre'
import { Catalogue } from './catalogue-vue'
import { Constructeur } from './constructeur'
import { Flash } from './flash'
import type { NomInstrument } from './instruments'
import { INSTRUMENTS } from './instruments'
import { OutilsDeClasse } from './outils-classe'
import { montrerConseils, ouvrirAide } from './aide'
import type { Action, ClasseurCherche, Destination } from './recherche-vue'
import { FenetreRecherche, TOUCHE_RECHERCHE } from './recherche-vue'
import type { ContenuClasseur } from './recherche'
import { lireContenu } from './recherche'
import { EXEMPLES } from './construction'
import { DEMONSTRATIONS } from './catalogue'
import { AUTOMATISMES_5E } from './automatismes'
import { FONDS } from './types'
import type { Menu, OptionsEntree } from './menus'
import type { Sens } from './ordre'
import { aidesOrdre } from './ordre'
import { ENTREES, allerAuxEntrees, basculerMenu, entreeMenu, fermerMenu, filetMenu, focusAuClavier, focusNullePart, focusVenuDuClavier, installerMenus, menuOuvert, naviguerDansLaGrille, ouvrirMenu, placerMenu, positionPanneau, refaireEnGardantLeFocus, titreMenu } from './menus'
import { choisirGestes, choisirGomme, choisirMolette, choisirNomsOutils, choisirTailleGomme, nomsOutilsVisibles, reglages } from './reglages'
import type { Doigt, ModeGomme, Molette, TailleGomme } from './reglages'
import { APPUI_LONG, messageNomsOutils, typePointeur } from './pointeurs'
import { CTRL, TELEPHONE, tableauCache } from './navigateur'
import { Sauvegarde } from './sauvegarde'
import { zoneEntreBarres } from './camera'
import type { Bords } from './camera'
import { TAILLES_FORMULE, changerCouleur, changerEpaisseur, changerPointilles, habillageCommun, titreDuMenu } from './habillage'
import { icone } from './icones'
import { nocturne } from './nuit'
import { VIGNETTE_BOUTON, construireMenuFonds, densite, entreeCochee, nomDuFond, peindreVignette, vignetteDuFond } from './menu-fonds'
import { BarreActions } from './barre-actions'
import { Apercus } from './sorties/apercu'
import { VignetteEnonce } from './enonce'
import type { PageAPeindre } from './sorties/apercu'
import { copierEnImage, nomDeLImage } from './sorties/image'
import { ouvrirFenetrePdf } from './sorties/export-pdf'
import type { CibleExport, HoteFenetrePdf } from './sorties/export-pdf'
import { Vignettes } from './pages/vignettes'
import { Trieuse } from './pages/trieuse'
import { ouvrirEnvoi } from './pages/envoi'
import { messageVerrou, pointeurDuClic, titreModifierFormule } from './pointeurs'
import type { TypePointeur } from './pointeurs'
import { estTexte } from './texte'
import { accorder, compterObjets, minuscule } from './verrou'
import type { Surveillance } from './classeurs/surveillance'
import type { ActionEtat, Bandeau, LigneEtat } from './classeurs/etat'
import type { EnregistrementCle } from './classeurs/cle'
import type { Registre } from './classeurs/registre'
import { AIDE_ACTIVER } from './classeurs/cle'
import type { CopieDrive } from './classeurs/copie-drive'
import { HORS_LIGNE_FICHIER } from './classeurs/copie-drive'
import type { Bibliotheque } from './classeurs/bibliotheque'
import type { Fichiers } from './classeurs/fichiers'
import { AIDE_OUVRIR } from './classeurs/fichiers'
import { fermerSurLeFond } from './dialogue'
import { pagesLisibles } from './fichier'
import { BandeauxSeances, demanderNomDeSeance, demanderReprise } from './seances-vue'
import { ecranTactile } from './pointeurs'
import type { SeanceDuClasseur } from './seances'
import { dateCourte, dateCourteMajuscule, deLaSeance, libelleSeance } from './seances'

/** Le rôle du doigt : la marque de son bouton, son titre, ce qu'on en dit */
const DOIGTS: { id: Doigt; nom: string; aide: string; marque: string; titre: string; dit: string }[] = [
  { id: 'dessine', nom: 'Le doigt dessine', aide: 'avec l\'outil choisi, comme le stylet', marque: '✎',
    titre: 'Rôle du doigt : il dessine', dit: 'Le doigt dessine.' },
  { id: 'deplace', nom: 'Le doigt déplace et sélectionne', aide: 'le stylet écrit ; le doigt déplace la vue, prend et déplace les objets', marque: '✥',
    titre: 'Rôle du doigt : il déplace la vue et sélectionne', dit: 'Le doigt déplace la vue et sélectionne ; le stylet écrit.' },
  { id: 'auto', nom: 'Auto', aide: 'le doigt dessine jusqu\'au premier stylet posé sur l\'écran', marque: 'A',
    titre: 'Rôle du doigt : auto (il dessine tant qu\'aucun stylet n\'a touché l\'écran)', dit: 'Auto : le doigt dessine jusqu\'au premier stylet posé sur l\'écran.' },
]

/** L'aide de « Copier en image » (le menu ⋯ du menu complet) */
const TITRE_IMAGE = 'Une image PNG, à coller dans l\'ENT ou Pronote'
/** L'aide de « Envoyer vers… » (le menu ⋯ du menu complet ; pas dans la
 *  barre d'actions, qui garde les gestes de tous les jours : « Options » y mène) */
const TITRE_ENVOI = 'Déplacer ou copier sur une autre page'
/** Le titre du bouton ⋯ du menu complet, qui ouvre le menu de ces deux-là
 *  et, depuis le lot 5, de l'ordre (premier plan, avancer, reculer,
 *  arrière-plan) et de « Protéger » (verrouiller, fixer en fond) */
const TITRE_PLUS = 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page, premier plan, arrière-plan, verrouiller'
/** Le même bouton ⋯, dans le menu court d'un objet verrouillé (lot 5) */
const TITRE_PLUS_VERROUILLE = 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page'

/** Le menu du bouton ⋯ de la barre du haut, et ce qu'il a : le classeur, et
 *  depuis le lot 5 les réglages de cet appareil (« Contraste renforcé »,
 *  « Noms sous les outils ») ; son titre, son nom lu et celui de son menu le
 *  disent (vérification « conformité » du lot 5 : on n'y cherchait pas le
 *  contraste du vidéoprojecteur). Sous son icône, son nom court reste
 *  « Fichier » : c'est là, comme Fichier → Options d'un traitement de
 *  texte, que l'on cherche les réglages. */
const MENU_FICHIER = 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil'
/** Le bouton ⋯ de la barre du haut */
const TITRE_FICHIER = `${MENU_FICHIER} (${CTRL} + S, ${CTRL} + O, ${CTRL} + P)`
/** Le même bouton ⋯, au téléphone (lot 5, K10) : « Plus », qui a aussi tout
 *  ce que la barre du haut n'y montre pas */
const TITRE_PLUS_TELEPHONE = 'Plus : la page, les outils de cours, le classeur, cet appareil'
/** Le texte caché que lit le lecteur d'écran sur le bouton du classeur : toutes les lignes de l'état */
const ID_ETAT = 'etat-classeur-description'
/** Un message à bouton reste tant de ms (voir message) ; la bibliothèque
 *  seule a le sien (main.ts), à la même règle */
export const DUREE_MESSAGE_ACTION = 7000

/** La forme du bouton du classeur (voir UI.placerBoutonClasseur) :
 *  'large' (sa barre, le nom et l'état), 'etroit' (sa barre, l'icône et le
 *  point), 'dans-la-barre' (le premier élément de la barre du haut, l'icône
 *  et le point), 'cache' (le point sur le bouton ⋯) */
export type FormeBoutonClasseur = 'large' | 'etroit' | 'dans-la-barre' | 'cache'

/** Au-delà de cette hauteur, la barre du haut est sur plusieurs rangées (une rangée : 58 px) */
const PLUSIEURS_RANGEES = 80

/** Les plus longs des textes courts de l'état (voir etat.ts) : la forme large
 *  du bouton du classeur n'est prise que s'ils y tiennent entiers. Le premier
 *  surtout, qui dit que rien d'autre ne protège le classeur. */
const COURTS_LES_PLUS_LONGS = ['Seulement dans ce navigateur', 'Fichier : le 28 septembre']
/** Ce que la barre du classeur large prend autour du texte (style.css) : la
 *  barre (6 px de marge et 1 px de bord de chaque côté), le bouton (10 px à
 *  gauche, 12 px à droite), l'icône (24 px) et l'écart (8 px) */
const AUTOUR_DU_TEXTE = 2 * (6 + 1) + 10 + 12 + 24 + 8

/** Le bouton « › » : la page suivante, ou, sur la dernière page, une page de
 *  plus. Son titre commence toujours par « Page suivante » ; jamais
 *  « Nouvelle page », le nom du bouton + d'à côté, qui reste seul à le porter. */
const TITRE_SUIVANTE = 'Page suivante (Page ↓)'
const TITRE_AJOUT = 'Page suivante : en ajouter une (c\'est la dernière)'

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
  { id: 'texte', nom: 'Texte : cliquez et tapez au clavier (glisser : choisir sa largeur)', touche: 'T' },
  { id: 'selection', nom: 'Sélectionner et déplacer', touche: 'V' },
  { id: 'main', nom: 'Déplacer la vue', touche: 'Espace' },
]

/** Les outils qui restent dans la barre des outils au téléphone (lot 5,
 *  K10) : ceux de tous les instants ; les autres sont dans « Autres outils » */
const ESSENTIELS: readonly Outil[] = ['stylo', 'gomme', 'selection']
/** La grille « Autres outils » du téléphone, dans l'ordre de la barre du
 *  poste de la classe ; le Doigt et « Supprimer la sélection » la suivent */
const AUTRES_OUTILS: readonly Outil[] = ['surligneur', 'point', 'segment', 'forme', 'formule', 'texte', 'main']

const RACCOURCIS_LATEX = [
  ['\\frac{a}{b}', '\\frac{}{}'], ['\\sqrt{x}', '\\sqrt{}'], ['x^{n}', '^{}'], ['x_{n}', '_{}'],
  ['\\vec{u}', '\\vec{}'], ['\\overrightarrow{AB}', '\\overrightarrow{}'], ['\\in', '\\in '],
  ['\\mathbb{R}', '\\mathbb{R}'], ['\\leqslant', '\\leqslant '], ['\\infty', '\\infty'],
  ['\\pi', '\\pi'], ['\\lim', '\\lim_{x \\to }'],
  // Les ensembles de nombres (2nde)
  ['\\notin', '\\notin '], ['\\subset', '\\subset '], ['\\not\\subset', '\\not\\subset '], ['\\cap', '\\cap '], ['\\cup', '\\cup '],
  ['\\varnothing', '\\varnothing'], ['\\mathbb{N}', '\\mathbb{N}'], ['\\mathbb{Z}', '\\mathbb{Z}'], ['\\mathbb{D}', '\\mathbb{D}'],
  ['\\mathbb{Q}', '\\mathbb{Q}'], ['\\mathbb{R}^{*}_{+}', '\\mathbb{R}^{*}_{+}'], ['+\\infty', '+\\infty'],
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

/** Les noms sous les outils (lot 5, voir UI.majNomsOutils) : le mot court
 *  de chaque outil, sous son icône */
const NOMS_OUTILS: Record<Outil, string> = {
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
function nommer(b: HTMLElement, mot: string): HTMLSpanElement {
  const s = document.createElement('span')
  s.className = 'libelle'; s.dataset.libelle = mot; s.setAttribute('aria-hidden', 'true')
  b.appendChild(s)
  b.classList.add('nomme')
  return s
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
  /** Les pastilles sont-elles peintes pour une page de nuit ? */
  private pastillesDeNuit = false
  /** La grille 2 × 2 des pastilles, dans la barre des outils (gains rapides, lot 16) */
  private grillePastilles!: HTMLDivElement
  /** « Épaisseur du trait » (gains rapides, lot 16) : un seul bouton, qui
   *  montre l'épaisseur de l'outil en main et ouvre le menu des trois */
  private boutonEpaisseur!: HTMLButtonElement
  /** Le trait dessiné sur ce bouton (sa hauteur, --d, suit l'épaisseur) */
  private traitEpaisseur!: HTMLSpanElement
  private menuEpaisseur!: Menu
  /** L'épaisseur que montre le bouton (le nom de TAILLES), pour ne le refaire que si elle change */
  private epaisseurMontree = ''
  /** La poubelle de la barre du haut : supprimer la page (l'effacer, seule) */
  private boutonJeter!: HTMLButtonElement
  /** Son nom court (lot 5) : « Supprimer », ou « Effacer » sur une page seule, comme son titre */
  private libelleJeter!: HTMLSpanElement
  /** Les noms sous les outils se montrent-ils (body.noms-outils) ? Voir majNomsOutils */
  private nomsMontres = false
  /** Annuler et Rétablir (gains rapides, lot 16) : en tête de la barre du
   *  haut, toujours dans l'écran ; au téléphone, dans la barre du bas (voir
   *  placerHistorique : les mêmes deux boutons, déplacés d'une barre à l'autre) */
  private boutonAnnuler!: HTMLButtonElement
  private boutonRetablir!: HTMLButtonElement
  /** Le petit filet vertical qui les sépare de ‹, dans la barre du haut */
  private filetHistorique!: HTMLElement
  /** Le compteur « 3 / 7 », suivi du nom de la page s'il y en a un (« · Exercice 12 p. 84 ») :
   *  un bouton, qui ouvre la trieuse des pages (Maj + P) */
  private rang!: HTMLButtonElement
  /** La séance, devant le numéro (lot 6) : « Séance du mar 14 oct 14h · » */
  private rangSeance!: HTMLDivElement
  /** Son texte (« Séance du mar 14 oct 14h ») ; le bouton « Séance précédente » est à côté */
  private rangSeanceTexte!: HTMLSpanElement
  private rangNumero!: HTMLSpanElement
  private rangNom!: HTMLSpanElement
  /** Ce dont dépend la largeur du compteur (le nombre de chiffres du total,
   *  une page nommée ou non dans le tableau, la taille de la fenêtre) : sa
   *  clé, et s'il reste à la régler (voir reglerCompteur) */
  private cleCompteur = ''
  private compteurARegler = true
  /** « Séance précédente » (lot 6), caché sans séance d'avant */
  private boutonPrecedente!: HTMLButtonElement
  /** « › » : la page suivante, ou une page de plus sur la dernière (voir maj) */
  private boutonApres!: HTMLButtonElement
  /** Le numéro de la page en grand, un instant, quand on change de page (voir annoncerPage) */
  private annonce!: HTMLDivElement
  private annonceNumero!: HTMLSpanElement
  private annonceNom!: HTMLSpanElement
  private minuterieAnnonce = 0
  /** L'heure du dernier changement de page (performance.now()) : un clic sur
   *  « › » qui la suit de moins de 600 ms ne crée pas de page */
  private changementDePage = -Infinity
  /** Le bouton du fond (lot 5 : il remplace la liste déroulante) : la
   *  vignette du fond de la page, qui ouvre le menu des fonds en vignettes
   *  (voir menu-fonds.ts) ; le fond qu'elle montre, et son canevas */
  private boutonFond!: HTMLButtonElement
  private vignetteFond!: HTMLCanvasElement
  private fondMontre: Fond | null = null
  /** …et sa vignette est-elle de nuit ? */
  private fondMontreDeNuit = false
  private menuFonds!: Menu
  private boutonAimant!: HTMLButtonElement
  private boutonNuit!: HTMLButtonElement
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
  private catalogue!: Catalogue
  /** Le flash d'automatismes (voir flash.ts) */
  flash!: Flash
  private choixInstruments!: HTMLDivElement
  private boutonInstruments!: HTMLButtonElement
  /** Les outils de classe (rideau, minuteur, tirage au sort ; le laser est à l'App) */
  outilsDeClasse!: OutilsDeClasse
  private boutonOutilsClasse!: HTMLButtonElement
  private menuOutilsClasse!: Menu
  /** Le niveau du classeur ouvert (son dossier de niveau), que la
   *  bibliothèque connaît (main.ts) : le tirage au sort y prend sa liste */
  classeDuClasseur: () => Promise<{ id: string; nom: string } | null> = async () => null
  /** La recherche (Ctrl F, le champ à côté du nom du classeur ; voir
   *  recherche-vue.ts) */
  recherche!: FenetreRecherche
  private champRecherche!: HTMLButtonElement
  /** Ce que la bibliothèque donne à la recherche (main.ts) : les classeurs
   *  de ce navigateur, le contenu d'un classeur fermé, et l'ouverture d'un
   *  autre classeur. Sans bibliothèque : le classeur ouvert seul. */
  idClasseur = ''
  rechercheClasseurs: () => Promise<ClasseurCherche[]> = async () =>
    [{ id: this.idClasseur, nom: 'Ce classeur', classe: null, chemin: '', modifie: Date.now(), courant: true, contenu: null }]
  contenuClasseur: (c: ClasseurCherche) => Promise<ContenuClasseur | null> = async () => null
  ouvrirAilleurs: (d: Destination) => void = () => {}
  private boutonsInstruments = new Map<NomInstrument, HTMLButtonElement>()
  private menuPartie!: HTMLDivElement
  private partie: { id: string; prise: Prise } | null = null
  /** Le rôle du doigt : son bouton (sur un appareil tactile) et son menu */
  private boutonDoigt!: HTMLButtonElement
  private menuDoigt!: Menu
  /** Le menu de la Gomme (lot 5) : ce qu'elle efface et sa taille ; il
   *  s'ouvre en retouchant la Gomme déjà en main, au clic droit ou à l'appui
   *  long sur son bouton, et par E quand elle est en main */
  private menuGomme!: Menu
  /** L'appui long du doigt sur le bouton de la Gomme, qui attend d'ouvrir
   *  son menu */
  private appuiLongGomme = 0
  /** Quand le clic droit ou l'appui long a ouvert le menu de la Gomme : le
   *  clic qui suit le lever du même appui (sans nouvel appui sur le bouton)
   *  ne le referme pas */
  private gommeOuverteA = -Infinity
  /** Enregistrer le classeur dans un fichier, en ouvrir un : le bouton ⋯ et son menu */
  sauvegarde!: Sauvegarde
  private menuFichier!: Menu
  /** Le menu de la page (un clic droit dans le vide) : il n'a pas de bouton */
  private menuPage!: Menu
  /** Le menu du bouton ⋯ du menu complet : « Copier en image », « Envoyer
   *  vers… » (son bouton change quand le menu complet se refait) */
  private menuPlus!: Menu
  /** La barre d'actions au-dessus de ce qui est pris (voir barre-actions.ts) */
  private barreActions!: BarreActions
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
  private barreClasseur!: HTMLDivElement
  private boutonClasseur!: HTMLButtonElement
  private nomClasseur!: HTMLSpanElement
  private etatClasseur!: HTMLSpanElement
  private pointClasseur!: HTMLSpanElement
  /** Toutes les lignes de l'état, pour le lecteur d'écran (aria-describedby) */
  private descriptionEtat!: HTMLDivElement
  /** La forme du bouton du classeur, réglée avec le compteur */
  formeClasseur: FormeBoutonClasseur = 'large'
  /** Le texte caché qui mesure les textes courts de l'état (voir placeDeLaFormeLarge) */
  private mesureCourt: HTMLSpanElement | null = null
  /** Le bouton ⋯ et son point, quand le bouton du classeur est caché */
  private boutonFichier!: HTMLButtonElement
  private pointFichier!: HTMLSpanElement
  /** Le bloc de l'état en tête du menu ⋯, quand il est ouvert */
  private blocEtat: HTMLElement | null = null
  /** Le bandeau discret : seulement pour une action qui demande un clic */
  private bandeau!: HTMLDivElement
  /** L'état de la sauvegarde du classeur (voir classeurs/surveillance.ts) */
  private surveillance: Surveillance | null = null
  /** Ce que propose chaque action de l'état (un bouton) : les morceaux qui
   *  savent la faire l'inscrivent ; une action sans inscription n'a pas de
   *  bouton */
  private actionsEtat = new Map<ActionEtat, { libelle: string; faire: () => void }>()
  /** L'enregistrement automatique sur la clé (null : impossible ici) */
  private cle: EnregistrementCle | null = null
  /** La copie à sens unique sur le Drive (lot 4 C10 ; null : le repli, sans bibliothèque) */
  private drive: CopieDrive | null = null
  /** La bibliothèque des classeurs (lot 4 C5) : le bouton du classeur et
   *  « Bibliothèque des classeurs… » du menu ⋯ l'ouvrent ; null : l'index ne
   *  s'ouvre pas dans ce navigateur (le repli) */
  bibliotheque: Bibliotheque | null = null
  /** Ouvrir des fichiers (lot 4 C9 ; null : le repli, sans bibliothèque) */
  private fichiers: Fichiers | null = null
  /** L'index de la bibliothèque ne s'ouvre pas (le repli) : le bouton du
   *  classeur le dit */
  sansBibliotheque = false
  // ----- La mise en page du téléphone (lot 5, K10 ; voir style.css) -----
  /** La requête de la mise en page du téléphone (src/navigateur.ts), suivie */
  private requeteTelephone: MediaQueryList | null = typeof matchMedia === 'function' ? matchMedia(TELEPHONE) : null
  /** « Couleur » : un rond de la couleur en main ; il ouvre les pastilles et
   *  les tailles (menuCouleur) */
  private boutonCouleur!: HTMLButtonElement
  private rondCouleur!: HTMLSpanElement
  private menuCouleur!: Menu
  /** Sur un écran qu'on touche, hors du téléphone (contrôle final du lot 5) :
   *  la grille des pastilles et le bouton de l'épaisseur de la barre des
   *  outils sont-ils repliés dans « Couleur », faute de place ? Voir
   *  majCouleursRepliees */
  private couleursRepliees = false
  /** « Autres outils » : les points, ou l'icône de celui qu'on tient s'il en
   *  est ; il ouvre la grille des autres outils (menuAutres) */
  private boutonAutres!: HTMLButtonElement
  private menuAutres!: Menu
  /** « Nouvelle page » (+) : sous 360 px de large, au téléphone, elle passe dans « Plus » */
  private boutonNouvelle!: HTMLButtonElement
  /** Le choix d'un fichier d'image (le bouton Image, et « Importer une image… » de « Plus ») */
  private choixFichier!: HTMLInputElement
  /** Le pointeur qui a touché « Importer une image » (voir choisirImage) */
  private pointeurImport: TypePointeur | undefined
  /** Le menu des fonds ouvert depuis « Plus » au téléphone : le même menu,
   *  rattaché au bouton « Plus » (le bouton du fond y est caché) */
  private menuFondsPlus!: Menu
  /** La place que prend la barre du bas (--haut-barre-bas), telle que posée */
  private hautBarreBas = -1
  /** Ce qui a décidé la dernière place du message (voir placerToast) */
  private cleToast = ''

  constructor(private app: App, private racine: HTMLElement) {
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

  /** Au téléphone, la barre des outils est-elle posée en bas (en portrait),
   *  plutôt qu'à gauche (en paysage) ? Mesuré : elle est alors plus large que
   *  haute. */
  private barreEnBas(): boolean {
    if (!this.telephone) return false
    const r = this.barreOutils.getBoundingClientRect()
    return r.width > r.height
  }

  /** Les noms sous les outils (lot 5, D15) : body.noms-outils, d'après le
   *  réglage (voir nomsOutilsVisibles : en 'auto', l'écran décide, et la
   *  décision ne change pas quand on tourne la tablette), jamais dans la
   *  mise en page du téléphone. Quand ils paraissent ou s'en vont, les
   *  barres changent de taille : le compteur et le bouton du classeur se
   *  règlent de nouveau, la barre d'actions se replace (maj). */
  private majNomsOutils() {
    const oui = nomsOutilsVisibles() && !(typeof matchMedia === 'function' && matchMedia(TELEPHONE).matches)
    if (oui === this.nomsMontres && document.body.classList.contains('noms-outils') === oui) return
    this.nomsMontres = oui
    document.body.classList.toggle('noms-outils', oui)
    this.compteurARegler = true
    if (this.app.ui === this) { this.majCouleursRepliees(); this.maj() }
  }

  /** Les couleurs et l'épaisseur de la barre des outils, sur un écran qu'on
   *  touche (contrôle final du lot 5 ; l'étude, [18] : des cibles agrandies
   *  au TNI). Sur l'iPad, la tablette Android, le TNI, l'écran tactile d'un
   *  portable (body.tactile : le doigt y a un rôle, comme pour son bouton),
   *  les pastilles de la grille font 44 × 44 au lieu de 34 × 34. Plus
   *  hautes, elles feraient défiler la barre sur un écran bas (depuis les
   *  gains rapides du lot 16, la barre est plus courte : Annuler et Rétablir
   *  sont en haut, l'épaisseur tient sur un bouton ; elle tient sur le TNI
   *  avec ses noms et sur l'iPad couché, et ne se replie plus que sur un
   *  écran de moins de 700 px de haut environ, une fenêtre de Chrome sur un
   *  portable tactile) : la barre replie alors la grille et le bouton de
   *  l'épaisseur dans « Couleur », le bouton du téléphone (un rond de la
   *  couleur en main ; son menu, les quatre pastilles et les trois tailles
   *  en 44 × 44), à leur place, après le filet. Mesuré : dépliée, la barre
   *  dépasse-t-elle la hauteur qu'elle a ? (la mesure se fait toujours
   *  dépliée, dans la même tâche : rien ne se peint entre les deux, et la
   *  décision ne dépend pas de l'état d'avant). Refait quand la fenêtre
   *  change (une tablette qu'on tourne), quand les noms paraissent ou s'en
   *  vont, et quand le bouton du doigt paraît. Au poste de la classe
   *  (souris, tablette graphique), rien ne change : la barre défile sur un
   *  écran très bas, comme depuis le lot 1 ; au téléphone, « Couleur » est
   *  déjà là (sa mise en page). */
  private majCouleursRepliees() {
    const b = this.barreOutils
    if (!b) return
    const tactile = !this.boutonDoigt.hidden
    document.body.classList.toggle('tactile', tactile)
    let replier = false
    if (tactile && !this.telephone) {
      b.classList.remove('couleurs-repliees')
      replier = b.clientHeight > 0 && b.scrollHeight > b.clientHeight + 1
    }
    b.classList.toggle('couleurs-repliees', replier)
    if (replier === this.couleursRepliees) return
    this.couleursRepliees = replier
    // Dépliée, « Couleur » n'est plus là : son menu ouvert se ferme
    if (!replier && !this.telephone && !this.menuCouleur.el.hidden) fermerMenu()
    if (this.app.ui === this) this.maj()
  }

  /** « Contraste renforcé » (lot 5), du menu ⋯ de la barre du haut */
  private choisirContraste(oui: boolean) {
    this.app.choisirContraste(oui)
    document.body.classList.toggle('contraste', oui)
    this.message(oui ? 'Contraste renforcé, sur cet appareil' : 'Contraste normal')
  }

  /** « Noms sous les outils » (lot 5), du menu ⋯ de la barre du haut : le
   *  message dit, à la souris et au stylet qui survole, que le nom paraît
   *  encore au survol ; au doigt, au TNI, il n'y a pas de survol. Le
   *  pointeur est celui du clic (au clavier, le dernier vu sur le tableau). */
  private choisirNomsOutils(oui: boolean, e?: MouseEvent) {
    choisirNomsOutils(oui)
    this.majNomsOutils()
    const t = (e as PointerEvent | undefined)?.pointerType
    this.message(messageNomsOutils(oui, t ? typePointeur(t) : this.app.dernierPointeur))
  }

  private construire() {
    const app = this.app

    // ----- Barre des outils, à gauche -----
    const outils = document.createElement('nav')
    outils.className = 'barre barre-outils'
    outils.setAttribute('aria-label', 'Outils')
    for (const o of OUTILS) {
      const b = bouton(o.id, `${o.nom} (${o.touche})`, e => (o.id === 'gomme' ? this.toucherGomme(e as MouseEvent) : app.choisirOutil(o.id)), 'outil')
      // Au téléphone (lot 5, K10), seuls le Stylo, la Gomme et la Sélection
      // restent dans la barre : les autres sont dans « Autres outils »
      if (!ESSENTIELS.includes(o.id)) b.classList.add('seulement-large')
      this.outils.set(o.id, b)
      outils.appendChild(b)
    }
    // La Gomme a ses options (lot 5) : son menu, à droite de la barre, à la
    // hauteur de son bouton, comme celui du doigt
    const menuGomme = document.createElement('div')
    menuGomme.className = 'menu-flottant'; menuGomme.setAttribute('role', 'menu'); menuGomme.setAttribute('aria-label', 'Gomme')
    menuGomme.hidden = true
    this.menuGomme = { el: menuGomme, bouton: this.outils.get('gomme')! }
    this.brancherBoutonGomme(this.outils.get('gomme')!)
    // Le rôle du doigt, après « Déplacer la vue » : seulement sur un appareil
    // tactile (sur le poste de la classe, souris et tablette graphique, il n'a
    // pas de sens). Il ouvre son menu, à droite de la barre.
    this.boutonDoigt = bouton('doigt', 'Rôle du doigt', e => this.basculerReglageDoigt((e as MouseEvent).detail === 0))
    this.boutonDoigt.setAttribute('aria-haspopup', 'menu'); this.boutonDoigt.setAttribute('aria-expanded', 'false')
    this.boutonDoigt.hidden = !appareilTactile()
    this.boutonDoigt.classList.add('seulement-large')
    outils.appendChild(this.boutonDoigt)
    const menuDoigt = document.createElement('div')
    menuDoigt.className = 'menu-flottant'; menuDoigt.setAttribute('role', 'menu'); menuDoigt.setAttribute('aria-label', 'Rôle du doigt')
    menuDoigt.hidden = true
    this.menuDoigt = { el: menuDoigt, bouton: this.boutonDoigt }
    outils.appendChild(Object.assign(document.createElement('hr'), { className: 'filet seulement-large' }))
    // Les quatre couleurs, en grille 2 × 2 (gains rapides, lot 16 : Noir,
    // Bleu / Rouge, Vert), chacune à un clic ; la grille tient la place de
    // deux pastilles d'avant, et la barre tient dans un écran de 657 px
    const grille = this.grillePastilles = document.createElement('div')
    grille.className = 'grille-pastilles seulement-large'
    for (const c of COULEURS) {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'pastille'; b.title = c.nom; b.setAttribute('aria-label', c.nom)
      b.style.setProperty('--teinte', c.valeur)
      b.addEventListener('click', () => this.choisirCouleur(c.valeur))
      this.pastilles.push(b); grille.appendChild(b)
    }
    outils.appendChild(grille)
    // L'épaisseur du trait (gains rapides, lot 16) : un seul bouton, qui
    // montre l'épaisseur de l'outil en main (le trait dessiné dessus, comme
    // sur les trois boutons d'avant), et ouvre le menu des trois, à droite
    // de la barre, à la hauteur du bouton (comme celui de la Gomme). Le
    // Surligneur garde son épaisseur à lui (voir App.tailleEnMain).
    const epaisseur = this.boutonEpaisseur = document.createElement('button')
    epaisseur.type = 'button'; epaisseur.className = 'bouton bouton-epaisseur seulement-large'
    epaisseur.setAttribute('aria-haspopup', 'menu'); epaisseur.setAttribute('aria-expanded', 'false')
    this.traitEpaisseur = Object.assign(document.createElement('span'), { className: 'trait' })
    this.traitEpaisseur.setAttribute('aria-hidden', 'true')
    epaisseur.appendChild(this.traitEpaisseur)
    const menuEpaisseur = document.createElement('div')
    menuEpaisseur.className = 'menu-flottant menu-epaisseur'; menuEpaisseur.setAttribute('role', 'menu'); menuEpaisseur.setAttribute('aria-label', 'Épaisseur du trait')
    menuEpaisseur.hidden = true
    this.menuEpaisseur = { el: menuEpaisseur, bouton: epaisseur }
    epaisseur.addEventListener('click', e => this.basculerMenuEpaisseur((e as MouseEvent).detail === 0))
    outils.appendChild(epaisseur)
    this.majBoutonEpaisseur()
    // « Couleur » (au téléphone, et sur un écran qu'on touche où la barre
    // replie ses couleurs) et « Autres outils » (au téléphone seulement) ;
    // au téléphone, Annuler et Rétablir viennent entre les deux (voir
    // placerHistorique) : le document a l'ordre de l'écran
    this.construireBoutonsDuTelephone(outils)
    this.barreOutils = outils
    // Les noms sous les outils (lot 5) : cachés, sauf sous body.noms-outils
    for (const [id, b] of this.outils) nommer(b, NOMS_OUTILS[id])
    nommer(this.boutonDoigt, 'Doigt')
    nommer(epaisseur, 'Épaisseur')
    // « Couleur » a son nom aussi : la barre repliée d'un écran qu'on touche,
    // avec les noms allumés, le montre (au téléphone, les noms ne viennent pas)
    nommer(this.boutonCouleur, 'Couleur')
    // Le bord droit de la barre des outils, mesuré, dans --droite-barre-outils
    // (lot 5) : avec les noms, elle s'élargit (jusqu'à 80 px), et la barre du
    // classeur, posée 12 px plus loin, et la largeur de la barre du haut
    // (style.css) le suivent. Quand il bouge, le bouton du classeur se
    // replace (avec le compteur, voir reglerCompteur), comme quand la
    // fenêtre change ; les choix des Formes et du Segment, les menus du
    // doigt et de la Gomme se placent déjà sur lui, mesuré, à chaque fois.
    let droiteVue = -1
    const droiteDeLaBarre = () => {
      const r = outils.getBoundingClientRect()
      if (!r.width) return
      const d = Math.ceil(r.right - this.racine.getBoundingClientRect().left)
      if (d === droiteVue) return
      const premiere = droiteVue < 0
      droiteVue = d
      this.racine.style.setProperty('--droite-barre-outils', d + 'px')
      if (!premiere) { this.compteurARegler = true; requestAnimationFrame(() => this.maj()) }
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(droiteDeLaBarre).observe(outils)
    window.addEventListener('resize', droiteDeLaBarre)
    // Sur un écran qu'on touche, la barre des outils replie ses couleurs
    // quand elle ne tient plus dans la hauteur (voir majCouleursRepliees)
    window.addEventListener('resize', () => this.majCouleursRepliees())
    // Sur un écran bas, la barre défile (voir style.css) : les choix des Formes
    // et du Segment suivent leur bouton, le menu du doigt le sien
    outils.addEventListener('scroll', () => {
      this.maj()
      if (!this.menuDoigt.el.hidden) this.placerMenuDoigt()
      if (!this.menuGomme.el.hidden) this.placerMenuGomme()
      if (!this.menuEpaisseur.el.hidden) this.placerMenuEpaisseur()
    }, { passive: true })

    // ----- Barre des pages, en haut à droite -----
    const haut = document.createElement('div')
    haut.className = 'barre barre-haut'
    this.barreHaut = haut
    // Le bas de la barre du haut, mesuré, dans --bas-barre-haut : sur un
    // téléphone en portrait, elle passe sur plusieurs rangées (trois sur un
    // iPhone 12 : jusqu'à y = 162), et la barre des outils, posée en bas, ne
    // monte jamais sous elle (voir style.css ; le contrôle final du lot 4 :
    // le bouton Stylo y était à moitié couvert, un toucher ne l'atteignait
    // pas). Suivi quand elle change de taille (sa largeur, ses rangées, le
    // bouton du classeur qui y entre), et quand la fenêtre change.
    const basDeLaBarreDuHaut = () => {
      const r = haut.getBoundingClientRect()
      if (!r.height) return
      const dans = this.racine.getBoundingClientRect().top
      this.racine.style.setProperty('--bas-barre-haut', Math.ceil(r.bottom - dans) + 'px')
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(basDeLaBarreDuHaut).observe(haut)
    window.addEventListener('resize', basDeLaBarreDuHaut)
    // Annuler et Rétablir, en tête de la barre du haut (gains rapides, lot
    // 16 : toujours dans l'écran, là où la barre de gauche les faisait
    // défiler sur un écran bas) ; un petit filet vertical les sépare de ‹.
    // Ils n'agissent que sur la page visible : grisés quand elle n'a rien à
    // défaire ou à refaire (ils gardent leur place). Au téléphone, les mêmes
    // deux boutons sont dans la barre du bas (voir placerHistorique).
    this.boutonAnnuler = bouton('annuler', `Annuler sur cette page (${CTRL}+Z)`, () => app.annuler(), 'historique')
    this.boutonRetablir = bouton('retablir', `Rétablir sur cette page (${CTRL}+Y)`, () => app.retablir(), 'historique')
    this.filetHistorique = Object.assign(document.createElement('hr'), { className: 'filet-vertical seulement-large' })
    const avant = bouton('avant', 'Page précédente (Page ↑)', () => app.pageSuivante(-1))
    // Le compteur : « 3 / 7 », puis le nom de la page s'il y en a un, coupé
    // au-delà d'une vingtaine de caractères (entier dans son titre), et caché
    // sur un téléphone. Sans nom, son texte reste exactement « 3 / 7 ». C'est
    // un bouton : il ouvre la trieuse des pages (comme Maj + P) ; ouverte au
    // clavier (Entrée, Espace), elle lui rend le focus en se fermant. Sa
    // largeur ne dépend jamais de la page qu'on regarde (voir reglerCompteur) :
    // ‹, › et la poubelle restent sous la main d'une page à l'autre.
    this.rang = document.createElement('button'); this.rang.type = 'button'; this.rang.className = 'rang'
    this.rang.addEventListener('click', e => this.ouvrirTrieuse(e.detail === 0))
    // La séance (lot 6) : une étiquette accrochée sous le compteur, hors de
    // son bouton (son texte reste « 3 / 7 ») et hors du flux de la barre (ses
    // boutons et le bouton du classeur ne bougent pas) ; un clic dessus ouvre
    // aussi la trieuse
    this.rangSeance = Object.assign(document.createElement('div'), { className: 'rang-seance' })
    this.rangSeanceTexte = Object.assign(document.createElement('span'), { className: 'texte' })
    this.rangSeanceTexte.addEventListener('click', () => this.ouvrirTrieuse(false))
    this.rangSeance.appendChild(this.rangSeanceTexte)
    this.rangNumero = Object.assign(document.createElement('span'), { className: 'rang-numero' })
    this.rangNom = Object.assign(document.createElement('span'), { className: 'rang-nom' })
    this.rang.append(this.rangNumero, this.rangNom)
    // « › » : sur la dernière page, il en ajoute une (blanche, comme toute
    // page neuve, en vue neutre), avec sa propre icône (voir maj). Le second
    // clic d'un double-clic ne fait rien, ni un clic moins de 600 ms après un
    // changement de page : le double-clic sur « › » qui vient d'arriver sur
    // la dernière page n'en crée pas une de plus. Les boutons de la barre ne
    // bougent jamais d'une page à l'autre : « Nouvelle page » reste là.
    const apres = this.boutonApres = bouton('apres', TITRE_SUIVANTE, e => {
      if (apres.dataset.mode !== 'ajout') { app.pageSuivante(1); return }
      if ((e as MouseEvent).detail > 1 || performance.now() - this.changementDePage < 600) return
      app.nouvellePage()
    })
    const nouvelle = this.boutonNouvelle = bouton('plus', 'Nouvelle page', () => app.nouvellePage(), 'nouvelle-page')
    // « Séance précédente » (lot 6) : les vignettes de la séance d'avant, à
    // reprendre ou à regarder ; seulement quand il y en a une
    const precedente = this.boutonPrecedente = bouton('seance-precedente', 'Séance précédente : ses pages, à reprendre ou à regarder', () => {
      if (this.bandeauxSeances.tiroirOuvert) this.bandeauxSeances.fermerTiroir(); else this.bandeauxSeances.ouvrirSeancePrecedente()
    }, 'seance-precedente')
    precedente.hidden = true
    // Avec l'étiquette de la séance, sous la barre (rien ne bouge dans la barre)
    precedente.insertAdjacentHTML('beforeend', '<span class="libelle-precedente">Séance précédente</span>')
    this.rangSeance.appendChild(precedente)
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
    }, 'danger seulement-large')
    // Le fond de la page : un bouton qui le montre en petit, et ouvre sous
    // lui le menu des huit fonds en vignettes (voir menu-fonds.ts). Ouvert au
    // clavier, le focus va sur le fond de la page. Un choix le donne à la
    // page (le repère se pose au milieu de ce qu'on regarde, voir
    // App.changerFond) ; maj remet la vignette du bouton à jour.
    const boutonFond = this.boutonFond = document.createElement('button')
    boutonFond.type = 'button'; boutonFond.className = 'bouton choix-fond seulement-large'
    boutonFond.setAttribute('aria-haspopup', 'menu'); boutonFond.setAttribute('aria-expanded', 'false')
    this.vignetteFond = vignetteDuFond('blanc', VIGNETTE_BOUTON.l, VIGNETTE_BOUTON.h, densite())
    boutonFond.appendChild(this.vignetteFond)
    const menuFonds = document.createElement('div')
    menuFonds.className = 'menu-flottant menu-fonds'; menuFonds.setAttribute('role', 'menu'); menuFonds.setAttribute('aria-label', 'Fond de la page')
    menuFonds.hidden = true
    this.menuFonds = { el: menuFonds, bouton: boutonFond }
    boutonFond.addEventListener('click', e => {
      if (menuFonds.hidden) construireMenuFonds(menuFonds, app.fond, f => app.changerFond(f))
      menuFonds.classList.remove('deux-colonnes')
      basculerMenu(this.menuFonds)
      if (menuFonds.hidden) return
      placerMenu(menuFonds, boutonFond.getBoundingClientRect(), 'dessous')
      if (e.detail === 0) entreeCochee(menuFonds)?.focus()
    })
    // Le mode nuit de la page (voir nuit.ts) : allumé tant que la page qu'on
    // regarde est de nuit ; la touche N fait de même
    this.boutonNuit = bouton('lune', 'Mode nuit de cette page : fond noir, écriture claire (N)', () => app.basculerNuit(), 'outil seulement-large')
    this.boutonNuit.setAttribute('aria-pressed', 'false')
    this.boutonAimant = bouton('aimant', 'Aimanter au quadrillage', () => this.basculerAimant(), 'outil seulement-large')
    this.boutonReconnaissance = bouton('reconnaissance', 'Le stylo redresse les figures (carré, cercle…)', () => this.basculerReconnaissance(), 'outil seulement-large')
    this.boutonInstruments = bouton('instruments', 'Instruments : règle, équerre, rapporteur, compas', () => {
      this.choixInstruments.hidden = !this.choixInstruments.hidden; this.maj()
    }, 'outil seulement-large')
    const construire = bouton('construction', 'Programme de construction, étape par étape', () => this.basculerConstructeur(), 'seulement-large')
    const catalogue = bouton('catalogue', 'Catalogue : des éléments de cours tout prêts', () => this.basculerCatalogue(), 'seulement-large')
    // Importer une image ou un PDF : bouton, ou coller (Ctrl+V), ou glisser le fichier sur le tableau
    const choixFichier = this.choixFichier = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*,application/pdf,.pdf', hidden: true })
    choixFichier.addEventListener('change', () => { const f = choixFichier.files?.[0]; if (f) app.importerImage(f, { pointeur: this.pointeurImport }); choixFichier.value = '' })
    const importer = bouton('image', 'Importer une image ou un PDF (ou coller avec Ctrl+V, ou glisser le fichier)', e => this.choisirImage(e), 'seulement-large')
    this.racine.appendChild(choixFichier)
    const automatismes = bouton('automatismes', 'Automatismes : un flash de questions sur une page de la séance', () => this.flash.ouvrir(), 'seulement-large')
    // Les outils de classe : rideau, pointeur laser, minuteur, tirage au
    // sort, aide (voir outils-classe.ts) ; un menu sous leur bouton
    this.outilsDeClasse = new OutilsDeClasse(this.racine, {
      laser: () => app.laser,
      basculerLaser: () => app.basculerLaser(),
      ouvrirAide: () => this.ouvrirAide(),
      classe: () => this.classeDuClasseur(),
      message: t => this.message(t),
      poserCalculatrice: m => void app.poserCalculatrice(m),
    }, () => {
      // Le rideau commence sous la barre du haut (et l'étiquette de la séance)
      let bas = haut.getBoundingClientRect().bottom
      const s = this.rangSeance.getBoundingClientRect()
      if (s.height && s.top < bas + 40) bas = Math.max(bas, s.bottom)
      return Math.ceil(bas + 8)
    })
    const menuOutilsClasse = document.createElement('div')
    menuOutilsClasse.className = 'menu-flottant menu-outils-classe'; menuOutilsClasse.setAttribute('role', 'menu'); menuOutilsClasse.setAttribute('aria-label', 'Outils de classe')
    menuOutilsClasse.hidden = true
    const outilsClasse = this.boutonOutilsClasse = bouton('outils-classe', 'Outils de classe : rideau, pointeur laser, minuteur, tirage au sort, aide', e => {
      if (menuOutilsClasse.hidden) this.construireMenuOutilsClasse(menuOutilsClasse)
      basculerMenu(this.menuOutilsClasse)
      if (menuOutilsClasse.hidden) return
      placerMenu(menuOutilsClasse, outilsClasse.getBoundingClientRect(), 'dessous')
      if ((e as MouseEvent).detail === 0) menuOutilsClasse.querySelector<HTMLElement>('.menu-item')?.focus()
    }, 'seulement-large outils-classe')
    outilsClasse.setAttribute('aria-haspopup', 'menu'); outilsClasse.setAttribute('aria-expanded', 'false')
    this.menuOutilsClasse = { el: menuOutilsClasse, bouton: outilsClasse }
    // La recherche : sa fenêtre, Ctrl F (⌘ F) ; le champ est posé plus bas
    // (voir placerChampRecherche). Dans la bibliothèque, Ctrl F va à son
    // propre champ.
    this.recherche = new FenetreRecherche(this.racine, {
      actions: () => this.actionsDeRecherche(),
      classeurs: () => this.rechercheClasseurs(),
      contenu: c => c.courant ? Promise.resolve(lireContenu(app.tableau.doc, app.tableau.seancesDuClasseur())) : this.contenuClasseur(c),
      aller: d => this.allerA(d),
    })
    const champ = this.champRecherche = document.createElement('button')
    champ.type = 'button'; champ.className = 'champ-recherche'; champ.hidden = true
    champ.title = `Rechercher un outil, une formule, un classeur, une page (${TOUCHE_RECHERCHE})`
    champ.innerHTML = `${icone('loupe')}<span>Rechercher</span><kbd>${TOUCHE_RECHERCHE}</kbd>`
    champ.addEventListener('click', () => this.ouvrirRecherche())
    window.addEventListener('keydown', e => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== 'f') return
      if (document.body.classList.contains('en-bibliotheque')) return
      e.preventDefault()
      if (e.repeat || this.recherche.ouverte || document.querySelector('dialog[open]')) return
      this.ouvrirRecherche()
    })
    const revoir = bouton('revue', 'Revoir la construction : une page, une séance, pas à pas', () => this.ouvrirRevue(revoir), 'seulement-large')
    const publier = bouton('publier', 'Publier le replay pour les élèves', () => this.publication.ouvrir(), 'seulement-large')
    // Enregistrer le classeur dans un fichier, en ouvrir un, l'exporter en
    // PDF : un menu discret au bout de la barre, sous son bouton, aligné à
    // droite. Son nom dit les trois (qui cherche « PDF » en survolant la
    // barre, ou au lecteur d'écran, le trouve ici)
    this.sauvegarde = new Sauvegarde(app, t => this.message(t), this.racine)
    const fichier = this.boutonFichier = bouton('points', TITRE_FICHIER, e => {
      if (menuFichier.hidden) this.construireMenuFichier()
      basculerMenu(this.menuFichier)
      if (menuFichier.hidden) return
      // Toujours sous son bouton, jamais dessus : plus long que la place
      // (depuis le lot 5, « Cet appareil » au bout ; à 1366 × 768, avec
      // l'entrée de la clé), il défile au lieu de remonter sur la barre
      // Au téléphone (« Plus », lot 5, K10), dans la hauteur qu'on voit
      // vraiment (le clavier virtuel, la barre d'adresse la réduisent)
      const r = fichier.getBoundingClientRect()
      const visible = this.telephone ? Math.min(window.innerHeight, window.visualViewport?.height ?? Infinity) : window.innerHeight
      menuFichier.style.maxHeight = Math.max(160, Math.floor(visible - r.bottom - 6 - 8)) + 'px'
      menuFichier.scrollTop = 0
      placerMenu(menuFichier, r, 'dessous')
      if ((e as MouseEvent).detail === 0) menuFichier.querySelector<HTMLElement>('.menu-item')?.focus()
    }, 'points')
    fichier.setAttribute('aria-haspopup', 'menu'); fichier.setAttribute('aria-expanded', 'false')
    const menuFichier = document.createElement('div')
    menuFichier.className = 'menu-flottant menu-large'; menuFichier.setAttribute('role', 'menu'); menuFichier.setAttribute('aria-label', MENU_FICHIER)
    menuFichier.hidden = true
    this.menuFichier = { el: menuFichier, bouton: fichier }
    // Le menu des fonds, ouvert par « Plus → Fond… » au téléphone (voir menuFondsPlus)
    this.menuFondsPlus = { el: menuFonds, bouton: fichier }
    // Le point de l'état, quand le bouton du classeur n'a pas la place
    this.pointFichier = Object.assign(document.createElement('span'), { className: 'point-etat', hidden: true })
    this.pointFichier.setAttribute('aria-hidden', 'true')
    fichier.appendChild(this.pointFichier)
    haut.append(this.boutonAnnuler, this.boutonRetablir, this.filetHistorique, avant, this.rang, apres, nouvelle, jeter, boutonFond, this.boutonNuit, this.boutonAimant, this.boutonReconnaissance, importer, this.boutonInstruments, construire, catalogue, automatismes, outilsClasse, revoir, publier, fichier)
    // Les noms sous les outils (lot 5) : ni ‹, ni ›, ni le compteur, ni le
    // bouton du classeur
    nommer(this.boutonAnnuler, 'Annuler'); nommer(this.boutonRetablir, 'Rétablir')
    nommer(nouvelle, 'Nouvelle')
    // (pas de nom sous « Séance précédente » : il n'est là qu'avec une séance d'avant)
    this.racine.appendChild(this.rangSeance)
    this.libelleJeter = nommer(jeter, 'Supprimer')
    nommer(boutonFond, 'Fond'); nommer(this.boutonNuit, 'Nuit'); nommer(this.boutonAimant, 'Aimant'); nommer(this.boutonReconnaissance, 'Formes auto')
    nommer(importer, 'Image'); nommer(this.boutonInstruments, 'Instruments'); nommer(construire, 'Construire'); nommer(catalogue, 'Catalogue')
    nommer(automatismes, 'Automatismes'); nommer(outilsClasse, 'Classe'); nommer(revoir, 'Revoir'); nommer(publier, 'Publier'); nommer(fichier, 'Fichier')

    // ----- Le bouton du classeur, à gauche de la barre du haut -----
    // L'icône, le nom en gras (entier dans le titre), l'état en court ; un
    // point ambre quand il faut y regarder. Sa place se règle avec le
    // compteur (voir placerBoutonClasseur).
    const barreClasseur = this.barreClasseur = document.createElement('div')
    barreClasseur.className = 'barre barre-classeur'
    // Le champ de la recherche suit la largeur du bouton (le nom, l'état)
    if (typeof ResizeObserver === 'function') new ResizeObserver(() => this.placerChampRecherche()).observe(barreClasseur)
    const bc = this.boutonClasseur = document.createElement('button')
    bc.type = 'button'; bc.className = 'bouton-classeur'
    bc.setAttribute('aria-describedby', ID_ETAT)
    const iconeClasseur = Object.assign(document.createElement('span'), { className: 'icone-classeur', innerHTML: icone('classeurs') })
    this.pointClasseur = Object.assign(document.createElement('span'), { className: 'point-etat', hidden: true })
    this.pointClasseur.setAttribute('aria-hidden', 'true')
    iconeClasseur.appendChild(this.pointClasseur)
    const textes = Object.assign(document.createElement('span'), { className: 'textes' })
    this.nomClasseur = Object.assign(document.createElement('span'), { className: 'nom-classeur' })
    this.etatClasseur = Object.assign(document.createElement('span'), { className: 'etat-classeur' })
    textes.append(this.nomClasseur, this.etatClasseur)
    bc.append(iconeClasseur, textes)
    bc.addEventListener('click', () => this.ouvrirBibliotheque(bc))
    // Espace l'ouvre aussi, au relâcher, quand le focus y est venu du
    // clavier : l'application ne la voit pas (elle y armerait « Espace +
    // glisser ») ; après un clic à la souris, ou au retour d'une bibliothèque
    // ouverte d'un clic, Espace + glisser reste à elle. D'où vient le focus
    // se retient quand il arrive (focusVenuDuClavier), jamais à la touche :
    // Chrome rend alors :focus-visible le bouton, même cliqué
    bc.addEventListener('keydown', e => { if (e.key === ' ' && !e.ctrlKey && !e.metaKey && !e.altKey && focusVenuDuClavier(bc)) e.stopPropagation() })
    barreClasseur.appendChild(bc)
    this.descriptionEtat = Object.assign(document.createElement('div'), { id: ID_ETAT, hidden: true })
    // Le bandeau, sous le bouton du classeur (ou sous la barre du haut)
    this.bandeau = Object.assign(document.createElement('div'), { className: 'bandeau-sauvegarde', hidden: true })
    this.bandeau.setAttribute('role', 'status')
    // Enregistrer le classeur : le bouton des lignes de l'état et du bandeau
    // (la clé et le Drive inscrivent les leurs) ; comme Ctrl + S, sur la clé
    // quand elle enregistre ce classeur
    this.inscrireActionEtat('enregistrer', 'Enregistrer le classeur', () => void this.sauvegarde.ctrlS())
    this.majNomClasseur()

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
    // Les noms sous les outils valent aussi ici (vérification « conformité »
    // du lot 5 : au TNI, sans survol, ⛶ n'avait pas de nom visible) ; le
    // pourcentage se lit déjà, comme le compteur des pages
    const moins = bouton('moins', `Dézoomer (${CTRL} + −)`, () => app.zoomer(1 / 1.25))
    const plus = bouton('plus', `Zoomer (${CTRL} + +)`, () => app.zoomer(1.25))
    const toutVoir = bouton('cadre', 'Tout voir (Maj + 1)', () => app.toutVoir())
    nommer(moins, 'Dézoomer'); nommer(plus, 'Zoomer'); nommer(toutVoir, 'Tout voir')
    zoom.append(moins, this.zoomTexte, plus, toutVoir)

    // ----- Revenir au contenu, quand on s'en est éloigné -----
    this.retour = document.createElement('button')
    this.retour.type = 'button'; this.retour.className = 'retour-contenu'; this.retour.hidden = true
    this.retour.title = 'Tout voir (Maj + 1)'
    this.retour.innerHTML = icone('cadre') + '<span>Revenir au contenu</span>'
    this.retour.addEventListener('click', () => app.toutVoir())

    this.toast = document.createElement('div')
    this.toast.className = 'toast'; this.toast.setAttribute('role', 'status')

    // ----- Le numéro de la page, en grand, quand on change de page -----
    // Sous le message, au-dessus du tableau ; aucun appui ne s'y arrête (le
    // stylet écrit à travers), et le premier appui sur le tableau l'efface
    this.annonce = document.createElement('div')
    this.annonce.className = 'annonce-page'; this.annonce.setAttribute('aria-hidden', 'true'); this.annonce.hidden = true
    this.annonceNumero = Object.assign(document.createElement('span'), { className: 'annonce-numero' })
    this.annonceNom = Object.assign(document.createElement('span'), { className: 'annonce-nom' })
    this.annonce.append(this.annonceNumero, this.annonceNom)
    ;(document.getElementById('zone') ?? this.racine).addEventListener('pointerdown', () => this.effacerAnnonce(true), true)
    // La place du nom dans le compteur se règle de nouveau quand la fenêtre
    // change (une tablette qu'on tourne, le zoom du navigateur), et quand la
    // police d'écriture arrive : elle ne retient plus le démarrage (voir
    // index.html), la barre peut donc changer de largeur après coup ; le
    // tableau se repeint alors avec elle (les noms des points, les graduations)
    let regler = 0
    const reglerBientot = () => {
      this.compteurARegler = true
      cancelAnimationFrame(regler)
      regler = requestAnimationFrame(() => this.maj())
    }
    window.addEventListener('resize', reglerBientot)
    document.fonts?.addEventListener?.('loadingdone', () => { reglerBientot(); app.rafraichir() })

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

    // ----- Le menu du bouton ⋯ du menu complet (voir boutonPlus) -----
    const menuPlus = document.createElement('div')
    menuPlus.className = 'menu-flottant menu-plus'; menuPlus.setAttribute('role', 'menu'); menuPlus.setAttribute('aria-label', 'Plus')
    menuPlus.hidden = true
    this.menuPlus = { el: menuPlus }

    // (les deux menus du téléphone, au bout : l'ordre des autres ne change pas)
    this.racine.append(outils, barreClasseur, haut, this.bandeau, this.descriptionEtat, zoom, this.retour, menu, menuDoigt, this.menuGomme.el, menuFichier, menuFonds, this.menuOutilsClasse.el, menuPage, menuPlus, this.annonce, this.toast, this.choixFormes, this.choixTraits, this.panneau, this.choixInstruments,
      this.menuCouleur.el, this.menuAutres.el, this.menuEpaisseur.el)
    // Annuler et Rétablir dans la barre qui leur revient (les deux barres existent)
    this.placerHistorique()
    // (le champ de la recherche au bout : l'ordre des autres ne change pas)
    this.racine.appendChild(this.champRecherche)
    // ----- La barre d'actions, au-dessus de ce qui est pris -----
    // Elle ne recouvre ni la barre d'outils (sauf sur un écran étroit, où
    // elle n'y tient pas ; au téléphone, jamais : voir bordsFlottants), ni la
    // barre du haut
    this.barreActions = new BarreActions(app, this.racine, () => this.bordsFlottants())
    this.revue = new RevueEnClasse(this.app, this.racine)
    // Les formules écrites comme à l'écran (voir App, rendu.rendreFormule)
    this.apercus = new Apercus({
      pixels: src => app.pixels(src),
      rendreFormule: (latex, el) => katex.render(latex, el, { throwOnError: false, displayMode: false }),
    })
    this.vignettes = new Vignettes(app.tableau, this.apercus)
    this.vignetteEnonce = new VignetteEnonce(app, this.apercus, () => this.zoneLibre())
    this.racine.append(this.vignetteEnonce.el)
    // Les séances (lot 6) : la lecture d'une séance passée, « Reprendre », la séance précédente
    this.bandeauxSeances = new BandeauxSeances(app, this.racine, this.vignettes)
    this.trieuse = new Trieuse(app, this.racine, this, this.vignettes)
    this.publication = new Publication(app, this.racine)
    this.constructeur = new Constructeur(app, this.racine, t => this.message(t, undefined, true))
    this.catalogue = new Catalogue(app, this.racine, t => this.message(t, undefined, true))
    this.flash = new Flash(app, this.racine, t => this.message(t, undefined, true))

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

  /** La largeur du compteur ne dépend que du tableau, jamais de la page
   *  qu'on regarde : sinon « 3 / 7 · Exercice 12 p. 84 » après « 2 / 7 »,
   *  ou « 10 / 12 » après « 9 / 12 », le font grandir, et ‹, ›, « Nouvelle
   *  page », la poubelle glissent d'une page à l'autre (le toucher suivant
   *  sur « › » tomberait sur le compteur). Le numéro prend la place du plus
   *  large de ce tableau (le total écrit deux fois : la feuille de style lit
   *  --chiffres). Dès qu'une page du tableau a un nom, une place lui est
   *  gardée sur toutes les pages, vide sur une page sans nom : une vingtaine
   *  de caractères (22 ch), moins si la barre n'a pas la place sur ses
   *  rangées (on essaie 22, 18, 14 puis 10 ch, sans qu'elle prenne une rangée
   *  de plus : à 1024 px, elle n'en a qu'une). S'il n'y a pas même 10 ch (une
   *  tablette, un vidéoprojecteur en 1024 × 768 : environ 90 px), le nom
   *  s'écrit plus petit (.serre) dans toute la place qui reste, de quoi en
   *  lire une dizaine de caractères (« 2 / 3 · Exercice 1… ») ; sous 56 px, il
   *  ne s'y montre pas (il reste dans l'infobulle, l'annonce et la trieuse),
   *  comme sur un téléphone. Réglé seulement quand le nombre de
   *  chiffres du total change, quand la première page reçoit un nom ou la
   *  dernière le perd, quand la fenêtre change et quand la police
   *  d'écriture arrive : une page qu'on nomme
   *  peut faire bouger la barre une fois, le passage d'une page à l'autre
   *  jamais. Une barre pas encore affichée attend son prochain maj.
   *  Le bouton du classeur (lot 4) se place aux mêmes moments, et seulement
   *  à eux : il sort d'abord de la barre du haut, le nom de la page s'y
   *  règle sans lui, exactement comme au lot 3, puis il prend sa place
   *  (voir placerBoutonClasseur). */
  private reglerCompteur(chiffres: number, avecNoms: boolean) {
    const barre = this.barreHaut
    if (!barre.isConnected || !barre.getClientRects().length) return
    this.compteurARegler = false
    this.sortirBoutonClasseur()
    this.reglerNomDeLaPage(chiffres, avecNoms)
    this.placerBoutonClasseur()
    this.reglerSeance()
  }

  /** La séance sous le compteur (lot 6) : une étiquette accrochée sous la
   *  barre du haut, hors de son flux (rien n'y bouge), au bord gauche du
   *  compteur. Sur un téléphone, elle n'y est pas (elle reste dans le titre
   *  du compteur, la trieuse et le menu « Plus »). */
  private reglerSeance() {
    const seance = this.rangSeance, haut = this.barreHaut
    // Sous la barre du haut, son bord gauche sur celui du compteur (hors de
    // la barre : ni ses enfants ni sa mise en page ne changent)
    const r = this.rang.getBoundingClientRect(), h = haut.getBoundingClientRect(), dans = this.racine.getBoundingClientRect()
    seance.style.left = Math.max(4, Math.round(r.left - dans.left)) + 'px'
    seance.style.top = Math.round(h.bottom - dans.top + 2) + 'px'
  }

  /** Le compteur et le nom de la page dans la barre du haut (voir reglerCompteur) */
  private reglerNomDeLaPage(chiffres: number, avecNoms: boolean) {
    const barre = this.barreHaut, nom = this.rangNom
    this.rang.style.setProperty('--chiffres', String(chiffres))
    nom.classList.remove('sans-place', 'serre')
    nom.style.width = ''
    // Sur un téléphone (ou sans nom), la place du nom ne compte pas
    if (!avecNoms || getComputedStyle(nom).display === 'none') return
    nom.style.width = '0px'
    const hauteur = barre.getBoundingClientRect().height
    const tient = () => barre.getBoundingClientRect().height <= hauteur + 0.5
    for (const ch of [22, 18, 14, 10]) {
      nom.style.width = ch + 'ch'
      if (tient()) return
    }
    // Plus petit, dans la place qui reste (moins que 10 ch : de 2 px en 2 px)
    const dix = nom.getBoundingClientRect().width
    nom.classList.add('serre')
    for (let px = Math.floor(dix) - 2; px >= 56; px -= 2) {
      nom.style.width = px + 'px'
      if (tient()) return
    }
    nom.classList.remove('serre')
    nom.style.width = ''
    nom.classList.add('sans-place')
  }

  maj() {
    const app = this.app
    // Un objet verrouillé n'est sélectionné que le temps de son menu court
    // (lot 5) : le menu fermé, il ne l'est plus (avant tout le reste, qui lit
    // la sélection : la barre d'actions, « Supprimer » d'« Autres outils »)
    app.oublierProteges()
    for (const [id, b] of this.outils) b.classList.toggle('actif', app.outil === id)
    const doigt = DOIGTS.find(d => d.id === reglages.doigt)!
    if (this.boutonDoigt.dataset.badge !== doigt.marque) this.boutonDoigt.dataset.badge = doigt.marque
    // La Gomme dit ce qu'elle efface (lot 5) : son titre, et sa marque ◐
    // quand elle n'efface que là où elle passe
    const gomme = this.outils.get('gomme')!, zone = reglages.gomme === 'zone'
    const titreGomme = zone ? 'Gomme (E) — seulement là où elle passe ; retapez pour ses options' : 'Gomme (E) — trait entier ; retapez pour ses options'
    if (gomme.title !== titreGomme) { gomme.title = titreGomme; gomme.setAttribute('aria-label', titreGomme) }
    if (zone && gomme.dataset.badge !== '◐') gomme.dataset.badge = '◐'
    else if (!zone && gomme.dataset.badge !== undefined) delete gomme.dataset.badge
    const titre = doigt.id === 'auto' && reglages.styletDirect ? 'Rôle du doigt : auto (stylet détecté : il déplace la vue)' : doigt.titre
    if (this.boutonDoigt.title !== titre) { this.boutonDoigt.title = titre; this.boutonDoigt.setAttribute('aria-label', titre) }
    this.pastilles.forEach((b, i) => b.classList.toggle('actif', COULEURS[i].valeur === app.couleur))
    // Sur une page de nuit, les pastilles montrent les couleurs telles
    // qu'elles s'y affichent (le Noir s'y écrit en blanc, et s'appelle ainsi)
    if (this.pastillesDeNuit !== app.nuit) {
      this.pastillesDeNuit = app.nuit
      this.pastilles.forEach((b, i) => {
        const c = COULEURS[i], nom = app.nuit && c.nom === 'Noir' ? 'Blanc' : c.nom
        b.style.setProperty('--teinte', app.nuit ? nocturne(c.valeur) : c.valeur)
        b.title = nom; b.setAttribute('aria-label', nom)
      })
    }
    this.majBoutonEpaisseur()
    griser(this.boutonAnnuler, !app.peutAnnuler())
    griser(this.boutonRetablir, !app.peutRetablir())

    const pages = app.pages, i = pages.indexOf(app.page)
    // Le compteur, et le nom de la page (il change aussi sans changer de page).
    // Devant (lot 6), la séance : « Séance du mar 14 oct 14h · 1 / 2 » (ou
    // son nom) ; une séance passée, en lecture : « Lun 13 oct 8h · page 3 »
    const seance = app.seanceVue, passee = app.enSeancePassee
    const numero = !pages.length ? '…' : passee ? `page ${i + 1}` : `${i + 1} / ${pages.length}`
    const nom = i >= 0 ? app.tableau.nomDe(pages[i]) : null
    const texteSeance = !seance ? '' : passee ? `${seance.nom ?? dateCourteMajuscule(seance.debut)} · en lecture` : libelleSeance(seance)
    if (this.rangSeanceTexte.textContent !== texteSeance) this.rangSeanceTexte.textContent = texteSeance
    this.rangSeance.hidden = !texteSeance
    this.rang.classList.toggle('en-lecture', passee)
    this.rangSeance.classList.toggle('en-lecture', passee)
    if (this.rangNumero.textContent !== numero) this.rangNumero.textContent = numero
    const suite = nom ? ` · ${nom}` : ''
    if (this.rangNom.textContent !== suite) this.rangNom.textContent = suite
    const titreSeance = seance ? `${passee ? `Séance passée, en lecture : ${libelleSeance(seance)}` : libelleSeance(seance)} · Toutes les pages (Maj + P)` : ''
    if (this.rangSeanceTexte.title !== titreSeance) this.rangSeanceTexte.title = titreSeance
    const titreRang = nom ? `Page ${numero} · ${nom} · Toutes les pages (Maj + P)` : 'Toutes les pages (Maj + P)'
    if (this.rang.title !== titreRang) this.rang.title = titreRang
    const nomRang = `${passee && seance ? libelleSeance(seance) + ', en lecture, ' : ''}${i >= 0 ? `Page ${i + 1} sur ${pages.length}${nom ? `, ${nom}` : ''} : toutes les pages (Maj + P)` : 'Toutes les pages (Maj + P)'}`
    if (this.rang.getAttribute('aria-label') !== nomRang) this.rang.setAttribute('aria-label', nomRang)
    const avecNoms = pages.some(p => !!app.tableau.nomDe(p))
    const cle = `${String(pages.length).length}:${avecNoms}:${texteSeance}:${passee}`
    if (cle !== this.cleCompteur) { this.cleCompteur = cle; this.compteurARegler = true }
    if (this.compteurARegler) this.reglerCompteur(String(pages.length).length, avecNoms)
    // « › » sur la dernière page : une page de plus ; son contenu ne se
    // refait que si le mode change
    const mode = pages.length && i === pages.length - 1 && !passee ? 'ajout' : 'suivante'
    if (this.boutonApres.dataset.mode !== mode) {
      this.boutonApres.dataset.mode = mode
      this.boutonApres.innerHTML = icone(mode === 'ajout' ? 'page-suivante-plus' : 'apres')
      const t = mode === 'ajout' ? TITRE_AJOUT : TITRE_SUIVANTE
      this.boutonApres.title = t; this.boutonApres.setAttribute('aria-label', t)
    }
    if (!this.annonce.hidden) this.majAnnonce()
    this.bandeauxSeances?.maj()
    const ici = seance ?? app.tableau.derniereSeance()
    const sansAvant = !ici || !app.tableau.seancesDuClasseur().some(x => x.pages.length && x.id !== ici.id && x.debut < ici.debut)
    if (this.boutonPrecedente.hidden !== sansAvant) { this.boutonPrecedente.hidden = sansAvant; this.compteurARegler = true }
    const titreJeter = pages.length <= 1 ? 'Effacer la page' : 'Supprimer cette page'
    if (this.boutonJeter.title !== titreJeter) { this.boutonJeter.title = titreJeter; this.boutonJeter.setAttribute('aria-label', titreJeter) }
    const motJeter = pages.length <= 1 ? 'Effacer' : 'Supprimer'
    if (this.libelleJeter.dataset.libelle !== motJeter) this.libelleJeter.dataset.libelle = motJeter
    this.majBoutonFond()
    this.boutonAimant.classList.toggle('actif', app.aimant)
    if (this.boutonNuit.classList.contains('actif') !== app.nuit) {
      this.boutonNuit.classList.toggle('actif', app.nuit)
      this.boutonNuit.setAttribute('aria-pressed', String(app.nuit))
    }
    this.boutonReconnaissance.classList.toggle('actif', app.reconnaissance)
    for (const [id, b] of this.boutonsFormes) b.classList.toggle('actif', app.typeForme === id)
    for (const [id, b] of this.boutonsTraits) b.classList.toggle('actif', app.typeTrait === id)
    // Le petit panneau à côté de l'outil choisi (Formes ou Segment) ; au
    // téléphone, près de « Autres outils » (voir placerChoixDuTelephone)
    const telephone = this.telephone
    if (telephone || this.couleursRepliees) this.majBoutonsDuTelephone()
    for (const [panneau, outil] of [[this.choixFormes, 'forme'], [this.choixTraits, 'segment']] as const) {
      panneau.hidden = app.outil !== outil
      if (panneau.hidden) continue
      if (telephone) { this.placerChoixDuTelephone(panneau); continue }
      panneau.classList.remove('en-rangee')
      const r = this.outils.get(outil)!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, r.top - 6) + 'px'
      this.sousLaBarreDuHaut(panneau)
    }
    for (const [id, b] of this.boutonsInstruments) {
      const oui = app.instrumentVisible(id)
      b.classList.toggle('actif', oui); b.setAttribute('aria-pressed', String(oui))
    }
    this.boutonInstruments.classList.toggle('actif', !this.choixInstruments.hidden || [...this.boutonsInstruments.keys()].some(i => app.instrumentVisible(i)))
    if (!this.choixInstruments.hidden) {
      // Sous son bouton ; au téléphone, où il est caché (« Plus →
      // Instruments… »), centrée sous la barre du haut, jamais sur la barre
      // des outils
      const w = this.choixInstruments.offsetWidth
      const r = telephone ? this.barreHaut.getBoundingClientRect() : this.boutonInstruments.getBoundingClientRect()
      const min = telephone && !this.barreEnBas() ? this.barreOutils.getBoundingClientRect().right + 8 : 8
      this.choixInstruments.style.top = (r.bottom + 10) + 'px'
      this.choixInstruments.style.left = Math.max(min, Math.min(r.left + r.width / 2 - w / 2, window.innerWidth - w - 8)) + 'px'
    }
    this.majHautBarreBas()
    this.majPanneau()
    this.majMenuPartie()
    this.zoomTexte.textContent = Math.round(app.cam.z * 100) + ' %'
    this.majRetour()
    this.vignetteEnonce?.maj()
    // Après le menu complet : elle ne paraît que s'il est fermé
    this.barreActions.maj()
    // Le message ne couvre ni la barre d'actions ni la pastille ↻ (au
    // téléphone, rien de ce qui est pris : voir placerToast)
    this.placerToast()
  }

  /** Les choix des Formes ou du Segment au téléphone (lot 5, K10) : en
   *  portrait, une rangée juste au-dessus de la barre du bas, alignée sur
   *  « Autres outils » ; en paysage, une colonne à droite de la barre, à la
   *  hauteur de ce bouton ; toujours dans l'écran */
  private placerChoixDuTelephone(panneau: HTMLElement) {
    const b = this.boutonAutres.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    const enBas = this.barreEnBas()
    panneau.classList.toggle('en-rangee', enBas)
    const w = panneau.offsetWidth, h = panneau.offsetHeight
    if (enBas) {
      panneau.style.left = Math.max(8, Math.min(b.right - w, window.innerWidth - w - 8)) + 'px'
      panneau.style.top = Math.max(8, o.top - h - 8) + 'px'
    } else {
      panneau.style.left = (o.right + 8) + 'px'
      panneau.style.top = Math.max(8, Math.min(b.top - 6, window.innerHeight - h - 8)) + 'px'
      this.sousLaBarreDuHaut(panneau)
    }
  }

  /** Le haut de ce qui est posé en bas de l'écran au téléphone en portrait
   *  (la barre des outils, et les choix des Formes ou du Segment au-dessus
   *  d'elle), en pixels de la fenêtre ; ailleurs, le bas de la fenêtre. La
   *  barre d'actions, le menu complet, le message s'arrêtent au-dessus. */
  private basUtile(): number {
    if (!this.barreEnBas()) return window.innerHeight
    let haut = this.barreOutils.getBoundingClientRect().top
    for (const p of [this.choixFormes, this.choixTraits]) if (!p.hidden) haut = Math.min(haut, p.getBoundingClientRect().top)
    return haut
  }

  /** --haut-barre-bas : la place que prend en bas ce qui y est posé (voir
   *  basUtile), du bas de la zone à son haut ; 0 sans barre en bas (le poste
   *  de la classe, le téléphone en paysage). « Revenir au contenu » et le
   *  message se posent au-dessus (style.css). */
  private majHautBarreBas() {
    // (au poste de la classe, rien n'est mesuré : maj n'y fait pas plus qu'avant)
    const place = this.barreEnBas() ? Math.max(0, Math.ceil(this.racine.getBoundingClientRect().bottom - this.basUtile())) : 0
    if (place === this.hautBarreBas) return
    this.hautBarreBas = place
    this.racine.style.setProperty('--haut-barre-bas', place + 'px')
  }

  /** Les bords que ne recouvrent ni la barre d'actions ni le menu complet :
   *  le bord droit de la barre des outils, le bas de la barre du haut, et au
   *  téléphone le haut de la barre du bas (en portrait, la barre des outils
   *  ne borne plus la gauche) ; au poste de la classe, exactement ceux
   *  d'avant */
  private bordsFlottants(): { gauche: number; haut: number; bas?: number } {
    const o = this.barreOutils.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    if (!this.telephone) return { gauche: o.right, haut: h.bottom }
    let gauche = this.barreEnBas() ? 0 : o.right
    if (!this.barreEnBas()) for (const p of [this.choixFormes, this.choixTraits]) if (!p.hidden) gauche = Math.max(gauche, p.getBoundingClientRect().right)
    return { gauche, haut: h.bottom, bas: this.basUtile() }
  }

  /** Le message (en bas ; au téléphone, au-dessus de la barre du bas) ne
   *  couvre ni les barres, ni le bandeau, ni la barre d'actions, ni le menu
   *  complet, ni les choix des Formes, ni les poignées du cadre de ce qui
   *  est pris (sa pastille ↻, ses coins, ses côtés, à la portée du pointeur :
   *  voir App.poigneesAEviter) ; au téléphone, ni rien de ce qui est pris
   *  (son cadre), quand au poste de la classe il peut passer sur l'objet
   *  (retouches après le lot 5 : il ne se plaçait qu'au téléphone, et après
   *  l'import d'une image, le message et sa barre d'actions, posée sous
   *  elle, se couvraient ; zoomée, la pastille passait en bas, sous le
   *  message ; puis, posé sous la barre du haut à côté de la pastille, il
   *  couvrait le coin d'un énoncé en portrait, et son bouton « Fixer en
   *  fond » prenait le clic qui devait l'agrandir). Il essaie, dans
   *  l'ordre : en bas, sur sa largeur ; sous la barre du haut (.en-haut) ;
   *  puis, sous la barre du haut et enfin en bas, dans la plus large des
   *  bandes que rien n'occupe (sur un téléphone couché, 320 px de haut, un
   *  objet pris en bas : à côté de sa barre d'actions), un peu plus étroit
   *  et plus haut. Sinon il reste en bas. Caché, il garde sa place jusqu'au message
   *  suivant (il ne saute pas pendant qu'il s'efface). Les boîtes sont lues
   *  sans le petit glissement de son apparition (offsetTop). */
  private placerToast() {
    const t = this.toast
    const remettre = (haut: boolean) => { t.classList.toggle('en-haut', haut); t.style.left = ''; t.style.maxWidth = '' }
    if (!t.classList.contains('visible')) return
    const app = this.app, z = app.rendu.scene.getBoundingClientRect(), cam = app.cam
    const obstacles: { left: number; top: number; right: number; bottom: number }[] = []
    for (const el of [this.barreHaut, this.barreOutils, this.barreClasseur, this.barreActions.el, this.panneau, this.bandeau, this.choixFormes, this.choixTraits, this.choixInstruments]) {
      if (el.hidden) continue
      const r = el.getBoundingClientRect()
      if (r.width && r.height) obstacles.push(r)
    }
    const ecran = (b: { x: number; y: number; l: number; h: number } | null) => {
      if (!b) return
      const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
      obstacles.push({ left: z.left + a.x, top: z.top + a.y, right: z.left + c.x, bottom: z.top + c.y })
    }
    if (app.selection.size && !app.enLecture) {
      if (this.telephone) ecran(app.emprise(app.objetsChoisis()))
      for (const b of app.poigneesAEviter()) ecran(b)
    }
    // Rien n'a bougé depuis la dernière fois (maj passe souvent) : il reste où il est
    const cle = `${window.innerWidth}×${window.innerHeight}|${t.textContent}|` + obstacles.map(o => [o.left, o.top, o.right, o.bottom].map(Math.round).join(',')).join(';')
    if (cle === this.cleToast) return
    this.cleToast = cle
    const boite = () => {
      const l = t.offsetWidth, h = t.offsetHeight
      return { left: t.offsetLeft - l / 2, top: t.offsetTop, right: t.offsetLeft + l / 2, bottom: t.offsetTop + h }
    }
    const touche = (r: { left: number; top: number; right: number; bottom: number }, o: typeof r) => r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top
    const libre = () => { const r = boite(); return !obstacles.some(o => touche(r, o)) }
    for (const haut of [false, true]) { remettre(haut); if (libre()) return }
    // La plus large des bandes libres, à la hauteur du message (jusqu'à trois
    // fois sa hauteur : plus étroit, il prend des lignes)
    const gauche = this.barreEnBas() ? 8 : this.barreOutils.getBoundingClientRect().right + 12, droite = window.innerWidth - 8
    for (const haut of [true, false]) {
      remettre(haut)
      const r = boite(), h = r.bottom - r.top
      const bande = haut ? { top: r.top, bottom: r.top + 3 * h } : { top: r.bottom - 3 * h, bottom: r.bottom }
      const pris = obstacles.filter(o => o.top < bande.bottom && o.bottom > bande.top).map(o => [o.left, o.right]).sort((a, b) => a[0] - b[0])
      let mieux: [number, number] | null = null, x = gauche
      for (const [a, b] of [...pris, [droite, droite]]) {
        if (a - x > (mieux ? mieux[1] - mieux[0] : 0)) mieux = [x, Math.min(a, droite)]
        x = Math.max(x, b)
      }
      if (!mieux || mieux[1] - mieux[0] < 140) continue
      t.style.maxWidth = Math.floor(mieux[1] - mieux[0] - 8) + 'px'
      t.style.left = Math.round((mieux[0] + mieux[1]) / 2) + 'px'
      if (libre()) return
    }
    remettre(false)
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

  /** On vient de changer de page (voir App.allerPage) : son numéro, et son
   *  nom s'il en a un, en grand, en haut au centre de ce qu'on voit du
   *  tableau entre les barres (jamais au milieu, où l'on écrit en arrivant),
   *  sur un fond clair un peu transparent. Il paraît en 120 ms, reste 700 ms
   *  et s'efface en 300 ms ; un autre changement de page le relance ; le
   *  premier appui sur le tableau l'efface aussitôt. Aucun appui ne s'y
   *  arrête (pointer-events: none). Sous « animations réduites », sans
   *  fondu. Jamais quand le tableau est caché (la revue, une séance, la
   *  trieuse). L'heure du changement est retenue : « › » s'en sert. */
  annoncerPage() {
    this.changementDePage = performance.now()
    if (tableauCache(this.app)) return
    const a = this.annonce
    clearTimeout(this.minuterieAnnonce)
    this.majAnnonce()
    a.classList.remove('vite')
    // Pas plus large que ce qu'on voit du tableau (un long nom se coupe) :
    // sur un téléphone, il ne couvre pas la barre d'outils
    const z = this.app.rendu.scene.getBoundingClientRect(), r = this.zoneLibre()
    a.style.maxWidth = Math.max(160, Math.min(640, r.l)) + 'px'
    // Caché, il repart de l'opacité nulle (le style est relu avant le fondu)
    if (a.hidden) { a.hidden = false; void a.offsetWidth }
    // Centré sur ce qu'on voit, mais jamais hors de l'écran
    const demi = a.offsetWidth / 2, centre = z.left + r.x + r.l / 2
    a.style.left = Math.max(8 + demi, Math.min(window.innerWidth - 8 - demi, centre)) + 'px'
    a.style.top = (z.top + r.y + 16) + 'px'
    a.classList.add('visible')
    this.minuterieAnnonce = window.setTimeout(() => this.effacerAnnonce(false), 120 + 700)
  }

  /** Le numéro et le nom que montre l'annonce (le nombre de pages change
   *  juste après qu'on arrive, quand on vient de supprimer celle qu'on
   *  quittait : maj() le relit tant qu'elle se voit) */
  private majAnnonce() {
    const pages = this.app.pages, i = pages.indexOf(this.app.page)
    const numero = i < 0 ? '' : this.app.enSeancePassee ? `page ${i + 1}` : `${i + 1} / ${pages.length}`
    const nom = (i >= 0 ? this.app.tableau.nomDe(pages[i]) : null) ?? ''
    if (this.annonceNumero.textContent !== numero) this.annonceNumero.textContent = numero
    if (this.annonceNom.textContent !== nom) this.annonceNom.textContent = nom
  }

  /** L'annonce s'efface : à son heure (300 ms), ou tout de suite (vite :
   *  120 ms) quand on touche le tableau. Puis elle se cache. */
  private effacerAnnonce(vite: boolean) {
    const a = this.annonce
    if (a.hidden || !a.classList.contains('visible')) return
    clearTimeout(this.minuterieAnnonce)
    a.classList.toggle('vite', vite)
    a.classList.remove('visible')
    this.minuterieAnnonce = window.setTimeout(() => { a.hidden = true; a.classList.remove('vite') }, vite ? 120 : 300)
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

  /** Une entrée d'un petit menu (voir menus.ts, entreeMenu) */
  private entreeMenu(m: HTMLElement, texte: string, faire: (e: MouseEvent) => void, o: OptionsEntree = {}) {
    entreeMenu(m, texte, faire, o)
  }

  /** Le menu des outils de classe : chaque outil avec son icône, coché quand
   *  il est à l'écran (un second choix le range) */
  private construireMenuOutilsClasse(m: HTMLElement) {
    m.replaceChildren()
    for (const x of this.outilsDeClasse.entrees()) {
      if (x.id === 'aide' || x.id === 'calculatrice-lycee') filetMenu(m)
      // L'aide et les calculatrices ne se cochent pas : on les ouvre, on les pose
      const action = x.id === 'aide' || x.id.startsWith('calculatrice')
      const b = entreeMenu(m, x.texte, x.faire, { action: 'outil-classe-' + x.id, aide: x.aide, touche: x.touche,
        ...(action ? {} : { coche: x.coche, caseACocher: true }) })
      // Rien de coché : l'icône de l'outil tient la place de la coche
      const coche = b.querySelector('.coche')
      if (coche && !x.coche) { coche.innerHTML = icone(x.icone); coche.classList.add('icone-entree') }
    }
  }

  /** Le champ « Rechercher », à droite du bouton du classeur, dans la place
   *  qui reste entre lui et la barre du haut : seulement s'il y tient
   *  (150 px au moins, 240 au plus), sinon sa loupe seule (44 px) ; il ne
   *  prend rien à la place du bouton du classeur, qui se règle sans lui.
   *  Sans place du tout : Ctrl F. */
  private placerChampRecherche() {
    const c = this.champRecherche
    if (!c) return
    const barre = this.barreClasseur
    if (this.telephone || this.formeClasseur !== 'large' || barre.hidden) { c.hidden = true; return }
    const r = barre.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    const libre = Math.floor(h.left - 12 - (r.right + 12))
    if (libre < 44 || r.width === 0) { c.hidden = true; return }
    c.hidden = false
    c.classList.toggle('compact', libre < 150)
    c.style.left = Math.round(r.right + 12) + 'px'
    c.style.top = Math.round(r.top + (r.height - 40) / 2) + 'px'
    c.style.width = (libre < 150 ? 44 : Math.min(240, libre)) + 'px'
  }

  /** La fenêtre de la recherche (Ctrl F, le champ) */
  ouvrirRecherche(texte = '') {
    fermerMenu()
    this.recherche.ouvrir(texte)
  }

  /** Va où la recherche mène : dans ce classeur, la page (la formule prise)
   *  ou la séance ; dans un autre, il s'ouvre (main.ts) */
  private allerA(d: Destination) {
    const app = this.app
    if (d.classeur !== this.idClasseur) { this.ouvrirAilleurs(d); return }
    if (this.bibliotheque?.ouvert) this.bibliotheque.fermer()
    const page = d.page ?? (d.seance ? app.tableau.seancesDuClasseur().find(s => s.id === d.seance)?.pages[0] : undefined)
    if (page) app.voirPage(page)
    if (d.forme) { const f = d.forme; requestAnimationFrame(() => { if (!app.montrerForme(f)) this.message('Cette formule n\'est plus sur la page.') }) }
  }

  /** Tout ce que la recherche trouve parmi les outils : les outils, les
   *  instruments, les fonds, les fenêtres, les outils de classe, les
   *  programmes de construction, le catalogue, les automatismes */
  private actionsDeRecherche(): Action[] {
    const app = this.app
    const outil = (o: Outil, titre: string, touche: string, mots: string, ic: string = o, avant?: () => void): Action =>
      ({ titre, genre: 'Outil', touche, mots, icone: ic, faire: () => { avant?.(); app.choisirOutil(o) } })
    const l: Action[] = [
      outil('stylo', 'Stylo', 'P', 'ecrire crayon main levee dessiner'),
      outil('surligneur', 'Surligneur', 'H', 'surligner fluo mettre en evidence'),
      outil('gomme', 'Gomme', 'E', 'effacer'),
      outil('point', 'Point', 'X', 'placer nommer un point'),
      outil('segment', 'Segment', 'L', 'trait regle tracer', 'trait-segment', () => { app.typeTrait = 'segment' }),
      outil('segment', 'Droite', 'L', 'trait tracer', 'trait-droite', () => { app.typeTrait = 'droite' }),
      outil('segment', 'Demi-droite', 'L', 'trait tracer', 'trait-demi', () => { app.typeTrait = 'demi' }),
      outil('forme', 'Rectangle', 'R', 'carre forme figure', 'rectangle', () => { app.typeForme = 'rectangle' }),
      outil('forme', 'Cercle', 'C', 'rond disque forme figure', 'cercle', () => { app.typeForme = 'cercle' }),
      outil('forme', 'Polygone', 'G', 'triangle forme figure', 'polygone', () => { app.typeForme = 'polygone' }),
      outil('formule', 'Formule', 'F', 'latex equation ecrire calcul racine fraction puissance'),
      outil('texte', 'Texte', 'T', 'taper clavier ecrire phrase traitement de texte consigne enonce titre'),
      outil('selection', 'Sélection', 'V', 'selectionner prendre deplacer bouger agrandir tourner'),
      outil('main', 'Déplacer la vue', 'Espace', 'main vue faire defiler'),
    ]
    for (const i of INSTRUMENTS) l.push({ titre: i.nom, genre: 'Instrument', icone: i.id, mots: 'instrument poser mesurer angle', faire: () => { app.basculerInstrument(i.id); this.maj() } })
    for (const f of FONDS) l.push({ titre: f.nom, genre: 'Fond', icone: 'cadre', mots: 'fond page papier quadrillage', faire: () => app.changerFond(f.id) })
    l.push({ titre: 'Mode nuit', detail: 'Cette page : fond noir, écriture claire', icone: 'lune', touche: 'N', mots: 'nuit noir sombre fond page jour', faire: () => app.basculerNuit() })
    const mots: Record<string, string> = { rideau: 'cacher devoiler correction masquer', laser: 'montrer pointer', minuteur: 'chrono chronometre temps compte a rebours sablier', tirage: 'hasard eleve interroger au sort', aide: 'raccourcis clavier gestes',
      'calculatrice-lycee': 'calculatrice numworks graphique emulateur lycee', 'calculatrice-college': 'calculatrice numworks scientifique emulateur college' }
    for (const x of this.outilsDeClasse.entrees()) l.push({ titre: x.texte, genre: x.id === 'aide' ? undefined : 'Outil de classe', detail: x.aide, icone: x.icone, touche: x.touche, mots: mots[x.id], faire: x.faire })
    l.push(
      { titre: 'Nouvelle page', icone: 'plus', mots: 'ajouter page', faire: () => app.nouvellePage() },
      { titre: 'Toutes les pages', icone: 'trier', touche: 'Maj P', mots: 'pages trier ranger vignettes', faire: () => this.ouvrirTrieuse() },
      { titre: '100 %', icone: 'loupe', touche: `${CTRL} 0`, mots: 'zoom cent pour cent', faire: () => app.zoom100() },
      { titre: 'Tout voir', icone: 'loupe', touche: 'Maj 1', mots: 'zoom toute la page', faire: () => app.toutVoir() },
      { titre: 'Importer une image ou un PDF', icone: 'image', mots: 'image photo fichier pdf fiche énoncé', faire: () => this.choisirImage() },
      { titre: 'Programme de construction', icone: 'construction', mots: 'construire etape par etape', faire: () => this.basculerConstructeur() },
      { titre: 'Catalogue', icone: 'catalogue', mots: 'elements de cours tout prets', faire: () => this.basculerCatalogue() },
      { titre: 'Automatismes', icone: 'automatismes', mots: 'flash questions calcul mental', faire: () => this.flash.ouvrir() },
      { titre: 'Revoir la construction', icone: 'revue', mots: 'revoir replay pas a pas', faire: () => this.ouvrirRevue(this.champRecherche.hidden ? this.boutonFichier : this.champRecherche) },
      { titre: 'Publier le replay', icone: 'publier', mots: 'publier eleves drive lien', faire: () => this.publication.ouvrir() },
      { titre: 'Bibliothèque des classeurs', icone: 'classeurs', mots: 'classeurs dossiers', faire: () => this.ouvrirBibliotheque() },
      { titre: 'Enregistrer le classeur', icone: 'cle', touche: `${CTRL} S`, mots: 'sauvegarder fichier memc', faire: () => void this.sauvegarde.ctrlS() },
      { titre: 'Ouvrir un classeur', icone: 'ouvrir', touche: `${CTRL} O`, mots: 'fichier memc', faire: () => this.sauvegarde.ouvrir() },
      { titre: 'Exporter le classeur en PDF', icone: 'pdf', mots: 'imprimer pdf', faire: () => this.exporterPdf('classeur') },
    )
    for (const e of EXEMPLES) l.push({ titre: e.nom, genre: 'Construction', icone: 'construction', detail: 'Programme de construction', mots: e.texte, faire: () => this.constructeur.ouvrirAvec(e.texte) })
    l.push({ titre: 'Les ensembles ℕ ⊂ ℤ ⊂ 𝔻 ⊂ ℚ ⊂ ℝ', genre: 'Catalogue', icone: 'catalogue', detail: 'Le dessin à poser', mots: 'ensembles de nombres entiers naturels relatifs decimaux rationnels reels', faire: () => this.catalogue.poserElement() })
    for (const d of DEMONSTRATIONS) l.push({ titre: d.nom, genre: 'Catalogue', icone: 'catalogue', detail: 'Démonstration à poser', mots: `demonstration ${d.titre} ${d.nom.replace('√', ' racine ')}`, faire: () => this.catalogue.poserElement(d.nom) })
    const themes = new Set<string>()
    for (const a of AUTOMATISMES_5E) themes.add(a.theme)
    for (const theme of themes.keys()) l.push({ titre: theme, genre: 'Automatismes', icone: 'automatismes', detail: 'Le thème coché', mots: AUTOMATISMES_5E.filter(a => a.theme === theme).map(a => a.titre).join(' '), faire: () => this.flash.ouvrir([`5e/${theme}`]) })
    for (const a of AUTOMATISMES_5E) l.push({ titre: a.titre, genre: 'Automatismes', icone: 'automatismes', detail: a.theme, faire: () => this.flash.ouvrir([`5e/${a.theme}`]) })
    return l
  }

  /** L'aide et les raccourcis (la touche « ? », ou les outils de classe) */
  ouvrirAide() {
    fermerMenu()
    ouvrirAide(this.racine)
  }

  /** Les conseils du premier lancement (voir aide.ts) : une fois le tableau
   *  prêt, quand aucune fenêtre n'est ouverte */
  lancerConseils() {
    montrerConseils(this.racine, [
      { titre: 'Nouveau : les outils de classe', texte: 'Le rideau, le pointeur laser, le minuteur et le tirage au sort sont réunis sous ce bouton.', ancre: () => this.boutonOutilsClasse },
      { titre: 'L\'aide, à tout moment', texte: 'La touche « ? » ouvre l\'aide : tous les raccourcis du clavier et les gestes.', ancre: () => this.boutonOutilsClasse },
      { titre: 'Nouveau : la recherche', texte: `Un outil, une formule écrite dans n'importe quel classeur, une page, une séance : tapez quelques mots ici, ou ${TOUCHE_RECHERCHE} depuis n'importe où.`, ancre: () => this.champRecherche, serie: 2 },
    ], () => !document.querySelector('dialog[open]') && !document.body.classList.contains('en-bibliotheque') && !menuOuvert())
  }

  /** « Importer une image » (le bouton de la barre du haut, ou « Plus » au
   *  téléphone) : le choix du fichier s'ouvre. Le pointeur qui l'a touché
   *  est noté : le message de l'import parle sa langue (P à la souris et à
   *  la tablette graphique, le bouton Stylo au doigt ; au clavier, Entrée :
   *  le dernier vu sur le tableau, voir App.importerImage). */
  private choisirImage(e?: Event) {
    const t = (e as PointerEvent | undefined)?.pointerType
    this.pointeurImport = t ? typePointeur(t) : undefined
    this.choixFichier.click()
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

  /** Le menu du bouton ⋯, refait à chaque ouverture (l'état de la
   *  sauvegarde a pu changer) : en tête, le bloc du classeur (son nom, l'état
   *  de sa sauvegarde, ligne par ligne, et le bouton d'une ligne qui demande
   *  quelque chose) ; puis les entrées, chacune avec son data-action. */
  private construireMenuFichier() {
    const m = this.menuFichier.el, s = this.sauvegarde
    m.replaceChildren()
    // Au téléphone (lot 5, K10), « Plus » commence par ce que la barre du
    // haut n'y montre pas : la page, les outils de cours, la vue
    const telephone = this.telephone
    m.setAttribute('aria-label', telephone ? 'Plus' : MENU_FICHIER)
    if (telephone) {
      this.sectionsDuTelephone(m)
      filetMenu(m)
    }
    const bloc = this.blocEtat = document.createElement('div')
    bloc.className = 'bloc-classeur'
    bloc.setAttribute('role', 'group')
    this.remplirBlocEtat()
    m.appendChild(bloc)
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    // La bibliothèque d'abord : les autres classeurs (le bouton du classeur
    // y mène aussi ; caché faute de place, c'est le seul chemin)
    this.entreeMenu(m, 'Bibliothèque des classeurs…', () => this.ouvrirBibliotheque(this.formeClasseur === 'cache' ? this.boutonFichier : this.boutonClasseur), { action: 'bibliotheque',
      aide: 'Tous vos classeurs : en ouvrir un autre, en créer un.' })
    m.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    // La clé active (cet onglet écrit, rien en conflit) : Ctrl + S y écrit
    // aussitôt ; l'Enregistrer d'avant devient « une copie »
    const cle = this.cle
    if (cle?.actif) {
      if (cle.peutEnregistrer()) this.entreeMenu(m, 'Enregistrer maintenant sur la clé', () => void cle.enregistrerMaintenant(), { touche: `${CTRL} + S`, action: 'enregistrer-cle',
        aide: `Dans « ${cle.nomFichier} », tout de suite (sinon, il s'y enregistre tout seul peu après chaque changement).` })
      this.entreeMenu(m, 'Enregistrer une copie dans un fichier…', () => void s.enregistrer(), { touche: cle.peutEnregistrer() ? undefined : `${CTRL} + S`, action: 'enregistrer',
        aide: 'Un autre fichier .memc, avec toutes les pages et tout l\'historique. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).' })
      this.entreeMenu(m, 'Arrêter l\'enregistrement automatique sur la clé', () => void cle.arreter(), { action: 'arreter-cle',
        aide: `« ${cle.nomFichier} » garde le classeur tel qu'il était à sa dernière écriture.` })
    } else {
      this.entreeMenu(m, 'Enregistrer le classeur…', () => void s.enregistrer(), { touche: `${CTRL} + S`, action: 'enregistrer',
        aide: 'Un fichier .memc avec toutes les pages et tout l\'historique, à garder sur la clé ou à ouvrir ailleurs. Il garde aussi ce qui a été effacé : ne le donnez pas aux élèves (pour eux : Publier).' })
      if (cle?.disponible) this.entreeMenu(m, 'Enregistrer automatiquement dans un fichier…', () => void cle.activer(), { action: 'activer-cle', aide: AIDE_ACTIVER })
    }
    // La copie sur le Drive (lot 4 C10) : le compte, ou pas de copie ;
    // grisée dans la version hors ligne (Google ne s'y connecte pas)
    const drive = this.drive
    if (drive) this.entreeMenu(m, 'Copie sur le Drive…', () => void drive.ouvrirLeChoix(), { action: 'copie-drive', inactif: !drive.enLigne,
      aide: drive.enLigne ? 'Une copie à sens unique, dans un dossier privé de votre Drive : choisir le compte, ou pas de copie.' : HORS_LIGNE_FICHIER })
    // Le lot 7 : l'ordinateur ou le Drive, ce classeur ou tout son niveau
    const ailleurs = this.enregistrerAilleurs
    if (ailleurs) this.entreeMenu(m, 'Enregistrer sur le Drive ou ailleurs…', () => ailleurs(), { action: 'enregistrer-ailleurs' })
    this.entreeMenu(m, 'Ouvrir un classeur…', () => s.ouvrir(), { touche: `${CTRL} + O`, action: 'ouvrir',
      aide: this.fichiers ? AIDE_OUVRIR : 'Remplace ce classeur par celui d\'un fichier .memc.' })
    // Tout le classeur, séance après séance (lot 6 : la trieuse et le menu de la page exportent la séance)
    this.entreeMenu(m, 'Exporter le classeur en PDF…', () => this.exporterPdf('classeur'), { action: 'exporter-pdf',
      aide: 'Toutes les pages, cadrées sur leur contenu, en feuilles A4 à imprimer ou à déposer dans l\'ENT.' })
    // Les séances du chapitre (lot 6), après ce qui touche au classeur
    const seance = this.app.seanceVue
    // (courtes, sans aide : le menu tient sans défiler au poste de la classe ;
    // « Séance précédente » est à côté de l'étiquette de la séance, et ici
    // au téléphone, où l'étiquette n'est pas, et sur un écran qu'on touche,
    // où son petit bouton est loin du doigt)
    if (seance) {
      filetMenu(m)
      this.entreeMenu(m, 'Nouvelle séance', () => this.nouvelleSeance(), { action: 'nouvelle-seance' })
      this.entreeMenu(m, 'Renommer la séance…', () => void this.renommerSeance(), { action: 'renommer-seance' })
      const avant = this.app.tableau.seancesDuClasseur().filter(x => x.pages.length && x.debut < seance.debut).length > 0
      if (telephone || ecranTactile()) this.entreeMenu(m, 'Séance précédente…', () => this.bandeauxSeances.ouvrirSeancePrecedente(), { action: 'seance-precedente', inactif: !avant })
      if (this.app.enSeancePassee) this.entreeMenu(m, 'Retour à aujourd\'hui', () => this.app.retourAujourdhui(), { action: 'retour-aujourdhui' })
    }
    // Cet appareil (lot 5) : l'affichage de CET écran, gardé dans ce
    // navigateur ; rien ne change dans le classeur, ni pour les élèves. Les
    // noms sous les outils ne vont pas dans la mise en page du téléphone (la
    // place y manque) : grisés là, ils reviennent en la quittant.
    filetMenu(m)
    titreMenu(m, 'Cet appareil')
    this.entreeMenu(m, 'Contraste renforcé', () => this.choisirContraste(!reglages.contraste), { action: 'contraste',
      coche: reglages.contraste, caseACocher: true,
      aide: 'Pour le vidéoprojecteur : lignes du fond, barres et sélection plus marquées. Rien ne change dans le classeur.' })
    this.entreeMenu(m, 'Noms sous les outils', e => this.choisirNomsOutils(!nomsOutilsVisibles(), e), { action: 'noms-outils',
      coche: nomsOutilsVisibles(), caseACocher: true, inactif: telephone,
      aide: telephone ? 'Un mot sous chaque bouton des barres (pas sur un téléphone : la place manque)' : 'Un mot sous chaque bouton des barres' })
  }

  /** Les premières sections de « Plus », au téléphone (lot 5, K10) : ce que
   *  la barre du haut et la barre des outils n'y montrent pas, chaque entrée
   *  de 44 px au moins (le menu défile s'il dépasse l'écran : voir le bouton) :
   *  - « Page » : « Nouvelle page » quand son bouton n'a pas la place (sous
   *    360 px de large), « Supprimer la page » (« Effacer la page » si elle
   *    est seule), « Fond… » (le menu des fonds en vignettes), « Aimanter au
   *    quadrillage » et « Le stylo redresse les figures » (des cases) ;
   *  - « Outils de cours » : « Importer une image… », « Instruments… » (leur
   *    liste, sous la barre du haut), « Programme de construction »,
   *    « Automatismes », « Revoir la construction », « Publier le replay » ;
   *  - « Vue » : « 100 % », « Tout voir » (la barre du zoom est cachée : le
   *    pincement zoome). */
  private sectionsDuTelephone(m: HTMLElement) {
    const app = this.app, plus = this.boutonFichier
    titreMenu(m, 'Page')
    if (!this.boutonNouvelle.getClientRects().length) this.entreeMenu(m, 'Nouvelle page', () => app.nouvellePage(), { action: 'nouvelle-page' })
    const seule = app.pages.length <= 1
    this.entreeMenu(m, seule ? 'Effacer la page' : 'Supprimer la page', () => app.supprimerPage(), { action: 'supprimer-page' })
    this.entreeMenu(m, 'Fond…', e => this.ouvrirFondsDepuisPlus(e.detail === 0), { action: 'fond', aide: nomDuFond(app.fond) })
    this.entreeMenu(m, 'Mode nuit', () => app.basculerNuit(), { action: 'nuit', coche: app.nuit, caseACocher: true, aide: 'Fond noir, écriture claire' })
    this.entreeMenu(m, 'Aimanter au quadrillage', () => this.basculerAimant(), { action: 'aimant', coche: app.aimant, caseACocher: true })
    this.entreeMenu(m, 'Le stylo redresse les figures', () => this.basculerReconnaissance(), { action: 'reconnaissance', coche: app.reconnaissance, caseACocher: true,
      aide: 'Carré, cercle, triangle…' })
    filetMenu(m)
    titreMenu(m, 'Outils de cours')
    this.entreeMenu(m, 'Importer une image ou un PDF…', e => this.choisirImage(e), { action: 'importer' })
    this.entreeMenu(m, 'Instruments…', () => { this.choixInstruments.hidden = false; this.maj() }, { action: 'instruments',
      aide: 'Règle, équerre, rapporteur, compas' })
    this.entreeMenu(m, 'Programme de construction', () => this.basculerConstructeur(), { action: 'construction', aide: 'Étape par étape' })
    this.entreeMenu(m, 'Catalogue', () => this.basculerCatalogue(), { action: 'catalogue', aide: 'Ensembles de nombres…' })
    this.entreeMenu(m, 'Automatismes', () => this.flash.ouvrir(), { action: 'automatismes', aide: 'Un flash de questions' })
    this.entreeMenu(m, 'Outils de classe…', () => this.ouvrirOutilsClasseDepuisPlus(), { action: 'outils-classe', aide: 'Rideau, laser, minuteur, tirage au sort' })
    this.entreeMenu(m, 'Revoir la construction', () => this.ouvrirRevue(plus), { action: 'revue', aide: 'Une page, une séance, pas à pas' })
    this.entreeMenu(m, 'Publier le replay', () => this.publication.ouvrir(), { action: 'publier', aide: 'Pour les élèves' })
    filetMenu(m)
    titreMenu(m, 'Vue')
    this.entreeMenu(m, '100 %', () => app.zoom100(), { action: 'zoom-100', touche: `${CTRL} + 0` })
    this.entreeMenu(m, 'Tout voir', () => app.toutVoir(), { action: 'tout-voir', touche: 'Maj + 1' })
  }

  /** « Plus → Outils de classe… » au téléphone : leur menu, sous « Plus » */
  private ouvrirOutilsClasseDepuisPlus() {
    const el = this.menuOutilsClasse.el
    this.construireMenuOutilsClasse(el)
    ouvrirMenu({ el, bouton: this.boutonFichier })
    placerMenu(el, this.boutonFichier.getBoundingClientRect(), 'dessous')
  }

  /** « Plus → Fond… » au téléphone : le menu des fonds en vignettes, sous
   *  « Plus » (son bouton à lui est caché), sur deux colonnes en portrait (en
   *  paysage, ses deux rangées de quatre tiennent dans la hauteur, que quatre
   *  rangées de deux dépasseraient) */
  private ouvrirFondsDepuisPlus(auClavier: boolean) {
    const app = this.app, el = this.menuFonds.el
    construireMenuFonds(el, app.fond, f => app.changerFond(f))
    el.classList.toggle('deux-colonnes', this.barreEnBas())
    ouvrirMenu(this.menuFondsPlus)
    placerMenu(el, this.boutonFichier.getBoundingClientRect(), 'dessous')
    if (auClavier) entreeCochee(el)?.focus()
  }

  /** Le bloc de l'état en tête du menu ⋯ : le nom du classeur, ses lignes
   *  (data-ligne : navigateur, cle, drive, fichier), et pour une ligne qui
   *  demande quelque chose, son bouton (une entrée du menu : les flèches y
   *  passent). Refait quand l'état change, sauf si le focus y est. */
  private remplirBlocEtat() {
    const bloc = this.blocEtat
    if (!bloc) return
    const nom = Object.assign(document.createElement('div'), { className: 'bloc-nom', id: 'bloc-classeur-nom', textContent: this.app.classeur.nom, title: this.app.classeur.nom })
    bloc.setAttribute('aria-labelledby', nom.id)
    const liste = document.createElement('ul')
    liste.className = 'bloc-lignes'
    const lignes: LigneEtat[] = this.surveillance?.texte.lignes ?? []
    lignes.forEach((l, i) => {
      const li = document.createElement('li')
      li.className = 'ligne-etat ' + l.niveau
      li.dataset.ligne = l.quoi
      const texte = Object.assign(document.createElement('span'), { className: 'texte-ligne', id: `ligne-etat-${i}`, textContent: l.texte })
      li.appendChild(texte)
      // Le bouton de la ligne, et les suivants ; pas « Enregistrer
      // automatiquement sur la clé… » : l'entrée du menu, juste dessous, le fait
      for (const action of [l.action, ...(l.plus ?? [])]) {
        const a = action && action !== 'activer-cle' ? this.actionsEtat.get(action) : undefined
        if (!a || !action) continue
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'menu-item action-etat'
        b.setAttribute('role', 'menuitem')
        b.dataset.etatAction = action
        b.setAttribute('aria-describedby', texte.id)
        b.textContent = a.libelle
        b.addEventListener('click', () => { fermerMenu(); a.faire() })
        li.appendChild(b)
      }
      liste.appendChild(li)
    })
    bloc.replaceChildren(nom, liste)
  }

  // ----- Le bouton du classeur, l'état de la sauvegarde, le bandeau (lot 4) -----
  /** Une action de l'état (le bouton d'une ligne du menu ⋯ ou du bandeau) :
   *  la clé (C4) et le Drive (C10) inscrivent les leurs */
  inscrireActionEtat(action: ActionEtat, libelle: string, faire: () => void) {
    this.actionsEtat.set(action, { libelle, faire })
    this.majEtat()
  }

  /** Ce que fait une action de l'état, si un morceau l'a inscrite (la
   *  bibliothèque en fait les boutons de la ligne du classeur ouvert) */
  actionEtat(action: ActionEtat): { libelle: string; faire: () => void } | undefined {
    return this.actionsEtat.get(action)
  }

  /** L'enregistrement automatique dans un fichier (la clé, lot 4 C4) : ses
   *  entrées du menu ⋯ et les boutons de l'état et du bandeau (activer,
   *  reprendre après un rechargement, choisir un autre fichier, remplacer
   *  quand même). Le mot « clé » ne paraît pas à l'écran (lot 18). */
  brancherCle(cle: EnregistrementCle | null) {
    this.cle = cle
    if (!cle?.disponible) return
    this.inscrireActionEtat('activer-cle', 'Enregistrer automatiquement dans un fichier…', () => void cle.activer())
    this.inscrireActionEtat('reprendre-cle', 'Reprendre l\'enregistrement', () => void cle.reprendre())
    this.inscrireActionEtat('choisir-cle', 'Choisir un autre fichier…', () => void cle.choisirUnAutre())
    this.inscrireActionEtat('forcer-cle', 'Remplacer quand même', () => void cle.remplacerQuandMeme())
  }

  /** La copie sur le Drive (lot 4 C10) : les boutons de sa ligne et de ses
   *  bandeaux (se connecter, récupérer la copie, la remplacer quand même),
   *  et « Copie sur le Drive… » du menu ⋯ */
  brancherDrive(drive: CopieDrive | null) {
    this.drive = drive
    if (!drive?.enLigne) return
    this.inscrireActionEtat('connecter-drive', 'Se connecter à Google', () => void drive.seConnecter())
    this.inscrireActionEtat('recuperer-drive', 'Récupérer la copie du Drive', () => void drive.recuperer())
    this.inscrireActionEtat('forcer-drive', 'Remplacer quand même', () => void drive.remplacerQuandMeme())
  }

  /** L'état de la sauvegarde arrive (après le chargement du classeur) : le
   *  bouton, le menu et le bandeau le suivent */
  brancherEtat(s: Surveillance) {
    this.surveillance = s
    s.quandChange(() => this.majEtat())
    this.majEtat()
  }

  /** Le nom du classeur (il peut changer après coup : « Premier classeur »
   *  sur un navigateur neuf, un classeur renommé) */
  majNomClasseur() {
    const nom = this.app.classeur.nom, b = this.boutonClasseur
    if (this.nomClasseur.textContent !== nom) this.nomClasseur.textContent = nom
    if (b.title !== nom) b.title = nom
    const nomAccessible = `Classeur « ${nom} » : ouvrir la bibliothèque`
    if (b.getAttribute('aria-label') !== nomAccessible) b.setAttribute('aria-label', nomAccessible)
    this.majBoutonFichier()
  }

  private get attention() { return this.surveillance?.texte.niveau === 'attention' }

  /** Le bouton ⋯ quand le bouton du classeur est caché : il porte le point,
   *  son titre nomme le classeur, le lecteur d'écran y lit l'état */
  private majBoutonFichier() {
    const f = this.boutonFichier, cache = this.formeClasseur === 'cache'
    // Au téléphone (lot 5, K10), il devient « Plus » : la page, les outils de
    // cours et le classeur y sont
    const base = this.telephone ? TITRE_PLUS_TELEPHONE : TITRE_FICHIER
    const titre = cache ? `${base} · Classeur « ${this.app.classeur.nom} »` : base
    if (f.title !== titre) { f.title = titre; f.setAttribute('aria-label', titre) }
    if (cache) f.setAttribute('aria-describedby', ID_ETAT)
    else f.removeAttribute('aria-describedby')
    const sansPoint = !(cache && this.attention)
    if (this.pointFichier.hidden !== sansPoint) this.pointFichier.hidden = sansPoint
  }

  /** L'état a changé (ou il est temps de vieillir « il y a 2 min ») */
  private majEtat() {
    const s = this.surveillance
    if (!s) return
    const t = s.texte
    this.majNomClasseur()
    if (this.etatClasseur.textContent !== t.court) this.etatClasseur.textContent = t.court
    if (this.boutonClasseur.dataset.niveau !== t.niveau) this.boutonClasseur.dataset.niveau = t.niveau
    if (this.pointClasseur.hidden !== (t.niveau !== 'attention')) this.pointClasseur.hidden = t.niveau !== 'attention'
    // Pour le lecteur d'écran : toutes les lignes, chacune finie par un point
    const description = t.lignes.map(l => /[.…!]$/.test(l.texte) ? l.texte : l.texte + '.').join(' ')
    if (this.descriptionEtat.textContent !== description) this.descriptionEtat.textContent = description
    // Le bloc du menu ⋯ ouvert se refait, sauf si le focus y est (son bouton)
    const bloc = this.blocEtat
    if (bloc?.isConnected && !this.menuFichier.el.hidden && !bloc.contains(document.activeElement)) this.remplirBlocEtat()
    this.majBandeau(s.bandeau)
  }

  /** Le bandeau discret : une ligne sous le bouton du classeur (ou sous la
   *  barre du haut), seulement pour une action qui demande un clic. Son
   *  texte est celui de son apparition (le lecteur d'écran le lit une fois). */
  private majBandeau(b: Bandeau | null) {
    const el = this.bandeau
    const actions = b ? b.actions.filter(a => this.actionsEtat.has(a)) : []
    const forme = b ? `${b.raison}|${actions.join()}|${b.fermable}` : ''
    if (el.dataset.forme !== forme) {
      el.dataset.forme = forme
      el.dataset.raison = b?.raison ?? ''
      el.replaceChildren()
      if (b) {
        const texte = Object.assign(document.createElement('span'), { className: 'texte-bandeau', textContent: b.texte })
        const boutons = Object.assign(document.createElement('span'), { className: 'actions-bandeau' })
        for (const a of actions) {
          const x = this.actionsEtat.get(a)!
          const bt = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-bandeau', textContent: x.libelle })
          bt.dataset.etatAction = a
          bt.addEventListener('click', () => x.faire())
          boutons.appendChild(bt)
        }
        el.append(texte)
        if (b.fermable) {
          const raison = b.raison
          const fermer = Object.assign(document.createElement('button'), { type: 'button', className: 'fermer-bandeau', innerHTML: icone('fermer') })
          fermer.title = 'Fermer'; fermer.setAttribute('aria-label', 'Fermer')
          fermer.addEventListener('click', () => this.surveillance?.fermerBandeau(raison))
          el.append(fermer)
        }
        el.append(boutons)
      }
    }
    if (el.hidden !== !b) el.hidden = !b
    if (b) this.placerBandeau()
  }

  /** Sous le bouton du classeur quand il a sa barre ; sinon sous la barre
   *  du haut, aligné à droite, mais jamais sous la barre des outils : sur un
   *  téléphone en portrait, la barre du haut va d'un bord à l'autre, et la
   *  barre des outils (au-dessus du bandeau) en cacherait le début du texte
   *  et des boutons. Il s'arrête alors à 8 px à droite d'elle. */
  private placerBandeau() {
    const el = this.bandeau
    if (el.hidden) return
    if (this.formeClasseur === 'large' || this.formeClasseur === 'etroit') {
      const r = this.barreClasseur.getBoundingClientRect()
      el.style.left = Math.round(r.left) + 'px'; el.style.right = ''; el.style.top = Math.round(r.bottom + 8) + 'px'
      el.style.maxWidth = ''
    } else {
      const r = this.barreHaut.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
      const droite = Math.round(window.innerWidth - r.right), haut = Math.round(r.bottom + 8)
      el.style.left = ''; el.style.right = droite + 'px'; el.style.top = haut + 'px'
      // (la barre des outils posée en bas, au téléphone en portrait, n'est
      // pas à côté de lui : lot 5, K10)
      const gauche = o.width > 0 && o.bottom > haut && o.left < window.innerWidth / 2 && !this.barreEnBas() ? Math.round(o.right + 8) : 12
      el.style.maxWidth = `min(360px, ${Math.max(160, window.innerWidth - droite - gauche)}px)`
    }
  }

  /** Le bouton du classeur revient dans sa barre (avant de régler le nom de
   *  la page : la barre du haut est alors celle du lot 3) */
  private sortirBoutonClasseur() {
    if (this.boutonClasseur.parentElement !== this.barreClasseur) this.barreClasseur.appendChild(this.boutonClasseur)
  }

  /** La place du bouton du classeur, MESURÉE, entre la barre des outils et
   *  la barre du haut : place = bord gauche de la barre du haut − (bord droit
   *  de la barre des outils + 12) − 12.
   *  a) assez pour que le plus long des textes courts de l'état y tienne
   *     entier (placeDeLaFormeLarge : 252 px), et 140 px au moins : sa propre
   *     barre, à 12 px à droite de la barre des outils, avec l'icône, le nom
   *     et l'état (au plus toute la place) ;
   *  b) de 58 px à la place de a) : sa barre, avec l'icône et le point ;
   *  c) moins, et la barre du haut déjà sur plusieurs rangées : il devient
   *     son premier élément (l'icône et le point), s'il n'y ajoute pas de
   *     rangée ; sinon d) ;
   *  d) sinon, il est caché : le bouton ⋯ porte le point, son titre nomme le
   *     classeur (« · Classeur « X » »), son menu commence par le bloc du
   *     classeur.
   *  Mesuré : 1366 × 768 → 424 px (a) ; 1280 × 720 → 338 (a) ; TNI 1920 →
   *  978 (a) ; 1194 × 834 → 252 (a) ; 1180 × 820 → 238 (b : « Seulement
   *  dans ce navigateur » y serait coupé) ; 1112 × 834 → 170 (b) ; 1024 ×
   *  768 sans nom de page → 82 (b),
   *  avec un nom → −5 (d : le compteur y prend la place jusqu'à x = 89 ; la
   *  barre du haut et le nom de la page restent ceux du lot 3) ; 1100 avec
   *  un nom → 24 (d) ; 960 × 600 → 18 sur une rangée (d : l'insérer
   *  ajouterait une rangée) ; 768 × 1024, 820 × 1180, 844 × 390, 641 × 900
   *  → −6 sur deux rangées (c : la hauteur reste 104) ; 390 × 844 (c : 150).
   *  Appelé par reglerCompteur seulement (jamais d'une page à l'autre). */
  private placerBoutonClasseur() {
    const haut = this.barreHaut, barre = this.barreClasseur, b = this.boutonClasseur
    const o = this.barreOutils.getBoundingClientRect(), h = haut.getBoundingClientRect()
    const gauche = Math.round(o.right + 12)
    const place = Math.floor(h.left - gauche - 12)
    let forme: FormeBoutonClasseur
    if (this.telephone) {
      // La mise en page du téléphone (lot 5, K10) : la barre du haut est sur
      // une rangée, et le bouton du classeur en est le premier bouton (son
      // icône et le point) s'il y tient sans en ajouter une ; sinon sa barre,
      // étroite, si elle a la place ; sinon caché (le point sur « Plus »)
      b.classList.add('etroit')
      haut.prepend(b)
      if (haut.getBoundingClientRect().height <= h.height + 0.5) forme = 'dans-la-barre'
      else { barre.appendChild(b); forme = place >= 58 ? 'etroit' : 'cache' }
    } else if (place >= Math.max(140, this.placeDeLaFormeLarge())) forme = 'large'
    else if (place >= 58) forme = 'etroit'
    else if (h.height > PLUSIEURS_RANGEES) {
      b.classList.add('etroit')
      haut.prepend(b)
      forme = haut.getBoundingClientRect().height > h.height + 0.5 ? 'cache' : 'dans-la-barre'
      if (forme === 'cache') barre.appendChild(b)
    } else forme = 'cache'
    this.formeClasseur = forme
    b.classList.toggle('etroit', forme !== 'large')
    this.placerChampRecherche()
    barre.hidden = forme === 'cache' || forme === 'dans-la-barre'
    barre.dataset.forme = forme
    if (!barre.hidden) {
      barre.style.left = gauche + 'px'
      // Large : au plus toute la place, et au moins 200 px (quand elle les
      // a), pour que la barre ne change pas de largeur à chaque minute
      barre.style.maxWidth = forme === 'large' ? place + 'px' : ''
      barre.style.minWidth = forme === 'large' ? Math.min(place, 200) + 'px' : ''
    }
    this.majBoutonFichier()
    this.placerBandeau()
  }

  /** La place que demande la forme large pour que le plus long des textes
   *  courts de l'état y tienne entier (« Seulement dans ce navigateur » :
   *  184 px de texte, 252 px en tout). Mesurée dans la police de l'état, par
   *  un texte caché (le texte du bouton est caché dans les autres formes). */
  private placeDeLaFormeLarge(): number {
    let m = this.mesureCourt
    if (!m?.isConnected) {
      m = this.mesureCourt = Object.assign(document.createElement('span'), { className: 'mesure-etat' })
      m.setAttribute('aria-hidden', 'true')
      document.body.appendChild(m)
    }
    let texte = 0
    for (const t of COURTS_LES_PLUS_LONGS) { m.textContent = t; texte = Math.max(texte, m.getBoundingClientRect().width) }
    return Math.ceil(texte) + AUTOUR_DU_TEXTE
  }

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

  /** Des fichiers glissés sur le tableau (.memc, .memb, ou .mem) : comme
   *  « Ouvrir un classeur » (plusieurs à la fois avec la bibliothèque ; sans
   *  elle, le premier, qui remplace le classeur ouvert) */
  ouvrirFichiers(f: File[]) {
    if (this.fichiers) void this.fichiers.ouvrir(f.map(fichier => ({ fichier })))
    else if (f[0]) void this.sauvegarde.ouvrirFichier(f[0])
  }

  /** Les fichiers (lot 4 C9) : Ouvrir ajoute à la bibliothèque, et le
   *  conflit de la clé propose d'ouvrir son fichier */
  /** La fenêtre « Enregistrer » du lot 7 (l'ordinateur ou le Drive, ce
   *  classeur, son niveau, toute la bibliothèque) ; posée par main.ts */
  enregistrerAilleurs: (() => void) | null = null
  /** La bibliothèque et ce classeur : Publier retrouve le dossier du chapitre et retient le dossier et le Drive choisis */
  brancherReplay(registre: Registre, idClasseur: string) { this.publication.lieu = { registre, idClasseur } }

  brancherFichiers(f: Fichiers | null) {
    this.fichiers = f
    if (f) this.inscrireActionEtat('ouvrir-cle', 'Ouvrir le fichier', () => void f.ouvrirLeFichierDeLaCle())
  }

  // ----- Copier en image (voir sorties/image.ts) -----
  /** Une page telle que le document la garde : son fond, son origine, ses formes */
  private pageAPeindre(id: string): PageAPeindre {
    const t = this.app.tableau
    return { fond: t.fondDe(id), origine: t.origineDe(id), formes: [...(t.formesDe(id)?.values() ?? [])] }
  }

  /** « Copier la page en image » (le menu de la page) ou « Copier en image »
   *  (le menu complet : ce qui est pris, les points liés aux images
   *  compris). Dans le geste : la copie part tout de suite. */
  copierEnImage(quoi: 'page' | 'selection') {
    const app = this.app
    if (app.enLecture) return
    const id = app.page, numero = app.pages.indexOf(id) + 1
    if (quoi === 'selection') {
      const formes = app.objetsChoisis()
      if (!formes.length) return this.message('Rien n\'est sélectionné.')
      copierEnImage(this, { page: this.pageAPeindre(id), formes, nom: nomDeLImage(numero, null, true) })
      return
    }
    // Le point d'un simple toucher qui attend encore est de la page
    app.poserCeQuiAttend()
    this.copierPageEnImage(id)
  }

  /** La page entière en image (le menu de la page ; celui d'une vignette de
   *  la trieuse, qui reste ouverte) */
  copierPageEnImage(id: string) {
    const page = this.pageAPeindre(id)
    if (!page.formes.length) return this.message('La page est vide : rien à copier.')
    const numero = this.app.pages.indexOf(id) + 1
    // Une page plus haute que trois fois sa largeur : le message propose le
    // PDF, qui la découpe en feuilles A4 au lieu de la réduire
    copierEnImage(this, { page, nom: nomDeLImage(numero, this.app.tableau.nomDe(id), false), pdf: () => this.exporterPdf({ page: id }) })
  }

  // ----- Exporter en PDF (voir sorties/export-pdf.ts) -----
  /** La fenêtre « Exporter en PDF » : la page (le menu de la page, Ctrl + P ;
   *  elle propose aussi tout le classeur), les pages choisies dans la
   *  trieuse, ou tout le classeur (le menu ⋯, la trieuse). Pas pendant la
   *  revue ni une séance, ni par-dessus une autre fenêtre ; la trieuse
   *  reste ouverte et utilisable pendant l'export. */
  exporterPdf(cible: CibleExport) {
    const app = this.app
    if (app.enLecture || this.revue.ouvert || document.querySelector('dialog[open]')) return
    // Le point d'un simple toucher qui attend encore est de la page
    app.poserCeQuiAttend()
    this.fermerMenus()
    ouvrirFenetrePdf(this.hotePdf(), cible)
  }

  /** Ce que l'export lit du classeur : le document, l'ordre, le geste en cours, son nom */
  private hotePdf(): HoteFenetrePdf {
    const app = this.app, t = app.tableau
    return {
      apercus: this.apercus,
      fondDe: p => t.fondDe(p),
      origineDe: p => t.origineDe(p),
      formesDe: p => t.formesDe(p)?.values() ?? [],
      nomDe: p => t.nomDe(p),
      // Le PDF d'une séance (lot 6) : celle qu'on regarde (la trieuse : celle du jour)
      pages: () => this.trieuse?.ouvert ? app.pagesDuJour : app.pages,
      // (« Toute la séance » quand le classeur en a d'autres ; une seule : c'est tout le classeur)
      toutLibelle: n => `${n < t.ordre.length ? 'Toute la séance' : 'Tout le classeur'} : ${pagesLisibles(n)}`,
      toutesLesPages: () => t.ordre.toArray(),
      enGeste: () => app.enGeste,
      classeur: () => app.classeur.nom,
      message: (texte, action) => this.message(texte, action),
      maj: () => this.maj(),
    }
  }

  // ----- Les séances (lot 6, voir seances-vue.ts) -----
  /** Une écriture sur une page d'une séance passée a été retenue : la
   *  question « Juste regarder / Reprendre et écrire » (une seule à la fois) */
  ecritureSurSeancePassee(page: string) {
    const s = this.app.tableau.seanceDe(page)
    if (!s || document.querySelector('dialog.dialogue-reprise')) return
    if (document.querySelector('dialog[open]')) { this.app.repondreSeancePassee(false); return }
    this.fermerMenus()
    void demanderReprise(this.racine, s).then(oui => this.app.repondreSeancePassee(oui))
  }

  /** Une séance commence : le bandeau « Reprendre » */
  seanceCommencee(precedente: SeanceDuClasseur | null) { this.bandeauxSeances.seanceCommencee(precedente) }

  /** « Renommer la séance… » (le menu ⋯) : la séance qu'on regarde */
  async renommerSeance() {
    const s = this.app.seanceVue
    if (!s || document.querySelector('dialog[open]')) return
    const nom = await demanderNomDeSeance(this.racine, s)
    if (nom === null) return
    if (this.app.tableau.renommerSeance(s.id, nom || null)) this.message(nom ? `Séance renommée : « ${nom} »` : `Nom de la séance retiré : « ${libelleSeance({ debut: s.debut, nom: null })} »`)
    this.maj()
  }

  /** « Nouvelle séance » (le menu ⋯) */
  nouvelleSeance() {
    if (tableauCache(this.app) || document.querySelector('dialog[open]')) return
    this.app.nouvelleSeance()
    const s = this.app.seanceVue
    if (s) this.message(`Nouvelle séance : ${libelleSeance(s)}`)
  }

  // ----- Envoyer vers une autre page (voir pages/envoi.ts) -----
  /** « Envoyer vers… » (le menu complet) : la fenêtre des destinations, pour
   *  ce qui est pris, ou pour ces objets (ids : les images fixées en fond,
   *  depuis le menu de la page, lot 5). Pas quand le tableau est caché, ni
   *  par-dessus une autre fenêtre. */
  ouvrirEnvoi(ids?: string[]) {
    const app = this.app
    if (tableauCache(app) || document.querySelector('dialog[open]')) return
    app.poserCeQuiAttend()
    const n = (ids ? app.avecLeursPoints(ids) : app.objetsChoisis()).length
    if (!n) return this.message('Rien n\'est sélectionné.')
    ouvrirEnvoi({
      n, pages: app.pagesDuJour, page: app.page,
      nomDe: p => app.tableau.nomDe(p),
      vignette: (p, l, h) => this.vignettes.vignette(p, l, h),
      envoyer: (cible, deplacer) => { app.envoyerSelection(cible, deplacer, ids) },
      maj: () => this.maj(),
    })
  }

  /** Le menu de la page : un clic droit dans le vide (voir App.demanderOptions).
   *  Il se pose au point de l'appui, à sa droite et vers le bas comme le
   *  menu du système (de l'autre côté s'il n'y a pas la place), et se ferme
   *  comme les autres petits menus : Échap, un choix, ou un appui ailleurs
   *  (qui ne laisse pas d'encre). Coller ici, Tout sélectionner, Tout voir,
   *  ce qui ne se prend pas (lot 5 : l'image fixée en fond, à détacher,
   *  copier, envoyer ; Déverrouiller tout : voir sectionProtegee), puis ce qui
   *  touche la page elle-même (Dupliquer la page, Toutes les
   *  pages…), et ce qui en sort (Copier la page en image, Exporter la page
   *  en PDF…).
   *  m : le point du monde où « Coller ici »
   *  colle. Refait à chaque ouverture : la copie et la page ont pu changer.
   *  auClavier : ouvert par la touche Menu (voir App.menuAuClavier), le
   *  focus va à sa première entrée active. */
  ouvrirMenuPage(x: number, y: number, m: P, auClavier = false) {
    const app = this.app, el = this.menuPage.el
    el.replaceChildren()
    this.entreeMenu(el, 'Coller ici', () => app.coller(m), { touche: `${CTRL} + V`, inactif: !app.peutColler(),
      aide: `Le dernier objet copié dans MEM ; ${CTRL} + V colle aussi une image ou ce qu'on a copié dans une autre version de MEM` })
    // Grisé aussi quand tout ce qui est sur la page est verrouillé ou fixé en fond (lot 5)
    this.entreeMenu(el, 'Tout sélectionner', () => app.toutSelectionner(), { touche: `${CTRL} + A`, inactif: app.rienASelectionner() })
    this.entreeMenu(el, 'Tout voir', () => app.toutVoir(), { touche: 'Maj + 1' })
    this.sectionProtegee(el, m)
    // Une page d'une séance passée (lot 6) : la reprendre, ou en copier ce qui est pris
    if (app.enSeancePassee) {
      filetMenu(el)
      if (app.selection.size) this.entreeMenu(el, 'Copier dans la séance d\'aujourd\'hui', () => app.copierVersAujourdhui(), { action: 'copier-aujourdhui',
        aide: 'Sur la page du jour où vous étiez, à la même place' })
      this.entreeMenu(el, 'Reprendre la page', () => app.reprendrePage(app.page), { action: 'reprendre-page',
        aide: 'Une copie dans la séance du jour, telle qu\'elle est ici ; celle-ci ne change pas' })
      this.entreeMenu(el, 'Retour à aujourd\'hui', () => app.retourAujourdhui(), { action: 'retour-aujourdhui' })
    }
    // La page elle-même : Dupliquer la page · Toutes les pages… · ─ ·
    // Copier la page en image · Exporter la page en PDF…
    el.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    this.entreeMenu(el, 'Dupliquer la page', () => app.dupliquerLaPage(), { touche: `${CTRL} + Maj + D`,
      aide: 'Une copie juste après, avec toute son histoire (Revoir la montre se construire)' })
    // Ouverte au clavier (Entrée sur l'entrée), la trieuse rend le focus au compteur
    this.entreeMenu(el, 'Toutes les pages…', e => this.ouvrirTrieuse(e.detail === 0), { touche: 'Maj + P',
      aide: 'Les pages en vignettes : aller à une page, les ranger' })
    // Ce qui sort de la page : son image, pour l'ENT ou Pronote (pas de
    // raccourci : Ctrl + Maj + C ouvre l'inspecteur du navigateur), et son
    // PDF ; toutes deux grisées sur une page vide (tout le classeur reste à
    // portée : le menu ⋯, et Ctrl + P, dont la fenêtre propose les deux)
    el.appendChild(Object.assign(document.createElement('hr'), { className: 'menu-filet' }))
    this.entreeMenu(el, 'Copier la page en image', () => this.copierEnImage('page'), { inactif: app.pageVide(),
      aide: `Une image PNG, à coller dans l'ENT ou Pronote (${CTRL}+V)` })
    this.entreeMenu(el, 'Exporter la page en PDF…', () => this.exporterPdf({ page: app.page }), { touche: `${CTRL} + P`,
      inactif: app.pageVide(), aide: 'Cadrée sur son contenu, en feuilles A4 à imprimer' })
    ouvrirMenu(this.menuPage)
    placerMenu(el, new DOMRect(x, y, 0, 0), 'droite')
    if (auClavier) allerAuxEntrees(el, 1, ENTREES)
  }

  /** Ce que le menu de la page fait de ce qui ne se prend pas (lot 5), après
   *  un filet, s'il y en a. Les images fixées en fond : le clic droit (le
   *  bouton du stylet, l'appui long) sur l'une d'elles ouvre ce menu, comme
   *  dans le vide ; on y détache, copie ou envoie la plus haute de celles qui
   *  sont sous le pointeur, ou, à côté d'elles, toutes celles de la page (un
   *  professeur veut qu'un énoncé fixé survive à la copie et à l'envoi, et
   *  il ne peut ni le prendre ni le sélectionner). Puis « Déverrouiller
   *  tout », s'il y a des objets verrouillés (un réglage, comme Verrouiller). */
  private sectionProtegee(el: HTMLElement, m: P) {
    const app = this.app
    const fixes = app.fixesDeLaPage(), verrous = app.verrouillesDeLaPage()
    if (!fixes.length && !verrous.length) return
    filetMenu(el)
    if (fixes.length) {
      const sous = app.fixesSous(m)
      const cible = sous.length ? [sous[0]] : fixes
      const ids = cible.map(f => f.id), plusieurs = cible.length > 1
      const aide = plusieurs ? `${cible.length} images fixées en fond sur cette page` : undefined
      this.entreeMenu(el, plusieurs ? 'Détacher le fond' : 'Détacher l\'image du fond', e => app.detacherDuFond(ids, pointeurDuClic(e, app.dernierPointeur)),
        { action: 'detacher-fond', aide: aide ?? 'Elle se prend et se déplace de nouveau' })
      this.entreeMenu(el, plusieurs ? 'Copier le fond' : 'Copier l\'image du fond', () => app.copierFond(ids),
        { action: 'copier-fond', aide: aide ?? `${CTRL}+V la colle ici ou ailleurs, fixée en fond` })
      this.entreeMenu(el, plusieurs ? 'Envoyer le fond vers…' : 'Envoyer l\'image du fond vers…', () => this.ouvrirEnvoi(ids),
        { action: 'envoyer-fond', aide: aide ?? 'La déplacer ou la copier sur une autre page, fixée en fond' })
    }
    if (verrous.length) {
      this.entreeMenu(el, 'Déverrouiller tout', () => app.verrouiller(false, verrous.map(f => f.id)), { action: 'deverrouiller-tout',
        aide: accorder(compterObjets(verrous), 'objet verrouillé sur cette page', 'objets verrouillés sur cette page') })
    }
  }

  // ----- La barre des outils du téléphone (lot 5, K10) -----
  /** « Couleur » et « Autres outils », au bout de la barre (la feuille de
   *  style les cache hors de la mise en page du téléphone ; au téléphone, la
   *  barre montre Stylo, Gomme, Sélection, Couleur, Annuler, Rétablir, Autres
   *  outils, dans l'ordre du document : Annuler et Rétablir viennent entre
   *  les deux, voir placerHistorique), et leurs deux petits menus (menus.ts) :
   *  un seul ouvert à la fois, Échap ou un appui ailleurs les ferme, un choix
   *  aussi. */
  private construireBoutonsDuTelephone(barre: HTMLElement) {
    const couleur = this.boutonCouleur = document.createElement('button')
    couleur.type = 'button'; couleur.className = 'bouton bouton-couleur seulement-telephone'
    couleur.title = 'Couleur et épaisseur'; couleur.setAttribute('aria-label', 'Couleur et épaisseur')
    couleur.setAttribute('aria-haspopup', 'menu'); couleur.setAttribute('aria-expanded', 'false')
    this.rondCouleur = Object.assign(document.createElement('span'), { className: 'rond-couleur' })
    this.rondCouleur.setAttribute('aria-hidden', 'true')
    couleur.appendChild(this.rondCouleur)
    const menuCouleur = document.createElement('div')
    menuCouleur.className = 'menu-flottant menu-couleur'; menuCouleur.setAttribute('role', 'menu'); menuCouleur.setAttribute('aria-label', 'Couleur et épaisseur')
    menuCouleur.hidden = true
    this.menuCouleur = { el: menuCouleur, bouton: couleur }
    couleur.addEventListener('click', e => this.basculerMenuDuTelephone(this.menuCouleur, () => this.construireMenuCouleur(), e.detail === 0))

    const autres = this.boutonAutres = document.createElement('button')
    autres.type = 'button'; autres.className = 'bouton autres-outils seulement-telephone'
    autres.title = 'Autres outils'; autres.setAttribute('aria-label', 'Autres outils')
    autres.setAttribute('aria-haspopup', 'menu'); autres.setAttribute('aria-expanded', 'false')
    autres.dataset.icone = 'points'; autres.innerHTML = icone('points')
    const menuAutres = document.createElement('div')
    menuAutres.className = 'menu-flottant menu-autres'; menuAutres.setAttribute('role', 'menu'); menuAutres.setAttribute('aria-label', 'Autres outils')
    menuAutres.hidden = true
    this.menuAutres = { el: menuAutres, bouton: autres }
    autres.addEventListener('click', e => this.basculerMenuDuTelephone(this.menuAutres, () => this.construireMenuAutres(), e.detail === 0))
    barre.append(couleur, autres)
    // (leurs menus vont à la racine avec les autres, après eux : voir construire)
  }

  /** Ouvre (ou referme) un des deux menus de la barre du téléphone (le menu
   *  « Couleur » aussi dans la barre repliée d'un écran qu'on touche, voir
   *  majCouleursRepliees), refait à chaque ouverture ; au clavier, le focus
   *  va sur le choix coché */
  private basculerMenuDuTelephone(m: Menu, construire: () => void, auClavier: boolean) {
    if (m.el.hidden) construire()
    basculerMenu(m)
    if (m.el.hidden) return
    this.placerPresDeLaBarre(m.el, m.bouton!)
    if (auClavier) (m.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]') ?? m.el.querySelector<HTMLElement>(ENTREES))?.focus()
  }

  /** Un menu de la barre des outils, près de son bouton : au-dessus en
   *  portrait (la barre est en bas), à droite de la barre en paysage (à la
   *  hauteur du bouton), comme ceux de la Gomme et du doigt au poste de la
   *  classe ; toujours dans l'écran (placerMenu) */
  private placerPresDeLaBarre(el: HTMLElement, b: HTMLElement) {
    const r = b.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    // Il ne couvre ni la barre des outils ni celle du haut : il tient dans la
    // place qui reste entre elles (sur un téléphone couché, 320 px de haut,
    // le menu de la Gomme y défile), et s'y pose
    if (this.barreEnBas()) {
      el.style.maxWidth = ''
      el.style.maxHeight = Math.max(120, Math.floor(o.top - 6 - (h.bottom + 8))) + 'px'
      placerMenu(el, new DOMRect(r.left, o.top, r.width, o.height), 'dessus')
      return
    }
    el.style.maxWidth = Math.floor(window.innerWidth - o.right - 6 - 8) + 'px'
    el.style.maxHeight = ''
    placerMenu(el, new DOMRect(o.left, r.top, o.width, r.height), 'droite')
    const m = el.getBoundingClientRect()
    if (m.right <= h.left || m.left >= h.right || m.top >= h.bottom || m.bottom <= h.top) return
    // Sous la barre du haut : jusqu'en bas de l'écran, et il défile s'il le faut
    el.style.maxHeight = Math.max(120, Math.floor(window.innerHeight - (h.bottom + 8) - 8)) + 'px'
    el.style.top = Math.max(8, Math.min(h.bottom + 8, window.innerHeight - el.offsetHeight - 8)) + 'px'
  }

  /** Une couleur choisie (une pastille de la barre, ou du menu « Couleur ») :
   *  le Stylo la prend, sauf si l'on tient le Surligneur, le Segment ou la
   *  Formule, qui la gardent */
  private choisirCouleur(valeur: string) {
    const app = this.app
    app.couleur = valeur
    if (app.outil !== 'surligneur' && app.outil !== 'segment' && app.outil !== 'formule') app.choisirOutil('stylo')
    this.maj()
  }

  /** Le menu « Couleur » : les quatre pastilles, puis les trois tailles,
   *  44 × 44 chacune, en grille (les flèches s'y déplacent comme dans celle
   *  des fonds) */
  private construireMenuCouleur() {
    const app = this.app, m = this.menuCouleur.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-couleur' })
    const choix = (classe: string, titre: string, coche: boolean, faire: () => void) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item case-couleur ' + classe
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(coche))
      b.title = titre; b.setAttribute('aria-label', titre)
      b.addEventListener('click', () => { fermerMenu(); faire() })
      grille.appendChild(b)
      return b
    }
    for (const c of COULEURS) choix('pastille', c.nom, app.couleur === c.valeur, () => this.choisirCouleur(c.valeur)).style.setProperty('--teinte', c.valeur)
    TAILLES.forEach((t, i) => {
      const b = choix('taille', 'Trait ' + t.nom.toLowerCase(), app.tailleEnMain() === t.valeur, () => { app.choisirTaille(t.valeur); this.maj() })
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
    })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  }

  // ----- Annuler, Rétablir et l'épaisseur du trait (gains rapides, lot 16) -----
  /** Annuler et Rétablir dans la barre qui leur revient : en tête de la
   *  barre du haut, devant leur filet (toujours dans l'écran) ; dans la mise
   *  en page du téléphone, dans la barre du bas, entre « Couleur » et
   *  « Autres outils » (l'ordre de l'écran, lot 5, K10). Les mêmes deux
   *  boutons, déplacés d'une barre à l'autre quand la mise en page change
   *  (au départ, et dans suivre), comme le bouton du classeur. */
  private placerHistorique() {
    const telephone = this.telephone
    const dans = telephone ? this.barreOutils : this.barreHaut
    if (this.boutonAnnuler.parentElement === dans) return
    if (telephone) this.boutonAutres.before(this.boutonAnnuler, this.boutonRetablir)
    else this.filetHistorique.before(this.boutonAnnuler, this.boutonRetablir)
  }

  /** Le bouton de l'épaisseur montre celle de l'outil en main (au
   *  Surligneur, la sienne) : son trait (--d : 4, 8 ou 12 px), son titre
   *  (« Épaisseur du trait : Fin ») et data-taille ; refait seulement quand
   *  elle change. Une épaisseur qui n'est pas l'une des trois (un vieux
   *  réglage) montre la plus proche. */
  private majBoutonEpaisseur() {
    const v = this.app.tailleEnMain()
    const i = TAILLES.reduce((meilleur, t, k) => Math.abs(t.valeur - v) < Math.abs(TAILLES[meilleur].valeur - v) ? k : meilleur, 0)
    const nom = TAILLES[i].nom
    if (nom === this.epaisseurMontree) return
    this.epaisseurMontree = nom
    this.traitEpaisseur.style.setProperty('--d', `${4 + i * 4}px`)
    const t = `Épaisseur du trait : ${nom}`
    this.boutonEpaisseur.title = t; this.boutonEpaisseur.setAttribute('aria-label', t)
    this.boutonEpaisseur.dataset.taille = nom
  }

  /** Le menu de l'épaisseur : ouvert (ou refermé) par son bouton, refait à
   *  chaque ouverture, posé à droite de la barre ; ouvert au clavier, le
   *  focus va sur l'épaisseur cochée (Échap le ferme et le rend au bouton) */
  private basculerMenuEpaisseur(auClavier: boolean) {
    const m = this.menuEpaisseur
    if (m.el.hidden) this.construireMenuEpaisseur()
    basculerMenu(m)
    if (m.el.hidden) return
    this.placerMenuEpaisseur()
    if (auClavier) m.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  }

  /** Les trois épaisseurs, en rangée (44 × 44 chacune, comme dans le menu
   *  « Couleur » ; les flèches s'y déplacent, Entrée choisit) : un choix
   *  règle l'épaisseur de l'outil en main et ferme le menu */
  private construireMenuEpaisseur() {
    const app = this.app, m = this.menuEpaisseur.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-epaisseur' })
    TAILLES.forEach((t, i) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item case-couleur taille'
      b.setAttribute('role', 'menuitemradio'); b.setAttribute('aria-checked', String(app.tailleEnMain() === t.valeur))
      b.title = t.nom; b.setAttribute('aria-label', 'Trait ' + t.nom.toLowerCase())
      b.innerHTML = `<span style="--d:${4 + i * 4}px"></span>`
      b.addEventListener('click', () => { fermerMenu(); app.choisirTaille(t.valeur); this.maj() })
      grille.appendChild(b)
    })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  }

  /** Le menu de l'épaisseur, à droite de la barre, à la hauteur de son
   *  bouton, jamais sous la barre du haut (comme celui de la Gomme) */
  private placerMenuEpaisseur() {
    const b = this.boutonEpaisseur.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuEpaisseur.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuEpaisseur.el)
  }

  /** Le menu « Autres outils » : une grille de 60 × 56, l'icône et son nom
   *  dessous : Surligneur, Point, Segment, Formes, Formule, Vue, puis le
   *  Doigt (sur un appareil tactile : il ouvre son menu, au même endroit) et
   *  « Supprimer la sélection » (grisée sans sélection). Formes et Segment
   *  prennent leur outil, et leurs choix paraissent au-dessus de la barre (à
   *  sa droite en paysage) : un type de forme ou de segment en trois
   *  touchers (Autres outils, Formes, Rectangle). */
  private construireMenuAutres() {
    const app = this.app, m = this.menuAutres.el
    m.replaceChildren()
    const grille = Object.assign(document.createElement('div'), { className: 'grille-autres' })
    const entree = (nomIcone: string, mot: string, titre: string, faire: () => void, o: { coche?: boolean; inactif?: boolean; menu?: boolean; danger?: boolean } = {}) => {
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'menu-item outil-grille' + (o.danger ? ' danger' : '')
      b.setAttribute('role', o.coche === undefined ? 'menuitem' : 'menuitemradio')
      if (o.coche !== undefined) b.setAttribute('aria-checked', String(o.coche))
      if (o.inactif) b.setAttribute('aria-disabled', 'true')
      if (o.menu) b.setAttribute('aria-haspopup', 'menu')
      b.title = titre; b.setAttribute('aria-label', titre)
      b.dataset.action = nomIcone
      b.innerHTML = icone(nomIcone)
      b.appendChild(Object.assign(document.createElement('span'), { className: 'nom', textContent: mot }))
      b.addEventListener('click', e => {
        if (o.inactif) return
        fermerMenu()
        faire()
        // Ouvert au clavier, le menu qui suit (le doigt) prend le focus
        if (o.menu && e.detail === 0) this.menuDoigt.el.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
      })
      grille.appendChild(b)
    }
    for (const id of AUTRES_OUTILS) {
      const o = OUTILS.find(x => x.id === id)!
      entree(id, NOMS_OUTILS[id], `${o.nom} (${o.touche})`, () => app.choisirOutil(id), { coche: app.outil === id })
    }
    if (!this.boutonDoigt.hidden) entree('doigt', 'Doigt', this.boutonDoigt.title, () => this.basculerReglageDoigt(false), { menu: true })
    entree('poubelle', 'Supprimer', 'Supprimer la sélection (Suppr)', () => app.supprimerSelection(), { inactif: !(app.selection.size || app.partie), danger: true })
    grille.addEventListener('keydown', e => naviguerDansLaGrille(grille, e))
    m.appendChild(grille)
  }

  /** « Autres outils » montre l'outil qu'on tient s'il en est un (son icône et
   *  le coup de surligneur), sinon ses points ; « Couleur », la couleur en
   *  main */
  private majBoutonsDuTelephone() {
    const app = this.app, b = this.boutonAutres
    const autre = AUTRES_OUTILS.includes(app.outil)
    const nom = autre ? app.outil : 'points'
    if (b.dataset.icone !== nom) { b.dataset.icone = nom; b.innerHTML = icone(nom) }
    b.classList.toggle('actif', autre)
    const teinte = app.nuit ? nocturne(app.couleur) : app.couleur
    if (this.rondCouleur.style.getPropertyValue('--teinte') !== teinte) this.rondCouleur.style.setProperty('--teinte', teinte)
  }

  /** L'aimant du quadrillage (le bouton de la barre du haut, ou la case de « Plus ») */
  private basculerAimant() {
    this.app.aimant = !this.app.aimant
    this.maj()
  }

  /** Le stylo qui redresse les figures (le bouton, ou la case de « Plus ») */
  private basculerReconnaissance() {
    const app = this.app
    app.reconnaissance = !app.reconnaissance
    this.message(app.reconnaissance ? 'Le stylo reconnaît les figures' : 'Le stylo laisse les tracés à main levée')
    this.maj()
  }

  /** Le programme de construction s'ouvre ou se ferme (son bouton, ou « Plus ») */
  private basculerConstructeur() {
    if (this.constructeur.ouvert) this.constructeur.fermer(); else { if (this.catalogue.ouvert) this.catalogue.fermer(); this.constructeur.ouvrir() }
  }
  /** Le catalogue prend la place du programme de construction, à droite */
  private basculerCatalogue() {
    if (this.catalogue.ouvert) this.catalogue.fermer(); else { if (this.constructeur.ouvert) this.constructeur.fermer(); this.catalogue.ouvrir() }
  }


  // ----- Le menu de la Gomme (lot 5) -----
  /** Un clic (ou un toucher) sur le bouton de la Gomme : il la prend ; déjà
   *  en main, il ouvre ses options (ou les referme) ; le clic qui suit
   *  l'appui long qui les a ouvertes ne fait rien */
  private toucherGomme(e: MouseEvent) {
    if (performance.now() - this.gommeOuverteA < 1500) { this.gommeOuverteA = -Infinity; return }
    if (!this.menuGomme.el.hidden) { fermerMenu(); if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme'); return }
    if (this.app.outil === 'gomme') this.ouvrirMenuGomme(e.detail === 0)
    else this.app.choisirOutil('gomme')
  }

  /** Le clic droit sur le bouton de la Gomme (le bouton du stylet en est un)
   *  et l'appui long du doigt ouvrent ses options, sans la prendre. (Pas
   *  d'aria-haspopup : son clic prend d'abord l'outil, ce n'est pas un bouton
   *  de menu ; son titre dit qu'on le retape pour ses options.) */
  private brancherBoutonGomme(b: HTMLButtonElement) {
    const ouvrir = () => { this.gommeOuverteA = performance.now(); this.ouvrirMenuGomme(false) }
    b.addEventListener('contextmenu', e => { e.preventDefault(); clearTimeout(this.appuiLongGomme); ouvrir() })
    const lacher = () => clearTimeout(this.appuiLongGomme)
    b.addEventListener('pointerdown', e => {
      clearTimeout(this.appuiLongGomme)
      this.gommeOuverteA = -Infinity
      if (e.pointerType !== 'touch' || e.button !== 0) return
      this.appuiLongGomme = window.setTimeout(() => {
        try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
        ouvrir()
      }, APPUI_LONG)
    })
    b.addEventListener('pointerup', lacher)
    b.addEventListener('pointercancel', lacher)
    b.addEventListener('pointerleave', lacher)
  }

  ouvrirMenuGomme(auClavier: boolean) {
    const m = this.menuGomme.el
    if (m.hidden) { this.construireMenuGomme(); ouvrirMenu(this.menuGomme) }
    this.placerMenuGomme()
    if (auClavier) m.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  }

  /** Le bouton du fond montre le fond de la page : sa vignette, son titre et
   *  son nom lu (« Fond de la page : Papier pointé »), refaits seulement
   *  quand le fond change */
  private majBoutonFond() {
    const fond = this.app.fond, nuit = this.app.nuit
    if (fond === this.fondMontre && nuit === this.fondMontreDeNuit) return
    this.fondMontre = fond; this.fondMontreDeNuit = nuit
    peindreVignette(this.vignetteFond, fond, VIGNETTE_BOUTON.l, VIGNETTE_BOUTON.h, densite(), nuit)
    const t = `Fond de la page : ${nomDuFond(fond)}`
    this.boutonFond.title = t; this.boutonFond.setAttribute('aria-label', t)
  }

  /** Le menu de la Gomme, à droite de la barre, à la hauteur de son bouton ;
   *  au téléphone, au-dessus de son bouton en portrait (voir placerPresDeLaBarre) */
  private placerMenuGomme() {
    if (this.telephone) { this.placerPresDeLaBarre(this.menuGomme.el, this.outils.get('gomme')!); return }
    // (ce que la mise en page du téléphone lui avait donné ne vaut plus)
    this.menuGomme.el.style.maxWidth = this.menuGomme.el.style.maxHeight = ''
    const b = this.outils.get('gomme')!.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuGomme.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuGomme.el)
  }

  /** Un menu posé à droite de la barre des outils ne passe pas sous la barre
   *  du haut : avec les noms sous les outils (lot 5), elle peut être sur deux
   *  rangées (1024 × 768) et descendre jusqu'à la hauteur des boutons de la
   *  Gomme et du doigt. Il descend alors juste sous elle (s'il y tient). */
  private sousLaBarreDuHaut(el: HTMLElement) {
    const m = el.getBoundingClientRect(), h = this.barreHaut.getBoundingClientRect()
    if (!h.height || m.right <= h.left || m.left >= h.right || m.top >= h.bottom || m.bottom <= h.top) return
    el.style.top = Math.max(8, Math.min(h.bottom + 8, window.innerHeight - m.height - 8)) + 'px'
  }

  private construireMenuGomme() {
    const m = this.menuGomme.el, zone = reglages.gomme === 'zone'
    m.replaceChildren()
    titreMenu(m, 'Gomme')
    const mode = (id: ModeGomme, texte: string, aide: string) => this.entreeMenu(m, texte, () => {
      choisirGomme(id)
      if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme')
      this.maj()
      this.message(id === 'zone' ? 'La gomme efface seulement là où elle passe.' : 'La gomme efface le trait entier.')
    }, { coche: reglages.gomme === id, aide, action: 'gomme-' + id })
    mode('trait', 'Effacer le trait entier', 'Ce qu\'elle touche part en entier : un trait, une figure, une formule (jamais une image)')
    mode('zone', 'Effacer seulement là où elle passe', 'Coupe l\'écriture et le surligneur ; les figures, les images et les formules restent')
    filetMenu(m)
    titreMenu(m, 'Taille (là où elle passe)')
    const tailles: [TailleGomme, string][] = [['petite', 'Petite'], ['moyenne', 'Moyenne'], ['grande', 'Grande']]
    for (const [id, nom] of tailles) {
      this.entreeMenu(m, nom, () => {
        choisirTailleGomme(id)
        if (this.app.outil !== 'gomme') this.app.choisirOutil('gomme')
        this.message(`Gomme : ${nom.toLowerCase()}.`)
      }, { coche: reglages.tailleGomme === id, inactif: !zone, action: 'gomme-' + id })
    }
  }

  /** Le menu du rôle du doigt : ouvert par son bouton, ou par « Changer »
   *  dans le message « Stylet détecté » */
  ouvrirReglageDoigt() {
    if (this.menuDoigt.el.hidden) this.basculerReglageDoigt(false)
  }

  private basculerReglageDoigt(auClavier: boolean) {
    const m = this.menuDoigt.el
    // Un stylet s'est posé sur l'écran : il est tactile, le bouton a sa place
    // (et la barre, plus haute, replie peut-être ses couleurs)
    if (this.boutonDoigt.hidden) { this.boutonDoigt.hidden = false; this.majCouleursRepliees() }
    // Au téléphone (lot 5, K10), le bouton du doigt est dans « Autres outils » :
    // son menu y est rattaché (le focus y revient)
    this.menuDoigt.bouton = this.telephone ? this.boutonAutres : this.boutonDoigt
    if (m.hidden) this.construireMenuDoigt()
    basculerMenu(this.menuDoigt)
    if (m.hidden) return
    this.placerMenuDoigt()
    if (auClavier) m.querySelector<HTMLElement>('.menu-item[aria-checked="true"]')?.focus()
  }

  /** Le menu du doigt, à droite de la barre, à la hauteur de son bouton ; au
   *  téléphone, près de « Autres outils » */
  private placerMenuDoigt() {
    if (this.telephone) { this.placerPresDeLaBarre(this.menuDoigt.el, this.boutonAutres); return }
    this.menuDoigt.el.style.maxWidth = this.menuDoigt.el.style.maxHeight = ''
    const b = this.boutonDoigt.getBoundingClientRect(), o = this.barreOutils.getBoundingClientRect()
    placerMenu(this.menuDoigt.el, new DOMRect(o.left, b.top, o.width, b.height), 'droite')
    this.sousLaBarreDuHaut(this.menuDoigt.el)
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
    // Le menu fermé, ce qui est verrouillé ne reste pas sélectionné (lot 5 ;
    // maj l'a déjà fait, sauf si le menu vient de se fermer ici)
    app.oublierProteges()
    let formes: Forme[] | null = null
    if (!app.enLecture && plusieurs) formes = app.formesChoisies()
    else if (!app.enLecture && app.options) { const f = app.formeChoisie(); if (f && f.id === app.options) formes = [f] }
    if (!formes?.length) {
      this.panneau.hidden = true; this.clePanneau = ''; this.formesPanneau = []
      // Son menu ⋯ s'en va avec lui (son bouton n'est plus là)
      if (!this.menuPlus.el.hidden) fermerMenu()
      return
    }
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
    // Au-dessus de ce qu'il règle (toute la sélection), sinon en dessous,
    // sinon à côté : jamais dessus quand il a la place ailleurs (voir
    // positionPanneau). Sa rangée d'onglets tient sur une ligne : ce qui
    // sort de la page (une image, une autre page) est dans son menu ⋯.
    // Le cadre de taille et sa pastille ↻ comptent comme l'objet (lot 5 : voir
    // App.emprise) : le menu ne les couvre pas (sans la place, il ne couvre
    // ni la pastille, ni, s'il le peut, la figure elle-même)
    const base = plusieurs ? app.boiteDuContenu(formes) : app.rendu.boite(formes[0])
    const b = app.emprise(formes, base)
    if (!b) return
    const cam = app.cam, z = app.rendu.scene.getBoundingClientRect()
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const d = app.pastilleAEviter()
    const pa = d && cam.versEcran(d.x, d.y), pb = d && cam.versEcran(d.x + d.l, d.y + d.h)
    const fa = base && cam.versEcran(base.x, base.y), fb = base && cam.versEcran(base.x + base.l, base.y + base.h)
    // Au téléphone (lot 5, K10) : entre la barre du haut et celle du bas (en
    // portrait, sur toute la largeur) ou à droite de la barre des outils (en
    // paysage), jamais sur elles ; il défile s'il est plus haut que la place
    const telephone = this.telephone
    let bornes: { gauche: number; haut: number; bas?: number } | null = null
    if (telephone) {
      const f = this.bordsFlottants()
      bornes = { gauche: f.gauche ? f.gauche + 8 : 8, haut: Math.ceil(f.haut + 6), bas: f.bas }
      const hauteur = Math.max(120, Math.floor((f.bas ?? window.innerHeight) - bornes.haut - 8)) + 'px'
      if (this.panneau.style.maxHeight !== hauteur) this.panneau.style.maxHeight = hauteur
    } else if (this.panneau.style.maxHeight) this.panneau.style.maxHeight = ''
    const l = this.panneau.offsetWidth, h = this.panneau.offsetHeight
    // À droite de la barre d'outils ; sur un écran étroit où il n'y tient pas
    // (il passe alors à la ligne sur toute la largeur), il la couvre plutôt
    // que de sortir de l'écran, comme la barre d'actions (au téléphone, il
    // ne la couvre jamais : voir plus haut)
    const barre = this.barreOutils.getBoundingClientRect().right + 8
    const gauche = l <= window.innerWidth - barre - 8 ? barre : 8
    const p = positionPanneau({ left: z.left + a.x, top: z.top + a.y, right: z.left + c.x, bottom: z.top + c.y }, l, h,
      { l: window.innerWidth, h: window.innerHeight }, bornes ?? { gauche, haut: 76 }, undefined, undefined,
      pa && pb ? { left: z.left + pa.x, top: z.top + pa.y, right: z.left + pb.x, bottom: z.top + pb.y } : undefined,
      fa && fb ? { left: z.left + fa.x, top: z.top + fa.y, right: z.left + fb.x, bottom: z.top + fb.y } : undefined)
    this.panneau.style.left = p.left + 'px'
    this.panneau.style.top = p.top + 'px'
    // Son menu ⋯ ouvert le suit (le menu complet a pu bouger ou se refaire)
    const plus = this.menuPlus.bouton
    if (!this.menuPlus.el.hidden && plus && this.panneau.contains(plus)) placerMenu(this.menuPlus.el, plus.getBoundingClientRect(), 'dessous')
  }

  /** Le bouton ⋯ du menu complet, avant Supprimer : son petit menu a
   *  « Copier en image » (une image PNG pour l'ENT ou Pronote, à ne pas
   *  confondre avec « Copier pour Pronote » de Publier, qui copie un lien)
   *  et « Envoyer vers… » (une autre page), puis l'ordre (lot 5 : voir
   *  construireMenuPlus). Ils étaient dans la rangée ; ils
   *  la faisaient passer sur deux lignes (le menu d'un rectangle de 728 à
   *  820 px de large, de 54 à 96 px de haut), qui ne tenait plus au-dessus
   *  de la figure et venait la couvrir. ⋯ ne coûte que 42 px : la rangée
   *  reste sur une ligne comme avant le lot 3. */
  private boutonPlus(ligne: HTMLElement, titre = this.app.membrePris() ? TITRE_PLUS + ', sortir du groupe' : TITRE_PLUS) {
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

  /** Le petit menu ⋯ du menu complet, que partagent le menu d'un objet et
   *  le menu commun de plusieurs. Refait à chaque ouverture (la sélection a
   *  pu changer), en SECTIONS séparées d'un filet : chacune ajoute ses
   *  lignes sans toucher aux autres : ce qui sort de la page, l'ordre,
   *  « Protéger », « Groupe » pour un membre pris seul, et « Position »
   *  quand il y a de quoi redresser (lot 5). */
  private construireMenuPlus() {
    const m = this.menuPlus.el
    m.replaceChildren()
    // --- Ce qui sort de la page : une image, une autre page ---
    if (this.app.enSeancePassee) this.entreeMenu(m, 'Copier dans la séance d\'aujourd\'hui', () => this.app.copierVersAujourdhui(), { action: 'copier-aujourdhui',
      aide: 'Sur la page du jour où vous étiez, à la même place' })
    this.entreeMenu(m, 'Copier en image', () => this.copierEnImage('selection'), { aide: TITRE_IMAGE })
    this.entreeMenu(m, 'Envoyer vers…', () => this.ouvrirEnvoi(), { aide: TITRE_ENVOI })
    // Le menu court d'un verrouillé (lot 5) : rien d'autre, il ne change plus
    if (this.app.selectionProtegee()) return
    // --- L'ordre, dans le calque de l'objet (voir ordre.ts) ---
    filetMenu(m)
    this.sectionOrdre(m)
    // --- Protéger : verrouiller, fixer en fond (lot 5) ---
    filetMenu(m)
    this.sectionProteger(m)
    // --- Groupe : sortir un membre pris seul de son groupe (lot 5) ---
    const membre = this.app.membrePris()
    if (membre) {
      filetMenu(m)
      this.sectionGroupe(m, membre)
    }
    // --- Position : tourner d'un quart de tour, remettre droit (lot 5, retouches) ---
    if (this.app.tournable() || this.app.redressable() || this.app.rognable()) {
      filetMenu(m)
      this.sectionPosition(m)
    }
  }

  /** La section « Position » du menu ⋯, pour ce qui tourne à la pastille ↻
   *  (une image, une formule, un trait, une figure, un groupe, plusieurs
   *  objets libres) : « Tourner d'un quart de tour à gauche » (↺) et « … à
   *  droite » (↻), autour du centre de la pastille, chacun en une étape
   *  d'annulation (retouches après le lot 5 : à la tablette graphique, le
   *  bouton du stylet ouvre ce menu, et tourner à la pastille demande de
   *  viser) ; puis, pour une image ou une formule seule tournée (lot 5),
   *  « Remettre droit », qui annule sa rotation et garde sa taille et son
   *  centre (le chemin de retour quand l'aimant de la pastille n'a pas
   *  suffi, et le seul moyen de revenir exactement à 0) */
  private sectionPosition(m: HTMLElement) {
    const app = this.app
    titreMenu(m, 'Position')
    if (app.tournable()) {
      this.entreeMenu(m, 'Tourner d\'un quart de tour à gauche', () => app.tournerQuart('gauche'), { action: 'quart-gauche', aide: '↺ 90°, autour de son centre' })
      this.entreeMenu(m, 'Tourner d\'un quart de tour à droite', () => app.tournerQuart('droite'), { action: 'quart-droite', aide: '↻ 90°, autour de son centre' })
    }
    if (app.redressable()) this.entreeMenu(m, 'Remettre droit', () => app.redresserSelection(), { action: 'redresser', aide: 'Annule la rotation, garde la taille' })
    if (app.rognable()) this.entreeMenu(m, 'Rogner', () => app.commencerRognage(), { action: 'rogner', aide: 'Ne garder qu\'une partie de l\'image' })
  }

  /** La section « Protéger » du menu ⋯ (lot 5) : « Verrouiller » (Maj + L ;
   *  son aide dit comment le déverrouiller, dans les mots du pointeur), et
   *  « Fixer en fond » quand on n'a pris que des images (un énoncé
   *  importé ; une formule ou une figure ne passe pas sous l'encre : voir
   *  ordre.ts). */
  private sectionProteger(m: HTMLElement) {
    const app = this.app
    titreMenu(m, 'Protéger')
    this.entreeMenu(m, 'Verrouiller', () => app.verrouiller(true), { touche: 'Maj + L', action: 'verrouiller',
      aide: 'Il ne bouge plus et ne se prend plus ; ' + minuscule(messageVerrou(app.dernierPointeur)) })
    const pris = app.objetsChoisis().filter(f => app.selection.has(f.id))
    if (pris.length && pris.every(f => f.type === 'image')) {
      this.entreeMenu(m, 'Fixer en fond', e => app.fixerEnFond(pris.map(f => f.id), pointeurDuClic(e, app.dernierPointeur)), { action: 'fixer',
        aide: 'Sous tout le reste : on écrit et on entoure par-dessus ; le menu de la page la détache' })
    }
  }

  /** La section « Ordre » du menu ⋯ : les quatre commandes, grisées quand
   *  elles ne feraient rien, et leurs raccourcis (Ctrl + flèche, ⌘ sur Mac).
   *  Une image ne passe jamais devant l'écriture, une formule jamais
   *  derrière : l'aide de « Mettre au premier plan » (et de « Mettre à
   *  l'arrière-plan », quand on ne le devinerait pas) le dit, d'après le
   *  calque de ce qui est pris (aidesOrdre, dans ordre.ts). */
  private sectionOrdre(m: HTMLElement) {
    const app = this.app
    titreMenu(m, 'Ordre')
    const aides = aidesOrdre(app.objetsChoisis().filter(f => app.selection.has(f.id)))
    const entree = (texte: string, sens: Sens, touche: string, o: OptionsEntree = {}) =>
      this.entreeMenu(m, texte, () => app.ordonner(sens), { touche, inactif: !app.peutOrdonner(sens), action: 'ordre-' + sens, ...o })
    entree('Mettre au premier plan', 'premier', `${CTRL} + Maj + ↑`, { aide: aides.premier })
    entree('Avancer', 'avancer', `${CTRL} + ↑`)
    entree('Reculer', 'reculer', `${CTRL} + ↓`)
    entree('Mettre à l\'arrière-plan', 'arriere', `${CTRL} + Maj + ↓`, { aide: aides.arriere })
  }

  /** La section « Groupe » du menu ⋯ (lot 5), pour un membre pris seul (le
   *  second clic, le second toucher sur un membre du groupe pris) : « Sortir
   *  du groupe », comme Ctrl + Maj + G sur lui. La vérification
   *  « conformité » du lot 5 : ce n'était qu'au clavier, donc impossible au
   *  TNI, sur l'iPad et au téléphone. Les autres membres restent groupés ;
   *  s'il n'en reste qu'un, il n'est plus groupé non plus (App.degrouper). */
  private sectionGroupe(m: HTMLElement, membre: Forme) {
    const app = this.app
    titreMenu(m, 'Groupe')
    const autres = app.membres(membre).length - 1
    this.entreeMenu(m, 'Sortir du groupe', () => app.degrouper(), { touche: `${CTRL} + Maj + G`, action: 'sortir-du-groupe',
      aide: autres > 1 ? 'Les autres restent groupés' : 'L\'autre n\'est plus groupé non plus' })
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
    // Un objet verrouillé (lot 5) : son menu court
    if (!libre(f)) return this.construireMenuVerrouille([f])
    p.replaceChildren()
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const action = (texte: string, titre: string, faire: () => void, actif = false) => this.optionMenu(ligne, texte, titre, faire, actif)
    const ouvrir = (s: Section) => this.basculerSection(s)
    const figure = f.type === 'polygone' || f.type === 'cercle' ? f as Figure : null
    const segment = f.type === 'polygone' && !f.ferme && f.pts.length === 4
    // « Copier », puis ⋯ (« Copier en image », « Envoyer vers… » : voir
    // boutonPlus), avant Supprimer
    const copier = () => {
      action('Copier', `Copier (${CTRL}+C) : ${CTRL}+V la colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
      this.boutonPlus(ligne)
    }
    const jeter = () => ligne.appendChild(bouton('poubelle', 'Supprimer (Suppr)', () => app.supprimerSelection(), 'danger'))

    if (f.type === 'formule') {
      // Une formule : la modifier (comme son double-clic), sa couleur et sa
      // taille. Pas de « Transformer » : l'image d'une formule n'en déplace
      // que le coin, sans la tourner ni la retourner.
      p.setAttribute('aria-label', titreDuMenu(f))
      // Son titre parle la langue du pointeur qui a ouvert le menu : jamais
      // « double-clic » au doigt
      action('Modifier', titreModifierFormule(app.dernierPointeur, estTexte(f)), () => app.modifierFormule(f))
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
    // Une image : la rogner d'abord (une photo d'énoncé avec le bureau autour)
    if (f.type === 'image' && app.rognable()) action('Rogner', 'Ne garder qu\'une partie de l\'image', () => app.commencerRognage())
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
    // Tous verrouillés (lot 5) : leur menu court
    if (formes.every(f => !libre(f))) return this.construireMenuVerrouille(formes)
    p.replaceChildren()
    const n = formes.length
    // Une sélection qui est exactement un groupe (lot 5) : « Groupe · 3
    // objets », et Dégrouper ; une autre sélection de plusieurs : Grouper
    const groupe = !!app.groupePris()
    p.setAttribute('aria-label', groupe ? `Options du groupe de ${n} objets` : `Options des ${n} objets`)
    // Une rangée un peu plus serrée (voir style.css) : avec Grouper ou
    // Dégrouper, elle tient encore sur une ligne de 820 px au plus
    const ligne = document.createElement('div'); ligne.className = 'ligne commun'
    const titre = document.createElement('span'); titre.className = 'titre-selection'; titre.textContent = groupe ? `Groupe · ${n} objets` : `${n} objets`
    ligne.appendChild(titre)
    const commun = habillageCommun(formes, TAILLES.map(t => t.valeur))
    // Des formules seules n'ont pas d'épaisseur, des images rien à régler
    if (commun.couleurs || commun.epaisseurs) {
      const texte = commun.epaisseurs ? 'Couleur, épaisseur' : 'Couleur'
      this.optionMenu(ligne, texte, commun.epaisseurs ? 'La couleur, l\'épaisseur et les pointillés de tous' : 'La couleur de tous', () => this.basculerSection('couleur'), this.section === 'couleur')
    }
    if (groupe) this.optionMenu(ligne, 'Dégrouper', `Dégrouper (${CTRL} + Maj + G)`, () => app.degrouper()).dataset.action = 'degrouper'
    else this.optionMenu(ligne, 'Grouper', `Grouper (${CTRL} + G) : ils se prennent, se déplacent et se règlent ensemble`, () => app.grouper()).dataset.action = 'grouper'
    this.optionMenu(ligne, 'Dupliquer', `Une copie de tous, décalée d'un centimètre (${CTRL}+D)`, () => app.dupliquerSelection())
    this.optionMenu(ligne, 'Copier', `Copier (${CTRL}+C) : ${CTRL}+V les colle ici, sur une autre page ou dans un autre onglet`, () => app.copier())
    this.optionMenu(ligne, 'Couper', `Couper (${CTRL}+X) : ils partent, ${CTRL}+V les remet`, () => app.couper())
    this.boutonPlus(ligne)
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

  /** Le menu court d'un objet verrouillé, ou de plusieurs (lot 5) : le
   *  cadenas et « Verrouillé » en tête, puis seulement ce qui ne le change
   *  pas : « Déverrouiller » (Maj + L), « Copier » (la copie reste
   *  verrouillée), ⋯ (Copier en image, Envoyer vers…). Ni Supprimer, ni
   *  Dupliquer, ni Contour, ni Transformer : il ne bouge plus et ne change
   *  plus. Il s'ouvre au clic droit, au bouton du stylet, à l'appui long sur
   *  lui ; l'objet n'est sélectionné que le temps de ce menu. */
  private construireMenuVerrouille(formes: Forme[]) {
    const app = this.app, p = this.panneau
    p.replaceChildren()
    const n = formes.length
    p.setAttribute('aria-label', n === 1 ? `${titreDuMenu(formes[0])}, verrouillé` : `Options des ${n} objets, verrouillés`)
    const ligne = document.createElement('div'); ligne.className = 'ligne'
    const titre = document.createElement('span'); titre.className = 'titre-selection verrouille'
    titre.innerHTML = icone('cadenas')
    titre.append(n === 1 ? 'Verrouillé' : `Verrouillés · ${n} objets`)
    ligne.appendChild(titre)
    this.optionMenu(ligne, 'Déverrouiller', n === 1 ? 'Déverrouiller (Maj + L) : il se prend et se déplace de nouveau'
      : 'Déverrouiller (Maj + L) : ils se prennent et se déplacent de nouveau', () => app.verrouiller(false)).dataset.action = 'deverrouiller'
    this.optionMenu(ligne, 'Copier', `Copier (${CTRL}+C) : ${CTRL}+V ${n === 1 ? 'la colle' : 'les colle'} ici, sur une autre page ou dans un autre onglet, ${n === 1 ? 'verrouillée' : 'verrouillées'}`, () => app.copier())
    this.boutonPlus(ligne, TITRE_PLUS_VERROUILLE)
    p.appendChild(ligne)
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

  /** La revue ou la trieuse des pages prend tout l'écran : le programme de
   *  construction se ferme d'abord (son clavier, sur window en capture,
   *  passerait avant le leur : Espace ou → joueraient une étape sur la page
   *  cachée, et Échap fermerait les deux), avec le menu d'un morceau. Un
   *  instrument qu'il amenait finit pourtant son trajet à l'image d'après, et
   *  resterait seul sur le tableau : la fonction rendue le range quand le
   *  tableau revient (null : le programme n'était pas ouvert). */
  private fermerConstruction(): (() => void) | null {
    const construisait = this.constructeur.ouvert
    if (construisait) this.constructeur.fermer()
    if (this.catalogue.ouvert) this.catalogue.fermer()
    this.fermerMenuPartie()
    if (!construisait) return null
    return () => {
      const r = this.app.rendu
      if (this.constructeur.ouvert || !r.instrumentsAnimes.length) return
      r.instrumentsAnimes = []
      r.redessinerInstruments()
    }
  }

  /** La revue prend tout l'écran (voir fermerConstruction ; si elle n'a rien
   *  eu à montrer, l'instrument se range deux images plus tard) */
  private ouvrirRevue(b: HTMLElement) {
    const ranger = this.fermerConstruction()
    this.revue.ouvrir(b, ranger ?? undefined)
    if (ranger && !this.revue.ouvert) requestAnimationFrame(() => requestAnimationFrame(ranger))
    // La barre d'actions et le menu complet n'ont rien à faire pendant la revue
    this.maj()
  }

  /** La trieuse des pages (le compteur, Maj + P, « Toutes les pages… » du
   *  menu de la page). Pas pendant la revue, une
   *  fenêtre ouverte, ni en plein geste (un trait, un objet qu'on glisse).
   *  Avant, ce qui attend sur le tableau se pose (le point d'un simple
   *  toucher), un placement en attente (désigner un axe, un centre, poser
   *  une construction) s'annule, le programme de construction se ferme (voir
   *  fermerConstruction), les menus aussi, et le message à action du tableau
   *  s'en va : son « Annuler » changerait une page qu'on ne voit plus
   *  (Ctrl+Z, une fois la trieuse fermée, et la corbeille restent).
   *  auClavier : elle rend le focus au compteur en se fermant. */
  ouvrirTrieuse(auClavier = false) {
    const app = this.app
    if (this.trieuse.ouvert || tableauCache(app) || this.revue.ouvert || document.querySelector('dialog[open]') || app.enGeste) return
    app.poserCeQuiAttend()
    // Sans placement, Échap changerait d'outil
    if (app.placement) app.echap()
    const ranger = this.fermerConstruction()
    this.fermerMenus()
    this.oublierAction()
    this.trieuse.ouvrir({ retour: auClavier ? this.rang : null, auRetour: ranger })
    // La barre d'actions ne paraît pas sous la trieuse (elle compte comme une fenêtre)
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
   *  et seulement quand le message se voit. Plusieurs actions : un bouton
   *  chacune, dans l'ordre (« Aller à la page 5 », « Annuler ») ; la clé du
   *  message est la première qu'elles donnent. Un bouton fait son action et
   *  le message s'en va, sauf pour une action à garder : seul ce bouton
   *  part, les autres restent le temps qu'il reste. Il passe sous les menus
   *  et les panneaux (il ne cache pas ce qu'on va toucher), sauf pendant la
   *  revue, qui couvre tout, et pour le
   *  programme de construction (dessus), dont le panneau prend presque tout
   *  l'écran d'une tablette, et pendant un placement (la consigne de
   *  « Désigner » ou « Tracer » : le menu complet reste ouvert pendant
   *  qu'on clique sur la page).
   *  Un message ordinaire ne chasse pas un message à action encore à l'écran
   *  (« Stylet détecté … Changer », que suit souvent la figure reconnue du
   *  premier trait) : il s'écrit au-dessus de lui, et s'en va seul.
   *  Pendant la revue, un message à action ne se montre pas, et son bouton ne
   *  fait rien : un message ordinaire (F5, que la télécommande envoie) passe
   *  au-dessus de la revue, et « Annuler » d'une page qu'on vient de jeter
   *  écrirait alors dans le tableau, que la revue ne doit jamais changer. */
  message(texte: string, action?: ActionMessage | ActionMessage[], dessus = false) {
    // Pendant un placement (« Désigner », « Tracer » : la consigne dit où
    // cliquer), le message passe aussi au-dessus des panneaux : le menu
    // complet reste ouvert pendant qu'on clique, il ne doit pas la cacher
    this.toast.classList.toggle('dessus', dessus || this.app.enLecture || !!this.app.placement)
    const el = document.createElement('span')
    el.className = 'ligne'
    el.append(texte)
    const maintenant = performance.now()
    const actions = action === undefined ? [] : Array.isArray(action) ? action : [action]
    if (actions.length) {
      // 7 s, ou plus si une action le demande (ActionMessage.duree)
      const toast = { el, fin: maintenant + Math.max(DUREE_MESSAGE_ACTION, ...actions.map(a => a.duree ?? 0)), cle: actions.find(a => a.cle !== undefined)?.cle }
      for (const a of actions) {
        const b = document.createElement('button')
        b.type = 'button'; b.className = 'action'; b.textContent = a.libelle
        b.addEventListener('click', e => {
          if (this.app.enLecture) return
          if (a.garder && this.toastAction === toast) b.remove()
          else { this.toastSimple = this.toastAction = null; this.majToast() }
          a.faire(e)
        })
        el.appendChild(b)
      }
      this.toastAction = toast
      this.toastSimple = null
    } else {
      this.toastSimple = { el, fin: maintenant + Math.max(2600, texte.length * 60) }
    }
    this.majToast()
    this.placerToast()
  }

  /** Dans combien de temps (ms) ce que le message montre s'en va ; 0 : rien
   *  à l'écran. Ce qu'on veut dire sans couvrir le message en cours attend
   *  tant (le rappel d'enregistrer le classeur quitté, voir main.ts). */
  finDuMessage(): number {
    const maintenant = performance.now()
    return Math.max(0, ...[this.toastSimple, this.toastAction].filter(p => p !== null).map(p => p.fin - maintenant))
  }

  /** Le message à action de cette clé s'en va, s'il est encore là : son
   *  bouton n'a plus rien à faire (la page qu'il rendait est revenue). Sans
   *  clé, quel qu'il soit (la trieuse s'ouvre : son « Annuler » changerait
   *  une page qu'on ne voit plus). */
  oublierAction(cle?: string) {
    if (!this.toastAction || (cle !== undefined && this.toastAction.cle !== cle)) return
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
      // Ses boutons hors de l'écran (au téléphone, la fenêtre est plus haute :
      // les raccourcis y passent sur deux rangées, et y font 44 px), elle
      // remonte pour qu'ils y reviennent, et défile si l'écran est plus bas
      // qu'elle (la vérification « conformité » du lot 5 : à 320 × 568 et
      // couché, Annuler et Placer sortaient par le bas). Au poste de la
      // classe, ses boutons sont toujours dans l'écran : elle ne bouge pas.
      const bas = corps.querySelector('.actions')!.getBoundingClientRect().bottom
      if (bas > window.innerHeight - 4) {
        const place = window.innerHeight - 24
        if (d.offsetHeight > place) { d.style.maxHeight = place + 'px'; d.style.overflowY = 'auto'; d.style.overscrollBehavior = 'contain' }
        d.style.top = Math.max(12, window.innerHeight - 12 - d.offsetHeight) + 'px'
      }
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
    fermerSurLeFond(d, () => { if (d.open) d.close() })
    this.racine.appendChild(d)
    this.dialogue = d
    return d
  }
}
