// =============================================================
// PEINDRE UNE PAGE HORS DE L'ÉCRAN
// La fondation commune des vignettes de la trieuse, de la fenêtre
// « Envoyer vers… », de l'image copiée et du PDF : une page (son fond, son
// origine, ses formes) peinte sur n'importe quel canevas, vue par
// n'importe quelle caméra, par le même code que l'écran (Rendu.peindreSur,
// sur un Rendu jamais attaché au document), les formules recopiées par
// FormulesSurCanevas.
// L'ordre pour une image ou un PDF : mesurer (la taille exacte des
// formules), boite (le cadrage), l'échelle, preparer (les polices, les
// formules à cette échelle, les images décodées), puis peindre, qui est
// synchrone : ce qui n'est pas prêt y est un rectangle clair.
// Aussi le réglage gardé du fond imprimé, que partagent l'image copiée et
// le PDF.
// =============================================================
import { Camera } from '../camera'
import { Rendu } from '../rendu'
import { boiteDe } from '../revoir/bobine'
import { placesDesNoms } from '../formes'
import type { Boite } from '../revoir/bobine'
import type { Cercle, Fond, Forme, Formule, Polygone } from '../types'
import { ecrire, lire } from '../reglages'
import { FormulesSurCanevas } from './formules'

/** Le fond imprimé (l'image copiée, le PDF) : '1' ou '0', '1' au départ */
const CLE_FOND = 'mem-sortie-fond'

/** En esquisse (une vignette), une formule de moins de ce nombre de pixels
 *  de haut est un simple rectangle : illisible de toute façon */
export const FORMULE_LISIBLE = 6

/** Une page à peindre : ce qu'en lit le document */
export interface PageAPeindre { fond: Fond; origine: { x: number; y: number }; formes: Forme[] }

export interface OptionsPeinture {
  /** La taille du canevas en px CSS, et ses pixels par px CSS */
  l: number; h: number; dpr: number
  /** Vrai : le papier et son motif ; faux : le papier blanc ; 'aucun' : rien
   *  (on continue une peinture commencée) */
  fond: boolean | 'aucun'
  /** Les traits en lignes brisées, les petites formules en rectangles (une vignette) */
  esquisse?: boolean
  /** D'autres formes que celles de la page (une tranche, une sélection) */
  formes?: Forme[]
  /** Où commence la zone de l × h sur le canevas (px CSS ; (0, 0) sinon) :
   *  la caméra y est relative (voir Rendu.peindreSur) */
  coin?: { x: number; y: number }
}

export class Apercus {
  readonly formules: FormulesSurCanevas
  private cam = new Camera()
  private rendu: Rendu
  private pixels: (src: string) => HTMLImageElement | null
  private fond = lire(CLE_FOND, ['1', '0'], '1') === '1'
  private polices: Promise<void> | null = null
  /** Les polices des noms des points sont-elles chargées ? */
  policesPretes = false

  constructor(o: { pixels: (src: string) => HTMLImageElement | null; rendreFormule: (latex: string, el: HTMLElement) => void }) {
    this.pixels = o.pixels
    this.formules = new FormulesSurCanevas(o.rendreFormule)
    // Un rendu sur un élément jamais attaché : seul peindreSur y sert, et on ne
    // lui pose jamais de formes (voir Rendu.peindreSur)
    this.rendu = new Rendu(this.cam, document.createElement('div'))
    this.rendu.pixels = o.pixels
  }

