// Vérification « données », cas limites : fichier abîmé (un octet changé,
// tronqué), vide, en-tête seul, énorme (valide et non valide), renoncer à
// l'ouverture (Annuler, Échap, clic à côté, choix de fichier fermé),
// « Enregistrer d'abord » puis Remplacer.
import { chromium } from '../../commun/playwright.mjs'
import { readFileSync, writeFileSync, mkdirSync, openSync, ftruncateSync, closeSync, statSync } from 'node:fs'
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
const norm = t => (t || '').replace(/[  ]/g, ' ')
async function ouvrirPage(url, nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('crash', () => erreurs.push(`${nom}: L'ONGLET A PLANTÉ`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  await p.goto(url)
  await attendre(p)
  await p.waitForTimeout(600)
  return { ctx, p }
}
const attendre = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
const toast = p => p.evaluate(() => (document.querySelector('.toast')?.textContent || '').replace(/[  ]/g, ' '))
const dialogue = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, texte: (d.querySelector('p')?.textContent || '').replace(/[  ]/g, ' '), boutons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null })
async function choisir(p, chemin) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(60)
  const fc = p.waitForEvent('filechooser', { timeout: 5000 })
  await p.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles(chemin)
}
async function tracer(p, x0, y0, n = 2) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 10; k++) await p.mouse.move(x0 + k * 14, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(80)
  }
}
const empreinteBase = async p => C.empreinteEtat(C.docIdb(await C.idb(p)))

// ---------- Le fichier de référence : trois traits ----------
const A = await ouvrirPage(C.DEV, 'A')
await tracer(A.p, 260, 100, 3)
await A.p.waitForTimeout(600)
const REF = F + '/ref.memc'
await A.p.evaluate(() => { window.showSaveFilePicker = undefined })
{
  const dl = A.p.waitForEvent('download'); await A.p.keyboard.press('Control+s'); await (await dl).saveAs(REF)
}
const ref = C.lireMemc(readFileSync(REF))
const refTraits = Object.values(C.resume(ref.doc).pages)[0].formes
console.log('Référence :', Object.values(refTraits).map(f => `${f.id} x=${f.x}`).join(', '))

// ---------- 1. Un octet changé : le fichier passe-t-il pour bon ? ----------
// On cherche un octet du corps compressé dont le changement modifie un trait
// sans faire échouer la lecture (même lecture que lireTableau, sous Node)
const { gunzipSync } = await import('fflate')
const o = new Uint8Array(readFileSync(REF)), fin = o.indexOf(0x0a)
let abime = null
for (let pos = fin + 11; pos < o.length - 8 && !abime; pos++) for (let b = 0; b < 8 && !abime; b++) {
  const c = o.slice(); c[pos] ^= 1 << b
  try {
    const d = new C.Y.Doc({ gc: false }); C.Y.applyUpdate(d, gunzipSync(c.subarray(fin + 1)))
    if (d.store.pendingStructs || d.store.pendingDs || !d.getArray('ordre').length) continue
    const fs = Object.values(C.resume(d).pages)[0]?.formes || {}
    const change = Object.values(refTraits).find(f => fs[f.id] && fs[f.id].type === 'trait' && fs[f.id].x !== f.x && Number.isFinite(fs[f.id].x))
    if (change) abime = { pos, b, c, id: change.id, avant: change.x, apres: fs[change.id].x }
  } catch { /* refusé : on continue */ }
}
const ABIME = F + '/abime-un-octet.memc'
writeFileSync(ABIME, abime.c)
console.log('Octet changé :', abime.pos, 'bit', abime.b, '→ trait', abime.id, 'x', abime.avant, '→', abime.apres)
{
  const B = await ouvrirPage(C.DEV, 'B-abime')
  await choisir(B.p, ABIME)
  await B.p.waitForTimeout(500)
  const d = await dialogue(B.p), t = await toast(B.p)
  C.verifier('Un fichier abîmé (un octet changé dans les données compressées) est refusé', !d && /abîmé/.test(t), { dialogue: d, toast: t })
  if (d) {
    await Promise.all([B.p.waitForEvent('load'), B.p.click('dialog[open] [data-a="remplacer"]')])
    await attendre(B.p); await B.p.waitForTimeout(500)
    const x = await B.p.evaluate(id => window.__app.formes.find(f => f.id === id)?.x, abime.id)
    console.log(`  → ouvert sans un mot : le trait ${abime.id} est maintenant à x = ${x} (il était à ${abime.avant})`)
    await B.p.screenshot({ path: C.R + '/abime-ouvert.png' })
  }
  await B.ctx.close()
}

