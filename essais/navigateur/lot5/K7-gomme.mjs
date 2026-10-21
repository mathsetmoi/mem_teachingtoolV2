// ESSAI DU MORCEAU K7-gomme (lot 5) : la gomme qui efface « seulement là où
// elle passe » (src/gomme.ts pour le calcul, app.ts pour le coup, rendu.ts
// pour l'aperçu dans le rectangle sale, ui.ts pour le menu de la Gomme).
// A. Souris (1366 × 768) : un mot écrit ; le menu de la Gomme (retaper la
//    Gomme, clic droit dessus, E) ; « seulement là où elle passe » (le
//    message, le titre, la marque ◐, les tailles qui s'allument) ; une lettre
//    coupée en deux (deux traits, un Ctrl + Z la rend entière, Ctrl + Y) ;
//    une étape du film notée coupe ; une figure, une image, une formule
//    sous la gomme : intactes, le message une fois ; un trait verrouillé,
//    une image fixée : intacts (l'écriture posée sur l'image fixée, coupée) ;
//    au trait entier, rien ne change (le cercle de 12 px, le trait part en
//    entier, une étape sans note).
// B. Stylet de tablette graphique (CDP pointerType 'pen', maxTouchPoints 0) :
//    un mot écrit à la pression, coupé au stylet (les pressions gardées) ;
//    le bout gomme du stylet (button 5, buttons 32), le Stylo en main, dans
//    les deux modes.
// C. Doigt (CDP touch) : l'appui long sur le bouton de la Gomme ouvre son
//    menu, qui reste ouvert au lever ; un coup au doigt coupe ; un second
//    doigt en plein coup l'abandonne, et ce qui est effacé le reste.
// D. Le mode et la taille retenus après un rechargement (le cercle de 30 px).
// E. Une page de 2000 traits : la peinture de la scène pendant un coup (au
//    plus 8 ms en moyenne, moins du tiers d'une peinture entière) ; rien ne
//    reste de l'encre effacée au bord du rectangle sale (pixels comparés à la
//    peinture entière du lever, à 1, 1,25 et 2 pixels par px).
// F. Un coup lent de 3 s sur trois mots : trois étapes du film (une par trait
//    touché), et ce que le classeur grossit.
// G. Le replay : la revue (le trait s'écrit à son rythme, puis chaque coupe
//    paraît d'un coup, une image par trait) ; le nouveau lecteur (de même)
//    (rangé dans le dépôt : la lecture par le lecteur d'avant est retirée).
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K7-gomme/travail/essai'
const DEV = 'http://localhost:5173/'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
const attendre = ms => new Promise(r => setTimeout(r, ms))
const MSG_FIGURE = 'Cette gomme ne coupe que l\'écriture : pour une figure ou une formule, prenez « Effacer le trait entier » (retapez la Gomme). Une image s\'enlève par Supprimer.'
const BOUTON = 'button[title^="Gomme"]'
const MENU = '.menu-flottant[aria-label="Gomme"]'

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
/** Ce qu'on prépare dans la page à chaque chargement : les messages notés,
 *  une image unie dans la banque, la reconnaissance des figures coupée */
const PREPARER = () => {
  const a = window.__app
  a.reconnaissance = false
  window.__msgs = []
  const m = a.ui.message.bind(a.ui)
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d')
  g.fillStyle = '#00c000'; g.fillRect(0, 0, 60, 40)
  a.tableau.doc.getMap('images').set('k7-vert', cv.toDataURL('image/png'))
}
/** Le tableau ouvert ; ses trois pointeurs (la souris de Playwright ; le
 *  stylet et le doigt par CDP), chacun avec bas, va, haut */
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForFunction(() => window.__app && window.__app.page)
  await p.waitForTimeout(500)
  await p.evaluate(PREPARER)
  const cdp = await ctx.newCDPSession(p)
  const souris = {
    survol: (x, y) => p.mouse.move(x, y),
    bas: async (x, y) => { await p.mouse.move(x, y); await p.mouse.down() },
    va: (x, y) => p.mouse.move(x, y),
    haut: async (x, y) => { await p.mouse.move(x, y); await p.mouse.up() },
  }
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    bas: async (x, y, f = 0.5) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: f })
    },
    va: (x, y, f = 0.5) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: f }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
  }
  const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const doigt = { survol: async () => {}, bas: (x, y) => toucher('touchStart', [[x, y]]), va: (x, y) => toucher('touchMove', [[x, y]]), haut: () => toucher('touchEnd', []), toucher }
  return { p, cdp, souris, stylet, doigt }
}

// ---------- Ce qu'on pose (dans la page) ----------
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.choisirOutil('stylo')
  a.selection.clear(); a.options = null
  a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
/** Une ligne droite de l unités (21 points) */
const ligne = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o }
}
async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(40); return id }
const traits = p => p.evaluate(() => window.__app.formes.filter(f => f.type === 'trait').map(f => JSON.parse(JSON.stringify(f))))
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page)?.undoStack.length ?? 0)
const film = p => p.evaluate(() => window.__app.tableau.film.toArray().map(e => ({ page: e.page, coupe: !!e.coupe, reglage: !!e.reglage, ms: !!e.ms })))
const msgs = p => p.evaluate(() => window.__msgs)
const vue = p => p.evaluate(() => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return { x: a.cam.x, y: a.cam.y, z: a.cam.z, left: r.left, top: r.top } })
const versF = (v, w) => ({ x: v.left + v.x + w.x * v.z, y: v.top + v.y + w.y * v.z })
const menuOuvert = p => p.evaluate(s => { const m = document.querySelector(s); return !!m && !m.hidden }, MENU)
const fermerMenu = async p => { if (await menuOuvert(p)) { await p.keyboard.press('Escape'); await p.waitForTimeout(80) } }
/** Règle la gomme comme le professeur, par son menu (la Gomme en main, on la
 *  retouche) : le mode, et la taille s'il y en a une */
