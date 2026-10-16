// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : un clic de la Wacom sur ce coin ne fixe pas l'image en fond.
// Copie de retouches/verif/parcours/p5b-coin-clic.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Un simple clic de la Wacom sur le coin en haut à droite (1366 × 657, A4 portrait), juste après l'import
import { D, ok, note, demarrer, contexte, ouvrir, clic, ecran, lire, rect, fabriquer, importer, fin } from './R-verif/lib.mjs'
const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const ctx = await contexte(nav, url, 1366, 657)
const { p, wacom } = await ouvrir(ctx, url, LIEU)
const b64 = await fabriquer(p, 600, 850)
await wacom.survol(1200, 600); await p.waitForTimeout(120)
await importer(p, wacom, 'bouton', b64)
await wacom.survol(1320, 620); await p.waitForTimeout(300)
const a = await lire(p)
await clic(p, wacom, a.x2 - 2, a.y1 + 1)
await p.waitForTimeout(400)
const e = await ecran(p)
note('après un clic de la Wacom sur le coin en haut à droite', e)
ok(!e.toast.includes('fixée en fond'), 'un clic sur le coin ne fixe pas l\'image en fond', e.toast)
await p.screenshot({ path: `${D}/p5b-${LIEU}-clic-coin.png` })
await ctx.close(); await fin(nav, serveur)