// ---------- 2. Tronqué, vide, en-tête seul, gzip faux ----------
const cas = [
  ['tronque.memc', o.subarray(0, Math.floor(o.length * 0.7)), /abîmé/],
  ['tronque-fin.memc', o.subarray(0, o.length - 3), /abîmé/],
  ['vide.memc', new Uint8Array(0), /n'est pas un classeur enregistré par MEM teachingtool/],
  ['entete-seul.memc', o.subarray(0, fin + 1), /abîmé/],
  ['entete-sans-saut.memc', o.subarray(0, fin), /n'est pas un classeur enregistré/],
  ['texte.memc', new TextEncoder().encode('bonjour'), /n'est pas un classeur enregistré/],
  ['plus-recent.memc', new Uint8Array([...new TextEncoder().encode('{"format":"mem-tableau","v":2,"app":"MEM teachingtool","date":1,"pages":1}\n'), ...o.subarray(fin + 1)]), /version plus récente/],
]
{
  const B = await ouvrirPage(C.DEV, 'B-cas')
  const avant = await empreinteBase(B.p)
  for (const [nom, octets, attendu] of cas) {
    writeFileSync(F + '/' + nom, octets)
    await B.p.evaluate(() => { const t = document.querySelector('.toast'); t.textContent = ''; t.classList.remove('visible') })
    await choisir(B.p, F + '/' + nom)
    await B.p.waitForTimeout(400)
    const d = await dialogue(B.p), t = await toast(B.p)
    C.verifier(`${nom} : refusé avec une phrase claire, sans fenêtre`, !d && attendu.test(t), { t, d })
  }
  C.verifier('Après ces refus, le tableau du navigateur n\'a pas changé', (await empreinteBase(B.p)) === avant)
  await B.ctx.close()
}

// ---------- 3. Renoncer : Annuler, Échap, clic à côté, choix fermé ----------
{
  const B = await ouvrirPage(C.DEV, 'B-renonce')
  await tracer(B.p, 300, 500, 1); await B.p.waitForTimeout(500)
  const avant = await empreinteBase(B.p)
  let recharge = 0
  B.p.on('load', () => recharge++)
  for (const facon of ['annuler', 'echap', 'cote']) {
    await choisir(B.p, REF)
    await B.p.waitForSelector('dialog[open] [data-a="remplacer"]')
    if (facon === 'annuler') await B.p.click('dialog[open] [data-a="annuler"]')
    else if (facon === 'echap') await B.p.keyboard.press('Escape')
    else { const r = await B.p.evaluate(() => document.querySelector('dialog[open]').getBoundingClientRect().toJSON()); await B.p.mouse.click(Math.max(5, r.left - 30), r.top + 10) }
    await B.p.waitForTimeout(400)
    C.verifier(`Renoncer (${facon}) : la fenêtre se ferme, rien ne change, pas de rechargement`, !(await dialogue(B.p)) && recharge === 0 && (await empreinteBase(B.p)) === avant && (await B.p.evaluate(() => window.__app.pages.length)) === 1)
  }
  // Le choix de fichier fermé sans rien choisir
  await B.p.click('.barre-haut .bouton.points'); await B.p.waitForTimeout(60)
  const fc = B.p.waitForEvent('filechooser')
  await B.p.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles([])
  await B.p.waitForTimeout(300)
  C.verifier('Choix de fichier fermé sans rien choisir : rien ne se passe', !(await dialogue(B.p)) && (await empreinteBase(B.p)) === avant)
  // On écrit encore après avoir renoncé : ça s'enregistre
  await tracer(B.p, 300, 600, 1); await B.p.waitForTimeout(500)
  await B.p.reload(); await attendre(B.p); await B.p.waitForTimeout(400)
  C.verifier('Après avoir renoncé, ce qu\'on écrit s\'enregistre encore', (await B.p.evaluate(() => window.__app.formes.length)) === 2)
  // « Enregistrer d'abord », puis Remplacer : le fichier d'avant contient le tableau d'avant
  const avant2 = C.docIdb(await C.idb(B.p))
  await choisir(B.p, REF)
  await B.p.waitForSelector('dialog[open] [data-a="enregistrer"]')
  await B.p.evaluate(() => { window.showSaveFilePicker = undefined })
  const dl = B.p.waitForEvent('download')
  await B.p.click('dialog[open] [data-a="enregistrer"]')
  const AVANT = F + '/enregistre-avant.memc'
  await (await dl).saveAs(AVANT)
  await B.p.waitForTimeout(300)
  const d = await dialogue(B.p)
  C.verifier('« Enregistrer d\'abord » : le fichier est le tableau d\'avant, la fenêtre reste ouverte', d && d.boutons.includes('Enregistré ✓') && C.empreinteEtat(C.lireMemc(readFileSync(AVANT)).doc) === C.empreinteEtat(avant2), d?.boutons)
  await Promise.all([B.p.waitForEvent('load'), B.p.click('dialog[open] [data-a="remplacer"]')])
  await attendre(B.p); await B.p.waitForTimeout(500)
  C.verifier('… puis Remplacer : le tableau du fichier est là', (await B.p.evaluate(() => window.__app.formes.length)) === 3)
  await B.ctx.close()
}

// ---------- 4. Énorme : un tableau de 40 images ----------
{
  const G = await ouvrirPage(C.DEV, 'G')
  const t0 = Date.now()
  const n = await G.p.evaluate(async () => {
    const a = window.__app
    for (let i = 0; i < 40; i++) {
      // Du bruit : le JPEG ne se compresse presque pas
      const cv = Object.assign(document.createElement('canvas'), { width: 1600, height: 1200 })
      const g = cv.getContext('2d'), im = g.createImageData(1600, 1200)
      for (let k = 0; k < im.data.length; k++) im.data[k] = (k % 4 === 3) ? 255 : (Math.random() * 256) | 0
      g.putImageData(im, 0, 0)
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.9))
      await a.importerImage(blob)
      if (i % 10 === 9) a.nouvellePage()
    }
    let s = 0; for (const v of a.tableau.doc.getMap('images').values()) s += v.length
    return { images: a.tableau.doc.getMap('images').size, octets: s, pages: a.pages.length }
  })
  console.log('Tableau énorme :', JSON.stringify(n), `${Date.now() - t0} ms`)
  await G.p.waitForTimeout(1500)
  await G.p.evaluate(() => { window.showSaveFilePicker = undefined })
  const GROS = F + '/gros.memc'
  const t1 = Date.now()
  const dl = G.p.waitForEvent('download', { timeout: 120000 })
  await G.p.keyboard.press('Control+s')
  await (await dl).saveAs(GROS)
  const tEnr = Date.now() - t1
  const taille = statSync(GROS).size
  await G.p.waitForTimeout(300)
  // (Adapté au morceau K3 du lot 5 : le message qui suit l'import d'une image
  // porte le bouton « Fixer en fond » et reste donc 7 s, sur sa propre ligne,
  // avec le message suivant ; on lit la ligne de l'enregistrement)
  const t = (await G.p.evaluate(() => [...document.querySelectorAll('.toast .ligne')].map(l => l.textContent || '').find(x => x.startsWith('Classeur enregistré'))
    ?? document.querySelector('.toast')?.textContent ?? '')).replace(/[\u00a0\u202f]/g, ' ')
  C.verifier(`Énorme (${(taille / 1e6).toFixed(1)} Mo) : enregistré, le message dit la taille`, /^Classeur enregistré : .*\(\d+ Mo\)\.$/.test(t), { t, tEnr })
  const fg = C.lireMemc(readFileSync(GROS))
  C.verifier('Énorme : le fichier contient tout le document', C.empreinteEtat(fg.doc) === C.empreinteEtat(C.docIdb(await C.idb(G.p))))
  await G.ctx.close()
  // On l'ouvre dans un navigateur neuf
  const H = await ouvrirPage(C.DEV, 'H')
  const t2 = Date.now()
  await choisir(H.p, GROS)
  await H.p.waitForTimeout(30)
  const lecture = await toast(H.p)
  await H.p.waitForSelector('dialog[open] [data-a="remplacer"]', { timeout: 60000 })
  const tLire = Date.now() - t2
  C.verifier('Énorme : « Lecture du fichier… » s\'affiche, puis la fenêtre de confirmation', /Lecture du fichier/.test(lecture), { lecture, tLire })
  const t3 = Date.now()
  await Promise.all([H.p.waitForEvent('load', { timeout: 120000 }), H.p.click('dialog[open] [data-a="remplacer"]')])
  await attendre(H.p); await H.p.waitForTimeout(1500)
  const tRemp = Date.now() - t3
  const r = await H.p.evaluate(() => ({ images: window.__app.tableau.doc.getMap('images').size, pages: window.__app.pages.length }))
  C.verifier('Énorme : ouvert, les 40 images et les pages sont là', r.images === 40 && r.pages === n.pages, { r, tLire, tRemp })
  console.log(`  temps : enregistrer ${tEnr} ms, lire ${tLire} ms, remplacer + recharger ${tRemp} ms`)
  // Un très gros fichier qui n'est pas un tableau (300 Mo de zéros)
  const FAUX = F + '/faux-gros.memc'
  const fd = openSync(FAUX, 'w'); ftruncateSync(fd, 300 * 1024 * 1024); closeSync(fd)
  const t4 = Date.now()
  await H.p.evaluate(() => { const t = document.querySelector('.toast'); t.textContent = ''; t.classList.remove('visible') })
  await choisir(H.p, FAUX)
  await H.p.waitForFunction(() => /n'est pas un tableau/.test(document.querySelector('.toast')?.textContent || ''), null, { timeout: 60000 }).catch(() => {})
  const tf = await toast(H.p)
  C.verifier('300 Mo de zéros nommés .memc : refusé clairement, sans planter l\'onglet', /n'est pas un classeur enregistré/.test(tf), { tf, ms: Date.now() - t4 })
  await H.ctx.close()
}

console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const ko = C.bilan()
await nav.close()
process.exit(ko ? 1 : 0)