  /** La boîte de ce qui est écrit, dans le monde (null : rien). Une droite
   *  compte par ses deux points, comme App.boiteDuContenu ; une formule par
   *  sa taille mesurée (estimée tant qu'elle ne l'est pas) ; une figure avec
   *  les noms de ses points (voir boiteDesNoms) : l'image copiée et le PDF
   *  se cadrent dessus, et les coupes du PDF les évitent. */
  boite(formes: Iterable<Forme>): Boite | null {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    const ajouter = (b: Boite | null) => {
      if (!b || !Number.isFinite(b.x) || !Number.isFinite(b.y) || !Number.isFinite(b.l) || !Number.isFinite(b.h)) return
      x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); x2 = Math.max(x2, b.x + b.l); y2 = Math.max(y2, b.y + b.h)
    }
    for (const f of formes) {
      ajouter(f.type === 'formule' ? { x: f.x, y: f.y, ...this.formules.taille(f) } : boiteDe(f))
      if (f.type === 'polygone' || f.type === 'cercle') ajouter(boiteDesNoms(f))
    }
    return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
  }

  /** Les polices des noms des points (peints sur le canevas en KaTeX_Math
   *  et KaTeX_Main) et des graduations du repère. Sur une page fraîche,
   *  aucune n'est encore chargée si aucune formule ni aucun nom n'a été
   *  montré : le canevas prendrait la police de repli (mesuré : 69,6 px au
   *  lieu de 84 pour un mot), en ligne comme en un seul fichier. */
  attendrePolices(): Promise<void> {
    if (!this.polices) {
      // Jamais plus de 4 s : une police qui ne vient pas (le réseau de la
      // classe, pour celle des graduations) laisse peindre avec le repli
      const charger = (p: string) => Promise.race([
        document.fonts.load(p).catch(() => []),
        new Promise(r => setTimeout(r, 4000)),
      ])
      this.polices = Promise.all([
        charger('italic 22px "KaTeX_Math"'), charger('22px "KaTeX_Main"'),
        charger('600 12px "Atkinson Hyperlegible"'),
      ]).then(() => { this.policesPretes = true }, () => { this.policesPretes = true })
    }
    return this.polices
  }

  /** La taille exacte des formules de ces formes (les polices d'abord) */
  async mesurer(formes: Iterable<Forme>): Promise<void> {
    await this.attendrePolices()
    await this.formules.mesurer(formulesDe(formes))
  }

  /** Tout ce qu'il faut pour peindre ces formes à cette échelle (pixels du
   *  canevas par unité du monde) : les polices des noms, les formules, les
   *  images décodées (une image qui ne se décode pas est ignorée) */
  async preparer(formes: Iterable<Forme>, echelle: number): Promise<void> {
    const liste = [...formes]
    await this.attendrePolices()
    await this.formules.preparer(formulesDe(liste), echelle)
    await this.decoder(liste)
  }

  /** Les images de ces formes, décodées */
  async decoder(formes: Iterable<Forme>): Promise<void> {
    const vues = new Set<string>()
    for (const f of formes) {
      if (f.type !== 'image' || vues.has(f.src)) continue
      vues.add(f.src)
      const img = this.pixels(f.src)
      if (img) { try { await img.decode() } catch { /* une image abîmée reste un rectangle */ } }
    }
  }

  /** Ce qui manque pour peindre ces formes à cette échelle (une vignette
   *  repeint quand c'est prêt) : les formules encore estimées, celles qui
   *  attendent leur image (en esquisse, seulement celles qui seront
   *  lisibles), les images pas encore chargées */
  manques(formes: Iterable<Forme>, echelle: number, esquisse = false): { mesures: Formule[]; formules: Formule[]; images: boolean } {
    const r = { mesures: [] as Formule[], formules: [] as Formule[], images: false }
    for (const f of formes) {
      if (f.type === 'formule') {
        if (this.formules.estimee(f)) r.mesures.push(f)
        if (esquisse && this.formules.taille(f).h * echelle < FORMULE_LISIBLE) continue
        if (this.formules.aPreparer(f, echelle)) r.formules.push(f)
      } else if (f.type === 'image' && !r.images) {
        const img = this.pixels(f.src)
        if (img && !img.complete) r.images = true
      }
    }
    return r
  }

  /** Peint une page sur ce canevas, vue par cette caméra (écran = monde × z +
   *  (x, y), en px CSS) : le fond (voir OptionsPeinture), les images, les
   *  formes, les formules. Synchrone : une formule pas encore préparée, ou
   *  trop petite en esquisse, est un rectangle gris très clair ; une image
   *  pas encore chargée, un rectangle clair. */
  peindre(c: CanvasRenderingContext2D, page: PageAPeindre, cam: { x: number; y: number; z: number }, o: OptionsPeinture) {
    this.cam.x = cam.x; this.cam.y = cam.y; this.cam.z = cam.z
    this.rendu.fond = page.fond
    this.rendu.origine = page.origine
    const echelle = cam.z * o.dpr
    this.rendu.peindreSur(c, {
      l: o.l, h: o.h, dpr: o.dpr, fond: o.fond, esquisse: o.esquisse, coin: o.coin,
      formes: o.formes ?? page.formes,
      formule: (c, f) => {
        const t = this.formules.taille(f)
        if (o.esquisse && t.h * echelle < FORMULE_LISIBLE) { rectangleGris(c, f, t); return }
        if (!this.formules.peindre(c, f, echelle)) rectangleGris(c, f, t)
      },
    })
  }

  // ---------- Le fond imprimé ----------
  /** Le fond (carreaux, Seyès…) va-t-il sur l'image copiée et dans le PDF ?
   *  Gardé dans ce navigateur (vrai au départ) */
  fondImprime(): boolean { return this.fond }
  choisirFondImprime(oui: boolean) {
    this.fond = oui
    ecrire(CLE_FOND, oui ? '1' : '0')
  }
}

/**
 * La boîte des noms des points d'une figure (null : aucun nom montré), comme
 * les peint Rendu : chacun centré sur sa place (placesDesNoms : sur la
 * bissectrice, ou là où le professeur l'a déplacé, jusqu'à 70 unités du
 * point), en sa taille (22 unités sans réglage). Sa largeur est estimée
 * (0,7 de la taille par caractère, un peu large pour une lettre italique),
 * sa hauteur à 1,2 fois la taille : un nom déplacé hors de la boîte de la
 * figure (boiteDe ne compte que 28 unités autour des sommets) reste sur
 * l'image copiée et dans le PDF, et une coupe de feuille ne le tranche pas.
 */
export function boiteDesNoms(f: Polygone | Cercle): Boite | null {
  if (!f.sommets || !f.noms) return null
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  placesDesNoms(f).forEach((p, i) => {
    const nom = f.noms?.[i], st = f.styleNoms?.[i]
    if (!nom || st?.cache || !Number.isFinite(p?.x) || !Number.isFinite(p?.y)) return
    const t = st?.taille ?? 22
    const l = Math.max(1, [...nom.replace(/_(\d+)/, '$1')].length) * 0.7 * t, h = 1.2 * t
    x1 = Math.min(x1, p.x - l / 2); x2 = Math.max(x2, p.x + l / 2)
    y1 = Math.min(y1, p.y - h / 2); y2 = Math.max(y2, p.y + h / 2)
  })
  return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}

function formulesDe(formes: Iterable<Forme>): Formule[] {
  const r: Formule[] = []
  for (const f of formes) if (f.type === 'formule') r.push(f)
  return r
}

/** La place d'une formule pas encore prête (ou trop petite pour se lire) */
function rectangleGris(c: CanvasRenderingContext2D, f: Formule, t: { l: number; h: number }) {
  c.fillStyle = 'rgba(27, 34, 48, 0.08)'
  c.beginPath()
  const r = Math.min(t.h, t.l) * 0.18
  if (typeof c.roundRect === 'function') c.roundRect(f.x, f.y, t.l, t.h, r)
  else c.rect(f.x, f.y, t.l, t.h)
  c.fill()
}
