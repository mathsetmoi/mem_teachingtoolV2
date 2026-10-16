// Le clic droit (le bouton latéral de la Wacom) sur le bouton du classeur et sur le bandeau
import { lancer, contexte, ouvrir, info, dort } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx, '', 'droit')
await p.evaluate(() => { window.__cm = []; document.addEventListener('contextmenu', e => window.__cm.push({ cible: e.target.className, empeche: e.defaultPrevented }), false); window.addEventListener('contextmenu', e => window.__cm.push({ fin: true, empeche: e.defaultPrevented }), false) })
const b = await p.locator('.bouton-classeur').boundingBox()
await p.mouse.click(b.x + 20, b.y + 20, { button: 'right' }); await dort(400)
info('clic droit sur le bouton du classeur', await p.evaluate(() => ({ cm: window.__cm, menus: [...document.querySelectorAll('.menu-flottant')].filter(x => !x.hidden).map(m => m.getAttribute('aria-label')), biblio: !document.querySelector('.bibliotheque').hidden, menuComplet: document.querySelector('.menu-partie, .panneau')?.hidden === false })))
await nav.close()
