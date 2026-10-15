// Les réglages par défaut (après le lot 5, le choix du professeur) : toute
// page qui naît vide est une page blanche — la première d'un tableau vide ou
// d'un classeur neuf, celles qu'insère ou ajoute la trieuse — quel que soit
// le fond de la page voisine ; une page dupliquée garde le sien (c'est une
// copie) ; les pages qui existent ne changent pas. Le trait fin au démarrage
// et le zoom à 100 % quand on change de page se vérifient dans le navigateur
// (lot5/R-defauts.mjs) ; le cadrage d'une page jamais regardée, dans
// tests/vue.test.ts (vueAuDebut).
import { describe, expect, it } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../src/document'
import { FONDS, FOND_NEUF } from '../src/types'
import type { Fond } from '../src/types'
import { etatNeuf } from '../src/classeurs/neuf'
import { JournalPages } from '../src/pages/journal'
import * as actions from '../src/pages/actions'

const attendre = () => new Promise(r => setTimeout(r, 0))

describe('le fond d\'une page neuve', () => {
  it('c\'est la page blanche, le premier des fonds des menus', () => {
    expect(FOND_NEUF).toBe('blanc')
    expect(FONDS[0]).toEqual({ id: 'blanc', nom: 'Page blanche' })
  })

  it('la première page d\'un tableau vide (un navigateur neuf, une base vide) est blanche', async () => {
    const t = new Tableau(null)
    const { vide } = await t.charger()
    expect(vide).toBe(true)
    expect(t.ordre.length).toBe(1)
    expect(t.fondDe(t.ordre.get(0))).toBe('blanc')
    // Un tableau qui a déjà des pages n'en reçoit pas, et elles gardent leur fond
    const u = new Tableau(null)
    const p = u.ajouterPage('carreaux', 0)
    await u.charger()
    expect(u.ordre.toArray()).toEqual([p])
    expect(u.fondDe(p)).toBe('carreaux')
  })

  it('un classeur neuf a la page au fond qu\'on choisit (la fenêtre coche la page blanche)', async () => {
    for (const fond of ['blanc', 'seyes'] as Fond[]) {
      const d = new Y.Doc()
      Y.applyUpdate(d, await etatNeuf(fond))
      const ordre = d.getArray<string>('ordre').toArray()
      expect(ordre.length).toBe(1)
      expect((d.getMap('pages').get(ordre[0]) as Y.Map<unknown>).get('fond')).toBe(fond)
    }
  })

  it('la trieuse : insérer avant, après, ajouter à la fin donnent une page blanche, même entre deux pages quadrillées ; un autre fond choisi est pris', async () => {
    const t = new Tableau(null)
    const a = t.ajouterPage('carreaux', 0), b = t.ajouterPage('seyes', 1)
    await attendre()
    const j = new JournalPages(t)
    const avant = actions.inserer(t, j, b, 'avant')!
    const apres = actions.inserer(t, j, b, 'apres')!
    const fin = actions.ajouterALaFin(t, j)!
    for (const r of [avant, apres, fin]) expect(t.fondDe(r.page)).toBe('blanc')
    expect(t.fondDe(actions.inserer(t, j, a, 'apres', 'millimetre')!.page)).toBe('millimetre')
    // Les pages d'avant ne changent pas
    expect(t.fondDe(a)).toBe('carreaux')
    expect(t.fondDe(b)).toBe('seyes')
  })

  it('une page dupliquée garde son fond (tableau et trieuse) : c\'est une copie', async () => {
    const t = new Tableau(null)
    const a = t.ajouterPage('repere', 0), b = t.ajouterPage('pointe', 1)
    await attendre()
    const q = t.dupliquerPage(a)!
    expect(t.fondDe(q)).toBe('repere')
    const j = new JournalPages(t)
    const r = actions.dupliquer(t, j, [b])!
    expect(r.copies.map(c => t.fondDe(c.copie))).toEqual(['pointe'])
  })

  it('une page sans fond noté se lit blanche (comme avant)', () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0)
    ;(t.pages.get(p) as Y.Map<unknown>).delete('fond')
    expect(t.fondDe(p)).toBe('blanc')
  })
})
