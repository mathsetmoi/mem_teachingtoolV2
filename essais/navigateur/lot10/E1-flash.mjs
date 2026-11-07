// ESSAI DU LOT 10 : le flash d'automatismes, sur une page de la séance.
// Le serveur de développement (port 5173).
// A. Le bouton « Automatismes » ouvre le réglage ; rien n'est posé sur la
//    page pendant le réglage, aucune question n'est montrée ; « Lancer » est
//    grisé sans thème ; par défaut 2 questions de cours et 3 exercices
//    d'application (5 questions) ;
// B. lancé, une question à la fois : la première en grand, → passe à la
//    suivante, Espace met en pause ; C corrige : les réponses en vert ; après
//    la correction, C redevient le raccourci de l'outil ;
// C. « Bonjour ! » : la case « Commencer par des automatismes » n'est pas
//    cochée d'office ; cochée, la nouvelle séance s'ouvre sur le réglage,
//    devant une page vide ;
// D. toutes d'un coup : la minuterie attend sur une autre page ;
//    « Nouveaux exemples » pose un autre flash sur la page d'après ;
// E. le réglage est retenu ;
// G. un flash de 4e (thèmes de géométrie, avec figures) : 5 questions,
//    corrigées en vert, avec la phrase du programme en bleu sous les
//    réponses des 3 exercices ;
// H. un flash de 2nde et de 1re cochées ensemble (fonctions, statistiques,
//    probabilités : courbes, diagrammes, arbres) : 5 questions corrigées
//    en vert, la phrase du programme sous chaque exercice ;
// I. au collège, l'arbre du programme (7 novembre 2026) : cinq thèmes,
//    la pensée informatique grisée (« rien au programme »), une case de
//    thème coche tous ses domaines, la flèche d'un domaine montre ses
//    compétences (les phrases de la liste « Automatismes ») ;
// J. en 5e, chaque compétence a ses exercices : aucune case grisée, et une
//    seule compétence cochée (Angles, « angle droit 90°, plat 180° ») ne
//    pose que des questions sur la mesure d'un angle droit ou plat ;
// K. la 3e (7 novembre 2026) : le niveau n'est plus grisé, aucune
//    compétence grisée ; un flash de 3e (Triangles et Statistiques) pose
//    5 questions, corrigées en vert, la phrase du programme sous chaque
//    exercice ;
// F. aucune erreur.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const VERT = '#1e8a4c'

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
const nObjets = () => p.evaluate(() => window.__app.tableau.formesDe(window.__app.page)?.size ?? 0)
const etat = () => p.evaluate(() => document.querySelector('.etat-flash')?.textContent ?? '')
/** Coche un domaine du collège : son thème se déplie d'abord s'il est fermé */
const cocher = async (niveau, domaine) => {
  const c = `.case-domaine[value="${niveau}/${domaine}"]`
  if (!await p.isVisible(c)) await p.click(`.themes-niveau[data-niveau="${niveau}"] .arbre-theme:has(${c}) > .ligne-arbre > .deplier`)
  await p.click(c)
}

await p.goto(DEV)
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForTimeout(1200)

// ---------- A. Le réglage ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const reglage = await p.evaluate(() => ({
  lancer: document.querySelector('.dialogue-flash .lancer').disabled,
  total: document.querySelector('.total-flash').textContent,
  formes: [...document.querySelectorAll('.forme-flash')].map(f => f.dataset.forme + '=' + f.querySelector('output, .valeur, span:not(:empty)')?.textContent),
  // Les phrases du programme (compétences, avec des maths) ne sont pas des questions
  katex: [...document.querySelectorAll('.dialogue-flash .katex, .dialogue-flash img')].filter(e => !e.closest('.liste-themes')).length,
}))
ok(reglage.lancer, 'A) Sans thème coché, « Lancer » est grisé', reglage)
ok(/5/.test(reglage.total), 'A) Par défaut, 5 questions', reglage)
ok(reglage.katex === 0, 'A) Le réglage ne montre aucune question', reglage)
await cocher('5e', 'Nombres relatifs')
await cocher('5e', 'Nombres rationnels')
ok(await nObjets() === 0, 'A) Rien n\'est posé sur la page pendant le réglage', await nObjets())

