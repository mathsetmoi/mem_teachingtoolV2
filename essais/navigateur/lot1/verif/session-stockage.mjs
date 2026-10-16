// Vérification « données » : la session locale (page, vues) ne part ni dans
// le document, ni dans le .memc, ni dans un film publié ; elle ne suit pas un
// tableau ouvert ailleurs ; les noms de la base et des clés ; persist() ne
// bloque rien ; le film élève refusé dans le tableau et le tableau refusé
// dans le lecteur ; Ctrl + S et Ctrl + O selon ce qui a le focus.
import { chromium } from '../../commun/playwright.mjs'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { gunzipSync, strFromU8 } from 'fflate'
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
async function ouvrirPage(url, nom, init) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  if (init) await ctx.addInitScript(init)
  const p = await ctx.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  await p.goto(url)
  if (!/revoir/.test(url)) { await attendre(p); await p.waitForTimeout(600) }
  return { ctx, p }
}
const attendre = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
const norm = t => (t || '').replace(/[  ]/g, ' ')
const toast = async p => norm(await p.evaluate(() => document.querySelector('.toast')?.textContent || ''))
const effacerToast = p => p.evaluate(() => { const t = document.querySelector('.toast'); if (t) { t.textContent = ''; t.classList.remove('visible') } })
const dialogue = p => p.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent } : null })
const rang = p => p.evaluate(() => document.querySelector('.rang').textContent)
const zoom = p => p.evaluate(() => document.querySelector('.zoom-texte').textContent.replace(/\s/g, ' '))
async function tracer(p, x0, y0, n = 2) {
  for (let i = 0; i < n; i++) {
    await p.mouse.move(x0, y0 + i * 40); await p.mouse.down()
    for (let k = 1; k <= 10; k++) await p.mouse.move(x0 + k * 14, y0 + i * 40 + (k % 2) * 6)
    await p.mouse.up(); await p.waitForTimeout(80)
  }
}
async function choisir(p, chemin) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(60)
  const fc = p.waitForEvent('filechooser', { timeout: 5000 })
  await p.locator('.menu-item[data-action="ouvrir"]').click()
  await (await fc).setFiles(chemin)
}
async function telecharger(p, chemin) {
  await p.evaluate(() => { window.showSaveFilePicker = undefined })
  const dl = p.waitForEvent('download', { timeout: 10000 })
  await p.keyboard.press('Control+s')
  await (await dl).saveAs(chemin)
  await p.waitForTimeout(200)
}
/** Toutes les clés d'un objet JSON, à toute profondeur */
function cles(o, s = new Set()) {
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) { if (!Array.isArray(o)) s.add(k); cles(v, s) }
  return s
}

// =================== 1. La session n'entre jamais dans le document ===================
const A = await ouvrirPage(C.DEV, 'A')
await tracer(A.p, 300, 200, 2)
await A.p.evaluate(() => window.__app.nouvellePage())
await tracer(A.p, 300, 300, 1)
await A.p.waitForTimeout(600)
await A.p.evaluate(() => { window.__maj = []; window.__app.tableau.doc.on('update', (u, origine) => window.__maj.push(String(origine))) })
// Zoom (Ctrl + molette), défilement, Tout voir, 100 %, flèches, changer de page
await A.p.mouse.move(600, 400)
for (let i = 0; i < 5; i++) { await A.p.keyboard.down('Control'); await A.p.mouse.wheel(0, -100); await A.p.keyboard.up('Control'); await A.p.waitForTimeout(40) }
await A.p.mouse.wheel(0, 300); await A.p.waitForTimeout(100)
await A.p.mouse.wheel(0, 200); await A.p.waitForTimeout(100)
await A.p.keyboard.press('ArrowRight'); await A.p.keyboard.press('ArrowDown')
await A.p.evaluate(() => window.__app.allerPage(window.__app.pages[0]))
await A.p.keyboard.press('Shift+!').catch(() => {})
await A.p.evaluate(() => window.__app.allerPage(window.__app.pages[1]))
for (let i = 0; i < 4; i++) { await A.p.keyboard.down('Control'); await A.p.mouse.wheel(0, -100); await A.p.keyboard.up('Control'); await A.p.waitForTimeout(40) }
await A.p.waitForTimeout(800)
const majs = await A.p.evaluate(() => window.__maj)
const sess = await A.p.evaluate(() => JSON.parse(localStorage.getItem('mem-session')))
const zA = await zoom(A.p)
C.verifier('Zoomer, défiler, changer de page : aucune écriture dans le document', majs.length === 0, majs)
C.verifier('… la session est dans localStorage (mem-session : page, une vue par page)', sess && sess.v === 1 && sess.page === (await A.p.evaluate(() => window.__app.page)) && Object.keys(sess.vues).length === 2, { sess, zA })
const SRC = F + '/session-source.memc'
await telecharger(A.p, SRC)
const src = C.lireMemc(readFileSync(SRC))
const texteDoc = JSON.stringify(C.resume(src.doc)) + JSON.stringify(src.entete)
// (Adapté au lot 6 : les deux cartes des séances, « seances » et « seanceDesPages », sont des racines du document)
C.verifier('Le .memc n\'a que les racines du document, ni « session » ni « vues »', [...src.doc.share.keys()].every(k => ['pages', 'ordre', 'film', 'piste', 'instruments', 'images', 'publications', 'seances', 'seanceDesPages'].includes(k)) && !/session|"vues"|"cx"/.test(texteDoc), [...src.doc.share.keys()])
const vueSource = Object.values(sess.vues).map(v => v.join(','))
// Le film élève, tel que Publier l'écrit
const film = await A.p.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const f = ex.exporter(t, { de: 0, a: t.film.length - 1, pages: window.__app.pages, titre: 'Séance essai' })
  return fo.ecrireFilm(f)
})
const MEM = F + '/seance-essai.mem'
writeFileSync(MEM, film)
const env = JSON.parse(film)
const filmJson = JSON.parse(strFromU8(gunzipSync(new Uint8Array(Buffer.from(env.gz, 'base64')))))
const k = cles(filmJson)
C.verifier('Le film élève (.mem) ne contient ni la session ni les vues', !k.has('vues') && !k.has('session') && !k.has('cx'), [...k].filter(x => /vue|session|cam|zoom|cx|cy/i.test(x)))
C.verifier('… ni les nombres de la vue gardée', !vueSource.some(v => JSON.stringify(filmJson).includes(v)), vueSource)

