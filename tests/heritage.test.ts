// Le passé d'une copie de page, dans la revue en classe et le film élève.
// L'histoire d'une copie Q de P, ce sont les étapes notées sur P avant la
// naissance de Q (et ainsi de suite pour une copie de copie), puis celles
// notées sur Q ; rien n'est recopié, on relit les instantanés de P. La
// naissance d'une copie n'est jamais un geste. Le film élève reprend ce passé
// pour une copie publiée seule ; publiée avec son original, elle paraît d'un
// coup à sa naissance, comme en classe.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import { Filiation, filiationDe } from '../src/heritage'
import type { Trait } from '../src/types'
import { Piste } from '../src/piste'
import type { Horloge, Peint } from '../src/piste'
import { exporterDetaille, pagesDeLaSeance, seancesAPublier, seancesDuFilm } from '../src/revoir/exporter'
import { Bobine } from '../src/revoir/bobine'
import type { Portion } from '../src/revue/bande'
import { bandeParDefaut, compterGestes, construireBande, seanceTouche, seancesDeLaPage } from '../src/revue/bande'
import { Planches, lectureDe, memeImage } from '../src/revue/planches'
import { JournalPages } from '../src/pages/journal'
import * as actions from '../src/pages/actions'

const MINUTE = 60_000
let horloge = new Date('2026-10-09T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Pose une forme en son propre geste, sur la page qu'on regarde */
async function geste(t: Tableau, page: string, id: string, x = 0, y = 0) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, y, id))
  await attendre(800)
}

/** Un tableau de n pages, sans enregistrement ; une demi-heure plus tard, la séance commence */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  await attendre(30 * MINUTE)
  return { t, pages }
}

/** Comme l'application après « Dupliquer la page » : on va sur la copie */
async function dupliquer(t: Tableau, p: string) {
  t.pageVue = p
  const q = t.dupliquerPage(p)!
  t.pageVue = q
  await attendre(500)
  return q
}

/** P avec trois gestes, sa copie Q avec deux, puis deux de plus sur P : une séance */
async function scenario() {
  const { t, pages: [p, b] } = await tableau(2)
  for (const id of ['p1', 'p2', 'p3']) await geste(t, p, id)
  const q = await dupliquer(t, p)
  for (const id of ['q1', 'q2']) await geste(t, q, id, 50, 50)
  for (const id of ['p4', 'p5']) await geste(t, p, id, 90, 0)
  return { t, p, q, b }
}

/** Ce que la revue reçoit : une lecture seule, les séances, des noms de pages */
function revue(t: Tableau) {
  const lecture = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(lecture.film)
  const nommer = (p: string) => { const i = t.ordre.toArray().indexOf(p); return i < 0 ? 'Page jetée' : `Page ${i + 1}` }
  const bande = (p: Portion) => construireBande(lecture, p, seances, nommer)
  return { lecture, seances, nommer, bande, planches: new Planches(lecture) }
}

/** Le même tableau relu depuis ses octets (comme après un rechargement) : objets distincts */
function recharger(t: Tableau): Tableau {
  const u = new Tableau(null)
  Y.applyUpdate(u.doc, Y.encodeStateAsUpdate(t.doc), 'film')
  return u
}

const naissanceDe = (t: Tableau, page: string) => t.film.toArray().findIndex(e => e.page === page)

describe('la filiation (pure)', () => {
  const film = ['a', 'a', 'b', 'a', 'c', 'b', 'c', 'd'].map(page => ({ page }))
  // b copie de a (née à 2), c copie de b (née à 4), d une page ordinaire
  const origines: Record<string, string> = { b: 'a', c: 'b' }
  const fil = new Filiation(film, p => origines[p] ?? null)

  it('naissance, copies, source le long de la chaîne', () => {
    expect(fil.copies).toBe(true)
    expect([fil.naissance('a'), fil.naissance('b'), fil.naissance('c'), fil.naissance('x')]).toEqual([0, 2, 4, -1])
    expect([0, 1, 2, 3, 4, 5].map(i => fil.source('c', i))).toEqual(['a', 'a', 'b', 'b', 'c', 'c'])
    expect([0, 1, 2, 3].map(i => fil.source('b', i))).toEqual(['a', 'a', 'b', 'b'])
    expect(fil.ascendants('c')).toEqual(['b', 'a'])
    expect(fil.ascendants('a')).toEqual([])
    expect(fil.source('d', 0)).toBe('d')                          // pas une copie : elle-même, même avant sa naissance
    expect(fil.source('x', 0)).toBe('x')
    // L'héritage s'arrête à une origine publiée : la page n'existe pas encore
    expect(fil.source('c', 1, o => o === 'a')).toBeNull()
    expect(fil.source('c', 3, o => o === 'a')).toBe('b')
    expect(fil.source('c', 3, o => o === 'b')).toBeNull()
    expect(fil.source('c', 4, () => true)).toBe('c')
  })

  it('deLaPage : les étapes de l\'origine avant la naissance, puis celles de la page', () => {
    const de = (page: string) => film.map((e, i) => i).filter(i => fil.deLaPage(i, page, film[i].page))
    expect(de('a')).toEqual([0, 1, 3])
    expect(de('b')).toEqual([0, 1, 2, 5])
    expect(de('c')).toEqual([0, 1, 2, 4, 6])
    expect(de('d')).toEqual([7])
  })

  it('sans copie, rien ne se résout ; une donnée abîmée (une boucle) ne gèle rien', () => {
    const sans = new Filiation(film, () => null)
    expect(sans.copies).toBe(false)
    expect(sans.source('c', 0)).toBe('c')
    const boucle = new Filiation([{ page: 'a' }, { page: 'b' }, { page: 'x' }], p => (p === 'a' ? 'b' : p === 'b' ? 'a' : null))
    expect(['a', 'b']).toContain(boucle.source('a', -1))
    expect(boucle.ascendants('a')).toEqual(['b'])
    expect(new Filiation(film, p => p).copies).toBe(false)        // une page qui hériterait d'elle-même n'est pas une copie
  })
})

