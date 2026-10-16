// Vérification « données et replay » du lot 5 (d2) : ce que d1-parcours.mjs a
// écrit (le .memc et le film élève d'un classeur où l'on a fait tous les
// gestes du lot 5) se relit exactement dans le lot 5 et dans son lecteur.
// (Rangé dans le dépôt : la lecture par la version d'avant le lot 5, construite
// depuis un commit qui n'existe plus, est retirée.)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { readFileSync } from 'node:fs'
import * as Y from 'yjs'
import { describe, expect, it } from 'vitest'
import { Tableau } from '../../../../../../src/document'
import { lireTableau } from '../../../../../../src/fichier'
import { lireFilm } from '../../../../../../src/revoir/format'
import { Bobine } from '../../../../../../src/revoir/bobine'
import { exporterDetaille, seancesDuFilm } from '../../../../../../src/revoir/exporter'


const D = `${RACINE_ESSAIS}/lot5/verif/donnees/sorties`
const trier = (v: unknown): unknown => Array.isArray(v) ? v.map(trier) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, trier((v as Record<string, unknown>)[k])])) : v
const memc = new Uint8Array(readFileSync(D + '/d1.memc'))
const attendu = JSON.parse(readFileSync(D + '/d1-etat.json', 'utf8')) as { etat: Record<string, Record<string, string>>; film: string; ordre: string[] }
const etatDe = (t: { ordre: Y.Array<string>; formesDe(p: string): Y.Map<unknown> | null }) => {
  const r: Record<string, Record<string, string>> = {}
  for (const p of t.ordre.toArray()) r[p] = Object.fromEntries([...(t.formesDe(p)?.entries() ?? [])].sort(([x], [y]) => x < y ? -1 : 1).map(([id, f]) => [id, JSON.stringify(trier(f))]))
  return r
}

describe('le .memc du lot 5', () => {
  it('se relit dans le lot 5 exactement (toutes les formes, le film et ses notes)', () => {
    const lu = lireTableau(memc)
    const t = new Tableau(null)
    Y.applyUpdate(t.doc, lu.etat, 'film')
    expect(t.ordre.toArray()).toEqual(attendu.ordre)
    expect(etatDe(t)).toEqual(attendu.etat)
    const notes = t.film.toArray().map(e => e.reglage ? 'R' : e.coupe ? 'C' : e.seulOrdre ? 'O' : e.naissance ? 'N' : 'G').join('')
    expect(notes).toBe(attendu.film)
  })
})

describe('le film élève du lot 5', () => {
  it('se lit dans le lecteur du lot 5 : sa bobine va jusqu\'au bout', async () => {
    const texte = readFileSync(D + '/d1.mem', 'utf8')
    const f = await lireFilm(texte)
    const b = new Bobine(f)
    for (let k = 0; k < b.n; k++) { b.image(k); b.nouvelles(k); b.tracees(k); b.attente(k); b.trace(k) }
    expect(f.ordre.reduce((n, p) => n + b.image(b.n - 1, p).formes.length, 0)).toBeGreaterThan(0)
    expect(f.etapes.filter(e => e.coupe).length).toBeGreaterThan(0)
  })
})

describe('le lot 5 : un classeur du lot 5 rouvert ici rejoue pareil', () => {
  it('l\'exporteur sur le .memc relu donne le même film que dans le navigateur', async () => {
    const lu = lireTableau(memc)
    const t = new Tableau(null)
    Y.applyUpdate(t.doc, lu.etat, 'film')
    const s = seancesDuFilm(t.film.toArray())[0]
    const f = exporterDetaille(t, { de: s.de, a: s.a, pages: t.ordre.toArray(), titre: 'Lot 5, données' }).film
    const enregistre = await lireFilm(readFileSync(D + '/d1.mem', 'utf8'))
    expect(f.etapes.length).toBe(enregistre.etapes.length)
    expect(JSON.stringify(f.etapes.map(e => e.o))).toBe(JSON.stringify(enregistre.etapes.map(e => e.o)))
  })
})
