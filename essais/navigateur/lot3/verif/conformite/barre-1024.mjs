// 1024 × 768 (vidéoprojecteur courant) : deux clics sur « Nouvelle page » au même endroit,
// partis d'une page nommée « Exercice 12 p. 84 »
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir({ viewport: { width: 1024, height: 768 } })
await preparer(page, 2, { ici: 1, noms: { 1: 'Exercice 12 p. 84' } })
await pause(300)
const plus = await page.evaluate(() => { const b = document.querySelector('.barre-haut button[aria-label="Nouvelle page"]'), r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
console.log('« Nouvelle page » sur la page nommée :', plus)
await page.mouse.click(plus.x, plus.y); await pause(800)
let e = await etat(page)
console.log('1er clic :', e.pages.length, 'pages, on est sur', e.pages.indexOf(e.page) + 1)
const sous = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('button')?.getAttribute('aria-label'), plus)
console.log('sous le même point maintenant :', sous)
await page.screenshot({ path: D + '/barre-1024-apres.png', clip: { x: 0, y: 0, width: 1024, height: 130 } })
await page.mouse.click(plus.x, plus.y); await pause(500)
e = await etat(page)
console.log('2e clic :', e.pages.length, 'pages ;', e.msgs.at(-1))
verifier('Deux clics au même endroit sur « Nouvelle page » ajoutent deux pages', e.pages.length === 4, { pages: e.pages.length, message: e.msgs.at(-1), sous })
await fin()