describe('la revue : le passé d\'une copie', () => {
  /** Tout ce que la revue doit dire du scénario, sur un tableau (le même, ou relu) */
  function verifier(t: Tableau, p: string, q: string) {
    const r = revue(t)
    const film = r.lecture.film
    const nee = naissanceDe(t, q)
    const s1 = r.seances[0]
    // Toute son histoire : les trois gestes de P, puis les deux de Q ; la naissance n'en est pas un
    expect(r.lecture.naissance(nee)).toBe(true)                    // une copie pleine naît quand même
    expect(compterGestes(r.lecture, { genre: 'page', page: q })).toBe(5)
    expect(compterGestes(r.lecture, { genre: 'seance', seance: s1, page: q })).toBe(5)
    expect(compterGestes(r.lecture, { genre: 'page', page: p })).toBe(5)
    expect(compterGestes(r.lecture, { genre: 'seance', seance: s1, page: null })).toBe(7)
    const b = r.bande({ genre: 'page', page: q })!
    expect(b.total).toBe(5)
    expect(b.images).toHaveLength(6)                               // l'image d'avant, puis cinq gestes : pas de « bout » en plus
    expect(b.images.every(img => img.p === q)).toBe(true)
    expect(b.images.some(img => img.e === nee)).toBe(false)        // aucune image à la naissance
    // Les trois premiers gestes sont ceux de P, lus dans P
    const ids = b.images.map(img => r.planches.lire(img).formes.map(f => f.id))
    expect(ids).toEqual([[], ['p1'], ['p1', 'p2'], ['p1', 'p2', 'p3'], ['p1', 'p2', 'p3', 'q1'], ['p1', 'p2', 'p3', 'q1', 'q2']])
    expect(b.images.slice(1, 4).map(img => film[img.e].page)).toEqual([p, p, p])
    expect(b.images.slice(4).map(img => film[img.e].page)).toEqual([q, q])
    expect(r.planches.lire(b.images[1]).formes[0]).toBe(t.pageA(film[b.images[1].e], p)!.formes[0])
    // Au premier geste à elle, seule la forme neuve paraît et se dessine
    const apparues = r.planches.apparues(b.images[3], b.images[4])
    expect(apparues.map(f => f.id)).toEqual(['q1'])
    expect(r.planches.neuves(b.images[3], apparues).map(f => f.id)).toEqual(['q1'])
    // La séance concerne la copie ; l'histoire de P ne prend rien de Q
    expect(seanceTouche(r.lecture, s1, q)).toBe(true)
    expect(seancesDeLaPage(r.lecture, r.seances, q)).toEqual([s1])
    const bp = r.bande({ genre: 'page', page: p })!
    expect(bp.images.map(img => r.planches.lire(img).formes.map(f => f.id)).at(-1)).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    // Une page et sa copie, au même contenu, font la même image (objets distincts)
    const avant = r.lecture.page(nee - 1, p)!, apres = r.lecture.page(nee, q)!
    expect(apres.formes[0]).not.toBe(avant.formes[0])
    expect(memeImage(avant, apres)).toBe(true)
    // La séance entière : 7 gestes, aucune image à la naissance de Q
    const bs = r.bande({ genre: 'seance', seance: s1, page: null })!
    expect(bs.total).toBe(7)
    expect(bs.images.filter(img => img.geste).map(img => film[img.e].page)).toEqual([p, p, p, q, q, p, p])
    return { r, b }
  }

  it('toute son histoire : les gestes de l\'original avant la copie, puis les siens, sans geste à la naissance', async () => {
    const { t, p, q } = await scenario()
    verifier(t, p, q)
  })

  it('les mêmes résultats après un rechargement (objets distincts)', async () => {
    const { t, p, q } = await scenario()
    const avant = verifier(t, p, q)
    const u = recharger(t)
    expect(u.formesDe(q)!.get('p1')).not.toBe(u.formesDe(p)!.get('p1'))
    const apres = verifier(u, p, q)
    expect(apres.b.images).toEqual(avant.b.images)
    expect(Array.from(apres.b.attentes)).toEqual(Array.from(avant.b.attentes))
  })

  it('une copie de copie : 3 + 2 + 2 gestes', async () => {
    const { t, p, q } = await scenario()
    const r0 = await dupliquer(t, q)
    for (const id of ['r1', 'r2']) await geste(t, r0, id, 20, 90)
    const r = revue(t)
    expect(compterGestes(r.lecture, { genre: 'page', page: r0 })).toBe(7)
    const b = r.bande({ genre: 'page', page: r0 })!
    expect(b.images.filter(img => img.geste).map(img => r.lecture.film[img.e].page)).toEqual([p, p, p, q, q, r0, r0])
    expect(r.planches.lire(b.images.at(-1)!).formes.map(f => f.id)).toEqual(['p1', 'p2', 'p3', 'q1', 'q2', 'r1', 'r2'])
    // Q et P n'ont rien pris de R
    expect(compterGestes(r.lecture, { genre: 'page', page: q })).toBe(5)
    expect(compterGestes(r.lecture, { genre: 'page', page: p })).toBe(5)
  })

  it('l\'original jeté puis supprimé définitivement, ou effacé à l\'ancienne : l\'histoire de la copie ne change pas', async () => {
    const { t, p, q, b } = await scenario()
    const r0 = revue(t)
    const avant = r0.bande({ genre: 'page', page: q })!
    const formes = avant.images.map(img => r0.planches.lire(img).formes.map(f => f.id))
    t.pageVue = b
    expect(t.jeterPage(p, b)).toBe(true); await attendre(500)
    expect(t.supprimerDefinitivement([p])).toBe(1); await attendre(500)
    let r = revue(t)
    let apres = r.bande({ genre: 'page', page: q })!
    expect(apres.images).toEqual(avant.images)
    expect(apres.images.map(img => r.planches.lire(img).formes.map(f => f.id))).toEqual(formes)
    expect(seancesDeLaPage(r.lecture, r.seances, q)).toHaveLength(1)
    // L'original garde aussi toute son histoire (« Pages jetées »)
    expect(compterGestes(r.lecture, { genre: 'page', page: p })).toBe(5)
    // Effacé à l'ancienne (sa Y.Map détruite) : le passé se lit encore dans les instantanés
    const u = await scenario()
    const r1 = revue(u.t)
    const avant1 = r1.bande({ genre: 'page', page: u.q })!
    u.t.pageVue = u.b
    u.t.supprimerPage(u.p); await attendre(500)
    r = revue(u.t)
    apres = r.bande({ genre: 'page', page: u.q })!
    expect(apres.images).toEqual(avant1.images)
    expect(r.planches.lire(apres.images[3]).formes.map(f => f.id)).toEqual(['p1', 'p2', 'p3'])
    expect(compterGestes(r.lecture, { genre: 'page', page: u.q })).toBe(5)
  })

  it('une copie sans geste à elle montre son passé, à l\'ouverture comme dans « Toute son histoire »', async () => {
    const { t, pages: [p] } = await tableau(2)
    for (const id of ['p1', 'p2', 'p3']) await geste(t, p, id)
    await attendre(40 * MINUTE)                                   // la copie, à la séance suivante
    const q = await dupliquer(t, p)
    await geste(t, p, 'p4')                                       // l'original continue : la copie n'en prend rien
    const r = revue(t)
    expect(compterGestes(r.lecture, { genre: 'page', page: q })).toBe(3)
    const d = bandeParDefaut(r.lecture, r.seances, q, r.nommer)!
    expect(d.portion).toMatchObject({ genre: 'seance', page: q })
    expect(d.total).toBe(3)
    expect(r.planches.lire(d.images.at(-1)!).formes.map(f => f.id)).toEqual(['p1', 'p2', 'p3'])
    // La séance de la copie n'est pas une séance de la page : sa naissance
    // n'y est ni un geste, ni une page (voir seancesDuFilm), et la séance
    // suivante n'a que le geste de l'original
    expect(seancesDeLaPage(r.lecture, r.seances, q)).toHaveLength(1)
    const seule = r.seances[0]
    expect(seule.pages).toEqual([p])
    expect(compterGestes(r.lecture, { genre: 'seance', seance: seule, page: q })).toBe(0)
    // Et l'affiche de toute son histoire n'ajoute pas de geste « bout » (la copie égale l'original d'alors)
    const b = r.bande({ genre: 'page', page: q })!
    expect(b.total).toBe(3)
  })
})

