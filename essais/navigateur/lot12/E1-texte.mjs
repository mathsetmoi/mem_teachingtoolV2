// ESSAI DU LOT 11 : l'outil Texte (taper au clavier).
// Le serveur de développement (port 5173).
// A. T prend l'outil ; un clic dans le vide ouvre l'éditeur à cet endroit,
//    le curseur dedans ; ce qu'on tape (deux lignes) se pose à Échap, en un
//    texte (une formule qui porte ses lignes) ; l'outil reste le Texte ;
// B. une formule tapée entre deux $ s'affiche dès le second $ ;
// C. Ctrl + G met en gras, la barre le dit ; une couleur de la barre ;
// D. un cadre glissé donne la largeur : le texte passe à la ligne tout seul ;
// E. le double-clic (Sélection) rouvre le texte ; modifié, puis Ctrl + Z ;
// F. la gomme ne l'efface pas ; Suppr, oui ;
// G. copier, coller : le texte reste un texte ;
// H. les puces ; un clic ailleurs finit ; un texte vidé s'en va ;
// I. la recherche (Ctrl F) trouve un mot tapé ;
// J. aucune erreur.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1440, height: 900 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
const textes = () => p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].filter(f => Array.isArray(f.texte)))
const editeur = () => p.evaluate(() => {
  const e = document.querySelector('.editeur-texte')
  return e ? { focus: document.activeElement === e, html: e.innerHTML, h: e.offsetHeight, l: e.offsetWidth, barre: !!document.querySelector('.barre-texte') } : null
})

await p.goto(DEV)
await p.waitForFunction(() => window.__app, null, { timeout: 30000 })
await p.waitForTimeout(1200)
// Une page neuve, vide
await p.evaluate(() => window.__app.nouvellePage())
await p.waitForTimeout(400)

// ---------- A. Un clic, deux lignes, Échap ----------
await p.keyboard.press('t')
ok(await p.evaluate(() => window.__app.outil) === 'texte', 'A) T prend l\'outil Texte')
await p.mouse.click(400, 300)
await p.waitForTimeout(200)
const e0 = await editeur()
ok(e0 && e0.focus && e0.barre, 'A) Un clic ouvre l\'éditeur, le curseur dedans, et sa barre', e0)
await p.keyboard.type('Bonjour')
await p.keyboard.press('Enter')
await p.keyboard.type('la classe')
await p.keyboard.press('Escape')
await p.waitForTimeout(200)
let t = await textes()
ok(t.length === 1 && t[0].texte.length === 2 && t[0].texte[0].morceaux[0].t === 'Bonjour' && t[0].texte[1].morceaux[0].t === 'la classe',
  'A) Échap pose un texte de deux lignes', t)
ok(t[0] && /\\text\{Bonjour\}/.test(t[0].latex), 'A) Son latex (pour une version d\'avant) est écrit', t[0]?.latex)
ok(!(await editeur()), 'A) L\'éditeur est parti')
ok(await p.evaluate(() => window.__app.outil) === 'texte', 'A) L\'outil reste le Texte')
const vu = await p.evaluate(() => [...document.querySelectorAll('.couche-formules .formule.texte')].filter(e => e.style.visibility !== 'hidden').map(e => e.textContent))
ok(vu.some(x => /Bonjour.*la classe/.test(x)), 'A) Le texte se voit sur la page', vu)

// ---------- B. Une formule entre deux $ ----------
await p.mouse.click(400, 500)
await p.waitForTimeout(150)
await p.keyboard.type('Aire : $x^2$')
await p.waitForTimeout(100)
const eb = await p.evaluate(() => { const m = document.querySelector('.editeur-texte .math'); return m ? { tex: m.dataset.tex, katex: !!m.querySelector('.katex') } : null })
ok(eb && eb.tex === 'x^2' && eb.katex, 'B) Le second $ affiche la formule', eb)
await p.keyboard.type(' cm')
await p.keyboard.press('Escape')
await p.waitForTimeout(200)
t = await textes()
const b = t.find(x => x.texte[0].morceaux.some(m => m.f))
ok(b && b.texte[0].morceaux.map(m => (m.f ? '$' : '') + m.t).join('|') === 'Aire : |$x^2| cm', 'B) Posé : du texte, la formule, du texte', b?.texte)

// ---------- C. Gras et couleur ----------
await p.mouse.click(400, 650)
await p.waitForTimeout(150)
await p.keyboard.type('Le ')
await p.keyboard.press('Control+g')
await p.keyboard.type('gras')
const gras = await p.evaluate(() => document.querySelector('.barre-texte .bouton-texte.gras')?.classList.contains('actif'))
ok(gras, 'C) Ctrl + G : le bouton G de la barre est allumé', gras)
await p.keyboard.press('Control+g')
await p.click('.barre-texte .pastille-texte[aria-label="Rouge"]')
await p.keyboard.type(' rouge')
await p.click('.barre-texte .bouton-texte.fini')
await p.waitForTimeout(200)
t = await textes()
const c = t.find(x => x.texte[0].morceaux.some(m => m.g))
ok(c && c.texte[0].morceaux.some(m => m.g && m.t === 'gras') && c.texte[0].morceaux.some(m => m.c === '#d0342c' && /rouge/.test(m.t)), 'C) Le gras et le rouge sont gardés, « Terminé » finit', c?.texte)

