// ESSAI DU MORCEAU K5-transformer (lot 5) : le calcul du cadre et de la
// pastille (cadre.ts), la formule tournée lue partout, transformerSelection
// et « Remettre droit ». Aucune poignée à l'écran encore (K6) : les
// transformations passent par window.__app.transformerSelection et les
// matrices de src/cadre.ts.
// A. Une formule (une fraction) × 2 et tournée de 30° : sa taille de
//    caractères double, l'élément tourne (CSS), toujours du texte DOM (net à
//    400 %), sa boîte à l'écran est celle que calcule geometrie.ts ; elle se
//    prend au clic dans son rectangle tourné et pas dans un coin vide de son
//    englobante, au lasso de même ; son halo et son cadre en tirets suivent
//    son rectangle tourné.
// B. Une image tournée de 45° (pixels) ; un trait agrandi (épaisseur
//    doublée, pixels) ; un trait fermé tourné de 90° (son contour tourne :
//    la clé du cache des tracés, pixels) ; plusieurs objets tournés de 90°
//    (les sommets, les noms des points, le codage suivent).
// C. Ctrl + Z défait chaque transformation d'un coup ; une étape chacune.
// D. « Remettre droit » (menu ⋯, section « Position ») : la formule et
//    l'image ; absent pour une formule droite.
// E. Copier la page en image, le PDF (pdftoppm) : la formule tournée
//    (l'axe de ses pixels rouges à 30°).
// F. La revue (le résultat d'un coup, un pas avant : droite), le film élève
//    dans le nouveau lecteur : tournée (rangé dans le dépôt : la lecture
//    du .memc par la version d'avant le lot 5 est retirée).
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K5-transformer/travail'
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

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
  return c
}
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
    window.__geo = await import('/src/geometrie.ts')
    window.__formes = await import('/src/formes.ts')
  })
  return p
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
const IMAGES = () => {
  const unie = (c) => { const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 60, 40); return cv.toDataURL('image/png') }
  window.__app.tableau.doc.getMap('images').set('k5-vert', unie('#00c000'))
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
const FRACTION = '\\frac{123456789}{987654321}'
const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: FRACTION, couleur: '#d0342c', taille: 28, ...o })
const image = (x, y, l, h, o = {}) => ({ type: 'image', src: 'k5-vert', x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o }
}

async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(60); return id }
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
const sel = p => p.evaluate(() => [...window.__app.selection])
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const prendre = (p, ids) => p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, ids)
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
/** transformerSelection d'une matrice faite dans la page (code : le corps d'une fonction de C, le module cadre.ts, et f, la forme) */
const transformer = (p, ids, code, id) => p.evaluate(({ ids, code, id }) => {
  const C = window.__cadre, a = window.__app, f = a.forme(id ?? ids[0])
  const M = new Function('C', 'f', 'a', 'return ' + code)(C, f, a)
  return a.transformerSelection(M, ids)
}, { ids, code, id })
const etats = (p, ids) => p.evaluate(ids => ids.map(id => JSON.stringify(window.__app.forme(id))), ids)
/** C. Ctrl + Z juste après une transformation : tout revient d'un coup comme avant ; Ctrl + Y la refait */
async function annulerRetablir(p, ids, avant, nom) {
  const apres = await etats(p, ids)
  const sel0 = await sel(p)
  await vider(p); await p.mouse.move(5, 400)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(150)
  const annule = await etats(p, ids)
  await p.keyboard.press('Control+y'); await p.waitForTimeout(150)
  const retabli = await etats(p, ids)
  ok(annule.every((x, i) => x === avant[i]) && retabli.every((x, i) => x === apres[i]) && apres.every((x, i) => x !== avant[i]),
    `C) ${nom} : Ctrl + Z la défait d'un coup (tout revient comme avant), Ctrl + Y la refait`, { annule, avant, retabli, apres })
  await prendre(p, sel0)
}
async function clic(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y); await p.waitForTimeout(80); return sel(p) }
/** La couleur d'un pixel du monde (x, y) sur la scène du tableau */
const COULEUR = ({ x, y }) => {
  const a = window.__app, s = a.cam.versEcran(x, y), c = a.rendu.scene, k = c.width / c.clientWidth
  const d = c.getContext('2d').getImageData(Math.round(s.x * k), Math.round(s.y * k), 1, 1).data
  const [r, v, b] = d
  return r < 60 && v > 150 && b < 60 ? 'vert' : r < 80 && v < 80 && b < 90 ? 'sombre' : `${r},${v},${b}`
}
const couleur = async (p, x, y) => { await p.waitForTimeout(60); return p.evaluate(COULEUR, { x, y }) }
/** L'opacité la plus forte de la couche « direct » autour d'un point du monde (5 × 5 px) */
const DIRECT = ({ x, y }) => {
  const a = window.__app, s = a.cam.versEcran(x, y), c = a.rendu.direct, k = c.width / c.clientWidth
  const d = c.getContext('2d').getImageData(Math.round(s.x * k) - 2, Math.round(s.y * k) - 2, 5, 5).data
  let m = 0; for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i])
  return m
}
const direct = async (p, x, y) => { await p.waitForTimeout(80); return p.evaluate(DIRECT, { x, y }) }
/** Un point de la formule (u, v dans son repère, non tourné), dans le monde */
const SUR = ({ id, u, v }) => {
  const f = window.__app.forme(id), r = f.rotation ?? 0, c = Math.cos(r), s = Math.sin(r)
  return { x: f.x + u * c - v * s, y: f.y + u * s + v * c }
}
const sur = (p, id, u, v) => p.evaluate(SUR, { id, u, v })