/** Le film élève d'une séance, pour ces pages */
function filmEleve(t: Tableau, pages: string[], seance = seancesDuFilm(t.film.toArray())[0]) {
  return exporterDetaille(t, { de: seance.de, a: seance.a, pages, titre: 'Séance' }, { instruments: false })
}

describe('le film élève d\'une copie', () => {
  it('publiée seule : elle se construit comme l\'original, puis continue ; aucun geste à sa naissance', async () => {
    const { t, p, q } = await scenario()
    const nee = naissanceDe(t, q)
    for (const tab of [t, recharger(t)]) {
      const { film: f, sources } = filmEleve(tab, [q])
      expect(f.pages.map(x => [x.id, x.formes.length])).toEqual([[q, 0]])   // la page de départ est vide
      expect(f.ordre).toEqual([q])
      expect(f.etapes.map(e => e.p)).toEqual([q, q, q, q, q])
      expect(f.etapes.map(e => e.o.map(o => o[0] === '=' ? o[1].id : o[0]))).toEqual([['p1'], ['p2'], ['p3'], ['q1'], ['q2']])
      expect(sources).not.toContain(nee)
      expect(sources.slice(0, 3).map(i => t.film.get(i).page)).toEqual([p, p, p])
      // Chaque trait se dessine une fois, à son geste
      const bob = new Bobine(f)
      expect([1, 2, 3, 4, 5].map(k => [...bob.ajoutees(k)])).toEqual([['p1'], ['p2'], ['p3'], ['q1'], ['q2']])
    }
  })

  it('publiée avec l\'original : l\'original se construit, la copie paraît d\'un coup à sa naissance, puis chacune continue', async () => {
    const { t, p, q } = await scenario()
    const nee = naissanceDe(t, q)
    for (const tab of [t, recharger(t)]) {
      const { film: f, sources } = filmEleve(tab, [p, q])
      expect(f.etapes.map(e => e.p)).toEqual([p, p, p, q, q, q, p, p])
      expect(sources[3]).toBe(nee)
      expect(f.etapes[3].o.filter(o => o[0] === '=').map(o => o[1].id).sort()).toEqual(['p1', 'p2', 'p3'])
      expect(f.ordre).toEqual([p, q])
      // Au lecteur, ses formes sont déjà vues : elles paraissent d'un coup, sans se redessiner
      const bob = new Bobine(f)
      expect([...bob.ajoutees(4)]).toEqual([])
      expect([...bob.ajoutees(5)]).toEqual(['q1'])
    }
  })

  it('deux copies d\'un même original, publiées sans lui : la première se construit, la seconde paraît d\'un coup ; aucun geste joué deux fois', async () => {
    const { t, p, q } = await scenario()
    const q2 = await dupliquer(t, p)                              // une seconde copie, plus tard (après p4, p5)
    await geste(t, q2, 'r1', 20, 90)
    const nee = naissanceDe(t, q2)
    const { film: f, sources } = filmEleve(t, [q, q2])
    expect(f.etapes.map(e => e.p === q ? 'Q' : 'R')).toEqual(['Q', 'Q', 'Q', 'Q', 'Q', 'R', 'R'])
    expect(sources[5]).toBe(nee)
    expect(f.etapes[5].o.filter(o => o[0] === '=').map(o => o[1].id).sort()).toEqual(['p1', 'p2', 'p3', 'p4', 'p5'])
    expect(new Set(sources).size).toBe(sources.length)            // chaque étape du tableau, un geste au plus
    // (la seconde copie se range juste après l'original, avant la première)
    expect(f.chapitres.map(c => c.titre)).toEqual(['Page 2', 'Page 1'])
    // Ce qu'on a déjà vu se construire sur la première ne se redessine pas sur la seconde
    const bob = new Bobine(f)
    expect([...bob.ajoutees(6)].sort()).toEqual(['p4', 'p5'])
    // Publiée seule, la seconde reprend tout le passé de l'original jusqu'à elle
    const seule = filmEleve(t, [q2]).film
    expect(seule.etapes.map(e => e.o.map(o => o[0] === '=' ? o[1].id : o[0]).join(' '))).toEqual(['p1', 'p2', 'p3', 'p4', 'p5', 'r1'])
  })

  it('aucun pas vide vers une autre page publiée, pour une étape sans effet notée sur elle avant la copie', async () => {
    const { t, pages: [p, r, x] } = await tableau(3)
    await geste(t, p, 'p1')
    // Depuis R, on jette X (une étape sans effet, notée sur R), puis on revient sur P
    t.pageVue = r
    expect(t.jeterPage(x, r)).toBe(true); await attendre(800)
    await geste(t, p, 'p2')
    const q = await dupliquer(t, p)
    await geste(t, q, 'q1')
    const { film: f } = filmEleve(t, [q, r])
    expect(f.etapes.map(e => [e.p, e.o.length])).toEqual([[q, 1], [q, 1], [q, 1]])
    expect(f.chapitres).toHaveLength(1)
  })

  it('Publier ne propose pas une copie partie du tableau sans rien avoir reçu à elle (retirée par Ctrl+Z, ou supprimée)', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (const id of ['p1', 'p2']) await geste(t, p, id)
    const gardee = await dupliquer(t, p)                          // gardée, sans geste : elle paraît d'un coup
    t.pageVue = p
    const retiree = t.dupliquerPage(p, { marque: true })!; t.pageVue = retiree; await attendre(500)
    expect(t.annuler(retiree)).toEqual({ copie: retiree, retour: p }); t.pageVue = p; await attendre(500)
    const jetee = await dupliquer(t, p)
    t.pageVue = p; expect(t.jeterPage(jetee, p)).toBe(true); await attendre(500)
    const ecrite = await dupliquer(t, p)                          // on y écrit, puis on la jette : elle se propose
    await geste(t, ecrite, 'e1')
    t.pageVue = p; expect(t.jeterPage(ecrite, p)).toBe(true); await attendre(500)
    await geste(t, p, 'p3')
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(new Set(pagesDeLaSeance(t, s))).toEqual(new Set([p, gardee, ecrite]))
    // Le film élève de ces pages : la copie gardée paraît d'un coup, aucun pas vide vers une copie retirée
    const { film: f } = filmEleve(t, pagesDeLaSeance(t, s), s)
    expect(f.etapes.every(e => e.p !== retiree && e.p !== jetee)).toBe(true)
  })

  it('un tableau sans copie : la filiation ne résout rien', async () => {
    const { t, pages: [p] } = await tableau(2)
    await geste(t, p, 'p1')
    const fil = filiationDe(t, t.film.toArray())
    expect(fil.copies).toBe(false)
    expect(revue(t).lecture.copies).toBe(false)
  })
})

