// ESSAI DES CORRECTIONS DU CONTRÔLE FINAL DU LOT 5 (deux défauts de
// l'application ; les autres constats du contrôle final touchaient les essais
// eux-mêmes : la batterie, passeB-b045, la partie c de m2-robustesse, voir
// lot5/cf/sondes-verif.sh et lot5/cf/avant-adaptation).
// I. Échap depuis la Sélection rend l'outil qu'on vient de quitter pour elle,
//    quelle que soit la façon d'y passer (V, son bouton, Échap, Ctrl + A), et
//    non celui qu'avait quitté un Échap plus ancien (point 6) :
//    A. F (Formule), Échap (Sélection), P (Stylo), V, Échap : le Stylo revient.
//    B. Le même, avec le bouton « Sélection » de la barre au lieu de V.
//    C. Le scénario du contrôle final : F, Échap, P, un trait, V, un clic qui
//       prend le trait, Maj + L (verrouillé), Échap : le Stylo revient,
//       « Retour à l'outil précédent » ; la page suivante écrit (aucune
//       fenêtre « Nouvelle formule »), et Ctrl + S enregistre.
//    D. Ce qui marchait reste : Gomme, Échap, Échap ; Stylo, Ctrl + A, Échap,
//       Échap ; L, V, V, Échap.
// II. Sur un écran qu'on touche (TNI, iPad, tablette, portable tactile), les
//    pastilles de couleur de la barre des outils font 44 × 44 ; quand la
//    barre ne tient plus dans la hauteur, la grille des couleurs et le bouton
//    de l'épaisseur se replient dans « Couleur » (le bouton et le menu du
//    téléphone), à leur place, et la barre ne défile plus. Au poste de la
//    classe (souris, tablette graphique) et au téléphone, rien ne change
//    (point 4).
//    (Adapté aux gains rapides du lot 16 : Annuler et Rétablir sont en tête
//    de la barre du haut, la poubelle de la sélection a quitté la barre des
//    outils, les quatre couleurs sont en grille 2 × 2 et l'épaisseur tient
//    sur un bouton qui ouvre un menu. La barre, plus courte, tient sur le
//    TNI avec ses noms et sur l'iPad couché, où elle se repliait : elle ne se
//    replie plus que sur un écran bas, une fenêtre de Chrome de 657 px sur
//    un portable tactile, où l'on vérifie le repli ; les tailles mesurées au
//    poste de la classe sont celles d'aujourd'hui.)
//    A. Portable tactile de 1366 × 768, les noms allumés (dépliée, 787 px,
//       la barre ne tiendrait pas) : la barre repliée, sans défilement ;
//       « Couleur » (son nom dessous) après le filet, au bout de la barre,
//       après le Doigt ; tout bouton de la barre en 44 × 44 au moins ; son
//       menu à droite de la barre, le long du bouton (remonté pour tenir
//       dans l'écran, le bouton étant près du bas) : quatre pastilles et
//       trois tailles de 44 × 44 ; Rouge, puis Trait épais s'appliquent (le
//       rond du bouton devient rouge).
//    B. TNI 1920 × 1080, avec ses noms (allumés d'office) et sans : dépliée,
//       les pastilles en grille, en 44 × 44, le bouton de l'épaisseur,
//       « Couleur » caché, pas de défilement, tout bouton en 44 × 44 au moins.
//    C. iPad 11 pouces couché : dépliée, rien ne défile, tout dans l'écran ;
//       tourné : dépliée aussi. Une fenêtre tactile de 1366 × 657 : repliée ;
//       agrandie à 768 px de haut : dépliée, le menu « Couleur » ouvert se
//       ferme ; de nouveau à 657 : repliée.
//    D. iPad Pro debout (les noms) : dépliée, 44 × 44, sans défiler.
//    E. Le poste de la classe (1366 × 768, 1024 × 768, et avec les noms) :
//       pas de « Couleur », les pastilles en 34 × 34, le bouton de
//       l'épaisseur de 44 px, la barre de 601 px (711 avec les noms), qui ne
//       défile pas.
//    F. Le téléphone (390 × 844, 844 × 390) : sa barre, sans la classe repliée.
//    G. Au clavier sur la barre repliée (1366 × 657, tactile) : Entrée sur
//       « Couleur » ouvre son menu (le focus sur la couleur cochée), Échap le
//       ferme (le focus revient au bouton) ; Tab y arrive depuis le Doigt.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS. Captures dans lot5/corrections-cf/essai.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/corrections-cf/essai'
mkdirSync(D, { recursive: true })
const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })

