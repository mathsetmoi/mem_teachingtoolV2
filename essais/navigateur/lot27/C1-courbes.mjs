// ESSAI DE L'OUTIL « COURBE » : TRACER UNE FONCTION (lot 27, 14 novembre
// 2026). Le serveur de développement (:5173, window.__app).
// A. le bouton « Courbe » (famille Insérer) ouvre le panneau, la touche Y
//    aussi ; le catalogue se ferme ;
// B. le modèle « a(x − α)² + β » suit le pointeur ; un clic pose un groupe
//    d'objets ordinaires ; l'axe des abscisses garde la recette ; trois
//    curseurs (a, α, β) ;
// C. bouger un curseur : rien n'est posé tant qu'on le tient (le repère
//    n'est que peint), le lâcher pose le repère changé ; un seul Ctrl + Z
//    le ramène comme avant ;
// D. taper une écriture fausse la montre en rouge ; une juste, la formule
//    bien écrite dessous ; Entrée pose ;
// E. point M et tangente : les pointillés, l'équation y = … ;
// F. le repère déplacé puis modifié reste là où on l'a mis ; un repère pris
//    à la Sélection, panneau fermé puis rouvert, se modifie ;
// G. 3e : « ax + b » ; deux courbes ; la copie (Ctrl + C, Ctrl + V) garde
//    la recette ;
// H. 1024 × 768 : la barre du haut tient, le bouton « Courbe » est là.
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot27).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot27/', import.meta.url).pathname
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
const pan = '.panneau-courbes'
const recettes = () => p.evaluate(() => window.__app.formes.filter(f => f.courbes).map(f => f.courbes))
const groupes = () => p.evaluate(() => [...new Set(window.__app.formes.filter(f => f.groupe).map(f => f.groupe))])

const prendreRepere = async () => {
  await p.evaluate(() => document.activeElement?.blur?.())
  await p.keyboard.press('v')
  const pt = await p.evaluate(() => { const a = window.__app, f = a.formes.find(x => x.courbes); const e = a.cam.versEcran(f.x + f.pts[0] + 40, f.y + f.pts[1]); const r = document.querySelector('.zone, canvas').getBoundingClientRect(); return { x: e.x + r.left, y: e.y + r.top } })
  await p.mouse.click(pt.x, pt.y)
  await p.waitForTimeout(200)
}

// A
await p.click('button[aria-label^="Catalogue"]')
await p.click('button[aria-label^="Courbe"]')
ok(await p.isVisible(pan) && !(await p.isVisible('.panneau-catalogue:not(.panneau-courbes)')), 'A. le bouton ouvre le panneau, le catalogue se ferme')
await p.click(`${pan} .fermer`)
ok(!(await p.isVisible(pan)), 'A. × ferme le panneau')
await p.mouse.click(700, 500)
await p.keyboard.press('Escape')
await p.keyboard.press('y')
ok(await p.isVisible(pan), 'A. la touche Y l\'ouvre')
const modeles = await p.evaluate(() => [...document.querySelectorAll('.panneau-courbes .modele')].map(b => b.textContent))
ok(modeles.includes('x²') && modeles.includes('a(x − α)² + β') && modeles.includes('ax² + bx + c'), 'A. les modèles du lycée', modeles)
await p.screenshot({ path: SORTIE + 'A-panneau.png' })

// B
await p.click(`${pan} [data-onglet="lycee"]`)
const avantB = await nb()
await p.click(`${pan} .modele:has-text("a(x − α)² + β")`)
await p.mouse.move(520, 420)
await p.waitForTimeout(150)
ok(await p.evaluate(() => window.__app.rendu.fantomes.length > 3), 'B. le repère suit le pointeur')
await p.mouse.click(520, 420)
await p.waitForTimeout(300)
const b = await p.evaluate(n => { const f = window.__app.formes.slice(n); return { n: f.length, groupes: new Set(f.map(x => x.groupe)).size, axe: f.filter(x => x.courbes).length, formules: f.filter(x => x.type === 'formule').length } }, avantB)
ok(b.n > 20 && b.groupes === 1 && b.axe === 1 && b.formules > 10, 'B. un groupe d\'objets ordinaires, l\'axe garde la recette', b)
const lettres = await p.evaluate(() => [...document.querySelectorAll('.panneau-courbes .curseur-courbes[data-lettre]')].map(d => d.dataset.lettre))
ok(lettres.join(',') === 'a,α,β', 'B. trois curseurs a, α, β', lettres)
await p.screenshot({ path: SORTIE + 'B-pose.png' })

