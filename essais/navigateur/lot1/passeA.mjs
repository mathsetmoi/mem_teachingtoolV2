// Essais au navigateur de la passe A du lot 1 : navigation et vue.
// Serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot1/shotsA`
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
async function ouvrir(ctx, nom) {
  const page = await ctx.newPage(); surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  // Juste après une modification du code, le serveur peut encore recharger la page une fois
  if (premiere) { premiere = false; await page.waitForTimeout(1500); await page.waitForFunction(() => window.__app && window.__app.page) }
  await page.waitForTimeout(100)
  return page
}
const CAM = () => { const c = window.__app.cam; return { x: c.x, y: c.y, z: c.z } }
// (Adapté aux réglages par défaut, retouches après le lot 5 : on arrive sur
// une page toujours à 100 %, au centre où on l'avait laissée — en changeant
// de page comme au rechargement ; « sa vue est retrouvée » devient « son
// centre est retrouvé, à 100 % ». Le point du monde au centre de l'écran :)
const CENTRE = () => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: c.x, y: c.y, z: a.cam.z } }
const TOAST = () => document.querySelector('.toast').textContent
/** Un rectangle posé sur la page (monde) */
const POSER = ({ x, y, l, h, id }) => {
  const app = window.__app
  const f = app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }] })
  if (id) f.id = id
  app.tableau.nouveauGeste(); app.tableau.poser(app.page, f)
  return f.id
}
/** Toutes les boîtes des formes sont-elles dans la zone libre ? */
const DANS_ZONE_LIBRE = () => {
  const app = window.__app, r = app.ui.zoneLibre(), b = app.boiteDuContenu()
  const a = app.cam.versEcran(b.x, b.y), c = app.cam.versEcran(b.x + b.l, b.y + b.h)
  return { ok: a.x >= r.x - 0.5 && a.y >= r.y - 0.5 && c.x <= r.x + r.l + 0.5 && c.y <= r.y + r.h + 0.5,
    centre: [(a.x + c.x) / 2 - (r.x + r.l / 2), (a.y + c.y) / 2 - (r.y + r.h / 2)], z: app.cam.z }
}

