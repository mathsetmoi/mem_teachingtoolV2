import { describe, expect, it } from 'vitest'
import katex from 'katex'
import { NIVEAUX } from '../src/automatismes'
import { exemplesDe, texteEnLatex, themeDuFlash } from '../src/catalogue-college'
import { NIVEAUX_COLLEGE, PROGRAMME_CYCLE4 } from '../src/programme-cycle4'

// Le programme du cycle 4 dans le catalogue (onglets 5e, 4e, 3e)
describe('Le programme du cycle 4', () => {
  it('cinq thèmes à chaque niveau, et les domaines du sommaire du programme', () => {
    const domaines = Object.fromEntries(NIVEAUX_COLLEGE.map(n => [n, PROGRAMME_CYCLE4[n].map(t => t.domaines.map(d => d.nom))]))
    for (const n of NIVEAUX_COLLEGE) expect(PROGRAMME_CYCLE4[n].map(t => t.nom)).toEqual([
      'Nombres et calculs', 'Espace et géométrie', 'Organisation et gestion de données, probabilités', 'Proportionnalité, fonctions', 'La pensée informatique'])
    expect(domaines['5e']).toEqual([
      ['Opérations', 'Nombres relatifs', 'Nombres rationnels', 'Puissances', 'Calcul littéral et algébrique'],
      ['Repérage sur une droite et dans le plan', 'Représentation de l’espace', 'Transformations', 'Angles', 'Triangles', 'Parallélogrammes'],
      ['Statistiques', 'Probabilités'], ['Proportionnalité', 'Fonctions'], ['Pensée informatique']])
    expect(domaines['4e']).toEqual([
      ['Opérations sur les nombres relatifs', 'Nombres rationnels', 'Puissances', 'Racine carrée', 'Calcul littéral et algébrique'],
      ['Transformations', 'Repérage sur une droite et dans le plan', 'Représentation de l’espace', 'Parallélogrammes et translations', 'Triangles'],
      ['Statistiques', 'Probabilités'], ['Proportionnalité', 'Fonctions'], ['Pensée informatique']])
    expect(domaines['3e']).toEqual([
      ['Nombres rationnels', 'Puissances', 'Racine carrée', 'Multiples et diviseurs', 'Calcul littéral et algébrique'],
      ['Repérage sur une droite et dans le plan', 'Représentation de l’espace', 'Triangles', 'Translations et vecteurs'],
      ['Statistiques', 'Probabilités'], ['Proportionnalité', 'Fonctions'], ['Pensée informatique']])
  })

  it('le nombre de lignes du programme', () => {
    const compte = (n: '5e' | '4e' | '3e') => PROGRAMME_CYCLE4[n].flatMap(t => t.domaines).reduce((s, d) => [s[0] + d.automatismes.length, s[1] + d.objectifs.length], [0, 0])
    expect(compte('5e')).toEqual([47, 104])
    expect(compte('4e')).toEqual([39, 69])
    expect(compte('3e')).toEqual([36, 49])
  })

  it('chaque ligne s’écrit en LaTeX sans erreur, sur la page comme dans le panneau', () => {
    const toutes = NIVEAUX_COLLEGE.flatMap(n => PROGRAMME_CYCLE4[n].flatMap(t => t.domaines.flatMap(d => [...d.automatismes, ...d.objectifs.map(o => o.texte), ...(d.prolongements ?? [])])))
    for (const x of toutes) {
      expect(x.split('$').length % 2, x).toBe(1)
      expect(() => katex.renderToString(texteEnLatex(x), { throwOnError: true }), x).not.toThrow()
      expect(x, 'un reste du PDF').not.toMatch(/ ; ; |\s{2}|^\s|\s$/)
    }
  })

  it('les exemples : chaque exercice d’application directe est rangé sous un objectif, une seule fois par objectif', () => {
    const ids = new Set(NIVEAUX.flatMap(n => n.automatismes).map(a => a.id))
    const ranges = new Set<string>()
    for (const n of NIVEAUX_COLLEGE) PROGRAMME_CYCLE4[n].forEach((t, i) => t.domaines.forEach((d, j) => d.objectifs.forEach((o, k) => {
      for (const id of o.exemples ?? []) { expect(ids.has(id), id).toBe(true); ranges.add(id) }
      expect(exemplesDe({ niveau: n, t: i, d: j, sorte: 'o', k }).length).toBe(o.exemples?.length ?? 0)
    })))
    const applications = NIVEAUX.filter(n => n.id === '5e' || n.id === '4e').flatMap(n => n.automatismes).filter(a => a.application).map(a => a.id)
    expect(applications.filter(id => !ranges.has(id))).toEqual([])
    expect(ranges.size).toBe(69)
  })

  it('le bouton « Flash sur ce domaine » trouve le thème du flash', () => {
    const sans: string[] = []
    for (const n of ['5e', '4e', '3e'] as const) for (const t of PROGRAMME_CYCLE4[n]) for (const d of t.domaines)
      if (d.automatismes.length && !themeDuFlash(n, d)) sans.push(`${n} ${d.nom}`)
    expect(sans).toEqual([])
    expect(themeDuFlash('5e', PROGRAMME_CYCLE4['5e'][1].domaines[0])).toBe('Repérage')
    // La 3e a ses automatismes depuis le 7 novembre 2026 : son bouton trouve aussi le thème du flash
    expect(themeDuFlash('3e', PROGRAMME_CYCLE4['3e'][0].domaines[0])).toBe('Nombres rationnels')
  })
})
