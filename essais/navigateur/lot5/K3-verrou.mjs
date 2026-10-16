// ESSAI DU MORCEAU K3-verrou (lot 5) : Verrouiller (tout objet) et Fixer en
// fond (une image), à la souris, au stylet d'une tablette graphique (CDP,
// pointerType 'pen', navigator.maxTouchPoints 0, le bouton du stylet est le
// bouton 2) et au doigt (CDP touch).
// A. Souris : un verrouillé ne se prend ni au clic, ni au cadre, ni à
//    Ctrl + A ; ne se gomme pas, ne se pousse pas, ne se supprime pas ; les
//    sommets d'une figure verrouillée ne se tirent pas ; le cadenas au
//    survol et après un appui (1,5 s), le rappel une fois ; clic droit : le
//    menu court (Verrouillé, Déverrouiller, Copier, ⋯) ; Déverrouiller le
//    rend (une étape « réglage ») ; Maj + L dans les deux sens ; L seul et
//    Maj + L sans sélection restent le Segment ; Maj + L en plein glisser ne
//    verrouille rien ; la section « Protéger » du menu ⋯ ; le double-clic au
//    Stylo sur une formule verrouillée pose un point ; le collage d'un
//    verrouillé (ici et dans un autre onglet) : « Collé, verrouillé. » ;
//    Envoyer vers… depuis son menu, « Aller à la page N » ne le prend pas.
// B. Stylet (tablette graphique) : survol, appui, lasso, bouton du stylet ;
//    le message dans ses mots.
// C. Doigt : toucher, appui long (le menu court), lasso.
// D. Fixer en fond : sous un trait et sous une autre image (pixels) ; ni
//    clic, ni cadre, ni lasso (qui entoure l'écriture), ni gomme, ni Ctrl + A ;
//    le menu de la page (clic droit, bouton du stylet, appui long sur elle) :
//    Détacher, Copier, Envoyer l'image du fond ; copiée et collée dans un
//    autre onglet (et dans les deux versions construites, la clé et la
//    version en ligne) : fixée, sous tout, non
//    sélectionnée, avec son message ; envoyée (Déplacer) : de même ; Détacher
//    avec deux images fixées ; « Fixer en fond » proposé à l'import.
// E. Ce qui survit : le .memc enregistré puis rouvert, Dupliquer la page ; la
//    revue et le film élève (nouveau lecteur) : l'image fixée sous le reste,
//    verrouiller n'y fait pas de geste de plus ; « Effacer la page » garde
//    l'image fixée et l'objet verrouillé.
// Serveur de développement sur :5173 (window.__app) ; la version clé
// (dist/index.html, npm run build). Une ligne « ✓ » ou « ✗ ÉCHEC » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/lot5/K3-verrou/travail'
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
  await p.evaluate(() => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  const cdp = await ctx.newCDPSession(p)
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
    bouton: async (x, y) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
      await attendre(60)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
      await attendre(120)
    },
  }
  const doigt = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  return { p, cdp, stylet, doigt }
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
  const b = window.__app.tableau.doc.getMap('images')
  b.set('k3-vert', unie('#00c000')); b.set('k3-magenta', unie('#e000e0'))
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
const image = (src, x, y, l, h, o = {}) => ({ type: 'image', src: 'k3-' + src, x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false, ...o }
}
const triangle = (x, y, o = {}) => ({ type: 'polygone', x, y, pts: [0, 150, 200, 150, 0, 0], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], ...o })
const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 40, ...o })

async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(40); return id }
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
const sel = p => p.evaluate(() => [...window.__app.selection])
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const msgs = p => p.evaluate(() => (window.__msgs || []).slice())
const dernier = async p => (await msgs(p)).at(-1)
const viderMsgs = p => p.evaluate(() => { window.__msgs = [] })
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
const cadenas = p => p.evaluate(() => window.__app.rendu.cadenas?.id ?? null)
const ETAT = () => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), pm = document.querySelector('.menu-flottant[aria-label="Page"]'), ba = document.querySelector('.barre-actions')
  const mp = document.querySelector('.menu-partie')
  return {
    sel: [...a.selection], options: a.options, outil: a.outil,
    panneau: !pn.hidden, label: pn.getAttribute('aria-label'), menuPage: !!pm && !pm.hidden, barre: !!ba && !ba.hidden, menuPartie: !!mp && !mp.hidden,
    titre: pn.hidden ? null : pn.querySelector('.titre-selection')?.textContent ?? null,
    boutons: pn.hidden ? [] : [...pn.querySelectorAll('.ligne button')].map(b => b.textContent || b.getAttribute('aria-label')),
  }
}
const etat = p => p.evaluate(ETAT)
const ENTREES = sel => {
  const m = document.querySelector(sel)
  if (!m || m.hidden) return null
  return [...m.children].map(b => b.matches('hr') ? { filet: true } : b.matches('.menu-titre') ? { titre: b.textContent }
    : { t: b.querySelector('.libelle')?.firstChild?.textContent, aide: b.querySelector('small')?.textContent, touche: b.querySelector('.touche')?.textContent, inactif: b.getAttribute('aria-disabled') === 'true', action: b.dataset.action })
}
const menuPage = p => p.evaluate(ENTREES, '.menu-flottant[aria-label="Page"]')
const menuPlus = p => p.evaluate(ENTREES, '.menu-plus')
const COULEUR = ({ x, y }) => {
  const a = window.__app, s = a.cam.versEcran(x, y), c = a.rendu.scene, k = c.width / c.clientWidth
  const [r, v, b] = c.getContext('2d').getImageData(Math.round(s.x * k), Math.round(s.y * k), 1, 1).data
  return r < 60 && v > 150 && b < 60 ? 'vert' : r > 180 && v < 60 && b > 180 ? 'magenta' : r < 80 && v < 80 && b < 90 ? 'sombre' : `${r},${v},${b}`
}
const couleur = async (p, x, y) => { await p.waitForTimeout(80); return p.evaluate(COULEUR, { x, y }) }
const COMPTER = (sel) => {
  const c = [...document.querySelectorAll(sel)].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  if (!c) return null
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  const n = { vert: 0, magenta: 0, sombre: 0 }
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], v = d[i + 1], b = d[i + 2]
    if (r < 60 && v > 150 && b < 60) n.vert++
    else if (r > 180 && v < 60 && b > 180) n.magenta++
    else if (r < 80 && v < 80 && b < 90) n.sombre++
  }
  return n
}
async function clicDroit(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, { button: 'right' }); await p.waitForTimeout(150) }
async function clic(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y); await p.waitForTimeout(100) }
/** Glisser à la souris (monde), par petits pas */
async function glisser(p, x1, y1, x2, y2, pendant) {
  const a = await ecran(p, x1, y1), b = await ecran(p, x2, y2)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= 10; k++) { await p.mouse.move(a.x + (b.x - a.x) * k / 10, a.y + (b.y - a.y) * k / 10); if (k === 5 && pendant) await pendant() }
  await p.mouse.up(); await p.waitForTimeout(120)
}
const verrouiller = (p, ids) => p.evaluate(ids => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.modifier(a.page, ids.map(id => ({ id, patch: { verrou: true } })), { note: 'reglage' }); t.nouveauGeste() }, ids)

