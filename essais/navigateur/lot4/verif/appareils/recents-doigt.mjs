// Récents au doigt sur le téléphone : la rangée défile de côté, rien ne
// s'ouvre ; un toucher bref ouvre ; un appui long soulève la carte.
import { lancer, contexte, ouvrir, erreurs, info, ok, dort, creerPlusieurs, creerDossier } from './outils.mjs'
const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 844)
const nav = await lancer()
const ctx = await contexte(nav, { viewport: { width: W, height: H }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
const p = await ouvrir(ctx, '', 'recents')
await creerPlusieurs(p, 8, { prefixe: 'Leçon' })
await creerDossier(p, '5e B', { etiquette: '5e B' })
await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
await p.tap('.bouton-classeur'); await p.tap('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(500)
const cdp = await ctx.newCDPSession(p)
const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i })) })
const g = await p.evaluate(() => { const ul = document.querySelector('.grille-classeurs.recents'); const li = ul.querySelectorAll(':scope > li')[1]; const r = li.getBoundingClientRect(); return { sw: ul.scrollWidth, cw: ul.clientWidth, x: r.x + r.width / 2, y: r.y + 60, ta: getComputedStyle(li.querySelector('a')).touchAction, ul: getComputedStyle(ul).overflowX } })
info(`${W}×${H} Récents`, g)
const s0 = await p.evaluate(() => document.querySelector('.grille-classeurs.recents').scrollLeft)
await tp('touchStart', [{ x: g.x, y: g.y }])
for (let i = 1; i <= 12; i++) { await tp('touchMove', [{ x: g.x - i * 15, y: g.y + (i % 2) }]); await dort(16) }
await tp('touchEnd', []); await dort(600)
const s1 = await p.evaluate(() => ({ sl: document.querySelector('.grille-classeurs.recents').scrollLeft, url: location.search, ouvert: !document.querySelector('.bibliotheque').hidden, fantome: !!document.querySelector('.biblio-fantome') }))
ok(g.sw <= g.cw || (s1.sl > s0 + 50 && s1.ouvert && !s1.fantome), `${W}×${H} un glisser horizontal sur Récents la fait défiler de côté, rien ne s'ouvre`, { s0, s1 })
console.log('erreurs JS', erreurs)
await nav.close()