// ---------- D. Un cadre glissé : la largeur ----------
await p.mouse.move(800, 200); await p.mouse.down(); await p.mouse.move(950, 220, { steps: 4 }); await p.mouse.move(1100, 240, { steps: 4 }); await p.mouse.up()
await p.waitForTimeout(150)
const ed = await editeur()
ok(ed && Math.abs(ed.l - 300) <= 2, 'D) L\'éditeur a la largeur du cadre glissé', ed?.l)
await p.keyboard.type('Un rectangle a pour longueur 8 cm et pour largeur 5 cm. Calculer son aire.')
const ed2 = await editeur()
ok(ed2 && ed2.h > 2.2 * 28, 'D) Le texte passe à la ligne tout seul', ed2?.h)
await p.keyboard.press('Escape')
await p.waitForTimeout(200)
t = await textes()
const d = t.find(x => x.largeur)
ok(d && Math.abs(d.largeur - 300) <= 1, 'D) Posé avec sa largeur', d?.largeur)

// ---------- E. Le double-clic le rouvre ; Ctrl + Z ----------
await p.keyboard.press('v')
const box = await p.evaluate(id => { const f = window.__app.forme(id); const b = window.__app.rendu.boiteFormule(f); const c = window.__app.cam; return { x: b.x * c.z + c.x, y: b.y * c.z + c.y, l: b.l * c.z, h: b.h * c.z } }, t.find(x => x.texte[0].morceaux[0].t === 'Bonjour').id)
const zone = await p.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left, y: r.top } })
await p.mouse.dblclick(zone.x + box.x + 20, zone.y + box.y + 15)
await p.waitForTimeout(250)
const ee = await editeur()
ok(ee && /Bonjour/.test(ee.html) && ee.focus, 'E) Le double-clic rouvre le texte dans l\'éditeur', ee)
await p.keyboard.press('Control+End')
await p.keyboard.type(' !')
await p.keyboard.press('Escape')
await p.waitForTimeout(200)
t = await textes()
ok(t.some(x => x.texte[1]?.morceaux[0]?.t === 'la classe !'), 'E) Modifié', t.map(x => x.texte))
await p.keyboard.press('Control+z')
await p.waitForTimeout(200)
t = await textes()
ok(t.some(x => x.texte[1]?.morceaux[0]?.t === 'la classe'), 'E) Ctrl + Z rend le texte d\'avant', t.map(x => x.texte))

// ---------- F. La gomme ne l'efface pas ----------
const n0 = t.length
await p.keyboard.press('e')
await p.mouse.move(zone.x + box.x + 5, zone.y + box.y + 15); await p.mouse.down()
await p.mouse.move(zone.x + box.x + box.l - 5, zone.y + box.y + 20, { steps: 8 }); await p.mouse.up()
await p.waitForTimeout(200)
ok((await textes()).length === n0, 'F) La gomme passe sur le texte sans l\'effacer', (await textes()).length)

// ---------- G. Copier, coller ----------
await p.keyboard.press('v')
await p.mouse.click(zone.x + box.x + 20, zone.y + box.y + 15)
await p.waitForTimeout(150)
await p.keyboard.press('Control+c'); await p.waitForTimeout(100)
await p.keyboard.press('Control+v'); await p.waitForTimeout(300)
t = await textes()
ok(t.length === n0 + 1 && t.filter(x => x.texte[0].morceaux[0].t === 'Bonjour').length === 2, 'G) Copié, collé : deux textes « Bonjour »', t.length)
await p.keyboard.press('Delete'); await p.waitForTimeout(200)
ok((await textes()).length === n0, 'F) Suppr l\'efface', (await textes()).length)

// ---------- H. Les puces ; un clic ailleurs ; un texte vidé ----------
await p.keyboard.press('t')
await p.mouse.click(400, 780)
await p.waitForTimeout(150)
await p.click('.barre-texte .bouton-texte:has-text("Puces")')
await p.keyboard.type('Premier')
await p.keyboard.press('Enter')
await p.keyboard.type('Second')
await p.mouse.click(1000, 700)
await p.waitForTimeout(200)
t = await textes()
const h = t.find(x => x.texte[0].morceaux[0]?.t === 'Premier')
ok(h && h.texte.length === 2 && h.texte.every(l => l.puce), 'H) Deux lignes à puce ; un clic ailleurs finit', h?.texte)
ok(!(await editeur()), 'H) Ce clic n\'a pas ouvert un autre texte')
// Vidé : il s'en va
const n1 = t.length
const bh = await p.evaluate(id => { const f = window.__app.forme(id); const b = window.__app.rendu.boiteFormule(f); const c = window.__app.cam; return { x: b.x * c.z + c.x, y: b.y * c.z + c.y } }, h.id)
await p.mouse.click(zone.x + bh.x + 30, zone.y + bh.y + 15)
await p.waitForTimeout(150)
await p.keyboard.press('Control+a'); await p.keyboard.press('Delete')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
ok((await textes()).length === n1 - 1, 'H) Un texte vidé s\'en va', (await textes()).length)

