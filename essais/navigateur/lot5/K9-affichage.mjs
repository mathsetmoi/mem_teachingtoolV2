// ESSAI DU MORCEAU K9-affichage (lot 5) : les deux réglages de l'affichage
// de cet appareil, dans le menu ⋯ de la barre du haut, sous « Cet appareil »
// (src/reglages.ts, src/ui.ts, src/style.css, src/rendu.ts, src/fonds.ts).
// A. Le menu ⋯ (1366 × 768, souris) : le titre « Cet appareil », les deux
//    cases (menuitemcheckbox, leurs mots et leurs aides exactes) ; le
//    contraste : body.contraste, son message, la clé 'mem-contraste', le
//    rendu ; rien ne bouge dans la mise en page (les boîtes des barres et de
//    leurs boutons, avec et sans) ; retenu au rechargement. Le menu ⋯,
//    plus long, reste sous son bouton (il défile s'il le faut).
// B. Le contraste dans la scène : les huit fonds à 10 %, 30 %, 100 % et
//    2000 % plus marqués (luminance plus basse, sauf la page blanche) et
//    jamais un écran gris ; une figure fine plus épaisse ; la sélection et
//    ses poignées plus marquées (la couche directe) ; l'écriture à main
//    levée, pixel pour pixel la même.
// C. Ce qui sort de l'écran, IDENTIQUE avec et sans : le document (et le
//    .memc qu'on en écrit, octet pour octet), le film élève (son texte), la
//    vignette de la trieuse (pixels), l'image copiée (octets), le PDF (ses
//    feuilles rendues par pdftoppm). La revue, au contraire, l'a. Le lecteur
//    élève ouvert dans le même navigateur (même stockage) ne l'a pas : ni
//    body.contraste, ni le module des réglages chargé, et ses pixels sont
//    ceux d'un navigateur sans contraste. Le lecteur construit (dist-pages)
//    ne contient pas la clé.
// D. Les noms sous les outils : éteints au poste de la classe (1366 × 768,
//    souris), allumés sur un TNI (1920 × 1080, tactile, écran 1920 × 1080),
//    éteints sur un iPad de 11 pouces (écran 820 × 1180) en paysage comme en
//    portrait, et quand on le tourne ; allumés sur un iPad Pro 12,9 pouces,
//    dans les deux sens ; éteints au téléphone même choisis (l'entrée y est
//    grisée), et revenus en quittant la mise en page du téléphone ; retenus
//    une fois choisis ; le message selon le pointeur (souris, stylet d'une
//    tablette graphique, doigt, clavier) ; les mots exacts (data-libelle, le
//    texte des boutons reste vide) ; « Effacer » sur une page seule.
// E. À 1024 × 768, 1366 × 768, 1920 × 1080 (souris, et TNI) et sur l'iPad
//    (paysage et portrait), noms allumés et éteints : aucun bouton des
//    barres sous 44 px, rien ne se chevauche (bouton du classeur, barre des
//    outils, barre du haut, barre du zoom, menus de la Gomme et du doigt, choix
//    des Formes ; le menu ⋯ sous son bouton), tout dans l'écran ; le bouton du classeur à 12 px de la
//    barre des outils ; la barre des outils défile sur un écran bas.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
// Adapté à la vérification « appareils » du lot 5 (voulu) : les entrées
// d'un menu qui défile ne se tassent plus ; à 1366 × 768, le menu ⋯ (avec
// l'entrée de la clé) défile, et « Noms sous les outils », au bout, est sous
// le bord du menu tant qu'on ne l'a pas fait défiler : les appuis du stylet
// de D4, qui visent le milieu de l'entrée, l'amènent d'abord dans la vue du
// menu (comme la main, ou comme le clic de Playwright le fait de lui-même).
// Adapté au lot 5, K10 (voulu) : la barre des outils porte deux boutons de
// plus, « Couleur » et « Autres outils » (.seulement-telephone), cachés hors
// de la mise en page du téléphone ; les listes de boutons de D et E les
// laissent de côté (K10-telephone.mjs mesure le téléphone).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/lot5/K9-affichage/travail/essai'
const DEV = 'http://localhost:5173/'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d) : '')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
const empreinte = b => createHash('sha256').update(b).digest('hex').slice(0, 16)
const { gunzipSync } = createRequire(R + '/package.json')('fflate')
/** Un .memc (en base64) : sa ligne d'en-tête, et le document Yjs qu'il
 *  emporte, décompressé (l'en-tête gzip porte l'heure de la compression :
 *  deux écritures du même document n'ont pas les mêmes octets compressés) */
const ouvrirMemc = b64 => { const b = Buffer.from(b64, 'base64'), i = b.indexOf(10); return { tete: b.subarray(0, i).toString(), doc: Buffer.from(gunzipSync(b.subarray(i + 1))) } }

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
/** Un contexte : la fenêtre, l'écran, le toucher ; stock : ce que le
 *  navigateur a déjà gardé (localStorage) */
async function contexte(o = {}, stock = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(s => {
    window.showOpenFilePicker = undefined
    if (!sessionStorage.getItem('k9-stock')) { for (const [k, v] of Object.entries(s)) localStorage.setItem(k, v); sessionStorage.setItem('k9-stock', '1') }
  }, stock)
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
const PREPARER = () => {
  const a = window.__app
  a.reconnaissance = false
  window.__msgs = []
  const m = a.ui.message.bind(a.ui)
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
}
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.waitForTimeout(600)
  await p.evaluate(PREPARER)
  return p
}
const messages = p => p.evaluate(() => window.__msgs.splice(0))

// ---------- L'analyse des images (une page à part, qui décode un PNG) ----------
const ana = await nav.newPage()
await ana.setContent('<body></body>')
await ana.evaluate(() => {
  window.mesurer = async (b64, zone) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const g = c.getContext('2d'); g.drawImage(img, 0, 0)
    const z = zone ?? { x: 0, y: 0, l: c.width, h: c.height }
    const d = g.getImageData(z.x, z.y, z.l, z.h).data
    const r = { n: z.l * z.h, lum: 0, blancs: 0, sombres: 0, bleuSel: 0, bleuOpaque: 0, blancOpaque: 0, l: img.width, h: img.height }
    let h = 2166136261
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2]
      r.lum += 0.2126 * R + 0.7152 * G + 0.0722 * B
      if (R === 255 && G === 255 && B === 255) r.blancs++
      if (R < 90 && G < 90 && B < 110) r.sombres++
      if (Math.abs(R - 59) < 30 && Math.abs(G - 111) < 30 && Math.abs(B - 182) < 30) { r.bleuSel++; if (d[i + 3] > 200) r.bleuOpaque++ }
      if (R > 245 && G > 245 && B > 245 && d[i + 3] > 200) r.blancOpaque++
      h = Math.imul(h ^ (R | G << 8 | B << 16 | d[i + 3] << 24), 16777619)
    }
    r.lum = Math.round(r.lum / r.n * 10) / 10
    r.empreinte = (h >>> 0).toString(16)
    return r
  }
})
const mesurer = (buf, zone) => ana.evaluate(([b, z]) => window.mesurer(b, z), [buf.toString('base64'), zone ?? null])

