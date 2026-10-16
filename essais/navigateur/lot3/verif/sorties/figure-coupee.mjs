// Une page haute : quelques lignes d'écriture (la moitié d'une feuille), puis une figure
// moins haute qu'une feuille qui commence à 52 % de la feuille, puis d'autres lignes.
// La figure tiendrait entière sur la feuille suivante : est-elle coupée ?
import { nav, ouvrir, exporter, info, rendre, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
const D = mkdir(V + '/out/figure-coupee')
const { ctx, page } = await ouvrir({}, 'fig')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'carreaux')
  const f = []
  let s = 5
  const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const ligne = (y, id) => { let x = 40; for (let m = 0; m < 6; m++) { const pts = []; const n = 20; for (let i = 0; i < n; i++) pts.push(i * 2.6, i % 2 ? 26 : hasard() * 3, 0.5); f.push({ id: id + m, type: 'trait', x, y, z: f.length, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); x += 70 } }
  for (let l = 0; l < 7; l++) ligne(l * 72, 'a' + l)              // y de 0 à 470
  // Le triangle ABC : de y = 560 à 1200 (640 unités, 16 cm : il tient sur une feuille de 26,9 cm)
  f.push({ id: 'tri', type: 'polygone', x: 60, y: 560, z: 900, auteur: t.moi, pts: [0, 640, 560, 640, 240, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
  for (let l = 0; l < 8; l++) ligne(1320 + l * 72, 'b' + l)
  t.nouveauGeste(); t.poserPlusieurs(a.page, f)
})
await page.waitForTimeout(500)
const mise = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const mp = m.mettreEnPage(ap.boite(formes), formes.map(f => ap.boite([f])).filter(Boolean))
  const tri = ap.boite([a.tableau.formesDe(a.page).get('tri')])
  return { k: mp.k, hauteurFeuille: mp.papier.utile.h / mp.z, feuilles: mp.feuilles.map(f => [Math.round(f.y0), Math.round(f.y1)]), tri }
})
console.log(JSON.stringify(mise))
const r = await exporter(page, D, 'fig', ctrlP(page))
const { fichiers } = rendre(r.fichier, 50, D + '/f')
const coupe = mise.feuilles[0][1]
verifier(`Le triangle (${Math.round(mise.tri.h)} unités de haut, une feuille en fait ${Math.round(mise.hauteurFeuille)}) n'est pas coupé entre deux feuilles`, !(mise.tri.y < coupe && mise.tri.y + mise.tri.h > coupe), { coupe, tri: mise.tri })
console.log(fichiers, erreurs)
await nav.close()
