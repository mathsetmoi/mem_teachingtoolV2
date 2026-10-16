// Un trait lent, au stylet échantillonné vite (240 Hz) : le tableau le coupe-t-il ?
// Et un grand O : devient-il un cercle ? Ce que voit le direct, ce que garde le film.
// node lent.mjs
import { chromium } from '../commun/playwright.mjs'
import { performance } from 'node:perf_hooks'
import { ecrire, evenements } from './ecriture.mjs'
const dormir = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()
async function essai(texte, vitesse, pas) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://localhost:5173/')
  await page.waitForFunction(() => window.__app)
  await page.waitForTimeout(500)
  const cam = await page.evaluate(() => ({ x: __app.cam.x, y: __app.cam.y, z: __app.cam.z }))
  const tr = ecrire(texte, { x: 200, y: 300 }, { vitesse })
  const ev = evenements(tr, pas)
  const cdp = await ctx.newCDPSession(page)
  const envois = []
  const t0 = performance.now() + 100
  for (const e of ev) {
    const cible = t0 + e.t, w = cible - performance.now()
    if (w > 1.5) await dormir(w - 1.2); else await new Promise(r => setImmediate(r))
    const s = { x: e.x * cam.z + cam.x, y: e.y * cam.z + cam.y }
    const type = e.type === 'bas' ? 'mousePressed' : e.type === 'bouge' ? 'mouseMoved' : 'mouseReleased'
    envois.push(cdp.send('Input.dispatchMouseEvent', { type, x: s.x, y: s.y, button: 'left', buttons: e.type === 'haut' ? 0 : 1, clickCount: 1, pointerType: 'pen', force: e.p }))
  }
  await Promise.all(envois)
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => ({ formes: __app.formes.map(f => f.type + (f.type === 'trait' ? `(${f.pts.length / 3} pts)` : '')), film: __app.tableau.film.toArray().map(e => e.t) }))
  const D = tr.map(t => t.ech.at(-1).t)
  console.log(`« ${texte} » vitesse ×${vitesse}, ${1000 / pas} Hz : ${tr.length} trait(s) écrit(s) (durées ${D.map(x => x.toFixed(0)).join(', ')} ms) → à l’écran : ${r.formes.join(', ')} ; étapes du film : ${r.film.length - 1}, écarts ${r.film.slice(1).map((t, i) => t - r.film[i]).slice(1).join(', ')} ms`)
  await ctx.close()
}
await essai('o', 1, 5)
await essai('o', 0.5, 4)
await essai('o', 0.35, 4)
await essai('O', 1, 5)
await nav.close()
