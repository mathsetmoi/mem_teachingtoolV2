// ESSAI DU MORCEAU K10-telephone (lot 5) : la mise en page du téléphone (une
// rangée en haut, l'essentiel en bas, le reste dans « Plus » ; src/ui.ts,
// src/style.css, src/menus.ts, src/barre-actions.ts, src/camera.ts).
// Au doigt (hasTouch, isMobile, densité 2 ou 3), à 320 × 568, 360 × 640,
// 390 × 844, 412 × 915 (portrait), 568 × 320, 844 × 390, 932 × 430 (paysage) :
// A. Au repos : body.telephone ; la barre du haut sur UNE rangée (le bouton
//    du classeur, ‹, le compteur sans nom, ›, + sauf sous 360 px, « Plus »,
//    son titre) ; la barre des outils en bas (portrait, à 4 ou 12 px des
//    bords) ou à gauche (paysage), ses SEPT boutons dans l'ordre ; la barre
//    du zoom cachée ; chaque bouton visible des barres de 44 × 44 au moins,
//    dans la fenêtre, libre en son centre (elementFromPoint) ; rien ne se
//    chevauche ; --haut-barre-bas.
// B. Chaque outil en deux touchers au plus (les trois de la barre en un, les
//    six autres par « Autres outils ») ; chaque type de forme ou de segment
//    en trois (Autres outils, Formes, Rectangle) ; les menus « Couleur »,
//    « Autres outils », du doigt, de la Gomme et les choix des Formes et du
//    Segment : dans la fenêtre, leurs boutons de 44 px au moins (56 dans la
//    grille), jamais sur la barre des outils ; « Autres outils » prend
//    l'icône de l'outil en main.
// C. Dessiner au doigt, annuler, rétablir (les boutons de la barre) ;
//    changer de couleur et d'épaisseur (le menu « Couleur ») ; gommer au
//    trait entier, puis « seulement là où elle passe » (le menu de la Gomme,
//    en retouchant la Gomme).
// D. Un objet pris en bas de l'écran : la barre d'actions, la pastille ↻, le
//    menu complet et le message ne chevauchent ni les barres, ni le bouton
//    du classeur, ni le bandeau, ni entre eux ; agrandi par un coin au doigt
//    (une étape) ; son menu complet (Options) au-dessus de la barre du bas,
//    sur toute la largeur en portrait, ses boutons de 44 px ; « Revenir au
//    contenu » au-dessus de la barre du bas.
// E. « Plus » : ses entrées dans l'ordre (Page, Outils de cours, Vue, le
//    classeur, Cet appareil), de 44 px au moins, le menu dans la fenêtre
//    (il défile s'il le faut) ; « Nouvelle page » y est sous 360 px ; Plus →
//    Fond… (le menu des fonds, deux colonnes en portrait, un fond choisi) ;
//    Plus → Instruments… (la liste sous la barre du haut, une règle posée) ;
//    Plus → Tout voir ; Plus → Revoir (la revue s'ouvre et se ferme) ; Plus
//    → Enregistrer (un fichier .memc) ; le menu de la page (appui long) dans
//    la fenêtre.
// F. On tourne l'écran (portrait ↔ paysage) : rien n'est perdu (les formes,
//    la sélection, l'outil, la page, la couleur), la barre passe de bas à
//    gauche, rien ne sort ni ne se chevauche.
// G. Au poste de la classe (1366 × 768, 1024 × 768, 1280 × 720, à la
//    souris), au TNI et sur l'iPad (1180 × 820, 820 × 1180, iPad Mini) : pas
//    de body.telephone, les barres EXACTEMENT celles d'avant K10 (relevées
//    avant le morceau, figée : K10-telephone/reference-barres.json) ; les deux boutons
//    du téléphone cachés.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { releverBarres } from './lib/geometrie-barres.mjs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/K10-telephone/travail/essai'
const DEV = 'http://localhost:5173/'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1800) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const attendre = ms => new Promise(r => setTimeout(r, ms))
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function telephone(l, h, dpr) {
  const ctx = await nav.newContext({ viewport: { width: l, height: h }, screen: { width: l, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: dpr, acceptDownloads: true })
  await ctx.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
  await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  const p = await ctx.newPage(); suivre(p, `${l}×${h}`)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => document.fonts?.ready)
  await p.waitForTimeout(900)
  await p.evaluate(() => {
    window.__msgs = []
    const ui = window.__app.ui, m = ui.message.bind(ui)
    ui.message = (t, ...r) => { window.__msgs.push(t); return m(t, ...r) }
  })
  const cdp = await ctx.newCDPSession(p)
  const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 6, radiusY: 6, force: 0.5 })) })
  /** Un doigt qui glisse de a à b (fenêtre), par pas de 20 px au plus, toutes
   *  les 16 ms (un doigt qui écrit, pas un lancer) */
  const glisser = async (a, b, n = 0) => {
    n = Math.max(n, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 20))
    await toucher('touchStart', [[a.x, a.y]])
    for (let k = 1; k <= n; k++) { await toucher('touchMove', [[a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n]]); await attendre(16) }
    await attendre(40)
    await toucher('touchEnd', [])
    // (Chrome n'envoie pas de clic à un toucher qui suit de moins de 300 ms
    // environ un doigt qui a glissé : ce n'est pas l'application)
    await p.waitForTimeout(450)
  }
  const tap = async (x, y) => { await p.touchscreen.tap(x, y); await p.waitForTimeout(220) }
  /** Touche le centre d'un élément (sélecteur ou fonction de la page qui le rend) */
  const toucherEl = async sel => {
    const c = await p.evaluate(s => { const e = typeof s === 'string' ? document.querySelector(s) : null; if (!e || !e.getClientRects().length) return null; e.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, sel)
    if (!c) throw new Error('rien à toucher : ' + sel)
    await tap(c.x, c.y)
  }
  return { ctx, p, cdp, toucher, glisser, tap, toucherEl }
}

// ---------- Dans la page ----------
/** Les boîtes de ce qui est à l'écran : les barres, le bouton du classeur, le
 *  bandeau, la barre d'actions, la pastille ↻, le menu complet, le message,
 *  les petits menus ouverts, les choix des Formes et du Segment, la liste des
 *  instruments, « Revenir au contenu » */