const cE = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await cE.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
await cE.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
const p = await cE.newPage()
p.on('pageerror', e => erreurs.push('echap: ' + e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
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
const outil = () => p.evaluate(() => window.__app.outil)
const msgs = () => p.evaluate(() => window.__msgs.slice())
const viderMsgs = () => p.evaluate(() => { window.__msgs.length = 0 })
const pageNeuve = () => p.evaluate(() => {
  const a = window.__app
  a.nouvellePage(); a.choisirOutil('stylo'); a.selection.clear()
  a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj()
  document.activeElement?.blur?.()
})
async function touche(k) { await p.keyboard.press(k); await p.waitForTimeout(120) }
async function trait(x0, y0, x1, y1) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= 12; i++) await p.mouse.move(x0 + (x1 - x0) * i / 12, y0 + (y1 - y0) * i / 12)
  await p.mouse.up(); await p.waitForTimeout(150)
}
const nbFormes = () => p.evaluate(() => window.__app.formes.length)

console.log('--- I. Échap rend l\'outil quitté pour la Sélection')
// A. V
await pageNeuve()
await touche('f'); ok(await outil() === 'formule', 'I.A. F : la Formule en main', await outil())
await touche('Escape'); ok(await outil() === 'selection', 'I.A. Échap : la Sélection', await outil())
await touche('p'); await touche('v')
ok(await outil() === 'selection', 'I.A. P puis V : la Sélection', await outil())
await viderMsgs()
await touche('Escape')
ok(await outil() === 'stylo', 'I.A. Échap après V rend le Stylo (l\'outil quitté par V), pas la Formule', await outil())
ok((await msgs()).includes('Retour à l\'outil précédent'), 'I.A. « Retour à l\'outil précédent »', await msgs())

// B. le bouton « Sélection » de la barre
await pageNeuve()
await touche('f'); await touche('Escape'); await touche('h')
ok(await outil() === 'surligneur', 'I.B. H : le Surligneur', await outil())
await p.click('.barre-outils button[aria-label^="Sélection"]')
await p.waitForTimeout(120)
ok(await outil() === 'selection', 'I.B. le bouton Sélection', await outil())
await p.mouse.move(700, 400)
await touche('Escape')
ok(await outil() === 'surligneur', 'I.B. Échap après le bouton Sélection rend le Surligneur', await outil())

// C. le scénario du contrôle final
await pageNeuve()
await touche('f'); await touche('Escape'); await touche('p')
await trait(500, 300, 700, 330)
const n0 = await nbFormes()
ok(n0 === 1, 'I.C. un trait au Stylo', n0)
await touche('v')
await p.mouse.click(600, 315); await p.waitForTimeout(200)
const pris = await p.evaluate(() => window.__app.selection.size)
ok(pris === 1, 'I.C. un clic à la Sélection prend le trait', pris)
await touche('Shift+L')
const verrou = await p.evaluate(() => window.__app.formes.map(f => !!f.verrou))
ok(verrou[0] === true, 'I.C. Maj + L le verrouille', verrou)
await viderMsgs()
let n = 0
while (await outil() === 'selection' && n < 4) { await touche('Escape'); n++ }
ok(await outil() === 'stylo', `I.C. Échap (${n} fois) rend le Stylo, pas la Formule`, await outil())
ok((await msgs()).includes('Retour à l\'outil précédent'), 'I.C. « Retour à l\'outil précédent »', await msgs())
await trait(450, 450, 650, 480)
const formule = await p.evaluate(() => !!document.querySelector('dialog.dialogue-formule[open]'))
ok(!formule, 'I.C. le clic suivant n\'ouvre pas « Nouvelle formule »', formule)
ok(await nbFormes() === 2, 'I.C. il écrit un trait', await nbFormes())
const dl = p.waitForEvent('download', { timeout: 5000 }).catch(() => null)
await p.keyboard.press('Control+s')
const fichier = await dl
ok(!!fichier, 'I.C. Ctrl + S enregistre le classeur (téléchargement)', fichier && fichier.suggestedFilename())

