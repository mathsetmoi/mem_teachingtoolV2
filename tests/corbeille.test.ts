// La corbeille des pages, leurs noms, leur déplacement (le document seul).
// Une page supprimée garde sa Y.Map et entre dans la corbeille, une carte de
// premier niveau hors des pages : ni étape du film, ni annulation. Elle
// survit au rechargement et au fichier .memc. Remise, elle reprend sa place
// (après sa voisine d'avant, en suivant la chaîne des voisines supprimées
// avec elle) ; supprimée définitivement, elle ne revient plus par aucun
// chemin, mais son histoire reste lisible. Les noms des pages vivent dans une
// seconde carte, à côté.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { LONGUEUR_NOM, Tableau, changementsDOrdre, deplacerDans, nomPropre } from '../src/document'
import type { Trait } from '../src/types'
import { VERSION_TABLEAU, ecrireTableau, lireTableau, quandLisible } from '../src/fichier'
import { compterCorbeille, dateDeSuppression, libelleCorbeille, texteVider } from '../src/pages/corbeille'

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
async function geste(t: Tableau, page: string, x = 0, y = 0, id?: string) {
  t.pageVue = page
  t.nouveauGeste(); t.poser(page, trait(x, y, id))
  await attendre(800)
}

/** Un tableau de n pages, sans enregistrement, en regardant la première ;
 *  chaque page a un trait (une page vide n'irait pas dans la corbeille) */
async function tableau(n: number, remplies = true) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  if (remplies) for (const p of pages) await geste(t, p, 0, 0)
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

const derniere = (t: Tableau) => t.film.get(t.film.length - 1)
const piles = (t: Tableau, pages: string[]) => pages.map(p => t.annulationDe(p)!.undoStack.length)

describe('jeter, rendre : l\'entrée de la corbeille', () => {
  it('jeterPage écrit { t, apres, index } avec le retrait ; l\'étape reste seulOrdre ; rendrePage l\'efface', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    const quand = Date.now()
    expect(await jeter(t, b, a)).toBe(true)
    expect(t.corbeille.get(b)).toEqual({ t: quand, apres: a, index: 1 })
    expect(derniere(t)).toMatchObject({ page: a, seulOrdre: true })
    expect(await jeter(t, a, c)).toBe(true)
    expect(t.corbeille.get(a)).toEqual({ t: quand + 500, apres: null, index: 0 })
    t.pageVue = c
    expect(t.rendrePage(a)).toBe(0); await attendre(500)
    expect(t.corbeille.has(a)).toBe(false)
    expect(derniere(t)).toMatchObject({ page: a, seulOrdre: true })
    expect(t.ordre.toArray()).toEqual([a, c])
    expect(t.pagesDeLaCorbeille().map(x => x.id)).toEqual([b])
  })

  it('jeterPages : une transaction, jamais toutes les pages, la voisine immédiate, aucune pile touchée', async () => {
    const { t, pages } = await tableau(5)
    const [p0, p1, p2, p3, p4] = pages
    const film = t.film.length
    const avant = piles(t, pages)
    expect(t.jeterPages(pages)).toEqual([])                    // toutes : rien
    expect(t.jeterPages(['inconnue'])).toEqual([])
    expect(t.ordre.length).toBe(5)
    t.pageVue = p0
    expect(t.jeterPages([p3, p1, p2, 'inconnue'])).toEqual([p1, p2, p3])
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([p0, p4])
    expect(t.film.length).toBe(film + 1)                       // une seule étape
    expect(derniere(t)).toMatchObject({ page: p0, seulOrdre: true })
    expect(t.corbeille.get(p1)).toMatchObject({ apres: p0, index: 1 })
    expect(t.corbeille.get(p2)).toMatchObject({ apres: p1, index: 2 })   // la voisine immédiate, partie aussi
    expect(t.corbeille.get(p3)).toMatchObject({ apres: p2, index: 3 })
    expect(piles(t, pages)).toEqual(avant)
    // Sans vue : aucune marque, Ctrl+Z ne défait que le trait de p0
    expect(t.annuler(p0)).toEqual({})
    expect(t.annuler(p0)).toBeNull()
    expect(t.ordre.toArray()).toEqual([p0, p4])
  })

  it('jeterPages avec la vue : Ctrl+Z sur la page d\'arrivée rend la page qu\'on regardait, et elle seule', async () => {
    const { t, pages: [a, b, c, d] } = await tableau(4)
    // On regardait c ; la trieuse supprime b et c, l'application va sur a
    t.pageVue = a
    expect(t.jeterPages([b, c], { vue: { page: c, depuis: a } })).toEqual([b, c])
    await attendre(500)
    expect(derniere(t)).toMatchObject({ page: a, seulOrdre: true })
    expect(t.peutAnnuler(a)).toBe(true)
    // Un trait écrit après passe d'abord, puis la page revient
    await geste(t, a, 9, 9, 'apres')
    expect(t.annuler(a)).toEqual({})
    expect(t.annuler(a)).toEqual({ page: c })
    expect(t.ordre.toArray()).toEqual([a, c, d])                // après a, la voisine d'avant qui restait
    expect(t.pagesDeLaCorbeille().map(x => x.id)).toEqual([b])
    expect(t.corbeille.has(c)).toBe(false)
    // Le Ctrl+Z suivant défait le geste d'avant sur a, jamais b
    expect(t.annuler(a)).toEqual({})
    expect(t.ordre.toArray()).toEqual([a, c, d])
    // b, remise ensuite de la corbeille, reprend sa place : l'ordre d'origine
    expect(t.remettrePage(b)).toBe(1)
    expect(t.ordre.toArray()).toEqual([a, b, c, d])
    // La vue sur une page qui ne part pas : aucune marque
    t.pageVue = d
    expect(t.jeterPages([c], { vue: { page: d, depuis: d } })).toEqual([c])
    expect(t.peutAnnuler(d)).toBe(true)                         // son propre trait seulement
    expect(t.annuler(d)).toEqual({})
    expect(t.annuler(d)).toBeNull()
  })
})

