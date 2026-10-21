// =============================================================
// LE RENDU, EN TROIS COUCHES SUPERPOSÉES
// 1. « scène »   : le fond et les formes posées. Redessinée seulement
//                  quand quelque chose change (pas de boucle permanente).
// 2. « formules » : des éléments HTML rendus par KaTeX, déplacés et
//                  zoomés d'un seul transform CSS : nets à tout zoom.
// 3. « direct »  : le trait en cours, la sélection, les aperçus.
//                  Petite, donc rapide : c'est elle qui fait la
//                  latence ressentie au stylet.
// Le contraste renforcé (lot 5, un réglage de l'appareil, pour le
// vidéoprojecteur) ne change que ce que peint CE rendu, à l'écran du
// professeur : voir contraste.
// =============================================================
import { getStroke } from 'perfect-freehand'
import type { Camera } from './camera'
import type { Bout, Figure, Fond, Forme, Formule, ImageForme, MarquePoint, Trait } from './types'
import { FOND_NEUF, libre } from './types'
import { coinHautDroit, coinsAjustes, coinsImage, coinsVus, ecarterCoins, englobante, rotationDe } from './geometrie'
import { dessinerFond } from './fonds'
import { codageDe, placesDesNoms, sommetsDe } from './formes'
import type { EtatInstrument, NomInstrument, Partie } from './instruments'
import { dessinerInstrument, dessinerPastille, dessinerTraineeLaser } from './instruments'
import { enOrdreDAffichage, ordreDAffichage } from './ordre'
import { groupesTouches } from './groupes'
import { LONG_MORCEAU, fenetresDe, passePres } from './gomme'
import type { Cadre, Matrice } from './cadre'
import { rectangleDe } from './cadre'
import type { PartieGardee } from './rognage'
import { coinsGardes } from './rognage'
import type { TypePointeur } from './pointeurs'
import { POIGNEE } from './pointeurs'

type P = { x: number; y: number }
/** Ce qui distingue le contour d'un trait dans le cache des tracés (voir
 *  Rendu.dessinerTrait) : son nombre de valeurs, sa taille, sa pression, son
 *  dernier point, son deuxième et celui du milieu */
type CleTrait = { n: number; taille: number; pression: boolean; fx: number; fy: number; dx: number; dy: number; mx: number; my: number }

/** Le cadre de taille et la pastille ↻ tels qu'on les peint (lot 5) : le
 *  cadre (voir cadre.ts), le pointeur dont il prend la taille des poignées,
 *  et le geste qu'on fait avec lui (la pastille est pleine pendant qu'on
 *  tourne, comme celle d'un instrument) */
export interface CadreVu { cadre: Cadre; pointeur: TypePointeur; geste: 'taille' | 'tourner' | null; gauche?: boolean }

export interface TraitDirect {
  pts: number[]; couleur: string; taille: number; opacite: number; pression: boolean
}

// ---------- Tracés à main levée ----------
function optionsTrait(t: { taille: number; pression: boolean }, fini: boolean) {
  return {
    size: t.taille,
    thinning: t.pression ? 0.6 : 0.45,
    smoothing: 0.55,
    streamline: 0.45,
    simulatePressure: !t.pression,
    last: fini,
  }
}

function regrouper(pts: number[]): number[][] {
  const r: number[][] = []
  for (let i = 0; i + 2 < pts.length; i += 3) r.push([pts[i], pts[i + 1], pts[i + 2]])
  return r
}

/** L'épaisseur d'un trait en esquisse, en fraction de sa taille : celle, en
 *  moyenne, du contour de perfect-freehand (son « size » est l'épaisseur à
 *  pleine pression ; il s'amincit avec la vitesse). Réglée en comparant les
 *  deux sur des pages d'écriture à la souris, de 0,25 à 0,6 de zoom : la
 *  même encre à 10 % près (voir peindreSur). */
export const ESQUISSE = 0.5

/** Contour de perfect-freehand → Path2D en courbes quadratiques */
export function cheminDuTrait(t: { pts: number[]; taille: number; pression: boolean }, fini: boolean): Path2D {
  const d = contourDuTrait(t, fini)
  return d ? new Path2D(d) : new Path2D()
}

/** Le contour de perfect-freehand d'un trait, en chemin SVG fermé (courbes
 *  quadratiques) ; '' : rien à peindre */
function contourDuTrait(t: { pts: number[]; taille: number; pression: boolean }, fini: boolean): string {
  const contour = getStroke(regrouper(t.pts), optionsTrait(t, fini))
  if (contour.length < 2) return ''
  let d = `M ${contour[0][0].toFixed(2)} ${contour[0][1].toFixed(2)} Q`
  for (let i = 0; i < contour.length; i++) {
    const [x0, y0] = contour[i]
    const [x1, y1] = contour[(i + 1) % contour.length]
    d += ` ${x0.toFixed(2)} ${y0.toFixed(2)} ${((x0 + x1) / 2).toFixed(2)} ${((y0 + y1) / 2).toFixed(2)}`
  }
  return d + ' Z'
}

export class Rendu {
  readonly scene: HTMLCanvasElement
  readonly direct: HTMLCanvasElement
  readonly coucheInstruments: HTMLCanvasElement
  private ci: CanvasRenderingContext2D
  private instrumentsSales = true
  /** Les instruments posés, dans l'ordre (le dernier est dessus) */
  instruments: { nom: NomInstrument; etat: EtatInstrument; actif: Partie | null }[] = []
  instrumentsCaches = false
  /** La traînée du pointeur laser (outils de classe), à l'écran du
   *  professeur seulement : ni la piste, ni le replay ne la voient */
  traineeLaser: { x: number; y: number; t: number }[] = []
  /** La forme sous le pointeur, avec l'outil Sélection */
  survol: string | null = null
  /** Les autres membres de son groupe, que le clic prendrait avec elle
   *  (lot 5) : ils s'éclairent du même halo */
  survolAussi: string[] = []
  /** Ce qu'on vise en désignant un axe (une droite) ou un centre (un point) */
  cible: { a: { x: number; y: number }; b?: { x: number; y: number } } | null = null
  /** Une construction qu'on va poser : on la voit, en transparence, sous le pointeur */
  fantomes: Figure[] = []
  /** Ceux que manie le constructeur, en plus de ceux de l'utilisateur */
  instrumentsAnimes: { nom: NomInstrument; etat: EtatInstrument; actif: Partie | null }[] = []
  /** Appelé chaque fois que la couche des instruments est peinte, avec ce
   *  qu'elle montre : le tableau y branche la piste des instruments (voir
   *  piste.ts). Le lecteur et la revue n'en ont pas. */
  temoin: ((instruments: Rendu['instruments'], animes: Rendu['instrumentsAnimes'], t: number) => void) | null = null
  /** Appelé chaque fois que la couche « direct » est peinte (le tracé en cours
   *  sous un instrument paraît alors) : la piste y date ce tracé. t : l'heure de
   *  l'image d'écran (horloge de performance.now()), la même pour les deux */
  temoinDirect: ((t: number) => void) | null = null
  /** Une mesure lue pendant un geste (« 4,5 cm », « 30° »), en monde */
  mesure: { texte: string; x: number; y: number } | null = null
  readonly coucheFormules: HTMLDivElement
  private cs: CanvasRenderingContext2D
  private cd: CanvasRenderingContext2D
  private dpr = 1
  l = 0
  h = 0

  /** Vrai pendant une peinture en esquisse (voir peindreSur) : les traits y
   *  sont des lignes brisées, sans perfect-freehand ni cache */
  private esquisse = false

  /** Le contraste renforcé (lot 5, D14), pour le vidéoprojecteur : les
   *  lignes du fond plus marquées (fonds.ts), les cadres de la sélection en
   *  deux tons (5 px blancs sous 3 px de bleu), les poignées, les ronds des
   *  sommets et la pastille ↻ au filet de 2,5 px, le halo du survol plus
   *  large, le lasso, le cadre qu'on tire et le cercle de la gomme en
   *  2,5 px, et les figures et les anciens segments jamais affichés sous
   *  2 px d'écran. L'écriture à main levée garde son contour (perfect-
   *  freehand le recalculerait pour des milliers de traits à chaque cran de
   *  zoom). Seuls le tableau et la revue en classe le posent, depuis le
   *  réglage de l'appareil ; jamais le lecteur des élèves (qui partage
   *  pourtant ce stockage sur GitHub Pages), et peindreSur (les vignettes,
   *  l'image copiée, le PDF) peint toujours sans lui : rien de ce qui sort
   *  de l'écran ne change. */
  contraste = false

  /** Le contour de chaque trait (perfect-freehand), par identifiant, avec
   *  ce qui le distingue (cle, voir dessinerTrait) */
  private chemins = new Map<string, { cle: CleTrait; chemin: Path2D }>()
  /** cachee : la formule n'est plus à l'écran, mais son rendu KaTeX est gardé
   *  en réserve ; transform : celui qui est posé sur l'élément (lot 5 : sa
   *  rotation, et pendant qu'on la change de taille ou qu'on la tourne,
   *  cette transformation) */
  private elementsFormules = new Map<string, { cle: string; el: HTMLDivElement; cachee: boolean; transform: string }>()

