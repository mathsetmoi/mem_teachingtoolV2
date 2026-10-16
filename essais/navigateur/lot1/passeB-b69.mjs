// Essais au navigateur du morceau B6-B9 du lot 1 : les poignées des sommets,
// le premier appui hors d'un menu, la gomme, la multi-sélection.
// Serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot1/shotsB69`
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
const attendre = ms => new Promise(r => setTimeout(r, ms))
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
const ETAT = () => {
  const a = window.__app
  return { n: a.formes.length, film: a.tableau.film.length, sel: [...a.selection], partie: a.partie, options: a.options, outil: a.outil,
    menuPartie: !document.querySelector('.menu-partie').hidden, panneau: !document.querySelector('.panneau-forme').hidden,
    toast: document.querySelector('.toast').textContent, menuFlottant: [...document.querySelectorAll('.menu-flottant')].some(m => !m.hidden),
    instruments: !document.querySelector('.choix-instruments').hidden, dialogues: document.querySelectorAll('dialog[open]').length }
}
/** Un rectangle posé sur la page (monde) */
const POSER = ({ x, y, l, h }) => {
  const app = window.__app
  const f = app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }] })
  app.tableau.nouveauGeste(); app.tableau.poser(app.page, f)
  return f.id
}
/** Un trait horizontal posé sur la page (monde), de 152 de long */
const TRAIT = ({ x, y }) => {
  const app = window.__app, t = app.tableau
  const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 8, 0, 0.5)
  const f = { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  t.nouveauGeste(); t.poser(app.page, f)
  return f.id
}
const FORMULE = ({ x, y }) => {
  const app = window.__app, t = app.tableau
  const f = { id: 'F' + Math.random().toString(36).slice(2), type: 'formule', x, y, latex: 'x^2', couleur: '#1b2230', taille: 28, z: Date.now(), auteur: t.moi }
  t.nouveauGeste(); t.poser(app.page, f)
  return f.id
}
const FORME = id => { const f = window.__app.forme(id); return f && JSON.stringify({ x: f.x, y: f.y, pts: f.pts }) }
const ECRAN = ({ x, y }) => { const r = document.getElementById('zone').getBoundingClientRect(), e = window.__app.cam.versEcran(x, y); return { x: r.left + e.x, y: r.top + e.y } }
const RIEN = () => { const a = window.__app; a.selection.clear(); a.choisirPartie(null); a.options = null; a.ui.fermerMenuPartie(); a.rendu.redessinerDirect(); a.ui.maj() }
const VIDER = () => { const a = window.__app; RIEN_(); a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, a.formes.map(f => f.id)); function RIEN_() { a.selection.clear(); a.choisirPartie(null); a.options = null; a.ui.fermerMenuPartie(); a.ui.maj() } }
async function glisser(page, pts, o = {}) {
  await page.mouse.move(...pts[0]); await page.mouse.down(o)
  for (const p of pts.slice(1)) await page.mouse.move(...p, { steps: 3 })
  await page.mouse.up(o)
}
const ligne = (x, y, dx, dy, n = 8) => Array.from({ length: n + 1 }, (_, k) => [x + dx * k / n, y + dy * k / n])