async function reglerGomme(p, mode, taille) {
  await p.evaluate(() => window.__app.choisirOutil('gomme'))
  await p.click(BOUTON); await p.waitForTimeout(80)
  await p.click(`${MENU} [data-action="gomme-${mode}"]`); await p.waitForTimeout(80)
  if (taille) { await p.click(BOUTON); await p.waitForTimeout(80); await p.click(`${MENU} [data-action="gomme-${taille}"]`); await p.waitForTimeout(80) }
}

/** Promène un pointeur sur ces points du monde, par petits pas ; o.pas : ms entre deux */
async function passer(p, ptr, pts, o = {}) {
  const v = await vue(p), P = pts.map(w => versF(v, w))
  await ptr.survol(P[0].x, P[0].y); await attendre(30)
  await ptr.bas(P[0].x, P[0].y)
  for (let i = 1; i < P.length; i++) {
    const n = o.n ?? 10
    for (let k = 1; k <= n; k++) { await ptr.va(P[i - 1].x + (P[i].x - P[i - 1].x) * k / n, P[i - 1].y + (P[i].y - P[i - 1].y) * k / n); await attendre(o.pas ?? 8) }
  }
  await attendre(60)
  if (o.pendant) await o.pendant()
  const B = P[P.length - 1]
  await ptr.haut(B.x, B.y); await p.waitForTimeout(150)
}
/** Écrit un trait à main levée (le Stylo en main) : une vague de x0 à x0 + l */
async function ecrire(p, ptr, x0, y0, l, o = {}) {
  const pts = []
  for (let i = 0; i <= 24; i++) pts.push({ x: x0 + i * l / 24, y: y0 + Math.sin(i / 2.2) * (o.h ?? 10) })
  const avant = new Set((await traits(p)).map(f => f.id))
  await passer(p, ptr, pts, { n: 2 })
  const apres = await traits(p)
  return apres.find(f => !avant.has(f.id))?.id
}

// =====================================================================
console.log('=== A. souris ===')
const ctxA = await contexte()
const A = await ouvrirDev(ctxA, 'souris')
const P = A.p
await P.evaluate(PAGE_NEUVE)
// A1. Un mot de trois lettres, à la souris
const lettres = []
for (let k = 0; k < 3; k++) lettres.push(await ecrire(P, A.souris, 300 + k * 140, 300, 110))
const t0 = await traits(P)
ok(lettres.every(Boolean) && t0.length === 3, 'A1) Un mot de trois traits écrit à la souris', { lettres, n: t0.length })
ok(await P.evaluate(() => localStorage.getItem('mem-gomme') === null && localStorage.getItem('mem-gomme-taille') === null), 'A1) Au départ : aucun réglage de gomme gardé (le défaut)')
const titre0 = await P.getAttribute(BOUTON, 'title')
ok(titre0 === 'Gomme (E) — trait entier ; retapez pour ses options', 'A1) Le titre de la Gomme dit le mode (trait entier)', titre0)

// A2. Le menu en retouchant la Gomme
await P.click(BOUTON)
ok(await P.evaluate(() => window.__app.outil === 'gomme') && !(await menuOuvert(P)), 'A2) Un clic prend la Gomme, sans menu')
await P.click(BOUTON); await P.waitForTimeout(100)
const contenu = await P.evaluate(s => {
  const m = document.querySelector(s)
  return { titres: [...m.querySelectorAll('.menu-titre')].map(e => e.textContent), entrees: [...m.querySelectorAll('.menu-item')].map(e => ({ t: e.querySelector('.libelle').firstChild.textContent, aide: e.querySelector('small')?.textContent ?? '', role: e.getAttribute('role'), coche: e.getAttribute('aria-checked'), gris: e.getAttribute('aria-disabled') === 'true' })) }
}, MENU)
ok(await menuOuvert(P), 'A2) Retoucher la Gomme déjà en main ouvre son menu')
ok(JSON.stringify(contenu.titres) === JSON.stringify(['Gomme', 'Taille (là où elle passe)'])
  && contenu.entrees.map(e => e.t).join('|') === 'Effacer le trait entier|Effacer seulement là où elle passe|Petite|Moyenne|Grande'
  && contenu.entrees[0].aide === 'Ce qu\'elle touche part en entier : un trait, une figure, une formule (jamais une image)'
  && contenu.entrees[1].aide === 'Coupe l\'écriture et le surligneur ; les figures, les images et les formules restent'
  && contenu.entrees.every(e => e.role === 'menuitemradio')
  && contenu.entrees[0].coche === 'true' && contenu.entrees[3].coche === 'true'
  && contenu.entrees.slice(2).every(e => e.gris) && !contenu.entrees[0].gris && !contenu.entrees[1].gris,
'A2) Son contenu : « Gomme », les deux modes (le trait entier coché), « Taille (là où elle passe) » et ses trois tailles grisées', contenu)
await P.click(BOUTON); await P.waitForTimeout(80)
ok(!(await menuOuvert(P)), 'A2) Retoucher encore la Gomme referme le menu')

// A3. Le clic droit sur la Gomme, le Stylo en main
await P.evaluate(() => window.__app.choisirOutil('stylo'))
await P.click(BOUTON, { button: 'right' }); await P.waitForTimeout(100)
ok(await menuOuvert(P) && await P.evaluate(() => window.__app.outil === 'stylo'), 'A3) Le clic droit sur la Gomme ouvre son menu, sans changer d\'outil')
await fermerMenu(P)

