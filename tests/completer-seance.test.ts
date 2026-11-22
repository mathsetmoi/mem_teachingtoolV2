// Compléter une séance passée (lot 28) : la séance de lundi, rouverte
// vendredi soir, reçoit une page oubliée et une rectification ; tant qu'on
// la complète, c'est elle où l'on écrit. Dans son replay, le complément
// vient après le cours, derrière un chapitre « Complément du … », sans la
// semaine de silence ; la séance de vendredi, dont la plage du film contient
// ces gestes, ne les compte pas.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { titreComplement } from '../src/seances'
import { PAUSE_COMPLEMENT, exporter, pagesAPublier, seancesAPublier, seancesDuTableau } from '../src/revoir/exporter'

const LUNDI = new Date('2026-11-09T08:05:00').getTime()
let horloge = LUNDI
let numero = 0
beforeEach(() => { horloge = LUNDI; vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
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

/** Lundi : une page écrite ; vendredi : une autre séance, une page écrite ;
 *  vendredi soir, on complète lundi : un trait de plus sur sa page, et une
 *  page oubliée */
async function lundiVendrediPuisComplement() {
  const t = new Tableau(null)
  const l1 = t.ajouterPage('blanc', 0); await attendre(100)
  t.migrerSeances()
  const lundi = t.derniereSeance()!.id
  await geste(t, l1, 0, 'COURS')
  await attendre(4 * 24 * 3600_000)
  const { seance: vendredi, page: v1 } = t.nouvelleSeance()
  await attendre(100)
  await geste(t, v1, 0, 'VENDREDI')
  await attendre(10 * 3600_000)
  const debutComplement = Date.now()
  const ok = t.completerSeance(lundi)
  await attendre(100)
  await geste(t, l1, 100, 'RECTIF')
  const l2 = t.ajouterPage('blanc', t.ordre.toArray().indexOf(l1) + 1)
  await attendre(100)
  await geste(t, l2, 0, 'OUBLI')
  return { t, l1, l2, v1, lundi, vendredi, ok, debutComplement }
}

describe('compléter une séance passée', () => {
  it('pendant qu\'on la complète, c\'est elle où l\'on écrit, et sa fiche note l\'heure', async () => {
    const { t, lundi, vendredi, l1, l2, ok, debutComplement } = await lundiVendrediPuisComplement()
    expect(ok).toBe(true)
    expect(t.derniereSeance()!.id).toBe(lundi)
    expect(t.seanceDuJour()!.id).toBe(vendredi)
    // La page ajoutée est à lundi
    expect(t.pagesDeLaSeance(lundi)).toEqual([l1, l2])
    expect(t.seancesDuClasseur().find(s => s.id === lundi)!.complements).toEqual([debutComplement])
    t.seanceEnComplement = null
    expect(t.derniereSeance()!.id).toBe(vendredi)
  })
  it('la séance du jour, une séance inconnue : rien', async () => {
    const { t, vendredi } = await lundiVendrediPuisComplement()
    t.seanceEnComplement = null
    expect(t.completerSeance(vendredi)).toBe(false)
    expect(t.completerSeance('inconnue')).toBe(false)
    expect(t.seanceEnComplement).toBeNull()
  })
  it('le film : lundi compte ses compléments, vendredi ne les compte pas', async () => {
    const { t, lundi, vendredi, l1, l2, v1 } = await lundiVendrediPuisComplement()
    const l = seancesDuTableau(t)!
    const lu = l.find(s => s.id === lundi)!, ve = l.find(s => s.id === vendredi)!
    expect(lu.gestes).toBe(3)
    expect(lu.pages).toEqual([l1, l2])
    expect(lu.a).toBeGreaterThan(lu.aCours)
    expect(ve.gestes).toBe(1)
    expect(ve.pages).toEqual([v1])
    expect(pagesAPublier(t, lu)).toEqual([l1, l2])
    expect(pagesAPublier(t, ve)).toEqual([v1])
    expect(seancesAPublier(t).map(s => (s as { id: string }).id)).toEqual([vendredi, lundi])
  })
  it('le replay de lundi : le cours, puis le complément sous son chapitre, sans la semaine de silence', async () => {
    const { t, lundi, l1, l2, debutComplement } = await lundiVendrediPuisComplement()
    const lu = seancesDuTableau(t)!.find(s => s.id === lundi)!
    const f = exporter(t, { de: lu.de, a: lu.a, pages: pagesAPublier(t, lu), titre: 'Lundi' }, { instruments: false })
    expect(f.etapes.map(e => e.p)).toEqual([l1, l1, l2])
    expect(f.etapes[1].dt).toBeLessThanOrEqual(PAUSE_COMPLEMENT)
    expect(f.ordre).toEqual([l1, l2])
    expect(f.chapitres.map(c => c.titre)).toEqual(['Page 1', `${titreComplement(debutComplement)} · Page 1`, 'Page 2'])
    expect(titreComplement(debutComplement)).toBe('Complément du 13 novembre')
  })
  it('le replay de vendredi ne change pas', async () => {
    const { t, vendredi, v1 } = await lundiVendrediPuisComplement()
    const ve = seancesDuTableau(t)!.find(s => s.id === vendredi)!
    const f = exporter(t, { de: ve.de, a: ve.a, pages: pagesAPublier(t, ve), titre: 'Vendredi' }, { instruments: false })
    expect(f.etapes.map(e => e.p)).toEqual([v1])
    expect(f.chapitres.map(c => c.titre)).toEqual(['La séance'])
  })
  it('un second complément, un autre jour, a son propre chapitre', async () => {
    const { t, lundi, l1, debutComplement } = await lundiVendrediPuisComplement()
    t.seanceEnComplement = null
    await attendre(2 * 24 * 3600_000)
    const second = Date.now()
    expect(t.completerSeance(lundi)).toBe(true)
    await geste(t, l1, 200, 'ENCORE')
    const lu = seancesDuTableau(t)!.find(s => s.id === lundi)!
    expect(lu.gestes).toBe(4)
    const f = exporter(t, { de: lu.de, a: lu.a, pages: pagesAPublier(t, lu), titre: 'Lundi' }, { instruments: false })
    const titres = f.chapitres.map(c => c.titre)
    expect(titres).toContain(`${titreComplement(debutComplement)} · Page 1`)
    expect(titres).toContain(`${titreComplement(second)} · Page 1`)
    expect(f.etapes[f.etapes.length - 1].dt).toBeLessThanOrEqual(PAUSE_COMPLEMENT)
  })
})

describe('envoyer une page vers une autre séance, ou un autre classeur', () => {
  it('vers une séance passée : une copie sans histoire, qui paraît dans le complément', async () => {
    const { t, lundi, vendredi, v1 } = await lundiVendrediPuisComplement()
    t.seanceEnComplement = null
    await attendre(60_000)
    expect(t.estPassee(lundi)).toBe(true)
    expect(t.estPassee(vendredi)).toBe(false)
    t.noterComplement(lundi)
    const q = t.dupliquerPage(v1, { position: t.placeDansLaSeance(lundi), seance: lundi, memeNom: true, sansHistoire: true })!
    await attendre(800)
    expect(t.herite(q)).toBeNull()
    expect(t.pagesDeLaSeance(lundi)[2]).toBe(q)
    const lu = seancesDuTableau(t)!.find(s => s.id === lundi)!
    expect(pagesAPublier(t, lu)).toContain(q)
    const f = exporter(t, { de: lu.de, a: lu.a, pages: pagesAPublier(t, lu), titre: 'Lundi' }, { instruments: false })
    expect(f.etapes[f.etapes.length - 1].p).toBe(q)
    // Vendredi garde sa page et son replay
    const ve = seancesDuTableau(t)!.find(s => s.id === vendredi)!
    expect(pagesAPublier(t, ve)).toEqual([v1])
  })
  it('vers un autre classeur : la page, son nom et ses images arrivent, une image homonyme est renommée', async () => {
    const { t, l1 } = await lundiVendrediPuisComplement()
    t.doc.getMap('images').set('IMG', 'data:image/png;base64,AAA')
    t.poser(l1, { id: 'I1', type: 'image', x: 0, y: 0, z: 99, l: 10, h: 10, src: 'IMG' } as never)
    t.renommerPage(l1, 'Démonstration')
    const d = t.donneesDePage(l1)!
    expect(d.images).toEqual({ IMG: 'data:image/png;base64,AAA' })
    const autre = new Tableau(null)
    const a1 = autre.ajouterPage('blanc', 0)
    autre.migrerSeances()
    autre.doc.getMap('images').set('IMG', 'data:image/png;base64,BBB')
    const s = autre.derniereSeance()!.id
    const q = autre.importerPage(d, { position: autre.placeDansLaSeance(s), seance: s })
    expect(autre.pagesDeLaSeance(s)).toEqual([a1, q])
    const image = [...autre.formesDe(q)!.values()].find(f => f.type === 'image') as { src: string }
    expect(image.src).not.toBe('IMG')
    expect(autre.doc.getMap('images').get(image.src)).toBe('data:image/png;base64,AAA')
    expect(autre.doc.getMap('images').get('IMG')).toBe('data:image/png;base64,BBB')
    expect(autre.formesDe(q)!.size).toBe(t.formesDe(l1)!.size)
  })
})
