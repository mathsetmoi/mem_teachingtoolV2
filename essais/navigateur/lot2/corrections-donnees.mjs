// Essais des corrections « donnees » du lot 2. Serveur de développement sur
// :5173 (ou l'adresse en argument). Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
//  A. Coller ou dupliquer une construction : un point partagé (le sommet A du
//     triangle ABC, de la hauteur [AH], le centre A d'un cercle) garde UN nom.
//  B. Une copie marquée aux nombres démesurés (1e300) est refusée au collage.
//  C. Un document qui en contient déjà une (d'avant la correction) reste
//     utilisable : Tout voir répond, et le rechargement sans vue gardée aussi.
//  D. Pendant la revue, « Annuler » d'une page supprimée ne se montre pas et
//     n'écrit rien ; la revue fermée, Ctrl+Z rend la page.
//  E. Deux pages supprimées de suite puis rendues : le film élève est celui
//     d'une séance sans suppression (aucun pas vide).
//  F. Ctrl+D ou Ctrl+V puis une flèche 300 ms après : deux étapes (déjà
//     corrigé aux « corrections appareils » ; gardé ici contre une régression).
import { chromium } from '../commun/playwright.mjs'

const URL0 = process.argv[2] || 'http://localhost:5173/'
const resultats = [], erreurs = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const attendre = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()
/** Ferme un contexte ; une page gelée (avant la correction) ne bloque pas l'essai */
const fermer = ctx => Promise.race([ctx.close().catch(() => {}), attendre(3000)])

async function ouvrir(options = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...options })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(m.text()) })
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  await installer(page)
  return { ctx, page }
}
async function installer(page) {
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
}
/** Répond-elle en moins de ms ? */
const repond = (page, ms = 5000) => Promise.race([page.evaluate(() => 'oui').catch(e => 'erreur ' + e.message.slice(0, 60)), attendre(ms).then(() => 'BLOQUÉ')])

/** Les points nommés (place arrondie → noms) des formes données (toutes par défaut) */
const pointsNommes = (page, ids) => page.evaluate(ids => {
  const a = window.__app, r = {}
  for (const f of a.formes) {
    if (ids && !ids.includes(f.id)) continue
    const pts = f.type === 'cercle' ? [[f.x, f.y]] : f.type === 'polygone' ? Array.from({ length: f.pts.length / 2 }, (_, i) => [f.x + f.pts[2 * i], f.y + f.pts[2 * i + 1]]) : []
    pts.forEach(([x, y], i) => { const k = Math.round(x) + ',' + Math.round(y); (r[k] ??= []).push(f.noms?.[i] ?? '') })
  }
  return r
}, ids)
const conflits = pts => Object.entries(pts).filter(([, n]) => new Set(n).size > 1)

