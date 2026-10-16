// La barre du haut d'une page sans nom à une page nommée : les boutons bougent-ils ?
import { ouvrir, preparer, verifier, fin, pause, D } from './lib.mjs'

const NOM = 'Exercice 12 p. 84'
for (const [l, h, extra] of [[1366, 768, {}], [1280, 800, {}], [1180, 820, { hasTouch: true }], [1024, 768, { hasTouch: true }], [820, 1180, { hasTouch: true }]]) {
  const { page, ctx } = await ouvrir({ viewport: { width: l, height: h }, ...extra })
  await preparer(page, 3, { ici: 0, noms: { 1: NOM } })
  await pause(300)
  const releve = () => page.evaluate(() => {
    const b = [...document.querySelectorAll('.barre-haut > *')].filter(x => x.offsetParent)
    return Object.fromEntries(b.map(x => [x.getAttribute('aria-label')?.slice(0, 18) ?? x.className, [Math.round(x.getBoundingClientRect().left), Math.round(x.getBoundingClientRect().top)]]))
  })
  const sans = await releve()
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[1]) })
  await pause(300)
  const avec = await releve()
  const bouges = Object.keys(sans).filter(k => avec[k] && (avec[k][0] !== sans[k][0] || avec[k][1] !== sans[k][1])).map(k => `${k}: ${sans[k]} → ${avec[k]}`)
  console.log(`${l}×${h}`, bouges)
  await page.screenshot({ path: `${D}/barre-nomcourt-${l}.png`, clip: { x: 0, y: 0, width: l, height: 130 } })
  await ctx.close()
}
await fin()
