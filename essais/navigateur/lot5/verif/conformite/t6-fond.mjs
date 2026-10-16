// Point 2 : « Fixer en fond » par le chemin du professeur, à la tablette graphique (stylet indirect) et à la souris.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p, stylet } = await O.ouvrir(ctx, 'wacom')
await p.evaluate(() => { const a = window.__app; a.nouvellePage(); a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
// 1. Importer une image (un énoncé gris clair de 600 × 300)
await p.evaluate(async () => {
  const cv = Object.assign(document.createElement('canvas'), { width: 600, height: 300 }); const g = cv.getContext('2d')
  g.fillStyle = '#e8e8f0'; g.fillRect(0, 0, 600, 300); g.fillStyle = '#333'; g.font = '30px sans-serif'; g.fillText('Exercice 12 : construire le symétrique', 20, 60)
  const b = await new Promise(r => cv.toBlob(r, 'image/png'))
  await window.__app.importerImage(b)
})
await p.waitForTimeout(300)
const toast = await p.evaluate(() => [...document.querySelectorAll('.toast, .message, [role=status]')].filter(e => e.offsetParent).map(e => e.textContent))
note('message de l\'import', toast)
const img = await p.evaluate(() => [...window.__app.selection][0])
await p.locator('button', { hasText: 'Fixer en fond' }).first().click(); await p.waitForTimeout(200)
let f = await O.forme(p, img)
ok(f.fixe === true, 'Le bouton « Fixer en fond » du message fixe l\'image', { fixe: f.fixe, msgs: await O.msgs(p) })
note('sélection après fixer', { sel: await O.sel(p), outil: await p.evaluate(() => window.__app.outil) })
// boîte de l'image à l'écran
const bi = await p.evaluate(id => { const a = window.__app, f = a.forme(id), r = document.getElementById('zone').getBoundingClientRect(); const s = a.cam.versEcran(f.x, f.y); return { x: s.x + r.left, y: s.y + r.top, l: f.l * f.m[0] * a.cam.z, h: f.h * f.m[3] * a.cam.z } }, img)
note('boîte de l\'image', bi)
// 2. Écrire au stylet sur elle (au Stylo)
await p.evaluate(() => window.__app.choisirOutil('stylo'))
const mot = async (x0, y0) => { await stylet.survol(x0, y0); await stylet.bas(x0, y0); for (let k = 1; k <= 12; k++) await stylet.va(x0 + k * 6, y0 + Math.sin(k) * 8); await stylet.haut(x0 + 72, y0); await p.waitForTimeout(80) }
await mot(bi.x + 100, bi.y + 150); await mot(bi.x + 200, bi.y + 150); await mot(bi.x + 300, bi.y + 220)
const nTraits = await p.evaluate(() => window.__app.formes.filter(f => f.type === 'trait').length)
ok(nTraits === 3, 'Trois mots écrits au stylet sur l\'image fixée', nTraits)
// 3. Le lasso au stylet, parti sur l'image, autour des deux premiers mots
await p.evaluate(() => window.__app.choisirOutil('selection'))
{ const cx = bi.x + 170, cy = bi.y + 150, R = 110
  await stylet.survol(cx + R, cy); await stylet.bas(cx + R, cy)
  for (let k = 1; k <= 30; k++) { const a = k / 30 * 2 * Math.PI; await stylet.va(cx + R * Math.cos(a), cy + 40 * Math.sin(a)) }
  await stylet.haut(cx + R, cy); await p.waitForTimeout(200) }
let s = await O.sel(p)
ok(s.length === 2 && !s.includes(img), 'Le lasso au stylet parti sur l\'image fixée entoure l\'écriture (2 mots), pas l\'image', s)
await O.vider(p)
// 4. Le cadre à la souris, parti sur l'image
await O.glisserEcran(p, { x: bi.x + 60, y: bi.y + 110 }, { x: bi.x + 290, y: bi.y + 190 })
s = await O.sel(p)
ok(s.length === 2 && !s.includes(img), 'Le cadre à la souris parti sur l\'image fixée prend l\'écriture, pas l\'image', s)
await O.vider(p)
// 5. Clic simple sur l'image : rien
await p.mouse.click(bi.x + 500, bi.y + 250); await p.waitForTimeout(150)
ok((await O.sel(p)).length === 0, 'Un clic sur l\'image fixée ne prend rien', await O.sel(p))
// 6. La gomme au trait entier (stylet) passe sur l'image et sur le troisième mot
await p.evaluate(() => window.__app.choisirOutil('gomme'))
await stylet.survol(bi.x + 280, bi.y + 220); await stylet.bas(bi.x + 280, bi.y + 220)
for (let k = 1; k <= 20; k++) await stylet.va(bi.x + 280 + k * 8, bi.y + 220 + (k % 2) * 4)
await stylet.haut(bi.x + 440, bi.y + 220); await p.waitForTimeout(200)
const apres = await p.evaluate(id => ({ image: !!window.__app.forme(id), traits: window.__app.formes.filter(f => f.type === 'trait').length }), img)
ok(apres.image && apres.traits === 2, 'La gomme (trait entier) efface le mot, jamais l\'image fixée', apres)
// 7. Le bouton du stylet sur l'image : le menu de la page, avec Détacher
await p.evaluate(() => window.__app.choisirOutil('stylo'))
await stylet.bouton(bi.x + 500, bi.y + 60); await p.waitForTimeout(200)
const mp = await p.evaluate(O.ENTREES, '.menu-flottant[aria-label="Page"]')
note('menu de la page sur l\'image fixée', mp)
ok(mp && mp.some(e => e.t === 'Détacher l\'image du fond'), 'Le bouton du stylet sur l\'image fixée : « Détacher l\'image du fond »')
await p.screenshot({ path: C + '/captures/t6-menu-page.png' })
await p.keyboard.press('Escape')
// 8. Dupliquer la page : l'image reste fixée sur la copie
await p.keyboard.press('Control+Shift+D'); await p.waitForTimeout(400)
const copie = await p.evaluate(() => window.__app.formes.filter(f => f.type === 'image').map(f => ({ fixe: f.fixe })))
ok(copie.length === 1 && copie[0].fixe === true, 'Dupliquer la page : l\'image est fixée sur la copie', copie)
// 6b. La gomme partielle (bout gomme ou mode zone) sur l'image : rien
await p.evaluate(() => { const a = window.__app; a.page = a.page })
// 9. La revue : la page se construit, l'image fixée sous l'écriture
await O.fin()
