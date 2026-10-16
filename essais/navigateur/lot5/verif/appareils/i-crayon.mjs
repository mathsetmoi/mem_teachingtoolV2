// Vérification par appareil, lot 5 : l'iPad et son CRAYON (stylet posé sur
// l'écran : pointerType 'pen', maxTouchPoints > 0), plus le doigt. Le crayon
// détecté fait passer le doigt en « déplace ».
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, pile, cadre, vue, versF, ecran, glisserF, tourner, msgs, vider } = L
const boutons = p => p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetWidth).map(b => (b.textContent.trim() || b.getAttribute('aria-label') || '').slice(0, 30)))
const items = p => p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(b => b.offsetWidth).map(b => b.textContent.trim().slice(0, 40)))

const ctx = await L.contexte({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true })
await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
const { p, stylet, doigt } = await L.ouvrir(ctx, 'ipad-crayon')
await p.evaluate(L.PAGE_NEUVE)
// Le crayon se pose une fois (un point au Stylo) : le doigt passe en « déplace »
await p.evaluate(() => window.__app.choisirOutil('stylo'))
// (Adapté au contrôle final du lot 5 : le point (900, 650) du monde tombe, à
// 1180 × 820, sur la barre du zoom (« 100 % ») : le crayon n'y touchait pas le
// tableau, et I0 échouait sans que l'application y soit pour rien. Le même
// trait, posé sur le tableau ; l'original dans lot5/cf/avant-adaptation.)
let s = await ecran(p, 700, 450)
await stylet.bas(s.x, s.y); await stylet.va(s.x + 30, s.y + 5); await stylet.haut(s.x + 30, s.y + 5); await attendre(400)
ok(await p.evaluate(() => window.__app.doigtDeplace), 'I0) le crayon détecté : le doigt déplace')
await p.evaluate(() => window.__app.choisirOutil('selection'))
const I = await poser(p, image(300, 250, 300, 200))
await prendre(p, [I])
// I1. À la Sélection, le crayon prend le coin (poignées du stylet)
s = await ecran(p, 600, 450)
await stylet.survol(s.x, s.y); await attendre(80)
let n0 = await pile(p)
await glisserF(p, stylet, { x: s.x + 6, y: s.y + 6 }, { x: s.x + 106, y: s.y + 73 })
let f = await forme(p, I)
ok(f.m[0] > 5.5 && await pile(p) === n0 + 1, 'I1) le crayon, à la Sélection, agrandit par le coin (une étape)', f.m)
await p.evaluate(() => window.__app.annuler()); await attendre(150)
// I2. Au Stylo, l'image prise : le crayon parti du coin écrit ; le doigt, lui, a les poignées
await p.evaluate(() => window.__app.choisirOutil('stylo'))
await prendre(p, [I])
const n = (await L.formes(p)).length
await glisserF(p, stylet, s, { x: s.x + 70, y: s.y + 30 })
ok((await L.formes(p)).length === n + 1 && (await forme(p, I)).m[0] === 5, 'I2) au Stylo, le crayon parti du coin de l\'image prise écrit', { n: (await L.formes(p)).length - n })
await prendre(p, [I])
await glisserF(p, doigt, { x: s.x + 5, y: s.y + 5 }, { x: s.x + 105, y: s.y + 72 }, { n: 14, pas: 16 })
f = await forme(p, I)
ok(f.m[0] > 5.5, 'I2b) au Stylo, le doigt qui déplace prend le coin de l\'image prise', f.m)
await p.evaluate(() => window.__app.annuler()); await attendre(150)
// I3. L'appui long du crayon, à la Sélection, sur un verrouillé : son menu court
await p.evaluate(() => window.__app.choisirOutil('selection'))
const T = await poser(p, triangle(800, 500))
await p.evaluate(id => window.__app.verrouiller(true, [id]), T); await attendre(150)
s = await ecran(p, 840, 450)
await stylet.survol(s.x, s.y); await stylet.bas(s.x, s.y); await attendre(750); await stylet.haut(s.x, s.y); await attendre(300)
let b = await boutons(p)
ok(b.some(x => /^Déverrouiller/.test(x)), 'I3) l\'appui long du crayon sur le verrouillé : son menu court', b.filter(x => /errou/.test(x)))
await p.keyboard.press('Escape'); await attendre(200)
// I4. L'appui long du crayon sur une image fixée : le menu de la page, Détacher
await p.evaluate(id => window.__app.fixerEnFond([id]), I); await attendre(150)
await vider(p)
s = await ecran(p, 380, 300)
await stylet.survol(s.x, s.y); await stylet.bas(s.x, s.y); await attendre(750); await stylet.haut(s.x, s.y); await attendre(300)
let e = await items(p)
ok(e.some(x => /Détacher l.image du fond/.test(x)), 'I4) l\'appui long du crayon sur l\'image fixée : Détacher', e)
await p.keyboard.press('Escape'); await attendre(200)
// I5. Le crayon à la Sélection marque un temps sur un objet libre puis glisse : il le déplace, sans menu ? (sur iPad, l'appui long l'ouvre : 500 ms)
const W = await poser(p, trait(300, 600, 100, { taille: 5 }))
await vider(p)
s = await ecran(p, 350, 600)
await stylet.survol(s.x, s.y); await stylet.bas(s.x, s.y); await attendre(200)
for (let i = 1; i <= 10; i++) { await stylet.va(s.x + i * 8, s.y + i * 3); await attendre(10) }
await stylet.haut(s.x + 80, s.y + 30); await attendre(300)
ok((await forme(p, W)).x > 360, 'I5) le crayon tient 200 ms puis glisse : le trait se déplace', (await forme(p, W)).x)
await L.fin()