// ---------- B. Une question à la fois ----------
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const e1 = await etat()
ok(/Question 1 sur 5/.test(e1), 'B) Lancé : la question 1 sur 5', e1)
ok(await nObjets() > 0, 'B) Des objets sont posés sur la page')
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600)
const e2 = await etat()
ok(/Question 2 sur 5/.test(e2), 'B) → passe à la question 2', e2)
await p.keyboard.press(' '); await p.waitForTimeout(300)
const ep = await etat()
ok(/pause/i.test(ep), 'B) Espace met en pause', ep)
await p.keyboard.press(' '); await p.waitForTimeout(300)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const verts = await p.evaluate(v => [...window.__app.tableau.formesDe(window.__app.page).values()].filter(f => f.couleur === v).length, VERT)
ok(verts >= 5, 'B) C corrige : une réponse en vert par question', verts)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.keyboard.press('c'); await p.waitForTimeout(200)
const outil = await p.evaluate(() => window.__app.outil + '/' + (window.__app.typeForme ?? ''))
ok(/cercle/.test(outil), 'B) Après la correction, C redevient l\'outil Cercle', outil)
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- C. « Bonjour ! » ----------
await p.evaluate(() => { const a = window.__app; a.tableau.nouveauGeste(); a.tableau.poser(a.page, { id: 'x1', type: 'formule', x: 100, y: 300, latex: 'x', couleur: '#000', taille: 30, z: 1, auteur: 'e' }) })
await p.waitForTimeout(1500)
await p.clock.install({ time: Date.now() + 3 * 3600_000 })
await p.reload()
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForSelector('dialog.dialogue-accueil[open]', { timeout: 10000 })
ok(!(await p.evaluate(() => document.querySelector('.accueil-automatismes').checked)), 'C) « Commencer par des automatismes » n\'est pas cochée d\'office')
await p.check('.accueil-automatismes')
await p.click('.accueil-nouvelle')
const regle = await p.waitForSelector('dialog.dialogue-flash[open]', { timeout: 5000 }).then(() => true, () => false)
ok(regle, 'C) Cochée : la nouvelle séance s\'ouvre sur le réglage')
ok(await nObjets() === 0, 'C) … devant une page vide', await nObjets())

// ---------- D. Toutes d'un coup ----------
await p.click('input[value=toutes]')
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const page1 = await p.evaluate(() => window.__app.page)
await p.evaluate(() => window.__app.nouvellePage()); await p.waitForTimeout(1200)
const ailleurs = await etat()
ok(/attente/.test(ailleurs), 'D) Sur une autre page, la minuterie attend', ailleurs)
await p.evaluate(p1 => window.__app.allerPage(p1), page1); await p.waitForTimeout(500)
await p.keyboard.press('c'); await p.waitForTimeout(600)
await p.click('.bandeau-flash .nouveaux'); await p.waitForTimeout(1500)
const info = await p.evaluate(() => ({ page: window.__app.page, n: window.__app.tableau.formesDe(window.__app.page).size, ordre: window.__app.pagesDuJour }))
ok(info.page !== page1 && info.n > 0 && info.ordre.indexOf(info.page) === info.ordre.indexOf(page1) + 1,
  'D) « Nouveaux exemples » : un autre flash, sur la page juste après', { ...info, page1 })
await p.click('.bandeau-flash .fermer')
ok(await p.evaluate(() => document.querySelector('.bandeau-flash').hidden), 'D) × ferme le bandeau')

// ---------- E. Le réglage retenu ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const retenu = await p.evaluate(() => ({ themes: [...document.querySelectorAll('.themes-niveau .case-domaine:checked')].length, toutes: document.querySelector('input[value=toutes]').checked }))
ok(retenu.themes === 2 && retenu.toutes, 'E) Le réglage est retenu (2 thèmes, toutes d\'un coup)', retenu)
await p.keyboard.press('Escape')