// D. ce qui marchait
await pageNeuve()
await touche('e'); await touche('Escape')
ok(await outil() === 'selection', 'I.D. Gomme, Échap : la Sélection', await outil())
await touche('Escape')
ok(await outil() === 'gomme', 'I.D. Échap : la Gomme revient', await outil())
await pageNeuve()
await trait(500, 300, 700, 330)
await touche('Control+a')
ok(await outil() === 'selection', 'I.D. Stylo, Ctrl + A : la Sélection', await outil())
await touche('Escape'); await touche('Escape')
ok(await outil() === 'stylo', 'I.D. Échap, Échap : le Stylo revient', await outil())
await touche('l'); await touche('v'); await touche('v'); await touche('Escape')
ok(await outil() === 'segment', 'I.D. L, V, V (déjà la Sélection), Échap : le Segment revient', await outil())

await cE.close()

async function ouvrir(nom, o, noms) {
  const c = await nav.newContext({ ...o, screen: o.screen ?? o.viewport })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  if (noms) await c.addInitScript(v => { try { localStorage.setItem('mem-noms-outils', v) } catch {} }, noms)
  const p = await c.newPage()
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  await p.goto(DEV)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
  await p.waitForTimeout(700)
  return { c, p }
}
// La barre des outils telle qu'on la voit
const BARRE = () => {
  const b = document.querySelector('.barre-outils'), r = b.getBoundingClientRect()
  const vis = x => x.getClientRects().length > 0 && getComputedStyle(x).display !== 'none' && getComputedStyle(x).visibility !== 'hidden'
  const enfants = [...b.children].filter(vis).map(x => {
    const q = x.getBoundingClientRect()
    return { nom: x.tagName === 'HR' ? '—' : (x.getAttribute('aria-label') || x.className).split(/[ (:]/)[0], l: Math.round(q.width), h: Math.round(q.height), haut: Math.round(q.top), bas: Math.round(q.bottom) }
  }).sort((a, z) => a.haut - z.haut)
  const boutons = [...b.querySelectorAll('button')].filter(vis).map(x => { const q = x.getBoundingClientRect(); return { nom: (x.getAttribute('aria-label') || '').slice(0, 24), l: Math.round(q.width), h: Math.round(q.height), bas: q.bottom } })
  const couleur = b.querySelector('.bouton-couleur')
  return {
    replie: b.classList.contains('couleurs-repliees'), tactile: document.body.classList.contains('tactile'), noms: document.body.classList.contains('noms-outils'),
    sh: b.scrollHeight, ch: b.clientHeight, H: innerHeight, bas: r.bottom, droite: r.right, haut: r.top,
    ordre: enfants.map(e => e.nom), boutons,
    petits: boutons.filter(x => x.l < 43.5 || x.h < 43.5).map(x => `${x.nom} ${x.l}×${x.h}`),
    dehors: boutons.filter(x => x.bas > Math.min(innerHeight, r.bottom) + 0.5).map(x => x.nom),
    pastilles: [...b.querySelectorAll('.grille-pastilles > .pastille')].filter(vis).map(x => `${Math.round(x.getBoundingClientRect().width)}×${Math.round(x.getBoundingClientRect().height)}`),
    // (lot 16 : le bouton de l'épaisseur, à la place des trois tailles)
    epaisseur: (() => { const e = b.querySelector('.bouton-epaisseur'); if (!e || !vis(e)) return null; const q = e.getBoundingClientRect(); return { l: Math.round(q.width), h: Math.round(q.height), taille: e.dataset.taille } })(),
    couleur: couleur && vis(couleur) ? { ...(() => { const q = couleur.getBoundingClientRect(); return { l: Math.round(q.width), h: Math.round(q.height), x: q.left + q.width / 2, y: q.top + q.height / 2, haut: q.top } })(), nom: couleur.querySelector('.libelle')?.dataset.libelle ?? null, nomVu: !!couleur.querySelector('.libelle') && getComputedStyle(couleur.querySelector('.libelle')).display !== 'none', rond: getComputedStyle(couleur.querySelector('.rond-couleur')).backgroundColor } : null,
  }
}
const MENU = () => {
  const m = document.querySelector('.menu-couleur')
  if (!m || m.hidden) return null
  const r = m.getBoundingClientRect(), o = document.querySelector('.barre-outils').getBoundingClientRect()
  return { haut: r.top, gauche: r.left, droite: r.right, bas: r.bottom, barreDroite: o.right, W: innerWidth, H: innerHeight,
    cases: [...m.querySelectorAll('.case-couleur')].map(x => ({ nom: x.getAttribute('aria-label'), l: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height), coche: x.getAttribute('aria-checked') })),
    focus: document.activeElement?.getAttribute('aria-label') ?? null }
}
// (Adapté aux corrections des vérifications des retouches après le lot 5 : le
// Surligneur a son épaisseur à lui ; les boutons d'épaisseur règlent celle de
// l'outil en main, que donne tailleEnMain : ici, au Surligneur, la sienne)
const etat = p => p.evaluate(() => ({ couleur: window.__app.couleur, taille: window.__app.tailleEnMain?.() ?? window.__app.taille, outil: window.__app.outil }))

