// Une page plus large que haute (rapport 1,3), une seule figure : combien de feuilles ?
import { nav, ouvrir, exporter, info, infoPages, images, rendre, b64, analyseur, verifier, ctrlP, mkdir, V, erreurs, msgs } from './lib.mjs'
const D = mkdir(V + '/out/paysage')
const { ctx, page } = await ouvrir({}, 'paysage')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'carreaux')
  // Un grand triangle ABC (une figure) de 1000 × 740 unités : 25 × 18,5 cm
  t.poser(a.page, { id: 'tri', type: 'polygone', x: 100, y: 100, z: 1, auteur: t.moi, pts: [0, 740, 1000, 740, 420, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
})
await page.waitForTimeout(400)
const mise = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const b = ap.boite(formes)
  const mp = m.mettreEnPage(b, formes.map(f => ap.boite([f])).filter(Boolean))
  return { boite: b, rapport: b.l / b.h, orientation: mp.papier.orientation, k: mp.k, feuilles: mp.feuilles.map(f => [f.y0, f.y1]), utileHmm: mp.papier.utile.h / (96 / 25.4) }
})
console.log(JSON.stringify(mise))
const r = await exporter(page, D, 'paysage', ctrlP(page))
const i = info(r.fichier)
console.log(i.texte, infoPages(r.fichier))
const { fichiers } = rendre(r.fichier, 50, D + '/f')
console.log(fichiers)
const ana = await analyseur()
for (const f of fichiers) console.log(f, JSON.stringify(await ana.evaluate(([b]) => window.colonnes(b, 'r < 80 && g < 140 && b > 150'), [b64(f)])))
console.log((await msgs(page)).at(-1))
verifier('Une page plus large que haute (une seule figure de 25 × 18,5 cm, rapport ' + mise.rapport.toFixed(2) + ') tient sur une feuille', i.pages === 1, { pages: i.pages, mise })
console.log(erreurs)
await nav.close()
