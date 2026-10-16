// Essai : les corrections de la vérification « données » du lot 5.
// A. Pendant le cours, au clavier et au menu : Ctrl + G, Ctrl + Maj + G
//    (Dégrouper), Ctrl + Z, Ctrl + Y ; Maj + L, « Déverrouiller » au menu du
//    clic droit, Ctrl + Z, Ctrl + Y ; puis un trait au Stylo. Toutes ces
//    étapes du film sont notées « réglage » (elles ne changent rien à
//    l'image) : la séance et la revue de la page comptent les seuls gestes
//    visibles, et le film élève n'a pas une étape qui ne montre rien
//    (chacune pose son trait).
// B. Le lendemain, en préparant : Ctrl + G, Ctrl + Maj + G, Ctrl + Z,
//    Ctrl + Y, Maj + L, « Déverrouiller », Ctrl + Z, Ctrl + Y, Ctrl + Z :
//    aucune séance fantôme ; la fenêtre Publier propose d'office le cours,
//    et lui seul, avec ses gestes ; la revue n'a pas un geste de plus.
// C. Le README ne dit plus que le cadre de taille et la rotation d'un groupe
//    manquent ; et c'est vrai : un groupe pris (un clic sur un membre) a le
//    cadre droit de sa boîte, quatre coins et la pastille ↻ ; un coin tiré à
//    la souris l'agrandit d'un bloc, la pastille le tourne d'un bloc, une
//    étape d'annulation et une étape du film (un geste) chacun.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/lot5/corrections-donnees'
const DEV = process.env.URL ?? 'http://localhost:5173/'
mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte() {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await c.addInitScript(() => {
    window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined
    Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 })
    // L'horloge de la page avance à la demande (le film date ses étapes par Date.now)
    const vrai = Date.now.bind(Date); window.__decalage = 0; Date.now = () => vrai() + window.__decalage
  })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
async function ouvrir(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => document.fonts?.ready)
  await p.waitForTimeout(600)
  await p.evaluate(() => { window.__app.reconnaissance = false })
  return p
}
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
const prendre = (p, ids) => p.evaluate(ids => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.options = null; for (const i of ids) a.selection.add(i); a.rendu.redessinerDirect(); a.ui.maj() }, ids)
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const notes = p => p.evaluate(() => window.__app.tableau.film.toArray().map(e => e.reglage ? 'R' : e.coupe ? 'C' : e.seulOrdre ? 'O' : e.naissance ? 'N' : e.rangement ? 'A' : 'G').join(''))
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
const touche = async (p, k) => { await p.keyboard.press(k); await p.waitForTimeout(300) }
/** Le bilan du film : séances, gestes de la revue de la page, film élève de la séance la plus récente */
const bilan = p => p.evaluate(async () => {
  const a = window.__app, t = a.tableau, film = t.film.toArray()
  const { seancesDuFilm, seancesAPublier, exporterDetaille } = await import('/src/revoir/exporter.ts')
  const { lectureDe } = await import('/src/revue/planches.ts')
  const { compterGestes } = await import('/src/revue/bande.ts')
  const l = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(film).map(x => ({ gestes: x.gestes, de: x.de, a: x.a }))
  const office = seancesAPublier(t)[0]
  const s = seancesDuFilm(film)[0]
  const fe = exporterDetaille(t, { de: s.de, a: s.a, pages: [a.page], titre: 'essai' }, { instruments: false }).film
  // Ce que pose chaque étape du film élève qui n'était pas déjà là (un trait
  // neuf), et les étapes « muettes » : rien de neuf, rien d'effacé, chaque
  // forme réécrite identique à son état d'avant au verrou et au groupe près
  const sans = f => { const { verrou, groupe, ...r } = f; return JSON.stringify(r) }
  const etat = new Map(fe.pages.find(x => x.id === a.page)?.formes.map(f => [f.id, f]) ?? [])
  const neufs = [], muettes = []
  fe.etapes.forEach((e, i) => {
    const n = []; let change = false
    for (const o of e.o) {
      if (o[0] === '=') { const av = etat.get(o[1].id); if (!av) n.push(o[1].id); else if (sans(av) !== sans(o[1])) change = true; etat.set(o[1].id, o[1]) }
      else { change = true; if (o[0] === '-') etat.delete(o[1]) }
    }
    neufs.push(n)
    if (!n.length && !change) muettes.push(i)
  })
  const genres = fe.etapes.map(e => e.o.map(o => o[0]).join(''))
  return { seances, office: office && { gestes: office.gestes, de: office.de, a: office.a }, gestesPage: compterGestes(l, { genre: 'page', page: a.page }), etapes: fe.etapes.length, neufs, muettes, genres }
})
/** Un trait au Stylo, à la souris (monde) */
async function ecrire(p, x, y, l) {
  await p.evaluate(() => { window.__decalage += 4000; window.__app.choisirOutil('stylo') })
  const a = await ecran(p, x, y)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= 16; k++) { await p.mouse.move(a.x + l * k / 16, a.y + Math.sin(k / 2) * 8); await p.waitForTimeout(12) }
  await p.mouse.up(); await p.waitForTimeout(500)
  return p.evaluate(() => { const a = window.__app; return a.formes.filter(f => f.type === 'trait').sort((u, v) => u.z - v.z).at(-1).id })
}
/** « Déverrouiller » par le menu court du clic droit sur ce point (monde) */
async function deverrouillerAuMenu(p, x, y) {
  await p.evaluate(() => window.__app.choisirOutil('selection'))
  const s = await ecran(p, x, y)
  await p.mouse.click(s.x, s.y, { button: 'right' }); await p.waitForTimeout(250)
  const b = await p.$('.panneau-forme:not([hidden]) [data-action="deverrouiller"]')
  if (!b) return false
  await b.click(); await p.waitForTimeout(300)
  return true
}

