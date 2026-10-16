// =============================================================
// LE POIDS DES TEMPS PAR POINT
// Combien pèsent, dans le fichier .mem et dans le document Yjs, les
// temps de chaque point ? On compare plusieurs écritures :
//  - rien (aujourd'hui) ;
//  - « ms » : l'écart en ms depuis le point précédent, entier, un par point ;
//  - « ms » en texte compact (un caractère par écart) ;
//  - « duree » : la seule durée du trait (option minimale) ;
//  - « cles » : quelques points-clés seulement [rang, temps, rang, temps…],
//    les autres temps s'interpolent (erreur bornée, ici 8 ms < une image).
// Sur deux jeux : les 16 traits réels du banc (temps notés dans le
// navigateur), et une séance synthétique de taille réaliste.
// node taille.mjs [mesures.json]
// =============================================================
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import * as Y from 'yjs'
import { ecrire } from './ecriture.mjs'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const d = JSON.parse(fs.readFileSync(process.argv[2] || path.join(ICI, 'mesures.json'), 'utf8'))

const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100

// ---------- Les temps, en points-clés (Ramer-Douglas-Peucker sur (rang, temps)) ----------
function cles(t, tol = 8) {
  const garde = new Set([0, t.length - 1])
  const rec = (a, b) => {
    let m = -1, e = tol
    for (let i = a + 1; i < b; i++) {
      const u = (i - a) / (b - a), v = t[a] + (t[b] - t[a]) * u
      if (Math.abs(t[i] - v) > e) { e = Math.abs(t[i] - v); m = i }
    }
    if (m >= 0) { garde.add(m); rec(a, m); rec(m, b) }
  }
  if (t.length > 2) rec(0, t.length - 1)
  return [...garde].sort((a, b) => a - b).flatMap(i => [i, Math.round(t[i])])
}
/** Écarts en un caractère chacun : 0..61 → [0-9a-zA-Z], au-delà « ~nnn~ » */
const ALPHA = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
const compact = e => e.map(v => v < 62 ? ALPHA[v] : `~${v}~`).join('')

// ---------- Les deux jeux de traits ----------
/** Du banc : les points gardés par le tableau, et le temps (ms) de chacun */
function jeuDuBanc() {
  return d.direct.journal.traits.map(t => ({ trait: { ...t.pose }, temps: t.temps.map(x => x - t.temps[0]), dt: 0 }))
}
/** Synthétique : n lignes de texte, échantillonnées à `hz` comme un stylet, filtrées comme le tableau */
function jeuSynthetique(lignes, hz) {
  const mots = ['Bonjour', 'été', 'tour', 'jour', 'tonton', 'Bon', 'trou', 'nounou', 'juron', 'ton']
  const out = []
  let g = 3
  for (let l = 0; l < lignes; l++) {
    const texte = [mots[l % mots.length], mots[(l * 3 + 1) % mots.length], mots[(l * 7 + 2) % mots.length]].join(' ')
    const tr = ecrire(texte, { x: 100, y: 100 + 70 * l }, { graine: g++ })
    for (const t of tr) {
      const e = t.ech, D = e.at(-1).t
      const pts = [], temps = []
      let j = 0
      for (let s = 0; s <= D + 1e-9; s += 1000 / hz) {
        while (j + 1 < e.length && e[j + 1].t < s) j++
        const a = e[j], b = e[Math.min(j + 1, e.length - 1)], u = b.t > a.t ? Math.min(1, (s - a.t) / (b.t - a.t)) : 0
        const x = a.x + (b.x - a.x) * u, y = a.y + (b.y - a.y) * u, p = a.p + (b.p - a.p) * u
        const n = pts.length
        if (n && Math.hypot(x - pts[n - 3], y - pts[n - 2]) < 0.6) continue       // le filtre du tableau (zoom 1)
        pts.push(x, y, p); temps.push(s)
      }
      const x0 = pts[0], y0 = pts[1]
      const rel = []
      for (let i = 0; i < pts.length; i += 3) rel.push(r1(pts[i] - x0), r1(pts[i + 1] - y0), r2(pts[i + 2]))
      out.push({ trait: { x: x0, y: y0, pts: rel, pression: true, taille: 4.5 }, temps, dt: Math.round(t.attente + D) })
    }
  }
  return out
}

