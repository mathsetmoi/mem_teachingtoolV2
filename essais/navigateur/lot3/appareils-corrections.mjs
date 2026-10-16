// Essais au navigateur des corrections « appareils » du lot 3 :
// 1. Le clic de compatibilité d'un toucher sur une vignette (doigt, TNI,
//    iPad, téléphone) ne tombe pas sur le bouton du tableau qui était dessous.
// 2. Le second clic d'un double-clic par habitude (souris, plume de la
//    tablette graphique, doigt) non plus. Un vrai clic ailleurs, ou au même
//    endroit une seconde plus tard, passe.
// 3. Le compteur garde sa largeur d'une page à l'autre (une page nommée,
//    « 9 / 12 » puis « 10 / 12 ») : aucun bouton de la barre du haut ne bouge,
//    à 820, 1024, 1366 et 1920 px ; avancer en touchant « › » au même
//    endroit, reculer en cliquant « ‹ » au même endroit marchent.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/appareils/navigateur`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const pause = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(300)
  await page.evaluate(() => { window.__app.reconnaissance = false })
  return { ctx, page }
}

/** n pages, un trait sur chacune ; des noms ; on regarde la page `ici` */
const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici })

const ETAT = () => {
  const a = window.__app, tr = document.querySelector('.trieuse')
  return {
    ouverte: !!tr && !tr.hidden, page: a.page, pages: a.pages.slice(), n: a.formes.length, outil: a.outil, couleur: a.couleur,
    taille: a.taille, menus: [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => m.getAttribute('aria-label')),
    // Les clics arrivés sur un bouton du tableau (écouteur posé sur le bouton lui-même)
    touches: (window.__touches || []).slice(),
  }
}
const etat = page => page.evaluate(ETAT)
const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)

/** Les boutons du tableau (hors trieuse et message) ; chacun note les clics
 *  qui l'atteignent (window.__touches) */
const boutonsDuTableau = page => page.evaluate(() => {
  window.__touches = []
  const bs = [...document.querySelectorAll('button')].filter(b => {
    const r = b.getBoundingClientRect()
    return r.width > 0 && r.height > 0 && !b.closest('.trieuse') && !b.closest('.toast') && getComputedStyle(b).visibility !== 'hidden'
  })
  for (const b of bs) if (!b.dataset.ecoute) {
    b.dataset.ecoute = '1'
    for (const t of ['mousedown', 'click']) b.addEventListener(t, () => window.__touches.push(`${t} ${b.getAttribute('aria-label') || b.title}`))
  }
  return bs.map(b => { const r = b.getBoundingClientRect(); return { nom: b.getAttribute('aria-label') || b.title, x: r.left + r.width / 2, y: r.top + r.height / 2 } })
})
/** Ceux de ces boutons qu'une vignette couvre, trieuse ouverte (sur le
 *  dessin de la vignette : ni son bouton ⋯, ni sa poignée, ni son nom).
 *  Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : au
 *  téléphone, les boutons du tableau sont en haut et en bas de l'écran, où
 *  le centre d'un bouton tombe souvent entre deux vignettes ou sur un nom ;
 *  quand aucun centre n'est sous une vignette, on essaie quatre autres points
 *  du bouton (à 15 px du centre, dans le bouton) : un toucher là atteignait le
 *  bouton, la trieuse fermée. */
const sousLesVignettes = (page, bs) => page.evaluate(bs => {
  const sur = (b, x, y) => {
    const el = document.elementFromPoint(x, y), c = el?.closest?.('.carte')
    return c && !el.closest('.carte-options') && !el.closest('.carte-poignee') && !el.closest('.carte-nom') ? { ...b, x, y, page: c.dataset.page } : null
  }
  const centres = bs.map(b => sur(b, b.x, b.y)).filter(Boolean)
  if (centres.length) return centres
  return bs.flatMap(b => [[0, -15], [0, 15], [-15, 0], [15, 0]].map(([dx, dy]) => sur(b, b.x + dx, b.y + dy))).filter(Boolean)
}, bs)
const centre = (page, sel) => page.evaluate(sel => {
  const e = document.querySelector(sel); if (!e) return null
  const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}, sel)

