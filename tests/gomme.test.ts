// Un coup de gomme est UN geste : même lent, même passant sur trois traits,
// il s'annule d'un seul Ctrl+Z. Le film, lui, garde une étape par trait
// effacé (le replay les montre partir l'un après l'autre).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'

let horloge = new Date('2026-10-08T08:00:00').getTime()
let numero = 0

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Le temps passe : l'horloge avance, et le dernier changement que retient
 *  l'annulation vieillit d'autant (Yjs lit l'heure par une copie de Date.now
 *  faite au chargement, que l'horloge simulée ne remplace pas). Puis le film
 *  note l'étape (il le fait juste après). */
let tableaux: Tableau[] = []
async function attendre(ms: number) {
  horloge += ms; vi.setSystemTime(horloge)
  for (const t of tableaux) if (t.annulation.lastChange > 0) t.annulation.lastChange -= ms
  await Promise.resolve(); await Promise.resolve()
}

function trait(y: number): Trait {
  return { id: 'T' + numero++, type: 'trait', x: 0, y, z: Date.now(), auteur: 'moi', pts: [0, 0, 0.5, 50, 0, 0.5],
    couleur: '#1b2230', taille: 3, opacite: 1, pression: false }
}

/** Un tableau d'une page avec trois traits, posés chacun en son geste */
async function tableauATroisTraits() {
  const t = new Tableau(null)
  tableaux = [t]
  await t.charger()
  const page = t.ordre.get(0)
  const traits = [trait(0), trait(100), trait(200)]
  for (const f of traits) { t.nouveauGeste(); t.poser(page, f); await attendre(1000) }
  return { t, page, ids: traits.map(f => f.id) }
}

/** Efface les traits un à un, 600 ms entre chacun (une gomme lente) */
async function gommerLentement(t: Tableau, page: string, ids: string[]) {
  for (const id of ids) { t.supprimer(page, [id]); await attendre(600) }
}

describe('la gomme', () => {
  it('sans geste long, trois effacements espacés font trois étapes d\'annulation', async () => {
    const { t, page, ids } = await tableauATroisTraits()
    const pile = t.annulation.undoStack.length
    t.nouveauGeste()
    await gommerLentement(t, page, ids)
    expect(t.annulation.undoStack.length).toBe(pile + 3)
  })

  it('un coup de gomme lent sur trois traits : un seul Ctrl+Z les rend tous, le film a trois étapes', async () => {
    const { t, page, ids } = await tableauATroisTraits()
    const pile = t.annulation.undoStack.length, film = t.film.length
    t.nouveauGeste()
    t.gesteLong()
    await gommerLentement(t, page, ids)
    t.finGesteLong()
    expect(t.formesDe(page)!.size).toBe(0)
    expect(t.annulation.undoStack.length).toBe(pile + 1)
    expect(t.film.length).toBe(film + 3)
    t.annulation.undo()
    expect([...t.formesDe(page)!.keys()].sort()).toEqual([...ids].sort())
  })

  it('après le coup de gomme, la fenêtre de 400 ms revient : deux changements à 600 ms d\'écart font deux étapes', async () => {
    const { t, page, ids } = await tableauATroisTraits()
    t.nouveauGeste(); t.gesteLong()
    await gommerLentement(t, page, ids.slice(0, 1))
    t.finGesteLong()
    const pile = t.annulation.undoStack.length
    // Un changement juste après, sans nouveau geste : la fenêtre de 400 ms revient
    t.supprimer(page, [ids[1]]); await attendre(600)
    t.supprimer(page, [ids[2]]); await attendre(100)
    expect(t.annulation.undoStack.length).toBe(pile + 2)
  })

  it('un geste long resté ouvert (un lever perdu) ne déborde pas sur le geste suivant', async () => {
    const { t, page, ids } = await tableauATroisTraits()
    t.nouveauGeste(); t.gesteLong()
    await gommerLentement(t, page, ids.slice(0, 1))
    // Pas de finGesteLong : le geste suivant commence quand même par nouveauGeste
    const pile = t.annulation.undoStack.length
    t.nouveauGeste()
    t.supprimer(page, [ids[1]]); await attendre(600)
    t.supprimer(page, [ids[2]]); await attendre(600)
    expect(t.annulation.undoStack.length).toBe(pile + 2)
  })
})
