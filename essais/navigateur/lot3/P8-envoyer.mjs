// Essais au navigateur du morceau P8 du lot 3 : « Envoyer vers… » ce qui est
// pris, vers une autre page (déplacer ou copier), sans perte ni doublon caché.
// - souris : trois traits pris au cadre, clic droit → menu complet →
//   ⋯ → « Envoyer vers… » → la fenêtre (titre, deux choix, la liste, la page
//   qu'on regarde grisée, les petites vignettes peintes trieuse fermée) →
//   Page 2 : le message et ses deux boutons ; « Aller à la page 2 » (la
//   sélection, le message garde « Annuler ») ; « Annuler » (on revient sur la
//   page de départ, les objets reparaissent) ; Ctrl+Y, Ctrl+Z sur la page de
//   départ ; Ctrl+Z sur la page d'arrivée (rien d'arrivé ne part) ; un objet
//   modifié sur l'arrivée reste, et le message le dit ;
// - copier : la sélection reste, « Annuler » va d'abord sur la page
//   d'arrivée et les copies partent sous les yeux ; la page a changé depuis ;
// - nouvelle page juste après, à la fin (le fond de la page, Annuler la
//   retire) ;
// - doigt (CDP) : barre d'actions « Options », puis la fenêtre ;
// - tablette graphique (stylet CDP, écran non tactile) : bouton latéral sur
//   la sélection, puis la fenêtre au stylet ;
// - clavier : touche Menu, Tab jusqu'à ⋯, Entrée, ↓ (« Envoyer vers… »), Entrée, flèches,
//   Échap, Entrée ;
// - noms : un triangle ABC vers une page qui a déjà ABC devient DEF ;
// - revue : un geste de plus sur chaque page (compterGestes), la revue de
//   chaque page s'ouvre ; « Voir comme un élève » de la séance sans erreur ;
// - téléphone : la fenêtre pleine largeur, la liste défile.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node P8-envoyer.mjs [section…] : seulement ces sections (souris, copier,
// nouvelle, doigt, wacom, clavier, noms, revue, telephone)
import { chromium } from '../commun/playwright.mjs'

const URL0 = 'http://localhost:5173/'
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
const net = t => (t ?? '').replace(/[  ]/g, ' ')
const pause = ms => new Promise(r => setTimeout(r, ms))

async function pret(page) {
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(350)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
}
async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await pret(page)
  const cdp = await ctx.newCDPSession(page)
  return { ctx, page, cdp }
}

/** n pages ; sur la page k, les traits ids[k] (chacun en son geste, en ligne,
 *  à 160 unités l'un de l'autre). On finit sur la première page, à l'outil
 *  Sélection. */