  // État fourni par l'application à chaque image
  /** Les formes de la page, dans n'importe quel ordre (le tableau les donne
   *  déjà dans l'ordre d'affichage, la revue et le lecteur par z) : elles se
   *  peignent dans l'ordre d'affichage (voir ordre.ts et enOrdre) */
  formes: Forme[] = []
  /** Le fond peint (celui de la page ; d'abord celui d'une page neuve) */
  fond: Fond = FOND_NEUF
  origine = { x: 0, y: 0 }
  selection = new Set<string>()
  decalage = { dx: 0, dy: 0 }                     // déplacement en cours de la sélection
  monTrait: TraitDirect | null = null
  /** Le point d'un simple toucher au Stylo sur un objet, qui attend un
   *  éventuel second toucher (le double-clic) avant d'être posé */
  enAttente: TraitDirect | null = null
  monSegment: { x1: number; y1: number; x2: number; y2: number; couleur: string; taille: number } | null = null
  cadreSelection: { x: number; y: number; l: number; h: number } | null = null
  /** Le lasso de l'outil Sélection en cours (monde, à plat [x, y, …]), fermé au dessin */
  lasso: number[] | null = null
  gomme: { x: number; y: number; r: number } | null = null
  apercu: Figure | null = null                     // figure en cours de construction
  remplacement: Figure | null = null               // figure dont on tire un morceau
  poignees = true                                  // montrer sommets et rayon de la figure choisie
  /** Les poignées se prennent-elles en ce moment (outil Sélection, ou doigt
   *  qui « déplace ») ? Sinon leurs ronds ne se dessinent pas : on ne montre
   *  pas ce qu'on ne peut pas attraper */
  poigneesActives = true
  /** Le seul morceau choisi : il est surligné, pas la figure */
  partie: { id: string; prise: { quoi: 'nom' | 'sommet'; i: number } | { quoi: 'rayon' } } | null = null
  /** Le cadenas d'un objet verrouillé (lot 5) : au survol de l'outil
   *  Sélection, un instant après un appui sur lui ; cadre : avec son cadre en
   *  tirets. Seule l'App le pose (à l’écran) : jamais dans la revue, le
   *  lecteur ni les sorties (peindreSur ne peint pas cette couche). Ce qui
   *  est sélectionné et verrouillé (le temps de son menu) a toujours son
   *  cadenas et son cadre, sans qu'on le pose ici. */
  cadenas: { id: string; cadre: boolean } | null = null
  /** Le cadre de taille et la pastille ↻ de ce qui est pris (lot 5), tel
   *  qu'il est peint dans la couche directe (null : aucun). Seule l'App le
   *  pose, par avantDirect, juste avant chaque peinture de cette couche : il
   *  suit ainsi la sélection, la vue, l'outil et le pointeur sans qu'on
   *  pense à le refaire. La revue, le lecteur et les sorties n'en ont
   *  jamais (ni avantDirect, ni cadre). */
  cadre: CadreVu | null = null
  /** L'image qu'on rogne (voir rognage.ts) : la partie gardée, et le
   *  pointeur dont les poignées prennent la taille */
  rognage: { id: string; partie: PartieGardee; pointeur: TypePointeur } | null = null
  avantDirect: (() => void) | null = null
  /** Pendant qu'on change la taille ou qu'on tourne (lot 5) : rien ne
   *  s'écrit, ces formes (ids) sont peintes transformées par m. Un trait et
   *  une image : leur dessin habituel sous m (le contour en cache du trait,
   *  tel quel : agrandi, il s'épaissit comme il le fera) ; une figure et un
   *  ancien segment : par appliquer (transformerForme, que l'App fournit :
   *  quelques points, et leur épaisseur ne change pas, rien ne saute au
   *  lâcher) ; une formule, par un transform CSS sur son élément. */
  transfo: { ids: Set<string>; m: Matrice; appliquer: (f: Forme) => Forme } | null = null
  /** Pendant un coup de la gomme qui efface là où elle passe (lot 5) : ces
   *  traits (caches, leurs identifiants) sont cachés, et leurs morceaux du
   *  moment (morceaux, sous des identifiants de travail id~n, stables
   *  pendant le geste : leurs tracés restent en cache) peints à leur place,
   *  dans l'ordre d'affichage ; rien n'est encore écrit. Seule l'App le
   *  pose : jamais dans la revue, le lecteur ni les sorties. */
  coupe: { caches: Set<string>; morceaux: Trait[] } | null = null
  /** La boîte d'un trait, en monde, son encre comprise, telle que l'App la
   *  garde en cache (voir repeindreZone) ; sans elle, celle du rendu */
  boiteTrait: ((t: Trait) => { x: number; y: number; l: number; h: number } | null) | null = null
  /** Combien a duré la dernière peinture de la scène (ms), et si elle était
   *  entière ou bornée au rectangle sale : les essais la lisent */
  derniereScene = { ms: 0, entiere: true }

  private sceneSale = true
  /** Le rectangle sale (lot 5, voir repeindreZone), en pixels du canevas,
   *  entiers : [x0, y0, x1, y1[ */
  private zoneSale: { x0: number; y0: number; x1: number; y1: number } | null = null
  private directSale = true
  private image = 0

  constructor(private cam: Camera, conteneur: HTMLElement) {
    this.scene = document.createElement('canvas')
    this.direct = document.createElement('canvas')
    this.coucheInstruments = document.createElement('canvas')
    this.coucheInstruments.className = 'couche couche-instruments'
    this.coucheFormules = document.createElement('div')
    this.scene.className = 'couche couche-scene'
    this.direct.className = 'couche couche-direct'
    this.coucheFormules.className = 'couche-formules'
    conteneur.append(this.scene, this.coucheFormules, this.coucheInstruments, this.direct)
    this.ci = this.coucheInstruments.getContext('2d')!
    this.cs = this.scene.getContext('2d')!
    // Pas de « desynchronized » : sur certaines cartes graphiques, Chrome
    // affiche alors ce canvas transparent en noir opaque, qui cache tout.
    this.cd = this.direct.getContext('2d')!
    new ResizeObserver(() => this.redimensionner(conteneur)).observe(conteneur)
    this.redimensionner(conteneur)
  }

