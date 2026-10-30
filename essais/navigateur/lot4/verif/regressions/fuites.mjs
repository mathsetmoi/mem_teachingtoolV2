// Ouvrir et fermer la bibliothèque, la trieuse, le menu ⋯ 40 fois : les
// écouteurs de window et document, les nœuds du DOM, les minuteries, le tas.
import { chromium } from '../../../commun/playwright.mjs'
const nav = await chromium.launch({ args: ['--js-flags=--expose-gc'] })
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => {
  window.__minuteries = 0
  const si = window.setInterval; window.setInterval = (...a) => { window.__minuteries++; return si(...a) }
  const ci = window.clearInterval; window.clearInterval = id => { if (id) window.__minuteries--; return ci(id) }
})
const p = await ctx.newPage()
await p.goto('http://localhost:5173/')
await p.waitForFunction(() => window.__surveillance && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.waitForTimeout(3000)
const cdp = await ctx.newCDPSession(p)
const compter = async () => {
  await p.evaluate(() => window.gc?.())
  const w = await cdp.send('Runtime.evaluate', { expression: 'window' }); const d = await cdp.send('Runtime.evaluate', { expression: 'document' })
  const lw = (await cdp.send('DOMDebugger.getEventListeners', { objectId: w.result.objectId })).listeners.length
  const ld = (await cdp.send('DOMDebugger.getEventListeners', { objectId: d.result.objectId })).listeners.length
  const m = await cdp.send('Runtime.getHeapUsage')
  const n = await p.evaluate(() => ({ noeuds: document.getElementsByTagName('*').length, minuteries: window.__minuteries, dialogs: document.querySelectorAll('dialog').length }))
  return { window: lw, document: ld, tas: Math.round(m.usedSize / 1e6), ...n }
}
console.log('départ', JSON.stringify(await compter()))
for (let i = 0; i < 40; i++) {
  await p.evaluate(() => (document.querySelector('.bouton-classeur').click(), document.querySelector('.menu-seances [data-action="bibliotheque"]').click()))
  await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs.tous > li').length > 0)
  await p.waitForTimeout(80)
  await p.keyboard.press('Escape'); await p.waitForTimeout(80)
  await p.evaluate(() => window.__app.ui.trieuse.ouvrir()); await p.waitForTimeout(120)
  await p.keyboard.press('Escape'); await p.waitForTimeout(80)
  await p.evaluate(() => document.querySelector('button[title^="Enregistrer, ouvrir"]').click()); await p.waitForTimeout(60)
  await p.keyboard.press('Escape'); await p.waitForTimeout(60)
  if (i === 9) console.log('après 10', JSON.stringify(await compter()))
}
console.log('après 40', JSON.stringify(await compter()))
await nav.close()
