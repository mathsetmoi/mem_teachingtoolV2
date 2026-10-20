// =============================================================
// LA BIBLIOTHÈQUE DES CLASSEURS (l'écran d'accueil)
// Tous les classeurs de ce navigateur, en cartes : « Récents » (les six
// derniers ouverts), puis « Tous les classeurs » (le plus récemment modifié
// d'abord). On y ouvre un autre classeur sans rien perdre, et on en crée un
// (« Nouveau classeur »). Le bouton du classeur, en haut à gauche du
// tableau (ou « Bibliothèque des classeurs… » du menu ⋯), l'ouvre
// par-dessus le classeur ; elle s'ouvre aussi seule, sans classeur, quand
// le démarrage le demande (?bibliotheque, l'adresse d'un classeur inconnu
// ici, une bibliothèque vide : voir main.ts). Au démarrage, c'est le
// dernier classeur qui revient : la bibliothèque n'est jamais imposée.
//
// Comme la trieuse des pages, elle couvre tout : body reçoit la classe
// en-bibliotheque, sous laquelle plus rien n'écrit sur la page cachée (voir
// navigateur.tableauCache), et le reste de l'écran devient inerte (sauf le
// message et les fenêtres).
//
// Chaque carte est un lien (?classeur=<id>) : le clic du milieu et Ctrl +
// clic ouvrent un autre onglet, comme partout ; le clic simple passe par
// ouvrirClasseur, qui attend que tout soit écrit avant de partir. Ouvrir
// un autre classeur recharge la page sur son adresse : un seul classeur est
// chargé à la fois, et Précédent ramène au classeur d'avant.
//
// Ranger (lot 4 C6) : des dossiers imbriqués et colorés (« Nouveau
// dossier », leurs cartes avant celles des classeurs, le fil d'Ariane
// « Bibliothèque › 5e B › Géométrie », Retour arrière qui remonte), les
// étiquettes de classe (propres, ou héritées du dossier de classe, voir
// arbre.ts) et leur filtre, renommer (F2, « Renommer… », un double-clic sur
// le nom), trier (par date, par nom), et le conseil du rangement par classe.
// Le dossier affiché et le filtre sont retenus pour l'onglet
// (sessionStorage), le tri pour l'appareil (localStorage).
//
// Déplacer (lot 4 C7) : « Déplacer vers… » (la fenêtre de vers.ts, l'arbre
// des dossiers de deplacer.ts), ou en glissant la carte d'un classeur ou
// d'un dossier, de la grille ou de Récents, sur la carte d'un dossier, un
// élément du fil d'Ariane ou « Bibliothèque » : à la souris dès 4 px, à la
// tablette graphique dès 6 px, sans appui long ; au doigt (et au stylet
// posé sur l'écran) par la poignée ⋮⋮ ou un appui long ; deux doigts font
// défiler. « Dupliquer le classeur » (une copie complète, faite par
// l'écrivain, hors du fil principal). Les aperçus : la première page de
// chaque classeur (voir apercu-classeur.ts), en adresse objet, révoquée à
// la fermeture.
//
// La corbeille (lot 4 C8) : « Supprimer » (le menu d'une carte, ou Suppr)
// met un classeur ou un dossier dans la corbeille de la bibliothèque, sans
// rien demander, avec « Annuler » ; le bouton « Corbeille (3) » du bandeau
// la montre à la place des cartes (vue-corbeille.ts) : « Remettre »,
// « Supprimer définitivement », « Vider la corbeille », après une question
// (effacer.ts efface vraiment la base). À la première ouverture, les bases
// de classeur sans fiche sont adoptées (adoption.ts) ; en bas du bandeau, la
// place que ce navigateur garde pour le site.
//
// Les fichiers (lot 4 C9, fichiers.ts) : « Ouvrir… » dans le bandeau
// (Ctrl + O : un ou plusieurs .memc, une bibliothèque .memb), des fichiers
// lâchés sur l'écran (un cadre pointillé « Lâchez pour ajouter à la
// bibliothèque »), « Enregistrer dans un fichier… » au menu d'un classeur,
// « Enregistrer toute la bibliothèque… » au menu ⋯ du bandeau.
//
// Ce que font les morceaux suivants (le Drive) s'ajoute par
// actionsDuBandeau, menuDuBandeau, blocsDuMenu et blocsDuMenuDossier.
// =============================================================
import type { ActionMessage } from '../app'
import type { Tableau } from '../document'
import type { UI } from '../ui'
import type { Menu } from '../menus'
import { ENTREES, allerAuxEntrees, avale, dernierGesteAuClavier, entreeMenu, fermerMenu, filetMenu, focusAuClavier, installerMenus, ouvrirMenu, placerMenu, rendreLeFocus, titreMenu } from '../menus'
import { CTRL, MAC, toucheMenu } from '../navigateur'
import { APPUI_LONG, SEUIL_GLISSER, ecranTactile, typePointeur } from '../pointeurs'
import type { TypePointeur } from '../pointeurs'
import { lignesDe, vitesseDefilement } from '../pages/glisser'
import { avalerLeSecondAppui } from '../pages/trieuse'
import { icone } from '../icones'
import { EXTENSION_TABLEAU, nomSur } from '../fichier'
import { ecrire, lire } from '../reglages'
import { cleDernierEnregistrement, lireDernierEnregistrement } from '../sauvegarde'
import type { Fond } from '../types'
import { FONDS, FOND_NEUF } from '../types'
import type { FicheClasseur, FicheDossier, InfosClasseur } from './demarrage'
import { LONGUEUR_NOM_CLASSEUR, LONGUEUR_NOM_DOSSIER, baseDe, idClasseur, parents, urlDuClasseur, visible } from './demarrage'
import { passerLaConnexion } from '../publication/drive'
import type { ChangementBibliotheque, Registre } from './registre'
import { ErreurRegistre } from './registre'
import { ErreurBase, creerBase, ecrireInfos } from './bases'
import type { Tri } from './arbre'
import {
  COULEURS, COULEUR_DEFAUT, ETIQUETTES_MAX, LONGUEUR_ETIQUETTE, TRIS, ajouterEtiquette, cheminLisible, cleDe, compter, couleurDe,
  dossierVisible, enfants, estDans, etiquetteDuNom, etiquetteHeritee, etiquettesDe, etiquettesEffectives, filAriane, libelleDossier,
  nomDeDossier, nomLibre, parentAffiche, porte, ressembleAUneClasse, texteLecteurDossier, trier,
} from './arbre'
import type { ObjetDeplace } from './deplacer'
import { DOSSIER_PARTI, REFUS_CYCLE, cibleSous, destinations, interdits, objetClasseur, objetDossier, ouIlEst, texteAllerA, texteDeplacement, texteRetour } from './deplacer'
import { ouvrirDeplacerVers } from './vers'
import { etatNeuf } from './neuf'
import type { Surveillance } from './surveillance'
import { ecritDansUnFichier } from './surveillance'
import type { CopieFaite } from './ecrivain'
import { ecrivain } from './ecrivain'
import type { ActionEtat } from './etat'
import { rappelAuDepart, resumeEtat, texteRappel } from './etat'
import type { CleALArrivee, PoigneeFichier } from './cle'
import { AIDE_ACTIVER, ID_CHOIX, TYPES_CLASSEUR, ecrireLeNeuf, examinerPourUnNeuf, raisonCle } from './cle'
import { libelleCarte, libelleSeances, lignesDesSeances, nombreDeClasseurs, nomDeClasseur, recents, texteLecteur, titreCle, titreDrive } from './liste'
import {
  BLOQUE, PAS_EFFACE, TITRE_VIDER, contenuDeLaCorbeille, contenuDuDossier, elementsDeLaCorbeille, jamaisEnregistre, libelleCorbeille, pagesDe,
  sauvegardesDe, texteCeQuiReste, texteDefinitifClasseur, texteDefinitifDossier, texteEfface, texteJamais, texteMisALaCorbeille, textePlace,
  texteRemis, texteRetrouves, texteVidee, texteViderBibliotheque, titreDefinitifClasseur, titreDefinitifDossier,
} from './corbeille'
import { effacerLesClasseurs } from './effacer'
import { adopterLesOrphelines } from './adoption'
import { enregistrerDepuisLaBase } from './enregistrer'
import { TEXTE_PUBLIEES_COPIE } from './reconnaitre'
import { VueCorbeilleBiblio } from './vue-corbeille'
import { VueSeancesBiblio } from './vue-seances'
import type { Fichiers } from './fichiers'
import { AIDE_ENREGISTRER_TOUT } from './fichiers'
import { fermerSurLeFond } from '../dialogue'
import { RechercheBiblio } from './recherche-biblio-vue'
import { lireContenu } from '../recherche'

/** « Ouvrir… » du bandeau : le même titre qu'avant le lot 7 (Ctrl + O
 *  choisit toujours des fichiers ; le bouton montre la fenêtre « Ouvrir ») */
const TITRE_OUVRIR = `Ouvrir un classeur ou une bibliothèque (${CTRL} + O)`
const AIDE_OUVRIR_FENETRE = 'Depuis l\'ordinateur ou le Drive : un classeur, une bibliothèque, ou tout un dossier de classe.'

/** Ce que la bibliothèque demande à qui l'ouvre */
export interface HoteBibliotheque {
  /** Le classeur ouvert dans cet onglet ; null : la bibliothèque seule (ou
   *  le classeur de l'onglet vient d'être effacé, voir classeurEfface) */
  classeur: InfosClasseur | null
  /** Un message en bas de l'écran (au-dessus de la bibliothèque) */
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  /** Avant de partir vers un autre classeur, tout ce qui attend s'écrit :
   *  le point d'un simple toucher, la piste des instruments, les écritures
   *  de la base, la fiche, et la clé si une écriture est due (jamais le
   *  Drive : les classeurs en retard s'en chargeront depuis le suivant) */
  avantDeQuitter(): Promise<void>
  tableau?: Tableau
  ui?: UI
  surveillance?: Surveillance | null
  /** La fiche du classeur de cet onglet vient de changer ici (renommé) : le
   *  bouton du classeur et le titre de l'onglet suivent (les autres onglets
   *  l'apprennent par le canal de la bibliothèque) */
  classeurChange?(f: FicheClasseur): void
  /** Avant de dupliquer le classeur de cet onglet : ce qui attend s'écrit
   *  (le point d'un simple toucher, la piste des instruments, les écritures
   *  de la base) ; faux si sa base a encore un trou (la copie, faite depuis
   *  la base, n'aurait pas tout) */
  avantDeDupliquer?(): Promise<boolean>
  /** L'aperçu du classeur de cet onglet se refait, s'il a changé (la
   *  bibliothèque s'ouvre) ; vrai s'il a été refait */
  rafraichirApercu?(): Promise<boolean>
  /** La fiche du classeur de cet onglet s'écrit tout de suite (sa date, son
   *  nombre de pages : le suivi ne l'écrit qu'au plus toutes les 30 s),
   *  avant que la bibliothèque qui s'ouvre montre sa carte */
  ecrireLaFiche?(): Promise<void>
  /** Le classeur de cet onglet est effacé d'ici (la corbeille vidée, lot 4
   *  C8) : plus rien ne s'écrit dans sa base (la sauvegarde prévient les
   *  autres onglets par ses canaux, le Tableau coupe son lien avec elle, la
   *  clé, le suivi et l'aperçu s'arrêtent) ; l'onglet passe sans classeur
   *  (classeur et surveillance null) : la bibliothèque ne se ferme plus */
  classeurEfface?(): void
  /** Le message à action de cette clé s'en va (son « Annuler » n'a plus
   *  d'objet : ce qu'il rendait vient d'être effacé) */
  oublierMessage?(cle: string): void
  /** Aller à la première page d'une séance du classeur de cet onglet (la
   *  ligne « séances » de sa carte) ; faux : cette séance n'existe plus */
  voirSeance?(id: string): boolean
  /** Va à une page du classeur de cet onglet, une formule prise (la
   *  recherche) ; faux : elle n'existe plus */
  voirPage?(page: string, forme: string | null): boolean
}

/** Ce qu'on dit au classeur où l'on arrive (sessionStorage, le temps du
 *  chargement) : JSON { id, message } */
export const CLE_ARRIVEE = 'mem-teachingtool-arrivee'
/** Le rappel d'enregistrer, avant de quitter un classeur : une fois par
 *  période de travail non enregistré (JSON { id, depuis }) */
const CLE_RAPPEL_DEPART = 'mem-teachingtool-rappel-depart'
/** Au-delà de ce temps, « Ouvrir sans attendre » ; au plus ce temps-là */
const PATIENCE = 5000
const DEPART_MAX = 10_000
/** La fiche du classeur de l'onglet s'écrit avant que la bibliothèque
 *  montre ses cartes : on ne l'attend pas plus que… */
const ECRIRE_LA_FICHE_MAX = 1000
/** Les dates des cartes (« aujourd'hui à 14 h 05 ») se refont toutes les… */
const RAFRAICHIR = 60_000
/** Le nom proposé pour un classeur neuf */
export const NOM_NOUVEAU = 'Nouveau classeur'
/** Les fonds proposés, dans cet ordre (les petits carreaux d'abord : le
 *  cahier de maths ; puis, depuis le lot 5, les quatre nouveaux, après les
 *  quatre d'avant, qui gardent leur place) ; leurs noms sont ceux des menus.
 *  La page blanche est cochée d'office, comme toute page neuve (FOND_NEUF ;
 *  avant, les petits carreaux) : l'ordre, lui, ne change pas. */
const FONDS_NEUF: { id: Fond; nom: string }[] = (['carreaux', 'blanc', 'seyes', 'repere', 'grands-carreaux', 'millimetre', 'pointe', 'iso'] as Fond[])
  .map(id => ({ id, nom: FONDS.find(f => f.id === id)!.nom }))
export const PLUS_DE_PLACE = 'Le classeur n\'a pas pu être créé : il n\'y a plus de place dans ce navigateur.'
/** Le dossier qu'on regarde, et le filtre de classe, retenus pour l'onglet
 *  (sessionStorage : un autre onglet a les siens) ; le tri, pour l'appareil */
export const CLE_DOSSIER = 'mem-teachingtool-dossier'
export const CLE_FILTRE = 'mem-teachingtool-filtre'
export const CLE_TRI = 'mem-teachingtool-tri'
/** Le réglage de la bibliothèque qui fait taire le conseil (« Plus tard ») */
const REGLAGE_CONSEIL = 'conseil'
export const CONSEIL = 'Rangez par classe : un dossier par classe (« 5e B »), puis un classeur par chapitre (« Symétrie centrale »). Les classeurs d\'un dossier de classe portent son étiquette : un geste les retrouve tous.'
export const VIDE_DOSSIER = 'Ce dossier est vide. Glissez-y un classeur, ou créez-en un.'
/** Dupliquer le classeur : ce qu'on dit quand il n'a pas pu l'être */
const PAS_DUPLIQUE = 'Le classeur n\'a pas pu être dupliqué'
export const PLUS_DE_PLACE_COPIE = `${PAS_DUPLIQUE} : il n'y a plus de place dans ce navigateur.`
/** « Copie du classeur… », au-delà de ce temps */
const PATIENCE_COPIE = 300
/** Le clic qui suit un glisser (la carte est un lien) ne fait rien pendant ce temps */
const APRES_GLISSER = 400
/** L'image de la carte qu'on tire, réduite : la carte du dossier sous le
 *  pointeur reste visible (dans la trieuse, la place d'arrivée est entre deux
 *  cartes ; ici, c'est la carte sous le pointeur) */
const FANTOME = 0.55
/** Un clic sur le nom attend ce temps qu'un second en fasse un double-clic (renommer), comme dans la trieuse */
const DOUBLE_CLIC_NOM = 400
/** Le bouton du message qui défait un changement (ui.message le garde 7 s) */
const ANNULER = 'Annuler'
/** « Effacement… », au-delà de ce temps */
const PATIENCE_EFFACEMENT = 600
/** La clé des messages de la corbeille (« Annuler »), suivie de celle de la carte */
const CLE_MESSAGE = 'corbeille:'

/** Les cartes d'une rangée sont rangées par clé : l'id d'un classeur, ou
 *  « d: » et l'id d'un dossier */
const DOSSIER = 'd:'
const CASE = '.case-classeur, .case-dossier'
const FOCUSABLE = '.carte-classeur, .carte-dossier'
/** La grande icône d'un dossier, dans sa couleur (--c) : le dos, plus pâle, et la face */
const SVG_DOSSIER = '<svg viewBox="0 0 48 38" aria-hidden="true"><path class="dos" d="M2 6a4 4 0 014-4h11.5l4.5 5h20a4 4 0 014 4v3H2z"/><path class="face" d="M2 12h44v20a4 4 0 01-4 4H6a4 4 0 01-4-4z"/></svg>'

/** Une rangée de cartes (« Récents », la grille du dossier affiché) : un
 *  seul arrêt de Tab (la carte de focusId), les flèches à l'intérieur */
interface Liste { el: HTMLElement; cartes: Map<string, HTMLElement>; ordre: string[]; focusId: string | null }

/** Le pointeur posé sur une carte, jusqu'à son clic ou son glisser */
interface Appui {
  id: number
  /** La clé de la carte, sa case, sa rangée */
  carte: string; li: HTMLElement; liste: Liste
  type: TypePointeur
  /** Le doigt, ou un stylet posé sur l'écran lui-même : la grille défile
   *  sous lui ; il ne tire la carte que par sa poignée ⋮⋮, ou après un appui
   *  long */
  direct: boolean
  x0: number; y0: number; t0: number
  /** Il a bougé (un glisser, un défilement) : son clic ne fait rien */
  bouge: boolean
  /** L'appui qui vient de fermer un menu : il ne fait rien d'autre */
  avale: boolean
  /** Il tire la carte dès qu'il passe son seuil (la souris, la tablette
   *  graphique, la poignée, l'appui long) */
  arme: boolean
  minuterie: number
}

/** Une carte qu'on tire (classeur ou dossier) */
interface Glisse {
  id: number
  cle: string
  li: HTMLElement
  fantome: HTMLElement
  objet: ObjetDeplace
  /** Là où il ne peut pas aller (là où il est ; un dossier, ni dans lui-même
   *  ni dans un descendant) */
  refus: Set<string | null>
  /** Les cibles : les cartes des dossiers de la grille, les éléments du fil
   *  d'Ariane (la racine : null) */
  cibles: { id: string | null; el: HTMLElement }[]
  sous: { id: string | null; el: HTMLElement } | null
  /** Où le pointeur tient la carte (depuis son coin), son dernier point */
  dx: number; dy: number; x: number; y: number
  /** Ce qui reste d'un pas de défilement de moins d'un pixel */
  reste: number
}

/** L'aperçu d'un classeur, en adresse objet (révoquée à la fermeture) */
interface Image { blob: Blob; url: string }

/** Le champ du nom, dans une carte qu'on renomme */
interface Saisie { cle: string; liste: Liste; li: HTMLElement; input: HTMLInputElement; ancien: string; dossier: boolean }

const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))
const nomErreur = (e: unknown) => (e as { name?: string } | null)?.name
const messageDe = (e: unknown) => (e as Error | null)?.message?.replace(/\.$/, '') || 'erreur inconnue'

function lireSession(cle: string): string | null {
  try { return sessionStorage.getItem(cle) } catch { return null }
}
function ecrireSession(cle: string, v: string | null) {
  try { if (v === null) sessionStorage.removeItem(cle); else sessionStorage.setItem(cle, v) } catch { /* l'onglet l'oubliera */ }
}

export class Bibliotheque {
  readonly el: HTMLElement
  /** Les boutons du bandeau, après « Nouveau classeur » (C6 y met
   *  « Nouveau dossier » ; C7 à C10 y ajoutent les leurs) */
  readonly actionsDuBandeau: HTMLElement
  /** Les entrées du menu ⋯ du bandeau (C9 : ouvrir un fichier, enregistrer
   *  toute la bibliothèque) : chacune les ajoute au menu m ; sans entrée, le
   *  bouton ⋯ ne paraît pas */
  readonly menuDuBandeau: ((m: HTMLElement) => void)[] = []
  /** Les blocs du menu d'une carte, après « Ouvrir » (C6 : renommer, les
   *  étiquettes de classe ; C7 à C10 : déplacer, dupliquer, supprimer…),
   *  séparés par un filet */
  readonly blocsDuMenu: ((f: FicheClasseur, m: HTMLElement) => void)[] = []
  /** Les blocs du menu d'un dossier, après sa couleur et « Dossier d'une
   *  classe » (C7 : déplacer ; C8 : supprimer) */
  readonly blocsDuMenuDossier: ((d: FicheDossier, m: HTMLElement) => void)[] = []
  /** Le dossier qu'on regarde (null : la racine), retenu pour l'onglet */
  dossierAffiche: string | null = null
  /** Le filtre de classe (une étiquette ; null : toutes), retenu pour l'onglet */
  filtre: string | null = null
  /** Le tri des classeurs, retenu sur l'appareil */
  tri: Tri = 'modifie'
  /** Ouvrir et enregistrer des fichiers (lot 4 C9) : posé par brancherFichiers */
  fichiers: Fichiers | null = null
  /** La fenêtre « Ouvrir » (lot 7 : l'ordinateur ou le Drive, un dossier) :
   *  « Ouvrir… » du bandeau la montre ; sans elle, le choix des fichiers */
  ouvrirFenetre: (() => void) | null = null
  /** En haut des cartes : « Mes emplacements » (lot 7) */
  readonly hautDuCorps: HTMLElement
  /** Après chaque rendu des cartes (lot 7 : « Mes emplacements » suit le
   *  dossier qu'on regarde) */
  readonly apresRendu: (() => void)[] = []
  /** « Ouvrir… », dans le bandeau (caché tant que les fichiers ne sont pas branchés) */
  private boutonOuvrir: HTMLButtonElement
  /** Le cadre pointillé des fichiers qu'on lâche, et combien d'entrées le survolent */
  private depot: HTMLElement
  private survols = 0
  private fiches = new Map<string, FicheClasseur>()
  private recherche: RechercheBiblio
  private dossiers = new Map<string, FicheDossier>()
  /** Les fiches ont été lues au moins une fois */
  private lu = false
  /** Le conseil du rangement par classe a été écarté (« Plus tard ») ;
   *  null : pas encore lu */
  private conseilVu: boolean | null = null
  private compte: HTMLElement
  private boutonBandeau: HTMLButtonElement
  /** « Corbeille (3) » (lot 4 C8), et la vue qu'il montre */
  private boutonCorbeille: HTMLButtonElement
  private vue: VueCorbeilleBiblio
  /** « Séances » (idée B du lot 8) : toutes les séances par date, à la place des cartes */
  private boutonSeances: HTMLButtonElement
  private vueSeances: VueSeancesBiblio
  /** « Ce navigateur garde 120 Mo pour ce site. » */
  private placeEl: HTMLElement
  /** Les bases sans fiche ont été cherchées (une fois par chargement) */
  private adoptionFaite = false
  /** Un effacement définitif en cours : un seul à la fois */
  private effacementEnCours = false
  private menuBandeau: HTMLElement
  private fermerBouton: HTMLButtonElement
  private ligneOuvert: HTMLElement
  private corps: HTMLElement
  private conseil: HTMLElement
  private sectionRecents: HTMLElement
  private filtreEl: HTMLElement
  private sectionTous: HTMLElement
  private filEl: HTMLElement
  private triBouton: HTMLButtonElement
  private videDossier: HTMLElement
  private vide: HTMLElement
  private recents: Liste
  private tous: Liste
  private listes: Liste[]
  private menuEl: HTMLElement
  private menuTriEl: HTMLElement
  private menuCarte: { id: string; menu: Menu } | null = null
  private menuBandeauOuvert: Menu | null = null
  private menuTriOuvert: Menu | null = null
  private saisie: Saisie | null = null
  /** Un premier clic sur un nom attend son second (renommer) */
  private clicNom: { cle: string; minuterie: number } | null = null
  /** La grille montre les classeurs d'une étiquette, avec leur chemin */
  private plat = false
  private inertes: HTMLElement[] = []
  private retour: HTMLElement | null = null
  /** Ouverte au clavier (Entrée ou Espace sur le bouton du classeur) : le
   *  focus rendu à la fermeture ne compte comme venu du clavier que si elle
   *  se ferme aussi au clavier (voir fermer) */
  private ouverteAuClavier = false
  private auRetour: (() => void) | null = null
  private appui: Appui | null = null
  /** Le dernier appui levé : son clic (qui suit le lever) le relit */
  private appuiLeve: Appui | null = null
  /** La carte qu'on tire (lot 4 C7) */
  private glisse: Glisse | null = null
  private boucle = 0
  /** Le pointeur d'un glisser arrêté (Échap) : son lever ne fait rien */
  private pointeurFini: number | null = null
  /** Le clic qui suit un glisser, ou deux doigts, ne fait rien jusque-là (performance.now) */
  private avalerClicJusqua = 0
  /** Deux doigts (ou plus) posés : la grille défile sous eux (y : leur hauteur moyenne) */
  private deuxDoigts: { y: number } | null = null
  /** Les aperçus des classeurs, par id (révoqués à la fermeture) */
  private images = new Map<string, Image>()
  /** Une copie (Dupliquer) en cours : une seule à la fois */
  private copieEnCours = false
  /** On part vers un autre classeur (une seule fois) */
  private depart = false
  /** Les classeurs dont la ligne « séances » est dépliée */
  private seancesOuvertes = new Set<string>()
  /** Les changements venus d'ailleurs, à faire quand plus rien n'est ouvert */
  private aAppliquer = { classeurs: new Set<string>(), dossiers: false }
  /** Tout est à refaire quand le champ du nom se fermera */
  private aRefaire = false
  private file: Promise<void> = Promise.resolve()
  /** Les écritures de l'index faites d'ici (un nom, une couleur, des
   *  étiquettes) : on les attend avant de partir vers un autre classeur */
  private ecritures: Promise<unknown> = Promise.resolve()
  private minuterie = 0
  private cleLigne = ''
  private cleFiltre = ''
  private cleFil = ''

