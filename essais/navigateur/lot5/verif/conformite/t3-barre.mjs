// La barre des outils à 1366 × 768 : défile-t-elle ?
// (Rangé dans le dépôt : la comparaison avec la version d'avant le lot 5, construite
// depuis un commit qui n'existe plus, est retirée.)
import * as O from './lib/outils.mjs'
const { note, C, S } = O
for (const [nom, url] of [['lot5', O.DEV]]) {
  const ctx = await O.contexte()
  const p = await ctx.newPage()
  await p.goto(url); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
  note(nom, await p.evaluate(() => { const b = document.querySelector('.barre-outils'); const r = b.getBoundingClientRect(); return { h: r.height, top: r.top, sh: b.scrollHeight, ch: b.clientHeight, n: [...b.querySelectorAll('button')].filter(x => x.offsetParent).length, boutons: [...b.querySelectorAll('button')].filter(x => x.offsetParent).map(x => (x.title || x.getAttribute('aria-label') || '').slice(0, 14) + '@' + Math.round(x.getBoundingClientRect().top)) } }))
  await p.screenshot({ path: C + `/captures/t3-${nom}.png` })
  await ctx.close()
}
await O.fin()
