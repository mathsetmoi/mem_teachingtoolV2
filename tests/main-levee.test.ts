// Le rythme de la main : le temps de chaque point d'un trait, noté au
// tableau, porté par le film élève, et rejoué tel quel par le lecteur des
// élèves et par la revue. Ce qui n'a pas de temps (un film déjà publié, un
// trait recopié, une figure) se rejoue exactement comme avant.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import { Immobilite } from '../src/formes'
import type { P } from '../src/formes'
import type { Cercle, Polygone, Trait } from '../src/types'
import { exporter, seancesDuFilm } from '../src/revoir/exporter'
import { ecrireFilm, lireFilm } from '../src/revoir/format'
import type { FilmEleve } from '../src/revoir/format'
import { Bobine } from '../src/revoir/bobine'
import { MS_MAX, dureesDuTrace, leve, lireTemps, main, pointsPoses, tempsDesPoints, traitEnCours } from '../src/revoir/main-levee'
import { COUDE, PLANCHER, tasser } from '../src/revoir/rythme'
import { ENTREE, construireBande, departs, echeances, horlogeAuDepart, indiceAuTemps } from '../src/revue/bande'
import { Planches, lectureDe } from '../src/revue/planches'

const MINUTE = 60_000
let horloge = new Date('2026-10-07T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

function trait(x: number, y: number, n = 6): Trait {
  const pts: number[] = []
  for (let i = 0; i < n; i++) pts.push(Math.round(i * 33.3) / 10, Math.round(Math.sin(i) * 77.7) / 10, 0.51)
  return { id: 'T' + numero++, type: 'trait', x, y, z: Date.now(), auteur: 'appareil-du-prof', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: true }
}
/** Des temps de main plausibles : 4 à 9 ms par point, une pause au milieu, le lever */
function rythme(n: number, graine = 1): number[] {
  const r: number[] = []
  for (let i = 0; i < n; i++) r.push(i === n - 1 ? 12 : i === (n >> 1) ? 110 : 4 + ((i * 7 + graine) % 6))
  return r
}
const somme = (a: number[]) => a.reduce((x, y) => x + y, 0)

async function nouveauTableau() {
  const t = new Tableau(null)
  const page = t.ajouterPage('carreaux', 0)
  t.pageVue = page
  await attendre(1000)
  return { t, page }
}

/** Le film élève de toute la séance (après la création de la page) */
async function filmEleve(t: Tableau, pages: string[]): Promise<FilmEleve> {
  const film = t.film.toArray()
  return lireFilm(await ecrireFilm(exporter(t, { de: 1, a: film.length - 1, pages, titre: 'Écriture' })))
}

describe('le format : le temps de chaque point', () => {
  it('un entier par point, jusqu\'au lever, sans erreur qui s\'accumule', () => {
    expect(tempsDesPoints([0, 4.2, 8.4, 12.6], 20)).toEqual([4, 4, 5, 7])
    // 240 Hz pendant 2 s : la somme est la durée, à l'arrondi près, et non 480 arrondis
    const instants = Array.from({ length: 480 }, (_, i) => 1000 + i * 1000 / 240)
    const ms = tempsDesPoints(instants, 1000 + 2000.4)
    expect(ms).toHaveLength(480)
    expect(somme(ms)).toBe(2000)
    expect(ms.every(v => v === 4 || v === 5)).toBe(true)
    // Une heure qui recule ou qui manque ne vaut rien ; un arrêt démesuré est borné
    expect(tempsDesPoints([0, 10, 5, 20], 30)).toEqual([10, 0, 10, 10])
    expect(tempsDesPoints([0, NaN, 20], 25)).toEqual([0, 20, 5])
    expect(tempsDesPoints([0, 1e9], 1e9 + 3)).toEqual([MS_MAX, 3])
    expect(tempsDesPoints([7], 7)).toEqual([0])                        // un point, levé aussitôt
  })

  it('ne relit que des entiers bornés, un par point', () => {
    expect(lireTemps([4, 5, 0, MS_MAX])).toEqual([4, 5, 0, MS_MAX])
    expect(lireTemps([4, 5, 6], 3)).toEqual([4, 5, 6])
    for (const mauvais of [undefined, null, 'abc', {}, [], [4, 5], [4, -1, 3], [4, 5.5, 3], [4, MS_MAX + 1, 3], [4, '5', 3], [4, NaN, 3]]) {
      expect(lireTemps(mauvais, 3)).toBeNull()
    }
    expect(dureesDuTrace([10, 20, 5000, 30])).toEqual({ vecue: 5060, duree: 60 + tasser(5000) })
    expect(dureesDuTrace('rien')).toBeNull()
  })

  it('à chaque instant, exactement les points arrivés : aucun d\'avance, aucun inventé', () => {
    const t = trait(100, 50, 9)
    const ms = [5, 5, 40, 5, 300, 5, 5, 2000, 16]
    const m = main(t, ms)!
    expect(m.instants).toEqual([0, 5, 10, 50, 55, 355, 360, 365, 365 + tasser(2000)])
    expect(m.vecue).toBe(somme(ms))
    expect(m.duree).toBe(381 + tasser(2000))                           // le long arrêt stylo posé est tassé
    for (let tau = 0; tau <= m.duree + 50; tau += 0.5) {
      const n = pointsPoses(m, tau)
      expect(n).toBe(m.instants.filter(x => x <= tau).length)
      const enCours = traitEnCours(m, n)
      expect(enCours.pts).toHaveLength(3 * n)
    }
    // Le trait en cours est le trait lui-même, en coordonnées du monde, comme au tableau
    const tout = traitEnCours(m, 9)
    expect(tout.pts).toEqual(t.pts.map((v, i) => i % 3 === 0 ? t.x + v : i % 3 === 1 ? t.y + v : v))
    expect({ ...tout, pts: [] }).toEqual({ pts: [], couleur: t.couleur, taille: t.taille, opacite: t.opacite, pression: t.pression })
    // Des temps qui ne vont pas avec ce trait : il paraîtra comme avant
    expect(main(t, ms.slice(1))).toBeNull()
    expect(main({ ...t, pts: 'x' as unknown as number[] }, ms)).toBeNull()
  })

  it('le temps stylo levé : l\'écart moins le tracé, sans plancher, tassé s\'il est long', () => {
    expect(leve(1000, { vecue: 175 })).toBe(825)
    expect(leve(180, { vecue: 175 })).toBe(5)                          // la main s'est relevée aussitôt
    expect(leve(100, { vecue: 175 })).toBe(0)                          // deux mains à la fois : jamais négatif
    expect(leve(NaN, { vecue: 175 })).toBe(0)
    expect(leve(20_000, { vecue: 175 })).toBe(tasser(19_825))
    expect(leve(COUDE + 175, { vecue: 175 })).toBe(COUDE)
  })
})

describe('au tableau : l\'étape du trait note son rythme', () => {
  it('le trait tracé à la main, et lui seul', async () => {
    const { t, page } = await nouveauTableau()
    const a = trait(0, 0), ms = rythme(6)
    t.nouveauGeste(); t.poserTrace(page, a, ms); await attendre(1000)
    t.nouveauGeste(); t.poser(page, trait(9, 9)); await attendre(1000)                       // posé autrement (une copie)
    t.nouveauGeste(); t.modifier(page, [{ id: a.id, patch: { x: 50 } }]); await attendre(1000)
    t.nouveauGeste(); t.poserTrace(page, trait(5, 5, 4), rythme(6)); await attendre(1000)    // des temps qui ne vont pas
    t.annulation.undo(); await attendre(1000)
    t.annulation.redo(); await attendre(1000)
    const film = t.film.toArray()
    expect(film.map(e => e.ms ?? null)).toEqual([null, ms, null, null, null, null, null])
    // Le trait lui-même reste un trait comme les autres
    expect(Object.keys(t.formesDe(page)!.get(a.id)!)).not.toContain('ms')
  })
})

describe('au tableau : le point qui a attendu un double-clic', () => {
  it('son étape garde l\'heure de son lever, pas celle où il est enfin posé', async () => {
    const { t, page } = await nouveauTableau()
    const leve = Date.now()
    await attendre(300)                                                  // l'attente du double-clic
    const a = trait(0, 0, 1), ms = [12]
    t.nouveauGeste(); t.poserTrace(page, a, ms, leve); await attendre(1000)
    t.nouveauGeste(); t.poserTrace(page, trait(5, 5, 3), rythme(3)); await attendre(1000)    // sans heure : celle où il est posé
    const film = t.film.toArray()
    expect(film[1].t).toBe(leve)
    expect(film[1].ms).toEqual(ms)
    expect(film[2].t).toBe(leve + 1300)
  })

  it('jamais avant l\'étape qui le précède dans le film', async () => {
    const { t, page } = await nouveauTableau()
    const leve = Date.now()
    await attendre(200)
    t.nouveauGeste(); t.poser(page, trait(9, 9)); await attendre(100)   // posée entre le lever et l'échéance
    t.nouveauGeste(); t.poserTrace(page, trait(0, 0, 1), [12], leve); await attendre(1000)
    const film = t.film.toArray()
    expect(film[2].t).toBe(film[1].t)
    expect(film[2].t).toBe(leve + 200)
  })
})

describe('au tableau : le stylet immobile', () => {
  /** Ce que fait le tableau de chaque point du stylet : il ignore ceux à moins
   *  de 0,6 px d'écran du dernier gardé, et relance la minuterie « stylo
   *  immobile » (550 ms) quand la plume a bougé. Rend le plus long temps passé
   *  sans relance : à 550 ms, le trait est coupé et validé « maintenu ». */
  function plusLongArret(points: (P & { t: number })[], zoom = 1): number {
    const im = new Immobilite(points[0])
    let dernier: P = points[0], relance = points[0].t, max = 0
    for (const p of points.slice(1)) {
      if (Math.hypot(p.x - dernier.x, p.y - dernier.y) * zoom < 0.6) continue
      dernier = p
      if (im.bouge(p, zoom)) { max = Math.max(max, p.t - relance); relance = p.t }
    }
    return Math.max(max, points[points.length - 1].t - relance)
  }
  /** Une vague lente de 1,5 s, à `vitesse` px d'écran par seconde, échantillonnée à `hz` */
  function vague(vitesse: number, hz: number, zoom = 1) {
    const r: (P & { t: number })[] = []
    for (let t = 0; t <= 1500; t += 1000 / hz) r.push({ t, x: 100 + vitesse * t / 1000 / zoom, y: 100 + 10 * Math.sin(t / 150) / zoom })
    return r
  }

  it('une plume lente mais continue n\'est jamais immobile, quelle que soit la fréquence du stylet', () => {
    for (const hz of [60, 125, 200, 240, 480]) {
      for (const vitesse of [30, 120, 250, 350]) {
        for (const zoom of [0.5, 1, 2]) expect(plusLongArret(vague(vitesse, hz, zoom), zoom), `${vitesse} px/s à ${hz} Hz, zoom ${zoom}`).toBeLessThan(150)
      }
    }
  })

  it('la main posée qui tremble à peine est immobile, à toutes les fréquences', () => {
    let s = 7
    const hasard = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5 }
    for (const hz of [60, 125, 240]) {
      const pts: (P & { t: number })[] = []
      for (let t = 0; t <= 1000; t += 1000 / hz) pts.push({ t, x: 300 + hasard(), y: 300 + hasard() })      // ±0,5 px
      expect(plusLongArret(pts)).toBeGreaterThanOrEqual(1000 - 1000 / hz)
    }
  })
})

