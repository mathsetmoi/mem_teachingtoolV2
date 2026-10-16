// Essais au navigateur du morceau P5 du lot 3 : la trieuse des pages (vue
// d'ensemble en vignettes, plein écran). L'ouvrir (le compteur, Maj + P, le
// menu de la page), aller à une page (clic, Entrée, toucher, numéro tapé),
// réordonner (souris, tablette graphique, doigt par appui long et par la
// poignée, clavier), le défilement au bord, Échap pendant un glisser,
// annuler (Ctrl+Z, Ctrl+Y, « Annuler » du message), le tableau caché qui ne
// change jamais, le programme de construction, le focus rendu au compteur,
// les textes, la performance (60 pages de 300 traits), le téléphone et le TNI.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node P5-trieuse.mjs [section…] : seulement ces sections (souris, wacom,
// doigt, bord, tableau, perf, tailles)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/p5/navigateur`
mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
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

async function ouvrir(o = {}, nom = 'page', init) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  if (init) await page.addInitScript(init)
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

/** n pages, un trait (et le numéro de la page écrit en formule) sur chacune ;
 *  noms : { indice: nom } ; on regarde la page `ici` (indice) */
const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: k % 2 ? '#d64545' : '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici })

const ETAT = () => {
  const a = window.__app, t = a.tableau, tr = document.querySelector('.trieuse')
  const act = document.activeElement
  return {
    ouverte: !!tr && !tr.hidden, enTrieuse: document.body.classList.contains('en-trieuse'),
    cartes: [...document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')].map(c => c.dataset.page),
    numeros: [...document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome) .carte-numero')].map(c => c.textContent),
    focus: act?.getAttribute?.('aria-label') ?? null, focusPage: act?.dataset?.page ?? null, focusRang: act === document.querySelector('.rang'),
    page: a.page, pages: a.pages.slice(), n: a.formes.length, film: t.film.length, outil: a.outil,
    msgs: (window.__msgs || []).slice(),
    toast: [...document.querySelector('.toast').children].map(l => l.textContent).join(' | '),
    toastVisible: document.querySelector('.toast').classList.contains('visible'),
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
    fantome: !!document.querySelector('.trieuse-fantome'), barre: !!document.querySelector('.trieuse-place'),
    tiree: document.querySelectorAll('.carte.tiree').length,
    defilement: document.querySelector('.trieuse-grille')?.scrollTop ?? 0,
    annonce: !document.querySelector('.annonce-page').hidden,
    zoneInerte: document.getElementById('zone').inert,
    barreActions: !!document.querySelector('.barre-actions') && !document.querySelector('.barre-actions').hidden,
    aide: document.querySelector('.trieuse-aide')?.textContent,
    compte: document.querySelector('.trieuse-compte')?.textContent,
  }
}
const etat = page => page.evaluate(ETAT)
/** Le centre de la carte i (ou d'un point de la carte : fx, fy de 0 à 1) */
const carte = (page, i, fx = 0.5, fy = 0.5) => page.evaluate(([i, fx, fy]) => {
  const c = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')[i]
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.left + r.width * fx, y: r.top + r.height * fy, l: r.width, h: r.height, top: r.top, left: r.left }
}, [i, fx, fy])
const poignee = (page, i) => page.evaluate(i => {
  const p = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome) .carte-poignee')[i], r = p.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, vue: getComputedStyle(p).display !== 'none' && r.width >= 44 }
}, i)
/** L'endroit entre deux cartes de la même ligne : juste avant la carte i */
const avantCarte = async (page, i) => { const c = await carte(page, i); return { x: c.left - 8, y: c.y } }
async function glisserSouris(page, de, vers, pas = 12) {
  await page.mouse.move(de.x, de.y); await page.mouse.down()
  for (let k = 1; k <= pas; k++) await page.mouse.move(de.x + (vers.x - de.x) * k / pas, de.y + (vers.y - de.y) * k / pas)
  await page.waitForTimeout(60)
  await page.mouse.up(); await page.waitForTimeout(150)
}
const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)
const attendreFermee = page => page.waitForFunction(() => document.querySelector('.trieuse')?.hidden, null, { timeout: 3000 }).then(() => true, () => false)
const TEXTES = () => document.body.innerText + [...document.querySelectorAll('[title],[aria-label]')].map(e => e.title + ' ' + e.getAttribute('aria-label')).join(' ')
const AIDE_SOURIS = 'Cliquer sur une page pour y aller · la glisser pour la déplacer · taper son numéro · Échap : fermer'
const AIDE_DOIGT = 'Toucher une page pour y aller · la déplacer par ⋮⋮ ou par un appui long · × : fermer'
/** Les pixels d'un canevas de vignette : combien ne sont pas blancs (sur 1 sur 4) */
const pixelsNonBlancs = (page, i) => page.evaluate(i => {
  const c = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome) canvas')[i]
  if (!c) return -1
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0
  for (let k = 0; k < d.length; k += 16) if (d[k + 3] > 0 && (d[k] < 200 || d[k + 1] < 200)) n++
  return n
}, i)

