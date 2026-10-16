// Sur Mac : les touches affichées des nouveautés (⌘), et ⌘ + G, ⌘ + ↑ qui agissent ; textes vus.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
await ctx.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'MacIntel' }) })
const { p } = await O.ouvrir(ctx, 'mac')
await p.evaluate(O.PAGE_NEUVE)
const T1 = await O.poser(p, O.trait(200, 200, 150)), T2 = await O.poser(p, O.trait(220, 210, 150))
await O.clicDroit(p, 275, 200)
await p.locator('.panneau-forme .ligne button.plus').click(); await p.waitForTimeout(150)
const mp = await p.evaluate(O.ENTREES, '.menu-plus')
note('⋯ sur Mac', mp.filter(e => e.t).map(e => [e.t, e.touche, e.aide]))
ok(mp.filter(e => e.touche).every(e => !/Ctrl/.test(e.touche)), 'Sur Mac, les touches de l\'ordre disent ⌘, pas Ctrl', mp.filter(e => e.touche).map(e => e.touche))
await p.keyboard.press('Escape'); await p.keyboard.press('Escape')
// le menu commun : titres de Grouper
await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.ui.maj() }, [T1, T2])
await O.clicDroit(p, 275, 200)
note('titre de Grouper sur Mac', await p.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].map(b => b.title).filter(t => /group/i.test(t))))
await p.keyboard.press('Escape')
await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.ui.maj() }, [T1, T2])
await p.keyboard.press('Meta+g'); await p.waitForTimeout(150)
ok((await p.evaluate(id => window.__app.forme(id).groupe, T1)) != null, '⌘ + G groupe sur Mac', (await O.msgs(p)).slice(-1))
// la gomme : titre ; le menu ⋯ du haut ; le bouton Grouper
note('titres sur Mac', await p.evaluate(() => [...document.querySelectorAll('.barre-outils button, .barre-haut button')].map(b => b.title).filter(t => /Ctrl/.test(t))))
await O.fin()
