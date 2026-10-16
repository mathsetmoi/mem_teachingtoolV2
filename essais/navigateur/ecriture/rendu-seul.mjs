// =============================================================
// LE RENDU SEUL, SANS LE TEMPS
// Pour chaque trait réellement tracé au banc, et pour chaque état du
// trait en cours (chaque point reçu), on dessine :
//  A. ce que montrait le direct : les points bruts (absolus), last: false ;
//  B. ce que montre le replay au même avancement : esquisse() du trait
//     enregistré (arrondi, relatif) — last: true, point final interpolé ;
//  C. la proposition : les mêmes points que le direct, lus dans le trait
//     enregistré (arrondi), last: false ;
// et, une fois le trait fini :
//  D. le trait en cours au dernier point (direct) contre le trait posé (scène).
// Rendu à 4 px par unité ; les aires sont rendues en px² à zoom 1.
// node rendu-seul.mjs [mesures.json]
// =============================================================
import { chromium } from '../commun/playwright.mjs'
import fs from 'node:fs'
import path from 'node:path'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ICI, 'mesures.json'), 'utf8'))
const traits = d.direct.journal.traits.map(t => ({ brut: t.pts, temps: t.temps, pose: t.pose }))

const nav = await chromium.launch()
const page = await nav.newPage()
await page.goto('http://localhost:5173/')
await page.waitForFunction(() => window.__app)
const res = await page.evaluate(async (traits) => {
  const { cheminDuTrait } = await import('/src/rendu.ts')
  const { esquisse } = await import('/src/revoir/esquisse.ts')
  const E = 4
  const longueur = (pts) => { let l = 0; for (let i = 3; i + 2 < pts.length; i += 3) l += Math.hypot(pts[i] - pts[i - 3], pts[i + 1] - pts[i - 2]); return l }
  function raster(chemins, boite) {
    const W = Math.ceil(boite.l * E), H = Math.ceil(boite.h * E)
    const c = new OffscreenCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true })
    return chemins.map(({ chemin, dx, dy }) => {
      x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H)
      x.setTransform(E, 0, 0, E, (dx - boite.x) * E, (dy - boite.y) * E)
      x.fillStyle = '#000'; x.fill(chemin)
      const p = x.getImageData(0, 0, W, H).data
      const m = new Uint8Array(W * H)
      for (let i = 0; i < m.length; i++) m[i] = p[4 * i + 3] > 127 ? 1 : 0
      return m
    })
  }
  const diff = (a, b) => { let x = 0, ia = 0, ib = 0; for (let i = 0; i < a.length; i++) { x += a[i] ^ b[i]; ia += a[i]; ib += b[i] } return { xor: x / (E * E), a: ia / (E * E), b: ib / (E * E) } }
  const sortie = []
  for (const [k, t] of traits.entries()) {
    for (const simule of [false, true]) {
      const pose = { ...t.pose, id: 'x', type: 'trait', couleur: '#000', opacite: 1, z: 0, pression: simule ? false : t.pose.pression }
      const n = t.brut.length / 3
      let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
      for (let i = 0; i < n; i++) { x1 = Math.min(x1, t.brut[3 * i]); x2 = Math.max(x2, t.brut[3 * i]); y1 = Math.min(y1, t.brut[3 * i + 1]); y2 = Math.max(y2, t.brut[3 * i + 1]) }
      const m = pose.taille * 2 + 4
      const boite = { x: x1 - m, y: y1 - m, l: x2 - x1 + 2 * m, h: y2 - y1 + 2 * m }
      const L = longueur(pose.pts)
      const etats = []
      for (let i = 1; i <= n; i++) {
        const brut = t.brut.slice(0, 3 * i)
        const enCours = { pts: brut, taille: pose.taille, pression: pose.pression }
        const l = longueur(pose.pts.slice(0, 3 * i))
        const esq = esquisse(pose, L > 0 ? l / L : 1)
        const prop = { pts: pose.pts.slice(0, 3 * i), taille: pose.taille, pression: pose.pression }
        const [A, B, C] = raster([
          { chemin: cheminDuTrait(enCours, false), dx: 0, dy: 0 },
          { chemin: cheminDuTrait(esq, true), dx: pose.x, dy: pose.y },
          { chemin: cheminDuTrait(prop, false), dx: pose.x, dy: pose.y },
        ], boite)
        const ab = diff(A, B), ac = diff(A, C)
        etats.push({ i, l, ab: ab.xor, ac: ac.xor, aireA: ab.a, aireB: ab.b, aireC: ac.b })
      }
      // D : au lever du stylo, le trait en cours (direct) devient le trait posé (scène)
      const [Af, Pf] = raster([
        { chemin: cheminDuTrait({ pts: t.brut, taille: pose.taille, pression: pose.pression }, false), dx: 0, dy: 0 },
        { chemin: cheminDuTrait(pose, true), dx: pose.x, dy: pose.y },
      ], boite)
      const lever = diff(Af, Pf)
      sortie.push({ k, simule, n, L, etats, lever })
    }
  }
  return sortie
}, traits)
await nav.close()
fs.writeFileSync(path.join(ICI, 'rendu-seul.json'), JSON.stringify(res))

const med = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[s.length >> 1] : NaN }
const p90 = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.9)] : NaN }
for (const simule of [false, true]) {
  console.log(`\n=== Rendu du trait partiel, ${simule ? 'pression SIMULÉE (doigt, souris)' : 'VRAIE pression (stylet)'} — aires en px² à zoom 1 ===`)
  console.log('trait  pts  long | A↔B (replay actuel) méd  p90  max | aire B − A méd | A↔C (proposition) méd max | lever stylo (direct → scène) xor')
  const toutAB = [], toutAC = [], toutRel = []
  for (const r of res.filter(r => r.simule === simule)) {
    const e = r.etats.slice(1)        // le premier point seul : un rond des deux côtés
    const ab = e.map(x => x.ab), ac = e.map(x => x.ac), dif = e.map(x => x.aireB - x.aireA)
    toutAB.push(...ab); toutAC.push(...ac); toutRel.push(...e.map(x => x.ab / Math.max(1, x.aireA)))
    console.log(`${String(r.k).padStart(3)} ${String(r.n).padStart(5)} ${r.L.toFixed(0).padStart(5)} | ${med(ab).toFixed(1).padStart(8)} ${p90(ab).toFixed(1).padStart(5)} ${Math.max(...ab, 0).toFixed(1).padStart(5)} | ${med(dif).toFixed(1).padStart(8)} | ${med(ac).toFixed(2).padStart(6)} ${Math.max(...ac, 0).toFixed(2).padStart(5)} | ${r.lever.xor.toFixed(1).padStart(6)} (aire ${r.lever.a.toFixed(0)})`)
  }
  console.log(`TOUS : A↔B médian ${med(toutAB).toFixed(1)} px² (p90 ${p90(toutAB).toFixed(1)}), soit ${(100 * med(toutRel)).toFixed(1)} % de l'encre du trait en cours (p90 ${(100 * p90(toutRel)).toFixed(1)} %) ; A↔C médian ${med(toutAC).toFixed(2)} px², max ${Math.max(...toutAC).toFixed(2)}`)
}
