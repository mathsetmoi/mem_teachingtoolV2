// ESSAI DU LOT 13 : le mode nuit d'une page.
// Le serveur de développement (port 5173).
// A. N passe la page en nuit : le papier presque noir, le bouton lune
//    allumé, les barres foncées (body.page-nuit), la pastille Noir devient
//    « Blanc » ; l'écriture noire se peint claire ;
// B. une autre page reste de jour (les barres redeviennent claires), et l'on
//    retrouve la page de nuit en y revenant ;
// C. le bouton lune remet de jour ; N de nouveau en nuit ;
// D. la trieuse : « Mode nuit » dans le menu d'une page, et sa vignette noire ;
// E. le replay des élèves : la page est blanche avant la bascule, noire après ;
// F. aucune erreur.
import { chromium } from '../commun/playwright.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })

/** La luminosité (0 à 255) d'un pixel d'un canevas, en px CSS */
const pixel = (page, sel, x, y) => page.evaluate(([sel, x, y]) => {
  const c = document.querySelector(sel), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(Math.round((x - r.left) * k), Math.round((y - r.top) * k), 1, 1).data
  return Math.round((d[0] + d[1] + d[2]) / 3)
}, [sel, x, y])
const SCENE = '.couche-scene'
const etat = () => p.evaluate(() => ({
  nuit: window.__app.nuit, corps: document.body.classList.contains('page-nuit'),
  lune: document.querySelector('.barre-haut .bouton[aria-pressed]')?.getAttribute('aria-pressed'),
  noir: document.querySelector('.barre-outils .pastille')?.title,
}))

await p.goto(DEV)
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForTimeout(1200)
await p.keyboard.press('Escape')
await p.evaluate(() => window.__app.nouvellePage())
await p.waitForTimeout(400)
const page1 = await p.evaluate(() => window.__app.page)
// Un trait noir, épais, horizontal
await p.keyboard.press('p')
// (Adapté aux gains rapides du lot 16 : « Trait épais » est dans le menu du
// bouton de l'épaisseur, qu'on ouvre d'abord)
await p.click('.barre-outils .bouton-epaisseur'); await p.waitForTimeout(200)
await p.click('.menu-epaisseur button[aria-label="Trait épais"]'); await p.waitForTimeout(150)
await p.mouse.move(400, 400); await p.mouse.down()
for (let i = 1; i <= 30; i++) await p.mouse.move(400 + i * 10, 400)
await p.mouse.up(); await p.waitForTimeout(300)

// ---------- A ----------
ok(await pixel(p, SCENE, 900, 600) > 240 && await pixel(p, SCENE, 550, 400) < 80, 'A) De jour : papier blanc, trait sombre')
await p.keyboard.press('n'); await p.waitForTimeout(300)
let e = await etat()
ok(e.nuit && e.corps && e.lune === 'true' && e.noir === 'Blanc', 'A) N : la page en nuit, le bouton allumé, les barres foncées, la pastille « Blanc »', e)
ok(await pixel(p, SCENE, 900, 600) < 40, 'A) Le papier est presque noir')
ok(await pixel(p, SCENE, 550, 400) > 200, 'A) Le trait noir se peint clair')
const barre = await p.evaluate(() => getComputedStyle(document.querySelector('.barre-haut')).backgroundColor)
ok(barre === 'rgb(29, 36, 48)', 'A) La barre du haut est foncée', barre)
const couleur = await p.evaluate(() => window.__app.couleur)
ok(couleur === '#1b2230', 'A) L\'encre en main reste le Noir (écrit tel quel, affiché clair)', couleur)

// ---------- B ----------
await p.evaluate(() => window.__app.nouvellePage())
await p.waitForTimeout(400)
e = await etat()
ok(!e.nuit && !e.corps && e.lune === 'false' && e.noir === 'Noir', 'B) Une nouvelle page est de jour, les barres claires', e)
ok(await pixel(p, SCENE, 900, 600) > 240, 'B) Son papier est blanc')
await p.keyboard.press('PageUp'); await p.waitForTimeout(400)
e = await etat()
ok(e.nuit && e.corps && await p.evaluate(() => window.__app.page) === page1, 'B) De retour sur la page de nuit, elle l\'est toujours', e)

