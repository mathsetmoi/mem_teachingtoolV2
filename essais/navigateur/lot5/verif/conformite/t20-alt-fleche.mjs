// D3 : Alt + ← / ⌘ + ← ne doivent pas quitter MEM en plein cours. À l’écran, dans la revue (en classe), la trieuse.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p } = await O.ouvrir(ctx, 'alt')
await O.poser(p, O.trait(100, 100, 200)); await O.poser(p, O.trait(100, 200, 200))
await p.evaluate(() => { window.__prev = []; addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'g') setTimeout(() => window.__prev.push([e.key, e.altKey, e.ctrlKey, e.metaKey, e.defaultPrevented]), 0) }, true) })
const essai = async (nom) => {
  await p.evaluate(() => { window.__prev = [] })
  for (const k of ['Alt+ArrowLeft', 'Alt+ArrowRight', 'Control+g']) { await p.keyboard.press(k); await p.waitForTimeout(80) }
  const r = await p.evaluate(() => window.__prev)
  note(nom, r)
  return r
}
const r0 = await essai('à l’écran')
ok(r0.every(x => x[4]), 'À l’écran : Alt + ← / → et Ctrl + G empêchés', r0)
// la revue
await p.evaluate(() => window.__app.ui.ouvrirRevue?.(document.body) ?? null).catch(() => null)
let ouverte = await p.evaluate(() => !!document.querySelector('.revue') && getComputedStyle(document.querySelector('.revue')).display !== 'none')
if (!ouverte) { await p.locator('.barre-haut button[title^="Revoir la construction"]').click(); await p.waitForTimeout(800) }
ouverte = await p.evaluate(() => [...document.querySelectorAll('[class*=revue]')].some(e => e.getClientRects().length && e.getBoundingClientRect().width > 600))
note('revue ouverte', ouverte)
await p.screenshot({ path: C + '/captures/t20-revue.png' })
const r1 = await essai('dans la revue')
ok(r1.filter(x => x[1]).every(x => x[4]), 'Dans la revue : Alt + ← / → empêchés (sinon le navigateur revient à la page précédente)', r1)
await p.keyboard.press('Escape'); await p.waitForTimeout(400)
// la trieuse
await p.evaluate(() => window.__app.ui.ouvrirTrieuse()); await p.waitForTimeout(800)
const r2 = await essai('dans la trieuse')
ok(r2.filter(x => x[1]).every(x => x[4]), 'Dans la trieuse : Alt + ← / → empêchés', r2)
await p.keyboard.press('Escape'); await p.waitForTimeout(400)
await p.locator('.barre-haut button[title^="Automatismes"]').click(); await p.waitForTimeout(600)
note('séance ouverte', await p.evaluate(() => !document.querySelector('.seance').hidden))
const r3 = await essai('dans la séance d\'automatismes')
ok(r3.filter(x => x[1]).every(x => x[4]), 'Dans la séance d\'automatismes : Alt + ← / → empêchés', r3)
await O.fin()