// =====================================================================
console.log('=== A. Pendant le cours : Dégrouper, Déverrouiller, leurs Ctrl + Z et Ctrl + Y ===')
const ctx = await contexte()
const p = await ouvrir(ctx, 'données')
await p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
await p.waitForTimeout(300)
const ids = []
for (let k = 0; k < 3; k++) ids.push(await ecrire(p, 200, 150 + k * 90, 260))
const [m0, m1, m2] = ids
ok(new Set(ids).size === 3 && ids.every(Boolean), 'A0) Trois traits écrits au Stylo, à la souris', ids)
let n0 = await notes(p)
// Grouper m0 et m1 (un réglage), Dégrouper, Ctrl + Z, Ctrl + Y
await prendre(p, [m0, m1])
await touche(p, 'Control+g')
const g = (await forme(p, m0)).groupe
ok(typeof g === 'string' && (await forme(p, m1)).groupe === g, 'A1) Ctrl + G : m0 et m1 groupés', g)
await prendre(p, [m0, m1])
await touche(p, 'Control+Shift+G')
const dg = await forme(p, m0)
await touche(p, 'Control+z')
const dz = await forme(p, m0)
await touche(p, 'Control+y')
const dy = await forme(p, m1)
ok(!('groupe' in dg) && dz.groupe === g && !('groupe' in dy), 'A2) Ctrl + Maj + G dégroupe, Ctrl + Z regroupe, Ctrl + Y dégroupe', { dg: dg.groupe, dz: dz.groupe, dy: dy.groupe })
// Maj + L (verrouiller m2), « Déverrouiller » au menu, Ctrl + Z, Ctrl + Y
await prendre(p, [m2])
await touche(p, 'Shift+L')
const v1 = await forme(p, m2)
await vider(p)
const menu = await deverrouillerAuMenu(p, 200 + 130, 150 + 2 * 90)
const v2 = await forme(p, m2)
await vider(p)
await touche(p, 'Control+z')
const v3 = await forme(p, m2)
await touche(p, 'Control+y')
const v4 = await forme(p, m2)
ok(v1.verrou === true && menu && !('verrou' in v2) && v3.verrou === true && !('verrou' in v4), 'A3) Maj + L verrouille ; « Déverrouiller » (clic droit) le libère ; Ctrl + Z le reverrouille ; Ctrl + Y le libère', { v1: v1.verrou, menu, v2: v2.verrou, v3: v3.verrou, v4: v4.verrou })
let n1 = await notes(p)
const reglages = n1.slice(n0.length)
ok(reglages === 'RRRRRRRR', 'A4) Grouper, Dégrouper, Ctrl + Z, Ctrl + Y, Maj + L, Déverrouiller, Ctrl + Z, Ctrl + Y : huit étapes du film, toutes « réglage »', reglages)
// Puis un geste visible
const m3 = await ecrire(p, 200, 480, 260)
let b = await bilan(p)
ok(b.seances.length === 1 && b.seances[0].gestes === 4, 'A5) Une séance de quatre gestes (les quatre traits), pas un de plus', b.seances)
ok(b.gestesPage === 4, 'A6) La revue de la page compte quatre gestes', b.gestesPage)
// (la page neuve paraît d'abord, son fond : la naissance d'une page, lot 3)
ok(b.etapes === 5 && b.genres[0] === 'f' && JSON.stringify(b.neufs) === JSON.stringify([[], [m0], [m1], [m2], [m3]]), 'A7) Le film élève : la page neuve (son fond), puis quatre étapes, chacune pose son trait', { etapes: b.etapes, genres: b.genres, neufs: b.neufs, attendus: [m0, m1, m2, m3] })
ok(b.muettes.length === 0, 'A8) Aucune étape du film élève qui ne montre rien', b.muettes)
const cours = b

