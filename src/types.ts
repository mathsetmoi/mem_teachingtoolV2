// =============================================================
// LES FORMES DU TABLEAU
// Une forme est un simple objet JSON. C'est ce qui permet de la
// ranger telle quelle dans le document Yjs : elle s'annule et
// s'enregistre sans code supplémentaire.
// Coordonnées en « unités monde » : 40 unités = 1 cm.
// =============================================================

export const CM = 40

/** Le fond d'une page. Les quatre derniers sont du lot 5 : des valeurs
 *  nouvelles d'un champ qui existait ; une version d'avant, ou un lecteur
 *  élève d'avant, ne les connaît pas et peint alors le papier blanc seul,
 *  sans erreur (aucun fond n'est validé à la lecture, voir fonds.ts). */
export type Fond = 'blanc' | 'carreaux' | 'seyes' | 'repere' | 'grands-carreaux' | 'millimetre' | 'pointe' | 'iso'
/** Les fonds, dans l'ordre des menus (la barre du haut, la trieuse) */
export const FONDS: { id: Fond; nom: string }[] = [
  { id: 'blanc', nom: 'Page blanche' },
  { id: 'carreaux', nom: 'Petits carreaux' },
  { id: 'grands-carreaux', nom: 'Grands carreaux (1 cm)' },
  { id: 'seyes', nom: 'Seyès' },
  { id: 'millimetre', nom: 'Papier millimétré' },
  { id: 'pointe', nom: 'Papier pointé' },
  { id: 'iso', nom: 'Réseau isométrique' },
  { id: 'repere', nom: 'Repère' },
]
/** Le fond de toute page qui naît vide : la page blanche (le choix du
 *  professeur, après le lot 5 ; avant, les petits carreaux). Le bouton
 *  Nouvelle page, « › » sur la dernière page, la première page d'un
 *  classeur neuf (ou d'une base vide), une page insérée ou ajoutée dans la
 *  trieuse, celle qu'ouvre « Envoyer vers… une nouvelle page » : toutes
 *  partent de lui, quel que soit le fond de la page qu'on regarde. Une page
 *  dupliquée garde le sien (c'est une copie) ; les pages qui existent déjà
 *  ne changent pas. */
export const FOND_NEUF: Fond = 'blanc'

export type Outil = 'stylo' | 'surligneur' | 'gomme' | 'point' | 'segment' | 'forme' | 'formule' | 'texte' | 'selection' | 'main'

/** Ce que trace l'outil « Formes » */
export type TypeForme = 'rectangle' | 'cercle' | 'polygone'

interface Base {
  id: string
  x: number
  y: number
  z: number          // ordre d'empilement (horodatage)
  auteur: string     // identifiant du client qui l'a posée
  /** Verrouillé (lot 5) : l'objet ne bouge plus et ne se prend plus, ni au
   *  clic, ni au cadre, ni au lasso, ni à la gomme ; seul son menu (clic
   *  droit, bouton du stylet, appui long) s'ouvre encore, pour le
   *  déverrouiller. Absent : libre, comme avant. */
  verrou?: true
  /** Fixé en fond (lot 5) : une image qui passe sous tout le reste et ne se
   *  prend plus du tout ; on écrit et on entoure par-dessus, la gomme ne
   *  l'efface pas, et c'est le menu de la page qui la détache. N'a de sens
   *  que pour une image (ailleurs, la liste blanche du presse-papiers le
   *  jette). */
  fixe?: true
  /** Le groupe (lot 5) : les formes d'une page qui portent le même
   *  identifiant, au moins deux et dans le même état (libres, ou non), se
   *  prennent, se déplacent et se copient ensemble. Un seul niveau : grouper
   *  des groupes les fond en un. Un groupe ne vaut que sur sa page. */
  groupe?: string
}

// Ces trois champs, comme la rotation d'une formule, sont FACULTATIFS : un
// tableau d'avant le lot 5 n'en a pas, et la version d'avant (fdf3f72) les
// ignore sans dommage (un objet verrouillé s'y déplace, une formule tournée
// y paraît droite). Aucun ne change le sens d'un champ qui existe.

/** Tracé à main levée : points relatifs à (x, y), à plat [x, y, pression, …] */
export interface Trait extends Base {
  type: 'trait'
  pts: number[]
  couleur: string
  taille: number
  opacite: number
  pression: boolean   // vraie pression du stylet, sinon simulée
}

/** Ce qui habille une figure géométrique : réglé dans le panneau d'options. */
export interface Habillage {
  couleur: string
  taille: number
  tirets?: boolean
  fond?: string | null       // couleur de remplissage, posée en transparence
  noms?: string[]            // noms des sommets (ou du centre d'un cercle)
  sommets?: boolean          // afficher les sommets et leurs noms
  /** Où est posé chaque nom, par rapport à son point (null : place automatique) */
  posNoms?: ({ x: number; y: number } | null)[]
  /** Réglages propres à chaque point (sommet, extrémité, centre) */
  stylePoints?: (StylePoint | null)[]
  /** Réglages propres à chaque nom */
  styleNoms?: (StyleNom | null)[]
  codage?: boolean           // afficher côtés égaux et angles droits
  /** L'image sur laquelle ce point (ou ce polygone) a été repéré : il la suit */
  lie?: string
  /** Le tracé à main levée d'origine, si la figure a été reconnue */
  brut?: { pts: number[]; taille: number; pression: boolean }
}

