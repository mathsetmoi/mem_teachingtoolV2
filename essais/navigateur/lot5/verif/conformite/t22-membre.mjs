// Un membre pris seul : son menu ; peut-on le sortir du groupe sans clavier (TNI, iPad) ?
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte({ viewport: { width: 1366, height: 1024 }, hasTouch: true, isMobile: true, screen: { width: 1024, height: 1366 } })
const { p } = await O.ouvrir(ctx, 'ipad')
await p.evaluate(O.PAGE_NEUVE)
const T1 = await O.poser(p, O.trait(200, 200, 150)), T2 = await O.poser(p, O.trait(200, 300, 150)), Tri = await O.poser(p, O.triangle(450, 150))
await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const i of ids) a.selection.add(i); a.grouper() }, [T1, T2, Tri])
await O.vider(p)
const tap = async (x, y) => { const s = await O.ecran(p, x, y); await p.touchscreen.tap(s.x, s.y); await p.waitForTimeout(450) }
await tap(275, 300)
note('premier toucher', await O.sel(p))
await tap(275, 300)
note('second toucher', await O.sel(p))
// son menu : appui long
const s = await O.ecran(p, 275, 300)
const cdp = await ctx.newCDPSession(p)
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: s.x, y: s.y, id: 1 }] }); await p.waitForTimeout(800)
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await p.waitForTimeout(300)
const e = await O.etat(p)
note('menu du membre (appui long)', e)
// la barre d'actions et Options
await O.vider(p); await tap(275, 300); await tap(275, 300)
note('barre d\'actions du membre seul', await p.evaluate(() => [...document.querySelectorAll('.barre-actions button')].filter(b => b.getClientRects().length).map(b => b.textContent.trim())))
const opt = p.locator('.barre-actions button', { hasText: 'Options' })
await p.waitForTimeout(400)
if (await opt.count()) { await opt.first().tap(); await p.waitForTimeout(300) }
const e2 = await O.etat(p)
note('menu par Options', e2)
const plus = p.locator('.panneau-forme .ligne button.plus')
if (await plus.count()) { await plus.tap(); await p.waitForTimeout(300); note('⋯', (await p.evaluate(O.ENTREES, '.menu-plus'))?.map(x => x.t ?? x.titre)) }
await p.screenshot({ path: C + '/captures/t22-membre.png' })
await O.fin()
