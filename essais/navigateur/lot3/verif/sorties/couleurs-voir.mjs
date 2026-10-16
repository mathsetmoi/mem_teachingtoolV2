// Les mêmes croix : la feuille du PDF et la même feuille peinte sans palette, côte à côte
import { nav, ouvrir, exporter, rendre, b64, ctrlP, mkdir, V } from './lib.mjs'
import { writeFileSync } from 'node:fs'
import { ECRIRE } from '../../P9/ecriture.mjs'
const D = mkdir(V + '/out/couleurs-voir')
const { ctx, page } = await ouvrir({}, 'cv')
await page.evaluate(ECRIRE, { pages: 1, lignes: 13, mots: 9, fond: 'seyes', pas: 72, couleur: '#1b2230' })
const marques = ['#d64545', '#2e9e5b', '#e8891c', '#1b5fbf', '#8e44ad']
await page.evaluate((marques) => {
  const a = window.__app, t = a.tableau
  marques.forEach((c, i) => {
    const x = 1150, y = 140 + i * 140
    t.poser(a.page, { id: 'm' + i + 'a', type: 'trait', x, y, z: 6000 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, 16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
    t.poser(a.page, { id: 'm' + i + 'b', type: 'trait', x, y: y + 16, z: 6100 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, -16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
  })
}, marques)
await page.waitForTimeout(600)
const ref = await page.evaluate(async () => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()]
  await ap.mesurer(formes)
  const mp = m.mettreEnPage(ap.boite(formes), formes.map(f => ap.boite([f])).filter(Boolean))
  const f = mp.feuilles[0], d = m.DPR_PDF, pap = mp.papier
  const c = document.createElement('canvas'); c.width = pap.px.l; c.height = pap.px.h
  const x = c.getContext('2d')
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
  const pg = { fond: 'seyes', origine: a.tableau.origineDe(a.page), formes }
  x.save(); x.beginPath(); const u = pap.utile; x.rect(u.x * d, u.y * d, u.l * d, u.h * d); x.clip()
  ap.peindre(x, pg, f.cam, { l: pap.css.l, h: pap.css.h, dpr: d, fond: true, formes: [] }); x.restore()
  ap.peindre(x, pg, f.cam, { l: pap.css.l, h: pap.css.h, dpr: d, fond: 'aucun', formes })
  const px = Math.round((1140 * f.cam.z + f.cam.x) * d), py = Math.round((130 * f.cam.z + f.cam.y) * d)
  const w = 80, h = Math.round(5 * 140 * f.cam.z * d)
  return { px, py, w, h, png: (() => { const o = document.createElement('canvas'); o.width = w * 4; o.height = h; const ox = o.getContext('2d'); ox.imageSmoothingEnabled = false; ox.drawImage(c, px, py, w, h, 0, 0, w * 4 / 2, h); return o })() && null, data: c.toDataURL().split(',')[1] }
})
const r = await exporter(page, D, 'cv', ctrlP(page))
const { fichiers } = rendre(r.fichier, 200, D + '/f')
const png = await page.evaluate(async ([a, b, R]) => {
  const charge = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); return i }
  const A = await charge(a), B = await charge(b)
  const o = document.createElement('canvas'); o.width = R.w * 6 + 20; o.height = R.h * 3
  const x = o.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, o.width, o.height)
  x.drawImage(A, R.px, R.py, R.w, R.h, 0, 0, R.w * 3, R.h * 3)
  x.drawImage(B, R.px, R.py, R.w, R.h, R.w * 3 + 20, 0, R.w * 3, R.h * 3)
  return o.toDataURL().split(',')[1]
}, [ref.data, b64(fichiers[0]), ref])
writeFileSync(D + '/croix-ref-gauche-pdf-droite.png', Buffer.from(png, 'base64'))
await nav.close()
