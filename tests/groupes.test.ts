// Les groupes (lot 5, morceau K4) : qui est membre de quoi (le même groupe
// ET le même état ; au moins deux), ce qu'un clic prend (le groupe, ou un
// membre seul quand le groupe est pris), ce que Grouper et Dégrouper
// écrivent (des groupes fondus en un ; un membre pris seul qui sort), écrit
// comme l'écrit l'application (Tableau.modifier en UNE transaction notée
// « réglage ») : un Ctrl + Z défait le groupement entier, et ni les séances
// ni la revue n'en font un geste. Puis Verrouiller depuis un membre pris
// seul, qui verrouille tout son groupe, le collage qui donne un groupe neuf,
// et la touche G tenue en plein geste.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import { collage } from '../src/presse-papiers'
import type { Copie } from '../src/presse-papiers'
import { seancesDuFilm } from '../src/revoir/exporter'
import { compterGestes } from '../src/revue/bande'
import { lectureDe } from '../src/revue/planches'
import { toucheTenueEnGeste } from '../src/navigateur'
import { ordreDAffichage } from '../src/ordre'
import type { Forme, ImageForme, Polygone, Trait } from '../src/types'
import { avecGroupes, changementsDegrouper, changementsGrouper, groupeExact, groupesTouches, membreSeul, membresDe, porteurs, priseDuClic } from '../src/groupes'
import { changementsVerrou } from '../src/verrou'

let horloge = new Date('2026-10-12T08:00:00').getTime()
let numero = 1000

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

const trait = (id: string, o: Partial<Trait> = {}): Trait =>
  ({ id, type: 'trait', x: 0, y: 0, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false, ...o })
const image = (id: string, o: Partial<ImageForme> = {}): ImageForme =>
  ({ id, type: 'image', x: 0, y: 0, z: numero++, auteur: 'moi', src: 'b-' + id, l: 100, h: 50, m: [1, 0, 0, 1], ...o })
