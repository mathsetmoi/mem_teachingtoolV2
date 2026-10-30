// ESSAI DU MENU DU CLASSEUR (30 octobre 2026) : un clic sur la carte du
// classeur, en haut à gauche, ouvre ses séances, puis la bibliothèque. Le
// serveur de développement (:5173, window.__app) ; l'heure est celle de
// Playwright (clock). Un classeur de huit séances :
// A. le clic ouvre le menu : six séances, la plus récente en haut, celle
//    qu'on regarde cochée, les passées « en lecture », « Toutes les
//    séances (8)… », « Nouvelle séance », « Bibliothèque des classeurs » ;
// B. une séance passée : sa première page, en lecture ; la plus récente :
//    retour à aujourd'hui ;
// C. « Bibliothèque des classeurs » l'ouvre ; Échap rend le focus à la carte ;
// D. Ctrl + B l'ouvre sans passer par le menu ;
// E. « Toutes les séances… » ouvre la vue « Séances », sur ce chapitre ;
// F. au clavier : Entrée ouvre le menu, le focus va à la première séance,
//    Échap le ferme et revient à la carte ;
// G. au téléphone : le bouton du classeur (dans la barre) ouvre le même
//    menu ; caché faute de place, « Plus › Séances du chapitre… ».
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot20).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot20/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const JOUR = 24 * 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()   // un lundi

async function classeurDeHuitSeances(p, x = 500) {
  p.on('pageerror', e => erreurs.push(e.message))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
  await p.clock.install({ time: T0 })
  await p.goto(DEV)
  await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(800)
  const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
  await trait(x, 300)
  for (let k = 1; k < 8; k++) {
    await p.clock.setSystemTime(T0 + k * JOUR)
    await p.evaluate(() => window.__app.nouvelleSeance())
    await p.clock.runFor(300)
    await trait(x, 300 + 20 * k)
  }
  await p.clock.runFor(2000)
}
const menu = '.menu-seances'
const entrees = p => p.evaluate(sel => [...document.querySelectorAll(sel + ' .menu-item')].map(b => ({
  action: b.dataset.action, texte: b.querySelector('.libelle')?.firstChild?.textContent, aide: b.querySelector('small')?.textContent ?? null,
  coche: b.getAttribute('aria-checked'), seance: b.dataset.seance ?? null })), menu)
const ouvert = p => p.evaluate(sel => !document.querySelector(sel).hidden, menu)

// ---------- L'ordinateur ----------
const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
await classeurDeHuitSeances(p)
const seances = await p.evaluate(() => window.__app.tableau.seancesDuClasseur().map(s => s.id))
ok(seances.length === 8, 'Un classeur de huit séances', seances)

// A
await p.click('.bouton-classeur'); await p.clock.runFor(100)
let l = await entrees(p)
const lesSeances = l.filter(x => x.action === 'voir-seance')
ok(await ouvert(p) && lesSeances.length === 6, 'A1) Le clic sur la carte ouvre le menu : six séances', l)
ok(lesSeances[0].seance === seances[7] && lesSeances[5].seance === seances[2], 'A2) La plus récente en haut', lesSeances.map(x => x.seance))
ok(lesSeances[0].coche === 'true' && lesSeances.slice(1).every(x => x.coche === 'false'), 'A3) Celle qu\'on regarde est cochée', lesSeances.map(x => x.coche))
ok(/^Séance du lun 19 oct/.test(lesSeances[0].texte) && lesSeances[0].aide === '1 page' && lesSeances.slice(1).every(x => /en lecture$/.test(x.aide)), 'A4) Le nom, les pages, « en lecture » pour les passées', lesSeances.map(x => [x.texte, x.aide]))
ok(l.some(x => x.action === 'toutes-les-seances' && x.texte === 'Toutes les séances (8)…') && l.some(x => x.action === 'nouvelle-seance') && l.at(-1).action === 'bibliotheque',
  'A5) « Toutes les séances (8)… », « Nouvelle séance », et la bibliothèque en bas', l.map(x => x.action))
const place = await p.evaluate(sel => { const m = document.querySelector(sel).getBoundingClientRect(), b = document.querySelector('.bouton-classeur').getBoundingClientRect(); return { haut: m.top - b.bottom, gauche: m.left - b.left, bas: m.bottom <= innerHeight } }, menu)
ok(place.haut >= 0 && place.haut < 12 && Math.abs(place.gauche) < 12 && place.bas, 'A6) Le menu est sous la carte, dans l\'écran', place)
ok(await p.getAttribute('.bouton-classeur', 'aria-expanded') === 'true', 'A7) aria-expanded sur la carte')
await p.screenshot({ path: SORTIE + '1-menu.png' })