// A4. E quand la Gomme est en main : le menu, le focus sur l'entrée cochée
await P.mouse.move(700, 600)
await P.keyboard.press('e'); await P.waitForTimeout(80)
ok(await P.evaluate(() => window.__app.outil === 'gomme') && !(await menuOuvert(P)), 'A4) E prend la Gomme')
await P.keyboard.press('e'); await P.waitForTimeout(100)
const focus = await P.evaluate(() => ({ t: document.activeElement?.querySelector?.('.libelle')?.firstChild?.textContent, coche: document.activeElement?.getAttribute('aria-checked') }))
ok(await menuOuvert(P) && focus.t === 'Effacer le trait entier' && focus.coche === 'true', 'A4) E, la Gomme en main : son menu, le focus sur l\'entrée cochée', focus)
// A5. « Effacer seulement là où elle passe » (au clavier : ↓ puis Entrée)
await P.keyboard.press('ArrowDown'); await P.keyboard.press('Enter'); await P.waitForTimeout(120)
const regle = await P.evaluate(s => ({
  ls: localStorage.getItem('mem-gomme'), outil: window.__app.outil, msg: window.__msgs.at(-1),
  titre: document.querySelector(s).title, badge: document.querySelector(s).dataset.badge ?? null,
}), BOUTON)
ok(regle.ls === 'zone' && regle.outil === 'gomme' && regle.msg === 'La gomme efface seulement là où elle passe.', 'A5) « Effacer seulement là où elle passe » : gardé sur l\'appareil (mem-gomme), le message', regle)
ok(regle.titre === 'Gomme (E) — seulement là où elle passe ; retapez pour ses options' && regle.badge === '◐', 'A5) Le titre et la marque ◐ du bouton le disent', regle)
await P.click(BOUTON); await P.waitForTimeout(100)
const tailles = await P.evaluate(s => [...document.querySelector(s).querySelectorAll('.menu-item')].slice(2).map(e => e.getAttribute('aria-disabled') === 'true'), MENU)
ok(tailles.every(g => !g), 'A5) Les tailles s\'allument', tailles)
await fermerMenu(P)

// A6. Couper la première lettre en deux, d'un passage vertical en son milieu
const L1 = await forme(P, lettres[0])
const pile0 = await pile(P), film0 = (await film(P)).length
const milieu = { x: L1.x + 55, y: 300 }
await passer(P, A.souris, [{ x: milieu.x, y: 250 }, { x: milieu.x, y: 350 }])
const t1 = await traits(P), f1 = await film(P)
const morceaux = t1.filter(f => f.id === lettres[0] || !t0.some(g => g.id === f.id))
const gardeId = morceaux.find(f => f.id === lettres[0])
ok(t1.length === 4 && morceaux.length === 2 && !!gardeId, 'A6) La lettre coupée en deux : deux traits, l\'un garde son identifiant', { n: t1.length, ids: morceaux.map(f => f.id) })
ok(morceaux.every(m => m.couleur === L1.couleur && m.taille === L1.taille && m.opacite === L1.opacite && m.pression === L1.pression && m.z === L1.z && m.auteur === L1.auteur), 'A6) Les morceaux gardent tout du trait (couleur, taille, opacité, pression, z, auteur)')
const pts1 = morceaux.flatMap(m => { const r = []; for (let i = 0; i < m.pts.length; i += 3) r.push(m.x + m.pts[i]); return r })
// Retouches après le lot 5 : le Stylo écrit maintenant Fin par défaut (2,5 et non plus 4,5) ; la demi-épaisseur est celle de la lettre.
ok(pts1.every(x => Math.abs(x - milieu.x) >= 14 + L1.taille / 2 - 0.1), 'A6) Rien ne reste sous la gomme (rayon moyen 14 px + la demi-épaisseur)', { min: Math.min(...pts1.map(x => Math.abs(x - milieu.x))) })
ok(await pile(P) === pile0 + 1 && f1.length === film0 + 1 && f1.at(-1).coupe && !f1.at(-1).reglage, 'A6) Un coup : une étape d\'annulation, une étape du film notée coupe', { pile: [pile0, await pile(P)], film: f1.slice(film0) })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
const t2 = await traits(P)
ok(t2.length === 3 && JSON.stringify(t2.find(f => f.id === lettres[0])) === JSON.stringify(L1), 'A6) Un Ctrl + Z rend la lettre entière, telle qu\'elle était', { n: t2.length })
await P.keyboard.press('Control+y'); await P.waitForTimeout(150)
ok((await traits(P)).length === 4, 'A6) Ctrl + Y la recoupe')

