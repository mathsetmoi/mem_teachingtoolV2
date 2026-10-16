// ESSAI DU MORCEAU K4-groupes (lot 5) : Grouper (Ctrl + G), Dégrouper
// (Ctrl + Maj + G), prendre un objet dans un groupe, un groupe toujours
// entier dans son état ; à la souris, au stylet d'une tablette graphique
// (CDP, pointerType 'pen', navigator.maxTouchPoints 0, le bouton du stylet
// est le bouton 2), au doigt (CDP touch), sur un Mac simulé (⌘).
// A. Souris : un cadre autour de trois objets, Ctrl + G (une étape « réglage »,
//    le message) ; un clic ailleurs, un clic sur l'un : les trois ; glisser :
//    les trois bougent ; un second clic : un seul (et son message, une fois) ;
//    d'un membre seul à un autre ; une sélection faite du groupe et d'un autre
//    objet : un clic sur un membre la garde, Maj + clic en retire tout le
//    groupe ; Ctrl + Maj + G ; Ctrl + Z, Ctrl + Y ; la lettre par e.key (une
//    touche marquée G d'un autre e.code) ; Ctrl + G toujours empêché, même
//    sans rien à grouper ; double-clic sur une formule groupée : son éditeur ;
//    sur un trait groupé : le menu du groupe (« Groupe · 2 objets »,
//    Dégrouper) ; le menu commun d'une autre sélection : « Grouper » après
//    « Couleur, épaisseur » ; le survol éclaire tout le groupe ; le cadre plein
//    d'un groupe pris, le pointillé d'un membre seul ; un cadre qui ne prend
//    qu'un membre prend tout le groupe ; un membre pris seul puis Maj + L :
//    tout le groupe verrouillé, un clic n'en prend plus rien, le clic droit
//    ouvre le menu court des trois ; la couleur du menu commun ; Suppr ;
//    Transformer un membre seul (l'image n'est d'aucun groupe) ; la gomme
//    n'efface que le membre touché ; Ctrl + C dans un onglet, Ctrl + V dans un
//    autre, Ctrl + D, Dupliquer la page, Envoyer vers… (un groupe neuf, ou le
//    même identifiant sur la copie de page), et il se prend en entier.
// B. 1024 px : la rangée du menu commun de trois objets (traits et figure)
//    tient sur une ligne, avec Grouper, puis avec Dégrouper.
// C. Mac simulé : ⌘ + G, ⌘ + Maj + G, « ⌘ + G » dans le titre.
// D. Stylet de tablette graphique : un appui prend le groupe ; le bouton du
//    stylet sur un membre : le menu du groupe ; un lasso autour d'un seul
//    membre prend tout le groupe.
// E. Doigt : un toucher prend le groupe, un second (après 300 ms) un membre ;
//    un double appui : le menu du groupe ; l'appui long : le menu du groupe ;
//    le mode Ajouter ajoute tout un groupe.
// F. Ce qui survit : le .memc rouvert ; la revue et le film élève (le
//    nouveau lecteur) : grouper n'y est pas un geste, rien ne plante.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K4-groupes/travail'
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

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(o = {}, mac = false) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  if (mac) await c.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
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
    // Ce que voit le navigateur après MEM : Ctrl (⌘) + G est-il empêché ?
    window.__g = []
    window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') window.__g.push(e.defaultPrevented) })
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
  const touche = async (key, code, modifiers) => {
    await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, modifiers, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) })
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, modifiers, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0) })
    await attendre(120)
  }
  return { p, cdp, stylet, doigt, touche }
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
const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false, ...o }
}
const triangle = (x, y, o = {}) => ({ type: 'polygone', x, y, pts: [0, 150, 200, 150, 0, 0], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], ...o })
const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 40, ...o })

async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(40); return id }
/** Une page neuve : deux traits et un triangle (à grouper), un trait X et une formule F à côté */
async function scene(p) {
  await p.evaluate(PAGE_NEUVE)
  const T1 = await poser(p, trait(200, 250, 150))
  const Tri = await poser(p, triangle(450, 200))
  const T2 = await poser(p, trait(200, 420, 150))
  const X = await poser(p, trait(800, 450, 100))
  const F = await poser(p, formule(750, 200))
  await p.waitForTimeout(150)
  return { T1, Tri, T2, X, F, G: [T1, Tri, T2] }
}
/** Groupe ces objets comme le menu (la sélection, puis App.grouper) */
const grouper = (p, ids) => p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); const r = a.grouper(); a.selection.clear(); a.rendu.redessinerDirect(); a.ui.maj(); return r }, ids)
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
const sel = p => p.evaluate(() => [...window.__app.selection])
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
const msgs = p => p.evaluate(() => (window.__msgs || []).slice())
const dernier = async p => (await msgs(p)).at(-1)
const viderMsgs = p => p.evaluate(() => { window.__msgs = [] })
const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
const groupes = (p, ids) => p.evaluate(ids => ids.map(id => window.__app.forme(id)?.groupe ?? null), ids)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
const derniereEtape = p => p.evaluate(() => { const t = window.__app.tableau; const e = t.film.get(t.film.length - 1); return { n: t.film.length, reglage: e.reglage ?? null } })
const ETAT = () => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), ba = document.querySelector('.barre-actions')
  return {
    sel: [...a.selection], options: a.options, outil: a.outil,
    panneau: !pn.hidden, label: pn.getAttribute('aria-label'), barre: !!ba && !ba.hidden,
    titre: pn.hidden ? null : pn.querySelector('.titre-selection')?.textContent ?? null,
    boutons: pn.hidden ? [] : [...pn.querySelectorAll('.ligne button')].map(b => b.textContent || b.getAttribute('aria-label')),
    editeur: !!document.querySelector('dialog.dialogue-formule[open]'),
  }
}
const etat = p => p.evaluate(ETAT)
/** Le cadre du groupe sur la couche directe : à 9 px de la boîte réunie de
 *  ses membres, sur son bord gauche ; 'plein' (le bleu, opaque), 'clair'
 *  (le pointillé très clair), ou null */
