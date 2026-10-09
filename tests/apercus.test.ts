// Peindre une page hors de l'écran : ce qui se teste sous Node. Le choix de
// l'image d'une formule à peindre (la même échelle, sinon la plus petite des
// plus grandes, jamais une plus petite) et le cadrage d'une vignette (la
// boîte du contenu entière, sa marge, le zoom plafonné ; une page vide ; une
// page démesurée). La peinture elle-même se vérifie dans le navigateur
// (scratchpad lot3/P4-apercus.mjs).
import { describe, expect, it } from 'vitest'
import { arrondirEchelle, meilleureEchelle } from '../src/sorties/formules'
import { MARGE_VIGNETTE, ZOOM_VIDE, ZOOM_VIGNETTE, cadrageVignette } from '../src/pages/vignettes'
import { boiteDesNoms } from '../src/sorties/apercu'
import { boiteDe } from '../src/revoir/bobine'
import type { Polygone } from '../src/types'

describe("l'échelle des formules", () => {
  it('arrondit au 1/20, jamais à zéro', () => {
    expect(arrondirEchelle(1)).toBe(1)
    expect(arrondirEchelle(1.24)).toBe(1.25)
    expect(arrondirEchelle(2.083)).toBe(2.1)
    expect(arrondirEchelle(0.6 * 2)).toBe(1.2)
    expect(arrondirEchelle(0.001)).toBe(0.05)
    expect(arrondirEchelle(0)).toBe(0.05)
  })

  it("prend l'image de l'échelle voulue quand elle est prête", () => {
    expect(meilleureEchelle([0.5, 1.25, 2.1], 1.25)).toBe(1.25)
    // 1,26 s'arrondit à 1,25 : la même image
    expect(meilleureEchelle([1.25], 1.26)).toBe(1.25)
  })

  it('sinon la plus petite des plus grandes (réduite, elle reste nette)', () => {
    expect(meilleureEchelle([0.5, 1.25, 2.1, 4], 1)).toBe(1.25)
    expect(meilleureEchelle(new Set([4, 2.1]), 1.2)).toBe(2.1)
    expect(meilleureEchelle([1.25], 0.3)).toBe(1.25)
  })

  it("jamais une plus petite (agrandie, elle serait floue) : rien, on attend", () => {
    expect(meilleureEchelle([0.5, 1.25], 2.1)).toBeNull()
    expect(meilleureEchelle([], 1)).toBeNull()
  })
})

