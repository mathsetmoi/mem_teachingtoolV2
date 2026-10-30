// La tablette graphique Wacom SANS écran (pointerType 'pen' indirect, bouton
// latéral = clic droit, maxTouchPoints 0), par CDP : le bouton du classeur,
// la bibliothèque (toucher, tremblement, bouton latéral, glisser, double
// toucher sur le nom), les fenêtres.
import { lancer, contexte, ouvrir, pret, erreurs, info, ok, dort, toasts, CAPTURES, creerPlusieurs, creerDossier } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx, '', 'wacom')
const cdp = await ctx.newCDPSession(p)
const stylo = (type, x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen', button: o.button ?? (type === 'mouseMoved' ? 'none' : 'left'), buttons: o.buttons ?? (type === 'mouseReleased' ? 0 : type === 'mouseMoved' ? 0 : 1), clickCount: o.clickCount ?? 1, force: type === 'mouseReleased' ? 0 : 0.5 })
async function toucher(x, y, o = {}) {
  // survol, puis le toucher, avec un léger tremblement (o.tremble px)
  await stylo('mouseMoved', x - 20, y - 10); await dort(16)
  await stylo('mouseMoved', x, y); await dort(16)
  await stylo('mousePressed', x, y, { button: o.button ?? 'left', buttons: o.button === 'right' ? 2 : 1, clickCount: o.clickCount ?? 1 })
  if (o.tremble) { await stylo('mouseMoved', x + o.tremble, y + 1, { button: 'none', buttons: o.button === 'right' ? 2 : 1 }); await dort(16) }
  await dort(o.duree ?? 60)
  await stylo('mouseReleased', x + (o.tremble ?? 0), y + (o.tremble ? 1 : 0), { button: o.button ?? 'left', clickCount: o.clickCount ?? 1 })
  await stylo('mouseMoved', x + 30, y + 30); await dort(16)
}
const centre = async s => { const b = await p.locator(s).boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b } }
info('maxTouchPoints', await p.evaluate(() => navigator.maxTouchPoints))
const d5b = await creerDossier(p, '5e B', { etiquette: '5e B' })
const [c1, c2, c3] = await creerPlusieurs(p, 3, { noms: ['Pythagore', 'Thalès', 'Vecteurs'] })
const ici = await p.evaluate(() => window.__app.classeur.id)

