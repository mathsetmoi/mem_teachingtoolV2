// L'arbre de la bibliothèque (lot 4, C6) : les dossiers imbriqués et
// colorés, les étiquettes de classe (propres, ou héritées du dossier de
// classe, calculées et jamais écrites), le filtre, le tri, le nom d'une
// copie. Tout est pur ; un cycle de dossiers (deux onglets) ne fait jamais
// boucler une remontée.
import { describe, expect, it } from 'vitest'
import type { FicheClasseur, FicheDossier } from '../src/classeurs/demarrage'
import { PROFONDEUR_MAX, baseDe } from '../src/classeurs/demarrage'
import {
  COULEURS, COULEUR_DEFAUT, ETIQUETTES_MAX, ajouterEtiquette, chemin, cheminLisible, cleDe, compter, couleurDe, descendants,
  dossierVisible, enCycle, enfants, estDans, etiquetteHeritee, etiquettesDe, etiquettesEffectives, filAriane, libelleDossier,
  nomDEtiquette, nomDeDossier, nomLibre, parentAffiche, porte, rangDeClasse, remontee, ressembleAUneClasse, texteLecteurDossier, trier,
} from '../src/classeurs/arbre'

const T = new Date(2026, 9, 10, 14, 5).getTime()

function fiche(id: string, o: Partial<FicheClasseur> = {}): FicheClasseur {
  return { id, base: baseDe(id), nom: 'Classeur ' + id, dossier: null, etiquettes: [], cree: 1, modifie: 1, ouvert: 0, pages: 1, ...o }
}
function dossier(id: string, o: Partial<FicheDossier> = {}): FicheDossier {
  return { id, nom: 'Dossier ' + id, parent: null, couleur: COULEUR_DEFAUT, cree: 1, ...o }
}
const carte = (...d: FicheDossier[]) => new Map(d.map(x => [x.id, x]))

describe('les classes', () => {
  it('ressemble à une classe : au début du nom, sans tenir compte de la casse', () => {
    for (const n of ['5e B', '5eB', '5E B', '6e1', '3ème A', '4eme 2', '4è C', '5ÈME B', '2nde 3', '2de A', 'Seconde 4', '2NDE-1',
      '1re S', '1ère G', '1ere 2', 'Première B', 'Tle S', 'Term ES', 'Terminale 2', 'CP', 'CE1', 'ce2 a', 'CM1', 'CM2 B', 'BTS SIO', 'CAP 1', '5e']) {
      expect(ressembleAUneClasse(n), n).toBe(true)
    }
    for (const n of ['Archives', 'Symétrie', '3 exercices', '2e trimestre', '7e B', '1e', 'Capitales', 'Termes', 'Premières notions',
      'Premier classeur', 'Mardi 5e B', '5eBis', 'Ch. 2', '', 'Terminales', 'Secondes']) {
      expect(ressembleAUneClasse(n), n).toBe(false)
    }
  })

  it('le rang dans l\'école : du CP à la terminale', () => {
    const ordre = ['CP', 'CE2', 'CM2', '6e A', '5e B', '4e C', '3e D', '2nde 1', '1re 2', 'Tle 3', 'BTS', 'CAP']
    const rangs = ordre.map(rangDeClasse)
    expect(rangs.every(r => r !== null)).toBe(true)
    expect([...rangs].sort((a, b) => a! - b!)).toEqual(rangs)
    expect(rangDeClasse('Archives')).toBeNull()
  })
})

