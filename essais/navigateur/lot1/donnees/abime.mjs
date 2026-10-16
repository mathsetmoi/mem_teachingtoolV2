// Corrections « données » du lot 1 : un .memc abîmé d'un seul bit est
// refusé (somme CRC-32 et taille de la fin du gzip vérifiées, pages de
// l'ordre présentes avec leurs formes), sans toucher à la page du
// navigateur ; un bon fichier s'ouvre toujours, en ligne et en file://.
// Serveur de développement sur :5173 ; « npm run build » fait avant (dist/).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import { chromium } from '../../commun/playwright.mjs'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import * as Y from 'yjs'
import { gunzipSync, gzipSync, strToU8 } from 'fflate'

const URL0 = 'http://localhost:5173/'
const UN_FICHIER = `file://${RACINE_DEPOT}/dist/index.html`
const D = `${RACINE_ESSAIS}/lot1/donnees`
const F = D + '/fichiers'
const ABIME = 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  page.on('crash', () => erreurs.push(`${nom}: L'ONGLET A PLANTÉ`))
}
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
const nbsp = t => (t || '').replace(/[\u00a0\u202f]/g, ' ')
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
async function ouvrir(url, nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const p = await ctx.newPage(); surveiller(p, nom)
  await p.goto(url); await pret(p); await p.waitForTimeout(800)
  return { ctx, p }
}
const TOAST = () => (document.querySelector('.toast')?.textContent || '').replace(/[\u00a0\u202f]/g, ' ')
const DIALOGUE = () => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, texte: (d.querySelector('p')?.textContent || '').replace(/[\u00a0\u202f]/g, ' ') } : null }
const RANG = () => document.querySelector('.rang')?.textContent
async function tracer(p, x0, y0, n = 3) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 8; k++) await p.mouse.move(x0 + k * 15, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(60)
  }
}
async function choisir(p, chemin) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(80)
  const fc = p.waitForEvent('filechooser', { timeout: 5000 })
  await p.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles(chemin)
}
const glisser = (p, nom, octets) => p.evaluate(([nom, o]) => {
  const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], nom))
  const z = document.getElementById('zone'), r = z.getBoundingClientRect()
  const ev = new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.left + 400, clientY: r.top + 300 })
  z.dispatchEvent(ev)
  return ev.defaultPrevented
}, [nom, [...octets]])
/** Un gros .memc (40 images de bruit, environ 53 Mo), enregistré par l'outil (Ctrl + S) */
async function fabriquerGros(chemin) {
  const G = await ouvrir(URL0, 'G-gros')
  await G.p.evaluate(async () => {
    const a = window.__app
    for (let i = 0; i < 40; i++) {
      const cv = Object.assign(document.createElement('canvas'), { width: 1600, height: 1200 })
      const g = cv.getContext('2d'), im = g.createImageData(1600, 1200)
      for (let k = 0; k < im.data.length; k++) im.data[k] = (k % 4 === 3) ? 255 : (Math.random() * 256) | 0
      g.putImageData(im, 0, 0)
      const blob = await new Promise(ok => cv.toBlob(ok, 'image/jpeg', 0.9))
      await a.importerImage(blob)
      if (i % 10 === 9) a.nouvellePage()
    }
  })
  await G.p.waitForTimeout(1500)
  await G.p.evaluate(() => { window.showSaveFilePicker = undefined })
  const dl = G.p.waitForEvent('download', { timeout: 120000 })
  await G.p.keyboard.press('Control+s')
  await (await dl).saveAs(chemin)
  await G.ctx.close()
}
/** Les mises à jour de la base du navigateur, mises bout à bout : ce qui est enregistré */
const BASE = async p => p.evaluate(async () => {
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('mem-tableau-local'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  const tout = await new Promise((ok, ko) => { const r = db.transaction(['updates'], 'readonly').objectStore('updates').getAll(); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error) })
  db.close()
  return tout.map(u => [...u].join(',')).join(';')
})

/** La lecture d'avant la correction (gunzipSync seul, sans la fin du gzip) */
function lectureAncienne(o) {
  const fin = o.indexOf(0x0a)
  const d = new Y.Doc({ gc: false })
  try {
    Y.applyUpdate(d, gunzipSync(o.subarray(fin + 1)))
    if (d.store.pendingStructs || d.store.pendingDs || !d.getArray('ordre').length) return null
    return d
  } catch { return null }
}

