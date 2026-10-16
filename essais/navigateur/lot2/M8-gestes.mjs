// Essais au navigateur du morceau M8 du lot 2 : l'appui long, le toucher à
// deux et trois doigts, les messages selon le pointeur.
// - Appui long (500 ms sans glisser) : à l'outil Sélection au doigt (quel que
//   soit son rôle), au doigt qui « déplace » sous n'importe quel outil, au
//   stylet posé sur l'écran (contexte tactile : iPad, Surface) à la
//   Sélection ; le menu complet de l'objet, ou celui de la page dans le vide ;
//   le lever ne désélectionne rien ; jamais au Stylo (un point qu'on tient),
//   jamais à la tablette graphique (stylet CDP sans écran tactile), jamais à
//   la souris ; jamais deux menus.
// - Toucher bref à deux doigts = Annuler la page visible, à trois = Rétablir ;
//   jamais un pincement, un déplacement, des doigts tenus ; la vue ne bouge
//   pas pour un toucher qui tremble ; un vrai pincement suit les doigts comme
//   avant (doigt restant compris) ; la Gomme, le Point, le Polygone au doigt
//   qui dessine n'écrivent rien sous un toucher à deux doigts, mais la Gomme
//   seule efface toujours ; « Page N rétablie » après une page supprimée ;
//   le réglage (menu du doigt) les coupe, gardé sous 'mem-gestes-doigts' ;
//   éteints par défaut sans écran tactile.
// - Messages : « Appui long » au doigt, « Appui long ou double-clic » au
//   stylet sur l'écran, « Double-clic ou bouton du stylet » à la tablette
//   graphique.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = 'http://localhost:5173/'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
const attendre = ms => new Promise(r => setTimeout(r, ms))

async function charger(ctx, nom) {
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
    window.__vib = []
    navigator.vibrate = ms => { window.__vib.push(ms); return true }
  })
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  return { page, cdp, touche, stylet }
}
const contexte = (o = {}) => nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })

const ETAT = () => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), pm = document.querySelector('.menu-flottant[aria-label="Page"]')
  const menus = [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).length
    + (pn.hidden ? 0 : 1) + (document.querySelector('.menu-partie').hidden ? 0 : 1)
  return {
    n: a.formes.length, ids: a.formes.map(f => f.id), sel: [...a.selection].sort(), options: a.options, outil: a.outil,
    panneau: !pn.hidden, menuPage: !!pm && !pm.hidden, menus, lasso: a.rendu.lasso, cadre: a.rendu.cadreSelection,
    decalage: { ...a.rendu.decalage }, cam: { x: a.cam.x, y: a.cam.y, z: a.cam.z }, page: a.page, pages: a.pages.length,
    msgs: window.__msgs.length, dernier: window.__msgs.slice(-1)[0] ?? null, vib: window.__vib.length, geste: a.geste?.type ?? null,
    cle: localStorage.getItem('mem-gestes-doigts'), poly: a.polyEnCours?.length ?? 0,
  }
}
const etat = page => page.evaluate(ETAT)
const msgsDepuis = (page, k) => page.evaluate(k => window.__msgs.slice(k), k)
const forme = (page, id) => page.evaluate(id => { const f = window.__app.formes.find(x => x.id === id); return f && JSON.parse(JSON.stringify(f)) }, id)
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
const POSER = o => {
  const a = window.__app, t = a.tableau
  const id = (o.type[0].toUpperCase()) + Math.random().toString(36).slice(2, 8)
  let f
  if (o.type === 'triangle') {
    f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + 160, y: o.y }, { x: o.x, y: o.y + 120 }] })
  } else {
    f = { id, type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 0, 0.5, 80, 0, 0.5, 120, 0, 0.5],
      couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}
const poser = (page, o) => page.evaluate(POSER, o)
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
const echap = async page => { await page.keyboard.press('Escape'); await page.waitForTimeout(60) }
const camEgale = (a, b) => Math.abs(a.x - b.x) < 0.01 && Math.abs(a.y - b.y) < 0.01 && Math.abs(a.z - b.z) < 1e-6
const detail = (...x) => JSON.stringify(x)
/** Le réglage des gestes, lu dans le module des réglages de la page (celui
 *  qu'elle a chargé : après une modification à chaud, son adresse porte ?t=) */
const gestesAllumes = page => page.evaluate(() => {
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/src\/reglages\.ts/.test(n)) ?? '/src/reglages.ts'
  return import(url).then(m => m.reglages.gestes)
})

