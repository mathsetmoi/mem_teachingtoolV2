// ESSAI DU MORCEAU K2-ordre (lot 5) : les calques d'affichage (rendu, prise,
// PDF) et les quatre commandes d'ordre au menu et au clavier.
// A. On prend ce qu'on voit : un trait sous une image posée après lui reste
//    peint dessus (pixels) et se prend au clic ; un soulignement sur une
//    formule à 2 px, la formule en son milieu.
// B. Une image fixée de z plus grand qu'une autre image se peint dessous, à
//    l'écran et dans le PDF (pdftoppm) ; deux formules : zIndex 1 et 2.
// C. Ctrl + ↑ / ↓ (avec Maj : premier plan, arrière-plan) : deux images qui
//    se chevauchent s'échangent (pixels), Ctrl + Z les remet (une étape) ;
//    une image au premier plan reste sous un trait ; deux formules
//    échangent leur zIndex ; les messages quand il n'y a rien à faire ;
//    Ctrl + flèche et Alt + flèche ne poussent plus.
// D. Le menu ⋯ : la section Ordre, ses quatre entrées, grisées quand elles
//    ne feraient rien, leurs touches, l'aide pour des images, des formules.
// E. Mac simulé : ⌘ + ↑ avance, le menu dit ⌘. ⌘ + ← et Alt + ←, avec et
//    sans sélection : la page du navigateur ne change pas.
// F. La revue en classe et le nouveau lecteur montrent le nouvel ordre.
// G. Une image mise à l'arrière-plan sur une page qui a une image fixée :
//    au-dessus d'elle ici (rangé dans le dépôt : la vérification dans la
//    version d'avant, construite depuis un commit qui n'existe plus, est retirée).
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K2-ordre/travail'
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

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}, mac = false) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  if (mac) await c.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
async function ouvrirDev(ctx, nom, avant) {
  const p = await ctx.newPage(); suivre(p, nom)
  if (avant) await p.goto(avant)
  await p.goto(DEV); await pret(p)
  await p.waitForFunction(() => window.__app && window.__app.page)
  await p.waitForTimeout(500)
  await p.evaluate(() => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  return p
}

// ---------- Ce qu'on pose (dans la page) ----------
/** Une page neuve, vide, à 100 %, outil Sélection */
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
/** Des images de couleur unie dans la banque du document */
const IMAGES = () => {
  const unie = (c) => { const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 60, 40); return cv.toDataURL('image/png') }
  const b = window.__app.tableau.doc.getMap('images')
  b.set('k2-vert', unie('#00c000')); b.set('k2-magenta', unie('#e000e0')); b.set('k2-orange', unie('#ff9900'))
}
/** Une forme posée telle quelle, en son geste ; rend son identifiant */
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
const image = (src, x, y, l, h, o = {}) => ({ type: 'image', src: 'k2-' + src, x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false, ...o }
}
const formule = (x, y, latex = 'x^2+3x-1', o = {}) => ({ type: 'formule', x, y, latex, couleur: '#1b2230', taille: 40, ...o })

async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(40); return id }
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
const sel = p => p.evaluate(() => [...window.__app.selection])
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const prendre = (p, ids) => p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, ids)
async function clic(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y); await p.waitForTimeout(80); return sel(p) }
const msgs = p => p.evaluate(() => (window.__msgs || []).slice())
const viderMsgs = p => p.evaluate(() => { window.__msgs = [] })