/** L'angle (degrés, y vers le bas) de l'axe principal des pixels rouges d'une image en base64 (ou d'un canevas) */
const AXE_ROUGE = async (b64) => {
  let c
  if (b64 === null) c = window.__image
  else { const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode(); c = document.createElement('canvas'); c.width = img.width; c.height = img.height; c.getContext('2d').drawImage(img, 0, 0) }
  const d = c.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, c.width, c.height).data
  let n = 0, sx = 0, sy = 0
  const pts = []
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = 4 * (y * c.width + x), r = d[i], v = d[i + 1], b = d[i + 2]
    if (r > 150 && v < 110 && b < 110) { n++; sx += x; sy += y; pts.push(x, y) }
  }
  if (n < 20) return { n }
  const mx = sx / n, my = sy / n
  let xx = 0, yy = 0, xy = 0
  for (let k = 0; k < pts.length; k += 2) { const dx = pts[k] - mx, dy = pts[k + 1] - my; xx += dx * dx; yy += dy * dy; xy += dx * dy }
  return { n, angle: 0.5 * Math.atan2(2 * xy, xx - yy) * 180 / Math.PI, allonge: Math.sqrt((xx + yy + Math.hypot(xx - yy, 2 * xy)) / (xx + yy - Math.hypot(xx - yy, 2 * xy) + 1e-9)) }
}
const ENTREES = sel => {
  const m = document.querySelector(sel)
  if (!m || m.hidden) return null
  return [...m.children].map(b => b.matches('hr') ? { filet: true } : b.matches('.menu-titre') ? { titre: b.textContent }
    : { t: b.querySelector('.libelle')?.firstChild?.textContent, aide: b.querySelector('small')?.textContent, action: b.dataset.action })
}

