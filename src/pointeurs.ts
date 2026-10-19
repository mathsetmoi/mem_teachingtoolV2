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

/** Le pointeur d'un clic sur un bouton hors du tableau (celui d'un message,
 *  une entrée de menu) : son pointerType, que le navigateur donne au clic ;
 *  au clavier (Entrée, Espace : pointerType vide) ou sans lui (un navigateur
 *  dont le clic n'est pas un PointerEvent), sinon (retouches après le lot 5 :
 *  « Fixer en fond » touché dans le message de l'import, avant tout appui
 *  sur le tableau, parlait de « clic droit » au doigt et au stylet). */
export function pointeurDuClic(e: Event | undefined, sinon: TypePointeur): TypePointeur {
  const t = (e as PointerEvent | undefined)?.pointerType
  return t ? typePointeur(t) : sinon
}

/** Le pointeur dont parlent les messages avant tout appui sur le tableau
 *  (retouches après le lot 5) : le doigt sur un écran tactile sans pointeur
 *  fin (un iPad, un téléphone : fin, la souris ou le pavé tactile qu'on y
 *  branche), la souris sinon (un ordinateur, un TNI avec sa souris, la
 *  tablette graphique, qui se montre comme une souris tant qu'elle n'a pas
 *  touché). Avant, toujours la souris : un fichier déposé sur l'iPad disait
 *  « P : reprendre le Stylo ». */
