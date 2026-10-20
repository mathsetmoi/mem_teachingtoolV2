// La recherche, sans l'écran : le texte mis à plat, les formules lues en
// mots simples, la comparaison, et le contenu d'un classeur lu dans son
// document (pages numérotées dans leur séance, formules).
import { describe, expect, it } from 'vitest'
import { aplatir, lireContenu, morceaux, motsDeLatex, score } from '../src/recherche'
import { Tableau } from '../src/document'
import type { Formule } from '../src/types'

describe('aplatir et score', () => {
  it('sans accent ni majuscule', () => {
    expect(aplatir('  Symétrie   CENTRALE ')).toBe('symetrie centrale')
    expect(score('symetrie', 'Symétrie centrale')).not.toBeNull()
    expect(score('SYMÉTR', 'symétrie axiale')).not.toBeNull()
  })
  it('chaque mot cherché doit se trouver', () => {
    expect(score('symetrie axiale', 'Symétrie centrale')).toBeNull()
    expect(score('', 'Symétrie')).toBeNull()
  })
  it('le mot entier passe devant le début de mot, et le début de mot devant un morceau', () => {
    const entier = score('fond', 'Fond Seyès')!, debut = score('fon', 'Fond Seyès')!, morceau = score('ond', 'Fond Seyès')!
    expect(entier).toBeGreaterThan(debut)
    expect(debut).toBeGreaterThan(morceau)
  })
})

describe('motsDeLatex', () => {
  it('dit les formules avec des mots simples', () => {
    expect(score('racine', motsDeLatex('x = \\sqrt{25} = 5'))).not.toBeNull()
    expect(score('fraction', motsDeLatex('\\frac{1}{3}'))).not.toBeNull()
    expect(score('pi', motsDeLatex('2\\pi r'))).not.toBeNull()
    expect(score('carre', motsDeLatex('AB^2 + BC^{2}'))).not.toBeNull()
    expect(score('reels', motsDeLatex('x \\in \\mathbb{R}'))).not.toBeNull()
    expect(score('rationnels', motsDeLatex('\\sqrt{2} \\notin ℚ'))).not.toBeNull()
    expect(score('AB', motsDeLatex('AC = \\sqrt{AB^2 + BC^2}'))).not.toBeNull()
  })
  it('ne trouve pas ce qui n’y est pas', () => {
    expect(score('fraction', motsDeLatex('x = \\sqrt{25}'))).toBeNull()
  })
})

describe('morceaux', () => {
  it('met en évidence le début des mots cherchés, accents compris', () => {
    expect(morceaux('Symétrie centrale', 'symetr')).toEqual([{ t: 'Symétr', trouve: true }, { t: 'ie centrale', trouve: false }])
  })
})

describe('lireContenu', () => {
  it('les pages numérotées dans leur séance, leurs noms, leurs formules', () => {
    const t = new Tableau(null)
    const a = t.nouvelleSeance({ t: Date.UTC(2026, 9, 16, 8) })
    const p2 = t.ajouterPage('blanc', t.ordre.length, { seance: a.seance })
    t.renommerPage(p2, 'Exercice 12 p. 84')
    const b = t.nouvelleSeance({ t: Date.UTC(2026, 9, 20, 8) })
    const f: Formule = { id: 'f1', type: 'formule', x: 0, y: 0, z: 1, latex: '\\sqrt{2}', couleur: '#000', taille: 24 } as Formule
    t.formesDe(b.page)!.set('f1', f)
    const c = lireContenu(t.doc)
    expect(c.pages.map(p => [p.numero, p.nom, p.seance?.id])).toEqual([[1, null, a.seance], [2, 'Exercice 12 p. 84', a.seance], [1, null, b.seance]])
    expect(c.formules).toEqual([{ id: 'f1', page: b.page, latex: '\\sqrt{2}' }])
    expect(c.seances.map(s => s.pages)).toEqual([2, 1])
  })
})

describe('chercher', async () => {
  const { chercher } = await import('../src/recherche-vue')
  const rien = () => {}
  const actions = [
    { titre: 'Rapporteur', genre: 'Instrument', mots: 'instrument poser mesurer angle', faire: rien },
    { titre: 'Seyès', genre: 'Fond', mots: 'fond page papier quadrillage', faire: rien },
    { titre: 'Médiatrice', genre: 'Construction', mots: 'Trace la médiatrice de [AB].', faire: rien },
  ]
  const contenu = { pages: [{ id: 'p1', nom: 'Exercice 12', numero: 2, seance: { id: 's1', debut: Date.UTC(2026, 9, 16, 8), nom: null } }],
    formules: [{ id: 'f1', page: 'p1', latex: 'x = \\sqrt{25}' }], seances: [{ id: 's1', debut: Date.UTC(2026, 9, 16, 8), nom: null, pages: 2 }] }
  const classeurs = [{ id: 'c1', nom: 'Racines carrées', classe: '3e C', chemin: '3e C', modifie: 1, courant: false, contenu }]
  it('trouve un outil par son nom, sans accent', () => {
    const r = chercher('mediatrice', actions, [], rien)
    expect(r[0]).toMatchObject({ groupe: 'outils', titre: 'Médiatrice' })
  })
  it('trouve une formule par des mots simples, et mène à sa page', () => {
    const allers: unknown[] = []
    const r = chercher('racine', actions, classeurs, d => allers.push(d))
    const f = r.find(x => x.groupe === 'formules')!
    expect(f.titre).toBe('Racines carrées · page 2')
    f.faire()
    expect(allers).toEqual([{ classeur: 'c1', page: 'p1', forme: 'f1' }])
    expect(r.some(x => x.groupe === 'classeurs' && x.titre === 'Racines carrées')).toBe(true)
  })
  it('trouve une page par son nom, une séance par sa date', () => {
    expect(chercher('exercice 12', actions, classeurs, rien).some(x => x.genre === 'Page')).toBe(true)
    expect(chercher('16 octobre', actions, classeurs, rien).some(x => x.genre === 'Séance')).toBe(true)
  })
  it('rien pour une requête vide', () => {
    expect(chercher('   ', actions, classeurs, rien)).toEqual([])
  })
})
