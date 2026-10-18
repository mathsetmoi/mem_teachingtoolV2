// ESSAI DU MORCEAU K6-poignees (lot 5) : le cadre de taille et la pastille ↻
// à l'écran, sous la souris, le stylet et le doigt (src/cadre.ts pour le
// calcul, app.ts pour les gestes, rendu.ts pour le dessin).
// A. Souris (1366 × 768) : une image prise (son cadre orienté, ses côtés,
//    le message de la première fois) ; agrandie par un coin (le rapport
//    largeur / hauteur gardé à 1e-3, une étape, Ctrl + Z, Ctrl + Y ; pendant
//    le geste : rien d'écrit, l'aperçu, la mesure, la barre cachée), par un
//    côté (une seule dimension), par Maj + coin (deux) ; les curseurs ; la
//    barre d'actions et le menu complet ne couvrent pas la pastille ; une
//    formule × 2 (font-size, texte DOM), tournée de 90° pile sans Maj (l'aimant),
//    de 2° sans être ramenée à 0 ; un trait agrandi (épaisseur × 2), tourné ;
//    un groupe et plusieurs objets tournés de 45° avec Maj (sommets, noms,
//    codage) ; une figure seule : pas de coins, la pastille la tourne autour
//    de son centre, ses sommets se tirent toujours ; une droite seule : la
//    pastille près du milieu de [AB] ; un ancien segment v0.1 agrandi : pas de
//    saut d'épaisseur au lâcher ; Échap pendant le geste ; un instrument posé
//    dessus gagne ; zoom 10 % (les coins sortis, prenables) et 2000 % (la
//    pastille dans la zone libre) ; un verrouillé, une image fixée : jamais de
//    cadre ; le double-clic sur la pastille n'ouvre rien (chaque clic tourne
//    d'un quart de tour) ; la durée des
//    images pendant la rotation d'un groupe de 500 traits.
// B. 1024 × 768 (le vidéoprojecteur) : cadre, pastille, barre d'actions,
//    menu complet et barres de l'outil ne se chevauchent pas.
// C. Stylet de tablette graphique (CDP pointerType 'pen', maxTouchPoints 0) :
//    les poignées du stylet, un coin, la pastille ; une image qu'on vient
//    d'importer au Stylo arrive à l'outil Sélection, avec son cadre (depuis
//    les retouches après le lot 5 : avant, elle restait prise au Stylo, sans
//    cadre) ; P rend le Stylo, et un appui sur son coin écrit.
// D. Doigt (CDP touch) : les poignées du doigt, un coin, la pastille ; l'appui
//    long sur un coin n'ouvre rien ; un second doigt abandonne le geste.
// E. iPad : le doigt qui déplace sous le Stylo a les poignées, jamais le
//    crayon. F. Téléphone (390 × 844) : les poignées au doigt, la pastille à
//    l'écran.
// G. La revue (l'objet transformé à l'étape d'après, d'un coup) et le film
//    élève dans le nouveau lecteur.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K6-poignees/travail/essai'
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
const meme = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort())
const DEG = Math.PI / 180

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
  return c
}
/** Le tableau ouvert, ses messages notés ; ses trois pointeurs (la souris de
 *  Playwright ; le stylet et le doigt par CDP), chacun avec bas, va, haut */
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForFunction(() => window.__app && window.__app.page)
  await p.waitForTimeout(500)
  await p.evaluate(async () => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    window.__cadre = await import('/src/cadre.ts')
    window.__formes = await import('/src/formes.ts')
    window.__inst = await import('/src/instruments.ts')
    window.__pointeurs = await import('/src/pointeurs.ts')
    const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d')
    g.fillStyle = '#00c000'; g.fillRect(0, 0, 60, 40)
    a.tableau.doc.getMap('images').set('k6-vert', cv.toDataURL('image/png'))
  })
  const cdp = await ctx.newCDPSession(p)
  const souris = {
    survol: (x, y) => p.mouse.move(x, y),
    bas: async (x, y, o = {}) => { await p.mouse.move(x, y); if (o.maj) await p.keyboard.down('Shift'); await p.mouse.down() },
    va: (x, y) => p.mouse.move(x, y),
    haut: async (x, y, o = {}) => { await p.mouse.move(x, y); await p.mouse.up(); if (o.maj) await p.keyboard.up('Shift') },
  }
  const mod = o => (o.maj ? 8 : 0)
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    bas: async (x, y, o = {}) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0, modifiers: mod(o) })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, modifiers: mod(o) })
      stylet.o = o
    },
    va: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, modifiers: mod(stylet.o ?? {}) }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, modifiers: mod(stylet.o ?? {}) }),
  }
  const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const doigt = {
    survol: async () => {},
    bas: (x, y) => toucher('touchStart', [[x, y]]),
    va: (x, y) => toucher('touchMove', [[x, y]]),
    haut: () => toucher('touchEnd', []),
    toucher,
  }
  return { p, cdp, souris, stylet, doigt }
}

// ---------- Ce qu'on pose (dans la page) ----------
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
const image = (x, y, l, h, o = {}) => ({ type: 'image', src: 'k6-vert', x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: '\\frac{123}{456}', couleur: '#d0342c', taille: 28, ...o })
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o }
}
const triangle = (x, y, o = {}) => ({ type: 'polygone', x, y, pts: [0, 0, 160, 0, 0, -160], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], codage: true, ...o })

async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(50); return id }
const sel = p => p.evaluate(() => [...window.__app.selection])
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const prendre = async (p, ids) => { await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, ids); await p.waitForTimeout(120) }
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const etats = (p, ids) => p.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), ids)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
const msgs = p => p.evaluate(() => window.__msgs)
/** Le cadre que peint le rendu (après une image d'écran) */
const cadre = async p => { await p.waitForTimeout(80); return p.evaluate(() => window.__app.rendu.cadre && JSON.parse(JSON.stringify(window.__app.rendu.cadre))) }
/** La vue : de quoi passer du monde à la fenêtre sans aller-retour */
const vue = p => p.evaluate(() => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return { x: a.cam.x, y: a.cam.y, z: a.cam.z, left: r.left, top: r.top } })
const versF = (v, w) => ({ x: v.left + v.x + w.x * v.z, y: v.top + v.y + w.y * v.z })
const ecran = async (p, x, y) => versF(await vue(p), { x, y })

/** Tire un pointeur du point a au point b du monde, par petits pas.
 *  o.pendant : appelé avant le lever (le geste en cours) */
async function glisser(p, ptr, a, b, o = {}) {
  const v = await vue(p), A = versF(v, a), B = versF(v, b), n = o.n ?? 12
  await ptr.survol(A.x, A.y); await attendre(30)
  await ptr.bas(A.x, A.y, o)
  for (let k = 1; k <= n; k++) { await ptr.va(A.x + (B.x - A.x) * k / n, A.y + (B.y - A.y) * k / n); await attendre(8) }
  await attendre(60)
  const r = o.pendant ? await o.pendant() : undefined
  await ptr.haut(B.x, B.y, o); await p.waitForTimeout(150)
  return r
}
/** Tourne la pastille du cadre : de son centre, autour du centre du cadre,
 *  d'un angle (degrés, sens de l'écran : positif = horaire) ; o.rayon : on
 *  s'éloigne d'abord du centre jusqu'à ce rayon (monde), sans tourner, pour
 *  passer le seuil du glisser avant un tout petit angle */
