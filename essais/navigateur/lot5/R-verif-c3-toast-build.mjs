// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : le message placé hors de la pastille et de la barre, version construite.
// Copie de retouches/verif/conformite/c3-toast-build.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// B2 : sur ordinateur, le message de l'import ne couvre ni la pastille ↻ ni la
// barre d'actions (ni le menu complet), à plusieurs tailles d'écran et zooms.
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, lire, pastille, rect, couvre, fabriquer, importer } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()
const url = URLS.ligne
const disqueP = q => q && { l: q.x - (Math.sqrt(q.aire / Math.PI) + 3), r: q.x + (Math.sqrt(q.aire / Math.PI) + 3), t: q.y - (Math.sqrt(q.aire / Math.PI) + 3), b: q.y + (Math.sqrt(q.aire / Math.PI) + 3) }
const molette = async (p, x, y, n) => { await p.mouse.move(x, y); await p.keyboard.down('Control'); for (let i = 0; i < Math.abs(n); i++) { await p.mouse.wheel(0, n > 0 ? -100 : 100); await p.waitForTimeout(40) } await p.keyboard.up('Control'); await p.waitForTimeout(400) }

for (const [l, h] of [[1024, 768], [1280, 720], [1366, 768], [1920, 1080], [1280, 1024]]) {
  for (const forme of [[900, 600], [600, 900], [1600, 300]]) {
    const ctx = await contexte(nav, url, l, h)
    const { p, souris, wacom } = await ouvrir(ctx, url, `${l}x${h}`)
    const b64 = await fabriquer(p, ...forme)
    await wacom.survol(l / 2, h / 2)
    await importer(p, wacom, 'bouton', b64)
    let q = await pastille(p), tr = await rect(p, '.toast.visible'), br = await rect(p, '.barre-actions')
    ok(tr && q && !couvre(tr, br) && !couvre(tr, disqueP(q)), `${l}×${h}, image ${forme.join('×')} : le message évite barre et pastille`, { tr, br, q })
    if (!(tr && q && !couvre(tr, br) && !couvre(tr, disqueP(q)))) await p.screenshot({ path: `${D}/c3-${l}x${h}-${forme.join('x')}.png` })
    // zoomer après l'import (le message est encore là)
    const img = await lire(p)
    await molette(p, img.cx, img.cy, 4)
    const z = (await ecran(p)).zoom
    q = await pastille(p); tr = await rect(p, '.toast.visible'); br = await rect(p, '.barre-actions')
    ok(!tr || ((!q || !couvre(tr, disqueP(q))) && !couvre(tr, br)), `${l}×${h}, image ${forme.join('×')}, zoomée à ${z} : le message évite barre et pastille`, { tr, br, q })
    if (tr && ((q && couvre(tr, disqueP(q))) || couvre(tr, br))) await p.screenshot({ path: `${D}/c3-${l}x${h}-${forme.join('x')}-zoom.png` })
    // le menu complet ouvert (clic droit), le message encore là
    await souris.clicDroit(img.cx, img.cy + 20); await p.waitForTimeout(400)
    tr = await rect(p, '.toast.visible'); const pn = await rect(p, '.panneau-forme')
    ok(!tr || !couvre(tr, pn), `${l}×${h}, image ${forme.join('×')} : le message évite le menu complet`, { tr, pn })
    await ctx.close()
  }
}
await fin(nav, serveur)
