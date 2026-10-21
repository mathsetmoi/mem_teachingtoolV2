// Essai : les corrections de la vérification « appareils » du lot 5.
// A. Le menu ⋯ de la barre du haut au poste de la classe (une fenêtre de
//    Chrome sur un écran de 768 px : 1366 × 657, 1280 × 720, 1024 × 768 avec
//    les noms sous les outils, 1366 × 768) et le menu de la page allongé par
//    le lot 5 (1366 × 615) : aucune entrée tassée (son contenu ne déborde
//    pas de sa boîte), un clic au bas de l'aide d'une entrée la touche ELLE ;
//    plus long que la place, le menu défile, sous son bouton, et sa dernière
//    entrée s'atteint. Sur un grand écran (1920 × 969), il tient sans défiler.
// B. Alt + ← / →, Ctrl + G, Ctrl + Maj + G (PC) et ⌘ + ← / →, ⌘ + G (Mac)
//    empêchés dans la revue en classe, la trieuse, la bibliothèque (le
//    réglage du flash d'automatismes, une fenêtre, s'ouvre aussi), comme à l’écran ; pas dans un champ (le nom
//    d'une page dans la trieuse : Ctrl + ← y va de mot en mot) ; la trieuse
//    déplace toujours une page par Ctrl + Maj + → ; la revue avance
//    toujours à la flèche seule.
// C. Le cadenas d'une image tournée de 30° (et d'une formule tournée) au
//    coin de l'objet le plus en haut à droite, sur lui, et non au coin de la
//    boîte droite qui l'englobe (dans le vide) ; avec son cadre gris (le
//    menu de l'objet ouvert), le cadre est tourné avec l'objet ; une image
//    droite garde son cadenas au coin haut droit, comme avant.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/corrections-appareils'
const DEV = 'http://localhost:5173/'
mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 600) : '')
const attendre = ms => new Promise(r => setTimeout(r, ms))
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
/** Un contexte ; fichiers : garder les choix de fichiers du navigateur (le
 *  menu ⋯ a alors son entrée « Enregistrer automatiquement dans un
 *  fichier… », comme dans Chrome au poste de la classe : le plus long) */
async function contexte(o = {}, init, fichiers = false) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  if (!fichiers) await c.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
  if (init) await c.addInitScript(init)
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
async function ouvrir(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => document.fonts?.ready)
  await p.waitForTimeout(600)
  await p.evaluate(() => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, ...r) => { window.__msgs.push(t); return m(t, ...r) }
  })
  return p
}
/** Une page neuve, l'outil Sélection, la vue à 100 % */
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage(); a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = 'E' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
const VERT = () => {
  const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d')
  g.fillStyle = '#00c000'; g.fillRect(0, 0, 60, 40)
  window.__app.tableau.doc.getMap('images').set('e-vert', cv.toDataURL('image/png'))
}
const image = (x, y, l, h, angle = 0) => {
  const c = Math.cos(angle), s = Math.sin(angle), kx = l / 60, ky = h / 40
  return { type: 'image', src: 'e-vert', x, y, l: 60, h: 40, m: [kx * c, kx * s, -ky * s, ky * c] }
}
const trait = (x, y, l) => { const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5); return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }

// ---------- A. Les menus tassés ----------
/** Le menu ouvert : sa boîte, s'il défile, et chaque entrée (sa hauteur, de
 *  combien son contenu dépasse sa boîte, ce que touche un clic au bas de son
 *  aide, une fois l'entrée amenée dans la vue du menu) */