/** Ce qu'on fait en rangeant, hors du cours : chaque action, sur la page p
 *  qu'on regarde (q : une autre page). La trieuse passe par son journal,
 *  comme dans l'application ; la barre du haut appelle le document. */
const RANGEMENTS: [string, (t: Tableau, p: string, q: string) => Promise<void>][] = [
  ['Dupliquer la page', async (t, p) => { await dupliquer(t, p); t.pageVue = p }],
  ['Fond d\'une vignette, dans la trieuse', async (t, _p, q) => { actions.changerFond(t, new JournalPages(t), q, 'seyes', null); await attendre(500) }],
  ['Fond changé dans la trieuse, puis Annuler', async (t, _p, q) => { const j = new JournalPages(t); actions.changerFond(t, j, q, 'seyes', null); await attendre(500); expect(j.annuler()).toBe('fait'); await attendre(500) }],
  ['Insérer une page après, dans la trieuse', async (t, p) => { actions.inserer(t, new JournalPages(t), p, 'apres', 'seyes'); await attendre(500) }],
  ['Ajouter une page, dans la trieuse', async t => { actions.ajouterALaFin(t, new JournalPages(t)); await attendre(500) }],
  ['Nouvelle page, par la barre du haut (on y va, puis on revient)', async (t, p) => { const n = t.ajouterPage('blanc', 1); t.pageVue = n; await attendre(500); t.pageVue = p }],
]

