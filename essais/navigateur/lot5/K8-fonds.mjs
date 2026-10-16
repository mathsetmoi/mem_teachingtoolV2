// ESSAI DU MORCEAU K8-fonds (lot 5) : les quatre fonds nouveaux (grands
// carreaux, papier millimétré, papier pointé, réseau isométrique, dans
// src/fonds.ts) et le menu des fonds en vignettes (src/menu-fonds.ts, le
// bouton de la barre du haut dans src/ui.ts) ; la trieuse et « Nouveau
// classeur » qui proposent les huit.
// A. Le menu à la souris (1366 × 768) : le bouton (la vignette du fond, son
//    titre « Fond de la page : … », aria-haspopup) ; le menu (8 vignettes en
//    4 × 2, menuitemradio, la coche, les noms, chaque vignette peinte une
//    seule fois) ; un choix (le fond change, le menu se ferme, la vignette du
//    bouton suit) ; un seul menu à la fois ; un appui sur le tableau le ferme
//    sans rien poser. Au clavier : Entrée l'ouvre (le focus sur la coche),
//    ← → ↑ ↓ Début Fin, Entrée choisit, Échap ferme. Au doigt (un TNI).
// B. Les huit fonds tour à tour dans la scène : la signature de chaque motif
//    (colonnes de carreaux tous les 20 ou 40 px, lignes violettes du Seyès,
//    orangé du millimétré, un point par centimètre, réseau sans verticales,
//    axes du repère ; blanc pur pour la page blanche) ; à 10 %, 30 %, 100 %
//    et 2000 % jamais un écran gris (luminance moyenne > 225), à 100 %
//    jamais blanc pur (sauf la page blanche).
// C. 1024 × 768, téléphone en portrait (320 × 568) et en paysage (932 ×
//    430) : le menu tient dans l'écran, ses entrées font 44 px au moins.
// D. La trieuse : chaque vignette montre son motif ; le menu d'une carte
//    propose les huit fonds (la coche), tient dans l'écran sans défiler ; un
//    choix change le fond. « Envoyer vers… » : la vignette d'une page au
//    millimétré est orangée.
// E. L'export PDF au millimétré, au pointé et à l'isométrique : avec la
//    case « imprimer le fond », le motif (pdftoppm) ; sans, rien ; la palette
//    (pdfimages) et le poids notés ; depuis les corrections « affichage » du
//    lot 5, la feuille au millimétré a ses millimètres (10 lignes par
//    centimètre, comptées à 254 ppp sur une rangée et une colonne entre deux
//    lignes ; avant, seulement les 5 mm et les centimètres), et la case
//    nomme le fond de la page (« Imprimer le fond de la page : Papier
//    millimétré »). F. La copie en image (avec et sans fond).
// G. La revue ; le nouveau lecteur (rangé dans le dépôt : la lecture par le
//    lecteur d'avant le lot 5 est retirée). H. « Nouveau classeur » au papier pointé.
// I. 60 pages au millimétré et au pointé : la trieuse peint ses vignettes
//    dans le même temps qu'au petits carreaux (fond d'avant), la peinture
//    seule aussi ; le PDF de tout le classeur finit (poids et durée notés).
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { choisirFond } from './lib/fond.mjs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K8-fonds/travail/essai'
const DEV = 'http://localhost:5173/'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d) : '')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
const attendre = ms => new Promise(r => setTimeout(r, ms))

const FONDS = [
  ['blanc', 'Page blanche'], ['carreaux', 'Petits carreaux'], ['grands-carreaux', 'Grands carreaux (1 cm)'], ['seyes', 'Seyès'],
  ['millimetre', 'Papier millimétré'], ['pointe', 'Papier pointé'], ['iso', 'Réseau isométrique'], ['repere', 'Repère'],
]
const NOM = Object.fromEntries(FONDS)
const MENU = '.menu-fonds'
const BOUTON = 'button.choix-fond'

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
const PREPARER = () => {
  const a = window.__app
  a.reconnaissance = false
  window.__msgs = []
  const m = a.ui.message.bind(a.ui)
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
}
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForTimeout(500)
  await p.evaluate(PREPARER)
  return p
}

