// CONFORMITÉ, point 2 : la carte du classeur ouvert, la bibliothèque restée
// ouverte : se met-elle à jour quand la fiche s'écrit (au plus 30 s après) ?
import * as O from './outils.mjs'
const { ok } = O
await O.lancer()
const g = new O.FauxGoogle()
const ctx = await O.contexte(g)
const p = await O.ouvrir(ctx, '', 'P', false)
await p.waitForTimeout(1500)
await p.evaluate(() => { window.__app.nouvellePage() })
await p.waitForTimeout(500)
await p.evaluate(() => { window.__app.nouvellePage(); window.__app.nouvellePage() })
await p.waitForTimeout(500)
await p.evaluate(() => window.__app.ui.ouvrirBibliotheque())
await p.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 })
const lire = () => p.evaluate(async () => {
  const id = window.__app.classeur.id
  const li = document.querySelector(`.grille-classeurs .case-classeur[data-id="${id}"]`)
  const f = await window.__registre.classeur(id)
  return { carte: li?.querySelector('.carte-date')?.textContent.replace(/[  ]/g, ' '), fiche: f.pages, pages: window.__app.pages.length }
})
const suite = []
for (let s = 0; s <= 40; s += 5) { suite.push({ s, ...(await lire()) }); await p.waitForTimeout(5000) }
console.log(suite.map(x => JSON.stringify(x)).join('\n'))
const fin = suite.at(-1)
ok(fin.fiche === fin.pages, `40 s après, la fiche dit ${fin.fiche} pages (le classeur en a ${fin.pages})`)
ok(new RegExp(`· ${fin.pages} pages?$`).test(fin.carte), `40 s après, la bibliothèque restée ouverte : « ${fin.carte} »`, fin)
await O.navigateur.close()
