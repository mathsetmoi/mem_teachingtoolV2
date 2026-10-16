// Essais au navigateur du morceau M2 du lot 2 : sélectionner sans clavier.
// À l'outil Sélection, glisser depuis le vide trace un cadre à la souris, un
// lasso au stylet (tablette graphique comprise) et au doigt ; un objet est
// pris s'il est à plus de moitié dedans ; Maj ou Ctrl + glisser ajoute ;
// saisir (tout près du tracé, ou un objet déjà sélectionné) ou entourer (un
// tracé un peu loin, l'intérieur d'une figure fermée) ; le mode « Ajouter »
// au doigt ; les curseurs ; la mesure du lâcher sur une page de 2000 traits.
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
/** Un trait droit de (x, y) à (x + dx, y + dy), fin par défaut (taille 1) */
const trait = (x, y, dx, dy = 0, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * dx / 20, i * dy / 20, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 1, opacite: 1, pression: false, ...o }
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
const sel = page => page.evaluate(() => [...window.__app.selection].sort())
const vider = page => page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.choisirPartie(null); a.rendu.redessinerDirect(); a.ui.maj() })
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
const cam = page => page.evaluate(() => ({ x: window.__app.cam.x, y: window.__app.cam.y, z: window.__app.cam.z }))
const pos = (page, id) => page.evaluate(id => { const f = window.__app.forme(id); return { x: f.x, y: f.y } }, id)
const couches = page => page.evaluate(() => ({ cadre: !!window.__app.rendu.cadreSelection, lasso: !!window.__app.rendu.lasso }))
const curseur = page => page.evaluate(() => document.getElementById('zone').style.cursor)
const memes = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
const pres = (a, b, e = 0.6) => Math.abs(a - b) <= e

/** Un chemin en monde (liste de [x, y]) passé à l'écran */
const chemin = (page, pts) => Promise.all(pts.map(([x, y]) => ecran(page, x, y)))
/** Une boucle (en monde) autour du rectangle (x1, y1)–(x2, y2), qui part de (x0, y0) et y revient */
const boucle = (x0, y0, x1, y1, x2, y2) => [[x0, y0], [x2, y0], [x2, y1], [x1, y1], [x1, y2], [x2, y2], [x2, y0 + 1], [x0, y0 + 1]]
/** Une boucle densifiée (un point tous les ~10 unités) */
function dense(pts) {
  const r = [pts[0]]
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) / 10))
    for (let k = 1; k <= n; k++) r.push([ax + (bx - ax) * k / n, ay + (by - ay) * k / n])
  }
  return r
}

/** Glisser à la souris le long d'un chemin (monde) ; au milieu, ce que montrent les couches */
async function glisserSouris(page, pts, o = {}) {
  const e = await chemin(page, dense(pts))
  if (o.touche) await page.keyboard.down(o.touche)
  await page.mouse.move(e[0].x, e[0].y)
  await page.mouse.down(o.bouton ? { button: o.bouton } : {})
  let milieu = null
  for (let i = 1; i < e.length; i++) {
    await page.mouse.move(e[i].x, e[i].y)
    if (i === Math.floor(e.length / 2)) milieu = await couches(page)
  }
  await page.mouse.up(o.bouton ? { button: o.bouton } : {})
  if (o.touche) await page.keyboard.up(o.touche)
  await page.waitForTimeout(60)
  return milieu
}

function outilsCdp(cdp, page) {
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0 }),
    bas: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 }),
    va: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
    async clic(x, y) { await this.bas(x, y); await this.haut(x, y) },
    /** Le long d'un chemin (monde), et ce que montrent les couches au milieu */
    async glisser(pts) {
      const e = await chemin(page, dense(pts))
      await this.bas(e[0].x, e[0].y)
      let milieu = null
      for (let i = 1; i < e.length; i++) {
        await this.va(e[i].x, e[i].y)
        if (i === Math.floor(e.length / 2)) milieu = await couches(page)
      }
      await this.haut(e[e.length - 1].x, e[e.length - 1].y)
      await page.waitForTimeout(60)
      return milieu
    },
  }
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const doigt = {
    async toucher(x, y) { const s = await ecran(page, x, y); await touche('touchStart', [[s.x, s.y]]); await touche('touchEnd', []); await page.waitForTimeout(60) },
    async glisser(pts) {
      const e = await chemin(page, dense(pts))
      await touche('touchStart', [[e[0].x, e[0].y]])
      let milieu = null
      for (let i = 1; i < e.length; i++) {
        await touche('touchMove', [[e[i].x, e[i].y]])
        if (i === Math.floor(e.length / 2)) milieu = await couches(page)
      }
      await touche('touchEnd', [])
      await page.waitForTimeout(60)
      return milieu
    },
  }
  return { stylet, doigt, touche }
}

