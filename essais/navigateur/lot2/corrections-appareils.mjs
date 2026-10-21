// Essais au navigateur des corrections « appareils » du lot 2 :
//  1. au doigt, la barre d'actions est à 30 px de l'objet ; un toucher que le
//     navigateur a ajusté vers elle (le point du doigt n'y est pas), ou qui la
//     touche moins de 300 ms après qu'elle a paru (le second toucher d'un
//     double appui), passe à la page : un double appui un peu haut ouvre le
//     menu au lieu d'effacer l'objet ; la souris et la tablette graphique
//     cliquent la barre aussitôt ; Entrée sur un de ses boutons agit toujours ;
//  2. pendant le réglage d'un flash d'automatismes (une fenêtre ; avant, la
//     séance d'automatismes cachait le tableau), aucune touche ne change le
//     tableau (Ctrl+Z, Ctrl+Y, Suppr, les flèches, Page↓, Maj+1, les lettres
//     des outils, Espace) ; la fenêtre fermée, tout remarche ;
//  3. une poussée aux flèches est sa propre étape d'annulation, jamais fondue
//     avec Ctrl+D, Ctrl+V ou une couleur choisie juste avant ; une rafale de
//     flèches reste une seule étape ;
//  4. un lasso qui fait plus d'un tour garde ce qu'il entoure deux fois ;
//  5. Ctrl+A, C, X, V, D pendant qu'on glisse un objet ne font rien ;
//  6. au crayon sur un écran tactile (iPad), la barre offre « Ajouter » ; la
//     tablette graphique, non.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = 'http://localhost:5173/'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
const attendre = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()
const contexte = (o = {}) => nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
const D = (...x) => JSON.stringify(x)

async function charger(ctx, nom) {
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  const cdp = await ctx.newCDPSession(page)
  /** Un toucher : le doigt de rayon r (en px) posé en (x, y), levé après duree ms */
  const tap = async (x, y, r = 8, duree = 50) => {
    const p = [{ x, y, id: 1, radiusX: r, radiusY: r, force: 0.5 }]
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: p }); await attendre(duree)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(30)
  }
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  stylet.toucher = async (x, y) => { await stylet.bas(x, y); await attendre(40); await stylet.haut(x, y); await page.waitForTimeout(80) }
  return { page, cdp, tap, touche, stylet }
}

const ETAT = () => {
  const a = window.__app, pn = document.querySelector('.panneau-forme'), ba = document.querySelector('.barre-actions')
  const r = ba && !ba.hidden ? ba.getBoundingClientRect() : null
  // Depuis le lot 5 (K6), voulu ainsi : la barre se pose autour de l'EMPRISE
  // de ce qui est pris (son cadre de taille et sa pastille ↻ compris)
  const b = a.emprise ? a.emprise(a.objetsChoisis()) : a.boiteDuContenu(a.objetsChoisis()), z = document.getElementById('zone').getBoundingClientRect()
  const p = b && a.cam.versEcran(b.x, b.y), q = b && a.cam.versEcran(b.x + b.l, b.y + b.h)
  return {
    n: a.formes.length, ids: a.formes.map(f => f.id), sel: [...a.selection].sort(), outil: a.outil, panneau: !pn.hidden, page: a.page,
    cam: { x: a.cam.x, y: a.cam.y, z: a.cam.z }, ajout: a.ajoutTactile, msgs: window.__msgs.slice(), espace: a.espace,
    barre: r ? {
      top: r.top, bottom: r.bottom, left: r.left, right: r.right,
      boutons: [...ba.querySelectorAll('button')].map(x => { const q = x.getBoundingClientRect(); return { lib: x.querySelector('.libelle').textContent, titre: x.title, pressed: x.getAttribute('aria-pressed'), x: q.left + q.width / 2, y: q.top + q.height / 2 } }),
    } : null,
    objet: b ? { top: z.top + p.y, bottom: z.top + q.y, left: z.left + p.x, right: z.left + q.x } : null,
  }
}
const etat = page => page.evaluate(ETAT)
const forme = (page, id) => page.evaluate(id => { const f = window.__app.formes.find(x => x.id === id); return f && JSON.parse(JSON.stringify(f)) }, id)
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
const POSER = o => {
  const a = window.__app, t = a.tableau
  const id = 'T' + Math.random().toString(36).slice(2, 8)
  const L = o.l ?? 120
  const f = { id, type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, L / 3, 0, 0.5, 2 * L / 3, 0, 0.5, L, 0, 0.5],
    couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}