// =====================================================================
console.log('=== A. à la souris ===')
const ctxA = await contexte()
const { p: A } = await ouvrirDev(ctxA, 'souris')
await A.evaluate(IMAGES)
await A.evaluate(PAGE_NEUVE)
const T = await poser(A, trait(200, 300, 200))
const V = await poser(A, trait(200, 420, 200))
const Tri = await poser(A, triangle(650, 200))
await verrouiller(A, [V, Tri])
await A.waitForTimeout(200)
// A1. Un clic sur le verrouillé : rien n'est pris, le cadenas un instant, le rappel une fois
await viderMsgs(A)
await clic(A, 300, 420)
let e = await etat(A)
const c1 = await cadenas(A)
ok(e.sel.length === 0 && c1 === V, 'A1) Un clic sur un trait verrouillé ne le prend pas ; son cadenas paraît', { e, c1 })
ok((await msgs(A)).includes('Objet verrouillé : clic droit dessus pour le déverrouiller.'), '   … et le rappel, la première fois : « Objet verrouillé : clic droit dessus pour le déverrouiller. »', await msgs(A))
await A.mouse.move(40, 700); await A.waitForTimeout(900)
const c2 = await cadenas(A)
await A.waitForTimeout(800)
const c3 = await cadenas(A)
ok(c2 === V && c3 === null, '   … le cadenas reste 1,5 s même si le pointeur s\'en va, puis s\'efface', { c2, c3 })
await viderMsgs(A)
await clic(A, 300, 420)
ok(!(await msgs(A)).some(m => m.startsWith('Objet verrouillé')), '   … le rappel n\'est dit qu\'une fois par session', await msgs(A))
await A.waitForTimeout(1700)
// A2. Le survol
let s = await ecran(A, 300, 420); await A.mouse.move(s.x, s.y); await A.mouse.move(s.x + 2, s.y); await A.waitForTimeout(100)
const survolV = { cadenas: await cadenas(A), halo: await A.evaluate(() => window.__app.rendu.survol) }
s = await ecran(A, 300, 300); await A.mouse.move(s.x, s.y); await A.mouse.move(s.x + 2, s.y); await A.waitForTimeout(100)
const survolT = { cadenas: await cadenas(A), halo: await A.evaluate(() => window.__app.rendu.survol) }
s = await ecran(A, 500, 600); await A.mouse.move(s.x, s.y); await A.mouse.move(s.x + 2, s.y); await A.waitForTimeout(100)
const survolVide = await cadenas(A)
ok(survolV.cadenas === V && survolV.halo === null && survolT.cadenas === null && survolT.halo === T && survolVide === null,
  'A2) Au survol de la Sélection : le cadenas sur le verrouillé (sans halo), le halo sur le libre, rien dans le vide', { survolV, survolT, survolVide })
// A3. Le cadre autour des deux, Ctrl + A
await glisser(A, 150, 250, 450, 470)
ok(JSON.stringify(await sel(A)) === JSON.stringify([T]), 'A3) Un cadre autour du libre et du verrouillé ne prend que le libre', await sel(A))
await vider(A); await viderMsgs(A)
await A.keyboard.press('Control+a'); await A.waitForTimeout(150)
ok(JSON.stringify(await sel(A)) === JSON.stringify([T]) && await dernier(A) === '1 objet sélectionné', '   … Ctrl + A non plus : « 1 objet sélectionné »', { sel: await sel(A), m: await msgs(A) })
await vider(A)
// A4. Le clic droit : le menu court
await clicDroit(A, 300, 420)
e = await etat(A)
ok(e.panneau && e.label === 'Options du trait, verrouillé' && e.titre === 'Verrouillé' && JSON.stringify(e.sel) === JSON.stringify([V]) && !e.barre,
  'A4) Clic droit sur le verrouillé : son menu court, « Verrouillé », lui seul sélectionné, pas de barre d\'actions', e)