// ---------- L'analyse des images (une page à part, qui décode un PNG) ----------
const ana = await nav.newPage()
await ana.setContent('<body></body>')
await ana.evaluate(() => {
  /** Ce que contient une image (PNG en base64) : luminance moyenne, pixels
   *  blancs, orangés (millimétré), des points (pointé), bleus (carreaux,
   *  isométrique), violets (Seyès), sombres (encre, axes) ; colonnes et
   *  rangées presque entièrement bleues (ou violettes) */
  window.mesurer = async (b64, zone) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const z = zone ?? { x: 0, y: 0, l: c.width, h: c.height }
    const d = g.getImageData(z.x, z.y, z.l, z.h).data, L = z.l, H = z.h
    const r = { n: L * H, lum: 0, blancs: 0, orange: 0, points: 0, bleus: 0, violets: 0, sombres: 0, colonnes: 0, rangees: 0, colonnesViolettes: 0 }
    const col = new Uint32Array(L), row = new Uint32Array(H), colV = new Uint32Array(L)
    for (let y = 0; y < H; y++) for (let x = 0; x < L; x++) {
      const i = (y * L + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2]
      r.lum += 0.2126 * R + 0.7152 * G + 0.0722 * B
      if (R === 255 && G === 255 && B === 255) r.blancs++
      if (R > 200 && R - B > 25 && R - G > 10) r.orange++
      if (R > 100 && R < 190 && B - R > 15 && G < 200) r.points++
      if (B - R > 12 && G >= R && B > 200 && R > 140) { r.bleus++; col[x]++; row[y]++ }
      if (R > G + 8 && B > R + 10 && R > 150) { r.violets++; colV[x]++ }
      if (R < 90 && G < 90 && B < 110) r.sombres++
    }
    r.lum = Math.round(r.lum / r.n * 10) / 10
    for (let x = 0; x < L; x++) { if (col[x] > 0.8 * H) r.colonnes++; if (colV[x] > 0.8 * H) r.colonnesViolettes++ }
    for (let y = 0; y < H; y++) if (row[y] > 0.8 * L) r.rangees++
    return r
  }
})
const mesurer = (buf, zone) => ana.evaluate(([b, z]) => window.mesurer(b, z), [buf.toString('base64'), zone ?? null])
/** Les pixels d'un canevas de la page, mesurés de même */
const mesurerCanevas = async (p, selecteur) => {
  const b64 = await p.evaluate(s => { const c = typeof s === 'string' ? document.querySelector(s) : null; return c ? c.toDataURL('image/png').split(',')[1] : null }, selecteur)
  return b64 ? mesurer(Buffer.from(b64, 'base64')) : null
}
/** Le tableau, entre les barres (rien d'écrit : seulement le fond) */
const ZONE = { x: 100, y: 100, width: 1000, height: 560 }
const scene = async p => { await p.mouse.move(1300, 740); await p.waitForTimeout(250); return mesurer(await p.screenshot({ clip: ZONE })) }
const vue = (p, z) => p.evaluate(z => { const a = window.__app; a.allerVers({ x: 0, y: 0, z }, 0); a.rendu.toutRedessiner?.() }, z)
const menuOuvert = p => p.evaluate(s => { const m = document.querySelector(s); return !!m && !m.hidden }, MENU)
const PAGE_NEUVE = () => { const a = window.__app; a.nouvellePage(); a.choisirOutil('stylo'); a.selection.clear(); a.options = null; a.allerVers({ x: 0, y: 0, z: 1 }, 0); a.ui.maj() }
/** Trois traits au milieu de la page (de l'encre) */
const ECRIRE = () => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < 3; k++) {
    const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 12, Math.sin(i / 2) * 14, 0.5)
    t.nouveauGeste(); t.poser(a.page, { id: 'k8-' + Math.random().toString(36).slice(2), type: 'trait', x: 200 + k * 300, y: 260 + k * 40, z: Date.now() + k, auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
}

// =====================================================================
console.log('=== A. le menu des fonds (souris, clavier, doigt) ===')
const ctxA = await contexte()
await ctxA.grantPermissions(['clipboard-read', 'clipboard-write'])
const P = await ouvrirDev(ctxA, 'souris')
const bouton = await P.evaluate(s => {
  const b = document.querySelector(s), c = b?.querySelector('canvas'), r = c?.getBoundingClientRect()
  return b && { classe: b.className, haspopup: b.getAttribute('aria-haspopup'), expanded: b.getAttribute('aria-expanded'), titre: b.title, nom: b.getAttribute('aria-label'),
    canevas: !!c && Math.round(r.width) === 30 && Math.round(r.height) === 22 && c.width === Math.round(30 * devicePixelRatio), l: b.offsetWidth, h: b.offsetHeight, fond: window.__app.fond,
    select: !!document.querySelector('select.choix-fond') }
}, BOUTON)
ok(bouton && /\bbouton\b/.test(bouton.classe) && bouton.haspopup === 'menu' && bouton.expanded === 'false' && bouton.canevas && bouton.l >= 44 && bouton.h >= 44 && !bouton.select,
  'A1) La liste déroulante est devenue un bouton (classe bouton, aria-haspopup=menu, 44 px) qui montre la vignette du fond (un canevas de 30 × 22 px)', bouton)
ok(bouton.titre === `Fond de la page : ${NOM[bouton.fond]}` && bouton.nom === bouton.titre, `A1) Son titre et son nom lu : « ${bouton.titre} »`, bouton)
const fond0 = bouton.fond
const pixelsBouton0 = await mesurerCanevas(P, `${BOUTON} canvas`)
await P.click(BOUTON); await P.waitForTimeout(150)
const menu = await P.evaluate(s => {
  const m = document.querySelector(s), r = m.getBoundingClientRect(), b = document.querySelector('button.choix-fond').getBoundingClientRect()
  const e = [...m.querySelectorAll('.fond-choix')]
  const hauts = [...new Set(e.map(x => x.offsetTop))]
  return { ouvert: !m.hidden, role: m.getAttribute('role'), label: m.getAttribute('aria-label'), expanded: document.querySelector('button.choix-fond').getAttribute('aria-expanded'),
    entrees: e.map(x => ({ id: x.dataset.fond, nom: x.textContent, role: x.getAttribute('role'), coche: x.getAttribute('aria-checked'), classe: x.className,
      c: (() => { const c = x.querySelector('canvas'), q = c.getBoundingClientRect(); return [Math.round(q.width), Math.round(q.height), c.width, c.height] })(),
      taille: getComputedStyle(x.querySelector('.nom')).fontSize, h: x.offsetHeight })),
    rangees: hauts.length, colonnes: e.filter(x => x.offsetTop === hauts[0]).length,
    dessous: r.top >= b.bottom, dedans: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, focus: document.activeElement?.dataset?.fond ?? null }
}, MENU)
ok(menu.ouvert && menu.role === 'menu' && menu.label === 'Fond de la page' && menu.expanded === 'true' && menu.dessous && menu.dedans,
  'A2) Un clic ouvre le menu des fonds sous le bouton (role menu, aria-expanded), dans l\'écran', menu)
ok(JSON.stringify(menu.entrees.map(e => [e.id, e.nom])) === JSON.stringify(FONDS) && menu.entrees.every(e => e.role === 'menuitemradio' && e.classe === 'menu-item fond-choix' && e.taille === '13px'),
  'A2) Les huit fonds, dans l\'ordre, avec leurs noms exacts (13 px) ; chacun un menuitemradio .menu-item.fond-choix', menu.entrees.map(e => [e.id, e.nom, e.role, e.taille]))
ok(menu.entrees.every(e => e.coche === String(e.id === fond0)), `A2) La coche sur le fond de la page (${fond0})`, menu.entrees.map(e => e.coche))
ok(menu.rangees === 2 && menu.colonnes === 4 && menu.entrees.every(e => e.c[0] === 76 && e.c[1] === 52 && e.c[2] === Math.round(76 * Math.min(2, 1)) && e.h >= 44),
  'A2) Une grille de 4 × 2 vignettes de 76 × 52 px (à la densité de l\'écran, au plus 2)', { rangees: menu.rangees, colonnes: menu.colonnes, c: menu.entrees.map(e => e.c) })
// Les vignettes montrent leur motif
const vignettes = {}
for (const [id] of FONDS) vignettes[id] = await mesurerCanevas(P, `${MENU} .fond-choix[data-fond="${id}"] canvas`)
ok(vignettes.blanc.blancs === vignettes.blanc.n, 'A3) La vignette « Page blanche » : du papier blanc', vignettes.blanc)
ok(vignettes.millimetre.orange > 150 && vignettes.pointe.points > 20 && vignettes.iso.bleus > 300 && vignettes.iso.colonnes === 0
  && vignettes.carreaux.colonnes >= 3 && vignettes['grands-carreaux'].colonnes >= 2 && vignettes['grands-carreaux'].colonnes < vignettes.carreaux.colonnes
  && vignettes.seyes.violets > 100 && vignettes.repere.sombres > 100,
  'A3) Chaque vignette montre son motif (orangé, points, réseau sans verticales, carreaux de 5 mm plus serrés que ceux de 1 cm, violet du Seyès, axes du repère)',
  Object.fromEntries(Object.entries(vignettes).map(([k, v]) => [k, { orange: v.orange, points: v.points, bleus: v.bleus, col: v.colonnes, violets: v.violets, sombres: v.sombres }])))
// Les vignettes se peignent une fois : on marque les canevas, le menu se rouvre avec les mêmes
await P.evaluate(s => { for (const c of document.querySelectorAll(s + ' canvas')) c.__marque = true }, MENU)
// Un choix : le papier pointé
await P.click(`${MENU} .fond-choix[data-fond="pointe"]`); await P.waitForTimeout(150)
const apres = await P.evaluate(s => ({ fond: window.__app.fond, ouvert: !document.querySelector(s).hidden, titre: document.querySelector('button.choix-fond').title, expanded: document.querySelector('button.choix-fond').getAttribute('aria-expanded') }), MENU)
const pixelsBouton1 = await mesurerCanevas(P, `${BOUTON} canvas`)
ok(apres.fond === 'pointe' && !apres.ouvert && apres.expanded === 'false' && apres.titre === 'Fond de la page : Papier pointé',
  'A4) Un clic sur « Papier pointé » : la page y passe, le menu se ferme, le bouton dit « Fond de la page : Papier pointé »', apres)
// (Adapté aux réglages par défaut, retouches après le lot 5 : la page du départ est blanche, et non plus aux petits carreaux)
ok(fond0 === 'blanc' && pixelsBouton1.points > 0 && pixelsBouton0.points === 0 && pixelsBouton0.bleus === 0 && pixelsBouton1.bleus === 0, 'A4) La vignette du bouton suit : de la page blanche du départ (ni points, ni lignes) aux points', { avant: pixelsBouton0, apres: pixelsBouton1 })
await P.click(BOUTON); await P.waitForTimeout(150)
const rouvert = await P.evaluate(s => ({ memes: [...document.querySelectorAll(s + ' canvas')].every(c => c.__marque), coche: document.querySelector(s + ' [aria-checked="true"]')?.dataset.fond, n: document.querySelectorAll(s + ' .fond-choix').length }), MENU)
ok(rouvert.memes && rouvert.n === 8 && rouvert.coche === 'pointe', 'A4) Rouvert : les mêmes vignettes (peintes une seule fois), la coche sur le papier pointé', rouvert)
// Un seul menu à la fois : le zoom ferme celui des fonds
await P.click('.zoom-texte'); await P.waitForTimeout(150)
const deux = await P.evaluate(s => ({ fonds: !document.querySelector(s).hidden, zoom: !document.querySelector('.menu-flottant[aria-label="Zoom et molette de la souris"]').hidden }), MENU)
ok(!deux.fonds && deux.zoom, 'A5) Un seul menu à la fois : ouvrir celui du zoom ferme celui des fonds', deux)
await P.keyboard.press('Escape'); await P.waitForTimeout(100)
// Un appui sur le tableau ferme le menu, sans rien poser (comme les autres
// petits menus : un clic, le Stylo en main, ne pose pas de point d'encre)
await P.click(BOUTON); await P.waitForTimeout(120)
const n0 = await P.evaluate(() => window.__app.formes.length)
await P.mouse.click(600, 400); await P.waitForTimeout(200)
const ferme = await P.evaluate(s => ({ ouvert: !document.querySelector(s).hidden, n: window.__app.formes.length }), MENU)
ok(!ferme.ouvert && ferme.n === n0, 'A5) Un appui sur le tableau ferme le menu et ne pose rien', { ferme, n0 })
// Au clavier
await P.focus(BOUTON); await P.keyboard.press('Enter'); await P.waitForTimeout(150)
const focus = async () => P.evaluate(() => document.activeElement?.dataset?.fond ?? document.activeElement?.className)
const suite = [['ouvert', await focus()]]
for (const k of ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'End', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowRight']) { await P.keyboard.press(k); suite.push([k, await focus()]) }
// (du papier pointé, 6e : → l'isométrique ; ↓ la rangée d'en dessous, en
// tournant : les grands carreaux ; ← les petits carreaux ; ↑ le pointé ; Fin
// le repère ; Début la page blanche ; ← le repère, en tournant ; → la page
// blanche ; ↓ le millimétré ; → le pointé)
ok(JSON.stringify(suite.map(s => s[1])) === JSON.stringify(['pointe', 'iso', 'grands-carreaux', 'carreaux', 'pointe', 'repere', 'blanc', 'repere', 'blanc', 'millimetre', 'pointe']),
  'A6) Au clavier : Entrée ouvre le menu, le focus sur la coche ; → ↓ ← ↑ Fin Début vont dans la grille (en tournant)', suite)
await P.keyboard.press('ArrowLeft')                                            // du pointé, sa voisine de gauche : le millimétré
const avantEntree = await focus()
await P.keyboard.press('Enter'); await P.waitForTimeout(150)
const choixClavier = await P.evaluate(s => ({ fond: window.__app.fond, ouvert: !document.querySelector(s).hidden, focus: document.activeElement === document.querySelector('button.choix-fond') }), MENU)
ok(avantEntree === 'millimetre' && choixClavier.fond === 'millimetre' && !choixClavier.ouvert && choixClavier.focus, 'A6) Entrée choisit (le papier millimétré) ; le menu se ferme, le focus revient au bouton', { avantEntree, choixClavier })
const outil0 = await P.evaluate(() => window.__app.outil)
await P.keyboard.press('Enter'); await P.waitForTimeout(120)
const coche2 = await focus()
await P.keyboard.press('ArrowRight'); await P.keyboard.press('Escape'); await P.waitForTimeout(120)
const echap = await P.evaluate(s => ({ fond: window.__app.fond, ouvert: !document.querySelector(s).hidden, focus: document.activeElement === document.querySelector('button.choix-fond'), outil: window.__app.outil }), MENU)
ok(coche2 === 'millimetre' && echap.fond === 'millimetre' && !echap.ouvert && echap.focus && echap.outil === outil0, 'A6) Échap ferme le menu sans rien changer (ni le fond, ni l\'outil), le focus revient au bouton', { coche2, echap })
await P.evaluate(() => document.activeElement?.blur())
// Au doigt (un TNI ou une tablette)
const ctxT = await contexte({ hasTouch: true })
const T = await ouvrirDev(ctxT, 'doigt')
const bt = await T.locator(BOUTON).boundingBox()
await T.touchscreen.tap(bt.x + bt.width / 2, bt.y + bt.height / 2); await T.waitForTimeout(200)
const ouvertDoigt = await menuOuvert(T)
const et = await T.locator(`${MENU} .fond-choix[data-fond="iso"]`).boundingBox()
await T.touchscreen.tap(et.x + et.width / 2, et.y + et.height / 2); await T.waitForTimeout(200)
const doigt = await T.evaluate(s => ({ fond: window.__app.fond, ouvert: !document.querySelector(s).hidden, n: window.__app.formes.length }), MENU)
ok(ouvertDoigt && doigt.fond === 'iso' && !doigt.ouvert && doigt.n === 0, 'A7) Au doigt : toucher le bouton ouvre le menu, toucher « Réseau isométrique » le choisit (rien posé)', { ouvertDoigt, doigt })
await ctxT.close()

// =====================================================================
console.log('=== B. les huit fonds dans la scène ===')
await P.evaluate(PAGE_NEUVE); await P.waitForTimeout(1600)            // (le numéro de la page s'efface)
const signatures = {}
for (const [id, nom] of FONDS) {
  await vue(P, 1)                                                        // (le repère se pose au milieu de ce qu'on voit)
  await choisirFond(P, id)
  await vue(P, 1)
  const s = await scene(P)
  signatures[id] = s
  const titre = await P.getAttribute(BOUTON, 'title')
  ok(titre === `Fond de la page : ${nom}`, `B) ${nom} : choisi par le menu, le bouton le dit`, titre)
  const lums = {}
  for (const z of [0.1, 0.3, 20]) { await vue(P, z); lums[z] = (await scene(P)).lum }
  lums[1] = s.lum
  ok(Object.values(lums).every(l => l > 225), `B) ${nom} : jamais un écran gris (luminance moyenne à 10 %, 30 %, 100 %, 2000 % : ${Object.entries(lums).map(([z, l]) => `${Math.round(z * 100)} % ${l}`).join(', ')})`, lums)
  if (id !== 'blanc') ok(s.blancs < s.n, `B) ${nom} : à 100 %, pas un blanc pur`, { blancs: s.blancs, n: s.n })
}
const sg = signatures
ok(sg.blanc.blancs === sg.blanc.n, 'B) Page blanche : du blanc pur', sg.blanc)
ok(Math.abs(sg.carreaux.colonnes - 50) <= 2 && Math.abs(sg.carreaux.rangees - 28) <= 2, 'B) Petits carreaux : une ligne tous les 5 mm (20 px)', { col: sg.carreaux.colonnes, rangees: sg.carreaux.rangees })
ok(Math.abs(sg['grands-carreaux'].colonnes - 25) <= 1 && Math.abs(sg['grands-carreaux'].rangees - 14) <= 1 && sg['grands-carreaux'].orange === 0,
  'B) Grands carreaux : une ligne par centimètre (40 px), dans les deux sens', { col: sg['grands-carreaux'].colonnes, rangees: sg['grands-carreaux'].rangees })
ok(sg.seyes.colonnesViolettes >= 25 && sg.seyes.violets > 5000, 'B) Seyès : ses lignes violettes de 8 mm', { colV: sg.seyes.colonnesViolettes, violets: sg.seyes.violets })
ok(sg.millimetre.orange > 0.05 * sg.millimetre.n && sg.millimetre.bleus === 0 && sg.millimetre.colonnes === 0,
  `B) Papier millimétré : orangé (${(100 * sg.millimetre.orange / sg.millimetre.n).toFixed(1)} % des pixels), sans bleu`, sg.millimetre)
ok(sg.pointe.points >= 1100 && sg.pointe.points <= 1700 && sg.pointe.bleus === 0 && sg.pointe.colonnes === 0,
  `B) Papier pointé : un point par centimètre (${sg.pointe.points} pixels de points, 25 × 14 points de 2 × 2 px attendus)`, sg.pointe)
ok(sg.iso.colonnes === 0 && Math.abs(sg.iso.rangees - 16) <= 1 && sg.iso.bleus > 15000, 'B) Réseau isométrique : des horizontales tous les 1 cm × √3/2, aucune verticale, des obliques', { col: sg.iso.colonnes, rangees: sg.iso.rangees, bleus: sg.iso.bleus })
ok(sg.repere.sombres > 500 && sg.repere.colonnes > 10, 'B) Repère : ses axes et son quadrillage', { sombres: sg.repere.sombres, col: sg.repere.colonnes })

// =====================================================================
console.log('=== C. 1024 × 768 et téléphone ===')
for (const [l, h, nom, o] of [[1024, 768, '1024 × 768', {}], [320, 568, 'téléphone en portrait (320 × 568)', { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }], [932, 430, 'téléphone en paysage (932 × 430)', { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const c = await contexte({ viewport: { width: l, height: h }, ...o })
  const p = await ouvrirDev(c, nom)
  // (Adapté au lot 5, K10, la mise en page du téléphone, voulue : au
  // téléphone, le bouton du fond n'est plus dans la barre du haut ; « Plus →
  // Fond… » ouvre le même menu, et c'est lui qu'on mesure ici, comme avant)
  const toucher = async s => { const b = await p.locator(s).boundingBox(); await p.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2) }
  if (o.hasTouch) {
    await toucher('.barre-haut > .bouton.points'); await p.waitForTimeout(200)
    await toucher('.menu-flottant[aria-label="Plus"] .menu-item[data-action="fond"]')
  } else await p.click(BOUTON)
  await p.waitForTimeout(200)
  const m = await p.evaluate(s => {
    const m = document.querySelector(s), r = m.getBoundingClientRect(), e = [...m.querySelectorAll('.fond-choix')]
    const hauts = [...new Set(e.map(x => x.offsetTop))]
    return { ouvert: !m.hidden, r: [r.left, r.top, r.right, r.bottom].map(Math.round), fen: [innerWidth, innerHeight], colonnes: e.filter(x => x.offsetTop === hauts[0]).length,
      petit: Math.min(...e.map(x => Math.min(x.offsetWidth, x.offsetHeight))), defile: m.scrollHeight > m.clientHeight + 1, dpr: e[0].querySelector('canvas').width / 76 }
  }, MENU)
  const tient = m.ouvert && m.r[0] >= 0 && m.r[1] >= 0 && m.r[2] <= m.fen[0] && m.r[3] <= m.fen[1]
  ok(tient && !m.defile && m.petit >= 44 && m.colonnes === (l < 480 ? 2 : 4) && m.dpr === Math.min(2, o.deviceScaleFactor ?? 1),
    `C) ${nom} : le menu tient dans l'écran, sans défiler (${m.colonnes} colonnes, entrées de ${m.petit} px au moins, vignettes à ${m.dpr} pixel(s) par px)`, m)
  // Un choix au doigt (ou à la souris) y marche aussi
  const e = await p.locator(`${MENU} .fond-choix[data-fond="millimetre"]`).boundingBox()
  if (o.hasTouch) await p.touchscreen.tap(e.x + e.width / 2, e.y + e.height / 2); else await p.click(`${MENU} .fond-choix[data-fond="millimetre"]`)
  await p.waitForTimeout(200)
  ok(await p.evaluate(() => window.__app.fond) === 'millimetre', `C) ${nom} : « Papier millimétré » choisi`)
  await c.close()
}

// =====================================================================
console.log('=== D. la trieuse, « Envoyer vers… » ===')
// Des pages aux fonds nouveaux, chacune avec un peu d'écriture
const pagesD = await P.evaluate(() => {
  const a = window.__app, r = {}
  for (const f of ['grands-carreaux', 'millimetre', 'pointe', 'iso']) { a.nouvellePage(); a.changerFond(f); r[f] = a.page }
  return r
})
for (const f of Object.keys(pagesD)) {
  await P.evaluate(p => { const a = window.__app; a.allerAPage?.(p) }, pagesD[f]).catch(() => {})
}
await P.keyboard.press('Shift+P'); await P.waitForTimeout(500)
await P.waitForFunction(() => [...document.querySelectorAll('.trieuse .carte')].filter(c => c.getBoundingClientRect().bottom < innerHeight).every(c => c.dataset.peinte), null, { timeout: 15000 }).catch(() => {})
await P.waitForTimeout(300)
const cartes = {}
for (const [f, id] of Object.entries(pagesD)) {
  const i = await P.evaluate(id => window.__app.pages.indexOf(id), id)
  cartes[f] = await mesurerCanevas(P, `.trieuse .carte:nth-child(${i + 1}) canvas`)
}
ok(cartes.millimetre?.orange > 200 && cartes.pointe?.points > 8 && cartes.iso?.bleus > 200 && cartes.iso?.colonnes === 0 && cartes['grands-carreaux']?.bleus > 200,
  'D1) La trieuse : chaque vignette montre son motif (orangé, points, réseau, carreaux)', Object.fromEntries(Object.entries(cartes).map(([k, v]) => [k, v && { orange: v.orange, points: v.points, bleus: v.bleus, col: v.colonnes }])))
const iP = await P.evaluate(id => window.__app.pages.indexOf(id), pagesD.pointe)
await P.click(`.trieuse .carte:nth-child(${iP + 1}) canvas`, { button: 'right' }); await P.waitForTimeout(250)
const menuCarte = await P.evaluate(() => {
  const m = [...document.querySelectorAll('.menu-vignette')].find(x => !x.hidden)
  if (!m) return null
  const f = [...m.querySelectorAll('.fond-de-carte')], r = m.getBoundingClientRect()
  return { fonds: f.map(b => b.querySelector('.libelle').firstChild.textContent + (b.getAttribute('aria-checked') === 'true' ? ' ✓' : '')), roles: f.every(b => b.getAttribute('role') === 'menuitemradio'),
    colonnes: new Set(f.map(b => b.offsetLeft)).size, defile: m.scrollHeight > m.clientHeight + 1, dedans: r.top >= 0 && r.bottom <= innerHeight, supprimer: !!m.querySelector('.menu-item:last-child')?.textContent.startsWith('Supprimer') }
})
ok(menuCarte && JSON.stringify(menuCarte.fonds) === JSON.stringify(FONDS.map(([id, n]) => n + (id === 'pointe' ? ' ✓' : ''))) && menuCarte.roles,
  'D2) Le menu d\'une carte : les huit fonds (menuitemradio), « Papier pointé » coché', menuCarte)
ok(menuCarte && menuCarte.colonnes === 2 && !menuCarte.defile && menuCarte.dedans && menuCarte.supprimer, 'D2) … sur deux colonnes : le menu tient dans l\'écran de 768 px sans défiler, « Supprimer » en bas', menuCarte)
await P.click('.menu-vignette:not([hidden]) .fond-de-carte:has-text("Réseau isométrique")'); await P.waitForTimeout(500)
const change = await P.evaluate(id => ({ fond: window.__app.tableau.fondDe(id), msg: window.__msgs.at(-1) }), pagesD.pointe)
ok(change.fond === 'iso' && /^Fond changé \(page \d+\)$/.test(change.msg), 'D2) « Réseau isométrique » choisi dans le menu de la carte : la page y passe', change)
await P.evaluate(id => window.__app.tableau.changerFond(id, 'pointe'), pagesD.pointe)
await P.keyboard.press('Escape'); await P.waitForTimeout(300)
// Envoyer vers… : la vignette d'une page au millimétré
await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('carreaux') })
await P.evaluate(ECRIRE); await P.waitForTimeout(100)
await P.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add(a.formes[0].id); a.ui.maj(); a.ui.ouvrirEnvoi() })
await P.waitForSelector('dialog.dialogue-envoi[open]'); await P.waitForTimeout(800)
const envoi = await mesurerCanevas(P, `dialog.dialogue-envoi[open] .destination[data-cible="${pagesD.millimetre}"] canvas`)
ok(envoi && envoi.orange > 100, '« Envoyer vers… » : la vignette de la page au millimétré est orangée', envoi && { orange: envoi.orange, n: envoi.n })
await P.keyboard.press('Escape'); await P.waitForTimeout(200)

