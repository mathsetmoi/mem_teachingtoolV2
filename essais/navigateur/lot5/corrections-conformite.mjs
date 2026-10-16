// ESSAI DES CORRECTIONS « CONFORMITÉ » DU LOT 5 (rapport de vérification
// « conformité », sept constats ; deux étaient déjà corrigés avant ce
// morceau : Alt + ← / ⌘ + ← dans la revue, la trieuse et la séance (par les
// corrections « appareils », essai lot5/corrections-appareils.mjs, B), et la
// case du PDF qui nomme le fond (par les corrections « affichage », essai
// lot5/corrections-affichage.mjs, D) ; on les revérifie ici d'un coup d'œil).
// A. « Noms sous les outils » : la barre du zoom a ses noms (« Dézoomer »,
//    « Zoomer », « Tout voir » ; le pourcentage se lit déjà) au TNI, où ils
//    sont allumés d'office ; cachés au poste de la classe, où la barre du
//    zoom garde exactement sa taille ; ses boutons marchent encore.
// B. Le téléphone : dans les fenêtres (éditeur de formule, Exporter en PDF,
//    Envoyer vers…, Publier, Nouveau classeur, Nouveau dossier) et la
//    bibliothèque, tout ce qui se touche fait 44 px au moins (les raccourcis
//    LaTeX, Annuler, Mettre à jour, Exporter, les cases, le tri, Créer un
//    dossier de classe, Plus tard, les couleurs d'un dossier), et rien ne
//    sort de l'écran ; de 320 × 568 à 844 × 390. Au poste de la classe, rien
//    ne change (les boutons des fenêtres gardent leurs 42 px, les raccourcis
//    leurs 38). L'éditeur de formule, plus haut au téléphone, remonte pour
//    que ses boutons restent dans l'écran (à 320 × 568 et couché, ils
//    sortaient par le bas avant ce morceau), et défile sur 568 × 320 ; au
//    poste de la classe, il est à sa place d'avant, en bas de l'écran aussi.
// C. Le bouton ⋯ de la barre du haut dit qu'il a les réglages de cet
//    appareil : son titre et son nom lu « Enregistrer, ouvrir ou exporter
//    en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P) », son
//    menu aussi ; son nom court reste « Fichier » ; au téléphone, « Plus : la
//    page, les outils de cours, le classeur, cet appareil ».
// D. L'ordre : le menu dit le calque pour l'écriture et les figures (« Devant
//    l'écriture et les figures ; les formules restent au-dessus », « Derrière
//    l'écriture et les figures ; les images restent dessous »), pour une
//    sélection mêlée (« Chacun dans son calque : … »), et pour l'arrière-plan
//    d'une formule ; une image seule garde l'aide d'avant.
// E. Sortir un objet d'un groupe sans clavier : le ⋯ du menu d'un membre
//    pris seul a la section « Groupe » et « Sortir du groupe » (Ctrl + Maj +
//    G), sur l'iPad (second toucher, appui long, ⋯) et à la souris (second
//    clic, clic droit) ; il sort seul (les autres restent groupés), un
//    Ctrl + Z le remet d'un coup ; d'un groupe de deux, l'autre n'est plus
//    groupé non plus, et l'aide le dit ; ni un objet sans groupe ni un
//    groupe pris entier n'ont cette section ; le titre du ⋯ le dit.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/corrections-conformite/essai'
const DEV = 'http://localhost:5173/'
mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 600) : '')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function ouvrir(o, nom) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  const p = await c.newPage(); suivre(p, nom)
  await p.goto(DEV)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
  await p.waitForTimeout(500)
  await p.evaluate(() => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  return { c, p }
}
const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage(); a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const poser = (p, f) => p.evaluate(f => {
  const a = window.__app, t = a.tableau
  const id = 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}, f)
