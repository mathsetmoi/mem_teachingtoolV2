import { lancer, contexte, ouvrir, info, dort } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav)
const p = await ouvrir(ctx, '', 'droit')
await p.evaluate(() => { window.__cm = []; window.addEventListener('contextmenu', e => window.__cm.push(e.defaultPrevented), false) })
for (const s of ['.bouton-classeur', '.barre-haut .bouton.points', '.zoom-texte', '.barre-outils .bouton', '.rang', '.barre-classeur']) {
  const b = await p.locator(s).first().boundingBox()
  await p.evaluate(() => { window.__cm = [] })
  await p.mouse.click(b.x + b.width - 4, b.y + 6, { button: 'right' }); await dort(250)
  info(s, await p.evaluate(() => ({ empeche: window.__cm, menus: [...document.querySelectorAll('.menu-flottant')].filter(x => !x.hidden).map(m => m.getAttribute('aria-label')) })))
  await p.keyboard.press('Escape'); await dort(150)
}
await nav.close()
