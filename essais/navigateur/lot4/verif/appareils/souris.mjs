// La bibliothèque à la souris, 1366 × 768, comme un professeur : le bouton,
// Nouveau classeur, écrire, Nouveau dossier, glisser, clic droit,
// Ctrl / Maj / Alt / milieu + clic, double-clic, Précédent.
import { lancer, contexte, ouvrir, pret, erreurs, info, ok, dort, toasts, CAPTURES, norm } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx, '', 'souris')
const etatBouton = () => p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); return { nom: b.querySelector('.nom-classeur')?.textContent, etat: b.querySelector('.etat-classeur')?.textContent, point: !b.querySelector('.point-etat').hidden, vis: b.getClientRects().length > 0, titre: document.title } })
info('au départ', await etatBouton())

// 1. Le bouton ouvre la bibliothèque (clic de souris réel)
await p.click('.bouton-classeur')
await p.waitForSelector('.bibliotheque:not([hidden])')
await dort(300)
info('ouverte, focus', await p.evaluate(() => document.activeElement?.className + ' ' + (document.activeElement?.getAttribute('aria-label') || '')))
// 2. Nouveau classeur
await p.click('[data-action="nouveau-classeur"]')
await p.waitForSelector('dialog.dialogue-nouveau[open]')
const dlg = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-nouveau[open]'); const r = d.getBoundingClientRect(); return { r: r.toJSON(), focus: document.activeElement?.name, val: document.activeElement?.value, cle: !!d.querySelector('input[name=cle]') } })
info('fenêtre Nouveau classeur', dlg)
// Un clic dans la marge intérieure de la fenêtre (10 px du bord gauche)
await p.keyboard.type('Symétrie centrale')
await p.mouse.click(dlg.r.x + 8, dlg.r.y + dlg.r.height / 2)
await dort(200)
const encore = await p.evaluate(() => !!document.querySelector('dialog.dialogue-nouveau[open]'))
ok(encore, 'Un clic DANS la fenêtre « Nouveau classeur » (sa marge intérieure, à 8 px du bord) ne la ferme pas', { encore })
if (!encore) {
  await p.click('[data-action="nouveau-classeur"]'); await p.waitForSelector('dialog.dialogue-nouveau[open]')
  await p.keyboard.type('Symétrie centrale')
}
await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog.dialogue-nouveau [data-a="creer"]')])
await pret(p); await dort(500)
info('arrivée', { url: await p.evaluate(() => location.search), bouton: await etatBouton(), toasts: await toasts(p) })

// 3. Écrire à la souris (Stylo est l'outil par défaut ?)
const outil = await p.evaluate(() => window.__app.outil)
info('outil', outil)
const zone = await p.evaluate(() => document.getElementById('zone').getBoundingClientRect().toJSON())
for (let k = 0; k < 3; k++) {
  await p.mouse.move(500 + k * 30, 300); await p.mouse.down()
  for (let i = 0; i < 10; i++) await p.mouse.move(500 + k * 30 + i * 8, 300 + i * 5)
  await p.mouse.up(); await dort(100)
}
await dort(500)
info('formes', await p.evaluate(() => window.__app.formes.length))
info('bouton après écriture', await etatBouton())

// 4. Nouveau dossier « 5e B »
await p.click('.bouton-classeur'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
await p.click('[data-action="nouveau-dossier"]')
await p.waitForSelector('dialog.dialogue-dossier[open]')
await p.keyboard.type('5e B')
info('case classe', await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-dossier[open]'); const c = [...d.querySelectorAll('input[type=checkbox]')].map(x => ({ c: x.checked, l: (x.closest('label')?.textContent || '').replace(/[  ]/g, ' ') })); return c }))
await p.keyboard.press('Enter')
await dort(500)
info('après dossier', { toasts: await toasts(p), cartes: await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].map(l => l.dataset.cle + ':' + (l.querySelector('.carte-nom-classeur, .carte-nom-dossier')?.textContent))) })
await p.screenshot({ path: CAPTURES + 'souris-biblio.png' })