/** La boîte (arrondie) d'un élément */
const boite = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return null; const r = e.getBoundingClientRect(); return r.width ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null }, sel)
const chevauche = (a, b) => !!a && !!b && Math.min(a.r, b.r) - Math.max(a.l, b.l) > 0.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 0.5

/** Des formes connues, aux mêmes identifiants et aux mêmes places : un
 *  triangle fin, un trait à main levée, une formule */
const ECRIRE = () => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id: 'k9-tri', type: 'polygone', x: 300, y: 420, z: 1, auteur: t.moi, pts: [0, 0, 260, 0, 130, -200], ferme: true, couleur: '#1b2230', taille: 1, sommets: true, noms: ['A', 'B', 'C'] })
  const pts = []; for (let i = 0; i <= 40; i++) pts.push(i * 7, Math.sin(i / 3) * 18, 0.5)
  t.nouveauGeste()
  t.poser(a.page, { id: 'k9-tr', type: 'trait', x: 700, y: 300, z: 2, auteur: t.moi, pts, couleur: '#1f5fbf', taille: 4, opacite: 1, pression: false })
  t.nouveauGeste()
  t.poser(a.page, { id: 'k9-fx', type: 'formule', x: 720, y: 420, z: 3, auteur: t.moi, latex: '\\frac{a}{b}=\\sqrt{2}', couleur: '#1b2230', taille: 28 })
  a.selection.clear(); a.options = null; a.choisirOutil('stylo'); a.ui.maj(); a.rendu.toutRedessiner()
}

// =====================================================================
console.log('=== A. le menu ⋯ : « Cet appareil » ===')
const ctxA = await contexte()
await ctxA.grantPermissions(['clipboard-read', 'clipboard-write'])
const P = await ouvrirDev(ctxA, 'souris')
const LIRE_MENU = () => {
  const m = document.querySelector('.menu-flottant.menu-large:not([hidden])')
  if (!m) return null
  const enfants = [...m.children]
  const titres = enfants.filter(e => e.classList.contains('menu-titre')).map(e => e.textContent)
  const entree = a => { const b = m.querySelector(`[data-action="${a}"]`); if (!b) return null
    const l = b.querySelector('.libelle'); return { role: b.getAttribute('role'), coche: b.getAttribute('aria-checked'), inactif: b.getAttribute('aria-disabled'),
      texte: l.firstChild.textContent, aide: l.querySelector('small')?.textContent, rang: enfants.indexOf(b), h: b.getBoundingClientRect().height } }
  const iTitre = enfants.findIndex(e => e.classList.contains('menu-titre') && e.textContent === 'Cet appareil')
  return { titres, iTitre, n: enfants.length, filetAvant: enfants[iTitre - 1]?.className, contraste: entree('contraste'), noms: entree('noms-outils') }
}
const ouvrirMenuFichier = async p => {
  if (!(await p.evaluate(() => !!document.querySelector('.menu-flottant.menu-large:not([hidden])')))) await p.click('button.points')
  await p.waitForSelector('.menu-flottant.menu-large:not([hidden])', { timeout: 5000 })
  return p.evaluate(LIRE_MENU)
}
let menu = await ouvrirMenuFichier(P)
const AIDE_CONTRASTE = 'Pour le vidéoprojecteur : lignes du fond, barres et sélection plus marquées. Rien ne change dans le classeur.'
const AIDE_NOMS = 'Un mot sous chaque bouton des barres'
ok(menu && menu.iTitre > 0 && menu.filetAvant === 'menu-filet' && menu.contraste?.rang === menu.iTitre + 1 && menu.noms?.rang === menu.iTitre + 2 && menu.n === menu.iTitre + 3,
  'A1) Tout à la fin du menu ⋯ : un filet, « Cet appareil », puis les deux cases', menu)
ok(menu.contraste?.role === 'menuitemcheckbox' && menu.contraste.coche === 'false' && menu.contraste.texte === 'Contraste renforcé' && menu.contraste.aide === AIDE_CONTRASTE && menu.contraste.h >= 44,
  'A1) « Contraste renforcé » : une case (menuitemcheckbox), décochée, son aide exacte, 44 px', menu.contraste)
ok(menu.noms?.role === 'menuitemcheckbox' && menu.noms.coche === 'false' && menu.noms.texte === 'Noms sous les outils' && menu.noms.aide === AIDE_NOMS && menu.noms.inactif === null,
  'A1) « Noms sous les outils » : une case, décochée au poste de la classe, son aide exacte', menu.noms)
/** Le menu ⋯ reste sous son bouton (plus long que la place, il défile) ; ses deux dernières cases s'atteignent */
const SOUS_LE_BOUTON = async p => p.evaluate(async () => {
  const m = document.querySelector('.menu-flottant.menu-large:not([hidden])'), b = document.querySelector('.barre-haut .bouton.points')
  const rm = m.getBoundingClientRect(), rb = b.getBoundingClientRect()
  const d = m.querySelector('[data-action="noms-outils"]')
  d.scrollIntoView({ block: 'nearest' }); await new Promise(r => setTimeout(r, 50))
  const rd = d.getBoundingClientRect(), rm2 = m.getBoundingClientRect()
  return { sous: rm.top >= rb.bottom, dans: rm.bottom <= innerHeight - 7.5, defile: m.scrollHeight > m.clientHeight + 1, atteinte: rd.top >= rm2.top - 0.5 && rd.bottom <= rm2.bottom + 0.5, haut: Math.round(rm.height) }
})
const sous1366 = await SOUS_LE_BOUTON(P)
ok(sous1366.sous && sous1366.dans && sous1366.atteinte, `A1) À 1366 × 768, le menu ⋯ reste sous son bouton, dans l'écran${sous1366.defile ? ' ; plus long que la place, il défile' : ''}, et « Noms sous les outils » s'y atteint`, sous1366)
/** Les boîtes de tout ce qui est dans les barres (rien ne doit bouger) */
const BOITES = () => [...document.querySelectorAll('.barre, .barre .bouton, .rang, .zoom-texte, .bouton-classeur, .barre-actions, .barre-actions button')]
  .filter(e => !e.hidden).map(e => { const r = e.getBoundingClientRect(); return [e.className, r.left, r.top, r.width, r.height].join(':') }).join('|')