describe('la naissance d\'une page et le rangement dans le découpage en séances', () => {
  it('l\'étape de naissance d\'une copie ou d\'une page vide est notée (naissance), celle d\'un fond changé dans la trieuse aussi (rangement), celle d\'un geste ou d\'un fond changé au tableau non', async () => {
    const { t, pages: [p] } = await tableau(1)
    await geste(t, p, 'p1')
    const n0 = t.film.length
    const q = await dupliquer(t, p)
    expect(t.film.length).toBe(n0 + 1)
    expect(t.film.get(n0)).toMatchObject({ page: q, naissance: true })
    expect(t.film.get(n0).seulOrdre).toBeUndefined()
    t.pageVue = p; const v = t.ajouterPage('blanc', 2); await attendre(500)
    await geste(t, q, 'q1')
    expect(t.film.toArray().filter(e => e.naissance).map(e => e.page)).toEqual([p, q, v])
    expect(t.film.toArray().filter(e => e.rangement)).toEqual([])
    // Le fond : par la trieuse, du rangement (et son Annuler aussi) ; par la barre du haut, un geste
    const j = new JournalPages(t)
    const n1 = t.film.length
    actions.changerFond(t, j, v, 'seyes', null); await attendre(500)
    expect(t.film.get(n1)).toMatchObject({ page: v, rangement: true })
    j.annuler(); await attendre(500)
    expect(t.film.get(n1 + 1)).toMatchObject({ page: v, rangement: true })
    t.pageVue = p; t.changerFond(p, 'seyes'); await attendre(500)
    expect(t.film.get(n1 + 2)).toMatchObject({ page: p })
    expect(t.film.get(n1 + 2).rangement).toBeUndefined()
    expect(t.film.get(n1 + 2).naissance).toBeUndefined()
  })

  for (const [nom, ranger] of RANGEMENTS) {
    it(`${nom}, deux heures après le cours, n'est pas une séance : Publier choisit le cours, avec son nombre de gestes (celui de la revue)`, async () => {
      const { t, pages: [p, q] } = await tableau(2)
      for (let k = 0; k < 5; k++) await geste(t, p, 'c' + k)
      await attendre(2 * 60 * MINUTE)
      t.pageVue = p
      await ranger(t, p, q)
      const s = seancesDuFilm(t.film.toArray())
      // Avant : la plus récente était « 1 geste » (la copie, le fond), sans rien d'autre à montrer
      expect(s[0].gestes).toBe(5)
      const l = lectureDe(t, () => t.ordre.toArray())
      expect(compterGestes(l, { genre: 'seance', seance: s[0], page: null })).toBe(5)
      const publier = seancesAPublier(t)
      expect(publier[0]).toEqual(s[0])
      expect(pagesDeLaSeance(t, publier[0])).toEqual([p])
      expect(exporterDetaille(t, { de: publier[0].de, a: publier[0].a, pages: [p], titre: '' }, { instruments: false }).film.etapes).toHaveLength(5)
    })

    it(`${nom}, entre deux cours, à moins de 20 minutes de chacun : toujours deux séances, chacune avec ses gestes`, async () => {
      const { t, pages: [p, q] } = await tableau(2)
      for (let k = 0; k < 5; k++) await geste(t, p, 'a' + k)
      await attendre(14 * MINUTE)
      t.pageVue = p
      await ranger(t, p, q)
      t.pageVue = p
      await attendre(15 * MINUTE)
      for (let k = 0; k < 5; k++) await geste(t, p, 'b' + k)
      const s = seancesDuFilm(t.film.toArray())
      // Avant : une seule séance de 11 gestes (la revue en comptait 10)
      expect(s.slice(0, 2).map(x => x.gestes)).toEqual([5, 5])
      const l = lectureDe(t, () => t.ordre.toArray())
      expect(s.slice(0, 2).map(x => compterGestes(l, { genre: 'seance', seance: x, page: null }))).toEqual([5, 5])
    })
  }

  it('le fond changé dans la trieuse reste dans la revue de sa page : « Toute son histoire » le montre, et une séance pendant laquelle on l\'a changé l\'emporte', async () => {
    const { t, pages: [p, q] } = await tableau(2)
    await geste(t, q, 'q0')
    for (let k = 0; k < 2; k++) await geste(t, p, 'a' + k)
    const j = new JournalPages(t)
    actions.changerFond(t, j, q, 'seyes', null); await attendre(500)
    for (let k = 0; k < 2; k++) await geste(t, p, 'b' + k)
    const l = lectureDe(t, () => t.ordre.toArray())
    const s = seancesDuFilm(l.film)
    expect(s).toHaveLength(1)
    expect(s[0].gestes).toBe(5)
    // La revue de q : q0, puis le fond qui change
    expect(compterGestes(l, { genre: 'page', page: q })).toBe(2)
    expect(compterGestes(l, { genre: 'seance', seance: s[0], page: q })).toBe(2)
    const f = exporterDetaille(t, { de: s[0].de, a: s[0].a, pages: [q], titre: '' }, { instruments: false }).film
    expect(f.pages[0].fond).toBe('carreaux')
    expect(f.etapes).toHaveLength(2)
  })

  it('une page créée juste avant le premier geste est de la séance sans en être un geste : la revue la voit neuve (deux gestes sur elle font une partie)', async () => {
    const { t, pages: [p] } = await tableau(1)
    await attendre(2 * 60 * MINUTE)
    t.pageVue = p; const b = t.ajouterPage('blanc', 1); await attendre(5 * MINUTE)     // « Nouvelle page » en arrivant
    for (const id of ['p1', 'p2', 'p3']) await geste(t, p, id)
    for (const id of ['b1', 'b2']) await geste(t, b, id)
    const { lecture, seances, bande } = revue(t)
    expect(seances).toHaveLength(1)
    const s = seances[0]
    expect(s.de).toBe(naissanceDe(t, b))                     // la séance commence à la naissance de b
    expect(s.debut).toBe(t.film.get(s.de + 1).t)               // son heure : le premier geste
    expect(s.gestes).toBe(5)
    expect(compterGestes(lecture, { genre: 'seance', seance: s, page: null })).toBe(5)
    expect(bande({ genre: 'seance', seance: s, page: null })!.parties).toHaveLength(2)
    // Créée la veille, b n'est plus neuve : ses deux gestes restent un détour
    const u = await tableau(2)
    await attendre(24 * 60 * MINUTE)
    for (const id of ['p1', 'p2', 'p3']) await geste(u.t, u.pages[0], id)
    for (const id of ['b1', 'b2']) await geste(u.t, u.pages[1], id)
    const r = revue(u.t)
    expect(r.seances[0].de).toBe(naissanceDe(u.t, u.pages[1]) + 1)
    expect(r.bande({ genre: 'seance', seance: r.seances[0], page: null })!.parties).toHaveLength(1)
  })

  it('un fond changé dans la trieuse entre la naissance d\'une page et le premier geste : la séance commence au premier geste, la page a déjà son fond', async () => {
    const { t, pages: [p] } = await tableau(1)
    await attendre(2 * 60 * MINUTE)
    t.pageVue = p; const b = t.ajouterPage('blanc', 1); await attendre(MINUTE)
    actions.changerFond(t, new JournalPages(t), b, 'seyes', null); await attendre(MINUTE)
    for (const id of ['b1', 'b2']) await geste(t, b, id)
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(t.film.get(s.de)).toMatchObject({ page: b })
    expect(t.film.get(s.de).rangement).toBeUndefined()
    expect(s.gestes).toBe(2)
    const f = exporterDetaille(t, { de: s.de, a: s.a, pages: [b], titre: '' }, { instruments: false }).film
    expect(f.pages[0].fond).toBe('seyes')
    expect(f.etapes).toHaveLength(2)
  })

  it('le fond changé par la barre du haut, devant la classe, reste un geste (comme avant le lot 3)', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (let k = 0; k < 2; k++) await geste(t, p, 'c' + k)
    await attendre(2 * 60 * MINUTE)
    t.pageVue = p; t.changerFond(p, 'seyes'); await attendre(500)
    expect(seancesDuFilm(t.film.toArray()).map(s => s.gestes)).toEqual([1, 2])
  })

  it('une copie faite pendant le cours reste dans sa séance, et sa copie s\'y publie', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (const id of ['p1', 'p2']) await geste(t, p, id)
    const q = await dupliquer(t, p)
    await geste(t, q, 'q1')
    const s = seancesDuFilm(t.film.toArray())[0]
    expect(s.gestes).toBe(3)
    expect(new Set(pagesDeLaSeance(t, s))).toEqual(new Set([p, q]))
  })

  it('Publier ne propose pas une séance dont le film n\'a aucun geste (elle n\'a fait qu\'effacer)', async () => {
    const { t, pages: [p] } = await tableau(1)
    for (const id of ['p1', 'p2']) await geste(t, p, id)
    await attendre(2 * 60 * MINUTE)
    t.pageVue = p; t.nouveauGeste(); t.supprimer(p, ['p1']); await attendre(800)
    const s = seancesDuFilm(t.film.toArray())
    expect(s[0].gestes).toBe(1)
    const publier = seancesAPublier(t)
    expect(publier.map(x => x.gestes)).toEqual([2])
  })
})

