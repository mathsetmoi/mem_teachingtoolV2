// Essais au navigateur du morceau B0-B4-B5 du lot 1 : le socle des pointeurs,
// le rôle du doigt, deux doigts et le seuil du glisser.
// Serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot1/shotsB045`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const pres = (a, b, e = 1e-6) => Math.abs(a - b) <= e
const nav = await chromium.launch()

let premiere = true
async function ouvrir(ctx, nom, page = null) {
  if (!page) { page = await ctx.newPage(); surveiller(page, nom) }
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  if (premiere) { premiere = false; await page.waitForTimeout(1500); await page.waitForFunction(() => window.__app && window.__app.page) }
  await page.waitForTimeout(100)
  return page
}
const CAM = () => { const c = window.__app.cam; return { x: c.x, y: c.y, z: c.z } }
const ETAT = () => {
  const a = window.__app
  return { n: a.formes.length, film: a.tableau.film.length, sel: [...a.selection], partie: a.partie, cam: { x: a.cam.x, y: a.cam.y, z: a.cam.z },
    menuPartie: !document.querySelector('.menu-partie').hidden, toast: document.querySelector('.toast').textContent,
    toastVisible: document.querySelector('.toast').classList.contains('visible') }
}
/** Un rectangle posé sur la page (monde) */
const POSER = ({ x, y, l, h }) => {
  const app = window.__app
  const f = app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }] })
  app.tableau.nouveauGeste(); app.tableau.poser(app.page, f)
  return f.id
}
/** Un trait posé sur la page (monde) */
const TRAIT = ({ x, y }) => {
  const app = window.__app, t = app.tableau
  const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 8, 0, 0.5)
  const f = { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  t.nouveauGeste(); t.poser(app.page, f)
  return f.id
}
const FORME = id => { const f = window.__app.forme(id); return f && JSON.stringify({ x: f.x, y: f.y, pts: f.pts }) }
const ECRAN = ({ x, y }) => window.__app.cam.versEcran(x, y)

/** Le stylet, par le protocole de Chrome (pointerType pen, pression) */
function outilsCdp(cdp) {
  const stylet = {
    bas: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 }),
    va: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
    async trace(pts) { await this.bas(...pts[0]); for (const p of pts.slice(1)) await this.va(...p); await this.haut(...pts[pts.length - 1]) },
  }
  /** Les doigts : [x, y, id] ; r : rayon du contact (largeur 2r en px CSS) */
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const doigt = async (pts, r = 8) => {
    await touche('touchStart', [pts[0]], r)
    for (const p of pts.slice(1)) await touche('touchMove', [p], r)
    await touche('touchEnd', [])
  }
  return { stylet, touche, doigt }
}
const ligne = (x, y, dx, dy, n = 8) => Array.from({ length: n + 1 }, (_, k) => [x + dx * k / n, y + dy * k / n])