// =============== 1. Clavier : Ctrl + « + », « − », « 0 », F5 ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'clavier')
  await page.evaluate(() => {
    window.__dp = []
    window.addEventListener('keydown', e => window.__dp.push({ key: e.key, code: e.code, dp: e.defaultPrevented }))
    window.__marque = 'pas rechargé'
  })
  // Autour du pointeur
  await page.mouse.move(900, 300)
  const avant = await page.evaluate(() => { const a = window.__app; return a.cam.versMonde(900 - a.zone.getBoundingClientRect().left, 300) })
  await page.keyboard.press('Control+Equal')
  let c = await page.evaluate(CAM)
  const apres = await page.evaluate(() => { const a = window.__app; return a.cam.versMonde(900 - a.zone.getBoundingClientRect().left, 300) })
  let dp = await page.evaluate(() => window.__dp.at(-1))
  verifier('Ctrl + = zoome le tableau (×1,25), pas la page', pres(c.z, 1.25) && dp.dp, JSON.stringify({ c, dp }))
  verifier('… autour du pointeur (le point sous la souris ne bouge pas)', pres(avant.x, apres.x, 1e-6) && pres(avant.y, apres.y, 1e-6))
  await page.keyboard.press('Control+Minus')
  c = await page.evaluate(CAM)
  verifier('Ctrl + − dézoome', pres(c.z, 1))
  await page.keyboard.press('Control+NumpadAdd'); await page.keyboard.press('Control+NumpadAdd')
  c = await page.evaluate(CAM)
  verifier('Ctrl + « + » du pavé numérique', pres(c.z, 1.5625))
  await page.keyboard.press('Control+NumpadSubtract')
  c = await page.evaluate(CAM)
  verifier('Ctrl + « − » du pavé numérique', pres(c.z, 1.25))
  // AZERTY : « - » sur la touche 6, « à » sur la touche 0
  const azerty = await page.evaluate(() => {
    const k = (key, code, o = {}) => document.body.dispatchEvent(new KeyboardEvent('keydown', { key, code, ctrlKey: true, bubbles: true, cancelable: true, ...o }))
    const r = {}
    r.moins = !k('-', 'Digit6'); r.z1 = window.__app.cam.z
    r.plus = !k('+', 'Equal', { shiftKey: true }); r.z2 = window.__app.cam.z
    r.altgr = !k('=', 'Equal', { altKey: true }); r.z3 = window.__app.cam.z
    return r
  })
  verifier('AZERTY : Ctrl + « - » (touche 6) dézoome, Ctrl + Maj + « = » zoome', azerty.moins && pres(azerty.z1, 1) && azerty.plus && pres(azerty.z2, 1.25), JSON.stringify(azerty))
  verifier('AltGr (Ctrl + Alt) n\'est pas un raccourci de zoom', !azerty.altgr && pres(azerty.z3, 1.25))
  const zero = await page.evaluate(() => !document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'à', code: 'Digit0', ctrlKey: true, bubbles: true, cancelable: true })))
  await page.waitForTimeout(400)
  c = await page.evaluate(CAM)
  verifier('AZERTY : Ctrl + « à » (touche 0) revient à 100 %', zero && pres(c.z, 1), JSON.stringify(c))
  // Ctrl + 0 animé : à mi-chemin, le zoom est entre les deux
  await page.keyboard.press('Control+Equal'); await page.keyboard.press('Control+Equal')
  const anim = await page.evaluate(async () => {
    const app = window.__app, z0 = app.cam.z
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '0', code: 'Digit0', ctrlKey: true, bubbles: true, cancelable: true }))
    await new Promise(r => setTimeout(r, 90))
    const zm = app.cam.z
    await new Promise(r => setTimeout(r, 300))
    return { z0, zm, z1: app.cam.z }
  })
  verifier('Ctrl + 0 : 100 %, cadrage animé (~250 ms)', anim.zm < anim.z0 && anim.zm > 1 && anim.z1 === 1, JSON.stringify(anim))

  // F5, Maj + F5 : rien ne se recharge, un message dit comment faire
  await page.keyboard.press('F5')
  await page.waitForTimeout(200)
  dp = await page.evaluate(() => ({ d: window.__dp.at(-1), m: window.__marque }))
  const toastF5 = await page.evaluate(TOAST)
  verifier('F5 ne recharge pas le tableau', dp.d.key === 'F5' && dp.d.dp && dp.m === 'pas rechargé', JSON.stringify(dp))
  verifier('… et le message dit comment recharger (Ctrl+R)', /F5 ne recharge pas MEM teachingtool pendant le cours.*Ctrl\+R/.test(toastF5), toastF5)
  await page.keyboard.press('Shift+F5')
  dp = await page.evaluate(() => ({ d: window.__dp.at(-1), m: window.__marque }))
  verifier('Maj + F5 non plus', dp.d.dp && dp.m === 'pas rechargé')
  const ctrlF5 = await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'F5', code: 'F5', ctrlKey: true, bubbles: true, cancelable: true })))
  const ctrlR = await page.evaluate(() => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', ctrlKey: true, bubbles: true, cancelable: true })))
  verifier('Ctrl + F5 et Ctrl + R restent au navigateur', ctrlF5 && ctrlR)

  // Une fenêtre ouverte : la page ne zoome pas, le tableau non plus
  const zAvantDlg = (await page.evaluate(CAM)).z
  const dlg = await page.evaluate(() => {
    const d = document.createElement('dialog'); d.innerHTML = '<input>'; document.body.appendChild(d); d.showModal()
    const i = d.querySelector('input'); i.focus()
    const r = !i.dispatchEvent(new KeyboardEvent('keydown', { key: '=', code: 'Equal', ctrlKey: true, bubbles: true, cancelable: true }))
    d.close(); d.remove()
    return r
  })
  verifier('Dialogue ouvert : Ctrl + = bloqué, sans effet', dlg && pres((await page.evaluate(CAM)).z, zAvantDlg))

  // La séance d'automatismes : le professeur peut grossir l'écran
  const seance = await page.evaluate(() => {
    document.body.classList.add('en-seance')
    const r = document.body.dispatchEvent(new KeyboardEvent('keydown', { key: '=', code: 'Equal', ctrlKey: true, bubbles: true, cancelable: true }))
    document.body.classList.remove('en-seance')
    return r
  })
  verifier('Séance ouverte : Ctrl + = reste au navigateur', seance && pres((await page.evaluate(CAM)).z, zAvantDlg))

  // Molette avec Ctrl au-dessus des barres : la page ne zoome pas
  const roues = await page.evaluate(() => {
    const w = (el, o) => !el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true, ...o }))
    return {
      barre: w(document.querySelector('.barre-outils'), { ctrlKey: true }),
      barreSansCtrl: w(document.querySelector('.barre-outils'), {}),
      haut: w(document.querySelector('.barre-haut'), { metaKey: true }),
    }
  })
  verifier('Ctrl/⌘ + molette au-dessus des barres : la page ne zoome pas ; sans Ctrl, rien n\'est bloqué', roues.barre && roues.haut && !roues.barreSansCtrl, JSON.stringify(roues))
  // Safari : gesture* neutralisés
  const geste = await page.evaluate(() => ['gesturestart', 'gesturechange', 'gestureend'].map(t => !document.body.dispatchEvent(new Event(t, { bubbles: true, cancelable: true }))))
  verifier('Événements gesture* neutralisés', geste.every(Boolean), JSON.stringify(geste))
  const os = await page.evaluate(() => [getComputedStyle(document.documentElement).overscrollBehaviorX, getComputedStyle(document.body).overscrollBehaviorY])
  verifier('overscroll-behavior: none (pas de « page précédente » au balayage)', os[0] === 'none' && os[1] === 'none', os.join(','))
  await ctx.close()
}

