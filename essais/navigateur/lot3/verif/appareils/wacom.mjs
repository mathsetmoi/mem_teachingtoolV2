// La tablette graphique (stylet indirect, maxTouchPoints 0) : trieuse, bouton
// latéral, défilement au bord, menu de la page, « + » sur la dernière page.
import { ouvrir, preparer, etat, carte, centre, attendreOuverte, verifier, pause, fin, plumeCDP, D } from './lib.mjs'

const { ctx, page } = await ouvrir({}, 'wacom')
const cdp = await ctx.newCDPSession(page)
const plume = plumeCDP(cdp)
const P = await preparer(page, 40, { ici: 0 })
verifier('maxTouchPoints 0', (await page.evaluate(() => navigator.maxTouchPoints)) === 0)
async function clicPlume(x, y, bouton = 'left') {
  await plume('mouseMoved', x, y, false)
  await plume('mousePressed', x, y, true, bouton); await pause(40)
  await plume('mouseReleased', x, y, false, bouton); await pause(150)
}
// Ouvrir par le compteur, au stylet (survol puis appui)
const r = await centre(page, '.rang')
await clicPlume(r.x, r.y)
verifier('Stylet : le compteur ouvre la trieuse', await attendreOuverte(page))
await pause(400)
let e = await etat(page)
verifier('… l\'aide est celle de la souris', (await page.evaluate(() => document.querySelector('.trieuse-aide').textContent)).startsWith('Cliquer'))

// Survol : rien ne bouge
const c0 = await carte(page, 0), c2 = await carte(page, 2)
for (let k = 0; k <= 10; k++) await plume('mouseMoved', c0.x + (c2.x - c0.x) * k / 10, c0.y, false)
e = await etat(page)
verifier('Le survol au stylet ne tire rien', !e.fantome && JSON.stringify(e.pages) === JSON.stringify(P))

// Bouton latéral sur une vignette : le menu de la page
const c4 = await carte(page, 4)
await plume('mouseMoved', c4.x, c4.y, false)
await plume('mousePressed', c4.x, c4.y, true, 'right'); await pause(60)
await plume('mouseReleased', c4.x, c4.y, false, 'right'); await pause(200)
e = await etat(page)
verifier('Bouton latéral sur la vignette 5 : son menu, la trieuse reste, pas de navigation', e.ouverte && e.menu.includes('Page 5') && e.page === P[0], e.menu)
await page.keyboard.press('Escape'); await pause(100)
e = await etat(page)
verifier('Échap ferme le menu, pas la trieuse', e.ouverte && !e.menu.length, e.menu)

// Glisser au stylet vers le bas de la grille : défilement au bord, puis lâcher
const g = await centre(page, '.trieuse-grille')
const d0 = (await etat(page)).defilement
await plume('mouseMoved', c0.x, c0.y, false)
await plume('mousePressed', c0.x, c0.y, true)
for (let k = 1; k <= 10; k++) await plume('mouseMoved', c0.x, c0.y + (g.bottom - 8 - c0.y) * k / 10, true)
await pause(1500)
const d1 = (await etat(page)).defilement
// Continuer à bouger un peu plus bas que la grille (vers l'aide) : le défilement continue
await plume('mouseMoved', c0.x, g.bottom + 20, true); await pause(600)
const d2 = (await etat(page)).defilement
await plume('mouseMoved', c0.x, (g.top + g.bottom) / 2, true); await pause(200)
await plume('mouseReleased', c0.x, (g.top + g.bottom) / 2, false); await pause(200)
e = await etat(page)
const k = e.pages.indexOf(P[0])
const maxD = await page.evaluate(() => { const g = document.querySelector('.trieuse-grille'); return g.scrollHeight - g.clientHeight })
verifier(`Stylet (max ${maxD}) : la grille défile près du bord bas (${d0} → ${d1} → ${d2}) et la page 1 arrive plus loin (page ${k + 1})`, d1 > d0 + 200 && (d2 > d1 || d1 >= maxD - 1) && k > 8 && e.ouverte, { d0, d1, d2, k })
await page.keyboard.press('Control+z'); await pause(100)
verifier('Ctrl+Z dans la trieuse : l\'ordre revient', JSON.stringify((await etat(page)).pages) === JSON.stringify(P))

