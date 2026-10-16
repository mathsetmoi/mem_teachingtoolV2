// Conformité lot 2, au doigt (écran tactile) : prise à 20 px, lasso, deux doigts,
// appui long, barre (Ajouter), toucher à deux / trois doigts, réglage, messages
import { contexte, charger, etat, barre, boiteEcran, outil, poser, vider, verifier, note, fin, msgsDepuis, attendre } from './lib.mjs'

const ctx = await contexte({ hasTouch: true })
const { page, touche } = await charger(ctx, 'doigt')
const toucher = async (x, y, ms = 60) => { await touche('touchStart', [[x, y, 1]]); await attendre(ms); await touche('touchEnd', []); await page.waitForTimeout(350) }
const glisser = async (pts, id = 1) => {
  await touche('touchStart', [[pts[0][0], pts[0][1], id]])
  for (const p of pts.slice(1)) { await touche('touchMove', [[p[0], p[1], id]]); await attendre(16) }
  await touche('touchEnd', []); await page.waitForTimeout(100)
}
const taper = async (pts, ms = 120) => { await touche('touchStart', pts.map((p, i) => [p[0], p[1], i + 1])); await attendre(ms); await touche('touchEnd', []); await page.waitForTimeout(120) }

const reglage = await page.evaluate(() => ({ mtp: navigator.maxTouchPoints, cle: localStorage.getItem('mem-gestes-doigts') }))
note('maxTouchPoints', reglage)

await outil(page, 'selection')
const T = await poser(page, { type: 'trait', x: 300, y: 300, l: 200 })
let b = await boiteEcran(page, T)
const cx = (b.left + b.right) / 2, cy = (b.top + b.bottom) / 2
// ---------- prise à 20 px ----------
await toucher(cx, cy - 19)
let e = await etat(page)
verifier('doigt : toucher à 19 px du centre d\'un trait (bord à ~17 px) le prend', e.sel.includes(T), e.sel)
verifier('doigt : la barre paraît tout de suite', e.barre, e)
let br = await barre(page)
note('barre doigt', br?.boutons.map(x => [x.libelle, x.titre, x.pressed, x.l, x.h]))
verifier('barre au doigt : Dupliquer, Copier, Supprimer, Ajouter, Options', br && br.boutons.map(x => x.libelle).join('|') === 'Dupliquer|Copier|Supprimer|Ajouter|Options', br?.boutons.map(x => x.libelle))
const ms0 = await msgsDepuis(page, 0)
note('messages', ms0)
verifier('message au doigt : « Appui long sur l\'objet : toutes ses options » (jamais « clic »)', ms0.includes('Appui long sur l\'objet : toutes ses options') && !ms0.some(m => /clic/i.test(m)), ms0)
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await toucher(cx, cy - 26)
e = await etat(page)
verifier('doigt : toucher à 26 px ne prend pas', !e.sel.includes(T), e.sel)

// ---------- lasso au doigt dans le vide ----------
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
const T3 = await poser(page, { type: 'trait', x: 300, y: 450, l: 80 })
const b3 = await boiteEcran(page, T3)
const cam0 = (await etat(page)).cam
const tour = []
for (let k = 0; k <= 24; k++) { const a = (k / 24) * 2 * Math.PI; tour.push([(b3.left + b3.right) / 2 + 80 * Math.cos(a), (b3.top + b3.bottom) / 2 + 40 * Math.sin(a)]) }
await glisser(tour)
e = await etat(page)
verifier('choix (a) : à la Sélection, un doigt qui glisse dans le vide fait un lasso (la vue ne bouge pas)', e.sel.length === 1 && e.sel[0] === T3 && e.cam.x === cam0.x && e.cam.y === cam0.y, e)
verifier('après le lasso au doigt : la barre paraît', e.barre, e)

// ---------- deux doigts déplacent la vue ----------
await touche('touchStart', [[700, 600, 1], [800, 600, 2]])
for (let k = 1; k <= 10; k++) { await touche('touchMove', [[700, 600 - 6 * k, 1], [800, 600 - 6 * k, 2]]); await attendre(16) }
await touche('touchEnd', []); await page.waitForTimeout(150)
e = await etat(page)
verifier('choix (a) : deux doigts déplacent la vue à la Sélection', Math.abs(e.cam.y - cam0.y) > 30, { avant: cam0, apres: e.cam })
const kAnn = e.msgs
verifier('un déplacement à deux doigts n\'annule rien', !(await msgsDepuis(page, kAnn)).length && e.n === 2, e)

