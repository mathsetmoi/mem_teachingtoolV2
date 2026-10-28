// Ranger les séances depuis la bibliothèque : l'ordre choisi à la main, la
// suppression (et son annulation), le déplacement vers un autre classeur
// avec son film (et ce que Publier en lit, avant et après).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { ImageForme, Trait } from '../src/types'
import { copierSeance, retirerSeance, supprimerSeance } from '../src/deplacer-seance'
import { ordreALaMain, ordreApres, resumeDesSeances, seancesDansLOrdre } from '../src/seances'
import { exporter, pagesAPublier, seancesDuTableau } from '../src/revoir/exporter'

let horloge = new Date('2026-10-05T08:00:00').getTime()
let numero = 0
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

const JOUR = 24 * 3600_000
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
async function aller(t: number) { horloge = t; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
function trait(x: number, id: string): Trait {
  return { id, type: 'trait', x, y: 0, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}
async function geste(t: Tableau, page: string, x: number, id: string) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, id))
  await attendre(800)
}

/** Une séance à l'heure `quand` : deux pages, trois gestes (dont un effacé) */
async function seance(t: Tableau, quand: number, marque: string) {
  await aller(quand)
  const { seance: id, page: p1 } = t.nouvelleSeance()
  t.pageVue = p1
  await attendre(100)
  await geste(t, p1, 0, `${marque}1`)
  const p2 = t.ajouterPage('carreaux', t.ordre.length, { seance: id }); t.pageVue = p2
  await attendre(100)
  t.renommerPage(p2, `Exercice ${marque}`)
  await geste(t, p2, 10, `${marque}2`); await geste(t, p2, 20, `${marque}3`)
  t.pageVue = p2; t.nouveauGeste(); t.supprimer(p2, [`${marque}3`]); await attendre(800)
  return { id, pages: [p1, p2] }
}

/** Ce que Publier montre d'une séance (sans les identifiants des pages) */
function publie(t: Tableau, id: string) {
  const s = seancesDuTableau(t)!.find(x => x.id === id)!
  const pages = pagesAPublier(t, s)
  const f = exporter(t, { de: s.de, a: s.a, pages, titre: '' }, { instruments: false })
  return {
    gestes: s.gestes,
    depart: f.pages.map(p => p.formes.map(x => x.id).sort()),
    etapes: f.etapes.map(e => [e.dt, ...e.o.map(o => o[0] === '=' ? `=${o[1].id}` : o[0] === '-' ? `-${o[1]}` : o[0])]),
  }
}

describe('l\'ordre choisi à la main', () => {
  it('la plus récente en haut ; un rang remplace la date ; une séance neuve se met en haut', async () => {
    const t = new Tableau(null)
    const a = await seance(t, horloge, 'A')
    const b = await seance(t, horloge + JOUR, 'B')
    const c = await seance(t, horloge + JOUR, 'C')
    const ordre = () => seancesDansLOrdre(t.seancesDuClasseur()).map(s => s.id)
    expect(ordre()).toEqual([c.id, b.id, a.id])
    expect(ordreALaMain(t.seancesDuClasseur())).toBe(false)
    const voulu = ordreApres(ordre(), a.id, { vers: 0 })!
    expect(voulu).toEqual([a.id, c.id, b.id])
    expect(t.rangerLesSeances(voulu)).toBe(true)
    expect(ordre()).toEqual([a.id, c.id, b.id])
    expect(ordreALaMain(t.seancesDuClasseur())).toBe(true)
    expect(resumeDesSeances(t.seancesDuClasseur()).every(s => typeof s.rang === 'number')).toBe(true)
    // Le film ne bouge pas : chaque séance garde ses gestes
    expect(seancesDuTableau(t)!.map(s => s.gestes)).toEqual([4, 4, 4])
    const d = await seance(t, horloge + JOUR, 'D')
    expect(ordre()).toEqual([d.id, a.id, c.id, b.id])
    expect(ordreApres(ordre(), d.id, { pas: -1 })).toBeNull()
    expect(ordreApres(ordre(), d.id, { pas: 1 })).toEqual([a.id, d.id, c.id, b.id])
    expect(t.rangerLesSeances(null)).toBe(true)
    expect(ordre()).toEqual([d.id, c.id, b.id, a.id])
    expect(ordreALaMain(t.seancesDuClasseur())).toBe(false)
    expect(t.rangerLesSeances(null)).toBe(false)
  })
})

