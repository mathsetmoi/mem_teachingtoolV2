// Point 4 : la gomme partielle. Le menu, le mode retenu, la coupe d'un trait et d'un surligneur,
// le bout gomme du stylet (événements de pointeur synthétiques, boutons 32), une étape d'annulation,
// rien sur une figure, une image, une formule, et le message.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p, stylet } = await O.ouvrir(ctx, 'gomme')
await p.evaluate(O.IMAGES); await p.evaluate(O.PAGE_NEUVE)
// Le défaut : trait entier
ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === null, 'Rien de retenu au départ')
const T = await O.poser(p, O.trait(200, 200, 300, { pression: true, pts: Array.from({ length: 31 }, (_, i) => [i * 10, 0, 0.2 + i / 60]).flat() }))
const H = await O.poser(p, O.trait(200, 300, 300, { couleur: '#ffd400', taille: 20, opacite: 0.4, surligneur: true }))
const Tri = await O.poser(p, O.triangle(650, 150))
const I = await O.poser(p, O.image('vert', 200, 380, 120, 80))
const F = await O.poser(p, O.formule(400, 380))
// Choisir la gomme zone par son menu (clic droit sur son bouton)
const gb = await p.evaluate(() => { const b = [...document.querySelectorAll('.barre-outils button')].find(b => /^Gomme/.test(b.title)); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
await p.mouse.click(gb.x, gb.y, { button: 'right' }); await p.waitForTimeout(200)
note('outil après clic droit sur la Gomme', await p.evaluate(() => window.__app.outil))
await p.locator('.menu-flottant[aria-label="Gomme"] [data-action="gomme-zone"]').click(); await p.waitForTimeout(150)
ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === 'zone' && await p.evaluate(() => window.__app.outil) === 'gomme', 'Le mode « là où elle passe » est retenu, la Gomme en main')
// Un coup à la souris qui coupe le trait et le surligneur et passe sur la figure, l'image et la formule
await p.evaluate(() => window.__app.choisirOutil('gomme'))
const pile0 = await O.pile(p)
await O.viderMsgs(p)
const a = await O.ecran(p, 350, 150), b = await O.ecran(p, 350, 470)
await O.glisserEcran(p, a, b, 30)
// un second coup sur la figure, l'image et la formule
await O.glisserEcran(p, await O.ecran(p, 250, 420), await O.ecran(p, 760, 300), 30)
await O.glisserEcran(p, await O.ecran(p, 420, 400), await O.ecran(p, 700, 420), 30)
const traits = await p.evaluate(() => window.__app.formes.filter(f => f.type === 'trait').map(f => ({ id: f.id, n: f.pts.length / 3, x: f.x, pression: f.pression, surligneur: f.surligneur, opacite: f.opacite, taille: f.taille, p0: f.pts[2] })))
note('traits après le coup', traits)
ok(traits.length === 4, 'Le trait et le surligneur sont coupés en deux morceaux chacun', traits.length)
const reste = await p.evaluate(ids => ids.map(i => !!window.__app.forme(i)), [Tri, I, F])
ok(reste.every(Boolean), 'La figure, l\'image et la formule restent', reste)
note('messages', await O.msgs(p))
ok(await O.pile(p) === pile0 + 1, 'Le premier coup : une étape d\'annulation (les deux suivants n\'ont rien coupé)', { pile0, pile: await O.pile(p) })
await p.keyboard.press('Control+z'); await p.waitForTimeout(150)
ok(await p.evaluate(() => window.__app.formes.filter(f => f.type === 'trait').length) === 2, 'Ctrl + Z rend les deux traits entiers')
// Le bout gomme du stylet suit le mode, même au Stylo
await p.evaluate(() => window.__app.choisirOutil('stylo'))
const pe = async (type, x, y, buttons) => p.evaluate(({ type, x, y, buttons }) => {
  const z = document.getElementById('zone')
  z.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: 'pen', isPrimary: true, clientX: x, clientY: y, buttons, button: type === 'pointermove' ? -1 : 5, pressure: 0.5, bubbles: true, cancelable: true }))
}, { type, x, y, buttons })
const g1 = await O.ecran(p, 300, 150), g2 = await O.ecran(p, 300, 330)
await pe('pointerdown', g1.x, g1.y, 32)
for (let k = 1; k <= 20; k++) await pe('pointermove', g1.x, g1.y + (g2.y - g1.y) * k / 20, 32)
await pe('pointerup', g2.x, g2.y, 0); await p.waitForTimeout(200)
const apresStylet = await p.evaluate(() => ({ n: window.__app.formes.filter(f => f.type === 'trait').length, outil: window.__app.outil }))
ok(apresStylet.n === 4 && apresStylet.outil === 'stylo', 'Le bout gomme du stylet coupe (mode « là où elle passe »), le Stylo reste en main', apresStylet)
// Remettre le trait entier
await p.evaluate(() => window.__app.choisirOutil('gomme'))
const gb2 = gb
await p.mouse.click(gb2.x, gb2.y); await p.waitForTimeout(200)
note('menu après retouche', await p.evaluate(O.ENTREES, '.menu-flottant[aria-label="Gomme"]'))
await p.locator('.menu-flottant[aria-label="Gomme"] [data-action="gomme-trait"]').click(); await p.waitForTimeout(150)
ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === 'trait', 'Retour au trait entier, retenu')
await O.fin()