const plus = e.boutons.find(b => /^Plus/.test(b))
ok(JSON.stringify(e.boutons.map(b => b === plus ? '⋯' : b)) === JSON.stringify(['Déverrouiller', 'Copier', '⋯']), '   … Déverrouiller, Copier, ⋯ ; ni Supprimer, ni Dupliquer, ni Contour, ni Transformer', e.boutons)
const titreDev = await A.evaluate(() => document.querySelector('.panneau-forme [data-action="deverrouiller"]')?.title)
ok(titreDev === 'Déverrouiller (Maj + L) : il se prend et se déplace de nouveau', '   … le titre de « Déverrouiller »', titreDev)
const cadenasMenu = await A.evaluate(() => {
  // Le cadenas est peint sur la couche directe, au coin haut droit de l'objet
  // (le centre : le corps du cadenas, gris ; 8 px à droite : le disque, blanc)
  const a = window.__app, f = a.forme(a.options), b = a.rendu.boite(f), q = a.cam.versEcran(b.x + b.l + 6, b.y - 6)
  const c = a.rendu.direct, k = c.width / c.clientWidth, g = c.getContext('2d')
  return { centre: [...g.getImageData(Math.round(q.x * k), Math.round((q.y + 3) * k), 1, 1).data], disque: [...g.getImageData(Math.round((q.x + 8) * k), Math.round(q.y * k), 1, 1).data] }
})
const gris = q => Math.abs(q[0] - 0x5a) < 20 && Math.abs(q[1] - 0x65) < 20 && Math.abs(q[2] - 0x77) < 20 && q[3] > 200
ok(gris(cadenasMenu.centre) && cadenasMenu.disque[0] > 240 && cadenasMenu.disque[1] > 240 && cadenasMenu.disque[3] > 200, '   … et son cadenas (gris sur un disque blanc) au coin du cadre, tant que le menu est ouvert', cadenasMenu)
await A.locator('.panneau-forme .ligne button.plus').click(); await A.waitForTimeout(120)
let mp = await menuPlus(A)
ok(JSON.stringify((mp ?? []).filter(x => x.t).map(x => x.t)) === JSON.stringify(['Copier en image', 'Envoyer vers…']), '   … son ⋯ : Copier en image, Envoyer vers…, rien d\'autre', mp)
await A.keyboard.press('Escape'); await A.waitForTimeout(80)
// Les flèches et Suppr, menu ouvert
const vAvant = await forme(A, V)
await A.keyboard.press('ArrowRight'); await A.keyboard.press('ArrowDown'); await A.waitForTimeout(80)
await A.mouse.move(40, 700)
await viderMsgs(A)
await A.keyboard.press('Delete'); await A.waitForTimeout(100)
const vApres = await forme(A, V)
ok(vApres && vApres.x === vAvant.x && vApres.y === vAvant.y, '   … les flèches ne le poussent pas ; Suppr ne l\'ôte pas', { vAvant: [vAvant.x, vAvant.y], vApres: vApres && [vApres.x, vApres.y] })
ok((await msgs(A)).includes('Verrouillé : déverrouillez-le d\'abord.'), '   … « Verrouillé : déverrouillez-le d\'abord. »', await msgs(A))
await A.keyboard.press('Escape'); await A.waitForTimeout(100)
e = await etat(A)
ok(!e.panneau && e.sel.length === 0, '   … Échap : le menu se ferme, et le verrouillé n\'est plus sélectionné', e)
// Un verrouillé sélectionné à la main (comme un collage d'avant) : le menu fermé, la sélection se vide
await A.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ui.maj() }, V)
ok((await sel(A)).length === 0, '   … une sélection faite seulement de verrouillés, sans son menu, se vide d\'elle-même', await sel(A))
// A5. La gomme
await A.evaluate(() => window.__app.choisirOutil('gomme'))
await glisser(A, 300, 260, 300, 470)
const apresGomme = { T: !!(await forme(A, T)), V: !!(await forme(A, V)) }
ok(!apresGomme.T && apresGomme.V, 'A5) La gomme efface le libre et laisse le verrouillé', apresGomme)
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
await A.evaluate(() => window.__app.choisirOutil('selection'))
// A6. Les sommets d'une figure verrouillée
const triAvant = await forme(A, Tri)
await clicDroit(A, 650, 350)          // le sommet A
e = await etat(A)
ok(e.panneau && e.label === 'Options de la figure, verrouillé' && !e.menuPartie, 'A6) Clic droit sur le sommet d\'un triangle verrouillé : le menu court du triangle, pas celui du sommet', e)
await A.keyboard.press('Escape')
await glisser(A, 650, 350, 600, 420)   // tirer le sommet A
await glisser(A, 750, 350, 780, 500)   // glisser le côté [AB]
const triApres = await forme(A, Tri)
ok(JSON.stringify(triApres.pts) === JSON.stringify(triAvant.pts) && triApres.x === triAvant.x && triApres.y === triAvant.y, '   … ses sommets ne se tirent pas, et lui ne se déplace pas', { avant: [triAvant.x, triAvant.pts], apres: [triApres.x, triApres.pts] })
// A7. Déverrouiller par le menu : une étape « réglage »
await vider(A)
let n0 = await pile(A)
const film0 = await A.evaluate(() => window.__app.tableau.film.length)
await clicDroit(A, 300, 420)
await viderMsgs(A)
await A.click('.panneau-forme [data-action="deverrouiller"]'); await A.waitForTimeout(150)
let f = await forme(A, V)
const film1 = await A.evaluate(() => { const t = window.__app.tableau; return { n: t.film.length, reglage: t.film.get(t.film.length - 1).reglage ?? null } })
ok(f && !('verrou' in f) && JSON.stringify(await sel(A)) === JSON.stringify([V]) && await dernier(A) === 'Déverrouillé', 'A7) « Déverrouiller » : il est libre (le champ est parti), sélectionné, « Déverrouillé »', { f, sel: await sel(A), m: await msgs(A) })
ok(await pile(A) === n0 + 1 && film1.n === film0 + 1 && film1.reglage === true, '   … une étape d\'annulation, une étape du film notée « réglage »', { pile: await pile(A), n0, film0, film1 })
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
const apresZ = (await forme(A, V)).verrou
await A.keyboard.press('Control+y'); await A.waitForTimeout(100)
const apresY = (await forme(A, V)).verrou ?? null
ok(apresZ === true && apresY === null, '   … Ctrl + Z le reverrouille d\'un coup, Ctrl + Y le libère', { apresZ, apresY })
// A8. Maj + L dans les deux sens
await A.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ui.maj() }, V)
await viderMsgs(A)
await A.keyboard.press('Shift+L'); await A.waitForTimeout(120)
ok((await forme(A, V)).verrou === true && (await sel(A)).length === 0 && await dernier(A) === 'Verrouillé : il ne bouge plus. Clic droit dessus pour le déverrouiller.',
  'A8) Maj + L verrouille ce qui est sélectionné : « Verrouillé : il ne bouge plus. Clic droit dessus pour le déverrouiller. », la sélection se vide', { v: (await forme(A, V)).verrou, m: await msgs(A) })
await clicDroit(A, 300, 420)
await A.keyboard.press('Shift+L'); await A.waitForTimeout(120)
ok(!('verrou' in (await forme(A, V))) && await dernier(A) === 'Déverrouillé', '   … son menu ouvert, Maj + L le déverrouille', await msgs(A))
await A.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.ui.maj() }, [V, T])
await A.keyboard.press('Shift+L'); await A.waitForTimeout(120)
ok(await dernier(A) === '2 objets verrouillés. Clic droit dessus pour le déverrouiller.', '   … deux objets : « 2 objets verrouillés. Clic droit dessus pour le déverrouiller. »', await msgs(A))
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
await verrouiller(A, [V])
// L seul, Maj + L sans sélection : le Segment
await vider(A)
await A.keyboard.press('l'); await A.waitForTimeout(60)
const o1 = (await etat(A)).outil
await A.evaluate(() => window.__app.choisirOutil('selection'))
await A.keyboard.press('Shift+L'); await A.waitForTimeout(60)
const o2 = (await etat(A)).outil
ok(o1 === 'segment' && o2 === 'segment', '   … L seul, et Maj + L sans rien de sélectionné, restent le Segment', { o1, o2 })
await A.evaluate(() => window.__app.choisirOutil('selection'))
// Maj + L en plein glisser
const tAvant = await forme(A, T)
await glisser(A, 300, 300, 300, 360, async () => { await A.keyboard.press('Shift+L') })
const tApres = await forme(A, T)
ok(tApres && !tApres.verrou && Math.abs(tApres.y - tAvant.y - 60) < 1, '   … Maj + L en plein glisser ne verrouille pas ce qu\'on glisse (il est posé)', { avant: tAvant.y, apres: tApres?.y, verrou: tApres?.verrou })
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
// A9. Le menu ⋯ d'un objet libre : la section Protéger
await A.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions(a.forme(id)); a.ui.maj() }, T)
await A.waitForTimeout(120)
await A.locator('.panneau-forme .ligne button.plus').click(); await A.waitForTimeout(120)
mp = await menuPlus(A)
const iProt = (mp ?? []).findIndex(x => x.titre === 'Protéger')
const verr = (mp ?? []).find(x => x.t === 'Verrouiller')
ok(iProt > 0 && mp[iProt - 1].filet && verr && verr.touche === 'Maj + L' && verr.aide === 'Il ne bouge plus et ne se prend plus ; clic droit dessus pour le déverrouiller.' && !mp.some(x => x.t === 'Fixer en fond'),
  'A9) Le menu ⋯ : après l\'Ordre, un filet, « Protéger » : « Verrouiller » (Maj + L), son aide ; pas « Fixer en fond » pour un trait', mp)