// =====================================================================
console.log('=== E. l\'export PDF, F. la copie en image ===')
async function exporterPdf(p, nom, avecFond, tout = false) {
  await p.mouse.move(683, 384)
  await p.keyboard.press('Control+p')
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const caseFond = p.locator('dialog[open] input[name="pdf-fond"]')
  libellesCase.push(await p.evaluate(() => document.querySelector('dialog[open] .pdf-fond')?.textContent.trim()))
  if (avecFond) await caseFond.check(); else await caseFond.uncheck()
  if (tout && await p.locator('dialog[open] input[name="pdf-quoi"][value="tout"]').count()) await p.check('dialog[open] input[name="pdf-quoi"][value="tout"]')
  const dl = p.waitForEvent('download', { timeout: 240000 }).catch(() => null)
  const t0 = Date.now()
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  return { f, ms: Date.now() - t0, octets: statSync(f).size }
}
const feuilles = (f, nom, ppp = 50) => {
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', f, `${D}/${nom}`])
  return readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort().map(x => `${D}/${x}`)
}
const palette = f => execFileSync('pdfimages', ['-list', f]).toString().trim().split('\n').slice(2).map(l => l.trim().split(/\s+/)[5])
const poids = {}
/** Le libellé de la case du fond, à chaque ouverture de la fenêtre */
const libellesCase = []
for (const fond of ['millimetre', 'pointe', 'iso']) {
  await P.evaluate(f => { const a = window.__app; a.nouvellePage(); a.changerFond(f) }, fond)
  await P.evaluate(ECRIRE); await P.waitForTimeout(150)
  libellesCase.length = 0
  const avec = await exporterPdf(P, fond + '-avec', true), sans = await exporterPdf(P, fond + '-sans', false)
  ok(libellesCase.length === 2 && libellesCase.every(t => t === `Imprimer le fond de la page : ${NOM[fond]}`), `E) La case de la fenêtre nomme le fond de la page : « Imprimer le fond de la page : ${NOM[fond]} »`, libellesCase)
  if (!avec || !sans) { ok(false, `E) ${NOM[fond]} : le PDF n'a pas été enregistré`, { avec, sans }); continue }
  const [fa] = feuilles(avec.f, fond + '-avec'), [fs] = feuilles(sans.f, fond + '-sans')
  const ma = await mesurer(readFileSync(fa)), ms = await mesurer(readFileSync(fs))
  poids[fond] = { avec: avec.octets, sans: sans.octets, palette: palette(avec.f), ms: avec.ms }
  const motif = fond === 'millimetre' ? ma.orange > 2000 && ms.orange === 0 : fond === 'pointe' ? ma.points > 100 && ms.points < 10 : ma.bleus > 2000 && ms.bleus === 0
  ok(motif && ms.sombres > 50 && ma.sombres > 50, `E) PDF au ${NOM[fond]} : avec « imprimer le fond », le motif sur la feuille (pdftoppm) ; sans, la feuille blanche ; l'écriture dans les deux`,
    { avec: { orange: ma.orange, points: ma.points, bleus: ma.bleus, sombres: ma.sombres }, sans: { orange: ms.orange, points: ms.points, bleus: ms.bleus, sombres: ms.sombres } })
  note(`${NOM[fond]} : PDF de ${avec.octets} octets avec le fond (${sans.octets} sans), images ${JSON.stringify(poids[fond].palette)}, en ${avec.ms} ms`)
  if (fond === 'millimetre') ok(poids[fond].palette.every(c => c === 'index' || c === 'rgb'), 'E) La feuille au millimétré part en couleurs indexées, ou retombe proprement en couleurs vraies', poids[fond].palette)
  if (fond === 'millimetre') {
    // Les millimètres sur la feuille (corrections « affichage ») : à 254 ppp,
    // 100 px par centimètre ; une rangée et une colonne entre deux lignes
    // (les moins teintées d'une bande), loin de l'écriture
    execFileSync('pdftoppm', ['-r', '254', '-png', '-f', '1', '-l', '1', avec.f, `${D}/mm-254`])
    const png = readFileSync(`${D}/` + readdirSync(D).find(x => x.startsWith('mm-254-') && x.endsWith('.png'))).toString('base64')
    const lignesParCm = await ana.evaluate(async b64 => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const g = c.getContext('2d'); g.drawImage(img, 0, 0)
      const w = c.width, h = c.height, d = g.getImageData(0, 0, w, h).data
      const L = i => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
      const profil = (col, debut, fin, a, b) => {
        const idx = (u, t) => (col ? t * w + u : u * w + t) * 4
        let u0 = debut, moins = Infinity
        for (let u = debut; u <= fin; u++) { let n = 0; for (let t = a; t <= b; t++) if (L(idx(u, t)) < 253) n++; if (n < moins) { moins = n; u0 = u } }
        const centres = []; let d0 = -1
        for (let t = a; t <= b + 1; t++) {
          const teinte = t <= b && L(idx(u0, t)) < 253
          if (teinte && d0 < 0) d0 = t
          if (!teinte && d0 >= 0) { centres.push((d0 + t - 1) / 2); d0 = -1 }
        }
        const e = centres.slice(1).map((x, i) => x - centres[i])
        return { n: centres.length, cm: (b - a) / 100, min: Math.min(...e), max: Math.max(...e) }
      }
      // La feuille (paysage ou portrait) : le bas de sa zone utile, à 3 cm des bords
      return { w, h, rangee: profil(false, h - 520, h - 490, 300, w - 300), colonne: profil(true, w - 420, w - 390, Math.round(h * 0.45), h - 300) }
    }, png)
    const r = lignesParCm.rangee, c = lignesParCm.colonne
    ok(r.n / r.cm >= 9.6 && r.n / r.cm <= 10.4 && c.n / c.cm >= 9.6 && c.n / c.cm <= 10.4 && r.min >= 7 && r.max <= 13 && c.min >= 7 && c.max <= 13,
      `E) La feuille au millimétré a ses millimètres : ${(r.n / r.cm).toFixed(2)} lignes par cm sur une rangée, ${(c.n / c.cm).toFixed(2)} sur une colonne (écarts de ${Math.min(r.min, c.min)} à ${Math.max(r.max, c.max)} px à 100 px/cm)`, lignesParCm)
  }
}
// F. La copie en image, au millimétré
await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('millimetre') })
await P.evaluate(ECRIRE); await P.waitForTimeout(150)
const LIRE_PRESSE = async () => {
  const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
  if (!it) return null
  const b = await it.getType('image/png'), u8 = new Uint8Array(await b.arrayBuffer())
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}
const copie = async avec => {
  await P.evaluate(() => navigator.clipboard.writeText('rien'))
  await P.evaluate(a => { const u = window.__app.ui; u.apercus.choisirFondImprime(a); u.copierEnImage('page') }, avec)
  await P.waitForTimeout(1500)
  const b64 = await P.evaluate(LIRE_PRESSE)
  return b64 && mesurer(Buffer.from(b64, 'base64'))
}
const ca = await copie(true), cs = await copie(false)
ok(ca && cs && ca.orange > 1000 && cs.orange === 0 && ca.sombres > 50 && cs.sombres > 50, 'F) La copie en image au millimétré : avec le fond, orangée ; sans, blanche ; l\'écriture dans les deux',
  { avec: ca && { orange: ca.orange, sombres: ca.sombres, n: ca.n }, sans: cs && { orange: cs.orange, sombres: cs.sombres } })