// =============== 1. À la souris et au clavier ===============
if (faire('souris')) {
  const { ctx, page } = await ouvrir({}, 'souris')
  const P = await preparer(page, 12, { noms: { 2: 'Exercice 12 p. 84' }, ici: 4 })
  await page.waitForTimeout(300)
  let e = await etat(page)
  verifier('Le compteur est un bouton, « 5 / 12 », qui annonce la trieuse', await page.evaluate(() => { const r = document.querySelector('.rang'); return r.tagName === 'BUTTON' && r.type === 'button' && r.textContent === '5 / 12' && r.title === 'Toutes les pages (Maj + P)' && r.getAttribute('aria-label') === 'Page 5 sur 12 : toutes les pages (Maj + P)' }))

  // Ouvrir par le compteur, à la souris
  await page.click('.rang'); const ouverte = await attendreOuverte(page); await page.waitForTimeout(400)
  e = await etat(page)
  verifier('Le compteur (souris) ouvre la trieuse : body.en-trieuse, le tableau inerte, la barre d\'actions cachée', ouverte && e.enTrieuse && e.zoneInerte && !e.barreActions, e)
  verifier('Une carte par page, dans l\'ordre, numérotées 1 à 12 ; « 12 pages »', JSON.stringify(e.cartes) === JSON.stringify(P) && e.numeros.join(',') === '1,2,3,4,5,6,7,8,9,10,11,12' && e.compte.replace(/\u00a0/g, ' ') === '12 pages', { P, cartes: e.cartes, n: e.numeros.join(','), c: e.compte })
  verifier('Le focus est sur la carte de la page actuelle (« Page 5, page actuelle »)', e.focus === 'Page 5, page actuelle' && e.focusPage === P[4], e.focus)
  const sem = await page.evaluate(() => {
    const t = document.querySelector('.trieuse'), g = document.querySelector('.trieuse-grille'), c = [...document.querySelectorAll('.trieuse .carte')]
    const tab0 = c.filter(x => x.tabIndex === 0).length
    const h = t.querySelector('.trieuse-tete'), f = t.querySelector('.trieuse-fermer')
    return { section: t.tagName, role: t.getAttribute('role'), modal: t.getAttribute('aria-modal'), label: t.getAttribute('aria-label'), z: getComputedStyle(t).zIndex,
      grille: g.getAttribute('role'), gl: g.getAttribute('aria-label'), multi: g.getAttribute('aria-multiselectable'), options: c.every(x => x.getAttribute('role') === 'option'), tab0,
      titre: h.querySelector('h2')?.textContent, actions: !!t.querySelector('.trieuse-actions'), fermer: f?.getAttribute('aria-label'), fermerTitre: f?.title,
      nom3: c[2].getAttribute('aria-label'), nomTexte3: c[2].querySelector('.carte-nom').textContent, cible: Math.min(...c.map(x => x.getBoundingClientRect().height)), fermerH: f.getBoundingClientRect().height,
      actuelle: c[4].classList.contains('actuelle'), bord: getComputedStyle(c[4].querySelector('.carte-image')).borderColor, ombre: getComputedStyle(c[4].querySelector('.carte-image')).boxShadow }
  })
  verifier('La section : role dialog, aria-modal, « Pages », z-index 21 ; la grille : listbox « Les pages, dans l\'ordre », multiselectable ; des options, un seul arrêt de Tab',
    sem.section === 'SECTION' && sem.role === 'dialog' && sem.modal === 'true' && sem.label === 'Pages' && sem.z === '21' && sem.grille === 'listbox' && sem.gl === 'Les pages, dans l\'ordre' && sem.multi === 'true' && sem.options && sem.tab0 === 1, sem)
  verifier('Le bandeau : « Pages », le conteneur d\'actions, « Fermer les pages » (Échap) ; cibles de 44 px au moins',
    sem.titre === 'Pages' && sem.actions && sem.fermer === 'Fermer les pages' && sem.fermerTitre === 'Fermer les pages (Échap)' && sem.cible >= 44 && sem.fermerH >= 44, sem)
  verifier('Le nom de la page 3 sous sa vignette et dans son nom (« Page 3, Exercice 12 p. 84 ») ; la page actuelle encadrée de bleu',
    sem.nom3 === 'Page 3, Exercice 12 p. 84' && sem.nomTexte3 === 'Exercice 12 p. 84' && sem.actuelle && sem.bord === 'rgb(59, 111, 182)' && /59, 111, 182/.test(sem.ombre), sem)
  verifier('L\'aide, à la souris : « Cliquer sur une page pour y aller · … · Échap : fermer »', e.aide === AIDE_SOURIS, e.aide)
  await page.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].every(c => c.dataset.peinte), null, { timeout: 5000 }).catch(() => {})
  const px = [await pixelsNonBlancs(page, 0), await pixelsNonBlancs(page, 4), await pixelsNonBlancs(page, 11)]
  verifier('Les vignettes ne sont pas blanches (le trait et le quadrillage de chaque page)', px.every(n => n > 50), px)
  const poi = await poignee(page, 0)
  verifier('Sans écran tactile : pas de poignée ⋮⋮, les cartes en touch-action: none (la tablette graphique tire la page)',
    !poi.vue && await page.evaluate(() => document.querySelector('.trieuse').classList.contains('sans-tactile') && getComputedStyle(document.querySelector('.trieuse .carte')).touchAction === 'none'), poi)
  await page.screenshot({ path: D + '/1-ouverte.png' })

  // Échap ferme ; ouverte à la souris, le focus ne va pas au compteur
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap ferme la trieuse : plus d\'en-trieuse, plus rien d\'inerte, les vignettes ôtées du document', !e.ouverte && !e.enTrieuse && !e.zoneInerte && e.cartes.length === 0 && e.page === P[4], e)

  // Maj + P (clavier) ; P seul reste le Stylo, Maj + P ne le choisit pas
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Maj + P ouvre la trieuse, sans choisir le Stylo', e.ouverte && e.outil === 'selection' && e.focusPage === P[4], e)
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Maj + P la referme ; ouverte au clavier, elle rend le focus au compteur', !e.ouverte && e.focusRang && e.outil === 'selection', e)
  await page.evaluate(() => document.activeElement.blur())
  await page.keyboard.press('Shift+P'); await attendreOuverte(page)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap ferme, et le focus revient au compteur (ouverte au clavier)', !e.ouverte && e.focusRang, e)
  // Le compteur au clavier (Entrée) : ouverte, puis fermée, le focus lui revient
  await page.keyboard.press('Enter'); await attendreOuverte(page); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Entrée sur le compteur l\'ouvre aussi', e.ouverte && e.focusPage === P[4], e)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  verifier('… et Échap rend le focus au compteur', (await etat(page)).focusRang)
  await page.evaluate(() => document.activeElement.blur())

  // Le menu de la page : « Toutes les pages… » après « Dupliquer la page »
  const r = await page.evaluate(() => document.getElementById('zone').getBoundingClientRect())
  await page.mouse.click(r.left + 700, r.top + 560, { button: 'right' }); await page.waitForTimeout(150)
  const menu = await page.evaluate(() => {
    const m = document.querySelector('.menu-flottant[aria-label="Page"]')
    return { vu: !m.hidden, enfants: [...m.children].map(c => c.tagName === 'HR' ? '─' : (c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim()),
      touche: [...m.querySelectorAll('.menu-item')].find(b => b.textContent.includes('Toutes les pages'))?.querySelector('.touche')?.textContent }
  })
  verifier('Menu de la page : … · Dupliquer la page · Toutes les pages… (Maj + P)', menu.vu && JSON.stringify(menu.enfants.slice(0, 6)) === JSON.stringify(['Coller ici', 'Tout sélectionner', 'Tout voir', '─', 'Dupliquer la page', 'Toutes les pages…']) && menu.touche === 'Maj + P', menu)
  await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Toutes les pages' }).click(); await attendreOuverte(page); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('« Toutes les pages… » ouvre la trieuse', e.ouverte && e.focusPage === P[4], e)

  // Aller à une page : un clic
  const c2 = await carte(page, 1)
  const n0 = e.n
  await page.mouse.click(c2.x, c2.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Un clic sur une carte : la trieuse se ferme, on est sur la page 2, son numéro s\'annonce', !e.ouverte && e.page === P[1] && e.annonce, e)
  // Un double-clic par habitude : le second clic ne laisse rien sur la page
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const f0 = (await etat(page)).film
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  const c3 = await carte(page, 2)
  await page.mouse.dblclick(c3.x, c3.y); await page.waitForTimeout(700)
  e = await etat(page)
  verifier('Un double-clic sur une carte : on est sur la page 3, et le second clic n\'y écrit rien (au Stylo)', !e.ouverte && e.page === P[2] && e.n === 1 && e.film === f0, { e, f0 })
  await page.evaluate(() => window.__app.choisirOutil('selection'))

  // Entrée, les flèches
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  await page.keyboard.press('ArrowRight'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('→ : le focus passe à la carte suivante (« Page 4 »)', e.focusPage === P[3] && e.focus === 'Page 4', e.focus)
  const colonnes = await page.evaluate(() => { const c = [...document.querySelectorAll('.trieuse .carte')]; const y = c[0].getBoundingClientRect().top; return c.filter(x => Math.abs(x.getBoundingClientRect().top - y) < 2).length })
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier(`↓ : la carte de la ligne d'après, même colonne (${colonnes} colonnes)`, e.focusPage === P[3 + colonnes], { focus: e.focus, colonnes })
  await page.keyboard.press('ArrowUp'); await page.keyboard.press('Home'); await page.waitForTimeout(60)
  verifier('↑ puis Début : la première carte', (await etat(page)).focusPage === P[0])
  await page.keyboard.press('End'); await page.waitForTimeout(60)
  verifier('Fin : la dernière carte', (await etat(page)).focusPage === P[11])
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Entrée : on va à la page qui a le focus (la 11)', !e.ouverte && e.page === P[10], e)

  // Des chiffres : « 1 » puis « 2 » → la page 12, qu'Entrée ouvre ; Maj + 3 (AZERTY) → la page 3
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  await page.keyboard.down('Shift'); await page.keyboard.press('Digit3'); await page.keyboard.up('Shift'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('Maj + 3 (le chiffre du haut en AZERTY) : le focus va à la carte 3, la trieuse reste ouverte', e.ouverte && e.focusPage === P[2], e.focus)
  await page.waitForTimeout(900)
  await page.keyboard.press('Digit1'); await page.keyboard.press('Digit2'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('« 1 » puis « 2 » (moins de 800 ms) : le focus va à la carte 12', e.focusPage === P[11], e.focus)
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… et Entrée ouvre la page 12', !e.ouverte && e.page === P[11], e)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  await page.keyboard.press('Numpad9'); await page.waitForTimeout(900)
  await page.keyboard.press('Digit4'); await page.keyboard.press('Digit0'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('Le pavé numérique (9) ; « 40 » avec 12 pages : un message, le focus ne bouge pas de la 4', e.focusPage === P[3] && e.msgs.includes('Pas de page 40 : il y en a 12.'), { f: e.focus, m: e.msgs.slice(-2) })

  // Réordonner à la souris : la carte 1 entre la 3 et la 4
  await page.waitForTimeout(900)
  const film0 = (await etat(page)).film, pageAvant = (await etat(page)).page
  let de = await carte(page, 0), vers = await avantCarte(page, 3)
  await glisserSouris(page, de, vers)
  e = await etat(page)
  const attendu = [P[1], P[2], P[0], ...P.slice(3)]
  verifier('Glisser la carte 1 entre la 3 et la 4 (souris) : l\'ordre change, les numéros suivent', JSON.stringify(e.pages) === JSON.stringify(attendu) && JSON.stringify(e.cartes) === JSON.stringify(attendu) && e.numeros[2] === '3' && e.ouverte, e)
  verifier('… message « Page déplacée : c\'est maintenant la page 3 » avec « Annuler », le focus sur la page tirée',
    e.msgs.at(-1) === 'Page déplacée : c\'est maintenant la page 3' && e.action.includes('Annuler') && e.focusPage === P[0], e)
  verifier('… sans fantôme ni barre ensuite ; la page qu\'on regardait n\'a pas changé ; le film n\'a que des étapes de l\'ordre',
    !e.fantome && !e.barre && e.tiree === 0 && e.page === pageAvant && await page.evaluate(k => window.__app.tableau.film.toArray().slice(k).every(x => x.seulOrdre), film0), e)
  verifier('… le lâcher ne mène pas à la page (la trieuse reste ouverte)', e.ouverte)
  // Ctrl+Z, Ctrl+Y dans la trieuse
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Z dans la trieuse : l\'ordre revient, « Annulé : page déplacée », le message à « Annuler » s\'en va', JSON.stringify(e.pages) === JSON.stringify(P) && e.msgs.at(-1) === 'Annulé : page déplacée' && !e.action.length && e.ouverte, e)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Y le refait : « Rétabli : page déplacée »', JSON.stringify(e.pages) === JSON.stringify(attendu) && e.msgs.at(-1) === 'Rétabli : page déplacée', e)
  await page.keyboard.press('Control+Shift+Z'); await page.waitForTimeout(80)
  verifier('Ctrl + Maj + Z rétablit aussi (rien à rétablir : il le dit)', (await etat(page)).msgs.at(-1) === 'Rien à rétablir dans les pages')
  await page.keyboard.press('Control+z'); await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Z deux fois : l\'ordre d\'origine, puis « Rien à annuler dans les pages »', JSON.stringify(e.pages) === JSON.stringify(P) && e.msgs.at(-1) === 'Rien à annuler dans les pages', e.msgs.slice(-3))
  // « Annuler » du message
  de = await carte(page, 5); vers = await carte(page, 1, 0.2, 0.5)
  await glisserSouris(page, de, vers)
  e = await etat(page)
  const attendu2 = [P[0], P[5], P[1], P[2], P[3], P[4], ...P.slice(6)]
  verifier('Glisser la carte 6 sur la gauche de la carte 2 : elle devient la page 2', JSON.stringify(e.pages) === JSON.stringify(attendu2) && e.msgs.at(-1) === 'Page déplacée : c\'est maintenant la page 2', e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('« Annuler » du message : l\'ordre revient, « Annulé : page déplacée »', JSON.stringify(e.pages) === JSON.stringify(P) && e.msgs.at(-1) === 'Annulé : page déplacée' && e.ouverte, e)
  // Échap pendant un glisser : rien ne bouge
  de = await carte(page, 0); vers = await carte(page, 7)
  await page.mouse.move(de.x, de.y); await page.mouse.down()
  for (let k = 1; k <= 8; k++) await page.mouse.move(de.x + (vers.x - de.x) * k / 8, de.y + (vers.y - de.y) * k / 8)
  const pendant = await etat(page)
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  const apresEchap = await etat(page)
  await page.mouse.up(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Pendant un glisser : la carte s\'estompe, un fantôme suit, une barre marque la place', pendant.fantome && pendant.barre && pendant.tiree === 1, pendant)
  verifier('Échap pendant un glisser : le glisser s\'arrête, la trieuse reste ouverte ; au lâcher rien ne bouge (ni page ouverte)',
    !apresEchap.fantome && apresEchap.ouverte && e.ouverte && JSON.stringify(e.pages) === JSON.stringify(P) && e.tiree === 0, { apresEchap, e })
  // Un glisser parti du vide de la grille ne fait rien
  const vide = await page.evaluate(() => { const c = [...document.querySelectorAll('.trieuse .carte')].at(-1).getBoundingClientRect(); return { x: c.right + 60, y: c.top + 30 } })
  await glisserSouris(page, vide, await carte(page, 0))
  e = await etat(page)
  verifier('Un glisser parti du vide de la grille ne fait rien (ni ordre, ni cadre, ni page)', e.ouverte && JSON.stringify(e.pages) === JSON.stringify(P) && !e.fantome, e)
  // Ctrl + Maj + → / ← : la page qui a le focus d'une place
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(50)
  await page.keyboard.press('Control+Shift+ArrowRight'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl + Maj + → : la page 2 devient la 3 ; le focus la suit ; message avec « Annuler »',
    e.pages[2] === P[1] && e.pages[1] === P[2] && e.focusPage === P[1] && e.msgs.at(-1) === 'Page déplacée : c\'est maintenant la page 3' && e.action.includes('Annuler'), e)
  await page.keyboard.press('Control+Shift+ArrowLeft'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl + Maj + ← la ramène', JSON.stringify(e.pages) === JSON.stringify(P) && e.focusPage === P[1], e)
  await page.keyboard.press('Home'); await page.keyboard.press('Control+Shift+ArrowLeft'); await page.waitForTimeout(80)
  verifier('… sur la première : « C\'est déjà la première page. »', (await etat(page)).msgs.at(-1) === 'C\'est déjà la première page.')
  // La fermeture vide le journal et ôte son « Annuler »
  await page.keyboard.press('Control+Shift+ArrowRight'); await page.waitForTimeout(80)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Fermée : le dernier « Annuler » de la trieuse s\'en va, l\'ordre reste celui laissé', !e.ouverte && !e.action.length && e.pages[1] === P[1] === false && e.pages[0] === P[1], e)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(100)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Rouverte : son journal est vide (« Rien à annuler dans les pages »)', e.msgs.at(-1) === 'Rien à annuler dans les pages' && e.pages[0] === P[1], e.msgs.slice(-2))
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)

  // Rien n'écrit sur le tableau caché : les lettres, Ctrl+Z, Ctrl+V, Suppr
  await page.evaluate(p => window.__app.allerPage(p), P[0]); await page.waitForTimeout(100)
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add(a.formes[0].id); a.ui.maj() })
  await page.keyboard.press('Control+c'); await page.waitForTimeout(150)
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  const avant = await etat(page)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(100)
  // (Adapté au morceau P6 : Suppr, Retour arrière, Ctrl + A et Ctrl + D agissent
  // désormais sur les pages dans la trieuse — supprimer, choisir, dupliquer,
  // voir P6-trieuse-actions.mjs — ; ils ne sont plus de cette liste.)
  for (const k of ['e', 'x', 'l', 'p', 'f', 'Control+z', 'Control+v', 'PageDown', 'Control+Shift+D']) { await page.keyboard.press(k); await page.waitForTimeout(40) }
  await page.waitForTimeout(400)
  e = await etat(page)
  verifier('Trieuse ouverte : lettres des outils, Ctrl+Z, Ctrl+V (un objet copié avant), Page↓, Ctrl+Maj+D ne changent ni les formes ni le film ni l\'outil',
    e.ouverte && e.n === avant.n && e.film === avant.film && e.outil === avant.outil && e.page === avant.page && JSON.stringify(e.pages) === JSON.stringify(avant.pages), { avant: [avant.n, avant.film, avant.outil], apres: [e.n, e.film, e.outil] })
  const paste = await page.evaluate(() => { const d = new DataTransfer(); d.setData('text/plain', 'x'); const ev = new ClipboardEvent('paste', { clipboardData: d, bubbles: true, cancelable: true }); window.dispatchEvent(ev); return window.__app.formes.length })
  verifier('… ni un événement « coller » (paste) envoyé à la page', paste === avant.n)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)

  // Le programme de construction ouvert, puis Maj + P : il se ferme ; Espace dans la trieuse ne pose rien
  await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click(); await page.waitForTimeout(150)
  await page.locator('.panneau-construction textarea').fill('Trace un segment [AB] de 6 cm.\nTrace la médiatrice de [AB].')
  await page.evaluate(() => document.activeElement.blur())
  const avantC = await etat(page)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  const ferme = await page.evaluate(() => document.querySelector('.panneau-construction').hidden)
  await page.keyboard.press('Space'); await page.waitForTimeout(80); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(1500)
  e = await etat(page)
  verifier('Programme de construction ouvert, puis Maj + P : il se ferme ; Espace et → dans la trieuse ne posent rien', ferme && e.ouverte && e.n === avantC.n && e.film === avantC.film, { ferme, n: [avantC.n, e.n], film: [avantC.film, e.film] })
  // (Adapté au morceau P6 : Espace choisit désormais la page qui a le focus,
  // et le premier Échap vide la sélection ; le second ferme la trieuse.)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  verifier('… Échap ferme la trieuse seule (le premier vide la page choisie par Espace)', !(await etat(page)).ouverte)

  // Un message à « Annuler » du tableau s'en va à l'ouverture
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(80)
  await page.evaluate(() => window.__app.supprimerPage()); await page.waitForTimeout(100)
  const avantM = await etat(page)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Page N supprimée · Annuler » du tableau s\'en va quand la trieuse s\'ouvre', avantM.action.includes('Annuler') && !e.action.length, { avant: avantM.action, apres: e.action })
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  verifier('… et Ctrl+Z, la trieuse fermée, rend la page', (await etat(page)).msgs.at(-1)?.endsWith('rétablie'))

  // Un placement en attente (désigner un axe, poser une construction) s'annule ; l'outil ne change pas
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('segment'); window.__annule = 0; a.placement = { bouge() {}, clic() {}, annuler() { window.__annule++ } } })
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(100)
  const pl = await page.evaluate(() => ({ placement: !!window.__app.placement, annule: window.__annule, outil: window.__app.outil }))
  verifier('Un placement en attente s\'annule à l\'ouverture, sans changer d\'outil', !pl.placement && pl.annule === 1 && pl.outil === 'segment', pl)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  await page.evaluate(() => { window.__app.choisirOutil('selection'); document.activeElement.blur() })
  // Le menu de la page au clavier (touche Menu), « Toutes les pages… » par Entrée : le focus revient au compteur
  await page.keyboard.press('ContextMenu'); await page.waitForTimeout(150)
  await page.keyboard.press('End'); await page.waitForTimeout(50)
  const fin = await page.evaluate(() => document.activeElement?.textContent ?? '')
  await page.keyboard.press('Enter'); await attendreOuverte(page); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Touche Menu, Fin (« Toutes les pages… »), Entrée : la trieuse s\'ouvre', e.ouverte && fin.startsWith('Toutes les pages'), { fin, ouverte: e.ouverte })
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  verifier('… et Échap rend le focus au compteur', (await etat(page)).focusRang)
  await page.evaluate(() => document.activeElement.blur())

  // Refusée en plein geste et pendant la revue
  const r2 = await page.evaluate(() => document.getElementById('zone').getBoundingClientRect())
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await page.mouse.move(r2.left + 600, r2.top + 400); await page.mouse.down(); await page.mouse.move(r2.left + 640, r2.top + 420)
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(80)
  const enGeste = (await etat(page)).ouverte
  await page.mouse.move(r2.left + 680, r2.top + 400); await page.mouse.up(); await page.waitForTimeout(100)
  verifier('Maj + P en plein trait : la trieuse ne s\'ouvre pas', !enGeste)

  // Les textes
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(100)
  const t1 = await page.evaluate(TEXTES)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  const t2 = await page.evaluate(TEXTES)
  verifier('Aucun texte ne dit « undefined », « NaN » ni « [object Object] » (trieuse ouverte, puis fermée)', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(t1) && !/\bundefined\b|\bNaN\b|\[object Object\]/.test(t2))
  await ctx.close()
}