// A7. Une figure, une image, une formule sous la gomme : intactes, le message une fois
await P.evaluate(PAGE_NEUVE)
await P.evaluate(() => window.__app.choisirOutil('gomme'))
const tri = await poser(P, { type: 'polygone', x: 200, y: 200, pts: [0, 0, 160, 0, 0, 120], ferme: true, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'] })
const img = await poser(P, { type: 'image', src: 'k7-vert', x: 500, y: 150, l: 60, h: 40, m: [3, 0, 0, 3] })
const fo = await poser(P, { type: 'formule', x: 850, y: 200, latex: '\\frac{1}{2}', couleur: '#d0342c', taille: 40 })
const sur = await poser(P, ligne(520, 210, 120))               // de l'écriture sur l'image
await P.waitForTimeout(300)
const avant7 = await P.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), [tri, img, fo])
const n7 = (await msgs(P)).length
await passer(P, A.souris, [{ x: 190, y: 200 }, { x: 380, y: 200 }])          // sur le côté [AB] du triangle
await passer(P, A.souris, [{ x: 580, y: 160 }, { x: 580, y: 280 }])          // sur l'image et l'écriture posée dessus
await passer(P, A.souris, [{ x: 840, y: 215 }, { x: 900, y: 225 }])          // sur la formule
await passer(P, A.souris, [{ x: 200, y: 260 }, { x: 260, y: 200 }])          // de nouveau sur le triangle
const apres7 = await P.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), [tri, img, fo])
const dits = (await msgs(P)).slice(n7)
ok(JSON.stringify(avant7) === JSON.stringify(apres7), 'A7) La figure, l\'image et la formule sous la gomme partielle : intactes')
ok(dits.filter(m => m === MSG_FIGURE).length === 1, 'A7) Le message, une fois par session, au mot près', dits)
const surApres = (await traits(P)).filter(f => f.y >= 200 && f.y <= 220)
ok(surApres.length === 2, 'A7) L\'écriture posée sur l\'image, elle, est coupée', surApres.map(f => f.id))
// A8. Un trait verrouillé, une image fixée : intacts ; l'écriture posée sur l'image fixée, coupée
await P.evaluate(PAGE_NEUVE)
await P.evaluate(() => window.__app.choisirOutil('gomme'))
const ver = await poser(P, ligne(200, 400, 200, { verrou: true }))
const fixe = await poser(P, { type: 'image', src: 'k7-vert', x: 500, y: 300, l: 60, h: 40, m: [4, 0, 0, 4], fixe: true, z: 1 })
const ecrit = await poser(P, ligne(520, 380, 200))
await P.waitForTimeout(200)
const avant8 = await P.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), [ver, fixe])
const n8 = (await msgs(P)).length
await passer(P, A.souris, [{ x: 300, y: 360 }, { x: 300, y: 440 }])
await passer(P, A.souris, [{ x: 620, y: 310 }, { x: 620, y: 450 }])
const apres8 = await P.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), [ver, fixe])
ok(JSON.stringify(avant8) === JSON.stringify(apres8) && !(await msgs(P)).slice(n8).includes(MSG_FIGURE), 'A8) Un trait verrouillé et une image fixée en fond : intacts (et sans le message)')
const surFixe = (await traits(P)).filter(f => f.y >= 375 && f.y <= 385 && f.id !== ver)
ok(surFixe.length === 2 && surFixe.some(f => f.id === ecrit), 'A8) L\'écriture posée sur l\'image fixée est coupée', surFixe.map(f => f.id))
// A9. Le surligneur reste un surligneur
const surl = await poser(P, ligne(200, 600, 300, { taille: 22.5, opacite: 0.35, couleur: '#ffd400' }))
await P.waitForTimeout(100)
await passer(P, A.souris, [{ x: 350, y: 560 }, { x: 350, y: 640 }])
const s9 = (await traits(P)).filter(f => f.y >= 590 && f.y <= 610)
ok(s9.length === 2 && s9.every(f => f.opacite === 0.35 && f.taille === 22.5 && f.couleur === '#ffd400') && s9.some(f => f.id === surl), 'A9) Le surligneur coupé : deux morceaux, toujours du surligneur', s9.map(f => [f.id, f.opacite, f.taille]))
// A10. Au trait entier : rien ne change
await P.click(BOUTON); await P.waitForTimeout(80)
await P.click(`${MENU} [data-action="gomme-trait"]`); await P.waitForTimeout(120)
ok(await P.evaluate(() => localStorage.getItem('mem-gomme') === 'trait' && window.__msgs.at(-1) === 'La gomme efface le trait entier.'), 'A10) « Effacer le trait entier » : gardé, le message')
const entier = await poser(P, ligne(800, 600, 200))
await P.mouse.move(900, 500); await P.waitForTimeout(60); await P.mouse.move(905, 505); await P.waitForTimeout(60)
const r12 = await P.evaluate(() => window.__app.rendu.gomme.r * window.__app.cam.z)
const film10 = (await film(P)).length, pile10 = await pile(P)
await passer(P, A.souris, [{ x: 900, y: 560 }, { x: 900, y: 640 }])
const f10 = (await film(P)).slice(film10)
ok(Math.abs(r12 - 12) < 1e-9 && !(await forme(P, entier)) && f10.length === 1 && !f10[0].coupe && await pile(P) === pile10 + 1, 'A10) Au trait entier : le cercle de 12 px, le trait part en entier, une étape sans note', { r12, f10 })
await ctxA.close()

