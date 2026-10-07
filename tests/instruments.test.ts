// Le rapporteur : un demi-disque fermé par son diamètre. Le bord du bas est la
// seule ligne 0°–180°, le centre (l'origine) est au milieu de ce bord, et rien
// ne dépasse dessous : ni bande de plastique qu'on attraperait, ni second trait.
import { describe, expect, it } from 'vitest'
import { bords, etatParDefaut, toucher } from '../src/instruments'
import type { EtatInstrument } from '../src/instruments'
import { CM } from '../src/types'

const R = 6 * CM

/** Le point (s, t) du repère du rapporteur : s le long du bord, t vers le « bas » (v) */
function point(e: EtatInstrument, s: number, t: number) {
  const u = { x: Math.cos(e.a), y: Math.sin(e.a) }, v = { x: -u.y, y: u.x }
  return { x: e.x + u.x * s + v.x * t, y: e.y + u.y * s + v.y * t }
}

for (const a of [0, 0.7, -2.4]) {
  describe(`le rapporteur tourné de ${a} rad`, () => {
    const e: EtatInstrument = { x: 410, y: -130, a, r: 0 }
    const rayon = 9

    it('sous le bord, il n\'y a plus rien à prendre', () => {
      expect(toucher('rapporteur', e, point(e, 0, 0.2 * CM), rayon)).toBeNull()
      expect(toucher('rapporteur', e, point(e, 0.5 * R, 0.1 * CM), rayon)).toBeNull()
      expect(toucher('rapporteur', e, point(e, -0.9 * R, 0.3 * CM), rayon)).toBeNull()
    })

    it('juste au-dessus du bord, c\'est le corps, d\'un bout à l\'autre', () => {
      expect(toucher('rapporteur', e, point(e, 0, -0.2 * CM), rayon)).toBe('corps')
      expect(toucher('rapporteur', e, point(e, 0.99 * R, -0.05 * CM), rayon)).toBe('corps')
      expect(toucher('rapporteur', e, point(e, -0.99 * R, -0.05 * CM), rayon)).toBe('corps')
    })

    it('le bord est la frontière : tout le corps est du côté −v', () => {
      for (let s = -1.2 * R; s <= 1.2 * R; s += 7) {
        for (let t = -1.2 * R; t <= 0.6 * CM; t += 5) {
          const q = toucher('rapporteur', e, point(e, s, t), rayon)
          if (q === 'corps') expect(t).toBeLessThan(0)
          // Dans le demi-disque, à un rien du bord : le corps
          if (Math.abs(s) < R - 0.1 && t === -0.05 * CM) expect(q).toBe('corps')
        }
        // Une rangée à −0,05 cm : partout le corps, tant qu'on est sous l'arc
        if (Math.abs(s) < R - 1) expect(toucher('rapporteur', e, point(e, s, -0.05 * CM), rayon)).toBe('corps')
      }
    })

    it('le bord gradué part du centre, de −R à R : c\'est le bord du plastique', () => {
      const b = bords('rapporteur', e)
      expect(b).toHaveLength(1)
      expect(b[0].o.x).toBeCloseTo(e.x, 9); expect(b[0].o.y).toBeCloseTo(e.y, 9)
      expect(b[0].u.x).toBeCloseTo(Math.cos(a), 9); expect(b[0].u.y).toBeCloseTo(Math.sin(a), 9)
      expect(b[0].debut).toBe(-R); expect(b[0].fin).toBe(R)
      expect(b[0].gradue).toBe(true)
    })

    it('la pastille ↻ reste dans le prolongement du bord', () => {
      expect(toucher('rapporteur', e, point(e, R + 0.9 * CM, 0), rayon)).toBe('rotation')
    })
  })
}

describe('les positions par défaut', () => {
  it('le rapporteur, plus court d\'une bande, ne touche ni la règle ni l\'équerre', () => {
    const c = { x: 0, y: 0 }
    const rap = etatParDefaut('rapporteur', c), regle = etatParDefaut('regle', c), eq = etatParDefaut('equerre', c)
    // Le bord du bas du rapporteur est au-dessus du haut de la règle
    expect(rap.y).toBeLessThan(regle.y)
    // Et à droite de l'équerre (son angle droit est à gauche, elle s'étend sur 12 cm)
    expect(rap.x - R).toBeGreaterThan(eq.x + 12 * CM)
  })
})
