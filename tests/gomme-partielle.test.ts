// La gomme qui efface là où elle passe (lot 5) : le calcul de la coupe
// (gomme.ts), son écriture (Tableau.couperTraits : une étape d'annulation
// par coup, une étape du film par trait touché, notée « coupe ») et le
// replay qui ne réinvente pas l'écriture des morceaux (l'exporteur garde la
// note, la bobine n'esquisse rien à cette étape).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import type { Trait } from '../src/types'
import { couperTrait, traverse } from '../src/gomme'
import { exporter } from '../src/revoir/exporter'
import { ecrireFilm, lireFilm } from '../src/revoir/format'
import { Bobine } from '../src/revoir/bobine'

let horloge = new Date('2026-10-12T08:00:00').getTime()
let numero = 0
let tableaux: Tableau[] = []

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Le temps passe (voir gomme.test.ts) : l'annulation vieillit d'autant, et le film note l'étape */
async function attendre(ms: number) {
  horloge += ms; vi.setSystemTime(horloge)
  for (const t of tableaux) for (const p of t.ordre.toArray()) {
    const u = t.annulationDe(p)
    if (u && u.lastChange > 0) u.lastChange -= ms
  }
  await Promise.resolve(); await Promise.resolve()
}

/** Une ligne horizontale de x0 à x1 (monde), un point tous les `pas`, en (x, y) */
function ligne(x: number, y: number, longueur: number, pas: number, o: Partial<Trait> = {}): Trait {
  const pts: number[] = []
  for (let d = 0; d <= longueur + 1e-9; d += pas) pts.push(Math.round(d * 10) / 10, 0, Math.round((0.3 + 0.4 * d / longueur) * 100) / 100)
  return { id: 'T' + numero++, type: 'trait', x, y, z: 1000 + numero, auteur: 'moi', pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: true, ...o }
}

/** Les points absolus d'un trait : [x, y, pression] */
function absolus(t: Trait): number[][] {
  const r: number[][] = []
  for (let i = 0; i < t.pts.length; i += 3) r.push([t.x + t.pts[i], t.y + t.pts[i + 1], t.pts[i + 2]])
  return r
}