describe('la corbeille', () => {
  it('pagesDeLaCorbeille : la plus récente d\'abord ; une page vide absente, nommée présente ; jetée par le lot 2 : t null ; effacée : jamais', async () => {
    const { t, pages } = await tableau(6, false)
    const [p0, p1, p2, p3, p4, p5] = pages
    await geste(t, p1); await geste(t, p3); await geste(t, p4)
    t.renommerPage(p2, 'Nommée')                               // vide mais nommée
    const tLot2 = horloge
    // Le lot 2 : la page quitte l'ordre, sans entrée de corbeille
    t.pageVue = p0
    t.doc.transact(() => t.ordre.delete(t.ordre.toArray().indexOf(p4), 1)); await attendre(500)
    expect(derniere(t).seulOrdre).toBe(true)
    await attendre(60_000)
    await jeter(t, p1, p0)
    await attendre(60_000)
    await jeter(t, p2, p0)
    await attendre(60_000)
    await jeter(t, p5, p0)                                      // vide : rien à reprendre
    // L'ancienne suppression (tableaux d'avant le lot 2) : sa Y.Map s'en va
    t.supprimerPage(p3); await attendre(500)
    const l = t.pagesDeLaCorbeille()
    expect(l.map(x => x.id)).toEqual([p2, p1, p4])
    expect(l[0]).toMatchObject({ ancienne: false, t: expect.any(Number) })
    expect(l[1].t).toBeLessThan(l[0].t!)
    expect(l[2]).toMatchObject({ id: p4, t: null, ancienne: true })
    expect(l[2].derniere).toBeLessThan(tLot2)                  // son dernier geste
    expect(l[1].derniere).toBeLessThan(l[1].t!)
    expect(t.dansLaCorbeille(p5)).toBe(false)
    expect(t.dansLaCorbeille(p3)).toBe(false)
    expect(t.remettrePage(p3)).toBe(-1)
    expect(t.remettrePage(p5)).toBe(-1)
  })

  it('remettre : après la voisine présente ; deux voisines supprimées ensemble reviennent dans l\'ordre, quel que soit l\'ordre des remises', async () => {
    for (const sens of ['avant', 'arriere']) {
      const { t, pages: [a, b, c, d] } = await tableau(4)
      t.jeterPages([b, c])
      await attendre(500)
      const remises = sens === 'avant' ? [b, c] : [c, b]
      t.pageVue = a
      for (const p of remises) { expect(t.remettrePage(p)).toBeGreaterThanOrEqual(1); await attendre(500) }
      expect(t.ordre.toArray()).toEqual([a, b, c, d])
      expect(t.pagesDeLaCorbeille()).toEqual([])
      expect(t.corbeille.size).toBe(0)
    }
  })

  it('remettre : une voisine définitive est sautée (on suit son entrée) ; en tête ; à la fin', async () => {
    const { t, pages: [a, b, c, d] } = await tableau(4)
    t.jeterPages([b, c]); await attendre(500)
    expect(t.supprimerDefinitivement([b])).toBe(1)
    expect(t.remettrePage(c)).toBe(1)                           // b définitive : après a
    expect(t.ordre.toArray()).toEqual([a, c, d])
    // En tête : la chaîne finit sur null
    t.jeterPages([a]); await attendre(500)
    t.ajouterPage('blanc', 0); await attendre(500)
    expect(t.remettrePage(a)).toBe(0)
    // À la fin : une page sans entrée (jetée par le lot 2), ou dont la voisine n'a pas d'entrée
    const { t: u, pages: [x, y, z] } = await tableau(3)
    u.pageVue = x
    u.doc.transact(() => u.ordre.delete(1, 1)); await attendre(500)           // y, à la façon du lot 2
    u.jeterPages([z]); await attendre(500)                                     // z.apres = x
    const w = u.ajouterPage('blanc', 1); await attendre(500)
    u.pageVue = w
    u.doc.transact(() => u.ordre.delete(0, 1)); await attendre(500)           // x, à la façon du lot 2
    expect(u.ordre.toArray()).toEqual([w])
    expect(Object.fromEntries(u.pagesDeLaCorbeille().map(p => [p.id, p.ancienne]))).toEqual({ [z]: false, [x]: true, [y]: true })
    expect(u.remettrePage(z)).toBe(1)                                          // sa voisine x sans entrée : à la fin
    expect(u.remettrePage(y)).toBe(2)                                          // sans entrée : à la fin
    expect(u.ordre.toArray()).toEqual([w, z, y])
  })

  it('remettre : refuse une page définitive ou déjà dans l\'ordre ; l\'étape est seulOrdre, notée sur la page remise', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    expect(t.remettrePage(a)).toBe(-1)
    expect(t.remettrePage('inconnue')).toBe(-1)
    t.jeterPages([b, c]); await attendre(500)
    t.supprimerDefinitivement([c])
    expect(t.remettrePage(c)).toBe(-1)
    const film = t.film.length
    t.pageVue = a
    expect(t.remettrePage(b)).toBe(1); await attendre(500)
    expect(t.film.length).toBe(film + 1)
    expect(derniere(t)).toMatchObject({ page: b, seulOrdre: true })
    expect(t.pageVue).toBe(a)                                   // rétablie après la transaction
  })

  it('supprimer définitivement : aucune étape, absente de la liste, Y.Map toujours là, son passé lisible', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    await geste(t, b, 5, 5, 'b2')
    const ancienne = t.film.length - 1
    const ids = [...t.formesDe(b)!.keys()].sort()
    expect(ids).toHaveLength(2)
    t.pageVue = a
    t.jeterPages([b]); await attendre(500)
    const film = t.film.length
    expect(t.supprimerDefinitivement([b, b, a, 'inconnue'])).toBe(1)
    await attendre(500)
    expect(t.film.length).toBe(film)
    expect(t.corbeille.get(b)).toMatchObject({ apres: a, index: 1, definitif: true })
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(t.pages.get(b)).toBeInstanceOf(Y.Map)
    expect(t.pageA(t.film.get(ancienne), b)!.formes.map(f => f.id).sort()).toEqual(ids)
    expect(t.supprimerDefinitivement([b])).toBe(0)              // déjà définitive
  })

  it('une page jetée puis supprimée définitivement ne revient plus : ni Ctrl+Z, ni « Annuler »', async () => {
    const { t, pages: [a, b] } = await tableau(2, false)
    await geste(t, b)
    await jeter(t, b, a)
    expect(t.peutAnnuler(a)).toBe(true)
    expect(t.supprimerDefinitivement([b])).toBe(1)
    expect(t.peutAnnuler(a)).toBe(false)
    expect(t.annuler(a)).toBeNull()
    expect(t.rendrePage(b)).toBe(-1)
    expect(t.ordre.toArray()).toEqual([a])
    expect(t.corbeille.get(b)?.definitif).toBe(true)
    // Même posée à la main (une marque qui aurait survécu), l'entrée définitive l'emporte
    const { t: u, pages: [x, y] } = await tableau(2, false)
    await geste(u, y)
    await jeter(u, y, x)
    u.corbeille.set(y, { t: Date.now(), definitif: true })
    expect(u.peutAnnuler(x)).toBe(false)
    expect(u.annuler(x)).toBeNull()
    expect(u.ordre.toArray()).toEqual([x])
  })
})

