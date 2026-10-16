// 60 pages de 300 traits : temps des vignettes, tâches longues (la promesse du README)
import { ouvrir, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < 60; k++) {
    if (k) a.nouvellePage()
    t.doc.transact(() => {
      for (let j = 0; j < 300; j++) {
        const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6, Math.sin(i / 5 + j) * 10, 0.5)
        t.poser(a.page, { id: `p${k}t${j}`, type: 'trait', x: 50 + (j % 6) * 380, y: 50 + Math.floor(j / 6) * 40, z: j, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
      }
    })
  }
  a.allerPage(a.pages[0])
}).catch(e => console.log('prép', e.message))
await pause(1500)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask' })
})
const t0 = await page.evaluate(() => performance.now())
await page.keyboard.press('Shift+P')
await page.waitForFunction(() => document.querySelectorAll('.trieuse .carte').length === 60)
const visibles = await page.waitForFunction(() => {
  const g = document.querySelector('.trieuse-grille').getBoundingClientRect()
  const v = [...document.querySelectorAll('.trieuse .carte')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > g.top && r.top < g.bottom })
  return v.length && v.every(c => c.dataset.peinte === 'oui') ? performance.now() : false
}, null, { timeout: 20000, polling: 16 }).then(h => h.jsonValue())
const toutes = await page.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].every(c => c.dataset.peinte === 'oui') ? performance.now() : false, null, { timeout: 30000, polling: 16 }).then(h => h.jsonValue())
const longues = await page.evaluate(() => window.__longues)
console.log({ visibles: Math.round(visibles - t0), toutes: Math.round(toutes - t0), longues })
await fin()
