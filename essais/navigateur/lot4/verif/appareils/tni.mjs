// Le TNI (1920 × 1080, tactile, au doigt) : le bouton du classeur, un
// dossier, le fil d'Ariane, l'appui long puis glisser, le ⋯ d'une carte,
// « Déplacer vers… », un toucher qui ouvre ; rien hors de l'écran.
import { lancer, contexte, ouvrir, pret, erreurs, info, ok, dort, toasts, creerPlusieurs, creerDossier, DEBORDE, CAPTURES } from './outils.mjs'
const nav = await lancer()
const ctx = await contexte(nav, { viewport: { width: 1920, height: 1080 }, hasTouch: true })
const p = await ouvrir(ctx, '', 'tni')
const cdp = await ctx.newCDPSession(p)
const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i, radiusX: 12, radiusY: 12 })) })
const toucher = async (x, y, duree = 120) => { await tp('touchStart', [{ x, y }]); await dort(duree); await tp('touchEnd', []); await dort(400) }
const centre = s => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, s)
const d5 = await creerDossier(p, '5e B', { etiquette: '5e B' })
const ids = await creerPlusieurs(p, 5, { prefixe: 'Leçon' })
await p.evaluate(() => window.__registre.ecrireReglage('conseil', 'vu'))
let c = await centre('.bouton-classeur')
await toucher(c.x, c.y)
ok(await p.evaluate(() => !document.querySelector('.bibliotheque').hidden), 'TNI : un toucher sur le bouton du classeur ouvre la bibliothèque')
const sel = cle => `.grille-classeurs.tous li[data-cle="${cle}"]`
// Appui long puis glisser une carte sur « 5e B »
const a = await centre(sel(ids[1]) + ' .carte-apercu'), b = await centre(sel('d:' + d5))
await tp('touchStart', [{ x: a.x, y: a.y }]); await dort(650)
for (let i = 1; i <= 14; i++) { await tp('touchMove', [{ x: a.x + (b.x - a.x) * i / 14, y: a.y + (b.y - a.y) * i / 14 }]); await dort(16) }
await tp('touchEnd', []); await dort(600)
ok((await p.evaluate(id => window.__registre.classeur(id), ids[1])).dossier === d5, 'TNI : appui long puis glisser sur « 5e B » : déplacé', await toasts(p))
// Entrer dans « 5e B » au toucher, remonter par le fil d'Ariane
c = await centre(sel('d:' + d5)); await toucher(c.x, c.y)
info('TNI dans le dossier', await p.evaluate(() => [...document.querySelectorAll('.biblio-fil li')].map(l => l.textContent)))
c = await centre('.biblio-fil button[data-dossier=""]'); await toucher(c.x, c.y)
info('TNI remonté', await p.evaluate(() => [...document.querySelectorAll('.biblio-fil li')].map(l => l.textContent)))
// ⋯ d'une carte : le menu, « Déplacer vers… »
c = await centre(sel(ids[2]) + ' .options-classeur'); await toucher(c.x, c.y)
const m = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant')].some(x => !x.hidden))
ok(m, 'TNI : le ⋯ d\'une carte ouvre son menu')
c = await centre('.menu-flottant:not([hidden]) [data-action="deplacer"]'); await toucher(c.x, c.y)
const d = await p.evaluate(DEBORDE, 'dialog[open]')
ok(d.length === 0 && await p.evaluate(() => !!document.querySelector('dialog.dialogue-deplacer[open]')), 'TNI : « Déplacer vers… » s\'ouvre, dans l\'écran', d)
c = await centre(`dialog.dialogue-deplacer [data-dossier="${d5}"]`); await toucher(c.x, c.y)
ok((await p.evaluate(id => window.__registre.classeur(id), ids[2])).dossier === d5, 'TNI : un toucher sur « 5e B » dans la fenêtre : déplacé')
// Un toucher ouvre un classeur
await p.screenshot({ path: CAPTURES + 'tni-biblio.png' })
c = await centre(sel(ids[4]) + ' .carte-apercu')
await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), toucher(c.x, c.y)])
await pret(p); await dort(500)
ok(await p.evaluate(() => window.__app.classeur.nom) === 'Leçon 5', 'TNI : un toucher bref ouvre le classeur', await p.evaluate(() => location.search))
console.log('erreurs JS', erreurs)
await nav.close()