const trait = (x, y, l) => { const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5); return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false } }
const triangle = (x, y) => ({ type: 'polygone', x, y, pts: [0, 150, 200, 150, 0, 0], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'] })
const formule = (x, y) => ({ type: 'formule', x, y, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 40 })
const imageVerte = p => p.evaluate(() => {
  const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d'); g.fillStyle = '#00c000'; g.fillRect(0, 0, 60, 40)
  window.__app.tableau.doc.getMap('images').set('cc-vert', cv.toDataURL('image/png'))
})
const ecran = (p, x, y) => p.evaluate(({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }, { x, y })
const sel = p => p.evaluate(() => [...window.__app.selection])
const groupes = (p, ids) => p.evaluate(ids => ids.map(id => window.__app.forme(id)?.groupe ?? null), ids)
const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
const msgs = p => p.evaluate(() => window.__msgs.slice())
const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
/** Les lignes du menu ⋯ du menu complet */
const MENU_PLUS = () => {
  const m = document.querySelector('.menu-plus')
  if (!m || m.hidden) return null
  return [...m.children].map(e => e.classList.contains('menu-titre') ? { titre: e.textContent } : e.classList.contains('menu-filet') ? { filet: true }
    : { t: e.querySelector('.libelle')?.firstChild?.textContent, aide: e.querySelector('small')?.textContent ?? null, touche: e.querySelector('.touche')?.textContent ?? null, inactif: e.getAttribute('aria-disabled') === 'true', action: e.dataset.action ?? null })
}
const echap = async p => { for (let i = 0; i < 2; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) } }

// =====================================================================
console.log('=== A. les noms sous les outils : la barre du zoom ===')
const ZOOM = () => {
  const z = document.querySelector('.barre-zoom'), r = z.getBoundingClientRect()
  return {
    noms: document.body.classList.contains('noms-outils'),
    boite: [r.left, r.top, r.width, r.height].map(v => Math.round(v * 2) / 2),
    boutons: [...z.querySelectorAll(':scope > button')].map(b => {
      const l = b.querySelector(':scope > .libelle'), q = b.getBoundingClientRect()
      return { titre: b.title, texte: b.textContent, mot: l?.dataset.libelle ?? null, vu: l ? getComputedStyle(l).display !== 'none' && getComputedStyle(l, '::before').content : null, l: q.width, h: q.height }
    }),
    l: innerWidth, h: innerHeight,
  }
}
{
  const { c, p } = await ouvrir({ viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true }, 'TNI')
  const z = await p.evaluate(ZOOM)
  const [moins, pct, plus, tout] = z.boutons
  ok(z.noms, 'A1) Au TNI (1920 × 1080, tactile), les noms sous les outils sont allumés d\'office', z)
  ok(moins?.mot === 'Dézoomer' && plus?.mot === 'Zoomer' && tout?.mot === 'Tout voir' && [moins, plus, tout].every(b => b.vu === '"' + b.mot + '"'),
    'A2) … la barre du zoom a les siens, visibles : « Dézoomer », « Zoomer », « Tout voir »', z.boutons)
  ok(pct?.mot === null && /%/.test(pct?.texte ?? ''), 'A3) … le pourcentage n\'en a pas (il se lit déjà)', pct)
  ok([moins, plus, tout].every(b => b.texte === '' && !/Dézoomer|Zoomer|Tout voir/.test(b.texte)) && moins.titre === 'Dézoomer (Ctrl + −)' && tout.titre === 'Tout voir (Maj + 1)',
    'A4) … le texte des boutons reste vide, leurs titres ne changent pas', z.boutons.map(b => [b.texte, b.titre]))
  const [l, t, w, h] = z.boite
  ok(z.boutons.every(b => b.l >= 44 && b.h >= 44) && Math.abs(l + w - (z.l - 12)) <= 0.5 && t + h <= z.h && t >= z.h - 80,
    'A5) … ses boutons font 44 px au moins, la barre reste en bas à droite, dans l\'écran', z)
  const chev = await p.evaluate(() => {
    const b = s => document.querySelector(s).getBoundingClientRect()
    const zo = b('.barre-zoom')
    return ['.barre-outils', '.barre-haut', '.retour-contenu'].filter(s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length) return false; const r = e.getBoundingClientRect(); return r.left < zo.right && zo.left < r.right && r.top < zo.bottom && zo.top < r.bottom })
  })
  ok(!chev.length, 'A6) … elle ne touche ni la barre des outils, ni la barre du haut', chev)
  // Ils marchent encore : Zoomer, Tout voir
  const z0 = await p.evaluate(() => window.__app.cam.z)
  await p.locator('.barre-zoom > button[title^="Zoomer"]').tap(); await p.waitForTimeout(250)
  const z1 = await p.evaluate(() => window.__app.cam.z)
  ok(Math.abs(z1 / z0 - 1.25) < 0.01, 'A7) … « Zoomer » zoome encore (× 1,25)', { z0, z1 })
  await p.screenshot({ path: D + '/A-tni.png' })
  // L'aide de l'entrée du menu ⋯ dit vrai : « Un mot sous chaque bouton des barres »
  await p.locator('.barre-haut > .bouton.points').tap(); await p.waitForTimeout(300)
  const aide = await p.evaluate(() => document.querySelector('.menu-flottant:not([hidden]) [data-action="noms-outils"] small')?.textContent)
  ok(aide === 'Un mot sous chaque bouton des barres', 'A8) … l\'aide de « Noms sous les outils » : « Un mot sous chaque bouton des barres »', aide)
  await c.close()
}
{
  const { c, p } = await ouvrir({}, 'PC')
  const z = await p.evaluate(ZOOM)
  ok(!z.noms && JSON.stringify(z.boite) === JSON.stringify([1138, 698, 216, 58]) && z.boutons.every(b => b.vu === false || b.vu === null) && z.boutons.filter(b => b.mot).length === 3,
    'A9) Au poste de la classe (1366 × 768), noms éteints : la barre du zoom garde exactement sa place et sa taille (216 × 58), les mots sont là mais cachés', z)
  await c.close()
}

