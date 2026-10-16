// Une image fixée en fond, sous de l'écriture, sur papier pointé : dans le PDF
// avec et sans « imprimer le fond », dans l'image copiée « sans le fond », dans
// la vignette de la trieuse et dans le lecteur élève (sous l'encre).
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT, DEV, suivre } from './lib/commun.mjs'

const D = OUT + '/fixee'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const nav = await lancer()
const ctx = await contexte(nav)
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
const P = await ouvrir(ctx)
async function exporterPdf(p, nom, avecFond) {
  await p.mouse.move(683, 384)
  await p.keyboard.press('Control+p')
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const c = p.locator('dialog[open] input[name="pdf-fond"]'); if (avecFond) await c.check(); else await c.uncheck()
  const dl = p.waitForEvent('download', { timeout: 240000 }).catch(() => null)
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl; const f = `${D}/${nom}.pdf`; await d.saveAs(f); return f
}
const ana = await nav.newPage(); await ana.setContent('<body></body>')
const compter = buf => ana.evaluate(async b64 => {
  const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
  const g = c.getContext('2d'); g.drawImage(im, 0, 0)
  const d = g.getImageData(0, 0, im.width, im.height).data
  let vert = 0, encre = 0, encreSurVert = 0
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], v = d[i + 1], b = d[i + 2]
    if (v > 150 && r < 120 && b < 120) vert++
    if (r < 60 && v < 60 && b < 80) encre++
  }
  return { vert, encre, n: d.length / 4 }
}, buf.toString('base64'))

const id = await P.evaluate(() => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.changerFond('pointe'); a.choisirOutil('selection')
  const cv = Object.assign(document.createElement('canvas'), { width: 200, height: 120 })
  const g = cv.getContext('2d'); g.fillStyle = '#30c040'; g.fillRect(0, 0, 200, 120)
  t.doc.getMap('images').set('verif-vert', cv.toDataURL('image/png'))
  t.nouveauGeste(); t.poser(a.page, { id: 'img-fixee', type: 'image', src: 'verif-vert', x: 200, y: 200, l: 200, h: 120, m: [2, 0, 0, 2], z: Date.now(), auteur: t.moi })
  const pts = []; for (let i = 0; i <= 30; i++) pts.push(i * 10, Math.sin(i / 3) * 20, 0.5)
  t.nouveauGeste(); t.poser(a.page, { id: 'encre', type: 'trait', x: 250, y: 300, pts, couleur: '#1b2230', taille: 6, opacite: 1, pression: false, z: Date.now() - 100000, auteur: t.moi })
  a.fixerEnFond(['img-fixee'])
  a.selection.clear(); a.toutVoir?.(); a.ui.maj()
  return { f: a.forme('img-fixee') }
})
ok(id.f?.fixe === true, 'L\'image est fixée en fond', id.f)
await P.waitForTimeout(500)
for (const avec of [true, false]) {
  const f = await exporterPdf(P, 'fixee-' + (avec ? 'avec' : 'sans'), avec)
  execFileSync('pdftoppm', ['-r', '60', '-png', f, `${D}/fixee-${avec ? 'avec' : 'sans'}`])
  const png = readdirSync(D).find(x => x.startsWith(`fixee-${avec ? 'avec' : 'sans'}-`) && x.endsWith('.png'))
  const m = await compter(readFileSync(`${D}/${png}`))
  ok(m.vert > 2000 && m.encre > 30, `PDF ${avec ? 'avec' : 'sans'} « imprimer le fond » : l'image fixée (l'énoncé) est imprimée, l'écriture par-dessus`, m)
}
// L'image copiée sans le fond
const LIRE_PRESSE = async () => {
  const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
  if (!it) return null
  const b = await it.getType('image/png'), u8 = new Uint8Array(await b.arrayBuffer())
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}
await P.evaluate(() => navigator.clipboard.writeText('rien'))
await P.evaluate(() => { const u = window.__app.ui; u.apercus.choisirFondImprime(false); u.copierEnImage('page') })
await P.waitForTimeout(1500)
const b64 = await P.evaluate(LIRE_PRESSE)
const mc = b64 && await compter(Buffer.from(b64, 'base64'))
ok(mc && mc.vert > 2000 && mc.encre > 30, 'L\'image copiée « sans le fond » garde l\'image fixée et l\'écriture', mc)
await P.evaluate(() => window.__app.ui.apercus.choisirFondImprime(true))
// Le lecteur élève
const film = await P.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Fixée' })
  return fo.ecrireFilm(f)
})
const L = await ctx.newPage(); suivre(L, 'lecteur')
await L.goto(DEV + 'revoir.html')
await L.locator('input[type=file]').setInputFiles({ name: 'fixee.mem', mimeType: 'application/json', buffer: Buffer.from(film) })
await L.waitForTimeout(1500); await L.keyboard.press('End'); await L.waitForTimeout(1500)
const lu = await L.evaluate(() => {
  const c = [...document.querySelectorAll('canvas')].find(x => x.width > 300)
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let vert = 0, encre = 0
  for (let i = 0; i < d.length; i += 4) { if (d[i + 1] > 150 && d[i] < 120 && d[i + 2] < 120) vert++; if (d[i] < 60 && d[i + 1] < 60 && d[i + 2] < 80) encre++ }
  return { vert, encre }
})
writeFileSync(`${D}/lecteur.png`, await L.screenshot())
ok(lu.vert > 2000 && lu.encre > 30, 'Le lecteur élève montre l\'image fixée et l\'écriture par-dessus', lu)
await fin(nav)
