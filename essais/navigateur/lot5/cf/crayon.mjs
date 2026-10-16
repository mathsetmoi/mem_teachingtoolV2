// Contrôle final : le premier contact du crayon (iPad, pointerType 'pen' sur un écran tactile) fait-il passer le doigt en « déplace » ?
import { chromium } from '../../commun/playwright.mjs'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 600) : '') }
const nav = await chromium.launch()
for (const plateforme of [null, 'MacIntel']) {
  const ctx = await nav.newContext({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true })
  await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  if (plateforme) await ctx.addInitScript(p => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => p }) }, plateforme)
  const p = await ctx.newPage(); await p.goto('http://localhost:5173/')
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 }); await p.waitForTimeout(800)
  const cdp = await ctx.newCDPSession(p)
  await p.evaluate(() => { const a = window.__app; a.reconnaissance = false; a.choisirOutil('stylo'); window.__ev = []; for (const t of ['pointerdown', 'pointerup']) document.addEventListener(t, e => window.__ev.push(t + ':' + e.pointerType), true) })
  const x = 700, y = 500
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + 30, y: y + 5, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 30, y: y + 5, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
  await p.waitForTimeout(400)
  const r = await p.evaluate(() => ({ deplace: window.__app.doigtDeplace, cle: localStorage.getItem('mem-stylet-direct'), tactile: navigator.maxTouchPoints, ev: window.__ev, toast: document.querySelector('.toast')?.textContent, formes: window.__app.formes.length }))
  ok(r.deplace === true && r.cle === '1' && r.formes === 1 && /^Stylet détecté/.test(r.toast ?? ''), `iPad (${plateforme ?? 'Linux'}) : le premier trait du crayon, posé sur le tableau, écrit et fait passer le doigt en « déplace », avec son message`, r)
  await ctx.close()
}
await nav.close()
process.exit(echecs ? 1 : 0)