// =====================================================================
console.log('=== B. le téléphone : 44 px dans les fenêtres et la bibliothèque ===')
const MESURER = () => {
  const W = innerWidth, H = innerHeight, petits = [], dehors = []
  const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  for (const b of document.querySelectorAll('button, [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], input:not([type=hidden]), select, a[href], [role=button], [role=tab]')) {
    if (!vis(b) || b.closest('[hidden]')) continue
    const r = b.getBoundingClientRect()
    const radio = b.type === 'checkbox' || b.type === 'radio'
    // caché sous une autre (une fenêtre modale au-dessus) : ne compte pas
    const cx = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(H - 1, Math.max(0, r.top + r.height / 2))
    const dessus = document.elementFromPoint(cx, cy)
    if (!radio && dessus && !b.contains(dessus) && !dessus.contains(b) && r.left >= 0 && r.right <= W && r.top >= 0 && r.bottom <= H) continue
    const nom = (b.getAttribute('aria-label') || b.title || b.textContent || b.type || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    const boite = radio ? (b.closest('label') ?? b).getBoundingClientRect() : r
    if (radio) { if (boite.height < 43.5 || boite.width < 43.5) petits.push(`[case] ${nom} ${Math.round(boite.width)}×${Math.round(boite.height)}`) }
    else if (b.type === 'text' || b.type === 'search' || b.type === 'number' || b.tagName === 'TEXTAREA') { if (r.height < 43.5) petits.push(`[champ] ${nom} h=${Math.round(r.height)}`) }
    else if (r.width < 43.5 || r.height < 43.5) petits.push(`${nom} ${Math.round(r.width)}×${Math.round(r.height)} [${String(b.className).slice(0, 30)}]`)
    if (boite.left < -0.5 || boite.top < -0.5 || boite.right > W + 0.5 || boite.bottom > H + 0.5) {
      let q = b.parentElement, defile = false
      while (q) { const s = getComputedStyle(q); if (/auto|scroll/.test(s.overflowY + s.overflowX) && (q.scrollHeight > q.clientHeight || q.scrollWidth > q.clientWidth)) { defile = true; break } q = q.parentElement }
      if (!defile) dehors.push(`${nom} [${Math.round(boite.left)},${Math.round(boite.top)},${Math.round(boite.right)},${Math.round(boite.bottom)}]`)
    }
  }
  return { petits, dehors, deborde: document.documentElement.scrollWidth > W }
}
const VUES = [
  ['l\'éditeur de formule', p => p.evaluate(() => { window.__app.ui.editerFormule('x^2', 100, 300) }), '.raccourci'],
  ['Exporter en PDF', p => p.keyboard.press('Control+p'), '.dialogue-pdf .case'],
  ['Envoyer vers…', p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add(window.__trait); a.ui.ouvrirEnvoi([window.__trait]) }), '.dialogue-envoi .case'],
  ['Publier', p => p.evaluate(() => window.__app.ui.publication.ouvrir()), '.dialogue-publier .principal'],
  ['la bibliothèque', p => p.evaluate(() => window.__app.ui.ouvrirBibliotheque()), '.biblio-tri'],
  ['Nouveau classeur', async p => { await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForTimeout(800); await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /Nouveau classeur/.test(b.textContent + b.getAttribute('aria-label')) && b.getClientRects().length).click()) }, '.dialogue-nouveau .principal'],
  ['Nouveau dossier', async p => { await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForTimeout(800); await p.evaluate(() => [...document.querySelectorAll('button')].find(b => /dossier/i.test(b.textContent + b.getAttribute('aria-label')) && b.getClientRects().length).click()) }, '.pastille-couleur'],
]
for (const [w, h] of [[320, 568], [390, 844], [844, 390], [568, 320]]) {
  const { c, p } = await ouvrir({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, `${w}x${h}`)
  await p.evaluate(id => { window.__trait = id }, await poser(p, trait(40, 200, 150)))
  for (const [nom, faire, temoin] of VUES) {
    await faire(p); await p.waitForTimeout(800)
    const m = await p.evaluate(MESURER)
    const t = await p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height)), temoin)
    ok(t.length > 0 && !m.petits.length && !m.dehors.length && !m.deborde, `B) ${w} × ${h}, ${nom} : tout ce qui se touche fait 44 px au moins, rien ne sort de l'écran (${temoin} : ${[...new Set(t)].join(', ')} px)`, { m, t })
    if (w === 320 && /dossier|formule/.test(nom)) await p.screenshot({ path: D + `/B-${w}-${nom.replace(/\W+/g, '-')}.png` })
    // (l'éditeur de formule, qui n'est pas une fenêtre modale, ne se ferme
    // pas par Échap, depuis le lot 1 : par son bouton « Annuler »)
    await p.evaluate(() => document.querySelector('dialog[open].dialogue-formule .secondaire')?.click())
    for (let i = 0; i < 3; i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
  }
  await c.close()
}
{
  // Au poste de la classe, les fenêtres ne changent pas
  const { c, p } = await ouvrir({}, 'PC fenêtres')
  await p.evaluate(() => { window.__app.ui.editerFormule('x^2', 100, 300) }); await p.waitForTimeout(600)
  const r = await p.evaluate(() => ({ raccourci: [...document.querySelectorAll('.raccourci')].map(e => e.getBoundingClientRect().height), boutons: [...document.querySelectorAll('dialog[open] .principal, dialog[open] .secondaire')].map(e => e.getBoundingClientRect().height) }))
  const place = await p.evaluate(() => { const d = document.querySelector('dialog[open].dialogue-formule'); return { top: d.style.top, left: d.style.left, maxH: d.style.maxHeight } })
  ok(r.raccourci.length && r.raccourci.every(v => v === 38) && r.boutons.length && r.boutons.every(v => v === 42) && place.top === '316px' && place.left === '100px' && !place.maxH,
    'B) Au poste de la classe, l\'éditeur de formule est celui d\'avant (raccourcis de 38 px, boutons de 42, à sa place : 100, 316)', { r, place })
  // Une formule tout en bas de l'écran : à sa place d'avant aussi (ses
  // boutons y sont dans l'écran ; passeB-b10 touche juste au-dessus)
  await p.evaluate(() => document.querySelector('dialog[open].dialogue-formule .secondaire')?.click()); await p.waitForTimeout(200)
  await p.evaluate(() => { window.__app.ui.editerFormule('x^2', 100, 720) }); await p.waitForTimeout(600)
  const bas = await p.evaluate(() => { const d = document.querySelector('dialog[open].dialogue-formule'); return { top: d.style.top, maxH: d.style.maxHeight, boutons: Math.round(d.querySelector('.actions').getBoundingClientRect().bottom) } })
  ok(bas.top === '438px' && !bas.maxH && bas.boutons <= 768, 'B) … pour une formule tout en bas, à sa place d\'avant (316 → 438 : innerHeight − 330), ses boutons dans l\'écran', bas)
  await c.close()
}

