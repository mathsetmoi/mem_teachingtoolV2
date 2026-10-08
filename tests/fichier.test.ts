// Le tableau dans un fichier (.memc) : il emporte tout le document, et la
// revue comme le replay marchent sur l'autre machine ; un film élève (.mem),
// un fichier quelconque, abîmé ou plus récent sont refusés avec une phrase
// claire ; le lecteur des élèves refuse un .memc.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { gzipSync, strToU8 } from 'fflate'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { DEBUT_TABLEAU, ErreurFilm, ecrireFilm, lireFilm } from '../src/revoir/format'
import type { FilmEleve } from '../src/revoir/format'
import { ErreurFichier, EXTENSION_TABLEAU, VERSION_TABLEAU, dateLisible, ecrireTableau, lireTableau, nomTableau, pagesLisibles, quandLisible, tailleLisible } from '../src/fichier'

let horloge = new Date('2026-10-07T14:05:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number): Trait {
  const pts: number[] = []
  for (let i = 0; i < 5; i++) pts.push(i * 4, i * 2, 0.5)
  return { id: 'T' + numero++, type: 'trait', x, y, z: numero, auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

async function octets(b: Blob) { return new Uint8Array(await b.arrayBuffer()) }

/** Un tableau de deux pages, avec un trait effacé, la piste et les instruments */
async function unTableau() {
  const t = new Tableau(null)
  const p1 = t.ajouterPage('carreaux', 0); t.pageVue = p1
  await attendre(1000)
  const a = trait(0, 0), b = trait(50, 0)
  t.nouveauGeste(); t.poser(p1, a); await attendre(1000)
  t.nouveauGeste(); t.poser(p1, b); await attendre(1000)
  t.nouveauGeste(); t.supprimer(p1, [a.id]); await attendre(1000)
  const p2 = t.ajouterPage('seyes', 1); t.pageVue = p2
  await attendre(1000)
  t.nouveauGeste(); t.poser(p2, trait(10, 10)); await attendre(1000)
  t.noterPiste({ i: 'regle', d: horloge, p: p2, c: 1, q: 'corps', poses: [] } as never)
  t.doc.getMap('instruments').set('regle', { x: 1, y: 2, a: 0, r: 0, visible: true })
  return { t, p1, p2, a, b }
}

/** Le tableau d'un fichier, rejoué dans un document neuf comme au chargement
 *  (origine « film » : le chargement ne fait pas d'étape) */
function rejouer(etat: Uint8Array) {
  const t = new Tableau(null)
  Y.applyUpdate(t.doc, etat, 'film')
  return t
}

describe('enregistrer un tableau (.memc)', () => {
  it('commence par une ligne d\'en-tête lisible, puis le document compressé', async () => {
    const { t } = await unTableau()
    const o = await octets(ecrireTableau(t.doc, 1_791_000_000_000))
    const fin = o.indexOf(0x0a)
    const ligne = new TextDecoder().decode(o.subarray(0, fin))
    expect(ligne).toBe('{"format":"mem-tableau","v":1,"app":"MEM teachingtool","date":1791000000000,"pages":2}')
    expect(ligne.startsWith(DEBUT_TABLEAU)).toBe(true)
    expect([o[fin + 1], o[fin + 2]]).toEqual([0x1f, 0x8b])         // gzip
    expect(EXTENSION_TABLEAU).toBe('.memc')
    expect(VERSION_TABLEAU).toBe(1)
  })

  it('emporte tout : pages, formes, film, piste, instruments, et ce qui a été effacé', async () => {
    const { t, p1, p2, a, b } = await unTableau()
    const lu = lireTableau(await octets(ecrireTableau(t.doc)))
    expect(lu.pages).toBe(2)
    expect(lu.entete).toMatchObject({ format: 'mem-tableau', v: 1, app: 'MEM teachingtool', pages: 2, date: horloge })
    const t2 = rejouer(lu.etat)
    expect(t2.ordre.toArray()).toEqual([p1, p2])
    expect([...t2.formesDe(p1)!.keys()]).toEqual([b.id])
    expect(t2.formesDe(p2)!.size).toBe(1)
    expect(t2.fondDe(p2)).toBe('seyes')
    expect(t2.film.length).toBe(t.film.length)
    expect(t2.piste.length).toBe(1)
    expect((t2.doc.getMap('instruments').get('regle') as { visible: boolean }).visible).toBe(true)
    // La revue et le replay : chaque étape du film se relit pareil sur l'autre machine
    const f1 = t.film.toArray(), f2 = t2.film.toArray()
    for (let i = 0; i < f1.length; i++) {
      const e1 = t.etatA(f1[i]), e2 = t2.etatA(f2[i])
      expect(e2.ordre).toEqual(e1.ordre)
      for (const [id, p] of e1.pages) expect([...e2.pages.get(id)!.formes.keys()]).toEqual([...p.formes.keys()])
    }
    // Le trait effacé est encore là, à l'étape où il était posé
    const avantEffacement = f2.find(e => t2.etatA(e).pages.get(p1)?.formes.has(a.id))
    expect(avantEffacement).toBeTruthy()
    expect(t2.dejaPassee(f2[f2.length - 1], p1, a.id)).toBe(true)
    // Le document entier, octet pour octet
    expect(Y.encodeStateAsUpdate(t2.doc)).toEqual(Y.encodeStateAsUpdate(t.doc))
  })
})

describe('ouvrir un fichier qui n\'est pas un tableau qu\'on sait lire', () => {
  const refuse = (o: Uint8Array) => { try { lireTableau(o); return null } catch (e) { expect(e).toBeInstanceOf(ErreurFichier); return (e as Error).message } }

  it('un film élève (.mem) : il se regarde dans « Revoir la séance »', async () => {
    const film: FilmEleve = { format: 'mem-revoir', v: 1, titre: 'Séance', date: horloge, ordre: ['p'], pages: [{ id: 'p', fond: 'blanc', origine: { x: 0, y: 0 }, formes: [] }], etapes: [], chapitres: [], images: {} }
    const m = refuse(strToU8(await ecrireFilm(film)))
    expect(m).toBe('Ce fichier est un film pour les élèves (.mem) : il se regarde dans « Revoir la séance » et ne contient pas tout le tableau. Pour ouvrir un tableau, choisissez un fichier .memc (menu ⋯ → Enregistrer le tableau).')
  })

  it('un fichier quelconque, vide, ou un en-tête sans saut de ligne', () => {
    const pas = 'Ce fichier n\'est pas un tableau enregistré par MEM teachingtool (fichier .memc).'
    expect(refuse(strToU8('Bonjour'))).toBe(pas)
    expect(refuse(new Uint8Array(0))).toBe(pas)
    expect(refuse(strToU8('%PDF-1.7\n…'))).toBe(pas)
    expect(refuse(strToU8('{"format":"mem-tableau","v":1,"pages":2}'))).toBe(pas)
    expect(refuse(strToU8('{"format":"mem-tableau-faux","v":1}\nxx'))).toBe(pas)
  })

  it('une version plus récente', async () => {
    const { t } = await unTableau()
    const o = await octets(ecrireTableau(t.doc))
    const fin = o.indexOf(0x0a)
    const entete = '{"format":"mem-tableau","v":2,"app":"MEM teachingtool","date":1,"pages":2}\n'
    const r = new Uint8Array([...strToU8(entete), ...o.subarray(fin + 1)])
    expect(refuse(r)).toBe('Ce tableau a été enregistré par une version plus récente de MEM teachingtool : ouvrez-le avec la version en ligne, à jour.')
  })

  it('un fichier abîmé : tronqué, aux octets changés, ou sans aucune page', async () => {
    const abime = 'Ce fichier .memc est abîmé : il ne peut pas être ouvert. Le tableau actuel n\'a pas changé.'
    const { t } = await unTableau()
    const o = await octets(ecrireTableau(t.doc))
    const fin = o.indexOf(0x0a)
    const entete = o.subarray(0, fin + 1)
    expect(refuse(o.subarray(0, fin + 1 + Math.floor((o.length - fin) / 2)))).toBe(abime)     // tronqué
    expect(refuse(new Uint8Array([...entete, 1, 2, 3, 4, 5]))).toBe(abime)                  // pas du gzip
    expect(refuse(new Uint8Array([...entete, ...gzipSync(strToU8('pas un document'))]))).toBe(abime)
    expect(refuse(new Uint8Array([...entete, ...gzipSync(Y.encodeStateAsUpdate(new Y.Doc()))]))).toBe(abime) // aucune page
    // Un document dont il manque le début : des changements en attente
    const d = new Y.Doc({ gc: false })
    d.getArray('ordre').push(['a'])
    const sv = Y.encodeStateVector(d)
    d.getArray('ordre').push(['b'])
    expect(refuse(new Uint8Array([...entete, ...gzipSync(Y.encodeStateAsUpdate(d, sv))]))).toBe(abime)
  })
})

describe('le lecteur des élèves refuse un tableau complet', () => {
  it('avec une phrase qui dit où l\'ouvrir', async () => {
    const { t } = await unTableau()
    // Le lecteur lit le fichier choisi par f.text() : du texte, puis des octets mal décodés
    const texte = new TextDecoder().decode(await octets(ecrireTableau(t.doc)))
    await expect(lireFilm(texte)).rejects.toBeInstanceOf(ErreurFilm)
    await expect(lireFilm(texte)).rejects.toThrow('Ce fichier est un tableau complet enregistré par l\'enseignant (.memc) : il s\'ouvre dans MEM teachingtool, pas ici. Pour revoir la séance, ouvrez le fichier séance (.mem) ou le lien donné par votre enseignant.')
  })
})

describe('les mots', () => {
  it('le nom du fichier, à l\'heure de l\'ordinateur', () => {
    expect(nomTableau(new Date('2026-10-07T14:05:00').getTime())).toBe('tableau-2026-10-07-14h05.memc')
    expect(nomTableau(new Date('2027-01-02T08:09:00').getTime())).toBe('tableau-2027-01-02-08h09.memc')
  })
  it('la taille, les pages, la date', () => {
    expect(tailleLisible(3.2 * 1024 * 1024)).toBe('3,2 Mo')
    expect(tailleLisible(14.6 * 1024 * 1024)).toBe('15 Mo')
    expect(tailleLisible(850 * 1024)).toBe('850 Ko')
    expect(tailleLisible(12)).toBe('1 Ko')
    expect(pagesLisibles(1)).toBe('1 page')
    expect(pagesLisibles(12)).toBe('12 pages')
    const h = (t: string) => t.replace(/ /g, ' ')
    expect(h(dateLisible(new Date('2026-10-07T14:05:00').getTime()))).toBe('le mercredi 7 octobre 2026 à 14 h 05')
    expect(h(dateLisible(new Date('2026-11-01T09:30:00').getTime()))).toBe('le dimanche 1er novembre 2026 à 9 h 30')
    const maintenant = new Date('2026-10-07T16:00:00').getTime()
    expect(h(quandLisible(new Date('2026-10-07T14:05:00').getTime(), maintenant))).toBe('aujourd\'hui à 14 h 05')
    expect(h(quandLisible(new Date('2026-10-06T23:50:00').getTime(), maintenant))).toBe('hier à 23 h 50')
    expect(h(quandLisible(new Date('2026-10-01T10:00:00').getTime(), maintenant))).toBe('le jeudi 1er octobre 2026 à 10 h 00')
  })
})
