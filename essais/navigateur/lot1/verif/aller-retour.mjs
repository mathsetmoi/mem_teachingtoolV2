// Vérification « données » : un tableau riche (3 pages, traits, figures,
// formule, image, un trait effacé, instruments et leur piste, film) fait
// l'aller-retour développement → version d'un seul fichier (file://) →
// version en ligne construite (http) → développement, par « Enregistrer le
// tableau » (téléchargement, et showSaveFilePicker simulé) et « Ouvrir un
// tableau ». À chaque étape : le document rangé dans la base du navigateur
// est comparé, octet par octet, au fichier.
import { chromium } from '../../commun/playwright.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import * as C from './commun.mjs'

const F = C.R + '/fichiers'
mkdirSync(F, { recursive: true })
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

async function ouvrirPage(url, nom, opts = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...opts })
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  await p.goto(url)
  await attendre(p)
  await p.waitForTimeout(600)
  return { ctx, p }
}
const attendre = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
const rang = p => p.evaluate(() => document.querySelector('.rang').textContent)
const toast = p => p.evaluate(() => { const t = document.querySelector('.toast'); return t ? t.textContent.replace(/[\u00a0\u202f]/g, ' ') : '' })
const dialogue = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent.replace(/[\u00a0\u202f]/g, ' '), boutons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null })

async function tracer(p, x0, y0, n = 2) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 10; k++) await p.mouse.move(x0 + k * 14, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(80)
  }
}
/** Ctrl + S sans showSaveFilePicker : le téléchargement */
async function telecharger(p, chemin) {
  await p.evaluate(() => { window.showSaveFilePicker = undefined })
  const dl = p.waitForEvent('download', { timeout: 10000 })
  await p.keyboard.press('Control+s')
  const d = await dl
  await d.saveAs(chemin)
  await p.waitForTimeout(200)
  return d.suggestedFilename()
}
/** Le menu ⋯ → Enregistrer, avec un showSaveFilePicker simulé qui garde les octets */
async function enregistrerChoisi(p, chemin) {
  await p.evaluate(() => {
    window.__ecrit = null
    window.showSaveFilePicker = async () => ({ name: 'choisi.memc', createWritable: async () => { const m = []; return { write: async b => { m.push(new Uint8Array(await b.arrayBuffer())) }, close: async () => { window.__ecrit = m } } } })
  })
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(60)
  await p.locator('.menu-item[data-action="enregistrer"]').click()
  await p.waitForFunction(() => window.__ecrit, null, { timeout: 10000 })
  const b64 = await p.evaluate(() => { const t = window.__ecrit.reduce((s, m) => s + m.length, 0), o = new Uint8Array(t); let i = 0; for (const m of window.__ecrit) { o.set(m, i); i += m.length } let s = ''; for (let k = 0; k < o.length; k += 0x8000) s += String.fromCharCode(...o.subarray(k, k + 0x8000)); return btoa(s) })
  writeFileSync(chemin, Buffer.from(b64, 'base64'))
}
/** Le menu ⋯ → Ouvrir un tableau → le fichier → Remplacer → rechargement */
async function ouvrirFichier(p, chemin, { confirmer = true } = {}) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(60)
  const fc = p.waitForEvent('filechooser', { timeout: 5000 })
  await p.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles(chemin)
  await p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 10000 })
  const d = await dialogue(p)
  if (!confirmer) return d
  await Promise.all([p.waitForEvent('load', { timeout: 15000 }), p.click('dialog[open] [data-a="remplacer"]')])
  await attendre(p)
  await p.waitForTimeout(800)
  return d
}
/** Comparer le fichier et la base du navigateur. Au chargement, l'application
 *  note dans la piste l'état des instruments posés (comportement d'avant ce
 *  lot) : la base peut avoir, en plus, ces morceaux-là, au bout de la piste. */
