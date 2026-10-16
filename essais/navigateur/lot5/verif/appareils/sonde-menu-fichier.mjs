// Sonde : le menu ⋯ de la barre du haut, lot 5 (serveur de développement ;
// rangé dans le dépôt, la version d'avant comparée est retirée), à 1366 × 768,
// 1280 × 720 et 1024 × 768 : ses entrées se tassent-elles ?
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
const S = `${RACINE_ESSAIS}`
const nav = await chromium.launch()
const MESURER = () => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(m => !m.hidden && m.offsetWidth)
  if (!m) return null
  const b = m.getBoundingClientRect(), r = []
  for (const i of m.querySelectorAll('.menu-item')) {
    if (!i.offsetWidth) continue
    const ib = i.getBoundingClientRect()
    let bas = ib.top
    for (const c of i.querySelectorAll('*')) { const cb = c.getBoundingClientRect(); if (cb.height) bas = Math.max(bas, cb.bottom) }
    r.push({ t: (i.querySelector('.libelle')?.textContent || i.textContent).trim().slice(0, 32), h: Math.round(ib.height), contenu: Math.round(bas - ib.top), deborde: Math.round(bas - ib.bottom) })
  }
  return { boite: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)], hauteurMax: getComputedStyle(m).maxHeight, defile: m.scrollHeight > m.clientHeight + 1, entrees: r.filter(x => x.deborde > 3) , n: r.length }
}
for (const [nom, url] of [['lot 5', 'http://localhost:5173/']]) {
  for (const [l, h] of [[1366, 768], [1280, 720], [1024, 768]]) {
    const ctx = await nav.newContext({ viewport: { width: l, height: h } })
    const p = await ctx.newPage()
    await p.goto(url); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
    await p.waitForTimeout(800)
    await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^(Enregistrer|Fichier|Classeur|Plus)/.test(b.title || '') && b.getAttribute('aria-haspopup')); (b ?? [...document.querySelectorAll('button')].filter(b => b.offsetWidth && b.getAttribute('aria-haspopup')).at(-1)).click() })
    await p.waitForTimeout(400)
    const r = await p.evaluate(MESURER)
    console.log(nom, `${l}×${h}`, JSON.stringify(r))
    await p.screenshot({ path: `${S}/lot5/verif/appareils/captures/menu-fichier-${nom.replace(' ', '')}-${l}x${h}.png` })
    await ctx.close()
  }
}
await nav.close()
