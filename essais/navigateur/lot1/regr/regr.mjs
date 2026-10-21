// Corrections du rapport « regressions » du lot 1 :
//  A. le doigt « qui déplace » pendant un clic attendu (construction, Désigner, Tracer un axe)
//  B. le double-clic au Stylo resserré (deux points serrés restent deux points), l'heure du point dans le film
//  (C. F5 pendant une séance d'automatismes : retiré avec elle)
// URL0=http://localhost:5195/ pour la version d'avant la correction.
import { chromium } from '../../commun/playwright.mjs'

const URL0 = process.env.URL0 || 'http://localhost:5173/'
const resultats = [], erreurs = []
const attendre = ms => new Promise(r => setTimeout(r, ms))
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const nav = await chromium.launch()

async function ouvrir(o = {}, cles = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1280, height: 800 }, ...o })
  await ctx.addInitScript(c => { try { for (const [k, v] of Object.entries(c)) localStorage.setItem(k, v) } catch {} }, cles)
  const page = await ctx.newPage()
  // Les ressources d'ailleurs (polices, services en ligne) ne sont pas des erreurs du tableau
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(m.text()) })
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  return { ctx, page }
}

/** Le doigt, par CDP (vrais événements tactiles) */
async function doigt(page) {
  const cdp = await page.context().newCDPSession(page)
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 0, radiusX: 4, radiusY: 4 })) })
  return {
    async toucher(x, y) { await t('touchStart', [[x, y]]); await attendre(30); await t('touchEnd', []) },
    async glisser(x, y, dx, dy, n = 10) {
      await t('touchStart', [[x, y]])
      for (let k = 1; k <= n; k++) { await t('touchMove', [[x + dx * k / n, y + dy * k / n]]); await attendre(16) }
      await t('touchEnd', [])
    },
  }
}

/** Le stylet, par CDP (pointerType 'pen') */
async function stylet(page) {
  const cdp = await page.context().newCDPSession(page)
  const ev = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen',
    button: o.button ?? (type === 'mouseMoved' ? 'none' : 'left'), buttons: o.buttons ?? 0, force: o.force ?? 0.5, clickCount: o.clickCount ?? 1 })
  return {
    async toucher(x, y, o = {}) {
      await ev('mouseMoved', x, y)
      await ev('mousePressed', x, y, { buttons: 1, ...o })
      if (o.tenir) await attendre(o.tenir)
      await ev('mouseReleased', x, y, { buttons: 0, force: 0, ...o })
    },
    async trait(pts) {
      await ev('mouseMoved', pts[0][0], pts[0][1])
      await ev('mousePressed', pts[0][0], pts[0][1], { buttons: 1 })
      for (const p of pts.slice(1)) { await ev('mouseMoved', p[0], p[1], { buttons: 1, button: 'left' }); await attendre(8) }
      const f = pts[pts.length - 1]
      await ev('mouseReleased', f[0], f[1], { buttons: 0, force: 0 })
    },
    appuyer: (x, y) => ev('mousePressed', x, y, { buttons: 1 }),
    lever: (x, y) => ev('mouseReleased', x, y, { buttons: 0, force: 0 }),
  }
}

const ETAT = () => {
  const a = window.__app
  return { n: a.formes.length, film: a.tableau.film.length, panneau: !document.querySelector('.panneau-forme').hidden,
    dialogue: !!document.querySelector('dialog[open]'), options: a.options, cam: { x: a.cam.x, y: a.cam.y }, sel: [...a.selection] }
}
const ECRAN = ({ x, y }) => { const r = document.getElementById('zone').getBoundingClientRect(), e = window.__app.cam.versEcran(x, y); return { x: r.left + e.x, y: r.top + e.y } }
/** Un rectangle colorié (l'intérieur compte) et une formule */
const POSER = () => {
  const a = window.__app, t = a.tableau
  const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 200, y: 200 }, { x: 600, y: 200 }, { x: 600, y: 450 }, { x: 200, y: 450 }] })
  f.fond = '#fde68a'
  t.nouveauGeste(); t.poser(a.page, f)
  const g = { id: 'F1', type: 'formule', x: 700, y: 250, latex: 'x^2+3x-4=0', couleur: '#1b2230', taille: 28, z: Date.now(), auteur: t.moi }
  t.nouveauGeste(); t.poser(a.page, g)
  a.choisirOutil('stylo')
  return f.id
}