console.log('--- II. Les couleurs et l\'épaisseur sur un écran qu\'on touche')
// A. Un portable tactile de 1366 × 768, avec les noms : la barre se replie
// (adapté au lot 16 : le TNI avec ses noms ne se replie plus ; ici, dépliée,
// elle ferait 787 px pour 744 de place, et repliée 697)
{
  const { c, p } = await ouvrir('portable-noms', { viewport: { width: 1366, height: 768 }, hasTouch: true }, '1')
  const b = await p.evaluate(BARRE)
  ok(b.tactile && b.noms, 'II.A. portable tactile 1366 × 768, les noms allumés : body.tactile et body.noms-outils', b)
  ok(b.replie && b.pastilles.length === 0 && !b.epaisseur, 'II.A. la barre repliée : ni la grille des couleurs ni le bouton de l\'épaisseur dans la barre', b)
  ok(b.sh <= b.ch + 1 && b.dehors.length === 0, `II.A. elle ne défile pas (${b.sh} ≤ ${b.ch}), aucun bouton sous son bord`, b)
  ok(b.petits.length === 0, 'II.A. tout bouton de la barre fait 44 × 44 au moins', b.petits)
  const iD = b.ordre.indexOf('Rôle'), iC = b.ordre.indexOf('Couleur')
  ok(iC > iD && b.ordre[iC - 1] === '—' && iC === b.ordre.length - 1, 'II.A. « Couleur » après le filet, au bout de la barre, après le Doigt (Annuler et Rétablir sont en haut)', b.ordre)
  ok(b.couleur && b.couleur.nom === 'Couleur' && b.couleur.nomVu && b.couleur.l >= 44 && b.couleur.h >= 44, 'II.A. « Couleur » a son nom dessous, et 44 × 44 au moins', b.couleur)
  await p.screenshot({ path: D + '/A-portable.png' })
  await p.touchscreen.tap(b.couleur.x, b.couleur.y); await p.waitForTimeout(250)
  let m = await p.evaluate(MENU)
  // (« Couleur » est au bout de la barre, près du bas de l'écran : le menu,
  // plus haut que le bouton, remonte pour tenir dans l'écran ; il reste à la
  // hauteur du bouton, c'est-à-dire qu'il le longe)
  ok(m && m.gauche >= m.barreDroite && m.droite <= m.W && m.bas <= m.H && m.haut <= b.couleur.haut + 2 && m.bas >= b.couleur.haut + b.couleur.h - 2, 'II.A. son menu : à droite de la barre, le long du bouton (remonté pour tenir dans l\'écran), dans l\'écran', { m, bouton: b.couleur })
  ok(m && m.cases.length === 7 && m.cases.every(x => x.l >= 44 && x.h >= 44), 'II.A. quatre pastilles et trois tailles de 44 × 44', m?.cases)
  await p.screenshot({ path: D + '/A-portable-menu.png' })
  await p.evaluate(() => window.__app.choisirOutil('surligneur'))
  const rouge = await p.evaluate(() => { const b = document.querySelector('.menu-couleur [aria-label="Rouge"]'), r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2, teinte: b.style.getPropertyValue('--teinte') } })
  // (le menu a été refait par le changement d'outil ? il reste ouvert)
  if (rouge) { await p.touchscreen.tap(rouge.x, rouge.y); await p.waitForTimeout(200) }
  let e = await etat(p)
  const b2 = await p.evaluate(BARRE)
  ok(!!rouge?.teinte && e.couleur.toLowerCase() === rouge.teinte.toLowerCase() && e.outil === 'surligneur' && !(await p.evaluate(MENU)), 'II.A. Rouge : la couleur prise (le Surligneur la garde), le menu fermé', { e, rouge })
  const rgb = h => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`
  ok(!!rouge?.teinte && b2.couleur?.rond === rgb(rouge.teinte), 'II.A. le rond de « Couleur » est rouge', { rond: b2.couleur?.rond, rouge: rouge?.teinte })
  await p.touchscreen.tap(b.couleur.x, b.couleur.y); await p.waitForTimeout(250)
  const epais = await p.evaluate(() => { const r = document.querySelector('.menu-couleur [aria-label="Trait épais"]')?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await p.touchscreen.tap(epais.x, epais.y); await p.waitForTimeout(200)
  e = await etat(p)
  ok(e.taille === 12 || e.taille > 8, 'II.A. Trait épais : l\'épaisseur prise', e)
  await c.close()
}

// B. Le TNI, avec ses noms (allumés d'office) et sans : la barre tient
// dépliée (adapté au lot 16 : avant, avec ses noms, elle se repliait)
for (const [nom, noms] of [['avec ses noms', null], ['sans les noms', '0']]) {
  const { c, p } = await ouvrir('tni', { viewport: { width: 1920, height: 1080 }, hasTouch: true }, noms)
  const b = await p.evaluate(BARRE)
  ok(b.noms === !noms && b.tactile && !b.replie, `II.B. TNI ${nom} : body.tactile, la barre dépliée`, b)
  ok(b.pastilles.length === 4 && b.pastilles.every(x => x === '44×44') && b.epaisseur && b.epaisseur.l >= 44 && b.epaisseur.h >= 44 && b.epaisseur.taille === 'Fin',
    `II.B. TNI ${nom} : les quatre pastilles en grille, en 44 × 44, et le bouton de l'épaisseur (« Fin »), de 44 px au moins`, { p: b.pastilles, e: b.epaisseur })
  ok(!b.couleur && b.sh <= b.ch + 1 && b.dehors.length === 0 && b.petits.length === 0, `II.B. TNI ${nom} : « Couleur » caché, la barre ne défile pas, tout bouton en 44 × 44`, b)
  await p.screenshot({ path: D + `/B-tni-${noms ? 'sans-noms' : 'noms'}.png` })
  await c.close()
}

