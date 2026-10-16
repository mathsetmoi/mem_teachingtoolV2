// Les huit fonds à l'écran : 10 %, 25 %, 100 %, 400 %, 2000 % (et des
// crans de transition) ; jamais un écran gris, un motif à tout zoom (sauf la
// page blanche) ; les lignes calées sur le monde quand on déplace la vue d'une
// fraction de pixel ; captures pour l'œil (sorties/ecran-*.png).
import { writeFileSync } from 'node:fs'
import { lancer, contexte, ouvrir, ok, note, fin, OUT, FONDS } from './lib/commun.mjs'

const nav = await lancer()
const ctx = await contexte(nav)
const P = await ouvrir(ctx)
await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.choisirOutil('selection'); a.selection.clear(); a.ui.maj() })

/** Pose la vue (x, y, z) et repeint tout de suite ; rend les mesures de la scène */
const MESURER = async ({ fond, x, y, z, png }) => {
  const a = window.__app
  if (a.fond !== fond) a.changerFond(fond)
  a.cam.x = x; a.cam.y = y; a.cam.z = z
  a.rendu.toutRedessiner()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = a.rendu.scene, k = c.width / c.clientWidth
  const g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data
  let lum = 0, blancs = 0, n = c.width * c.height, minLum = 255
  for (let i = 0; i < d.length; i += 4) {
    const L = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]
    lum += L; if (L < minLum) minLum = L
    if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) blancs++
  }
  // Une rangée de 400 × 250 px CSS au milieu, pour l'œil
  let b64 = null
  if (png) {
    const t = document.createElement('canvas'); t.width = 400 * k; t.height = 250 * k
    t.getContext('2d').drawImage(c, 400 * k, 250 * k, 400 * k, 250 * k, 0, 0, 400 * k, 250 * k)
    b64 = t.toDataURL('image/png').split(',')[1]
  }
  return { lum: Math.round(lum / n * 10) / 10, minLum: Math.round(minLum), blancs: Math.round(blancs / n * 1000) / 10, tousBlancs: blancs === n, k, b64 }
}

console.log('=== A. écran gris, motif présent ===')
const ZOOMS = [0.1, 0.13, 0.18, 0.25, 0.3, 0.4, 0.6, 1, 1.5, 2.5, 4, 8, 20]
const res = {}
for (const fond of FONDS) {
  res[fond] = {}
  for (const z of ZOOMS) {
    const m = await P.evaluate(MESURER, { fond, x: 123.37, y: 77.61, z, png: [0.1, 0.25, 1, 4, 20, 0.13, 0.6].includes(z) })
    if (m.b64) writeFileSync(`${OUT}/ecran-${fond}-${String(z).replace('.', '_')}.png`, Buffer.from(m.b64, 'base64'))
    delete m.b64
    res[fond][z] = m
  }
}
for (const fond of FONDS) {
  const gris = Object.entries(res[fond]).filter(([, m]) => m.lum < 225)
  ok(gris.length === 0, `A) ${fond} : jamais un écran gris (luminance moyenne ≥ 225) de 10 % à 2000 %`, res[fond])
  if (fond !== 'blanc') {
    const vides = Object.entries(res[fond]).filter(([, m]) => m.tousBlancs)
    ok(vides.length === 0, `A) ${fond} : un motif à chaque zoom (jamais la page toute blanche)`, vides.map(([z, m]) => [z, m.blancs]))
  }
  note(fond, Object.fromEntries(Object.entries(res[fond]).map(([z, m]) => [z, m.lum])))
}

