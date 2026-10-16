// =============================================================
// UNE MAIN QUI ÉCRIT « Bonjour »
// Des tracés réalistes, en unités monde (zoom 1 : 1 unité = 1 px CSS) :
// - chaque lettre est faite de traits (levers de stylo entre eux) ;
// - chaque trait est fait de morceaux séparés par des points de
//   rebroussement (le stylo s'arrête presque, parfois marque une pause) ;
// - la vitesse suit la loi de puissance 2/3 (on ralentit dans les
//   courbes serrées), avec une montée et une descente aux deux bouts ;
// - la pression monte au poser, baisse au lever, et suit la vitesse.
// Tout est déterministe (graine fixe) : deux bancs donnent le même geste.
// =============================================================

function graine(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 } }

// ---------- Les lettres (repère local : ligne de base y = 0, vers le haut y < 0) ----------
const ellipse = (cx, cy, rx, ry, a0, balayage, pas = 24) => {
  const r = []
  const n = Math.ceil(Math.abs(balayage) / pas)
  for (let i = 0; i <= n; i++) {
    const a = (a0 + balayage * i / n) * Math.PI / 180
    r.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)])
  }
  return r
}

/** Une lettre : ses traits ; un trait : ses morceaux (listes de points d'ancrage) et ses pauses aux rebroussements */
export const LETTRES = {
  B: { l: 36, traits: [
    { morceaux: [[[0, -64], [0, -32], [0, 0]]] },
    { morceaux: [
      [[0, -64], [14, -65], [26, -60], [29, -49], [22, -38], [9, -33], [0, -33]],
      [[0, -33], [16, -32], [30, -26], [33, -13], [25, -3], [11, 0], [0, 0]],
    ], pauses: [120] },
  ] },
  o: { l: 32, traits: [
    { morceaux: [ellipse(15, -18, 14, -18, -40, -380)] },   // sens inverse des aiguilles, à l'écran
  ] },
  n: { l: 30, traits: [
    { morceaux: [
      [[0, -36], [0, -18], [0, 0]],
      [[0, 0], [0, -20], [5, -31], [14, -36], [23, -33], [27, -24], [28, -10], [28, 0]],
    ], pauses: [60] },
  ] },
  j: { l: 18, traits: [
    { morceaux: [[[10, -36], [10, -10], [10, 8], [7, 18], [0, 22], [-7, 19]]] },
    { morceaux: [[[10, -51], [11.2, -50.2], [12, -49]]], point: true },    // le point du j
  ] },
  u: { l: 32, traits: [
    { morceaux: [
      [[0, -36], [0, -14], [3, -4], [11, 0], [20, -2], [26, -9], [28, -20], [28, -36]],
      [[28, -36], [28, -18], [28, 0]],
    ], pauses: [90] },
  ] },
  r: { l: 26, traits: [
    { morceaux: [[[0, -36], [0, -18], [0, 0]]] },
    { morceaux: [[[0, -20], [4, -30], [11, -36], [19, -37], [24, -34]]] },
  ] },
  'é': { l: 30, traits: [
    { morceaux: [[[2, -16], [16, -17], [27, -19], [26, -29], [17, -36], [6, -33], [1, -22], [3, -8], [12, -1], [22, -1], [29, -6]]] },
    { morceaux: [[[11, -46], [16, -51], [21, -56]]], accent: true },
  ] },
  O: { l: 56, traits: [
    { morceaux: [ellipse(26, -32, 25, -32, -40, -385)] },        // un O majuscule bien rond (ou un zéro)
  ] },
  t: { l: 22, traits: [
    { morceaux: [[[8, -56], [8, -20], [9, -6], [14, 0], [21, -2]]] },
    { morceaux: [[[0, -36], [9, -36], [19, -36]]] },
  ] },
}