// =====================================================================
console.log('=== A. une formule × 2, tournée de 30° ===')
const ctx = await contexte()
const P = await ouvrirDev(ctx, 'tableau')
await P.evaluate(IMAGES)
await P.evaluate(PAGE_NEUVE)
const F = await poser(P, formule(300, 200))
await P.waitForTimeout(300)
const avant = await P.evaluate(id => { const a = window.__app, e = a.rendu.elementsFormules.get(id).el; return { fs: e.style.fontSize, ...a.rendu.boiteFormule(a.forme(id)) } }, F)
let p0 = await pile(P)
let avantJ = await etats(P, [F])
const centre0 = { x: 300 + avant.l, y: 200 + avant.h }       // le centre, une fois agrandie × 2
let r = await transformer(P, [F], `C.composer(C.echelle({ x: 300, y: 200 }, 2, 2), C.rotation(${JSON.stringify(centre0)}, Math.PI / 6))`)
await P.waitForTimeout(300)
const apres = await P.evaluate(id => {
  const a = window.__app, f = a.forme(id), e = a.rendu.elementsFormules.get(id).el, b = a.rendu.boite(f)
  const s1 = a.cam.versEcran(b.x, b.y), s2 = a.cam.versEcran(b.x + b.l, b.y + b.h), z = document.getElementById('zone').getBoundingClientRect(), rr = e.getBoundingClientRect()
  return {
    taille: f.taille, rotation: f.rotation, fs: e.style.fontSize, transform: e.style.transform, origine: e.style.transformOrigin,
    katex: !!e.querySelector('.katex-html'), texte: e.textContent.includes('123456789'), canevas: e.querySelectorAll('canvas, img, svg image').length,
    rect: { x: rr.left - z.left, y: rr.top - z.top, l: rr.width, h: rr.height }, calcule: { x: s1.x, y: s1.y, l: s2.x - s1.x, h: s2.y - s1.y }, local: a.rendu.boiteFormule(f),
  }
}, F)
ok(r === true && apres.taille === 56 && apres.fs === '56px' && avant.fs === '28px', 'A1) × 2 : la taille de la formule double (28 → 56), son font-size aussi', { r, avant, apres })
ok(Math.abs(apres.rotation - Math.PI / 6) < 1e-9 && /^rotate\(0\.5235\d*rad\)$/.test(apres.transform) && /^0(px)? 0(px)?$/.test(apres.origine), 'A2) Tournée de 30° : rotation = π/6, l\'élément tourne par CSS autour de son coin', apres)
ok(apres.katex && apres.texte && apres.canevas === 0, 'A3) Toujours du texte DOM (KaTeX), pas une image', apres)
ok(['x', 'y', 'l', 'h'].every(k => Math.abs(apres.rect[k] - apres.calcule[k]) < 2.5), 'A4) Sa boîte à l\'écran (getBoundingClientRect) est l\'englobante que calcule geometrie.ts', { rect: apres.rect, calcule: apres.calcule })
ok(await pile(P) === p0 + 1, 'A5) Une transformation : une étape d\'annulation', { p0, p: await pile(P) })
await annulerRetablir(P, [F], avantJ, 'la formule × 2 et tournée')
// Net à 400 % : la couche des formules s'agrandit d'un transform, le texte reste du texte
await P.evaluate(() => { const a = window.__app; a.cam.zoomerAutour(500, 400, 4); a.rendu.toutRedessiner() })
await P.waitForTimeout(200)
const zoom = await P.evaluate(id => { const a = window.__app, e = a.rendu.elementsFormules.get(id).el; return { couche: a.rendu.coucheFormules.style.transform, fs: e.style.fontSize, transform: e.style.transform, katex: !!e.querySelector('.katex-html') } }, F)
ok(/scale\(4\)/.test(zoom.couche) && zoom.fs === '56px' && zoom.katex && /rotate/.test(zoom.transform), 'A6) À 400 % : la couche agrandie par CSS, la formule toujours en texte, tournée (nette)', zoom)
await P.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner() })
await P.waitForTimeout(200)
// La prise : dans son rectangle tourné ; pas dans un coin vide de son englobante
const L = apres.local
const dedans = await sur(P, F, L.l * 0.85, L.h * 0.5)
const vide = await P.evaluate(id => { const a = window.__app, b = a.rendu.boite(a.forme(id)); return { x: b.x + b.l - 6, y: b.y + 6 } }, F)
await vider(P)
let s = await clic(P, vide.x, vide.y)
ok(s.length === 0, 'A7) Un clic dans le coin vide de son englobante ne la prend pas', { s, vide })
s = await clic(P, dedans.x, dedans.y)
ok(JSON.stringify(s) === JSON.stringify([F]), 'A8) Un clic dans son rectangle tourné la prend', { s, dedans })
// Son cadre en tirets suit le rectangle tourné : rien dans le coin vide de l'englobante
await P.mouse.move(5, 400); await P.waitForTimeout(150)
const coinCadre = await direct(P, vide.x, vide.y)
const bordCadre = await P.evaluate(({ id, L }) => {
  // Le milieu du bord du haut, 6 px au-dessus (le cadre en tirets) : on cherche le long du bord
  const a = window.__app, f = a.forme(id), r = f.rotation, c = Math.cos(r), s = Math.sin(r)
  let m = 0
  for (let u = 0.2; u <= 0.8; u += 0.02) {
    const x = f.x + u * L.l * c - (-6) * s, y = f.y + u * L.l * s + (-6) * c
    const e = a.cam.versEcran(x, y), cv = a.rendu.direct, k = cv.width / cv.clientWidth
    const d = cv.getContext('2d').getImageData(Math.round(e.x * k) - 1, Math.round(e.y * k) - 1, 3, 3).data
    for (let i = 3; i < d.length; i += 4) m = Math.max(m, d[i])
  }
  return m
}, { id: F, L })
ok(coinCadre === 0 && bordCadre > 100, 'A9) Sélectionnée : son cadre en tirets suit son rectangle tourné (rien dans le coin vide de l\'englobante)', { coinCadre, bordCadre })
// Le halo du survol aussi
await vider(P)
const milieu = await sur(P, F, L.l / 2, L.h / 2)
const sm = await ecran(P, milieu.x, milieu.y)
await P.mouse.move(sm.x, sm.y); await P.waitForTimeout(200)
const halo = { survol: await P.evaluate(() => window.__app.rendu.survol), centre: await direct(P, milieu.x, milieu.y), coin: await direct(P, vide.x, vide.y) }
ok(halo.survol === F && halo.centre > 0 && halo.coin === 0, 'A10) Survolée : son halo suit son rectangle tourné', halo)
// Le lasso : autour de son rectangle tourné, il la prend ; un cadre sur la moitié vide de l'englobante, non
await P.mouse.move(5, 400); await P.waitForTimeout(100)
const lasso = await P.evaluate(({ id, L }) => {
  const a = window.__app, f = a.forme(id), r = f.rotation, c = Math.cos(r), s = Math.sin(r)
  const pt = (u, v) => ({ x: f.x + u * c - v * s, y: f.y + u * s + v * c })
  return [pt(-8, -8), pt(L.l + 8, -8), pt(L.l + 8, L.h + 8), pt(-8, L.h + 8), pt(-8, -8)]
}, { id: F, L })
// Au stylet (une tablette graphique) : la Sélection trace un lasso
const cdp = await ctx.newCDPSession(P)
const plume = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: type === 'mouseMoved' && !o.appui ? 'none' : 'left', buttons: o.appui === false ? 0 : 1, clickCount: 1, force: 0.5 })
async function lassoAuStylet(p, pts) {
  const e0 = await ecran(p, pts[0].x, pts[0].y)
  await plume('mouseMoved', e0.x, e0.y, { appui: false }); await plume('mousePressed', e0.x, e0.y)
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    for (let k = 1; k <= 8; k++) { const e = await ecran(p, a.x + (b.x - a.x) * k / 8, a.y + (b.y - a.y) * k / 8); await plume('mouseMoved', e.x, e.y, { appui: true }) }
  }
  const e1 = await ecran(p, pts.at(-1).x, pts.at(-1).y)
  await plume('mouseReleased', e1.x, e1.y, { appui: false }); await p.waitForTimeout(150)
}
await lassoAuStylet(P, lasso)
ok(JSON.stringify(await sel(P)) === JSON.stringify([F]), 'A11) Un lasso au stylet autour de son rectangle tourné la prend', await sel(P))
await vider(P)
// Un cadre à la souris sur la moitié droite de son englobante : pris seulement si plus de la moitié de la formule y est (son rectangle tourné)
const cadre = await P.evaluate(id => {
  const a = window.__app, f = a.forme(id), b = a.rendu.boite(f), l = a.rendu.boiteFormule(f)
  const r = { x: b.x + b.l / 2, y: b.y - 20, l: b.l / 2 + 20, h: b.h + 40 }
  const part = window.__geo.partDedans(f, (x, y) => x >= r.x && x <= r.x + r.l && y >= r.y && y <= r.y + r.h, l)
  return { r, part }
}, F)
async function cadreSouris(p, r) {
  const a = await ecran(p, r.x, r.y), b = await ecran(p, r.x + r.l, r.y + r.h)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= 10; k++) await p.mouse.move(a.x + (b.x - a.x) * k / 10, a.y + (b.y - a.y) * k / 10)
  await p.mouse.up(); await p.waitForTimeout(150)
}
await cadreSouris(P, cadre.r)
const parCadre = await sel(P)
ok((cadre.part > 0.5) === (parCadre.length === 1) && cadre.part > 0.05 && cadre.part < 0.95, 'A12) Un cadre sur la moitié de son englobante : elle s\'y mesure dans son rectangle tourné', { cadre, parCadre })
await vider(P)