  constructor(private hote: HoteBibliotheque, private registre: Registre, private racine: HTMLElement = document.getElementById('app') ?? document.body) {
    // Les menus d'abord : leur Échap passe avant celui de la bibliothèque
    installerMenus()
    // Ce que cet onglet regardait (un rechargement le garde), et le tri de l'appareil
    this.dossierAffiche = lireSession(CLE_DOSSIER)
    this.filtre = lireSession(CLE_FILTRE)
    this.tri = lire<Tri>(CLE_TRI, ['modifie', 'nom'], 'modifie')
    const el = this.el = document.createElement('section')
    el.className = 'bibliotheque'
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Bibliothèque des classeurs')
    el.hidden = true
    // ----- Le bandeau -----
    const tete = Object.assign(document.createElement('div'), { className: 'biblio-tete' })
    const titre = Object.assign(document.createElement('h2'), { textContent: 'Bibliothèque' })
    this.compte = Object.assign(document.createElement('span'), { className: 'biblio-compte' })
    const actions = Object.assign(document.createElement('div'), { className: 'biblio-actions' })
    const nouveau = this.bouton('Nouveau classeur', 'plus', () => this.nouveauClasseur(), 'Créer un classeur et l\'ouvrir')
    nouveau.classList.add('biblio-nouveau')
    nouveau.dataset.action = 'nouveau-classeur'
    this.actionsDuBandeau = Object.assign(document.createElement('div'), { className: 'biblio-autres' })
    const nouveauDossier = this.bouton('Nouveau dossier', 'dossier-plus', () => this.nouveauDossier(), 'Créer un dossier ici (« 5e B », « Géométrie »)')
    nouveauDossier.dataset.action = 'nouveau-dossier'
    // Au téléphone, « Dossier » tient à côté de « Nouveau classeur » (le nom accessible reste entier)
    nouveauDossier.querySelector('.libelle')!.replaceChildren(
      Object.assign(document.createElement('span'), { className: 'libelle-long', textContent: 'Nouveau dossier' }),
      Object.assign(document.createElement('span'), { className: 'libelle-court', textContent: 'Dossier' }))
    this.actionsDuBandeau.appendChild(nouveauDossier)
    // Ouvrir un classeur ou une bibliothèque (lot 4 C9)
    this.boutonOuvrir = this.bouton('Ouvrir…', 'ouvrir', () => { this.finirSaisie(true); this.choisirOuvrir() }, TITRE_OUVRIR)
    this.boutonOuvrir.dataset.action = 'ouvrir-fichier'
    this.boutonOuvrir.hidden = true
    this.actionsDuBandeau.appendChild(this.boutonOuvrir)
    // La corbeille de la bibliothèque (lot 4 C8) : grisée quand elle est vide ;
    // à côté du × (au téléphone, sur la ligne du titre : l'icône et le
    // nombre, le nom accessible reste entier)
    this.boutonCorbeille = this.bouton('Corbeille', 'poubelle', () => this.basculerCorbeille(), 'Les classeurs et les dossiers supprimés')
    this.boutonCorbeille.classList.add('biblio-bouton-corbeille')
    this.boutonCorbeille.dataset.action = 'corbeille'
    this.boutonCorbeille.setAttribute('aria-pressed', 'false')
    this.boutonCorbeille.querySelector('.libelle')!.replaceChildren(
      Object.assign(document.createElement('span'), { className: 'libelle-long' }),
      Object.assign(document.createElement('span'), { className: 'libelle-court' }))
    this.boutonSeances = this.bouton('Séances', 'automatismes', () => this.basculerVueSeances(), 'Toutes les séances, la plus récente d\'abord')
    this.boutonSeances.classList.add('biblio-bouton-seances')
    this.boutonSeances.setAttribute('aria-label', 'Séances')
    this.boutonSeances.dataset.action = 'seances'
    this.boutonSeances.setAttribute('aria-pressed', 'false')
    this.boutonBandeau = this.bouton('Plus', 'points', () => this.basculerMenuBandeau(), 'Plus d\'actions sur la bibliothèque', true)
    this.boutonBandeau.setAttribute('aria-haspopup', 'menu'); this.boutonBandeau.setAttribute('aria-expanded', 'false')
    this.boutonBandeau.classList.add('biblio-plus')
    this.boutonBandeau.dataset.action = 'menu-bibliotheque'
    this.boutonBandeau.hidden = true
    // (lot 4 C9) Le ⋯ passe à côté de la corbeille : au téléphone, sur la
    // ligne du titre, où il tient (la rangée des actions garde « Nouveau
    // classeur » et « Dossier » sur une ligne)
    actions.append(nouveau, this.actionsDuBandeau)
    const fermer = this.fermerBouton = document.createElement('button')
    fermer.type = 'button'; fermer.className = 'bouton biblio-fermer'; fermer.innerHTML = icone('fermer')
    fermer.title = 'Fermer la bibliothèque (Échap)'; fermer.setAttribute('aria-label', 'Fermer la bibliothèque')
    fermer.addEventListener('click', () => this.fermer())
    // La place que ce navigateur garde pour le site, en bas du bandeau
    this.placeEl = Object.assign(document.createElement('p'), { className: 'biblio-place', hidden: true })
    // Le titre et le nombre de classeurs (au téléphone, l'un sous l'autre : la
    // corbeille et le × tiennent sur la même ligne)
    const titreBloc = Object.assign(document.createElement('div'), { className: 'biblio-titre' })
    titreBloc.append(titre, this.compte)
    // La recherche (recherche-biblio-vue.ts) : son champ après le titre, ses
    // résultats à la place des cartes
    this.recherche = new RechercheBiblio({
      fiches: () => this.visibles(),
      dossiers: () => this.dossiers,
      contenuOuvert: () => this.hote.classeur && this.hote.tableau ? { id: this.hote.classeur.id, contenu: lireContenu(this.hote.tableau.doc, this.hote.tableau.seancesDuClasseur()) } : null,
      ouvrir: (f, o) => void this.ouvrirClasseur(f, o),
      allerAuDossier: id => { this.changerFiltre(null); this.changerDossier(id); this.rendre(null) },
      enRecherche: oui => this.el.classList.toggle('en-recherche', oui),
    })
    tete.append(titreBloc, this.recherche.champ, actions, this.boutonSeances, this.boutonCorbeille, this.boutonBandeau, fermer, this.placeEl)
    // ----- La ligne du classeur ouvert -----
    this.ligneOuvert = Object.assign(document.createElement('div'), { className: 'biblio-ouvert', hidden: true })
    // ----- Les cartes -----
    this.corps = Object.assign(document.createElement('div'), { className: 'biblio-corps' })
    // Le conseil du rangement par classe : à la racine, tant qu'il n'y a
    // aucun dossier et qu'on ne l'a pas écarté
    this.conseil = document.createElement('aside')
    this.conseil.className = 'biblio-conseil'; this.conseil.hidden = true
    this.conseil.setAttribute('aria-label', 'Conseil de rangement')
    const conseilIcone = Object.assign(document.createElement('span'), { className: 'conseil-icone', innerHTML: SVG_DOSSIER })
    conseilIcone.style.setProperty('--c', COULEUR_DEFAUT)
    const conseilTexte = Object.assign(document.createElement('p'), { textContent: CONSEIL })
    const conseilActions = Object.assign(document.createElement('div'), { className: 'conseil-actions' })
    const creerClasse = Object.assign(document.createElement('button'), { type: 'button', className: 'principal', textContent: 'Créer un dossier de classe' })
    creerClasse.dataset.action = 'conseil-creer'
    creerClasse.addEventListener('click', () => this.nouveauDossier({ classe: true }))
    const plusTard = Object.assign(document.createElement('button'), { type: 'button', className: 'secondaire', textContent: 'Plus tard' })
    plusTard.dataset.action = 'conseil-plus-tard'
    plusTard.addEventListener('click', () => this.ecarterConseil())
    conseilActions.append(creerClasse, plusTard)
    const conseilCorps = Object.assign(document.createElement('div'), { className: 'conseil-corps' })
    conseilCorps.append(conseilTexte, conseilActions)
    this.conseil.append(conseilIcone, conseilCorps)
    // Récents
    const s = Object.assign(document.createElement('section'), { className: 'biblio-section recents' })
    const h = Object.assign(document.createElement('h3'), { id: 'biblio-titre-recents', textContent: 'Récents' })
    const ul = Object.assign(document.createElement('ul'), { className: 'grille-classeurs recents' })
    ul.setAttribute('aria-labelledby', h.id)
    s.append(h, ul)
    this.sectionRecents = s
    this.recents = { el: ul, cartes: new Map(), ordre: [], focusId: null }
    // La rangée du filtre de classe (s'il y a au moins une étiquette)
    this.filtreEl = Object.assign(document.createElement('div'), { className: 'biblio-filtre', hidden: true })
    this.filtreEl.setAttribute('role', 'group'); this.filtreEl.setAttribute('aria-label', 'Filtrer par classe')
    // La grille du dossier affiché : son fil d'Ariane et le tri, les dossiers
    // puis les classeurs
    this.sectionTous = Object.assign(document.createElement('section'), { className: 'biblio-section tous' })
    const entete = Object.assign(document.createElement('div'), { className: 'biblio-entete-grille' })
    const nav = document.createElement('nav')
    nav.className = 'biblio-fil'; nav.setAttribute('aria-label', 'Emplacement dans la bibliothèque')
    this.filEl = document.createElement('ol')
    nav.appendChild(this.filEl)
    this.triBouton = document.createElement('button')
    this.triBouton.type = 'button'; this.triBouton.className = 'biblio-tri'
    this.triBouton.setAttribute('aria-haspopup', 'menu'); this.triBouton.setAttribute('aria-expanded', 'false')
    this.triBouton.innerHTML = icone('trier')
    this.triBouton.append(Object.assign(document.createElement('span'), { className: 'libelle' }))
    this.triBouton.addEventListener('click', () => this.basculerMenuTri())
    entete.append(nav, this.triBouton)
    const grille = Object.assign(document.createElement('ul'), { className: 'grille-classeurs tous' })
    this.tous = { el: grille, cartes: new Map(), ordre: [], focusId: null }
    this.videDossier = Object.assign(document.createElement('div'), { className: 'biblio-vide-dossier', hidden: true })
    this.videDossier.append(Object.assign(document.createElement('p'), { textContent: VIDE_DOSSIER }),
      this.bouton('Nouveau classeur', 'plus', () => this.nouveauClasseur(), 'Créer un classeur dans ce dossier et l\'ouvrir'))
    this.sectionTous.append(entete, grille, this.videDossier)
    this.listes = [this.recents, this.tous]
    this.vide = Object.assign(document.createElement('div'), { className: 'biblio-vide', hidden: true })
    this.vide.append(Object.assign(document.createElement('p'), { textContent: 'Aucun classeur dans cette bibliothèque : créez-en un.' }),
      this.bouton('Nouveau classeur', 'plus', () => this.nouveauClasseur(), 'Créer un classeur et l\'ouvrir'))
    this.hautDuCorps = Object.assign(document.createElement('div'), { className: 'biblio-haut' })
    this.corps.append(this.hautDuCorps, this.recherche.resultats, this.conseil, this.sectionRecents, this.filtreEl, this.sectionTous, this.vide)
    // ----- Les menus (des enfants de la bibliothèque : le reste est inerte) -----
    this.menuEl = document.createElement('div')
    this.menuEl.className = 'menu-flottant menu-classeur'; this.menuEl.setAttribute('role', 'menu'); this.menuEl.hidden = true
    this.menuBandeau = document.createElement('div')
    this.menuBandeau.className = 'menu-flottant menu-bandeau-biblio'; this.menuBandeau.setAttribute('role', 'menu'); this.menuBandeau.hidden = true
    this.menuTriEl = document.createElement('div')
    this.menuTriEl.className = 'menu-flottant menu-tri'; this.menuTriEl.setAttribute('role', 'menu'); this.menuTriEl.setAttribute('aria-label', 'Trier les classeurs'); this.menuTriEl.hidden = true
    // La vue de la corbeille, à la place des cartes quand on la montre
    this.vue = new VueCorbeilleBiblio({
      fiches: () => [...this.fiches.values()],
      dossiers: () => this.dossiers,
      image: id => this.images.get(id)?.url ?? null,
      remettre: cle => void this.remettre(cle),
      supprimerDefinitivement: cle => void this.supprimerDefinitivement(cle),
      vider: () => void this.viderLaCorbeille(),
      revenir: () => this.quitterCorbeille(),
    })
    this.vueSeances = new VueSeancesBiblio({
      fiches: () => this.visibles(),
      classeurOuvert: () => { const id = this.hote.classeur?.id; return id ? this.fiches.get(id) ?? null : null },
      chemin: f => cheminLisible(f.dossier, this.dossiers),
      voir: (classeur, seance) => {
        const f = this.fiches.get(classeur)
        if (!f) return
        this.quitterVueSeances(false)
        void this.ouvrirClasseur(f, { seance })
      },
      revenir: () => this.quitterVueSeances(),
    })
    // Le cadre des fichiers qu'on lâche sur l'écran (lot 4 C9)
    this.depot = Object.assign(document.createElement('div'), { className: 'biblio-depot', hidden: true })
    this.depot.append(Object.assign(document.createElement('p'), { textContent: 'Lâchez pour ajouter à la bibliothèque' }))
    this.depot.setAttribute('aria-hidden', 'true')
    el.append(tete, this.ligneOuvert, this.vue.el, this.vueSeances.el, this.corps, this.menuEl, this.menuBandeau, this.menuTriEl, this.depot)
    this.racine.appendChild(el)
    this.brancherPointeurs()
    // Ni le menu du navigateur sur un lien (« Ouvrir dans un nouvel onglet »
    // est au clic du milieu), ni celui de l'appui long sur Android ; sauf
    // dans un champ (y coller un nom)
    el.addEventListener('contextmenu', e => { if (!(e.target as Element).closest?.('input, textarea')) e.preventDefault() })
    el.addEventListener('dragstart', e => e.preventDefault())
    // Le clic qui suit un glisser (ou deux doigts) ne fait rien : ni ouvrir
    // la carte (un lien), ni entrer dans le dossier ou remonter le fil
    // d'Ariane sur lequel on vient de la lâcher
    el.addEventListener('click', e => {
      if (!this.avalerClicJusqua || performance.now() > this.avalerClicJusqua) return
      this.avalerClicJusqua = 0
      e.preventDefault(); e.stopPropagation()
    }, true)
    // Le menu d'un classeur : renommer, ses étiquettes de classe ; le
    // déplacer, le dupliquer
    this.blocsDuMenu.push((f, m) => {
      entreeMenu(m, 'Renommer…', () => this.renommer(f.id), { touche: 'F2', action: 'renommer' })
      entreeMenu(m, 'Étiquettes de classe…', () => this.etiquettesDuClasseur(f.id), { action: 'etiquettes' })
    })
    this.blocsDuMenu.push((f, m) => {
      entreeMenu(m, 'Déplacer vers…', () => this.deplacer(f.id), { action: 'deplacer' })
      entreeMenu(m, 'Dupliquer le classeur', () => void this.dupliquer(f.id), { action: 'dupliquer',
        aide: 'Une copie complète, avec toute son histoire' })
      // (lot 4 C9) Le fichier .memc de ce classeur, fabriqué depuis sa base
      entreeMenu(m, 'Enregistrer dans un fichier…', () => void this.enregistrerUnClasseur(f.id), { action: 'enregistrer-classeur',
        aide: 'Un fichier .memc, avec toutes ses pages et tout son historique' })
    })
    // Le menu d'un dossier : le déplacer
    this.blocsDuMenuDossier.push((d, m) => {
      entreeMenu(m, 'Déplacer vers…', () => this.deplacer(DOSSIER + d.id), { action: 'deplacer-dossier' })
    })
    // Supprimer : dans la corbeille de la bibliothèque (lot 4 C8)
    const suppr = MAC ? '⌘ ⌫' : 'Suppr'
    this.blocsDuMenu.push((f, m) => {
      entreeMenu(m, 'Supprimer', () => void this.supprimer(f.id), { touche: suppr, action: 'supprimer', aide: 'Dans la corbeille de la bibliothèque' })
    })
    this.blocsDuMenuDossier.push((d, m) => {
      entreeMenu(m, 'Supprimer', () => void this.supprimer(DOSSIER + d.id), { touche: suppr, action: 'supprimer-dossier', aide: 'Avec ses classeurs, dans la corbeille' })
    })
    // Des fichiers lâchés sur l'écran (lot 4 C9)
    this.brancherDepot()
    // Ce que changent les autres onglets : seulement les cartes de ces ids
    registre.onChange(c => this.surChangement(c))
    // L'état de la sauvegarde du classeur ouvert : sa ligne
    hote.surveillance?.quandChange(() => { if (this.ouvert) this.majLigneOuvert() })
  }

  get ouvert() { return !this.el.hidden }
  /** On part vers un autre classeur (la page va se recharger) */
  get enPartance() { return this.depart }

  /** Les fichiers (lot 4 C9) : « Ouvrir… » dans le bandeau, Ctrl + O, les
   *  fichiers lâchés ; « Enregistrer toute la bibliothèque… » au menu ⋯ */
  brancherFichiers(f: Fichiers) {
    this.fichiers = f
    // Sur un écran étroit (600 px, le téléphone), « Ouvrir… » ne tient pas à
    // côté de « Nouveau classeur » et « Nouveau dossier » : il passe dans le
    // menu ⋯, en tête
    const etroit = typeof matchMedia === 'function' ? matchMedia('(max-width: 600px)') : null
    const regler = () => { this.boutonOuvrir.hidden = !!etroit?.matches }
    regler()
    etroit?.addEventListener?.('change', regler)
    this.menuDuBandeau.push(m => {
      if (this.boutonOuvrir.hidden) {
        entreeMenu(m, 'Ouvrir un classeur ou une bibliothèque…', () => { this.finirSaisie(true); this.choisirOuvrir() }, { action: 'ouvrir-fichier', aide: AIDE_OUVRIR_FENETRE })
      }
      entreeMenu(m, 'Enregistrer toute la bibliothèque…', () => void f.enregistrerLaBibliotheque(), { action: 'enregistrer-bibliotheque', aide: AIDE_ENREGISTRER_TOUT })
    })
    if (this.ouvert) this.boutonBandeau.hidden = false
  }

  /** « Ouvrir… » : la fenêtre du lot 7, sinon le choix des fichiers */
  private choisirOuvrir() {
    if (this.ouvrirFenetre) this.ouvrirFenetre()
    else this.fichiers?.choisir()
  }

  /** Le dossier où va un classeur ajouté depuis un fichier : celui qu'on
   *  regarde (s'il existe encore, et sans filtre de classe ni la corbeille) ;
   *  la racine sinon, et depuis le tableau */
  dossierPourAjouter(): string | null {
    const d = this.dossierAffiche
    if (!this.ouvert || this.vue.ouverte || this.filtre !== null || d === null) return null
    const x = this.dossiers.get(d)
    return x && dossierVisible(x, this.dossiers) ? d : null
  }

  /** « Enregistrer dans un fichier… » (le menu d'un classeur) : celui de
   *  l'onglet par sa sauvegarde (ce qui attend s'écrit d'abord), un autre
   *  depuis sa base, par l'écrivain */
  async enregistrerUnClasseur(id: string): Promise<boolean> {
    const f = this.fiches.get(id)
    if (!f) return false
    if (this.hote.classeur?.id === id && this.hote.ui) return this.hote.ui.sauvegarde.enregistrer()
    return enregistrerDepuisLaBase(f, t => this.hote.message(t))
  }