describe('supprimer une séance', () => {
  it('ses pages vont dans la corbeille ; Annuler les rend, à leur place et à leur séance', async () => {
    const t = new Tableau(null)
    const a = await seance(t, horloge, 'A')
    const b = await seance(t, horloge + JOUR, 'B')
    const avant = publie(t, b.id)
    const r = supprimerSeance(t, a.id)
    expect(r).toEqual({ pages: a.pages })
    expect(t.ordre.toArray()).toEqual(b.pages)
    expect(resumeDesSeances(t.seancesDuClasseur()).map(s => s.id)).toEqual([b.id])
    expect(t.derniereSeance()!.id).toBe(b.id)
    // La page écrite est dans la corbeille (la page vide n'y paraît jamais)
    expect(t.dansLaCorbeille(a.pages[0])).toBe(true)
    // L'autre séance n'a pas changé
    expect(publie(t, b.id)).toEqual(avant)
    expect(t.rendrePages(a.pages)).toBe(2)
    expect(t.ordre.toArray()).toEqual([...a.pages, ...b.pages])
    expect(t.pagesDeLaSeance(a.id)).toEqual(a.pages)
  })
  it('ne vide jamais un classeur', async () => {
    const t = new Tableau(null)
    const a = await seance(t, horloge, 'A')
    expect(supprimerSeance(t, a.id)).toEqual({ refus: 'seule' })
    expect(supprimerSeance(t, 'rien')).toEqual({ refus: 'absente' })
    expect(t.ordre.toArray()).toEqual(a.pages)
  })
})

