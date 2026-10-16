// Le toucher à deux doigts (annuler) et à trois (rétablir) après une rotation au doigt, sur l'iPad
import * as L from './lib/outils.mjs'
const { ok, attendre, poser, image, prendre, forme, tourner, ecran } = L
const ctx = await L.contexte({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true })
const { p, doigt } = await L.ouvrir(ctx, 'doigts')
await p.evaluate(L.PAGE_NEUVE)
const I = await poser(p, image(300, 250, 300, 200))
await prendre(p, [I])
const s = await ecran(p, 450, 350)
await doigt.bas(s.x, s.y); await attendre(40); await doigt.haut(); await attendre(400)
const avant = JSON.stringify(await forme(p, I))
await tourner(p, doigt, 45, { n: 20 })
const tourne = JSON.stringify(await forme(p, I))
await attendre(400)
const tap = async n => { const pts = [...Array(n)].map((_, i) => [700 + i * 60, 600, i + 1]); await doigt.toucher('touchStart', pts); await attendre(60); await doigt.toucher('touchEnd', []); await attendre(500) }
await tap(2)
const annule = JSON.stringify(await forme(p, I))
await tap(3)
const retabli = JSON.stringify(await forme(p, I))
ok(tourne !== avant && annule === avant && retabli === tourne, 'D1) après une rotation au doigt : deux doigts l\'annulent, trois la rétablissent', { m: [JSON.parse(avant).m, JSON.parse(annule).m, JSON.parse(retabli).m] })
await L.fin()
