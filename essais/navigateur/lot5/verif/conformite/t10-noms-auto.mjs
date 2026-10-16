// Point 5 : « Noms sous les outils » en « auto » selon l'écran ; la place des libellés ; la barre du zoom.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const cas = [
  ['poste de la classe', { viewport: { width: 1366, height: 768 }, screen: { width: 1366, height: 768 } }, false],
  ['TNI 1920×1080 tactile', { viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true }, true],
  ['iPad Pro 12,9 paysage', { viewport: { width: 1366, height: 1024 }, screen: { width: 1024, height: 1366 }, hasTouch: true, isMobile: true }, true],
  ['iPad 11 paysage', { viewport: { width: 1180, height: 820 }, screen: { width: 820, height: 1180 }, hasTouch: true, isMobile: true }, false],
  ['téléphone', { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, false],
]
for (const [nom, o, attendu] of cas) {
  const ctx = await O.contexte(o)
  const { p } = await O.ouvrir(ctx, nom)
  const r = await p.evaluate(() => ({ noms: document.body.classList.contains('noms-outils'), libelles: [...document.querySelectorAll('.libelle[data-libelle]')].filter(e => e.offsetParent && getComputedStyle(e).display !== 'none').length,
    zoom: [...document.querySelectorAll('.barre-zoom button, .zoom button')].map(b => ({ l: b.querySelector('.libelle')?.dataset.libelle ?? null, t: b.title })) }))
  ok(r.noms === attendu, `${nom} : noms sous les outils ${attendu ? 'allumés' : 'éteints'} d'office`, r)
  if (attendu) await p.screenshot({ path: C + `/captures/t10-${nom.replace(/\W+/g, '-')}.png` })
  await ctx.close()
}
await O.fin()