// A. Le bouton du classeur au stylet
let c = await centre('.bouton-classeur')
await toucher(c.x, c.y, { tremble: 2 })
await dort(300)
// (Le menu du classeur, 30 octobre 2026 : « Bibliothèque des classeurs » en bas)
c = await centre('.menu-seances [data-action="bibliotheque"]')
await toucher(c.x, c.y, { tremble: 2 })
await dort(400)
ok(await p.evaluate(() => !document.querySelector('.bibliotheque').hidden), 'A) Un toucher de la plume sur le bouton du classeur, puis sur « Bibliothèque des classeurs », ouvre la bibliothèque')
const sel = cle => `.grille-classeurs.tous li[data-cle="${cle}"]`
// B. Bouton latéral sur une carte : le menu, qui reste ouvert après le lever et le contextmenu
c = await centre(sel(c2) + ' .carte-apercu')
await toucher(c.x, c.y, { button: 'right' })
await dort(200)
let menu = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); return m ? [...m.querySelectorAll('.menu-item')].map(e => e.dataset.action) : null })
ok(menu && menu.includes('renommer'), 'B) Le bouton latéral (clic droit) sur une carte : son menu', menu)
// Toucher « Renommer… » à la plume
const ren = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); const e = m?.querySelector('[data-action="renommer"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } })
if (ren) { await toucher(ren.x, ren.y, { tremble: 2 }); await dort(300) }
const saisie = await p.evaluate(() => { const i = document.querySelector('.carte-saisie'); return i ? { v: i.value, focus: document.activeElement === i, sel: [i.selectionStart, i.selectionEnd] } : null })
ok(saisie?.focus, '   … « Renommer… » touché à la plume : le champ, prérempli, a le focus', saisie)
await p.keyboard.press('Control+a'); await p.keyboard.type('Thalès 4e'); await p.keyboard.press('Enter'); await dort(400)
ok((await p.evaluate(id => window.__registre.classeur(id), c2)).nom === 'Thalès 4e', '   … Entrée : renommé', await toasts(p))

// C. Un toucher avec un tremblement de 4 px ouvre ; de 7 px (glisser) n'ouvre rien
c = await centre(sel(c1) + ' .carte-apercu')
await toucher(c.x, c.y, { tremble: 7 })
await dort(800)
info('C) toucher + 7 px', { url: await p.evaluate(() => location.search), ouvert: await p.evaluate(() => !document.querySelector('.bibliotheque').hidden), toasts: await toasts(p) })
// D. Le glisser à la plume vers « 5e B »
const a = await centre(sel(c3) + ' .carte-apercu'), dos = await centre(sel('d:' + d5b))
await stylo('mouseMoved', a.x, a.y); await stylo('mousePressed', a.x, a.y)
for (let i = 1; i <= 15; i++) { await stylo('mouseMoved', a.x + (dos.x - a.x) * i / 15, a.y + (dos.y - a.y) * i / 15, { buttons: 1 }); await dort(16) }
await stylo('mouseReleased', dos.x, dos.y); await stylo('mouseMoved', dos.x + 40, dos.y + 40)
await dort(600)
ok((await p.evaluate(id => window.__registre.classeur(id), c3)).dossier === d5b, 'D) Glisser à la plume sur « 5e B » : il y est ; rien ne s\'est ouvert', { url: await p.evaluate(() => location.search), t: await toasts(p) })
// E. Double toucher sur le nom : renommer
c = await centre(sel(c1) + ' .carte-nom-classeur')
await stylo('mouseMoved', c.x, c.y)
await stylo('mousePressed', c.x, c.y, { clickCount: 1 }); await dort(40); await stylo('mouseReleased', c.x, c.y, { clickCount: 1 })
await dort(120)
await stylo('mousePressed', c.x + 2, c.y + 1, { clickCount: 2 }); await dort(40); await stylo('mouseReleased', c.x + 2, c.y + 1, { clickCount: 2 })
await dort(600)
const s2 = await p.evaluate(() => { const i = document.querySelector('.carte-saisie'); return i ? { v: i.value, focus: document.activeElement === i } : null })
ok(s2?.focus && (await p.evaluate(() => location.search)) === '?classeur=' + ici, 'E) Double toucher sur le nom, à la plume : le champ de renommage, rien ne s\'ouvre', { s2, url: await p.evaluate(() => location.search) })
await p.keyboard.press('Escape'); await dort(200)
// F. Gomme de la plume (button 5, buttons 32) : rien
await p.evaluate(sel => {
  const el = document.querySelector(sel); const r = el.getBoundingClientRect(); const x = r.x + r.width / 2, y = r.y + r.height / 2
  const o = { bubbles: true, cancelable: true, composed: true, pointerId: 9, pointerType: 'pen', isPrimary: true, clientX: x, clientY: y, button: 5, buttons: 32, pressure: 0.5 }
  el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', { ...o, buttons: 0 }))
}, sel(c1) + ' .carte-apercu')
await dort(400)
info('F) gomme sur une carte', { url: await p.evaluate(() => location.search), menu: await p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].some(x => !x.hidden)) })
// G. Nouveau dossier à la plume : la couleur, Créer
c = await centre('[data-action="nouveau-dossier"]')
await toucher(c.x, c.y, { tremble: 1 }); await dort(400)
await p.keyboard.type('Géométrie')
const rouge = await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-dossier[open]'); const r = [...d.querySelectorAll('input[type=radio]')]; const x = r.find(i => /rouge/i.test(i.closest('label')?.textContent + (i.getAttribute('aria-label') || '') + (i.title || ''))) ?? r[5]; const b = (x.closest('label') ?? x).getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, n: r.length } })
await toucher(rouge.x, rouge.y, { tremble: 2 }); await dort(200)
info('G) couleur choisie', await p.evaluate(() => { const d = document.querySelector('dialog.dialogue-dossier[open]'); return d ? [...d.querySelectorAll('input[type=radio]')].findIndex(i => i.checked) : 'fenêtre fermée' }))
c = await centre('dialog.dialogue-dossier[open] button[type=submit], dialog.dialogue-dossier[open] [data-a="creer"]')
await toucher(c.x, c.y, { tremble: 2 }); await dort(500)
info('   … créé', await toasts(p))
// H. Ouvrir un classeur à la plume (toucher simple)
c = await centre(sel(c1) + ' .carte-apercu')
await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), toucher(c.x, c.y, { tremble: 3 })])
await pret(p); await dort(500)
ok(await p.evaluate(() => window.__app.classeur.nom) === 'Pythagore', 'H) Un toucher à la plume (3 px de tremblement) ouvre le classeur', await p.evaluate(() => location.search))
info('formes posées sur le classeur à l\'arrivée', await p.evaluate(() => window.__app.formes.length))
console.log('erreurs JS', erreurs)
await nav.close()