describe('un tableau au hasard, avec des copies', () => {
  /** Des séances au hasard : on écrit, on modifie, on efface, on change de
   *  page et de fond, on duplique la page qu'on regarde, on en jette une */
  async function auHasard(gestes: number, graine: number) {
    let g = graine
    const hasard = () => { g = (g * 16807) % 2147483647; return g / 2147483647 }
    const t = new Tableau(null)
    let vue = t.ajouterPage('carreaux', 0); t.pageVue = vue
    await attendre(1000)
    for (let i = 0; i < gestes; i++) {
      const r = hasard(), ordre = t.ordre.toArray()
      if (r < 0.04 && ordre.length < 5) { vue = t.ajouterPage('blanc', ordre.length); t.pageVue = vue; await attendre(400) }
      else if (r < 0.1 && ordre.length < 7) { t.pageVue = vue; vue = t.dupliquerPage(vue)!; t.pageVue = vue; await attendre(400) }
      else if (r < 0.13 && ordre.length > 1) {
        const ou = ordre[(ordre.indexOf(vue) + 1) % ordre.length]
        t.pageVue = ou; t.jeterPage(vue, ou); vue = ou; await attendre(400)
      } else if (r < 0.2) { vue = ordre[Math.floor(hasard() * ordre.length)]; t.pageVue = vue }
      const ids = [...t.formesDe(vue)!.keys()]
      const q = hasard()
      t.pageVue = vue; t.nouveauGeste()
      if (q < 0.6 || !ids.length) t.poser(vue, trait(hasard() * 900, hasard() * 600))
      else if (q < 0.75) t.modifier(vue, [{ id: ids[Math.floor(hasard() * ids.length)], patch: { x: hasard() * 900 } }])
      else if (q < 0.95) t.supprimer(vue, [ids[Math.floor(hasard() * ids.length)]])
      else t.changerFond(vue, hasard() < 0.5 ? 'seyes' : 'repere', { x: 3, y: 4 })
      await attendre(hasard() < 0.03 ? 25 * MINUTE : 200 + Math.floor(hasard() * 4000))
    }
    return t
  }

  it('chaque portion : le compte est le total de la bande, chaque image se lit, et la revue n\'écrit rien', async () => {
    for (const graine of [3, 11, 29]) {
      const t = await auHasard(160, graine)
      const r = revue(t)
      expect(r.lecture.copies).toBe(true)
      let transactions = 0
      t.doc.on('afterTransaction', () => { transactions++ })
      const pages = [...new Set(r.lecture.film.map(e => e.page))]
      const portions: Portion[] = pages.map(page => ({ genre: 'page', page }))
      for (const s of r.seances) {
        portions.push({ genre: 'seance', seance: s, page: null })
        for (const page of pages) if (seanceTouche(r.lecture, s, page)) portions.push({ genre: 'seance', seance: s, page })
      }
      for (const p of portions) {
        const b = r.bande(p)
        expect(b?.total ?? 0, JSON.stringify(p)).toBe(compterGestes(r.lecture, p))
        b?.images.forEach((img, k) => {
          expect(r.planches.lire(img)).toBeTruthy()
          if (k) r.planches.neuves(b.images[k - 1], r.planches.apparues(b.images[k - 1], img))
        })
        // Toute l'histoire d'une page finit sur la page telle qu'elle est (ou, jetée, telle qu'on l'a laissée)
        if (p.genre === 'page' && b) {
          const fin = r.planches.lire(b.images.at(-1)!).formes.map(f => JSON.stringify(f))
          const vraie = r.lecture.page(r.lecture.film.length - 1, p.page)!.formes.map(f => JSON.stringify(f))
          expect(fin).toEqual(vraie)
        }
      }
      expect(transactions).toBe(0)
      // (le hasard a bien fait des copies dont l'histoire hérite des gestes)
      const heritent = pages.filter(page => t.herite(page) && compterGestes(r.lecture, { genre: 'page', page }) > r.lecture.film.filter((e, i) => e.page === page && !e.seulOrdre && !r.lecture.naissance(i)).length)
      expect(heritent.length).toBeGreaterThan(0)
    }
  })

  it('le film élève de chaque séance, de chaque page publiée seule : il finit sur la page telle qu\'elle était au bout de la séance', async () => {
    for (const graine of [5, 17]) {
      const t = await auHasard(160, graine)
      const r = revue(t)
      for (const s of r.seances) {
        const pages = pagesDeLaSeance(t, s)
        // Toutes ensemble : chaque page finit telle qu'elle était au bout de la séance
        const tout = new Bobine(filmEleve(t, pages, s).film)
        for (const page of tout.film.ordre) {
          const vraie = t.pageA(t.film.get(s.a), page)
          if (vraie) expect(tout.image(tout.n - 1, page).formes.map(f => f.id)).toEqual(vraie.formes.map(f => f.id))
        }
        // Chacune seule : une copie reprend le passé de son original
        for (const page of pages) {
          const { film: f } = filmEleve(t, [page], s)
          if (!f.etapes.length) continue
          const bob = new Bobine(f)
          const vraie = r.lecture.page(s.a, page)
          if (vraie) expect(bob.image(bob.n - 1, page).formes.map(x => x.id)).toEqual(vraie.formes.map(x => x.id))
          expect(f.etapes.every(e => e.p === page)).toBe(true)
        }
      }
    }
  })
})