const poser = (page, o) => page.evaluate(POSER, o)
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
const remettre = page => page.evaluate(() => { const a = window.__app; a.ui.fermerMenus(); a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, a.formes.map(f => f.id)); a.selection.clear(); a.ui.maj() })
const bouton = (e, lib) => e.barre?.boutons.find(b => b.lib === lib)

// =============== 1. La barre au doigt : ce qui ne vise pas la barre passe à la page ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, tap } = await charger(ctx, 'barre-doigt')
  await outil(page, 'selection')
  // 1a. Le double appui un peu haut, avec un doigt de 12 à 20 px de rayon
  for (const r of [12, 16, 20]) {
    for (const haut of [4, 8, 12]) {
      const T = await poser(page, { x: 500, y: 400, l: 90 })
      const c = await ecranDe(page, 545, 400)
      await tap(c.x, c.y - haut, r)
      await attendre(60)
      await tap(c.x, c.y - haut, r)
      await page.waitForTimeout(150)
      const e = await etat(page)
      verifier(`Doigt de rayon ${r} px, double appui ${haut} px au-dessus du trait : le menu complet s'ouvre, le trait reste`, e.panneau && e.ids.includes(T), D(e.panneau, e.ids))
      await remettre(page); await attendre(400)
    }
  }
  // 1b. Toucher un mot, puis le retoucher une seconde après, 5 px plus haut (rayon 16)
  let T = await poser(page, { x: 500, y: 400, l: 90 })
  let c = await ecranDe(page, 545, 400)
  await tap(c.x, c.y, 16); await attendre(1000)
  let e = await etat(page)
  verifier('Au doigt, la barre est à 30 px au-dessus de l\'objet (pas 10)', e.barre && e.objet && Math.abs(e.objet.top - e.barre.bottom - 30) <= 1.5, D(e.barre, e.objet))
  await tap(c.x, c.y - 5, 16); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Retoucher un mot pris, 5 px au-dessus de sa ligne (rayon 16) : il n\'est pas effacé, il reste pris', e.ids.includes(T) && e.sel.includes(T), D(e.ids, e.sel))
  // 1c. Le glisser en partant 5 px au-dessus
  await remettre(page); await attendre(400)
  T = await poser(page, { x: 500, y: 400, l: 90 })
  await tap(c.x, c.y, 16); await attendre(600)
  const pt = (x, y) => [{ x, y, id: 1, radiusX: 16, radiusY: 16, force: 0.5 }]
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(c.x, c.y - 5) })
  for (let k = 1; k <= 8; k++) { await attendre(16); await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(c.x + 10 * k, c.y - 5) }) }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(150)
  let f = await forme(page, T)
  verifier('Glisser un mot pris en partant 5 px au-dessus de sa ligne (rayon 16) : il se déplace', f && f.x > 560, D(f?.x))
  // 1d. Un vrai toucher sur « Supprimer », quand on a eu le temps de la voir : il supprime
  await remettre(page); await attendre(400)
  T = await poser(page, { x: 500, y: 400, l: 90 })
  await tap(c.x, c.y); await attendre(500)
  e = await etat(page)
  const sup = bouton(e, 'Supprimer')
  await tap(sup.x, sup.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Au doigt, « Supprimer » touché en plein, une demi-seconde après : l\'objet est supprimé', !e.ids.includes(T), D(e.ids))
  // 1e. « Dupliquer » touché 100 ms après que la barre a paru : rendu à la page, rien n'est dupliqué
  T = await poser(page, { x: 500, y: 400, l: 90 })
  await attendre(400)
  await tap(c.x, c.y)
  e = await etat(page)
  const dup = bouton(e, 'Dupliquer')
  await attendre(60)
  await tap(dup.x, dup.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Au doigt, un toucher sur la barre moins de 300 ms après qu\'elle a paru n\'agit pas (rien de dupliqué)', e.n === 1, D(e.n, e.ids))
  // 1f. … et Entrée sur un bouton de la barre agit toujours ensuite (un clic sans pointeur)
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ui.maj() }, T)
  await page.waitForTimeout(100)
  await page.evaluate(() => document.querySelector('.barre-actions .action-dupliquer').focus())
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Après un toucher rendu à la page, Entrée sur « Dupliquer » duplique', e.n === 2, D(e.n))
  await ctx.close()
}
// La souris et la tablette graphique cliquent la barre aussitôt, à 10 px de l'objet
{
  const ctx = await contexte()
  const { page, stylet } = await charger(ctx, 'barre-souris')
  await outil(page, 'selection')
  const T = await poser(page, { x: 500, y: 400, l: 90 })
  const c = await ecranDe(page, 545, 400)
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(60)
  let e = await etat(page)
  verifier('À la souris, la barre reste à 10 px de l\'objet', e.barre && Math.abs(e.objet.top - e.barre.bottom - 10) <= 1.5, D(e.barre, e.objet))
  const dup = bouton(e, 'Dupliquer')
  await page.mouse.click(dup.x, dup.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('À la souris, « Dupliquer » cliqué aussitôt après que la barre a paru : dupliqué', e.n === 2, D(e.n))
  await page.evaluate(id => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, a.formes.filter(f => f.id !== id).map(f => f.id)); a.selection.clear(); a.ui.maj() }, T)
  await page.evaluate(() => { window.__msgs.length = 0 })
  await stylet.toucher(c.x, c.y)
  e = await etat(page)
  const cop = bouton(e, 'Copier')
  verifier('Tablette graphique (stylet, écran non tactile) : pas d\'« Ajouter » dans la barre', e.barre && !bouton(e, 'Ajouter'), D(e.barre?.boutons.map(b => b.lib)))
  await stylet.toucher(cop.x, cop.y)
  e = await etat(page)
  verifier('Tablette graphique : « Copier » touché aussitôt après que la barre a paru : copié', e.msgs.includes('1 objet copié'), D(e.msgs))
  await ctx.close()
}

