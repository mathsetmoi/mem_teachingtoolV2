// Mes emplacements (lot 7) : la liste relue de l'index, l'emplacement qui
// vaut pour un classeur (celui de sa classe, ou d'un dossier parent), les
// classeurs d'une classe, le rangement en sous-dossiers et les noms libres.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { classeursDeLaClasse, emplacementDe, lireEmplacements, nomDeFichierLibre, sousDossiers } from '../src/classeurs/emplacements'
import type { Emplacement } from '../src/classeurs/emplacements'

const dossier = (id: string, nom: string, parent: string | null, o: Partial<FicheDossier> = {}): FicheDossier =>
  ({ id, nom, parent, couleur: '#3b6fb6', cree: 1, ...o })
const classeur = (id: string, nom: string, dossierId: string | null, o: Partial<FicheClasseur> = {}): FicheClasseur =>
  ({ id, base: 'mem-teachingtool-classeur-' + id, nom, dossier: dossierId, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o } as FicheClasseur)

const A5 = dossier('d5a', '5A', null)
const GEO = dossier('dgeo', 'Géométrie', 'd5a')
const B4 = dossier('d4b', '4B', null)
const JETE = dossier('djete', 'Ancienne', null, { corbeille: { t: 5 } })
const DOSSIERS = [A5, GEO, B4, JETE]
const ID1 = '0123456789abcdef', ID2 = 'fedcba9876543210'

describe('Mes emplacements', () => {
  it('lireEmplacements : seulement ce qui est bien formé, sans doublon', () => {
    const l = lireEmplacements([
      { id: ID1, genre: 'ordinateur', dossier: 'd5a', nom: 'Classe 5A', cree: 3 },
      { id: ID2, genre: 'drive', dossier: 'd4b', nom: '4B', compte: 'lfb', cree: 4 },
      { id: ID1, genre: 'drive', dossier: 'd4b', nom: 'doublon', compte: 'mem' },
      { id: 'court', genre: 'drive', dossier: 'd4b', nom: 'x', compte: 'mem' },
      { id: 'aaaaaaaaaaaaaaaa', genre: 'drive', dossier: 'd4b', nom: 'sans compte' },
      { id: 'bbbbbbbbbbbbbbbb', genre: 'nuage', dossier: 'd4b', nom: 'x' },
      null, 12,
    ])
    expect(l).toEqual([
      { id: ID1, genre: 'ordinateur', dossier: 'd5a', nom: 'Classe 5A', cree: 3 },
      { id: ID2, genre: 'drive', dossier: 'd4b', nom: '4B', compte: 'lfb', cree: 4 },
    ])
    expect(lireEmplacements(undefined)).toEqual([])
    expect(lireEmplacements({ id: ID1 })).toEqual([])
  })

  it('emplacementDe : celui du dossier, sinon d\'un parent ; rien dans la corbeille', () => {
    const liste: Emplacement[] = [
      { id: ID1, genre: 'ordinateur', dossier: 'd5a', nom: 'Classe 5A', cree: 1 },
      { id: ID2, genre: 'drive', dossier: 'djete', nom: 'Ancienne', compte: 'mem', cree: 1 },
    ]
    expect(emplacementDe('dgeo', 'ordinateur', liste, DOSSIERS)?.id).toBe(ID1)
    expect(emplacementDe('d5a', 'ordinateur', liste, DOSSIERS)?.id).toBe(ID1)
    expect(emplacementDe('dgeo', 'drive', liste, DOSSIERS)).toBeNull()
    expect(emplacementDe('d4b', 'ordinateur', liste, DOSSIERS)).toBeNull()
    expect(emplacementDe(null, 'ordinateur', liste, DOSSIERS)).toBeNull()
    expect(emplacementDe('djete', 'drive', liste, DOSSIERS)).toBeNull()
  })

  it('classeursDeLaClasse : ceux de la classe et de ses sous-dossiers, par nom, sans la corbeille', () => {
    const fiches = [
      classeur('c1', 'Symétrie', 'dgeo'),
      classeur('c2', 'Fractions', 'd5a'),
      classeur('c3', 'Calcul', 'd4b'),
      classeur('c4', 'Effacé', 'd5a', { corbeille: { t: 2 } } as Partial<FicheClasseur>),
      classeur('c5', 'Racine', null),
    ]
    expect(classeursDeLaClasse('d5a', fiches, DOSSIERS).map(f => f.nom)).toEqual(['Fractions', 'Symétrie'])
    expect(classeursDeLaClasse('d4b', fiches, DOSSIERS).map(f => f.nom)).toEqual(['Calcul'])
  })

  it('sousDossiers : le chemin entre la classe et le dossier du classeur', () => {
    expect(sousDossiers('dgeo', 'd5a', DOSSIERS)).toEqual(['Géométrie'])
    expect(sousDossiers('d5a', 'd5a', DOSSIERS)).toEqual([])
    expect(sousDossiers('d4b', 'd5a', DOSSIERS)).toEqual([])
  })

  it('nomDeFichierLibre : « Fractions (2).memc » quand le nom est pris (sans tenir compte des majuscules)', () => {
    expect(nomDeFichierLibre('Fractions', '.memc', [])).toBe('Fractions.memc')
    expect(nomDeFichierLibre('Fractions', '.memc', ['fractions.MEMC'])).toBe('Fractions (2).memc')
    expect(nomDeFichierLibre('Fractions', '.memc', ['Fractions.memc', 'Fractions (2).memc'])).toBe('Fractions (3).memc')
  })
})