describe('le film élève emporte le rythme, et rien de plus', () => {
  it('les temps survivent à l\'export et au fichier, avec le seul geste qui a tracé le trait', async () => {
    const { t, page } = await nouveauTableau()
    const autre = t.ajouterPage('blanc', 1); await attendre(1000)
    t.pageVue = page
    const avant = trait(0, 0, 8)
    t.poserTrace(page, avant, rythme(8, 3)); await attendre(30 * MINUTE)             // la séance d'avant
    const debut = t.film.length
    const a = trait(10, 10, 7), b = trait(20, 20, 5), c = trait(30, 30, 6)
    const msA = rythme(7, 1), msB = rythme(5, 2)
    t.nouveauGeste(); t.poserTrace(page, a, msA); await attendre(700)
    t.nouveauGeste(); t.poserTrace(page, b, msB); await attendre(700)
    t.nouveauGeste(); t.modifier(page, [{ id: a.id, patch: { couleur: '#d0342c' } }]); await attendre(700)
    t.pageVue = autre
    t.nouveauGeste(); t.poserTrace(autre, c, rythme(6, 4)); await attendre(700)      // une page qu'on ne publie pas
    t.pageVue = page
    t.nouveauGeste(); t.supprimer(page, [b.id]); await attendre(700)
    t.annulation.undo(); await attendre(700)                                        // b revient, sans rythme
    const film = t.film.toArray()
    const r = exporter(t, { de: debut, a: film.length - 1, pages: [page], titre: 'x' })
    expect(r.etapes.map(e => e.ms ?? null)).toEqual([msA, msB, null, null, null])
    // Le fichier publié les garde tels quels
    const relu = await lireFilm(await ecrireFilm(r))
    expect(relu).toEqual(r)
    expect(relu.etapes[0].ms).toEqual(msA)
    // Rien d'autre : ni l'auteur, ni le rythme d'un trait d'avant la séance ou d'une autre page,
    // ni des temps rangés dans les formes elles-mêmes
    const texte = JSON.stringify(relu)
    expect(texte).not.toContain('appareil-du-prof')
    expect(texte).not.toContain('"brut"')
    expect(texte.match(/"ms":/g)).toHaveLength(2)
    expect(JSON.stringify(relu.pages)).not.toContain('"ms"')
    expect(relu.pages[0].formes.map(f => f.id)).toEqual([avant.id])
    expect(texte).not.toContain(c.id)
    for (const e of relu.etapes) for (const o of e.o) if (o[0] === '=') expect(Object.keys(o[1])).not.toContain('ms')
  })
})