// =============== 2. Molette ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'molette')
  await page.mouse.move(700, 400)
  let c0 = await page.evaluate(CAM)
  await page.mouse.wheel(0, 100); await page.waitForTimeout(80)
  let c = await page.evaluate(CAM)
  verifier('Molette : la vue défile (vers le bas), sans zoomer', pres(c.z, 1) && pres(c.y, c0.y - 100) && pres(c.x, c0.x), JSON.stringify(c))
  c0 = c
  await page.keyboard.down('Shift'); await page.mouse.wheel(0, 100); await page.keyboard.up('Shift'); await page.waitForTimeout(80)
  c = await page.evaluate(CAM)
  verifier('Maj + molette : à l\'horizontale', pres(c.z, 1) && pres(c.y, c0.y) && pres(c.x, c0.x - 100), JSON.stringify(c))
  // Firefox : des lignes, et Maj sans conversion en deltaX
  c0 = c
  const ff = await page.evaluate(() => {
    const z = document.getElementById('zone'), a = window.__app
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: 1, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    const c1 = { x: a.cam.x, y: a.cam.y, z: a.cam.z }
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: 3, deltaMode: 1, shiftKey: true, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    return { c1, c2: { x: a.cam.x, y: a.cam.y, z: a.cam.z } }
  })
  verifier('Firefox (lignes) : 3 lignes = 99 px ; Maj : à l\'horizontale', pres(ff.c1.y, c0.y - 99) && pres(ff.c2.x, c0.x - 99) && ff.c2.z === 1, JSON.stringify(ff))
  // Ctrl + molette : ×1,1 par cran, autour du pointeur
  const m0 = await page.evaluate(() => { const a = window.__app; return a.cam.versMonde(700, 400) })
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control'); await page.waitForTimeout(80)
  c = await page.evaluate(CAM)
  const m1 = await page.evaluate(() => { const a = window.__app; return a.cam.versMonde(700, 400) })
  verifier('Ctrl + molette : un cran = ×1,1 exactement, autour du pointeur', pres(c.z, 1.1, 1e-9) && pres(m0.x, m1.x, 1e-6) && pres(m0.y, m1.y, 1e-6), JSON.stringify(c))
  // Une molette libre à grands à-coups : jamais plus de ×1,1 par événement
  const libre = await page.evaluate(() => {
    const z = document.getElementById('zone'), a = window.__app, z0 = a.cam.z
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: -2400, ctrlKey: true, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    return a.cam.z / z0
  })
  verifier('Molette libre (deltaY = 2400) : ×1,1 au plus', pres(libre, 1.1, 1e-9), String(libre))
  // Pincement du pavé (ctrlKey, petits pas) : continu
  const pince = await page.evaluate(() => {
    const z = document.getElementById('zone'), a = window.__app, z0 = a.cam.z
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: -4.5, ctrlKey: true, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    return a.cam.z / z0
  })
  verifier('Pincement du pavé : continu, exp(0,045)', pres(pince, Math.exp(0.045), 1e-9), String(pince))
  // Pavé tactile sous Windows : glissement rapide (deltaY entier ≥ 50) : défile
  const win = await page.evaluate(() => {
    const z = document.getElementById('zone'), a = window.__app, z0 = a.cam.z, y0 = a.cam.y
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: 120, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    return { dz: a.cam.z / z0, dy: a.cam.y - y0 }
  })
  verifier('Glissement rapide au pavé (deltaY = 120) : défile, ne zoome plus', win.dz === 1 && pres(win.dy, -120), JSON.stringify(win))

  // Le réglage, dans le menu du %
  await page.click('.zoom-texte')
  const menu = await page.evaluate(() => {
    const m = document.querySelector('.menu-flottant'), b = document.querySelector('.zoom-texte')
    const r = m.getBoundingClientRect(), z = document.querySelector('.barre-zoom').getBoundingClientRect()
    return { visible: !m.hidden, role: m.getAttribute('role'), exp: b.getAttribute('aria-expanded'), haspopup: b.getAttribute('aria-haspopup'), title: b.title,
      items: [...m.querySelectorAll('.menu-item')].map(i => ({ t: i.querySelector('.libelle').textContent, k: i.querySelector('.touche')?.textContent ?? '', role: i.getAttribute('role'), ch: i.getAttribute('aria-checked'), dis: i.getAttribute('aria-disabled') })),
      titre: m.querySelector('.menu-titre')?.textContent, dessus: r.bottom <= z.top, droite: Math.abs(r.right - z.right) < 1 }
  })
  verifier('Le bouton % ouvre le menu au-dessus de la barre, aligné à droite', menu.visible && menu.role === 'menu' && menu.exp === 'true' && menu.haspopup === 'menu' && menu.dessus && menu.droite && menu.title === 'Zoom et molette de la souris', JSON.stringify(menu))
  verifier('Entrées : 100 % (Ctrl + 0), Tout voir (Maj + 1), Voir la sélection (Maj + 2, grisée), Molette : Fait défiler (coché) / Zoome',
    menu.items.length === 5 && menu.items[0].t === '100 %' && menu.items[0].k === 'Ctrl + 0' && menu.items[1].k === 'Maj + 1' && menu.items[2].dis === 'true'
    && menu.items[3].t.startsWith('Fait défiler') && menu.items[3].t.includes('Ctrl + molette : zoomer') && menu.items[3].ch === 'true' && menu.items[4].ch === 'false' && menu.titre === 'Molette de la souris', JSON.stringify(menu.items))
  await page.screenshot({ path: D + '/10-menu-zoom.png' })
  await page.getByRole('menuitemradio', { name: 'Zoome', exact: true }).click()
  const choix = await page.evaluate(() => ({ cle: localStorage.getItem('mem-molette'), ferme: document.querySelector('.menu-flottant').hidden, exp: document.querySelector('.zoom-texte').getAttribute('aria-expanded'), toast: document.querySelector('.toast').textContent }))
  verifier('« Zoome » : mémorisé (mem-molette), menu fermé, message', choix.cle === 'zoome' && choix.ferme && choix.exp === 'false' && /La molette zoome \(comme dans GeoGebra\) ; Maj \+ molette fait défiler\./.test(choix.toast), JSON.stringify(choix))
  c0 = await page.evaluate(CAM)
  await page.mouse.wheel(0, 100); await page.waitForTimeout(80)
  c = await page.evaluate(CAM)
  verifier('Réglage « zoome » : un cran de molette dézoome de ×1,1', pres(c.z, c0.z / 1.1, 1e-9), JSON.stringify(c))
  const pave = await page.evaluate(() => {
    const z = document.getElementById('zone'), a = window.__app, z0 = a.cam.z, y0 = a.cam.y, x0 = a.cam.x
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: 7.25, deltaX: 1.5, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    const r1 = { dz: a.cam.z / z0, dy: a.cam.y - y0 }
    const y1 = a.cam.y, x1 = a.cam.x
    z.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, shiftKey: true, clientX: 700, clientY: 400, bubbles: true, cancelable: true }))
    return { r1, r2: { dz: a.cam.z / z0, dx: a.cam.x - x1 } }
  })
  verifier('Réglage « zoome » : le pavé (deux doigts) défile toujours ; Maj + molette défile', pave.r1.dz === 1 && pres(pave.r1.dy, -7.25) && pave.r2.dz === 1 && pres(pave.r2.dx, -100), JSON.stringify(pave))
  // Rechargé : le réglage est retrouvé
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(100)
  await page.click('.zoom-texte')
  const coche = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant [role=menuitemradio]')].map(i => i.getAttribute('aria-checked')))
  verifier('Rechargé : « Zoome » est toujours coché', coche[0] === 'false' && coche[1] === 'true', JSON.stringify(coche))
  // Échap ferme le menu sans changer d'outil
  const outil0 = await page.evaluate(() => window.__app.outil)
  await page.keyboard.press('Escape')
  const apresEchap = await page.evaluate(() => ({ outil: window.__app.outil, ferme: document.querySelector('.menu-flottant').hidden }))
  verifier('Échap ferme le menu, l\'outil ne change pas', apresEchap.ferme && apresEchap.outil === outil0, JSON.stringify(apresEchap))
  await page.click('.zoom-texte')
  await page.getByRole('menuitemradio', { name: /Fait défiler/ }).click()
  const retour = await page.evaluate(() => ({ cle: localStorage.getItem('mem-molette'), toast: document.querySelector('.toast').textContent }))
  verifier('« Fait défiler » : message « Ctrl + molette zoome »', retour.cle === 'defile' && retour.toast === 'La molette fait défiler la page ; Ctrl + molette zoome.', JSON.stringify(retour))
  // Un appui ailleurs ferme le menu ; un second clic sur % aussi
  await page.click('.zoom-texte')
  await page.mouse.click(600, 300)
  const ferme1 = await page.evaluate(() => document.querySelector('.menu-flottant').hidden)
  await page.click('.zoom-texte'); await page.click('.zoom-texte')
  const ferme2 = await page.evaluate(() => document.querySelector('.menu-flottant').hidden)
  verifier('Un appui ailleurs ferme le menu ; re-cliquer % aussi', ferme1 && ferme2)
  // Au clavier : flèches entre les entrées (la vue ne bouge pas)
  await page.focus('.zoom-texte'); await page.keyboard.press('Enter')
  const cam0 = await page.evaluate(CAM)
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  const focus = await page.evaluate(() => document.activeElement?.querySelector('.libelle')?.textContent)
  await page.waitForTimeout(250)
  const cam1 = await page.evaluate(CAM)
  verifier('Au clavier : Entrée ouvre, les flèches passent d\'une entrée à l\'autre (sautent la grisée), la vue ne bouge pas', focus?.startsWith('Fait défiler') && JSON.stringify(cam0) === JSON.stringify(cam1), focus)
  await page.keyboard.press('Escape')
  const foc = await page.evaluate(() => document.activeElement?.className)
  verifier('Échap rend la main au bouton %', foc === 'zoom-texte', foc)
  await ctx.close()
}