export function pointeurDeDepart(tactile = ecranTactile(),
  fin = typeof matchMedia === 'function' && matchMedia('(any-pointer: fine)').matches): TypePointeur {
  return tactile && !fin ? 'touch' : 'mouse'
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

/** Les poignées du cadre de taille et la pastille ↻ (lot 5 ; voir cadre.ts),
 *  en pixels d'écran, selon le dernier pointeur vu (le survol compte) :
 *  - prise : à quelle distance de son centre une poignée se prend (tldraw a
 *    12 et 20 au pointeur grossier ; les 8 px que proposait l'étude étaient
 *    trop petits au stylet et introuvables au doigt) ;
 *  - dessin : le côté du carré blanc qu'on dessine ;
 *  - pastille : le rayon de la pastille ↻, le même dessin que celle des
 *    instruments ;
 *  - ecart : la distance de la pastille au bord du cadre, au bout de son
 *    filet (assez loin pour qu'un coin et elle ne se confondent pas au
 *    doigt). */
export const POIGNEE: Record<'prise' | 'dessin' | 'pastille' | 'ecart', Record<TypePointeur, number>> = {
  prise: { mouse: 10, pen: 12, touch: 20 },
  dessin: { mouse: 8, pen: 10, touch: 14 },
  pastille: { mouse: 11, pen: 12, touch: 16 },
  ecart: { mouse: 24, pen: 28, touch: 36 },
}

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

/** Comment déverrouiller un objet verrouillé (lot 5), dans les mots du
 *  pointeur : son menu court vient du clic droit à la souris, du bouton du
 *  stylet à la tablette graphique, de l'appui long au doigt et au stylet
 *  posé sur l'écran (direct : voir ecranTactile). Jamais « clic » au doigt. */
export function messageVerrou(p: TypePointeur, direct = ecranTactile()): string {
  if (p === 'mouse') return 'Clic droit dessus pour le déverrouiller.'
  if (p === 'pen' && !direct) return 'Bouton du stylet dessus pour le déverrouiller.'
  return 'Appui long dessus pour le déverrouiller.'
}

/** Comment détacher une image fixée en fond (lot 5) : elle ne se prend
 *  plus, c'est le menu de la page qui la détache, et il s'ouvre « dans le
 *  vide » (sur l'image fixée aussi, qui pour la prise est le vide).
 *  plusieurs : il y en a plusieurs (« les détacher ») */
export function messageDetacher(p: TypePointeur, direct = ecranTactile(), plusieurs = false): string {
  const la = plusieurs ? 'les' : 'la'
  if (p === 'mouse') return `Clic droit dans le vide pour ${la} détacher.`
  if (p === 'pen' && !direct) return `Bouton du stylet dans le vide pour ${la} détacher.`
  return `Appui long dans le vide pour ${la} détacher.`
}

/** Ce que dit « Fixer en fond » (retouches après le lot 5) : on écrit
 *  par-dessus, et pour la tourner ou la déplacer, il faut d'abord la
 *  détacher (fixée, elle ne se prend plus, et n'a ni cadre ni pastille ↻).
 *  Le menu de la page s'ouvre dans les mots du pointeur (voir
 *  messageDetacher) : sur elle, il propose « Détacher l'image du fond » ;
 *  dans le vide, pour plusieurs, « Détacher le fond ». n : combien on en a
 *  fixé. selection : l'outil Sélection reste en main (on l'avait choisi :
 *  voir App.fixerEnFond), qui n'écrit pas ; le message dit alors comment
 *  reprendre le Stylo (voir messageReprise). */
export function messageFixe(p: TypePointeur, n = 1, direct = ecranTactile(), selection = false): string {
  const geste = p === 'mouse' ? 'clic droit' : p === 'pen' && !direct ? 'bouton du stylet' : 'appui long'
  return (n === 1
    ? `Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : ${geste} dessus, puis « Détacher l'image du fond ».`
    : `${n} images fixées en fond : écrivez et entourez par-dessus. Pour les tourner ou les déplacer : ${geste} dans le vide, puis « Détacher le fond ».`)
    + (selection ? messageReprise(p, 'stylo', direct) : '')
}

/** La touche de chaque outil, et son nom, pour dire comment le reprendre
 *  (voir messageReprise ; ce sont celles de App.clavier). La Vue n'a pas de
 *  lettre (Espace la tient le temps d'un geste) ; les Formes ont celle de
 *  leur forme (TOUCHE_FORME). */
const REPRISE: Record<string, [string, string]> = {
  stylo: ['P', 'le Stylo'], surligneur: ['H', 'le Surligneur'], gomme: ['E', 'la Gomme'],
  point: ['X', 'le Point'], segment: ['L', 'le Segment'], formule: ['F', 'la Formule'],
}
const TOUCHE_FORME: Record<string, string> = { rectangle: 'R', cercle: 'C', polygone: 'G' }

/** Comment reprendre l'outil qu'on avait (avant) quand une image l'a fait
 *  passer à la Sélection (son import, « Détacher l'image du fond » :
 *  retouches après le lot 5), en une phrase qui commence par une espace ;
 *  rien si c'était déjà la Sélection. Avec un clavier (la souris, la
 *  tablette graphique, ou Ctrl+V : clavier), la touche de l'outil : P rend
 *  le Stylo, E la Gomme, R, C ou G les Formes (forme : celle qu'on avait),
 *  etc. Elle vaut que l'image soit encore prise ou non : « Échap deux fois »,
 *  dit avant, ramenait à la Sélection quand on l'avait déjà lâchée d'un clic
 *  dans le vide (le premier Échap rendait l'outil, le second repassait à la
 *  Sélection). La Vue, sans lettre : Échap, deux fois si l'image est encore
 *  prise (voir App.echap). Au doigt et au stylet posé sur l'écran (direct :
 *  un TNI, un iPad), son bouton. Jamais « clic » au doigt. */
export function messageReprise(p: TypePointeur, avant: string, direct = ecranTactile(), clavier = false, forme = 'rectangle'): string {
  if (avant === 'selection') return ''
  if (clavier || p === 'mouse' || (p === 'pen' && !direct)) {
    if (avant === 'forme') return ` ${TOUCHE_FORME[forme] ?? 'R'} : reprendre les Formes.`
    const r = REPRISE[avant]
    return r ? ` ${r[0]} : reprendre ${r[1]}.` : ' Échap : reprendre l\'outil d\'avant (deux fois si l\'image est encore prise).'
  }
  return avant === 'stylo' ? ' Touchez le Stylo pour écrire de nouveau.' : ' Touchez votre outil pour le reprendre.'
}

/** Ce que dit l'import d'une image (retouches après le lot 5) : elle arrive
 *  à l'outil Sélection, avec son cadre de taille et sa pastille ↻ ; puis
 *  comment reprendre l'outil qu'on avait (voir messageReprise). */
export function messageImagePosee(p: TypePointeur, avant: string, direct = ecranTactile(), clavier = false, forme = 'rectangle'): string {
  return 'Image posée : ses coins l\'agrandissent, ↻ la tourne.' + messageReprise(p, avant, direct, clavier, forme)
}

/** Ce que dit « Détacher l'image du fond » (retouches après le lot 5) : elle
 *  se prend de nouveau, à l'outil Sélection, avec son cadre et sa pastille
 *  ↻ (c'est le chemin que donne le message de « Fixer en fond » pour la
 *  tourner) ; puis comment reprendre l'outil qu'on avait, comme à l'import.
 *  n : combien on en a détaché. */
export function messageDetache(p: TypePointeur, avant: string, n = 1, direct = ecranTactile(), forme = 'rectangle'): string {
  return (n === 1 ? 'Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne.'
    : `${n} images détachées du fond : elles se déplacent de nouveau, les coins du cadre les agrandissent, ↻ les tourne.`)
    + messageReprise(p, avant, direct, false, forme)
}

/** Ce qu'on dit la première fois de la session qu'on prend une image seule
 *  (lot 5) : ses coins, ses côtés et sa pastille ↻. Maj + coin seulement là
 *  où il y a un clavier : au doigt, les côtés suffisent pour la déformer. */
export function messageCadre(p: TypePointeur): string {
  return p === 'touch' ? 'Coins : agrandir ou réduire ; côtés : déformer ; ↺ ↻ : tourner (touchez-les : un quart de tour)'
    : 'Coins : agrandir ou réduire ; côtés ou Maj + coin : déformer ; ↺ ↻ : tourner (un clic : un quart de tour)'
}

/** Ce qu'on dit quand on allume ou qu'on éteint les noms sous les outils
 *  (lot 5) : éteints, leur nom paraît encore au survol, à la souris et au
 *  stylet qui survole (celui d'une tablette graphique) ; pas au doigt, ni
 *  au stylet posé sur l'écran (direct : un TNI, un iPad), qui ne survolent
 *  pas. */
export function messageNomsOutils(oui: boolean, p: TypePointeur, direct = ecranTactile()): string {
  if (oui) return 'Noms sous les outils'
  return p === 'touch' || (p === 'pen' && direct) ? 'Outils sans noms' : 'Outils sans noms (leur nom paraît au survol)'
}

/** Le titre (l'infobulle, le nom lu) de « Modifier » pour une formule, dans
 *  sa barre d'actions comme dans son menu complet : son double-clic, sauf
 *  au doigt, où l'on ne clique pas (le double appui marche aussi, mais
 *  jamais « clic » au doigt) */
export function titreModifierFormule(p: TypePointeur): string {
  return p === 'touch' ? 'Modifier la formule' : 'Modifier la formule (double-clic)'
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
