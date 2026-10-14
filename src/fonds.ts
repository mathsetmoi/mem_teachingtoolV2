// =============================================================
// LES FONDS
// Dessinés en coordonnées écran, sur la seule zone visible : le
// tableau est infini, on ne trace que ce qu'on voit.
// Tous sont calés sur l'origine du monde (0, 0) — le repère, lui, sur la
// sienne — et tous suivent le zoom comme une carte : aucun niveau n'est
// tracé plus serré que 6 à 7 px d'écran (sinon, au vidéoprojecteur, un
// écran gris), le plus fin paraît et s'efface en fondu, et le suivant, déjà
// là, prend le relais : rien ne saute. Le lot 5 en ajoute quatre : les
// grands carreaux (1 cm), le papier millimétré, le papier pointé et le
// réseau isométrique. Un fond inconnu (venu d'une version plus récente)
// n'est que le papier blanc, sans erreur : c'est aussi ce que la version
// d'avant (fdf3f72) et le lecteur élève d'avant font de ces quatre-là.
// Les vignettes (trieuse, « Envoyer vers… », le menu des fonds), l'image
// copiée, le PDF, la revue et le lecteur passent tous par dessinerFond.
// Le contraste renforcé (lot 5, un réglage de l'appareil, pour le
// vidéoprojecteur) n'est demandé que par l'écran du professeur, le tableau
// et la revue en classe (voir Rendu.contraste) : les lignes y sont plus
// marquées (TONS_CONTRASTE) ; jamais dans les vignettes, l'image copiée, le
// PDF ni le lecteur des élèves.
// La feuille d'un PDF (o.impression, que seul l'export en PDF demande) n'est
// pas un écran : ses lignes tombent sur les pixels de son image (200 ppp),
// pas sur les pixels CSS (un sur deux), et leurs écarts y sont justes à un
// pixel de l'image près (0,13 mm) ; le papier millimétré y trace ses
// millimètres, que l'écran ne montre qu'à partir de 150 % environ (voir
// papierMillimetre).
// =============================================================
import type { Camera } from './camera'
import type { Fond } from './types'
import { CM } from './types'

// Les couleurs, chacune nommée
const PAPIER = '#ffffff'
const BLEU_LIGNE = 'rgba(80, 130, 200, 0.28)'
const BLEU_FORT = 'rgba(70, 110, 190, 0.55)'
const VIOLET_SEYES = 'rgba(150, 110, 200, 0.45)'
const ROUGE_MARGE = 'rgba(214, 69, 69, 0.75)'
/** Le papier millimétré, orangé comme celui du commerce : chaque famille a
 *  son ton, FIXE, quel que soit le zoom. Des tons donnés par le rang (le
 *  plus fin tracé, le suivant…) feraient passer les 5 mm de l'un à l'autre
 *  vers 150 %, quand les millimètres paraissent ; ici rien ne saute, et le
 *  centimètre reste la ligne la plus marquée. */
const MM_FIN = 'rgba(222, 120, 40, 0.20)'        // 1 mm
const MM_MOYEN = 'rgba(222, 120, 40, 0.38)'      // 5 mm
const MM_FORT = 'rgba(205, 100, 30, 0.60)'       // 1 cm, et au-delà (5 cm, 10 cm…)
/** Les millimètres sur la feuille d'un PDF : un trait d'un pixel de l'image
 *  (0,13 mm à 200 ppp), deux fois plus fin qu'une ligne d'un pixel CSS,
 *  comme sur le papier du commerce ; d'un ton plus marqué que MM_FIN (un
 *  trait si fin, à 0,20, s'imprimerait à peine), mais moins que les 5 mm
 *  (0,38, en deux pixels) : chaque famille reste plus marquée que la
 *  précédente, en ton comme en épaisseur */
const MM_FIN_PAPIER = 'rgba(222, 120, 40, 0.30)'
/** Les points du papier pointé : un carré de 2 px d'écran */
const POINT = 'rgba(60, 80, 120, 0.55)'
const ENCRE_AXES = '#1b2230'

/** Ce qu'un fond trace, dans l'un ou l'autre contraste : les couleurs, la
 *  largeur des lignes (px d'écran), le côté des points, la marge du Seyès
 *  et les axes du repère */
export interface Tons {
  bleu: string; bleuFort: string; violet: string; rouge: string
  mmFin: string; mmMoyen: string; mmFort: string; point: string
  ligne: number; cotePoint: number; marge: number; axes: number; graduations: number
}

