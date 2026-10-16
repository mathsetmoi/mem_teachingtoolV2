// Essais de la critique de la spécification du lot 3 (hypothèses Yjs)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as Y from 'yjs'
import { Tableau } from '../../../../../src/document'
import type { Forme, Trait } from '../../../../../src/types'
import { exporterDetaille, seancesDuFilm } from '../../../../../src/revoir/exporter'

let horloge = new Date('2026-10-07T08:00:00').getTime()
beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }
let n = 0
const trait = (id: string, x = 0, pts = 6): Trait => {
  const p: number[] = []
  for (let i = 0; i < pts; i++) p.push(Math.round(Math.random() * 400 * 10) / 10, Math.round(Math.random() * 400 * 10) / 10, 0.5)
  return { id, type: 'trait', x, y: 0, z: n++, auteur: 'm', pts: p, couleur: '#000', taille: 3, opacite: 1, pression: false }
}

describe('critique', () => {
  it('déplacer des pages : remplacer tout l\'ordre ou déplacer seulement les pages tirées', async () => {
    const mesurer = async (complet: boolean) => {
      const t = new Tableau(null)
      const pages: string[] = []
      for (let i = 0; i < 60; i++) { pages.push(t.ajouterPage('carreaux', i)) }
      await attendre(500)
      const avant = Y.encodeStateAsUpdate(t.doc).length
      for (let k = 0; k < 200; k++) {
        const o = t.ordre.toArray()
        const id = o[k % 60], dest = (k * 7) % 59
        const sans = o.filter(x => x !== id)
        sans.splice(dest, 0, id)
        if (complet) t.doc.transact(() => { t.ordre.delete(0, t.ordre.length); t.ordre.insert(0, sans) })
        else t.doc.transact(() => { t.ordre.delete(o.indexOf(id), 1); t.ordre.insert(dest, [id]) })
        await attendre(50)
      }
      const apres = Y.encodeStateAsUpdate(t.doc).length
      const derniere = t.film.get(t.film.length - 1)
      const t0 = performance.now()
      for (let r = 0; r < 200; r++) t.etatA(derniere)
      const etat = (performance.now() - t0) / 200
      return { croissance: apres - avant, snapshot: derniere.s.length, etatA_ms: etat }
    }
    const c = await mesurer(true), m = await mesurer(false)
    console.log('remplacer tout l\'ordre :', JSON.stringify(c))
    console.log('déplacer seulement      :', JSON.stringify(m))
    expect(c.croissance).toBeGreaterThan(m.croissance * 2)
  })

  // Le risque que la critique signalait est levé depuis le morceau 1 (une
  // marque ne vaut plus pour une page supprimée définitivement) : l'essai
  // vérifie maintenant que Ctrl+Z ne la rend PAS (mis à jour au contrôle final)
  it('une marque du lot 2 ne rend pas une page « supprimée définitivement »', async () => {
    const t = new Tableau(null)
    const a = t.ajouterPage('blanc', 0), b = t.ajouterPage('blanc', 1); await attendre(500)
    t.pageVue = b; t.nouveauGeste(); t.poser(b, trait('x')); await attendre(800)
    t.pageVue = a
    expect(t.jeterPage(b, a)).toBe(true); await attendre(500)
    // ce que ferait supprimerDefinitivement (morceau 1) : une entrée definitif, rien d'autre
    t.doc.getMap('corbeille').set(b, { t: Date.now(), definitif: true }); await attendre(500)
    t.annuler(a)                                         // Ctrl+Z ne la remet pas dans l'ordre
    expect(t.ordre.toArray()).not.toContain(b)
    expect(t.ordre.toArray()).toEqual([a])
  })

  it('dupliquer une page chargée : ce que le document gagne (pas le film)', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
    t.doc.transact(() => { const f = t.formesDe(p)!; for (let i = 0; i < 300; i++) f.set('t' + i, trait('t' + i, 0, 60)) })
    await attendre(500)
    const avant = Y.encodeStateAsUpdate(t.doc).length, film = t.film.length
    const q = 'Q'
    t.pageVue = q
    t.doc.transact(() => {
      const m = new Y.Map<unknown>(); m.set('fond', 'carreaux'); m.set('herite', { de: p })
      const f = new Y.Map<Forme>(); for (const [id, x] of t.formesDe(p)!) f.set(id, JSON.parse(JSON.stringify(x)))
      m.set('formes', f); t.pages.set(q, m); t.ordre.insert(1, [q])
    })
    t.pageVue = p
    await attendre(500)
    const apres = Y.encodeStateAsUpdate(t.doc).length
    console.log('page de 300 traits de 60 points :', avant, 'octets ; après la copie :', apres, '(+', apres - avant, ') ; étapes du film +', t.film.length - film,
      '; taille de l\'instantané de la naissance :', t.film.get(t.film.length - 1).s.length)
  })

  // Exploratoire (rien n'est vérifié) : une copie faite à la main, sans
  // dupliquerPage, n'a pas la note « naissance » ; dupliquerPage la pose
  // (voir tests/heritage.test.ts)
  it('une copie faite à la main (sans dupliquerPage) : sa naissance compte encore pour un geste dans seancesDuFilm', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p; await attendre(500)
    t.nouveauGeste(); t.poser(p, trait('a')); await attendre(800)
    await attendre(60 * 60_000)                         // une heure plus tard, le soir
    const q = 'Q'
    t.pageVue = q
    t.doc.transact(() => {
      const m = new Y.Map<unknown>(); m.set('fond', 'carreaux'); m.set('herite', { de: p })
      const f = new Y.Map<Forme>(); for (const [id, x] of t.formesDe(p)!) f.set(id, JSON.parse(JSON.stringify(x)))
      m.set('formes', f); t.pages.set(q, m); t.ordre.insert(1, [q])
    })
    t.pageVue = p
    await attendre(500)
    const s = seancesDuFilm(t.film.toArray())
    console.log('séances :', s.map(x => ({ gestes: x.gestes, pages: x.pages.length })))
    // aujourd'hui (sans héritage), l'export de cette « séance » montre la copie paraître d'un coup
    const e = exporterDetaille(t, { de: s[0].de, a: s[0].a, pages: [q], titre: '' })
    console.log('film élève de la « séance » de la copie :', e.film.etapes.length, 'geste(s)')
  })
})