// =====================================================================
console.log('=== B. Le lendemain : se raviser ne fait pas de séance ===')
await p.evaluate(() => { window.__decalage += 26 * 3600 * 1000 })
n0 = await notes(p)
await prendre(p, [m0, m1])
await touche(p, 'Control+g')
await prendre(p, [m0, m1])
await touche(p, 'Control+Shift+G')
await touche(p, 'Control+z')
await touche(p, 'Control+y')
await prendre(p, [m2])
await touche(p, 'Shift+L')
await vider(p)
const menu2 = await deverrouillerAuMenu(p, 200 + 130, 150 + 2 * 90)
await vider(p)
await touche(p, 'Control+z')
await touche(p, 'Control+y')
await touche(p, 'Control+z')
n1 = await notes(p)
ok(menu2 && n1.slice(n0.length) === 'RRRRRRRRR', 'B1) Le lendemain, neuf réglages et leurs Ctrl + Z / Ctrl + Y : neuf étapes « réglage »', { menu2, notes: n1.slice(n0.length) })
b = await bilan(p)
// (Adapté au lot 6 : la séance que Publier choisit d'office est la séance
// explicite du cours ; sans nouvelle séance, sa plage court jusqu'au bout du
// film, ses gestes et son début restent ceux du cours)
ok(JSON.stringify(b.seances) === JSON.stringify(cours.seances) && b.office?.gestes === cours.seances[0].gestes && b.office?.de === cours.seances[0].de, 'B2) Aucune séance fantôme : Publier choisit d\'office le cours', { avant: cours.seances, apres: b.seances, office: b.office })
ok(b.gestesPage === 4 && b.etapes === cours.etapes && JSON.stringify(b.neufs) === JSON.stringify(cours.neufs) && b.muettes.length === 0, 'B3) La revue : toujours quatre gestes ; le film élève du cours : les mêmes étapes, aucune muette', b)
await p.evaluate(() => window.__app.ui.publication.ouvrir()); await p.waitForTimeout(800)
const pub = await p.evaluate(() => { const s = document.querySelector('dialog[open] .p-seance'); return s ? { choisie: s.options[s.selectedIndex]?.textContent, toutes: [...s.options].map(o => o.textContent) } : null })
ok(pub && pub.toutes.length === 1 && /· 4 gestes$/.test(pub.choisie), 'B4) La fenêtre Publier propose d\'office le cours, avec ses quatre gestes, et lui seul', pub)
await p.keyboard.press('Escape'); await p.waitForTimeout(300)

