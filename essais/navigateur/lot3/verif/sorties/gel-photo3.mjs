// Une photo d'appareil en couleurs (dégradés, bruit de capteur de ±8 par canal),
// 2000 × 1500, qui remplit la feuille : tâches longues de l'export
import { nav, ouvrir, exporter, images, verifier, ctrlP, mkdir, V, erreurs } from './lib.mjs'
const D = mkdir(V + '/out/gel-photo3')
const { ctx, page } = await ouvrir({}, 'gel3')
const nb = await page.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const c = document.createElement('canvas'); c.width = 2000; c.height = 1500
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 2000, 1500); g.addColorStop(0, '#5a8fd0'); g.addColorStop(0.5, '#e6d3a8'); g.addColorStop(1, '#3f6b2a')
  x.fillStyle = g; x.fillRect(0, 0, 2000, 1500)
  for (let k = 0; k < 40; k++) { x.fillStyle = `hsl(${k * 37 % 360} 50% 50% / 0.4)`; x.beginPath(); x.arc((k * 397) % 2000, (k * 263) % 1500, 80 + (k * 13) % 200, 0, 7); x.fill() }
  const im = x.getImageData(0, 0, 2000, 1500)
  let s = 99991
  const h = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 24) & 255) / 255 - 0.5 }
  for (let i = 0; i < im.data.length; i += 4) for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, im.data[i + k] + h() * 16))
  x.putImageData(im, 0, 0)
  const url = c.toDataURL('image/jpeg', 0.92)
  t.doc.getMap('images').set('ph', url)
  t.poser(a.page, { id: 'photo', type: 'image', src: 'ph', l: 2000, h: 1500, m: [0.5, 0, 0, 0.5], x: 0, y: 0, z: 1, auteur: t.moi })
  return url.length
})
await page.waitForTimeout(1500)
await page.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false })
})
const r = await exporter(page, D, 'photo3', ctrlP(page))
const longues = await page.evaluate(() => window.__longues)
console.log(nb, images(r.fichier), r.ms, 'ms')
verifier(`Export d'une page remplie par une photo d'appareil : aucune tâche longue de plus de 150 ms`, Math.max(0, ...longues) <= 150, { longues })
console.log(erreurs)
await nav.close()