  private redimensionner(c: HTMLElement) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.l = c.clientWidth; this.h = c.clientHeight
    for (const cv of [this.scene, this.direct, this.coucheInstruments]) {
      cv.width = Math.round(this.l * this.dpr); cv.height = Math.round(this.h * this.dpr)
      cv.style.width = this.l + 'px'; cv.style.height = this.h + 'px'
    }
    this.toutRedessiner()
  }

  toutRedessiner() { this.sceneSale = true; this.directSale = true; this.instrumentsSales = true; this.planifier() }

  /** Ce que montre la scène peinte en dernier (voir redessinerSiBesoin) */
  private peinte: { formes: Forme[]; fond: Fond; ox: number; oy: number; x: number; y: number; z: number; remplacement: Figure | null } | null = null

  /** Redessine la couche « direct » seulement si la scène montre déjà ces formes
   *  (les mêmes, dans le même ordre), ce fond et cette vue ; tout sinon. C'est le
   *  cas d'un replay pendant qu'un trait s'écrit : la page ne change pas, seul le
   *  trait en cours avance, comme sous le stylo à l’écran. */
  redessinerSiBesoin() {
    const p = this.peinte, f = this.formes, c = this.cam
    const memeScene = !!p && p.formes.length === f.length && p.fond === this.fond && p.ox === this.origine.x && p.oy === this.origine.y
      && p.x === c.x && p.y === c.y && p.z === c.z && p.remplacement === this.remplacement && !this.selection.size
      && !this.decalage.dx && !this.decalage.dy && !this.transfo && p.formes.every((g, i) => g === f[i])
    if (memeScene) this.redessinerDirect()
    else this.toutRedessiner()
  }
  redessinerInstruments() { this.instrumentsSales = true; this.directSale = true; this.planifier() }
  redessinerDirect() { this.directSale = true; this.planifier() }

  private planifier() {
    if (!this.image) this.image = requestAnimationFrame(t => this.peindre(t))
  }

  /** Peint sans attendre l'image d'écran suivante ce qui doit l'être. Pour un
   *  appel fait DEPUIS une image d'écran (un replay qui avance à chaque image) :
   *  sinon ce qu'il décide ne paraîtrait qu'une image plus tard. */
  peindreMaintenant() {
    if (!this.image) return
    cancelAnimationFrame(this.image)
    this.peindre()
  }

  private peindre(t = performance.now()) {
    this.image = 0
    if (this.instrumentsSales) { this.peindreInstruments(t); this.instrumentsSales = false }
    if (this.sceneSale) {
      const t0 = performance.now()
      this.peindreScene(); this.placerFormules(); this.sceneSale = false; this.zoneSale = null
      this.derniereScene = { ms: performance.now() - t0, entiere: true }
    } else if (this.zoneSale) {
      const t0 = performance.now()
      this.peindreZone(); this.zoneSale = null
      this.derniereScene = { ms: performance.now() - t0, entiere: false }
    }
    if (this.directSale) { this.avantDirect?.(); this.peindreDirect(); this.directSale = false; this.temoinDirect?.(t) }
  }

  // ---------- Couche des instruments ----------
  private peindreInstruments(t: number) {
    const c = this.ci, cam = this.cam
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.coucheInstruments.width, this.coucheInstruments.height)
    if (this.instrumentsCaches) { this.temoin?.([], [], t); return }
    c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)
    if (this.traineeLaser.length > 1) dessinerTraineeLaser(c, this.traineeLaser, cam.z, t)
    for (const i of this.instruments) dessinerInstrument(c, i.nom, i.etat, cam.z, i.actif)
    for (const i of this.instrumentsAnimes) dessinerInstrument(c, i.nom, i.etat, cam.z, i.actif)
    this.temoin?.(this.instruments, this.instrumentsAnimes, t)
  }

  /** Les formes du rendu dans l'ordre d'affichage : triées seulement si elles
   *  ne le sont pas déjà, et une fois par tableau donné (pas à chaque image
   *  d'écran : le tableau, la revue et le lecteur donnent un tableau neuf
   *  quand la page change) */
  private ordre: { de: Forme[]; vers: Forme[] } | null = null
  private enOrdre(): Forme[] {
    const f = this.formes
    if (this.ordre?.de !== f) this.ordre = { de: f, vers: enOrdreDAffichage(f) ? f : ordreDAffichage(f) }
    return this.ordre.vers
  }

  /** Repeindre seulement ce rectangle de la scène (monde), à la prochaine
   *  image d'écran : la gomme qui efface là où elle passe (lot 5) change
   *  l'encre sous elle, et rien d'autre. Une peinture entière d'une page de
   *  2000 mots prend 42 ms sur un poste sans carte graphique (la critique du
   *  lot 5 l'a mesuré) : à chaque mouvement, la gomme ne suivrait plus la
   *  plume. Le rectangle est agrandi de 2 px et porté aux pixels entiers du
   *  canevas (un bord à cheval sur un pixel laisserait un liseré) ; deux
   *  demandes avant la même image s'unissent. Une scène déjà sale (la vue
   *  qui change, la page qui change ailleurs) se repeint entière, et c'est
   *  tout. */
  repeindreZone(b: { x: number; y: number; l: number; h: number }) {
    if (this.sceneSale) return
    const cam = this.cam, k = this.dpr
    const a = cam.versEcran(b.x, b.y), c = cam.versEcran(b.x + b.l, b.y + b.h)
    const x0 = Math.max(0, Math.floor((Math.min(a.x, c.x) - 2) * k)), y0 = Math.max(0, Math.floor((Math.min(a.y, c.y) - 2) * k))
    const x1 = Math.min(this.scene.width, Math.ceil((Math.max(a.x, c.x) + 2) * k)), y1 = Math.min(this.scene.height, Math.ceil((Math.max(a.y, c.y) + 2) * k))
    if (x1 <= x0 || y1 <= y0) return
    const z = this.zoneSale
    this.zoneSale = z ? { x0: Math.min(z.x0, x0), y0: Math.min(z.y0, y0), x1: Math.max(z.x1, x1), y1: Math.max(z.y1, y1) } : { x0, y0, x1, y1 }
    this.planifier()
  }

  /** La scène repeinte dans le seul rectangle sale (voir repeindreZone) : le
   *  canevas coupé à ce rectangle, le fond qui s'y redessine, puis, dans
   *  l'ordre d'affichage, les seules formes dont la boîte (leur encre
   *  comprise, les noms d'une figure au large) touche le rectangle, et les
   *  morceaux d'un trait coupé à sa place. Le dessin de chacune est celui
   *  d'une peinture entière : dedans, les pixels sont les mêmes (à
   *  l'anticrénelage près, sur un pixel isolé ; l'essai K7 du lot 5 compare
   *  au lever). Pendant un déplacement ou un changement de taille, tout se
   *  repeint. */
  private peindreZone() {
    const z = this.zoneSale!, c = this.cs, cam = this.cam
    if (this.transfo || this.remplacement || this.decalage.dx || this.decalage.dy) { this.peindreScene(); this.placerFormules(); return }
    c.save()
    try {
      c.setTransform(1, 0, 0, 1, 0, 0)
      c.beginPath(); c.rect(z.x0, z.y0, z.x1 - z.x0, z.y1 - z.y0); c.clip()
      c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
      dessinerFond(c, this.fond, cam, this.l, this.h, this.origine, { contraste: this.contraste })
      c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)
      const k = this.dpr * cam.z
      const w = { x: (z.x0 - this.dpr * cam.x) / k, y: (z.y0 - this.dpr * cam.y) / k, l: (z.x1 - z.x0) / k, h: (z.y1 - z.y0) / k }
      const marge = 2 / cam.z
      const touche = (b: { x: number; y: number; l: number; h: number } | null, m: number) =>
        !!b && b.x - m < w.x + w.l && b.x + b.l + m > w.x && b.y - m < w.y + w.h && b.y + b.h + m > w.y
      for (const f of this.enOrdre()) {
        if (f.type === 'formule') continue
        const caches = this.coupe?.caches.has(f.id)
        if (f.type === 'trait') {
          const b = this.boiteTrait?.(f) ?? this.boite(f)
          if (!touche(b, marge + f.taille / 2)) continue
          // Une boîte bien plus grande que le rectangle (un grand geste, un
          // anneau de spirale) : son encre y passe-t-elle vraiment ?
          if (!caches && b && (b.l > 2 * w.l || b.h > 2 * w.h) && !passePres(f, w, marge)) continue
        } else if (!touche(this.boite(f), marge + (f.type === 'image' ? 0 : MARGE_DES_NOMS))) continue
        if (caches) {
          // Ses morceaux qui touchent le rectangle ; un long morceau, par
          // fenêtres de ses points (voir dessinerPres)
          for (const m of this.morceauxDe(f.id)) {
            if (m.pts.length > 3 * LONG_MORCEAU) { this.dessinerPres(c, m, w, marge); continue }
            const b = this.boiteTrait?.(m) ?? this.boite(m)
            if (!touche(b, marge + m.taille / 2) || (b && (b.l > 2 * w.l || b.h > 2 * w.h) && !passePres(m, w, marge))) continue
            this.dessinerForme(c, m, null)
          }
          continue
        }
        this.dessinerForme(c, f, null)
      }
    } finally { c.restore() }
  }

  /** Un long morceau d'un trait que la gomme coupe (lot 5, voir gomme.ts),
   *  redessiné près de la boîte w (monde) seulement : le contour de chacune
   *  de ses fenêtres (fenetresDe), en un seul chemin rempli une fois (une
   *  encre transparente, celle du surligneur, ne fonce pas où deux fenêtres
   *  se croisent : comme le trait entier). Son contour entier, que
   *  perfect-freehand mettrait des millisecondes à recalculer à chaque
   *  mouvement, attend le lever. */
  private dessinerPres(c: CanvasRenderingContext2D, t: Trait, w: { x: number; y: number; l: number; h: number }, marge: number) {
    const fenetres = fenetresDe(t, w, marge)
    if (!fenetres.length) return
    // Le chemin se construit par ses courbes, sans passer par le texte d'un
    // chemin SVG (le plus long, pour un contour de milliers de points) : il
    // ne sert que le temps d'une image, rien ne le garde
    const chemin = new Path2D()
    let vide = true
    for (const [a, b] of fenetres) {
      const contour = getStroke(regrouper(t.pts.slice(3 * a, 3 * b)), optionsTrait(t, true))
      if (contour.length < 2) continue
      vide = false
      chemin.moveTo(contour[0][0], contour[0][1])
      for (let i = 0; i < contour.length; i++) {
        const [x0, y0] = contour[i], [x1, y1] = contour[(i + 1) % contour.length]
        chemin.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      }
      chemin.closePath()
    }
    if (vide) return
    c.save()
    c.translate(t.x, t.y)
    c.globalAlpha = t.opacite
    c.fillStyle = t.couleur
    c.fill(chemin)
    c.restore()
  }

  /** Les morceaux du moment d'un trait que la gomme coupe (voir coupe),
   *  rangés par trait une fois par liste donnée */
  private parTrait: { de: Trait[]; vers: Map<string, Trait[]> } | null = null
  private morceauxDe(id: string): Trait[] {
    const l = this.coupe?.morceaux ?? []
    if (this.parTrait?.de !== l) {
      const vers = new Map<string, Trait[]>()
      for (const m of l) {
        const i = m.id.lastIndexOf('~'), de = i < 0 ? m.id : m.id.slice(0, i)
        const r = vers.get(de)
        if (r) r.push(m); else vers.set(de, [m])
      }
      this.parTrait = { de: l, vers }
    }
    return this.parTrait.vers.get(id) ?? []
  }

  // ---------- Couche scène ----------
  private peindreScene() {
    const c = this.cs, cam = this.cam
    this.peinte = { formes: this.formes, fond: this.fond, ox: this.origine.x, oy: this.origine.y, x: cam.x, y: cam.y, z: cam.z, remplacement: this.remplacement }
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    dessinerFond(c, this.fond, cam, this.l, this.h, this.origine, { contraste: this.contraste })
    c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)
    // Dans l'ordre d'affichage : les images fixées en fond, puis les images,
    // comme des feuilles posées sous les tracés (une image et son papier ne
    // recouvrent jamais un trait de construction), puis les tracés et les
    // figures ; les formules sont en HTML, au-dessus (placerFormules)
    const t = this.transfo
    for (const f0 of this.enOrdre()) {
      if (t && t.ids.has(f0.id)) { this.dessinerTransforme(c, f0, t); continue }
      // Un trait que la gomme coupe (lot 5) : ses morceaux du moment
      if (this.coupe?.caches.has(f0.id)) { for (const m of this.morceauxDe(f0.id)) this.dessinerForme(c, m, null); continue }
      const f = this.remplacement?.id === f0.id ? this.remplacement : f0
      // Ce qui est lié à une image sélectionnée bouge avec elle
      const lie = f.type === 'polygone' || f.type === 'cercle' ? f.lie : undefined
      // (ce qui est verrouillé ne bouge pas ; un point repéré sur une image
      // la suit toujours, même verrouillé)
      const dec = (this.selection.has(f.id) && libre(f)) || (lie && this.selection.has(lie)) ? this.decalage : null
      this.dessinerForme(c, f, dec)
    }
    this.purgerChemins(this.formes)
  }

  /** Une forme qu'on change de taille ou qu'on tourne, avant le lâcher (voir transfo) */
  private dessinerTransforme(c: CanvasRenderingContext2D, f: Forme, t: NonNullable<Rendu['transfo']>) {
    if (f.type === 'formule') return
    if (f.type === 'trait' || f.type === 'image') {
      c.save(); c.transform(...t.m); this.dessinerForme(c, f, null); c.restore()
      return
    }
    this.dessinerForme(c, t.appliquer(f), null)
  }

  /** Nettoie le cache des formes disparues. On en garde une bonne réserve :
   *  revenir sur une autre page, ou sur une autre image de la revue, ne
   *  recalcule pas tous ses tracés */
  private purgerChemins(formes: Forme[]) {
    if (this.chemins.size > formes.length + 1500) {
      const vivants = new Set(formes.map(f => f.id))
      for (const id of this.chemins.keys()) if (!vivants.has(id)) this.chemins.delete(id)
    }
  }

  /**
   * Peint une page ailleurs qu'à l'écran (une vignette, une image copiée, une
   * feuille du PDF), vue par la caméra de CE rendu, sur un canevas de l × h
   * px CSS à dpr pixels par px CSS. Dans l'ordre de l'écran : le fond (fond
   * vrai : le papier et son motif ; faux : le papier blanc seul ; 'aucun' :
   * rien, on continue une peinture commencée, par tranches de formes prises
   * dans l'ordre d'affichage), puis les formes (o.formes, sinon celles du
   * rendu) dans l'ordre d'affichage (voir ordre.ts) : les images fixées en
   * fond, les images, les tracés et les figures, enfin chaque formule par
   * o.formule (à l'écran, elles sont en HTML au-dessus du canevas). Ni
   * sélection, ni décalage, ni remplacement, ni poignées, ni instruments, ni
   * la couche « direct ».
   * Pendant l'appel, l, h et dpr prennent ceux de l'appel (une droite
   * prolongée va jusqu'au bord de CE canevas), puis sont rendus ; ce que
   * montre l'écran (peinte, formes) ne bouge pas. En esquisse, un trait est
   * la ligne brisée de ses points (une vignette de 346 traits : 1,6 ms au
   * lieu de 129, et à cette taille l'œil ne voit pas la différence), sans
   * toucher au cache des tracés ; sinon le cache se purge comme à l'écran :
   * un PDF de 60 pages ne garde pas des milliers de tracés.
   * Pour peindre hors de l'écran, on crée un Rendu sur un élément jamais
   * attaché au document : ses canevas restent vides et seule cette méthode
   * sert. On ne lui pose jamais `formes` (on passe o.formes) : l'image
   * d'écran que son constructeur a planifiée referait sinon le DOM KaTeX de
   * chaque formule dans son élément détaché.
   * coin : où commence, sur le canevas, la zone de l h que l'on peint (en
   * px CSS ; (0, 0) sinon) : une feuille du PDF ne peint que sa zone utile,
   * dans ses marges, et le fond y voit les bords de cette zone (les flèches
   * des axes du repère au bout de la zone, pas dans la marge).
   * Jamais en contraste renforcé (voir contraste) : il est éteint le temps
   * de l'appel, comme l'esquisse est posée, puis rendu.
   * impression : la feuille d'un PDF ; son fond est peint pour le papier,
   * à dpr pixels de son image par px CSS (voir dessinerFond : les lignes sur
   * les pixels de l'image, les millimètres du papier millimétré).
   */
  peindreSur(c: CanvasRenderingContext2D, o: {
    l: number; h: number; dpr: number; fond: boolean | 'aucun'; formes?: Forme[]
    formule?: (c: CanvasRenderingContext2D, f: Formule) => void; esquisse?: boolean
    coin?: { x: number; y: number }; impression?: boolean
  }) {
    const garde = { l: this.l, h: this.h, dpr: this.dpr, esquisse: this.esquisse, contraste: this.contraste }
    this.l = o.l; this.h = o.h; this.dpr = o.dpr; this.esquisse = !!o.esquisse; this.contraste = false
    c.save()
    try {
      const cam = this.cam
      let formes = o.formes ?? this.formes
      if (!enOrdreDAffichage(formes)) formes = ordreDAffichage(formes)
      const cx = o.coin?.x ?? 0, cy = o.coin?.y ?? 0
      if (o.fond !== 'aucun') {
        c.setTransform(o.dpr, 0, 0, o.dpr, o.dpr * cx, o.dpr * cy)
        dessinerFond(c, o.fond ? this.fond : 'blanc', cam, o.l, o.h, this.origine, o.impression ? { impression: o.dpr } : {})
      }
      c.setTransform(o.dpr * cam.z, 0, 0, o.dpr * cam.z, o.dpr * (cam.x + cx), o.dpr * (cam.y + cy))
      // Les formules sont dans le dernier calque : peintes après tout le reste
      for (const f of formes) {
        if (f.type !== 'formule') this.dessinerForme(c, f, null)
        else if (o.formule) { c.save(); o.formule(c, f); c.restore() }
      }
      if (!this.esquisse) this.purgerChemins(formes)
    } finally {
      c.restore()
      this.l = garde.l; this.h = garde.h; this.dpr = garde.dpr; this.esquisse = garde.esquisse; this.contraste = garde.contraste
    }
  }

  private dessinerForme(c: CanvasRenderingContext2D, f: Forme, dec: { dx: number; dy: number } | null) {
    if (f.type === 'trait') this.dessinerTrait(c, f, dec)
    else if (f.type === 'segment') {
      const x = f.x + (dec?.dx ?? 0), y = f.y + (dec?.dy ?? 0)
      c.strokeStyle = f.couleur; c.lineWidth = this.epaisseurVue(f.taille); c.lineCap = 'round'
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + f.dx, y + f.dy); c.stroke()
    }
    else if (f.type === 'polygone' || f.type === 'cercle') this.dessinerFigure(c, f, dec)
    else if (f.type === 'image') this.dessinerImage(c, f, dec)
  }

  /** L'épaisseur affichée d'une figure ou d'un segment (monde) : la sienne,
   *  et en contraste renforcé jamais moins de 2 px d'écran (un contour fin,
   *  au vidéoprojecteur, ne se voit pas du fond de la classe) */
  private epaisseurVue(taille: number): number {
    return this.contraste ? Math.max(taille, 2 / (this.cam.z || 1)) : taille
  }

  /** Trace le chemin en cours comme un cadre de la sélection : un filet de
   *  `largeur` px d'écran, de cette couleur, en tirets (px d'écran) ou plein ;
   *  en contraste renforcé, en deux tons, 5 px blancs dessous et 3 px de sa
   *  couleur dessus : il se voit sur l'écriture comme sur une photo */
  private filetSelection(c: CanvasRenderingContext2D, couleur: string, largeur: number, tirets?: number[]) {
    const z = this.cam.z
    c.save()
    if (this.contraste) {
      c.setLineDash([]); c.strokeStyle = '#ffffff'; c.lineWidth = 5 / z; c.stroke()
      largeur = 3
    }
    c.strokeStyle = couleur; c.lineWidth = largeur / z
    c.setLineDash(tirets ? tirets.map(t => t / z) : [])
    c.stroke()
    c.restore()
  }

  /** Le filet des poignées (leurs carrés, les ronds des sommets, la pastille
   *  ↻), en px d'écran : 2,5 en contraste renforcé */
  private get filetPoignee(): number { return this.contraste ? 2.5 : 1.6 }

  /** Ce qu'on voit d'une droite ou d'une demi-droite : ses deux bouts, au bord de l'écran */
  etendue(f: Figure): [P, P] | null {
    if (f.type !== 'polygone' || !f.prolonge || f.pts.length !== 4) return null
    const [a, b] = sommetsDe(f)
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1, u = { x: (b.x - a.x) / l, y: (b.y - a.y) / l }
    const v = this.cam.visible(this.l, this.h)
    const loin = Math.hypot(v.l, v.h) + Math.hypot(a.x - v.x - v.l / 2, a.y - v.y - v.h / 2)
    const debut = f.prolonge === 'droite' ? { x: a.x - u.x * loin, y: a.y - u.y * loin } : a
    return [debut, { x: a.x + u.x * loin, y: a.y + u.y * loin }]
  }

  /** La partie visible de l'étendue (coupée au bord de l'écran, avec une marge) */
  etendueVisible(f: Figure): [P, P] | null {
    const e = this.etendue(f)
    if (!e) return null
    const v = this.cam.visible(this.l, this.h), m = 4 / this.cam.z
    const [p, q] = e, d = { x: q.x - p.x, y: q.y - p.y }
    let t0 = 0, t1 = 1
    for (const [pp, qq] of [[-d.x, p.x - (v.x + m)], [d.x, v.x + v.l - m - p.x], [-d.y, p.y - (v.y + m)], [d.y, v.y + v.h - m - p.y]]) {
      if (pp === 0) { if (qq < 0) return null; continue }
      const r = qq / pp
      if (pp < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r)
    }
    if (t0 > t1) return null
    return [{ x: p.x + d.x * t0, y: p.y + d.y * t0 }, { x: p.x + d.x * t1, y: p.y + d.y * t1 }]
  }

  private dessinerTrait(c: CanvasRenderingContext2D, t: Trait, dec: { dx: number; dy: number } | null) {
    if (this.esquisse) { this.esquisserTrait(c, t); return }
    // Le dernier point compte aussi : un trait qui se dessine garde parfois
    // le même nombre de points d'une image à l'autre, mais pas le même bout.
    // Et le deuxième point et celui du milieu (lot 5) : un trait FERMÉ (son
    // dernier point relatif reste (0, 0)) qu'on tourne sans changer sa
    // taille, ou le morceau qu'une gomme partielle laisse, gardaient sinon la
    // même clé, et l'écran repeignait l'ancien contour. Pas de cache par
    // objet (une WeakMap) : la revue relit chaque planche en objets neufs, et
    // recalculerait tous les contours à chaque image. Ces nombres se
    // comparent tels quels, sans en faire une chaîne : sur une page de 2000
    // mots, écrire la clé à chaque image coûtait plus que de peindre (5 ms
    // par image de la scène sur un poste lent, la vérification du lot 5).
    const p = t.pts, n = p.length, m = 3 * Math.floor(n / 6)
    let entree = this.chemins.get(t.id)
    const k = entree?.cle
    if (!entree || !k || k.n !== n || k.taille !== t.taille || k.pression !== t.pression || k.fx !== p[n - 3] || k.fy !== p[n - 2]
      || k.dx !== p[3] || k.dy !== p[4] || k.mx !== p[m] || k.my !== p[m + 1]) {
      entree = { cle: { n, taille: t.taille, pression: t.pression, fx: p[n - 3], fy: p[n - 2], dx: p[3], dy: p[4], mx: p[m], my: p[m + 1] }, chemin: cheminDuTrait(t, true) }
      this.chemins.set(t.id, entree)
    }
    c.save()
    c.translate(t.x + (dec?.dx ?? 0), t.y + (dec?.dy ?? 0))
    c.globalAlpha = t.opacite
    c.fillStyle = t.couleur
    c.fill(entree.chemin)
    c.restore()
  }

  /** Un trait en esquisse : la ligne brisée de ses points, à peu près de
   *  l'épaisseur moyenne du contour de perfect-freehand (ESQUISSE fois la
   *  taille), jamais plus fine que 0,8 pixel de l'image ; un point seul, un
   *  disque. Rien n'est lu ni écrit dans le cache des tracés. */
  private esquisserTrait(c: CanvasRenderingContext2D, t: Trait) {
    const p = t.pts, n = Math.floor(p.length / 3)
    if (!n) return
    const echelle = this.dpr * this.cam.z
    const e = Math.max(t.taille * ESQUISSE, 0.8 / (echelle || 1))
    c.save()
    c.translate(t.x, t.y)
    c.globalAlpha = t.opacite
    c.beginPath()
    if (n === 1 || p.every((v, i) => i % 3 === 2 || v === p[i % 3])) {
      c.fillStyle = t.couleur
      c.arc(p[0], p[1], e / 2, 0, Math.PI * 2); c.fill()
    } else {
      c.strokeStyle = t.couleur; c.lineWidth = e; c.lineCap = 'round'; c.lineJoin = 'round'
      c.moveTo(p[0], p[1])
      for (let i = 3; i + 1 < p.length; i += 3) c.lineTo(p[i], p[i + 1])
      c.stroke()
    }
    c.restore()
  }

  // ---------- Images ----------
  /** Où trouver les pixels d'une image (chargée à part, une fois) */
  pixels: (src: string) => HTMLImageElement | null = () => null
  /** Comment écrire une formule. Le tableau y branche KaTeX ; le lecteur des
   *  élèves ne le charge que si la séance a des formules. */
  rendreFormule: (latex: string, el: HTMLElement) => void = (latex, el) => { el.textContent = latex }
  /** À appeler quand la façon d'écrire les formules change : on les réécrit toutes */
  reecrireFormules() { for (const e of this.elementsFormules.values()) e.cle = ''; this.toutRedessiner() }

  private dessinerImage(c: CanvasRenderingContext2D, f: ImageForme, dec: { dx: number; dy: number } | null) {
    const img = this.pixels(f.src)
    const [a, b, cc, d] = f.m
    c.save()
    c.transform(a, b, cc, d, f.x + (dec?.dx ?? 0), f.y + (dec?.dy ?? 0))
    if (img?.complete && img.naturalWidth) c.drawImage(img, 0, 0, f.l, f.h)
    else { c.fillStyle = 'rgba(59, 111, 182, 0.08)'; c.fillRect(0, 0, f.l, f.h) }   // pas encore chargée
    c.restore()
  }

  // ---------- Figures géométriques ----------
  dessinerFigure(c: CanvasRenderingContext2D, f0: Figure, dec: { dx: number; dy: number } | null) {
    const f = dec ? { ...f0, x: f0.x + dec.dx, y: f0.y + dec.dy } : f0
    const trace = new Path2D()
    if (f.type === 'cercle') {
      if (f.arc) trace.arc(f.x, f.y, f.r, f.arc.a0, f.arc.a1, f.arc.a1 < f.arc.a0)
      else trace.arc(f.x, f.y, f.r, 0, Math.PI * 2)
    }
    else if (f.prolonge && f.pts.length === 4) {
      // Droite ou demi-droite : jusqu'au bord de ce qu'on voit, quel que soit le zoom
      const [debut, fin] = this.etendue(f)!
      trace.moveTo(debut.x, debut.y); trace.lineTo(fin.x, fin.y)
    }
    else {
      sommetsDe(f).forEach((p, i) => i ? trace.lineTo(p.x, p.y) : trace.moveTo(p.x, p.y))
      if (f.ferme) trace.closePath()
    }
    c.save()
    if (f.fond && ((f.type === 'cercle' && !f.arc) || (f.type === 'polygone' && f.ferme))) {
      c.globalAlpha = 0.22; c.fillStyle = f.fond; c.fill(trace); c.globalAlpha = 1
    }
    const e = this.epaisseurVue(f.taille)
    c.strokeStyle = f.couleur; c.lineWidth = e; c.lineJoin = 'round'; c.lineCap = 'round'
    if (f.tirets) c.setLineDash([e * 3, e * 2.5])
    c.stroke(trace)
    c.setLineDash([])

    // Codage : petits traits sur les côtés égaux, carré sur les angles droits
    c.lineWidth = this.epaisseurVue(Math.max(1.5, f.taille * 0.6))
    if (f.codage && f.type === 'polygone') {
      const k = codageDe(f)
      for (const t of k.traits) {
        const l = Math.hypot(t.b.x - t.a.x, t.b.y - t.a.y) || 1
        const u = { x: (t.b.x - t.a.x) / l, y: (t.b.y - t.a.y) / l }
        const m = { x: (t.a.x + t.b.x) / 2, y: (t.a.y + t.b.y) / 2 }
        c.beginPath()
        for (let i = 0; i < t.n; i++) {
          const d = (i - (t.n - 1) / 2) * 5
          const o = { x: m.x + u.x * d, y: m.y + u.y * d }
          // traits légèrement penchés, comme à la main
          c.moveTo(o.x - u.y * 7 - u.x * 2, o.y + u.x * 7 - u.y * 2)
          c.lineTo(o.x + u.y * 7 + u.x * 2, o.y - u.x * 7 + u.y * 2)
        }
        c.stroke()
      }
      for (const d of k.droits) {
        const a = 11
        c.beginPath()
        c.moveTo(d.s.x + d.u.x * a, d.s.y + d.u.y * a)
        c.lineTo(d.s.x + (d.u.x + d.v.x) * a, d.s.y + (d.u.y + d.v.y) * a)
        c.lineTo(d.s.x + d.v.x * a, d.s.y + d.v.y * a)
        c.stroke()
      }
    }
    if (f.type === 'cercle' && (f.codage || f.sommets)) {
      c.beginPath()                                    // le centre, marqué d'une croix
      c.moveTo(f.x - 5, f.y - 5); c.lineTo(f.x + 5, f.y + 5); c.moveTo(f.x + 5, f.y - 5); c.lineTo(f.x - 5, f.y + 5)
      c.stroke()
    }

    // Extrémités d'une ligne ouverte : flèche, trait, crochet
    if (f.type === 'polygone' && !f.ferme && f.pts.length >= 4) {
      const s = sommetsDe(f)
      for (const i of [0, s.length - 1]) {
        const st = f.stylePoints?.[i]
        if (st?.bout && st.bout !== 'aucun') dessinerBout(c, s[i], s[i === 0 ? 1 : s.length - 2], st.bout, st.couleur ?? f.couleur, f.taille * (st.taille ?? 1))
      }
    }

    // Points : la marque choisie, ou un point si les sommets sont affichés
    const points = f.type === 'polygone' ? sommetsDe(f) : [{ x: f.x, y: f.y }]
    points.forEach((p, i) => {
      const st = f.stylePoints?.[i]
      // Sans réglage : un point si les sommets sont affichés — sauf sous une flèche ou un trait
      const marque = st?.marque ?? (f.sommets && f.type === 'polygone' && !(st?.bout && st.bout !== 'aucun') ? 'point' : 'aucun')
      if (marque !== 'aucun') dessinerMarque(c, p, marque, st?.couleur ?? f.couleur, Math.max(2.5, f.taille * 0.7) * (st?.taille ?? 1))
    })

    // Noms
    if (f.sommets && f.noms) {
      c.textAlign = 'center'; c.textBaseline = 'middle'
      placesDesNoms(f).forEach((p, i) => {
        const nom = f.noms?.[i], st = f.styleNoms?.[i]
        if (!nom || st?.cache) return
        c.fillStyle = st?.couleur ?? f.couleur
        c.font = `${st?.droit ? '' : 'italic '}${st?.taille ?? 22}px "${st?.droit ? 'KaTeX_Main' : 'KaTeX_Math'}", "Times New Roman", serif`
        c.fillText(nom.replace(/_(\d+)/, '$1'), p.x, p.y)
      })
    }
    c.restore()
  }

  // ---------- Couche formules ----------
  private placerFormules() {
    const cam = this.cam
    this.coucheFormules.style.transform = `translate(${cam.x}px, ${cam.y}px) scale(${cam.z})`
    const vues = new Set<string>()
    // Leur rang (1, 2, 3…) dans l'ordre des z : c'est leur ordre à l'écran.
    // (Avant le lot 5, z / 1000 : deux formules posées la même seconde
    // avaient le même, et un z placé entre deux voisins n'a de sens que
    // comme rang.)
    let rang = 0
    for (const f of this.enOrdre()) {
      if (f.type !== 'formule') continue
      vues.add(f.id)
      rang++
      const cle = `${f.latex}|${f.couleur}|${f.taille}`
      let e = this.elementsFormules.get(f.id)
      if (!e) {
        const el = document.createElement('div')
        el.className = 'formule'
        this.coucheFormules.appendChild(el)
        e = { cle: '', el, cachee: false, transform: '' }
        this.elementsFormules.set(f.id, e)
      } else if (e.cachee) { e.cachee = false; e.el.style.visibility = '' }
      if (e.cle !== cle) {
        this.rendreFormule(f.latex || '\\square', e.el)
        e.el.style.color = f.couleur
        e.el.style.fontSize = f.taille + 'px'
        e.cle = cle
      }
      const dec = this.selection.has(f.id) && libre(f) ? this.decalage : { dx: 0, dy: 0 }
      e.el.style.left = (f.x + dec.dx) + 'px'
      e.el.style.top = (f.y + dec.dy) + 'px'
      e.el.style.zIndex = String(rang)
      // Tournée (lot 5) : par CSS, autour de son coin (x, y) ; le texte reste
      // vectoriel, net à tout zoom, et KaTeX ne la récrit pas (la clé de
      // l'élément ne compte pas la rotation). Pendant qu'on la change de
      // taille ou qu'on la tourne (voir transfo), la transformation en
      // cours, composée à sa rotation : son point (u, v) va en M(coin +
      // R(u, v)), soit, depuis son coin, la partie linéaire de M fois R, et le
      // chemin que M fait faire au coin.
      const r = rotationDe(f), t = this.transfo
      let tr = r ? `rotate(${r}rad)` : ''
      if (t?.ids.has(f.id)) {
        const [a, b, cc, d, ex, fy] = t.m, co = Math.cos(r), si = Math.sin(r)
        tr = `matrix(${a * co + cc * si}, ${b * co + d * si}, ${-a * si + cc * co}, ${-b * si + d * co}, ${a * f.x + cc * f.y + ex - f.x}, ${b * f.x + d * f.y + fy - f.y})`
      }
      if (e.transform !== tr) {
        e.el.style.transform = tr
        e.el.style.transformOrigin = tr ? '0 0' : ''
        e.transform = tr
      }
    }
    // Une formule qui s'en va est seulement cachée (sans quitter la mise en
    // page : la remontrer ne coûte rien) : revenir sur une autre page, ou sur
    // une autre image de la revue, ne la refait pas passer par KaTeX. On en
    // garde une bonne réserve, comme pour les tracés.
    const purger = this.elementsFormules.size > vues.size + 500
    for (const [id, e] of this.elementsFormules) {
      if (vues.has(id)) continue
      if (purger) { e.el.remove(); this.elementsFormules.delete(id) }
      else if (!e.cachee) { e.cachee = true; e.el.style.visibility = 'hidden' }
    }
  }

  /** Boîte LOCALE d'une formule, en monde : son coin (x, y) et sa taille, qui
   *  vient du rendu KaTeX, NON tournée (voir coinsFormule et englobante dans
   *  geometrie.ts, qui en font le reste) */
  boiteFormule(f: Formule) {
    const vu = this.elementsFormules.get(f.id)
    const e = vu && !vu.cachee ? vu : null
    const l = e ? e.el.offsetWidth : f.taille * Math.max(1, f.latex.length * 0.5)
    const h = e ? e.el.offsetHeight : f.taille * 1.4
    return { x: f.x, y: f.y, l, h }
  }

  // ---------- Couche directe ----------
  private peindreDirect() {
    const c = this.cd, cam = this.cam
    c.setTransform(1, 0, 0, 1, 0, 0)
    c.clearRect(0, 0, this.direct.width, this.direct.height)
    c.setTransform(this.dpr * cam.z, 0, 0, this.dpr * cam.z, this.dpr * cam.x, this.dpr * cam.y)

    if (this.enAttente) this.dessinerDirect(c, this.enAttente)
    if (this.monTrait) this.dessinerDirect(c, this.monTrait)

    if (this.fantomes.length) {
      c.save(); c.globalAlpha = 0.38
      for (const f of this.fantomes) this.dessinerFigure(c, f, null)
      c.restore()
    }
    if (this.cible) {
      const { a, b } = this.cible
      c.save(); c.strokeStyle = 'rgba(31, 95, 191, 0.35)'; c.fillStyle = 'rgba(31, 95, 191, 0.18)'; c.lineCap = 'round'
      if (b) { c.lineWidth = 12 / cam.z; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke() }
      else { c.lineWidth = 2 / cam.z; c.beginPath(); c.arc(a.x, a.y, 12 / cam.z, 0, Math.PI * 2); c.fill(); c.stroke() }
      c.restore()
    }
    if (this.survol) {
      // L'objet survolé, et les autres membres de son groupe (lot 5)
      const ids = this.survolAussi.length ? new Set([this.survol, ...this.survolAussi]) : null
      const survoles = ids ? this.formes.filter(x => ids.has(x.id)) : this.formes.filter(x => x.id === this.survol)
      for (const f of survoles) {
        if (f.type === 'formule') {
          // Son rectangle, tourné avec elle (lot 5), pas son englobante
          const b = this.boiteFormule(f), m = 5 / cam.z
          c.save()
          tournerFormule(c, f, 0, 0)
          c.fillStyle = 'rgba(59, 111, 182, 0.07)'; c.strokeStyle = 'rgba(59, 111, 182, 0.6)'; c.lineWidth = (this.contraste ? 2.5 : 1.5) / cam.z
          c.beginPath(); c.roundRect(b.x - f.x - m, b.y - f.y - m, b.l + 2 * m, b.h + 2 * m, 6 / cam.z); c.fill(); c.stroke()
          c.restore()
        } else if (f.type === 'image') {
          // Une image : le halo suit son seul tour. La repeindre ici, sur la
          // couche directe, la mettrait au-dessus de ce qu'on a écrit
          // dessus : l'écriture semblait disparaître dès qu'on la survolait
          // ou qu'on cliquait dessus
          const q = coinsImage(f)
          c.save()
          c.shadowColor = 'rgba(31, 111, 235, 0.95)'; c.shadowBlur = (this.contraste ? 24 : 14) * this.dpr
          c.strokeStyle = 'rgba(31, 111, 235, 0.55)'; c.lineWidth = (this.contraste ? 3 : 2) / cam.z; c.lineJoin = 'round'
          c.beginPath(); c.moveTo(q[0].x, q[0].y); for (let i = 1; i < 4; i++) c.lineTo(q[i].x, q[i].y); c.closePath()
          c.stroke(); c.stroke()
          c.restore()
        } else {
          // Un halo bleu qui suit la forme elle-même : on voit ce qu'on va prendre
          c.save()
          // (plus large en contraste renforcé)
          c.shadowColor = 'rgba(31, 111, 235, 0.95)'; c.shadowBlur = (this.contraste ? 24 : 14) * this.dpr
          this.dessinerForme(c, f, null); this.dessinerForme(c, f, null)
          c.restore()
        }
      }
    }
    if (this.apercu) this.dessinerFigure(c, this.apercu, null)
    if (this.monSegment) {
      const s = this.monSegment
      c.strokeStyle = s.couleur; c.lineWidth = this.epaisseurVue(s.taille); c.lineCap = 'round'
      c.beginPath(); c.moveTo(s.x1, s.y1); c.lineTo(s.x2, s.y2); c.stroke()
    }

    // Sélection : un cadre en tirets autour de chaque forme tenue (ce qui est
    // verrouillé, sélectionné le temps de son menu, a le sien plus bas, gris,
    // avec son cadenas)
    const cadenas: { f: Forme; cadre: boolean }[] = []
    if (this.cadenas) {
      const f = this.formes.find(x => x.id === this.cadenas!.id)
      if (f && !this.selection.has(f.id)) cadenas.push({ f, cadre: this.cadenas.cadre })
    }
    // Le cadre de taille (lot 5) tient lieu du cadre plein d'un groupe pris
    // seul : un seul dessin. Pendant qu'on change la taille ou qu'on tourne,
    // ce qui bouge n'a que lui (ses tirets et ses poignées resteraient à
    // l'ancienne place).
    const leCadre = this.cadre
    const tr = this.transfo
    if (this.selection.size) {
      // Les cadres en tirets de tout ce qui est pris tiennent en UN chemin,
      // tracé une seule fois (deux en contraste renforcé, voir
      // filetSelection), comme avant le lot 5 : un filet par objet (save,
      // tirets, stroke, restore) triplait le temps de la couche directe sur
      // une page de 2000 mots toute prise (la vérification du lot 5). Les
      // tirets repartent à chaque rectangle, comme ils le faisaient. Les
      // halos des droites et des cercles (ce qu'on en voit) passent dessous,
      // chacun le sien : il y en a peu.
      const dx = this.decalage.dx, dy = this.decalage.dy, m = 6 / cam.z
      const rects: number[] = [], tournes: P[][] = [], ronds: number[] = []
      // Un seul objet pris (les points repérés sur une image prise ne
      // comptent pas) et son cadre de taille montré : son trait fin suffit,
      // sans tirets autour (retouches après le lot 5, le souhait du
      // professeur : « trop de traits »)
      const principaux = this.formes.filter(f => this.selection.has(f.id) && !((f.type === 'polygone' || f.type === 'cercle') && f.lie && this.selection.has(f.lie)))
      const sansTirets = !!leCadre && leCadre.cadre.coins.length === 4 && principaux.length === 1
      for (const f0 of this.formes) {
        if (!this.selection.has(f0.id)) continue
        if (!libre(f0)) { cadenas.push({ f: f0, cadre: true }); continue }
        if (tr?.ids.has(f0.id) || sansTirets) continue
        const f = this.remplacement?.id === f0.id ? this.remplacement : f0
        const vu = f.type === 'polygone' || f.type === 'cercle' ? this.etendueVisible(f) : null
        if (vu) {
          c.save(); c.setLineDash([]); c.globalAlpha = this.contraste ? 0.4 : 0.28; c.lineCap = 'round'; c.strokeStyle = '#3b6fb6'; c.lineWidth = (f.type === 'polygone' ? f.taille : 2) + 12 / cam.z
          c.beginPath(); c.moveTo(vu[0].x + dx, vu[0].y + dy); c.lineTo(vu[1].x + dx, vu[1].y + dy); c.stroke()
          c.restore()
          continue
        }
        if (f.type === 'formule' && rotationDe(f)) {
          // Une formule tournée : son rectangle tourné (lot 5), autour de
          // son coin (x, y), comme tournerFormule
          const b = this.boiteFormule(f), r = rotationDe(f), co = Math.cos(r), si = Math.sin(r)
          const ox = f.x + dx, oy = f.y + dy, x0 = b.x - f.x - m, y0 = b.y - f.y - m, x1 = x0 + b.l + 2 * m, y1 = y0 + b.h + 2 * m
          tournes.push([[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => ({ x: ox + x * co - y * si, y: oy + x * si + y * co })))
          continue
        }
        // Au plus près de l'objet (retouches après le lot 5, le souhait du
        // professeur) : une image, le tour de l'image elle-même (tournée avec
        // elle, ses poignées dessus) ; un cercle entier, un cercle ; un trait
        // ou une figure, le rectangle ajusté à son tracé, penché avec une
        // droite oblique (voir rectangleDe)
        if (f.type === 'image') {
          tournes.push(coinsImage(f).map(p => ({ x: p.x + dx, y: p.y + dy })))
          continue
        }
        if (f.type === 'cercle' && !f.arc) {
          ronds.push(f.x + dx, f.y + dy, f.r + f.taille / 2 + m)
          continue
        }
        const r = rectangleDe(f)
        if (r?.angle) {
          tournes.push(coinsAjustes(r, m).map(p => ({ x: p.x + dx, y: p.y + dy })))
          continue
        }
        // Droit : serré autour du tracé (sans la place des noms d'une figure,
        // ni le carré d'un cercle autour d'un arc)
        if (r) { rects.push(r.u0 + dx - m, r.v0 + dy - m, r.u1 - r.u0 + 2 * m, r.v1 - r.v0 + 2 * m); continue }
        const b = this.boite(f)
        rects.push(b.x + dx - m, b.y + dy - m, b.l + 2 * m, b.h + 2 * m)
      }
      if (rects.length || tournes.length || ronds.length) {
        c.beginPath()
        for (let i = 0; i < rects.length; i += 4) c.rect(rects[i], rects[i + 1], rects[i + 2], rects[i + 3])
        for (const q of tournes) { c.moveTo(q[0].x, q[0].y); c.lineTo(q[1].x, q[1].y); c.lineTo(q[2].x, q[2].y); c.lineTo(q[3].x, q[3].y); c.closePath() }
        for (let i = 0; i < ronds.length; i += 3) { c.moveTo(ronds[i] + ronds[i + 2], ronds[i + 1]); c.arc(ronds[i], ronds[i + 1], ronds[i + 2], 0, Math.PI * 2) }
        this.filetSelection(c, '#3b6fb6', 1.5, [6, 4])
      }
      c.setLineDash([])
      // Les groupes que touche la sélection (lot 5) : un groupe pris, un
      // cadre plein fin autour de la boîte de tous ses membres (en plus du
      // cadre en tirets de chacun) ; un membre pris seul, la boîte de son
      // groupe en pointillé très clair. Un peu plus loin que les tirets, un
      // peu moins que la barre d'actions (10 px). Un chemin pour chaque sorte,
      // comme les tirets (Ctrl + A sur une page de nombreux groupes).
      const pleins: number[] = [], clairs: number[] = []
      for (const g of groupesTouches(this.formes, this.selection)) {
        if (leCadre && g.entier && (tr || g.membres.length === this.selection.size)) continue
        let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
        for (const f0 of g.membres) {
          const f = this.remplacement?.id === f0.id ? this.remplacement : f0
          const b = this.boite(f), d = this.selection.has(f.id) ? this.decalage : { dx: 0, dy: 0 }
          x1 = Math.min(x1, b.x + d.dx); y1 = Math.min(y1, b.y + d.dy); x2 = Math.max(x2, b.x + b.l + d.dx); y2 = Math.max(y2, b.y + b.h + d.dy)
        }
        const mg = 9 / cam.z
        ;(g.entier ? pleins : clairs).push(x1 - mg, y1 - mg, x2 - x1 + 2 * mg, y2 - y1 + 2 * mg)
      }
      const rectangles = (l: number[]) => { c.beginPath(); for (let i = 0; i < l.length; i += 4) c.rect(l[i], l[i + 1], l[i + 2], l[i + 3]) }
      if (pleins.length) { rectangles(pleins); this.filetSelection(c, '#3b6fb6', 1.5) }
      if (clairs.length) { rectangles(clairs); this.filetSelection(c, this.contraste ? 'rgba(59, 111, 182, 0.6)' : 'rgba(59, 111, 182, 0.35)', 1.5, [2, 3]) }
      // Les poignées : ce qu'on peut attraper dans la figure choisie
      const seule = this.selection.size === 1 ? this.formes.find(f => this.selection.has(f.id)) : undefined
      const f = seule && this.remplacement?.id === seule.id ? this.remplacement : seule
      // Jamais sur ce qui est verrouillé : ses sommets ne se prennent pas ;
      // ni pendant qu'on la tourne (ils resteraient à l'ancienne place)
      if (this.poignees && this.poigneesActives && !tr && f && libre(f) && (f.type === 'polygone' || f.type === 'cercle')) {
        const pts = f.type === 'polygone' ? sommetsDe(f)
          : [{ x: f.x + f.r * Math.SQRT1_2, y: f.y - f.r * Math.SQRT1_2 }]
        c.lineWidth = this.filetPoignee / cam.z; c.strokeStyle = '#3b6fb6'; c.fillStyle = '#ffffff'
        for (const p of pts) { c.beginPath(); c.arc(p.x, p.y, 5.5 / cam.z, 0, Math.PI * 2); c.fill(); c.stroke() }
        if (f.sommets && f.noms) {
          c.setLineDash([2 / cam.z, 3 / cam.z]); c.strokeStyle = 'rgba(59, 111, 182, 0.55)'
          for (const p of placesDesNoms(f)) { c.beginPath(); c.arc(p.x, p.y, 14, 0, Math.PI * 2); c.stroke() }
          c.setLineDash([])
        }
      }
    }
    // Le cadre de taille et la pastille ↻ (lot 5)
    if (leCadre) this.dessinerCadre(c, leCadre)
    if (this.rognage) this.dessinerRognage(c, this.rognage)
    // Le morceau choisi seul : un halo autour du point ou du nom
    if (this.partie && this.poignees) {
      const f0 = this.formes.find(f => f.id === this.partie!.id)
      const f = f0 && this.remplacement?.id === f0.id ? this.remplacement : f0
      const pr = this.partie.prise
      if (f && (f.type === 'polygone' || f.type === 'cercle')) {
        let p: { x: number; y: number } | undefined, r = 9 / cam.z
        if (pr.quoi === 'rayon' && f.type === 'cercle') p = { x: f.x + f.r * Math.SQRT1_2, y: f.y - f.r * Math.SQRT1_2 }
        else if (pr.quoi === 'nom') { p = placesDesNoms(f)[pr.i]; r = 15 }
        else if (pr.quoi === 'sommet') p = f.type === 'cercle' ? { x: f.x, y: f.y } : sommetsDe(f)[pr.i]
        if (p) {
          c.fillStyle = 'rgba(59, 111, 182, 0.16)'; c.strokeStyle = '#3b6fb6'; c.lineWidth = (this.contraste ? 3 : 2) / cam.z
          c.beginPath(); c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill(); c.stroke()
        }
      }
    }
    if (this.cadreSelection) {
      const r = this.cadreSelection
      c.fillStyle = 'rgba(59, 111, 182, 0.08)'; c.strokeStyle = '#3b6fb6'; c.lineWidth = (this.contraste ? 2.5 : 1) / cam.z
      c.fillRect(r.x, r.y, r.l, r.h); c.strokeRect(r.x, r.y, r.l, r.h)
    }
    // Le lasso : un chemin fermé en tirets, sans animation (au vidéoprojecteur,
    // des tirets qui défilent attireraient l'œil)
    if (this.lasso && this.lasso.length >= 4) {
      const q = this.lasso
      c.save()
      c.fillStyle = 'rgba(59, 111, 182, 0.08)'; c.strokeStyle = '#3b6fb6'; c.lineWidth = (this.contraste ? 2.5 : 1.5) / cam.z
      c.setLineDash([6 / cam.z, 4 / cam.z]); c.lineJoin = 'round'
      c.beginPath(); c.moveTo(q[0], q[1])
      for (let i = 2; i < q.length; i += 2) c.lineTo(q[i], q[i + 1])
      c.closePath(); c.fill(); c.stroke()
      c.restore()
    }
    if (this.gomme) {
      c.strokeStyle = this.contraste ? 'rgba(27, 34, 48, 0.85)' : 'rgba(27, 34, 48, 0.55)'; c.lineWidth = (this.contraste ? 2.5 : 1.5) / cam.z
      c.beginPath(); c.arc(this.gomme.x, this.gomme.y, this.gomme.r, 0, Math.PI * 2); c.stroke()
    }
    // Les cadres gris des objets verrouillés qu'on montre (ceux de leurs
    // cadenas, à l'écran, viennent après) : autour de ce qu'on voit de
    // l'objet, tourné avec une image ou une formule tournée (voir coinsVus)
    const vus = cadenas.map(k => ecarterCoins(coinsVus(k.f, k.f.type === 'formule' ? this.boiteFormule(k.f) : this.boite(k.f)), k.cadre ? 6 / cam.z : 0))
    cadenas.forEach((k, i) => {
      if (!k.cadre) return
      const q = vus[i]
      c.beginPath(); c.moveTo(q[0].x, q[0].y)
      for (let j = 1; j < q.length; j++) c.lineTo(q[j].x, q[j].y)
      c.closePath()
      this.filetSelection(c, '#5a6577', 1.5, [6, 4])
    })

    // La mesure en cours (longueur, angle, rayon), près du pointeur
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    // Le cadenas : au coin haut droit de l'objet (de son cadre gris, quand
    // il l'a), à taille d'écran constante. Une image ou une formule tournée :
    // le coin de son rectangle tourné le plus en haut à droite, sur elle, et
    // non celui de la boîte droite qui l'englobe (à 30°, une centaine de
    // pixels plus loin, dans le vide : la vérification du lot 5)
    for (const q of vus) {
      const p = coinHautDroit(q), s = cam.versEcran(p.x, p.y)
      dessinerCadenas(c, s.x, s.y)
    }
    if (this.mesure) {
      const s = cam.versEcran(this.mesure.x, this.mesure.y)
      c.font = '700 14px "Atkinson Hyperlegible", system-ui, sans-serif'
      const l = c.measureText(this.mesure.texte).width + 16
      c.fillStyle = 'rgba(27, 34, 48, 0.88)'
      c.beginPath(); c.roundRect(s.x + 14, s.y - 34, l, 26, 13); c.fill()
      c.fillStyle = '#ffffff'; c.textAlign = 'left'; c.textBaseline = 'middle'
      c.fillText(this.mesure.texte, s.x + 22, s.y - 21)
    }
  }

  /** Le cadre de taille (lot 5, voir cadre.ts) : ses coins, des carrés
   *  blancs (POIGNEE.dessin selon le pointeur) cernés du bleu de la
   *  sélection, tournés avec lui ; les côtés d'une image, des barrettes ; et,
   *  au bout d'un filet, la pastille ↻, exactement celle des instruments
   *  (dessinerPastille). Ce qui est pris garde son cadre en tirets (lots 1
   *  et 2) ; seul le cadre de plusieurs objets (ou d'un groupe) a son bord,
   *  un trait plein fin, qui relie ses coins (sinon ils flotteraient autour
   *  de rien), et pendant un geste (le cadre en tirets ne suit pas). Une
   *  figure seule n'a que la pastille et son filet : ses sommets restent
   *  ses poignées. */
  private dessinerCadre(c: CanvasRenderingContext2D, v: CadreVu) {
    const k = v.cadre, z = this.cam.z
    c.save()
    c.setLineDash([])
    // (en contraste renforcé, le filet, le bord et les poignées plus marqués)
    c.strokeStyle = '#3b6fb6'; c.lineWidth = (this.contraste ? 2.5 : 1.2) / z
    c.beginPath(); c.moveTo(k.filet[0].x, k.filet[0].y); c.lineTo(k.filet[1].x, k.filet[1].y); c.stroke()
    if (k.coins.length === 4) {
      const q = k.coins
      // (de l'épaisseur du cadre plein d'un groupe, dont il tient lieu)
      // Toujours son bord, un trait plein fin : ses coins sont dessus (seul,
      // l'objet n'a plus de tirets en plus, voir sansTirets)
      c.beginPath(); q.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y))); c.closePath()
      this.filetSelection(c, '#3b6fb6', 1.2)
      const a = Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x), d = POIGNEE.dessin[v.pointeur] / z
      c.fillStyle = '#ffffff'; c.strokeStyle = '#3b6fb6'; c.lineWidth = this.filetPoignee / z
      const poignee = (p: P, l: number, h: number, rond: number) => {
        c.save(); c.translate(p.x, p.y); c.rotate(a)
        c.beginPath(); c.roundRect(-l / 2, -h / 2, l, h, rond); c.fill(); c.stroke()
        c.restore()
      }
      // Les côtés d'abord : un coin passe dessus si le cadre est petit
      if (k.cotes) {
        for (let i = 0; i < 4; i++) {
          const m = { x: (q[i].x + q[(i + 1) % 4].x) / 2, y: (q[i].y + q[(i + 1) % 4].y) / 2 }
          const long = 1.8 * d, court = 0.6 * d
          poignee(m, i % 2 ? court : long, i % 2 ? long : court, court / 2)
        }
      }
      for (const p of q) poignee(p, d, d, 1.5 / z)
    }
    dessinerPastille(c, k.pastille, z, v.geste === 'tourner' && !v.gauche, 'rotation', POIGNEE.pastille[v.pointeur], this.filetPoignee)
    // ↺, à côté : la même, retournée (retouches après le lot 5)
    c.save(); c.translate(k.inverse.x, k.inverse.y); c.scale(-1, 1); c.translate(-k.inverse.x, -k.inverse.y)
    dessinerPastille(c, k.inverse, z, v.geste === 'tourner' && !!v.gauche, 'rotation', POIGNEE.pastille[v.pointeur], this.filetPoignee)
    c.restore()
    c.restore()
  }

  /** Rogner une image (voir rognage.ts) : ce qu'on enlève, assombri ; le
   *  bord de la partie gardée, en blanc sous le bleu de la sélection (il se
   *  voit sur une photo sombre comme sur une feuille) ; ses huit poignées,
   *  celles du cadre de taille (des carrés aux coins, des barrettes aux
   *  côtés), tournées avec l'image */
  private dessinerRognage(c: CanvasRenderingContext2D, v: { id: string; partie: PartieGardee; pointeur: TypePointeur }) {
    const f = this.formes.find(g => g.id === v.id)
    if (f?.type !== 'image') return
    const z = this.cam.z, tout = coinsImage(f), q = coinsGardes(f, v.partie)
    const chemin = (p: P[]) => { c.moveTo(p[0].x, p[0].y); for (let i = 1; i < 4; i++) c.lineTo(p[i].x, p[i].y); c.closePath() }
    c.save()
    c.setLineDash([])
    c.beginPath(); chemin(tout); chemin(q)
    c.fillStyle = 'rgba(27, 34, 48, 0.55)'; c.fill('evenodd')
    c.beginPath(); chemin(q)
    c.strokeStyle = '#ffffff'; c.lineWidth = 4 / z; c.stroke()
    c.strokeStyle = '#3b6fb6'; c.lineWidth = (this.contraste ? 2.5 : 1.8) / z; c.stroke()
    const a = Math.atan2(q[1].y - q[0].y, q[1].x - q[0].x), d = POIGNEE.dessin[v.pointeur] / z
    c.fillStyle = '#ffffff'; c.strokeStyle = '#3b6fb6'; c.lineWidth = this.filetPoignee / z
    const poignee = (p: P, l: number, h: number, rond: number) => {
      c.save(); c.translate(p.x, p.y); c.rotate(a)
      c.beginPath(); c.roundRect(-l / 2, -h / 2, l, h, rond); c.fill(); c.stroke()
      c.restore()
    }
    for (let i = 0; i < 4; i++) {
      const m = { x: (q[i].x + q[(i + 1) % 4].x) / 2, y: (q[i].y + q[(i + 1) % 4].y) / 2 }
      const long = 1.8 * d, court = 0.6 * d
      poignee(m, i % 2 ? court : long, i % 2 ? long : court, court / 2)
    }
    for (const p of q) poignee(p, d, d, 1.5 / z)
    c.restore()
  }

  private dessinerDirect(c: CanvasRenderingContext2D, t: TraitDirect) {
    if (t.pts.length < 3) return
    c.save()
    c.globalAlpha = t.opacite
    c.fillStyle = t.couleur
    c.fill(cheminDuTrait(t, false))
    c.restore()
  }

  /** Boîte englobante d'une forme, en monde (une formule tournée : celle de
   *  ses quatre coins tournés) : les cadres, la barre d'actions, Tout voir, la
   *  place du menu complet */
  boite(f: Forme) {
    if (f.type === 'formule') return englobante(f, this.boiteFormule(f))
    if (f.type === 'cercle') {
      const m = f.r + f.taille / 2 + (f.sommets ? 28 : 0)
      return { x: f.x - m, y: f.y - m, l: 2 * m, h: 2 * m }
    }
    if (f.type === 'polygone') {
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
      for (const p of [...sommetsDe(f), ...(this.etendueVisible(f) ?? [])]) { x1 = Math.min(x1, p.x); x2 = Math.max(x2, p.x); y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y) }
      const m = f.taille / 2 + (f.sommets ? 28 : 0)
      return { x: x1 - m, y: y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
    }
    if (f.type === 'segment') {
      const m = f.taille / 2
      return { x: Math.min(f.x, f.x + f.dx) - m, y: Math.min(f.y, f.y + f.dy) - m,
        l: Math.abs(f.dx) + 2 * m, h: Math.abs(f.dy) + 2 * m }
    }
    if (f.type === 'image') {
      const c = coinsImage(f), xs = c.map(p => p.x), ys = c.map(p => p.y)
      const x1 = Math.min(...xs), y1 = Math.min(...ys)
      return { x: x1, y: y1, l: Math.max(...xs) - x1, h: Math.max(...ys) - y1 }
    }
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < f.pts.length; i += 3) {
      x1 = Math.min(x1, f.pts[i]); x2 = Math.max(x2, f.pts[i])
      y1 = Math.min(y1, f.pts[i + 1]); y2 = Math.max(y2, f.pts[i + 1])
    }
    const m = f.taille / 2
    return { x: f.x + x1 - m, y: f.y + y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
  }
}

