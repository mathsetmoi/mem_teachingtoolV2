// Vérification par appareil, lot 5 : la WACOM SANS ÉCRAN de la classe
// (pointerType 'pen' indirect, navigator.maxTouchPoints = 0, bouton latéral =
// clic droit, bout gomme), à 1366 × 768.
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, pile, cadre, vue, versF, ecran, glisser, glisserF, tourner, msgs, vider, entrees } = L

const ctx = await L.contexte()
const { p, stylet, souris, cdp } = await L.ouvrir(ctx, 'wacom')
ok(await p.evaluate(() => navigator.maxTouchPoints) === 0, 'W0) maxTouchPoints = 0 (Wacom sans écran)')
await p.evaluate(L.PAGE_NEUVE)

// W1. Survol au stylet : les poignées du stylet, le curseur du coin
const I = await poser(p, image(300, 250, 300, 200))
await prendre(p, [I])
let s = await ecran(p, 600, 450)
await stylet.survol(s.x + 30, s.y + 30); await attendre(40)
await stylet.survol(s.x, s.y); await attendre(80)
let k = await cadre(p)
const cur = await p.evaluate(() => document.getElementById('zone').style.cursor)
ok(k?.pointeur === 'pen' && cur === 'nwse-resize', 'W1) le survol de la Wacom : poignées du stylet, curseur du coin', { pointeur: k?.pointeur, cur })

// W2. Le coin pris à 11 px (dans la portée du stylet, 12) : l'image grandit, une étape
let n0 = await pile(p)
await glisserF(p, stylet, { x: s.x + 8, y: s.y + 8 }, { x: s.x + 108, y: s.y + 75 })
let f = await forme(p, I)
ok(f.m[0] > 5.5 && Math.abs((f.m[0] * f.l) / (f.m[3] * f.h) - 1.5) < 1e-3 && await pile(p) === n0 + 1, 'W2) un coin pris au stylet à 11 px : l\'image grandit, proportions gardées, une étape', { m: f.m, pile: await pile(p) - n0 })
await p.keyboard.press('Control+z'); await attendre(150)
await prendre(p, [I])

// W3. La pastille au stylet : 90° pile (l'aimant), sans Maj
let t = await tourner(p, stylet, 88, { pendant: () => p.evaluate(() => window.__app.rendu.mesure?.texte) })
f = await forme(p, I)
ok(Math.abs(f.m[0]) < 1e-9 && Math.abs(Math.abs(f.m[1]) - 5) < 1e-9 && /90°/.test(t ?? ''), 'W3) la pastille au stylet, 88° → 90° pile (aimant)', { m: f.m, t })
await p.keyboard.press('Control+z'); await attendre(150)
await prendre(p, [I])
// Maj tenue au clavier pendant que le stylet tourne : des pas de 15°
t = await tourner(p, stylet, 22, { maj: true, pendant: () => p.evaluate(() => window.__app.rendu.mesure?.texte) })
f = await forme(p, I)
const ang = Math.atan2(f.m[1], f.m[0]) / L.DEG
ok(Math.abs(ang - 15) < 1e-6 || Math.abs(ang - 30) < 1e-6, 'W3b) Maj + pastille au stylet : un pas de 15°', { ang, t })
await p.keyboard.press('Control+z'); await attendre(150)
// 2° sans aimant
await prendre(p, [I])
t = await tourner(p, stylet, 2, { rayon: 260, pendant: () => p.evaluate(() => window.__app.rendu.mesure?.texte) })
f = await forme(p, I)
const ang2 = Math.atan2(f.m[1], f.m[0]) / L.DEG
ok(Math.abs(ang2 - 2) < 0.6, 'W3c) 2° au stylet : pas ramené à 0', { ang2, t })
await p.keyboard.press('Control+z'); await attendre(150)

// W4. Au Stylo, l'image importée encore prise : un trait commencé sur son coin écrit
await p.evaluate(() => window.__app.choisirOutil('stylo'))
await prendre(p, [I])
const avant = await L.formes(p)
s = await ecran(p, 600, 450)
await glisserF(p, stylet, { x: s.x, y: s.y }, { x: s.x + 80, y: s.y + 30 }, { n: 10 })
let apres = await L.formes(p)
f = await forme(p, I)
ok(apres.length === avant.length + 1 && apres.some(g => g.type === 'trait') && f.m[0] === 5, 'W4) au Stylo, un trait commencé sur le coin de l\'image écrit (l\'image ne change pas)', { n: apres.length - avant.length, m: f.m })
const traitW = apres.find(g => g.type === 'trait').id

