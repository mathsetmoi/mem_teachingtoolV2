import { lancer, contexte, ouvrir, info, ok, dort, DEBORDE, CAPTURES } from './outils.mjs'
const nav = await lancer()
for (const [w, h] of [[360, 640], [320, 568], [844, 390]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true })
  const p = await ouvrir(ctx, '', 'rec')
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
  await p.tap('[data-action="menu-bibliotheque"]'); await dort(300)
  await p.tap('.menu-flottant:not([hidden]) [data-action="recuperer-sauvegarde"]'); await dort(500)
  const d = await p.evaluate(DEBORDE, 'dialog[open]')
  ok(d.length === 0, `${w}×${h} « Récupérer une sauvegarde du Drive… » : rien hors de l'écran`, d)
  await p.screenshot({ path: CAPTURES + `recuperer-${w}x${h}.png` })
  await ctx.close()
}
await nav.close()
