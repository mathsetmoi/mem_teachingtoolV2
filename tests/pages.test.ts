// Supprimer une page sans question, et la rendre (« Annuler » ou Ctrl+Z).
// Jeter une page la retire de l'ordre, et rien d'autre : sa Y.Map reste dans
// le document, intacte (mêmes formes, même pile), et la rendre la remet à sa
// place sans rien recopier. Le film note ces étapes « seulOrdre » : ni la
// revue, ni les séances, ni le film élève n'y voient un geste ; la page rendue
// ne se redessine pas au replay.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { exporterDetaille, seancesDuFilm } from '../src/revoir/exporter'
import type { Portion } from '../src/revue/bande'
import { compterGestes, construireBande, seancesDeLaPage } from '../src/revue/bande'
import { lectureDe } from '../src/revue/planches'

const MINUTE = 60_000
let horloge = new Date('2026-10-07T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Pose une forme en son propre geste, sur la page qu'on regarde */
async function geste(t: Tableau, page: string, x = 0, y = 0, id?: string) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, y, id))
  await attendre(800)
}

/** Un tableau de n pages, sans enregistrement, en regardant la première */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  t.pageVue = pages[0]
  return { t, pages }
}

/** Comme l'application : on va sur la voisine, puis on jette la page */
async function jeter(t: Tableau, id: string, depuis: string) {
  t.pageVue = depuis
  const ok = t.jeterPage(id, depuis)
  await attendre(500)
  return ok
}

/** Comme l'application après « Annuler » ou Ctrl+Z : on regarde la page rendue */
async function rendre(t: Tableau, id: string) {
  const k = t.rendrePage(id)
  if (k >= 0) t.pageVue = id
  await attendre(500)
  return k
}

const ids = (t: Tableau, page: string) => [...t.formesDe(page)!.keys()].sort()

describe('jeter une page, la rendre', () => {
  it('la page quitte l\'ordre et revient à sa place : même Y.Map, mêmes formes, même fond, même origine', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, b, 0, 0, 'b1'); await geste(t, b, 10, 10, 'b2')
    t.changerFond(b, 'repere', { x: 30, y: 40 }); await attendre(500)
    const carte = t.pages.get(b)!, formes = t.formesDe(b)!, b1 = formes.get('b1')
    const pile = t.annulationDe(b)!
    expect(await jeter(t, b, a)).toBe(true)
    expect(t.ordre.toArray()).toEqual([a, c])
    expect(t.pages.get(b)).toBe(carte)                         // rien n'est effacé
    expect(ids(t, b)).toEqual(['b1', 'b2'])
    expect(await rendre(t, b)).toBe(1)
    expect(t.ordre.toArray()).toEqual([a, b, c])
    expect(t.pages.get(b)).toBe(carte)
    expect(t.formesDe(b)).toBe(formes)
    expect(t.formesDe(b)!.get('b1')).toBe(b1)                   // la même forme, pas une copie
    expect(t.fondDe(b)).toBe('repere')
    expect(t.origineDe(b)).toEqual({ x: 30, y: 40 })
    // Sa pile marche encore : la même, avec ses gestes d'avant
    expect(t.annulationDe(b)).toBe(pile)
    await geste(t, b, 20, 20, 'b3')
    expect(t.annuler(b)).toEqual({})
    expect(ids(t, b)).toEqual(['b1', 'b2'])
    expect(t.annuler(b)).toEqual({})                           // le fond n'est pas dans la pile
    expect(ids(t, b)).toEqual(['b1'])
  })

  it('refuse la dernière page, une page hors de l\'ordre, un départ absent ou égal ; rendre ce qui est là ne fait rien', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    const film = t.film.length
    expect(t.jeterPage(a, a)).toBe(false)
    expect(t.jeterPage(a, 'inconnue')).toBe(false)
    expect(t.jeterPage('inconnue', a)).toBe(false)
    expect(await jeter(t, b, a)).toBe(true)
    expect(t.jeterPage(b, a)).toBe(false)                      // déjà jetée
    expect(t.jeterPage(a, b)).toBe(false)                      // b n'est plus dans l'ordre
    const seule = new Tableau(null); await seule.charger()
    expect(seule.jeterPage(seule.ordre.get(0), seule.ordre.get(0))).toBe(false)
    expect(seule.ordre.length).toBe(1)
    expect(t.rendrePage(a)).toBe(-1)
    expect(t.rendrePage('inconnue')).toBe(-1)
    expect(await rendre(t, b)).toBe(1)
    expect(t.rendrePage(b)).toBe(-1)                           // « Annuler » après Ctrl+Z : rien
    await attendre(100)
    expect(t.film.length).toBe(film + 2)                        // le jet et le retour, rien d'autre
    // Une page effacée par l'ancienne suppression ne revient pas
    const c = t.ajouterPage('blanc', 2); await attendre(100)
    t.supprimerPage(c); await attendre(100)
    expect(t.rendrePage(c)).toBe(-1)
  })
})