// =============== 1. L'ordinateur de la classe : la souris ===============
{
  const { ctx, page, cdp } = await ouvrir({}, 'souris')
  const { stylet } = outilsCdp(cdp, page)
  verifier('PC sans écran tactile (maxTouchPoints 0)', await page.evaluate(() => navigator.maxTouchPoints) === 0)
  await outil(page, 'selection')
  await page.evaluate(PAGE_NEUVE)
  const A = await poser(page, trait(200, 200, 150)), B = await poser(page, trait(200, 300, 150)), C = await poser(page, trait(600, 200, 150))

  // Glisser dans le vide : un cadre, la vue ne bouge pas
  let c0 = await cam(page)
  let milieu = await glisserSouris(page, [[150, 150], [300, 250], [400, 350]])
  let c1 = await cam(page)
  verifier('Souris, Sélection : glisser dans le vide trace un cadre (pas de lasso)', milieu?.cadre && !milieu?.lasso, JSON.stringify(milieu))
  verifier('… la vue ne bouge pas', c1.x === c0.x && c1.y === c0.y, JSON.stringify({ c0, c1 }))
  let r = await sel(page)
  verifier('… et ce qui est dans le cadre est pris (A et B, pas C)', memes(r, [A, B]), JSON.stringify(r))
  verifier('… le cadre s\'efface au lâcher', !(await couches(page)).cadre)

  // Un clic dans le vide désélectionne
  let s = await ecran(page, 500, 450)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(60)
  verifier('Souris : un clic dans le vide désélectionne', (await sel(page)).length === 0)

  // Maj + glisser ajoute sans retirer
  s = await ecran(page, 675, 200)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(60)
  verifier('Souris : un clic sur C le prend', memes(await sel(page), [C]))
  await glisserSouris(page, [[150, 150], [400, 250]], { touche: 'Shift' })
  r = await sel(page)
  verifier('Souris, Maj + glisser autour de A : A s\'ajoute à C', memes(r, [A, C]), JSON.stringify(r))
  await glisserSouris(page, [[150, 150], [400, 350]], { touche: 'Shift' })
  r = await sel(page)
  verifier('Souris, Maj + glisser autour de A et B : B s\'ajoute, A (déjà pris) reste', memes(r, [A, B, C]), JSON.stringify(r))
  await vider(page)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(60)
  await glisserSouris(page, [[150, 250], [400, 350]], { touche: 'Control' })
  r = await sel(page)
  verifier('Souris, Ctrl + glisser autour de B : B s\'ajoute à C', memes(r, [B, C]), JSON.stringify(r))
  await glisserSouris(page, [[150, 150], [400, 250]])
  r = await sel(page)
  verifier('Souris, sans touche : un nouveau cadre remplace la sélection (A seul)', memes(r, [A]), JSON.stringify(r))
  // Maj + clic dans le vide garde la sélection (on a visé à côté)
  s = await ecran(page, 500, 450)
  await page.keyboard.down('Shift'); await page.mouse.click(s.x, s.y); await page.keyboard.up('Shift'); await page.waitForTimeout(60)
  verifier('Souris, Maj + clic dans le vide : la sélection reste', memes(await sel(page), [A]))

  // Le long trait en diagonale n'est plus pris par un cadre posé dans un coin vide de sa boîte
  await page.evaluate(PAGE_NEUVE)
  const D = await poser(page, trait(100, 100, 800, 400, { taille: 4.5 }))
  await glisserSouris(page, [[700, 90], [800, 150], [920, 230]])
  r = await sel(page)
  verifier('Souris : un cadre dans un coin vide de la boîte d\'un long trait en diagonale ne le prend pas', r.length === 0, JSON.stringify(r))
  await glisserSouris(page, [[80, 80], [600, 400]])
  r = await sel(page)
  verifier('… un cadre qui en couvre plus de la moitié le prend', memes(r, [D]), JSON.stringify(r))

  // Plus de la moitié : 60 % oui, 40 % non
  await page.evaluate(PAGE_NEUVE)
  const L = await poser(page, trait(100, 400, 500))
  await glisserSouris(page, [[50, 350], [400, 450]])
  verifier('Souris : un trait à 60 % dans le cadre est pris', memes(await sel(page), [L]))
  await vider(page)
  await glisserSouris(page, [[50, 350], [300, 450]])
  verifier('… à 40 % il ne l\'est pas', (await sel(page)).length === 0)

  // Une formule : par sa surface
  const Fo = await poser(page, { type: 'formule', x: 700, y: 150, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 28 })
  await page.waitForTimeout(150)
  const bF = await page.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo)
  await glisserSouris(page, [[bF.x - 20, bF.y - 20], [bF.x + bF.l * 0.35, bF.y + bF.h + 20]])
  verifier('Souris : une formule au tiers dans le cadre n\'est pas prise', (await sel(page)).length === 0)
  await glisserSouris(page, [[bF.x - 20, bF.y - 20], [bF.x + bF.l * 0.7, bF.y + bF.h + 20]])
  verifier('… aux deux tiers, elle l\'est', memes(await sel(page), [Fo]))
  await vider(page)

  // Une droite : par ses deux points
  const Dr = await poser(page, { type: 'polygone', x: 200, y: 200, pts: [0, 0, 100, 20], ferme: false, prolonge: 'droite', couleur: '#1b2230', taille: 2.5 })
  await glisserSouris(page, [[150, 150], [250, 250]])
  verifier('Souris : un cadre autour d\'un seul des deux points d\'une droite ne la prend pas', (await sel(page)).length === 0)
  await glisserSouris(page, [[150, 150], [350, 250]])
  verifier('… autour des deux, si', memes(await sel(page), [Dr]))
  await vider(page)

  // Glisser une image, une formule, une figure coloriée : elle bouge
  await page.evaluate(PAGE_NEUVE)
  const I = await poser(page, { type: 'image', src: 'png1', l: 200, h: 150, m: [1, 0, 0, 1], x: 100, y: 100 })
  const Fo2 = await poser(page, { type: 'formule', x: 450, y: 120, latex: '\\frac{1}{2}+\\frac{1}{3}', couleur: '#1b2230', taille: 28 })
  const Rc = await poser(page, rect(700, 100, 250, 200, { fond: '#1f5fbf' }))
  await page.waitForTimeout(150)
  const bF2 = await page.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo2)
  for (const [nom, id, x, y] of [['une image', I, 200, 175], ['une formule', Fo2, bF2.x + bF2.l / 2, bF2.y + bF2.h / 2], ['une figure coloriée', Rc, 825, 200]]) {
    await vider(page)
    const p0 = await pos(page, id)
    await glisserSouris(page, [[x, y], [x + 30, y + 20], [x + 60, y + 40]])
    const p1 = await pos(page, id)
    verifier(`Souris : glisser ${nom} depuis son milieu la déplace`, pres(p1.x - p0.x, 60) && pres(p1.y - p0.y, 40), JSON.stringify({ p0, p1 }))
  }

  // Un grand rectangle sans fond, non sélectionné : glisser depuis son milieu entoure
  await page.evaluate(PAGE_NEUVE)
  const R = await poser(page, rect(100, 100, 800, 400))
  const T = await poser(page, trait(300, 300, 150))
  await glisserSouris(page, [[700, 450], [500, 350], [250, 250]])
  r = await sel(page)
  verifier('Souris, grand rectangle sans fond non sélectionné : glisser depuis son milieu trace un cadre, qui prend ce qui est écrit dedans (pas le rectangle)', memes(r, [T]), JSON.stringify(r))
  s = await ecran(page, 700, 450)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(60)
  verifier('… un clic au même endroit prend le rectangle', memes(await sel(page), [R]))
  let p0 = await pos(page, R)
  await glisserSouris(page, [[700, 450], [720, 460], [740, 470]])
  let p1 = await pos(page, R)
  verifier('… sélectionné, glisser depuis son milieu le déplace', pres(p1.x - p0.x, 40) && pres(p1.y - p0.y, 20), JSON.stringify({ p0, p1 }))
  // Un cadre qui prend le rectangle lui-même (plus de la moitié de son contour)
  await vider(page)
  await glisserSouris(page, [[60, 60], [1000, 600]])
  r = await sel(page)
  verifier('Souris : un cadre autour de tout prend le rectangle et le trait', memes(r, [R, T]), JSON.stringify(r))

  // Les curseurs à la souris
  await vider(page)
  await page.mouse.move(5, 700)
  s = await ecran(page, 1050, 560); await page.mouse.move(s.x, s.y); await page.waitForTimeout(40)
  verifier('Souris, curseur dans le vide : la croix', await curseur(page) === 'crosshair', await curseur(page))
  const pT = await pos(page, T)
  s = await ecran(page, pT.x + 75, pT.y + 3); await page.mouse.move(s.x, s.y); await page.waitForTimeout(40)
  verifier('Souris, curseur à 3 px d\'un trait : « move » (il le saisit)', await curseur(page) === 'move', await curseur(page))
  s = await ecran(page, 800, 200); await page.mouse.move(s.x, s.y); await page.waitForTimeout(40)
  verifier('Souris, curseur dans le vide du rectangle non sélectionné : « pointer » (un clic le prend, glisser entoure)', await curseur(page) === 'pointer', await curseur(page))
  await page.evaluate(id => { const a = window.__app; a.selection.add(id); a.ui.maj() }, R)
  await page.mouse.move(s.x + 2, s.y + 1); await page.waitForTimeout(40)
  verifier('… sélectionné : « move »', await curseur(page) === 'move', await curseur(page))
  const css = await page.evaluate(() => { const z = document.getElementById('zone'); const st = z.style.cursor; z.style.cursor = ''; const c = getComputedStyle(z).cursor; z.style.cursor = st; return c })
  verifier('La feuille de style donne la croix à l\'outil Sélection', css === 'crosshair', css)

  // Espace + glisser et le bouton du milieu déplacent la vue
  await vider(page)
  c0 = await cam(page)
  await page.keyboard.down('Space')
  milieu = await glisserSouris(page, [[1000, 550], [1030, 560], [1060, 570]])
  await page.keyboard.up('Space')
  c1 = await cam(page)
  verifier('Souris, Espace + glisser dans le vide : la vue suit, aucun cadre', pres(c1.x - c0.x, 60) && pres(c1.y - c0.y, 20) && !milieu?.cadre, JSON.stringify({ c0, c1, milieu }))
  c0 = c1
  milieu = await glisserSouris(page, [[1000, 550], [980, 540], [960, 530]], { bouton: 'middle' })
  c1 = await cam(page)
  verifier('Souris, bouton du milieu : la vue suit, aucun cadre', pres(c1.x - c0.x, -40) && pres(c1.y - c0.y, -20) && !milieu?.cadre, JSON.stringify({ c0, c1, milieu }))

  // Panneau d'options ouvert : le premier glisser dans le vide le ferme sans cadre
  await page.evaluate(PAGE_NEUVE)
  const Tri = await poser(page, triangle(300, 400, 150))
  const A2 = await poser(page, trait(600, 300, 100))
  await page.evaluate(id => window.__app.ouvrirOptions(window.__app.forme(id)), Tri)
  await page.waitForTimeout(60)
  c0 = await cam(page)
  // (loin du panneau, qui s'ouvre à côté du triangle)
  milieu = await glisserSouris(page, [[850, 30], [900, 60], [950, 90]])
  const h = await page.evaluate(() => ({ panneau: !document.querySelector('.panneau-forme').hidden, sel: [...window.__app.selection] }))
  c1 = await cam(page)
  verifier('Souris, panneau ouvert : le premier glisser dans le vide le ferme, sans cadre ni vue qui bouge', !h.panneau && !milieu?.cadre && c1.x === c0.x && c1.y === c0.y && !h.sel.includes(A2),
    JSON.stringify({ h, milieu }))
  await glisserSouris(page, [[550, 250], [650, 300], [750, 350]])
  verifier('… le suivant trace le cadre', memes(await sel(page), [A2]))

  // ============ La tablette graphique (stylet sans écran tactile) ============
  await page.evaluate(PAGE_NEUVE)
  const W1 = await poser(page, trait(200, 200, 150)), W2 = await poser(page, trait(200, 300, 150)), W3 = await poser(page, trait(600, 300, 150))
  c0 = await cam(page)
  milieu = await stylet.glisser(boucle(150, 150, 150, 150, 400, 350))
  c1 = await cam(page)
  r = await sel(page)
  verifier('Tablette graphique, Sélection : glisser dans le vide trace un lasso (pas un cadre)', milieu?.lasso && !milieu?.cadre, JSON.stringify(milieu))
  verifier('… qui prend ce qu\'il entoure (W1, W2, pas W3), la vue ne bouge pas', memes(r, [W1, W2]) && c1.x === c0.x && c1.y === c0.y, JSON.stringify(r))
  verifier('… le lasso s\'efface au lâcher', !(await couches(page)).lasso)
  // Un lasso qui n'entoure que 40 % d'un trait ne le prend pas
  await vider(page)
  await stylet.glisser(boucle(560, 260, 560, 260, 660, 340))
  verifier('Tablette graphique : un lasso autour de 40 % d\'un trait ne le prend pas', (await sel(page)).length === 0)
  await stylet.glisser(boucle(560, 260, 560, 260, 700, 340))
  verifier('… autour de 67 %, si', memes(await sel(page), [W3]))
  await vider(page)
  // Survol : 8 px → « pointer », 3 px → « move », le vide → la croix
  s = await ecran(page, 275, 308); await stylet.survol(s.x, s.y); await page.waitForTimeout(40)
  verifier('Tablette graphique, survol à 8 px d\'un trait : « pointer »', await curseur(page) === 'pointer', await curseur(page))
  s = await ecran(page, 275, 303); await stylet.survol(s.x, s.y); await page.waitForTimeout(40)
  verifier('Tablette graphique, survol à 3 px : « move »', await curseur(page) === 'move', await curseur(page))
  s = await ecran(page, 450, 450); await stylet.survol(s.x, s.y); await page.waitForTimeout(40)
  verifier('Tablette graphique, survol dans le vide : la croix', await curseur(page) === 'crosshair', await curseur(page))
  // Appui à 8 px puis glisser : un lasso, le trait ne bouge pas ; à 4 px : le trait bouge
  p0 = await pos(page, W2)
  milieu = await stylet.glisser([[275, 308.5], [380, 330], [380, 270], [170, 270], [170, 330], [275, 330]])
  p1 = await pos(page, W2)
  r = await sel(page)
  verifier('Tablette graphique : appui à 8 px d\'un trait puis glisser → un lasso, le trait ne bouge pas (et il est pris)', milieu?.lasso && p1.x === p0.x && p1.y === p0.y && memes(r, [W2]), JSON.stringify({ milieu, p0, p1, r }))
  await vider(page)
  await stylet.glisser([[275, 304.5], [300, 320], [325, 334.5]])
  p1 = await pos(page, W2)
  verifier('Tablette graphique : appui à 4 px puis glisser → le trait suit', pres(p1.x - p0.x, 50) && pres(p1.y - p0.y, 30), JSON.stringify({ p0, p1 }))
  // Un appui à 8 px, levé sans glisser : le trait est pris
  await vider(page)
  s = await ecran(page, 275, 200 + 8.5); await stylet.clic(s.x, s.y); await page.waitForTimeout(60)
  verifier('Tablette graphique : un appui à 8 px levé sans glisser prend le trait', memes(await sel(page), [W1]))
  s = await ecran(page, 450, 450); await stylet.clic(s.x, s.y); await page.waitForTimeout(60)
  verifier('Tablette graphique : un appui dans le vide désélectionne', (await sel(page)).length === 0)

  // ============ Le lâcher reste immédiat sur une page de 2000 traits ============
  await page.evaluate(PAGE_NEUVE)
  const mesure = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.doc.transact(() => {
      for (let k = 0; k < 2000; k++) {
        const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 3, Math.sin(i / 3) * 6, 0.5)
        t.poser(a.page, { id: 'P' + k, type: 'trait', x: 20 + (k % 50) * 25, y: 20 + Math.floor(k / 50) * 15, pts, couleur: '#1b2230', taille: 2.5, opacite: 1, pression: false, z: k, auteur: t.moi })
      }
    }, 'locale')
    a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
    a.rafraichir()
    const z = document.getElementById('zone'), r = z.getBoundingClientRect()
    const ev = (type, x, y, pointerType) => new PointerEvent(type, { pointerType, pointerId: 40, isPrimary: true, clientX: r.left + x, clientY: r.top + y,
      button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1, bubbles: true })
    const resultats = {}
    for (const pointerType of ['pen', 'mouse']) {
      a.selection.clear()
      // Un lasso tremblé autour de toute la page (un point tous les 4 px, une
      // ondulation de 5 px : la simplification en garde des centaines)
      const coins = [[6, 6], [1340, 6], [1340, 640], [6, 640], [6, 8]]
      const pts = []
      for (let c = 1; c < coins.length; c++) {
        const [ax, ay] = coins[c - 1], [bx, by] = coins[c], l = Math.hypot(bx - ax, by - ay), n = Math.ceil(l / 4)
        const nx = -(by - ay) / l, ny = (bx - ax) / l
        for (let k = 0; k < n; k++) { const w = 5 * Math.sin(pts.length / 2); pts.push([ax + (bx - ax) * k / n + nx * w, ay + (by - ay) * k / n + ny * w]) }
      }
      // La souris trace un cadre : de son coin en haut à gauche à celui d'en bas à droite
      if (pointerType === 'mouse') { pts.length = 0; for (let k = 0; k <= 40; k++) pts.push([6 + 1334 * k / 40, 6 + 634 * k / 40]) }
      z.dispatchEvent(ev('pointerdown', pts[0][0], pts[0][1], pointerType))
      for (const [x, y] of pts.slice(1)) z.dispatchEvent(ev('pointermove', x, y, pointerType))
      const lasso = a.rendu.lasso ? a.rendu.lasso.length / 2 : 0
      const t0 = performance.now()
      z.dispatchEvent(ev('pointerup', pts[pts.length - 1][0], pts[pts.length - 1][1], pointerType))
      resultats[pointerType] = { ms: performance.now() - t0, pris: a.selection.size, lasso }
    }
    return { n: a.formes.length, ...resultats }
  })
  verifier('2000 traits, lasso tremblé autour de la page (stylet) : moins de 50 ms au lâcher, les 2000 pris', mesure.n === 2000 && mesure.pen.ms < 50 && mesure.pen.pris === 2000,
    `${mesure.pen.ms.toFixed(1)} ms, ${mesure.pen.pris} pris, lasso de ${mesure.pen.lasso} points`)
  verifier('2000 traits, cadre autour de la page (souris) : moins de 50 ms au lâcher, les 2000 pris', mesure.mouse.ms < 50 && mesure.mouse.pris === 2000,
    `${mesure.mouse.ms.toFixed(1)} ms, ${mesure.mouse.pris} pris`)
  await ctx.close()
}

