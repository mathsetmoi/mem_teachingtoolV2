import * as L from './lib/outils.mjs'
const ctx = await L.contexte({ viewport: { width: 1024, height: 768 } })
const { p } = await L.ouvrir(ctx, 'mm')
await p.evaluate(L.PAGE_NEUVE)
for (const f of ['millimetre', 'petits-carreaux', 'iso']) {
  const r = await p.evaluate(async f => {
    const a = window.__app; a.changerFond(f); a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj()
    await new Promise(r => setTimeout(r, 200))
    const cv = [...document.querySelectorAll('#zone canvas')]
    const out = { fond: a.fond, toile: [] }
    for (const c of cv) {
      const g = c.getContext('2d'); if (!g) continue
      const d = g.getImageData(0, 0, c.width, c.height).data
      const couleurs = new Map()
      for (let i = 0; i < d.length; i += 4 * 7) { if (d[i + 3] === 0) continue; const k = `${d[i]},${d[i + 1]},${d[i + 2]},${d[i + 3]}`; couleurs.set(k, (couleurs.get(k) || 0) + 1) }
      out.toile.push({ cls: c.className, top: [...couleurs].sort((a, b) => b[1] - a[1]).slice(0, 6) })
    }
    return out
  }, f)
  console.log(JSON.stringify(r))
}
await L.fin()
