// Vérification « données et replay » du lot 3 : une copie de page entre deux
// cours compte-t-elle comme un geste dans le découpage en séances ?
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import { seancesDuFilm, exporter, pagesDeLaSeance } from '../../../../../../src/revoir/exporter'
import { lectureDe } from '../../../../../../src/revue/planches'
import { compterGestes } from '../../../../../../src/revue/bande'

const MINUTE = 60_000
let horloge = new Date('2026-10-09T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
const trait = (id: string) => ({ id, type: 'trait' as const, x: 0, y: 0, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false })
async function geste(t: Tableau, p: string, id: string) { t.pageVue = p; t.nouveauGeste(); t.poser(p, trait(id)); await attendre(60_000) }

async function deuxCours(entre: (t: Tableau, p: string) => Promise<void>) {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(30 * MINUTE)
  for (let k = 0; k < 5; k++) await geste(t, p, 'c1-' + k)       // premier cours, fini à 8 h 35
  await attendre(14 * MINUTE)
  await entre(t, p)                                              // 8 h 50 : on range
  await attendre(15 * MINUTE)
  for (let k = 0; k < 5; k++) await geste(t, p, 'c2-' + k)       // second cours, dès 9 h 05
  return { t, p }
}
describe('le découpage en séances', () => {
  it('rien entre deux cours séparés de 30 minutes : deux séances', async () => {
    const { t } = await deuxCours(async () => {})
    expect(seancesDuFilm(t.film.toArray()).map(s => s.gestes)).toEqual([5, 5])
  })
  it('une page ajoutée entre les deux : toujours deux séances (sa naissance n\'est pas un geste, contrôle final)', async () => {
    const { t } = await deuxCours(async (t, p) => { const q = t.ajouterPage('carreaux', 1); void q; void p; await attendre(1000) })
    console.log('une page ajoutée entre les deux :', JSON.stringify(seancesDuFilm(t.film.toArray()).map(s => s.gestes)))
    expect(seancesDuFilm(t.film.toArray()).map(s => s.gestes)).toEqual([5, 5])
  })
  it('une copie de page entre les deux cours', async () => {
    const { t, p } = await deuxCours(async (t, p) => { t.pageVue = p; const q = t.dupliquerPage(p)!; t.pageVue = p; void q; await attendre(1000) })
    const s = seancesDuFilm(t.film.toArray())
    const l = lectureDe(t, () => t.ordre.toArray())
    console.log('une copie entre les deux cours : séances', JSON.stringify(s.map(x => ({ gestes: x.gestes, de: new Date(x.debut).toTimeString().slice(0, 5), a: new Date(x.fin).toTimeString().slice(0, 5) }))), 'gestes de la revue', JSON.stringify(s.map(x => compterGestes(l, { genre: 'seance', seance: x, page: null }))))
    expect(s.length, 'deux cours séparés de 30 minutes').toBe(2)
  })
  it('une copie après le cours : pas de séance de plus (correction « données »), la plus récente est le cours', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(30 * MINUTE)
    for (let k = 0; k < 5; k++) await geste(t, p, 'c-' + k)
    await attendre(2 * 60 * MINUTE)
    t.pageVue = p; t.dupliquerPage(p); await attendre(1000)
    const s = seancesDuFilm(t.film.toArray())
    const l = lectureDe(t, () => t.ordre.toArray())
    const f = exporter(t, { de: s[0].de, a: s[0].a, pages: pagesDeLaSeance(t, s[0]), titre: '' }, { instruments: false })
    console.log('la plus récente :', JSON.stringify({ gestes: s[0].gestes, revue: compterGestes(l, { genre: 'seance', seance: s[0], page: null }), etapesDuFilm: f.etapes.length, pagesDuFilm: f.pages.map(x => x.formes.length) }))
    expect(s.map(x => x.gestes)).toEqual([5])
    expect(compterGestes(l, { genre: 'seance', seance: s[0], page: null })).toBe(5)
    expect(f.etapes.length).toBe(5)
  })
})
