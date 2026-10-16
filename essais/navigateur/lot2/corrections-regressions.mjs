// Essais des corrections « regressions » du lot 2. Pendant une séance
// d'automatismes, le tableau est caché : Suppr, Retour arrière, Ctrl+Z, Ctrl+Y,
// Ctrl+Maj+Z (et ⌘ sur Mac) ne le changent pas (point 7 : jamais un
// changement invisible). Avant la correction, Suppr effaçait l'objet resté
// sélectionné et Ctrl+Z défaisait le dernier geste de la page cachée ; à la
// fermeture de la séance, il manquait un trait. La séance fermée, ces touches
// remarchent. Serveur de développement sur :5173 (ou l'adresse en argument).
// Une ligne « OK … » ou « ÉCHEC … » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = process.argv[2] || 'http://localhost:5173/'
const resultats = [], erreurs = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const page = await ctx.newPage()
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
page.on('pageerror', e => erreurs.push(e.message))
await page.goto(URL0)
await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
await page.waitForTimeout(500)
await page.evaluate(() => {
  const a = window.__app, m = a.ui.message.bind(a.ui)
  window.__msgs = []
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
})
const etat = () => page.evaluate(() => {
  const a = window.__app
  return {
    n: a.formes.length, ids: a.formes.map(f => f.id).sort(), pos: a.formes.map(f => f.id + ':' + f.x + ',' + f.y).sort(),
    sel: [...a.selection], page: a.page, cam: [a.cam.x, a.cam.y, a.cam.z], msgs: window.__msgs.slice(),
    seance: document.body.classList.contains('en-seance'),
  }
})
const ecranDe = (x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])

// Deux traits, deux gestes ; le premier sélectionné à la souris
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.selection.clear(); a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj()
  for (const y of [300, 400]) {
    t.nouveauGeste()
    t.poser(a.page, { id: 'T' + y, type: 'trait', x: 300, y, z: Date.now() + y, auteur: t.moi, pts: [0, 0, 0.5, 60, 0, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
  }
  a.choisirOutil('selection')
})
await page.waitForTimeout(450)
const c = await ecranDe(360, 300)
await page.mouse.click(c.x, c.y); await page.waitForTimeout(80)
const avant = await etat()
verifier('Préparation : deux traits, le premier sélectionné', avant.n === 2 && JSON.stringify(avant.sel) === '["T300"]', avant)

await page.click('button[title^="Automatismes"]'); await page.waitForTimeout(400)
let e = await etat()
verifier('La séance est ouverte (tableau caché)', e.seance, e)
await page.evaluate(() => { window.__msgs.length = 0 })
for (const [touche, nom] of [['Delete', 'Suppr'], ['Backspace', 'Retour arrière'], ['Control+z', 'Ctrl+Z'], ['Control+y', 'Ctrl+Y'],
  ['Control+Shift+z', 'Ctrl+Maj+Z'], ['Meta+z', '⌘Z'], ['Meta+Shift+z', '⌘⇧Z']]) {
  await page.keyboard.press(touche); await page.waitForTimeout(80)
  e = await etat()
  verifier(`Séance ouverte : ${nom} ne change rien à la page cachée (ni forme, ni place, ni page, ni message)`,
    e.n === avant.n && JSON.stringify(e.pos) === JSON.stringify(avant.pos) && e.page === avant.page && !e.msgs.length, { n: e.n, pos: e.pos, msgs: e.msgs })
}
await page.keyboard.press('Escape'); await page.waitForTimeout(400)
e = await etat()
verifier('Séance fermée : le tableau a ses deux traits, à leur place', !e.seance && e.n === 2 && JSON.stringify(e.pos) === JSON.stringify(avant.pos), e)

// La séance fermée, les touches remarchent
await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
e = await etat()
verifier('Séance fermée : Ctrl+Z défait le dernier trait', e.n === 1 && JSON.stringify(e.ids) === '["T300"]', e.ids)
await page.keyboard.press('Control+y'); await page.waitForTimeout(100)
e = await etat()
verifier('… Ctrl+Y le rend', e.n === 2, e.ids)
await page.mouse.click(c.x, c.y); await page.waitForTimeout(80)
await page.keyboard.press('Delete'); await page.waitForTimeout(100)
e = await etat()
verifier('… Suppr efface le trait sélectionné', e.n === 1 && JSON.stringify(e.ids) === '["T400"]', e.ids)

await nav.close()
if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
const ko = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - ko} / ${resultats.length} vérifications passent`)
process.exit(ko || erreurs.length ? 1 : 0)