// =============== B6 — les poignées des sommets ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'b6')
  // Outil Formes : le rectangle tracé n'est pas sélectionné, pas de ronds de poignées
  await page.keyboard.press('r')
  await glisser(page, [[400, 330], [500, 400], [600, 460]])
  await page.waitForTimeout(80)
  const r0 = await page.evaluate(ETAT)
  const rect = await page.evaluate(() => window.__app.formes.find(f => f.type === 'polygone')?.id)
  verifier('Formes : le rectangle tracé n\'est pas sélectionné, pas de ronds de poignées', rect && r0.sel.length === 0 && !await page.evaluate(() => window.__app.rendu.poigneesActives), JSON.stringify({ rect, sel: r0.sel }))
  await page.screenshot({ path: `${D}/01-rectangle.png` })
  // Stylo : un « A » commencé à 7 px du sommet : un trait, le rectangle intact
  await page.keyboard.press('p')
  const f0 = await page.evaluate(FORME, rect)
  await glisser(page, [[407, 460], [420, 420], [430, 400], [440, 420], [453, 460]])
  await page.waitForTimeout(700)
  const a1 = await page.evaluate(id => ({ f: (() => { const f = window.__app.forme(id); return JSON.stringify({ x: f.x, y: f.y, pts: f.pts }) })(), n: window.__app.formes.length, sel: [...window.__app.selection] }), rect)
  verifier('Stylo : un « A » commencé à 7 px du sommet trace un trait, le rectangle n\'a pas changé', a1.f === f0 && a1.n === r0.n + 1, JSON.stringify({ n0: r0.n, n: a1.n }))
  // Un carré à main levée : « Carré — … », et il n'est pas sélectionné
  const carre = []
  for (const [x0, y0, x1, y1] of [[750, 250, 900, 250], [900, 250, 900, 400], [900, 400, 750, 400], [750, 400, 750, 252]]) for (let k = 0; k < 10; k++) carre.push([x0 + (x1 - x0) * k / 10, y0 + (y1 - y0) * k / 10])
  carre.push([752, 252])
  await page.mouse.move(...carre[0]); await page.mouse.down()
  for (const p of carre.slice(1)) await page.mouse.move(...p)
  await page.mouse.up()
  await page.waitForTimeout(150)
  const c1 = await page.evaluate(ETAT)
  verifier('Un carré à main levée : « Carré — … », et rien n\'est sélectionné', /^Carré — Ctrl\+Z/.test(c1.toast) && c1.sel.length === 0, JSON.stringify({ toast: c1.toast, sel: c1.sel }))
  // Le segment tracé n'est pas sélectionné
  await page.keyboard.press('l')
  await glisser(page, [[400, 600], [500, 640], [600, 650]])
  await page.waitForTimeout(80)
  verifier('Segment : le segment tracé n\'est pas sélectionné', (await page.evaluate(ETAT)).sel.length === 0)
  // Polygone au clic (G) : pas sélectionné non plus
  await page.keyboard.press('g')
  for (const [x, y] of [[1000, 500], [1100, 500], [1050, 600]]) { await page.mouse.click(x, y); await page.waitForTimeout(40) }
  await page.mouse.click(1000, 500)
  await page.waitForTimeout(80)
  const pg = await page.evaluate(ETAT)
  verifier('Polygone au clic : posé, pas sélectionné', pg.n === c1.n + 2 && pg.sel.length === 0, JSON.stringify({ n: pg.n, sel: pg.sel }))

  // Sélection : un clic sur le sommet du rectangle non sélectionné prend la figure
  await page.keyboard.press('v')
  await page.evaluate(RIEN)
  await page.mouse.click(400, 330)
  await page.waitForTimeout(80)
  const s1 = await page.evaluate(ETAT)
  verifier('Sélection : un clic sur le sommet d\'une figure non sélectionnée prend la figure (pas de menu)', s1.sel.length === 1 && s1.sel[0] === rect && !s1.partie && !s1.menuPartie, JSON.stringify({ sel: s1.sel, partie: s1.partie, menu: s1.menuPartie }))
  await page.mouse.click(400, 330)
  await page.waitForTimeout(80)
  const s2 = await page.evaluate(ETAT)
  verifier('Second clic sur le sommet : son menu', s2.menuPartie && s2.partie?.id === rect && s2.partie.prise.quoi === 'sommet', JSON.stringify({ partie: s2.partie, menu: s2.menuPartie }))
  // Le menu suit la vue : Ctrl + molette, puis Espace + glisser
  const coin = async () => page.evaluate(id => {
    const a = window.__app, f = a.forme(id), i = a.partie.prise.i
    const z = document.getElementById('zone').getBoundingClientRect(), p = a.sommetsDe(f)[i], e = a.cam.versEcran(p.x, p.y)
    const m = document.querySelector('.menu-partie').getBoundingClientRect()
    return { attendu: { x: z.left + e.x + 14, y: z.top + e.y + 14 }, menu: { x: m.left, y: m.top }, z: a.cam.z }
  }, rect)
  const k0 = await coin()
  await page.mouse.move(1000, 250)
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -100); await page.keyboard.up('Control')
  await page.waitForTimeout(80)
  const k1 = await coin()
  await page.keyboard.down('Space')
  await glisser(page, [[800, 600], [850, 620], [900, 640]])
  await page.keyboard.up('Space')
  await page.waitForTimeout(80)
  const k2 = await coin()
  const ok = k => pres(k.menu.x, k.attendu.x, 2) && pres(k.menu.y, k.attendu.y, 2)
  verifier('Le menu du sommet suit le zoom (Ctrl + molette) puis Espace + glisser (±2 px)', ok(k0) && ok(k1) && ok(k2) && k1.z > k0.z && (await page.evaluate(ETAT)).menuPartie, JSON.stringify({ k0, k1, k2 }))
  await page.screenshot({ path: `${D}/02-menu-sommet-suit.png` })
  // Un autre sommet de la même figure, menu ouvert : son menu à lui (le premier appui ne se perd pas)
  const autre = await page.evaluate(({ id }) => { const a = window.__app, f = a.forme(id), p = a.sommetsDe(f)[2]; const z = document.getElementById('zone').getBoundingClientRect(), e = a.cam.versEcran(p.x, p.y); return { x: z.left + e.x, y: z.top + e.y } }, { id: rect })
  await page.mouse.click(autre.x, autre.y)
  await page.waitForTimeout(80)
  const s3 = await page.evaluate(ETAT)
  verifier('Menu d\'un sommet ouvert, clic sur un autre sommet : le menu de cet autre sommet', s3.menuPartie && s3.partie?.prise?.i === 2, JSON.stringify({ partie: s3.partie }))
  // Double-clic sur un sommet : son menu, pas le panneau
  await page.mouse.dblclick(autre.x, autre.y)
  await page.waitForTimeout(120)
  const s4 = await page.evaluate(ETAT)
  verifier('Double-clic sur un sommet : son menu, sans le panneau d\'options', s4.menuPartie && !s4.panneau && !s4.options, JSON.stringify({ menu: s4.menuPartie, panneau: s4.panneau, options: s4.options }))
  // La figure disparaît (annulation) : le menu se ferme
  await page.evaluate(() => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, [a.partie.id]) })
  await page.waitForTimeout(50)
  verifier('La figure du menu disparaît : le menu se ferme', !(await page.evaluate(ETAT)).menuPartie)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(50)
  // Clic droit sur le sommet d'une figure non sélectionnée, outil Stylo : le menu de ce sommet
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
  await page.keyboard.press('p')
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  const id2 = await page.evaluate(POSER, { x: 900, y: 400, l: 150, h: 100 })
  const s5p = await page.evaluate(ECRAN, { x: 1050, y: 400 })
  await page.mouse.click(s5p.x, s5p.y, { button: 'right' })
  await page.waitForTimeout(80)
  const s5 = await page.evaluate(ETAT)
  verifier('Clic droit (outil Stylo) sur le sommet d\'une figure non sélectionnée : le menu de ce sommet', s5.menuPartie && s5.partie?.id === id2 && s5.partie.prise.quoi === 'sommet', JSON.stringify({ partie: s5.partie }))
  // Le premier appui au Stylo hors du menu le ferme, sans encre
  const n5 = s5.n
  await page.mouse.click(700, 650)
  await page.waitForTimeout(80)
  const s6 = await page.evaluate(ETAT)
  verifier('Menu de sommet ouvert, un clic au Stylo ailleurs : le menu se ferme, aucune encre', !s6.menuPartie && !s6.partie && s6.n === n5, JSON.stringify({ menu: s6.menuPartie, n5, n: s6.n }))
  await ctx.close()
}