/** La couleur d'un pixel du monde (x, y) sur la scène du tableau */
const COULEUR = ({ x, y }) => {
  const a = window.__app, s = a.cam.versEcran(x, y), c = a.rendu.scene, k = c.width / c.clientWidth
  const d = c.getContext('2d').getImageData(Math.round(s.x * k), Math.round(s.y * k), 1, 1).data
  const [r, v, b] = d
  return r < 60 && v > 150 && b < 60 ? 'vert' : r > 180 && v < 60 && b > 180 ? 'magenta' : r > 200 && v > 120 && v < 190 && b < 60 ? 'orange'
    : r < 80 && v < 80 && b < 90 ? 'sombre' : `${r},${v},${b}`
}
const couleur = async (p, x, y) => { await p.waitForTimeout(60); return p.evaluate(COULEUR, { x, y }) }
/** Les pixels de chaque couleur sur un canevas (le plus grand de ce sélecteur) */
const COMPTER = (sel) => {
  const c = [...document.querySelectorAll(sel)].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  if (!c) return null
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  const n = { vert: 0, magenta: 0, orange: 0, sombre: 0 }
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], v = d[i + 1], b = d[i + 2]
    if (r < 60 && v > 150 && b < 60) n.vert++
    else if (r > 180 && v < 60 && b > 180) n.magenta++
    else if (r > 200 && v > 120 && v < 190 && b < 60) n.orange++
    else if (r < 80 && v < 80 && b < 90) n.sombre++
  }
  return n
}
const zIndex = (p, ids) => p.evaluate(ids => ids.map(id => window.__app.rendu.elementsFormules.get(id)?.el.style.zIndex ?? null), ids)
const zDe = (p, id) => p.evaluate(id => window.__app.forme(id)?.z, id)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)

// =====================================================================
console.log('=== A. on prend ce qu\'on voit ===')
const ctx = await contexte()
const P = await ouvrirDev(ctx, 'tableau')
await P.evaluate(IMAGES)
await P.evaluate(PAGE_NEUVE)
const T = await poser(P, trait(200, 300, 200))
const Iv = await poser(P, image('vert', 150, 250, 300, 100))
await P.waitForTimeout(250)
ok(await zDe(P, Iv) > await zDe(P, T), 'A0) L\'image est posée après le trait (z plus grand)')
ok(await couleur(P, 300, 300) === 'sombre' && await couleur(P, 300, 335) === 'vert', 'A1) Le trait reste peint au-dessus de l\'image posée après lui (pixels)', [await couleur(P, 300, 300), await couleur(P, 300, 335)])
let r = await clic(P, 300, 301)
ok(r.length === 1 && r[0] === T, 'A2) Un clic sur le trait, dans l\'image, à l\'outil Sélection → le trait', r)
await vider(P)
r = await clic(P, 300, 335)
ok(r.length === 1 && r[0] === Iv, '   … ailleurs dans l\'image → l\'image', r)
await vider(P)
// Un soulignement sur une formule
const Fo = await poser(P, formule(150, 450))
await P.waitForTimeout(200)
const bF = await P.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo)
const Sou = await poser(P, trait(bF.x, bF.y + bF.h - 4, bF.l, { taille: 4.5 }))
r = await clic(P, bF.x + bF.l / 2, bF.y + bF.h - 6)
ok(r.length === 1 && r[0] === Sou, 'A3) Un soulignement sur une formule, cliqué à 2 px → le soulignement', r)
await vider(P)
r = await clic(P, bF.x + bF.l / 2, bF.y + bF.h / 2 - 8)
ok(r.length === 1 && r[0] === Fo, '   … la formule cliquée en son milieu → la formule', r)
await vider(P)
// Écrit avant la formule, sous elle dans l'ordre des z : il se voit et se prend aussi
await P.evaluate(PAGE_NEUVE)
const Sav = await poser(P, trait(150, 480, 200, { taille: 4.5 }))
const Fo2 = await poser(P, formule(150, 440))
await P.waitForTimeout(200)
const bF2 = await P.evaluate(id => window.__app.rendu.boite(window.__app.forme(id)), Fo2)
r = await clic(P, 250, 481)
ok(bF2.y + bF2.h > 482 && r.length === 1 && r[0] === Sav, '   … un trait écrit AVANT la formule, sous elle : il se voit à travers elle, et se prend', { r, bF2 })
await vider(P)