// =============== 1. Au doigt (écran tactile) ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, touche } = await charger(ctx, 'doigt')
  /** Un doigt tenu ms millisecondes, sans bouger */
  const tenir = async (p, ms) => { await touche('touchStart', [[p.x, p.y, 1]]); await attendre(ms); await touche('touchEnd', []); await page.waitForTimeout(80) }
  /** Des doigts posés ensemble, levés ensemble ms plus tard */
  const taper = async (pts, ms = 120) => { await touche('touchStart', pts.map((p, i) => [p.x, p.y, i + 1])); await attendre(ms); await touche('touchEnd', []); await page.waitForTimeout(80) }
  const deux = [{ x: 600, y: 560 }, { x: 680, y: 560 }], trois = [{ x: 600, y: 560 }, { x: 680, y: 560 }, { x: 760, y: 560 }]

  const T = await poser(page, { type: 'trait', x: 300, y: 300 })
  const Tri = await poser(page, { type: 'triangle', x: 700, y: 250 })
  const vide = await ecranDe(page, 500, 470)
  const sT = await ecranDe(page, 360, 300)
  let e = await etat(page)
  verifier('Écran tactile : les gestes à deux doigts sont allumés par défaut (rien d\'écrit dans le navigateur)', e.cle === null && await gestesAllumes(page), detail(e.cle))

  // ----- Sélection, doigt qui dessine : tenu sur un objet -----
  await outil(page, 'selection')
  const tx0 = (await forme(page, T)).x
  await touche('touchStart', [[sT.x, sT.y, 1]]); await attendre(250)
  let pendant = await etat(page)
  await attendre(350)
  let tenu = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt, Sélection : la première prise dit « Appui long sur l\'objet : toutes ses options » (jamais « clic »)',
    (await page.evaluate(() => window.__msgs)).includes('Appui long sur l\'objet : toutes ses options'), detail(await page.evaluate(() => window.__msgs)))
  verifier('Doigt, Sélection : à 250 ms, l\'objet est pris, pas encore de menu', !pendant.panneau && JSON.stringify(pendant.sel) === JSON.stringify([T]), detail(pendant))
  verifier('Doigt, Sélection : tenu 600 ms sur un trait, son menu complet s\'ouvre (avant le lever)', tenu.panneau && tenu.options === T, detail(tenu))
  verifier('… rien n\'a bougé (le trait, la vue), une petite vibration', (await forme(page, T)).x === tx0 && e.decalage.dx === 0 && e.decalage.dy === 0 && tenu.vib === 1 && camEgale(e.cam, pendant.cam), detail(e.decalage, tenu.vib))
  verifier('… et le lever ne désélectionne pas, ne ferme pas le menu ; un seul menu ouvert', e.panneau && e.options === T && JSON.stringify(e.sel) === JSON.stringify([T]) && e.menus === 1 && !e.geste, detail(e))
  await echap(page)

  // ----- Tenu dans le vide : le menu de la page -----
  await page.evaluate(() => { window.__clics = 0; document.addEventListener('click', () => { window.__clics++ }, true) })
  await tenir(vide, 600)
  e = await etat(page)
  verifier('Doigt, Sélection : tenu 600 ms dans le vide, le menu de la page (et pas de lasso)', e.menuPage && !e.panneau && !e.lasso && e.menus === 1 && e.sel.length === 0, detail(e))
  const clics = await page.evaluate(() => window.__clics)
  verifier('… le clic que Chrome tire du lever de l\'appui long ne va nulle part (il tomberait sur le menu)', clics === 0, clics)
  await echap(page)
  e = await etat(page)
  verifier('… Échap le ferme', !e.menuPage && e.menus === 0, detail(e))
  await attendre(400)
  await touche('touchStart', [[vide.x + 40, vide.y, 1]]); await attendre(40); await touche('touchEnd', []); await page.waitForTimeout(80)
  const clics2 = await page.evaluate(() => window.__clics)
  verifier('… un toucher ordinaire, lui, donne son clic', clics2 === 1, clics2)

  // ----- Tenu dans le vide d'un triangle (non sélectionné) : son menu -----
  const dansTri = await ecranDe(page, 740, 290)
  await tenir(dansTri, 600)
  e = await etat(page)
  verifier('Doigt, Sélection : tenu dans le triangle (son intérieur), son menu', e.panneau && e.options === Tri && !e.menuPage && e.menus === 1, detail(e))
  await echap(page)

  // ----- 9 px avant 500 ms : un lasso, pas de menu -----
  {
    const a = await ecranDe(page, 270, 260)
    const vib0 = (await etat(page)).vib
    await touche('touchStart', [[a.x, a.y, 1]]); await attendre(100)
    await touche('touchMove', [[a.x + 9, a.y, 1]]); await attendre(600)
    const avant = await etat(page)
    // Puis le lasso fait le tour du trait
    const tour = [[440, 260], [460, 300], [440, 340], [300, 345], [260, 300], [268, 262]]
    for (const [x, y] of tour) { const p = await ecranDe(page, x, y); await touche('touchMove', [[p.x, p.y, 1]]); await attendre(16) }
    await touche('touchEnd', []); await page.waitForTimeout(100)
    e = await etat(page)
    verifier('Doigt, Sélection : 9 px avant 500 ms, puis tenu : aucun menu', !avant.panneau && !avant.menuPage && avant.vib === vib0, detail(avant))
    verifier('… c\'est un lasso, qui prend le trait entouré', !e.panneau && !e.menuPage && JSON.stringify(e.sel) === JSON.stringify([T]), detail(e))
    await echap(page)
  }

  // ----- Plusieurs objets sélectionnés : l'appui long sur l'un ouvre leur menu commun -----
  await page.evaluate(([a, b]) => { const app = window.__app; app.selection.clear(); app.selection.add(a); app.selection.add(b); app.ui.maj() }, [T, Tri])
  await tenir(sT, 600)
  e = await etat(page)
  verifier('Doigt, Sélection : tenu sur un objet d\'une sélection de deux, leur menu commun ; la sélection reste entière', e.panneau && e.options === '*' && e.sel.length === 2, detail(e))
  await echap(page); await echap(page)

  // ----- Le Stylo, le doigt qui dessine : un point, jamais de menu -----
  await outil(page, 'stylo')
  let e0 = await etat(page)
  await tenir(vide, 600)
  e = await etat(page)
  verifier('Doigt qui dessine, Stylo : tenu 600 ms, un point d\'encre, aucun menu', e.n === e0.n + 1 && !e.panneau && !e.menuPage && e.vib === e0.vib, detail(e0.n, e))
  await page.evaluate(() => window.__app.annuler())

  // ----- Le doigt qui déplace, le Stylo en main : tenu sur un objet, son menu -----
  await page.evaluate(() => window.__app.choisirDoigt('deplace'))
  e0 = await etat(page)
  await tenir(sT, 600)
  e = await etat(page)
  verifier('Doigt qui déplace, Stylo : tenu sur un trait, son menu ; pas d\'encre, la vue n\'a pas bougé', e.panneau && e.options === T && e.n === e0.n && camEgale(e.cam, e0.cam), detail(e0, e))
  await echap(page); await echap(page)
  await outil(page, 'stylo')
  await tenir(vide, 600)
  e = await etat(page)
  verifier('Doigt qui déplace, Stylo : tenu dans le vide, le menu de la page', e.menuPage && !e.panneau && e.n === e0.n && e.menus === 1, detail(e))
  await echap(page)
  // Un appui qui glisse déplace la vue, sans menu
  {
    const c0 = (await etat(page)).cam
    await touche('touchStart', [[vide.x, vide.y, 1]]); await attendre(60)
    for (let k = 1; k <= 5; k++) { await touche('touchMove', [[vide.x + 10 * k, vide.y, 1]]); await attendre(16) }
    await attendre(600)
    await touche('touchEnd', []); await page.waitForTimeout(80)
    e = await etat(page)
    verifier('Doigt qui déplace : glisser puis s\'arrêter longtemps déplace la vue, sans menu', !e.menuPage && !e.panneau && Math.abs(e.cam.x - c0.x - 50) < 1, detail(c0, e.cam))
    await page.evaluate(c => { const a = window.__app; a.cam.x = c.x; a.cam.y = c.y; a.vueChangee() }, c0)
  }
  // L'outil Main, le doigt qui déplace : l'appui long aussi
  await outil(page, 'main')
  await tenir(sT, 600)
  e = await etat(page)
  verifier('Doigt qui déplace, outil Main : tenu sur un trait, son menu', e.panneau && e.options === T && e.menus === 1, detail(e))
  await echap(page); await echap(page)
  await page.evaluate(() => window.__app.choisirDoigt('auto'))
  // Main, doigt qui dessine : la Main déplace la vue, sans menu (ailleurs sur
  // le trait, et assez tard : deux touchers au même endroit feraient un
  // double-clic du navigateur, qui ouvre le menu à la Main)
  await outil(page, 'main')
  await attendre(700)
  const sT4 = await ecranDe(page, 410, 300)
  await tenir(sT4, 600)
  e = await etat(page)
  verifier('Doigt qui dessine, outil Main : tenu, aucun menu (seul le doigt qui déplace en a un hors de la Sélection)', !e.panneau && !e.menuPage, detail(e))
  await echap(page); await echap(page)

  // ----- Un appui coupé par le navigateur (touchCancel) : pas de menu -----
  await outil(page, 'selection')
  {
    const v0 = (await etat(page)).vib
    await touche('touchStart', [[sT.x, sT.y, 1]]); await attendre(150)
    await page.evaluate(() => {})
    await touche('touchCancel', []); await attendre(500); await page.waitForTimeout(60)
    e = await etat(page)
    verifier('Sélection : un appui coupé par le navigateur (pointercancel) n\'ouvre pas de menu ensuite', !e.panneau && !e.menuPage && e.vib === v0, detail(e))
    await echap(page)
  }

  // ----- Toucher à deux doigts : Annuler ; à trois : Rétablir -----
  await outil(page, 'stylo')
  // Un vrai trait au doigt
  {
    const a = await ecranDe(page, 300, 420)
    await touche('touchStart', [[a.x, a.y, 1]])
    for (let k = 1; k <= 8; k++) { await touche('touchMove', [[a.x + 10 * k, a.y + 2 * k, 1]]); await attendre(16) }
    await touche('touchEnd', []); await page.waitForTimeout(100)
  }
  e0 = await etat(page)
  const dernierTrait = e0.ids[e0.ids.length - 1]
  await taper(deux, 120)
  e = await etat(page)
  verifier('Deux doigts posés ensemble 120 ms : « Annulé », le dernier geste de la page part', e.n === e0.n - 1 && !e.ids.includes(dernierTrait) && e.dernier === 'Annulé', detail(e0.n, e))
  verifier('… sans laisser d\'encre (le premier doigt dessinait), la vue n\'a pas bougé', camEgale(e.cam, e0.cam) && !e.geste, detail(e.cam, e0.cam))
  await taper(trois, 120)
  e = await etat(page)
  verifier('Trois doigts : « Rétabli », le trait revient', e.n === e0.n && e.ids.includes(dernierTrait) && e.dernier === 'Rétabli', detail(e))

  // ----- Ce qui n'en est pas un -----
  e0 = await etat(page)
  // Un pincement (l'écart change de 60 px)
  await touche('touchStart', [[600, 560, 1], [700, 560, 2]])
  for (let k = 1; k <= 6; k++) { await touche('touchMove', [[600 - 5 * k, 560, 1], [700 + 5 * k, 560, 2]]); await attendre(16) }
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un pincement rapide : rien n\'est annulé, la vue a zoomé', e.n === e0.n && e.msgs === e0.msgs && e.cam.z > e0.cam.z * 1.2, detail(e0.n, e.n, e.cam))
  await page.evaluate(c => { const a = window.__app; a.cam.x = c.x; a.cam.y = c.y; a.cam.z = c.z; a.vueChangee() }, e0.cam)
  // Un déplacement à deux doigts
  await touche('touchStart', [[600, 560, 1], [700, 560, 2]])
  for (let k = 1; k <= 5; k++) { await touche('touchMove', [[600 + 8 * k, 560, 1], [700 + 8 * k, 560, 2]]); await attendre(16) }
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un déplacement rapide à deux doigts : rien n\'est annulé, la vue a suivi', e.n === e0.n && e.msgs === e0.msgs && Math.abs(e.cam.x - e0.cam.x - 40) < 1, detail(e.cam, e0.cam))
  await page.evaluate(c => { const a = window.__app; a.cam.x = c.x; a.cam.y = c.y; a.cam.z = c.z; a.vueChangee() }, e0.cam)
  // Deux doigts tenus 500 ms
  await taper(deux, 500)
  e = await etat(page)
  verifier('Deux doigts tenus 500 ms : rien', e.n === e0.n && e.msgs === e0.msgs, detail(e))
  // Un second doigt posé 200 ms après le premier (au Stylo : le premier a écrit, le second le jette)
  await touche('touchStart', [[600, 560, 1]]); await attendre(200)
  await touche('touchStart', [[600, 560, 1], [680, 560, 2]]); await attendre(80)
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un second doigt arrivé 200 ms après le premier : rien n\'est annulé', e.n === e0.n && e.msgs === e0.msgs, detail(e))
  // Quatre doigts
  await taper([...trois, { x: 840, y: 560 }], 100)
  e = await etat(page)
  verifier('Quatre doigts : rien', e.n === e0.n && e.msgs === e0.msgs, detail(e))

  // ----- Un toucher qui tremble, des doigts levés à 60 ms d'écart -----
  await touche('touchStart', [[600, 560, 1], [680, 560, 2]]); await attendre(30)
  await touche('touchMove', [[603, 560, 1], [680, 562, 2]]); await attendre(30)
  const tremble = await etat(page)
  // (CDP : touchEnd avec des points lève ces points-là)
  await touche('touchEnd', [[603, 560, 1]]); await attendre(60)
  await touche('touchMove', [[683, 561, 2]]); await attendre(10)
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Deux doigts qui tremblent de 3 px, levés à 60 ms d\'écart : la vue n\'a pas bougé, « Annulé »',
    camEgale(tremble.cam, e0.cam) && camEgale(e.cam, e0.cam) && e.n === e0.n - 1 && e.dernier === 'Annulé', detail(tremble.cam, e.cam, e0.cam, e.n, e.dernier))
  await taper(trois)

  // ----- Un vrai pincement : la vue suit, le doigt restant continue -----
  e0 = await etat(page)
  await touche('touchStart', [[600, 500, 1], [700, 500, 2]])
  for (let k = 1; k <= 6; k++) { await touche('touchMove', [[600 - 6 * k, 500, 1], [700 + 6 * k, 500, 2]]); await attendre(16) }
  const pince = await etat(page)
  await touche('touchEnd', [[564, 500, 1]]); await attendre(30)
  for (let k = 1; k <= 5; k++) { await touche('touchMove', [[736 + 10 * k, 500, 2]]); await attendre(16) }
  const reste = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  // Le zoom autour du centre : la distance passe de 100 à 172 px
  verifier('Un vrai pincement : la vue zoome comme les doigts (×1,72)', Math.abs(pince.cam.z / e0.cam.z - 1.72) < 0.02, detail(pince.cam, e0.cam))
  verifier('… le doigt restant déplace la vue aussitôt (50 px), sans rien écrire ni annuler', Math.abs(reste.cam.x - pince.cam.x - 50) < 1 && e.n === e0.n && e.msgs === e0.msgs, detail(reste.cam, pince.cam, e.n))
  await page.evaluate(c => { const a = window.__app; a.cam.x = c.x; a.cam.y = c.y; a.cam.z = c.z; a.vueChangee() }, e0.cam)
  // Un pincement jamais parti : le doigt restant repart avec le seuil
  e0 = await etat(page)
  await touche('touchStart', [[600, 500, 1], [700, 500, 2]]); await attendre(40)
  await touche('touchEnd', [[600, 500, 1]]); await attendre(30)
  await touche('touchMove', [[705, 500, 2]]); await attendre(20)
  const tremble2 = await etat(page)
  for (let k = 1; k <= 4; k++) { await touche('touchMove', [[705 + 10 * k, 500, 2]]); await attendre(16) }
  const parti = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un pincement jamais parti : le doigt restant qui tremble de 5 px ne bouge pas la vue', camEgale(tremble2.cam, e0.cam), detail(tremble2.cam, e0.cam))
  verifier('… passé 8 px, il déplace la vue depuis son départ (45 px) ; rien n\'est annulé', Math.abs(parti.cam.x - e0.cam.x - 45) < 1 && e.n === e0.n && e.msgs === e0.msgs, detail(parti.cam, e0.cam, e.n))
  await page.evaluate(c => { const a = window.__app; a.cam.x = c.x; a.cam.y = c.y; a.cam.z = c.z; a.vueChangee() }, e0.cam)

  // ----- À la Sélection : le premier doigt avait pris un objet -----
  await outil(page, 'selection')
  e0 = await etat(page)
  await taper([sT, { x: sT.x + 90, y: sT.y + 150 }])
  e = await etat(page)
  verifier('Sélection : un toucher à deux doigts dont le premier tombe sur un objet annule, et rien ne reste sélectionné', e.n === e0.n - 1 && e.sel.length === 0 && e.dernier === 'Annulé' && !e.panneau, detail(e))
  await taper(trois)
  e = await etat(page)
  verifier('… trois doigts le rétablissent ; la barre d\'actions ne reste pas', e.n === e0.n && e.sel.length === 0 && await page.evaluate(() => document.querySelector('.barre-actions').hidden), detail(e))

  // ----- La Gomme, le Point, le Polygone au doigt qui dessine -----
  const G1 = await poser(page, { type: 'trait', x: 300, y: 520 })
  const G2 = await poser(page, { type: 'trait', x: 300, y: 600 })
  const sG1 = await ecranDe(page, 340, 520)
  await outil(page, 'gomme')
  e0 = await etat(page)
  await taper([sG1, { x: sG1.x + 300, y: sG1.y - 200 }])
  e = await etat(page)
  verifier('Gomme, doigt qui dessine : un toucher à deux doigts sur un trait le laisse, et annule le geste d\'avant', e.ids.includes(G1) && !e.ids.includes(G2) && e.n === e0.n - 1 && e.dernier === 'Annulé', detail(e))
  await outil(page, 'point')
  e0 = await etat(page)
  await taper([{ x: 900, y: 600 }, { x: 980, y: 600 }])
  e = await etat(page)
  verifier('Point, doigt qui dessine : un toucher à deux doigts ne pose aucun point, et annule le geste d\'avant', e.n === e0.n - 1 && !e.ids.includes(G1) && e.dernier === 'Annulé', detail(e))
  // Un toucher d'un seul doigt pose toujours un point
  await touche('touchStart', [[900, 600, 1]]); await touche('touchEnd', []); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Point : un seul doigt pose toujours son point (au lever, même bref)', e.n === e0.n, detail(e0.n, e.n))
  // Le Polygone en cours
  await page.evaluate(() => { const a = window.__app; a.typeForme = 'polygone'; a.choisirOutil('forme') })
  for (const [x, y] of [[880, 300], [1000, 320]]) { await touche('touchStart', [[x, y, 1]]); await attendre(30); await touche('touchEnd', []); await page.waitForTimeout(60) }
  const poly = (await etat(page)).poly
  await taper([{ x: 1050, y: 420 }, { x: 1120, y: 420 }])
  e = await etat(page)
  verifier('Polygone en cours au doigt : deux sommets posés, un toucher à deux doigts n\'en ajoute pas', poly === 2 && e.poly === 2, detail(poly, e.poly))
  await echap(page)
  // Le second clic du Segment
  await outil(page, 'segment')
  e0 = await etat(page)
  await touche('touchStart', [[880, 300, 1]]); await attendre(30); await touche('touchEnd', []); await page.waitForTimeout(80)
  const attente = await page.evaluate(() => !!window.__app.traitEnAttente)
  await taper([{ x: 1050, y: 420 }, { x: 1120, y: 420 }])
  e = await etat(page)
  const encore = await page.evaluate(() => !!window.__app.traitEnAttente)
  verifier('Segment en deux touchers : un toucher à deux doigts ne pose pas le second point (le trait attend toujours)', attente && encore && e.n === e0.n - 1, detail(attente, encore, e0.n, e.n))
  await touche('touchStart', [[1000, 360, 1]]); await attendre(30); await touche('touchEnd', []); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… le toucher d\'un seul doigt le finit', e.n === e0.n && !(await page.evaluate(() => !!window.__app.traitEnAttente)), detail(e.n))
  // La Gomme seule efface toujours : au bout de 150 ms, ou dès qu'elle glisse
  await outil(page, 'gomme')
  const G3 = await poser(page, { type: 'trait', x: 300, y: 450 })
  const sG3 = await ecranDe(page, 340, 450)
  await touche('touchStart', [[sG3.x, sG3.y, 1]]); await attendre(60)
  const tot = await etat(page)
  await attendre(160)
  const tard = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(60)
  verifier('Gomme au doigt seul : à 60 ms rien n\'est effacé, à 220 ms (doigt encore posé) le trait l\'est', tot.ids.includes(G3) && !tard.ids.includes(G3), detail(tot.ids.includes(G3), tard.ids.includes(G3)))
  const G4 = await poser(page, { type: 'trait', x: 300, y: 450 })
  const a4 = await ecranDe(page, 340, 410)
  await touche('touchStart', [[a4.x, a4.y, 1]])
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[a4.x, a4.y + 12 * k, 1]])
  const glisse = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(60)
  verifier('Gomme au doigt seul : qui glisse tout de suite à travers un trait, elle l\'efface (doigt encore posé)', !glisse.ids.includes(G4), detail(glisse.ids))
  const G5 = await poser(page, { type: 'trait', x: 300, y: 450 })
  await touche('touchStart', [[sG3.x, sG3.y, 1]]); await touche('touchEnd', []); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('Gomme au doigt seul : un toucher bref efface aussi (à son lever) ; un coup de gomme = une étape', !e.ids.includes(G5), detail(e.ids))
  await page.evaluate(() => window.__app.annuler())
  verifier('… Ctrl+Z (ou deux doigts) le rend', (await etat(page)).ids.includes(G5))

  // ----- Rien à annuler, rien à rétablir -----
  await outil(page, 'stylo')
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(100)
  await taper(deux)
  e = await etat(page)
  verifier('Page neuve : deux doigts disent « Rien à annuler sur cette page »', e.dernier === 'Rien à annuler sur cette page', detail(e.dernier))
  await taper(trois)
  e = await etat(page)
  verifier('… trois doigts « Rien à rétablir sur cette page »', e.dernier === 'Rien à rétablir sur cette page', detail(e.dernier))

  // ----- Une page supprimée, deux doigts sur la page d'arrivée : elle revient -----
  await poser(page, { type: 'trait', x: 300, y: 300 })
  const pSup = await etat(page)
  const rang = pSup.pages
  await page.evaluate(() => window.__app.supprimerPage()); await page.waitForTimeout(120)
  e0 = await etat(page)
  await taper(deux)
  e = await etat(page)
  const derniers = await msgsDepuis(page, e0.msgs)
  verifier(`« Page ${rang} supprimée » puis deux doigts sur la page d'arrivée : la page revient, « Page ${rang} rétablie » (pas « Annulé »)`,
    e0.pages === rang - 1 && e.pages === rang && e.page === pSup.page && derniers.includes(`Page ${rang} rétablie`) && !derniers.includes('Annulé'), detail(e0.pages, e.pages, derniers))

  // ----- Le réglage, dans le menu du doigt -----
  const bouton = '[aria-haspopup="menu"][aria-label^="Rôle du doigt"]'
  await page.click(bouton); await page.waitForTimeout(80)
  const entree = await page.evaluate(() => {
    const m = document.querySelector('.menu-flottant[aria-label="Rôle du doigt"]')
    const b = [...m.querySelectorAll('.menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Deux doigts : annuler')
    return { visible: !m.hidden, titre: [...m.querySelectorAll('.menu-titre')].map(x => x.textContent), role: b?.getAttribute('role'), coche: b?.getAttribute('aria-checked'),
      aide: b?.querySelector('small')?.textContent, radios: m.querySelectorAll('[role="menuitemradio"]').length, filets: m.querySelectorAll('hr.menu-filet').length }
  })
  verifier('Menu du doigt : après les trois rôles, un filet, « Gestes », et « Deux doigts : annuler », case cochée',
    entree.visible && entree.radios === 3 && entree.filets === 1 && JSON.stringify(entree.titre) === JSON.stringify(['Le doigt', 'Gestes'])
    && entree.role === 'menuitemcheckbox' && entree.coche === 'true' && entree.aide === 'trois doigts : rétablir · un toucher bref', detail(entree))
  await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Rôle du doigt"] .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Deux doigts : annuler').click())
  await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… la décocher coupe les gestes, le dit, et le garde sur l\'appareil (nouvelle clé)', e.dernier === 'Gestes à deux et trois doigts coupés.' && e.cle === '0'
    && !(await gestesAllumes(page)), detail(e.dernier, e.cle))
  await page.evaluate(() => window.__app.allerPage(window.__app.pages[0])); await page.waitForTimeout(80)
  e0 = await etat(page)
  await taper(deux)
  e = await etat(page)
  verifier('Gestes coupés : deux doigts n\'annulent rien, ne disent rien', e.n === e0.n && e.msgs === e0.msgs, detail(e0.n, e.n, e.dernier))
  // Coupés, la Gomme efface dès l'appui, comme avant
  await outil(page, 'gomme')
  const G6 = await poser(page, { type: 'trait', x: 300, y: 450 })
  await touche('touchStart', [[sG3.x, sG3.y, 1]]); await attendre(40)
  const aussitot = await etat(page)
  await touche('touchEnd', []); await page.waitForTimeout(60)
  verifier('Gestes coupés : la Gomme au doigt efface dès l\'appui (pas d\'attente)', !aussitot.ids.includes(G6), detail(aussitot.ids))
  // Au rechargement, le choix reste
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(400)
  verifier('… et le choix reste au rechargement', !(await gestesAllumes(page)) && await page.evaluate(() => localStorage.getItem('mem-gestes-doigts')) === '0')
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []; window.__vib = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  await page.click(bouton); await page.waitForTimeout(80)
  const coche2 = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Rôle du doigt"] .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Deux doigts : annuler').getAttribute('aria-checked'))
  await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Rôle du doigt"] .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Deux doigts : annuler').click())
  await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… la recocher les rallume et le dit', coche2 === 'false' && e.dernier === 'Toucher à deux doigts : annuler ; à trois : rétablir.' && e.cle === '1', detail(coche2, e.dernier, e.cle))
  e0 = await etat(page)
  await taper(deux)
  e = await etat(page)
  verifier('… et deux doigts annulent de nouveau', e.dernier === 'Annulé' || e.dernier === 'Rien à annuler sur cette page', detail(e.dernier))
  await ctx.close()
}

