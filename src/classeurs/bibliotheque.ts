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
// étiquettes de niveau (propres, ou héritées du dossier de niveau, voir
// arbre.ts) et leur filtre, renommer (F2, « Renommer… », un double-clic sur
// le nom), trier (par date, par nom), et le conseil du rangement par niveau.
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
import { entreeMenu, fermerMenu, installerMenus } from '../menus'
import { CTRL, MAC, toucheMenu } from '../navigateur'
import type { TypePointeur } from '../pointeurs'
import { vitesseDefilement } from '../pages/glisser'
import { icone } from '../icones'
import { lire } from '../reglages'
import type { Fond } from '../types'
import { FONDS } from '../types'
import type { FicheClasseur, FicheDossier, InfosClasseur } from './demarrage'
import { baseDe, idClasseur, visible } from './demarrage'
import type { Registre } from './registre'
import { ErreurBase, creerBase } from './bases'
import type { Tri } from './arbre'
import { COULEUR_DEFAUT, cheminLisible, dossierVisible } from './arbre'
import type { ObjetDeplace } from './deplacer'
import { etatNeuf } from './neuf'
import type { Surveillance } from './surveillance'
import type { Verification } from './verification'
import { enregistrerDepuisLaBase } from './enregistrer'
import { VueCorbeilleBiblio } from './vue-corbeille'
import { VueSeancesBiblio } from './vue-seances'
import type { Fichiers } from './fichiers'
import { AIDE_ENREGISTRER_TOUT } from './fichiers'
import type { Ranger } from './ranger'
import { DeplacerClasseur } from './deplacer-fichier'
import type { Emplacement } from './emplacements'
import { fermerSurLeFond } from '../dialogue'
import { RechercheBiblio } from './recherche-biblio-vue'
import { lireContenu } from '../recherche'
import { ajouterMethodes } from '../methodes'
import { methodesFiches } from './bibliotheque/fiches'
import { methodesPointeurs } from './bibliotheque/pointeurs'
import { methodesSeances } from './bibliotheque/seances'
import { methodesDossiers } from './bibliotheque/dossiers'
import { methodesVueSeances } from './bibliotheque/seances-et-nouveau'

/** « Ouvrir… » du bandeau : le même titre qu'avant le lot 7 (Ctrl + O
 *  choisit toujours des fichiers ; le bouton montre la fenêtre « Ouvrir ») */
const TITRE_OUVRIR = `Ouvrir un classeur ou une bibliothèque (${CTRL} + O)`
const AIDE_OUVRIR_FENETRE = 'Depuis l\'ordinateur ou le Drive : un classeur, une bibliothèque, ou tout un dossier de niveau.'

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
  /** Va à une séance du classeur de cet onglet et ouvre la fenêtre Publier
   *  sur elle ; faux : elle n'existe plus */
  publierSeance?(id: string): boolean
  /** Va à une page du classeur de cet onglet, une formule prise (la
   *  recherche) ; faux : elle n'existe plus */
  voirPage?(page: string, forme: string | null): boolean
}

/** Ce qu'on dit au classeur où l'on arrive (sessionStorage, le temps du
 *  chargement) : JSON { id, message } */
export const CLE_ARRIVEE = 'mem-teachingtool-arrivee'
/** Le rappel d'enregistrer, quand on quitte un classeur : une fois par
 *  période de travail non enregistré (JSON { id, depuis }) */
const CLE_RAPPEL_DEPART = 'mem-teachingtool-rappel-depart'
/** Ce rappel, lu en arrivant sur l'autre classeur (sessionStorage, le temps
 *  du chargement) : JSON { pour, id, nom, texte } (pour : le classeur où
 *  l'on arrive ; id, nom : le classeur quitté ; texte : voir
 *  texteRappelDepart). Pas dans CLE_ARRIVEE : un message d'arrivée fait
 *  taire « Séance … reprise » et la fenêtre d'accueil, pas ce rappel. */
export const CLE_RAPPEL_ARRIVEE = 'mem-teachingtool-rappel-arrivee'
/** Ce que main.ts en relit : le classeur quitté (id, nom) et le texte */
export interface RappelArrivee { id: string; nom: string; texte: string }

/** Relu à l'arrivée (sessionStorage) : le rappel écrit pour ce classeur-ci
 *  (pour), ou null (rien, pas pour lui, rien de valable) */
