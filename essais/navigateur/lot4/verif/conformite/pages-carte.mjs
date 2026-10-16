// CONFORMITÉ, point 2 : la carte du classeur ouvert dit-elle son nombre de
// pages et sa date de modification justes, quand on ouvre la bibliothèque
// juste après un changement ?
import * as O from './outils.mjs'
const { ok, norm } = O
const ICI = new URL('.', import.meta.url).pathname
await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'P', false)
const carte = async () => {
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
  await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
  await p.waitForTimeout(600)
  const r = await p.evaluate(() => {
    const id = window.__app.classeur.id
    const li = document.querySelector(`.grille-classeurs .case-classeur[data-id="${id}"]`)
    return { infos: li?.querySelector('.carte-date')?.textContent.replace(/[  ]/g, ' '), pages: window.__app.pages.length, heure: new Date().toTimeString().slice(0, 5) }
  })
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  return r
}
let c = await carte()
console.log('au départ :', JSON.stringify(c))
// Une page de plus, puis la bibliothèque aussitôt (5 s après)
await p.evaluate(() => window.__app.nouvellePage())
await p.waitForTimeout(5000)
c = await carte()
console.log('une page ajoutée :', JSON.stringify(c))
ok(new RegExp(`· ${c.pages} pages?$`).test(c.infos), `une page ajoutée, la bibliothèque ouverte 5 s après : la carte dit « ${c.infos} », le classeur a ${c.pages} pages`, c)
// Deux de plus, puis une supprimée
await p.evaluate(() => { window.__app.nouvellePage(); window.__app.nouvellePage() })
await p.waitForTimeout(700)
await p.click('.barre-haut button[aria-label="Supprimer cette page"]')
await p.waitForTimeout(2000)
c = await carte()
console.log('trois de plus, une jetée :', JSON.stringify(c))
ok(new RegExp(`· ${c.pages} pages?$`).test(c.infos), `… puis deux pages de plus et une jetée, 2 s après : la carte dit « ${c.infos} », le classeur a ${c.pages} pages`, c)
await p.screenshot({ path: ICI + 'captures/pages-carte.png' })
await O.navigateur.close()