describe('Ctrl+Z sur la page où l\'on arrive', () => {
  it('rend la page jetée, même sans aucun geste sur cette page ; Ctrl+Y ne la rejette pas', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, b, 0, 0, 'b1')
    expect(t.peutAnnuler(a)).toBe(false)
    await jeter(t, b, a)
    expect(t.peutAnnuler(a)).toBe(true)                        // ↶ s'allume sur la page d'arrivée
    expect(t.annuler(a)).toEqual({ page: b })
    expect(t.ordre.toArray()).toEqual([a, b, c])
    expect(ids(t, b)).toEqual(['b1'])
    expect(t.peutAnnuler(a)).toBe(false)
    expect(t.retablir(a)).toBe(false)
    expect(t.ordre.toArray()).toEqual([a, b, c])
  })

  it('un trait écrit après le jet part d\'abord, puis la page revient, puis les gestes d\'avant', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, a, 0, 0, 'a1')
    await geste(t, b, 0, 0, 'b1')
    await jeter(t, b, a)
    await geste(t, a, 5, 5, 'a2')
    expect(t.annuler(a)).toEqual({})
    expect(ids(t, a)).toEqual(['a1'])
    expect(t.ordre.toArray()).toEqual([a])
    expect(t.annuler(a)).toEqual({ page: b })
    expect(t.ordre.toArray()).toEqual([a, b])
    expect(t.annuler(a)).toEqual({})
    expect(ids(t, a)).toEqual([])
    expect(t.annuler(a)).toBeNull()
    // Ctrl+Y refait les gestes de a, jamais le jet
    expect(t.retablir(a)).toBe(true); expect(t.retablir(a)).toBe(true)
    expect(ids(t, a)).toEqual(['a1', 'a2'])
    expect(t.ordre.toArray()).toEqual([a, b])
  })

  it('deux pages jetées de suite : deux Ctrl+Z les rendent dans l\'ordre inverse, chacune à sa place', async () => {
    const { t, pages: [p1, p2, p3] } = await tableau(3)
    // Sur la page 2 : on la jette, on arrive sur la 1 ; on jette la 1, on arrive sur l'ancienne 3
    await jeter(t, p2, p1)
    await jeter(t, p1, p3)
    expect(t.ordre.toArray()).toEqual([p3])
    expect(t.annuler(p3)).toEqual({ page: p1 })
    expect(t.ordre.toArray()).toEqual([p1, p3])
    t.pageVue = p1
    expect(t.annuler(p1)).toEqual({ page: p2 })
    expect(t.ordre.toArray()).toEqual([p1, p2, p3])
  })

  it('rendue après des pages ajoutées : juste après sa voisine d\'avant ; sa voisine partie, à sa place d\'alors', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await jeter(t, b, a)
    const d = t.ajouterPage('blanc', 1); await attendre(100)
    expect(t.ordre.toArray()).toEqual([a, d, c])
    expect(await rendre(t, b)).toBe(1)
    expect(t.ordre.toArray()).toEqual([a, b, d, c])
    // La voisine d'avant jetée elle aussi : la page reprend sa place d'alors
    await jeter(t, c, d)
    await jeter(t, d, b)
    expect(t.ordre.toArray()).toEqual([a, b])
    expect(await rendre(t, c)).toBe(2)                         // d, sa voisine, n'est pas là : index 3, borné
    expect(t.ordre.toArray()).toEqual([a, b, c])
    // Le bouton a rendu c : Ctrl+Z sur d ne la cherche plus ; sur b, il rend d
    expect(t.peutAnnuler(d)).toBe(false)
    expect(t.annuler(b)).toEqual({ page: d })
    expect(t.ordre.toArray()).toEqual([a, b, d, c])
  })

  it('jamais un changement invisible : une page jetée depuis A ne revient que par Ctrl+Z sur A', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await geste(t, c, 0, 0, 'c1')
    await jeter(t, b, a)
    expect(t.peutAnnuler(c)).toBe(true)
    expect(t.annuler(c)).toEqual({})                           // le trait de c, pas la page b
    expect(t.ordre.toArray()).toEqual([a, c])
    expect(t.peutAnnuler(c)).toBe(false)
  })
})

