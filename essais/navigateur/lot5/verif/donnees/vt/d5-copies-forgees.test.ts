// Vérification « données et replay » du lot 5 (d5) : la liste blanche du
// presse-papiers devant des copies forgées (D18), et le collage d'un groupe
// tourné et verrouillé passé par le text/html du système.
import { expect, it } from 'vitest'
import { collage, lireHtml, validerCopie, versHtml } from '../../../../../../src/presse-papiers'
import type { Copie } from '../../../../../../src/presse-papiers'
import type { Forme } from '../../../../../../src/types'
import { PNG, formule, photo, trait, triangle } from './banc'

const copie = (formes: unknown[]): Copie => ({ v: 1, formes: formes as Forme[], images: { banque1: PNG }, page: 'p', centre: { x: 0, y: 0 }, t: 1 })
const relire = (formes: unknown[]) => validerCopie(JSON.parse(JSON.stringify(copie(formes))))

it('une rotation abîmée ou démesurée fait refuser la copie ; les attaches abîmées sont jetées sans la refuser', () => {
  expect(relire([formule('f', 0, 0, { rotation: '0.5' } as never)])).toBeNull()
  expect(relire([formule('f', 0, 0, { rotation: 5000 } as never)])).toBeNull()
  expect(relire([formule('f', 0, 0, { rotation: { a: 1 } } as never)])).toBeNull()
  const presque = relire([formule('f', 0, 0, { rotation: 1e-9 } as never)])!
  expect('rotation' in presque.formes[0]).toBe(false)
  const tour = relire([formule('f', 0, 0, { rotation: 7 } as never)])!
  expect((tour.formes[0] as { rotation: number }).rotation).toBeCloseTo(7 - 2 * Math.PI, 12)
  const pi = relire([formule('f', 0, 0, { rotation: -Math.PI } as never)])!
  expect((pi.formes[0] as { rotation: number }).rotation).toBeCloseTo(Math.PI, 12)
  const jetes = relire([
    trait(0, 0, 'a', { verrou: 'oui', fixe: true, groupe: 'x'.repeat(65) } as never),
    triangle('b', 0, 0, { verrou: 1, groupe: 12 } as never),
    photo('c', 0, 0, { fixe: 'oui', groupe: '' } as never),
  ])!
  expect(jetes.formes).toHaveLength(3)
  for (const f of jetes.formes) for (const k of ['verrou', 'fixe', 'groupe']) expect(k in f).toBe(false)
})

it('un groupe tourné et verrouillé passe par le text/html du système et se colle en un groupe neuf, verrouillé, sur une page vide', () => {
  const formes = [
    trait(0, 0, 'a', { verrou: true, groupe: 'g', taille: 6 }),
    triangle('b', 100, 0, { verrou: true, groupe: 'g', posNoms: [{ x: -10, y: 10 }, null, null] } as never),
    formule('c', 0, 100, { verrou: true, groupe: 'g', rotation: 0.7, taille: 42 } as never),
    photo('i', 0, 0, { fixe: true }),
    { id: 'pt', type: 'polygone', x: 10, y: 10, z: 99, auteur: 'x', pts: [0, 0], ferme: false, couleur: '#000000', taille: 2, sommets: true, noms: ['M'], lie: 'i' },
  ]
  const lu = lireHtml(versHtml(copie(formes)))!
  expect(lu).not.toBeNull()
  const poses = collage(lu, { dx: 50, dy: 50, moi: 'moi', existantes: [], maintenant: 1000 })
  const membres = poses.filter(f => f.groupe)
  expect(membres).toHaveLength(3)
  expect(new Set(membres.map(f => f.groupe)).size).toBe(1)
  expect(membres[0].groupe).not.toBe('g')
  expect(membres.every(f => f.verrou === true)).toBe(true)
  const c = poses.find(f => f.type === 'formule')!
  expect(c).toMatchObject({ rotation: 0.7, taille: 42, x: 50, y: 150 })
  const img = poses.find(f => f.type === 'image')!
  expect(img.fixe).toBe(true)
  expect(img.groupe).toBeUndefined()
  expect(img.z).toBeLessThan(Math.min(...poses.filter(f => f !== img).map(f => f.z)))
  const pt = poses.find(f => f.type === 'polygone' && f.lie)!
  expect((pt as { lie: string }).lie).toBe(img.id)
  const tri = poses.find(f => f.type === 'polygone' && !f.lie) as { noms: string[]; posNoms: unknown[] }
  expect(tri.noms).toEqual(['A', 'B', 'C'])
  expect(tri.posNoms).toEqual([{ x: -10, y: 10 }, null, null])
})
