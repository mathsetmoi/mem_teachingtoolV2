// Ce qu'un lecteur d'écran lit de la trieuse (arbre d'accessibilité)
import { ouvrir, preparer, fin, pause, D } from './lib.mjs'

const { page, ctx } = await ouvrir()
await preparer(page, 4, { ici: 1, noms: { 1: 'Exercice 12 p. 84' }, vides: [] })
await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.allerPage(a.pages[1]) })
await pause(1500)
await page.keyboard.press('Shift+P'); await pause(800)
console.log(await page.locator('.trieuse').ariaSnapshot())
const cdp = await ctx.newCDPSession(page)
const { nodes } = await cdp.send('Accessibility.getFullAXTree')
const pertinents = nodes.filter(n => !n.ignored && ['option', 'button', 'listbox', 'dialog', 'status', 'StaticText'].includes(n.role?.value)).map(n => `${n.role.value}: ${n.name?.value ?? ''}`)
console.log(pertinents.filter(x => !x.startsWith('StaticText')).join('\n'))
// Choisir deux pages : ce qui est dit
await page.keyboard.press(' '); await pause(100)
await page.keyboard.press('ArrowRight'); await page.keyboard.press(' '); await pause(200)
console.log(await page.locator('.trieuse-tete').ariaSnapshot())
await fin()