describe('les dossiers', () => {
  const classe = dossier('b', { nom: '5e B', etiquette: '5e B' })
  const geo = dossier('g', { nom: 'Géométrie', parent: 'b' })
  const tri = dossier('t', { nom: 'Triangles', parent: 'g' })
  const arch = dossier('a', { nom: 'Archives' })
  const D = carte(classe, geo, tri, arch)

  it('chemin et fil d\'Ariane : de la racine au dossier', () => {
    expect(chemin('t', D)).toEqual(['5e B', 'Géométrie', 'Triangles'])
    expect(filAriane('g', D).map(d => d.id)).toEqual(['b', 'g'])
    expect(chemin(null, D)).toEqual([])
    expect(chemin('parti', D)).toEqual([])
    expect(cheminLisible('g', D)).toBe('5e B › Géométrie')
    expect(cheminLisible(null, D)).toBe('Bibliothèque')
    // Un tableau marche comme une carte
    expect(chemin('t', [classe, geo, tri])).toEqual(['5e B', 'Géométrie', 'Triangles'])
  })

  it('enfants (par nom), descendants, parent montré', () => {
    expect(enfants(null, D).map(d => d.nom)).toEqual(['5e B', 'Archives'])
    expect(enfants('b', D).map(d => d.id)).toEqual(['g'])
    expect(descendants('b', D).map(d => d.id)).toEqual(['g', 't'])
    expect(descendants('t', D)).toEqual([])
    expect(parentAffiche(tri, D)).toBe('g')
    // Un parent qui n'existe plus : à la racine
    const orphelin = dossier('o', { parent: 'parti' })
    expect(parentAffiche(orphelin, carte(orphelin))).toBeNull()
    expect(enfants(null, carte(orphelin)).map(d => d.id)).toEqual(['o'])
  })

  it('« Ch. 2 » avant « Ch. 10 » ; la casse et les accents ne comptent pas', () => {
    const l = carte(dossier('1', { nom: 'Ch. 10' }), dossier('2', { nom: 'ch. 2' }), dossier('3', { nom: 'Évaluations' }), dossier('4', { nom: 'equations' }))
    expect(enfants(null, l).map(d => d.nom)).toEqual(['ch. 2', 'Ch. 10', 'equations', 'Évaluations'])
  })

  it('compter : les classeurs dedans (sous-dossiers compris), les sous-dossiers directs', () => {
    const fiches = [
      fiche('1', { dossier: 'b' }), fiche('2', { dossier: 'g' }), fiche('3', { dossier: 't' }), fiche('4', { dossier: 't', corbeille: { t: 1 } }),
      fiche('5', { dossier: 'a' }), fiche('6'), fiche('7', { dossier: 'g', creation: 1 }),
    ]
    expect(compter('b', fiches, D)).toEqual({ classeurs: 3, dossiers: 1 })
    expect(compter('g', fiches, D)).toEqual({ classeurs: 2, dossiers: 1 })
    expect(compter('a', fiches, D)).toEqual({ classeurs: 1, dossiers: 0 })
    expect(libelleDossier({ classeurs: 4, dossiers: 2 })).toBe('4 classeurs · 2 dossiers')
    expect(libelleDossier({ classeurs: 1, dossiers: 0 })).toBe('1 classeur')
    expect(libelleDossier({ classeurs: 0, dossiers: 3 })).toBe('3 dossiers')
    expect(libelleDossier({ classeurs: 0, dossiers: 0 })).toBe('Vide')
    expect(texteLecteurDossier(classe, { classeurs: 4, dossiers: 2 })).toBe('5e B, dossier bleu, dossier d\'une classe, 4 classeurs, 2 dossiers')
    expect(texteLecteurDossier(arch, { classeurs: 0, dossiers: 0 })).toBe('Archives, dossier bleu, vide')
  })

  it('estDans : la racine reçoit aussi un classeur dont le dossier n\'existe plus', () => {
    expect(estDans(fiche('1'), null, D)).toBe(true)
    expect(estDans(fiche('2', { dossier: 'parti' }), null, D)).toBe(true)
    expect(estDans(fiche('3', { dossier: 'b' }), null, D)).toBe(false)
    expect(estDans(fiche('3', { dossier: 'b' }), 'b', D)).toBe(true)
  })

  it('la corbeille : un dossier dont un parent y est ne se montre pas', () => {
    const c = carte(dossier('x', { corbeille: { t: 1 } }), dossier('y', { parent: 'x' }), dossier('z'))
    expect(dossierVisible(c.get('y')!, c)).toBe(false)
    expect(enfants(null, c).map(d => d.id)).toEqual(['z'])
  })

  it('les couleurs : huit, nommées ; une valeur inconnue vaut Bleu', () => {
    expect(COULEURS.map(c => c.nom)).toEqual(['Gris', 'Bleu', 'Vert', 'Jaune', 'Orange', 'Rouge', 'Violet', 'Rose'])
    expect(COULEURS.map(c => c.valeur)).toEqual(['#8a94a6', '#3b6fb6', '#2f8a57', '#b8901f', '#cf7a2b', '#c24a4a', '#7d5ba6', '#b9578a'])
    expect(couleurDe('#2F8A57').nom).toBe('Vert')
    expect(couleurDe('#1f5fbf').nom).toBe('Bleu')
    expect(couleurDe(undefined).valeur).toBe(COULEUR_DEFAUT)
  })

  it('les noms : 40 caractères pour un dossier, 20 pour une étiquette, rien de vide', () => {
    expect(nomDeDossier('  5e   B ')).toBe('5e B')
    expect(nomDeDossier('x'.repeat(50))).toHaveLength(40)
    expect(nomDeDossier('   ')).toBeNull()
    expect(nomDEtiquette('Seconde générale et technologique')).toBe('Seconde générale et')
    expect(nomDEtiquette('y'.repeat(30))).toHaveLength(20)
    expect(cleDe('  5E   b ')).toBe(cleDe('5e B'))
  })
})