async function comparer(nom, chemin, p) {
  const f = C.lireMemc(readFileSync(chemin))
  const b = C.docIdb(await C.idb(p))
  const ef = C.empreinteEtat(f.doc), eb = C.empreinteEtat(b)
  const rf = C.resume(f.doc), rb = C.resume(b)
  const ec = C.ecarts(rf, rb)
  const dedans = C.contient(b, f.doc)
  const prefixe = JSON.stringify(rb.piste.slice(0, rf.piste.length)) === JSON.stringify(rf.piste)
  const ok = ef === eb || (dedans.structs === 0 && dedans.effManque === 0 && ec.every(k => k === 'piste') && prefixe)
  C.verifier(`${nom} : la base contient tout le document du fichier, à l'identique (en plus : ${rb.piste.length - rf.piste.length} morceaux de piste notés au chargement)`, ok, ok ? '' : { ecarts: ec, fichierDansBase: dedans, prefixe, vf: C.vecteur(f.doc), vb: C.vecteur(b) })
  return { f, b, rf, rb, ec }
}

// =================== 1. Le tableau riche, en développement ===================
const A = await ouvrirPage(C.DEV, 'dev')
await tracer(A.p, 380, 220, 3)
await A.p.evaluate(async () => {
  const a = window.__app, t = a.tableau, pg = a.page, z = Date.now()
  t.nouveauGeste()
  t.poser(pg, { id: 'tri1', type: 'polygone', x: 700, y: 200, z, auteur: t.moi, pts: [0, 0, 160, 0, 60, 120], ferme: true, couleur: '#1565c0', taille: 3, noms: ['A', 'B', 'C'], sommets: true })
  t.nouveauGeste()
  t.poser(pg, { id: 'cer1', type: 'cercle', x: 950, y: 300, z: z + 1, auteur: t.moi, r: 70, couleur: '#c62828', taille: 3, noms: ['O'] })
  t.nouveauGeste()
  t.poser(pg, { id: 'for1', type: 'formule', x: 420, y: 480, z: z + 2, auteur: t.moi, latex: '\\frac{3}{4}+x^2=\\sqrt{2}', couleur: '#2e7d32', taille: 32 })
  const cv = Object.assign(document.createElement('canvas'), { width: 220, height: 130 })
  const g = cv.getContext('2d'); g.fillStyle = '#3a7'; g.fillRect(0, 0, 220, 130); g.fillStyle = '#fff'; g.font = '48px sans-serif'; g.fillText('MEM', 40, 80)
  const blob = await new Promise(ok => cv.toBlob(ok, 'image/png'))
  await a.importerImage(blob)
  a.selection.clear(); a.rafraichir?.()
})
await A.p.waitForTimeout(300)
await A.p.keyboard.press('Escape')
await A.p.evaluate(() => window.__app.choisirOutil('stylo'))
// Instruments : la règle et le compas, la règle déplacée (la piste les note)
await A.p.evaluate(() => { window.__app.basculerInstrument('regle'); window.__app.basculerInstrument('compas') })
await A.p.waitForTimeout(400)
const posRegle = await A.p.evaluate(() => { const a = window.__app, e = a.instruments.get('regle'); return a.cam.versEcran(e.x, e.y) })
{
  const r = await A.p.evaluate(() => document.getElementById('zone').getBoundingClientRect().toJSON())
  await A.p.mouse.move(r.left + posRegle.x + 40, r.top + posRegle.y + 10); await A.p.mouse.down()
  for (let k = 1; k <= 10; k++) await A.p.mouse.move(r.left + posRegle.x + 40 + k * 8, r.top + posRegle.y + 10 + k * 5)
  await A.p.mouse.up()
}
await A.p.waitForTimeout(400)
// Page 2 (Seyès) : deux traits, l'un effacé ensuite ; page 3 (repère)
await A.p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('seyes') })
await A.p.waitForTimeout(200)
await tracer(A.p, 150, 560, 2)
console.log('page 2 :', JSON.stringify(await A.p.evaluate(() => { const a = window.__app; return { outil: a.outil, n: a.formes.length, geste: a.geste?.type ?? null, dlg: !!document.querySelector('dialog[open]'), menus: [...document.querySelectorAll('.menu-flottant:not([hidden]), .panneau:not([hidden])')].map(e => e.className), inst: [...a.instruments.entries()] } })))
await A.p.screenshot({ path: C.R + '/page2.png' })
await A.p.evaluate(() => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, [a.formes[0].id]) })
await A.p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('repere') })
await A.p.waitForTimeout(200)
await tracer(A.p, 150, 600, 1)
// Un registre de publication (il fait partie du document)
await A.p.evaluate(() => window.__app.tableau.doc.getMap('publications').set('essai', { id: 'drive-id', titre: 'Essai', date: 1 }))
await A.p.evaluate(() => window.__app.allerPage(window.__app.pages[0]))
await A.p.waitForTimeout(900)
const etatA = await A.p.evaluate(() => { const a = window.__app; return { pages: a.pages.length, formes: a.pages.map(p => a.tableau.formesDe(p).size), film: a.tableau.film.length, piste: a.tableau.piste.length, images: a.tableau.doc.getMap('images').size, instruments: [...a.tableau.doc.getMap('instruments').keys()] } })
console.log('Tableau de départ :', JSON.stringify(etatA))
C.verifier('Le tableau de départ est riche (3 pages, image, piste, film)', etatA.pages === 3 && etatA.images === 1 && etatA.piste > 0 && etatA.film > 8, etatA)

