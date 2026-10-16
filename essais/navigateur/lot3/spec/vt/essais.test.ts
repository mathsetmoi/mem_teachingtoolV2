// Vérifie les hypothèses de la spécification du lot 3 sur Yjs (gc: false)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../../../../../src/document'
import type { Forme, Trait } from '../../../../../src/types'
import { lectureDe } from '../../../../../src/revue/planches'

let horloge = new Date('2026-10-07T08:00:00').getTime()
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
let n = 0
const trait = (id: string, x = 0): Trait => ({ id, type: 'trait', x, y: 0, z: n++, auteur: 'm', pts: [0, 0, 0.5, 10, 10, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false })

/** Duplique une page comme le ferait la spécification : mêmes identifiants, 'herite' */
function dupliquer(t: Tableau, p: string): string {
  const q = 'Q' + n++
  const vue = t.pageVue
  t.pageVue = q
  t.doc.transact(() => {
    const m = new Y.Map<unknown>()
    m.set('fond', t.fondDe(p))
    m.set('herite', { de: p })
    const f = new Y.Map<Forme>()
    for (const [id, x] of t.formesDe(p)!) f.set(id, JSON.parse(JSON.stringify(x)))
    m.set('formes', f)
    t.pages.set(q, m)
    t.ordre.insert(t.ordre.toArray().indexOf(p) + 1, [q])
  })
  t.pageVue = vue
  return q
}

describe('hypothèses', () => {
  it('copie : mêmes identifiants, objets distincts après rechargement, contenu égal ; snapshots d\'avant la copie', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
    t.nouveauGeste(); t.poser(p, trait('a')); await attendre(800)
    t.nouveauGeste(); t.poser(p, trait('b', 20)); await attendre(800)
    const avant = t.film.length
    const q = dupliquer(t, p); await attendre(500)
    expect(t.film.length).toBe(avant + 1)
    expect(t.film.get(avant).page).toBe(q)            // la naissance de la copie est notée sur elle
    expect(t.pageA(t.film.get(avant - 1), q)).toBeNull() // avant : la copie n'existe pas
    expect(t.pageA(t.film.get(avant), q)!.formes.map(f => f.id)).toEqual(['a', 'b'])
    // Rechargement : objets distincts, contenu égal
    const d2 = new Tableau(null)
    Y.applyUpdate(d2.doc, Y.encodeStateAsUpdate(t.doc))
    const fp = d2.formesDe(p)!.get('a'), fq = d2.formesDe(q)!.get('a')
    expect(fp).not.toBe(fq)
    expect(JSON.stringify(fp)).toBe(JSON.stringify(fq))
    // Une page « jetée » puis l'original effacé à l'ancienne : le passé reste lisible dans les instantanés
    d2.pageVue = q
    d2.supprimerPage(p); await attendre(500)
    expect(d2.pageA(d2.film.get(avant - 1), p)!.formes.length).toBe(2)
  })

  it('ordre + carte hors des pages dans une transaction : la carte est dans changedParentTypes', async () => {
    const t = new Tableau(null)
    const a = t.ajouterPage('blanc', 0), b = t.ajouterPage('blanc', 1); await attendre(500)
    const corbeille = t.doc.getMap('corbeille')
    let types: unknown[] = []
    t.doc.on('afterTransaction', (tr: Y.Transaction) => { types = [...tr.changedParentTypes.keys()] })
    t.doc.transact(() => { t.ordre.delete(1, 1); corbeille.set(b, { t: 1, apres: a, index: 1 }) })
    expect(types).toContain(t.ordre)
    expect(types).toContain(corbeille)
    await attendre(500)
    // Avant le lot 3, la règle « every(x => x === ordre) » ne marquait pas
    // l'étape seulOrdre ; depuis le morceau 1, elle ne regarde que les types
    // des pages (la corbeille n'en est pas) : l'étape est seulOrdre (mis à
    // jour au contrôle final)
    expect(t.film.get(t.film.length - 1).seulOrdre).toBe(true)
    // Une écriture dans une carte hors des pages, seule : aucune étape du film
    const l = t.film.length
    t.doc.getMap('nomsPages').set(a, 'Exercice 12'); await attendre(500)
    expect(t.film.length).toBe(l)
  })

  it('envoyer : retrait suivi sur A, arrivée non suivie sur B ; Ctrl+Z sur A rend X, puis l\'étape d\'avant marche', async () => {
    const t = new Tableau(null)
    const A = t.ajouterPage('blanc', 0), B = t.ajouterPage('blanc', 1); await attendre(500)
    t.pageVue = A
    t.nouveauGeste(); t.poser(A, trait('x')); await attendre(800)
    t.nouveauGeste(); t.modifier(A, [{ id: 'x', patch: { x: 50 } }]); await attendre(800)
    // Envoi : arrivée sur B (sans origine), puis retrait de A (suivi par la pile de A)
    const posee = { ...trait('x2'), x: 50 }
    t.pageVue = B
    t.doc.transact(() => t.formesDe(B)!.set('x2', posee))
    t.pageVue = A
    t.nouveauGeste()
    t.annulationDe(A)
    let ajoute: Y.UndoManager['undoStack'][number] | null = null
    t.annulationDe(A)!.once('stack-item-added', (e: { stackItem: Y.UndoManager['undoStack'][number] }) => { ajoute = e.stackItem; e.stackItem.meta.set('envoi', { vers: B, ids: ['x2'] }) })
    t.supprimer(A, ['x']); t.nouveauGeste(); await attendre(800)
    expect(ajoute).not.toBeNull()
    expect(t.annulationDe(B)!.undoStack.length).toBe(0)       // l'arrivée n'est dans aucune pile
    const u = t.annulationDe(A)!
    const item = u.undo()
    expect(item?.meta.get('envoi')).toEqual({ vers: B, ids: ['x2'] })
    expect(t.formesDe(A)!.get('x')!.x).toBe(50)                // X revient sur A, dans sa dernière version
    expect(u.redoStack[u.redoStack.length - 1].meta.has('envoi')).toBe(false) // la méta ne suit pas : à recopier
    // L'application retirerait alors x2 de B (sans origine)
    t.pageVue = B; t.doc.transact(() => t.formesDe(B)!.delete('x2')); t.pageVue = A; await attendre(500)
    // L'étape d'avant (le déplacement) se défait normalement
    expect(u.undo()).not.toBeNull()
    expect(t.formesDe(A)!.get('x')!.x).toBe(0)
    // La revue : X revient d'un coup (déjà passée sur A)
    const film = t.film.toArray()
    expect(t.dejaPassee(film[film.length - 1], A, 'x')).toBe(true)
  })

  it('sans le suivi du retrait, Ctrl+Z sur A ressusciterait une ancienne version de X (le doublon caché)', async () => {
    const t = new Tableau(null)
    const A = t.ajouterPage('blanc', 0), B = t.ajouterPage('blanc', 1); await attendre(500)
    t.pageVue = A
    t.nouveauGeste(); t.poser(A, trait('x')); await attendre(800)
    t.nouveauGeste(); t.modifier(A, [{ id: 'x', patch: { x: 50 } }]); await attendre(800)
    t.doc.transact(() => { t.formesDe(B)!.set('x2', trait('x2')); t.formesDe(A)!.delete('x') })   // envoi sans origine
    await attendre(500)
    t.annulationDe(A)!.undo()                                  // défait « déplacer x »
    expect(t.formesDe(A)!.has('x')).toBe(true)                 // x est revenu sur A…
    expect(t.formesDe(B)!.has('x2')).toBe(true)                // …et sa copie est restée sur B
  })

  it('une étape d\'annulation sans effet est sautée (Yjs dépile jusqu\'à un vrai changement)', async () => {
    const t = new Tableau(null)
    const A = t.ajouterPage('blanc', 0); await attendre(500)
    t.pageVue = A
    t.nouveauGeste(); t.poser(A, trait('y')); await attendre(800)
    t.nouveauGeste(); t.poser(A, trait('x')); await attendre(800)
    t.doc.transact(() => t.formesDe(A)!.delete('x'))          // retirée hors de la pile
    await attendre(500)
    const u = t.annulationDe(A)!
    expect(u.undo()).not.toBeNull()
    expect(t.formesDe(A)!.has('y')).toBe(false)               // c'est « poser y » qui est défait
  })

  it('la revue lit la copie : avant sa naissance, son original (l\'héritage, ajouté par le lot 3)', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
    t.nouveauGeste(); t.poser(p, trait('a')); await attendre(800)
    const q = dupliquer(t, p); await attendre(500)
    const l = lectureDe(t, () => t.ordre.toArray())
    const i = l.film.findIndex(e => e.page === q)
    // Avant le lot 3 : une naissance pleine comptait comme un geste, et la
    // copie n'avait rien avant elle. Depuis : elle continue son original
    expect(l.naissance(i)).toBe(true)
    expect(l.page(i - 1, q)?.formes.map(f => f.id)).toEqual(['a'])
  })
})