export type MarquePoint = 'aucun' | 'point' | 'croix' | 'plus' | 'rond'
export type Bout = 'aucun' | 'fleche' | 'trait' | 'crochet'
export interface StylePoint {
  marque?: MarquePoint     // dessin du point (sans réglage : un point si les sommets sont affichés)
  bout?: Bout              // extrémité d'une ligne ouverte : flèche, trait, crochet
  couleur?: string
  taille?: number          // 1 = taille normale
}
export interface StyleNom {
  couleur?: string
  taille?: number          // taille de police, en unités monde (22 par défaut)
  droit?: boolean          // caractères droits plutôt qu'italiques
  cache?: boolean
}

/** Polygone ou ligne brisée : sommets relatifs à (x, y), à plat [x, y, …].
 *  Un segment est un polygone ouvert à deux sommets. */
export interface Polygone extends Base, Habillage {
  type: 'polygone'
  pts: number[]
  ferme: boolean
  /** Deux points seulement : la droite (AB), ou la demi-droite [AB) */
  prolonge?: 'droite' | 'demi'
}

/** Cercle de centre (x, y) — ou arc, tracé au compas, de l'angle a0 à a1 */
export interface Cercle extends Base, Habillage {
  type: 'cercle'
  r: number
  arc?: { a0: number; a1: number }     // radians, dans le sens du tracé (a1 < a0 possible)
}

/** Ancien segment (v0.1), encore lu pour les tableaux déjà enregistrés */
export interface Segment extends Base {
  type: 'segment'
  dx: number
  dy: number
  couleur: string
  taille: number
}

/** Formule LaTeX rendue par KaTeX, coin haut-gauche en (x, y) */
export interface Formule extends Base {
  type: 'formule'
  latex: string
  couleur: string
  taille: number      // taille de police en unités monde
  /** La formule tournée (lot 5), en radians, dans le sens de ctx.rotate
   *  (horaire à l'écran), autour de son coin (x, y) : sa place ne dépend que
   *  de (x, y) et de l'angle, jamais de la mesure de KaTeX. Absent : 0. Une
   *  formule seule garde sa rotation dans un champ (le texte reste vectoriel,
   *  net à tout zoom) ; tout le reste « cuit » la sienne dans ses
   *  coordonnées. */
  rotation?: number
  /** Un texte tapé au clavier (l'outil Texte) : ses lignes, chacune faite de
   *  morceaux (du texte, en gras, en italique, souligné, d'une couleur, ou
   *  une formule entre $…$). Facultatif : sans lui, c'est une formule. Le
   *  champ latex garde alors une version KaTeX du même texte, qu'une version
   *  d'avant affiche (voir texte.ts). */
  texte?: LigneTexte[]
  /** La largeur choisie d'un texte (unités monde, sa marge comprise) : il passe
   *  à la ligne tout seul. Absente : une ligne aussi longue qu'il faut. */
  largeur?: number
}

/** Un morceau d'une ligne d'un texte : t, ce qui est écrit (le LaTeX d'une
 *  formule si f) ; g gras, i italique, s souligné ; c sa couleur, quand ce
 *  n'est pas celle du texte */
export interface MorceauTexte { t: string; g?: true; i?: true; s?: true; c?: string; f?: true }
/** Une ligne d'un texte ; puce : elle commence par une puce (•) */
export interface LigneTexte { morceaux: MorceauTexte[]; puce?: true }

/** Image importée. Le coin (x, y) et la matrice m = [a, b, c, d] placent le
 *  point (u, v) de l'image (en pixels) en (x + a·u + c·v, y + b·u + d·v) :
 *  c'est ce qui permet de la tourner, l'agrandir ou la retourner (symétrie).
 *  Les données sont rangées à part, sous l'identifiant `src` : un symétrique
 *  ne recopie pas l'image, il la reprend. */
export interface ImageForme extends Base {
  type: 'image'
  src: string
  l: number          // largeur, en pixels de l'image
  h: number
  m: [number, number, number, number]
  /** Une calculatrice NumWorks (voir calculatrice/) : l'image est son dessin,
   *  avec l'écran tel que la classe l'a vu en dernier ; à l’écran, la vraie
   *  calculatrice se pose par-dessus. Facultatif : sans lui, une image ; une
   *  version d'avant, le lecteur d'avant, la montrent comme une image. */
  calculatrice?: ModeleCalculatrice
}

/** Les deux calculatrices NumWorks : la graphique (lycée), la scientifique (collège) */
export type ModeleCalculatrice = 'lycee' | 'college'

export type Forme = Trait | Segment | Formule | Polygone | Cercle | ImageForme
export type Figure = Polygone | Cercle

/** Ce qui se prend, se gomme, se pousse : un objet ni verrouillé ni fixé en fond */
export function libre(f: Forme): boolean { return !f.verrou && !f.fixe }

export function uid(): string {
  // crypto.randomUUID n'existe pas en http:// sur le réseau local de la classe
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5)
}