async function tourner(p, ptr, angle, o = {}) {
  const c = (await cadre(p)).cadre
  const v = await vue(p), C = versF(v, c.centre), P0 = versF(v, c.pastille)
  const a0 = Math.atan2(P0.y - C.y, P0.x - C.x), r0 = Math.hypot(P0.x - C.x, P0.y - C.y)
  const R = o.rayon ? o.rayon * v.z : r0, n = o.n ?? 24
  await ptr.survol(P0.x, P0.y); await attendre(30)
  await ptr.bas(P0.x, P0.y, o)
  if (o.rayon) for (let k = 1; k <= 6; k++) { const r = r0 + (R - r0) * k / 6; await ptr.va(C.x + r * Math.cos(a0), C.y + r * Math.sin(a0)); await attendre(8) }
  let fin = P0
  for (let k = 1; k <= n; k++) { const t = a0 + angle * DEG * k / n; fin = { x: C.x + R * Math.cos(t), y: C.y + R * Math.sin(t) }; await ptr.va(fin.x, fin.y); await attendre(8) }
  await attendre(60)
  const r = o.pendant ? await o.pendant() : undefined
  await ptr.haut(fin.x, fin.y, o); await p.waitForTimeout(150)
  return r
}
/** L'état pendant un geste : ce qu'écrit le document, l'aperçu, la mesure, la barre */
const PENDANT = id => {
  const a = window.__app, b = document.querySelector('.barre-actions')
  return { forme: JSON.stringify(a.forme(id)), transfo: !!a.rendu.transfo, mesure: a.rendu.mesure?.texte ?? null, barre: !!b && !b.hidden, curseur: document.getElementById('zone').style.cursor }
}
/** Un rectangle de la fenêtre pour un disque du monde (centre, rayon en px d'écran) */
const disque = (v, w, r) => { const c = versF(v, w); return { left: c.x - r, top: c.y - r, right: c.x + r, bottom: c.y + r } }
const rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetWidth) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }, sel)
const couvre = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
const coinsImage = f => { const [a, b, c, d] = f.m; return [{ x: f.x, y: f.y }, { x: f.x + a * f.l, y: f.y + b * f.l }, { x: f.x + a * f.l + c * f.h, y: f.y + b * f.l + d * f.h }, { x: f.x + c * f.h, y: f.y + d * f.h }] }
/** Ctrl + Z juste après un geste : tout revient d'un coup ; Ctrl + Y le refait */
async function annulerRetablir(p, ids, avant, nom) {
  const apres = await etats(p, ids)
  const sel0 = await sel(p)
  await vider(p); await p.mouse.move(5, 400)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150)
  const annule = await etats(p, ids)
  await p.keyboard.press('Control+y'); await p.waitForTimeout(150)
  const retabli = await etats(p, ids)
  ok(annule.every((x, i) => x === avant[i]) && retabli.every((x, i) => x === apres[i]) && apres.some((x, i) => x !== avant[i]),
    `   … ${nom} : un Ctrl + Z le défait d'un coup, Ctrl + Y le refait`, { annule, avant, retabli, apres })
  await prendre(p, sel0)
}
/** L'épaisseur (px d'écran) du trait sombre qui coupe la verticale x (fenêtre) entre y0 et y1, sur la scène */
const EPAIS = ({ x, y0, y1 }) => {
  const a = window.__app, c = a.rendu.scene, z = document.getElementById('zone').getBoundingClientRect(), k = c.width / c.clientWidth
  const d = c.getContext('2d').getImageData(Math.round((x - z.left) * k), Math.round((y0 - z.top) * k), 1, Math.round((y1 - y0) * k)).data
  let n = 0
  for (let i = 0; i < d.length; i += 4) if (d[i] < 120 && d[i + 1] < 120 && d[i + 2] < 140) n++
  return n / k
}

