// Dupliquer une page avec son histoire (le document seul). La copie se place
// juste après l'original, avec le même fond, la même origine, le même nom
// suivi de « (copie) », et chaque forme SOUS LE MÊME IDENTIFIANT, en copie ;
// elle note `herite: { de }` et sa naissance est la première étape du film
// notée sur elle. Aucune pile n'est touchée. Avec une marque (« Dupliquer la
// page » au tableau), Ctrl+Z sur la copie toute neuve la retire et ramène à
// l'original, tant que l'un et l'autre sont dans l'ordre.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { LONGUEUR_NOM, Tableau, nomDeCopie } from '../src/document'
import type { Trait } from '../src/types'

let horloge = new Date('2026-10-09T09:00:00').getTime()
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

/** Un tableau de n pages, en regardant la première, avec deux traits sur elle */
async function tableau(n: number) {
  const t = new Tableau(null)
  const pages: string[] = []
  for (let i = 0; i < n; i++) { const p = t.ajouterPage('carreaux', i); pages.push(p); t.pageVue = p; await attendre(500) }
  await geste(t, pages[0], 0, 0, 'a1'); await geste(t, pages[0], 20, 0, 'a2')
  t.pageVue = pages[0]
  return { t, pages }
}

/** Comme l'application après « Dupliquer la page » : on va sur la copie */
async function dupliquer(t: Tableau, p: string, marque = false) {
  t.pageVue = p
  const q = t.dupliquerPage(p, { marque })!
  t.pageVue = q
  await attendre(500)
  return q
}

const derniere = (t: Tableau) => t.film.get(t.film.length - 1)