describe('les instruments du passé hérité', () => {
  /** Une horloge factice pour la piste : le temps n'avance que quand on le
   *  dit, les minuteurs sonnent alors dans l'ordre, et la date suit */
  class Factice implements Horloge {
    t = 0
    private minuteurs: { a: number; f: () => void; id: number }[] = []
    private n = 0
    constructor(private base: number) {}
    maintenant = () => this.t
    date = () => this.base + this.t
    plusTard = (f: () => void, ms: number) => { const id = ++this.n; this.minuteurs.push({ a: this.t + ms, f, id }); return id }
    annuler = (id: unknown) => { this.minuteurs = this.minuteurs.filter(m => m.id !== id) }
    avancer(ms: number) {
      const fin = this.t + ms
      for (;;) {
        this.minuteurs.sort((x, y) => x.a - y.a || x.id - y.id)
        const m = this.minuteurs[0]
        if (!m || m.a > fin) break
        this.minuteurs.shift()
        this.t = Math.max(this.t, m.a); horloge = this.base + this.t; vi.setSystemTime(horloge)
        m.f()
      }
      this.t = fin; horloge = this.base + this.t; vi.setSystemTime(horloge)
    }
  }

  it('la règle menée sur l\'original avant la copie se rejoue sur la copie, à la revue comme au film élève', async () => {
    const h = new Factice(horloge)
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p
    const piste = new Piste(m => t.noterPiste(m), () => t.pageVue, h)
    const ecran = new Map<string, Peint>()
    const peindre = () => piste.peinture([...ecran.values()], [])
    const avancer = async (ms: number) => { h.avancer(ms); await Promise.resolve(); await Promise.resolve() }
    /** La règle menée de x0 à x1, image par image, puis lâchée ; puis un trait */
    const regleEtTrait = async (page: string, x0: number, x1: number, id: string) => {
      for (let i = 0; i <= 20; i++) { ecran.set('regle', { nom: 'regle', etat: { x: x0 + (x1 - x0) * i / 20, y: 0, a: 0, r: 0 }, actif: 'corps' }); peindre(); await avancer(16) }
      ecran.set('regle', { nom: 'regle', etat: { x: x1, y: 0, a: 0, r: 0 }, actif: null }); peindre()
      await avancer(400)
      t.pageVue = page; t.nouveauGeste(); t.poser(page, trait(x1, 50, id))
      await avancer(800)
    }
    await avancer(30 * MINUTE)
    ecran.set('regle', { nom: 'regle', etat: { x: 0, y: 0, a: 0, r: 0 }, actif: null }); peindre()
    await avancer(500)
    await regleEtTrait(p, 0, 100, 'p1')
    t.pageVue = p
    const q = t.dupliquerPage(p)!; t.pageVue = q; peindre()
    await avancer(500)
    await regleEtTrait(q, 100, 300, 'q1')
    await avancer(5000)                                           // la piste s'écrit un peu plus tard
    expect(t.piste.length).toBeGreaterThan(0)

    // La revue : le geste hérité a sa manipulation (notée sur l'original), le geste de la copie aussi
    const r = revue(t)
    const b = r.bande({ genre: 'page', page: q })!
    expect(b.total).toBe(2)
    const gestes = b.images.map((img, k) => ({ img, k })).filter(x => x.img.geste)
    expect(gestes.map(x => r.lecture.film[x.img.e].page)).toEqual([p, q])
    for (const { k } of gestes) expect(b.manips?.[k]?.duree ?? 0).toBeGreaterThan(0)

    // Le film élève de la copie seule : la règle bouge avant chacun de ses deux gestes
    const s = seancesDuFilm(t.film.toArray())[0]
    const { film: f } = exporterDetaille(t, { de: s.de, a: s.a, pages: [q], titre: 'Séance' })
    expect(f.etapes.map(e => e.p)).toEqual([q, q])
    expect(f.etapes.every(e => (e.inst?.length ?? 0) > 0)).toBe(true)
    const bob = new Bobine(f)
    expect(bob.geste(1)?.duree ?? 0).toBeGreaterThan(0)
    expect(bob.geste(2)?.duree ?? 0).toBeGreaterThan(0)
  })
})