// ======================= A. Le doigt « qui déplace » pendant un clic attendu =======================
{
  const { ctx, page } = await ouvrir({ hasTouch: true }, { 'mem-doigt': 'deplace' })
  const d = await doigt(page)
  const attente = () => page.evaluate(() => {
    window.__clics = []
    window.__app.placement = { bouge() {}, clic(w) { window.__clics.push(w) }, annuler() {} }
  })
  const lire = () => page.evaluate(() => ({ clics: window.__clics, attend: !!window.__app.placement, cam: { x: window.__app.cam.x, y: window.__app.cam.y }, sel: [...window.__app.selection] }))
  await attente()
  const c0 = (await lire()).cam
  await d.glisser(600, 400, -200, 0)
  await attendre(100)
  let r = await lire()
  verifier('A1. Clic attendu, doigt qui déplace : glisser déplace la vue et ne fait pas le clic', r.clics.length === 0 && r.attend && Math.abs(r.cam.x - c0.x + 200) < 3, JSON.stringify({ c0, ...r }))
  await d.toucher(500, 300)
  await attendre(100)
  r = await lire()
  const w = await page.evaluate(() => { const z = document.getElementById('zone').getBoundingClientRect(); return window.__app.cam.versMonde(500 - z.left, 300 - z.top) })
  verifier('A2. Clic attendu, doigt qui déplace : un toucher bref fait le clic, là où il touche', r.clics.length === 1 && !r.attend && Math.hypot(r.clics[0].x - w.x, r.clics[0].y - w.y) < 1,
    JSON.stringify({ ...r, w }))

  // Un objet sous le doigt : le toucher fait le clic, sans choisir l'objet ni ouvrir ses options au second toucher
  const id = await page.evaluate(POSER)
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await attente()
  const bord = await page.evaluate(ECRAN, { x: 400, y: 200 })
  await d.toucher(bord.x, bord.y)
  await attendre(60)
  r = await lire()
  verifier('A3. Clic attendu sur un objet : le toucher fait le clic, l\'objet n\'est pas choisi', r.clics.length === 1 && r.sel.length === 0, JSON.stringify(r))

  // Tracer un axe au doigt : deux touchers, un glisser entre les deux déplace la vue
  await page.evaluate(() => { window.__axe = null; window.__app.tracerAxe(id => { window.__axe = id }) })
  const n0 = await page.evaluate(() => window.__app.formes.length)
  await d.toucher(300, 600)
  await attendre(80)
  await d.glisser(700, 600, 0, -60)
  await attendre(80)
  const mid = await page.evaluate(() => ({ axe: window.__axe, n: window.__app.formes.length, attend: !!window.__app.placement }))
  await d.toucher(500, 650)
  await attendre(150)
  const ax = await page.evaluate(() => ({ axe: window.__axe, n: window.__app.formes.length, attend: !!window.__app.placement }))
  verifier('A4. Tracer un axe au doigt qui déplace : deux touchers ; un glisser entre les deux ne place rien', !mid.axe && mid.n === n0 && mid.attend && !!ax.axe && ax.n === n0 + 1 && !ax.attend,
    JSON.stringify({ n0, mid, ax }))
  await ctx.close()
}
// Le programme de construction, vrai panneau, sur une tablette au stylet
{
  const { ctx, page } = await ouvrir({ hasTouch: true }, { 'mem-doigt': 'deplace', 'mem-stylet-direct': '1' })
  const d = await doigt(page)
  await page.getByRole('button', { name: /^Programme de construction/ }).click()
  await attendre(200)
  await page.fill('textarea[aria-label="Programme de construction"]', 'Trace un segment [AB] de 6 cm.')
  await page.click('.actions-construction .pas')
  await attendre(300)
  const c0 = await page.evaluate(() => ({ x: window.__app.cam.x, y: window.__app.cam.y }))
  await d.glisser(300, 500, 150, -100)
  await attendre(400)
  const r1 = await page.evaluate(() => ({ attend: !!window.__app.placement, cam: { x: window.__app.cam.x, y: window.__app.cam.y }, etapes: document.querySelectorAll('.etapes li').length }))
  verifier('A5. Construction pas à pas, doigt qui déplace : glisser cherche la place (la vue bouge), la construction attend',
    r1.attend && Math.abs(r1.cam.x - c0.x - 150) < 3 && r1.etapes === 0, JSON.stringify({ c0, ...r1 }))
  await d.toucher(600, 450)
  await attendre(600)
  const r2 = await page.evaluate(() => ({ attend: !!window.__app.placement, etapes: document.querySelectorAll('.etapes li').length, commandes: !document.querySelector('.commandes').hidden }))
  verifier('A6. Construction pas à pas, doigt qui déplace : un toucher bref la commence là', !r2.attend && r2.etapes >= 1, JSON.stringify(r2))
  await ctx.close()
}
// Le doigt qui dessine et la souris : le clic attendu se fait à l'appui, comme avant
{
  const { ctx, page } = await ouvrir({ hasTouch: true }, { 'mem-doigt': 'dessine' })
  const d = await doigt(page)
  await page.evaluate(() => { window.__clics = []; window.__app.placement = { bouge() {}, clic(w) { window.__clics.push(w) }, annuler() {} } })
  await d.toucher(500, 300)
  await attendre(60)
  const a = await page.evaluate(() => window.__clics.length)
  await page.evaluate(() => { window.__clics = []; window.__app.placement = { bouge() {}, clic(w) { window.__clics.push(w) }, annuler() {} } })
  await page.mouse.click(520, 320)
  await attendre(60)
  const b = await page.evaluate(() => window.__clics.length)
  verifier('A7. Doigt qui dessine, souris : le clic attendu se fait comme avant', a === 1 && b === 1, JSON.stringify({ a, b }))
  await ctx.close()
}

