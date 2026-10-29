// Vérifier les classeurs (lot 17) : l'inventaire des images d'un classeur
// (ce que ses pages montrent, ce que sa banque a), le bilan de la
// bibliothèque (où chaque image manquante se retrouve, les introuvables, les
// classeurs illisibles), les dernières copies à recopier avant d'effacer la
// corbeille, et les textes de la fenêtre et des messages. Tout est pur.
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { ImageForme, Trait } from '../src/types'
import type { ClasseurInventorie, LigneBilan } from '../src/classeurs/verifier'
import {
  AIDE_VERIFIER, ILLISIBLE, VERIFIER_LES_CLASSEURS, bilan, dernieresCopies, inventaireDesMisesAJour, inventaireDuDoc, inventaireDuTableau, lister, manquantes,
  nomsLisibles, ouSeTrouve, sourcesDeLaLigne, texteBilan, texteIntrouvable, texteIntrouvableIci, texteLigne, texteRemises, texteRepare, texteRetrouvees, texteVerification,
} from '../src/classeurs/verifier'

const n = (t: string) => t.replace(/[  ]/g, ' ')
let numero = 0
const PNG = 'data:image/png;base64,iVBORw0KGgo='
const JPG = 'data:image/jpeg;base64,/9j/4AAQ'

function image(src: string): ImageForme {
  return { id: 'I' + numero++, type: 'image', src, l: 40, h: 20, m: [1, 0, 0, 1], x: 0, y: 0, z: numero, auteur: 'moi' }
}
function trait(): Trait {
  return { id: 'T' + numero++, type: 'trait', x: 0, y: 0, z: numero, auteur: 'moi', pts: [0, 0, 0.5, 10, 0, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false }
}

/** Un classeur : une page de l'ordre avec une photo et un trait, une page
 *  jetée dans la corbeille des pages avec une autre image, une image posée
 *  puis effacée (sa clé reste dans la banque) */
function unClasseur() {
  const t = new Tableau(null)
  const p1 = t.ajouterPage('blanc', 0); t.pageVue = p1
  const banque = t.doc.getMap('images') as Y.Map<string>
  banque.set('photo', PNG)
  banque.set('jetee', JPG)
  banque.set('effacee', PNG)
  banque.set('orpheline', JPG)
  banque.set('pas-une-image', 'bonjour')
  t.nouveauGeste(); t.poser(p1, image('photo'))
  t.nouveauGeste(); t.poser(p1, trait())
  const e = image('effacee')
  t.nouveauGeste(); t.poser(p1, e)
  t.nouveauGeste(); t.supprimer(p1, [e.id])
  // Une image dont la banque n'a rien (une séance déplacée à l'ancienne)
  t.nouveauGeste(); t.poser(p1, image('grise'))
  const p2 = t.ajouterPage('blanc', 1); t.pageVue = p2
  t.nouveauGeste(); t.poser(p2, image('jetee'))
  t.pageVue = p1
  if (!t.jeterPage(p2, p1)) throw new Error('jeterPage')
  return t
}

describe('l\'inventaire d\'un classeur', () => {
  it('compte les images des pages de l\'ordre et de la corbeille des pages, pas les formes effacées ; une clé sans données d\'image n\'est pas présente', () => {
    const t = unClasseur()
    const inv = inventaireDuTableau(t)
    expect([...inv.utilisees].sort()).toEqual(['grise', 'jetee', 'photo'])
    expect([...inv.presentes].sort()).toEqual(['effacee', 'jetee', 'orpheline', 'photo'])
    expect(manquantes(inv)).toEqual(['grise'])
    // Le même inventaire depuis un document nu rejoué
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, Y.encodeStateAsUpdate(t.doc))
    expect(inventaireDuDoc(d)).toEqual(inv)
    // Une image montrée deux fois compte une fois
    const p1 = t.ordre.get(0)
    t.nouveauGeste(); t.poser(p1, image('photo'))
    expect(inventaireDuTableau(t).utilisees.filter(k => k === 'photo')).toHaveLength(1)
  })

  it('depuis les mises à jour d\'une base : l\'inventaire, et les données des seules clés demandées que la banque a', () => {
    const t = unClasseur()
    const mises = [Y.encodeStateAsUpdate(t.doc)]
    const r = inventaireDesMisesAJour(mises, ['photo', 'grise', 'pas-une-image', 'jetee'])
    expect(r).not.toBeNull()
    expect(manquantes(r!)).toEqual(['grise'])
    expect(r!.donnees).toEqual({ photo: PNG, jetee: JPG })
    // Sans demande : aucune donnée (des listes de clés seulement)
    expect(inventaireDesMisesAJour(mises)!.donnees).toEqual({})
    // Rien, ou des octets qui ne font pas un document : null
    expect(inventaireDesMisesAJour([])).toBeNull()
    expect(inventaireDesMisesAJour([new Uint8Array([1, 2, 3, 4, 5, 250])])).toBeNull()
  })
})