const CADRE = ids => {
  const a = window.__app, cam = a.cam
  let x1 = Infinity, y1 = Infinity, y2 = -Infinity
  for (const id of ids) { const b = a.rendu.boite(a.forme(id)); x1 = Math.min(x1, b.x); y1 = Math.min(y1, b.y); y2 = Math.max(y2, b.y + b.h) }
  const c = a.rendu.direct, k = c.width / c.clientWidth
  const s = cam.versEcran(x1 - 9 / cam.z, (y1 + y2) / 2)
  const d = c.getContext('2d').getImageData(Math.round(s.x * k) - 2, Math.round(s.y * k) - 20, 5, 40).data
  let max = 0, bleu = false
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > max) { max = d[i + 3]; bleu = d[i + 2] > d[i] + 40 }
  return max > 160 && bleu ? 'plein' : max > 20 && max < 140 && bleu ? 'clair' : max ? `alpha ${max}` : null
}
const cadre = async (p, ids) => { await p.waitForTimeout(80); return p.evaluate(CADRE, ids) }
async function clicDroit(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, { button: 'right' }); await p.waitForTimeout(150) }
async function clic(p, x, y, o) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, o); await p.waitForTimeout(100) }
async function maj(p, x, y) { await p.keyboard.down('Shift'); await clic(p, x, y); await p.keyboard.up('Shift') }
/** Glisser à la souris (monde), par petits pas */
async function glisser(p, x1, y1, x2, y2) {
  const a = await ecran(p, x1, y1), b = await ecran(p, x2, y2)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= 10; k++) await p.mouse.move(a.x + (b.x - a.x) * k / 10, a.y + (b.y - a.y) * k / 10)
  await p.mouse.up(); await p.waitForTimeout(120)
}
const ouvrirPlus = async p => { await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(120) }

// =====================================================================
console.log('=== A. à la souris ===')
const ctxA = await contexte()
const { p: A, touche: toucheA } = await ouvrirDev(ctxA, 'souris')
let o = await scene(A)
// A1. Un cadre autour des trois, Ctrl + G
await glisser(A, 170, 170, 680, 470)
ok(meme(await sel(A), o.G), 'A1) Un cadre autour des deux traits et du triangle : les trois', await sel(A))
let n0 = await pile(A), f0 = await derniereEtape(A)
await viderMsgs(A)
await A.keyboard.press('Control+g'); await A.waitForTimeout(150)
let g = await groupes(A, o.G)
const G0 = g[0]
ok(G0 && g.every(x => x === G0) && (await groupes(A, [o.X, o.F])).every(x => x === null), '   … Ctrl + G : les trois portent le même groupe, rien d\'autre', g)
ok(await dernier(A) === 'Groupé : 3 objets — un clic sur l\'un d\'eux, quand le groupe est pris, ne prend que lui', '   … « Groupé : 3 objets — un clic sur l\'un d\'eux, quand le groupe est pris, ne prend que lui »', await msgs(A))
let f1 = await derniereEtape(A)
ok(await pile(A) === n0 + 1 && f1.n === f0.n + 1 && f1.reglage === true && meme(await sel(A), o.G), '   … une étape d\'annulation, une étape du film notée « réglage » ; la sélection reste', { pile: await pile(A), n0, f0, f1 })
ok(await cadre(A, o.G) === 'plein', '   … le groupe pris : un cadre plein autour de ses trois membres', await cadre(A, o.G))
// A2. Un clic ailleurs, puis un clic sur l'un : les trois
await clic(A, 1000, 300)
ok((await sel(A)).length === 0, 'A2) Un clic dans le vide : plus rien', await sel(A))
await clic(A, 275, 250)
ok(meme(await sel(A), o.G), '   … un clic sur un trait du groupe : les trois', await sel(A))
// A3. Glisser : les trois bougent, une étape
const avant = await Promise.all([...o.G, o.X].map(id => forme(A, id)))
n0 = await pile(A)
await glisser(A, 275, 250, 335, 290)
const apres = await Promise.all([...o.G, o.X].map(id => forme(A, id)))
ok(apres.slice(0, 3).every((f, i) => Math.abs(f.x - avant[i].x - 60) < 0.5 && Math.abs(f.y - avant[i].y - 40) < 0.5) && apres[3].x === avant[3].x && await pile(A) === n0 + 1,
  'A3) Glisser depuis un membre : les trois bougent ensemble (une étape), pas X', apres.map((f, i) => [f.x - avant[i].x, f.y - avant[i].y]))
