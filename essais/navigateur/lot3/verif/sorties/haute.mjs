// Une page très haute : des lignes d'écriture, des figures nommées, des formules,
// irrégulièrement. Les coupes évitent-elles l'encre ? Les feuilles, la marge, le pied.
import { nav, ouvrir, exporter, info, infoPages, images, rendre, b64, analyseur, verifier, ctrlP, mkdir, V, erreurs, msgs } from './lib.mjs'
const D = mkdir(V + '/out/haute')
const { ctx, page } = await ouvrir({}, 'haute')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'seyes')
  t.renommerPage(a.page, 'Cours : les vecteurs')
  let s = 777
  const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  const formes = []
  let y = 100, n = 0
  for (let bloc = 0; bloc < 14; bloc++) {
    const genre = bloc % 3
    if (genre === 0 || genre === 2) {
      const lignes = 2 + Math.floor(hasard() * 5)
      for (let l = 0; l < lignes; l++) {
        let x = 60
        for (let m = 0; m < 6; m++) {
          const k = 18 + Math.floor(hasard() * 12), pts = []
          for (let i = 0; i < k; i++) pts.push(i * 2.6, (i % 2 ? 30 * (0.55 + hasard() * 0.45) : hasard() * 4), 0.5)
          formes.push({ id: `w${n++}`, type: 'trait', x, y, z: n, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
          x += k * 2.6 + 14
        }
        y += 64
      }
      if (genre === 2) { formes.push({ id: `f${n++}`, type: 'formule', x: 80, y, z: n, auteur: t.moi, latex: '\\vec{AB}+\\vec{BC}=\\vec{AC}', couleur: '#1b2230', taille: 36 }); y += 80 }
    } else {
      const h = 180 + Math.floor(hasard() * 260)
      formes.push({ id: `t${n++}`, type: 'polygone', x: 120, y: y + 20, z: n, auteur: t.moi, pts: [0, h, 360, h, 160, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A' + bloc, 'B' + bloc, 'C' + bloc] })
      y += h + 80
    }
  }
  t.nouveauGeste(); t.poserPlusieurs(a.page, formes)
})
await page.waitForTimeout(800)
const mise = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const b = ap.boite(formes)
  const boites = formes.map(f => ({ id: f.id, b: ap.boite([f]) }))
  const mp = m.mettreEnPage(b, boites.map(x => x.b))
  const coupes = mp.feuilles.slice(0, -1).map(f => ({ y: f.y1, traverse: boites.filter(x => x.b.y < f.y1 && x.b.y + x.b.h > f.y1).map(x => x.id), remplie: (f.y1 - f.y0) / (mp.papier.utile.h / mp.z) }))
  return { boite: b, k: mp.k, z: mp.z, feuilles: mp.feuilles.map(f => ({ y0: f.y0, y1: f.y1, cam: f.cam })), coupes, utile: mp.papier.utile }
})
console.log(JSON.stringify(mise.coupes))
const r = await exporter(page, D, 'haute', ctrlP(page))
const i = info(r.fichier)
console.log(r.propose, i.pages, i.titre, i.err)
const { fichiers } = rendre(r.fichier, 100, D + '/f')
const ana = await analyseur()
// À 100 ppp : la zone utile commence à 12 mm = 47 px. Le bas de la bande de la feuille i :
const pxmm = 100 / 25.4
const coupe = []
for (let k = 0; k < fichiers.length; k++) {
  const f = mise.feuilles[k]
  const haut = Math.round(12 * pxmm), bas = Math.round((mise.utile.y + (f.y1 - f.y0) * f.cam.z) * 100 / 96)
  const encreBas = await ana.evaluate(([b, y0, y1]) => window.compter(b, 'r < 120 && g < 140', { x0: 0, x1: 827, y0, y1 }), [b64(fichiers[k]), bas - 2, bas])
  const encreHaut = await ana.evaluate(([b, y0, y1]) => window.compter(b, 'r < 120 && g < 140', { x0: 0, x1: 827, y0, y1 }), [b64(fichiers[k]), haut, haut + 2])
  coupe.push({ feuille: k + 1, encreAuBasDeLaBande: encreBas, encreEnHaut: encreHaut })
}
console.log(JSON.stringify(coupe))
verifier(`Page très haute (${Math.round(mise.boite.h / 40)} cm à l'échelle ${mise.k.toFixed(2)}) : ${i.pages} feuilles A4 portrait`, i.pages === mise.feuilles.length && i.l === 595.28 && i.h === 841.89)
verifier('Aucune coupe ne traverse une boîte de forme', mise.coupes.every(c => !c.traverse.length), mise.coupes)
verifier('Aucune encre au ras d\'une coupe (bas de bande, haut de la feuille suivante)', coupe.slice(0, -1).every(c => c.encreAuBasDeLaBande === 0) && coupe.slice(1).every(c => c.encreEnHaut === 0), coupe)
verifier(`Nom du fichier : « Cours - les vecteurs.pdf » (le nom de la page)`, r.propose === 'Cours - les vecteurs.pdf', r.propose)
const texte = (await msgs(page)).at(-1).t
console.log(texte)
const pied = (await import('node:child_process')).execFileSync('pdftotext', [r.fichier, '-']).toString()
console.log('texte extrait :', JSON.stringify(pied.slice(0, 80)))
console.log(erreurs)
await nav.close()
