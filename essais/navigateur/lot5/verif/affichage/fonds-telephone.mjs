// Le menu des fonds au téléphone (Plus → Fond…), en portrait et en paysage : captures, tient dans l'écran
import { writeFileSync } from 'node:fs'
import { lancer, contexte, pret, DEV, OUT, ok, fin, suivre } from './lib/commun.mjs'
const nav = await lancer()
for (const [w, h] of [[360, 740], [740, 360], [320, 568]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const p = await ctx.newPage(); suivre(p, `tel ${w}x${h}`); await p.goto(DEV); await pret(p); await p.waitForTimeout(1000)
  await p.locator('.barre button[aria-label^="Plus"]:visible, .barre button[title^="Plus"]:visible').first().tap(); await p.waitForTimeout(300)
  await p.locator('.menu-item:visible', { hasText: 'Fond…' }).first().tap(); await p.waitForTimeout(400)
  const m = await p.evaluate(() => {
    const m = document.querySelector('.menu-fonds'), r = m?.getBoundingClientRect()
    const e = [...(m?.querySelectorAll('.fond-choix') ?? [])].map(x => x.getBoundingClientRect())
    return m && { ouvert: !m.hidden, r: [r.left, r.top, r.right, r.bottom].map(Math.round), dedans: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, defile: m.scrollHeight > m.clientHeight + 1, petits: e.filter(x => x.height < 44 || x.width < 44).length, colonnes: new Set(e.map(x => Math.round(x.left))).size, n: e.length }
  })
  writeFileSync(`${OUT}/fonds-telephone-${w}x${h}.png`, await p.screenshot())
  ok(m && m.ouvert && m.dedans && !m.petits && m.n === 8, `${w} × ${h} : le menu des fonds (Plus → Fond…) tient dans l'écran, 8 vignettes de 44 px au moins`, m)
  await ctx.close()
}
await fin(nav)