await A.locator('.menu-plus [data-action="verrouiller"]').click(); await A.waitForTimeout(120)
ok((await forme(A, T)).verrou === true && !(await etat(A)).panneau, '   … « Verrouiller » le verrouille, et le menu se ferme', await etat(A))
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
const Im = await poser(A, image('magenta', 900, 450, 150, 100))
await A.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ouvrirOptions(a.forme(id)); a.ui.maj() }, Im)
await A.waitForTimeout(120)
await A.locator('.panneau-forme .ligne button.plus').click(); await A.waitForTimeout(120)
mp = await menuPlus(A)
const fix = (mp ?? []).find(x => x.t === 'Fixer en fond')
ok(fix && fix.aide === 'Sous tout le reste : on écrit et on entoure par-dessus ; le menu de la page la détache', '   … pour une image, « Fixer en fond » aussi, avec son aide', mp)
await A.keyboard.press('Escape'); await A.keyboard.press('Escape'); await vider(A)
await A.evaluate(id => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.supprimer(a.page, [id]) }, Im)
// A10. Le double-clic au Stylo sur une formule verrouillée : un point d'encre
const Fo = await poser(A, formule(200, 520))
await verrouiller(A, [Fo])
await A.evaluate(() => window.__app.choisirOutil('stylo'))
const nAvant = await A.evaluate(() => window.__app.formes.length)
s = await ecran(A, 240, 545)
await A.mouse.dblclick(s.x, s.y); await A.waitForTimeout(600)
const apresDbl = await A.evaluate(() => ({ n: window.__app.formes.length, editeur: !!document.querySelector('dialog[open]') }))
ok(apresDbl.n > nAvant && !apresDbl.editeur, 'A10) Au Stylo, un double-clic sur une formule verrouillée pose son point d\'encre (pas d\'éditeur)', { nAvant, apresDbl })
await A.keyboard.press('Control+z'); await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
await A.evaluate(() => window.__app.choisirOutil('selection'))
// A11. Copier un verrouillé, le coller ici et dans un autre onglet
await clicDroit(A, 300, 420)
await A.click('.panneau-forme .ligne button:text-is("Copier")'); await A.waitForTimeout(100)
await vider(A); await viderMsgs(A)
s = await ecran(A, 600, 600); await A.mouse.move(s.x, s.y); await A.mouse.move(s.x + 6, s.y)
let n1 = await A.evaluate(() => window.__app.formes.length)
await A.keyboard.press('Control+v'); await A.waitForTimeout(400)
let colle = await A.evaluate(n => window.__app.formes.slice().sort((a, b) => a.z - b.z).slice(-1)[0], n1)
ok(await A.evaluate(() => window.__app.formes.length) === n1 + 1 && colle.verrou === true && (await sel(A)).length === 0 && (await msgs(A)).includes('Collé, verrouillé. Clic droit dessus pour le déverrouiller.'),
  'A11) Ctrl + V d\'un verrouillé copié : la copie est verrouillée, non sélectionnée, « Collé, verrouillé. Clic droit dessus pour le déverrouiller. »', { colle, sel: await sel(A), m: await msgs(A) })
const { p: A2 } = await ouvrirDev(ctxA, 'souris, autre onglet')
await A2.bringToFront()
await A2.evaluate(PAGE_NEUVE)
s = { x: 700, y: 400 }; await A2.mouse.move(s.x, s.y); await A2.mouse.move(s.x + 6, s.y)
await A2.keyboard.press('Control+v'); await A2.waitForTimeout(500)
const dansB = await A2.evaluate(() => ({ formes: window.__app.formes.map(f => ({ type: f.type, verrou: f.verrou ?? null })), sel: [...window.__app.selection], m: window.__msgs.slice() }))
ok(dansB.formes.length === 1 && dansB.formes[0].verrou === true && !dansB.sel.length && dansB.m.includes('Collé, verrouillé. Clic droit dessus pour le déverrouiller.'),
  '   … collé dans un autre onglet : verrouillé, non sélectionné, avec son message', dansB)
await A2.close()
await A.bringToFront()
// A12. Un point verrouillé repéré sur une image la suit, aux flèches et au glisser
const Ip = await poser(A, image('vert', 800, 150, 150, 100))
const Pp = await poser(A, { type: 'polygone', x: 850, y: 200, pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['P'], stylePoints: [{ marque: 'croix' }], lie: Ip })
await verrouiller(A, [Pp])
await A.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.ui.maj() }, Ip)
await A.mouse.move(40, 700)
await A.keyboard.press('ArrowRight'); await A.waitForTimeout(100)
const pp1 = await forme(A, Pp)
await glisser(A, 820, 170, 820, 230)
const pp2 = await forme(A, Pp)
ok(Math.abs(pp1.x - 854) < 0.01 && Math.abs(pp2.y - 260) < 0.5 && pp2.verrou === true && pp2.lie === Ip, 'A12) Un point verrouillé repéré sur une image la suit : aux flèches, au glisser', { pp1: [pp1.x, pp1.y], pp2: [pp2.x, pp2.y] })
await vider(A)
// A13. Envoyer vers… depuis le menu d'un verrouillé ; « Aller à la page N »
const pages0 = await A.evaluate(() => window.__app.pages.length)
await clicDroit(A, 300, 420)
await A.locator('.panneau-forme .ligne button.plus').click(); await A.waitForTimeout(120)
await A.locator('.menu-plus .menu-item', { hasText: 'Envoyer vers…' }).click()
await A.waitForSelector('dialog.dialogue-envoi[open]')
await A.click('dialog.dialogue-envoi[open] .destination[data-cible="fin"]'); await A.waitForTimeout(400)
const surDepart = await A.evaluate(id => !!window.__app.forme(id), V)
await A.locator('.toast button', { hasText: /^Aller à la page/ }).click(); await A.waitForTimeout(400)
const arrive = await A.evaluate(() => ({ page: window.__app.pages.indexOf(window.__app.page) + 1, formes: window.__app.formes.map(f => ({ verrou: f.verrou ?? null })), sel: [...window.__app.selection] }))
ok(!surDepart && arrive.page === pages0 + 1 && arrive.formes.length === 1 && arrive.formes[0].verrou === true && arrive.sel.length === 0,
  'A13) Envoyer vers… (Déplacer) depuis le menu court : arrivé verrouillé ; « Aller à la page N » ne le sélectionne pas', { surDepart, arrive })
await ctxA.close()

// =====================================================================
console.log('=== B. au stylet d\'une tablette graphique ===')
const ctxB = await contexte()
const { p: B, stylet } = await ouvrirDev(ctxB, 'stylet')
ok(await B.evaluate(() => navigator.maxTouchPoints) === 0, 'B0) Pas d\'écran tactile (navigator.maxTouchPoints = 0)')
await B.evaluate(PAGE_NEUVE)
const BT = await poser(B, trait(200, 300, 200))
const BV = await poser(B, trait(200, 420, 200))
await verrouiller(B, [BV])
await B.waitForTimeout(150)
s = await ecran(B, 300, 420)
await stylet.survol(s.x, s.y); await stylet.survol(s.x + 2, s.y); await B.waitForTimeout(80)
ok(await cadenas(B) === BV, 'B1) Le stylet qui survole le verrouillé : son cadenas', await cadenas(B))
await B.evaluate(() => { window.__app.rendu.cadenas = null })
await viderMsgs(B)
await stylet.bas(s.x, s.y); await attendre(40); await stylet.haut(s.x, s.y); await B.waitForTimeout(120)
ok((await sel(B)).length === 0 && await cadenas(B) === BV && (await msgs(B)).includes('Objet verrouillé : bouton du stylet dessus pour le déverrouiller.'),
  '   … un appui du stylet ne le prend pas ; le cadenas, et le rappel dans les mots du stylet', { sel: await sel(B), m: await msgs(B) })