// =============== B7 — le premier appui hors d'un menu le ferme, sans encre ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'b7')
  const A = await page.evaluate(POSER, { x: 300, y: 250, l: 200, h: 120 })
  const B = await page.evaluate(POSER, { x: 700, y: 250, l: 160, h: 120 })
  const surA = await page.evaluate(ECRAN, { x: 400, y: 250 })      // le milieu du côté du haut
  const surB = await page.evaluate(ECRAN, { x: 780, y: 250 })
  // Stylo, clic droit sur une figure : le panneau ; un clic dans le vide le ferme sans encre
  await page.keyboard.press('p')
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.waitForTimeout(80)
  const p0 = await page.evaluate(ETAT)
  await page.mouse.click(1000, 600)
  await page.waitForTimeout(80)
  const p1 = await page.evaluate(ETAT)
  verifier('Stylo : clic droit → panneau ; un clic dans le vide le ferme, aucune encre', p0.panneau && !p1.panneau && p1.n === p0.n, JSON.stringify({ p0: p0.panneau, p1: p1.panneau, n0: p0.n, n1: p1.n }))
  // Panneau rouvert, un vrai trait ailleurs : panneau fermé ET trait gardé
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.waitForTimeout(60)
  const p2 = await page.evaluate(ETAT)
  await glisser(page, ligne(900, 550, 120, 30))
  await page.waitForTimeout(700)
  const p3 = await page.evaluate(ETAT)
  verifier('Panneau ouvert, un vrai trait ailleurs : panneau fermé, le trait est gardé', p2.panneau && !p3.panneau && p3.n === p2.n + 1, JSON.stringify({ n2: p2.n, n3: p3.n }))
  // Panneau ouvert, un trait qui commence sur place puis glisse : la première lettre n'est pas perdue
  // (déjà vrai ci-dessus) ; panneau ouvert, au Stylo, le stylo reste immobile 700 ms : rien
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.waitForTimeout(60)
  const q0 = await page.evaluate(ETAT)
  await page.mouse.move(1000, 450); await page.mouse.down(); await page.waitForTimeout(700); await page.mouse.up()
  await page.waitForTimeout(80)
  const q1 = await page.evaluate(ETAT)
  verifier('Panneau ouvert, Stylo posé immobile 700 ms puis levé : panneau fermé, rien n\'est posé', q0.panneau && !q1.panneau && q1.n === q0.n, JSON.stringify({ n0: q0.n, n1: q1.n }))
  // Gomme, panneau ouvert, clic sur un trait : le panneau se ferme, le trait reste
  const t = await page.evaluate(TRAIT, { x: 300, y: 500 })
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.keyboard.press('e')
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.options = id; a.ui.maj() }, A)
  const g0 = await page.evaluate(ETAT)
  const st = await page.evaluate(ECRAN, { x: 360, y: 500 })
  await page.mouse.click(st.x, st.y)
  await page.waitForTimeout(80)
  const g1 = await page.evaluate(id => ({ ...(() => { const a = window.__app; return { panneau: !document.querySelector('.panneau-forme').hidden } })(), trait: !!window.__app.forme(id) }), t)
  verifier('Gomme, panneau ouvert, clic sur un trait : le panneau se ferme, le trait reste', g0.panneau && !g1.panneau && g1.trait, JSON.stringify({ g0: g0.panneau, g1 }))
  // Sélection, panneau ouvert sur A, clic sur B : B est pris tout de suite
  await page.keyboard.press('v')
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.waitForTimeout(60)
  const h0 = await page.evaluate(ETAT)
  await page.mouse.click(surB.x, surB.y)
  await page.waitForTimeout(80)
  const h1 = await page.evaluate(ETAT)
  verifier('Sélection, panneau ouvert sur A, clic sur B : B sélectionné tout de suite', h0.panneau && h0.sel[0] === A && h1.sel.length === 1 && h1.sel[0] === B && !h1.panneau, JSON.stringify({ h0: h0.sel, h1: h1.sel }))
  // Sélection, panneau ouvert sur A, on déplace A : le panneau reste (il reparaît au lever)
  await page.mouse.click(surA.x, surA.y, { button: 'right' })
  await page.waitForTimeout(60)
  const ax0 = await page.evaluate(id => window.__app.forme(id).x, A)
  await glisser(page, [[surA.x, surA.y], [surA.x + 20, surA.y + 10], [surA.x + 40, surA.y + 20]])
  await page.waitForTimeout(80)
  const h2 = await page.evaluate(id => ({ x: window.__app.forme(id).x, panneau: !document.querySelector('.panneau-forme').hidden, options: window.__app.options }), A)
  verifier('Sélection, panneau ouvert sur A, glisser A : A bouge et son panneau reste', pres(h2.x - ax0, 40, 0.5) && h2.panneau && h2.options === A, JSON.stringify({ ax0, h2 }))
  // Sélection, panneau ouvert : un clic dans le vide le ferme, et la vue ne bouge pas
  const cam0 = await page.evaluate(() => ({ x: window.__app.cam.x, y: window.__app.cam.y }))
  await glisser(page, [[1100, 650], [1150, 650], [1200, 660]])
  await page.waitForTimeout(80)
  const h3 = await page.evaluate(() => ({ x: window.__app.cam.x, y: window.__app.cam.y, panneau: !document.querySelector('.panneau-forme').hidden }))
  verifier('Sélection, panneau ouvert : le premier glisser dans le vide ferme le panneau sans déplacer la vue', !h3.panneau && h3.x === cam0.x && h3.y === cam0.y, JSON.stringify({ cam0, h3 }))
  // Menu % ouvert, clic au Stylo sur le tableau : le menu se ferme, pas d'encre
  await page.keyboard.press('p')
  await page.click('.zoom-texte')
  await page.waitForTimeout(60)
  const m0 = await page.evaluate(ETAT)
  await page.mouse.click(1000, 500)
  await page.waitForTimeout(80)
  const m1 = await page.evaluate(ETAT)
  verifier('Menu % ouvert, clic au Stylo sur le tableau : le menu se ferme, pas d\'encre', m0.menuFlottant && !m1.menuFlottant && m1.n === m0.n, JSON.stringify({ m0: m0.menuFlottant, m1: m1.menuFlottant, n0: m0.n, n1: m1.n }))
  // Liste des instruments ouverte, clic au Point : elle se ferme, pas de point
  await page.keyboard.press('x')
  await page.click('button[title^="Instruments"]')
  await page.waitForTimeout(60)
  const i0 = await page.evaluate(ETAT)
  await page.mouse.click(1000, 500)
  await page.waitForTimeout(80)
  const i1 = await page.evaluate(ETAT)
  verifier('Liste des instruments ouverte, clic à l\'outil Point : la liste se ferme, pas de point', i0.instruments && !i1.instruments && i1.n === i0.n, JSON.stringify({ i0: i0.instruments, i1: i1.instruments, n0: i0.n, n1: i1.n }))
  // Liste ouverte, règle posée : un appui sur la règle la prend tout de suite
  await page.click('button[title^="Instruments"]')
  await page.waitForTimeout(40)
  await page.click('.choix-instruments .instrument >> nth=0')
  await page.waitForTimeout(80)
  const reg0 = await page.evaluate(() => ({ ...window.__app.instruments.get('regle') }))
  const pris = await page.evaluate(() => { const a = window.__app; const r = a.instruments.get('regle'); for (let k = 30; k < 400; k += 10) { const w = { x: r.x + Math.cos(r.a) * k + Math.sin(r.a) * -15, y: r.y + Math.sin(r.a) * k - Math.cos(r.a) * -15 }; const q = a.instrumentSous(w); if (q?.quoi === 'corps') { const z = document.getElementById('zone').getBoundingClientRect(), e = a.cam.versEcran(w.x, w.y); return { x: z.left + e.x, y: z.top + e.y } } } return null })
  const l0 = await page.evaluate(ETAT)
  if (pris) await glisser(page, [[pris.x, pris.y], [pris.x + 20, pris.y + 10], [pris.x + 40, pris.y + 20]])
  await page.waitForTimeout(80)
  const reg1 = await page.evaluate(() => ({ ...window.__app.instruments.get('regle'), liste: !document.querySelector('.choix-instruments').hidden }))
  verifier('Liste des instruments ouverte, glisser la règle : la liste se ferme et la règle suit', pris && l0.instruments && !reg1.liste && pres(reg1.x - reg0.x, 40, 1) && pres(reg1.y - reg0.y, 20, 1), JSON.stringify({ pris, reg0, reg1 }))
  await page.evaluate(() => window.__app.basculerInstrument('regle'))
  await page.waitForTimeout(60)

  // Double-clic au Stylo sur une figure : aucun point, le panneau s'ouvre
  await page.keyboard.press('p')
  await page.evaluate(RIEN)
  const d0 = await page.evaluate(ETAT)
  await page.mouse.dblclick(surB.x, surB.y)
  await page.waitForTimeout(450)
  const d1 = await page.evaluate(ETAT)
  verifier('Double-clic au Stylo sur une figure : aucun point posé, son panneau s\'ouvre', d1.n === d0.n && d1.panneau && d1.options === B, JSON.stringify({ n0: d0.n, n1: d1.n, panneau: d1.panneau, options: d1.options }))
  await page.mouse.click(1100, 650)       // ferme le panneau
  await page.waitForTimeout(60)
  // Un seul toucher au Stylo sur une figure : un point de plus après 350 ms, son étape du film a ms
  const e0 = await page.evaluate(ETAT)
  await page.mouse.click(surB.x, surB.y)
  await page.waitForTimeout(100)
  // Le point qui attend est dessiné à part (rendu.enAttente) depuis le rapport « regressions »
  const e1 = await page.evaluate(() => ({ n: window.__app.formes.length, direct: !!(window.__app.rendu.monTrait || window.__app.rendu.enAttente) }))
  await page.waitForTimeout(300)
  const e2 = await page.evaluate(() => { const a = window.__app, film = a.tableau.film; const der = film.get(film.length - 1); return { n: a.formes.length, ms: der.ms, page: der.page === a.page, direct: !!(a.rendu.monTrait || a.rendu.enAttente) } })
  verifier('Un toucher au Stylo sur une figure : le point attend (dessiné), puis se pose ; son étape du film a ms',
    e1.n === e0.n && e1.direct && e2.n === e0.n + 1 && Array.isArray(e2.ms) && e2.ms.length >= 1 && e2.page && !e2.direct, JSON.stringify({ n0: e0.n, e1, e2 }))
  // Un toucher, puis Ctrl+Z tout de suite : le point se pose puis s'annule (il ne reparaît pas plus tard)
  await page.mouse.click(surB.x, surB.y)
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(400)
  const z1 = await page.evaluate(ETAT)
  verifier('Un toucher sur une figure puis Ctrl+Z aussitôt : le point est annulé, il ne revient pas', z1.n === e2.n, JSON.stringify({ avant: e2.n, apres: z1.n }))
  // Un toucher, puis un autre loin (à 40 px) : deux points
  await page.mouse.click(surB.x, surB.y)
  await page.mouse.click(surB.x + 40, surB.y + 30)
  await page.waitForTimeout(400)
  const z2 = await page.evaluate(ETAT)
  verifier('Deux touchers éloignés (40 px) au Stylo : deux points posés, pas de panneau', z2.n === z1.n + 2 && !z2.panneau, JSON.stringify({ avant: z1.n, apres: z2.n }))
  // Un toucher puis un changement de page : le point est sur SA page
  const pg0 = await page.evaluate(() => window.__app.page)
  const nPg = await page.evaluate(() => window.__app.formes.length)
  await page.mouse.click(surB.x, surB.y)
  await page.evaluate(() => window.__app.nouvellePage())
  await page.waitForTimeout(400)
  const pg1 = await page.evaluate(pg0 => ({ ici: window.__app.formes.length, la: window.__app.tableau.formesDe(pg0).size }), pg0)
  verifier('Un toucher puis une nouvelle page : le point est posé sur sa page à lui', pg1.ici === 0 && pg1.la === nPg + 1, JSON.stringify({ nPg, pg1 }))
  await page.evaluate(pg0 => window.__app.allerPage(pg0), pg0)
  await page.waitForTimeout(60)
  // Double-clic au Stylo sur une formule : un seul dialogue de formule
  const fo = await page.evaluate(FORMULE, { x: 450, y: 500 })
  await page.waitForTimeout(150)
  const sf = await page.evaluate(id => { const a = window.__app, b = a.rendu.boite(a.forme(id)), z = document.getElementById('zone').getBoundingClientRect(), e = a.cam.versEcran(b.x + b.l / 2, b.y + b.h / 2); return { x: z.left + e.x, y: z.top + e.y } }, fo)
  const nf = await page.evaluate(() => window.__app.formes.length)
  let dialogues = 0
  await page.exposeFunction('__compteDialogue', () => { dialogues++ })
  await page.evaluate(() => { const o = new MutationObserver(l => { for (const m of l) for (const n of m.addedNodes) if (n.tagName === 'DIALOG') window.__compteDialogue() }); o.observe(document.body, { childList: true, subtree: true }) })
  await page.mouse.dblclick(sf.x, sf.y)
  await page.waitForTimeout(700)
  const fd = await page.evaluate(() => ({ n: window.__app.formes.length, ouverts: document.querySelectorAll('dialog[open]').length, titre: document.querySelector('dialog[open] h2')?.textContent }))
  verifier('Double-clic au Stylo sur une formule : un seul dialogue de formule, aucun point', dialogues === 1 && fd.ouverts === 1 && fd.titre === 'Modifier la formule' && fd.n === nf, JSON.stringify({ dialogues, fd, nf }))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(80)
  await page.screenshot({ path: `${D}/03-b7.png` })
  await ctx.close()
}