describe('le film : jeter ou rendre une page ne change que l\'ordre', () => {
  it('les deux étapes sont marquées seulOrdre, notées sur la page d\'arrivée puis sur la page rendue', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, b, 0, 0)
    const film = () => t.film.toArray()
    expect(film().some(e => e.seulOrdre)).toBe(false)          // ni une création, ni un geste
    await jeter(t, b, a)
    expect(film().at(-1)).toMatchObject({ page: a, seulOrdre: true })
    await rendre(t, b)
    expect(film().at(-1)).toMatchObject({ page: b, seulOrdre: true })
    // L'ancienne suppression efface la page : ce n'est pas seulement l'ordre
    t.supprimerPage(b); await attendre(100)
    expect(film().at(-1)!.seulOrdre).toBeUndefined()
    // Un instantané pris après le jet lit encore la page jetée
    expect(t.pageA(film()[film().length - 3], b)!.formes).toHaveLength(1)
  })
})

/** Ce que la revue et la fenêtre Publier comptent : les gestes de chaque
 *  portion, et les séances (gestes, pages) */
function comptes(t: Tableau) {
  const lecture = lectureDe(t, () => t.ordre.toArray())
  const seances = seancesDuFilm(lecture.film)
  const nommer = (p: string) => { const i = t.ordre.toArray().indexOf(p); return i < 0 ? 'Page jetée' : `Page ${i + 1}` }
  const pages = [...new Set(lecture.film.map(e => e.page))]
  const portions: Portion[] = []
  for (const s of seances) {
    portions.push({ genre: 'seance', seance: s, page: null })
    for (const p of s.pages) portions.push({ genre: 'seance', seance: s, page: p })
  }
  for (const p of pages) portions.push({ genre: 'page', page: p })
  return {
    seances: seances.map(s => ({ gestes: s.gestes, pages: s.pages, debut: s.debut, fin: s.fin })),
    gestes: portions.map(p => compterGestes(lecture, p)),
    totaux: portions.map(p => construireBande(lecture, p, seances, nommer)?.total ?? 0),
    seancesDesPages: pages.map(p => seancesDeLaPage(lecture, seances, p).length),
  }
}

describe('la revue et les séances après un jet suivi d\'un retour', () => {
  it('les mêmes gestes, les mêmes séances, les mêmes pages', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    for (let i = 0; i < 3; i++) await geste(t, a, i * 10, 0)
    for (let i = 0; i < 2; i++) await geste(t, b, i * 10, 50)
    const avant = comptes(t)
    // Sur la page 2 : on la jette (on arrive sur la 1), puis Ctrl+Z la rend
    await jeter(t, b, a)
    await attendre(3000)
    t.pageVue = a
    expect(t.annuler(a)).toEqual({ page: b }); t.pageVue = b
    await attendre(500)
    const apres = comptes(t)
    expect(apres).toEqual(avant)
    // On écrit encore sur la page rendue : un geste de plus, sur elle
    await geste(t, b, 99, 99)
    const ensuite = comptes(t)
    expect(ensuite.seances[0].gestes).toBe(avant.seances[0].gestes + 1)
    expect(ensuite.seances[0].fin).toBe(t.film.toArray().at(-1)!.t)
  })

  it('une étape seulOrdre ne coupe pas une séance, n\'en ouvre pas, et n\'y ajoute pas de page', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await attendre(30 * MINUTE)
    await geste(t, a)
    await attendre(15 * MINUTE)
    await jeter(t, c, b)                                        // noté sur b, seul l'ordre change
    await attendre(15 * MINUTE)
    await geste(t, a)
    // 30 minutes entre les deux gestes : deux séances (le jet ne fait pas le pont)
    let s = seancesDuFilm(t.film.toArray())
    expect(s).toHaveLength(3)                                   // la création des pages, puis deux séances
    expect(s.slice(0, 2).map(x => [x.gestes, x.pages])).toEqual([[1, [a]], [1, [a]]])
    // Dans une séance, la page rendue n'est pas une page de la séance
    await attendre(MINUTE)
    await rendre(t, c)
    await attendre(MINUTE)
    await geste(t, a)
    s = seancesDuFilm(t.film.toArray())
    expect(s).toHaveLength(3)
    expect([s[0].gestes, s[0].pages]).toEqual([2, [a]])
    // Le lendemain, on ne fait que jeter une page : pas de séance
    await attendre(24 * 60 * MINUTE)
    await jeter(t, c, a)
    expect(seancesDuFilm(t.film.toArray())).toHaveLength(3)
  })
})

