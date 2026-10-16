// Une image et une formule tournées et agrandies : à l'écran (net), dans le
// PDF et l'image copiée (entières, nettes), dans la vignette de la trieuse.
// Aussi le contraste renforcé : jamais dans l'image copiée, le film élève ni
// le lecteur élève.
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT, DEV, suivre } from './lib/commun.mjs'

const D = OUT + '/objets'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
const P = await ouvrir(ctx)
await P.evaluate(async () => { window.__cadre = await import('/src/cadre.ts') })

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
const raster = (f, nom, ppp = 254) => {
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', f, `${D}/${nom}`])
  return readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort().map(x => `${D}/${x}`)
}
const ana = await nav.newPage()
await ana.setContent('<body></body>')
await ana.evaluate(() => {
  /** La boîte des pixels d'une couleur (pred), et s'ils touchent le bord */
  window.boite = async (b64, nom) => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d'); g.drawImage(im, 0, 0)
    const d = g.getImageData(0, 0, im.width, im.height).data
    const preds = {
      rouge: (r, v, b) => r > 150 && v < 90 && b < 90,
      vert: (r, v, b) => v > 120 && r < 90 && b < 90,
      bleu: (r, v, b) => b > 150 && r < 90 && v < 120,
      sombre: (r, v, b) => r < 70 && v < 70 && b < 70,
    }
    const res = {}
    for (const [k, p] of Object.entries(preds)) {
      let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, n = 0
      for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
        const i = (y * im.width + x) * 4
        if (p(d[i], d[i + 1], d[i + 2])) { n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y }
      }
      res[k] = n ? { x1, y1, x2, y2, n, bord: x1 === 0 || y1 === 0 || x2 === im.width - 1 || y2 === im.height - 1 } : null
    }
    // La netteté du rouge : la part de pixels « entre deux » (ni fond ni encre) parmi les pixels rougeâtres
    let plein = 0, entre = 0
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], v = d[i + 1], b = d[i + 2]
      if (r > 150 && v < 90 && b < 90) plein++
      else if (r > 150 && v < 220 && v > 90 && r - v > 40 && Math.abs(v - b) < 40) entre++
    }
    res.netteteRouge = plein ? Math.round(entre / plein * 100) / 100 : null
    return { w: im.width, h: im.height, ...res }
  }
})
const boite = (buf) => ana.evaluate(b => window.boite(b), buf.toString('base64'))

// Une page au papier pointé : une formule rouge agrandie (× 3) et tournée de
// 90° ; une image (un damier vert et bleu, avec des traits fins) agrandie
// (× 2) et tournée de 30°. Rien d'autre : le cadrage ne tient qu'à elles.
const ids = await P.evaluate(() => {
  const a = window.__app, t = a.tableau, C = window.__cadre
  a.nouvellePage(); a.changerFond('pointe')
  a.choisirOutil('selection')
  const cv = Object.assign(document.createElement('canvas'), { width: 300, height: 200 })
  const g = cv.getContext('2d')
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 300, 200)
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#00a000' : '#1040e0'; g.fillRect(i * 50, j * 50, 50, 50) }
  g.fillStyle = '#ffffff'; g.font = 'bold 30px sans-serif'; g.fillText('ABC 123', 40, 110)
  t.doc.getMap('images').set('verif-damier', cv.toDataURL('image/png'))
  const pose = f => { const id = 'v' + Math.random().toString(36).slice(2); t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f }); return id }
  const F = pose({ type: 'formule', x: 200, y: 150, latex: '\\frac{a+b}{c}=x^2', couleur: '#d0342c', taille: 28 })
  const I = pose({ type: 'image', src: 'verif-damier', x: 500, y: 150, l: 300, h: 200, m: [1, 0, 0, 1] })
  a.cam.x = 60; a.cam.y = 80; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj()
  return { F, I }
})
await P.waitForTimeout(400)
const okF = await P.evaluate(({ F }) => {
  const a = window.__app, C = window.__cadre, f = a.forme(F)
  return a.transformerSelection(C.composer(C.rotation({ x: f.x, y: f.y }, Math.PI / 2), C.echelle({ x: f.x, y: f.y }, 3, 3)), [F])
}, ids)
const okI = await P.evaluate(({ I }) => {
  const a = window.__app, C = window.__cadre
  return a.transformerSelection(C.composer(C.rotation({ x: 800, y: 300 }, Math.PI / 6), C.echelle({ x: 500, y: 150 }, 2, 2)), [I])
}, ids)
await P.evaluate(() => { const a = window.__app; a.selection.clear(); a.toutVoir?.(); a.ui.maj() })
await P.waitForTimeout(800)
const etat = await P.evaluate(({ F, I }) => {
  const a = window.__app, f = a.forme(F), i = a.forme(I)
  const el = [...document.querySelectorAll('.formule')].find(e => e.style.visibility !== 'hidden' && e.style.transform.includes('rotate'))
  return { f: { taille: f.taille, rotation: f.rotation }, i: i.m, el: el && { fs: el.style.fontSize, tr: el.style.transform, r: el.getBoundingClientRect().toJSON() }, cam: { ...a.cam } }
}, ids)
ok(okF && okI && etat.f.taille === 84 && Math.abs(etat.f.rotation - Math.PI / 2) < 1e-9 && etat.el && etat.el.fs === '84px' && /rotate/.test(etat.el.tr),
  'A) La formule agrandie × 3 (taille 84, police 84 px : KaTeX la remet en page) et tournée de 90° (CSS rotate)', etat)
