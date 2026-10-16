// L'export PDF des fonds : imprimé ou non selon la case, les mesures (1 cm du
// tableau = 1 cm sur la feuille A4 à l'échelle réelle), les millimètres du
// papier millimétré, le pas du pointé et du réseau isométrique ; le contraste
// renforcé jamais dans le PDF.
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync, readFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT } from './lib/commun.mjs'

const D = OUT + '/pdf'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
const P = await ouvrir(ctx)

async function exporterPdf(p, nom, avecFond) {
  await p.mouse.move(683, 384)
  await p.keyboard.press('Control+p')
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const caseFond = p.locator('dialog[open] input[name="pdf-fond"]')
  if (avecFond) await caseFond.check(); else await caseFond.uncheck()
  const dl = p.waitForEvent('download', { timeout: 240000 }).catch(() => null)
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  return f
}
/** pdftoppm à 254 ppp : 100 pixels par centimètre */
const PPP = 254
const raster = (f, nom) => {
  execFileSync('pdftoppm', ['-r', String(PPP), '-png', '-f', '1', '-l', '1', f, `${D}/${nom}`])
  return `${D}/` + readdirSync(D).find(x => x.startsWith(nom + '-') && x.endsWith('.png'))
}
// Une page d'analyse : profils de colonnes et de rangées
const ana = await nav.newPage()
await ana.setContent('<body></body>')
await ana.evaluate(() => {
  window.charger = async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0)
    window.img = { g, w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }
    return { w: im.width, h: im.height }
  }
  /** Sur la rangée y (de x0 à x1), les centres des passages « teintés » (pas blancs) */
  window.passages = (y, x0, x1, seuil = 250, col = false) => {
    const { d, w } = window.img
    const L = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    const r = []; let debut = -1
    for (let t = x0; t <= x1; t++) {
      const i = col ? (t * w + y) * 4 : (y * w + t) * 4
      const teinte = L(i) < seuil
      if (teinte && debut < 0) debut = t
      if (!teinte && debut >= 0) { r.push((debut + t - 1) / 2); debut = -1 }
    }
    return r
  }
  window.pixel = (x, y) => { const { d, w } = window.img, i = (y * w + x) * 4; return [d[i], d[i + 1], d[i + 2]] }
  window.compter = (pred) => { const { d } = window.img; let n = 0; for (let i = 0; i < d.length; i += 4) if (pred(d[i], d[i + 1], d[i + 2])) n++; return n }
  window.egal = async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d'); g.drawImage(im, 0, 0)
    const e = g.getImageData(0, 0, im.width, im.height).data, d = window.img.d
    if (e.length !== d.length) return { memeTaille: false }
    let diff = 0, max = 0
    for (let i = 0; i < d.length; i++) { const x = Math.abs(d[i] - e[i]); if (x) { diff++; if (x > max) max = x } }
    return { memeTaille: true, diff, max }
  }
})
const charger = f => ana.evaluate(b => window.charger(b), readFileSync(f).toString('base64'))
const ecarts = a => a.slice(1).map((x, i) => Math.round((x - a[i]) * 10) / 10)

/** Une page au fond donné, deux repères verticaux à x = 100 et x = 500 (10 cm
 *  du tableau entre eux) et un horizontal de 10 cm, en encre noire fine */
const PAGE = fond => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.changerFond(fond)
  const pose = f => { t.nouveauGeste(); t.poser(a.page, { id: 'pdf' + Math.random().toString(36).slice(2), z: Date.now() + Math.random(), auteur: t.moi, ...f }) }
  pose({ type: 'segment', x: 100, y: 100, dx: 0, dy: 200, couleur: '#000000', taille: 2 })
  pose({ type: 'segment', x: 500, y: 100, dx: 0, dy: 200, couleur: '#000000', taille: 2 })
  pose({ type: 'segment', x: 100, y: 340, dx: 400, dy: 0, couleur: '#000000', taille: 2 })
  a.ui.maj()
}