// W5. Le bouton latéral (clic droit) sur un objet verrouillé : son menu court
await p.evaluate(() => window.__app.choisirOutil('selection'))
const T = await poser(p, triangle(800, 500))
await prendre(p, [T])
await p.keyboard.press('Shift+L'); await attendre(200)
ok((await forme(p, T)).verrou === true && (await sel(p)).length === 0, 'W5) Maj + L verrouille le triangle, la sélection se vide', { f: (await forme(p, T)).verrou })
s = await ecran(p, 850, 450)
await stylet.bas(s.x, s.y, { bouton: 'right' }); await attendre(40); await stylet.haut(s.x, s.y); await attendre(250)
let e = await entrees(p, '.panneau-options:not([hidden]), .menu-options:not([hidden]), [role=toolbar].panneau:not([hidden])')
const titre = await p.evaluate(() => { const m = document.querySelector('.panneau-options, .options'); return m && !m.hidden ? m.textContent.slice(0, 120) : null })
note('menu au bouton latéral', { e, titre })
const deverr = await p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetWidth && /Déverrouiller/.test(b.textContent + (b.getAttribute('aria-label') ?? ''))).map(b => b.textContent.trim()))
ok(deverr.length > 0, 'W5b) le bouton du stylet sur l\'objet verrouillé ouvre son menu court (Déverrouiller)', { deverr, titre })
// Déverrouiller au stylet
const bd = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^Déverrouiller/.test(b.textContent.trim())); const r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
if (bd) { await stylet.bas(bd.x, bd.y); await attendre(30); await stylet.haut(bd.x, bd.y); await attendre(250) }
ok(!(await forme(p, T)).verrou && (await sel(p)).includes(T), 'W5c) Déverrouiller au stylet : libre et sélectionné', { verrou: (await forme(p, T)).verrou, sel: await sel(p) })
await vider(p)

// W6. Fixer en fond l'image, puis le bouton du stylet sur elle : le menu de la page, avec Détacher
await prendre(p, [I])
await p.evaluate(id => window.__app.fixerEnFond([id]), I); await attendre(200)
ok((await forme(p, I)).fixe === true, 'W6) l\'image est fixée en fond')
s = await ecran(p, 360, 300)
await stylet.bas(s.x, s.y, { bouton: 'right' }); await attendre(40); await stylet.haut(s.x, s.y); await attendre(250)
e = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(b => b.offsetWidth).map(b => b.textContent.trim()))
ok(e.some(x => /Détacher l.image du fond/.test(x)), 'W6b) le bouton du stylet sur l\'image fixée : le menu de la page a « Détacher l\'image du fond »', e)
await p.keyboard.press('Escape'); await attendre(150)

// W7. Le lasso au stylet parti de l'image fixée entoure l'écriture posée sur elle
const T2 = await poser(p, trait(380, 320, 60))
await vider(p)
const v = await vue(p)
const pts = []
for (let a = 0; a <= 360; a += 15) pts.push({ x: 410 + 60 * Math.cos(a * L.DEG), y: 320 + 30 * Math.sin(a * L.DEG) })
const F0 = versF(v, pts[0])
await stylet.survol(F0.x, F0.y); await stylet.bas(F0.x, F0.y)
for (const q of pts.slice(1)) { const F = versF(v, q); await stylet.va(F.x, F.y); await attendre(8) }
await stylet.haut(F0.x, F0.y); await attendre(200)
ok(L.couvre && (await sel(p)).includes(T2) && !(await sel(p)).includes(I) && (await forme(p, I)).m[0] === 5, 'W7) le lasso du stylet parti sur l\'image fixée prend l\'écriture, pas l\'image (qui ne bouge pas)', await sel(p))
await vider(p)