await P.evaluate(() => window.__app.ui.apercus.choisirFondImprime(true))

// =====================================================================
console.log('=== G. la revue, le nouveau lecteur, le lecteur d\'avant ===')
// La page au millimétré qu'on vient d'écrire : la revue la montre sur son papier
await P.click('button[title^="Revoir la construction"]'); await P.waitForTimeout(1200)
await P.keyboard.press('End'); await P.waitForTimeout(600)
const rv = await P.evaluate(() => { const r = document.querySelector('.revue-scene')?.getBoundingClientRect(); return r && { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } })
const revue = rv ? await mesurer(await P.screenshot({ clip: { x: rv.x + 100, y: rv.y + 80, width: Math.min(800, rv.width - 200), height: Math.min(400, rv.height - 200) } })) : null
ok(revue && revue.orange > 2000 && revue.lum > 225, 'G1) La revue montre la page sur son papier millimétré (orangé, jamais gris)', revue)
for (let i = 0; i < 4 && await P.evaluate(() => window.__app.enLecture); i++) { await P.keyboard.press('Escape'); await P.waitForTimeout(150) }
// Le film élève de cette page
const film = await P.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, fonds' })
  return { texte: await fo.ecrireFilm(f), v: f.v, fonds: [...f.pages.map(p => p.fond), ...f.etapes.flatMap(e => e.o.filter(o => o[0] === 'f').map(o => o[1]))] }
})
ok(film.v === 1 && film.fonds.includes('millimetre'), 'G2) Le film élève (version 1) porte le papier millimétré', { v: film.v, fonds: film.fonds })
const ctxF = await contexte()
const Le = await ctxF.newPage(); suivre(Le, 'lecteur')
await Le.goto(DEV + 'revoir.html')
await Le.locator('input[type=file]').setInputFiles({ name: 'fonds.mem', mimeType: 'application/json', buffer: Buffer.from(film.texte) })
await Le.waitForTimeout(1500)
await Le.keyboard.press('End'); await Le.waitForTimeout(1500)
const COMPTER_LECTEUR = () => {
  const c = [...document.querySelectorAll('canvas')].find(x => x.width > 300)
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let orange = 0, sombre = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 200 && d[i] - d[i + 2] > 25 && d[i] - d[i + 1] > 10) orange++
    if (d[i] < 70 && d[i + 1] < 70 && d[i + 2] < 90) sombre++
  }
  return { orange, sombre, titre: document.title }
}
const lu = await Le.evaluate(COMPTER_LECTEUR)
ok(lu.orange > 2000 && lu.sombre > 100 && lu.titre.startsWith('Lot 5, fonds'), 'G2) Le nouveau lecteur montre la page sur son papier millimétré, l\'écriture dessus', lu)
await Le.close()
// (Ici, la version d'avant le lot 5 relisait ce fichier : retiré en rangeant la
// batterie dans le dépôt ; elle se construisait depuis un commit qui n'existe plus.)
await ctxF.close()