// =====================================================================
console.log('=== B. stylet de tablette graphique ===')
const ctxB = await contexte()
const B = await ouvrirDev(ctxB, 'stylet')
const Q = B.p
ok(await Q.evaluate(() => navigator.maxTouchPoints) === 0, 'B0) Pas d\'écran tactile (navigator.maxTouchPoints = 0)')
await Q.evaluate(PAGE_NEUVE)
// B1. Un mot écrit à la pression, coupé au stylet
const v = await vue(Q)
const pression = []
{
  const pts = []
  for (let i = 0; i <= 30; i++) pts.push({ x: 300 + i * 8, y: 300 + Math.sin(i / 3) * 12, f: Math.round((0.2 + 0.6 * i / 30) * 100) / 100 })
  const E = pts.map(w => ({ ...versF(v, w), f: w.f }))
  await B.stylet.survol(E[0].x, E[0].y); await B.stylet.bas(E[0].x, E[0].y, E[0].f)
  for (const e of E.slice(1)) { await B.stylet.va(e.x, e.y, e.f); await attendre(10) }
  await B.stylet.haut(E.at(-1).x, E.at(-1).y); await Q.waitForTimeout(200)
}
const mot = (await traits(Q))[0]
ok(!!mot && mot.pression === true && new Set(mot.pts.filter((_, i) => i % 3 === 2)).size > 5, 'B1) Un mot écrit au stylet, à la pression', mot && { pression: mot.pression })
await reglerGomme(Q, 'zone')
await passer(Q, B.stylet, [{ x: 420, y: 260 }, { x: 420, y: 340 }])
const tB = await traits(Q)
const avantP = new Map(); for (let i = 0; i < mot.pts.length; i += 3) avantP.set(Math.round((mot.x + mot.pts[i]) * 10), mot.pts[i + 2])
const gardees = tB.flatMap(m => { const r = []; for (let i = 3; i + 3 < m.pts.length; i += 3) r.push([Math.round((m.x + m.pts[i]) * 10), m.pts[i + 2]]); return r })
ok(tB.length === 2 && tB.every(m => m.pression === true) && gardees.every(([x, p]) => avantP.get(x) === p), 'B1) Coupé au stylet : deux morceaux, chaque point gardé avec sa pression', { n: tB.length })
// B2. Le bout gomme du stylet, le Stylo en main : dans les deux modes
const BOUT = async (p, x0, x1, y) => p.evaluate(({ x0, x1, y }) => {
  const z = document.getElementById('zone'), app = window.__app, r = z.getBoundingClientRect()
  const ev = (type, x, o) => z.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 91, clientX: r.left + app.cam.x + x * app.cam.z, clientY: r.top + app.cam.y + y * app.cam.z, bubbles: true, cancelable: true, pressure: 0.5, ...o }))
  ev('pointerdown', x0, { button: 5, buttons: 32 })
  const pendant = { outil: z.dataset.outil, r: app.rendu.gomme && app.rendu.gomme.r * app.cam.z }
  for (let k = 1; k <= 12; k++) ev('pointermove', x0 + (x1 - x0) * k / 12, { button: -1, buttons: 32 })
  ev('pointerup', x1, { button: 5, buttons: 0 })
  return { pendant, outil: app.outil, zone: z.dataset.outil }
}, { x0, x1, y })
await Q.evaluate(PAGE_NEUVE)
await Q.evaluate(() => window.__app.choisirOutil('stylo'))
const b1 = await poser(Q, ligne(300, 300, 0.001, { pts: [0, -60, 0.5, 0, -30, 0.5, 0, 0, 0.5, 0, 30, 0.5, 0, 60, 0.5] }))
await Q.waitForTimeout(100)
const rz = await BOUT(Q, 260, 340, 300); await Q.waitForTimeout(150)
const tz = await traits(Q)
ok(rz.outil === 'stylo' && rz.zone === 'stylo' && rz.pendant.outil === 'gomme' && Math.abs(rz.pendant.r - 14) < 1e-9 && tz.length === 2 && tz.some(f => f.id === b1),
  'B2) Le bout gomme du stylet, le Stylo en main, « là où elle passe » : il coupe (cercle de 14 px), le Stylo reste', { rz, n: tz.length })
await reglerGomme(Q, 'trait')
await Q.evaluate(() => window.__app.choisirOutil('stylo'))
const b2 = await poser(Q, ligne(500, 300, 0.001, { pts: [0, -60, 0.5, 0, 0, 0.5, 0, 60, 0.5] }))
await Q.waitForTimeout(100)
const rt = await BOUT(Q, 460, 540, 300); await Q.waitForTimeout(150)
ok(rt.outil === 'stylo' && Math.abs(rt.pendant.r - 12) < 1e-9 && !(await forme(Q, b2)), 'B2) … au trait entier : il efface le trait en entier (cercle de 12 px)', { rt })
await ctxB.close()

// =====================================================================
console.log('=== C. doigt ===')
const ctxC = await contexte({ hasTouch: true })
const C = await ouvrirDev(ctxC, 'doigt')
const R = C.p
await R.evaluate(PAGE_NEUVE)
await R.evaluate(() => window.__app.choisirDoigt('dessine'))
// C1. L'appui long sur le bouton de la Gomme
const bg = await R.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, BOUTON)
await C.doigt.bas(bg.x, bg.y); await R.waitForTimeout(700)
const pendantLong = await menuOuvert(R)
await C.doigt.haut(); await R.waitForTimeout(250)
ok(pendantLong && await menuOuvert(R), 'C1) L\'appui long du doigt sur la Gomme ouvre son menu, qui reste ouvert au lever')
await R.locator(`${MENU} [data-action="gomme-zone"]`).tap(); await R.waitForTimeout(150)
ok(await R.evaluate(() => window.__app.outil === 'gomme' && localStorage.getItem('mem-gomme') === 'zone'), 'C1) « Seulement là où elle passe », touché : la Gomme en main, gardé')
// C2. Un coup au doigt coupe
const d1 = await poser(R, ligne(300, 300, 300))
await R.waitForTimeout(100)
const pileC = await pile(R)
await passer(R, C.doigt, [{ x: 450, y: 250 }, { x: 450, y: 350 }], { pas: 12 })
const tC = await traits(R)
ok(tC.length === 2 && tC.some(f => f.id === d1) && await pile(R) === pileC + 1, 'C2) Un coup au doigt coupe le trait (une étape)', { n: tC.length })
// C3. Un second doigt en plein coup : le geste s'abandonne, ce qui est effacé le reste
const d2 = await poser(R, ligne(300, 500, 300))
await R.waitForTimeout(100)
const v3 = await vue(R)
// (il s'arrête juste après le trait : la gomme ne l'a pas encore quitté, sa coupe est en cours)
const a3 = versF(v3, { x: 400, y: 450 }), b3 = versF(v3, { x: 400, y: 512 })
await C.doigt.toucher('touchStart', [[a3.x, a3.y, 1]])
for (let k = 1; k <= 12; k++) { await C.doigt.toucher('touchMove', [[a3.x, a3.y + (b3.y - a3.y) * k / 12, 1]]); await attendre(12) }
const pendantC = await R.evaluate(() => window.__app.rendu.coupe ? window.__app.rendu.coupe.caches.size : 0)
await C.doigt.toucher('touchStart', [[b3.x, b3.y, 1], [b3.x + 200, b3.y, 2]]); await R.waitForTimeout(80)
await C.doigt.toucher('touchEnd', []); await R.waitForTimeout(200)
const t3 = (await traits(R)).filter(f => f.y >= 495 && f.y <= 505)
ok(pendantC === 1 && t3.length === 2 && t3.some(f => f.id === d2) && !(await R.evaluate(() => window.__app.rendu.coupe)), 'C3) Un second doigt en plein coup : ce qui était coupé s\'écrit (deux morceaux), rien ne reste en cours', { pendantC, n: t3.length })
await ctxC.close()