/** Le film élève d'une séance, ses pages nommées par leur rang dans l'ordre
 *  final (les identifiants des pages diffèrent d'un tableau à l'autre) */
function filmEleve(t: Tableau, jusquAuBout = false) {
  const film = t.film.toArray()
  const s = seancesDuFilm(film)[0]
  const pages = [...new Set(film.map(e => e.page))]
  const { film: f } = exporterDetaille(t, { de: s.de, a: jusquAuBout ? film.length - 1 : s.a, pages, titre: 'Séance' }, { instruments: false })
  const nom = (p: string) => `p${pages.indexOf(p)}`
  return {
    etapes: f.etapes.map(e => ({ dt: e.dt, p: nom(e.p), o: e.o })),
    pages: f.pages.map(p => ({ ...p, id: nom(p.id) })),
    ordre: f.ordre.map(nom),
    chapitres: f.chapitres,
  }
}

describe('le film élève', () => {
  /** La même séance, avec ou sans un jet suivi d'un retour au milieu */
  async function seance(jeterEtRendre: boolean) {
    numero = 0
    const { t, pages: [a, b] } = await tableau(2)
    await attendre(30 * MINUTE)
    await geste(t, a, 0, 0); await geste(t, a, 10, 0)
    await geste(t, b, 0, 50); await geste(t, b, 10, 50)
    if (jeterEtRendre) {
      // Sur la page 2, qu'on montrait : on la jette (on arrive sur la 1), puis « Annuler »
      await jeter(t, b, a); await attendre(2000)
      await rendre(t, b)
    } else { t.pageVue = a; await attendre(500); await attendre(2000); t.pageVue = b; await attendre(500) }
    await geste(t, b, 20, 50); await geste(t, a, 20, 0)
    return t
  }

  it('après un jet suivi d\'un retour : les mêmes gestes, aux mêmes moments ; la page rendue ne se redessine pas', async () => {
    const sans = filmEleve(await seance(false))
    const avec = filmEleve(await seance(true))
    expect(avec).toEqual(sans)
    // Chaque geste ne pose que son trait : la page rendue ne se redessine
    // pas, et le replay ne l'a jamais quittée (pas de pas vide)
    expect(avec.etapes.map(e => [e.p, e.o.length])).toEqual([['p0', 1], ['p0', 1], ['p1', 1], ['p1', 1], ['p1', 1], ['p0', 1]])
  })

  it('après un jet sans retour : le replay suit le professeur sur la page où il arrive', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await attendre(30 * MINUTE)
    await geste(t, a, 0, 0)
    await geste(t, b, 0, 50)
    await jeter(t, b, a); await attendre(3000)
    // La séance finit à son dernier geste : le jet qui le suit n'en est pas un
    let f = filmEleve(t)
    expect(f.etapes.map(e => [e.p, e.o.length])).toEqual([['p0', 1], ['p1', 1]])
    // Exporté jusqu'au bout du film, le replay suit le professeur à la fin
    f = filmEleve(t, true)
    expect(f.etapes.map(e => [e.p, e.o.length])).toEqual([['p0', 1], ['p1', 1], ['p0', 0]])
    await geste(t, a, 10, 0)
    f = filmEleve(t)
    expect(f.etapes.map(e => [e.p, e.o.length])).toEqual([['p0', 1], ['p1', 1], ['p0', 0], ['p0', 1]])
    // Le pas vide prend l'attente d'avant le jet ; le geste suivant, celle d'après
    expect(f.etapes[2].dt).toBe(800)
    expect(f.etapes[3].dt).toBe(500 + 3000)
  })

  it('une page jetée reste lisible dans tout instantané : la revue montre son histoire', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, b, 0, 0, 'x1')
    await jeter(t, b, a)
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const n = lecture.film.length
    expect(lecture.page(n - 1, b)!.formes.map(f => f.id)).toEqual(['x1'])
    expect(compterGestes(lecture, { genre: 'page', page: b })).toBe(1)
    void Y
  })
})