const preparer = (page, traits) => page.evaluate(traits => {
  const a = window.__app, t = a.tableau
  traits.forEach((ids, k) => {
    if (k) a.nouvellePage()
    ids.forEach((id, j) => {
      t.nouveauGeste()
      t.poser(a.page, { id, type: 'trait', x: 200 + 160 * j, y: 260 + 40 * k, z: Date.now() + j, auteur: t.moi, pts: [0, 0, 0.5, 40, 20, 0.5, 100, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
    })
  })
  a.allerPage(a.pages[0])
  a.choisirOutil('selection')
  return a.pages.slice()
}, traits)

const ETAT = () => {
  const a = window.__app, t = a.tableau
  const d = document.querySelector('dialog.dialogue-envoi[open]')
  const pn = document.querySelector('.panneau-forme')
  const act = document.activeElement
  const toast = document.querySelector('.toast.visible')
  return {
    page: a.page, pages: a.pages.slice(), sel: [...a.selection].sort(), outil: a.outil,
    ids: Object.fromEntries(a.pages.map(p => [p, [...(t.formesDe(p)?.keys() ?? [])].sort()])),
    panneau: !!pn && !pn.hidden,
    fenetre: d ? {
      titre: d.querySelector('h2').textContent,
      choix: [...d.querySelectorAll('.envoi-mode .case')].map(c => ({ t: c.textContent, c: c.querySelector('input').checked })),
      dest: [...d.querySelectorAll('.destination')].map(b => ({ t: b.querySelector('.libelle').textContent, dis: b.disabled, cible: b.dataset.cible, canevas: !!b.querySelector('canvas'), tab: b.tabIndex })),
      rect: (() => { const r = d.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width } })(),
    } : null,
    focus: act?.closest?.('.destination')?.dataset.cible ?? (act?.textContent || act?.getAttribute?.('aria-label') || '').trim().slice(0, 40),
    msgs: (window.__msgs || []).slice(),
    actions: toast ? [...toast.querySelectorAll('button.action')].map(x => x.textContent) : [],
    toast: toast?.textContent ?? '',
    trieuse: document.body.classList.contains('en-trieuse'),
  }
}
const etat = page => page.evaluate(ETAT)
const dernier = e => net(e.msgs[e.msgs.length - 1])
/** Le centre (écran) d'une forme de la page qu'on regarde */
const ecranDe = (page, id) => page.evaluate(id => {
  const a = window.__app, f = a.formes.find(x => x.id === id)
  const b = a.rendu.boite(f), z = a.rendu.scene.getBoundingClientRect()
  const p = a.cam.versEcran(b.x, b.y), q = a.cam.versEcran(b.x + b.l, b.y + b.h)
  return { x: z.left + (p.x + q.x) / 2, y: z.top + (p.y + q.y) / 2, l: z.left + p.x, t: z.top + p.y, r: z.left + q.x, b: z.top + q.y }
}, id)
/** Un cadre à la souris autour de ces formes */
async function cadre(page, ids) {
  const bs = await Promise.all(ids.map(id => ecranDe(page, id)))
  const l = Math.min(...bs.map(b => b.l)) - 20, t = Math.min(...bs.map(b => b.t)) - 20
  const r = Math.max(...bs.map(b => b.r)) + 20, b = Math.max(...bs.map(b => b.b)) + 20
  await page.mouse.move(l, t); await page.mouse.down()
  await page.mouse.move((l + r) / 2, (t + b) / 2, { steps: 4 }); await page.mouse.move(r, b, { steps: 4 })
  await page.mouse.up(); await page.waitForTimeout(120)
}
/** Le clic droit sur une forme : le menu complet */
async function clicDroit(page, id) {
  const c = await ecranDe(page, id)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(150)
}
const boutonsPanneau = page => page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].map(b => ({ t: b.textContent || b.getAttribute('aria-label'), titre: b.title })))
// (Adapté aux corrections « regressions » du lot 3 : « Envoyer vers… » est
// dans le petit menu du bouton ⋯ (Plus) du menu complet, après « Copier en
// image », pour que la rangée reste sur une ligne)
async function ouvrirFenetre(page) {
  await page.click('.panneau-forme .ligne button.plus')
  await page.click('.menu-plus .menu-item:has-text("Envoyer vers…")')
  await page.waitForSelector('dialog.dialogue-envoi[open]', { timeout: 3000 })
  await page.waitForTimeout(80)
}
const cliquerDest = (page, cible) => page.click(`dialog.dialogue-envoi[open] .destination[data-cible="${cible}"]`)
const cliquerAction = async (page, libelle) => { await page.click(`.toast.visible button.action:has-text("${libelle}")`); await page.waitForTimeout(150) }
/** Les vignettes de la fenêtre sont-elles peintes (un pixel qui n'est pas blanc) ? */
const vignettesPeintes = page => page.evaluate(() => [...document.querySelectorAll('dialog.dialogue-envoi[open] canvas')].map(c => {
  const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data
  let encre = 0, opaque = 0
  for (let i = 0; i < d.length; i += 4) { if (d[i + 3] > 0) opaque++; if (d[i + 3] > 0 && d[i] + d[i + 1] + d[i + 2] < 600) encre++ }
  return { opaque, encre }
}))