export function lireRappelArrivee(x: unknown, pour: string): RappelArrivee | null {
  const o = x as { pour?: unknown; id?: unknown; nom?: unknown; texte?: unknown } | null
  if (!o || typeof o !== 'object' || o.pour !== pour) return null
  if (typeof o.id !== 'string' || !o.id || typeof o.nom !== 'string' || !o.nom || typeof o.texte !== 'string' || !o.texte) return null
  return { id: o.id, nom: o.nom, texte: o.texte }
}
/** Au-delà de ce temps, « Ouvrir sans attendre » ; au plus ce temps-là */
export const PATIENCE = 5000
export const DEPART_MAX = 10_000
/** La fiche du classeur de l'onglet s'écrit avant que la bibliothèque
 *  montre ses cartes : on ne l'attend pas plus que… */
export const ECRIRE_LA_FICHE_MAX = 1000
/** Les dates des cartes (« aujourd'hui à 14 h 05 ») se refont toutes les… */
export const RAFRAICHIR = 60_000
/** Le nom proposé pour un classeur neuf */
export const NOM_NOUVEAU = 'Nouveau classeur'
/** Les fonds proposés, dans cet ordre (les petits carreaux d'abord : le
 *  cahier de maths ; puis, depuis le lot 5, les quatre nouveaux, après les
 *  quatre d'avant, qui gardent leur place) ; leurs noms sont ceux des menus.
 *  La page blanche est cochée d'office, comme toute page neuve (FOND_NEUF ;
 *  avant, les petits carreaux) : l'ordre, lui, ne change pas. */
export const FONDS_NEUF: { id: Fond; nom: string }[] = (['carreaux', 'blanc', 'seyes', 'repere', 'grands-carreaux', 'millimetre', 'pointe', 'iso'] as Fond[])
  .map(id => ({ id, nom: FONDS.find(f => f.id === id)!.nom }))
export const PLUS_DE_PLACE = 'Le classeur n\'a pas pu être créé : il n\'y a plus de place dans ce navigateur.'
/** Le dossier qu'on regarde, et le filtre de niveau, retenus pour l'onglet
 *  (sessionStorage : un autre onglet a les siens) ; le tri, pour l'appareil */
export const CLE_DOSSIER = 'mem-teachingtool-dossier'
export const CLE_FILTRE = 'mem-teachingtool-filtre'
export const CLE_TRI = 'mem-teachingtool-tri'
/** Le réglage de la bibliothèque qui fait taire le conseil (« Plus tard ») */
export const REGLAGE_CONSEIL = 'conseil'
export const CONSEIL = 'Rangez par niveau : un dossier par niveau (« 5ème »), puis un classeur par chapitre (« Symétrie centrale »). Les classeurs d\'un dossier de niveau portent son étiquette : un geste les retrouve tous.'
export const VIDE_DOSSIER = 'Ce dossier est vide. Glissez-y un classeur, ou créez-en un.'
/** Dupliquer le classeur : ce qu'on dit quand il n'a pas pu l'être */
export const PAS_DUPLIQUE = 'Le classeur n\'a pas pu être dupliqué'
export const PLUS_DE_PLACE_COPIE = `${PAS_DUPLIQUE} : il n'y a plus de place dans ce navigateur.`
/** « Copie du classeur… », au-delà de ce temps */
export const PATIENCE_COPIE = 300
/** Le clic qui suit un glisser (la carte est un lien) ne fait rien pendant ce temps */
export const APRES_GLISSER = 400
/** L'image de la carte qu'on tire, réduite : la carte du dossier sous le
 *  pointeur reste visible (dans la trieuse, la place d'arrivée est entre deux
 *  cartes ; ici, c'est la carte sous le pointeur) */
export const FANTOME = 0.55
/** Un clic sur le nom attend ce temps qu'un second en fasse un double-clic (renommer), comme dans la trieuse */
export const DOUBLE_CLIC_NOM = 400
/** Le bouton du message qui défait un changement (ui.message le garde 7 s) */
export const ANNULER = 'Annuler'
/** « Effacement… », au-delà de ce temps */
export const PATIENCE_EFFACEMENT = 600
/** Au-delà, « Vérification des images… » avant la question d'effacement (lot 17) */
export const PATIENCE_VERIFICATION = 400
/** Ce qu'on efface, pour le message de fin ; suite : ce qu'on y ajoute (les
 *  images recopiées avant, le classeur qu'une recopie ratée retient, lot 17) */