await P.keyboard.press('Escape')
await P.evaluate(ECRIRE)
await P.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.add('k9-tri'); a.ui.maj(); a.rendu.toutRedessiner() })
await P.waitForTimeout(400)
const boitesAvant = await P.evaluate(BOITES)
const avantContraste = await P.evaluate(() => ({ filet: getComputedStyle(document.body).getPropertyValue('--filet').trim(), cle: localStorage.getItem('mem-contraste') }))
await P.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await ouvrirMenuFichier(P)
await P.click('.menu-item[data-action="contraste"]')
await P.waitForTimeout(400)
const apres = await P.evaluate(() => ({ corps: document.body.classList.contains('contraste'), rendu: window.__app.rendu.contraste, cle: localStorage.getItem('mem-contraste'),
  filet: getComputedStyle(document.body).getPropertyValue('--filet').trim(), douce: getComputedStyle(document.body).getPropertyValue('--encre-douce').trim(),
  ombre: getComputedStyle(document.querySelector('.barre-outils')).boxShadow, trait: getComputedStyle(document.querySelector('.barre-outils .bouton svg')).strokeWidth }))
const msgA = await messages(P)
ok(avantContraste.cle === null && avantContraste.filet === '#d4dce8', 'A2) Au départ : aucune clé, le filet de toujours', avantContraste)
ok(apres.corps && apres.rendu && apres.cle === '1' && msgA.includes('Contraste renforcé, sur cet appareil'),
  'A2) Coché : body.contraste, le rendu du tableau, la clé \'mem-contraste\' = \'1\', le message « Contraste renforcé, sur cet appareil »', { apres, msgA })
ok(apres.filet === '#8a97ab' && apres.douce === '#2c3646' && /inset/.test(apres.ombre) && apres.trait === '2.3px',
  'A2) La feuille de style : --filet #8a97ab, --encre-douce #2c3646, le filet des barres doublé (ombre intérieure), les icônes à 2,3', apres)
await P.evaluate(() => { const a = window.__app; a.selection.add('k9-tri'); a.ui.maj(); a.rendu.toutRedessiner() })
await P.waitForTimeout(400)
const boitesApres = await P.evaluate(BOITES)
ok(boitesAvant === boitesApres && boitesAvant.length > 200, 'A3) Rien ne bouge dans la mise en page : les boîtes des barres, de leurs boutons et de la barre d\'actions, les mêmes au pixel près',
  { avant: boitesAvant.slice(0, 300), apres: boitesApres.slice(0, 300) })
await P.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
menu = await ouvrirMenuFichier(P)
ok(menu.contraste.coche === 'true', 'A4) Le menu le dit coché', menu.contraste)
await P.keyboard.press('Escape')
await P.reload(); await pret(P); await P.waitForTimeout(500); await P.evaluate(PREPARER)
const recharge = await P.evaluate(() => ({ corps: document.body.classList.contains('contraste'), rendu: window.__app.rendu.contraste }))
ok(recharge.corps && recharge.rendu, 'A4) Retenu au rechargement (body.contraste, le rendu)', recharge)
await ouvrirMenuFichier(P)
await P.click('.menu-item[data-action="contraste"]'); await P.waitForTimeout(300)
const eteint = await P.evaluate(() => ({ corps: document.body.classList.contains('contraste'), rendu: window.__app.rendu.contraste, cle: localStorage.getItem('mem-contraste') }))
const msgA5 = await messages(P)
ok(!eteint.corps && !eteint.rendu && eteint.cle === '0' && msgA5.includes('Contraste normal'), 'A5) Décoché : « Contraste normal », la clé \'0\'', { eteint, msgA5 })

// =====================================================================
console.log('=== B. le contraste dans la scène ===')
const ZONE = { x: 120, y: 110, width: 1000, height: 540 }
/** Le canevas de la scène lui-même (le fond et les formes ; ni les barres,
 *  ni le message, ni le numéro de la page), dans la zone */
