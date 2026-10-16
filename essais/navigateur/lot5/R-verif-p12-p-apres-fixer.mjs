// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : après « Fixer en fond », P puis un trait : de l'encre.
// Copie de retouches/verif/parcours/p12-p-apres-fixer.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Après « Fixer en fond » (le bouton du message, à la Wacom), la touche P rend-elle le Stylo ?
import { ok, note, demarrer, contexte, ouvrir, clicSur, trait, ecran, lire, fabriquer, importer, fin } from './R-verif/lib.mjs'
const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const ctx = await contexte(nav, url, 1366, 768)
const { p, wacom } = await ouvrir(ctx, url, LIEU)
const b64 = await fabriquer(p)
await importer(p, wacom, 'bouton', b64)
await clicSur(p, wacom, '.toast.visible button.action'); await p.waitForTimeout(300)
note('focus', await p.evaluate(() => document.activeElement?.className + ' ' + document.activeElement?.textContent?.slice(0, 20)))
await p.keyboard.press('p'); await p.waitForTimeout(200)
const e = await ecran(p), a = await lire(p)
await trait(p, wacom, a.cx - 100, a.cy, a.cx + 100, a.cy + 10)
const b = await lire(p)
ok(e.outil === 'stylo' && b.encre > a.encre + 20, 'après Fixer en fond, P puis un trait : de l\'encre', { outil: e.outil, a: a.encre, b: b.encre })
await ctx.close(); await fin(nav, serveur)