// =============== 3. Tout voir, voir la sélection, pastille ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'cadrer')
  const boutons = await page.evaluate(() => [...document.querySelectorAll('.barre-zoom .bouton')].map(b => b.title))
  verifier('Barre du zoom : − % + Tout voir, avec leurs raccourcis', JSON.stringify(boutons) === JSON.stringify(['Dézoomer (Ctrl + −)', 'Zoomer (Ctrl + +)', 'Tout voir (Maj + 1)']), JSON.stringify(boutons))
  // Page vide
  await page.evaluate(() => { const a = window.__app; a.cam.x = 3000; a.cam.z = 2; a.rendu.toutRedessiner() })
  await page.getByRole('button', { name: 'Tout voir (Maj + 1)' }).click()
  await page.waitForTimeout(350)
  let c = await page.evaluate(CAM)
  verifier('Page vide : Tout voir revient à 100 % sur l\'origine, et le dit', c.x === 120 && c.y === 120 && c.z === 1 && (await page.evaluate(TOAST)) === 'La page est vide.', JSON.stringify(c))
  // Un petit contenu : reste à 100 %, centré
  await page.evaluate(POSER, { x: 2000, y: 1500, l: 100, h: 60, id: 'petit' })
  await page.keyboard.press('Shift+Digit1')
  await page.waitForTimeout(350)
  let d = await page.evaluate(DANS_ZONE_LIBRE)
  verifier('Maj + 1 : un petit contenu reste à 100 % et se centre dans la zone libre', d.ok && d.z === 1 && Math.abs(d.centre[0]) < 0.5 && Math.abs(d.centre[1]) < 0.5, JSON.stringify(d))
  // Un grand contenu : tout entre, sans dépasser 100 %
  await page.evaluate(POSER, { x: -3000, y: -800, l: 200, h: 200, id: 'loin' })
  await page.getByRole('button', { name: 'Tout voir (Maj + 1)' }).click()
  const mi = await page.waitForTimeout(100).then(() => page.evaluate(CAM))
  await page.waitForTimeout(300)
  d = await page.evaluate(DANS_ZONE_LIBRE)
  verifier('Tout voir : tout le contenu entre dans la zone libre (entre les barres)', d.ok && d.z < 1, JSON.stringify(d))
  verifier('… avec un cadrage animé', mi.z > d.z && mi.z < 1, JSON.stringify(mi))
  await page.screenshot({ path: D + '/20-tout-voir.png' })
  // Voir la sélection : rien, puis une figure
  await page.keyboard.press('Shift+Digit2')
  verifier('Maj + 2 sans sélection : « Rien n\'est sélectionné. »', (await page.evaluate(TOAST)) === 'Rien n\'est sélectionné.')
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.add('petit'); a.ui.maj() })
  await page.click('.zoom-texte')
  const actif = await page.evaluate(() => document.querySelectorAll('.menu-flottant .menu-item')[2].getAttribute('aria-disabled'))
  await page.getByRole('menuitem', { name: /Voir la sélection/ }).click()
  await page.waitForTimeout(350)
  c = await page.evaluate(CAM)
  const vs = await page.evaluate(() => {
    const a = window.__app, r = a.ui.zoneLibre(), b = a.boiteDuContenu(a.formes.filter(f => f.id === 'petit'))
    const p = a.cam.versEcran(b.x + b.l / 2, b.y + b.h / 2)
    return [p.x - (r.x + r.l / 2), p.y - (r.y + r.h / 2)]
  })
  verifier('Voir la sélection (menu, actif avec une sélection) : centrée, 200 % au plus', actif === null && c.z === 2 && Math.abs(vs[0]) < 0.5 && Math.abs(vs[1]) < 0.5, JSON.stringify({ c, vs }))
  // Interrompre une animation : un appui sur le tableau l'arrête
  await page.mouse.move(600, 400)
  await page.evaluate(() => window.__app.toutVoir())
  await page.waitForTimeout(60)
  await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' })
  const z1 = (await page.evaluate(CAM)).z
  await page.waitForTimeout(300)
  const coupe = { z1, z2: (await page.evaluate(CAM)).z }
  verifier('Un appui sur le tableau arrête le cadrage en cours', coupe.z1 === coupe.z2 && coupe.z1 < 2 && coupe.z1 > 0.3, JSON.stringify(coupe))
  // La pastille « Revenir au contenu »
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.cam.x = -50000; a.cam.y = 0; a.zoomer(1) })
  await page.waitForTimeout(500)
  const tot = await page.evaluate(() => document.querySelector('.retour-contenu').hidden)
  await page.waitForTimeout(700)
  const pastille = await page.evaluate(() => {
    const b = document.querySelector('.retour-contenu'), r = b.getBoundingClientRect()
    return { hidden: b.hidden, texte: b.textContent, title: b.title, x: r.left + r.width / 2, bas: innerHeight - r.bottom, h: r.height }
  })
  verifier('Pastille « Revenir au contenu » : pas avant 1 s, puis en bas au centre', tot && !pastille.hidden && pastille.texte === 'Revenir au contenu' && pastille.title === 'Tout voir (Maj + 1)' && Math.abs(pastille.x - 683) < 1 && pastille.bas >= 15 && pastille.h === 44, JSON.stringify(pastille))
  await page.screenshot({ path: D + '/21-pastille.png' })
  await page.click('.retour-contenu')
  await page.waitForTimeout(350)
  d = await page.evaluate(DANS_ZONE_LIBRE)
  const cachee = await page.evaluate(() => document.querySelector('.retour-contenu').hidden)
  verifier('Clic sur la pastille : tout voir, et elle part', d.ok && cachee, JSON.stringify(d))
  // Une droite qui traverse l'écran compte, même si ses deux points sont loin
  const droite = await page.evaluate(async () => {
    const a = window.__app
    a.tableau.supprimer(a.page, a.formes.map(f => f.id))
    const f = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: -100000, y: 300 }, { x: -99000, y: 300 }] })
    f.prolonge = 'droite'
    a.tableau.poser(a.page, f)
    a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.zoomer(1)
    await new Promise(r => setTimeout(r, 1200))
    return { horsVue: a.contenuHorsVue(), pastille: !document.querySelector('.retour-contenu').hidden }
  })
  verifier('Une droite visible à l\'écran compte comme du contenu (pas de pastille)', !droite.horsVue && !droite.pastille, JSON.stringify(droite))
  const vide = await page.evaluate(async () => {
    const a = window.__app
    a.tableau.supprimer(a.page, a.formes.map(f => f.id))
    a.cam.x = -90000; a.zoomer(1)
    await new Promise(r => setTimeout(r, 1200))
    return !document.querySelector('.retour-contenu').hidden
  })
  verifier('Page vide : jamais de pastille', !vide)
  await ctx.close()
}