describe('un cycle de dossiers (deux onglets) : rien ne boucle', () => {
  // A → B → A : chacun dans l'autre ; C dans A ; un classeur dans chacun
  const A = dossier('A', { nom: 'A', parent: 'B', etiquette: '5e A' })
  const B = dossier('B', { nom: 'B', parent: 'A' })
  const C = dossier('C', { nom: 'C', parent: 'A' })
  const D = carte(A, B, C)
  const fiches = [fiche('1', { dossier: 'A' }), fiche('2', { dossier: 'B' }), fiche('3', { dossier: 'C' })]

  it('les dossiers du cycle se montrent à la racine ; C reste dans A', () => {
    expect(enCycle('A', D)).toBe(true)
    expect(enCycle('B', D)).toBe(true)
    expect(enCycle('C', D)).toBe(false)
    expect(enfants(null, D).map(d => d.id)).toEqual(['A', 'B'])
    expect(enfants('A', D).map(d => d.id)).toEqual(['C'])
  })

  it('chemin, descendants, compter et etiquetteHeritee finissent', () => {
    expect(chemin('A', D)).toEqual(['A'])
    expect(chemin('C', D)).toEqual(['A', 'C'])
    expect(remontee('B', D).map(d => d.id)).toEqual(['B'])
    expect(descendants('A', D).map(d => d.id)).toEqual(['C'])
    expect(descendants('B', D)).toEqual([])
    expect(compter('A', fiches, D)).toEqual({ classeurs: 2, dossiers: 1 })
    expect(etiquetteHeritee('C', D)?.nom).toBe('5e A')
    // B est à la racine : il n'hérite pas de A
    expect(etiquetteHeritee('B', D)).toBeNull()
    expect(etiquettesDe(fiches, D)).toEqual([{ nom: '5e A', n: 2 }])
  })

  it('un dossier dans lui-même, et une très longue chaîne : bornés', () => {
    const S = dossier('S', { parent: 'S' })
    expect(enCycle('S', carte(S))).toBe(true)
    expect(chemin('S', carte(S))).toEqual([S.nom])
    expect(enfants(null, carte(S)).map(d => d.id)).toEqual(['S'])
    const longue = Array.from({ length: 200 }, (_, i) => dossier('L' + i, { parent: i ? 'L' + (i - 1) : null }))
    expect(chemin('L199', longue).length).toBe(PROFONDEUR_MAX)
    expect(descendants('L0', longue)).toHaveLength(199)
  })
})