/** Ce que dépasse, au plus, le dessin d'une figure ou d'un ancien segment de
 *  sa boîte (monde) : ses noms déplacés (jusqu'à 70 unités de leur point,
 *  plus leur demi-largeur), son codage, ses flèches. Le rectangle sale de la
 *  gomme (voir Rendu.repeindreZone) repeint une figure qui en est aussi
 *  près : en trop, elle ne coûte qu'un dessin ; en moins, son nom serait
 *  coupé par le fond repeint. */
const MARGE_DES_NOMS = 120

/** Place le contexte (dans le repère du monde) dans celui d'une formule : son
 *  coin (x, y), décalé de (dx, dy), en est l'origine, et ses axes tournent
 *  avec elle ; rien d'autre sans rotation */
function tournerFormule(c: CanvasRenderingContext2D, f: Formule, dx: number, dy: number) {
  c.translate(f.x + dx, f.y + dy)
  const r = rotationDe(f)
  if (r) c.rotate(r)
}

/** Le cadenas d'un objet verrouillé, centré en (x, y) (pixels d'écran) : un
 *  disque blanc de 11 px de rayon cerné du filet des barres (--filet), le
 *  cadenas fermé dessus, du gris des libellés. Discret au vidéoprojecteur,
 *  comme la barre d'actions : aucune couleur. */