const scene = async (p, clip = ZONE) => {
  await p.waitForTimeout(200)
  const b64 = await p.evaluate(() => window.__app.rendu.scene.toDataURL('image/png').split(',')[1])
  const k = await p.evaluate(() => window.__app.rendu.scene.width / window.__app.rendu.scene.clientWidth)
  return mesurer(Buffer.from(b64, 'base64'), { x: Math.round(clip.x * k), y: Math.round(clip.y * k), l: Math.round(clip.width * k), h: Math.round(clip.height * k) })
}
const contraste = (p, oui) => p.evaluate(o => { window.__app.choisirContraste(o); document.body.classList.toggle('contraste', o) }, oui)
const vue = (p, z) => p.evaluate(z => { const a = window.__app; a.allerVers({ x: 0, y: 0, z }, 0); a.rendu.toutRedessiner() }, z)
await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.selection.clear(); a.choisirOutil('stylo'); a.ui.maj() })
const FONDS = ['blanc', 'carreaux', 'grands-carreaux', 'seyes', 'millimetre', 'pointe', 'iso', 'repere']
const lums = {}
let grisMin = 255
for (const f of FONDS) {
  await P.evaluate(f => window.__app.changerFond(f), f)
  for (const z of [0.1, 0.3, 1, 20]) {
    await vue(P, z)
    await contraste(P, false); const n = await scene(P)
    await contraste(P, true); const k = await scene(P)
    lums[`${f}@${z}`] = [n.lum, k.lum]
    if (f !== 'blanc') grisMin = Math.min(grisMin, k.lum)
  }
}
await contraste(P, false)
const plusMarques = Object.entries(lums).filter(([c]) => !c.startsWith('blanc')).every(([c, [n, k]]) => k < n || (c.endsWith('@20') && c.startsWith('pointe') && k <= n))
const blancPareil = FONDS.length && [0.1, 0.3, 1, 20].every(z => lums[`blanc@${z}`][0] === lums[`blanc@${z}`][1] && lums[`blanc@${z}`][0] === 255)
ok(plusMarques, 'B1) Les sept fonds à motif, à 10 %, 30 %, 100 % et 2000 % : plus marqués en contraste (luminance plus basse)', lums)
ok(blancPareil, 'B1) La page blanche reste blanche', Object.fromEntries(Object.entries(lums).filter(([c]) => c.startsWith('blanc'))))
ok(grisMin > 200, `B1) Jamais un écran gris : la luminance moyenne la plus basse, en contraste, est ${grisMin} (plus de 200 ; 255 = blanc)`, lums)
note('luminance moyenne du tableau, normal → contraste', lums)
// Une figure fine (1) au trait de 2 px, l'écriture la même
await P.evaluate(f => window.__app.changerFond(f), 'blanc')
await vue(P, 1)
await P.evaluate(ECRIRE); await P.waitForTimeout(300)
const TRI = { x: 280, y: 200, width: 320, height: 240 }, TRAIT = { x: 690, y: 270, width: 300, height: 60 }
await contraste(P, false)
const triN = await scene(P, TRI), traitN = await scene(P, TRAIT)
await contraste(P, true)
const triK = await scene(P, TRI), traitK = await scene(P, TRAIT)
ok(triK.sombres > triN.sombres * 1.4 && triK.lum < triN.lum, 'B2) Le triangle d\'épaisseur 1 : affiché plus épais en contraste (2 px d\'écran au moins)', { normal: triN.sombres, contraste: triK.sombres })
ok(traitN.empreinte === traitK.empreinte, 'B2) L\'écriture à main levée : pixel pour pixel la même (son contour n\'est pas recalculé)', { normal: traitN.empreinte, contraste: traitK.empreinte })
// La sélection et ses poignées (la couche directe) : plus de bleu, et du blanc sous les tirets
const DIRECT = () => { const c = window.__app.rendu.direct; return c.toDataURL('image/png').split(',')[1] }
await P.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('k9-tri'); a.selection.add('k9-tr'); a.ui.maj(); a.rendu.toutRedessiner() })
await contraste(P, false); await P.waitForTimeout(250)
const selN = await mesurer(Buffer.from(await P.evaluate(DIRECT), 'base64'))
await contraste(P, true); await P.waitForTimeout(250)
const selK = await mesurer(Buffer.from(await P.evaluate(DIRECT), 'base64'))
ok(selK.bleuOpaque > selN.bleuOpaque * 1.5 && selK.blancOpaque > selN.blancOpaque * 3, 'B3) Les cadres de la sélection en deux tons (du blanc plein sous un bleu plus épais), le cadre de taille, ses coins et la pastille plus marqués',
  { normal: { bleu: selN.bleuOpaque, blancs: selN.blancOpaque }, contraste: { bleu: selK.bleuOpaque, blancs: selK.blancOpaque } })
await P.evaluate(() => { const a = window.__app; a.selection.clear(); a.choisirOutil('stylo'); a.ui.maj() })
await contraste(P, false)