// =====================================================================
console.log('=== A. à la souris ===')
const ctxA = await contexte()
const A = await ouvrirDev(ctxA, 'souris')
const P = A.p, souris = A.souris
await P.evaluate(PAGE_NEUVE)
// A1. Une image prise : son cadre orienté, quatre coins et quatre côtés
let I = await poser(P, image(300, 250, 300, 200))
await souris.survol(...Object.values(await ecran(P, 450, 350))); await P.mouse.click(...Object.values(await ecran(P, 450, 350))); await P.waitForTimeout(150)
let k = await cadre(P)
ok(meme(await sel(P), [I]) && k?.cadre.genre === 'oriente' && k.cadre.coins.length === 4 && k.cadre.cotes && k.pointeur === 'mouse', 'A1) Une image prise : un cadre orienté, quatre coins et des côtés, aux poignées de la souris', k)
ok(Math.abs(k.cadre.pastille.y - (250 - 24)) < 0.01 && Math.abs(k.cadre.pastille.x - 450) < 0.01 && !k.cadre.dessous, '   … la pastille au-dessus du cadre, au milieu, à 24 px', k.cadre.pastille)
ok((await msgs(P)).includes('Coins : agrandir ou réduire ; côtés ou Maj + coin : déformer ; ↻ : tourner (un clic : un quart de tour)'), '   … le message de la première image prise', await msgs(P))
// A2. Les curseurs au survol
const curseur = async (x, y) => { const s = await ecran(P, x, y); await P.mouse.move(s.x, s.y); await P.waitForTimeout(60); return P.evaluate(() => document.getElementById('zone').style.cursor) }
const cs = { coin: await curseur(600, 450), coinHautDroit: await curseur(600, 250), cote: await curseur(600, 350), haut: await curseur(450, 250), pastille: await curseur(450, 226), dedans: await curseur(450, 350) }
ok(cs.coin === 'nwse-resize' && cs.coinHautDroit === 'nesw-resize' && cs.cote === 'ew-resize' && cs.haut === 'ns-resize' && cs.pastille === 'grab' && cs.dedans === 'move', 'A2) Les curseurs : les coins, les côtés, la pastille (la main), l\'image (move)', cs)
// A3. Le coin bas-droit tiré en dehors de la diagonale : les proportions restent
let n0 = await pile(P), avant = await etats(P, [I])
let pendant = await glisser(P, souris, { x: 600, y: 450 }, { x: 780, y: 470 }, { pendant: () => P.evaluate(PENDANT, I) })
let f = await forme(P, I)
const ratio = (f.m[0] * f.l) / (f.m[3] * f.h)
ok(Math.abs(ratio - 1.5) < 1e-3 && f.m[0] > 5 && f.x === 300 && f.y === 250 && await pile(P) === n0 + 1, 'A3) Un coin : l\'image s\'agrandit, le rapport largeur / hauteur gardé (à 1e-3), autour du coin opposé, une étape', { ratio, f, n0 })
ok(pendant.forme === avant[0] && pendant.transfo && /^\d+ %$/.test(pendant.mesure ?? '') && !pendant.barre && pendant.curseur === 'nwse-resize', '   … pendant le geste : rien d\'écrit, l\'aperçu, la mesure « … % », la barre d\'actions cachée', pendant)
ok(meme(await sel(P), [I]) && !(await P.evaluate(() => window.__app.rendu.transfo)), '   … la sélection reste, l\'aperçu s\'en va', await sel(P))
await annulerRetablir(P, [I], avant, 'le coin')
// A4. Un côté : une seule dimension
f = await forme(P, I)
let c4 = coinsImage(f), droit = { x: (c4[1].x + c4[2].x) / 2, y: (c4[1].y + c4[2].y) / 2 }
avant = await etats(P, [I]); n0 = await pile(P)
pendant = await glisser(P, souris, droit, { x: droit.x + 120, y: droit.y + 40 }, { pendant: () => P.evaluate(PENDANT, I) })
let g = await forme(P, I)
ok(g.m[0] > f.m[0] * 1.1 && Math.abs(g.m[3] - f.m[3]) < 1e-9 && g.x === f.x && g.y === f.y && await pile(P) === n0 + 1, 'A4) Le côté droit : la largeur seule change (la hauteur, le bord gauche restent)', { avant: f.m, apres: g.m })
ok(/^\d+ % × 100 %$/.test(pendant.mesure ?? ''), '   … la mesure « … % × 100 % »', pendant.mesure)
await annulerRetablir(P, [I], avant, 'le côté')
// A5. Maj + coin : les deux axes libres
f = await forme(P, I); c4 = coinsImage(f)
avant = await etats(P, [I])
pendant = await glisser(P, souris, c4[2], { x: c4[2].x + 200, y: c4[2].y - 50 }, { maj: true, pendant: () => P.evaluate(PENDANT, I) })
g = await forme(P, I)
const kx = g.m[0] / f.m[0], ky = g.m[3] / f.m[3]
ok(kx > 1.2 && ky < 0.9 && Math.abs(kx - ky) > 0.3 && /^\d+ % × \d+ %$/.test(pendant.mesure ?? ''), 'A5) Maj + coin : l\'image se déforme, chaque axe le sien', { kx, ky, mesure: pendant.mesure })
await annulerRetablir(P, [I], avant, 'Maj + coin')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await prendre(P, [I])
// A6. La barre d'actions ne couvre pas la pastille ; le menu complet non plus
let v = await vue(P)
k = await cadre(P)
let barre = await rect(P, '.barre-actions')
let past = disque(v, k.cadre.pastille, 12)
ok(barre && !couvre(barre, past) && barre.bottom <= past.top, 'A6) La barre d\'actions se pose au-dessus de la pastille, sans la couvrir', { barre, past })
await P.mouse.click(...Object.values(await ecran(P, 450, 350)), { button: 'right' }); await P.waitForTimeout(200)
let panneau = await rect(P, '.panneau-forme')
ok(panneau && !couvre(panneau, past), '   … le menu complet (clic droit) non plus', { panneau, past })
k = await cadre(P)
ok(!!k, '   … le cadre reste, menu ouvert', k)
// Le menu ouvert, un coin tiré tout de suite : l'appui ferme le menu ET tire le coin
avant = await etats(P, [I]); n0 = await pile(P)
f = await forme(P, I); c4 = coinsImage(f)
const pendantMenu = await glisser(P, souris, c4[2], { x: c4[2].x + 60, y: c4[2].y + 40 }, { pendant: () => P.evaluate(() => !!document.querySelector('.panneau-forme:not([hidden])')) })
g = await forme(P, I)
ok(g.m[0] > f.m[0] && await pile(P) === n0 + 1 && !pendantMenu, '   … menu ouvert, un coin tiré : le menu se cache, le coin agrandit l\'image (le premier appui n\'est pas perdu)', { pendantMenu, avant: f.m, apres: g.m })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await vider(P)
// A7. Échap pendant le geste : tout revient, la sélection reste
await prendre(P, [I])
avant = await etats(P, [I]); n0 = await pile(P)
f = await forme(P, I); c4 = coinsImage(f)
v = await vue(P)
let s0 = versF(v, c4[2])
await souris.bas(s0.x, s0.y); for (let i = 1; i <= 8; i++) await souris.va(s0.x + i * 10, s0.y + i * 8)
await P.keyboard.press('Escape'); await P.waitForTimeout(80)
const apresEchap = await P.evaluate(PENDANT, I)
await souris.va(s0.x + 120, s0.y + 100); await souris.haut(s0.x + 120, s0.y + 100); await P.waitForTimeout(150)
const finEchap = { forme: (await etats(P, [I]))[0] === avant[0], pile: await pile(P), n0, sel: await sel(P) }
ok(apresEchap.forme === avant[0] && !apresEchap.transfo && !apresEchap.mesure && finEchap.forme && finEchap.pile === n0 && meme(finEchap.sel, [I]), 'A7) Échap pendant le geste : rien ne change, rien ne s\'écrit au lever, la sélection reste', { apresEchap, finEchap })
// A8. Le double-clic sur la pastille n'ouvre rien ; chaque clic tourne d'un
// quart de tour à droite (retouches après le lot 5, le souhait du
// professeur : avant, un clic ne faisait rien) : un demi-tour, deux étapes,
// que deux Ctrl + Z défont
k = await cadre(P); v = await vue(P)
let sp = versF(v, k.cadre.pastille)
const m0 = (await forme(P, I)).m
await P.mouse.dblclick(sp.x, sp.y); await P.waitForTimeout(250)
const m2 = (await forme(P, I)).m
ok(await P.evaluate(() => window.__app.options === null && !document.querySelector('.menu-flottant:not([hidden])')) && m2.every((x, i) => Math.abs(x + m0[i]) < 1e-9), 'A8) Un double-clic sur la pastille n\'ouvre aucun menu et tourne de deux quarts de tour', { options: await P.evaluate(() => window.__app.options), m0, m2 })
await P.keyboard.press('Control+z'); await P.keyboard.press('Control+z'); await P.waitForTimeout(250)
ok((await etats(P, [I]))[0] === avant[0], 'A8) … deux Ctrl + Z la rendent comme avant')
await vider(P)