// ---------- Courbes ----------
/** Catmull-Rom centripète à travers les ancres, échantillonnée finement */
function spline(ancres) {
  if (ancres.length === 2) {
    const [a, b] = ancres, r = []
    const n = Math.max(2, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25))
    for (let i = 0; i <= n; i++) r.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n])
    return r
  }
  const p = [ancres[0].map((v, i) => 2 * v - ancres[1][i]), ...ancres, ancres[ancres.length - 1].map((v, i) => 2 * v - ancres[ancres.length - 2][i])]
  const r = []
  for (let i = 1; i + 2 < p.length; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]]
    const n = Math.max(4, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 0.25))
    for (let k = i === 1 ? 0 : 1; k <= n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t
      r.push([0, 1].map(j => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)))
    }
  }
  return r
}

/** Rééchantillonne à pas constant (ds unités) */
function abscisse(pts, ds = 0.5) {
  const r = [pts[0]]
  let reste = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i]
    const d = Math.hypot(b[0] - a[0], b[1] - a[1])
    let u = ds - reste
    while (u <= d) { r.push([a[0] + (b[0] - a[0]) * u / d, a[1] + (b[1] - a[1]) * u / d]); u += ds }
    reste = d - (u - ds)
  }
  const der = pts[pts.length - 1], q = r[r.length - 1]
  if (Math.hypot(der[0] - q[0], der[1] - q[1]) > 0.05) r.push(der)
  return r
}

// ---------- La main ----------
const VMAX = 0.55      // unités par ms (≈ 14 cm/s à zoom 1)
const VMIN = 0.05
const K = 0.12         // loi de puissance 2/3 : v = K · courbure^(-1/3)

/** Un morceau de trait : points (x, y) et temps (ms) depuis son début */
function morceau(ancres, alea, facteur) {
  const pts = abscisse(spline(ancres), 0.5)
  const n = pts.length
  const L = (n - 1) * 0.5
  // courbure par l'angle tourné sur ±3 pas
  const v = new Array(n).fill(VMAX)
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 3)], b = pts[i], c = pts[Math.min(n - 1, i + 3)]
    const u1 = Math.atan2(b[1] - a[1], b[0] - a[0]), u2 = Math.atan2(c[1] - b[1], c[0] - b[0])
    let da = Math.abs(u2 - u1); if (da > Math.PI) da = 2 * Math.PI - da
    const ds = Math.hypot(b[0] - a[0], b[1] - a[1]) + Math.hypot(c[0] - b[0], c[1] - b[1])
    const kappa = ds > 0 ? da / ds : 0
    v[i] = Math.min(VMAX, Math.max(VMIN, kappa > 1e-4 ? K * Math.pow(kappa, -1 / 3) : VMAX))
  }
  // lissage, puis montée et descente aux deux bouts
  const vl = v.map((_, i) => { let s = 0, m = 0; for (let j = i - 8; j <= i + 8; j++) if (j >= 0 && j < n) { s += v[j]; m++ } return s / m })
  const rampe = Math.min(14, L / 2.5)
  const w = pts.map((_, i) => {
    const d = Math.min(i, n - 1 - i) * 0.5
    return Math.max(0.12, Math.sin(Math.PI / 2 * Math.min(1, d / Math.max(rampe, 0.5))))
  })
  const vit = vl.map((x, i) => x * w[i] * facteur * (0.9 + 0.2 * alea()))
  const t = [0]
  for (let i = 1; i < n; i++) t.push(t[i - 1] + 0.5 / ((vit[i] + vit[i - 1]) / 2))
  return { pts, t, w, vit }
}

/**
 * Le texte écrit : une liste de traits, chacun avec ses échantillons
 * { x, y, t, p } (t en ms depuis le poser) et l'attente AVANT le poser (stylo levé).
 * origine : où est la ligne de base du premier caractère (monde).
 */
