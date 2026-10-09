// =============================================================
// LES FORMULES SUR UN CANEVAS
// À l'écran, une formule est du HTML rendu par KaTeX, posé au-dessus du
// canevas (voir rendu.ts). Une vignette, une image copiée ou une feuille
// du PDF ne sont qu'un canevas : on y recopie la formule en suivant son
// rendu HTML. Elle est rendue, cachée, dans un élément hors de l'écran,
// comme à l'écran (à sa taille du monde : l'écran aussi la met en page à
// cette taille, puis l'agrandit d'un transform) ; puis on parcourt ce
// rendu, sur un canevas agrandi à l'échelle voulue : chaque texte est écrit
// par fillText à sa place et dans sa police, chaque élément peint son fond
// (\colorbox) et ses bordures (trait de fraction, \overline, \underline,
// \boxed), chaque SVG (racines, flèches, accents extensibles) est dessiné
// comme une image, coupé par ses ancêtres qui ne laissent pas déborder.
// Pourquoi pas un SVG « foreignObject » qui embarque le HTML : mesuré de
// 55 à 105 ms par formule, il faut y glisser 366 Ko de polices, et certains
// navigateurs « salissent » alors le canevas (plus d'export possible). Le
// parcours : 2 à 12 ms par formule (mesuré sur treize formules difficiles),
// avec les polices que la page a déjà, en ligne comme en un seul fichier.
// Comparé à la capture de l'écran, au pixel près ou presque (moins de 3
// d'écart moyen sur 255 dans la boîte de la formule, à 1 et 2 px par unité).
// Les images faites sont gardées, par formule et par échelle (arrondie au
// 1/20), dans un cache borné en pixels. Une formule par tâche : une page
// de 40 formules ne fait jamais une tâche de 300 ms.
// =============================================================
import type { Formule } from '../types'

/** Le cache des images, au plus ce nombre de pixels en tout (les plus
 *  anciennement servies s'en vont) */
const PIXELS_MAX = 24_000_000
/** L'image d'une seule formule : au plus ce côté et ces pixels (au-delà, elle
 *  est faite moins fine, à la même place) */
const COTE_MAX = 8192
const PIXELS_UNE = 8_000_000

/** Une échelle arrondie au 1/20 : la clé du cache (une vignette, une image et
 *  un PDF ne demandent pas chacun une échelle à la décimale près) */
export function arrondirEchelle(e: number): number {
  return Math.max(0.05, Math.round(e * 20) / 20)
}

/** Parmi les échelles déjà prêtes d'une formule, celle qu'on peint pour
 *  l'échelle voulue : la même (arrondie au 1/20), sinon la plus petite des
 *  plus grandes (réduite par drawImage, elle reste nette) ; null quand il n'y
 *  en a pas (une plus petite, agrandie, serait floue : on attend). */
export function meilleureEchelle(pretes: Iterable<number>, voulue: number): number | null {
  const v = arrondirEchelle(voulue)
  let meilleure: number | null = null
  for (const e of pretes) {
    if (e === v) return v
    if (e > v && (meilleure === null || e < meilleure)) meilleure = e
  }
  return meilleure
}

/** L'image d'une formule : un canevas, et sa taille dans le monde */
interface ImageFormule { c: HTMLCanvasElement; l: number; h: number; px: number }

const tache = () => new Promise<void>(r => setTimeout(r, 0))

export class FormulesSurCanevas {
  /** La taille d'une formule dans le monde, mesurée comme à l'écran (padding
   *  compris) : latex|taille → { l, h } */
  private mesures = new Map<string, { l: number; h: number }>()
  /** Les images faites : latex|couleur|taille|échelle → image, la plus
   *  anciennement servie en tête */
  private images = new Map<string, ImageFormule>()
  /** Pour chaque formule (latex|couleur|taille), les échelles prêtes */
  private echelles = new Map<string, Set<number>>()
  /** Celles qu'on n'a pas pu faire (une erreur) : on ne les refait pas */
  private echouees = new Set<string>()
  private pixels = 0
  private enCours = new Map<string, Promise<void>>()
  /** Les polices déjà demandées (style, graisse, famille) */
  private polices = new Set<string>()
  private conteneur: HTMLDivElement | null = null

