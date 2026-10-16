// « Espace + glisser » après être passé par la bibliothèque (le focus revient au bouton du classeur),
// comparé au même geste avant (focus nulle part) et avec le focus sur un autre bouton de barre.
import { lancer, contexte, ouvrir, info, ok, dort, ecrireTraits, erreurs } from './outils.mjs'
const nav = await lancer()
const cas = ['avant (focus nulle part)', 'focus sur le bouton du zoom', 'après la bibliothèque, fermée par ×', 'après la bibliothèque, fermée par Échap', 'après la bibliothèque, clic sur la carte ouverte']
for (const c of cas) {
  const ctx = await contexte(nav)
  const p = await ouvrir(ctx, '', 'espace')
  await ecrireTraits(p, 3)
  if (c.includes('zoom')) { await p.click('.zoom-texte'); await p.keyboard.press('Escape') }
  if (c.includes('bibliothèque')) {
    await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(400)
    if (c.includes('×')) await p.click('.biblio-fermer')
    else if (c.includes('Échap')) await p.keyboard.press('Escape')
    else { const id = await p.evaluate(() => window.__app.classeur.id); await p.click(`.grille-classeurs.tous li[data-cle="${id}"] .carte-apercu`) }
    await dort(500)
  }
  await dort(300)
  const focus = await p.evaluate(() => document.activeElement?.className || '(page)')
  const cam0 = await p.evaluate(() => [window.__app.cam.x, window.__app.cam.y])
  await p.keyboard.down(' ')
  await p.mouse.move(700, 400); await p.mouse.down()
  for (let i = 1; i <= 10; i++) await p.mouse.move(700 + i * 15, 400 + i * 10)
  await p.mouse.up(); await p.keyboard.up(' ')
  await dort(600)
  const r = await p.evaluate(() => ({ formes: window.__app.formes.length, cam: [window.__app.cam.x, window.__app.cam.y], biblio: !document.querySelector('.bibliotheque').hidden, outil: window.__app.outil }))
  const deplace = r.cam[0] !== cam0[0] || r.cam[1] !== cam0[1]
  ok(deplace && r.formes === 3 && !r.biblio, `${c} (focus : ${focus}) : Espace + glisser déplace la vue, n'écrit rien`, { cam0, ...r })
  await ctx.close()
}
console.log('erreurs JS', erreurs)
await nav.close()