// =====================================================================
console.log('=== D. le réglage retenu après un rechargement ===')
const ctxD = await contexte()
const Dd = await ouvrirDev(ctxD, 'rechargement')
const T = Dd.p
await T.evaluate(PAGE_NEUVE)
await T.click(BOUTON); await T.click(BOUTON); await T.waitForTimeout(80)
await T.click(`${MENU} [data-action="gomme-zone"]`); await T.waitForTimeout(80)
await T.click(BOUTON); await T.waitForTimeout(80)
await T.click(`${MENU} [data-action="gomme-grande"]`); await T.waitForTimeout(80)
ok(await T.evaluate(() => localStorage.getItem('mem-gomme-taille') === 'grande' && window.__msgs.at(-1) === 'Gomme : grande.'), 'D1) « Grande » : gardée sur l\'appareil (mem-gomme-taille)')
await T.reload(); await pret(T); await T.waitForFunction(() => window.__app && window.__app.page); await T.waitForTimeout(400)
await T.evaluate(PREPARER)
const relu = await T.evaluate(s => ({ ls: [localStorage.getItem('mem-gomme'), localStorage.getItem('mem-gomme-taille')], titre: document.querySelector(s).title, badge: document.querySelector(s).dataset.badge }), BOUTON)
await T.evaluate(() => window.__app.choisirOutil('gomme'))
await T.mouse.move(600, 400); await T.waitForTimeout(50); await T.mouse.move(605, 402); await T.waitForTimeout(80)
const r30 = await T.evaluate(() => window.__app.rendu.gomme.r * window.__app.cam.z)
await T.click(BOUTON); await T.waitForTimeout(80)
const coches = await T.evaluate(s => [...document.querySelector(s).querySelectorAll('.menu-item')].map(e => e.getAttribute('aria-checked')), MENU)
ok(relu.titre === 'Gomme (E) — seulement là où elle passe ; retapez pour ses options' && relu.badge === '◐' && Math.abs(r30 - 30) < 1e-9 && JSON.stringify(coches) === JSON.stringify(['false', 'true', 'false', 'false', 'true']),
  'D2) Après un rechargement : le mode et la taille retenus (le cercle de 30 px, le menu coché)', { relu, r30, coches })
await ctxD.close()

// =====================================================================
console.log('=== E. une page de 2000 traits : la peinture pendant un coup ===')
const ctxE = await contexte()
const E = await ouvrirDev(ctxE, 'performance')
const U = E.p
await U.evaluate(() => localStorage.setItem('mem-gomme', 'zone'))
await U.reload(); await pret(U); await U.waitForFunction(() => window.__app && window.__app.page); await U.waitForTimeout(400)
await U.evaluate(PREPARER)
await U.evaluate(async () => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.selection.clear(); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
  const liste = []
  for (let k = 0; k < 2000; k++) {
    const pts = []
    for (let i = 0; i < 40; i++) pts.push(i * 1.5, Math.round(Math.sin(i / 3) * 60) / 10, 0.5)
    liste.push({ id: 'W' + k, type: 'trait', x: 20 + (k % 50) * 26, y: 20 + Math.floor(k / 50) * 18, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false, z: 1e12 + k, auteur: t.moi })
  }
  t.nouveauGeste(); t.poserPlusieurs(a.page, liste)
  a.choisirOutil('gomme')
  await new Promise(r => setTimeout(r, 800))
  const R = a.rendu
  window.__mes = []
  const enrober = nom => { const f = R[nom].bind(R); R[nom] = (...x) => { const t0 = performance.now(); const v = f(...x); window.__mes.push([nom, performance.now() - t0]); return v } }
  enrober('peindreScene'); enrober('peindreZone')
})
// La peinture entière, mesurée de même (à l'image d'écran, cinq fois)
const entiere = await U.evaluate(async () => {
  const R = window.__app.rendu, image = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  window.__mes = []
  for (let i = 0; i < 5; i++) { R.toutRedessiner(); await image() }
  const l = window.__mes.filter(x => x[0] === 'peindreScene').map(x => x[1])
  window.__mes = []
  return l.reduce((s, x) => s + x, 0) / l.length
})
const avantE = await U.evaluate(() => window.__app.formes.length)
await U.mouse.move(300, 100); await U.mouse.down()
for (let i = 0; i <= 150; i++) { await U.mouse.move(300 + i * 3, 100 + i * 2); await U.waitForTimeout(16) }
const pendantE = await U.evaluate(() => window.__mes.slice())
await U.mouse.up(); await U.waitForTimeout(400)
const zones = pendantE.filter(x => x[0] === 'peindreZone').map(x => x[1]), scenes = pendantE.filter(x => x[0] === 'peindreScene').map(x => x[1])
const toutes = [...zones, ...scenes], moyenne = toutes.reduce((s, x) => s + x, 0) / (toutes.length || 1)
const apresE = await U.evaluate(() => window.__app.formes.length)
ok(apresE > avantE && zones.length > 50, 'E1) Le coup a coupé (des morceaux de plus), et la scène s\'est repeinte dans le rectangle sale', { avantE, apresE, zones: zones.length, scenes: scenes.length })
ok(moyenne <= 8 && moyenne < entiere / 3, `E1) Peinture de la scène pendant le coup : ${moyenne.toFixed(2)} ms en moyenne (au plus 8 ms, et moins du tiers d'une peinture entière : ${entiere.toFixed(2)} ms)`, { moyenne, entiere, max: Math.max(...toutes), scenesEntieres: scenes.length })
await ctxE.close()