const MESURER = async () => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(m => !m.hidden && m.offsetWidth)
  if (!m) return null
  const bm = m.getBoundingClientRect()
  const bouton = document.querySelector('button[aria-expanded=true]')?.getBoundingClientRect()
  const r = []
  for (const i of [...m.querySelectorAll('.menu-item')].filter(i => i.offsetWidth)) {
    i.scrollIntoView({ block: 'nearest' })
    await new Promise(requestAnimationFrame)
    const ib = i.getBoundingClientRect()
    let bas = ib.top
    for (const c of i.querySelectorAll('*')) { const cb = c.getBoundingClientRect(); if (cb.height) bas = Math.max(bas, cb.bottom) }
    const y = Math.min(bas - 3, ib.bottom - 1), x = ib.left + 60
    const touche = document.elementFromPoint(x, y)?.closest('.menu-item')
    r.push({ t: (i.querySelector('.libelle')?.textContent || i.textContent).trim().slice(0, 30), h: Math.round(ib.height), deborde: Math.round(bas - ib.bottom), elle: touche === i, dansLeMenu: ib.top >= bm.top - 0.5 && ib.bottom <= bm.bottom + 0.5 })
  }
  m.scrollTop = 0
  return { haut: Math.round(bm.top), bas: Math.round(bm.bottom), fenetre: innerHeight, sousLeBouton: !bouton || bm.top >= bouton.bottom - 0.5, defile: m.scrollHeight > m.clientHeight + 1, entrees: r }
}
async function menuFichier(p) {
  await p.evaluate(() => window.__app.ui.boutonFichier.click())
  await attendre(400)
  return p.evaluate(MESURER)
}
for (const [l, h, noms] of [[1366, 657, false], [1280, 720, false], [1366, 625, false], [1024, 768, true], [1366, 768, true], [1366, 768, false], [1920, 969, false]]) {
  const quoi = `${l} × ${h}${noms ? ', noms sous les outils' : ''}`
  const ctx = await contexte({ viewport: { width: l, height: h } }, noms ? () => localStorage.setItem('mem-noms-outils', '1') : undefined, true)
  const p = await ouvrir(ctx, 'menu ' + quoi)
  const r = await menuFichier(p)
  const tassees = r.entrees.filter(e => e.deborde > 1)
  const ailleurs = r.entrees.filter(e => !e.elle)
  ok(r.entrees.length >= 8 && r.entrees.some(e => /^Enregistrer automatiquement/.test(e.t)) && r.entrees.some(e => /^Noms sous les outils/.test(e.t)) && !tassees.length, `A1) ${quoi} : le menu ⋯ (${r.entrees.length} entrées) n'a aucune entrée tassée (le contenu de chacune tient dans sa boîte)`, { tassees, r })
  ok(!ailleurs.length, `A2) ${quoi} : un clic au bas de l'aide d'une entrée la touche elle, jamais la suivante`, { ailleurs })
  ok(r.sousLeBouton && r.bas <= h - 6, `A3) ${quoi} : le menu ⋯ reste sous son bouton, dans la fenêtre${r.defile ? ' ; plus long que la place, il défile' : ''}`, r)
  ok(r.entrees.every(e => e.dansLeMenu), `A4) ${quoi} : chaque entrée s'atteint (amenée dans la vue du menu, elle y est entière), « Noms sous les outils » comprise`, r.entrees.filter(e => !e.dansLeMenu))
  if (l === 1920) ok(!r.defile, 'A5) 1920 × 969 : le menu ⋯ tient sans défiler', r)
  if (l === 1366 && h === 657) {
    ok(r.defile, 'A5) 1366 × 657 : le menu ⋯ défile (il ne se tasse plus)', r)
    await p.screenshot({ path: `${D}/menu-fichier-1366x657.png` })
  }
  note(quoi, { haut: r.haut, bas: r.bas, defile: r.defile, entrees: r.entrees.map(e => `${e.t.slice(0, 18)} (${e.h})`) })
  await ctx.close()
}
// Le menu de la page, allongé au lot 5 (Détacher, Copier ou Envoyer l'image du fond, Déverrouiller tout)
for (const [l, h] of [[1366, 615], [1366, 657]]) {
  const ctx = await contexte({ viewport: { width: l, height: h } })
  const p = await ouvrir(ctx, 'menu de la page')
  await p.evaluate(PAGE_NEUVE); await p.evaluate(VERT)
  const I = await p.evaluate(POSER, image(200, 150, 160, 100))
  await p.evaluate(id => window.__app.fixerEnFond([id]), I)
  const T = await p.evaluate(POSER, trait(260, 350, 120))
  await p.evaluate(id => window.__app.verrouiller(true, [id]), T)
  await attendre(200)
  await p.mouse.click(900, 400, { button: 'right' }); await attendre(400)
  const r = await p.evaluate(MESURER)
  const tassees = r.entrees.filter(e => e.deborde > 1)
  ok(r.entrees.some(e => /Détacher l'image du fond/.test(e.t)) && r.entrees.some(e => /Déverrouiller tout/.test(e.t)), `A6) ${l} × ${h} : le menu de la page a ses entrées du lot 5`, r.entrees.map(e => e.t))
  ok(!tassees.length && r.entrees.every(e => e.elle), `A7) ${l} × ${h} : le menu de la page n'a aucune entrée tassée, un clic au bas d'une aide la touche elle`, { tassees, r })
  ok(r.haut >= 0 && r.bas <= h && r.entrees.every(e => e.dansLeMenu), `A8) ${l} × ${h} : le menu de la page dans la fenêtre${r.defile ? ' (il défile)' : ''}, chaque entrée s'atteint`, r)
  if (l === 1366 && h === 615) await p.screenshot({ path: `${D}/menu-page-1366x615.png` })
  await ctx.close()
}

// ---------- B. Les touches qui quitteraient MEM ----------
async function touche(cdp, key, mods) {
  const vk = { ArrowLeft: 37, ArrowRight: 39, g: 71, G: 71 }[key]
  const code = /^g$/i.test(key) ? 'KeyG' : key
  await cdp.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, modifiers: mods })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk, modifiers: mods })
  await attendre(150)
}
/** Une touche, et ce qu'en a vu un écouteur en capture posé tôt : relu après la tâche (defaultPrevented) */
async function empechee(p, cdp, key, mods) {
  await p.evaluate(() => { window.__t = [] })
  await touche(cdp, key, mods)
  const t = await p.evaluate(() => window.__t)
  return t.at(-1)?.p
}
const ALT = 1, CTRL = 2, META = 4, MAJ = 8
for (const mac of [false, true]) {
  const ctx = await contexte({}, mac ? () => Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) : undefined)
  const p0 = await ctx.newPage(); await p0.goto('about:blank'); await p0.close()
  const p = await ouvrir(ctx, mac ? 'mac' : 'pc')
  const cdp = await ctx.newCDPSession(p)
  await p.evaluate(PAGE_NEUVE)
  for (let i = 0; i < 4; i++) await p.evaluate(POSER, trait(200 + i * 40, 300, 30))
  await p.evaluate(() => { window.__t = []; window.addEventListener('keydown', e => { setTimeout(() => window.__t.push({ k: e.key, p: e.defaultPrevented }), 0) }, true) })
  const M = mac ? META : CTRL, Q = mac ? META : ALT
  const nomM = mac ? '⌘' : 'Ctrl', nomQ = mac ? '⌘' : 'Alt'
  const essais = [['ArrowLeft', Q, `${nomQ} + ←`], ['ArrowRight', Q, `${nomQ} + →`], ['g', M, `${nomM} + G`], ['G', M | MAJ, `${nomM} + Maj + G`]]
  if (!mac) essais.push(['ArrowLeft', META, '⌘ (Windows) + ←'])
  const ecran = async quoi => { for (const [k, m, nom] of essais) ok(await empechee(p, cdp, k, m) === true, `B) ${mac ? 'Mac' : 'PC'} — ${quoi} : ${nom} empêché`) }
  await ecran('à l’écran')
  // La revue en classe ; la flèche seule y avance toujours
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^Revoir la construction/.test(b.title)); b.click() })
  await attendre(1200)
  ok(await p.evaluate(() => window.__app.enLecture), `B) ${mac ? 'Mac' : 'PC'} — la revue est ouverte`)
  await ecran('dans la revue en classe')
  {
    const avant = await p.evaluate(() => document.querySelector('.revue-compte, .revue-pas, [class*="revue"] [aria-live]')?.textContent ?? '')
    const pe = await empechee(p, cdp, 'ArrowRight', 0)
    const apres = await p.evaluate(() => document.querySelector('.revue-compte, .revue-pas, [class*="revue"] [aria-live]')?.textContent ?? '')
    ok(pe === true, `B) ${mac ? 'Mac' : 'PC'} — dans la revue, → seule reste à la revue (elle l'empêche et avance)`, { avant, apres })
  }
  await p.keyboard.press('Escape'); await attendre(600)
  ok(!(await p.evaluate(() => window.__app.enLecture)), `B) ${mac ? 'Mac' : 'PC'} — la revue est refermée`)
  // La trieuse ; Ctrl + Maj + → y déplace toujours une page ; dans le champ du nom, rien n'est empêché
  await p.keyboard.press('Shift+P'); await attendre(900)
  ok(await p.evaluate(() => document.body.classList.contains('en-trieuse')), `B) ${mac ? 'Mac' : 'PC'} — la trieuse est ouverte`)
  await ecran('dans la trieuse')
  {
    // La page qui a le focus en ouvrant : celle qu'on regardait (la dernière, neuve)
    const ordre = () => p.evaluate(() => [...document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')].map(c => c.dataset.page))
    const o1 = await ordre()
    await touche(cdp, 'ArrowLeft', M | MAJ); await attendre(300)
    const o2 = await ordre()
    ok(o1.length === 2 && o2[0] === o1[1] && o2[1] === o1[0], `B) ${mac ? 'Mac' : 'PC'} — dans la trieuse, ${nomM} + Maj + ← déplace toujours la page d'une place`, { o1, o2 })
    await p.keyboard.press(mac ? 'Meta+z' : 'Control+z'); await attendre(300)
    await p.evaluate(() => document.querySelector('.trieuse .carte')?.focus()); await attendre(100)
    await p.keyboard.press('F2'); await attendre(300)
    const champ = await p.evaluate(() => document.activeElement?.matches?.('input') ?? false)
    ok(champ, `B) ${mac ? 'Mac' : 'PC'} — F2 ouvre le champ du nom d'une page`)
    if (champ) {
      for (const [k, m, nom] of [['ArrowLeft', CTRL, 'Ctrl + ←'], ['ArrowLeft', mac ? META : ALT, `${mac ? '⌘' : 'Alt'} + ←`]]) {
        ok(await empechee(p, cdp, k, m) === false, `B) ${mac ? 'Mac' : 'PC'} — dans le champ du nom d'une page, ${nom} reste au champ (pas empêché)`)
      }
      await p.keyboard.press('Escape'); await attendre(300)
    }
  }
  await p.keyboard.press('Escape'); await attendre(300)
  await p.keyboard.press('Escape'); await attendre(600)
  ok(!(await p.evaluate(() => document.body.classList.contains('en-trieuse'))), `B) ${mac ? 'Mac' : 'PC'} — la trieuse est refermée`)
  // La bibliothèque
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque ? window.__app.ui.ouvrirBibliotheque() : [...document.querySelectorAll('button')].find(b => b.offsetWidth && /Bibliothèque|classeur/i.test(b.title) && b.closest('.barre-classeur'))?.click())
  await attendre(1200)
  const biblio = await p.evaluate(() => document.body.classList.contains('en-bibliotheque'))
  ok(biblio, `B) ${mac ? 'Mac' : 'PC'} — la bibliothèque est ouverte`)
  if (biblio) await ecran('dans la bibliothèque')
  await p.keyboard.press('Escape'); await attendre(800)
  // Le réglage du flash d'automatismes (avant : la séance d'automatismes)
  await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^Automatismes/.test(b.title)); b?.click() })
  await attendre(800)
  const seance = await p.evaluate(() => !!document.querySelector('dialog.dialogue-flash[open]'))
  ok(seance, `B) ${mac ? 'Mac' : 'PC'} — le réglage du flash d'automatismes est ouvert`)
  if (seance) await ecran('dans le réglage du flash d\'automatismes')
  await p.keyboard.press('Escape'); await attendre(500)
  await ctx.close()
}