ok(meme(await sel(A), o.G), '   … et le groupe reste pris', await sel(A))
// A4. Un second clic : un seul
await viderMsgs(A)
await clic(A, 410, 290)
ok(meme(await sel(A), [o.T1]), 'A4) Un second clic simple sur un membre : lui seul', await sel(A))
await A.waitForTimeout(650)
ok((await msgs(A)).includes('Un seul objet du groupe : ce que vous faites ne touche que lui.'), '   … « Un seul objet du groupe : ce que vous faites ne touche que lui. » (la première fois)', await msgs(A))
ok(await cadre(A, o.G) === 'clair', '   … la boîte du groupe en pointillé très clair', await cadre(A, o.G))
let e = await etat(A)
// Son menu, au clic droit : le sien (un trait), pas celui du groupe
await clicDroit(A, 410, 290)
e = await etat(A)
ok(e.panneau && e.label === 'Options du trait' && meme(e.sel, [o.T1]), '   … le clic droit sur ce membre pris seul : son propre menu', e)
await A.keyboard.press('Escape'); await A.waitForTimeout(80)
await clic(A, 410, 290)
await clic(A, 335, 460)
ok(meme(await sel(A), [o.T2]), '   … d\'un membre pris seul à un autre du même groupe : celui-là seul', await sel(A))
await viderMsgs(A)
await clic(A, 410, 290); await A.waitForTimeout(650)
ok(!(await msgs(A)).some(m => m.startsWith('Un seul objet du groupe')), '   … le message ne revient pas', await msgs(A))
// Glisser un membre pris seul : lui seul bouge
const t2a = await forme(A, o.T2), t1a = await forme(A, o.T1)
await glisser(A, 410, 290, 410, 330)
const t2b = await forme(A, o.T2), t1b = await forme(A, o.T1)
ok(t1b.y - t1a.y === 40 && t2b.y === t2a.y, '   … glissé, le membre pris seul bouge seul', { t1: t1b.y - t1a.y, t2: t2b.y - t2a.y })
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
await clic(A, 1000, 300)
ok((await sel(A)).length === 0, '   … un clic à côté : on en sort', await sel(A))
// A5. Le groupe ET un autre objet : un clic sur un membre garde tout
await clic(A, 410, 290)
await maj(A, 850, 450)
ok(meme(await sel(A), [...o.G, o.X]), 'A5) Le groupe, puis Maj + clic sur X : quatre objets', await sel(A))
await clic(A, 410, 290)
ok(meme(await sel(A), [...o.G, o.X]), '   … un clic sur un membre ne réduit pas cette sélection', await sel(A))
await maj(A, 335, 460)
ok(meme(await sel(A), [o.X]), '   … Maj + clic sur un membre en retire tout le groupe', await sel(A))
await maj(A, 335, 460)
ok(meme(await sel(A), [...o.G, o.X]), '   … et Maj + clic l\'y remet en entier', await sel(A))
// A6. Ctrl + Maj + G ; Ctrl + Z, Ctrl + Y
await clic(A, 1000, 300); await clic(A, 410, 290)
await viderMsgs(A)
n0 = await pile(A)
await A.keyboard.press('Control+Shift+G'); await A.waitForTimeout(150)
g = await groupes(A, o.G)
f1 = await derniereEtape(A)
ok(g.every(x => x === null) && await dernier(A) === 'Dégroupé' && meme(await sel(A), o.G) && f1.reglage === true && await pile(A) === n0 + 1,
  'A6) Ctrl + Maj + G : plus de groupe (la clé est partie), « Dégroupé », les mêmes objets restent pris, une étape « réglage »', { g, m: await msgs(A), sel: await sel(A), f1 })