// =============== 1. Le fichier de référence ===============
const A = await ouvrir(URL0, 'A')
await tracer(A.p, 260, 120, 3)
await A.p.waitForTimeout(500)
await A.p.evaluate(() => { window.showSaveFilePicker = undefined })
const REF = F + '/ref-donnees.memc'
{ const dl = A.p.waitForEvent('download'); await A.p.keyboard.press('Control+s'); await (await dl).saveAs(REF) }
await A.p.waitForTimeout(300)
const ref = new Uint8Array(readFileSync(REF)), finRef = ref.indexOf(0x0a)
const etatRef = gunzipSync(ref.subarray(finRef + 1))
console.log(`Référence : ${ref.length} octets, ${etatRef.length} décompressés`)

// Un bit qui, avant la correction, passait pour bon avec un contenu changé
let trouve = null
for (let i = finRef + 11; i < ref.length - 8 && !trouve; i++) for (let b = 0; b < 8 && !trouve; b++) {
  const c = ref.slice(); c[i] ^= 1 << b
  const d = lectureAncienne(c)
  if (d && Buffer.compare(Buffer.from(Y.encodeStateAsUpdate(d)), Buffer.from(Y.encodeStateAsUpdate((() => { const r = new Y.Doc({ gc: false }); Y.applyUpdate(r, etatRef); return r })()))) !== 0) trouve = { i, b, c }
}
verifier('Avant la correction, un bit changé passait pour bon (la lecture sans la fin du gzip l\'accepte)', !!trouve, trouve ? `octet ${trouve.i}, bit ${trouve.b}` : 'aucun trouvé')
const ABIME_REF = F + '/ref-abime.memc'
if (trouve) writeFileSync(ABIME_REF, trouve.c)
// La taille annoncée, au bit du haut changé (2 Go de plus) : refusée avant d'être réservée
const grand = ref.slice(); grand[grand.length - 1] ^= 0x80
writeFileSync(F + '/ref-taille.memc', grand)
// Une racine au nom changé, avec une somme juste (un fichier fait ailleurs) : l'ordre nomme des pages absentes
{
  const d = new Y.Doc({ gc: false }); d.getArray('ordre').push(['a', 'b'])
  const p = new Y.Map(); p.set('fond', 'blanc'); p.set('formes', new Y.Map()); d.getMap('pagez').set('a', p)
  writeFileSync(F + '/sans-pages.memc', new Uint8Array([...strToU8('{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":1,"pages":2}\n'), ...gzipSync(Y.encodeStateAsUpdate(d))]))
}

