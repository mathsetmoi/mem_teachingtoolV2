// Les petits outils de classe : ce qui se calcule sans l'écran. La durée
// tapée pour le minuteur, le temps affiché, la liste des élèves collée et
// le tirage au sort sans remise.
import { describe, expect, it } from 'vitest'
import { formaterTemps, lireDuree, lireListe, tirer } from '../src/outils-classe'

describe('lireDuree', () => {
  it('comprend les façons courantes de dire une durée', () => {
    expect(lireDuree('5')).toBe(300_000)
    expect(lireDuree('5 min')).toBe(300_000)
    expect(lireDuree('2,5')).toBe(150_000)
    expect(lireDuree('4:30')).toBe(270_000)
    expect(lireDuree('90 s')).toBe(90_000)
    expect(lireDuree('3 min 20')).toBe(200_000)
    expect(lireDuree('  10 MIN ')).toBe(600_000)
  })
  it('refuse ce qui n’est pas une durée raisonnable', () => {
    expect(lireDuree('')).toBeNull()
    expect(lireDuree('bonjour')).toBeNull()
    expect(lireDuree('4:75')).toBeNull()
    expect(lireDuree('0')).toBeNull()
    expect(lireDuree('500')).toBeNull()
  })
})

describe('formaterTemps', () => {
  it('affiche minutes et secondes, arrondies vers le haut', () => {
    expect(formaterTemps(272_000)).toBe('04:32')
    expect(formaterTemps(1)).toBe('00:01')
    expect(formaterTemps(0)).toBe('00:00')
    expect(formaterTemps(-5)).toBe('00:00')
    expect(formaterTemps(3_900_000)).toBe('1:05:00')
  })
})

describe('lireListe', () => {
  it('un élève par ligne, sans vides ni doublons', () => {
    expect(lireListe('Léa\n\n  Tom  \nlea\r\nInès;Hugo\tZoé')).toEqual(['Léa', 'Tom', 'Inès', 'Hugo', 'Zoé'])
  })
})

describe('tirer', () => {
  const noms = ['A', 'B', 'C']
  it('ne tire jamais deux fois le même élève dans un tour', () => {
    let passes: string[] = []
    const vus = new Set<string>()
    for (let i = 0; i < 3; i++) {
      const r = tirer(noms, passes)!
      expect(vus.has(r.nom)).toBe(false)
      vus.add(r.nom); passes = r.passes
    }
    expect(vus.size).toBe(3)
  })
  it('recommence un tour sans rouvrir sur le dernier tiré', () => {
    const r = tirer(noms, ['A', 'B', 'C'], () => 0)!
    expect(r.nom).not.toBe('C')
    expect(r.passes).toEqual([r.nom])
  })
  it('oublie les élèves retirés de la liste, et rien sans liste', () => {
    expect(tirer(['A', 'B'], ['X', 'A'], () => 0)).toEqual({ nom: 'B', passes: ['A', 'B'] })
    expect(tirer([], [])).toBeNull()
  })
})
