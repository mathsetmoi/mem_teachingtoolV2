// Un vrai PDF écrit par src/sorties/pdf.ts, pour les outils de poppler
// (pdfinfo, pdfimages, pdftoppm, lancés par P7-corbeille-image.mjs) : une
// feuille indexée faite d'un motif (une page de tableau : papier, carreaux,
// encres et bords lissés), une feuille JPEG, toutes deux de 1654 × 2339
// pixels (A4 à 200 ppp). (Rangé dans le dépôt : la feuille JPEG, une image,
// n'y est pas versionnée ; on la fabrique ici, une page blanche écrite par
// src/sorties/pdf.ts puis rendue en JPEG par pdftoppm, dans
// essais/navigateur/sorties, ignoré par git.)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { describe, expect, it } from 'vitest'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { A4, ecrirePdf, imageIndexee, palettiser } from '../../../../../src/sorties/pdf'

const S = `${RACINE_ESSAIS}/lot3`

/** Une feuille JPEG blanche de 1654 × 2339 (A4 à 200 ppp), fabriquée une fois */
function feuilleJpeg() {
  const dossier = `${RACINE_ESSAIS}/sorties/lot3-P7`, jpg = `${dossier}/feuille-blanc.jpg`
  if (existsSync(jpg)) return jpg
  mkdirSync(dossier, { recursive: true })
  const l = 1654, h = 2339, d = new Uint8ClampedArray(l * h * 4).fill(255)
  const p = palettiser(d, l, h)!
  writeFileSync(`${dossier}/feuille-blanc.pdf`, ecrirePdf([{ l: A4.l, h: A4.h, image: imageIndexee(p, l, h) }], { titre: 'Feuille blanche', date: 0 }))
  execFileSync('pdftoppm', ['-jpeg', '-jpegopt', 'quality=90', '-scale-to-x', String(l), '-scale-to-y', String(h), '-singlefile', `${dossier}/feuille-blanc.pdf`, `${dossier}/feuille-blanc`])
  return jpg
}

describe('essai.pdf', () => {
  it('deux feuilles A4 (indexée, JPEG) écrites dans lot3/P7/essai.pdf', () => {
    const l = 1654, h = 2339
    const d = new Uint8ClampedArray(l * h * 4)
    for (let y = 0; y < h; y++) for (let x = 0; x < l; x++) {
      const k = (y * l + x) * 4
      // Le papier, un quadrillage de 5 mm (39 px à 200 ppp), des « lignes d'écriture » et un dégradé de bord
      let c = [255, 255, 255]
      if (x % 39 === 0 || y % 39 === 0) c = [200, 214, 236]
      const ligne = Math.floor(y / 117)
      if (ligne % 3 === 1 && x > 150 && x < 1500 && Math.abs((y % 117) - 58 - 20 * Math.sin(x / 40)) < 4) c = ligne % 2 ? [27, 34, 48] : [214, 69, 69]
      if (x > 1300 && y > 2000) { const g = 255 - Math.floor((x - 1300) / 3); c = [g, g, 255] }
      d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255
    }
    const p = palettiser(d, l, h)
    expect(p).not.toBeNull()
    const jpeg = new Uint8Array(readFileSync(feuilleJpeg()))
    const pdf = ecrirePdf([
      { l: A4.l, h: A4.h, image: imageIndexee(p!, l, h) },
      { l: A4.l, h: A4.h, image: { genre: 'jpeg', largeur: l, hauteur: h, donnees: jpeg } },
    ], { titre: 'Essai — feuille indexée et feuille JPEG (été)', date: new Date(2026, 9, 9, 9, 0, 0).getTime() })
    writeFileSync(`${S}/P7/essai.pdf`, pdf)
    expect(pdf.length).toBeGreaterThan(jpeg.length)
  })
})
