// Les fonds se dessinent toujours, et vite, même très loin de l'origine :
// une forme démesurée entrée dans un document (x = 1e300) met la vue de
// « Tout voir » là-bas, où x + 1 cm vaut x. Une boucle qui avançait de pas en
// pas n'y finissait jamais, et le tableau gelait à chaque chargement. Le
// contexte de dessin est simulé : il compte les lignes, et lève une erreur
// au-delà d'un plafond (une boucle sans fin échoue au lieu de bloquer le test).
// Depuis le lot 5, il retient aussi ce qu'il trace (chaque chemin, avec sa
// couleur et son alpha) : les quatre fonds nouveaux (grands carreaux,
// papier millimétré, papier pointé, réseau isométrique) ne tracent aucune
// famille plus serrée que 6 px d'écran (jamais un écran gris au
// vidéoprojecteur), les tons du millimétré ne changent pas au zoom, et rien
// ne saute d'un cran de zoom au suivant.
// Et la feuille d'un PDF (corrections « affichage » du lot 5) : peinte pour
// le papier, à l'échelle réelle, le papier millimétré y a ses millimètres
// (l'écran ne les trace qu'à partir de 150 % environ) ; toutes les lignes y
// tombent sur les pixels de l'image de la feuille, à leur place exacte à un
// demi-pixel près (aux pixels CSS, un sur deux, un écart de 5 mm faisait
// 4,7 mm sur la feuille).
import { describe, expect, it } from 'vitest'
import { Camera } from '../src/camera'
import { dessinerFond } from '../src/fonds'
import type { Fond } from '../src/types'
import { CM, FONDS } from '../src/types'
import { DPR_PDF, PX_PAR_MM, Z_REEL } from '../src/sorties/mise-en-page'

/** Un segment d'un chemin, et un petit carré (les points du papier pointé) */
interface Segment { mx: number; my: number; lx: number; ly: number }
interface Carre { x: number; y: number; l: number; h: number }
/** Un chemin tracé (stroke) ou rempli (fill), avec ce qui valait alors */
interface Trace { sorte: 'stroke' | 'fill'; style: string; alpha: number; largeur: number; segments: Segment[]; carres: Carre[] }

/** t : la transformation du canevas (getTransform), celle d'une feuille du
 *  PDF ; sans elle, le contexte n'a pas de getTransform */
function contexte(t?: { a: number; e: number; d: number; f: number }) {
  let traits = 0, carres = 0, remplissages = 0
  const traces: Trace[] = []
  let segments: Segment[] = [], lesCarres: Carre[] = []
  let dernier: { x: number; y: number } | null = null
  const pile: { globalAlpha: number; strokeStyle: string; fillStyle: string; lineWidth: number }[] = []
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '', textBaseline: '',
    fillRect() { remplissages++ },
    beginPath() { segments = []; lesCarres = []; dernier = null },
    stroke() { traces.push({ sorte: 'stroke', style: ctx.strokeStyle, alpha: ctx.globalAlpha, largeur: ctx.lineWidth, segments, carres: [] }) },
    fill() { traces.push({ sorte: 'fill', style: ctx.fillStyle, alpha: ctx.globalAlpha, largeur: ctx.lineWidth, segments, carres: lesCarres }) },
    closePath() {},
    save() { pile.push({ globalAlpha: ctx.globalAlpha, strokeStyle: ctx.strokeStyle, fillStyle: ctx.fillStyle, lineWidth: ctx.lineWidth }) },
    restore() { const e = pile.pop(); if (e) Object.assign(ctx, e) },
    translate() {}, rotate() {}, fillText() {},
    moveTo(x: number, y: number) {
      if (++traits > 100_000) throw new Error('trop de lignes : la boucle ne finit pas')
      dernier = { x, y }
    },
    lineTo(x: number, y: number) { if (dernier) segments.push({ mx: dernier.x, my: dernier.y, lx: x, ly: y }); dernier = { x, y } },
    rect(x: number, y: number, l: number, h: number) {
      if (++carres > 100_000) throw new Error('trop de points : la boucle ne finit pas')
      lesCarres.push({ x, y, l, h })
    },
  }
  if (t) Object.assign(ctx, { getTransform: () => ({ a: t.a, b: 0, c: 0, d: t.d, e: t.e, f: t.f }) })
  return { ctx: ctx as unknown as CanvasRenderingContext2D, traits: () => traits, carres: () => carres, remplissages: () => remplissages, traces }
}