// =============== 1. Le toucher qui mène à une page (doigt, TNI, téléphone) ===============
for (const [nom, o, cherche] of [
  ['Tablette 1024 au doigt', { hasTouch: true, viewport: { width: 1024, height: 768 } }, /Surligneur|Gomme|Segment|Point|Formes/],
  ['Téléphone 390 au doigt', { hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }, /Surligneur|Gomme|Segment|Point|Formes/],
  ['TNI 1920 au doigt', { hasTouch: true, viewport: { width: 1920, height: 1080 } }, /^Rouge$/],
]) {
  const { ctx, page } = await ouvrir(o, nom)
  const P = await preparer(page, nom.startsWith('TNI') ? 30 : 12, { ici: 0 })
  await page.evaluate(() => { const a = window.__app; a.couleur = '#1b2230'; a.ui.maj() })
  const bs = await boutonsDuTableau(page)
  const rang = await centre(page, '.rang')
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await pause(500)
  const sous = await sousLesVignettes(page, bs)
  const cible = sous.find(s => cherche.test(s.nom)) || sous[0]
  if (!cible) { verifier(`${nom} : un bouton du tableau sous une vignette`, false, sous); await ctx.close(); continue }
  const avant = await etat(page)
  await page.evaluate(() => { window.__touches = [] })
  await page.touchscreen.tap(cible.x, cible.y); await pause(700)
  const e = await etat(page)
  verifier(`${nom} : toucher la vignette de la page ${P.indexOf(cible.page) + 1} (au-dessus de « ${cible.nom} ») mène à la page`, !e.ouverte && e.page === cible.page, e)
  verifier(`… ni l'outil, ni la couleur, ni l'épaisseur ne changent, aucun menu ne s'ouvre, aucun bouton du tableau n'est touché`,
    e.outil === avant.outil && e.couleur === avant.couleur && e.taille === avant.taille && !e.menus.length && !e.touches.length,
    { avant: [avant.outil, avant.couleur, avant.taille], apres: [e.outil, e.couleur, e.taille], menus: e.menus, touches: e.touches })
  verifier('… et rien n\'est écrit sur la page où l\'on arrive', e.n === 1, e.n)
  await page.screenshot({ path: D + `/toucher-${nom.replace(/\W/g, '')}.png` })
  if (nom.startsWith('Tablette')) {
    // Un double toucher par habitude : rien non plus
    await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await pause(500)
    await page.evaluate(() => { window.__touches = [] })
    await page.touchscreen.tap(cible.x, cible.y); await pause(120); await page.touchscreen.tap(cible.x, cible.y); await pause(900)
    const d = await etat(page)
    verifier(`${nom} : un double toucher sur la même vignette mène à la page, sans toucher « ${cible.nom} » ni écrire`,
      !d.ouverte && d.page === cible.page && d.outil === avant.outil && d.couleur === avant.couleur && !d.touches.length && d.n === 1, d)
    // Une seconde plus tard, le même endroit touche bien le bouton du tableau
    await page.touchscreen.tap(cible.x, cible.y); await pause(300)
    const f = await etat(page)
    verifier(`… une seconde plus tard, toucher au même endroit atteint bien « ${cible.nom} »`, f.touches.some(t => t === `click ${cible.nom}`), f.touches)
  }
  await ctx.close()
}