/** Une couleur rgba plus marquée : son opacité × 1,8, au plus 0,9 (une
 *  couleur pleine reste telle) */
export function renforcer(couleur: string): string {
  const m = couleur.match(/^rgba\(([^,]+),([^,]+),([^,]+),\s*([\d.]+)\)$/)
  if (!m) return couleur
  const a = Math.min(0.9, Number(m[4]) * 1.8)
  return `rgba(${m[1].trim()}, ${m[2].trim()}, ${m[3].trim()}, ${Math.round(a * 1000) / 1000})`
}

/** Le fond de toujours */
export const TONS_NORMAUX: Tons = {
  bleu: BLEU_LIGNE, bleuFort: BLEU_FORT, violet: VIOLET_SEYES, rouge: ROUGE_MARGE,
  mmFin: MM_FIN, mmMoyen: MM_MOYEN, mmFort: MM_FORT, point: POINT,
  ligne: 1, cotePoint: 2, marge: 1.5, axes: 1.6, graduations: 1.4,
}
/** Le contraste renforcé (lot 5) : chaque couleur plus opaque (voir
 *  renforcer), des lignes de 2 px calées sur les pixels entiers, des points
 *  de 3 px, une marge du Seyès et des axes du repère plus épais. Les mêmes
 *  niveaux et les mêmes fondus que d'ordinaire : rien ne saute de plus au
 *  zoom, et jamais un écran gris (l'essai K9 du lot 5 le mesure). */
export const TONS_CONTRASTE: Tons = {
  bleu: renforcer(BLEU_LIGNE), bleuFort: renforcer(BLEU_FORT), violet: renforcer(VIOLET_SEYES), rouge: renforcer(ROUGE_MARGE),
  mmFin: renforcer(MM_FIN), mmMoyen: renforcer(MM_MOYEN), mmFort: renforcer(MM_FORT), point: renforcer(POINT),
  ligne: 2, cotePoint: 3, marge: 2.5, axes: 2.6, graduations: 2,
}

/** Ce que demande celui qui peint : le contraste renforcé (lot 5), à
 *  l'écran du professeur seulement ; impression : la feuille d'un PDF,
 *  peinte comme une page à 96 ppp (1 px CSS = 1/96 de pouce), à ce nombre de
 *  pixels de son image par px CSS (voir Feuille) */
export interface OptionsFond { contraste?: boolean; impression?: number }

/** Les pixels de la feuille d'un PDF, sur l'axe des x et sur celui des y :
 *  un point à s px CSS tombe au pixel a × s + b de l'image (la transformation
 *  du canevas : son échelle, et le coin de la zone utile, dans la marge) */
interface Feuille { ax: number; bx: number; ay: number; by: number }
/** Les millimètres par px CSS sur la feuille (96 ppp) */
const MM_PAR_PX = 25.4 / 96

/** La feuille de ce canevas : sa transformation (une échelle et un
 *  décalage), sinon dpr pixels par px CSS depuis le coin */
function feuilleDe(ctx: CanvasRenderingContext2D, dpr: number): Feuille {
  const t = typeof ctx.getTransform === 'function' ? ctx.getTransform() : null
  if (t && t.a > 0 && t.d > 0 && !t.b && !t.c) return { ax: t.a, bx: t.e, ay: t.d, by: t.f }
  return { ax: dpr, bx: 0, ay: dpr, by: 0 }
}

/** Où tracer (px CSS) une ligne d'épaisseur e (px CSS) qui tombe en s. Une
 *  ligne d'un nombre impair de pixels passe au milieu d'un pixel, d'un
 *  nombre pair sur un bord : chacune couvre des pixels entiers, nette. À
 *  l'écran (a absent), au pixel CSS, comme toujours (arrondi, puis le
 *  demi-pixel). Sur la feuille (a, b : voir Feuille), au pixel de son image
 *  le plus proche de sa place exacte (à un demi-pixel près : sur le papier,
 *  ce sont des mesures) */
function caler(s: number, e: number, a?: number, b = 0): number {
  if (a === undefined) return Math.round(s) + (e % 2 === 1 ? 0.5 : 0)
  const p = s * a + b
  return ((Math.round(e * a) % 2 === 1 ? Math.floor(p) + 0.5 : Math.round(p)) - b) / a
}