// Les pixels : la peinture du coup (bornée au rectangle sale) comparée à la peinture entière du lever
for (const dsf of [1, 1.25, 2]) {
  const c = await contexte({ deviceScaleFactor: dsf })
  const X = await ouvrirDev(c, 'pixels ' + dsf)
  const V = X.p
  await reglerGomme(V, 'zone')
  await V.evaluate(async () => {
    const a = window.__app, t = a.tableau
    a.nouvellePage(); a.selection.clear(); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1.37
    const liste = []
    for (let k = 0; k < 600; k++) {
      const pts = []
      for (let i = 0; i < 40; i++) pts.push(i * 1.5, Math.round(Math.sin(i / 3) * 60) / 10, Math.round((0.3 + 0.5 * Math.abs(Math.sin(i / 5))) * 100) / 100)
      const surl = k % 7 === 0
      liste.push({ id: 'X' + k, type: 'trait', x: 20 + (k % 30) * 26, y: 20 + Math.floor(k / 30) * 18, pts, couleur: surl ? '#ffd400' : '#1b2230', taille: surl ? 15 : 3, opacite: surl ? 0.35 : 1, pression: k % 3 === 0, z: 1e12 + k, auteur: t.moi })
    }
    t.nouveauGeste(); t.poserPlusieurs(a.page, liste)
    a.choisirOutil('gomme')
    await new Promise(r => setTimeout(r, 600))
  })
  const lire = () => V.evaluate(() => { const c = window.__app.rendu.scene; (window.__img ??= []).push(c.getContext('2d').getImageData(0, 0, c.width, c.height).data) })
  await V.mouse.move(200, 80); await V.mouse.down()
  for (let i = 0; i <= 120; i++) { await V.mouse.move(200 + i * 4 + Math.sin(i / 4) * 30, 80 + i * 3); await V.waitForTimeout(8) }
  await V.waitForTimeout(120)
  const enCours = await V.evaluate(() => window.__app.rendu.coupe?.caches.size ?? 0)
  await lire()
  await V.mouse.up(); await V.waitForTimeout(300)
  await lire()
  const r = await V.evaluate(() => {
    const [A, B] = window.__img
    let max = 0, forts = 0, encre = 0
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]))
      if (d > max) max = d
      if (d > 40) forts++
      // De l'encre restée : du papier à la peinture entière, une encre franche au coup
      if ((B[i] + B[i + 1] + B[i + 2]) / 3 > 200 && (A[i] + A[i + 1] + A[i + 2]) / 3 < 120) encre++
    }
    return { max, forts, encre, pixels: A.length / 4, morceaux: window.__app.formes.length }
  })
  // (une peinture coupée à un rectangle et une peinture entière d'un même
  // tracé diffèrent parfois d'un ton sur un pixel isolé : l'anticrénelage de
  // Skia ; voir travail/clip.mjs)
  ok(r.encre === 0 && r.forts <= r.pixels * 0.0002 && r.morceaux !== 600 && enCours > 0, `E2) À ${dsf} pixel(s) par px : rien ne reste de l'encre effacée au bord du rectangle sale (pixels comparés à la peinture entière du lever)`, { ...r, enCours })
  await c.close()
}

// =====================================================================
console.log('=== F. un coup lent de 3 s sur trois mots : le film ===')
const ctxF = await contexte()
const F = await ouvrirDev(ctxF, 'film')
const W = F.p
await W.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => W.evaluate(ms => { window.__dec += ms }, ms)
await avancer(30 * 60_000)
await W.evaluate(PAGE_NEUVE)
await reglerGomme(W, 'zone', 'moyenne')
await W.evaluate(() => window.__app.choisirOutil('stylo'))
// Trois mots écrits à la souris (chacun d'un seul trait, son rythme noté)
const mots = []
for (let k = 0; k < 3; k++) { mots.push(await ecrire(W, F.souris, 250 + k * 250, 300, 180, { h: 14 })); await avancer(2000) }
const taille = () => W.evaluate(async () => { const { ecrireTableau } = await import('/src/fichier.ts'); return (await ecrireTableau(window.__app.tableau.doc)).size })
const avantF = { film: (await film(W)).length, octets: await taille(), pile: await pile(W) }
await W.evaluate(() => window.__app.choisirOutil('gomme'))
const t3s = Date.now()
{
  const v = await vue(W)
  const A0 = versF(v, { x: 200, y: 300 }), B0 = versF(v, { x: 1000, y: 300 })
  await W.mouse.move(A0.x, A0.y); await W.mouse.down()
  for (let i = 1; i <= 160; i++) { await W.mouse.move(A0.x + (B0.x - A0.x) * i / 160, A0.y + Math.sin(i / 9) * 6); await W.waitForTimeout(16) }
  await W.mouse.up(); await W.waitForTimeout(300)
}
const duree = Date.now() - t3s
const apresF = { film: (await film(W)).length, octets: await taille(), pile: await pile(W) }
const etapesF = (await film(W)).slice(avantF.film)
ok(mots.every(Boolean) && duree >= 2500 && etapesF.length === 3 && etapesF.every(e => e.coupe) && apresF.pile === avantF.pile + 1,
  `F1) Un coup de ${(duree / 1000).toFixed(1)} s sur trois mots : trois étapes du film (une par trait touché, notées coupe), une étape d'annulation`, { etapes: etapesF.length, pile: [avantF.pile, apresF.pile] })