// Le lasso au stylet autour des deux
const tour = []
const c0 = await ecran(B, 300, 360)
for (let k = 0; k <= 36; k++) { const a = k / 36 * 2 * Math.PI; tour.push([c0.x + 170 * Math.cos(a), c0.y + 110 * Math.sin(a)]) }
await stylet.survol(...tour[0]); await stylet.bas(...tour[0])
for (const q of tour.slice(1)) { await stylet.va(...q); await attendre(8) }
await stylet.haut(...tour.at(-1)); await B.waitForTimeout(150)
ok(JSON.stringify(await sel(B)) === JSON.stringify([BT]), 'B2) Un lasso au stylet autour du libre et du verrouillé ne prend que le libre', await sel(B))
await vider(B)
// Le bouton du stylet : le menu court ; Maj + L, le message
await stylet.bouton(s.x, s.y)
e = await etat(B)
ok(e.panneau && e.titre === 'Verrouillé' && JSON.stringify(e.sel) === JSON.stringify([BV]), 'B3) Le bouton du stylet sur le verrouillé : son menu court', e)
await B.click('.panneau-forme [data-action="deverrouiller"]'); await B.waitForTimeout(120)
await viderMsgs(B)
await B.keyboard.press('Shift+L'); await B.waitForTimeout(120)
ok(await dernier(B) === 'Verrouillé : il ne bouge plus. Bouton du stylet dessus pour le déverrouiller.', '   … reverrouillé : « … Bouton du stylet dessus pour le déverrouiller. »', await msgs(B))
await ctxB.close()

// =====================================================================
console.log('=== C. au doigt ===')
const ctxC = await contexte({ hasTouch: true })
const { p: C, doigt } = await ouvrirDev(ctxC, 'doigt')
await C.evaluate(PAGE_NEUVE)
const CT = await poser(C, trait(200, 300, 200))
const CV = await poser(C, trait(200, 420, 200))
await verrouiller(C, [CV])
await C.waitForTimeout(150)
s = await ecran(C, 300, 420)
await viderMsgs(C)
await doigt('touchStart', [[s.x, s.y]]); await attendre(60); await doigt('touchEnd', []); await C.waitForTimeout(150)
ok((await sel(C)).length === 0 && await cadenas(C) === CV && (await msgs(C)).includes('Objet verrouillé : appui long dessus pour le déverrouiller.'),
  'C1) Un toucher sur le verrouillé ne le prend pas ; le cadenas, et « Objet verrouillé : appui long dessus pour le déverrouiller. »', { sel: await sel(C), c: await cadenas(C), m: await msgs(C) })
await C.waitForTimeout(400)
await doigt('touchStart', [[s.x, s.y]]); await attendre(750)
e = await etat(C)
await doigt('touchEnd', []); await C.waitForTimeout(150)
ok(e.panneau && e.titre === 'Verrouillé' && JSON.stringify(e.sel) === JSON.stringify([CV]), 'C2) L\'appui long sur lui : son menu court', e)
await C.click('.panneau-forme [data-action="deverrouiller"]'); await C.waitForTimeout(120)
ok(!('verrou' in (await forme(C, CV))), '   … « Déverrouiller », touché, le libère', await forme(C, CV))
await verrouiller(C, [CV]); await vider(C)
// L'appui long sur une image fixée : le menu de la page
await C.evaluate(IMAGES)
await poser(C, image('vert', 700, 150, 300, 200, { fixe: true, z: -5 }))
s = await ecran(C, 850, 250)
await doigt('touchStart', [[s.x, s.y]]); await attendre(750)
const mpC = await menuPage(C)
await doigt('touchEnd', []); await C.waitForTimeout(150)
ok(mpC?.some(x => x.action === 'detacher-fond') && !(await etat(C)).panneau, 'C4) L\'appui long sur une image fixée : le menu de la page, avec « Détacher l\'image du fond »', mpC)
await C.keyboard.press('Escape'); await vider(C)
const t0 = await ecran(C, 300, 360)
const tourC = []
for (let k = 0; k <= 36; k++) { const a = k / 36 * 2 * Math.PI; tourC.push([t0.x + 170 * Math.cos(a), t0.y + 110 * Math.sin(a)]) }
await doigt('touchStart', [tourC[0]])
for (const q of tourC.slice(1)) { await doigt('touchMove', [q]); await attendre(8) }
await doigt('touchEnd', []); await C.waitForTimeout(150)
ok(JSON.stringify(await sel(C)) === JSON.stringify([CT]), 'C3) Un lasso au doigt autour des deux ne prend que le libre', await sel(C))
await ctxC.close()

// =====================================================================
console.log('=== D. fixer en fond ===')
const ctxD = await contexte({ hasTouch: false })
const { p: P, stylet: styletD } = await ouvrirDev(ctxD, 'fond')
await P.evaluate(IMAGES)
await P.evaluate(PAGE_NEUVE)
// La magenta d'abord, puis la verte (grande, posée après : dessus), puis un trait sur la verte
const Mg = await poser(P, image('magenta', 450, 300, 200, 150))
const F = await poser(P, image('vert', 200, 150, 400, 300))
const Tf = await poser(P, trait(260, 220, 120))
await P.waitForTimeout(200)
ok(await couleur(P, 500, 350) === 'vert', 'D0) Avant : la verte, posée après, couvre la magenta', await couleur(P, 500, 350))
await clicDroit(P, 300, 380)
await P.locator('.panneau-forme .ligne button.plus').click(); await P.waitForTimeout(120)
await viderMsgs(P)
n0 = await pile(P)
await P.locator('.menu-plus [data-action="fixer"]').click(); await P.waitForTimeout(200)
f = await forme(P, F)
const zMin = await P.evaluate(id => Math.min(...window.__app.formes.filter(f => f.id !== id).map(f => f.z)), F)
// (retouches après le lot 5 : le message dit aussi qu'on la tourne après « Détacher l'image du fond », voir messageFixe ;
// corrections de leurs vérifications : à l'outil Sélection, qu'on a choisi, il ajoute comment reprendre le Stylo)
const outilD1 = await P.evaluate(() => window.__app.outil)
ok(f.fixe === true && f.z < zMin && (await sel(P)).length === 0 && await dernier(P) === 'Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis « Détacher l\'image du fond ».' + (outilD1 === 'selection' ? ' P : reprendre le Stylo.' : ''),
  'D1) « Fixer en fond » : fixée, sous tout, la sélection vide, « Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis « Détacher l\'image du fond ». »', { f: { fixe: f.fixe, z: f.z }, zMin, m: await msgs(P) })
