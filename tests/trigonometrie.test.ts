import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { ligneEnLatex } from '../src/catalogue'
import {
  ANGLES, avecTrous, cercleTrigo, courbesTrigo, enroulement, ficheAvecTrous, FORMULES, lireReels,
  LONGUEUR_DEMI_DROITE, placeDuReel, RAYON_CERCLE, RAYON_ENROULEMENT, texteEnLatex, UN_TOUR,
} from '../src/trigonometrie'

const o = { x: 1000, y: 800 }
const proche = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9)

describe('Trigonométrie : les étiquettes', () => {
  it('l\'écriture simple devient une formule', () => {
    expect(texteEnLatex('π/6')).toBe('\\dfrac{\\pi}{6}')
    expect(texteEnLatex('−5π/6')).toBe('-\\dfrac{5\\pi}{6}')
    expect(texteEnLatex('√3/2')).toBe('\\dfrac{\\sqrt{3}}{2}')
    expect(texteEnLatex('M(π/3)')).toBe('M(\\tfrac{\\pi}{3})')
    expect(texteEnLatex('3π/2', true)).toBe('\\tfrac{3\\pi}{2}')
    expect(texteEnLatex('30°')).toBe('30^{\\circ}')
    expect(texteEnLatex('2,5')).toBe('2{,}5')
    expect(texteEnLatex('cos')).toBe('\\cos')
  })
  it('KaTeX lit toutes les étiquettes de tous les dessins', () => {
    const dessins = [
      ...(['vide', 'points', 'valeurs'] as const).flatMap(v => [cercleTrigo(o, v, false), cercleTrigo(o, v, true)]),
      ...(['cos', 'sin', 'les-deux'] as const).map(q => courbesTrigo(o, q)),
      enroulement(o, 2, { reperes: 'les-deux', deuxSens: true, reels: lireReels('π/3 ; −3π/4 ; 2,5').reels }),
    ]
    for (const d of dessins) for (const e of d.etiquettes)
      expect(() => katex.renderToString(e.latex ?? texteEnLatex(e.texte), { throwOnError: true }), e.texte).not.toThrow()
  })
})

describe('Trigonométrie : le cercle', () => {
  it('seize points remarquables, sur le cercle, chacun avec son réel', () => {
    const d = cercleTrigo(o, 'points', false)
    expect(ANGLES).toHaveLength(16)
    expect(d.points).toHaveLength(16)
    for (const p of d.points) proche(Math.hypot(p.p.x - o.x, p.p.y - o.y), RAYON_CERCLE)
    for (const [, t] of ANGLES) expect(d.etiquettes.some(e => e.texte === t), t).toBe(true)
    // π/6 est en haut à droite (y vers le bas)
    const i = ANGLES.findIndex(a => a[1] === 'π/6')
    expect(d.points[i].p.x).toBeGreaterThan(o.x); expect(d.points[i].p.y).toBeLessThan(o.y)
  })
  it('vide : ni point ni réel ; valeurs : les projections et cos, sin', () => {
    expect(cercleTrigo(o, 'vide', false).points).toHaveLength(0)
    const v = cercleTrigo(o, 'valeurs', false)
    expect(v.lignes.filter(l => l.tirets)).toHaveLength(7)
    for (const t of ['1/2', '√2/2', '√3/2']) expect(v.etiquettes.filter(e => e.texte === t)).toHaveLength(2)
    expect(cercleTrigo(o, 'points', true).etiquettes.some(e => e.texte === '45°')).toBe(true)
  })
})