// =============== 2. Pendant le réglage d'un flash d'automatismes, aucune touche ne change le tableau ===============
{
  const ctx = await contexte()
  const { page } = await charger(ctx, 'seance')
  const T = await poser(page, { x: 300, y: 300 })
  await poser(page, { x: 300, y: 450 })
  await page.evaluate(() => { const a = window.__app; const p = a.page; a.nouvellePage(); a.allerPage(p) })
  await outil(page, 'selection')
  await page.waitForTimeout(450)
  const c = await ecranDe(page, 360, 300)
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(60)
  const avant = await etat(page), fAvant = await forme(page, T)
  await page.click('button[title^="Automatismes"]'); await page.waitForTimeout(300)
  const enSeance = await page.evaluate(() => !!document.querySelector('dialog.dialogue-flash[open]'))
  await page.evaluate(() => { window.__msgs.length = 0 })
  for (const k of ['Control+z', 'Control+y', 'Control+Shift+z', 'Delete', 'Backspace', 'ArrowRight', 'ArrowDown', 'PageDown', 'Shift+Digit1', 'p', 'Control+d', 'Control+a']) {
    await page.keyboard.press(k); await page.waitForTimeout(40)
  }
  // Le focus est dans la fenêtre (sur « Lancer le flash », éteint : aucun
  // thème coché) : Espace ne rappuie pas le bouton « Automatismes » (la
  // fenêtre n'est pas refaite)
  await page.evaluate(() => { document.querySelector('dialog.dialogue-flash').dataset.marque = '1' })
  const focus = await page.evaluate(() => document.activeElement?.title ?? '')
  await page.keyboard.down('Space')
  const espace = (await etat(page)).espace
  await page.keyboard.up('Space')
  await page.waitForTimeout(300)
  const reglages = await page.evaluate(() => document.querySelector('dialog.dialogue-flash[open]')?.dataset.marque === '1')
  const pendant = await etat(page), fPendant = await forme(page, T)
  verifier('Réglage du flash ouvert', enSeance)
  verifier('Réglage : Ctrl+Z, Ctrl+Y, Suppr, Retour arrière, Ctrl+D ne changent rien à la page', pendant.n === avant.n && fPendant && fPendant.x === fAvant.x && fPendant.y === fAvant.y, D(avant.n, pendant.n, fAvant, fPendant))
  verifier('Réglage : ni page, ni outil, ni vue, ni sélection ne changent ; aucun message', pendant.page === avant.page && pendant.outil === avant.outil
    && JSON.stringify(pendant.cam) === JSON.stringify(avant.cam) && JSON.stringify(pendant.sel) === JSON.stringify(avant.sel) && !pendant.msgs.length, D(avant, pendant))
  verifier('Réglage : Espace n\'arme pas « Espace + glisser » du tableau', espace === false, D(espace))
  verifier('Réglage : Espace n\'actionne aucun bouton du tableau (la fenêtre n\'est pas refaite)', reglages, D(focus, reglages))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  const ferme = !(await page.evaluate(() => !!document.querySelector('dialog.dialogue-flash[open]')))
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(100)
  const fPousse = await forme(page, T)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  const apres = await etat(page)
  verifier('La fenêtre fermée, les flèches et Ctrl+Z remarchent', ferme && fPousse.x === fAvant.x + 4 && apres.n === avant.n - 1, D(ferme, fPousse.x, apres.n))
  await ctx.close()
}

