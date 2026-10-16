// =============================================================
// L'ANALYSE : LE DIRECT CONTRE LES REPLAYS
// node analyse.mjs [mesures.json]
// Tout est ramené à τ = 0 au premier instant où de l'encre paraît.
// =============================================================
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ICI, 'mesures.json'), 'utf8'))
const J = d.direct.journal
const ids = J.traits.map(t => t.id)
const nT = ids.length
const longueurPts = (pts, x = 0, y = 0) => { let l = 0; for (let i = 3; i + 2 < pts.length; i += 3) l += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2]); return l }
const finales = J.traits.map(t => longueurPts(t.pose.pts))
const LTOT = finales.reduce((a, b) => a + b, 0)

// ---------- Chaque passage : par image, la longueur dessinée de chaque trait ----------
function decoder(frames, direct) {
  const out = []
  let masque = null
  for (const f of frames) {
    if (f.m) masque = f.m
    const lg = new Array(nT).fill(-1)                  // -1 : absent
    const parId = new Map(f.traits.map(x => [x[0], x[1]]))
    ids.forEach((id, k) => { if (parId.has(id)) lg[k] = parId.get(id) })
    // le trait en cours (couche « direct ») : à l’écran, et au replay qui l'écrit comme à l’écran
    if (f.mon >= 0) { const k = lg.findIndex(v => v < 0); if (k >= 0) lg[k] = f.mon }
    out.push({ t: f.t, lg, encre: f.encre, m: masque, pageVide: !f.traits.some(x => ids.includes(x[0])) })
  }
  // τ = 0 : le premier trait paraît
  // un replay s'ouvre sur l'affiche (tout est là) : on part de la page vide
  const vide = direct ? 0 : out.findIndex(o => o.pageVide)
  const i0 = out.findIndex((o, i) => i >= vide && o.lg.some(v => v >= 0))
  const t0 = out[i0].t
  for (const o of out) o.tau = o.t - t0
  return out.slice(Math.max(0, vide, i0 - 1))
}

const passages = {
  direct: decoder(d.direct.enr.frames, true),
  eleve: decoder(d.eleve.frames, false),
  revueNormale: decoder(d.revues.normal.enr.frames, false),
  revueRapide: decoder(d.revues.rapide.enr.frames, false),
}

// ---------- Par trait : début, fin, durée ; levers entre traits ----------
function chronologie(p) {
  return ids.map((_, k) => {
    const deb = p.find(o => o.lg[k] >= 0)
    const fin = p.find(o => o.lg[k] >= finales[k] - 0.05)
    return { debut: deb?.tau ?? NaN, fin: fin?.tau ?? NaN, duree: (fin?.tau ?? NaN) - (deb?.tau ?? NaN) }
  })
}
const chrono = Object.fromEntries(Object.entries(passages).map(([n, p]) => [n, chronologie(p)]))
// La vérité du direct, au point près (temps des événements, pas des images)
const T0 = J.traits[0].bas
const vrai = J.traits.map(t => ({ debut: t.bas - T0, fin: t.haut - T0, duree: t.haut - t.bas }))

const f0 = x => Number.isFinite(x) ? x.toFixed(0) : '—'
const lettres = d.ecrits.map(e => e.lettre + (e.rang ? "'" : ''))
console.log('\n=== 1. CHRONOLOGIE DES TRAITS (ms, τ = 0 au premier trait) ===')
console.log('trait  long. | direct : début  durée  lever-avant | élève : début  durée  lever-avant | revue N : début durée lever | revue R : début durée')
for (let k = 0; k < nT; k++) {
  const lv = (c, k) => k ? c[k].debut - c[k - 1].fin : NaN
  const D = chrono.direct, E = chrono.eleve, N = chrono.revueNormale, R = chrono.revueRapide
  console.log(`${String(k).padStart(2)} ${lettres[k].padEnd(3)} ${finales[k].toFixed(0).padStart(4)} | ${f0(D[k].debut).padStart(6)} ${f0(D[k].duree).padStart(6)} ${f0(lv(D, k)).padStart(6)}      | ${f0(E[k].debut).padStart(6)} ${f0(E[k].duree).padStart(6)} ${f0(lv(E, k)).padStart(6)}     | ${f0(N[k].debut).padStart(6)} ${f0(N[k].duree).padStart(5)} ${f0(lv(N, k)).padStart(5)} | ${f0(R[k].debut).padStart(6)} ${f0(R[k].duree).padStart(5)}`)
}
const somme = a => a.reduce((x, y) => x + y, 0)
const resume = {}
for (const [n, c] of Object.entries(chrono)) {
  const dur = c.map(x => x.duree), lev = c.slice(1).map((x, k) => x.debut - c[k].fin)
  const fin = c[nT - 1].fin
  resume[n] = { total: fin, traceTotal: somme(dur), leveTotal: somme(lev), traceMoyen: somme(dur) / nT,
    vitesseMoy: LTOT / somme(dur) }
}
console.log('\n=== 2. BILAN ===')
for (const [n, r] of Object.entries(resume)) {
  console.log(`${n.padEnd(13)} premier trait → dernier fini ${f0(r.total).padStart(6)} ms | stylo posé ${f0(r.traceTotal).padStart(5)} ms (${(100 * r.traceTotal / r.total).toFixed(0)} %) | stylo levé ${f0(r.leveTotal).padStart(5)} ms | vitesse de plume moyenne ${r.vitesseMoy.toFixed(2)} u/ms`)
}