// ---------- A. Les noms d'une construction collée ----------
{
  const { ctx, page } = await ouvrir()
  const cle = k => page.keyboard.press(k).then(() => attendre(150))
  const p1 = await page.evaluate(() => {
    const a = window.__app, t = a.tableau, z = Date.now()
    const base = { auteur: t.moi, couleur: '#1b2230', taille: 3, sommets: true }
    t.nouveauGeste(); t.poser(a.page, { ...base, id: 'TRI', type: 'polygone', x: 300, y: 200, z, pts: [0, 0, 200, 160, -100, 160], ferme: true, noms: ['A', 'B', 'C'] })
    t.nouveauGeste(); t.poser(a.page, { ...base, id: 'HAU', type: 'polygone', x: 300, y: 200, z: z + 1, pts: [0, 0, 0, 160], ferme: false, noms: ['A', 'H'] })
    t.nouveauGeste(); t.poser(a.page, { ...base, id: 'CER', type: 'cercle', x: 300, y: 200, z: z + 2, r: 60, noms: ['A'] })
    return a.page
  })
  await page.mouse.move(700, 500)
  await cle('Control+a'); await cle('Control+c')
  await page.evaluate(() => window.__app.nouvellePage()); await attendre(150)
  await page.mouse.move(600, 400); await attendre(50)
  await cle('Control+v'); await attendre(300)
  const noms = await page.evaluate(() => window.__app.formes.map(f => f.noms))
  const pts = await pointsNommes(page)
  verifier('A. Collé sur une page vide : ABC, [AH] et le centre A gardent leurs noms', JSON.stringify(noms) === '[["A","B","C"],["A","H"],["A"]]', noms)
  verifier('A. … un même point garde un seul nom', conflits(pts).length === 0, conflits(pts))
  await page.evaluate(p => window.__app.allerPage(p), p1); await attendre(150)
  await cle('Control+a'); await cle('Control+d'); await attendre(150)
  const neufs = await page.evaluate(() => [...window.__app.selection])
  const ptsD = await pointsNommes(page, neufs)
  const nomsD = await page.evaluate(ids => window.__app.formes.filter(f => ids.includes(f.id)).map(f => f.noms), neufs)
  verifier('A. Ctrl+D sur la page d\'origine : un même point garde un seul nom dans la copie', conflits(ptsD).length === 0, conflits(ptsD))
  verifier('A. … des lettres neuves, la même pour le sommet partagé (DEF, [DG], D)', JSON.stringify(nomsD) === '[["D","E","F"],["D","G"],["D"]]', nomsD)
  await cle('Control+z')
  await cle('Control+a'); await cle('Control+x'); await cle('Control+v'); await attendre(300)
  const nomsX = await page.evaluate(() => window.__app.formes.map(f => f.noms))
  verifier('A. Ctrl+X puis Ctrl+V : ABC, [AH], A reviennent', JSON.stringify(nomsX) === '[["A","B","C"],["A","H"],["A"]]', nomsX)
  await fermer(ctx)
}

// ---------- B. Une copie piégée aux nombres démesurés ----------
const PIEGE = { v: 1, formes: [{ id: 'q', type: 'trait', x: 1e300, y: 1e300, z: 1, pts: [0, 0, 0.5, 1e300, 1e300, 0.5], couleur: '#000000', taille: 1e300, opacite: 1, pression: false }], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: Date.now() }
{
  const { ctx, page } = await ouvrir({ permissions: ['clipboard-read', 'clipboard-write'] })
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste(); t.poser(a.page, { id: 'N1', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 80, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  })
  await attendre(500)
  const html = `<div data-mem-teachingtool='1' data-copie='${Buffer.from(JSON.stringify(PIEGE)).toString('base64')}'>x</div>`
  await page.evaluate(async html => { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob(['MEM teachingtool : 1 objet'], { type: 'text/plain' }) })]) }, html)
  await page.mouse.move(600, 400)
  await page.keyboard.press('Control+v'); await attendre(600)
  const r = await Promise.race([page.evaluate(() => ({ n: window.__app.formes.length, msg: window.__msgs.slice(-1)[0] })), attendre(8000).then(() => 'BLOQUÉ')])
  verifier('B. Ctrl+V d\'une copie marquée à x = 1e300 : refusée, la page n\'a que son trait', r !== 'BLOQUÉ' && r.n === 1, r)
  verifier('B. … un message le dit', r !== 'BLOQUÉ' && /ni objet ni image/.test(r.msg ?? ''), r)
  await Promise.race([page.keyboard.press('Shift+Digit1'), attendre(3000)]); await attendre(1500)
  verifier('B. … Tout voir répond', await repond(page) === 'oui')
  await fermer(ctx)
}

