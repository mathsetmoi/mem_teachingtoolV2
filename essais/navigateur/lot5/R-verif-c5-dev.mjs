// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : le serveur de développement (window.__app) : A1 en détail, B4
// sur un trait, une formule, un groupe, plusieurs objets, une figure, un verrouillé.
// ADAPTÉE aux corrections : le surligneur a son épaisseur à lui, « Moyen » au
// démarrage (22,5), et non plus cinq fois le trait Fin (12,5).
// Copie de retouches/verif/conformite/c5-dev.mjs ; autonome.
// Serveur de développement (window.__app) : A1 en détail, B4 sur un trait,
// une formule, un groupe, plusieurs objets, une figure, un verrouillé.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
const D = `${RACINE_ESSAIS}/retouches/verif-corr/sondes-captures`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 900) : '') }
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage()
const erreurs = []
p.on('pageerror', e => erreurs.push(e.message))
await p.goto('http://localhost:5173/')
await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await p.waitForTimeout(800)
const trait = async (x0, y0, x1, y1) => { await p.mouse.move(x0, y0); await p.mouse.down(); for (let k = 1; k <= 12; k++) { await p.mouse.move(x0 + (x1 - x0) * k / 12, y0 + (y1 - y0) * k / 12 + Math.sin(k) * 3); await p.waitForTimeout(10) } await p.mouse.up(); await p.waitForTimeout(400) }
const formes = () => p.evaluate(() => JSON.parse(JSON.stringify(window.__app.formes)))

// A1
let r = await p.evaluate(() => ({ taille: window.__app.taille }))
ok(r.taille === 2.5, 'A1 : app.taille = 2,5 au démarrage', r)
await trait(300, 250, 500, 300)
let f = await formes()
ok(f.length === 1 && f[0].type === 'trait' && f[0].taille === 2.5, 'A1 : le premier trait au Stylo a l\'épaisseur 2,5', f.map(x => [x.type, x.taille]))
await p.keyboard.press('h'); await trait(300, 400, 500, 420)
f = await formes()
ok(f.some(x => x.taille === 22.5), 'A1 : le surligneur part à 22,5 (son épaisseur à lui, « Moyen »), le Stylo à 2,5', f.map(x => [x.type, x.taille]))
await p.keyboard.press('Control+z'); await p.waitForTimeout(200)
await p.keyboard.press('p')
// une figure : rectangle
await p.keyboard.press('r'); await p.mouse.move(700, 450); await p.mouse.down(); await p.mouse.move(800, 520, { steps: 8 }); await p.mouse.up(); await p.waitForTimeout(400)
// une formule
await p.keyboard.press('f'); await p.mouse.click(900, 250); await p.waitForTimeout(500)
await p.fill('dialog[open] .saisie', 'x^2+1'); await p.click('dialog[open] .principal'); await p.waitForTimeout(800)
await p.keyboard.press('p')
f = await formes()
console.log('formes', f.map(x => x.type))
const id = t => f.find(x => x.type === t)?.id

async function cas(nom, ids, attendu = true, avant = null) {
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape')
  await p.keyboard.press('v'); await p.waitForTimeout(100)
  if (avant) await avant()
  await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.rendu.toutRedessiner(); a.ui.maj() }, ids)
  await p.waitForTimeout(200)
  await p.keyboard.press('Shift+F10'); await p.waitForTimeout(400)
  const plus = p.locator('.panneau-forme button.plus').first()
  if (!(await plus.isVisible().catch(() => false))) { ok(!attendu, `${nom} : pas de menu complet ⋯`); return }
  await plus.click(); await p.waitForTimeout(300)
  const entrees = await p.evaluate(() => { const m = [...document.querySelectorAll('[role=menu]')].find(m => !m.hidden && m.getClientRects().length && m.querySelector('.menu-titre')); return m ? [...m.children].map(k => k.classList.contains('menu-titre') ? '# ' + k.textContent : k.classList.contains('menu-filet') ? '—' : k.querySelector('.libelle')?.firstChild?.textContent) : null })
  const a = entrees?.includes('Tourner d\'un quart de tour à gauche') && entrees?.includes('Tourner d\'un quart de tour à droite') && entrees?.includes('# Position')
  ok(!!a === attendu, `${nom} : quarts de tour ${attendu ? 'présents' : 'absents'} dans « Position »`, entrees)
  if (!a) { await p.keyboard.press('Escape'); return }
  const av = await formes(), pile0 = await p.evaluate(() => window.__app.tableau.pile?.(window.__app.page)?.undoStack?.length ?? null)
  await p.locator('[data-action="quart-droite"]').filter({ visible: true }).click(); await p.waitForTimeout(400)
  const ap = await formes()
  const change = JSON.stringify(av.filter(x => ids.includes(x.id))) !== JSON.stringify(ap.filter(x => ids.includes(x.id)))
  const sel = await p.evaluate(() => [...window.__app.selection])
  ok(change && ids.every(i => sel.includes(i)), `${nom} : « … à droite » change l'objet, la sélection reste`, { sel })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
  const re = await formes()
  ok(JSON.stringify(re) === JSON.stringify(av), `${nom} : un seul Ctrl+Z rend exactement l'état d'avant`)
  await p.keyboard.press('Control+y'); await p.waitForTimeout(300)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
}
await cas('Trait', [id('trait')])
await cas('Formule', [id('formule')])
await cas('Rectangle (figure seule)', [f.find(x => x.type === 'polygone')?.id])
await cas('Plusieurs (trait + formule)', [id('trait'), id('formule')])
// groupe
await p.keyboard.press('v')
await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.ui.maj() }, [id('trait'), f.find(x => x.type === 'polygone')?.id])
await p.keyboard.press('Control+g'); await p.waitForTimeout(300)
await cas('Groupe (trait + rectangle)', [id('trait'), f.find(x => x.type === 'polygone')?.id])
await p.keyboard.press('Control+Shift+g'); await p.waitForTimeout(300)
// verrouillé
await p.evaluate(i => { const a = window.__app; a.selection.clear(); a.selection.add(i); a.ui.maj() }, id('formule'))
await p.keyboard.press('Shift+L'); await p.waitForTimeout(300)
await cas('Formule verrouillée', [id('formule')], false)
await p.screenshot({ path: `${D}/c5-dev.png` })
console.log(erreurs.length ? '✗ erreurs JS ' + erreurs.join(' | ') : '✓ aucune erreur JS')
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est vert')
process.exit(echecs ? 1 : 0)