await A.keyboard.press('Control+z'); await A.waitForTimeout(120)
ok((await groupes(A, o.G)).every(x => x === G0), '   … Ctrl + Z : le groupe revient, d\'un coup', await groupes(A, o.G))
await A.keyboard.press('Control+y'); await A.waitForTimeout(120)
ok((await groupes(A, o.G)).every(x => x === null), '   … Ctrl + Y : dégroupé de nouveau', await groupes(A, o.G))
await A.keyboard.press('Control+z'); await A.waitForTimeout(120)
// Ctrl + Z juste après un groupement le défait d'un coup
await vider(A)
await clic(A, 850, 450); await maj(A, 790, 225)
await A.keyboard.press('Control+g'); await A.waitForTimeout(120)
const GXF = (await groupes(A, [o.X, o.F]))[0]
await A.keyboard.press('Control+z'); await A.waitForTimeout(120)
ok(GXF && (await groupes(A, [o.X, o.F])).every(x => x === null) && (await groupes(A, o.G)).every(x => x === G0), '   … grouper X et F, puis Ctrl + Z : le groupement est défait d\'un coup, l\'autre groupe reste', { GXF, apres: await groupes(A, [o.X, o.F]) })
// A7. La lettre par e.key ; Ctrl + G toujours empêché
await vider(A)
await clic(A, 850, 450); await maj(A, 790, 225)
await A.evaluate(() => { window.__g = [] })
await toucheA('g', 'KeyU', 2)
const GXF2 = await groupes(A, [o.X, o.F])
ok(GXF2[0] && GXF2[0] === GXF2[1], 'A7) La lettre lue par e.key : Ctrl + « g » d\'une touche dont e.code est KeyU groupe', GXF2)
await toucheA('g', 'KeyU', 2 | 8)
ok((await groupes(A, [o.X, o.F])).every(x => x === null), '   … et Ctrl + Maj + « g » dégroupe', await groupes(A, [o.X, o.F]))
await toucheA('i', 'KeyG', 2)
ok((await groupes(A, [o.X, o.F])).every(x => x === null), '   … la touche de code KeyG qui donne « i » ne groupe rien', await groupes(A, [o.X, o.F]))
await vider(A); await viderMsgs(A)
await A.keyboard.press('Control+g'); await A.waitForTimeout(100)
const rienG = await dernier(A)
await A.keyboard.press('Control+Shift+G'); await A.waitForTimeout(100)
const rienD = await dernier(A)
ok(rienG === 'Sélectionnez au moins deux objets pour les grouper.' && rienD === 'Aucun groupe dans la sélection.', '   … sans rien de choisi : « Sélectionnez au moins deux objets pour les grouper. », « Aucun groupe dans la sélection. »', { rienG, rienD })
const empeches = await A.evaluate(() => window.__g.slice())
ok(empeches.length >= 4 && empeches.every(Boolean), '   … Ctrl + G et Ctrl + Maj + G toujours empêchés (la recherche du navigateur ne s\'ouvre jamais), même sans rien à faire', empeches)
await clic(A, 410, 290)
await A.keyboard.press('Control+g'); await A.waitForTimeout(100)
ok(await dernier(A) === 'Ces objets sont déjà groupés.' && (await groupes(A, o.G)).every(x => x === G0), '   … Ctrl + G sur un groupe déjà pris : « Ces objets sont déjà groupés. », rien ne change', await msgs(A))
// A8. Double-clic sur une formule groupée : son éditeur ; sur un trait groupé : le menu du groupe
await vider(A)
await clic(A, 850, 450); await maj(A, 790, 225)
await A.keyboard.press('Control+g'); await A.waitForTimeout(120)
await vider(A)
let s = await ecran(A, 790, 225)
await A.mouse.dblclick(s.x, s.y); await A.waitForTimeout(250)
e = await etat(A)
ok(e.editeur && meme(e.sel, [o.F]), 'A8) Double-clic sur une formule groupée : son éditeur, la formule prise seule', e)
await A.click('dialog.dialogue-formule[open] .actions .secondaire'); await A.waitForTimeout(200)
ok(!(await etat(A)).editeur && (await groupes(A, [o.F]))[0], '   … « Annuler » le ferme ; la formule est toujours groupée', await etat(A))
await vider(A)
s = await ecran(A, 850, 450)
await A.mouse.dblclick(s.x, s.y); await A.waitForTimeout(250)
e = await etat(A)
ok(e.panneau && e.label === 'Options du groupe de 2 objets' && e.titre === 'Groupe · 2 objets' && meme(e.sel, [o.X, o.F]), '   … sur un trait groupé : le menu du groupe, « Groupe · 2 objets »', e)
const iCouleur = e.boutons.findIndex(b => b.startsWith('Couleur')), iDeg = e.boutons.indexOf('Dégrouper')
ok(iDeg === iCouleur + 1 && iCouleur >= 0, '   … « Dégrouper » juste après « Couleur, épaisseur »', e.boutons)
const titreDeg = await A.evaluate(() => document.querySelector('.panneau-forme [data-action="degrouper"]')?.title)
ok(titreDeg === 'Dégrouper (Ctrl + Maj + G)', '   … son titre : « Dégrouper (Ctrl + Maj + G) »', titreDeg)
await A.click('.panneau-forme [data-action="degrouper"]'); await A.waitForTimeout(150)
e = await etat(A)
ok((await groupes(A, [o.X, o.F])).every(x => x === null) && e.panneau && e.titre === '2 objets' && e.boutons.includes('Grouper'), '   … « Dégrouper », touché : le menu reste, « 2 objets », avec « Grouper »', e)
const titreGr = await A.evaluate(() => document.querySelector('.panneau-forme [data-action="grouper"]')?.title)
ok(titreGr === 'Grouper (Ctrl + G) : ils se prennent, se déplacent et se règlent ensemble', '   … son titre', titreGr)
await A.click('.panneau-forme [data-action="grouper"]'); await A.waitForTimeout(150)
e = await etat(A)
ok((await groupes(A, [o.X, o.F]))[0] && e.titre === 'Groupe · 2 objets', '   … « Grouper » touché : de nouveau « Groupe · 2 objets »', e)
await A.keyboard.press('Escape'); await vider(A)
// Double-clic sur le groupe déjà pris (le second clic ne prend qu'un membre, le double-clic rend le groupe)
await clic(A, 275, 290)
s = await ecran(A, 275, 290)
await A.mouse.dblclick(s.x, s.y); await A.waitForTimeout(250)
e = await etat(A)
ok(e.panneau && e.titre === 'Groupe · 3 objets' && meme(e.sel, o.G), '   … double-clic sur un membre du groupe pris : le menu du groupe, le groupe entier pris', e)
await A.keyboard.press('Escape'); await vider(A)
// Au Stylo : le double-clic sur la formule groupée ouvre son éditeur, sans point d'encre
await A.evaluate(() => window.__app.choisirOutil('stylo'))
const nAvant = await A.evaluate(() => window.__app.formes.length)
s = await ecran(A, 790, 225)
await A.mouse.dblclick(s.x, s.y); await A.waitForTimeout(450)
e = await etat(A)
ok(e.editeur && await A.evaluate(() => window.__app.formes.length) === nAvant, '   … au Stylo, le double-clic sur la formule groupée : son éditeur, sans point d\'encre', e)
await A.click('dialog.dialogue-formule[open] .actions .secondaire'); await A.waitForTimeout(200)
await A.evaluate(() => window.__app.choisirOutil('selection')); await vider(A)
// Dégrouper un membre pris seul d'un groupe de deux : l'autre n'est plus groupé non plus
await clic(A, 850, 450); await clic(A, 850, 450)
ok(meme(await sel(A), [o.X]), '   … X pris seul dans son groupe de deux', await sel(A))
await A.keyboard.press('Control+Shift+G'); await A.waitForTimeout(150)
ok((await groupes(A, [o.X, o.F])).every(x => x === null) && meme(await sel(A), [o.X]), '   … Ctrl + Maj + G : il sort du groupe, et la formule, restée seule, n\'est plus groupée non plus', await groupes(A, [o.X, o.F]))
await A.keyboard.press('Control+z'); await A.waitForTimeout(120)
const gz = await groupes(A, [o.X, o.F])
ok(gz[0] && gz[0] === gz[1], '   … Ctrl + Z les regroupe d\'un coup', gz)
await vider(A)
// A9. Le survol éclaire tout le groupe
s = await ecran(A, 335, 460)
await A.mouse.move(s.x - 20, s.y - 30); await A.mouse.move(s.x, s.y); await A.waitForTimeout(150)
const sv = await A.evaluate(() => ({ survol: window.__app.rendu.survol, aussi: window.__app.rendu.survolAussi.slice() }))
ok(sv.survol === o.T2 && meme(sv.aussi, [o.T1, o.Tri]), 'A9) Le survol d\'un membre éclaire aussi les deux autres', sv)
await clic(A, 410, 290); await clic(A, 410, 290)
await A.mouse.move(s.x - 20, s.y - 30); await A.mouse.move(s.x, s.y); await A.waitForTimeout(150)
const sv2 = await A.evaluate(() => ({ survol: window.__app.rendu.survol, aussi: window.__app.rendu.survolAussi.slice() }))
ok(sv2.survol === o.T2 && sv2.aussi.length === 0, '   … un membre pris seul : le survol d\'un autre membre n\'éclaire que lui (un clic ne prendrait que lui)', sv2)
await clic(A, 1000, 300)
// A10. Un cadre qui ne prend qu'un membre prend tout le groupe
await glisser(A, 170, 400, 450, 500)
ok(meme(await sel(A), o.G), 'A10) Un cadre autour d\'un seul membre : tout le groupe', await sel(A))
// A11. Un membre pris seul, Maj + L : tout le groupe verrouillé
await clic(A, 1000, 300); await clic(A, 410, 290); await clic(A, 410, 290)
ok(meme(await sel(A), [o.T1]), 'A11) Un membre pris seul…', await sel(A))
await viderMsgs(A)
await A.keyboard.press('Shift+L'); await A.waitForTimeout(150)
const verrous = await A.evaluate(ids => ids.map(id => window.__app.forme(id).verrou ?? null), o.G)
ok(verrous.every(v => v === true) && await dernier(A) === '3 objets verrouillés. Clic droit dessus pour le déverrouiller.', '   … Maj + L : tout le groupe est verrouillé, « 3 objets verrouillés. … »', { verrous, m: await msgs(A) })
await clic(A, 335, 460)
ok((await sel(A)).length === 0, '   … un clic n\'en prend plus rien', await sel(A))
await A.waitForTimeout(1600)
await clicDroit(A, 335, 460)
e = await etat(A)
ok(e.panneau && e.titre === 'Verrouillés · 3 objets' && meme(e.sel, o.G) && !e.barre, '   … le clic droit sur un membre : le menu court des trois', e)
await A.click('.panneau-forme [data-action="deverrouiller"]'); await A.waitForTimeout(150)
ok((await A.evaluate(ids => ids.map(id => 'verrou' in window.__app.forme(id)), o.G)).every(v => !v) && meme(await sel(A), o.G) && (await groupes(A, o.G)).every(x => x === G0),
  '   … « Déverrouiller » : les trois libres, pris, toujours groupés', await sel(A))