ok(await pile(P) === n0 + 1 && await P.evaluate(() => { const t = window.__app.tableau; return !t.film.get(t.film.length - 1).reglage }), '   … une étape d\'annulation, un geste du film (pas un réglage)')
ok(await couleur(P, 500, 350) === 'magenta' && await couleur(P, 320, 220) === 'sombre', '   … peinte sous l\'autre image et sous le trait', { a: await couleur(P, 500, 350), b: await couleur(P, 320, 220) })
// Ni clic, ni cadre, ni lasso, ni gomme, ni Ctrl + A
await clic(P, 300, 380)
ok((await sel(P)).length === 0 && await cadenas(P) === null, 'D2) Un clic sur elle ne prend rien, sans cadenas (c\'est le décor)', { sel: await sel(P), c: await cadenas(P) })
await glisser(P, 240, 190, 420, 260)
ok(JSON.stringify(await sel(P)) === JSON.stringify([Tf]), '   … un cadre tiré depuis elle prend le trait écrit dessus, pas elle', await sel(P))
await vider(P)
const tourD = [], cd = await ecran(P, 320, 220)
for (let k = 0; k <= 36; k++) { const a = k / 36 * 2 * Math.PI; tourD.push([cd.x + 100 * Math.cos(a), cd.y + 50 * Math.sin(a)]) }
await styletD.survol(...tourD[0]); await styletD.bas(...tourD[0])
for (const q of tourD.slice(1)) { await styletD.va(...q); await attendre(8) }
await styletD.haut(...tourD.at(-1)); await P.waitForTimeout(150)
ok(JSON.stringify(await sel(P)) === JSON.stringify([Tf]), '   … un lasso au stylet qui part sur elle entoure l\'écriture, pas elle', await sel(P))
await vider(P); await viderMsgs(P)
await P.keyboard.press('Control+a'); await P.waitForTimeout(100)
ok(!(await sel(P)).includes(F) && (await sel(P)).length === 2, '   … Ctrl + A ne la prend pas', await sel(P))
await vider(P)
await P.evaluate(() => window.__app.choisirOutil('gomme'))
await glisser(P, 230, 400, 430, 400)
ok(!!(await forme(P, F)), '   … la gomme ne l\'efface pas', !!(await forme(P, F)))
await P.evaluate(() => window.__app.choisirOutil('selection'))
// Le menu de la page : sur elle, et à côté
await clicDroit(P, 300, 380)
let mpg = await menuPage(P)
e = await etat(P)
const textes = (mpg ?? []).filter(x => x.t).map(x => x.t)
ok(e.menuPage && !e.panneau && JSON.stringify(textes.slice(0, 6)) === JSON.stringify(['Coller ici', 'Tout sélectionner', 'Tout voir', 'Détacher l\'image du fond', 'Copier l\'image du fond', 'Envoyer l\'image du fond vers…']),
  'D3) Clic droit sur elle : le menu de la page, avec « Détacher l\'image du fond », « Copier l\'image du fond », « Envoyer l\'image du fond vers… »', mpg)
await P.keyboard.press('Escape')
await styletD.bouton(...Object.values(await ecran(P, 300, 380)))
ok((await etat(P)).menuPage && (await menuPage(P)).some(x => x.action === 'detacher-fond'), '   … le bouton du stylet sur elle aussi', await menuPage(P))
await P.keyboard.press('Escape')
await P.evaluate(() => window.__app.choisirOutil('stylo'))
await clicDroit(P, 300, 380)
ok((await etat(P)).menuPage && (await menuPage(P)).some(x => x.action === 'detacher-fond'), '   … et au Stylo', null)
await P.keyboard.press('Escape')
await P.evaluate(() => window.__app.choisirOutil('selection'))
// Copier l'image du fond ; la coller dans un autre onglet
await clicDroit(P, 300, 380)
await viderMsgs(P)
await P.click('.menu-flottant[aria-label="Page"] [data-action="copier-fond"]'); await P.waitForTimeout(150)
ok(await dernier(P) === 'Image du fond copiée', 'D4) « Copier l\'image du fond » : « Image du fond copiée »', await msgs(P))
const html = await P.evaluate(async () => { for (const it of await navigator.clipboard.read()) if (it.types.includes('text/html')) return (await it.getType('text/html')).text(); return null })
const { p: P2 } = await ouvrirDev(ctxD, 'fond, autre onglet')
await P2.bringToFront()
await P2.evaluate(IMAGES)
await P2.evaluate(PAGE_NEUVE)
await poser(P2, trait(300, 300, 200))
await poser(P2, image('magenta', 600, 300, 100, 80))
s = await ecran(P2, 400, 300); await P2.mouse.move(s.x, s.y); await P2.mouse.move(s.x + 6, s.y)
await P2.keyboard.press('Control+v'); await P2.waitForTimeout(500)
const enB = await P2.evaluate(() => {
  const a = window.__app, fx = a.formes.find(f => f.fixe)
  return { fixe: !!fx, sousTout: !!fx && a.formes.every(f => f === fx || f.z > fx.z), sel: [...a.selection], m: window.__msgs.slice(), n: a.formes.length }
})
ok(enB.fixe && enB.sousTout && enB.sel.length === 0 && enB.m.includes('Image collée dans le fond. Clic droit dans le vide pour la détacher.'),
  '   … collée dans un autre onglet : fixée, sous tout, non sélectionnée, « Image collée dans le fond. Clic droit dans le vide pour la détacher. »', enB)
ok(await couleur(P2, 300 + 6 * 0, 300) === 'sombre', '   … peinte sous le trait de cette page', await couleur(P2, 300, 300))
await P2.close()
// Les deux versions construites, chacune dans son onglet : la version clé
// (un seul fichier, file://) et la version en ligne (dist-pages, servie ici
// sur un port libre, comme GitHub Pages) ; le HTML marqué du presse-papiers,
// collé comme le fait Ctrl + V (l'événement paste)
const UN = R + '/dist/index.html', EN_LIGNE = R + '/dist-pages'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json' }
const serveur = createServer((q, r) => {
  const chemin = normalize(join(EN_LIGNE, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(EN_LIGNE) || !existsSync(chemin) || !statSync(chemin).isFile()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => serveur.listen(0, '127.0.0.1', f))
const versions = [['version clé (file://)', 'file://' + UN, existsSync(UN)], ['version en ligne (dist-pages)', `http://127.0.0.1:${serveur.address().port}/index.html`, existsSync(EN_LIGNE + '/index.html')]]
for (const [nom, adresse, construite] of versions) {
  if (!construite || !html) { ok(false, `D5) la ${nom} n'est pas construite, ou le HTML copié manque`, { construite, html: !!html }); continue }
  const K = await ctxD.newPage(); suivre(K, nom)
  await K.goto(adresse); await pret(K); await K.waitForTimeout(800)
  // Un trait au Stylo au milieu, puis le collage sous le pointeur, posé dessus
  await K.mouse.move(600, 400); await K.mouse.down()
  for (let k = 1; k <= 10; k++) await K.mouse.move(600 + 20 * k, 400)
  await K.mouse.up(); await K.waitForTimeout(300)
  await K.mouse.move(700, 400); await K.mouse.move(705, 400)
  await K.evaluate(h => {
    const dt = new DataTransfer(); dt.setData('text/html', h); dt.setData('text/plain', 'MEM teachingtool')
    document.body.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }))
  }, html)
  await K.waitForTimeout(600)
  const vu = await K.evaluate(() => {
    const c = document.querySelector('#zone canvas'), g = c.getContext('2d'), k = c.width / c.clientWidth, z = c.getBoundingClientRect()
    const px = (x, y) => [...g.getImageData(Math.round((x - z.left) * k), Math.round((y - z.top) * k), 1, 1).data]
    return { trait: px(700, 400), loin: px(700, 440), toast: document.querySelector('.toast')?.textContent ?? '', barre: !document.querySelector('.barre-actions') || document.querySelector('.barre-actions').hidden }
  })
  const vert = q => q[0] < 60 && q[1] > 150 && q[2] < 60, sombre = q => q[0] < 80 && q[1] < 80 && q[2] < 90
  ok(vu.toast.includes('Image collée dans le fond. Clic droit dans le vide pour la détacher.') && sombre(vu.trait) && vert(vu.loin) && vu.barre,
    `D5) Dans la ${nom} : collée sous le trait déjà écrit, non sélectionnée (pas de barre), avec son message`, vu)
  await K.close()
}
serveur.close()
await P.bringToFront()
// Envoyer l'image du fond vers… (Déplacer)
const nPages = await P.evaluate(() => window.__app.pages.length)
await clicDroit(P, 300, 380)
await P.click('.menu-flottant[aria-label="Page"] [data-action="envoyer-fond"]')
await P.waitForSelector('dialog.dialogue-envoi[open]')
await P.click('dialog.dialogue-envoi[open] .destination[data-cible="fin"]'); await P.waitForTimeout(400)
const partie = await P.evaluate(id => !window.__app.forme(id), F)
await P.locator('.toast button', { hasText: /^Aller à la page/ }).click(); await P.waitForTimeout(400)
const la = await P.evaluate(() => ({ k: window.__app.pages.indexOf(window.__app.page) + 1, formes: window.__app.formes.map(f => ({ type: f.type, fixe: f.fixe ?? null })), sel: [...window.__app.selection] }))
ok(partie && la.k === nPages + 1 && la.formes.length === 1 && la.formes[0].fixe === true && la.sel.length === 0,
  'D6) « Envoyer l\'image du fond vers… » (Déplacer) : elle part, arrive fixée, et « Aller à la page N » ne la sélectionne pas', { partie, la })
