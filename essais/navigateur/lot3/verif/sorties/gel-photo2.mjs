// Une « photo d'appareil » (1600 × 1200, des dégradés et un léger bruit de capteur,
// comme la photo d'un énoncé prise au téléphone) : tâches longues de l'export
import { nav, ouvrir, exporter, images, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
const D = mkdir(V + '/out/gel-photo2')
const { ctx, page } = await ouvrir({}, 'gel2')
const n = await page.evaluate(async () => {
  const a = window.__app, t = a.tableau
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
  const url = c.toDataURL('image/jpeg', 0.9)
  t.doc.getMap('images').set('ph', url)
  t.poser(a.page, { id: 'photo', type: 'image', src: 'ph', l: 1600, h: 1200, m: [0.45, 0, 0, 0.45], x: 0, y: 0, z: 1, auteur: t.moi })
  return url.length
})
await page.waitForTimeout(1200)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false })
})
const r = await exporter(page, D, 'photo2', ctrlP(page))
const longues = await page.evaluate(() => window.__longues)
console.log('image', n, 'octets', images(r.fichier), r.ms, 'ms')
verifier(`Export d'une page avec la photo d'un énoncé : aucune tâche longue de plus de 150 ms`, Math.max(0, ...longues) <= 150, { longues })
console.log(erreurs)
await nav.close()