// ---------- C. Le cadenas d'un objet tourné ----------
/** Les pixels du gris du cadenas (#5a6577) dans un carré de côté 2r autour de (x, y), sur une capture */
async function grisAutour(p, png, x, y, r = 14) {
  return p.evaluate(async ({ b64, x, y, r }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = Object.assign(document.createElement('canvas'), { width: img.width, height: img.height }); const g = c.getContext('2d')
    g.drawImage(img, 0, 0)
    const x0 = Math.max(0, Math.round(x - r)), y0 = Math.max(0, Math.round(y - r))
    const d = g.getImageData(x0, y0, 2 * r, 2 * r).data
    let n = 0, sx = 0, sy = 0
    for (let i = 0; i < d.length; i += 4) {
      if (Math.abs(d[i] - 0x5a) < 18 && Math.abs(d[i + 1] - 0x65) < 18 && Math.abs(d[i + 2] - 0x77) < 18) { n++; const k = i / 4; sx += x0 + (k % (2 * r)); sy += y0 + Math.floor(k / (2 * r)) }
    }
    return { n, cx: n ? sx / n : null, cy: n ? sy / n : null }
  }, { b64: png.toString('base64'), x, y, r })
}
{
  const ctx = await contexte({ viewport: { width: 1366, height: 768 } })
  const p = await ouvrir(ctx, 'cadenas')
  await p.evaluate(PAGE_NEUVE); await p.evaluate(VERT)
  const vers = (x, y) => p.evaluate(([x, y]) => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left + a.cam.x + x * a.cam.z, y: r.top + a.cam.y + y * a.cam.z } }, [x, y])
  const A = Math.PI / 6
  // Une image de 240 × 160 tournée de 30°, en (300, 150) ; une image droite, en (700, 380) ; une formule tournée de −20°, en (300, 460)
  const I = await p.evaluate(POSER, image(300, 150, 240, 160, A))
  const J = await p.evaluate(POSER, image(700, 380, 160, 100))
  const F = await p.evaluate(POSER, { type: 'formule', x: 300, y: 470, latex: '\\frac{123}{456}+x^2', couleur: '#d0342c', taille: 36, rotation: -20 * Math.PI / 180 })
  await attendre(400)
  await p.evaluate(ids => window.__app.verrouiller(true, ids), [I, J, F])
  await attendre(300)
  const c = Math.cos(A), s = Math.sin(A)
  const coinsI = [[0, 0], [240, 0], [240, 160], [0, 160]].map(([u, v]) => ({ x: 300 + u * c - v * s, y: 150 + u * s + v * c }))
  const hautDroitI = coinsI.reduce((m, q) => (q.x - q.y > m.x - m.y ? q : m))
  const boiteI = { x: Math.max(...coinsI.map(q => q.x)), y: Math.min(...coinsI.map(q => q.y)) }
  // 1. Au survol de l'image tournée (la souris, outil Sélection)
  const centreI = await vers(300 + 120 * c - 80 * s, 150 + 120 * s + 80 * c)
  await p.mouse.move(centreI.x, centreI.y); await attendre(400)
  const surI = await p.evaluate(() => window.__app.rendu.cadenas?.id)
  ok(surI === I, 'C1) au survol de l\'image tournée et verrouillée, son cadenas paraît', { surI, I })
  let png = await p.screenshot({ path: `${D}/cadenas-image-tournee.png` })
  const eI = await vers(hautDroitI.x, hautDroitI.y), eB = await vers(boiteI.x, boiteI.y)
  const gI = await grisAutour(p, png, eI.x, eI.y), gB = await grisAutour(p, png, eB.x, eB.y)
  ok(gI.n > 15 && Math.hypot(gI.cx - eI.x, gI.cy - eI.y) < 6, 'C2) le cadenas est sur le coin de l\'image tournée le plus en haut à droite', { attendu: eI, gI })
  ok(gB.n === 0, 'C3) rien au coin de la boîte droite qui l\'englobe (à plus de 100 px de l\'image)', { coinDeLaBoite: eB, gB, ecart: Math.hypot(eB.x - eI.x, eB.y - eI.y) })
  // 2. Le menu de l'image ouvert (clic droit sur elle) : son cadre gris, tourné, et le cadenas au coin du cadre
  await p.mouse.click(centreI.x, centreI.y, { button: 'right' }); await attendre(500)
  png = await p.screenshot({ path: `${D}/cadenas-image-tournee-menu.png` })
  const u = { x: c, y: s }, v = { x: -s, y: c }    // les deux côtés de l'image ; le coin (240, 0) s'écarte de 6 le long de u et de −v
  const hautDroitCadre = { x: hautDroitI.x + 6 * (u.x - v.x), y: hautDroitI.y + 6 * (u.y - v.y) }
  const eC = await vers(hautDroitCadre.x, hautDroitCadre.y)
  const gC = await grisAutour(p, png, eC.x, eC.y)
  const gB2 = await grisAutour(p, png, eB.x + 6, eB.y - 6)
  const menuOuvert = await p.evaluate(() => !!document.querySelector('.panneau-forme:not([hidden]), .menu-flottant:not([hidden])'))
  ok(menuOuvert && gC.n > 15 && Math.hypot(gC.cx - eC.x, gC.cy - eC.y) < 7, 'C4) le menu de l\'image ouvert : le cadenas au coin de son cadre gris, tourné avec elle', { menuOuvert, attendu: eC, gC })
  ok(gB2.n === 0, 'C5) ni cadre gris ni cadenas au coin de la boîte droite (le cadre est tourné avec l\'image)', { gB2 })
  // Le milieu du côté haut du cadre gris tourné (des tirets : quelques pixels gris le long du côté)
  {
    const a = { x: coinsI[0].x - 6 * u.x - 6 * v.x, y: coinsI[0].y - 6 * u.y - 6 * v.y }
    let n = 0
    for (let k = 0.25; k <= 0.75; k += 0.05) { const q = await vers(a.x + (hautDroitCadre.x - a.x) * k, a.y + (hautDroitCadre.y - a.y) * k); n += (await grisAutour(p, png, q.x, q.y, 2)).n }
    ok(n > 6, 'C6) le cadre gris longe le côté haut de l\'image tournée, à 6 px', { n })
  }
  await p.keyboard.press('Escape'); await attendre(300)
  await p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.rendu.redessinerDirect(); a.ui.maj() })
  // 3. L'image droite : au coin haut droit de sa boîte, comme avant
  const centreJ = await vers(780, 430)
  await p.mouse.move(5, 700); await attendre(300)
  await p.mouse.move(centreJ.x, centreJ.y); await attendre(400)
  png = await p.screenshot({ path: `${D}/cadenas-image-droite.png` })
  const eJ = await vers(860, 380)
  const gJ = await grisAutour(p, png, eJ.x, eJ.y)
  ok((await p.evaluate(() => window.__app.rendu.cadenas?.id)) === J && gJ.n > 15 && Math.hypot(gJ.cx - eJ.x, gJ.cy - eJ.y) < 6, 'C7) une image droite : le cadenas au coin haut droit de sa boîte, comme avant', { eJ, gJ })
  // 4. La formule tournée de −20° : au coin de son rectangle tourné le plus en haut à droite
  const fo = await p.evaluate(id => { const a = window.__app, f = a.forme(id), b = a.rendu.boiteFormule(f); return { b, r: f.rotation } }, F)
  const cf = Math.cos(fo.r), sf = Math.sin(fo.r)
  const coinsF = [[0, 0], [fo.b.l, 0], [fo.b.l, fo.b.h], [0, fo.b.h]].map(([u, v]) => ({ x: 300 + u * cf - v * sf, y: 470 + u * sf + v * cf }))
  const hautDroitF = coinsF.reduce((m, q) => (q.x - q.y > m.x - m.y ? q : m))
  const boiteF = { x: Math.max(...coinsF.map(q => q.x)), y: Math.min(...coinsF.map(q => q.y)) }
  const centreF = await vers((coinsF[0].x + coinsF[2].x) / 2, (coinsF[0].y + coinsF[2].y) / 2)
  await p.mouse.move(5, 700); await attendre(300)
  await p.mouse.move(centreF.x, centreF.y); await attendre(400)
  png = await p.screenshot({ path: `${D}/cadenas-formule-tournee.png` })
  const eF = await vers(hautDroitF.x, hautDroitF.y), eFB = await vers(boiteF.x, boiteF.y)
  const gF = await grisAutour(p, png, eF.x, eF.y)
  ok((await p.evaluate(() => window.__app.rendu.cadenas?.id)) === F && gF.n > 15 && Math.hypot(gF.cx - eF.x, gF.cy - eF.y) < 6, 'C8) une formule tournée : le cadenas au coin de son rectangle tourné le plus en haut à droite', { eF, gF, coinDeLaBoite: eFB, ecart: Math.hypot(eFB.x - eF.x, eFB.y - eF.y) })
  await ctx.close()
}

await nav.close()
ok(!erreurs.length, 'aucune erreur JS', erreurs)
console.log(echecs ? `${echecs} échec(s)` : 'tout est vert')
process.exit(echecs ? 1 : 0)