// B
await p.click(`${menu} [data-seance="${seances[4]}"]`); await p.clock.runFor(300)
let e = await p.evaluate(() => ({ vue: window.__app.seanceVue?.id, passee: window.__app.enSeancePassee }))
ok(!(await ouvert(p)) && e.vue === seances[4] && e.passee, 'B1) Une séance passée : on y va, en lecture', e)
await p.screenshot({ path: SORTIE + '2-seance-passee.png' })
await p.click('.bouton-classeur'); await p.clock.runFor(100)
await p.click(`${menu} [data-seance="${seances[7]}"]`); await p.clock.runFor(300)
e = await p.evaluate(() => ({ vue: window.__app.seanceVue?.id, passee: window.__app.enSeancePassee }))
ok(e.vue === seances[7] && !e.passee, 'B2) La plus récente : retour à aujourd\'hui', e)

// C
await p.click('.bouton-classeur'); await p.clock.runFor(100)
await p.click(`${menu} [data-action="bibliotheque"]`)
await p.waitForSelector('.bibliotheque:not([hidden])'); await p.clock.runFor(400)
ok(await p.evaluate(() => window.__bibliotheque.ouvert), 'C1) « Bibliothèque des classeurs » l\'ouvre')
await p.keyboard.press('Escape'); await p.clock.runFor(400)
const f = await p.evaluate(() => ({ biblio: window.__bibliotheque.ouvert, focus: document.activeElement?.className }))
ok(!f.biblio && f.focus === 'bouton-classeur', 'C2) Échap la ferme, le focus revient à la carte', f)

// D
await p.mouse.click(700, 500); await p.clock.runFor(200)
await p.keyboard.press('Control+b'); await p.waitForSelector('.bibliotheque:not([hidden])'); await p.clock.runFor(300)
ok(await p.evaluate(() => window.__bibliotheque.ouvert) && !(await ouvert(p)), 'D) Ctrl + B ouvre la bibliothèque, sans le menu')
await p.keyboard.press('Escape'); await p.clock.runFor(400)

// E
await p.click('.bouton-classeur'); await p.clock.runFor(100)
await p.click(`${menu} [data-action="toutes-les-seances"]`)
await p.waitForSelector('.bibliotheque:not([hidden])'); await p.clock.runFor(1500)
const v = await p.evaluate(() => ({ vue: !document.querySelector('.biblio-vue-seances').hidden, chapitre: document.querySelector('[data-action="seances-chapitre"]')?.getAttribute('aria-pressed'), n: document.querySelectorAll('.biblio-vue-seances button.seance-ligne').length }))
ok(v.vue && v.chapitre === 'true' && v.n === 8, 'E) « Toutes les séances… » : la vue « Séances », sur ce chapitre', v)
await p.screenshot({ path: SORTIE + '3-toutes-les-seances.png' })
await p.keyboard.press('Escape'); await p.clock.runFor(300)
await p.keyboard.press('Escape'); await p.clock.runFor(400)

// F
await p.focus('.bouton-classeur'); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab')
await p.keyboard.press('Enter'); await p.clock.runFor(100)
let k = await p.evaluate(() => ({ ouvert: !document.querySelector('.menu-seances').hidden, focus: document.activeElement?.dataset.action }))
ok(k.ouvert && k.focus === 'voir-seance', 'F1) Entrée ouvre le menu, le focus sur la première séance', k)
await p.keyboard.press('ArrowDown'); await p.keyboard.press('Escape'); await p.clock.runFor(100)
k = await p.evaluate(() => ({ ouvert: !document.querySelector('.menu-seances').hidden, focus: document.activeElement?.className }))
ok(!k.ouvert && k.focus === 'bouton-classeur', 'F2) Échap le ferme, le focus revient à la carte', k)
await c.close()

// G : le téléphone (à la souris, comme les autres essais du téléphone qui écrivent)
const t = await nav.newContext({ viewport: { width: 390, height: 844 } })
const q = await t.newPage()
await classeurDeHuitSeances(q, 140)
// Le bouton du classeur est dans la barre du haut (son icône) ; caché
// faute de place, c'est « Plus › Séances du chapitre… »
const forme = await q.evaluate(() => window.__app.ui.formeClasseur)
if (forme === 'cache') {
  await q.click('.barre-haut .bouton.points'); await q.clock.runFor(200)
  await q.click('[data-action="seances-du-chapitre"]')
} else await q.click('.bouton-classeur')
await q.clock.runFor(200)
const g = await q.evaluate(() => { const m = document.querySelector('.menu-seances'), r = m.getBoundingClientRect(); return { ouvert: !m.hidden, n: m.querySelectorAll('[data-action="voir-seance"]').length, dedans: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, h: [...m.querySelectorAll('.menu-item')].every(b => b.offsetHeight >= 44) } })
ok(g.ouvert && g.n === 6 && g.dedans && g.h, `G) Au téléphone (bouton ${forme}) : le menu des séances, dans l'écran, des lignes de 44 px au moins`, g)
await q.screenshot({ path: SORTIE + '4-telephone.png' })
await t.close()

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
