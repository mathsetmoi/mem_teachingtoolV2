// Essais au navigateur du morceau P6 du lot 3 : dans la trieuse des pages,
// plusieurs pages à la fois, le menu d'une vignette, renommer, insérer,
// ajouter, changer le fond, dupliquer (avec l'histoire), supprimer (vers la
// corbeille), et l'annulation de tout cela (Ctrl+Z / Ctrl+Y, « Annuler » du
// message). À la souris (⋯ et clic droit), à la tablette graphique (stylet
// sans écran tactile, son bouton latéral), au doigt (« Choisir plusieurs »,
// ⋯, un toucher), au clavier (F2, Ctrl+D, Suppr, Espace, Ctrl+A, Échap,
// touche Menu) ; ce qu'on retrouve sur le tableau après la fermeture (le
// nom au compteur, la page supprimée que Ctrl+Z rend, la copie sur la même
// vue, son histoire dans la revue) ; le téléphone ; les textes.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node P6-trieuse-actions.mjs [section…] : seulement ces sections (souris,
// wacom, doigt, clavier, tableau, telephone)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/p6/navigateur`
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

/** Relevé des Ctrl + D : leur defaultPrevented, lu après leur passage (avant tout écouteur de l'application) */
const INIT = () => {
  window.__ctrlD = []
  window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') setTimeout(() => window.__ctrlD.push({ cible: e.target?.className ?? '', empeche: e.defaultPrevented })) }, true)
}

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  await page.addInitScript(INIT)
  surveiller(page, nom)
  await page.goto(URL0)
  // (Le serveur de développement recharge parfois la page juste après une
  // modification du code : on attend qu'elle soit prête, deux fois)
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
    await page.waitForTimeout(400)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

/** n pages, un trait sur chacune (sauf les pages `vides`) ; noms : { indice:
 *  nom } ; on regarde la page `ici` (indice) */
const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici, vides }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    if ((vides || []).includes(k)) continue
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: k % 2 ? '#d64545' : '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici, vides: o.vides })

