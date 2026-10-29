// Le classeur « Séances isolées » de chaque niveau (lot 17) : reconnu à son
// nom, trouvé directement dans le dossier du niveau (le plus récemment
// ouvert s'il y en a deux), rangé en dernier dans son niveau, et les textes
// de la fenêtre « Bonjour ! » et du message d'arrivée. Tout est pur.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { baseDe } from '../src/classeurs/demarrage'
import { HORS_CHAPITRE, NOM_SEANCES_ISOLEES, classeurSeancesIsolees, estSeancesIsolees, isoleesEnQueue, texteClasseurIsoleesCree, texteSeanceIsolee } from '../src/classeurs/isolees'

const T = new Date(2026, 9, 10, 14, 5).getTime()
const H = 3600_000

function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function dossier(id: string, o: Partial<FicheDossier> = {}): FicheDossier {
  return { id, nom: 'Dossier ' + id, parent: null, couleur: '#3b6fb6', cree: 1, ...o }
}
const carte = (...d: FicheDossier[]) => new Map(d.map(x => [x.id, x]))

describe('reconnaître le classeur « Séances isolées »', () => {
  it('à son nom, sans la casse ni les blancs en trop', () => {
    expect(NOM_SEANCES_ISOLEES).toBe('Séances isolées')
    for (const nom of ['Séances isolées', 'séances  isolées', 'SÉANCES ISOLÉES', '  Séances isolées ', 'Séances\tisolées']) {
      expect(estSeancesIsolees({ nom }), nom).toBe(true)
    }
  })
  it('un nom qui en diffère est un chapitre ordinaire', () => {
    for (const nom of ['Séances isolées 5ème', 'Séances isolées (copie)', 'Séance isolée', 'Isolées', 'Fractions', '']) {
      expect(estSeancesIsolees({ nom }), nom).toBe(false)
    }
  })
})

describe('le classeur « Séances isolées » d\'un dossier', () => {
  const d5 = dossier('d5', { nom: '5ème', etiquette: '5ème' }), geo = dossier('geo', { nom: 'Géométrie', parent: 'd5' })
  const poubelle = dossier('pb', { nom: 'Archives', corbeille: { t: T } })
  const dossiers = carte(d5, geo, poubelle)

  it('seulement le dossier lui-même, pas ses sous-dossiers ; null s\'il n\'y en a pas', () => {
    const iso = fiche('iso', { nom: 'Séances isolées', dossier: 'd5' })
    const sous = fiche('sous', { nom: 'Séances isolées', dossier: 'geo' })
    const frac = fiche('frac', { nom: 'Fractions', dossier: 'd5' })
    expect(classeurSeancesIsolees('d5', [frac, sous, iso], dossiers)?.id).toBe('iso')
    expect(classeurSeancesIsolees('geo', [frac, sous, iso], dossiers)?.id).toBe('sous')
    expect(classeurSeancesIsolees('d5', [frac, sous], dossiers)).toBeNull()
    expect(classeurSeancesIsolees('d5', [], dossiers)).toBeNull()
  })

  it('ignore la corbeille, une création ou un effacement en cours, et un dossier dans la corbeille', () => {
    const l = [
      fiche('a', { nom: 'Séances isolées', dossier: 'd5', corbeille: { t: T } }),
      fiche('b', { nom: 'Séances isolées', dossier: 'd5', creation: T }),
      fiche('c', { nom: 'Séances isolées', dossier: 'd5', effacement: T }),
      fiche('d', { nom: 'Séances isolées', dossier: 'pb' }),
    ]
    expect(classeurSeancesIsolees('d5', l, dossiers)).toBeNull()
    expect(classeurSeancesIsolees('pb', l, dossiers)).toBeNull()
    expect(classeurSeancesIsolees(null, l, dossiers)).toBeNull()
    expect(classeurSeancesIsolees('d5', [...l, fiche('e', { nom: 'Séances isolées', dossier: 'd5' })], dossiers)?.id).toBe('e')
  })

  it('deux classeurs : le plus récemment ouvert, puis modifié, puis le plus petit id', () => {
    const a = fiche('a', { nom: 'Séances isolées', dossier: 'd5', ouvert: T - H, modifie: T })
    const b = fiche('b', { nom: 'Séances isolées', dossier: 'd5', ouvert: T, modifie: T - H })
    expect(classeurSeancesIsolees('d5', [a, b], dossiers)?.id).toBe('b')
    const c = fiche('c', { nom: 'Séances isolées', dossier: 'd5', ouvert: T, modifie: T })
    expect(classeurSeancesIsolees('d5', [a, b, c], dossiers)?.id).toBe('c')
    const d = fiche('d', { nom: 'Séances isolées', dossier: 'd5', ouvert: T, modifie: T })
    expect(classeurSeancesIsolees('d5', [d, c, a, b], dossiers)?.id).toBe('c')
    // La liste d'entrée n'est pas changée
    const l = [b, a]
    classeurSeancesIsolees('d5', l, dossiers)
    expect(l.map(x => x.id)).toEqual(['b', 'a'])
  })

  it('à la racine : sans dossier, ou dans un dossier qui n\'existe plus', () => {
    const sans = fiche('sans', { nom: 'Séances isolées' })
    const parti = fiche('parti', { nom: 'Séances isolées', dossier: 'disparu', ouvert: T })
    const dedans = fiche('dedans', { nom: 'Séances isolées', dossier: 'd5', ouvert: T })
    expect(classeurSeancesIsolees(null, [dedans, sans], dossiers)?.id).toBe('sans')
    expect(classeurSeancesIsolees(null, [dedans, sans, parti], dossiers)?.id).toBe('parti')
    expect(classeurSeancesIsolees(null, [dedans], dossiers)).toBeNull()
    // Les dossiers en liste, comme en carte
    expect(classeurSeancesIsolees(null, [dedans, sans], [d5, geo, poubelle])?.id).toBe('sans')
  })
})

