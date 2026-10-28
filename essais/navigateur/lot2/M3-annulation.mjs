// Essais au navigateur du morceau M3 du lot 2 : l'annulation par page.
// Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z (⌘ sur Mac) et les boutons ↶ ↷ n'agissent que sur
// la page visible ; chaque page garde sa pile ; jamais un changement invisible.
// ↶ ↷ grisés quand il n'y a rien à faire, et remis à jour sans autre geste
// (après ↷, les flèches, le point posé par sa minuterie). Un geste = une étape :
// la gomme lente au stylet (même sur une page relue du disque), la figure
// reconnue, la transformation d'une image et de ses points liés.
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
async function recharger(page) {
  await page.reload()
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
}

/** Une touche par CDP : key, code, modificateurs (1 Alt, 2 Ctrl, 4 Meta, 8 Maj) */
async function touche(cdp, key, code, modifiers = 0) {
  const base = { key, code, modifiers, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) }
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base })
}

// ---------- Ce qu'on lit dans la page ----------
const ETAT = () => {
  const a = window.__app, t = a.tableau
  const b = s => document.querySelector(`button[aria-label^="${s}"]`)
  const n = p => t.formesDe(p)?.size ?? -1
  return {
    page: a.page, pages: a.pages, n: a.formes.length, parPage: a.pages.map(n),
    types: a.formes.map(f => f.type),
    annuler: !b('Annuler sur cette page').disabled, retablir: !b('Rétablir sur cette page').disabled,
    ariaAnnuler: b('Annuler sur cette page').getAttribute('aria-disabled'),
    film: t.film.length,
  }
}
const etat = page => page.evaluate(ETAT)
const TOAST = () => [...document.querySelector('.toast').children].map(l => l.textContent).join(' | ')
const toast = page => page.evaluate(TOAST)
const viderToast = page => page.evaluate(() => { for (const l of [...document.querySelector('.toast').children]) l.textContent = '' })
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (page, x, y) => page.evaluate(ECRAN, { x, y })
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.selection.clear()
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'F' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f })
  return id
}
const poser = (page, f) => page.evaluate(POSER, f)
const trait = (x, y, dx, dy = 0) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * dx / 20, i * dy / 20, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
const rect = (x, y, l, h) => ({ type: 'polygone', x, y, pts: [0, 0, l, 0, l, h, 0, h], ferme: true, couleur: '#1b2230', taille: 3 })
/** Oublie la pile de la page visible : ↶ doit être grisé ensuite */
const oublierPile = page => page.evaluate(() => { const a = window.__app; a.tableau.annulationDe(a.page)?.clear() })

/** Un tracé à la souris (écran), en zigzag : de l'écriture, que rien ne redresse */
async function ecrireSouris(page, x, y) {
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 8, y + (i % 2 ? 14 : 0))
  await page.mouse.up(); await page.waitForTimeout(80)
}