// =============== 2. La tablette graphique de la classe (stylet sans écran tactile) ===============
{
  const ctx = await contexte()
  const { page, stylet, touche } = await charger(ctx, 'wacom')
  const T = await poser(page, { type: 'trait', x: 300, y: 300 })
  const sT = await ecranDe(page, 360, 300), vide = await ecranDe(page, 500, 470)
  let e = await etat(page)
  verifier('Sans écran tactile : les gestes à deux doigts sont éteints par défaut, rien d\'écrit', e.cle === null && !(await gestesAllumes(page)))
  await outil(page, 'selection')
  await stylet.bas(sT.x, sT.y); await attendre(80); await stylet.haut(sT.x, sT.y); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Tablette graphique : la première prise dit « Double-clic ou bouton du stylet sur l\'objet : toutes ses options »',
    (await page.evaluate(() => window.__msgs)).includes('Double-clic ou bouton du stylet sur l\'objet : toutes ses options'), detail(await page.evaluate(() => window.__msgs)))
  const titreOptions = await page.evaluate(() => document.querySelector('.barre-actions .action-options')?.title)
  verifier('… et Options, dans la barre, dit « bouton du stylet »', titreOptions === 'Toutes les options (bouton du stylet)', titreOptions)
  // Tenu 700 ms puis glissé : l'objet bouge, aucun menu
  const x0 = (await forme(page, T)).x
  await stylet.bas(sT.x, sT.y); await attendre(700)
  const tenu = await etat(page)
  for (let k = 1; k <= 5; k++) { await stylet.va(sT.x + 8 * k, sT.y); await attendre(16) }
  await stylet.haut(sT.x + 40, sT.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Tablette graphique, Sélection : tenu 700 ms sur un trait, aucun menu', !tenu.panneau && !tenu.menuPage && tenu.vib === 0, detail(tenu))
  verifier('… puis glissé : le trait bouge de 40 px, toujours aucun menu', (await forme(page, T)).x === x0 + 40 && !e.panneau && !e.menuPage, detail(x0, (await forme(page, T)).x, e))
  // Tenu dans le vide : rien ; le lever désélectionne (un clic dans le vide)
  await stylet.bas(vide.x, vide.y); await attendre(700); await stylet.haut(vide.x, vide.y); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Tablette graphique, Sélection : tenu 700 ms dans le vide, pas de menu de la page ; le lever désélectionne', !e.menuPage && !e.panneau && e.sel.length === 0, detail(e))
  // La souris tenue sur un objet : rien non plus
  const sT2 = await ecranDe(page, 400, 300)
  await page.mouse.move(sT2.x, sT2.y); await page.mouse.down(); await attendre(700); await page.mouse.up(); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Souris, Sélection : tenue 700 ms sur un trait, aucun menu (la souris a son clic droit)', !e.panneau && !e.menuPage && JSON.stringify(e.sel) === JSON.stringify([T]), detail(e))
  // Le Stylo : un point tenu
  await outil(page, 'stylo')
  let e0 = await etat(page)
  await stylet.bas(vide.x, vide.y); await attendre(700); await stylet.haut(vide.x, vide.y); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Tablette graphique, Stylo : un point tenu 700 ms, aucun menu', e.n === e0.n + 1 && !e.panneau && !e.menuPage, detail(e0.n, e))
  // Le stylet, la souris, la molette : aucun geste à plusieurs doigts
  e0 = await etat(page)
  for (let k = 0; k < 3; k++) { await stylet.bas(800 + 20 * k, 600); await stylet.haut(800 + 20 * k, 600) }
  await page.mouse.click(900, 650); await page.mouse.click(910, 650)
  await page.mouse.move(700, 500); await page.mouse.wheel(0, 120); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Stylet, souris, molette : jamais « Annulé » ni « Rétabli »', !(await msgsDepuis(page, e0.msgs)).some(m => /Annulé|Rétabli|Rien à/.test(m)), detail(await msgsDepuis(page, e0.msgs)))
  await ctx.close()
}