// A12. La couleur du menu commun : à tous, une étape
await clicDroit(A, 410, 290)
n0 = await pile(A)
await A.locator('.panneau-forme .ligne button', { hasText: 'Couleur, épaisseur' }).click(); await A.waitForTimeout(120)
await A.click('.panneau-forme .section .pastille[aria-label="Rouge"]'); await A.waitForTimeout(150)
const couleurs = await A.evaluate(ids => ids.map(id => window.__app.forme(id).couleur), o.G)
ok(couleurs.every(c => c === '#d0342c') && await pile(A) === n0 + 1, 'A12) La couleur, au menu du groupe : aux trois, en une étape', couleurs)
await A.keyboard.press('Escape'); await vider(A)
// A13. Transformer un membre pris seul : l'image n'est d'aucun groupe
await clic(A, 410, 290)
const img = await A.evaluate(id => { const a = window.__app; a.transformer(a.forme(id), { type: 'symetrie-centrale', c: { x: 700, y: 520 } }); const s = [...a.selection]; return s.length === 1 ? JSON.parse(JSON.stringify(a.forme(s[0]))) : null }, o.Tri)
ok(img && img.type === 'polygone' && !('groupe' in img) && meme(await sel(A), [img.id]), 'A13) Le symétrique d\'un membre : un objet neuf, d\'aucun groupe', img && { id: img.id, groupe: img.groupe })
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
// A14. La gomme au trait entier n'efface que le membre touché
await A.evaluate(() => window.__app.choisirOutil('gomme'))
await glisser(A, 300, 455, 320, 465)
const restent = await A.evaluate(ids => ids.map(id => !!window.__app.forme(id)), o.G)
ok(JSON.stringify(restent) === JSON.stringify([true, true, false]), 'A14) La gomme sur un membre : lui seul s\'efface', restent)
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
await A.evaluate(() => window.__app.choisirOutil('selection'))
// A15. Suppr sur le groupe pris : les trois, une étape
await clic(A, 410, 290)
n0 = await pile(A)
await A.keyboard.press('Delete'); await A.waitForTimeout(120)
ok((await A.evaluate(ids => ids.every(id => !window.__app.forme(id)), o.G)) && await pile(A) === n0 + 1, 'A15) Suppr sur le groupe pris : ses trois membres partent, en une étape')
await A.keyboard.press('Control+z'); await A.waitForTimeout(120)
ok((await groupes(A, o.G)).every(x => x === G0), '   … Ctrl + Z les rend, groupés', await groupes(A, o.G))
// A16. Ctrl + C dans un onglet, Ctrl + V dans un autre ; Ctrl + D
await vider(A)
await clic(A, 410, 290)
await A.keyboard.press('Control+c'); await A.waitForTimeout(200)
const { p: A2 } = await ouvrirDev(ctxA, 'souris, autre onglet')
await A2.evaluate(PAGE_NEUVE)
const sous = await ecran(A2, 500, 350)
await A2.mouse.move(sous.x - 30, sous.y); await A2.mouse.move(sous.x, sous.y)
await A2.keyboard.press('Control+v'); await A2.waitForTimeout(500)
const colle = await A2.evaluate(() => { const a = window.__app; return { formes: a.formes.map(f => ({ id: f.id, groupe: f.groupe ?? null })), sel: [...a.selection] } })
const gColle = colle.formes[0]?.groupe
ok(colle.formes.length === 3 && gColle && gColle !== G0 && colle.formes.every(f => f.groupe === gColle) && colle.sel.length === 3, 'A16) Collé dans un autre onglet : un groupe neuf, commun aux trois, pris', colle)
await vider(A2)
const unColle = colle.formes.find(f => true)
const bc = await A2.evaluate(id => { const a = window.__app, b = a.rendu.boite(a.forme(id)); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } }, colle.formes[2].id)
await clic(A2, bc.x, bc.y)
const dbg = await A2.evaluate(({ x, y }) => { const a = window.__app, s = a.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { outil: a.outil, cam: [a.cam.x, a.cam.y, a.cam.z], el: document.elementFromPoint(s.x + r.left, s.y + r.top)?.className } }, bc)
ok(meme(await sel(A2), colle.formes.map(f => f.id)), '   … et il se prend en entier d\'un clic', { sel: await sel(A2), unColle, bc, dbg })
await A2.close()
await clic(A, 1000, 300); await clic(A, 410, 290)
await A.keyboard.press('Control+d'); await A.waitForTimeout(200)
const dup = await A.evaluate(ids => { const a = window.__app; return [...a.selection].map(id => ({ id, groupe: a.forme(id).groupe ?? null, neuf: !ids.includes(id) })) }, o.G)
ok(dup.length === 3 && dup.every(d => d.neuf && d.groupe && d.groupe === dup[0].groupe && d.groupe !== G0), '   … Ctrl + D : une copie du groupe, un groupe neuf, prise', dup)
await A.keyboard.press('Control+z'); await A.waitForTimeout(100)
// A17. Dupliquer la page : le même identifiant ; il se prend en entier
await vider(A)
await A.keyboard.press('Control+Shift+D'); await A.waitForTimeout(300)
const copiePage = await A.evaluate(ids => ids.map(id => window.__app.forme(id)?.groupe ?? null), o.G)
ok(copiePage.every(x => x === G0), 'A17) Dupliquer la page : les mêmes objets, le même groupe, sur la copie', copiePage)
await clic(A, 335, 460)
ok(meme(await sel(A), o.G), '   … qui se prend en entier', await sel(A))
await A.keyboard.press('Control+z'); await A.waitForTimeout(300)
// A18. Envoyer vers… (Déplacer, une nouvelle page à la fin) ; « Aller à la page N »
await vider(A)
await clicDroit(A, 410, 290)
await ouvrirPlus(A)
await A.locator('.menu-plus .menu-item', { hasText: 'Envoyer vers…' }).click()
await A.waitForSelector('dialog.dialogue-envoi[open]')
await A.click('dialog.dialogue-envoi[open] .destination[data-cible="fin"]'); await A.waitForTimeout(400)
await A.locator('.toast button', { hasText: /^Aller à la page/ }).click(); await A.waitForTimeout(400)
const arrive = await A.evaluate(() => { const a = window.__app; return { formes: a.formes.map(f => ({ id: f.id, groupe: f.groupe ?? null })), sel: [...a.selection] } })
const gEnv = arrive.formes[0]?.groupe
ok(arrive.formes.length === 3 && gEnv && gEnv !== G0 && arrive.formes.every(f => f.groupe === gEnv) && arrive.sel.length === 3, 'A18) Envoyé vers une nouvelle page : un groupe neuf, commun aux trois ; « Aller à la page N » le prend', arrive)
await vider(A)
const be = await A.evaluate(id => { const a = window.__app, b = a.rendu.boite(a.forme(id)); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } }, arrive.formes[0].id)
await clic(A, be.x, be.y)
ok(meme(await sel(A), arrive.formes.map(f => f.id)), '   … et s\'y prend en entier', await sel(A))
await ctxA.close()

