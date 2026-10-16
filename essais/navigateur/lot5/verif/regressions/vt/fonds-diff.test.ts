// Les fonds d'avant le lot 5 (blanc, carreaux, seyes, repere) : la version
// actuelle fait-elle EXACTEMENT les mêmes appels au canevas que la version
// d'avant le lot 5, contraste éteint ? Rangé dans le dépôt, cette version
// (construite depuis un commit qui n'existe plus) est remplacée par une
// référence figée : fonds-reference.json, l'empreinte SHA-256, pour chaque
// fond, de tous ses appels (à 13 zooms et 4 positions de la caméra), relevée
// sur la version d'avant le lot 5 en rangeant la batterie (la version
// actuelle donnait alors exactement les mêmes).
import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dessinerFond as nouveau } from '../../../../../../src/fonds'
import { Camera } from '../../../../../../src/camera'

const REFERENCE = JSON.parse(readFileSync(new URL('./fonds-reference.json', import.meta.url), 'utf8')) as Record<string, string>

function ctxEspion() {
  const log: string[] = []
  const etat: Record<string, unknown> = {}
  const p = new Proxy(etat, {
    get(t, k) {
      if (k in t) return t[k as string]
      return (...a: unknown[]) => { log.push(`${String(k)}(${a.map(v => typeof v === 'number' ? v.toFixed(4) : String(v)).join(',')})`) }
    },
    set(t, k, v) { log.push(`${String(k)}=${typeof v === 'number' ? (v as number).toFixed(4) : String(v)}`); t[k as string] = v; return true },
  })
  return { ctx: p as unknown as CanvasRenderingContext2D, log }
}

describe('fonds d\'avant identiques', () => {
  for (const fond of ['blanc', 'carreaux', 'seyes', 'repere'] as const) {
    it(fond, () => {
      let n = 0
      const h = createHash('sha256')
      for (const z of [0.1, 0.13, 0.2, 0.3, 0.5, 0.7, 1, 1.3, 2, 3.7, 5, 10, 20]) {
        for (const [x, y] of [[0, 0], [123.4, -56.7], [-3000, 2000], [1e6, -1e6]]) {
          const cam = new Camera(); cam.x = x; cam.y = y; cam.z = z
          const b = ctxEspion()
          nouveau(b.ctx, fond, cam, 1366, 768, { x: 13, y: 27 })
          h.update(`${z} ${x} ${y}\n` + b.log.join('\n') + '\n')
          n++
        }
      }
      expect(n).toBeGreaterThan(10)
      expect(h.digest('hex'), fond).toBe(REFERENCE[fond])
    })
  }
})