// =============== 4. Flèches sans sélection ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'fleches')
  const r = await page.evaluate(() => window.__app.ui.zoneLibre())
  let c0 = await page.evaluate(CAM)
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(250)
  let c = await page.evaluate(CAM)
  verifier('→ sans sélection : la vue montre ce qui est à droite (¼ de la zone)', pres(c.x, c0.x - r.l / 4) && pres(c.y, c0.y), JSON.stringify({ c0, c, l: r.l }))
  c0 = c
  await page.keyboard.press('Shift+ArrowDown')
  await page.waitForTimeout(250)
  c = await page.evaluate(CAM)
  verifier('Maj + ↓ : ¾ de la hauteur vers le bas', pres(c.y, c0.y - r.h * 3 / 4) && pres(c.x, c0.x), JSON.stringify(c))
  // Deux appuis rapides : deux pas entiers
  c0 = c
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(40); await page.keyboard.press('ArrowUp')
  await page.waitForTimeout(250)
  c = await page.evaluate(CAM)
  verifier('Deux appuis rapides sur ↑ : deux pas entiers', pres(c.y, c0.y + r.h / 2), JSON.stringify(c))
  // Touche tenue : 1/12, tout de suite
  c0 = c
  const tenue = await page.evaluate(() => {
    const a = window.__app, x0 = a.cam.x
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', code: 'ArrowLeft', repeat: true, bubbles: true, cancelable: true }))
    return a.cam.x - x0
  })
  verifier('Touche tenue : 1/12 de la zone à chaque répétition, tout de suite', pres(tenue, r.l / 12), String(tenue))
  // Avec une sélection : la sélection bouge (1 mm), pas la vue
  await page.evaluate(POSER, { x: 300, y: 300, l: 100, h: 100, id: 'carre' })
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.add('carre'); a.ui.maj() })
  c0 = await page.evaluate(CAM)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200)
  c = await page.evaluate(CAM)
  const x = await page.evaluate(() => window.__app.forme('carre').x)
  verifier('Avec une sélection : → pousse la sélection d\'1 mm, la vue ne bouge pas', JSON.stringify(c) === JSON.stringify(c0) && pres(x, 300 + 37.8 / 10, 0.5), String(x))
  // Le programme de construction ouvert garde ← → ; ↑ ↓ déplacent la vue
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.ui.maj() })
  await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click()
  await page.evaluate(() => document.activeElement?.blur())
  c0 = await page.evaluate(CAM)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(200)
  const cG = await page.evaluate(CAM)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(250)
  c = await page.evaluate(CAM)
  verifier('Programme de construction ouvert : → lui reste, ↓ déplace la vue', cG.x === c0.x && pres(c.y, c0.y - r.h / 4), JSON.stringify({ c0, cG, c }))
  await ctx.close()
}

