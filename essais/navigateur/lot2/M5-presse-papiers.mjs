// Essais au navigateur du morceau M5 du lot 2 : copier, couper, coller,
// dupliquer, tout sélectionner (Ctrl+A/C/X/V/D, ⌘ sur Mac), collage sûr.
// Les lettres se lisent par e.key (AZERTY : Ctrl+A est la touche de e.code
// KeyQ), AltGr n'en est pas un ; jamais dans un champ de saisie, pendant la
// revue, la séance ou une fenêtre ouverte ; chaque action fait une étape
// d'annulation ; le collage va sous le pointeur, ou s'étage, ou garde sa place
// sur une autre page ; il passe d'un onglet à l'autre (image comprise) ; un
// text/html piégé ne passe jamais par le DOM.
// Souris, tablette graphique (stylet CDP sans écran tactile) et doigt.
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

/** Une page chargée, ses messages notés, les touches et leur defaultPrevented notés */
async function charger(ctx, nom) {
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x) => { window.__msgs.push(t); return m(t, x) }
    a.reconnaissance = false
    // Après l'écouteur de l'application (posé avant, sur window aussi)
    window.__touches = []
    window.addEventListener('keydown', e => window.__touches.push({ key: e.key, code: e.code, empeche: e.defaultPrevented }))
  })
  const cdp = await ctx.newCDPSession(page)
  return { page, cdp }
}
async function contexte(o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
  return ctx
}

/** Une touche par CDP : key, code, modificateurs (1 Alt, 2 Ctrl, 4 Meta, 8 Maj) */
async function touche(cdp, key, code, modifiers = 0) {
  const vk = /^Key[A-Z]$/.test(code) ? key.toUpperCase().charCodeAt(0) : 0
  const b = { key, code, modifiers, windowsVirtualKeyCode: vk }
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...b })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...b })
  await new Promise(r => setTimeout(r, 120))
}
const ctrl = (cdp, k) => touche(cdp, k, 'Key' + k.toUpperCase(), 2)
const derniereTouche = page => page.evaluate(() => window.__touches.at(-1))
const messages = page => page.evaluate(() => window.__msgs.slice())
const dernierMessage = async page => (await messages(page)).at(-1)
const viderMessages = page => page.evaluate(() => { window.__msgs.length = 0 })