// =============== 1. PC sans écran tactile, tablette graphique ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'pc')
  const cdp = await ctx.newCDPSession(page)
  const { stylet } = outilsCdp(cdp)
  const avant = await page.evaluate(() => ({ max: navigator.maxTouchPoints, cache: document.querySelector('.barre-outils button[aria-haspopup=menu]').hidden }))
  verifier('PC non tactile : pas de bouton du rôle du doigt', avant.max === 0 && avant.cache, JSON.stringify(avant))
  const n0 = await page.evaluate(() => window.__app.formes.length)
  await stylet.trace(ligne(400, 300, 200, 40))
  await page.waitForTimeout(250)
  const e = await page.evaluate(() => ({ n: window.__app.formes.length, toast: document.querySelector('.toast').textContent, direct: localStorage.getItem('mem-stylet-direct'), deplace: window.__app.doigtDeplace, dernier: window.__app.dernierPointeur }))
  verifier('Tablette graphique (stylet, écran non tactile) : le trait s\'écrit, rien ne bascule', e.n === n0 + 1 && !/Stylet détecté/.test(e.toast) && e.direct !== '1' && !e.deplace && e.dernier === 'pen', JSON.stringify(e))

  // Un pointeur synthétique refuse d'être capturé : le geste a lieu quand même
  const synth = await page.evaluate(() => {
    const z = document.getElementById('zone'), n = window.__app.formes.length
    const ev = (type, x) => z.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 77, clientX: x, clientY: 420, bubbles: true, pressure: 0.5, button: type === 'pointermove' ? -1 : 0, buttons: type === 'pointerup' ? 0 : 1 }))
    ev('pointerdown', 400); for (let x = 410; x <= 560; x += 10) ev('pointermove', x); ev('pointerup', 560)
    return window.__app.formes.length - n
  })
  await page.waitForTimeout(100)
  verifier('Pointeur synthétique (setPointerCapture refusé) : le trait s\'écrit', synth === 1, `+${synth}`)
  await page.mouse.click(700, 500)
  verifier('Le dernier pointeur est noté (souris)', await page.evaluate(() => window.__app.dernierPointeur) === 'mouse')

  // Les poignées : seulement sous la Sélection
  const id = await page.evaluate(POSER, { x: 500, y: 250, l: 200, h: 150 })
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, id)
  const actives = await page.evaluate(() => window.__app.rendu.poigneesActives)
  verifier('Stylo, figure sélectionnée : les ronds des poignées ne se dessinent pas', actives === false)
  // Écrire à 7 px d'un sommet de la figure sélectionnée : un trait, la figure intacte
  const s = await page.evaluate(ECRAN, { x: 500, y: 400 })
  const f0 = await page.evaluate(FORME, id), n1 = await page.evaluate(() => window.__app.formes.length)
  await page.mouse.move(s.x + 7, s.y); await page.mouse.down(); await page.mouse.move(s.x + 30, s.y - 30, { steps: 6 }); await page.mouse.move(s.x + 60, s.y - 10, { steps: 6 }); await page.mouse.up()
  await page.waitForTimeout(100)
  const apres = await page.evaluate(id => ({ f: (() => { const f = window.__app.forme(id); return f && JSON.stringify({ x: f.x, y: f.y, pts: f.pts }) })(), n: window.__app.formes.length }), id)
  verifier('Stylo à 7 px d\'un sommet de la figure sélectionnée : un trait de plus, la figure n\'a pas bougé', apres.f === f0 && apres.n === n1 + 1, JSON.stringify({ n1, n: apres.n }))

  // Outil Sélection : un clic sur le sommet d'une figure non sélectionnée la prend
  await page.keyboard.press('v')
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  verifier('Outil Sélection : les ronds des poignées se dessinent', await page.evaluate(() => window.__app.rendu.poigneesActives) === true)
  // (le coin du haut : celui du bas porte le trait qu'on vient d'écrire)
  const sh = await page.evaluate(ECRAN, { x: 500, y: 250 })
  await page.mouse.click(sh.x, sh.y)
  await page.waitForTimeout(80)
  const c1 = await page.evaluate(ETAT)
  verifier('Sélection : un clic sur le sommet d\'une figure non sélectionnée prend la figure', c1.sel.length === 1 && c1.sel[0] === id && !c1.partie && !c1.menuPartie, JSON.stringify({ sel: c1.sel, partie: c1.partie, menu: c1.menuPartie }))
  await page.mouse.click(sh.x, sh.y)
  await page.waitForTimeout(80)
  const c2 = await page.evaluate(ETAT)
  verifier('Sélection : un second clic sur ce sommet ouvre son menu', c2.menuPartie && c2.partie?.prise?.quoi === 'sommet', JSON.stringify({ partie: c2.partie, menu: c2.menuPartie }))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')

  // Clic droit sur le sommet d'une autre figure, non sélectionnée : son menu (gardé)
  const id2 = await page.evaluate(POSER, { x: 850, y: 250, l: 150, h: 100 })
  await page.keyboard.press('p')
  const s2 = await page.evaluate(ECRAN, { x: 850, y: 250 })
  await page.mouse.click(s2.x, s2.y, { button: 'right' })
  await page.waitForTimeout(80)
  const c3 = await page.evaluate(ETAT)
  verifier('Clic droit sur le sommet d\'une figure non sélectionnée : le menu de ce sommet', c3.menuPartie && c3.partie?.id === id2 && c3.partie.prise.quoi === 'sommet', JSON.stringify({ partie: c3.partie, menu: c3.menuPartie }))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')

  // Le seuil à la souris : un objet sélectionné qu'on « glisse » de 3 px ne bouge pas, ni le film
  await page.keyboard.press('v')
  const t = await page.evaluate(TRAIT, { x: 400, y: 520 })
  const st = await page.evaluate(ECRAN, { x: 480, y: 520 })
  await page.mouse.click(st.x, st.y)
  const g0 = await page.evaluate(id => ({ f: (() => { const f = window.__app.forme(id); return f.x + ',' + f.y })(), film: window.__app.tableau.film.length, sel: [...window.__app.selection] }), t)
  await page.mouse.move(st.x, st.y); await page.mouse.down(); await page.mouse.move(st.x + 2, st.y + 1); await page.mouse.move(st.x + 3, st.y); await page.mouse.up()
  await page.waitForTimeout(80)
  const g1 = await page.evaluate(id => ({ f: (() => { const f = window.__app.forme(id); return f.x + ',' + f.y })(), film: window.__app.tableau.film.length }), t)
  verifier('Souris, 3 px : l\'objet sélectionné ne bouge pas, pas d\'étape du film', g0.sel[0] === t && g1.f === g0.f && g1.film === g0.film, JSON.stringify({ g0, g1 }))
  await page.mouse.move(st.x, st.y); await page.mouse.down(); await page.mouse.move(st.x + 3, st.y); await page.mouse.move(st.x + 20, st.y + 10, { steps: 4 }); await page.mouse.up()
  await page.waitForTimeout(80)
  const g2 = await page.evaluate(id => { const f = window.__app.forme(id); return { x: f.x, y: f.y } }, t)
  verifier('Souris, 20 px : l\'objet suit, depuis le départ (pas depuis le seuil)', pres(g2.x, 420, 0.01) && pres(g2.y, 530, 0.01), JSON.stringify(g2))

  // Le seuil dans le vide : un clic de 3 px désélectionne, la vue ne bouge pas ; 30 px tracent un cadre
  // (lot 2, M2 : glisser dans le vide sélectionne, la vue ne se déplace plus à la Sélection)
  const v0 = await page.evaluate(CAM)
  await page.mouse.move(900, 600); await page.mouse.down(); await page.mouse.move(903, 600); await page.mouse.up()
  const v1 = await page.evaluate(() => ({ cam: { x: window.__app.cam.x, y: window.__app.cam.y }, sel: window.__app.selection.size }))
  verifier('Sélection, clic de 3 px dans le vide : la vue ne bouge pas, la sélection se vide', v1.cam.x === v0.x && v1.cam.y === v0.y && v1.sel === 0, JSON.stringify(v1))
  await page.mouse.move(900, 600); await page.mouse.down(); await page.mouse.move(930, 620, { steps: 3 })
  const cadre = await page.evaluate(() => !!window.__app.rendu.cadreSelection)
  await page.mouse.up()
  const v2 = await page.evaluate(CAM)
  verifier('Sélection, glisser de 30 px dans le vide : un cadre, la vue ne bouge pas (lot 2)', cadre && v2.x === v0.x && v2.y === v0.y, JSON.stringify({ v0, v2, cadre }))

  // Poignée au stylet : 5 px → le menu du sommet ; 7 px → la figure se déforme
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.choisirPartie(null); a.ui.fermerMenuPartie(); a.rendu.redessinerDirect(); a.ui.maj() }, id)
  const sp = await page.evaluate(ECRAN, { x: 700, y: 250 })
  const p0 = await page.evaluate(FORME, id)
  await stylet.bas(sp.x, sp.y); await stylet.va(sp.x + 3, sp.y); await stylet.va(sp.x + 5, sp.y); await stylet.haut(sp.x + 5, sp.y)
  await page.waitForTimeout(80)
  const p1 = await page.evaluate(id => ({ f: (() => { const f = window.__app.forme(id); return JSON.stringify({ x: f.x, y: f.y, pts: f.pts }) })(), menu: !document.querySelector('.menu-partie').hidden }), id)
  verifier('Poignée au stylet, 5 px : le menu du sommet, la figure intacte', p1.menu && p1.f === p0, JSON.stringify({ menu: p1.menu }))
  await page.keyboard.press('Escape')
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.choisirPartie(null); a.rendu.redessinerDirect(); a.ui.maj() }, id)
  await stylet.bas(sp.x, sp.y); await stylet.va(sp.x + 4, sp.y); await stylet.va(sp.x + 7, sp.y); await stylet.haut(sp.x + 7, sp.y)
  await page.waitForTimeout(80)
  const p2 = await page.evaluate(id => { const a = window.__app, f = a.forme(id); return a.sommetsDe(f)[1] }, id)
  verifier('Poignée au stylet, 7 px : le sommet suit', pres(p2.x, 707, 0.6) && pres(p2.y, 250, 0.6), JSON.stringify(p2))

  // Segment : un clic qui tremble de 3 px pose le premier point ; un glisser trace
  await page.keyboard.press('Escape'); await page.keyboard.press('l')
  const n2 = await page.evaluate(() => window.__app.formes.length)
  await page.mouse.move(400, 640); await page.mouse.down(); await page.mouse.move(403, 640); await page.mouse.up()
  const attente = await page.evaluate(() => window.__app.traitEnAttente !== null)
  await page.keyboard.press('Escape')
  await page.mouse.move(400, 640); await page.mouse.down(); await page.mouse.move(500, 600, { steps: 5 }); await page.mouse.up()
  const n3 = await page.evaluate(() => window.__app.formes.length)
  verifier('Segment : un clic de 3 px attend le second point ; un glisser trace le segment', attente && n3 === n2 + 1, JSON.stringify({ attente, n2, n3 }))
  await page.screenshot({ path: `${D}/01-pc.png` })
  await ctx.close()
}