const GEO = () => {
  const R = e => { if (!e || e.hidden || !e.getClientRects().length) return null; const b = e.getBoundingClientRect(); if (!b.width || !b.height) return null; return { left: b.left, top: b.top, right: b.right, bottom: b.bottom } }
  const q = s => document.querySelector(s)
  const a = window.__app, cam = a.cam, z = document.getElementById('zone').getBoundingClientRect()
  const d = a.pastilleAEviter()
  let pastille = null
  if (d) { const A = cam.versEcran(d.x, d.y), B = cam.versEcran(d.x + d.l, d.y + d.h); pastille = { left: z.left + A.x, top: z.top + A.y, right: z.left + B.x, bottom: z.top + B.y } }
  const toast = q('.toast')
  return {
    haut: R(q('.barre-haut')), outils: R(q('.barre-outils')), classeur: R(q('.barre-classeur')), bandeau: R(q('.bandeau-sauvegarde')),
    actions: R(q('.barre-actions')), pastille, panneau: R(q('.panneau-forme')), toast: toast.classList.contains('visible') ? R(toast) : null,
    menus: [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => ({ nom: m.getAttribute('aria-label'), r: R(m) })),
    formes: R(q('.choix-formes:not([hidden])')), instruments: R(q('.choix-instruments')), retour: R(q('.retour-contenu')), zoom: R(q('.barre-zoom')),
    fenetre: { l: innerWidth, h: innerHeight }, hbb: getComputedStyle(document.getElementById('app')).getPropertyValue('--haut-barre-bas').trim(),
    telephone: document.body.classList.contains('telephone'),
  }
}
/** Chaque bouton visible de ce qui flotte sur le tableau : sa taille, dans la
 *  fenêtre ou non, libre en son centre (amené à l'écran dans ce qui défile) */
const BOUTONS = () => {
  const out = []
  const conteneurs = '.barre, .menu-flottant:not([hidden]), .panneau-forme:not([hidden]), .barre-actions:not([hidden]), .toast.visible, .bandeau-sauvegarde:not([hidden]), .retour-contenu:not([hidden]), .menu-partie:not([hidden])'
  const vus = new Set()
  for (const c of document.querySelectorAll(conteneurs)) {
    const boutons = c.matches('button') ? [c] : [...c.querySelectorAll('button')]
    for (const b of boutons) {
      if (vus.has(b) || !b.getClientRects().length || b.closest('[hidden]')) continue
      vus.add(b)
      const dansMenu = b.closest('.menu-flottant, .panneau-forme')
      if (dansMenu && dansMenu.scrollHeight > dansMenu.clientHeight + 1) b.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      const r = b.getBoundingClientRect()
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2
      const sous = document.elementFromPoint(cx, cy)
      out.push({ nom: (b.getAttribute('aria-label') || b.title || b.textContent || b.className).trim().slice(0, 40), l: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10,
        dans: r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
        libre: !!sous && (sous === b || b.contains(sous)), ou: c.className.split(' ')[0] })
    }
  }
  for (const m of document.querySelectorAll('.menu-flottant:not([hidden]), .panneau-forme:not([hidden])')) m.scrollTop = 0
  return out
}
const couvre = (a, b, g = 0.5) => !!a && !!b && a.left < b.right - g && a.right > b.left + g && a.top < b.bottom - g && a.bottom > b.top + g
const dansFenetre = (r, f) => !r || (r.left >= -0.5 && r.top >= -0.5 && r.right <= f.l + 0.5 && r.bottom <= f.h + 0.5)
/** Les paires qui se chevauchent parmi ces noms */
function chevauchements(g, noms) {
  const l = []
  for (let i = 0; i < noms.length; i++) for (let j = i + 1; j < noms.length; j++) if (couvre(g[noms[i]], g[noms[j]])) l.push(noms[i] + '/' + noms[j])
  return l
}
const petits = (bs, min = 44) => bs.filter(b => b.l < min - 0.5 || b.h < min - 0.5 || !b.dans || !b.libre)

/** Les titres des boutons visibles d'une barre, dans l'ordre de l'écran */
const ORDRE_BARRE = sel => [...document.querySelectorAll(sel + ' > button, ' + sel + ' > .bouton')].filter(b => b.getClientRects().length)
  .map(b => ({ t: b.classList.contains('bouton-classeur') ? '[classeur]' : b.classList.contains('rang') ? '[compteur]' : (b.title || b.getAttribute('aria-label') || b.className).replace(/ — .*$/, ''), r: b.getBoundingClientRect() }))
  .sort((a, b) => (Math.abs(a.r.top - b.r.top) > 4 ? a.r.top - b.r.top : a.r.left - b.r.left)).map(x => x.t)
const PAGE_NEUVE = () => {
  const a = window.__app
  a.choisirOutil('stylo')
  a.selection.clear(); a.options = null
  a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  a.rendu.toutRedessiner(); a.ui.maj()
  return id
}
/** Un point de la fenêtre → le monde */
const VERS_MONDE = ({ x, y }) => { const a = window.__app, z = document.getElementById('zone').getBoundingClientRect(); return { x: (x - z.left - a.cam.x) / a.cam.z, y: (y - z.top - a.cam.y) / a.cam.z } }
const VERS_ECRAN = ({ x, y }) => { const a = window.__app, z = document.getElementById('zone').getBoundingClientRect(); return { x: z.left + a.cam.x + x * a.cam.z, y: z.top + a.cam.y + y * a.cam.z } }
const etat = p => p.evaluate(() => { const a = window.__app; return { outil: a.outil, n: a.formes.length, sel: [...a.selection], page: a.page, couleur: a.couleur, taille: a.taille, typeForme: a.typeForme, typeTrait: a.typeTrait, fond: a.fond } })
const outils = p => p.evaluate(() => window.__app.formes.map(f => ({ id: f.id, type: f.type, n: f.pts?.length })))
const menuOuvert = p => p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => m.getAttribute('aria-label')))

const ESSENTIELS = ['Stylo (P)', 'Gomme (E)', 'Sélectionner et déplacer (V)']
const SELECTEUR = { 'Stylo (P)': '[title="Stylo (P)"]', 'Gomme (E)': '[title^="Gomme (E)"]', 'Sélectionner et déplacer (V)': '[title="Sélectionner et déplacer (V)"]' }
const AUTRES = [['surligneur', 'Surligneur'], ['point', 'Point'], ['segment', 'Segment'], ['forme', 'Formes'], ['formule', 'Formule'], ['main', 'Vue']]
const APPAREILS = [[320, 568, 2], [360, 640, 3], [390, 844, 3], [412, 915, 2.625], [568, 320, 2], [844, 390, 3], [932, 430, 3]]
  .filter(([l, h]) => !process.env.TAILLES || process.env.TAILLES.split(',').includes(`${l}x${h}`))

