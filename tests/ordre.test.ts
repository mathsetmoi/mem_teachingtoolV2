// L'ordre d'affichage du lot 5 : les calques (images fixées, images, tracés
// et figures, formules), le tri stable par calque puis par z, et les quatre
// commandes d'ordre (premier plan, avancer, reculer, arrière-plan) dans le
// calque de l'objet : une image mise à l'arrière-plan reste au-dessus des
// images fixées, « Avancer » ne passe que devant ce qui chevauche, les
// verrouillées ne bougent pas, et le repli d'un écart épuisé ne réécrit que
// quelques formes. Sur le Tableau, un Ctrl+Z rend tous les z d'un coup.
import { describe, expect, it } from 'vitest'
import { Tableau } from '../src/document'
import { aidesOrdre, couche, enOrdreDAffichage, nouveauxRangs, ordreDAffichage } from '../src/ordre'
import type { Sens } from '../src/ordre'
import { boiteDe } from '../src/revoir/bobine'
import type { Cercle, Forme, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'

const base = (id: string, z: number) => ({ id, z, auteur: 'moi' })
/** Un trait horizontal de 100 de long en (x, y) */
const trait = (id: string, z: number, x = 0, y = 0, o: Partial<Trait> = {}): Trait =>
  ({ ...base(id, z), type: 'trait', x, y, pts: [0, 0, 0.5, 50, 0, 0.5, 100, 0, 0.5], couleur: '#000', taille: 3, opacite: 1, pression: false, ...o })
/** Une image de 100 × 100 en (x, y) */
const image = (id: string, z: number, x = 0, y = 0, o: Partial<ImageForme> = {}): ImageForme =>
  ({ ...base(id, z), type: 'image', x, y, src: 's', l: 100, h: 100, m: [1, 0, 0, 1], ...o })
const formule = (id: string, z: number, x = 0, y = 0): Formule =>
  ({ ...base(id, z), type: 'formule', x, y, latex: 'x^2', couleur: '#000', taille: 28 })
const poly = (id: string, z: number, o: Partial<Polygone> = {}): Polygone =>
  ({ ...base(id, z), type: 'polygone', x: 0, y: 0, pts: [0, 0, 100, 0, 0, 100], ferme: true, couleur: '#000', taille: 2, ...o })
const cercle = (id: string, z: number): Cercle => ({ ...base(id, z), type: 'cercle', x: 0, y: 0, r: 30, couleur: '#000', taille: 2 })
const segment = (id: string, z: number): Segment => ({ ...base(id, z), type: 'segment', x: 0, y: 0, dx: 10, dy: 0, couleur: '#000', taille: 2 })

const rangs = (formes: Forme[], ids: string[], sens: Sens) => nouveauxRangs(formes, ids, sens, boiteDe)
/** La page après les rangs neufs */
function appliquer(formes: Forme[], r: { id: string; z: number }[]): Forme[] {
  const m = new Map(r.map(x => [x.id, x.z]))
  return formes.map(f => m.has(f.id) ? { ...f, z: m.get(f.id)! } : f)
}
/** Les identifiants dans l'ordre où on les voit, du bas vers le haut */
const vus = (formes: Forme[]) => ordreDAffichage(formes).map(f => f.id)

/** Le nombre à virgule qui suit v (le plus petit écart possible au-dessus) */
function suivant(v: number): number {
  const b = new DataView(new ArrayBuffer(8))
  b.setFloat64(0, v)
  b.setBigUint64(0, b.getBigUint64(0) + (v >= 0 ? 1n : -1n))
  return b.getFloat64(0)
}

describe('les calques', () => {
  it('image fixée 0, image 1, tracés et figures 2, formule 3 ; « fixé » ne compte que sur une image', () => {
    expect(couche(image('i', 1, 0, 0, { fixe: true }))).toBe(0)
    expect(couche(image('i', 1))).toBe(1)
    expect(couche(image('i', 1, 0, 0, { verrou: true }))).toBe(1)
    for (const f of [trait('t', 1), segment('s', 1), poly('p', 1), cercle('c', 1)]) expect(couche(f)).toBe(2)
    expect(couche(formule('f', 1))).toBe(3)
    expect(couche({ ...trait('t', 1), fixe: true })).toBe(2)
  })

  it('le tri est stable, par calque puis par z ; la page donnée n\'est pas touchée', () => {
    const page: Forme[] = [formule('F', 1), trait('T2', 5), image('I2', 9), image('If', 20, 0, 0, { fixe: true }), trait('T1', 3), image('I1', 4),
      trait('Ta', 7), trait('Tb', 7)]
    const copie = [...page]
    expect(vus(page)).toEqual(['If', 'I1', 'I2', 'T1', 'T2', 'Ta', 'Tb', 'F'])
    expect(page).toEqual(copie)
    // Deux formes du même calque et du même z gardent l'ordre donné
    expect(vus([trait('Tb', 7), trait('Ta', 7)])).toEqual(['Tb', 'Ta'])
    expect(enOrdreDAffichage(ordreDAffichage(page))).toBe(true)
    expect(enOrdreDAffichage(page)).toBe(false)
    expect(enOrdreDAffichage([])).toBe(true)
    // Une image posée après un trait (z plus grand) se voit dessous
    expect(enOrdreDAffichage([trait('T', 1), image('I', 2)])).toBe(false)
    expect(vus([trait('T', 1), image('I', 2)])).toEqual(['I', 'T'])
  })

  it('sans image fixée : exactement l\'ordre d\'avant (les images d\'abord par z, puis le reste par z)', () => {
    const page: Forme[] = [trait('T1', 1), image('I1', 2), poly('P', 3), formule('F', 4), image('I2', 5), trait('T2', 6), segment('S', 7)]
    const parZ = [...page].sort((a, b) => a.z - b.z)
    const avant = [...parZ.filter(f => f.type === 'image'), ...parZ.filter(f => f.type !== 'image' && f.type !== 'formule'), ...parZ.filter(f => f.type === 'formule')]
    expect(vus(page)).toEqual(avant.map(f => f.id))
  })
})

describe('premier plan et arrière-plan', () => {
  it('premier plan : au-dessus de tout le calque ; déjà en haut, rien', () => {
    const page: Forme[] = [trait('A', 1), trait('B', 2), trait('C', 3)]
    const r = rangs(page, ['A'], 'premier')
    expect(r).toEqual([{ id: 'A', z: 4 }])
    expect(vus(appliquer(page, r))).toEqual(['B', 'C', 'A'])
    expect(rangs(page, ['C'], 'premier')).toEqual([])
    // Seule du calque : rien à faire
    expect(rangs([trait('A', 1), image('I', 2)], ['A'], 'premier')).toEqual([])
  })

  it('plusieurs : dans leur ordre, au-dessus de tout', () => {
    const page: Forme[] = [trait('A', 1), trait('B', 2), trait('C', 3), trait('D', 4)]
    const r = rangs(page, ['C', 'A'], 'premier')
    expect(vus(appliquer(page, r))).toEqual(['B', 'D', 'A', 'C'])
    // Les deux du haut déjà au-dessus de tout le reste : rien
    expect(rangs(page, ['C', 'D'], 'premier')).toEqual([])
  })

  it('une image au premier plan reste sous les traits (dans son calque)', () => {
    const page: Forme[] = [trait('T', 1), image('I1', 2), image('I2', 3)]
    const fin = appliquer(page, rangs(page, ['I1'], 'premier'))
    expect(vus(fin)).toEqual(['I2', 'I1', 'T'])
  })

  it('arrière-plan : sous tout le calque ; déjà en bas, rien', () => {
    const page: Forme[] = [trait('A', 10), trait('B', 20), trait('C', 30)]
    const r = rangs(page, ['C'], 'arriere')
    expect(r).toEqual([{ id: 'C', z: 9 }])
    expect(vus(appliquer(page, r))).toEqual(['C', 'A', 'B'])
    expect(rangs(page, ['A'], 'arriere')).toEqual([])
    const deux = rangs(page, ['B', 'C'], 'arriere')
    expect(vus(appliquer(page, deux))).toEqual(['B', 'C', 'A'])
  })

  it('une image mise à l\'arrière-plan reste au-dessus des images fixées (D25)', () => {
    const page: Forme[] = [image('F1', 1, 0, 0, { fixe: true }), image('F2', 2, 0, 0, { fixe: true }), image('I1', 10), image('I2', 20), trait('T', 0)]
    const r = rangs(page, ['I2'], 'arriere')
    expect(r).toHaveLength(1)
    const z = r[0].z
    // Entre la plus haute image fixée et la plus basse des autres images
    expect(z).toBeGreaterThan(2)
    expect(z).toBeLessThan(10)
    const fin = appliquer(page, r)
    expect(vus(fin)).toEqual(['F1', 'F2', 'I2', 'I1', 'T'])
    // Pour la version d'avant, qui range les images par z seulement : le même ordre
    const images = fin.filter(f => f.type === 'image').sort((a, b) => a.z - b.z).map(f => f.id)
    expect(images).toEqual(['F1', 'F2', 'I2', 'I1'])
    // Sans image fixée : sous tout
    const sans = [image('I1', 10), image('I2', 20), trait('T', 0)]
    expect(rangs(sans, ['I2'], 'arriere')).toEqual([{ id: 'I2', z: -1 }])
    // Les bornes croisées (un fichier repassé par la version d'avant) : sous tout
    const croise = [image('F', 50, 0, 0, { fixe: true }), image('I1', 10), image('I2', 20)]
    expect(rangs(croise, ['I2'], 'arriere')).toEqual([{ id: 'I2', z: 9 }])
  })

  it('une image fixée ne se range pas (elle n\'est pas libre)', () => {
    const page: Forme[] = [image('F', 1, 0, 0, { fixe: true }), image('I', 2)]
    expect(rangs(page, ['F'], 'premier')).toEqual([])
    expect(rangs(page, ['F'], 'arriere')).toEqual([])
  })
})

describe('avancer et reculer', () => {
  it('avancer ne passe que devant la voisine qui chevauche', () => {
    // S en bas ; Y au-dessus mais ailleurs ; X et W par-dessus S
    const page: Forme[] = [image('S', 1, 0, 0), image('Y', 2, 500, 500), image('X', 3, 50, 50), image('W', 4, 20, 20)]
    const r = rangs(page, ['S'], 'avancer')
    expect(r).toHaveLength(1)
    expect(r[0].z).toBeGreaterThan(3)
    expect(r[0].z).toBeLessThan(4)
    expect(vus(appliquer(page, r))).toEqual(['Y', 'X', 'S', 'W'])
  })

  it('avancer : rien quand aucune voisine plus haute ne chevauche ; au-dessus de tout s\'il n\'y a rien plus haut', () => {
    const page: Forme[] = [image('S', 1, 0, 0), image('Y', 2, 500, 500)]
    expect(rangs(page, ['S'], 'avancer')).toEqual([])
    const deux: Forme[] = [image('S', 1, 0, 0), image('X', 2, 50, 50)]
    expect(rangs(deux, ['S'], 'avancer')).toEqual([{ id: 'S', z: 3 }])
    // Un trait plus haut qui chevauche ne compte pas : il est dans un autre calque
    expect(rangs([image('S', 1), trait('T', 2, 10, 10)], ['S'], 'avancer')).toEqual([])
  })

  it('reculer : sous la voisine qui chevauche, jamais sous une image fixée', () => {
    const page: Forme[] = [image('F', 1, 0, 0, { fixe: true }), image('X', 5, 50, 50), image('Y', 7, 500, 500), image('S', 9, 0, 0)]
    const r = rangs(page, ['S'], 'reculer')
    expect(r).toHaveLength(1)
    expect(r[0].z).toBeGreaterThan(1)
    expect(r[0].z).toBeLessThan(5)
    expect(vus(appliquer(page, r))).toEqual(['F', 'S', 'X', 'Y'])
    // Déjà juste au-dessus de l'image fixée : rien (l'image fixée n'est pas une voisine)
    const bas: Forme[] = [image('F', 1, 0, 0, { fixe: true }), image('S', 2, 0, 0), image('X', 3, 500, 500)]
    expect(rangs(bas, ['S'], 'reculer')).toEqual([])
    // Rien au-dessous : B − 1
    expect(rangs([trait('B', 10, 0, 0), trait('S', 20, 10, 0)], ['S'], 'reculer')).toEqual([{ id: 'S', z: 9 }])
  })

  it('une droite compte par ses deux points', () => {
    const droite = poly('D', 2, { x: 1000, y: 1000, pts: [0, 0, 10, 0], ferme: false, prolonge: 'droite' })
    // Elle traverserait tout, mais sa boîte est celle de ses deux points
    expect(rangs([trait('S', 1, 0, 0), droite], ['S'], 'avancer')).toEqual([])
    expect(rangs([trait('S', 1, 995, 1000), droite], ['S'], 'avancer')).toEqual([{ id: 'S', z: 3 }])
  })
})

describe('les calques, les verrous', () => {
  it('une image et un trait choisis ensemble : chacun dans son calque', () => {
    const page: Forme[] = [image('I1', 1), image('I2', 2), trait('T1', 3), trait('T2', 4)]
    const r = rangs(page, ['I1', 'T1'], 'premier')
    expect(r.map(x => x.id).sort()).toEqual(['I1', 'T1'])
    const fin = appliquer(page, r)
    expect(vus(fin)).toEqual(['I2', 'I1', 'T2', 'T1'])
    // Les z restent tous différents (la version d'avant prend au clic par z)
    expect(new Set(fin.map(f => f.z)).size).toBe(fin.length)
    // L'un des deux déjà en haut de son calque : seul l'autre bouge
    expect(rangs(page, ['I2', 'T1'], 'premier').map(x => x.id)).toEqual(['T1'])
  })

  it('les verrouillées ne bougent jamais ; tout verrouillé : rien', () => {
    const page: Forme[] = [trait('A', 1), trait('V', 2, 0, 0, { verrou: true }), trait('B', 3)]
    const r = rangs(page, ['A', 'V'], 'premier')
    expect(r).toEqual([{ id: 'A', z: 4 }])
    expect(rangs(page, ['V'], 'premier')).toEqual([])
    expect(rangs(page, ['V'], 'arriere')).toEqual([])
    // Une verrouillée non choisie garde sa place, et compte comme une voisine
    expect(vus(appliquer(page, rangs(page, ['B'], 'arriere')))).toEqual(['B', 'A', 'V'])
  })
})

describe('le repli quand l\'écart est épuisé', () => {
  it('il ne réécrit que les formes jusqu\'au premier écart, et garde tout l\'ordre', () => {
    const b = 1.76e12
    const c = suivant(b), d = suivant(c)
    const page: Forme[] = [trait('S', 1, 0, 0), trait('B', b, 10, 0), trait('C', c, 500, 500), trait('D', d, 600, 600),
      trait('E', b + 100, 700, 700), trait('G', b + 200, 800, 800), formule('F', d)]
    // Entre B et C, plus aucun nombre
    expect((b + c) / 2 === b || (b + c) / 2 === c).toBe(true)
    const r = rangs(page, ['S'], 'avancer')
    // S, et les deux voisines collées (C, D, et la formule F au même rang que D) : pas E ni G
    expect(r.map(x => x.id).sort()).toEqual(['C', 'D', 'F', 'S'])
    const fin = appliquer(page, r)
    expect(vus(fin)).toEqual(['B', 'S', 'C', 'D', 'E', 'G', 'F'])
    // Tout l'ordre par z (celui de la version d'avant) est gardé, S en plus
    const parZ = (l: Forme[]) => [...l].sort((x, y) => x.z - y.z).map(f => f.id)
    expect(parZ(fin)).toEqual(parZ(page).filter(id => id !== 'S').flatMap(id => id === 'B' ? ['B', 'S'] : [id]))
    // S n'a le rang de personne ; D et F, à égalité avant, le restent
    const zS = fin.find(f => f.id === 'S')!.z
    expect(fin.filter(f => f.z === zS)).toHaveLength(1)
    expect(fin.find(f => f.id === 'D')!.z).toBe(fin.find(f => f.id === 'F')!.z)
  })

  it('à force d\'avancer et de reculer entre les deux mêmes voisins, l\'ordre reste juste', () => {
    let page: Forme[] = [image('X', 1.76e12, 0, 0), image('S', 1.76e12 + 1, 10, 10), image('Y', 1.76e12 + 2, 20, 20)]
    for (let k = 0; k < 60; k++) {
      // S passe sous X puis revient dessus : chaque fois entre X et le suivant
      page = appliquer(page, rangs(page, ['S'], 'reculer'))
      expect(vus(page)).toEqual(['S', 'X', 'Y'])
      page = appliquer(page, rangs(page, ['S'], 'avancer'))
      expect(vus(page)).toEqual(['X', 'S', 'Y'])
      // Et Y passe sous S, puis revient
      page = appliquer(page, rangs(page, ['Y'], 'reculer'))
      expect(vus(page)).toEqual(['X', 'Y', 'S'])
      page = appliquer(page, rangs(page, ['Y'], 'avancer'))
      expect(vus(page)).toEqual(['X', 'S', 'Y'])
    }
    expect(page.every(f => Number.isFinite(f.z))).toBe(true)
  })

  it('le repli vers le bas, en reculant', () => {
    const b = 1.76e12
    const c = suivant(b)
    const page: Forme[] = [trait('A', b - 50, 900, 900), trait('C', b, 500, 500), trait('B', c, 0, 0), trait('S', b + 10, 10, 0)]
    const r = rangs(page, ['S'], 'reculer')
    expect(r.map(x => x.id).sort()).toEqual(['C', 'S'])
    expect(vus(appliquer(page, r))).toEqual(['A', 'C', 'S', 'B'])
  })
})

describe('sur le tableau : une étape, un Ctrl+Z', () => {
  it('les z changés en une transaction ; Ctrl+Z les rend tous d\'un coup', async () => {
    const t = new Tableau(null)
    await t.charger()
    const page = t.ordre.get(0)
    t.pageVue = page
    const poses: Forme[] = [image('I1', 1, 0, 0), image('I2', 2, 50, 50), trait('T1', 3, 0, 0), trait('T2', 4, 10, 10)]
    for (const f of poses) { t.nouveauGeste(); t.poser(page, f) }
    const avant = () => [...t.formesDe(page)!.values()].map(f => [f.id, f.z]).sort()
    const z0 = avant()
    const r = nouveauxRangs([...t.formesDe(page)!.values()], ['I1', 'T1'], 'premier', boiteDe)
    expect(r).toHaveLength(2)
    const profondeur = t.annulationDe(page)!.undoStack.length
    t.nouveauGeste()
    t.modifier(page, r.map(x => ({ id: x.id, patch: { z: x.z } })))
    expect(t.annulationDe(page)!.undoStack.length).toBe(profondeur + 1)
    expect(vus([...t.formesDe(page)!.values()])).toEqual(['I2', 'I1', 'T2', 'T1'])
    expect(t.annuler(page)).not.toBeNull()
    expect(avant()).toEqual(z0)
    expect(vus([...t.formesDe(page)!.values()])).toEqual(['I1', 'I2', 'T1', 'T2'])
  })
})

// La vérification « conformité » du lot 5 : le menu dit le calque (D1) pour
// l'écriture et les figures aussi, et pour une sélection mêlée, pas
// seulement pour des images seules ou des formules seules
describe('l\'aide des commandes d\'ordre : le menu dit le calque', () => {
  it('un trait, une figure, un segment : les formules restent au-dessus, les images dessous', () => {
    for (const pris of [[trait('T', 1)], [poly('P', 1)], [cercle('C', 1), segment('S', 2)], [trait('T', 1), poly('P', 2)]]) {
      expect(aidesOrdre(pris)).toEqual({ premier: 'Devant l\'écriture et les figures ; les formules restent au-dessus',
        arriere: 'Derrière l\'écriture et les figures ; les images restent dessous' })
    }
  })
  it('des images seules, des formules seules : les aides d\'avant, et l\'arrière-plan d\'une formule', () => {
    expect(aidesOrdre([image('I', 1), image('J', 2)])).toEqual({ premier: 'Devant les autres images ; l\'écriture et les figures restent devant' })
    expect(aidesOrdre([formule('F', 1)])).toEqual({ premier: 'Devant les autres formules ; les formules restent au-dessus de tout',
      arriere: 'Derrière les autres formules, toujours au-dessus de l\'écriture et des figures' })
  })
  it('une sélection mêlée : chacun dans son calque ; rien de pris : pas d\'aide', () => {
    const melee = { premier: 'Chacun dans son calque : images, puis écriture et figures, puis formules' }
    expect(aidesOrdre([trait('T', 1), formule('F', 2)])).toEqual(melee)
    expect(aidesOrdre([image('I', 1), trait('T', 2)])).toEqual(melee)
    expect(aidesOrdre([])).toEqual({})
  })
})
