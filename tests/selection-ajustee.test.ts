// Retouches après le lot 5, les souhaits du professeur : le cadre de la
// sélection au plus près de l'objet (une droite oblique, une bande fine le
// long d'elle, et non un grand rectangle), un clic sur la pastille ↻ qui
// tourne d'un quart de tour (le calcul : quartDeTour, déjà vérifié dans
// rotation.test.ts), et « Rogner » une image (rognage.ts) : la partie gardée
// qu'on tire, ce que prend un appui, l'image rognée posée là où étaient ses
// pixels. Le câblage (les gestes, le dessin) se vérifie dans le navigateur.
import { describe, expect, it } from 'vitest'
import { coinsAjustes, coinsImage, rectangleAjuste } from '../src/geometrie'
import { cadreDe, rectangleDe } from '../src/cadre'
import { actionsDe } from '../src/barre-actions'
import { ICONES } from '../src/icones'
import { coinsGardes, imageRognee, priseRognage, rienARogner, tirerPartie, toute, versImage, versMonde } from '../src/rognage'
import { boiteDe } from '../src/revoir/bobine'
import type { Forme, ImageForme, Trait } from '../src/types'

const base = { z: 7, auteur: 'moi' }
const trait = (pts: number[], o: Partial<Trait> = {}): Trait => ({ ...base, id: 't', type: 'trait', x: 100, y: 100, pts, couleur: '#1b2230', taille: 2, opacite: 1, pression: true, ...o })
const image = (o: Partial<ImageForme> = {}): ImageForme => ({ ...base, id: 'i', type: 'image', x: 0, y: 0, src: 'banque1', l: 200, h: 100, m: [1, 0, 0, 1], ...o })
const aire = (c: { x: number; y: number }[]) => Math.hypot(c[1].x - c[0].x, c[1].y - c[0].y) * Math.hypot(c[3].x - c[0].x, c[3].y - c[0].y)

describe('le rectangle ajusté', () => {
  it('une droite oblique : une bande fine le long d\'elle, penchée comme elle', () => {
    const r = rectangleAjuste([{ x: 0, y: 0 }, { x: 100, y: 100 }], 1)!
    expect(r.angle).toBeCloseTo(Math.PI / 4)
    const c = coinsAjustes(r)
    // Sa longueur et son épaisseur, et non la boîte de 100 × 100
    expect(aire(c)).toBeCloseTo((Math.SQRT2 * 100 + 2) * 2, 6)
  })

  it('le haut reste en haut : l\'angle dans ]−45°, 45°]', () => {
    for (const deg of [10, 30, 60, 80, 100, 135, 170, -20, -70]) {
      const a = deg * Math.PI / 180
      const r = rectangleAjuste([{ x: 0, y: 0 }, { x: 100 * Math.cos(a), y: 100 * Math.sin(a) }], 1)!
      expect(r.angle).toBeGreaterThan(-Math.PI / 4 - 1e-9); expect(r.angle).toBeLessThanOrEqual(Math.PI / 4 + 1e-9)
    }
  })

  it('une écriture, une ligne presque droite : la boîte droite, exactement', () => {
    const mot = [{ x: 0, y: 0 }, { x: 10, y: 20 }, { x: 25, y: 5 }, { x: 40, y: 22 }, { x: 60, y: 2 }, { x: 70, y: 18 }]
    expect(rectangleAjuste(mot, 1)).toEqual({ angle: 0, u0: -1, u1: 71, v0: -1, v1: 23 })
    expect(rectangleAjuste([{ x: 0, y: 0 }, { x: 200, y: 3 }], 1)!.angle).toBe(0)
    expect(rectangleAjuste([{ x: 5, y: 5 }], 2)).toEqual({ angle: 0, u0: 3, u1: 7, v0: 3, v1: 7 })
    expect(rectangleAjuste([])).toBeNull()
  })

  it('un trait oblique seul : son cadre suit sa pente, serré ; un trait droit garde le cadre droit', () => {
    const o = { boite: (f: Forme) => boiteDe(f), mesure: () => ({ l: 10, h: 10 }), z: 1, pointeur: 'mouse' as const, zoneLibre: { x: -1000, y: -1000, l: 4000, h: 4000 } }
    const oblique = trait([0, 0, 0.5, 100, 100, 0.5])
    const c = cadreDe([oblique], o)!
    expect(c.genre).toBe('oriente')
    expect(c.centre.x).toBeCloseTo(150); expect(c.centre.y).toBeCloseTo(150)
    expect(aire(c.coins)).toBeLessThan(0.4 * 112 * 112)
    // La pastille au-dessus de son bord du haut, au-dessus du centre à l'écran
    expect(c.pastille.y).toBeLessThan(c.centre.y)
    expect(rectangleDe(oblique)).toBe(rectangleDe(oblique))         // gardé, pas recalculé
    const droit = trait([0, 0, 0.5, 40, 0, 0.5, 40, 20, 0.5])
    expect(cadreDe([droit], o)!.genre).toBe('droit')
  })
})

