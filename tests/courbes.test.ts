// Tracer une fonction (lot 27) : lire une écriture tapée au clavier, la
// recette d'un repère, le dessin du repère et de ses courbes.
import { describe, expect, it } from 'vitest'
import {
  ajusterFenetre, coinDepuisAxe, derivee, dessinCourbes, equationDroite, lettresDe, lire, lireRecette, morceaux, nombreFr,
  recetteParDefaut, HAUTEUR_REPERE, LARGEUR_REPERE,
} from '../src/courbes/calcul'
import type { LigneAxe, RecetteCourbes } from '../src/courbes/calcul'

const vaut = (texte: string, x: number, v: Record<string, number> = {}) => {
  const l = lire(texte)
  if (!l.ok) throw new Error(l.erreur)
  return l.calcul(x, v)
}

describe('lire une écriture', () => {
  it('calcule les fonctions du programme', () => {
    expect(vaut('x^2', 3)).toBe(9)
    expect(vaut('x²', -3)).toBe(9)
    expect(vaut('2x+1', 2)).toBe(5)
    expect(vaut('-x^2', 2)).toBe(-4)
    expect(vaut('1/x', 4)).toBe(0.25)
    expect(vaut('racine(x)', 9)).toBe(3)
    expect(vaut('√x', 16)).toBe(4)
    expect(vaut('sqrt(x+1)', 3)).toBe(2)
    expect(vaut('|x-2|+1', 0)).toBe(3)
    expect(vaut('2|x|', -3)).toBe(6)
    expect(vaut('3(x+1)(x-2)', 0)).toBe(-6)
    expect(vaut('(x+1)(x-1)', 3)).toBe(8)
    expect(vaut('x^3', -2)).toBe(-8)
    expect(vaut('exp(x)', 0)).toBe(1)
    expect(vaut('ln(x)', 1)).toBe(0)
    expect(vaut('0,5x − 1', 4)).toBe(1)
    expect(vaut('2^x', 3)).toBe(8)
    expect(vaut('x^(1/3)', -8)).toBeCloseTo(-2)
  })

  it('fait des autres lettres des curseurs', () => {
    const l = lire('a(x-α)^2+β')
    expect(l.ok && l.lettres).toEqual(['a', 'α', 'β'])
    expect(vaut('a(x-α)^2+β', 3, { a: 1, 'α': 1, 'β': -2 })).toBe(2)
    expect(vaut('ax^2+bx+c', 2, { a: 1, b: -2, c: -3 })).toBe(-3)
    expect(vaut('ax+b', 2, { a: 2, b: -1 })).toBe(3)
    // e est le nombre d'Euler, pas un curseur
    const e = lire('e^x')
    expect(e.ok && e.lettres).toEqual([])
  })

  it('écrit la formule bien écrite', () => {
    const f = (t: string) => { const l = lire(t); return l.ok ? l.latex : l.erreur }
    expect(f('x^2')).toBe('x^{2}')
    expect(f('2x+1')).toBe('2x + 1')
    expect(f('1/x')).toBe('\\dfrac{1}{x}')
    expect(f('racine(x)')).toBe('\\sqrt{x}')
    expect(f('a(x-α)^2+β')).toBe('a(x - \\alpha)^{2} + \\beta')
    expect(f('|x|')).toBe('\\left|x\\right|')
    expect(f('0,5x')).toBe('0{,}5x')
    expect(f('-x^2+3')).toBe('-x^{2} + 3')
  })

  it('dit ce qui ne va pas, sans rien casser', () => {
    for (const t of ['', '2x+', '(x+1', 'x+1)', '2*/x', 'x$', '|x']) {
      const l = lire(t)
      expect(l.ok).toBe(false)
      if (!l.ok) expect(l.erreur.length).toBeGreaterThan(5)
    }
  })
})

