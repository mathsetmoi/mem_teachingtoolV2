// =============================================================
// L'APPLICATION
// Elle relie trois choses qui s'ignorent : le document (ce qui est
// écrit), la caméra (où l'on regarde) et le rendu (ce qu'on voit).
// Les gestes arrivent ici, deviennent des formes, et partent dans
// le document. Le rendu, lui, ne fait que lire.
// =============================================================
import type { EtapeDePile, Tableau } from './document'
import { Camera } from './camera'
import { Rendu } from './rendu'
import type { Sens } from './ordre'
import type { Figure, Fond, Forme, Formule, Outil, Trait, TypeForme } from './types'
import { EditeurTexte } from './texte-editeur'
import { libre } from './types'
import type { P } from './formes'
import type { Bord, EtatInstrument, NomInstrument, Partie } from './instruments'
import * as Y from 'yjs'
import katex from 'katex'
import { Immobilite } from './formes'
import { Piste } from './piste'
import type { Boite } from './revoir/bobine'
import { leDoigtDeplace, reglages } from './reglages'
import { ToucherADoigts, messageDetache, messageFixe, messageVerrou, nouveauDepart, pointeurDeDepart } from './pointeurs'
import type { Depart, Toucher, TypePointeur } from './pointeurs'
import { tableauCache } from './navigateur'
import type { Vue } from './session'
import { lireSession } from './session'
import type { InfosClasseur } from './classeurs/demarrage'
import { CLASSEUR_SEUL, CLE_SESSION, cleDuClasseur } from './classeurs/demarrage'
import type { Copie } from './presse-papiers'
import { versHtml, versTexte } from './presse-papiers'
import { changementsDetacher, changementsFixer, changementsVerrou, compterObjets } from './verrou'
import type { SeanceDuClasseur } from './seances'
import { porteurs } from './groupes'
import type { Cadre, Matrice } from './cadre'
import { cadreDe } from './cadre'
import type { PartieGardee, PriseRognage } from './rognage'
import { estPdf } from './import-pdf'
import { Calculatrices } from './calculatrice/vivantes'
import { ajouterMethodes } from './methodes'
import { methodesInstruments } from './app/instruments'
import { methodesPages } from './app/pages'
import { methodesVue } from './app/vue'
import { methodesAppuis } from './app/appuis'
import { methodesDoigts } from './app/doigts'
import { methodesFigures } from './app/figures'
import { methodesImages } from './app/images'
import { methodesObjets } from './app/objets'
import { methodesGroupes } from './app/groupes'
import { methodesClavier } from './app/clavier'

/** La copie gardée dans le navigateur, pour un autre onglet de la même
 *  adresse (nouvelle clé : aucune autre ne change) */
export const CLE_PRESSE_PAPIERS = 'mem-presse-papiers'
/** Au-delà (des images), elle ne se garde pas dans le navigateur : le
 *  presse-papiers du système la porte encore */
export const GARDE_MAX = 2 * 1024 * 1024
/** Une copie oubliée ne se colle pas le lendemain */
export const GARDE_DUREE = 12 * 3600 * 1000

export const COULEURS = [
  { nom: 'Noir', valeur: '#1b2230' },
  { nom: 'Bleu', valeur: '#1f5fbf' },
  { nom: 'Rouge', valeur: '#d0342c' },
  { nom: 'Vert', valeur: '#1e8a4c' },
]
export const TAILLES = [{ nom: 'Fin', valeur: 2.5 }, { nom: 'Moyen', valeur: 4.5 }, { nom: 'Épais', valeur: 9 }]

/** App.options vaut ceci quand le menu ouvert est celui de toute une
 *  sélection de plusieurs objets (le menu commun « N objets ») */
export const TOUTE_LA_SELECTION = '*'

/** La vue d'une page neuve : 100 %, l'origine en haut à gauche */
export const VUE_NEUTRE = { x: 120, y: 120, z: 1 }
/** Le calme (voir App.calme) : tant de temps sans geste ni touche */
export const CALME = 1500

/** L'heure d'un événement du stylet (ms, horloge de performance.now()) : celle
 *  où le stylet a touché ce point, pas celle où on le traite. Un navigateur qui
 *  donnerait une autre horloge est ramené à maintenant. */
export function heureDe(e: Event): number {
  const maintenant = performance.now(), t = e.timeStamp
  return t > 0 && t <= maintenant + 100 ? t : maintenant
}

/** Ce qui est pris (App.selection) : un ensemble d'identifiants qui compte
 *  ses changements (version). Le cadre de taille de la sélection (lot 5,
 *  voir cadreDeLaSelection), relu à chaque mouvement de la souris et à
 *  chaque peinture de la couche directe, se garde tant que ce compte, la
 *  page, la vue et le pointeur n'ont pas changé : sur une page de 2000 mots
 *  toute prise, le recalculer à chaque fois doublait le temps d'un survol
 *  (la vérification du lot 5). */
export class SelectionSuivie extends Set<string> {
  version = 0
  add(id: string): this { if (!this.has(id)) this.version++; return super.add(id) }
  delete(id: string): boolean { const r = super.delete(id); if (r) this.version++; return r }
  clear(): void { if (this.size) this.version++; super.clear() }
}

/** Un bouton d'un message (voir Interface.message). cle : ce que l'action
 *  concerne (voir oublierAction) ; garder : le message reste après ce bouton
 *  (sans lui), avec les autres (« Aller à la page 5 » laisse « Annuler ») ;
 *  duree : le message reste au moins tant de ms (7 s sans rien dire ; le
 *  rappel d'enregistrer le classeur quitté en demande 30). */
export interface ActionMessage { libelle: string; faire: (e?: MouseEvent) => void; cle?: string; garder?: boolean; duree?: number }

