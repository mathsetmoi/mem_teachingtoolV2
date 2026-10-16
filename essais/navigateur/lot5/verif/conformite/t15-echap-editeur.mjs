import * as O from './lib/outils.mjs'
const { note } = O
for (const vp of [{ width: 1366, height: 768 }, { width: 390, height: 844 }]) {
  const ctx = await O.contexte({ viewport: vp, hasTouch: vp.width < 500, isMobile: vp.width < 500 })
  const { p } = await O.ouvrir(ctx, 'e')
  await p.evaluate(() => { window.__r = window.__app.ui.editerFormule('x^2', 100, 300) })
  await p.waitForTimeout(500)
  note('ouvert, focus', await p.evaluate(() => ({ open: document.querySelectorAll('dialog[open]').length, focus: document.activeElement?.tagName + '.' + document.activeElement?.className })))
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  note(`${vp.width} : après Échap`, await p.evaluate(() => ({ open: document.querySelectorAll('dialog[open]').length, vis: [...document.querySelectorAll('dialog')].filter(d => d.open).map(d => d.className) })))
  await ctx.close()
}
await O.fin()