// C. iPad 11 pouces, couché puis debout : dépliée dans les deux sens
// (adapté au lot 16 : couché, elle se repliait) ; le repli, et le menu
// « Couleur » qui se ferme quand « Couleur » s'en va, sur une fenêtre
// tactile qu'on agrandit (657 → 768 px de haut)
{
  const { c, p } = await ouvrir('ipad', { viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  let b = await p.evaluate(BARRE)
  ok(!b.replie && b.sh <= b.ch + 1 && b.dehors.length === 0 && b.petits.length === 0 && b.pastilles.length === 4 && b.pastilles.every(x => x === '44×44') && !!b.epaisseur,
    'II.C. iPad couché : dépliée (les couleurs à un toucher), rien ne défile, tout dans l\'écran, tout bouton en 44 × 44', b)
  await p.screenshot({ path: D + '/C-ipad-couche.png' })
  await p.setViewportSize({ width: 820, height: 1180 }); await p.waitForTimeout(400)
  b = await p.evaluate(BARRE)
  ok(!b.replie && b.pastilles.length === 4 && b.pastilles.every(x => x === '44×44') && !!b.epaisseur && b.sh <= b.ch + 1, 'II.C. tourné debout : dépliée, en 44 × 44, sans défiler', b)
  await p.screenshot({ path: D + '/C-ipad-debout.png' })
  await c.close()
}
{
  const { c, p } = await ouvrir('fenetre-tactile', { viewport: { width: 1366, height: 657 }, hasTouch: true })
  let b = await p.evaluate(BARRE)
  ok(b.replie && b.sh <= b.ch + 1 && b.dehors.length === 0 && b.petits.length === 0, 'II.C. fenêtre tactile de 1366 × 657 : repliée, rien ne défile, tout dans l\'écran', b)
  await p.touchscreen.tap(b.couleur.x, b.couleur.y); await p.waitForTimeout(250)
  ok(!!(await p.evaluate(MENU)), 'II.C. le menu « Couleur » ouvert', null)
  await p.setViewportSize({ width: 1366, height: 768 }); await p.waitForTimeout(400)
  b = await p.evaluate(BARRE)
  ok(!b.replie && b.pastilles.length === 4 && b.pastilles.every(x => x === '44×44') && !!b.epaisseur && b.sh <= b.ch + 1, 'II.C. agrandie à 768 px : dépliée, en 44 × 44, sans défiler', b)
  ok(!(await p.evaluate(MENU)), 'II.C. le menu « Couleur » s\'est fermé (son bouton n\'est plus là)', await p.evaluate(MENU))
  await p.screenshot({ path: D + '/C-fenetre-768.png' })
  await p.setViewportSize({ width: 1366, height: 657 }); await p.waitForTimeout(400)
  b = await p.evaluate(BARRE)
  ok(b.replie && b.sh <= b.ch + 1, 'II.C. de nouveau à 657 px : repliée', b)
  await c.close()
}

// D. iPad Pro debout, avec ses noms
{
  const { c, p } = await ouvrir('ipadpro', { viewport: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const b = await p.evaluate(BARRE)
  ok(b.noms && !b.replie && b.pastilles.every(x => x === '44×44') && b.pastilles.length === 4 && !!b.epaisseur && b.sh <= b.ch + 1 && b.petits.length === 0, 'II.D. iPad Pro debout (les noms) : dépliée, 44 × 44, sans défiler', b)
  await c.close()
}

// E. Le poste de la classe : pas de « Couleur », la barre tient sans
// défiler (adapté au lot 16 : 601 px, 711 avec les noms ; avant, 874 et
// 1004, qui défilaient)
for (const [w, h, noms] of [[1366, 768, null], [1024, 768, null], [1366, 768, '1']]) {
  const { c, p } = await ouvrir('poste', { viewport: { width: w, height: h } }, noms)
  const b = await p.evaluate(BARRE)
  const sh = noms ? 711 : 601
  ok(!b.tactile && !b.replie && !b.couleur && b.pastilles.length === 4 && b.pastilles.every(x => x === '34×34') && b.epaisseur && b.epaisseur.l >= 44 && b.epaisseur.h >= 44 && b.sh === sh && b.sh <= b.ch + 1,
    `II.E. poste ${w} × ${h}${noms ? ' avec les noms' : ''} : pastilles en 34 × 34, le bouton de l'épaisseur, pas de « Couleur », ${sh} px qui ne défilent pas`, b)
  await c.close()
}

// F. Le téléphone
for (const [w, h] of [[390, 844], [844, 390]]) {
  const { c, p } = await ouvrir('telephone', { viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 })
  const b = await p.evaluate(BARRE)
  ok(!b.replie && !!b.couleur && b.pastilles.length === 0 && b.boutons.length === 7 && b.petits.length === 0, `II.F. téléphone ${w} × ${h} : ses sept boutons, « Couleur » compris, sans la classe repliée`, b)
  await c.close()
}

// G. Le clavier sur la barre repliée (adapté au lot 16 : à 768 px de haut,
// elle ne se replie plus ; à 657, si)
{
  const { c, p } = await ouvrir('clavier', { viewport: { width: 1366, height: 657 }, hasTouch: true })
  const b = await p.evaluate(BARRE)
  ok(b.replie, 'II.G. portable tactile 1366 × 657 : repliée', b)
  await p.evaluate(() => document.querySelector('.barre-outils .bouton-couleur').focus())
  await p.keyboard.press('Enter'); await p.waitForTimeout(250)
  let m = await p.evaluate(MENU)
  ok(m && m.focus === 'Noir', 'II.G. Entrée sur « Couleur » : son menu, le focus sur la couleur cochée (Noir)', m)
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  m = await p.evaluate(MENU)
  const f = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  ok(!m && /^Couleur/.test(f ?? ''), 'II.G. Échap le ferme, le focus revient au bouton', { m, f })
  // Tab y arrive depuis le Doigt (la grille et le bouton de l'épaisseur,
  // repliés, sont sautés ; la poubelle n'est plus dans la barre, lot 16)
  await p.evaluate(() => document.querySelector('.barre-outils .bouton[title^="Rôle du doigt"]').focus())
  await p.keyboard.press('Tab')
  const g = await p.evaluate(() => document.activeElement?.getAttribute('aria-label'))
  ok(/^Couleur/.test(g ?? ''), 'II.G. Tab atteint « Couleur » depuis le Doigt', g)
  await c.close()
}

ok(erreurs.length === 0, 'aucune erreur JS', erreurs)
await nav.close()
if (echecs) { console.log(`ÉCHEC : ${echecs} vérification(s) ratée(s)`); process.exit(1) }
console.log('Tout est vert')