export interface Interface {
  maj(): void
  editerFormule(latex: string, ecranX: number, ecranY: number): Promise<string | null>
  /** Un message en bas de l'écran ; avec une action (ou plusieurs), un
   *  bouton chacune à côté du texte, dans l'ordre */
  message(texte: string, action?: ActionMessage | ActionMessage[]): void
  /** Le message à action de cette clé n'a plus d'objet (la page que son
   *  « Annuler » rendait est revenue par Ctrl+Z) : il s'en va ; sans clé,
   *  quel qu'il soit */
  oublierAction(cle?: string): void
  /** Le menu du rôle du doigt (dessine, déplace, auto) */
  ouvrirReglageDoigt(): void
  /** Le menu de la Gomme (lot 5 : le trait entier, ou seulement là où elle
   *  passe, et sa taille) ; auClavier : le focus va sur l'entrée cochée */
  ouvrirMenuGomme(auClavier: boolean): void
  ouvrirMenuPartie(id: string, prise: Prise, clientX: number, clientY: number): void
  fermerMenuPartie(): void
  /** Le menu de la page (un clic droit dans le vide), posé au point de
   *  l'appui (clientX, clientY) ; m : ce point, dans le monde, où « Coller
   *  ici » colle */
  ouvrirMenuPage(clientX: number, clientY: number, m: P, auClavier?: boolean): void
  /** Ferme ce qui flotte au-dessus du tableau (un petit menu, le menu d'un
   *  morceau, le panneau d'options sauf garderOptions, la liste des
   *  instruments) ; vrai si quelque chose était ouvert */
  fermerMenus(garderOptions?: boolean): boolean
  /** Le clavier dans le menu complet (ou le menu d'un morceau) ouvert, comme
   *  dans le menu du système ; vrai si la touche était pour lui (elle ne
   *  pousse pas l'objet et ne déplace pas la vue derrière lui) */
  clavierMenu(e: KeyboardEvent): boolean
  /** Le focus sur la première entrée du menu complet ouvert (« Options »
   *  pressé au clavier, comme les petits menus ouverts au clavier) */
  entrerDansMenu(): void
  /** Ce qu'on voit du tableau entre les barres (coordonnées de la zone) */
  zoneLibre(): { x: number; y: number; l: number; h: number }
  /** Celle où se placent la pastille ↻ et la barre d'actions (sous
   *  l'étiquette de la séance, voir UI.zoneDuCadre) */
  zoneDuCadre(): { x: number; y: number; l: number; h: number }
  /** Des fichiers glissés sur le tableau (.memc, .memb, ou .mem, refusé) :
   *  comme « Ouvrir un classeur » */
  ouvrirFichiers(f: File[]): void
  /** On vient de changer de page : son numéro (et son nom) en grand, un
   *  instant, en haut de ce qu'on voit (voir App.allerPage) */
  annoncerPage(): void
  /** La trieuse des pages (Maj + P) ; auClavier : elle rend le focus au
   *  compteur en se fermant */
  ouvrirTrieuse(auClavier?: boolean): void
  /** L'aide et les raccourcis (outils de classe, touche « ? ») */
  ouvrirAide(): void
  /** La fenêtre « Envoyer vers… » de ce qui est pris (voir pages/envoi.ts) ;
   *  ids : d'autres objets que ce qui est pris (les images fixées en fond,
   *  que le menu de la page envoie : elles ne se prennent pas) */
  ouvrirEnvoi(ids?: string[]): void
  /** La fenêtre « Exporter en PDF » (voir sorties/export-pdf.ts) : la page
   *  (elle propose aussi tout le classeur), des pages, ou tout le classeur */
  exporterPdf(cible: { page: string } | { pages: string[] } | 'tout'): void
  /** Les séances (lot 6) : une écriture refusée sur une page d'une séance
   *  passée (la fenêtre « Cette page est dans la séance de lundi… ») ; une
   *  séance qui commence (le bandeau « Reprendre ») */
  ecritureSurSeancePassee?(page: string): void
  seanceCommencee?(precedente: SeanceDuClasseur | null): void
}

export type Geste =
  // pointeur : le seul qui la déplace (le doigt resté après un pincement) ;
  // toucher : le doigt « qui déplace » ; levé sans avoir glissé, il fait le
  // clic attendu (voir placement) ou choisit l'objet touché
  | { type: 'pan'; dernierX: number; dernierY: number; pointeur?: number; toucher?: boolean }
  // dist, cx, cy : l'écart et le centre des deux doigts au dernier pas de la
  // vue ; parti : la vue suit les doigts (voir bouge) ; depart : les deux
  // doigts et leur écart quand le pincement a commencé
  | { type: 'pinch'; dist: number; cx: number; cy: number; parti: boolean; depart: { a: DoigtPose; b: DoigtPose; dist: number } }
  // Le premier doigt d'un outil qui écrit dès l'appui, retenu un instant (voir
  // ecrireOuRetenir) : m et s, le point de l'appui (monde, écran) ; maj : Maj tenue
  | { type: 'retenu'; m: P; s: P; maj: boolean; pointeur: number; minuterie: number }
  // apresMenu : l'appui qui a commencé le trait fermait un menu ; levé sans
  // avoir glissé, il ne pose rien. surObjet : il est parti d'une figure ou
  // d'une formule (un double-clic peut suivre, voir mettreEnAttente).
  // second : il est peut-être le second toucher de ce double-clic (voir secondClic)
  | { type: 'dessin'; pointeur: number; apresMenu?: boolean; surObjet?: string; second?: boolean }
  | { type: 'segment'; x: number; y: number }
  | { type: 'rectangle' | 'cercle'; x: number; y: number }
  | { type: 'poignee'; prise: Prise; f: Figure; bouge: boolean }
  | { type: 'instrument'; nom: NomInstrument; quoi: Partie; depart: EtatInstrument; x: number; y: number; ecart: number; balayage: number; dernier: number }
  | { type: 'longer'; bord: Bord; t0: number }
  // stylet : le bout gomme du stylet, quel que soit l'outil en main ;
  // zone : la gomme qui efface là où elle passe (lot 5, voir Coupe)
  | { type: 'gomme'; effaces: Set<string>; stylet?: boolean; zone?: Coupe }
  // doigt : pris par le doigt « qui déplace » ; levé sans avoir glissé, il choisit l'objet touché.
  // retirer : Maj + clic sur un objet déjà sélectionné ; levé sans avoir glissé, il en sort (avec
  // son groupe). seul : un clic simple sur un membre du groupe qui est EXACTEMENT la sélection ;
  // levé sans avoir glissé, il ne prend que ce membre (glissé, tout le groupe a bougé)
  | { type: 'deplacer'; x: number; y: number; bouge: boolean; doigt?: boolean; retirer?: string[]; seul?: string }
  // Glisser depuis le vide, à l'outil Sélection : un cadre à la souris, un
  // lasso au stylet et au doigt (pts : le lasso, en monde, à plat). ajout :
  // Maj, Ctrl (⌘) ou le mode « Ajouter » ; ce qui est pris s'ajoute alors à la
  // sélection. candidat : l'objet que l'appui touchait sans le saisir
  // (l'intérieur d'une figure fermée, un tracé un peu loin) ; levé sans avoir
  // glissé, il le prend
  | { type: 'zone'; forme: 'cadre' | 'lasso'; x: number; y: number; pts: number[]; ajout: boolean; candidat?: string }
  | { type: 'formule' }
  // L'outil Texte : un clic (le texte s'allonge), ou un cadre glissé depuis (x, y) (sa largeur)
  | { type: 'texte'; x: number; y: number }
  // Le cadre de taille (lot 5, voir cadre.ts) : un coin ou un côté qu'on
  // tire (taille), la pastille ↻ qu'on tourne (tourner). cadre : celui de
  // l'appui ; pointeur : celui dont il a pris ses poignées ; ids : ce qui
  // change (la sélection libre, et les points repérés sur une image prise) ;
  // M : la transformation où l'on en est, que le rendu peint sans rien
  // écrire (voir Rendu.transfo) et que le lâcher écrit, en une étape.
  // bornes : les facteurs permis (voir bornesEchelle) ; image : une image
  // seule (Maj + coin la déforme). dernier, total : l'angle du pointeur au
  // dernier pas, et l'angle tourné depuis l'appui, déroulé.
  | { type: 'taille'; cadre: Cadre; quoi: 'coin' | 'cote'; i: number; pointeur: TypePointeur; ids: Set<string>; bornes: { min: number; max: number }; image: boolean; M: Matrice }
  | { type: 'tourner'; cadre: Cadre; pointeur: TypePointeur; ids: Set<string>; dernier: number; total: number; M: Matrice; sens: 'droite' | 'gauche' }
  // Rogner une image (voir rognage.ts) : la prise (un coin, un côté, la
  // partie gardée), la partie gardée à l'appui, et le point d'appui dans le
  // repère de l'image
  | { type: 'rogner'; prise: PriseRognage; depart: PartieGardee; u: P }

