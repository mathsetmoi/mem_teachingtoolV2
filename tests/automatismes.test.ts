// Le tirage d'un flash d'automatismes (src/automatismes.ts) et le réglage
// gardé sur l'appareil (src/flash.ts) : par défaut 2 QCM, 2 questions
// directes et 1 question à trou, dans cet ordre ; les questions à trou
// ont bien un trou ; un thème sans question à trou en donne une directe.
import { describe, expect, it } from 'vitest'
import { AUTOMATISMES_5E, COMPOSITION_PAR_DEFAUT, NIVEAUX, themesDe, tirerFlash } from '../src/automatismes'
import { automatismesChoisis, lireReglages, REGLAGES_PAR_DEFAUT } from '../src/flash'

const duTheme = (t: string) => AUTOMATISMES_5E.filter(a => a.theme === t)

describe('le tirage d\'un flash', () => {
  it('par défaut : 2 QCM, 2 questions directes, 1 question à trou, dans cet ordre', () => {
    expect(COMPOSITION_PAR_DEFAUT).toEqual({ qcm: 2, directe: 2, trou: 1 })
    for (let k = 0; k < 50; k++) {
      const { questions, trousRemplaces } = tirerFlash(AUTOMATISMES_5E, COMPOSITION_PAR_DEFAUT)
      expect(questions.map(q => q.forme)).toEqual(['qcm', 'qcm', 'directe', 'directe', 'trou'])
      expect(trousRemplaces).toBe(0)
      for (const q of questions.filter(x => x.forme === 'qcm')) {
        expect(q.options).toContain(q.q.reponse)
        expect(new Set(q.options).size).toBe(q.options.length)
      }
      for (const q of questions.filter(x => x.forme !== 'qcm')) expect(q.auto.qcmSeulement).toBeFalsy()
    }
  })

  it('pas deux fois le même automatisme tant qu\'il en reste', () => {
    const { questions } = tirerFlash(duTheme('Nombres relatifs'), { qcm: 3, directe: 0, trou: 0 })
    expect(new Set(questions.map(q => q.auto.id)).size).toBe(3)
  })

  it('chaque question à trou a un trou, et une réponse', () => {
    const avecTrou = AUTOMATISMES_5E.filter(a => a.trou)
    expect(avecTrou.length).toBeGreaterThanOrEqual(25)
    for (const a of avecTrou) for (let k = 0; k < 40; k++) {
      const q = a.trou!()
      expect(q.enonce, a.id).toMatch(/\\ldots|…|<, \$>\$ ou/)
      expect(q.reponse, a.id).not.toBe('')
    }
  })

  it('un thème sans question à trou : une question directe à la place', () => {
    const angles = duTheme('Angles')
    expect(angles.some(a => a.trou)).toBe(false)
    const { questions, trousRemplaces } = tirerFlash(angles, { qcm: 0, directe: 1, trou: 2 })
    expect(questions.map(q => q.forme)).toEqual(['directe', 'directe', 'directe'])
    expect(trousRemplaces).toBe(2)
  })

  it('des dessins seulement (patrons, vues, perspective) : des QCM', () => {
    const dessins = AUTOMATISMES_5E.filter(a => a.qcmSeulement)
    expect(dessins.map(a => a.id).sort()).toEqual(['cavaliere', 'patron-cube', 'vues-cubes'])
    const { questions } = tirerFlash(dessins, { qcm: 0, directe: 2, trou: 0 })
    expect(questions.map(q => q.forme)).toEqual(['qcm', 'qcm'])
  })

  it('aucun automatisme : aucune question', () => {
    expect(tirerFlash([], COMPOSITION_PAR_DEFAUT).questions).toEqual([])
  })
})

describe('le réglage du flash', () => {
  it('un réglage absent ou illisible : par défaut (5e, rien de coché, 2 + 2 + 1, une à la fois, 30 s)', () => {
    for (const t of [null, '', '{', '"x"', '[]']) expect(lireReglages(t)).toEqual(REGLAGES_PAR_DEFAUT)
    expect(REGLAGES_PAR_DEFAUT).toMatchObject({ niveaux: ['5e'], themes: [], qcm: 2, directe: 2, trou: 1, affichage: 'une', parQuestion: 30 })
  })

  it('les nombres restent entre 0 et 10, et un flash a au moins une question', () => {
    const r = lireReglages(JSON.stringify({ qcm: 40, directe: -3, trou: 2.6, parQuestion: 1, minutes: 900 }))
    expect(r).toMatchObject({ qcm: 10, directe: 0, trou: 3, parQuestion: 5, minutes: 60 })
    expect(lireReglages(JSON.stringify({ qcm: 0, directe: 0, trou: 0 }))).toMatchObject(COMPOSITION_PAR_DEFAUT)
  })

  it('un niveau sans automatismes (bientôt) ne se garde pas', () => {
    expect(lireReglages(JSON.stringify({ niveaux: ['2nde', '5e', 'x'] })).niveaux).toEqual(['5e'])
    expect(lireReglages(JSON.stringify({ niveaux: ['1re'] })).niveaux).toEqual(['5e'])
  })

  it('les automatismes choisis : ceux des thèmes cochés, dans les niveaux cochés', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    expect(themesDe(cinq)).toContain('Nombres relatifs')
    const r = { ...REGLAGES_PAR_DEFAUT, themes: ['5e/Nombres relatifs', '5e/Angles'] }
    expect(automatismesChoisis(r).map(a => a.id).sort()).toEqual([...duTheme('Nombres relatifs'), ...duTheme('Angles')].map(a => a.id).sort())
    expect(automatismesChoisis({ ...r, niveaux: [] })).toEqual([])
  })
})

describe('les thèmes chacun leur tour', () => {
  it('deux thèmes, l\'un de 9 automatismes et l\'autre de 3 : chacun a sa part', () => {
    const autos = [...duTheme('Opérations'), ...duTheme('Triangles')]
    for (let k = 0; k < 30; k++) {
      const { questions } = tirerFlash(autos, { qcm: 2, directe: 2, trou: 0 })
      expect(questions.filter(q => q.auto.theme === 'Triangles').length).toBe(2)
    }
  })
})