// ---------- Le film élève, comme l'exporte le lecteur ----------
function film(jeu, variante) {
  const etapes = jeu.map((j, k) => {
    const t = { id: 'id' + k.toString(36).padStart(7, '0') + 'abcde', type: 'trait', x: j.trait.x, y: j.trait.y, z: 1700000000000 + k * 700,
      pts: j.trait.pts, couleur: '#1b2230', taille: j.trait.taille, opacite: 1, pression: j.trait.pression }
    const ecarts = j.temps.map((v, i) => i ? Math.round(v) - Math.round(j.temps[i - 1]) : 0)
    if (variante === 'ms') t.ms = ecarts
    if (variante === 'texte') t.ms = compact(ecarts)
    if (variante === 'cles') t.cles = cles(j.temps)
    if (variante === 'duree') t.d = Math.round(j.temps.at(-1))
    return { dt: j.dt || 700, p: 'page1', o: [['=', t]] }
  })
  return { format: 'mem-revoir', v: 1, titre: 'Séance', date: 1700000000000, ordre: ['page1'], pages: [{ id: 'page1', fond: 'carreaux', origine: { x: 0, y: 0 }, formes: [] }], etapes, chapitres: [{ i: 0, titre: 'La séance' }], images: {} }
}
function poidsMem(f) {
  const brut = JSON.stringify(f)
  const gz = zlib.gzipSync(brut)
  const env = JSON.stringify({ format: 'mem-revoir', v: 1, titre: f.titre, date: f.date, gz: gz.toString('base64') })
  return { brut: brut.length, gz: gz.length, mem: env.length }
}
function poidsYjs(jeu, variante) {
  const doc = new Y.Doc({ gc: false })
  const pages = doc.getMap('pages')
  const p = new Y.Map(); pages.set('page1', p)
  const formes = new Y.Map(); p.set('formes', formes)
  for (const [k, e] of film(jeu, variante).etapes.entries()) doc.transact(() => formes.set('f' + k, { ...e.o[0][1], auteur: 'abcdefghijkl' }))
  return Y.encodeStateAsUpdate(doc).length
}

const ko = n => (n / 1024).toFixed(1) + ' Ko'
for (const [nom, jeu] of [['banc (16 traits réels, 200 Hz)', jeuDuBanc()], ['séance synthétique 240 Hz', jeuSynthetique(30, 240)], ['séance synthétique 120 Hz', jeuSynthetique(30, 120)]]) {
  const npts = jeu.reduce((a, j) => a + j.trait.pts.length / 3, 0)
  const ncles = jeu.reduce((a, j) => a + cles(j.temps).length / 2, 0)
  console.log(`\n=== ${nom} : ${jeu.length} traits, ${npts} points (${(npts / jeu.length).toFixed(0)} par trait), points-clés à 8 ms : ${ncles} (${(ncles / jeu.length).toFixed(1)} par trait)`)
  const base = poidsMem(film(jeu, null)), yb = poidsYjs(jeu, null)
  console.log(`variante   JSON brut     gzip        .mem         Δ .mem      | document Yjs   Δ`)
  for (const v of [null, 'duree', 'ms', 'texte', 'cles']) {
    const p = poidsMem(film(jeu, v)), y = poidsYjs(jeu, v)
    console.log(`${String(v ?? 'aucune').padEnd(8)} ${ko(p.brut).padStart(10)} ${ko(p.gz).padStart(10)} ${ko(p.mem).padStart(10)}   ${('+' + (100 * (p.mem / base.mem - 1)).toFixed(1) + ' %').padStart(9)}   | ${ko(y).padStart(10)} ${('+' + (100 * (y / yb - 1)).toFixed(1) + ' %').padStart(8)}`)
  }
}
// L'erreur des points-clés, sur les traits réels
{
  let max = 0, somme = 0, n = 0
  for (const j of jeuDuBanc()) {
    const c = cles(j.temps)
    for (let i = 0; i < j.temps.length; i++) {
      let a = 0; while (a + 2 < c.length && c[a + 2] <= i) a += 2
      const i0 = c[a], t0 = c[a + 1], i1 = c[Math.min(a + 2, c.length - 2)], t1 = c[Math.min(a + 3, c.length - 1)]
      const v = i1 > i0 ? t0 + (t1 - t0) * (i - i0) / (i1 - i0) : t0
      const e = Math.abs(v - j.temps[i]); max = Math.max(max, e); somme += e; n++
    }
  }
  console.log(`\npoints-clés (tolérance 8 ms) sur les traits réels : erreur moyenne ${(somme / n).toFixed(1)} ms, max ${max.toFixed(1)} ms`)
}