  constructor(private rendre: (latex: string, el: HTMLElement) => void) {}

  /** La taille d'une formule dans le monde : le rectangle de l'écran, padding
   *  compris. Exacte quand elle a été mesurée ; sinon l'estimation de
   *  Rendu.boiteFormule. */
  taille(f: Formule): { l: number; h: number } {
    return this.mesures.get(cleMesure(f)) ?? { l: f.taille * Math.max(1, f.latex.length * 0.5), h: f.taille * 1.4 }
  }

  /** La taille de cette formule est-elle encore une estimation ? */
  estimee(f: Formule): boolean { return !this.mesures.has(cleMesure(f)) }

  /** Mesure ces formules comme à l'écran (rendues à leur taille, polices
   *  chargées), une par tâche */
  async mesurer(formules: Formule[]): Promise<void> {
    const vues = new Set<string>()
    for (const f of formules) {
      const cle = cleMesure(f)
      if (this.mesures.has(cle) || vues.has(cle)) continue
      vues.add(cle)
      const deja = this.enCours.get('m|' + cle)
      if (deja) { await deja; continue }
      const travail = this.mesurerUne(f, cle)
      this.enCours.set('m|' + cle, travail)
      try { await travail } finally { this.enCours.delete('m|' + cle) }
      await tache()
    }
  }

  private async mesurerUne(f: Formule, cle: string) {
    const div = this.rendu(f)
    if (!div) { this.mesures.set(cle, this.taille(f)); return }
    try {
      await this.attendrePolices(div)
      this.mesures.set(cle, { l: div.offsetWidth, h: div.offsetHeight })
    } catch { this.mesures.set(cle, this.taille(f)) } finally { div.remove() }
  }

  /** Une image de chacune de ces formules à cette échelle (pixels du canevas
   *  par unité du monde), une par tâche ; celles qui sont déjà prêtes ne se
   *  refont pas */
  async preparer(formules: Formule[], echelle: number): Promise<void> {
    const e = arrondirEchelle(echelle)
    const vues = new Set<string>()
    for (const f of formules) {
      const base = cleImage(f), cle = base + '|' + e
      if (vues.has(cle) || this.images.has(cle) || this.echouees.has(cle)) continue
      vues.add(cle)
      const deja = this.enCours.get(cle)
      if (deja) { await deja; continue }
      const travail = this.preparerUne(f, e, base, cle)
      this.enCours.set(cle, travail)
      try { await travail } finally { this.enCours.delete(cle) }
      await tache()
    }
  }

  /** Reste-t-il à préparer cette formule pour la peindre à cette échelle ?
   *  (faux aussi quand on n'a pas pu la faire : elle restera un rectangle) */
  aPreparer(f: Formule, echelle: number): boolean {
    const base = cleImage(f)
    if (this.echouees.has(base + '|' + arrondirEchelle(echelle))) return false
    return meilleureEchelle(this.echelles.get(base) ?? [], echelle) === null
  }

  /** Peint la formule en (f.x, f.y), à sa taille du monde (le contexte est
   *  dans le repère du monde), avec la meilleure image prête pour cette
   *  échelle. Faux si aucune ne l'est : l'appelant peint un rectangle et
   *  repeindra après preparer. */
  peindre(c: CanvasRenderingContext2D, f: Formule, echelle: number): boolean {
    const base = cleImage(f)
    const e = meilleureEchelle(this.echelles.get(base) ?? [], echelle)
    if (e === null) return false
    const cle = base + '|' + e, img = this.images.get(cle)
    if (!img) return false
    // Servie : elle passe en queue, la dernière à partir
    this.images.delete(cle); this.images.set(cle, img)
    c.save()
    c.imageSmoothingEnabled = true
    c.imageSmoothingQuality = 'high'
    c.drawImage(img.c, f.x, f.y, img.l, img.h)
    c.restore()
    return true
  }