const point = (id: string, o: Partial<Polygone> = {}): Polygone =>
  ({ id, type: 'polygone', x: 10, y: 10, z: numero++, auteur: 'moi', pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A'], ...o })
const ids = (l: Iterable<{ id: string } | string>) => [...l].map(x => typeof x === 'string' ? x : x.id)

async function tableau(formes: Forme[]) {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0)
  t.pageVue = p
  await attendre(30 * 60_000)
  for (const f of formes) { t.nouveauGeste(); t.poser(p, f); await attendre(800) }
  return { t, p }
}
const page = (t: Tableau, p: string) => ordreDAffichage([...t.formesDe(p)!.values()])
const forme = (t: Tableau, p: string, id: string) => t.formesDe(p)!.get(id) as Forme & Record<string, unknown>

/** Écrit une commande comme App le fait : un geste, une transaction notée « réglage » */
async function regler(t: Tableau, p: string, changements: { id: string; patch: Partial<Forme> }[]) {
  t.nouveauGeste()
  t.modifier(p, changements, { note: 'reglage' })
  t.nouveauGeste()
  await attendre(800)
}

describe('membres', () => {
  it('sans groupe : la forme seule', () => {
    const a = trait('a'), b = trait('b')
    expect(ids(membresDe([a, b], a))).toEqual(['a'])
  })
  it('deux membres : tous deux, dans l\'ordre de la page', () => {
    const a = trait('a', { groupe: 'g' }), x = trait('x'), b = trait('b', { groupe: 'g' })
    expect(ids(membresDe([a, x, b], b))).toEqual(['a', 'b'])
    expect(ids(membresDe([a, x, b], a))).toEqual(['a', 'b'])
  })
  it('un seul porteur restant : ce n\'est plus un groupe', () => {
    const a = trait('a', { groupe: 'g' }), x = trait('x')
    expect(ids(membresDe([a, x], a))).toEqual(['a'])
  })
  it('un porteur d\'un autre état n\'en est pas (un verrouillé avec des libres, une image fixée)', () => {
    const a = trait('a', { groupe: 'g' }), b = trait('b', { groupe: 'g' }), v = trait('v', { groupe: 'g', verrou: true }), i = image('i', { groupe: 'g', fixe: true })
    const f = [a, b, v, i]
    expect(ids(membresDe(f, a))).toEqual(['a', 'b'])
    // Le verrouillé et l'image fixée : chacun son état (une image fixée n'est d'aucun groupe)
    expect(ids(membresDe(f, v))).toEqual(['v'])
    expect(ids(membresDe(f, i))).toEqual(['i'])
    // Deux verrouillés du même groupe en sont un, verrouillé
    const w = trait('w', { groupe: 'g', verrou: true })
    expect(ids(membresDe([...f, w], w))).toEqual(['v', 'w'])
  })
  it('avecGroupes étend chaque identifiant à son groupe, et seulement aux membres', () => {
    const a = trait('a', { groupe: 'g' }), b = trait('b', { groupe: 'g' }), v = trait('v', { groupe: 'g', verrou: true }), c = trait('c', { groupe: 'h' }), x = trait('x')
    const f = [a, b, v, c, x]
    expect([...avecGroupes(f, ['a'])].sort()).toEqual(['a', 'b'])
    expect([...avecGroupes(f, ['c', 'x'])].sort()).toEqual(['c', 'x'])
    expect([...avecGroupes(f, ['inconnu'])]).toEqual(['inconnu'])
  })
})

describe('ce qu\'un clic prend, et ce que le rendu encadre', () => {
  const a = trait('a', { groupe: 'g' }), b = trait('b', { groupe: 'g' }), c = trait('c', { groupe: 'g' }), x = trait('x')
  const f = [a, b, c, x]
  it('un clic sur un membre : tout le groupe ; sur un autre objet : lui seul', () => {
    expect(ids(priseDuClic(f, new Set(), b))).toEqual(['a', 'b', 'c'])
    expect(ids(priseDuClic(f, new Set(['x']), a))).toEqual(['a', 'b', 'c'])
    expect(ids(priseDuClic(f, new Set(), x))).toEqual(['x'])
  })
  it('un membre pris seul : un clic sur un autre membre du même groupe ne prend que lui', () => {
    expect(ids(priseDuClic(f, new Set(['a']), b))).toEqual(['b'])
    // Pas depuis un objet d'ailleurs, ni depuis le groupe entier
    expect(ids(priseDuClic(f, new Set(['x']), b))).toEqual(['a', 'b', 'c'])
  })
  it('groupeExact, membreSeul', () => {
    expect(ids(groupeExact(f, new Set(['a', 'b', 'c']))!)).toEqual(['a', 'b', 'c'])
    expect(groupeExact(f, new Set(['a', 'b', 'c', 'x']))).toBeNull()
    expect(groupeExact(f, new Set(['a', 'b']))).toBeNull()
    expect(groupeExact(f, new Set(['a']))).toBeNull()
    expect(membreSeul(f, new Set(['b']))?.id).toBe('b')
    expect(membreSeul(f, new Set(['x']))).toBeNull()
    expect(membreSeul(f, new Set(['a', 'b']))).toBeNull()
  })
  it('groupesTouches : le groupe pris est entier, un membre pris seul ne l\'est pas ; rien sans groupe', () => {
    expect(groupesTouches(f, new Set(['a', 'b', 'c', 'x'])).map(g => [ids(g.membres), g.entier])).toEqual([[['a', 'b', 'c'], true]])
    expect(groupesTouches(f, new Set(['b'])).map(g => [ids(g.membres), g.entier])).toEqual([[['a', 'b', 'c'], false]])
    expect(groupesTouches(f, new Set(['x']))).toEqual([])
    expect(groupesTouches(f, new Set())).toEqual([])
  })
})

describe('grouper, dégrouper', () => {
  it('grouper : un identifiant pour tous ; moins de deux, ou déjà ce seul groupe : rien', () => {
    const f = [trait('a'), trait('b'), trait('c')]
    expect(changementsGrouper(f, ['a', 'b'], 'G')).toEqual([{ id: 'a', patch: { groupe: 'G' } }, { id: 'b', patch: { groupe: 'G' } }])
    expect(changementsGrouper(f, ['a'], 'G')).toEqual([])
    const g = [trait('a', { groupe: 'g' }), trait('b', { groupe: 'g' }), trait('c')]
    expect(changementsGrouper(g, ['a', 'b'], 'G')).toEqual([])
    // Rien de verrouillé n'entre dans un groupe
    expect(changementsGrouper([trait('a'), trait('v', { verrou: true })], ['a', 'v'], 'G')).toEqual([])
  })
  it('grouper des groupes les fond en un (un seul niveau), même depuis un membre pris seul', () => {
    const f = [trait('a', { groupe: 'g' }), trait('b', { groupe: 'g' }), trait('c', { groupe: 'h' }), trait('d', { groupe: 'h' }), trait('x')]
    const ch = changementsGrouper(f, ['a', 'b', 'c', 'd'], 'G')
    expect(ch.map(c => c.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(ch.every(c => c.patch.groupe === 'G')).toBe(true)
    // Un membre de g pris seul et x : tout g rejoint le nouveau groupe
    expect(changementsGrouper(f, ['a', 'x'], 'G').map(c => c.id)).toEqual(['a', 'b', 'x'])
  })
  it('dégrouper : la clé s\'en va pour ceux qui ont un groupe', () => {
    const f = [trait('a', { groupe: 'g' }), trait('b', { groupe: 'g' }), trait('x')]
    expect(changementsDegrouper(f, ['a', 'b', 'x'])).toEqual([{ id: 'a', patch: { groupe: undefined } }, { id: 'b', patch: { groupe: undefined } }])
  })

  it('un Ctrl+Z défait le groupement entier, un Ctrl+Y le refait ; grouper et dégrouper sont notés « réglage »', async () => {
    const { t, p } = await tableau([trait('a'), trait('b'), trait('c')])
    const u = t.annulationDe(p)!, n = u.undoStack.length
    await regler(t, p, changementsGrouper(page(t, p), ['a', 'b', 'c'], 'G'))
    expect(u.undoStack.length).toBe(n + 1)
    expect(['a', 'b', 'c'].map(id => forme(t, p, id).groupe)).toEqual(['G', 'G', 'G'])
    expect(t.film.get(t.film.length - 1).reglage).toBe(true)
    t.annuler(p)
    expect(['a', 'b', 'c'].map(id => 'groupe' in forme(t, p, id))).toEqual([false, false, false])
    t.retablir(p)
    expect(['a', 'b', 'c'].map(id => forme(t, p, id).groupe)).toEqual(['G', 'G', 'G'])
    // Dégrouper : une étape, notée « réglage » ; un Ctrl+Z rend le groupe
    await regler(t, p, changementsDegrouper(page(t, p), ['a', 'b', 'c']))
    expect(t.film.get(t.film.length - 1).reglage).toBe(true)
    expect(['a', 'b', 'c'].map(id => 'groupe' in forme(t, p, id))).toEqual([false, false, false])
    t.annuler(p)
    expect(['a', 'b', 'c'].map(id => forme(t, p, id).groupe)).toEqual(['G', 'G', 'G'])
  })

  it('grouper n\'est un geste ni des séances ni de la revue', async () => {
    const { t, p } = await tableau([trait('a'), trait('b'), trait('c')])
    const l0 = lectureDe(t, () => t.ordre.toArray())
    const avant = compterGestes(l0, { genre: 'page', page: p })
    const s0 = seancesDuFilm(t.film.toArray()).map(s => s.gestes)
    await attendre(24 * 3600_000)
    await regler(t, p, changementsGrouper(page(t, p), ['a', 'b', 'c'], 'G'))
    await regler(t, p, changementsDegrouper(page(t, p), ['a']))
    expect(seancesDuFilm(t.film.toArray()).map(s => s.gestes)).toEqual(s0)
    const l = lectureDe(t, () => t.ordre.toArray())
    expect(compterGestes(l, { genre: 'page', page: p })).toBe(avant)
  })
})

describe('un groupe toujours entier dans son état', () => {
  it('verrouiller depuis un membre pris seul verrouille tout son groupe ; déverrouiller de même', async () => {
    const { t, p } = await tableau([trait('a', { groupe: 'G' }), trait('b', { groupe: 'G' }), trait('c', { groupe: 'G' }), trait('x')])
    // Ce que fait App.verrouiller : les porteurs du groupe de chacun
    await regler(t, p, changementsVerrou(page(t, p), porteurs(page(t, p), ['b']), true))
    expect(['a', 'b', 'c', 'x'].map(id => !!forme(t, p, id).verrou)).toEqual([true, true, true, false])
    // Verrouillé, il reste un groupe : verrouillé en entier
    expect(ids(membresDe(page(t, p), page(t, p).find(f => f.id === 'a')!))).toEqual(['a', 'b', 'c'])
    await regler(t, p, changementsVerrou(page(t, p), porteurs(page(t, p), ['c']), false))
    expect(['a', 'b', 'c'].map(id => 'verrou' in forme(t, p, id))).toEqual([false, false, false])
  })
  it('porteurs : quel que soit leur état', () => {
    const f = [trait('a', { groupe: 'G' }), trait('b', { groupe: 'G', verrou: true }), trait('x')]
    expect([...porteurs(f, ['a'])].sort()).toEqual(['a', 'b'])
    expect([...porteurs(f, ['x'])]).toEqual(['x'])
  })
})

describe('ce que le groupe traverse', () => {
  it('coller et dupliquer : un groupe neuf, commun, quand deux membres au moins partent ; un seul : plus de groupe', () => {
    const a = trait('a', { groupe: 'G' }), b = trait('b', { groupe: 'G' }), c = trait('c', { groupe: 'G' })
    const copie: Copie = { v: 1, formes: [a, b, c], images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 0 }
    const r = collage(copie, { dx: 40, dy: 40, moi: 'moi', existantes: [a, b, c] })
    const g = r[0].groupe
    expect(g && g !== 'G' && r.every(f => f.groupe === g)).toBe(true)
    const r2 = collage(copie, { dx: 40, dy: 40, moi: 'moi', existantes: [a, b, c, ...r] })
    expect(r2[0].groupe).not.toBe(g)
    // Un membre pris seul, copié : sa copie n'est d'aucun groupe
    const seul = collage({ ...copie, formes: [b] }, { dx: 40, dy: 40, moi: 'moi', existantes: [a, b, c] })
    expect('groupe' in seul[0]).toBe(false)
  })
  it('un point libre repéré sur une image groupée en est membre ; verrouillé, il n\'en est pas', () => {
    const i = image('i'), pl = point('pl', { lie: 'i' }), pv = point('pv', { lie: 'i', verrou: true }), x = trait('x')
    const f = [i, pl, pv, x]
    // Ce que passe App.grouper : les libres d'objetsChoisis (l'image, ses points, x)
    expect(changementsGrouper(f, ['i', 'pl', 'x'], 'G').map(c => c.id)).toEqual(['i', 'pl', 'x'])
  })
})

describe('la touche G en plein geste', () => {
  it('Ctrl + G et Ctrl + Maj + G se taisent pendant un geste (⌘ compris) ; G seul non', () => {
    const k = (key: string, o: Partial<KeyboardEvent> = {}) => ({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...o })
    expect(toucheTenueEnGeste(k('g', { ctrlKey: true }), false)).toBe(true)
    expect(toucheTenueEnGeste(k('G', { ctrlKey: true, shiftKey: true }), false)).toBe(true)
    expect(toucheTenueEnGeste(k('g', { metaKey: true }), false)).toBe(true)
    expect(toucheTenueEnGeste(k('g'), false)).toBe(false)
    // AltGr (Ctrl + Alt sous Windows) n'en est pas un
    expect(toucheTenueEnGeste(k('g', { ctrlKey: true, altKey: true }), false)).toBe(false)
  })
})