// =============== 2. Écran tactile : Auto, puis le stylet ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'tactile')
  const cdp = await ctx.newCDPSession(page)
  const { stylet, touche, doigt } = outilsCdp(cdp)
  const BOUTON = '.barre-outils button[aria-haspopup=menu]'
  const b0 = await page.evaluate(s => { const b = document.querySelector(s); return { cache: b.hidden, badge: b.dataset.badge, titre: b.title, max: navigator.maxTouchPoints } }, BOUTON)
  verifier('Écran tactile : le bouton du rôle du doigt, marque « A », titre auto', !b0.cache && b0.badge === 'A' && /auto \(il dessine tant qu'aucun stylet/.test(b0.titre), JSON.stringify(b0))
  await page.screenshot({ path: `${D}/02-bouton-doigt.png`, clip: { x: 0, y: 100, width: 140, height: 640 } })

  const n0 = await page.evaluate(() => window.__app.formes.length)
  await doigt(ligne(400, 300, 150, 30))
  await page.waitForTimeout(150)
  verifier('Auto, avant tout stylet : le doigt dessine', await page.evaluate(() => window.__app.formes.length) === n0 + 1)

  await stylet.trace(ligne(400, 380, 150, 20))
  await page.waitForTimeout(200)
  const d = await page.evaluate(s => ({ n: window.__app.formes.length, toast: document.querySelector('.toast').textContent, action: document.querySelector('.toast .action')?.textContent,
    direct: localStorage.getItem('mem-stylet-direct'), deplace: window.__app.doigtDeplace, titre: document.querySelector(s).title, actives: window.__app.rendu.poigneesActives }), BOUTON)
  verifier('Stylet sur l\'écran tactile : le trait s\'écrit et « Stylet détecté : le doigt déplace la vue » [Changer]',
    d.n === n0 + 2 && /^Stylet détecté : le doigt déplace la vue/.test(d.toast) && d.action === 'Changer' && d.direct === '1' && d.deplace && /stylet détecté : il déplace la vue/.test(d.titre) && d.actives, JSON.stringify(d))
  await page.screenshot({ path: `${D}/03-stylet-detecte.png` })

  // Le doigt déplace la vue, sans encre
  const c0 = await page.evaluate(CAM)
  await doigt(ligne(700, 500, 120, -60))
  await page.waitForTimeout(100)
  const c1 = await page.evaluate(() => ({ cam: { x: window.__app.cam.x, y: window.__app.cam.y }, n: window.__app.formes.length }))
  verifier('Ensuite le doigt déplace la vue (120, −60) et n\'écrit rien', pres(c1.cam.x - c0.x, 120, 0.5) && pres(c1.cam.y - c0.y, -60, 0.5) && c1.n === n0 + 2, JSON.stringify({ c0, c1 }))

  // Toucher un trait le sélectionne ; glisser depuis un trait non sélectionné déplace la vue
  const t = await page.evaluate(TRAIT, { x: 500, y: 150 })
  const st = await page.evaluate(ECRAN, { x: 560, y: 150 })
  await doigt([[st.x, st.y + 9]])                // à 9 px : le doigt prend à 20 px (lot 2, M1 ; 12 px au lot 1)
  await page.waitForTimeout(60)
  verifier('Toucher un trait (à 9 px) le sélectionne', JSON.stringify(await page.evaluate(() => [...window.__app.selection])) === JSON.stringify([t]))
  const t2 = await page.evaluate(TRAIT, { x: 500, y: 250 })
  const st2 = await page.evaluate(ECRAN, { x: 560, y: 250 })
  const x0 = await page.evaluate(id => window.__app.forme(id).x, t2), cc = await page.evaluate(CAM)
  await doigt(ligne(st2.x, st2.y, 80, 0))
  await page.waitForTimeout(60)
  const r2 = await page.evaluate(id => ({ x: window.__app.forme(id).x, cam: window.__app.cam.x, sel: [...window.__app.selection] }), t2)
  verifier('Glisser au doigt depuis un trait non sélectionné : la vue bouge, le trait non', r2.x === x0 && pres(r2.cam - cc.x, 80, 0.5), JSON.stringify(r2))
  // Glisser depuis le trait sélectionné : il se déplace
  const st1 = await page.evaluate(ECRAN, { x: 560, y: 150 })
  const tx0 = await page.evaluate(id => window.__app.forme(id).x, t), cam1 = await page.evaluate(CAM)
  await doigt(ligne(st1.x, st1.y, 60, 0))
  await page.waitForTimeout(60)
  const r3 = await page.evaluate(id => ({ x: window.__app.forme(id).x, cam: window.__app.cam.x }), t)
  verifier('Glisser au doigt le trait sélectionné : il se déplace de 60, la vue reste', pres(r3.x - tx0, 60, 0.5) && r3.cam === cam1.x, JSON.stringify({ tx0, r3 }))
  // Toucher le vide : la sélection se vide
  await doigt([[1000, 600]])
  verifier('Toucher le vide : la sélection se vide', await page.evaluate(() => window.__app.selection.size) === 0)

  // La paume : un contact large ne fait rien
  const pa0 = await page.evaluate(CAM)
  await doigt(ligne(st1.x + 60, st1.y, 100, 40), 25)
  await page.waitForTimeout(60)
  const pa1 = await page.evaluate(() => ({ cam: { x: window.__app.cam.x, y: window.__app.cam.y }, sel: window.__app.selection.size }))
  verifier('Paume (contact de 50 px) : ni la vue ni la sélection ne bougent', pa1.cam.x === pa0.x && pa1.cam.y === pa0.y && pa1.sel === 0, JSON.stringify(pa1))

  // Un doigt posé pendant que le stylet touche l'écran : ignoré
  const n1 = await page.evaluate(() => window.__app.formes.length), pb0 = await page.evaluate(CAM)
  await stylet.bas(400, 600); await stylet.va(430, 610)
  await touche('touchStart', [[900, 500, 3]]); await touche('touchMove', [[950, 520, 3]]); await touche('touchMove', [[1000, 540, 3]])
  await stylet.va(460, 600); await stylet.haut(480, 610)
  await touche('touchEnd', [])
  await page.waitForTimeout(100)
  const pb1 = await page.evaluate(() => ({ cam: { x: window.__app.cam.x, y: window.__app.cam.y }, n: window.__app.formes.length }))
  verifier('Doigt posé pendant que le stylet écrit : ignoré (la vue reste), le trait s\'écrit', pb1.cam.x === pb0.x && pb1.cam.y === pb0.y && pb1.n === n1 + 1, JSON.stringify(pb1))

  // Le stylet qui se pose pendant que le doigt déplace la vue : il trace, la vue s'arrête
  const pc0 = await page.evaluate(CAM)
  await touche('touchStart', [[900, 450, 4]]); await touche('touchMove', [[930, 450, 4]]); await touche('touchMove', [[960, 450, 4]])
  const pc1 = await page.evaluate(CAM)
  await stylet.trace(ligne(400, 660, 120, -20))
  await touche('touchMove', [[1060, 450, 4]]); await touche('touchEnd', [])
  await page.waitForTimeout(100)
  const pc2 = await page.evaluate(() => ({ cam: { x: window.__app.cam.x, y: window.__app.cam.y }, n: window.__app.formes.length }))
  verifier('Stylet posé pendant un glisser au doigt : il trace, la vue s\'arrête là', pres(pc1.x - pc0.x, 60, 0.5) && pc2.cam.x === pc1.x && pc2.n === n1 + 2, JSON.stringify({ pc0, pc1, pc2 }))

  // Le doigt prend un sommet de la figure sélectionnée, et un instrument
  const id = await page.evaluate(POSER, { x: 300, y: 450, l: 160, h: 100 })
  const sa = await page.evaluate(ECRAN, { x: 380, y: 450 })
  await doigt([[sa.x, sa.y]])
  const sv = await page.evaluate(ECRAN, { x: 460, y: 450 })
  const nn = await page.evaluate(() => window.__app.formes.length)
  await doigt(ligne(sv.x, sv.y, 30, -20))
  await page.waitForTimeout(60)
  const som = await page.evaluate(id => { const a = window.__app; return { s: a.sommetsDe(a.forme(id))[1], n: a.formes.length } }, id)
  verifier('Le doigt (outil Stylo) tire un sommet de la figure sélectionnée', pres(som.s.x, 490, 0.6) && pres(som.s.y, 430, 0.6) && som.n === nn, JSON.stringify(som))
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.choisirPartie(null); window.__app.ui.fermerMenuPartie(); window.__app.basculerInstrument('regle') })
  await page.waitForTimeout(80)
  const reg0 = await page.evaluate(() => ({ ...window.__app.instruments.get('regle') }))
  const sr = await page.evaluate(({ x, y }) => window.__app.cam.versEcran(x, y), reg0)
  // Le corps de la règle, un peu à droite de son origine
  const pris = await page.evaluate(({ x, y }) => { const a = window.__app; const r = a.instruments.get('regle'); for (let k = 20; k < 300; k += 10) { const w = { x: r.x + Math.cos(r.a) * k + Math.sin(r.a) * -15, y: r.y + Math.sin(r.a) * k - Math.cos(r.a) * -15 }; const q = a.instrumentSous(w); if (q?.quoi === 'corps') return a.cam.versEcran(w.x, w.y) } return null }, reg0)
  if (pris) {
    await doigt(ligne(pris.x, pris.y, 50, 30))
    await page.waitForTimeout(80)
    const reg1 = await page.evaluate(() => ({ ...window.__app.instruments.get('regle'), n: window.__app.formes.length }))
    verifier('Le doigt déplace la règle (et n\'écrit rien)', pres(reg1.x - reg0.x, 50, 1) && pres(reg1.y - reg0.y, 30, 1) && reg1.n === nn, JSON.stringify({ reg0, reg1 }))
  } else verifier('Le doigt déplace la règle', false, 'corps de la règle introuvable ' + JSON.stringify(sr))
  await page.evaluate(() => window.__app.basculerInstrument('regle'))

  // « Changer » ouvre le menu du rôle du doigt
  // (Adapté au contrôle final du lot 5 : vider le message par le DOM ne suffit
  // pas. Le message garde ses deux parts (toastSimple, toastAction, depuis le
  // lot 3) et les remontre à l'échéance de la première : « Appui long sur
  // l'objet : toutes ses options », posé plus haut, finit parfois juste après,
  // et fait revenir « Stylet détecté … Changer » encore valable 3,5 s ; deja
  // était alors vrai, une fois sur deux. On oublie donc aussi les deux parts.
  // L'original est rangé dans lot5/cf/avant-adaptation.)
  await page.evaluate(() => { const u = window.__app.ui; u.toastSimple = null; u.oublierAction(); const t = document.querySelector('.toast'); t.classList.remove('visible'); t.textContent = '' })
  await stylet.trace(ligne(700, 560, 60, 0))   // pas de nouveau message : déjà détecté
  const deja = await page.evaluate(() => document.querySelector('.toast .action'))
  await page.evaluate(() => window.__app.choisirDoigt('auto'))
  await stylet.trace(ligne(800, 560, 60, 0))
  await page.waitForTimeout(80)
  const changer = await page.$('.toast.visible .action')
  let menu = null
  if (changer) { await changer.click(); await page.waitForTimeout(80); menu = await page.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(m => !m.hidden); return m && { titre: m.querySelector('.menu-titre')?.textContent, entrees: [...m.querySelectorAll('.menu-item')].map(b => b.querySelector('.libelle').firstChild.textContent + (b.getAttribute('aria-checked') === 'true' ? ' ✓' : '') + ' | ' + b.querySelector('small')?.textContent), x: m.getBoundingClientRect().left, barre: document.querySelector('.barre-outils').getBoundingClientRect().right } }) }
  // Lot 2, M8 : le menu du doigt a une quatrième entrée, sous « Gestes » :
  // les gestes à deux et trois doigts (une case à cocher)
  verifier('« Changer » ouvre le menu du doigt, à droite de la barre, Auto coché (stylet détecté)', !deja && menu && menu.titre === 'Le doigt' && menu.entrees.length === 4 && /^Auto ✓ \| stylet détecté/.test(menu.entrees[2]) && /^Deux doigts : annuler/.test(menu.entrees[3]) && menu.x > menu.barre,
    JSON.stringify({ deja: !!deja, menu }))
  await page.screenshot({ path: `${D}/04-menu-doigt.png` })
  // « Le doigt dessine » : il dessine, même après le stylet
  await page.click('.menu-flottant:not([hidden]) .menu-item:nth-of-type(1)')
  await page.waitForTimeout(60)
  const ds = await page.evaluate(s => ({ toast: document.querySelector('.toast').textContent, badge: document.querySelector(s).dataset.badge, menu: [...document.querySelectorAll('.menu-flottant')].some(m => !m.hidden), cle: localStorage.getItem('mem-doigt') }), BOUTON)
  const n4 = await page.evaluate(() => window.__app.formes.length)
  await doigt(ligne(600, 560, 100, 20))
  await page.waitForTimeout(100)
  const n5 = await page.evaluate(() => window.__app.formes.length)
  verifier('« Le doigt dessine » : menu fermé, message, marque ✎, et le doigt dessine après un stylet', ds.toast === 'Le doigt dessine.' && ds.badge === '✎' && !ds.menu && ds.cle === 'dessine' && n5 === n4 + 1, JSON.stringify({ ds, n4, n5 }))
  // Rechargement : le choix reste
  await ouvrir(ctx, 'tactile', page)
  verifier('Rechargé : « Le doigt dessine » est gardé', await page.evaluate(() => window.__app.doigtDeplace === false && localStorage.getItem('mem-doigt') === 'dessine'))
  // Au clavier : le bouton ouvre le menu, la flèche descend, Entrée choisit « déplace »
  await page.focus(BOUTON); await page.keyboard.press('Enter'); await page.waitForTimeout(50)
  const focus1 = await page.evaluate(() => document.activeElement?.getAttribute('aria-checked'))
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter'); await page.waitForTimeout(50)
  const dp = await page.evaluate(s => ({ deplace: window.__app.doigtDeplace, toast: document.querySelector('.toast').textContent, badge: document.querySelector(s).dataset.badge, focus: document.activeElement === document.querySelector(s) }), BOUTON)
  verifier('Au clavier : Entrée ouvre (le choix actuel a le focus), ↓ Entrée → « déplace », le focus revient au bouton', focus1 === 'true' && dp.deplace && dp.badge === '✥' && dp.toast === 'Le doigt déplace la vue et sélectionne ; le stylet écrit.' && dp.focus, JSON.stringify({ focus1, dp }))
  // Auto : le stylet déjà vu est oublié, le doigt redessine
  await page.evaluate(() => window.__app.choisirDoigt('auto'))
  const au = await page.evaluate(() => ({ deplace: window.__app.doigtDeplace, direct: localStorage.getItem('mem-stylet-direct') }))
  const n6 = await page.evaluate(() => window.__app.formes.length)
  await doigt(ligne(600, 500, 100, 20))
  await page.waitForTimeout(100)
  verifier('« Auto » choisi : le stylet est oublié, le doigt redessine', !au.deplace && au.direct === '0' && await page.evaluate(() => window.__app.formes.length) === n6 + 1, JSON.stringify(au))
  // Auto et stylet détecté : gardé au rechargement
  await stylet.trace(ligne(400, 300, 60, 10))
  await ouvrir(ctx, 'tactile', page)
  verifier('Rechargé après un stylet : le doigt déplace toujours (mem-stylet-direct = 1)', await page.evaluate(() => window.__app.doigtDeplace && localStorage.getItem('mem-stylet-direct') === '1'))
  await ctx.close()
}

