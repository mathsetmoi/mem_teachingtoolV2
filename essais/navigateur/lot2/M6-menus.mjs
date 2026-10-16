// Essais au navigateur du morceau M6 du lot 2 : le menu complet ouvert de la
// même façon partout. Le clic droit l'ouvre à l'APPUI du bouton (le bouton du
// stylet en est un ; sur Mac, Ctrl + clic), jamais sur l'événement contextmenu
// seul (Windows Ink l'envoie au lever d'un stylet tenu immobile ; Android à
// l'appui long du doigt). Le double-clic et le double appui ouvrent le même
// menu ; une formule a le sien (Modifier, couleur et taille), plusieurs objets
// le leur (« N objets » : couleur, épaisseur, pointillés en une étape,
// Dupliquer, Copier, Couper, Supprimer) ; un clic droit dans le vide ouvre le
// menu de la page (Coller ici, Tout sélectionner, Tout voir) ; rien sur un
// instrument.
// Souris, tablette graphique (stylet CDP sans écran tactile), doigt, Mac.
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
const attendre = ms => new Promise(r => setTimeout(r, ms))

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
  })
  const cdp = await ctx.newCDPSession(page)
  return { page, cdp }
}
const contexte = (o = {}) => nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })

const ETAT = () => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), pm = document.querySelector('.menu-flottant[aria-label="Page"]')
  return {
    n: a.formes.length, ids: a.formes.map(f => f.id), sel: [...a.selection].sort(), options: a.options, partie: a.partie, outil: a.outil,
    panneau: !pn.hidden, label: pn.getAttribute('aria-label'), titre: pn.querySelector('.titre-selection')?.textContent ?? null,
    // (lot 3, P7 : « Copier en image », puis « Envoyer vers… » du morceau P8,
    // s'ajoutent au menu complet, juste avant Supprimer ; depuis les
    // corrections « regressions », dans le petit menu d'un bouton ⋯ (Plus),
    // pour que la rangée reste sur une ligne : les listes exactes ci-dessous
    // se comparent sans lui, et sa place se vérifie à part, voir
    // placeDesSorties)
    boutons: [...pn.querySelectorAll('.ligne button')].map(b => b.textContent || b.getAttribute('aria-label')).filter(t => t !== 'Copier en image' && t !== 'Envoyer vers…' && !/^Plus :/.test(t)),
    boutonsTous: [...pn.querySelectorAll('.ligne button')].map(b => b.textContent || b.getAttribute('aria-label')),
    menuPage: !!pm && !pm.hidden,
    entrees: pm ? [...pm.querySelectorAll('.menu-item')].map(b => ({ t: b.querySelector('.libelle').firstChild.textContent, inactif: b.getAttribute('aria-disabled') === 'true' })) : [],
    menuPartie: !document.querySelector('.menu-partie').hidden, dialogue: !!document.querySelector('dialog[open]'),
    pile: a.tableau.annulationDe(a.page)?.undoStack.length ?? 0, film: a.tableau.film.length,
  }
}
const etat = page => page.evaluate(ETAT)
/** (lot 3) Le bouton ⋯ (« Plus : copier en image…, envoyer vers… », son
 *  menu : « Copier en image », « Envoyer vers… ») juste après `apres`
 *  (Copier, ou Couper pour plusieurs objets), puis Supprimer en dernier */
function placeDesSorties(e, apres = 'Copier') {
  const l = e.boutonsTous, i = l.findIndex(t => /^Plus :/.test(t))
  const suite = l.slice(i + 1)
  return i > 0 && l[i - 1] === apres && suite.length === 1 && /^Supprimer/.test(suite[0]) && !l.includes('Copier en image') && !l.includes('Envoyer vers…')
}
const forme = (page, id) => page.evaluate(id => { const f = window.__app.formes.find(x => x.id === id); return f && JSON.parse(JSON.stringify(f)) }, id)
/** Le point du monde (x, y) en coordonnées de la fenêtre */
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
/** Pose un objet en un geste ; rend son identifiant */
const POSER = o => {
  const a = window.__app, t = a.tableau
  const id = (o.type[0].toUpperCase()) + Math.random().toString(36).slice(2, 8)
  let f
  if (o.type === 'triangle') {
    f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + 160, y: o.y }, { x: o.x, y: o.y + 120 }] })
    if (o.noms) { f.noms = o.noms; f.sommets = true }
  } else if (o.type === 'formule') {
    f = { id, type: 'formule', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, latex: o.latex ?? 'x^2+1', couleur: '#1b2230', taille: 28 }
  } else if (o.type === 'segment') {
    f = { id, type: 'segment', x: o.x, y: o.y, dx: 150, dy: 0, z: Date.now(), auteur: t.moi, couleur: '#1b2230', taille: 4.5 }
  } else {
    f = { id, type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 0, 0.5, 80, 0, 0.5, 120, 0, 0.5],
      couleur: '#1b2230', taille: o.surligneur ? 22.5 : 4.5, opacite: o.surligneur ? 0.35 : 1, pression: false }
  }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}
