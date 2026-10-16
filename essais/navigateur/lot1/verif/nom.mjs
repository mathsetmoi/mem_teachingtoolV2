// Outil Sélection : un clic sur le nom « A » d'un triangle non sélectionné
import { lancer, ouvrir, noter, bilan } from './lib.mjs'
const nav = await lancer()
const { page } = await ouvrir(nav, {}, 'pc')
const ev = (f, a) => page.evaluate(f, a)
const r0 = await ev(() => {
  const a = window.__app
  const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 300, y: 400 }, { x: 600, y: 400 }, { x: 450, y: 200 }] })
  f.sommets = true; f.noms = ['A', 'B', 'C']
  a.tableau.nouveauGeste(); a.tableau.poser(a.page, f)
  a.choisirOutil('selection')
  return f.id
})
await page.waitForTimeout(150)
// Où est le nom A ? On le trouve par la prise du clic droit
const place = await ev(() => {
  const a = window.__app, f = a.formes[0]
  for (let dx = -40; dx <= 40; dx += 2) for (let dy = -40; dy <= 40; dy += 2) {
    const s = a.cam.versEcran(300, 400); const p = { x: s.x + dx, y: s.y + dy }
    const pr = a.priseSous(p, { toutes: true }); if (pr && pr.prise.quoi === 'nom' && pr.prise.i === 0 && Math.hypot(dx, dy) > 14) return { ...p, d: Math.hypot(dx, dy) }
  }
  return null
})
const z = await ev(() => document.getElementById('zone').getBoundingClientRect().top)
await page.mouse.click(place.x, place.y + z)
await page.waitForTimeout(350)
const r = await ev(() => ({ sel: [...window.__app.selection], partie: window.__app.partie }))
noter('Sélection : un clic sur le nom « A » d\'un triangle non sélectionné prend le triangle', r.sel.length === 1, JSON.stringify({ place, ...r }))
bilan()
await nav.close()
