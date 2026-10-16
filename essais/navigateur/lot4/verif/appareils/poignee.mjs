// Au doigt : la poignée ⋮⋮ recouvre-t-elle le texte « Pas encore d'aperçu » (Récents, la grille) ?
import { lancer, contexte, ouvrir, info, ok, dort, creerPlusieurs, CAPTURES } from './outils.mjs'
const nav = await lancer()
for (const [w, h] of [[390, 844], [360, 640], [820, 1180], [1180, 820], [1920, 1080]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 900 })
  const p = await ouvrir(ctx, '', 'poignee')
  await creerPlusieurs(p, 4)
  await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(500)
  const r = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs > li')].map(li => {
    const t = li.querySelector('.sans-apercu'), g = li.querySelector('.biblio-poignee')
    if (!t || t.hidden || !g || !g.getClientRects().length) return null
    // le texte lui-même (un Range sur son contenu)
    const rg = document.createRange(); rg.selectNodeContents(t); const a = rg.getBoundingClientRect(), b = g.getBoundingClientRect()
    const x = Math.min(a.right, b.right) - Math.max(a.left, b.left), y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
    return { liste: li.parentElement.classList.contains('recents') ? 'recents' : 'tous', recouvre: x > 0 && y > 0 ? `${Math.round(x)}×${Math.round(y)}` : null }
  }).filter(Boolean))
  const touches = r.filter(x => x.recouvre)
  ok(touches.length === 0, `${w}×${h} : la poignée ⋮⋮ ne recouvre pas « Pas encore d'aperçu »`, touches.slice(0, 3))
  if (touches.length) await p.screenshot({ path: CAPTURES + `poignee-${w}x${h}.png` })
  await ctx.close()
}
await nav.close()