// =============== 1. À la souris : déplacer, Aller, Annuler, Ctrl+Z, Ctrl+Y ===============
if (faire('souris')) {
  const { ctx, page } = await ouvrir()
  const [p1, p2] = await preparer(page, [['a', 'b', 'c', 'reste'], ['q']])
  await cadre(page, ['a', 'b', 'c'])
  let e = await etat(page)
  verifier('(un cadre à la souris prend les trois traits)', JSON.stringify(e.sel) === '["a","b","c"]', e.sel)
  await clicDroit(page, 'b')
  e = await etat(page)
  const bt = await boutonsPanneau(page)
  const k = bt.findIndex(b => /^Plus :/.test(b.t))
  await page.click('.panneau-forme .ligne button.plus'); await page.waitForTimeout(100)
  const mp = await page.evaluate(() => [...document.querySelectorAll('.menu-plus:not([hidden]) .menu-item')].map(b => ({ t: b.querySelector('.libelle').firstChild.textContent, aide: b.querySelector('small')?.textContent })))
  // Lot 5 (K2) : le menu ⋯ a aussi la section Ordre, après « Envoyer vers… » ;
  // (K3) puis la section Protéger : « Verrouiller » ; (retouches après le
  // lot 5) puis la section Position : les deux quarts de tour
  verifier('Clic droit : le menu complet a ⋯ juste après Couper, avant Supprimer ; son menu : « Copier en image », puis « Envoyer vers… », puis l\'ordre, Verrouiller et les quarts de tour', e.panneau && k > 0 && bt[k - 1].t === 'Couper' && /^Supprimer/.test(bt[k + 1]?.t ?? '')
    && JSON.stringify(mp.map(x => x.t)) === '["Copier en image","Envoyer vers…","Mettre au premier plan","Avancer","Reculer","Mettre à l\'arrière-plan","Verrouiller","Tourner d\'un quart de tour à gauche","Tourner d\'un quart de tour à droite"]', JSON.stringify({ bt, mp }))
  verifier('… son aide : « Déplacer ou copier sur une autre page »', mp[1]?.aide === 'Déplacer ou copier sur une autre page', mp[1])
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  const barre = await page.evaluate(() => [...document.querySelectorAll('.barre-actions button')].map(b => b.textContent))
  verifier('… pas dans la barre d\'actions', !barre.some(t => /Envoyer/.test(t)), JSON.stringify(barre))
  await ouvrirFenetre(page)
  e = await etat(page)
  const f = e.fenetre
  verifier('La fenêtre : « Envoyer les 3 objets vers… »', f?.titre === 'Envoyer les 3 objets vers…', f?.titre)
  verifier('… deux choix : « Déplacer (ils quittent cette page) » (coché), « Copier (ils restent aussi ici) »', JSON.stringify(f?.choix) === JSON.stringify([{ t: 'Déplacer (ils quittent cette page)', c: true }, { t: 'Copier (ils restent aussi ici)', c: false }]), f?.choix)
  verifier('… la liste : Page 1 (cette page) grisée, Page 2, une nouvelle page juste après, à la fin', JSON.stringify(f?.dest.map(d => [d.t, d.dis])) === JSON.stringify([['Page 1 (cette page)', true], ['Page 2', false], ['Une nouvelle page juste après', false], ['Une nouvelle page à la fin', false]]), f?.dest)
  verifier('… une petite vignette devant chaque page', f?.dest.filter(d => d.canevas).length === 2, f?.dest)
  verifier('… le focus sur la page qui suit (Page 2), un seul arrêt de Tab dans la liste', e.focus === p2 && f.dest.filter(d => d.tab === 0).length === 1, { focus: e.focus, tabs: f?.dest.map(d => d.tab) })
  verifier('… la barre d\'actions se cache derrière la fenêtre', await page.evaluate(() => document.querySelector('.barre-actions')?.hidden !== false))
  await page.waitForTimeout(500)
  const v = await vignettesPeintes(page)
  verifier('… les vignettes sont peintes, trieuse fermée (le fond, et l\'encre des traits)', !e.trieuse && v.length === 2 && v.every(x => x.opaque > 1000 && x.encre > 5), v)
  await cliquerDest(page, p2); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Page 2 : la fenêtre se ferme, on reste sur la page 1', !e.fenetre && e.page === p1, e)
  verifier('… les trois traits ont quitté la page 1, la page 2 en a trois de plus (identifiants neufs)', JSON.stringify(e.ids[p1]) === '["reste"]' && e.ids[p2].length === 4 && !['a', 'b', 'c'].some(x => e.ids[p2].includes(x)), e.ids)
  const places = await page.evaluate(p2 => [...window.__app.tableau.formesDe(p2).values()].filter(f => f.id !== 'q').map(f => [f.x, f.y]).sort((a, b) => a[0] - b[0]), p2)
  verifier('… à la même place', JSON.stringify(places) === JSON.stringify([[200, 260], [360, 260], [520, 260]]), places)
  verifier('… la sélection est vide, le menu complet fermé', !e.sel.length && !e.panneau, e)
  verifier('Le message : « 3 objets envoyés vers la page 2 », avec « Aller à la page 2 » et « Annuler »', dernier(e) === '3 objets envoyés vers la page 2' && JSON.stringify(e.actions) === '["Aller à la page 2","Annuler"]', { m: dernier(e), a: e.actions })
  await cliquerAction(page, 'Aller à la page 2')
  e = await etat(page)
  const arrives = e.ids[p2].filter(x => x !== 'q')
  verifier('« Aller à la page 2 » : on y est, ce qui est arrivé est sélectionné', e.page === p2 && JSON.stringify(e.sel) === JSON.stringify(arrives), e)
  verifier('… le message reste, avec « Annuler »', JSON.stringify(e.actions) === '["Annuler"]', e.actions)
  await cliquerAction(page, 'Annuler')
  e = await etat(page)
  verifier('« Annuler » : on revient sur la page 1, les trois traits y sont revenus (mêmes identifiants)', e.page === p1 && JSON.stringify(e.ids[p1]) === '["a","b","c","reste"]', e)
  verifier('… et ont quitté la page 2', JSON.stringify(e.ids[p2]) === '["q"]', e.ids)
  verifier('… message « Envoi annulé : les 3 objets sont revenus de la page 2 »', dernier(e) === 'Envoi annulé : les 3 objets sont revenus de la page 2', dernier(e))
  // Ctrl+Y, Ctrl+Z sur la page de départ
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Y sur la page 1 : ils repartent sur la page 2, le message le dit', JSON.stringify(e.ids[p1]) === '["reste"]' && e.ids[p2].length === 4 && dernier(e) === 'Envoi refait : les 3 objets sont repartis sur la page 2', { ids: e.ids, m: dernier(e) })
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z sur la page 1 : ils reviennent, et quittent la page 2', JSON.stringify(e.ids[p1]) === '["a","b","c","reste"]' && JSON.stringify(e.ids[p2]) === '["q"]' && dernier(e) === 'Envoi annulé : les 3 objets sont revenus de la page 2', { ids: e.ids, m: dernier(e) })
  // De nouveau, puis Ctrl+Z sur la page d'arrivée : rien d'arrivé ne part
  await cadre(page, ['a', 'b', 'c']); await clicDroit(page, 'b'); await ouvrirFenetre(page)
  await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('(Entrée sur la page 2 : envoyés de nouveau)', e.ids[p2].length === 4 && JSON.stringify(e.ids[p1]) === '["reste"]', e.ids)
  await page.keyboard.press('PageDown'); await page.waitForTimeout(150)
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z sur la page 2 : il défait ce qu\'on y avait fait avant (le trait q), jamais ce qui est arrivé', e.page === p2 && e.ids[p2].length === 3 && !e.ids[p2].includes('q'), e.ids)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… encore : « Rien à annuler sur cette page », les trois sont toujours là', e.ids[p2].length === 3 && dernier(e) === 'Rien à annuler sur cette page', { ids: e.ids, m: dernier(e) })
  await page.keyboard.press('Control+y'); await page.waitForTimeout(150)   // q revient
  // Un objet arrivé, déplacé sur la page 2 (à la souris), puis Ctrl+Z sur la page 1
  const arr = (await etat(page)).ids[p2].filter(x => x !== 'q')
  const c0 = await ecranDe(page, arr[0])
  await page.mouse.move(c0.x, c0.y); await page.mouse.down(); await page.mouse.move(c0.x + 60, c0.y + 80, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150)
  const bouge = await page.evaluate(([p, id]) => window.__app.tableau.formesDe(p).get(id).y, [p2, arr[0]])
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('(l\'objet a bougé sur la page 2)', bouge > 270, bouge)
  verifier('Un objet modifié depuis sur la page 2, puis Ctrl+Z sur la page 1 : les trois reviennent, le modifié reste sur la page 2', JSON.stringify(e.ids[p1]) === '["a","b","c","reste"]' && JSON.stringify(e.ids[p2]) === JSON.stringify([arr[0], 'q'].sort()), e.ids)
  verifier('… et le message le dit', dernier(e) === 'Envoi annulé : les 3 objets sont revenus de la page 2 ; 1 objet, modifié depuis sur la page 2, y reste aussi', dernier(e))
  // « Annuler » du message quand la page a changé depuis
  await cadre(page, ['a']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await cliquerDest(page, p2); await page.waitForTimeout(150)
  await page.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'apres', type: 'trait', x: 700, y: 500, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }) })
  await page.waitForTimeout(100)
  await cliquerAction(page, 'Annuler')
  e = await etat(page)
  verifier('« Annuler » quand on a écrit depuis sur la page 1 : rien ne change, « La page a changé depuis : ↶ défait les gestes un à un. »', dernier(e) === 'La page a changé depuis : ↶ défait les gestes un à un.' && !e.ids[p1].includes('a') && e.ids[p1].includes('apres'), { m: dernier(e), ids: e.ids })
  await ctx.close()
}

