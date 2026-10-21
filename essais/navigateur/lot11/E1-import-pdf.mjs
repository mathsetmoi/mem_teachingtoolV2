// ESSAI DU LOT 11 : importer un PDF.
// Le serveur de développement (port 5173), puis la version hors ligne
// (dist/index.html en file://, internet coupé : `npm run build` d'abord).
// Un PDF de trois pages (« Exercice 1 », « 2 », « 3 ») est fabriqué par le
// navigateur lui-même.
// A. Le choix du fichier du bouton Image accepte les PDF ; la fenêtre
//    « Importer un PDF » montre les trois pages en vignettes, toutes
//    cochées ; « Une page du tableau par page du PDF » et « Fixer en fond »
//    sont cochés ; décocher la page 2 : « Importer 2 pages » ;
// B. importées : deux pages neuves après celle qu'on regardait, on est sur
//    la première, chacune avec une image fixée en fond, en haut à gauche ;
// C. « Toutes sur cette page », sans fond : trois images sur la page,
//    l'une sous l'autre, sélectionnées, non fixées ;
// D. Annuler n'ajoute rien ;
// E. la version hors ligne, sans internet, lit le PDF de même ;
// F. aucune erreur.
import { chromium } from '../commun/playwright.mjs'
import { mkdtempSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { RACINE_DEPOT as RACINE } from '../commun/racines.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()

// Le PDF d'essai : trois feuilles A4, un exercice par feuille
const dossier = mkdtempSync(join(tmpdir(), 'mem-pdf-'))
const fichierPdf = join(dossier, 'fiche-exercices.pdf')
{
  const ctx = await nav.newContext()
  const p = await ctx.newPage()
  await p.setContent(`<style>section{page-break-after:always;font:28px serif;padding:40px}</style>
    <section><h1>Exercice 1</h1><p>Calculer f(0) et f(2).</p></section>
    <section><h1>Exercice 2</h1><p>Résoudre f(x) = 1.</p></section>
    <section><h1>Exercice 3</h1><p>Placer A(1 ; 2).</p></section>`)
  writeFileSync(fichierPdf, await p.pdf({ format: 'A4' }))
  await ctx.close()
}

async function ouvrir(url, horsLigne = false) {
  const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
  if (horsLigne) await ctx.route(/^https?:/, r => r.abort())
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(e.message))
  p.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
  await p.goto(url)
  // La version construite n'expose pas window.__app : on attend sa barre
  await p.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 })
  await p.waitForTimeout(1200)
  // La fenêtre « Bonjour ! » éventuelle
  await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
  await p.waitForTimeout(300)
  return { ctx, p }
}

const choisirPdf = async p => {
  await p.locator('input[type=file][accept*="pdf"]').setInputFiles(fichierPdf)
  await p.waitForSelector('dialog.dialogue-import-pdf[open]', { timeout: 20000 })
  await p.waitForFunction(() => document.querySelectorAll('.import-pdf-vignette canvas').length === 3, null, { timeout: 20000 })
}
const etatPages = p => p.evaluate(() => { const a = window.__app; return { pages: a.pages.length, ici: a.pages.indexOf(a.page) + 1, page: a.page } })
const images = p => p.evaluate(() => window.__app.formes.filter(f => f.type === 'image').map(f => ({ id: f.id, x: f.x, y: f.y, l: f.l, h: f.h, e: f.m[0], fixe: !!f.fixe, src: (window.__app.tableau.doc.getMap('images').get(f.src) ?? '').slice(0, 15) })))
const message = p => p.evaluate(() => [...document.querySelectorAll('.message, .toast, [role=status]')].map(e => e.textContent).join(' | '))