// =====================================================================
console.log('=== B. à 1024 px : le menu commun sur une ligne ===')
const ctxB = await contexte({ viewport: { width: 1024, height: 768 } })
const { p: B } = await ouvrirDev(ctxB, '1024')
o = await scene(B)
await glisser(B, 170, 170, 680, 470)
await clicDroit(B, 275, 250)
const LIGNE = () => {
  const pn = document.querySelector('.panneau-forme'), l = pn.querySelector('.ligne')
  const r = pn.getBoundingClientRect()
  return { une: l.getBoundingClientRect().height <= 44, hauteur: Math.round(l.getBoundingClientRect().height), largeur: Math.round(r.width), droite: Math.round(r.right), titre: l.querySelector('.titre-selection')?.textContent, boutons: [...l.querySelectorAll('button')].map(b => b.textContent || b.getAttribute('aria-label')) }
}
let lg = await B.evaluate(LIGNE)
ok(lg.une && lg.largeur <= 820 && lg.droite <= 1024 && lg.boutons[0] === 'Couleur, épaisseur' && lg.boutons[1] === 'Grouper', 'B1) Trois objets (traits et figure) à 1024 px : la rangée, avec « Grouper » juste après « Couleur, épaisseur », tient sur une ligne', lg)
await B.click('.panneau-forme [data-action="grouper"]'); await B.waitForTimeout(150)
lg = await B.evaluate(LIGNE)
ok(lg.une && lg.largeur <= 820 && lg.droite <= 1024 && lg.titre === 'Groupe · 3 objets' && lg.boutons[1] === 'Dégrouper', '   … groupés : « Groupe · 3 objets », « Dégrouper », toujours sur une ligne', lg)
await ctxB.close()
// Au téléphone, elle passe à la ligne sur toute la largeur, sans sortir de l'écran
const ctxT = await contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const { p: T } = await ouvrirDev(ctxT, 'téléphone')
await T.evaluate(PAGE_NEUVE)
const tA = await poser(T, trait(40, 300, 100)), tB = await poser(T, trait(40, 360, 100)), tC = await poser(T, triangle(40, 380))
await grouper(T, [tA, tB, tC])
await T.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.ouvrirOptionsSelection() }, [tA, tB, tC])
await T.waitForTimeout(200)
const tel = await T.evaluate(() => { const r = document.querySelector('.panneau-forme').getBoundingClientRect(); return { gauche: Math.round(r.left), droite: Math.round(r.right), l: innerWidth, titre: document.querySelector('.panneau-forme .titre-selection')?.textContent } })
ok(tel.gauche >= 0 && tel.droite <= tel.l && tel.titre === 'Groupe · 3 objets', '   … au téléphone (390 px) : le menu du groupe reste dans l\'écran', tel)
await ctxT.close()

