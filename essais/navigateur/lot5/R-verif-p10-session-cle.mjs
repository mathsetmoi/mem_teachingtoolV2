// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : la session en file:// : dix rechargements.
// Copie de retouches/verif/regressions/p10-session-cle.mjs ; autonome.
// Sonde 10 : la session en file:// (la clé USB, dist/index.html), sans aucun
// script d'initialisation : page 2, déplacée et zoomée à la main, puis dix
// rechargements de suite : la page 2 revient chaque fois, au même centre, à
// 100 %. Sans window.__app : le centre se lit par la position d'un trait
// repère à l'écran (sa boîte d'encre dans la scène).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
const UN = `file://${RACINE_DEPOT}/dist/index.html`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 600) : '') }
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage()
const pret = async () => { await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 }); await p.waitForTimeout(700) }
await p.goto(UN); await pret()
const ENCRE = () => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, n = 0
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) { const i = (y * c.width + x) * 4; if (d[i + 3] > 120 && d[i] < 110 && d[i + 1] < 90 && d[i + 2] < 140) { n++; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y } }
  return n ? { x: Math.round(r.left + (x1 + x2) / 2 / k), y: Math.round(r.top + (y1 + y2) / 2 / k), n } : null
}
// « + » : la page 2 ; un trait repère ; zoom à 150 % (Ctrl + molette), puis on part et on revient
await p.locator('button[title="Nouvelle page"]').first().click(); await p.waitForTimeout(500)
await p.mouse.move(500, 300); await p.mouse.down(); for (let i = 1; i <= 8; i++) await p.mouse.move(500 + i * 10, 300); await p.mouse.up(); await p.waitForTimeout(300)
await p.mouse.move(800, 500)
await p.keyboard.down('Control'); for (let i = 0; i < 4; i++) { await p.mouse.wheel(0, -100); await p.waitForTimeout(60) } await p.keyboard.up('Control')
await p.waitForTimeout(500)
const zoomAvant = await p.evaluate(() => document.querySelector('.zoom-texte').textContent)
const avant = await p.evaluate(ENCRE); console.log("repère avant", avant)
const rang = () => p.evaluate(() => document.querySelector('.rang').textContent.replace(/\s/g, ''))
// Le centre de l'écran en monde, d'après le repère : à 150 %, le repère est ailleurs ; on le lira à 100 % après rechargement
const res = []
for (let k = 0; k < 10; k++) {
  await p.reload(); await pret()
  res.push({ rang: await rang(), zoom: (await p.evaluate(() => document.querySelector('.zoom-texte').textContent)).replace(/\s/g, ' '), repere: await p.evaluate(ENCRE) })
}
const premiers = res[0].repere
ok(res.every(r => r.rang.startsWith('2/2') && /^100/.test(r.zoom) && r.repere && Math.abs(r.repere.x - premiers.x) <= 1 && Math.abs(r.repere.y - premiers.y) <= 1),
  `file:// : dix rechargements (le zoom était ${zoomAvant}) : la page 2 revient, à 100 %, le repère au même endroit`, res)
await ctx.close(); await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'tout vert')
process.exit(echecs ? 1 : 0)
