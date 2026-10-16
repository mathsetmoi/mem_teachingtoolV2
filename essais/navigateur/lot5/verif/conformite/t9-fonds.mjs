// Point 6 : les fonds nouveaux à plusieurs zooms (captures), la fenêtre « Exporter en PDF » (la case du fond),
// et le choix par le menu à vignettes.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const ctx = await O.contexte()
const { p } = await O.ouvrir(ctx, 'fonds')
const fonds = ['grands-carreaux', 'millimetre', 'pointe', 'iso']
for (const f of fonds) {
  for (const z of [0.1, 0.3, 1, 4, 20]) {
    await p.evaluate(({ f, z }) => { const a = window.__app; if (a.fond !== f) a.changerFond(f); a.cam.z = z; a.cam.x = 100; a.cam.y = 100; a.rendu.toutRedessiner(); a.ui.maj() }, { f, z })
    await p.waitForTimeout(150)
    const lum = await p.evaluate(() => { const c = window.__app.rendu.scene ?? document.querySelector('canvas'); const g = c.getContext('2d'); const d = g.getImageData(c.width * 0.3, c.height * 0.3, c.width * 0.4, c.height * 0.4).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; return Math.round(s / (d.length / 4)) })
    note(`${f} à ${z * 100} % : fond « ${await p.evaluate(() => window.__app.fond)} », luminance moyenne`, lum)
    await p.screenshot({ path: C + `/captures/t9-${f}-${z * 100}.png`, clip: { x: 300, y: 200, width: 400, height: 300 } })
  }
}
// La fenêtre « Exporter en PDF »
await p.keyboard.press('Control+p'); await p.waitForTimeout(500)
note('fenêtre PDF : cases', await p.evaluate(() => [...document.querySelectorAll('dialog[open] label')].map(l => l.textContent.trim())))
await p.screenshot({ path: C + '/captures/t9-pdf.png' })
await p.keyboard.press('Escape')
await O.fin()
