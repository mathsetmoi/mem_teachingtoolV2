// Combien de vignettes se voient entières : portable, TNI 1920×1080, téléphone
import { ouvrir, preparer, verifier, fin, pause, D } from './lib.mjs'

for (const [l, h, nom, extra] of [[1366, 768, 'portable', {}], [1920, 1080, 'tni', {}], [1280, 800, 'portable2', {}], [390, 844, 'telephone', { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const { page, ctx } = await ouvrir({ viewport: { width: l, height: h }, ...extra })
  await preparer(page, 60, { ici: 0, noms: { 0: 'Exercice 12 p. 84 et exercice 13 p. 85 (correction)' } })
  await page.evaluate(() => window.__app.ui.ouvrirTrieuse(false))
  await pause(1200)
  const r = await page.evaluate(() => {
    const g = document.querySelector('.trieuse-grille').getBoundingClientRect()
    const cartes = [...document.querySelectorAll('.trieuse .carte')].map(c => c.getBoundingClientRect())
    const entieres = cartes.filter(c => c.top >= g.top - 1 && c.bottom <= g.bottom + 1).length
    const colonnes = new Set(cartes.map(c => Math.round(c.left))).size
    return { entieres, colonnes, carte: [Math.round(cartes[0].width), Math.round(cartes[0].height)] }
  })
  console.log(nom, l + '×' + h, r)
  await page.screenshot({ path: `${D}/grille-${nom}.png` })
  await ctx.close()
}
await fin()
