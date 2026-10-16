// Téléphone en paysage : « Tout voir » montre-t-il tout le contenu hors des barres ?
// Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : la barre du
// zoom y est cachée (le pincement zoome) ; « Tout voir » est dans « Plus »
// (le bouton ⋯ de la barre du haut), où on le touche.
import { lancer, ouvrir, noter, bilan, POSER } from './lib.mjs'
const nav = await lancer()
const { page } = await ouvrir(nav, { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true }, 'paysage')
const ev = (f, a) => page.evaluate(f, a)
await ev(POSER, { x: 0, y: 0, l: 1600, h: 900 })
await ev(POSER, { x: 700, y: 30, l: 200, h: 40 })   // un titre en haut du contenu
await page.waitForTimeout(100)
await page.tap('.barre-haut > .bouton.points')
await page.waitForTimeout(250)
await page.tap('.menu-flottant[aria-label="Plus"] .menu-item[data-action="tout-voir"]')
await page.waitForTimeout(500)
const r = await ev(() => {
  const a = window.__app, z = a.rendu.scene.getBoundingClientRect()
  const b = a.boiteDuContenu(), h = document.querySelector('.barre-haut').getBoundingClientRect()
  const haut = a.cam.versEcran(b.x, b.y), bas = a.cam.versEcran(b.x + b.l, b.y + b.h)
  const titre = a.cam.versEcran(800, 30)
  return { zl: a.ui.zoneLibre(), contenu: [Math.round(haut.x), Math.round(haut.y + z.top), Math.round(bas.x), Math.round(bas.y + z.top)], barreHaut: [Math.round(h.left), Math.round(h.top), Math.round(h.right), Math.round(h.bottom)], titre: [Math.round(titre.x), Math.round(titre.y + z.top)], z: a.cam.z }
})
await page.screenshot({ path: 'paysage-toutvoir.png' })
noter('Téléphone en paysage, Tout voir : le haut du contenu n\'est pas sous la barre du haut', r.contenu[1] >= r.barreHaut[3], JSON.stringify(r))
bilan()
await nav.close()
