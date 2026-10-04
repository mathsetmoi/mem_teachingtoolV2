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

export type Outil = 'stylo' | 'surligneur' | 'gomme' | 'segment' | 'formule' | 'selection' | 'main'

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

/** Segment droit de (x, y) à (x + dx, y + dy) */
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

export type Forme = Trait | Segment | Formule

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