// A9. Une formule × 2, puis tournée de 90° pile (sans Maj) et de 2°
const F = await poser(P, formule(800, 300, { taille: 28 }))
await P.waitForTimeout(200)
await prendre(P, [F])
k = await cadre(P)
ok(k?.cadre.genre === 'oriente' && !k.cadre.cotes, 'A9) Une formule prise : un cadre orienté, quatre coins, pas de côtés', k)
let bf = await P.evaluate(id => window.__app.rendu.boiteFormule(window.__app.forme(id)), F)
// Le coin bas-droit tiré jusqu'à doubler la diagonale (l'ancre : (x, y))
n0 = await pile(P); avant = await etats(P, [F])
await glisser(P, souris, k.cadre.coins[2], { x: 800 + 2 * (k.cadre.coins[2].x - 800), y: 300 + 2 * (k.cadre.coins[2].y - 300) })
await P.waitForTimeout(250)
let ff = await forme(P, F)
let dom = await P.evaluate(id => { const e = window.__app.rendu.elementsFormules.get(id).el; return { fs: e.style.fontSize, katex: !!e.querySelector('.katex-html'), texte: e.textContent.includes('123'), canevas: e.querySelectorAll('canvas, img, svg image').length } }, F)
ok(ff.taille === 56 && ff.x === 800 && ff.y === 300 && dom.fs === '56px' && dom.katex && dom.texte && dom.canevas === 0 && await pile(P) === n0 + 1, 'A10) La formule × 2 par un coin : taille 28 → 56, font-size 56px, du texte KaTeX (net), une étape', { ff, dom })
await annulerRetablir(P, [F], avant, 'la formule × 2')
avant = await etats(P, [F]); n0 = await pile(P)
pendant = await tourner(P, souris, 88, { pendant: () => P.evaluate(PENDANT, F) })
ff = await forme(P, F)
let tr = await P.evaluate(id => window.__app.rendu.elementsFormules.get(id).el.style.transform, F)
ok(Math.abs(ff.rotation - Math.PI / 2) < 1e-12 && pendant.mesure === '↻ 90°' && /rotate\(1\.570\d*rad\)/.test(tr) && await pile(P) === n0 + 1, 'A11) Tournée de 88° sans Maj : 90° pile (l\'aimant), « ↻ 90° », une étape', { r: ff.rotation, mesure: pendant.mesure, tr })
ok(/matrix\(/.test(pendant.forme) === false && pendant.transfo, '   … pendant le geste : l\'aperçu (rien d\'écrit)', pendant)
await annulerRetablir(P, [F], avant, 'la formule tournée de 90°')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await prendre(P, [F])
pendant = await tourner(P, souris, -2, { rayon: 260, n: 6, pendant: () => P.evaluate(PENDANT, F) })
ff = await forme(P, F)
ok(Math.abs(ff.rotation + 2 * DEG) < 1e-9 && pendant.mesure === '↺ 2°', 'A12) Tournée de 2° (dans le sens direct) : 2°, pas ramenée à 0 ; « ↺ 2° »', { r: ff.rotation / DEG, mesure: pendant.mesure })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await vider(P)

// A13. Un trait agrandi × 2 (son épaisseur aussi), puis tourné
const T = await poser(P, trait(300, 600, 200))
await prendre(P, [T])
k = await cadre(P)
ok(k?.cadre.genre === 'droit' && k.cadre.coins.length === 4 && !k.cadre.cotes, 'A13) Un trait pris : un cadre droit, quatre coins', k?.cadre)
let ft = await forme(P, T)
let anc = k.cadre.coins[0], co = k.cadre.coins[2]
avant = await etats(P, [T]); n0 = await pile(P)
await glisser(P, souris, co, { x: anc.x + 2 * (co.x - anc.x), y: anc.y + 2 * (co.y - anc.y) })
let gt = await forme(P, T)
ok(gt.taille === 8 && Math.abs(gt.pts[gt.pts.length - 3] - 400) < 0.2 && await pile(P) === n0 + 1, 'A14) Un trait agrandi × 2 : deux fois plus long, épaisseur 4 → 8, une étape', { taille: gt.taille, fin: gt.pts.slice(-3) })
await annulerRetablir(P, [T], avant, 'le trait agrandi')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await prendre(P, [T])
avant = await etats(P, [T])
await tourner(P, souris, 90)
gt = await forme(P, T)
const bout = { x: gt.x + gt.pts[gt.pts.length - 3], y: gt.y + gt.pts[gt.pts.length - 2] }
ok(Math.abs(bout.x - 400) < 0.5 && Math.abs(bout.y - 700) < 0.5 && Math.abs(gt.x - 400) < 0.5 && Math.abs(gt.y - 500) < 0.5 && gt.taille === 4, 'A15) Le trait tourné de 90° autour du milieu de son cadre : vertical, la même épaisseur', { x: gt.x, y: gt.y, bout })
await annulerRetablir(P, [T], avant, 'le trait tourné')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await vider(P)

// A16. Un groupe (deux traits et un triangle nommé, codé) tourné de 45° avec Maj
await P.evaluate(PAGE_NEUVE)
const G1 = await poser(P, trait(300, 300, 150)), G2 = await poser(P, trait(300, 340, 150))
const Tri = await poser(P, triangle(520, 500, { posNoms: [{ x: -30, y: 0 }, null, null] }))
await prendre(P, [G1, G2, Tri])
await P.keyboard.press('Control+g'); await P.waitForTimeout(150)
k = await cadre(P)
ok(k?.cadre.genre === 'droit' && meme(await sel(P), [G1, G2, Tri]), 'A16) Un groupe pris : le cadre droit de tout', k?.cadre.genre)
let avantTri = await P.evaluate(id => { const f = window.__app.forme(id), Fo = window.__formes; return { s: Fo.sommetsDe(f), noms: Fo.placesDesNoms(f), codage: Fo.codageDe(f) } }, Tri)
let ctr = k.cadre.centre
avant = await etats(P, [G1, G2, Tri]); n0 = await pile(P)
pendant = await tourner(P, souris, 41, { maj: true, pendant: () => P.evaluate(PENDANT, Tri) })
let apresTri = await P.evaluate(id => { const f = window.__app.forme(id), Fo = window.__formes; return { s: Fo.sommetsDe(f), noms: Fo.placesDesNoms(f), codage: Fo.codageDe(f) } }, Tri)
const rot = (q, c, a) => ({ x: c.x + (q.x - c.x) * Math.cos(a) - (q.y - c.y) * Math.sin(a), y: c.y + (q.x - c.x) * Math.sin(a) + (q.y - c.y) * Math.cos(a) })
const pres = (a, b, t = 0.2) => Math.hypot(a.x - b.x, a.y - b.y) < t
ok(pendant.mesure === '↻ 45°' && avantTri.s.every((q, i) => pres(apresTri.s[i], rot(q, ctr, 45 * DEG))) && await pile(P) === n0 + 1, 'A17) Maj : 41° deviennent 45° (pas de 15°) ; le triangle a tourné autour du centre du cadre ; une étape pour tout', { mesure: pendant.mesure, avant: avantTri.s, apres: apresTri.s })
ok(avantTri.noms.every((q, i) => pres(apresTri.noms[i], rot(q, ctr, 45 * DEG), 0.3)) && apresTri.codage.traits.length === avantTri.codage.traits.length && apresTri.codage.droits.length === avantTri.codage.droits.length,
  '   … les noms des points suivent (A déplacé à la main aussi), le codage se recalcule pareil', { avant: avantTri.noms, apres: apresTri.noms })
let fg1 = await forme(P, G1)
ok(Math.abs(Math.atan2(fg1.pts[fg1.pts.length - 2], fg1.pts[fg1.pts.length - 3]) - 45 * DEG) < 0.01 && meme(await sel(P), [G1, G2, Tri]), '   … les traits du groupe aussi ; le groupe reste pris', fg1.pts.slice(-3))
await annulerRetablir(P, [G1, G2, Tri], avant, 'le groupe tourné')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
// Le groupe agrandi par un coin : tout ensemble
await prendre(P, [G1, G2, Tri])
k = await cadre(P); anc = k.cadre.coins[0]; co = k.cadre.coins[2]
avant = await etats(P, [G1, G2, Tri])
await glisser(P, souris, co, { x: anc.x + 1.5 * (co.x - anc.x), y: anc.y + 1.5 * (co.y - anc.y) })
let gtri = await forme(P, Tri)
ok(Math.abs(gtri.pts[2] - 240) < 0.2 && gtri.taille === 2.5 && (await forme(P, G1)).taille === 6, 'A18) Le groupe agrandi × 1,5 : le triangle aussi (son épaisseur gardée), les traits s\'épaississent', { tri: gtri.pts, taille: gtri.taille })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
// Plusieurs objets (sans groupe) : Ctrl + Maj + G, puis tournés de 45° avec Maj
await prendre(P, [G1, G2, Tri])
await P.keyboard.press('Control+Shift+g'); await P.waitForTimeout(150)
await prendre(P, [G1, Tri])
avant = await etats(P, [G1, Tri]); n0 = await pile(P)
pendant = await tourner(P, souris, 48, { maj: true, pendant: () => P.evaluate(PENDANT, G1) })
fg1 = await forme(P, G1)
ok(pendant.mesure === '↻ 45°' && Math.abs(Math.atan2(fg1.pts[fg1.pts.length - 2], fg1.pts[fg1.pts.length - 3]) - 45 * DEG) < 0.01 && await pile(P) === n0 + 1 && (await forme(P, G2)).y === 340, 'A19) Plusieurs objets tournés de 45° avec Maj : ensemble, une étape ; l\'autre trait ne bouge pas', { mesure: pendant.mesure })
await annulerRetablir(P, [G1, Tri], avant, 'plusieurs objets tournés')
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)

