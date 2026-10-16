// Essais au navigateur du morceau M1 du lot 2 : la prise selon le pointeur
// (6 px à la souris, 10 au stylet, 20 au doigt), l'intérieur des figures
// fermées sans fond (outil Sélection, doigt qui déplace), le bord le plus
// proche, et jamais sous un outil de dessin.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = 'http://localhost:5173/'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  const cdp = await ctx.newCDPSession(page)
  return { ctx, page, cdp }
}

// ---------- Ce qu'on pose sur la page (dans la page) ----------
/** Une page neuve, vide, à 100 % : chaque cas part de rien */
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
/** Une forme posée telle quelle ; rend son identifiant */
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = 'F' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f })
  return id
}
const poly = (pts, o = {}) => {
  const x = pts[0][0], y = pts[0][1]
  return { type: 'polygone', x, y, pts: pts.flatMap(([px, py]) => [px - x, py - y]), ferme: true, couleur: '#1b2230', taille: 4.5, ...o }
}
const rect = (x, y, l, h, o = {}) => poly([[x, y], [x + l, y], [x + l, y + h], [x, y + h]], o)
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false, ...o }
}
const triangle = (x, y, c, o = {}) => poly([[x, y], [x + c, y], [x + c / 2, y - c * 0.8]], o)
const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function poser(page, f) {
  if (f.type === 'image') await page.evaluate(p => window.__app.tableau.doc.getMap('images').set('png1', p), PNG1)
  const id = await page.evaluate(POSER, f)
  await page.waitForTimeout(30)
  return id
}
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (page, x, y) => page.evaluate(ECRAN, { x, y })
const SEL = () => [...window.__app.selection]
const sel = page => page.evaluate(SEL)
const vider = page => page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.choisirPartie(null); a.rendu.redessinerDirect(); a.ui.maj() })
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)