console.log('=== A. l\'échelle et les fonds dans le PDF ===')
const resultats = {}
for (const fond of ['grands-carreaux', 'carreaux', 'millimetre', 'pointe', 'iso', 'seyes', 'repere']) {
  await P.evaluate(PAGE, fond); await P.waitForTimeout(200)
  const avec = await exporterPdf(P, fond + '-avec', true)
  const sans = await exporterPdf(P, fond + '-sans', false)
  if (!avec || !sans) { ok(false, `${fond} : pas de PDF`); continue }
  const info = execFileSync('pdfinfo', [avec]).toString()
  const taille = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(info)
  const fa = raster(avec, fond + '-avec'), fs = raster(sans, fond + '-sans')
  const dim = await charger(fs)
  // Les repères noirs : sur la rangée du milieu des verticaux, les passages très sombres
  const noirs = await ana.evaluate(({ h }) => {
    // la rangée où les deux verticaux sont : chercher une rangée avec 2 passages sombres
    for (let y = 0; y < h; y += 5) { const p = window.passages(y, 0, window.img.w - 1, 80); if (p.length === 2) return { y, p } }
    return null
  }, dim)
  const cm = noirs ? (noirs.p[1] - noirs.p[0]) / 10 : null
  ok(noirs && Math.abs(cm - 100) < 1.5, `A) ${fond} : 10 cm du tableau font ${noirs && (noirs.p[1] - noirs.p[0]) / 100} cm sur la feuille (A4 ${taille?.[1]} × ${taille?.[2]} pt)`, { noirs, cm })
  // Le fond : profil d'une rangée sans encre, au-dessus des repères
  await charger(fa)
  const yFond = dim.h - 300
  const passA = await ana.evaluate(({ y, w }) => window.passages(y, 120, w - 120, 253), { y: yFond, w: dim.w })
  const passCol = await ana.evaluate(({ x, h }) => window.passages(x, 120, h - 200, 253, true), { x: dim.w - 260, h: dim.h })
  await charger(fs)
  const passS = await ana.evaluate(({ y, w }) => window.passages(y, 120, w - 120, 253), { y: yFond, w: dim.w })
  resultats[fond] = { colonnes: ecarts(passA).slice(0, 30), rangees: ecarts(passCol).slice(0, 30), sansFond: passS.length }
  note(`${fond} : écarts des lignes sur une rangée (px à 100 px/cm)`, ecarts(passA).slice(0, 24))
  note(`${fond} : écarts sur une colonne`, ecarts(passCol).slice(0, 24))
  ok(passS.length === 0, `A) ${fond} : sans « imprimer le fond », la feuille est blanche hors de l'encre`, passS.slice(0, 10))
}
// Les attentes
const moy = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN
{
  const g = resultats['grands-carreaux']
  ok(g && Math.abs(moy(g.colonnes) - 100) < 1.5 && g.colonnes.every(e => Math.abs(e - 100) <= 2), 'A) Grands carreaux : une ligne tous les 1 cm sur la feuille', g?.colonnes)
  const p = resultats.carreaux
  ok(p && Math.abs(moy(p.colonnes) - 50) < 1 && p.colonnes.every(e => Math.abs(e - 50) <= 2), 'A) Petits carreaux : une ligne tous les 5 mm', p?.colonnes)
  const m = resultats.millimetre
  ok(m && m.colonnes.length && Math.min(...m.colonnes) <= 11, 'A) Papier millimétré : des lignes tous les 1 mm sur la feuille imprimée (le papier millimétré du commerce)', { ecartMin: m && Math.min(...m.colonnes), ecarts: m?.colonnes })
  const i = resultats.iso
  ok(i && i.rangees.length > 3, 'A) Réseau isométrique : il y a des lignes', i?.rangees)
}

console.log('=== B. le contraste renforcé jamais dans le PDF ===')
for (const fond of ['millimetre', 'iso', 'pointe']) {
  await P.evaluate(PAGE, fond); await P.waitForTimeout(200)
  await P.evaluate(() => { window.__app.rendu.contraste = false; window.__app.rendu.toutRedessiner() })
  const normal = await exporterPdf(P, fond + '-normal', true)
  await P.evaluate(() => window.__app.ui.choisirContraste(true))
  await P.waitForTimeout(200)
  const etat = await P.evaluate(() => ({ rendu: window.__app.rendu.contraste, body: document.body.classList.contains('contraste') }))
  const fort = await exporterPdf(P, fond + '-contraste', true)
  const rn = raster(normal, fond + '-normal'), rc = raster(fort, fond + '-contraste')
  await charger(rn)
  const cmp = await ana.evaluate(b => window.egal(b), readFileSync(rc).toString('base64'))
  ok(etat.rendu && cmp.memeTaille && cmp.diff === 0, `B) ${fond} : le PDF est le même, pixel pour pixel, avec et sans le contraste renforcé`, { etat, cmp })
  // Remettre le contraste comme avant
  await P.evaluate(() => window.__app.ui.choisirContraste(false))
}
await fin(nav)
