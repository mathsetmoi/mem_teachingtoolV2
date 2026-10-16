// Deux onglets sur le même tableau, dans la version d'un seul fichier
// (file://, la clé USB) et dans la version en ligne construite : l'un ouvre
// un .memc ; l'autre doit cesser d'écrire, sinon il mêle l'ancien tableau au
// nouveau dans la base.
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
const dialogue = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, boutons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null })
async function tracer(p, x0, y0, n = 1) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 10; k++) await p.mouse.move(x0 + k * 14, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(80)
  }
}
const FICHIER = F + '/ref.memc'
const ref = C.lireMemc(readFileSync(FICHIER))
for (const [nom, url] of [['file://', C.UN], ['en ligne', C.PAGES + 'index.html']]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const a = await ctx.newPage(); a.on('pageerror', e => erreurs.push(`${nom} A: ${e.message}`))
  await a.goto(url); await attendre(a); await a.waitForTimeout(500)
  await tracer(a, 200, 500, 2); await a.waitForTimeout(400)
  const b = await ctx.newPage(); b.on('pageerror', e => erreurs.push(`${nom} B: ${e.message}`))
  await b.goto(url); await attendre(b); await b.waitForTimeout(500)
  const canal = await b.evaluate(() => typeof BroadcastChannel)
  // A ouvre le fichier
  await a.bringToFront()
  await a.click('.barre-haut .bouton.points'); await a.waitForTimeout(60)
  const fc = a.waitForEvent('filechooser')
  await a.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles(FICHIER)
  await a.waitForSelector('dialog[open] [data-a="remplacer"]')
  await Promise.all([a.waitForEvent('load'), a.click('dialog[open] [data-a="remplacer"]')])
  await attendre(a); await a.waitForTimeout(500)
  const dB = await dialogue(b)
  C.verifier(`${nom} : l'autre onglet l'apprend (« Le classeur a changé », Recharger)`, dB?.titre === 'Le classeur a changé', { canal, dB })
  // B essaie d'écrire (s'il n'est pas bloqué)
  await b.bringToFront()
  await tracer(b, 300, 300, 2); await b.waitForTimeout(600)
  // La base : le tableau du fichier, sans rien de l'ancien
  const base = C.docIdb(await C.idb(a))
  const pend = !!(base.store.pendingStructs || base.store.pendingDs)
  const dedans = C.contient(base, ref.doc)
  C.verifier(`${nom} : la base ne contient que le tableau du fichier (rien de l'onglet resté ouvert)`, !pend && dedans.structs === 0 && C.ecarts(C.resume(ref.doc), C.resume(base)).every(k => k === 'piste'), { pend, ecarts: C.ecarts(C.resume(ref.doc), C.resume(base)), formes: Object.values(C.resume(base).pages).map(p => Object.keys(p.formes || {}).length) })
  await ctx.close()
}
console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const ko = C.bilan()
await nav.close()
process.exit(ko ? 1 : 0)