// =====================================================================
console.log('=== C. le bouton ⋯ dit les réglages de cet appareil ===')
{
  const { c, p } = await ouvrir({}, 'PC titre')
  const b = await p.evaluate(() => { const b = document.querySelector('.barre-haut > .bouton.points'); return { titre: b.title, aria: b.getAttribute('aria-label'), mot: b.querySelector('.libelle')?.dataset.libelle } })
  ok(b.titre === 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P)' && b.aria === b.titre && b.mot === 'Fichier',
    'C1) Le bouton ⋯ : « Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P) » (titre et nom lu) ; son nom court reste « Fichier »', b)
  await p.locator('.barre-haut > .bouton.points').click(); await p.waitForTimeout(300)
  const m = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(e => !e.hidden && e.querySelector('[data-action="contraste"]')); return m && { aria: m.getAttribute('aria-label'), titres: [...m.querySelectorAll('.menu-titre')].map(e => e.textContent) } })
  ok(m?.aria === 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil' && m.titres.includes('Cet appareil'), 'C2) … son menu « Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil », avec « Cet appareil »', m)
  await c.close()
}
{
  const { c, p } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'tel titre')
  const t = await p.evaluate(() => document.querySelector('.barre-haut > .bouton.points').title)
  ok(t === 'Plus : la page, les outils de cours, le classeur, cet appareil', 'C3) Au téléphone : « Plus : la page, les outils de cours, le classeur, cet appareil »', t)
  await c.close()
}

