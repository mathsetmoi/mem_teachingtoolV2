// Conformité lot 2 à la tablette graphique (stylet CDP, écran non tactile), et cadre à la souris
import { contexte, charger, etat, barre, boiteEcran, outil, poser, vider, verifier, note, fin, msgsDepuis, attendre } from './lib.mjs'

const ctx = await contexte()
const { page, stylet, cdp } = await charger(ctx, 'wacom')
const taper = async (x, y) => { await stylet.survol(x, y); await stylet.bas(x, y); await attendre(40); await stylet.haut(x, y); await page.waitForTimeout(80) }
const tracer = async pts => { await stylet.survol(pts[0][0], pts[0][1]); await stylet.bas(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) { await stylet.va(p[0], p[1]); await attendre(12) } await stylet.haut(pts.at(-1)[0], pts.at(-1)[1]); await page.waitForTimeout(100) }

const info = await page.evaluate(() => ({ mtp: navigator.maxTouchPoints, doigtCache: [...document.querySelectorAll('button')].find(x => /Rôle du doigt/.test(x.title))?.hidden }))
note('écran', info)

await outil(page, 'selection')
const T = await poser(page, { type: 'trait', x: 300, y: 300, l: 200 })
let b = await boiteEcran(page, T)
const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2
await taper(cx, cy - 11)
let e = await etat(page)
verifier('Wacom : à 11 px du centre (≈9 px du bord) le trait est pris', e.sel.includes(T), e.sel)
const ms = await msgsDepuis(page, 0)
verifier('Wacom : message « Double-clic ou bouton du stylet sur l\'objet : toutes ses options »', ms.includes('Double-clic ou bouton du stylet sur l\'objet : toutes ses options'), ms)
let br = await barre(page)
verifier('Wacom : barre sans Ajouter, Options dit « bouton du stylet »', br && !br.boutons.some(x => x.libelle === 'Ajouter') && br.boutons.find(x => x.libelle === 'Options')?.titre === 'Toutes les options (bouton du stylet)', br?.boutons.map(x => [x.libelle, x.titre]))
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await taper(cx, cy - 14)
e = await etat(page)
verifier('Wacom : à 14 px du centre (≈12 px du bord) rien n\'est pris', !e.sel.includes(T), e.sel)

// Lasso au stylet
const T3 = await poser(page, { type: 'trait', x: 300, y: 450, l: 80 })
const b3 = await boiteEcran(page, T3)
const tour = []
for (let k = 0; k <= 30; k++) { const a = (k / 30) * 2 * Math.PI; tour.push([(b3.left + b3.right) / 2 + 80 * Math.cos(a), (b3.top + b3.bottom) / 2 + 40 * Math.sin(a)]) }
await stylet.survol(tour[0][0], tour[0][1]); await stylet.bas(tour[0][0], tour[0][1])
for (const p of tour.slice(1, 15)) { await stylet.va(p[0], p[1]); await attendre(12) }
const pendant = await page.evaluate(() => ({ lasso: !!window.__app.rendu.lasso, cadre: !!window.__app.rendu.cadreSelection, geste: window.__app.geste }))
for (const p of tour.slice(15)) { await stylet.va(p[0], p[1]); await attendre(12) }
await stylet.haut(tour.at(-1)[0], tour.at(-1)[1]); await page.waitForTimeout(100)
e = await etat(page)
verifier('Wacom : glisser dans le vide à la Sélection trace un LASSO et prend ce qui est dedans', pendant.lasso && !pendant.cadre && e.sel.length === 1 && e.sel[0] === T3, { pendant: { lasso: pendant.lasso, cadre: pendant.cadre, forme: pendant.geste?.forme }, sel: e.sel })

// Souris : cadre
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await page.mouse.move(b3.left - 30, b3.top - 30); await page.mouse.down()
await page.mouse.move(b3.left + 20, b3.top + 10, { steps: 4 })
const pendantS = await page.evaluate(() => ({ lasso: !!window.__app.rendu.lasso, cadre: !!window.__app.rendu.cadreSelection, forme: window.__app.geste?.forme }))
await page.mouse.move(b3.right + 30, b3.bottom + 30, { steps: 4 }); await page.mouse.up()
e = await etat(page)
verifier('souris : glisser dans le vide trace un CADRE', pendantS.forme === 'cadre' && e.sel.includes(T3), { pendantS, sel: e.sel })

// Bouton du stylet (button 2) : menu à l'appui
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await stylet.survol(cx, cy)
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cx, y: cy, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
await page.waitForTimeout(60)
e = await etat(page)
verifier('Wacom : bouton du stylet sur un objet ouvre le menu complet à l\'appui', e.panneau && e.sel.includes(T), e)
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cx, y: cy, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
await page.keyboard.press('Escape')
// Bouton du stylet dans le vide : menu de la page
await stylet.survol(1000, 600)
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 1000, y: 600, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
await page.waitForTimeout(60)
e = await etat(page)
verifier('Wacom : bouton du stylet dans le vide ouvre le menu de la page', e.menuPage, e)
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 1000, y: 600, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
await page.keyboard.press('Escape')

// Wacom, appui tenu à la Sélection : pas de menu (écart b)
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await stylet.survol(cx, cy); await stylet.bas(cx, cy); await attendre(700)
e = await etat(page)
verifier('Wacom : appui tenu 700 ms n\'ouvre pas de menu (écart b annoncé)', !e.panneau && !e.menuPage, e)
await stylet.haut(cx, cy); await page.waitForTimeout(80)

// Stylo : écrire dans un triangle ne le prend pas, pas de barre
await vider(page)
const Tri = await poser(page, { type: 'triangle', x: 400, y: 250, l: 300, h: 240 })
await outil(page, 'stylo')
const bt = await boiteEcran(page, Tri)
await tracer([[bt.left + 40, bt.top + 120], [bt.left + 60, bt.top + 125], [bt.left + 80, bt.top + 118], [bt.left + 100, bt.top + 128]])
e = await etat(page)
verifier('Wacom au Stylo : écrire dans un triangle ne le prend pas, pas de barre', e.n === 2 && !e.sel.length && !e.barre, e)
// Un appui tenu au Stylo (Wacom) : de l'encre, pas de menu
await stylet.survol(1000, 600); await stylet.bas(1000, 600); await attendre(700)
e = await etat(page)
verifier('Wacom au Stylo : un point tenu n\'ouvre rien', !e.panneau && !e.menuPage, e)
await stylet.haut(1000, 600); await page.waitForTimeout(450)

// Sélection : intérieur d'un triangle
await outil(page, 'selection')
await taper(bt.left + 30, bt.top + 60)
e = await etat(page)
verifier('Wacom à la Sélection : toucher l\'intérieur du triangle (vide) le prend… ou l\'écriture dedans', e.sel.length === 1, e.sel)
note('pris par le toucher intérieur', e.sel, 'triangle', Tri)
const ecrit = (await etat(page)).ids.find(i => i !== Tri)
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await taper(bt.left + 70, bt.top + 122)
e = await etat(page)
verifier('le trait écrit dans le triangle se prend avant le triangle', e.sel.length === 1 && e.sel[0] === ecrit, { sel: e.sel, ecrit, Tri })

// Gestes à deux doigts : coupés par défaut sans écran tactile
const g = await page.evaluate(() => {
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/src\/reglages\.ts/.test(n)) ?? '/src/reglages.ts'
  return import(url).then(m => m.reglages.gestes)
})
verifier('sans écran tactile : gestes à deux doigts éteints par défaut', g === false, g)

await fin()