describe('rogner une image', () => {
  it('Rogner dans la barre d\'une image seule, avec son icône', () => {
    expect(actionsDe({ n: 1, formule: false, image: true }, 'mouse').map(a => a.id)).toEqual(['rogner', 'dupliquer', 'copier', 'supprimer', 'options'])
    expect(actionsDe({ n: 2, formule: false, image: true }, 'mouse').map(a => a.id)).not.toContain('rogner')
    expect(ICONES.rogner).toBeTruthy()
  })

  it('un coin, un côté, la partie entière : bornés à l\'image, jamais trop petits, au pixel', () => {
    const f = image(), r = toute(f)
    expect(tirerPartie(r, { quoi: 'coin', i: 0 }, 30.4, 20.6, f)).toEqual({ u0: 30, v0: 21, u1: 200, v1: 100 })
    expect(tirerPartie(r, { quoi: 'cote', i: 1 }, -50, 999, f)).toEqual({ u0: 0, v0: 0, u1: 150, v1: 100 })
    expect(tirerPartie(r, { quoi: 'cote', i: 2 }, 0, -500, f)).toEqual({ u0: 0, v0: 0, u1: 200, v1: 8 })
    expect(tirerPartie(r, { quoi: 'coin', i: 2 }, 500, 500, f)).toEqual(r)
    const p = { u0: 50, v0: 20, u1: 100, v1: 60 }
    expect(tirerPartie(p, { quoi: 'dedans' }, 500, -500, f)).toEqual({ u0: 150, v0: 0, u1: 200, v1: 40 })
    expect(rienARogner(f, r)).toBe(true); expect(rienARogner(f, p)).toBe(false)
  })

  it('ce que prend un appui : un coin, un côté, dedans, ou rien (à côté)', () => {
    const f = image({ x: 100, y: 100, m: [2, 0, 0, 2] }), r = { u0: 10, v0: 10, u1: 110, v1: 60 }
    const ecran = (p: { x: number; y: number }) => p
    // Le coin haut-gauche de la partie gardée : (120, 120) à l'écran
    expect(priseRognage(f, r, { x: 122, y: 118 }, ecran, 10)).toEqual({ quoi: 'coin', i: 0 })
    expect(priseRognage(f, r, { x: 220, y: 121 }, ecran, 10)).toEqual({ quoi: 'cote', i: 0 })
    expect(priseRognage(f, r, { x: 200, y: 170 }, ecran, 10)).toEqual({ quoi: 'dedans' })
    expect(priseRognage(f, r, { x: 500, y: 500 }, ecran, 10)).toBeNull()
  })

  it('l\'image rognée reste là où étaient ses pixels, tournée ou non', () => {
    const k = Math.cos(Math.PI / 6) * 1.5, s = Math.sin(Math.PI / 6) * 1.5
    const f = image({ x: 300, y: 50, m: [k, s, -s, k] }), r = { u0: 20, v0: 10, u1: 120, v1: 90 }
    const avant = coinsGardes(f, r)
    const { patch, decoupe } = imageRognee(f, r, 'neuve', 2)
    const g = { ...f, ...patch }
    coinsImage(g).forEach((p, i) => { expect(p.x).toBeCloseTo(avant[i].x, 9); expect(p.y).toBeCloseTo(avant[i].y, 9) })
    expect(g.src).toBe('neuve'); expect(g.m).toEqual(f.m)
    // Une image deux fois plus fine que sa taille : les pixels sont au double
    expect(decoupe).toEqual({ x: 40, y: 20, l: 200, h: 160 })
    const q = versImage(f, versMonde(f, 37, 12))!
    expect(q.x).toBeCloseTo(37, 9); expect(q.y).toBeCloseTo(12, 9)
  })
})
