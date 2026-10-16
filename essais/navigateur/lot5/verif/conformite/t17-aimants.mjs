// Point 1 : les aimants de la pastille (2° reste 2°, 43° → 45°, Maj : 15°), Maj + coin et côtés d'une image, mesure affichée.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p } = await O.ouvrir(ctx, 'aimants')
await p.evaluate(O.IMAGES); await p.evaluate(O.PAGE_NEUVE)
const I = await O.poser(p, O.image('vert', 300, 250, 240, 160))
const choisir = ids => p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.options = null; a.rendu.redessinerDirect(); a.ui.maj() }, ids)
const cadre = () => p.evaluate(() => { const c = window.__app.cadreDeLaSelection(); return c && { coins: c.coins, centre: c.centre, pastille: c.pastille } })
const angle = f => Math.round(Math.atan2(f.m[1], f.m[0]) * 180 / Math.PI * 100) / 100
async function tourner(deg, maj = false) {
  await choisir([I]); await p.waitForTimeout(60)
  const c = await cadre()
  const cen = await O.ecran(p, c.centre.x, c.centre.y), pa = await O.ecran(p, c.pastille.x, c.pastille.y)
  const R = Math.hypot(pa.x - cen.x, pa.y - cen.y), a0 = Math.atan2(pa.y - cen.y, pa.x - cen.x)
  if (maj) await p.keyboard.down('Shift')
  await p.mouse.move(pa.x, pa.y); await p.mouse.down()
  const R2 = R + 30
  for (let k = 1; k <= 3; k++) await p.mouse.move(cen.x + (R + 10 * k) * Math.cos(a0), cen.y + (R + 10 * k) * Math.sin(a0))
  for (let k = 1; k <= 12; k++) { const a = a0 + deg * Math.PI / 180 * k / 12; await p.mouse.move(cen.x + R2 * Math.cos(a), cen.y + R2 * Math.sin(a)) }
  await p.waitForTimeout(60)
  const texte = await p.evaluate(() => { const r = window.__app.rendu; return r.transfo?.texte ?? r.mesure ?? null })
  await p.mouse.up(); if (maj) await p.keyboard.up('Shift'); await p.waitForTimeout(120)
  const f = await O.forme(p, I)
  const a = angle(f)
  if (a !== 0) { await p.keyboard.press('Control+z'); await p.waitForTimeout(100) }
  return { a, texte }
}
for (const [d, maj] of [[2, false], [43, false], [-88, false], [20, true], [8, true], [-1.5, false]]) note(`tourner de ${d}°${maj ? ' avec Maj' : ''}`, await tourner(d, maj))
// Coin de l'image tiré en biais : proportions gardées ; avec Maj : libres ; côté : un axe
async function tirer(i, dx, dy, maj = false, cote = false) {
  await choisir([I]); await p.waitForTimeout(60)
  const c = await p.evaluate(() => window.__app.cadreDeLaSelection())
  const pts = cote ? [{ x: (c.coins[1].x + c.coins[2].x) / 2, y: (c.coins[1].y + c.coins[2].y) / 2 }] : c.coins
  const a = await O.ecran(p, pts[i].x, pts[i].y)
  if (maj) await p.keyboard.down('Shift')
  await O.glisserEcran(p, a, { x: a.x + dx, y: a.y + dy }, 10)
  if (maj) await p.keyboard.up('Shift')
  const f = await O.forme(p, I)
  if (f.m[0] !== 4 || f.m[3] !== 4) { await p.keyboard.press('Control+z'); await p.waitForTimeout(100) }
  return { kx: Math.round(f.m[0] * 60 / 240 * 100) / 100, ky: Math.round(f.m[3] * 40 / 160 * 100) / 100 }
}
note('coin bas droit tiré (+120, +10)', await tirer(2, 120, 10))
note('… avec Maj', await tirer(2, 120, 10, true))
note('côté droit tiré (+120, 0)', await tirer(0, 120, 0, false, true))
await O.fin()
