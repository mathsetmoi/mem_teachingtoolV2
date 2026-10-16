// Sonde : la barre des outils sur l'iPad Pro 12,9 pouces en paysage, noms allumés d'office
import { writeFileSync } from 'node:fs'
import { lancer, contexte, pret, DEV, OUT } from './lib/commun.mjs'
const nav = await lancer()
for (const [w, h] of [[1366, 1024], [1024, 1366]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2, screen: { width: w, height: h } })
  const p = await ctx.newPage(); await p.goto(DEV); await pret(p); await p.waitForTimeout(1200)
  const r = await p.evaluate(() => {
    const b = document.querySelector('.barre-outils'), rb = b.getBoundingClientRect()
    const bs = [...b.querySelectorAll('button')].filter(x => x.getClientRects().length && getComputedStyle(x).display !== 'none')
    const der = bs.at(-1), rd = der.getBoundingClientRect()
    return { body: document.body.className, barre: [rb.top, rb.bottom, rb.height], scrollH: b.scrollHeight, clientH: b.clientHeight, dernier: { nom: der.title || der.getAttribute('aria-label'), top: rd.top, bottom: rd.bottom }, coupe: Math.round(rd.bottom - (rb.bottom - parseFloat(getComputedStyle(b).paddingBottom) - parseFloat(getComputedStyle(b).borderBottomWidth))), overflow: getComputedStyle(b).overflowY }
  })
  console.log(w, h, JSON.stringify(r))
  writeFileSync(`${OUT}/ipad-${w}x${h}.png`, await p.screenshot({ clip: { x: 0, y: h - 260, width: 200, height: 260 } }))
  await ctx.close()
}
await nav.close()
