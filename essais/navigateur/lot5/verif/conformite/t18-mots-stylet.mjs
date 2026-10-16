// Les mots du pointeur à la tablette graphique (stylet indirect, seul pointeur) : messages et aides du lot 5.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p, stylet } = await O.ouvrir(ctx, 'wacom')
await p.evaluate(O.IMAGES); await p.evaluate(O.PAGE_NEUVE)
const clicStylet = async (x, y) => { await stylet.survol(x, y); await stylet.bas(x, y); await O.attendre(40); await stylet.haut(x, y); await O.attendre(200) }
const centre = async loc => { const r = await loc.boundingBox(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }
// un trait au stylet pour que le dernier pointeur soit le stylet
await p.evaluate(() => window.__app.choisirOutil('stylo'))
await stylet.survol(300, 600); await stylet.bas(300, 600); for (let k = 1; k <= 10; k++) await stylet.va(300 + k * 10, 600); await stylet.haut(400, 600); await O.attendre(200)
// importer une image, puis « Fixer en fond » du message, au stylet
await p.evaluate(async () => { const cv = Object.assign(document.createElement('canvas'), { width: 300, height: 200 }); const g = cv.getContext('2d'); g.fillStyle = '#ddd'; g.fillRect(0, 0, 300, 200); const b = await new Promise(r => cv.toBlob(r, 'image/png')); await window.__app.importerImage(b) })
await O.attendre(300)
const bt = await centre(p.locator('button', { hasText: 'Fixer en fond' }).first())
await clicStylet(bt.x, bt.y)
note('message après Fixer en fond (stylet)', (await O.msgs(p)).slice(-1))
// (retouches après le lot 5 : « … Pour la tourner ou la déplacer : bouton du stylet dessus, puis « Détacher l'image du fond ». »)
ok(/bouton du stylet/i.test((await O.msgs(p)).at(-1)), 'Au stylet, le message de « Fixer en fond » parle du bouton du stylet', (await O.msgs(p)).at(-1))
// prendre le trait au stylet (outil Sélection), ouvrir son menu par le bouton du stylet, ⋯ : l'aide de Verrouiller
await p.evaluate(() => window.__app.choisirOutil('selection'))
await stylet.bouton(350, 600); await O.attendre(200)
const plus = await centre(p.locator('.panneau-forme .ligne button.plus'))
await clicStylet(plus.x, plus.y)
const mp = await p.evaluate(O.ENTREES, '.menu-plus')
const v = mp?.find(e => e.t === 'Verrouiller')
note('aide de Verrouiller (stylet)', v?.aide)
ok(/bouton du stylet/i.test(v?.aide ?? ''), 'Au stylet, l\'aide de « Verrouiller » parle du bouton du stylet', v?.aide)
const vb = await centre(p.locator('.menu-plus [data-action="verrouiller"]'))
await clicStylet(vb.x, vb.y)
note('message après Verrouiller (stylet)', (await O.msgs(p)).slice(-1))
ok(/Bouton du stylet/.test((await O.msgs(p)).at(-1)), 'Au stylet, le message de Verrouiller parle du bouton du stylet', (await O.msgs(p)).at(-1))
// le cadenas : appui sur lui (rappel)
await O.viderMsgs(p)
await clicStylet(350, 600)
note('rappel au stylet', await O.msgs(p))
// grouper au stylet : le message parle de « clic »
await O.fin()