// =============== 2. Un écran tactile : le doigt ===============
for (const role of ['dessine', 'deplace']) {
  const { ctx, page, cdp } = await ouvrir({ hasTouch: true }, 'doigt-' + role)
  const { doigt, touche } = outilsCdp(cdp, page)
  await page.evaluate(r => window.__app.choisirDoigt(r), role)
  await outil(page, 'selection')
  const qui = `Doigt (rôle « ${role} »), Sélection`

  await page.evaluate(PAGE_NEUVE)
  const A = await poser(page, trait(200, 200, 150)), B = await poser(page, trait(200, 300, 150)), C = await poser(page, trait(600, 200, 150))
  let c0 = await cam(page)
  let milieu = await doigt.glisser(boucle(150, 150, 150, 150, 400, 350))
  let c1 = await cam(page)
  let r = await sel(page)
  verifier(`${qui} : un doigt qui glisse dans le vide trace un lasso`, milieu?.lasso && !milieu?.cadre, JSON.stringify(milieu))
  verifier(`${qui} : … qui prend A et B, la vue ne bouge pas, rien ne s'écrit`, memes(r, [A, B]) && c1.x === c0.x && c1.y === c0.y
    && await page.evaluate(() => window.__app.formes.length) === 3, JSON.stringify({ r, c0, c1 }))

  // Posé à 15 px d'un mot puis glissé : un lasso ; un toucher à 15 px : le mot
  await vider(page)
  let p0 = await pos(page, C)
  milieu = await doigt.glisser([[675, 215.5], [780, 240], [780, 160], [570, 160], [570, 240], [675, 240]])
  let p1 = await pos(page, C)
  r = await sel(page)
  verifier(`${qui} : posé à 15 px d'un mot puis glissé → un lasso (le mot ne bouge pas, il est pris)`, milieu?.lasso && p1.x === p0.x && memes(r, [C]), JSON.stringify({ milieu, r }))
  await vider(page)
  await doigt.toucher(675, 215.5)
  verifier(`${qui} : un toucher à 15 px prend le mot`, memes(await sel(page), [C]))
  // À 8 px, il le saisit : glissé, le mot suit
  await vider(page)
  await doigt.glisser([[675, 208.5], [700, 220], [725, 238.5]])
  p1 = await pos(page, C)
  verifier(`${qui} : posé à 8 px d'un mot non sélectionné puis glissé → le mot suit`, pres(p1.x - p0.x, 50) && pres(p1.y - p0.y, 30), JSON.stringify({ p0, p1 }))
  // Un toucher dans le vide désélectionne
  await doigt.toucher(500, 450)
  verifier(`${qui} : un toucher dans le vide désélectionne`, (await sel(page)).length === 0)

  // Deux doigts : la vue ; le lasso du premier s'efface
  await page.evaluate(id => { const a = window.__app; a.selection.add(id); a.ui.maj() }, A)
  c0 = await cam(page)
  const e0 = await ecran(page, 450, 420), e1 = await ecran(page, 520, 470)
  await touche('touchStart', [[e0.x, e0.y, 0]])
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[e0.x + k * 10, e0.y + k * 5, 0]])
  const avant = await couches(page)
  await touche('touchStart', [[e0.x + 60, e0.y + 30, 0], [e1.x + 100, e1.y, 1]])
  const deux = await couches(page)
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[e0.x + 60 + k * 10, e0.y + 30, 0], [e1.x + 100 + k * 10, e1.y, 1]])
  await touche('touchEnd', [])
  await page.waitForTimeout(60)
  c1 = await cam(page)
  r = await sel(page)
  verifier(`${qui} : un second doigt efface le lasso du premier et déplace la vue ; la sélection reste`, avant.lasso && !deux.lasso && pres(c1.x - c0.x, 60, 1.5) && memes(r, [A]),
    JSON.stringify({ avant, deux, c0, c1, r }))

  // Un grand rectangle sans fond
  await page.evaluate(PAGE_NEUVE)
  const R = await poser(page, rect(100, 100, 800, 400))
  const T = await poser(page, trait(300, 300, 150))
  await doigt.glisser([[700, 450], [700, 250], [250, 250], [250, 350], [700, 350], [700, 452]])
  r = await sel(page)
  verifier(`${qui}, grand rectangle sans fond non sélectionné : glisser depuis son milieu → lasso (le trait écrit dedans, pas le rectangle)`, memes(r, [T]), JSON.stringify(r))
  await doigt.toucher(700, 450)
  verifier(`${qui} : un toucher au même endroit → le rectangle`, memes(await sel(page), [R]))
  p0 = await pos(page, R)
  await doigt.glisser([[700, 450], [720, 460], [740, 470]])
  p1 = await pos(page, R)
  verifier(`${qui} : sélectionné, glisser depuis son milieu le déplace`, pres(p1.x - p0.x, 40) && pres(p1.y - p0.y, 20), JSON.stringify({ p0, p1 }))

  // Une image se glisse
  await page.evaluate(PAGE_NEUVE)
  const I = await poser(page, { type: 'image', src: 'png1', l: 200, h: 150, m: [1, 0, 0, 1], x: 100, y: 100 })
  p0 = await pos(page, I)
  await doigt.glisser([[200, 175], [230, 195], [260, 215]])
  p1 = await pos(page, I)
  verifier(`${qui} : glisser une image depuis son milieu la déplace`, pres(p1.x - p0.x, 60) && pres(p1.y - p0.y, 40), JSON.stringify({ p0, p1 }))

  // Deux touchers dans un triangle : ses options
  await page.evaluate(PAGE_NEUVE)
  const Tri = await poser(page, triangle(450, 450, 200))
  const st = await ecran(page, 550, 400)
  await touche('touchStart', [[st.x, st.y]]); await touche('touchEnd', [])
  await page.waitForTimeout(80)
  await touche('touchStart', [[st.x + 3, st.y + 2]]); await touche('touchEnd', [])
  await page.waitForTimeout(150)
  let e = await page.evaluate(() => ({ options: window.__app.options, sel: [...window.__app.selection] }))
  verifier(`${qui} : deux touchers dans un triangle ouvrent ses options`, e.options === Tri, JSON.stringify(e))
  await page.keyboard.press('Escape'); await vider(page)

  // Le panneau ouvert : le premier glisser dans le vide le ferme, sans lasso
  await page.evaluate(id => window.__app.ouvrirOptions(window.__app.forme(id)), Tri)
  await page.waitForTimeout(60)
  milieu = await doigt.glisser([[750, 150], [850, 200], [950, 250]])
  e = await page.evaluate(() => ({ panneau: !document.querySelector('.panneau-forme').hidden, sel: [...window.__app.selection] }))
  verifier(`${qui}, panneau ouvert : le premier glisser dans le vide le ferme, sans lasso`, !e.panneau && !milieu?.lasso, JSON.stringify({ e, milieu }))

  // Le mode « Ajouter » : un toucher ajoute ou retire, un lasso ajoute, Échap l'éteint
  await page.evaluate(PAGE_NEUVE)
  const M1 = await poser(page, trait(200, 200, 150)), M2 = await poser(page, trait(200, 300, 150)), M3 = await poser(page, trait(600, 200, 150)), M4 = await poser(page, trait(600, 400, 150))
  await doigt.toucher(275, 200)
  await page.evaluate(() => window.__app.basculerAjout())
  e = await page.evaluate(() => ({ actif: window.__app.ajoutTactile, toast: document.querySelector('.toast')?.textContent ?? '' }))
  verifier(`${qui} : basculerAjout() allume le mode et le dit`, e.actif && /Touchez d'autres objets pour les ajouter ou les retirer ; touchez le vide pour finir\./.test(e.toast), JSON.stringify(e))
  await doigt.toucher(275, 315)            // à 15 px : un candidat
  verifier(`${qui}, mode « Ajouter » : un toucher à 15 px de M2 l'ajoute`, memes(await sel(page), [M1, M2]))
  await doigt.glisser(boucle(560, 160, 560, 160, 800, 240))
  verifier(`${qui}, mode « Ajouter » : un lasso ajoute M3`, memes(await sel(page), [M1, M2, M3]))
  await doigt.toucher(275, 200)
  verifier(`${qui}, mode « Ajouter » : toucher M1 l'en retire`, memes(await sel(page), [M2, M3]))
  await page.keyboard.press('Escape')
  e = await page.evaluate(() => ({ actif: window.__app.ajoutTactile, sel: window.__app.selection.size }))
  verifier(`${qui} : Échap éteint le mode « Ajouter »`, !e.actif && e.sel === 0, JSON.stringify(e))
  await outil(page, 'selection')
  await doigt.toucher(675, 400)
  await page.evaluate(() => window.__app.basculerAjout())
  await doigt.toucher(675, 200)
  await doigt.toucher(500, 470)            // le vide
  e = await page.evaluate(() => ({ actif: window.__app.ajoutTactile, sel: window.__app.selection.size }))
  verifier(`${qui}, mode « Ajouter » : un toucher dans le vide l'éteint et vide la sélection`, !e.actif && e.sel === 0, JSON.stringify(e))
  await doigt.toucher(675, 400)
  await page.evaluate(() => window.__app.basculerAjout())
  await page.waitForTimeout(350)           // (sinon, c'est un double appui : les options)
  await doigt.toucher(675, 400)            // M4 en sort : la sélection est vide
  e = await page.evaluate(() => ({ actif: window.__app.ajoutTactile, sel: window.__app.selection.size }))
  verifier(`${qui}, mode « Ajouter » : la sélection vidée l'éteint`, !e.actif && e.sel === 0, JSON.stringify(e))
  await doigt.toucher(675, 400); await doigt.toucher(275, 300)
  verifier(`${qui} : mode éteint, un toucher remplace la sélection`, memes(await sel(page), [M2]))
  await ctx.close()
}