/** L'épaisseur (px CSS) d'une ligne de e px CSS : sur la feuille, un nombre
 *  entier de pixels de son image (au moins un) ; à l'écran, e */
function epaisseurSur(e: number, f: Feuille | null): number {
  return f ? Math.max(1, Math.round(e * f.ax)) / f.ax : e
}

/** Au plus ce nombre de lignes (ou de graduations) par axe. Les boucles
 *  comptent leurs tours au lieu d'avancer de pas en pas : très loin de
 *  l'origine (une forme démesurée qu'on aurait voulu tout voir), x + pas
 *  vaudrait x, et la boucle ne finirait jamais ; le tableau gèlerait. */
const TOURS_MAX = 4000

/** Lignes régulières de pas `pas` (monde) sur un axe, si elles restent
 *  lisibles. saute : une ligne sur `saute` (celles des multiples de
 *  saute × pas) n'est pas tracée, parce qu'une famille plus grosse la trace
 *  dans son ton (le papier millimétré : une ligne commune à deux familles
 *  n'est tracée qu'une fois) ; 0, toutes. */
function lignes(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number,
  pas: number, couleur: string, epaisseur: number, verticales: boolean, horizontales: boolean, saute = 0,
  f: Feuille | null = null) {
  const ecart = pas * cam.z
  if (ecart < 3) return                     // trop serré : rien de lisible
  const v = cam.visible(l, h)
  epaisseur = epaisseurSur(epaisseur, f)
  ctx.strokeStyle = couleur
  ctx.lineWidth = epaisseur
  // Chaque ligne calée sur les pixels (voir caler) : de l'écran, ou de la feuille
  ctx.beginPath()
  if (verticales) {
    const n0 = Math.floor(v.x / pas), x0 = n0 * pas, n = Math.min(TOURS_MAX, Math.ceil(v.l / pas) + 1)
    for (let k = 0; k <= n; k++) {
      const x = x0 + k * pas
      if (x > v.x + v.l) break
      if (saute && multiple(n0 + k, saute)) continue
      const sx = caler(x * cam.z + cam.x, epaisseur, f?.ax, f?.bx)
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h)
    }
  }
  if (horizontales) {
    const n0 = Math.floor(v.y / pas), y0 = n0 * pas, n = Math.min(TOURS_MAX, Math.ceil(v.h / pas) + 1)
    for (let k = 0; k <= n; k++) {
      const y = y0 + k * pas
      if (y > v.y + v.h) break
      if (saute && multiple(n0 + k, saute)) continue
      const sy = caler(y * cam.z + cam.y, epaisseur, f?.ay, f?.by)
      ctx.moveTo(0, sy); ctx.lineTo(l, sy)
    }
  }
  ctx.stroke()
}

/** n est-il un multiple de m (n entier, négatif compris) ? */
function multiple(n: number, m: number) { return ((n % m) + m) % m === 0 }

/** Borné à [0, 1] */
function entre01(x: number) { return Math.max(0, Math.min(1, x)) }

/**
 * Un quadrillage qui suit le zoom, comme une carte : de la suite de pas
 * (0,5 cm, 1 cm, 5 cm…), le plus fin encore lisible est tracé en fondu
 * — il s'efface doucement quand on dézoome — et le suivant, plus fort,
 * prend le relais. La page n'est jamais blanche, et rien ne saute.
 */
function grilleAdaptative(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number,
  pas: number[], fine: string, forte: string, epaisseur: number, f: Feuille | null, verticales = true, horizontales = true) {
  const LISIBLE = 7                           // pixels au moins entre deux lignes
  let i = pas.findIndex(p => p * cam.z >= LISIBLE)
  if (i < 0) i = pas.length - 1
  const ecart = pas[i] * cam.z
  // Le niveau fin apparaît entre 7 et 18 px d'écart
  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, (ecart - LISIBLE) / 11))
  lignes(ctx, cam, l, h, pas[i], fine, epaisseur, verticales, horizontales, 0, f)
  ctx.globalAlpha = 1
  if (pas[i + 1]) lignes(ctx, cam, l, h, pas[i + 1], forte, epaisseur, verticales, horizontales, 0, f)
  else lignes(ctx, cam, l, h, pas[i], forte, epaisseur, verticales, horizontales, 0, f)
  ctx.restore()
}