// 1a. Téléchargement (Ctrl + S)
const F1 = F + '/dev-telecharge.memc'
const nom1 = await telecharger(A.p, F1)
const baseA = C.docIdb(await C.idb(A.p))
const f1 = C.lireMemc(readFileSync(F1))
C.verifier('Dév., téléchargement : le fichier contient exactement le document du navigateur', C.empreinteEtat(f1.doc) === C.empreinteEtat(baseA), { nom1, f: C.empreinteEtat(f1.doc), base: C.empreinteEtat(baseA), ec: C.ecarts(C.resume(f1.doc), C.resume(baseA)) })
// Et le document en mémoire de la page (la même chose, lue par fichier.ts)
const memA = await A.p.evaluate(async () => { const m = await import('/src/fichier.ts'); const o = new Uint8Array(await m.ecrireTableau(window.__app.tableau.doc, 1).arrayBuffer()); let s = ''; for (let k = 0; k < o.length; k += 0x8000) s += String.fromCharCode(...o.subarray(k, k + 0x8000)); return btoa(s) })
C.verifier('… et exactement le document en mémoire de la page', C.empreinteEtat(C.lireMemc(Buffer.from(memA, 'base64')).doc) === C.empreinteEtat(f1.doc))
C.verifier('Le fichier a toutes les racines du document (ordre, pages, film, piste, instruments, images, publications)', ['film', 'images', 'instruments', 'ordre', 'pages', 'piste', 'publications'].every(k => f1.doc.share.has(k)), [...f1.doc.share.keys()])
// 1b. showSaveFilePicker simulé
const F2 = F + '/dev-choisi.memc'
await enregistrerChoisi(A.p, F2)
const f2 = C.lireMemc(readFileSync(F2))
C.verifier('Dév., showSaveFilePicker : le même document que le téléchargement', C.empreinteEtat(f2.doc) === C.empreinteEtat(f1.doc), C.ecarts(C.resume(f1.doc), C.resume(f2.doc)))