for (const [L, H, dpr] of APPAREILS) {
  const T = `${L} × ${H}`
  const portrait = H > L
  console.log(`=== ${T} (${portrait ? 'portrait' : 'paysage'}) ===`)
  const { ctx, p, glisser, tap, toucherEl, toucher } = await telephone(L, H, dpr)
  await p.evaluate(PAGE_NEUVE)

  // ----- A. Au repos -----
  let g = await p.evaluate(GEO)
  const haut = await p.evaluate(ORDRE_BARRE, '.barre-haut')
  const bas = await p.evaluate(ORDRE_BARRE, '.barre-outils')
  const plusTitre = await p.evaluate(() => document.querySelector('.barre-haut > .bouton.points').title)
  const classeurDansLaBarre = await p.evaluate(() => !!document.querySelector('.barre-haut > .bouton-classeur'))
  ok(g.telephone && !g.zoom, `A1) ${T} : body.telephone ; la barre du zoom cachée`, g)
  const attenduHaut = ['[classeur]', 'Page précédente (Page ↑)', '[compteur]', 'Page suivante : en ajouter une (c\'est la dernière)', ...(L >= 360 ? ['Nouvelle page'] : []), plusTitre]
  ok(g.haut.bottom - g.haut.top <= 60 && JSON.stringify(haut) === JSON.stringify(attenduHaut) && classeurDansLaBarre,
    `A2) ${T} : la barre du haut sur UNE rangée (${Math.round(g.haut.bottom - g.haut.top)} px) : le classeur, ‹, le compteur, ›${L >= 360 ? ', +' : ' (pas de +)'}, « Plus »`, { haut, hauteur: g.haut.bottom - g.haut.top })
  ok(/^Plus : la page, les outils de cours, le classeur/.test(plusTitre), `A3) ${T} : le titre de ⋯ : « Plus : la page, les outils de cours, le classeur »`, plusTitre)
  const nomCache = await p.evaluate(() => getComputedStyle(document.querySelector('.rang-nom')).display === 'none')
  ok(nomCache, `A4) ${T} : le compteur sans le nom de la page`)
  ok(JSON.stringify(bas) === JSON.stringify([...ESSENTIELS, 'Couleur et épaisseur', 'Annuler sur cette page (Ctrl+Z)', 'Rétablir sur cette page (Ctrl+Y)', 'Autres outils']),
    `A5) ${T} : la barre des outils a ses sept boutons, dans l'ordre (Stylo, Gomme, Sélection, Couleur, Annuler, Rétablir, Autres outils)`, bas)
  const marge = L < 360 ? 4 : 12
  if (portrait) {
    ok(Math.abs(g.outils.left - marge) < 1 && Math.abs(L - g.outils.right - marge) < 1 && Math.abs(H - g.outils.bottom - marge) < 1 && g.outils.right - g.outils.left > g.outils.bottom - g.outils.top,
      `A6) ${T} : en portrait, la barre des outils en bas, sur toute la largeur, à ${marge} px des bords`, g.outils)
    ok(g.hbb === `${Math.ceil(H - g.outils.top)}px`, `A7) ${T} : --haut-barre-bas = la place de la barre du bas (${g.hbb})`, { hbb: g.hbb, haut: g.outils.top })
  } else {
    const margeH = H < 360 ? 4 : 12
    ok(g.outils.left >= margeH - 0.5 && g.outils.bottom - g.outils.top > g.outils.right - g.outils.left && g.outils.top >= margeH - 0.5 && H - g.outils.bottom >= margeH - 0.5,
      `A6) ${T} : en paysage, la barre des outils à gauche, en colonne, dans la hauteur`, g.outils)
    ok(g.hbb === '0px', `A7) ${T} : --haut-barre-bas = 0 (pas de barre en bas)`, g.hbb)
  }
  let bs = await p.evaluate(BOUTONS)
  ok(!petits(bs).length && bs.length >= 12, `A8) ${T} : chaque bouton des barres (${bs.length}) fait 44 × 44 au moins, dans la fenêtre, libre en son centre`, petits(bs))
  ok(!chevauchements(g, ['haut', 'outils', 'classeur', 'bandeau']).length && dansFenetre(g.haut, g.fenetre) && dansFenetre(g.outils, g.fenetre),
    `A9) ${T} : rien ne se chevauche ni ne sort (barres, bouton du classeur)`, chevauchements(g, ['haut', 'outils', 'classeur', 'bandeau']))
  // Le bandeau (un rappel d'enregistrer) : sous la barre du haut, à côté de rien
  await p.evaluate(() => window.__app.ui.majBandeau({ raison: 'rappel', texte: 'Ce classeur n\'est encore enregistré dans aucun fichier : pensez à l\'enregistrer.', actions: ['enregistrer'], fermable: true }))
  await p.waitForTimeout(150)
  g = await p.evaluate(GEO); bs = await p.evaluate(BOUTONS)
  ok(g.bandeau && !chevauchements(g, ['haut', 'outils', 'classeur', 'bandeau']).length && dansFenetre(g.bandeau, g.fenetre) && !petits(bs.filter(b => b.ou === 'bandeau-sauvegarde')).length,
    `A10) ${T} : le bandeau, dans la fenêtre, sans chevaucher les barres ; ses boutons de 44 px`, { bandeau: g.bandeau, ch: chevauchements(g, ['haut', 'outils', 'classeur', 'bandeau']), b: petits(bs.filter(b => b.ou === 'bandeau-sauvegarde')) })
  await p.evaluate(() => window.__app.ui.majBandeau(null))

  // ----- B. Les outils en deux touchers, les types en trois -----
  const atteints = []
  for (const t of ESSENTIELS) {
    await p.evaluate(() => window.__app.choisirOutil('main'))
    await toucherEl(`.barre-outils > .bouton${SELECTEUR[t]}`)
    atteints.push([t, (await etat(p)).outil])
  }
  ok(JSON.stringify(atteints.map(x => x[1])) === '["stylo","gomme","selection"]', `B1) ${T} : Stylo, Gomme, Sélection d'un toucher`, atteints)
  let menuB = null
  const autres = []
  for (const [id, mot] of AUTRES) {
    await p.evaluate(() => window.__app.choisirOutil('stylo'))
    await toucherEl('.barre-outils > .autres-outils')
    if (!menuB) {
      g = await p.evaluate(GEO); bs = await p.evaluate(BOUTONS)
      const m = g.menus.find(x => x.nom === 'Autres outils')
      const grille = bs.filter(b => b.ou === 'menu-flottant')
      menuB = { m: m?.r, ok: !!m && dansFenetre(m.r, g.fenetre) && !couvre(m.r, g.outils) && !couvre(m.r, g.haut) && grille.length >= 7 && !petits(grille, 56).length, grille: petits(grille, 56), mots: await p.evaluate(() => [...document.querySelectorAll('.menu-autres .outil-grille .nom')].map(e => e.textContent)) }
    }
    await toucherEl(`.menu-autres .outil-grille[data-action="${id}"]`)
    const e = await etat(p)
    const icone = await p.evaluate(() => { const b = document.querySelector('.barre-outils > .autres-outils'); return { icone: b.dataset.icone, actif: b.classList.contains('actif') } })
    autres.push({ id, outil: e.outil, ferme: !(await menuOuvert(p)).includes('Autres outils'), icone })
  }
  ok(menuB.ok && JSON.stringify(menuB.mots) === JSON.stringify(['Surligneur', 'Point', 'Segment', 'Formes', 'Formule', 'Vue', 'Doigt', 'Supprimer']),
    `B2) ${T} : « Autres outils » : la grille (Surligneur, Point, Segment, Formes, Formule, Vue, Doigt, Supprimer), dans la fenêtre, ni sur la barre des outils ni sur celle du haut, ses boutons de 56 px au moins`, menuB)
  ok(autres.every(a => a.outil === a.id && a.ferme && a.icone.icone === a.id && a.icone.actif), `B3) ${T} : chacun des six autres outils en deux touchers ; le bouton prend son icône et le coup de surligneur`, autres)
  await toucherEl(`.barre-outils > .bouton[title="Stylo (P)"]`)
  const revenu = await p.evaluate(() => { const b = document.querySelector('.barre-outils > .autres-outils'); return { icone: b.dataset.icone, actif: b.classList.contains('actif') } })
  ok(revenu.icone === 'points' && !revenu.actif, `B4) ${T} : le Stylo repris, « Autres outils » retrouve ses points`, revenu)
  // Les types de formes et de segments en trois touchers
  const types = []
  for (const [outil, sel, liste] of [['forme', 'forme', ['rectangle', 'cercle', 'polygone']], ['segment', 'segment', ['segment', 'droite', 'demi']]]) {
    for (const t of liste) {
      await p.evaluate(() => window.__app.choisirOutil('stylo'))
      await toucherEl('.barre-outils > .autres-outils')
      await toucherEl(`.menu-autres .outil-grille[data-action="${sel}"]`)
      const gg = await p.evaluate(GEO)
      const titre = await p.evaluate(([o, t]) => {
        const panneaux = [...document.querySelectorAll('.choix-formes:not([hidden])')]
        const b = panneaux.flatMap(x => [...x.querySelectorAll('button')]).find(x => x.title && (o === 'forme' ? x.title.toLowerCase().startsWith(t === 'rectangle' ? 'rectangle' : t === 'cercle' ? 'cercle' : 'polygone') : x.title.toLowerCase().startsWith(t === 'segment' ? 'segment' : t === 'droite' ? 'droite' : 'demi')))
        return b ? b.title : null
      }, [outil, t])
      await toucherEl(`.choix-formes:not([hidden]) .bouton[title="${titre}"]`)
      const e = await etat(p)
      const bsF = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'barre' && gg.formes)
      types.push({ outil, t, ok: e.outil === outil && (outil === 'forme' ? e.typeForme === t : e.typeTrait === t), dans: dansFenetre(gg.formes, gg.fenetre), surBarre: couvre(gg.formes, gg.outils) || couvre(gg.formes, gg.haut), petits: petits(bsF).length })
    }
  }
  ok(types.every(x => x.ok && x.dans && !x.surBarre && !x.petits), `B5) ${T} : chaque type de forme et de segment en trois touchers (Autres outils, Formes, Rectangle…) ; leurs choix dans la fenêtre, ${portrait ? 'au-dessus' : 'à droite'} de la barre, sans la couvrir`, types)
  // Le menu du doigt (Autres outils → Doigt)
  await toucherEl('.barre-outils > .autres-outils')
  await toucherEl('.menu-autres .outil-grille[data-action="doigt"]')
  g = await p.evaluate(GEO)
  const mDoigt = g.menus.find(m => m.nom === 'Rôle du doigt')
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'menu-flottant')
  ok(mDoigt && dansFenetre(mDoigt.r, g.fenetre) && !couvre(mDoigt.r, g.outils) && !petits(bs).length, `B6) ${T} : Autres outils → Doigt : son menu, dans la fenêtre, sans couvrir la barre des outils`, { m: mDoigt, p: petits(bs) })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)

  // ----- C. Dessiner, annuler, couleur, gommer -----
  await toucherEl(`.barre-outils > .bouton[title="Stylo (P)"]`)
  const zl = await p.evaluate(() => window.__app.ui.zoneLibre())
  const y0 = zl.y + zl.h * 0.3
  const n0 = (await etat(p)).n
  await glisser({ x: zl.x + 30, y: y0 }, { x: zl.x + zl.l - 30, y: y0 + 10 })
  const n1 = (await etat(p)).n
  await toucherEl('.barre-outils > .bouton[title^="Annuler"]')
  const n2 = (await etat(p)).n
  await toucherEl('.barre-outils > .bouton[title^="Rétablir"]')
  const n3 = (await etat(p)).n
  ok(n1 === n0 + 1 && n2 === n0 && n3 === n0 + 1, `C1) ${T} : un trait au doigt ; Annuler l'enlève, Rétablir le rend (les boutons de la barre)`, { n0, n1, n2, n3 })
  await toucherEl('.barre-outils > .bouton-couleur')
  g = await p.evaluate(GEO)
  const mCouleur = g.menus.find(m => m.nom === 'Couleur et épaisseur')
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'menu-flottant')
  const cases = await p.evaluate(() => [...document.querySelectorAll('.menu-couleur .case-couleur')].map(b => { const r = b.getBoundingClientRect(); return [b.title, Math.round(r.width), Math.round(r.height)] }))
  ok(mCouleur && dansFenetre(mCouleur.r, g.fenetre) && !couvre(mCouleur.r, g.outils) && cases.length === 7 && cases.every(c => c[1] === 44 && c[2] === 44) && !petits(bs).length,
    `C2) ${T} : « Couleur » : les quatre pastilles et les trois tailles, 44 × 44 chacune, ${portrait ? 'au-dessus' : 'à droite'} de la barre, dans la fenêtre`, { m: mCouleur, cases })
  await toucherEl('.menu-couleur .case-couleur[title="Rouge"]')
  await toucherEl('.barre-outils > .bouton-couleur')
  await toucherEl('.menu-couleur .case-couleur[title="Trait épais"]')
  let e = await etat(p)
  const rond = await p.evaluate(() => document.querySelector('.rond-couleur').style.getPropertyValue('--teinte'))
  ok(e.couleur === '#d0342c' && e.taille === 9 && e.outil === 'stylo' && rond === '#d0342c', `C3) ${T} : Couleur → Rouge, Couleur → épais : le stylo les prend, le bouton est rouge`, { e, rond })
  await glisser({ x: zl.x + 30, y: y0 + 60 }, { x: zl.x + zl.l - 30, y: y0 + 60 })
  const traitRouge = await p.evaluate(() => { const f = window.__app.formes.at(-1); return { couleur: f.couleur, taille: f.taille } })
  ok(traitRouge.couleur === '#d0342c' && traitRouge.taille === 9, `C4) ${T} : le trait suivant est rouge et épais`, traitRouge)
  // La gomme au trait entier : un coup sur le trait rouge l'efface
  await toucherEl(`.barre-outils > .bouton[title^="Gomme"]`)
  const avantGomme = (await etat(p)).n
  await glisser({ x: zl.x + zl.l / 2, y: y0 + 40 }, { x: zl.x + zl.l / 2, y: y0 + 80 })
  const apresGomme = (await etat(p)).n
  ok(apresGomme === avantGomme - 1, `C5) ${T} : la Gomme (trait entier) efface le trait qu'elle touche`, { avantGomme, apresGomme })
  // Retoucher la Gomme : son menu, au-dessus d'elle (à droite en paysage) ; « seulement là où elle passe »
  await toucherEl(`.barre-outils > .bouton[title^="Gomme"]`)
  g = await p.evaluate(GEO)
  const mGomme = g.menus.find(m => m.nom === 'Gomme')
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'menu-flottant')
  ok(mGomme && dansFenetre(mGomme.r, g.fenetre) && !couvre(mGomme.r, g.outils) && !couvre(mGomme.r, g.haut) && !petits(bs).length, `C6) ${T} : retoucher la Gomme ouvre son menu, dans la fenêtre, sans couvrir les barres`, mGomme)
  await toucherEl('.menu-flottant[aria-label="Gomme"] .menu-item[data-action="gomme-zone"]')
  const formesAvant = (await outils(p)).filter(f => f.type === 'trait').length
  await glisser({ x: zl.x + zl.l / 2, y: y0 - 30 }, { x: zl.x + zl.l / 2, y: y0 + 40 })
  const formesApres = (await outils(p)).filter(f => f.type === 'trait').length
  ok(formesApres === formesAvant + 1, `C7) ${T} : la gomme « seulement là où elle passe » coupe le trait en deux`, { formesAvant, formesApres })
  await p.evaluate(() => { localStorage.removeItem('mem-gomme'); window.__app.ui.maj() })
  await p.evaluate(() => import('/src/reglages.ts').then(m => m.choisirGomme('trait')))

  // ----- D. Un objet pris en bas de l'écran -----
  await p.evaluate(PAGE_NEUVE)
  const basZone = await p.evaluate(() => { const zl = window.__app.ui.zoneLibre(), z = document.getElementById('zone').getBoundingClientRect(); return { x: z.left + zl.x, y: z.top + zl.y + zl.h, l: zl.l } })
  // (juste au-dessus du bas de ce qu'on voit : 36 px plus haut que lui)
  const coinBas = await p.evaluate(VERS_MONDE, { x: basZone.x + 40, y: basZone.y - 36 })
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * 7, Math.sin(i / 3) * 12, 0.5)
  const T1 = await p.evaluate(POSER, { type: 'trait', x: coinBas.x, y: coinBas.y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  await toucherEl(`.barre-outils > .bouton[title="Sélectionner et déplacer (V)"]`)
  const centre = await p.evaluate(VERS_ECRAN, { x: coinBas.x + 70, y: coinBas.y + Math.sin(10 / 3) * 12 })
  await tap(centre.x, centre.y)
  await p.waitForTimeout(400)
  e = await etat(p)
  g = await p.evaluate(GEO)
  const lesFlottants = ['haut', 'outils', 'classeur', 'bandeau', 'actions', 'pastille', 'panneau', 'toast']
  ok(JSON.stringify(e.sel) === JSON.stringify([T1]) && g.actions && g.pastille && !chevauchements(g, lesFlottants).length && dansFenetre(g.actions, g.fenetre) && dansFenetre(g.pastille, g.fenetre),
    `D1) ${T} : un trait pris en bas de l'écran d'un toucher : la barre d'actions et la pastille ↻ dans la fenêtre, sans chevaucher les barres ni rien d'autre`, { sel: e.sel, ch: chevauchements(g, lesFlottants), actions: g.actions, pastille: g.pastille, outils: g.outils })
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'barre-actions')
  ok(bs.length >= 4 && !petits(bs).length, `D2) ${T} : les boutons de la barre d'actions font 44 px au moins`, petits(bs))
  // Un message pendant que c'est pris : il ne couvre rien
  await p.evaluate(() => window.__app.ui.message('Un message d\'essai, assez long pour passer sur deux lignes sur un petit téléphone.'))
  await p.waitForTimeout(350)
  g = await p.evaluate(GEO)
  ok(g.toast && dansFenetre(g.toast, g.fenetre) && !chevauchements(g, lesFlottants).length, `D3) ${T} : le message ne chevauche ni les barres, ni la barre d'actions, ni la pastille`, { ch: chevauchements(g, lesFlottants), toast: g.toast })
  // Agrandir par un coin au doigt : une étape
  const k = await p.evaluate(() => { const c = window.__app.rendu.cadre?.cadre; return c && JSON.parse(JSON.stringify(c)) })
  const avantT = await p.evaluate(id => JSON.stringify(window.__app.forme(id)), T1)
  const pile0 = await p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
  let agrandi = false, detailCoin = { k }
  if (k?.coins?.length === 4) {
    // le coin en haut à droite, tiré vers le haut et la droite (dans ce qu'on voit)
    const c1 = await p.evaluate(VERS_ECRAN, k.coins[1]), c3 = await p.evaluate(VERS_ECRAN, k.coins[3])
    const dx = Math.min(40, L - 20 - c1.x), dy = -Math.min(60, c1.y - (g.haut.bottom + 30))
    await glisser(c1, { x: c1.x + Math.max(10, dx), y: c1.y + dy }, 16)
    const apres = await p.evaluate(id => window.__app.forme(id), T1)
    const pile1 = await p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
    const larg = Math.max(...apres.pts.filter((_, i) => i % 3 === 0)) - Math.min(...apres.pts.filter((_, i) => i % 3 === 0))
    agrandi = JSON.stringify(apres) !== avantT && larg > 140 + 1 && pile1 === pile0 + 1
    detailCoin = { larg, pile0, pile1, c1, c3 }
  }
  ok(agrandi, `D4) ${T} : agrandi par un coin au doigt (le trait plus large), en une étape`, detailCoin)
  // Annuler (le bouton de la barre) défait l'agrandissement d'un coup
  await toucherEl('.barre-outils > .bouton[title^="Annuler"]')
  const defait = await p.evaluate(id => JSON.stringify(window.__app.forme(id)), T1)
  ok(defait === avantT, `D4b) ${T} : Annuler (la barre) défait l'agrandissement d'un coup`)
  await p.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, T1)
  // Le menu complet : Options de la barre d'actions (le message d'essai s'en
  // est allé : voir le README, Limites, pour un long message sur un téléphone
  // couché de 320 px de haut, menu complet ouvert)
  await p.evaluate(() => { const ui = window.__app.ui; ui.toastSimple = null; ui.majToast() })
  await p.waitForTimeout(350)
  await toucherEl('.barre-actions .action-options')
  await p.waitForTimeout(250)
  g = await p.evaluate(GEO)
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'panneau-forme')
  ok(g.panneau && dansFenetre(g.panneau, g.fenetre) && !chevauchements(g, lesFlottants).length && bs.length >= 4 && !petits(bs).length
    && (!portrait || (Math.abs(g.panneau.left - 8) < 1 && Math.abs(L - 8 - g.panneau.right) < 1)),
    `D5) ${T} : son menu complet (Options) : ${portrait ? 'sur toute la largeur, ' : ''}au-dessus de la barre du bas, sans chevaucher les barres, la pastille ni le message ; ses boutons de 44 px`, { panneau: g.panneau, ch: chevauchements(g, lesFlottants), p: petits(bs) })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Supprimer la sélection, par « Autres outils » (la poubelle de la barre y est)
  await p.evaluate(id => { const a = window.__app; a.options = null; a.selection.clear(); a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, T1)
  await toucherEl('.barre-outils > .autres-outils')
  await toucherEl('.menu-autres .outil-grille[data-action="poubelle"]')
  const parti = await p.evaluate(id => !window.__app.forme(id), T1)
  ok(parti, `D7) ${T} : Autres outils → Supprimer : la sélection s'en va`)
  await p.evaluate(() => { const a = window.__app; a.annuler(); a.selection.clear(); a.options = null; a.ui.fermerMenus(); a.ui.maj() })
  // « Revenir au contenu » : au-dessus de la barre du bas
  await p.evaluate(() => { const a = window.__app; a.cam.x = -40000; a.cam.y = -40000; a.rendu.toutRedessiner(); a.ui.maj() })
  await p.waitForTimeout(1400)
  await p.evaluate(() => window.__app.ui.maj())
  g = await p.evaluate(GEO)
  ok(g.retour && dansFenetre(g.retour, g.fenetre) && !couvre(g.retour, g.outils) && !couvre(g.retour, g.haut), `D6) ${T} : « Revenir au contenu » au-dessus de la barre du bas, dans la fenêtre`, { retour: g.retour, outils: g.outils })
  await toucherEl('.retour-contenu')

  // ----- E. « Plus » -----
  await toucherEl('.barre-haut > .bouton.points')
  g = await p.evaluate(GEO)
  const mPlus = g.menus.find(m => m.nom === 'Plus')
  const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Plus"] > .menu-item, .menu-flottant[aria-label="Plus"] > .menu-titre, .menu-flottant[aria-label="Plus"] > .bloc-classeur')]
    .map(e => e.classList.contains('menu-titre') ? '# ' + e.textContent : e.classList.contains('bloc-classeur') ? '[classeur]' : e.querySelector('.libelle')?.firstChild?.textContent ?? e.textContent))
  const tete = entrees.slice(0, entrees.indexOf('[classeur]'))
  const attendu = ['# Page', ...(L < 360 ? ['Nouvelle page'] : []), 'Effacer la page', 'Fond…', 'Aimanter au quadrillage', 'Le stylo redresse les figures',
    '# Outils de cours', 'Importer une image…', 'Instruments…', 'Programme de construction', 'Catalogue', 'Automatismes', 'Revoir la construction', 'Publier le replay', '# Vue', '100 %', 'Tout voir']
  ok(mPlus && JSON.stringify(tete) === JSON.stringify(attendu) && entrees.includes('# Cet appareil') && entrees.indexOf('# Cet appareil') > entrees.indexOf('[classeur]'),
    `E1) ${T} : « Plus » : Page, Outils de cours, Vue, puis le classeur, puis Cet appareil`, { tete, entrees })
  const hauteurs = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Plus"] .menu-item')].filter(b => b.getClientRects().length).map(b => [b.textContent.slice(0, 24), Math.round(b.getBoundingClientRect().height)]))
  const plusEl = await p.evaluate(() => { const m = document.querySelector('.menu-flottant[aria-label="Plus"]'); return { sh: m.scrollHeight, ch: m.clientHeight, oy: getComputedStyle(m).overflowY } })
  const boutonPlus = await p.evaluate(() => { const r = document.querySelector('.barre-haut > .bouton.points').getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } })
  ok(dansFenetre(mPlus?.r, g.fenetre) && mPlus.r.top >= boutonPlus.bottom && hauteurs.every(h => h[1] >= 44) && (plusEl.sh <= plusEl.ch + 1 || plusEl.oy === 'auto'),
    `E2) ${T} : chaque entrée de « Plus » fait 44 px au moins ; le menu dans la fenêtre, sous son bouton, et il défile s'il dépasse`, { r: mPlus?.r, boutonPlus, petites: hauteurs.filter(h => h[1] < 44), plusEl })
  // Plus → Fond… : le menu des fonds en vignettes
  await toucherEl('.menu-flottant[aria-label="Plus"] .menu-item[data-action="fond"]')
  g = await p.evaluate(GEO)
  const mFonds = g.menus.find(m => m.nom === 'Fond de la page')
  const colonnes = await p.evaluate(() => { const b = [...document.querySelectorAll('.menu-fonds .fond-choix')]; return new Set(b.map(x => Math.round(x.getBoundingClientRect().left))).size })
  ok(mFonds && dansFenetre(mFonds.r, g.fenetre) && colonnes === (portrait ? 2 : 4), `E3) ${T} : Plus → Fond… : le menu des fonds, dans la fenêtre, sur ${portrait ? 'deux' : 'quatre'} colonnes`, { m: mFonds, colonnes })
  await toucherEl('.menu-fonds .fond-choix[data-fond="pointe"]')
  e = await etat(p)
  ok(e.fond === 'pointe' && !(await menuOuvert(p)).length, `E4) ${T} : un fond choisi (le papier pointé) ; le menu se ferme`, e.fond)
  // Plus → Instruments… : la liste sous la barre du haut ; une règle
  await toucherEl('.barre-haut > .bouton.points')
  await toucherEl('.menu-flottant[aria-label="Plus"] .menu-item[data-action="instruments"]')
  g = await p.evaluate(GEO)
  bs = (await p.evaluate(BOUTONS)).filter(b => b.ou === 'barre' && g.instruments)
  const instrBoutons = await p.evaluate(() => [...document.querySelectorAll('.choix-instruments button')].map(b => Math.round(b.getBoundingClientRect().height)))
  ok(g.instruments && dansFenetre(g.instruments, g.fenetre) && g.instruments.top >= g.haut.bottom && !couvre(g.instruments, g.outils) && instrBoutons.every(h => h >= 44)
    && Math.abs((g.instruments.left + g.instruments.right) / 2 - (g.haut.left + g.haut.right) / 2) < 2,
    `E5) ${T} : Plus → Instruments… : la liste sous la barre du haut, centrée, dans la fenêtre, ses boutons de 44 px`, { i: g.instruments, h: g.haut, instrBoutons })
  await toucherEl('.choix-instruments .option.instrument')
  const regle = await p.evaluate(() => window.__app.instrumentVisible('regle'))
  ok(regle, `E6) ${T} : un toucher sur la Règle la pose`)
  await p.evaluate(() => { const a = window.__app; if (a.instrumentVisible('regle')) a.basculerInstrument('regle'); a.ui.fermerMenus(); a.ui.maj() })
  // Plus → Tout voir
  await p.evaluate(() => { const a = window.__app; a.cam.x = -9000; a.cam.y = -9000; a.rendu.toutRedessiner(); a.ui.maj() })
  await toucherEl('.barre-haut > .bouton.points')
  await toucherEl('.menu-flottant[aria-label="Plus"] .menu-item[data-action="tout-voir"]')
  await p.waitForTimeout(600)
  const vu = await p.evaluate(() => !window.__app.contenuHorsVue())
  ok(vu, `E7) ${T} : Plus → Tout voir ramène le contenu à l'écran`)
  // Plus → Revoir la construction
  await toucherEl('.barre-haut > .bouton.points')
  await toucherEl('.menu-flottant[aria-label="Plus"] .menu-item[data-action="revue"]')
  await p.waitForTimeout(600)
  const revue = await p.evaluate(() => window.__app.ui.revue.ouvert)
  await p.keyboard.press('Escape'); await p.waitForTimeout(500)
  const revueFermee = await p.evaluate(() => !window.__app.ui.revue.ouvert)
  ok(revue && revueFermee, `E8) ${T} : Plus → Revoir la construction ouvre la revue ; Échap la ferme`, { revue, revueFermee })
  // Plus → Enregistrer le classeur…
  await toucherEl('.barre-haut > .bouton.points')
  const dl = p.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await toucherEl('.menu-flottant[aria-label="Plus"] .menu-item[data-action="enregistrer"]')
  const fichier = await dl
  ok(fichier && /\.memc$/.test(fichier.suggestedFilename()), `E9) ${T} : Plus → Enregistrer le classeur… : un fichier .memc`, fichier?.suggestedFilename())
  await p.waitForTimeout(300)
  // Le menu de la page (appui long dans le vide) : dans la fenêtre
  await toucherEl(`.barre-outils > .bouton[title="Sélectionner et déplacer (V)"]`)
  // (dans le vide : la vue loin de ce qui est écrit)
  await p.evaluate(() => { const a = window.__app; a.cam.x = -40000; a.cam.y = -40000; a.rendu.toutRedessiner(); a.ui.maj() })
  const vide = { x: zl.x + zl.l / 2, y: zl.y + zl.h * 0.6 }
  await toucher('touchStart', [[vide.x, vide.y]]); await attendre(750); await toucher('touchEnd', []); await p.waitForTimeout(200)
  g = await p.evaluate(GEO)
  const mPage = g.menus.find(m => m.nom === 'Page')
  ok(mPage && dansFenetre(mPage.r, g.fenetre), `E10) ${T} : le menu de la page (appui long) dans la fenêtre`, mPage)
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)

  // ----- F. On tourne l'écran -----
  await p.evaluate(PAGE_NEUVE)
  await toucherEl(`.barre-outils > .bouton[title="Stylo (P)"]`)
  await glisser({ x: zl.x + 40, y: zl.y + 60 }, { x: zl.x + 140, y: zl.y + 90 })
  const dernier = await p.evaluate(() => window.__app.formes.at(-1).id)
  await p.evaluate(id => { const a = window.__app; a.choisirOutil('segment'); a.selection.clear(); a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, dernier)
  const avant = await etat(p)
  await p.setViewportSize({ width: H, height: L }); await p.waitForTimeout(900)
  const apres = await etat(p)
  g = await p.evaluate(GEO); bs = await p.evaluate(BOUTONS)
  const tourne = !portrait
  const bonneBarre = tourne ? g.outils.right - g.outils.left > g.outils.bottom - g.outils.top : g.outils.bottom - g.outils.top > g.outils.right - g.outils.left
  ok(JSON.stringify(avant) === JSON.stringify(apres) && g.telephone && bonneBarre && !petits(bs).length && !chevauchements(g, ['haut', 'outils', 'classeur', 'formes']).length && dansFenetre(g.formes, g.fenetre),
    `F1) ${T} → ${H} × ${L} : rien n'est perdu (formes, sélection, outil, page, couleur), la barre passe ${tourne ? 'en bas' : 'à gauche'}, rien ne sort ni ne se chevauche`, { avant, apres, outils: g.outils, ch: chevauchements(g, ['haut', 'outils', 'classeur', 'formes']), p: petits(bs) })
  await p.setViewportSize({ width: L, height: H }); await p.waitForTimeout(900)
  const retour = await etat(p)
  g = await p.evaluate(GEO)
  ok(JSON.stringify(retour) === JSON.stringify(avant) && !chevauchements(g, ['haut', 'outils', 'classeur', 'formes']).length, `F2) ${T} : retourné, tout est là comme avant`, retour)
  await p.screenshot({ path: `${D}/tel-${L}x${H}.png` })
  await ctx.close()
}

