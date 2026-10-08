// L'annulation par page : chaque page garde sa pile, et Ctrl+Z sur une page
// ne change jamais une autre page (avant, une seule pile pour tout le tableau
// pouvait retirer, depuis la page 1, un trait de la page 2 sans rien montrer).
// Le film, lui, ne change pas : une étape par changement, notée sur la page
// qu'on regarde.
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import type { Forme, ImageForme, Polygone, Trait } from '../src/types'

let numero = 0

function trait(y: number): Trait {
  return { id: 'T' + numero++, type: 'trait', x: 0, y, z: numero, auteur: 'moi', pts: [0, 0, 0.5, 50, 0, 0.5],
    couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

function point(x: number, lie: string): Polygone {
  return { id: 'P' + numero++, type: 'polygone', x, y: 0, z: numero, auteur: 'moi', pts: [0, 0], ferme: false,
    couleur: '#1b2230', taille: 3, sommets: true, noms: ['A'], lie }
}

function image(): ImageForme {
  return { id: 'I' + numero++, type: 'image', x: 0, y: 0, z: numero, auteur: 'moi', src: 'data:,', l: 10, h: 10, m: [1, 0, 0, 1] }
}

/** Le film note ses étapes juste après la transaction (une microtâche) */
const attendre = async () => { await Promise.resolve(); await Promise.resolve() }

/** Le temps passe pour les piles : leur dernier changement vieillit d'une
 *  seconde, plus que la fenêtre de 400 ms (Yjs lit l'heure par une copie de
 *  Date.now, qu'une horloge simulée ne remplacerait pas) */
function vieillir(...piles: (Y.UndoManager | null)[]) {
  for (const u of piles) if (u && u.lastChange > 0) u.lastChange -= 1000
}

/** Un tableau de deux pages, A et B, en regardant A */
async function deuxPages() {
  const t = new Tableau(null)
  await t.charger()
  const a = t.ordre.get(0)
  const b = t.ajouterPage('blanc', 1)
  t.pageVue = a
  await attendre()
  return { t, a, b }
}

const ids = (t: Tableau, page: string) => [...t.formesDe(page)!.keys()].sort()

/** Pose une forme en son propre geste */
function geste(t: Tableau, page: string, f: Forme) { t.nouveauGeste(); t.poser(page, f) }

describe('une pile par page', () => {
  it('un trait sur A, un sur B, un sur A : chaque page ne défait que ses gestes', async () => {
    const { t, a, b } = await deuxPages()
    const a1 = trait(0), b1 = trait(10), a2 = trait(20)
    geste(t, a, a1); geste(t, b, b1); geste(t, a, a2)
    expect(t.annuler(a)).toEqual({})
    expect(ids(t, a)).toEqual([a1.id])
    expect(ids(t, b)).toEqual([b1.id])                         // B n'a pas bougé
    expect(t.annuler(b)).toEqual({})
    expect(ids(t, b)).toEqual([])
    expect(ids(t, a)).toEqual([a1.id])                         // A non plus
    expect(t.annuler(b)).toBeNull()                            // rien de plus sur B
    expect(t.retablir(b)).toBe(true)
    expect(ids(t, b)).toEqual([b1.id])
    expect(t.retablir(a)).toBe(true)
    expect(ids(t, a)).toEqual([a1.id, a2.id].sort())
    expect(t.retablir(a)).toBe(false)
    // Le dernier Ctrl+Z de A ne va jamais chercher le trait de B
    expect(t.annuler(a)).toEqual({}); expect(t.annuler(a)).toEqual({}); expect(t.annuler(a)).toBeNull()
    expect(ids(t, a)).toEqual([])
    expect(ids(t, b)).toEqual([b1.id])
  })

  it('ce qu\'une pile défait, elle seule le refait (chaque pile suit ses propres origines)', async () => {
    const { t, a, b } = await deuxPages()
    geste(t, a, trait(0)); geste(t, b, trait(10))
    t.annuler(a)
    // La pile de B n'a pas reçu l'annulation de A : elle n'a rien à refaire
    expect(t.peutRetablir(b)).toBe(false)
    expect(t.peutRetablir(a)).toBe(true)
    expect(t.annulationDe(b)!.undoStack.length).toBe(1)
    t.retablir(a)
    expect(t.annulationDe(b)!.undoStack.length).toBe(1)
    expect(t.annulationDe(a)!.undoStack.length).toBe(1)
  })

  it('une transaction « locale » qui enveloppe supprimer et poser (la figure reconnue) est une étape', async () => {
    const { t, a } = await deuxPages()
    const brut = trait(0)
    geste(t, a, brut)
    const carre: Polygone = { id: 'C' + numero++, type: 'polygone', x: 0, y: 0, z: numero, auteur: 'moi', pts: [0, 0, 10, 0, 10, 10, 0, 10],
      ferme: true, couleur: '#1b2230', taille: 3 }
    t.nouveauGeste()
    t.doc.transact(() => { t.supprimer(a, [brut.id]); t.poser(a, carre) }, 'locale')
    expect(ids(t, a)).toEqual([carre.id])
    expect(t.annulationDe(a)!.undoStack.length).toBe(2)
    t.annuler(a)
    expect(ids(t, a)).toEqual([brut.id])                       // le tracé à main levée revient
  })

  it('la pile d\'une page qui n\'en avait pas, créée au milieu d\'une transaction englobante, la reçoit', async () => {
    const { t, b } = await deuxPages()
    const f = trait(0), g = trait(10)
    t.doc.transact(() => { t.poser(b, f); t.poser(b, g) }, 'locale')
    expect(t.annulationDe(b)!.undoStack.length).toBe(1)
    t.annuler(b)
    expect(ids(t, b)).toEqual([])
  })

  it('une image et ses deux points liés posés dans la même transaction (transformer) s\'annulent d\'un seul Ctrl+Z', async () => {
    const { t, a } = await deuxPages()
    const avant = trait(0)
    geste(t, a, avant)
    const img = image(), p1 = point(1, img.id), p2 = point(2, img.id)
    t.nouveauGeste()
    t.doc.transact(() => { t.poser(a, p1); t.poser(a, p2); t.poser(a, img) }, 'locale')
    expect(ids(t, a)).toHaveLength(4)
    expect(t.annuler(a)).toEqual({})
    expect(ids(t, a)).toEqual([avant.id])                      // ni image, ni points images
    expect(t.retablir(a)).toBe(true)
    expect(ids(t, a)).toEqual([avant.id, img.id, p1.id, p2.id].sort())
  })
})

describe('un geste = une étape', () => {
  it('trois effacements espacés, sans geste long : trois étapes ; avec : une seule', async () => {
    const { t, a } = await deuxPages()
    const traits = [trait(0), trait(10), trait(20)]
    for (const f of traits) { geste(t, a, f); vieillir(t.annulationDe(a)) }
    const u = t.annulationDe(a)!
    const pile = u.undoStack.length
    t.nouveauGeste()
    for (const f of traits) { t.supprimer(a, [f.id]); vieillir(u) }
    expect(u.undoStack.length).toBe(pile + 3)
    for (let i = 0; i < 3; i++) t.annuler(a)
    expect(ids(t, a)).toHaveLength(3)
    t.nouveauGeste(); t.gesteLong()
    for (const f of traits) { t.supprimer(a, [f.id]); vieillir(u) }
    t.finGesteLong()
    expect(u.undoStack.length).toBe(pile + 1)
    t.annuler(a)
    expect(ids(t, a)).toEqual(traits.map(f => f.id).sort())
  })

  it('un geste long sur une page relue du disque, sans pile encore : trois effacements lents, une seule étape', async () => {
    const { t, a } = await deuxPages()
    const traits = [trait(0), trait(10), trait(20)]
    for (const f of traits) geste(t, a, f)
    // Le tableau relu : la page est là, sa pile n'existe pas (rien n'a été écrit cette fois)
    const relu = new Tableau(null)
    Y.applyUpdate(relu.doc, Y.encodeStateAsUpdate(t.doc))
    relu.pageVue = a
    await attendre()
    expect(relu.peutAnnuler(a)).toBe(false)
    relu.nouveauGeste(); relu.gesteLong()
    for (const f of traits) { relu.supprimer(a, [f.id]); vieillir(relu.annulationDe(a)) }
    relu.finGesteLong()
    expect(relu.formesDe(a)!.size).toBe(0)
    expect(relu.annulationDe(a)!.undoStack.length).toBe(1)
    expect(relu.annuler(a)).toEqual({})
    expect(ids(relu, a)).toEqual(traits.map(f => f.id).sort())
    // Après le geste long, la fenêtre de 400 ms revient : deux changements espacés, deux étapes
    relu.supprimer(a, [traits[0].id]); vieillir(relu.annulationDe(a))
    relu.supprimer(a, [traits[1].id])
    expect(relu.annulationDe(a)!.undoStack.length).toBe(2)
  })

  it('nouveauGeste coupe la capture de toutes les piles', async () => {
    const { t, a, b } = await deuxPages()
    t.nouveauGeste()
    t.poser(a, trait(0)); t.poser(b, trait(10))
    t.nouveauGeste()
    t.poser(a, trait(20)); t.poser(b, trait(30))
    expect(t.annulationDe(a)!.undoStack.length).toBe(2)
    expect(t.annulationDe(b)!.undoStack.length).toBe(2)
  })
})

describe('le film et ce qui reste hors des piles', () => {
  it('le film garde une étape par changement, notée sur la page vue', async () => {
    const { t, a, b } = await deuxPages()
    const debut = t.film.length
    geste(t, a, trait(0)); await attendre()
    t.pageVue = b
    geste(t, b, trait(10)); await attendre()
    t.annuler(b); await attendre()
    t.retablir(b); await attendre()
    t.pageVue = a
    t.annuler(a); await attendre()
    const film = t.film.toArray().slice(debut)
    expect(film.map(e => e.page)).toEqual([a, b, b, b, a])
  })

  it('ni la piste des instruments ni le changement de fond ne sont dans une pile', async () => {
    const { t, a } = await deuxPages()
    t.changerFond(a, 'repere', { x: 0, y: 0 })
    t.noterPiste({ t: 1, p: a, n: 'regle', d: [0, 100, 100, 0, 0] })
    expect(t.peutAnnuler(a)).toBe(false)
    expect(t.annuler(a)).toBeNull()
    expect(t.fondDe(a)).toBe('repere')
    expect(t.piste.length).toBe(1)
    geste(t, a, trait(0))
    t.annuler(a)
    expect(t.fondDe(a)).toBe('repere')
    expect(t.piste.length).toBe(1)
  })
})

describe('ce que l\'interface lit', () => {
  it('peutAnnuler, peutRetablir : par page, sans créer de pile', async () => {
    const { t, a, b } = await deuxPages()
    expect(t.peutAnnuler(a)).toBe(false); expect(t.peutRetablir(a)).toBe(false)
    expect(t.peutAnnuler('pas-une-page')).toBe(false)
    expect(t.annulationDe('pas-une-page')).toBeNull()
    geste(t, a, trait(0))
    expect(t.peutAnnuler(a)).toBe(true); expect(t.peutAnnuler(b)).toBe(false)
    t.annuler(a)
    expect(t.peutAnnuler(a)).toBe(false); expect(t.peutRetablir(a)).toBe(true)
    // Un nouveau geste oublie ce qui était à refaire
    geste(t, a, trait(10))
    expect(t.peutRetablir(a)).toBe(false)
  })

  it('onPiles est appelé après poser, annuler, rétablir et l\'oubli des étapes à refaire, la pile déjà à jour', async () => {
    const { t, a } = await deuxPages()
    const vus: [boolean, boolean][] = []
    t.onPiles = () => vus.push([t.peutAnnuler(a), t.peutRetablir(a)])
    geste(t, a, trait(0))
    expect(vus.at(-1)).toEqual([true, false])
    const n = vus.length
    t.annuler(a)
    expect(vus.length).toBeGreaterThan(n)
    expect(vus.at(-1)).toEqual([false, true])
    t.retablir(a)
    expect(vus.at(-1)).toEqual([true, false])
    t.annuler(a)
    geste(t, a, trait(10))                                      // l'étape à refaire est oubliée
    expect(vus.at(-1)).toEqual([true, false])
  })

  it('l\'ancien accès t.annulation est la pile de la page vue', async () => {
    const { t, a, b } = await deuxPages()
    expect(t.annulation).toBe(t.annulationDe(a))
    t.pageVue = b
    expect(t.annulation).toBe(t.annulationDe(b))
    t.pageVue = ''
    expect(t.annulation).toBe(t.annulationDe(a))               // à défaut, la première page
  })
})