const poser = (page, o) => page.evaluate(POSER, o)
const IMPORTER = async () => {
  const a = window.__app
  const cv = Object.assign(document.createElement('canvas'), { width: 120, height: 60 })
  const g = cv.getContext('2d'); g.fillStyle = '#d0342c'; g.fillRect(0, 0, 120, 60)
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
  const avant = new Set(a.formes.map(f => f.id))
  await a.importerImage(blob)
  return a.formes.find(f => !avant.has(f.id) && f.type === 'image').id
}
async function droit(page, p) { await page.mouse.click(p.x, p.y, { button: 'right' }); await page.waitForTimeout(80) }
async function clic(page, p, o = {}) { await page.mouse.click(p.x, p.y, o); await page.waitForTimeout(80) }
async function clicMaj(page, p) { await page.keyboard.down('Shift'); await page.mouse.click(p.x, p.y); await page.keyboard.up('Shift'); await page.waitForTimeout(60) }
/** Clique un bouton du menu complet (par son texte, ou son aria-label) */
async function bouton(page, texte) {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('.panneau-forme button')].find(x => x.textContent === t || x.getAttribute('aria-label') === t)
    if (!b) return false
    b.click(); return true
  }, texte)
  await page.waitForTimeout(80)
  return ok
}
/** Clique une entrée du menu de la page */
async function entree(page, texte) {
  const ok = await page.evaluate(t => {
    const b = [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].find(x => x.querySelector('.libelle').firstChild.textContent === t)
    if (!b) return false
    b.click(); return true
  }, texte)
  await page.waitForTimeout(120)
  return ok
}
const zoneVers = (page, s) => page.evaluate(s => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left + s.x, y: r.top + s.y } }, s)
const pres = (a, b, e = 1.5) => Math.abs(a - b) <= e
const ROUGE = '#d0342c', NOIR = '#1b2230', BLEU = '#1f5fbf'

