// Insérer une page avant / après : le fond ; « Exporter en PDF… » d'une vignette vide
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
const ids = await preparer(page, 2, { ici: 0 })
await page.evaluate(id => window.__app.tableau.changerFond(id, 'seyes'), ids[1])
await page.keyboard.press('Shift+P'); await pause(600)
// Menu de la vignette 2 (Seyès) : Insérer une page après
await page.locator('.trieuse .carte').nth(1).locator('.carte-options').click(); await pause(200)
const entrees = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette > *')].map(c => c.textContent))
console.log('menu', entrees)
await page.locator('.trieuse .menu-vignette .menu-item', { hasText: 'Insérer une page après' }).click(); await pause(700)
// Depuis les corrections « conformite », le fond se choisit en second temps
// dans le même menu, celui de la voisine coché (et sous le focus : Entrée le prend) ;
// depuis les retouches d'après le lot 5, la page blanche cochée (toute page
// neuve est blanche), le fond de la voisine dit « Celui de la page 2 »
const coche = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette [role="menuitemradio"]')].filter(b => b.getAttribute('aria-checked') === 'true').map(b => b.textContent.trim()))
const voisine = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette [role="menuitemradio"]')].find(b => /Seyès/.test(b.textContent))?.querySelector('small')?.textContent ?? null)
verifier('« Insérer une page après… » propose les fonds, la page blanche cochée, celui de la voisine (Seyès) dit', coche.length === 1 && /Page blanche/.test(coche[0]) && voisine === 'Celui de la page 2', { coche, voisine })
await page.keyboard.press('Enter'); await pause(300)
let e = await etat(page)
const fonds = await page.evaluate(() => window.__app.pages.map(p => window.__app.tableau.fondDe(p)))
console.log('après insertion', e.msgs.at(-1), fonds, 'menu ouvert ?', e.menu)
verifier('La page insérée (Entrée) est blanche, sa voisine garde le sien', fonds[2] === 'blanc' && fonds[1] === 'seyes', fonds)
// Le menu de la nouvelle page (vide) : Copier en image grisé ; Exporter en PDF… ?
await page.locator('.trieuse .carte').nth(2).locator('.carte-options').click(); await pause(200)
const vide = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette .menu-item')].map(c => (c.querySelector('.libelle')?.firstChild?.textContent ?? '') + (c.getAttribute('aria-disabled') ? ' (grisé)' : '')))
console.log('menu d\'une page vide', vide)
// Depuis les corrections « conformite » : sur une page vide, Copier en image
// et Exporter en PDF… sont grisés, comme à l’écran
verifier('Le menu de la page insérée (vide) : « Copier en image » et « Exporter en PDF… » grisés', vide.some(x => /^Copier en image.*\(grisé\)$/.test(x)) && vide.some(x => /^Exporter en PDF.*\(grisé\)$/.test(x)), vide)
await page.locator('.trieuse .menu-vignette .menu-item', { hasText: 'Exporter en PDF' }).click({ force: true }); await pause(300)
verifier('… un clic sur « Exporter en PDF… » grisé n\'ouvre pas de fenêtre', !(await page.evaluate(() => !!document.querySelector('dialog[open]'))))
await page.keyboard.press('Escape'); await pause(200)
await fin()
