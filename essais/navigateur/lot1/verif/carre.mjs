// iPad sans clavier, le doigt dessine un carré : que dit le message ?
import { lancer, ouvrir, noter, bilan, outils } from './lib.mjs'
const nav = await lancer()
const { page, cdp } = await ouvrir(nav, { hasTouch: true, isMobile: true, viewport: { width: 1024, height: 768 } }, 'ipad')
const { touche } = outils(cdp)
const ev = (f, a) => page.evaluate(f, a)
await ev(() => window.__app.choisirDoigt('dessine'))
const pts = []
const c = [[400, 300], [600, 300], [600, 500], [400, 500], [400, 302]]
for (let i = 0; i < 4; i++) for (let k = 0; k < 10; k++) pts.push([c[i][0] + (c[i + 1][0] - c[i][0]) * k / 10, c[i][1] + (c[i + 1][1] - c[i][1]) * k / 10])
pts.push([400, 302])
await touche('touchStart', [pts[0]])
for (const p of pts.slice(1)) { await touche('touchMove', [p]); await page.waitForTimeout(8) }
await touche('touchEnd', [])
await page.waitForTimeout(300)
const r = await ev(() => ({ types: window.__app.formes.map(f => f.type), toast: document.querySelector('.toast').textContent, pointeur: window.__app.dernierPointeur }))
noter('Au doigt, le message de la figure reconnue ne renvoie pas à un raccourci clavier', !/Ctrl/.test(r.toast), JSON.stringify(r))
bilan()
await nav.close()
