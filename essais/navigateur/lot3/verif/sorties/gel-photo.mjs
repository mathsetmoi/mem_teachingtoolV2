// Les tâches longues pendant l'export d'une page avec une grande photo
import { nav, ouvrir, exporter, info, images, verifier, ctrlP, mkdir, V, S, erreurs, photoEssai } from './lib.mjs'
import { readFileSync } from 'node:fs'
const D = mkdir(V + '/out/gel-photo')
const PHOTO = await photoEssai(1)   // (une illustration en dégradés de 500 × 500, voir lib.mjs)
const genre = process.argv[2] ?? 'photo'
const { ctx, page } = await ouvrir({}, 'gel')
await page.evaluate(async ([src, genre]) => {
  const a = window.__app, t = a.tableau
  let url = src
  if (genre === 'bruit') {
    const c = document.createElement('canvas'); c.width = 600; c.height = 450
    const x = c.getContext('2d'), im = x.createImageData(600, 450)
    let s = 2463534242
    const h = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 24) & 255 }
    for (let i = 0; i < im.data.length; i += 4) { im.data[i] = h(); im.data[i + 1] = h(); im.data[i + 2] = h(); im.data[i + 3] = 255 }
    x.putImageData(im, 0, 0); url = c.toDataURL('image/png')
  }
  t.doc.getMap('images').set('ph', url)
  const n = genre === 'bruit' ? 600 : 500
  t.poser(a.page, { id: 'photo', type: 'image', src: 'ph', l: n, h: genre === 'bruit' ? 450 : 500, m: [1.4, 0, 0, 1.4], x: 0, y: 0, z: 1, auteur: t.moi })
}, ['data:image/jpeg;base64,' + PHOTO.toString('base64'), genre])
await page.waitForTimeout(800)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false })
})
const r = await exporter(page, D, genre, ctrlP(page))
const longues = await page.evaluate(() => window.__longues)
console.log(images(r.fichier), r.ms, 'ms')
verifier(`Export d'une page avec une grande ${genre} : aucune tâche longue de plus de 150 ms`, Math.max(0, ...longues) <= 150, { longues })
console.log(erreurs)
await nav.close()
