// Un clic (souris), un toucher de la plume ou du doigt DANS une fenêtre de la bibliothèque, dans sa
// marge intérieure (à 8 px du bord), la ferme-t-il, et perd-il ce qu'on y a tapé ?
import { lancer, contexte, ouvrir, info, ok, dort } from './outils.mjs'
const nav = await lancer()
for (const [nom, action, sel] of [['Nouveau classeur', 'nouveau-classeur', 'dialog.dialogue-nouveau:not(.dialogue-dossier)'], ['Nouveau dossier', 'nouveau-dossier', 'dialog.dialogue-dossier']]) {
  for (const geste of ['souris', 'doigt']) {
    const ctx = await contexte(nav, geste === 'doigt' ? { hasTouch: true, viewport: { width: 1180, height: 820 } } : {})
    const p = await ouvrir(ctx, '', 'marge')
    await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
    await p.click(`[data-action="${action}"]`); await p.waitForSelector(sel + '[open]')
    await p.keyboard.press('Control+a'); await p.keyboard.type('Géométrie dans l\'espace')
    const r = await p.evaluate(s => { const d = document.querySelector(s + '[open]'); const b = d.getBoundingClientRect(); const x = b.left + 8, y = b.top + b.height / 2; return { x, y, sous: document.elementFromPoint(x, y)?.tagName, pad: getComputedStyle(d).padding } }, sel)
    if (geste === 'souris') await p.mouse.click(r.x, r.y); else await p.touchscreen.tap(r.x, r.y)
    await dort(300)
    const reste = await p.evaluate(s => !!document.querySelector(s + '[open]'), sel)
    ok(reste, `« ${nom} » (${geste}) : un appui dans la fenêtre, à 8 px de son bord (sur ${r.sous}, padding ${r.pad}), ne la ferme pas`, { ouverte: reste })
    await ctx.close()
  }
}
await nav.close()
