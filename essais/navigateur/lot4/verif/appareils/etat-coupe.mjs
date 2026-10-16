// L'état du bouton du classeur est-il coupé (« … ») sur l'iPad en paysage et sur les écrans proches ?
import { lancer, contexte, ouvrir, info, ok, dort, CAPTURES } from './outils.mjs'
const nav = await lancer()
for (const [w, h, nom] of [[1180, 820, 'Premier classeur'], [1180, 820, 'Symétrie'], [1180, 820, 'Fractions et nombres décimaux'], [1194, 834, 'Symétrie'], [1112, 834, 'Symétrie'], [1210, 800, 'Symétrie'], [1280, 800, 'Symétrie centrale et axiale : cours']]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true })
  const p = await ouvrir(ctx, '', 'etat')
  await p.evaluate(async n => { await window.__registre.modifierClasseur(window.__app.classeur.id, f => { f.nom = n }) }, nom)
  await p.reload(); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await dort(800)
  const g = await p.evaluate(() => { const e = document.querySelector('.etat-classeur'), n = document.querySelector('.nom-classeur'), b = document.querySelector('.barre-classeur').getBoundingClientRect(); return { forme: window.__app.ui.formeClasseur, etat: e.textContent, coupe: e.scrollWidth > e.clientWidth + 1, besoin: e.scrollWidth, a: e.clientWidth, nomCoupe: n.scrollWidth > n.clientWidth + 1, barre: Math.round(b.width) } })
  ok(g.forme !== 'large' || !g.coupe, `${w}×${h} « ${nom} » : l'état « ${g.etat} » entier sur le bouton`, g)
  if (g.coupe) await p.screenshot({ path: CAPTURES + `etat-coupe-${w}x${h}-${nom.length}.png`, clip: { x: 0, y: 0, width: 500, height: 90 } })
  await ctx.close()
}
await nav.close()