const grossi = apresF.octets - avantF.octets
console.log(`  (le classeur .memc : ${avantF.octets} → ${apresF.octets} octets, ${grossi >= 0 ? '+' : ''}${grossi})`)
ok(grossi < 20000, `F1) Le classeur grossit de ${grossi} octets (les morceaux et trois instantanés ; jamais un par mouvement)`, avantF)

// =====================================================================
console.log('=== G. le replay ===')
await avancer(3000)
// G1. La revue : le trait s'écrit à son rythme, puis chaque coupe paraît d'un coup, une image par trait
await W.click('button[title^="Revoir la construction"]'); await W.waitForTimeout(800)
const revue = await W.evaluate(async () => {
  const rv = window.__app.ui.revue, film = window.__app.tableau.film.toArray(), b = rv.bande
  const r = { images: b.images.length, mains: 0, coupes: 0, coupesSansTrace: 0, mainsTracees: 0 }
  for (let j = 1; j < b.images.length; j++) {
    const img = b.images[j]
    if (!img.geste) continue
    rv.aller(j, true)
    if (img.main !== undefined) { r.mains++; if (rv.trace?.main) r.mainsTracees++ }
    if (film[img.e]?.coupe) { r.coupes++; if (!rv.trace) r.coupesSansTrace++ }
  }
  return r
})
ok(revue.mains === 3 && revue.mainsTracees === 3, 'G1) La revue : chaque mot s\'écrit à son rythme d\'origine (le trait à la main)', revue)
ok(revue.coupes === 3 && revue.coupesSansTrace === 3, 'G1) La revue : l\'effacement paraît trait par trait (une image par trait), chacun d\'un coup', revue)
for (let i = 0; i < 4 && await W.evaluate(() => window.__app.enLecture); i++) { await W.keyboard.press('Escape'); await W.waitForTimeout(150) }
// G2. Le film élève, dans le nouveau lecteur
const filmG = await W.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, gomme' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length, coupes: f.etapes.filter(e => e.coupe).length, v: f.v }
})
writeFileSync(D + '/gomme.mem', filmG.texte)
ok(filmG.v === 1 && filmG.coupes === 3, 'G2) Le film élève (version 1) garde ses trois étapes coupe', filmG)
const Le = await ctxF.newPage(); suivre(Le, 'lecteur')
await Le.goto(DEV + 'revoir.html')
await Le.locator('input[type=file]').setInputFiles({ name: 'gomme.mem', mimeType: 'application/json', buffer: Buffer.from(filmG.texte) })
await Le.waitForTimeout(1500)
await Le.keyboard.press('Home'); await Le.waitForTimeout(300)
const lecteur = { mains: 0, coupes: 0, dunCoup: 0, n: 0 }
const nImages = await Le.evaluate(() => window.__revoir.bobine.n)
for (let k = 1; k < nImages; k++) {
  await Le.keyboard.press('ArrowRight')
  const vu = await Le.evaluate(async () => {
    const r = window.__revoir, b = r.bobine, k = r.k
    const res = { k, coupe: b.coupe(k), main: !!r.enTrace?.main, stable: true }
    if (res.coupe) {
      // Les morceaux paraissent d'un coup : à chaque image d'écran, ce que le
      // rendu montre est la page finie de ce geste
      const fin = new Map(b.image(k).formes.map(f => [f.id, f.pts?.length]))
      for (let i = 0; i < 8; i++) {
        await new Promise(x => requestAnimationFrame(x))
        for (const f of r.rendu.formes) if (f.type === 'trait' && fin.get(f.id) !== f.pts.length) res.stable = false
        if (r.rendu.formes.length !== fin.size) res.stable = false
      }
    }
    return res
  })
  lecteur.n++
  if (vu.main) lecteur.mains++
  if (vu.coupe) { lecteur.coupes++; if (vu.stable) lecteur.dunCoup++ }
  await Le.waitForTimeout(vu.main ? 2500 : 150)
}
ok(lecteur.mains === 3, 'G2) Le nouveau lecteur : chaque mot s\'écrit à son rythme d\'origine', lecteur)
ok(lecteur.coupes === 3 && lecteur.dunCoup === 3, 'G2) Le nouveau lecteur : chaque coupe paraît d\'un coup, sans réinventer l\'écriture des morceaux', lecteur)
await Le.close()
// (Ici, la version d'avant le lot 5 relisait ce fichier : retiré en rangeant la
// batterie dans le dépôt ; elle se construisait depuis un commit qui n'existe plus.)
await ctxF.close()

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
