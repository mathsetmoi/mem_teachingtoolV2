// Le tirage d'un flash d'automatismes (src/automatismes.ts) et le réglage
// gardé sur l'appareil (src/flash.ts) : par défaut 2 questions de cours
// puis 3 exercices d'application, tous à réponse courte ; aucune question
// ne se réussit avec une chance sur deux ; les questions à trou ont bien
// un trou ; un thème sans question de cours donne un exercice à la place.
import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { AUTOMATISMES_1RE, AUTOMATISMES_2NDE, AUTOMATISMES_3E, AUTOMATISMES_4E, AUTOMATISMES_5E, COMPOSITION_PAR_DEFAUT, COURS_1RE, COURS_2NDE, COURS_3E, COURS_4E, COURS_5E, NIVEAUX, automatismesDuFlash, themesDe, tirerFlash } from '../src/automatismes'
import { PROGRAMME_AUTOMATISMES, THEMES_COLLEGE } from '../src/programme-automatismes'
import { cleObjectifsDe, objectifsDeExercice, SECTION_AUTOMATISMES, SECTION_OBJECTIFS } from '../src/objectifs-flash'
import { PROGRAMME_CYCLE4 } from '../src/programme-cycle4'
import { automatismesChoisis, coursChoisis, lireReglages, REGLAGES_PAR_DEFAUT } from '../src/flash'
import { caseOpposee, estPatronDeCube, hexomino } from '../src/figures'
import { PHRASES_DU_PROFESSEUR_3E } from '../src/automatismes/troisieme-competences'

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
        // Une ancienne formulation de cours (« Compléter : … le… ») finit par un trou
        if (!a.id.startsWith('ancien-')) expect(q.enonce, a.id).not.toMatch(/…$|:$|^Est-ce |^(Ce tableau|La droite|La figure|La demi-droite)\b.*est-(il|elle) /)
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
      // L'énoncé ou, à énoncé égal, le dessin qui change
      for (let k = 0; k < 60; k++) vus.add(f()[0] + '|' + (f()[2] ?? ''))
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

  it('un niveau inconnu ne se garde pas ; tous les niveaux ont maintenant leurs automatismes', () => {
    // La 3e a ses automatismes depuis le 7 novembre 2026 : elle se garde comme les autres
    expect(lireReglages(JSON.stringify({ niveaux: ['3e', '5e', 'x'] })).niveaux).toEqual(['3e', '5e'])
    expect(lireReglages(JSON.stringify({ niveaux: ['x'] })).niveaux).toEqual(['5e'])
    expect(NIVEAUX.every(n => n.automatismes.length > 0)).toBe(true)
    expect(lireReglages(JSON.stringify({ niveaux: ['2nde', '1re'] })).niveaux).toEqual(['2nde', '1re'])
  })

  it('les questions choisies : celles des thèmes cochés, dans les niveaux cochés', () => {
    const cinq = NIVEAUX.find(n => n.id === '5e')!
    expect(themesDe(cinq)).toContain('Nombres relatifs')
    const r = { ...REGLAGES_PAR_DEFAUT, themes: ['5e/Nombres relatifs', '5e/Angles'] }
    // Seulement les automatismes : les applications directes ne sont plus posées (7 novembre 2026)
    expect(automatismesChoisis(r).map(a => a.id).sort()).toEqual([...duTheme('Nombres relatifs'), ...duTheme('Angles')].filter(a => !a.application).map(a => a.id).sort())
    // En 5e, une question de cours se pose sous sa compétence : celles qui n'en ont pas ne sont plus posées
    expect(coursChoisis(r).map(c => c.id).sort()).toEqual([...coursDu('Nombres relatifs'), ...coursDu('Angles')].filter(c => c.competence !== undefined).map(c => c.id).sort())
    expect(automatismesChoisis({ ...r, niveaux: [] })).toEqual([])
    expect(coursChoisis({ ...r, niveaux: [] })).toEqual([])
  })

  it('le flash ne pose que des automatismes : aucune application directe, même tout coché', () => {
    for (const n of NIVEAUX) {
      const r = { ...REGLAGES_PAR_DEFAUT, niveaux: [n.id], themes: themesDe(n).map(t => `${n.id}/${t}`) }
      const choisis = automatismesChoisis(r)
      expect(choisis.some(a => a.application), n.id).toBe(false)
      expect(choisis.length, n.id).toBe(n.automatismes.filter(a => !a.application).length)
    }
  })

  it('un domaine coché en partie : seulement les exercices des compétences cochées', () => {
    // Deux exercices de Nombres relatifs rangés pour l'essai, l'un en 0, l'autre en 1
    const [a, b] = automatismesDuFlash(NIVEAUX.find(n => n.id === '5e')!).filter(x => x.theme === 'Nombres relatifs')
    const avant = [a.competence, b.competence]
    a.competence = 0; b.competence = 1
    try {
      const r = { ...REGLAGES_PAR_DEFAUT, themes: ['5e/Nombres relatifs'], competences: ['5e/Nombres relatifs/1'] }
      expect(automatismesChoisis(r).map(x => x.id)).toEqual([b.id])
      // Aucune compétence nommée : le domaine entier (un réglage d'avant)
      expect(automatismesChoisis({ ...r, competences: [] }).map(x => x.id)).toEqual(expect.arrayContaining([a.id, b.id]))
    } finally { a.competence = avant[0]; b.competence = avant[1] }
  })

  it('les compétences cochées se gardent, et un réglage d\'avant n\'en a aucune', () => {
    expect(lireReglages(JSON.stringify({ themes: ['5e/Opérations'] })).competences).toEqual([])
    expect(lireReglages(JSON.stringify({ themes: ['5e/Opérations'], competences: ['5e/Opérations/2', 3] })).competences).toEqual(['5e/Opérations/2'])
  })
})

