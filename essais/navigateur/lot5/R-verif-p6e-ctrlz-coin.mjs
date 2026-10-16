// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : agrandir par un coin, Ctrl+Z, puis le même coin : il agrandit
// encore (la sélection reste après Ctrl+Z d'une transformation).
// Copie de retouches/verif/parcours/p6e-ctrlz-coin.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Agrandir par un coin, Ctrl+Z, puis le même coin encore (souris et Wacom, ordinateur)
import { ok, note, demarrer, contexte, ouvrir, ecran, lire, fabriquer, importer, glisser, pastille, fin } from './R-verif/lib.mjs'
const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const ctx = await contexte(nav, url, 1366, 768)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const b64 = await fabriquer(p)
for (const ptr of [souris, wacom]) {
  await importer(p, ptr, 'bouton', b64)
  const a = await lire(p)
  await glisser(p, ptr, { x: a.x2, y: a.y2 }, { x: a.x2 + 60, y: a.y2 + 40 })
  const b = await lire(p)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
  const c = await lire(p)
  await glisser(p, ptr, { x: c.x2, y: c.y2 }, { x: c.x2 + 30, y: c.y2 + 20 })
  const d = await lire(p)
  ok(d.aire > c.aire * 1.05, `${ptr.nom} : coin (×${(b.aire / a.aire).toFixed(2)}), Ctrl+Z, puis le même coin : ×${(d.aire / c.aire).toFixed(2)}, centre déplacé de (${(d.cx - c.cx).toFixed(0)}, ${(d.cy - c.cy).toFixed(0)})`)
  for (let i = 0; i < 5 && (await lire(p)).aire > 0; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(250) }
  await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(150)
}
await ctx.close(); await fin(nav, serveur)