export type Quoi = ({ genre: 'classeur' | 'dossier'; nom: string } | { vider: true }) & { suite?: string }
/** La clé des messages de la corbeille (« Annuler »), suivie de celle de la carte */
export const CLE_MESSAGE = 'corbeille:'

/** Les cartes d'une rangée sont rangées par clé : l'id d'un classeur, ou
 *  « d: » et l'id d'un dossier */
export const DOSSIER = 'd:'
export const CASE = '.case-classeur, .case-dossier'
export const FOCUSABLE = '.carte-classeur, .carte-dossier'
/** La grande icône d'un dossier, dans sa couleur (--c) : le dos, plus pâle, et la face */
export const SVG_DOSSIER = '<svg viewBox="0 0 48 38" aria-hidden="true"><path class="dos" d="M2 6a4 4 0 014-4h11.5l4.5 5h20a4 4 0 014 4v3H2z"/><path class="face" d="M2 12h44v20a4 4 0 01-4 4H6a4 4 0 01-4-4z"/></svg>'

/** Une rangée de cartes (« Récents », la grille du dossier affiché) : un
 *  seul arrêt de Tab (la carte de focusId), les flèches à l'intérieur */
export interface Liste { el: HTMLElement; cartes: Map<string, HTMLElement>; ordre: string[]; focusId: string | null }