describe('la vue de la corbeille (src/pages/corbeille.ts)', () => {
  it('la date : « Supprimée aujourd\'hui à 10 h 05 » ; une page jetée avant la corbeille : sa dernière écriture', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    await attendre(30 * 60_000)
    const ecrite = horloge
    await geste(t, c, 10, 10)                                  // la dernière écriture sur c
    await attendre(10 * 60_000)
    // c jetée « comme au lot 2 » : sans entrée
    t.pageVue = a
    t.doc.transact(() => t.ordre.delete(t.ordre.toArray().indexOf(c), 1)); await attendre(500)
    await attendre(5 * 60_000)
    const jetee = horloge
    await jeter(t, b, a)
    const l = t.pagesDeLaCorbeille()
    expect(l.map(x => x.id)).toEqual([b, c])
    const maintenant = horloge
    expect(dateDeSuppression(l[0], maintenant)).toBe(`Supprimée ${quandLisible(jetee, maintenant)}`)
    expect(dateDeSuppression(l[0], maintenant)).toMatch(/^Supprimée aujourd'hui à \d+\sh\s\d\d$/)
    expect(l[1]).toMatchObject({ t: null, ancienne: true })
    expect(l[1].derniere).toBeGreaterThanOrEqual(ecrite)
    expect(l[1].derniere).toBeLessThan(jetee)
    expect(dateDeSuppression(l[1], maintenant)).toBe(`Supprimée avant cette version · dernière écriture ${quandLisible(l[1].derniere!, maintenant)}`)
    expect(dateDeSuppression({ t: null, derniere: null }, maintenant)).toBe('Supprimée avant cette version')
    // Le lendemain : « hier à … »
    expect(dateDeSuppression(l[0], maintenant + 86_400_000)).toMatch(/^Supprimée hier à /)
  })

  it('le bouton du bandeau : « Corbeille (2) », « Corbeille : 2 pages » ; vide : « Corbeille », « Corbeille : vide » ; le compte sans relire le film', async () => {
    const { t, pages: [a, b, c] } = await tableau(4)
    expect(compterCorbeille(t)).toBe(0)
    expect(libelleCorbeille(0)).toEqual({ texte: 'Corbeille', nom: 'Corbeille : vide' })
    t.pageVue = a
    t.jeterPages([b, c]); await attendre(500)
    expect(compterCorbeille(t)).toBe(2)
    expect(compterCorbeille(t)).toBe(t.pagesDeLaCorbeille().length)
    // (« 2 pages » : une espace insécable, comme partout dans l'outil)
    expect(libelleCorbeille(2)).toEqual({ texte: 'Corbeille (2)', nom: 'Corbeille : 2\u00a0pages' })
    expect(libelleCorbeille(1)).toEqual({ texte: 'Corbeille (1)', nom: 'Corbeille : 1\u00a0page' })
    t.supprimerDefinitivement([b])
    expect(compterCorbeille(t)).toBe(1)
    expect(texteVider(3)).toMatch(/^Les 3 pages de la corbeille seront supprimées définitivement : elles ne pourront plus être remises parmi les pages\. Leur histoire reste visible dans Revoir la construction/)
    expect(texteVider(1)).toMatch(/^La page de la corbeille sera supprimée définitivement/)
  })
})