// Détacher, avec deux images fixées
await P.evaluate(PAGE_NEUVE)
const F1 = await poser(P, image('vert', 200, 150, 300, 200, { fixe: true, z: -20 }))
const F2 = await poser(P, image('magenta', 600, 150, 300, 200, { fixe: true, z: -10 }))
const L1 = await poser(P, image('magenta', 250, 450, 100, 80))
await P.waitForTimeout(150)
await clicDroit(P, 800, 600)
mpg = await menuPage(P)
const det = (mpg ?? []).find(x => x.action === 'detacher-fond')
ok(det?.t === 'Détacher le fond' && det.aide === '2 images fixées en fond sur cette page' && mpg.some(x => x.t === 'Copier le fond') && mpg.some(x => x.t === 'Envoyer le fond vers…'),
  'D7) Clic droit à côté des deux images fixées : « Détacher le fond », « Copier le fond », « Envoyer le fond vers… », « 2 images fixées en fond sur cette page »', mpg)
await P.keyboard.press('Escape')
await P.evaluate(() => window.__app.choisirOutil('stylo'))
await clicDroit(P, 300, 250)
await viderMsgs(P)
await P.click('.menu-flottant[aria-label="Page"] [data-action="detacher-fond"]'); await P.waitForTimeout(200)
const apresDet = await P.evaluate(ids => { const a = window.__app; return { fs: ids.map(id => { const f = a.forme(id); return { fixe: f.fixe ?? null, z: f.z } }), sel: [...a.selection], outil: a.outil } }, [F1, F2, L1])
ok(apresDet.fs[0].fixe === null && apresDet.fs[1].fixe === true && apresDet.fs[0].z > apresDet.fs[1].z && apresDet.fs[0].z < apresDet.fs[2].z,
  '   … « Détacher l\'image du fond » sur la plus basse : elle passe au-dessus de l\'autre image fixée et sous l\'image libre (l\'invariant tient)', apresDet)
// (corrections des vérifications des retouches après le lot 5 : le message dit aussi ses coins, ↻, et comment reprendre le
// Stylo, d'où l'on venait, voir messageDetache)
ok(JSON.stringify(apresDet.sel) === JSON.stringify([F1]) && apresDet.outil === 'selection' && await dernier(P) === 'Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.',
  '   … elle est sélectionnée, l\'outil Sélection pris, « Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo. »', { apresDet, m: await msgs(P) })
await P.keyboard.press('Control+z'); await P.waitForTimeout(100)
ok((await forme(P, F1)).fixe === true && (await forme(P, F1)).z === -20, '   … un Ctrl + Z la refixe à sa place', await forme(P, F1))
// L'import d'une image propose « Fixer en fond »
await P.evaluate(PAGE_NEUVE)
await viderMsgs(P)
const Imp = await P.evaluate(async () => {
  const a = window.__app
  const cv = Object.assign(document.createElement('canvas'), { width: 120, height: 60 })
  const g = cv.getContext('2d'); g.fillStyle = '#00c000'; g.fillRect(0, 0, 120, 60)
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
  await a.importerImage(blob)
  return a.formes.find(f => f.type === 'image').id
})
await P.waitForTimeout(150)
const bouton = await P.evaluate(() => [...document.querySelectorAll('.toast button')].map(b => b.textContent))
// (retouches après le lot 5 : l'image importée arrive à la Sélection, son message dit ses coins et sa pastille ; déjà à la Sélection, rien à reprendre)
ok(await dernier(P) === 'Image posée : ses coins l\'agrandissent, ↻ la tourne.' && bouton.includes('Fixer en fond'),
  'D8) L\'import d\'une image : son message (ses coins, sa pastille ↻), et il propose « Fixer en fond »', { m: await msgs(P), bouton })
await P.locator('.toast button', { hasText: 'Fixer en fond' }).click(); await P.waitForTimeout(150)
ok((await forme(P, Imp)).fixe === true && (await sel(P)).length === 0, '   … qui la fixe', await forme(P, Imp))
await ctxD.close()