/** Un doigt posé, à l'écran */
export type DoigtPose = { id: number; x: number; y: number }

/** Le coup de la gomme qui efface là où elle passe (lot 5, voir gomme.ts),
 *  gardé en mémoire tant qu'elle n'a pas quitté ce qu'elle coupe : la
 *  dernière position de la gomme (monde), et, pour chaque trait touché
 *  (son identifiant d'origine), ses morceaux du moment (sous des
 *  identifiants de travail, id~n, stables pendant le geste : le cache des
 *  tracés du rendu sert), le compteur de ces identifiants, sa boîte
 *  d'origine (monde) et son épaisseur. Rien n'est écrit par mouvement : la
 *  coupe d'un trait s'écrit quand la gomme l'a quitté, et ce qui reste au
 *  lever (voir gommerLa et ecrireCoupe). */
export type Coupe = { dernier: P; traits: Map<string, { morceaux: Trait[]; n: number; boite: Boite; taille: number }> }

/** Un morceau d'une figure qu'on attrape : le nom d'un point, un sommet, le rayon */
export type Prise = { quoi: 'nom' | 'sommet'; i: number } | { quoi: 'rayon' }

export class App {
  readonly cam = new Camera()
  readonly rendu: Rendu
  ui!: Interface

  page = ''
  outil: Outil = 'stylo'
  couleur = COULEURS[0].valeur
  /** Le trait fin au démarrage (le choix du professeur, après le lot 5 ;
   *  avant, le moyen) : rien ne le garde d'une session à l'autre */
  taille = TAILLES[0].valeur
  /** L'épaisseur du Surligneur, la sienne (retouches après le lot 5) : son
   *  trait vaut cinq fois elle, et elle part moyenne, comme avant (22,5).
   *  Commune au Stylo, elle serait partie fine avec lui (12,5 : un filet qui
   *  ne couvre plus une ligne écrite) ; le professeur a voulu un trait fin,
   *  pas un surligneur fin. Les boutons d'épaisseur règlent celle de l'outil
   *  en main (voir tailleEnMain et choisirTaille). */
  tailleSurligneur = TAILLES[1].valeur
  aimant = false
  reconnaissance = true               // le stylo redresse les figures
  typeForme: TypeForme = 'rectangle'
  typeTrait: 'segment' | 'droite' | 'demi' = 'segment'      // ce que trace l'outil Segment
  /** Ce dont le menu complet est ouvert (clic droit, double-clic…, voir
   *  demanderOptions) : l'identifiant de l'objet seul sélectionné, ou
   *  TOUTE_LA_SELECTION pour le menu commun de plusieurs objets */
  options: string | null = null
  astuceOptions = false
  /** Le premier point d'un trait tracé en deux clics (le second clic le finit) */
  traitEnAttente: P | null = null
  selection: Set<string> = new SelectionSuivie()
  /** Un seul morceau choisi (un sommet, un nom…), sans la figure entière */
  partie: { id: string; prise: Prise } | null = null
  /** Une revue occupe l'écran : on ne relit pas le document et les raccourcis se taisent */
  enLecture = false
  /** Un mode où le prochain clic pose quelque chose (une construction…) */
  placement: { bouge(w: P): void; clic(w: P): void; annuler(): void } | null = null
  /** L'image qu'on rogne (voir rognage.ts) : son identifiant, sa page, la
   *  partie gardée ; null : on ne rogne rien */
  rognage: { id: string; page: string; partie: PartieGardee } | null = null
  outilAvant: Outil = 'stylo'      // l'outil que rend Échap depuis la Sélection
  /** La Sélection prêtée par une image (retouches après le lot 5 : son
   *  import, « Détacher l'image du fond ») : l'outil qu'on avait, et les
   *  images pour qui on l'a prise. « Fixer en fond » de l'une d'elles le
   *  rend (fixée, elle ne se prend plus : la Sélection ne sert plus, et le
   *  message dit d'écrire par-dessus). Tout choix d'outil l'oublie (voir
   *  choisirOutil et preterSelection). */
  selectionPretee: { avant: Outil; ids: Set<string> } | null = null
  survol: string | null = null

