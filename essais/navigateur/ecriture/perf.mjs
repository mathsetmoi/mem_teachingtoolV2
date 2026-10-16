// =============================================================
// LE COÛT D'UNE IMAGE DU LECTEUR, SUR UN « TÉLÉPHONE »
// Un film chargé (le mot du banc recopié en grille : ~1000 traits),
// ouvert dans revoir.html sur un écran de téléphone (412 × 915, dpr 2),
// processeur ralenti 4× (émulation Chrome). On mesure :
//  - aujourd'hui : pendant qu'un trait se dessine, CHAQUE image repeint
//    toute la scène (fond + toutes les formes) ;
//  - la proposition : la scène ne bouge pas, seul le trait en cours est
//    peint sur la couche « direct », comme à l’écran.
// node perf.mjs [mesures.json]
// =============================================================
import { chromium } from '../commun/playwright.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ICI, 'mesures.json'), 'utf8'))
const base = d.exporte.film
const COPIES = Number(process.env.COPIES || 60)

// Le film chargé : le mot recopié en grille (6 colonnes), chaque copie à la suite
const etapes = []
for (let c = 0; c < COPIES; c++) {
  const dx = (c % 6) * 320, dy = Math.floor(c / 6) * 220
  for (const e of base.etapes) etapes.push({ ...e, o: e.o.map(o => o[0] === '=' ? ['=', { ...o[1], id: o[1].id + '_' + c, x: o[1].x + dx, y: o[1].y + dy }] : o) })
}
const film = { ...base, etapes }
const { gzipSync } = await import('node:zlib')
const texte = JSON.stringify({ format: 'mem-revoir', v: 1, titre: 'Perf', date: base.date, gz: gzipSync(JSON.stringify(film)).toString('base64') })

const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/revoir.html')
await page.waitForSelector('input[type=file]', { state: 'attached' })
await page.setInputFiles('input[type=file]', { name: 'perf.mem', mimeType: 'application/json', buffer: Buffer.from(texte) })
await page.waitForFunction(() => window.__revoir?.bobine)
await page.waitForTimeout(800)
const cdp = await ctx.newCDPSession(page)
const resultats = {}
for (const ralenti of [1, 4]) {
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: ralenti })
  const r = await page.evaluate(async () => {
    const R = window.__revoir.rendu, b = window.__revoir.bobine
    const { cheminDuTrait } = await import('/src/rendu.ts')
    const { esquisse } = await import('/src/revoir/esquisse.ts')
    const mesurer = (f, n = 40) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); f(); t.push(performance.now() - a) } t.sort((x, y) => x - y); return { med: t[t.length >> 1], p90: t[Math.floor(t.length * 0.9)] } }
    const img = b.image(b.n - 1)
    const dernier = img.formes.filter(f => f.type === 'trait').reduce((a, f) => !a || f.pts.length > a.pts.length ? f : a, null)
    // Aujourd'hui : une image = toute la scène, avec le trait partiel au milieu des autres
    let u = 0
    const scene = mesurer(() => {
      u = (u + 0.037) % 1
      R.formes = img.formes.map(f => f.id === dernier.id ? esquisse(f, u) : f)
      R.peindreScene()
    })
    // Proposition : la scène est déjà peinte ; seule la couche du trait en cours bouge
    R.formes = img.formes.filter(f => f.id !== dernier.id); R.peindreScene()
    const direct = mesurer(() => {
      u = (u + 0.037) % 1
      const n = Math.max(1, Math.round(u * dernier.pts.length / 3))
      const pts = []
      for (let i = 0; i < n; i++) pts.push(dernier.pts[3 * i] + dernier.x, dernier.pts[3 * i + 1] + dernier.y, dernier.pts[3 * i + 2])
      R.monTrait = { pts, couleur: dernier.couleur, taille: dernier.taille, opacite: dernier.opacite, pression: dernier.pression }
      R.peindreDirect()
    })
    R.monTrait = null
    const contour = mesurer(() => cheminDuTrait(dernier, true), 200)
    return { formes: img.formes.length, pointsDuTrait: dernier.pts.length / 3, scene, direct, contour, ecran: [R.l, R.h, R.dpr] }
  })
  resultats[ralenti] = r
  console.log(`processeur ×${ralenti} : ${r.formes} formes à l'écran (${r.ecran[0]}×${r.ecran[1]}, dpr ${r.ecran[2]})`)
  console.log(`  aujourd'hui, une image de tracé = toute la scène : médian ${r.scene.med.toFixed(2)} ms, p90 ${r.scene.p90.toFixed(2)} ms`)
  console.log(`  proposition, couche direct seule              : médian ${r.direct.med.toFixed(2)} ms, p90 ${r.direct.p90.toFixed(2)} ms`)
  console.log(`  (contour perfect-freehand d'un trait de ${r.pointsDuTrait} points : ${r.contour.med.toFixed(3)} ms)`)
}
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
fs.writeFileSync(path.join(ICI, 'perf.json'), JSON.stringify(resultats, null, 1))
await nav.close()