// ---------- C. Un document déjà touché (posé sans passer par le collage) ----------
{
  const { ctx, page } = await ouvrir()
  await page.evaluate(f => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste(); t.poser(a.page, { id: 'N1', type: 'trait', x: 300, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 80, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    t.nouveauGeste(); t.poser(a.page, { ...f, z: Date.now() + 1, auteur: t.moi })
  }, PIEGE.formes[0])
  await attendre(800)
  await Promise.race([page.keyboard.press('Shift+Digit1'), attendre(3000)]); await attendre(1500)
  const toutVoir = await repond(page)
  verifier('C. Forme à 1e300 déjà dans le document : Tout voir répond', toutVoir === 'oui', toutVoir)
  // La vue gardée oubliée (comme après « Ouvrir un tableau », ou sur un autre
  // navigateur). Une page gelée ne se recharge pas : l'essai n'est pas fait.
  let ok = 'non essayé (Tout voir a gelé l\'onglet)'
  if (toutVoir === 'oui') {
    await page.evaluate(() => { localStorage.removeItem('mem-session'); window.__app.arreterSession?.() })
    await page.goto(URL0, { waitUntil: 'commit' })
    ok = await Promise.race([page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 15000 }).then(() => 'répond').catch(e => 'ERREUR ' + e.message.slice(0, 60)), attendre(20000).then(() => 'BLOQUÉ')])
  }
  verifier('C. … rechargé sans vue gardée : le tableau répond', ok === 'répond', ok)
  if (ok === 'répond') {
    await attendre(800)
    verifier('C. … et répond encore une seconde plus tard (la page s\'est dessinée)', await repond(page) === 'oui')
  }
  await fermer(ctx)
}

// ---------- D. Pendant la revue, « Annuler » d'une page supprimée ----------
{
  const { ctx, page } = await ouvrir()
  const ecrire = async (x, y) => {
    await page.mouse.move(x, y); await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(x + i * 8, y + (i % 2 ? 14 : 0))
    await page.mouse.up(); await attendre(450)
  }
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await ecrire(300, 300)
  await page.click('button[title="Nouvelle page"]'); await attendre(100)
  await ecrire(300, 300); await ecrire(300, 400)
  await attendre(700)
  await page.click('.barre-haut button[aria-label="Supprimer cette page"]'); await attendre(200)
  const avant = await page.evaluate(() => ({ film: window.__app.tableau.film.length, pages: window.__app.pages.length }))
  await page.click('button[title^="Revoir la construction"]'); await attendre(400)
  const enRevue = await page.evaluate(() => window.__app.enLecture)
  await page.keyboard.press('F5'); await attendre(300)
  const b = page.locator('.toast.visible .action', { hasText: 'Annuler' })
  const visible = await b.isVisible().catch(() => false)
  // Même caché, son bouton ne fait rien : on le clique par le code
  await page.evaluate(() => document.querySelector('.toast .action')?.click()); await attendre(300)
  const apres = await page.evaluate(() => ({ film: window.__app.tableau.film.length, pages: window.__app.pages.length, enLecture: window.__app.enLecture }))
  // L'application elle-même refuse d'écrire pendant la revue
  const direct = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    const jetee = [...t.pages.keys()].find(id => !a.pages.includes(id)) ?? null
    return { jetee, rendre: a.rendrePage(jetee ?? 'x'), annuler: a.annuler(), retablir: a.retablir() }
  })
  const apres2 = await page.evaluate(() => ({ film: window.__app.tableau.film.length, pages: window.__app.pages.length }))
  verifier('D. Revue ouverte, F5 : le bouton « Annuler » de la page supprimée ne se montre pas', enRevue && !visible, { enRevue, visible })
  verifier('D. … cliqué quand même, il n\'écrit rien dans le tableau', apres.film === avant.film && apres.pages === avant.pages && apres.enLecture, { avant, apres })
  verifier('D. … rendrePage, annuler, retablir ne font rien pendant la revue', apres2.film === avant.film && apres2.pages === avant.pages && direct.jetee !== null && !direct.rendre && direct.annuler === false && direct.retablir === false, { direct, apres2 })
  for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await attendre(150) }
  await page.keyboard.press('Control+z'); await attendre(300)
  const fin = await page.evaluate(() => ({ pages: window.__app.pages.length, enLecture: window.__app.enLecture }))
  verifier('D. La revue fermée, Ctrl+Z rend la page', !fin.enLecture && fin.pages === 2, fin)
  await fermer(ctx)
}