// =============== B8 — la gomme ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'b8')
  const t1 = await page.evaluate(TRAIT, { x: 300, y: 300 }), t2 = await page.evaluate(TRAIT, { x: 300, y: 400 }), t3 = await page.evaluate(TRAIT, { x: 300, y: 500 })
  await page.keyboard.press('e')
  const f0 = await page.evaluate(() => ({ n: window.__app.formes.length, film: window.__app.tableau.film.length, pile: window.__app.tableau.annulation.undoStack.length }))
  const p = async (x, y) => page.evaluate(ECRAN, { x, y })
  const a = await p(380, 250), b = await p(380, 300), c = await p(380, 400), d = await p(380, 500)
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  await page.mouse.move(b.x, b.y, { steps: 5 }); await page.waitForTimeout(600)
  await page.mouse.move(c.x, c.y, { steps: 8 }); await page.waitForTimeout(600)
  await page.mouse.move(d.x, d.y, { steps: 8 }); await page.mouse.up()
  await page.waitForTimeout(100)
  const f1 = await page.evaluate(() => ({ n: window.__app.formes.length, film: window.__app.tableau.film.length, pile: window.__app.tableau.annulation.undoStack.length }))
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)
  const f2 = await page.evaluate(ids => ({ n: window.__app.formes.length, tous: ids.every(id => !!window.__app.forme(id)) }), [t1, t2, t3])
  verifier('Gomme lente sur 3 traits (600 ms entre chacun) : effacés, UN Ctrl+Z les rend tous ; le film a 3 étapes',
    f1.n === f0.n - 3 && f1.pile === f0.pile + 1 && f1.film === f0.film + 3 && f2.n === f0.n && f2.tous, JSON.stringify({ f0, f1, f2 }))
  // Après le coup de gomme, les gestes reprennent leurs étapes : deux traits espacés, deux Ctrl+Z
  await page.keyboard.press('p')
  const k0 = await page.evaluate(() => window.__app.tableau.annulation.undoStack.length)
  await glisser(page, ligne(700, 300, 100, 0)); await page.waitForTimeout(600)
  await glisser(page, ligne(700, 400, 100, 0)); await page.waitForTimeout(100)
  const k1 = await page.evaluate(() => window.__app.tableau.annulation.undoStack.length)
  verifier('Après la gomme, deux traits font deux étapes d\'annulation', k1 === k0 + 2, JSON.stringify({ k0, k1 }))

  // Le bout gomme du stylet, outil Stylo : le trait s'efface, l'outil reste
  const t4 = await page.evaluate(TRAIT, { x: 300, y: 620 })
  const e4 = await p(360, 620)
  const r = await page.evaluate(({ x, y }) => {
    const z = document.getElementById('zone'), app = window.__app
    const ev = (type, dx, o) => z.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 91, clientX: x + dx, clientY: y, bubbles: true, cancelable: true, pressure: 0.5, ...o }))
    ev('pointerdown', -30, { button: 5, buttons: 32 })
    const pendant = { outil: z.dataset.outil, cercle: !!app.rendu.gomme }
    for (let k = -25; k <= 30; k += 5) ev('pointermove', k, { button: -1, buttons: 32 })
    ev('pointerup', 30, { button: 5, buttons: 0 })
    return { pendant, apres: { outil: z.dataset.outil, appOutil: app.outil, cercle: !!app.rendu.gomme } }
  }, e4)
  await page.waitForTimeout(80)
  const efface = !await page.evaluate(id => !!window.__app.forme(id), t4)
  verifier('Bout gomme du stylet (button 5, buttons 32) à l\'outil Stylo : le trait s\'efface, l\'outil reste le Stylo',
    efface && r.pendant.outil === 'gomme' && r.pendant.cercle && r.apres.outil === 'stylo' && r.apres.appOutil === 'stylo' && !r.apres.cercle, JSON.stringify(r))
  // Et ce coup de gomme s'annule d'un Ctrl+Z
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(60)
  verifier('Le coup du bout gomme s\'annule d\'un Ctrl+Z', await page.evaluate(id => !!window.__app.forme(id), t4))
  // Le bout gomme passe avant l'instrument : sur la règle, il efface ce qui est dessous, la règle ne bouge pas
  await page.evaluate(() => window.__app.basculerInstrument('regle'))
  await page.waitForTimeout(80)
  const surRegle = await page.evaluate(() => { const a = window.__app; const r = a.instruments.get('regle'); for (let k = 40; k < 400; k += 10) { const w = { x: r.x + Math.cos(r.a) * k + Math.sin(r.a) * -15, y: r.y + Math.sin(r.a) * k - Math.cos(r.a) * -15 }; if (a.instrumentSous(w)?.quoi === 'corps') return w } return null })
  const t5 = await page.evaluate(({ x, y }) => { const app = window.__app, t = app.tableau; const pts = []; for (let i = 0; i < 6; i++) pts.push(i * 8, 0, 0.5); const f = { id: 'T5', type: 'trait', x: x - 20, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }; t.nouveauGeste(); t.poser(app.page, f); return f.id }, surRegle)
  const reg0 = await page.evaluate(() => ({ ...window.__app.instruments.get('regle') }))
  const sr = await page.evaluate(ECRAN, surRegle)
  await page.evaluate(({ x, y }) => {
    const z = document.getElementById('zone')
    const ev = (type, dx, o) => z.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 92, clientX: x + dx, clientY: y, bubbles: true, cancelable: true, pressure: 0.5, ...o }))
    ev('pointerdown', 0, { button: 5, buttons: 32 }); ev('pointermove', 10, { button: -1, buttons: 32 }); ev('pointerup', 10, { button: 5, buttons: 0 })
  }, sr)
  await page.waitForTimeout(60)
  const reg1 = await page.evaluate(id => ({ ...window.__app.instruments.get('regle'), trait: !!window.__app.forme(id) }), t5)
  verifier('Bout gomme sur la règle : le trait dessous s\'efface, la règle ne bouge pas', !reg1.trait && reg1.x === reg0.x && reg1.y === reg0.y, JSON.stringify({ reg0, reg1 }))
  await page.evaluate(() => window.__app.basculerInstrument('regle'))
  await ctx.close()
}