/** Le pointeur posé sur une carte, jusqu'à son clic ou son glisser */
export interface Appui {
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
export interface Glisse {
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
export interface Saisie { cle: string; liste: Liste; li: HTMLElement; input: HTMLInputElement; ancien: string; dossier: boolean }

export const attendre = (ms: number) => new Promise<void>(ok => setTimeout(ok, ms))
export const nomErreur = (e: unknown) => (e as { name?: string } | null)?.name
export const messageDe = (e: unknown) => (e as Error | null)?.message?.replace(/\.$/, '') || 'erreur inconnue'

function lireSession(cle: string): string | null {
  try { return sessionStorage.getItem(cle) } catch { return null }
}
export function ecrireSession(cle: string, v: string | null) {
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
   *  étiquettes de niveau ; C7 à C10 : déplacer, dupliquer, supprimer…),
   *  séparés par un filet */
  readonly blocsDuMenu: ((f: FicheClasseur, m: HTMLElement) => void)[] = []
  /** La vérification des images (lot 17, verification.ts) : avant
   *  « Supprimer définitivement » et « Vider la corbeille », les images dont
   *  la corbeille tient la dernière copie sont recopiées dans les classeurs
   *  qui les montrent encore ; branchée par vue-verification.ts */
  verification: Verification | null = null
  /** Une question d'effacement se prépare (la vérification des images) */
  gardeEnCours = false
  /** Les blocs du menu d'un dossier, après sa couleur et « Dossier d'un
   *  niveau » (C7 : déplacer ; C8 : supprimer) */
  readonly blocsDuMenuDossier: ((d: FicheDossier, m: HTMLElement) => void)[] = []
  /** Les pastilles « PC ✓ » des cartes de dossiers (posées par ailleurs.ts) :
   *  dossier → ce qui s'y lit ; attention : il manque des copies */
  pastilles = new Map<string, { texte: string; attention: boolean; pc?: boolean }>()
  /** Un clic sur la pastille « PC ✓ » d'un dossier enregistré sur le PC
   *  (posé par ailleurs.ts : la petite fenêtre « Enregistré sur le PC ») */
  surPastille: ((dossier: string, ou: HTMLElement) => void) | null = null
  /** Le dossier qu'on regarde (null : la racine), retenu pour l'onglet */
  dossierAffiche: string | null = null
  /** Le filtre de niveau (une étiquette ; null : tous), retenu pour l'onglet */
  filtre: string | null = null
  /** Le tri des classeurs, retenu sur l'appareil */
  tri: Tri = 'modifie'
  /** Ouvrir et enregistrer des fichiers (lot 4 C9) : posé par brancherFichiers */
  fichiers: Fichiers | null = null
  /** La fenêtre « Où ranger… » au premier « Nouveau classeur » d'un niveau :
   *  plus d'elle-même depuis 2026-11 (le professeur : un seul menu,
   *  « Enregistrer ce dossier… », pour tous les dossiers). Les essais du lot
   *  18 la rallument pour vérifier le rangement chez un établissement, qui
   *  reste pour les niveaux déjà rangés ainsi (window.__essaiOuRanger). */
  proposerOuRanger = (globalThis as { __essaiOuRanger?: boolean }).__essaiOuRanger === true
  /** Où ranger les classeurs d'un niveau (lot 18) : posé par brancherRanger ;
   *  null : ce navigateur ne range pas, ou la bibliothèque est construite seule */
  ranger: Ranger | null = null
  /** « Déplacer le classeur… » : le fichier qui suit (lot 18,
   *  deplacer-fichier.ts), posé par brancherDeplaceur (main.ts, avec la clé
   *  de l'onglet) ; sans lui, la bibliothèque en fabrique un sans clé (voir
   *  leDeplaceur) */
  private deplaceur: DeplacerClasseur | null = null
  /** La fenêtre « Ouvrir » (lot 7 : l'ordinateur ou le Drive, un dossier) :
   *  « Ouvrir… » du bandeau la montre ; sans elle, le choix des fichiers */
  /** « Enregistrer toute la bibliothèque… » (menu ⋯) : la fenêtre
   *  « Enregistrer » d'ailleurs.ts (ce qui part, l'ordinateur ou le Drive) ;
   *  null : le fichier .memb tout de suite, comme avant */
  enregistrerTout: (() => void) | null = null
  ouvrirFenetre: (() => void) | null = null
  /** En haut des cartes : « Mes emplacements » (lot 7) */
  readonly hautDuCorps: HTMLElement
  /** Après chaque rendu des cartes (lot 7 : « Mes emplacements » suit le
   *  dossier qu'on regarde) */
  readonly apresRendu: (() => void)[] = []
  /** « Ouvrir… », dans le bandeau (caché tant que les fichiers ne sont pas branchés) */
  private boutonOuvrir: HTMLButtonElement
  /** Le cadre pointillé des fichiers qu'on lâche, et combien d'entrées le survolent */
  depot: HTMLElement
  survols = 0
  fiches = new Map<string, FicheClasseur>()
  recherche: RechercheBiblio
  dossiers = new Map<string, FicheDossier>()
  /** Les fiches ont été lues au moins une fois */
  lu = false
  /** Le conseil du rangement par niveau a été écarté (« Plus tard ») ;
   *  null : pas encore lu */
  conseilVu: boolean | null = null
  compte: HTMLElement
  boutonBandeau: HTMLButtonElement
  /** « Corbeille (3) » (lot 4 C8), et la vue qu'il montre */
  boutonCorbeille: HTMLButtonElement
  vue: VueCorbeilleBiblio
  /** « Séances » (idée B du lot 8) : toutes les séances par date, à la place des cartes */
  boutonSeances: HTMLButtonElement
  vueSeances: VueSeancesBiblio
  /** « Ce navigateur garde 120 Mo pour ce site. » */
  placeEl: HTMLElement
  /** Les bases sans fiche ont été cherchées (une fois par chargement) */
  adoptionFaite = false
  /** Un effacement définitif en cours : un seul à la fois */
  effacementEnCours = false
  menuBandeau: HTMLElement
  fermerBouton: HTMLButtonElement
  ligneOuvert: HTMLElement
  corps: HTMLElement
  conseil: HTMLElement
  sectionRecents: HTMLElement
  filtreEl: HTMLElement
  sectionTous: HTMLElement
  filEl: HTMLElement
  triBouton: HTMLButtonElement
  videDossier: HTMLElement
  vide: HTMLElement
  recents: Liste
  tous: Liste
  listes: Liste[]
  menuEl: HTMLElement
  menuTriEl: HTMLElement
  menuCarte: { id: string; menu: Menu } | null = null
  /** Une séance est en train d'être changée (voir changerSeances) */
  seancesOccupees = false
  /** La séance qu'on tire par sa poignée : de quoi arrêter (voir glisserSeance) */
  seanceTiree: ((garder: boolean) => void) | null = null
  menuBandeauOuvert: Menu | null = null
  menuTriOuvert: Menu | null = null
  saisie: Saisie | null = null
  /** Un premier clic sur un nom attend son second (renommer) */
  clicNom: { cle: string; minuterie: number } | null = null
  /** La grille montre les classeurs d'une étiquette, avec leur chemin */
  plat = false
  inertes: HTMLElement[] = []
  retour: HTMLElement | null = null
  /** Ouverte au clavier (Entrée ou Espace sur le bouton du classeur) : le
   *  focus rendu à la fermeture ne compte comme venu du clavier que si elle
   *  se ferme aussi au clavier (voir fermer) */
  ouverteAuClavier = false
  auRetour: (() => void) | null = null
  appui: Appui | null = null
  /** Le dernier appui levé : son clic (qui suit le lever) le relit */
  appuiLeve: Appui | null = null
  /** La carte qu'on tire (lot 4 C7) */
  glisse: Glisse | null = null
  boucle = 0
  /** Le pointeur d'un glisser arrêté (Échap) : son lever ne fait rien */
  pointeurFini: number | null = null
  /** Le clic qui suit un glisser, ou deux doigts, ne fait rien jusque-là (performance.now) */
  avalerClicJusqua = 0
  /** Deux doigts (ou plus) posés : la grille défile sous eux (y : leur hauteur moyenne) */
  deuxDoigts: { y: number } | null = null
  /** Les aperçus des classeurs, par id (révoqués à la fermeture) */
  images = new Map<string, Image>()
  /** Une copie (Dupliquer) en cours : une seule à la fois */
  copieEnCours = false
  /** On part vers un autre classeur (une seule fois) */
  depart = false
  /** Les classeurs dont la ligne « séances » est dépliée */
  seancesOuvertes = new Set<string>()
  /** Les changements venus d'ailleurs, à faire quand plus rien n'est ouvert */
  aAppliquer = { classeurs: new Set<string>(), dossiers: false }
  /** Tout est à refaire quand le champ du nom se fermera */
  aRefaire = false
  file: Promise<void> = Promise.resolve()
  /** Les écritures de l'index faites d'ici (un nom, une couleur, des
   *  étiquettes) : on les attend avant de partir vers un autre classeur */
  ecritures: Promise<unknown> = Promise.resolve()
  minuterie = 0
  cleLigne = ''
  cleFiltre = ''
  cleFil = ''