// =============== 3. La poussée aux flèches : sa propre étape d'annulation ===============
async function casFleches(nom, faire) {
  const ctx = await contexte()
  const { page } = await charger(ctx, nom)
  const T = await poser(page, { x: 300, y: 300 })
  await outil(page, 'selection')
  await attendre(450)
  const s = await ecranDe(page, 360, 300)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(80)
  await attendre(450)
  const r = await faire(page, T)
  await ctx.close()
  return r
}
{
  let r = await casFleches('d', async (page, T) => {
    await page.keyboard.press('Control+d')
    const copie = (await etat(page)).sel[0]
    const c0 = await forme(page, copie)
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80)
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    const c1 = await forme(page, copie), n1 = (await etat(page)).n
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    return { c0: c0.x, c1: c1?.x, n1, n2: (await etat(page)).n }
  })
  verifier('Ctrl+D puis → aussitôt, Ctrl+Z : la poussée seule est défaite (la copie reste, à sa place d\'avant)', r.n1 === 2 && r.c1 === r.c0, D(r))
  verifier('… un second Ctrl+Z défait la copie', r.n2 === 1, D(r))
  r = await casFleches('v', async page => {
    await page.keyboard.press('Control+c'); await page.waitForTimeout(60)
    await page.keyboard.press('Control+v'); await page.waitForTimeout(260)
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(80)
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    return { n: (await etat(page)).n }
  })
  verifier('Ctrl+V puis → aussitôt, Ctrl+Z : le collage reste', r.n === 2, D(r))
  r = await casFleches('couleur', async (page, T) => {
    await page.evaluate(id => window.__app.ouvrirOptions(window.__app.forme(id)), T); await page.waitForTimeout(80)
    await page.locator('.panneau-forme button', { hasText: 'Contour' }).first().click(); await page.waitForTimeout(60)
    await page.locator('.panneau-forme button[title*="ouge"]').first().click()
    // Depuis les corrections « conformite », ↓ va dans le menu complet tant
    // qu'il est ouvert (comme dans le menu du système) : on le ferme, la
    // sélection reste, et ↓ pousse le trait aussitôt après la couleur
    await page.evaluate(() => { const a = window.__app; a.options = null; a.ui.maj() })
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(80)
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    const f = await forme(page, T)
    return { couleur: f.couleur, y: f.y }
  })
  verifier('Une couleur choisie, le menu fermé, puis ↓ aussitôt, Ctrl+Z : le trait reste rouge, revenu à sa hauteur', r.couleur !== '#1b2230' && r.y === 300, D(r))
  r = await casFleches('rafale', async (page, T) => {
    for (let k = 0; k < 3; k++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(50) }
    const x3 = (await forme(page, T)).x
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    const x0 = (await forme(page, T)).x
    await page.keyboard.press('Control+y'); await page.waitForTimeout(80)
    return { x3, x0, xy: (await forme(page, T)).x }
  })
  verifier('Une rafale de trois → : une seule étape (Ctrl+Z revient au départ, Ctrl+Y refait les trois)', r.x3 === 312 && r.x0 === 300 && r.xy === 312, D(r))
  r = await casFleches('pousser-dupliquer', async (page, T) => {
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60)
    await page.keyboard.press('Control+d'); await page.waitForTimeout(60)
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    return { n: (await etat(page)).n, x: (await forme(page, T)).x }
  })
  verifier('→ puis Ctrl+D aussitôt, Ctrl+Z : la copie seule est défaite, la poussée reste', r.n === 1 && r.x === 304, D(r))
  // Ctrl+Z vide la sélection (ce qui revient peut recouvrir ce qui était
  // choisi) : on reprend le trait aussitôt, sans geste qui ouvre une étape
  r = await casFleches('reprise', async (page, T) => {
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60)
    await page.keyboard.press('Control+z'); await page.waitForTimeout(60)
    await page.evaluate(id => { const a = window.__app; a.selection.add(id); a.ui.maj() }, T)
    await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60)
    const x1 = (await forme(page, T)).x
    await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
    return { x1, x: (await forme(page, T))?.x, n: (await etat(page)).n }
  })
  verifier('→, Ctrl+Z, → aussitôt, Ctrl+Z : chaque poussée se défait, le trait reste', r.x1 === 304 && r.x === 300 && r.n === 1, D(r))
}