// =====================================================================
console.log('=== C. ce qui sort de l\'écran : identique avec et sans ===')
await P.evaluate(f => window.__app.changerFond(f), 'millimetre')
await P.waitForTimeout(200)
const ETAT = async () => P.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const fi = await import('/src/fichier.ts')
  const memc = new Uint8Array(await fi.ecrireTableau(t.doc, 0, { nom: 'K9', id: 'k9' }).arrayBuffer())
  let s = ''; for (let i = 0; i < memc.length; i += 0x8000) s += String.fromCharCode(...memc.subarray(i, i + 0x8000))
  const ex = await import('/src/revoir/exporter.ts'), fo = await import('/src/revoir/format.ts')
  const sc = ex.seancesDuFilm(t.film.toArray()).at(-1)
  const film = await fo.ecrireFilm(ex.exporter(t, { de: sc.de, a: sc.a, pages: [...a.pages], titre: 'Lot 5, affichage' }))
  return { doc: JSON.stringify(t.doc.toJSON()), etapes: t.film.length, memc: btoa(s), film }
})
/** Une vignette neuve (un cache neuf) de la page, peinte par le même code que la trieuse */
const VIGNETTE = async () => P.evaluate(async () => {
  const V = await import('/src/pages/vignettes.ts')
  const a = window.__app, v = new V.Vignettes(a.tableau, a.ui.apercus)
  const c = v.vignette(a.page, 320, 200)
  c.style.position = 'fixed'; c.style.left = '-9999px'; document.body.appendChild(c)
  await new Promise(r => setTimeout(r, 700))
  const url = c.toDataURL('image/png').split(',')[1]
  c.remove(); v.detruire()
  return url
})
const LIRE_PRESSE = async () => {
  const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
  if (!it) return null
  const b = await it.getType('image/png'), u8 = new Uint8Array(await b.arrayBuffer())
  let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000))
  return btoa(s)
}
const IMAGE = async () => {
  await P.evaluate(() => navigator.clipboard.writeText('rien'))
  await P.evaluate(() => window.__app.ui.copierEnImage('page'))
  await P.waitForTimeout(1500)
  return P.evaluate(LIRE_PRESSE)
}
async function exporterPdf(nom) {
  await P.mouse.move(683, 384)
  await P.keyboard.press('Control+p')
  await P.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  await P.locator('dialog[open] input[name="pdf-fond"]').check()
  const dl = P.waitForEvent('download', { timeout: 120000 }).catch(() => null)
  await P.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  execFileSync('pdftoppm', ['-r', '60', '-png', f, `${D}/${nom}`])
  return readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort().map(x => empreinte(readFileSync(`${D}/${x}`)))
}
const sans = { etat: await ETAT(), vignette: await VIGNETTE(), image: await IMAGE(), pdf: await exporterPdf('sans') }
await ouvrirMenuFichier(P)
await P.click('.menu-item[data-action="contraste"]'); await P.waitForTimeout(400)
await messages(P)
const avec = { etat: await ETAT(), vignette: await VIGNETTE(), image: await IMAGE(), pdf: await exporterPdf('avec') }
ok(await P.evaluate(() => window.__app.rendu.contraste), 'C) (le contraste est bien allumé pour la suite)')
ok(sans.etat.doc === avec.etat.doc && sans.etat.etapes === avec.etat.etapes, 'C1) Le document : le même (aucune étape du film en plus, aucune donnée changée)', { etapes: [sans.etat.etapes, avec.etat.etapes] })
const memcS = ouvrirMemc(sans.etat.memc), memcA = ouvrirMemc(avec.etat.memc)
ok(memcS.tete === memcA.tete && memcS.doc.equals(memcA.doc) && memcS.doc.length > 100, 'C1) Le .memc écrit du classeur : son en-tête et son document, octet pour octet les mêmes', { tete: [memcS.tete, memcA.tete], octets: [memcS.doc.length, memcA.doc.length] })
ok(sans.etat.film === avec.etat.film && sans.etat.film.length > 100, 'C2) Le film élève : le même texte', { longueur: [sans.etat.film.length, avec.etat.film.length] })
const vs = await mesurer(Buffer.from(sans.vignette, 'base64')), va = await mesurer(Buffer.from(avec.vignette, 'base64'))
ok(vs.empreinte === va.empreinte && vs.sombres > 20, 'C3) La vignette de la page (le code de la trieuse) : pixel pour pixel la même', { sans: vs.empreinte, avec: va.empreinte, sombres: vs.sombres })
ok(!!sans.image && sans.image === avec.image, 'C4) L\'image copiée : octet pour octet la même', { sans: sans.image?.length, avec: avec.image?.length })
ok(!!sans.pdf?.length && JSON.stringify(sans.pdf) === JSON.stringify(avec.pdf), 'C5) Le PDF (avec « imprimer le fond ») : ses feuilles, rendues par pdftoppm, les mêmes', { sans: sans.pdf, avec: avec.pdf })
// La trieuse, ouverte en contraste : ses vignettes sont celles d'un écran sans contraste
await P.evaluate(() => window.__app.ui.ouvrirTrieuse())
await P.waitForTimeout(1500)
const carte = await P.evaluate(() => {
  const cartes = [...document.querySelectorAll('.trieuse .carte')]
  const c = cartes.find(x => x.classList.contains('actuelle'))?.querySelector('.carte-image canvas')
  return c ? { url: c.toDataURL('image/png').split(',')[1], l: parseFloat(c.style.width), h: parseFloat(c.style.height) } : null
})
await P.keyboard.press('Escape'); await P.waitForTimeout(400)
await contraste(P, false)
const carteSans = carte && await P.evaluate(async ([l, h]) => {
  const V = await import('/src/pages/vignettes.ts')
  const a = window.__app, v = new V.Vignettes(a.tableau, a.ui.apercus)
  const c = v.vignette(a.page, l, h)
  c.style.position = 'fixed'; c.style.left = '-9999px'; document.body.appendChild(c)
  await new Promise(r => setTimeout(r, 700))
  const url = c.toDataURL('image/png').split(',')[1]
  c.remove(); v.detruire()
  return url
}, [carte.l, carte.h])
const mc = carte && await mesurer(Buffer.from(carte.url, 'base64')), ms = carteSans && await mesurer(Buffer.from(carteSans, 'base64'))
ok(mc && ms && mc.empreinte === ms.empreinte, 'C3) La trieuse ouverte en contraste : la vignette de la page est celle d\'un écran sans contraste', { avec: mc?.empreinte, sans: ms?.empreinte, taille: carte && [carte.l, carte.h] })
// La revue en classe : elle, a le contraste (relu à chaque ouverture)
const REVUE = async () => {
  await P.click('button[title^="Revoir la construction"]'); await P.waitForTimeout(1200)
  await P.keyboard.press('End'); await P.waitForTimeout(700)
  const rv = await P.evaluate(() => { const r = document.querySelector('.revue-scene')?.getBoundingClientRect(); return r && { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) } })
  const m = rv ? await mesurer(await P.screenshot({ clip: { x: rv.x + 150, y: rv.y + 120, width: 700, height: 380 } })) : null
  for (let i = 0; i < 4 && await P.evaluate(() => window.__app.enLecture); i++) { await P.keyboard.press('Escape'); await P.waitForTimeout(200) }
  return m
}
const revueSans = await REVUE()
await contraste(P, true)
const revueAvec = await REVUE()
ok(revueSans && revueAvec && revueAvec.lum < revueSans.lum - 1, 'C6) La revue en classe (au vidéoprojecteur) : en contraste renforcé, ses lignes plus marquées', { sans: revueSans?.lum, avec: revueAvec?.lum })
// Le lecteur élève, dans le même navigateur (le même stockage, contraste gardé à '1')
const LECTEUR = async (ctx, nom) => {
  const L = await ctx.newPage(); suivre(L, nom)
  await L.goto(DEV + 'revoir.html')
  await L.locator('input[type=file]').setInputFiles({ name: 'k9.mem', mimeType: 'application/json', buffer: Buffer.from(avec.etat.film) })
  await L.waitForTimeout(1500)
  await L.keyboard.press('End'); await L.waitForTimeout(1500)
  const r = await L.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].find(x => x.width > 300)
    return { corps: document.body.className, cle: localStorage.getItem('mem-contraste'), reglages: performance.getEntriesByType('resource').some(e => /\/src\/reglages\.ts/.test(e.name)),
      url: c ? c.toDataURL('image/png').split(',')[1] : null }
  })
  await L.close()
  return { ...r, m: r.url ? await mesurer(Buffer.from(r.url, 'base64')) : null }
}
const leK = await LECTEUR(ctxA, 'lecteur (contraste gardé)')
const ctxN = await contexte()
const leN = await LECTEUR(ctxN, 'lecteur (sans)')
await ctxN.close()
ok(leK.cle === '1' && !/contraste/.test(leK.corps) && !leK.reglages, 'C7) Le lecteur élève, dans le même navigateur (la clé \'mem-contraste\' y est à \'1\') : ni body.contraste, ni le module des réglages chargé', { corps: leK.corps, cle: leK.cle, reglages: leK.reglages })
ok(leK.m && leN.m && leK.m.empreinte === leN.m.empreinte && leK.m.sombres > 50, 'C7) …et ses pixels sont ceux d\'un navigateur sans contraste', { avec: leK.m?.empreinte, sans: leN.m?.empreinte, sombres: leK.m?.sombres })
// Le lecteur construit (dist-pages, celui que reçoivent les élèves) : la clé n'y est pas
const PAGES = R + '/dist-pages'
if (!existsSync(PAGES + '/revoir.html')) note('dist-pages pas construit : la vérification du lecteur construit est sautée')
else {
  const html = readFileSync(PAGES + '/revoir.html', 'utf8')
  const scripts = [...html.matchAll(/src="\.?\/?([^"]+\.js)"/g)].map(m => m[1])
  const code = scripts.map(s => existsSync(`${PAGES}/${s}`) ? readFileSync(`${PAGES}/${s}`, 'utf8') : '').join('\n')
  const tableau = readFileSync(PAGES + '/index.html', 'utf8') + [...readFileSync(PAGES + '/index.html', 'utf8').matchAll(/src="\.?\/?([^"]+\.js)"/g)].map(m => existsSync(`${PAGES}/${m[1]}`) ? readFileSync(`${PAGES}/${m[1]}`, 'utf8') : '').join('\n')
  ok(scripts.length > 0 && code.length > 1000 && !code.includes('mem-contraste') && !code.includes('mem-noms-outils') && tableau.includes('mem-contraste'),
    'C7) Le lecteur construit (dist-pages/revoir.html) ne contient ni \'mem-contraste\' ni \'mem-noms-outils\' (le tableau, oui)', { scripts, octets: code.length })
}
await contraste(P, false)
await ctxA.close()