// =================== 2. Le tableau ouvert ailleurs ne reprend pas la session d'ailleurs ===================
const B = await ouvrirPage(C.DEV, 'B')
await B.p.evaluate(() => window.__app.nouvellePage())
await B.p.mouse.move(600, 400)
for (let i = 0; i < 6; i++) { await B.p.keyboard.down('Control'); await B.p.mouse.wheel(0, 100); await B.p.keyboard.up('Control'); await B.p.waitForTimeout(40) }
await B.p.waitForTimeout(700)
console.log('B avant :', await rang(B.p), await zoom(B.p))
await choisir(B.p, SRC)
await B.p.waitForSelector('dialog[open] [data-a="remplacer"]')
await Promise.all([B.p.waitForEvent('load'), B.p.click('dialog[open] [data-a="remplacer"]')])
await attendre(B.p); await B.p.waitForTimeout(600)
const vB = await B.p.evaluate(() => ({ page: window.__app.pages.indexOf(window.__app.page), z: window.__app.cam.z, x: window.__app.cam.x, y: window.__app.cam.y, sess: localStorage.getItem('mem-session') }))
C.verifier('Ouvert ailleurs : première page, 100 %, vue neutre (ni la session de A, ni celle de B)', vB.page === 0 && Math.abs(vB.z - 1) < 1e-9 && (await zoom(B.p)) === '100 %', { vB, rang: await rang(B.p), zoom: await zoom(B.p) })
// La session du tableau neuf, elle, se garde
await B.p.evaluate(() => window.__app.allerPage(window.__app.pages[1]))
await B.p.mouse.move(600, 400)
for (let i = 0; i < 3; i++) { await B.p.keyboard.down('Control'); await B.p.mouse.wheel(0, -100); await B.p.keyboard.up('Control'); await B.p.waitForTimeout(40) }
await B.p.waitForTimeout(700)
const zB = await zoom(B.p)
// (Adapté aux réglages par défaut, retouches après le lot 5 : on revient sur une page toujours à 100 %,
// au centre où on l'avait laissée ; « la vue revient » devient « le centre revient, à 100 % »)
const centreB = await B.p.evaluate(() => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: c.x, y: c.y } })
await B.p.reload(); await attendre(B.p); await B.p.waitForTimeout(500)
const centreB2 = await B.p.evaluate(() => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: c.x, y: c.y } })
C.verifier('Au rechargement, la page et le centre du tableau neuf reviennent, à 100 %', (await rang(B.p)) === '2 / 2' && zB !== '100 %' && (await zoom(B.p)) === '100 %' && Math.abs(centreB.x - centreB2.x) < 0.05 && Math.abs(centreB.y - centreB2.y) < 0.05, { rang: await rang(B.p), zoom: await zoom(B.p), zB, centreB, centreB2 })