// =============== 5. Pages et session ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  let page = await ouvrir(ctx, 'session')
  await page.evaluate(POSER, { x: 300, y: 200, l: 200, h: 100, id: 'p1' })
  await page.evaluate(() => { const a = window.__app; a.cam.z = 2; a.cam.x = -150; a.cam.y = -40; a.zoomer(1) })
  const vue1 = await page.evaluate(CAM), centre1v = await page.evaluate(CENTRE)
  await page.getByRole('button', { name: 'Nouvelle page' }).click()
  let c = await page.evaluate(CAM)
  verifier('Nouvelle page : vue neutre (100 %, origine), pas le zoom de la page quittée', c.x === 120 && c.y === 120 && c.z === 1, JSON.stringify(c))
  await page.evaluate(() => { const a = window.__app; a.cam.x = 500; a.cam.y = 77; a.zoomer(1.25) })
  const vue2 = await page.evaluate(CAM), centre2v = await page.evaluate(CENTRE)
  await page.keyboard.press('PageUp')
  c = await page.evaluate(CENTRE)
  verifier('Retour à la page 1 : son centre est retrouvé, à 100 % (elle était à 200 %)', vue1.z === 2 && pres(c.x, centre1v.x, 1e-6) && pres(c.y, centre1v.y, 1e-6) && c.z === 1, JSON.stringify({ c, centre1v }))
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(500)
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem('mem-session')))
  const ids = await page.evaluate(() => window.__app.pages)
  verifier('Session locale : { v: 1, page, vues: { id: [cx, cy, z] } } (la page 1, quittée à 100 %)', session.v === 1 && session.page === ids[1] && Object.keys(session.vues).length === 2 && session.vues[ids[0]].length === 3 && session.vues[ids[0]][2] === 1, JSON.stringify(session))
  const doc = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/deps\/yjs\.js/.test(n))
    const Y = await import(url)
    const t = window.__app.tableau, octets = Y.encodeStateAsUpdate(t.doc)
    const texte = new TextDecoder('latin1').decode(octets)
    return { cles: [...t.doc.share.keys()], session: texte.includes('session') || texte.includes('vues') }
  })
  verifier('Rien de la session n\'entre dans le document Yjs', !doc.session && !doc.cles.some(k => /session|vue/.test(k)), JSON.stringify(doc))
  // Rechargé : même page, même vue ; la fenêtre change de taille, le centre tient
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(150)
  let apres = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages, cam: (a => { const c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: c.x, y: c.y, z: a.cam.z } })(window.__app) }))
  verifier('Rechargé : la page courante et son centre sont retrouvés, à 100 % (elle était à 125 %)', apres.page === ids[1] && pres(vue2.z, 1.25, 1e-9) && pres(apres.cam.x, centre2v.x, 0.3) && pres(apres.cam.y, centre2v.y, 0.3) && apres.cam.z === 1, JSON.stringify({ apres, centre2v }))
  const centre1 = await page.evaluate(() => window.__app.cam.versMonde(window.__app.rendu.l / 2, window.__app.rendu.h / 2))
  // On ferme, puis on rouvre dans une fenêtre plus grande (même navigateur)
  await page.close()
  page = await ctx.newPage(); surveiller(page, 'session-2')
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(URL0); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(150)
  const centre2 = await page.evaluate(() => window.__app.cam.versMonde(window.__app.rendu.l / 2, window.__app.rendu.h / 2))
  verifier('Vidéoprojecteur (1920 × 1080) : le même point reste au centre', pres(centre1.x, centre2.x, 0.05) && pres(centre1.y, centre2.y, 0.05), JSON.stringify({ centre1, centre2 }))
  await page.keyboard.press('PageUp')
  c = await page.evaluate(CENTRE)
  verifier('… et la page 1 reprend son centre, à 100 %', c.z === 1 && pres(c.x, centre1v.x, 0.05) && pres(c.y, centre1v.y, 0.05), JSON.stringify({ c, centre1v }))
  // Sans session (un tableau d'avant ce lot) : la page écrite est cadrée entière
  await page.evaluate(() => localStorage.removeItem('mem-session'))
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(150)
  apres = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages }))
  const cadre = await page.evaluate(DANS_ZONE_LIBRE)
  verifier('Sans session : première page, son contenu cadré (100 % au plus)', apres.page === apres.pages[0] && cadre.ok && cadre.z <= 1, JSON.stringify(cadre))
  // Session illisible, ou d'un autre tableau : ignorée
  await page.evaluate(() => localStorage.setItem('mem-session', '{pas du json'))
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(150)
  apres = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages, s: JSON.parse(localStorage.getItem('mem-session')) }))
  verifier('Session illisible : ignorée (puis réécrite proprement)', apres.page === apres.pages[0] && apres.s.v === 1)
  await page.evaluate(() => localStorage.setItem('mem-session', JSON.stringify({ v: 1, page: 'autre', vues: { autre: [0, 0, 3], x: 'mal' } })))
  await page.reload(); await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(150)
  apres = await page.evaluate(() => ({ page: window.__app.page, pages: window.__app.pages, s: JSON.parse(localStorage.getItem('mem-session')) }))
  verifier('Session d\'un autre tableau : ignorée, oubliée à l\'écriture suivante', apres.page === apres.pages[0] && !('autre' in apres.s.vues) && !('x' in apres.s.vues), JSON.stringify(apres.s))
  // Une page supprimée disparaît de la session
  await page.evaluate(() => window.__app.supprimerPage())
  await page.waitForTimeout(100)
  await page.evaluate(() => { window.__app.zoomer(1.1) })
  await page.waitForTimeout(500)
  const s2 = await page.evaluate(() => ({ s: JSON.parse(localStorage.getItem('mem-session')), pages: window.__app.pages }))
  verifier('Une page supprimée disparaît de la session', Object.keys(s2.s.vues).every(k => s2.pages.includes(k)) && s2.pages.length === 1, JSON.stringify(s2))
  // Base et clés existantes intactes
  const bases = await page.evaluate(async () => (await indexedDB.databases()).map(d => d.name))
  verifier('La base IndexedDB s\'appelle toujours mem-tableau-local', bases.includes('mem-tableau-local'), JSON.stringify(bases))
  await ctx.close()
}