// =============== 2. À la tablette graphique (stylet sans écran tactile) ===============
if (faire('wacom')) {
  const { ctx, page } = await ouvrir({}, 'wacom')
  const cdp = await ctx.newCDPSession(page)
  const P = await preparer(page, 12, { ici: 0 })
  const plume = (type, x, y, appuye) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' ? (appuye ? 'left' : 'none') : 'left', buttons: appuye ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1, force: appuye ? 0.5 : 0 })
  async function glisserPlume(de, vers, pas = 14) {
    await plume('mouseMoved', de.x, de.y, false)
    await plume('mousePressed', de.x, de.y, true)
    for (let k = 1; k <= pas; k++) await plume('mouseMoved', de.x + (vers.x - de.x) * k / pas, de.y + (vers.y - de.y) * k / pas, true)
    await pause(60)
    await plume('mouseReleased', vers.x, vers.y, false); await pause(150)
  }
  verifier('Tablette graphique : navigator.maxTouchPoints vaut 0', (await page.evaluate(() => navigator.maxTouchPoints)) === 0)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(300)
  // Vers la droite : la carte 1 entre la 3 et la 4
  await glisserPlume(await carte(page, 0), await avantCarte(page, 3))
  let e = await etat(page)
  verifier('Au stylet de la tablette graphique (pen, sans écran tactile), vers la droite : la carte 1 va entre la 3 et la 4, sans appui long',
    JSON.stringify(e.pages) === JSON.stringify([P[1], P[2], P[0], ...P.slice(3)]) && e.ouverte, e)
  verifier('… l\'aide reste celle de la souris (la tablette clique et glisse)', e.aide === AIDE_SOURIS, e.aide)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  // Vers la ligne du dessous : la carte 2 avant la carte de la ligne suivante, même colonne
  const colonnes = await page.evaluate(() => { const c = [...document.querySelectorAll('.trieuse .carte')]; const y = c[0].getBoundingClientRect().top; return c.filter(x => Math.abs(x.getBoundingClientRect().top - y) < 2).length })
  const cible = 1 + colonnes
  await glisserPlume(await carte(page, 1), await carte(page, cible, 0.25, 0.5))
  e = await etat(page)
  const attendu = [...P]; attendu.splice(1, 1); attendu.splice(cible - 1, 0, P[1])
  verifier(`Vers la ligne du dessous (${colonnes} colonnes) : la carte 2 arrive juste avant la carte ${cible + 1} d'avant`, JSON.stringify(e.pages) === JSON.stringify(attendu), { pages: e.pages.map(x => P.indexOf(x) + 1), attendu: attendu.map(x => P.indexOf(x) + 1) })
  // Un tremblement de 4 px au stylet n'est pas un glisser : c'est un clic, qui mène à la page
  const c5 = await carte(page, 4)
  await plume('mouseMoved', c5.x, c5.y, false); await plume('mousePressed', c5.x, c5.y, true)
  await plume('mouseMoved', c5.x + 3, c5.y + 2, true); await plume('mouseReleased', c5.x + 3, c5.y + 2, false); await pause(150)
  e = await etat(page)
  verifier('Une touche de la plume qui tremble de 4 px : un clic, on va à la page', !e.ouverte && e.page === attendu[4], e)
  await ctx.close()
}