function camera(x: number, y: number, z: number) {
  const cam = new Camera()
  cam.x = x; cam.y = y; cam.z = z
  return cam
}

const L = 1366, H = 768
const NOUVEAUX: Fond[] = ['grands-carreaux', 'millimetre', 'pointe', 'iso']

/** Peint un fond, et rend ce qui a été tracé */
function peindre(fond: Fond, cam: Camera, l = L, h = H) {
  const c = contexte()
  const o = fond === 'repere' ? cam.versMonde(l / 2, h / 2) : undefined
  dessinerFond(c.ctx, fond, cam, l, h, o)
  return c
}

/** Les familles d'un dessin : dans chaque chemin visible (alpha > 0), les
 *  lignes d'une même direction qui traversent l'écran d'un bord à l'autre
 *  (horizontales : par leur y ; les autres : par leur x en haut), et les
 *  points d'un même remplissage (par leur x) ; avec le plus petit écart
 *  entre deux voisines */
function familles(traces: Trace[], l = L, h = H) {
  const r: { quoi: string; n: number; ecart: number }[] = []
  for (const t of traces) {
    if (t.alpha <= 0) continue
    const groupes = new Map<string, number[]>()
    for (const s of t.segments) {
      let cle: string, pos: number
      if (s.mx === 0 && s.lx === l && s.my === s.ly) { cle = 'horizontales'; pos = s.my }
      else if (s.my === 0 && s.ly === h) { cle = 'pente ' + ((s.lx - s.mx) / h).toFixed(3); pos = s.mx }
      else continue                              // une graduation, un axe court : pas une famille
      const g = groupes.get(cle)
      if (g) g.push(pos); else groupes.set(cle, [pos])
    }
    if (t.carres.length) groupes.set('points', [...new Set(t.carres.map(c => c.x))])
    for (const [quoi, pos] of groupes) {
      pos.sort((a, b) => a - b)
      let ecart = Infinity
      for (let i = 1; i < pos.length; i++) ecart = Math.min(ecart, pos[i] - pos[i - 1])
      r.push({ quoi: `${t.style} ${quoi}`, n: pos.length, ecart })
    }
  }
  return r
}

/** Ce qui couvre l'écran au pixel (sx, sy) d'une ligne verticale, d'une
 *  horizontale, ou d'un point : l'opacité composée de tout ce qui y est
 *  tracé (l'alpha du chemin × celui de sa couleur) */
function opacite(traces: Trace[], quoi: { x?: number; y?: number; point?: [number, number] }) {
  let transparence = 1
  for (const t of traces) {
    const a = t.alpha * Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(t.style)?.[1] ?? 1)
    let n = 0
    if (quoi.point) n = t.carres.filter(c => c.x + c.l / 2 === quoi.point![0] && c.y + c.h / 2 === quoi.point![1]).length
    else if (quoi.x !== undefined) n = t.segments.filter(s => s.mx === quoi.x && s.lx === quoi.x && s.my === 0).length
    else n = t.segments.filter(s => s.my === quoi.y && s.ly === quoi.y && s.mx === 0).length
    for (let i = 0; i < n; i++) transparence *= 1 - a
  }
  return 1 - transparence
}