// =============== 2. Tous les bits, dans le navigateur, avec le vrai lireTableau ===============
{
  const r = await A.p.evaluate(async ([o, juste]) => {
    const m = await import('/src/fichier.ts')
    o = new Uint8Array(o); juste = new Uint8Array(juste)
    const fin = o.indexOf(0x0a)
    const s = { essais: 0, refuses: 0, pareils: 0, alteres: [], autres: [] }
    for (let i = fin + 1; i < o.length; i++) for (let b = 0; b < 8; b++) {
      const c = o.slice(); c[i] ^= 1 << b; s.essais++
      try {
        const e = m.lireTableau(c).etat
        if (e.length === juste.length && e.every((x, k) => x === juste[k])) s.pareils++; else s.alteres.push(`${i}:${b}`)
      } catch (e) { if (e.message === 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.') s.refuses++; else s.autres.push(`${i}:${b} ${e.message}`) }
    }
    return s
  }, [[...ref], [...etatRef]])
  verifier(`Chaque bit du corps compressé changé (${r.essais} essais) : refusé « abîmé », ou le même tableau`, !r.alteres.length && !r.autres.length && r.refuses > r.essais * 0.9,
    { refuses: r.refuses, pareils: r.pareils, alteres: r.alteres.slice(0, 5), autres: r.autres.slice(0, 3) })
}
{
  // Un tableau de 3 pages avec une image : 1500 bits au hasard
  const o = new Uint8Array(readFileSync(F + '/dev-telecharge.memc'))
  const r = await A.p.evaluate(async ([o]) => {
    const m = await import('/src/fichier.ts')
    o = new Uint8Array(o)
    const fin = o.indexOf(0x0a), juste = m.lireTableau(o).etat
    let graine = 4242
    const hasard = () => { graine = (graine * 1103515245 + 12345) & 0x7fffffff; return graine / 0x7fffffff }
    const s = { refuses: 0, pareils: 0, alteres: 0 }
    for (let n = 0; n < 1500; n++) {
      const c = o.slice(); c[fin + 1 + Math.floor(hasard() * (o.length - fin - 1))] ^= 1 << Math.floor(hasard() * 8)
      try { const e = m.lireTableau(c).etat; if (e.length === juste.length && e.every((x, k) => x === juste[k])) s.pareils++; else s.alteres++ } catch { s.refuses++ }
    }
    return s
  }, [[...o]])
  verifier('3 pages et une image, 1500 bits au hasard : aucun tableau altéré accepté', r.alteres === 0 && r.refuses > 1400, r)
}

// =============== 3. Ouvrir un fichier abîmé : refusé, le tableau n'a pas changé ===============
const cas = [
  ['ref-abime.memc', 'un bit qui passait avant (trait déplacé)'],
  ['abime-un-octet.memc', 'le fichier du rapport (x 140 → 162)'],
  ['abime-ordre.memc', 'le fichier du rapport (racine « pages » renommée)'],
  ['abime-1.memc', 'données du rapport n° 1'], ['abime-2.memc', 'n° 2'], ['abime-3.memc', 'n° 3'], ['abime-4.memc', 'n° 4'],
  ['ref-taille.memc', 'taille annoncée de 2 Go de plus'],
  ['sans-pages.memc', 'l\'ordre nomme des pages absentes (somme juste)'],
]
{
  const avant = await BASE(A.p), formes = await A.p.evaluate(() => window.__app.formes.length), rang = await A.p.evaluate(RANG)
  for (const [nom, quoi] of cas) {
    if (!existsSync(F + '/' + nom)) { verifier(`${nom} manque`, false); continue }
    await A.p.evaluate(() => { const t = document.querySelector('.toast'); if (t) t.textContent = '' })
    await choisir(A.p, F + '/' + nom)
    await A.p.waitForTimeout(400)
    const d = await A.p.evaluate(DIALOGUE), t = await A.p.evaluate(TOAST)
    verifier(`Ouvrir ${nom} (${quoi}) : refusé, pas de fenêtre « Ouvrir ce classeur ? »`, !d && t === ABIME, { dialogue: d?.texte, toast: t })
    if (d) { await A.p.click('dialog[open] [data-a="annuler"]'); await A.p.waitForTimeout(100) }
  }
  // Glissé sur le tableau
  await A.p.evaluate(() => { const t = document.querySelector('.toast'); if (t) t.textContent = '' })
  const pris = await glisser(A.p, 'glisse-abime.memc', readFileSync(F + '/abime-ordre.memc'))
  await A.p.waitForTimeout(400)
  verifier('Un .memc abîmé glissé sur le tableau : refusé de même', pris && !(await A.p.evaluate(DIALOGUE)) && (await A.p.evaluate(TOAST)) === ABIME, await A.p.evaluate(TOAST))
  const apres = await BASE(A.p)
  verifier('Le tableau du navigateur n\'a pas changé (base, formes, pages)', apres === avant && (await A.p.evaluate(() => window.__app.formes.length)) === formes && (await A.p.evaluate(RANG)) === rang,
    { formes: await A.p.evaluate(() => window.__app.formes.length), rang: await A.p.evaluate(RANG) })
  // On écrit encore normalement
  await tracer(A.p, 700, 400, 1); await A.p.waitForTimeout(300)
  verifier('On écrit encore normalement après les refus', (await A.p.evaluate(() => window.__app.formes.length)) === formes + 1)
}

// =============== 4. Un bon fichier s'ouvre toujours ===============
{
  const B = await ouvrir(URL0, 'B')
  await choisir(B.p, F + '/dev-telecharge.memc'); await B.p.waitForTimeout(400)
  const d = await B.p.evaluate(DIALOGUE)
  verifier('Un bon .memc de 3 pages : la fenêtre « Ouvrir ce classeur ? » (3 pages)', d?.titre === 'Ouvrir ce classeur ?' && /« dev-telecharge\.memc » : 3 pages/.test(d.texte), d?.texte)
  if (d) {
    await Promise.all([B.p.waitForEvent('load'), B.p.click('dialog[open] [data-a="remplacer"]')])
    await pret(B.p); await B.p.waitForTimeout(600)
    const n = await B.p.evaluate(() => window.__app.pages.length)
    const parPage = []
    for (let i = 0; i < n; i++) {
      await B.p.evaluate(i => window.__app.allerPage(window.__app.pages[i]), i); await B.p.waitForTimeout(120)
      parPage.push(await B.p.evaluate(() => ({ existe: !!window.__app.tableau.formesDe(window.__app.page), formes: window.__app.formes.length })))
    }
    verifier('Après Remplacer : 3 pages, chacune avec ses formes', n === 3 && parPage.every(p => p.existe), parPage)
    await tracer(B.p, 300, 500, 1); await B.p.waitForTimeout(300)
    const f = await B.p.evaluate(() => window.__app.formes.length)
    await B.p.reload(); await pret(B.p); await B.p.waitForTimeout(500)
    verifier('Ce qu\'on y écrit reste (rechargement)', (await B.p.evaluate(() => window.__app.formes.length)) === f && f === parPage[n - 1].formes + 1, { f })
  }
  // Le gros fichier (69 Mo décompressés) : la fenêtre vient, et le temps de la somme.
  // (Rangé dans le dépôt : ce fichier de 53 Mo n'y est pas versionné ; s'il manque,
  // on le fabrique ici comme lot1/verif/cas-limites.mjs fabrique le sien : 40 images
  // de bruit, qui ne se compressent presque pas, puis Ctrl + S. Ignoré par git.)
  if (!existsSync(F + '/gros.memc')) await fabriquerGros(F + '/gros.memc')
  const t0 = Date.now()
  await choisir(B.p, F + '/gros.memc')
  await B.p.waitForFunction(() => document.querySelector('dialog[open]') || /abîmé|pas pu/.test(document.querySelector('.toast')?.textContent || ''), null, { timeout: 60000 })
  const tg = Date.now() - t0
  const dg = await B.p.evaluate(DIALOGUE)
  const tc = await B.p.evaluate(async () => { const m = await import('/src/fichier.ts'); const o = new Uint8Array(69_337_438); for (let i = 0; i < o.length; i += 97) o[i] = i & 255; const t = performance.now(); m.crc32(o); return Math.round(performance.now() - t) })
  verifier('Le gros fichier (53 Mo) s\'ouvre encore : la fenêtre vient', dg?.titre === 'Ouvrir ce classeur ?', `${tg} ms jusqu'à la fenêtre, dont ~${tc} ms pour la somme CRC-32`)
  if (dg) { await B.p.click('dialog[open] [data-a="annuler"]'); await B.p.waitForTimeout(100) }
  await B.ctx.close()
}

// =============== 5. La version d'un seul fichier (file://) ===============
if (existsSync(`${RACINE_DEPOT}/dist/index.html`)) {
  const C = await ouvrir(UN_FICHIER, 'C-file')
  for (const nom of ['ref-abime.memc', 'abime-ordre.memc']) {
    await C.p.evaluate(() => { const t = document.querySelector('.toast'); if (t) t.textContent = '' })
    await choisir(C.p, F + '/' + nom); await C.p.waitForTimeout(400)
    verifier(`file:// : ${nom} refusé « abîmé »`, !(await C.p.evaluate(DIALOGUE)) && (await C.p.evaluate(TOAST)) === ABIME, await C.p.evaluate(TOAST))
  }
  await choisir(C.p, REF); await C.p.waitForTimeout(400)
  const d = await C.p.evaluate(DIALOGUE)
  verifier('file:// : le bon fichier s\'ouvre (la fenêtre, 1 page)', d?.titre === 'Ouvrir ce classeur ?' && /: 1 page,/.test(d.texte), d?.texte)
  if (d) {
    await Promise.all([C.p.waitForEvent('load'), C.p.click('dialog[open] [data-a="remplacer"]')])
    await pret(C.p); await C.p.waitForTimeout(500)
    verifier('file:// : après Remplacer, le tableau ouvert est celui du fichier', (await BASE(C.p)) !== '' && nbsp(await C.p.evaluate(TOAST)).startsWith('Classeur ouvert'), await C.p.evaluate(TOAST))
  }
  await C.ctx.close()
} else verifier('dist/index.html manque : « npm run build » d\'abord', false)

await A.ctx.close()
await nav.close()
verifier('Aucune erreur JS', erreurs.length === 0, erreurs.slice(0, 5).join(' | '))
const ko = resultats.filter(r => !r.ok)
console.log(`${resultats.length - ko.length} / ${resultats.length} vérifications réussies`)
process.exit(ko.length ? 1 : 0)