describe('couperTrait (gomme.ts)', () => {
  it('au milieu : deux morceaux, les pressions gardées, le plus long garde l\'identifiant', () => {
    const t = ligne(0, 0, 200, 2)
    // Une gomme de 10 posée en x = 80 (sans glisser : a = b)
    const r = couperTrait(t, { x: 80, y: 0 }, { x: 80, y: 0 }, 10)!
    expect(r).toHaveLength(2)
    const [g, d] = r
    // Le bord : à 10 + 1,5 du centre de la gomme
    expect(absolus(g).at(-1)![0]).toBeCloseTo(80 - 11.5, 1)
    expect(absolus(d)[0][0]).toBeCloseTo(80 + 11.5, 1)
    // Le plus long (le morceau de droite) garde l'identifiant ; l'autre est neuf
    expect(d.id).toBe(t.id)
    expect(g.id).not.toBe(t.id)
    // Chaque point gardé a la pression qu'il avait ; le point du bord, l'interpolée
    const avant = new Map(absolus(t).map(p => [p[0].toFixed(1), p[2]]))
    for (const p of [...absolus(g).slice(0, -1), ...absolus(d).slice(1)]) expect(p[2]).toBe(avant.get(p[0].toFixed(1)))
    expect(absolus(g).at(-1)![2]).toBeCloseTo(0.3 + 0.4 * 68.5 / 200, 2)
    // Tout le reste du trait est gardé : couleur, taille, opacité, pression, z, auteur
    for (const m of r) for (const k of ['type', 'couleur', 'taille', 'opacite', 'pression', 'z', 'auteur'] as const) expect(m[k]).toBe(t[k])
  })

  it('au bout : un seul morceau, sous le même identifiant', () => {
    const t = ligne(0, 0, 200, 2)
    const r = couperTrait(t, { x: 200, y: 0 }, { x: 200, y: 0 }, 10)!
    expect(r).toHaveLength(1)
    expect(r[0].id).toBe(t.id)
    expect(absolus(r[0]).at(-1)![0]).toBeCloseTo(200 - 11.5, 1)
    expect(r[0].x).toBe(t.x)
  })

  it('toute la gomme sur le trait : il part en entier ([])', () => {
    const t = ligne(0, 0, 20, 2)
    expect(couperTrait(t, { x: 10, y: 0 }, { x: 10, y: 0 }, 30)).toEqual([])
  })

  it('loin du trait : rien (null), même tout près de sa boîte', () => {
    const t = ligne(0, 0, 200, 2)
    expect(couperTrait(t, { x: 80, y: 20 }, { x: 120, y: 20 }, 10)).toBeNull()
    expect(couperTrait(t, { x: -30, y: 0 }, { x: -30, y: 0 }, 10)).toBeNull()
  })

  it('une gomme rapide, entre deux positions loin l\'une de l\'autre, coupe quand même', () => {
    const t = ligne(0, 0, 200, 2)
    // De (100, −50) à (100, 50) d'un seul mouvement : aucune des deux positions ne touche le trait
    const r = couperTrait(t, { x: 100, y: -50 }, { x: 100, y: 50 }, 6)!
    expect(r).toHaveLength(2)
    expect(absolus(r[0]).at(-1)![0]).toBeCloseTo(100 - 7.5, 1)
    expect(absolus(r[1])[0][0]).toBeCloseTo(100 + 7.5, 1)
    // En biais aussi
    const b = couperTrait(t, { x: 60, y: -40 }, { x: 140, y: 40 }, 6)!
    expect(b).toHaveLength(2)
  })

  it('un trait agrandi aux points espacés (aucun point sous la gomme) se coupe à ses deux bords', () => {
    const t = ligne(0, 0, 400, 100)       // 5 points : 0, 100, 200, 300, 400
    const r = couperTrait(t, { x: 150, y: 0 }, { x: 150, y: 0 }, 10)!
    expect(r).toHaveLength(2)
    expect(absolus(r[0]).map(p => p[0])).toEqual([0, 100, 138.5])
    expect(absolus(r[1]).map(p => p[0])).toEqual([161.5, 200, 300, 400])
  })

  it('les points loin de la gomme sont ceux d\'origine (aucun point ajouté ailleurs)', () => {
    const t = { ...ligne(3.25, -7.5, 300, 7), pression: false }
    const r = couperTrait(t, { x: 150, y: -7.5 }, { x: 160, y: -7.5 }, 8)!
    expect(r).toHaveLength(2)
    const avant = absolus(t)
    const loin = (p: number[]) => Math.abs(p[0] - 155) > 30
    const gardes = [...absolus(r[0]), ...absolus(r[1])].filter(loin)
    expect(gardes.length).toBe(avant.filter(loin).length)
    for (const p of gardes) {
      const o = avant.find(q => Math.abs(q[0] - p[0]) < 0.06 && Math.abs(q[1] - p[1]) < 0.06)
      expect(o).toBeTruthy()
      expect(p[2]).toBe(o![2])
    }
    // Un seul point neuf à chaque bord coupé : le compte est celui d'origine, moins
    // ce qui était sous la gomme, plus deux
    const sous = avant.filter(p => Math.abs(p[0] - 155) <= 5 + 8 + 1.5).length
    expect(r[0].pts.length / 3 + r[1].pts.length / 3).toBe(avant.length - sous + 2)
  })

  it('les miettes partent', () => {
    // Une gomme de 10 en x = 14 sur un trait de 0 à 200 : il reste [0 ; 2,5] à gauche, une miette
    const t = ligne(0, 0, 200, 1)
    const r = couperTrait(t, { x: 14, y: 0 }, { x: 14, y: 0 }, 10)!
    expect(r).toHaveLength(1)
    expect(absolus(r[0])[0][0]).toBeCloseTo(25.5, 1)
  })

  it('le surligneur reste un surligneur (son opacité, sa taille)', () => {
    const t = ligne(0, 0, 200, 2, { opacite: 0.35, taille: 15, pression: false, couleur: '#ffd400' })
    const r = couperTrait(t, { x: 100, y: 0 }, { x: 100, y: 0 }, 6)!
    expect(r).toHaveLength(2)
    for (const m of r) { expect(m.opacite).toBe(0.35); expect(m.taille).toBe(15); expect(m.couleur).toBe('#ffd400') }
    // Sa demi-épaisseur compte : il est coupé à 6 + 7,5 du centre
    expect(absolus(r[0]).at(-1)![0]).toBeCloseTo(100 - 13.5, 1)
  })

  it('le groupe et le verrou (lot 5) restent ceux du trait', () => {
    const t = ligne(0, 0, 200, 2, { groupe: 'g1' })
    const r = couperTrait(t, { x: 100, y: 0 }, { x: 100, y: 0 }, 6)!
    for (const m of r) expect(m.groupe).toBe('g1')
  })

  it('les points relatifs à son premier, arrondis au dixième, la pression au centième', () => {
    const t = ligne(0.37, 0, 200, 3)
    const r = couperTrait(t, { x: 100.123, y: 0.4567 }, { x: 103.789, y: 0.4567 }, 7.3)!
    for (const m of r) {
      expect(m.pts[0]).toBe(0); expect(m.pts[1]).toBe(0)
      for (let i = 0; i < m.pts.length; i += 3) {
        expect(Math.abs(m.pts[i] * 10 - Math.round(m.pts[i] * 10))).toBeLessThan(1e-9)
        expect(Math.abs(m.pts[i + 2] * 100 - Math.round(m.pts[i + 2] * 100))).toBeLessThan(1e-9)
      }
    }
  })

  it('traverse : la part d\'un côté dans la capsule', () => {
    const it = traverse({ x: -10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: -5 }, { x: 0, y: 5 }, 2)!
    expect(it[0]).toBeCloseTo(0.4); expect(it[1]).toBeCloseTo(0.6)
    expect(traverse({ x: -10, y: 10 }, { x: 10, y: 10 }, { x: 0, y: -5 }, { x: 0, y: 5 }, 2)).toBeNull()
    // Par le disque d'un bout
    const d = traverse({ x: -10, y: 6 }, { x: 10, y: 6 }, { x: 0, y: -5 }, { x: 0, y: 5 }, 2)!
    expect(d[0]).toBeCloseTo(0.5 - Math.sqrt(3) / 20); expect(d[1]).toBeCloseTo(0.5 + Math.sqrt(3) / 20)
  })
})