// C
{
  const avant = await nb()
  const curseur = `${pan} .curseur-courbes[data-lettre="a"] input[type="range"]`
  const boite = await p.locator(curseur).boundingBox()
  await p.mouse.move(boite.x + boite.width * 0.6, boite.y + boite.height / 2)
  await p.mouse.down()
  await p.mouse.move(boite.x + boite.width * 0.4, boite.y + boite.height / 2, { steps: 5 })
  await p.waitForTimeout(120)
  const pendant = await nb()
  ok(pendant < avant - 10 && await p.evaluate(() => !!window.__app.rendu.dessinAnime), 'C. curseur tenu : le repère n\'est que peint', { avant, pendant })
  await p.screenshot({ path: SORTIE + 'C-curseur-tenu.png' })
  await p.mouse.up()
  await p.waitForTimeout(300)
  const r = await recettes()
  ok(await nb() > avant - 3 && r.length === 1 && r[0].curseurs.a < 0, 'C. curseur lâché : le repère changé est posé (a < 0)', { n: await nb(), r })
  await p.screenshot({ path: SORTIE + 'C-a-negatif.png' })
  await p.mouse.click(1000, 700); await p.keyboard.press('Escape')
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  const r2 = await recettes()
  ok(r2.length === 1 && r2[0].curseurs.a === 1, 'C. un Ctrl + Z ramène a = 1', r2)
  ok(await p.evaluate(() => document.querySelector('.panneau-courbes .curseur-courbes[data-lettre="a"] input[type="number"]').value) === '1', 'C. le panneau suit le Ctrl + Z')
}

// D
{
  const champ = `${pan} #courbe-0`
  await p.fill(champ, '2x+')
  await p.waitForTimeout(100)
  ok(await p.evaluate(() => document.querySelector('#courbe-0').classList.contains('faux')), 'D. une écriture fausse est en rouge')
  await p.fill(champ, '0,5x^2-2')
  await p.waitForTimeout(100)
  const lu = await p.evaluate(() => document.querySelector('.panneau-courbes .lu-courbe').textContent)
  ok(lu.includes('f(x)') && !(await p.evaluate(() => document.querySelector('#courbe-0').classList.contains('faux'))), 'D. une écriture juste : la formule dessous', lu)
  await p.press(champ, 'Enter')
  await p.waitForTimeout(300)
  const r = await recettes()
  ok(r.length === 1 && r[0].fonctions[0] === '0,5x^2-2' && !(await p.evaluate(() => !!window.__app.rendu.dessinAnime)), 'D. Entrée pose le repère changé', r)
  ok((await p.evaluate(() => document.querySelector('.panneau-courbes .curseurs-courbes').hidden)), 'D. sans lettre, plus de curseurs')
}

// E
{
  await p.check(`${pan} [data-option="point"]`)
  await p.check(`${pan} [data-option="tangente"]`)
  await p.fill(`${pan} .x0-valeur`, '3')
  await p.press(`${pan} .x0-valeur`, 'Tab')
  await p.waitForTimeout(300)
  const e = await p.evaluate(() => ({ tirets: window.__app.formes.filter(f => f.tirets).length, eq: window.__app.formes.filter(f => f.type === 'formule' && f.latex.startsWith('y =')).map(f => f.latex) }))
  ok(e.tirets === 2 && e.eq.length === 1 && e.eq[0] === 'y = 3x - 6{,}5', 'E. point M, pointillés et tangente y = 3x − 6,5', e)
  await p.screenshot({ path: SORTIE + 'E-point-tangente.png' })
}