// Durée de chaque trait : rapport replay / direct
console.log('\n=== 3. DURÉE DU TRACÉ D\'UN TRAIT : replay / direct ===')
for (const n of ['eleve', 'revueNormale', 'revueRapide']) {
  const r = chrono[n].map((c, k) => c.duree / chrono.direct[k].duree)
  const s = [...r].sort((a, b) => a - b)
  console.log(`${n.padEnd(13)} rapport médian ${s[s.length >> 1].toFixed(2)}  min ${s[0].toFixed(2)}  max ${s[s.length - 1].toFixed(2)}`)
}

// ---------- 4. Décalage : quand chaque longueur est atteinte ----------
function totalA(p) { return p.map(o => ({ tau: o.tau, L: o.lg.reduce((a, v) => a + Math.max(0, v), 0) })) }
function quandAtteint(c, l) { const o = c.find(x => x.L >= l - 1e-6); return o ? o.tau : NaN }
console.log('\n=== 4. RETARD DU REPLAY SUR LE DIRECT, à longueur égale (ms) ===')
const cd = totalA(passages.direct)
for (const n of ['eleve', 'revueNormale', 'revueRapide']) {
  const cr = totalA(passages[n])
  const ecarts = []
  for (let i = 1; i <= 200; i++) { const l = LTOT * i / 200; ecarts.push(quandAtteint(cr, l) - quandAtteint(cd, l)) }
  const s = ecarts.filter(Number.isFinite).sort((a, b) => a - b)
  console.log(`${n.padEnd(13)} médian ${f0(s[s.length >> 1])}  min ${f0(s[0])}  max ${f0(s[s.length - 1])}  |moyen| ${f0(somme(s.map(Math.abs)) / s.length)}`)
}
// Écart de la longueur dessinée au même instant, en % du mot
console.log('\n=== 5. AU MÊME INSTANT τ, ÉCART DE LONGUEUR DESSINÉE (en % du mot entier) ===')
const valeurA = (c, tau) => { let v = 0; for (const o of c) { if (o.tau > tau) break; v = o.L } return v }
for (const n of ['eleve', 'revueNormale', 'revueRapide']) {
  const cr = totalA(passages[n])
  const fin = Math.max(cd[cd.length - 1].tau, cr[cr.length - 1].tau)
  let s = 0, m = 0, k = 0
  for (let tau = 0; tau <= Math.min(fin, 12000); tau += 10) { const e = Math.abs(valeurA(cr, tau) - valeurA(cd, tau)) / LTOT; s += e; m = Math.max(m, e); k++ }
  console.log(`${n.padEnd(13)} moyen ${(100 * s / k).toFixed(1)} %  max ${(100 * m).toFixed(1)} %`)
}

