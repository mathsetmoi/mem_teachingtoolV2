// Le téléphone (et les petits écrans) : rien hors de l'écran, au doigt,
// avec les réglages par défaut (la copie sur le Drive voulue, en ligne).
// node telephone.mjs [largeur hauteur]
import { lancer, contexte, ouvrir, pret, erreurs, info, ok, dort, toasts, CAPTURES, creerPlusieurs, creerDossier, DEBORDE, ecrireTraits } from './outils.mjs'
const W = +(process.argv[2] ?? 390), H = +(process.argv[3] ?? 844)
const nav = await lancer()
const ctx = await contexte(nav, { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const p = await ouvrir(ctx, '', 'tel')
const cdp = await ctx.newCDPSession(p)
const tp = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: q.id ?? i })) })
const doigt = async (x0, y0, x1, y1, o = {}) => {
  await tp('touchStart', [{ x: x0, y: y0 }])
  if (o.tenir) await dort(o.tenir)
  const n = o.pas ?? 12
  for (let i = 1; i <= n; i++) { await tp('touchMove', [{ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n }]); await dort(o.lent ?? 16) }
  if (o.pendant) await o.pendant()
  await tp('touchEnd', [])
  await p.waitForTimeout(500)
}
const tap = async (s) => { await p.tap(s); await dort(300) }
const deb = async (nom, racine) => { const d = await p.evaluate(DEBORDE, racine ?? null); ok(d.length === 0, `${W}×${H} ${nom} : rien hors de l'écran`, d); await p.screenshot({ path: CAPTURES + `tel-${W}x${H}-${nom}.png` }) }
const T = `${W}×${H}`
await ecrireTraits(p, 5)
await dort(500)
// Le tableau
const bout = await p.evaluate(() => { const b = document.querySelector('.bouton-classeur'); const r = b.getBoundingClientRect(); const plus = document.querySelector('[aria-haspopup="menu"][data-action="fichier"], .bouton-fichier') ; return { forme: window.__app.ui.formeClasseur, vis: b.getClientRects().length > 0, r: r.toJSON(), etat: b.querySelector('.etat-classeur')?.textContent, point: !b.querySelector('.point-etat').hidden } })
info(`${T} le bouton du classeur`, bout)
await deb('tableau')
// Ouvrir la bibliothèque : par le bouton s'il est là, sinon par ⋯
if (bout.vis) { await tap('.bouton-classeur'); await tap('.menu-seances [data-action="bibliotheque"]') }
else { await p.evaluate(() => window.__app.ui.boutonFichier.click()); await dort(300); await tap('.menu-flottant:not([hidden]) [data-action="bibliotheque"]') }
await p.waitForSelector('.bibliotheque:not([hidden])'); await dort(300)
await deb('bibliotheque-vide')
// Un dossier par l'interface
await tap('[data-action="nouveau-dossier"]')
await p.waitForSelector('dialog.dialogue-dossier[open]')
await deb('nouveau-dossier', 'dialog.dialogue-dossier[open]')
await p.keyboard.type('5e B')
await tap('dialog.dialogue-dossier[open] button[type=submit]')
const ids = await creerPlusieurs(p, 8, { prefixe: 'Leçon' })
await p.evaluate(() => window.__bibliotheque.charger()); await dort(400)
await deb('bibliotheque-pleine')
const d5 = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].find(l => l.dataset.cle.startsWith('d:')).dataset.cle)
const sel = cle => `.grille-classeurs.tous li[data-cle="${cle}"]`
// Appui long puis glisser, avec la mise en page par défaut
await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 }); await dort(100)
const geo = await p.evaluate(({ a, b }) => { const r = s => document.querySelector(s).getBoundingClientRect().toJSON(); const c = document.querySelector('.biblio-corps').getBoundingClientRect().toJSON(); return { a: r(a), b: r(b), corps: c } }, { a: sel(ids[2]), b: sel(d5) })
info(`${T} géométrie (carte, dossier, grille)`, geo)
// La carte la plus proche visible
const visible = await p.evaluate(() => { const c = document.querySelector('.biblio-corps').getBoundingClientRect(); return [...document.querySelectorAll('.grille-classeurs.tous > li')].filter(l => !l.dataset.cle.startsWith('d:')).map(l => ({ cle: l.dataset.cle, r: l.getBoundingClientRect().toJSON() })).find(x => x.r.top > c.top + 80 && x.r.bottom < c.bottom - 20) })
const dos = await p.evaluate(s => document.querySelector(s).getBoundingClientRect().toJSON(), sel(d5))
let pendant = null
if (visible && dos.top > 0) {
  await doigt(visible.r.x + visible.r.width / 2, visible.r.y + 40, dos.x + dos.width / 2, dos.y + dos.height / 2, { tenir: 650, pendant: async () => { pendant = await p.evaluate(() => ({ fantome: !!document.querySelector('.biblio-fantome'), scroll: document.querySelector('.biblio-corps').scrollTop, sous: [...document.querySelectorAll('.cible-sous')].map(x => x.dataset.cle ?? x.textContent) })) } })
  const f = await p.evaluate(id => window.__registre.classeur(id), visible.cle)
  ok(f.dossier === d5.slice(2), `${T} appui long puis glisser sur « 5e B » (réglages par défaut) : déplacé`, { pendant, dossier: f.dossier, t: await toasts(p) })
} else info(`${T} pas de carte visible pour l'appui long`, { visible, dos })
// Un toucher bref ouvre ? (sur une carte), un glisser vertical fait défiler
await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 }); await dort(100)
const s0 = await p.evaluate(() => document.querySelector('.biblio-corps').scrollTop)
const c4 = await p.evaluate(s => document.querySelector(s).getBoundingClientRect().toJSON(), sel(ids[4]))
const yy = Math.min(c4.y + 40, H - 120)
await doigt(c4.x + 60, yy, c4.x + 60, yy - 250)
const s1 = await p.evaluate(() => ({ s: document.querySelector('.biblio-corps').scrollTop, url: location.search, ouvert: !document.querySelector('.bibliotheque').hidden }))
ok(s1.s > s0 + 50 && s1.ouvert, `${T} un glisser du doigt fait défiler la grille, n'ouvre rien`, s1)
// Le ⋯ d'une carte : le menu dans l'écran
await p.evaluate(() => { document.querySelector('.biblio-corps').scrollTop = 0 }); await dort(100)
const premiere = await p.evaluate(() => [...document.querySelectorAll('.grille-classeurs.tous > li')].find(l => !l.dataset.cle.startsWith('d:')).dataset.cle)
await tap(sel(premiere) + ' .options-classeur')
await deb('menu-carte', '.menu-flottant:not([hidden])')
await tap('.menu-flottant:not([hidden]) [data-action="etiquettes"]')
await p.waitForSelector('dialog.dialogue-etiquettes[open]').catch(() => null)
await deb('etiquettes', 'dialog[open]')
await p.keyboard.press('Escape'); await dort(300)
await tap(sel(premiere) + ' .options-classeur')
await tap('.menu-flottant:not([hidden]) [data-action="deplacer"]')
await deb('deplacer', 'dialog[open]')
await p.keyboard.press('Escape'); await dort(300)
// Nouveau classeur (la fenêtre)
await tap('[data-action="nouveau-classeur"]')
await deb('nouveau-classeur', 'dialog[open]')
await p.keyboard.press('Escape'); await dort(300)
// Le menu ⋯ du bandeau, puis « Récupérer une sauvegarde du Drive… »
await tap('[data-action="menu-bibliotheque"]')
await deb('menu-bandeau', '.menu-flottant:not([hidden])')
const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(e => e.dataset.action))
info(`${T} menu du bandeau`, entrees)
if (entrees.includes('recuperer-drive')) { await tap('.menu-flottant:not([hidden]) [data-action="recuperer-drive"]'); await deb('recuperer', 'dialog[open]'); await p.keyboard.press('Escape'); await dort(300) }
else await p.keyboard.press('Escape')
// La corbeille : supprimer un classeur, la vue
await tap(sel(premiere) + ' .options-classeur')
await tap('.menu-flottant:not([hidden]) [data-action="supprimer"]')
await dort(300)
await tap('[data-action="corbeille"]')
await deb('corbeille')
const bouts = await p.evaluate(() => [...document.querySelectorAll('.biblio-vue-corbeille button')].filter(b => b.getClientRects().length).map(b => ({ t: b.textContent.trim().slice(0, 30), h: Math.round(b.getBoundingClientRect().height), w: Math.round(b.getBoundingClientRect().width) })))
info(`${T} boutons de la corbeille`, bouts)
await p.keyboard.press('Escape'); await dort(300)
// Fermer la bibliothèque : le tableau, son menu ⋯ (« Autres sauvegardes… », lot 18)
await p.evaluate(() => window.__bibliotheque.fermer()); await dort(300)
await p.evaluate(() => window.__app.ui.boutonFichier.click()); await dort(300)
await deb('menu-fichier', '.menu-flottant:not([hidden])')
const m2 = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].map(e => e.dataset.action))
info(`${T} menu ⋯ du tableau`, m2)
if (m2.includes('autres-sauvegardes')) { await tap('.menu-flottant:not([hidden]) [data-action="autres-sauvegardes"]'); await deb('autres-sauvegardes', 'dialog[open]'); await p.keyboard.press('Escape'); await dort(300) }
console.log('erreurs JS', erreurs)
await nav.close()
