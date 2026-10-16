// Un double-clic par habitude (souris, plume de la tablette graphique) sur
// une vignette placée au-dessus d'un bouton du tableau : le second clic
// touche-t-il ce bouton ?
import { ouvrir, preparer, etat, attendreOuverte, verifier, pause, fin, plumeCDP } from './lib.mjs'

for (const outilDe of ['souris', 'plume']) {
  const { ctx, page } = await ouvrir({}, outilDe)
  const cdp = await ctx.newCDPSession(page)
  const plume = plumeCDP(cdp)
  const P = await preparer(page, 12, { ici: 0 })
  await page.evaluate(() => {
    window.__evts = []
    for (const t of ['pointerdown', 'mousedown', 'click', 'dblclick']) window.addEventListener(t, e => {
      window.__evts.push({ t, trieuse: document.body.classList.contains('en-trieuse'), cible: e.target?.closest?.('button')?.getAttribute('aria-label') || e.target?.tagName })
    }, true)
  })
  const boutons = await page.evaluate(() => [...document.querySelectorAll('button')].filter(b => { const r = b.getBoundingClientRect(); return r.width > 0 && !b.closest('.trieuse') && !b.closest('.toast') && getComputedStyle(b).visibility !== 'hidden' }).map(b => { const r = b.getBoundingClientRect(); return { nom: b.getAttribute('aria-label') || b.title, x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await pause(400)
  const sous = await page.evaluate(bs => bs.map(b => { const el = document.elementFromPoint(b.x, b.y); const c = el?.closest?.('.carte'); return c && !el.closest('.carte-options') && !el.closest('.carte-nom') && !el.closest('.carte-poignee') ? { ...b, page: c.dataset.page } : null }).filter(Boolean), boutons)
  const cible = sous.find(s => /Gomme/.test(s.nom)) || sous.find(s => /Surligneur/.test(s.nom)) || sous[0]
  console.log(outilDe, 'sous les vignettes :', sous.map(s => s.nom).join(' ; '), '→', cible?.nom)
  const outilAvant = (await etat(page)).outil
  await page.evaluate(() => { window.__evts = [] })
  if (outilDe === 'souris') await page.mouse.dblclick(cible.x, cible.y)
  else {
    await plume('mouseMoved', cible.x, cible.y, false)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cible.x, y: cible.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cible.x, y: cible.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
    await pause(90)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cible.x, y: cible.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 2, force: 0.5 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cible.x, y: cible.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 2 })
  }
  await pause(600)
  const e = await etat(page)
  const evts = await page.evaluate(() => window.__evts)
  verifier(`${outilDe} : double-clic sur la vignette de la page ${P.indexOf(cible.page) + 1} (au-dessus de « ${cible.nom} ») : on va à la page, l'outil reste ${outilAvant}`,
    !e.ouverte && e.page === cible.page && e.outil === outilAvant, { outil: e.outil, apres: evts.filter(x => !x.trieuse) })
  await ctx.close()
}
await fin()
