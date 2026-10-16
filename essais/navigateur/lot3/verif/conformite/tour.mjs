// Tour de conformité : barre du haut, « › » sur la dernière page, annonce,
// compteur avec nom, trieuse (aria, Tab, flèches, Échap)
import { ouvrir, preparer, etat, verifier, fin, pause, D, centre } from './lib.mjs'

const { page } = await ouvrir()
const pages = await preparer(page, 4, { noms: { 2: 'Exercice 12 p. 84' }, ici: 3 })
// Fond Seyès sur la dernière page
await page.evaluate(() => { const a = window.__app; a.tableau.changerFond(a.page, 'seyes') })
await pause(200)
const barre = await page.evaluate(() => {
  const b = [...document.querySelectorAll('.barre-haut button, .barre-haut .rang')]
  return b.map(x => ({ t: x.title, a: x.getAttribute('aria-label'), txt: x.textContent, mode: x.dataset.mode ?? null }))
})
console.log('Barre du haut (dernière page) :', JSON.stringify(barre, null, 1))
await page.screenshot({ path: D + '/barre-derniere.png', clip: { x: 0, y: 0, width: 1366, height: 60 } })

// Le bouton › en mode ajout
const apres = await page.evaluate(() => {
  const b = document.querySelector('.barre-haut button[data-mode]')
  const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, mode: b.dataset.mode, title: b.title }
})
console.log('›', apres)
await pause(700)
await page.mouse.click(apres.x, apres.y)
await pause(60)
await page.screenshot({ path: D + '/annonce-ajout.png' })
const e1 = await etat(page)
const info = await page.evaluate(() => {
  const a = window.__app, t = a.tableau
  return { n: a.pages.length, i: a.pages.indexOf(a.page), fond: t.fondDe(a.page), cam: { ...a.cam }, rang: document.querySelector('.rang').textContent,
    annonce: document.querySelector('.annonce-page').textContent, annonceVisible: !document.querySelector('.annonce-page').hidden }
})
console.log('Après › :', info)
// Retouches après le lot 5 : toute page neuve est blanche (la courante est en Seyès)
verifier('› sur la dernière page (en Seyès) ajoute une page blanche après', info.n === 5 && info.i === 4 && info.fond === 'blanc', info)
await pause(1500)
const annonceApres = await page.evaluate(() => document.querySelector('.annonce-page').hidden)
verifier('L\'annonce disparaît en ~1,1 s', annonceApres)

// Page↓ sur la dernière page
await page.keyboard.press('PageDown')
await pause(100)
let e = await etat(page)
console.log('Page↓ dernière :', e.msgs.at(-1), e.pages.length)
// Page↑
await page.keyboard.press('PageUp'); await pause(100)
e = await etat(page)
console.log('Page↑ :', e.pages.indexOf(e.page))

// Aller à la page 3 (nommée)
await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[2]) })
await pause(80)
await page.screenshot({ path: D + '/annonce-nom.png' })
const rang = await page.evaluate(() => { const r = document.querySelector('.rang'); return { txt: r.textContent, title: r.title, aria: r.getAttribute('aria-label') } })
console.log('Compteur nommé :', rang)
verifier('Compteur « 3 / 5 · Exercice 12 p. 84 »', rang.txt === '3 / 5 · Exercice 12 p. 84', rang.txt)
await pause(1500)

// Maj + P : la trieuse
await page.keyboard.press('Shift+P')
await pause(500)
e = await etat(page)
verifier('Maj + P ouvre la trieuse', e.ouverte)
await pause(800)
await page.screenshot({ path: D + '/trieuse.png' })
const aria = await page.evaluate(() => {
  const tr = document.querySelector('.trieuse')
  const g = tr.querySelector('.trieuse-grille')
  return {
    section: { role: tr.getAttribute('role'), modal: tr.getAttribute('aria-modal'), label: tr.getAttribute('aria-label') },
    grille: { role: g.getAttribute('role'), label: g.getAttribute('aria-label'), multi: g.getAttribute('aria-multiselectable') },
    cartes: [...g.querySelectorAll('.carte')].map(c => ({ role: c.getAttribute('role'), label: c.getAttribute('aria-label'), sel: c.getAttribute('aria-selected'), cur: c.getAttribute('aria-current'), tab: c.tabIndex })),
    actif: document.activeElement?.getAttribute('aria-label'),
    aide: tr.querySelector('.trieuse-aide').textContent,
    bandeau: [...tr.querySelectorAll('.trieuse-tete button')].filter(b => !b.hidden && b.offsetParent).map(b => ({ txt: b.textContent, a: b.getAttribute('aria-label'), t: b.title })),
    compte: tr.querySelector('.trieuse-compte').textContent,
  }
})
console.log(JSON.stringify(aria, null, 1))

// Tab : l'ordre du focus
const tabs = []
for (let k = 0; k < 10; k++) {
  await page.keyboard.press('Tab'); await pause(30)
  tabs.push(await page.evaluate(() => { const a = document.activeElement; return (a?.tagName ?? '') + ':' + (a?.getAttribute('aria-label') ?? a?.textContent?.slice(0, 30)) }))
}
console.log('Tab :', tabs)
const stabs = []
for (let k = 0; k < 4; k++) {
  await page.keyboard.press('Shift+Tab'); await pause(30)
  stabs.push(await page.evaluate(() => { const a = document.activeElement; return (a?.tagName ?? '') + ':' + (a?.getAttribute('aria-label') ?? a?.textContent?.slice(0, 30)) }))
}
console.log('Maj+Tab :', stabs)
await fin()
