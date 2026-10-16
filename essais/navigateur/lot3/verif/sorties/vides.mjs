// Une page infinie : un énoncé en haut, puis, bien plus bas (le professeur a fait
// défiler pour avoir de la place), la correction. Les feuilles du milieu sont-elles blanches ?
import { nav, ouvrir, exporter, info, rendre, b64, analyseur, verifier, ctrlP, mkdir, V, erreurs, msgs } from './lib.mjs'
const D = mkdir(V + '/out/vides')
const { ctx, page } = await ouvrir({}, 'vides')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'carreaux')
  const f = []
  const bloc = (y0, id) => { for (let l = 0; l < 5; l++) { let x = 40; for (let m = 0; m < 6; m++) { const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 2.6, i % 2 ? 26 : 2, 0.5); f.push({ id: id + l + '-' + m, type: 'trait', x, y: y0 + l * 72, z: f.length, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); x += 70 } } }
  bloc(0, 'enonce')       // 0 à 330
  bloc(4200, 'corr')      // 4 200 à 4 530 : un peu plus de 1 m plus bas
  t.nouveauGeste(); t.poserPlusieurs(a.page, f)
})
await page.waitForTimeout(500)
const r = await exporter(page, D, 'vides', ctrlP(page))
const i = info(r.fichier)
const { fichiers } = rendre(r.fichier, 40, D + '/f')
const ana = await analyseur()
const encre = []
for (const f of fichiers) encre.push(await ana.evaluate(([b]) => window.compter(b, 'r < 90 && g < 90 && b < 110', { x0: 0, x1: 330, y0: 20, y1: 440 }), [b64(f)]))
const m = (await msgs(page)).at(-1).t
console.log(i.pages, encre, m)
verifier('Aucune feuille blanche (sans encre) au milieu, ou le message le dit', encre.every(n => n > 0) || /blanche|vide/.test(m), { feuilles: i.pages, encreParFeuille: encre, message: m })
await nav.close()