// =====================================================================
console.log('=== B. une image fixée de z plus grand se peint dessous ; les formules ===')
await P.evaluate(PAGE_NEUVE)
const Im = await poser(P, image('magenta', 300, 150, 200, 150))
const If = await poser(P, image('vert', 350, 180, 200, 150, { fixe: true }))
await P.waitForTimeout(250)
ok(await zDe(P, If) > await zDe(P, Im), 'B0) L\'image fixée a un z plus grand que l\'autre image (posée par tableau.poser)')
ok(await couleur(P, 420, 250) === 'magenta' && await couleur(P, 520, 310) === 'vert', 'B1) À l\'écran, l\'image fixée se peint dessous', [await couleur(P, 420, 250), await couleur(P, 520, 310)])
// Le PDF de cette page
const ana = await (await nav.newContext()).newPage()
await ana.setContent('<html><body></body></html>')
await ana.evaluate(() => {
  window.compter = async b64 => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0)
    const d = x.getImageData(0, 0, c.width, c.height).data
    const n = { vert: 0, magenta: 0, orange: 0 }
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], v = d[i + 1], b = d[i + 2]
      if (r < 80 && v > 140 && b < 80) n.vert++
      else if (r > 170 && v < 80 && b > 170) n.magenta++
      else if (r > 200 && v > 110 && v < 200 && b < 80) n.orange++
    }
    return n
  }
})
async function pdfDeLaPage(p, nom) {
  await p.evaluate(() => window.__app.ui.exporterPdf({ page: window.__app.page }))
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const dl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null)
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  execFileSync('pdftoppm', ['-r', '40', '-png', f, `${D}/${nom}`])
  const png = readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort()[0]
  return png ? ana.evaluate(b => window.compter(b), readFileSync(`${D}/${png}`).toString('base64')) : null
}
const pdf1 = await pdfDeLaPage(P, 'fixee-dessous')
// L'image magenta entière (200 × 150) ; la verte privée du recouvrement (150 × 120)
ok(pdf1 && pdf1.magenta > 1.8 * pdf1.vert && pdf1.vert > 0, 'B2) Dans le PDF aussi (pdftoppm) : l\'image fixée est dessous', pdf1)
// Deux formules : leur rang, dans l'ordre des z
await P.evaluate(PAGE_NEUVE)
const zBase = Date.now()
const Fh = await poser(P, formule(300, 300, 'a', { z: zBase + 5 }))
const Fb = await poser(P, formule(600, 300, 'b', { z: zBase + 1 }))
await P.waitForTimeout(150)
ok(JSON.stringify(await zIndex(P, [Fb, Fh])) === '["1","2"]', 'B3) Deux formules : zIndex 1 et 2 selon leurs z (pas selon l\'ordre où on les a posées)', await zIndex(P, [Fb, Fh]))