/** Un tableau d'une page avec trois traits, posés chacun en son geste */
async function tableauATroisTraits() {
  const t = new Tableau(null)
  tableaux = [t]
  const page = t.ajouterPage('blanc', 0)
  t.pageVue = page
  await attendre(1000)
  const traits = [ligne(0, 0, 200, 2), ligne(0, 100, 200, 2), ligne(0, 200, 200, 2)]
  for (const f of traits) { t.nouveauGeste(); t.poser(page, f); await attendre(1000) }
  return { t, page, traits }
}

describe('Tableau.couperTraits', () => {
  it('une étape d\'annulation ; Ctrl+Z rend le trait entier ; une étape du film notée coupe', async () => {
    const { t, page, traits } = await tableauATroisTraits()
    const pile = t.annulationDe(page)!.undoStack.length, film = t.film.length
    const morceaux = couperTrait(traits[0], { x: 100, y: 0 }, { x: 100, y: 0 }, 10)!
    t.nouveauGeste()
    t.couperTraits(page, [{ id: traits[0].id, morceaux }])
    await attendre(10)
    const formes = t.formesDe(page)!
    expect(formes.size).toBe(4)
    expect(t.annulationDe(page)!.undoStack.length).toBe(pile + 1)
    expect(t.film.length).toBe(film + 1)
    expect(t.film.get(t.film.length - 1).coupe).toBe(true)
    // Le morceau qui garde l'identifiant est écrit entier
    expect(formes.get(traits[0].id)).toEqual(morceaux.find(m => m.id === traits[0].id))
    t.annuler(page)
    expect(t.formesDe(page)!.size).toBe(3)
    expect(t.formesDe(page)!.get(traits[0].id)).toEqual(traits[0])
  })

  it('un trait sans morceau part ; un trait qui n\'est plus sur la page est ignoré', async () => {
    const { t, page, traits } = await tableauATroisTraits()
    t.nouveauGeste()
    t.couperTraits(page, [{ id: traits[1].id, morceaux: [] }, { id: 'absent', morceaux: [traits[0]] }])
    await attendre(10)
    expect([...t.formesDe(page)!.keys()].sort()).toEqual([traits[0].id, traits[2].id].sort())
    const film = t.film.length
    t.couperTraits(page, [{ id: 'absent', morceaux: [] }])
    await attendre(10)
    expect(t.film.length).toBe(film)
  })

  it('un coup lent sur trois traits : une étape d\'annulation, trois étapes coupe', async () => {
    const { t, page, traits } = await tableauATroisTraits()
    const pile = t.annulationDe(page)!.undoStack.length, film = t.film.length
    t.nouveauGeste(); t.gesteLong()
    for (const f of traits) {
      t.couperTraits(page, [{ id: f.id, morceaux: couperTrait(f, { x: 100, y: f.y - 30 }, { x: 100, y: f.y + 30 }, 8)! }])
      await attendre(700)
    }
    t.finGesteLong()
    expect(t.formesDe(page)!.size).toBe(6)
    expect(t.annulationDe(page)!.undoStack.length).toBe(pile + 1)
    const etapes = t.film.toArray().slice(film)
    expect(etapes).toHaveLength(3)
    expect(etapes.every(e => e.coupe === true && !e.reglage)).toBe(true)
    t.annuler(page)
    expect([...t.formesDe(page)!.keys()].sort()).toEqual(traits.map(f => f.id).sort())
  })
})

