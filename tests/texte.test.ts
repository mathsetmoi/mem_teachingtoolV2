// L'outil Texte : le modèle d'un texte (ses lignes et leurs morceaux), sa
// version KaTeX pour une version d'avant, sa lecture prudente (le
// presse-papiers), sa forme à plat (la recherche, la copie), et ce que lui
// fait le cadre de taille (un côté change sa largeur, un coin ses
// caractères). Sous Node, sans DOM.
import { describe, expect, it } from 'vitest'
import { champsDuTexte, cleDuContenu, estTexte, formulesDe, fusionner, latexDuTexte, lignesDuBrut, lireTexte, morceauxDuBrut, nettoyer, tailleEstimee, texteBrut, LARGEUR_MIN } from '../src/texte'
import { lireJson, versTexte } from '../src/presse-papiers'
import type { Copie } from '../src/presse-papiers'
import { echelle, transformerForme } from '../src/cadre'
import { motsDeFormule, score } from '../src/recherche'
import type { Formule, LigneTexte } from '../src/types'

const texte = (lignes: LigneTexte[], o: Partial<Formule> = {}): Formule =>
  ({ id: 't1', type: 'formule', x: 10, y: 20, z: 1, auteur: 'moi', couleur: '#1b2230', taille: 28, ...champsDuTexte(lignes)!, ...o })
const EXERCICE: LigneTexte[] = [
  { morceaux: [{ t: 'Exercice 3', g: true }] },
  { morceaux: [{ t: 'Léa en mange ' }, { t: '\\frac{1}{3}', f: true }, { t: '.' }] },
  { morceaux: [{ t: 'Qui en a le plus ?', c: '#1f5fbf' }], puce: true },
]

describe('le modèle', () => {
  it('un texte est une formule qui porte ses lignes ; une formule n\'en est pas un', () => {
    expect(estTexte(texte(EXERCICE))).toBe(true)
    expect(estTexte({ id: 'f', type: 'formule', x: 0, y: 0, z: 1, auteur: 'a', latex: 'x^2', couleur: '#000000', taille: 28 })).toBe(false)
    expect(estTexte(null)).toBe(false)
  })

  it('les morceaux voisins du même style se réunissent, les vides s\'en vont ; une formule reste seule', () => {
    expect(fusionner([{ t: 'Bon' }, { t: 'jour' }, { t: '' }, { t: ' !', g: true }, { t: 'x', f: true }, { t: 'y', f: true }]))
      .toEqual([{ t: 'Bonjour' }, { t: ' !', g: true }, { t: 'x', f: true }, { t: 'y', f: true }])
  })

  it('les lignes vides de la fin s\'en vont (même à puce) ; un texte vide n\'est plus rien', () => {
    expect(nettoyer([{ morceaux: [{ t: 'a' }] }, { morceaux: [] }, { morceaux: [{ t: '  ' }], puce: true }])).toEqual([{ morceaux: [{ t: 'a' }] }])
    expect(nettoyer([{ morceaux: [] }, { morceaux: [{ t: ' ' }] }])).toBeNull()
    // Une ligne vide au milieu reste
    expect(nettoyer([{ morceaux: [{ t: 'a' }] }, { morceaux: [] }, { morceaux: [{ t: 'b' }] }])?.length).toBe(3)
  })

  it('les formules entre $…$ : non vides, sur une ligne', () => {
    expect(formulesDe('Aire : $x^2$ et $ $ ou $\\pi r^2$')).toEqual([
      { debut: 7, fin: 12, latex: 'x^2' },
      { debut: 23, fin: 32, latex: '\\pi r^2' },
    ])
    expect(morceauxDuBrut('Aire : $x^2$ cm')).toEqual([{ t: 'Aire : ' }, { t: 'x^2', f: true }, { t: ' cm' }])
    expect(morceauxDuBrut('5 $')).toEqual([{ t: '5 $' }])
  })

  it('à plat et retour : les puces, les formules', () => {
    const brut = texteBrut(EXERCICE)
    expect(brut).toBe('Exercice 3\nLéa en mange $\\frac{1}{3}$.\n• Qui en a le plus ?')
    const l = lignesDuBrut(brut)
    expect(l[2]).toEqual({ morceaux: [{ t: 'Qui en a le plus ?' }], puce: true })
    expect(l[1].morceaux[1]).toEqual({ t: '\\frac{1}{3}', f: true })
  })

  it('sa version KaTeX : une ligne par ligne, le texte échappé, le gras, la couleur, la formule', () => {
    const l = latexDuTexte(EXERCICE)
    expect(l.startsWith('\\begin{array}{l}')).toBe(true)
    expect(l).toContain('\\text{\\textbf{Exercice 3}}')
    expect(l).toContain('$\\frac{1}{3}$')
    expect(l).toContain('\\bullet\\ \\text{\\textcolor{#1f5fbf}{Qui en a le plus ?}}')
    expect(latexDuTexte([{ morceaux: [{ t: '50 % de {a} & $' }] }])).toBe('\\text{50 \\% de \\{a\\} \\& \\$}')
  })

  it('la clé de son rendu change avec ses lignes, sa largeur, sa taille', () => {
    const a = texte(EXERCICE)
    expect(cleDuContenu(a)).not.toBe(cleDuContenu({ ...a, largeur: 300 }))
    expect(cleDuContenu(a)).not.toBe(cleDuContenu({ ...a, taille: 40 }))
    expect(cleDuContenu(a)).toBe(cleDuContenu({ ...a, couleur: '#d0342c' }))
  })

  it('sa taille estimée : sa largeur choisie, et assez de lignes pour ce qu\'il dit', () => {
    const a = texte([{ morceaux: [{ t: 'x'.repeat(100) }] }], { largeur: 300 })
    const e = tailleEstimee(a)
    expect(e.l).toBe(300)
    expect(e.h).toBeGreaterThan(3 * 28)
  })
})