await P.mouse.move(5, 400)
writeFileSync(`${D}/ecran.png`, await P.screenshot())

// L'écran : la netteté de la formule, comparée à une formule droite de même taille
const nette = await P.evaluate(async ({ F }) => {
  const el = [...document.querySelectorAll('.formule')].find(e => e.style.transform.includes('rotate'))
  return el.getBoundingClientRect().toJSON()
}, ids)
const shot = await P.screenshot({ clip: { x: Math.max(0, nette.x - 4), y: Math.max(0, nette.y - 4), width: nette.width + 8, height: nette.height + 8 } })
writeFileSync(`${D}/ecran-formule.png`, shot)
const bEcran = await boite(shot)
note('Écran : formule tournée, part de pixels intermédiaires du rouge', bEcran.netteteRouge)

console.log('=== B. le PDF ===')
const pdf = await exporterPdf(P, 'objets', true)
const [f1] = raster(pdf, 'objets', 254)
const bp = await boite(readFileSync(f1))
// les marges : 12 mm = 120 px à 254 ppp ; la zone utile
const info = execFileSync('pdfinfo', [pdf]).toString()
note('PDF', { taille: /Page size:\s+(.*)/.exec(info)?.[1], pages: /Pages:\s+(\d+)/.exec(info)?.[1], rouge: bp.rouge, vert: bp.vert, bleu: bp.bleu, w: bp.w, h: bp.h, nettete: bp.netteteRouge })
const dansZone = b => b && b.x1 > 120 && b.y1 > 120 && b.x2 < bp.w - 120 && b.y2 < bp.h - 160
ok(dansZone(bp.rouge) && dansZone(bp.vert) && dansZone(bp.bleu), 'B) Dans le PDF, la formule et l\'image tournées sont entières, dans la zone utile (rien de coupé au bord)', { rouge: bp.rouge, vert: bp.vert, bleu: bp.bleu, w: bp.w, h: bp.h })
// La formule tournée de 90° : plus haute que large
ok(bp.rouge && (bp.rouge.y2 - bp.rouge.y1) > 1.5 * (bp.rouge.x2 - bp.rouge.x1), 'B) … la formule y est tournée (plus haute que large)', bp.rouge)
ok(bp.netteteRouge !== null && bp.netteteRouge < 1.2, `B) … et nette (pixels intermédiaires / pleins : ${bp.netteteRouge})`, bp.netteteRouge)

console.log('=== C. l\'image copiée ===')
const LIRE_PRESSE = async () => {
  const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
  if (!it) return null
  const b = await it.getType('image/png'), u8 = new Uint8Array(await b.arrayBuffer())
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}
for (const contraste of [false, true]) {
  await P.evaluate(c => window.__app.ui.choisirContraste(c), contraste)
  await P.evaluate(() => navigator.clipboard.writeText('rien'))
  await P.evaluate(() => { const u = window.__app.ui; u.apercus.choisirFondImprime(true); u.copierEnImage('page') })
  await P.waitForTimeout(2000)
  const b64 = await P.evaluate(LIRE_PRESSE)
  if (!b64) { ok(false, 'C) rien dans le presse-papiers'); continue }
  const buf = Buffer.from(b64, 'base64')
  writeFileSync(`${D}/copie-${contraste ? 'contraste' : 'normal'}.png`, buf)
  const bc = await boite(buf)
  ok(bc.rouge && !bc.rouge.bord && bc.vert && !bc.vert.bord && bc.bleu && !bc.bleu.bord, `C) L'image copiée${contraste ? ' (contraste renforcé allumé)' : ''} : formule et image entières, rien ne touche le bord`, bc)
}
const a1 = readFileSync(`${D}/copie-normal.png`), a2 = readFileSync(`${D}/copie-contraste.png`)
ok(a1.equals(a2), 'C) L\'image copiée est la même, octet pour octet, avec ou sans le contraste renforcé', { normal: a1.length, contraste: a2.length })
await P.evaluate(() => window.__app.ui.choisirContraste(false))

console.log('=== D. la vignette de la trieuse ===')
await P.keyboard.press('Shift+P'); await P.waitForTimeout(800)
await P.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].filter(c => c.getBoundingClientRect().bottom < innerHeight).every(c => c.dataset.peinte), null, { timeout: 15000 }).catch(() => {})
await P.waitForTimeout(500)
const i = await P.evaluate(() => window.__app.pages.indexOf(window.__app.page))
const vb64 = await P.evaluate(i => document.querySelector(`.trieuse .carte:nth-child(${i + 1}) canvas`)?.toDataURL('image/png').split(',')[1], i)
if (vb64) {
  const buf = Buffer.from(vb64, 'base64'); writeFileSync(`${D}/vignette.png`, buf)
  const bv = await boite(buf)
  ok(bv.rouge && !bv.rouge.bord && bv.vert && !bv.vert.bord, 'D) La vignette de la trieuse montre la formule et l\'image tournées, entières', bv)
} else ok(false, 'D) pas de vignette')
await P.keyboard.press('Escape'); await P.waitForTimeout(300)
await fin(nav)