describe('les isolés en queue', () => {
  it('rejetés à la fin, l\'ordre des autres intact, stable avec deux isolés', () => {
    const l = [fiche('1', { nom: 'Séances isolées' }), fiche('2', { nom: 'Zèbres' }), fiche('3', { nom: 'séances isolées' }), fiche('4', { nom: 'Angles' })]
    expect(isoleesEnQueue(l).map(x => x.id)).toEqual(['2', '4', '1', '3'])
    expect(l.map(x => x.id)).toEqual(['1', '2', '3', '4'])
    expect(isoleesEnQueue([]).length).toBe(0)
    expect(isoleesEnQueue([fiche('a'), fiche('b')]).map(x => x.id)).toEqual(['a', 'b'])
    // Marche avec n'importe quoi qui a un nom (les lignes de « Chapitres de 5ème »)
    expect(isoleesEnQueue([{ nom: 'Séances isolées', k: 1 }, { nom: 'Fractions', k: 2 }]).map(x => x.k)).toEqual([2, 1])
  })
})

describe('les textes', () => {
  it('sous le lien « Séance isolée » : « de 5ème », « de « Soutien » », la racine', () => {
    expect(texteSeanceIsolee('5ème')).toBe('Hors chapitre : rangée dans « Séances isolées » de 5ème.')
    expect(texteSeanceIsolee('Tle spé')).toBe('Hors chapitre : rangée dans « Séances isolées » de Tle spé.')
    expect(texteSeanceIsolee('Soutien')).toBe('Hors chapitre : rangée dans « Séances isolées » de « Soutien ».')
    expect(texteSeanceIsolee(null)).toBe('Hors chapitre : rangée dans « Séances isolées ».')
  })
  it('le message d\'arrivée quand le classeur vient d\'être créé', () => {
    expect(texteClasseurIsoleesCree('5ème')).toBe('Classeur « Séances isolées » créé en 5ème : vos séances hors chapitre iront là.')
    expect(texteClasseurIsoleesCree('Soutien')).toBe('Classeur « Séances isolées » créé dans « Soutien » : vos séances hors chapitre iront là.')
    expect(texteClasseurIsoleesCree(null)).toBe('Classeur « Séances isolées » créé : vos séances hors chapitre iront là.')
  })
  it('la mention de la carte', () => {
    expect(HORS_CHAPITRE).toBe('Hors chapitre')
  })
})