const C = (id: string, o: Partial<ClasseurInventorie> & { utilisees?: string[]; presentes?: string[]; illisible?: boolean } = {}): ClasseurInventorie => ({
  id, nom: o.nom ?? 'Classeur ' + id, base: 'mem-teachingtool-classeur-' + id, chemin: o.chemin ?? '', corbeille: o.corbeille ?? false, modifie: o.modifie ?? 1,
  inv: o.illisible ? null : { utilisees: o.utilisees ?? [], presentes: o.presentes ?? [] },
})

describe('le bilan de la bibliothèque', () => {
  it('les manquantes retrouvées dans un classeur visible, dans la corbeille seulement, dans les deux (le visible d\'abord), introuvables', () => {
    const classeurs = [
      C('f', { nom: 'Fractions', chemin: '5ème', utilisees: ['a', 'b', 'c', 'd'], presentes: ['x'], modifie: 50 }),
      C('s', { nom: 'Symétrie', presentes: ['a', 'b'], corbeille: true, modifie: 90 }),
      C('e', { nom: 'Équations', presentes: ['b', 'c'], modifie: 10 }),
      C('v', { nom: 'Vieux', presentes: ['b'], modifie: 70 }),
    ]
    const b = bilan(classeurs)
    expect(b.verifies).toBe(4)
    expect(b.manques).toBe(1)
    expect(b.illisibles).toBe(0)
    expect(b.lignes).toHaveLength(1)
    const l = b.lignes[0]
    expect(l.id).toBe('f'); expect(l.nom).toBe('Fractions'); expect(l.chemin).toBe('5ème'); expect(l.illisible).toBe(false)
    expect(l.manquantes).toEqual(['a', 'b', 'c', 'd'])
    expect(l.retrouvables).toEqual(['a', 'b', 'c'])
    expect(l.introuvables).toEqual(['d'])
    // a : la corbeille seulement ; b : les visibles d'abord (le plus récent), la corbeille ensuite ; c : un visible
    expect(l.sources.get('a')!.map(x => x.id)).toEqual(['s'])
    expect(l.sources.get('a')![0]).toEqual({ id: 's', nom: 'Symétrie', base: 'mem-teachingtool-classeur-s', corbeille: true })
    expect(l.sources.get('b')!.map(x => x.id)).toEqual(['v', 'e', 's'])
    expect(l.sources.get('c')!.map(x => x.id)).toEqual(['e'])
    expect(l.sources.has('d')).toBe(false)
    expect(sourcesDeLaLigne(l).map(x => x.nom)).toEqual(['Symétrie', 'Vieux', 'Équations'])
    expect(ouSeTrouve('b', classeurs, 'f').map(x => x.id)).toEqual(['v', 'e', 's'])
    expect(ouSeTrouve('b', classeurs, 'v').map(x => x.id)).toEqual(['e', 's'])
  })

  it('un classeur sans manque n\'a pas de ligne ; un classeur à la corbeille n\'est pas listé à réparer ; un illisible l\'est, en dernier ; même clé, d\'autres données : pas remplacée', () => {
    const classeurs = [
      C('ok', { utilisees: ['a'], presentes: ['a'], modifie: 99 }),
      C('c', { nom: 'Dans la corbeille', utilisees: ['z'], corbeille: true, modifie: 98 }),
      C('i', { nom: 'Abîmé', illisible: true, modifie: 97 }),
      C('f', { nom: 'Fractions', utilisees: ['a'], modifie: 96 }),
      C('g', { nom: 'Géométrie', utilisees: ['q'], modifie: 95 }),
    ]
    const b = bilan(classeurs)
    expect(b.verifies).toBe(5)
    expect(b.lignes.map(l => l.id)).toEqual(['f', 'g', 'i'])
    expect(b.manques).toBe(2)
    expect(b.illisibles).toBe(1)
    expect(b.lignes[2]).toMatchObject({ id: 'i', illisible: true, manquantes: [], retrouvables: [], introuvables: [] })
    expect(b.lignes[1]).toMatchObject({ id: 'g', retrouvables: [], introuvables: ['q'] })
    // Un classeur qui a la clé « a » avec d'autres données est une source
    // comme une autre : le bilan ne compare pas les données (la réparation
    // ne remplit que les clés absentes, jamais ne remplace)
    expect(b.lignes[0].sources.get('a')!.map(x => x.id)).toEqual(['ok'])
    // Rien ne manque nulle part
    const rien = bilan([C('ok', { utilisees: ['a'], presentes: ['a'] })])
    expect(rien).toEqual({ verifies: 1, lignes: [], manques: 0, illisibles: 0 })
  })
})

