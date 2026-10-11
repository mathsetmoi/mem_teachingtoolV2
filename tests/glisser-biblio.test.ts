// Déplacer un classeur ou un dossier dans la bibliothèque (lot 4, C7) : la
// cible sous le pointeur pendant un glisser, les places qu'on ne peut pas
// choisir (ni dans soi-même ni dans un descendant, ni là où il est déjà),
// la liste en arbre de « Déplacer vers… », et le message qui dit ce qui
// s'est passé (les étiquettes de classe qui suivent le dossier). Tout est
// pur ; un cycle de dossiers (deux onglets) ne fait jamais boucler la liste.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { PROFONDEUR_MAX, baseDe } from '../src/classeurs/demarrage'
import { COULEURS, COULEUR_DEFAUT, etiquettesEffectives } from '../src/classeurs/arbre'
import {
  DOSSIER_PARTI, LIBELLE_RACINE, REFUS_CYCLE, cibleSous, dejaLa, destinations, interdits, objetClasseur, objetDossier, ouIlEst,
  texteAllerA, texteDeplacement, texteRetour,
} from '../src/classeurs/deplacer'
import type { Zone } from '../src/classeurs/deplacer'

function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function dossier(id: string, o: Partial<FicheDossier> = {}): FicheDossier {
  return { id, nom: 'Dossier ' + id, parent: null, couleur: COULEUR_DEFAUT, cree: 1, ...o }
}
const carte = (...d: FicheDossier[]) => new Map(d.map(x => [x.id, x]))

/** 5e B (classe) › Géométrie › Symétrie ; 2nde 3 ; Archives (à la corbeille) */
const ARBRE = carte(
  dossier('5b', { nom: '5e B', etiquette: '5e B', couleur: COULEURS[2].valeur }),
  dossier('geo', { nom: 'Géométrie', parent: '5b' }),
  dossier('sym', { nom: 'Symétrie', parent: 'geo' }),
  dossier('23', { nom: '2nde 3', etiquette: '2nde 3' }),
  dossier('arc', { nom: 'Archives', corbeille: { t: 5 } }),
)

describe('cibleSous : la cible sous le pointeur', () => {
  const zones: Zone[] = [
    { id: null, x: 0, y: 0, l: 120, h: 40 },     // « Bibliothèque », dans le fil d'Ariane
    { id: '5b', x: 0, y: 100, l: 200, h: 180 },  // la carte de « 5e B »
    { id: 'geo', x: 216, y: 100, l: 200, h: 180 },
  ]
  it('la zone qui contient le point, bords compris', () => {
    expect(cibleSous(50, 150, zones, new Set())?.id).toBe('5b')
    expect(cibleSous(0, 100, zones, new Set())?.id).toBe('5b')
    expect(cibleSous(200, 280, zones, new Set())?.id).toBe('5b')
    expect(cibleSous(300, 200, zones, new Set())?.id).toBe('geo')
    expect(cibleSous(60, 20, zones, new Set())?.id).toBe(null)
  })
  it('hors de toute zone (entre deux cartes, sous la grille) : rien', () => {
    expect(cibleSous(208, 150, zones, new Set())).toBeNull()
    expect(cibleSous(50, 60, zones, new Set())).toBeNull()
    expect(cibleSous(50, 900, zones, new Set())).toBeNull()
  })
  it('une zone interdite : rien, même la racine', () => {
    expect(cibleSous(50, 150, zones, new Set(['5b']))).toBeNull()
    expect(cibleSous(60, 20, zones, new Set([null]))).toBeNull()
    expect(cibleSous(300, 200, zones, new Set(['5b']))?.id).toBe('geo')
  })
  it('une zone sans taille (cachée) ne prend rien', () => {
    expect(cibleSous(0, 0, [{ id: 'x', x: 0, y: 0, l: 0, h: 0 }], new Set())).toBeNull()
  })
})