// =============== B9 — la multi-sélection ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'b9')
  const a = await page.evaluate(TRAIT, { x: 300, y: 300 }), b = await page.evaluate(TRAIT, { x: 300, y: 400 }), c = await page.evaluate(TRAIT, { x: 300, y: 500 })
  const sa = await page.evaluate(ECRAN, { x: 360, y: 300 }), sb = await page.evaluate(ECRAN, { x: 360, y: 400 }), sc = await page.evaluate(ECRAN, { x: 360, y: 500 })
  await page.keyboard.press('v')
  await page.mouse.click(sa.x, sa.y)
  await page.keyboard.down('Shift'); await page.mouse.click(sb.x, sb.y); await page.keyboard.up('Shift')
  await page.keyboard.down('Control'); await page.mouse.click(sc.x, sc.y); await page.keyboard.up('Control')
  const m1 = await page.evaluate(() => [...window.__app.selection].sort())
  verifier('Maj + clic puis Ctrl + clic : trois objets sélectionnés', JSON.stringify(m1) === JSON.stringify([a, b, c].sort()), JSON.stringify(m1))
  await page.keyboard.down('Shift'); await page.mouse.click(sb.x, sb.y); await page.keyboard.up('Shift')
  const m2 = await page.evaluate(() => [...window.__app.selection].sort())
  verifier('Maj + clic sur un objet sélectionné : il en sort', JSON.stringify(m2) === JSON.stringify([a, c].sort()), JSON.stringify(m2))
  await page.keyboard.down('Control'); await page.mouse.click(sb.x, sb.y); await page.keyboard.up('Control')
  const m3 = await page.evaluate(() => [...window.__app.selection].sort())
  verifier('Ctrl + clic sur un autre : il entre', JSON.stringify(m3) === JSON.stringify([a, b, c].sort()), JSON.stringify(m3))
  // Maj + glisser un objet sélectionné : toute la sélection bouge, et reste entière
  const x0 = await page.evaluate(ids => ids.map(id => window.__app.forme(id).x), [a, b, c])
  await page.keyboard.down('Shift')
  await glisser(page, [[sb.x, sb.y], [sb.x + 20, sb.y + 5], [sb.x + 50, sb.y + 10]])
  await page.keyboard.up('Shift')
  await page.waitForTimeout(60)
  const x1 = await page.evaluate(ids => ({ x: ids.map(id => window.__app.forme(id).x), sel: window.__app.selection.size }), [a, b, c])
  verifier('Maj + glisser un objet sélectionné : les trois bougent de 50, la sélection reste entière', x1.sel === 3 && x1.x.every((x, i) => pres(x - x0[i], 50, 0.5)), JSON.stringify({ x0, x1 }))
  // Clic droit dans la sélection de trois : toujours trois, et leur menu commun
  // (lot 2, M6 : le menu « 3 objets » remplace le message du lot 1)
  const sb2 = await page.evaluate(ECRAN, { x: 410, y: 410 })       // le trait b a bougé de (50, 10)
  await page.mouse.click(sb2.x, sb2.y, { button: 'right' })
  await page.waitForTimeout(60)
  const cd = await page.evaluate(ETAT)
  const titre = () => document.querySelector('.panneau-forme .titre-selection')?.textContent ?? null
  const t3 = await page.evaluate(titre)
  verifier('Clic droit dans une sélection de 3 : elle reste entière, pas de menu de morceau, le menu « 3 objets »',
    cd.sel.length === 3 && cd.panneau && cd.options === '*' && !cd.menuPartie && t3 === '3 objets', JSON.stringify({ sel: cd.sel.length, options: cd.options, t3 }))
  // Clic droit sur le sommet d'une figure de la sélection : elle reste entière aussi
  const r = await page.evaluate(POSER, { x: 700, y: 300, l: 150, h: 100 })
  await page.evaluate(id => { window.__app.selection.add(id); window.__app.ui.maj() }, r)
  const sr = await page.evaluate(ECRAN, { x: 700, y: 300 })
  await page.mouse.click(sr.x + 8, sr.y + 1, { button: 'right' })
  await page.waitForTimeout(60)
  const cd2 = await page.evaluate(ETAT)
  const t4 = await page.evaluate(titre)
  verifier('Clic droit près du sommet d\'une figure de la sélection : la sélection reste (4), pas de menu de sommet, le menu « 4 objets »', cd2.sel.length === 4 && !cd2.partie && !cd2.menuPartie && cd2.panneau && t4 === '4 objets', JSON.stringify({ sel: cd2.sel.length, partie: cd2.partie, t4 }))
  // Clic droit sur un objet hors de la sélection : ses options, seul
  const d = await page.evaluate(TRAIT, { x: 300, y: 600 })
  const sd = await page.evaluate(ECRAN, { x: 360, y: 600 })
  await page.mouse.click(sd.x, sd.y, { button: 'right' })
  await page.waitForTimeout(60)
  const cd3 = await page.evaluate(ETAT)
  verifier('Clic droit sur un objet hors de la sélection : lui seul, son panneau', cd3.sel.length === 1 && cd3.sel[0] === d && cd3.panneau, JSON.stringify({ sel: cd3.sel, panneau: cd3.panneau }))
  // Maj + glisser dans le vide : encadrer (ajoute à la sélection)
  await page.mouse.click(1000, 650)          // dans le vide : ferme le panneau
  await page.mouse.click(1000, 650)          // puis désélectionne
  await page.waitForTimeout(40)
  const s0 = await page.evaluate(ECRAN, { x: 250, y: 280 }), s1 = await page.evaluate(ECRAN, { x: 560, y: 420 })
  await page.keyboard.down('Control')
  await glisser(page, [[s0.x, s0.y], [(s0.x + s1.x) / 2, (s0.y + s1.y) / 2], [s1.x, s1.y]])
  await page.keyboard.up('Control')
  const ca = await page.evaluate(() => [...window.__app.selection].sort())
  verifier('Ctrl + glisser dans le vide : encadre (deux traits)', JSON.stringify(ca) === JSON.stringify([a, b].sort()), JSON.stringify(ca))
  await page.screenshot({ path: `${D}/04-b9.png` })
  await ctx.close()
}