// A20. Une figure seule : pas de coins, la pastille la tourne autour de son centre ; ses sommets se tirent toujours
await prendre(P, [Tri])
k = await cadre(P)
const centreTri = await P.evaluate(id => window.__formes.centreDe(window.__app.forme(id)), Tri)
ok(k?.cadre.genre === 'pastille' && k.cadre.coins.length === 0 && pres(k.cadre.centre, centreTri, 0.01), 'A20) Une figure seule : pas de coins, la pastille seule, autour de son centre', k?.cadre)
avantTri = await P.evaluate(id => window.__formes.sommetsDe(window.__app.forme(id)), Tri)
avant = await etats(P, [Tri])
await tourner(P, souris, 90)
let sTri = await P.evaluate(id => window.__formes.sommetsDe(window.__app.forme(id)), Tri)
ok(avantTri.every((q, i) => pres(sTri[i], rot(q, centreTri, Math.PI / 2))), '   … tournée de 90° autour de son centre', { avantTri, sTri })
await annulerRetablir(P, [Tri], avant, 'la figure tournée')
await prendre(P, [Tri])
const sB = sTri[1], dB = { x: sB.x + 40, y: sB.y + 30 }
await glisser(P, souris, sB, dB)
sTri = await P.evaluate(id => window.__formes.sommetsDe(window.__app.forme(id)), Tri)
ok(pres(sTri[1], dB, 1), '   … et son sommet B se tire toujours (après la rotation)', sTri)
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
// A21. Une droite seule : la pastille près du milieu de [AB]
const Dr = await poser(P, { type: 'polygone', x: 500, y: 650, pts: [0, 0, 100, -20], ferme: false, prolonge: 'droite', couleur: '#1f5fbf', taille: 2.5 })
await prendre(P, [Dr])
k = await cadre(P); v = await vue(P)
const zl = await P.evaluate(() => window.__app.ui.zoneLibre())
const pm = versF(v, k.cadre.pastille), mil = versF(v, { x: 550, y: 640 })
ok(k?.cadre.genre === 'pastille' && pres(k.cadre.centre, { x: 550, y: 640 }, 0.01) && Math.hypot(pm.x - mil.x, pm.y - mil.y) < 60 && pm.x > v.left + zl.x + 20 && pm.x < v.left + zl.x + zl.l - 20, 'A21) Une droite seule : autour du milieu de [AB], la pastille près de lui, pas au bord de l\'écran', { centre: k?.cadre.centre, pm, mil })
await vider(P)
// A22. Un ancien segment (v0.1) agrandi : pas de saut d'épaisseur au lâcher
const Sg = await poser(P, { type: 'segment', x: 300, y: 450, dx: 200, dy: 0, couleur: '#1b2230', taille: 6 })
await prendre(P, [Sg])
k = await cadre(P); anc = k.cadre.coins[0]; co = k.cadre.coins[2]
v = await vue(P)
const cible = { x: anc.x + 1.5 * (co.x - anc.x), y: anc.y + 1.5 * (co.y - anc.y) }
const ep = await glisser(P, souris, co, cible, { pendant: async () => { await P.waitForTimeout(80); const f = await P.evaluate(() => { const a = window.__app; return a.rendu.transfo && a.rendu.transfo.appliquer(a.forme([...a.selection][0])) }); const m = versF(v, { x: f.x + f.dx * 0.6, y: f.y }); return { f, e: await P.evaluate(EPAIS, { x: m.x, y0: m.y - 20, y1: m.y + 20 }) } } })
await P.waitForTimeout(150)
let fs = await forme(P, Sg)
const mApres = versF(v, { x: fs.x + fs.dx * 0.6, y: fs.y })
const eApres = await P.evaluate(EPAIS, { x: mApres.x, y0: mApres.y - 20, y1: mApres.y + 20 })
ok(fs.taille === 6 && Math.abs(fs.dx - 300) < 1 && ep.e > 3 && Math.abs(ep.e - eApres) <= 1, 'A22) Un ancien segment agrandi × 1,5 : son épaisseur gardée (6), la même à l\'écran pendant le geste et après (pas de saut)', { taille: fs.taille, dx: fs.dx, pendant: ep.e, apres: eApres })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await vider(P)
// A23. Un instrument posé dessus gagne
await P.evaluate(PAGE_NEUVE)
I = await poser(P, image(300, 250, 300, 200))
await P.evaluate(() => { const a = window.__app, m = a.tableau.doc.getMap('instruments'); m.set('regle', { x: 600 - 400, y: 450 - 52, a: 0, r: 0, visible: true }) })
await P.waitForTimeout(150)
await prendre(P, [I])
const surRegle = await P.evaluate(() => window.__inst.toucher('regle', window.__app.instruments.get('regle'), { x: 600, y: 450 }, 9))
const regle0 = await P.evaluate(() => ({ ...window.__app.instruments.get('regle') }))
avant = await etats(P, [I])
await glisser(P, souris, { x: 600, y: 450 }, { x: 700, y: 500 })
const regle1 = await P.evaluate(() => ({ ...window.__app.instruments.get('regle') }))
ok(surRegle === 'corps' && (await etats(P, [I]))[0] === avant[0] && Math.abs(regle1.x - regle0.x - 100) < 1, 'A23) Une règle posée sur le coin de l\'image : c\'est la règle qui part, l\'image ne change pas', { surRegle, regle0, regle1 })
await P.evaluate(() => window.__app.basculerInstrument('regle')); await P.waitForTimeout(100)
// A24. Zoom 10 % : une petite image, ses coins sortis du cadre, toujours prenables
await P.evaluate(() => { const a = window.__app; a.cam.z = 0.1; a.cam.x = 300; a.cam.y = 200; a.rendu.toutRedessiner(); a.ui.maj() })
await prendre(P, [I])
k = await cadre(P)
f = await forme(P, I)
c4 = coinsImage(f)
ok(k && !pres(k.cadre.coins[2], c4[2], 1) && !k.cadre.cotes, 'A24) À 10 % : l\'image fait 30 × 20 px, ses coins sortent du cadre (pas de côtés)', { coins: k?.cadre.coins, image: c4 })
anc = k.cadre.coins[0]; co = k.cadre.coins[2]
await glisser(P, souris, co, { x: anc.x + 2 * (co.x - anc.x), y: anc.y + 2 * (co.y - anc.y) })
g = await forme(P, I)
ok(g.m[0] > f.m[0] * 1.5, '   … et le coin sorti se prend : l\'image grandit', { avant: f.m, apres: g.m })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
// A25. Zoom 2000 % : un coin hors de l'écran ; la pastille dans la zone libre ; rien ne plante
await P.evaluate(() => { const a = window.__app; a.cam.z = 20; a.cam.x = 683 - 450 * 20; a.cam.y = 400 - 350 * 20; a.rendu.toutRedessiner(); a.ui.maj() })
await prendre(P, [I])
k = await cadre(P); v = await vue(P)
const zl2 = await P.evaluate(() => window.__app.ui.zoneLibre())
const p20 = versF(v, k.cadre.pastille)
ok(k && p20.x >= v.left + zl2.x && p20.x <= v.left + zl2.x + zl2.l && p20.y >= v.top + zl2.y && p20.y <= v.top + zl2.y + zl2.h, 'A25) À 2000 % (l\'image déborde l\'écran) : la pastille dans ce qu\'on voit', { p20, zl2 })
avant = await etats(P, [I])
await tourner(P, souris, 30)
g = await forme(P, I)
ok(g.m[1] !== 0 && erreurs.length === 0, '   … elle tourne l\'image, sans erreur', g.m)
barre = await rect(P, '.barre-actions'); past = disque(v, k.cadre.pastille, 12)
ok(!couvre(barre, past), '   … la barre d\'actions ne la couvre pas', { barre, past })
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await P.evaluate(() => { const a = window.__app; a.cam.z = 1; a.cam.x = 120; a.cam.y = 120; a.rendu.toutRedessiner(); a.ui.maj() })
// A26. Un verrouillé, une image fixée : jamais de cadre
const Iv = await poser(P, image(800, 250, 200, 120, { verrou: true }))
await P.mouse.click(...Object.values(await ecran(P, 900, 310)), { button: 'right' }); await P.waitForTimeout(200)
ok(meme(await sel(P), [Iv]) && (await cadre(P)) === null, 'A26) Un objet verrouillé, son menu court ouvert : pas de cadre', await sel(P))
await P.keyboard.press('Escape'); await vider(P)
await P.evaluate(id => window.__app.fixerEnFond([id]), I); await P.waitForTimeout(150)
await P.mouse.click(...Object.values(await ecran(P, 450, 350))); await P.waitForTimeout(150)
ok((await sel(P)).length === 0 && (await cadre(P)) === null, '   … une image fixée en fond : ni prise, ni cadre', await sel(P))
// A27. La durée des images pendant la rotation d'un groupe de 500 traits
await P.evaluate(PAGE_NEUVE)
const ids500 = await P.evaluate(() => {
  const a = window.__app, t = a.tableau, l = []
  t.doc.transact(() => {
    for (let i = 0; i < 500; i++) {
      const pts = []; for (let j = 0; j < 30; j++) pts.push(j * 3, Math.sin(j / 3 + i) * 6, 0.5)
      const id = 'P' + i
      t.poser(a.page, { id, type: 'trait', x: 200 + (i % 25) * 36, y: 180 + Math.floor(i / 25) * 22, pts, couleur: '#1b2230', taille: 2.5, opacite: 1, pression: false, z: Date.now() + i, auteur: t.moi })
      l.push(id)
    }
  }, 'locale')
  return l
})
await P.waitForTimeout(300)
await prendre(P, ids500)
await P.keyboard.press('Control+g'); await P.waitForTimeout(300)
await P.evaluate(() => {
  const r = window.__app.rendu, p = r.peindre.bind(r)
  window.__durees = []
  r.peindre = t => { const d = performance.now(); p(t); window.__durees.push(performance.now() - d) }
})
n0 = await pile(P)
await P.evaluate(() => { window.__durees = [] })
await tourner(P, souris, 60, { n: 30 })
const durees = await P.evaluate(() => window.__durees.slice())
durees.sort((a, b) => a - b)
const med = durees[Math.floor(durees.length / 2)], max = durees.at(-1)
const p500 = await forme(P, 'P0')
ok(durees.length >= 15 && med < 40 && await pile(P) === n0 + 1 && p500.pts[p500.pts.length - 2] !== 0, `A27) 500 traits groupés tournés : ${durees.length} images, médiane ${med.toFixed(1)} ms, la plus longue ${max.toFixed(1)} ms ; une étape`, { med, max, n: durees.length })
await ctxA.close()