describe('interdits : ni dans soi-même ni dans un descendant, ni là où il est déjà', () => {
  it('un classeur : seulement le dossier où il est', () => {
    expect([...interdits(objetClasseur(fiche('a', { dossier: 'geo' })), ARBRE)]).toEqual(['geo'])
    expect([...interdits(objetClasseur(fiche('a')), ARBRE)]).toEqual([null])
  })
  it('un classeur dont le dossier n\'existe plus est à la racine', () => {
    expect(ouIlEst(objetClasseur(fiche('a', { dossier: 'parti' })), ARBRE)).toBeNull()
    expect([...interdits(objetClasseur(fiche('a', { dossier: 'parti' })), ARBRE)]).toEqual([null])
    expect(dejaLa(fiche('a', { dossier: 'parti' }), null, ARBRE)).toBe(true)
  })
  it('un dossier : lui-même, tous ses descendants, et son parent', () => {
    const r = interdits(objetDossier(ARBRE.get('5b')!), ARBRE)
    expect([...r].sort()).toEqual(['5b', 'geo', 'sym', null].sort())
    expect(r.has('23')).toBe(false)
    const g = interdits(objetDossier(ARBRE.get('geo')!), ARBRE)
    expect([...g].sort()).toEqual(['5b', 'geo', 'sym'].sort())
  })
  it('un cycle A → B → A (deux onglets) : la remontée finit, chacun est à la racine', () => {
    const c = carte(dossier('A', { parent: 'B' }), dossier('B', { parent: 'A' }), dossier('C', { parent: 'A' }))
    expect(ouIlEst(objetDossier(c.get('A')!), c)).toBeNull()
    const r = interdits(objetDossier(c.get('A')!), c)
    expect(r.has('A') && r.has('C') && r.has(null)).toBe(true)
  })
})

describe('destinations : l\'arbre de « Déplacer vers… »', () => {
  it('la racine d\'abord, puis chaque dossier suivi de ses sous-dossiers, en retrait ; la corbeille n\'y est pas', () => {
    const l = destinations(objetClasseur(fiche('a', { dossier: 'geo' })), ARBRE)
    expect(l.map(d => `${'  '.repeat(d.profondeur)}${d.nom}${d.ici ? ' (ici)' : ''}${d.interdit ? ' (non)' : ''}`)).toEqual([
      LIBELLE_RACINE, '  2nde 3', '  5e B', '    Géométrie (ici)', '      Symétrie',
    ])
    expect(l[0].id).toBeNull()
    expect(l.find(d => d.id === 'sym')?.chemin).toBe('5e B › Géométrie › Symétrie')
    expect(l.find(d => d.id === '5b')?.couleur).toBe(COULEURS[2].valeur)
    expect(l[0].couleur).toBeNull()
  })
  it('un classeur de la racine : la racine est « ici »', () => {
    const l = destinations(objetClasseur(fiche('a')), ARBRE)
    expect(l[0].ici).toBe(true)
    expect(l.filter(d => d.ici || d.interdit).length).toBe(1)
  })
  it('un dossier : lui-même et ses descendants grisés, son parent « (ici) »', () => {
    const l = destinations(objetDossier(ARBRE.get('geo')!), ARBRE)
    const etat = Object.fromEntries(l.map(d => [d.id ?? 'racine', d.ici ? 'ici' : d.interdit ? 'non' : 'oui']))
    expect(etat).toEqual({ racine: 'oui', 23: 'oui', '5b': 'ici', geo: 'non', sym: 'non' })
  })
  it('un dossier de la racine : la racine est « ici »', () => {
    const l = destinations(objetDossier(ARBRE.get('5b')!), ARBRE)
    expect(l[0].ici).toBe(true)
    expect(l.filter(d => !d.ici && !d.interdit).map(d => d.id)).toEqual(['23'])
  })
  it('un cycle et 100 niveaux : chaque dossier une fois, la liste finit', () => {
    const c = carte(dossier('A', { parent: 'B' }), dossier('B', { parent: 'A' }))
    for (let i = 0; i < 100; i++) c.set('n' + i, dossier('n' + i, { nom: 'N' + i, parent: i ? 'n' + (i - 1) : null }))
    const l = destinations(objetClasseur(fiche('x')), c)
    const ids = l.map(d => d.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.includes('A') && ids.includes('B')).toBe(true)
    expect(Math.max(...l.map(d => d.profondeur))).toBeLessThanOrEqual(PROFONDEUR_MAX + 1)
  })
})

