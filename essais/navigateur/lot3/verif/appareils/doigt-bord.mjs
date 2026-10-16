// Au doigt : tirer une page (poignée, appui long) jusqu'au bord bas de la
// grille, qui défile seule ; le lâcher plus loin.
import { ouvrir, preparer, etat, carte, centre, attendreOuverte, verifier, pause, fin, doigtCDP } from './lib.mjs'

for (const mode of ['poignée', 'appui long']) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, mode)
  const cdp = await ctx.newCDPSession(page)
  const doigt = doigtCDP(cdp)
  const P = await preparer(page, 40, { ici: 0 })
  const r = await centre(page, '.rang')
  await page.touchscreen.tap(r.x, r.y); await attendreOuverte(page); await pause(400)
  const g = await centre(page, '.trieuse-grille')
  let de
  if (mode === 'poignée') de = await page.evaluate(() => { const p = document.querySelector('.trieuse .carte .carte-poignee').getBoundingClientRect(); return { x: p.left + p.width / 2, y: p.top + p.height / 2 } })
  else de = await carte(page, 0)
  await doigt('touchStart', [[de.x, de.y]]); await pause(mode === 'poignée' ? 30 : 650)
  for (let k = 1; k <= 12; k++) { await doigt('touchMove', [[de.x, de.y + (g.bottom - 10 - de.y) * k / 12]]); await pause(16) }
  // le doigt reste près du bord, en bougeant à peine
  for (let k = 0; k < 40; k++) { await doigt('touchMove', [[de.x + (k % 2), g.bottom - 10]]); await pause(30) }
  const d1 = (await etat(page)).defilement
  for (let k = 1; k <= 8; k++) { await doigt('touchMove', [[de.x, g.bottom - 10 - (g.bottom - 10 - (g.top + g.bottom) / 2) * k / 8]]); await pause(16) }
  await pause(100)
  await doigt('touchEnd', []); await pause(400)
  const e = await etat(page)
  const k = e.pages.indexOf(P[0])
  verifier(`Doigt (${mode}) : la grille défile seule près du bord bas (${d1} px), la page 1 arrive plus loin (page ${k + 1}), la trieuse reste`, d1 > 150 && k > 8 && e.ouverte && !e.fantome, { d1, k, ouverte: e.ouverte })
  await ctx.close()
}
await fin()
