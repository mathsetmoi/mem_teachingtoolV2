// Le tirage d'un flash d'automatismes (src/automatismes.ts) et le réglage
// gardé sur l'appareil (src/flash.ts) : par défaut 2 questions de cours
// puis 3 exercices d'application, tous à réponse courte ; aucune question
// ne se réussit avec une chance sur deux ; les questions à trou ont bien
// un trou ; un thème sans question de cours donne un exercice à la place.
import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { AUTOMATISMES_1RE, AUTOMATISMES_2NDE, AUTOMATISMES_4E, AUTOMATISMES_5E, COMPOSITION_PAR_DEFAUT, COURS_1RE, COURS_2NDE, COURS_4E, COURS_5E, NIVEAUX, themesDe, tirerFlash } from '../src/automatismes'
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
    for (const c of COURS_5E) for (let k = 0; k < 40; k++) {
      const q = c.poser()
      expect(q.reponse, c.id).toMatch(/^§./)
      expect(q.reponse, c.id).not.toMatch(/^§(Oui|Non|positif|négatif|vrai|faux)\b/i)
      expect(q.enonce, c.id).not.toMatch(/^(Est-ce|Peut-on) /)
    }
  })

  it('chaque thème de 5e a ses questions de cours', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    for (const t of themesDe(cinq)) expect(coursDu(t).length, t).toBeGreaterThanOrEqual(2)
    expect(new Set(COURS_5E.map(c => c.id)).size).toBe(COURS_5E.length)
  })

  it('les questions de cours : 4 notions au moins par thème, et plusieurs façons de les poser', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    for (const t of themesDe(cinq)) if (t !== 'Hors liste officielle') expect(coursDu(t).length, t).toBeGreaterThanOrEqual(4)
    let variees = 0
    for (const c of COURS_5E) {
      const vus = new Set<string>()
      for (let k = 0; k < 40; k++) vus.add(c.poser().enonce)
      if (vus.size > 1) variees++
    }
    expect(variees).toBeGreaterThanOrEqual(COURS_5E.length * 0.6)
  })

  it('rien de fixe : chaque façon de poser une notion tire quelque chose au hasard', () => {
    for (const c of COURS_5E) c.facons.forEach((f, i) => {
      const vus = new Set<string>()
      for (let k = 0; k < 60; k++) vus.add(f()[0])
      expect(vus.size, `${c.id}, façon ${i + 1} : « ${f()[0]} »`).toBeGreaterThan(1)
    })
  })

  it('la divisibilité : trois diviseurs qui changent, et la bonne liste', () => {
    const a = AUTOMATISMES_5E.find(x => x.id === 'divisibilite-2-5-10')!
    const listes = new Set<string>()
    for (let k = 0; k < 200; k++) {
      const q = a.generer()
      const m = /nombres (.*) le nombre \$(\d+)\$/.exec(q.enonce)!
      const d = [...m[1].matchAll(/\$(\d+)\$/g)].map(x => Number(x[1]))
      expect(d.length).toBe(3)
      listes.add(d.join(','))
      const oui = d.filter(k => Number(m[2]) % k === 0)
      const dits = [...q.reponse.matchAll(/\$(\d+)\$/g)].map(x => Number(x[1]))
      expect(dits).toEqual(oui)
    }
    expect(listes.size).toBeGreaterThan(3)
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
    // Le 3e n'a pas encore d'automatismes ; la 2nde et la 1re en ont depuis le lot de la 2nde et de la 1re
    expect(lireReglages(JSON.stringify({ niveaux: ['3e', '5e', 'x'] })).niveaux).toEqual(['5e'])
    expect(lireReglages(JSON.stringify({ niveaux: ['3e'] })).niveaux).toEqual(['5e'])
    expect(lireReglages(JSON.stringify({ niveaux: ['2nde', '1re'] })).niveaux).toEqual(['2nde', '1re'])
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

describe('les automatismes de 4e', () => {
  const quatre = NIVEAUX.find(n => n.id === '4e')!
  it('le niveau 4e a ses automatismes et ses questions de cours, thème par thème', () => {
    expect(AUTOMATISMES_4E.length).toBeGreaterThanOrEqual(40)
    for (const t of themesDe(quatre)) expect(COURS_4E.filter(c => c.theme === t).length, t).toBeGreaterThanOrEqual(1)
    const ids = [...AUTOMATISMES_5E, ...AUTOMATISMES_4E, ...COURS_5E, ...COURS_4E].map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('par défaut : 2 questions de cours de 4e, puis 3 exercices', () => {
    for (let k = 0; k < 50; k++) {
      const { questions } = tirerFlash(AUTOMATISMES_4E, COURS_4E, COMPOSITION_PAR_DEFAUT)
      expect(questions.map(q => q.forme)).toEqual(['cours', 'cours', 'application', 'application', 'application'])
    }
  })

  it('réponse courte, jamais une chance sur deux, et les trous ont un trou', () => {
    for (const a of AUTOMATISMES_4E) for (let k = 0; k < 40; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) {
        expect(q.reponse, a.id).not.toBe('')
        expect(q.reponse, a.id).not.toMatch(/^§(Oui|Non)\b/)
        expect(q.reponse, a.id).not.toMatch(/^[<>=]$/)
        expect(q.enonce, a.id).not.toMatch(/…$|:$|^Est-ce /)
      }
      if (a.trou) expect(a.trou().enonce, a.id).toMatch(/\\ldots|…/)
    }
  })

  it('rien de fixe dans les questions de cours de 4e', () => {
    for (const c of COURS_4E) c.facons.forEach((f, i) => {
      const vus = new Set<string>()
      for (let k = 0; k < 60; k++) vus.add(f()[0])
      expect(vus.size, `${c.id}, façon ${i + 1} : « ${f()[0]} »`).toBeGreaterThan(1)
    })
  })

  it('toutes les formules (5e et 4e) s\'écrivent sans erreur', () => {
    const verifier = (t: string, id: string) => {
      const morceaux = t.startsWith('§') || /\$/.test(t) ? t.replace(/^§/, '').split('$').filter((_, i) => i % 2) : [t]
      for (const m of morceaux) expect(() => katex.renderToString(m, { throwOnError: true }), `${id} : ${m}`).not.toThrow()
    }
    for (const a of [...AUTOMATISMES_5E, ...AUTOMATISMES_4E]) for (let k = 0; k < 20; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) { verifier(q.enonce, a.id); if (!q.reponse.startsWith('<svg')) verifier(q.reponse, a.id) }
    }
    for (const c of [...COURS_5E, ...COURS_4E]) for (let k = 0; k < 20; k++) { const q = c.poser(); verifier(q.enonce, c.id); verifier(q.reponse, c.id) }
  })
})

describe('les automatismes de 2nde et de 1re (épreuve anticipée)', () => {
  const lycee: [string, typeof AUTOMATISMES_2NDE, typeof COURS_2NDE][] = [['2nde', AUTOMATISMES_2NDE, COURS_2NDE], ['1re', AUTOMATISMES_1RE, COURS_1RE]]
  it('les deux niveaux ont leurs automatismes et leurs questions de cours, thème par thème', () => {
    expect(AUTOMATISMES_2NDE.length).toBeGreaterThanOrEqual(28)
    expect(AUTOMATISMES_1RE.length).toBeGreaterThanOrEqual(18)
    for (const [id, autos, cours] of lycee) {
      const n = NIVEAUX.find(x => x.id === id)!
      expect(n.automatismes).toBe(autos)
      for (const t of themesDe(n)) expect(cours.filter(c => c.theme === t).length, `${id} ${t}`).toBeGreaterThanOrEqual(3)
    }
    const ids = [...AUTOMATISMES_5E, ...AUTOMATISMES_4E, ...AUTOMATISMES_2NDE, ...AUTOMATISMES_1RE, ...COURS_5E, ...COURS_4E, ...COURS_2NDE, ...COURS_1RE].map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('les thèmes suivent la liste officielle, dans son ordre', () => {
    const ordre = ['Calcul numérique et algébrique', 'Proportions et pourcentages', 'Évolutions et variations', 'Fonctions et représentations', 'Statistiques', 'Probabilités']
    expect(themesDe(NIVEAUX.find(x => x.id === '2nde')!)).toEqual(ordre)
    expect(themesDe(NIVEAUX.find(x => x.id === '1re')!)).toEqual(ordre.filter(t => t !== 'Proportions et pourcentages'))
  })

  it('réponse courte, jamais une chance sur deux, et les trous ont un trou', () => {
    for (const [, autos] of lycee) for (const a of autos) for (let k = 0; k < 60; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) {
        expect(q.reponse, a.id).not.toBe('')
        expect(q.reponse, a.id).not.toMatch(/^§(Oui|Non)\b/)
        expect(q.reponse, a.id).not.toMatch(/^[<>=]$/)
        expect(q.reponse, a.id).not.toMatch(/NaN|undefined|Infinity/)
        expect(q.enonce, a.id).not.toMatch(/NaN|undefined|Infinity/)
        expect(q.enonce, a.id).not.toMatch(/…$|:$|^Est-ce /)
      }
      if (a.trou) expect(a.trou().enonce, a.id).toMatch(/\\ldots|…/)
    }
  })

  it('rien de fixe : chaque exercice et chaque façon de poser une notion tire quelque chose au hasard', () => {
    for (const [, autos, cours] of lycee) {
      for (const a of autos) {
        const vus = new Set<string>()
        for (let k = 0; k < 60; k++) { const q = a.generer(); vus.add(q.enonce + (q.figure ?? '')) }
        expect(vus.size, a.id).toBeGreaterThan(5)
      }
      for (const c of cours) c.facons.forEach((f, i) => {
        const vus = new Set<string>()
        for (let k = 0; k < 60; k++) vus.add(f()[0])
        expect(vus.size, `${c.id}, façon ${i + 1} : « ${f()[0]} »`).toBeGreaterThan(1)
      })
    }
  })

  it('toutes les formules s\'écrivent sans erreur', () => {
    const verifier = (t: string, id: string) => {
      const morceaux = t.startsWith('§') || /\$/.test(t) ? t.replace(/^§/, '').split('$').filter((_, i) => i % 2) : [t]
      for (const m of morceaux) expect(() => katex.renderToString(m, { throwOnError: true }), `${id} : ${m}`).not.toThrow()
    }
    for (const [, autos, cours] of lycee) {
      for (const a of autos) for (let k = 0; k < 30; k++) for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) { verifier(q.enonce, a.id); verifier(q.reponse, a.id) }
      for (const c of cours) for (let k = 0; k < 20; k++) { const q = c.poser(); verifier(q.enonce, c.id); verifier(q.reponse, c.id) }
    }
  })

  it('les figures sont des dessins SVG bien formés', () => {
    for (const [, autos] of lycee) for (const a of autos) for (let k = 0; k < 20; k++) {
      const f = a.generer().figure
      if (!f) continue
      expect(f, a.id).toMatch(/^<svg [^>]*viewBox="[-\d. ]+"/)
      expect(f, a.id).not.toMatch(/NaN|undefined/)
      // Aucun attribut écrit deux fois dans une balise (le dessin ne s'afficherait pas)
      for (const balise of f.match(/<[a-z]+ [^>]*>/g) ?? []) {
        const noms = [...balise.matchAll(/ ([a-z-]+)="/g)].map(m => m[1])
        expect(new Set(noms).size, `${a.id} : ${balise}`).toBe(noms.length)
      }
    }
  })
})

describe('la lecture graphique des courbes de 2nde et de 1re', () => {
  const lire = (id: string) => AUTOMATISMES_1RE.find(a => a.id === id) ?? AUTOMATISMES_2NDE.find(a => a.id === id)!
  it('les solutions lues sur une courbe sont des ensembles ou des intervalles', () => {
    for (let k = 0; k < 200; k++) {
      const q = lire('1re-resoudre-graphique').generer()
      expect(q.reponse).toMatch(/^S = /)
      expect(q.figure).toBeTruthy()
    }
  })
})