describe('lu d\'ailleurs (le presse-papiers)', () => {
  it('un texte valable est relu, drapeaux et couleurs propres', () => {
    expect(lireTexte([{ morceaux: [{ t: 'a', g: 1, c: '#ABCDEF', x: 'jeté' }], puce: 'oui' }])).toEqual([{ morceaux: [{ t: 'a', g: true, c: '#abcdef' }], puce: true }])
  })

  it('un texte abîmé est refusé en entier', () => {
    expect(lireTexte('a')).toBeNull()
    expect(lireTexte([])).toBeNull()
    expect(lireTexte([{ morceaux: 'a' }])).toBeNull()
    expect(lireTexte([{ morceaux: [{ t: 3 }] }])).toBeNull()
    expect(lireTexte([{ morceaux: [{ t: 'a', c: 'red; background: url(x)' }] }])).toBeNull()
    expect(lireTexte([{ morceaux: [{ t: 'a'.repeat(20_001) }] }])).toBeNull()
  })

  it('collé : le texte reste un texte, son latex refait d\'après ses lignes, sa largeur gardée', () => {
    const t = { ...texte(EXERCICE, { largeur: 320 }), latex: '\\text{autre chose}' }
    const c: Copie = { v: 1, formes: [t], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 1 }
    const r = lireJson(JSON.stringify(c))!
    const f = r.formes[0] as Formule
    expect(f.texte).toEqual(t.texte)
    expect(f.largeur).toBe(320)
    expect(f.latex).toBe(latexDuTexte(EXERCICE))
    expect(lireJson(JSON.stringify({ ...c, formes: [{ ...t, texte: [{ morceaux: [{ t: 1 }] }] }] }))).toBeNull()
    expect(lireJson(JSON.stringify({ ...c, formes: [{ ...t, largeur: -5 }] }))).toBeNull()
  })

  it('copié vers un autre logiciel : le texte à plat', () => {
    const c: Copie = { v: 1, formes: [texte(EXERCICE)], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 1 }
    expect(versTexte(c)).toBe(texteBrut(EXERCICE))
  })
})

describe('le cadre de taille', () => {
  it('tiré par un côté : la largeur change, pas les caractères', () => {
    const t = texte(EXERCICE, { largeur: 300 })
    // Le côté droit tiré : × 1,5 dans le sens de la largeur, ancré à gauche
    const g = transformerForme(t, echelle({ x: 10, y: 20 }, 1.5, 1)) as Formule
    expect(g.largeur).toBe(450)
    expect(g.taille).toBe(28)
    expect([g.x, g.y]).toEqual([10, 20])
  })

  it('un texte qui s\'allongeait, tiré par un côté, prend une largeur (d\'après sa mesure)', () => {
    const t = texte(EXERCICE)
    const g = transformerForme(t, echelle({ x: 10, y: 20 }, 0.5, 1), () => ({ l: 400, h: 100 })) as Formule
    expect(g.largeur).toBe(200)
    // Jamais plus étroit que LARGEUR_MIN
    const h = transformerForme(t, echelle({ x: 10, y: 20 }, 0.01, 1), () => ({ l: 400, h: 100 })) as Formule
    expect(h.largeur).toBe(LARGEUR_MIN)
  })

  it('tiré par un coin : les caractères et la largeur, ensemble', () => {
    const t = texte(EXERCICE, { largeur: 300 })
    const g = transformerForme(t, echelle({ x: 10, y: 20 }, 2, 2)) as Formule
    expect(g.taille).toBe(56)
    expect(g.largeur).toBe(600)
  })
})

describe('la recherche', () => {
  it('trouve un mot tapé, et les mots d\'une formule du texte', () => {
    const f = { latex: '', texte: texteBrut(EXERCICE) }
    expect(score('mange', motsDeFormule(f))).not.toBeNull()
    expect(score('fraction', motsDeFormule(f))).not.toBeNull()
    expect(score('chocolat', motsDeFormule(f))).toBeNull()
  })
})