// =============== 1. Deux pages, trois traits au Stylo (souris) : 1, 2, 1 ===============
{
  const { ctx, page, cdp } = await ouvrir({}, 'souris')
  verifier('PC sans écran tactile (maxTouchPoints 0)', await page.evaluate(() => navigator.maxTouchPoints) === 0)
  await page.evaluate(() => { window.__app.reconnaissance = false })
  await outil(page, 'stylo')
  // (Adapté aux gains rapides du lot 16 : ↶ et ↷ sont en tête de la barre du haut)
  const titres = await page.evaluate(() => [...document.querySelectorAll('.barre-haut button')].map(b => b.title).filter(t => /cette page/.test(t)))
  verifier('Les titres de ↶ et ↷ disent « sur cette page »', titres.includes('Annuler sur cette page (Ctrl+Z)') && titres.includes('Rétablir sur cette page (Ctrl+Y)'), JSON.stringify(titres))
  let e = await etat(page)
  verifier('Page neuve : ↶ et ↷ grisés (disabled et aria-disabled)', !e.annuler && !e.retablir && e.ariaAnnuler === 'true', JSON.stringify(e))
  await viderToast(page)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  verifier('Page neuve : Ctrl+Z dit « Rien à annuler sur cette page »', (await toast(page)).includes('Rien à annuler sur cette page'), await toast(page))
  await viderToast(page)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(80)
  verifier('Page neuve : Ctrl+Y dit « Rien à rétablir sur cette page »', (await toast(page)).includes('Rien à rétablir sur cette page'), await toast(page))

  const p1 = (await etat(page)).page
  await ecrireSouris(page, 300, 200)
  e = await etat(page)
  verifier('Un trait sur la page 1 : ↶ actif, ↷ grisé', e.n === 1 && e.annuler && !e.retablir, JSON.stringify(e))
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Nouvelle page : ↶ grisé (rien sur cette page)', e.pages.length === 2 && e.page !== p1 && !e.annuler, JSON.stringify(e))
  const p2 = e.page
  await ecrireSouris(page, 400, 300)
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Retour sur la page 1 : ↶ actif', e.page === p1 && e.annuler, JSON.stringify(e))
  await ecrireSouris(page, 300, 350)
  e = await etat(page)
  verifier('Trois traits : 2 sur la page 1, 1 sur la page 2', JSON.stringify(e.parPage) === '[2,1]', JSON.stringify(e.parPage))

  await page.keyboard.press('PageDown'); await page.waitForTimeout(150)
  const film0 = (await etat(page)).film
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Sur la page 2, Ctrl+Z ne retire que le trait de la page 2', e.page === p2 && JSON.stringify(e.parPage) === '[2,0]', JSON.stringify(e.parPage))
  const film = await page.evaluate(n => window.__app.tableau.film.toArray().slice(n).map(x => x.page), film0)
  verifier('… et le film note cette étape sur la page 2 (celle qui change)', film.length === 1 && film[0] === p2, JSON.stringify(film))
  verifier('… ↶ grisé, ↷ actif', !e.annuler && e.retablir, JSON.stringify(e))
  await viderToast(page)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Second Ctrl+Z sur la page 2 : la page 1 ne bouge pas, « Rien à annuler sur cette page »', JSON.stringify(e.parPage) === '[2,0]' && (await toast(page)).includes('Rien à annuler sur cette page'), JSON.stringify({ parPage: e.parPage, toast: await toast(page) }))

  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Page 1 : ↷ grisé (ce qu\'on a défait est sur la page 2)', !e.retablir && e.annuler, JSON.stringify(e))
  await page.keyboard.press('Control+y'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Y sur la page 1 ne refait pas le trait de la page 2', JSON.stringify(e.parPage) === '[2,0]', JSON.stringify(e.parPage))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Sur la page 1, Ctrl+Z retire son dernier trait', JSON.stringify(e.parPage) === '[1,0]', JSON.stringify(e.parPage))

  // Ctrl+Maj+Z rétablit ; ⌘Z annule, ⌘Maj+Z et ⌘Y rétablissent
  await page.keyboard.press('Control+Shift+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Maj+Z rétablit (le trait revient sur la page 1)', JSON.stringify(e.parPage) === '[2,0]', JSON.stringify(e.parPage))
  await touche(cdp, 'z', 'KeyZ', 4); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('⌘Z annule sur la page visible', JSON.stringify(e.parPage) === '[1,0]', JSON.stringify(e.parPage))
  await touche(cdp, 'Z', 'KeyZ', 4 | 8); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('⌘Maj+Z rétablit', JSON.stringify(e.parPage) === '[2,0]', JSON.stringify(e.parPage))

  // Le bouton ↷ : ↶ redevient actif sans autre geste
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Deux Ctrl+Z : la page 1 est vide, ↶ grisé, ↷ actif', e.n === 0 && !e.annuler && e.retablir, JSON.stringify(e))
  await page.click('button[aria-label^="Rétablir sur cette page"]'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('↷ (le bouton) : le trait revient et ↶ redevient actif aussitôt', e.n === 1 && e.annuler && e.retablir, JSON.stringify(e))
  await page.click('button[aria-label^="Annuler sur cette page"]'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('↶ (le bouton) : le trait repart, ↶ grisé', e.n === 0 && !e.annuler, JSON.stringify(e))
  // Un bouton grisé ne fait rien
  await page.click('button[aria-label^="Annuler sur cette page"]', { force: true }); await page.waitForTimeout(80)
  verifier('↶ grisé : un clic ne change rien', JSON.stringify((await etat(page)).parPage) === '[0,0]', JSON.stringify((await etat(page)).parPage))

  // Ctrl+Z dans le champ d'une formule ne touche pas la page
  await ecrireSouris(page, 300, 450)
  const n0 = (await etat(page)).n
  await outil(page, 'formule')
  await page.mouse.click(700, 300); await page.waitForTimeout(200)
  const champ = page.locator('input.saisie')
  verifier('Outil Formule : le champ est ouvert et a le focus', await champ.isVisible() && await champ.evaluate(el => document.activeElement === el))
  await page.keyboard.type('x^2'); await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z dans le champ d\'une formule ne touche pas la page', e.n === n0, JSON.stringify({ n0, n: e.n }))
  // La formule validée : ↶ s'allume (la pile de la page était oubliée)
  await oublierPile(page); await page.waitForTimeout(50)
  verifier('Pile oubliée : ↶ grisé pendant qu\'on tape la formule', !(await etat(page)).annuler)
  await champ.fill('x^2'); await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Une formule validée : elle est posée et ↶ s\'allume sans autre geste', e.n === n0 + 1 && e.types.includes('formule') && e.annuler, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  verifier('Ctrl+Z retire la formule', (await etat(page)).n === n0)

  // Une flèche qui pousse la sélection : ↶ devient actif
  await page.evaluate(PAGE_NEUVE)
  const R = await poser(page, rect(300, 200, 150, 100))
  await oublierPile(page); await page.waitForTimeout(50)
  e = await etat(page)
  verifier('Un rectangle, pile oubliée : ↶ grisé', e.n === 1 && !e.annuler, JSON.stringify(e))
  await outil(page, 'selection')
  let s = await ecran(page, 375, 200)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(80)
  verifier('Le rectangle est sélectionné', await page.evaluate(id => window.__app.selection.has(id), R))
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80)
  e = await etat(page)
  const x1 = await page.evaluate(id => window.__app.forme(id).x, R)
  verifier('La flèche → pousse la sélection, et ↶ devient actif sans autre geste', x1 > 300 && e.annuler, JSON.stringify({ x1, annuler: e.annuler }))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  verifier('Ctrl+Z ramène le rectangle', await page.evaluate(id => window.__app.forme(id).x, R) === 300)

  // Le point d'un simple toucher au Stylo sur une figure, posé par sa minuterie
  await oublierPile(page); await page.waitForTimeout(50)
  await outil(page, 'stylo')
  e = await etat(page)
  verifier('Avant le toucher : ↶ grisé', !e.annuler, JSON.stringify(e))
  s = await ecran(page, 375, 200)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(700)
  e = await etat(page)
  verifier('Un simple toucher au Stylo sur le rectangle : le point est posé par sa minuterie, ↶ actif', e.n === 2 && e.annuler, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Z retire ce point', e.n === 1 && !e.annuler, JSON.stringify(e))
  // Un toucher puis Ctrl+Z tout de suite (le point attend encore) : ↶ actif pendant l'attente, puis le point part
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(40)
  e = await etat(page)
  verifier('Pendant que le point attend un double-clic : ↶ actif, ↷ grisé', e.annuler && !e.retablir, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(500)
  e = await etat(page)
  verifier('Ctrl+Z pendant l\'attente : le point se pose puis s\'annule, il ne revient pas', e.n === 1, JSON.stringify(e))

  // Une figure reconnue : Ctrl+Z rend le tracé à main levée
  await page.evaluate(PAGE_NEUVE)
  await page.evaluate(() => { window.__app.reconnaissance = true })
  const carre = [[300, 200], [500, 200], [500, 400], [300, 400], [300, 202]]
  await page.mouse.move(...carre[0]); await page.mouse.down()
  for (let i = 1; i < carre.length; i++) {
    const [ax, ay] = carre[i - 1], [bx, by] = carre[i]
    for (let k = 1; k <= 10; k++) await page.mouse.move(ax + (bx - ax) * k / 10, ay + (by - ay) * k / 10)
  }
  await page.mouse.up(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Un carré à main levée devient un polygone', e.types.join() === 'polygone', JSON.stringify(e.types))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Z rend le tracé à main levée', e.types.join() === 'trait', JSON.stringify(e.types))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un second Ctrl+Z retire le tracé', e.n === 0 && !e.annuler, JSON.stringify(e))

  // Transformer une image qui a deux points liés, puis Ctrl+Z : ni image ni points images
  await page.evaluate(PAGE_NEUVE)
  await page.evaluate(p => window.__app.tableau.doc.getMap('images').set('png1', p), 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==')
  const I = await poser(page, { type: 'image', src: 'png1', l: 200, h: 150, m: [1, 0, 0, 1], x: 100, y: 100 })
  for (const [x, y] of [[150, 150], [250, 200]]) await poser(page, { type: 'polygone', x, y, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['A'], stylePoints: [{ marque: 'croix' }], lie: I })
  await page.waitForTimeout(500)
  const avant = await page.evaluate(() => window.__app.formes.map(f => f.id).sort())
  const pile0 = await page.evaluate(() => window.__app.tableau.annulation.undoStack.length)
  await page.evaluate(id => { const a = window.__app; a.transformer(a.forme(id), { type: 'translation', dx: 300, dy: 0 }) }, I)
  await page.waitForTimeout(80)
  const tr = await page.evaluate(img => {
    const a = window.__app, neuves = a.formes.filter(f => f.id !== img && !f.lie?.startsWith?.('zz'))
    const image = a.formes.find(f => f.type === 'image' && f.id !== img)
    return { n: a.formes.length, liees: image ? a.formes.filter(f => f.lie === image.id).length : 0, pile: a.tableau.annulation.undoStack.length, sel: [...a.selection], image: image?.id, k: neuves.length }
  }, I)
  verifier('Transformer l\'image : l\'image et ses deux points images, liés, en UNE étape', tr.n === 6 && tr.liees === 2 && tr.pile === pile0 + 1 && tr.sel[0] === tr.image, JSON.stringify(tr))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  const apres = await page.evaluate(() => window.__app.formes.map(f => f.id).sort())
  verifier('Ctrl+Z après la transformation : ni image ni points images, le reste intact', JSON.stringify(apres) === JSON.stringify(avant), JSON.stringify({ avant: avant.length, apres: apres.length }))

  await ctx.close()
}

// =============== 2. La gomme lente au stylet (tablette graphique), et après un rechargement ===============
{
  const { ctx, page, cdp } = await ouvrir({}, 'stylet')
  const stylet = {
    bas: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 }),
    va: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
  }
  /** Un coup de gomme lent : trois traits verticaux traversés en 2 s */
  async function gommeLente() {
    const y = (await ecran(page, 0, 300)).y
    const xs = [(await ecran(page, 300, 0)).x, (await ecran(page, 400, 0)).x, (await ecran(page, 500, 0)).x]
    let x = xs[0] - 40
    await stylet.bas(x, y)
    const t0 = Date.now()
    for (const cible of xs) {
      while (x < cible + 30) { x += 5; await stylet.va(x, y) }
      await page.waitForTimeout(620)
    }
    await stylet.haut(x, y)
    await page.waitForTimeout(80)
    return Date.now() - t0
  }
  await page.evaluate(PAGE_NEUVE)
  for (const x of [300, 400, 500]) await poser(page, trait(x, 200, 0, 200))
  await page.waitForTimeout(450)
  await outil(page, 'gomme')
  let e = await etat(page)
  const film0 = e.film
  const duree = await gommeLente()
  e = await etat(page)
  const film = await page.evaluate(n => window.__app.tableau.film.length - n, film0)
  verifier('Gomme lente au stylet : trois traits effacés en plus de 1,8 s, trois étapes du film', e.n === 0 && duree > 1800 && film === 3, JSON.stringify({ n: e.n, duree, film }))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… un seul Ctrl+Z les rend tous les trois', e.n === 3, JSON.stringify(e))

  // Après un rechargement : la page est relue du disque, sa pile n'existe pas
  await page.waitForTimeout(800)
  await recharger(page)
  e = await etat(page)
  const pile = await page.evaluate(() => window.__app.tableau.peutAnnuler(window.__app.page))
  verifier('Rechargé : les trois traits sont là, ↶ grisé (aucune pile encore)', e.n === 3 && !e.annuler && !pile, JSON.stringify(e))
  await outil(page, 'gomme')
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner() })
  await gommeLente()
  e = await etat(page)
  verifier('Rechargé, gomme lente : les trois traits effacés, ↶ actif', e.n === 0 && e.annuler, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… un seul Ctrl+Z les rend tous les trois, même après le rechargement', e.n === 3 && !e.annuler, JSON.stringify(e))
  await ctx.close()
}

