// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : les mots de « Fixer en fond » avant tout appui (doigt, tablette).
// Copie de retouches/verif/regressions/p14-mots-fixer.mjs ; autonome.
// Sonde 14 : les mots du message de « Fixer en fond » (B5) dans le chemin de
// l'énoncé, version construite (http), quand le tableau n'a pas encore été
// touché : un iPad / TNI (écran tactile) au doigt, et le PC de la classe à la
// tablette graphique (stylet indirect, maxTouchPoints = 0). Le bouton Image,
// le fichier, puis « Fixer en fond » du message, du même pointeur.
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
for (const qui of ['doigt', 'wacom']) {
  const ctx = await nav.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: qui === 'doigt' })
  await ctx.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  const p = await ctx.newPage()
  await p.goto(url)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
  await p.waitForTimeout(800)
  const cdp = await ctx.newCDPSession(p)
  const pen = (type, x, y, appuye) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' && !appuye ? 'none' : 'left', buttons: appuye ? 1 : 0, force: appuye ? 0.45 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 })
  const toucher = async (x, y) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }) }
  const clic = qui === 'doigt' ? toucher : async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true); await pen('mouseReleased', x, y, false) }
  const b64 = await p.evaluate(() => { const c = Object.assign(document.createElement('canvas'), { width: 600, height: 400 }); c.getContext('2d').fillStyle = '#ffe9a0'; c.getContext('2d').fillRect(0, 0, 600, 400); return c.toDataURL('image/png').split(',')[1] })
  const b = await p.locator('button[title^="Importer une image"]').boundingBox()
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), clic(b.x + b.width / 2, b.y + b.height / 2)])
  await fc.setFiles({ name: 'enonce.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  await p.waitForTimeout(800)
  const m1 = await p.evaluate(() => [...document.querySelectorAll('.toast.visible')].map(t => t.textContent).join(' | '))
  const fx = await p.locator('.toast .action', { hasText: 'Fixer en fond' }).boundingBox()
  await clic(fx.x + fx.width / 2, fx.y + fx.height / 2); await p.waitForTimeout(400)
  const m2 = await p.evaluate(() => [...document.querySelectorAll('.toast.visible')].map(t => t.textContent).join(' | '))
  const attendu = qui === 'doigt' ? 'appui long dessus' : 'bouton du stylet dessus'
  ok(m2.includes(attendu), `${qui} : import « ${m1.slice(0, 110)} » ; puis « Fixer en fond » : le message dit « ${attendu} »`, m2)
  await ctx.close()
}
await nav.close(); s.close()
console.log(echecs ? `${echecs} échec(s)` : 'tout vert')
process.exit(echecs ? 1 : 0)
