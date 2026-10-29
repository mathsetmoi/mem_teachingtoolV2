// L'écrivain (lot 4) : le fichier .memc d'un classeur, fabriqué depuis les
// mises à jour de sa base (ce que range y-indexeddb) et non depuis le
// document en mémoire. Le fichier se rouvre comme celui d'avant, porte le
// nom et l'id du classeur, et une base trouée ou abîmée ne fait jamais de
// fichier (raison 'abimee'). Les erreurs des demandes sont typées.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { ABIME, CARTE_COPIE, ErreurFichier, crc32, ecrireLisible, ecrireTableau, lireEntete, lireTableau, marqueDeCopie } from '../src/fichier'
import { TEXTE_ABIMEE, TEXTE_ABIMEE_COPIE, fabriquer, preparerCopie } from '../src/classeurs/ecrivain-pur'
import { aTransferer, erreurDe, executer } from '../src/classeurs/ecrivain-taches'
import { ErreurBase } from '../src/classeurs/bases'
import { inventaireDesMisesAJour } from '../src/classeurs/verifier'

let horloge = new Date('2026-10-10T14:05:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number): Trait {
  const pts: number[] = []
  for (let i = 0; i < 6; i++) pts.push(i * 5, Math.sin(i) * 4, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Un classeur de deux pages tel que sa base le garde : l'état complet du
 *  premier chargement, puis une mise à jour par changement (comme
 *  y-indexeddb) ; un trait effacé, la piste, un nom de page */
async function uneBase() {
  const t = new Tableau(null)
  const mises: Uint8Array[] = []
  const p1 = t.ajouterPage('carreaux', 0); t.pageVue = p1
  await attendre(500)
  mises.push(Y.encodeStateAsUpdate(t.doc))
  t.doc.on('update', (u: Uint8Array) => mises.push(u))
  const a = trait(0, 0)
  t.nouveauGeste(); t.poser(p1, a); await attendre(1000)
  t.nouveauGeste(); t.poser(p1, trait(40, 0)); await attendre(1000)
  t.nouveauGeste(); t.supprimer(p1, [a.id]); await attendre(1000)
  const p2 = t.ajouterPage('seyes', 1); t.pageVue = p2
  await attendre(1000)
  t.nouveauGeste(); t.poser(p2, trait(10, 10)); await attendre(1000)
  t.noterPiste({ i: 'regle', d: horloge, p: p2, c: 1, q: 'corps', poses: [] } as never)
  t.renommerPage(p2, 'Exercice 12 p. 84')
  await attendre(10)
  return { t, mises, p1, p2 }
}

const ID = '00112233aabbccdd'

describe('fabriquer : le fichier d\'un classeur depuis sa base', () => {
  it('se rouvre comme le fichier d\'avant : pages, formes, film, piste, noms, ce qui a été effacé', async () => {
    const { t, mises, p1, p2 } = await uneBase()
    expect(mises.length).toBeGreaterThan(5)
    const f = fabriquer(mises, { date: 1_791_000_000_000, nom: 'Symétrie centrale', id: ID })
    expect(f.pages).toBe(2)
    const lu = lireTableau(f.octets)
    expect(lu.pages).toBe(2)
    expect(lu.entete).toEqual({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', date: 1_791_000_000_000, pages: 2, nom: 'Symétrie centrale', id: ID })
    expect(lireEntete(f.octets)).toEqual(lu.entete)
    // Le même document que celui de la mémoire
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, lu.etat)
    expect(Y.encodeStateVector(d)).toEqual(Y.encodeStateVector(t.doc))
    const relu = new Tableau(null)
    Y.applyUpdate(relu.doc, lu.etat, 'film')
    expect(relu.ordre.toArray()).toEqual([p1, p2])
    expect(relu.formesDe(p1)!.size).toBe(1)
    expect(relu.formesDe(p2)!.size).toBe(1)
    expect(relu.film.length).toBe(t.film.length)
    expect(relu.piste.length).toBe(1)
    expect(relu.nomDe(p2)).toBe('Exercice 12 p. 84')
    // Le contenu, à l'octet près, est celui que ferait la mémoire
    const memoire = lireTableau(new Uint8Array(await ecrireTableau(t.doc, 1).arrayBuffer()))
    const dm = new Y.Doc({ gc: false }); Y.applyUpdate(dm, memoire.etat)
    expect(Y.encodeStateAsUpdate(d)).toEqual(Y.encodeStateAsUpdate(dm))
    // Le vecteur d'état et la somme du fichier entier
    expect(f.vecteur).toEqual(Y.encodeStateVector(t.doc))
    expect(f.crc).toBe(crc32(f.octets))
  })

  it('une seule mise à jour (une base compactée) : rien à fusionner', async () => {
    const { t } = await uneBase()
    const f = fabriquer([Y.encodeStateAsUpdate(t.doc)], { date: 1 })
    expect(lireTableau(f.octets).pages).toBe(2)
    expect(lireEntete(f.octets)).toEqual({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', date: 1, pages: 2 })
  })

  it('les doublons (l\'état complet que y-indexeddb ajoute à chaque ouverture) ne changent rien', async () => {
    const { t, mises } = await uneBase()
    const f = fabriquer([...mises, Y.encodeStateAsUpdate(t.doc), new Uint8Array([0, 0]), ...mises.slice(0, 3)], { date: 1 })
    expect(f.vecteur).toEqual(Y.encodeStateVector(t.doc))
    expect(lireTableau(f.octets).pages).toBe(2)
  })

  it('une base trouée, vide, abîmée, ou sans page entière : aucun fichier, raison « abimee »', async () => {
    const { mises } = await uneBase()
    const refuse = (m: Uint8Array[]) => {
      try { fabriquer(m, { date: 1 }); return 'FABRIQUÉ' } catch (e) {
        expect(e).toBeInstanceOf(ErreurFichier)
        expect((e as ErreurFichier).raison).toBe('abimee')
        return (e as Error).message
      }
    }
    // Une mise à jour manquante au milieu : tout ce qui suit attend (le trou)
    expect(refuse([...mises.slice(0, 2), ...mises.slice(3)])).toBe(TEXTE_ABIMEE)
    expect(TEXTE_ABIMEE).toBe('Le classeur de ce navigateur semble abîmé : le fichier n\'a pas été écrit.')
    expect(refuse([])).toBe(TEXTE_ABIMEE)
    expect(refuse([new Uint8Array([0, 0])])).toBe(TEXTE_ABIMEE)
    expect(refuse([new Uint8Array([1, 2, 3, 4, 5, 250])])).toBe(TEXTE_ABIMEE)
    // L'ordre nomme une page sans formes
    const d = new Y.Doc({ gc: false })
    d.getArray('ordre').push(['a'])
    const p = new Y.Map<unknown>(); p.set('fond', 'blanc')
    d.getMap('pages').set('a', p)
    expect(refuse([Y.encodeStateAsUpdate(d)])).toBe(TEXTE_ABIMEE)
  })
})

describe('les demandes de l\'écrivain : des erreurs typées', () => {
  it('erreurDe : absente, abimee, indisponible, place, existante (lot 4 C7 : la copie), autre', () => {
    expect(erreurDe(new ErreurBase('absente', 'pas là'))).toEqual({ raison: 'absente', message: 'pas là' })
    expect(erreurDe(new ErreurBase('abimee', 'sans magasin'))).toEqual({ raison: 'abimee', message: 'sans magasin' })
    expect(erreurDe(new ErreurBase('indisponible', 'refusé'))).toEqual({ raison: 'indisponible', message: 'refusé' })
    // (Changé au lot 4, C7 : « Dupliquer le classeur » écrit une base, et doit
    // pouvoir dire « plus de place » ; avant, rien ne l'y écrivait, et 'place'
    // valait 'autre')
    expect(erreurDe(new ErreurBase('place', 'plein'))).toEqual({ raison: 'place', message: 'plein' })
    expect(erreurDe(new ErreurBase('place', 'plein', true))).toEqual({ raison: 'place', message: 'plein', creee: true })
    expect(erreurDe(new ErreurBase('existante', 'déjà là'))).toEqual({ raison: 'existante', message: 'déjà là' })
    expect(erreurDe(new DOMException('quota', 'QuotaExceededError')).raison).toBe('place')
    expect(erreurDe(new ErreurBase('autre', 'x')).raison).toBe('autre')
    expect(erreurDe(new ErreurFichier(TEXTE_ABIMEE, 'abimee'))).toEqual({ raison: 'abimee', message: TEXTE_ABIMEE })
    expect(erreurDe(new ErreurFichier('autre chose')).raison).toBe('autre')
    expect(erreurDe(new Error('boum'))).toEqual({ raison: 'autre', message: 'boum' })
    expect(erreurDe(undefined)).toEqual({ raison: 'autre', message: 'erreur inconnue' })
  })

  it('sans IndexedDB (ici, sous Node) : « indisponible », sans lever', async () => {
    const r = await executer({ n: 7, genre: 'fichier', base: 'mem-teachingtool-classeur-00112233aabbccdd', entete: { date: 1 } })
    expect(r.n).toBe(7)
    expect('erreur' in r && r.erreur.raison).toBe('indisponible')
  })

  it('« lire » (lot 4, C4) : un fichier lu et vérifié, son état transférable, son vecteur ; un fichier qui n\'en est pas un : « illisible », avec la phrase de lireTableau', async () => {
    const { t } = await uneBase()
    const f = fabriquer([Y.encodeStateAsUpdate(t.doc)], { date: 1_791_000_000_000, nom: 'Symétrie centrale', id: ID })
    const r = await executer({ n: 4, genre: 'lire', fichier: new Blob([f.octets as BlobPart]) })
    if (!('entete' in r)) throw new Error('pas lu')
    expect(r.n).toBe(4)
    expect(r.entete).toMatchObject({ date: 1_791_000_000_000, pages: 2, nom: 'Symétrie centrale', id: ID })
    expect(r.pages).toBe(2)
    expect(r.vecteur).toEqual(Y.encodeStateVector(t.doc))
    expect(aTransferer(r)).toEqual([r.etat.buffer])
    const relu = new Y.Doc({ gc: false }); Y.applyUpdate(relu, r.etat)
    expect(Y.encodeStateVector(relu)).toEqual(Y.encodeStateVector(t.doc))
    // Pas un classeur, un film élève, un fichier abîmé : la phrase qui dit quoi faire
    const pas = await executer({ n: 5, genre: 'lire', fichier: new Blob(['bonjour\n']) })
    expect(pas).toEqual({ n: 5, erreur: { raison: 'illisible', message: 'Ce fichier n\'est pas un classeur enregistré par MEM teachingtool (fichier .memc).' } })
    const film = await executer({ n: 6, genre: 'lire', fichier: new Blob(['{"format":"mem-revoir","v":1}\n']) })
    expect('erreur' in film && film.erreur.raison).toBe('illisible')
    expect('erreur' in film && film.erreur.message).toMatch(/^Ce fichier est un film pour les élèves/)
    const abime = new Uint8Array(f.octets); abime[abime.length - 12] ^= 0xff
    const ab = await executer({ n: 8, genre: 'lire', fichier: new Blob([abime as BlobPart]) })
    expect('erreur' in ab && ab.erreur).toEqual({ raison: 'illisible', message: 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le classeur actuel n\'a pas changé.' })
    // Les autres réponses n'ont rien à transférer
    expect(aTransferer(pas)).toEqual([])
  })

  it('« vecteur » sans IndexedDB (ici, sous Node) : « indisponible », sans lever', async () => {
    const r = await executer({ n: 9, genre: 'vecteur', base: 'mem-teachingtool-classeur-00112233aabbccdd' })
    expect('erreur' in r && r.erreur.raison).toBe('indisponible')
  })

  it('« images » (lot 17) : les clés montrées et présentes, les données des seules clés demandées ; sans IndexedDB, « indisponible », et jamais une base créée', async () => {
    // Ce que calcule la demande, sur les mises à jour d'une base (le travail
    // du travailleur sans la base : inventaireDesMisesAJour)
    const { t, mises, p1 } = await uneBase()
    const banque = t.doc.getMap('images') as Y.Map<string>
    const donnees = 'data:image/png;base64,iVBORw0KGgo='
    banque.set('photo', donnees)
    banque.set('inutile', donnees)
    t.nouveauGeste()
    t.poser(p1, { id: 'I1', type: 'image', src: 'photo', l: 40, h: 20, m: [1, 0, 0, 1], x: 0, y: 0, z: 1, auteur: 'moi' })
    t.poser(p1, { id: 'I2', type: 'image', src: 'grise', l: 40, h: 20, m: [1, 0, 0, 1], x: 0, y: 0, z: 2, auteur: 'moi' })
    await attendre(10)
    const inv = inventaireDesMisesAJour(mises, ['photo', 'grise'])!
    expect([...inv.utilisees].sort()).toEqual(['grise', 'photo'])
    expect([...inv.presentes].sort()).toEqual(['inutile', 'photo'])
    expect(inv.donnees).toEqual({ photo: donnees })
    expect(inventaireDesMisesAJour(mises)!.donnees).toEqual({})
    // La demande elle-même, ici sans IndexedDB : la base n'est ni lue ni créée
    const r = await executer({ n: 11, genre: 'images', base: 'mem-teachingtool-classeur-00112233aabbccdd' })
    expect(r.n).toBe(11)
    expect('erreur' in r && r.erreur.raison).toBe('indisponible')
    const r2 = await executer({ n: 12, genre: 'images', base: 'mem-teachingtool-classeur-00112233aabbccdd', donnees: ['photo'] })
    expect('erreur' in r2 && r2.erreur.raison).toBe('indisponible')
  })

  it('une demande inconnue : « autre », sans lever', async () => {
    const r = await executer({ n: 3, genre: 'pas-un-genre' } as never)
    expect(r).toMatchObject({ n: 3, erreur: { raison: 'autre' } })
  })
})

describe('preparerCopie (lot 4, C7) : « Dupliquer le classeur »', () => {
  it('toute l\'histoire, sauf le registre des publications, vidé en une transaction hors des pages', async () => {
    const { t, mises, p1, p2 } = await uneBase()
    const pubs = t.doc.getMap('publications')
    t.doc.transact(() => {
      pubs.set('mem:1791000000000', { titre: 'Séance du 9 octobre', id: 'drive1' } as never)
      pubs.set('lfb:1791000500000', { titre: 'Séance du 10 octobre', id: 'drive2' } as never)
    })
    await attendre(10)
    const filmAvant = t.film.length
    const c = preparerCopie(mises, { id: 'ccccccccdddddddd' })
    expect(c.pages).toBe(2)
    expect(c.publications).toBe(2)
    expect(c.vidage).toBeInstanceOf(Uint8Array)
    // La copie : l'état complet, puis le vidage, dans cet ordre (ce que la base reçoit)
    const copie = new Y.Doc({ gc: false })
    Y.applyUpdate(copie, c.etat)
    Y.applyUpdate(copie, c.vidage!)
    expect(copie.getMap('publications').size).toBe(0)
    // Marquée comme copie, avec son id : ses séances auront leur propre lien
    expect(marqueDeCopie(copie)).toBe('ccccccccdddddddd')
    expect(copie.getArray('ordre').toArray()).toEqual([p1, p2])
    expect(copie.getArray('film').length).toBe(filmAvant)
    const formes = (p: string) => [...((copie.getMap('pages').get(p) as Y.Map<unknown>).get('formes') as Y.Map<unknown>).keys()].sort()
    expect(formes(p1)).toEqual([...t.formesDe(p1)!.keys()].sort())
    expect(formes(p2)).toEqual([...t.formesDe(p2)!.keys()].sort())
    expect(copie.getMap('nomsPages').get(p2)).toBe('Exercice 12 p. 84')
    // Ce qui a été effacé reste dans l'histoire (le replay le montre)
    expect(Y.encodeStateVector(copie)).toEqual(c.vecteur)
    // Le vidage ne touche ni aux pages, ni à l'ordre, ni au film
    const essai = new Y.Doc({ gc: false })
    Y.applyUpdate(essai, c.etat)
    const touches = new Set<string>()
    // Les types nommés, avant le vidage (un type jamais demandé n'a pas encore sa classe)
    const noms = new Map<unknown, string>([[essai.getMap('publications'), 'publications'], [essai.getMap('pages'), 'pages'],
      [essai.getArray('ordre'), 'ordre'], [essai.getArray('film'), 'film'], [essai.getMap('nomsPages'), 'nomsPages'], [essai.getMap(CARTE_COPIE), 'copie']])
    essai.on('afterTransaction', (tr: Y.Transaction) => { for (const ty of tr.changed.keys()) touches.add(noms.get(ty) ?? 'autre') })
    Y.applyUpdate(essai, c.vidage!)
    expect([...touches].sort()).toEqual(['copie', 'publications'])
    // L'original n'a pas changé : son vecteur est contenu dans celui de la copie
    const sv = Y.decodeStateVector(Y.encodeStateVector(t.doc))
    const svc = Y.decodeStateVector(c.vecteur)
    for (const [client, clock] of sv) expect(svc.get(client)).toBe(clock)
    expect(t.doc.getMap('publications').size).toBe(2)
  })

  it('sans séance publiée : la marque seule (l\'original peut publier après la copie), toute l\'histoire de l\'original', async () => {
    const { t, mises } = await uneBase()
    const c = preparerCopie(mises, { id: 'ccccccccdddddddd' })
    expect(c.publications).toBe(0)
    const copie = new Y.Doc({ gc: false })
    Y.applyUpdate(copie, c.etat); Y.applyUpdate(copie, c.vidage)
    expect(marqueDeCopie(copie)).toBe('ccccccccdddddddd')
    expect(marqueDeCopie(t.doc)).toBeNull()
    expect(c.vecteur).toEqual(Y.encodeStateVector(copie))
    const sv = Y.decodeStateVector(Y.encodeStateVector(t.doc)), svc = Y.decodeStateVector(c.vecteur)
    for (const [client, clock] of sv) expect(svc.get(client)).toBe(clock)
    expect(svc.size).toBe(sv.size + 1)
    // Une copie de la copie : sa propre marque
    const c2 = preparerCopie([Y.encodeStateAsUpdate(copie)], { id: 'eeeeeeeeffffffff' })
    const copie2 = new Y.Doc({ gc: false }); Y.applyUpdate(copie2, c2.etat); Y.applyUpdate(copie2, c2.vidage)
    expect(marqueDeCopie(copie2)).toBe('eeeeeeeeffffffff')
  })

  it('une base trouée, vide ou abîmée : rien à copier (« abimee »)', async () => {
    const { mises } = await uneBase()
    for (const m of [[], mises.filter((_, i) => i !== 2), [new Uint8Array([1, 2, 3])]]) {
      try { preparerCopie(m, { id: 'ccccccccdddddddd' }); expect.unreachable() } catch (e) {
        expect(e).toBeInstanceOf(ErreurFichier)
        expect((e as ErreurFichier).raison).toBe('abimee')
        expect((e as ErreurFichier).message).toBe(TEXTE_ABIMEE_COPIE)
      }
    }
  })

  it('« copier » sans IndexedDB (sous Node) : « indisponible », sans lever', async () => {
    const r = await executer({ n: 3, genre: 'copier', source: 'mem-tableau-local', cible: 'mem-teachingtool-classeur-00112233aabbccdd', infos: { id: '00112233aabbccdd', nom: 'X' } })
    expect(r.n).toBe(3)
    expect('erreur' in r && r.erreur.raison).toBe('indisponible')
  })
})

describe('une base trouée relue (lot 4, corrections migration) : ce qui s\'en relit, jamais un fichier refusé', () => {
  /** Une base dont une écriture a été refusée au milieu : tout ce qui suit,
   *  du même onglet, attend dans Yjs la mise à jour manquante */
  async function uneBaseTrouee() {
    const b = await uneBase()
    const manque = 3
    const reste = b.mises.filter((_, i) => i !== manque)
    const lue = new Y.Doc({ gc: false })
    for (const m of reste) Y.applyUpdate(lue, m)
    expect(lue.store.pendingStructs).not.toBeNull()
    return { ...b, reste, manquante: b.mises[manque], lue }
  }
  const formes = (d: Y.Doc) => { let n = 0; d.getMap('pages').forEach(p => { n += ((p as Y.Map<unknown>).get('formes') as Y.Map<unknown>).size }); return n }

  it('fabriquer, lisible : le fichier de ce qui se relit, qui se rouvre (par cette version comme par celle d\'avant : lireTableau)', async () => {
    const { reste, lue } = await uneBaseTrouee()
    // Sans lisible : « abimee », comme avant
    expect(() => fabriquer(reste, { date: 1 })).toThrow(TEXTE_ABIMEE)
    const f = fabriquer(reste, { date: 1_791_000_000_000, nom: 'Troué', id: ID }, { lisible: true })
    expect(f.incomplet).toBe(true)
    const lu = lireTableau(f.octets)
    expect(lu.entete.nom).toBe('Troué')
    expect(lu.pages).toBe(f.pages)
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, lu.etat)
    expect(d.store.pendingStructs).toBeNull()
    // Ce qui se relit : exactement ce que montre la base relue
    expect(formes(d)).toBe(formes(lue))
    expect(d.getArray('ordre').toArray()).toEqual(lue.getArray('ordre').toArray())
    expect(f.vecteur).toEqual(Y.encodeStateVector(lue))
    expect(f.crc).toBe(crc32(f.octets))
  })

  it('fabriquer, lisible, sur une base entière : le même fichier qu\'avant, à l\'octet près, sans incomplet', async () => {
    const { mises } = await uneBase()
    const a = fabriquer(mises, { date: 7, nom: 'Entier', id: ID })
    const b = fabriquer(mises, { date: 7, nom: 'Entier', id: ID }, { lisible: true })
    expect(b.incomplet).toBeUndefined()
    expect(b.octets).toEqual(a.octets)
  })

  it('fabriquer, lisible : une base abîmée autrement (une page sans ses formes, des octets illisibles) reste « abimee »', () => {
    const d = new Y.Doc({ gc: false })
    d.getArray('ordre').push(['a'])
    const p = new Y.Map<unknown>(); p.set('fond', 'blanc')
    d.getMap('pages').set('a', p)
    for (const m of [[Y.encodeStateAsUpdate(d)], [new Uint8Array([1, 2, 3, 4, 5, 250])], []]) {
      try { fabriquer(m, { date: 1 }, { lisible: true }); expect.unreachable() } catch (e) {
        expect(e).toBeInstanceOf(ErreurFichier)
        expect((e as ErreurFichier).raison).toBe('abimee')
      }
    }
  })

  it('ecrireLisible depuis la mémoire : un fichier qui se rouvre, le document vivant intact, et la mise à jour manquante le complète encore', async () => {
    const { manquante, lue, t } = await uneBaseTrouee()
    // ecrireTableau, lui, emporte les changements en attente : le fichier est refusé à l'ouverture
    const tout = new Uint8Array(await ecrireTableau(lue, 1).arrayBuffer())
    expect(() => lireTableau(tout)).toThrow(ABIME)
    const avant = lue.store.pendingStructs
    const l = ecrireLisible(lue, 1_791_000_000_000, { nom: 'Troué', id: ID })
    expect(l.incomplet).toBe(true)
    const lu = lireTableau(new Uint8Array(await l.fichier.arrayBuffer()))
    expect(lu.pages).toBe(l.pages)
    // Le document vivant n'a pas changé : ses changements en attente y sont encore
    expect(lue.store.pendingStructs).toBe(avant)
    // … et la mise à jour manquante (un fichier enregistré pendant la séance du trou) les reprend
    Y.applyUpdate(lue, manquante)
    expect(lue.store.pendingStructs).toBeNull()
    expect(Y.encodeStateVector(lue)).toEqual(Y.encodeStateVector(t.doc))
    expect(formes(lue)).toBe(formes(t.doc))
    // Le fichier de ce qui se relisait, ouvert ensuite : il est contenu dans le tout
    const d = new Y.Doc({ gc: false }); Y.applyUpdate(d, lu.etat)
    expect(formes(d)).toBeLessThan(formes(t.doc))
  })

  it('ecrireLisible sur une mémoire entière : le même document que ecrireTableau ; sans page : rien n\'est écrit', async () => {
    const { t } = await uneBase()
    const l = ecrireLisible(t.doc, 3, { nom: 'Entier', id: ID })
    expect(l.incomplet).toBe(false)
    const a = lireTableau(new Uint8Array(await l.fichier.arrayBuffer()))
    const b = lireTableau(new Uint8Array(await ecrireTableau(t.doc, 3, { nom: 'Entier', id: ID }).arrayBuffer()))
    expect(a.entete).toEqual(b.entete)
    expect(a.etat).toEqual(b.etat)
    try { ecrireLisible(new Y.Doc({ gc: false })); expect.unreachable() } catch (e) {
      expect(e).toBeInstanceOf(ErreurFichier)
      expect((e as ErreurFichier).raison).toBe('abimee')
    }
  })

  it('une copie ajoutée depuis un fichier (« creer », copie) : preparerCopie sur l\'état du fichier vide son registre', async () => {
    const { t } = await uneBase()
    t.doc.getMap('publications').set('mem:1791000000000', { titre: 'Séance', id: 'drive1' } as never)
    const etat = lireTableau(new Uint8Array(await ecrireTableau(t.doc, 1).arrayBuffer())).etat
    const c = preparerCopie([etat], { id: 'ccccccccdddddddd' })
    expect(c.publications).toBe(1)
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, c.etat); Y.applyUpdate(d, c.vidage)
    expect(d.getMap('publications').size).toBe(0)
    expect(marqueDeCopie(d)).toBe('ccccccccdddddddd')
    expect(Y.encodeStateVector(d)).toEqual(c.vecteur)
    // Sans IndexedDB (sous Node), la demande ne lève pas
    const r = await executer({ n: 4, genre: 'creer', cible: 'mem-teachingtool-classeur-00112233aabbccdd', etat, infos: { id: '00112233aabbccdd', nom: 'X' }, copie: true })
    expect(r.n).toBe(4)
    expect('erreur' in r && r.erreur.raison).toBe('indisponible')
  })

  it('« Remplacer » par le fichier d\'un classeur de la corbeille (« preparer-copie ») : l\'état et le vidage, rendus sans rien écrire', async () => {
    const { t } = await uneBase()
    t.doc.getMap('publications').set('mem:1791000000000', { titre: 'Séance', id: 'drive1' } as never)
    const etat = lireTableau(new Uint8Array(await ecrireTableau(t.doc, 1).arrayBuffer())).etat
    // Sans IndexedDB : rien n'est ouvert, la demande aboutit
    const r = await executer({ n: 5, genre: 'preparer-copie', etat, id: 'eeeeeeeeffffffff' })
    expect(r.n).toBe(5)
    if (!('preparee' in r)) throw new Error(JSON.stringify(r))
    expect(r.publications).toBe(1)
    const d = new Y.Doc({ gc: false })
    Y.applyUpdate(d, r.etat); Y.applyUpdate(d, r.vidage)
    expect(d.getMap('publications').size).toBe(0)
    expect(marqueDeCopie(d)).toBe('eeeeeeeeffffffff')
    expect(Y.encodeStateVector(d)).toEqual(r.vecteur)
    // Toute l'histoire du fichier y est : son vecteur est contenu dans celui de la copie
    const sv = Y.decodeStateVector(Y.encodeStateVectorFromUpdate(etat)), svc = Y.decodeStateVector(r.vecteur)
    for (const [client, clock] of sv) expect(svc.get(client)).toBe(clock)
    expect(aTransferer(r)).toHaveLength(r.etat.byteOffset === 0 && r.etat.byteLength === r.etat.buffer.byteLength ? 1 : 0)
    // Un état qui n'est pas un classeur : « abimee »
    const x = await executer({ n: 6, genre: 'preparer-copie', etat: new Uint8Array([1, 2, 3]), id: 'eeeeeeeeffffffff' })
    expect('erreur' in x && x.erreur.raison).toBe('abimee')
  })
})