// =====================================================================
console.log('=== H. « Nouveau classeur » au papier pointé ===')
await P.evaluate(() => { const b = document.querySelector('.bouton-classeur'); if (b.getClientRects().length) b.click(); else window.__app.ui.ouvrirBibliotheque() })
await P.waitForFunction(() => window.__bibliotheque?.ouvert, null, { timeout: 10000 }); await P.waitForTimeout(300)
await P.click('.biblio-nouveau'); await P.waitForTimeout(250)
const dlg = await P.evaluate(() => {
  const d = document.querySelector('dialog.dialogue-nouveau[open]')
  return d && { fonds: [...d.querySelectorAll('input[name="fond"]')].map(r => [r.value, r.parentElement.textContent, r.checked]), hauteurs: [...d.querySelectorAll('fieldset.fonds .case')].map(l => l.offsetHeight) }
})
const ORDRE_NEUF = ['carreaux', 'blanc', 'seyes', 'repere', 'grands-carreaux', 'millimetre', 'pointe', 'iso']
// (Adapté aux réglages par défaut, retouches après le lot 5 : la page blanche est cochée d'office ; l'ordre ne change pas)
ok(dlg && JSON.stringify(dlg.fonds) === JSON.stringify(ORDRE_NEUF.map(id => [id, NOM[id], id === 'blanc'])) && dlg.hauteurs.every(h => h >= 40),
  '« Nouveau classeur » : les huit fonds (les quatre d\'avant, puis les quatre nouveaux), la page blanche cochée, des cases de 40 px', dlg)