// =====================================================================
console.log('=== B. une image, des traits, plusieurs objets ===')
const I = await poser(P, image(700, 150, 200, 100))
// Un point repéré sur l'image, verrouillé : il la suit quand même (D4)
const Pt = await poser(P, { type: 'polygone', x: 880, y: 160, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['M'], stylePoints: [{ marque: 'croix' }], verrou: true })
await P.evaluate(([I, Pt]) => { const a = window.__app; a.tableau.modifier(a.page, [{ id: Pt, patch: { lie: I } }]) }, [I, Pt])
await P.waitForTimeout(200)
p0 = await pile(P)
avantJ = await etats(P, [I, Pt])
r = await transformer(P, [I], 'C.rotation({ x: 800, y: 200 }, Math.PI / 4)')
await P.waitForTimeout(250)
const fi = await forme(P, I)
const cImg = { centre: await couleur(P, 800, 200), coinHautGauche: await couleur(P, 700 + 8, 150 - 30), basDroit: await couleur(P, 800 + 80 * Math.SQRT1_2, 200 + 80 * Math.SQRT1_2) }
ok(r && Math.abs(fi.m[0] - Math.SQRT1_2 * 200 / 60) < 1e-9 && Math.abs(fi.m[1] - Math.SQRT1_2 * 200 / 60) < 1e-9 && await pile(P) === p0 + 1, 'B1) Une image tournée de 45° : sa matrice, une étape', fi.m)
ok(cImg.centre === 'vert' && cImg.coinHautGauche !== 'vert' && cImg.basDroit === 'vert', '   … et peinte tournée (pixels : le coin de sa boîte d\'avant est vide, un point de sa diagonale est peint)', cImg)
const fpt = await forme(P, Pt)
// (880, 160) tourné de 45° autour de (800, 200) : (800 + 120 / √2, 200 + 40 / √2)
ok(Math.abs(fpt.x - (800 + 120 * Math.SQRT1_2)) < 0.01 && Math.abs(fpt.y - (200 + 40 * Math.SQRT1_2)) < 0.01 && fpt.verrou === true && fpt.lie === I,
  '   … le point verrouillé repéré sur elle la suit (tourné avec elle autour du même centre)', fpt)
