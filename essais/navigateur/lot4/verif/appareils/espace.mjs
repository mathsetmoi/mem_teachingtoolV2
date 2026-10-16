// Après la bibliothèque, le focus revient au bouton du classeur : « Espace +
// glisser » (déplacer la vue du tableau) marche-t-il encore, ou Espace
// rouvre-t-il la bibliothèque ? Fermée par Échap, par ×, par un clic sur la
// carte du classeur ouvert.
import { lancer, contexte, ouvrir, erreurs, info, ok, dort, ecrireTraits } from './outils.mjs'
const nav = await lancer()
for (const fermeture of ['echap', 'croix', 'carte']) {
  const ctx = await contexte(nav)
  const p = await ouvrir(ctx, '', 'espace')
  await ecrireTraits(p, 3)
  await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
  if (fermeture === 'echap') await p.keyboard.press('Escape')
  else if (fermeture === 'croix') await p.click('.biblio-fermer')
  else { const id = await p.evaluate(() => window.__app.classeur.id); await p.click(`.grille-classeurs.tous li[data-cle="${id}"] .carte-apercu`) }
  await dort(500)
  const f = await p.evaluate(() => ({ actif: document.activeElement?.className, visible: document.activeElement?.matches?.(':focus-visible'), biblio: !document.querySelector('.bibliotheque').hidden }))
  const vue0 = await p.evaluate(() => JSON.stringify([window.__app.vue?.x, window.__app.vue?.y, window.__app.camera?.x, window.__app.camera?.y, window.__app.decalage]))
  // Espace tenu + glisser à la souris
  await p.keyboard.down(' ')
  await p.mouse.move(700, 400); await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(700 + i * 15, 400 + i * 10)
  await p.mouse.up()
  await p.keyboard.up(' ')
  await dort(600)
  const r = await p.evaluate(() => ({ biblio: !document.querySelector('.bibliotheque').hidden, formes: window.__app.formes.length }))
  const vue1 = await p.evaluate(() => JSON.stringify([window.__app.vue?.x, window.__app.vue?.y, window.__app.camera?.x, window.__app.camera?.y, window.__app.decalage]))
  info(`fermée par ${fermeture}`, { focus: f, vue0, vue1 })
  ok(!r.biblio && r.formes === 3, `fermée par ${fermeture}, le focus sur le bouton du classeur : Espace + glisser ne rouvre pas la bibliothèque et n'écrit rien`, { r, f })
  await ctx.close()
}
console.log('erreurs JS', erreurs)
await nav.close()
