// Vérification « données et replay » du lot 3, de bout en bout dans le
// navigateur : P (3 gestes) ; Ctrl + Maj + D → Q (2 gestes) ; Ctrl + Maj + D
// sur Q → R (1 geste) ; P modifiée (1 geste), puis à la poubelle ; on
// recharge ; trieuse → corbeille → Vider ; on recharge. La revue de R, de Q,
// de P (page jetée) ; Publier R seule → fichier .mem → revoir.html (le
// fichier choisi) : R se construit comme P, puis Q, puis elle-même.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { readFileSync } from 'node:fs'

const nav = await chromium.launch()
const erreurs = []
const resultats = []
function verifier(nom, ok, detail = '') { resultats.push(!!ok); console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`) }
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
const page = await ctx.newPage()
page.on('pageerror', e => erreurs.push(e.message))
page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
async function pret() {
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(500)
}
await page.goto('http://localhost:5173/')
await pret()
// Une horloge qui avance à volonté, gardée d'un rechargement à l'autre
await page.addInitScript(() => { const vrai = Date.now.bind(Date); const d = Number(sessionStorage.getItem('__dec') || 0); window.__dec = d; Date.now = () => vrai() + window.__dec })
await page.reload(); await pret()
const avancer = ms => page.evaluate(ms => { window.__dec += ms; sessionStorage.setItem('__dec', String(window.__dec)) }, ms)
const poser = (id, x, y) => page.evaluate(({ id, x, y }) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5, 180, 14, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
}, { id, x, y })
async function geste(id, x, y) { await avancer(3000); await poser(id, x, y); await page.waitForTimeout(80) }

await avancer(30 * 60_000)
const P = await page.evaluate(() => window.__app.page)
for (let i = 0; i < 3; i++) await geste('p' + i, 100, 100 + 60 * i)
await avancer(3000)
await page.mouse.move(700, 500)
await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(400)
const Q = await page.evaluate(() => window.__app.page)
verifier('Ctrl + Maj + D : on est sur la copie, juste après', Q !== P && JSON.stringify(await page.evaluate(() => window.__app.pages)) === JSON.stringify([P, Q]))
for (let i = 0; i < 2; i++) await geste('q' + i, 400, 100 + 60 * i)
await avancer(3000)
await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(400)
const R = await page.evaluate(() => window.__app.page)
await geste('r0', 700, 100)
let e = await page.evaluate(() => ({ pages: window.__app.pages, ids: Object.fromEntries(window.__app.pages.map(p => [p, [...window.__app.tableau.formesDe(p).keys()].sort()])), herite: window.__app.pages.map(p => window.__app.tableau.herite(p)) }))
verifier('trois pages : P, Q (copie de P), R (copie de Q)', JSON.stringify(e.pages) === JSON.stringify([P, Q, R]) && JSON.stringify(e.herite) === JSON.stringify([null, P, Q]) && e.ids[R].join() === 'p0,p1,p2,q0,q1,r0', e)
// P modifiée après les copies, puis jetée
await page.evaluate(p => window.__app.allerPage(p), P); await page.waitForTimeout(700)
await geste('p3', 100, 400)
await avancer(3000)
await page.click('.barre-haut button[aria-label="Supprimer cette page"]'); await page.waitForTimeout(400)
e = await page.evaluate(() => ({ pages: window.__app.pages, dans: window.__app.tableau.pagesDeLaCorbeille().map(x => x.id) }))
verifier('P à la poubelle : dans la corbeille', JSON.stringify(e.pages) === JSON.stringify([Q, R]) && JSON.stringify(e.dans) === JSON.stringify([P]), e)
await page.reload(); await pret()
// La trieuse, la corbeille, Vider
await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(400)
await page.click('.corbeille-vider'); await page.waitForTimeout(200)
await page.click('dialog.dialogue-corbeille[open] [data-a="oui"]'); await page.waitForTimeout(300)
e = await page.evaluate(p => ({ dans: window.__app.tableau.pagesDeLaCorbeille().map(x => x.id), def: window.__app.tableau.corbeille.get(p)?.definitif }), P)
verifier('corbeille vidée : P définitive', e.dans.length === 0 && e.def === true, e)
await page.keyboard.press('Escape'); await page.waitForTimeout(200)
if (await page.evaluate(() => document.body.classList.contains('en-trieuse'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
await page.reload(); await pret()

// La revue
const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
const REVUE = () => { const r = window.__revue, b = r.bande; return { k: r.k, n: b.images.length, total: b.total, page: b.portion.page, genre: b.portion.genre, ids: r.rendu.formes.map(f => f.id) } }
async function revueDe(p) {
  await page.evaluate(p => window.__app.allerPage(p), p); await page.waitForTimeout(400)
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(200)
  const t = await page.evaluate(TIROIR)
  await page.locator('.revue-choix', { hasText: 'Toute son histoire' }).click(); await page.waitForTimeout(200)
  const r = await page.evaluate(REVUE)
  const images = []
  await page.keyboard.press('Home'); await page.waitForTimeout(100)
  // Après chaque pas, on attend que son geste ait fini de s'écrire (mis à jour
  // au contrôle final : à 60 ms, l'image se lisait en pleine animation)
  for (let k = 0; k < r.n; k++) { images.push((await page.evaluate(REVUE)).ids.join(',')); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500) }
  for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) }
  return { t, r, images }
}
const rR = await revueDe(R)
verifier('revue de R : 6 gestes, l\'histoire de P, puis de Q, puis la sienne', rR.r.total === 6 && JSON.stringify(rR.images) === JSON.stringify(['', 'p0', 'p0,p1', 'p0,p1,p2', 'p0,p1,p2,q0', 'p0,p1,p2,q0,q1', 'p0,p1,p2,q0,q1,r0']), rR)
const jetees = rR.t.find(s => s.h === 'Pages jetées')
verifier('« Pages jetées » : P (définitive), 4 gestes', jetees?.lignes.length === 1 && /4 gestes$/.test(jetees.lignes[0]), rR.t)
const rQ = await revueDe(Q)
verifier('revue de Q : 5 gestes, rien de R ni de p3', rQ.r.total === 5 && rQ.images.at(-1) === 'p0,p1,p2,q0,q1', rQ)

// Publier R seule, fichier .mem, revoir.html
await page.evaluate(p => window.__app.allerPage(p), R); await page.waitForTimeout(400)
await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
const cases = await page.$$eval('.p-pages input', l => l.map(i => ({ v: i.value, c: i.checked, t: i.parentElement.textContent })))
console.log('Publier propose :', JSON.stringify(cases.map(c => [c.v === P ? 'P' : c.v === Q ? 'Q' : c.v === R ? 'R' : '?', c.c, c.t])))
for (const c of cases) if (c.v !== R && c.c) await page.uncheck(`.p-pages input[value="${c.v}"]`)
const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.p-fichier')])
const chemin = `${RACINE_ESSAIS}/lot3/verif/donnees/copie-de-copie.mem`
await dl.saveAs(chemin)
const lecteur = await ctx.newPage()
lecteur.on('pageerror', e => erreurs.push('revoir: ' + e.message))
await lecteur.goto('http://localhost:5173/revoir.html')
await lecteur.waitForSelector('input[type=file]', { state: 'attached' })
await lecteur.setInputFiles('input[type=file]', chemin)
await lecteur.waitForFunction(() => window.__revoir?.bobine, null, { timeout: 8000 })
const lu = await lecteur.evaluate(() => {
  const b = window.__revoir.bobine
  return { n: b.n, ordre: b.film.ordre.length, ajouts: Array.from({ length: b.n - 1 }, (_, k) => [...b.ajoutees(k + 1)].join(',')), fin: b.image(b.n - 1).formes.map(f => f.id), depart: b.film.pages.map(p => p.formes.length) }
})
verifier('revoir.html lit le fichier de R : six gestes, chaque trait paraît à son geste, fin = R entière', lu.n === 7 && lu.ordre === 1 && lu.ajouts.join('|') === 'p0|p1|p2|q0|q1|r0' && lu.fin.join(',') === 'p0,p1,p2,q0,q1,r0' && lu.depart.join() === '0', lu)
await nav.close()
console.log(`${resultats.filter(x => x).length}/${resultats.length} OK`)
// Contrôle final du lot 3 : un échec se voit aussi au code de sortie
if (resultats.some(x => !x)) process.exitCode = 1
if (erreurs.length) console.log('erreurs JS :', erreurs)
