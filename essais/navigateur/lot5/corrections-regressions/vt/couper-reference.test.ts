// La coupe de la gomme partielle (gomme.ts couperTrait) écarte désormais
// d'un coup d'œil (la boîte de la capsule) les points et les côtés loin de
// la gomme, sans le calcul de la distance ni de la traversée : sur une
// spirale de 5000 points, presque tous (la vérification des régressions du
// lot 5). Le résultat doit être EXACTEMENT celui d'avant (la version d'avant l'optimisation, figée à
// côté) : les mêmes morceaux, aux mêmes points, sur des milliers de coupes
// au hasard (traits droits, spirales, points serrés ou espacés, gommes
// rapides ou lentes, petites ou grandes).
import { describe, expect, it } from 'vitest'
import type { Trait } from '../../../../../src/types'
import { couperTrait } from '../../../../../src/gomme'
import { couperTrait as couperAvant } from './gomme-reference'

let graine = 12345
const hasard = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }

function traitAuHasard(k: number): Trait {
  const n = 1 + Math.floor(hasard() * (k % 3 === 0 ? 3000 : 200)), pas = 0.3 + hasard() * 9
  const pts: number[] = []
  let x = 0, y = 0, a = hasard() * 6.3
  for (let i = 0; i < n; i++) {
    pts.push(Math.round(x * 10) / 10, Math.round(y * 10) / 10, Math.round(hasard() * 100) / 100)
    a += (hasard() - 0.5) * (k % 2 ? 0.8 : 0.1); x += Math.cos(a) * pas; y += Math.sin(a) * pas
  }
  return { id: 'T' + k, type: 'trait', x: hasard() * 400, y: hasard() * 400, z: k, auteur: 'moi', pts, couleur: '#000', taille: [1, 3, 8, 15][k % 4], opacite: 1, pression: !!(k % 2) }
}

describe('couperTrait : les mêmes morceaux qu\'avant les écarts rapides', () => {
  it('3000 coupes au hasard', () => {
    let coupes = 0
    for (let k = 0; k < 3000; k++) {
      const t = traitAuHasard(k)
      // la gomme passe près d'un point du trait (sinon presque rien ne se couperait)
      const i = Math.floor(hasard() * (t.pts.length / 3)), cx = t.x + t.pts[3 * i], cy = t.y + t.pts[3 * i + 1]
      const a = { x: cx + (hasard() - 0.5) * 60, y: cy + (hasard() - 0.5) * 60 }
      const b = hasard() < 0.2 ? a : { x: a.x + (hasard() - 0.5) * 80, y: a.y + (hasard() - 0.5) * 80 }
      const r = 3 + hasard() * 30
      // Les identifiants neufs viennent du hasard (uid) : on les compare à part
      const sans = (l: Trait[] | null) => l && l.map(m => ({ ...m, id: m.id === t.id ? t.id : '?' }))
      const nouveau = sans(couperTrait(t, a, b, r)), avant = sans(couperAvant(t, a, b, r))
      expect(nouveau, `coupe ${k}`).toEqual(avant)
      if (avant && avant.length) coupes++
    }
    expect(coupes).toBeGreaterThan(1000)
  })
})
