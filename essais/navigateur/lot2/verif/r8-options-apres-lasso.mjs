// Après un lasso au doigt, toucher « Options » de la barre : que se passe-t-il ?
// Contrôle final du lot 2 : un toucher dans la barre moins de 300 ms après
// qu'elle a paru, sur du vide, est avalé (la sélection reste, rien ne
// s'ouvre, le toucher suivant agit) ; il était rendu à la page et vidait la
// sélection. Passé 300 ms, « Options » ouvre le menu complet.
import { verifier, contexte, charger, etat, ecranDe, attendre, fin } from './commun.mjs'
for (const delai of [120, 400, 800]) {
  const ctx = await contexte({ hasTouch: true })
  const { page, cdp } = await charger(ctx, 'lasso-' + delai)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const tap = async (x, y) => { await touche('touchStart', [[x, y]]); await touche('touchEnd', []); await page.waitForTimeout(350) }
  // Un toucher qui doit agir sur un bouton de la barre. Chrome, sous CDP,
  // perd parfois le clic qu'il tire d'un toucher bref (aucun événement
  // click) : on retouche alors une fois, en le disant
  const tapBouton = async (x, y) => {
    await page.evaluate(() => { window.__clics = 0; document.addEventListener('click', () => window.__clics++, true) })
    await tap(x, y)
    if (await page.evaluate(() => window.__clics)) return
    console.log('  (clic perdu par Chrome sous CDP : nouveau toucher)')
    await tap(x, y)
  }
  const B = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    const f = { id: 'TB', type: 'trait', x: 250, y: 420, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 0, 0.5, 80, 0, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
    t.nouveauGeste(); t.poser(a.page, f); a.choisirOutil('selection')
    window.__ev = []
    for (const ty of ['pointerdown', 'pointerup', 'click', 'pointercancel']) document.addEventListener(ty, e => window.__ev.push(ty + ':' + (e.target.className?.baseVal ?? e.target.className ?? e.target.tagName) + ':' + (e.pointerId ?? '')), true)
    return f.id
  })
  const sB = await ecranDe(page, 310, 420)
  await tap(sB.x, sB.y)
  const l0 = await ecranDe(page, 200, 470), l1 = await ecranDe(page, 440, 395)
  const W = l1.x - l0.x, H = l1.y - l0.y
  await touche('touchStart', [[l0.x, l0.y]])
  for (const [u, v] of [[0.3, 0], [0.6, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5], [0.01, 0.05]]) await touche('touchMove', [[l0.x + W * u, l0.y + H * v]])
  await page.waitForTimeout(40)
  await touche('touchEnd', []); await page.waitForTimeout(delai)
  const op = await page.evaluate(() => { const b = document.querySelector('.barre-actions .action-options'); if (!b || b.closest('[hidden]')) return null; const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.evaluate(() => { window.__ev.length = 0 })
  if (delai < 300) {
    if (op) await tap(op.x, op.y)
    const e = await etat(page), ev = await page.evaluate(() => window.__ev)
    verifier(`Lasso au doigt, puis « Options » touché ${delai} ms après : avalé, la sélection reste, rien ne s'ouvre`, !!op && !e.panneau && e.sel.length === 1 && e.sel[0] === 'TB' && e.barre, { sel: e.sel, op: !!op, ev })
    if (op) await tapBouton(op.x, op.y)
    const e2 = await etat(page)
    verifier(`… le toucher suivant sur « Options » : le menu complet`, e2.panneau && e2.sel[0] === 'TB', { sel: e2.sel })
  } else {
    if (op) await tapBouton(op.x, op.y)
    const e = await etat(page), ev = await page.evaluate(() => window.__ev)
    verifier(`Lasso au doigt, puis « Options » touché ${delai} ms après : le menu complet`, e.panneau, { sel: e.sel, op: !!op, ev })
  }
  await ctx.close()
}
await fin()