describe('les dernières copies avant d\'effacer', () => {
  const F = C('f', { nom: 'Fractions', utilisees: ['a', 'b', 'c'], presentes: ['c'], modifie: 50 })
  const E = C('e', { nom: 'Équations', utilisees: ['a', 'k'], modifie: 40 })
  const S = C('s', { nom: 'Symétrie', utilisees: ['a', 'seule'], presentes: ['a', 'b', 'seule'], corbeille: true, modifie: 30 })
  const V = C('v', { nom: 'Vieux', presentes: ['a', 'k'], corbeille: true, modifie: 60 })

  it('une image utilisée par un classeur qui reste et présente seulement dans un classeur à effacer est recopiée ; pas si une copie reste ailleurs ; pas si seul un classeur effacé l\'utilise', () => {
    // On efface Symétrie seule : « a » reste dans Vieux (rien à faire), « b »
    // n'est que dans Symétrie (à recopier dans Fractions), « seule » n'est
    // montrée que par Symétrie (rien)
    const r = dernieresCopies([F, E, S, V], new Set(['s']))
    expect(r).toHaveLength(1)
    expect(r[0].vers.id).toBe('f')
    expect(r[0].images.map(i => [i.src, i.depuis.id])).toEqual([['b', 's']])
  })

  it('deux classeurs restants qui l\'utilisent reçoivent chacun la leur ; la source la plus récente d\'abord ; le dossier à la corbeille (ses classeurs comptés une fois)', () => {
    // On vide la corbeille (Symétrie et Vieux, un dossier à la corbeille qui
    // les contient compterait les mêmes) : « a » est dans les deux (Vieux,
    // le plus récent), « b » dans Symétrie, « k » dans Vieux
    const r = dernieresCopies([F, E, S, V], new Set(['s', 'v', 'v']))
    expect(r.map(x => x.vers.id)).toEqual(['f', 'e'])
    expect(r[0].images.map(i => [i.src, i.depuis.id])).toEqual([['a', 'v'], ['b', 's']])
    expect(r[1].images.map(i => [i.src, i.depuis.id])).toEqual([['a', 'v'], ['k', 'v']])
    // Rien à recopier : un classeur illisible qui reste n'est pas deviné, un
    // classeur illisible qu'on efface n'offre rien
    expect(dernieresCopies([C('x', { illisible: true }), S], new Set(['s']))).toEqual([])
    expect(dernieresCopies([F, C('y', { illisible: true, corbeille: true })], new Set(['y']))).toEqual([])
    expect(dernieresCopies([F, E], new Set())).toEqual([])
  })
})