// =============== 1. Souris : le Stylo en main, puis la Sélection ===============
{
  const ctx = await contexte()
  const { page } = await charger(ctx, 'souris')
  const T1 = await poser(page, { type: 'trait', x: 300, y: 200 })
  const T2 = await poser(page, { type: 'trait', x: 300, y: 300 })
  const T3 = await poser(page, { type: 'trait', x: 300, y: 400 })
  const Tri = await poser(page, { type: 'triangle', x: 650, y: 250, noms: ['A', 'B', 'C'] })
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const s1 = await ecranDe(page, 360, 200), s2 = await ecranDe(page, 360, 300), s3 = await ecranDe(page, 360, 400)

  // ----- Stylo : clic droit sur un trait, dans le vide, dans un triangle -----
  let e0 = await etat(page)
  await droit(page, s1)
  let e = await etat(page)
  verifier('Stylo : clic droit sur un trait → son menu complet, lui seul sélectionné, sans encre',
    e.panneau && e.options === T1 && JSON.stringify(e.sel) === JSON.stringify([T1]) && !e.menuPage && e.n === e0.n, JSON.stringify(e))
  verifier('… le menu du trait : Contour, Transformer, Dupliquer puis Copier, Supprimer',
    JSON.stringify(e.boutons) === JSON.stringify(['Contour', 'Transformer', 'Dupliquer', 'Copier', 'Supprimer (Suppr)']), JSON.stringify(e.boutons))
  verifier('… (lot 3) ⋯ (Copier en image, Envoyer vers…) juste après Copier, avant Supprimer', placeDesSorties(e), JSON.stringify(e.boutonsTous))
  // (lot 3, P3 : le menu de la page est plus haut — « Dupliquer la page »,
  // puis d'autres entrées des morceaux suivants — ; le point visé est plus
  // haut sur l'écran, pour qu'il tienne encore dessous)
  const vide = await ecranDe(page, 500, 120)
  await droit(page, vide)
  e = await etat(page)
  const rect = await page.evaluate(() => { const r = document.querySelector('.menu-flottant[aria-label="Page"]').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
  // (lot 3, P3 : le menu de la page a des entrées de plus après « Tout voir »
  // — Dupliquer la page, puis d'autres morceaux du lot 3 —, on compare ses
  // trois premières)
  verifier('Stylo : clic droit dans le vide → le menu de la page (Coller ici, Tout sélectionner, Tout voir), le menu du trait se ferme',
    e.menuPage && !e.panneau && JSON.stringify(e.entrees.slice(0, 3).map(x => x.t)) === JSON.stringify(['Coller ici', 'Tout sélectionner', 'Tout voir']), JSON.stringify(e))
  verifier('… « Coller ici » est grisé tant que rien n\'est copié ; « Tout sélectionner » ne l\'est pas', e.entrees[0].inactif && !e.entrees[1].inactif, JSON.stringify(e.entrees))
  verifier('… posé au point de l\'appui, à sa droite et vers le bas, comme le menu du système', rect.left >= vide.x && rect.left <= vide.x + 12 && pres(rect.top, vide.y, 2) && rect.right <= 1366 && rect.bottom <= 768, JSON.stringify({ rect, vide }))
  // Dans le coin en bas à droite : de l'autre côté, sans sortir de l'écran ni cacher le point
  await droit(page, { x: 1250, y: 630 })
  const coin = await page.evaluate(() => { const r = document.querySelector('.menu-flottant[aria-label="Page"]').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, vu: !document.querySelector('.menu-flottant[aria-label="Page"]').hidden } })
  verifier('… près du coin en bas à droite : à gauche du point, dans l\'écran, sans le cacher', coin.vu && coin.right <= 1250 && coin.left >= 8 && coin.bottom <= 760 && coin.top >= 8, JSON.stringify(coin))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  await droit(page, vide)
  e0 = e
  await clic(page, await ecranDe(page, 1100, 150))
  e = await etat(page)
  verifier('… le clic suivant, au Stylo, le ferme sans laisser d\'encre', !e.menuPage && e.n === e0.n, JSON.stringify({ menu: e.menuPage, n: e.n, n0: e0.n }))
  await droit(page, await ecranDe(page, 690, 300))
  e = await etat(page)
  verifier('Stylo : clic droit dans le vide d\'un triangle → le menu de la page (l\'intérieur ne compte qu\'à la Sélection)',
    e.menuPage && !e.panneau && e.options === null && !e.sel.length, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('Échap ferme le menu de la page, et seulement lui (l\'outil reste le Stylo)', !e.menuPage && e.outil === 'stylo', JSON.stringify(e))

  // ----- Le nom A d'un triangle : le menu du nom (lot 1) -----
  const nomA = await page.evaluate(([id]) => {
    const a = window.__app, f = a.formes.find(x => x.id === id), v = a.cam.versEcran(f.x, f.y)
    for (let dy = -45; dy <= 45; dy += 2) for (let dx = -45; dx <= 45; dx += 2) {
      const p = a.priseSous({ x: v.x + dx, y: v.y + dy }, { toutes: true })
      if (p?.prise.quoi === 'nom' && p.prise.i === 0 && p.f.id === id) return { x: v.x + dx, y: v.y + dy }
    }
    return null
  }, [Tri])
  if (nomA) {
    await droit(page, await zoneVers(page, nomA))
    e = await etat(page)
    verifier('Clic droit sur le nom A d\'un triangle → le menu du nom', e.menuPartie && e.partie?.prise.quoi === 'nom' && e.partie.prise.i === 0 && !e.panneau && !e.menuPage, JSON.stringify(e))
    await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  } else verifier('Le nom A du triangle est trouvé à l\'écran', false)

  // ----- Sélection : le triangle par son intérieur -----
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await droit(page, await ecranDe(page, 690, 300))
  e = await etat(page)
  verifier('Sélection : clic droit dans le vide du triangle → le menu du triangle', e.panneau && e.options === Tri && !e.menuPage, JSON.stringify(e))
  verifier('… avec Sommets, Codage, Contour, Fond, Transformer, Dupliquer, Copier, Supprimer',
    JSON.stringify(e.boutons) === JSON.stringify(['Sommets', 'Codage', 'Contour', 'Fond', 'Transformer', 'Dupliquer', 'Copier', 'Supprimer (Suppr)']), JSON.stringify(e.boutons))
  verifier('… (lot 3) ⋯ (Copier en image, Envoyer vers…) juste après Copier, avant Supprimer', placeDesSorties(e), JSON.stringify(e.boutonsTous))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Trois objets : Maj + clic, puis clic droit sur l'un -----
  await clic(page, s1); await clicMaj(page, s2); await clicMaj(page, s3)
  e = await etat(page)
  verifier('Maj + clic sur trois traits : trois objets sélectionnés', e.sel.length === 3, JSON.stringify(e.sel))
  await droit(page, s2)
  e = await etat(page)
  const trois = JSON.stringify([T1, T2, T3].sort())
  verifier('Clic droit sur l\'un d\'eux → le menu « 3 objets », la sélection reste entière, pas de menu de morceau',
    e.panneau && e.options === '*' && e.titre === '3 objets' && e.label === 'Options des 3 objets' && JSON.stringify(e.sel) === trois && !e.menuPartie && !e.menuPage, JSON.stringify(e))
  // Lot 5 (K4-groupes) : « Grouper » s'y ajoute, juste après « Couleur, épaisseur »
  verifier('… son contenu : Couleur, épaisseur, Grouper, Dupliquer, Copier, Couper, Supprimer',
    JSON.stringify(e.boutons) === JSON.stringify(['Couleur, épaisseur', 'Grouper', 'Dupliquer', 'Copier', 'Couper', 'Supprimer les 3 objets (Suppr)']), JSON.stringify(e.boutons))
  verifier('… (lot 3) ⋯ (Copier en image, Envoyer vers…) juste après Couper, avant Supprimer', placeDesSorties(e, 'Couper'), JSON.stringify(e.boutonsTous))
  const place = await page.evaluate(() => {
    const a = window.__app, r = document.getElementById('zone').getBoundingClientRect()
    const b = a.boiteDuContenu(a.formes.filter(f => a.selection.has(f.id))), s = a.cam.versEcran(b.x, b.y)
    const p = document.querySelector('.panneau-forme').getBoundingClientRect()
    return { haut: r.top + s.y, bas: p.bottom }
  })
  verifier('… posé au-dessus de toute la sélection', place.bas <= place.haut, JSON.stringify(place))

  // Rouge : les trois, une étape
  await bouton(page, 'Couleur, épaisseur')
  e0 = await etat(page)
  const sec = await page.evaluate(() => {
    const s = document.querySelector('.panneau-forme .section')
    return s && { pastilles: s.querySelectorAll('.pastille').length, tailles: s.querySelectorAll('.taille').length, pointilles: [...s.querySelectorAll('.option')].some(b => b.textContent === 'Pointillés'),
      noirActif: s.querySelector('.pastille[aria-label="Noir"]').classList.contains('actif'), moyenActif: s.querySelector('.taille[aria-label="Trait moyen"]').classList.contains('actif') }
  })
  verifier('« Couleur, épaisseur » : quatre couleurs, trois épaisseurs, pas de pointillés (aucune figure) ; le noir et le moyen sont actifs (tous les ont)',
    sec && sec.pastilles === 4 && sec.tailles === 3 && !sec.pointilles && sec.noirActif && sec.moyenActif, JSON.stringify(sec))
  await bouton(page, 'Rouge')
  e = await etat(page)
  const couleurs = async () => Promise.all([T1, T2, T3].map(async id => (await forme(page, id)).couleur))
  let c = await couleurs()
  verifier('Rouge → les trois rougissent, en une seule étape d\'annulation, le menu reste ouvert',
    c.every(x => x === ROUGE) && e.pile === e0.pile + 1 && e.panneau && e.options === '*', JSON.stringify({ c, pile: [e0.pile, e.pile] }))
  const rougeActif = await page.evaluate(() => document.querySelector('.panneau-forme .pastille[aria-label="Rouge"]')?.classList.contains('actif'))
  verifier('… la pastille rouge est maintenant active', rougeActif)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  c = await couleurs()
  verifier('Un seul Ctrl+Z leur rend leur couleur à tous les trois', c.every(x => x === NOIR), JSON.stringify(c))

  // Couper, puis « Coller ici » (clic droit dans le vide)
  await clic(page, s1); await clicMaj(page, s2); await clicMaj(page, s3)
  await droit(page, s2)
  e0 = await etat(page)
  await bouton(page, 'Couper')
  e = await etat(page)
  verifier('Couper (menu « 3 objets ») : les trois partent, le menu se ferme', e.n === e0.n - 3 && ![T1, T2, T3].some(id => e.ids.includes(id)) && !e.panneau && !e.sel.length, JSON.stringify(e))
  const P = await ecranDe(page, 520, 600)
  await droit(page, P)
  e = await etat(page)
  verifier('Clic droit dans le vide : « Coller ici » n\'est plus grisé', e.menuPage && !e.entrees[0].inactif, JSON.stringify(e.entrees))
  await entree(page, 'Coller ici')
  e = await etat(page)
  const colle = await page.evaluate(P => {
    const a = window.__app, r = document.getElementById('zone').getBoundingClientRect()
    const b = a.boiteDuContenu(a.formes.filter(f => a.selection.has(f.id))), m = a.cam.versMonde(P.x - r.left, P.y - r.top)
    return { cx: b.x + b.l / 2, cy: b.y + b.h / 2, mx: m.x, my: m.y }
  }, P)
  verifier('« Coller ici » les remet au point visé (le milieu de leur boîte sous le clic droit), sélectionnés, le menu fermé',
    e.n === e0.n && e.sel.length === 3 && pres(colle.cx, colle.mx) && pres(colle.cy, colle.my) && !e.menuPage, JSON.stringify({ e, colle }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Glisser la sélection : le menu se cache, puis revient -----
  await page.evaluate(() => { const a = window.__app; for (const f of a.formes.filter(f => f.type === 'trait')) a.selection.add(f.id); a.ouvrirOptionsSelection() })
  const un = await page.evaluate(() => [...window.__app.selection][0])
  const pt = await page.evaluate(id => { const a = window.__app, f = a.formes.find(x => x.id === id), r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(f.x + 60, f.y); return { x: r.left + s.x, y: r.top + s.y } }, un)
  const avantGlisser = await etat(page)
  await page.mouse.move(pt.x, pt.y); await page.mouse.down()
  await page.mouse.move(pt.x + 20, pt.y + 10, { steps: 3 }); await page.mouse.move(pt.x + 40, pt.y + 20, { steps: 3 })
  const pendant = await etat(page)
  await page.mouse.up(); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Le menu commun se cache pendant qu\'on glisse la sélection, et revient au lâcher (toujours « 3 objets »)',
    avantGlisser.panneau && !pendant.panneau && e.panneau && e.options === '*' && e.titre === '3 objets', JSON.stringify({ a: avantGlisser.panneau, p: pendant.panneau, e: e.panneau, t: e.titre }))
  // Maj + clic sur l'un : il sort, le menu dit « 2 objets » ; encore un : le menu se ferme
  const sels = await page.evaluate(() => window.__app.formes.filter(f => window.__app.selection.has(f.id)).map(f => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(f.x + 60, f.y); return { x: r.left + s.x, y: r.top + s.y } }))
  await clicMaj(page, sels[0])
  e = await etat(page)
  verifier('Maj + clic sur l\'un d\'eux, menu ouvert : il sort de la sélection, le menu dit « 2 objets »', e.panneau && e.sel.length === 2 && e.titre === '2 objets', JSON.stringify(e))
  await clicMaj(page, sels[1])
  e = await etat(page)
  verifier('… encore un : la sélection n\'a plus plusieurs objets, le menu commun se ferme', !e.panneau && e.sel.length === 1 && e.options === null, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Double-clic sur un objet d'une sélection de plusieurs : le menu commun -----
  await page.evaluate(() => { const a = window.__app; for (const f of a.formes.filter(f => f.type === 'trait')) a.selection.add(f.id); a.ui.maj() })
  const n = (await etat(page)).sel.length
  await page.mouse.dblclick(sels[1].x, sels[1].y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Double-clic (Sélection) sur un objet d\'une sélection de plusieurs → leur menu commun', e.panneau && e.options === '*' && e.sel.length === n && e.titre === `${n} objets`, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Une formule -----
  const F = await poser(page, { type: 'formule', x: 900, y: 450, latex: 'x^2+1' })
  await page.waitForTimeout(150)
  const sF = await page.evaluate(id => { const a = window.__app, f = a.formes.find(x => x.id === id), b = a.rendu.boite(f), r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(b.x + b.l / 2, b.y + b.h / 2); return { x: r.left + s.x, y: r.top + s.y } }, F)
  await droit(page, sF)
  e = await etat(page)
  verifier('Formule : clic droit → son menu (Modifier, Couleur et taille, Dupliquer, Copier, Supprimer)',
    e.panneau && e.options === F && e.label === 'Options de la formule' && JSON.stringify(e.boutons) === JSON.stringify(['Modifier', 'Couleur et taille', 'Dupliquer', 'Copier', 'Supprimer (Suppr)']), JSON.stringify(e))
  verifier('… (lot 3) ⋯ (Copier en image, Envoyer vers…) juste après Copier, avant Supprimer', placeDesSorties(e), JSON.stringify(e.boutonsTous))
  await bouton(page, 'Couleur et taille')
  const secF = await page.evaluate(() => { const s = document.querySelector('.panneau-forme .section'); return s && { pastilles: s.querySelectorAll('.pastille').length, tailles: [...s.querySelectorAll('.option')].map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) } })
  verifier('… « Couleur et taille » : quatre couleurs, Petite, Normale (active), Grande', secF && secF.pastilles === 4 && JSON.stringify(secF.tailles) === JSON.stringify(['Petite', 'Normale*', 'Grande']), JSON.stringify(secF))
  e0 = await etat(page)
  await bouton(page, 'Grande')
  e = await etat(page)
  verifier('Grande → la formule passe à 40, en une étape', (await forme(page, F)).taille === 40 && e.pile === e0.pile + 1 && e.panneau, JSON.stringify({ t: (await forme(page, F)).taille, pile: [e0.pile, e.pile] }))
  await bouton(page, 'Bleu')
  verifier('Bleu → la formule devient bleue', (await forme(page, F)).couleur === BLEU)
  await bouton(page, 'Modifier')
  e = await etat(page)
  const saisie = await page.evaluate(() => document.querySelector('dialog[open] .saisie')?.value)
  verifier('Modifier → l\'éditeur de la formule (le menu se ferme)', e.dialogue && saisie === 'x^2+1' && !e.panneau, JSON.stringify({ d: e.dialogue, saisie, p: e.panneau }))
  await page.click('dialog[open] .secondaire'); await page.waitForTimeout(80)
  await page.mouse.dblclick(sF.x, sF.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Double-clic sur la formule → l\'éditeur directement (pas de menu)', e.dialogue && !e.panneau, JSON.stringify(e))
  await page.click('dialog[open] .secondaire'); await page.waitForTimeout(80)
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Un ancien segment (v0.1) -----
  const Sg = await poser(page, { type: 'segment', x: 900, y: 150 })
  await droit(page, await ecranDe(page, 975, 150))
  e = await etat(page)
  verifier('Un ancien segment a son menu (Contour, Transformer, Dupliquer, Copier, Supprimer)',
    e.panneau && e.options === Sg && JSON.stringify(e.boutons) === JSON.stringify(['Contour', 'Transformer', 'Dupliquer', 'Copier', 'Supprimer (Suppr)']), JSON.stringify(e))
  verifier('… (lot 3) ⋯ (Copier en image, Envoyer vers…) juste après Copier, avant Supprimer', placeDesSorties(e), JSON.stringify(e.boutonsTous))
  await bouton(page, 'Contour'); await bouton(page, 'Vert')
  verifier('… son contour change de couleur', (await forme(page, Sg)).couleur === '#1e8a4c')
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- La règle posée, un trait dessous : rien -----
  await page.evaluate(() => window.__app.basculerInstrument('regle'))
  await page.waitForTimeout(80)
  const corps = await page.evaluate(() => {
    const a = window.__app, r = document.getElementById('zone').getBoundingClientRect()
    for (let y = 120; y < 700; y += 6) for (let x = 200; x < 1300; x += 6) {
      const m = a.cam.versMonde(x, y), i = a.instrumentSous(m)
      if (i?.quoi === 'corps') return { m, x: r.left + x, y: r.top + y }
    }
    return null
  })
  if (corps) {
    const Tr = await poser(page, { type: 'trait', x: corps.m.x - 60, y: corps.m.y })
    await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.maj() })
    await droit(page, corps)
    e = await etat(page)
    verifier('Clic droit sur la règle posée (un trait dessous) → rien ne s\'ouvre, rien n\'est pris', !e.panneau && !e.menuPage && !e.menuPartie && !e.sel.length && e.ids.includes(Tr), JSON.stringify(e))
  } else verifier('Le corps de la règle est trouvé à l\'écran', false)
  await page.evaluate(() => window.__app.basculerInstrument('regle'))

  // ----- Bouton droit pressé pendant un trait (Stylo) : rien -----
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  e0 = await etat(page)
  const d0 = await ecranDe(page, 120, 560)
  await page.mouse.move(d0.x, d0.y); await page.mouse.down()
  await page.mouse.move(d0.x + 40, d0.y + 5, { steps: 4 })
  await page.mouse.down({ button: 'right' }); await page.waitForTimeout(60)
  await page.mouse.move(d0.x + 80, d0.y - 5, { steps: 4 })
  await page.mouse.up({ button: 'right' })
  await page.mouse.move(d0.x + 120, d0.y, { steps: 4 })
  await page.mouse.up(); await page.waitForTimeout(120)
  e = await etat(page)
  const long = await page.evaluate(ids => { const a = window.__app, f = a.formes.find(x => !ids.includes(x.id)); return f ? a.boiteDuContenu([f]).l : 0 }, e0.ids)
  verifier('Souris : le bouton droit pressé pendant un trait n\'ouvre rien, le trait continue jusqu\'au lever',
    !e.menuPage && !e.panneau && e.n === e0.n + 1 && long > 110, JSON.stringify({ menu: e.menuPage, p: e.panneau, n: [e0.n, e.n], long }))

  // ----- Le menu de la page : Tout sélectionner, Tout voir -----
  await droit(page, await ecranDe(page, 1100, 650))
  await entree(page, 'Tout sélectionner')
  e = await etat(page)
  verifier('Menu de la page : « Tout sélectionner » prend tout et passe à la Sélection', e.outil === 'selection' && e.sel.length === e.n && !e.menuPage, JSON.stringify({ o: e.outil, s: e.sel.length, n: e.n }))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  await page.evaluate(() => { const a = window.__app; a.cam.z = 4; a.cam.x = -2000; a.cam.y = -1500; a.rendu.toutRedessiner(); a.ui.maj() })
  await droit(page, { x: 1200, y: 650 })
  await entree(page, 'Tout voir')
  await page.waitForTimeout(450)
  const vue = await page.evaluate(() => { const a = window.__app, b = a.boiteDuContenu(), z = a.ui.zoneLibre(), p = a.cam.versEcran(b.x, b.y), q = a.cam.versEcran(b.x + b.l, b.y + b.h); return { z: a.cam.z, dedans: p.x >= z.x - 1 && p.y >= z.y - 1 && q.x <= z.x + z.l + 1 && q.y <= z.y + z.h + 1 } })
  verifier('Menu de la page : « Tout voir » montre toute la page', vue.z <= 1 && vue.dedans, JSON.stringify(vue))
  // Une page vide : « Tout sélectionner » grisé
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(100)
  await droit(page, { x: 700, y: 450 })
  e = await etat(page)
  verifier('Page vide : « Tout sélectionner » est grisé ; « Coller ici » ne l\'est pas (une copie est gardée)', e.menuPage && e.entrees[1].inactif && !e.entrees[0].inactif, JSON.stringify(e.entrees))
  await entree(page, 'Tout sélectionner')
  e = await etat(page)
  verifier('… le toucher ne fait rien (le menu reste ouvert, rien n\'est pris)', e.menuPage && !e.sel.length, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Plusieurs objets mêlés : un trait, un trait de surligneur, un triangle, une formule, une image -----
  const M1 = await poser(page, { type: 'trait', x: 300, y: 200 })
  const M2 = await poser(page, { type: 'trait', x: 300, y: 300, surligneur: true })
  // (Adapté aux réglages par défaut, retouches après le lot 5 : le trait est fin au démarrage ;
  // le triangle prend l'épaisseur choisie : on choisit « Moyen », comme les deux traits)
  await page.evaluate(() => { window.__app.taille = 4.5 })
  const M3 = await poser(page, { type: 'triangle', x: 600, y: 200 })
  const M4 = await poser(page, { type: 'formule', x: 600, y: 420 })
  const M5 = await page.evaluate(IMPORTER)
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); for (const f of a.formes) a.selection.add(f.id); a.ui.maj() })
  await droit(page, await ecranDe(page, 360, 200))
  e = await etat(page)
  verifier('Cinq objets mêlés : clic droit sur l\'un → « 5 objets »', e.panneau && e.titre === '5 objets' && e.sel.length === 5, JSON.stringify(e))
  await bouton(page, 'Couleur, épaisseur')
  const secM = await page.evaluate(() => { const s = document.querySelector('.panneau-forme .section'); return s && { pastilles: s.querySelectorAll('.pastille').length, tailles: s.querySelectorAll('.taille').length, pointilles: [...s.querySelectorAll('.option')].some(b => b.textContent === 'Pointillés'), moyen: s.querySelector('.taille[aria-label="Trait moyen"]').classList.contains('actif') } })
  verifier('… couleurs, épaisseurs et pointillés (il y a une figure) ; l\'épaisseur moyenne est active (le surligneur compte cinq fois)', secM && secM.pastilles === 4 && secM.tailles === 3 && secM.pointilles && secM.moyen, JSON.stringify(secM))
  e0 = await etat(page)
  await bouton(page, 'Trait épais')
  let t = await Promise.all([M1, M2, M3, M4].map(async id => (await forme(page, id)).taille))
  e = await etat(page)
  verifier('Épais → trait 9, surligneur 45, triangle 9 ; la formule garde sa taille ; une étape', JSON.stringify(t) === '[9,45,9,28]' && e.pile === e0.pile + 1, JSON.stringify({ t, pile: [e0.pile, e.pile] }))
  await bouton(page, 'Pointillés')
  e = await etat(page)
  const pointilles = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .section .option')].find(b => b.textContent === 'Pointillés')?.getAttribute('aria-pressed'))
  verifier('Pointillés → le triangle en pointillés, une étape ; le bouton est actif', (await forme(page, M3)).tirets === true && e.pile === e0.pile + 2 && pointilles === 'true', JSON.stringify({ pointilles, pile: e.pile }))
  await bouton(page, 'Bleu')
  const cs = await Promise.all([M1, M2, M3, M4, M5].map(async id => (await forme(page, id)).couleur ?? null))
  verifier('Bleu → trait, surligneur, triangle et formule bleus ; l\'image n\'a pas de couleur', JSON.stringify(cs) === JSON.stringify([BLEU, BLEU, BLEU, BLEU, null]), JSON.stringify(cs))
  e0 = await etat(page)
  await bouton(page, 'Bleu')
  e = await etat(page)
  verifier('Bleu encore, sur des objets déjà bleus : pas d\'étape pour rien', e.pile === e0.pile && e.film === e0.film, JSON.stringify({ pile: [e0.pile, e.pile], film: [e0.film, e.film] }))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  const apres = await Promise.all([M1, M3, M4].map(async id => (await forme(page, id)).couleur))
  verifier('Un Ctrl+Z défait le bleu de tous d\'un coup', apres.every(x => x === NOIR), JSON.stringify(apres))
  // Deux formules seules : « Couleur » (une formule n'a pas d'épaisseur)
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); for (const f of a.formes.filter(f => f.type === 'formule')) a.selection.add(f.id) })
  const F2 = await poser(page, { type: 'formule', x: 800, y: 520 })
  await page.evaluate(id => { const a = window.__app; a.selection.add(id); a.ouvrirOptionsSelection() }, F2)
  e = await etat(page)
  verifier('Deux formules : leur menu commun dit « Couleur » (pas d\'épaisseur)', e.panneau && e.titre === '2 objets' && e.boutons.includes('Couleur') && !e.boutons.includes('Couleur, épaisseur'), JSON.stringify(e.boutons))
  // Deux images seules : pas de « Couleur, épaisseur »
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(80)
  await page.evaluate(IMPORTER)
  await page.evaluate(() => { const a = window.__app; const f = a.formes[0]; a.tableau.nouveauGeste(); a.tableau.modifier(a.page, [{ id: f.id, patch: { x: f.x - 200 } }]) })
  await page.evaluate(IMPORTER)
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); for (const f of a.formes) a.selection.add(f.id); a.ouvrirOptionsSelection() })
  e = await etat(page)
  verifier('Deux images : leur menu commun n\'a pas « Couleur, épaisseur » (rien à régler)', e.panneau && e.titre === '2 objets' && !e.boutons.includes('Couleur, épaisseur') && e.boutons.includes('Dupliquer'), JSON.stringify(e.boutons))
  e0 = await etat(page)
  await bouton(page, 'Dupliquer')
  e = await etat(page)
  verifier('Dupliquer (menu commun) : deux copies, sélectionnées, en une étape ; le menu se ferme (il réglait les originaux)', e.n === e0.n + 2 && e.sel.length === 2 && e.pile === e0.pile + 1 && !e.panneau && e.options === null, JSON.stringify(e))
  await ctx.close()
}