  formes: Forme[] = []
  /** Combien la page a de formes qui ne se prennent pas (verrouillées ou
   *  fixées en fond), et de verrouillées seulement (lot 5, voir rafraichir) */
  nonLibres = 0
  verrouilles = 0
  /** Le cadenas montré après un appui sur un verrouillé : il reste 1,5 s,
   *  même si le pointeur s'en va (voir appuiSurVerrouille) */
  cadenasTenu = false
  minuterieCadenas = 0
  /** Le rappel « Objet verrouillé : … » n'est dit qu'une fois par session */
  astuceVerrou = false
  /** La suite du message « Groupé : … », et celui d'un membre pris seul,
   *  ne sont dits qu'une fois par session (lot 5) ; le second attend un
   *  instant (voir direMembreSeul) */
  astuceGroupe = false
  astuceMembre = false
  minuterieMembre = 0
  /** La vue de chaque page (son centre et son zoom), retrouvée au rechargement */
  vues = new Map<string, Vue>()
  /** La page qu'on regardait au dernier passage (voir pageDeDepart) */
  pageSession: string | null = null
  pointeurs = new Map<number, { x: number; y: number; type: string }>()
  geste: Geste | null = null
  /** Le pointeur du dernier appui : les messages en parlent (« clic droit »
   *  ou non). Avant le premier appui, le doigt sur un écran tactile sans
   *  souris (un iPad), la souris ailleurs (voir pointeurDeDepart) */
  dernierPointeur: TypePointeur = pointeurDeDepart()
  /** Le dernier pointeur VU sur le tableau, son survol compris (lot 5) : la
   *  taille des poignées du cadre en dépend (voir POIGNEE et voirPointeur) */
  pointeurPoignees: TypePointeur = 'mouse'
  /** Le message du cadre d'une image (ses coins, ses côtés, sa pastille) n'est
   *  dit qu'une fois par session (voir direCadre) */
  astuceCadre = false
  /** « Cette gomme ne coupe que l'écriture… » n'est dit qu'une fois par
   *  session (lot 5, voir gommerLa) */
  astuceGommeZone = false
  /** Une coupe de la gomme qui efface là où elle passe s'écrit en ce moment
   *  (voir ecrireCoupe et rafraichir) */
  coupeEcrite = false
  /** Où et quand le geste en cours a commencé, et s'il est devenu un glisser */
  depart: Depart = nouveauDepart(0, 0, -1, 'mouse')
  /** Les paumes : posées sur l'écran, elles ne font rien jusqu'à leur lever */
  ignores = new Set<number>()
  espace = false
  dernierMouvement = 0        // pour savoir si le stylet est resté immobile
  /** Où la plume s'est posée ou a bougé pour la dernière fois (voir Immobilite) */
  immobilite = new Immobilite({ x: 0, y: 0 })
  /** L'heure de chaque point du trait en cours : le replay le retracera à ce rythme */
  heuresDuTrait: number[] = []
  polyEnCours: P[] | null = null
  minuterieForme = 0
  /** Le point d'encre d'un simple toucher du Stylo sur un objet : il attend
   *  300 ms un second toucher (le double-clic, qui ouvre les options de
   *  l'objet) avant d'être posé, et reste dessiné en attendant. heure : celle
   *  de son lever (Date.now()), que garde l'étape du film. */
  pointEnAttente: { trait: Trait; ms: number[]; heure: number; page: string; objet: string; x: number; y: number;
    minuterie: number } | null = null
  /** L'heure du dernier double appui traité : le dblclick du navigateur qui
   *  le suit ne refait rien */
  doubleTraite = -Infinity
  /** Le dernier quart de tour d'un clic sur la pastille ↻ : son heure et sa
   *  place à l'écran (un second clic juste après, au même endroit, tourne
   *  encore ; le dblclick du navigateur qui suit n'ouvre rien) */
  quartAuClic: { t: number; x: number; y: number; i: number } | null = null
  /** Le clic qui suit un double appui traité est encore à venir (voir brancherGestes) */
  clicFantome = false
  /** Le dernier simple toucher du doigt sur un objet (outil Sélection, ou
   *  doigt qui déplace) : un second, tout près et tout de suite, ouvre ses
   *  options (voir secondToucher) */
  toucherPrecedent: (Toucher & { objet: string; page: string }) | null = null
  /** Ce second toucher, posé : levé sans avoir glissé, il ouvre les options de l'objet */
  doubleEnCours: { objet: string; pointeur: number } | null = null
  /** L'appui long armé (voir armerAppuiLong) : le pointeur qui le tient,
   *  l'endroit de l'appui (fenêtre), et la minuterie qui ouvrira le menu */
  appuiLong: { pointeur: number; clientX: number; clientY: number; type: TypePointeur; minuterie: number } | null = null
  /** Le pointeur d'un appui long, et l'heure de son lever : le clic que le
   *  navigateur en tire ne fait rien (voir brancherGestes) */
  clicApresAppuiLong: { pointeur: number; leve: number } | null = null
  /** L'heure (performance.now()) où la touche Menu a ouvert un menu de MEM :
   *  le contextmenu que le navigateur en tire n'ouvre pas le sien (voir
   *  brancherGestes) ; 0 s'il est passé */
  toucheMenuA = 0
  /** Le toucher à deux ou trois doigts en cours (voir gesteDesDoigts) */
  toucherDoigts = new ToucherADoigts()
  /** La dernière poussée aux flèches : sa page, et l'étape de la pile de la
   *  page qu'elle a faite ou prolongée (voir pousser) */
  poussee: { page: string; etape: unknown } | null = null
  /** Le mode « Ajouter » au doigt (voir ajoutTactile). vu : la sélection a eu
   *  quelque chose depuis qu'il est allumé */
  ajout = { actif: false, vu: false }
  astuceAjout = false
  /** Une mise à jour de l'interface est déjà prévue après un changement de pile */
  private majPiles = false
  /** La dernière copie faite dans cet onglet (Ctrl+C, Ctrl+X) */
  copie: Copie | null = null
  /** Où sont allés les collages de la copie `cle` (son heure) : la place du
   *  dernier sur chaque page, et le pointeur d'alors (à la copie, puis à
   *  chaque collage). Trois Ctrl+V sans bouger la souris s'étagent. */
  collages: { cle: number; pointeur: { clientX: number; clientY: number } | null; pages: Map<string, P> } | null = null
  /** La copie que l'événement copy doit ranger (voir ecrireSysteme) */
  copieAEcrire: Copie | null = null
  copieEcrite = false
  /** L'heure de la dernière copie que le presse-papiers du système a
   *  refusée : Ctrl+V la colle quand même (voir surColler) */
  copieHorsSysteme = 0
  /** Ctrl+V attend l'événement paste ; s'il ne vient pas (un navigateur qui ne
   *  le donne pas hors d'un champ de saisie), la copie gardée se colle */
  collageAttendu = 0
  /** L'heure de la dernière copie : deux copies n'ont jamais la même */
  heureCopie = 0
  /** Les instruments posés (dans l'ordre d'empilement) et leur réglage */
  readonly instruments = new Map<NomInstrument, EtatInstrument>()
  /** Ce que la classe voit des instruments, noté pour le replay (voir piste.ts) */
  readonly piste: Piste
  /** Les calculatrices NumWorks vivantes de la page (voir calculatrice/vivantes.ts) */
  readonly calculatrices: Calculatrices
  /** La fin du dernier geste (performance.now()) : un appui ou un lever sur
   *  le tableau, une touche ; au départ, l'ouverture du classeur (voir calme) */
  finDuGeste = performance.now()

