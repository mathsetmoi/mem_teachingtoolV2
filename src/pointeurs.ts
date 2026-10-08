// =============================================================
// SOURIS, STYLET, DOIGT
// Ce qui distingue les trois pointeurs, en dehors de tout geste : quand
// un appui devient un glisser, ce qu'est une paume, et si le stylet écrit
// sur l'écran lui-même. Rien ici ne touche au document ni à la page :
// les tests le vérifient sous Node.
// =============================================================

export type TypePointeur = 'mouse' | 'pen' | 'touch'

/** Un pointeur inconnu (ou absent) compte comme une souris */
export function typePointeur(t: string): TypePointeur {
  return t === 'pen' || t === 'touch' ? t : 'mouse'
}

/** Combien un appui doit s'éloigner de son départ (en pixels d'écran) pour
 *  devenir un glisser : un doigt tremble plus qu'un stylet, un stylet plus
 *  qu'une souris. En deçà, rien ne bouge et rien ne s'écrit. */
export const SEUIL_GLISSER: Record<TypePointeur, number> = { mouse: 4, pen: 6, touch: 8 }

/** Le départ d'un appui, et s'il est devenu un glisser */
export interface Depart {
  x: number
  y: number
  /** L'heure de l'appui (performance.now()) */
  t: number
  seuil: number
  /** Il a glissé : il le reste jusqu'au lever, même s'il revient au départ */
  parti: boolean
  pointeur: number
  type: TypePointeur
}

export function nouveauDepart(x: number, y: number, pointeur: number, type: string, t = 0): Depart {
  const k = typePointeur(type)
  return { x, y, t, seuil: SEUIL_GLISSER[k], parti: false, pointeur, type: k }
}

/** Le pointeur, arrivé en (x, y), a-t-il glissé ? Une fois parti, il l'est
 *  jusqu'au lever. */
export function depasseSeuil(d: Depart, x: number, y: number): boolean {
  if (!d.parti && Math.hypot(x - d.x, y - d.y) >= d.seuil) d.parti = true
  return d.parti
}

/** Un contact large (plus de 30 px CSS de côté) est une paume, pas un doigt.
 *  Un appareil qui ne dit pas la taille donne 0 ou 1 : pas de rejet. */
export function contactLarge(e: { width: number; height: number }): boolean {
  return e.width > 30 || e.height > 30
}

/** Le stylet écrit-il sur l'écran lui-même (iPad, Surface, tablette Android) ?
 *  On le croit quand l'écran est tactile. Une tablette graphique branchée à
 *  un ordinateur dont l'écran ne l'est pas ne l'est jamais. */
export function ecranTactile(nav: { maxTouchPoints?: number } | undefined =
  typeof navigator === 'undefined' ? undefined : navigator): boolean {
  return (nav?.maxTouchPoints ?? 0) > 0
}
