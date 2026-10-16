// Après la bibliothèque (focus rendu au bouton du classeur), un polygone point par point fini par Entrée :
// le polygone se ferme-t-il sans rouvrir la bibliothèque ? Comparé au même geste sans passer par elle.
import { lancer, contexte, ouvrir, info, ok, dort } from './outils.mjs'
const nav = await lancer()
for (const avant of [false, true]) {
  const ctx = await contexte(nav)
  const p = await ouvrir(ctx, '', 'poly')
  if (avant) { await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400); await p.click('.biblio-fermer'); await dort(500) }
  await p.evaluate(() => { window.__app.typeForme = 'polygone'; window.__app.choisirOutil('forme') })
  for (const [x, y] of [[500, 300], [700, 320], [650, 500]]) { await p.mouse.click(x, y); await dort(250) }
  const f0 = await p.evaluate(() => ({ actif: document.activeElement?.className || '(page)', poly: !!window.__app.polyEnCours }))
  await p.keyboard.press('Enter'); await dort(600)
  const r = await p.evaluate(() => ({ formes: window.__app.formes.length, poly: !!window.__app.polyEnCours, biblio: !document.querySelector('.bibliotheque').hidden }))
  ok(r.formes === 1 && !r.poly && !r.biblio, `${avant ? 'après la bibliothèque' : 'sans la bibliothèque'} (focus : ${f0.actif}) : Entrée finit le polygone, et rien d'autre`, { f0, r })
  await ctx.close()
}
await nav.close()