// F
{
  await prendreRepere()
  ok(await p.evaluate(() => window.__app.selection.size) > 20, 'F. un clic sur l\'axe prend tout le repère')
  await p.screenshot({ path: SORTIE + 'F-repere-pris.png' })
  await p.keyboard.press('Shift+ArrowRight'); await p.keyboard.press('Shift+ArrowRight')
  await p.waitForTimeout(200)
  const avant = await p.evaluate(() => window.__app.formes.find(f => f.courbes).x)
  await p.fill(`${pan} .x0-valeur`, '-1')
  await p.press(`${pan} .x0-valeur`, 'Tab')
  await p.waitForTimeout(300)
  const apres = await p.evaluate(() => window.__app.formes.find(f => f.courbes).x)
  ok(Math.abs(apres - avant) < 0.5, 'F. le repère déplacé puis modifié reste où on l\'a mis', { avant, apres })
  const sel = await p.evaluate(() => window.__app.selection.size)
  ok(sel > 20, 'F. le repère modifié reste pris', sel)
  await p.click(`${pan} .fermer`)
  await p.keyboard.press('y')
  ok(await p.evaluate(() => document.querySelector('#courbe-0').value) === '0,5x^2-2', 'F. rouvert, le panneau montre le repère pris')
  await p.fill(`${pan} #courbe-0`, 'x^2-3')
  await p.press(`${pan} #courbe-0`, 'Enter')
  await p.waitForTimeout(300)
  const r = await recettes()
  ok(r.length === 1 && r[0].fonctions[0] === 'x^2-3' && (await groupes()).length === 1, 'F. le repère pris est modifié (pas un second)', r.map(x => x.fonctions))
}

// G
{
  await p.evaluate(() => window.__app.nouvellePage?.())
  await p.waitForTimeout(300)
  await p.click(`${pan} [data-onglet="college"]`)
  await p.click(`${pan} .modele:has-text("ax + b")`)
  await p.mouse.move(520, 420); await p.mouse.click(520, 420)
  await p.waitForTimeout(300)
  await p.click(`${pan} .ajouter-courbe`)
  await p.waitForTimeout(300)
  const r = await recettes()
  ok(r.length === 1 && r[0].fonctions.length === 2 && r[0].fonctions[0] === 'ax+b', 'G. 3e : ax + b, puis une seconde courbe', r)
  await p.screenshot({ path: SORTIE + 'G-3e-deux-courbes.png' })
  await prendreRepere()
  await c.grantPermissions(['clipboard-read', 'clipboard-write'])
  await p.keyboard.press('Control+c'); await p.waitForTimeout(150)
  await p.keyboard.press('Control+v'); await p.waitForTimeout(400)
  ok((await recettes()).length === 2, 'G. la copie garde la recette', (await recettes()).length)
}

// H
{
  const voir = () => p.evaluate(() => {
    const b = document.querySelector('button[aria-label^="Courbe"]'), r = b?.getBoundingClientRect()
    return { visible: !!r && r.width > 0, droite: Math.max(...[...document.querySelectorAll('.barre-haut > *')].map(e => e.getBoundingClientRect().right)) }
  })
  const h1366 = await voir()
  ok(h1366.visible && h1366.droite <= 1366, 'H. 1366 px : « Courbe » est dans la barre', h1366)
  await p.setViewportSize({ width: 1024, height: 768 })
  await p.waitForTimeout(400)
  const h = await voir()
  ok(!h.visible && h.droite <= 1024, 'H. 1024 px : « Courbe » laisse sa place (la barre tient)', h)
  await p.click('button[aria-label^="Enregistrer, ouvrir"]')
  await p.waitForTimeout(300)
  const entree = p.locator('.menu-item[data-action="courbe"]')
  ok(await entree.count() === 1, 'H. 1024 px : « Courbe » est dans le menu ⋯')
  await p.screenshot({ path: SORTIE + 'H-1024.png' })
  if (await entree.count()) {
    await p.keyboard.press('Escape'); await p.waitForTimeout(150)
    if (await p.isVisible(pan)) { await p.evaluate(() => document.activeElement?.blur?.()); await p.keyboard.press('y'); await p.waitForTimeout(150) }
    await p.click('button[aria-label^="Enregistrer, ouvrir"]'); await p.waitForTimeout(250)
    await entree.click(); await p.waitForTimeout(200)
    ok(await p.isVisible(pan), 'H. l\'entrée du menu ouvre le panneau')
  }
}

ok(!erreurs.length, 'aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon')
process.exit(echecs ? 1 : 0)