describe('le lecteur des élèves : le rythme de la main', () => {
  it('l\'attente est le temps stylo levé, puis le trait s\'écrit à la vitesse de la main', async () => {
    const { t, page } = await nouveauTableau()
    const a = trait(0, 0), b = trait(40, 0), c = trait(80, 0, 5)
    const msA = [10, 20, 30, 40, 50, 25], msB = [8, 8, 9, 8, 8, 14], msC = [5, 5, 6000, 5, 9]
    t.poserTrace(page, a, msA); await attendre(1000)
    t.poserTrace(page, b, msB); await attendre(9000)
    t.poserTrace(page, c, msC); await attendre(1000)
    const bo = new Bobine(await filmEleve(t, [page]))
    expect(bo.n).toBe(4)
    expect(bo.main(1)!.trait.id).toBe(a.id)
    // Le premier geste : pas de silence d'avant, le trait commence aussitôt
    expect(bo.attente(1)).toBe(0)
    expect(bo.trace(1)).toBe(175)
    // 1000 ms entre deux levers, dont 55 à tracer b : 945 ms stylo levé, puis 55 ms de tracé
    expect(bo.attente(2)).toBe(1000 - somme(msB))
    expect(bo.trace(2)).toBe(somme(msB))
    expect(bo.delai(2)).toBe(1000)
    // Un long silence se tasse ; un long arrêt stylo posé aussi
    expect(bo.attente(3)).toBe(tasser(9000 - somme(msC)))
    expect(bo.trace(3)).toBe(24 + tasser(6000))
    expect(bo.temps).toEqual([0, 175, 1175, 1175 + bo.delai(3)])
  })

  it('la figure reconnue au lever remplace le trait aussitôt, sans se redessiner', async () => {
    const { t, page } = await nouveauTableau()
    const brut = trait(0, 0, 12), ms = rythme(12)
    t.nouveauGeste(); t.poserTrace(page, brut, ms); await attendre(5)
    const carre: Polygone = { id: 'R' + numero++, type: 'polygone', x: 0, y: 0, z: Date.now(), auteur: 'a', pts: [0, 0, 80, 0, 80, 60, 0, 60], ferme: true, couleur: '#1b2230', taille: 3 }
    t.nouveauGeste(); t.doc.transact(() => { t.supprimer(page, [brut.id]); t.poser(page, carre) }, 'locale'); await attendre(2000)
    t.nouveauGeste(); t.poser(page, { ...carre, id: 'R' + numero++, x: 200 }); await attendre(1000)   // une figure tracée aux instruments
    const bo = new Bobine(await filmEleve(t, [page]))
    expect(bo.main(1)?.trait.id).toBe(brut.id)
    expect(bo.reconnue(2)).toBe(true)
    expect(bo.attente(2)).toBe(5)
    expect(bo.reconnue(3)).toBe(false)
    expect(bo.attente(3)).toBe(tasser(2000))
  })

  it('des temps abîmés ou absents : le trait paraît comme avant', async () => {
    const { t, page } = await nouveauTableau()
    for (let i = 0; i < 4; i++) { t.poserTrace(page, trait(i * 10, 0), rythme(6, i)); await attendre(600 + i * 400) }
    const film = await filmEleve(t, [page])
    film.etapes[0].ms = [1, 2, 3]                       // pas autant que de points
    film.etapes[1].ms = [1, 2, 3, -4, 5, 6]
    film.etapes[2].ms = 'abc' as unknown as number[]
    delete film.etapes[3].ms
    const bo = new Bobine(film)
    for (let k = 1; k < bo.n; k++) {
      expect(bo.main(k)).toBeNull()
      expect(bo.trace(k)).toBe(0)
      expect(bo.delai(k)).toBe(tasser(film.etapes[k - 1].dt))
    }
  })

  it('un fichier .mem publié avant ce rythme se rejoue exactement comme avant', async () => {
    const texte = readFileSync(join(__dirname, 'donnees', 'seance-sans-temps.mem'), 'utf8')
    const film = await lireFilm(texte)
    const bo = new Bobine(film)
    expect(bo.n).toBe(17)
    let temps = 0
    for (let k = 1; k < bo.n; k++) {
      expect(bo.main(k)).toBeNull()
      expect(bo.reconnue(k)).toBe(false)
      expect(bo.delai(k)).toBe(tasser(film.etapes[k - 1].dt))
      temps += tasser(film.etapes[k - 1].dt)
      expect(bo.temps[k]).toBe(temps)
    }
    expect(bo.attente(1)).toBe(PLANCHER)
  })
})