describe('Trigonométrie : l\'enroulement', () => {
  it('au départ, la droite est la tangente en I ; le réel t est à la hauteur t', () => {
    const q = placeDuReel(2, 0, true)
    proche(q.x, 1); proche(q.y, 2); expect(q.enroule).toBe(false)
    const n = placeDuReel(-1.5, 0, true)
    proche(n.x, 1); proche(n.y, -1.5)
  })
  it('enroulé, le réel t vient en (cos t ; sin t), dans les deux sens', () => {
    for (const t of [Math.PI / 3, 3 * Math.PI / 4, -Math.PI / 2, 2.5]) {
      const q = placeDuReel(t, UN_TOUR, true)
      proche(q.x, Math.cos(t)); proche(q.y, Math.sin(t)); expect(q.enroule).toBe(true)
    }
    // Sens direct seulement : la moitié négative reste droite
    const q = placeDuReel(-1, UN_TOUR, false)
    proche(q.x, 1); proche(q.y, -1); expect(q.enroule).toBe(false)
  })
  it('ce qui n\'est pas encore enroulé reste à sa distance, sur la tangente', () => {
    // La longueur entre le dernier point enroulé et le réel t est t − s
    const s = 1, t = 3, q = placeDuReel(t, s, true)
    proche(Math.hypot(q.x - Math.cos(s), q.y - Math.sin(s)), t - s)
  })
  it('les repères au choix, et les réels tapés en vert', () => {
    const textes = (r: 'aucun' | 'remarquables' | 'entiers' | 'les-deux') => enroulement(o, 0, { reperes: r, deuxSens: true, reels: [] }).etiquettes.map(e => e.texte)
    expect(textes('aucun')).not.toContain('π')
    expect(textes('aucun')).not.toContain('1')
    expect(textes('remarquables')).toContain('3π/2')
    expect(textes('remarquables')).not.toContain('1')
    expect(textes('entiers')).toContain('−3')
    expect(textes('entiers')).not.toContain('π')
    expect(textes('les-deux')).toEqual(expect.arrayContaining(['π', '2', '−π/2']))
    const d = enroulement(o, UN_TOUR, { reperes: 'aucun', deuxSens: true, reels: lireReels('π/3').reels })
    expect(d.etiquettes.some(e => e.texte === 'M(π/3)')).toBe(true)
    proche(d.points[0].p.x, o.x + RAYON_ENROULEMENT / 2)
  })
  it('lire les réels : π/3, −3π/4, 2,5, pi/2 ; le reste est dit', () => {
    const { reels, erreurs } = lireReels('π/3 ; −3π/4 ; 2,5 ; pi/2 ; 13π/6 ; abc ; 20')
    expect(reels.map(r => r.texte)).toEqual(['π/3', '−3π/4', '2,5', 'π/2', '13π/6'])
    proche(reels[1].v, -3 * Math.PI / 4); proche(reels[2].v, 2.5)
    expect(erreurs).toEqual(['abc', '20'])
    expect(13 * Math.PI / 6).toBeLessThan(LONGUEUR_DEMI_DROITE)
  })
})

describe('Trigonométrie : les formules', () => {
  it('à trous : le contenu laisse un blanc de sa largeur', () => {
    expect(avecTrous('$a = \\trou{\\dfrac{\\sqrt{3}}{2}}$', false)).toBe('$a = \\dfrac{\\sqrt{3}}{2}$')
    expect(avecTrous('$a = \\trou{1}$', true)).toBe('$a = \\underline{\\quad\\hphantom{1}\\quad}$')
  })
  it('cinq fiches, en 1re spé, chapitre Trigonométrie', () => {
    expect(FORMULES.map(f => f.nom)).toEqual(['Radians et degrés', 'Mesure principale', 'Relations entre cos et sin', 'Valeurs remarquables', 'Fonctions cosinus et sinus'])
    for (const f of FORMULES) { expect(f.niveau).toBe('1re'); expect(f.chapitre).toBe('Trigonométrie'); expect(f.formules).toBe(true) }
  })
  it('KaTeX lit chaque ligne, avec et sans trous', () => {
    for (const trous of [false, true]) for (const f of FORMULES.map(x => ficheAvecTrous(x, trous))) {
      expect(() => katex.renderToString(f.titre, { throwOnError: true })).not.toThrow()
      for (const e of f.etapes) for (const l of e) {
        expect(l.split('$').length % 2, l).toBe(1)
        expect(l).not.toContain('\\trou')
        expect(() => katex.renderToString(ligneEnLatex(l), { throwOnError: true }), l).not.toThrow()
      }
    }
  })
})
