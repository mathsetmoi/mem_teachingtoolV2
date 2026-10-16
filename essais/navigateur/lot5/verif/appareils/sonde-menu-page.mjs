import * as L from './lib/outils.mjs'
const { poser, image, triangle, attendre } = L
for (const [nom, url] of [['lot5', L.DEV]]) {
  const ctx = await L.contexte({ viewport: { width: 1366, height: 615 } })
  const { p } = await L.ouvrir(ctx, 'page')
  await p.evaluate(L.PAGE_NEUVE)
  const I = await poser(p, image(200, 150, 160, 100)); await p.evaluate(id => window.__app.fixerEnFond([id]), I)
  const T = await poser(p, triangle(260, 350)); await p.evaluate(id => window.__app.verrouiller(true, [id]), T)
  await p.evaluate(() => { window.__app.copier?.(); })
  await p.mouse.click(900, 400, { button: 'right' }); await attendre(400)
  const r = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(m => !m.hidden && m.offsetWidth); const b = m.getBoundingClientRect(); return { b: [b.top, b.bottom], sh: m.scrollHeight, ch: m.clientHeight, items: [...m.querySelectorAll('.menu-item')].map(i => { const ib = i.getBoundingClientRect(); let bas = ib.top; for (const c of i.querySelectorAll('*')) { const cb = c.getBoundingClientRect(); if (cb.height) bas = Math.max(bas, cb.bottom) } return [(i.querySelector('.libelle')?.textContent ?? '').slice(0, 26), Math.round(ib.height), Math.round(bas - ib.bottom)] }) } })
  console.log(JSON.stringify(r))
  await p.screenshot({ path: `${L.V}/captures/menu-page-1366x615.png` })
  await ctx.close()
}
await L.fin()