// =====================================================================
console.log('=== C. Le cadre de taille et la pastille ↻ d\'un groupe (README) ===')
const readme = readFileSync(R + '/README.md', 'utf8').replace(/\s+/g, ' ')
ok(!readme.includes('Le cadre de taille et la rotation d\'un groupe ne sont pas encore là'), 'C1) Le README ne dit plus que le cadre de taille et la rotation d\'un groupe manquent')
ok(readme.includes('Un groupe pris a le cadre droit de sa boîte (quatre coins) et la pastille ↻'), 'C2) Il dit qu\'un groupe pris a le cadre droit (quatre coins) et la pastille ↻')
await prendre(p, [m0, m1]); await touche(p, 'Control+g')
await vider(p)
await p.evaluate(() => window.__app.choisirOutil('selection'))
let s = await ecran(p, 200 + 130, 150)
await p.mouse.click(s.x, s.y); await p.waitForTimeout(300)
const prise = await p.evaluate(() => [...window.__app.selection].sort())
const c = await p.evaluate(() => { const c = window.__app.cadreDeLaSelection(); return c && JSON.parse(JSON.stringify(c)) })
ok(JSON.stringify(prise) === JSON.stringify([m0, m1].sort()) && c && c.genre === 'droit' && c.coins.length === 4 && !!c.pastille, 'C3) Un clic sur un membre prend le groupe : cadre droit, quatre coins, une pastille ↻', { prise, genre: c?.genre, coins: c?.coins?.length, pastille: c?.pastille })
await p.screenshot({ path: D + '/groupe-pris.png' })
// Un coin tiré à la souris : le groupe grandit d'un bloc, une étape
const avantTaille = { a: await forme(p, m0), b: await forme(p, m1), pile: await pile(p), notes: await notes(p) }
const coin = await ecran(p, c.coins[2].x, c.coins[2].y)
await p.mouse.move(coin.x, coin.y); await p.mouse.down()
for (let k = 1; k <= 12; k++) { await p.mouse.move(coin.x + 10 * k, coin.y + 5 * k); await p.waitForTimeout(16) }
await p.mouse.up(); await p.waitForTimeout(500)
const apresTaille = { a: await forme(p, m0), b: await forme(p, m1), pile: await pile(p), notes: await notes(p) }
const largeur = f => Math.max(...f.pts.filter((_, i) => i % 3 === 0)) - Math.min(...f.pts.filter((_, i) => i % 3 === 0))
const ka = largeur(apresTaille.a) / largeur(avantTaille.a), kb = largeur(apresTaille.b) / largeur(avantTaille.b)
ok(ka > 1.1 && Math.abs(ka - kb) < 0.02 && apresTaille.pile === avantTaille.pile + 1 && apresTaille.notes.slice(avantTaille.notes.length) === 'G' && apresTaille.a.groupe === apresTaille.b.groupe,
  'C4) Un coin tiré : les deux membres grandissent ensemble (le même facteur), une étape d\'annulation, un geste du film, le groupe reste', { ka, kb, pile: [avantTaille.pile, apresTaille.pile], notes: apresTaille.notes.slice(avantTaille.notes.length) })
// La pastille tirée en rond : le groupe tourne d'un bloc, une étape
const c2 = await p.evaluate(() => { const c = window.__app.cadreDeLaSelection(); return c && JSON.parse(JSON.stringify(c)) })
const ps = await ecran(p, c2.pastille.x, c2.pastille.y), ce = await ecran(p, c2.centre.x, c2.centre.y)
const avantTour = { pile: await pile(p), notes: await notes(p), a: await forme(p, m0), b: await forme(p, m1) }
await p.mouse.move(ps.x, ps.y); await p.mouse.down()
const Rr = Math.hypot(ps.x - ce.x, ps.y - ce.y), t0 = Math.atan2(ps.y - ce.y, ps.x - ce.x)
for (let i = 1; i <= 20; i++) { const t = t0 + i * (Math.PI / 6) / 20; await p.mouse.move(ce.x + Rr * Math.cos(t), ce.y + Rr * Math.sin(t)); await p.waitForTimeout(16) }
await p.mouse.up(); await p.waitForTimeout(500)
const apresTour = { pile: await pile(p), notes: await notes(p), a: await forme(p, m0), b: await forme(p, m1) }
// L'angle de chaque trait : de son premier à son dernier point
const angle = f => { const n = f.pts.length; return Math.atan2(f.pts[n - 2] - f.pts[1], f.pts[n - 3] - f.pts[0]) }
const da = angle(apresTour.a) - angle(avantTour.a), db = angle(apresTour.b) - angle(avantTour.b)
ok(Math.abs(da - Math.PI / 6) < 0.06 && Math.abs(da - db) < 1e-6 && apresTour.pile === avantTour.pile + 1 && apresTour.notes.slice(avantTour.notes.length) === 'G',
  'C5) La pastille tirée de 30° : les deux membres tournent ensemble, une étape d\'annulation, un geste du film', { da: da * 180 / Math.PI, db: db * 180 / Math.PI, pile: [avantTour.pile, apresTour.pile], notes: apresTour.notes.slice(avantTour.notes.length) })
await touche(p, 'Control+z'); await touche(p, 'Control+z')
const retour = { a: await forme(p, m0), b: await forme(p, m1) }
ok(JSON.stringify(retour.a.pts) === JSON.stringify(avantTaille.a.pts) && JSON.stringify(retour.b.pts) === JSON.stringify(avantTaille.b.pts), 'C6) Deux Ctrl + Z rendent le groupe tel qu\'il était')
await ctx.close()

ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
