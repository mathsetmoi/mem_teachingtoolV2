// Vérification « données et replay » du lot 5 (d4) : le classeur de d1 (tous
// les gestes du lot 5, une copie de page qui hérite de son original), publié
// page par page : la bobine du lot 5 finit chaque page
// telle qu'elle est à l’écran, la copie comprise (son passé lu dans
// l'original). Et la revue (planches) à chaque étape de chaque page.
// (Rangé dans le dépôt : la bobine d'avant le lot 5, construite depuis un
// commit qui n'existe plus, est retirée.)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { readFileSync } from 'node:fs'
import * as Y from 'yjs'
import { expect, it } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import { lireTableau } from '../../../../../../src/fichier'
import { Bobine } from '../../../../../../src/revoir/bobine'
import { exporterDetaille, seancesDuFilm } from '../../../../../../src/revoir/exporter'
import { lectureDe } from '../../../../../../src/revue/planches'
import { construireBande } from '../../../../../../src/revue/bande'

const D = `${RACINE_ESSAIS}/lot5/verif/donnees/sorties`
const trier = (v: unknown): unknown => Array.isArray(v) ? v.map(trier) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, trier((v as Record<string, unknown>)[k])])) : v
const propre = (x: Record<string, unknown>) => { const { auteur: _a, brut: _b, ...r } = x; if (r.type === 'trait') r.pts = (r.pts as number[]).map((v, i) => i % 3 === 2 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10); return JSON.stringify(trier(r)) }

it('chaque page publiée seule (la copie aussi) finit, dans les deux bobines, telle qu\'à l’écran', () => {
  const t = new Tableau(null)
  Y.applyUpdate(t.doc, lireTableau(new Uint8Array(readFileSync(D + '/d1.memc'))).etat, 'film')
  const film = t.film.toArray()
  const s = seancesDuFilm(film)[0]
  const ordre = t.ordre.toArray()
  const ecarts: unknown[] = []
  for (const pages of [...ordre.map(p => [p]), ordre]) {
    const { film: f } = exporterDetaille(t, { de: s.de, a: s.a, pages, titre: 'x' })
    const relu = JSON.parse(JSON.stringify(f))
    for (const [nom, b] of [['lot 5', new Bobine(relu)]] as const) {
      for (const p of f.ordre) {
        const img = b.image(b.n - 1, p)
        const A = Object.fromEntries(img.formes.map(x => [x.id, propre(x as never)]))
        const B = Object.fromEntries([...t.formesDe(p)!.values()].map(x => [x.id, propre(x as never)]))
        const d = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(id => A[id] !== B[id])
        if (d.length) ecarts.push({ publiees: pages.map(x => x.slice(0, 4)), bobine: nom, page: p.slice(0, 4), d: d.map(id => ({ id, film: A[id]?.slice(0, 160), tableau: B[id]?.slice(0, 160) })) })
      }
    }
  }
  expect(ecarts).toEqual([])
})

it('la revue (planches) : à chaque étape de l\'histoire d\'une page, la planche est la page à cette étape ; la bande se construit', () => {
  const t = new Tableau(null)
  Y.applyUpdate(t.doc, lireTableau(new Uint8Array(readFileSync(D + '/d1.memc'))).etat, 'film')
  const film = t.film.toArray()
  const l = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(film)
  const ecarts: unknown[] = []
  for (const p of t.ordre.toArray()) {
    const herite = !!(t.pages.get(p) as Y.Map<unknown>).get('herite')
    for (let i = 0; i < film.length; i++) {
      if (!l.deLaPage(i, p)) continue
      const img = l.page(i, p)
      // Pour une page qui hérite, avant sa naissance, la planche est celle de l'original
      const src = l.source(i, p)
      const vrai = t.etatA(film[i]).pages.get(src)
      if (!img || !vrai) continue
      const A = img.formes.map(x => JSON.stringify(trier(x))).sort()
      const B = [...vrai.formes.values()].map(x => JSON.stringify(trier(x))).sort()
      if (JSON.stringify(A) !== JSON.stringify(B)) ecarts.push({ p: p.slice(0, 4), herite, i, n: [A.length, B.length] })
    }
    const b = construireBande(l as never, { genre: 'page', page: p } as never, seances, x => x) as { images: unknown[] }
    expect(b.images.length).toBeGreaterThan(1)
  }
  expect(ecarts).toEqual([])
})
