import { O, dort, pret, lancer, serveur, attendreServeur, M } from './commun.mjs'
import { mkdirSync, mkdtempSync } from 'node:fs'
const srv = serveur(); await attendreServeur()
const ctx = await lancer(mkdtempSync(M + 'profils/m12b-'))
const p = await ctx.newPage()
await p.goto(O + '/nouveau-dev/index.html'); await pret(p); await dort(1500)
const trait = async i => { await p.mouse.move(300, 300 + i * 50); await p.mouse.down(); for (let k = 1; k < 10; k++) await p.mouse.move(300 + k * 15, 300 + i * 50 + k); await p.mouse.up(); await dort(300) }
const etat = async l => console.log(l, await p.evaluate(() => ({ n: window.__app.tableau.formesDe(window.__app.page).size, peut: window.__app.tableau.peutAnnuler(window.__app.page), focus: document.activeElement?.className || document.activeElement?.tagName })))
for (let i = 0; i < 3; i++) await trait(i)
await etat('3 traits')
await p.keyboard.press('Control+z'); await dort(300); await etat('Ctrl+Z sans bibliothèque')
await trait(5); await etat('un trait de plus')
await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque', { state: 'visible' }); await dort(500)
await p.keyboard.press('Escape'); await dort(400); await etat('bibliothèque fermée par Échap')
await p.keyboard.press('Control+z'); await dort(300); await etat('Ctrl+Z après la bibliothèque')
await p.mouse.click(1000, 650); await dort(600); await etat('clic sur le tableau')
await p.keyboard.press('Control+z'); await dort(300); await etat('Ctrl+Z après un clic')
await ctx.close(); srv.kill()
