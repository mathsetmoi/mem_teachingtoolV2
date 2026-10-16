import { lancer, contexte, ouvrir, creerPlusieurs, creerDossier, erreurs, info, dort } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx)
info('bouton', await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); return b && { html: b.outerHTML.slice(0, 600), r: b.getBoundingClientRect().toJSON(), vis: b.getClientRects().length } }))
await creerDossier(p, '5e B', { etiquette: '5e B' })
await creerPlusieurs(p, 3)
await p.click('.bouton-classeur')
await dort(600)
info('biblio', await p.evaluate(() => {
  const strip = el => { const c = el.cloneNode(true); c.querySelectorAll('svg').forEach(s => s.replaceWith('[svg]')); return c.outerHTML }
  return strip(document.querySelector('.bibliotheque')).replace(/\s+/g, ' ').slice(0, 9000)
}))
info('focus', await p.evaluate(() => document.activeElement?.outerHTML.slice(0, 200)))
console.log(erreurs)
await nav.close()