// =====================================================================
console.log('=== D. les noms sous les outils ===')
const OUTILS_MOTS = ['Stylo', 'Surligneur', 'Gomme', 'Point', 'Segment', 'Formes', 'Formule', 'Sélection', 'Vue', 'Doigt', 'Annuler', 'Rétablir', 'Supprimer']
// (Adapté aux outils de classe : « Classe », entre Automatismes et Revoir)
const HAUT_MOTS = ['Nouvelle', 'Effacer', 'Fond', 'Aimant', 'Formes auto', 'Image', 'Instruments', 'Construire', 'Catalogue', 'Automatismes', 'Classe', 'Revoir', 'Publier', 'Fichier']
const NOMS = () => {
  const lire = sel => [...document.querySelectorAll(sel)].map(b => ({ mot: b.querySelector(':scope > .libelle')?.dataset.libelle ?? null, texte: b.textContent,
    vu: (() => { const s = b.querySelector(':scope > .libelle'); return s ? getComputedStyle(s).display !== 'none' && getComputedStyle(s, '::before').content : null })(),
    l: b.offsetWidth, h: b.offsetHeight, cache: b.hidden }))
  // (lot 5, K10 : sans les deux boutons du téléphone, « Couleur » et « Autres
  // outils », cachés hors de sa mise en page, où les noms ne vont jamais)
  return { corps: document.body.classList.contains('noms-outils'), outils: lire('.barre-outils > .bouton:not(.seulement-telephone)'), haut: lire('.barre-haut > .bouton'), rang: !!document.querySelector('.rang .libelle'),
    classeur: !!document.querySelector('.bouton-classeur .libelle'), cle: localStorage.getItem('mem-noms-outils') }
}
// D1. Le poste de la classe
const ctxPC = await contexte()
const PC = await ouvrirDev(ctxPC, 'poste')
let n = await PC.evaluate(NOMS)
ok(!n.corps && n.cle === null, 'D1) Le poste de la classe (1366 × 768, souris) : pas de noms (aucune clé)', { corps: n.corps, cle: n.cle })
ok(JSON.stringify(n.outils.map(b => b.mot)) === JSON.stringify(OUTILS_MOTS) && JSON.stringify(n.haut.filter(b => b.mot !== null).map(b => b.mot)) === JSON.stringify(HAUT_MOTS),
  'D1) Les mots exacts, dans l\'ordre des barres (le Doigt compris, caché ici ; « Effacer » sur une page seule)', { outils: n.outils.map(b => b.mot), haut: n.haut.map(b => b.mot) })
ok(n.haut.filter(b => b.mot === null).length === 2 && !n.rang && !n.classeur, 'D1) Ni ‹, ni ›, ni le compteur, ni le bouton du classeur n\'en ont', { sans: n.haut.filter(b => b.mot === null).length })
ok([...n.outils, ...n.haut].every(b => b.texte === '' && (b.vu === false || b.vu === null)) && [...n.outils, ...n.haut].filter(b => !b.cache).every(b => b.l === 44 && b.h === 44),
  'D1) Cachés : le texte des boutons reste vide (le mot est dans data-libelle), et ils gardent leurs 44 × 44', n.outils.slice(0, 3))
