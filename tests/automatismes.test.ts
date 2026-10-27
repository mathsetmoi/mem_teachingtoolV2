// Le tirage d'un flash d'automatismes (src/automatismes.ts) et le réglage
// gardé sur l'appareil (src/flash.ts) : par défaut 2 questions de cours
// puis 3 exercices d'application, tous à réponse courte ; aucune question
// ne se réussit avec une chance sur deux ; les questions à trou ont bien
// un trou ; un thème sans question de cours donne un exercice à la place.
import { describe, expect, it } from 'vitest'
import { AUTOMATISMES_5E, COMPOSITION_PAR_DEFAUT, COURS_5E, NIVEAUX, themesDe, tirerFlash } from '../src/automatismes'
import { automatismesChoisis, coursChoisis, lireReglages, REGLAGES_PAR_DEFAUT } from '../src/flash'
import { caseOpposee, estPatronDeCube, hexomino } from '../src/figures'

const duTheme = (t: string) => AUTOMATISMES_5E.filter(a => a.theme === t)
const coursDu = (t: string) => COURS_5E.filter(c => c.theme === t)

describe('le tirage d\'un flash', () => {
  it('par défaut : 2 questions de cours, puis 3 exercices d\'application', () => {
    expect(COMPOSITION_PAR_DEFAUT).toEqual({ cours: 2, application: 3 })
    for (let k = 0; k < 50; k++) {
      const { questions, coursRemplaces } = tirerFlash(AUTOMATISMES_5E, COURS_5E, COMPOSITION_PAR_DEFAUT)
      expect(questions.map(q => q.forme)).toEqual(['cours', 'cours', 'application', 'application', 'application'])
      expect(coursRemplaces).toBe(0)
      for (const q of questions) expect(q.q.reponse).not.toBe('')
    }
  })

  it('pas deux fois le même automatisme tant qu\'il en reste', () => {
    const { questions } = tirerFlash(duTheme('Nombres relatifs'), [], { cours: 0, application: 3 })
    expect(new Set(questions.map(q => q.id)).size).toBe(3)
    const lecons = tirerFlash([], coursDu('Triangles'), { cours: 5, application: 0 }).questions
    expect(new Set(lecons.map(q => q.id)).size).toBe(5)
  })

  it('les questions à trou se mélangent aux exercices d\'application', () => {
    const trous = new Set<string>()
    for (let k = 0; k < 60; k++) {
      for (const q of tirerFlash(duTheme('Opérations'), [], { cours: 0, application: 4 }).questions) trous.add(/\\ldots|…/.test(q.q.enonce) ? 'trou' : 'directe')
    }
    expect([...trous].sort()).toEqual(['directe', 'trou'])
  })

  it('chaque question à trou a un trou, et une réponse', () => {
    const avecTrou = AUTOMATISMES_5E.filter(a => a.trou)
    expect(avecTrou.length).toBeGreaterThanOrEqual(25)
    for (const a of avecTrou) for (let k = 0; k < 40; k++) {
      const q = a.trou!()
      expect(q.enonce, a.id).toMatch(/\\ldots|…/)
      expect(q.reponse, a.id).not.toBe('')
    }
  })

  it('aucune question ne se réussit avec une chance sur deux (ni oui ou non, ni dessin à choisir)', () => {
    for (const a of AUTOMATISMES_5E) for (let k = 0; k < 40; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) {
        expect(q.reponse, a.id).not.toMatch(/^§(Oui|Non)\b/)
        expect(q.reponse, a.id).not.toMatch(/^<svg/)
        expect(q.reponse, a.id).not.toMatch(/^[<>=]$/)
        expect(q.enonce, a.id).not.toMatch(/…$|:$|^Est-ce |^(Ce tableau|La droite|La figure|La demi-droite)\b.*est-(il|elle) /)
      }
    }
    for (const c of COURS_5E) expect(c.reponse, c.id).not.toMatch(/^§(Oui|Non|positif|négatif)\b/)
  })

  it('chaque thème de 5e a ses questions de cours', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    for (const t of themesDe(cinq)) expect(coursDu(t).length, t).toBeGreaterThanOrEqual(2)
    expect(new Set(COURS_5E.map(c => c.id)).size).toBe(COURS_5E.length)
  })

  it('un thème sans question de cours : un exercice d\'application à la place', () => {
    const { questions, coursRemplaces } = tirerFlash(duTheme('Angles'), [], { cours: 2, application: 1 })
    expect(questions.map(q => q.forme)).toEqual(['application', 'application', 'application'])
    expect(coursRemplaces).toBe(2)
  })

  it('aucun automatisme : aucune question', () => {
    expect(tirerFlash([], [], COMPOSITION_PAR_DEFAUT).questions).toEqual([])
  })
})