// =====================================================================
console.log('=== D. l\'ordre : le menu dit le calque ===')
{
  const { c, p } = await ouvrir({}, 'PC ordre')
  await p.evaluate(PAGE_NEUVE)
  await imageVerte(p)
  const F = await poser(p, formule(300, 200))
  const T = await poser(p, trait(280, 240, 260))
  const I = await poser(p, { type: 'image', src: 'cc-vert', x: 600, y: 200, l: 60, h: 40, m: [2, 0, 0, 2] })
  await p.waitForTimeout(200)
  const menuPlus = async ids => {
    await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); if (ids.length === 1) a.ouvrirOptions(a.forme(ids[0])); else a.ouvrirOptionsSelection(); a.ui.maj() }, ids)
    await p.waitForTimeout(200)
    await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(150)
    const m = await p.evaluate(MENU_PLUS)
    await echap(p)
    return m ?? []
  }
  const aides = m => Object.fromEntries(m.filter(e => /plan$/.test(e.t ?? '')).map(e => [e.t, e.aide]))
  let a = aides(await menuPlus([T]))
  ok(a['Mettre au premier plan'] === 'Devant l\'écriture et les figures ; les formules restent au-dessus' && a['Mettre à l\'arrière-plan'] === 'Derrière l\'écriture et les figures ; les images restent dessous',
    'D1) Un trait (sous une formule) : « Devant l\'écriture et les figures ; les formules restent au-dessus », « Derrière l\'écriture et les figures ; les images restent dessous »', a)
  a = aides(await menuPlus([T, I]))
  ok(a['Mettre au premier plan'] === 'Chacun dans son calque : images, puis écriture et figures, puis formules' && a['Mettre à l\'arrière-plan'] === null,
    'D2) Un trait et une image : « Chacun dans son calque : images, puis écriture et figures, puis formules »', a)
  a = aides(await menuPlus([F]))
  ok(a['Mettre au premier plan'] === 'Devant les autres formules ; les formules restent au-dessus de tout' && a['Mettre à l\'arrière-plan'] === 'Derrière les autres formules, toujours au-dessus de l\'écriture et des figures',
    'D3) Une formule : l\'aide d\'avant, et « Derrière les autres formules, toujours au-dessus de l\'écriture et des figures »', a)
  a = aides(await menuPlus([I]))
  ok(a['Mettre au premier plan'] === 'Devant les autres images ; l\'écriture et les figures restent devant' && a['Mettre à l\'arrière-plan'] === null, 'D4) Une image : l\'aide d\'avant, rien de plus', a)
  await c.close()
}