  // ---------- Le rendu caché ----------
  /** Le conteneur caché, hors de l'écran : attaché au corps du document (pas
   *  à la racine du tableau : l'inertie des fenêtres et de la trieuse ne le
   *  touche pas) */
  private boite(): HTMLDivElement {
    if (!this.conteneur || !this.conteneur.isConnected) {
      const d = document.createElement('div')
      d.setAttribute('aria-hidden', 'true')
      d.style.cssText = 'position: fixed; left: -100000px; top: 0; visibility: hidden; pointer-events: none; white-space: nowrap;'
      document.body.appendChild(d)
      this.conteneur = d
    }
    return this.conteneur
  }

  /** La formule rendue par KaTeX dans un élément comme celui de l'écran
   *  (classe .formule, sa taille, sa couleur ; le padding de .formule), dans
   *  le conteneur caché. null si KaTeX n'a pas pu. Pas mise en page à la
   *  taille voulue (taille × échelle) : l'écran met en page à la taille du
   *  monde, puis agrandit ; les métriques des polices y sont arrondies au
   *  pixel, et une mise en page plus grande décalerait la ligne de base d'un
   *  ou deux pixels (mesuré à 2 px par unité : jusqu'à 10 d'écart moyen sur
   *  255 pour \boxed, contre moins de 3 ainsi). */
  private rendu(f: Formule): HTMLDivElement | null {
    const div = document.createElement('div')
    div.className = 'formule'
    div.style.left = '0'; div.style.top = '0'
    div.style.fontSize = f.taille + 'px'
    div.style.color = f.couleur
    this.boite().appendChild(div)
    try { this.rendre(f.latex || '\\square', div) } catch { div.remove(); return null }
    return div
  }

  /** Les polices de ce rendu chargées. Sans mise en page, rien n'a commencé à
   *  se charger et document.fonts.ready est déjà résolu : on la force
   *  d'abord. Chromium attend alors de lui-même ; Firefox et Safari ne sont
   *  pas sûrs : chaque famille rencontrée est demandée aussi. */
  private async attendrePolices(div: HTMLElement) {
    void div.offsetHeight
    const voulues: Promise<unknown>[] = []
    for (const n of textesDe(div)) {
      const st = getComputedStyle(n.parentElement!)
      const police = `${st.fontStyle} ${st.fontWeight} 16px ${st.fontFamily}`
      if (this.polices.has(police)) continue
      this.polices.add(police)
      voulues.push(document.fonts.load(police, n.textContent || ' ').catch(() => []))
    }
    // Jamais plus de 4 s : une police qui ne vient pas laisse peindre avec le repli
    await Promise.race([
      Promise.all(voulues).then(() => document.fonts.ready),
      new Promise(r => setTimeout(r, 4000)),
    ])
  }

  private async preparerUne(f: Formule, e: number, base: string, cle: string) {
    const div = this.rendu(f)
    if (!div) { this.echouees.add(cle); return }
    try {
      await this.attendrePolices(div)
      // La même mise en page que pour mesurer : la taille est exacte aussi
      const m = cleMesure(f)
      if (!this.mesures.has(m)) this.mesures.set(m, { l: div.offsetWidth, h: div.offsetHeight })
      const r = await peindreRendu(div, e)
      if (!r) { this.echouees.add(cle); return }
      this.garder(cle, base, e, { c: r.c, l: r.c.width / r.s, h: r.c.height / r.s, px: r.c.width * r.c.height })
    } catch { this.echouees.add(cle) } finally { div.remove() }
  }

  private garder(cle: string, base: string, e: number, img: ImageFormule) {
    this.images.set(cle, img)
    let s = this.echelles.get(base)
    if (!s) this.echelles.set(base, s = new Set())
    s.add(e)
    this.pixels += img.px
    // Les plus anciennement servies s'en vont (jamais celle qu'on vient de faire)
    for (const [k, v] of this.images) {
      if (this.pixels <= PIXELS_MAX || k === cle) break
      this.images.delete(k)
      this.pixels -= v.px
      const b = k.slice(0, k.lastIndexOf('|'))
      const es = this.echelles.get(b)
      es?.delete(Number(k.slice(k.lastIndexOf('|') + 1)))
      if (es && !es.size) this.echelles.delete(b)
    }
  }
}

