// La version en un seul fichier (file://, dist/index.html), sans __app :
// tout à la souris et au clavier. Trieuse, copier en image, PDF.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { nav, verifier, pause, fin, surveiller, D } from './lib.mjs'
import { execSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
const page = await ctx.newPage()
surveiller(page, 'file')
await page.goto(`file://${RACINE_DEPOT}/dist/index.html`)
await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
await pause(800)
verifier('file:// : contexte sûr (presse-papiers possible)', await page.evaluate(() => window.isSecureContext && !!navigator.clipboard?.write))
const z = await page.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left, y: r.top, l: r.width, h: r.height } })
// Le Stylo (P), trois traits
await page.keyboard.press('p')
for (let k = 0; k < 3; k++) {
  await page.mouse.move(z.x + 300, z.y + 150 + k * 60); await page.mouse.down()
  for (let i = 1; i <= 20; i++) await page.mouse.move(z.x + 300 + i * 15, z.y + 150 + k * 60 + Math.sin(i / 2) * 10)
  await page.mouse.up(); await pause(80)
}
// Une seconde page par « Nouvelle page », un trait
await page.locator('button[aria-label="Nouvelle page"]').click(); await pause(400)
await page.mouse.move(z.x + 400, z.y + 300); await page.mouse.down()
for (let i = 1; i <= 20; i++) await page.mouse.move(z.x + 400 + i * 10, z.y + 300 + i * 4)
await page.mouse.up(); await pause(300)
verifier('Deux pages (« 2 / 2 »)', (await page.locator('.rang').textContent()).startsWith('2 / 2'))
// Copier la page en image : le menu de la page (clic droit dans le vide)
await page.mouse.click(z.x + 900, z.y + 500, { button: 'right' }); await pause(200)
await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Copier la page en image' }).click()
await pause(1500)
const toast = await page.evaluate(() => document.querySelector('.toast').textContent)
const img = await page.evaluate(async () => {
  try { const items = await navigator.clipboard.read(); for (const it of items) if (it.types.includes('image/png')) { const b = await it.getType('image/png'); const bm = await createImageBitmap(b); return { l: bm.width, h: bm.height, o: b.size } } return { types: items.map(i => i.types) } } catch (e) { return { err: String(e) } }
})
verifier('file:// : « Copier la page en image » met un PNG dans le presse-papiers, le message le dit', img.l > 100 && /Image copiée/.test(toast), { img, toast })
// Exporter en PDF : Ctrl + P → la fenêtre → Exporter
await page.keyboard.press('Control+p'); await pause(300)
const dl = page.waitForEvent('download', { timeout: 20000 })
await page.locator('dialog[open] button', { hasText: 'Exporter' }).click()
const d = await dl
const chemin = D + '/fichier-unique.pdf'
await d.saveAs(chemin)
const info = execSync(`pdfinfo "${chemin}"`).toString()
// La page 2 porte un trait 2,5 fois plus large que haut : une feuille A4 en
// paysage (mis à jour au contrôle final : la sonde attendait le portrait)
verifier(`file:// : Ctrl + P → Exporter : un PDF « ${d.suggestedFilename()} », A4 en paysage (le contenu est nettement plus large que haut)`, /Page size:\s+841\.\d+ x 595\.\d+/.test(info) && /Pages:\s+1/.test(info), info)
// La trieuse (Maj + P), ses vignettes peintes
await page.keyboard.press('Shift+P'); await pause(1200)
const v = await page.evaluate(() => [...document.querySelectorAll('.trieuse .carte canvas')].map(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let k = 0; k < d.length; k += 16) if (d[k] < 120) n++; return n }))
// Retouches après le lot 5 : le trait est Fin par défaut (2,5 et non plus 4,5) ;
// le trait court de la page 2 laisse moins d'encre dans sa vignette (14 points
// sondés au lieu d'une trentaine) : le seuil passe de 20 à 5 (une vignette vide : 0)
verifier('file:// : la trieuse, deux vignettes peintes (de l\'encre)', v.length === 2 && v.every(n => n > 5), v)
await page.screenshot({ path: D + '/fichier-unique-trieuse.png' })
// Le menu ⋯ : Exporter le classeur en PDF
await page.keyboard.press('Escape'); await pause(200)
await ctx.close()
await fin()