// Les pas successifs, en unités monde (40 = 1 cm)
const PAS_CARREAUX = [CM / 2, CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM]
const PAS_GRANDS_CARREAUX = [CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM]
const PAS_REPERE = [CM / 2, CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM]
const PAS_SEYES = [CM * 0.8, 4 * CM, 8 * CM, 40 * CM, 80 * CM, 400 * CM]
/** Les familles du papier millimétré : 1 mm, 5 mm, 1 cm, puis 5 cm, 10 cm…
 *  (chacune contient la précédente une fois sur 5 ou sur 2) */
const PAS_MM = [CM / 10, CM / 2, CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM, 1000 * CM]
/** Le papier pointé : un point par centimètre, ou tous les 5 cm, 10 cm… */
const PAS_POINTS = [CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM, 1000 * CM]
/** Le réseau isométrique : le côté des triangles, 1 cm, ou 5 cm, 10 cm… (un
 *  sous-réseau du même réseau) */
const PAS_ISO = [CM, 5 * CM, 10 * CM, 50 * CM, 100 * CM, 500 * CM, 1000 * CM]
const RACINE3 = Math.sqrt(3)

/**
 * Peint le fond sur toute la zone l × h (px d'écran) : le papier, puis son
 * motif. o.contraste : le contraste renforcé (voir TONS_CONTRASTE), que
 * seul l'écran du professeur demande ; o.impression : la feuille d'un PDF
 * (voir OptionsFond, Feuille), que seul l'export en PDF demande. Un
 * paramètre de plus, à la fin : les appels d'avant peignent comme avant.
 */
export function dessinerFond(ctx: CanvasRenderingContext2D, fond: Fond, cam: Camera, l: number, h: number,
  origine = { x: 0, y: 0 }, o: OptionsFond = {}) {
  ctx.fillStyle = PAPIER
  ctx.fillRect(0, 0, l, h)
  const t = o.contraste ? TONS_CONTRASTE : TONS_NORMAUX, e = t.ligne
  const f = o.impression && o.impression > 0 ? feuilleDe(ctx, o.impression) : null

  switch (fond) {
    case 'carreaux':
      // 5 mm, sans renfort tant qu'on les voit ; plus loin, des carreaux plus grands
      if (CM / 2 * cam.z >= 18) lignes(ctx, cam, l, h, CM / 2, t.bleu, e, true, true, 0, f)
      else grilleAdaptative(ctx, cam, l, h, PAS_CARREAUX, t.bleu, t.bleu, e, f)
      break

    case 'grands-carreaux':
      // 1 cm, de même : sans renfort tant qu'on les voit (18 px d'écart et
      // plus) ; plus loin, des carreaux de 5 cm, 10 cm…
      if (CM * cam.z >= 18) lignes(ctx, cam, l, h, CM, t.bleu, e, true, true, 0, f)
      else grilleAdaptative(ctx, cam, l, h, PAS_GRANDS_CARREAUX, t.bleu, t.bleu, e, f)
      break

    case 'seyes': {
      // Les lignes de 2 mm s'effacent en fondu ; le quadrillage de 8 mm s'adapte
      ctx.save(); ctx.globalAlpha = Math.max(0, Math.min(1, (CM / 5 * cam.z - 4) / 6))
      lignes(ctx, cam, l, h, CM / 5, t.bleu, e, false, true, 0, f)      // 2 mm
      ctx.restore()
      grilleAdaptative(ctx, cam, l, h, PAS_SEYES, t.violet, t.violet, e, f)
      const marge = cam.x                                                 // marge en x = 0
      if (marge > -2 && marge < l + 2) {
        ctx.strokeStyle = t.rouge; ctx.lineWidth = t.marge
        ctx.beginPath(); ctx.moveTo(marge, 0); ctx.lineTo(marge, h); ctx.stroke()
      }
      break
    }

    case 'millimetre':
      papierMillimetre(ctx, cam, l, h, t, f)
      break

    case 'pointe':
      papierPointe(ctx, cam, l, h, t, f)
      break

    case 'iso':
      reseauIsometrique(ctx, cam, l, h, t, f)
      break

    case 'repere':
      grilleAdaptative(ctx, cam, l, h, PAS_REPERE, t.bleu, t.bleuFort, e, f)
      dessinerAxes(ctx, cam, l, h, origine, t)
      break

    // 'blanc' : le papier seul. Un fond inconnu (venu d'une version plus
    // récente, ou abîmé) aussi : rien de plus, et aucune erreur.
  }
}

