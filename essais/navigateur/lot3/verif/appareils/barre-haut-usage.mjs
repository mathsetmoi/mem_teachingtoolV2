// Avancer de page en page en touchant « › » au même endroit, quand une page a un nom
import { ouvrir, preparer, etat, centre, verifier, pause, fin } from './lib.mjs'
{
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'tablette')
  const P = await preparer(page, 5, { ici: 0, noms: { 2: 'Exercice 12 p. 84' } })
  await pause(1300)
  const b = await centre(page, '[data-mode]')
  const suite = []
  for (let k = 0; k < 4; k++) {
    await page.touchscreen.tap(b.x, b.y); await pause(1000)
    const e = await etat(page)
    suite.push(e.ouverte ? 'trieuse ouverte' : `page ${e.pages.indexOf(e.page) + 1}`)
    if (e.ouverte) break
  }
  verifier('Tablette 1024 au doigt : quatre touchers sur « › » au même endroit, une seconde d\'écart, mènent de la page 1 à la page 5', suite.join(',') === 'page 2,page 3,page 4,page 5', suite)
  await ctx.close()
}
{
  const { ctx, page } = await ouvrir({ viewport: { width: 1366, height: 768 } }, 'portable')
  const P = await preparer(page, 4, { ici: 3, noms: { 3: 'Exercice 12 p. 84' } })
  await pause(1300)
  const b = await centre(page, 'button[aria-label^="Page précédente"]')
  const suite = []
  for (let k = 0; k < 3; k++) {
    await page.mouse.click(b.x, b.y); await pause(1000)
    const e = await etat(page)
    suite.push(e.ouverte ? 'trieuse ouverte' : `page ${e.pages.indexOf(e.page) + 1}`)
    if (e.ouverte) break
  }
  verifier('Portable 1366 à la souris : trois clics sur « ‹ » au même endroit depuis la page 4 (nommée) mènent à la page 1', suite.join(',') === 'page 3,page 2,page 1', suite)
  await ctx.close()
}
await fin()