// ======================= B. Le double-clic au Stylo =======================
{
  const { ctx, page } = await ouvrir()
  const rect = await page.evaluate(POSER)
  await attendre(200)
  const s = await stylet(page)
  const dedans = await page.evaluate(ECRAN, { x: 400, y: 320 })
  // « Aire : » : le deux-points, deux touchers à 8 px, 120 ms d'écart
  let e0 = await page.evaluate(ETAT)
  await s.toucher(dedans.x, dedans.y - 4); await attendre(120); await s.toucher(dedans.x, dedans.y + 4)
  await attendre(500)
  let e1 = await page.evaluate(ETAT)
  verifier('B1. Stylet : « : » écrit dans un rectangle colorié laisse ses deux points, sans panneau', e1.n === e0.n + 2 && !e1.panneau, JSON.stringify({ n0: e0.n, ...e1 }))
  // Deux points serrés (7 px) sur une formule
  const surF = await page.evaluate(ECRAN, { x: 730, y: 265 })
  e0 = await page.evaluate(ETAT)
  await s.toucher(surF.x, surF.y); await attendre(100); await s.toucher(surF.x + 7, surF.y)
  await attendre(500)
  e1 = await page.evaluate(ETAT)
  verifier('B2. Stylet : deux points à 7 px sur une formule restent deux points, sans éditeur', e1.n === e0.n + 2 && !e1.dialogue, JSON.stringify({ n0: e0.n, ...e1 }))
  // Sur le bord, 8 px, 90 ms
  const bord = await page.evaluate(ECRAN, { x: 450, y: 200 })
  e0 = await page.evaluate(ETAT)
  await s.toucher(bord.x, bord.y - 4); await attendre(90); await s.toucher(bord.x, bord.y + 4)
  await attendre(500)
  e1 = await page.evaluate(ETAT)
  verifier('B3. Stylet : deux points à 8 px sur le bord d\'une figure sont posés', e1.n === e0.n + 2 && !e1.panneau, JSON.stringify({ n0: e0.n, ...e1 }))
  // Un vrai double-clic au stylet (au même endroit, à 2 px) : les options, aucun point
  const ailleurs = await page.evaluate(ECRAN, { x: 300, y: 400 })
  e0 = await page.evaluate(ETAT)
  await s.toucher(ailleurs.x, ailleurs.y); await attendre(80); await s.toucher(ailleurs.x + 2, ailleurs.y, { clickCount: 2 })
  await attendre(450)
  e1 = await page.evaluate(ETAT)
  verifier('B4. Stylet : un double-clic sur la figure ouvre ses options, sans point', e1.n === e0.n && e1.panneau && e1.options === rect, JSON.stringify({ n0: e0.n, ...e1 }))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  // Pendant le second toucher, le premier point reste dessiné
  const p2 = await page.evaluate(ECRAN, { x: 500, y: 420 })
  await s.toucher(p2.x, p2.y); await attendre(60)
  await s.appuyer(p2.x + 1, p2.y)
  const pendant = await page.evaluate(() => !!window.__app.rendu.enAttente)
  await attendre(400)           // tenu 400 ms : ce n'est plus un double-clic
  await s.lever(p2.x + 1, p2.y)
  await attendre(450)
  e1 = await page.evaluate(ETAT)
  const e2 = await page.evaluate(() => ({ n: window.__app.formes.length, attente: !!window.__app.rendu.enAttente }))
  verifier('B5. Stylet : le premier point reste dessiné pendant le second toucher ; tenu longtemps, ce sont deux points', pendant && !e1.panneau && !e2.attente, JSON.stringify({ pendant, ...e2, panneau: e1.panneau }))
  // Le second toucher qui glisse (un trait qui part du point) : le point et le trait, deux étapes d'annulation
  const p3 = await page.evaluate(ECRAN, { x: 260, y: 300 })
  e0 = await page.evaluate(ETAT)
  await s.toucher(p3.x, p3.y); await attendre(80)
  await s.trait(Array.from({ length: 9 }, (_, k) => [p3.x + 1 + 6 * k, p3.y + 2 * k]))
  await attendre(450)
  e1 = await page.evaluate(ETAT)
  await page.keyboard.press('Control+z')
  await attendre(100)
  const e3 = await page.evaluate(ETAT)
  verifier('B6. Stylet : un trait qui part tout près d\'un point : le point et le trait, chacun son Ctrl+Z', e1.n === e0.n + 2 && !e1.panneau && e3.n === e0.n + 1, JSON.stringify({ n0: e0.n, n1: e1.n, apresZ: e3.n }))
  // L'heure du point dans le film : celle du lever
  const p4 = await page.evaluate(ECRAN, { x: 560, y: 300 })
  const t1 = await page.evaluate(() => Date.now())
  await s.toucher(p4.x, p4.y)
  const t2 = await page.evaluate(() => Date.now())
  await attendre(700)
  const et = await page.evaluate(() => { const f = window.__app.tableau.film; return f.get(f.length - 1).t })
  verifier('B7. Film : le point posé sur une figure garde l\'heure de son lever (à 50 ms près)', et >= t1 - 5 && et - t2 < 50, `lever entre ${t1} et ${t2}, étape à +${et - t2} ms`)
  await ctx.close()
}
// La souris : un vrai double-clic sur une figure et sur une formule (au Stylo)
{
  const { ctx, page } = await ouvrir()
  const rect = await page.evaluate(POSER)
  await attendre(200)
  const bord = await page.evaluate(ECRAN, { x: 450, y: 200 })
  let e0 = await page.evaluate(ETAT)
  await page.mouse.dblclick(bord.x, bord.y)
  await attendre(450)
  let e1 = await page.evaluate(ETAT)
  verifier('B8. Souris, Stylo : un double-clic sur une figure ouvre ses options, sans point', e1.n === e0.n && e1.panneau && e1.options === rect, JSON.stringify({ n0: e0.n, ...e1 }))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const surF = await page.evaluate(ECRAN, { x: 730, y: 265 })
  e0 = await page.evaluate(ETAT)
  await page.mouse.dblclick(surF.x, surF.y)
  await attendre(450)
  e1 = await page.evaluate(ETAT)
  const editeur = await page.evaluate(() => !!document.querySelector('dialog[open], .editeur-formule:not([hidden])'))
  verifier('B9. Souris, Stylo : un double-clic sur une formule l\'ouvre pour la modifier, sans point', e1.n === e0.n && editeur, JSON.stringify({ n0: e0.n, n: e1.n, editeur }))
  await ctx.close()
}
// Le doigt qui dessine
{
  const { ctx, page } = await ouvrir({ hasTouch: true }, { 'mem-doigt': 'dessine' })
  const rect = await page.evaluate(POSER)
  await attendre(200)
  const d = await doigt(page)
  const bord = await page.evaluate(ECRAN, { x: 450, y: 200 })
  let e0 = await page.evaluate(ETAT)
  await d.toucher(bord.x - 10, bord.y); await attendre(120); await d.toucher(bord.x + 10, bord.y + 2)
  await attendre(500)
  let e1 = await page.evaluate(ETAT)
  verifier('B10. Doigt qui dessine : deux points à 20 px sur le bord d\'une figure sont posés', e1.n === e0.n + 2 && !e1.panneau, JSON.stringify({ n0: e0.n, ...e1 }))
  e0 = await page.evaluate(ETAT)
  await d.toucher(bord.x + 80, bord.y); await attendre(100); await d.toucher(bord.x + 85, bord.y + 3)
  await attendre(500)
  e1 = await page.evaluate(ETAT)
  verifier('B11. Doigt qui dessine : un double toucher (6 px) sur la figure ouvre ses options, sans point', e1.n === e0.n && e1.panneau && e1.options === rect, JSON.stringify({ n0: e0.n, ...e1 }))
  await ctx.close()
}

// (Retiré avec la séance d'automatismes, qui cachait le tableau : le flash
// se règle maintenant dans une fenêtre, puis se joue sur une page de la séance.)

console.log(erreurs.length ? 'Erreurs JS :\n' + erreurs.join('\n') : 'Aucune erreur JS')
console.log(`${resultats.filter(r => r.ok).length} / ${resultats.length}`)
await nav.close()
process.exit(resultats.every(r => r.ok) && !erreurs.length ? 0 : 1)
