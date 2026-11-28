// ESSAI : l'encre reste sous le stylet quand une calculatrice NumWorks est
// sur la page (avec une image importée, comme en classe).
// La calculatrice prend le clavier dès qu'elle paraît (la vraie le fait, la
// page d'essai aussi). Quand elle dépasse du bas de l'écran, le navigateur
// faisait défiler la zone du tableau pour la montrer : tout le tableau
// remontait, et l'encre paraissait au-dessus du stylet.
// A. Une image importée, une calculatrice installée, glissée par sa bande
//    jusqu'à dépasser du bas de l'écran, remise à zéro (↺ : elle reprend le
//    clavier) : la zone du tableau n'a pas défilé ;
// B. au Stylo, un trait : il s'écrit là où passe le pointeur (dans les
//    formes, et peint sur la scène sous le pointeur) ;
// C. aucune erreur.
// Le serveur de développement (port 5173), écran 1366 × 657.
import { chromium } from '../commun/playwright.mjs'
import { join } from 'node:path'
import { RACINE_DEPOT as RACINE } from '../commun/racines.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
// NUMWORKS_LYCEE : le vrai fichier de NumWorks, s'il est donné (sinon la page d'essai)
const EMU = process.env.NUMWORKS_LYCEE ?? join(RACINE, 'essais/navigateur/lot14/emulateur-d-essai.html')
// Une image de 40 × 40, toute rouge
const PNG = { name: 'carre.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAAoCAIAAAADnC86AAAAMklEQVR42u3NMQEAAAgDoK1/6JnB1wMKUMkdq4lFi8VisVgsFovFYrFYLBaLxWKxWCz+GD+3+VMAgwQBUQAAAABJRU5ErkJggg==', 'base64') }
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 657 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
await p.goto(DEV)
await p.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
await p.waitForTimeout(1200)
await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
await p.waitForTimeout(300)

const defile = () => p.evaluate(() => { const z = document.getElementById('zone'); return { haut: z.scrollTop, gauche: z.scrollLeft } })

// A. L'image, puis la calculatrice
await p.locator('input[type=file][accept*="image"]').first().setInputFiles(PNG)
await p.waitForTimeout(800)
await p.locator('button.outils-classe').click(); await p.waitForTimeout(200)
await p.locator('.menu-outils-classe .menu-item:has-text("NumWorks lycée")').first().click()
await p.waitForSelector('dialog.dialogue-calculatrice[open]', { timeout: 10000 })
await p.locator('.calculatrice-case').nth(0).locator('input[type=file]').setInputFiles(EMU)
await p.waitForFunction(() => document.querySelectorAll('.calculatrice-case')[0]?.classList.contains('installee'), null, { timeout: 10000 })
await p.locator('dialog.dialogue-calculatrice [data-a="fermer"]').click()
await p.waitForSelector('iframe.calculatrice-cadre', { timeout: 10000 })
await p.waitForTimeout(1200)
const images = await p.evaluate(() => window.__app.formes.filter(f => f.type === 'image').length)
// Glissée par son corps vers le bas : elle dépasse de l'écran
const r = await p.locator('.calculatrice-vivante').boundingBox()
await p.mouse.move(r.x + 8, r.y + r.height - 8); await p.mouse.down()
await p.mouse.move(r.x + 8, r.y + r.height + 332, { steps: 10 }); await p.mouse.up()
await p.waitForTimeout(400)
const r2 = await p.locator('.calculatrice-vivante').boundingBox()
// (la bande est sous l'étiquette de la séance : le clic part du bouton)
await p.locator('.calculatrice-bouton[aria-label^="Remettre"]').evaluate(b => b.click())
await p.waitForTimeout(1500)
const d = await defile()
ok(images === 2 && r2.y + r2.height > 657 && d.haut === 0 && d.gauche === 0,
  'A) Image + calculatrice qui dépasse du bas, remise à zéro : la zone du tableau n\'a pas défilé', { images, r2, d })

// B. Un trait au Stylo, loin de la calculatrice
await p.mouse.click(1250, 200); await p.keyboard.press('p')
await p.mouse.move(1150, 300); await p.mouse.down()
await p.mouse.move(1250, 300, { steps: 8 }); await p.mouse.up()
await p.waitForTimeout(500)
const b = await p.evaluate(() => {
  const a = window.__app, t = a.formes.find(f => f.type === 'trait')
  const z = document.getElementById('zone').getBoundingClientRect()
  const attendu = a.cam.versMonde(1200 - z.left, 300 - z.top)
  // L'encre peinte sur la scène, sous le pointeur (au milieu du trait)
  const cv = document.querySelector('.couche-scene'), rc = cv.getBoundingClientRect(), k = cv.width / rc.width
  const px = cv.getContext('2d').getImageData(Math.round((1200 - rc.left) * k), Math.round((300 - rc.top) * k) - 3, 1, 7).data
  let encre = false
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 128 && px[i] < 100 && px[i + 1] < 100 && px[i + 2] < 100) encre = true
  return { t: t ? { y: t.y + t.pts[1] } : null, attendu, encre, haut: document.getElementById('zone').scrollTop }
})
ok(b.t && Math.abs(b.t.y - b.attendu.y) < 1 && b.encre && b.haut === 0, 'B) Le trait s\'écrit sous le pointeur, et s\'y voit', b)

ok(erreurs.length === 0, 'C) Aucune erreur', erreurs)
await ctx.close()
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