describe('la recette', () => {
  it('se relit, et une recette abîmée est refusée', () => {
    const r = recetteParDefaut()
    expect(lireRecette(JSON.parse(JSON.stringify(r)))).toEqual(r)
    expect(lireRecette({ ...r, fenetre: [3, 1, 0, 1] })).toBeNull()
    expect(lireRecette({ ...r, fonctions: [] })).toBeNull()
    expect(lireRecette({ ...r, v: 2 })).toBeNull()
    expect(lireRecette({ ...r, curseurs: { a: 'x' } })).toBeNull()
    expect(lireRecette(null)).toBeNull()
  })
  it('donne les curseurs de toutes les courbes', () => {
    expect(lettresDe({ ...recetteParDefaut(), fonctions: ['ax+b', 'bx^2+c', '2x+'] })).toEqual(['a', 'b', 'c'])
  })
})

describe('le dessin', () => {
  const r: RecetteCourbes = { ...recetteParDefaut(), fonctions: ['x^2', '2x+1'], fenetre: [-5, 5, -2, 8] }

  it('pose l\'axe des abscisses, d\'où l\'on retrouve le repère déplacé ou agrandi', () => {
    for (const [o, k] of [[{ x: 100, y: 50 }, 1], [{ x: -40, y: 300 }, 1.5]] as const) {
      const d = dessinCourbes(o, r, k)
      const axe = d.lignes.find(l => (l as LigneAxe).axe)!
      const c = coinDepuisAxe(axe.pts[0], axe.pts[1], r)
      expect(c.k).toBeCloseTo(k)
      expect(c.o.x).toBeCloseTo(o.x)
      expect(c.o.y).toBeCloseTo(o.y)
    }
  })

  it('garde les courbes dans le repère', () => {
    const o = { x: 0, y: 0 }
    const d = dessinCourbes(o, r)
    const bleues = d.lignes.filter(l => l.couleur === '#2f6fd6')
    expect(bleues.length).toBeGreaterThan(0)
    for (const l of bleues) for (const p of l.pts) {
      expect(p.x).toBeGreaterThanOrEqual(-0.1); expect(p.x).toBeLessThanOrEqual(LARGEUR_REPERE + 0.1)
      expect(p.y).toBeGreaterThanOrEqual(-0.1); expect(p.y).toBeLessThanOrEqual(HAUTEUR_REPERE + 0.1)
    }
    // Les noms Cf et Cg
    expect(d.etiquettes.filter(e => e.latex?.startsWith('\\mathcal')).length).toBe(2)
  })

  it('coupe 1/x en 0 et ne trace pas √x avant 0', () => {
    const inv = morceaux(x => 1 / x, [-5, 5, -5, 5])
    expect(inv.length).toBe(2)
    const rac = morceaux(Math.sqrt, [-1, 9, -1, 4])
    expect(rac.length).toBe(1)
    expect(rac[0][0].x).toBeGreaterThanOrEqual(0)
  })

  it('pose le point M, ses pointillés et la tangente', () => {
    const d = dessinCourbes({ x: 0, y: 0 }, { ...r, point: true, x0: 1, tangente: true })
    expect(d.points.length).toBe(1)
    expect(d.lignes.filter(l => l.tirets).length).toBe(2)
    expect(d.etiquettes.some(e => e.texte === 'y = 2x − 1')).toBe(true)
  })
})

describe('les petits calculs', () => {
  it('écrit les nombres et les équations comme au tableau', () => {
    expect(nombreFr(2.5)).toBe('2,5')
    expect(nombreFr(-0.333)).toBe('−0,33')
    expect(nombreFr(-0.001)).toBe('0')
    expect(equationDroite(2, -1).texte).toBe('y = 2x − 1')
    expect(equationDroite(-1, 0).texte).toBe('y = −x')
    expect(equationDroite(0, 3).texte).toBe('y = 3')
    expect(equationDroite(1, 0.5).texte).toBe('y = x + 0,5')
  })
  it('n\'a pas de tangente à |x| en 0', () => {
    expect(derivee(Math.abs, 0)).toBeNull()
    expect(derivee(x => x * x, 1)).toBeCloseTo(2, 4)
  })
  it('ajuste la fenêtre aux courbes', () => {
    const w = ajusterFenetre({ ...recetteParDefaut(), fonctions: ['x^2'], fenetre: [-3, 3, -1, 1] })
    expect(w).not.toBeNull()
    expect(w![0]).toBeLessThanOrEqual(-1)
    expect(w![1]).toBeGreaterThanOrEqual(9)
  })
})