describe('les textes', () => {
  const ligne = (o: Partial<LigneBilan>): LigneBilan => ({ id: 'f', nom: 'Fractions', base: 'b', chemin: '', illisible: false, manquantes: [], sources: new Map(), retrouvables: [], introuvables: [], ...o })
  const sym = { id: 's', nom: 'Symétrie', base: 'bs', corbeille: true }
  const equ = { id: 'e', nom: 'Équations', base: 'be', corbeille: false }

  it('la ligne d\'état', () => {
    expect(n(texteVerification(12, 30))).toBe('Vérification… 12 classeurs sur 30')
    expect(n(texteVerification(1, 30))).toBe('Vérification… 1 classeur sur 30')
    expect(n(texteBilan({ verifies: 30, manques: 2, illisibles: 0 }))).toBe('30 classeurs vérifiés : 2 ont des images qui manquent.')
    expect(n(texteBilan({ verifies: 3, manques: 1, illisibles: 0 }))).toBe('3 classeurs vérifiés : 1 a des images qui manquent.')
    expect(n(texteBilan({ verifies: 30, manques: 0, illisibles: 0 }))).toBe('30 classeurs vérifiés : aucune image ne manque.')
    expect(n(texteBilan({ verifies: 1, manques: 0, illisibles: 0 }))).toBe('1 classeur vérifié : aucune image ne manque.')
    expect(n(texteBilan({ verifies: 30, manques: 0, illisibles: 1 }))).toBe('30 classeurs vérifiés : aucune image ne manque. 1 n\'a pas pu être lu.')
    expect(n(texteBilan({ verifies: 30, manques: 2, illisibles: 2 }))).toBe('30 classeurs vérifiés : 2 ont des images qui manquent. 2 n\'ont pas pu être lus.')
  })

  it('le détail d\'une ligne : retrouvées (la corbeille dite), mêlées, introuvables, illisible', () => {
    expect(n(texteLigne(ligne({ manquantes: ['a', 'b'], retrouvables: ['a', 'b'], sources: new Map([['a', [sym]], ['b', [sym, equ]]]) }))))
      .toBe('2 images manquantes, retrouvées dans « Symétrie » (corbeille)')
    expect(n(texteLigne(ligne({ manquantes: ['a'], retrouvables: ['a'], sources: new Map([['a', [equ, sym]]]) }))))
      .toBe('1 image manquante, retrouvée dans « Équations »')
    expect(n(texteLigne(ligne({ manquantes: ['a', 'b', 'c'], retrouvables: ['a', 'b'], introuvables: ['c'], sources: new Map([['a', [sym]], ['b', [sym]]]) }))))
      .toBe('3 images manquantes : 2 retrouvées dans « Symétrie » (corbeille), 1 introuvable dans ce navigateur')
    expect(n(texteLigne(ligne({ manquantes: ['a', 'b', 'c'], retrouvables: ['a'], introuvables: ['b', 'c'], sources: new Map([['a', [equ]], ['b', [sym]]]) }))))
      .toBe('3 images manquantes : 1 retrouvée dans « Équations », 2 introuvables dans ce navigateur')
    expect(n(texteLigne(ligne({ manquantes: ['a', 'b'], retrouvables: ['a', 'b'], sources: new Map([['a', [sym]], ['b', [equ]]]) }))))
      .toBe('2 images manquantes, retrouvées dans « Symétrie » (corbeille) et « Équations »')
    expect(n(texteLigne(ligne({ manquantes: ['a'], introuvables: ['a'] })))).toBe('1 image introuvable dans ce navigateur')
    expect(n(texteLigne(ligne({ manquantes: ['a', 'b'], introuvables: ['a', 'b'] })))).toBe('2 images introuvables dans ce navigateur')
    expect(texteLigne(ligne({ illisible: true }))).toBe(ILLISIBLE)
    expect(ILLISIBLE).toBe('Ce classeur n\'a pas pu être lu.')
    expect(n(texteIntrouvable(1))).toBe('Pour la retrouver : ouvrez un fichier .memc plus ancien de ce classeur (Ouvrir…, ou Récupérer une sauvegarde du Drive…), puis vérifiez de nouveau.')
    expect(n(texteIntrouvable(2))).toMatch(/^Pour les retrouver : /)
  })

  it('après Réparer, les messages du bas, l\'ouverture d\'un classeur', () => {
    expect(n(texteRepare(2, 0))).toBe('Réparé : 2 images remises.')
    expect(n(texteRepare(1, 0))).toBe('Réparé : 1 image remise.')
    expect(n(texteRepare(2, 1))).toBe('Réparé : 2 images remises, 1 reste introuvable.')
    expect(n(texteRepare(1, 2))).toBe('Réparé : 1 image remise, 2 restent introuvables.')
    expect(n(texteRepare(0, 1))).toBe('Rien n\'a été remis.')
    expect(n(texteRemises(2, 'Fractions', ['Symétrie']))).toBe('2 images remises dans « Fractions » (depuis « Symétrie »).')
    expect(n(texteRemises(1, 'Fractions', ['Symétrie', 'Vieux']))).toBe('1 image remise dans « Fractions » (depuis « Symétrie » et « Vieux »).')
    expect(n(texteRetrouvees(2, ['Symétrie', 'Fractions']))).toBe('2 images retrouvées dans « Symétrie », « Fractions ».')
    expect(n(texteRetrouvees(1, ['Symétrie']))).toBe('1 image retrouvée dans « Symétrie ».')
    expect(n(texteIntrouvableIci(1))).toBe('1 image de ce classeur est introuvable dans ce navigateur.')
    expect(n(texteIntrouvableIci(3))).toBe('3 images de ce classeur sont introuvables dans ce navigateur.')
    expect(VERIFIER_LES_CLASSEURS).toBe('Vérifier les classeurs…')
    expect(n(AIDE_VERIFIER)).toBe('Les images qui manquent (un cadre gris sur une page), retrouvées dans les autres classeurs et remises à leur place.')
    expect(n(nomsLisibles(['A']))).toBe('« A »')
    expect(n(nomsLisibles(['A', 'B']))).toBe('« A » et « B »')
    expect(n(nomsLisibles(['A', 'B', 'C']))).toBe('« A », « B » et « C »')
    expect(lister([])).toBe('')
  })
})
