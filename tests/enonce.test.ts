import { describe, expect, it } from 'vitest'
import { enonceHorsVue, tailleVignette } from '../src/enonce'

// La vue : 1000 × 600 à partir de (0, y)
const vue = (y: number) => ({ x: 0, y, l: 1000, h: 600 })
const enonce = { id: 'e', b: { x: 50, y: 0, l: 500, h: 300 } }

describe('la vignette de l\'énoncé', () => {
  it('ne paraît pas tant que l\'énoncé se lit', () => {
    expect(enonceHorsVue([enonce], vue(0))).toBe(null)
    expect(enonceHorsVue([enonce], vue(200))).toBe(null)   // un tiers encore à l'écran
  })
  it('paraît quand il est sorti par le haut', () => {
    expect(enonceHorsVue([enonce], vue(230))).toBe('e')
    expect(enonceHorsVue([enonce], vue(2000))).toBe('e')
  })
  it('jamais pour une image sous la vue, ni à côté', () => {
    expect(enonceHorsVue([enonce], vue(-1000))).toBe(null)
    expect(enonceHorsVue([enonce], { x: 2000, y: 2000, l: 1000, h: 600 })).toBe(null)
  })
  it('montre l\'exercice le plus proche au-dessus', () => {
    const deux = { id: 'd', b: { x: 50, y: 1500, l: 500, h: 300 } }
    expect(enonceHorsVue([enonce, deux], vue(1000))).toBe('e')
    expect(enonceHorsVue([enonce, deux], vue(2000))).toBe('d')
  })
  it('se cache quand l\'exercice suivant est à l\'écran', () => {
    const deux = { id: 'd', b: { x: 50, y: 1500, l: 500, h: 300 } }
    expect(enonceHorsVue([enonce, deux], vue(1400))).toBe(null)
  })
  it('garde les proportions de l\'image, petite ou grande', () => {
    expect(tailleVignette(500, 300, 1200, 700, false)).toEqual({ l: 260, h: 156 })
    const g = tailleVignette(500, 300, 1200, 700, true)
    expect(g.l).toBe(720); expect(g.h).toBe(432)
    expect(tailleVignette(300, 900, 1200, 700, false).h).toBe(180)
  })
})
