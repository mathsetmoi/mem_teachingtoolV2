// Une page haute (deux feuilles A4) aux grands carreaux et au réseau
// isométrique : sur chaque feuille, le fond reste calé sur l'encre (des traits
// posés sur des lignes du monde tombent sur les lignes imprimées).
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT } from './lib/commun.mjs'

const D = OUT + '/pdf-suite'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
const P = await ouvrir(ctx)
async function exporterPdf(p, nom) {
  await p.mouse.move(683, 384)
  await p.keyboard.press('Control+p')
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  await p.locator('dialog[open] input[name="pdf-fond"]').check()
  const dl = p.waitForEvent('download', { timeout: 240000 }).catch(() => null)
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  const f = `${D}/${nom}.pdf`; await d.saveAs(f); return f
}
const ana = await nav.newPage(); await ana.setContent('<body></body>')
await ana.evaluate(() => {
  /** Pour chaque passage noir (encre) sur la colonne x, l'écart entre son
   *  centre et la ligne de fond (teintée, non noire) la plus proche, lue sur
   *  la colonne x2 (à côté de l'encre) */
  window.calage = async (b64, x, x2) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d'); g.drawImage(im, 0, 0)
    const d = g.getImageData(0, 0, im.width, im.height).data, W = im.width
    const L = (x, y) => { const i = (y * W + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] }
    const passages = (x, pred) => { const r = []; let a = -1; for (let y = 0; y < im.height; y++) { const t = pred(L(x, y)); if (t && a < 0) a = y; if (!t && a >= 0) { r.push((a + y - 1) / 2); a = -1 } } return r }
    const encre = passages(x, l => l < 60)
    const fond = passages(x2, l => l < 250 && l > 60)
    return encre.map(e => { let m = 1e9; for (const f of fond) if (Math.abs(f - e) < Math.abs(m)) m = f - e; return Math.round(m * 10) / 10 })
  }
})
for (const fond of ['grands-carreaux', 'iso']) {
  await P.evaluate(fond => {
    const a = window.__app, t = a.tableau
    a.nouvellePage(); a.changerFond(fond)
    const H = fond === 'iso' ? 40 * Math.sqrt(3) / 2 : 40
    // des traits courts horizontaux (2 cm), posés sur les lignes du monde y = k H, de haut en bas d'une page de 3 m
    for (let k = 2; k < 80; k += 3) { t.nouveauGeste(); t.poser(a.page, { id: 'h' + k, type: 'segment', x: 400, y: k * H, dx: 80, dy: 0, couleur: '#000000', taille: 1.5, z: Date.now() + k, auteur: t.moi }) }
    a.ui.maj()
  }, fond)
  await P.waitForTimeout(200)
  const f = await exporterPdf(P, fond)
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString())[1])
  execFileSync('pdftoppm', ['-r', '254', '-png', f, `${D}/${fond}`])
  const fichiers = readdirSync(D).filter(x => x.startsWith(fond + '-') && x.endsWith('.png')).sort()
  const resultats = []
  for (const x of fichiers) {
    // la colonne de l'encre : chercher une colonne avec beaucoup de noir
    const r = await ana.evaluate(async b64 => {
      const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
      const g = c.getContext('2d'); g.drawImage(im, 0, 0)
      const d = g.getImageData(0, 0, im.width, im.height).data, W = im.width
      let best = -1, n = 0
      for (let x = 0; x < W; x += 3) { let k = 0; for (let y = 0; y < im.height; y += 2) { const i = (y * W + x) * 4; if (d[i] < 50 && d[i + 1] < 50) k++ } if (k > n) { n = k; best = x } }
      return best
    }, readFileSync(`${D}/${x}`).toString('base64'))
    const ecarts = await ana.evaluate(([b, x]) => window.calage(b, x, x - 60 > 0 ? x - 60 : x + 400), [readFileSync(`${D}/${x}`).toString('base64'), r])
    resultats.push({ feuille: x, colonne: r, ecarts })
  }
  note(`${fond} : ${pages} feuille(s)`, resultats.map(r => ({ f: r.feuille, n: r.ecarts.length, max: Math.max(...r.ecarts.map(Math.abs)) })))
  const pire = Math.max(...resultats.flatMap(r => r.ecarts.map(Math.abs)))
  ok(pages >= 2 && pire <= 2.5, `${fond} : sur ${pages} feuilles, chaque trait posé sur une ligne du monde tombe sur la ligne imprimée (au pire ${pire} px à 100 px/cm)`, resultats)
}
await fin(nav)
