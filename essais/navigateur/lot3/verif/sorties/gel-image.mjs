// Copier en image une page très chargée (≈ 1 250 traits) : tâches longues ?
import { nav, ouvrir, verifier, mkdir, V, erreurs, msgs } from './lib.mjs'
import { ECRIRE } from '../../P9/ecriture.mjs'
const { ctx, page } = await ouvrir({}, 'gel-image')
await page.evaluate(ECRIRE, { pages: 1, lignes: 78, mots: 16, pas: 40, haut: 20, ech: 1.6, fond: 'seyes' })
await page.waitForTimeout(1500)
const n = await page.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false })
  window.__msgs.length = 0
})
await page.evaluate(() => window.__app.ui.copierEnImage('page'))
for (let k = 0; k < 60 && !(await msgs(page)).some(m => /Image copiée/.test(m.t)); k++) await page.waitForTimeout(100)
const longues = await page.evaluate(() => window.__longues)
console.log(n, 'formes', longues, (await msgs(page)).at(-1))
verifier(`Copier en image une page de ${n} traits : pas de tâche de plus de 150 ms`, Math.max(0, ...longues) <= 150, longues)
await nav.close()