// 5. Glisser « Symétrie centrale » sur « 5e B » (de Récents ? de la grille)
const ids = await p.evaluate(() => ({ ici: window.__app.classeur.id, dossier: [...document.querySelectorAll('.grille-classeurs.tous > li')].find(l => l.dataset.cle.startsWith('d:'))?.dataset.cle }))
const cSym = `.grille-classeurs.tous li[data-cle="${ids.ici}"]`, cDos = `.grille-classeurs.tous li[data-cle="${ids.dossier}"]`
const a = await p.locator(cSym).boundingBox(), b = await p.locator(cDos).boundingBox()
info('boîtes', { a, b })
await p.mouse.move(a.x + a.width / 2, a.y + 40); await p.mouse.down()
for (let i = 1; i <= 15; i++) { await p.mouse.move(a.x + a.width / 2 + (b.x + b.width / 2 - a.x - a.width / 2) * i / 15, a.y + 40 + (b.y + b.height / 2 - a.y - 40) * i / 15); await dort(16) }
await p.mouse.up(); await dort(600)
const f1 = await p.evaluate(id => window.__registre.classeur(id), ids.ici)
ok(f1.dossier === ids.dossier.slice(2), 'Glissé à la souris sur « 5e B » : il y est', { dossier: f1.dossier, toasts: await toasts(p), url: await p.evaluate(() => location.search) })
info('bouton après déplacement (étiquette ?)', await etatBouton())

// 6. Clic droit sur la carte du dossier : le menu là où l'on a cliqué
const bd = await p.locator(cDos).boundingBox()
await p.mouse.click(bd.x + 40, bd.y + 40, { button: 'right' }); await dort(200)
const m = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m && { r: m.getBoundingClientRect().toJSON(), entrees: [...m.querySelectorAll('.menu-item')].map(e => e.dataset.action), focus: document.activeElement?.dataset?.action } })
info('menu au clic droit (dossier)', { m, clic: { x: bd.x + 40, y: bd.y + 40 } })
await p.keyboard.press('Escape'); await dort(150)
info('après Échap', await p.evaluate(() => ({ menu: [...document.querySelectorAll('.menu-flottant')].some(x => !x.hidden), biblio: !document.querySelector('.bibliotheque').hidden, focus: document.activeElement?.closest('li')?.dataset.cle })))

// 7. Entrer dans le dossier au clic, puis Récents ? Ctrl + clic sur une carte
await p.click(cDos); await dort(400)
info('dans le dossier', await p.evaluate(() => ({ fil: [...document.querySelectorAll('.biblio-fil li')].map(l => l.textContent), cartes: [...document.querySelectorAll('.grille-classeurs.tous > li')].map(l => l.dataset.cle) })))
await p.keyboard.press('Backspace'); await dort(300)
const premier = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].find(l => !l.dataset.cle.startsWith('d:'))?.dataset.cle)
info('premier', premier)
const cPrem = `.grille-classeurs.tous li[data-cle="${premier}"] .carte-apercu`
// Ctrl + clic : un autre onglet
let pages0 = ctx.pages().length
await p.click(cPrem, { modifiers: ['Control'] }); await dort(1500)
info('Ctrl + clic', { onglets: ctx.pages().length - pages0, url: await p.evaluate(() => location.search), biblio: await p.evaluate(() => !document.querySelector('.bibliotheque').hidden) })
for (const x of ctx.pages().slice(1)) await x.close()
// Maj + clic : une autre fenêtre
pages0 = ctx.pages().length
await p.click(cPrem, { modifiers: ['Shift'] }); await dort(1500)
info('Maj + clic', { onglets: ctx.pages().length - pages0, url: await p.evaluate(() => location.search), biblio: await p.evaluate(() => !document.querySelector('.bibliotheque').hidden) })
for (const x of ctx.pages().slice(1)) await x.close()
// Clic du milieu
pages0 = ctx.pages().length
await p.click(cPrem, { button: 'middle' }); await dort(1500)
info('clic du milieu', { onglets: ctx.pages().length - pages0, url: await p.evaluate(() => location.search) })
for (const x of ctx.pages().slice(1)) await x.close()
// Alt + clic
let dl = null; p.once('download', d => { dl = d.suggestedFilename() })
await p.click(cPrem, { modifiers: ['Alt'] }); await dort(1500)
info('Alt + clic', { dl, url: await p.evaluate(() => location.search), biblio: await p.evaluate(() => !document.querySelector('.bibliotheque').hidden) })

// 8. Double-clic sur une carte (pas sur le nom) : un seul départ
const nav0 = []
p.on('framenavigated', f => { if (f === p.mainFrame()) nav0.push(f.url()) })
await p.dblclick(cPrem); await dort(200)
await pret(p); await dort(800)
info('double-clic', { navigations: nav0, url: await p.evaluate(() => location.search), nom: await p.evaluate(() => window.__app?.classeur?.nom), formes: await p.evaluate(() => window.__app?.formes.length), toasts: await toasts(p) })
// 9. Précédent
await p.goBack(); await pret(p); await dort(500)
info('Précédent', { url: await p.evaluate(() => location.search), nom: await p.evaluate(() => window.__app?.classeur?.nom), formes: await p.evaluate(() => window.__app?.formes.length) })
console.log('erreurs JS', erreurs)
await nav.close()