await annulerRetablir(P, [I, Pt], avantJ, 'l\'image tournée (et son point)')
// Un trait agrandi : son épaisseur double
const T = await poser(P, trait(300, 520, 100))
await P.waitForTimeout(200)
const epais = async (x, y0, y1) => P.evaluate(({ x, y0, y1 }) => {
  const a = window.__app, c = a.rendu.scene, k = c.width / c.clientWidth
  let n = 0
  for (let y = y0; y <= y1; y += 0.5) { const s = a.cam.versEcran(x, y); const d = c.getContext('2d').getImageData(Math.round(s.x * k), Math.round(s.y * k), 1, 1).data; if (d[0] < 120 && d[1] < 120 && d[2] < 140) n++ }
  return n / 2
}, { x, y0, y1 })
const e1 = await epais(350, 505, 535)
avantJ = await etats(P, [T])
r = await transformer(P, [T], 'C.echelle({ x: 300, y: 520 }, 2, 2)')
await P.waitForTimeout(250)
const ft = await forme(P, T), e2 = await epais(400, 505, 535)
ok(r && ft.taille === 8 && ft.pts[ft.pts.length - 3] === 200, 'B2) Un trait agrandi × 2 : deux fois plus long, épaisseur 4 → 8', { taille: ft.taille, fin: ft.pts.slice(-3) })
ok(e2 >= 1.6 * e1 && e1 > 0, '   … et peint deux fois plus épais (pixels)', { e1, e2 })
ok(await couleur(P, 490, 520) === 'sombre', '   … jusqu\'à son nouveau bout (pixels)', await couleur(P, 490, 520))
await annulerRetablir(P, [T], avantJ, 'le trait agrandi')
// Un trait fermé (un « L » qui revient à son départ) tourné de 90° autour de son premier point
const boucle = await P.evaluate(() => {
  const sommets = [[0, 0], [200, 0], [200, 40], [0, 0]], pts = []
  for (let s = 0; s < 3; s++) for (let i = 0; i < 20; i++) { const [x0, y0] = sommets[s], [x1, y1] = sommets[s + 1]; pts.push(x0 + (x1 - x0) * i / 20, y0 + (y1 - y0) * i / 20, 0.5) }
  pts.push(0, 0, 0.5)
  return pts
})
const B = await poser(P, { type: 'trait', x: 1100, y: 300, pts: boucle, couleur: '#000000', taille: 6, opacite: 1, pression: false })
await P.waitForTimeout(200)
const bAvant = { droite: await couleur(P, 1200, 300), bas: await couleur(P, 1100, 400) }
avantJ = await etats(P, [B])
r = await transformer(P, [B], 'C.rotation({ x: 1100, y: 300 }, Math.PI / 2)')
await P.waitForTimeout(250)
const bApres = { droite: await couleur(P, 1200, 300), bas: await couleur(P, 1100, 400) }
ok(r && bAvant.droite === 'sombre' && bAvant.bas !== 'sombre' && bApres.bas === 'sombre' && bApres.droite !== 'sombre', 'B3) Un trait fermé tourné de 90° : son contour tourne à l\'écran (la clé du cache des tracés voit la rotation)', { bAvant, bApres })
await annulerRetablir(P, [B], avantJ, 'le trait fermé tourné')
const bRetour = { droite: await couleur(P, 1200, 300), bas: await couleur(P, 1100, 400) }
ok(bRetour.bas === 'sombre' && bRetour.droite !== 'sombre', '   … et repeint tourné après Ctrl + Z puis Ctrl + Y', bRetour)
// Plusieurs objets tournés de 90° : un triangle rectangle isocèle nommé et codé, et un trait
const Tri = await poser(P, { type: 'polygone', x: 300, y: 650, pts: [0, 0, 120, 0, 0, -120], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], codage: true, posNoms: [{ x: -30, y: 0 }, null, null] })
const T2 = await poser(P, trait(460, 600, 80))
await P.waitForTimeout(200)
avantJ = await etats(P, [Tri, T2])
const plusieurs = await P.evaluate(([Tri, T2]) => {
  const a = window.__app, Fo = window.__formes, f = a.forme(Tri)
  a.selection.clear(); a.selection.add(Tri); a.selection.add(T2)
  const b = a.boiteDuContenu([a.forme(Tri), a.forme(T2)]), c = { x: b.x + b.l / 2, y: b.y + b.h / 2 }
  const avant = { sommets: Fo.sommetsDe(f), noms: Fo.placesDesNoms(f), codage: Fo.codageDe(f), pile: a.tableau.annulationDe(a.page).undoStack.length }
  const r = a.transformerSelection(window.__cadre.rotation(c, Math.PI / 2))
  const g = a.forme(Tri)
  return { r, c, avant, apres: { sommets: Fo.sommetsDe(g), noms: Fo.placesDesNoms(g), codage: Fo.codageDe(g), posNoms: g.posNoms, pile: a.tableau.annulationDe(a.page).undoStack.length, sel: [...a.selection] } }
}, [Tri, T2])
const tourne = (p, c) => ({ x: c.x - (p.y - c.y), y: c.y + (p.x - c.x) })
const pres = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < 0.15
ok(plusieurs.r && plusieurs.avant.sommets.every((p, i) => pres(plusieurs.apres.sommets[i], tourne(p, plusieurs.c))), 'B4) Plusieurs objets tournés de 90° : les sommets ont tourné autour du centre de leur boîte', plusieurs)
ok(plusieurs.avant.noms.every((p, i) => pres(plusieurs.apres.noms[i], tourne(p, plusieurs.c))), '   … les noms des points aussi (A déplacé à la main : son décalage a tourné)', { avant: plusieurs.avant.noms, apres: plusieurs.apres.noms, posNoms: plusieurs.apres.posNoms })
ok(plusieurs.apres.codage.traits.length === plusieurs.avant.codage.traits.length && plusieurs.apres.codage.droits.length === 1 && plusieurs.avant.codage.droits.length === 1,
  '   … le codage suit (les mêmes côtés égaux, le même angle droit)', { avant: plusieurs.avant.codage, apres: plusieurs.apres.codage })