describe('le replay ne réinvente pas l\'écriture des morceaux', () => {
  it('l\'exporteur garde la note ; la bobine n\'esquisse rien à cette étape', async () => {
    const { t, page, traits } = await tableauATroisTraits()
    const de = t.film.length
    t.nouveauGeste(); t.gesteLong()
    t.couperTraits(page, [{ id: traits[0].id, morceaux: couperTrait(traits[0], { x: 60, y: 0 }, { x: 60, y: 0 }, 8)! }])
    await attendre(700)
    t.finGesteLong()
    // Un geste ordinaire ensuite : il n'a pas la note
    t.nouveauGeste(); t.poser(page, ligne(0, 300, 50, 5)); await attendre(500)
    const film = exporter(t, { de: 1, a: t.film.length - 1, pages: [page], titre: 'x' })
    const relu = await lireFilm(await ecrireFilm(film))
    const coupes = relu.etapes.filter(e => e.coupe)
    expect(coupes).toHaveLength(1)
    // Le plus long morceau change (il garde l'identifiant), l'autre apparaît
    const o = coupes[0].o
    expect(o.filter(x => x[0] === '=')).toHaveLength(2)
    expect(o.some(x => x[0] === '=' && x[1].id === traits[0].id)).toBe(true)
    const b = new Bobine(relu)
    const k = relu.etapes.indexOf(coupes[0]) + 1
    expect(b.coupe(k)).toBe(true)
    expect(b.coupe(k + 1)).toBe(false)
    expect(b.main(k)).toBeNull()
    // Le morceau neuf apparaît bien (le lecteur le montre, d'un coup)
    expect(b.ajoutees(k).size).toBe(1)
    expect(b.image(k, page).formes.filter(f => f.type === 'trait')).toHaveLength(4)
    expect(de).toBeGreaterThan(0)
  })
})