// ---------- C ----------
await p.click('.barre-haut .bouton[aria-pressed]'); await p.waitForTimeout(300)
e = await etat()
ok(!e.nuit && !e.corps && e.lune === 'false', 'C) Le bouton lune remet la page de jour', e)
ok(await pixel(p, SCENE, 550, 400) < 80, 'C) Le trait est de nouveau sombre')
await p.keyboard.press('n'); await p.waitForTimeout(300)
ok((await etat()).nuit, 'C) N la repasse en nuit')

// ---------- D ----------
await p.keyboard.press('Shift+P'); await p.waitForTimeout(800)
const page2 = await p.evaluate(() => window.__app.pages[window.__app.pages.length - 1])
await p.click(`.carte[data-page="${page2}"] .carte-options`)
await p.waitForTimeout(300)
const entree = p.locator('.menu-flottant:not([hidden]) .menu-item', { hasText: 'Mode nuit' })
ok(await entree.count() === 1 && await entree.getAttribute('aria-checked') === 'false', 'D) Le menu d\'une page de la trieuse a « Mode nuit », décoché')
if (await entree.count()) await entree.click()
await p.waitForTimeout(800)
ok(await p.evaluate(p2 => window.__app.tableau.nuitDe(p2), page2), 'D) La page passe en nuit depuis la trieuse')
const vignette = await p.evaluate(p2 => {
  const c = document.querySelector(`.carte[data-page="${p2}"] canvas`)
  if (!c) return null
  const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), c.height - 4, 1, 1).data
  return Math.round((d[0] + d[1] + d[2]) / 3)
}, page2)
ok(vignette !== null && vignette < 60, 'D) Sa vignette est noire', vignette)
await p.keyboard.press('Escape'); await p.waitForTimeout(400)

// ---------- E ----------
const fichier = await p.evaluate(async page1 => {
  const { exporter } = await import('/src/revoir/exporter.ts')
  const { ecrireFilm } = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const film = exporter(t, { de: 0, a: t.film.length - 1, pages: [page1], titre: 'Nuit' })
  return ecrireFilm(film)
}, page1)
const r = await ctx.newPage()
r.on('pageerror', e => erreurs.push('revoir : ' + e.message))
await r.goto(DEV + 'revoir.html')
await r.locator('input[type=file]').setInputFiles({ name: 'seance.mem', mimeType: 'application/json', buffer: Buffer.from(fichier) })
await r.waitForFunction(() => window.__revoir && window.__revoir.bobine)
await r.waitForTimeout(300)
const n = await r.evaluate(() => window.__revoir.bobine.n)
const nuits = await r.evaluate(() => { const b = window.__revoir.bobine; return Array.from({ length: b.n }, (_, k) => !!b.image(k).nuit) })
const premiere = nuits.indexOf(true)
ok(premiere > 0 && !nuits[0] && nuits[n - 1], 'E) Le replay : de jour au début, de nuit à partir de la bascule, jusqu\'au bout', nuits)
const carte = r.locator('.carte .secondaire')
if (await carte.count()) await carte.click()
await r.keyboard.press('End')
await r.waitForTimeout(600)
const fondFin = await r.evaluate(() => {
  const c = document.querySelector('.couche-scene'), d = c.getContext('2d').getImageData(4, Math.floor(c.height / 2), 1, 1).data
  return Math.round((d[0] + d[1] + d[2]) / 3)
})
ok(fondFin < 40, 'E) À la fin, le lecteur peint la page en noir', fondFin)
await r.keyboard.press('Home')
await r.waitForTimeout(600)
const fondDebut = await r.evaluate(() => {
  const c = document.querySelector('.couche-scene'), d = c.getContext('2d').getImageData(4, Math.floor(c.height / 2), 1, 1).data
  return Math.round((d[0] + d[1] + d[2]) / 3)
})
ok(fondDebut > 240, 'E) Au début, la page est blanche', fondDebut)

// ---------- F ----------
ok(!erreurs.length, 'F) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'TOUT VA BIEN')
process.exit(echecs ? 1 : 0)
