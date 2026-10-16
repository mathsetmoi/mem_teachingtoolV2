// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : juste après l'import, le message ne couvre ni un coin du cadre,
// ni la pastille, ni la barre (le second défaut « important » du rapport parcours ;
// tailles réduites aux fenêtres de portable, où il était).
// Copie de retouches/verif/parcours/p4-toast.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 4 : juste après l'import, le message couvre-t-il un coin du cadre
// (ce dont il parle : « ses coins l'agrandissent »), la pastille, la barre ?
import { D, ok, note, demarrer, contexte, ouvrir, trait, ecran, lire, pastille, rect, couvre, disque, fabriquer, importer, fin } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
for (const [L, H] of (process.env.TAILLES ? JSON.parse(process.env.TAILLES) : [[1366, 768], [1366, 657], [1280, 689], [1280, 720], [1024, 768]])) {
  const ctx = await contexte(nav, url, L, H)
  const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
  for (const [il, ih] of [[900, 600], [600, 850], [1200, 400], [800, 800]]) for (const ptr of [wacom, souris]) {
    const b64 = await fabriquer(p, il, ih)
    await ptr.survol(L - 150, H - 60); await p.waitForTimeout(120)
    await importer(p, ptr, 'bouton', b64)
    await ptr.survol(L - 40, H - 30); await p.waitForTimeout(300)
    const a = await lire(p), q = await pastille(p), t = await rect(p, '.toast.visible'), b = await rect(p, '.barre-actions')
    const r = ptr === wacom ? 6 : 5
    const cs = [[a.x1, a.y1], [a.x2, a.y1], [a.x1, a.y2], [a.x2, a.y2]].map(([x, y]) => ({ l: x - r, r: x + r, t: y - r, b: y + r }))
    const sousToast = cs.map((c, i) => couvre(c, t) ? ['HG', 'HD', 'BG', 'BD'][i] : null).filter(Boolean)
    const btn = await rect(p, '.toast.visible button.action')
    const sousBouton = cs.map((c, i) => couvre(c, btn) ? ['HG', 'HD', 'BG', 'BD'][i] : null).filter(Boolean)
    const lab = `${L}×${H} image ${il}×${ih} ${ptr.nom}`
    ok(!sousToast.length, `${lab} : aucun coin sous le message`, { sousToast, sousBouton, img: [a.x1, a.y1, a.x2, a.y2].map(Math.round), toast: t, q: q && [Math.round(q.x), Math.round(q.y)] })
    ok(q && !couvre(t, disque(q)) && !couvre(t, b), `${lab} : message hors pastille et barre`)
    if (sousToast.length) await p.screenshot({ path: `${D}/p4-${LIEU}-${L}x${H}-${il}x${ih}-${ptr.nom}.png` })
    await p.keyboard.press('Control+z'); await p.waitForTimeout(250)
    await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(150)
  }
  await ctx.close()
}
await fin(nav, serveur)