  /** classeur : le classeur ouvert (sa session, ses clés de stockage) */
  constructor(readonly tableau: Tableau, readonly zone: HTMLElement, readonly classeur: InfosClasseur = CLASSEUR_SEUL) {
    this.rendu = new Rendu(this.cam, zone)
    // Le contraste renforcé de cet appareil (lot 5) : à l'écran seulement
    this.rendu.contraste = reglages.contraste
    this.majPoignees()
    this.cam.x = VUE_NEUTRE.x; this.cam.y = VUE_NEUTRE.y
    const session = lireSession(this.cleSession)
    if (session) { this.vues = session.vues; this.pageSession = session.page }
    // Ce que la couche des instruments montre part dans la piste : les gestes,
    // le constructeur, ce qu'on montre ou range, l'état rendu au chargement
    this.piste = new Piste(m => tableau.noterPiste(m), () => tableau.pageVue)
    this.rendu.temoin = (i, a, t) => this.piste.peinture(i, a, t)
    // Le cadre de taille de ce qui est pris (lot 5) : relu juste avant chaque
    // peinture de la couche directe (seule l'App le pose)
    this.rendu.avantDirect = () => { this.rendu.cadre = this.cadreVu() }
    // Les boîtes des traits, en cache (lot 5) : le rectangle sale de la gomme
    // qui efface là où elle passe écarte vite ce qu'il n'a pas à repeindre
    this.rendu.boiteTrait = t => this.boiteDeForme(t)
    this.rendu.temoinDirect = t => this.piste.peintureDirect(t)
    // Les calculatrices NumWorks : la vraie calculatrice sur chaque image de
    // calculatrice, au-dessus de la scène et des formules, sous les instruments
    this.calculatrices = new Calculatrices(zone, zone.querySelector('.couche-instruments'), {
      cam: this.cam,
      page: () => this.page,
      formes: () => this.formes,
      vivante: () => !this.enLecture && !this.enSeancePassee,
      decalage: f => this.rendu.selection.has(f.id) && libre(f) && (this.rendu.decalage.dx || this.rendu.decalage.dy) ? this.rendu.decalage : null,
      transfo: f => this.rendu.transfo?.ids.has(f.id) ? this.rendu.transfo.m : null,
      ranger: (src, donnees) => { if (!this.banqueImages.has(src)) this.banqueImages.set(src, donnees) },
      ecran: (page, id, src) => this.tableau.ecranDeCalculatrice(page, id, src),
      retirer: id => { this.selection.delete(id); this.tableau.supprimer(this.page, [id]); this.ui.maj() },
      installer: m => this.installerCalculatrice(m),
      saisir: (id, type, e, client) => this.saisirCalculatrice(id, type, e, client),
    })
    this.rendu.apresFormules = () => this.calculatrices.placer()
    window.addEventListener('pagehide', () => this.piste.vider())

    tableau.pages.observeDeep(() => this.rafraichir())
    tableau.ordre.observe(() => this.verifierPage())
    // Les noms des pages changent sans qu'on change de page (la trieuse) : le
    // compteur « 3 / 7 · Exercice 12 p. 84 » les relit
    tableau.noms.observe(() => this.ui?.maj())
    // Les séances (lot 6) : un nom, un début changés (ici ou dans un autre onglet)
    tableau.seances.observe(() => this.ui?.maj())
    tableau.seanceDesPages.observe(() => this.verifierPage())
    // Une pile d'annulation a changé : ↶ et ↷ se remettent à jour, une fois,
    // juste après (voir Tableau.onPiles). Sans cela, ↶ resterait grisé après
    // ↷, après les flèches qui poussent la sélection, après le point d'un
    // simple toucher posé par sa minuterie, et ne se toucherait plus au doigt.
    tableau.onPiles = () => {
      if (this.majPiles) return
      this.majPiles = true
      queueMicrotask(() => { this.majPiles = false; this.ui?.maj() })
    }

    // Les séances (lot 6) : en service ; les séances passées se regardent
    // sans s'écrire (voir gardeSeance)
    tableau.seancesActives = true
    tableau.garde = (page, refaire) => this.gardeSeance(page, refaire)

    this.brancherGestes()

    // Les instruments vivent dans le document (ils restent où on les a
    // laissés), mais hors des pages : ni annulation, ni film.
    const posés = tableau.doc.getMap('instruments') as Y.Map<EtatInstrument & { visible: boolean }>
    const relire = () => {
      if (this.geste?.type === 'instrument') return
      for (const [nom, e] of posés) {
        if (e.visible) this.instruments.set(nom as NomInstrument, { x: e.x, y: e.y, a: e.a, r: e.r })
        else this.instruments.delete(nom as NomInstrument)
      }
      this.majInstruments()
    }
    posés.observe(relire)
    relire()

    // Les images : où trouver leurs pixels ; coller ou glisser un fichier
    this.rendu.pixels = src => this.pixels(src)
    this.rendu.rendreFormule = (latex, el) => katex.render(latex, el, { throwOnError: false, displayMode: false })
    window.addEventListener('paste', e => this.surColler(e))
    // La copie part dans le presse-papiers du système par execCommand('copy')
    // (voir ecrireSysteme), qui déclenche cet événement : on y range la
    // copie, en texte et marquée dans le HTML. Safari n'accepte « copy » sans
    // texte choisi sur la page que si beforecopy a été empêché. Une copie
    // ordinaire (du texte choisi dans une fenêtre) passe sans rien changer.
    document.addEventListener('beforecopy', e => { if (this.copieAEcrire) e.preventDefault() })
    document.addEventListener('copy', e => {
      const c = this.copieAEcrire
      if (!c || !e.clipboardData) return
      e.clipboardData.setData('text/plain', versTexte(c))
      e.clipboardData.setData('text/html', versHtml(c))
      e.preventDefault()
      this.copieEcrite = true
    })
    zone.addEventListener('dragover', e => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault() })
    zone.addEventListener('drop', e => {
      const fichiers = [...(e.dataTransfer?.files ?? [])]
      // Des classeurs (.memc), une bibliothèque (.memb, lot 4 C9), ou un film
      // élève (.mem) qu'on refusera avec une phrase claire : comme « Ouvrir
      // un classeur »
      const classeurs = fichiers.filter(x => /\.mem[cb]?$/i.test(x.name))
      if (classeurs.length) { e.preventDefault(); this.ui.ouvrirFichiers(classeurs); return }
      const f = fichiers.find(x => x.type.startsWith('image/') || estPdf(x))
      if (f) { e.preventDefault(); this.importerImage(f) }
    })