// =================== 3. Les noms de la base et des clés ===================
// Lot 4 (C1-fondation) : l'index de la bibliothèque a sa base
// ('mem-teachingtool-bibliotheque'), chaque nouveau classeur la sienne
// ('mem-teachingtool-classeur-<id>'), et le dernier classeur ouvert sa clé
// ('mem-teachingtool-dernier-classeur') ; les sessions des autres classeurs
// que le premier sont sous 'mem-session:<id>'. Le premier garde la base et
// les clés d'avant.
// (Adapté au lot 4, morceau C5 : 'mem-teachingtool-annonce', l'annonce du
// premier lancement, posée une fois, voir « La bibliothèque des classeurs »)
const CONNUES = ['mem-session', 'mem-dernier-enregistrement', 'mem-molette', 'mem-doigt', 'mem-stylet-direct', 'mem-automatismes', 'mem-construction-instruments', 'mem-construction-existants', 'mem-teachingtool-dernier-classeur', 'mem-teachingtool-annonce']
const basePermise = b => b === 'mem-tableau-local' || b === 'mem-teachingtool-bibliotheque' || /^mem-teachingtool-classeur-[0-9a-f]{16}$/.test(b)
for (const [nom, X] of [['A', A], ['B', B]]) {
  const s = await X.p.evaluate(async () => ({ bases: (await indexedDB.databases()).map(d => d.name), local: Object.keys(localStorage), session: Object.keys(sessionStorage) }))
  C.verifier(`${nom} : la base « mem-tableau-local » (et celles des classeurs et de la bibliothèque) ; seules des clés connues`, s.bases.includes('mem-tableau-local') && s.bases.every(basePermise) && s.local.every(k => CONNUES.includes(k) || /^mem-session:[0-9a-f]{16}$/.test(k) || k.startsWith('tableau-mem:compte-google:')) && s.session.length === 0, s)
}