const ETAT = () => {
  const a = window.__app
  return {
    page: a.page, outil: a.outil, n: a.formes.length, ids: a.formes.map(f => f.id), sel: [...a.selection],
    pile: a.tableau.annulationDe(a.page)?.undoStack.length ?? 0, film: a.tableau.film.length,
  }
}
const etat = page => page.evaluate(ETAT)
const forme = (page, id) => page.evaluate(id => { const f = window.__app.formes.find(x => x.id === id); return f && JSON.parse(JSON.stringify(f)) }, id)
const formesSel = page => page.evaluate(() => window.__app.formes.filter(f => window.__app.selection.has(f.id)).map(f => JSON.parse(JSON.stringify(f))))
/** Le point du monde (x, y) en coordonnées de la fenêtre */
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
const LIRE_PP = async () => {
  const r = {}
  for (const it of await navigator.clipboard.read()) for (const t of it.types) r[t] = await (await it.getType(t)).text()
  return r
}
/** Pose une figure ou un trait, en un geste ; rend son identifiant */
const POSER = o => {
  const a = window.__app, t = a.tableau
  let f
  if (o.type === 'triangle') {
    f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + 160, y: o.y }, { x: o.x, y: o.y + 120 }] })
    if (o.noms) { f.noms = o.noms; f.sommets = true }
  } else if (o.type === 'point') {
    f = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: o.x, y: o.y }] })
    f.sommets = true; f.noms = [o.nom]; f.stylePoints = [{ marque: 'croix' }]
    if (o.lie) f.lie = o.lie
  } else if (o.type === 'formule') {
    f = { id: 'F' + Math.random().toString(36).slice(2, 8), type: 'formule', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, latex: o.latex, couleur: '#1b2230', taille: 28 }
  } else {
    f = { id: 'T' + Math.random().toString(36).slice(2, 8), type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi,
      pts: [0, 0, 0.5, 40, 14, 0.5, 80, 0, 0.5, 120, 14, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}
const poser = (page, o) => page.evaluate(POSER, o)
/** Une image importée (un petit dessin de 120 × 60 px, deux couleurs) ; rend son identifiant */
const IMPORTER = async () => {
  const a = window.__app
  const cv = Object.assign(document.createElement('canvas'), { width: 120, height: 60 })
  const g = cv.getContext('2d'); g.fillStyle = '#d0342c'; g.fillRect(0, 0, 60, 60); g.fillStyle = '#1f5fbf'; g.fillRect(60, 0, 60, 60)
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
  const avant = new Set(a.formes.map(f => f.id))
  await a.importerImage(blob)
  return a.formes.find(f => !avant.has(f.id) && f.type === 'image').id
}
/** Un événement paste synthétique, avec ce qu'on veut dedans */
const COLLER_SYNTHETIQUE = o => {
  const dt = new DataTransfer()
  if (o.html !== undefined) dt.setData('text/html', o.html)
  if (o.texte !== undefined) dt.setData('text/plain', o.texte)
  document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
}
const centreDe = f => {
  if (f.type === 'polygone') {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
    for (let i = 0; i < f.pts.length; i += 2) { x1 = Math.min(x1, f.pts[i]); x2 = Math.max(x2, f.pts[i]); y1 = Math.min(y1, f.pts[i + 1]); y2 = Math.max(y2, f.pts[i + 1]) }
    return { x: f.x + (x1 + x2) / 2, y: f.y + (y1 + y2) / 2 }
  }
  return { x: f.x, y: f.y }
}
const pres = (a, b, e = 1.5) => Math.abs(a - b) <= e
/** La souris hors du tableau (sur la barre de gauche) : plus de pointeur sur le tableau */
async function sourisDehors(page) { await page.mouse.move(400, 10); await page.mouse.move(20, 400); await page.waitForTimeout(60) }

// =============== 1. Souris et clavier, un onglet ===============
{
  const ctx = await contexte()
  const { page, cdp } = await charger(ctx, 'souris')
  const T = await poser(page, { type: 'triangle', x: 300, y: 200, noms: ['A', 'B', 'C'] })
  const L = await poser(page, { type: 'trait', x: 600, y: 420 })
  const F = await poser(page, { type: 'formule', x: 700, y: 200, latex: '\\text{périmètre} = 2\\pi r' })
  await page.evaluate(() => window.__app.choisirOutil('stylo'))

  // ----- Ctrl+A : par e.key, AZERTY, AltGr, ⌘ -----
  await touche(cdp, 'q', 'KeyA', 2)
  let e = await etat(page)
  verifier('AZERTY : Ctrl + la touche marquée Q (key « q », code KeyA) ne sélectionne rien', e.sel.length === 0 && e.outil === 'stylo', JSON.stringify(e))
  await touche(cdp, 'a', 'KeyQ', 3)
  e = await etat(page)
  verifier('AltGr (Ctrl+Alt) + A ne sélectionne rien', e.sel.length === 0 && e.outil === 'stylo', JSON.stringify(e))
  await viderMessages(page)
  await touche(cdp, 'a', 'KeyQ', 2)
  e = await etat(page)
  verifier('AZERTY : Ctrl+A (key « a », code KeyQ) sélectionne tout ce qui est sur la page', e.sel.length === 3 && e.n === 3, JSON.stringify(e))
  verifier('… passe à l\'outil Sélection, dit « 3 objets sélectionnés », et empêche le « tout sélectionner » du navigateur',
    e.outil === 'selection' && (await dernierMessage(page)) === '3 objets sélectionnés' && (await derniereTouche(page)).empeche, JSON.stringify({ o: e.outil, m: await messages(page), t: await derniereTouche(page) }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Échap vide la sélection (on reste à la Sélection)', e.sel.length === 0 && e.outil === 'selection', JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  verifier('Un second Échap rend l\'outil d\'avant (le Stylo)', (await etat(page)).outil === 'stylo')
  await touche(cdp, 'a', 'KeyA', 4)
  e = await etat(page)
  verifier('⌘A (Mac) sélectionne tout aussi', e.sel.length === 3 && e.outil === 'selection', JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Rien de choisi -----
  await viderMessages(page)
  await ctrl(cdp, 'c')
  let t = await derniereTouche(page)
  verifier('Ctrl+C sans rien de choisi : « Rien n\'est sélectionné. », et la copie ordinaire du navigateur n\'est pas empêchée',
    (await dernierMessage(page)) === 'Rien n\'est sélectionné.' && t.key === 'c' && !t.empeche, JSON.stringify({ m: await messages(page), t }))
  await viderMessages(page)
  await ctrl(cdp, 'd')
  t = await derniereTouche(page)
  verifier('Ctrl+D sans rien de choisi : « Rien n\'est sélectionné. », et le marque-page du navigateur est empêché',
    (await dernierMessage(page)) === 'Rien n\'est sélectionné.' && t.key === 'd' && t.empeche, JSON.stringify({ m: await messages(page), t }))
  await viderMessages(page)
  await ctrl(cdp, 'x')
  verifier('Ctrl+X sans rien de choisi : « Rien n\'est sélectionné. », rien ne part', (await dernierMessage(page)) === 'Rien n\'est sélectionné.' && (await etat(page)).n === 3)

  // ----- Copier un triangle ABC, coller trois fois sans bouger : trois copies étagées -----
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const bord = await ecranDe(page, 380, 200)          // le milieu du côté du haut
  await page.mouse.click(bord.x, bord.y); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Un clic sur le côté du triangle le sélectionne', JSON.stringify(e.sel) === JSON.stringify([T]), JSON.stringify(e))
  await viderMessages(page)
  await ctrl(cdp, 'c')
  t = await derniereTouche(page)
  verifier('Ctrl+C : « 1 objet copié », et la touche est empêchée', (await dernierMessage(page)) === '1 objet copié' && t.empeche, JSON.stringify({ m: await messages(page), t }))
  const pp = await page.evaluate(LIRE_PP)
  verifier('Le presse-papiers du système a le texte « MEM teachingtool : 1 objet » et le HTML marqué',
    pp['text/plain'] === 'MEM teachingtool : 1 objet' && /data-mem-teachingtool=["']1["']/.test(pp['text/html'] ?? '') && /data-copie=["'][A-Za-z0-9+/=]+["']/.test(pp['text/html'] ?? ''), JSON.stringify(pp).slice(0, 300))
  const garde = await page.evaluate(() => { try { const c = JSON.parse(localStorage.getItem('mem-presse-papiers')); return { v: c.v, n: c.formes.length, page: c.page } } catch { return null } })
  verifier('La copie est gardée dans le navigateur sous la nouvelle clé « mem-presse-papiers »', garde?.v === 1 && garde.n === 1, JSON.stringify(garde))

  const avant = await etat(page)
  const original = await forme(page, T)
  const copies = []
  for (let k = 1; k <= 3; k++) {
    await ctrl(cdp, 'v')
    const s = await formesSel(page)
    copies.push(s[0])
  }
  e = await etat(page)
  const decalages = copies.map(c => c && [Math.round(c.x - original.x), Math.round(c.y - original.y)])
  verifier('Trois Ctrl+V sans bouger la souris : trois copies étagées, 1, 2 et 3 cm plus loin',
    e.n === avant.n + 3 && JSON.stringify(decalages) === '[[40,40],[80,80],[120,120]]', JSON.stringify({ n: e.n, decalages }))
  verifier('… sur la même page, les noms changent : DEF, GHI, JKL (jamais de primes)',
    JSON.stringify(copies.map(c => c?.noms?.join(''))) === '["DEF","GHI","JKL"]', JSON.stringify(copies.map(c => c?.noms)))
  verifier('… la dernière copie est la sélection, l\'outil n\'a pas changé', JSON.stringify(e.sel) === JSON.stringify([copies[2].id]) && e.outil === 'selection', JSON.stringify(e))
  verifier('… une étape d\'annulation par collage', e.pile === avant.pile + 3, JSON.stringify({ avant: avant.pile, apres: e.pile }))
  await ctrl(cdp, 'z')
  e = await etat(page)
  verifier('Ctrl+Z après un collage retire ce collage, et lui seul', e.n === avant.n + 2 && !e.ids.includes(copies[2].id) && e.ids.includes(copies[1].id), JSON.stringify(e))
  await ctrl(cdp, 'z'); await ctrl(cdp, 'z')
  verifier('Deux Ctrl+Z de plus : les deux autres copies partent, l\'original reste', JSON.stringify((await etat(page)).ids) === JSON.stringify(avant.ids))

  // Le pointeur a bougé : sous lui, puis étagé à partir de là
  await page.evaluate(() => { window.__app.selection.clear() })
  await page.mouse.move(1000, 560); await page.mouse.move(1010, 560); await page.waitForTimeout(60)
  const w = await page.evaluate(() => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return a.cam.versMonde(1010 - r.left, 560 - r.top) })
  await ctrl(cdp, 'v')
  const sous = (await formesSel(page))[0]
  await ctrl(cdp, 'v')
  const sous2 = (await formesSel(page))[0]
  const cs = centreDe(sous), cs2 = centreDe(sous2)
  verifier('La souris a bougé sur le tableau : Ctrl+V colle sous le pointeur (le centre de la copie)', pres(cs.x, w.x) && pres(cs.y, w.y), JSON.stringify({ cs, w }))
  verifier('… un second Ctrl+V sans bouger : 1 cm plus loin que le premier', pres(cs2.x - cs.x, 40) && pres(cs2.y - cs.y, 40), JSON.stringify({ cs, cs2 }))
  await ctrl(cdp, 'z'); await ctrl(cdp, 'z')

  // ----- Plusieurs objets : un collage, une étape, une étape du film -----
  await sourisDehors(page)
  await touche(cdp, 'a', 'KeyQ', 2)
  await viderMessages(page)
  await ctrl(cdp, 'c')
  verifier('Ctrl+A puis Ctrl+C : « 3 objets copiés »', (await dernierMessage(page)) === '3 objets copiés', JSON.stringify(await messages(page)))
  const pp3 = await page.evaluate(LIRE_PP)
  verifier('… le texte du système dit « MEM teachingtool : 3 objets »', pp3['text/plain'] === 'MEM teachingtool : 3 objets', JSON.stringify(pp3['text/plain']))
  let a0 = await etat(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+V colle les trois objets, sélectionnés, en une étape d\'annulation et une étape du film',
    e.n === a0.n + 3 && e.sel.length === 3 && e.pile === a0.pile + 1 && e.film === a0.film + 1, JSON.stringify({ a0, e }))
  await ctrl(cdp, 'z')
  verifier('… un seul Ctrl+Z retire tout le collage', JSON.stringify((await etat(page)).ids) === JSON.stringify(a0.ids))

  // ----- Couper -----
  await page.evaluate(L => { const a = window.__app; a.selection.clear(); a.selection.add(L) }, L)
  a0 = await etat(page)
  await viderMessages(page)
  await ctrl(cdp, 'x')
  e = await etat(page)
  t = await derniereTouche(page)
  verifier('Ctrl+X : le trait part, « 1 objet coupé », une étape, touche empêchée',
    !e.ids.includes(L) && e.n === a0.n - 1 && (await dernierMessage(page)) === '1 objet coupé' && e.pile === a0.pile + 1 && t.empeche, JSON.stringify({ e, m: await messages(page), t }))
  await ctrl(cdp, 'z')
  e = await etat(page)
  verifier('Ctrl+X puis Ctrl+Z : le trait revient (le même)', e.ids.includes(L) && e.n === a0.n, JSON.stringify(e))
  // Un sommet choisi : c'est la figure qui part
  await page.evaluate(T => { const a = window.__app; a.selection.clear(); a.choisirPartie(T, { quoi: 'sommet', i: 0 }) }, T)
  const sommets = (await forme(page, T)).pts.length
  await viderMessages(page)
  await ctrl(cdp, 'x')
  e = await etat(page)
  verifier('Ctrl+X avec un sommet choisi : la figure entière part (pas seulement le sommet)', !e.ids.includes(T) && (await dernierMessage(page)) === '1 objet coupé', JSON.stringify({ e, m: await messages(page) }))
  const ppT = await page.evaluate(LIRE_PP)
  verifier('… et c\'est elle qui est copiée', ppT['text/plain'] === 'MEM teachingtool : 1 objet')
  await ctrl(cdp, 'z')
  verifier('… Ctrl+Z la rend entière', (await forme(page, T))?.pts.length === sommets)

  // ----- Dupliquer -----
  await page.evaluate(L => { const a = window.__app; a.choisirPartie(null); a.selection.clear(); a.selection.add(L) }, L)
  a0 = await etat(page)
  await ctrl(cdp, 'd')
  e = await etat(page)
  t = await derniereTouche(page)
  const dup = (await formesSel(page))[0], orL = await forme(page, L)
  verifier('Ctrl+D : une copie 1 cm plus loin, sélectionnée, en une étape ; le marque-page est empêché',
    e.n === a0.n + 1 && dup && dup.id !== L && pres(dup.x - orL.x, 40) && pres(dup.y - orL.y, 40) && e.pile === a0.pile + 1 && t.empeche, JSON.stringify({ e, dup, t }))
  await ctrl(cdp, 'z')
  // Le bouton « Dupliquer » du panneau passe par la même voie
  await page.evaluate(T => window.__app.ouvrirOptions(window.__app.formes.find(f => f.id === T)), T); await page.waitForTimeout(120)
  a0 = await etat(page)
  await page.locator('.panneau-forme button.option', { hasText: 'Dupliquer' }).click(); await page.waitForTimeout(120)
  e = await etat(page)
  const dupT = (await formesSel(page))[0]
  verifier('Le bouton « Dupliquer » du panneau : une copie DEF, sélectionnée, une étape', e.n === a0.n + 1 && dupT?.noms?.join('') === 'DEF' && e.pile === a0.pile + 1, JSON.stringify({ e, noms: dupT?.noms }))
  await ctrl(cdp, 'z')

  // ----- Copier sur la page 1, coller sur la page 2 (puis une page vue ailleurs) -----
  await sourisDehors(page)
  await page.evaluate(T => { const a = window.__app; a.selection.clear(); a.selection.add(T) }, T)
  await ctrl(cdp, 'c')
  const p1 = (await etat(page)).page
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(150)
  await ctrl(cdp, 'v')
  e = await etat(page)
  const sur2 = (await formesSel(page))[0], orT = await forme(page, T) ?? original
  verifier('Copier sur la page 1, coller sur la page 2 : à la même place (elle se voit)', e.page !== p1 && e.n === 1 && pres(sur2.x, original.x) && pres(sur2.y, original.y), JSON.stringify({ sur2: sur2 && [sur2.x, sur2.y], original: [original.x, original.y] }))
  verifier('… sur la page 2, vide, les noms ABC sont gardés', sur2?.noms?.join('') === 'ABC', JSON.stringify(sur2?.noms))
  await ctrl(cdp, 'v')
  const sur2b = (await formesSel(page))[0]
  verifier('… un second Ctrl+V sur la page 2 : 1 cm plus loin, noms DEF', pres(sur2b.x - sur2.x, 40) && pres(sur2b.y - sur2.y, 40) && sur2b.noms?.join('') === 'DEF', JSON.stringify({ x: sur2b.x - sur2.x, noms: sur2b.noms }))
  await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.cam.x -= 5000; a.cam.y -= 3000; a.vueChangee() }); await page.waitForTimeout(150)
  await ctrl(cdp, 'v')
  const loin = (await formesSel(page))[0]
  const vu = await page.evaluate(id => { const a = window.__app, f = a.formes.find(x => x.id === id), z = a.ui.zoneLibre(), s = a.cam.versEcran(f.x + 80, f.y + 60); return s.x > z.x && s.x < z.x + z.l && s.y > z.y && s.y < z.y + z.h }, loin?.id)
  verifier('Sur une page qu\'on regarde ailleurs, la copie se colle au milieu de ce qu\'on voit', !!loin && vu, JSON.stringify(loin && [loin.x, loin.y]))
  await page.evaluate(p => window.__app.allerPage(p), p1); await page.waitForTimeout(100)

  // ----- Un point lié à une image copiée avec elle suit la nouvelle image -----
  const I = await page.evaluate(IMPORTER)
  const img = await forme(page, I)
  const Pt = await poser(page, { type: 'point', x: img.x + 10, y: img.y + 10, nom: 'P', lie: I })
  await page.evaluate(I => { const a = window.__app; a.selection.clear(); a.selection.add(I) }, I)
  await viderMessages(page)
  await ctrl(cdp, 'c')
  verifier('Copier une image : son point lié est copié avec elle (« 2 objets copiés »)', (await dernierMessage(page)) === '2 objets copiés', JSON.stringify(await messages(page)))
  a0 = await etat(page)
  await ctrl(cdp, 'v')
  const colles = await formesSel(page)
  const nImg = colles.find(f => f.type === 'image'), nPt = colles.find(f => f.type === 'polygone')
  verifier('… collés : une image et un point, le point lié à la NOUVELLE image', colles.length === 2 && nImg && nPt && nPt.lie === nImg.id && nImg.id !== I, JSON.stringify(colles.map(f => [f.type, f.id, f.lie])))
  verifier('… la nouvelle image montre les mêmes données (même banque)', nImg?.src === img.src && (await etat(page)).pile === a0.pile + 1)
  verifier('… le point lié (P, pris sur la page) reçoit la première lettre libre, D, jamais P\'', JSON.stringify(nPt?.noms) === '["D"]', JSON.stringify(nPt?.noms))
  await ctrl(cdp, 'z')
  verifier('… et Ctrl+Z retire l\'image et son point ensemble', JSON.stringify((await etat(page)).ids) === JSON.stringify(a0.ids))
  void Pt

  // ----- Le champ d'une formule : le texte, pas les objets -----
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.choisirOutil('formule') })
  const vide = await ecranDe(page, 300, 600)
  await page.mouse.click(vide.x, vide.y); await page.waitForTimeout(200)
  const champ = page.locator('dialog[open] input.saisie')
  verifier('Outil Formule : le champ est ouvert et a le focus', await champ.isVisible() && await champ.evaluate(el => document.activeElement === el))
  await page.keyboard.type('x^2')
  a0 = await etat(page)
  await viderMessages(page)
  await touche(cdp, 'a', 'KeyQ', 2)
  await ctrl(cdp, 'c')
  e = await etat(page)
  const txt = await page.evaluate(() => navigator.clipboard.readText())
  verifier('Dans le champ : Ctrl+A et Ctrl+C prennent le texte (« x^2 » dans le presse-papiers), pas les objets',
    txt === 'x^2' && e.sel.length === 0 && e.outil === 'formule' && (await messages(page)).length === 0, JSON.stringify({ txt, e, m: await messages(page) }))
  await page.keyboard.press('End')
  await ctrl(cdp, 'v'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Dans le champ : Ctrl+V y colle le texte (« x^2x^2 »), aucun objet', (await champ.inputValue()) === 'x^2x^2' && e.n === a0.n, JSON.stringify({ v: await champ.inputValue(), e }))
  await ctrl(cdp, 'd')
  verifier('Dans le champ : Ctrl+D ne duplique rien', (await etat(page)).n === a0.n)
  // La fenêtre reste ouverte, le focus ailleurs : rien non plus
  await page.evaluate(() => document.activeElement.blur())
  await touche(cdp, 'a', 'KeyQ', 2)
  verifier('Fenêtre ouverte (focus hors du champ) : Ctrl+A ne sélectionne rien', (await etat(page)).sel.length === 0)
  await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', ''); document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })) })
  await page.waitForTimeout(100)
  verifier('Fenêtre ouverte : un collage ne pose rien', (await etat(page)).n === a0.n)
  await page.locator('dialog[open] button.secondaire').click(); await page.waitForTimeout(100)
  await page.evaluate(() => window.__app.choisirOutil('selection'))

  // ----- Un text/html piégé : rien n'est collé, rien ne s'exécute -----
  a0 = await etat(page)
  await viderMessages(page)
  await page.evaluate(COLLER_SYNTHETIQUE, { html: '<img src=x onerror="window.__pwn=1" data-mem-teachingtool=\'1\' data-copie=\'PHNjcmlwdD4=\'>', texte: 'x' })
  const b64 = Buffer.from(JSON.stringify({ v: 1, formes: [{ id: 'a', type: 'trait', x: 0, y: 0, z: 1, pts: [0, 0, 0.5], couleur: 'red', taille: 2, opacite: 1, pression: false }], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 1 })).toString('base64')
  await page.evaluate(COLLER_SYNTHETIQUE, { html: `<img src=x onerror="window.__pwn=2" data-mem-teachingtool="1" data-copie="${b64}">`, texte: 'y' })
  await page.waitForTimeout(400)
  e = await etat(page)
  const pwn = await page.evaluate(() => window.__pwn)
  verifier('Un text/html piégé (<img onerror> à fausse marque, ou à copie abîmée) : rien n\'est collé, window.__pwn reste indéfini',
    e.n === a0.n && pwn === undefined && (await messages(page)).every(m => m === 'Le presse-papiers ne contient ni objet ni image à coller.'), JSON.stringify({ n: e.n, pwn, m: await messages(page) }))
  // Par le vrai presse-papiers aussi
  await page.evaluate(async () => {
    const html = '<img src=x onerror="window.__pwn=3" data-mem-teachingtool=\'1\' data-copie=\'e30=\'>'
    await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob(['piège'], { type: 'text/plain' }) })])
  })
  await ctrl(cdp, 'v'); await page.waitForTimeout(400)
  verifier('… par le vrai presse-papiers : rien n\'est collé, rien ne s\'exécute', (await etat(page)).n === a0.n && (await page.evaluate(() => window.__pwn)) === undefined)
  verifier('… et l\'on dit qu\'il n\'y a rien à coller', (await dernierMessage(page)) === 'Le presse-papiers ne contient ni objet ni image à coller.', JSON.stringify(await messages(page)))

  // ----- Une image du système (un fichier) s'importe comme avant -----
  a0 = await etat(page)
  await page.evaluate(async () => {
    const cv = Object.assign(document.createElement('canvas'), { width: 40, height: 30 })
    cv.getContext('2d').fillRect(0, 0, 40, 30)
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  })
  await viderMessages(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(600)
  e = await etat(page)
  let imgs = await page.evaluate(ids => window.__app.formes.filter(f => !ids.includes(f.id)).map(f => f.type), a0.ids)
  verifier('Une image dans le presse-papiers du système : Ctrl+V l\'importe, comme avant', e.n === a0.n + 1 && imgs[0] === 'image' && (await messages(page)).some(m => m.startsWith('Image posée')), JSON.stringify({ imgs, m: await messages(page) }))

  // ----- Le texte du système est la copie gardée, sans HTML : elle se colle -----
  await page.evaluate(T => { const a = window.__app; a.selection.clear(); a.selection.add(T) }, T)
  await ctrl(cdp, 'c')
  await page.evaluate(() => navigator.clipboard.writeText('MEM teachingtool : 1 objet'))
  a0 = await etat(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(100)
  verifier('Le presse-papiers n\'a que le texte de la copie (pas de HTML) : la copie gardée se colle', (await etat(page)).n === a0.n + 1)
  await page.evaluate(() => navigator.clipboard.writeText('du texte d\'ailleurs'))
  a0 = await etat(page)
  await viderMessages(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(100)
  verifier('Un texte d\'ailleurs dans le presse-papiers : rien n\'est collé, et on le dit', (await etat(page)).n === a0.n && (await dernierMessage(page)) === 'Le presse-papiers ne contient ni objet ni image à coller.', JSON.stringify(await messages(page)))

  // ----- Le presse-papiers du système refuse la copie : Ctrl+V la colle quand même -----
  await page.evaluate(() => { window.__exec = document.execCommand; document.execCommand = () => false })
  await page.evaluate(L => { const a = window.__app; a.selection.clear(); a.selection.add(L) }, L)
  await ctrl(cdp, 'c')
  await page.evaluate(() => { document.execCommand = window.__exec })
  const ppRefus = await page.evaluate(() => navigator.clipboard.readText())
  a0 = await etat(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(100)
  const colleRefus = (await formesSel(page))[0]
  verifier('Le système a refusé la copie (il garde un texte d\'ailleurs) : Ctrl+V colle quand même ce qu\'on vient de copier',
    ppRefus === 'du texte d\'ailleurs' && (await etat(page)).n === a0.n + 1 && colleRefus?.type === 'trait', JSON.stringify({ ppRefus, n: (await etat(page)).n - a0.n, t: colleRefus?.type }))
  // ----- Un navigateur qui ne donne pas l'événement paste hors d'un champ -----
  await page.evaluate(() => window.addEventListener('paste', e => { if (window.__sansPaste) e.stopImmediatePropagation() }, true))
  await page.evaluate(() => { window.__sansPaste = true })
  a0 = await etat(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(350)
  verifier('Sans événement paste (un navigateur qui ne le donne pas), Ctrl+V colle la copie gardée un instant après', (await etat(page)).n === a0.n + 1, JSON.stringify((await etat(page)).n - a0.n))
  await page.evaluate(() => { window.__sansPaste = false })
  a0 = await etat(page)
  await ctrl(cdp, 'v'); await page.waitForTimeout(350)
  verifier('… avec l\'événement paste, un seul collage (l\'attente est annulée)', (await etat(page)).n === a0.n + 1, JSON.stringify((await etat(page)).n - a0.n))

  // ----- coller() et peutColler() (pour « Coller ici ») -----
  const ici = await page.evaluate(() => { const a = window.__app, n = a.formes.length; const ok = a.peutColler() && a.coller({ x: 900, y: 650 }); const f = a.formes.find(x => a.selection.has(x.id)); const b = f && a.boiteDuContenu([f]); return { ok, n: a.formes.length - n, b } })
  const ciIci = ici.b && { x: ici.b.x + ici.b.l / 2, y: ici.b.y + ici.b.h / 2 }
  verifier('coller(ou) : le centre de la copie va où on le dit', ici.ok && ici.n === 1 && pres(ciIci.x, 900) && pres(ciIci.y, 650), JSON.stringify(ici))

  // ----- Pendant la revue : rien -----
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click(); await page.waitForTimeout(400)
  a0 = await etat(page)
  const enRevue = await page.evaluate(() => window.__app.enLecture)
  await touche(cdp, 'a', 'KeyQ', 2); await ctrl(cdp, 'c'); await ctrl(cdp, 'v'); await ctrl(cdp, 'd'); await ctrl(cdp, 'x')
  await page.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', ''); document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true })) })
  await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Pendant la revue, Ctrl+A, C, V, D, X et un collage ne font rien', enRevue && e.n === a0.n && e.film === a0.film && JSON.stringify(e.sel) === JSON.stringify(a0.sel), JSON.stringify({ enRevue, a0, e }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)

  // ----- Pendant une séance d'automatismes : rien -----
  await page.evaluate(T => { const a = window.__app; a.selection.clear(); a.selection.add(T) }, T)
  await page.getByRole('button', { name: 'Automatismes : 10 questions minutées' }).click(); await page.waitForTimeout(300)
  a0 = await etat(page)
  await ctrl(cdp, 'd'); await ctrl(cdp, 'x'); await touche(cdp, 'a', 'KeyQ', 2)
  e = await etat(page)
  verifier('Pendant une séance d\'automatismes, Ctrl+D, Ctrl+X, Ctrl+A ne font rien', e.n === a0.n && e.sel.length === 1, JSON.stringify({ a0, e }))
  await page.evaluate(() => document.querySelector('.seance .fermer')?.click()); await page.waitForTimeout(150)

  // ----- Page vide -----
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(100)
  await viderMessages(page)
  await touche(cdp, 'a', 'KeyQ', 2)
  verifier('Ctrl+A sur une page vide : « La page est vide. »', (await dernierMessage(page)) === 'La page est vide.', JSON.stringify(await messages(page)))
  await ctx.close()
}

// =============== 2. Deux onglets : copier dans l'un, coller dans l'autre ===============
{
  const ctx = await contexte()
  const { page: A, cdp: cA } = await charger(ctx, 'onglet A')
  const { page: B, cdp: cB } = await charger(ctx, 'onglet B')
  await A.bringToFront()
  const T = await poser(A, { type: 'triangle', x: 300, y: 200, noms: ['A', 'B', 'C'] })
  const I = await A.evaluate(IMPORTER)
  const donneesA = await A.evaluate(I => { const a = window.__app, f = a.formes.find(x => x.id === I); return a.tableau.doc.getMap('images').get(f.src) }, I)
  const imgA = await forme(A, I)
  await A.evaluate(([T, I]) => { const a = window.__app; a.selection.clear(); a.selection.add(T); a.selection.add(I) }, [T, I])
  await sourisDehors(A)
  await ctrl(cA, 'c')
  await B.bringToFront()
  await sourisDehors(B)
  const avantB = await B.evaluate(src => ({ n: window.__app.formes.length, aImage: window.__app.tableau.doc.getMap('images').has(src) }), imgA.src)
  await ctrl(cB, 'v'); await B.waitForTimeout(200)
  const colles = await formesSel(B)
  const nImg = colles.find(f => f.type === 'image'), nT = colles.find(f => f.type === 'polygone')
  verifier('Onglet B (ouvert avant l\'image, sa banque ne l\'a pas) : Ctrl+V colle le triangle et l\'image copiés dans A', !avantB.aImage && colles.length === 2 && !!nImg && !!nT, JSON.stringify({ avantB, colles: colles.map(f => f.type) }))
  const donneesB = await B.evaluate(src => window.__app.tableau.doc.getMap('images').get(src), nImg?.src)
  const pixels = await B.evaluate(async src => {
    const im = window.__app.pixels(src)
    if (!im) return null
    if (!im.complete) await new Promise(r => { im.onload = r; im.onerror = r })
    const cv = Object.assign(document.createElement('canvas'), { width: im.naturalWidth, height: im.naturalHeight })
    const g = cv.getContext('2d'); g.drawImage(im, 0, 0)
    return { l: im.naturalWidth, h: im.naturalHeight, gauche: [...g.getImageData(10, 10, 1, 1).data], droite: [...g.getImageData(100, 10, 1, 1).data] }
  }, nImg?.src)
  verifier('… l\'image arrive avec ses pixels (les mêmes données, rouge à gauche, bleu à droite)', donneesB === donneesA && pixels?.l === 120 && pixels.gauche[0] > 200 && pixels.droite[2] > 150, JSON.stringify(pixels))
  verifier('… dans l\'autre onglet, à la même place (elle se voit) ; les noms ABC gardés (libres dans B)', pres(nImg.x, imgA.x) && pres(nImg.y, imgA.y) && nT.noms?.join('') === 'ABC', JSON.stringify({ b: [nImg.x, nImg.y], a: [imgA.x, imgA.y], noms: nT.noms }))
  await ctrl(cB, 'z')
  verifier('… Ctrl+Z dans B retire tout le collage', (await etat(B)).n === avantB.n)
  // Sans HTML dans le presse-papiers : la copie gardée dans le navigateur
  await B.evaluate(() => navigator.clipboard.writeText(''))
  await ctrl(cB, 'v'); await B.waitForTimeout(200)
  verifier('Presse-papiers du système vide : B colle la copie gardée dans le navigateur par A', (await etat(B)).n === avantB.n + 2)
  // Une copie gardée depuis plus de 12 heures ne se colle plus
  await B.evaluate(() => { const c = JSON.parse(localStorage.getItem('mem-presse-papiers')); c.t = Date.now() - 13 * 3600 * 1000; localStorage.setItem('mem-presse-papiers', JSON.stringify(c)) })
  const n13 = (await etat(B)).n
  await viderMessages(B)
  await ctrl(cB, 'v'); await B.waitForTimeout(200)
  verifier('Une copie gardée depuis plus de 12 h ne se colle plus (on le dit)', (await etat(B)).n === n13 && (await dernierMessage(B)) === 'Le presse-papiers ne contient ni objet ni image à coller.', JSON.stringify(await messages(B)))
  const rien = await B.evaluate(() => ({ peut: window.__app.peutColler(), ok: window.__app.coller(), m: window.__msgs.at(-1) }))
  verifier('… coller() le dit aussi : « Rien à coller : copiez d\'abord un objet. »', !rien.peut && !rien.ok && rien.m === 'Rien à coller : copiez d\'abord un objet.', JSON.stringify(rien))
  await ctx.close()
}

// =============== 3. Tablette graphique (stylet sans écran tactile) ===============
{
  const ctx = await contexte()
  const { page, cdp } = await charger(ctx, 'tablette')
  const pointsTactiles = await page.evaluate(() => navigator.maxTouchPoints)
  const T = await poser(page, { type: 'triangle', x: 300, y: 200, noms: ['A', 'B', 'C'] })
  const survol = (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0 })
  await page.evaluate(T => { const a = window.__app; a.choisirOutil('selection'); a.selection.add(T) }, T)
  await survol(900, 500); await survol(905, 500)
  await ctrl(cdp, 'c')
  await survol(700, 600); await survol(705, 600)
  const w = await page.evaluate(() => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return a.cam.versMonde(705 - r.left, 600 - r.top) })
  await ctrl(cdp, 'v')
  const c = (await formesSel(page))[0]
  const cc = c && centreDe(c)
  verifier('Tablette graphique (maxTouchPoints 0) : Ctrl+V colle sous la plume qui survole le tableau', pointsTactiles === 0 && cc && pres(cc.x, w.x) && pres(cc.y, w.y), JSON.stringify({ pointsTactiles, cc, w }))
  await ctx.close()
}

// =============== 4. Au doigt (une tablette avec un clavier) ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, cdp } = await charger(ctx, 'doigt')
  const T = await poser(page, { type: 'triangle', x: 300, y: 200, noms: ['A', 'B', 'C'] })
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const bord = await ecranDe(page, 380, 200)
  await page.touchscreen.tap(bord.x, bord.y); await page.waitForTimeout(150)
  const pris = await etat(page)
  const dehors = await page.evaluate(() => window.__app.pointeurSurZone === null)
  await ctrl(cdp, 'c')
  await ctrl(cdp, 'v')
  const c = (await formesSel(page))[0], o = await forme(page, T)
  verifier('Au doigt : un toucher prend le triangle ; le doigt levé n\'est plus « sur le tableau »', JSON.stringify(pris.sel) === JSON.stringify([T]) && dehors, JSON.stringify({ pris, dehors }))
  verifier('… Ctrl+V (clavier de la tablette) colle 1 cm plus loin que l\'original, noms DEF', c && pres(c.x - o.x, 40) && pres(c.y - o.y, 40) && c.noms?.join('') === 'DEF', JSON.stringify(c && { x: c.x - o.x, noms: c.noms }))
  await ctx.close()
}

await nav.close()
if (erreurs.length) for (const e of erreurs) console.log('ÉCHEC erreur JS : ' + e)
const echecs = resultats.filter(r => !r.ok).length + erreurs.length
console.log(`\n${resultats.length - resultats.filter(r => !r.ok).length} / ${resultats.length} vérifications réussies${erreurs.length ? ` ; ${erreurs.length} erreur(s) JS` : ''}`)
process.exit(echecs ? 1 : 0)
