// Le classeur qui revient au démarrage, après un coup d'œil à un autre classeur dans un autre onglet
// (Ctrl + clic, puis l'onglet fermé), en continuant d'écrire dans le premier.
import { lancer, contexte, ouvrir, info, ok, dort, creerPlusieurs, ecrireTraits, pret, DEV } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx, '', 'dernier')
const [x] = await creerPlusieurs(p, 1, { noms: ['Année dernière : Symétrie'] })
const ici = await p.evaluate(() => window.__app.classeur.nom)
await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
await p.click(`.grille-classeurs.tous li[data-cle="${x}"] .carte-apercu`, { modifiers: ['Control'] }); await dort(2500)
const autre = ctx.pages()[1]
info('l\'autre onglet', await autre.evaluate(() => document.querySelector('.nom-classeur')?.textContent))
await autre.close()
await p.keyboard.press('Escape'); await dort(300)
await ecrireTraits(p, 5); await dort(1500)
// Le lendemain : l'adresse sans rien
await p.goto(DEV); await pret(p); await dort(500)
const n = await p.evaluate(() => window.__app.classeur.nom)
info('au démarrage suivant', { travaille: ici, rouvert: n })
await nav.close()