    // La vue : toucher le tableau arrête un cadrage en cours (en capture,
    // avant tout geste) ; le zoom au clavier se fait autour du pointeur
    // s'il est sur le tableau ; la session se note quand on quitte la page
    zone.addEventListener('pointerdown', () => this.arreterAnimation(), true)
    zone.addEventListener('pointermove', e => { this.pointeurSurZone = { clientX: e.clientX, clientY: e.clientY } })
    zone.addEventListener('pointerleave', () => {
      this.pointeurSurZone = null
      if (this.laser) this.bougerLaser(null)
      // Le cadenas du survol s'en va avec le pointeur (pas celui d'un appui)
      if (!this.cadenasTenu) this.poserCadenas(null)
    })
    window.addEventListener('pagehide', () => this.noterSession())
    // Un appui hors du tableau (un bouton, la revue qui s'ouvre…) pose tout
    // de suite le point d'encre qui attendait un double-clic
    document.addEventListener('pointerdown', e => { if (!zone.contains(e.target as Node)) this.viderPointEnAttente() }, true)
    window.addEventListener('pagehide', () => this.viderPointEnAttente())
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.noterSession() })
  }

  // ---------- Le pointeur laser (outils de classe) ----------
  // Un point rouge suit la souris, le survol de la tablette graphique ou le
  // doigt posé, pour montrer sans écrire ; derrière lui, une traînée qui
  // s'efface en une seconde. Il n'écrit rien, ne prend rien et ne passe pas
  // dans l'annulation. Il est peint dans la couche des instruments : la
  // piste le note comme un instrument, et les élèves le voient au replay (le
  // point seul, sans la traînée). Ce n'est pas un outil : il laisse l'outil
  // en main, qu'un outil choisi (un bouton, une lettre) ou Échap rendent.

  /** Le pointeur laser est-il en main ? */
  laser = false
  /** Le point qu'il montre (monde), null : le pointeur n'est pas sur le tableau */
  pointLaser: P | null = null
  animationLaser = 0

  /** Prend ou rend le pointeur laser */
  basculerLaser(oui = !this.laser) {
    if (oui === this.laser) return
    this.laser = oui
    this.pointLaser = null
    this.rendu.traineeLaser = []
    if (oui) {
      // Rien de ce que l'outil préparait ne reste à moitié fait
      this.viderPointEnAttente(); this.annulerPolygone(); this.annulerTrait()
      this.survol = null; this.rendu.survol = null; this.rendu.survolAussi = []
      this.zone.style.cursor = ''
    }
    this.zone.toggleAttribute('data-laser', oui)
    this.majInstruments()
    this.rendu.toutRedessiner()
    if (oui) this.ui?.message('Pointeur laser : survolez ou appuyez pour montrer. Échap ou un outil pour l\'arrêter.')
  }

  /** Les pages qu'on feuillette (lot 6) : celles de la séance de la page
   *  qu'on regarde (la séance du jour, ou une séance passée qu'on regarde en
   *  lecture) ; tout l'ordre sur un tableau sans séances */
  get pages() {
    const s = this.tableau.seanceDe(this.page) ?? this.tableau.derniereSeance()
    return s ? s.pages : this.tableau.ordre.toArray()
  }
  /** Les pages de la séance du jour (la trieuse, « Envoyer vers… ») */
  get pagesDuJour() {
    const s = this.tableau.derniereSeance()
    return s ? s.pages : this.tableau.ordre.toArray()
  }
  /** La séance de la page qu'on regarde (null : un tableau sans séances) */
  get seanceVue(): SeanceDuClasseur | null { return this.tableau.seanceDe(this.page) }
  /** On regarde une page d'une séance passée : en lecture (lot 6) */
  get enSeancePassee(): boolean {
    const s = this.seanceVue, d = this.tableau.derniereSeance()
    return !!s && !!d && s.id !== d.id
  }
  /** La dernière page de la séance du jour où l'on était : « Retour à
   *  aujourd'hui » y revient */
  pageDuJour = ''
  get fond(): Fond { return this.tableau.fondDe(this.page) }
  /** La page qu'on regarde est-elle en mode nuit (voir nuit.ts) ? */
  get nuit(): boolean { return this.tableau.nuitDe(this.page) }
  /** Un geste est en cours (un trait qu'on écrit, un objet qu'on glisse, un
   *  cadre, la vue qu'on déplace) ; pas le doigt retenu un instant, qui n'a
   *  encore rien fait (voir ecrireOuRetenir). La trieuse ne s'ouvre pas au
   *  milieu d'un geste. */
  get enGeste(): boolean { return !!this.geste && this.geste.type !== 'retenu' }

  /** Le calme : aucun geste en cours (pas même le doigt retenu un instant),
   *  aucun point d'un simple toucher du Stylo qui attend un éventuel second
   *  toucher (le double-clic qui ouvre les options), et 1,5 s depuis la fin
   *  du dernier geste ou de la dernière touche. Les écritures automatiques
   *  (la clé, le Drive, les aperçus, la réparation de la base) attendent le
   *  calme : elles peuvent prendre un moment au fil principal, jamais
   *  pendant un trait. Elles n'appellent JAMAIS poserCeQuiAttend : posé
   *  entre les deux appuis, le point ferait d'un double-clic au Stylo un
   *  point d'encre ; le point qui attend compte comme un geste en cours, et
   *  elles réessaient un peu plus tard. Seuls Ctrl + S, Enregistrer et le
   *  départ vers un autre classeur posent ce qui attend. */
  get calme(): boolean { return !this.geste && !this.pointEnAttente && this.depuisLeDernierGeste() >= CALME }

  /** Le tableau est chargé et l'on est sur la page de départ (voir
   *  allerPageDeDepart) : désormais, chaque changement de page s'annonce */
  pret = false
  astuceDernierePage = -Infinity

  // ---------- Les séances (lot 6) ----------
  /** Les écritures refusées sur une page d'une séance passée (voir
   *  gardeSeance), à refaire sur la copie si l'on choisit « Reprendre et
   *  écrire » : la page d'où elles viennent, et chacune */
  retenues: { page: string; refaire: ((page: string) => void)[] } | null = null

  /** « Copier dans la séance d'aujourd'hui » (une page d'une séance passée,
   *  en lecture) : ce qui est pris est copié (comme Ctrl+C), puis collé sur la
   *  page de la séance du jour où l'on était, à la même place */
  copierVersAujourdhui(formes: Forme[] = this.objetsChoisis()): boolean {
    if (this.enLecture || !this.enSeancePassee) return false
    if (!formes.length) { this.ui.message('Rien n\'est sélectionné.'); return false }
    if (!this.copier(false, formes)) return false
    const c = this.copie!
    this.retourAujourdhui()
    if (this.enSeancePassee) return false
    this.collerCopie(c, { ...c.centre })
    this.ui.message(`Copié dans la page ${this.pages.indexOf(this.page) + 1}`)
    return true
  }

  /** Passe la page qu'on regarde en mode nuit, ou la remet de jour (le
   *  bouton lune, la touche N) : comme un changement de fond, une étape du
   *  film notée sur elle (le replay des élèves la voit basculer). Rien
   *  d'autre ne change : l'écriture garde ses couleurs, qui s'affichent
   *  autrement (voir nuit.ts). */
  basculerNuit(nuit = !this.nuit) {
    this.tableau.changerNuit(this.page, nuit)
  }

  /** Ce qui était pris quand une transformation s'est écrite (la taille ou
   *  la rotation au cadre, un quart de tour, « Remettre droit » : voir
   *  noterTransformation), par étape d'annulation (retouches après le lot 5) */
  prisesDesTransformations = new WeakMap<EtapeDePile, string[]>()

  // ---------- La vue ----------
  /** Le cadrage en cours (requestAnimationFrame), et où il mène */
  animation = 0
  cible: { x: number; y: number; z: number } | null = null
  /** Le dernier endroit du pointeur sur le tableau (null : il est ailleurs) */
  pointeurSurZone: { clientX: number; clientY: number } | null = null
  /** Safari sur Mac pince par gesturechange : la molette ne zoome pas en double */
  pinceSafari = false
  minuterieSession = 0
  /** Le tableau du navigateur vient d'être remplacé (ici ou dans un autre
   *  onglet) : jusqu'au rechargement, plus rien ne s'écrit dans la session */
  sessionArretee = false
  /** Les boîtes des formes (une forme modifiée est un nouvel objet) */
  boites = new WeakMap<Forme, Boite | null>()

  /** La boîte de ce qui est écrit (null : rien). Une droite compte par ses deux
   *  points, pas par son étendue à l'écran, qui dépend de la vue. */
  boiteDuContenu(formes: Iterable<Forme> = this.formes): Boite | null {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (const f of formes) {
      const b = this.boiteVue(f)
      if (!b) continue
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
    }
    return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
  }

  /** La clé de la session de ce classeur : 'mem-session' pour le premier */
  get cleSession() { return cleDuClasseur(this.classeur, CLE_SESSION) }

  /** La boîte que veut touche() (geometrie.ts) : celle du rendu, et pour une
   *  formule sa boîte locale (touche la tourne elle-même) ; une droite garde
   *  son étendue à l'écran */
  boiteTouche = (g: Forme) => (g.type === 'formule' ? this.rendu.boiteFormule(g) : this.rendu.boite(g))

  // ---------- Le rôle du doigt ----------
  /** Le doigt déplace la vue et sélectionne ; le stylet seul écrit */
  get doigtDeplace(): boolean { return leDoigtDeplace() }

  // ---------- Le mode « Ajouter » au doigt ----------
  /** Allumé (par le bouton « Ajouter » de la barre d'actions), un toucher sur
   *  un objet l'ajoute à la sélection ou l'en retire, comme Maj + clic, et un
   *  lasso s'y ajoute : sur une tablette, on n'a pas de touche Maj. Il
   *  s'éteint au toucher dans le vide, à Échap, à un autre outil, à une autre
   *  page, et quand la sélection se vide. */
  get ajoutTactile(): boolean {
    const a = this.ajout
    if (a.actif) {
      if (this.selection.size) a.vu = true
      else if (a.vu) a.actif = false          // la sélection s'est vidée
    }
    return a.actif
  }

  abandonnerGeste(g: Geste | null = this.geste) {
    this.desarmerAppuiLong()
    if (g?.type === 'retenu') clearTimeout(g.minuterie)
    if (g?.type === 'dessin') { clearTimeout(this.minuterieForme); this.rendu.monTrait = null; this.heuresDuTrait = [] }
    if (g?.type === 'segment') { this.rendu.monSegment = null; this.rendu.apercu = null; this.rendu.cible = null }
    if (g?.type === 'rectangle' || g?.type === 'cercle') this.rendu.apercu = null
    if (g?.type === 'poignee') this.rendu.remplacement = null
    if (g?.type === 'longer' || g?.type === 'instrument') {
      this.rendu.apercu = null; this.rendu.mesure = null
      this.piste.trace(null)
      if (g.type === 'instrument') { this.instruments.set(g.nom, g.depart); this.majInstruments() }
    }
    if (g?.type === 'zone') { this.rendu.cadreSelection = null; this.rendu.lasso = null }
    if (g?.type === 'deplacer') this.rendu.decalage = { dx: 0, dy: 0 }
    if (g?.type === 'gomme') this.finirGomme(g)
    // Le cadre de taille : tout revient comme avant l'appui, rien n'est écrit
    if (g?.type === 'taille' || g?.type === 'tourner') this.finirCadre()
    this.geste = null
    this.rendu.toutRedessiner()
  }

  // ---------- Traits (segment, droite, demi-droite) ----------
  astuceDeuxClics = false

  // ---------- Images ----------
  cachePixels = new Map<string, HTMLImageElement>()

  get banqueImages() { return this.tableau.doc.getMap('images') as Y.Map<string> }

  /** Une image montrée sans ses pixels (une séance déplacée d'un autre
   *  classeur avant le 28 octobre 2026 : ses images y étaient restées) :
   *  on les cherche, une fois par classeur ouvert (voir
   *  Fichiers.retrouverImages), et la page se redessine quand elles arrivent */
  chercherImages: (() => Promise<boolean | null>) | null = null
  imagesCherchees = false

  /** La calculatrice qu'un appui sur son corps vient de prendre (voir saisirCalculatrice) */
  calculatriceSaisie: string | null = null

  /** Un geste est-il en mouvement : deux doigts posés (un pincement), ou un
   *  appui qui a passé son seuil (un objet qu'on glisse, un cadre ou un
   *  lasso qu'on tire, la vue qu'on déplace, un instrument) ? La barre
   *  d'actions se cache alors, et revient au lâcher : elle ne flotte pas
   *  au-dessus d'un objet qui part, ni d'un lasso qui l'entoure. Un appui
   *  qui n'a pas encore glissé la laisse : un clic sur un objet la montre
   *  tout de suite. */
  get enMouvement(): boolean {
    const g = this.geste
    return !!g && (g.type === 'pinch' || this.depart.parti)
  }

  // ---------- Protéger : verrouiller, fixer en fond (lot 5) ----------
  /** Verrouiller (oui) ou déverrouiller ces objets (ce qui est pris par
   *  défaut : les points repérés sur une image choisie suivent son sort) :
   *  UNE transaction notée « réglage » (un Ctrl+Z, une étape du film qui ne
   *  change rien à l'image : ni un geste de la revue, ni une séance, ni une
   *  étape du film élève ; voir Etape). Le menu ouvert se ferme. Verrouillés,
   *  ils ne se prennent plus : la sélection se vide, et le message dit
   *  comment les déverrouiller, dans les mots du pointeur. Déverrouillés, ils
   *  deviennent la sélection (ils se prennent de nouveau). Rien à changer,
   *  ou le tableau caché : rien, et faux. */
  verrouiller(oui: boolean, ids: Iterable<string> = this.objetsChoisis().map(f => f.id)): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    // Tout le groupe de chacun, quel que soit son état (lot 5, voir porteurs) :
    // verrouiller un membre pris seul verrouille son groupe, qui n'est
    // jamais à moitié verrouillé
    const changements = changementsVerrou(this.formes, porteurs(this.formes, ids), oui)
    if (!changements.length) return false
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.options = null
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements, { note: 'reglage' })
    // Le message compte les objets, pas les points repérés sur une image
    // qui change avec eux
    const changes = new Set(changements.map(c => c.id))
    const n = compterObjets(this.formes.filter(f => changes.has(f.id)))
    this.selection.clear()
    if (!oui) for (const id of changes) this.selection.add(id)
    this.rendu.redessinerDirect(); this.ui.maj()
    const rappel = messageVerrou(this.dernierPointeur)
    if (oui) this.ui.message(n === 1 ? `Verrouillé : il ne bouge plus. ${rappel}` : `${n} objets verrouillés. ${rappel}`)
    else this.ui.message(n === 1 ? 'Déverrouillé' : `${n} objets déverrouillés`)
    return true
  }

  /** « Fixer en fond » (le menu ⋯ d'une image, le message de l'import) :
   *  ces images passent sous tout le reste et ne se prennent plus (voir
   *  changementsFixer : sous tout, hors de tout groupe, sans verrou). Ce
   *  n'est pas un réglage : cela se voit (l'image passe sous ce qui la
   *  recouvrait). Un Ctrl+Z la rend. La sélection se vide ; le message dit
   *  comment la détacher pour la tourner ou la déplacer (voir messageFixe),
   *  dans les mots du pointeur (celui du clic sur le bouton du message ou
   *  sur l'entrée du menu). Fixer une image pour qui la Sélection était
   *  prêtée (son import, « Détacher l'image du fond » : retouches après le
   *  lot 5) rend l'outil qu'on avait : le message dit d'écrire par-dessus,
   *  et l'on écrit (avant, le trait restait un lasso). La Sélection choisie
   *  reste ; le message dit alors comment reprendre le Stylo. */
  fixerEnFond(ids: Iterable<string>, pointeur: TypePointeur = this.dernierPointeur): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    const changements = changementsFixer(this.formes, ids)
    if (!changements.length) return false
    this.ui.fermerMenuPartie()
    if (this.partie) this.choisirPartie(null)
    this.options = null
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements)
    this.selection.clear()
    const pretee = this.outil === 'selection' ? this.selectionPretee : null
    if (pretee && changements.some(c => pretee.ids.has(c.id))) this.choisirOutil(pretee.avant)
    this.rendu.redessinerDirect(); this.ui.maj()
    // Le message dit aussi qu'on la tourne (ou la déplace) après « Détacher
    // l'image du fond » : fixée, elle n'a ni cadre ni pastille ↻
    this.ui.message(messageFixe(pointeur, changements.length, undefined, this.outil === 'selection'))
    return true
  }

  /** « Détacher l'image du fond » (le menu de la page) : elles ne sont plus
   *  fixées, et restent sous les autres images, au-dessus de celles qui
   *  restent fixées (voir changementsDetacher : l'invariant du fond tient).
   *  On passe à l'outil Sélection, prêtée comme à l'import (voir
   *  preterSelection : la touche de l'outil d'avant le rend, et « Fixer en
   *  fond » aussi) et elles deviennent la sélection : on peut aussitôt les
   *  déplacer, les agrandir, les tourner. Le message le dit, et comment
   *  reprendre l'outil (voir messageDetache), dans les mots du pointeur
   *  (celui du clic sur l'entrée du menu). Un Ctrl+Z les refixe. */
  detacherDuFond(ids: Iterable<string>, pointeur: TypePointeur = this.dernierPointeur): boolean {
    if (tableauCache(this)) return false
    this.viderPointEnAttente()
    const changements = changementsDetacher(this.formes, ids)
    if (!changements.length) return false
    this.ui.fermerMenus()
    this.tableau.nouveauGeste()
    this.tableau.modifier(this.page, changements)
    const avant = this.preterSelection(changements.map(c => c.id))
    this.selection.clear()
    for (const c of changements) this.selection.add(c.id)
    this.rendu.redessinerDirect(); this.ui.maj()
    this.ui.message(messageDetache(pointeur, avant, changements.length, undefined, this.typeForme))
    return true
  }

  // ---------- Changer de taille, tourner (lot 5) ----------
  /** La taille d'une formule (sa boîte locale, mesurée à l'écran) */
  mesureFormule = (f: Formule): { l: number; h: number } => { const b = this.rendu.boiteFormule(f); return { l: b.l, h: b.h } }

  /** Le dernier cadre calculé par cadreDeLaSelection, et ce dont il dépend */
  cadreRetenu: { sel: Set<string>; version: number; formes: Forme[]; cle: string; formules: [Formule, number, number][]; cadre: Cadre | null } | null = null

  /** Le cadre de ce qui est pris (pris : les formes sélectionnées de la
   *  page), calculé sans rien demander à l'outil ni au geste (voir
   *  cadreDeLaSelection, qui le montre, et tournable, qui en prend le
   *  centre) : null si quelque chose n'y est pas libre, ou s'il n'y en a
   *  pas (un point seul, un cercle entier). Les points repérés sur une
   *  image prise la suivent sans changer son cadre. */
  calculerCadre(pris: Forme[], zl = this.ui?.zoneDuCadre() ?? { x: 0, y: 0, l: this.rendu.l, h: this.rendu.h }): Cadre | null {
    if (!pris.length || !pris.every(libre)) return null
    const cam = this.cam, sel = this.selection
    const formes = pris.filter(f => !((f.type === 'polygone' || f.type === 'cercle') && f.lie && sel.has(f.lie)))
    const a = cam.versMonde(zl.x, zl.y)
    return cadreDe(formes, {
      boite: f => this.boiteVue(f), mesure: this.mesureFormule, z: cam.z, pointeur: this.pointeurPoignees,
      zoneLibre: { x: a.x, y: a.y, l: zl.l / cam.z, h: zl.h / cam.z },
    })
  }

  /** Ctrl+C : la copie est gardée en mémoire (cet onglet), dans le navigateur
   *  (un autre onglet de la même adresse) et dans le presse-papiers du
   *  système (la version en ligne et la version hors ligne). Rien de choisi : on
   *  le dit, et faux (le navigateur fait alors sa copie ordinaire). formes :
   *  ce qu'on copie, ce qui est pris par défaut (le menu de la page copie
   *  les images fixées en fond, qui ne se prennent pas). La copie garde le
   *  verrou et le fond (lot 5 : voir collage). */
  copier(dire = true, formes = this.objetsChoisis()): boolean {
    if (this.enLecture) return false
    const c = formes.length ? this.faireCopie(formes) : null
    if (!c) { this.ui.message('Rien n\'est sélectionné.'); return false }
    this.copie = c
    // Le pointeur d'au moment de la copie : s'il n'a pas bougé, Ctrl+V ne
    // colle pas sous lui (ce serait sur l'objet même), mais à côté
    this.collages = { cle: c.t, pointeur: this.pointeurSurZone && { ...this.pointeurSurZone }, pages: new Map() }
    this.garderCopie(c)
    this.ecrireSysteme(c)
    const n = c.formes.length
    if (dire) this.ui.message(n === 1 ? '1 objet copié' : `${n} objets copiés`)
    return true
  }

  /** Origine du repère de la page (pour les transformations), si elle en a un */
  get origineRepere(): P | null { return this.fond === 'repere' ? this.tableau.origineDe(this.page) : null }

  // ---------- Textes ----------
  /** Le texte qu'on tape (voir texte-editeur.ts) : son éditeur, la page où
   *  il s'écrit, le texte qu'il modifie (null : un texte neuf), et où il se
   *  pose */
  edition: { ed: EditeurTexte; page: string; f: Formule | null; x: number; y: number; largeur?: number; couleur: string } | null = null

  /** On tape un texte en ce moment ? */
  get enTrainDeTaper(): boolean { return !!this.edition }
}