// =====================================================================
console.log('=== B. à 1024 × 768 (le vidéoprojecteur) ===')
const ctxB = await contexte({ viewport: { width: 1024, height: 768 } })
const B = await ouvrirDev(ctxB, '1024')
await B.p.evaluate(PAGE_NEUVE)
const IB = await poser(B.p, image(250, 220, 360, 240))
const IH = await poser(B.p, image(330, -30, 220, 90))
const outils = await rect(B.p, '.barre-outils'), haut = await rect(B.p, '.barre-haut')
for (const [id, nom] of [[IB, 'au milieu'], [IH, 'en haut, sous la barre du haut']]) {
  await prendre(B.p, [id])
  const kb = await cadre(B.p), vb = await vue(B.p)
  const pb = disque(vb, kb.cadre.pastille, 13)
  const cb = kb.cadre.coins.map(q => disque(vb, q, 5))
  const ba = await rect(B.p, '.barre-actions')
  ok(!couvre(ba, pb) && cb.every(q => !couvre(ba, q)) && !couvre(pb, outils) && !couvre(pb, haut), `B1) Une image ${nom} : la barre d\'actions ne couvre ni la pastille ni un coin ; la pastille n\'est sous aucune barre`, { ba, pb, outils, haut, dessous: kb.cadre.dessous })
  await B.p.mouse.click(...Object.values(versF(vb, { x: kb.cadre.centre.x, y: kb.cadre.centre.y + 10 })), { button: 'right' }); await B.p.waitForTimeout(200)
  const pn = await rect(B.p, '.panneau-forme')
  ok(pn && !couvre(pn, pb), `   … le menu complet (clic droit) ne couvre pas la pastille`, { pn, pb })
  await B.p.keyboard.press('Escape'); await vider(B.p)
}
await ctxB.close()