// =============== 2. Tablette graphique (stylet CDP, écran non tactile) ===============
{
  const ctx = await contexte()
  const { page, cdp } = await charger(ctx, 'wacom')
  const tactile = await page.evaluate(() => navigator.maxTouchPoints)
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  const contextmenu = p => page.evaluate(p => document.getElementById('zone').dispatchEvent(new MouseEvent('contextmenu', { clientX: p.x, clientY: p.y, button: 2, bubbles: true, cancelable: true })), p)
  const T = await poser(page, { type: 'trait', x: 300, y: 250 })
  const F = await poser(page, { type: 'formule', x: 300, y: 450 })
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await page.waitForTimeout(100)
  const sT = await ecranDe(page, 360, 250)

  // Windows Ink : le stylet tenu immobile 1,2 s, puis levé, puis un clic droit au lever
  let e0 = await etat(page)
  const v = await ecranDe(page, 900, 500)
  await stylet.bas(v.x, v.y); await attendre(1200); await stylet.haut(v.x, v.y)
  await contextmenu(v); await page.waitForTimeout(80)
  let e = await etat(page)
  verifier(`Tablette graphique (maxTouchPoints ${tactile}) : stylet tenu 1,2 s dans le vide puis levé, suivi d'un contextmenu (Windows Ink) → rien ne s'ouvre`,
    tactile === 0 && !e.menuPage && !e.panneau && !e.menuPartie, JSON.stringify(e))
  await stylet.bas(sT.x, sT.y); await attendre(1200); await stylet.haut(sT.x, sT.y)
  await contextmenu(sT); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… de même tenu 1,2 s sur un trait : son menu ne s\'ouvre pas', !e.menuPage && !e.panneau && e.options === null, JSON.stringify(e))
  // Les deux points d'encre laissés par le stylet tenu s'en vont (ils cacheraient la suite)
  await page.evaluate(() => { window.__app.annuler(); window.__app.annuler() })
  verifier('… chaque appui tenu a laissé son point d\'encre (deux Ctrl+Z les retirent)', (await etat(page)).n === e0.n, JSON.stringify({ n: (await etat(page)).n, n0: e0.n }))

  // Un contextmenu pendant un trait : rien, le trait continue
  e0 = await etat(page)
  const a0 = await ecranDe(page, 300, 600)
  await stylet.bas(a0.x, a0.y)
  for (let k = 1; k <= 6; k++) await stylet.va(a0.x + k * 10, a0.y)
  await contextmenu({ x: a0.x + 60, y: a0.y })
  for (let k = 7; k <= 14; k++) await stylet.va(a0.x + k * 10, a0.y)
  await stylet.haut(a0.x + 140, a0.y); await page.waitForTimeout(120)
  e = await etat(page)
  const long = await page.evaluate(ids => { const a = window.__app, f = a.formes.find(x => !ids.includes(x.id)); return f ? a.boiteDuContenu([f]).l : 0 }, e0.ids)
  verifier('Un contextmenu pendant un trait (stylet posé) → rien, le trait continue jusqu\'au lever', !e.menuPage && !e.panneau && e.n === e0.n + 1 && long > 130, JSON.stringify({ n: [e0.n, e.n], long, m: e.menuPage }))

  // Le bouton du stylet : un clic droit
  e0 = await etat(page)
  await stylet.bas(sT.x, sT.y, { button: 'right', buttons: 2 }); await stylet.haut(sT.x, sT.y, { button: 'right', buttons: 0 }); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Bouton du stylet sur un trait (Stylo en main) → son menu, sans encre', e.panneau && e.options === T && e.n === e0.n, JSON.stringify(e))
  const sF = await page.evaluate(id => { const a = window.__app, f = a.formes.find(x => x.id === id), b = a.rendu.boite(f), r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(b.x + b.l / 2, b.y + b.h / 2); return { x: r.left + s.x, y: r.top + s.y } }, F)
  await stylet.bas(sF.x, sF.y, { button: 'right', buttons: 2 }); await stylet.haut(sF.x, sF.y, { button: 'right', buttons: 0 }); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Bouton du stylet sur une formule → le menu de la formule', e.panneau && e.options === F && e.label === 'Options de la formule', JSON.stringify(e))
  await stylet.bas(v.x, v.y, { button: 'right', buttons: 2 }); await stylet.haut(v.x, v.y, { button: 'right', buttons: 0 }); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Bouton du stylet dans le vide → le menu de la page (celui de la formule se ferme)', e.menuPage && !e.panneau && e.n === e0.n, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // Le bouton du stylet pressé pendant un trait : rien
  e0 = await etat(page)
  const b0 = await ecranDe(page, 700, 620)
  await stylet.bas(b0.x, b0.y)
  for (let k = 1; k <= 5; k++) await stylet.va(b0.x + k * 10, b0.y)
  await stylet.bas(b0.x + 50, b0.y, { button: 'right', buttons: 3 })
  for (let k = 6; k <= 12; k++) await stylet.va(b0.x + k * 10, b0.y, { buttons: 3 })
  await stylet.haut(b0.x + 120, b0.y, { button: 'right', buttons: 1 })
  await stylet.haut(b0.x + 120, b0.y); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Le bouton du stylet pressé pendant un trait → rien ne s\'ouvre, le trait est posé', !e.menuPage && !e.panneau && e.n === e0.n + 1, JSON.stringify({ n: [e0.n, e.n], m: e.menuPage, p: e.panneau }))
  await ctx.close()
}