// W8. Le bout gomme (button 5, buttons 32), mode « là où elle passe », Sélection en main, sur l'image fixée et l'écriture
await p.evaluate(async () => {
  // le menu de la Gomme : « Effacer seulement là où elle passe »
  const b = window.__app.ui.outils.get('gomme')
  b.click(); await new Promise(r => setTimeout(r, 120)); b.click(); await new Promise(r => setTimeout(r, 200))
  const it = [...document.querySelectorAll('[role=menuitemradio]')].find(x => /seulement là où elle passe/.test(x.textContent))
  it?.click()
  await new Promise(r => setTimeout(r, 200))
  window.__app.choisirOutil('selection')
})
ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === 'zone', 'W8) la gomme en mode « là où elle passe » (mem-gomme = zone)', await p.evaluate(() => localStorage.getItem('mem-gomme')))
const nTraits = async () => (await L.formes(p)).filter(g => g.type === 'trait').length
const nAvant = await nTraits(), n1 = await pile(p)
// un coup vertical à travers le trait T2 (milieu x = 410), qui passe sur l'image fixée
await p.evaluate(({ a, b }) => {
  const z = document.getElementById('zone')
  const ev = (type, x, y, o) => z.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: 'pen', isPrimary: true, clientX: x, clientY: y, pressure: 0.5, ...o }))
  ev('pointerdown', a.x, a.y, { button: 5, buttons: 32 })
  for (let k = 1; k <= 12; k++) ev('pointermove', a.x, a.y + (b.y - a.y) * k / 12, { button: -1, buttons: 32 })
  ev('pointerup', b.x, b.y, { button: 5, buttons: 0 })
}, { a: versF(v, { x: 410, y: 280 }), b: versF(v, { x: 410, y: 360 }) })
await attendre(250)
const toutes = await L.formes(p)
ok(await nTraits() === nAvant + 1 && toutes.some(g => g.id === I) && await pile(p) === n1 + 1 && await p.evaluate(() => window.__app.outil) === 'selection',
  'W8b) le bout gomme coupe le trait en deux (une étape), ne touche pas l\'image fixée, la Sélection reste', { avant: nAvant, apres: await nTraits(), pile: await pile(p) - n1 })

// W9. Le bout gomme à la Sélection, sur le coin d'une image prise : il gomme, il ne redimensionne pas
const I2 = await poser(p, image(700, 150, 120, 80))
const T3 = await poser(p, trait(800, 230, 60, { }))
await prendre(p, [I2])
const c2 = versF(v, { x: 820, y: 230 })
const m2 = (await forme(p, I2)).m.slice()
await p.evaluate(({ a }) => {
  const z = document.getElementById('zone')
  const ev = (type, x, y, o) => z.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 8, pointerType: 'pen', isPrimary: true, clientX: x, clientY: y, pressure: 0.5, ...o }))
  ev('pointerdown', a.x, a.y, { button: 5, buttons: 32 })
  for (let k = 1; k <= 10; k++) ev('pointermove', a.x + 4 * k, a.y + 2 * k, { button: -1, buttons: 32 })
  ev('pointerup', a.x + 40, a.y + 20, { button: 5, buttons: 0 })
}, { a: c2 })
await attendre(250)
ok(JSON.stringify((await forme(p, I2)).m) === JSON.stringify(m2), 'W9) le bout gomme sur le coin d\'une image prise ne la redimensionne pas', { avant: m2, apres: (await forme(p, I2)).m })

// W10. Un groupe au stylet : un appui le prend, un second appui sur un membre ne prend que lui
await vider(p)
const A1 = await poser(p, trait(300, 600, 80)), A2 = await poser(p, trait(450, 600, 80))
await prendre(p, [A1, A2])
await p.keyboard.press('Control+g'); await attendre(200)
await vider(p)
const fa = await ecran(p, 340, 600)
await stylet.survol(fa.x, fa.y); await stylet.bas(fa.x, fa.y); await attendre(40); await stylet.haut(fa.x, fa.y); await attendre(400)
const s1 = await sel(p)
await stylet.bas(fa.x, fa.y); await attendre(40); await stylet.haut(fa.x, fa.y); await attendre(700)
const s2 = await sel(p)
ok(s1.length === 2 && s2.length === 1 && s2[0] === A1, 'W10) au stylet : un appui prend le groupe, un second appui ne prend que le membre', { s1, s2 })
note('messages', (await msgs(p)).slice(-6))

// W11. Le bouton du stylet ne vole pas un trait : pendant qu'on écrit, le bouton pressé n'ouvre rien
await p.evaluate(() => window.__app.choisirOutil('stylo'))
await vider(p)
const q = await ecran(p, 600, 650)
await stylet.bas(q.x, q.y)
for (let i = 1; i <= 6; i++) { await stylet.va(q.x + i * 8, q.y); await attendre(10) }
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: q.x + 48, y: q.y, pointerType: 'pen', button: 'right', buttons: 3, clickCount: 1, force: 0.5 })
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: q.x + 48, y: q.y, pointerType: 'pen', button: 'right', buttons: 1, clickCount: 1 })
for (let i = 7; i <= 12; i++) { await stylet.va(q.x + i * 8, q.y); await attendre(10) }
await stylet.haut(q.x + 96, q.y); await attendre(250)
const menus = await p.evaluate(() => [...document.querySelectorAll('.menu, .panneau-options')].filter(m => m.offsetWidth && !m.hidden).length)
ok(menus === 0, 'W11) le bouton du stylet pressé en plein trait n\'ouvre aucun menu', { menus })

await p.screenshot({ path: L.V + '/captures/w-fin.png' })
await L.fin()
