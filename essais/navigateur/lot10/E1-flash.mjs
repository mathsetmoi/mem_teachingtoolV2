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
  katex: document.querySelectorAll('.dialogue-flash .katex, .dialogue-flash img').length,
}))
ok(reglage.lancer, 'A) Sans thème coché, « Lancer » est grisé', reglage)
ok(/5/.test(reglage.total), 'A) Par défaut, 5 questions', reglage)
ok(reglage.katex === 0, 'A) Le réglage ne montre aucune question', reglage)
await p.click('.themes-niveau[data-niveau="5e"] label:has-text("Nombres relatifs")')
await p.click('.themes-niveau[data-niveau="5e"] label:has-text("Nombres rationnels")')
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
const retenu = await p.evaluate(() => ({ themes: [...document.querySelectorAll('.themes-niveau input:checked')].length, toutes: document.querySelector('input[value=toutes]').checked }))
ok(retenu.themes === 2 && retenu.toutes, 'E) Le réglage est retenu (2 thèmes, toutes d\'un coup)', retenu)
await p.keyboard.press('Escape')

// ---------- G. Un flash de 4e ----------
await p.click('button[title^="Automatismes"]')
await p.waitForSelector('dialog.dialogue-flash[open]')
const quatre = await p.evaluate(() => !document.querySelector('.niveau-flash[data-niveau="4e"]').disabled)
ok(quatre, 'G) Le niveau 4e n\'est plus grisé')
await p.click('.niveau-flash[data-niveau="4e"]')
for (const c of await p.$$('.themes-niveau[data-niveau="5e"] input:checked')) await c.click()
for (const t of ['Triangles', 'Parallélogrammes et translations', 'Représentation de l’espace', 'Repérage']) await p.click(`.themes-niveau[data-niveau="4e"] label:has-text("${t}")`)
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

// ---------- F. ----------
ok(!erreurs.length, 'F) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon')
process.exit(echecs ? 1 : 0)
