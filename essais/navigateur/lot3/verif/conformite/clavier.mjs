// La trieuse au clavier : flèches, Début/Fin, Entrée, chiffres, F2, Ctrl+D,
// Suppr, Ctrl+Z/Y, Échap, touche Menu, Ctrl+Maj+flèches ; messages
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
await preparer(page, 6, { noms: { 2: 'Exercice 12 p. 84' }, ici: 0 })
await pause(300)
const touche = async (k, n = 1) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await pause(60) } return etat(page) }
// Ouvrir par le compteur au clavier : focus sur le compteur puis Entrée
await page.focus('.rang')
let e = await touche('Enter')
verifier('Entrée sur le compteur ouvre la trieuse', e.ouverte)
console.log('focus', e.focus)
e = await touche('ArrowRight')
console.log('→', e.focus)
e = await touche('End'); console.log('Fin', e.focus)
e = await touche('Home'); console.log('Début', e.focus)
e = await touche('ArrowDown'); console.log('↓', e.focus)
// Chiffres
e = await touche('4'); console.log('4', e.focus)
// F2 renommer
e = await touche('F2')
const champ = await page.evaluate(() => { const i = document.querySelector('.carte-saisie'); return i ? { ph: i.placeholder, aria: i.getAttribute('aria-label'), max: i.maxLength, val: i.value } : null })
console.log('F2 champ', champ)
await page.keyboard.type('Corrigé du DS')
e = await touche('Enter')
console.log('Renommé', e.msgs.at(-1), e.toast)
// Ctrl+D
e = await touche('Control+d')
console.log('Ctrl+D', e.msgs.at(-1), e.cartes.length, e.focus)
const noms = await page.evaluate(() => window.__app.pages.map(p => window.__app.tableau.nomDe(p)))
console.log('noms', noms)
// Suppr
e = await touche('Delete')
console.log('Suppr', e.msgs.at(-1), e.cartes.length, e.focus, 'corbeille', e.corbeille)
// Ctrl+Z
e = await touche('Control+z')
console.log('Ctrl+Z', e.msgs.at(-1), e.cartes.length)
e = await touche('Control+y')
console.log('Ctrl+Y', e.msgs.at(-1), e.cartes.length)
e = await touche('Control+z')
// Ctrl+Maj+→
e = await touche('Control+Shift+ArrowRight')
console.log('Ctrl+Maj+→', e.msgs.at(-1), e.focus)
// Touche Menu
e = await touche('ContextMenu')
const menu = await page.evaluate(() => {
  const m = document.querySelector('.trieuse .menu-vignette')
  return m && !m.hidden ? { label: m.getAttribute('aria-label'), items: [...m.children].map(c => c.tagName === 'HR' ? '─' : (c.getAttribute('role') ?? c.className) + ':' + c.textContent + (c.getAttribute('aria-checked') ? '[' + c.getAttribute('aria-checked') + ']' : '') + (c.getAttribute('aria-disabled') ? '(grisé)' : '')), focus: document.activeElement?.textContent } : null
})
console.log('Menu', JSON.stringify(menu, null, 1))
await page.screenshot({ path: D + '/menu-vignette.png' })
e = await touche('Escape')
console.log('Échap (menu)', e.ouverte, e.menu, e.focus)
// Espace : choisir ; Ctrl+A
e = await touche(' ')
console.log('Espace', e.choisies)
e = await touche('Control+a')
console.log('Ctrl+A', e.choisies.length)
await page.screenshot({ path: D + '/choix.png' })
const bandeau = await page.evaluate(() => [...document.querySelectorAll('.trieuse-tete button')].filter(b => b.offsetParent).map(b => b.getAttribute('aria-label')))
console.log('Bandeau choix', bandeau, await page.evaluate(() => document.querySelector('.trieuse-nombre').textContent))
e = await touche('Escape')
console.log('Échap (sélection)', e.ouverte, e.choisies)
e = await touche('Escape')
console.log('Échap (trieuse)', e.ouverte, 'focus', await page.evaluate(() => document.activeElement?.className))
await fin()
