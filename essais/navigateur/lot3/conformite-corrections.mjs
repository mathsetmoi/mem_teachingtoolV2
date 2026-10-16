// Essais au navigateur des corrections « conformite » du lot 3 :
// 1. barre : le nom d'une page dans le compteur ne fait bouger aucun bouton
//    de la barre du haut, à 1024 × 768 (vidéoprojecteur), 1180 × 820 (iPad
//    paysage), 1366 × 768 et 820 × 1180 (iPad portrait), avec un nom court
//    et un nom long ; trois clics sur ‹ au même endroit mènent de la page 4
//    à la page 1 (le compteur ne vient pas sous le pointeur) ; deux clics
//    sur « Nouvelle page » au même endroit, partis d'une page nommée,
//    ajoutent deux pages (la poubelle ne vient pas sous le pointeur). Déjà
//    corrigé par « corrections appareils » : cet essai le garde ;
// 2. inserer : « Insérer une page après… » d'une vignette propose le fond
//    (les quatre, celui de la voisine coché et sous le focus) ; un autre
//    fond choisi : la page neuve l'a, en UNE action (un Annuler la retire) ;
//    au clavier, Entrée prend celui de la voisine ; le second clic d'un
//    double-clic sur « Insérer… » n'insère rien ;
// 3. aria : la vignette d'une page vide se dit « Page 5, vide » au lecteur
//    d'écran (arbre d'accessibilité), celle d'une page écrite non ;
// 4. fichier : le bouton ⋯ et son menu disent « exporter en PDF » ;
// 5. pdfvide : dans le menu d'une vignette d'une page vide, « Exporter en
//    PDF… » est grisé comme « Copier en image » (un clic n'ouvre rien) ;
//    actif sur une page écrite ;
// 6. choisir : « Choisir plusieurs » (au doigt) garde son nom, et le README
//    dit pourquoi ce n'est pas « Ajouter ».
// (Adapté aux réglages par défaut, retouches après le lot 5 : le second temps
// d'« Insérer une page… » coche d'office la page blanche, sous le focus et
// sous le pointeur, quel que soit le fond de la voisine ; Entrée, ou un second
// clic au même endroit, la prend. Les pages que prépare l'essai sont
// blanches aussi. Le reste est inchangé.)
// Serveur de développement sur :5173 (ou MEM_URL). Une ligne « OK … » ou
// « ÉCHEC … » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS. node conformite-corrections.mjs [section…]
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const URL0 = process.env.MEM_URL || 'http://localhost:5173/'
const README = process.env.MEM_README || `${RACINE_DEPOT}/README.md`
const D = `${RACINE_ESSAIS}/lot3/conformite/sorties`
mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : ''}`)
}
const erreurs = []
const nav = await chromium.launch()
const pause = ms => new Promise(r => setTimeout(r, ms))

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

/** n pages, un trait sur chacune (sauf les `vides`) ; des noms ; on regarde la page `ici` */
const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici, vides }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    if ((vides || []).includes(k)) continue
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici, vides: o.vides })

const etat = page => page.evaluate(() => {
  const a = window.__app, tr = document.querySelector('.trieuse')
  const m = [...document.querySelectorAll('.trieuse .menu-vignette')].find(x => !x.hidden)
  return {
    ouverte: !!tr && !tr.hidden, page: a.page, pages: a.pages.slice(),
    fonds: a.pages.map(p => a.tableau.fondDe(p)),
    msgs: (window.__msgs || []).slice(),
    menu: m ? m.getAttribute('aria-label') : null,
    entrees: m ? [...m.querySelectorAll('.menu-item')].map(b => ({ t: b.querySelector('.libelle')?.firstChild?.textContent ?? '', coche: b.getAttribute('aria-checked'), inactif: b.getAttribute('aria-disabled') === 'true', focus: document.activeElement === b })) : [],
    titre: m?.querySelector('.menu-titre')?.textContent ?? null,
    dialog: [...document.querySelectorAll('dialog[open]')].map(d => d.className),
  }
})
const entree = (page, texte) => page.locator('.trieuse .menu-vignette:not([hidden]) .menu-item', { hasText: texte })
const ouvrirTrieuse = async page => {
  await page.keyboard.press('Shift+P')
  await page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 })
  await pause(500)
}

// =============== 1. La barre du haut ne bouge pas avec le nom d'une page ===============
if (faire('barre')) {
  const releve = page => page.evaluate(() => {
    const b = [...document.querySelectorAll('.barre-haut > *')].filter(x => x.offsetParent && !x.classList.contains('rang'))
    return { boutons: Object.fromEntries(b.map(x => [x.getAttribute('aria-label')?.replace(/ :.*/, '').slice(0, 22) ?? x.className, [Math.round(x.getBoundingClientRect().left), Math.round(x.getBoundingClientRect().top)]])),
      hauteur: Math.round(document.querySelector('.barre-haut').getBoundingClientRect().height),
      rang: Math.round(document.querySelector('.rang').getBoundingClientRect().width) }
  })
  for (const nom of ['Exercice 12 p. 84', 'Exercice 12 p. 84 et exercice 13 p. 85 (correction du DS)']) {
    for (const [l, h, toucher] of [[1024, 768, true], [1180, 820, true], [1366, 768, false], [820, 1180, true]]) {
      const { ctx, page } = await ouvrir({ viewport: { width: l, height: h }, hasTouch: toucher }, `${l}`)
      await preparer(page, 3, { ici: 0, noms: { 1: nom } })
      await pause(300)
      const sans = await releve(page)
      await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[1]) }); await pause(300)
      const avec = await releve(page)
      await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[2]) }); await pause(300)
      const derniere = await releve(page)
      // « › » change de nom sur la dernière page : on compare les positions dans l'ordre
      const pos = r => Object.values(r.boutons).map(p => p.join(',')).join(' ')
      const bouges = Object.keys(sans.boutons).filter(k => avec.boutons[k] && avec.boutons[k].join() !== sans.boutons[k].join()).map(k => `${k}: ${sans.boutons[k]} → ${avec.boutons[k]}`)
      verifier(`${l} × ${h}, nom de ${nom.length} caractères : de la page 1 (sans nom) à la page 2 (nommée) puis à la 3, aucun bouton de la barre du haut ne bouge, la barre garde ses rangées`,
        !bouges.length && pos(sans) === pos(derniere) && sans.hauteur === avec.hauteur && sans.rang === avec.rang, { bouges, sans, avec, derniere })
      if (l === 1024 && nom.length < 20) await page.screenshot({ path: `${D}/barre-${l}.png`, clip: { x: 0, y: 0, width: l, height: 130 } })
      await ctx.close()
    }
  }
  // ‹ trois fois au même endroit : de la page 4 à la page 1, sans ouvrir la trieuse
  {
    const { ctx, page } = await ouvrir({}, 'precedente')
    await preparer(page, 4, { noms: { 1: 'Exercice 12 p. 84' }, ici: 3 })
    await pause(300)
    const p = await page.evaluate(() => { const r = document.querySelector('.barre-haut button[title^="Page précédente"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    const vus = []
    for (let k = 0; k < 3; k++) {
      await page.mouse.click(p.x, p.y); await pause(800)
      const e = await etat(page)
      vus.push(e.ouverte ? 'trieuse' : e.pages.indexOf(e.page) + 1)
      if (e.ouverte) break
    }
    verifier('1366 × 768 : trois clics sur ‹ au même endroit mènent de la page 4 à la page 1 (par la page 2 nommée), sans ouvrir la trieuse', JSON.stringify(vus) === '[3,2,1]', vus)
    await ctx.close()
  }
  // « Nouvelle page » deux fois au même endroit, depuis une page nommée, à 1024 × 768
  {
    const { ctx, page } = await ouvrir({ viewport: { width: 1024, height: 768 } }, 'nouvelle')
    await preparer(page, 2, { ici: 1, noms: { 1: 'Exercice 12 p. 84' } })
    await pause(300)
    const p = await page.evaluate(() => { const r = document.querySelector('.barre-haut button[aria-label="Nouvelle page"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    await page.mouse.click(p.x, p.y); await pause(800)
    const sous = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label'), p)
    await page.mouse.click(p.x, p.y); await pause(500)
    const e = await etat(page)
    verifier('1024 × 768 : deux clics sur « Nouvelle page » au même endroit, depuis la page nommée, ajoutent deux pages (la poubelle ne vient pas sous le pointeur)', e.pages.length === 4 && sous === 'Nouvelle page', { pages: e.pages.length, sous, msg: e.msgs.at(-1) })
    await ctx.close()
  }
}

// =============== 2. Insérer une page : le fond se choisit ===============
if (faire('inserer')) {
  const { ctx, page } = await ouvrir({}, 'inserer')
  const P = await preparer(page, 2, { ici: 0 })
  await page.evaluate(id => window.__app.tableau.changerFond(id, 'seyes'), P[1])
  await ouvrirTrieuse(page)
  // Le menu de la vignette 2 (Seyès)
  await page.locator('.trieuse .carte').nth(1).locator('.carte-options').click(); await pause(200)
  let e = await etat(page)
  const libelles = e.entrees.map(x => x.t)
  verifier('Le menu d\'une vignette : « Insérer une page avant… » et « Insérer une page après… » (le fond se choisit ensuite)', libelles.includes('Insérer une page avant…') && libelles.includes('Insérer une page après…'), libelles)
  const menuAvant = await page.evaluate(() => { const r = document.querySelector('.trieuse .menu-vignette').getBoundingClientRect(); return { x: Math.round(r.left), l: Math.round(r.width) } })
  const bi = await entree(page, 'Insérer une page après').boundingBox()
  const clic = { x: bi.x + bi.width / 2, y: bi.y + bi.height / 2 }
  await page.mouse.click(clic.x, clic.y); await pause(200)
  e = await etat(page)
  const menuApres = await page.evaluate(() => { const r = document.querySelector('.trieuse .menu-vignette').getBoundingClientRect(); return { x: Math.round(r.left), l: Math.round(r.width) } })
  const sousLeClic = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.menu-item')?.querySelector('.libelle')?.firstChild?.textContent, clic)
  verifier('« Insérer une page après… » : le même menu (même bord gauche, même largeur) propose les huit fonds (lot 5, K8 : quatre de plus), Page blanche cochée (la voisine est en Seyès), sous le focus et sous le pointeur ; rien n\'est encore inséré',
    e.pages.length === 2 && e.menu && JSON.stringify(e.entrees.map(x => x.t)) === JSON.stringify(['Page blanche', 'Petits carreaux', 'Grands carreaux (1 cm)', 'Seyès', 'Papier millimétré', 'Papier pointé', 'Réseau isométrique', 'Repère'])
    && e.entrees.find(x => x.t === 'Page blanche')?.coche === 'true' && e.entrees.find(x => x.t === 'Page blanche')?.focus && e.entrees.filter(x => x.coche === 'true').length === 1 && e.titre === 'Page vide après la page 2 : son fond'
    && menuAvant.x === menuApres.x && menuAvant.l === menuApres.l && sousLeClic === 'Page blanche', { e, menuAvant, menuApres, sousLeClic })
  await page.screenshot({ path: `${D}/inserer-fond.png` })
  await entree(page, 'Repère').click(); await pause(300)
  e = await etat(page)
  verifier('« Repère » choisi : une page vide en 3, au repère ; la voisine reste en Seyès ; « Page vide insérée : c\'est la page 3 »',
    e.pages.length === 3 && e.fonds[2] === 'repere' && e.fonds[1] === 'seyes' && e.msgs.at(-1) === 'Page vide insérée : c\'est la page 3' && !e.menu, e)
  // Un seul Annuler la retire tout entière
  await page.keyboard.press('Control+z'); await pause(200)
  e = await etat(page)
  verifier('Ctrl + Z, une fois : la page insérée s\'en va (une seule action)', e.pages.length === 2 && JSON.stringify(e.pages) === JSON.stringify(P), e)
  await page.keyboard.press('Control+z'); await pause(200)
  e = await etat(page)
  verifier('… un second Ctrl + Z ne défait rien d\'autre (le fond Seyès de la page 2 reste)', e.fonds[1] === 'seyes' && e.pages.length === 2, e)
  // Au clavier : touche Menu sur la carte 1, ↓ jusqu'à « Insérer une page avant… », Entrée, Entrée
  await page.locator('.trieuse .carte').nth(0).focus(); await pause(100)
  await page.keyboard.press('Shift+F10'); await pause(150)
  e = await etat(page)
  const iAvant = e.entrees.filter(x => !x.inactif).findIndex(x => x.t === 'Insérer une page avant…')
  for (let k = 0; k < iAvant; k++) await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Enter'); await pause(150)
  e = await etat(page)
  const focusFond = e.entrees.find(x => x.focus)?.t
  await page.keyboard.press('Enter'); await pause(200)
  e = await etat(page)
  verifier('Au clavier : Maj + F10, ↓…, Entrée sur « Insérer une page avant… », Entrée : une page vide en tête, blanche (le fond coché)',
    focusFond === 'Page blanche' && e.pages.length === 3 && e.pages[1] === P[0] && e.fonds[0] === 'blanc' && e.msgs.at(-1) === 'Page vide insérée : c\'est la page 1', { focusFond, e })
  await page.keyboard.press('Control+z'); await pause(150)
  // Double-clic sur « Insérer une page après… » : le second clic ne choisit pas de fond
  await page.locator('.trieuse .carte').nth(0).locator('.carte-options').click(); await pause(200)
  const b = await entree(page, 'Insérer une page après').boundingBox()
  await page.mouse.dblclick(b.x + b.width / 2, b.y + b.height / 2); await pause(300)
  e = await etat(page)
  verifier('Double-clic sur « Insérer une page après… » : aucune page insérée, le choix du fond reste ouvert', e.pages.length === 2 && e.menu && e.entrees.length === 8, e)   // (lot 5, K8 : huit fonds)
  await page.keyboard.press('Escape'); await pause(150)
  e = await etat(page)
  verifier('Échap : le menu se ferme, rien d\'inséré, la trieuse reste ouverte', !e.menu && e.ouverte && e.pages.length === 2, e)
  // Deux clics simples au même endroit (à 0,6 s) : le second prend le fond de la voisine
  await page.locator('.trieuse .carte').nth(0).locator('.carte-options').click(); await pause(200)
  const b2 = await entree(page, 'Insérer une page après').boundingBox()
  await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); await pause(600)
  await page.mouse.click(b2.x + b2.width / 2, b2.y + b2.height / 2); await pause(300)
  e = await etat(page)
  verifier('Deux clics simples au même endroit : une page vide après la 1, blanche (le fond coché, sous le pointeur)', e.pages.length === 3 && e.pages[0] === P[0] && e.fonds[1] === 'blanc' && e.msgs.at(-1) === 'Page vide insérée : c\'est la page 2', e)
  // Au doigt : ⋯ touché, « Insérer une page avant… » touché, « Page blanche » touchée
  await ctx.close()
  {
    const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'inserer-doigt')
    await preparer(page, 2, { ici: 0 })
    await ouvrirTrieuse(page)
    const o = await page.locator('.trieuse .carte').nth(1).locator('.carte-options').boundingBox()
    await page.touchscreen.tap(o.x + o.width / 2, o.y + o.height / 2); await pause(200)
    await entree(page, 'Insérer une page avant').tap(); await pause(200)
    // (réglages par défaut : la page blanche, cochée, vient maintenant sous le doigt ; touchée 200 ms
    // après, ce serait le second toucher d'un double toucher, qui ne fait rien : on la touche une fois lue)
    await pause(500)
    await entree(page, 'Page blanche').tap(); await pause(300)
    const e = await etat(page)
    verifier('Au doigt : ⋯, « Insérer une page avant… », « Page blanche » : la page blanche entre les deux', e.pages.length === 3 && e.fonds[1] === 'blanc' && e.msgs.at(-1) === 'Page vide insérée : c\'est la page 2', e)
    // Un double toucher sur « Insérer une page après… » : le second toucher (sur le fond de la
    // voisine, venu sous le doigt) ne fait rien ; touché de nouveau, une fois lu, il insère
    const o1 = await page.locator('.trieuse .carte').nth(0).locator('.carte-options').boundingBox()
    await page.touchscreen.tap(o1.x + o1.width / 2, o1.y + o1.height / 2); await pause(300)
    const bi = await entree(page, 'Insérer une page après').boundingBox()
    const ici = { x: bi.x + bi.width / 2, y: bi.y + bi.height / 2 }
    await page.touchscreen.tap(ici.x, ici.y); await pause(60)
    await page.touchscreen.tap(ici.x, ici.y); await pause(300)
    let f = await etat(page)
    const sous = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.menu-item')?.getAttribute('aria-checked'), ici)
    verifier('Au doigt, un double toucher sur « Insérer une page après… » : rien d\'inséré, le choix du fond reste ouvert, le fond coché (la page blanche) sous le doigt', f.pages.length === 3 && f.menu && f.entrees.length === 8 && sous === 'true', { f, sous })
    await pause(700)
    await page.touchscreen.tap(ici.x, ici.y); await pause(300)
    f = await etat(page)
    verifier('… touché de nouveau une fois lu : la page vide après la 1, blanche (le fond coché)', f.pages.length === 4 && f.fonds[1] === 'blanc' && f.msgs.at(-1) === 'Page vide insérée : c\'est la page 2', f)
    await ctx.close()
  }
}

// =============== 3. Le lecteur d'écran sait qu'une page est vide ===============
if (faire('aria')) {
  const { ctx, page } = await ouvrir({}, 'aria')
  await preparer(page, 5, { ici: 1, vides: [4], noms: { 1: 'Exercice 12 p. 84' } })
  await ouvrirTrieuse(page)
  await pause(800)
  const cdp = await ctx.newCDPSession(page)
  const { nodes } = await cdp.send('Accessibility.getFullAXTree')
  const options = nodes.filter(n => !n.ignored && n.role?.value === 'option').map(n => n.name?.value ?? '')
  verifier('Arbre d\'accessibilité : « Page 5, vide » pour la page vide ; « Page 2, Exercice 12 p. 84, page actuelle » ; aucune page écrite n\'est dite vide',
    options[4] === 'Page 5, vide' && options[1] === 'Page 2, Exercice 12 p. 84, page actuelle' && options.slice(0, 4).every(o => !/vide/.test(o)), options)
  // La page vide reçoit de l'écriture (sa vignette se repeint) : elle n'est plus dite vide
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau, p = a.pages[4]
    t.poser(p, { id: 'tard', type: 'trait', x: 100, y: 100, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 80, 40, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  })
  await pause(800)
  const apres = await page.evaluate(() => document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')[4].getAttribute('aria-label'))
  verifier('… quand elle reçoit de l\'écriture, sa vignette repeinte ne se dit plus vide (« Page 5 »)', apres === 'Page 5', apres)
  await ctx.close()
}

// =============== 4. Le bouton ⋯ dit qu'il porte l'export PDF ===============
if (faire('fichier')) {
  const { ctx, page } = await ouvrir({}, 'fichier')
  const b = await page.evaluate(() => { const b = document.querySelector('.barre-haut .bouton.points'); return { title: b.title, aria: b.getAttribute('aria-label') } })
  await page.locator('.barre-haut .bouton.points').click(); await pause(150)
  const m = await page.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return { aria: m?.getAttribute('aria-label'), entrees: [...(m?.querySelectorAll('.menu-item') ?? [])].map(x => x.querySelector('.libelle')?.firstChild?.textContent) } })
  // (Adapté aux corrections « conformité » du lot 5 : le titre et le nom du
  // menu disent aussi les réglages de cet appareil, que le menu a depuis K9)
  verifier('Le bouton ⋯ : « Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P) » (titre et nom) ; son menu « Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil », avec « Exporter le classeur en PDF… »',
    b.title === 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil (Ctrl + S, Ctrl + O, Ctrl + P)' && b.aria === b.title && m.aria === 'Enregistrer, ouvrir ou exporter en PDF ; réglages de cet appareil' && m.entrees.includes('Exporter le classeur en PDF…'), { b, m })
  // getByRole par « PDF » le trouve (ce que cherche un lecteur d'écran)
  await page.keyboard.press('Escape')
  const n = await page.getByRole('button', { name: /PDF/ }).count()
  verifier('… un bouton de la page se nomme avec « PDF »', n >= 1, n)
  await ctx.close()
}

// =============== 5. « Exporter en PDF… » grisé sur une page vide ===============
if (faire('pdfvide')) {
  const { ctx, page } = await ouvrir({}, 'pdfvide')
  await preparer(page, 3, { ici: 0, vides: [2] })
  await ouvrirTrieuse(page)
  await page.locator('.trieuse .carte').nth(2).locator('.carte-options').click(); await pause(200)
  let e = await etat(page)
  const sorties = e.entrees.filter(x => x.t === 'Copier en image' || x.t === 'Exporter en PDF…')
  verifier('Menu de la vignette d\'une page vide : « Copier en image » et « Exporter en PDF… » grisés', sorties.length === 2 && sorties.every(x => x.inactif), sorties)
  await entree(page, 'Exporter en PDF').click({ force: true }); await pause(300)
  e = await etat(page)
  verifier('… un clic sur « Exporter en PDF… » n\'ouvre aucune fenêtre', !e.dialog.length, e.dialog)
  await page.keyboard.press('Escape'); await pause(100)
  await page.locator('.trieuse .carte').nth(1).locator('.carte-options').click(); await pause(200)
  e = await etat(page)
  const ecrite = e.entrees.filter(x => x.t === 'Copier en image' || x.t === 'Exporter en PDF…')
  verifier('Menu d\'une page écrite : les deux actifs', ecrite.length === 2 && ecrite.every(x => !x.inactif), ecrite)
  // Le menu de la page à l’écran, sur la page vide : « Exporter la page en PDF… » grisé (inchangé)
  await ctx.close()
}

// =============== 6. « Choisir plusieurs » : son nom, et pourquoi ===============
if (faire('choisir')) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 390, height: 844 }, isMobile: true }, 'choisir')
  await preparer(page, 3, { ici: 0 })
  await ouvrirTrieuse(page)
  const nom = await page.evaluate(() => { const b = document.querySelector('.trieuse-choisir'); return b && b.offsetParent ? b.getAttribute('aria-label') ?? b.textContent : null })
  verifier('Au doigt, le bandeau montre « Choisir plusieurs »', /Choisir plusieurs/.test(nom ?? ''), nom)
  const r = readFileSync(README, 'utf8').replace(/\s+/g, ' ')
  verifier('Le README dit pourquoi ce n\'est pas « Ajouter » (un second « Ajouter » à côté d\'« Ajouter une page »)', /Il ne s'appelle pas « Ajouter » comme à l’écran/.test(r) && /un second « Ajouter »/.test(r))
  await ctx.close()
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