/**
 * Le papier millimétré. On trace la famille la plus fine dont l'écart fait
 * au moins 6 px, puis les deux suivantes : à 100 % (1 mm = 4 px), les 5 mm,
 * les centimètres et les 5 cm ; les millimètres paraissent vers 150 %. Le
 * fondu de chaque famille se lit sur son propre écart, de 6 à 14 px (son
 * alpha multiplié par (écart − 6) / 8, borné à 1) : la plus fine paraît en
 * fondu, les deux suivantes sont pleines — sauf le centimètre juste après
 * que les 5 mm ont passé sous 6 px (vers 30 %) : il n'est alors qu'à 12 px,
 * et son fondu à lui, déjà le même avant et après le passage, garde le ton
 * sans saut. Une ligne commune à deux familles n'est tracée qu'une fois,
 * dans le ton de la plus grosse.
 * Sur la feuille d'un PDF (f), ces seuils d'écran (pensés pour le
 * vidéoprojecteur : jamais un écran gris) n'ont pas lieu d'être : à
 * l'échelle réelle, 1 mm n'y fait que 3,8 px CSS, mais 7,9 pixels de
 * l'image à 200 ppp, et c'est le papier millimétré qu'on veut imprimer. On y
 * trace donc la plus fine des familles qui fait au moins 0,8 mm sur la
 * feuille (et 6 pixels de son image), et les deux suivantes, toutes à plein
 * ton (rien n'y bouge : pas de fondu) : à l'échelle réelle, les millimètres,
 * les 5 mm et les centimètres ; les millimètres en un trait d'un pixel de
 * l'image (voir MM_FIN_PAPIER). Une page réduite pour tenir sur la feuille
 * (sous 80 %) n'a plus que les 5 mm et les centimètres.
 */
function papierMillimetre(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, t: Tons, f: Feuille | null) {
  const tons = [t.mmFin, t.mmMoyen, t.mmFort]
  const LISIBLE = f ? Math.max(0.8 / MM_PAR_PX, 6 / f.ax) : 6, FONDU = 8
  let i = PAS_MM.findIndex(p => p * cam.z >= LISIBLE)
  if (i < 0) i = PAS_MM.length - 1
  const fin = Math.min(i + 2, PAS_MM.length - 1)
  ctx.save()
  try {
    for (let k = i; k <= fin; k++) {
      const pas = PAS_MM[k]
      const alpha = f ? 1 : entre01((pas * cam.z - LISIBLE) / FONDU)
      if (alpha <= 0) continue
      ctx.globalAlpha = alpha
      const saute = k < fin ? Math.round(PAS_MM[k + 1] / pas) : 0
      // Sur la feuille, les millimètres d'un pixel de l'image (epaisseurSur
      // l'arrondit à un pixel entier)
      const millimetres = f && k === 0
      lignes(ctx, cam, l, h, pas, millimetres ? MM_FIN_PAPIER : tons[Math.min(k, tons.length - 1)],
        millimetres ? 1 / f.ax : t.ligne, true, true, saute, f)
    }
  } finally { ctx.restore() }
}

/** Au plus ce nombre de points environ sur le papier pointé */
const POINTS_MAX = 12_000

/**
 * Le papier pointé : un point par centimètre, un petit carré de 2 px
 * d'écran, tous dans un seul chemin et un seul remplissage. Plus serrés que
 * 12 px (ou que ce qui ferait plus de POINTS_MAX points sur un très grand
 * écran), un point tous les 5 cm, 10 cm… ; entre 12 et 18 px, les points
 * fins s'effacent en fondu et ceux des 5 cm, déjà là, restent pleins.
 */
function papierPointe(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, t: Tons, f: Feuille | null) {
  const serre = Math.max(12, Math.sqrt(l * h / POINTS_MAX))
  let i = PAS_POINTS.findIndex(p => p * cam.z >= serre)
  if (i < 0) i = PAS_POINTS.length - 1
  const alpha = entre01((PAS_POINTS[i] * cam.z - serre) / (serre / 2))
  const suivant = PAS_POINTS[i + 1]
  ctx.save()
  try {
    ctx.fillStyle = t.point
    const cote = t.cotePoint
    if (alpha < 1 && suivant) {
      if (alpha > 0) { ctx.globalAlpha = alpha; points(ctx, cam, l, h, PAS_POINTS[i], Math.round(suivant / PAS_POINTS[i]), cote, f) }
      ctx.globalAlpha = 1
      points(ctx, cam, l, h, suivant, 0, cote, f)
    } else points(ctx, cam, l, h, PAS_POINTS[i], 0, cote, f)
  } finally { ctx.restore() }
}