/** Un clic à la souris en (x, y) monde, et ce qui est sélectionné ensuite */
async function clicSouris(page, x, y, o = {}) {
  const s = await ecran(page, x, y)
  await page.mouse.click(s.x, s.y, o)
  await page.waitForTimeout(60)
  return sel(page)
}
function outilsCdp(cdp) {
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0 }),
    bas: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 }),
    va: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
    async clic(x, y) { await this.bas(x, y); await this.haut(x, y) },
    async trace(pts) { await this.bas(...pts[0]); for (const p of pts.slice(1)) await this.va(...p); await this.haut(...pts[pts.length - 1]) },
  }
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const doigt = async (pts, r = 8) => {
    await touche('touchStart', [pts[0]], r)
    for (const p of pts.slice(1)) await touche('touchMove', [p], r)
    await touche('touchEnd', [])
  }
  return { stylet, doigt }
}
const ligne = (x, y, dx, dy, n = 8) => Array.from({ length: n + 1 }, (_, k) => [x + dx * k / n, y + dy * k / n])
const memes = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// =============== 1. L'ordinateur de la classe : souris et tablette graphique ===============
{
  const { ctx, page, cdp } = await ouvrir({}, 'pc')
  const { stylet } = outilsCdp(cdp)
  verifier('PC sans écran tactile (maxTouchPoints 0)', await page.evaluate(() => navigator.maxTouchPoints) === 0)
  await outil(page, 'selection')

  // --- Le bord le plus proche, l'intérieur nu ---
  await page.evaluate(PAGE_NEUVE)
  const R = await poser(page, rect(100, 100, 800, 450))
  const T = await poser(page, trait(200, 109, 150))           // un trait à 9 unités sous le bord du haut
  let r = await clicSouris(page, 260, 105)                   // à 4 px du trait, 5 du bord
  verifier('Souris : un trait dans un grand cadre sans fond, clic à 4 px du trait et 5 du bord → le trait', memes(r, [T]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, 700, 400)
  verifier('Souris : un clic dans le vide du cadre sans fond → le cadre (par l\'intérieur)', memes(r, [R]), JSON.stringify(r))
  await vider(page)
  const Tri = await poser(page, triangle(450, 400, 120))
  r = await clicSouris(page, 510, 365)
  verifier('Souris : un triangle sans fond dans le cadre, clic en son milieu → le triangle', memes(r, [Tri]), JSON.stringify(r))
  await vider(page)
  // Un double-clic dans le triangle (Sélection) ouvre ses options
  const sTri = await ecran(page, 510, 365)
  await page.mouse.dblclick(sTri.x, sTri.y)
  await page.waitForTimeout(80)
  verifier('Souris : un double-clic dans le triangle (Sélection) ouvre ses options', await page.evaluate(() => window.__app.options) === Tri)
  await page.keyboard.press('Escape'); await vider(page)

  // Survol : halo et curseur « pointer » à l'intérieur du triangle, à la souris et au stylet
  // (M2 : l'intérieur d'une figure non sélectionnée se prend d'un clic, mais glisser y entoure)
  await page.mouse.move(sTri.x + 5, sTri.y + 3)
  await page.waitForTimeout(40)
  let sv = await page.evaluate(() => ({ survol: window.__app.rendu.survol, curseur: document.getElementById('zone').style.cursor }))
  verifier('Souris, survol à l\'intérieur du triangle (Sélection) : halo et curseur « pointer »', sv.survol === Tri && sv.curseur === 'pointer', JSON.stringify(sv))
  await page.mouse.move(5, 400)
  await stylet.survol(sTri.x, sTri.y)
  await page.waitForTimeout(40)
  sv = await page.evaluate(() => ({ survol: window.__app.rendu.survol, curseur: document.getElementById('zone').style.cursor }))
  verifier('Tablette graphique, survol à l\'intérieur du triangle : halo et curseur « pointer »', sv.survol === Tri && sv.curseur === 'pointer', JSON.stringify(sv))
  const sR = await ecran(page, 800, 480)
  await stylet.survol(sR.x, sR.y)
  await page.waitForTimeout(40)
  sv = await page.evaluate(() => ({ survol: window.__app.rendu.survol }))
  verifier('Tablette graphique, survol dans le vide du cadre : le halo sur le cadre', sv.survol === R, JSON.stringify(sv))

  // Le même triangle dans un grand rectangle COLORIÉ : le triangle
  await page.evaluate(PAGE_NEUVE)
  const Rc = await poser(page, rect(100, 100, 800, 450, { fond: '#1f5fbf' }))
  const Tri2 = await poser(page, triangle(450, 400, 120))
  r = await clicSouris(page, 510, 365)
  verifier('Souris : un triangle sans fond dans un grand rectangle colorié, clic en son milieu → le triangle', memes(r, [Tri2]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, 200, 200)
  verifier('Souris : ailleurs dans le rectangle colorié → le rectangle', memes(r, [Rc]), JSON.stringify(r))
  await vider(page)

  // --- La portée selon le pointeur (un trait fin : l'épaisseur ne compte presque pas) ---
  await page.evaluate(PAGE_NEUVE)
  const F = await poser(page, trait(300, 300, 300, { taille: 1 }))
  r = await clicSouris(page, 450, 309)
  verifier('Souris à 9 px d\'un trait : rien', memes(r, []), JSON.stringify(r))
  r = await clicSouris(page, 450, 305)
  verifier('Souris à 5 px d\'un trait : pris', memes(r, [F]), JSON.stringify(r))
  await vider(page)
  let s = await ecran(page, 450, 309)
  await stylet.clic(s.x, s.y); await page.waitForTimeout(60)
  r = await sel(page)
  verifier('Tablette graphique à 9 px d\'un trait : pris', memes(r, [F]), JSON.stringify(r))
  await vider(page)
  s = await ecran(page, 450, 312)
  await stylet.clic(s.x, s.y); await page.waitForTimeout(60)
  r = await sel(page)
  verifier('Tablette graphique à 12 px d\'un trait : rien', memes(r, []), JSON.stringify(r))
  // Le stylet survole à 9 px : le halo dit ce qu'il prendra
  s = await ecran(page, 450, 291)
  await stylet.survol(s.x, s.y); await page.waitForTimeout(40)
  verifier('Tablette graphique, survol à 9 px du trait : son halo', await page.evaluate(() => window.__app.rendu.survol) === F)
  // Zoom : la portée est en pixels d'écran
  await page.evaluate(() => { const a = window.__app; a.cam.zoomerAutour(500, 400, 4); a.rendu.toutRedessiner() })
  const pz = await page.evaluate(() => { const a = window.__app, z = a.cam.z; return { z } })
  r = await clicSouris(page, 450, 300 + 5 / pz.z)
  verifier('Souris à 400 % : à 5 px d\'écran du trait, pris', memes(r, [F]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, 450, 300 + 9 / pz.z)
  verifier('Souris à 400 % : à 9 px d\'écran du trait, rien', memes(r, []), JSON.stringify(r))

  // --- Zoom 800 % au cœur d'un cercle qui déborde la vue : rien ---
  await page.evaluate(PAGE_NEUVE)
  const C = await poser(page, { type: 'cercle', x: 600, y: 350, r: 300, couleur: '#1b2230', taille: 4.5 })
  r = await clicSouris(page, 600, 350)
  verifier('Souris, cercle sans fond vu en entier : un clic au centre le prend', memes(r, [C]), JSON.stringify(r))
  await vider(page)
  await page.evaluate(() => { const a = window.__app, s = a.cam.versEcran(600, 350); a.cam.zoomerAutour(s.x, s.y, 8); a.rendu.toutRedessiner(); a.ui.maj() })
  // (pas sur le centre lui-même : le point O d'une figure la prend, lot 1)
  r = await clicSouris(page, 620, 335)
  verifier('Souris à 800 % au cœur d\'un cercle qui déborde la vue : un clic ne prend rien', memes(r, []), JSON.stringify(r))
  r = await clicSouris(page, 600, 350)
  verifier('… mais son centre O le prend encore (lot 1)', memes(r, [C]), JSON.stringify(r))
  await vider(page)
  // Le cercle sélectionné, un clic au cœur le désélectionne
  await page.evaluate(id => { window.__app.selection.add(id); window.__app.ui.maj() }, C)
  r = await clicSouris(page, 610, 340)
  verifier('… et un clic au cœur désélectionne', memes(r, []), JSON.stringify(r))

  // --- Pleins : image, formule, et ce qui est posé dessus ---
  await page.evaluate(PAGE_NEUVE)
  const img = { type: 'image', src: 'png1', l: 300, h: 200, m: [1, 0, 0, 1] }
  const I1 = await poser(page, { ...img, x: 100, y: 100 })
  const surI = await poser(page, trait(150, 200, 150))
  r = await clicSouris(page, 220, 203)
  verifier('Souris : un trait posé sur une image, clic sur le trait → le trait', memes(r, [surI]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, 350, 150)
  verifier('Souris : ailleurs sur l\'image → l\'image', memes(r, [I1]), JSON.stringify(r))
  await vider(page)
  // Lot 5 (K2, les calques d'affichage) : une image posée APRÈS un trait est
  // peinte sous lui (les images sous l'écriture) ; on prend ce qu'on voit :
  // le trait sur son tracé, l'image ailleurs. (Avant le lot 5, la prise
  // suivait l'ordre des z et ce clic prenait l'image, peinte pourtant
  // dessous.)
  const sousI = await poser(page, trait(550, 200, 150))
  const I2 = await poser(page, { ...img, x: 500, y: 100 })
  r = await clicSouris(page, 620, 201)
  verifier('Souris : une image posée après un trait (peinte dessous), clic sur le trait → le trait', memes(r, [sousI]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, 620, 260)
  verifier('Souris : … ailleurs sur cette image → l\'image', memes(r, [I2]), JSON.stringify(r))
  await vider(page)
  const Fo = await poser(page, { type: 'formule', x: 150, y: 400, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 28 })
  const I3 = await poser(page, { ...img, x: 550, y: 380 })
  const Fo2 = await poser(page, { type: 'formule', x: 600, y: 420, latex: '\\frac{1}{2}', couleur: '#1b2230', taille: 28 })
  await page.waitForTimeout(150)
  const bF2 = await page.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo2)
  r = await clicSouris(page, bF2.x + bF2.l / 2, bF2.y + bF2.h / 2)
  verifier('Souris : une formule posée sur une image → la formule', memes(r, [Fo2]), JSON.stringify(r))
  await vider(page)
  // Un soulignement sur la formule, cliqué à 2 px
  const bF = await page.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo)
  const Sou = await poser(page, trait(bF.x, bF.y + bF.h - 4, bF.l))
  r = await clicSouris(page, bF.x + bF.l / 2, bF.y + bF.h - 6)
  verifier('Souris : un soulignement tracé sur une formule, cliqué à 2 px → le soulignement', memes(r, [Sou]), JSON.stringify(r))
  await vider(page)
  r = await clicSouris(page, bF.x + bF.l / 2, bF.y + bF.h / 2 - 8)
  verifier('Souris : la même formule, cliquée en son milieu → la formule', memes(r, [Fo]), JSON.stringify(r))
  await vider(page)

  // --- Un morceau : le nom A d'un triangle non sélectionné prend le triangle ---
  await page.evaluate(PAGE_NEUVE)
  const TriN = await poser(page, triangle(400, 450, 200, { sommets: true, noms: ['A', 'B', 'C'] }))
  const placeA = await page.evaluate(async id => { const { placesDesNoms } = await import('/src/formes.ts'); return placesDesNoms(window.__app.forme(id))[0] }, TriN)
  r = await clicSouris(page, placeA.x, placeA.y)
  verifier('Souris : le nom A d\'un triangle non sélectionné prend le triangle', memes(r, [TriN]), JSON.stringify({ r, placeA }))
  await vider(page)

  // Le sommet d'un triangle caché sous un plein ne se prend pas à travers lui.
  // Lot 5 (K2) : une image ne cache plus jamais un triangle (elle est peinte
  // sous l'écriture et les figures, même posée après lui) : le sommet qu'on
  // voit se prend, et l'image ailleurs ; une figure coloriée posée sur le
  // triangle le cache encore, elle.
  const TriC = await poser(page, triangle(800, 300, 150))
  const Ic = await poser(page, { type: 'image', src: 'png1', l: 200, h: 150, m: [1, 0, 0, 1], x: 750, y: 250 })
  r = await clicSouris(page, 800, 300)
  verifier('Souris : une image posée après un triangle (peinte dessous), clic sur le sommet → le triangle', memes(r, [TriC]), JSON.stringify({ r, Ic }))
  await vider(page)
  r = await clicSouris(page, 920, 370)
  verifier('Souris : … ailleurs sur l\'image, loin du triangle → l\'image', memes(r, [Ic]), JSON.stringify({ r, TriC }))
  await vider(page)
  const Rcol = await poser(page, rect(760, 260, 120, 80, { fond: '#1f5fbf' }))
  r = await clicSouris(page, 800, 300)
  verifier('Souris : une figure coloriée posée sur le sommet d\'un triangle → la figure coloriée', memes(r, [Rcol]), JSON.stringify({ r, TriC }))
  await vider(page)

  // --- Une droite se prend sur toute sa longueur visible ---
  await page.evaluate(PAGE_NEUVE)
  const D = await poser(page, { type: 'polygone', x: 300, y: 300, pts: [0, 0, 20, 10], ferme: false, prolonge: 'droite', couleur: '#1b2230', taille: 2.5 })
  r = await clicSouris(page, 700, 503)
  verifier('Souris : une droite se prend loin de ses deux points, au bord de la vue', memes(r, [D]), JSON.stringify(r))
  await vider(page)

  // --- Stylo en main : écrire dans un triangle ne le prend pas ---
  await page.evaluate(PAGE_NEUVE)
  const TriS = await poser(page, triangle(400, 500, 300))
  await outil(page, 'stylo')
  const n0 = await page.evaluate(() => window.__app.formes.length)
  r = await clicSouris(page, 550, 420)
  await page.waitForTimeout(400)
  let e = await page.evaluate(() => ({ n: window.__app.formes.length, sel: [...window.__app.selection], options: window.__app.options }))
  verifier('Stylo, souris : un clic dans un triangle laisse un point, ne sélectionne rien', e.n === n0 + 1 && !e.sel.length && !e.options, JSON.stringify(e))
  s = await ecran(page, 520, 430)
  await stylet.trace(ligne(s.x, s.y, 60, -20))
  await page.waitForTimeout(150)
  e = await page.evaluate(() => ({ n: window.__app.formes.length, sel: [...window.__app.selection] }))
  verifier('Stylo, tablette graphique : un trait commencé dans le triangle s\'écrit, rien n\'est sélectionné', e.n === n0 + 2 && !e.sel.length, JSON.stringify(e))
  s = await ecran(page, 560, 440)
  await stylet.clic(s.x, s.y); await page.waitForTimeout(400)
  e = await page.evaluate(() => ({ n: window.__app.formes.length, sel: [...window.__app.selection] }))
  verifier('Stylo, tablette graphique : un simple appui dans le triangle laisse un point, rien n\'est sélectionné', e.n === n0 + 3 && !e.sel.length, JSON.stringify(e))
  r = await clicSouris(page, 560, 460, { button: 'right' })
  e = await page.evaluate(() => ({ sel: [...window.__app.selection], options: window.__app.options, partie: window.__app.partie }))
  verifier('Stylo : un clic droit dans le vide du triangle ne le vise pas', !e.sel.length && !e.options && !e.partie, JSON.stringify(e))
  r = await clicSouris(page, 550, 500, { button: 'right' })
  e = await page.evaluate(() => ({ options: window.__app.options }))
  verifier('Stylo : un clic droit sur son côté ouvre ses options', e.options === TriS, JSON.stringify(e))
  await page.keyboard.press('Escape'); await vider(page)

  // --- Le survol reste léger sur une page de 2000 traits ---
  await outil(page, 'selection')
  await page.evaluate(PAGE_NEUVE)
  const mesure = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.doc.transact(() => {
      for (let k = 0; k < 2000; k++) {
        const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 3, Math.sin(i / 3) * 6, 0.5)
        t.poser(a.page, { id: 'P' + k, type: 'trait', x: 20 + (k % 50) * 26, y: 20 + Math.floor(k / 50) * 16, pts, couleur: '#1b2230', taille: 2.5, opacite: 1, pression: false, z: k, auteur: t.moi })
      }
    }, 'locale')
    a.rafraichir()
    const z = document.getElementById('zone'), r = z.getBoundingClientRect()
    const temps = []
    for (let k = 0; k < 300; k++) {
      const ev = new PointerEvent('pointermove', { pointerType: 'mouse', pointerId: 1, clientX: r.left + 40 + (k * 37) % 1200, clientY: r.top + 40 + (k * 23) % 640, bubbles: true })
      const t0 = performance.now(); z.dispatchEvent(ev); temps.push(performance.now() - t0)
    }
    temps.sort((x, y) => x - y)
    return { n: a.formes.length, moyenne: temps.reduce((x, y) => x + y, 0) / temps.length, mediane: temps[150], p95: temps[285] }
  })
  verifier('2000 traits : le survol de la Sélection coûte moins de 4 ms par pointermove', mesure.n === 2000 && mesure.moyenne < 4 && mesure.mediane < 4,
    `moyenne ${mesure.moyenne.toFixed(2)} ms, médiane ${mesure.mediane.toFixed(2)} ms, 95 % ${mesure.p95.toFixed(2)} ms`)
  await ctx.close()
}