describe('la revue : le rythme de la main', () => {
  it('chaque trait s\'écrit à la fin de son attente, après le vrai temps stylo levé', async () => {
    const { t, page } = await nouveauTableau()
    const ms = [rythme(6, 1), rythme(6, 2), [5, 5, 5, 5, 5, 1500], rythme(6, 4)]
    const ecarts = [0, 700, 2500, 9000]
    for (let i = 0; i < 4; i++) { await attendre(ecarts[i]); t.poserTrace(page, trait(i * 30, 0), ms[i]) }
    await attendre(1000)
    t.poser(page, trait(200, 0)); await attendre(1000)                 // un trait sans rythme (posé autrement)
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page }, seances, p => p)!
    expect(b.images.map(i => i.geste)).toEqual([false, true, true, true, true, true])
    const traces = ms.map(m => dureesDuTrace(m)!.duree)
    expect(Array.from(b.traces)).toEqual([0, ...traces, 0])
    expect(traces[2]).toBe(25 + tasser(1500))                             // la main restée posée 1,5 s : tassé
    expect(b.attentes[1]).toBe(ENTREE + traces[0])
    expect(b.attentes[2]).toBe(700)                                      // stylo levé 700 − tracé, puis le tracé
    expect(b.attentes[3]).toBe(2500 - somme(ms[2]) + traces[2])
    expect(b.attentes[4]).toBe(tasser(9000 - somme(ms[3])) + somme(ms[3]))
    expect(b.attentes[5]).toBe(tasser(1000))
    expect(b.images.slice(1, 5).map(i => i.main)).toEqual(b.images.slice(1, 5).map(i => i.e))
    expect(b.images[5].main).toBeUndefined()
    // Le pas suit le temps stylo levé : 2,5 s entre deux levers, mais 1 s seulement stylo levé
    expect(b.bornes).not.toContain(2)
    for (const f of [0.5, 1, 3, 10]) {
      const ech = echeances(b, f), dep = departs(b, ech, f)
      for (let k = 1; k < ech.length; k++) {
        expect(dep[k]).toBeCloseTo(ech[k] - b.traces[k] / f)
        expect(dep[k]).toBeGreaterThanOrEqual(ech[k - 1])
      }
    }
  })

  it('relancée pendant qu\'un trait s\'écrit, la lecture le finit jusqu\'au lever, puis attend le vrai temps stylo levé', async () => {
    const { t, page } = await nouveauTableau()
    // Un long mot cursif (2,4 s d'écriture), puis, 214 ms stylo levé plus tard, la barre du t
    const long = Array.from({ length: 300 }, (_, i) => i === 299 ? 14 : 8), barre = rythme(6)
    t.poserTrace(page, trait(0, 0, 300), long); await attendre(214 + somme(barre))
    t.poserTrace(page, trait(90, 0), barre); await attendre(1000)
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page }, seances, p => p)!
    expect(b.traces[1]).toBe(somme(long))
    const fin = b.images.length - 1
    for (const f of [0.5, 1, 3]) {
      const ech = echeances(b, f), dep = departs(b, ech, f)
      // Maj+→ a amené le mot ; on relance quand il lui reste 2 s à s'écrire
      const reste = 2000 / f, h = horlogeAuDepart(ech, dep, 1, reste, 100)
      expect(indiceAuTemps(dep, h + reste - 1, 1, fin)).toBe(1)          // la barre attend la fin du mot…
      expect(dep[2] - h).toBeCloseTo(reste + 214 / f)                      // … et le temps stylo levé
      // Rien qui s'écrit : la suite vient tout de suite, comme avant
      expect(dep[2] - horlogeAuDepart(ech, dep, 1, 0, 100)).toBeLessThanOrEqual(100)
      expect(horlogeAuDepart(ech, dep, 1, 0, 100)).toBeGreaterThanOrEqual(ech[1])
    }
  })

  it('la figure reconnue : le trait s\'écrit, puis la figure paraît, en un seul geste', async () => {
    const { t, page } = await nouveauTableau()
    await attendre(500)
    const brut = trait(0, 0, 10), ms = rythme(10)
    t.nouveauGeste(); t.poserTrace(page, brut, ms); await attendre(5)
    const carre: Polygone = { id: 'R' + numero++, type: 'polygone', x: 0, y: 0, z: Date.now(), auteur: 'a', pts: [0, 0, 80, 0, 80, 60, 0, 60], ferme: true, couleur: '#1b2230', taille: 3 }
    t.nouveauGeste(); t.doc.transact(() => { t.supprimer(page, [brut.id]); t.poser(page, carre) }, 'locale'); await attendre(1000)
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page }, seances, p => p)!
    expect(b.total).toBe(1)
    const img = b.images[1]
    expect(lecture.film[img.main!].ms).toEqual(ms)                      // le trait, à l'étape d'avant la figure
    expect(img.main).toBe(img.e - 1)
    expect(b.traces[1]).toBe(somme(ms))
    expect(lecture.page(img.main!, page)!.formes.map(f => f.id)).toEqual([brut.id])
    expect(lecture.page(img.e, page)!.formes.map(f => f.id)).toEqual([carre.id])
  })

  it('un tableau sans rythme noté : la bande est la même qu\'avant', async () => {
    const { t, page } = await nouveauTableau()
    const ecarts = [300, 900, 2500, 40_000, 100, 700]
    for (const e of ecarts) { t.poser(page, trait(0, 0)); await attendre(e) }
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    for (const s of seances) {
      const b = construireBande(lecture, { genre: 'seance', seance: s, page }, seances, p => p)!
      expect(Array.from(b.traces).every(v => v === 0)).toBe(true)
      expect(b.images.every(i => i.main === undefined)).toBe(true)
      const ech = echeances(b, 1)
      expect(Array.from(departs(b, ech, 1))).toEqual(Array.from(ech))
      for (let k = 1; k < b.images.length; k++) {
        if (!b.images[k].geste || b.images[k - 1].geste === false) continue
        expect(b.attentes[k]).toBe(tasser(lecture.film[b.images[k].e].t - lecture.film[b.images[k - 1].e].t))
      }
    }
  })
})

