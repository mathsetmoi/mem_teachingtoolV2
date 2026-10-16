// =============================================================
// LES IMAGES DU BANC
// planche.png : le direct et les replays, image par image, aux mêmes
//               instants τ (lettres B et o) ;
// courbes.png : la longueur dessinée en fonction du temps (mot entier).
// node visuel.mjs [mesures.json]
// =============================================================
import { chromium } from '../commun/playwright.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ICI, 'mesures.json'), 'utf8'))
const ids = d.direct.journal.traits.map(t => t.id)
const nT = ids.length

function decoder(frames, direct) {
  const out = []
  let masque = null
  for (const f of frames) {
    if (f.m) masque = f.m
    const lg = new Array(nT).fill(-1)
    const parId = new Map(f.traits.map(x => [x[0], x[1]]))
    ids.forEach((id, k) => { if (parId.has(id)) lg[k] = parId.get(id) })
    // le trait en cours (couche « direct ») : à l’écran, et au replay qui l'écrit comme à l’écran
    if (f.mon >= 0) { const k = lg.findIndex(v => v < 0); if (k >= 0) lg[k] = f.mon }
    out.push({ t: f.t, lg, m: masque, L: lg.reduce((a, v) => a + Math.max(0, v), 0), pageVide: !f.traits.some(x => ids.includes(x[0])) })
  }
  const vide = direct ? 0 : out.findIndex(o => o.pageVide)
  const i0 = out.findIndex((o, i) => i >= vide && o.lg.some(v => v >= 0))
  for (const o of out) o.tau = o.t - out[i0].t
  return out.slice(Math.max(0, vide, i0 - 1))
}
const runs = [
  ['Direct (à l’écran)', decoder(d.direct.enr.frames, true)],
  ['Élève (revoir.html, Normal)', decoder(d.eleve.frames, false)],
  ['Revue en classe, Normal', decoder(d.revues.normal.enr.frames, false)],
  ['Revue en classe, Rapide (allure d\'ouverture)', decoder(d.revues.rapide.enr.frames, false)],
]
const imageA = (p, tau) => { let m = null; for (const o of p) { if (o.tau > tau) break; m = o.m } return m }
const TAUS = Array.from({ length: 19 }, (_, i) => i * 100)
const planche = runs.map(([nom, p]) => ({ nom, images: TAUS.map(t => imageA(p, t)) }))
const courbes = runs.map(([nom, p]) => ({ nom, pts: p.filter(o => o.tau >= -50 && o.tau <= 10500).map(o => [o.tau, o.L]) }))
const LTOT = Math.max(...courbes[0].pts.map(p => p[1]))