// =====================================================================
console.log('=== C. Ctrl + ↑ / ↓ ===')
await P.evaluate(PAGE_NEUVE)
const Ia = await poser(P, image('magenta', 300, 150, 200, 150))
const Ib = await poser(P, image('vert', 400, 220, 200, 150))
await P.waitForTimeout(250)
ok(await couleur(P, 450, 260) === 'vert', 'C0) Deux images qui se chevauchent : la seconde dessus', await couleur(P, 450, 260))
r = await clic(P, 330, 180)
const p0 = await pile(P)
await P.keyboard.press('Control+ArrowUp'); await P.waitForTimeout(150)
ok(JSON.stringify(r) === JSON.stringify([Ia]) && await couleur(P, 450, 260) === 'magenta', 'C1) Ctrl + ↑ sur celle du dessous : elle passe dessus (pixels)', { r, c: await couleur(P, 450, 260) })
ok(await pile(P) === p0 + 1 && JSON.stringify(await sel(P)) === JSON.stringify([Ia]), '   … une étape d\'annulation ; la sélection reste', { avant: p0, apres: await pile(P) })
const xyA = await P.evaluate(id => { const f = window.__app.forme(id); return [f.x, f.y] }, Ia)
ok(xyA[0] === 300 && xyA[1] === 150, '   … sans bouger (Ctrl + ↑ ne pousse pas)', xyA)
await viderMsgs(P)
await P.keyboard.press('Control+ArrowUp'); await P.waitForTimeout(100)
ok((await msgs(P)).includes('Rien à passer devant à cet endroit') && await pile(P) === p0 + 1, '   … encore Ctrl + ↑ : « Rien à passer devant à cet endroit », rien de plus', await msgs(P))
await P.keyboard.press('Control+Shift+ArrowUp'); await P.waitForTimeout(100)
ok((await msgs(P)).includes('Déjà au premier plan'), '   … Ctrl + Maj + ↑ : « Déjà au premier plan »', await msgs(P))
await P.keyboard.press('Control+z'); await P.waitForTimeout(150)
ok(await couleur(P, 450, 260) === 'vert' && await pile(P) === p0, 'C2) Ctrl + Z la remet dessous', await couleur(P, 450, 260))
// Ctrl + Maj + ↓ sur celle du dessus
await prendre(P, [Ib])
await P.keyboard.press('Control+Shift+ArrowDown'); await P.waitForTimeout(150)
ok(await couleur(P, 450, 260) === 'magenta', '   … Ctrl + Maj + ↓ sur celle du dessus : à l\'arrière-plan', await couleur(P, 450, 260))
await viderMsgs(P)
await P.keyboard.press('Control+ArrowDown'); await P.waitForTimeout(100)
ok((await msgs(P)).includes('Rien à passer derrière à cet endroit'), '   … Ctrl + ↓ ensuite : « Rien à passer derrière à cet endroit »', await msgs(P))
await P.keyboard.press('Control+Shift+ArrowDown'); await P.waitForTimeout(100)
ok((await msgs(P)).includes('Déjà à l\'arrière-plan'), '   … Ctrl + Maj + ↓ : « Déjà à l\'arrière-plan »', await msgs(P))
// Une touche tenue : une fois par appui
await P.keyboard.press('Control+z'); await P.waitForTimeout(100)
await prendre(P, [Ia])
const p1 = await pile(P)
await P.evaluate(() => { for (const repeat of [false, true, true]) document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', code: 'ArrowUp', ctrlKey: true, repeat, bubbles: true, cancelable: true })) })
await P.waitForTimeout(150)
ok(await pile(P) === p1 + 1, '   … Ctrl + ↑ tenu (répétitions) : une seule étape', { avant: p1, apres: await pile(P) })
await P.keyboard.press('Control+z'); await P.waitForTimeout(100)
// Une image au premier plan reste sous un trait
const Tc = await poser(P, trait(380, 260, 160))
await prendre(P, [Ia])
await P.keyboard.press('Control+Shift+ArrowUp'); await P.waitForTimeout(150)
ok(await couleur(P, 450, 280) === 'magenta' && await couleur(P, 450, 260) === 'sombre', 'C3) Une image « au premier plan » passe sur l\'autre image, mais reste sous le trait', [await couleur(P, 450, 280), await couleur(P, 450, 260)])
r = await clic(P, 450, 261)
ok(JSON.stringify(r) === JSON.stringify([Tc]), '   … et le trait se prend toujours au clic', r)
// Deux formules qui se chevauchent : leurs zIndex s'échangent
await P.evaluate(PAGE_NEUVE)
const Fa = await poser(P, formule(300, 300, '\\frac{1}{2}+x^2'))
const Fc = await poser(P, formule(320, 310, '\\frac{3}{4}+y^2'))
await P.waitForTimeout(200)
const zi0 = await zIndex(P, [Fa, Fc])
await prendre(P, [Fa])
await P.keyboard.press('Control+ArrowUp'); await P.waitForTimeout(150)
const zi1 = await zIndex(P, [Fa, Fc])
ok(JSON.stringify(zi0) === '["1","2"]' && JSON.stringify(zi1) === '["2","1"]', 'C4) Deux formules qui se chevauchent : Ctrl + ↑ sur celle du dessous, leurs zIndex s\'échangent', { zi0, zi1 })
// Ctrl + flèche, Alt + flèche ne poussent plus ; une flèche seule, si
await P.evaluate(PAGE_NEUVE)
const Ip = await poser(P, image('orange', 300, 200, 100, 80))
await prendre(P, [Ip])
for (const k of ['Control+ArrowLeft', 'Control+ArrowRight', 'Alt+ArrowUp', 'Alt+ArrowDown', 'Alt+ArrowLeft', 'Alt+ArrowRight']) await P.keyboard.press(k)
await P.waitForTimeout(150)
const xyP = await P.evaluate(id => { const f = window.__app.forme(id); return [f.x, f.y] }, Ip)
await P.keyboard.press('ArrowRight'); await P.waitForTimeout(150)
const xyP2 = await P.evaluate(id => { const f = window.__app.forme(id); return [f.x, f.y] }, Ip)
ok(JSON.stringify(xyP) === '[300,200]' && xyP2[0] === 304 && xyP2[1] === 200, 'C5) Ctrl + ← / →, Alt + flèche ne poussent plus la sélection ; → seule la pousse d\'1 mm', { xyP, xyP2 })

// =====================================================================
console.log('=== D. le menu ⋯ : la section Ordre ===')
const MENU_PLUS = () => {
  const m = document.querySelector('.menu-plus')
  if (!m || m.hidden) return null
  return [...m.children].map(e => e.classList.contains('menu-titre') ? { titre: e.textContent } : e.classList.contains('menu-filet') ? { filet: true }
    : { t: e.querySelector('.libelle')?.firstChild?.textContent, aide: e.querySelector('small')?.textContent ?? null, touche: e.querySelector('.touche')?.textContent ?? null, inactif: e.getAttribute('aria-disabled') === 'true', action: e.dataset.action ?? null })
}
// (Adapté au morceau K3 du lot 5 : le menu ⋯ a, après l'Ordre, un filet et
// la section « Protéger » (Verrouiller, Fixer en fond) ; cet essai ne regarde
// que ce qui va jusqu'à l'Ordre compris : le reste est l'affaire de
// lot5/K3-verrou.mjs)
async function menuPlus(p, id) {
  await p.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions(a.forme(id)); a.ui.maj() }, id)
  await p.waitForTimeout(150)
  await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(120)
  const m = await p.evaluate(MENU_PLUS)
  const fin = m ? m.findIndex((x, k) => k > 3 && x.filet) : -1
  return m && fin > 0 ? m.slice(0, fin) : m
}
await P.evaluate(PAGE_NEUVE)
const Ma = await poser(P, image('magenta', 200, 150, 150, 100))
const Mb = await poser(P, image('vert', 600, 150, 150, 100))
await P.waitForTimeout(200)
let m = await menuPlus(P, Ma)
const entrees = m?.filter(e => e.t) ?? []
ok(m && JSON.stringify(entrees.map(e => e.t)) === JSON.stringify(['Copier en image', 'Envoyer vers…', 'Mettre au premier plan', 'Avancer', 'Reculer', 'Mettre à l\'arrière-plan'])
  && m[2]?.filet && m[3]?.titre === 'Ordre', 'D1) Le menu ⋯ : Copier en image, Envoyer vers…, un filet, « Ordre » : premier plan, avancer, reculer, arrière-plan', m)