// =====================================================================
console.log('=== C. au stylet d\'une tablette graphique ===')
const ctxC = await contexte()
const C = await ouvrirDev(ctxC, 'stylet')
ok(await C.p.evaluate(() => navigator.maxTouchPoints) === 0, 'C0) Pas d\'écran tactile (navigator.maxTouchPoints = 0)')
await C.p.evaluate(PAGE_NEUVE)
const IC = await poser(C.p, image(300, 250, 300, 200))
await prendre(C.p, [IC])
let sC = await ecran(C.p, 450, 350)
await C.stylet.survol(sC.x, sC.y); await C.p.waitForTimeout(120)
k = await cadre(C.p)
ok(k?.pointeur === 'pen' && Math.abs(k.cadre.pastille.y - (250 - 28)) < 0.01, 'C1) Le stylet qui survole : les poignées du stylet (la pastille à 28 px)', k)
avant = await etats(C.p, [IC])
await glisser(C.p, C.stylet, { x: 600, y: 450 }, { x: 750, y: 550 })
f = await forme(C.p, IC)
ok(Math.abs(f.m[0] / f.m[3] - 1) < 1e-9 && f.m[0] > 5.5, 'C2) Un coin tiré au stylet : l\'image grandit, ses proportions gardées', f.m)
await tourner(C.p, C.stylet, 90)
f = await forme(C.p, IC)
ok(Math.abs(f.m[0]) < 1e-9 && f.m[1] > 0, '   … la pastille au stylet : un quart de tour', f.m)
// Au Stylo : une image qu'on vient d'importer (prise), un appui sur son coin écrit
await C.p.evaluate(() => window.__app.choisirOutil('stylo'))
const IC2 = await C.p.evaluate(async () => {
  const cv = Object.assign(document.createElement('canvas'), { width: 80, height: 60 }); cv.getContext('2d').fillStyle = '#0a0'; cv.getContext('2d').fillRect(0, 0, 80, 60)
  const b = await new Promise(r => cv.toBlob(r, 'image/png'))
  await window.__app.importerImage(b)
  return [...window.__app.selection][0]
})
await C.p.waitForTimeout(200)
f = await forme(C.p, IC2)
c4 = coinsImage(f)
const avantStylo = await etats(C.p, [IC2]), nf = await C.p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
// (retouches après le lot 5) Elle arrive à l'outil Sélection, avec son cadre
// et sa pastille ↻ ; P rend le Stylo (la sélection se vide), et le trait
// commencé sur son coin écrit, comme avant
k = await cadre(C.p)
ok(meme(await sel(C.p), [IC2]) && await C.p.evaluate(() => window.__app.outil) === 'selection' && k?.pointeur === 'pen' && k.cadre.genre === 'oriente',
  'C3) Importée au Stylo, l\'image arrive à l\'outil Sélection, prise, avec son cadre (les poignées du stylet)', k)
await C.p.keyboard.press('p'); await C.p.waitForTimeout(150)
ok(await C.p.evaluate(() => window.__app.outil) === 'stylo' && (await cadre(C.p)) === null, '   … P rend le Stylo : plus de cadre', await cadre(C.p))
await glisser(C.p, C.stylet, c4[2], { x: c4[2].x + 80, y: c4[2].y + 40 })
await C.p.waitForTimeout(200)
ok((await etats(C.p, [IC2]))[0] === avantStylo[0] && await C.p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size) === nf + 1, '   … un trait commencé sur son coin écrit (l\'image ne change pas)', { avant: nf })
await ctxC.close()

// =====================================================================
console.log('=== D. au doigt ===')
const ctxD = await contexte({ hasTouch: true })
const Dd = await ouvrirDev(ctxD, 'doigt')
await Dd.p.evaluate(() => window.__app.choisirDoigt('dessine'))
await Dd.p.evaluate(PAGE_NEUVE)
const ID = await poser(Dd.p, image(300, 250, 300, 200))
// Un toucher sur l'image la prend : les poignées du doigt, le message du doigt
let sD = await ecran(Dd.p, 450, 350)
await Dd.doigt.bas(sD.x, sD.y); await attendre(50); await Dd.doigt.haut(); await Dd.p.waitForTimeout(400)
k = await cadre(Dd.p)
ok(meme(await sel(Dd.p), [ID]) && k?.pointeur === 'touch' && Math.abs(k.cadre.pastille.y - (250 - 36)) < 0.01, 'D1) Un toucher prend l\'image : les poignées du doigt (la pastille à 36 px)', k)
ok((await msgs(Dd.p)).includes('Coins : agrandir ou réduire ; côtés : déformer ; ↻ : tourner (touchez-la : un quart de tour)'), '   … le message du doigt (sans « Maj »)', await msgs(Dd.p))
// À 18 px du coin : la poignée se prend encore au doigt (20 px)
avant = await etats(Dd.p, [ID])
await glisser(Dd.p, Dd.doigt, { x: 612, y: 462 }, { x: 750, y: 550 })
f = await forme(Dd.p, ID)
ok(Math.abs(f.m[0] / f.m[3] - 1) < 1e-9 && f.m[0] > 5.5, 'D2) Un coin tiré au doigt, pris à 17 px : l\'image grandit, ses proportions gardées', f.m)
await Dd.p.keyboard.press('Control+z'); await Dd.p.waitForTimeout(150)
await prendre(Dd.p, [ID])
await tourner(Dd.p, Dd.doigt, -90)
f = await forme(Dd.p, ID)
ok(Math.abs(f.m[0]) < 1e-9 && f.m[1] < 0, 'D3) La pastille au doigt : un quart de tour (dans le sens direct)', f.m)
await Dd.p.keyboard.press('Control+z'); await Dd.p.waitForTimeout(150)
await prendre(Dd.p, [ID])
// L'appui long sur un coin n'ouvre rien
avant = await etats(Dd.p, [ID])
sD = await ecran(Dd.p, 600, 450)
await Dd.doigt.bas(sD.x, sD.y); await attendre(800)
const long = await Dd.p.evaluate(() => ({ options: window.__app.options, menu: !!document.querySelector('.menu-flottant:not([hidden])'), panneau: !!document.querySelector('.panneau-forme:not([hidden])') }))
await Dd.doigt.haut(); await Dd.p.waitForTimeout(200)
ok(long.options === null && !long.menu && !long.panneau && (await etats(Dd.p, [ID]))[0] === avant[0], 'D4) Un appui long sur un coin n\'ouvre aucun menu, ne change rien', long)
// Un second doigt pendant le geste : il s'abandonne, tout revient
await prendre(Dd.p, [ID])
n0 = await pile(Dd.p)
sD = await ecran(Dd.p, 600, 450)
await Dd.doigt.toucher('touchStart', [[sD.x, sD.y, 1]])
for (let i = 1; i <= 6; i++) { await Dd.doigt.toucher('touchMove', [[sD.x + i * 12, sD.y + i * 9, 1]]); await attendre(10) }
const pendantD = await Dd.p.evaluate(PENDANT, ID)
await Dd.doigt.toucher('touchStart', [[sD.x + 72, sD.y + 54, 1], [sD.x - 200, sD.y - 100, 2]]); await attendre(60)
const deux = await Dd.p.evaluate(PENDANT, ID)
await Dd.doigt.toucher('touchEnd', []); await Dd.p.waitForTimeout(200)
ok(pendantD.transfo && !deux.transfo && (await etats(Dd.p, [ID]))[0] === avant[0] && await pile(Dd.p) === n0, 'D5) Un second doigt pendant le geste : il s\'abandonne (le pincement), rien ne s\'écrit', { pendantD, deux })
await ctxD.close()

