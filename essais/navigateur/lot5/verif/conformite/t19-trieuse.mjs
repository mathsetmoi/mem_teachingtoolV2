// Point 6 : les vignettes de la trieuse montrent les fonds nouveaux ; le menu d'une carte ; « Nouveau classeur ».
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p } = await O.ouvrir(ctx, 'trieuse')
for (const f of ['grands-carreaux', 'millimetre', 'pointe', 'iso']) {
  await p.evaluate(f => { const a = window.__app; a.nouvellePage(); a.changerFond(f) }, f)
  await O.poser(p, O.trait(100, 100, 200))
}
await p.evaluate(() => window.__app.ui.ouvrirTrieuse()); await p.waitForTimeout(1200)
await p.screenshot({ path: C + '/captures/t19-trieuse.png' })
// le menu d'une carte (clic droit sur la dernière)
const cartes = p.locator('.trieuse [role=option], .trieuse .carte, .carte-page')
note('cartes', await cartes.count())
const der = cartes.last()
await der.click({ button: 'right' }); await p.waitForTimeout(300)
note('menu de la carte', await p.evaluate(() => [...document.querySelectorAll('[role=menu]')].filter(m => !m.hidden && m.getClientRects().length).map(m => ({ label: m.getAttribute('aria-label'), items: [...m.querySelectorAll('[role^=menuitem]')].map(i => [i.getAttribute('role'), i.textContent.trim().slice(0, 30), i.getAttribute('aria-checked')]) }))))
await p.screenshot({ path: C + '/captures/t19-menu-carte.png' })
await O.fin()