// =============== 2. Le double-clic par habitude (souris, plume de la tablette graphique) ===============
for (const outilDe of ['souris', 'plume']) {
  const { ctx, page } = await ouvrir({}, outilDe)
  const cdp = await ctx.newCDPSession(page)
  const P = await preparer(page, 12, { ici: 0 })
  const bs = await boutonsDuTableau(page)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await pause(400)
  const sous = await sousLesVignettes(page, bs)
  const cible = sous.find(s => /Gomme/.test(s.nom)) || sous.find(s => /Surligneur/.test(s.nom)) || sous[0]
  const loin = bs.find(b => /^Rouge$/.test(b.nom) && Math.hypot(b.x - cible.x, b.y - cible.y) > 80)
  const avant = await etat(page)
  await page.evaluate(() => { window.__touches = [] })
  const plume = async (type, clickCount) => cdp.send('Input.dispatchMouseEvent', { type, x: cible.x, y: cible.y, pointerType: 'pen', button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount, force: type === 'mousePressed' ? 0.5 : 0 })
  if (outilDe === 'souris') await page.mouse.dblclick(cible.x, cible.y)
  else {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: cible.x, y: cible.y, pointerType: 'pen', button: 'none', buttons: 0 })
    await plume('mousePressed', 1); await plume('mouseReleased', 1); await pause(90)
    await plume('mousePressed', 2); await plume('mouseReleased', 2)
  }
  await pause(150)
  const e = await etat(page)
  verifier(`${outilDe} : double-clic sur la vignette de la page ${P.indexOf(cible.page) + 1} (au-dessus de « ${cible.nom} ») : on va à la page, l'outil reste ${avant.outil}, aucun bouton du tableau n'est touché, rien n'est écrit`,
    !e.ouverte && e.page === cible.page && e.outil === avant.outil && !e.touches.length && !e.menus.length && e.n === 1, { outil: e.outil, touches: e.touches, menus: e.menus, n: e.n })
  if (outilDe === 'souris' && loin) {
    // Un vrai clic ailleurs, aussitôt : il passe (la couleur Rouge)
    await page.mouse.click(loin.x, loin.y); await pause(100)
    const f = await etat(page)
    verifier('souris : aussitôt après, un clic ailleurs (« Rouge ») passe', f.couleur !== avant.couleur && f.touches.includes('click Rouge'), f)
  }
  await pause(900)
  if (outilDe === 'souris') await page.mouse.click(cible.x, cible.y)
  else { await plume('mousePressed', 1); await plume('mouseReleased', 1) }
  await pause(200)
  const g = await etat(page)
  verifier(`${outilDe} : une seconde plus tard, un clic au même endroit atteint bien « ${cible.nom} »`, g.touches.includes(`click ${cible.nom}`), g.touches)
  await ctx.close()
}

// =============== 3. Le compteur ne fait bouger aucun bouton d'une page à l'autre ===============
const positions = page => page.evaluate(() => [...document.querySelectorAll('.barre-haut > *')].map(b => {
  const r = b.getBoundingClientRect()
  return { nom: (b.getAttribute('aria-label') || b.className).slice(0, 28), x: Math.round(r.left), y: Math.round(r.top), l: Math.round(r.width) }
}))
const differences = (a, b) => a.map((x, i) => ({ ...x, apres: b[i] })).filter(x => !x.apres || x.x !== x.apres.x || x.y !== x.apres.y || x.l !== x.apres.l)
const compteur = page => page.evaluate(() => {
  const n = document.querySelector('.rang-nom'), b = document.querySelector('.barre-haut')
  return { texte: document.querySelector('.rang').textContent, nomVisible: getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width > 0, hauteur: Math.round(b.getBoundingClientRect().height) }
})
for (const [nom, vp, nomVu] of [['iPad portrait 820', { width: 820, height: 1180 }, true], ['tablette 1024', { width: 1024, height: 768 }, true],
  ['portable 1366', { width: 1366, height: 768 }, true], ['TNI 1920', { width: 1920, height: 1080 }, true], ['téléphone 390', { width: 390, height: 844 }, false]]) {
  const { ctx, page } = await ouvrir({ viewport: vp }, nom)
  const sansNom = await compteur(page)
  await preparer(page, 3, { ici: 1, noms: { 2: 'Exercice 12 p. 84' } })
  const a = await positions(page)
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[2]) }); await pause(150)
  const b = await positions(page), c3 = await compteur(page)
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[0]) }); await pause(150)
  const c = await positions(page)
  verifier(`${nom} : de la page 2 (sans nom) à la page 3 (« Exercice 12 p. 84 ») et à la page 1, aucun bouton de la barre du haut ne bouge`,
    !differences(a, b).length && !differences(a, c).length, { versLa3: differences(a, b), versLa1: differences(a, c) })
  verifier(`… la barre garde ses rangées (${sansNom.hauteur} px de haut sans nom, ${c3.hauteur} avec)`, c3.hauteur === sansNom.hauteur, { sansNom, c3 })
  if (nomVu === true) verifier('… le nom se lit dans le compteur, « 3 / 3 · Exercice 12 p. 84 »', c3.nomVisible && c3.texte === '3 / 3 · Exercice 12 p. 84', c3)
  if (nomVu === false) verifier('… le nom ne s\'y montre pas (téléphone)', !c3.nomVisible, c3)
  await page.screenshot({ path: D + `/barre-${nom.replace(/\W/g, '')}.png`, clip: { x: 0, y: 0, width: vp.width, height: 130 } })
  // Douze pages : de la 9 à la 10, le compteur ne grandit pas
  await page.evaluate(() => { const a = window.__app; for (let k = 0; k < 9; k++) a.nouvellePage(); a.allerPage(a.pages[8]) }); await pause(150)
  const d9 = await positions(page)
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[9]) }); await pause(150)
  const d10 = await positions(page)
  verifier(`${nom} : de « 9 / 12 » à « 10 / 12 », aucun bouton ne bouge`, !differences(d9, d10).length, differences(d9, d10))
  await ctx.close()
}