ok(JSON.stringify(entrees.slice(2).map(e => e.touche)) === JSON.stringify(['Ctrl + Maj + ↑', 'Ctrl + ↑', 'Ctrl + ↓', 'Ctrl + Maj + ↓']), '   … leurs touches', entrees.map(e => e.touche))
ok(JSON.stringify(entrees.slice(2).map(e => e.inactif)) === '[false,true,true,true]', '   … l\'image du dessous, seule à cet endroit : seul « Mettre au premier plan » est actif (rien à passer devant ni derrière, déjà à l\'arrière-plan)', entrees.map(e => [e.t, e.inactif]))
ok(entrees[2]?.aide === 'Devant les autres images ; l\'écriture et les figures restent devant', '   … l\'aide, pour une image : « Devant les autres images ; l\'écriture et les figures restent devant »', entrees[2])
await P.locator('.menu-plus .menu-item', { hasText: 'Mettre au premier plan' }).click(); await P.waitForTimeout(150)
ok(await zDe(P, Ma) > await zDe(P, Mb) && JSON.stringify(await sel(P)) === JSON.stringify([Ma]), '   … le choisir la met au-dessus de l\'autre image ; elle reste sélectionnée')
m = await menuPlus(P, Ma)
ok(JSON.stringify((m ?? []).filter(e => e.t).slice(2).map(e => e.inactif)) === '[true,true,true,false]', '   … ensuite, seul « Mettre à l\'arrière-plan » est actif', m)
await P.keyboard.press('Escape'); await P.keyboard.press('Escape'); await vider(P)
// Des formules seules : leur aide
const Mf = await poser(P, formule(300, 450))
await P.waitForTimeout(150)
m = await menuPlus(P, Mf)
const premierF = (m ?? []).find(e => e.t === 'Mettre au premier plan')
ok(premierF?.aide === 'Devant les autres formules ; les formules restent au-dessus de tout' && premierF.inactif, '   … pour une formule seule : « Devant les autres formules ; les formules restent au-dessus de tout » (grisé : seule formule)', premierF)
await P.keyboard.press('Escape'); await P.keyboard.press('Escape'); await vider(P)
// Un trait : (adapté aux corrections « conformité » du lot 5 : il n'avait
// pas d'aide ; le menu dit désormais son calque à lui aussi : les formules
// restent au-dessus, les images dessous)
const Mt = await poser(P, trait(200, 600, 200))
m = await menuPlus(P, Mt)
ok((m ?? []).find(e => e.t === 'Mettre au premier plan')?.aide === 'Devant l\'écriture et les figures ; les formules restent au-dessus'
  && (m ?? []).find(e => e.t === 'Mettre à l\'arrière-plan')?.aide === 'Derrière l\'écriture et les figures ; les images restent dessous', '   … pour un trait : « Devant l\'écriture et les figures ; les formules restent au-dessus », « Derrière l\'écriture et les figures ; les images restent dessous »', m)