// Les méthodes rangées dans app/, par sujet : elles s'ajoutent à la classe
// (même comportement que si elles y étaient écrites).
type MethodesInstruments = typeof methodesInstruments
type MethodesPages = typeof methodesPages
type MethodesVue = typeof methodesVue
type MethodesAppuis = typeof methodesAppuis
type MethodesDoigts = typeof methodesDoigts
type MethodesFigures = typeof methodesFigures
type MethodesImages = typeof methodesImages
type MethodesObjets = typeof methodesObjets
type MethodesGroupes = typeof methodesGroupes
type MethodesClavier = typeof methodesClavier
export interface App extends MethodesInstruments, MethodesPages, MethodesVue, MethodesAppuis, MethodesDoigts, MethodesFigures, MethodesImages, MethodesObjets, MethodesGroupes, MethodesClavier {}
ajouterMethodes(App, methodesInstruments, methodesPages, methodesVue, methodesAppuis, methodesDoigts, methodesFigures, methodesImages, methodesObjets, methodesGroupes, methodesClavier)

/** Ce que dit une commande d'ordre qui n'a rien à faire */
export const RIEN_A_ORDONNER: Record<Sens, string> = {
  premier: 'Déjà au premier plan',
  arriere: 'Déjà à l\'arrière-plan',
  avancer: 'Rien à passer devant à cet endroit',
  reculer: 'Rien à passer derrière à cet endroit',
}

/** La boîte qui contient deux boîtes (l'une peut manquer) */
export function union(a: Boite | null, b: Boite | null): Boite | null {
  if (!a || !b) return a ?? b
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y)
  return { x, y, l: Math.max(a.x + a.l, b.x + b.l) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }
}

/** Où l'on attrape un cercle pour changer son rayon : en haut à droite */
export function poigneeDuRayon(f: { x: number; y: number; r: number }): P {
  return { x: f.x + f.r * Math.SQRT1_2, y: f.y - f.r * Math.SQRT1_2 }
}

/** Le cadre glissé à l'outil Texte, de son départ au pointeur (monde) */
export function cadreDuTexte(g: { x: number; y: number }, m: P): Boite {
  return { x: Math.min(g.x, m.x), y: Math.min(g.y, m.y), l: Math.abs(m.x - g.x), h: Math.abs(m.y - g.y) }
}
