import { lancer, contexte, ouvrir, info, ok, dort, DEBORDE, CAPTURES } from './outils.mjs'
const nav = await lancer()
for (const [w, h] of [[844, 390], [667, 375], [320, 568], [1024, 600]]) {
  const ctx = await contexte(nav, { viewport: { width: w, height: h }, hasTouch: true, isMobile: w < 900 })
  const p = await ouvrir(ctx, '', 'dp')
  await p.evaluate(() => window.__app.ui.boutonFichier.click()); await dort(300)
  const dm = await p.evaluate(DEBORDE, '.menu-flottant:not([hidden])')
  ok(dm.length === 0, `${w}×${h} le menu ⋯ du classeur : rien hors de l'écran`, dm)
  await p.screenshot({ path: CAPTURES + `menu-fichier-${w}x${h}.png` })
  await p.tap('.menu-flottant:not([hidden]) [data-action="copie-drive"]'); await dort(500)
  const d = await p.evaluate(DEBORDE, 'dialog[open]')
  ok(d.length === 0, `${w}×${h} « Copie sur le Drive… » : rien hors de l'écran`, d)
  await p.screenshot({ path: CAPTURES + `copie-drive-${w}x${h}.png` })
  await ctx.close()
}
await nav.close()
