// Vérification « données et replay » du lot 3 : noms des points. Page 1 : un
// triangle ABC, qu'on efface. Page 2 : un autre triangle ABC, envoyé
// (déplacé) vers la page 1 (libre : il y garde ABC). Retour page 1, Ctrl+Z
// (la touche) : l'effacement est défait.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'

const nav = await chromium.launch()
const erreurs = []
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const page = await ctx.newPage()
page.on('pageerror', e => erreurs.push(e.message))
await page.goto('http://localhost:5173/')
await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
await page.waitForTimeout(600)
const tri = (id, x) => ({ id, type: 'polygone', x, y: 200, z: Date.now() + x, auteur: 'm', pts: [0, 0, 200, 0, 0, 150], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'] })
await page.evaluate(([t1, t2]) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste(); t.poser(a.page, t1)
  a.nouvellePage()
  t.nouveauGeste(); t.poser(a.page, t2)
  a.allerPage(a.pages[0])
}, [tri('t1', 250), tri('t2', 650)])
await page.waitForTimeout(700)
// Page 1 : on efface le triangle (Sélection, Suppr)
await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('t1'); a.rendu.redessinerDirect(); a.ui.maj() })
await page.keyboard.press('Delete'); await page.waitForTimeout(500)
// Page 2 : son triangle part vers la page 1
await page.evaluate(() => window.__app.allerPage(window.__app.pages[1])); await page.waitForTimeout(700)
await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('t2'); a.envoyerSelection(a.pages[0], true) })
await page.waitForTimeout(500)
await page.evaluate(() => window.__app.allerPage(window.__app.pages[0])); await page.waitForTimeout(700)
const noms = () => [...window.__app.tableau.formesDe(window.__app.page).values()].map(f => `${f.id}:${(f.noms ?? []).join('')}`)
console.log('page 1 avant Ctrl+Z :', JSON.stringify(await page.evaluate(noms)))
await page.mouse.click(1100, 650)
await page.keyboard.press('Control+z'); await page.waitForTimeout(500)
const apres = await page.evaluate(noms)
console.log('page 1 après Ctrl+Z :', JSON.stringify(apres))
await page.screenshot({ path: `${RACINE_ESSAIS}/lot3/verif/donnees/noms-page1.png` })
const lettres = apres.map(x => x.split(':')[1]).join('')
console.log(new Set(lettres).size < lettres.length ? 'DÉFAUT : deux triangles ABC sur la même page (deux points A, deux B, deux C)' : 'noms cohérents')
await nav.close()
if (erreurs.length) { console.log('ÉCHEC erreurs JS :', erreurs); process.exitCode = 1 }  // contrôle final : un échec visible