// =============== 3. Le Stylo en main, le doigt qui déplace ===============
{
  const { ctx, page, cdp } = await ouvrir({ hasTouch: true }, 'stylo-doigt')
  const { doigt } = outilsCdp(cdp, page)
  await page.evaluate(() => window.__app.choisirDoigt('deplace'))
  await outil(page, 'stylo')
  await page.evaluate(PAGE_NEUVE)
  const A = await poser(page, trait(200, 200, 150)), B = await poser(page, trait(200, 300, 150)), C = await poser(page, trait(600, 200, 150))
  const c0 = await cam(page)
  const milieu = await doigt.glisser([[500, 450], [560, 480], [620, 510]])
  const c1 = await cam(page)
  verifier('Stylo + doigt qui déplace : un doigt dans le vide déplace la vue, sans lasso ni encre', pres(c1.x - c0.x, 120) && pres(c1.y - c0.y, 60) && !milieu?.lasso
    && await page.evaluate(() => window.__app.formes.length) === 3, JSON.stringify({ c0, c1, milieu }))
  await doigt.toucher(275, 200)
  verifier('Stylo + doigt qui déplace : un toucher prend A', memes(await sel(page), [A]))
  await page.evaluate(() => window.__app.basculerAjout())
  await doigt.toucher(275, 300); await doigt.toucher(675, 215)
  let r = await sel(page)
  verifier('Stylo + doigt qui déplace : basculerAjout() puis toucher deux autres objets → trois pris', memes(r, [A, B, C]), JSON.stringify(r))
  await doigt.toucher(275, 300)
  r = await sel(page)
  verifier('… toucher B de nouveau l\'en retire', memes(r, [A, C]), JSON.stringify(r))
  // Un objet sélectionné saisi puis glissé : toute la sélection suit
  const pA = await pos(page, A), pC = await pos(page, C)
  await doigt.glisser([[675, 203], [700, 213], [725, 223]])
  const pA1 = await pos(page, A), pC1 = await pos(page, C)
  verifier('… glisser C (sélectionné) emporte toute la sélection', pres(pA1.x - pA.x, 50) && pres(pC1.x - pC.x, 50) && pres(pC1.y - pC.y, 20), JSON.stringify({ pA, pA1, pC, pC1 }))
  await doigt.toucher(500, 470)
  const e = await page.evaluate(() => ({ actif: window.__app.ajoutTactile, sel: window.__app.selection.size }))
  verifier('… toucher le vide : mode éteint, sélection vide', !e.actif && e.sel === 0, JSON.stringify(e))
  await doigt.toucher(275, 300); await doigt.toucher(275, 200)
  verifier('… ensuite un toucher remplace la sélection', memes(await sel(page), [A]))
  // Un autre outil éteint le mode
  await page.evaluate(() => window.__app.basculerAjout())
  await outil(page, 'surligneur')
  verifier('Un autre outil éteint le mode « Ajouter »', !(await page.evaluate(() => window.__app.ajoutTactile)))
  // Une autre page aussi
  await outil(page, 'stylo')
  await doigt.toucher(275, 200)
  await page.evaluate(() => window.__app.basculerAjout())
  await page.evaluate(() => window.__app.nouvellePage())
  verifier('Une autre page éteint le mode « Ajouter »', !(await page.evaluate(() => window.__app.ajoutTactile)))
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications passées`)
if (erreurs.length) console.log('ÉCHEC erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