// =====================================================================
console.log('=== E. sortir un objet d\'un groupe sans clavier ===')
{
  // L'iPad (doigt) : second toucher, appui long, ⋯
  const { c, p } = await ouvrir({ viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: true, screen: { width: 1024, height: 1366 } }, 'iPad groupe')
  await p.evaluate(PAGE_NEUVE)
  const T1 = await poser(p, trait(200, 200, 150)), T2 = await poser(p, trait(200, 300, 150)), Tri = await poser(p, triangle(450, 150))
  await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.grouper() }, [T1, T2, Tri])
  await vider(p)
  const g0 = await groupes(p, [T1, T2, Tri])
  ok(g0[0] && g0.every(g => g === g0[0]), 'E0) Trois objets groupés', g0)
  const tap = async (x, y) => { const s = await ecran(p, x, y); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(450) }
  await tap(275, 300); await tap(275, 300)
  ok(JSON.stringify(await sel(p)) === JSON.stringify([T2]), 'E1) iPad : un second toucher ne prend que ce membre', await sel(p))
  const s = await ecran(p, 275, 300)
  const cdp = await c.newCDPSession(p)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y, id: 1 }] }); await p.waitForTimeout(800)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(350)
  const panneau = await p.evaluate(() => { const pn = document.querySelector('.panneau-forme'); return { vu: !pn.hidden, plus: pn.querySelector('.ligne button.plus')?.title ?? null } })
  ok(panneau.vu && panneau.plus === 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page, premier plan, arrière-plan, verrouiller, sortir du groupe',
    'E2) … son menu (appui long) : le titre de ⋯ dit « …, sortir du groupe »', panneau)
  await p.locator('.panneau-forme .ligne button.plus').tap(); await p.waitForTimeout(300)
  const m = await p.evaluate(MENU_PLUS) ?? []
  const iG = m.findIndex(e => e.titre === 'Groupe'), sortir = m.find(e => e.t === 'Sortir du groupe')
  ok(iG > 0 && m[iG - 1].filet && m[iG + 1]?.t === 'Sortir du groupe' && sortir.touche === 'Ctrl + Maj + G' && sortir.aide === 'Les autres restent groupés' && sortir.action === 'sortir-du-groupe' && !sortir.inactif
    && m.findIndex(e => e.titre === 'Protéger') < iG,
    'E3) … son ⋯ : après « Protéger », un filet, « Groupe » : « Sortir du groupe » (Ctrl + Maj + G ; « Les autres restent groupés »)', m)
  const n0 = await pile(p)
  await p.evaluate(() => { window.__msgs = [] })
  await p.locator('.menu-plus .menu-item', { hasText: 'Sortir du groupe' }).tap(); await p.waitForTimeout(300)
  const g1 = await groupes(p, [T1, T2, Tri])
  ok(g1[1] === null && g1[0] === g0[0] && g1[2] === g0[0] && (await msgs(p)).includes('Dégroupé') && await pile(p) === n0 + 1 && JSON.stringify(await sel(p)) === JSON.stringify([T2]),
    'E4) … le toucher : lui seul sort du groupe (les deux autres restent groupés), « Dégroupé », une étape d\'annulation, il reste pris', { g1, msgs: await msgs(p), pile: [n0, await pile(p)] })
  await p.evaluate(() => window.__app.annuler()); await p.waitForTimeout(200)
  ok(JSON.stringify(await groupes(p, [T1, T2, Tri])) === JSON.stringify(g0), 'E5) … Ctrl + Z le remet dans son groupe, d\'un coup', await groupes(p, [T1, T2, Tri]))
  await p.screenshot({ path: D + '/E-ipad.png' })
  await c.close()
}
{
  // La souris : second clic, clic droit, ⋯ ; un groupe de deux ; les cas sans la section
  const { c, p } = await ouvrir({}, 'PC groupe')
  await p.evaluate(PAGE_NEUVE)
  const A = await poser(p, trait(200, 200, 150)), B = await poser(p, trait(200, 300, 150)), L = await poser(p, trait(200, 450, 150))
  await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.grouper() }, [A, B])
  await vider(p)
  const clic = async (x, y, o) => { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, o); await p.waitForTimeout(o?.button === 'right' ? 250 : 650) }
  await clic(275, 200); await clic(275, 200)
  ok(JSON.stringify(await sel(p)) === JSON.stringify([A]), 'E6) Souris : un second clic ne prend que ce membre (groupe de deux)', await sel(p))
  await clic(275, 200, { button: 'right' })
  await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(250)
  let m = await p.evaluate(MENU_PLUS) ?? []
  const sortir = m.find(e => e.t === 'Sortir du groupe')
  ok(sortir?.aide === 'L\'autre n\'est plus groupé non plus' && sortir.touche === 'Ctrl + Maj + G', 'E7) … son menu (clic droit), ⋯ : « Sortir du groupe », « L\'autre n\'est plus groupé non plus »', m)
  await p.locator('.menu-plus .menu-item', { hasText: 'Sortir du groupe' }).click(); await p.waitForTimeout(300)
  ok(JSON.stringify(await groupes(p, [A, B])) === '[null,null]', 'E8) … le clic : plus de groupe du tout (un groupe d\'un seul n\'en est plus un)', await groupes(p, [A, B]))
  await p.evaluate(() => window.__app.annuler()); await p.waitForTimeout(200)
  const gAB = await groupes(p, [A, B])
  ok(gAB[0] && gAB[0] === gAB[1], 'E9) … Ctrl + Z : les deux regroupés', gAB)
  await echap(p); await vider(p)
  // Un objet sans groupe : pas de section « Groupe »
  await clic(275, 450); await clic(275, 450, { button: 'right' })
  await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(250)
  m = await p.evaluate(MENU_PLUS) ?? []
  const titreSeul = await p.evaluate(() => document.querySelector('.panneau-forme .ligne button.plus')?.title)
  ok(!m.some(e => e.titre === 'Groupe' || e.t === 'Sortir du groupe') && titreSeul === 'Plus : copier en image (ENT, Pronote), envoyer vers une autre page, premier plan, arrière-plan, verrouiller',
    'E10) Un objet sans groupe : ni « Groupe » ni « Sortir du groupe », le titre de ⋯ d\'avant', { m, titreSeul })
  await echap(p); await vider(p)
  // Le groupe pris entier : son menu commun a « Dégrouper » dans la rangée, son ⋯ pas de « Groupe »
  await clic(275, 200); await clic(275, 200, { button: 'right' })
  const commun = await p.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].map(b => b.textContent))
  await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(250)
  m = await p.evaluate(MENU_PLUS) ?? []
  ok(JSON.stringify((await sel(p)).sort()) === JSON.stringify([A, B].sort()) && commun.includes('Dégrouper') && !m.some(e => e.titre === 'Groupe'),
    'E11) Le groupe pris entier : « Dégrouper » dans la rangée, pas de section « Groupe » dans ⋯', { commun, m })
  await c.close()
}

