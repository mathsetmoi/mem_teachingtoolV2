// « Envoyer vers… » : menu complet, fenêtre, message, Aller, Annuler, Ctrl+Z sur les deux pages
import { ouvrir, preparer, etat, verifier, fin, pause, D } from './lib.mjs'

const { page } = await ouvrir()
const ids = await preparer(page, 4, { noms: { 2: 'Exercice 12 p. 84' }, ici: 0 })
// Deux traits de plus sur la page 1
await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  for (const [k, y] of [[1, 420], [2, 520]]) {
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 10, 0, 0.5)
    t.poser(a.page, { id: 'x' + k, type: 'trait', x: 300, y, z: Date.now() + k, auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
  }
})
await pause(200)
await page.keyboard.press('Control+a'); await pause(200)
// Clic droit sur un trait choisi
const p = await page.evaluate(() => { const a = window.__app; const s = a.cam.versEcran(400, 420); const z = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + z.left, y: s.y + z.top } })
await page.mouse.click(p.x, p.y, { button: 'right' }); await pause(300)
const menu = await page.evaluate(() => {
  const m = [...document.querySelectorAll('.panneau, .menu-flottant')].find(x => !x.hidden && x.offsetParent)
  return m ? { label: m.getAttribute('aria-label'), boutons: [...m.querySelectorAll('button')].filter(b => b.offsetParent).map(b => b.textContent.trim()).slice(-8) } : null
})
console.log('menu complet', menu)
// « Envoyer vers… » est dans le petit menu ⋯ (Plus) du menu complet depuis les corrections « regressions »
await page.locator('.panneau-forme .ligne button.plus').click(); await pause(300)
await page.locator('.menu-plus .menu-item', { hasText: 'Envoyer vers…' }).first().click(); await pause(500)
await page.screenshot({ path: D + '/envoi.png' })
const fen = await page.evaluate(() => { const d = document.querySelector('dialog[open]'); return d ? { txt: d.innerText, focus: document.activeElement?.innerText } : null })
console.log('fenêtre', fen)
await page.locator('dialog[open] .destination', { hasText: 'Page 3' }).click(); await pause(300)
let e = await etat(page)
console.log('message', e.toast, e.n, e.pages.indexOf(e.page) + 1)
verifier('Message « 3 objets envoyés vers la page 3 · Aller à la page 3 · Annuler »', /^3 objets envoyés vers la page 3Aller à la page 3Annuler$/.test(e.toast), e.toast)
await page.locator('.toast button', { hasText: 'Aller à la page 3' }).click(); await pause(400)
e = await etat(page)
const sel = await page.evaluate(() => window.__app.selection.size)
console.log('Aller', e.pages.indexOf(e.page) + 1, 'sélection', sel, e.toast)
await page.keyboard.press('Escape'); await pause(100)
const surLa3 = () => page.evaluate(id => [...window.__app.tableau.formesDe(id).keys()], ids[2])
const arrives = (await surLa3()).filter(x => x !== 'w2')
await page.keyboard.press('Control+z'); await pause(200)
e = await etat(page)
console.log('Ctrl+Z sur l\'arrivée', e.n, e.msgs.at(-1))
// Mis à jour au contrôle final : sur la page d'arrivée, Ctrl+Z ne retire
// jamais les objets arrivés ; il y défait le dernier geste de cette page (ici
// le trait « w2 », posé par preparer dans cette session), comme le dit le README
const apresZ = await surLa3()
verifier('Ctrl+Z sur l\'arrivée : les 3 objets arrivés y restent (il défait le dernier geste de la page 3)', arrives.length === 3 && arrives.every(x => apresZ.includes(x)), { arrives, apresZ })
await page.keyboard.press('PageUp'); await page.keyboard.press('PageUp'); await pause(300)
await page.keyboard.press('Control+z'); await pause(300)
e = await etat(page)
const reste3 = await surLa3()
console.log('Ctrl+Z sur le départ', e.n, e.msgs.at(-1), 'page 3 :', reste3)
verifier('Ctrl+Z sur le départ : les objets reviennent et quittent l\'arrivée', e.n === 3 && !arrives.some(x => reste3.includes(x)), { n: e.n, reste3 })
await fin()