describe('les noms des pages', () => {
  it('renommer : mis au propre, 60 caractères, vide = sans nom, aucune étape du film', async () => {
    const { t, pages: [a] } = await tableau(1)
    const film = t.film.length
    expect(t.nomDe(a)).toBeNull()
    expect(t.renommerPage(a, '  Exercice\t12\n p. 84  ')).toBe(true)
    expect(t.nomDe(a)).toBe('Exercice 12 p. 84')
    expect(t.renommerPage(a, 'Exercice 12 p. 84')).toBe(false)   // rien ne change
    expect(t.renommerPage(a, 'A\u0000B\u0007C')).toBe(true)
    expect(t.nomDe(a)).toBe('ABC')
    const long = 'é'.repeat(80)
    t.renommerPage(a, long)
    expect([...t.nomDe(a)!].length).toBe(LONGUEUR_NOM)
    t.renommerPage(a, '😀'.repeat(70))
    expect([...t.nomDe(a)!].length).toBe(LONGUEUR_NOM)          // sans couper un caractère en deux
    expect(t.renommerPage(a, '   ')).toBe(true)
    expect(t.nomDe(a)).toBeNull()
    expect(t.noms.has(a)).toBe(false)
    expect(t.renommerPage(a, null)).toBe(false)
    expect(t.renommerPage('inconnue', 'X')).toBe(false)
    await attendre(500)
    expect(t.film.length).toBe(film)
    expect(t.annulationDe(a)!.undoStack.length).toBe(1)        // son seul trait
    expect(nomPropre(undefined)).toBeNull()
    expect(nomPropre('a   b')).toBe('a b')
  })
})