describe('les fonds', () => {
  it('très loin de l\'origine (la vue de Tout voir sur une forme à 1e300) : chaque fond se dessine, en un nombre borné de lignes', () => {
    for (const fond of ['carreaux', 'seyes', 'repere', 'blanc'] as Fond[]) {
      for (const [x, y, z] of [[-5.21e298, -5.21e298, 0.916], [1e20, -3e19, 1], [-1e17, 0, 20]]) {
        const cam = new Camera()
        cam.x = x; cam.y = y; cam.z = z
        const { ctx, traits } = contexte()
        // Le repère passe par la vue, comme si l'origine était là-bas aussi
        const o = cam.versMonde(683, 384)
        dessinerFond(ctx, fond, cam, 1366, 768, fond === 'repere' ? o : undefined)
        expect(traits(), `${fond} ${x}`).toBeLessThan(20_000)
      }
    }
  })

  it('près de l\'origine : les mêmes lignes qu\'avant (une tous les 5 mm à 100 %)', () => {
    const cam = new Camera()
    const { ctx, traits } = contexte()
    dessinerFond(ctx, 'carreaux', cam, 1366, 768)
    // 1366 / 20 + 1 verticales, 768 / 20 + 1 horizontales
    expect(traits()).toBe(Math.floor(1366 / 20) + 1 + Math.floor(768 / 20) + 1)
  })

  it('les huit fonds, dans l\'ordre des menus, avec leurs noms', () => {
    expect(FONDS.map(f => `${f.id}:${f.nom}`)).toEqual([
      'blanc:Page blanche', 'carreaux:Petits carreaux', 'grands-carreaux:Grands carreaux (1 cm)', 'seyes:Seyès',
      'millimetre:Papier millimétré', 'pointe:Papier pointé', 'iso:Réseau isométrique', 'repere:Repère'])
  })

  it('chaque fond de FONDS, très loin de l\'origine et à z = 0,1, 1 et 20 : moins de 20 000 lignes et points, aucune famille sous 6 px', () => {
    const loin = [[-5.21e298, -5.21e298], [1e20, -3e19], [-1e17, 0], [7.3e9, -2.1e9]]
    for (const f of FONDS) {
      for (const z of [0.1, 1, 20]) {
        for (const [x, y] of loin) {
          const c = peindre(f.id, camera(x, y, z))
          expect(c.traits() + c.carres(), `${f.id} ${x} z=${z}`).toBeLessThan(20_000)
        }
        // Près de l'origine (et un peu plus loin), aux mêmes zooms : les écarts
        // se relèvent sur des positions exactes
        for (const [x, y] of [[0, 0], [311.7, -97.3], [-123456.7, 98765.4]]) {
          const c = peindre(f.id, camera(x, y, z))
          expect(c.traits() + c.carres(), `${f.id} près z=${z}`).toBeLessThan(20_000)
          for (const g of familles(c.traces)) if (g.n > 1) expect(g.ecart, `${f.id} z=${z} ${g.quoi}`).toBeGreaterThanOrEqual(6)
        }
      }
    }
  })

  it('les fonds nouveaux, du plus loin au plus près (10 % à 2000 %, par crans de 2 %) : jamais une famille sous 6 px, jamais plus de 20 000 traits', () => {
    // (Les petits carreaux et le repère aussi. Pas le Seyès : ses lignes de
    // 2 mm s'effacent de 10 à 4 px, en fondu, depuis le lot 1.)
    for (const fond of [...NOUVEAUX, 'carreaux', 'repere'] as Fond[]) {
      for (let z = 0.1; z <= 20; z *= 1.02) {
        const c = peindre(fond, camera(-37.3 * z, 51.9 * z, z))
        expect(c.traits() + c.carres(), `${fond} z=${z}`).toBeLessThan(20_000)
        for (const g of familles(c.traces)) {
          if (g.n < 2) continue
          expect(g.ecart, `${fond} z=${z.toFixed(3)} ${g.quoi}`).toBeGreaterThanOrEqual(g.quoi.endsWith('points') ? 12 : fond === 'iso' ? 9 : 6)
        }
      }
    }
  })

  it('les grands carreaux : une ligne par centimètre à 100 %, sans renfort', () => {
    const c = peindre('grands-carreaux', camera(0, 0, 1))
    expect(c.traits()).toBe(Math.floor(L / 40) + 1 + Math.floor(H / 40) + 1)
    expect(c.traces.filter(t => t.sorte === 'stroke').length).toBe(1)
    // À 30 % (1 cm = 12 px) : les centimètres en fondu, les 5 cm pleins
    const d = peindre('grands-carreaux', camera(0, 0, 0.3))
    expect(d.traces.map(t => t.alpha.toFixed(2))).toEqual(['0.45', '1.00'])
  })

  it('le millimétré à 140 % et à 160 % : les lignes de 5 mm et de 1 cm gardent leur couleur ; une ligne commune n\'est tracée qu\'une fois, dans le ton de la plus grosse', () => {
    const tons = (z: number) => {
      const c = peindre('millimetre', camera(0, 0, z))
      const ligne = (wx: number) => {
        const sx = Math.round(wx * z) + 0.5
        const t = c.traces.filter(t => t.segments.some(s => s.mx === sx && s.lx === sx && s.my === 0))
        return t.map(t => `${t.style}×${t.alpha.toFixed(2)}`)
      }
      return { mm1: ligne(4), mm5: ligne(20), cm1: ligne(40), cm5: ligne(200), cm2: ligne(80) }
    }
    const a = tons(1.4), b = tons(1.6)
    expect(a.mm1).toEqual([])                                  // 1 mm = 5,6 px : pas encore
    expect(b.mm1).toEqual(['rgba(222, 120, 40, 0.20)×0.05'])          // 6,4 px : en fondu
    for (const t of [a, b]) {
      expect(t.mm5).toEqual(['rgba(222, 120, 40, 0.38)×1.00'])
      expect(t.cm1).toEqual(['rgba(205, 100, 30, 0.60)×1.00'])
      expect(t.cm2).toEqual(['rgba(205, 100, 30, 0.60)×1.00'])
      expect(t.cm5).toEqual(['rgba(205, 100, 30, 0.60)×1.00'])
    }
  })

  it('le millimétré à 100 % : les 5 mm et les centimètres ; les millimètres paraissent vers 150 %', () => {
    const c = peindre('millimetre', camera(0, 0, 1))
    const styles = [...new Set(c.traces.map(t => t.style))]
    expect(styles).toEqual(['rgba(222, 120, 40, 0.38)', 'rgba(205, 100, 30, 0.60)'])
    // Et au plus près (2000 %), toujours trois familles, le centimètre le plus marqué
    const d = peindre('millimetre', camera(0, 0, 20))
    expect([...new Set(d.traces.map(t => t.style))]).toEqual(['rgba(222, 120, 40, 0.20)', 'rgba(222, 120, 40, 0.38)', 'rgba(205, 100, 30, 0.60)'])
    // Au plus loin (10 %) : des lignes de 5 cm, 10 cm, 50 cm, toutes au ton fort
    const e = peindre('millimetre', camera(0, 0, 0.1))
    expect([...new Set(e.traces.map(t => t.style))]).toEqual(['rgba(205, 100, 30, 0.60)'])
  })

  it('le pointé à 100 % : un point par centimètre visible, un seul chemin, un seul remplissage', () => {
    const c = peindre('pointe', camera(0, 0, 1))
    expect(c.traits()).toBe(0)
    const remplis = c.traces.filter(t => t.sorte === 'fill')
    expect(remplis.length).toBe(1)
    expect(remplis[0].style).toBe('rgba(60, 80, 120, 0.55)')
    // x de 0 à 1360 (35 colonnes), y de 0 à 760 (20 rangées)
    expect(c.carres()).toBe(35 * 20)
    expect(remplis[0].carres.every(q => q.l === 2 && q.h === 2 && (q.x + 1) % 40 === 0 && (q.y + 1) % 40 === 0)).toBe(true)
    // Plus serrés que 12 px (30 % : 1 cm = 12 px) : un point tous les 5 cm
    const d = peindre('pointe', camera(0, 0, 0.29))
    expect(new Set(d.traces.flatMap(t => t.carres.map(q => q.x + 1)))).toEqual(new Set(Array.from({ length: Math.floor(L / 58) + 1 }, (_, i) => Math.round(i * 58))))
  })

  it('le pointé sur un très grand écran : jamais beaucoup plus de 12 000 points', () => {
    for (let z = 0.1; z <= 20; z *= 1.05) {
      const c = peindre('pointe', camera(0, 0, z), 3840, 2160)
      expect(c.carres(), `z=${z}`).toBeLessThan(13_500)
    }
  })

  it('le réseau isométrique à 100 % : les horizontales tous les 1 cm × √3/2, et deux familles à ±60°, d\'un bord à l\'autre', () => {
    const c = peindre('iso', camera(0, 0, 1))
    const g = familles(c.traces)
    const pente = (1 / Math.sqrt(3)).toFixed(3)
    expect(g.map(x => x.quoi.replace(/^rgba\([^)]*\) /, '')).sort()).toEqual(['horizontales', `pente -${pente}`, `pente ${pente}`])
    const horizontales = c.traces[0].segments.filter(s => s.my === s.ly).map(s => s.my)
    expect(horizontales.slice(0, 3)).toEqual([0.5, Math.round(40 * Math.sqrt(3) / 2) + 0.5, Math.round(80 * Math.sqrt(3) / 2) + 0.5])
    // L'écart des obliques, en haut de l'écran : le côté, 40 px
    for (const x of g) if (x.quoi.includes('pente')) expect(x.ecart).toBeCloseTo(40, 6)
  })

  it('rien ne saute : d\'un cran de zoom au suivant (1 %), une ligne ou un point garde presque le même ton (millimétré, pointé, isométrique)', () => {
    const cas: { fond: Fond; ou: { x?: number; y?: number; point?: [number, number] }[] }[] = [
      // Les lignes verticales du monde x = 4 (1 mm), 20 (5 mm), 40 (1 cm), 200 (5 cm), 400 (10 cm)
      { fond: 'millimetre', ou: [4, 20, 40, 200, 400, 2000].map(x => ({ x })) },
      { fond: 'pointe', ou: [[40, 0], [200, 0], [400, 400], [2000, 0]].map(p => ({ point: p as [number, number] })) },
      { fond: 'iso', ou: [1, 5, 10, 50].map(j => ({ y: j * 40 * Math.sqrt(3) / 2 })) },
    ]
    for (const { fond, ou } of cas) {
      let avant: number[] | null = null, zAvant = 0
      for (let z = 0.1; z <= 20; z *= 1.01) {
        const c = peindre(fond, camera(0, 0, z))
        const ici = ou.map(o => opacite(c.traces, o.point ? { point: [Math.round(o.point[0] * z), Math.round(o.point[1] * z)] }
          : o.x !== undefined ? { x: Math.round(o.x * z) + 0.5 } : { y: Math.round(o.y! * z) + 0.5 }))
        if (avant) ici.forEach((v, i) => {
          // (une ligne qui sort de l'écran, ou y entre, n'est pas un saut de
          // ton ; ni, au loin, une ligne à moins de 3 px de celle de
          // l'origine : leurs pixels se confondent)
          const dedans = (o: typeof ou[number], z: number) => {
            const [x, y] = o.point ?? [o.x ?? 0, o.y ?? 0]
            return x * z < L - 2 && y * z < H - 2 && Math.max(x, y) * z >= 3
          }
          if (dedans(ou[i], z) && dedans(ou[i], zAvant)) expect(Math.abs(v - avant![i]), `${fond} z=${z.toFixed(3)} ${JSON.stringify(ou[i])}`).toBeLessThan(0.08)
        })
        avant = ici; zAvant = z
      }
    }
  })

  it('un fond inconnu (venu d\'une version plus récente) : le papier blanc seul, sans erreur', () => {
    const c = contexte()
    dessinerFond(c.ctx, 'papier-du-futur' as Fond, camera(0, 0, 1), L, H)
    expect(c.remplissages()).toBe(1)
    expect(c.traits() + c.carres()).toBe(0)
    expect(c.traces).toEqual([])
    // Et la page blanche, de même
    const b = contexte()
    dessinerFond(b.ctx, 'blanc', camera(0, 0, 1), L, H)
    expect(b.remplissages()).toBe(1)
    expect(b.traces).toEqual([])
  })
})

