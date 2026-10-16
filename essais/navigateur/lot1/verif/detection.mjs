// Auto, écran tactile : le premier stylet est une figure reconnue (un trait droit, un carré) : le message « Stylet détecté » reste-t-il ?
import { lancer, ouvrir, noter, bilan, outils, ligne } from './lib.mjs'
const nav = await lancer()
for (const forme of ['trait droit', 'carré']) {
  const { page, cdp, ctx } = await ouvrir(nav, { hasTouch: true, viewport: { width: 1024, height: 768 } }, 'tactile')
  const { stylet } = outils(cdp)
  const ev = (f, a) => page.evaluate(f, a)
  let pts
  if (forme === 'trait droit') pts = ligne(300, 400, 300, 0, 30)
  else {
    const c = [[400, 300], [600, 300], [600, 500], [400, 500], [400, 302]]
    pts = []
    for (let i = 0; i < 4; i++) for (let k = 0; k < 10; k++) pts.push([c[i][0] + (c[i + 1][0] - c[i][0]) * k / 10, c[i][1] + (c[i + 1][1] - c[i][1]) * k / 10])
    pts.push([400, 302])
  }
  const journal = []
  await page.exposeFunction('noterToast', t => journal.push(t))
  await ev(() => new MutationObserver(() => window.noterToast(document.querySelector('.toast').textContent)).observe(document.querySelector('.toast'), { childList: true, subtree: true, characterData: true }))
  await stylet.bas(...pts[0])
  for (const p of pts.slice(1)) { await stylet.va(...p); await page.waitForTimeout(8) }
  await stylet.haut(...pts.at(-1))
  await page.waitForTimeout(400)
  const r = await ev(() => ({ deplace: window.__app.doigtDeplace, toast: document.querySelector('.toast').textContent, visible: document.querySelector('.toast').classList.contains('visible'), types: window.__app.formes.map(f => f.type) }))
  noter(`Auto, premier stylet = ${forme} : « Stylet détecté … Changer » encore à l'écran après le lever`, r.deplace && /Stylet détecté/.test(r.toast), JSON.stringify({ ...r, journal: [...new Set(journal)] }))
  await ctx.close()
}
bilan()
await nav.close()