// Maj + clic au stylet (la main gauche sur le clavier) : choisir
await page.evaluate(() => { document.querySelector('.trieuse-grille').scrollTop = 0 }); await pause(100)
await page.keyboard.down('Shift')
const c1 = await carte(page, 1)
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: c1.x, y: c1.y, pointerType: 'pen', modifiers: 8 })
await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: c1.x, y: c1.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, modifiers: 8, force: 0.5 })
await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: c1.x, y: c1.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, modifiers: 8 })
await page.keyboard.up('Shift'); await pause(150)
e = await etat(page)
verifier('Maj + toucher de la plume : la page 2 est choisie, on reste dans la trieuse', e.ouverte && e.choisies.length === 1 && e.choisies[0] === P[1], { ch: e.choisies, ouverte: e.ouverte, page: P.indexOf(e.page) + 1, msgs: e.msgs.slice(-2) })
if (!e.ouverte) { await page.keyboard.press('Shift+P'); await attendreOuverte(page); await pause(300) }
if ((await etat(page)).choisies.length) { await page.keyboard.press('Escape'); await pause(80) }

// Aller à la page 40 au stylet (clic) : la trieuse se ferme, le second appui
// d'un double-toucher par habitude ne laisse rien
await page.keyboard.press('End'); await pause(150)
const cfin = await carte(page, 39)
await page.evaluate(() => window.__app.choisirOutil('stylo'))
const n0 = (await etat(page)).film
await clicPlume(cfin.x, cfin.y)
await plume('mousePressed', cfin.x, cfin.y, true); await pause(30); await plume('mouseReleased', cfin.x, cfin.y, false); await pause(300)
e = await etat(page)
verifier('Double appui de la plume sur la vignette 40 : on va à la page 40, rien d\'écrit', !e.ouverte && e.page === P[39] && e.n === 1, { n: e.n, page: P.indexOf(e.page) + 1 })
verifier('… l\'annonce du numéro paraît', e.annonce)
await page.screenshot({ path: D + '/wacom-annonce.png' })

// « + » sur la dernière page, à la plume, après la garde de 600 ms
await pause(800)
const apres = await centre(page, '[data-mode]')
const mode = await page.evaluate(() => document.querySelector('[data-mode]').dataset.mode)
await clicPlume(apres.x, apres.y)
e = await etat(page)
verifier(`« › » sur la dernière page (mode ${mode}), à la plume : une page 41 ajoutée, on y est, vue neutre`, mode === 'ajout' && e.pages.length === 41 && e.page === e.pages[40], { n: e.pages.length })

// Le menu de la page au bouton latéral, dans le vide du tableau
const z = await centre(page, '#zone')
await plume('mouseMoved', z.x, z.y, false)
await plume('mousePressed', z.x, z.y, true, 'right'); await pause(60)
await plume('mouseReleased', z.x, z.y, false, 'right'); await pause(200)
const menu = await page.evaluate(() => { const m = document.querySelector('.menu-flottant[aria-label="Page"]'); return m && !m.hidden ? [...m.querySelectorAll('.menu-item')].map(b => (b.querySelector('.libelle')?.firstChild?.textContent ?? '').trim() + (b.disabled || b.getAttribute('aria-disabled') === 'true' ? ' (grisée)' : '')) : null })
verifier('Bouton latéral dans le vide : le menu de la page (Copier la page en image et Exporter grisés sur la page vide)', menu && menu.includes('Copier la page en image (grisée)') && menu.includes('Exporter la page en PDF… (grisée)'), menu)
await page.keyboard.press('Escape')
await ctx.close()
await fin()