  constructor(readonly hote: HoteBibliotheque, readonly registre: Registre, readonly racine: HTMLElement = document.getElementById('app') ?? document.body) {
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
    // Le conseil du rangement par niveau : à la racine, tant qu'il n'y a
    // aucun dossier et qu'on ne l'a pas écarté
    this.conseil = document.createElement('aside')
    this.conseil.className = 'biblio-conseil'; this.conseil.hidden = true
    this.conseil.setAttribute('aria-label', 'Conseil de rangement')
    const conseilIcone = Object.assign(document.createElement('span'), { className: 'conseil-icone', innerHTML: SVG_DOSSIER })
    conseilIcone.style.setProperty('--c', COULEUR_DEFAUT)
    const conseilTexte = Object.assign(document.createElement('p'), { textContent: CONSEIL })
    const conseilActions = Object.assign(document.createElement('div'), { className: 'conseil-actions' })
    const creerClasse = Object.assign(document.createElement('button'), { type: 'button', className: 'principal', textContent: 'Créer un dossier de niveau' })
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
    // La rangée du filtre de niveau (s'il y a au moins une étiquette)
    this.filtreEl = Object.assign(document.createElement('div'), { className: 'biblio-filtre', hidden: true })
    this.filtreEl.setAttribute('role', 'group'); this.filtreEl.setAttribute('aria-label', 'Filtrer par niveau')
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
    // Le menu d'un classeur : renommer, ses étiquettes de niveau ; le
    // déplacer, le dupliquer
    this.blocsDuMenu.push((f, m) => {
      entreeMenu(m, 'Renommer…', () => this.renommer(f.id), { touche: 'F2', action: 'renommer' })
      entreeMenu(m, 'Étiquettes de niveau…', () => this.etiquettesDuClasseur(f.id), { action: 'etiquettes' })
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
      entreeMenu(m, 'Enregistrer toute la bibliothèque…', () => { if (this.enregistrerTout) this.enregistrerTout(); else void f.enregistrerLaBibliotheque() }, { action: 'enregistrer-bibliotheque', aide: AIDE_ENREGISTRER_TOUT })
    })
    if (this.ouvert) this.boutonBandeau.hidden = false
  }

  /** Où ranger les classeurs d'un niveau (lot 18, ranger.ts) : la fenêtre
   *  « Où ranger… » au premier « Nouveau classeur » d'un niveau, et le
   *  fichier de chaque classeur qui arrive dans un niveau rangé */
  brancherRanger(r: Ranger) { this.ranger = r }