// ---------- K. Les côtés du cadre : la largeur ----------
const coteDroit = () => p.evaluate(() => {
  const a = window.__app, c = a.cadreDeLaSelection(), z = a.cam
  if (!c) return null
  const m = { x: (c.coins[1].x + c.coins[2].x) / 2, y: (c.coins[1].y + c.coins[2].y) / 2 }
  return { x: m.x * z.z + z.x, y: m.y * z.z + z.y, cotes: c.cotes }
})
await p.keyboard.press('v')
const dk = (await textes()).find(x => x.largeur)
const bk = await p.evaluate(id => { const f = window.__app.forme(id); const c = window.__app.cam; return { x: f.x * c.z + c.x, y: f.y * c.z + c.y } }, dk.id)
await p.mouse.click(zone.x + bk.x + 30, zone.y + bk.y + 15)
await p.waitForTimeout(200)
const cd = await coteDroit()
ok(cd && cd.cotes === 'lateraux', 'K) Un texte pris a des poignées à gauche et à droite', cd)
const h0 = await p.evaluate(id => window.__app.rendu.boiteFormule(window.__app.forme(id)).h, dk.id)
await p.mouse.move(zone.x + cd.x, zone.y + cd.y); await p.mouse.down()
await p.mouse.move(zone.x + cd.x - 50, zone.y + cd.y, { steps: 4 }); await p.mouse.move(zone.x + cd.x - 100, zone.y + cd.y, { steps: 4 })
const vif = await p.evaluate(id => window.__app.rendu.elementsFormules.get(id).el.style.transform, dk.id)
await p.mouse.up(); await p.waitForTimeout(250)
const dk2 = (await textes()).find(x => x.id === dk.id)
const h1 = await p.evaluate(id => window.__app.rendu.boiteFormule(window.__app.forme(id)).h, dk.id)
ok(Math.abs(dk2.largeur - (dk.largeur - 100)) <= 2 && dk2.taille === dk.taille, 'K) Le côté droit tiré de 100 px : 100 de moins de large, les caractères gardés', { avant: dk.largeur, apres: dk2.largeur, taille: dk2.taille })
ok(h1 > h0, 'K) Plus étroit, il passe à la ligne plus souvent', { h0, h1 })
ok(!/matrix/.test(vif), 'K) Pendant le geste, il se remet en page (pas étiré)', vif)
// Un texte qui s'allongeait : tiré par un côté, il prend une largeur
const ak = (await textes()).find(x => !x.largeur && x.texte[0].morceaux[0].t === 'Bonjour')
const ba = await p.evaluate(id => { const f = window.__app.forme(id); const c = window.__app.cam; return { x: f.x * c.z + c.x, y: f.y * c.z + c.y } }, ak.id)
await p.mouse.click(zone.x + ba.x + 20, zone.y + ba.y + 15)
await p.waitForTimeout(200)
const ca = await coteDroit()
await p.mouse.move(zone.x + ca.x, zone.y + ca.y); await p.mouse.down()
await p.mouse.move(zone.x + ca.x + 80, zone.y + ca.y, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(250)
const ak2 = (await textes()).find(x => x.id === ak.id)
ok(ak2.largeur > 100 && ak2.taille === ak.taille, 'K) Un texte sans largeur, tiré par un côté, en prend une', ak2.largeur)
await p.keyboard.press('Escape')

// ---------- I. La recherche ----------
await p.keyboard.press('Control+f')
await p.waitForTimeout(300)
await p.keyboard.type('chocolat'); await p.waitForTimeout(100)
await p.keyboard.press('Escape'); await p.keyboard.press('Escape')
await p.keyboard.press('t')
await p.mouse.click(400, 420)
await p.keyboard.type('Une tablette de chocolat')
await p.keyboard.press('Escape'); await p.waitForTimeout(1500)
await p.keyboard.press('Control+f')
await p.waitForTimeout(300)
await p.keyboard.type('chocolat')
await p.waitForTimeout(800)
const trouve = await p.evaluate(() => [...document.querySelectorAll('.res-texte')].map(e => e.textContent))
ok(trouve.some(x => /Une tablette de chocolat/.test(x)), 'I) La recherche trouve le texte tapé, montré à plat', trouve)
await p.keyboard.press('Escape'); await p.keyboard.press('Escape')

ok(!erreurs.length, 'J) Aucune erreur', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon')
process.exit(echecs ? 1 : 0)
