// Double toucher (plume, doigt, souris) sur la carte du classeur ouvert : l'écran se ferme ; le second appui ne pose rien sur la page.
import { lancer, contexte, ouvrir, info, ok, dort } from './outils.mjs'
const nav = await lancer()
for (const mode of ['souris', 'plume-wacom', 'plume-ipad', 'doigt']) {
  const ctx = await contexte(nav, mode === 'plume-ipad' || mode === 'doigt' ? { hasTouch: true, viewport: { width: 1180, height: 820 } } : {})
  const p = await ouvrir(ctx, '', mode)
  await p.click('.bouton-classeur').catch(() => p.evaluate(() => window.__app.ui.ouvrirBibliotheque()))
  await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
  const id = await p.evaluate(() => window.__app.classeur.id)
  const r = await p.evaluate(id => { const e = document.querySelector(`.grille-classeurs.tous li[data-cle="${id}"] .carte-apercu`); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } }, id)
  const cdp = await ctx.newCDPSession(p)
  const pen = async (n) => { for (const type of ['mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, pointerType: 'pen', button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: n, force: 0.5 }) }
  if (mode === 'souris') await p.mouse.dblclick(r.x, r.y)
  else if (mode.startsWith('plume')) { await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: r.x, y: r.y, pointerType: 'pen', button: 'none', buttons: 0 }); await pen(1); await dort(120); await pen(2) }
  else { await p.touchscreen.tap(r.x, r.y); await dort(150); await p.touchscreen.tap(r.x, r.y) }
  await dort(1200)
  const e = await p.evaluate(() => ({ biblio: !document.querySelector('.bibliotheque').hidden, formes: window.__app.formes.length, attente: !!window.__app.pointEnAttente }))
  ok(!e.biblio && e.formes === 0, `${mode} : double appui sur la carte « Ouvert » : l'écran se ferme, rien n'est posé sur la page`, e)
  await ctx.close()
}
await nav.close()
