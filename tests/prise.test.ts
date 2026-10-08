// Ce que vise la sélection : la distance au tracé de chaque forme (épaisseur
// déduite), ce qui a un intérieur (plein ou nu), et l'aire qui départage deux
// intérieurs. Le choix entre plusieurs objets (le tracé le plus proche, puis
// le plus petit intérieur) se vérifie dans le navigateur.
import { describe, expect, it } from 'vitest'
import { aireDe, dansImage, distanceAuTrace, interieur } from '../src/geometrie'
import type { Cercle, Forme, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'

const base = { z: 1, auteur: 'moi' }
const trait = (x: number, y: number, pts: number[], taille = 4): Trait =>
  ({ ...base, id: 't', type: 'trait', x, y, pts, couleur: '#000', taille, opacite: 1, pression: false })
const poly = (pts: number[], o: Partial<Polygone> = {}): Polygone =>
  ({ ...base, id: 'p', type: 'polygone', x: 0, y: 0, pts, ferme: true, couleur: '#000', taille: 2, ...o })
const cercle = (r: number, o: Partial<Cercle> = {}): Cercle =>
  ({ ...base, id: 'c', type: 'cercle', x: 0, y: 0, r, couleur: '#000', taille: 2, ...o })
const formule: Formule = { ...base, id: 'f', type: 'formule', x: 0, y: 0, latex: 'x^2', couleur: '#000', taille: 28 }
const boiteFormule = { x: 0, y: 0, l: 100, h: 40 }
/** Une image de 100 × 50 px, tournée d'un quart de tour (et agrandie k fois) */
const imageTournee = (k = 1): ImageForme =>
  ({ ...base, id: 'i', type: 'image', x: 0, y: 0, src: 's', l: 100, h: 50, m: [0, k, -k, 0] })
const TRIANGLE = [0, 0, 100, 0, 0, 100]
const CARRE = [0, 0, 100, 0, 100, 100, 0, 100]

describe('la distance au tracé, épaisseur déduite', () => {
  it('un trait : à ses segments ; un point seul ; sur le trait, 0', () => {
    const t = trait(100, 100, [0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5])
    expect(distanceAuTrace(t, 150, 110, null)).toBeCloseTo(8)           // 10 − 4/2
    expect(distanceAuTrace(t, 150, 101, null)).toBe(0)
    expect(distanceAuTrace(t, 230, 100, null)).toBeCloseTo(28)          // au-delà du bout
    expect(distanceAuTrace(trait(50, 50, [0, 0, 0.5]), 60, 50, null)).toBeCloseTo(8)
  })

  it('un polygone : ses côtés, celui de fermeture s\'il est fermé', () => {
    expect(distanceAuTrace(poly(TRIANGLE), 50, -5, null)).toBeCloseTo(4)
    expect(distanceAuTrace(poly(TRIANGLE), -5, 50, null)).toBeCloseTo(4)
    // Ouvert, le côté (0,100)–(0,0) n'existe pas
    expect(distanceAuTrace(poly(TRIANGLE, { ferme: false }), -5, 50, null)).toBeCloseTo(55 / Math.SQRT2 - 1)
    expect(distanceAuTrace(poly(TRIANGLE), 60, 60, null)).toBeCloseTo(20 / Math.SQRT2 - 1)
  })

  it('un point seul se prend à 6 unités de plus, comme à la gomme', () => {
    const p = poly([0, 0], { x: 10, y: 10, ferme: false })
    expect(distanceAuTrace(p, 20, 10, null)).toBeCloseTo(4)
    expect(distanceAuTrace(p, 13, 10, null)).toBe(0)
  })

  it('une droite se prend sur toute sa longueur, loin de ses deux points ; une demi-droite, d\'un côté', () => {
    const d = poly([0, 0, 10, 0], { ferme: false, prolonge: 'droite' })
    expect(distanceAuTrace(d, 1000, 5, null)).toBeCloseTo(4)
    expect(distanceAuTrace(d, -1000, -5, null)).toBeCloseTo(4)
    const demi = poly([0, 0, 10, 0], { ferme: false, prolonge: 'demi' })
    expect(distanceAuTrace(demi, 1000, 5, null)).toBeCloseTo(4)
    expect(distanceAuTrace(demi, -1000, 5, null)).toBeGreaterThan(990)
  })

  it('un cercle : |d − r| ; un arc, hors de l\'arc, la distance à son bout le plus proche', () => {
    expect(distanceAuTrace(cercle(50), 60, 0, null)).toBeCloseTo(9)
    expect(distanceAuTrace(cercle(50), 0, 0, null)).toBeCloseTo(49)      // le centre est loin du tracé
    const arc = cercle(50, { arc: { a0: 0, a1: Math.PI / 2 } })
    expect(distanceAuTrace(arc, 60 * Math.SQRT1_2, 60 * Math.SQRT1_2, null)).toBeCloseTo(9)
    expect(distanceAuTrace(arc, -60, 0, null)).toBeCloseTo(Math.hypot(60, 50) - 1)   // le bout (0, 50)
    expect(distanceAuTrace(arc, 60, -1, null)).toBeCloseTo(Math.hypot(10, 1) - 1)   // juste avant a0
  })

  it('un segment ancien (v0.1)', () => {
    const s: Segment = { ...base, id: 's', type: 'segment', x: 0, y: 0, dx: 100, dy: 0, couleur: '#000', taille: 4 }
    expect(distanceAuTrace(s, 50, 10, null)).toBeCloseTo(8)
  })

  it('une formule : hors de sa boîte, la distance à sa boîte ; dedans, c\'est un plein', () => {
    expect(distanceAuTrace(formule, 110, 20, boiteFormule)).toBeCloseTo(10)
    expect(distanceAuTrace(formule, -3, -4, boiteFormule)).toBeCloseTo(5)
    expect(distanceAuTrace(formule, 50, 20, boiteFormule)).toBe(Infinity)
    expect(distanceAuTrace(formule, 50, 20, null)).toBe(Infinity)
  })

  it('une image n\'a pas de tracé ; une figure coloriée, seulement ses côtés', () => {
    expect(distanceAuTrace(imageTournee(), -25, 50, null)).toBe(Infinity)
    expect(distanceAuTrace(poly(CARRE, { fond: '#f00' }), 50, 50, null)).toBeCloseTo(49)
    expect(distanceAuTrace(poly(CARRE, { fond: '#f00' }), 50, 3, null)).toBeCloseTo(2)
  })
})

describe('l\'intérieur', () => {
  it('un triangle, un rectangle sans fond : nu ; avec un fond : plein ; dehors : rien', () => {
    expect(interieur(poly(TRIANGLE), 20, 20, null)).toBe('nu')
    expect(interieur(poly(TRIANGLE), 80, 80, null)).toBe(null)
    expect(interieur(poly(CARRE), 50, 50, null)).toBe('nu')
    expect(interieur(poly(CARRE, { fond: '#1f5fbf' }), 50, 50, null)).toBe('plein')
    expect(interieur(poly(CARRE, { fond: null }), 50, 50, null)).toBe('nu')
    // Les coordonnées des sommets sont relatives au coin (x, y)
    expect(interieur(poly(CARRE, { x: 500, y: 500 }), 550, 550, null)).toBe('nu')
    expect(interieur(poly(CARRE, { x: 500, y: 500 }), 50, 50, null)).toBe(null)
  })

  it('un cercle entier : nu, ou plein s\'il est colorié ; un arc n\'a pas d\'intérieur', () => {
    expect(interieur(cercle(50), 10, 10, null)).toBe('nu')
    expect(interieur(cercle(50, { fond: '#f00' }), 0, 0, null)).toBe('plein')
    expect(interieur(cercle(50), 40, 40, null)).toBe(null)
    expect(interieur(cercle(50, { arc: { a0: 0, a1: 6 } }), 0, 0, null)).toBe(null)
  })

  it('une ligne ouverte, une droite, deux sommets, un trait refermé : rien', () => {
    expect(interieur(poly(CARRE, { ferme: false }), 50, 50, null)).toBe(null)
    expect(interieur(poly([0, 0, 100, 0], { prolonge: 'droite' }), 50, 0, null)).toBe(null)
    expect(interieur(poly([0, 0, 100, 0]), 50, 0, null)).toBe(null)
    const boucle = trait(0, 0, [0, 0, 0.5, 100, 0, 0.5, 100, 100, 0.5, 0, 100, 0.5, 0, 0, 0.5])
    expect(interieur(boucle, 50, 50, null)).toBe(null)
  })

  it('une formule (sa boîte) et une image, même tournée : pleines', () => {
    expect(interieur(formule, 50, 20, boiteFormule)).toBe('plein')
    expect(interieur(formule, 110, 20, boiteFormule)).toBe(null)
    // Tournée d'un quart de tour : elle couvre x de −50 à 0, y de 0 à 100
    expect(interieur(imageTournee(), -25, 50, null)).toBe('plein')
    expect(interieur(imageTournee(), 25, 25, null)).toBe(null)
    expect(dansImage(imageTournee(), -25, 50)).toBe(true)
    expect(dansImage(imageTournee(), 2, 50)).toBe(false)
    expect(dansImage(imageTournee(), 2, 50, 3)).toBe(true)                 // avec une marge (la gomme)
  })
})

describe('l\'aire', () => {
  it('d\'un carré, d\'un triangle, d\'un cercle, d\'une image tournée et agrandie', () => {
    expect(aireDe(poly(CARRE), null)).toBeCloseTo(10000)
    expect(aireDe(poly([...CARRE].reverse()), null)).toBeCloseTo(10000)  // le sens ne compte pas
    expect(aireDe(poly(TRIANGLE), null)).toBeCloseTo(5000)
    expect(aireDe(cercle(10), null)).toBeCloseTo(100 * Math.PI)
    expect(aireDe(imageTournee(2), null)).toBeCloseTo(4 * 100 * 50)
  })

  it('sans intérieur : celle de sa boîte', () => {
    expect(aireDe(formule, boiteFormule)).toBe(4000)
    expect(aireDe(trait(0, 0, [0, 0, 0.5]), null)).toBe(0)
  })

  it('un petit triangle dans un grand rectangle : le triangle est plus petit', () => {
    const grand: Forme = poly([0, 0, 1000, 0, 1000, 600, 0, 600])
    const petit: Forme = poly([400, 200, 500, 200, 450, 280])
    expect(aireDe(petit, null)).toBeLessThan(aireDe(grand, null))
  })
})
