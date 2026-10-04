// =============================================================
// LES FONDS
// Dessinés en coordonnées écran, sur la seule zone visible : le
// tableau est infini, on ne trace que ce qu'on voit.
// =============================================================
import type { Camera } from './camera'
import type { Fond } from './types'
import { CM } from './types'

const PAPIER = '#ffffff'
const BLEU_LIGNE = 'rgba(80, 130, 200, 0.28)'
const BLEU_FORT = 'rgba(70, 110, 190, 0.55)'
const VIOLET_SEYES = 'rgba(150, 110, 200, 0.45)'
const ROUGE_MARGE = 'rgba(214, 69, 69, 0.75)'

/** Lignes régulières de pas `pas` (monde) sur un axe, si elles restent lisibles */
function lignes(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number,
  pas: number, couleur: string, epaisseur: number, verticales: boolean, horizontales: boolean) {
  const ecart = pas * cam.z
  if (ecart < 5) return                     // trop serré : on n'encombre pas
  const v = cam.visible(l, h)
  ctx.strokeStyle = couleur
  ctx.lineWidth = epaisseur
  ctx.beginPath()
  if (verticales) {
    for (let x = Math.floor(v.x / pas) * pas; x <= v.x + v.l; x += pas) {
      const sx = Math.round(x * cam.z + cam.x) + 0.5
      ctx.moveTo(sx, 0); ctx.lineTo(sx, h)
    }
  }
  if (horizontales) {
    for (let y = Math.floor(v.y / pas) * pas; y <= v.y + v.h; y += pas) {
      const sy = Math.round(y * cam.z + cam.y) + 0.5
      ctx.moveTo(0, sy); ctx.lineTo(l, sy)
    }
  }
  ctx.stroke()
}

export function dessinerFond(ctx: CanvasRenderingContext2D, fond: Fond, cam: Camera, l: number, h: number,
  origine = { x: 0, y: 0 }) {
  ctx.fillStyle = PAPIER
  ctx.fillRect(0, 0, l, h)

  if (fond === 'carreaux') {
    lignes(ctx, cam, l, h, CM / 2, BLEU_LIGNE, 1, true, true)          // 5 mm
  }

  if (fond === 'seyes') {
    lignes(ctx, cam, l, h, CM / 5, BLEU_LIGNE, 1, false, true)         // 2 mm
    lignes(ctx, cam, l, h, CM * 0.8, VIOLET_SEYES, 1, true, true)      // 8 mm
    const marge = cam.x                                                 // marge en x = 0
    if (marge > -2 && marge < l + 2) {
      ctx.strokeStyle = ROUGE_MARGE; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(marge, 0); ctx.lineTo(marge, h); ctx.stroke()
    }
  }

  if (fond === 'repere') {
    lignes(ctx, cam, l, h, CM / 2, BLEU_LIGNE, 1, true, true)
    lignes(ctx, cam, l, h, CM, BLEU_FORT, 1, true, true)
    dessinerAxes(ctx, cam, l, h, origine)
  }
}

/** Axes passant par l'origine choisie, 1 unité = 1 cm, gradués. */
function dessinerAxes(ctx: CanvasRenderingContext2D, cam: Camera, l: number, h: number, origine: { x: number; y: number }) {
  const o = cam.versEcran(origine.x, origine.y)
  const encre = '#1b2230'
  ctx.strokeStyle = encre; ctx.fillStyle = encre; ctx.lineWidth = 1.6
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
  ctx.lineWidth = 1.4

  if (o.y > -10 && o.y < h + 10) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'
    const debut = Math.ceil((v.x - origine.x) / CM / saut) * saut
    for (let n = debut; origine.x + n * CM <= v.x + v.l; n += saut) {
      if (Math.abs(n) < 1e-9) continue
      const sx = (origine.x + n * CM) * cam.z + cam.x
      ctx.beginPath(); ctx.moveTo(sx, o.y - 4); ctx.lineTo(sx, o.y + 4); ctx.stroke()
      ctx.fillText(formater(n), sx, o.y + 7)
    }
  }
  if (o.x > -10 && o.x < l + 10) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'
    const debut = Math.ceil((v.y - origine.y) / CM / saut) * saut
    for (let n = debut; origine.y + n * CM <= v.y + v.h; n += saut) {
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