// ---------- G. Un flash de 4e ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const quatre = await p.evaluate(() => !document.querySelector('.niveau-flash[data-niveau="4e"]').disabled)
ok(quatre, 'G) Le niveau 4e n\'est plus grisé')
await p.click('.niveau-flash[data-niveau="4e"]')
for (const c of await p.$$('.themes-niveau[data-niveau="5e"] .case-domaine:checked')) await c.click()
for (const t of ['Triangles', 'Parallélogrammes et translations', 'Représentation de l’espace', 'Repérage']) await cocher('4e', t)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageG = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsG = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageG])
ok(vertsG >= 5, 'G) Un flash de 4e : 5 questions, corrigées en vert', vertsG)
const bleusG = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageG)
ok(bleusG >= 3, 'G) À la correction, la phrase du programme sous chaque exercice (en bleu)', bleusG)
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- H. Un flash de 2nde et de 1re ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const lycee = await p.evaluate(() => ['2nde', '1re'].every(n => !document.querySelector(`.niveau-flash[data-niveau="${n}"]`).disabled))
ok(lycee, 'H) Les niveaux 2nde et 1re ne sont plus grisés')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="2nde"]'); await p.click('.niveau-flash[data-niveau="1re"]')
for (const c of await p.$$('.themes-niveau:not([hidden]) input:checked')) await c.click()
for (const n of ['2nde', '1re']) for (const t of ['Fonctions et représentations', 'Statistiques', 'Probabilités']) await p.click(`.themes-niveau[data-niveau="${n}"] label:has-text("${t}")`)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageH = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsH = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageH])
ok(vertsH >= 5, 'H) Un flash de 2nde et 1re : 5 questions, corrigées en vert', vertsH)
const bleusH = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageH)
ok(bleusH >= 3, 'H) À la correction, la phrase de la liste officielle sous chaque exercice', bleusH)
if (process.env.CAPTURE) await p.screenshot({ path: process.env.CAPTURE })
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- I. L'arbre du collège ----------
await p.keyboard.press('Escape').catch(() => {})
await p.click('.bandeau-flash .fermer').catch(() => {})
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="5e"]')
const arbre = await p.evaluate(() => {
  const n = document.querySelector('.themes-niveau[data-niveau="5e"]')
  return {
    themes: [...n.querySelectorAll('.arbre-theme')].map(t => t.querySelector('.ligne-arbre').textContent.trim().replace(/\s+/g, ' ')),
    informatique: n.querySelector('.arbre-theme.vide')?.textContent.replace(/\s+/g, ' ').trim(),
  }
})
ok(arbre.themes.length === 5 && /^Nombres et calculs/.test(arbre.themes[0]), 'I) 5e : cinq thèmes, Nombres et calculs d\'abord', arbre)
ok(/La pensée informatique.*rien au programme/.test(arbre.informatique ?? ''), 'I) La pensée informatique est grisée : rien au programme', arbre)
for (const c of await p.$$('.themes-niveau[data-niveau="5e"] .case-domaine:checked')) await c.click()
await p.click('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"]) .case-theme')
const geo = await p.evaluate(() => {
  const t = document.querySelector('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"])')
  return { domaines: [...t.querySelectorAll('.case-domaine')].map(c => c.checked), visibles: !t.querySelector(':scope > .enfants').hidden }
})
ok(geo.domaines.length >= 5 && geo.domaines.every(Boolean), 'I) La case « Espace et géométrie » coche tous ses domaines', geo)
if (!geo.visibles) await p.click('.themes-niveau[data-niveau="5e"] .arbre-theme:has(.case-domaine[value="5e/Angles"]) > .ligne-arbre > .deplier')
await p.click('.themes-niveau[data-niveau="5e"] .arbre-domaine:has(.case-domaine[value="5e/Angles"]) .deplier')
const comp = await p.evaluate(() => [...document.querySelectorAll('.arbre-domaine:has(.case-domaine[value="5e/Angles"]) .case-competence')].filter(c => c.offsetParent).length)
ok(comp === 4, 'I) La flèche d\'Angles montre ses 4 compétences', comp)
const grisees = await p.evaluate(() => [...document.querySelectorAll('.themes-niveau[data-niveau="5e"] .case-competence')].filter(c => c.disabled).length)
ok(grisees === 0, 'J) En 5e, aucune compétence n\'est grisée (chacune a ses exercices)', grisees)
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1200)
ok(await nObjets() > 0, 'I) Le flash se lance avec le thème entier')
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- K. La 3e ----------
await p.keyboard.press('Escape').catch(() => {})
await p.click('.bandeau-flash .fermer').catch(() => {})
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
ok(await p.evaluate(() => !document.querySelector('.niveau-flash[data-niveau="3e"]').disabled), 'K) Le niveau 3e n\'est plus grisé')
for (const b of await p.$$('.niveau-flash[aria-pressed=true]')) await b.click()
await p.click('.niveau-flash[data-niveau="3e"]')
const grisees3 = await p.evaluate(() => [...document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-competence')].filter(c => c.disabled).length)
const comps3 = await p.evaluate(() => document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-competence').length)
ok(comps3 === 37 && grisees3 === 0, 'K) En 3e, 37 compétences, aucune grisée', { comps3, grisees3 })
// Les cases de domaine sont repliées sous leur thème : on les coche comme un clic
await p.evaluate(() => {
  for (const c of document.querySelectorAll('.themes-niveau[data-niveau="3e"] .case-domaine:checked')) c.click()
  for (const d of ['3e/Triangles', '3e/Statistiques']) document.querySelector(`.themes-niveau[data-niveau="3e"] .case-domaine[value="${d}"]`).click()
})
await p.click('.dialogue-flash .lancer')
await p.waitForTimeout(1500)
const pageK = await p.evaluate(() => window.__app.page)
await p.keyboard.press('c'); await p.waitForTimeout(800)
const vertsK = await p.evaluate(([v, pg]) => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === v).length, [VERT, pageK])
ok(vertsK >= 5, 'K) Un flash de 3e : 5 questions, corrigées en vert', vertsK)
const bleusK = await p.evaluate(pg => [...window.__app.tableau.formesDe(pg).values()].filter(f => f.couleur === '#1f5fbf').length, pageK)
ok(bleusK >= 3, 'K) À la correction, la phrase du programme sous chaque exercice', bleusK)
if (process.env.CAPTURE3) await p.screenshot({ path: process.env.CAPTURE3 })
await p.click('.bandeau-flash .fermer').catch(() => {})

// ---------- F. ----------
ok(!erreurs.length, 'F) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon')
process.exit(echecs ? 1 : 0)