describe('les questions reformulées', () => {
  it('le patron : la face opposée est une autre face du patron', () => {
    for (let k = 0; k < 200; k++) {
      let c = hexomino()
      while (!estPatronDeCube(c)) c = hexomino()
      for (let i = 0; i < 6; i++) {
        const o = caseOpposee(c, i)
        expect(o).toBeGreaterThanOrEqual(0)
        expect(o).not.toBe(i)
        expect(caseOpposee(c, o)).toBe(i)
      }
    }
  })

  it('ranger trois fractions : la réponse est dans l\'ordre croissant', () => {
    const a = AUTOMATISMES_5E.find(x => x.id === 'comparer-fractions')!
    const valeur = (t: string) => { const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(t); return m ? Number(m[1]) / Number(m[2]) : Number(t.replace('{,}', '.')) }
    for (let k = 0; k < 100; k++) {
      const v = a.generer().reponse.split(' < ').map(valeur)
      expect(v.length).toBe(3)
      expect(v[0] < v[1] && v[1] < v[2]).toBe(true)
    }
  })
})

describe('le réglage du flash', () => {
  it('un réglage absent ou illisible : par défaut (5e, rien de coché, 2 + 3, une à la fois, 30 s)', () => {
    for (const t of [null, '', '{', '"x"', '[]']) expect(lireReglages(t)).toEqual(REGLAGES_PAR_DEFAUT)
    expect(REGLAGES_PAR_DEFAUT).toMatchObject({ niveaux: ['5e'], themes: [], cours: 2, application: 3, affichage: 'une', parQuestion: 30 })
  })

  it('un réglage d\'avant (QCM, directes, à trou) garde ses thèmes et repasse à 2 + 3', () => {
    const r = lireReglages(JSON.stringify({ themes: ['5e/Angles'], qcm: 4, directe: 1, trou: 0, affichage: 'toutes' }))
    expect(r).toMatchObject({ themes: ['5e/Angles'], cours: 2, application: 3, affichage: 'toutes' })
  })

  it('les nombres restent entre 0 et 10, et un flash a au moins une question', () => {
    const r = lireReglages(JSON.stringify({ cours: 40, application: 2.6, parQuestion: 1, minutes: 900 }))
    expect(r).toMatchObject({ cours: 10, application: 3, parQuestion: 5, minutes: 60 })
    expect(lireReglages(JSON.stringify({ cours: -3, application: 4 }))).toMatchObject({ cours: 0, application: 4 })
    expect(lireReglages(JSON.stringify({ cours: 0, application: 0 }))).toMatchObject(COMPOSITION_PAR_DEFAUT)
  })

  it('un niveau sans automatismes (bientôt) ne se garde pas', () => {
    expect(lireReglages(JSON.stringify({ niveaux: ['2nde', '5e', 'x'] })).niveaux).toEqual(['5e'])
    expect(lireReglages(JSON.stringify({ niveaux: ['1re'] })).niveaux).toEqual(['5e'])
  })

  it('les questions choisies : celles des thèmes cochés, dans les niveaux cochés', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    expect(themesDe(cinq)).toContain('Nombres relatifs')
    const r = { ...REGLAGES_PAR_DEFAUT, themes: ['5e/Nombres relatifs', '5e/Angles'] }
    expect(automatismesChoisis(r).map(a => a.id).sort()).toEqual([...duTheme('Nombres relatifs'), ...duTheme('Angles')].map(a => a.id).sort())
    expect(coursChoisis(r).map(c => c.id).sort()).toEqual([...coursDu('Nombres relatifs'), ...coursDu('Angles')].map(c => c.id).sort())
    expect(automatismesChoisis({ ...r, niveaux: [] })).toEqual([])
    expect(coursChoisis({ ...r, niveaux: [] })).toEqual([])
  })
})

describe('les thèmes chacun leur tour', () => {
  it('deux thèmes, l\'un de 9 automatismes et l\'autre de 3 : chacun a sa part', () => {
    const autos = [...duTheme('Opérations'), ...duTheme('Triangles')]
    for (let k = 0; k < 30; k++) {
      const { questions } = tirerFlash(autos, [], { cours: 0, application: 4 })
      expect(questions.filter(q => q.theme === 'Triangles').length).toBe(2)
    }
  })
})