  /** « Déplacer le classeur… » (lot 18, deplacer-fichier.ts) : le fichier du
   *  classeur suit son déplacement (une carte, un glisser, le menu ⋯ du
   *  classeur, « Annuler »). En développement, window.__deplaceur (les essais). */
  brancherDeplaceur(d: DeplacerClasseur) {
    this.deplaceur = d
    if (import.meta.env.DEV) Object.assign(window, { __deplaceur: d })
  }

  /** Un dossier au nom de chaque classeur (2026-11) : les classeurs d'un
   *  lien « à plat » à ranger, puis leur rangement (deplacer-fichier.ts) */
  plansVersLeurDossier(e: Emplacement) { return this.leDeplaceur.plansVersLeurDossier(e) }
  rangerVersLeurDossier(plans: Parameters<DeplacerClasseur['rangerVersLeurDossier']>[0]) { return this.leDeplaceur.rangerVersLeurDossier(plans) }

  /** Le déplaceur : celui qui est branché (main.ts, avec la clé de l'onglet) ;
   *  sinon un déplaceur sans clé, fabriqué ici avec ce que la bibliothèque a
   *  (la page de la bibliothèque seule : aucun classeur n'est ouvert dans cet
   *  onglet, chaque fichier se déplace sous le verrou de son classeur) */
  get leDeplaceur(): DeplacerClasseur {
    if (!this.deplaceur) {
      this.brancherDeplaceur(new DeplacerClasseur({
        registre: this.registre, bibliotheque: this, cle: null, message: (t, a) => this.hote.message(t, a), classeur: () => this.hote.classeur,
      }))
    }
    return this.deplaceur!
  }

  /** « Ouvrir… » : la fenêtre du lot 7, sinon le choix des fichiers */
  private choisirOuvrir() {
    if (this.ouvrirFenetre) this.ouvrirFenetre()
    else this.fichiers?.choisir()
  }

  /** Le dossier où va un classeur ajouté depuis un fichier : celui qu'on
   *  regarde (s'il existe encore, et sans filtre de niveau ni la corbeille) ;
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

  /** On peut revenir au classeur de l'onglet (× et Échap) : il y en a un, on
   *  ne part pas vers un autre, et il n'est pas dans la corbeille (supprimé
   *  ici ou ailleurs : on le remet, ou on en ouvre un autre) */
  get peutFermer(): boolean {
    const c = this.hote.classeur
    if (!c || this.depart) return false
    const f = this.fiches.get(c.id)
    return !this.lu || (!!f && visible(f, this.dossiers))
  }

  /** Un menu ou une saisie est ouvert : rien ne se refait (à leur fermeture) */
  get occupe(): boolean { return !!this.menuCarte || !!this.menuBandeauOuvert || !!this.menuTriOuvert || !!this.saisie || !!this.glisse }

