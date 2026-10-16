// Captures des quatre fonds nouveaux à plusieurs zooms (1024 × 768), sans et avec contraste
import * as L from './lib/outils.mjs'
const ctx = await L.contexte({ viewport: { width: 1024, height: 768 } })
const { p } = await L.ouvrir(ctx, 'fonds')
await p.evaluate(L.PAGE_NEUVE)
for (const f of ['grands-carreaux', 'millimetre', 'pointe', 'iso']) {
  for (const z of [0.25, 0.6, 1, 2.5]) {
    for (const c of [false, true]) {
      await p.evaluate(({ f, z, c }) => { const a = window.__app; a.changerFond(f); a.choisirContraste(c); a.cam.z = z; a.cam.x = 37; a.cam.y = 23; a.rendu.toutRedessiner(); a.ui.maj() }, { f, z, c })
      await L.attendre(150)
      await p.screenshot({ path: `${L.V}/captures/fond-${f}-${z}-${c ? 'c' : 'n'}.png`, clip: { x: 100, y: 100, width: 400, height: 300 } })
    }
  }
}
await p.evaluate(() => window.__app.choisirContraste(false))
await L.fin()