// =============== 2. Un écran tactile : le doigt ===============
{
  const { ctx, page, cdp } = await ouvrir({ hasTouch: true }, 'tactile')
  const { doigt } = outilsCdp(cdp)
  const toucher = async (x, y) => { const s = await ecran(page, x, y); await doigt([[s.x, s.y]]); await page.waitForTimeout(60); return sel(page) }
  await page.evaluate(() => window.__app.choisirDoigt('dessine'))
  await outil(page, 'selection')

  // La portée : 20 px au doigt
  await page.evaluate(PAGE_NEUVE)
  const F = await poser(page, trait(300, 300, 300, { taille: 1 }))
  let r = await toucher(450, 318)
  verifier('Doigt (Sélection) à 18 px d\'un trait : pris', memes(r, [F]), JSON.stringify(r))
  await vider(page)
  r = await toucher(450, 324)
  verifier('Doigt (Sélection) à 24 px d\'un trait : rien', memes(r, []), JSON.stringify(r))

  // Un trait à 15 px dans un cadre sans fond passe avant le cadre ; au milieu, le cadre
  await page.evaluate(PAGE_NEUVE)
  const R = await poser(page, rect(100, 100, 800, 450))
  const T = await poser(page, trait(300, 300, 200))
  r = await toucher(400, 315)
  verifier('Doigt : un trait à 15 px dans un cadre sans fond passe avant le cadre', memes(r, [T]), JSON.stringify(r))
  await vider(page)
  r = await toucher(700, 450)
  verifier('Doigt : dans le vide du cadre → le cadre', memes(r, [R]), JSON.stringify(r))
  await vider(page)

  // Une formule touchée en plein glyphe, avec un trait à 15 px : la formule
  await page.evaluate(PAGE_NEUVE)
  const Fo = await poser(page, { type: 'formule', x: 300, y: 300, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 28 })
  await page.waitForTimeout(150)
  const bF = await page.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo)
  const T2 = await poser(page, trait(bF.x, bF.y + bF.h / 2 + 15, bF.l))
  r = await toucher(bF.x + bF.l / 2, bF.y + bF.h / 2)
  verifier('Doigt : une formule touchée en plein glyphe, avec un trait à 15 px → la formule', memes(r, [Fo]), JSON.stringify({ r, T2 }))
  await vider(page)

  // Deux touchers dans un triangle (Sélection) : ses options
  await page.evaluate(PAGE_NEUVE)
  const Tri = await poser(page, triangle(450, 450, 200))
  const s = await ecran(page, 550, 400)
  await doigt([[s.x, s.y]]); await page.waitForTimeout(80); await doigt([[s.x + 3, s.y + 2]]); await page.waitForTimeout(150)
  let e = await page.evaluate(() => ({ options: window.__app.options, sel: [...window.__app.selection] }))
  verifier('Doigt (Sélection) : deux touchers dans un triangle ouvrent ses options', e.options === Tri, JSON.stringify(e))
  await page.keyboard.press('Escape'); await vider(page)

  // Le doigt qui déplace, le Stylo en main
  await page.evaluate(() => window.__app.choisirDoigt('deplace'))
  await outil(page, 'stylo')
  await page.evaluate(PAGE_NEUVE)
  const Cadre = await poser(page, rect(100, 100, 900, 480))
  const Tri3 = await poser(page, triangle(250, 300, 120))
  r = await toucher(310, 260)
  verifier('Doigt qui déplace : un toucher dans un triangle le prend', memes(r, [Tri3]), JSON.stringify(r))
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, Cadre)
  const avant = await page.evaluate(id => ({ x: window.__app.forme(id).x, cam: window.__app.cam.x }), Cadre)
  const sm = await ecran(page, 650, 400)
  await doigt(ligne(sm.x, sm.y, 120, 0))
  await page.waitForTimeout(80)
  const apres = await page.evaluate(id => ({ x: window.__app.forme(id).x, cam: window.__app.cam.x, n: window.__app.formes.length }), Cadre)
  verifier('Doigt qui déplace (Stylo), grand cadre sans fond sélectionné : glisser en son milieu déplace la vue, le cadre ne bouge pas',
    apres.x === avant.x && Math.abs(apres.cam - avant.cam - 120) < 1 && apres.n === 2, JSON.stringify({ avant, apres }))
  // Glissé à 8 px de son bord (le tracé), le cadre sélectionné part avec le doigt
  const sb = await ecran(page, 650, 100 + 8)
  await doigt(ligne(sb.x, sb.y, 0, 60))
  await page.waitForTimeout(80)
  const bord = await page.evaluate(id => ({ y: window.__app.forme(id).y, cam: window.__app.cam.y }), Cadre)
  verifier('Doigt qui déplace : glissé à 8 px du bord du cadre sélectionné, le cadre le suit', Math.abs(bord.y - 160) < 1, JSON.stringify(bord))
  // À 15 px du bord, il ne le saisit pas : la vue
  const camY = bord.cam
  const sb2 = await ecran(page, 650, 160 + 15)
  await doigt(ligne(sb2.x, sb2.y, 0, 60))
  await page.waitForTimeout(80)
  const loin = await page.evaluate(id => ({ y: window.__app.forme(id).y, cam: window.__app.cam.y }), Cadre)
  verifier('Doigt qui déplace : glissé à 15 px du bord, il déplace la vue (un toucher l\'aurait pris)', Math.abs(loin.y - 160) < 1 && Math.abs(loin.cam - camY - 60) < 1, JSON.stringify(loin))
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`)
if (erreurs.length) console.log('ÉCHEC erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
