// ESSAI DU LOT 13 : la calculatrice NumWorks.
// Le serveur de développement (port 5173), puis la version hors ligne
// (dist/index.html en file://, internet coupé : `npm run build` d'abord).
// L'émulateur de NumWorks n'est pas dans le dépôt : l'essai donne à l'outil
// une page qui s'en donne l'air (emulateur-d-essai.html : un écran, des
// touches, un curseur qui clignote).
// A. Le menu Classe a « Calculatrice NumWorks lycée » et « … collège » ; la
//    lycée se pose sur la page, prise à la Sélection ; pas encore installée,
//    la fenêtre d'installation s'ouvre ;
// B. le fichier donné dans la case « NumWorks lycée » : « Installée » ; la
//    vraie calculatrice se pose sur l'image, et son écran d'accueil est noté ;
// C. 2 + 3 EXE : l'image de la calculatrice prend l'écran « 5 » (une étape
//    du film), sans étape d'annulation ; sans appui (le curseur clignote),
//    rien de plus ne s'écrit ;
// D. au Stylo, la bande du nom la déplace (pas d'encre) et la vraie
//    calculatrice suit ; un trait ailleurs s'écrit encore ;
// E. × la range, Ctrl+Z la rend ;
// F. « Voir comme un élève » : le lecteur s'ouvre sans erreur ;
// G. la version hors ligne, sans internet : installer, calculer, l'écran
//    copié paraît sur l'image (sous la vraie calculatrice) ;
// H. aucune erreur.
import { chromium } from '../commun/playwright.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { RACINE_DEPOT as RACINE } from '../commun/racines.mjs'

const DEV = 'http://localhost:5173/'
const EMU = join(RACINE, 'essais/navigateur/lot13/emulateur-d-essai.html')
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()

async function ouvrir(url, horsLigne = false) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
  if (horsLigne) await ctx.route(/^https?:/, r => r.abort())
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(e.message))
  p.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
  await p.goto(url)
  await p.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
  await p.waitForTimeout(1200)
  await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
  await p.waitForTimeout(300)
  return { ctx, p }
}

async function poser(p, modele) {
  await p.locator('button.outils-classe').click()
  await p.waitForTimeout(200)
  const entrees = await p.locator('.menu-outils-classe .menu-item').allTextContents()
  await p.locator(`.menu-outils-classe .menu-item:has-text("NumWorks ${modele}")`).first().click()
  return entrees
}

async function installer(p, rang) {
  await p.waitForSelector('dialog.dialogue-calculatrice[open]', { timeout: 10000 })
  const c = p.locator('.calculatrice-case').nth(rang)
  await c.locator('input[type=file]').setInputFiles(EMU)
  await p.waitForFunction(r => document.querySelectorAll('.calculatrice-case')[r]?.classList.contains('installee'), rang, { timeout: 10000 })
  const etat = await c.locator('.etat').textContent()
  await p.locator('dialog.dialogue-calculatrice [data-a="fermer"]').click()
  return etat
}

const touches = async (p, liste) => {
  const fr = p.frameLocator('iframe.calculatrice-cadre')
  for (const t of liste) await fr.locator(`button[data-t="${t}"]`).click()
}

const calc = p => p.evaluate(() => {
  const a = window.__app, f = a.formes.find(f => f.calculatrice)
  return f ? { id: f.id, src: f.src, x: f.x, y: f.y, film: a.tableau.film.length, pile: a.tableau.annulationDe(a.page).undoStack.length,
    pris: a.selection.has(f.id), outil: a.outil, traits: a.formes.filter(g => g.type === 'trait').length,
    transform: document.querySelector('.calculatrice-vivante')?.style.transform ?? null } : null
})