// =============== 6. Mouvement réduit, téléphone ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, reducedMotion: 'reduce' })
  const page = await ouvrir(ctx, 'calme')
  await page.evaluate(POSER, { x: 2000, y: 2000, l: 100, h: 100 })
  const imm = await page.evaluate(() => { const a = window.__app; a.toutVoir(); return a.cam.z })
  const d = await page.evaluate(DANS_ZONE_LIBRE)
  verifier('prefers-reduced-motion : le cadrage est immédiat', imm === 1 && d.ok, JSON.stringify(d))
  await ctx.close()
}
{
  const ctx = await nav.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const page = await ouvrir(ctx, 'telephone')
  const zl = await page.evaluate(() => window.__app.ui.zoneLibre())
  await page.evaluate(POSER, { x: 100, y: 100, l: 100, h: 100 })
  await page.evaluate(() => { const a = window.__app; a.cam.x = -40000; a.zoomer(1) })
  await page.waitForTimeout(1200)
  // Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : au
  // téléphone, la barre du zoom est cachée (le pincement zoome) et la barre
  // des outils est posée en bas ; la pastille passe au-dessus d'elle, et
  // « 100 % » et « Tout voir » sont dans « Plus », dont le menu tient dans
  // l'écran (au lieu de celui du bouton %)
  const geo = await page.evaluate(() => {
    const p = document.querySelector('.retour-contenu').getBoundingClientRect(), z = document.querySelector('.barre-outils').getBoundingClientRect()
    return { visible: !document.querySelector('.retour-contenu').hidden, basPastille: p.bottom, hautZoom: z.top, gauche: p.left, droite: p.right }
  })
  verifier('Téléphone : la pastille passe au-dessus de la barre du bas (la barre des outils ; celle du zoom est cachée)', geo.visible && geo.basPastille <= geo.hautZoom && geo.gauche >= 0 && geo.droite <= 390, JSON.stringify({ geo, zl }))
  await page.screenshot({ path: D + '/30-telephone-pastille.png' })
  await page.click('.barre-haut > .bouton.points')
  const m = await page.evaluate(() => { const e = document.querySelector('.menu-flottant[aria-label="Plus"]'); const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, vue: !!e.querySelector('[data-action="zoom-100"]') && !!e.querySelector('[data-action="tout-voir"]') } })
  verifier('Téléphone : le menu « Plus » (100 %, Tout voir) tient dans l\'écran (8 px des bords)', m.vue && m.l >= 8 && m.r <= 382 && m.t >= 8 && m.b <= 844 - 8, JSON.stringify(m))
  await page.screenshot({ path: D + '/31-telephone-menu.png' })
  await ctx.close()
}

// =============== 7. Le menu au clavier, avec un panneau ouvert ; oublier les vues ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'menu-clavier')
  const OUVERT = () => !document.querySelector('.menu-flottant').hidden
  // Le programme de construction ouvert : Échap ferme le menu, pas le programme
  await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click()
  await page.click('.zoom-texte')
  await page.keyboard.press('Escape')
  const e1 = await page.evaluate(() => ({ menu: !document.querySelector('.menu-flottant').hidden, programme: !document.querySelector('.panneau-construction').hidden, outil: window.__app.outil }))
  verifier('Programme de construction ouvert : Échap ferme le menu, pas le programme', !e1.menu && e1.programme && e1.outil === 'stylo', JSON.stringify(e1))
  await page.keyboard.press('Escape')
  const e2 = await page.evaluate(() => !document.querySelector('.panneau-construction').hidden)
  verifier('… un second Échap ferme le programme', !e2)
  // Ouvert au clavier : ← → ne déplacent pas la vue ; Espace choisit l'entrée
  await page.focus('.zoom-texte'); await page.keyboard.press('Enter')
  const c0 = await page.evaluate(CAM)
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(250)
  const c1 = await page.evaluate(CAM)
  verifier('Menu ouvert : ← → ne déplacent pas la vue', JSON.stringify(c0) === JSON.stringify(c1) && await page.evaluate(OUVERT), JSON.stringify({ c0, c1 }))
  await page.keyboard.press('End')
  await page.keyboard.press('Space')
  const esp = await page.evaluate(() => ({ cle: localStorage.getItem('mem-molette'), ouvert: !document.querySelector('.menu-flottant').hidden, focus: document.activeElement?.className, espace: window.__app.espace }))
  verifier('Espace choisit l\'entrée (« Zoome »), ferme le menu, rend la main au bouton %', esp.cle === 'zoome' && !esp.ouvert && esp.focus === 'zoom-texte' && !esp.espace, JSON.stringify(esp))
  await page.evaluate(() => { localStorage.setItem('mem-molette', 'defile') })
  // Entrée sur une entrée : même chose
  await page.keyboard.press('Enter'); await page.keyboard.press('Home'); await page.keyboard.press('Enter')
  const ent = await page.evaluate(() => ({ ouvert: !document.querySelector('.menu-flottant').hidden, focus: document.activeElement?.className, z: window.__app.cam.z }))
  verifier('Entrée sur « 100 % » : fait, menu fermé, la main au bouton %', !ent.ouvert && ent.focus === 'zoom-texte', JSON.stringify(ent))
  // Tab part ailleurs : le menu se ferme
  await page.click('.zoom-texte')
  await page.keyboard.press('Tab')
  const tab = await page.evaluate(() => ({ ouvert: !document.querySelector('.menu-flottant').hidden, focus: document.activeElement?.title }))
  verifier('Tab vers un autre bouton : le menu se ferme', !tab.ouvert, JSON.stringify(tab))
  // La fenêtre change de taille : le menu se ferme (il ne serait plus collé à son bouton)
  await page.click('.zoom-texte')
  await page.setViewportSize({ width: 1024, height: 768 }); await page.waitForTimeout(150)
  verifier('La fenêtre change de taille : le menu se ferme', !(await page.evaluate(OUVERT)))
  // L'appui qui ferme un menu est reconnu (la passe B s'en servira)
  await page.click('.zoom-texte')
  await page.evaluate(() => { window.__avale = null; document.getElementById('zone').addEventListener('pointerdown', e => { window.__avale = window.__menus.avale(e) }, { once: true }) })
  await page.mouse.click(500, 400)
  const av = await page.evaluate(() => ({ ouvert: !document.querySelector('.menu-flottant').hidden, avale: window.__avale }))
  verifier('Un appui sur le tableau ferme le menu, et avale() le reconnaît', !av.ouvert && av.avale === true, JSON.stringify(av))
  // Oublier les vues (un autre tableau s'ouvre) : celles des autres pages ne
  // reviennent pas, ni en mémoire ni à l'écriture suivante
  const oubli = await page.evaluate(async () => {
    const a = window.__app, A = a.page
    a.zoomer(2)
    a.nouvellePage()
    const avant = JSON.parse(localStorage.getItem('mem-session'))
    a.oublierVues()
    const juste = localStorage.getItem('mem-session')
    a.allerPage(A)
    return { avant, juste, z: a.cam.z, x: a.cam.x, y: a.cam.y, s: JSON.parse(localStorage.getItem('mem-session')), A }
  })
  // (la page A porte le point posé par l'appui d'avant : elle s'ouvre cadrée sur lui, à 100 %)
  verifier('oublierVues : la session est effacée ; une page revue ne reprend pas sa vue oubliée', oubli.avant.vues[oubli.A][2] === 2 && oubli.juste === null && oubli.z === 1 && oubli.s.page === oubli.A && oubli.s.vues[oubli.A][2] === 1, JSON.stringify(oubli))
  await ctx.close()
}

