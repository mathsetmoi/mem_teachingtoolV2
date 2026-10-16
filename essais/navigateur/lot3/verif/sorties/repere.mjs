// Un repère (origine dans le contenu) et une courbe : axes, graduations et flèches sur la feuille ?
import { nav, ouvrir, exporter, rendre, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
const D = mkdir(V + '/out/repere')
const { ctx, page } = await ouvrir({}, 'repere')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'repere', { x: 400, y: 600 })
  const pts = []
  for (let i = 0; i <= 60; i++) { const X = -3 + i * 0.1; pts.push(X * 40, -(X * X / 2) * 40, 0.5) }
  t.poser(a.page, { id: 'courbe', type: 'trait', x: 400, y: 600, z: 1, auteur: t.moi, pts, couleur: '#d64545', taille: 3, opacite: 1, pression: false })
})
await page.waitForTimeout(500)
await page.screenshot({ path: D + '/ecran.png' })
const r = await exporter(page, D, 'repere', ctrlP(page))
const { fichiers } = rendre(r.fichier, 60, D + '/f')
console.log(fichiers)
if (erreurs.length) { console.log('ÉCHEC erreurs JS :', erreurs); process.exitCode = 1 }  // contrôle final : un échec visible
await nav.close()