  /** Sur window, en capture, posé à l'ouverture (après ceux des menus, posés
   *  au démarrage). Une fenêtre, un menu, un champ gardent leurs touches.
   *  Échap enlève d'abord le filtre de niveau, puis ferme l'écran (un menu se
   *  ferme avant tout, par menus.ts) ; Retour arrière remonte d'un dossier.
   *  Sur une carte : les flèches, Début, Fin, F2 (renommer), la touche Menu
   *  et Maj + F10 ; Entrée est celle du lien ou du bouton (son clic). */
  surTouche = (e: KeyboardEvent) => {
    const cible = e.target as HTMLElement
    // Une séance qu'on tire par sa poignée : Échap l'arrête aussi
    if (this.seanceTiree) {
      e.preventDefault(); e.stopPropagation()
      if (e.key === 'Escape') this.seanceTiree(false)
      return
    }
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
    const ligneSeance = cible.closest?.('.carte-seance-ligne') as HTMLElement | null
    if (ligneSeance) { if (this.toucheSeance(e, ligneSeance)) fait(); return }
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

  /** Une image : près du bord haut ou bas de la grille, elle défile seule
   *  (voir vitesseDefilement), et la cible sous le pointeur suit */
  defiler = () => {
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

  /** Le champ du nom reste visible : dans la grille, et au-dessus du clavier
   *  virtuel quand il paraît (visualViewport). Le clavier couvre le bas de
   *  l'écran sans que la page change de taille : la grille gagne d'abord en
   *  bas la place qu'il prend (--clavier), pour qu'une carte de la dernière
   *  rangée puisse remonter au-dessus de lui. */
  montrerSaisie = () => {
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

  // ---------- Nouveau classeur ----------
  /** Le dossier où naîtra le classeur de la fenêtre « Nouveau classeur » */
  dossierDuNouveau: string | null = null
  /** La fenêtre « Nouveau classeur » se prépare (la fenêtre « Où ranger… »
   *  d'abord, des lectures) : un deuxième clic n'en ouvre pas une autre */
  nouveauEnCours = false

  /** Crée le classeur : sa fiche (marquée en création), sa base avec une
   *  page au fond choisi et sa naissance dans le film, puis la marque s'en
   *  va (voir Registre.creerClasseur : rien ne reste si cela échoue). Dans
   *  ce dossier s'il existe (sinon à la racine) : celui de la fenêtre
   *  « Nouveau classeur » d'office. */
  async creer(nom: string, fond: Fond, dossierVoulu: string | null = this.dossierDuNouveau): Promise<FicheClasseur> {
    const id = idClasseur(), t = Date.now()
    const dossier = dossierVoulu !== null && this.dossiers.has(dossierVoulu) ? dossierVoulu : null
    const fiche: FicheClasseur = { id, base: baseDe(id), nom, dossier, etiquettes: [], cree: t, modifie: t, ouvert: t, pages: 1 }
    return this.registre.creerClasseur(fiche, async base => creerBase(base, await etatNeuf(fond), { id, nom }))
  }
}

// Les méthodes rangées dans classeurs/bibliotheque/, par sujet : elles s'ajoutent à la classe
// (même comportement que si elles y étaient écrites).
type MethodesFiches = typeof methodesFiches
type MethodesPointeurs = typeof methodesPointeurs
type MethodesSeances = typeof methodesSeances
type MethodesDossiers = typeof methodesDossiers
type MethodesVueSeances = typeof methodesVueSeances
export interface Bibliotheque extends MethodesFiches, MethodesPointeurs, MethodesSeances, MethodesDossiers, MethodesVueSeances {}
ajouterMethodes(Bibliotheque, methodesFiches, methodesPointeurs, methodesSeances, methodesDossiers, methodesVueSeances)

/** Ce qu'on dit quand un classeur n'a pas pu être créé : plus de place dans
 *  le navigateur, ou la raison de l'erreur */
export function texteEchecCreation(x: unknown): string {
  const place = (x instanceof ErreurBase && x.raison === 'place') || nomErreur(x) === 'QuotaExceededError'
  return place ? PLUS_DE_PLACE : `Le classeur n'a pas pu être créé : ${(x as Error | null)?.message?.replace(/\.$/, '') || 'erreur inconnue'}.`
}

/** Deux images ont-elles les mêmes octets ? */
export async function memesOctets(a: Blob, b: Blob): Promise<boolean> {
  if (a.size !== b.size) return false
  try {
    const [x, y] = await Promise.all([a.arrayBuffer(), b.arrayBuffer()])
    const u = new Uint8Array(x), v = new Uint8Array(y)
    for (let i = 0; i < u.length; i++) if (u[i] !== v[i]) return false
    return true
  } catch { return false }
}

// ---------- Le rappel au départ, une fois ----------
/** Une fois par période de travail non enregistré : le classeur et le début
 *  de cette période (nonEnregistreDepuis), notés pour l'onglet */
export function rappelDejaFait(id: string, depuis: number | null): boolean {
  try {
    const o = JSON.parse(sessionStorage.getItem(CLE_RAPPEL_DEPART) || 'null')
    return !!o && o.id === id && o.depuis === depuis
  } catch { return false }
}
export function noterRappel(id: string, depuis: number | null) {
  try { sessionStorage.setItem(CLE_RAPPEL_DEPART, JSON.stringify({ id, depuis })) } catch { /* il reviendra */ }
}

/** Une question de l'outil (pas de confirm(), que le navigateur bloque dans
 *  une page intégrée) : la clé du bouton choisi ; Échap, ou un clic à côté,
 *  rendent 'annuler' */
export function question(o: { titre: string; texte: string; boutons: { cle: string; libelle: string; classe: string }[]; focus: string }): Promise<string> {
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
