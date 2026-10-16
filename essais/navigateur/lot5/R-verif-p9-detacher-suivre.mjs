// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : suivre à la lettre le message de « Fixer en fond ».
// Copie de retouches/verif/regressions/p9-detacher-suivre.mjs ; autonome.
// Sonde 9 : suivre à la lettre le message de « Fixer en fond » (B5) dans la
// version construite (http), à la souris et au stylet de la tablette :
// « clic droit (bouton du stylet) dessus, puis « Détacher l'image du fond » » :
// le menu s'ouvre-t-il, a-t-il l'entrée, et l'image se tourne-t-elle ensuite
// (l'outil, la pastille) ? Puis, deux images fixées d'un coup : « … dans le
// vide, puis « Détacher le fond » ».
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
const R = `${RACINE_DEPOT}`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 900) : '') }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png' }
const dossier = R + '/dist-pages'
const s = createServer((q, r) => {
  const chemin = normalize(join(dossier, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(dossier) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => s.listen(0, '127.0.0.1', f))
const url = `http://127.0.0.1:${s.address().port}/index.html`
const nav = await chromium.launch()
for (const ptr of ['souris', 'wacom']) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  const p = await ctx.newPage()
  await p.goto(url)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
  await p.waitForTimeout(800)
  const cdp = await ctx.newCDPSession(p)
  const pen = (type, x, y, appuye, b = 'left') => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' && !appuye ? 'none' : b, buttons: appuye ? (b === 'right' ? 2 : 1) : 0, force: appuye ? 0.45 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 })
  const P = ptr === 'souris'
    ? { clic: async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up() }, droit: (x, y) => p.mouse.click(x, y, { button: 'right' }) }
    : { clic: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true); await pen('mouseReleased', x, y, false) }, droit: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true, 'right'); await pen('mouseReleased', x, y, false, 'right') } }
  // On écrit d'abord sur le tableau (le pointeur est connu de l'application)
  if (ptr === 'wacom') { await pen('mouseMoved', 300, 650, false); await pen('mousePressed', 300, 650, true); for (let i = 1; i < 6; i++) await pen('mouseMoved', 300 + i * 10, 650, true); await pen('mouseReleased', 350, 650, false) }
  else { await p.mouse.move(300, 650); await p.mouse.down(); await p.mouse.move(350, 650); await p.mouse.up() }
  await p.waitForTimeout(300)
  const b64 = await p.evaluate(() => {
    const c = Object.assign(document.createElement('canvas'), { width: 600, height: 400 }); const g = c.getContext('2d')
    g.fillStyle = '#ffe9a0'; g.fillRect(0, 0, 600, 400); return c.toDataURL('image/png').split(',')[1]
  })
  const b = await p.locator('button[title^="Importer une image"]').boundingBox()
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), P.clic(b.x + b.width / 2, b.y + b.height / 2)])
  await fc.setFiles({ name: 'enonce.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await p.waitForTimeout(800)
  const fx = await p.locator('.toast .action', { hasText: 'Fixer en fond' }).boundingBox()
  await P.clic(fx.x + fx.width / 2, fx.y + fx.height / 2); await p.waitForTimeout(400)
  const msg = await p.evaluate(() => [...document.querySelectorAll('.toast.visible')].map(t => t.textContent).join(' | '))
  // « … dessus » : au milieu de l'écran (l'image est posée au milieu de la vue)
  await P.droit(683, 400); await p.waitForTimeout(400)
  const menu = await p.evaluate(() => [...document.querySelectorAll('.menu-item')].filter(e => e.offsetParent).map(e => e.querySelector('.libelle')?.firstChild?.textContent?.trim()))
  ok(menu.includes('Détacher l\'image du fond'), `${ptr} : le message « ${msg.slice(0, 140)}… » ; ${ptr === 'souris' ? 'clic droit' : 'bouton du stylet'} sur l'image : le menu a « Détacher l'image du fond »`, menu)
  const d = await p.locator('.menu-item', { hasText: 'Détacher l\'image du fond' }).first().boundingBox().catch(() => null)
  if (d) {
    await P.clic(d.x + d.width / 2, d.y + d.height / 2); await p.waitForTimeout(400)
    const e = await p.evaluate(() => ({ outil: document.getElementById('zone').dataset.outil, toast: [...document.querySelectorAll('.toast.visible')].map(t => t.textContent).join(' | ') }))
    ok(e.outil === 'selection', `${ptr} : détachée, l'outil Sélection (sa pastille ↻)`, e)
  }
  await ctx.close()
}
await nav.close(); s.close()
console.log(echecs ? `${echecs} échec(s)` : 'tout vert')
process.exit(echecs ? 1 : 0)