describe("le cadrage d'une vignette", () => {
  it('montre tout le contenu, avec sa marge, centré', () => {
    const b = { x: 100, y: 50, l: 2000, h: 1000 }
    const c = cadrageVignette(b, 240, 180)
    // La largeur commande : 240 px pour 2000 + 2 × 16 unités
    expect(c.z).toBeCloseTo(240 / (2000 + 2 * MARGE_VIGNETTE))
    // Le centre de la boîte au centre de la vignette
    expect((b.x + b.l / 2) * c.z + c.x).toBeCloseTo(120)
    expect((b.y + b.h / 2) * c.z + c.y).toBeCloseTo(90)
    // Les bords de la boîte (avec la marge) dans la vignette
    expect((b.x - MARGE_VIGNETTE) * c.z + c.x).toBeGreaterThanOrEqual(-1e-9)
    expect((b.x + b.l + MARGE_VIGNETTE) * c.z + c.x).toBeLessThanOrEqual(240 + 1e-9)
    expect(b.y * c.z + c.y).toBeGreaterThanOrEqual(0)
    expect((b.y + b.h) * c.z + c.y).toBeLessThanOrEqual(180)
  })

  it('un contenu haut : la hauteur commande', () => {
    const c = cadrageVignette({ x: 0, y: 0, l: 300, h: 4000 }, 240, 180)
    expect(c.z).toBeCloseTo(180 / (4000 + 2 * MARGE_VIGNETTE))
  })

  it('un petit contenu ne grossit pas au-delà du zoom plafond', () => {
    const c = cadrageVignette({ x: 500, y: 500, l: 20, h: 10 }, 240, 180)
    expect(c.z).toBe(ZOOM_VIGNETTE)
    expect((510) * c.z + c.x).toBeCloseTo(120)
    expect((505) * c.z + c.y).toBeCloseTo(90)
  })

  it('une boîte plate (un trait horizontal, un point seul) se cadre aussi', () => {
    const plat = cadrageVignette({ x: 0, y: 200, l: 1000, h: 0 }, 240, 180)
    expect(plat.z).toBeCloseTo(240 / (1000 + 2 * MARGE_VIGNETTE))
    expect(Number.isFinite(plat.x) && Number.isFinite(plat.y)).toBe(true)
    const point = cadrageVignette({ x: 30, y: 40, l: 0, h: 0 }, 240, 180)
    expect(point.z).toBe(ZOOM_VIGNETTE)
  })

  it('une page démesurée tient quand même dans sa vignette (pas de plancher de zoom)', () => {
    const c = cadrageVignette({ x: 0, y: 0, l: 1200, h: 200000 }, 240, 180)
    expect(c.z).toBeCloseTo(180 / (200000 + 2 * MARGE_VIGNETTE))
    expect(c.z).toBeLessThan(0.1)
    expect(c.z).toBeGreaterThan(0)
  })

  it('une page vide : son fond seul, au zoom de la page vide, comme la vue neutre', () => {
    expect(cadrageVignette(null, 240, 180)).toEqual({ x: 120 * ZOOM_VIDE, y: 120 * ZOOM_VIDE, z: ZOOM_VIDE })
    // Une vignette sans taille ne fait pas de division par zéro
    expect(cadrageVignette({ x: 0, y: 0, l: 10, h: 10 }, 0, 0).z).toBe(ZOOM_VIDE)
  })
})

// La boîte d'une figure pour les sorties (l'image copiée, le PDF) compte
// les noms de ses points : un nom déplacé au-dessus de son point (jusqu'à
// 70 unités) dépasse la boîte de boiteDe, qui n'ajoute que 28 unités autour
// des sommets ; il ne doit pas sortir du cadre ni être tranché par une coupe.
describe('les noms des points dans la boîte des sorties', () => {
  const triangle = (o: Partial<Polygone> = {}): Polygone => ({
    id: 't', type: 'polygone', x: 100, y: 100, z: 1, auteur: 'a', pts: [0, 300, 400, 300, 200, 0], ferme: true,
    couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], ...o,
  })

  it('un nom déplacé de 66 unités au-dessus du sommet est dans la boîte ; la boîte de boiteDe ne l\'a pas', () => {
    const f = triangle({ posNoms: [null, null, { x: 0, y: -66 }] })
    const b = boiteDesNoms(f)!
    // Le nom C est centré à y = 100 - 66 = 34, haut de 1,2 × 22
    expect(b.y).toBeCloseTo(34 - 13.2, 6)
    expect(boiteDe(f)!.y).toBeGreaterThan(34)
    expect(b.y).toBeLessThan(boiteDe(f)!.y)
  })

  it('un nom caché, une figure sans sommets montrés : rien ; la taille et la longueur du nom comptent', () => {
    expect(boiteDesNoms(triangle({ sommets: false }))).toBeNull()
    const seul = triangle({ noms: ['', '', 'C_10'], styleNoms: [null, null, { taille: 40 }] })
    const b = boiteDesNoms(seul)!
    // « C10 » : trois caractères de 0,7 × 40, haut de 48
    expect(b.l).toBeCloseTo(3 * 0.7 * 40, 6)
    expect(b.h).toBeCloseTo(48, 6)
    expect(boiteDesNoms(triangle({ noms: ['A', 'B', 'C'], styleNoms: [{ cache: true }, { cache: true }, { cache: true }] }))).toBeNull()
  })
})