  /** Des fichiers lâchés sur l'écran : pendant qu'ils le survolent, un cadre
   *  pointillé ; lâchés, ils s'ouvrent (fichiers.ts). Seulement des fichiers
   *  (pas une carte qu'on tire : elle passe par les pointeurs). */
  private brancherDepot() {
    const avecFichiers = (e: DragEvent) => !!this.fichiers && !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')
    const montrer = (oui: boolean) => { this.depot.hidden = !oui; this.el.classList.toggle('en-depot', oui) }
    this.el.addEventListener('dragenter', e => {
      if (!avecFichiers(e)) return
      e.preventDefault()
      this.survols++
      montrer(true)
    })
    this.el.addEventListener('dragover', e => {
      if (!avecFichiers(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    })
    this.el.addEventListener('dragleave', e => {
      if (!avecFichiers(e)) return
      this.survols = Math.max(0, this.survols - 1)
      if (!this.survols) montrer(false)
    })
    this.el.addEventListener('drop', e => {
      if (!avecFichiers(e)) return
      e.preventDefault()
      this.survols = 0
      montrer(false)
      const tous = [...(e.dataTransfer?.files ?? [])]
      if (tous.length && !document.querySelector('dialog[open]') && !this.depart) { this.finirSaisie(true); this.fichiers?.lacher(tous) }
    })
  }

  /** Un bouton du bandeau : une icône et son libellé (aria-label : il le
   *  garde quand le téléphone ne montre que l'icône, iconeSeule) */
  private bouton(texte: string, nomIcone: string, faire: () => void, titre: string, iconeSeule = false): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'biblio-bouton' + (iconeSeule ? ' icone-seule' : ''); b.title = titre
    b.setAttribute('aria-label', texte)
    b.innerHTML = icone(nomIcone)
    b.append(Object.assign(document.createElement('span'), { className: 'libelle', textContent: texte }))
    b.addEventListener('click', () => faire())
    return b
  }

  // ---------- Ouvrir, fermer ----------
  /** retour : l'élément qui reprend le focus à la fermeture (le bouton du
   *  classeur) ; auRetour : appelé quand le classeur revient */
  ouvrir(o: { retour?: HTMLElement | null; auRetour?: (() => void) | null } = {}) {
    if (this.ouvert) return
    this.retour = o.retour ?? null
    this.ouverteAuClavier = dernierGesteAuClavier()
    this.auRetour = o.auRetour ?? null
    document.body.classList.add('en-bibliotheque')
    // La recherche relit les classeurs (ils ont pu changer depuis)
    this.recherche.oublier()
    if (this.recherche.active) this.recherche.rafraichir()
    // Le reste de l'écran ne répond plus, ni au clavier ni au lecteur
    // d'écran ; sauf le message (il passe au-dessus d'elle) et les fenêtres
    this.inertes = []
    for (const c of this.racine.children) {
      if (c === this.el || !(c instanceof HTMLElement) || c.inert || c.classList.contains('toast') || c instanceof HTMLDialogElement) continue
      c.inert = true; this.inertes.push(c)
    }
    this.el.classList.toggle('sans-tactile', !ecranTactile())
    this.fermerBouton.hidden = !this.peutFermer
    this.boutonBandeau.hidden = !this.menuDuBandeau.length
    this.survols = 0
    this.depot.hidden = true
    this.el.hidden = false
    window.addEventListener('keydown', this.surTouche, true)
    this.minuterie = window.setInterval(() => { if (!this.occupe) this.rendre(null) }, RAFRAICHIR)
    this.majLigneOuvert()
    // L'aperçu du classeur de cet onglet, s'il a changé depuis le dernier
    void this.hote.rafraichirApercu?.().then(fait => { if (fait && this.hote.classeur) void this.apercuChange(this.hote.classeur.id) }).catch(() => {})
    // Le focus d'abord sur le bandeau (l'écran est vide un instant), puis
    // sur la carte du classeur ouvert, ou la première
    this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus({ preventScroll: true })
    // La fiche du classeur de cet onglet d'abord (1 s au plus) : sa carte
    // dit son vrai nombre de pages et sa date
    const fiche = Promise.resolve(this.hote.ecrireLaFiche?.()).catch(() => { /* la carte dit ce que sait l'index */ })
    void Promise.race([fiche, attendre(ECRIRE_LA_FICHE_MAX)]).then(() => this.charger()).then(() => {
      // Les bases de classeur sans fiche : une fois par chargement de la page
      void this.chercherLesOrphelines()
      if (!this.ouvert || this.listes.some(l => l.el.contains(document.activeElement))) return
      const l = this.recents.ordre.length ? this.recents : this.tous
      const id = l.focusId ?? l.ordre[0]
      if (id && document.activeElement === this.el.querySelector('.biblio-nouveau')) this.focusCarte(l, id)
    })
    void this.majPlace()
  }

  /** On peut revenir au classeur de l'onglet (× et Échap) : il y en a un, on
   *  ne part pas vers un autre, et il n'est pas dans la corbeille (supprimé
   *  ici ou ailleurs : on le remet, ou on en ouvre un autre) */
  get peutFermer(): boolean {
    const c = this.hote.classeur
    if (!c || this.depart) return false
    const f = this.fiches.get(c.id)
    return !this.lu || (!!f && visible(f, this.dossiers))
  }

  /** Échap, ×, ou le classeur de cet onglet choisi : le classeur revient. La
   *  bibliothèque seule (sans classeur) ne se ferme pas, ni pendant qu'on
   *  part vers un autre classeur (ce qui attend s'écrit). Un nom qu'on
   *  tapait est gardé. */
  fermer() {
    if (!this.ouvert || !this.peutFermer) return
    this.annulerGlisser()
    if (this.vue.ouverte) this.quitterCorbeille(false)
    if (this.vueSeances.ouverte) this.quitterVueSeances(false)
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    window.removeEventListener('keydown', this.surTouche, true)
    clearInterval(this.minuterie); this.minuterie = 0
    this.annulerAppui()
    this.appuiLeve = null
    this.deuxDoigts = null
    // Les aperçus : leurs adresses objet sont révoquées (relues à la prochaine ouverture)
    this.oublierImages()
    this.el.hidden = true
    document.body.classList.remove('en-bibliotheque')
    for (const c of this.inertes) c.inert = false
    this.inertes = []
    this.hote.ui?.maj()
    // Le focus revient au bouton du classeur. Il ne compte comme venu du
    // clavier (Espace y rouvrirait la bibliothèque) que si elle a été ouverte
    // et fermée au clavier : ouverte d'un clic, puis fermée par ×, par Échap
    // ou par la carte, Espace + glisser déplace la vue, comme sur les autres
    // boutons de la barre
    const retour = this.retour
    this.retour = null
    if (retour?.isConnected) rendreLeFocus(retour, this.ouverteAuClavier && dernierGesteAuClavier())
    const apres = this.auRetour
    this.auRetour = null
    apres?.()
  }

  // ---------- Les fiches ----------
  /** Toutes les fiches et tous les dossiers, relus ; puis toutes les cartes */
  charger(): Promise<void> {
    this.file = this.file.then(async () => {
      const [fiches, dossiers, conseil, images] = await Promise.all([this.registre.classeurs(), this.registre.dossiers(),
        this.registre.reglage<string>(REGLAGE_CONSEIL).catch(() => 'vu'), this.registre.apercus().catch(() => new Map<string, Blob>())])
      this.fiches = new Map(fiches.map(f => [f.id, f]))
      this.dossiers = new Map(dossiers.map(d => [d.id, d]))
      // Les aperçus : une adresse objet chacun (gardée si l'image n'a pas changé de taille)
      for (const id of [...this.images.keys()]) if (!images.has(id)) this.poserImage(id, undefined)
      for (const [id, b] of images) { const x = this.images.get(id); if (!x || x.blob.size !== b.size || x.blob.type !== b.type) this.poserImage(id, b) }
      this.conseilVu = conseil === 'vu'
      this.lu = true
      this.aAppliquer = { classeurs: new Set(), dossiers: false }
      if (this.ouvert) this.rendre(null)
    }).catch(() => {
      this.hote.message('La bibliothèque des classeurs ne se lit pas dans ce navigateur.')
    })
    return this.file
  }

  /** Un menu ou une saisie est ouvert : rien ne se refait (à leur fermeture) */
  private get occupe(): boolean { return !!this.menuCarte || !!this.menuBandeauOuvert || !!this.menuTriOuvert || !!this.saisie || !!this.glisse }

  /** La fiche du classeur de cet onglet vient d'être écrite par son suivi
   *  (sa date, son nombre de pages) : sa carte se refait, comme pour un
   *  changement venu d'un autre onglet */
  ficheChange(id: string) { this.surChangement({ type: 'change', classeurs: [id] }) }

  /** Ce qu'un autre onglet a changé (BroadcastChannel) : seulement ces
   *  classeurs-là (les dossiers, peu nombreux, se relisent tous) */
  private surChangement(c: ChangementBibliotheque) {
    for (const id of c.classeurs ?? []) this.aAppliquer.classeurs.add(id)
    if (c.dossiers?.length) this.aAppliquer.dossiers = true
    if (this.ouvert && !this.occupe) void this.appliquer()
  }

  private appliquer(): Promise<void> {
    this.file = this.file.then(async () => {
      if (!this.ouvert || this.occupe) return
      const ids = [...this.aAppliquer.classeurs], dossiers = this.aAppliquer.dossiers
      if (!ids.length && !dossiers && !this.aRefaire) return
      this.aAppliquer = { classeurs: new Set(), dossiers: false }
      const lus = await Promise.all(ids.map(id => this.registre.classeur(id).catch(() => null)))
      ids.forEach((id, i) => {
        const f = lus[i]
        if (f) this.fiches.set(id, f)
        else if (f === undefined) this.fiches.delete(id)
      })
      // Leurs aperçus aussi (un autre onglet a pu en écrire un)
      await Promise.all(ids.map(id => this.relireImage(id)))
      if (dossiers) this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d]))
      // Un menu s'est ouvert pendant la lecture : à sa fermeture
      if (this.occupe) { for (const id of ids) this.aAppliquer.classeurs.add(id); if (dossiers) this.aAppliquer.dossiers = true; return }
      const tout = dossiers || this.aRefaire
      this.aRefaire = false
      // Les dossiers changent les étiquettes héritées et ce que comptent leurs
      // cartes : tout se refait ; sinon, seulement ces classeurs-là
      if (this.ouvert) this.rendre(tout ? null : new Set(ids))
    }).catch(() => { /* la prochaine ouverture relira tout */ })
    return this.file
  }

  /** Les classeurs qu'on montre : visibles (ni dans la corbeille, ni en
   *  train de naître ou de partir) */
  private visibles(): FicheClasseur[] {
    return [...this.fiches.values()].filter(f => visible(f, this.dossiers))
  }

  /** Une écriture de l'index faite d'ici : la page ne part pas avant sa fin */
  private suivre<T>(p: Promise<T>): Promise<T> {
    this.ecritures = Promise.all([this.ecritures, p.catch(() => {})])
    return p
  }

  /** Change le dossier affiché (null : la racine), retenu pour l'onglet */
  private changerDossier(id: string | null) {
    this.dossierAffiche = id
    ecrireSession(CLE_DOSSIER, id)
  }

  /** Change le filtre de classe (null : toutes), retenu pour l'onglet */
  private changerFiltre(nom: string | null) {
    this.filtre = nom
    ecrireSession(CLE_FILTRE, nom)
  }

  /** Met l'écran à jour : Récents (à la racine, sans filtre), la rangée du
   *  filtre, le fil d'Ariane, la grille (les dossiers par nom, puis les
   *  classeurs selon le tri ; ou, avec un filtre, tous les classeurs de
   *  cette étiquette, avec leur chemin), le conseil. Les cartes sont
   *  gardées, seules celles qui ne sont pas à leur place bougent ; le
   *  contenu des cartes des ids changés (null : toutes) se refait. Le focus
   *  reste sur la même carte. Rien ne bouge pendant qu'on renomme (le champ
   *  perdrait le focus) : tout se refera à sa fermeture. */
  private rendre(changes: Set<string> | null) {
    if (!this.lu) return
    if (this.saisie) { this.aRefaire = true; return }
    const d = this.dossiers
    const tous = this.visibles()
    // Le dossier affiché n'est plus là (supprimé, mis à la corbeille ailleurs) : la racine
    if (this.dossierAffiche !== null) {
      const x = d.get(this.dossierAffiche)
      if (!x || !dossierVisible(x, d)) this.changerDossier(null)
    }
    // Une étiquette que plus aucun classeur ne porte : plus de filtre
    const etiquettes = etiquettesDe(tous, d)
    if (this.filtre !== null && !etiquettes.some(e => cleDe(e.nom) === cleDe(this.filtre!))) this.changerFiltre(null)
    const filtre = this.filtre, ici = this.dossierAffiche
    const aLaRacine = ici === null && filtre === null
    const rec = aLaRacine ? recents(tous).map(f => f.id) : []
    let cles: string[], sousDossiers = 0
    if (filtre !== null) cles = trier(tous.filter(f => porte(f, filtre, d)), this.tri).map(f => f.id)
    else {
      const sous = enfants(ici, d)
      sousDossiers = sous.length
      cles = [...sous.map(x => DOSSIER + x.id), ...trier(tous.filter(f => estDans(f, ici, d)), this.tri).map(f => f.id)]
    }
    // Le chemin sous le nom paraît ou s'en va : toutes les cartes
    if ((filtre !== null) !== this.plat) { this.plat = filtre !== null; changes = null }
    this.reconcilier(this.recents, rec, changes)
    this.reconcilier(this.tous, cles, changes, { chemin: this.plat })
    const rienDuTout = !tous.length && !sousDossiers && aLaRacine
    this.sectionRecents.hidden = !rec.length
    this.sectionTous.hidden = rienDuTout
    this.tous.el.hidden = !cles.length
    this.videDossier.hidden = !(!cles.length && ici !== null && filtre === null)
    this.vide.hidden = !rienDuTout
    const n = nombreDeClasseurs(tous.length)
    if (this.compte.textContent !== n) this.compte.textContent = n
    const label = filtre !== null ? `Classeurs de la classe « ${filtre} »` : ici === null ? 'Bibliothèque' : `Dossier « ${d.get(ici)?.nom ?? ''} »`
    if (this.tous.el.getAttribute('aria-label') !== label) this.tous.el.setAttribute('aria-label', label)
    this.majFiltre(etiquettes)
    this.majFil()
    this.majTri()
    this.majLigneOuvert()
    this.conseil.hidden = !(aLaRacine && this.conseilVu === false && d.size === 0)
    this.majCorbeille()
    for (const f of this.apresRendu) f()
  }

  private reconcilier(l: Liste, cles: string[], changes: Set<string> | null, o: { chemin?: boolean } = {}) {
    const actif = document.activeElement
    const focusIci = actif instanceof HTMLElement && l.el.contains(actif) ? actif.closest<HTMLElement>(CASE)?.dataset.cle ?? null : null
    const vus = new Set(cles)
    for (const [cle, c] of l.cartes) {
      if (vus.has(cle)) continue
      c.remove(); l.cartes.delete(cle)
    }
    if (!l.focusId || !vus.has(l.focusId)) {
      const ici = this.hote.classeur?.id
      l.focusId = (ici && vus.has(ici) ? ici : cles[0]) ?? null
    }
    const maintenant = Date.now()
    const fiches = [...this.fiches.values()]
    let avant: Element | null = l.el.firstElementChild
    for (const cle of cles) {
      let c = l.cartes.get(cle)
      const neuve = !c
      const dossier = cle.startsWith(DOSSIER)
      if (!c) { c = dossier ? this.creerCarteDossier(cle.slice(DOSSIER.length)) : this.creerCarte(cle); l.cartes.set(cle, c) }
      if (c !== avant) l.el.insertBefore(c, avant)
      else avant = avant.nextElementSibling
      // Une carte de dossier se refait toujours (ce qu'il contient a pu changer) : rien n'est touché qui n'a pas changé
      if (dossier) this.majCarteDossier(c, this.dossiers.get(cle.slice(DOSSIER.length))!, fiches)
      else if (neuve || !changes || changes.has(cle)) this.majCarte(c, this.fiches.get(cle)!, maintenant, o.chemin === true)
      const a = c.querySelector<HTMLElement>(FOCUSABLE)!
      const t = cle === l.focusId ? 0 : -1
      if (a.tabIndex !== t) a.tabIndex = t
    }
    l.ordre = cles
    // Déplacer une carte dans le document lui ôte le focus : il revient
    // (sur elle, ou sur la carte qui a pris sa place dans la rangée)
    if (focusIci && !l.el.contains(document.activeElement)) {
      const c = l.cartes.get(focusIci) ?? (l.focusId ? l.cartes.get(l.focusId) : undefined)
      c?.querySelector<HTMLElement>(FOCUSABLE)?.focus({ preventScroll: true })
    }
  }

  /** Le bouton ⋯ d'une carte (classeur ou dossier) : hors de l'ordre de Tab
   *  (un arrêt par rangée) ; au clavier, la touche Menu l'ouvre */
  private boutonOptions(li: HTMLElement): HTMLButtonElement {
    const cle = li.dataset.cle!
    const options = document.createElement('button')
    options.type = 'button'; options.className = 'options-classeur'; options.tabIndex = -1
    options.innerHTML = icone('points')
    options.setAttribute('aria-haspopup', 'menu'); options.setAttribute('aria-expanded', 'false')
    options.addEventListener('click', e => {
      if (this.menuCarte?.id === cle && this.menuCarte.menu.bouton === options) { fermerMenu(); return }
      const l = this.listeDe(li)
      if (l) this.focusCarte(l, cle, false)
      this.ouvrirMenuCarte(cle, { bouton: options, clavier: e.detail === 0 })
    })
    return options
  }

  private creerCarte(id: string): HTMLElement {
    const li = document.createElement('li')
    li.className = 'case-classeur'; li.dataset.id = id; li.dataset.cle = id
    const a = document.createElement('a')
    a.className = 'carte-classeur'; a.dataset.id = id; a.tabIndex = -1; a.draggable = false
    a.href = urlDuClasseur(location.href, id)
    const apercu = Object.assign(document.createElement('span'), { className: 'carte-apercu' })
    // L'aperçu de la première page (voir apercu-classeur.ts), quand il y en a un
    const image = Object.assign(document.createElement('img'), { className: 'apercu-image', alt: '', draggable: false, decoding: 'async', hidden: true })
    image.addEventListener('error', () => { image.hidden = true; image.removeAttribute('src'); this.montrerSansApercu(li, true) })
    apercu.append(image, Object.assign(document.createElement('span'), { className: 'sans-apercu', textContent: 'Pas encore d\'aperçu' }),
      Object.assign(document.createElement('span'), { className: 'pastille-ouvert', textContent: 'Ouvert', hidden: true }), this.poignee())
    const nom = Object.assign(document.createElement('span'), { className: 'carte-nom-classeur' })
    // Son dossier, quand un filtre montre les classeurs de tous les dossiers
    const chemin = Object.assign(document.createElement('span'), { className: 'carte-chemin', hidden: true })
    const infos = Object.assign(document.createElement('span'), { className: 'carte-infos' })
    const date = Object.assign(document.createElement('span'), { className: 'carte-date' })
    const sauvegardes = Object.assign(document.createElement('span'), { className: 'carte-sauvegardes' })
    const cle = Object.assign(document.createElement('span'), { className: 'carte-icone icone-cle', innerHTML: icone('cle'), hidden: true })
    const drive = Object.assign(document.createElement('span'), { className: 'carte-icone icone-drive', innerHTML: icone('nuage'), hidden: true })
    sauvegardes.append(cle, drive)
    infos.append(date, sauvegardes)
    // Les étiquettes de classe (propres, et celle héritée du dossier)
    const etiquettes = Object.assign(document.createElement('span'), { className: 'carte-etiquettes', hidden: true })
    for (const x of [apercu, nom, chemin, infos, etiquettes]) x.setAttribute('aria-hidden', 'true')
    a.append(apercu, nom, chemin, infos, etiquettes)
    li.append(a, this.boutonOptions(li), ...this.zoneSeances(li))
    return li
  }

  /** La ligne « 4 séances ▸ » sous la carte d'un classeur et sa liste
   *  dépliée (les séances où l'on a écrit, la plus récente d'abord) : hors de
   *  l'ordre de Tab comme le ⋯ ; au clavier, le menu de la carte la déplie.
   *  Chaque séance ouvre le classeur sur sa première page. */
  private zoneSeances(li: HTMLElement): [HTMLButtonElement, HTMLUListElement] {
    const bascule = document.createElement('button')
    bascule.type = 'button'; bascule.className = 'carte-seances-bascule'; bascule.hidden = true; bascule.tabIndex = -1
    bascule.setAttribute('aria-expanded', 'false')
    bascule.append(Object.assign(document.createElement('span'), { className: 'carte-seances-texte' }),
      Object.assign(document.createElement('span'), { className: 'carte-seances-fleche', textContent: '▸' }))
    bascule.querySelector('.carte-seances-fleche')!.setAttribute('aria-hidden', 'true')
    bascule.addEventListener('click', e => { e.stopPropagation(); this.basculerSeances(li.dataset.cle!) })
    const liste = document.createElement('ul')
    liste.className = 'carte-seances-liste'; liste.hidden = true
    return [bascule, liste]
  }

  /** Déplier ou replier les séances d'un classeur */
  private basculerSeances(cle: string) {
    if (this.seancesOuvertes.has(cle)) this.seancesOuvertes.delete(cle); else this.seancesOuvertes.add(cle)
    this.rendre(new Set([cle]))
  }

  /** La ligne « séances » et sa liste (rien n'est touché qui n'a pas changé) */
  private majSeances(c: HTMLElement, f: FicheClasseur) {
    const bascule = c.querySelector<HTMLButtonElement>('.carte-seances-bascule')
    const liste = c.querySelector<HTMLElement>('.carte-seances-liste')
    if (!bascule || !liste) return
    const texte = libelleSeances(f)
    const ouvert = !!texte && this.seancesOuvertes.has(f.id)
    if (bascule.hidden === !!texte) bascule.hidden = !texte
    if (texte) {
      const t = bascule.querySelector<HTMLElement>('.carte-seances-texte')!
      if (t.textContent !== texte) t.textContent = texte
      const aria = String(ouvert)
      if (bascule.getAttribute('aria-expanded') !== aria) bascule.setAttribute('aria-expanded', aria)
      const label = `${texte} de « ${f.nom} »`
      if (bascule.getAttribute('aria-label') !== label) bascule.setAttribute('aria-label', label)
    }
    if (liste.hidden === ouvert) liste.hidden = !ouvert
    if (!ouvert) { if (liste.childElementCount) { liste.replaceChildren(); delete liste.dataset.sig } return }
    const lignes = lignesDesSeances(f)
    const sig = lignes.map(l => `${l.id}\u0001${l.date}\u0001${l.nom ?? ''}\u0001${l.pages}`).join('\u0002') + '\u0003' + f.nom
    if (liste.dataset.sig === sig) return
    liste.dataset.sig = sig
    liste.setAttribute('aria-label', `Séances de « ${f.nom} »`)
    liste.replaceChildren(...lignes.map(l => {
      const li = document.createElement('li')
      const b = document.createElement('button')
      b.type = 'button'; b.className = 'carte-seance'
      b.append(Object.assign(document.createElement('span'), { className: 'seance-date', textContent: l.date }),
        Object.assign(document.createElement('span'), { className: 'seance-pages', textContent: l.pages }))
      if (l.nom) b.append(Object.assign(document.createElement('span'), { className: 'seance-nom', textContent: l.nom }))
      b.addEventListener('click', e => {
        e.stopPropagation()
        const x = this.fiches.get(f.id)
        if (x) void this.ouvrirClasseur(x, { seance: l.id, ...(e.detail !== 0 ? { x: e.clientX, y: e.clientY } : {}) })
      })
      li.append(b)
      return li
    }))
  }

  /** Le nom, la date et les pages, les étiquettes, le chemin (avec un
   *  filtre), le texte du lecteur d'écran, « Ouvert », la clé et le Drive
   *  d'une carte (rien n'est touché qui n'a pas changé) */
  private majCarte(c: HTMLElement, f: FicheClasseur, maintenant: number, avecChemin = false) {
    const ici = this.hote.classeur?.id === f.id
    const a = c.querySelector<HTMLAnchorElement>('.carte-classeur')!
    const poser = (x: Element, t: string) => { if (x.textContent !== t) x.textContent = t }
    poser(c.querySelector('.carte-nom-classeur')!, f.nom)
    poser(c.querySelector('.carte-date')!, libelleCarte(f, maintenant))
    const effectives = etiquettesEffectives(f, this.dossiers)
    this.majPuces(c.querySelector<HTMLElement>('.carte-etiquettes')!, effectives.map(e => ({
      nom: e.nom, heritee: !!e.dossier, titre: e.dossier ? `Étiquette du dossier « ${e.dossier.nom} »` : `Étiquette de classe « ${e.nom} »`,
    })))
    const ch = c.querySelector<HTMLElement>('.carte-chemin')!
    const chemin = avecChemin ? cheminLisible(f.dossier, this.dossiers) : ''
    poser(ch, chemin)
    if (ch.hidden === avecChemin) ch.hidden = !avecChemin
    const label = texteLecteur(f, maintenant, { ouvertIci: ici, etiquettes: effectives.map(e => e.nom), chemin: avecChemin ? chemin : undefined })
    if (a.getAttribute('aria-label') !== label) a.setAttribute('aria-label', label)
    if (a.title !== f.nom) a.title = f.nom
    const p = c.querySelector<HTMLElement>('.pastille-ouvert')!
    if (p.hidden === ici) p.hidden = !ici
    c.classList.toggle('ouvert-ici', ici)
    if (ici) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current')
    for (const [sel, titre] of [['.icone-cle', titreCle(f, maintenant)], ['.icone-drive', titreDrive(f, maintenant)]] as const) {
      const x = c.querySelector<HTMLElement>(sel)!
      if (x.hidden !== !titre) x.hidden = !titre
      if (titre && x.title !== titre) x.title = titre
    }
    const o = c.querySelector<HTMLElement>('.options-classeur')!, titre = `Options de « ${f.nom} »`
    if (o.title !== titre) { o.title = titre; o.setAttribute('aria-label', titre) }
    // L'aperçu de la première page, ou « Pas encore d'aperçu »
    const img = c.querySelector<HTMLImageElement>('.apercu-image')!, x = this.images.get(f.id)
    if (x) { if (img.getAttribute('src') !== x.url) img.src = x.url; if (img.hidden) img.hidden = false }
    else if (img.hasAttribute('src') || !img.hidden) { img.removeAttribute('src'); img.hidden = true }
    this.montrerSansApercu(c, !x)
    this.majSeances(c, f)
  }

  /** « Pas encore d'aperçu » et les petits carreaux, ou l'image */
  private montrerSansApercu(c: HTMLElement, sans: boolean) {
    const s = c.querySelector<HTMLElement>('.sans-apercu')
    if (s && s.hidden === sans) s.hidden = !sans
    c.classList.toggle('avec-apercu', !sans)
  }

  /** La poignée ⋮⋮ d'une carte : au doigt (et au stylet posé sur l'écran),
   *  elle tire la carte sans appui long ; sans écran tactile, elle n'est pas
   *  là (la souris et la tablette graphique tirent la carte de partout) */
  private poignee(): HTMLElement {
    const p = Object.assign(document.createElement('span'), { className: 'biblio-poignee', textContent: '⋮⋮', title: 'Glisser pour déplacer' })
    p.setAttribute('aria-hidden', 'true')
    return p
  }

  /** Les petites puces grises des étiquettes (l'héritée plus claire) */
  private majPuces(zone: HTMLElement, puces: { nom: string; heritee: boolean; titre: string }[]) {
    const sig = puces.map(p => `${p.heritee ? '~' : ''}${p.nom}\u0001${p.titre}`).join('\u0002')
    if (zone.dataset.sig === sig) return
    zone.dataset.sig = sig
    zone.replaceChildren(...puces.map(p => {
      const s = Object.assign(document.createElement('span'), { className: 'puce-etiquette' + (p.heritee ? ' heritee' : ''), textContent: p.nom, title: p.titre })
      return s
    }))
    zone.hidden = !puces.length
  }

  /** La carte d'un dossier : sa grande icône dans sa couleur, son nom, ce
   *  qu'il contient (« 4 classeurs · 2 dossiers »), l'étiquette d'un dossier
   *  de classe ; un clic, un toucher ou Entrée y entre */
  private creerCarteDossier(id: string): HTMLElement {
    const li = document.createElement('li')
    li.className = 'case-dossier'; li.dataset.dossier = id; li.dataset.cle = DOSSIER + id
    const b = document.createElement('button')
    b.type = 'button'; b.className = 'carte-dossier'; b.dataset.dossier = id; b.tabIndex = -1
    const ic = Object.assign(document.createElement('span'), { className: 'dossier-icone', innerHTML: SVG_DOSSIER })
    ic.appendChild(this.poignee())
    const nom = Object.assign(document.createElement('span'), { className: 'carte-nom-dossier' })
    const infos = Object.assign(document.createElement('span'), { className: 'carte-infos' })
    infos.append(Object.assign(document.createElement('span'), { className: 'carte-contenu' }))
    const etiquettes = Object.assign(document.createElement('span'), { className: 'carte-etiquettes', hidden: true })
    for (const x of [ic, nom, infos, etiquettes]) x.setAttribute('aria-hidden', 'true')
    b.append(ic, nom, infos, etiquettes)
    li.append(b, this.boutonOptions(li))
    return li
  }

  private majCarteDossier(c: HTMLElement, d: FicheDossier, fiches: readonly FicheClasseur[]) {
    const poser = (x: Element, t: string) => { if (x.textContent !== t) x.textContent = t }
    const n = compter(d.id, fiches, this.dossiers)
    poser(c.querySelector('.carte-nom-dossier')!, d.nom)
    poser(c.querySelector('.carte-contenu')!, libelleDossier(n))
    const couleur = couleurDe(d.couleur).valeur
    if (c.style.getPropertyValue('--c') !== couleur) c.style.setProperty('--c', couleur)
    this.majPuces(c.querySelector<HTMLElement>('.carte-etiquettes')!, d.etiquette
      ? [{ nom: d.etiquette, heritee: false, titre: `Dossier d'une classe : ses classeurs portent l'étiquette « ${d.etiquette} »` }] : [])
    const b = c.querySelector<HTMLElement>('.carte-dossier')!
    const label = texteLecteurDossier(d, n)
    if (b.getAttribute('aria-label') !== label) b.setAttribute('aria-label', label)
    if (b.title !== d.nom) b.title = d.nom
    const o = c.querySelector<HTMLElement>('.options-classeur')!, titre = `Options du dossier « ${d.nom} »`
    if (o.title !== titre) { o.title = titre; o.setAttribute('aria-label', titre) }
  }

  /** La rangée du filtre : « Classes : [Toutes] [5e B · 4] [2nde 3 · 2] »
   *  (aria-pressed), s'il y a au moins une étiquette. Refaite seulement si
   *  elle a changé ; le focus reste sur le même bouton. */
  private majFiltre(etiquettes: { nom: string; n: number }[]) {
    const f = this.filtreEl
    const actif = this.filtre === null ? null : cleDe(this.filtre)
    const sig = `${actif}|${etiquettes.map(e => `${e.nom}:${e.n}`).join('|')}`
    if (sig === this.cleFiltre) return
    this.cleFiltre = sig
    f.hidden = !etiquettes.length
    const focus = (document.activeElement as HTMLElement | null)?.closest?.('.biblio-filtre') ? (document.activeElement as HTMLElement).dataset.etiquette : undefined
    const titre = Object.assign(document.createElement('span'), { className: 'filtre-titre', textContent: 'Classes :' })
    titre.setAttribute('aria-hidden', 'true')
    const bouton = (texte: string, cle: string, nom: string | null, label: string) => {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'filtre-etiquette', textContent: texte })
      b.dataset.etiquette = cle
      b.setAttribute('aria-pressed', String((nom === null ? null : cleDe(nom)) === actif))
      b.setAttribute('aria-label', label)
      b.addEventListener('click', () => this.choisirFiltre(nom !== null && cleDe(nom) === actif ? null : nom))
      return b
    }
    const boutons = [bouton('Toutes', '', null, 'Toutes les classes'),
      ...etiquettes.map(e => bouton(`${e.nom} · ${e.n}`, cleDe(e.nom), e.nom, `${e.nom}, ${nombreDeClasseurs(e.n).toLowerCase()}`))]
    f.replaceChildren(titre, ...boutons)
    if (focus !== undefined) (boutons.find(b => b.dataset.etiquette === focus) ?? boutons[0]).focus({ preventScroll: true })
  }

  /** Le fil d'Ariane : « Bibliothèque › 5e B › Géométrie », chaque dossier
   *  au-dessus un bouton, celui où l'on est en gras (aria-current) ; avec un
   *  filtre, « Classe « 5e B » ». Refait seulement s'il a changé. */
  private majFil() {
    const chaine = this.filtre === null ? filAriane(this.dossierAffiche, this.dossiers) : []
    const sig = this.filtre !== null ? `f:${this.filtre}` : `r:${chaine.map(d => `${d.id}:${d.nom}`).join('|')}`
    if (sig === this.cleFil) return
    this.cleFil = sig
    const focus = this.filEl.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.dossier ?? '' : null
    const items: HTMLElement[] = []
    // Là où l'on est : le titre de la grille (un titre, pour qui va de titre
    // en titre au lecteur d'écran, comme « Récents »)
    const ici = (texte: string, id?: string | null) => {
      const s = Object.assign(document.createElement('h3'), { className: 'fil-ici', textContent: texte })
      s.setAttribute('aria-current', 'location')
      // Une cible du glisser (lot 4 C7) : y lâcher une carte de Récents l'y range
      if (id !== undefined) s.dataset.dossier = id ?? ''
      return s
    }
    const element = (texte: string, id: string | null, venuDe: string | null, dernier: boolean) => {
      if (dernier) return ici(texte, id)
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'fil-bouton', textContent: texte })
      b.dataset.dossier = id ?? ''
      b.addEventListener('click', () => this.allerA(id, venuDe))
      return b
    }
    if (this.filtre !== null) items.push(ici(`Classe « ${this.filtre} »`))
    else {
      items.push(element('Bibliothèque', null, chaine[0]?.id ?? null, !chaine.length))
      chaine.forEach((d, i) => items.push(element(d.nom, d.id, chaine[i + 1]?.id ?? null, i === chaine.length - 1)))
    }
    this.filEl.replaceChildren(...items.map((x, i) => {
      const li = document.createElement('li')
      if (i) {
        const sep = Object.assign(document.createElement('span'), { className: 'fil-sep', textContent: '›' })
        sep.setAttribute('aria-hidden', 'true')
        li.appendChild(sep)
      }
      li.appendChild(x)
      return li
    }))
    if (focus !== null) (this.filEl.querySelector<HTMLElement>(`button[data-dossier="${CSS.escape(focus)}"]`) ?? this.filEl.querySelector<HTMLElement>('button'))?.focus({ preventScroll: true })
  }

  /** « Trier : Modifiés récemment » */
  private majTri() {
    const nom = TRIS.find(t => t.id === this.tri)?.nom ?? TRIS[0].nom
    const l = this.triBouton.querySelector('.libelle')!, texte = `Trier : ${nom}`
    if (l.textContent !== texte) {
      l.textContent = texte
      this.triBouton.setAttribute('aria-label', `Trier les classeurs : ${nom}`)
      this.triBouton.title = `Trier les classeurs (${nom.toLowerCase()})`
    }
  }

  /** La ligne du classeur ouvert, sous le bandeau : « « Symétrie » :
   *  Enregistré dans ce navigateur · sur la clé il y a 2 min », et les
   *  boutons de ce qui demande un clic (ceux de l'état : enregistrer,
   *  reprendre la clé…). Refaite quand l'état change, sauf si le focus y est. */
  private majLigneOuvert() {
    const c = this.hote.classeur, s = this.hote.surveillance, l = this.ligneOuvert
    if (!c || !s) { l.hidden = true; return }
    l.hidden = false
    const t = s.texte
    const texte = `« ${c.nom} » : ${resumeEtat(s.etat, Date.now())}`
    const actions: ActionEtat[] = []
    for (const x of t.lignes) {
      if (x.niveau !== 'attention') continue
      for (const a of [x.action, ...(x.plus ?? [])]) if (a && !actions.includes(a) && this.hote.ui?.actionEtat(a)) actions.push(a)
    }
    const cle = `${texte}|${t.niveau}|${actions.join()}`
    if (cle === this.cleLigne || l.contains(document.activeElement)) return
    this.cleLigne = cle
    l.dataset.niveau = t.niveau
    const point = Object.assign(document.createElement('span'), { className: 'point-ligne' })
    point.setAttribute('aria-hidden', 'true')
    const span = Object.assign(document.createElement('span'), { className: 'texte-ouvert', textContent: texte })
    const boutons = actions.map(a => {
      const x = this.hote.ui!.actionEtat(a)!
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'bouton-bandeau', textContent: x.libelle })
      b.dataset.etatAction = a
      b.addEventListener('click', () => x.faire())
      return b
    })
    l.replaceChildren(point, span, ...boutons)
  }

  // ---------- Se promener dans les dossiers, filtrer ----------
  /** Va dans un dossier (null : la racine) ; le focus va à la carte du
   *  dossier d'où l'on vient (en remontant), sinon à la première carte, ou
   *  au « Nouveau classeur » d'un dossier vide */
  allerA(dossierId: string | null, venuDe: string | null = null) {
    if (dossierId !== null && !this.dossiers.has(dossierId)) return
    this.annulerClicNom()
    this.finirSaisie(true)
    if (this.filtre !== null) this.changerFiltre(null)
    const descend = dossierId !== null && venuDe === null
    this.changerDossier(dossierId)
    this.rendre(null)
    if (descend) this.corps.scrollTop = 0
    const l = this.tous
    const cible = venuDe !== null && l.cartes.has(DOSSIER + venuDe) ? DOSSIER + venuDe : l.ordre[0]
    if (cible) this.focusCarte(l, cible)
    else this.videDossier.querySelector<HTMLElement>('button')?.focus()
  }

  /** Retour arrière : le dossier au-dessus */
  private remonter() {
    const ici = this.dossierAffiche
    if (ici === null) return
    const d = this.dossiers.get(ici)
    this.allerA(d ? parentAffiche(d, this.dossiers) : null, ici)
  }

  /** Une étiquette de la rangée du filtre (null : Toutes) */
  private choisirFiltre(nom: string | null) {
    this.annulerClicNom()
    this.finirSaisie(true)
    this.changerFiltre(nom)
    this.rendre(null)
  }

  // ---------- Le clavier ----------
  private listeDe(x: Element): Liste | undefined {
    return this.listes.find(l => l.el.contains(x))
  }

  /** Le focus va à une carte, classeur ou dossier (un seul arrêt de Tab par rangée) */
  private focusCarte(l: Liste, cle: string, defiler = true) {
    const c = l.cartes.get(cle)
    if (!c) return
    if (l.focusId !== cle) {
      const avant = l.focusId ? l.cartes.get(l.focusId) : null
      const aa = avant?.querySelector<HTMLElement>(FOCUSABLE)
      if (aa) aa.tabIndex = -1
      l.focusId = cle
    }
    const a = c.querySelector<HTMLElement>(FOCUSABLE)!
    a.tabIndex = 0
    a.focus({ preventScroll: !defiler })
  }

  /** ↑ ↓ : la carte de la ligne d'avant ou d'après la plus proche en x,
   *  selon la mise en page réelle (au téléphone, « Récents » est une seule
   *  ligne qui défile : rien) */
  private carteVoisine(l: Liste, id: string, sens: 1 | -1): string | null {
    const rects = l.ordre.map(x => { const r = l.cartes.get(x)!.getBoundingClientRect(); return { x: r.left, y: r.top, l: r.width, h: r.height } })
    const lignes = lignesDe(rects), i = l.ordre.indexOf(id)
    const k = lignes.findIndex(x => x.includes(i))
    const ligne = lignes[k + sens]
    if (k < 0 || !ligne) return null
    const cx = rects[i].x + rects[i].l / 2
    let meilleur = ligne[0]
    for (const j of ligne) if (Math.abs(rects[j].x + rects[j].l / 2 - cx) < Math.abs(rects[meilleur].x + rects[meilleur].l / 2 - cx)) meilleur = j
    return l.ordre[meilleur]
  }

  /** Sur window, en capture, posé à l'ouverture (après ceux des menus, posés
   *  au démarrage). Une fenêtre, un menu, un champ gardent leurs touches.
   *  Échap enlève d'abord le filtre de classe, puis ferme l'écran (un menu se
   *  ferme avant tout, par menus.ts) ; Retour arrière remonte d'un dossier.
   *  Sur une carte : les flèches, Début, Fin, F2 (renommer), la touche Menu
   *  et Maj + F10 ; Entrée est celle du lien ou du bouton (son clic). */
  private surTouche = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement
    // Une carte qu'on tire : Échap l'arrête (rien ne bouge) ; le reste attend
    if (this.glisse) {
      e.preventDefault(); e.stopPropagation()
      if (e.key === 'Escape') this.annulerGlisser()
      return
    }
    if (cible.closest?.('dialog') || document.querySelector('dialog[open]')) return
    // Ctrl + F (⌘ + F) : le champ de la recherche (pas dans la corbeille ni
    // les séances, qui ont la place des cartes)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'f') {
      e.preventDefault(); e.stopPropagation()
      if (!e.repeat && !this.vue.ouverte && !this.vueSeances.ouverte) { if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu(); this.recherche.focus() }
      return
    }
    // Ctrl + O (⌘ + O) : ouvrir un classeur ou une bibliothèque (lot 4 C9 ;
    // la sauvegarde laisse la touche à la bibliothèque quand elle est ouverte)
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'o') {
      e.preventDefault(); e.stopPropagation()
      if (!e.repeat && this.fichiers && !this.depart) {
        if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
        this.finirSaisie(true)
        this.fichiers.choisir()
      }
      return
    }
    if (this.occupe || cible.closest?.('.menu-flottant')) return
    if (cible.closest?.('input, textarea, select, [contenteditable]')) return
    const fait = () => { e.preventDefault(); e.stopPropagation() }
    // La vue de la corbeille : Échap ramène aux cartes ; Tab va de bouton en bouton
    if (this.vue.ouverte) {
      if (e.key === 'Escape') { fait(); this.quitterCorbeille() }
      return
    }
    if (this.vueSeances.ouverte) {
      if (e.key === 'Escape') { fait(); this.quitterVueSeances() }
      return
    }
    if (e.key === 'Escape') {
      fait()
      if (this.filtre !== null) this.choisirFiltre(null)
      else this.fermer()
      return
    }
    if (e.key === 'Backspace' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey && this.filtre === null && this.dossierAffiche !== null) {
      fait()
      if (!e.repeat) this.remonter()
      return
    }
    const carte = cible.closest?.(CASE)
    const l = carte ? this.listeDe(carte) : undefined
    const id = (carte as HTMLElement | null)?.dataset.cle
    if (!l || !id) return
    if (toucheMenu(e)) { fait(); if (!e.repeat) this.ouvrirMenuCarte(id, { clavier: true }); return }
    // Suppr (⌘ + ⌫ sur Mac) : dans la corbeille, sans question (Annuler la rend)
    if ((e.key === 'Delete' && !e.ctrlKey && !e.metaKey && !e.altKey) || (MAC && e.key === 'Backspace' && e.metaKey && !e.altKey)) {
      fait(); if (!e.repeat) void this.supprimer(id); return
    }
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (e.key === 'F2') { fait(); if (!e.repeat) this.renommer(id); return }
    const o = l.ordre, i = o.indexOf(id)
    let vers: string | null | undefined
    switch (e.key) {
      case 'ArrowLeft': vers = o[i - 1]; break
      case 'ArrowRight': vers = o[i + 1]; break
      case 'ArrowUp': vers = this.carteVoisine(l, id, -1); break
      case 'ArrowDown': vers = this.carteVoisine(l, id, 1); break
      case 'Home': vers = o[0]; break
      case 'End': vers = o[o.length - 1]; break
      default: return
    }
    fait()
    if (vers) this.focusCarte(l, vers)
  }

  // ---------- Les pointeurs ----------
  /** Le clic simple d'une carte (souris, plume de la tablette, toucher bref,
   *  Entrée) ouvre le classeur, ou entre dans le dossier ; sur le nom, on
   *  attend un instant qu'un second clic en fasse un double-clic (renommer).
   *  Ctrl, Maj ou ⌘ + clic et le clic du milieu sur un classeur restent au
   *  navigateur (un autre onglet, une autre fenêtre). Le clic droit et le
   *  bouton du stylet, à l'APPUI, ouvrent le menu de la carte, là où l'on a
   *  appuyé (sur Mac, Ctrl + clic aussi) : ils ne tirent rien. L'appui qui
   *  vient de fermer un menu ne fait rien d'autre.
   *  Glisser une carte (lot 4 C7), comme dans la trieuse des pages : à la
   *  souris et à la tablette graphique (un stylet sans écran tactile : la
   *  Wacom de la classe), de n'importe où sur la carte, dès 4 px (6 au
   *  stylet), sans appui long ; au doigt et au stylet posé sur l'écran,
   *  seulement par la poignée ⋮⋮ (dès 8 px) ou après un appui long (500 ms
   *  sans bouger de plus de 8 px, une petite vibration) : sinon le doigt
   *  fait défiler (touch-action: pan-y), et deux doigts aussi, sans rien
   *  ouvrir. Le clic qui suit un glisser ne fait rien. */
  private brancherPointeurs() {
    const c = this.corps
    c.addEventListener('pointerdown', e => this.surBas(e))
    c.addEventListener('pointermove', e => this.surBouge(e))
    c.addEventListener('pointerup', e => this.surLeve(e, false))
    c.addEventListener('pointercancel', e => this.surLeve(e, true))
    // La grille perd le pointeur qu'elle tenait (pas la carte qui le lui
    // passe au début d'un glisser au doigt) : le glisser s'arrête, rien ne bouge
    c.addEventListener('lostpointercapture', e => { if (e.target === c && this.glisse?.id === e.pointerId) this.annulerGlisser() })
    // Deux doigts qui glissent font défiler, comme un seul (au TNI, la main
    // entière se pose souvent) : touch-action: pan-y interdit au navigateur
    // les gestes à plusieurs doigts (pour que le pincement n'agrandisse pas
    // la page), on le fait ici, comme dans la trieuse. Le second doigt arrête
    // le toucher du premier (ni classeur ouvert, ni appui long). Une carte
    // qu'on tire (à la souris, avec une paume posée sur le TNI) continue
    // seule, et rien ne défile sous elle.
    const surLeCorps = (e: TouchEvent) => [...e.touches].filter(t => t.target instanceof Node && c.contains(t.target))
    const hauteur = (l: Touch[]) => l.reduce((x, t) => x + t.clientY, 0) / l.length
    c.addEventListener('touchstart', e => {
      const l = surLeCorps(e)
      if (l.length < 2 || this.glisse) return
      if (this.appui?.direct) this.annulerAppui()
      this.annulerClicNom()
      this.deuxDoigts = { y: hauteur(l) }
      this.avalerClicJusqua = performance.now() + 800
    }, { passive: true })
    c.addEventListener('touchmove', e => {
      if (this.glisse || (this.appui?.arme && this.appui.direct)) { if (e.cancelable) e.preventDefault(); return }
      const l = surLeCorps(e), d = this.deuxDoigts
      if (!d || l.length < 2) return
      const y = hauteur(l)
      if (e.cancelable) { e.preventDefault(); c.scrollTop -= y - d.y }
      d.y = y
      this.avalerClicJusqua = performance.now() + 800
    }, { passive: false })
    const leve = (e: TouchEvent) => {
      const l = surLeCorps(e)
      if (l.length < 2) this.deuxDoigts = null
      else if (this.deuxDoigts) this.deuxDoigts.y = hauteur(l)
    }
    c.addEventListener('touchend', leve)
    c.addEventListener('touchcancel', leve)
    c.addEventListener('click', e => {
      const cible = e.target as HTMLElement
      const lien = cible.closest<HTMLElement>('a.carte-classeur, button.carte-dossier')
      const id = lien?.closest<HTMLElement>(CASE)?.dataset.cle
      if (!lien || !id) return
      const dossier = id.startsWith(DOSSIER)
      // Sur Mac, Ctrl + clic est le clic droit (le menu est déjà ouvert)
      if (MAC && e.ctrlKey) { e.preventDefault(); return }
      if (!dossier && (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey)) return
      if (e.button !== 0) return
      e.preventDefault()
      const a = this.appuiLeve
      this.appuiLeve = null
      if (e.detail !== 0 && a && a.carte === id && (a.avale || a.bouge || (a.type === 'touch' && performance.now() - a.t0 > APPUI_LONG))) return
      const x = e.clientX, y = e.clientY, souris = e.detail !== 0
      const agir = () => {
        if (dossier) { this.allerA(id.slice(DOSSIER.length)); return }
        const f = this.fiches.get(id)
        if (f) void this.ouvrirClasseur(f, souris ? { x, y } : {})
      }
      // Sur le nom : un double-clic le renomme
      if (souris && cible.closest('.carte-nom-classeur, .carte-nom-dossier')) {
        if (this.clicNom?.cle === id) { this.annulerClicNom(); this.renommer(id); return }
        this.annulerClicNom()
        this.clicNom = { cle: id, minuterie: window.setTimeout(() => {
          this.clicNom = null
          if (this.ouvert && !this.occupe && !this.depart && !document.querySelector('dialog[open]')) agir()
        }, DOUBLE_CLIC_NOM) }
        return
      }
      this.annulerClicNom()
      agir()
    })
  }

  private surBas(e: PointerEvent) {
    // Une carte qu'on tire continue seule : une paume posée sur le TNI, un
    // second doigt n'y changent rien
    if (this.glisse) return
    // Un nouvel appui : le lever d'un glisser arrêté ne viendra plus
    this.pointeurFini = null
    const cible = e.target as HTMLElement
    const carte = cible.closest<HTMLElement>(CASE)
    const id = carte?.dataset.cle
    if (!carte || !id || cible.closest('.carte-saisie')) return
    const droit = e.button === 2 || (MAC && e.ctrlKey && e.button === 0 && e.pointerType !== 'touch')
    if (droit) {
      e.preventDefault()
      const l = this.listeDe(carte)
      if (l) this.focusCarte(l, id, false)
      this.ouvrirMenuCarte(id, { x: e.clientX, y: e.clientY })
      return
    }
    if (cible.closest('.options-classeur, .carte-seances-bascule, .carte-seances-liste') || e.button !== 0) return
    // Un second doigt : rien (voir touchstart, qui arrête le premier)
    if (this.appui) return
    const l = this.listeDe(carte)
    if (!l) return
    this.focusCarte(l, id, false)
    const type = typePointeur(e.pointerType)
    const direct = type === 'touch' || (type === 'pen' && ecranTactile())
    const poignee = !!cible.closest('.biblio-poignee')
    const ferme = avale(e)
    const a: Appui = { id: e.pointerId, carte: id, li: carte, liste: l, type, direct, x0: e.clientX, y0: e.clientY, t0: performance.now(),
      bouge: false, avale: ferme, arme: !ferme && (!direct || poignee), minuterie: 0 }
    if (direct && !a.arme && !ferme) a.minuterie = window.setTimeout(() => this.appuiLong(a), APPUI_LONG)
    this.appui = a
  }

  /** L'appui long du doigt : la carte se soulève, prête à suivre le doigt */
  private appuiLong(a: Appui) {
    if (this.appui !== a || a.bouge || this.glisse || !this.ouvert) return
    a.arme = true
    this.annulerClicNom()
    try { navigator.vibrate?.(10) } catch { /* pas de vibreur */ }
    this.commencerGlisser(a, a.x0, a.y0)
  }

  private surBouge(e: PointerEvent) {
    const g = this.glisse
    if (g) { if (e.pointerId === g.id) { g.x = e.clientX; g.y = e.clientY; this.suivreGlisser() } return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    const d = Math.hypot(e.clientX - a.x0, e.clientY - a.y0)
    if (!a.arme) {
      // Le doigt part avant l'appui long : il fait défiler, ce n'est plus un toucher
      if (d > (a.direct ? SEUIL_GLISSER.touch : SEUIL_GLISSER[a.type])) { a.bouge = true; clearTimeout(a.minuterie) }
      return
    }
    const seuil = a.direct ? SEUIL_GLISSER.touch : SEUIL_GLISSER[a.type]
    if (d >= seuil) { a.bouge = true; this.commencerGlisser(a, e.clientX, e.clientY) }
  }

  private surLeve(e: PointerEvent, annule: boolean) {
    if (this.glisse?.id === e.pointerId) { if (annule) this.annulerGlisser(false); else void this.lacher(); return }
    // Le lever d'un glisser arrêté par Échap : son clic ne fait rien
    if (this.pointeurFini === e.pointerId) { this.pointeurFini = null; this.avalerClicJusqua = performance.now() + APRES_GLISSER; return }
    const a = this.appui
    if (!a || a.id !== e.pointerId) return
    this.annulerAppui()
    // Le clic, qui vient juste après, le relit
    if (!annule) this.appuiLeve = a
  }

  private annulerAppui() {
    const a = this.appui
    if (!a) return
    clearTimeout(a.minuterie)
    this.appui = null
  }

  // ---------- Glisser une carte (lot 4 C7) ----------
  /** Les cibles du glisser, telles qu'on les voit : les éléments du fil
   *  d'Ariane (les dossiers au-dessus, « Bibliothèque », et celui où l'on
   *  est), puis les cartes des dossiers de la grille. Avec un filtre de
   *  classe (une liste plate), il n'y en a pas. */
  private ciblesDuGlisser(): { id: string | null; el: HTMLElement }[] {
    const r: { id: string | null; el: HTMLElement }[] = []
    if (this.filtre !== null) return r
    for (const x of this.filEl.querySelectorAll<HTMLElement>('[data-dossier]')) r.push({ id: x.dataset.dossier || null, el: x })
    for (const [cle, li] of this.tous.cartes) if (cle.startsWith(DOSSIER)) r.push({ id: cle.slice(DOSSIER.length), el: li })
    return r
  }

  /** La carte part : elle s'estompe, son image suit le pointeur, les cibles
   *  possibles s'éclairent (jamais elle-même, ni, pour un dossier, l'un de
   *  ses descendants, ni le dossier où elle est déjà), la grille défile près
   *  de son bord */
  private commencerGlisser(a: Appui, x: number, y: number) {
    this.annulerAppui()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    const cle = a.carte, dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    if ((!f && !d) || !a.li.isConnected) return
    const objet = f ? objetClasseur(f) : objetDossier(d!)
    const li = a.li, r = li.getBoundingClientRect()
    const fantome = li.cloneNode(true) as HTMLElement
    fantome.classList.add('biblio-fantome')
    fantome.classList.remove('ouvert-ici')
    for (const x of [fantome, ...fantome.querySelectorAll<HTMLElement>('*')]) {
      for (const k of ['data-cle', 'data-id', 'data-dossier', 'tabindex', 'aria-label', 'aria-current', 'href', 'title']) x.removeAttribute(k)
    }
    fantome.querySelector('.options-classeur')?.remove()
    fantome.querySelector('.carte-seances-bascule')?.remove()
    fantome.querySelector('.carte-seances-liste')?.remove()
    fantome.querySelector('.biblio-poignee')?.remove()
    fantome.querySelector('.carte-saisie')?.remove()
    fantome.setAttribute('aria-hidden', 'true')
    fantome.inert = true
    fantome.style.width = r.width + 'px'; fantome.style.height = r.height + 'px'
    this.el.appendChild(fantome)
    li.classList.add('tiree')
    this.el.classList.add('en-glisser')
    const refus = interdits(objet, this.dossiers)
    const cibles = this.ciblesDuGlisser()
    for (const c of cibles) c.el.classList.toggle('cible-possible', !refus.has(c.id))
    this.glisse = { id: a.id, cle, li, fantome, objet, refus, cibles, sous: null, dx: a.x0 - r.left, dy: a.y0 - r.top, x, y, reste: 0 }
    try { this.corps.setPointerCapture(a.id) } catch { /* pointeur déjà parti */ }
    this.suivreGlisser()
    cancelAnimationFrame(this.boucle)
    this.boucle = requestAnimationFrame(this.defiler)
  }

  /** L'image suit le pointeur ; la cible sous lui s'éclaire davantage (dans
   *  ce qu'on voit de la grille : une carte passée sous le bandeau n'en est
   *  plus une) */
  private suivreGlisser() {
    const g = this.glisse
    if (!g) return
    // Réduite, tenue là où on l'a prise : la cible sous le pointeur reste visible
    g.fantome.style.transform = `translate(${g.x - g.dx * FANTOME}px, ${g.y - g.dy * FANTOME}px) scale(${FANTOME}) rotate(1.5deg)`
    const corps = this.corps.getBoundingClientRect()
    const zones = g.cibles.map(c => {
      const r = c.el.getBoundingClientRect()
      const x1 = Math.max(r.left, corps.left), y1 = Math.max(r.top, corps.top), x2 = Math.min(r.right, corps.right), y2 = Math.min(r.bottom, corps.bottom)
      return { id: c.id, x: x1, y: y1, l: Math.max(0, x2 - x1), h: Math.max(0, y2 - y1) }
    })
    const z = cibleSous(g.x, g.y, zones, g.refus)
    const sous = z ? g.cibles.find(c => c.id === z.id) ?? null : null
    if (sous === g.sous) return
    g.sous?.el.classList.remove('cible-sous')
    sous?.el.classList.add('cible-sous')
    g.sous = sous
  }

  /** Une image : près du bord haut ou bas de la grille, elle défile seule
   *  (voir vitesseDefilement), et la cible sous le pointeur suit */
  private defiler = () => {
    const g = this.glisse
    if (!g) return
    const r = this.corps.getBoundingClientRect()
    g.reste += vitesseDefilement(g.y, r.top, r.bottom)
    const pas = Math.trunc(g.reste)
    if (pas) {
      g.reste -= pas
      const avant = this.corps.scrollTop
      this.corps.scrollTop = avant + pas
      if (this.corps.scrollTop !== avant) this.suivreGlisser()
      else g.reste = 0
    }
    this.boucle = requestAnimationFrame(this.defiler)
  }

  /** Le glisser s'arrête : l'image s'en va, la carte et les cibles
   *  reviennent ; ce que les autres onglets ont changé entre-temps se fait */
  private finirGlisser(): Glisse | null {
    const g = this.glisse
    if (!g) return null
    this.glisse = null
    cancelAnimationFrame(this.boucle); this.boucle = 0
    g.fantome.remove()
    g.li.classList.remove('tiree')
    for (const c of g.cibles) c.el.classList.remove('cible-possible', 'cible-sous')
    this.el.classList.remove('en-glisser')
    try { if (this.corps.hasPointerCapture(g.id)) this.corps.releasePointerCapture(g.id) } catch { /* déjà relâché */ }
    if (this.ouvert) void this.appliquer()
    return g
  }

  /** Échap, pointercancel, la bibliothèque qui se ferme : rien ne bouge ;
   *  le lever qui suit (le pointeur encore posé : leverAttendu) ne fait rien */
  private annulerGlisser(leverAttendu = true) {
    const g = this.finirGlisser()
    if (g && leverAttendu) this.pointeurFini = g.id
  }

  /** Le lâcher : sur une cible, comme « Déplacer vers… » (la cible est
   *  relue : partie entre-temps, « Ce dossier n'existe plus. ») ; ailleurs,
   *  rien ne bouge. Le clic qui suit ne fait rien. */
  private async lacher() {
    const g = this.finirGlisser()
    if (!g) return
    this.avalerClicJusqua = performance.now() + APRES_GLISSER
    if (!g.sous) return
    await this.deplacerVers(g.cle, g.sous.id)
  }

  private annulerClicNom() {
    if (!this.clicNom) return
    clearTimeout(this.clicNom.minuterie)
    this.clicNom = null
  }

  // ---------- Renommer ----------
  /** F2, « Renommer… », un double-clic sur le nom : un champ dans la carte
   *  (classeur : 60 caractères ; dossier : 40), prérempli, tout choisi.
   *  Entrée ou un clic ailleurs gardent le nom, Échap rend l'ancien ; un nom
   *  vide est refusé. Au doigt, le champ reste au-dessus du clavier virtuel. */
  renommer(cle: string) {
    if (this.depart || !this.ouvert) return
    const dossier = cle.startsWith(DOSSIER)
    const ancien = dossier ? this.dossiers.get(cle.slice(DOSSIER.length))?.nom : this.fiches.get(cle)?.nom
    const actif = document.activeElement
    const l = this.listes.find(x => x.cartes.has(cle) && x.el.contains(actif)) ?? (this.tous.cartes.has(cle) ? this.tous : this.listes.find(x => x.cartes.has(cle)))
    const li = l?.cartes.get(cle)
    if (!l || !li || ancien === undefined) return
    if (this.saisie?.cle === cle && this.saisie.liste === l) { this.saisie.input.focus(); return }
    this.finirSaisie(true)
    this.annulerClicNom()
    this.focusCarte(l, cle, false)
    const input = document.createElement('input')
    input.type = 'text'; input.className = 'carte-saisie'
    input.maxLength = dossier ? LONGUEUR_NOM_DOSSIER : LONGUEUR_NOM_CLASSEUR
    input.value = ancien
    input.autocomplete = 'off'; input.spellcheck = false; input.enterKeyHint = 'done'
    input.setAttribute('aria-label', dossier ? `Nom du dossier « ${ancien} »` : `Nom du classeur « ${ancien} »`)
    const s: Saisie = { cle, liste: l, li, input, ancien, dossier }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) {
        e.preventDefault(); e.stopPropagation()
        // Un nom vide : refusé, le champ reste
        if (!(dossier ? nomDeDossier(input.value) : nomDeClasseur(input.value))) { this.hote.message(dossier ? 'Un dossier a besoin d\'un nom.' : 'Un classeur a besoin d\'un nom.'); return }
        this.finirSaisie(true, true)
      } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.finirSaisie(false, true) }
    })
    input.addEventListener('blur', () => { if (this.saisie === s) this.finirSaisie(true) })
    // Ni le menu de la carte ni son ouverture : le champ est à part du lien
    input.addEventListener('pointerdown', e => e.stopPropagation())
    input.addEventListener('click', e => e.stopPropagation())
    // Le champ par-dessus le nom (le lien de la carte ne peut pas contenir de champ)
    const nom = li.querySelector<HTMLElement>('.carte-nom-classeur, .carte-nom-dossier')!
    const rl = li.getBoundingClientRect(), rn = nom.getBoundingClientRect()
    input.style.top = `${Math.round(rn.top - rl.top - 7)}px`
    li.classList.add('en-saisie')
    li.appendChild(input)
    this.saisie = s
    input.focus({ preventScroll: true })
    input.select()
    window.visualViewport?.addEventListener('resize', this.montrerSaisie)
    this.montrerSaisie()
  }

  /** Le champ du nom reste visible : dans la grille, et au-dessus du clavier
   *  virtuel quand il paraît (visualViewport). Le clavier couvre le bas de
   *  l'écran sans que la page change de taille : la grille gagne d'abord en
   *  bas la place qu'il prend (--clavier), pour qu'une carte de la dernière
   *  rangée puisse remonter au-dessus de lui. */
  private montrerSaisie = () => {
    const s = this.saisie
    if (!s) return
    const vv = window.visualViewport
    const couvert = vv ? Math.max(0, Math.round(window.innerHeight - (vv.offsetTop + vv.height))) : 0
    this.corps.style.setProperty('--clavier', `${couvert}px`)
    const r = s.input.getBoundingClientRect(), corps = this.corps.getBoundingClientRect(), marge = 12
    const bas = Math.min(corps.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight)
    if (r.bottom > bas - marge) this.corps.scrollTop += Math.min(r.bottom - (bas - marge), r.top - (corps.top + marge))
    else if (r.top < corps.top + marge) this.corps.scrollTop -= corps.top + marge - r.top
    // Récents défile de côté au téléphone
    const rangee = s.liste.el
    if (rangee.scrollWidth > rangee.clientWidth) {
      const rr = rangee.getBoundingClientRect(), rc = s.li.getBoundingClientRect()
      if (rc.left < rr.left) rangee.scrollLeft -= rr.left - rc.left
      else if (rc.right > rr.right) rangee.scrollLeft += rc.right - rr.right
    }
  }

  /** Le champ du nom se ferme : garder (Entrée, le focus parti ailleurs,
   *  l'écran qui se ferme) ou non (Échap) ; rendreFocus : le focus revient
   *  à la carte. Un nom vide n'est pas gardé (le message le dit). */
  private finirSaisie(garder: boolean, rendreFocus = false) {
    const s = this.saisie
    if (!s) return
    this.saisie = null
    window.visualViewport?.removeEventListener('resize', this.montrerSaisie)
    this.corps.style.removeProperty('--clavier')
    const texte = s.input.value
    s.input.remove()
    s.li.classList.remove('en-saisie')
    if (rendreFocus && this.ouvert && s.liste.cartes.get(s.cle) === s.li) this.focusCarte(s.liste, s.cle, false)
    if (garder) {
      const nom = s.dossier ? nomDeDossier(texte) : nomDeClasseur(texte)
      if (!nom) this.hote.message(s.dossier ? 'Un dossier a besoin d\'un nom.' : 'Un classeur a besoin d\'un nom.')
      else if (nom !== s.ancien) void this.donnerUnNom(s.cle, nom, s.ancien)
    }
    // Ce qui a changé pendant qu'on tapait
    if (this.ouvert) void this.appliquer()
  }

  /** Écrit le nouveau nom d'un classeur ou d'un dossier, avec « Annuler »
   *  (7 s). Un classeur : sa fiche, puis son identité dans sa base (pour
   *  qu'une adoption retrouve son nom ; sans attendre) ; celui de cet onglet,
   *  son bouton et le titre de l'onglet suivent (les autres onglets
   *  l'apprennent par le canal). Un dossier de classe renommé garde son
   *  étiquette accordée à son nom. siEncore : seulement si le nom n'a pas
   *  changé entre-temps (« Annuler »). */
  private async donnerUnNom(cle: string, nom: string, ancien: string, siEncore?: string) {
    const annuler = siEncore === undefined ? { libelle: ANNULER, faire: () => void this.donnerUnNom(cle, ancien, nom, nom) } : undefined
    try {
      if (cle.startsWith(DOSSIER)) {
        const id = cle.slice(DOSSIER.length)
        const d = await this.suivre(this.registre.modifierDossier(id, x => {
          if (siEncore !== undefined && x.nom !== siEncore) return
          const avant = etiquetteDuNom(x.nom)
          if (x.etiquette && avant && cleDe(x.etiquette) === cleDe(avant)) x.etiquette = etiquetteDuNom(nom) ?? x.etiquette
          x.nom = nom
        }))
        if (!d) { this.hote.message('Ce dossier n\'existe plus.'); return }
        this.dossiers.set(id, d)
        this.rendre(null)
        if (d.nom === nom) this.hote.message(siEncore === undefined ? 'Dossier renommé' : `Le dossier s'appelle de nouveau « ${nom} ».`, annuler)
        return
      }
      const f = await this.suivre(this.registre.modifierClasseur(cle, x => {
        if (siEncore !== undefined && x.nom !== siEncore) return
        x.nom = nom
      }))
      if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return }
      this.fiches.set(cle, f)
      this.rendre(new Set([cle]))
      if (f.nom !== nom) return
      void this.suivre(ecrireInfos(f.base, { id: f.id, nom: f.nom })).catch(() => { /* l'index le garde : c'est lui qui compte */ })
      if (this.hote.classeur?.id === f.id) { this.hote.classeurChange?.(f); this.majLigneOuvert() }
      this.hote.message(siEncore === undefined ? 'Classeur renommé' : `Le classeur s'appelle de nouveau « ${nom} ».`, annuler)
    } catch (e) {
      this.hote.message(`${cle.startsWith(DOSSIER) ? 'Le dossier' : 'Le classeur'} n'a pas pu être renommé : ${messageDe(e)}.`)
    }
  }

  // ---------- Le menu d'une carte ----------
  /** Ce que propose le menu d'un classeur, par blocs : « Ouvrir », puis les
   *  blocs des morceaux suivants (blocsDuMenu : renommer, les étiquettes…) */
  entreesDuMenu(f: FicheClasseur, m: HTMLElement) {
    const ici = this.hote.classeur?.id === f.id
    entreeMenu(m, 'Ouvrir', () => void this.ouvrirClasseur(f), { touche: 'Entrée', action: 'ouvrir-classeur', aide: ici ? 'Il est ouvert dans cet onglet' : undefined })
    const seances = libelleSeances(f)
    if (seances) entreeMenu(m, this.seancesOuvertes.has(f.id) ? 'Cacher les séances' : `Voir les séances (${seances})`, () => this.basculerSeances(f.id), { action: 'voir-seances' })
    for (const bloc of this.blocsDuMenu) { filetMenu(m); bloc(f, m) }
  }

  /** Ce que propose le menu d'un dossier : « Ouvrir », « Renommer… », sa
   *  couleur (les huit, la sienne cochée), « Dossier d'une classe » ; puis
   *  les blocs des morceaux suivants (blocsDuMenuDossier) */
  entreesDuMenuDossier(d: FicheDossier, m: HTMLElement) {
    entreeMenu(m, 'Ouvrir', () => this.allerA(d.id), { touche: 'Entrée', action: 'ouvrir-dossier' })
    filetMenu(m)
    entreeMenu(m, 'Renommer…', () => this.renommer(DOSSIER + d.id), { touche: 'F2', action: 'renommer-dossier' })
    filetMenu(m)
    titreMenu(m, 'Couleur')
    const rangee = Object.assign(document.createElement('div'), { className: 'menu-couleurs' })
    rangee.setAttribute('role', 'group'); rangee.setAttribute('aria-label', 'Couleur')
    const sienne = couleurDe(d.couleur).valeur
    for (const c of COULEURS) {
      const b = entreeMenu(rangee, c.nom, () => void this.changerCouleur(d.id, c.valeur), { coche: c.valeur === sienne, action: 'couleur' })
      b.dataset.couleur = c.valeur; b.title = c.nom
      b.style.setProperty('--c', c.valeur)
    }
    m.appendChild(rangee)
    const etiquette = etiquetteDuNom(d.nom) ?? d.nom
    entreeMenu(m, 'Dossier d\'une classe', () => void this.basculerClasse(d.id), {
      coche: !!d.etiquette, caseACocher: true, action: 'classe-dossier',
      aide: d.etiquette ? `Ses classeurs portent l'étiquette « ${d.etiquette} »` : `Ses classeurs porteront l'étiquette « ${etiquette} »`,
    })
    for (const bloc of this.blocsDuMenuDossier) { filetMenu(m); bloc(d, m) }
  }

  /** Le menu d'une carte (classeur ou dossier) : par son bouton ⋯ (sous
   *  lui), au clic droit ou au bouton du stylet (là où l'on a appuyé), à la
   *  touche Menu (sous le bouton ⋯, le focus dans la première entrée).
   *  Échap, un choix ou un appui ailleurs le ferment ; le focus revient à la
   *  carte. */
  private ouvrirMenuCarte(cle: string, o: { bouton?: HTMLElement; x?: number; y?: number; clavier?: boolean }) {
    const dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    const l = this.listes.find(x => x.focusId === cle && x.el.contains(document.activeElement)) ?? this.listes.find(x => x.cartes.has(cle))
    const c = l?.cartes.get(cle)
    if ((!f && !d) || !c) return
    this.finirSaisie(true)
    this.annulerClicNom()
    const m = this.menuEl
    m.replaceChildren()
    m.setAttribute('aria-label', f ? f.nom : `Dossier « ${d!.nom} »`)
    if (f) this.entreesDuMenu(f, m)
    else this.entreesDuMenuDossier(d!, m)
    const options = c.querySelector<HTMLElement>('.options-classeur')!
    const menu: Menu = { el: m, bouton: o.bouton, fermer: () => this.surMenuFerme(menu, cle, l!) }
    this.menuCarte = { id: cle, menu }
    ouvrirMenu(menu)
    if (o.bouton || o.x === undefined || o.y === undefined) placerMenu(m, options.getBoundingClientRect(), 'dessous')
    else placerMenu(m, new DOMRect(o.x, o.y, 0, 0), 'droite')
    if (o.clavier) allerAuxEntrees(m, 1, ENTREES)
  }

  /** Le menu d'une carte vient de se fermer : le focus qui y était revient
   *  à la carte ; ce que les autres onglets ont changé entre-temps se fait */
  private surMenuFerme(menu: Menu, id: string, l: Liste) {
    if (this.menuCarte?.menu !== menu) return
    this.menuCarte = null
    const a = document.activeElement
    const perdu = !a || a === document.body || this.menuEl.contains(a) || !!(a as HTMLElement).closest?.('.options-classeur')
    if (perdu && this.ouvert && l.cartes.has(id)) this.focusCarte(l, id, false)
    if (this.ouvert) void this.appliquer()
  }

  private basculerMenuBandeau() {
    if (this.menuBandeauOuvert) { fermerMenu(); return }
    const m = this.menuBandeau
    m.replaceChildren()
    for (const f of this.menuDuBandeau) f(m)
    const menu: Menu = { el: m, bouton: this.boutonBandeau, fermer: () => { if (this.menuBandeauOuvert === menu) { this.menuBandeauOuvert = null; if (this.ouvert) void this.appliquer() } } }
    this.menuBandeauOuvert = menu
    ouvrirMenu(menu)
    placerMenu(m, this.boutonBandeau.getBoundingClientRect(), 'dessous')
  }

  /** « Trier : … » : Modifiés récemment, Nom (A → Z) ; le choix est retenu
   *  sur l'appareil */
  private basculerMenuTri() {
    if (this.menuTriOuvert) { fermerMenu(); return }
    this.finirSaisie(true)
    const m = this.menuTriEl
    m.replaceChildren()
    for (const t of TRIS) {
      entreeMenu(m, t.nom, () => {
        if (this.tri === t.id) return
        this.tri = t.id
        ecrire(CLE_TRI, t.id)
        this.rendre(null)
      }, { coche: this.tri === t.id, action: 'tri-' + t.id })
    }
    const menu: Menu = { el: m, bouton: this.triBouton, fermer: () => { if (this.menuTriOuvert === menu) { this.menuTriOuvert = null; if (this.ouvert) void this.appliquer() } } }
    this.menuTriOuvert = menu
    ouvrirMenu(menu)
    placerMenu(m, this.triBouton.getBoundingClientRect(), 'dessous')
    if (focusAuClavier(this.triBouton)) allerAuxEntrees(m, 1, ENTREES)
  }

  // ---------- Les dossiers : couleur, dossier de classe, nouveau dossier ----------
  /** Un dossier est relu, changé, écrit (une transaction), puis l'écran se
   *  refait ; null : il n'existe plus */
  private async changerDossierFiche(id: string, f: (d: FicheDossier) => void): Promise<FicheDossier | null> {
    try {
      const d = await this.suivre(this.registre.modifierDossier(id, f))
      if (!d) { this.hote.message('Ce dossier n\'existe plus.'); return null }
      this.dossiers.set(id, d)
      this.rendre(null)
      return d
    } catch (e) {
      this.hote.message(`Le dossier n'a pas pu être changé : ${messageDe(e)}.`)
      return null
    }
  }

  private async changerCouleur(id: string, valeur: string, annulation = false) {
    const avant = this.dossiers.get(id)?.couleur ?? COULEUR_DEFAUT
    if (couleurDe(avant).valeur === valeur) return
    const d = await this.changerDossierFiche(id, x => { x.couleur = valeur })
    if (!d) return
    const nom = couleurDe(valeur).nom
    this.hote.message(`Couleur du dossier « ${d.nom} » : ${nom.toLowerCase()}`,
      annulation ? undefined : { libelle: ANNULER, faire: () => void this.changerCouleur(id, avant, true) })
  }

  /** « Dossier d'une classe » : ses classeurs portent son nom en étiquette
   *  (calculée : rien n'est écrit dans les classeurs), ou plus */
  private async basculerClasse(id: string, vers?: string | null) {
    const x0 = this.dossiers.get(id)
    if (!x0) return
    const avant = x0.etiquette ?? null
    const apres = vers !== undefined ? vers : avant ? null : etiquetteDuNom(x0.nom)
    const d = await this.changerDossierFiche(id, x => { if (apres) x.etiquette = apres; else delete x.etiquette })
    if (!d) return
    const annuler = vers === undefined ? { libelle: ANNULER, faire: () => void this.basculerClasse(id, avant) } : undefined
    this.hote.message(d.etiquette ? `« ${d.nom} » est un dossier de classe : ses classeurs portent l'étiquette « ${d.etiquette} ».` : `« ${d.nom} » n'est plus un dossier de classe.`, annuler)
  }

  /** Le conseil du rangement par classe ne revient plus (« Plus tard ») */
  private ecarterConseil() {
    this.conseilVu = true
    this.registre.ecrireReglage(REGLAGE_CONSEIL, 'vu').catch(() => { /* il reviendra à la prochaine ouverture */ })
    const avait = this.conseil.contains(document.activeElement)
    this.rendre(null)
    if (avait) {
      const l = this.recents.ordre.length ? this.recents : this.tous
      const cle = l.focusId ?? l.ordre[0]
      if (cle) this.focusCarte(l, cle)
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
  }

  /** « Nouveau dossier » : son nom (40 caractères, « 5e B » en exemple), sa
   *  couleur (Bleu), « Dossier d'une classe » (cochée d'office quand le nom
   *  ressemble à une classe ; son libellé suit le nom tapé). Il se crée dans
   *  le dossier affiché. classe : la case cochée d'avance (le conseil). */
  nouveauDossier(o: { classe?: boolean } = {}) {
    if (document.querySelector('dialog[open]') || this.depart) return
    this.finirSaisie(true)
    const parent = this.dossierAffiche !== null && this.dossiers.has(this.dossierAffiche) ? this.dossierAffiche : null
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau dialogue-dossier'
    d.innerHTML = `<form method="dialog"><h2>Nouveau dossier</h2><div class="corps">
      ${parent !== null ? '<p class="dans"></p>' : ''}
      <label class="champ"><span>Nom</span><input type="text" name="nom" maxlength="${LONGUEUR_NOM_DOSSIER}" placeholder="5e B" autocomplete="off" spellcheck="false"></label>
      <fieldset class="couleurs"><legend>Couleur</legend></fieldset>
      <label class="case case-classe"><input type="checkbox" name="classe"><span></span></label>
      <p class="erreur" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="submit" class="principal" data-a="creer">Créer</button>
      </div></div></form>`
    if (parent !== null) d.querySelector('.dans')!.textContent = `Dans : ${cheminLisible(parent, this.dossiers)}`
    const form = d.querySelector('form')!
    const champ = d.querySelector<HTMLInputElement>('input[name="nom"]')!
    const couleurs = d.querySelector('.couleurs')!
    for (const c of COULEURS) {
      const l = Object.assign(document.createElement('label'), { className: 'pastille-couleur', title: c.nom })
      const r = Object.assign(document.createElement('input'), { type: 'radio', name: 'couleur', value: c.valeur, checked: c.valeur === COULEUR_DEFAUT })
      r.setAttribute('aria-label', c.nom)
      const rond = Object.assign(document.createElement('span'), { className: 'rond', innerHTML: icone('coche') })
      rond.style.setProperty('--c', c.valeur)
      rond.setAttribute('aria-hidden', 'true')
      l.append(r, rond)
      couleurs.appendChild(l)
    }
    const caseClasse = d.querySelector<HTMLInputElement>('input[name="classe"]')!
    const libelleClasse = d.querySelector<HTMLElement>('.case-classe span')!
    // La case suit le nom tant qu'on ne l'a pas touchée
    let touchee = !!o.classe
    caseClasse.checked = !!o.classe
    const majClasse = () => {
      const e = etiquetteDuNom(champ.value)
      libelleClasse.textContent = e ? `Dossier d'une classe : ses classeurs portent l'étiquette « ${e} »` : 'Dossier d\'une classe : ses classeurs portent son nom en étiquette'
      if (!touchee) caseClasse.checked = ressembleAUneClasse(champ.value)
    }
    majClasse()
    champ.addEventListener('input', majClasse)
    caseClasse.addEventListener('change', () => { touchee = true })
    const erreur = d.querySelector<HTMLElement>('.erreur')!
    const annuler = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
    const creer = d.querySelector<HTMLButtonElement>('[data-a="creer"]')!
    let enCours = false
    const fermer = () => { if (enCours) return; if (d.open) d.close() }
    d.addEventListener('cancel', e => { if (enCours) e.preventDefault() })
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)
    annuler.addEventListener('click', fermer)
    const dire = (t: string | null) => { erreur.textContent = t ?? ''; erreur.hidden = !t }
    form.addEventListener('submit', async e => {
      e.preventDefault()
      if (enCours) return
      const nom = nomDeDossier(champ.value)
      if (!nom) { dire('Un dossier a besoin d\'un nom.'); champ.focus(); return }
      dire(null)
      const couleur = (form.elements.namedItem('couleur') as RadioNodeList | null)?.value || COULEUR_DEFAUT
      const fiche: FicheDossier = { id: idClasseur(), nom, parent, couleur, cree: Date.now() }
      const etiquette = caseClasse.checked ? etiquetteDuNom(nom) : null
      if (etiquette) fiche.etiquette = etiquette
      enCours = true
      creer.disabled = annuler.disabled = true
      try { await this.suivre(this.registre.ajouterDossier(fiche)) } catch (x) {
        enCours = false
        creer.disabled = annuler.disabled = false
        dire(`Le dossier n'a pas pu être créé : ${nomErreur(x) === 'QuotaExceededError' ? 'il n\'y a plus de place dans ce navigateur' : messageDe(x)}.`)
        return
      }
      enCours = false
      fermer()
      this.dossiers.set(fiche.id, fiche)
      // Il paraît là où l'on est, même si l'on regardait une classe
      if (this.filtre !== null) this.changerFiltre(null)
      if (this.dossierAffiche !== parent) this.changerDossier(parent)
      this.rendre(null)
      if (this.tous.cartes.has(DOSSIER + fiche.id)) this.focusCarte(this.tous, DOSSIER + fiche.id)
      this.hote.message(fiche.etiquette ? `Dossier « ${nom} » créé : ses classeurs porteront l'étiquette « ${fiche.etiquette} ».` : `Dossier « ${nom} » créé.`)
    })
    document.body.appendChild(d)
    d.showModal()
    champ.focus()
  }

  // ---------- Les étiquettes de classe d'un classeur ----------
  /** « Étiquettes de classe… » : ses étiquettes propres (chacune avec ×),
   *  celle qu'il hérite de son dossier (grisée, sans ×) ; « Ajouter une
   *  classe » (les étiquettes déjà là sont proposées ; Entrée ajoute), 3 au
   *  plus, de 20 caractères, un double ignoré. Chaque changement s'écrit
   *  aussitôt ; à la fermeture, un message avec « Annuler » les rend toutes
   *  comme elles étaient. */
  etiquettesDuClasseur(id: string) {
    const f0 = this.fiches.get(id)
    if (!f0 || document.querySelector('dialog[open]') || this.depart) return
    this.finirSaisie(true)
    const initiales = [...(f0.etiquettes ?? [])]
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau dialogue-etiquettes'
    d.setAttribute('aria-labelledby', 'etiquettes-titre')
    const idListe = 'etiquettes-connues'
    d.innerHTML = `<h2 id="etiquettes-titre">Étiquettes de classe</h2><div class="corps">
      <p class="pour"></p>
      <ul class="puces" aria-label="Ses étiquettes"></ul>
      <label class="champ"><span>Ajouter une classe</span><input type="text" name="etiquette" maxlength="${LONGUEUR_ETIQUETTE}" list="${idListe}" placeholder="5e B" autocomplete="off" spellcheck="false" enterkeyhint="done"></label>
      <datalist id="${idListe}"></datalist>
      <p class="note" aria-live="polite"></p>
      <div class="actions"><button type="button" class="principal" data-a="fermer">Fermer</button></div>
    </div>`
    d.querySelector('.pour')!.textContent = `« ${f0.nom} » : ${ETIQUETTES_MAX} étiquettes au plus, en plus de celle de son dossier.`
    const ul = d.querySelector<HTMLElement>('.puces')!
    const champ = d.querySelector<HTMLInputElement>('input[name="etiquette"]')!
    const liste = d.querySelector<HTMLElement>('datalist')!
    const note = d.querySelector<HTMLElement>('.note')!
    let ecriture: Promise<void> = Promise.resolve()
    const actuelle = () => this.fiches.get(id) ?? f0
    const dessiner = (focusApres?: 'champ' | number) => {
      const f = actuelle()
      const h = f.dossier === null ? null : etiquetteHeritee(f.dossier, this.dossiers)
      const propres = etiquettesEffectives({ ...f, dossier: null }, this.dossiers).map(e => e.nom)
      const items: HTMLElement[] = propres.map((nom, i) => {
        const li = Object.assign(document.createElement('li'), { className: 'puce' })
        li.append(Object.assign(document.createElement('span'), { className: 'puce-nom', textContent: nom }))
        const x = Object.assign(document.createElement('button'), { type: 'button', className: 'puce-retirer', innerHTML: icone('fermer') })
        x.setAttribute('aria-label', `Retirer l'étiquette « ${nom} »`); x.title = `Retirer « ${nom} »`
        x.dataset.rang = String(i)
        x.addEventListener('click', () => changer(propres.filter((_, j) => j !== i), i))
        li.appendChild(x)
        return li
      })
      if (h && !propres.some(p => cleDe(p) === cleDe(h.nom))) {
        const li = Object.assign(document.createElement('li'), { className: 'puce heritee' })
        li.append(Object.assign(document.createElement('span'), { className: 'puce-nom', textContent: h.nom }),
          Object.assign(document.createElement('small'), { textContent: `vient du dossier « ${h.dossier.nom} »` }))
        items.push(li)
      }
      if (!items.length) items.push(Object.assign(document.createElement('li'), { className: 'puce-aucune', textContent: 'Aucune étiquette' }))
      ul.replaceChildren(...items)
      const plein = propres.length >= ETIQUETTES_MAX
      champ.disabled = plein
      if (plein) note.textContent = `${ETIQUETTES_MAX} étiquettes au plus : retirez-en une pour en ajouter une autre.`
      // Les étiquettes déjà dans la bibliothèque, sauf les siennes
      const siennes = new Set(etiquettesEffectives(f, this.dossiers).map(e => cleDe(e.nom)))
      liste.replaceChildren(...etiquettesDe(this.visibles(), this.dossiers).filter(e => !siennes.has(cleDe(e.nom)))
        .map(e => Object.assign(document.createElement('option'), { value: e.nom })))
      if (focusApres === 'champ' && !plein) champ.focus()
      else if (typeof focusApres === 'number') {
        const x = ul.querySelectorAll<HTMLElement>('.puce-retirer')
        ;(x[Math.min(focusApres, x.length - 1)] ?? (plein ? d.querySelector<HTMLElement>('[data-a="fermer"]') : champ))?.focus()
      } else if (focusApres === 'champ') d.querySelector<HTMLElement>('[data-a="fermer"]')?.focus()
    }
    const changer = (etiquettes: string[], focusApres: 'champ' | number) => {
      ecriture = ecriture.then(async () => {
        try {
          const f = await this.suivre(this.registre.modifierClasseur(id, x => { x.etiquettes = etiquettes }))
          if (!f) { note.textContent = 'Ce classeur n\'est plus dans la bibliothèque.'; return }
          this.fiches.set(id, f)
          this.rendre(new Set([id]))
          if (d.open) dessiner(focusApres)
        } catch (e) { note.textContent = `L'étiquette n'a pas pu être enregistrée : ${messageDe(e)}.` }
      })
    }
    const ajouter = () => {
      const f = actuelle()
      const h = f.dossier === null ? null : etiquetteHeritee(f.dossier, this.dossiers)
      const propres = etiquettesEffectives({ ...f, dossier: null }, this.dossiers).map(e => e.nom)
      const r = ajouterEtiquette(propres, champ.value, h?.nom)
      if (r.refus === 'vide') return
      if (r.refus === 'double') { note.textContent = `« ${champ.value.trim()} » y est déjà.`; champ.select(); return }
      if (r.refus === 'plein') { note.textContent = `${ETIQUETTES_MAX} étiquettes au plus : retirez-en une pour en ajouter une autre.`; return }
      note.textContent = `Étiquette « ${r.ajoutee} » ajoutée.`
      champ.value = ''
      changer(r.etiquettes, 'champ')
    }
    champ.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.stopPropagation(); ajouter() }
    })
    // Choisie dans la liste proposée (certains navigateurs n'envoient pas Entrée)
    champ.addEventListener('change', () => { if (champ.value.trim() && [...liste.children].some(o => (o as HTMLOptionElement).value === champ.value)) ajouter() })
    const fermer = () => { if (d.open) d.close() }
    d.querySelector('[data-a="fermer"]')!.addEventListener('click', fermer)
    fermerSurLeFond(d, fermer)
    d.addEventListener('close', () => {
      d.remove()
      void ecriture.then(() => {
        const apres = this.fiches.get(id)?.etiquettes ?? []
        const l = this.listes.find(x => x.cartes.has(id) && x.focusId === id) ?? this.listes.find(x => x.cartes.has(id))
        if (l && this.ouvert) this.focusCarte(l, id, false)
        if (JSON.stringify(apres) === JSON.stringify(initiales)) return
        const texte = apres.length ? `Étiquettes de « ${f0.nom} » : ${apres.join(', ')}` : `« ${f0.nom} » n'a plus d'étiquette propre`
        this.hote.message(texte, { libelle: ANNULER, faire: () => changer(initiales, 'champ') })
      })
    })
    document.body.appendChild(d)
    dessiner()
    d.showModal()
    if (!champ.disabled) champ.focus()
    else d.querySelector<HTMLElement>('[data-a="fermer"]')?.focus()
  }

  // ---------- Déplacer vers… (lot 4 C7) ----------
  /** « Déplacer vers… » (le menu d'un classeur ou d'un dossier) : la
   *  fenêtre de l'arbre des dossiers (voir vers.ts) ; le choix fait
   *  deplacerVers. Échap ou « Annuler » : le focus revient à la carte. */
  deplacer(cle: string) {
    if (document.querySelector('dialog[open]') || this.depart || !this.ouvert) return
    this.finirSaisie(true)
    this.annulerClicNom()
    const dossier = cle.startsWith(DOSSIER)
    const f = dossier ? undefined : this.fiches.get(cle)
    const d = dossier ? this.dossiers.get(cle.slice(DOSSIER.length)) : undefined
    if (!f && !d) return
    const objet = f ? objetClasseur(f) : objetDossier(d!)
    const l = this.listes.find(x => x.focusId === cle && x.cartes.has(cle)) ?? this.listes.find(x => x.cartes.has(cle))
    ouvrirDeplacerVers({
      titre: f ? `Déplacer « ${f.nom} » vers…` : `Déplacer le dossier « ${d!.nom} » vers…`,
      destinations: destinations(objet, this.dossiers),
      fermee: () => { if (l && this.ouvert && l.cartes.has(cle)) this.focusCarte(l, cle, false) },
      choisir: id => void this.deplacerVers(cle, id),
    })
  }

  /** Range un classeur (ou un dossier, cle « d:… ») dans le dossier cible
   *  (null : la racine) : la fenêtre « Déplacer vers… », le lâcher d'un
   *  glisser, « Annuler ». La cible est relue d'abord : partie entre-temps
   *  (supprimée, à la corbeille, ailleurs), « Ce dossier n'existe plus. ».
   *  Un classeur : sa fiche seule change (modifierClasseur, son dossier) ;
   *  ses étiquettes propres restent, celles qu'il hérite suivent le dossier,
   *  et le message le dit. Un dossier : deplacerDossier, qui refuse dans sa
   *  transaction un dossier dans lui-même ou l'un de ses descendants (un
   *  autre onglet a pu en déplacer un). Le message, avec « Aller à « X » »
   *  et « Annuler » (7 s). siEncore : « Annuler » ne remet en place que s'il
   *  est encore là où on l'avait mis. Le focus reste sur la carte, ou, si
   *  elle quitte la grille, sur sa voisine. Vrai s'il a bougé. */
  async deplacerVers(cle: string, cible: string | null, o: { siEncore?: string | null } = {}): Promise<boolean> {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    const annulation = o.siEncore !== undefined
    // La place de la carte, pour y remettre le focus ensuite
    const actif = document.activeElement
    const l0 = actif instanceof HTMLElement ? this.listes.find(x => x.el.contains(actif)) : undefined
    const rang = l0 ? l0.ordre.indexOf(cle) : -1
    try {
      this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d]))
    } catch (e) { this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être déplacé : ${messageDe(e)}.`); return false }
    const arrivee = cible === null ? null : this.dossiers.get(cible)
    if (cible !== null && (!arrivee || !dossierVisible(arrivee, this.dossiers))) {
      this.hote.message(DOSSIER_PARTI)
      this.rendre(null)
      return false
    }
    const vers = arrivee ? arrivee.nom : null
    let nom: string, avant: string | null, etiquettesAvant: string[], etiquettesApres: string[]
    if (!dossier) {
      const f0 = this.fiches.get(id)
      if (!f0) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
      avant = ouIlEst(objetClasseur(f0), this.dossiers)
      if (avant === cible) return false
      etiquettesAvant = etiquettesEffectives(f0, this.dossiers).map(e => e.nom)
      let ailleurs = false
      let f: FicheClasseur | undefined
      try {
        f = await this.suivre(this.registre.modifierClasseur(id, x => {
          if (annulation && ouIlEst(objetClasseur(x), this.dossiers) !== o.siEncore) { ailleurs = true; return }
          x.dossier = cible
        }))
      } catch (e) { this.hote.message(`Le classeur n'a pas pu être déplacé : ${messageDe(e)}.`); return false }
      if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
      this.fiches.set(id, f)
      if (ailleurs) { this.rendre(null); this.hote.message(`« ${f.nom} » a changé de place depuis : il reste où il est.`); return false }
      nom = f.nom
      etiquettesApres = etiquettesEffectives(f, this.dossiers).map(e => e.nom)
    } else {
      const d0 = this.dossiers.get(id)
      if (!d0) { this.hote.message(DOSSIER_PARTI); this.rendre(null); return false }
      avant = ouIlEst(objetDossier(d0), this.dossiers)
      if (avant === cible) return false
      if (annulation && avant !== o.siEncore) { this.hote.message(`Le dossier « ${d0.nom} » a changé de place depuis : il reste où il est.`); return false }
      const h0 = etiquetteHeritee(id, this.dossiers)
      etiquettesAvant = h0 ? [h0.nom] : []
      try {
        await this.suivre(this.registre.deplacerDossier(id, cible))
      } catch (e) {
        this.hote.message(e instanceof ErreurRegistre && e.raison === 'cycle' ? REFUS_CYCLE
          : e instanceof ErreurRegistre ? e.message : `Le dossier n'a pas pu être déplacé : ${messageDe(e)}.`)
        try { this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d])) } catch { /* l'écran se relira */ }
        this.rendre(null)
        return false
      }
      // Tous relus : un autre onglet a pu en ranger d'autres
      try { this.dossiers = new Map((await this.registre.dossiers()).map(d => [d.id, d])) } catch { this.dossiers.set(id, { ...d0, parent: cible }) }
      nom = d0.nom
      const h1 = etiquetteHeritee(id, this.dossiers)
      etiquettesApres = h1 ? [h1.nom] : []
    }
    this.rendre(null)
    // Le focus : sur la carte si elle est encore là, sinon sur sa voisine
    const a = document.activeElement
    if (l0 && this.ouvert && (!a || a === document.body || !this.el.contains(a) || l0.el.contains(a))) {
      const suivante = l0.cartes.has(cle) ? cle : l0.ordre[Math.min(Math.max(rang, 0), l0.ordre.length - 1)]
      if (suivante) this.focusCarte(l0, suivante, false)
      else if (!this.videDossier.hidden) this.videDossier.querySelector<HTMLElement>('button')?.focus()
    }
    const genre = dossier ? 'dossier' : 'classeur'
    if (annulation) { this.hote.message(texteRetour({ genre, nom, vers })); return true }
    const ancien = avant
    this.hote.message(texteDeplacement({ genre, nom, vers, avant: etiquettesAvant, apres: etiquettesApres }), [
      { libelle: texteAllerA(vers), faire: () => this.allerVers(cible, cle) },
      { libelle: ANNULER, faire: () => void this.deplacerVers(cle, ancien, { siEncore: cible }) },
    ])
    return true
  }

  /** « Aller à « 5e B » » : le dossier où l'on vient de ranger la carte, le
   *  focus sur elle */
  private allerVers(dossierId: string | null, cle: string) {
    if (!this.ouvert || this.depart) return
    if (dossierId !== null && !this.dossiers.has(dossierId)) { this.hote.message(DOSSIER_PARTI); return }
    this.allerA(dossierId)
    if (this.tous.cartes.has(cle)) this.focusCarte(this.tous, cle)
  }

  // ---------- Dupliquer le classeur (lot 4 C7) ----------
  /** Une copie complète du classeur, avec toute son histoire (la revue et le
   *  replay y marchent), faite par l'écrivain hors du fil principal (voir
   *  ecrivain-pur.preparerCopie) : son registre des publications est vidé,
   *  et elle est marquée comme copie (publier depuis la copie une séance de
   *  l'original fait un nouveau lien, sans toucher à celui de l'autre
   *  classe : sans la marque, Publier retrouverait la séance de l'original
   *  sur le Drive par sa clé). La fiche : « Symétrie
   *  (copie) » (un nom libre), le même dossier, les mêmes étiquettes propres,
   *  créée maintenant, jamais ouverte, ses pages, l'aperçu de l'original ;
   *  ni clé, ni Drive. Par Registre.creerClasseur : si la copie échoue (plus
   *  de place), rien ne reste. Le classeur de cet onglet : ce qui attend
   *  s'écrit d'abord. « Copie du classeur… » au-delà de 300 ms. */
  async dupliquer(id: string): Promise<FicheClasseur | null> {
    const f = this.fiches.get(id)
    if (!f || this.depart || this.copieEnCours) return null
    this.copieEnCours = true
    this.finirSaisie(true)
    const patience = window.setTimeout(() => this.hote.message('Copie du classeur…'), PATIENCE_COPIE)
    try {
      if (this.hote.classeur?.id === f.id && this.hote.avantDeDupliquer && !await this.hote.avantDeDupliquer()) {
        clearTimeout(patience)
        this.hote.message(`${PAS_DUPLIQUE} : il n'est pas entièrement enregistré dans ce navigateur. Enregistrez-le d'abord dans un fichier.`)
        return null
      }
      const nouveau = idClasseur(), t = Date.now()
      const nom = nomLibre(f.nom, [...this.fiches.values()].map(x => x.nom))
      const fiche: FicheClasseur = { id: nouveau, base: baseDe(nouveau), nom, dossier: f.dossier, etiquettes: [...(f.etiquettes ?? [])], cree: t, modifie: t, ouvert: 0, pages: f.pages }
      let copie: CopieFaite | null = null
      let faite = await this.suivre(this.registre.creerClasseur(fiche, async base => {
        copie = await ecrivain.copierClasseur(f.base, base, { id: nouveau, nom })
        return { creee: true }
      }))
      const c = copie as CopieFaite | null
      if (c) faite = (await this.suivre(this.registre.modifierClasseur(nouveau, x => { x.pages = c.pages; x.vecteur = c.vecteur })).catch(() => undefined)) ?? faite
      // L'aperçu de l'original (la même première page)
      const image = await this.registre.apercu(f.id).catch(() => undefined)
      if (image && await this.registre.ecrireApercu(nouveau, image)) this.poserImage(nouveau, image)
      clearTimeout(patience)
      this.fiches.set(nouveau, faite)
      this.rendre(null)
      const l = this.listes.find(x => x.cartes.has(nouveau) && x.el.contains(document.activeElement)) ?? (this.tous.cartes.has(nouveau) ? this.tous : null)
      if (l && this.ouvert && !document.querySelector('dialog[open]')) this.focusCarte(l, nouveau)
      const texte = c?.publications ? `Classeur dupliqué : « ${nom} ». ${TEXTE_PUBLIEES_COPIE}` : `Classeur dupliqué : « ${nom} ».`
      this.hote.message(texte, { libelle: 'Ouvrir', faire: () => { const x = this.fiches.get(nouveau); if (x) void this.ouvrirClasseur(x) } })
      return faite
    } catch (e) {
      clearTimeout(patience)
      // La raison d'une ErreurEcrivain ou d'une ErreurBase, lue à sa forme
      const r = (e as { raison?: unknown } | null)?.raison
      const raison = typeof r === 'string' ? r : nomErreur(e) === 'QuotaExceededError' ? 'place' : 'autre'
      this.hote.message(raison === 'place' ? PLUS_DE_PLACE_COPIE
        : raison === 'abimee' ? `${PAS_DUPLIQUE} : il semble abîmé dans ce navigateur. Ouvrez-le, et enregistrez-le dans un fichier.`
        : raison === 'absente' ? `${PAS_DUPLIQUE} : sa base n'est plus dans ce navigateur.`
        : `${PAS_DUPLIQUE} : ${messageDe(e)}.`)
      return null
    } finally { this.copieEnCours = false }
  }

  // ---------- La corbeille de la bibliothèque (lot 4 C8) ----------
  /** Le bouton « Corbeille (3) » (grisé « Corbeille » quand elle est vide),
   *  le × (le classeur de l'onglet dans la corbeille : on ne peut plus y
   *  revenir sans le remettre), la vue si elle est montrée */
  private majCorbeille() {
    const n = elementsDeLaCorbeille([...this.fiches.values()], this.dossiers).length
    const l = libelleCorbeille(n), b = this.boutonCorbeille
    const long = b.querySelector('.libelle-long')!, court = b.querySelector('.libelle-court')!
    if (long.textContent !== l.texte) long.textContent = l.texte
    const c = n ? String(n) : ''
    if (court.textContent !== c) court.textContent = c
    if (b.getAttribute('aria-label') !== l.nom) b.setAttribute('aria-label', l.nom)
    const gris = !n && !this.vue.ouverte
    if (b.disabled !== gris) { b.disabled = gris; b.setAttribute('aria-disabled', String(gris)) }
    const sansCroix = !this.peutFermer
    if (this.fermerBouton.hidden !== sansCroix) this.fermerBouton.hidden = sansCroix
    if (this.vue.ouverte) this.vue.maj()
    if (this.vueSeances.ouverte) this.vueSeances.maj()
  }

  private basculerCorbeille() {
    if (this.vue.ouverte) this.quitterCorbeille()
    else this.ouvrirCorbeille()
  }

  /** La vue de la corbeille, à la place des cartes */
  ouvrirCorbeille() {
    if (!this.ouvert || this.depart || this.vue.ouverte) return
    if (this.vueSeances.ouverte) this.quitterVueSeances(false)
    this.annulerGlisser()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    this.el.classList.add('en-corbeille')
    this.boutonCorbeille.setAttribute('aria-pressed', 'true')
    this.vue.ouvrir()
    this.majCorbeille()
  }

  /** Retour aux cartes (« Bibliothèque », Échap, le bouton « Corbeille ») ;
   *  le focus revient au bouton « Corbeille » */
  quitterCorbeille(rendreFocus = true) {
    if (!this.vue.ouverte) return
    const avait = this.vue.el.contains(document.activeElement)
    this.vue.fermer()
    this.el.classList.remove('en-corbeille')
    this.boutonCorbeille.setAttribute('aria-pressed', 'false')
    this.rendre(null)
    if (this.ouvert && (rendreFocus || avait)) {
      if (!this.boutonCorbeille.disabled) this.boutonCorbeille.focus()
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
  }

  // ---------- La vue « Séances » (lot 8, idée B) ----------
  private basculerVueSeances() {
    if (this.vueSeances.ouverte) this.quitterVueSeances()
    else this.ouvrirVueSeances()
  }

  /** Toutes les séances, à la place des cartes */
  ouvrirVueSeances() {
    if (!this.ouvert || this.depart || this.vueSeances.ouverte) return
    if (this.vue.ouverte) this.quitterCorbeille(false)
    this.annulerGlisser()
    if (this.menuCarte || this.menuBandeauOuvert || this.menuTriOuvert) fermerMenu()
    this.finirSaisie(true)
    this.annulerClicNom()
    this.el.classList.add('en-seances')
    this.boutonSeances.setAttribute('aria-pressed', 'true')
    this.vueSeances.ouvrir()
  }

  /** Retour aux cartes (« Bibliothèque », Échap, le bouton « Séances ») */
  quitterVueSeances(rendreFocus = true) {
    if (!this.vueSeances.ouverte) return
    const avait = this.vueSeances.el.contains(document.activeElement)
    this.vueSeances.fermer()
    this.el.classList.remove('en-seances')
    this.boutonSeances.setAttribute('aria-pressed', 'false')
    this.rendre(null)
    if (this.ouvert && (rendreFocus || avait)) this.boutonSeances.focus()
  }

  /** « Supprimer » (le menu d'une carte, Suppr) : le classeur ou le dossier
   *  va dans la corbeille de la bibliothèque, sans question ; rien n'est
   *  effacé. Le message, avec « Annuler » (7 s), qui le rend tel quel. Le
   *  classeur de cet onglet (ou son dossier) : la bibliothèque reste
   *  ouverte, sans × (le Tableau garde sa base : « Annuler » le rend) ; au
   *  rechargement, la bibliothèque seule dit qu'il est dans la corbeille. */
  async supprimer(cle: string): Promise<boolean> {
    if (this.depart || !this.ouvert) return false
    this.finirSaisie(true)
    this.annulerClicNom()
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    const actif = document.activeElement
    const l0 = actif instanceof HTMLElement ? this.listes.find(x => x.el.contains(actif)) : undefined
    const rang = l0 ? l0.ordre.indexOf(cle) : -1
    const t = Date.now()
    let texte: string
    try {
      if (!dossier) {
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.effacement == null) x.corbeille = { t } }))
        if (!f) { this.hote.message('Ce classeur n\'est plus dans la bibliothèque.'); return false }
        this.fiches.set(id, f)
        texte = texteMisALaCorbeille({ genre: 'classeur', nom: f.nom })
      } else {
        const d0 = this.dossiers.get(id)
        if (!d0) { this.hote.message(DOSSIER_PARTI); return false }
        const contenu = compter(id, [...this.fiches.values()], this.dossiers)
        const d = await this.suivre(this.registre.modifierDossier(id, x => { x.corbeille = { t } }))
        if (!d) { this.hote.message(DOSSIER_PARTI); return false }
        this.dossiers.set(id, d)
        texte = texteMisALaCorbeille({ genre: 'dossier', nom: d.nom, contenu })
      }
    } catch (e) {
      this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être supprimé : ${messageDe(e)}.`)
      return false
    }
    this.rendre(null)
    // Le focus : sur la carte voisine
    const a = document.activeElement
    if (l0 && this.ouvert && !this.vue.ouverte && (!a || a === document.body || !this.el.contains(a) || l0.el.contains(a))) {
      const suivante = l0.cartes.has(cle) ? cle : l0.ordre[Math.min(Math.max(rang, 0), l0.ordre.length - 1)]
      if (suivante) this.focusCarte(l0, suivante, false)
      else if (!this.videDossier.hidden) this.videDossier.querySelector<HTMLElement>('button')?.focus()
      else this.el.querySelector<HTMLElement>('.biblio-nouveau')?.focus()
    }
    this.hote.message(texte, { libelle: ANNULER, faire: () => void this.annulerSuppression(cle, t), cle: CLE_MESSAGE + cle })
    return true
  }

  /** « Annuler » après Supprimer : il revient tel quel, s'il est encore dans
   *  la corbeille depuis ce moment-là */
  private async annulerSuppression(cle: string, t: number) {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        let la = false
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.corbeille?.t === t && x.effacement == null) { delete x.corbeille; la = true } }))
        if (!f || !la) { this.hote.message('Ce classeur n\'est plus dans la corbeille.'); return }
        this.fiches.set(id, f)
        this.rendre(null)
        this.hote.message(`« ${f.nom} » est de retour.`)
      } else {
        let la = false
        const d = await this.suivre(this.registre.modifierDossier(id, x => { if (x.corbeille?.t === t) { delete x.corbeille; la = true } }))
        if (!d || !la) { this.hote.message('Ce dossier n\'est plus dans la corbeille.'); return }
        this.dossiers.set(id, d)
        this.rendre(null)
        this.hote.message(`Dossier « ${d.nom} » de retour.`)
      }
    } catch (e) { this.hote.message(`Rien n'a pu être rendu : ${messageDe(e)}.`) }
  }

  /** « Remettre » : le classeur ou le dossier revient dans son dossier, ou à
   *  la racine si celui-ci ne se montre plus (supprimé, ou dans la
   *  corbeille) ; le message le dit, avec « Annuler ». On reste dans la vue
   *  de la corbeille (le focus passe à la carte suivante). */
  private async remettre(cle: string) {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        const r = await this.suivre(this.registre.remettreClasseur(id))
        if (!r) { this.hote.message('Ce classeur n\'est plus dans la corbeille.'); await this.charger(); return }
        this.fiches.set(id, r.fiche)
        const vers = r.ou.dossier === null ? null : this.dossiers.get(r.ou.dossier)?.nom ?? null
        this.rendre(null)
        this.hote.message(texteRemis({ genre: 'classeur', nom: r.fiche.nom, vers, raison: r.ou.raison }), { libelle: ANNULER, faire: () => void this.annulerRemise(cle, r.avant.t, r.avant.dossier), cle: CLE_MESSAGE + cle })
      } else {
        const r = await this.suivre(this.registre.remettreDossier(id))
        if (!r) { this.hote.message('Ce dossier n\'est plus dans la corbeille.'); await this.charger(); return }
        this.dossiers.set(id, r.dossier)
        const vers = r.ou.dossier === null ? null : this.dossiers.get(r.ou.dossier)?.nom ?? null
        this.rendre(null)
        this.hote.message(texteRemis({ genre: 'dossier', nom: r.dossier.nom, vers, raison: r.ou.raison }), { libelle: ANNULER, faire: () => void this.annulerRemise(cle, r.avant.t, r.avant.parent), cle: CLE_MESSAGE + cle })
      }
    } catch (e) {
      this.hote.message(`${dossier ? 'Le dossier' : 'Le classeur'} n'a pas pu être remis : ${messageDe(e)}.`)
    }
  }

  /** « Annuler » après Remettre : de nouveau dans la corbeille, là où il
   *  était (s'il n'y est pas déjà retourné, et sans jamais faire de cycle) */
  private async annulerRemise(cle: string, t: number, ou: string | null) {
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    try {
      if (!dossier) {
        let fait = false
        const f = await this.suivre(this.registre.modifierClasseur(id, x => { if (x.corbeille || x.effacement != null) return; x.corbeille = { t }; x.dossier = ou; fait = true }))
        if (!f || !fait) return
        this.fiches.set(id, f)
        this.rendre(null)
        this.hote.message(`« ${f.nom} » est de nouveau dans la corbeille.`)
      } else {
        let fait = false
        const d = await this.suivre(this.registre.modifierDossier(id, x => {
          if (x.corbeille) return
          x.corbeille = { t }
          if (ou === null || (ou !== id && this.dossiers.has(ou) && !parents(ou, this.dossiers).some(p => p.id === id))) x.parent = ou
          fait = true
        }))
        if (!d || !fait) return
        this.dossiers.set(id, d)
        this.rendre(null)
        this.hote.message(`Dossier « ${d.nom} » de nouveau dans la corbeille.`)
      }
    } catch (e) { this.hote.message(`Rien n'a pu être défait : ${messageDe(e)}.`) }
  }

  /** La date du dernier enregistrement de ce classeur dans un fichier (null : jamais) */
  private dernierEnregistrement(f: FicheClasseur): number | null {
    try { return lireDernierEnregistrement(localStorage.getItem(cleDernierEnregistrement(f))) } catch { return null }
  }

  /** « Enregistrer d'abord » : le classeur de l'onglet par sa sauvegarde (ce
   *  qui attend encore s'y écrit), un autre depuis sa base */
  private enregistrerAvant(f: FicheClasseur): Promise<boolean> {
    const ui = this.hote.ui
    if (this.hote.classeur?.id === f.id && ui) return ui.sauvegarde.enregistrer().catch(() => false)
    return enregistrerDepuisLaBase(f, t => this.hote.message(t))
  }

  /** « Supprimer définitivement » (une carte de la corbeille) : une question,
   *  puis l'effacement (voir effacer). Un classeur jamais enregistré dans un
   *  fichier ni copié sur le Drive : la question le dit, et propose
   *  « Enregistrer d'abord ». Un dossier : tous ses classeurs et tous ses
   *  sous-dossiers. */
  private async supprimerDefinitivement(cle: string) {
    if (this.effacementEnCours || this.depart) return
    const dossier = cle.startsWith(DOSSIER), id = dossier ? cle.slice(DOSSIER.length) : cle
    if (!dossier) {
      const f = this.fiches.get(id)
      if (!f) return
      const sauvegardes = sauvegardesDe(f, this.dernierEnregistrement(f))
      const jamais = !sauvegardes.fichier && !sauvegardes.drive
      const oui = await this.demanderEffacement({
        titre: titreDefinitifClasseur(f.nom), bouton: 'Supprimer définitivement',
        textes: [texteDefinitifClasseur(f.pages), texteCeQuiReste(sauvegardes)],
        ...(jamais ? { enregistrer: () => this.enregistrerAvant(f), apres: texteCeQuiReste({ fichier: true, drive: false }) } : {}),
      })
      if (!oui) return
      const x = this.fiches.get(id)
      if (!x) return
      await this.effacer([x], [], { genre: 'classeur', nom: x.nom })
      return
    }
    const d = this.dossiers.get(id)
    if (!d) return
    const fiches = [...this.fiches.values()]
    const c = contenuDuDossier(id, fiches, this.dossiers)
    const jamais = c.classeurs.filter(f => jamaisEnregistre(f, this.dernierEnregistrement(f))).length
    const oui = await this.demanderEffacement({
      titre: titreDefinitifDossier(d.nom), bouton: 'Supprimer définitivement',
      textes: [texteDefinitifDossier({ classeurs: c.classeurs.length, pages: pagesDe(c.classeurs), dossiers: c.dossiers.length }), texteJamais(jamais)],
    })
    if (!oui) return
    // Relu : un autre onglet a pu changer quelque chose pendant la question
    const c2 = contenuDuDossier(id, [...this.fiches.values()], this.dossiers)
    await this.effacer(c2.classeurs, [...c2.dossiers, d], { genre: 'dossier', nom: d.nom })
  }

  /** « Vider la corbeille » : une question, puis tout ce qu'elle contient
   *  est effacé (les classeurs des dossiers aussi) */
  private async viderLaCorbeille() {
    if (this.effacementEnCours || this.depart) return
    const c = contenuDeLaCorbeille([...this.fiches.values()], this.dossiers)
    if (!c.classeurs.length && !c.dossiers.length) return
    const jamais = c.classeurs.filter(f => jamaisEnregistre(f, this.dernierEnregistrement(f))).length
    const oui = await this.demanderEffacement({
      titre: TITRE_VIDER, bouton: 'Vider la corbeille',
      textes: [texteViderBibliotheque({ classeurs: c.classeurs.length, pages: pagesDe(c.classeurs), dossiers: c.dossiers.length }), texteJamais(jamais)],
    })
    if (!oui) return
    const c2 = contenuDeLaCorbeille([...this.fiches.values()], this.dossiers)
    await this.effacer(c2.classeurs, c2.dossiers, { vider: true })
  }

  /** Efface pour de bon ces classeurs (voir effacer.ts : leurs fiches
   *  disparaissent, les onglets ouverts sur eux cessent d'écrire, leurs
   *  bases s'effacent), puis ces dossiers (le plus profond d'abord). Le
   *  classeur de cet onglet en fait partie : l'onglet passe sans classeur. */
  private async effacer(classeurs: FicheClasseur[], dossiers: FicheDossier[], quoi: { genre: 'classeur' | 'dossier'; nom: string } | { vider: true }) {
    if (this.effacementEnCours) return
    this.effacementEnCours = true
    const patience = window.setTimeout(() => this.hote.message('Effacement…'), PATIENCE_EFFACEMENT)
    try {
      const ici = this.hote.classeur
      const r = await effacerLesClasseurs(this.registre, classeurs, {
        ici: ici && classeurs.some(f => f.id === ici.id) ? { id: ici.id, couper: () => this.classeurEffaceIci() } : null,
        vecteurDe: base => ecrivain.vecteurDeLaBase(base, { travailleurSeul: true }).then(x => x.vecteur),
        // Une base bloquée par un onglet, enfin effacée
        fini: () => { if (this.ouvert) { void this.charger(); void this.majPlace() } },
      })
      let dossiersPartis = 0
      for (const d of dossiers) {
        try { await this.suivre(this.registre.supprimerDossier(d.id)); dossiersPartis++ } catch { /* il reste, vide */ }
      }
      clearTimeout(patience)
      // Les « Annuler » de ce qui vient d'être effacé n'ont plus d'objet
      for (const f of classeurs) this.hote.oublierMessage?.(CLE_MESSAGE + f.id)
      for (const d of dossiers) this.hote.oublierMessage?.(CLE_MESSAGE + DOSSIER + d.id)
      await this.charger()
      // Ce qu'un onglet tient encore ouvert part à sa fermeture ; une erreur du
      // navigateur, au prochain démarrage (la fiche reste cachée d'ici là)
      const fin = [r.bloques.length ? BLOQUE : '', r.echecs.length ? PAS_EFFACE : ''].filter(Boolean).join(' ')
      let texte: string
      if ('vider' in quoi) texte = [texteVidee({ classeurs: r.effaces.length + r.bloques.length, dossiers: dossiersPartis }), fin].filter(Boolean).join(' ')
      else if (quoi.genre === 'dossier') texte = [texteEfface(quoi), fin].filter(Boolean).join(' ')
      else texte = r.effaces.length || !fin ? texteEfface(quoi) : fin
      this.hote.message(texte)
      void this.majPlace()
    } catch (e) {
      clearTimeout(patience)
      this.hote.message(`L'effacement n'a pas pu se faire : ${messageDe(e)}.`)
    } finally { this.effacementEnCours = false }
  }

  /** Le classeur de cet onglet vient d'être effacé : l'onglet passe sans
   *  classeur, la bibliothèque reste ouverte, sans × */
  private classeurEffaceIci() {
    this.hote.classeurEfface?.()
    this.hote.classeur = null
    this.hote.surveillance = null
    this.fermerBouton.hidden = true
    this.majLigneOuvert()
  }

  /** La question avant d'effacer, dans une fenêtre de l'outil (pas
   *  confirm()) : « Annuler » a le focus ; Échap ou un clic à côté la
   *  ferment sans rien faire. enregistrer : « Enregistrer d'abord » (le choix
   *  du fichier s'ouvre dans le clic) ; une fois fait, le paragraphe qui
   *  disait « il n'en restera rien » dit apres. Vrai : on a confirmé. */
  private demanderEffacement(o: { titre: string; textes: string[]; bouton: string; enregistrer?: () => Promise<boolean>; apres?: string }): Promise<boolean> {
    return new Promise(ok => {
      const avant = document.activeElement as HTMLElement | null
      const d = document.createElement('dialog')
      d.className = 'dialogue dialogue-corbeille dialogue-effacer'
      d.setAttribute('aria-labelledby', 'effacer-titre')
      d.innerHTML = `<h2 id="effacer-titre"></h2><div class="corps"><div class="textes"></div><div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        ${o.enregistrer ? '<button type="button" class="secondaire" data-a="enregistrer">Enregistrer d\'abord</button>' : ''}
        <button type="button" class="principal danger-plein" data-a="oui"></button></div></div>`
      d.querySelector('h2')!.textContent = o.titre
      const textes = d.querySelector('.textes')!
      const ps = o.textes.filter(Boolean).map(t => Object.assign(document.createElement('p'), { textContent: t }))
      textes.append(...ps)
      const oui = d.querySelector<HTMLButtonElement>('[data-a="oui"]')!, non = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
      oui.textContent = o.bouton
      let reponse = false
      d.addEventListener('close', () => {
        d.remove()
        if (avant?.isConnected && this.ouvert) avant.focus({ preventScroll: true })
        ok(reponse)
      })
      fermerSurLeFond(d, () => d.close())
      non.addEventListener('click', () => d.close())
      oui.addEventListener('click', () => { reponse = true; d.close() })
      const enr = d.querySelector<HTMLButtonElement>('[data-a="enregistrer"]')
      if (enr && o.enregistrer) {
        const faire = o.enregistrer
        enr.addEventListener('click', async () => {
          enr.disabled = true
          const fait = await faire().catch(() => false)
          if (!d.open) return
          if (fait) {
            enr.textContent = 'Enregistré ✓'
            const p = ps[ps.length - 1]
            if (p && o.apres) p.textContent = o.apres
          } else enr.disabled = false
        })
      }
      document.body.appendChild(d)
      d.showModal()
      non.focus()
    })
  }

  // ---------- Les classeurs retrouvés, la place (lot 4 C8) ----------
  /** Une fois par chargement de la page : les bases de classeur sans fiche
   *  sont examinées, et celles qui ne sont pas vides adoptées (voir
   *  adoption.ts), après le ménage de la reprise (qui a pu en libérer une) */
  private async chercherLesOrphelines() {
    if (this.adoptionFaite) return
    this.adoptionFaite = true
    await this.registre.menage.catch(() => {})
    const r = await adopterLesOrphelines(this.registre, base => ecrivain.examinerBase(base))
    if (!r.adoptees.length) return
    await this.charger()
    this.hote.message(texteRetrouves(r.adoptees.map(f => f.nom)))
  }

  /** « Ce navigateur garde 120 Mo pour ce site. » (navigator.storage.estimate :
   *  l'origine est commune à tous les outils du site), ou l'alerte au-delà de
   *  80 % ; rien si le navigateur ne le dit pas. Rien ne s'efface tout seul. */
  private async majPlace() {
    let e: { usage?: number; quota?: number } | null = null
    try { e = (await navigator.storage?.estimate?.()) ?? null } catch { e = null }
    const t = textePlace(e)
    this.placeEl.hidden = !t
    if (!t) return
    if (this.placeEl.textContent !== t.texte) this.placeEl.textContent = t.texte
    this.placeEl.classList.toggle('alerte', t.alerte)
    if (t.alerte) this.placeEl.setAttribute('role', 'alert'); else this.placeEl.removeAttribute('role')
  }

  // ---------- Les aperçus (lot 4 C7) ----------
  /** L'aperçu d'un classeur en adresse objet (undefined : plus d'aperçu) ;
   *  l'ancienne adresse est révoquée */
  private poserImage(id: string, blob: Blob | undefined) {
    const x = this.images.get(id)
    if (x && x.blob === blob) return
    if (x) URL.revokeObjectURL(x.url)
    if (!blob) { this.images.delete(id); return }
    this.images.set(id, { blob, url: URL.createObjectURL(blob) })
  }

  /** L'aperçu d'un classeur, relu dans l'index ; gardé tel quel s'il n'a pas
   *  changé (les mêmes octets : l'image ne clignote pas) */
  private async relireImage(id: string) {
    let b: Blob | undefined
    try { b = await this.registre.apercu(id) } catch { return }
    const x = this.images.get(id)
    if (x && b && x.blob.size === b.size && await memesOctets(x.blob, b)) return
    if (!x && !b) return
    this.poserImage(id, b)
  }

  /** L'aperçu du classeur de cet onglet vient d'être refait (voir
   *  apercu-classeur.ts) : sa carte le montre */
  async apercuChange(id: string) {
    let b: Blob | undefined
    try { b = await this.registre.apercu(id) } catch { return }
    this.poserImage(id, b)
    if (this.ouvert && !this.occupe) this.rendre(new Set([id]))
    else this.aAppliquer.classeurs.add(id)
  }

  /** La bibliothèque se ferme : les adresses objet des aperçus sont
   *  révoquées, les cartes les oublient */
  private oublierImages() {
    for (const x of this.images.values()) URL.revokeObjectURL(x.url)
    this.images.clear()
    for (const l of this.listes) {
      for (const c of l.cartes.values()) {
        const img = c.querySelector<HTMLImageElement>('.apercu-image')
        if (!img) continue
        img.removeAttribute('src'); img.hidden = true
        this.montrerSansApercu(c, true)
      }
    }
  }

  // ---------- Ouvrir un autre classeur ----------
  /** Ouvrir un classeur, sans rien perdre de celui-ci :
   *  1) ce que la base n'a pas pu enregistrer (le trou) : on demande
   *     (Enregistrer le classeur, Quitter sans enregistrer, Annuler) ;
   *  2) tout ce qui attend s'écrit (avantDeQuitter : 10 s au plus, « Ouvrir
   *     sans attendre » au-delà de 5 s) ;
   *  3) le rappel d'enregistrer, s'il est dû, une fois ;
   *  4) la page se recharge sur l'adresse du classeur.
   *  Celui de l'onglet : l'écran se ferme (le second clic d'un double-clic
   *  ne tombe pas sur le tableau). arrivee : ce qu'on dira en arrivant. */
  async ouvrirClasseur(f: FicheClasseur, o: { x?: number; y?: number; arrivee?: string; cle?: CleALArrivee; seance?: string; page?: string; forme?: string } = {}) {
    const ici = this.hote.classeur
    if (ici && f.id === ici.id) {
      this.fermer()
      if (o.seance && this.hote.voirSeance?.(o.seance) === false) this.hote.message('Cette séance n\'existe plus dans ce classeur.')
      if (o.page && this.hote.voirPage?.(o.page, o.forme ?? null) === false) this.hote.message('Cette page n\'existe plus dans ce classeur.')
      if (o.x !== undefined && o.y !== undefined) avalerLeSecondAppui(o.x, o.y)
      return
    }
    if (this.depart) return
    this.depart = true
    let parti = false
    try {
      const s = this.hote.surveillance
      // 1) Le trou : ce qui s'est écrit depuis ne se relirait pas
      if (s?.peutQuitter()) {
        const r = await question({
          titre: 'Ce classeur n\'est pas entièrement enregistré',
          texte: `« ${ici?.nom ?? ''} » n'est pas entièrement enregistré dans ce navigateur : ce qui a été écrit depuis l'écriture refusée ne se relirait pas. Enregistrez-le d'abord dans un fichier.`,
          boutons: [
            { cle: 'annuler', libelle: 'Annuler', classe: 'secondaire' },
            { cle: 'quitter', libelle: 'Quitter sans enregistrer', classe: 'secondaire danger' },
            { cle: 'enregistrer', libelle: 'Enregistrer le classeur', classe: 'principal' },
          ],
          focus: 'enregistrer',
        })
        if (r === 'annuler') return
        if (r === 'enregistrer') {
          if (!await this.enregistrer()) return
          if (s.peutQuitter()) return
        } else s.laisserPartir()
      }
      // 2) Tout ce qui attend s'écrit
      await this.attendreLeDepart(f)
      // 3) Le rappel d'enregistrer, une fois par période de travail non enregistré
      if (s && ici && rappelAuDepart(s.etat, Date.now()) && !rappelDejaFait(ici.id, s.etat.nonEnregistreDepuis)) {
        noterRappel(ici.id, s.etat.nonEnregistreDepuis)
        const r = await question({
          titre: `Enregistrer « ${ici.nom} » d'abord ?`,
          texte: `${texteRappel(s.etat, Date.now())} Il reste dans ce navigateur, mais un navigateur peut l'oublier (un poste remis à zéro) : un fichier le garde.`,
          boutons: [
            { cle: 'annuler', libelle: 'Annuler', classe: 'secondaire' },
            { cle: 'partir', libelle: 'Ouvrir sans enregistrer', classe: 'secondaire' },
            { cle: 'enregistrer', libelle: 'Enregistrer le classeur', classe: 'principal' },
          ],
          focus: 'enregistrer',
        })
        if (r === 'annuler') return
        if (r === 'enregistrer' && !await this.enregistrer()) return
      }
      // 4) La page se recharge sur le classeur, une fois écrit ce qu'on vient
      // de changer dans la bibliothèque (un nom, des étiquettes)
      await Promise.race([this.ecritures, attendre(3000)])
      // (la clé : ce qu'il en est se dira à l'arrivée, une fois vérifiée là-bas)
      if (o.arrivee) { try { sessionStorage.setItem(CLE_ARRIVEE, JSON.stringify({ id: f.id, message: o.arrivee, ...(o.cle ? { cle: o.cle } : {}) })) } catch { /* rien au retour */ } }
      parti = true
      // Ce qui attendait s'est écrit (ou l'on a dit « Ouvrir sans attendre ») :
      // la clé ne pose pas en plus la question du navigateur
      this.hote.surveillance?.partirParLaBibliotheque()
      // La connexion Google suit l'onglet d'un classeur à l'autre (la copie
      // sur le Drive continue sans un clic, voir publication/drive.ts)
      passerLaConnexion()
      location.assign(urlDuClasseur(location.href, f.id, o.seance, { page: o.page, forme: o.forme }))
    } finally {
      if (!parti) this.depart = false
    }
  }

  /** Enregistrer le classeur ouvert (Ctrl + S : sur la clé, ou un fichier) */
  private async enregistrer(): Promise<boolean> {
    const ui = this.hote.ui
    if (!ui) return false
    try { return await ui.sauvegarde.ctrlS() } catch { return false }
  }

  /** avantDeQuitter, 10 s au plus ; au-delà de 5 s, un bouton « Ouvrir sans attendre » */
  private async attendreLeDepart(f: FicheClasseur): Promise<void> {
    if (!this.hote.classeur) return
    this.hote.message(`Ouverture de « ${f.nom} »…`)
    let sansAttendre: () => void = () => {}
    const bouton = new Promise<void>(ok => { sansAttendre = ok })
    const patience = window.setTimeout(() => {
      this.hote.message(`Ouverture de « ${f.nom} » : les dernières écritures de ce classeur se terminent…`, { libelle: 'Ouvrir sans attendre', faire: () => sansAttendre() })
    }, PATIENCE)
    try {
      await Promise.race([this.hote.avantDeQuitter().catch(() => { /* on part quand même : la base garde ce qu'elle a */ }), bouton, attendre(DEPART_MAX)])
    } finally { clearTimeout(patience) }
  }

  // ---------- Nouveau classeur ----------
  /** Le dossier où naîtra le classeur de la fenêtre « Nouveau classeur » */
  private dossierDuNouveau: string | null = null

  /** La fenêtre « Nouveau classeur » : le nom (« Nouveau classeur », tout
   *  choisi), le fond de la première page, et, quand le navigateur sait
   *  écrire seul dans un fichier, « Enregistrer automatiquement sur la
   *  clé » (cochée d'office dans la version hors ligne : le poste
   *  remis à zéro). Le choix du fichier s'ouvre dans le clic sur « Créer et
   *  ouvrir » ; y renoncer crée quand même le classeur, sans clé. Puis le
   *  classeur s'ouvre (voir ouvrirClasseur). « Nouveau classeur vierge… »
   *  (la fenêtre d'accueil) : le même, mais à la racine, hors de toute
   *  classe, quel que soit le dossier affiché. */
  nouveauClasseur(o: { chapitre?: { dossier: string | null; dossiers: ReadonlyMap<string, FicheDossier> }; vierge?: boolean } = {}) {
    if (document.querySelector('dialog[open]') || this.depart) return
    this.finirSaisie(true)
    const offrirCle = ecritDansUnFichier() && ecrivain.mode !== 'fil'
    // Il naît dans le dossier affiché, et en prend l'étiquette de classe
    // (calculée : pas de champ à remplir). « Nouveau chapitre… » (lot 6, la
    // fenêtre d'accueil) : dans le dossier de la classe, seulement le nom
    // (la première page est blanche) ; la clé comme pour un nouveau classeur
    const chapitre = o.chapitre
    if (chapitre) this.dossiers = new Map(chapitre.dossiers)
    const dossierVoulu = chapitre ? chapitre.dossier : o.vierge ? null : this.dossierAffiche
    const dans = dossierVoulu !== null && this.dossiers.has(dossierVoulu) ? dossierVoulu : null
    this.dossierDuNouveau = dans
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-nouveau' + (chapitre ? ' dialogue-chapitre' : '')
    d.innerHTML = `<form method="dialog"><h2>${chapitre ? 'Nouveau chapitre' : 'Nouveau classeur'}</h2><div class="corps">
      ${dans !== null ? '<p class="dans"></p>' : ''}
      <label class="champ"><span>Nom</span><input type="text" name="nom" maxlength="${LONGUEUR_NOM_CLASSEUR}" autocomplete="off" spellcheck="false"></label>
      <fieldset class="fonds"${chapitre ? ' hidden' : ''}><legend>Fond de la première page</legend></fieldset>
      ${offrirCle ? '<label class="case case-cle"><input type="checkbox" name="cle"><span>Enregistrer automatiquement sur la clé<small></small></span></label>' : ''}
      <p class="erreur" role="alert" hidden></p>
      <div class="actions">
        <button type="button" class="secondaire" data-a="annuler">Annuler</button>
        <button type="submit" class="principal" data-a="creer">Créer et ouvrir</button>
      </div></div></form>`
    if (dans !== null) {
      const h = etiquetteHeritee(dans, this.dossiers)
      d.querySelector('.dans')!.textContent = `Dans : ${cheminLisible(dans, this.dossiers)}${h ? ` · étiquette de classe « ${h.nom} »` : ''}`
    }
    const form = d.querySelector('form')!
    const champ = d.querySelector<HTMLInputElement>('input[name="nom"]')!
    champ.value = chapitre ? 'Nouveau chapitre' : NOM_NOUVEAU
    const fonds = d.querySelector('.fonds')!
    for (const f of FONDS_NEUF) {
      const l = Object.assign(document.createElement('label'), { className: 'case' })
      const r = Object.assign(document.createElement('input'), { type: 'radio', name: 'fond', value: f.id, checked: f.id === FOND_NEUF })
      l.append(r, Object.assign(document.createElement('span'), { textContent: f.nom }))
      fonds.appendChild(l)
    }
    const caseCle = d.querySelector<HTMLInputElement>('input[name="cle"]')
    if (caseCle) {
      caseCle.checked = location.protocol === 'file:'
      d.querySelector('.case-cle small')!.textContent = AIDE_ACTIVER
    }
    const erreur = d.querySelector<HTMLElement>('.erreur')!
    const annuler = d.querySelector<HTMLButtonElement>('[data-a="annuler"]')!
    const creer = d.querySelector<HTMLButtonElement>('[data-a="creer"]')!
    let enCours = false
    const fermer = () => { if (enCours) return; if (d.open) d.close() }
    d.addEventListener('cancel', e => { if (enCours) e.preventDefault() })
    d.addEventListener('close', () => d.remove())
    fermerSurLeFond(d, fermer)
    annuler.addEventListener('click', fermer)
    const dire = (t: string | null) => { erreur.textContent = t ?? ''; erreur.hidden = !t }
    form.addEventListener('submit', async e => {
      e.preventDefault()
      if (enCours) return
      dire(null)
      const nom = nomDeClasseur(champ.value) ?? (chapitre ? 'Nouveau chapitre' : NOM_NOUVEAU)
      const fond = ((form.elements.namedItem('fond') as RadioNodeList | null)?.value || FOND_NEUF) as Fond
      // Le fichier de la clé : dans ce clic (le navigateur ne l'ouvre qu'au
      // plus près d'un geste)
      let h: PoigneeFichier | null = null
      if (caseCle?.checked) {
        const choisir = (window as unknown as { showSaveFilePicker?: (o: unknown) => Promise<PoigneeFichier> }).showSaveFilePicker
        try {
          if (typeof choisir === 'function') h = await choisir.call(window, { suggestedName: nomSur(nom) + EXTENSION_TABLEAU, id: ID_CHOIX, types: TYPES_CLASSEUR })
        } catch (x) {
          // Renoncer : on crée quand même, sans clé
          if (nomErreur(x) !== 'AbortError') {
            dire(`Le fichier n'a pas pu être choisi : ${raisonCle(x).genre === 'permission' ? 'le navigateur ne l\'a pas permis' : (raisonCle(x) as { message: string }).message}. Décochez la case pour créer le classeur sans enregistrement automatique.`)
            return
          }
          h = null
        }
      }
      enCours = true
      for (const x of [champ, annuler, creer, ...d.querySelectorAll('input')] as (HTMLInputElement | HTMLButtonElement)[]) x.disabled = true
      creer.textContent = 'Création…'
      const reprendre = (t: string) => {
        enCours = false
        for (const x of [champ, annuler, creer, ...d.querySelectorAll('input')] as (HTMLInputElement | HTMLButtonElement)[]) x.disabled = false
        creer.textContent = 'Créer et ouvrir'
        dire(t)
      }
      // Un fichier qui a déjà quelque chose n'est pas écrasé : on en choisit un autre
      if (h) {
        let refus: string | null
        try { refus = await examinerPourUnNeuf(this.registre, h) } catch (x) { refus = `Ce fichier ne peut pas servir : ${raisonCle(x).genre === 'permission' ? 'le navigateur ne permet pas de le lire' : (raisonCle(x) as { message: string }).message}.` }
        if (refus) { reprendre(refus); return }
      }
      let fiche: FicheClasseur
      try { fiche = await this.creer(nom, fond) } catch (x) {
        const place = (x instanceof ErreurBase && x.raison === 'place') || nomErreur(x) === 'QuotaExceededError'
        const t = place ? PLUS_DE_PLACE : `Le classeur n'a pas pu être créé : ${(x as Error | null)?.message?.replace(/\.$/, '') || 'erreur inconnue'}.`
        reprendre(t)
        this.hote.message(t)
        return
      }
      let arrivee = `Classeur « ${fiche.nom} » créé.`
      let cle: CleALArrivee | undefined
      // La première écriture sur la clé, avant de partir (l'accord du choix
      // du fichier ne survit pas au changement de page : l'arrivée dira ce
      // qu'il en est, et le redemandera en un clic s'il le faut)
      if (h) {
        creer.textContent = 'Enregistrement sur la clé…'
        const r = await ecrireLeNeuf(this.registre, h, fiche)
        if (r.date !== null) ecrire(cleDernierEnregistrement(fiche), String(r.date))
        if (r.message) arrivee += ' ' + r.message
        cle = r.cle
      }
      enCours = false
      fermer()
      this.fiches.set(fiche.id, fiche)
      await this.ouvrirClasseur(fiche, { arrivee, ...(cle ? { cle } : {}) })
      // On est resté (Annuler) : il attend dans la bibliothèque
      if (!this.depart && this.ouvert) {
        this.hote.message(`Classeur « ${fiche.nom} » créé : il est dans la bibliothèque.`)
        void this.charger()
      }
    })
    document.body.appendChild(d)
    d.showModal()
    champ.focus()
    champ.select()
  }

  /** Crée le classeur : sa fiche (marquée en création), sa base avec une
   *  page au fond choisi et sa naissance dans le film, puis la marque s'en
   *  va (voir Registre.creerClasseur : rien ne reste si cela échoue) */
  private async creer(nom: string, fond: Fond): Promise<FicheClasseur> {
    const id = idClasseur(), t = Date.now()
    const dossier = this.dossierDuNouveau !== null && this.dossiers.has(this.dossierDuNouveau) ? this.dossierDuNouveau : null
    const fiche: FicheClasseur = { id, base: baseDe(id), nom, dossier, etiquettes: [], cree: t, modifie: t, ouvert: t, pages: 1 }
    return this.registre.creerClasseur(fiche, async base => creerBase(base, await etatNeuf(fond), { id, nom }))
  }
}