function dessinerCadenas(c: CanvasRenderingContext2D, x: number, y: number) {
  c.save()
  c.setLineDash([])
  c.fillStyle = '#ffffff'; c.strokeStyle = '#d4dce8'; c.lineWidth = 1.5
  c.beginPath(); c.arc(x, y, 11, 0, Math.PI * 2); c.fill(); c.stroke()
  // L'anse (un arc ouvert vers le bas), puis le corps, plein
  c.strokeStyle = '#5a6577'; c.fillStyle = '#5a6577'; c.lineWidth = 1.8; c.lineCap = 'round'
  c.beginPath(); c.moveTo(x - 3.2, y - 0.5); c.lineTo(x - 3.2, y - 2.8); c.arc(x, y - 2.8, 3.2, Math.PI, 0); c.lineTo(x + 3.2, y - 0.5); c.stroke()
  c.beginPath(); c.roundRect(x - 5, y - 0.8, 10, 7, 1.5); c.fill()
  c.restore()
}

/** La marque d'un point, de demi-taille r */
function dessinerMarque(c: CanvasRenderingContext2D, p: { x: number; y: number }, m: MarquePoint, couleur: string, r: number) {
  c.save()
  c.fillStyle = couleur; c.strokeStyle = couleur; c.lineWidth = Math.max(1.5, r * 0.55); c.lineCap = 'round'
  c.beginPath()
  if (m === 'point') { c.arc(p.x, p.y, r, 0, Math.PI * 2); c.fill() }
  else if (m === 'rond') { c.arc(p.x, p.y, r * 1.5, 0, Math.PI * 2); c.fillStyle = '#ffffff'; c.fill(); c.stroke() }
  else {
    const k = r * 2.2
    if (m === 'croix') { c.moveTo(p.x - k, p.y - k); c.lineTo(p.x + k, p.y + k); c.moveTo(p.x + k, p.y - k); c.lineTo(p.x - k, p.y + k) }
    else { c.moveTo(p.x - k * 1.2, p.y); c.lineTo(p.x + k * 1.2, p.y); c.moveTo(p.x, p.y - k * 1.2); c.lineTo(p.x, p.y + k * 1.2) }
    c.stroke()
  }
  c.restore()
}