describe('le fond d\'une autre page', () => {
  it('changerFond(B) en regardant A note l\'étape sur B, et rend la vue', async () => {
    const { t, pages: [a, b] } = await tableau(2)
    t.pageVue = a
    t.changerFond(b, 'seyes'); await attendre(500)
    expect(derniere(t).page).toBe(b)
    expect(t.pageVue).toBe(a)
    expect(t.fondDe(b)).toBe('seyes')
    t.changerFond(a, 'repere', { x: 10, y: 20 }); await attendre(500)
    expect(derniere(t).page).toBe(a)
  })
})

describe('déplacer les pages', () => {
  const o = ['a', 'b', 'c', 'd', 'e']
  it('deplacerDans : en avant, en arrière, plusieurs, à la fin, sans changement', () => {
    expect(deplacerDans(o, ['b'], 4)).toEqual(['a', 'c', 'd', 'b', 'e'])
    expect(deplacerDans(o, ['d'], 1)).toEqual(['a', 'd', 'b', 'c', 'e'])
    expect(deplacerDans(o, ['e', 'b'], 0)).toEqual(['b', 'e', 'a', 'c', 'd'])     // leur ordre relatif
    expect(deplacerDans(o, ['a', 'c'], 5)).toEqual(['b', 'd', 'e', 'a', 'c'])
    expect(deplacerDans(o, ['b', 'c'], 2)).toEqual(o)                              // la page d'arrivée est tirée : avant d
    expect(deplacerDans(o, ['b', 'c'], 3)).toEqual(o)
    expect(deplacerDans(o, ['c'], 2)).toEqual(o)
    expect(deplacerDans(o, ['x'], 0)).toEqual(o)
    expect(deplacerDans(o, ['d', 'e'], 4)).toEqual(o)                              // e tirée, rien après : à la fin
    expect(deplacerDans(o, ['a'], 99)).toEqual(['b', 'c', 'd', 'e', 'a'])
  })

  it('deplacerPages : seulOrdre, aucune pile ; faux sans changement', async () => {
    const { t, pages } = await tableau(4)
    const [a, b, c, d] = pages
    const avant = piles(t, pages)
    const film = t.film.length
    expect(t.deplacerPages([b], 1)).toBe(false)
    expect(t.deplacerPages([a, c], 4)).toBe(true); await attendre(500)
    expect(t.ordre.toArray()).toEqual([b, d, a, c])
    expect(t.film.length).toBe(film + 1)
    expect(derniere(t)).toMatchObject({ page: a, seulOrdre: true })
    expect(piles(t, pages)).toEqual(avant)
    expect(t.deplacerPages([c], 0)).toBe(true)
    expect(t.ordre.toArray()).toEqual([c, b, d, a])
  })

  it('200 déplacements d\'une page parmi 60 : le document grandit de moins de 100 Ko', async () => {
    const t = new Tableau(null)
    for (let i = 0; i < 60; i++) t.ajouterPage('carreaux', i)
    t.pageVue = t.ordre.get(0)
    await attendre(500)
    const avant = Y.encodeStateAsUpdate(t.doc).length
    for (let k = 0; k < 200; k++) {
      const id = t.ordre.get(k % 60)
      expect(t.deplacerPages([id], (k * 7) % 61)).toBeTypeOf('boolean')
      await attendre(50)
    }
    const croissance = Y.encodeStateAsUpdate(t.doc).length - avant
    expect(croissance).toBeLessThan(100 * 1024)
    expect(new Set(t.ordre.toArray()).size).toBe(60)
  })

  it('changementsDOrdre : la plus longue sous-suite commune reste, le reste s\'applique', () => {
    const appliquer = (avant: string[], apres: string[]) => {
      const { retirer, inserer } = changementsDOrdre(avant, apres)
      const x = [...avant]
      for (const i of retirer) x.splice(i, 1)
      for (const { i, id } of inserer) x.splice(i, 0, id)
      return { x, retirer, inserer }
    }
    const cas: [string[], string[]][] = [
      [['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']],
      [['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a']],
      [['a', 'b', 'c', 'd'], ['d', 'a', 'b', 'c']],
      [['a', 'b', 'c'], ['a', 'x', 'b', 'c']],
      [['a', 'b', 'c'], ['c']],
      [[], ['a', 'b']],
      [['a', 'b'], []],
      [['a', 'b', 'c', 'd', 'e'], ['e', 'd', 'c', 'b', 'a']],
    ]
    for (const [avant, apres] of cas) expect(appliquer(avant, apres).x).toEqual(apres)
    expect(appliquer(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd']).retirer).toEqual([])
    // Une page qui bouge : on ne retire qu'elle
    expect(changementsDOrdre(['a', 'b', 'c', 'd'], ['b', 'c', 'd', 'a'])).toEqual({ retirer: [0], inserer: [{ i: 3, id: 'a' }] })
    expect(changementsDOrdre(['a', 'b', 'c'], ['a', 'x', 'b', 'c'])).toEqual({ retirer: [], inserer: [{ i: 1, id: 'x' }] })
    // Les retraits en indices décroissants
    expect(appliquer(['a', 'b', 'c', 'd', 'e'], ['b', 'd']).retirer).toEqual([4, 2, 0])
  })
})

describe('l\'état des pages (le journal de la trieuse)', () => {
  it('retablirEtatDesPages rend l\'ordre, les noms et la corbeille ; un état invalide ne change rien', async () => {
    const { t, pages: [a, b, c, d] } = await tableau(4)
    t.renommerPage(a, 'Un')
    const e0 = t.etatDesPages()
    expect(e0).toEqual({ ordre: [a, b, c, d], noms: { [a]: 'Un' }, corbeille: {} })
    // Une action : b et c supprimées, d déplacée, a renommée, d nommée
    t.pageVue = a
    t.jeterPages([b, c]); t.deplacerPages([d], 0)
    t.renommerPage(a, 'Deux'); t.renommerPage(d, 'Quatre')
    await attendre(500)
    const e1 = t.etatDesPages()
    expect(e1.ordre).toEqual([d, a])
    const film = t.film.length
    expect(t.retablirEtatDesPages(e0)).toBe(true); await attendre(500)
    expect(t.etatDesPages()).toEqual(e0)
    expect(t.film.length).toBe(film + 1)
    expect(derniere(t)).toMatchObject({ page: a, seulOrdre: true })
    expect(t.retablirEtatDesPages(e0)).toBe(false)             // rien à changer
    // Refaire
    expect(t.retablirEtatDesPages(e1)).toBe(true); await attendre(500)
    expect(t.etatDesPages()).toEqual(e1)
    // Seuls les noms changent : aucune étape
    const f2 = t.film.length
    expect(t.retablirEtatDesPages({ ...e1, noms: {} })).toBe(true); await attendre(500)
    expect(t.film.length).toBe(f2)
    expect(t.nomDe(a)).toBeNull()
    // Invalides : une page inconnue, un doublon, un ordre vide
    const ici = t.etatDesPages()
    for (const ordre of [[a, 'inconnue'], [a, a], []]) {
      expect(t.retablirEtatDesPages({ ordre, noms: { [a]: 'X' }, corbeille: {} })).toBe(false)
      expect(t.etatDesPages()).toEqual(ici)
    }
  })

  it('l\'ordre se rétablit par le plus petit changement', async () => {
    const t = new Tableau(null)
    for (let i = 0; i < 60; i++) t.ajouterPage('carreaux', i)
    t.pageVue = t.ordre.get(0); await attendre(500)
    const e0 = t.etatDesPages()
    const avant = Y.encodeStateAsUpdate(t.doc).length
    for (let k = 0; k < 100; k++) {
      t.deplacerPages([t.ordre.get(5)], 50)
      t.retablirEtatDesPages(e0)
    }
    expect(t.ordre.toArray()).toEqual(e0.ordre)
    expect(Y.encodeStateAsUpdate(t.doc).length - avant).toBeLessThan(100 * 1024)
  })
})

describe('le fichier .memc garde la corbeille, les noms et les copies', () => {
  it('aller-retour : version 1, l\'en-tête compte les pages de l\'ordre', async () => {
    const { t, pages: [a, b, c] } = await tableau(3)
    t.renommerPage(a, 'Exercice 12 p. 84')
    const q = t.dupliquerPage(a)!
    await attendre(500)
    t.pageVue = a
    t.jeterPages([b]); await attendre(500)
    t.jeterPages([c]); t.supprimerDefinitivement([c]); await attendre(500)
    const o = new Uint8Array(await ecrireTableau(t.doc).arrayBuffer())
    const { entete, etat, pages } = lireTableau(o)
    expect(VERSION_TABLEAU).toBe(1)
    expect(entete.v).toBe(1)
    expect(entete.pages).toBe(2)
    expect(pages).toBe(2)
    const u = new Tableau(null)
    Y.applyUpdate(u.doc, etat, 'film')
    expect(u.ordre.toArray()).toEqual([a, q])
    expect(u.nomDe(a)).toBe('Exercice 12 p. 84')
    expect(u.nomDe(q)).toBe('Exercice 12 p. 84 (copie)')
    expect(u.herite(q)).toBe(a)
    expect(u.pagesDeLaCorbeille().map(x => x.id)).toEqual([b])
    expect(u.corbeille.get(c)?.definitif).toBe(true)
    expect(u.film.length).toBe(t.film.length)
    // Après le rechargement, la page se remet de la corbeille à sa place
    u.pageVue = a
    expect(u.remettrePage(b)).toBe(2)                           // après sa voisine d'avant, la copie q
    expect(u.ordre.toArray()).toEqual([a, q, b])
  })
})