await P.keyboard.press('Escape'); await P.keyboard.press('Escape'); await vider(P)
// Le menu complet ouvert : Ctrl + ↑ y marche encore
await P.evaluate(PAGE_NEUVE)
const Oa = await poser(P, image('magenta', 300, 150, 200, 150))
await poser(P, image('vert', 400, 220, 200, 150))
await P.waitForTimeout(200)
await P.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions(a.forme(id)); a.ui.maj() }, Oa)
await P.waitForTimeout(150)
await P.keyboard.press('Control+ArrowUp'); await P.waitForTimeout(150)
ok(await couleur(P, 450, 260) === 'magenta' && await P.evaluate(() => !document.querySelector('.panneau-forme').hidden), '   … le menu complet ouvert, Ctrl + ↑ avance quand même (et le menu reste)', await couleur(P, 450, 260))
await P.keyboard.press('Escape'); await vider(P)

// =====================================================================
console.log('=== E. Mac simulé ; les touches qui quitteraient la page ===')
const ctxM = await contexte({}, true)
const M = await ouvrirDev(ctxM, 'mac', 'about:blank')
await M.evaluate(IMAGES)
await M.evaluate(PAGE_NEUVE)
const Ka = await poser(M, image('magenta', 300, 150, 200, 150))
await poser(M, image('vert', 400, 220, 200, 150))
await M.waitForTimeout(250)
await prendre(M, [Ka])
await M.keyboard.press('Meta+ArrowUp'); await M.waitForTimeout(150)
ok(await couleur(M, 450, 260) === 'magenta', 'E1) Mac : ⌘ + ↑ avance', await couleur(M, 450, 260))
m = await menuPlus(M, Ka)
ok(JSON.stringify((m ?? []).filter(e => e.t).slice(2).map(e => e.touche)) === JSON.stringify(['⌘ + Maj + ↑', '⌘ + ↑', '⌘ + ↓', '⌘ + Maj + ↓']), '   … le menu dit ⌘', m)
await M.keyboard.press('Escape'); await M.keyboard.press('Escape')
// Les touches qui reviennent à la page précédente du navigateur
await M.evaluate(() => { window.__empeche = []; window.addEventListener('keydown', e => { if (e.key.startsWith('Arrow')) window.__empeche.push([e.key, e.metaKey, e.altKey, e.ctrlKey, e.defaultPrevented]) }) })
const avantNav = await M.evaluate(() => ({ l: history.length, href: location.href }))
const xyK = await M.evaluate(id => { const f = window.__app.forme(id); return [f.x, f.y] }, Ka)
for (const avecSel of [true, false]) {
  if (avecSel) await prendre(M, [Ka]); else await vider(M)
  for (const k of ['Meta+ArrowLeft', 'Alt+ArrowLeft', 'Meta+ArrowRight', 'Alt+ArrowRight', 'Control+ArrowLeft']) { await M.keyboard.press(k); await M.waitForTimeout(80) }
}
await M.waitForTimeout(400)
const apresNav = await M.evaluate(() => ({ l: history.length, href: location.href, app: !!window.__app, empeche: window.__empeche }))
const xyK2 = await M.evaluate(id => { const f = window.__app.forme(id); return [f.x, f.y] }, Ka)
ok(apresNav.app && apresNav.href === avantNav.href && apresNav.l === avantNav.l, 'E2) ⌘ + ←, Alt + ←, ⌘ + →, Alt + →, avec et sans sélection : l\'adresse et l\'historique ne changent pas', { avantNav, apresNav })
ok(apresNav.empeche.length === 10 && apresNav.empeche.every(e => e[4]), '   … chacune est empêchée (defaultPrevented), avec ou sans sélection', apresNav.empeche)
ok(JSON.stringify(xyK) === JSON.stringify(xyK2), '   … et l\'objet sélectionné n\'a pas bougé', { xyK, xyK2 })
// Pour mémoire : dans ce navigateur, une page qui ne l'empêche pas revient-elle en arrière ?
const temoin = await ctxM.newPage()
await temoin.goto('about:blank'); await temoin.goto('data:text/html,<p>témoin</p>')
await temoin.keyboard.press('Alt+ArrowLeft'); await temoin.waitForTimeout(500)
const recule = temoin.url() === 'about:blank'
console.log(`   (témoin : dans ce navigateur sans fenêtre, une page qui n'empêche rien ${recule ? 'revient bien en arrière' : 'ne revient pas en arrière'} sur Alt + ← : ${recule ? 'l\'adresse inchangée le prouve' : 'c\'est defaultPrevented qui le prouve'})`)
await temoin.close()