const ETAT = () => {
  const a = window.__app, t = a.tableau, tr = document.querySelector('.trieuse'), m = document.querySelector('.trieuse .menu-vignette')
  const act = document.activeElement
  return {
    ouverte: !!tr && !tr.hidden,
    cartes: [...document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')].map(c => c.dataset.page),
    choisies: [...document.querySelectorAll('.trieuse .carte[aria-selected="true"]')].map(c => c.dataset.page),
    focus: act?.getAttribute?.('aria-label') ?? null, focusPage: act?.dataset?.page ?? null, focusClasse: act?.className ?? '',
    page: a.page, pages: a.pages.slice(), n: a.formes.length, film: t.film.length,
    noms: a.pages.map(p => t.nomDe(p)), fonds: a.pages.map(p => t.fondDe(p)),
    corbeille: t.pagesDeLaCorbeille().map(x => x.id),
    msgs: (window.__msgs || []).slice(),
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
    menu: !!m && !m.hidden, menuLabel: m?.getAttribute('aria-label') ?? null,
    // (Adapté au morceau P7 : « Copier en image », puis « Exporter en PDF… »
    // du morceau P9, s'ajoutent avant Supprimer : la liste se compare sans
    // eux, et leur place se vérifie à part, voir placeDesSorties)
    entrees: m ? [...m.children].map(c => c.tagName === 'HR' ? '─' : c.classList.contains('menu-titre') ? '#' + c.textContent : (c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim()).filter(t => t !== 'Copier en image' && t !== 'Exporter en PDF…') : [],
    entreesToutes: m ? [...m.children].map(c => c.tagName === 'HR' ? '─' : c.classList.contains('menu-titre') ? '#' + c.textContent : (c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim()) : [],
    saisie: !!document.querySelector('.carte-saisie'),
    nombre: document.querySelector('.trieuse-nombre')?.textContent ?? '', groupe: !document.querySelector('.trieuse-choix')?.hidden,
    choisir: document.querySelector('.trieuse-choisir')?.getAttribute('aria-pressed') ?? null,
    aide: document.querySelector('.trieuse-aide')?.textContent,
    rang: document.querySelector('.rang')?.textContent ?? '',
    fantome: !!document.querySelector('.trieuse-fantome'),
    ctrlD: (window.__ctrlD || []).slice(),
  }
}
const etat = page => page.evaluate(ETAT)
/** Le point (fx, fy de 0 à 1) d'un élément de la carte i : la carte entière, ou un sélecteur dedans */
const point = (page, i, sel = null, fx = 0.5, fy = 0.4) => page.evaluate(([i, sel, fx, fy]) => {
  const c = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')[i]
  const e = sel ? c?.querySelector(sel) : c
  if (!e) return null
  const r = e.getBoundingClientRect()
  return { x: r.left + r.width * fx, y: r.top + r.height * fy, l: r.width, h: r.height, left: r.left }
}, [i, sel, fx, fy])
const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)
const bandeau = (page, texte) => page.locator('.trieuse-tete button', { hasText: texte })
const entree = (page, texte) => page.locator('.trieuse .menu-vignette .menu-item', { hasText: texte })
const message = (e, t) => e.msgs.at(-1) === t
/** Tout le texte du document, éléments cachés compris (comme passeB-b12), et les title, aria-label, placeholder */
const TEXTES = () => document.body.innerText + ' ' + document.body.textContent + [...document.querySelectorAll('[title],[aria-label],[placeholder]')].map(e => e.title + ' ' + e.getAttribute('aria-label') + ' ' + (e.getAttribute('placeholder') ?? '')).join(' ')
/** (P7) Dans le menu d'une page : « Copier en image » (puis « Exporter en
 *  PDF… », s'il est là) juste avant Supprimer, après le filet du fond */
const placeDesSorties = e => {
  const l = e.entreesToutes, i = l.indexOf('Copier en image')
  const suite = l.slice(i + 1)
  return i > 0 && l[i - 1] === '─' && (suite.length === 1 || (suite.length === 2 && suite[0] === 'Exporter en PDF…')) && suite[suite.length - 1] === 'Supprimer'
}
// (lot 5, K8 : huit fonds au lieu de quatre, les quatre nouveaux à leur place dans FONDS ; adapté volontairement)
// (Adapté aux réglages par défaut, retouches après le lot 5 : toute page
// neuve est blanche — les pages que prépare cet essai (nouvellePage), celles
// qu'insère la trieuse, Page blanche y étant cochée d'office, même à côté
// d'une page en Seyès — ; on arrive sur une page toujours à 100 %, à son
// centre gardé : la copie d'une page zoomée à 160 % s'ouvre à 100 % au même
// centre. Le reste est inchangé.)
const MENU_PAGE = ['Aller à cette page', '─', 'Renommer…', 'Dupliquer', 'Insérer une page avant…', 'Insérer une page après…', '─', '#Fond', 'Page blanche', 'Petits carreaux', 'Grands carreaux (1 cm)', 'Seyès', 'Papier millimétré', 'Papier pointé', 'Réseau isométrique', 'Repère', '─', 'Supprimer']
async function glisserSouris(page, de, vers, pas = 12) {
  await page.mouse.move(de.x, de.y); await page.mouse.down()
  for (let k = 1; k <= pas; k++) await page.mouse.move(de.x + (vers.x - de.x) * k / pas, de.y + (vers.y - de.y) * k / pas)
  await page.waitForTimeout(60)
  await page.mouse.up(); await page.waitForTimeout(150)
}
const pixels = (page, i) => page.evaluate(i => {
  const c = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome) canvas')[i]
  if (!c) return ''
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let h = 0
  for (let k = 0; k < d.length; k += 64) h = (h * 31 + d[k] + d[k + 1] * 3 + d[k + 2] * 7) | 0
  return String(h)
}, i)

// =============== 1. À la souris ===============
if (faire('souris')) {
  const { ctx, page } = await ouvrir({}, 'souris')
  const P = await preparer(page, 6, { ici: 2, vides: [5] })
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(400)
  await page.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].every(c => c.dataset.peinte), null, { timeout: 5000 }).catch(() => {})
  const opt = await page.evaluate(() => [...document.querySelectorAll('.trieuse .carte')].map(c => { const b = c.querySelector('.carte-options'), r = b.getBoundingClientRect(); return { label: b.getAttribute('aria-label'), titre: b.title, l: r.width, h: r.height, tab: b.tabIndex, vu: getComputedStyle(b).display !== 'none' } }))
  verifier('Chaque carte a son bouton ⋯ « Options de la page N » (aria-label et title), 44 × 44, hors de l\'ordre de Tab',
    opt.every((o, i) => o.label === `Options de la page ${i + 1}` && o.titre === o.label && o.l >= 44 && o.h >= 44 && o.tab === -1 && o.vu), opt)
  // Le bouton ⋯ de la carte 3
  await page.click('.trieuse .carte:nth-child(3) .carte-options'); await page.waitForTimeout(150)
  let e = await etat(page)
  const dansTrieuse = await page.evaluate(() => { const m = document.querySelector('.menu-vignette'); return m.parentElement === document.querySelector('.trieuse') && m.getAttribute('role') === 'menu' && m.classList.contains('menu-flottant') && [...m.querySelectorAll('.menu-item')].every(b => b.getAttribute('role') === 'menuitem' || b.getAttribute('role') === 'menuitemradio') })
  verifier('⋯ ouvre le menu de la page 3, un enfant de la trieuse (.menu-flottant, role menu), « Page 3 »', e.menu && dansTrieuse && e.menuLabel === 'Page 3' && e.ouverte, e)
  verifier('Ses entrées : Aller à cette page · ─ · Renommer… · Dupliquer · Insérer avant / après · ─ · Fond (8 choix) · ─ · Supprimer', JSON.stringify(e.entrees) === JSON.stringify(MENU_PAGE), e.entrees)
  verifier('… (P7) « Copier en image » après le filet, juste avant Supprimer', placeDesSorties(e), e.entreesToutes)
  const touches = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.menu-vignette .menu-item')].map(b => [b.querySelector('.libelle').firstChild.textContent.trim(), [b.querySelector('.touche')?.textContent ?? '', b.getAttribute('role'), b.getAttribute('aria-checked')]])))
  verifier('Touches : Entrée, F2, Ctrl + D, Suppr ; les fonds en menuitemradio, « Page blanche » (le fond de la page) coché',
    touches['Aller à cette page'][0] === 'Entrée' && touches['Renommer…'][0] === 'F2' && touches['Dupliquer'][0] === 'Ctrl + D' && touches['Supprimer'][0] === 'Suppr'
    && touches['Petits carreaux'][1] === 'menuitemradio' && touches['Page blanche'][2] === 'true' && touches['Petits carreaux'][2] === 'false' && touches['Seyès'][2] === 'false', touches)
  const expanded = await page.evaluate(() => document.querySelectorAll('.trieuse .carte-options')[2].getAttribute('aria-expanded'))
  verifier('… son bouton ⋯ dit aria-expanded="true"', expanded === 'true', expanded)
  await page.screenshot({ path: D + '/1-menu.png' })
  const textesMenu = await page.evaluate(TEXTES)
  // Le menu marche par-dessus la trieuse : « Renommer… »
  await entree(page, 'Renommer').click(); await page.waitForTimeout(150)
  const textesChamp = await page.evaluate(TEXTES)
  verifier('Aucun texte (cachés compris) ne dit « undefined », « NaN » ni « [object Object] », menu ouvert puis champ du nom ouvert', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(textesMenu) && !/\bundefined\b|\bNaN\b|\[object Object\]/.test(textesChamp))
  const champ = await page.evaluate(() => { const i = document.querySelector('.carte-saisie'); return i && { dans: i.closest('.carte')?.dataset.page, ph: i.placeholder, label: i.getAttribute('aria-label'), max: i.maxLength, focus: document.activeElement === i, val: i.value, tout: i.selectionStart === 0 && i.selectionEnd === i.value.length } })
  e = await etat(page)
  verifier('« Renommer… » (souris) : un champ dans la carte 3, « Nom de la page (facultatif) », « Nom de la page 3 », 60 caractères, le focus dedans ; le menu fermé',
    champ && champ.dans === P[2] && champ.ph === 'Nom de la page (facultatif)' && champ.label === 'Nom de la page 3' && champ.max === 60 && champ.focus && !e.menu, champ)
  // Ctrl + D dans le champ : aucune copie, aucun marque-page
  await page.keyboard.press('Control+d'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl + D dans le champ du nom : aucune copie, le marque-page empêché (defaultPrevented)', e.pages.length === 6 && e.saisie && e.ctrlD.at(-1)?.empeche === true && /carte-saisie/.test(e.ctrlD.at(-1)?.cible), e.ctrlD)
  await page.keyboard.type('Exercice 12 p. 84'); await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  const nomCarte = await page.evaluate(() => document.querySelectorAll('.trieuse .carte')[2].querySelector('.carte-nom').textContent)
  verifier('Entrée : la page 3 s\'appelle « Exercice 12 p. 84 » (sous sa vignette) ; « Page renommée » avec Annuler ; le focus revient à la carte',
    e.noms[2] === 'Exercice 12 p. 84' && nomCarte === 'Exercice 12 p. 84' && message(e, 'Page renommée') && e.action.includes('Annuler') && e.focusPage === P[2] && !e.saisie && e.ouverte, e)
  // Échap dans le champ : rien ne change, la trieuse reste ouverte
  await page.keyboard.press('F2'); await page.waitForTimeout(100)
  await page.keyboard.type('Autre'); await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('F2 puis Échap : le nom ne change pas, le champ se ferme, la trieuse reste ouverte', e.noms[2] === 'Exercice 12 p. 84' && !e.saisie && e.ouverte && e.focusPage === P[2], e)
  // Double-clic sur le nom : le champ ; le vider retire le nom
  const nomPt = await point(page, 2, '.carte-nom')
  await page.mouse.dblclick(nomPt.x, nomPt.y); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Un double-clic sur le nom ouvre le champ (sans aller à la page)', e.saisie && e.ouverte && e.page === P[2], e)
  await page.keyboard.press('Control+a'); await page.keyboard.press('Delete'); await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Le nom vidé : « Nom de la page retiré » avec Annuler', e.noms[2] === null && message(e, 'Nom de la page retiré') && e.action.includes('Annuler'), e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Annuler » du message : le nom revient (« Annulé : page renommée »)', e.noms[2] === 'Exercice 12 p. 84' && message(e, 'Annulé : page renommée'), e)
  // Un simple clic sur le nom mène à la page (après un instant)
  // (vérifié plus bas, dans la section du tableau)

  // Le clic droit, à l'APPUI du bouton
  const c4 = await point(page, 3)
  await page.mouse.move(c4.x, c4.y); await page.mouse.down({ button: 'right' }); await page.waitForTimeout(80)
  const alAppui = await etat(page)
  await page.mouse.up({ button: 'right' }); await page.waitForTimeout(100)
  e = await etat(page)
  const ctxEmpeche = await page.evaluate(() => { const c = document.querySelectorAll('.trieuse .carte canvas')[3]; const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true }); c.dispatchEvent(ev); return ev.defaultPrevented })
  verifier('Clic droit sur la carte 4 : le menu s\'ouvre à l\'appui du bouton, là où l\'on a appuyé, et reste ouvert au relâcher ; le menu du navigateur empêché',
    alAppui.menu && alAppui.menuLabel === 'Page 4' && e.menu && ctxEmpeche && e.focusPage === P[3], { alAppui: alAppui.menu, menu: e.menu, ctxEmpeche, f: e.focus })
  const pos = await page.evaluate(() => { const r = document.querySelector('.menu-vignette').getBoundingClientRect(); return { x: r.left, y: r.top } })
  verifier('… posé au point de l\'appui (à sa droite)', Math.abs(pos.x - (c4.x + 6)) < 3 && Math.abs(pos.y - c4.y) < 3, { pos, c4 })
  // Insérer une page après la 4
  // (corrections conformite) « Insérer… » propose d'abord le fond : celui de la voisine, coché, pris au clic
  await entree(page, 'Insérer une page après').click(); await page.waitForTimeout(150)
  await page.locator('.trieuse .menu-vignette .menu-item[aria-checked="true"]').click(); await page.waitForTimeout(150)
  e = await etat(page)
  const nouvelle = e.pages[4]
  verifier('« Insérer une page après » : une page vide en 5, blanche (le fond coché) ; « Page vide insérée : c\'est la page 5 » ; sa carte a le focus',
    e.pages.length === 7 && !P.includes(nouvelle) && e.fonds[4] === 'blanc' && message(e, 'Page vide insérée : c\'est la page 5') && e.focusPage === nouvelle && e.action.includes('Annuler'), e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Annuler : elle disparaît (ni dans l\'ordre, ni dans la corbeille)', JSON.stringify(e.pages) === JSON.stringify(P) && !e.corbeille.includes(nouvelle) && message(e, 'Annulé : page insérée'), e)
  // Insérer avant la 2 (une page en Seyès d'abord)
  await page.evaluate(p => window.__app.tableau.changerFond(p, 'seyes'), P[1]); await page.waitForTimeout(80)
  await page.click('.trieuse .carte:nth-child(2) .carte-options'); await page.waitForTimeout(120)
  await entree(page, 'Insérer une page avant').click(); await page.waitForTimeout(150)
  await page.locator('.trieuse .menu-vignette .menu-item[aria-checked="true"]').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Insérer une page avant » la 2 (en Seyès) : la nouvelle page 2, blanche (le fond coché, pas celui de la voisine)', e.pages.length === 7 && e.pages[2] === P[1] && e.fonds[1] === 'blanc' && e.fonds[2] === 'seyes' && message(e, 'Page vide insérée : c\'est la page 2'), e)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Ctrl+Z dans la trieuse l\'annule (« Annulé : page insérée »)', JSON.stringify(e.pages) === JSON.stringify(P) && message(e, 'Annulé : page insérée'), e.msgs.slice(-2))
  await page.keyboard.press('Control+y'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Ctrl+Y la rétablit (« Rétabli : page insérée »)', e.pages.length === 7 && e.fonds[1] === 'blanc' && message(e, 'Rétabli : page insérée'), e.msgs.slice(-2))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  // « Ajouter une page » du bandeau
  await bandeau(page, 'Ajouter une page').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Ajouter une page » (bandeau) : une page vide à la fin ; « Page ajoutée à la fin (page 7) » ; sa carte a le focus', e.pages.length === 7 && e.pages.slice(0, 6).join() === P.join() && message(e, 'Page ajoutée à la fin (page 7)') && e.focusPage === e.pages[6], e)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  // Le fond
  const avantFond = await pixels(page, 3)
  await page.click('.trieuse .carte:nth-child(4) .carte-options'); await page.waitForTimeout(120)
  await entree(page, 'Repère').click(); await page.waitForTimeout(600)
  e = await etat(page)
  const origine = await page.evaluate(p => window.__app.tableau.origineDe(p), P[3])
  const apresFond = await pixels(page, 3)
  verifier('Fond « Repère » (page 4) : « Fond changé (page 4) » avec Annuler ; l\'origine au centre du contenu, au centimètre ; la vignette repeinte',
    e.fonds[3] === 'repere' && message(e, 'Fond changé (page 4)') && e.action.includes('Annuler') && origine.x % 40 === 0 && origine.y % 40 === 0 && origine.x > 200 && apresFond !== avantFond, { f: e.fonds, origine, m: e.msgs.at(-1) })
  const filmAvant = e.film
  await page.keyboard.press('Control+z'); await page.waitForTimeout(600)
  e = await etat(page)
  verifier('Ctrl+Z : le fond revient (la page blanche ; une étape du film, notée sur la page 4)', e.fonds[3] === 'blanc' && message(e, 'Annulé : fond changé') && await page.evaluate(([p, k]) => window.__app.tableau.film.toArray().slice(k).some(x => x.page === p), [P[3], filmAvant]) && (await pixels(page, 3)) === avantFond, e.msgs.slice(-2))
  // Dupliquer par le menu
  await page.click('.trieuse .carte:nth-child(3) .carte-options'); await page.waitForTimeout(120)
  await entree(page, 'Dupliquer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  const copie = e.pages[3]
  const herite = await page.evaluate(q => window.__app.tableau.herite(q), copie)
  verifier('« Dupliquer » (menu de la page 3) : la copie juste après, avec son histoire, « Exercice 12 p. 84 (copie) » ; « Page 3 dupliquée : la copie est la page 4 » ; la copie a le focus',
    e.pages.length === 7 && herite === P[2] && e.noms[3] === 'Exercice 12 p. 84 (copie)' && message(e, 'Page 3 dupliquée : la copie est la page 4') && e.focusPage === copie, e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Annuler : la copie s\'en va, pas dans la corbeille', JSON.stringify(e.pages) === JSON.stringify(P) && !e.corbeille.includes(copie) && message(e, 'Annulé : page dupliquée'), e)
  // Supprimer par le menu
  await page.click('.trieuse .carte:nth-child(2) .carte-options'); await page.waitForTimeout(120)
  await entree(page, 'Supprimer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Supprimer » (menu de la page 2) : « Page 2 supprimée » avec Annuler ; elle va dans la corbeille ; le focus à la carte suivante',
    e.pages.length === 5 && !e.pages.includes(P[1]) && e.corbeille.includes(P[1]) && message(e, 'Page 2 supprimée') && e.action.includes('Annuler') && e.focusPage === P[2], e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Annuler : elle revient exactement à sa place, et quitte la corbeille', JSON.stringify(e.pages) === JSON.stringify(P) && !e.corbeille.includes(P[1]) && message(e, 'Annulé : page supprimée'), e)
  // Une page vide supprimée : pas dans la corbeille
  await page.click('.trieuse .carte:nth-child(6) .carte-options'); await page.waitForTimeout(120)
  await entree(page, 'Supprimer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Une page vide supprimée : « Page 6 (vide) supprimée », et pas dans la corbeille', e.pages.length === 5 && message(e, 'Page 6 (vide) supprimée') && !e.corbeille.includes(P[5]), e)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)

  // Plusieurs pages : Maj + clic, Ctrl + clic
  const c2 = await point(page, 1), c5 = await point(page, 4)
  await page.keyboard.down('Shift'); await page.mouse.click(c2.x, c2.y); await page.keyboard.up('Shift'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Maj + clic sur la carte 2 : elle est choisie (aria-selected), on ne va pas à la page ; « 1 page choisie »', e.ouverte && e.page === P[2] && JSON.stringify(e.choisies) === JSON.stringify([P[1]]) && e.nombre === '1 page choisie' && e.groupe, e)
  await page.keyboard.down('Control'); await page.mouse.click(c5.x, c5.y); await page.keyboard.up('Control'); await page.waitForTimeout(100)
  e = await etat(page)
  const vue = await page.evaluate(() => { const c = document.querySelectorAll('.trieuse .carte')[1]; return { fond: getComputedStyle(c).backgroundColor, coche: getComputedStyle(c.querySelector('.carte-coche')).display, svg: getComputedStyle(c.querySelector('.carte-coche svg')).visibility, autre: getComputedStyle(document.querySelectorAll('.trieuse .carte')[0].querySelector('.carte-coche svg')).visibility } })
  const boutons = await page.evaluate(() => [...document.querySelectorAll('.trieuse-choix button')].map(b => b.textContent))
  // (Adapté au morceau P9 : « Exporter en PDF » entre Supprimer et Tout désélectionner)
  verifier('Ctrl + clic sur la 5 : « 2 pages choisies » ; le bandeau : Dupliquer, Supprimer, Exporter en PDF, Tout désélectionner ; une coche et un fond bleu pâle',
    JSON.stringify(e.choisies) === JSON.stringify([P[1], P[4]]) && e.nombre === '2 pages choisies' && JSON.stringify(boutons) === JSON.stringify(['Dupliquer', 'Supprimer', 'Exporter en PDF', 'Tout désélectionner']) && vue.coche === 'grid' && vue.svg === 'visible' && vue.autre === 'hidden' && vue.fond !== 'rgba(0, 0, 0, 0)', { e: e.choisies, boutons, vue })
  await page.screenshot({ path: D + '/1-choix.png' })
  // Le menu d'une carte choisie parmi plusieurs
  await page.mouse.click(c5.x, c5.y, { button: 'right' }); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Clic droit sur une carte choisie parmi deux : « 2 pages », Dupliquer, Supprimer seulement', JSON.stringify(e.entrees) === JSON.stringify(['#2 pages', 'Dupliquer', 'Supprimer']) && e.menuLabel === '2 pages', e.entrees)
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Échap ferme le menu seul (la sélection et la trieuse restent)', !e.menu && e.ouverte && e.choisies.length === 2, e)
  // Glisser une carte choisie : les deux vont ensemble, dans leur ordre
  const de = await point(page, 4), vers = await point(page, 0, null, 0.1, 0.5)
  await glisserSouris(page, de, { x: vers.left - 8, y: vers.y })
  e = await etat(page)
  verifier('Glisser la carte 5 (choisie avec la 2) avant la 1 : les deux vont en tête, dans leur ordre ; « 2 pages déplacées »',
    JSON.stringify(e.pages) === JSON.stringify([P[1], P[4], P[0], P[2], P[3], P[5]]) && message(e, '2 pages déplacées'), { pages: e.pages.map(x => P.indexOf(x) + 1), m: e.msgs.at(-1) })
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  // Dupliquer les pages choisies (bandeau)
  await bandeau(page, 'Dupliquer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Dupliquer » (bandeau) : chaque copie juste après son original ; « 2 pages dupliquées »', e.pages.map(x => P.indexOf(x) + 1).join() === '1,2,0,3,4,5,0,6' && message(e, '2 pages dupliquées'), { p: e.pages.map(x => P.indexOf(x) + 1) })
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Ctrl+Z : « Annulé : 2 pages dupliquées », les copies ne vont pas dans la corbeille', JSON.stringify(e.pages) === JSON.stringify(P) && message(e, 'Annulé : 2 pages dupliquées') && e.corbeille.length === 0, e)
  // Supprimer les pages choisies (bandeau), puis Annuler
  await bandeau(page, 'Supprimer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Supprimer » (bandeau) : « 2 pages supprimées » ; la sélection vidée, le bandeau sans elle', e.pages.length === 4 && message(e, '2 pages supprimées') && !e.choisies.length && !e.groupe && e.corbeille.length === 2, e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Annuler : les deux reviennent à leur place', JSON.stringify(e.pages) === JSON.stringify(P) && e.corbeille.length === 0, e)
  // Tout supprimer : refusé
  await page.keyboard.press('Control+a'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Ctrl + A : toutes les pages choisies', e.choisies.length === 6 && e.nombre === '6 pages choisies', e.nombre)
  await bandeau(page, 'Supprimer').click(); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Supprimer toutes les pages : « Il doit rester au moins une page. », rien ne change', e.pages.length === 6 && message(e, 'Il doit rester au moins une page.'), e.msgs.at(-1))
  await bandeau(page, 'Tout désélectionner').click(); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('« Tout désélectionner » : plus rien de choisi', !e.choisies.length && !e.groupe && e.ouverte, e)
  // « Annuler » d'une action qui n'est plus la dernière
  await page.keyboard.press('F2'); await page.keyboard.type('A'); await page.keyboard.press('Enter'); await page.waitForTimeout(80)
  const premierAnnuler = await page.locator('.toast button.action', { hasText: 'Annuler' }).elementHandle()
  await page.evaluate(() => window.__app.tableau.renommerPage(window.__app.pages[0], 'Ailleurs'))
  await premierAnnuler.click(); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('« Annuler » après un changement fait ailleurs : « Les pages ont changé depuis : rien à annuler. »', message(e, 'Les pages ont changé depuis : rien à annuler.'), e.msgs.slice(-2))
  await page.screenshot({ path: D + '/1-fin.png' })
  const t1 = await page.evaluate(TEXTES)
  verifier('Aucun texte ne dit « undefined », « NaN » ni « [object Object] » (trieuse, menu, champ)', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(t1))
  await ctx.close()
}

// =============== 2. À la tablette graphique (stylet sans écran tactile) ===============
if (faire('wacom')) {
  const { ctx, page } = await ouvrir({}, 'wacom')
  const cdp = await ctx.newCDPSession(page)
  const P = await preparer(page, 6, { ici: 0 })
  const plume = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: o.bouton ?? (type === 'mouseMoved' ? (o.appuye ? 'left' : 'none') : 'left'),
    buttons: o.boutons ?? (o.appuye ? 1 : 0), clickCount: type === 'mouseMoved' ? 0 : 1, force: o.appuye || o.boutons ? 0.5 : 0, modifiers: o.mod ?? 0 })
  async function touchePlume(p, o = {}) { await plume('mouseMoved', p.x, p.y); await plume('mousePressed', p.x, p.y, { appuye: true, ...o }); await pause(40); await plume('mouseReleased', p.x, p.y, { ...o, boutons: 0 }); await pause(120) }
  verifier('Tablette graphique : navigator.maxTouchPoints vaut 0 (pas de « Choisir plusieurs »)', (await page.evaluate(() => navigator.maxTouchPoints)) === 0)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(300)
  verifier('… le bouton « Choisir plusieurs » est caché, « Ajouter une page » est là', await page.evaluate(() => getComputedStyle(document.querySelector('.trieuse-choisir')).display === 'none' && getComputedStyle([...document.querySelectorAll('.trieuse-bouton')].find(b => b.textContent === 'Ajouter une page')).display !== 'none'))
  // Le bouton latéral (le bouton 2) : le menu, à l'appui
  const c3 = await point(page, 2)
  await plume('mouseMoved', c3.x, c3.y)
  await plume('mousePressed', c3.x, c3.y, { bouton: 'right', boutons: 2 }); await pause(80)
  let e = await etat(page)
  await plume('mouseReleased', c3.x, c3.y, { bouton: 'right', boutons: 0 }); await pause(120)
  const e2 = await etat(page)
  verifier('Le bouton latéral du stylet sur la carte 3 : son menu s\'ouvre à l\'appui, et reste', e.menu && e.menuLabel === 'Page 3' && e2.menu && JSON.stringify(e2.entrees) === JSON.stringify(MENU_PAGE), { e: e.menu, e2: e2.menu })
  // Une entrée choisie au stylet
  const dup = await page.evaluate(() => { const r = [...document.querySelectorAll('.menu-vignette .menu-item')].find(b => b.textContent.startsWith('Dupliquer')).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 } })
  await touchePlume(dup)
  e = await etat(page)
  verifier('« Dupliquer » touché au stylet : la copie de la page 3 en 4', e.pages.length === 7 && e.pages[2] === P[2] && message(e, 'Page 3 dupliquée : la copie est la page 4'), e.msgs.slice(-2))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  // Maj + touche du stylet : choisir, sans aller à la page
  await touchePlume(await point(page, 1), { mod: 8 })
  await touchePlume(await point(page, 3), { mod: 8 })
  e = await etat(page)
  verifier('Maj + touche du stylet sur les cartes 2 et 4 : choisies, on reste dans la trieuse', e.ouverte && JSON.stringify(e.choisies) === JSON.stringify([P[1], P[3]]) && e.page === P[0], e)
  // Glisser une carte choisie au stylet : vers la fin
  const de = await point(page, 1), fin = await point(page, 5, null, 0.95, 0.5)
  await plume('mouseMoved', de.x, de.y); await plume('mousePressed', de.x, de.y, { appuye: true })
  for (let k = 1; k <= 14; k++) await plume('mouseMoved', de.x + (fin.x + 20 - de.x) * k / 14, de.y + (fin.y - de.y) * k / 14, { appuye: true })
  await pause(60); await plume('mouseReleased', fin.x + 20, fin.y, { boutons: 0 }); await pause(150)
  e = await etat(page)
  verifier('Glissées au stylet après la 6 : les pages 2 et 4 vont à la fin, dans leur ordre', JSON.stringify(e.pages) === JSON.stringify([P[0], P[2], P[4], P[5], P[1], P[3]]) && message(e, '2 pages déplacées'), e.pages.map(x => P.indexOf(x) + 1))
  // Le menu d'une carte choisie, au bouton latéral : supprimer les deux
  const c5 = await point(page, 4)
  await plume('mouseMoved', c5.x, c5.y); await plume('mousePressed', c5.x, c5.y, { bouton: 'right', boutons: 2 }); await pause(60); await plume('mouseReleased', c5.x, c5.y, { bouton: 'right', boutons: 0 }); await pause(120)
  e = await etat(page)
  verifier('Le bouton latéral sur une carte choisie : « 2 pages » · Dupliquer · Supprimer', JSON.stringify(e.entrees) === JSON.stringify(['#2 pages', 'Dupliquer', 'Supprimer']), e.entrees)
  const sup = await page.evaluate(() => { const r = [...document.querySelectorAll('.menu-vignette .menu-item')].find(b => b.textContent.startsWith('Supprimer')).getBoundingClientRect(); return { x: r.left + 30, y: r.top + r.height / 2 } })
  await touchePlume(sup)
  e = await etat(page)
  verifier('« Supprimer » au stylet : « 2 pages supprimées »', e.pages.length === 4 && message(e, '2 pages supprimées'), e.msgs.slice(-2))
  await ctx.close()
}

// =============== 3. Au doigt (écran tactile) ===============
if (faire('doigt')) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'doigt')
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 4, radiusY: 4, force: 0.5 })) })
  const P = await preparer(page, 8, { ici: 0 })
  const rang = await page.evaluate(() => { const r = document.querySelector('.rang').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await page.waitForTimeout(400)
  let e = await etat(page)
  const choisir = await page.evaluate(() => { const b = document.querySelector('.trieuse-choisir'), r = b.getBoundingClientRect(); return { vu: getComputedStyle(b).display !== 'none', h: r.height, texte: b.textContent, x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  verifier('Écran tactile : « Choisir plusieurs » dans le bandeau (interrupteur, aria-pressed="false", 44 px)', choisir.vu && choisir.texte === 'Choisir plusieurs' && e.choisir === 'false' && choisir.h >= 44, choisir)
  // Un appui long : la page se soulève, aucun menu
  const c2 = await point(page, 1)
  await touche('touchStart', [[c2.x, c2.y]]); await pause(650)
  const long = await etat(page)
  await touche('touchEnd', []); await pause(200)
  e = await etat(page)
  verifier('Un appui long sur une carte la soulève (pour la glisser) et n\'ouvre pas son menu ; lâchée sur place, rien ne bouge', long.fantome && !long.menu && !e.menu && JSON.stringify(e.pages) === JSON.stringify(P) && e.ouverte, { long: [long.fantome, long.menu], e: e.menu })
  // « Choisir plusieurs »
  await page.touchscreen.tap(choisir.x, choisir.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('« Choisir plusieurs » touché : allumé (aria-pressed="true"), l\'aide le dit', e.choisir === 'true' && /choisir ou la retirer/.test(e.aide), e)
  for (const i of [1, 3, 5]) { const c = await point(page, i); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(120) }
  e = await etat(page)
  verifier('Trois touchers : les pages 2, 4 et 6 choisies, on reste dans la trieuse ; « 3 pages choisies »', e.ouverte && JSON.stringify(e.choisies) === JSON.stringify([P[1], P[3], P[5]]) && e.nombre === '3 pages choisies', e)
  const c4 = await point(page, 3); await page.touchscreen.tap(c4.x, c4.y); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Un toucher sur une page choisie la retire', JSON.stringify(e.choisies) === JSON.stringify([P[1], P[5]]) && e.nombre === '2 pages choisies', e.choisies)
  await page.screenshot({ path: D + '/3-doigt.png' })
  // Dupliquer (bandeau, touché)
  await bandeau(page, 'Dupliquer').tap(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Dupliquer » touché : « 2 pages dupliquées »', e.pages.length === 10 && message(e, '2 pages dupliquées'), e.msgs.slice(-2))
  await page.locator('.toast button.action', { hasText: 'Annuler' }).tap(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Annuler » touché : les copies s\'en vont', JSON.stringify(e.pages) === JSON.stringify(P) && message(e, 'Annulé : 2 pages dupliquées'), e.msgs.slice(-2))
  // Supprimer (bandeau) : la sélection se vide, « Choisir plusieurs » s'éteint
  await bandeau(page, 'Supprimer').tap(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Supprimer » touché : « 2 pages supprimées » ; la sélection vide, « Choisir plusieurs » s\'éteint', e.pages.length === 6 && message(e, '2 pages supprimées') && !e.choisies.length && e.choisir === 'false', e)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).tap(); await page.waitForTimeout(150)
  // ⋯ touché : le menu ; « Insérer une page après »
  const o3 = await point(page, 2, '.carte-options')
  await page.touchscreen.tap(o3.x, o3.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('⋯ touché : le menu de la page 3', e.menu && e.menuLabel === 'Page 3' && JSON.stringify(e.entrees) === JSON.stringify(MENU_PAGE), e)
  // (corrections conformite) le fond de la voisine vient sous le doigt : on le touche après avoir lu
  // le menu (un second toucher dans le délai d'un double toucher, au même endroit, ne fait rien)
  await entree(page, 'Insérer une page après').tap(); await page.waitForTimeout(700)
  await page.locator('.trieuse .menu-vignette .menu-item[aria-checked="true"]').tap(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Insérer une page après » touché : la page vide en 4', e.pages.length === 9 && e.pages[2] === P[2] && message(e, 'Page vide insérée : c\'est la page 4'), e.msgs.slice(-2))
  // Renommer au doigt : le champ dans la carte, visible
  const o4 = await point(page, 3, '.carte-options')
  await page.touchscreen.tap(o4.x, o4.y); await page.waitForTimeout(150)
  await entree(page, 'Renommer').tap(); await page.waitForTimeout(200)
  const vis = await page.evaluate(() => { const i = document.querySelector('.carte-saisie'); if (!i) return null; const r = i.getBoundingClientRect(), g = document.querySelector('.trieuse-grille').getBoundingClientRect(); return { focus: document.activeElement === i, dedans: r.top >= g.top && r.bottom <= g.bottom, h: r.height } })
  verifier('« Renommer… » touché : le champ dans la carte, le focus dedans, visible dans la grille', vis && vis.focus && vis.dedans && vis.h >= 44, vis)
  await page.keyboard.type('Bilan'); await page.keyboard.press('Enter'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('… « Bilan » gardé', e.noms[3] === 'Bilan' && message(e, 'Page renommée'), e.noms)
  // « Choisir plusieurs » éteint : un toucher mène à la page
  const c7 = await point(page, 6)
  await page.touchscreen.tap(c7.x, c7.y); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('« Choisir plusieurs » éteint : un toucher bref mène à la page', !e.ouverte && e.page === e.pages[6], e)
  await ctx.close()
}

// =============== 4. Au clavier (AZERTY : les touches sont lues par leur nom) ===============
if (faire('clavier')) {
  const { ctx, page } = await ouvrir({ locale: 'fr-FR' }, 'clavier')
  const P = await preparer(page, 6, { ici: 1 })
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(300)
  let e = await etat(page)
  verifier('(la trieuse ouverte au clavier, le focus sur la page 2)', e.ouverte && e.focusPage === P[1], e.focus)
  // F2
  await page.keyboard.press('F2'); await page.waitForTimeout(80)
  await page.keyboard.type('Cours'); await page.keyboard.press('Enter'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('F2, « Cours », Entrée : la page 2 renommée, le focus revient à sa carte', e.noms[1] === 'Cours' && e.focusPage === P[1] && message(e, 'Page renommée'), e)
  // Ctrl + D
  const formes0 = await page.evaluate(() => window.__app.pages.map(p => [...window.__app.tableau.formesDe(p).keys()].join()).join('|'))
  await page.keyboard.press('Control+d'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl + D : la page 2 dupliquée (la copie en 3, « Cours (copie) », avec le focus) ; le marque-page empêché',
    e.pages.length === 7 && e.noms[2] === 'Cours (copie)' && e.focusPage === e.pages[2] && message(e, 'Page 2 dupliquée : la copie est la page 3') && e.ctrlD.at(-1)?.empeche === true, { m: e.msgs.at(-1), ctrlD: e.ctrlD })
  // Ctrl + Maj + D : rien (pas même le marque-page)
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl + Maj + D dans la trieuse : rien, et pas de marque-page', e.pages.length === 7 && e.ctrlD.at(-1)?.empeche === true, e.ctrlD)
  // Suppr : la copie (elle a le focus)
  await page.keyboard.press('Delete'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Suppr : la page qui a le focus (la copie) supprimée ; « Page 3 supprimée »', e.pages.length === 6 && JSON.stringify(e.pages) === JSON.stringify(P) && message(e, 'Page 3 supprimée'), e.msgs.slice(-2))
  const formes1 = await page.evaluate(() => window.__app.pages.map(p => [...window.__app.tableau.formesDe(p).keys()].join()).join('|'))
  verifier('… Ctrl + D et Suppr agissent sur les pages, jamais sur ce qui y est écrit (les formes de chaque page inchangées)', formes0 === formes1, { formes0, formes1 })
  // Ctrl+Z, Ctrl+Y
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Z : la copie revient (« Annulé : page supprimée »)', e.pages.length === 7 && message(e, 'Annulé : page supprimée'), e.msgs.slice(-2))
  await page.keyboard.press('Control+y'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl+Y : de nouveau supprimée (« Rétabli : page supprimée »)', e.pages.length === 6 && message(e, 'Rétabli : page supprimée'), e.msgs.slice(-2))
  // Retour arrière
  await page.keyboard.press('End'); await page.keyboard.press('Backspace'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Retour arrière sur la dernière : supprimée', e.pages.length === 5 && message(e, 'Page 6 supprimée'), e.msgs.slice(-2))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  // Espace, Ctrl + A, Échap (vide), Échap (ferme)
  await page.keyboard.press('Home'); await page.keyboard.press('Space'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Space'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Espace sur la 1 puis sur la 3 : les deux choisies ; la grille ne défile pas, la trieuse reste ouverte', JSON.stringify(e.choisies) === JSON.stringify([P[0], P[2]]) && e.ouverte, e.choisies)
  await page.keyboard.press('Space'); await page.waitForTimeout(60)
  verifier('Espace de nouveau sur la 3 : retirée', JSON.stringify((await etat(page)).choisies) === JSON.stringify([P[0]]))
  await page.keyboard.press('Space')
  // Ctrl + Maj + → : les pages choisies avancent ensemble
  await page.keyboard.press('Control+Shift+ArrowRight'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Ctrl + Maj + → sur une page choisie : les pages choisies (1 et 3) avancent ensemble, regroupées', JSON.stringify(e.pages) === JSON.stringify([P[1], P[3], P[0], P[2], P[4], P[5]]) && message(e, '2 pages déplacées'), e.pages.map(x => P.indexOf(x) + 1))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  await page.keyboard.press('Control+a'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Ctrl + A : toutes les pages', e.choisies.length === 6 && e.nombre === '6 pages choisies', e.nombre)
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Échap : la sélection se vide, la trieuse reste ouverte', !e.choisies.length && e.ouverte && !e.groupe, e)
  // La touche Menu
  await page.keyboard.press('Home'); await page.keyboard.press('ContextMenu'); await page.waitForTimeout(150)
  e = await etat(page)
  const carteFocus = await page.evaluate(() => [...document.querySelectorAll('.trieuse .carte')].find(c => c.tabIndex === 0)?.dataset.page)
  verifier('Touche Menu : le menu de la page 1 s\'ouvre, le focus sur « Aller à cette page »', e.menu && e.menuLabel === 'Page 1' && e.focusClasse === 'menu-item' && e.focus === null && (await page.evaluate(() => document.activeElement.textContent)).startsWith('Aller à cette page') && carteFocus === P[0], e)
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60)
  const actif = await page.evaluate(() => document.activeElement.textContent)
  e = await etat(page)
  const carteFocus2 = await page.evaluate(() => [...document.querySelectorAll('.trieuse .carte')].find(c => c.tabIndex === 0)?.dataset.page)
  verifier('↓ : l\'entrée suivante (« Renommer… »), la carte ne change pas', actif.startsWith('Renommer') && e.menu && carteFocus2 === P[0], { actif, carteFocus2 })
  await page.keyboard.press('Delete'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Suppr dans le menu : rien n\'est supprimé, le menu reste ouvert', e.pages.length === 6 && e.menu, e)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Échap : le menu se ferme, pas la trieuse ; le focus revient à la carte 1', !e.menu && e.ouverte && e.focusPage === P[0], e)
  // Maj + F10, puis « Insérer une page avant » par les flèches et Entrée
  await page.keyboard.press('Shift+F10'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Maj + F10 : le même menu', e.menu && e.menuLabel === 'Page 1', e)
  for (let k = 0; k < 3; k++) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  // (corrections conformite) puis le fond : celui de la voisine a le focus, Entrée le prend
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('↓ ↓ ↓ Entrée (« Insérer une page avant… ») puis Entrée (le fond de la voisine) : une page vide en tête, avec le focus', e.pages.length === 7 && e.pages[1] === P[0] && e.focusPage === e.pages[0] && message(e, 'Page vide insérée : c\'est la page 1'), e.msgs.slice(-2))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)
  // Échap ferme enfin
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap (rien de choisi) : la trieuse se ferme ; le nom de la page 2 au compteur', !e.ouverte && e.rang === '2 / 6 · Cours', e.rang)
  await ctx.close()
}

// =============== 5. Ce qu'on retrouve sur le tableau ===============
if (faire('tableau')) {
  const { ctx, page } = await ouvrir({}, 'tableau')
  // L'horloge avance à volonté (des gestes espacés de 3 s)
  await page.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
  const avancer = ms => page.evaluate(ms => { window.__dec += ms }, ms)
  const P = await preparer(page, 4, { ici: 2 })
  // Renommer : le compteur après la fermeture
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  await page.keyboard.press('F2'); await page.keyboard.type('Exercice 12 p. 84'); await page.keyboard.press('Enter'); await page.waitForTimeout(80)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  let e = await etat(page)
  verifier('Renommée dans la trieuse : après la fermeture, le compteur dit « 3 / 4 · Exercice 12 p. 84 »', !e.ouverte && e.rang === '3 / 4 · Exercice 12 p. 84' && !e.action.length, e)
  // Un simple clic sur le nom mène à la page (après un instant)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  await page.evaluate(() => window.__app.tableau.renommerPage(window.__app.pages[1], 'Deux'))
  await page.waitForTimeout(60)
  const nom2 = await point(page, 1, '.carte-nom')
  await page.mouse.click(nom2.x, nom2.y); await page.waitForTimeout(100)
  const pendant = (await etat(page)).ouverte
  await page.waitForTimeout(500)
  e = await etat(page)
  verifier('Un simple clic sur le nom de la page 2 : on y va, après un instant (un double-clic l\'aurait renommée)', pendant && !e.ouverte && e.page === P[1], { pendant, page: e.page })
  await page.evaluate(p => window.__app.allerPage(p), P[2]); await page.waitForTimeout(100)
  // Supprimer la page qu'on regarde : on arrive sur celle d'avant ; Ctrl+Z la rend
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  await page.keyboard.press('Delete'); await page.waitForTimeout(150)
  e = await etat(page)
  const actuelle = await page.evaluate(() => document.querySelector('.trieuse .carte.actuelle')?.dataset.page)
  verifier('Suppr sur la page qu\'on regarde (la 3) : la page 2 devient la page actuelle (encadrée), « Page 3 supprimée »', e.ouverte && e.page === P[1] && actuelle === P[1] && message(e, 'Page 3 supprimée'), { page: e.page, actuelle })
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Fermée : on est sur la page d\'avant (2 / 3), sans « Annuler » au message', !e.ouverte && e.page === P[1] && e.rang === '2 / 3 · Deux' && !e.action.length, e)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Ctrl+Z sur le tableau : la page revient à sa place et l\'on y est (« Page 3 rétablie »), comme après la poubelle', e.page === P[2] && JSON.stringify(e.pages) === JSON.stringify(P) && e.msgs.at(-1) === 'Page 3 rétablie' && e.n === 1, e)
  // Annuler dans la trieuse une suppression de la page qu'on regarde : on y revient
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  await page.keyboard.press('Delete'); await page.waitForTimeout(120)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  e = await etat(page)
  const actuelle2 = await page.evaluate(() => document.querySelector('.trieuse .carte.actuelle')?.dataset.page)
  verifier('Supprimée puis Ctrl+Z dans la trieuse : elle revient, et c\'est de nouveau la page qu\'on regarde', e.page === P[2] && actuelle2 === P[2] && JSON.stringify(e.pages) === JSON.stringify(P), { page: e.page, actuelle2 })
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  // Dupliquer : la copie s'ouvre sur la même vue ; sa revue compte les gestes hérités
  for (let k = 0; k < 3; k++) {
    await avancer(3000)
    await page.evaluate(k => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'h' + k, type: 'trait', x: 300, y: 380 + k * 50, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }, k)
    await page.waitForTimeout(60)
  }
  await page.evaluate(() => { const a = window.__app; a.zoomerClavier(1.6); a.cam.x -= 137; a.cam.y += 61; a.rafraichir() }); await page.waitForTimeout(100)
  const vueOrig = await page.evaluate(() => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: a.cam.x, y: a.cam.y, z: a.cam.z, cx: c.x, cy: c.y } })
  await avancer(3000)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  await page.keyboard.press('Control+d'); await page.waitForTimeout(150)
  e = await etat(page)
  const q = e.pages[3]
  await page.keyboard.press('Enter'); await page.waitForTimeout(250)
  const vueCopie = await page.evaluate(() => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: a.cam.x, y: a.cam.y, z: a.cam.z, cx: c.x, cy: c.y } })
  e = await etat(page)
  verifier('Dupliquée dans la trieuse, puis Entrée : on est sur la copie (page 4), au même centre que l\'original, à 100 % (l\'original à 160 %)',
    !e.ouverte && e.page === q && Math.abs(vueCopie.cx - vueOrig.cx) < 0.5 && Math.abs(vueCopie.cy - vueOrig.cy) < 0.5 && vueCopie.z === 1 && Math.abs(vueOrig.z - 1.6) < 1e-6, { vueOrig, vueCopie })
  // Un geste sur la copie, puis la revue : « Toute son histoire »
  await avancer(3000)
  await page.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'qc', type: 'trait', x: 500, y: 380, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5], couleur: '#d64545', taille: 3, opacite: 1, pression: false }) })
  await page.waitForTimeout(200)
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(200)
  const tiroir = await page.evaluate(() => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) })))
  const sec = tiroir[0]
  verifier('La revue de la copie : « Toute son histoire » compte les gestes hérités (le trait de la page 3 d\'avant, ses 3 gestes) et le sien : 5 gestes',
    sec?.h === 'Page 4 · Exercice 12 p. 84 (copie)' && /^Toute son histoire.*· 5 gestes$/.test(sec.lignes.find(l => l.startsWith('Toute son histoire')) ?? ''), JSON.stringify(tiroir))
  for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) }
  await ctx.close()
}