// =============== 3. Au doigt ===============
{
  const ctx = await contexte({ hasTouch: true })
  const { page, cdp } = await charger(ctx, 'doigt')
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 0, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const A = await poser(page, { type: 'trait', x: 300, y: 300 }), B = await poser(page, { type: 'trait', x: 300, y: 400 })
  await page.evaluate(ids => { const a = window.__app; a.choisirOutil('selection'); for (const id of ids) a.selection.add(id); a.dernierPointeur = 'touch'; a.ui.maj() }, [A, B])
  const sA = await ecranDe(page, 360, 300)
  await page.evaluate(p => document.getElementById('zone').dispatchEvent(new MouseEvent('contextmenu', { clientX: p.x, clientY: p.y, bubbles: true, cancelable: true })), sA)
  await page.waitForTimeout(60)
  let e = await etat(page)
  verifier('Doigt : un contextmenu (l\'appui long d\'Android) n\'ouvre plus rien (l\'appui long de MEM viendra au M8)', !e.panneau && !e.menuPage && e.sel.length === 2, JSON.stringify(e))
  await page.evaluate(p => window.__app.demanderOptions({ clientX: p.x, clientY: p.y }, 'touch'), sA)
  e = await etat(page)
  verifier('demanderOptions au doigt sur un objet d\'une sélection de deux → le menu « 2 objets »', e.panneau && e.options === '*' && e.titre === '2 objets' && e.sel.length === 2, JSON.stringify(e))
  await page.evaluate(() => { const a = window.__app; a.options = null; a.ui.maj() })
  await touche('touchStart', [[sA.x, sA.y]]); await touche('touchEnd', [])
  await attendre(90)
  await touche('touchStart', [[sA.x + 3, sA.y + 2]]); await touche('touchEnd', [])
  await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Double appui au doigt sur un objet d\'une sélection de deux → leur menu commun, la sélection reste entière', e.panneau && e.options === '*' && e.sel.length === 2, JSON.stringify(e))
  const vide = await ecranDe(page, 900, 600)
  await page.evaluate(p => window.__app.demanderOptions({ clientX: p.x, clientY: p.y }, 'touch'), vide)
  e = await etat(page)
  verifier('demanderOptions au doigt dans le vide → le menu de la page (le menu commun se ferme)', e.menuPage && !e.panneau, JSON.stringify(e))
  await touche('touchStart', [[1100, 150]]); await touche('touchEnd', []); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… un toucher ailleurs le ferme, sans rien faire d\'autre', !e.menuPage && e.n === 2, JSON.stringify(e))
  // Au doigt qui déplace (sous le Stylo) : le triangle se vise par son intérieur
  const Tri = await poser(page, { type: 'triangle', x: 600, y: 200 })
  await page.evaluate(() => { const a = window.__app; a.choisirDoigt('deplace'); a.choisirOutil('stylo') })
  const dans = await ecranDe(page, 640, 250)
  await page.evaluate(p => window.__app.demanderOptions({ clientX: p.x, clientY: p.y }, 'touch'), dans)
  e = await etat(page)
  verifier('Doigt qui déplace (Stylo en main) : dans le vide d\'un triangle → le menu du triangle', e.panneau && e.options === Tri, JSON.stringify(e))
  await page.evaluate(p => window.__app.demanderOptions({ clientX: p.x, clientY: p.y }, 'mouse'), dans)
  e = await etat(page)
  verifier('… à la souris au même endroit, le Stylo en main : le menu de la page', e.menuPage && !e.panneau, JSON.stringify(e))
  await ctx.close()
}

