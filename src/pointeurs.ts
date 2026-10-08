// =============================================================
// SOURIS, STYLET, DOIGT
// Ce qui distingue les trois pointeurs, en dehors de tout geste : quand
// un appui devient un glisser, ce qu'est une paume, si le stylet écrit
// sur l'écran lui-même, ce qu'est un double appui au doigt, et les mots
// des messages pour chacun. Rien ici ne touche au document ni à la page :
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

/** Deux touchers du doigt font un double appui (les options de l'objet) : le
 *  second se pose moins de 300 ms après le lever du premier, à moins de 35 px
 *  de lui (un doigt ne retombe jamais tout à fait au même endroit). Safari sur
 *  iPad ne donne pas de double-clic au doigt : on le reconnaît nous-mêmes. */
export const DOUBLE_TOUCHER = { ms: 300, px: 35 }

export interface Toucher { x: number; y: number; t: number }

/** Le toucher (x, y) à l'heure t est-il le second d'un double appui ? */
export function doubleToucher(premier: Toucher | null, x: number, y: number, t: number): boolean {
  if (!premier) return false
  const dt = t - premier.t
  return dt >= 0 && dt < DOUBLE_TOUCHER.ms && Math.hypot(x - premier.x, y - premier.y) < DOUBLE_TOUCHER.px
}

/** Au Stylo (et au Surligneur), un simple toucher sur une figure ou une
 *  formule peut être le premier d'un double-clic, qui ouvre ses options. Le
 *  second se pose moins de 300 ms après le lever du premier, dans le rayon du
 *  double-clic du système (quelques pixels à la souris et au stylet, un peu
 *  plus au doigt), et se lève en moins de 250 ms sans avoir glissé. Plus
 *  large, deux points qu'on écrit serrés (un « : », un tréma, sur une figure
 *  coloriée ou une formule) seraient pris pour un double-clic. */
export const DOUBLE_CLIC_PLUME = { ms: 300, duree: 250, px: { mouse: 4, pen: 5, touch: 14 } as Record<TypePointeur, number> }

/** Le toucher en (x, y), au pointeur p, tombe-t-il assez près du premier
 *  pour en faire un double-clic ? (en pixels d'écran) */
export function procheDuPremier(premier: { x: number; y: number }, x: number, y: number, p: TypePointeur): boolean {
  return Math.hypot(x - premier.x, y - premier.y) < DOUBLE_CLIC_PLUME.px[p]
}

/** Ce qu'on dit, la première fois qu'on prend un objet, du geste qui ouvre
 *  ses options : il dépend du pointeur. Au doigt, le double appui (jamais
 *  « clic droit », ni un appui long qui n'existe pas). */
export function messageOptions(p: TypePointeur): string {
  if (p === 'touch') return 'Touchez deux fois l\'objet : ses options'
  if (p === 'pen') return 'Double-clic ou bouton du stylet sur l\'objet : ses options'
  return 'Double-clic ou clic droit sur l\'objet : ses options'
}

/** Le second point d'un trait tracé en deux appuis */
export function messageSecondPoint(p: TypePointeur): string {
  return p === 'touch' ? 'Touchez le second point (un autre outil annule)' : 'Cliquez le second point (Échap pour annuler)'
}

/** La figure qu'on vient de reconnaître dans un tracé : comment garder le
 *  tracé à main levée. Au doigt (une tablette sans clavier), le bouton
 *  Annuler de la barre ; ailleurs, le raccourci (ctrl : « Ctrl » ou « ⌘ »). */
export function messageReconnue(nom: string, p: TypePointeur, ctrl = 'Ctrl'): string {
  return p === 'touch' ? `${nom} — ↶ (Annuler) pour garder le tracé à main levée`
    : `${nom} — ${ctrl}+Z pour garder le tracé à main levée`
}
