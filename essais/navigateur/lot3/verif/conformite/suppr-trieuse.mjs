// Supprimer dans la trieuse la page qu'on regarde, fermer, Ctrl+Z à l’écran
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
const ids = await preparer(page, 4, { ici: 2 })
await page.keyboard.press('Shift+P'); await pause(500)
await page.keyboard.press('Delete'); await pause(300)
let e = await etat(page)
console.log('Suppr', e.msgs.at(-1), 'page', e.pages.indexOf(e.page) + 1, e.pages.length)
await page.keyboard.press('Escape'); await pause(300)
e = await etat(page)
console.log('fermée', e.ouverte, 'page', e.pages.indexOf(e.page) + 1, 'toast', e.toast)
await pause(1200)
await page.keyboard.press('Control+z'); await pause(300)
e = await etat(page)
console.log('Ctrl+Z', e.msgs.at(-1), 'page', e.pages.indexOf(e.page) + 1, e.page === ids[2], e.pages.length)
verifier('Ctrl+Z à l’écran rend la page supprimée dans la trieuse', e.page === ids[2] && e.pages.indexOf(ids[2]) === 2)
await fin()