// =============== 4. Mac : Ctrl + clic est le clic droit ===============
{
  const ctx = await contexte()
  await ctx.addInitScript(() => Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }))
  const { page } = await charger(ctx, 'mac')
  const T = await poser(page, { type: 'trait', x: 300, y: 250 })
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const sT = await ecranDe(page, 360, 250)
  const e0 = await etat(page)
  await page.keyboard.down('Control'); await page.mouse.click(sT.x, sT.y); await page.keyboard.up('Control'); await page.waitForTimeout(80)
  let e = await etat(page)
  verifier('Mac : Ctrl + clic sur un trait (Stylo en main) → son menu, sans encre', e.panneau && e.options === T && e.n === e0.n, JSON.stringify(e))
  const v = await ecranDe(page, 900, 500)
  await page.keyboard.down('Control'); await page.mouse.click(v.x, v.y); await page.keyboard.up('Control'); await page.waitForTimeout(80)
  e = await etat(page)
  const coller = await page.evaluate(() => document.querySelector('.menu-flottant[aria-label="Page"] .touche')?.textContent)
  verifier('Mac : Ctrl + clic dans le vide → le menu de la page, les raccourcis avec ⌘', e.menuPage && e.n === e0.n && coller === '⌘ + V', JSON.stringify({ e, coller }))
  await ctx.close()
}

await nav.close()
if (erreurs.length) for (const e of erreurs) console.log('ÉCHEC erreur JS : ' + e)
const echecs = resultats.filter(r => !r.ok).length + erreurs.length
console.log(`\n${resultats.length - resultats.filter(r => !r.ok).length} / ${resultats.length} vérifications réussies${erreurs.length ? ` ; ${erreurs.length} erreur(s) JS` : ''}`)
process.exit(echecs ? 1 : 0)