// =====================================================================
console.log('=== E. ce qui survit : .memc, Dupliquer la page, revue, film élève, Effacer la page ===')
const ctxE = await contexte()
const { p: E } = await ouvrirDev(ctxE, 'survie')
await E.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => E.evaluate(ms => { window.__dec += ms }, ms)
await E.evaluate(IMAGES)
await avancer(30 * 60_000)
await E.evaluate(PAGE_NEUVE)
await avancer(3000)
const Em = await poser(E, image('magenta', 450, 300, 200, 150))
await avancer(3000)
const Ef = await poser(E, image('vert', 200, 150, 400, 300))
await avancer(3000)
const Et = await poser(E, trait(260, 220, 120))
await avancer(3000)
await E.evaluate(id => window.__app.fixerEnFond([id]), Ef)
await avancer(3000)
const Ev = await poser(E, trait(260, 500, 200))
await avancer(3000)
// La revue et le film élève, avant le verrou
const ouvrirRevue = async () => {
  await E.click('button[title^="Revoir la construction"]'); await E.waitForTimeout(500)
  const total = await E.evaluate(() => window.__revue?.bande?.total ?? null)
  await E.keyboard.press('End'); await E.waitForTimeout(600)
  const fin = await E.evaluate(COMPTER, '.revue-scene canvas')
  for (let i = 0; i < 4 && await E.evaluate(() => window.__app.enLecture); i++) { await E.keyboard.press('Escape'); await E.waitForTimeout(150) }
  return { total, fin }
}
const film = async () => E.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, verrou' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length }
})
const r1 = await ouvrirRevue()
const f1 = await film()
await verrouiller(E, [Ev])
await avancer(3000)
const r2 = await ouvrirRevue()
const f2 = await film()
ok(r1.total !== null && r2.total === r1.total && f2.etapes === f1.etapes, 'E1) Verrouiller ne fait pas de geste de plus : ni dans la revue, ni dans le film élève', { r1: r1.total, r2: r2.total, f1: f1.etapes, f2: f2.etapes })
ok(r2.fin && r2.fin.magenta > 25000 && r2.fin.vert > 50000 && r2.fin.sombre > 500, '   … la revue, à la fin : l\'image fixée sous l\'autre image (la magenta entière) et sous les traits', r2.fin)
writeFileSync(D + '/verrou.mem', f2.texte)
const Lc = await ctxE.newPage(); suivre(Lc, 'lecteur')
await Lc.goto(DEV + 'revoir.html')
await Lc.locator('input[type=file]').setInputFiles({ name: 'verrou.mem', mimeType: 'application/json', buffer: Buffer.from(f2.texte) })
await Lc.waitForTimeout(1500)
await Lc.keyboard.press('End'); await Lc.waitForTimeout(1000)
const finL = await Lc.evaluate(COMPTER, 'canvas')
const champs = JSON.parse(f2.texte).pages?.[0]?.formes?.filter(x => x.fixe || x.verrou).length ?? null
ok(finL && finL.magenta > 25000 && finL.vert > 50000 && finL.sombre > 500, '   … le nouveau lecteur, à la fin : de même', { finL, champs })
await Lc.close()
// Dupliquer la page
await vider(E)
await E.keyboard.press('Control+Shift+d'); await E.waitForTimeout(300)
const copie = await E.evaluate(() => window.__app.formes.map(f => ({ type: f.type, fixe: f.fixe ?? null, verrou: f.verrou ?? null })))
ok(copie.filter(x => x.fixe).length === 1 && copie.filter(x => x.verrou).length === 1, 'E2) Dupliquer la page : l\'image fixée et le trait verrouillé le restent sur la copie', copie)
// Le .memc enregistré puis rouvert
const memc = await E.evaluate(async () => {
  const { ecrireTableau } = await import('/src/fichier.ts')
  const o = new Uint8Array(await ecrireTableau(window.__app.tableau.doc).arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return btoa(s)
})
const CHEMIN = D + '/Verrou lot 5.memc'
writeFileSync(CHEMIN, Buffer.from(memc, 'base64'))
const ctxO = await contexte()
const { p: O } = await ouvrirDev(ctxO, 'rouvert')
const fc = O.waitForEvent('filechooser', { timeout: 8000 })
await O.click('.barre-haut .bouton.points'); await O.waitForTimeout(150)
await O.click('.menu-flottant:not([hidden]) [data-action="ouvrir"]')
await (await fc).setFiles(CHEMIN)
await O.waitForSelector('dialog[open] [data-a="ajouter"]', { timeout: 15000 })
await Promise.all([O.waitForEvent('load', { timeout: 30000 }), O.click('dialog[open] [data-a="ajouter"]')])
await pret(O); await O.waitForFunction(() => window.__app && window.__app.page); await O.waitForTimeout(800)
const rouvert = await O.evaluate(ids => {
  const t = window.__app.tableau, r = {}
  for (const p of t.ordre.toArray()) for (const f of t.formesDe(p)?.values() ?? []) if (ids.includes(f.id)) r[f.id] = { fixe: f.fixe ?? null, verrou: f.verrou ?? null }
  return r
}, [Ef, Ev])
ok(rouvert[Ef]?.fixe === true && rouvert[Ev]?.verrou === true, 'E3) Le .memc enregistré puis rouvert : l\'image toujours fixée, le trait toujours verrouillé', rouvert)
await ctxO.close()
await ctxE.close()
// « Effacer la page » : un classeur d'une seule page
const ctxF = await contexte()
const { p: G } = await ouvrirDev(ctxF, 'effacer')
await G.evaluate(IMAGES)
const pagesG = await G.evaluate(() => window.__app.pages.length)
await poser(G, image('vert', 200, 150, 400, 300, { fixe: true, z: 1 }))
const GV = await poser(G, trait(260, 500, 200))
await poser(G, trait(260, 220, 120))
await verrouiller(G, [GV])
await viderMsgs(G)
await G.evaluate(() => window.__app.supprimerPage())
await G.waitForTimeout(150)
const apresEff = await G.evaluate(() => window.__app.formes.map(f => ({ type: f.type, fixe: f.fixe ?? null, verrou: f.verrou ?? null })))
const bouts = await G.evaluate(() => [...document.querySelectorAll('.toast button')].map(b => b.textContent))
ok(pagesG === 1 && apresEff.length === 2 && apresEff.some(x => x.fixe) && apresEff.some(x => x.verrou) && await dernier(G) === 'Page effacée (ce qui est verrouillé ou fixé en fond reste)' && bouts.includes('Annuler'),
  'E4) « Effacer la page » (une page seule) : l\'image fixée et le trait verrouillé restent, « Page effacée (ce qui est verrouillé ou fixé en fond reste) », avec « Annuler »', { pagesG, apresEff, m: await msgs(G), bouts })
await G.evaluate(() => window.__app.supprimerPage())
await G.waitForTimeout(100)
ok(await dernier(G) === 'Rien à effacer : ce qui reste est verrouillé ou fixé en fond (menu de la page pour le détacher).', '   … une seconde fois : « Rien à effacer : ce qui reste est verrouillé ou fixé en fond (menu de la page pour le détacher). »', await msgs(G))
await viderMsgs(G)
await G.keyboard.press('Control+a'); await G.waitForTimeout(100)
const s0 = await ecran(G, 900, 250)
await G.mouse.click(s0.x, s0.y, { button: 'right' }); await G.waitForTimeout(150)
const mg = await menuPage(G)
ok(await dernier(G) === 'Rien à sélectionner : ce qui est sur la page est verrouillé ou fixé en fond.' && mg?.find(x => x.t === 'Tout sélectionner')?.inactif === true,
  '   … Ctrl + A : « Rien à sélectionner : ce qui est sur la page est verrouillé ou fixé en fond. », et « Tout sélectionner » grisé', { m: await msgs(G), mg })
const dv = mg?.find(x => x.action === 'deverrouiller-tout')
ok(dv?.t === 'Déverrouiller tout' && dv.aide === '1 objet verrouillé sur cette page', '   … le menu de la page : « Déverrouiller tout », « 1 objet verrouillé sur cette page »', dv)
await G.click('.menu-flottant[aria-label="Page"] [data-action="deverrouiller-tout"]'); await G.waitForTimeout(150)
ok(!('verrou' in (await forme(G, GV))) && await dernier(G) === 'Déverrouillé' && await G.evaluate(() => { const t = window.__app.tableau; return t.film.get(t.film.length - 1).reglage === true }),
  '   … qui le déverrouille (« Déverrouillé », un réglage)', await msgs(G))
await ctxF.close()

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