// ---------- 6. La vitesse de la plume DANS un trait ----------
console.log('\n=== 6. VITESSE DANS UN TRAIT (u/ms) : variation au fil du tracé ===')
function profils(p, k) {
  // vitesse entre deux images où le trait k avance
  const v = []
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1].lg[k], b = p[i].lg[k]
    if (a >= 0 && b > a && b < finales[k] - 0.05) v.push((b - a) / (p[i].tau - p[i - 1].tau))
  }
  return v
}
const cv = v => { if (v.length < 3) return NaN; const m = somme(v) / v.length; return Math.sqrt(somme(v.map(x => (x - m) ** 2)) / v.length) / m }
for (const n of ['direct', 'eleve', 'revueNormale', 'revueRapide']) {
  const cvs = [], mins = [], maxs = []
  for (let k = 0; k < nT; k++) {
    if (finales[k] < 30) continue
    const v = profils(passages[n], k); if (v.length < 4) continue
    cvs.push(cv(v)); const s = [...v].sort((a, b) => a - b); mins.push(s[Math.floor(s.length * 0.1)]); maxs.push(s[Math.floor(s.length * 0.9)])
  }
  const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }
  console.log(`${n.padEnd(13)} coefficient de variation médian ${med(cvs).toFixed(2)} | vitesse p10 ${med(mins).toFixed(2)}  p90 ${med(maxs).toFixed(2)} (traits de plus de 30 u)`)
}
// Vérité : vitesse entre points, d'après les temps du journal
{
  const cvs = []
  for (const t of J.traits) {
    if (longueurPts(t.pts) < 30) continue
    const v = []
    for (let i = 1; i < t.temps.length; i++) { const dt = t.temps[i] - t.temps[i - 1]; if (dt > 0) v.push(Math.hypot(t.pts[3 * i] - t.pts[3 * i - 3], t.pts[3 * i + 1] - t.pts[3 * i - 2]) / dt) }
    cvs.push(cv(v))
  }
  cvs.sort((a, b) => a - b)
  console.log(`main (points)  coefficient de variation médian ${cvs[cvs.length >> 1].toFixed(2)}  (ce que la main a vraiment fait, point à point)`)
}

// ---------- 7. Pixels : au même instant, et à avancement égal ----------
const W = d.direct.enr.W, H = d.direct.enr.H
const bitsDe = b64 => Buffer.from(b64, 'base64')
function compare(a, b) {
  const A = bitsDe(a), B = bitsDe(b)
  let et = 0, ou = 0, x = 0
  for (let i = 0; i < A.length; i++) {
    const p = A[i], q = B[i]
    et += pop(p & q); ou += pop(p | q); x += pop(p ^ q)
  }
  return { iou: ou ? et / ou : 1, xor: x, union: ou }
}
function pop(v) { v = v - ((v >> 1) & 0x55); v = (v & 0x33) + ((v >> 2) & 0x33); return (v + (v >> 4)) & 0x0f }
const imageA = (p, tau) => { let m = null; for (const o of p) { if (o.tau > tau) break; m = o.m } return m }
console.log('\n=== 7. PIXELS AU MÊME INSTANT τ, pendant l\'écriture (aire qui diffère, en px² à zoom 1) ===')
const ENCRE_FINALE = (() => { const m = bitsDe(passages.direct.at(-1).m); let n = 0; for (const v of m) n += pop(v); return n / 4 })()
for (const n of ['eleve', 'revueNormale', 'revueRapide']) {
  const p = passages[n], fin = Math.max(passages.direct.at(-1).tau, chrono[n][nT - 1].fin, chrono.direct[nT - 1].fin) - 200
  const xs = []
  for (let tau = 0; tau <= fin; tau += 20) {
    const a = imageA(passages.direct, tau), b = imageA(p, tau)
    if (a && b) xs.push(compare(a, b).xor / 4)
  }
  const s = [...xs].sort((x, y) => x - y)
  console.log(`${n.padEnd(13)} médian ${s[s.length >> 1].toFixed(0).padStart(4)} px²  p90 ${s[Math.floor(s.length * 0.9)].toFixed(0).padStart(4)}  max ${s.at(-1).toFixed(0).padStart(4)} (encre du mot fini : ${ENCRE_FINALE.toFixed(0)} px²) | instants où plus de 40 px² diffèrent : ${(100 * s.filter(v => v > 40).length / s.length).toFixed(0)} %`)
}
console.log('\n=== 8. IMAGE FINALE (après le dernier trait) ===')
const finDirect = passages.direct.at(-1).m
for (const n of ['eleve', 'revueNormale', 'revueRapide']) {
  const c = compare(finDirect, passages[n].at(-1).m)
  console.log(`${n.padEnd(13)} pixels différents ${c.xor} sur ${c.union} (IoU ${c.iou.toFixed(4)})`)
}

fs.writeFileSync(path.join(ICI, 'resume.json'), JSON.stringify({ chrono, vrai, resume, finales, lettres }, null, 1))