describe('ce qui revient revient d\'un coup, comme au tableau', () => {
  /** « x », un grand O que le tableau reconnaît comme un cercle, Ctrl+Z pour garder
   *  le tracé à main levée, puis la barre d'un t, retirée par Ctrl+Z et rendue par Ctrl+Y */
  async function lettresRendues() {
    const { t, page } = await nouveauTableau()
    const x = trait(0, 0), o = trait(40, 0, 12), barre = trait(90, 0)
    t.nouveauGeste(); t.poserTrace(page, x, rythme(6)); await attendre(600)
    t.nouveauGeste(); t.poserTrace(page, o, rythme(12)); await attendre(5)
    const cercle: Cercle = { id: 'C' + numero++, type: 'cercle', x: 50, y: 0, r: 20, z: Date.now(), auteur: 'a', couleur: '#1b2230', taille: 3 }
    t.nouveauGeste(); t.doc.transact(() => { t.supprimer(page, [o.id]); t.poser(page, cercle) }, 'locale'); await attendre(700)
    t.nouveauGeste(); t.annulation.undo(); await attendre(800)
    t.nouveauGeste(); t.poserTrace(page, barre, rythme(6)); await attendre(500)
    t.nouveauGeste(); t.annulation.undo(); await attendre(400)
    t.nouveauGeste(); t.annulation.redo(); await attendre(1000)
    return { t, page, ids: { x: x.id, o: o.id, cercle: cercle.id, barre: barre.id } }
  }

  it('le lecteur des élèves : seul ce qui naît se dessine', async () => {
    const { t, page, ids } = await lettresRendues()
    const bo = new Bobine(await filmEleve(t, [page]))
    expect(bo.n).toBe(8)
    const nouvelles = Array.from({ length: bo.n }, (_, k) => bo.nouvelles(k).map(f => f.id))
    const ajoutees = Array.from({ length: bo.n }, (_, k) => [...bo.ajoutees(k)])
    expect(nouvelles).toEqual([[], [ids.x], [ids.o], [ids.cercle], [ids.o], [ids.barre], [], [ids.barre]])
    // Le O rendu par Ctrl+Z et la barre rendue par Ctrl+Y reviennent tels quels, sans se redessiner
    expect(ajoutees).toEqual([[], [ids.x], [ids.o], [ids.cercle], [], [ids.barre], [], []])
    expect([1, 2, 5].map(k => bo.main(k)?.trait.id)).toEqual([ids.x, ids.o, ids.barre])
    expect(bo.main(4)).toBeNull()
    expect(bo.main(7)).toBeNull()
  })

  it('la revue : seul ce qui naît se dessine', async () => {
    const { t, page, ids } = await lettresRendues()
    const lecture = lectureDe(t, () => t.ordre.toArray())
    const seances = seancesDuFilm(lecture.film)
    const b = construireBande(lecture, { genre: 'seance', seance: seances[0], page }, seances, p => p)!
    const pl = new Planches(lecture)
    const apparues = b.images.slice(1).map((img, j) => pl.apparues(b.images[j], img))
    // Le O et sa figure ne font qu'un geste (le trait s'écrit, puis la figure paraît)
    expect(apparues.map(a => a.map(f => f.id))).toEqual([[ids.x], [ids.cercle], [ids.o], [ids.barre], [], [ids.barre]])
    expect(apparues.map((a, j) => pl.neuves(b.images[j], a).map(f => f.id))).toEqual([[ids.x], [ids.cercle], [], [ids.barre], [], []])
    expect(b.images.map(i => i.main !== undefined)).toEqual([false, true, true, false, true, false, false])
  })
})