ok(plusieurs.apres.pile === plusieurs.avant.pile + 1 && plusieurs.apres.sel.length === 2, '   … une étape pour tout ; la sélection reste', plusieurs.apres)
await annulerRetablir(P, [Tri, T2], avantJ, 'les deux objets tournés ensemble')

// =====================================================================
console.log('=== D. Remettre droit ===')
async function menuPlus(p, id) {
  await vider(p)
  const m = await p.evaluate(SUR, { id, u: 20, v: 15 })
  const sm = await ecran(p, m.x, m.y)
  await p.mouse.click(sm.x, sm.y, { button: 'right' }); await p.waitForTimeout(250)
  const b = p.locator('.panneau-forme:not([hidden]) button.plus')
  if (!await b.count()) return null
  await b.first().click(); await p.waitForTimeout(150)
  return p.evaluate(ENTREES, '.menu-flottant:not([hidden])')
}
let entrees = await menuPlus(P, F)
const position = entrees?.findIndex(x => x.titre === 'Position') ?? -1
const proteger = entrees?.findIndex(x => x.titre === 'Protéger') ?? -1
const redr = entrees?.find(x => x.action === 'redresser')
ok(position > proteger && proteger >= 0 && redr?.t === 'Remettre droit' && redr?.aide === 'Annule la rotation, garde la taille', 'D1) Le menu ⋯ d\'une formule tournée : la section « Position » après « Protéger », « Remettre droit » et son aide', entrees)
const centreAvant = await sur(P, F, L.l / 2, L.h / 2)
p0 = await pile(P)
await P.click('.menu-flottant:not([hidden]) [data-action="redresser"]'); await P.waitForTimeout(250)
const fd = await forme(P, F)
const ld = await P.evaluate(id => { const a = window.__app; return { ...a.rendu.boiteFormule(a.forme(id)), t: a.rendu.elementsFormules.get(id).el.style.transform } }, F)
ok(!('rotation' in fd) && fd.taille === 56 && ld.t === '' && await pile(P) === p0 + 1, 'D2) Remettre droit : la clé rotation n\'existe plus, la taille reste (56), une étape', { fd, ld })
ok(Math.abs(fd.x + ld.l / 2 - centreAvant.x) < 1.5 && Math.abs(fd.y + ld.h / 2 - centreAvant.y) < 1.5, '   … et son centre ne bouge pas', { centreAvant, centre: { x: fd.x + ld.l / 2, y: fd.y + ld.h / 2 } })
entrees = await menuPlus(P, F)
// (retouches après le lot 5 : la section « Position » a les quarts de tour pour
// tout ce qui tourne à la pastille ↻ ; droite, la formule n'a plus « Remettre droit »)
ok(entrees && !entrees.some(x => x.action === 'redresser') && entrees.some(x => x.titre === 'Position') && entrees.some(x => x.action === 'quart-gauche') && entrees.some(x => x.action === 'quart-droite'),
  'D3) Une formule droite : plus de « Remettre droit » dans son menu ⋯ ; sa section « Position » garde les quarts de tour', entrees)
