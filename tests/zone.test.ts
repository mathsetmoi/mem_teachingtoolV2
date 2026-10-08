// Ce que prend un cadre ou un lasso de l'outil Sélection : un objet à plus de
// moitié dedans (la longueur de son tracé, la surface d'une image ou d'une
// formule ; une droite par ses deux points), et le lasso simplifié qui garde
// ses coins. Le geste lui-même (cadre à la souris, lasso au stylet et au
// doigt, saisir ou entourer) se vérifie dans le navigateur.
import { describe, expect, it } from 'vitest'
import { dansLasso, dedans, partDedans, simplifier } from '../src/geometrie'
import type { Cercle, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'

const base = { z: 1, auteur: 'moi' }
/** Un trait de n points en ligne droite de (x, y) à (x + dx, y + dy) */
const droit = (x: number, y: number, dx: number, dy: number, n = 21): Trait => {
  const pts: number[] = []
  for (let i = 0; i < n; i++) pts.push(n > 1 ? dx * i / (n - 1) : 0, n > 1 ? dy * i / (n - 1) : 0, 0.5)
  return { ...base, id: 't', type: 'trait', x, y, pts, couleur: '#000', taille: 4, opacite: 1, pression: false }
}
const poly = (pts: number[], o: Partial<Polygone> = {}): Polygone =>
  ({ ...base, id: 'p', type: 'polygone', x: 0, y: 0, pts, ferme: true, couleur: '#000', taille: 2, ...o })
/** Le cadre de (x1, y1) à (x2, y2) */
const cadre = (x1: number, y1: number, x2: number, y2: number) => (x: number, y: number) => x >= x1 && x <= x2 && y >= y1 && y <= y2
/** Le lasso par ses sommets (règle pair-impair) */
const lasso = (q: number[]) => (x: number, y: number) => dedans(x, y, q)
const prise = (part: number) => part > 0.5

describe('la part d\'un tracé dans la zone', () => {
  it('le long trait en diagonale qu\'un cadre ne touche qu\'en un coin de sa boîte n\'est pas pris', () => {
    const t = droit(0, 0, 1000, 600)
    // Le cadre est dans le coin en haut à droite de la boîte du trait : il
    // chevauche la boîte, pas le trait
    const p = partDedans(t, cadre(700, 0, 1000, 200), null)
    expect(p).toBe(0)
    expect(prise(p)).toBe(false)
    // Un cadre qui en couvre un petit bout ne le prend pas non plus
    expect(prise(partDedans(t, cadre(800, 400, 1100, 700), null))).toBe(false)
  })

  it('un trait à 60 % dedans est pris, à 40 % non', () => {
    const t = droit(0, 0, 1000, 0)
    expect(partDedans(t, cadre(-10, -10, 600, 10), null)).toBeCloseTo(0.6, 1)
    expect(prise(partDedans(t, cadre(-10, -10, 600, 10), null))).toBe(true)
    expect(prise(partDedans(t, cadre(-10, -10, 400, 10), null))).toBe(false)
    expect(partDedans(t, cadre(-10, -10, 2000, 10), null)).toBe(1)
  })

  it('chaque segment pèse sa longueur : des points serrés au début ne comptent pas plus', () => {
    // Dix points serrés sur les 10 premières unités, puis un seul grand segment de 990
    const pts: number[] = []
    for (let i = 0; i <= 10; i++) pts.push(i, 0, 0.5)
    pts.push(1000, 0, 0.5)
    const t: Trait = { ...droit(0, 0, 1, 0), pts }
    expect(partDedans(t, cadre(-5, -5, 20, 5), null)).toBeLessThan(0.02)
  })

  it('un point seul : dedans ou dehors', () => {
    const point = droit(50, 50, 0, 0, 1)
    expect(partDedans(point, cadre(0, 0, 100, 100), null)).toBe(1)
    expect(partDedans(point, cadre(60, 0, 100, 100), null)).toBe(0)
    const p = poly([0, 0], { x: 50, y: 50, ferme: false })
    expect(partDedans(p, cadre(0, 0, 100, 100), null)).toBe(1)
    expect(partDedans(p, cadre(60, 0, 100, 100), null)).toBe(0)
  })

  it('un trait de 1000 points ne fait pas plus de 64 tests, et sa part reste juste', () => {
    let tests = 0
    const t = droit(0, 0, 1000, 0, 1000)
    const z = cadre(-10, -10, 700, 10)
    const p = partDedans(t, (x, y) => { tests++; return z(x, y) }, null)
    expect(tests).toBeLessThanOrEqual(64)
    expect(p).toBeGreaterThan(0.65)
    expect(p).toBeLessThan(0.75)
    // Un trait court : un test par segment
    tests = 0
    partDedans(droit(0, 0, 100, 0, 11), (x, y) => { tests++; return z(x, y) }, null)
    expect(tests).toBe(10)
  })

  it('un polygone : ses côtés, celui de fermeture compris s\'il est fermé', () => {
    const carre = poly([0, 0, 100, 0, 100, 100, 0, 100])
    // Le cadre couvre la moitié gauche et un peu plus : le côté gauche, et plus
    // de la moitié du haut et du bas
    expect(prise(partDedans(carre, cadre(-10, -10, 60, 110), null))).toBe(true)
    expect(prise(partDedans(carre, cadre(-10, -10, 40, 110), null))).toBe(false)
    // Ouvert, sans le côté de fermeture (le côté gauche) : la même zone en
    // prend moins
    const ouvert = poly([0, 0, 100, 0, 100, 100, 0, 100], { ferme: false })
    expect(partDedans(ouvert, cadre(-10, -10, 60, 110), null)).toBeLessThan(partDedans(carre, cadre(-10, -10, 60, 110), null))
  })

  it('une droite dont un seul point est dans le lasso n\'est pas prise ; ses deux points, si', () => {
    const d = poly([0, 0, 100, 0], { x: 100, y: 100, ferme: false, prolonge: 'droite' })
    const autourDeA = lasso([50, 50, 150, 50, 150, 150, 50, 150])
    expect(partDedans(d, autourDeA, null)).toBe(0)
    const autourDesDeux = lasso([50, 50, 250, 50, 250, 150, 50, 150])
    expect(partDedans(d, autourDesDeux, null)).toBe(1)
    const demi = { ...d, prolonge: 'demi' as const }
    expect(partDedans(demi, autourDeA, null)).toBe(0)
    expect(partDedans(demi, autourDesDeux, null)).toBe(1)
  })

  it('un cercle et un arc : leur tracé, pas leur disque', () => {
    const c: Cercle = { ...base, id: 'c', type: 'cercle', x: 0, y: 0, r: 100, couleur: '#000', taille: 2 }
    expect(partDedans(c, cadre(-200, -200, 200, 200), null)).toBe(1)
    // La moitié droite et un peu plus
    expect(prise(partDedans(c, cadre(-20, -200, 200, 200), null))).toBe(true)
    expect(prise(partDedans(c, cadre(20, -200, 200, 200), null))).toBe(false)
    // Un cadre au centre, dans le vide du disque : rien
    expect(partDedans(c, cadre(-50, -50, 50, 50), null)).toBe(0)
    // Un quart d'arc à droite en bas (de 0 à π/2) : tout dedans
    const arc: Cercle = { ...c, arc: { a0: 0, a1: Math.PI / 2 } }
    expect(partDedans(arc, cadre(-5, -5, 200, 200), null)).toBe(1)
    expect(partDedans(arc, cadre(-200, -200, 0, 0), null)).toBe(0)
  })

  it('un ancien segment : 8 morceaux', () => {
    const s: Segment = { ...base, id: 's', type: 'segment', x: 0, y: 0, dx: 100, dy: 0, couleur: '#000', taille: 2 }
    // Exactement la moitié (4 morceaux sur 8) : pas « plus de la moitié »
    expect(partDedans(s, cadre(-5, -5, 50, 5), null)).toBeCloseTo(0.5, 5)
    expect(prise(partDedans(s, cadre(-5, -5, 50, 5), null))).toBe(false)
    expect(prise(partDedans(s, cadre(-5, -5, 60, 5), null))).toBe(true)
  })
})

describe('la part d\'une surface dans la zone', () => {
  const formule: Formule = { ...base, id: 'f', type: 'formule', x: 0, y: 0, latex: 'x^2', couleur: '#000', taille: 28 }
  const boite = { x: 0, y: 0, l: 100, h: 40 }

  it('une formule à 49 % dans le cadre n\'est pas prise, à 60 % elle l\'est', () => {
    expect(prise(partDedans(formule, cadre(-10, -10, 49, 50), boite))).toBe(false)
    expect(prise(partDedans(formule, cadre(-10, -10, 60, 50), boite))).toBe(true)
    expect(partDedans(formule, cadre(-10, -10, 200, 50), boite)).toBe(1)
    // Sans sa boîte (pas encore mesurée), rien
    expect(partDedans(formule, cadre(-10, -10, 200, 50), null)).toBe(0)
  })

  it('une image tournée se mesure dans son parallélogramme', () => {
    // 100 × 50 px tournée d'un quart de tour : elle occupe x ∈ [−50, 0], y ∈ [0, 100]
    const img: ImageForme = { ...base, id: 'i', type: 'image', x: 0, y: 0, src: 's', l: 100, h: 50, m: [0, 1, -1, 0] }
    expect(partDedans(img, cadre(-60, -10, 10, 110), null)).toBe(1)
    expect(prise(partDedans(img, cadre(-60, -10, 10, 60), null))).toBe(true)      // 60 % de la hauteur
    expect(prise(partDedans(img, cadre(-60, -10, 10, 45), null))).toBe(false)
    // Là où serait l'image non tournée (x ∈ [0, 100], y ∈ [0, 50]) : rien
    expect(partDedans(img, cadre(1, 1, 100, 50), null)).toBe(0)
  })
})

describe('le lasso simplifié', () => {
  it('garde ses extrémités et ses coins, et ôte les points alignés', () => {
    // Un L : de (0, 0) à (100, 0), puis à (100, 100), un point tous les 2
    const pts: number[] = []
    for (let x = 0; x <= 100; x += 2) pts.push(x, 0)
    for (let y = 2; y <= 100; y += 2) pts.push(100, y)
    const r = simplifier(pts, 2)
    expect(r).toEqual([0, 0, 100, 0, 100, 100])
  })

  it('un petit tremblement sous la tolérance s\'en va, une bosse au-delà reste', () => {
    const tremble = [0, 0, 25, 1, 50, -1, 75, 1, 100, 0]
    expect(simplifier(tremble, 2)).toEqual([0, 0, 100, 0])
    // Une bosse en pointe : son sommet reste, les points de ses flancs s'en vont
    const bosse = [0, 0, 25, 5, 50, 10, 75, 5, 100, 0]
    expect(simplifier(bosse, 2)).toEqual([0, 0, 50, 10, 100, 0])
  })

  it('un lasso fermé (le dernier point revient près du premier) garde sa forme', () => {
    const q: number[] = []
    for (let i = 0; i <= 200; i++) { const a = 2 * Math.PI * i / 200; q.push(100 * Math.cos(a), 100 * Math.sin(a)) }
    const r = simplifier(q, 2)
    expect(r.length).toBeLessThan(q.length / 2)
    expect(r.slice(0, 2)).toEqual(q.slice(0, 2))
    expect(r.slice(-2)).toEqual(q.slice(-2))
    // Ce qui est dans le cercle reste dans le lasso simplifié
    expect(dedans(0, 0, r)).toBe(true)
    expect(dedans(95, 0, r)).toBe(true)
    expect(dedans(105, 0, r)).toBe(false)
  })

  it('deux points ou moins : tels quels', () => {
    expect(simplifier([1, 2, 3, 4], 2)).toEqual([1, 2, 3, 4])
    expect(simplifier([1, 2], 2)).toEqual([1, 2])
    expect(simplifier([], 2)).toEqual([])
  })

  it('dix mille points sans déborder la pile', () => {
    const q: number[] = []
    for (let i = 0; i < 10000; i++) q.push(i, (i % 7) * 3)
    expect(() => simplifier(q, 2)).not.toThrow()
  })
})

describe('le lasso rangé par bandes', () => {
  it('dit exactement ce que dit dedans (règle pair-impair), lasso tremblé, croisé ou concave', () => {
    // Un générateur pseudo-aléatoire reproductible
    let graine = 12345
    const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648 }
    const lassos: number[][] = []
    // Une boucle tremblée de 300 points
    const tremble: number[] = []
    for (let i = 0; i < 300; i++) { const a = 2 * Math.PI * i / 300, r = 200 + 8 * Math.sin(i / 2); tremble.push(r * Math.cos(a), r * Math.sin(a)) }
    lassos.push(tremble)
    // Un huit (le lasso se croise) et un U (concave)
    lassos.push([0, 0, 100, 100, 100, 0, 0, 100])
    lassos.push([0, 0, 30, 0, 30, 80, 70, 80, 70, 0, 100, 0, 100, 100, 0, 100])
    // Des polygones au hasard
    for (let k = 0; k < 5; k++) { const q: number[] = []; for (let i = 0; i < 40; i++) q.push(hasard() * 300 - 150, hasard() * 300 - 150); lassos.push(q) }
    for (const q of lassos) {
      const vite = dansLasso(q)
      for (let k = 0; k < 2000; k++) {
        const x = hasard() * 500 - 250, y = hasard() * 500 - 250
        expect(vite(x, y)).toBe(dedans(x, y, q))
      }
    }
  })

  it('moins de trois points : rien n\'est dedans', () => {
    expect(dansLasso([0, 0, 10, 10])(5, 5)).toBe(false)
    expect(dansLasso([])(0, 0)).toBe(false)
  })

  it('un lasso tout plat (une ligne) ne prend rien et ne divise pas par zéro', () => {
    const q = [0, 0, 50, 0, 100, 0]
    expect(dansLasso(q)(50, 0)).toBe(dedans(50, 0, q))
    expect(dansLasso(q)(50, 1)).toBe(false)
  })
})
