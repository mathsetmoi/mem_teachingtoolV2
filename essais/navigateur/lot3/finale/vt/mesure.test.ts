// Mesures pour la spécification finale du lot 3 (hors du dépôt)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../../../../../src/document'
import type { Forme, Trait } from '../../../../../src/types'

let horloge = new Date('2026-10-07T08:00:00').getTime()
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
let n = 0
const trait = (id: string, pts = 60): Trait => {
  const p: number[] = []
  for (let i = 0; i < pts; i++) p.push(Math.round(Math.random() * 4000) / 10, Math.round(Math.random() * 4000) / 10, 0.5)
  return { id, type: 'trait', x: 0, y: 0, z: n++, auteur: 'm', pts: p, couleur: '#000', taille: 3, opacite: 1, pression: false }
}

describe('mesures', () => {
  it('copier une page de 300 traits de 60 points : durée de la transaction', async () => {
    const t = new Tableau(null)
    const pages: string[] = []
    for (let k = 0; k < 10; k++) {
      const p = t.ajouterPage('carreaux', k); pages.push(p)
      t.doc.transact(() => { const f = t.formesDe(p)!; for (let i = 0; i < 300; i++) f.set(p + i, trait(p + i)) })
    }
    await attendre(500)
    const durees: number[] = []
    for (const p of pages) {
      const t0 = performance.now()
      const q = 'Q' + p
      t.pageVue = q
      t.doc.transact(() => {
        const m = new Y.Map<unknown>(); m.set('fond', 'carreaux'); m.set('herite', { de: p })
        const f = new Y.Map<Forme>(); for (const [id, x] of t.formesDe(p)!) f.set(id, JSON.parse(JSON.stringify(x)))
        m.set('formes', f); t.pages.set(q, m); t.ordre.insert(t.ordre.toArray().indexOf(p) + 1, [q])
      })
      durees.push(performance.now() - t0)
    }
    console.log('copie d\'une page de 300 traits (ms) :', durees.map(d => d.toFixed(1)).join(' '))
    await attendre(500)
    // L'instantané pris après chaque transaction (afterTransaction) : sa durée
    const t1 = performance.now(); for (let k = 0; k < 20; k++) Y.encodeSnapshot(Y.snapshot(t.doc)); console.log('un instantané du document (ms) :', ((performance.now() - t1) / 20).toFixed(2))
    expect(durees.length).toBe(10)
  })
})