describe('le message d\'un déplacement', () => {
  it('« « Symétrie » déplacé dans « 5e B » », et ce qu\'il porte maintenant', () => {
    const f = fiche('a', { nom: 'Symétrie', dossier: '23' })
    const avant = etiquettesEffectives(f, ARBRE).map(e => e.nom)
    const apres = etiquettesEffectives({ ...f, dossier: '5b' }, ARBRE).map(e => e.nom)
    expect(texteDeplacement({ genre: 'classeur', nom: 'Symétrie', vers: '5e B', avant, apres }))
      .toBe('« Symétrie » déplacé dans « 5e B » : il porte maintenant l\'étiquette « 5e B » (et plus « 2nde 3 »)')
    expect(texteDeplacement({ genre: 'classeur', nom: 'Symétrie', vers: 'Géométrie', avant: [], apres: ['5e B'] }))
      .toBe('« Symétrie » déplacé dans « Géométrie » : il porte maintenant l\'étiquette « 5e B »')
    expect(texteDeplacement({ genre: 'classeur', nom: 'Symétrie', vers: null, avant: ['5e B'], apres: [] }))
      .toBe('« Symétrie » déplacé à la racine de la bibliothèque : il ne porte plus l\'étiquette « 5e B »')
  })
  it('sans changement d\'étiquette : le seul déplacement ; une étiquette propre ne bouge pas', () => {
    expect(texteDeplacement({ genre: 'classeur', nom: 'Fractions', vers: 'Géométrie', avant: ['5e B'], apres: ['5e B'] }))
      .toBe('« Fractions » déplacé dans « Géométrie »')
    const f = fiche('a', { nom: 'X', etiquettes: ['5e B'], dossier: null })
    expect(etiquettesEffectives({ ...f, dossier: '5b' }, ARBRE).map(e => e.nom)).toEqual(['5e B'])
  })
  it('un dossier : « ses classeurs portent maintenant… »', () => {
    expect(texteDeplacement({ genre: 'dossier', nom: 'Géométrie', vers: '5e B', avant: [], apres: ['5e B'] }))
      .toBe('Dossier « Géométrie » déplacé dans « 5e B » : ses classeurs portent maintenant l\'étiquette « 5e B »')
    expect(texteDeplacement({ genre: 'dossier', nom: 'Géométrie', vers: null, avant: ['5e B'], apres: [] }))
      .toBe('Dossier « Géométrie » déplacé à la racine de la bibliothèque : ses classeurs ne portent plus l\'étiquette « 5e B »')
  })
  it('plusieurs étiquettes, une même écrite autrement', () => {
    expect(texteDeplacement({ genre: 'classeur', nom: 'X', vers: 'Y', avant: ['5e b'], apres: ['5e B', 'Soutien', 'Club'] }))
      .toBe('« X » déplacé dans « Y » : il porte maintenant les étiquettes « Soutien » et « Club »')
  })
  it('les textes fixes', () => {
    expect(texteAllerA('5e B')).toBe('Aller à « 5e B »')
    expect(texteAllerA(null)).toBe('Aller à la racine')
    expect(texteRetour({ genre: 'classeur', nom: 'Symétrie', vers: '2nde 3' })).toBe('« Symétrie » est revenu dans « 2nde 3 »')
    expect(texteRetour({ genre: 'dossier', nom: 'Géométrie', vers: null })).toBe('Le dossier « Géométrie » est revenu à la racine de la bibliothèque')
    expect(REFUS_CYCLE).toBe('Ce dossier ne peut pas aller dans l\'un de ses propres sous-dossiers.')
    expect(DOSSIER_PARTI).toBe('Ce dossier n\'existe plus.')
  })
})