const nav = await chromium.launch()
const page = await nav.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1 })
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 18px 20px; font: 13px system-ui, sans-serif; color: #1b2230; background: #fff; }
  h1 { font-size: 16px; margin: 0 0 4px; } p { margin: 0 0 12px; color: #555; }
  .ligne { display: flex; align-items: center; gap: 4px; margin-bottom: 4px; }
  .nom { width: 170px; flex: none; font-weight: 600; }
  canvas { border: 1px solid #e3e3e3; }
  .taus { display: flex; gap: 4px; margin-left: 174px; color: #777; }
  .taus span { width: 66px; text-align: center; }
</style></head><body><div id="r"></div></body></html>`)
await page.evaluate(({ planche, W, H, TAUS }) => {
  const r = document.getElementById('r')
  r.innerHTML = '<h1>Le mot « Bonjour » : lettres B et o, image par image (τ = 0 au premier trait)</h1><p>Chaque case montre l\'écran à l\'instant τ. Direct : le B se forme en 1,0 s (montant, levé, puis panse avec une pause au milieu). Replays (après la correction) : le même déroulé, au rythme de la main ; Rapide va trois fois plus vite.</p>'
  const t = document.createElement('div'); t.className = 'taus'; t.innerHTML = TAUS.map(x => `<span>${x} ms</span>`).join(''); r.append(t)
  // la zone des lettres B et o, dans le masque (2 px par unité, cadre x 170, y 220)
  const zx = 44, zy = 10, zl = 220, zh = 200
  for (const ligne of planche) {
    const div = document.createElement('div'); div.className = 'ligne'
    div.innerHTML = `<div class="nom">${ligne.nom}</div>`
    for (const b64 of ligne.images) {
      const c = document.createElement('canvas'); c.width = zl; c.height = zh; c.style.width = '66px'; c.style.height = '60px'
      const x = c.getContext('2d'), img = x.createImageData(zl, zh)
      const bits = b64 ? Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)) : null
      for (let yy = 0; yy < zh; yy++) for (let xx = 0; xx < zl; xx++) {
        const j = (zy + yy) * W + (zx + xx), on = bits && (bits[j >> 3] >> (j & 7)) & 1, o = 4 * (yy * zl + xx)
        img.data[o] = img.data[o + 1] = img.data[o + 2] = on ? 27 : 255; img.data[o + 3] = 255
      }
      x.putImageData(img, 0, 0); div.append(c)
    }
    r.append(div)
  }
}, { planche, W: d.direct.enr.W, H: d.direct.enr.H, TAUS })
const hauteur = await page.evaluate(() => document.body.scrollHeight)
await page.setViewportSize({ width: 1500, height: hauteur + 10 })
await page.screenshot({ path: path.join(ICI, 'planche.png') })

// ---------- Les courbes ----------
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  body { margin: 0; padding: 18px 20px; font: 13px system-ui, sans-serif; color: #1b2230; background: #fff; }
  h1 { font-size: 16px; margin: 0 0 4px; } p { margin: 0 0 8px; color: #555; }
  .leg { display: flex; gap: 18px; margin: 6px 0 4px; } .leg span::before { content: ''; display: inline-block; width: 18px; height: 3px; margin-right: 6px; vertical-align: middle; background: var(--c); border-radius: 2px; }
  text { font: 11px system-ui, sans-serif; fill: #666; }
</style></head><body><h1>Longueur d'encre dessinée en fonction du temps — « Bonjour » puis « été »</h1>
<p>Le direct monte en pente douce pendant chaque trait (vitesse variable, pauses) ; les replays (après la correction) suivent la même courbe ; Rapide la parcourt trois fois plus vite.</p>
<div class="leg" id="leg"></div><svg id="s" width="1440" height="470"></svg></body></html>`)
await page.evaluate(({ courbes, LTOT }) => {
  const couleurs = ['#1b2230', '#2a78d6', '#1baf7a', '#eb6834']
  const s = document.getElementById('s'), W = 1440, H = 470, g = { l: 56, r: 12, t: 10, b: 34 }
  const X = t => g.l + (t / 10500) * (W - g.l - g.r), Yv = v => H - g.b - (v / LTOT) * (H - g.t - g.b)
  let html = ''
  for (let t = 0; t <= 10000; t += 1000) html += `<line x1="${X(t)}" x2="${X(t)}" y1="${g.t}" y2="${H - g.b}" stroke="#eee"/><text x="${X(t)}" y="${H - 14}" text-anchor="middle">${t / 1000} s</text>`
  for (let v = 0; v <= 1; v += 0.25) html += `<line x1="${g.l}" x2="${W - g.r}" y1="${Yv(v * LTOT)}" y2="${Yv(v * LTOT)}" stroke="#eee"/><text x="${g.l - 6}" y="${Yv(v * LTOT) + 4}" text-anchor="end">${Math.round(v * 100)} %</text>`
  courbes.forEach((c, i) => {
    let dd = ''
    let prev = null
    for (const [t, v] of c.pts) { dd += (prev === null ? `M${X(t).toFixed(1)},${Yv(v).toFixed(1)}` : `H${X(t).toFixed(1)}V${Yv(v).toFixed(1)}`); prev = v }
    html += `<path d="${dd}" fill="none" stroke="${couleurs[i]}" stroke-width="2" stroke-linejoin="round"/>`
  })
  s.innerHTML = html
  document.getElementById('leg').innerHTML = courbes.map((c, i) => `<span style="--c:${couleurs[i]}">${c.nom}</span>`).join('')
}, { courbes, LTOT })
await page.screenshot({ path: path.join(ICI, 'courbes.png'), fullPage: true })
await nav.close()
console.log('planche.png, courbes.png')
