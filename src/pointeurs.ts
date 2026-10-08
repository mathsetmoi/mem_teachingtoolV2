// =============================================================
// SOURIS, STYLET, DOIGT
// Ce qui distingue les trois pointeurs, en dehors de tout geste : quand
// un appui devient un glisser, ce qu'est une paume, si le stylet écrit
// sur l'écran lui-même, ce qu'est un double appui au doigt, un appui
// long, un toucher à deux ou trois doigts, et les mots des messages pour
// chacun. Rien ici ne touche au document ni à la page :
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

/** À quelle distance du tracé d'un objet (en pixels d'écran) on le prend
 *  encore. Le doigt vise moins juste que le stylet, le stylet que la souris :
 *  20 px au doigt font une cible de 40 px, la taille d'un bouton qu'on touche
 *  sans regarder. C'est plus large que tldraw, qui ne prend qu'à 3 ou 4 px :
 *  un choix propre à MEM, pour le doigt sur une tablette ou un TNI. Mais on
 *  écrit petit et serré : c'est pourquoi, entre deux objets à portée, le
 *  tracé le plus proche l'emporte (voir cibleSous, dans app.ts), et qu'un
 *  trait écrit dans un grand cadre se prend avant le cadre. */
export const TOLERANCE_PRISE: Record<TypePointeur, number> = { mouse: 6, pen: 10, touch: 20 }

/** À cette distance du tracé d'un objet ou moins (pixels d'écran), un appui
 *  le SAISIT : glissé, il l'emporte. Plus loin, jusqu'à TOLERANCE_PRISE, un
 *  toucher le prend, mais un glisser entourera ce qu'on veut prendre (le
 *  lasso) : sinon, à 20 px au doigt, on ne pourrait plus entourer un mot
 *  écrit à la main sans en emporter une lettre. 10 au doigt plutôt que 6 : un
 *  doigt qui vise un trait fin tombe souvent à 7 ou 8 px. Au stylet de la
 *  tablette graphique, qui survole avant de toucher, le curseur montre la
 *  différence. */
export const PRISE_GLISSER: Record<TypePointeur, number> = { mouse: 6, pen: 6, touch: 10 }

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

/** Un appui tenu ce temps-là (ms) sans glisser (voir SEUIL_GLISSER) ouvre le
 *  menu complet de ce qui est dessous, ou le menu de la page dans le vide :
 *  le clic droit de qui n'a ni souris ni bouton (le doigt, l'Apple Pencil).
 *  500 ms, comme Excalidraw et tldraw : assez pour qu'un toucher qui hésite
 *  ne l'ouvre pas, assez peu pour qu'on n'attende pas. Seulement à l'outil
 *  Sélection et au doigt qui « déplace » (jamais pendant qu'on écrit : un
 *  point qu'on tient, une lettre qu'on commence) ; le stylet, seulement sur
 *  l'écran lui-même (une tablette graphique a son bouton). Voir
 *  App.armerAppuiLong. */
export const APPUI_LONG = 500

/** Un toucher bref à deux doigts annule, à trois rétablit (sur la page qu'on
 *  regarde) : comme Procreate, FigJam, Notability, Freeform. Pour en être
 *  un, tous les doigts se posent à moins de `arrivee` ms du premier, chacun
 *  se lève moins de `duree` ms après s'être posé, le tout dure moins de
 *  `total` ms (ce que les deux premières règles assurent déjà), et aucun ne
 *  bouge de `px` pixels d'écran ou plus. px est le seuil du
 *  glisser au doigt (SEUIL_GLISSER.touch) : un toucher qui a bougé assez pour
 *  déplacer la vue n'annule jamais ; un pincement, un déplacement à deux
 *  doigts, deux doigts qu'on laisse posés n'en sont pas. */
export const TOUCHER_DOIGTS = { arrivee: 150, duree: 300, total: 450, px: SEUIL_GLISSER.touch }

export type ToucherReconnu = 'annuler' | 'retablir'

/** Le suivi des doigts d'un toucher à plusieurs doigts (voir TOUCHER_DOIGTS).
 *  On le nourrit de chaque doigt posé, bougé, levé (heures en ms, positions
 *  en pixels d'écran) ; il répond au lever du DERNIER doigt : 'annuler' pour
 *  deux doigts, 'retablir' pour trois, null sinon (un seul doigt, quatre, un
 *  toucher trop long, trop lent à se poser, qui a bougé, ou dont un doigt
 *  s'est posé après qu'un autre s'est levé). oublier() abandonne le toucher
 *  en cours : une paume, un stylet, un appui long, un menu qu'on ferme. Un
 *  doigt resté posé après un oubli est inconnu : son lever ne compte pas. */
export class ToucherADoigts {
  private doigts = new Map<number, { x: number; y: number; t: number; leve: boolean }>()
  private debut = 0
  /** Ce toucher n'en est plus un ; on attend que ses doigts se lèvent */
  private rate = false

  poser(id: number, x: number, y: number, t: number) {
    if (!this.doigts.size) { this.debut = t; this.rate = false }
    else if (t - this.debut >= TOUCHER_DOIGTS.arrivee || [...this.doigts.values()].some(d => d.leve)) this.rate = true
    this.doigts.set(id, { x, y, t, leve: false })
  }

  bouger(id: number, x: number, y: number) {
    const d = this.doigts.get(id)
    if (d && !d.leve && Math.hypot(x - d.x, y - d.y) >= TOUCHER_DOIGTS.px) this.rate = true
  }

  lever(id: number, t: number): ToucherReconnu | null {
    const d = this.doigts.get(id)
    if (!d || d.leve) return null
    d.leve = true
    if (t - d.t >= TOUCHER_DOIGTS.duree) this.rate = true
    if ([...this.doigts.values()].some(x => !x.leve)) return null
    const n = this.doigts.size, bon = !this.rate && t - this.debut < TOUCHER_DOIGTS.total
    this.oublier()
    return !bon ? null : n === 2 ? 'annuler' : n === 3 ? 'retablir' : null
  }

  oublier() {
    this.doigts.clear()
    this.rate = false
  }
}

/** Ce qu'on dit, la première fois qu'on prend un objet, du geste qui ouvre
 *  toutes ses options : il dépend du pointeur. direct : le stylet écrit sur
 *  l'écran lui-même (voir ecranTactile), où il a l'appui long (l'Apple Pencil
 *  n'a pas de bouton) ; celui d'une tablette graphique a son bouton. Au
 *  doigt, l'appui long, jamais « clic ». */
export function messageOptions(p: TypePointeur, direct = ecranTactile()): string {
  if (p === 'touch') return 'Appui long sur l\'objet : toutes ses options'
  if (p === 'pen') return direct ? 'Appui long ou double-clic sur l\'objet : toutes ses options'
    : 'Double-clic ou bouton du stylet sur l\'objet : toutes ses options'
  return 'Double-clic ou clic droit sur l\'objet : toutes ses options'
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