// =====================================================================
console.log('=== C. sur un Mac simulé ===')
const ctxM = await contexte({}, true)
const { p: M } = await ouvrirDev(ctxM, 'mac')
o = await scene(M)
await glisser(M, 170, 170, 680, 470)
await M.evaluate(() => { window.__g = [] })
await M.keyboard.press('Meta+g'); await M.waitForTimeout(150)
g = await groupes(M, o.G)
ok(g[0] && g.every(x => x === g[0]), 'C1) ⌘ + G groupe', g)
await clicDroit(M, 275, 250)
const titreMac = await M.evaluate(() => document.querySelector('.panneau-forme [data-action="degrouper"]')?.title)
ok(titreMac === 'Dégrouper (⌘ + Maj + G)', '   … le titre dit « ⌘ + Maj + G »', titreMac)
await M.keyboard.press('Escape')
await clic(M, 275, 250)
await M.keyboard.press('Meta+Shift+G'); await M.waitForTimeout(150)
ok((await groupes(M, o.G)).every(x => x === null), '   … ⌘ + Maj + G dégroupe', await groupes(M, o.G))
const empM = await M.evaluate(() => window.__g.slice())
ok(empM.length === 2 && empM.every(Boolean), '   … tous deux empêchés (⌘ + G : « suivant » de la recherche)', empM)
await ctxM.close()

// =====================================================================
console.log('=== D. au stylet d\'une tablette graphique ===')
const ctxD = await contexte()
const { p: P, stylet } = await ouvrirDev(ctxD, 'stylet')
ok(await P.evaluate(() => navigator.maxTouchPoints) === 0, 'D0) Pas d\'écran tactile (navigator.maxTouchPoints = 0)')
o = await scene(P)
await grouper(P, o.G)
s = await ecran(P, 275, 250)
await stylet.survol(s.x, s.y); await stylet.bas(s.x, s.y); await attendre(50); await stylet.haut(s.x, s.y); await P.waitForTimeout(150)
ok(meme(await sel(P), o.G), 'D1) Un appui du stylet sur un membre : le groupe', await sel(P))
await vider(P)
s = await ecran(P, 335, 420)
await stylet.bouton(s.x, s.y)
e = await etat(P)
ok(e.panneau && e.label === 'Options du groupe de 3 objets' && meme(e.sel, o.G), 'D2) Le bouton du stylet sur un membre : le menu du groupe', e)
await P.keyboard.press('Escape'); await vider(P)
// Un lasso autour du seul trait du bas
const tour = [], c0 = await ecran(P, 275, 420)
for (let k = 0; k <= 36; k++) { const a = k / 36 * 2 * Math.PI; tour.push([c0.x + 110 * Math.cos(a), c0.y + 30 * Math.sin(a)]) }
await stylet.survol(...tour[0]); await stylet.bas(...tour[0])
for (const q of tour.slice(1)) { await stylet.va(...q); await attendre(8) }
await stylet.haut(...tour.at(-1)); await P.waitForTimeout(150)
ok(meme(await sel(P), o.G), 'D3) Un lasso au stylet autour d\'un seul membre : tout le groupe', await sel(P))
await ctxD.close()

