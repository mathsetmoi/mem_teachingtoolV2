// Point 1 du lot : le cadre de taille et la pastille ↻, à la souris (1366 × 768).
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p, stylet } = await O.ouvrir(ctx, 'souris')
await p.evaluate(O.IMAGES); await p.evaluate(O.PAGE_NEUVE)
const cadre = () => p.evaluate(() => { const c = window.__app.cadreDeLaSelection(); return c && { genre: c.genre, cotes: c.cotes, n: c.coins.length, coins: c.coins, centre: c.centre, pastille: c.pastille, dessous: c.dessous } })
const choisir = ids => p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.options = null; a.rendu.redessinerDirect(); a.ui.maj() }, ids)
const I = await O.poser(p, O.image('vert', 80, 80, 240, 160))
const T = await O.poser(p, O.trait(420, 120, 160))
const Tri = await O.poser(p, O.triangle(650, 120, { codage: true }))
const F = await O.poser(p, O.formule(120, 380))
await p.waitForTimeout(200)
for (const [nom, ids] of [['image', [I]], ['trait', [T]], ['triangle', [Tri]], ['formule', [F]], ['plusieurs', [I, F]]]) {
  await choisir(ids); await p.waitForTimeout(80)
  note('cadre ' + nom, await cadre())
}
// Sous le Stylo : jamais de cadre
await choisir([I]); await p.evaluate(() => window.__app.choisirOutil('stylo')); await p.waitForTimeout(80)
ok((await cadre()) === null, 'Sous le Stylo (souris), une image sélectionnée n\'a pas de cadre')
await p.evaluate(() => window.__app.choisirOutil('selection'))
// Grouper le trait et le triangle, puis tourner le groupe de 90° par la pastille
await choisir([T, Tri]); await p.keyboard.press('Control+g'); await p.waitForTimeout(200)
note('après Ctrl+G', await O.msgs(p))
const groupe = await p.evaluate(ids => ids.map(i => window.__app.forme(i).groupe), [T, Tri])
ok(groupe[0] && groupe[0] === groupe[1], 'Ctrl + G groupe le trait et le triangle', groupe)
const pileAvant = await O.pile(p)
let c = await cadre()
note('cadre du groupe', c)
const triAvant = await O.forme(p, Tri)
await p.screenshot({ path: C + '/captures/t2-groupe-avant.png' })
// tourner : de la pastille, autour du centre, d'environ 88°
const cen = await O.ecran(p, c.centre.x, c.centre.y), pa = await O.ecran(p, c.pastille.x, c.pastille.y)
const R = Math.hypot(pa.x - cen.x, pa.y - cen.y), a0 = Math.atan2(pa.y - cen.y, pa.x - cen.x)
await p.mouse.move(pa.x, pa.y); await p.mouse.down()
let texte = null
for (let k = 1; k <= 22; k++) {
  const a = a0 + (88 * Math.PI / 180) * k / 22
  await p.mouse.move(cen.x + R * Math.cos(a), cen.y + R * Math.sin(a))
}
await p.waitForTimeout(80)
texte = await p.evaluate(() => [...document.querySelectorAll('.mesure, .mesure-geste, [class*=mesure]')].filter(e => !e.hidden && e.offsetParent).map(e => e.textContent))
await p.screenshot({ path: C + '/captures/t2-groupe-pendant.png' })
await p.mouse.up(); await p.waitForTimeout(200)
note('mesure affichée pendant', texte)
const triApres = await O.forme(p, Tri)
note('triangle avant/après', { avant: triAvant.pts, apres: triApres.pts, xa: [triAvant.x, triAvant.y], xb: [triApres.x, triApres.y], hab: triApres.habillage ?? triApres.etiquettes ?? null })
ok(await O.pile(p) === pileAvant + 1, 'Tourner le groupe : une étape d\'annulation', { avant: pileAvant, apres: await O.pile(p) })
await p.screenshot({ path: C + '/captures/t2-groupe-apres.png' })
// Ctrl+Z
await p.keyboard.press('Control+z'); await p.waitForTimeout(150)
const triZ = await O.forme(p, Tri)
ok(JSON.stringify(triZ.pts) === JSON.stringify(triAvant.pts), 'Ctrl + Z rend le triangle d\'avant la rotation')
await p.keyboard.press('Control+y'); await p.waitForTimeout(150)
// Formule : un coin tiré
await choisir([F]); await p.waitForTimeout(80)
c = await cadre()
const fAvant = await O.forme(p, F)
const coin = await O.ecran(p, c.coins[2].x, c.coins[2].y), opp = await O.ecran(p, c.coins[0].x, c.coins[0].y)
await O.glisserEcran(p, coin, { x: opp.x + (coin.x - opp.x) * 2, y: opp.y + (coin.y - opp.y) * 2 }, 12)
const fApres = await O.forme(p, F)
note('formule agrandie', { avant: fAvant.taille, apres: fApres.taille, xy: [fAvant.x, fAvant.y, fApres.x, fApres.y] })
// la tourner de 30° environ
c = await cadre()
{ const cen = await O.ecran(p, c.centre.x, c.centre.y), pa = await O.ecran(p, c.pastille.x, c.pastille.y)
  const R = Math.hypot(pa.x - cen.x, pa.y - cen.y), a0 = Math.atan2(pa.y - cen.y, pa.x - cen.x)
  await p.mouse.move(pa.x, pa.y); await p.mouse.down()
  for (let k = 1; k <= 10; k++) { const a = a0 + (30 * Math.PI / 180) * k / 10; await p.mouse.move(cen.x + R * Math.cos(a), cen.y + R * Math.sin(a)) }
  await p.mouse.up(); await p.waitForTimeout(200) }
const fT = await O.forme(p, F)
note('formule tournée', { rotation: fT.rotation, deg: fT.rotation * 180 / Math.PI, taille: fT.taille })
const dom = await p.evaluate(() => [...document.querySelectorAll('.formule, .couche-formules > *')].map(e => ({ t: e.style.transform, fs: e.style.fontSize, cls: e.className })).slice(0, 4))
note('formule DOM', dom)
await O.vider(p)
await p.evaluate(() => { const a = window.__app; a.cam.z = 3; a.cam.x = -200; a.cam.y = -1000; a.rendu.toutRedessiner(); a.ui.maj() })
await p.waitForTimeout(300)
await p.screenshot({ path: C + '/captures/t2-formule-300.png' })
await O.fin()
