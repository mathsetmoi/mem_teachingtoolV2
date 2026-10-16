// Vérification « données et replay » du lot 3 : un objet envoyé (déplacé) de
// la page 1 vers la page 2 ; la page 2 à la poubelle ; la corbeille vidée ;
// Ctrl+Z sur la page 1 (l'objet revient), puis Ctrl+Y (la touche) : où est
// l'objet ? Et après un rechargement ?
import { chromium } from '../../../commun/playwright.mjs'

const nav = await chromium.launch()
const net = t => (t ?? '').replace(/[  ]/g, ' ')
const erreurs = []
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const page = await ctx.newPage()
page.on('pageerror', e => erreurs.push(e.message))
async function pret() {
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(600)
  await page.evaluate(() => { const a = window.__app, m = a.ui.message.bind(a.ui); window.__msgs = []; a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) } })
}
await page.goto('http://localhost:5173/'); await pret()
const ETAT = () => {
  const a = window.__app, t = a.tableau
  const toutes = [...t.pages.keys()]
  return {
    ordre: a.pages.length, page: a.pages.indexOf(a.page) + 1,
    surLaPage1: [...t.formesDe(a.pages[0]).keys()],
    ou: toutes.filter(p => [...t.formesDe(p)?.values() ?? []].some(f => f.x === 300 && f.y === 300)).map(p => a.pages.includes(p) ? 'page ' + (a.pages.indexOf(p) + 1) : (t.corbeille.get(p)?.definitif ? 'page supprimée définitivement' : t.dansLaCorbeille(p) ? 'corbeille' : 'hors de tout')),
    corbeille: t.pagesDeLaCorbeille().length,
    msg: (window.__msgs || []).at(-1) ?? '',
  }
}
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id: 'x', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 30, 0.5, 140, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
  a.nouvellePage()
  a.allerPage(a.pages[0])
  a.choisirOutil('selection')
})
await page.waitForTimeout(500)
await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('x'); a.envoyerSelection(a.pages[1], true) })
await page.waitForTimeout(500)
console.log('envoyé          ', JSON.stringify(await page.evaluate(ETAT)))
// La page 2 à la poubelle (on y va d'abord)
await page.evaluate(() => window.__app.allerPage(window.__app.pages[1])); await page.waitForTimeout(700)
await page.click('.barre-haut button[aria-label="Supprimer cette page"]'); await page.waitForTimeout(400)
console.log('page 2 jetée    ', JSON.stringify(await page.evaluate(ETAT)))
// La trieuse, la corbeille, Vider
await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(400)
await page.click('.corbeille-vider'); await page.waitForTimeout(200)
await page.click('dialog.dialogue-corbeille[open] [data-a="oui"]'); await page.waitForTimeout(300)
await page.keyboard.press('Escape'); await page.waitForTimeout(200)
if (await page.evaluate(() => document.body.classList.contains('en-trieuse'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
console.log('corbeille vidée ', JSON.stringify(await page.evaluate(ETAT)))
await page.mouse.click(900, 600)
await page.keyboard.press('Control+z'); await page.waitForTimeout(500)
console.log('Ctrl+Z          ', JSON.stringify(await page.evaluate(ETAT)))
await page.keyboard.press('Control+y'); await page.waitForTimeout(500)
const e = await page.evaluate(ETAT)
console.log('Ctrl+Y          ', JSON.stringify(e))
await page.waitForTimeout(1200)
await page.reload(); await pret()
const r = await page.evaluate(ETAT)
console.log('rechargé        ', JSON.stringify(r))
console.log(r.ou.every(o => o === 'page supprimée définitivement') ? 'DÉFAUT : l\'objet n\'est plus que dans une page supprimée définitivement (rien ne le rend : ni la corbeille, ni Ctrl+Z après le rechargement) ; message de Ctrl+Y : « ' + net(e.msg) + ' »' : 'l\'objet est retrouvable')
await nav.close()
if (erreurs.length) { console.log('ÉCHEC erreurs JS :', erreurs); process.exitCode = 1 }  // contrôle final : un échec visible