const cleMesure = (f: Formule) => `${f.latex}|${f.taille}`
const cleImage = (f: Formule) => `${f.latex}|${f.couleur}|${f.taille}`

/** Les nœuds de texte visibles d'un rendu KaTeX (pas sa copie MathML,
 *  cachée, pour les lecteurs d'écran) */
function textesDe(el: HTMLElement): Text[] {
  const r: Text[] = []
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.textContent?.trim() && !n.parentElement?.closest('.katex-mathml')) r.push(n as Text)
  }
  return r
}

/** Peint le rendu HTML d'une formule (mis en page à sa taille du monde) sur
 *  un canevas agrandi à cette échelle (pixels par unité ; moins si la
 *  formule est démesurée : s, l'échelle tenue). La ligne de base de chaque
 *  texte est le haut d'un témoin posé juste après lui (un bloc en ligne de
 *  taille nulle, aligné sur elle) : sans measureText().fontBoundingBoxAscent,
 *  absent de Firefox avant la 116. Les lignes de base, les fonds et les
 *  bordures sont posés sur les px CSS de la mise en page, comme le
 *  navigateur les peint avant d'agrandir (les SVG, non : il ne les y pose
 *  pas) : à 2 px par unité, une fraction ou un \boxed tombent ainsi sur les
 *  mêmes pixels qu'à l'écran à 200 % (mesuré : au plus 1,6 d'écart moyen
 *  sur 255, contre 4,5 sans cela). */