describe('dupliquer une page', () => {
  it('mêmes identifiants, contenus égaux, objets distincts, herite, juste après, fond et origine', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    t.changerFond(p, 'repere', { x: 30, y: 40 }); await attendre(500)
    const film = t.film.length
    t.pageVue = p
    const q = t.dupliquerPage(p)!
    expect(q).toBeTypeOf('string')
    expect(t.pageVue).toBe(p)                                     // rétablie après la transaction
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([p, q, b])
    expect(t.herite(q)).toBe(p)
    expect(t.herite(p)).toBeNull()
    expect([...t.formesDe(q)!.keys()].sort()).toEqual(['a1', 'a2'])
    for (const id of ['a1', 'a2']) {
      const fp = t.formesDe(p)!.get(id)!, fq = t.formesDe(q)!.get(id)!
      expect(fq).toEqual(fp)
      expect(fq).not.toBe(fp)                                     // copies JSON : aucun objet partagé
      expect((fq as Trait).pts).not.toBe((fp as Trait).pts)
    }
    expect(t.fondDe(q)).toBe('repere')
    expect(t.origineDe(q)).toEqual({ x: 30, y: 40 })
    expect(t.origineDe(q)).not.toBe(t.origineDe(p))
    // Une seule étape, notée sur la copie : sa naissance (pas seulement l'ordre)
    expect(t.film.length).toBe(film + 1)
    expect(derniere(t).page).toBe(q)
    expect(derniere(t).seulOrdre).toBeUndefined()
    expect(t.pageA(t.film.get(film - 1), q)).toBeNull()             // avant : la copie n'existe pas
    // Les deux évoluent séparément
    await geste(t, q, 50, 50, 'q1')
    expect(t.formesDe(p)!.has('q1')).toBe(false)
    t.nouveauGeste(); t.modifier(p, [{ id: 'a1', patch: { x: 99 } }]); await attendre(800)
    expect(t.formesDe(q)!.get('a1')!.x).toBe(0)
  })

  it('aucune pile touchée : celle de la copie commence vide, celle de l\'original ne change pas', async () => {
    const { t, pages: [p] } = await tableau(1)
    const pile = t.annulationDe(p)!
    const avant = pile.undoStack.length
    const q = await dupliquer(t, p)
    expect(pile.undoStack.length).toBe(avant)
    expect(t.annulationDe(q)!.undoStack.length).toBe(0)
    expect(t.peutAnnuler(q)).toBe(false)                          // sans marque (la trieuse)
    expect(t.annuler(q)).toBeNull()
    expect(t.ordre.toArray()).toEqual([p, q])
    // La pile de l'original défait toujours ses propres gestes
    expect(t.annuler(p)).toEqual({})
    expect([...t.formesDe(p)!.keys()]).toEqual(['a1'])
    expect([...t.formesDe(q)!.keys()].sort()).toEqual(['a1', 'a2'])
  })

  it('à une place donnée ; un original hors de l\'ordre va à la fin ; une page inconnue : null', async () => {
    const { t, pages: [p, b, c] } = await tableau(3)
    const q = t.dupliquerPage(p, { position: 3 })!
    expect(t.ordre.toArray()).toEqual([p, b, c, q])
    const r = t.dupliquerPage(c, { position: 0 })!
    expect(t.ordre.toArray()).toEqual([r, p, b, c, q])
    t.pageVue = p
    t.jeterPages([b]); await attendre(500)
    const s = t.dupliquerPage(b)!
    expect(t.ordre.toArray()).toEqual([r, p, c, q, s])
    expect(t.dupliquerPage('inconnue')).toBeNull()
  })

  it('une copie de copie : herite de la copie ; l\'original modifié, jeté, effacé ne change pas son passé', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    const q = await dupliquer(t, p)
    await geste(t, q, 5, 5, 'q1')
    const r = await dupliquer(t, q)
    expect(t.herite(r)).toBe(q)
    expect(t.ordre.toArray()).toEqual([p, q, r, b])
    expect([...t.formesDe(r)!.keys()].sort()).toEqual(['a1', 'a2', 'q1'])
    const naissance = t.film.toArray().findIndex(e => e.page === r)
    // On efface l'original à l'ancienne, on jette la copie : les instantanés d'avant lisent encore tout
    t.pageVue = r
    t.jeterPages([q]); await attendre(500)
    t.supprimerPage(p); await attendre(500)
    expect(t.pageA(t.film.get(naissance - 1), q)!.formes.map(f => f.id).sort()).toEqual(['a1', 'a2', 'q1'])
    expect(t.pageA(t.film.get(naissance - 1), p)!.formes.map(f => f.id).sort()).toEqual(['a1', 'a2'])
    expect(t.herite(r)).toBe(q)
  })

  it('les noms : « N (copie) », « N (copie 2) », « N (copie 3) » ; 60 caractères ; sans nom, sans nom', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    expect(t.nomDe(await dupliquer(t, b))).toBeNull()
    t.renommerPage(p, 'Exercice 12 p. 84')
    const q = await dupliquer(t, p)
    expect(t.nomDe(q)).toBe('Exercice 12 p. 84 (copie)')
    const r = await dupliquer(t, q)
    expect(t.nomDe(r)).toBe('Exercice 12 p. 84 (copie 2)')
    const s = await dupliquer(t, r)
    expect(t.nomDe(s)).toBe('Exercice 12 p. 84 (copie 3)')
    expect(t.nomDe(p)).toBe('Exercice 12 p. 84')
    expect(nomDeCopie('(copie)')).toBe('(copie 2)')
    expect(nomDeCopie('Bilan (copie 9)')).toBe('Bilan (copie 10)')
    const long = nomDeCopie('x'.repeat(LONGUEUR_NOM))
    expect(long).toBe('x'.repeat(LONGUEUR_NOM - 8) + ' (copie)')
    expect(long.length).toBe(LONGUEUR_NOM)
    expect(nomDeCopie('y'.repeat(51) + ' (copie 2)')).toBe('y'.repeat(LONGUEUR_NOM - 10) + ' (copie 3)')
  })

  it('après un rechargement : objets distincts au contenu égal, herite gardé', async () => {
    const { t, pages: [p] } = await tableau(1)
    const q = await dupliquer(t, p)
    const u = new Tableau(null)
    Y.applyUpdate(u.doc, Y.encodeStateAsUpdate(t.doc), 'film')
    const fp = u.formesDe(p)!.get('a1'), fq = u.formesDe(q)!.get('a1')
    expect(fq).not.toBe(fp)
    expect(fq).toEqual(fp)
    expect(u.herite(q)).toBe(p)
  })
})

