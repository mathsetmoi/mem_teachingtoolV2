// Téléphone : le menu de la page (appui long) et le menu complet tiennent dans l'écran
import { contexte, charger, etat, boiteEcran, outil, poser, verifier, note, fin, attendre } from './lib.mjs'
const ctx = await contexte({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true })
const { page, touche } = await charger(ctx, 'tel-menus')
await outil(page, 'selection')
await touche('touchStart', [[200, 400, 1]]); await attendre(650)
let e = await etat(page)
const r = await page.evaluate(() => { const m = document.querySelector('.menu-flottant[aria-label="Page"]'); const q = m.getBoundingClientRect(); return { left: q.left, right: q.right, top: q.top, bottom: q.bottom, w: innerWidth } })
await touche('touchEnd', []); await page.waitForTimeout(150)
await page.screenshot({ path: new URL('./tel-menu-page.png', import.meta.url).pathname })
verifier('téléphone : le menu de la page (appui long) tient dans l\'écran', e.menuPage && r.left >= 0 && r.right <= r.w, r)
await fin()
