// ESSAI DE LA TRIGONOMÉTRIE DU CATALOGUE (2 novembre 2026), 1re spé ›
// Trigonométrie. Le serveur de développement (:5173, window.__app).
// A. le chapitre montre le cercle, les courbes, l'enroulement, les cinq
//    fiches de formules et la démonstration déjà là ;
// B. le cercle, dans ses trois versions, se pose en un groupe d'objets
//    ordinaires (16 points pour les angles remarquables) ; Ctrl + Z le retire ;
// C. les courbes se posent ;
// D. une fiche à trous se pose ligne par ligne (→), sans « \trou » ;
// E. l'enroulement : posé à l'arrêt ; Espace le lance (rien n'est posé
//    pendant qu'il tourne), il s'arrête seul au bout d'un tour et pose ce
//    qu'on voit ; → avance d'un pas ; « Terminer » lâche le pilotage ;
// F. la recherche du panneau trouve « enroulement ».
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot21).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot21/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.goto(DEV)
await p.waitForFunction(() => window.__app?.page)
await p.waitForTimeout(600)
const nb = () => p.evaluate(() => window.__app.formes.length)
const pan = '.panneau-catalogue'

// A
await p.click('button[aria-label^="Catalogue"]')
await p.click(`${pan} .onglet[data-niveau="1re"]`)
await p.evaluate(() => { const d = document.querySelector('.panneau-catalogue .chapitre[data-cle="1re|Trigonométrie"]'); d.open = true })
const contenu = await p.evaluate(() => [...document.querySelectorAll('.panneau-catalogue .chapitre[data-cle="1re|Trigonométrie"] h4, .panneau-catalogue .chapitre[data-cle="1re|Trigonométrie"] .demo')].map(e => e.textContent.trim()))
ok(contenu.join('|') === 'Cercle trigonométrique|Courbes de cos et sin|Enroulement de la droite des réels|Formules|Radians et degrés|Mesure principale|Relations entre cos et sin|Valeurs remarquables|Fonctions cosinus et sinus|cos et sin de π/4 et de π/3', 'A. le chapitre Trigonométrie', contenu)
ok(await p.evaluate(() => document.querySelector('.panneau-catalogue .chapitre[data-cle="1re|Trigonométrie"] .nombre').textContent) === '9', 'A. 9 éléments annoncés')

// B
const poserA = async (sel, x = 420, y = 390) => { await p.click(sel); await p.mouse.move(x, y); await p.mouse.click(x, y); await p.waitForTimeout(300) }
for (const [v, points] of [['vide', 0], ['points', 16], ['valeurs', 16]]) {
  await p.click(`${pan} [data-cercle="${v}"]`)
  const avant = await nb()
  await poserA(`${pan} .poser-cercle`)
  const r = await p.evaluate(n => { const f = window.__app.formes.slice(n); return { n: f.length, groupes: new Set(f.map(x => x.groupe)).size, points: f.filter(x => x.type === 'polygone' && x.pts.length === 2 && x.stylePoints?.[0]?.marque === 'point').length, cercles: f.filter(x => x.type === 'cercle').length } }, avant)
  ok(r.groupes === 1 && r.cercles === 1 && r.points === points, `B. cercle « ${v} » : un groupe, ${points} points`, r)
  await p.screenshot({ path: SORTIE + `B-cercle-${v}.png` })
  if (v !== 'valeurs') { await p.keyboard.press('Control+z'); await p.waitForTimeout(300); ok(await nb() === avant, `B. Ctrl + Z retire le cercle « ${v} »`, await nb()) }
}
await p.evaluate(() => window.__app.nouvellePage?.() ?? window.__app.ajouterPage?.())
await p.waitForTimeout(300)

// C
{
  const avant = await nb()
  await poserA(`${pan} .poser-courbes`, 400, 380)
  ok(await nb() > avant + 10, 'C. les courbes sont posées', await nb() - avant)
  await p.screenshot({ path: SORTIE + 'C-courbes.png' })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
}

// D
await p.check(`${pan} .trous`)
{
  const avant = await nb()
  await poserA(`${pan} .fiche[data-fiche="2"]`, 420, 300)
  for (let k = 0; k < 8; k++) { await p.keyboard.press('ArrowRight'); await p.waitForTimeout(80) }
  const f = await p.evaluate(n => window.__app.formes.slice(n).filter(x => x.type === 'formule').map(x => x.latex), avant)
  ok(f.length === 9 && f.every(l => !l.includes('\\trou')) && f.some(l => l.includes('\\underline')), 'D. fiche « Relations » à trous, 1 titre + 8 lignes', f.length)
  ok(await p.evaluate(() => document.querySelector('.panneau-catalogue .titre-en-cours').textContent) === 'Formules en cours', 'D. « Formules en cours »')
  const largeur = await p.evaluate(() => Math.max(...[...document.querySelectorAll('.couche-formules .formule, .formule')].map(e => e.offsetWidth)))
  ok(largeur < 950, 'D. chaque ligne tient en moins de 950 px', largeur)
  await p.screenshot({ path: SORTIE + 'D-formules-a-trous.png' })
}
await p.uncheck(`${pan} .trous`)
await p.evaluate(() => window.__app.nouvellePage?.() ?? window.__app.ajouterPage?.())
await p.waitForTimeout(300)

// E
await p.selectOption(`${pan} .reperes`, 'les-deux')
await p.fill(`${pan} .reels`, 'π/3 ; 3π/4 ; −π/2')
{
  const avant = await nb()
  await poserA(`${pan} .poser-enroulement`, 380, 400)
  const pose = await nb() - avant
  ok(pose > 20 && await p.isVisible(`${pan} .pilote-enroulement`), 'E. l\'enroulement est posé, le pilotage paraît', pose)
  await p.selectOption(`${pan} .duree`, '4')
  await p.mouse.move(700, 700)
  await p.keyboard.press(' ')
  await p.waitForTimeout(1500)
  const pendant = await nb() - avant
  ok(pendant === 0, 'E. pendant la lecture, rien n\'est posé (peint à l\'écran seulement)', pendant)
  await p.screenshot({ path: SORTIE + 'E-pendant.png' })
  await p.waitForTimeout(3500)
  const etat = await p.evaluate(() => document.querySelector('.panneau-catalogue .etat-enroulement').textContent)
  ok(/tour complet/.test(etat) && await nb() - avant > 20, 'E. au bout d\'un tour, l\'animation s\'arrête et pose la figure', etat)
  ok(await p.evaluate(n => window.__app.formes.slice(n).some(f => f.type === 'formule' && f.latex.startsWith('M(')), avant), 'E. les réels choisis arrivent en M(…)')
  await p.screenshot({ path: SORTIE + 'E-un-tour.png' })
  await p.click(`${pan} .debut`); await p.waitForTimeout(200)
  await p.keyboard.press('ArrowRight'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(200)
  ok(/0,17 π/.test(await p.evaluate(() => document.querySelector('.panneau-catalogue .etat-enroulement').textContent)), 'E. deux pas : π/6')
  await p.click(`${pan} .terminer`)
  ok(!(await p.isVisible(`${pan} .pilote-enroulement`)) && await nb() - avant > 20, 'E. « Terminer » laisse la figure et cache le pilotage')
}

// F
await p.fill(`${pan} .recherche`, 'enroulement')
ok(await p.evaluate(() => [...document.querySelectorAll('.panneau-catalogue .resultats button')].some(b => b.textContent.includes('Enroulement'))), 'F. la recherche trouve l\'enroulement')
await p.fill(`${pan} .recherche`, '')

ok(erreurs.length === 0, 'Aucune erreur dans la console', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