describe('le rangement Thème › Domaine › Compétences du collège', () => {
  it('cinq thèmes à chaque niveau, dans l\'ordre du programme ; la pensée informatique n\'a aucun automatisme', () => {
    for (const id of ['5e', '4e', '3e']) {
      const officiel = PROGRAMME_AUTOMATISMES[id].slice(0, 5)
      expect(officiel.map(t => t.nom), id).toEqual(Object.values(THEMES_COLLEGE))
      expect(officiel[4].domaines, id).toEqual([])
    }
  })

  it('chaque exercice du flash de 5e, de 4e et de 3e a son domaine dans le programme, et sa compétence existe', () => {
    for (const id of ['5e', '4e', '3e']) {
      const domaines = PROGRAMME_AUTOMATISMES[id].slice(0, 5).flatMap(t => t.domaines)
      for (const a of automatismesDuFlash(NIVEAUX.find(n => n.id === id)!)) {
        const d = domaines.find(x => x.cle === a.theme)
        expect(d, `${id} ${a.id} (${a.theme})`).toBeTruthy()
        if (a.competence !== undefined) expect(d!.competences[a.competence], `${id} ${a.id}`).toBeTruthy()
      }
    }
  })

  it('en 5e, chaque exercice a sa compétence, et chaque compétence a au moins un exercice', () => {
    const autos = automatismesDuFlash(NIVEAUX.find(n => n.id === '5e')!)
    for (const a of autos) expect(a.competence, a.id).toBeDefined()
    for (const d of PROGRAMME_AUTOMATISMES['5e'].slice(0, 5).flatMap(t => t.domaines)) {
      d.competences.forEach((c, k) => {
        expect(autos.some(a => a.theme === d.cle && a.competence === k), `${d.cle} : ${c}`).toBe(true)
      })
    }
  })

  it('les exercices ajoutés pour les compétences de 5e donnent une question et une réponse', () => {
    for (const id of ['tables-carres', 'motif-suivant', 'motif-regularite', 'nombre-quotient', 'placer-decimal', 'symetrie-feuille-blanche', 'angle-droit-plat', 'probabilite-mot']) {
      const a = AUTOMATISMES_5E.find(x => x.id === id)!
      for (let k = 0; k < 60; k++) {
        const q = a.generer()
        expect(q.enonce, id).not.toBe('')
        expect(q.reponse, id).not.toBe('')
        if (id === 'placer-decimal') expect(q.figure, id).toContain('<svg')
      }
    }
  })

  it('en 4e, chaque exercice a sa compétence, et chaque compétence a un exercice qui se tire sans erreur', () => {
    const autos = automatismesDuFlash(NIVEAUX.find(n => n.id === '4e')!)
    for (const a of autos) expect(a.competence, a.id).toBeDefined()
    for (const d of PROGRAMME_AUTOMATISMES['4e'].flatMap(t => t.domaines)) {
      d.competences.forEach((c, k) => {
        const siens = autos.filter(a => a.theme === d.cle && a.competence === k)
        expect(siens.length, `${d.cle} : ${c}`).toBeGreaterThan(0)
        for (const a of siens) for (let i = 0; i < 60; i++) {
          const q = a.generer()
          expect(q.enonce.length, a.id).toBeGreaterThan(0)
          expect(String(q.reponse).length, a.id).toBeGreaterThan(0)
        }
      })
    }
  })

  it('les phrases des compétences s\'écrivent sans erreur', () => {
    for (const t of Object.values(PROGRAMME_AUTOMATISMES).flat()) for (const d of t.domaines) for (const c of d.competences) {
      expect(c.split('$').length % 2, c).toBe(1)
      for (const m of c.split('$').filter((_, i) => i % 2)) expect(() => katex.renderToString(m, { throwOnError: true }), m).not.toThrow()
    }
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

  it('façon brevet : chaque exercice dit ce qu\'il travaille, et rien n\'est « hors liste »', () => {
    for (const a of AUTOMATISMES_4E) expect(a.programme, a.id).toBeTruthy()
    expect(themesDe(quatre)).not.toContain('Hors liste officielle')
    expect(AUTOMATISMES_4E.filter(a => a.application).length).toBeGreaterThanOrEqual(20)
    expect(themesDe(quatre)).toEqual(expect.arrayContaining(['Probabilités', 'Fonctions']))
    // Le flash garde la phrase, pour l'écrire à la correction
    const { questions } = tirerFlash(AUTOMATISMES_4E, COURS_4E, COMPOSITION_PAR_DEFAUT)
    for (const q of questions) expect(!!q.programme, q.id).toBe(q.forme === 'application')
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

describe('les automatismes de 3e', () => {
  const trois = NIVEAUX.find(n => n.id === '3e')!
  const verifier = (t: string, id: string) => {
    const morceaux = t.startsWith('§') || /\$/.test(t) ? t.replace(/^§/, '').split('$').filter((_, i) => i % 2) : [t]
    for (const m of morceaux) expect(() => katex.renderToString(m, { throwOnError: true }), `${id} : ${m}`).not.toThrow()
  }

  it('le niveau 3e a ses automatismes et ses questions de cours ; aucun identifiant en double', () => {
    expect(trois.automatismes).toBe(AUTOMATISMES_3E)
    expect(trois.cours).toBe(COURS_3E)
    expect(AUTOMATISMES_3E.length).toBeGreaterThanOrEqual(40)
    for (const t of themesDe(trois)) expect(COURS_3E.filter(c => c.theme === t).length, t).toBeGreaterThanOrEqual(1)
    const ids = [...AUTOMATISMES_5E, ...AUTOMATISMES_4E, ...AUTOMATISMES_3E, ...AUTOMATISMES_2NDE, ...AUTOMATISMES_1RE, ...COURS_5E, ...COURS_4E, ...COURS_3E, ...COURS_2NDE, ...COURS_1RE].map(x => x.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('chaque exercice a sa compétence (ou son objectif) et sa phrase ; chaque compétence a un exercice ou une question de cours', () => {
    // Le flash pose les automatismes de la liste officielle ; les applications
    // directes (fraction irréductible) se posent sous leurs objectifs
    const offi = AUTOMATISMES_3E.filter(a => !a.application)
    expect(automatismesDuFlash(trois)).toEqual(offi)
    for (const a of offi) { expect(a.competence, a.id).toBeDefined(); expect(a.programme, a.id).toMatch(/^[A-ZÉ].*\.$/) }
    for (const a of AUTOMATISMES_3E.filter(x => x.application)) { expect(objectifsDeExercice('3e', a.id), a.id).toBeDefined(); expect(a.programme, a.id).toMatch(/^[A-ZÉ].*\.$/) }
    // Une compétence sans exercice (le pair et l'impair) a ses questions de cours
    for (const d of PROGRAMME_AUTOMATISMES['3e'].filter(t => t.section?.nom !== SECTION_OBJECTIFS.nom).flatMap(t => t.domaines)) {
      d.competences.forEach((c, k) => expect(offi.some(a => a.theme === d.cle && a.competence === k) || COURS_3E.some(q => q.theme === d.cle && q.competence === k), `${d.cle} : ${c}`).toBe(true))
    }
    expect(offi.some(a => a.theme === 'Calcul littéral et algébrique' && a.competence === 5)).toBe(false)
  })

  it('ce que le professeur ne garde pas n\'est plus posé, mais reste dans le code', () => {
    const ids = AUTOMATISMES_3E.map(a => a.id)
    for (const id of ['3e-reconnaitre-solide', '3e-ranger-ecritures', '3e-pair-impair', '3e-moyenne', '3e-cercle-circonscrit']) expect(ids, id).not.toContain(id)
    const posees = COURS_3E.filter(c => c.competence !== undefined || c.objectif !== undefined).map(c => c.id)
    for (const id of ['cours-3e-Puissances-2', 'cours-3e-Racine carrée-2', 'cours-3e-Multiples et diviseurs-4', 'cours-3e-Calcul littéral et algébrique-1', 'cours-3e-Translations et vecteurs-1', 'cours-3e-Proportionnalité-1']) {
      expect(posees, id).not.toContain(id)
      expect(COURS_3E.map(c => c.id), id).toContain(id)
    }
    // Les anciennes formulations reformulées sont devenues des exercices de la même compétence
    expect(AUTOMATISMES_3E.find(a => a.id === 'ancien-cours-3e-Nombres rationnels-1-1')!.competence).toBe(0)
    expect(AUTOMATISMES_3E.find(a => a.id === 'ancien-cours-3e-Statistiques-1-1')!.competence).toBe(1)
  })

  it('réponse courte, jamais une chance sur deux, rien de cassé, et les trous ont un trou', () => {
    for (const a of AUTOMATISMES_3E) for (let k = 0; k < 60; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) {
        expect(q.reponse, a.id).not.toBe('')
        expect(q.reponse, a.id).not.toMatch(/^§(Oui|Non)\b/)
        expect(q.reponse, a.id).not.toMatch(/^[<>=]$/)
        expect(q.reponse + q.enonce, a.id).not.toMatch(/NaN|undefined|Infinity/)
        // Une ancienne question de cours garde sa phrase (« … revient à… »)
        if (!a.id.startsWith('ancien-')) expect(q.enonce, a.id).not.toMatch(/…$|:$|^Est-ce /)
      }
      if (a.trou) expect(a.trou().enonce, a.id).toMatch(/\\ldots|…/)
    }
  })

  it('rien de fixe : chaque exercice et chaque façon de poser une notion tire quelque chose au hasard', () => {
    for (const a of AUTOMATISMES_3E) {
      const vus = new Set<string>()
      for (let k = 0; k < 60; k++) { const q = a.generer(); vus.add(q.enonce + (q.figure ?? '')) }
      expect(vus.size, a.id).toBeGreaterThan(2)
    }
    // Sauf les phrases que le professeur a écrites lui-même, sans rien à tirer
    for (const c of COURS_3E) if (!PHRASES_DU_PROFESSEUR_3E.has(c.id)) c.facons.forEach((f, i) => {
      const vus = new Set<string>()
      // L'énoncé ou, à énoncé égal, le dessin qui change
      for (let k = 0; k < 60; k++) { const [e, , fig] = f(); vus.add(e + '|' + (fig ?? '')) }
      expect(vus.size, `${c.id}, façon ${i + 1} : « ${f()[0]} »`).toBeGreaterThan(1)
    })
    expect(PHRASES_DU_PROFESSEUR_3E.size).toBeLessThanOrEqual(8)
  })

  it('les réponses justes, sur quelques exercices de calcul', () => {
    const a = (id: string) => AUTOMATISMES_3E.find(x => x.id === id)!
    for (let k = 0; k < 100; k++) {
      const q = a('3e-decomposer').generer()
      const n = Number(/\$(\d+)\$/.exec(q.enonce)![1])
      const produit = q.reponse.split(' \\times ').reduce((p, f) => { const m = /^(\d+)(?:\^\{(\d+)\})?$/.exec(f)!; return p * Number(m[1]) ** Number(m[2] ?? 1) }, 1)
      expect(produit, q.enonce).toBe(n)
      // Le chiffre qui manque : chaque chiffre donné convient, et aucun n'est oublié
      const d = a('3e-divisibilite').generer()
      const [, g, dr, par] = /\$(\d+)\\ldots(\d*)\$ soit divisible par \$(\d)\$/.exec(d.enonce)!
      const donnes = [...new Set([...d.reponse.matchAll(/(?:^|\$)(\d)(?:\$|$)/g)].map(m => Number(m[1])))]
      const bons = Array.from({ length: 10 }, (_, c) => c).filter(c => Number(`${g}${c}${dr}`) % Number(par) === 0)
      expect(donnes.sort(), d.enonce).toEqual(bons)
      // Un seul nombre premier entre les deux nombres
      const p = a('3e-premier-entre').generer()
      const [, x, y] = /\$(\d+)\$ et \$(\d+)\$/.exec(p.enonce)!.map(Number)
      const premiers = Array.from({ length: y - x - 1 }, (_, i) => x + 1 + i).filter(n => n > 1 && Array.from({ length: n - 2 }, (_, j) => j + 2).every(j => n % j))
      expect(premiers.map(String), p.enonce).toEqual([p.reponse])
    }
  })

  it('toutes les formules s\'écrivent sans erreur, et les dessins sont bien formés', () => {
    for (const a of AUTOMATISMES_3E) for (let k = 0; k < 30; k++) {
      for (const q of [a.generer(), ...(a.trou ? [a.trou()] : [])]) {
        verifier(q.enonce, a.id); verifier(q.reponse, a.id)
        if (q.figure) { expect(q.figure, a.id).toMatch(/^<svg [^>]*viewBox="[-\d. ]+"/); expect(q.figure, a.id).not.toMatch(/NaN|undefined/) }
      }
    }
    for (const c of COURS_3E) for (let k = 0; k < 20; k++) {
      const q = c.poser(); verifier(q.enonce, c.id); verifier(q.reponse, c.id)
      if (q.figure) expect(q.figure, c.id).not.toMatch(/NaN|undefined/)
    }
  })

  it('par défaut : 2 questions de cours de 3e, puis 3 exercices, avec la phrase du programme pour la correction', () => {
    for (let k = 0; k < 50; k++) {
      const { questions } = tirerFlash(AUTOMATISMES_3E, COURS_3E, COMPOSITION_PAR_DEFAUT)
      expect(questions.map(q => q.forme)).toEqual(['cours', 'cours', 'application', 'application', 'application'])
      for (const q of questions) expect(!!q.programme, q.id).toBe(q.forme === 'application')
    }
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

  it('chaque exercice porte la phrase de la liste officielle qu\'il travaille', () => {
    for (const [, autos] of lycee) for (const a of autos) expect(a.programme, a.id).toMatch(/^[A-ZÉ].*\.$/)
  })

  it('les thèmes suivent la liste officielle, dans son ordre', () => {
    const ordre = ['Calcul numérique et algébrique', 'Proportions et pourcentages', 'Évolutions et variations', 'Fonctions et représentations', 'Statistiques', 'Probabilités']
    // En 2nde, après la liste officielle, le domaine PERSO Arithmétique (lot 24)
    expect(themesDe(NIVEAUX.find(x => x.id === '2nde')!)).toEqual([...ordre, 'Arithmétique'])
    expect(themesDe(NIVEAUX.find(x => x.id === '1re')!)).toEqual(ordre.filter(t => t !== 'Proportions et pourcentages'))
  })

  it('en 2nde, l\'arbre du programme : quatre thèmes à remplir, puis la liste officielle (OFFI) ; chaque exercice a sa compétence, chaque compétence ses exercices', () => {
    const prog = PROGRAMME_AUTOMATISMES['2nde']
    expect(prog.map(t => t.nom)).toEqual(['Nombres et calculs, algèbre', 'Géométrie', 'Fonctions', 'Statistiques et probabilités', 'Automatismes de l’épreuve'])
    expect(prog.slice(0, 4).every(t => t.aRemplir && !t.offi)).toBe(true)
    expect(prog[4].offi).toBe(true)
    const domaines = prog.flatMap(t => t.domaines)
    expect(new Set(domaines.map(d => d.cle)).size).toBe(domaines.length)
    for (const a of AUTOMATISMES_2NDE) {
      const d = domaines.find(x => x.cle === a.theme)
      expect(d, a.id).toBeTruthy()
      expect(a.competence, a.id).toBeDefined()
      expect(d!.competences[a.competence!], a.id).toBeTruthy()
      // La compétence d'un exercice officiel est la phrase qu'il travaille
      if (prog[4].domaines.includes(d!)) expect(d!.competences[a.competence!].slice(0, 10), a.id).toBe(a.programme!.slice(0, 10))
    }
    for (const d of domaines) d.competences.forEach((c, k) => expect(AUTOMATISMES_2NDE.some(a => a.theme === d.cle && a.competence === k), `${d.cle} : ${c}`).toBe(true))
    const arith = domaines.find(d => d.cle === 'Arithmétique')!
    expect(arith).toMatchObject({ competencesPerso: true, competences: ['Connaître le cours'] })
    expect(arith.perso).toBeFalsy()
    expect(AUTOMATISMES_2NDE.filter(a => a.theme === 'Arithmétique').length).toBeGreaterThanOrEqual(5)
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

describe('un domaine PERSO : Pythagore (4e)', () => {
  const quatre = NIVEAUX.find(n => n.id === '4e')!
  it('il est dans l\'arbre de 4e, en Espace et géométrie, avec une seule compétence « Connaître le cours »', () => {
    const d = PROGRAMME_AUTOMATISMES['4e'][1].domaines.find(x => x.cle === 'Pythagore')!
    expect(d).toMatchObject({ perso: true, competences: ['Connaître le cours'] })
    expect(automatismesDuFlash(quatre).filter(a => a.theme === 'Pythagore').length).toBe(4)
    expect(COURS_4E.filter(c => c.theme === 'Pythagore').length).toBe(4)
  })
  it('la rédaction : une seule étape manque, et c\'est une de celles que le professeur a choisies', () => {
    const a = AUTOMATISMES_4E.find(x => x.id === 'perso-pythagore-redaction')!
    const cachables = /^§(Dans le triangle|d’après le théorème|\$\w+\^2 = \w+\^2 \+ \w+\^2\$$|On constate|Donc, d’après|le triangle)/
    for (let k = 0; k < 200; k++) {
      const q = a.generer()
      const lignes = q.enonce.split('\n')
      expect(lignes.filter(l => l.includes('\\ldots')).length).toBe(1)
      expect(q.reponse, q.reponse).toMatch(cachables)
      expect(q.reponse).not.toMatch(/D’une part|D’autre part|sqrt|= \d/)
    }
  })
  it('choisir le bon théorème : les trois réponses possibles', () => {
    const a = AUTOMATISMES_4E.find(x => x.id === 'perso-pythagore-choisir')!
    const vus = new Set<string>()
    for (let k = 0; k < 200; k++) vus.add(a.generer().reponse)
    expect([...vus].sort()).toEqual(['§la contraposée du théorème de Pythagore', '§la réciproque du théorème de Pythagore', '§le théorème de Pythagore'])
  })
  it('les étapes en général : les mots du professeur, une seule étape manque', () => {
    const a = AUTOMATISMES_4E.find(x => x.id === 'perso-pythagore-etapes')!
    const mots = ['Donner le triangle rectangle', 'Citer le théorème de Pythagore', 'Donner l’égalité de Pythagore', 'Calculer la longueur', 'Séparer les calculs', 'Confirmer l’égalité de Pythagore', 'Citer la réciproque du théorème de Pythagore', 'Conclure que le triangle est rectangle', 'Confirmer la non égalité de Pythagore', 'Citer la contraposée du théorème de Pythagore', 'Conclure que le triangle n’est pas rectangle']
    const vus = new Set<string>()
    for (let k = 0; k < 600; k++) {
      const q = a.generer()
      expect(q.enonce).not.toMatch(/\$\w+ = /)
      // Toujours « Compléter l'étape manquante », quatre lignes numérotées dont une seule à trou
      expect(q.enonce).toMatch(/^Compléter l’étape manquante de la rédaction (du|de la) /)
      expect(q.enonce.split('\n').filter(l => /^\d\) /.test(l)).length).toBe(4)
      expect(q.enonce.split('\n').filter(l => l.includes('\\ldots')).length).toBe(1)
      expect(mots).toContain(q.reponse.replace(/^§/, ''))
      vus.add(q.reponse)
    }
    expect(vus.size).toBe(mots.length)
  })
})

describe('les symétries de 5e, rangées dans « Transformations » (plus de domaine PERSO)', () => {
  const cinq = NIVEAUX.find(n => n.id === '5e')!
  const reglage = (themes: string[], competences: string[] = []) => ({ ...REGLAGES_PAR_DEFAUT, themes, competences })

  it('le domaine PERSO « Symétries » n\'existe plus', () => {
    expect(PROGRAMME_AUTOMATISMES['5e'].flatMap(t => t.domaines).some(x => x.cle === 'Symétries')).toBe(false)
    expect(COURS_5E.some(c => c.theme === 'Symétries')).toBe(false)
    expect(AUTOMATISMES_5E.some(x => x.theme === 'Symétries')).toBe(false)
  })
  it('quel type de symétrie : une figure, la symétrie axiale sous la compétence, la centrale sous l\'objectif « Définir le demi-tour »', () => {
    const axiale = AUTOMATISMES_5E.find(x => x.id === 'symetrie-type-axiale')!
    const centrale = AUTOMATISMES_5E.find(x => x.id === 'symetrie-type-centrale')!
    expect(axiale.competence).toBe(0)
    expect(centrale.application).toBe(true)
    for (let k = 0; k < 20; k++) {
      for (const [a, rep] of [[axiale, '§une symétrie axiale'], [centrale, '§une symétrie centrale']] as const) {
        const q = a.generer()
        expect(q.enonce).toBe('Voici un triangle $ABC$ et son image $A\'B\'C\'$. Quel type de symétrie a été appliqué ?')
        expect(q.figure).toContain('<svg')
        expect(q.reponse).toBe(rep)
      }
    }
    expect(automatismesChoisis(reglage(['5e/Transformations'], ['5e/Transformations/0'])).some(a => a.id === 'symetrie-type-axiale')).toBe(true)
    expect(automatismesChoisis(reglage(['5e/obj:Transformations'], ['5e/obj:Transformations/0'])).map(a => a.id)).toContain('symetrie-type-centrale')
    expect(automatismesChoisis(reglage(['5e/obj:Transformations'], ['5e/obj:Transformations/0'])).map(a => a.id)).not.toContain('symetrie-type-axiale')
  })
  it('les questions de cours : la symétrie axiale et son axe sous la compétence, la symétrie centrale et son centre sous l\'objectif', () => {
    const titres = (ids: string[]) => cinq.cours.filter(c => ids.includes(c.id)).map(c => c.titre)
    const axiale = coursChoisis(reglage(['5e/Transformations'], ['5e/Transformations/0']))
    expect(titres(axiale.map(c => c.id))).toEqual(expect.arrayContaining(['Une symétrie axiale', 'L’axe de symétrie']))
    const centrale = coursChoisis(reglage(['5e/obj:Transformations'], ['5e/obj:Transformations/0']))
    expect(titres(centrale.map(c => c.id)).sort()).toEqual(['Le centre de symétrie', 'Une symétrie centrale'])
  })
  it('les phrases à compléter : un seul trou, une réponse d\'un mot, et la lettre change', () => {
    const mots = new Set<string>()
    for (const t of ['Une symétrie axiale', 'L’axe de symétrie', 'Une symétrie centrale', 'Le centre de symétrie']) {
      const c = cinq.cours.find(x => x.titre === t)!
      for (let k = 0; k < 120; k++) {
        const q = c.poser()
        if (!q.enonce.startsWith('Compléter')) continue
        expect(q.enonce.match(/…/g)?.length, q.enonce).toBe(1)
        mots.add(q.reponse)
      }
    }
    expect([...mots].sort()).toEqual(['§axe', '§centre', '§demi-tour', '§droite', '§pliage', '§plier', '§point'])
  })
})

describe('la liste des objectifs d\'apprentissage en 5e', () => {
  const cinq = NIVEAUX.find(n => n.id === '5e')!
  const objectifs = PROGRAMME_AUTOMATISMES['5e'].filter(t => t.section?.nom === SECTION_OBJECTIFS.nom)
  const reglage = (themes: string[], competences: string[] = []) => ({ ...REGLAGES_PAR_DEFAUT, themes, competences })

  it('le niveau a deux listes : les automatismes du programme, puis les objectifs d\'apprentissage', () => {
    const p = PROGRAMME_AUTOMATISMES['5e']
    expect(p.slice(0, 5).every(t => t.section?.nom === SECTION_AUTOMATISMES.nom)).toBe(true)
    expect(objectifs.map(t => t.nom)).toEqual(PROGRAMME_CYCLE4['5e'].map(t => t.nom))
    expect(objectifs.flatMap(t => t.domaines).reduce((n, d) => n + d.competences.length, 0)).toBe(104)
    expect(PROGRAMME_AUTOMATISMES['4e'].every(t => !t.section)).toBe(true)
  })

  it('chaque exercice d\'application de 5e est rangé sous un objectif qui existe', () => {
    // « Quel type de symétrie ? » (centrale) est rangé sous son objectif à part, hors du Catalogue
    const appli = cinq.automatismes.filter(a => a.application && !a.id.startsWith('ancien-') && a.id !== 'symetrie-type-centrale')
    expect(appli.length).toBe(42)
    for (const a of appli) {
      const o = objectifsDeExercice('5e', a.id)
      expect(o, a.id).toBeTruthy()
      const d = objectifs.flatMap(t => t.domaines).find(x => x.cle === o!.cle)
      expect(d, a.id).toBeTruthy()
      for (const k of o!.ks) expect(d!.competences[k], a.id).toBeTruthy()
    }
  })

  it('un domaine d\'objectifs coché pose ses exercices d\'application, et eux seuls', () => {
    const ids = automatismesChoisis(reglage(['5e/obj:Opérations'])).map(a => a.id).filter(id => !id.startsWith('ancien-')).sort()
    expect(ids).toEqual(['distributivite-numerique', 'diviser-decimal', 'multiples-diviseurs', 'priorites', 'programme-calcul'])
    expect(automatismesChoisis(reglage(['5e/Opérations'])).some(a => a.application)).toBe(false)
  })

  it('cocher un seul objectif ne pose que ses exercices', () => {
    const k = PROGRAMME_CYCLE4['5e'][0].domaines[0].objectifs.findIndex(o => o.exemples?.includes('priorites'))
    const ids = automatismesChoisis(reglage(['5e/obj:Opérations'], [`5e/obj:Opérations/${k}`])).map(a => a.id)
    expect(ids).toContain('priorites')
    expect(ids.every(id => id === 'priorites' || id.startsWith('ancien-cours-Opérations-8-'))).toBe(true)
  })
})

describe('la liste des objectifs d\'apprentissage en 3e', () => {
  const objectifs = PROGRAMME_AUTOMATISMES['3e'].filter(t => t.section?.nom === SECTION_OBJECTIFS.nom)
  const reglage = (themes: string[], competences: string[] = []) => ({ ...REGLAGES_PAR_DEFAUT, niveaux: ['3e'], themes, competences })

  it('la 3e a aussi les deux listes, avec ses 49 objectifs ; ceux de Nombres et calculs et d\'Espace et géométrie ont des exercices (sauf l\'analyse-synthèse et les sections, en suspens)', () => {
    const p = PROGRAMME_AUTOMATISMES['3e']
    expect(p.slice(0, 5).every(t => t.section?.nom === SECTION_AUTOMATISMES.nom)).toBe(true)
    expect(objectifs.map(t => t.nom)).toEqual(PROGRAMME_CYCLE4['3e'].map(t => t.nom))
    expect(objectifs.flatMap(t => t.domaines).reduce((n, d) => n + d.competences.length, 0)).toBe(49)
    const sous = NIVEAUX.find(n => n.id === '3e')!.automatismes.filter(a => objectifsDeExercice('3e', a.id))
    expect(objectifsDeExercice('3e', '3e-forme-irreductible')).toEqual({ cle: 'obj:Nombres rationnels', ks: [0, 1] })
    // Les objectifs qui ont des exercices (22 novembre 2026) : tout le thème
    // Nombres et calculs, sauf le 6e du calcul littéral, et tout Espace et
    // géométrie, sauf les sections (que des questions de cours)
    const remplis = new Set(sous.flatMap(a => { const o = objectifsDeExercice('3e', a.id)!; return o.ks.map(k => `${o.cle}/${k}`) }))
    expect([...remplis].sort()).toEqual([
      'obj:Calcul littéral et algébrique/0', 'obj:Calcul littéral et algébrique/1', 'obj:Calcul littéral et algébrique/2', 'obj:Calcul littéral et algébrique/3', 'obj:Calcul littéral et algébrique/4',
      'obj:Nombres rationnels/0', 'obj:Nombres rationnels/1', 'obj:Nombres rationnels/2',
      'obj:Puissances/0', 'obj:Puissances/1', 'obj:Puissances/2', 'obj:Puissances/3',
      'obj:Racine carrée/0', 'obj:Racine carrée/1',
      'obj:Représentation de l’espace/0', 'obj:Représentation de l’espace/1', 'obj:Représentation de l’espace/3',
      'obj:Translations et vecteurs/0', 'obj:Translations et vecteurs/1', 'obj:Translations et vecteurs/2', 'obj:Translations et vecteurs/3',
      'obj:Triangles/0', 'obj:Triangles/1',
    ])
    expect(sous.length).toBe(3 + 97 + 51)
  })

  it('les objectifs de 3e revus le 22 novembre : rien de fixe, des réponses justes et lisibles', () => {
    const nouveaux = NIVEAUX.find(n => n.id === '3e')!.automatismes.filter(a => a.id.startsWith('3e-obj-'))
    for (const a of nouveaux) {
      const vus = new Set<string>()
      for (let i = 0; i < 60; i++) {
        const q = a.generer()
        const t = q.enonce + q.reponse
        expect(t, a.id).not.toMatch(/undefined|NaN|Infinity|\+ -|- -|\{,\}\d*e[-+]/)
        katex.renderToString(q.reponse.startsWith('§') ? '' : q.reponse, { throwOnError: true })
        vus.add(q.enonce + (q.figure ?? ''))
      }
      expect(vus.size, a.id).toBeGreaterThan(1)
    }
    // La correction juste, sur quelques exercices où le calcul se vérifie
    const de = (id: string) => nouveaux.find(a => a.id === id)!
    for (let i = 0; i < 50; i++) {
      const q = de('3e-obj-ns-grand').generer()
      const [m, e] = q.reponse.replace('{,}', '.').split(' \\times 10^')
      expect(Number(m) * 10 ** Number(e.replace(/[{}]/g, ''))).toBeCloseTo(Number(q.enonce.match(/\$([\d\\,]+)\$/)![1].replace(/\\,/g, '')))
      expect(Number(m)).toBeGreaterThanOrEqual(1)
      expect(Number(m)).toBeLessThan(10)
    }
  })

  it('chaque domaine officiel de 3e trouve son domaine d\'objectifs', () => {
    const cles = objectifs.flatMap(t => t.domaines).map(d => d.cle)
    for (const d of PROGRAMME_AUTOMATISMES['3e'].slice(0, 5).flatMap(t => t.domaines)) {
      expect(cles, d.cle).toContain(cleObjectifsDe('3e', d.cle))
    }
    expect(cleObjectifsDe('3e', 'Repérage')).toBe('obj:Repérage sur une droite et dans le plan')
  })

  it('les réglages gardés de 3e gardent leur sens : la même compétence, avec ses exercices d\'aujourd\'hui', () => {
    const ids = automatismesChoisis(reglage(['3e/Puissances'], ['3e/Puissances/1'])).map(a => a.id)
    expect(ids).toEqual(['3e-produit-meme-nombre', '3e-calculer-meme-nombre'])
    expect(automatismesChoisis(reglage(['3e/obj:Probabilités']))).toEqual([])
  })

  it('cocher un objectif ou une compétence pose ses questions de cours et ses exercices', () => {
    // OBJ2 des nombres rationnels : l'exercice rangé sous OBJ1 et OBJ2
    expect(automatismesChoisis(reglage(['3e/obj:Nombres rationnels'], ['3e/obj:Nombres rationnels/1'])).map(a => a.id)).toEqual(['3e-forme-irreductible'])
    expect(coursChoisis(reglage(['3e/obj:Nombres rationnels'], ['3e/obj:Nombres rationnels/0'])).map(c => c.id)).toEqual(['cours-3e-Nombres rationnels-4'])
    // Le pair et l'impair : que des questions de cours
    const r = reglage(['3e/Calcul littéral et algébrique'], ['3e/Calcul littéral et algébrique/5'])
    expect(automatismesChoisis(r)).toEqual([])
    expect(coursChoisis(r).map(c => c.id)).toEqual(['cours-3e-Calcul littéral et algébrique-3'])
    // Une compétence sans question de cours : un exercice à la place
    const puissances = reglage(['3e/Puissances'], ['3e/Puissances/2'])
    expect(coursChoisis(puissances)).toEqual([])
    const { questions } = tirerFlash(automatismesChoisis(puissances), coursChoisis(puissances), COMPOSITION_PAR_DEFAUT)
    expect(questions.map(q => q.forme)).toEqual(Array(5).fill('application'))
  })
})

describe('les questions de cours de 5e, rangées par compétence', () => {
  const reglage = (themes: string[], competences: string[] = []) => ({ ...REGLAGES_PAR_DEFAUT, themes, competences })
  const cinq = NIVEAUX.find(n => n.id === '5e')!

  it('chaque question de cours a au plus une compétence ou un objectif qui existe', () => {
    const domaines = PROGRAMME_AUTOMATISMES['5e'].slice(0, 5).flatMap(t => t.domaines)
    for (const c of cinq.cours) {
      expect(c.competence !== undefined && c.objectif !== undefined, c.id).toBe(false)
      if (c.competence !== undefined) expect(domaines.find(d => d.cle === c.theme)?.competences[c.competence], c.id).toBeTruthy()
      if (c.objectif !== undefined) expect(PROGRAMME_CYCLE4['5e'].flatMap(t => t.domaines).find(d => d.nom.startsWith(c.theme))?.objectifs[c.objectif], c.id).toBeTruthy()
    }
  })

  it('cocher une compétence ne pose que ses questions de cours', () => {
    const ids = coursChoisis(reglage(['5e/Angles'], ['5e/Angles/1'])).map(c => c.id)
    expect(ids.length).toBeGreaterThan(0)
    for (const c of cinq.cours.filter(x => ids.includes(x.id))) expect(c.competence).toBe(1)
    // Le domaine entier pose celles de toutes ses compétences, jamais une sans compétence
    const tout = coursChoisis(reglage(['5e/Angles']))
    expect(tout.every(c => c.competence !== undefined)).toBe(true)
    expect(tout.length).toBeGreaterThan(ids.length)
  })

  it('un objectif d\'apprentissage pose ses questions de cours : critères de divisibilité par 3 et par 9, priorités opératoires', () => {
    const ids = coursChoisis(reglage(['5e/obj:Opérations'])).map(c => c.id).sort()
    expect(ids).toEqual(['cours-Opérations-2', 'cours-Opérations-8'])
    for (const c of coursChoisis(reglage(['5e/obj:Opérations']))) for (let k = 0; k < 30; k++) expect(c.poser().reponse).toMatch(/^§./)
    expect(coursChoisis(reglage(['5e/obj:Opérations'], ['5e/obj:Opérations/9'])).map(c => c.id)).toEqual(['cours-Opérations-2'])
  })

  it('les anciennes formulations deviennent des exercices de la même compétence', () => {
    const ancien = cinq.automatismes.filter(a => a.id.startsWith('ancien-'))
    expect(ancien.length).toBeGreaterThan(10)
    for (const a of ancien) {
      const q = a.generer()
      expect(q.enonce.length, a.id).toBeGreaterThan(5)
      expect(q.reponse, a.id).toMatch(/^§./)
    }
    // Opérations-7 : la formulation d'avant se pose parmi les exercices de la compétence « Multiplier et diviser par 10, 100, 1 000 »
    const un = ancien.find(a => a.id === 'ancien-cours-Opérations-7-1')!
    expect(un.competence).toBe(4)
    expect(automatismesChoisis(reglage(['5e/Opérations'], ['5e/Opérations/4'])).some(a => a.id === un.id)).toBe(true)
  })

  it('une compétence sans question de cours reste cochable quand elle a des exercices : le flash pose alors un exercice', () => {
    const { questions, coursRemplaces } = tirerFlash(automatismesChoisis(reglage(['5e/Opérations'], ['5e/Opérations/3'])), coursChoisis(reglage(['5e/Opérations'], ['5e/Opérations/3'])), { cours: 2, application: 1 })
    expect(coursRemplaces).toBe(2)
    expect(questions.every(q => q.forme === 'application')).toBe(true)
  })

  it('les nouvelles questions de Mathieu : un cube ou un pavé, la nature d\'un parallélogramme codé, l\'empilement', () => {
    const q = (id: string) => cinq.cours.find(c => c.id === id)!
    const solide = cinq.cours.find(c => c.titre === 'Reconnaître le solide')!
    const vus = new Set<string>()
    for (let k = 0; k < 40; k++) { const x = solide.poser(); expect(x.figure).toMatch(/^<svg/); vus.add(x.reponse) }
    expect(vus).toEqual(new Set(['§un cube', '§un pavé droit']))
    const para = cinq.cours.find(c => c.titre === 'La nature d’un parallélogramme codé')!
    for (let k = 0; k < 40; k++) expect(para.poser().reponse).toMatch(/^§un (carré|losange|rectangle)$/)
    void q
  })
})