// =============== 3. Au doigt (écran tactile) ===============
if (faire('doigt')) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'doigt')
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 4, radiusY: 4, force: 0.5 })) })
  const P = await preparer(page, 30, { ici: 0 })
  verifier('Écran tactile : navigator.maxTouchPoints > 0', (await page.evaluate(() => navigator.maxTouchPoints)) > 0)
  const rang = await page.evaluate(() => { const r = document.querySelector('.rang').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.touchscreen.tap(rang.x, rang.y); const ouverte = await attendreOuverte(page); await page.waitForTimeout(400)
  let e = await etat(page)
  verifier('Un toucher sur le compteur ouvre la trieuse ; l\'aide parle du doigt', ouverte && e.aide === AIDE_DOIGT, e.aide)
  const poi = await poignee(page, 0)
  verifier('Au doigt : la poignée ⋮⋮ se voit (44 px), les cartes en pan-y (le doigt fait défiler)', poi.vue && await page.evaluate(() => getComputedStyle(document.querySelector('.trieuse .carte')).touchAction === 'pan-y' && getComputedStyle(document.querySelector('.carte-poignee')).touchAction === 'none'), poi)
  await page.screenshot({ path: D + '/3-doigt.png' })
  // Un toucher bref : on va à la page
  const c3 = await carte(page, 2)
  await page.touchscreen.tap(c3.x, c3.y); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Un toucher bref sur une carte : on va à la page 3', !e.ouverte && e.page === P[2], e)
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await page.waitForTimeout(300)
  // Appui long, puis glisser : la carte 1 entre la 3 et la 4
  let de = await carte(page, 0), vers = await avantCarte(page, 3)
  await touche('touchStart', [[de.x, de.y]]); await pause(650)
  const leve = await etat(page)
  for (let k = 1; k <= 12; k++) { await touche('touchMove', [[de.x + (vers.x - de.x) * k / 12, de.y + (vers.y - de.y) * k / 12]]); await pause(16) }
  await pause(60); await touche('touchEnd', []); await pause(200)
  e = await etat(page)
  verifier('Appui long (600 ms) : la page se soulève (fantôme), sans menu du navigateur', leve.fantome && leve.tiree === 1, leve)
  verifier('… puis glissée : la carte 1 va entre la 3 et la 4 ; la trieuse reste ouverte', JSON.stringify(e.pages) === JSON.stringify([P[1], P[2], P[0], ...P.slice(3)]) && e.ouverte && !e.fantome, { pages: e.pages.slice(0, 5).map(x => P.indexOf(x) + 1), ouverte: e.ouverte })
  await page.locator('.toast button.action', { hasText: 'Annuler' }).tap(); await page.waitForTimeout(100)
  verifier('« Annuler » du message, touché : l\'ordre revient', JSON.stringify((await etat(page)).pages) === JSON.stringify(P))
  // Par la poignée, sans attendre
  const h = await poignee(page, 0)
  vers = await avantCarte(page, 2)
  await touche('touchStart', [[h.x, h.y]]); await pause(30)
  for (let k = 1; k <= 12; k++) { await touche('touchMove', [[h.x + (vers.x - h.x) * k / 12, h.y + (vers.y - h.y) * k / 12]]); await pause(16) }
  await pause(60); await touche('touchEnd', []); await pause(200)
  e = await etat(page)
  verifier('Par la poignée ⋮⋮, sans appui long : la carte 1 va entre la 2 et la 3', JSON.stringify(e.pages) === JSON.stringify([P[1], P[0], ...P.slice(2)]) && e.ouverte, e.pages.slice(0, 4).map(x => P.indexOf(x) + 1))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  // Un glisser au doigt parti du milieu d'une carte, sans appui long : la grille défile, rien ne bouge
  const d0 = (await etat(page)).defilement
  const c = await carte(page, 9)
  await touche('touchStart', [[c.x, c.y]]); await pause(30)
  for (let k = 1; k <= 16; k++) { await touche('touchMove', [[c.x, c.y - k * 18]]); await pause(16) }
  await touche('touchEnd', []); await pause(500)
  e = await etat(page)
  verifier('Un glisser au doigt parti du milieu d\'une carte, sans appui long : la grille défile, aucune page ne bouge ni ne s\'ouvre',
    e.defilement > d0 + 50 && JSON.stringify(e.pages) === JSON.stringify(P) && e.ouverte && !e.fantome, { d0, d: e.defilement, ouverte: e.ouverte })
  // Le × au doigt
  const x = await page.evaluate(() => { const r = document.querySelector('.trieuse-fermer').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.touchscreen.tap(x.x, x.y); await page.waitForTimeout(150)
  verifier('Le × (« Fermer les pages ») la ferme', !(await etat(page)).ouverte)
  await ctx.close()
}

// =============== 4. Le défilement au bord, 60 pages ===============
if (faire('bord')) {
  const { ctx, page } = await ouvrir({}, 'bord')
  const P = await preparer(page, 60, { ici: 0 })
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(400)
  const g = await page.evaluate(() => { const r = document.querySelector('.trieuse-grille').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right } })
  const de = await carte(page, 0)
  await page.mouse.move(de.x, de.y); await page.mouse.down()
  await page.mouse.move(de.x + 20, de.y + 20, { steps: 3 })
  await page.mouse.move(de.x, g.bottom - 10, { steps: 10 })
  const d1 = (await etat(page)).defilement
  await page.waitForTimeout(1200)
  const d2 = (await etat(page)).defilement
  await page.mouse.move(de.x, (g.top + g.bottom) / 2, { steps: 6 }); await page.waitForTimeout(200)
  const d3 = (await etat(page)).defilement
  await page.waitForTimeout(300)
  const d4 = (await etat(page)).defilement
  await page.mouse.up(); await page.waitForTimeout(200)
  const e = await etat(page)
  const k = e.pages.indexOf(P[0])
  verifier('Tirer une page près du bas de la grille : elle défile seule (plusieurs centaines de px en 1,2 s)', d2 - d1 > 300, { d1, d2 })
  verifier('… et s\'arrête loin du bord', d4 === d3, { d3, d4 })
  verifier(`Lâchée plus bas : la page 1 arrive loin dans l'ordre (page ${k + 1}), le message le dit`, k > 12 && e.msgs.at(-1) === `Page déplacée : c'est maintenant la page ${k + 1}`, { k, m: e.msgs.at(-1) })
  await ctx.close()
}

// =============== 5. Performance : 60 pages de 300 traits ===============
if (faire('perf')) {
  const init = () => {
    window.__longues = []
    try { new PerformanceObserver(l => { for (const x of l.getEntries()) window.__longues.push({ t: x.startTime, d: x.duration }) }).observe({ type: 'longtask', buffered: true }) } catch { /* pas de longtask */ }
  }
  const { ctx, page } = await ouvrir({ viewport: { width: 1366, height: 768 } }, 'perf', init)
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    for (let k = 0; k < 60; k++) {
      const id = k ? t.ajouterPage('carreaux', k) : a.page
      const liste = []
      for (let s = 0; s < 300; s++) {
        const pts = []; const x0 = (s % 20) * 50, y0 = Math.floor(s / 20) * 45
        for (let i = 0; i < 40; i++) pts.push(i * 1.5, Math.sin((i + s + k) / 4) * 12, 0.5)
        liste.push({ id: `p${k}s${s}`, type: 'trait', x: 100 + x0, y: 100 + y0, z: s, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
      }
      t.poserPlusieurs(id, liste)
    }
  })
  await page.waitForTimeout(3000)
  verifier('60 pages de 300 traits posées', (await page.evaluate(() => window.__app.pages.length)) === 60)
  const preparation = await page.evaluate(() => window.__longues.length)
  verifier(`L'observateur des tâches longues marche (la mise en place des 60 pages en a vu ${preparation})`, preparation > 0)
  await page.evaluate(() => { window.__longues = [] })
  const t0 = Date.now()
  await page.keyboard.press('Shift+P'); await attendreOuverte(page)
  const visibles = await page.waitForFunction(() => {
    const g = document.querySelector('.trieuse-grille').getBoundingClientRect()
    const v = [...document.querySelectorAll('.trieuse .carte')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > g.top && r.top < g.bottom })
    return v.length > 0 && v.every(c => c.dataset.peinte)
  }, null, { timeout: 5000, polling: 20 }).then(() => Date.now() - t0, () => null)
  const toutes = await page.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].every(c => c.dataset.peinte), null, { timeout: 8000, polling: 50 }).then(() => Date.now() - t0, () => null)
  verifier(`Les vignettes visibles prêtes en moins de 1,5 s (${visibles} ms)`, visibles !== null && visibles < 1500, visibles)
  verifier(`Toutes les vignettes prêtes en moins de 5 s (${toutes} ms)`, toutes !== null && toutes < 5000, toutes)
  // Tout le défilement de la grille, par la molette
  const g = await page.evaluate(() => { const r = document.querySelector('.trieuse-grille').getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 } })
  await page.mouse.move(g.x, g.y)
  for (let k = 0; k < 40; k++) { await page.mouse.wheel(0, 200); await pause(30) }
  for (let k = 0; k < 40; k++) { await page.mouse.wheel(0, -200); await pause(30) }
  await page.waitForTimeout(300)
  const longues = await page.evaluate(() => window.__longues)
  const max = longues.length ? Math.max(...longues.map(x => x.d)) : 0
  verifier(`À l'ouverture et pendant tout un défilement : aucune tâche longue de plus de 100 ms (${longues.length} tâches de plus de 50 ms, la plus longue ${Math.round(max)} ms)`, max <= 100, longues)
  const px = [await pixelsNonBlancs(page, 0), await pixelsNonBlancs(page, 59)]
  verifier('Les vignettes de pages chargées ne sont pas blanches', px.every(n => n > 50), px)
  await page.screenshot({ path: D + '/5-perf.png' })
  await ctx.close()
}