// Choisis à la souris : allumés, retenus
await ouvrirMenuFichier(PC)
await PC.click('.menu-item[data-action="noms-outils"]'); await PC.waitForTimeout(500)
n = await PC.evaluate(NOMS)
let msg = await messages(PC)
const vus = [...n.outils, ...n.haut].filter(b => b.mot && !b.cache)
ok(n.corps && n.cle === '1' && msg.includes('Noms sous les outils'), 'D2) Cochés à la souris : body.noms-outils, la clé \'mem-noms-outils\' = \'1\', le message « Noms sous les outils »', { corps: n.corps, cle: n.cle, msg })
ok(vus.every(b => b.vu === `"${b.mot}"` && b.h === 54 && b.l >= 52 && b.texte === ''), 'D2) Chaque mot paraît sous son icône (54 px de haut, 52 au moins de large)', vus.filter(b => !(b.vu === `"${b.mot}"` && b.h === 54 && b.l >= 52)))
const largeurs = new Set(n.outils.filter(b => !b.cache).map(b => b.l))
ok(largeurs.size === 1, 'D2) Dans la barre des outils, tous à la même largeur (celle du plus large)', [...largeurs])
await PC.reload(); await pret(PC); await PC.waitForTimeout(500); await PC.evaluate(PREPARER)
n = await PC.evaluate(NOMS)
ok(n.corps, 'D2) Retenus au rechargement', { corps: n.corps, cle: n.cle })
// Une deuxième page : « Supprimer » ; revenue à une seule : « Effacer »
await PC.evaluate(() => window.__app.nouvellePage()); await PC.waitForTimeout(300)
const motJeter2 = await PC.evaluate(() => document.querySelector('.barre-haut > .bouton.danger .libelle')?.dataset.libelle)
await PC.evaluate(() => window.__app.supprimerPage()); await PC.waitForTimeout(300)
const motJeter1 = await PC.evaluate(() => document.querySelector('.barre-haut > .bouton.danger .libelle')?.dataset.libelle)
ok(motJeter2 === 'Supprimer' && motJeter1 === 'Effacer', 'D3) La poubelle de la page : « Supprimer » (deux pages), « Effacer » (une seule), comme son titre', { motJeter2, motJeter1 })
// Décochés : à la souris, au stylet d'une tablette graphique, au clavier
await ouvrirMenuFichier(PC)
await PC.click('.menu-item[data-action="noms-outils"]'); await PC.waitForTimeout(400)
msg = await messages(PC)
n = await PC.evaluate(NOMS)
ok(!n.corps && n.cle === '0' && msg.includes('Outils sans noms (leur nom paraît au survol)'), 'D4) Décochés à la souris : « Outils sans noms (leur nom paraît au survol) », la clé \'0\'', { corps: n.corps, cle: n.cle, msg })
const cdp = await PC.context().newCDPSession(PC)
const stylet = async (x, y) => {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
}
// L'entrée amenée d'abord dans la vue du menu, comme le ferait la main : le
// menu ⋯ défile à 1366 × 768 (voir l'en-tête : « Adapté… appareils »)
const centre = async (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (e.closest('.menu-flottant')) e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, sel)
let c0 = await centre(PC, 'button.points'); await stylet(c0.x, c0.y); await PC.waitForTimeout(300)
c0 = await centre(PC, '.menu-item[data-action="noms-outils"]'); await stylet(c0.x, c0.y); await PC.waitForTimeout(400)
msg = await messages(PC)
ok((await PC.evaluate(NOMS)).corps && msg.includes('Noms sous les outils'), 'D4) Recochés au stylet (tablette graphique, sans écran tactile) : « Noms sous les outils »', msg)
c0 = await centre(PC, 'button.points'); await stylet(c0.x, c0.y); await PC.waitForTimeout(300)
c0 = await centre(PC, '.menu-item[data-action="noms-outils"]'); await stylet(c0.x, c0.y); await PC.waitForTimeout(400)
msg = await messages(PC)
ok(!(await PC.evaluate(NOMS)).corps && msg.includes('Outils sans noms (leur nom paraît au survol)'), 'D4) Décochés au stylet qui survole : le message parle du survol', msg)
await PC.click('button.points'); await PC.waitForTimeout(200)
await PC.focus('.menu-item[data-action="noms-outils"]'); await PC.keyboard.press('Enter'); await PC.waitForTimeout(400)
msg = await messages(PC)
ok((await PC.evaluate(NOMS)).corps && msg.includes('Noms sous les outils'), 'D4) Au clavier (Entrée sur l\'entrée) aussi', msg)
// La mise en page du téléphone les éteint, et ils reviennent en la quittant
await PC.setViewportSize({ width: 600, height: 800 }); await PC.waitForTimeout(500)
const tel = await PC.evaluate(NOMS)
await PC.setViewportSize({ width: 1366, height: 768 }); await PC.waitForTimeout(500)
const retour = await PC.evaluate(NOMS)
ok(tel.cle === '1' && !tel.corps && retour.corps, 'D5) Choisis, ils s\'éteignent dans la mise en page du téléphone (fenêtre de 600 px) et reviennent en la quittant', { tel: tel.corps, retour: retour.corps })
await ctxPC.close()