// =============== 3. Deux doigts, trois doigts, le seuil au doigt ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'doigts')
  const cdp = await ctx.newCDPSession(page)
  const { touche } = outilsCdp(cdp)
  // Stylo, le doigt dessine (aucun stylet) : pincer, lever un doigt, glisser l'autre
  const n0 = await page.evaluate(() => window.__app.formes.length)
  await touche('touchStart', [[500, 400, 0]]); await touche('touchStart', [[500, 400, 0], [700, 400, 1]])
  for (let k = 1; k <= 4; k++) await touche('touchMove', [[500 - 10 * k, 400, 0], [700 + 10 * k, 400, 1]])
  const z1 = await page.evaluate(CAM)
  await touche('touchEnd', [[740, 400, 1]])
  for (let k = 1; k <= 10; k++) await touche('touchMove', [[460 - 20 * k, 400, 0]])
  const z2 = await page.evaluate(CAM)
  await touche('touchEnd', [])
  await page.waitForTimeout(100)
  const n1 = await page.evaluate(() => window.__app.formes.length)
  verifier('Pincer, lever un doigt, glisser l\'autre de 200 px : la vue suit, rien ne s\'écrit', pres(z2.x - z1.x, -200, 0.5) && z2.z === z1.z && n1 === n0, JSON.stringify({ z1, z2, n0, n1 }))
  // Un doigt qui revient : on repince
  await touche('touchStart', [[500, 400, 0]]); await touche('touchStart', [[500, 400, 0], [600, 400, 1]])
  await touche('touchEnd', [[600, 400, 1]])
  await touche('touchStart', [[500, 400, 0], [600, 400, 2]])
  const zr0 = await page.evaluate(CAM)
  for (let k = 1; k <= 5; k++) await touche('touchMove', [[500, 400, 0], [600 + 20 * k, 400, 2]])
  const zr1 = await page.evaluate(CAM)
  await touche('touchEnd', [])
  verifier('Un doigt levé puis reposé : le pincement reprend (zoom ×2)', pres(zr1.z / zr0.z, 2, 0.01), JSON.stringify({ zr0, zr1 }))
  // Trois doigts, l'un se lève : la vue ne saute pas
  await page.waitForTimeout(100)
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner() })
  await touche('touchStart', [[400, 400, 0]]); await touche('touchStart', [[400, 400, 0], [600, 400, 1]]); await touche('touchStart', [[400, 400, 0], [600, 400, 1], [800, 300, 2]])
  await touche('touchMove', [[390, 400, 0], [610, 400, 1], [800, 300, 2]])
  const t0 = await page.evaluate(CAM)
  await touche('touchEnd', [[390, 400, 0]])
  await touche('touchMove', [[610, 400, 1], [800, 300, 2]])
  const t1 = await page.evaluate(CAM)
  await touche('touchMove', [[630, 400, 1], [800, 300, 2]])
  const t2 = await page.evaluate(CAM)
  await touche('touchEnd', [])
  verifier('Trois doigts, l\'un se lève : la vue saute de moins de 2 px, puis le pincement continue', Math.hypot(t1.x - t0.x, t1.y - t0.y) < 2 && Math.abs(t1.z / t0.z - 1) < 0.01 && t2.z !== t1.z, JSON.stringify({ t0, t1, t2 }))

  // Le seuil au doigt (le doigt dessine, outil Sélection) : 7 px, rien ; 9 px, l'objet suit
  await page.waitForTimeout(100)
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner() })
  await page.keyboard.press('v')
  const id = await page.evaluate(TRAIT, { x: 400, y: 300 })
  const s = await page.evaluate(ECRAN, { x: 460, y: 300 })
  await page.evaluate(id => { window.__app.selection.add(id); window.__app.ui.maj() }, id)
  const f0 = await page.evaluate(id => ({ x: window.__app.forme(id).x, film: window.__app.tableau.film.length }), id)
  await touche('touchStart', [[s.x, s.y, 0]]); await touche('touchMove', [[s.x + 4, s.y, 0]]); await touche('touchMove', [[s.x + 7, s.y, 0]]); await touche('touchEnd', [])
  await page.waitForTimeout(60)
  const f1 = await page.evaluate(id => ({ x: window.__app.forme(id).x, film: window.__app.tableau.film.length }), id)
  await touche('touchStart', [[s.x, s.y, 0]]); await touche('touchMove', [[s.x + 5, s.y, 0]]); await touche('touchMove', [[s.x + 9, s.y, 0]]); await touche('touchEnd', [])
  await page.waitForTimeout(60)
  const f2 = await page.evaluate(id => ({ x: window.__app.forme(id).x, film: window.__app.tableau.film.length }), id)
  verifier('Au doigt (Sélection) : 7 px ne déplacent rien (ni film), 9 px déplacent de 9', f1.x === f0.x && f1.film === f0.film && pres(f2.x - f0.x, 9, 0.01) && f2.film > f0.film, JSON.stringify({ f0, f1, f2 }))
  await ctx.close()
}

await nav.close()
verifier('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
process.exit(echecs.length ? 1 : 0)