// =============== 6. Le téléphone, le TNI ===============
if (faire('tailles')) {
  {
    const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'telephone')
    await preparer(page, 9, { noms: { 0: 'Exercice 12 p. 84 : démontrer que le triangle est rectangle' }, ici: 0 })
    const rang = await page.evaluate(() => { const r = document.querySelector('.rang').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await page.waitForTimeout(400)
    const m = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.trieuse .carte')], y = c[0].getBoundingClientRect().top
      const t = document.querySelector('.trieuse').getBoundingClientRect(), f = document.querySelector('.trieuse-fermer').getBoundingClientRect()
      return { colonnes: c.filter(x => Math.abs(x.getBoundingClientRect().top - y) < 2).length, l: Math.round(c[0].getBoundingClientRect().width), scroll: document.documentElement.scrollWidth, grille: document.querySelector('.trieuse-grille').scrollWidth <= document.querySelector('.trieuse-grille').clientWidth,
        dedans: c.every(x => x.getBoundingClientRect().right <= 390 + 0.5), plein: t.width === 390 && t.height === 844, fermer: f.right <= 390 && f.width >= 44 }
    })
    verifier('Téléphone 390 × 844 : deux colonnes, rien ne déborde en largeur, plein écran, le × dans l\'écran', m.colonnes === 2 && m.scroll <= 390 && m.grille && m.dedans && m.plein && m.fermer, m)
    await page.screenshot({ path: D + '/6-telephone.png' })
    await ctx.close()
  }
  {
    const { ctx, page } = await ouvrir({ viewport: { width: 1920, height: 1080 } }, 'tni')
    await preparer(page, 24, { noms: { 3: 'Exercice 12 p. 84' }, ici: 3 })
    await page.click('.rang'); await attendreOuverte(page); await page.waitForTimeout(500)
    const m = await page.evaluate(() => {
      const c = [...document.querySelectorAll('.trieuse .carte')], y = c[0].getBoundingClientRect().top, g = document.querySelector('.trieuse-grille').getBoundingClientRect()
      return { colonnes: c.filter(x => Math.abs(x.getBoundingClientRect().top - y) < 2).length, vues: c.filter(x => { const r = x.getBoundingClientRect(); return r.top >= g.top - 1 && r.bottom <= g.bottom + 1 }).length, scroll: document.documentElement.scrollWidth }
    })
    verifier(`TNI 1920 × 1080 : ${m.colonnes} colonnes, ${m.vues} pages entières d'un coup (15 au moins), rien ne déborde`, m.vues >= 15 && m.scroll <= 1920, m)
    await page.screenshot({ path: D + '/6-tni.png' })
    await ctx.close()
  }
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