console.log('=== B. calé sur le monde quand la vue bouge (fractions de pixel) ===')
// Pour chaque fond à carreaux, on cherche les colonnes sombres de la scène ;
// la ligne du monde x = k cm doit tomber à moins d'un pixel de round(x z + cam.x).
const LIGNES = async ({ fond, x, y, z, monde }) => {
  const a = window.__app
  if (a.fond !== fond) a.changerFond(fond)
  a.cam.x = x; a.cam.y = y; a.cam.z = z
  a.rendu.toutRedessiner()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = a.rendu.scene, k = c.width / c.clientWidth
  const g = c.getContext('2d')
  const ligne = g.getImageData(0, Math.round(300 * k), c.width, 1).data
  const lumAt = px => { const i = px * 4; return 0.2126 * ligne[i] + 0.7152 * ligne[i + 1] + 0.0722 * ligne[i + 2] }
  // Pour chaque x du monde attendu : la colonne la plus sombre à ±3 px de l'attendu
  return monde.map(wx => {
    const sx = (wx * z + x) * k
    let best = null, bl = 999
    for (let d = -3; d <= 3; d++) { const px = Math.floor(sx) + d; if (px < 0 || px >= c.width) continue; const L = lumAt(px); if (L < bl) { bl = L; best = px } }
    return { wx, attendu: Math.round(sx * 100) / 100, trouve: best, lum: Math.round(bl), ecart: best === null ? null : Math.round((best + 0.5 - sx) * 100) / 100 }
  })
}
for (const fond of ['grands-carreaux', 'carreaux', 'millimetre', 'repere', 'seyes']) {
  for (const z of [1, 2.5, 4]) {
    const decs = []
    for (const x of [100, 100.25, 100.5, 100.75, 101.3]) {
      const r = await P.evaluate(LIGNES, { fond, x, y: 50, z, monde: fond === 'seyes' ? [64, 96, 128, 160] : [80, 120, 160, 200] })
      decs.push(...r)
    }
    const mauvais = decs.filter(d => d.ecart === null || Math.abs(d.ecart) > 1 || d.lum > 245)
    ok(mauvais.length === 0, `B) ${fond} à ${z * 100} % : les lignes de 1 cm restent sur le monde à 1 px près quand la vue glisse d'une fraction de pixel`, mauvais.slice(0, 6))
  }
}
// Le papier pointé : le point (k cm, j cm) est sombre, la vue glissée
const POINTS = async ({ x, y, z }) => {
  const a = window.__app
  if (a.fond !== 'pointe') a.changerFond('pointe')
  a.cam.x = x; a.cam.y = y; a.cam.z = z
  a.rendu.toutRedessiner()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = a.rendu.scene, k = c.width / c.clientWidth, g = c.getContext('2d')
  const r = []
  for (const [wx, wy] of [[400, 400], [440, 400], [400, 440], [800, 200]]) {
    const sx = (wx * z + x) * k, sy = (wy * z + y) * k
    const d = g.getImageData(Math.floor(sx) - 2, Math.floor(sy) - 2, 5, 5).data
    let m = 255; for (let i = 0; i < d.length; i += 4) m = Math.min(m, 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2])
    r.push({ wx, wy, min: Math.round(m) })
  }
  return r
}
for (const z of [1, 4, 20]) for (const x of [10.5, 11.25, -3.7]) {
  const r = await P.evaluate(POINTS, { x, y: 7.3, z })
  ok(r.every(p => p.min < 200), `B) pointé à ${z * 100} %, vue en ${x} : un point sur chaque centimètre du monde`, r)
}
// Le réseau isométrique : sur l'oblique x = y/√3 (par l'origine) et sur
// l'horizontale y = 1 cm × √3/2
const ISO = async ({ x, y, z }) => {
  const a = window.__app
  if (a.fond !== 'iso') a.changerFond('iso')
  a.cam.x = x; a.cam.y = y; a.cam.z = z
  a.rendu.toutRedessiner()
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const c = a.rendu.scene, k = c.width / c.clientWidth, g = c.getContext('2d')
  const L = (sx, sy) => { const d = g.getImageData(Math.floor(sx) - 1, Math.floor(sy) - 1, 3, 3).data; let m = 255; for (let i = 0; i < d.length; i += 4) m = Math.min(m, 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]); return Math.round(m) }
  const r = []
  const H = 40 * Math.sqrt(3) / 2
  for (let j = 1; j <= 6; j++) {
    // Les sommets (k cm + j/2 cm, j × H) : trois droites s'y croisent
    const wx = 400 + (10 + j) * 20, wy = (10 + j) * H
    // un point sur l'oblique, à mi-chemin entre deux horizontales
    const wy2 = wy + H / 2, wx2 = wx + (H / 2) / Math.sqrt(3)
    r.push({ sommet: L((wx * z + x) * k, (wy * z + y) * k), oblique: L((wx2 * z + x) * k, (wy2 * z + y) * k), milieu: L(((wx + 20) * z + x) * k, ((wy + H / 2) * z + y) * k) })
  }
  return r
}
for (const z of [1, 4]) for (const x of [10.5, 11.25]) {
  const r = await P.evaluate(ISO, { x, y: 7.3, z })
  ok(r.every(p => p.sommet < 240 && p.oblique < 240), `B) isométrique à ${z * 100} %, vue en ${x} : les sommets et les obliques sur le réseau du monde (1 cm de côté)`, r)
}

console.log('=== C. contraste renforcé : plus marqué, jamais gris ===')
for (const fond of FONDS.filter(f => f !== 'blanc')) {
  const avant = await P.evaluate(MESURER, { fond, x: 123.37, y: 77.61, z: 1, png: true })
  await P.evaluate(() => { window.__app.rendu.contraste = true })
  const apres = await P.evaluate(MESURER, { fond, x: 123.37, y: 77.61, z: 1, png: true })
  const gris = []
  for (const z of ZOOMS) { const m = await P.evaluate(MESURER, { fond, x: 123.37, y: 77.61, z }); if (m.lum < 200) gris.push([z, m.lum]) }
  await P.evaluate(() => { window.__app.rendu.contraste = false })
  writeFileSync(`${OUT}/contraste-${fond}-avant.png`, Buffer.from(avant.b64, 'base64'))
  writeFileSync(`${OUT}/contraste-${fond}-apres.png`, Buffer.from(apres.b64, 'base64'))
  ok(apres.lum < avant.lum && gris.length === 0, `C) ${fond} : en contraste renforcé, plus sombre (${avant.lum} → ${apres.lum}), jamais sous 200 à aucun zoom`, gris)
}
await fin(nav)