/** Les points de pas `pas` (monde) qu'on voit, en un chemin, un remplissage ;
 *  saute : sans ceux des multiples de saute × pas sur les deux axes (une
 *  famille plus grosse les peint) ; cote : leur côté, en px d'écran ; f : la
 *  feuille d'un PDF (chaque point y couvre des pixels entiers de son image) */
function points(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, pas: number, saute: number, cote: number,
  f: Feuille | null = null) {
  const v = cam.visible(l, h)
  const i0 = Math.floor(v.x / pas), j0 = Math.floor(v.y / pas)
  const ni = Math.min(TOURS_MAX, Math.ceil(v.l / pas) + 1), nj = Math.min(TOURS_MAX, Math.ceil(v.h / pas) + 1)
  if (!(ni * nj <= 4 * POINTS_MAX)) return             // garde-fou : jamais des millions de points
  // Un côté impair est centré sur le pixel du point ; pair, sur son coin.
  // Sur la feuille, le côté et la place se comptent en pixels de son image
  const ax = f?.ax ?? 1, bx = f?.bx ?? 0, ay = f?.ay ?? 1, by = f?.by ?? 0
  const n = f ? Math.max(1, Math.round(cote * ax)) : cote, d = Math.floor(n / 2)
  const coin = (s: number, a: number, b: number) => (Math.round(s * a + b) - d - b) / a
  const lx = n / ax, ly = n / ay
  ctx.beginPath()
  for (let a = 0; a <= ni; a++) {
    const x = (i0 + a) * pas
    if (x > v.x + v.l) break
    const sx = coin(x * cam.z + cam.x, ax, bx)
    const colonne = saute && multiple(i0 + a, saute)
    for (let b = 0; b <= nj; b++) {
      const y = (j0 + b) * pas
      if (y > v.y + v.h) break
      if (colonne && multiple(j0 + b, saute)) continue
      ctx.rect(sx, coin(y * cam.z + cam.y, ay, by), lx, ly)
    }
  }
  ctx.fill()
}

/**
 * Le réseau isométrique : des triangles équilatéraux de 1 cm de côté, que
 * tracent trois familles de droites, chacune d'un bord à l'autre de ce
 * qu'on voit : les horizontales, tous les 1 cm × √3/2, et les deux familles
 * à ±60° (x ∓ y/√3 = k × côté). Leur hauteur sous 9 px, des triangles de
 * 5 cm, 10 cm… : un sous-réseau du même réseau (ses droites en sont), rien
 * ne saute ; le réseau fin s'efface en fondu de 18 à 9 px de hauteur, et
 * ses droites communes avec le plus grand ne sont tracées qu'une fois.
 */
function reseauIsometrique(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, t: Tons, f: Feuille | null) {
  const LISIBLE = 9
  const hauteur = (c: number) => c * RACINE3 / 2 * cam.z
  let i = PAS_ISO.findIndex(c => hauteur(c) >= LISIBLE)
  if (i < 0) i = PAS_ISO.length - 1
  const alpha = entre01((hauteur(PAS_ISO[i]) - LISIBLE) / LISIBLE)
  const suivant = PAS_ISO[i + 1]
  ctx.save()
  try {
    if (alpha < 1 && suivant) {
      if (alpha > 0) { ctx.globalAlpha = alpha; triangles(ctx, cam, l, h, PAS_ISO[i], Math.round(suivant / PAS_ISO[i]), t, f) }
      ctx.globalAlpha = 1
      triangles(ctx, cam, l, h, suivant, 0, t, f)
    } else triangles(ctx, cam, l, h, PAS_ISO[i], 0, t, f)
  } finally { ctx.restore() }
}

/** Les trois familles de droites d'un réseau de côté c (monde) ; saute : sans
 *  les droites d'indice multiple de saute (celles du réseau de côté
 *  saute × c, qu'on trace à part) ; f : la feuille d'un PDF (les
 *  horizontales y tombent sur les pixels de son image) */
