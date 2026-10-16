// Un nom de point déplacé loin de son point (jusqu'à 70 unités, ce que permet ECART_NOM.max) :
// est-il entier dans l'image copiée et dans le PDF ?
import { nav, ouvrir, exporter, rendre, verifier, ctrlP, mkdir, V, erreurs, msgs } from './lib.mjs'
import { writeFileSync } from 'node:fs'
const D = mkdir(V + '/out/noms')
const { ctx, page } = await ouvrir({}, 'noms')
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  // Le sommet du haut, C, a son nom déplacé à 66 unités au-dessus (posNoms)
  t.poser(a.page, { id: 'tri', type: 'polygone', x: 300, y: 300, z: 1, auteur: t.moi, pts: [0, 300, 360, 300, 160, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], posNoms: [null, null, { x: 0, y: -66 }] })
})
await page.waitForTimeout(400)
await page.screenshot({ path: D + '/ecran.png', clip: { x: 300, y: 150, width: 500, height: 450 } })
await page.evaluate(() => window.__app.ui.copierEnImage('page'))
await page.waitForTimeout(800)
const img = await page.evaluate(async () => {
  const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
  const b = await it.getType('image/png'); const bmp = await createImageBitmap(b)
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0)
  const d = c.getContext('2d').getImageData(0, 0, c.width, 3).data
  let bord = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 150 && d[i + 2] > 120) bord++
  return { png: c.toDataURL().split(',')[1], l: c.width, h: c.height, encreAuBordDuHaut: bord }
})
writeFileSync(D + '/copie.png', Buffer.from(img.png, 'base64'))
const r = await exporter(page, D, 'noms', ctrlP(page))
const { fichiers } = rendre(r.fichier, 100, D + '/f')
console.log(img.l, img.h, img.encreAuBordDuHaut, fichiers)
verifier('Image copiée : le nom C, déplacé au-dessus de son point, n\'est pas coupé par le bord de l\'image', img.encreAuBordDuHaut === 0, img.encreAuBordDuHaut)
console.log(erreurs)
await nav.close()
