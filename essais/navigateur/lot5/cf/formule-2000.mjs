// Contrôle final du lot 5 : la formule tournée et agrandie est-elle nette à
// 2000 % ? (la sonde verif/affichage/formule-zoom.mjs cadrait, à 2000 %, un
// point de la formule tournée où il n'y a pas d'encre : on cadre ici le
// milieu d'un glyphe, mesuré dans le DOM, pour les deux formules)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import { chromium } from '../../commun/playwright.mjs'
import { mkdirSync, writeFileSync } from 'node:fs'
const D = `${RACINE_ESSAIS}/lot5/cf/formule`
mkdirSync(D, { recursive: true })   // (ses captures : ignorées par git)
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const nav = await chromium.launch()
const ana = await nav.newPage(); await ana.setContent('<body></body>')
await ana.evaluate(() => {
  window.nettete = async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d'); g.drawImage(im, 0, 0)
    const d = g.getImageData(0, 0, im.width, im.height).data, W = im.width, H = im.height
    const L = (x, y) => { const i = (y * W + x) * 4; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] }
    let s = 0, n = 0, inter = 0, plein = 0
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const gx = L(x + 1, y) - L(x - 1, y), gy = L(x, y + 1) - L(x, y - 1), m = Math.hypot(gx, gy)
      if (m > 30) { s += m; n++ }
      const l = L(x, y); if (l < 120) plein++; else if (l < 230) inter++
    }
    return { pente: n ? Math.round(s / n) : 0, bords: n, inter, plein }
  }
})
for (const dpr of [1, 2]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: dpr })
  await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  const P = await ctx.newPage()
  await P.goto('http://localhost:5173/')
  await P.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
  await P.waitForTimeout(500)
  await P.evaluate(async () => { window.__cadre = await import('/src/cadre.ts') })
  const ids = await P.evaluate(() => {
    const a = window.__app, t = a.tableau, C = window.__cadre
    a.reconnaissance = false; a.nouvellePage(); a.changerFond('blanc'); a.choisirOutil('stylo')
    const pose = f => { const id = 'z' + Math.random().toString(36).slice(2); t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, ...f }); return id }
    const droite = pose({ type: 'formule', x: 100, y: 100, latex: '\\frac{3}{7}x', couleur: '#1b2230', taille: 56 })
    const T = pose({ type: 'formule', x: 100, y: 300, latex: '\\frac{3}{7}x', couleur: '#1b2230', taille: 28 })
    const f = a.forme(T)
    a.transformerSelection(C.composer(C.rotation({ x: f.x, y: f.y }, Math.PI / 6), C.echelle({ x: f.x, y: f.y }, 2, 2)), [T])
    a.selection.clear(); a.ui.maj()
    return { droite, T }
  })
  for (const z of [1, 4, 20]) {
    const r = {}
    for (const [nom, id] of Object.entries(ids)) {
      // le milieu du « x » de la formule, lu dans le DOM, ramené dans le monde
      await P.evaluate(({ z }) => { const a = window.__app; a.cam.z = 1; a.cam.x = 0; a.cam.y = 0; a.rendu.toutRedessiner(); a.ui.maj() }, { z })
      await P.waitForTimeout(200)
      const w = await P.evaluate(id => {
        const a = window.__app, f = a.forme(id), zone = document.getElementById('zone').getBoundingClientRect()
        const els = [...document.querySelectorAll('.couche-formules .katex .mord.mathnormal')]
        // la formule dont la boîte contient le point (f.x, f.y) au plus près
        const s0 = a.cam.versEcran(f.x, f.y)
        const el = els.map(e => ({ e, b: e.getBoundingClientRect() })).sort((p, q) => Math.hypot(p.b.x - zone.left - s0.x, p.b.y - zone.top - s0.y) - Math.hypot(q.b.x - zone.left - s0.x, q.b.y - zone.top - s0.y))[0]
        const cx = el.b.x + el.b.width / 2 - zone.left, cy = el.b.y + el.b.height / 2 - zone.top
        return a.cam.versMonde(cx, cy)
      }, id)
      await P.evaluate(({ w, z }) => { const a = window.__app; a.cam.z = z; a.cam.x = 683 - w.x * z; a.cam.y = 384 - w.y * z; a.rendu.toutRedessiner(); a.ui.maj() }, { w, z })
      await P.mouse.move(1300, 100); await P.waitForTimeout(500)
      const buf = await P.screenshot({ clip: { x: 483, y: 234, width: 400, height: 300 } })
      writeFileSync(`${D}/dpr${dpr}-z${z}-${nom}.png`, buf)
      r[nom] = await ana.evaluate(b => window.nettete(b), buf.toString('base64'))
    }
    ok(r.T.plein > (z >= 4 ? 1000 : 30) && r.T.pente >= 0.6 * r.droite.pente, `densité ${dpr}, ${z * 100} % : sur un glyphe, la formule tournée et agrandie est aussi nette que la droite (pente ${r.T.pente} contre ${r.droite.pente})`, r)
  }
  await ctx.close()
}
await nav.close()
process.exit(echecs ? 1 : 0)
