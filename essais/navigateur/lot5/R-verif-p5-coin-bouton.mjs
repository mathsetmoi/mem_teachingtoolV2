// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : un A4 portrait en 1366 × 657 : tirer le coin en haut à droite
// l'agrandit (le bouton « Fixer en fond » du message était dessus).
// Copie de retouches/verif/parcours/p5-coin-bouton.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 5 : un énoncé en A4 portrait importé ; le professeur l'agrandit
// par le coin en haut à droite, à la Wacom, juste après l'import.
import { D, ok, note, demarrer, contexte, ouvrir, trait, ecran, lire, pastille, rect, couvre, fabriquer, importer, glisser, fin } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const L = Number(process.argv[3] ?? 1366), H = Number(process.argv[4] ?? 657)
const IL = Number(process.argv[5] ?? 600), IH = Number(process.argv[6] ?? 850)
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const ctx = await contexte(nav, url, L, H)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const ptr = process.argv[7] === 'souris' ? souris : wacom
const b64 = await fabriquer(p, IL, IH)
await ptr.survol(L - 150, H - 60); await p.waitForTimeout(120)
await importer(p, ptr, 'bouton', b64)
await ptr.survol(L - 40, H - 30); await p.waitForTimeout(300)
const a = await lire(p), t = await rect(p, '.toast.visible'), btn = await rect(p, '.toast.visible button.action')
note('image, message, son bouton', { img: [a.x1, a.y1, a.x2, a.y2].map(Math.round), t, btn })
const tag = `p5-${LIEU}-${L}x${H}-${IL}x${IH}-${ptr.nom}`
await p.screenshot({ path: `${D}/${tag}-avant.png` })
const coin = { x: a.x2, y: a.y1 }
const el = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? (e.className || e.tagName) + ' ' + (e.textContent ?? '').slice(0, 20) : null }, coin)
note('sous le coin en haut à droite', el)
await glisser(p, ptr, coin, { x: coin.x + 60, y: coin.y - 40 })
await p.waitForTimeout(300)
const b = await lire(p), e = await ecran(p)
note('après le geste sur le coin', { aire: [a.aire, b.aire], img: [b.x1, b.y1, b.x2, b.y2].map(Math.round), outil: e.outil, toast: e.toast })
ok(b.aire > a.aire * 1.05 && !e.toast.includes('fixée'), `${tag} : tirer le coin en haut à droite l'agrandit`, { aire: [a.aire, b.aire], toast: e.toast })
await p.screenshot({ path: `${D}/${tag}-apres.png` })
await ctx.close()
await fin(nav, serveur)