// ---------- E. Deux pages supprimées de suite, puis rendues ----------
{
  const { ctx, page } = await ouvrir()
  const ecrire = async (x, y) => {
    await page.mouse.move(x, y); await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(x + i * 8, y + (i % 2 ? 14 : 0))
    await page.mouse.up(); await attendre(450)
  }
  const JETER = '.barre-haut button[aria-label="Supprimer cette page"]'
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await ecrire(300, 300)
  await page.click('button[title="Nouvelle page"]'); await attendre(100)
  await ecrire(300, 300)
  await page.click('button[title="Nouvelle page"]'); await attendre(100)
  await ecrire(300, 300)
  const P = await page.evaluate(() => window.__app.pages)
  await page.evaluate(p => window.__app.allerPage(p), P[1]); await attendre(100)
  await ecrire(300, 400)
  await attendre(700); await page.click(JETER); await attendre(200)
  await attendre(700); await page.click(JETER); await attendre(200)
  await page.keyboard.press('Control+z'); await attendre(200)
  await page.keyboard.press('Control+z'); await attendre(200)
  const vue = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages }))
  verifier('E. (les deux pages sont revenues, on regarde la 2)', vue.page === P[1] && JSON.stringify(vue.pages) === JSON.stringify(P), vue)
  await ecrire(300, 500)
  const r = await page.evaluate(async P => {
    const ex = await import('/src/revoir/exporter.ts')
    const t = window.__app.tableau, film = t.film.toArray()
    const s = ex.seancesDuFilm(film)[0]
    const f = ex.exporter(t, { de: s.de, a: s.a, pages: P, titre: '' }, { instruments: false })
    return { etapes: f.etapes.map(e => 'p' + (P.indexOf(e.p) + 1) + ':' + e.o.length), chapitres: f.chapitres.map(c => c.titre) }
  }, P)
  verifier('E. Film élève : aucun pas vide (le replay ne quitte jamais la page 2)', !r.etapes.some(x => x.endsWith(':0')), r)
  verifier('E. … les chapitres d\'une séance sans suppression', JSON.stringify(r.chapitres) === '["Page 1","Page 2","Page 3","Page 2"]', r.chapitres)
  await fermer(ctx)
}

// ---------- F. Ctrl+D ou Ctrl+V, puis une flèche 300 ms après ----------
{
  const { ctx, page } = await ouvrir()
  const ids = () => page.evaluate(() => window.__app.formes.length)
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    for (let k = 0; k < 2; k++) { t.nouveauGeste(); t.poser(a.page, { id: 'F' + k, type: 'trait', x: 300 + k * 200, y: 300, z: Date.now() + k, auteur: t.moi, pts: [0, 0, 0.5, 80, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }
    a.choisirOutil('selection')
  })
  await attendre(500)
  for (const [nom, combo] of [['Ctrl+D', 'Control+d'], ['Ctrl+V', 'Control+v']]) {
    await page.keyboard.press('Control+a'); await attendre(100)
    if (combo === 'Control+v') { await page.keyboard.press('Control+c'); await attendre(100) }
    const n0 = await ids()
    await page.keyboard.press(combo); await attendre(combo === 'Control+v' ? 230 : 0)
    await attendre(300)
    for (let k = 0; k < 5; k++) { await page.keyboard.press('Shift+ArrowRight'); await attendre(60) }
    await attendre(600)
    const n1 = await ids()
    await page.keyboard.press('Control+z'); await attendre(150)
    const n2 = await ids()
    verifier(`F. ${nom}, puis Maj+→ ×5 300 ms après : un Ctrl+Z ne défait que la poussée, la copie reste`, n1 === n0 + 2 && n2 === n0 + 2, { n0, n1, n2 })
    while (await ids() > 2) { await page.keyboard.press('Control+z'); await attendre(100) }
  }
  await fermer(ctx)
}

await Promise.race([nav.close().catch(() => {}), attendre(5000)])
if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
const ko = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - ko} / ${resultats.length} vérifications passent`)
process.exit(ko || erreurs.length ? 1 : 0)