/** Deux images ont-elles les mêmes octets ? */
async function memesOctets(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false
  try {
    const [x, y] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()])
    const u = new Uint8Array(x), v = new Uint8Array(y)
    for (let i = 0; i < u.length; i++) if (u[i] !== v[i]) return false
    return true
  } catch { return false }
}

// ---------- Le rappel au départ, une fois ----------
function rappelDejaFait(id: string, depuis: number | null): boolean {
  try {
    const o = JSON.parse(sessionStorage.getItem(CLE_RAPPEL_DEPART) || 'null')
    return !!o && o.id === id && o.depuis === depuis
  } catch { return false }
}
function noterRappel(id: string, depuis: number | null) {
  try { sessionStorage.setItem(CLE_RAPPEL_DEPART, JSON.stringify({ id, depuis })) } catch { /* il reviendra */ }
}

/** Une question de l'outil (pas de confirm(), que le navigateur bloque dans
 *  une page intégrée) : la clé du bouton choisi ; Échap, ou un clic à côté,
 *  rendent 'annuler' */
function question(o: { titre: string; texte: string; boutons: { cle: string; libelle: string; classe: string }[]; focus: string }): Promise<string> {
  return new Promise(fini => {
    const d = document.createElement('dialog')
    d.className = 'dialogue dialogue-ouvrir dialogue-quitter'
    d.innerHTML = '<h2></h2><div class="corps"><p></p><div class="actions"></div></div>'
    d.querySelector('h2')!.textContent = o.titre
    d.querySelector('p')!.textContent = o.texte
    const actions = d.querySelector('.actions')!
    let reponse = 'annuler'
    const fermer = (r: string) => { reponse = r; if (d.open) d.close() }
    d.addEventListener('close', () => { d.remove(); fini(reponse) })
    fermerSurLeFond(d, () => fermer('annuler'))
    let focus: HTMLButtonElement | null = null
    for (const b of o.boutons) {
      const x = Object.assign(document.createElement('button'), { type: 'button', className: b.classe, textContent: b.libelle })
      x.dataset.a = b.cle
      x.addEventListener('click', () => fermer(b.cle))
      actions.appendChild(x)
      if (b.cle === o.focus) focus = x
    }
    document.body.appendChild(d)
    d.showModal()
    focus?.focus()
  })
}