function triangles(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, c: number, saute: number, t: Tons,
  f: Feuille | null = null) {
  const v = cam.visible(l, h), hc = c * RACINE3 / 2
  const e = epaisseurSur(t.ligne, f)
  ctx.strokeStyle = t.bleu
  ctx.lineWidth = e
  ctx.beginPath()
  // Les horizontales, y = j × hc
  const j0 = Math.floor(v.y / hc), nj = Math.min(TOURS_MAX, Math.ceil(v.h / hc) + 1)
  for (let b = 0; b <= nj; b++) {
    const y = (j0 + b) * hc
    if (y > v.y + v.h) break
    if (saute && multiple(j0 + b, saute)) continue
    const sy = caler(y * cam.z + cam.y, e, f?.ay, f?.by)
    ctx.moveTo(0, sy); ctx.lineTo(l, sy)
  }
  // Les obliques, x = k c ± y/√3 : du haut de l'écran (y = v.y) à son bas
  for (const s of [1, -1]) {
    const dh = s * v.y / RACINE3, db = s * (v.y + v.h) / RACINE3
    const k0 = Math.floor((v.x - Math.max(dh, db)) / c)
    const n = Math.min(TOURS_MAX, Math.ceil((v.x + v.l - Math.min(dh, db)) / c) - k0)
    for (let a = 0; a <= n; a++) {
      if (saute && multiple(k0 + a, saute)) continue
      const x = (k0 + a) * c
      ctx.moveTo((x + dh) * cam.z + cam.x, 0); ctx.lineTo((x + db) * cam.z + cam.x, h)
    }
  }
  ctx.stroke()
}

/** Axes passant par l'origine choisie, 1 unité = 1 cm, gradués. */
function dessinerAxes(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, origine: { x: number; y: number }, t: Tons) {
  const o = cam.versEcran(origine.x, origine.y)
  ctx.strokeStyle = ENCRE_AXES; ctx.fillStyle = ENCRE_AXES; ctx.lineWidth = t.axes
  ctx.beginPath()
  if (o.y > -10 && o.y < h + 10) { ctx.moveTo(0, o.y); ctx.lineTo(l, o.y) }
  if (o.x > -10 && o.x < l + 10) { ctx.moveTo(o.x, 0); ctx.lineTo(o.x, h) }
  ctx.stroke()

  // Flèches au bout des axes
  const fleche = (x: number, y: number, ang: number) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang)
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-11, -5); ctx.lineTo(-11, 5); ctx.closePath(); ctx.fill()
    ctx.restore()
  }
  if (o.y > 0 && o.y < h) fleche(l - 2, o.y, 0)
  if (o.x > 0 && o.x < l) fleche(o.x, 2, -Math.PI / 2)

  // Graduations : on espace les nombres pour qu'ils ne se chevauchent pas
  const pasEcran = CM * cam.z
  const saut = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => pasEcran * s >= 28) ?? 1000
  const v = cam.visible(l, h)
  ctx.font = '600 12px "Atkinson Hyperlegible", system-ui, sans-serif'
  ctx.lineWidth = t.graduations

  if (o.y > -10 && o.y < h + 10) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const debut = Math.ceil((v.x - origine.x) / CM / saut) * saut
    for (let k = 0, n = debut; k <= TOURS_MAX && origine.x + n * CM <= v.x + v.l; k++, n = debut + k * saut) {
      if (Math.abs(n) < 1e-9) continue
      const sx = (origine.x + n * CM) * cam.z + cam.x
      ctx.beginPath(); ctx.moveTo(sx, o.y - 4); ctx.lineTo(sx, o.y + 4); ctx.stroke()
      ctx.fillText(formater(n), sx, o.y + 7)
    }
  }
  if (o.x > -10 && o.x < l + 10) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    const debut = Math.ceil((v.y - origine.y) / CM / saut) * saut
    for (let k = 0, n = debut; k <= TOURS_MAX && origine.y + n * CM <= v.y + v.h; k++, n = debut + k * saut) {
      if (Math.abs(n) < 1e-9) continue
      const sy = (origine.y + n * CM) * cam.z + cam.y
      ctx.beginPath(); ctx.moveTo(o.x - 4, sy); ctx.lineTo(o.x + 4, sy); ctx.stroke()
      ctx.fillText(formater(-n), o.x - 7, sy)          // l'axe des ordonnées monte
    }
  }
  if (o.x > 0 && o.x < l && o.y > 0 && o.y < h) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'
    ctx.fillText('0', o.x - 6, o.y + 6)
  }
}

function formater(n: number) {
  return (Math.round(n * 100) / 100).toString().replace('.', ',').replace('-', '−')
}