await P.check('dialog input[value="pointe"]')
await Promise.all([P.waitForNavigation({ timeout: 20000 }), P.click('dialog [data-a="creer"]')])
await pret(P); await P.waitForTimeout(500)
const neuf = await P.evaluate(() => ({ fond: window.__app.fond, pages: window.__app.pages.length, titre: document.querySelector('button.choix-fond').title }))
ok(neuf.fond === 'pointe' && neuf.pages === 1 && neuf.titre === 'Fond de la page : Papier pointé', 'H) Créé au papier pointé : sa page est au papier pointé, le bouton le dit', neuf)

// =====================================================================
console.log('=== I. 60 pages au millimétré et au pointé ===')
await P.evaluate(PREPARER)
await P.evaluate(() => {
  const a = window.__app, t = a.tableau
  for (let i = 0; i < 59; i++) a.nouvellePage()
  for (const p of a.pages) for (let k = 0; k < 3; k++) {
    const pts = []; for (let j = 0; j <= 16; j++) pts.push(j * 14, Math.sin(j / 2) * 12, 0.5)
    t.pageVue = p; t.nouveauGeste(); t.poser(p, { id: 'k8i-' + Math.random().toString(36).slice(2), type: 'trait', x: 100 + k * 260, y: 100 + k * 90, z: Date.now() + k, auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  t.pageVue = a.page
})
const fondsDe = f => P.evaluate(f => { const a = window.__app; a.pages.forEach((p, i) => a.tableau.changerFond(p, typeof f === 'string' ? f : f[i % 2])) }, f)
/** Ouvre la trieuse et compte le temps jusqu'à ce que toutes les vignettes à l'écran soient peintes */
const trieuse = async () => {
  const ms = await P.evaluate(async () => {
    const t0 = performance.now()
    window.__app.ui.ouvrirTrieuse?.(false)
    for (let i = 0; i < 600; i++) {
      await new Promise(r => requestAnimationFrame(r))
      const vues = [...document.querySelectorAll('.trieuse .carte')].filter(c => { const r = c.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight })
      if (vues.length && vues.every(c => c.dataset.peinte)) return { ms: Math.round(performance.now() - t0), n: vues.length }
    }
    return { ms: -1 }
  })
  await P.keyboard.press('Escape'); await P.waitForTimeout(300)
  return ms
}
/** La peinture seule : les 60 pages en vignettes de 220 × 124 (à 2 pixels par px), trois fois */
const peinture = () => P.evaluate(() => {
  const a = window.__app, u = a.ui, c = document.createElement('canvas'); c.width = 440; c.height = 248
  const g = c.getContext('2d')
  const t0 = performance.now()
  for (let k = 0; k < 3; k++) for (const p of a.pages) {
    const page = u.pageAPeindre(p), b = u.apercus.boite(page.formes) ?? { x: 0, y: 0, l: 400, h: 300 }
    const z = Math.min(220 / (b.l + 80), 124 / (b.h + 80))
    u.apercus.peindre(g, page, { x: 110 - (b.x + b.l / 2) * z, y: 62 - (b.y + b.h / 2) * z, z }, { l: 220, h: 124, dpr: 2, fond: true, esquisse: true })
    g.getImageData(0, 0, 1, 1)          // (le navigateur peint pour de bon : sinon il ne fait que noter les ordres)
  }
  return Math.round(performance.now() - t0)
})
await fondsDe('carreaux'); await P.waitForTimeout(300)
const tCarreaux = await trieuse(), pCarreaux = await peinture()
await fondsDe(['millimetre', 'pointe']); await P.waitForTimeout(300)
const tNeufs = await trieuse(), pNeufs = await peinture()
note('Trieuse, 60 pages (vignettes à l\'écran peintes)', { carreaux: tCarreaux, millimetreEtPointe: tNeufs })
note('Peinture seule, 3 × 60 vignettes', { carreaux: pCarreaux + ' ms', millimetreEtPointe: pNeufs + ' ms' })
ok(tCarreaux.ms > 0 && tNeufs.ms > 0 && tNeufs.ms <= tCarreaux.ms * 1.5 + 150, `I) La trieuse de 60 pages au millimétré et au pointé peint ses vignettes dans le même temps qu'aux petits carreaux (${tNeufs.ms} ms contre ${tCarreaux.ms} ms)`, { tCarreaux, tNeufs })
ok(pNeufs <= pCarreaux * 1.5 + 60, `I) La peinture seule aussi (${pNeufs} ms contre ${pCarreaux} ms pour 180 vignettes)`, { pCarreaux, pNeufs })
const pdf60 = await exporterPdf(P, 'soixante', true, true)
const info60 = pdf60 && execFileSync('pdfinfo', [pdf60.f]).toString()
const pages60 = info60 ? Number(/Pages:\s+(\d+)/.exec(info60)?.[1]) : 0
ok(pdf60 && pages60 >= 60, `I) Le PDF des 60 pages finit (${pages60} feuilles, ${pdf60 && Math.round(pdf60.octets / 1024)} Ko, ${pdf60 && (pdf60.ms / 1000).toFixed(1)} s)`, pdf60)
if (pdf60) {
  const im = palette(pdf60.f)
  note('PDF des 60 pages : les images', { index: im.filter(c => c === 'index').length, rgb: im.filter(c => c === 'rgb').length, autres: im.filter(c => c !== 'index' && c !== 'rgb') })
}

await ctxA.close()
await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
