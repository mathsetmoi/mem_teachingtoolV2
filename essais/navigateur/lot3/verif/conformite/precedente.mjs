// « ‹ » cliqué plusieurs fois de suite au même endroit, quand une page a un nom
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
await preparer(page, 4, { noms: { 1: 'Exercice 12 p. 84' }, ici: 3 })
await pause(300)
const pos = () => page.evaluate(() => {
  const b = document.querySelector('.barre-haut button[title^="Page précédente"]'), r = b.getBoundingClientRect()
  const c = document.querySelector('.rang').getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, rang: [Math.round(c.left), Math.round(c.right)] }
})
const p4 = await pos()
console.log('‹ sur la page 4 :', p4)
// Page 4 → 3 → 2 → 1 : trois clics au même endroit, à 0,8 s d'écart
const vus = []
for (let k = 0; k < 3; k++) {
  await page.mouse.click(p4.x, p4.y)
  await pause(800)
  const e = await etat(page)
  vus.push({ page: e.pages.indexOf(e.page) + 1, trieuse: e.ouverte, bouton: await pos() })
  if (e.ouverte) break
}
console.log(JSON.stringify(vus))
await page.screenshot({ path: D + '/precedente.png' })
verifier('Trois clics sur ‹ au même endroit mènent de la page 4 à la page 1', vus.length === 3 && vus[2].page === 1 && !vus.some(v => v.trieuse), vus)
await fin()
