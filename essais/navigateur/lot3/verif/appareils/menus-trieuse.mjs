// Ce qui flotte au-dessus du tableau quand la trieuse s'ouvre : le menu
// complet, la barre d'actions, le menu d'un morceau, le programme, un message.
import { ouvrir, preparer, etat, centre, attendreOuverte, verifier, pause, fin, D } from './lib.mjs'

const VISIBLES = () => {
  const vus = []
  for (const el of document.querySelectorAll('body *')) {
    if (el.closest('.trieuse') || el.closest('.toast') || el.closest('.annonce-page')) continue
    const cs = getComputedStyle(el)
    if (cs.position !== 'fixed' && cs.position !== 'absolute') continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]')) continue
    const z = Number(cs.zIndex) || 0
    // Au-dessus de la trieuse ?
    const x = r.left + r.width / 2, y = r.top + r.height / 2
    const top = document.elementFromPoint(x, y)
    if (top && !top.closest('.trieuse') && el.contains(top)) vus.push(`${el.tagName}.${el.className} z=${z}`)
  }
  return vus
}
for (const pointeur of ['souris', 'clavier']) {
  const { ctx, page } = await ouvrir({}, pointeur)
  await preparer(page, 3, { ici: 0 })
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.toutSelectionner(); a.ui.maj() }); await pause(200)
  // Le menu complet ouvert (Options de la barre d'actions)
  await page.locator('.barre-actions button', { hasText: 'Options' }).click(); await pause(250)
  const avant = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Envoyer vers') && b.offsetParent))
  if (pointeur === 'souris') { const r = await centre(page, '.rang'); await page.mouse.click(r.x, r.y) }
  else await page.keyboard.press('Shift+P')
  const ouverte = await attendreOuverte(page); await pause(400)
  const vus = await page.evaluate(VISIBLES)
  verifier(`${pointeur} : le menu complet ouvert (${avant}), puis la trieuse : ${ouverte ? 'ouverte' : 'PAS ouverte'}, rien du tableau par-dessus`, ouverte && !vus.length, vus)
  await page.screenshot({ path: D + `/menus-trieuse-${pointeur}.png` })
  await page.keyboard.press('Escape'); await pause(200)
  const e = await etat(page)
  const panneau = await page.evaluate(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Envoyer vers') && b.offsetParent))
  console.log(pointeur, 'après fermeture : trieuse', e.ouverte, 'menu complet visible', panneau)
  await ctx.close()
}
await fin()