// ---------- Le serveur de développement ----------
{
  const { ctx, p } = await ouvrir(DEV)
  const entrees = await poser(p, 'lycée')
  ok(entrees.some(t => t.includes('Calculatrice NumWorks lycée')) && entrees.some(t => t.includes('Calculatrice NumWorks collège')), 'A) Le menu Classe a les deux calculatrices', entrees)
  await p.waitForSelector('dialog.dialogue-calculatrice[open]', { timeout: 10000 })
  const a = await calc(p)
  ok(a && a.pris && a.outil === 'selection' && a.src === 'calc-accueil-lycee', 'A) Posée, prise à la Sélection ; la fenêtre d\'installation s\'ouvre', a)
  const etat = await installer(p, 0)
  ok(/Installée/.test(etat ?? ''), 'B) Le fichier donné : « Installée »', etat)
  await p.waitForSelector('iframe.calculatrice-cadre', { timeout: 10000 })
  await p.waitForFunction(() => !window.__app.formes.find(f => f.calculatrice)?.src.startsWith('calc-accueil'), null, { timeout: 8000 }).catch(() => {})
  const b = await calc(p)
  ok(b && /^calc-lycee-/.test(b.src), 'B) La vraie calculatrice est posée ; son écran d\'accueil est noté', b)

  await touches(p, ['2', '+', '3', 'EXE'])
  await p.waitForTimeout(3200)
  const c = await calc(p)
  ok(c && c.src !== b.src && c.film > b.film && c.pile === b.pile, 'C) 2 + 3 EXE : un écran neuf, une étape du film, pas d\'annulation', { b, c })
  await p.waitForTimeout(3000)
  const c2 = await calc(p)
  ok(c2 && c2.film === c.film && c2.src === c.src, 'C) Sans appui (le curseur clignote), rien ne s\'écrit', { c, c2 })

  // Le clavier est à la calculatrice (on vient d'y taper) : un clic sur le
  // tableau le rend au tableau, et P prend le Stylo
  await p.mouse.click(1300, 700)
  await p.keyboard.press('p')
  const r = await p.locator('.calculatrice-vivante').boundingBox()
  await p.mouse.move(r.x + 60, r.y + 15); await p.mouse.down()
  await p.mouse.move(r.x - 40, r.y + 45, { steps: 8 })
  const pendant = await calc(p)
  await p.mouse.up(); await p.waitForTimeout(400)
  const d = await calc(p)
  ok(d && d.outil === 'stylo' && Math.abs(d.x - c.x + 100) < 2 && Math.abs(d.y - c.y - 30) < 2 && d.traits === 0 && d.transform.endsWith(`${+d.x.toFixed(3)}, ${+d.y.toFixed(3)})`) && pendant.transform !== c.transform,
    'D) Au Stylo, la bande la déplace, la vraie calculatrice suit, sans encre', { c, pendant, d })
  await p.mouse.move(1150, 500); await p.mouse.down(); await p.mouse.move(1250, 560, { steps: 6 }); await p.mouse.up()
  await p.waitForTimeout(300)
  ok((await calc(p)).traits === 1, 'D) Un trait ailleurs s\'écrit encore')

  await p.locator('.calculatrice-bouton[aria-label^="Ranger"]').click()
  await p.waitForTimeout(300)
  const e1 = await calc(p)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(500)
  const e2 = await calc(p)
  ok(e1 === null && e2 && e2.id === d.id && (await p.locator('iframe.calculatrice-cadre').count()) === 1, 'E) × la range, Ctrl+Z la rend', { e1, e2 })

  await p.locator('button[title^="Publier le replay"]').click()
  await p.waitForSelector('.p-apercu', { timeout: 10000 })
  const [lecteur] = await Promise.all([ctx.waitForEvent('page'), p.locator('.p-apercu').click()])
  lecteur.on('pageerror', e => erreurs.push('lecteur : ' + e.message))
  await lecteur.waitForLoadState()
  await lecteur.waitForTimeout(2500)
  const titre = await lecteur.title()
  ok(!!titre, 'F) « Voir comme un élève » : le lecteur s\'ouvre', titre)
  await ctx.close()
}

// ---------- La version hors ligne ----------
const DIST = join(RACINE, 'dist/index.html')
if (!existsSync(DIST)) ok(false, 'G) dist/index.html manque : npm run build')
else {
  const { ctx, p } = await ouvrir(pathToFileURL(DIST).href, true)
  await poser(p, 'collège')
  const etat = await installer(p, 1)
  ok(/Installée/.test(etat ?? ''), 'G) Hors ligne : la calculatrice collège s\'installe', etat)
  await p.waitForSelector('iframe.calculatrice-cadre', { timeout: 10000 })
  await p.waitForTimeout(1500)
  await touches(p, ['7', '×', '6', 'EXE'])
  await p.waitForTimeout(3200)
  // Sous la vraie calculatrice, l'image : son écran montre le calcul (de
  // l'encre noire dans sa moitié droite, là où s'écrit le résultat)
  await p.evaluate(() => { document.querySelector('.calculatrice-corps').style.visibility = 'hidden' })
  await p.waitForTimeout(300)
  const encre = await p.evaluate(() => {
    const r = document.querySelector('.calculatrice-vivante').getBoundingClientRect()
    const cv = document.querySelector('.couche-scene'), k = cv.width / cv.getBoundingClientRect().width
    const c = cv.getContext('2d')
    // L'écran est à (20, 60) dans le dessin de 360 × 660, et mesure 320 × 240
    const x = r.left + r.width * 180 / 360, y = r.top + r.height * 60 / 660
    const d = c.getImageData(Math.round(x * k), Math.round(y * k), Math.round(r.width * 160 / 360 * k), Math.round(r.height * 240 / 660 * k)).data
    let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] < 80 && d[i + 1] < 80 && d[i + 2] < 80) n++
    return n
  })
  ok(encre > 20, 'G) Hors ligne : l\'écran copié paraît sur l\'image', encre)
  await ctx.close()
}

ok(erreurs.length === 0, 'H) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
