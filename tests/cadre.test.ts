// Le cadre de taille et la pastille ↻ (lot 5, morceau K5) : le calcul pur
// (cadre.ts). Les matrices ; ce qu'une transformation fait à chaque type de
// forme (agrandie × 2 autour d'un coin, tournée d'un quart de tour autour de
// son centre) ; les bornes (une réduction ne laisse pas un trait sous 1
// d'épaisseur ; ce qui sort de transformerForme, aux bornes de
// bornesEchelle, passe toujours la liste blanche du presse-papiers) ; les
// aimants ; « Remettre droit » ; écrit sur un tableau comme l'écrit
// l'application (Tableau.remplacer : un geste, une étape) ; le cadre et ses
// poignées ; et la formule tournée dans geometrie.ts (prise, lasso), qui
// sans rotation dit exactement ce qu'elle disait avant.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AIMANT_ANGLE, IDENTITE, aimanterAngle, aimanterEchelle, angleDe, angleImage, appliquer, bornesEchelle, cadreDe, cadreTransforme, composer,
  curseurPoignee, dansLesBornes, deroule, echelle, estIdentite, etendueDuCadre, facteurDe, inverser, matriceImage, matriceTaille, poigneeSous,
  redresser, rotation, texteRotation, texteTaille, transformerForme, zonePastille,
} from '../src/cadre'
import type { Matrice } from '../src/cadre'
import { messageCadre } from '../src/pointeurs'
import { codageDe, sommetsDe } from '../src/formes'
import type { P } from '../src/formes'
import { coinsFormule, coinsImage, distanceAuTrace, englobante, interieur, partDedans, touche, cibleParmi, aireDe } from '../src/geometrie'
import type { Boite } from '../src/geometrie'
import { validerCopie } from '../src/presse-papiers'
import { POIGNEE } from '../src/pointeurs'
import { boiteDe } from '../src/revoir/bobine'
import { Tableau } from '../src/document'
import type { Cercle, Forme, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'

const DEG = Math.PI / 180
const base = { z: 7, auteur: 'moi' }
const trait = (o: Partial<Trait> = {}): Trait => ({
  ...base, id: 't', type: 'trait', x: 100, y: 100, pts: [0, 0, 0.3, 40, 0, 0.6, 40, 20, 0.9], couleur: '#1b2230', taille: 3, opacite: 1, pression: true, ...o,
})
const carre = (o: Partial<Polygone> = {}): Polygone => ({
  ...base, id: 'p', type: 'polygone', x: 0, y: 0, pts: [0, 0, 80, 0, 80, 80, 0, 80], ferme: true, couleur: '#1f5fbf', taille: 2.5,
  sommets: true, noms: ['A', 'B', 'C', 'D'], codage: true, posNoms: [{ x: -20, y: -10 }, null, null, null],
  stylePoints: [{ marque: 'croix' }, null, null, null], groupe: 'g1', verrou: undefined,
  brut: { pts: [0, 0, 0.5, 80, 2, 0.5, 79, 80, 0.5], taille: 4.5, pression: false }, ...o,
})
const cercle = (o: Partial<Cercle> = {}): Cercle => ({
  ...base, id: 'c', type: 'cercle', x: 200, y: 200, r: 50, couleur: '#1f5fbf', taille: 2.5, sommets: true, noms: ['O'],
  posNoms: [{ x: 0, y: 30 }], arc: { a0: 0, a1: Math.PI / 2 }, ...o,
})
const formule = (o: Partial<Formule> = {}): Formule => ({ ...base, id: 'f', type: 'formule', x: 10, y: 20, latex: '\\frac{1}{2}', couleur: '#d0342c', taille: 28, ...o })
const image = (o: Partial<ImageForme> = {}): ImageForme => ({ ...base, id: 'i', type: 'image', x: 0, y: 0, src: 'banque1', l: 200, h: 100, m: [1, 0, 0, 1], ...o })
const segment = (o: Partial<Segment> = {}): Segment => ({ ...base, id: 's', type: 'segment', x: 0, y: 0, dx: 100, dy: 0, couleur: '#1b2230', taille: 4, ...o })
const MESURE = { l: 60, h: 40 }
const mesure = () => MESURE

const proche = (a: P, b: P, tol = 1e-6) => { expect(a.x).toBeCloseTo(b.x, 4); expect(a.y).toBeCloseTo(b.y, 4); expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(Math.max(tol, 0.2)) }
/** Les points absolus d'un trait */
const pointsDuTrait = (t: Trait) => { const r: P[] = []; for (let i = 0; i < t.pts.length; i += 3) r.push({ x: t.x + t.pts[i], y: t.y + t.pts[i + 1] }); return r }
const centreBoite = (f: Forme) => { const b = boiteDe(f)!; return { x: b.x + b.l / 2, y: b.y + b.h / 2 } }

describe('les matrices', () => {
  it('appliquer, composer (M puis N), inverser, l\'identité', () => {
    const M = echelle({ x: 10, y: 10 }, 2, 2), N = rotation({ x: 0, y: 0 }, Math.PI / 2)
    const p = { x: 20, y: 10 }
    expect(appliquer(composer(M, N), p)).toEqual(appliquer(N, appliquer(M, p)))
    const I = composer(M, inverser(M)!)
    expect(estIdentite(I)).toBe(true)
    expect(estIdentite(IDENTITE)).toBe(true)
    expect(estIdentite(echelle({ x: 3, y: 4 }, 1, 1))).toBe(true)
    expect(inverser([1, 2, 2, 4, 0, 0])).toBeNull()
  })

  it('une échelle garde son ancre, une rotation son centre ; l\'angle et le facteur se lisent', () => {
    const a = { x: 30, y: -12 }
    expect(appliquer(echelle(a, 3, 0.5, 0.4), a).x).toBeCloseTo(a.x)
    expect(appliquer(echelle(a, 3, 0.5, 0.4), a).y).toBeCloseTo(a.y)
    const R = rotation(a, 30 * DEG)
    proche(appliquer(R, a), a)
    expect(angleDe(R)).toBeCloseTo(30 * DEG)
    expect(facteurDe(R)).toBeCloseTo(1)
    expect(facteurDe(echelle(a, 2, 2))).toBe(2)
    // Le sens de ctx.rotate : un quart de tour envoie l'axe des x vers le bas
    expect(appliquer(rotation({ x: 0, y: 0 }, Math.PI / 2), { x: 1, y: 0 })).toEqual({ x: 0, y: 1 })
    // Un quart de tour est exact (pas de 6e-17)
    expect(rotation({ x: 0, y: 0 }, Math.PI / 2).slice(0, 4)).toEqual([0, 1, -1, 0])
  })

  it('une échelle dans des axes tournés n\'étire que le long d\'eux', () => {
    const M = echelle({ x: 0, y: 0 }, 2, 1, 30 * DEG)
    const u = { x: Math.cos(30 * DEG), y: Math.sin(30 * DEG) }, v = { x: -u.y, y: u.x }
    proche(appliquer(M, u), { x: 2 * u.x, y: 2 * u.y })
    proche(appliquer(M, v), v)
  })
})

describe('transformerForme : × 2 autour d\'un coin, puis un quart de tour autour du centre', () => {
  it('un trait : ses points suivent, la pression reste, son épaisseur double ; même identifiant, même rang, le reste gardé', () => {
    const t = trait({ groupe: 'g', verrou: true })
    const coin = { x: 100, y: 100 }
    const g = transformerForme(t, echelle(coin, 2, 2)) as Trait
    expect(g.id).toBe('t'); expect(g.z).toBe(7); expect(g.groupe).toBe('g'); expect(g.verrou).toBe(true)
    expect(g.taille).toBe(6)
    expect(pointsDuTrait(g)).toEqual([{ x: 100, y: 100 }, { x: 180, y: 100 }, { x: 180, y: 140 }])
    expect([g.pts[2], g.pts[5], g.pts[8]]).toEqual([0.3, 0.6, 0.9])
    const c = centreBoite(g)
    const r = transformerForme(g, rotation(c, Math.PI / 2)) as Trait
    expect(r.taille).toBe(6)
    const avant = pointsDuTrait(g), apres = pointsDuTrait(r)
    avant.forEach((p, i) => proche(apres[i], { x: c.x - (p.y - c.y), y: c.y + (p.x - c.x) }))
    expect([r.pts[2], r.pts[5], r.pts[8]]).toEqual([0.3, 0.6, 0.9])
    // Les points relatifs, au dixième
    for (let i = 0; i < r.pts.length; i += 3) { expect(Math.round(r.pts[i] * 10) / 10).toBe(r.pts[i]); expect(Math.round(r.pts[i + 1] * 10) / 10).toBe(r.pts[i + 1]) }
  })

  it('un trait réduit garde au moins 1 d\'épaisseur ; un trait déjà plus fin que 1 garde la sienne', () => {
    expect((transformerForme(trait({ taille: 3 }), echelle({ x: 0, y: 0 }, 0.1, 0.1)) as Trait).taille).toBe(1)
    expect((transformerForme(trait({ taille: 3 }), echelle({ x: 0, y: 0 }, 0.5, 0.5)) as Trait).taille).toBe(1.5)
    expect((transformerForme(trait({ taille: 0.6 }), echelle({ x: 0, y: 0 }, 0.5, 0.5)) as Trait).taille).toBe(0.6)
    expect((transformerForme(trait({ taille: 0.6 }), echelle({ x: 0, y: 0 }, 1.5, 1.5)) as Trait).taille).toBe(0.9)
    expect((transformerForme(trait({ taille: 600 }), echelle({ x: 0, y: 0 }, 2, 2)) as Trait).taille).toBe(1000)
    // Tourné seulement : l'épaisseur ne bouge pas (pas même d'un arrondi)
    expect((transformerForme(trait({ taille: 4.5 }), rotation({ x: 3, y: 7 }, 1.234)) as Trait).taille).toBe(4.5)
  })

  it('un polygone : sommets, noms tournés à la même distance, codage identique, tracé d\'origine suivi, épaisseur gardée', () => {
    const p = carre()
    const g = transformerForme(p, echelle({ x: 0, y: 0 }, 2, 2)) as Polygone
    expect(sommetsDe(g)).toEqual([{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 160 }, { x: 0, y: 160 }])
    expect(g.taille).toBe(2.5)
    expect(g.noms).toEqual(['A', 'B', 'C', 'D'])
    expect(g.stylePoints).toEqual(p.stylePoints)
    expect(g.posNoms).toEqual(p.posNoms)       // pas de rotation : les décalages ne changent pas
    expect(g.brut!.taille).toBe(9)
    expect(g.brut!.pts).toEqual([0, 0, 0.5, 160, 4, 0.5, 158, 160, 0.5])
    const c = { x: 80, y: 80 }
    const r = transformerForme(g, rotation(c, Math.PI / 2)) as Polygone
    sommetsDe(g).forEach((s, i) => proche(sommetsDe(r)[i], { x: c.x - (s.y - c.y), y: c.y + (s.x - c.x) }))
    // Le décalage du nom de A : tourné d'un quart de tour, de même longueur
    const o = r.posNoms![0]!
    proche(o, { x: 10, y: -20 })
    expect(Math.hypot(o.x, o.y)).toBeCloseTo(Math.hypot(20, 10))
    expect(r.posNoms!.slice(1)).toEqual([null, null, null])
    // Le codage : les mêmes petits traits, les mêmes angles droits
    const k0 = codageDe(p), k1 = codageDe(r)
    expect(k1.traits.length).toBe(k0.traits.length)
    expect(k1.traits.map(t => t.n)).toEqual(k0.traits.map(t => t.n))
    expect(k1.droits.length).toBe(k0.droits.length)
    expect(k1.droits.length).toBe(4)
    // Le tracé d'origine a tourné avec lui (relatif au nouveau premier sommet)
    const b0 = { x: g.x + g.brut!.pts[3], y: g.y + g.brut!.pts[4] }
    proche({ x: r.x + r.brut!.pts[3], y: r.y + r.brut!.pts[4] }, { x: c.x - (b0.y - c.y), y: c.y + (b0.x - c.x) })
    expect(r.groupe).toBe('g1')
  })

  it('une droite garde sa nature ; un point seul aussi', () => {
    const d = carre({ pts: [0, 0, 50, 0], ferme: false, prolonge: 'droite', noms: ['A', 'B'], posNoms: undefined, stylePoints: undefined })
    const g = transformerForme(d, rotation({ x: 25, y: 0 }, Math.PI / 2)) as Polygone
    expect(g.prolonge).toBe('droite')
    expect(sommetsDe(g)).toEqual([{ x: 25, y: -25 }, { x: 25, y: 25 }])
  })

  it('un cercle et un arc : centre, rayon, arc tourné, nom tourné', () => {
    const c = cercle()
    const g = transformerForme(c, echelle({ x: 150, y: 150 }, 2, 2)) as Cercle
    expect({ x: g.x, y: g.y, r: g.r }).toEqual({ x: 250, y: 250, r: 100 })
    expect(g.arc).toEqual(c.arc)
    expect(g.taille).toBe(2.5)
    const r = transformerForme(g, rotation({ x: 250, y: 250 }, Math.PI / 2)) as Cercle
    expect(r.x).toBeCloseTo(250); expect(r.y).toBeCloseTo(250); expect(r.r).toBe(100)
    expect(r.arc!.a0).toBeCloseTo(Math.PI / 2); expect(r.arc!.a1).toBeCloseTo(Math.PI)
    proche(r.posNoms![0]!, { x: -30, y: 0 })
  })

  it('un ancien segment (v0.1) : ses deux bouts, son épaisseur gardée', () => {
    const s = segment()
    const g = transformerForme(s, echelle({ x: 0, y: 0 }, 2, 2)) as Segment
    expect(g).toMatchObject({ x: 0, y: 0, dx: 200, dy: 0, taille: 4 })
    const r = transformerForme(g, rotation({ x: 100, y: 0 }, Math.PI / 2)) as Segment
    expect(r.x).toBeCloseTo(100); expect(r.y).toBeCloseTo(-100); expect(r.dx).toBeCloseTo(0); expect(r.dy).toBeCloseTo(200)
    expect(r.taille).toBe(4)
  })

  it('une formule : sa taille double, son coin suit, la rotation s\'ajoute ; revenue à zéro, la clé disparaît', () => {
    const f = formule()
    const g = transformerForme(f, echelle({ x: 10, y: 20 }, 2, 2)) as Formule
    expect(g).toMatchObject({ x: 10, y: 20, taille: 56 })
    expect('rotation' in g).toBe(false)
    const r = transformerForme(g, rotation({ x: 70, y: 60 }, Math.PI / 2)) as Formule
    expect(r.rotation).toBeCloseTo(Math.PI / 2)
    proche({ x: r.x, y: r.y }, { x: 70 - (20 - 60), y: 60 + (10 - 70) })
    const retour = transformerForme(r, rotation({ x: 0, y: 0 }, -Math.PI / 2)) as Formule
    expect('rotation' in retour).toBe(false)
    // Ramenée dans ]−π, π]
    const tour = transformerForme(formule({ rotation: 3 }), rotation({ x: 0, y: 0 }, 1)) as Formule
    expect(tour.rotation).toBeCloseTo(4 - 2 * Math.PI)
    // Bornée : jamais sous 6, jamais au-delà de 1000, au demi
    expect((transformerForme(f, echelle({ x: 0, y: 0 }, 0.1, 0.1)) as Formule).taille).toBe(6)
    expect((transformerForme(f, echelle({ x: 0, y: 0 }, 1.01, 1.01)) as Formule).taille).toBe(28.5)
  })

  it('une image : tournée et agrandie par sa matrice ; déformée seulement dans ses propres axes', () => {
    const i = image()
    const g = transformerForme(i, echelle({ x: 0, y: 0 }, 2, 2)) as ImageForme
    expect(g.m).toEqual([2, 0, 0, 2])
    const c = { x: 200, y: 100 }
    const r = transformerForme(g, rotation(c, Math.PI / 2)) as ImageForme
    expect(r.m).toEqual([0, 2, -2, 0])
    coinsImage(g).forEach((p, k) => proche(coinsImage(r)[k], { x: c.x - (p.y - c.y), y: c.y + (p.x - c.x) }))
    // Une image tournée de 30°, étirée × 2 dans SES axes : ses côtés restent
    // perpendiculaires, le premier double, l'autre ne change pas, l'angle reste
    const a = 30 * DEG
    const t = transformerForme(i, rotation({ x: 0, y: 0 }, a)) as ImageForme
    const d = transformerForme(t, echelle({ x: 0, y: 0 }, 2, 1, a)) as ImageForme
    const [p, q, s, u] = d.m
    expect(Math.hypot(p, q)).toBeCloseTo(2); expect(Math.hypot(s, u)).toBeCloseTo(1)
    expect(p * s + q * u).toBeCloseTo(0)
    expect(angleImage(d.m)).toBeCloseTo(a)
  })
})

describe('les bornes', () => {
  it('bornesEchelle : une formule de 28 entre 6/28 et 1000/28 ; une image d\'au moins 4 unités de côté ; un trait n\'en borne que le haut', () => {
    const f = bornesEchelle([formule()], mesure)
    expect(f.min).toBeCloseTo(6 / 28, 6); expect(f.max).toBeCloseTo(1000 / 28, 6)
    const i = bornesEchelle([image({ m: [0.5, 0, 0, 0.5] })], mesure)      // 100 × 50 à l'écran
    expect(i.min).toBeCloseTo(4 / 50, 6); expect(i.max).toBeCloseTo(1e4 / 0.5, 0)
    const t = bornesEchelle([trait({ taille: 4 })], mesure)
    expect(t.min).toBe(0); expect(t.max).toBeCloseTo(250, 6)
    // Ensemble : la plus serrée de chaque côté
    const tout = bornesEchelle([formule(), image({ m: [0.5, 0, 0, 0.5] }), trait({ taille: 4 })], mesure)
    expect(tout.min).toBeCloseTo(6 / 28, 6); expect(tout.max).toBeCloseTo(1000 / 28, 6)
    // Une forme d'avant déjà hors des bornes (une formule de taille 3) : × 1 reste permis
    const petite = bornesEchelle([formule({ taille: 3 }), formule({ taille: 2000 })], mesure)
    expect(petite.min).toBeLessThanOrEqual(1); expect(petite.max).toBeGreaterThanOrEqual(1)
    // Loin de l'origine, les places bornent aussi
    expect(bornesEchelle([trait({ x: 9.9e6, y: 0, taille: 0.5 })], mesure).max).toBeLessThan(2000)
  })

  it('ce qui sort de transformerForme, aux bornes de bornesEchelle, sous des rotations quelconques, passe la liste blanche (aucun refus)', () => {
    const formes: Forme[] = [
      trait(), trait({ id: 't2', taille: 0.8, pression: false }), carre({ verrou: true }), cercle({ id: 'c1' }), cercle({ id: 'c2', arc: undefined }),
      segment(), formule(), formule({ id: 'f2', rotation: -2.5, taille: 7 }), image(), image({ id: 'i2', m: [0, 0.01, -0.01, 0], fixe: true }),
      carre({ id: 'd', pts: [0, 0, 50, 10], ferme: false, prolonge: 'demi', noms: ['E', 'F'], posNoms: undefined, stylePoints: undefined, brut: undefined }),
      carre({ id: 'pt', pts: [0, 0], ferme: false, noms: ['G'], posNoms: [{ x: 30, y: 0 }], stylePoints: undefined, brut: undefined, lie: 'i' }),
    ]
    const { min, max } = bornesEchelle(formes, mesure)
    expect(min).toBeGreaterThan(0); expect(max).toBeGreaterThan(1)
    const angles = [0, 0.3, -1.7, Math.PI, 2.999, 123.456]
    const ancres = [{ x: 0, y: 0 }, { x: -500, y: 320 }, { x: 1e4, y: -3e4 }]
    let n = 0
    for (const k of [min, max, 1, Math.sqrt(min), Math.sqrt(max)]) for (const a of angles) for (const p of ancres) {
      const M = composer(echelle(p, k, k), rotation(p, a))
      const neuves = formes.map(f => transformerForme(f, M))
      for (const g of neuves) expect(dansLesBornes(g)).toBe(true)
      const c = validerCopie(JSON.parse(JSON.stringify({ v: 1, formes: neuves, images: { banque1: 'data:image/png;base64,iVBORw0KGgo=' }, page: 'p', centre: { x: 0, y: 0 }, t: 1 })))
      expect(c, `k = ${k}, angle = ${a}`).not.toBeNull()
      expect(c!.formes).toHaveLength(formes.length)
      n++
    }
    expect(n).toBe(90)
  })

  it('dansLesBornes refuse ce que la liste blanche refuserait', () => {
    expect(dansLesBornes(trait({ x: 2e7 }))).toBe(false)
    expect(dansLesBornes(image({ m: [2e4, 0, 0, 1] }))).toBe(false)
    expect(dansLesBornes(image({ m: [1e-7, 0, 0, 1e-7] }))).toBe(false)
    expect(dansLesBornes(formule({ taille: 1500 }))).toBe(false)
    expect(dansLesBornes(formule({ rotation: NaN }))).toBe(false)
    expect(dansLesBornes(formule())).toBe(true)
  })
})

describe('les aimants', () => {
  const deg = (a: number) => Math.round(a / DEG * 1e9) / 1e9
  it('aimanterAngle : 44° → 45°, 2° → 2°, 88° → 90°, 0,4° → 0° (l\'arrondi au degré) ; Maj : le multiple de 15° le plus proche', () => {
    expect(deg(aimanterAngle(44 * DEG, false))).toBe(45)
    expect(deg(aimanterAngle(2 * DEG, false))).toBe(2)
    expect(deg(aimanterAngle(-2.4 * DEG, false))).toBe(-2)
    expect(deg(aimanterAngle(88 * DEG, false))).toBe(90)
    expect(deg(aimanterAngle(-93 * DEG, false))).toBe(-90)
    expect(deg(aimanterAngle(186 * DEG, false))).toBe(186)          // à plus de 3° de 180
    expect(deg(aimanterAngle(178.5 * DEG, false))).toBe(180)
    expect(deg(aimanterAngle(358 * DEG, false))).toBe(358)          // un tour entier n'attire pas : c'est 0
    expect(deg(aimanterAngle(0.4 * DEG, false))).toBe(0)
    expect(deg(aimanterAngle(22 * DEG, true))).toBe(15)
    expect(deg(aimanterAngle(23 * DEG, true))).toBe(30)
    expect(deg(aimanterAngle(2 * DEG, true))).toBe(0)
    expect(AIMANT_ANGLE).toBe(3)
    // 90° pile donne un quart de tour exact
    expect(rotation({ x: 0, y: 0 }, aimanterAngle(89 * DEG, false)).slice(0, 4)).toEqual([0, 1, -1, 0])
  })
  it('aimanterEchelle : × 1 attire à ±3 % ; sinon le centième ; jamais 0', () => {
    expect(aimanterEchelle(1.02)).toBe(1)
    expect(aimanterEchelle(0.975)).toBe(1)
    expect(aimanterEchelle(1.04)).toBe(1.04)
    expect(aimanterEchelle(2.3456)).toBe(2.35)
    expect(aimanterEchelle(0.001)).toBe(0.01)
  })
})

describe('Remettre droit', () => {
  it('une image tournée : droite, la taille et le centre gardés ; retournée par une symétrie, elle le reste, le haut en haut', () => {
    const i = image()
    const t = transformerForme(transformerForme(i, rotation({ x: 100, y: 50 }, 30 * DEG)), echelle({ x: 100, y: 50 }, 2, 2)) as ImageForme
    const r = redresser(t) as ImageForme
    expect(r.m).toEqual([2, 0, 0, 2])
    expect(r.x).toBeCloseTo(-100); expect(r.y).toBeCloseTo(-50)
    expect(r.id).toBe('i')
    // Retournée de gauche à droite (symétrie d'axe vertical) : droite déjà
    expect(redresser(image({ m: [-1, 0, 0, 1] }))).toBeNull()
    // … puis tournée de 40° : redressée, elle reste retournée
    const m = transformerForme(image({ m: [-1, 0, 0, 1] }), rotation({ x: 0, y: 0 }, 40 * DEG)) as ImageForme
    const d = redresser(m) as ImageForme
    expect(d.m[0]).toBeCloseTo(-1); expect(d.m[1]).toBe(0); expect(d.m[2]).toBe(0); expect(d.m[3]).toBeCloseTo(1)
    // Un demi-degré ou moins : rien à redresser
    expect(redresser(transformerForme(i, rotation({ x: 0, y: 0 }, 0.4 * DEG)))).toBeNull()
  })
  it('une formule tournée : sans rotation, son centre gardé (sa mesure) ; une formule droite, un trait : rien', () => {
    const f = formule({ rotation: Math.PI / 2 })
    const r = redresser(f, mesure) as Formule
    expect('rotation' in r).toBe(false)
    // Son centre : le coin (10, 20) et le demi-rectangle 30 × 20 tourné d'un quart de tour
    const c = { x: 10 - 20, y: 20 + 30 }
    expect(r.x + MESURE.l / 2).toBeCloseTo(c.x); expect(r.y + MESURE.h / 2).toBeCloseTo(c.y)
    expect(redresser(formule(), mesure)).toBeNull()
    expect(redresser(trait())).toBeNull()
  })
})

describe('sur un tableau : un geste, une étape (Tableau.remplacer)', () => {
  let horloge = new Date('2026-10-12T08:00:00').getTime()
  beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
  afterEach(() => vi.useRealTimers())
  const attendre = async (ms: number) => { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

  it('+30°, puis −30° (la clé disparaît), Ctrl+Z (elle revient), Remettre droit (elle disparaît), Ctrl+Z ; chacun une étape', async () => {
    const t = new Tableau(null)
    const p = t.ajouterPage('carreaux', 0); t.pageVue = p
    await attendre(30 * 60_000)
    t.nouveauGeste(); t.poser(p, formule()); await attendre(800)
    const lire = () => t.formesDe(p)!.get('f') as Formule
    const geste = async (M: Matrice) => { t.nouveauGeste(); t.remplacer(p, [transformerForme(lire(), M)]); await attendre(800) }
    const pile = () => t.annulationDe(p)!.undoStack.length, film = () => t.film.length
    const p0 = pile(), f0 = film()
    await geste(rotation({ x: 40, y: 40 }, 30 * DEG))
    expect(lire().rotation).toBeCloseTo(30 * DEG)
    expect(pile()).toBe(p0 + 1); expect(film()).toBe(f0 + 1)
    await geste(rotation({ x: 40, y: 40 }, -30 * DEG))
    expect('rotation' in lire()).toBe(false)
    expect(lire().x).toBeCloseTo(10); expect(lire().y).toBeCloseTo(20)
    expect(pile()).toBe(p0 + 2); expect(film()).toBe(f0 + 2)
    t.annuler(p); await attendre(800)
    expect(lire().rotation).toBeCloseTo(30 * DEG)
    // Remettre droit, comme l'écrit l'application
    t.nouveauGeste(); t.remplacer(p, [redresser(lire(), mesure)!]); await attendre(800)
    expect('rotation' in lire()).toBe(false)
    expect(lire().taille).toBe(28)
    t.annuler(p); await attendre(800)
    expect(lire().rotation).toBeCloseTo(30 * DEG)
    // L'identifiant reste : la revue et le lecteur montrent le résultat comme un déplacement
    expect([...t.formesDe(p)!.keys()]).toEqual(['f'])
  })
})

describe('le cadre et ses poignées', () => {
  const zone: Boite = { x: -1000, y: -1000, l: 4000, h: 4000 }
  const o = (z = 1, pointeur: 'mouse' | 'pen' | 'touch' = 'mouse', zoneLibre = zone) => ({ boite: (f: Forme) => (f.type === 'formule' ? englobante(f, { x: f.x, y: f.y, ...MESURE }) : boiteDe(f)), mesure, z, pointeur, zoneLibre })

  it('une image seule : un cadre orienté, ses côtés ; la pastille au-dessus de son bord du haut, à l\'écart du pointeur', () => {
    const c = cadreDe([image()], o())!
    expect(c.genre).toBe('oriente'); expect(c.cotes).toBe(true)
    expect(c.coins).toEqual(coinsImage(image()))
    expect(c.centre).toEqual({ x: 100, y: 50 })
    expect(c.pastille).toEqual({ x: 100, y: -POIGNEE.ecart.mouse })
    expect(c.filet).toEqual([{ x: 100, y: 0 }, c.pastille])
    expect(c.dessous).toBe(false)
    // Au doigt et zoomé : plus loin à l'écran, autant dans le monde divisé par le zoom
    expect(cadreDe([image()], o(2, 'touch'))!.pastille.y).toBeCloseTo(-POIGNEE.ecart.touch / 2)
    // Retournée la tête en bas (un demi-tour) : la pastille au-dessus de SON haut, sous elle à l'écran
    const r = transformerForme(image(), rotation({ x: 100, y: 50 }, Math.PI)) as ImageForme
    const cr = cadreDe([r], o())!
    expect(cr.pastille.x).toBeCloseTo(100); expect(cr.pastille.y).toBeCloseTo(100 + POIGNEE.ecart.mouse)
  })

  it('une formule seule : orientée avec elle, quatre coins, pas de côtés', () => {
    const f = formule({ rotation: 30 * DEG })
    const c = cadreDe([f], o())!
    expect(c.genre).toBe('oriente'); expect(c.cotes).toBe(false)
    c.coins.forEach((p, i) => proche(p, coinsFormule(f, { x: f.x, y: f.y, ...MESURE })[i]))
  })

  it('un trait, plusieurs objets, un ancien segment : un cadre droit, la boîte agrandie de 6 px d\'écran', () => {
    const t = trait()
    const b = boiteDe(t)!
    const c = cadreDe([t], o())!
    expect(c.genre).toBe('droit')
    expect(c.coins[0]).toEqual({ x: b.x - 6, y: b.y - 6 })
    expect(c.coins[2]).toEqual({ x: b.x + b.l + 6, y: b.y + b.h + 6 })
    expect(c.centre).toEqual({ x: b.x + b.l / 2, y: b.y + b.h / 2 })
    // Plusieurs : la boîte de tout (une formule tournée par son englobante)
    const f = formule({ rotation: 0.5, x: 400, y: 400 })
    const p = cadreDe([t, f], o(2))!
    const e = englobante(f, { x: f.x, y: f.y, ...MESURE })
    expect(p.genre).toBe('droit')
    expect(p.coins[2].x).toBeCloseTo(e.x + e.l + 3); expect(p.coins[2].y).toBeCloseTo(e.y + e.h + 3)
    expect(cadreDe([segment()], o())!.genre).toBe('droit')
  })

  it('une figure seule : la pastille seule, autour de son centre ; une droite : le milieu de [AB] ; un point, un cercle entier : rien', () => {
    const c = cadreDe([carre()], o())!
    expect(c.genre).toBe('pastille'); expect(c.coins).toEqual([]); expect(c.cotes).toBe(false)
    expect(c.centre).toEqual({ x: 40, y: 40 })
    const arc = cadreDe([cercle()], o())!
    expect(arc.genre).toBe('pastille'); expect(arc.centre).toEqual({ x: 200, y: 200 })
    const d = carre({ pts: [0, 0, 100, 0], x: 300, y: 300, ferme: false, prolonge: 'droite', sommets: false, posNoms: undefined, stylePoints: undefined })
    const cd = cadreDe([d], o())!
    expect(cd.centre).toEqual({ x: 350, y: 300 })
    // Au-dessus de [AB] (sa boîte, agrandie de 6 px), jamais au bord de l'écran
    expect(cd.pastille).toEqual({ x: 350, y: 300 - 6 - POIGNEE.ecart.mouse })
    expect(cadreDe([carre({ pts: [0, 0], ferme: false })], o())).toBeNull()
    expect(cadreDe([cercle({ arc: undefined })], o())).toBeNull()
    expect(cadreDe([], o())).toBeNull()
  })

  it('un objet trop petit à l\'écran : ses coins sortent d\'une poignée (dans le sens court), et pas de côtés', () => {
    const petite = image({ l: 20, h: 100 })           // 20 px de large à 100 %
    const c = cadreDe([petite], o())!
    const d = POIGNEE.dessin.mouse
    expect(c.cotes).toBe(false)
    expect(c.coins[0]).toEqual({ x: -d, y: 0 })
    expect(c.coins[2]).toEqual({ x: 20 + d, y: 100 })
    // Grand à l'écran : les coins sur l'image, les côtés
    expect(cadreDe([petite], o(4))!.coins[0]).toEqual({ x: 0, y: 0 })
    expect(cadreDe([petite], o(4))!.cotes).toBe(true)
  })

  it('la pastille passe dessous quand le dessus sort de la zone libre', () => {
    const c = cadreDe([image()], o(1, 'mouse', { x: -50, y: -10, l: 400, h: 400 }))!
    expect(c.dessous).toBe(true)
    expect(c.pastille).toEqual({ x: 100, y: 100 + POIGNEE.ecart.mouse })
    expect(c.filet).toEqual([{ x: 100, y: 100 }, c.pastille])
  })

  it('poigneeSous : la pastille, un coin, un côté, à la portée du pointeur ; rien ailleurs', () => {
    const c = cadreDe([image()], o())!
    const cam = { x: 10, y: 20, z: 1 }
    const ecran = (p: P) => ({ x: p.x + 10, y: p.y + 20 })
    expect(poigneeSous(c, ecran(c.pastille), cam, 'mouse')).toEqual({ quoi: 'pastille', i: 0 })
    expect(poigneeSous(c, ecran({ x: 203, y: 103 }), cam, 'mouse')).toEqual({ quoi: 'coin', i: 2 })
    expect(poigneeSous(c, ecran({ x: 100, y: 105 }), cam, 'mouse')).toEqual({ quoi: 'cote', i: 2 })
    expect(poigneeSous(c, ecran({ x: 0, y: 50 }), cam, 'mouse')).toEqual({ quoi: 'cote', i: 3 })
    expect(poigneeSous(c, ecran({ x: 100, y: 50 }), cam, 'mouse')).toBeNull()
    // 15 px du coin : rien à la souris (10), le coin au doigt (20)
    expect(poigneeSous(c, ecran({ x: 215, y: 100 }), cam, 'mouse')).toBeNull()
    expect(poigneeSous(c, ecran({ x: 215, y: 100 }), cam, 'touch')).toEqual({ quoi: 'coin', i: 2 })
    // Une figure seule : la pastille et rien d'autre
    const f = cadreDe([carre()], o())!
    expect(poigneeSous(f, ecran(f.pastille), cam, 'pen')).toEqual({ quoi: 'pastille', i: 0 })
    expect(poigneeSous(f, ecran({ x: 0, y: 0 }), cam, 'pen')).toBeNull()
  })
})

describe('geometrie.ts : la formule tournée par un seul chemin', () => {
  const b = { x: 0, y: 0, l: 100, h: 20 }
  const f = formule({ x: 0, y: 0, rotation: 45 * DEG })
  /** Le point (u, v) de la formule, dans le monde */
  const sur = (u: number, v: number) => { const c = Math.cos(45 * DEG), s = Math.sin(45 * DEG); return { x: u * c - v * s, y: u * s + v * c } }

  it('elle se prend dans son rectangle tourné, pas dans un coin vide de son englobante', () => {
    const m = sur(80, 10)
    expect(interieur(f, m.x, m.y, b)).toBe('plein')
    expect(distanceAuTrace(f, m.x, m.y, b)).toBe(Infinity)
    const e = englobante(f, b)
    // Le coin haut-droit de l'englobante : vide
    const vide = { x: e.x + e.l - 5, y: e.y + 5 }
    expect(interieur(f, vide.x, vide.y, b)).toBeNull()
    expect(distanceAuTrace(f, vide.x, vide.y, b)).toBeGreaterThan(20)
    expect(touche(f, m.x, m.y, 1, () => b)).toBe(true)
    expect(touche(f, vide.x, vide.y, 1, () => b)).toBe(false)
    // À 5 unités au-dessus de son bord du haut (dans son repère) : à 5 de sa boîte
    const dessus = sur(50, -5)
    expect(distanceAuTrace(f, dessus.x, dessus.y, b)).toBeCloseTo(5)
    expect(touche(f, dessus.x, dessus.y, 6, () => b)).toBe(true)
    // cibleParmi l'écarte par son englobante, la prend dedans
    const opts = { zoom: 1, tolerance: 6, net: 6, dedans: true, boite: () => b }
    expect(cibleParmi([f], m.x, m.y, opts)?.f.id).toBe('f')
    expect(cibleParmi([f], vide.x, vide.y, opts)).toBeNull()
    // Son aire ne grandit pas
    expect(aireDe(f, b)).toBe(2000)
    // L'englobante : celle de ses coins
    const c = coinsFormule(f, b)
    proche(c[1], sur(100, 0)); proche(c[3], sur(0, 20))
    expect(e.x).toBeCloseTo(c[3].x); expect(e.l).toBeCloseTo(c[1].x - c[3].x)
  })

  it('le lasso (partDedans) la mesure dans son rectangle tourné', () => {
    // Un cadre qui couvre la moitié de l'englobante où elle n'est pas
    const e = englobante(f, b)
    const dansMoitieVide = (x: number, y: number) => y < e.y + e.h / 2 && x > e.x + e.l / 2 + 10
    expect(partDedans(f, dansMoitieVide, b)).toBeLessThan(0.5)
    // Un lasso le long de son rectangle tourné : elle y est entière
    const q = [sur(-2, -2), sur(102, -2), sur(102, 22), sur(-2, 22)]
    const dansRect = (x: number, y: number) => { const c = Math.cos(-45 * DEG), s = Math.sin(-45 * DEG); const u = x * c - y * s, v = x * s + y * c; return u >= -2 && u <= 102 && v >= -2 && v <= 22 }
    expect(q).toHaveLength(4)
    expect(partDedans(f, dansRect, b)).toBe(1)
  })

  it('sans rotation, exactement les résultats d\'avant', () => {
    const d = formule({ x: 0, y: 0 })
    expect(englobante(d, b)).toBe(b)
    expect(coinsFormule(d, b)).toEqual([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 20 }, { x: 0, y: 20 }])
    expect(distanceAuTrace(d, 110, 10, b)).toBe(10)
    expect(distanceAuTrace(d, -3, -4, b)).toBe(5)
    expect(distanceAuTrace(d, 50, 10, b)).toBe(Infinity)
    expect(interieur(d, 50, 10, b)).toBe('plein')
    expect(interieur(d, 101, 10, b)).toBeNull()
    expect(touche(d, 103, 10, 3, () => b)).toBe(true)
    expect(touche(d, 104, 10, 3, () => b)).toBe(false)
    expect(partDedans(d, (x) => x < 50, b)).toBeCloseTo(3 / 7)
    // Une rotation abîmée (venue d'un fichier) : droite, sans planter
    const abimee = formule({ x: 0, y: 0, rotation: 'x' as unknown as number })
    expect(englobante(abimee, b)).toBe(b)
    expect(interieur(abimee, 50, 10, b)).toBe('plein')
  })

  it('la boîte du lecteur (bobine) : l\'englobante de l\'estimation tournée', () => {
    const d = boiteDe(formule({ x: 0, y: 0 }))!
    const t = boiteDe(formule({ x: 0, y: 0, rotation: Math.PI / 2 }))!
    expect(t.l).toBeCloseTo(d.h); expect(t.h).toBeCloseTo(d.l)
    expect(t.x).toBeCloseTo(-d.h); expect(t.y).toBeCloseTo(0)
  })

  it('matriceImage place les pixels comme coinsImage', () => {
    const i = image({ x: 5, y: 7, m: [0, 2, -2, 0] })
    expect(appliquer(matriceImage(i), { x: i.l, y: i.h })).toEqual(coinsImage(i)[2])
  })
})

describe('les gestes du cadre (K6) : taille, rotation, curseurs, emprise', () => {
  const zone: Boite = { x: -1000, y: -1000, l: 4000, h: 4000 }
  const o = (z = 1, pointeur: 'mouse' | 'pen' | 'touch' = 'mouse', zoneLibre = zone) => ({ boite: (f: Forme) => (f.type === 'formule' ? englobante(f, { x: f.x, y: f.y, ...MESURE }) : boiteDe(f)), mesure, z, pointeur, zoneLibre })
  const larges = { min: 0.01, max: 100 }

  it('un coin : l\'ancre au coin opposé, le facteur projeté sur la diagonale, les proportions gardées ; aimanté et borné', () => {
    const c = cadreDe([image()], o())!
    // Le coin bas-droit (200, 100) tiré en (400, 200) : × 2 autour du coin haut-gauche
    let r = matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 400, y: 200 }, { bornes: larges })
    expect(r.kx).toBe(2); expect(r.ky).toBe(2)
    proche(appliquer(r.M, { x: 0, y: 0 }), { x: 0, y: 0 })
    proche(appliquer(r.M, { x: 200, y: 100 }), { x: 400, y: 200 })
    // Hors de la diagonale : sa projection (le rapport largeur / hauteur reste)
    r = matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 400, y: 100 }, { bornes: larges })
    const g = transformerForme(image(), r.M) as ImageForme
    expect(g.m[0] / g.m[3]).toBeCloseTo(1, 9)
    // À ±3 % de la taille d'origine : × 1 exactement ; au centième sinon
    expect(matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 205, y: 102 }, { bornes: larges }).kx).toBe(1)
    expect(matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 251.3, y: 125.6 }, { bornes: larges }).kx).toBe(1.26)
    // Le coin haut-gauche : l'ancre au bas-droit
    r = matriceTaille(c, { quoi: 'coin', i: 0 }, { x: 100, y: 50 }, { bornes: larges })
    expect(r.kx).toBe(0.5); proche(appliquer(r.M, { x: 200, y: 100 }), { x: 200, y: 100 })
    // Passé de l'autre côté de l'ancre : jamais de retournement, le plus petit facteur permis
    r = matriceTaille(c, { quoi: 'coin', i: 2 }, { x: -300, y: -300 }, { bornes: { min: 0.2, max: 5 } })
    expect(r.kx).toBe(0.2)
    expect(matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 5000, y: 2500 }, { bornes: { min: 0.2, max: 5 } }).kx).toBe(5)
  })

  it('un côté d\'une image : un seul axe, dans les axes de l\'image (tournée aussi) ; Maj + coin : deux facteurs libres', () => {
    const c = cadreDe([image()], o())!
    // Le côté droit (i = 1) tiré de 100 : la largeur × 1,5, la hauteur gardée
    let r = matriceTaille(c, { quoi: 'cote', i: 1 }, { x: 300, y: 70 }, { bornes: larges })
    expect([r.kx, r.ky]).toEqual([1.5, 1])
    let g = transformerForme(image(), r.M) as ImageForme
    expect(g.m.map(v => Math.round(v * 1e9) / 1e9)).toEqual([1.5, 0, 0, 1]); expect(g.x).toBeCloseTo(0)
    // Le côté du haut (i = 0) : la hauteur seule, l'ancre au bas
    r = matriceTaille(c, { quoi: 'cote', i: 0 }, { x: 100, y: -100 }, { bornes: larges })
    expect([r.kx, r.ky]).toEqual([1, 2])
    g = transformerForme(image(), r.M) as ImageForme
    expect(g.y).toBeCloseTo(-100); expect(g.y + g.m[3] * g.h).toBeCloseTo(100)
    // Tournée de 30° : le côté droit l'allonge le long de SON axe
    const t = transformerForme(image(), rotation({ x: 0, y: 0 }, 30 * DEG)) as ImageForme
    const ct = cadreDe([t], o())!
    const droit = { x: (ct.coins[1].x + ct.coins[2].x) / 2, y: (ct.coins[1].y + ct.coins[2].y) / 2 }
    const u = { x: Math.cos(30 * DEG), y: Math.sin(30 * DEG) }
    r = matriceTaille(ct, { quoi: 'cote', i: 1 }, { x: droit.x + 100 * u.x, y: droit.y + 100 * u.y }, { bornes: larges })
    expect(r.kx).toBe(1.5)
    g = transformerForme(t, r.M) as ImageForme
    expect(Math.hypot(g.m[0], g.m[1]) * g.l).toBeCloseTo(300); expect(Math.hypot(g.m[2], g.m[3]) * g.h).toBeCloseTo(100)
    // Maj + coin : kx et ky chacun le sien
    r = matriceTaille(c, { quoi: 'coin', i: 2 }, { x: 300, y: 300 }, { bornes: larges, libre: true })
    expect([r.kx, r.ky]).toEqual([1.5, 3])
    expect(texteTaille(r.kx, r.ky, true)).toBe('150 % × 300 %')
    expect(texteTaille(2, 2, false)).toBe('200 %')
  })

  it('la rotation : l\'angle tourné déroulé (plus d\'un tour), sa mesure dans le sens direct ou l\'autre', () => {
    let t = 0, a = 0
    for (let k = 1; k <= 40; k++) { const b = Math.atan2(Math.sin(k * 20 * DEG), Math.cos(k * 20 * DEG)); t = deroule(t, a, b); a = b }
    expect(t / DEG).toBeCloseTo(800)
    expect(texteRotation(30 * DEG)).toBe('↻ 30°')
    expect(texteRotation(-30 * DEG)).toBe('↺ 30°')
    expect(texteRotation(0.2 * DEG)).toBe('0°')
    // L'aimant : 90° pile sans Maj à 2° près, et 2° sans être ramené à 0
    expect(aimanterAngle(88.4 * DEG, false) / DEG).toBeCloseTo(90)
    expect(aimanterAngle(2.2 * DEG, false) / DEG).toBeCloseTo(2)
    expect(aimanterAngle(41 * DEG, true) / DEG).toBeCloseTo(45)
  })

  it('les curseurs suivent le coin, le côté et l\'orientation du cadre', () => {
    const c = cadreDe([image()], o())!
    expect(curseurPoignee(c, { quoi: 'coin', i: 0 })).toBe('nwse-resize')
    expect(curseurPoignee(c, { quoi: 'coin', i: 2 })).toBe('nwse-resize')
    expect(curseurPoignee(c, { quoi: 'coin', i: 1 })).toBe('nesw-resize')
    expect(curseurPoignee(c, { quoi: 'cote', i: 0 })).toBe('ns-resize')
    expect(curseurPoignee(c, { quoi: 'cote', i: 1 })).toBe('ew-resize')
    expect(curseurPoignee(c, { quoi: 'pastille', i: 0 })).toBe('grab')
    // Un quart de tour : les côtés échangent leur double flèche
    const t = cadreDe([transformerForme(image(), rotation({ x: 100, y: 50 }, Math.PI / 2))], o())!
    expect(curseurPoignee(t, { quoi: 'cote', i: 0 })).toBe('ew-resize')
    expect(curseurPoignee(t, { quoi: 'coin', i: 0 })).toBe('nesw-resize')
  })

  it('le cadre pendant le geste : ses coins par M ; la pastille tourne avec lui, sans s\'éloigner quand il grandit', () => {
    const c = cadreDe([image()], o())!
    const g = cadreTransforme(c, echelle({ x: 0, y: 0 }, 2, 2))
    expect(g.coins[2]).toEqual({ x: 400, y: 200 })
    expect(Math.hypot(g.pastille.x - g.filet[0].x, g.pastille.y - g.filet[0].y)).toBeCloseTo(POIGNEE.ecart.mouse)
    const r = cadreTransforme(c, rotation(c.centre, Math.PI / 2))
    proche(r.pastille, appliquer(rotation(c.centre, Math.PI / 2), c.pastille))
    expect(cadreTransforme(c, IDENTITE)).toEqual(c)
  })

  it('l\'emprise du cadre (ses poignées et sa pastille) et le disque de la pastille', () => {
    const c = cadreDe([image()], o())!
    const e = etendueDuCadre(c, 'touch', 2)
    expect(e.x).toBeCloseTo(-POIGNEE.dessin.touch / 4)
    expect(e.y).toBeCloseTo(c.pastille.y - POIGNEE.pastille.touch / 2)
    const d = zonePastille(c, 'mouse', 1)
    expect(d.l).toBe(2 * POIGNEE.pastille.mouse)
    expect(zonePastille(c, 'mouse', 2, 4).l).toBe(POIGNEE.pastille.mouse + 4)
    expect(d.x + d.l / 2).toBeCloseTo(c.pastille.x)
  })

  it('un objet plus grand que ce qu\'on voit (2000 %) : la pastille reste dans la zone libre, en bas ; hors de la vue, rien ne bouge', () => {
    const grand = image({ l: 200, h: 100, m: [20, 0, 0, 20] })      // 4000 × 2000
    const vue = { x: 1000, y: 500, l: 400, h: 300 }
    const c = cadreDe([grand], o(1, 'mouse', vue))!
    expect(c.pastille.x).toBeGreaterThanOrEqual(vue.x); expect(c.pastille.x).toBeLessThanOrEqual(vue.x + vue.l)
    expect(c.pastille.y).toBeGreaterThanOrEqual(vue.y); expect(c.pastille.y).toBeLessThanOrEqual(vue.y + vue.h)
    expect(c.dessous).toBe(true)
    // L'objet hors de la vue : la pastille à sa place (hors de l'écran, avec lui)
    const loin = cadreDe([image()], o(1, 'mouse', { x: 5000, y: 5000, l: 400, h: 300 }))!
    expect(loin.pastille).toEqual({ x: 100, y: 100 + POIGNEE.ecart.mouse })
  })

  it('le message de la première image prise : Maj + coin seulement là où il y a un clavier', () => {
    expect(messageCadre('mouse')).toBe('Coins : agrandir ou réduire ; côtés ou Maj + coin : déformer ; ↻ : tourner')
    expect(messageCadre('pen')).toBe('Coins : agrandir ou réduire ; côtés ou Maj + coin : déformer ; ↻ : tourner')
    expect(messageCadre('touch')).toBe('Coins : agrandir ou réduire ; côtés : déformer ; ↻ : tourner')
  })
})