// Nommer la première page, retirer le dernier nom : le compteur se règle de nouveau
{
  const { ctx, page } = await ouvrir({ viewport: { width: 1366, height: 768 } }, 'portable')
  await preparer(page, 3, { ici: 1 })
  const l0 = await page.evaluate(() => Math.round(document.querySelector('.rang').getBoundingClientRect().width))
  await page.evaluate(() => { const a = window.__app; a.tableau.renommerPage(a.pages[2], 'Exercice 12 p. 84'); a.ui.maj() }); await pause(100)
  const l1 = await page.evaluate(() => Math.round(document.querySelector('.rang').getBoundingClientRect().width))
  await page.evaluate(() => { const a = window.__app; a.tableau.renommerPage(a.pages[2], ''); a.ui.maj() }); await pause(100)
  const l2 = await page.evaluate(() => Math.round(document.querySelector('.rang').getBoundingClientRect().width))
  verifier('Portable 1366 : le premier nom donné réserve sa place dans le compteur, le dernier retiré la rend', l1 > l0 + 100 && l2 === l0, { l0, l1, l2 })
  // La fenêtre change (une tablette qu'on tourne) : la place se règle de nouveau
  await page.evaluate(() => { const a = window.__app; a.tableau.renommerPage(a.pages[2], 'Exercice 12 p. 84'); a.ui.maj() })
  await page.setViewportSize({ width: 1024, height: 768 }); await pause(300)
  const h1024 = await compteur(page)
  await page.setViewportSize({ width: 1366, height: 768 }); await pause(300)
  const h1366 = await compteur(page)
  verifier('… la fenêtre passe à 1024 px : la barre reste sur une rangée, le nom s\'y lit encore (plus petit) ; revenue à 1366 px, il reprend sa taille', h1024.hauteur === 58 && h1024.nomVisible && h1366.nomVisible, { h1024, h1366 })
  await ctx.close()
}

// Avancer en touchant « › » au même endroit, reculer en cliquant « ‹ » au même endroit
{
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'tablette')
  await preparer(page, 5, { ici: 0, noms: { 2: 'Exercice 12 p. 84' } })
  await pause(1300)
  const b = await centre(page, '.barre-haut button[data-mode]')
  const suite = []
  for (let k = 0; k < 4; k++) {
    await page.touchscreen.tap(b.x, b.y); await pause(1000)
    const e = await etat(page)
    suite.push(e.ouverte ? 'trieuse ouverte' : `page ${e.pages.indexOf(e.page) + 1}`)
    if (e.ouverte) break
  }
  verifier('Tablette 1024 au doigt : quatre touchers sur « › » au même endroit (la page 3 a un nom) mènent de la page 1 à la page 5', suite.join(',') === 'page 2,page 3,page 4,page 5', suite)
  await ctx.close()
}
for (const vp of [{ width: 1366, height: 768 }, { width: 820, height: 1180 }]) {
  const { ctx, page } = await ouvrir({ viewport: vp }, 'portable')
  await preparer(page, 4, { ici: 3, noms: { 3: 'Exercice 12 p. 84' } })
  await pause(1300)
  const b = await centre(page, 'button[aria-label^="Page précédente"]')
  const suite = []
  for (let k = 0; k < 3; k++) {
    await page.mouse.click(b.x, b.y); await pause(1000)
    const e = await etat(page)
    suite.push(e.ouverte ? 'trieuse ouverte' : `page ${e.pages.indexOf(e.page) + 1}`)
    if (e.ouverte) break
  }
  verifier(`${vp.width} px à la souris : trois clics sur « ‹ » au même endroit depuis la page 4 (nommée) mènent à la page 1`, suite.join(',') === 'page 3,page 2,page 1', suite)
  await ctx.close()
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
