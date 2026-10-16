// Au téléphone (avec un clavier Bluetooth, ou un lecteur d'écran) : « Autres outils », « Couleur », « Plus » au clavier ; aria.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })
const { p } = await O.ouvrir(ctx, 'tel')
const actif = () => p.evaluate(() => { const e = document.activeElement; return e && { role: e.getAttribute('role'), txt: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), checked: e.getAttribute('aria-checked'), dis: e.getAttribute('aria-disabled') } })
for (const nom of ['Autres outils', 'Couleur']) {
  const b = p.locator(`.barre-outils button[aria-label^="${nom}"]`)
  note(nom + ' : bouton', await b.evaluate(b => ({ aria: b.getAttribute('aria-label'), pop: b.getAttribute('aria-haspopup'), exp: b.getAttribute('aria-expanded'), title: b.title })))
  await b.focus(); await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  note(nom + ' : focus à l\'ouverture', await actif())
  const m = await p.evaluate(() => { const m = [...document.querySelectorAll('[role=menu]')].find(m => !m.hidden && m.getClientRects().length); return m && { label: m.getAttribute('aria-label'), items: [...m.querySelectorAll('[role^=menuitem]')].map(i => [i.getAttribute('role'), (i.getAttribute('aria-label') || i.textContent).trim().slice(0, 25), i.getAttribute('aria-checked'), i.getAttribute('aria-disabled')]) } })
  note(nom + ' : menu', m)
  await p.keyboard.press('ArrowDown'); await p.waitForTimeout(60); note('↓', await actif())
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(60); note('→', await actif())
  await p.keyboard.press('Escape'); await p.waitForTimeout(150); note('Échap : focus', await actif())
}
await O.fin()