describe('la feuille d\'un PDF (impression)', () => {
  // Une feuille A4 à 200 ppp : DPR_PDF pixels de l'image par px CSS ; la zone
  // utile commence à 12 mm du bord (45,35 px CSS : un coin qui ne tombe pas
  // sur un pixel entier de l'image, comme dans export-pdf.ts peindreFeuille)
  const COIN = 12 * PX_PAR_MM
  const T = { a: DPR_PDF, d: DPR_PDF, e: DPR_PDF * COIN, f: DPR_PDF * COIN }
  const LU = 703, HU = 1017                        // la zone utile en portrait, px CSS
  /** Le fond sur la feuille, la caméra à l'échelle réelle (k = 1) ou réduite */
  const feuille = (fond: Fond, k = 1, x = -3.3, y = -7.1) => {
    const c = contexte(T)
    dessinerFond(c.ctx, fond, camera(x, y, Z_REEL * k), LU, HU, { x: 0, y: 0 }, { impression: DPR_PDF })
    return c
  }
  /** Les lignes verticales tracées (toutes familles), en pixels de l'image */
  const verticales = (c: ReturnType<typeof contexte>) => [...new Set(c.traces.filter(t => t.alpha > 0).flatMap(t =>
    t.segments.filter(s => s.mx === s.lx && s.my === 0 && s.ly === HU).map(s => Math.round((T.a * s.mx + T.e) * 1000) / 1000)))].sort((a, b) => a - b)
  const PX_PAR_MM_IMAGE = DPR_PDF * PX_PAR_MM          // 7,87

  it('le papier millimétré à l\'échelle réelle : une ligne par millimètre sur toute la feuille, 10 par centimètre', () => {
    const c = feuille('millimetre')
    const v = verticales(c)
    // 186 mm de large : 186 ou 187 lignes
    expect(v.length).toBeGreaterThanOrEqual(186)
    expect(v.length).toBeLessThanOrEqual(187)
    for (let i = 1; i < v.length; i++) {
      // un millimètre (7,87 pixels de l'image), à un pixel près : jamais
      // 4 mm d'un coup (3,8 px CSS sous le seuil d'écran de 6 px), jamais deux
      // lignes au même pixel
      expect(v[i] - v[i - 1], `entre ${v[i - 1]} et ${v[i]}`).toBeGreaterThanOrEqual(PX_PAR_MM_IMAGE - 1)
      expect(v[i] - v[i - 1]).toBeLessThanOrEqual(PX_PAR_MM_IMAGE + 1)
    }
    // Les trois familles, toutes à plein ton (pas de fondu sur le papier) ;
    // les millimètres en un trait d'un pixel de l'image, les autres de deux
    const parTon = new Map(c.traces.map(t => [t.style, t]))
    expect([...parTon.keys()]).toEqual(['rgba(222, 120, 40, 0.30)', 'rgba(222, 120, 40, 0.38)', 'rgba(205, 100, 30, 0.60)'])
    expect(c.traces.every(t => t.alpha === 1)).toBe(true)
    expect(parTon.get('rgba(222, 120, 40, 0.30)')!.largeur * DPR_PDF).toBeCloseTo(1, 9)
    expect(parTon.get('rgba(222, 120, 40, 0.38)')!.largeur * DPR_PDF).toBeCloseTo(2, 9)
    expect(parTon.get('rgba(205, 100, 30, 0.60)')!.largeur * DPR_PDF).toBeCloseTo(2, 9)
    // Le centimètre : une ligne sur dix, la plus marquée ; le demi-centimètre,
    // une sur dix aussi, entre deux
    const fort = c.traces.find(t => t.style === 'rgba(205, 100, 30, 0.60)')!
    const cm = fort.segments.filter(s => s.mx === s.lx).map(s => T.a * s.mx + T.e)
    for (let i = 1; i < cm.length; i++) expect(Math.abs(cm[i] - cm[i - 1] - 10 * PX_PAR_MM_IMAGE)).toBeLessThanOrEqual(1)
  })

  it('le papier millimétré réduit pour tenir sur la feuille : les millimètres tant qu\'ils font 0,8 mm ; plus petits, les 5 mm et les centimètres seuls', () => {
    const tons = (k: number) => [...new Set(feuille('millimetre', k).traces.map(t => t.style))]
    expect(tons(0.85)).toContain('rgba(222, 120, 40, 0.30)')
    expect(tons(0.75)).toEqual(['rgba(222, 120, 40, 0.38)', 'rgba(205, 100, 30, 0.60)'])
    // Et jamais deux lignes à moins de 6 pixels de l'image
    for (const k of [1, 0.85, 0.8, 0.75, 0.5, 0.3, 0.16, 0.1]) {
      const v = verticales(feuille('millimetre', k))
      for (let i = 1; i < v.length; i++) expect(v[i] - v[i - 1], `k = ${k}`).toBeGreaterThanOrEqual(5.5)
    }
  })

  it('chaque fond de lignes : chaque ligne à sa place exacte sur la feuille, à un demi-pixel de l\'image près, nette (sur un pixel entier ou au milieu)', () => {
    const exacte = (pas: number, x0: number) => (s: number) => {
      // s : la ligne en pixels de l'image ; sa place exacte : (k pas z + cam.x + coin) × dpr
      const z = Z_REEL, k = Math.round(((s / T.a - COIN) - x0) / (pas * z))
      return Math.abs(s - T.a * (k * pas * z + x0 + COIN))
    }
    for (const [fond, pas] of [['carreaux', CM / 2], ['grands-carreaux', CM], ['millimetre', CM / 10], ['repere', CM / 2]] as [Fond, number][]) {
      const c = feuille(fond)
      // (les lignes du motif ; pas les axes du repère, à l'encre, posés sur l'origine)
      for (const t of c.traces.filter(t => t.style.startsWith('rgba('))) {
        const n = Math.round(t.largeur * DPR_PDF)
        expect(t.largeur * DPR_PDF, `${fond} : une épaisseur de pixels entiers`).toBeCloseTo(n, 9)
        for (const sg of t.segments) {
          if (sg.mx !== sg.lx || sg.my !== 0 || sg.ly !== HU) continue
          const s = T.a * sg.mx + T.e
          expect(exacte(pas, -3.3)(s), `${fond} ${s}`).toBeLessThanOrEqual(0.5 + 1e-9)
          // nette : une ligne d'un pixel au milieu d'un pixel, de deux sur un bord
          expect(Math.abs((s - (n % 2 ? 0.5 : 0)) - Math.round(s - (n % 2 ? 0.5 : 0))), `${fond} ${s}`).toBeLessThan(1e-6)
        }
      }
    }
    // Petits carreaux : un écart de 5 mm fait 5 mm sur la feuille, à un pixel
    // de l'image près (0,13 mm), et non 4,7 mm (aux pixels CSS)
    const v = verticales(feuille('carreaux'))
    for (let i = 1; i < v.length; i++) expect(Math.abs(v[i] - v[i - 1] - 5 * PX_PAR_MM_IMAGE)).toBeLessThanOrEqual(1)
  })

  it('le papier pointé et le réseau isométrique sur la feuille : des points et des lignes de pixels entiers', () => {
    const p = feuille('pointe')
    const carres = p.traces.flatMap(t => t.carres)
    expect(carres.length).toBeGreaterThan(100)
    for (const q of carres) {
      expect(q.l * DPR_PDF).toBeCloseTo(4, 9)
      const x = T.a * q.x + T.e, y = T.d * q.y + T.f
      expect(Math.abs(x - Math.round(x))).toBeLessThan(1e-6)
      expect(Math.abs(y - Math.round(y))).toBeLessThan(1e-6)
    }
    const i = feuille('iso')
    expect(i.traces.length).toBeGreaterThan(0)
    for (const t of i.traces) expect(t.largeur * DPR_PDF).toBeCloseTo(2, 9)
  })

  it('l\'écran ne change pas : sans impression, à la même échelle, ni millimètres ni lignes hors des pixels CSS', () => {
    const c = contexte(T)
    dessinerFond(c.ctx, 'millimetre', camera(-3.3, -7.1, Z_REEL), LU, HU)
    expect([...new Set(c.traces.map(t => t.style))]).toEqual(['rgba(222, 120, 40, 0.38)', 'rgba(205, 100, 30, 0.60)'])
    for (const t of c.traces) for (const s of t.segments) if (s.mx === s.lx) expect(((s.mx % 1) + 1) % 1).toBe(0.5)
    // Et le même dessin, au tracé près, qu'un contexte sans getTransform
    const d = contexte()
    dessinerFond(d.ctx, 'millimetre', camera(-3.3, -7.1, Z_REEL), LU, HU)
    expect(d.traces).toEqual(c.traces)
  })
})