// =============== 3. Un stylet sur l'écran lui-même (iPad, Surface) ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, stylet, touche } = await charger(ctx, 'ipad')
  const T = await poser(page, { type: 'trait', x: 300, y: 300 })
  const sT = await ecranDe(page, 360, 300), vide = await ecranDe(page, 500, 470)
  await outil(page, 'selection')
  await stylet.bas(sT.x, sT.y); await attendre(60); await stylet.haut(sT.x, sT.y); await page.waitForTimeout(80)
  const msgs = await page.evaluate(() => window.__msgs)
  verifier('Stylet sur l\'écran : la première prise dit « Appui long ou double-clic sur l\'objet : toutes ses options »',
    msgs.includes('Appui long ou double-clic sur l\'objet : toutes ses options'), detail(msgs))
  const titreOptions = await page.evaluate(() => document.querySelector('.barre-actions .action-options')?.title)
  verifier('… et Options, dans la barre, dit « appui long » (l\'Apple Pencil n\'a pas de bouton)', titreOptions === 'Toutes les options (appui long)', titreOptions)
  await echap(page)
  await stylet.bas(sT.x, sT.y); await attendre(600)
  const tenu = await etat(page)
  await stylet.haut(sT.x, sT.y); await page.waitForTimeout(80)
  let e = await etat(page)
  verifier('Stylet sur l\'écran, Sélection : tenu 600 ms sur un trait, son menu ; le lever le laisse', tenu.panneau && tenu.options === T && e.panneau && JSON.stringify(e.sel) === JSON.stringify([T]) && e.menus === 1, detail(tenu, e))
  await echap(page); await echap(page)
  await outil(page, 'selection')
  await stylet.bas(vide.x, vide.y); await attendre(600); await stylet.haut(vide.x, vide.y); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Stylet sur l\'écran, Sélection : tenu dans le vide, le menu de la page', e.menuPage && !e.panneau && !e.lasso && e.menus === 1, detail(e))
  await echap(page)
  // Au Stylo : jamais
  await outil(page, 'stylo')
  let e0 = await etat(page)
  await stylet.bas(sT.x, sT.y + 60); await attendre(600); await stylet.haut(sT.x, sT.y + 60); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Stylet sur l\'écran, Stylo : tenu 600 ms, un point, aucun menu', e.n === e0.n + 1 && !e.panneau && !e.menuPage, detail(e0.n, e))
  await stylet.bas(sT.x, sT.y); await attendre(600); await stylet.haut(sT.x, sT.y); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Stylet sur l\'écran, Stylo : tenu 600 ms sur un trait, aucun menu non plus', e.n === e0.n + 2 && !e.panneau && !e.menuPage, detail(e))
  // « Auto » : le crayon a touché l'écran, le doigt déplace ; son appui long ouvre le menu sous le Stylo
  verifier('« Auto » : le stylet posé sur l\'écran fait passer le doigt en « déplace »', await page.evaluate(() => window.__app.doigtDeplace))
  e0 = await etat(page)
  const sT3 = await ecranDe(page, 410, 300)
  await touche('touchStart', [[sT3.x, sT3.y, 1]]); await attendre(600); await touche('touchEnd', []); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('iPad, Stylo en main : le doigt tenu sur un trait ouvre son menu, sans encre', e.panneau && e.options === T && e.n === e0.n && e.menus === 1, detail(e))
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
if (erreurs.length) console.log('ÉCHEC — erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
