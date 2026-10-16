// Ouvrir puis fermer la bibliothèque (souris, plume, doigt) : sans effet de
// bord sur le classeur (document Yjs, vue, outil, sélection, page, film,
// instruments).
import { lancer, contexte, ouvrir, erreurs, info, ok, dort, ecrireTraits, creerPlusieurs } from './outils.mjs'
const nav = await lancer()
for (const mode of ['souris', 'plume', 'doigt']) {
  const ctx = await contexte(nav, mode === 'doigt' ? { viewport: { width: 1180, height: 820 }, hasTouch: true } : {})
  const p = await ouvrir(ctx, '', mode)
  await creerPlusieurs(p, 2)
  await ecrireTraits(p, 6)
  // Une sélection, un zoom, un instrument montré
  await p.evaluate(() => { const a = window.__app; a.choisirOutil?.('selection'); })
  const ETAT = () => {
    const a = window.__app, t = a.tableau
    return {
      clients: [...t.doc.store.clients].map(([c, s]) => c + ':' + s.length).sort().join(','),
      outil: a.outil, page: a.page, pages: t.ordre.length, formes: a.formes.length,
      vue: JSON.stringify(a.vue ?? a.camera ?? null).slice(0, 120), sel: a.selection?.size,
      undo: t.annuler?.undoStack?.length ?? t.undo?.undoStack?.length ?? null,
    }
  }
  const avant = await p.evaluate(ETAT)
  const cdp = await ctx.newCDPSession(p)
  const r = await p.evaluate(() => { const b = document.querySelector('.bouton-classeur').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
  if (mode === 'souris') await p.mouse.click(r.x, r.y)
  else if (mode === 'plume') { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }) }
  else await p.touchscreen.tap(r.x, r.y)
  await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(3500)
  // Fermer : Échap (souris), × (plume, doigt)
  const x = await p.evaluate(() => { const b = document.querySelector('.biblio-fermer').getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 } })
  if (mode === 'souris') await p.keyboard.press('Escape')
  else if (mode === 'plume') { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await cdp.send('Input.dispatchMouseEvent', { type, x: x.x, y: x.y, pointerType: 'pen', button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }) }
  else await p.touchscreen.tap(x.x, x.y)
  await dort(1500)
  const apres = await p.evaluate(ETAT)
  const ferme = await p.evaluate(() => document.querySelector('.bibliotheque').hidden)
  const diff = Object.keys(avant).filter(k => avant[k] !== apres[k])
  ok(ferme && diff.length === 0, `${mode} : ouvrir et fermer la bibliothèque ne change rien au classeur`, { diff: Object.fromEntries(diff.map(k => [k, [avant[k], apres[k]]])), ferme })
  await ctx.close()
}
console.log('erreurs JS', erreurs)
await nav.close()