// =====================================================================
console.log('=== F. déjà corrigés : Alt + ← dans la revue, la case du PDF ===')
{
  const { c, p } = await ouvrir({}, 'PC déjà')
  await p.evaluate(PAGE_NEUVE)
  await poser(p, trait(200, 200, 150)); await poser(p, trait(200, 260, 150))
  await p.evaluate(() => { window.__prev = []; addEventListener('keydown', e => { if (e.key === 'ArrowLeft') setTimeout(() => window.__prev.push(e.defaultPrevented), 0) }, true) })
  await p.locator('.barre-haut button[title^="Revoir la construction"]').click(); await p.waitForTimeout(900)
  await p.keyboard.press('Alt+ArrowLeft'); await p.waitForTimeout(120)
  const prev = await p.evaluate(() => window.__prev)
  ok(prev.length === 1 && prev[0] === true, 'F1) Dans la revue, Alt + ← est empêché (il ne quitte plus MEM)', prev)
  await echap(p)
  await p.evaluate(() => window.__app.changerFond('pointe'))
  await p.waitForTimeout(200)
  await p.keyboard.press('Control+p'); await p.waitForTimeout(600)
  const caseFond = await p.evaluate(() => document.querySelector('dialog[open] .pdf-fond')?.textContent.trim())
  ok(/^Imprimer le fond de la page/.test(caseFond ?? '') && !/carreaux, Seyès, repère\)$/.test(caseFond), 'F2) La case du PDF ne dit plus « (carreaux, Seyès, repère) » pour tous les fonds', caseFond)
  await c.close()
}

ok(!erreurs.length, 'Aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'Tout est vert.')
process.exit(echecs ? 1 : 0)
