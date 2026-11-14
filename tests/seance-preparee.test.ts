// Les séances préparées à l'avance (lot 25) : la séance à venir, rangée à
// la date du cours, qui n'est pas la séance du jour ; la préparation, qui
// écrit dans elle ; le début du cours, après lequel ce qui a été préparé est
// le décor (déjà là au départ du film élève, sans être rejoué), et une
// retouche du décor pendant le cours, qui est filmée (le choix du
// professeur, A).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { libelleAVenir, resumeDesSeances, seanceAVenirDuMoment, seanceDuJourDe, seancesAVenir } from '../src/seances'
import { exporter, pagesAPublier, seancesAPublier, seancesDuTableau } from '../src/revoir/exporter'

let horloge = new Date('2026-11-13T10:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
function trait(x: number, y: number, id = 'T' + numero++): Trait {
  return { id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
async function geste(t: Tableau, page: string, x = 0, id?: string) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, 0, id))
  await attendre(800)
}

/** Vendredi 10 h : une séance avec une page écrite ; puis, le soir, la
 *  séance de lundi 8 h 05 préparée, avec un énoncé et un titre */
async function vendrediPuisLundiPrepare() {
  const t = new Tableau(null)
  const v1 = t.ajouterPage('blanc', 0); await attendre(100)
  t.migrerSeances()
  const vendredi = t.derniereSeance()!.id
  await geste(t, v1, 0, 'V1')
  await attendre(8 * 3600_000)
  const lundiPrevu = new Date('2026-11-16T08:05:00').getTime()
  const { seance: lundi, page: l1 } = t.preparerSeance(lundiPrevu, { nom: 'Fractions : additionner' })
  t.seanceEnPreparation = lundi
  t.pageVue = l1
  await attendre(100)
  await geste(t, l1, 0, 'ENONCE'); await geste(t, l1, 100, 'TITRE')
  return { t, v1, vendredi, lundi, l1, lundiPrevu }
}

describe('la séance à venir', () => {
  it('porte la date du cours, se range à sa date, et n\'est pas la séance du jour', async () => {
    const { t, vendredi, lundi, lundiPrevu } = await vendrediPuisLundiPrepare()
    const l = t.seancesDuClasseur()
    expect(l.map(s => s.id)).toEqual([vendredi, lundi])
    expect(l[1]).toMatchObject({ debut: lundiPrevu, aVenir: true, nom: 'Fractions : additionner' })
    expect(t.seanceDuJour()!.id).toBe(vendredi)
    // Pendant qu'on la prépare, c'est elle où l'on écrit
    expect(t.derniereSeance()!.id).toBe(lundi)
    t.seanceEnPreparation = null
    expect(t.derniereSeance()!.id).toBe(vendredi)
  })
  it('une page ajoutée pendant la préparation est à elle', async () => {
    const { t, lundi, l1 } = await vendrediPuisLundiPrepare()
    const l2 = t.ajouterPage('blanc', t.ordre.toArray().indexOf(l1) + 1)
    expect(t.pagesDeLaSeance(lundi)).toEqual([l1, l2])
  })
  it('la bibliothèque la sait à venir (champ facultatif)', async () => {
    const { t } = await vendrediPuisLundiPrepare()
    const r = resumeDesSeances(t.seancesDuClasseur())
    expect(r[0].aVenir).toBeUndefined()
    expect(r[1].aVenir).toBe(true)
  })
  it('Publier ne la propose pas, et vendredi ne compte pas ses gestes', async () => {
    const { t, vendredi } = await vendrediPuisLundiPrepare()
    expect(seancesAPublier(t).map(x => (x as { id: string }).id)).toEqual([vendredi])
    const v = seancesDuTableau(t)!.find(s => s.id === vendredi)!
    expect(v.gestes).toBe(1)
    expect(v.pages).toHaveLength(1)
  })
  it('change de date ; « Bonjour ! » la propose le jour du cours, ou après si le cours n\'a pas eu lieu', async () => {
    const { t, lundi, lundiPrevu } = await vendrediPuisLundiPrepare()
    const l = t.seancesDuClasseur()
    expect(seanceAVenirDuMoment(l, new Date('2026-11-15T20:00:00').getTime())).toBeNull()
    expect(seanceAVenirDuMoment(l, new Date('2026-11-16T07:58:00').getTime())!.id).toBe(lundi)
    expect(seanceAVenirDuMoment(l, new Date('2026-11-17T08:00:00').getTime())!.id).toBe(lundi)
    expect(libelleAVenir(l[1], new Date('2026-11-17T08:00:00').getTime())).toBe('À venir, date passée · Fractions : additionner')
    const jeudi = new Date('2026-11-19T08:05:00').getTime()
    expect(t.changerDateSeance(lundi, jeudi)).toBe(true)
    expect(t.changerDateSeance(lundi, jeudi)).toBe(false)
    expect(seancesAVenir(t.seancesDuClasseur())[0].debut).toBe(jeudi)
    expect(lundiPrevu).not.toBe(jeudi)
  })
})