// =============== 6. Le téléphone ===============
if (faire('telephone')) {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'telephone')
  await preparer(page, 7, { noms: { 0: 'Exercice 12 p. 84 : démontrer que le triangle est rectangle' }, ici: 0 })
  const rang = await page.evaluate(() => { const r = document.querySelector('.rang').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await page.waitForTimeout(400)
  await bandeau(page, 'Choisir plusieurs').tap(); await page.waitForTimeout(80)
  for (const i of [1, 2]) { const c = await point(page, i); await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(100) }
  const m = await page.evaluate(() => {
    const t = document.querySelector('.trieuse-tete'), tr = t.getBoundingClientRect()
    const boutons = [...t.querySelectorAll('button')].filter(b => getComputedStyle(b).display !== 'none' && b.getClientRects().length).map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent || b.getAttribute('aria-label'), right: r.right, left: r.left, h: r.height } })
    return { scroll: document.documentElement.scrollWidth, tete: t.scrollWidth <= t.clientWidth, hauteur: tr.height, boutons, nombre: document.querySelector('.trieuse-nombre').textContent }
  })
  verifier('Téléphone 390 × 844, deux pages choisies : le bandeau passe à la ligne, rien ne déborde en largeur, des cibles de 44 px',
    m.scroll <= 390 && m.tete && m.boutons.every(b => b.right <= 390 + 0.5 && b.left >= -0.5 && b.h >= 44) && m.hauteur > 100 && m.nombre === '2 pages choisies', m)
  await page.screenshot({ path: D + '/6-telephone.png' })
  // Le menu d'une vignette tient dans l'écran
  const o = await point(page, 3, '.carte-options')
  await page.touchscreen.tap(o.x, o.y); await page.waitForTimeout(150)
  const menu = await page.evaluate(() => { const r = document.querySelector('.menu-vignette').getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, scroll: document.documentElement.scrollWidth } })
  verifier('… le menu d\'une vignette tient dans l\'écran', menu.left >= 0 && menu.right <= 390 && menu.top >= 0 && menu.bottom <= 844 && menu.scroll <= 390, menu)
  await page.screenshot({ path: D + '/6-telephone-menu.png' })
  await ctx.close()
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