// =============== 4. Un lasso qui fait plus d'un tour ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, touche, stylet } = await charger(ctx, 'lasso')
  const A = await poser(page, { x: 560, y: 330, l: 60 })
  const B = await poser(page, { x: 380, y: 330, l: 60 })
  const C = await poser(page, { x: 800, y: 330, l: 60 })
  await outil(page, 'selection')
  const cx = 500, cy = 330, r = 150
  async function lasso(tours, pointeur) {
    const n = Math.round(48 * tours), pts = []
    for (let k = 0; k <= n; k++) {
      const a = -Math.PI / 2 + 2 * Math.PI * k / 48, rr = r * (1 + 0.04 * k / n)
      pts.push(await ecranDe(page, cx + rr * Math.cos(a), cy + rr * Math.sin(a)))
    }
    if (pointeur === 'doigt') {
      await touche('touchStart', [[pts[0].x, pts[0].y]])
      for (const p of pts.slice(1)) { await touche('touchMove', [[p.x, p.y]]); await attendre(8) }
      await touche('touchEnd', [])
    } else {
      await stylet.bas(pts[0].x, pts[0].y)
      for (const p of pts.slice(1)) { await stylet.va(p.x, p.y); await attendre(4) }
      await stylet.haut(pts.at(-1).x, pts.at(-1).y)
    }
    await page.waitForTimeout(120)
    const e = await etat(page)
    await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
    await attendre(350)
    return e.sel
  }
  for (const p of ['doigt', 'stylet']) {
    for (const t of [1, 1.5, 1.75, 2]) {
      const sel = await lasso(t, p)
      verifier(`Lasso au ${p}, ${t} tour(s) autour de deux mots : les deux sont pris, celui du dehors non`, sel.includes(A) && sel.includes(B) && !sel.includes(C), D(sel.includes(A), sel.includes(B), sel.includes(C)))
    }
  }
  await ctx.close()
}