// ---------- appui long ----------
await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.selection.clear(); a.rendu.toutRedessiner(); a.ui.maj() })
b = await boiteEcran(page, T)
await touche('touchStart', [[(b.left + b.right) / 2, (b.top + b.bottom) / 2, 1]]); await attendre(650)
e = await etat(page)
verifier('appui long 500 ms au doigt sur un objet (Sélection) : menu complet', e.panneau && e.sel.includes(T), e)
await touche('touchEnd', []); await page.waitForTimeout(150)
e = await etat(page)
verifier('le lever de l\'appui long garde le menu et la sélection', e.panneau && e.sel.includes(T), e)
await toucher(1000, 650)  // ferme
await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await touche('touchStart', [[1000, 600, 1]]); await attendre(650)
e = await etat(page)
verifier('appui long dans le vide (Sélection) : menu de la page', e.menuPage, e)
await touche('touchEnd', []); await page.waitForTimeout(150)
await toucher(1100, 300)
e = await etat(page)
verifier('un toucher ailleurs ferme le menu de la page', !e.menuPage, e)

// Stylo, doigt qui dessine (auto, sans stylet vu) : jamais d'appui long, l'encre reste
await outil(page, 'stylo')
const n0 = (await etat(page)).n
await touche('touchStart', [[900, 500, 1]]); await attendre(700)
e = await etat(page)
verifier('Stylo, doigt qui dessine : un appui tenu n\'ouvre aucun menu', !e.panneau && !e.menuPage, e)
await touche('touchEnd', []); await page.waitForTimeout(450)
e = await etat(page)
verifier('Stylo, doigt qui dessine : le point tenu reste de l\'encre', e.n === n0 + 1, { avant: n0, apres: e.n })

// ---------- toucher à deux / trois doigts ----------
await vider(page)
await outil(page, 'stylo')
await glisser([[500, 600], [520, 610], [560, 620], [600, 630]])
e = await etat(page)
const nTrace = e.n
let k = e.msgs
await taper([[700, 400], [780, 400]])
e = await etat(page)
let mm = await msgsDepuis(page, k)
verifier('toucher bref à deux doigts : annule le dernier geste, message « Annulé »', e.n === nTrace - 1 && mm.includes('Annulé'), { n: e.n, nTrace, mm })
k = e.msgs
await taper([[700, 400], [780, 400], [860, 400]])
e = await etat(page)
mm = await msgsDepuis(page, k)
verifier('toucher bref à trois doigts : rétablit, message « Rétabli »', e.n === nTrace && mm.includes('Rétabli'), { n: e.n, mm })
// pas de dessin laissé par le premier doigt
verifier('le toucher à deux doigts au Stylo ne laisse aucune encre', e.n === nTrace, e.n)
// Fin d'un pincement : rien
k = e.msgs
await touche('touchStart', [[600, 400, 1], [700, 400, 2]])
for (let j = 1; j <= 5; j++) { await touche('touchMove', [[600 - 4 * j, 400, 1], [700 + 4 * j, 400, 2]]); await attendre(16) }
await touche('touchEnd', []); await page.waitForTimeout(150)
e = await etat(page)
mm = await msgsDepuis(page, k)
verifier('un pincement bref (moins de 300 ms) n\'annule pas', e.n === nTrace && !mm.includes('Annulé'), { n: e.n, mm })

// Rien à annuler
await vider(page)
await page.evaluate(() => window.__app.nouvellePage())
await page.waitForTimeout(100)
k = (await etat(page)).msgs
await taper([[700, 400], [780, 400]])
mm = await msgsDepuis(page, k)
verifier('deux doigts sans rien à annuler : « Rien à annuler sur cette page »', mm.includes('Rien à annuler sur cette page'), mm)

// ---------- réglage ----------
const menuDoigt = await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find(x => /Rôle du doigt/.test(x.title))
  b.click()
  const m = document.querySelector('.menu-flottant[aria-label="Rôle du doigt"]')
  return { visible: !m.hidden, items: [...m.querySelectorAll('.menu-item')].map(i => ({ t: i.querySelector('.libelle').firstChild.textContent, role: i.getAttribute('role'), checked: i.getAttribute('aria-checked') })), titres: [...m.querySelectorAll('.menu-titre')].map(x => x.textContent) }
})
note('menu doigt', menuDoigt)
verifier('réglage « Deux doigts : annuler » dans le menu du doigt, coché par défaut (écran tactile)', menuDoigt.items.some(i => i.t === 'Deux doigts : annuler' && i.role === 'menuitemcheckbox' && i.checked === 'true') && menuDoigt.titres.includes('Gestes'), menuDoigt)
await page.evaluate(() => { [...document.querySelectorAll('.menu-flottant[aria-label="Rôle du doigt"] .menu-item')].find(i => /Deux doigts/.test(i.textContent)).click() })
const cle = await page.evaluate(() => localStorage.getItem('mem-gestes-doigts'))
await poser(page, { type: 'trait', x: 300, y: 300 })
e = await etat(page)
k = e.msgs
await taper([[700, 400], [780, 400]])
const e2 = await etat(page)
verifier('gestes coupés : deux doigts n\'annulent plus, mémorisé', e2.n === e.n && cle === '0', { cle, avant: e.n, apres: e2.n, msgs: await msgsDepuis(page, k) })

await fin()