export function ecrire(texte = 'Bonjour', origine = { x: 200, y: 300 }, opts = {}) {
  const alea = graine(opts.graine ?? 7)
  const facteurVitesse = opts.vitesse ?? 1
  const traits = []
  let x = origine.x
  let premiereLettre = true
  for (const c of texte) {
    if (c === ' ') { x += 22; continue }
    const L = LETTRES[c]
    if (!L) throw new Error('lettre inconnue ' + c)
    L.traits.forEach((tr, it) => {
      const ech = []
      let t0 = 0
      tr.morceaux.forEach((anc, im) => {
        const ancres = anc.map(([a, b]) => [x + a, origine.y + b])
        if (tr.point || tr.accent) {
          // Un point ou un accent : un geste bref, presque sans vitesse de croisière
          const m = morceau(ancres, alea, tr.point ? 0.4 : 0.6)
          m.pts.forEach((p, i) => ech.push({ x: p[0], y: p[1], t: t0 + m.t[i], p: 0.45 + 0.1 * m.w[i] }))
          t0 = ech[ech.length - 1].t
          return
        }
        const m = morceau(ancres, alea, facteurVitesse)
        m.pts.forEach((p, i) => {
          if (im > 0 && i === 0) return
          const pr = Math.min(0.95, Math.max(0.08, 0.18 + 0.42 * m.w[i] + 0.18 * (1 - m.vit[i] / VMAX) + 0.04 * (alea() - 0.5)))
          ech.push({ x: p[0], y: p[1], t: t0 + m.t[i], p: pr })
        })
        t0 = ech[ech.length - 1].t
        // pause au rebroussement, stylo posé
        const pause = tr.pauses?.[im] ?? 0
        if (pause && im + 1 < tr.morceaux.length) { t0 += pause * (0.85 + 0.3 * alea()); ech.push({ ...ech[ech.length - 1], t: t0 }) }
      })
      // le stylo levé avant ce trait : dans une lettre, entre deux lettres
      const leve = premiereLettre && it === 0 ? 0 : it === 0 ? 230 + 180 * alea() : tr.point || tr.accent ? 260 + 120 * alea() : 130 + 120 * alea()
      traits.push({ lettre: c, rang: it, attente: leve, ech })
    })
    premiereLettre = false
    x += L.l + 8
  }
  return traits
}

/** Les événements à envoyer, toutes les `pas` ms, sur l'horloge du geste entier */
export function evenements(traits, pas = 5) {
  const ev = []
  let T = 0
  for (const [k, tr] of traits.entries()) {
    T += tr.attente
    const e = tr.ech
    const D = e[e.length - 1].t
    let j = 0
    const debut = T
    ev.push({ type: 'bas', t: T, x: e[0].x, y: e[0].y, p: e[0].p, k })
    for (let s = pas; s < D; s += pas) {
      while (j + 1 < e.length && e[j + 1].t < s) j++
      const a = e[j], b = e[Math.min(j + 1, e.length - 1)]
      const u = b.t > a.t ? (s - a.t) / (b.t - a.t) : 0
      ev.push({ type: 'bouge', t: debut + s, x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, p: a.p + (b.p - a.p) * u, k })
    }
    const f = e[e.length - 1]
    ev.push({ type: 'bouge', t: debut + D, x: f.x, y: f.y, p: f.p, k })
    ev.push({ type: 'haut', t: debut + D + 1, x: f.x, y: f.y, p: 0, k })
    T = debut + D + 1
  }
  return ev
}

// Petit résumé quand on lance ce fichier seul
if (import.meta.url === `file://${process.argv[1]}`) {
  const tr = ecrire(process.argv[2] || 'Bonjour')
  let T = 0
  for (const t of tr) {
    const D = t.ech[t.ech.length - 1].t
    let L = 0
    for (let i = 1; i < t.ech.length; i++) L += Math.hypot(t.ech[i].x - t.ech[i - 1].x, t.ech[i].y - t.ech[i - 1].y)
    T += t.attente + D
    console.log(`${t.lettre}${t.rang}  levé ${t.attente.toFixed(0).padStart(4)} ms  tracé ${D.toFixed(0).padStart(4)} ms  longueur ${L.toFixed(0).padStart(4)} u  vitesse moy ${(L / D).toFixed(2)} u/ms`)
  }
  console.log('total', T.toFixed(0), 'ms', evenements(tr).length, 'événements')
}
