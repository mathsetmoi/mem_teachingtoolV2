// La photo d'un énoncé (texte sombre sur papier beige, un léger bruit de capteur) :
// la feuille du PDF comparée à la même feuille peinte sans palette
import { nav, ouvrir, exporter, images, rendre, b64, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const D = mkdir(V + '/out/photo-enonce')
const { ctx, page } = await ouvrir({}, 'enonce')
await page.evaluate(async () => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'carreaux')
  const c = document.createElement('canvas'); c.width = 1600; c.height = 1200
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 1600, 1200); g.addColorStop(0, '#e8e2d4'); g.addColorStop(1, '#c9c2b0')
  x.fillStyle = g; x.fillRect(0, 0, 1600, 1200)
  x.fillStyle = '#2a2a33'; x.font = '48px serif'
  for (let l = 0; l < 14; l++) x.fillText('Exercice ' + (l + 1) + ' : on considère la fonction f définie sur R', 80, 120 + l * 75)
  const im = x.getImageData(0, 0, 1600, 1200)
  let s = 2463534242
  const h = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 24) & 255) / 255 }
  for (let i = 0; i < im.data.length; i += 4) { const b = (h() + h() + h() - 1.5) * 6; for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, im.data[i + k] + b + (h() - 0.5) * 3)) }
  x.putImageData(im, 0, 0)
  t.doc.getMap('images').set('ph', c.toDataURL('image/jpeg', 0.9))
  t.poser(a.page, { id: 'photo', type: 'image', src: 'ph', l: 1600, h: 1200, m: [0.45, 0, 0, 0.45], x: 0, y: 0, z: 1, auteur: t.moi })
})
await page.waitForTimeout(1200)
await page.screenshot({ path: D + '/ecran.png' })
const ref = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const mp = m.mettreEnPage(ap.boite(formes), formes.map(f => ap.boite([f])).filter(Boolean))
  const f = mp.feuilles[0], d = m.DPR_PDF, pap = mp.papier
  await ap.preparer(formes, 2)
  const c = document.createElement('canvas'); c.width = pap.px.l; c.height = pap.px.h
  const x = c.getContext('2d')
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
  ap.peindre(x, { fond: 'carreaux', origine: a.tableau.origineDe(a.page), formes }, f.cam, { l: pap.css.l, h: pap.css.h, dpr: d, fond: 'aucun', formes })
  const o = document.createElement('canvas'); o.width = 700; o.height = 400
  o.getContext('2d').drawImage(c, 0, 0, 700, 400, 0, 0, 700, 400)
  // Le texte sombre : combien de pixels de luminance < 100 dans la photo ?
  const dd = x.getImageData(0, 0, c.width, c.height).data
  let sombres = 0
  for (let i = 0; i < dd.length; i += 4) if (0.299 * dd[i] + 0.587 * dd[i + 1] + 0.114 * dd[i + 2] < 100) sombres++
  return { png: o.toDataURL().split(',')[1], sombres }
})
writeFileSync(D + '/reference-crop.png', Buffer.from(ref.png, 'base64'))
const r = await exporter(page, D, 'enonce', ctrlP(page))
console.log(images(r.fichier))
const { fichiers } = rendre(r.fichier, 200, D + '/f')
const sombresPdf = await page.evaluate(async ([b]) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  const x = c.getContext('2d'); x.drawImage(img, 0, 0)
  const dd = x.getImageData(0, 0, c.width, c.height).data
  let sombres = 0, min = 255
  for (let i = 0; i < dd.length; i += 4) { const v = 0.299 * dd[i] + 0.587 * dd[i + 1] + 0.114 * dd[i + 2]; if (v < 100) sombres++; min = Math.min(min, v) }
  return { sombres, min }
}, [b64(fichiers[0])])
verifier('Le texte sombre de la photo de l\'énoncé reste sombre dans le PDF', sombresPdf.sombres > ref.sombres * 0.5, { ref: ref.sombres, pdf: sombresPdf })
console.log(erreurs)
await nav.close()
