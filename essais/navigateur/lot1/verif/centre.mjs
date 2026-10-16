// Outil Sélection : un clic sur le centre nommé (O) d'un cercle non sélectionné, ou sur le nom d'un sommet
import { lancer, ouvrir, noter, bilan, outils } from './lib.mjs'
const nav = await lancer()
const { page, cdp } = await ouvrir(nav, {}, 'pc')
const ev = (f, a) => page.evaluate(f, a)
const id = await ev(() => {
  const a = window.__app
  const f = a.nouvelleFigure({ type: 'cercle', x: 400, y: 300, r: 100 })
  f.sommets = true; f.noms = ['O']
  a.tableau.nouveauGeste(); a.tableau.poser(a.page, f)
  a.choisirOutil('selection')
  return f.id
})
await page.waitForTimeout(100)
const s = await ev(() => window.__app.cam.versEcran(400, 300))
await page.mouse.move(s.x, s.y)
const curseur = await ev(() => document.getElementById('zone').style.cursor)
await page.mouse.click(s.x, s.y)
await page.waitForTimeout(350)
const r1 = await ev(() => ({ sel: [...window.__app.selection], partie: window.__app.partie }))
noter('Sélection : un clic sur le centre O d\'un cercle non sélectionné prend le cercle', r1.sel.length === 1, JSON.stringify({ curseur, ...r1 }))
// Glisser le centre d'un cercle non sélectionné (avant le lot 1 : le cercle suivait)
await page.mouse.move(s.x, s.y); await page.mouse.down(); await page.mouse.move(s.x + 60, s.y, { steps: 6 }); await page.mouse.up()
await page.waitForTimeout(100)
const r2 = await ev(id => ({ x: window.__app.forme(id).x, cam: window.__app.cam.x, sel: [...window.__app.selection] }), id)
noter('… le glisser depuis O ne déplace pas la vue à la place', r2.cam === 120, JSON.stringify(r2))
// Le doigt qui déplace : toucher O
await nav.close()
bilan()