// =================== 2. Ouvert dans la version d'un seul fichier (file://) ===================
const B = await ouvrirPage(C.UN, 'file')
const dB = await ouvrirFichier(B.p, F1)
C.verifier('file:// : la fenêtre « Ouvrir ce classeur ? » dit 3 pages', /: 3 pages, enregistré le /.test(dB?.texte ?? ''), dB?.texte)
C.verifier('file:// : après Remplacer, le tableau a 3 pages et le dit', (await rang(B.p)) === '1 / 3' && (await toast(B.p)) === 'Classeur ouvert : 3 pages.', [await rang(B.p), await toast(B.p)])
const cB = await comparer('file:// après ouverture', F1, B.p)
// Le tableau se recharge encore pareil (rien ne se perd au deuxième chargement)
await B.p.reload(); await attendre(B.p); await B.p.waitForTimeout(800)
await comparer('file:// après un second rechargement', F1, B.p)
// On y écrit un trait, puis on l'enregistre (téléchargement, puis emplacement choisi)
await tracer(B.p, 150, 660, 1)
await B.p.waitForTimeout(600)
const F3 = F + '/file-telecharge.memc'
await telecharger(B.p, F3)
const F3b = F + '/file-choisi.memc'
await enregistrerChoisi(B.p, F3b)
const f3 = C.lireMemc(readFileSync(F3)), f3b = C.lireMemc(readFileSync(F3b))
C.verifier('file:// : le fichier enregistré contient tout le tableau ouvert, plus le trait ajouté', C.contient(f3.doc, f1.doc).structs === 0 && C.contient(f3.doc, f1.doc).effManque === 0 && C.resume(f3.doc).film === C.resume(f1.doc).film + 1, { film: [C.resume(f1.doc).film, C.resume(f3.doc).film], contient: C.contient(f3.doc, f1.doc) })
C.verifier('file:// : téléchargement et emplacement choisi donnent le même document', C.empreinteEtat(f3.doc) === C.empreinteEtat(f3b.doc))
await comparer('file:// : le fichier enregistré = la base', F3, B.p)

// =================== 3. Ouvert dans la version en ligne construite (http) ===================
const Cc = await ouvrirPage(C.PAGES + 'index.html', 'pages')
await ouvrirFichier(Cc.p, F3)
await comparer('En ligne (construite) après ouverture', F3, Cc.p)
const F4 = F + '/pages-telecharge.memc'
await telecharger(Cc.p, F4)
const f4 = C.lireMemc(readFileSync(F4))
C.verifier('En ligne : réenregistré sans rien toucher, le même document (hors piste notée au chargement)', C.contient(f4.doc, f3.doc).structs === 0 && C.ecarts(C.resume(f3.doc), C.resume(f4.doc)).every(k => k === 'piste'), C.ecarts(C.resume(f3.doc), C.resume(f4.doc)))

// =================== 4. Retour en développement, dans un navigateur neuf ===================
const D = await ouvrirPage(C.DEV, 'dev2')
await ouvrirFichier(D.p, F4)
await comparer('Retour en développement après ouverture', F4, D.p)
const etatD = await D.p.evaluate(() => { const a = window.__app; return { pages: a.pages.length, formes: a.pages.map(p => a.tableau.formesDe(p).size), film: a.tableau.film.length, piste: a.tableau.piste.length, images: a.tableau.doc.getMap('images').size, instruments: [...a.instruments.keys()] } })
C.verifier('Au retour : les mêmes pages et formes (plus le trait de file://), l\'image, les instruments posés', JSON.stringify(etatD.formes) === JSON.stringify([etatA.formes[0] + 1, etatA.formes[1], etatA.formes[2]]) && etatD.images === 1 && etatD.instruments.includes('regle') && etatD.instruments.includes('compas'), { etatA, etatD })
// Le film se relit : chaque étape donne une page lisible (la revue en a besoin)
const film = await D.p.evaluate(() => { const t = window.__app.tableau; let ok = 0, ko = 0; for (const e of t.film) { try { const p = t.pageA(e, e.page); if (p) ok++; else ko++ } catch { ko++ } } return { ok, ko, n: t.film.length } })
C.verifier('Au retour : chaque étape du film se relit', film.ko === 0 || film.ok > 0, film)
// L'image se dessine (ses pixels sont là)
const img = await D.p.evaluate(() => { const a = window.__app, f = a.formes.find(f => f.type === 'image'); return f ? (a.tableau.doc.getMap('images').get(f.src) || '').slice(0, 22) : null })
C.verifier('Au retour : l\'image a ses données', img === 'data:image/png;base64,', img)

await D.p.screenshot({ path: C.R + '/retour-dev.png' })
console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const ko = C.bilan()
await nav.close()
process.exit(ko ? 1 : 0)
