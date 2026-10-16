// Les outils de l'essai dans le vrai Chromium (sous Xvfb) : un écran X à
// soi, les touches et les clics envoyés au serveur X (touches.py, XTest),
// la capture de l'écran entier, et les boutons de la demande d'accord de
// Chrome (sa bulle, en haut de la page : ce n'est pas la page, Playwright ne
// la voit pas), trouvés à leur couleur dans la capture.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import { execFileSync, spawn } from 'node:child_process'
import fs from 'node:fs'

const ICI = `${RACINE_ESSAIS}/lot4/cf`
export const LARGEUR = 1280, HAUTEUR = 900

/** Un écran X : celui de DISPLAY s'il y en a un, sinon un Xvfb lancé ici */
export async function ecranX(numero = 98) {
  if (process.env.CF_DISPLAY) return { display: process.env.CF_DISPLAY, arreter: () => {} }
  const display = ':' + numero
  try { fs.rmSync(`/tmp/.X${numero}-lock`, { force: true }) } catch { /* rien */ }
  const x = spawn('Xvfb', [display, '-screen', '0', `${LARGEUR}x${HAUTEUR}x24`, '-nolisten', 'tcp'], { stdio: 'ignore' })
  await new Promise(r => setTimeout(r, 1500))
  return { display, arreter: () => { try { x.kill() } catch { /* déjà fini */ } } }
}

export const touches = (display, ...a) => execFileSync('python3', [ICI + '/touches.py', ...a], { env: { ...process.env, DISPLAY: display } })
export const capture = (display, chemin) => { try { execFileSync('import', ['-display', display, '-window', 'root', chemin]) } catch (e) { console.log('capture', e.message) } }

/** Les boutons de la bulle de Chrome : des bandes de couleur (le bleu clair
 *  des boutons ordinaires, le bleu foncé du bouton principal), du haut vers
 *  le bas, avec leur centre */
export function boutonsDeChrome(display, chemin) {
  capture(display, chemin)
  const brut = execFileSync('convert', [chemin, '-depth', '8', 'rgb:-'], { maxBuffer: 64 * 1024 * 1024 })
  const px = (x, y) => { const i = (y * LARGEUR + x) * 3; return [brut[i], brut[i + 1], brut[i + 2]] }
  const pres = (c, r, t) => Math.abs(c[0] - r[0]) <= t && Math.abs(c[1] - r[1]) <= t && Math.abs(c[2] - r[2]) <= t
  const genres = [{ genre: 'clair', rgb: [211, 227, 253], t: 8 }, { genre: 'fonce', rgb: [11, 87, 208], t: 14 }]
  const r = []
  for (const g of genres) {
    let bande = null
    for (let y = 90; y < 620; y++) {
      // Les suites d'au moins 4 points de cette couleur (le contour du
      // bouton qui a le focus, 2 points, n'en est pas une) : leur étendue
      let n = 0, x0 = LARGEUR, x1 = -1, debut = -1
      for (let x = 0; x <= LARGEUR; x++) {
        const oui = x < LARGEUR && pres(px(x, y), g.rgb, g.t)
        if (oui && debut < 0) debut = x
        if (!oui && debut >= 0) { if (x - debut >= 4) { n += x - debut; x0 = Math.min(x0, debut); x1 = Math.max(x1, x - 1) } debut = -1 }
      }
      const ligne = n > 40 && x1 - x0 < 460
      if (ligne) { if (!bande) bande = { y0: y, y1: y, lignes: [] }; bande.y1 = y; bande.lignes.push([x0, x1]) }
      else if (bande && y - bande.y1 > 3) {
        // L'étendue médiane des lignes de la bande (ses bords, qui touchent un
        // contour voisin, n'y comptent pas)
        if (bande.y1 - bande.y0 >= 20) {
          const med = i => bande.lignes.map(l => l[i]).sort((u, v) => u - v)[bande.lignes.length >> 1]
          r.push({ genre: g.genre, x: Math.round((med(0) + med(1)) / 2), y: Math.round((bande.y0 + bande.y1) / 2), l: med(1) - med(0), h: bande.y1 - bande.y0 })
        }
        bande = null
      }
    }
  }
  return r.sort((a, b) => a.y - b.y || a.x - b.x)
}

/** Attend la bulle de Chrome (au plus 8 s) et rend ses boutons. Chrome
 *  ignore un clic sur ses boutons qui vient trop tôt après leur arrivée (sa
 *  protection contre les clics détournés) : on attend encore 1,5 s. */
export async function attendreLaBulle(display, chemin, voulu = 1) {
  for (let i = 0; i < 16; i++) {
    const b = boutonsDeChrome(display, chemin)
    if (b.length >= voulu) { await new Promise(r => setTimeout(r, 1500)); return boutonsDeChrome(display, chemin) }
    await new Promise(r => setTimeout(r, 500))
  }
  return boutonsDeChrome(display, chemin)
}