await P.keyboard.press('Escape'); await vider(P)
await P.keyboard.press('Control+z'); await P.waitForTimeout(200)
ok(Math.abs((await forme(P, F)).rotation - Math.PI / 6) < 1e-9, 'D4) Ctrl + Z : la rotation revient', (await forme(P, F)).rotation)
// L'image : Remettre droit par le menu ⋯
await vider(P)
await P.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions?.(a.forme(id)); a.ui.maj() }, I)
await P.waitForTimeout(200)
let imgDroite = await P.evaluate(id => { const a = window.__app; return a.redresserSelection() && JSON.parse(JSON.stringify(a.forme(id))) }, I)
const ptDroit = await forme(P, Pt)
ok(Math.abs(ptDroit.x - 880) < 0.01 && Math.abs(ptDroit.y - 160) < 0.01, 'D6) … et le point repéré sur elle revient avec elle', ptDroit)
ok(imgDroite && [200 / 60, 0, 0, 100 / 40].every((v, k) => Math.abs(imgDroite.m[k] - v) < 1e-9) && imgDroite.m[1] === 0 && imgDroite.m[2] === 0 && Math.abs(imgDroite.x - 700) < 1e-6 && Math.abs(imgDroite.y - 150) < 1e-6, 'D5) Remettre droit une image tournée de 45° : droite, à sa place d\'avant (centre gardé)', imgDroite)
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
await vider(P)

