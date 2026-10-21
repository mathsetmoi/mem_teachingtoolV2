import { describe, expect, it } from 'vitest'
import { THEMES, classerNombre, dansPolygone, dessinEnsembles, DEMONSTRATIONS, ENSEMBLES, ligneEnLatex, lireListe, placeDansZone } from '../src/catalogue'
import type { Boite } from '../src/catalogue'

const ens = (t: string) => { const r = classerNombre(t); return 'erreur' in r ? 'erreur : ' + r.erreur : r.ensemble + (r.doute ? '?' : '') }

describe('Le catalogue : classer un nombre', () => {
  it('le plus petit ensemble qui le contient', () => {
    const attendu: Record<string, string> = {
      '3': 'N', '0': 'N', '−5': 'Z', '-5': 'Z', '2,7': 'D', '-0,25': 'D', '3.5': 'D', '1/3': 'Q', '-2/7': 'Q',
      '7/3': 'Q', '6/3': 'N', '-12/4': 'Z', '3/4': 'D', '1/8': 'D', '1/6': 'Q', '√16': 'N', '√2': 'R', '-√9': 'Z',
      '√(1/4)': 'D', '√0,25': 'D', 'π': 'R', '2π': 'R', 'pi/4': 'R', '1+√2': 'R', '√2×√2': 'N', '√2√8': 'N', '√8/√2': 'N',
      '(√2)^2': 'N', '√2^2': 'N', '10^-2': 'D', '10^3': 'N', '2^-1': 'D', '3^-1': 'Q', '0,333…': 'Q', '0,333...': 'Q',
      '0,1212…': 'Q', '2,5…': 'Q', '\\frac{1}{3}': 'Q', '\\sqrt{2}': 'R', '\\frac{\\sqrt{2}}{2}': 'R', '\\sqrt{\\frac{9}{4}}': 'D',
      '2√3 - 2√3': 'N', 'π - π': 'R?', '1 - 2': 'Z', '1,5 × 4': 'N', '22/7': 'Q', '√(√2)': 'R', 'sqrt(49)': 'N', 'racine(3)': 'R',
    }
    const lu = Object.fromEntries(Object.keys(attendu).map(t => [t, ens(t)]))
    expect(lu).toEqual(attendu)
  })

  it('ce qu\'il ne comprend pas est dit, pas deviné', () => {
    for (const t of ['x', '1/0', '√-4', '', '2+', 'e', '(1']) expect(ens(t)).toMatch(/^erreur/)
  })

  it('l\'écriture au tableau', () => {
    const l = (t: string) => { const r = classerNombre(t); return 'latex' in r ? r.latex : null }
    expect(l('1/3')).toBe('\\frac{1}{3}')
    expect(l('−2,5')).toBe('-2{,}5')
    expect(l('√2')).toBe('\\sqrt{2}')
    expect(l('2π')).toBe('2\\pi')
    expect(l('0,333…')).toBe('0{,}333\\!\\ldots')
    expect(l('-2/7')).toBe('-\\frac{2}{7}')
    expect(l('(1+√5)/2')).toBe('\\frac{1 + \\sqrt{5}}{2}')
    expect(l('10^-2')).toBe('10^{-2}')
  })

  it('la liste : points-virgules ou lignes, la virgule reste celle des décimaux', () => {
    expect(lireListe('−5 ; 2,7;1/3\n√2 ;; ')).toEqual(['−5', '2,7', '1/3', '√2'])
  })
})

describe('Le catalogue : le dessin des ensembles', () => {
  const { ovales, noms } = dessinEnsembles({ x: 100, y: 50 })
  it('chaque ovale est dans le suivant, et chaque nom dans sa zone', () => {
    for (let i = 0; i < 4; i++) {
      const petit = ovales[ENSEMBLES[i]], grand = ovales[ENSEMBLES[i + 1]]
      expect(petit.every(p => dansPolygone(p, grand))).toBe(true)
    }
    for (let i = 0; i < 5; i++) {
      const e = ENSEMBLES[i]
      expect(dansPolygone(noms[e], ovales[e])).toBe(true)
      if (i) expect(dansPolygone(noms[e], ovales[ENSEMBLES[i - 1]])).toBe(false)
    }
  })

  it('les nombres trouvent leur place, sans se chevaucher, jusqu\'à ce que la zone soit pleine', () => {
    for (let i = 0; i < 5; i++) {
      const e = ENSEMBLES[i], ext = ovales[e], int = i ? ovales[ENSEMBLES[i - 1]] : null
      const occupe: Boite[] = [{ x: noms[e].x - 15, y: noms[e].y - 18, l: 30, h: 36 }]
      let n = 0
      for (; n < 40; n++) {
        const c = placeDansZone(ext, int, 46, 38, occupe)
        if (!c) break
        expect(dansPolygone(c, ext)).toBe(true)
        if (int) expect(dansPolygone(c, int)).toBe(false)
        occupe.push({ x: c.x - 23, y: c.y - 19, l: 46, h: 38 })
      }
      // Au moins quatre nombres par zone, même dans ℕ
      expect(n).toBeGreaterThanOrEqual(4)
      expect(n).toBeLessThan(40)
    }
  })
})

describe('Le catalogue : les démonstrations', () => {
  it('le texte passe dans \\text, les maths restent', () => {
    expect(ligneEnLatex('Donc $10^n$ est pair.')).toBe('\\text{Donc }10^n\\text{ est pair.}')
    expect(ligneEnLatex('$p$ et {q}')).toBe('p\\text{ et \\{q\\}}')
  })
  it('toutes les démonstrations du programme de seconde, dans son ordre', () => {
    expect(DEMONSTRATIONS.map(d => d.theme + ' : ' + d.nom)).toEqual([
      'nombres : Somme de deux multiples', 'nombres : Le carré d\'un impair est impair', 'nombres : 1/3 n\'est pas décimal',
      'nombres : √2 n\'est pas rationnel', 'nombres : √(ab) = √a × √b', 'geometrie : Colinéarité et déterminant',
      'geometrie : Équation cartésienne d\'une droite', 'fonctions : Variations des fonctions affines',
      'fonctions : Position de y = x et y = x²', 'fonctions : Variations de la fonction carré',
      'fonctions : Variations de la fonction inverse',
    ])
    for (const d of DEMONSTRATIONS) for (const e of d.etapes) for (const l of e) expect(l.split('$').length % 2).toBe(1)
  })
})

describe('Le catalogue : les thèmes', () => {
  it('chaque démonstration est rangée dans un thème du panneau', () => {
    const ids = new Set(THEMES.map(t => t.id))
    for (const d of DEMONSTRATIONS) expect(ids.has(d.theme)).toBe(true)
  })
})

describe('Le catalogue : KaTeX lit chaque ligne', () => {
  it('aucune erreur de rendu, ni dans les titres ni dans les étapes', async () => {
    const katex = (await import('katex')).default
    for (const d of DEMONSTRATIONS) {
      expect(() => katex.renderToString(d.titre, { throwOnError: true })).not.toThrow()
      for (const e of d.etapes) for (const l of e) expect(() => katex.renderToString(ligneEnLatex(l), { throwOnError: true }), l).not.toThrow()
    }
  })
})