// ----- G. Le poste de la classe, le TNI, l'iPad : rien ne change -----
console.log('=== G. le poste de la classe, le TNI, l\'iPad ===')
const reference = JSON.parse(readFileSync(S + '/lot5/K10-telephone/reference-barres.json', 'utf8'))
const maintenant = await releverBarres(DEV, erreurs)
// (Adapté aux corrections « conformité » du lot 5, deux changements voulus,
// qui ne touchent pas à la mise en page du téléphone : le titre du bouton ⋯
// dit aussi « réglages de cet appareil » (le relevé n'en garde que les 40
// premiers caractères) ; et là où les noms sous les outils sont allumés
// d'office (le TNI), la barre du zoom a les siens : plus haute et plus
// large, elle n'est plus celle d'avant. On la vérifie à part (dans l'écran,
// en bas à droite, ses boutons de 44 px au moins) ; le reste, au demi-pixel)
// (Adapté au contrôle final du lot 5, un troisième changement voulu, qui ne
// touche pas non plus à la mise en page du téléphone : sur un écran qu'on
// touche (le TNI, les iPad), les pastilles et les tailles de la barre des
// outils font 44 × 44, et se replient dans « Couleur » quand la barre ne
// tient pas dans la hauteur ; la barre des outils n'y est donc plus celle
// d'avant. On la vérifie à part (dans l'écran, sans défiler, ses boutons de
// 44 px au moins, sa largeur d'avant) ; les autres barres, au demi-pixel.
// Au poste de la classe (souris), rien ne change, la barre des outils comprise.)
// (Adapté aux réglages par défaut, retouches après le lot 5 : la page du
// départ est blanche ; le titre du bouton du fond dit donc « Fond de la page :
// Page blanche » au lieu de « … : Petits carreaux ». Sa place et sa taille ne
// changent pas : on compare le bouton sans le nom du fond.)
const VOULU = /^Enregistrer, ouvrir ou exporter en PDF/, FOND = /^Fond de la page : /
const sansLeVoulu = (g, sansZoom, sansOutils) => {
  const c = JSON.parse(JSON.stringify(g))
  for (const b of Object.values(c)) for (const e of b?.enfants ?? []) {
    if (VOULU.test(e.q)) e.q = 'Enregistrer, ouvrir ou exporter en PDF…'
    if (FOND.test(e.q)) e.q = 'Fond de la page : …'
  }
  if (sansZoom) delete c['.barre-zoom']
  if (sansOutils) delete c['.barre-outils']
  return c
}
for (const nom of Object.keys(reference)) {
  const nomme = /^TNI/.test(nom), touche = /\(doigt\)/.test(nom)
  const a = JSON.stringify(sansLeVoulu(reference[nom], nomme, touche)), b = JSON.stringify(sansLeVoulu(maintenant[nom], nomme, touche))
  ok(a === b, `G1) ${nom} : les barres exactement celles d'avant K10 (chaque bouton, au demi-pixel)${nomme ? ', sauf la barre du zoom, qui a ses noms' : ''}${touche ? ', sauf la barre des outils (ses couleurs en 44 × 44)' : ''}`, a === b ? undefined : { avant: reference[nom], apres: maintenant[nom] })
  if (touche) {
    const o = maintenant[nom]['.barre-outils'], av = reference[nom]['.barre-outils'], [l, t, w, h] = o.b
    const H = Number(/× (\d+)/.exec(nom)[1])
    ok(l === av.b[0] && w === av.b[2] && t >= 0 && t + h <= H && o.enfants.every(e => e.b[1] >= t - 0.5 && e.b[1] + e.b[3] <= t + h + 0.5 && (e.q.startsWith('filet') || (e.b[2] >= 44 && e.b[3] >= 44))),
      `G1) ${nom} : la barre des outils à sa place et de sa largeur d'avant, dans l'écran, tous ses boutons dedans (rien ne défile), de 44 px au moins`, { avant: av.b, apres: o.b, enfants: o.enfants.map(e => e.q.slice(0, 12) + ' ' + e.b.join(',')) })
  }
  if (nomme) {
    const z = maintenant[nom]['.barre-zoom'], [l, t, w, h] = z.b
    ok(Math.abs(l + w - 1908) <= 0.5 && t + h <= 1080 && t > 900 && z.enfants.length === 4 && z.enfants.every(e => e.b[2] >= 44 && e.b[3] >= 44),
      `G1) ${nom} : la barre du zoom, avec ses noms, en bas à droite, ses quatre boutons de 44 px au moins`, z)
  }
}
for (const [nom, o] of [['PC 1366 × 768', { viewport: { width: 1366, height: 768 } }], ['iPad 1180 × 820', { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }]]) {
  const c = await nav.newContext(o)
  const p = await c.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p); await p.waitForTimeout(800)
  const r = await p.evaluate(() => ({ tel: document.body.classList.contains('telephone'), couleur: !!document.querySelector('.bouton-couleur').getClientRects().length, replie: document.querySelector('.barre-outils').classList.contains('couleurs-repliees'),
    autres: !!document.querySelector('.autres-outils').getClientRects().length, zoom: !!document.querySelector('.barre-zoom').getClientRects().length, titre: document.querySelector('.barre-haut > .bouton.points').title }))
  // (contrôle final du lot 5 : sur l'iPad couché, la barre des outils, qui
  // ne tient pas, replie ses couleurs dans « Couleur » ; ce n'est pas la mise
  // en page du téléphone : ni body.telephone, ni « Autres outils »)
  const replie = /iPad/.test(nom)
  ok(!r.tel && r.couleur === replie && r.couleur === r.replie && !r.autres && r.zoom && /^Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil/.test(r.titre), `G2) ${nom} : pas de mise en page du téléphone (${replie ? '« Couleur » seulement dans la barre repliée' : 'ni « Couleur »'}, ni « Autres outils » ; la barre du zoom ; ⋯ garde son titre)`, r)
  await c.close()
}

await nav.close()
ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
console.log(`\n${echecs ? `ÉCHECS : ${echecs}` : 'tout est vert'}`)
process.exit(echecs ? 1 : 0)