// D6. Les appareils, en « auto »
const APPAREILS = {
  tni: { viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true },
  ipadPaysage: { viewport: { width: 1180, height: 820 }, screen: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
  ipadPortrait: { viewport: { width: 820, height: 1180 }, screen: { width: 820, height: 1180 }, hasTouch: true, isMobile: true },
  ipadPro: { viewport: { width: 1366, height: 1024 }, screen: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true },
  telephone: { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 },
}
const auto = {}
for (const [nom, o] of Object.entries(APPAREILS)) {
  const c = await contexte(o)
  const p = await ouvrirDev(c, nom)
  auto[nom] = (await p.evaluate(NOMS)).corps
  if (nom === 'ipadPaysage' || nom === 'ipadPro') {
    // On tourne la tablette : la fenêtre change, l'écran non ; la décision reste
    await p.setViewportSize({ width: o.viewport.height, height: o.viewport.width }); await p.waitForTimeout(500)
    auto[nom + 'Tourne'] = (await p.evaluate(NOMS)).corps
  }
  if (nom === 'tni') {
    // Au doigt : décochés, « Outils sans noms » (pas de survol)
    await p.tap('button.points'); await p.waitForTimeout(300)
    await p.tap('.menu-item[data-action="noms-outils"]'); await p.waitForTimeout(400)
    const m = await messages(p)
    ok(!(await p.evaluate(NOMS)).corps && m.includes('Outils sans noms'), 'D7) Au TNI, décochés au doigt : « Outils sans noms » (pas de survol au doigt)', m)
    await p.reload(); await pret(p); await p.waitForTimeout(400)
    ok(!(await p.evaluate(NOMS)).corps, 'D7) …et retenus au rechargement, l\'écran n\'y décide plus', null)
  }
  if (nom === 'telephone') {
    // Choisis au téléphone : toujours éteints, et l'entrée grisée
    await p.evaluate(() => localStorage.setItem('mem-noms-outils', '1'))
    await p.reload(); await pret(p); await p.waitForTimeout(400)
    const t = await p.evaluate(NOMS)
    await p.tap('button.points'); await p.waitForTimeout(300)
    const e = (await p.evaluate(LIRE_MENU))?.noms
    ok(!t.corps && e?.inactif === 'true' && e.aide === 'Un mot sous chaque bouton des barres (pas sur un téléphone : la place manque)', 'D8) Au téléphone, même choisis : pas de noms ; l\'entrée est grisée et le dit', { corps: t.corps, entree: e })
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(500)
    ok(!(await p.evaluate(NOMS)).corps, 'D8) …ni en paysage (844 × 390, la mise en page du téléphone)', null)
  }
  await c.close()
}
ok(auto.tni === true, 'D6) Un TNI (1920 × 1080, tactile) : les noms, d\'eux-mêmes', auto)
ok(auto.ipadPaysage === false && auto.ipadPortrait === false && auto.ipadPaysageTourne === false, 'D6) L\'iPad de 11 pouces (écran 820 × 1180) : pas de noms, en paysage, en portrait, et quand on le tourne', auto)
ok(auto.ipadPro === true && auto.ipadProTourne === true, 'D6) L\'iPad Pro 12,9 pouces (écran 1024 × 1366) : les noms, dans les deux sens', auto)
ok(auto.telephone === false, 'D6) Le téléphone : pas de noms', auto)

// =====================================================================
console.log('=== E. 44 px, rien ne se chevauche, tout dans l\'écran ===')
const CAS = [
  ['1024 × 768', { viewport: { width: 1024, height: 768 } }],
  ['1366 × 768', { viewport: { width: 1366, height: 768 } }],
  ['1920 × 1080', { viewport: { width: 1920, height: 1080 } }],
  ['TNI 1920 × 1080', APPAREILS.tni],
  ['iPad paysage', APPAREILS.ipadPaysage],
  ['iPad portrait', APPAREILS.ipadPortrait],
]
const MESURES = () => {
  const vis = e => !!e && !e.hidden && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0
  const b = e => { const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } }
  const classeur = document.querySelector('.barre-classeur')
  // (lot 5, K10 : sans les deux boutons du téléphone, cachés ici ; l'essai
  // K10-telephone.mjs mesure la mise en page du téléphone)
  const petits = [...document.querySelectorAll('.barre-outils > .bouton:not(.seulement-telephone), .barre-haut > .bouton, .barre-haut > .rang, .barre-zoom button, .bouton-classeur')]
    .filter(e => vis(e) || (e.closest('.barre-outils') && !e.hidden)).filter(e => e.offsetWidth < 44 || e.offsetHeight < 44).map(e => [e.className, e.offsetWidth, e.offsetHeight])
  const o = document.querySelector('.barre-outils')
  return { classeur: vis(classeur) ? b(classeur) : null, forme: classeur?.dataset.forme, outils: b(o), haut: b(document.querySelector('.barre-haut')), zoom: b(document.querySelector('.barre-zoom')),
    petits, defile: o.scrollHeight > o.clientHeight + 1, deborde: getComputedStyle(o).overflowY, l: innerWidth, h: innerHeight, noms: document.body.classList.contains('noms-outils') }
}
for (const [nom, o] of CAS) {
  for (const choix of ['1', '0']) {
    const c = await contexte(o, { 'mem-noms-outils': choix })
    const p = await ouvrirDev(c, `${nom} ${choix}`)
    const m = await p.evaluate(MESURES)
    const quoi = `${nom}, noms ${choix === '1' ? 'allumés' : 'éteints'}`
    ok(m.noms === (choix === '1'), `E) ${quoi} : body.noms-outils ${m.noms}`, m)
    ok(!m.petits.length, `E) ${quoi} : aucun bouton des barres sous 44 px`, m.petits)
    const barres = [['classeur', m.classeur], ['outils', m.outils], ['haut', m.haut], ['zoom', m.zoom]]
    const ch = []
    for (let i = 0; i < barres.length; i++) for (let j = i + 1; j < barres.length; j++) if (chevauche(barres[i][1], barres[j][1])) ch.push(barres[i][0] + '/' + barres[j][0])
    const dedans = barres.every(([, r]) => !r || (r.l >= -0.5 && r.t >= -0.5 && r.r <= m.l + 0.5 && r.b <= m.h + 0.5))
    // Les menus de la Gomme et du doigt, le choix des Formes
    const menus = {}
    await p.click('.barre-outils > .bouton:nth-child(3)', { button: 'right' }); await p.waitForTimeout(250)
    menus.gomme = await boite(p, '.menu-flottant[aria-label="Gomme"]')
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    const doigtVu = await p.evaluate(() => { const b = document.querySelector('.barre-outils > .bouton:nth-child(10)'); return !!b && !b.hidden })
    if (doigtVu) {
      await p.evaluate(() => document.querySelector('.barre-outils > .bouton:nth-child(10)').scrollIntoView({ block: 'nearest' }))
      await p.click('.barre-outils > .bouton:nth-child(10)'); await p.waitForTimeout(250)
      menus.doigt = await boite(p, '.menu-flottant[aria-label="Rôle du doigt"]')
      await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    }
    await p.evaluate(() => { window.__app.choisirOutil('forme'); window.__app.ui.maj() }); await p.waitForTimeout(200)
    menus.formes = await p.evaluate(() => { const e = [...document.querySelectorAll('.choix-formes')].find(x => !x.hidden); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom } })
    await p.evaluate(() => { window.__app.choisirOutil('stylo'); window.__app.ui.maj() })
    // Le menu ⋯ : sous son bouton, dans l'écran, ses dernières cases atteintes
    await ouvrirMenuFichier(p)
    const sous = await SOUS_LE_BOUTON(p)
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    if (!(sous.sous && sous.dans && sous.atteinte)) ch.push('menu ⋯ : ' + JSON.stringify(sous))
    for (const [k, r] of Object.entries(menus)) {
      if (!r) { ch.push(k + ' : pas ouvert'); continue }
      for (const [b, rb] of barres) if (chevauche(r, rb)) ch.push(`${k}/${b}`)
      if (!(r.l >= -0.5 && r.t >= -0.5 && r.r <= m.l + 0.5 && r.b <= m.h + 0.5)) ch.push(k + ' hors de l\'écran')
    }
    ok(!ch.length && dedans, `E) ${quoi} : rien ne se chevauche (bouton du classeur, barres des outils, du haut, du zoom ; menus de la Gomme${doigtVu ? ', du doigt' : ''}, choix des Formes), tout dans l'écran ; le menu ⋯ sous son bouton${sous.defile ? ' (il défile)' : ''}`, { ch, m, menus })
    if (m.classeur) ok(Math.abs(m.classeur.l - (m.outils.r + 12)) <= 1, `E) ${quoi} : le bouton du classeur à 12 px de la barre des outils`, { classeur: m.classeur.l, outils: m.outils.r })
    if (m.defile) ok(m.deborde === 'auto', `E) ${quoi} : la barre des outils défile (ses boutons gardent leur taille)`, m)
    note(`${quoi} : barre des outils ${Math.round(m.outils.r - m.outils.l)} px de large${m.defile ? ', elle défile' : ''} ; barre du haut ${Math.round(m.haut.b - m.haut.t)} px de haut ; bouton du classeur : ${m.forme}`)
    await c.close()
  }
}

ok(!erreurs.length, 'Aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'Tout est vert.')
process.exit(echecs ? 1 : 0)
