// Après l'ouverture d'un .memc : Ctrl + Z n'efface pas le tableau ouvert ; le
// film élève publié depuis le tableau ouvert est le même que depuis
// l'original ; le point d'encre d'un simple appui, en attente d'un
// double-clic, part dans le fichier si l'on enregistre aussitôt.
import { chromium } from '../../commun/playwright.mjs'
import { readFileSync } from 'node:fs'
import * as C from './commun.mjs'

const F = C.R + '/fichiers'
const erreurs = []
const nav = await chromium.launch()
// Lot 4 (C4) : « Ouvrir un classeur » (Ctrl + O) passe par showOpenFilePicker
// quand il existe, que Chromium sans fenêtre refuse (AbortError, même quand
// Playwright attend le choix de fichier) : cet essai ouvre ses fichiers par
// le choix de fichier d'avant, celui de Firefox, Safari et l'iPad
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.showOpenFilePicker = undefined }); return c } }
// Lot 4 (C9) : « Ouvrir un classeur » AJOUTE d'abord le classeur d'un fichier à la bibliothèque
// (une première fenêtre : [Annuler] [Remplacer « … »…] [Ajouter à la bibliothèque]). Ces essais
// remplacent celui qui est ouvert : on y choisit « Remplacer « … »… », et la question du lot 1,
// celle qu'ils vérifient, suit (adaptation de C9 : un comportement changé volontairement)
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true }) }); return c } }
const attendre = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
async function ouvrirPage(url, nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await p.goto(url); await attendre(p); await p.waitForTimeout(600)
  return { ctx, p }
}
async function tracer(p, x0, y0, n = 1) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 10; k++) await p.mouse.move(x0 + k * 14, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(80)
  }
}
const filmDe = p => p.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts')
  const t = window.__app.tableau
  const f = ex.exporter(t, { de: 0, a: t.film.length - 1, pages: window.__app.pages, titre: 'X' })
  return JSON.stringify({ pages: f.pages, etapes: f.etapes.map(e => ({ ...e, inst: undefined, apres: undefined })), ordre: f.ordre, chapitres: f.chapitres, images: f.images, date: f.date })
})

// Le tableau d'origine : celui de l'aller-retour (3 pages, image, formule…)
const ORIG = F + '/dev-telecharge.memc'
const A = await ouvrirPage(C.DEV, 'A')
await A.p.click('.barre-haut .bouton.points'); await A.p.waitForTimeout(60)
let fc = A.p.waitForEvent('filechooser')
await A.p.locator('.menu-item[data-action="ouvrir"]').click()
await (await fc).setFiles(ORIG)
await A.p.waitForSelector('dialog[open] [data-a="remplacer"]')
await Promise.all([A.p.waitForEvent('load'), A.p.click('dialog[open] [data-a="remplacer"]')])
await attendre(A.p); await A.p.waitForTimeout(800)
const avant = await A.p.evaluate(() => window.__app.pages.map(p => window.__app.tableau.formesDe(p).size))
for (let i = 0; i < 5; i++) { await A.p.keyboard.press('Control+z'); await A.p.waitForTimeout(80) }
await A.p.waitForTimeout(300)
const apres = await A.p.evaluate(() => window.__app.pages.map(p => window.__app.tableau.formesDe(p).size))
C.verifier('Juste après l\'ouverture, Ctrl + Z (×5) n\'efface rien du tableau ouvert', JSON.stringify(avant) === JSON.stringify(apres), { avant, apres })

// Le film élève : le même depuis le tableau ouvert que depuis le document du fichier
const filmOuvert = await filmDe(A.p)
const filmFichier = await A.p.evaluate(async b64 => {
  const ex = await import('/src/revoir/exporter.ts'), fi = await import('/src/fichier.ts'), doc = await import('/src/document.ts')
  const o = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
  const { etat } = fi.lireTableau(o)
  const t = new doc.Tableau(null)
  // Le même Yjs que l'application
  const Y = await import(performance.getEntriesByType('resource').map(e => e.name).find(n => /\/deps\/yjs\.js/.test(n)))
  Y.applyUpdate(t.doc, etat)
  const pages = t.ordre.toArray()
  const f = ex.exporter(t, { de: 0, a: t.film.length - 1, pages, titre: 'X' })
  return JSON.stringify({ pages: f.pages, etapes: f.etapes.map(e => ({ ...e, inst: undefined, apres: undefined })), ordre: f.ordre, chapitres: f.chapitres, images: f.images, date: f.date })
}, readFileSync(ORIG).toString('base64'))
C.verifier('Le film élève publié depuis le tableau ouvert = celui du document du fichier (pages, gestes, chapitres, images)', filmOuvert === filmFichier, { l1: filmOuvert.length, l2: filmFichier.length })

// Un simple appui au stylo (le point attend un double-clic), puis Ctrl + S tout de suite
await A.p.evaluate(() => { window.__app.choisirOutil('stylo'); window.showSaveFilePicker = undefined })
const n0 = await A.p.evaluate(() => window.__app.formes.length)
await A.p.mouse.click(250, 650)
const dl = A.p.waitForEvent('download')
await A.p.keyboard.press('Control+s')
const POINT = F + '/point-en-attente.memc'
await (await dl).saveAs(POINT)
const f = C.lireMemc(readFileSync(POINT))
const pageId = await A.p.evaluate(() => window.__app.page)
const nFichier = Object.keys(C.resume(f.doc).pages[pageId].formes).length
C.verifier('Un point posé juste avant Ctrl + S est dans le fichier', nFichier === n0 + 1, { n0, nFichier })

console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const ko = C.bilan()
await nav.close()
process.exit(ko ? 1 : 0)