describe('le début du cours', () => {
  it('elle devient la séance du jour, qui commence à cet instant', async () => {
    const { t, lundi } = await vendrediPuisLundiPrepare()
    await attendre(60 * 3600_000)
    const t0 = Date.now()
    expect(t.commencerSeance(lundi, t0)).toBe(true)
    expect(t.commencerSeance(lundi, t0)).toBe(false)
    expect(t.seanceEnPreparation).toBeNull()
    const s = t.derniereSeance()!
    expect(s).toMatchObject({ id: lundi, debut: t0, aVenir: false, nom: 'Fractions : additionner' })
    expect(seanceDuJourDe(t.seancesDuClasseur())!.id).toBe(lundi)
  })
  it('le décor est déjà là au départ du film élève ; seul ce qu\'on écrit en classe se rejoue', async () => {
    const { t, lundi, l1, vendredi } = await vendrediPuisLundiPrepare()
    await attendre(60 * 3600_000)
    t.commencerSeance(lundi)
    await attendre(5 * 60_000)
    await geste(t, l1, 200, 'CLASSE')
    const s = seancesDuTableau(t)!.find(x => x.id === lundi)!
    const pages = pagesAPublier(t, s)
    expect(pages).toEqual([l1])
    const f = exporter(t, { de: s.de, a: s.a, pages, titre: '' }, { instruments: false })
    expect(f.pages.find(p => p.id === l1)!.formes.map(x => x.id).sort()).toEqual(['ENONCE', 'TITRE'])
    expect(f.etapes).toHaveLength(1)
    expect(f.etapes[0].o.map(o => o[0] === '=' ? o[1].id : '')).toEqual(['CLASSE'])
    // Publier propose lundi d'abord, puis vendredi
    expect(seancesAPublier(t).map(x => (x as { id: string }).id)).toEqual([lundi, vendredi])
  })
  it('une retouche du décor pendant le cours est filmée', async () => {
    const { t, lundi, l1 } = await vendrediPuisLundiPrepare()
    await attendre(60 * 3600_000)
    t.commencerSeance(lundi)
    await attendre(60_000)
    t.pageVue = l1
    t.nouveauGeste(); t.modifier(l1, [{ id: 'ENONCE', patch: { x: 300 } as never }])
    await attendre(800)
    const s = seancesDuTableau(t)!.find(x => x.id === lundi)!
    const f = exporter(t, { de: s.de, a: s.a, pages: pagesAPublier(t, s), titre: '' }, { instruments: false })
    const depart = f.pages.find(p => p.id === l1)!.formes.find(x => x.id === 'ENONCE')!
    expect(depart.x).toBe(0)
    expect(f.etapes).toHaveLength(1)
    expect(f.etapes[0].o.map(o => o[0] === '=' ? [o[1].id, o[1].x] : null)).toEqual([['ENONCE', 300]])
  })
})