// =====================================================================
console.log('=== E. Copier la page en image, le PDF ===')
// Une page avec la seule formule tournée de 30° (rouge)
await P.evaluate(PAGE_NEUVE)
const F2 = await poser(P, formule(300, 250, { taille: 40 }))
await P.waitForTimeout(250)
await transformer(P, [F2], 'C.rotation({ x: 300, y: 250 }, Math.PI / 6)')
await P.waitForTimeout(250)
await P.evaluate(() => navigator.clipboard.writeText('rien'))
await P.evaluate(() => { window.__msgs = []; window.__app.ui.copierEnImage('page') })
await P.waitForFunction(() => (window.__msgs || []).some(m => /^Image copiée/.test(m)), null, { timeout: 15000 }).catch(() => null)
const lu = await P.evaluate(async () => {
  const items = await navigator.clipboard.read()
  const it = items.find(i => i.types.includes('image/png'))
  if (!it) return null
  const b = await it.getType('image/png')
  const img = new Image(); img.src = URL.createObjectURL(b); await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  c.getContext('2d').drawImage(img, 0, 0)
  window.__image = c
  return { l: img.width, h: img.height }
})
const axeImage = lu ? await P.evaluate(AXE_ROUGE, null) : null
ok(axeImage && Math.abs(axeImage.angle - 30) < 4 && axeImage.allonge > 2, 'E1) « Copier la page en image » : la formule y est tournée de 30° (l\'axe de ses pixels rouges)', { lu, axeImage })
// Le PDF de cette page
const pdf = await (async () => {
  await P.evaluate(() => window.__app.ui.exporterPdf({ page: window.__app.page }))
  await P.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const dl = P.waitForEvent('download', { timeout: 60000 }).catch(() => null)
  await P.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/tournee.pdf`
  await d.saveAs(f)
  execFileSync('pdftoppm', ['-r', '60', '-png', f, `${D}/tournee`])
  const png = readdirSync(D).filter(x => x.startsWith('tournee-') && x.endsWith('.png')).sort()[0]
  return png ? P.evaluate(AXE_ROUGE, readFileSync(`${D}/${png}`).toString('base64')) : null
})()
ok(pdf && Math.abs(pdf.angle - 30) < 4 && pdf.allonge > 2, 'E2) Le PDF (pdftoppm) : la formule tournée de 30°', pdf)
await P.keyboard.press('Escape')

// =====================================================================
console.log('=== F. la revue, le film élève, le nouveau lecteur ; la version d\'avant ===')
const ctxF = await contexte()
const R = await ouvrirDev(ctxF, 'revue')
await R.evaluate(IMAGES)
await R.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => R.evaluate(ms => { window.__dec += ms }, ms)
await avancer(30 * 60_000)
await R.evaluate(PAGE_NEUVE)
await avancer(3000)
const Fr = await poser(R, formule(300, 250, { taille: 40 }))
await avancer(3000)
const Ir = await poser(R, image(700, 150, 200, 100))
await avancer(3000)
const Tr = await poser(R, trait(300, 520, 100))
await avancer(3000)
await transformer(R, [Fr], 'C.rotation({ x: 300, y: 250 }, Math.PI / 6)')
await avancer(3000)
await transformer(R, [Ir], 'C.rotation({ x: 800, y: 200 }, Math.PI / 4)')
await avancer(3000)
await transformer(R, [Tr], 'C.echelle({ x: 300, y: 520 }, 2, 2)')
await avancer(3000)
await R.waitForTimeout(300)
const tRevue = async () => R.evaluate(id => [...document.querySelectorAll('.revue-scene .formule')].filter(e => e.style.visibility !== 'hidden').map(e => e.style.transform), Fr)
await R.click('button[title^="Revoir la construction"]'); await R.waitForTimeout(700)
await R.keyboard.press('End'); await R.waitForTimeout(700)
const finR = await tRevue()
for (let k = 0; k < 2; k++) { await R.keyboard.press('ArrowLeft'); await R.waitForTimeout(500) }
const avantR = await tRevue()
await R.keyboard.press('ArrowLeft'); await R.waitForTimeout(500)
const avantR2 = await tRevue()
ok(finR.length === 1 && /rotate\(0\.5235/.test(finR[0]), 'F1) La revue, à la fin : la formule tournée', finR)
ok(avantR.length === 1 && /rotate\(0\.5235/.test(avantR[0]) && avantR2.length === 1 && avantR2[0] === '', '   … pas à pas : la rotation est un geste, montré d\'un coup (droite avant, tournée après)', { avantR, avantR2 })
for (let i = 0; i < 4 && await R.evaluate(() => window.__app.enLecture); i++) { await R.keyboard.press('Escape'); await R.waitForTimeout(150) }
const film = await R.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, transformer' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length }
})
writeFileSync(D + '/transformer.mem', film.texte)
const Le = await ctxF.newPage(); suivre(Le, 'lecteur')
await Le.goto(DEV + 'revoir.html')
await Le.locator('input[type=file]').setInputFiles({ name: 'transformer.mem', mimeType: 'application/json', buffer: Buffer.from(film.texte) })
await Le.waitForTimeout(1500)
await Le.keyboard.press('End'); await Le.waitForTimeout(1200)
const lect = await Le.evaluate(() => [...document.querySelectorAll('.formule')].filter(e => e.style.visibility !== 'hidden').map(e => ({ t: e.style.transform, katex: !!e.querySelector('.katex') })))
ok(lect.length === 1 && /rotate\(0\.5235/.test(lect[0].t) && lect[0].katex, 'F2) Le film élève dans le nouveau lecteur, à la fin : la formule tournée (KaTeX)', { lect, etapes: film.etapes })
await Le.close()
// Le .memc du lot 5 (que la version d'avant ouvrait, voir plus bas)
const memc = await R.evaluate(async () => {
  const { ecrireTableau } = await import('/src/fichier.ts')
  const o = new Uint8Array(await ecrireTableau(window.__app.tableau.doc).arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return { b64: btoa(s), page: window.__app.tableau.ordre.toArray().indexOf(window.__app.page) }
})
const CHEMIN = D + '/Transformer lot 5.memc'
writeFileSync(CHEMIN, Buffer.from(memc.b64, 'base64'))
// (Ici, la version d'avant le lot 5 relisait ce fichier : retiré en rangeant la
// batterie dans le dépôt ; elle se construisait depuis un commit qui n'existe plus.)

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