// =============== Au doigt : demande d'options dans une multi-sélection ===============
// Lot 2, M6 : l'événement contextmenu (l'appui long d'Android) n'ouvre plus
// rien ; le menu s'ouvre par demanderOptions, que l'appui long de MEM
// appellera (M8). Le menu « 2 objets » remplace le message du lot 1.
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'doigt')
  const a = await page.evaluate(TRAIT, { x: 300, y: 300 }), b = await page.evaluate(TRAIT, { x: 300, y: 400 })
  await page.evaluate(ids => { const app = window.__app; app.choisirOutil('selection'); for (const id of ids) app.selection.add(id); app.dernierPointeur = 'touch'; app.ui.maj() }, [a, b])
  const s = await page.evaluate(ECRAN, { x: 360, y: 300 })
  await page.evaluate(({ x, y }) => document.getElementById('zone').dispatchEvent(new MouseEvent('contextmenu', { clientX: x, clientY: y, bubbles: true, cancelable: true })), s)
  const c0 = await page.evaluate(ETAT)
  verifier('Au doigt, un contextmenu dans une sélection de 2 n\'ouvre rien (la sélection reste)', !c0.panneau && c0.sel.length === 2 && !c0.menuFlottant, JSON.stringify(c0))
  await page.evaluate(({ x, y }) => window.__app.demanderOptions({ clientX: x, clientY: y }, 'touch'), s)
  const c1 = await page.evaluate(ETAT)
  const t = await page.evaluate(() => document.querySelector('.panneau-forme .titre-selection')?.textContent ?? null)
  verifier('Au doigt, demanderOptions dans une sélection de 2 : le menu « 2 objets », la sélection reste entière', c1.panneau && c1.options === '*' && c1.sel.length === 2 && t === '2 objets', JSON.stringify({ c1, t }))
  await ctx.close()
}