// =====================================================================
console.log('=== E. iPad : le doigt qui déplace, sous le Stylo ===')
const ctxE = await contexte({ hasTouch: true, viewport: { width: 1180, height: 820 } })
const E = await ouvrirDev(ctxE, 'ipad')
await E.p.evaluate(() => { window.__app.choisirDoigt('deplace') })
await E.p.evaluate(PAGE_NEUVE)
await E.p.evaluate(() => window.__app.choisirOutil('stylo'))
const IE = await poser(E.p, image(300, 250, 300, 200))
await prendre(E.p, [IE])
let sE = await ecran(E.p, 450, 350)
await E.stylet.survol(sE.x, sE.y); await E.p.waitForTimeout(120)
ok((await cadre(E.p)) === null, 'E1) Sous le Stylo, le crayon qui survole : aucune poignée', await cadre(E.p))
const nE = await E.p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
avant = await etats(E.p, [IE])
await glisser(E.p, E.stylet, { x: 600, y: 450 }, { x: 680, y: 500 })
ok((await etats(E.p, [IE]))[0] === avant[0] && await E.p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size) === nE + 1, '   … le crayon posé sur le coin écrit', nE)
await prendre(E.p, [IE])
sE = await ecran(E.p, 600, 450)
await glisser(E.p, E.doigt, { x: 600, y: 450 }, { x: 720, y: 530 })
f = await forme(E.p, IE)
ok(f.m[0] > 5.4 && Math.abs(f.m[0] / f.m[3] - 1) < 1e-9, 'E2) Le doigt qui déplace, sur le même coin : l\'image grandit (les poignées du doigt)', f.m)
// Le crayon qui se pose pendant que le doigt tire un coin : le geste du doigt s'abandonne
await E.p.keyboard.press('Control+z'); await E.p.waitForTimeout(150)
await prendre(E.p, [IE])
avant = await etats(E.p, [IE]); n0 = await pile(E.p)
sE = await ecran(E.p, 600, 450)
await E.doigt.toucher('touchStart', [[sE.x, sE.y, 1]])
for (let i = 1; i <= 6; i++) { await E.doigt.toucher('touchMove', [[sE.x + i * 12, sE.y + i * 9, 1]]); await attendre(10) }
const avantCrayon = await E.p.evaluate(PENDANT, IE)
const sC2 = await ecran(E.p, 750, 150)
await E.stylet.bas(sC2.x, sC2.y); await attendre(60)
const apresCrayon = await E.p.evaluate(PENDANT, IE)
await E.stylet.va(sC2.x + 30, sC2.y + 10); await E.stylet.haut(sC2.x + 30, sC2.y + 10)
await E.doigt.toucher('touchEnd', []); await E.p.waitForTimeout(200)
ok(avantCrayon.transfo && !apresCrayon.transfo && (await etats(E.p, [IE]))[0] === avant[0], 'E3) Le crayon posé pendant que le doigt tire un coin : le geste du doigt s\'abandonne, l\'image revient', { avantCrayon, apresCrayon })
await ctxE.close()

// =====================================================================
console.log('=== F. au téléphone ===')
const ctxF = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const Fp = await ouvrirDev(ctxF, 'téléphone')
await Fp.p.evaluate(() => window.__app.choisirDoigt('dessine'))
await Fp.p.evaluate(PAGE_NEUVE)
await Fp.p.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.rendu.toutRedessiner() })
const IF = await poser(Fp.p, image(110, 300, 200, 140))
let sF = await ecran(Fp.p, 210, 370)
await Fp.doigt.bas(sF.x, sF.y); await attendre(50); await Fp.doigt.haut(); await Fp.p.waitForTimeout(400)
k = await cadre(Fp.p); v = await vue(Fp.p)
const pF = versF(v, k.cadre.pastille)
ok(k?.pointeur === 'touch' && pF.x > 20 && pF.x < 370 && pF.y > 0 && pF.y < 844, 'F1) Une image prise au doigt : les poignées du doigt, la pastille à l\'écran', { k, pF })
const baF = await rect(Fp.p, '.barre-actions')
ok(!couvre(baF, disque(v, k.cadre.pastille, 17)), '   … la barre d\'actions ne la couvre pas', baF)
await glisser(Fp.p, Fp.doigt, { x: 310, y: 440 }, { x: 340, y: 470 })
f = await forme(Fp.p, IF)
ok(f.m[0] > 200 / 60 * 1.1, 'F2) Un coin tiré au doigt : elle grandit', f.m)
await ctxF.close()

// =====================================================================
console.log('=== G. la revue, le film élève ===')
const ctxG = await contexte()
const Gr = await ouvrirDev(ctxG, 'revue')
const R = Gr.p
await R.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => R.evaluate(ms => { window.__dec += ms }, ms)
await avancer(30 * 60_000)
await R.evaluate(PAGE_NEUVE)
await avancer(3000)
const Fr = await poser(R, formule(400, 300, { taille: 40 }))
await avancer(3000)
await R.waitForTimeout(200)
await prendre(R, [Fr])
await tourner(R, Gr.souris, 88)
await avancer(3000)
await R.waitForTimeout(300)
ok(Math.abs((await forme(R, Fr)).rotation - Math.PI / 2) < 1e-12, 'G0) La formule tournée de 90° à la pastille', (await forme(R, Fr)).rotation)
await vider(R)
const tRevue = () => R.evaluate(() => [...document.querySelectorAll('.revue-scene .formule')].filter(e => e.style.visibility !== 'hidden').map(e => e.style.transform))
await R.click('button[title^="Revoir la construction"]'); await R.waitForTimeout(700)
await R.keyboard.press('End'); await R.waitForTimeout(700)
const finR = await tRevue()
await R.keyboard.press('ArrowLeft'); await R.waitForTimeout(500)
const avantR = await tRevue()
ok(finR.length === 1 && /rotate\(1\.570\d*rad\)/.test(finR[0]) && avantR.length === 1 && avantR[0] === '', 'G1) La revue : tournée à la fin, droite un pas avant (le geste, d\'un coup)', { finR, avantR })
for (let i = 0; i < 4 && await R.evaluate(() => window.__app.enLecture); i++) { await R.keyboard.press('Escape'); await R.waitForTimeout(150) }
const film = await R.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, poignées' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length }
})
writeFileSync(D + '/poignees.mem', film.texte)
const Le = await ctxG.newPage(); suivre(Le, 'lecteur')
await Le.goto(DEV + 'revoir.html')
await Le.locator('input[type=file]').setInputFiles({ name: 'poignees.mem', mimeType: 'application/json', buffer: Buffer.from(film.texte) })
await Le.waitForTimeout(1500)
await Le.keyboard.press('End'); await Le.waitForTimeout(1200)
const lect = await Le.evaluate(() => [...document.querySelectorAll('.formule')].filter(e => e.style.visibility !== 'hidden').map(e => ({ t: e.style.transform, katex: !!e.querySelector('.katex') })))
ok(lect.length === 1 && /rotate\(1\.570\d*rad\)/.test(lect[0].t) && lect[0].katex && film.etapes >= 2, 'G2) Le film élève dans le nouveau lecteur, à la fin : la formule tournée (KaTeX)', { lect, etapes: film.etapes })
await ctxG.close()

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
