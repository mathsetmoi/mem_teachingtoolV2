// La barre d'actions et un petit menu ouvert en même temps (menu de la page, zoom)
import { contexte, charger, etat, barre, boiteEcran, outil, poser, verifier, note, fin } from './lib.mjs'
const ctx = await contexte()
const { page } = await charger(ctx, 'superpose')
const m = page.mouse
await outil(page, 'selection')
await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
const T = await poser(page, { type: 'trait', x: 500, y: 400, l: 200 })
const b = await boiteEcran(page, T)
await m.click((b.left + b.right) / 2, (b.top + b.bottom) / 2)
const br = await barre(page)
note('barre', br.rect)
// clic droit dans le vide, à gauche de la barre, à sa hauteur
await m.click(br.rect.left - 60, br.rect.top + 5, { button: 'right' })
await page.waitForTimeout(80)
const e = await etat(page)
const info = await page.evaluate(() => {
  const menu = document.querySelector('.menu-flottant[aria-label="Page"]')
  const r = menu.getBoundingClientRect()
  const items = [...menu.querySelectorAll('.menu-item')].map(i => { const q = i.getBoundingClientRect(); const pts = [[q.left + 10, q.top + q.height / 2], [q.left + q.width / 2, q.top + q.height / 2], [q.right - 10, q.top + q.height / 2]]; return { t: i.textContent.slice(0, 18), dessus: pts.map(([x, y]) => { const el = document.elementFromPoint(x, y); return el?.closest('.barre-actions') ? 'BARRE' : el?.closest('.menu-flottant') ? 'menu' : el?.tagName }) } })
  const ba = document.querySelector('.barre-actions')
  return { menu: { left: r.left, top: r.top, right: r.right, bottom: r.bottom }, items, zMenu: getComputedStyle(menu).zIndex, zBarre: getComputedStyle(ba).zIndex, barreVisible: !ba.hidden }
})
note('menu', info)
await page.screenshot({ path: new URL('./superpose.png', import.meta.url).pathname })
verifier('menu de la page ouvert : la barre d\'actions ne le recouvre pas', !info.items.some(i => i.dessus.includes('BARRE')), info)
verifier('un seul menu à la fois : la barre se cache quand le menu de la page est ouvert', !e.barre || !e.menuPage, { barre: e.barre, menuPage: e.menuPage })
await fin()
