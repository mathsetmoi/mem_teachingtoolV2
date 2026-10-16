// Une feuille de Seyès pleine d'écriture noire (et un peu de surligneur), et de
// petites marques de couleur (une croix rouge, un codage vert, un point orange) :
// leurs couleurs survivent-elles à la palette de 256 couleurs ?
import { nav, ouvrir, exporter, images, rendre, b64, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
import { ECRIRE } from '../../P9/ecriture.mjs'
const D = mkdir(V + '/out/couleurs')
const { ctx, page } = await ouvrir({}, 'couleurs')
await page.evaluate(ECRIRE, { pages: 1, lignes: Number(process.argv[3] ?? 13), mots: Number(process.argv[4] ?? 9), fond: process.argv[2] ?? 'seyes', pas: 72, couleur: '#1b2230' })
const marques = [['#d64545', 'rouge'], ['#2e9e5b', 'vert'], ['#e8891c', 'orange'], ['#1b5fbf', 'bleu'], ['#8e44ad', 'violet']]
await page.evaluate((marques) => {
  const a = window.__app, t = a.tableau
  // Du surligneur jaune sur deux lignes
  t.poser(a.page, { id: 'surl', type: 'trait', x: 120, y: 140, z: 5000, auteur: t.moi, pts: [0, 0, 0.5, 600, 0, 0.5], couleur: '#ffd400', taille: 24, opacite: 0.35, pression: false })
  marques.forEach(([c], i) => {
    // Une petite croix de couleur, en marge (taille 3, 16 unités)
    const x = 1150, y = 140 + i * 140
    t.poser(a.page, { id: 'm' + i + 'a', type: 'trait', x, y, z: 6000 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, 16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
    t.poser(a.page, { id: 'm' + i + 'b', type: 'trait', x, y: y + 16, z: 6100 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, -16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
  })
}, marques)
await page.waitForTimeout(600)
const pos = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const mp = m.mettreEnPage(ap.boite(formes), formes.map(f => ap.boite([f])).filter(Boolean))
  const f = mp.feuilles[0], d = m.DPR_PDF
  return { cam: f.cam, d, feuilles: mp.feuilles.length }
})
const r = await exporter(page, D, 'couleurs', ctrlP(page))
console.log(images(r.fichier), pos.feuilles)
const { fichiers } = rendre(r.fichier, 200, D + '/f')
const res = await page.evaluate(async ([b, pos, marques]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const out = []
  marques.forEach(([coul, nom], i) => {
    const wx = 1150 + 8, wy = 140 + i * 140 + 8
    const px = Math.round((wx * pos.cam.z + pos.cam.x) * pos.d), py = Math.round((wy * pos.cam.z + pos.cam.y) * pos.d)
    const d = x.getImageData(px - 2, py - 2, 5, 5).data
    let r = 0, g = 0, bb = 0
    for (let k = 0; k < d.length; k += 4) { r += d[k]; g += d[k + 1]; bb += d[k + 2] }
    const n = d.length / 4
    const voulu = [1, 3, 5].map(j => parseInt(coul.slice(j, j + 2), 16))
    const lu = [r / n, g / n, bb / n].map(Math.round)
    out.push({ nom, voulu, lu, ecart: Math.round(Math.hypot(voulu[0] - lu[0], voulu[1] - lu[1], voulu[2] - lu[2])) })
  })
  return out
}, [b64(fichiers[0]), pos, marques])
for (const m of res) verifier(`La croix ${m.nom} garde sa couleur dans le PDF (au centre de la croix)`, m.ecart < 40, m)
console.log(erreurs)
await nav.close()