// =============== 2. Copier ===============
if (faire('copier')) {
  const { ctx, page } = await ouvrir()
  const [p1, p2] = await preparer(page, [['a', 'b'], ['q']])
  await cadre(page, ['a', 'b']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await page.click('dialog.dialogue-envoi[open] input[value="copier"]')
  await cliquerDest(page, p2); await page.waitForTimeout(200)
  let e = await etat(page)
  verifier('Copier : la page 1 ne change pas, la page 2 reçoit deux copies', JSON.stringify(e.ids[p1]) === '["a","b"]' && e.ids[p2].length === 3, e.ids)
  verifier('… la sélection reste, on reste sur la page 1', e.page === p1 && JSON.stringify(e.sel) === '["a","b"]', e)
  verifier('… message « 2 objets copiés sur la page 2 », avec « Aller à la page 2 » et « Annuler »', dernier(e) === '2 objets copiés sur la page 2' && JSON.stringify(e.actions) === '["Aller à la page 2","Annuler"]', { m: dernier(e), a: e.actions })
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z sur la page 1 ne touche pas aux copies (il défait le trait b)', e.ids[p2].length === 3 && JSON.stringify(e.ids[p1]) === '["a"]', e.ids)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(150)
  // Le message a été chassé ? On refait une copie pour avoir son « Annuler »
  await cadre(page, ['a', 'b']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await page.click('dialog.dialogue-envoi[open] input[value="copier"]')
  await cliquerDest(page, p2); await page.waitForTimeout(200)
  e = await etat(page)
  const avant = e.ids[p2].length
  await cliquerAction(page, 'Annuler')
  e = await etat(page)
  verifier('« Annuler » d\'une copie : on arrive d\'abord sur la page 2, et les deux copies en partent', e.page === p2 && e.ids[p2].length === avant - 2 && JSON.stringify(e.ids[p1]) === '["a","b"]', { e, avant })
  verifier('… message « Copie annulée »', dernier(e) === 'Copie annulée', dernier(e))
  // Copier, puis écrire sur la page 2 avant « Annuler » : la page a changé depuis
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  await cadre(page, ['a']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await page.click('dialog.dialogue-envoi[open] input[value="copier"]')
  await cliquerDest(page, p2); await page.waitForTimeout(200)
  await page.evaluate(p2 => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(p2, { id: 'surB', type: 'trait', x: 700, y: 500, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }) }, p2)
  const n2 = (await etat(page)).ids[p2].length
  await cliquerAction(page, 'Annuler')
  e = await etat(page)
  verifier('… la page 2 a changé depuis : on y va, rien ne part, « La page 2 a changé depuis : ↶ y défait les gestes un à un. »', e.page === p2 && e.ids[p2].length === n2 && dernier(e) === 'La page 2 a changé depuis : ↶ y défait les gestes un à un.', { m: dernier(e), n2, ids: e.ids })
  // Un objet seul : au singulier
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  await cadre(page, ['a']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  e = await etat(page)
  verifier('Un objet : « Envoyer l\'objet vers… », « Déplacer (il quitte cette page) », « Copier (il reste aussi ici) »', e.fenetre?.titre === 'Envoyer l\'objet vers…' && e.fenetre.choix[0].t === 'Déplacer (il quitte cette page)' && e.fenetre.choix[1].t === 'Copier (il reste aussi ici)', e.fenetre)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap ferme la fenêtre sans rien envoyer', !e.fenetre && JSON.stringify(e.ids[p1]) === '["a","b"]', e)
  await ctx.close()
}

// =============== 3. Vers une nouvelle page ===============
if (faire('nouvelle')) {
  const { ctx, page } = await ouvrir()
  const [p1, p2, p3] = await preparer(page, [['a', 'b'], ['q'], ['r']])
  await page.evaluate(p1 => window.__app.tableau.changerFond(p1, 'seyes'), p1)
  await page.waitForTimeout(100)
  await cadre(page, ['a']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await cliquerDest(page, 'apres'); await page.waitForTimeout(200)
  let e = await etat(page)
  const n = e.pages[1]
  // (Adapté aux réglages par défaut, retouches après le lot 5 : une nouvelle page est blanche, quel que soit le fond de celle d'où l'on envoie)
  verifier('« Une nouvelle page juste après » : une page de plus, juste après, blanche (la page d\'où l\'on envoie est en Seyès)', e.pages.length === 4 && e.pages[0] === p1 && e.pages[2] === p2 && await page.evaluate(n => window.__app.tableau.fondDe(n), n) === 'blanc' && await page.evaluate(p1 => window.__app.tableau.fondDe(p1), p1) === 'seyes', e.pages)
  verifier('… l\'objet y est, on reste sur la page 1 ; « 1 objet envoyé vers la page 2 »', e.page === p1 && e.ids[n].length === 1 && JSON.stringify(e.ids[p1]) === '["b"]' && dernier(e) === '1 objet envoyé vers la page 2', { e, m: dernier(e) })
  await cliquerAction(page, 'Annuler')
  e = await etat(page)
  verifier('« Annuler » : l\'objet revient, la nouvelle page (vide) est retirée, et pas dans la corbeille', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && JSON.stringify(e.ids[p1]) === '["a","b"]' && await page.evaluate(() => window.__app.tableau.pagesDeLaCorbeille().length) === 0, e)
  verifier('… message « Envoi annulé : l\'objet est revenu ; la nouvelle page 2, vide, est retirée »', dernier(e) === 'Envoi annulé : l\'objet est revenu ; la nouvelle page 2, vide, est retirée', dernier(e))
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Y : la nouvelle page revient à sa place avec l\'objet', JSON.stringify(e.pages) === JSON.stringify([p1, n, p2, p3]) && e.ids[n].length === 1 && dernier(e) === 'Envoi refait : l\'objet est reparti sur la nouvelle page 2', { e, m: dernier(e) })
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  await cadre(page, ['a', 'b']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await cliquerDest(page, 'fin'); await page.waitForTimeout(200)
  e = await etat(page)
  const fin = e.pages[3]
  verifier('« Une nouvelle page à la fin » : la page 4, blanche, avec les deux objets ; « 2 objets envoyés vers la page 4 »', e.pages.length === 4 && e.ids[fin].length === 2 && await page.evaluate(n => window.__app.tableau.fondDe(n), fin) === 'blanc' && dernier(e) === '2 objets envoyés vers la page 4' && e.page === p1, { e, m: dernier(e) })
  await cliquerAction(page, 'Aller à la page 4')
  e = await etat(page)
  const vue = await page.evaluate(() => { const a = window.__app; return a.formes.every(f => { const b = a.rendu.boite(f), p = a.cam.versEcran(b.x, b.y), r = a.ui.zoneLibre(); return p.x >= r.x - 1 && p.y >= r.y - 1 && p.x <= r.x + r.l && p.y <= r.y + r.h }) })
  verifier('« Aller à la page 4 » : on y est, les deux objets sélectionnés et visibles', e.page === fin && e.sel.length === 2 && vue, { e, vue })
  await ctx.close()
}

// =============== 4. Au doigt : la barre d'actions, « Options », la fenêtre ===============
if (faire('doigt')) {
  const { ctx, page, cdp } = await ouvrir({ hasTouch: true, isMobile: false }, 'doigt')
  const [p1, p2] = await preparer(page, [['a', 'b'], ['q']])
  const toucher = async (x, y) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 }] })
    await pause(40)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(400)
  }
  const ca = await ecranDe(page, 'a')
  await toucher(ca.x, ca.y)
  let e = await etat(page)
  verifier('(au doigt, à la Sélection : le trait a est pris)', JSON.stringify(e.sel) === '["a"]', e.sel)
  const opt = await page.evaluate(() => { const b = [...document.querySelectorAll('.barre-actions button')].find(x => x.querySelector('.libelle')?.textContent === 'Options'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  verifier('La barre d\'actions a « Options »', !!opt)
  if (opt) await toucher(opt.x, opt.y)
  e = await etat(page)
  verifier('« Options » au doigt : le menu complet', e.panneau, e)
  const plus = await page.evaluate(() => { const b = document.querySelector('.panneau-forme .ligne button.plus'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (plus) await toucher(plus.x, plus.y)
  const env = await page.evaluate(() => { const b = [...document.querySelectorAll('.menu-plus:not([hidden]) .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Envoyer vers…'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height } })
  if (env) await toucher(env.x, env.y)
  e = await etat(page)
  verifier('⋯ puis « Envoyer vers… » au doigt : la fenêtre s\'ouvre', !!e.fenetre, e)
  const d2 = await page.evaluate(p2 => { const b = document.querySelector(`dialog.dialogue-envoi[open] .destination[data-cible="${p2}"]`); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: r.height } }, p2)
  verifier('… ses destinations sont de grands boutons (52 px au moins)', (d2?.h ?? 0) >= 52, d2)
  if (d2) await toucher(d2.x, d2.y)
  e = await etat(page)
  verifier('Toucher « Page 2 » : envoyé, on reste sur la page 1, le message le dit', !e.fenetre && e.page === p1 && JSON.stringify(e.ids[p1]) === '["b"]' && e.ids[p2].length === 2 && dernier(e) === '1 objet envoyé vers la page 2', { e, m: dernier(e) })
  await ctx.close()
}

// =============== 5. À la tablette graphique : le bouton latéral ===============
if (faire('wacom')) {
  const { ctx, page, cdp } = await ouvrir({}, 'wacom')
  const [p1, p2] = await preparer(page, [['a', 'b'], ['q']])
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  const taper = async (x, y) => { await stylet.survol(x, y); await stylet.bas(x, y); await pause(40); await stylet.haut(x, y); await page.waitForTimeout(150) }
  const info = await page.evaluate(() => navigator.maxTouchPoints)
  const ca = await ecranDe(page, 'a')
  await taper(ca.x, ca.y)
  let e = await etat(page)
  verifier('(au stylet, écran non tactile : le trait a est pris)', info === 0 && JSON.stringify(e.sel) === '["a"]', { info, sel: e.sel })
  await stylet.survol(ca.x, ca.y)
  await stylet.bas(ca.x, ca.y, { button: 'right', buttons: 2 }); await page.waitForTimeout(80)
  await stylet.haut(ca.x, ca.y, { button: 'right' }); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Bouton latéral du stylet sur la sélection : le menu complet', e.panneau && JSON.stringify(e.sel) === '["a"]', e)
  const plus = await page.evaluate(() => { const b = document.querySelector('.panneau-forme .ligne button.plus'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (plus) await taper(plus.x, plus.y)
  const env = await page.evaluate(() => { const b = [...document.querySelectorAll('.menu-plus:not([hidden]) .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === 'Envoyer vers…'); if (!b) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (env) await taper(env.x, env.y)
  e = await etat(page)
  verifier('⋯ puis « Envoyer vers… » au stylet : la fenêtre', !!e.fenetre, e)
  const fin = await page.evaluate(() => { const b = document.querySelector('dialog.dialogue-envoi[open] .destination[data-cible="fin"]'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await taper(fin.x, fin.y)
  e = await etat(page)
  verifier('« Une nouvelle page à la fin » au stylet : la page 3, avec l\'objet ; on reste sur la page 1', e.pages.length === 3 && e.ids[e.pages[2]].length === 1 && e.page === p1 && dernier(e) === '1 objet envoyé vers la page 3', { e, m: dernier(e) })
  await ctx.close()
}

// =============== 6. Au clavier ===============
if (faire('clavier')) {
  const { ctx, page } = await ouvrir({}, 'clavier')
  const [p1, p2] = await preparer(page, [['a', 'b'], ['q'], ['r']])
  await page.mouse.move(900, 600)
  await page.keyboard.press('Control+a'); await page.waitForTimeout(100)
  await page.keyboard.press('ContextMenu'); await page.waitForTimeout(150)
  let e = await etat(page)
  verifier('(Ctrl+A puis la touche Menu : le menu complet des deux objets)', e.panneau && e.sel.length === 2, e)
  let vu = ''
  for (let i = 0; i < 20 && !/^Plus :/.test(vu); i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(30); vu = (await etat(page)).focus }
  await page.keyboard.press('Enter'); await page.waitForTimeout(120)
  const vu1 = (await etat(page)).focus
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40)
  const vu2 = (await etat(page)).focus
  verifier('Tab mène à ⋯ ; Entrée ouvre son menu (sur « Copier en image ») ; ↓ mène à « Envoyer vers… »', /^Plus :/.test(vu) && /^Copier en image/.test(vu1) && /^Envoyer vers…/.test(vu2), [vu, vu1, vu2])
  await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Entrée : la fenêtre, le focus sur la page 2', !!e.fenetre && e.focus === p2, { f: !!e.fenetre, focus: e.focus })
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40)
  const f1 = (await etat(page)).focus
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40)
  const f2 = (await etat(page)).focus
  await page.keyboard.press('End'); await page.waitForTimeout(40)
  const f3 = (await etat(page)).focus
  await page.keyboard.press('Home'); await page.waitForTimeout(40)
  const f4 = (await etat(page)).focus
  verifier('… ↓ : page 3, puis « juste après » ; Fin : « à la fin » ; Début : la page 2 (la page 1, grisée, est sautée)', f1 === e.pages[2] && f2 === 'apres' && f3 === 'fin' && f4 === p2, [f1, f2, f3, f4])
  await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(40)
  const g1 = await page.evaluate(() => document.activeElement?.value)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40)
  const g2 = await page.evaluate(() => document.querySelector('dialog.dialogue-envoi[open] input[value="copier"]').checked)
  await page.keyboard.press('ArrowUp'); await page.waitForTimeout(40)
  await page.keyboard.press('Tab'); await page.waitForTimeout(40)
  const g3 = (await etat(page)).focus
  await page.keyboard.press('Tab'); await page.waitForTimeout(40)
  const g4 = (await etat(page)).focus
  verifier('… Maj+Tab : les deux choix (flèches) ; Tab : la liste (la page gardée), puis « Annuler »', g1 === 'deplacer' && g2 === true && g3 === p2 && g4 === 'Annuler', [g1, g2, g3, g4])
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap ferme, rien n\'est envoyé', !e.fenetre && JSON.stringify(e.ids[p1]) === '["a","b"]', e)
  await page.mouse.move(900, 600)
  await page.keyboard.press('ContextMenu'); await page.waitForTimeout(150)
  vu = ''
  for (let i = 0; i < 20 && !/^Plus :/.test(vu); i++) { await page.keyboard.press('Tab'); await page.waitForTimeout(30); vu = (await etat(page)).focus }
  await page.keyboard.press('Enter'); await page.waitForTimeout(120)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(40)
  await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Entrée sur la page 2 : les deux objets y partent, « 2 objets envoyés vers la page 2 »', JSON.stringify(e.ids[p1]) === '[]' && e.ids[p2].length === 3 && dernier(e) === '2 objets envoyés vers la page 2', { e, m: dernier(e) })
  await ctx.close()
}

// =============== 7. Noms et figures ===============
if (faire('noms')) {
  const { ctx, page } = await ouvrir({}, 'noms')
  const r = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau
    const tri = (x, id) => ({ ...a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y: 200 }, { x: x + 160, y: 200 }, { x, y: 320 }] }), id, sommets: true, noms: ['A', 'B', 'C'] })
    t.nouveauGeste(); t.poser(a.page, tri(200, 'abc'))
    a.nouvellePage()
    t.nouveauGeste(); t.poser(a.page, tri(600, 'deja'))
    const p2 = a.page
    a.allerPage(a.pages[0]); a.choisirOutil('selection')
    a.selection.add('abc'); a.ui.maj()
    a.envoyerSelection(p2, false)
    const arrive = [...t.formesDe(p2).values()].find(f => f.id !== 'deja')
    return { noms: arrive?.noms, deja: t.formesDe(p2).get('deja').noms, depart: t.formesDe(a.page).get('abc').noms }
  })
  verifier('Un triangle ABC copié vers une page qui a déjà ABC devient DEF ; l\'original garde ABC', JSON.stringify(r.noms) === '["D","E","F"]' && JSON.stringify(r.deja) === '["A","B","C"]' && JSON.stringify(r.depart) === '["A","B","C"]', r)
  await ctx.close()
}

// =============== 8. La revue et le film élève ===============
if (faire('revue')) {
  const { ctx, page } = await ouvrir({}, 'revue')
  const [p1, p2] = await preparer(page, [['a', 'b', 'c'], ['q']])
  await page.waitForTimeout(300)
  const compter = () => page.evaluate(async ([p1, p2]) => {
    const { compterGestes } = await import('/src/revue/bande.ts')
    const { lectureDe } = await import('/src/revue/planches.ts')
    const t = window.__app.tableau, l = lectureDe(t, () => t.ordre.toArray())
    return [compterGestes(l, { genre: 'page', page: p1 }), compterGestes(l, { genre: 'page', page: p2 })]
  }, [p1, p2])
  const g0 = await compter()
  await cadre(page, ['a', 'b']); await clicDroit(page, 'a'); await ouvrirFenetre(page)
  await cliquerDest(page, p2); await page.waitForTimeout(400)
  const g1 = await compter()
  verifier('La revue : un geste de plus sur la page de départ et sur la page d\'arrivée', g1[0] === g0[0] + 1 && g1[1] === g0[1] + 1, { g0, g1 })
  const REVUE = () => { const r = window.__revue, b = r.bande; return { total: b.total, page: b.portion.page, ids: r.rendu.formes.map(f => f.id).sort() } }
  const ouvrirRevue = async () => { await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300) }
  const fermerRevue = async () => { for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) } }
  await ouvrirRevue()
  let r = await page.evaluate(REVUE)
  verifier('La revue de la page 1 : ses gestes, et finit sur ce qui y reste', r.page === p1 && r.total === g1[0] && JSON.stringify(r.ids) === '["c"]', r)
  await fermerRevue()
  await page.keyboard.press('PageDown'); await page.waitForTimeout(150)
  await ouvrirRevue()
  r = await page.evaluate(REVUE)
  verifier('La revue de la page 2 : l\'arrivée est un geste, elle finit avec les objets arrivés', r.page === p2 && r.total === g1[1] && r.ids.length === 3, r)
  await fermerRevue()
  await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
  const [ap] = await Promise.all([ctx.waitForEvent('page'), page.click('.p-apercu')])
  surveiller(ap, 'apercu')
  await ap.waitForSelector('.carte h1', { timeout: 8000 })
  await ap.waitForFunction(() => window.__revoir?.bobine)
  const lu = await ap.evaluate(() => {
    const b = window.__revoir.bobine
    return { n: b.n, pages: b.film.ordre.length, fin: b.film.ordre.map(p => b.image(b.n - 1).formes ? null : p), dernieres: b.film.etapes.slice(-2).map(e => e.o.map(o => o[0]).join('')) }
  })
  verifier('« Voir comme un élève » de la séance : sans erreur ; l\'arrivée sur la page 2, puis le départ de la page 1', lu.pages === 2 && lu.dernieres[0] === '==' && lu.dernieres[1] === '--', lu)
  await ap.close()
  await page.focus('.p-titre'); await page.keyboard.press('Escape').catch(() => {})
  await ctx.close()
}

// =============== 9. Au téléphone ===============
if (faire('telephone')) {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'telephone')
  const traits = [['a']]
  for (let k = 1; k < 14; k++) traits.push(['t' + k])
  await preparer(page, traits)
  await page.evaluate(() => { const a = window.__app; a.selection.add('a'); a.options = 'a'; a.ui.maj() })
  await page.waitForTimeout(150)
  await page.evaluate(() => window.__app.ui.ouvrirEnvoi())
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const d = document.querySelector('dialog.dialogue-envoi[open]'), l = d.querySelector('.envoi-liste')
    const rd = d.getBoundingClientRect()
    return { w: rd.width, l: rd.left, r: rd.right, t: rd.top, b: rd.bottom, defile: l.scrollHeight > l.clientHeight + 10, page: document.documentElement.scrollWidth }
  })
  verifier('Téléphone : la fenêtre presque pleine largeur, dans l\'écran', r.w >= 370 && r.l >= 0 && r.r <= 390 && r.t >= 0 && r.b <= 844 && r.page <= 390, r)
  verifier('… la liste des 14 pages défile', r.defile, r)
  await page.click('dialog.dialogue-envoi[open] .destination[data-cible="fin"]')
  await page.waitForTimeout(200)
  const e = await etat(page)
  verifier('… « Une nouvelle page à la fin » : la page 15, avec l\'objet', e.pages.length === 15 && e.ids[e.pages[14]].length === 1, e.pages.length)
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