describe('les étiquettes de classe', () => {
  const classe = dossier('b', { nom: '5e B', etiquette: '5e B' })
  const geo = dossier('g', { nom: 'Géométrie', parent: 'b' })
  const arch = dossier('a', { nom: 'Archives' })
  const D = carte(classe, geo, arch)

  it('héritée du plus proche dossier de classe, calculée : elle suit le classeur', () => {
    const f = fiche('1', { dossier: 'g' })
    expect(etiquetteHeritee('g', D)).toEqual({ nom: '5e B', dossier: classe })
    expect(etiquettesEffectives(f, D)).toEqual([{ nom: '5e B', dossier: classe }])
    expect(f.etiquettes).toEqual([])
    // Glissé dans Archives : il n'a plus l'étiquette
    expect(etiquettesEffectives({ ...f, dossier: 'a' }, D)).toEqual([])
    expect(porte(f, '5E B', D)).toBe(true)
    expect(porte({ ...f, dossier: 'a' }, '5e B', D)).toBe(false)
    // Le plus proche l'emporte
    const sous = dossier('s', { nom: '5e B groupe 1', parent: 'g', etiquette: '5e B1' })
    expect(etiquetteHeritee('s', carte(classe, geo, sous))?.nom).toBe('5e B1')
  })

  it('les propres d\'abord, sans double ; l\'héritée seulement si elle n\'y est pas', () => {
    expect(etiquettesEffectives(fiche('1', { dossier: 'a', etiquettes: ['5e B', '5e  b', '2nde 3'] }), D)).toEqual([{ nom: '5e B' }, { nom: '2nde 3' }])
    expect(etiquettesEffectives(fiche('2', { dossier: 'b', etiquettes: ['5e B'] }), D)).toEqual([{ nom: '5e B' }])
    expect(etiquettesEffectives(fiche('3', { dossier: 'b', etiquettes: ['Soutien'] }), D)).toEqual([{ nom: 'Soutien' }, { nom: '5e B', dossier: classe }])
  })

  it('la rangée du filtre : chaque étiquette une fois, son nombre, dans l\'ordre des classes', () => {
    const fiches = [
      fiche('1', { dossier: 'b' }), fiche('2', { dossier: 'g' }), fiche('3', { dossier: 'g', etiquettes: ['Soutien'] }),
      fiche('4', { dossier: 'a', etiquettes: ['5e b'] }), fiche('5', { etiquettes: ['2nde 3'] }), fiche('6', { etiquettes: ['2nde 3', '6e A'] }),
    ]
    expect(etiquettesDe(fiches, D)).toEqual([{ nom: '6e A', n: 1 }, { nom: '5e B', n: 4 }, { nom: '2nde 3', n: 2 }, { nom: 'Soutien', n: 1 }])
    expect(etiquettesDe([], D)).toEqual([])
    // Écrite comme son dossier de classe l'écrit, quel que soit l'ordre des fiches
    const avant = [fiche('9', { etiquettes: ['5E b'] }), fiche('8', { etiquettes: ['5E b'] }), fiche('7', { dossier: 'b' })]
    expect(etiquettesDe(avant, D)).toEqual([{ nom: '5e B', n: 3 }])
    expect(etiquettesDe([...avant].reverse(), D)).toEqual([{ nom: '5e B', n: 3 }])
    // Sans dossier : comme le plus de classeurs l'écrivent
    const sans = [fiche('1', { etiquettes: ['soutien'] }), fiche('2', { etiquettes: ['Soutien'] }), fiche('3', { etiquettes: ['Soutien'] })]
    expect(etiquettesDe(sans, D)).toEqual([{ nom: 'Soutien', n: 3 }])
    expect(etiquettesDe([...sans].reverse(), D)).toEqual([{ nom: 'Soutien', n: 3 }])
  })

  it('ajouter : 3 au plus, 20 caractères, un double (même hérité) est ignoré', () => {
    expect(ajouterEtiquette([], ' 5e  B ')).toEqual({ etiquettes: ['5e B'], ajoutee: '5e B' })
    expect(ajouterEtiquette(['5e B'], '5E b')).toEqual({ etiquettes: ['5e B'], refus: 'double' })
    expect(ajouterEtiquette([], '5e B', '5e B')).toEqual({ etiquettes: [], refus: 'double' })
    expect(ajouterEtiquette([], '   ')).toEqual({ etiquettes: [], refus: 'vide' })
    const trois = ['A', 'B', 'C']
    expect(ETIQUETTES_MAX).toBe(3)
    expect(ajouterEtiquette(trois, 'D')).toEqual({ etiquettes: trois, refus: 'plein' })
    expect(ajouterEtiquette([], 'x'.repeat(30)).ajoutee).toHaveLength(20)
  })
})

describe('le tri et le nom d\'une copie', () => {
  it('par nom : « Ch. 2 » avant « Ch. 10 », sans la casse ni les accents', () => {
    const l = [fiche('1', { nom: 'Ch. 10' }), fiche('2', { nom: 'ch. 2' }), fiche('3', { nom: 'Équations' }), fiche('4', { nom: 'angles' }), fiche('5', { nom: 'Ch. 1' })]
    expect(trier(l, 'nom').map(f => f.nom)).toEqual(['angles', 'Ch. 1', 'ch. 2', 'Ch. 10', 'Équations'])
    expect(l[0].nom).toBe('Ch. 10')
  })

  it('par date : le plus récemment modifié d\'abord', () => {
    const l = [fiche('1', { modifie: T - 1000 }), fiche('2', { modifie: T }), fiche('3', { modifie: T - 5000 })]
    expect(trier(l, 'modifie').map(f => f.id)).toEqual(['2', '1', '3'])
  })

  it('nomLibre : « (copie) », puis « (copie 2) » ; la copie d\'une copie ne s\'allonge pas ; 60 caractères', () => {
    expect(nomLibre('Symétrie', ['Symétrie'])).toBe('Symétrie (copie)')
    expect(nomLibre('Symétrie', ['Symétrie', 'symétrie (copie)'])).toBe('Symétrie (copie 2)')
    expect(nomLibre('Symétrie (copie)', ['Symétrie', 'Symétrie (copie)'])).toBe('Symétrie (copie 2)')
    expect(nomLibre('Symétrie (copie 2)', ['Symétrie', 'Symétrie (copie)', 'Symétrie (copie 2)'])).toBe('Symétrie (copie 3)')
    const long = 'x'.repeat(60)
    expect(nomLibre(long, [long])).toHaveLength(60)
    expect(nomLibre(long, [long]).endsWith(' (copie)')).toBe(true)
  })
})