// =============== 5. Ctrl+A, C, X, V, D pendant qu'on glisse un objet ===============
for (const k of ['Control+a', 'Control+v', 'Control+d', 'Control+x', 'Control+c']) {
  const ctx = await contexte()
  const { page } = await charger(ctx, k)
  const T = await poser(page, { x: 300, y: 300 })
  const U = await poser(page, { x: 300, y: 500 })
  await outil(page, 'selection')
  const sU = await ecranDe(page, 360, 500)
  await page.mouse.click(sU.x, sU.y); await page.keyboard.press('Control+c'); await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  await page.evaluate(() => { window.__msgs.length = 0 })
  const s = await ecranDe(page, 360, 300)
  await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(s.x + 40, s.y + 40, { steps: 4 })
  await page.keyboard.press(k); await page.waitForTimeout(300)
  await page.mouse.move(s.x + 80, s.y + 80, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(150)
  const e = await etat(page)
  const fT = await forme(page, T), fU = await forme(page, U)
  verifier(`${k} pendant qu'on glisse un trait : il est posé là où on le lâche, l'autre ne bouge pas, rien n'est collé, dupliqué, coupé ni copié`,
    fT && fT.x === 380 && fT.y === 380 && fU.x === 300 && fU.y === 500 && e.n === 2 && JSON.stringify(e.sel) === JSON.stringify([T]) && !e.msgs.length, D(fT && [fT.x, fT.y], [fU.x, fU.y], e.n, e.sel, e.msgs))
  if (k === 'Control+a') {
    await page.keyboard.press('Control+a'); await page.waitForTimeout(100)
    verifier('… le glisser fini, Ctrl+A remarche', (await etat(page)).sel.length === 2)
  }
  await ctx.close()
}

// =============== 6. Le crayon sur un écran tactile (iPad) : « Ajouter » ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, stylet } = await charger(ctx, 'crayon')
  const T = await poser(page, { x: 300, y: 300 })
  const U = await poser(page, { x: 300, y: 450 })
  await outil(page, 'selection')
  const sT = await ecranDe(page, 360, 300), sU = await ecranDe(page, 360, 450), vide = await ecranDe(page, 800, 600)
  await stylet.toucher(sT.x, sT.y)
  let e = await etat(page)
  verifier('Crayon sur écran tactile (iPad), Sélection : la barre offre « Ajouter », et « Options » dit l\'appui long',
    e.barre && bouton(e, 'Ajouter') && bouton(e, 'Options').titre === 'Toutes les options (appui long)', D(e.barre?.boutons.map(b => [b.lib, b.titre])))
  await attendre(400)
  const aj = bouton(e, 'Ajouter')
  await stylet.toucher(aj.x, aj.y)
  e = await etat(page)
  verifier('… « Ajouter » touché au crayon : le mode s\'allume', e.ajout && bouton(e, 'Ajouter')?.pressed === 'true', D(e.ajout, e.barre?.boutons))
  await stylet.toucher(sU.x, sU.y)
  e = await etat(page)
  verifier('… un second objet touché au crayon s\'ajoute : deux pris', JSON.stringify(e.sel) === JSON.stringify([T, U].sort()), D(e.sel))
  await stylet.toucher(vide.x, vide.y)
  e = await etat(page)
  verifier('… le vide touché : le mode s\'éteint, la sélection se vide', !e.ajout && !e.sel.length, D(e.ajout, e.sel))
  await ctx.close()
}

await nav.close()
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
process.exit(echecs.length || erreurs.length ? 1 : 0)