// =====================================================================
console.log('=== E. au doigt ===')
const ctxE = await contexte({ hasTouch: true })
const { p: E, doigt } = await ouvrirDev(ctxE, 'doigt')
o = await scene(E)
await grouper(E, o.G)
const toucher = async (x, y, ms = 50) => { const t = await ecran(E, x, y); await doigt('touchStart', [[t.x, t.y]]); await attendre(ms); await doigt('touchEnd', []); await E.waitForTimeout(80) }
await toucher(275, 250)
ok(meme(await sel(E), o.G), 'E1) Un toucher sur un membre : le groupe', await sel(E))
await E.waitForTimeout(400)
await toucher(275, 250)
ok(meme(await sel(E), [o.T1]), '   … un second toucher, après 300 ms : ce membre seul', await sel(E))
await E.waitForTimeout(700)
ok((await msgs(E)).includes('Un seul objet du groupe : ce que vous faites ne touche que lui.'), '   … avec son message', await msgs(E))
await toucher(1000, 300); await E.waitForTimeout(400)
// Le double appui : le menu du groupe
await toucher(275, 250); await attendre(60); await toucher(275, 250); await E.waitForTimeout(200)
e = await etat(E)
ok(e.panneau && e.titre === 'Groupe · 3 objets' && meme(e.sel, o.G), 'E2) Un double appui sur un membre : le menu du groupe', e)
await E.keyboard.press('Escape'); await vider(E); await E.waitForTimeout(400)
// L'appui long : le menu du groupe
await toucher(335, 420, 750); await E.waitForTimeout(150)
e = await etat(E)
ok(e.panneau && e.titre === 'Groupe · 3 objets' && meme(e.sel, o.G), 'E3) L\'appui long sur un membre : le menu du groupe', e)
await E.keyboard.press('Escape'); await vider(E); await E.waitForTimeout(400)
// Le mode Ajouter : X, puis un membre ajoute tout le groupe
await toucher(850, 450); await E.waitForTimeout(450)
await E.locator('.barre-actions .action-ajouter').tap(); await E.waitForTimeout(150)
await toucher(275, 250); await E.waitForTimeout(150)
ok(meme(await sel(E), [o.X, ...o.G]), 'E4) Le mode Ajouter : toucher un membre ajoute tout le groupe', await sel(E))
await E.waitForTimeout(400)
await toucher(335, 420); await E.waitForTimeout(150)
ok(meme(await sel(E), [o.X]), '   … et le retire en entier', await sel(E))
// Le doigt qui déplace, sous le Stylo : un toucher prend le groupe, un second un membre
await vider(E)
await E.evaluate(() => { window.__app.choisirDoigt('deplace'); window.__app.choisirOutil('stylo') })
await E.waitForTimeout(400)
await toucher(275, 250)
ok(meme(await sel(E), o.G), 'E5) Le doigt qui déplace (outil Stylo) : un toucher prend le groupe', await sel(E))
await E.waitForTimeout(400)
await toucher(275, 250)
ok(meme(await sel(E), [o.T1]), '   … un second toucher, après 300 ms : le membre seul', await sel(E))
await E.evaluate(() => window.__app.choisirDoigt('auto'))
await ctxE.close()

// =====================================================================
console.log('=== F. ce qui survit : .memc, revue, film élève ===')
const ctxF = await contexte()
const { p: Fp } = await ouvrirDev(ctxF, 'survie')
await Fp.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
const avancer = ms => Fp.evaluate(ms => { window.__dec += ms }, ms)
await avancer(30 * 60_000)
await Fp.evaluate(PAGE_NEUVE)
await avancer(3000)
const ids = []
for (const [x, y] of [[200, 250], [200, 330], [200, 410]]) { ids.push(await poser(Fp, trait(x, y, 150))); await avancer(3000) }
const ouvrirRevue = async () => {
  await Fp.click('button[title^="Revoir la construction"]'); await Fp.waitForTimeout(500)
  const total = await Fp.evaluate(() => window.__revue?.bande?.total ?? null)
  await Fp.keyboard.press('End'); await Fp.waitForTimeout(500)
  for (let i = 0; i < 4 && await Fp.evaluate(() => window.__app.enLecture); i++) { await Fp.keyboard.press('Escape'); await Fp.waitForTimeout(150) }
  return total
}
const film = async () => Fp.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const t = window.__app.tableau
  const s = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const f = ex.exporter(t, { de: s.de, a: s.a, pages: [window.__app.page], titre: 'Lot 5, groupes' })
  return { texte: await fo.ecrireFilm(f), etapes: f.etapes.length }
})
const r1 = await ouvrirRevue(), fi1 = await film()
await grouper(Fp, ids)
await avancer(3000)
const r2 = await ouvrirRevue(), fi2 = await film()
ok(r1 !== null && r2 === r1 && fi2.etapes === fi1.etapes, 'F1) Grouper ne fait pas de geste de plus : ni dans la revue, ni dans le film élève', { r1, r2, f1: fi1.etapes, f2: fi2.etapes })
const groupesFilm = JSON.parse(fi2.texte)
writeFileSync(D + '/groupes.mem', fi2.texte)
const Lc = await ctxF.newPage(); suivre(Lc, 'lecteur')
await Lc.goto(DEV + 'revoir.html')
await Lc.locator('input[type=file]').setInputFiles({ name: 'groupes.mem', mimeType: 'application/json', buffer: Buffer.from(fi2.texte) })
await Lc.waitForTimeout(1500)
await Lc.keyboard.press('End'); await Lc.waitForTimeout(800)
ok(groupesFilm.v === 1, '   … le film élève reste en version 1, et le lecteur le lit sans erreur', { v: groupesFilm.v })
await Lc.close()
// Le .memc enregistré puis rouvert
const memc = await Fp.evaluate(async () => {
  const { ecrireTableau } = await import('/src/fichier.ts')
  const o = new Uint8Array(await ecrireTableau(window.__app.tableau.doc).arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode.apply(null, o.subarray(i, i + 0x8000))
  return btoa(s)
})
const gF = (await groupes(Fp, ids))[0]
const CHEMIN = D + '/Groupes lot 5.memc'
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
  const a = window.__app, t = a.tableau
  for (const p of t.ordre.toArray()) if ([...(t.formesDe(p)?.values() ?? [])].some(f => ids.includes(f.id))) { a.allerPage(p); break }
  a.choisirOutil('selection')
  return ids.map(id => a.forme(id)?.groupe ?? null)
}, ids)
ok(gF && rouvert.every(x => x === gF), 'F2) Le .memc enregistré puis rouvert : le groupe y est', { gF, rouvert })
await O.waitForTimeout(200)
const bo = await O.evaluate(id => { const a = window.__app, b = a.rendu.boite(a.forme(id)); return { x: b.x + b.l / 2, y: b.y + b.h / 2 } }, ids[1])
await clic(O, bo.x, bo.y)
ok(meme(await sel(O), ids), '   … et il se prend en entier', await sel(O))
await ctxO.close()
await ctxF.close()

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