// =============== Non-régression : Désigner, double-clic à la Sélection, stylet et doigt ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'divers')
  const cdp = await ctx.newCDPSession(page)
  const A = await page.evaluate(POSER, { x: 300, y: 250, l: 200, h: 120 })
  const seg = await page.evaluate(() => { const a = window.__app; const f = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: 700, y: 200 }, { x: 700, y: 500 }] }); a.tableau.nouveauGeste(); a.tableau.poser(a.page, f); return f.id })
  // Sélection : le double-clic natif ouvre toujours le panneau
  await page.keyboard.press('v')
  const surA = await page.evaluate(ECRAN, { x: 400, y: 250 })
  await page.mouse.dblclick(surA.x, surA.y)
  await page.waitForTimeout(100)
  const d0 = await page.evaluate(ETAT)
  verifier('Sélection : un double-clic sur une figure ouvre son panneau', d0.panneau && d0.options === A, JSON.stringify({ panneau: d0.panneau, options: d0.options }))
  // Transformer → Désigner : le clic sur la droite est pour le panneau, qui reste
  await page.click('.panneau-forme button:has-text("Transformer")')
  await page.waitForTimeout(60)
  await page.click('.panneau-forme .designer-axe')
  await page.waitForTimeout(60)
  const sSeg = await page.evaluate(ECRAN, { x: 700, y: 350 })
  await page.mouse.click(sSeg.x, sSeg.y)
  await page.waitForTimeout(100)
  const d1 = await page.evaluate(id => ({ panneau: !document.querySelector('.panneau-forme').hidden, axe: document.querySelector('.panneau-forme .t-axe')?.value, attendu: 'seg:' + id, placement: !!window.__app.placement }), seg)
  verifier('Transformer → Désigner, clic sur la droite : le panneau reste, l\'axe est choisi', d1.panneau && d1.axe === d1.attendu && !d1.placement, JSON.stringify(d1))
  // Tracer un axe (deux clics au Stylo) : posé, le panneau reste
  await page.keyboard.press('p')
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.options = id; a.ui.maj() }, A)
  await page.waitForTimeout(60)
  if (await page.$('.panneau-forme .tracer-axe') === null) { await page.click('.panneau-forme button:has-text("Transformer")'); await page.waitForTimeout(60) }
  const n0 = await page.evaluate(() => window.__app.formes.length)
  await page.click('.panneau-forme .tracer-axe')
  await page.mouse.click(1000, 200); await page.waitForTimeout(40); await page.mouse.click(1000, 450)
  await page.waitForTimeout(100)
  const d2 = await page.evaluate(() => ({ n: window.__app.formes.length, panneau: !document.querySelector('.panneau-forme').hidden, axe: document.querySelector('.panneau-forme .t-axe')?.value }))
  verifier('Transformer → Tracer un axe (deux clics) au Stylo : l\'axe est posé, le panneau reste', d2.n === n0 + 1 && d2.panneau && /^seg:/.test(d2.axe ?? ''), JSON.stringify({ n0, d2 }))
  await page.mouse.click(1200, 600)            // ferme le panneau, sans encre
  await page.waitForTimeout(60)

  // Le stylet (CDP) : double appui sur une figure → son panneau, aucun point
  const stylet = (type, x, y) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, force: 0.5 })
  const n1 = await page.evaluate(() => window.__app.formes.length)
  await stylet('mousePressed', surA.x, surA.y); await stylet('mouseReleased', surA.x, surA.y)
  await page.waitForTimeout(80)
  await stylet('mousePressed', surA.x + 3, surA.y + 2); await stylet('mouseReleased', surA.x + 3, surA.y + 2)
  await page.waitForTimeout(450)
  const d3 = await page.evaluate(ETAT)
  verifier('Stylet : deux touchers rapprochés sur une figure → son panneau, aucun point', d3.n === n1 && d3.panneau && d3.options === A, JSON.stringify({ n1, n: d3.n, panneau: d3.panneau }))
  await page.mouse.click(1200, 600)
  await page.waitForTimeout(60)
  // Un toucher au stylet puis Échap : le point est posé tout de suite
  await stylet('mousePressed', surA.x, surA.y); await stylet('mouseReleased', surA.x, surA.y)
  await page.keyboard.press('Escape')
  const d4 = await page.evaluate(() => ({ n: window.__app.formes.length, direct: !!(window.__app.rendu.monTrait || window.__app.rendu.enAttente) }))
  verifier('Un toucher au stylet sur une figure puis Échap : le point est posé aussitôt', d4.n === n1 + 1 && !d4.direct, JSON.stringify({ n1, d4 }))
  await page.keyboard.press('Escape')        // rend le Stylo
  await page.keyboard.press('p')
  // Au doigt (il dessine : aucun stylet sur l'écran), deux touchers à 10 px sur la figure → le panneau
  // (le double-clic au Stylo est serré depuis le rapport « regressions » : 14 px au doigt au plus)
  await page.evaluate(() => { localStorage.setItem('mem-stylet-direct', '0'); window.__app.choisirDoigt('dessine') })
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 0, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const n2 = await page.evaluate(() => window.__app.formes.length)
  await touche('touchStart', [[surA.x, surA.y]]); await touche('touchEnd', [])
  await page.waitForTimeout(80)
  await touche('touchStart', [[surA.x + 8, surA.y + 6]]); await touche('touchEnd', [])
  await page.waitForTimeout(450)
  const d5 = await page.evaluate(ETAT)
  verifier('Le doigt qui dessine : deux touchers à 10 px sur une figure → son panneau, aucun point', d5.n === n2 && d5.panneau && d5.options === A, JSON.stringify({ n2, n: d5.n, panneau: d5.panneau }))
  // Le doigt qui déplace, panneau ouvert : un toucher dans le vide le ferme, la sélection reste
  await page.evaluate(() => window.__app.choisirDoigt('deplace'))
  await touche('touchStart', [[1100, 600]]); await touche('touchEnd', [])
  await page.waitForTimeout(80)
  const d6 = await page.evaluate(ETAT)
  verifier('Le doigt qui déplace, panneau ouvert : un toucher dans le vide ferme le panneau, rien d\'autre', !d6.panneau && d6.sel.length === 1 && d6.n === n2, JSON.stringify({ panneau: d6.panneau, sel: d6.sel }))
  await ctx.close()
}

await nav.close()
verifier('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
process.exit(echecs.length ? 1 : 0)