// =============== 3. Au doigt (tablette, TNI) : ↶ se touche ===============
{
  const { ctx, page } = await ouvrir({ hasTouch: true, isMobile: false }, 'doigt')
  await page.evaluate(() => { window.__app.reconnaissance = false })
  await outil(page, 'stylo')
  await page.evaluate(PAGE_NEUVE)
  // Sur un écran bas, la barre de gauche défile : on amène ↶ et ↷ à l'écran
  const centre = sel => page.evaluate(sel => {
    const el = document.querySelector(sel); el.scrollIntoView({ block: 'center' })
    const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, sel)
  const b = await centre('button[aria-label^="Annuler sur cette page"]')
  const r = await centre('button[aria-label^="Rétablir sur cette page"]')
  verifier('Doigt : ↶ et ↷ sont à l\'écran', b.y > 0 && b.y < 768 && r.y > 0 && r.y < 768, JSON.stringify({ b, r }))
  let e = await etat(page)
  verifier('Doigt : ↶ et ↷ grisés sur une page neuve', e.n === 0 && !e.annuler && !e.retablir, JSON.stringify(e))
  // (Chromium, toucher synthétique : deux touchers au même endroit séparés par
  // un trait perdent parfois le click du second, même sur une page nue, sans
  // l'application ; on alterne donc ↶ et ↷ sans toucher deux fois le même.)
  const cdp = await ctx.newCDPSession(page)
  const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 0, radiusX: 4, radiusY: 4, force: 0.5 })) })
  // Le trait au rythme d'un écran tactile (un touchMove toutes les 16 ms).
  // Envoyés dans la même milliseconde, ses déplacements donnaient à Chromium
  // un élan sans fin, et il ne produisait pas le click du toucher de ↶ qui
  // suivait (pointerdown et pointerup arrivaient sur le bouton, pas le click :
  // 2 à 3 fois sur 5 ; corrections regressions du lot 2, voir
  // lot2/regr/m3-doigt-debug.mjs). Aucun vrai doigt ne fait cela.
  await t('touchStart', [[400, 300]])
  for (let i = 1; i <= 12; i++) { await t('touchMove', [[400 + i * 8, 300 + (i % 2 ? 14 : 0)]]); await page.waitForTimeout(16) }
  await t('touchEnd', []); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt : un trait, ↶ actif', e.n === 1 && e.annuler, JSON.stringify(e))
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt : toucher ↶ retire le trait, ↶ se grise, ↷ s\'allume', e.n === 0 && !e.annuler && e.retablir, JSON.stringify(e))
  await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt : toucher ↷ le rend, et ↶ se rallume aussitôt', e.n === 1 && e.annuler && !e.retablir, JSON.stringify(e))
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt : on peut retoucher ↶ (le trait repart)', e.n === 0 && !e.annuler, JSON.stringify(e))
  await page.touchscreen.tap(r.x, r.y); await page.waitForTimeout(600)
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Doigt : ↷ puis ↶ encore, le trait revient et repart', e.n === 0 && e.retablir, JSON.stringify(e))
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