async function peindreRendu(el: HTMLElement, echelle: number): Promise<{ c: HTMLCanvasElement; s: number } | null> {
  const textes = textesDe(el)
  const temoins = textes.map(n => {
    const t = document.createElement('span')
    t.style.cssText = 'display: inline-block; width: 0; height: 0; vertical-align: baseline;'
    n.parentNode!.insertBefore(t, n.nextSibling)
    return t
  })
  try {
    const base = el.getBoundingClientRect()
    const L = Math.max(1, base.width), H = Math.max(1, base.height)
    const s = Math.min(echelle, COTE_MAX / Math.max(L, H), Math.sqrt(PIXELS_UNE / (L * H)))
    const c = document.createElement('canvas')
    c.width = Math.max(1, Math.ceil(L * s)); c.height = Math.max(1, Math.ceil(H * s))
    const x = c.getContext('2d')
    if (!x) return null
    x.setTransform(s, 0, 0, s, 0, 0)
    const ox = base.left, oy = base.top
    /** Une coordonnée posée sur le px CSS de la mise en page le plus proche,
     *  quel que soit le dpr de l'écran (mesuré aux dpr 1, 1,25, 1,5 et 2 :
     *  c'est là que le navigateur pose les lignes de base) */
    const px = (v: number) => Math.round(v)
    const indice = new Map(textes.map((n, i) => [n, i]))
    /** Le rectangle où l'on peut peindre un SVG : coupé par chaque ancêtre
     *  qui ne laisse pas déborder (les flèches de KaTeX font 400em de large,
     *  et .hide-tail les coupe) */
    const coupe = (e: Element) => {
      let r: { l: number; t: number; r: number; b: number } | null = null
      for (let a = e.parentElement; a && a !== el; a = a.parentElement) {
        const st = getComputedStyle(a)
        if (st.overflowX === 'visible' && st.overflowY === 'visible') continue
        const q = a.getBoundingClientRect()
        r = r ? { l: Math.max(r.l, q.left), t: Math.max(r.t, q.top), r: Math.min(r.r, q.right), b: Math.min(r.b, q.bottom) }
          : { l: q.left, t: q.top, r: q.right, b: q.bottom }
      }
      return r
    }
    const marcher = async (n: Node): Promise<void> => {
      if (n.nodeType === Node.TEXT_NODE) {
        const i = indice.get(n as Text)
        if (i === undefined) return
        const st = getComputedStyle(n.parentElement!)
        const r = document.createRange(); r.selectNodeContents(n)
        const q = r.getBoundingClientRect()
        const y = temoins[i].getBoundingClientRect().top
        // Pas la propriété raccourcie « font », vide dans Firefox
        x.font = `${st.fontStyle} ${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
        x.fillStyle = st.color
        x.textBaseline = 'alphabetic'; x.textAlign = 'left'
        x.fillText(n.textContent ?? '', q.left - ox, px(y - oy))
        return
      }
      if (n.nodeType !== Node.ELEMENT_NODE) return
      const e = n as Element
      if (e.classList.contains('katex-mathml')) return
      const st = getComputedStyle(e)
      if (st.display === 'none') return
      const rr = e.getBoundingClientRect()
      const x0 = px(rr.left - ox), y0 = px(rr.top - oy), x1 = px(rr.right - ox), y1 = px(rr.bottom - oy)
      if (e !== el && st.backgroundColor && !transparent(st.backgroundColor)) {
        x.fillStyle = st.backgroundColor; x.fillRect(x0, y0, x1 - x0, y1 - y0)
      }
      for (const cote of ['top', 'right', 'bottom', 'left'] as const) {
        const t = parseFloat(st.getPropertyValue(`border-${cote}-width`))
        if (!(t > 0) || st.getPropertyValue(`border-${cote}-style`) === 'none') continue
        x.fillStyle = st.getPropertyValue(`border-${cote}-color`)
        if (cote === 'top') x.fillRect(x0, y0, x1 - x0, t)
        if (cote === 'bottom') x.fillRect(x0, y1 - t, x1 - x0, t)
        if (cote === 'left') x.fillRect(x0, y0, t, y1 - y0)
        if (cote === 'right') x.fillRect(x1 - t, y0, t, y1 - y0)
      }
      if (e.tagName.toLowerCase() === 'svg') {
        if (!(rr.width > 0) || !(rr.height > 0)) return
        const img = await imageDuSvg(e as SVGSVGElement, rr.width, rr.height, s, st.color)
        if (!img) return
        const cp = coupe(e)
        x.save()
        if (cp) { x.beginPath(); x.rect(cp.l - ox, cp.t - oy, Math.max(0, cp.r - cp.l), Math.max(0, cp.b - cp.t)); x.clip() }
        x.drawImage(img, rr.left - ox, rr.top - oy, rr.width, rr.height)
        x.restore()
        return
      }
      for (const k of [...e.childNodes]) await marcher(k)
    }
    await marcher(el)
    return { c, s }
  } finally {
    for (const t of temoins) t.remove()
  }
}

function transparent(couleur: string): boolean {
  return couleur === 'transparent' || /^rgba\(.*,\s*0\)$/.test(couleur)
}

/** Une copie d'un SVG de KaTeX en image, à sa taille mesurée agrandie de s
 *  (nette une fois dessinée à l'échelle ; au plus 16 millions de pixels et
 *  32 000 de côté : une flèche fait 400em de large, coupée à l'affichage) ;
 *  ses couleurs (celles que lui donnaient les règles de KaTeX, que la copie
 *  n'emporte pas) écrites sur chaque élément */
async function imageDuSvg(svg: SVGSVGElement, l: number, h: number, s: number, couleur: string): Promise<HTMLImageElement | null> {
  const k = Math.min(s, 32000 / Math.max(l, h), Math.sqrt(16_000_000 / (l * h)))
  const copie = svg.cloneNode(true) as SVGSVGElement
  copie.setAttribute('width', String(l * k)); copie.setAttribute('height', String(h * k))
  const origines = [svg, ...svg.querySelectorAll('*')], copies = [copie, ...copie.querySelectorAll('*')]
  origines.forEach((o, i) => {
    const s = getComputedStyle(o), d = copies[i]
    if (!d) return
    d.setAttribute('fill', s.fill); d.setAttribute('stroke', s.stroke)
    if (s.strokeWidth) d.setAttribute('stroke-width', s.strokeWidth)
  })
  let texte = new XMLSerializer().serializeToString(copie).replace(/currentColor/g, couleur)
  if (!/^<svg[^>]*xmlns=/.test(texte)) texte = texte.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
  const img = new Image()
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(texte)
  try { await img.decode() } catch { return null }
  return img
}
