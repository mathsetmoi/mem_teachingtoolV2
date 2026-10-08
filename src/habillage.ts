// =============================================================
// L'HABILLAGE DE PLUSIEURS OBJETS, LA TAILLE D'UNE FORMULE
// Le menu commun d'une sélection de plusieurs objets ne propose que ce
// que le code sait déjà appliquer à chacun : la couleur (tout, sauf une
// image), l'épaisseur (les traits, les figures, les anciens segments),
// les pointillés (les figures). Un choix est marqué actif quand TOUS les
// objets qu'il concerne l'ont déjà : on voit d'un coup d'œil si les dix
// objets choisis sont tous rouges. Rien ici ne touche à la page : les
// tests le vérifient sous Node.
// =============================================================
import type { Forme } from './types'

/** Les trois tailles d'une formule (en unités monde ; 28 à la pose) */
export const TAILLES_FORMULE = [
  { nom: 'Petite', titre: 'Petits caractères', valeur: 20 },
  { nom: 'Normale', titre: 'Caractères de taille normale', valeur: 28 },
  { nom: 'Grande', titre: 'Grands caractères', valeur: 40 },
]

/** L'objet a-t-il une couleur qu'on change ? Une image, non. */
export function aCouleur(f: Forme): boolean {
  return f.type !== 'image'
}

/** L'objet a-t-il une épaisseur de trait ? Ni une image, ni une formule
 *  (sa taille est celle de ses caractères). */
export function aEpaisseur(f: Forme): boolean {
  return f.type === 'trait' || f.type === 'polygone' || f.type === 'cercle' || f.type === 'segment'
}

/** L'épaisseur que prend cet objet quand on choisit une taille de la barre :
 *  un trait de surligneur (transparent) est cinq fois plus large, comme au
 *  surligneur lui-même et dans le menu d'un seul trait. */
export function epaisseurPour(f: Forme, valeur: number): number {
  return f.type === 'trait' && f.opacite < 1 ? valeur * 5 : valeur
}

/** Ce que les objets choisis ont en commun, pour le menu :
 *  - couleurs : au moins un a une couleur (la section les propose) ;
 *    couleur : celle de tous, si tous ceux qui en ont l'ont, sinon null ;
 *  - epaisseurs : au moins un a une épaisseur ; taille : la taille de la
 *    barre (une de `tailles`) que tous ont, sinon null ;
 *  - pointilles : null sans figure ; vrai si toutes les figures en ont. */
export interface Commun {
  couleurs: boolean
  couleur: string | null
  epaisseurs: boolean
  taille: number | null
  pointilles: boolean | null
}

export function habillageCommun(formes: Forme[], tailles: number[]): Commun {
  const colores = formes.filter(aCouleur), epais = formes.filter(aEpaisseur)
  const figures = formes.filter(f => f.type === 'polygone' || f.type === 'cercle')
  const premiere = colores.length ? (colores[0] as { couleur: string }).couleur : null
  const couleur = premiere !== null && colores.every(f => (f as { couleur: string }).couleur === premiere) ? premiere : null
  const taille = epais.length ? tailles.find(v => epais.every(f => Math.abs((f as { taille: number }).taille - epaisseurPour(f, v)) < 0.01)) ?? null : null
  return {
    couleurs: colores.length > 0, couleur,
    epaisseurs: epais.length > 0, taille,
    pointilles: figures.length ? figures.every(f => !!(f as { tirets?: boolean }).tirets) : null,
  }
}

/** Ce que change un choix du menu, objet par objet (null : il ne le concerne
 *  pas). App.habillerSelection l'applique à tous en une seule étape. */
export type Retouche = (f: Forme) => Partial<Forme> | null

export function changerCouleur(couleur: string): Retouche {
  return f => aCouleur(f) ? { couleur } : null
}

export function changerEpaisseur(valeur: number): Retouche {
  return f => aEpaisseur(f) ? { taille: epaisseurPour(f, valeur) } : null
}

export function changerPointilles(oui: boolean): Retouche {
  return f => f.type === 'polygone' || f.type === 'cercle' ? { tirets: oui } : null
}

/** La retouche change-t-elle vraiment quelque chose à cet objet ? Un objet
 *  déjà rouge qu'on met en rouge ne fait pas d'étape pour rien (pour un
 *  oui-non, l'absence vaut non : une figure sans pointillés qu'on met « sans
 *  pointillés » non plus). */
export function change(f: Forme, patch: Partial<Forme>): boolean {
  const avant = f as unknown as Record<string, unknown>
  return Object.entries(patch).some(([k, v]) => typeof v === 'boolean' ? !!avant[k] !== v : avant[k] !== v)
}