/** Le bout d'une ligne en `p`, qui arrive depuis `de` */
function dessinerBout(c: CanvasRenderingContext2D, p: { x: number; y: number }, de: { x: number; y: number }, b: Bout, couleur: string, e: number) {
  const l = Math.hypot(p.x - de.x, p.y - de.y) || 1
  const u = { x: (p.x - de.x) / l, y: (p.y - de.y) / l }, n = { x: -u.y, y: u.x }
  const k = 5 + e * 2.2
  c.save()
  c.fillStyle = couleur; c.strokeStyle = couleur; c.lineWidth = e; c.lineCap = 'round'; c.lineJoin = 'round'
  c.beginPath()
  if (b === 'fleche') {
    c.moveTo(p.x + u.x * e * 0.6, p.y + u.y * e * 0.6)
    c.lineTo(p.x - u.x * k * 1.6 + n.x * k * 0.75, p.y - u.y * k * 1.6 + n.y * k * 0.75)
    c.lineTo(p.x - u.x * k * 1.6 - n.x * k * 0.75, p.y - u.y * k * 1.6 - n.y * k * 0.75)
    c.closePath(); c.fill()
  } else {
    c.moveTo(p.x + n.x * k, p.y + n.y * k); c.lineTo(p.x - n.x * k, p.y - n.y * k)
    if (b === 'crochet') {                      // [ ou ] : le crochet s'ouvre vers le segment
      c.moveTo(p.x + n.x * k, p.y + n.y * k); c.lineTo(p.x + n.x * k - u.x * k * 0.6, p.y + n.y * k - u.y * k * 0.6)
      c.moveTo(p.x - n.x * k, p.y - n.y * k); c.lineTo(p.x - n.x * k - u.x * k * 0.6, p.y - n.y * k - u.y * k * 0.6)
    }
    c.stroke()
  }
  c.restore()
}
