// ESSAI DU LOT 14 AVEC LES VRAIS ÉMULATEURS DE NUMWORKS (facultatif).
// Ils ne sont pas dans le dépôt : l'essai ne se fait que si on lui donne
// les deux fichiers hors connexion, par leurs chemins :
//   NUMWORKS_LYCEE=…/numworks-graphing-emulator.html \
//   NUMWORKS_COLLEGE=…/numworks-scientific-emulator.html \
//   node essais/navigateur/lot14/E2-vrais-emulateurs.mjs
// Sans eux, il le dit et s'arrête sans échec.
// Serveur de développement (port 5173), internet coupé. Pour chaque
// calculatrice : installée, posée ; son écran d'accueil est noté ; à la
// souris sur ses touches, accueil, OK, 2 + 3 EXE : un écran neuf, une étape
// du film ; la page de l'émulateur ne garde que la calculatrice (ni fond
// gris, ni boutons du dessous). Aucune erreur.
import { chromium } from '../commun/playwright.mjs'
import { existsSync } from 'node:fs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const FICHIERS = [['lycée', 0, process.env.NUMWORKS_LYCEE], ['collège', 1, process.env.NUMWORKS_COLLEGE]]
if (FICHIERS.some(([, , f]) => !f || !existsSync(f))) {
  console.log('Sans les fichiers de NumWorks (NUMWORKS_LYCEE, NUMWORKS_COLLEGE) : essai non fait.')
  process.exit(0)
}
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort())
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
await p.goto(DEV)
await p.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
await p.waitForTimeout(1200)
await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })

const calc = m => p.evaluate(m => { const a = window.__app, f = a.formes.find(f => f.calculatrice === m); return f ? { src: f.src, film: a.tableau.film.length } : null }, m)

for (const [nom, rang, fichier] of FICHIERS) {
  const m = rang ? 'college' : 'lycee'
  await p.locator('button.outils-classe').click(); await p.waitForTimeout(200)
  await p.locator(`.menu-outils-classe .menu-item:has-text("NumWorks ${nom}")`).first().click()
  await p.waitForSelector('dialog.dialogue-calculatrice[open]', { timeout: 10000 })
  const c = p.locator('.calculatrice-case').nth(rang)
  await c.locator('input[type=file]').setInputFiles(fichier)
  await p.waitForFunction(r => document.querySelectorAll('.calculatrice-case')[r]?.classList.contains('installee'), rang, { timeout: 20000 }).catch(() => {})
  ok(/Installée/.test(await c.locator('.etat').textContent() ?? ''), `${nom} : installée`)
  await p.locator('dialog.dialogue-calculatrice [data-a="fermer"]').click()
  await p.waitForFunction(m => !window.__app.formes.find(f => f.calculatrice === m)?.src.startsWith('calc-accueil'), m, { timeout: 15000 }).catch(() => {})
  const a = await calc(m)
  ok(a && a.src.startsWith(`calc-${m}-`), `${nom} : son écran d'accueil est noté`, a)

  const cadre = p.locator('iframe.calculatrice-cadre').last()
  const fr = p.frameLocator('iframe.calculatrice-cadre').last()
  const page = await cadre.evaluate(c => {
    const d = c.contentDocument, im = d.querySelector('.calculator-container img')?.getBoundingClientRect()
    return { fond: getComputedStyle(d.body).backgroundColor, actions: d.querySelector('.actions')?.getBoundingClientRect().height ?? 0, haut: im?.height ?? 0, cadre: c.getBoundingClientRect().height }
  })
  ok(page.fond === 'rgba(0, 0, 0, 0)' && page.actions === 0 && page.haut > page.cadre * 0.9, `${nom} : la calculatrice seule, à la taille du cadre`, page)

  for (const k of ['home', 'ok', 'two', 'plus', 'three', 'exe']) { await fr.locator(`span[data-key="${k}"]`).click(); await p.waitForTimeout(400) }
  await p.waitForTimeout(3500)
  const b = await calc(m)
  ok(b && b.src !== a.src && b.film > a.film, `${nom} : 2 + 3 EXE, un écran neuf, une étape du film`, { a, b })
  await p.mouse.click(1350, 820)
}
ok(erreurs.length === 0, 'Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s).` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
