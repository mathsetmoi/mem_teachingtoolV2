// Une photo (illustration en dégradés, 500 × 500) sur une page d'écriture :
// la feuille part-elle en couleurs indexées, et la photo y reste-t-elle fidèle ?
import { nav, ouvrir, exporter, info, images, rendre, b64, verifier, ctrlP, mkdir, V, S, erreurs, photoEssai } from './lib.mjs'
import { readFileSync, copyFileSync } from 'node:fs'
import { ECRIRE } from '../../P9/ecriture.mjs'
const D = mkdir(V + '/out/photo')
const PHOTO = await photoEssai(1)   // (une illustration en dégradés de 500 × 500, voir lib.mjs)
const ECH = Number(process.argv[2] ?? 0.6)
const { ctx, page } = await ouvrir({}, 'photo')
await page.evaluate(ECRIRE, { pages: 1, lignes: 6, mots: 6, fond: 'carreaux' })
await page.evaluate(async ([src, ech]) => {
  const a = window.__app, t = a.tableau
  t.doc.getMap('images').set('photo-v', src)
  t.poser(a.page, { id: 'photo', type: 'image', src: 'photo-v', l: 500, h: 500, m: [ech, 0, 0, ech], x: 120, y: 600, z: 5, auteur: t.moi })
}, ['data:image/jpeg;base64,' + PHOTO.toString('base64'), ECH])
await page.waitForTimeout(800)
// La feuille telle que l'export la peint, sans la palette : la référence
const ref = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const b = ap.boite(formes)
  const mp = m.mettreEnPage(b, formes.map(f => ap.boite([f])).filter(Boolean))
  const f = mp.feuilles[0], d = m.DPR_PDF, pap = mp.papier
  await ap.preparer(formes, Math.ceil(mp.z * d * 20 - 1e-6) / 20)
  const c = document.createElement('canvas'); c.width = pap.px.l; c.height = pap.px.h
  const x = c.getContext('2d')
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
  const page = { fond: a.tableau.fondDe(a.page), origine: a.tableau.origineDe(a.page), formes }
  ap.peindre(x, page, f.cam, { l: pap.css.l, h: pap.css.h, dpr: d, fond: 'aucun', formes: formes.filter(g => g.type === 'image') })
  const im = formes.find(g => g.type === 'image')
  const x0 = Math.ceil((im.x * f.cam.z + f.cam.x) * d) + 2, y0 = Math.ceil((im.y * f.cam.z + f.cam.y) * d) + 2
  const l = Math.floor(500 * im.m[0] * f.cam.z * d) - 4
  const data = x.getImageData(x0, y0, l, l).data
  window.__ref = { x0, y0, l, data: Array.from(data) }
  const couleurs = new Set(); for (let i = 0; i < data.length; i += 4) couleurs.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])
  return { x0, y0, l, couleurs: couleurs.size, pixelsImage: l * l, feuille: c.width * c.height }
})
console.log('référence', ref)
const r = await exporter(page, D, 'photo', ctrlP(page))
const im = images(r.fichier)
console.log(im, info(r.fichier).octets)
const { fichiers } = rendre(r.fichier, 200, D + '/f')
const res = await page.evaluate(async ([b]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const R = window.__ref
  const d = x.getImageData(R.x0, R.y0, R.l, R.l).data
  let s = 0, max = 0, gros = 0
  const couleurs = new Set()
  for (let i = 0; i < d.length; i += 4) {
    const e = (Math.abs(d[i] - R.data[i]) + Math.abs(d[i + 1] - R.data[i + 1]) + Math.abs(d[i + 2] - R.data[i + 2])) / 3
    s += e; max = Math.max(max, e); if (e > 12) gros++
    couleurs.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])
  }
  // Les deux découpes, côte à côte, agrandies, pour les voir
  const o = document.createElement('canvas'); o.width = R.l * 2 + 10; o.height = R.l
  const ox = o.getContext('2d')
  ox.putImageData(new ImageData(new Uint8ClampedArray(R.data), R.l, R.l), 0, 0)
  ox.putImageData(new ImageData(new Uint8ClampedArray(d), R.l, R.l), R.l + 10, 0)
  return { ecartMoyen: s / (d.length / 4), max, partDesPixelsAPlusDe12: gros / (d.length / 4), couleursPdf: couleurs.size, cote: o.toDataURL('image/png').split(',')[1] }
}, [b64(fichiers[0])])
const { writeFileSync } = await import('node:fs')
writeFileSync(D + '/cote-a-cote.png', Buffer.from(res.cote, 'base64'))
delete res.cote
console.log('PDF', res)
verifier(`La photo (échelle ${ECH}) garde ses couleurs dans le PDF (écart moyen < 6 sur 255)`, res.ecartMoyen < 6, { genre: im[0].enc + '/' + im[0].couleur, ...res, couleursRef: ref.couleurs })
console.log(erreurs)
await nav.close()