// =================== 4. Le film élève dans le tableau, le tableau dans le lecteur ===================
for (const [nom, url] of [['dév.', C.DEV], ['en ligne', C.PAGES + 'index.html'], ['file://', C.UN]]) {
  const X = await ouvrirPage(url, 'film-' + nom)
  const avant = C.empreinteEtat(C.docIdb(await C.idb(X.p)))
  await choisir(X.p, MEM)
  await X.p.waitForTimeout(400)
  const t = await toast(X.p)
  C.verifier(`${nom} : un film élève (.mem) ouvert dans le tableau est refusé clairement`, /film pour les élèves \(\.mem\)/.test(t) && !(await dialogue(X.p)) && C.empreinteEtat(C.docIdb(await C.idb(X.p))) === avant, t)
  // Glissé sur le tableau
  await effacerToast(X.p)
  await X.p.evaluate(async texte => {
    const dt = new DataTransfer(); dt.items.add(new File([texte], 'seance.mem', { type: '' }))
    const z = document.getElementById('zone')
    z.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    z.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true, clientX: 600, clientY: 400 }))
  }, film)
  await X.p.waitForTimeout(400)
  const t2 = await toast(X.p)
  C.verifier(`${nom} : … glissé sur le tableau aussi`, /film pour les élèves \(\.mem\)/.test(t2) && !(await dialogue(X.p)), t2)
  await X.ctx.close()
}
const octetsSrc = [...readFileSync(SRC)]
for (const [nom, url] of [['dév.', C.DEV + 'revoir.html'], ['en ligne', C.PAGES + 'revoir.html']]) {
  const X = await ouvrirPage(url, 'lecteur-' + nom)
  await X.p.waitForSelector('input[type=file]', { state: 'attached' })
  await X.p.setInputFiles('input[type=file]', SRC)
  await X.p.waitForTimeout(800)
  const t = norm(await X.p.evaluate(() => document.body.innerText))
  C.verifier(`Lecteur (${nom}) : un .memc choisi est refusé avec la phrase prévue`, /classeur complet enregistré par l'enseignant \(\.memc\)/.test(t), t.slice(0, 200))
  await X.p.reload(); await X.p.waitForSelector('input[type=file]', { state: 'attached' })
  await X.p.evaluate(async o => {
    const dt = new DataTransfer(); dt.items.add(new File([new Uint8Array(o)], 'tableau.memc'))
    window.dispatchEvent(new DragEvent('dragover', { dataTransfer: dt, bubbles: true, cancelable: true }))
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }))
  }, octetsSrc)
  await X.p.waitForTimeout(800)
  const t2 = norm(await X.p.evaluate(() => document.body.innerText))
  C.verifier(`Lecteur (${nom}) : … glissé sur la page aussi`, /classeur complet enregistré par l'enseignant \(\.memc\)/.test(t2), t2.slice(0, 200))
  // Le film élève, lui, s'ouvre
  await X.p.reload(); await X.p.waitForSelector('input[type=file]', { state: 'attached' })
  await X.p.setInputFiles('input[type=file]', MEM)
  await X.p.waitForTimeout(1200)
  const t3 = norm(await X.p.evaluate(() => document.body.innerText))
  C.verifier(`Lecteur (${nom}) : le film élève (.mem) s'ouvre`, /Séance essai/.test(t3) && !/ne s'affiche pas/.test(t3), t3.slice(0, 120))
  await X.ctx.close()
}

// =================== 5. persist() ne bloque rien ===================
for (const [nom, init] of [
  ['persisted() qui ne répond jamais', () => { if (navigator.storage) navigator.storage.persisted = () => new Promise(() => {}) }],
  ['persist() qui échoue', () => { if (navigator.storage) { navigator.storage.persisted = async () => false; navigator.storage.persist = async () => { throw new Error('non') } } }],
  ['sans navigator.storage', () => { Object.defineProperty(Navigator.prototype, 'storage', { get: () => undefined, configurable: true }) }],
  ['normal (noté)', () => { window.__p = []; const s = navigator.storage, a = s.persisted.bind(s), b = s.persist.bind(s); s.persisted = () => { window.__p.push('persisted'); return a() }; s.persist = () => { window.__p.push('persist'); return b() } }],
]) {
  const X = await ouvrirPage(C.DEV, 'persist-' + nom, init)
  await tracer(X.p, 300, 300, 1); await X.p.waitForTimeout(500)
  const n = await X.p.evaluate(() => window.__app.formes.length)
  const t = await toast(X.p), d = await dialogue(X.p)
  const p = await X.p.evaluate(() => window.__p)
  await X.p.reload(); await attendre(X.p); await X.p.waitForTimeout(300)
  const n2 = await X.p.evaluate(() => window.__app.formes.length)
  C.verifier(`persist (${nom}) : le tableau démarre, écrit, s'enregistre ; aucun message`, n === 1 && n2 === 1 && !t && !d, { n, n2, t, d, p })
  await X.ctx.close()
}

// =================== 6. Ctrl + S et Ctrl + O selon le focus ===================
{
  const X = await ouvrirPage(C.DEV, 'focus')
  await tracer(X.p, 300, 300, 1); await X.p.waitForTimeout(400)
  await X.p.evaluate(() => {
    window.showSaveFilePicker = undefined
    window.__touches = []
    // En dernier : le navigateur ferait-il sa propre action ?
    window.addEventListener('keydown', e => { if (e.ctrlKey && /^[so]$/i.test(e.key)) window.__touches.push({ k: e.key, empeche: e.defaultPrevented, cible: document.activeElement?.tagName + '.' + (document.activeElement?.className || '') }) })
  })
  const essai = async (nom, preparer, attendu) => {
    await preparer()
    const avantValeur = await X.p.evaluate(() => document.activeElement?.value ?? null)
    let dl = false, fc = false
    const ecoute1 = () => { dl = true }, ecoute2 = c => { fc = true }
    X.p.on('download', ecoute1); X.p.on('filechooser', ecoute2)
    await X.p.keyboard.press('Control+s'); await X.p.waitForTimeout(500)
    await X.p.keyboard.press('Control+o'); await X.p.waitForTimeout(500)
    X.p.off('download', ecoute1); X.p.off('filechooser', ecoute2)
    const t = await X.p.evaluate(() => window.__touches.splice(0))
    const apresValeur = await X.p.evaluate(() => document.activeElement?.value ?? null)
    const ok = t.length === 2 && t.every(x => x.empeche) && dl === attendu.dl && fc === attendu.fc && avantValeur === apresValeur
    C.verifier(`Focus ${nom} : Ctrl + S ${attendu.dl ? 'enregistre' : 'ne fait rien'}, Ctrl + O ${attendu.fc ? 'ouvre le choix' : 'ne fait rien'} ; jamais l'action du navigateur`, ok, { t, dl, fc, avantValeur, apresValeur })
  }
  await essai('sur le tableau', async () => { await X.p.mouse.click(700, 600) }, { dl: true, fc: true })
  await essai('dans le programme de construction', async () => {
    await X.p.evaluate(() => window.__app.ui.constructeur.ouvrir()); await X.p.waitForTimeout(300)
    await X.p.click('textarea[aria-label="Programme de construction"]'); await X.p.keyboard.type('Trace un segment')
  }, { dl: true, fc: true })
  await X.p.evaluate(() => window.__app.ui.constructeur.fermer()); await X.p.waitForTimeout(200)
  await essai('dans l\'éditeur de formule (fenêtre)', async () => {
    X.p.evaluate(() => { window.__app.ui.editerFormule('', 300, 300) }); await X.p.waitForTimeout(300)
    await X.p.click('dialog[open] input.saisie'); await X.p.keyboard.type('x^2')
  }, { dl: false, fc: false })
  await X.p.keyboard.press('Escape'); await X.p.waitForTimeout(200)
  await X.ctx.close()
}

console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
const ko = C.bilan()
await nav.close()
process.exit(ko ? 1 : 0)