// =====================================================================
console.log('=== F. la revue en classe et le nouveau lecteur ===')
const ctxF = await contexte()
const F = await ouvrirDev(ctxF, 'revue')
await F.evaluate(IMAGES)
await F.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => F.evaluate(ms => { window.__dec += ms }, ms)
await avancer(30 * 60_000)
await F.evaluate(PAGE_NEUVE)
await avancer(3000)
const Ra = await poser(F, image('magenta', 300, 150, 200, 150))
await avancer(3000)
await poser(F, image('vert', 400, 220, 200, 150))
await avancer(3000)
await prendre(F, [Ra])
await F.keyboard.press('Control+ArrowUp'); await F.waitForTimeout(150)
await vider(F)
ok(await couleur(F, 450, 260) === 'magenta', 'F0) À l’écran : l\'image magenta passée dessus')
await F.click('button[title^="Revoir la construction"]'); await F.waitForTimeout(600)
await F.keyboard.press('End'); await F.waitForTimeout(600)
const finRevue = await F.evaluate(COMPTER, '.revue-scene canvas')
await F.keyboard.press('ArrowLeft'); await F.waitForTimeout(600)
const avantRevue = await F.evaluate(COMPTER, '.revue-scene canvas')
// Les deux images (200 × 150) se recouvrent sur 100 × 80 : celle du dessus se voit entière (30 000 px), l'autre à 22 000
ok(finRevue && finRevue.magenta > 1.2 * finRevue.vert && finRevue.vert > 0, 'F1) La revue en classe, à la fin : l\'image passée dessus se voit entière', finRevue)
ok(avantRevue && avantRevue.vert > 1.2 * avantRevue.magenta && avantRevue.magenta > 0, '   … un pas avant : l\'ordre d\'avant (l\'étape de l\'ordre est un geste du film)', avantRevue)
for (let i = 0; i < 4 && await F.evaluate(() => window.__app.enLecture); i++) { await F.keyboard.press('Escape'); await F.waitForTimeout(150) }
// Le film élève, dans le nouveau lecteur
const film = await F.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, ordre' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length }
})
writeFileSync(D + '/ordre.mem', film.texte)
const L = await ctxF.newPage(); suivre(L, 'lecteur')
await L.goto(DEV + 'revoir.html')
await L.locator('input[type=file]').setInputFiles({ name: 'ordre.mem', mimeType: 'application/json', buffer: Buffer.from(film.texte) })
await L.waitForTimeout(1500)
await L.keyboard.press('End'); await L.waitForTimeout(1000)
const finLecteur = await L.evaluate(COMPTER, 'canvas')
ok(finLecteur && finLecteur.magenta > 1.2 * finLecteur.vert && finLecteur.vert > 0, 'F2) Le nouveau lecteur, à la fin : le nouvel ordre', { finLecteur, etapes: film.etapes })
await L.close()

