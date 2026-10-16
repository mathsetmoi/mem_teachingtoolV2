// Exporter en PDF : fenêtre, nom du fichier, A4, page vide, page haute, messages
import { ouvrir, etat, verifier, fin, pause, D } from './lib.mjs'
import { execSync } from 'node:child_process'

const { page } = await ouvrir({ acceptDownloads: true })
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  const trait = (id, x, y, l = 400) => { t.nouveauGeste(); const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, Math.sin(i / 2) * 20, 0.5); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) }
  trait('a1', 100, 100); trait('a2', 100, 200)
  t.renommerPage(a.page, 'Exercice 12 p. 84')
  a.nouvellePage()                      // page 2 vide
  a.nouvellePage()                      // page 3 haute
  for (let k = 0; k < 40; k++) trait('h' + k, 100, 100 + k * 90)
  a.allerPage(a.pages[0])
})
await pause(1500)
// Menu de la page : clic droit dans le vide
await page.mouse.click(900, 600, { button: 'right' }); await pause(300)
const menu = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => [...m.children].map(c => c.tagName === 'HR' ? '─' : c.querySelector('.libelle')?.firstChild?.textContent + (c.getAttribute('aria-disabled') ? ' (grisé)' : '') + (c.querySelector('.touche') ? ' [' + c.querySelector('.touche').textContent + ']' : ''))))
console.log('menu de la page', JSON.stringify(menu))
await page.locator('.menu-flottant .menu-item', { hasText: 'Exporter la page en PDF' }).click(); await pause(300)
const fen = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { txt: d.innerText, focus: document.activeElement?.textContent, case: d.querySelector('input[type=checkbox]')?.checked } : null })
console.log('fenêtre', fen)
await page.screenshot({ path: D + '/fenetre-pdf.png' })
let dl = page.waitForEvent('download')
await page.keyboard.press('Enter')
let f = await dl
const nom1 = f.suggestedFilename()
await f.saveAs(D + '/page1.pdf')
await pause(500)
let e = await etat(page)
console.log('fichier', nom1, 'messages', e.msgs.slice(-4))
console.log(execSync(`pdfinfo "${D}/page1.pdf" | grep -E "Pages|Page size|Title"`).toString())
execSync(`pdftoppm -r 60 -png "${D}/page1.pdf" "${D}/page1"`)
verifier('Nom du fichier : le nom de la page', nom1 === 'Exercice 12 p. 84.pdf', nom1)

// Tout le classeur par le menu ⋯
await page.locator('.barre-haut button[aria-label*="Plus"], .barre-haut button[title*="Enregistrer"]').first().click().catch(() => {})
await pause(300)
const menuFichier = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => m.innerText))
console.log('menu ⋯', menuFichier)
await page.locator('.menu-flottant:not([hidden]) .menu-item[data-action="exporter-pdf"]').click(); await pause(300)
const fen2 = await page.evaluate(() => document.querySelector('dialog[open]')?.innerText)
console.log('fenêtre 2', fen2)
dl = page.waitForEvent('download')
const t0 = Date.now()
await page.locator('dialog[open] button', { hasText: 'Exporter' }).click()
const msgs = []
const suivi = setInterval(async () => { try { msgs.push(await page.evaluate(() => document.querySelector('.toast')?.innerText)) } catch {} }, 150)
f = await dl
clearInterval(suivi)
const nom2 = f.suggestedFilename()
await f.saveAs(D + '/tout.pdf')
await pause(500)
e = await etat(page)
console.log('fichier', nom2, Date.now() - t0, 'ms ; messages', [...new Set(msgs)], e.msgs.slice(-5))
console.log(execSync(`pdfinfo "${D}/tout.pdf" | grep -E "Pages|Page size|Title"`).toString())
console.log(execSync(`pdfimages -list "${D}/tout.pdf" | head -12`).toString())
execSync(`pdftoppm -r 50 -png "${D}/tout.pdf" "${D}/tout"`)
// La date du jour (l'essai l'avait écrite en dur, le 9 octobre 2026)
const AUJOURDHUI = (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`)(new Date())
// Lot 4 : le PDF de tout le classeur porte son nom
const nomC = await page.evaluate(() => window.__app.classeur.nom)
verifier(`Nom « ${nomC} ${AUJOURDHUI}.pdf »`, nom2 === `${nomC} ${AUJOURDHUI}.pdf`, nom2)
await fin()
