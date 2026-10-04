// =============================================================
// LES FORMES DU TABLEAU
// Une forme est un simple objet JSON. C'est ce qui permet de la
// ranger telle quelle dans le document Yjs : elle se synchronise,
// s'annule et s'enregistre sans code supplémentaire.
// Coordonnées en « unités monde » : 40 unités = 1 cm.
// =============================================================

export const CM = 40

export type Fond = 'blanc' | 'carreaux' | 'seyes' | 'repere'
export const FONDS: { id: Fond; nom: string }[] = [
  { id: 'blanc', nom: 'Page blanche' },
  { id: 'carreaux', nom: 'Petits carreaux' },
  { id: 'seyes', nom: 'Seyès' },
  { id: 'repere', nom: 'Repère' },
]

export type Outil = 'stylo' | 'surligneur' | 'gomme' | 'segment' | 'forme' | 'formule' | 'selection' | 'main'

/** Ce que trace l'outil « Formes » */
export type TypeForme = 'rectangle' | 'cercle' | 'polygone'

interface Base {
  id: string
  x: number
  y: number
  z: number          // ordre d'empilement (horodatage)
  auteur: string     // identifiant du client qui l'a posée
}

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
}

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
}

export type Forme = Trait | Segment | Formule | Polygone | Cercle | ImageForme
export type Figure = Polygone | Cercle

export type Role = 'prof' | 'eleve'

/** Ce que chaque participant diffuse en direct (non enregistré) */
export interface Presence {
  nom: string
  role: Role
  couleur: string
  page?: string
  vue?: { cx: number; cy: number; l: number; h: number }   // zone visible, en monde
  curseur?: { x: number; y: number } | null
  direct?: { pts: number[]; couleur: string; taille: number; opacite: number; pression: boolean } | null
}

export function uid(): string {
  // crypto.randomUUID n'existe pas en http:// sur le réseau local de la classe
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5)
}