async function essaiPages(p, quoi) {
  const avant = await etatPages(p)
  await choisirPdf(p)
  const f = await p.evaluate(() => ({
    pages: document.querySelectorAll('.import-pdf-page input:checked').length,
    ouPages: document.querySelector('input[name="import-pdf-ou"][value="pages"]').checked,
    fond: document.querySelector('input[name="import-pdf-fond"]').checked,
    bouton: document.querySelector('.dialogue-import-pdf [data-a="importer"]').textContent,
  }))
  ok(f.pages === 3 && f.ouPages && f.fond && f.bouton === 'Importer 3 pages', `${quoi} A) La fenêtre : 3 pages cochées, une page par page, fixées en fond`, f)
  await p.locator('.import-pdf-page').nth(1).click()
  const b = await p.textContent('.dialogue-import-pdf [data-a="importer"]')
  ok(b === 'Importer 2 pages', `${quoi} A) La page 2 décochée : « Importer 2 pages »`, b)
  await p.click('.dialogue-import-pdf [data-a="importer"]')
  await p.waitForFunction(n => window.__app.pages.length === n, avant.pages + 2, { timeout: 30000 })
  await p.waitForTimeout(400)
  const apres = await etatPages(p)
  ok(apres.ici === avant.ici + 1, `${quoi} B) On est sur la première page ajoutée, juste après celle d'avant`, { avant, apres })
  const im = await images(p)
  ok(im.length === 1 && im[0].fixe && im[0].x === 0 && im[0].y === 0 && im[0].l === 1600 && im[0].src.startsWith('data:image/jpeg'), `${quoi} B) Une feuille fixée en fond, en haut à gauche, de 1600 px`, im)
  const m = await message(p)
  ok(/2 pages ajoutées à la séance/.test(m), `${quoi} B) Le message le dit`, m)
  // La seconde page ajoutée a sa feuille aussi
  await p.evaluate(() => window.__app.pageSuivante(1)); await p.waitForTimeout(300)
  const im2 = await images(p)
  ok(im2.length === 1 && im2[0].fixe, `${quoi} B) La seconde page a sa feuille`, im2)
  // La feuille n'est pas blanche : il y a de l'encre
  const encre = await p.evaluate(async () => {
    const a = window.__app, f = a.formes.find(x => x.type === 'image')
    const img = new Image(); img.src = a.tableau.doc.getMap('images').get(f.src); await img.decode()
    const cv = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }); const g = cv.getContext('2d'); g.drawImage(img, 0, 0)
    const d = g.getImageData(0, 0, cv.width, 400).data; let n = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] < 100) n++
    return n
  })
  ok(encre > 200, `${quoi} B) La feuille porte le texte du PDF`, encre)
}

// ---------- Le serveur de développement ----------
{
  const { ctx, p } = await ouvrir(DEV)
  await essaiPages(p, 'En ligne')

  // C. Toutes sur cette page, sans fond
  await p.evaluate(() => window.__app.nouvellePage()); await p.waitForTimeout(300)
  await choisirPdf(p)
  await p.check('input[name="import-pdf-ou"][value="ici"]')
  await p.uncheck('input[name="import-pdf-fond"]')
  await p.click('.dialogue-import-pdf [data-a="importer"]')
  await p.waitForFunction(() => window.__app.formes.filter(f => f.type === 'image').length === 3, null, { timeout: 30000 })
  const im = await images(p)
  const sel = await p.evaluate(() => [...window.__app.selection])
  const empilees = im.slice().sort((a, b) => a.y - b.y).every((f, i, t) => i === 0 || f.y >= t[i - 1].y + t[i - 1].h * t[i - 1].e)
  ok(im.every(f => !f.fixe) && empilees, 'C) Trois feuilles sur la page, l\'une sous l\'autre, non fixées', im)
  ok(sel.length === 3, 'C) Elles arrivent sélectionnées', sel)

  // D. Annuler
  const avant = await etatPages(p)
  await choisirPdf(p)
  await p.click('.dialogue-import-pdf [data-a="annuler"]')
  await p.waitForTimeout(400)
  const apres = await etatPages(p)
  ok(apres.pages === avant.pages && !(await p.$('dialog.dialogue-import-pdf')), 'D) Annuler n\'ajoute rien', { avant, apres })
  await ctx.close()
}

// ---------- E. La version hors ligne, sans internet ----------
{
  const fichier = join(RACINE, 'dist', 'index.html')
  if (!existsSync(fichier)) ok(false, 'E) dist/index.html manque : lancer npm run build')
  else {
    const { ctx, p } = await ouvrir(pathToFileURL(fichier).href, true)
    await choisirPdf(p)
    ok(true, 'E) Hors ligne : la fenêtre montre les trois pages du PDF')
    await p.click('.dialogue-import-pdf [data-a="importer"]')
    await p.waitForFunction(() => /3 pages ajoutées à la séance/.test(document.body.textContent), null, { timeout: 30000 }).catch(() => {})
    const m = await message(p)
    ok(/3 pages ajoutées à la séance/.test(m), 'E) Hors ligne, sans internet : les trois pages sont importées', m)
    await ctx.close()
  }
}

ok(!erreurs.length, 'F) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