// =============== 8. Safari sur Mac : le pincement du pavé arrive en gesture* ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  // Chromium n'a pas GestureEvent : on fait comme Safari sur Mac (aucun toucher)
  await ctx.addInitScript(() => { window.GestureEvent = class extends UIEvent {} })
  const page = await ouvrir(ctx, 'safari')
  const r = await page.evaluate(() => {
    const a = window.__app, zone = document.getElementById('zone'), b = zone.getBoundingClientRect()
    const geste = (type, o) => { const e = Object.assign(new Event(type, { bubbles: true, cancelable: true }), o); zone.dispatchEvent(e); return e.defaultPrevented }
    const cx = 700, cy = 400, m0 = a.cam.versMonde(cx - b.left, cy - b.top), z0 = a.cam.z
    const p1 = geste('gesturestart', { scale: 1, clientX: cx, clientY: cy })
    const pendant = a.pinceSafari
    const p2 = geste('gesturechange', { scale: 1.2, clientX: cx, clientY: cy })
    const p3 = geste('gesturechange', { scale: 1.5, clientX: cx, clientY: cy })
    const z1 = a.cam.z
    // Safari peut envoyer aussi une molette avec ctrlKey : elle ne zoome pas en double
    zone.dispatchEvent(new WheelEvent('wheel', { deltaY: -10, ctrlKey: true, clientX: cx, clientY: cy, bubbles: true, cancelable: true }))
    const z2 = a.cam.z
    const p4 = geste('gestureend', { scale: 1.5, clientX: cx, clientY: cy })
    const m1 = a.cam.versMonde(cx - b.left, cy - b.top)
    return { prevenus: [p1, p2, p3, p4], pendant, apres: a.pinceSafari, f: z1 / z0, double: z2 === z1, fixe: Math.hypot(m1.x - m0.x, m1.y - m0.y) }
  })
  verifier('Safari Mac : pincer le pavé zoome le tableau (×1,5) autour des doigts, sans zoom en double par la molette', r.prevenus.every(Boolean) && r.pendant && !r.apres && pres(r.f, 1.5, 1e-9) && r.double && r.fixe < 1e-6, JSON.stringify(r))
  // Dans la revue, le pincement de Safari ne fait rien (la page ne zoome pas non plus)
  const revue = await page.evaluate(() => {
    const a = window.__app
    a.enLecture = true
    const z0 = a.cam.z
    for (const [t, sc] of [['gesturestart', 1], ['gesturechange', 2], ['gestureend', 2]]) document.body.dispatchEvent(Object.assign(new Event(t, { bubbles: true, cancelable: true }), { scale: sc, clientX: 500, clientY: 300 }))
    const z = a.cam.z
    a.enLecture = false
    return z === z0
  })
  verifier('Safari Mac, revue ouverte : le pincement ne zoome pas le tableau', revue)
  await ctx.close()
}

// =============== 9. Au doigt (vrai toucher, CDP) ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'toucher')
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i, radiusX: 8, radiusY: 8, force: 0.5 })) })
  await page.evaluate(POSER, { x: 300, y: 200, l: 4000, h: 2500 })
  await page.evaluate(() => window.__app.choisirOutil('main'))
  // Un doigt posé pendant « Tout voir » arrête le cadrage là où il en est
  await page.evaluate(() => window.__app.toutVoir())
  await page.waitForTimeout(90)
  await touche('touchStart', [[700, 400]])
  const z1 = await page.evaluate(() => window.__app.cam.z)
  await page.waitForTimeout(300)
  const z2 = await page.evaluate(() => window.__app.cam.z)
  await touche('touchEnd', [])
  verifier('Au doigt : un appui arrête le cadrage en cours', z1 === z2 && z1 < 1 && z1 > 0.2, JSON.stringify({ z1, z2 }))
  // Deux doigts qui s'écartent zooment toujours ; la vue se note dans la session
  const z0 = await page.evaluate(() => window.__app.cam.z)
  await touche('touchStart', [[600, 400], [800, 400]])
  for (let k = 1; k <= 10; k++) await touche('touchMove', [[600 - 10 * k, 400], [800 + 10 * k, 400]])
  await touche('touchEnd', [])
  await page.waitForTimeout(600)
  const p = await page.evaluate(() => ({ z: window.__app.cam.z, s: JSON.parse(localStorage.getItem('mem-session')), page: window.__app.page }))
  verifier('Au doigt : pincer zoome (×2), et la vue est notée 400 ms après', pres(p.z / z0, 2, 0.02) && pres(p.s.vues[p.page][2], p.z, 1e-3), JSON.stringify({ z0, p }))
  await ctx.close()
}

await nav.close()
verifier('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
process.exit(echecs.length ? 1 : 0)