// =====================================================================
console.log('=== G. arrière-plan sur une page qui a une image fixée ; la version d\'avant ===')
const G = await ouvrirDev(await contexte(), 'fixée')
await G.evaluate(IMAGES)
await G.evaluate(PAGE_NEUVE)
// L'image fixée (verte, grande), une image orange, puis la magenta posée sur la verte
const Gf = await poser(G, image('vert', 200, 150, 400, 300, { fixe: true, z: Date.now() - 1e6 }))
const Go = await poser(G, image('orange', 700, 150, 100, 100))
const Gm = await poser(G, image('magenta', 300, 250, 200, 150))
await G.waitForTimeout(250)
await prendre(G, [Gm])
await G.keyboard.press('Control+Shift+ArrowDown'); await G.waitForTimeout(150)
const zs = await G.evaluate(ids => ids.map(id => window.__app.forme(id).z), [Gf, Gm, Go])
ok(zs[0] < zs[1] && zs[1] < zs[2], 'G1) Ctrl + Maj + ↓ sur l\'image posée sur l\'énoncé fixé : sous l\'autre image, au-dessus de l\'image fixée (z)', zs)
ok(await couleur(G, 400, 320) === 'magenta', '   … et peinte au-dessus de l\'image fixée', await couleur(G, 400, 320))
const memc = await G.evaluate(async () => {
  const { ecrireTableau } = await import('/src/fichier.ts')
  const o = new Uint8Array(await ecrireTableau(window.__app.tableau.doc).arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return { b64: btoa(s), page: window.__app.tableau.ordre.toArray().indexOf(window.__app.page) }
})
const CHEMIN = D + '/Ordre lot 5.memc'
writeFileSync(CHEMIN, Buffer.from(memc.b64, 'base64'))
// (Ici, la version d'avant le lot 5 relisait ce fichier : retiré en rangeant la
// batterie dans le dépôt ; elle se construisait depuis un commit qui n'existe plus.)

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