describe('Ctrl+Z sur la copie toute neuve (« Dupliquer la page » au tableau)', () => {
  it('la retire : définitive, absente de la corbeille, étape seulOrdre notée sur l\'original ; ↶ allumé tout de suite', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    const q = await dupliquer(t, p, true)
    expect(t.peutAnnuler(q)).toBe(true)
    const film = t.film.length
    expect(t.annuler(q)).toEqual({ copie: q, retour: p })
    await attendre(500)
    expect(t.ordre.toArray()).toEqual([p, b])
    expect(t.corbeille.get(q)).toMatchObject({ apres: p, index: 1, definitif: true })
    expect(t.pagesDeLaCorbeille()).toEqual([])
    expect(t.pages.get(q)).toBeInstanceOf(Y.Map)
    expect(t.film.length).toBe(film + 1)
    expect(derniere(t)).toMatchObject({ page: p, seulOrdre: true })
    expect(t.peutAnnuler(q)).toBe(false)
    expect(t.annuler(q)).toBeNull()
    expect(t.retablir(q)).toBe(false)                            // Ctrl+Y ne recrée pas la copie
    expect(t.remettrePage(q)).toBe(-1)
    expect(t.rendrePage(q)).toBe(-1)
  })

  it('après un geste sur la copie : le premier Ctrl+Z défait le geste, le second retire la copie', async () => {
    const { t, pages: [p] } = await tableau(1)
    const q = await dupliquer(t, p, true)
    await geste(t, q, 5, 5, 'q1')
    t.nouveauGeste(); t.modifier(q, [{ id: 'a1', patch: { x: 77 } }]); await attendre(800)
    expect(t.annuler(q)).toEqual({})
    expect(t.formesDe(q)!.get('a1')!.x).toBe(0)
    expect(t.annuler(q)).toEqual({})
    expect(t.formesDe(q)!.has('q1')).toBe(false)
    expect(t.peutAnnuler(q)).toBe(true)
    expect(t.annuler(q)).toEqual({ copie: q, retour: p })
    expect(t.ordre.toArray()).toEqual([p])
  })

  it('une copie qui a changé hors de sa pile (des objets arrivés, son fond) ne se retire pas', async () => {
    const { t, pages: [p] } = await tableau(1)
    const q = await dupliquer(t, p, true)
    // Une arrivée hors de toute pile (comme « Envoyer vers… »)
    t.doc.transact(() => t.formesDe(q)!.set('arrive', trait(9, 9, 'arrive')))
    await attendre(500)
    expect(t.annuler(q)).toBeNull()
    expect(t.ordre.toArray()).toEqual([p, q])
    expect(t.formesDe(q)!.has('arrive')).toBe(true)
    expect(t.peutAnnuler(q)).toBe(false)                          // la marque est partie
    // Son fond changé : de même
    const r = await dupliquer(t, p, true)
    t.changerFond(r, 'seyes'); await attendre(500)
    expect(t.annuler(r)).toBeNull()
    expect(t.ordre.toArray()).toEqual([p, r, q])
  })

  it('la marque ne vaut plus si la copie a quitté l\'ordre autrement, même remise ensuite', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    const q = await dupliquer(t, p, true)
    t.pageVue = p
    t.jeterPages([q]); await attendre(500)
    expect(t.remettrePage(q)).toBe(1); await attendre(500)
    expect(t.ordre.toArray()).toEqual([p, q, b])
    expect(t.peutAnnuler(q)).toBe(false)
    expect(t.annuler(q)).toBeNull()
    expect(t.ordre.toArray()).toEqual([p, q, b])
  })

  it('le cas de la critique : P, sa copie Q, P supprimée dans la trieuse : Ctrl+Z sur Q ne vide pas le tableau', async () => {
    const { t, pages: [p] } = await tableau(1)
    const q = await dupliquer(t, p, true)
    t.jeterPages([p])
    await attendre(500)
    expect(t.peutAnnuler(q)).toBe(false)
    expect(t.annuler(q)).toBeNull()
    expect(t.ordre.toArray()).toEqual([q])
    expect(t.retirerCopie(q)).toBeNull()
    // Même chose si l'original revient plus tard : la marque est partie
    t.remettrePage(p); await attendre(500)
    expect(t.peutAnnuler(q)).toBe(false)
  })

  it('retirerCopie refuse ce qui n\'est pas une copie, une copie hors de l\'ordre, une copie dont l\'original est parti', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    expect(t.retirerCopie(p)).toBeNull()
    expect(t.retirerCopie('inconnue')).toBeNull()
    const q = await dupliquer(t, p)
    t.pageVue = b
    expect(t.retirerCopie(q)).toBe(p)                             // sans marque, appelée directement
    expect(t.retirerCopie(q)).toBeNull()                          // déjà partie
    const r = await dupliquer(t, b)
    t.pageVue = r
    t.jeterPages([b]); await attendre(500)
    expect(t.retirerCopie(r)).toBeNull()
  })

  it('une page jetée depuis la copie : Ctrl+Z la rend d\'abord, puis retire la copie', async () => {
    const { t, pages: [p, b] } = await tableau(2)
    const q = await dupliquer(t, p, true)
    // Depuis la copie, on supprime b (trieuse, en regardant b) : on arrive sur q
    t.pageVue = q
    t.jeterPages([b], { vue: { page: b, depuis: q } }); await attendre(500)
    expect(t.annuler(q)).toEqual({ page: b })
    expect(t.ordre.toArray()).toEqual([p, q, b])
    expect(t.annuler(q)).toEqual({ copie: q, retour: p })
    expect(t.ordre.toArray()).toEqual([p, b])
  })
})