describe('déplacer une séance vers un autre classeur', () => {
  it('à sa date, au milieu des séances de l\'autre, avec son film ; les autres séances ne changent pas', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a1 = await seance(A, lundi, 'A')
    const a2 = await seance(A, lundi + 2 * JOUR, 'M')
    const b1 = await seance(B, lundi + JOUR, 'B')
    const b2 = await seance(B, lundi + 3 * JOUR, 'C')
    const pubA2 = publie(A, a2.id), pubB1 = publie(B, b1.id), pubB2 = publie(B, b2.id)

    // Comme la bibliothèque : le classeur d'arrivée lu dans un document qui ne vit nulle part
    const C = new Tableau(null)
    C.lireEtat(Y.encodeStateAsUpdate(B.doc))
    const r = copierSeance(A, a2.id, C)
    if ('refus' in r) throw new Error(r.refus)
    expect(r.seance).toBe(a2.id)
    expect(r.pages).toHaveLength(2)
    expect(r.pages.some(p => a2.pages.includes(p))).toBe(false)
    await attendre(10)

    // Ses séances : dans l'ordre des dates, chacune avec ses pages
    expect(C.seancesDuClasseur().map(s => s.id)).toEqual([b1.id, a2.id, b2.id])
    expect(C.pagesDeLaSeance(a2.id)).toEqual(r.pages)
    expect(C.nomDe(r.pages[1])).toBe('Exercice M')
    expect([...C.formesDe(r.pages[1])!.keys()]).toEqual(['M2'])
    expect(C.ordre.toArray()).toEqual([...b1.pages, ...r.pages, ...b2.pages])
    // Le film se lit toujours dans l'ordre des heures
    const t = C.film.toArray().map(e => e.t)
    expect([...t].sort((x, y) => x - y)).toEqual(t)
    // Publier : la séance arrivée montre la même chose, les autres n'ont pas bougé
    expect(publie(C, a2.id)).toEqual(pubA2)
    expect(publie(C, b1.id)).toEqual(pubB1)
    expect(publie(C, b2.id)).toEqual(pubB2)

    // Le classeur ouvert reçoit ce qui a changé (comme l'onglet du classeur)
    B.lireEtat(Y.encodeStateAsUpdate(C.doc, Y.encodeStateVector(B.doc)))
    expect(B.seancesDuClasseur().map(s => s.id)).toEqual([b1.id, a2.id, b2.id])
    expect(publie(B, a2.id)).toEqual(pubA2)
    expect(publie(B, b2.id)).toEqual(pubB2)

    // Le classeur d'origine : la séance n'y est plus, même dans sa corbeille
    const pubA1 = publie(A, a1.id)
    expect(retirerSeance(A, a2.id)).toEqual({ pages: a2.pages })
    expect(resumeDesSeances(A.seancesDuClasseur()).map(s => s.id)).toEqual([a1.id])
    expect(a2.pages.some(p => A.dansLaCorbeille(p))).toBe(false)
    expect(publie(A, a1.id)).toEqual(pubA1)
    // Annuler : elle revient
    expect(A.rendrePages(a2.pages)).toBe(2)
    expect(A.pagesDeLaSeance(a2.id)).toEqual(a2.pages)
  })

  it('au bout (plus récente que tout) ou en tête (plus ancienne que tout)', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a1 = await seance(A, lundi, 'A')
    const a2 = await seance(A, lundi + 4 * JOUR, 'Z')
    const b1 = await seance(B, lundi + JOUR, 'B')
    const pub1 = publie(A, a1.id), pub2 = publie(A, a2.id), pubB = publie(B, b1.id)
    for (const s of [a1, a2]) {
      // Un document neuf à chaque fois, comme la bibliothèque
      const C = new Tableau(null)
      C.lireEtat(Y.encodeStateAsUpdate(B.doc))
      expect(() => copierSeance(A, s.id, B)).toThrow()
      const r = copierSeance(A, s.id, C)
      if ('refus' in r) throw new Error(r.refus)
      await attendre(10)
      B.lireEtat(Y.encodeStateAsUpdate(C.doc, Y.encodeStateVector(B.doc)))
    }
    expect(B.seancesDuClasseur().map(s => s.id)).toEqual([a1.id, b1.id, a2.id])
    expect(publie(B, a1.id)).toEqual(pub1)
    expect(publie(B, a2.id)).toEqual(pub2)
    expect(publie(B, b1.id)).toEqual(pubB)
    expect(B.derniereSeance()!.id).toBe(a2.id)
  })

  it('après ce que l\'autre classeur a fait après coup (une page jetée) : accepté, et son film reste entier', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a = await seance(A, lundi + 2 * JOUR, 'M')
    const b = await seance(B, lundi, 'B')
    await aller(lundi + 6 * JOUR)
    B.pageVue = b.pages[0]
    expect(B.jeterPages([b.pages[1]])).toEqual([b.pages[1]])
    await attendre(10)
    const pub = publie(A, a.id), pubB = publie(B, b.id)
    const C = new Tableau(null)
    C.lireEtat(Y.encodeStateAsUpdate(B.doc))
    const r = copierSeance(A, a.id, C)
    if ('refus' in r) throw new Error(r.refus)
    await attendre(10)
    expect(C.seancesDuClasseur().map(s => s.id)).toEqual([b.id, a.id])
    expect(publie(C, a.id)).toEqual(pub)
    // La page jetée après coup est maintenant dans la plage de la séance
    // arrivée (le film se partage par les heures) : celle d'avant perd
    // seulement le pas vide qu'elle faisait au bout de son replay
    const apresB = publie(C, b.id)
    expect(apresB).toEqual({ ...pubB, etapes: pubB.etapes.filter(x => x.length > 1) })
    const t = C.film.toArray().map(e => e.t)
    expect([...t].sort((x, y) => x - y)).toEqual(t)
    // Au bout de son film, ses pages sont toujours là
    const fin = C.etatA(C.film.get(C.film.length - 1))
    expect(r.pages.every(p => fin.ordre.includes(p))).toBe(true)
  })

  it('avec les images qu\'elle montre : la banque de l\'autre classeur les reçoit', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a = await seance(A, lundi, 'A')
    const donnees = 'data:image/png;base64,iVBORw0KGgo='
    const p = a.pages[0]
    A.pageVue = p; A.nouveauGeste()
    A.doc.getMap('images').set('photo', donnees)
    const im: ImageForme = { id: 'I1', type: 'image', src: 'photo', l: 40, h: 20, m: [1, 0, 0, 1], x: 0, y: 0, z: numero++, auteur: 'moi' }
    A.poser(p, im)
    await attendre(800)
    await seance(B, lundi + JOUR, 'B')
    const C = new Tableau(null)
    C.lireEtat(Y.encodeStateAsUpdate(B.doc))
    const r = copierSeance(A, a.id, C)
    if ('refus' in r) throw new Error(r.refus)
    const arrivee = C.formesDe(r.pages[0])!.get('I1') as ImageForme
    expect(C.doc.getMap('images').get(arrivee.src)).toBe(donnees)
  })

  it('une séance déjà passée par ce classeur puis supprimée y revient : la nouvelle copie remplace l\'ancienne', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a = await seance(A, lundi, 'A')
    await seance(B, lundi + 3 * JOUR, 'B')
    const pubA = publie(A, a.id)
    // Une première fois, puis supprimée dans le classeur d'arrivée (ses pages à la corbeille)
    const C = new Tableau(null); C.lireEtat(Y.encodeStateAsUpdate(B.doc))
    const r1 = copierSeance(A, a.id, C)
    if ('refus' in r1) throw new Error(r1.refus)
    await attendre(10)
    expect(supprimerSeance(C, r1.seance)).toEqual({ pages: r1.pages })
    const filmApres1 = C.film.length
    // De nouveau : acceptée (avant, elle croisait sa propre trace)
    const D = new Tableau(null); D.lireEtat(Y.encodeStateAsUpdate(C.doc))
    const r2 = copierSeance(A, a.id, D)
    if ('refus' in r2) throw new Error(r2.refus)
    await attendre(10)
    const vues = D.seancesDuClasseur().filter(x => x.debut === D.seances.get(r2.seance)!.debut)
    expect(vues.map(x => x.id)).toEqual([r2.seance])
    expect(D.pagesDeLaSeance(r2.seance)).toEqual(r2.pages)
    // Le film n'a pas de doublon, il reste dans l'ordre des heures
    expect(D.film.length).toBe(filmApres1)
    const t = D.film.toArray().map(e => e.t)
    expect([...t].sort((x, y) => x - y)).toEqual(t)
    expect(publie(D, r2.seance)).toEqual(pubA)
    // Les pages de l'ancienne copie ne sont plus à remettre
    expect(r1.pages.map(p => D.corbeille.get(p)?.definitif)).toEqual([true, true])
  })

  it('refuse une séance qui croise une séance de l\'autre classeur', async () => {
    const lundi = new Date('2026-10-12T08:00:00').getTime()
    const A = new Tableau(null), B = new Tableau(null)
    const a = await seance(A, lundi, 'A')
    await seance(B, lundi + 1000, 'B')
    const C = new Tableau(null)
    C.lireEtat(Y.encodeStateAsUpdate(B.doc))
    const film = C.film.length
    expect(copierSeance(A, a.id, C)).toEqual({ refus: 'chevauche' })
    expect(C.film.length).toBe(film)
    expect(copierSeance(A, 'rien', C)).toEqual({ refus: 'absente' })
  })
})
