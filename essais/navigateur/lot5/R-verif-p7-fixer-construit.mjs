// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : le chemin de l'énoncé, version construite : « Fixer en
// fond », puis un trait par-dessus écrit. Seulement la version du dépôt (la sonde
// d'origine passait aussi celle de 8d4de8b).
// Copie de retouches/verif/regressions/p7-fixer-construit.mjs ; autonome.
// Sonde 7 : le chemin de l'énoncé dans la VERSION CONSTRUITE, comme le
// professeur (sans window.__app ; la version en ligne servie en http, puis la
// version hors ligne en file://), à la souris puis au stylet de la tablette graphique
// (CDP pointerType 'pen', qui survole) : au Stylo (le départ), le bouton
// Image, un énoncé (une image pâle) ; « Fixer en fond » du message ; puis un
// trait à main levée par-dessus l'énoncé, comme le message de Fixer le dit.
// L'encre se lit dans les pixels de la scène (des pixels sombres là où l'on
// a écrit). Version d'avant (construite depuis 8d4de8b) et nouvelle.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const R = `${RACINE_DEPOT}`
const V = `${RACINE_ESSAIS}/retouches/verif/regressions`
const VERSIONS = { nouveau: { pages: R + '/dist-pages', un: R + '/dist/index.html' } }
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 900) : '') }
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
function servir(dossier) {
  const s = createServer((q, r) => {
    const chemin = normalize(join(dossier, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
    if (!chemin.startsWith(dossier) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
    r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
  })
  return new Promise(f => s.listen(0, '127.0.0.1', () => f(s)))
}
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
const ENCRE = ({ x1, y1, x2, y2 }) => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(Math.round((x1 - r.left) * k), Math.round((y1 - r.top) * k), Math.round((x2 - x1) * k), Math.round((y2 - y1) * k)).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 140) n++
  return n
}
for (const [nom, v] of Object.entries(VERSIONS)) {
  if (!existsSync(v.un)) { console.log(`(${nom} : pas de version construite ${v.un})`); continue }
  const serveur = await servir(v.pages)
  for (const [lieu, url] of [['en ligne', `http://127.0.0.1:${serveur.address().port}/index.html`], ['hors ligne', 'file://' + v.un]]) {
    for (const ptr of ['souris', 'wacom']) {
      const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
      await ctx.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
      const p = await ctx.newPage()
      const erreurs = []; p.on('pageerror', e => erreurs.push(e.message))
      await p.goto(url)
      await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
      await p.waitForTimeout(800)
      const cdp = await ctx.newCDPSession(p)
      const pen = (type, x, y, appuye) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' && !appuye ? 'none' : 'left', buttons: appuye ? 1 : 0, force: appuye ? 0.45 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 })
      const P = ptr === 'souris'
        ? { clic: async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.up() }, bas: async (x, y) => { await p.mouse.move(x, y); await p.mouse.down() }, va: (x, y) => p.mouse.move(x, y), haut: () => p.mouse.up() }
        : { clic: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true); await pen('mouseReleased', x, y, false) }, bas: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true) }, va: (x, y) => pen('mouseMoved', x, y, true), haut: (x, y) => pen('mouseReleased', x, y, false) }
      // Un énoncé pâle (jaune clair), 900 × 600
      const b64 = await p.evaluate(() => {
        const c = Object.assign(document.createElement('canvas'), { width: 900, height: 600 }); const g = c.getContext('2d')
        g.fillStyle = '#fff6c0'; g.fillRect(0, 0, 900, 600); return c.toDataURL('image/png').split(',')[1]
      })
      const outil0 = await p.evaluate(() => document.getElementById('zone').dataset.outil)
      const b = await p.locator('button[title^="Importer une image"]').boundingBox()
      const [fc] = await Promise.all([p.waitForEvent('filechooser'), P.clic(b.x + b.width / 2, b.y + b.height / 2)])
      await fc.setFiles({ name: 'enonce.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
      await p.waitForTimeout(800)
      const outil1 = await p.evaluate(() => document.getElementById('zone').dataset.outil)
      const fixer = await p.locator('.toast .action', { hasText: 'Fixer en fond' }).boundingBox()
      await P.clic(fixer.x + fixer.width / 2, fixer.y + fixer.height / 2); await p.waitForTimeout(400)
      const apres = await p.evaluate(() => ({ outil: document.getElementById('zone').dataset.outil, toast: [...document.querySelectorAll('.toast.visible')].map(t => t.textContent).join(' | ') }))
      // Un trait par-dessus l'énoncé, au milieu de l'écran
      const zone = { x1: 560, y1: 340, x2: 820, y2: 440 }
      const avant = await p.evaluate(ENCRE, zone)
      await P.bas(580, 390)
      for (let i = 1; i <= 16; i++) { await P.va(580 + i * 14, 390 + Math.sin(i / 2) * 25); await p.waitForTimeout(12) }
      await P.haut(580 + 16 * 14, 390); await p.waitForTimeout(500)
      const encre = await p.evaluate(ENCRE, zone)
      const dit = apres.toast.includes('écrivez et entourez par-dessus')
      ok(encre - avant > 50, `${nom}, ${lieu}, ${ptr} : départ ${outil0}, import → ${outil1}, « Fixer en fond » → ${apres.outil} ; le message dit « écrivez par-dessus » : ${dit} ; un trait par-dessus l'énoncé écrit`, { encreAvant: avant, encreApres: encre, toast: apres.toast })
      await p.screenshot({ path: `${RACINE_ESSAIS}/retouches/verif-corr/sondes-captures/fixer-construit-${nom}-${lieu === 'en ligne' ? 'ligne' : 'cle'}-${ptr}.png` })
      if (erreurs.length) console.log('erreurs', erreurs)
      await ctx.close()
    }
  }
  serveur.close()
}
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'tout vert')
process.exit(echecs ? 1 : 0)
