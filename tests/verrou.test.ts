// Verrouiller et fixer en fond (lot 5, morceau K3) : ce que les commandes
// écrivent (verrou.ts), écrit comme l'écrit l'application (Tableau.modifier
// en une transaction) : un seul Ctrl + Z pour chacune, la note « réglage »
// pour verrouiller seulement, l'invariant du fond (toute image fixée sous
// toute image libre) gardé par fixer et par détacher, même avec deux
// images fixées ; le collage d'un verrouillé, qui le reste et ne se
// sélectionne pas ; un point verrouillé repéré sur une image, qui la suit
// quand on la pousse. Puis les mots des messages, Maj + L et la barre
// d'actions.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tableau } from '../src/document'
import { collage } from '../src/presse-papiers'
import type { Copie } from '../src/presse-papiers'
import { barreVisible } from '../src/barre-actions'
import type { EtatBarre } from '../src/barre-actions'
import { messageDetacher, messageVerrou } from '../src/pointeurs'
import { toucheTenueEnGeste, toucheVerrou } from '../src/navigateur'
import { ordreDAffichage } from '../src/ordre'
import { coinHautDroit, coinsVus, ecarterCoins } from '../src/geometrie'
import type { Forme, ImageForme, Polygone, Trait } from '../src/types'
import { libre } from '../src/types'
import { accorder, changementsDetacher, changementsFixer, changementsVerrou, compterObjets, fixesSous, fondEnOrdre, minuscule, quiBouge, texteCollage } from '../src/verrou'

let horloge = new Date('2026-10-12T08:00:00').getTime()
let numero = 1000

beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
afterEach(() => vi.useRealTimers())

/** Avance l'horloge, puis laisse le film noter l'étape (il le fait juste après) */
async function attendre(ms: number) { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

const trait = (id: string, x = 0, y = 0, o: Partial<Trait> = {}): Trait =>
  ({ id, type: 'trait', x, y, z: numero++, auteur: 'moi', pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false, ...o })
const image = (id: string, z: number, o: Partial<ImageForme> = {}): ImageForme =>
  ({ id, type: 'image', x: 0, y: 0, z, auteur: 'moi', src: 'b-' + id, l: 100, h: 50, m: [1, 0, 0, 1], ...o })
const point = (id: string, x: number, y: number, o: Partial<Polygone> = {}): Polygone =>
  ({ id, type: 'polygone', x, y, z: numero++, auteur: 'moi', pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A'], ...o })

/** Un tableau d'une page, sans enregistrement, où ces formes sont posées
 *  chacune en son geste */
async function tableau(formes: Forme[]) {
  const t = new Tableau(null)
  const p = t.ajouterPage('carreaux', 0)
  t.pageVue = p
  await attendre(30 * 60_000)
  for (const f of formes) { t.nouveauGeste(); t.poser(p, f); await attendre(800) }
  return { t, p }
}
const page = (t: Tableau, p: string) => [...t.formesDe(p)!.values()]
const forme = (t: Tableau, p: string, id: string) => t.formesDe(p)!.get(id) as Forme & Record<string, unknown>

/** Écrit une commande comme App le fait : un geste, une transaction */
async function ecrire(t: Tableau, p: string, changements: { id: string; patch: Partial<Forme> }[], note?: 'reglage') {
  t.nouveauGeste()
  t.modifier(p, changements, note ? { note } : {})
  t.nouveauGeste()
  await attendre(800)
}

describe('types.ts : libre', () => {
  it('ni verrouillé ni fixé en fond ; le groupe n\'y change rien', () => {
    expect(libre(trait('a'))).toBe(true)
    expect(libre(trait('a', 0, 0, { verrou: true }))).toBe(false)
    expect(libre(image('i', 1, { fixe: true }))).toBe(false)
    expect(libre(image('i', 1, { groupe: 'g' }))).toBe(true)
  })
})

describe('verrouiller', () => {
  it('seulement ce qui change ; jamais une image fixée ; déverrouiller retire la clé', () => {
    const f = [trait('a'), trait('b', 0, 0, { verrou: true }), image('i', 1, { fixe: true })]
    expect(changementsVerrou(f, ['a', 'b', 'i'], true)).toEqual([{ id: 'a', patch: { verrou: true } }])
    expect(changementsVerrou(f, ['a', 'b', 'i'], false)).toEqual([{ id: 'b', patch: { verrou: undefined } }])
    expect(changementsVerrou(f, ['x'], true)).toEqual([])
  })

  it('une étape d\'annulation, notée « réglage » ; Ctrl+Z rend l\'objet libre, et la clé disparaît au déverrouillage', async () => {
    const { t, p } = await tableau([trait('a'), trait('b')])
    const u = t.annulationDe(p)!, n = u.undoStack.length, film = t.film.length
    await ecrire(t, p, changementsVerrou(page(t, p), ['a', 'b'], true), 'reglage')
    expect(forme(t, p, 'a').verrou).toBe(true); expect(forme(t, p, 'b').verrou).toBe(true)
    expect(u.undoStack.length).toBe(n + 1)
    expect(t.film.length).toBe(film + 1)
    expect(t.film.get(t.film.length - 1).reglage).toBe(true)
    t.annuler(p)
    expect('verrou' in forme(t, p, 'a')).toBe(false); expect('verrou' in forme(t, p, 'b')).toBe(false)
    // Déverrouiller : la clé quitte la forme, et Ctrl+Z la rend
    t.retablir(p)
    await ecrire(t, p, changementsVerrou(page(t, p), ['a'], false), 'reglage')
    expect(Object.keys(forme(t, p, 'a'))).not.toContain('verrou')
    expect(t.film.get(t.film.length - 1).reglage).toBe(true)
    t.annuler(p)
    expect(forme(t, p, 'a').verrou).toBe(true)
  })
})

describe('fixer en fond', () => {
  it('sous TOUT ce qui est sur la page, dans leur ordre ; sans groupe ni verrou ; une étape, pas un réglage', async () => {
    const { t, p } = await tableau([trait('a'), image('i', 5000, { groupe: 'g', verrou: true }), image('j', 6000), trait('b'), image('k', 7000, { groupe: 'g' })])
    const min = Math.min(...page(t, p).map(f => f.z))
    const ch = changementsFixer(page(t, p), ['k', 'i', 'a'])
    // Seulement des images, dans l'ordre de leurs z
    expect(ch.map(c => c.id)).toEqual(['i', 'k'])
    const u = t.annulationDe(p)!, n = u.undoStack.length
    await ecrire(t, p, ch)
    const [i, k] = [forme(t, p, 'i'), forme(t, p, 'k')]
    expect(i.fixe).toBe(true); expect(k.fixe).toBe(true)
    expect(i.z).toBe(min - 2); expect(k.z).toBe(min - 1)
    expect(page(t, p).filter(f => !f.fixe).every(f => f.z > k.z)).toBe(true)
    expect('groupe' in i || 'verrou' in i || 'groupe' in k).toBe(false)
    expect(fondEnOrdre(page(t, p))).toBe(true)
    // Le calque du fond : sous tout, à l'écran comme dans la prise
    expect(ordreDAffichage(page(t, p)).slice(0, 2).map(f => f.id)).toEqual(['i', 'k'])
    expect(u.undoStack.length).toBe(n + 1)
    expect(t.film.get(t.film.length - 1).reglage).toBeUndefined()
    t.annuler(p)
    expect(forme(t, p, 'i')).toMatchObject({ z: 5000, groupe: 'g', verrou: true })
    expect('fixe' in forme(t, p, 'i')).toBe(false)
    // Déjà fixée : rien
    expect(changementsFixer([image('x', 1, { fixe: true })], ['x'])).toEqual([])
  })
})

describe('détacher du fond', () => {
  it('seule image fixée : elle garde son z (déjà sous les images libres) ; une étape, pas un réglage', async () => {
    const { t, p } = await tableau([image('f', -10, { fixe: true }), image('j', 6000), trait('a')])
    const ch = changementsDetacher(page(t, p), ['f'])
    expect(ch).toEqual([{ id: 'f', patch: { fixe: undefined } }])
    await ecrire(t, p, ch)
    expect(forme(t, p, 'f').z).toBe(-10)
    expect('fixe' in forme(t, p, 'f')).toBe(false)
    expect(t.film.get(t.film.length - 1).reglage).toBeUndefined()
    t.annuler(p)
    expect(forme(t, p, 'f').fixe).toBe(true)
  })

  it('deux images fixées : celle du dessous, détachée, passe au-dessus de l\'autre et sous les libres (l\'invariant tient)', async () => {
    const { t, p } = await tableau([image('f1', -20, { fixe: true }), image('f2', -10, { fixe: true }), image('j', 6000), image('k', 7000)])
    expect(fondEnOrdre(page(t, p))).toBe(true)
    const ch = changementsDetacher(page(t, p), ['f1'])
    // Sans z neuf, f1 (libre, z −20) serait sous f2 (fixée, z −10) : la
    // version d'avant, qui range les images par z, la peindrait dessous
    expect(fondEnOrdre(page(t, p).map(f => f.id === 'f1' ? { ...f, fixe: undefined } : f))).toBe(false)
    await ecrire(t, p, ch)
    const z = forme(t, p, 'f1').z
    expect(z).toBeGreaterThan(-10); expect(z).toBeLessThan(6000)
    expect(fondEnOrdre(page(t, p))).toBe(true)
    // Elle est la plus basse des images libres
    expect(ordreDAffichage(page(t, p)).map(f => f.id)).toEqual(['f2', 'f1', 'j', 'k'])
    t.annuler(p)
    expect(forme(t, p, 'f1')).toMatchObject({ fixe: true, z: -20 })
  })

  it('les deux à la fois, ou celle du dessus seule ; sans image libre ; un fichier qui a perdu l\'invariant', () => {
    const f1 = image('f1', -20, { fixe: true }), f2 = image('f2', -10, { fixe: true }), f3 = image('f3', -5, { fixe: true })
    const j = image('j', 6000)
    // Toutes : chacune garde son z (aucune image ne reste fixée)
    expect(changementsDetacher([f1, f2, j], ['f1', 'f2'])).toEqual([{ id: 'f1', patch: { fixe: undefined } }, { id: 'f2', patch: { fixe: undefined } }])
    // Celle du dessus : déjà au-dessus de celle qui reste
    expect(changementsDetacher([f1, f2, j], ['f2'])).toEqual([{ id: 'f2', patch: { fixe: undefined } }])
    // Deux sous une troisième : dans leur ordre, entre elle et les libres
    const ch = changementsDetacher([f1, f2, f3, j], ['f1', 'f2'])
    const zs = ch.map(c => c.patch.z as number)
    expect(zs[0]).toBeGreaterThan(-5); expect(zs[1]).toBeGreaterThan(zs[0]); expect(zs[1]).toBeLessThan(6000)
    // Sans image libre : juste au-dessus de celles qui restent
    expect(changementsDetacher([f1, f2], ['f1'])).toEqual([{ id: 'f1', patch: { fixe: undefined, z: -9 } }])
    // L'invariant déjà perdu (une image libre sous une fixée) : au-dessus des fixées tout de même
    const abime = changementsDetacher([f1, f2, image('bas', -30)], ['f1'])
    expect(abime[0].patch.z).toBeGreaterThan(-10)
    // Des z trop proches pour en glisser un entre eux
    const serre = changementsDetacher([f1, image('g', 1e15, { fixe: true }), image('h', 1e15 + 0.125)], ['f1'])
    expect(serre[0].patch.z).toBeGreaterThan(1e15)
  })
})

describe('le collage d\'un verrouillé', () => {
  const copie = (formes: Forme[]): Copie => ({ v: 1, formes, images: {}, page: 'p', centre: { x: 0, y: 0 }, t: 1 })
  it('reste verrouillé et ne se sélectionne pas ; le message le dit', () => {
    const posees = collage(copie([trait('a', 0, 0, { verrou: true })]), { dx: 40, dy: 40, moi: 'moi', existantes: [] })
    expect(posees[0].verrou).toBe(true)
    expect(posees.filter(libre)).toEqual([])
    expect(texteCollage(posees, messageVerrou('mouse'), messageDetacher('mouse'))).toBe('Collé, verrouillé. Clic droit dessus pour le déverrouiller.')
  })
  it('une image fixée arrive fixée, sous tout ; un mélange ; tout libre : pas de message', () => {
    const existantes = [trait('x'), image('y', 50)]
    const posees = collage(copie([image('i', 9, { fixe: true })]), { dx: 0, dy: 0, moi: 'moi', existantes })
    expect(posees[0].fixe).toBe(true)
    expect(posees[0].z).toBeLessThan(Math.min(...existantes.map(f => f.z)))
    expect(fondEnOrdre([...existantes, ...posees])).toBe(true)
    expect(texteCollage(posees, messageVerrou('pen', false), messageDetacher('pen', false))).toBe('Image collée dans le fond. Bouton du stylet dans le vide pour la détacher.')
    const deux = collage(copie([image('i', 9, { fixe: true }), image('j', 10, { fixe: true })]), { dx: 0, dy: 0, moi: 'moi', existantes })
    expect(texteCollage(deux, '', messageDetacher('touch', true, true))).toBe('Images collées dans le fond. Appui long dans le vide pour les détacher.')
    const melange = collage(copie([trait('a', 0, 0, { verrou: true }), trait('b')]), { dx: 0, dy: 0, moi: 'moi', existantes })
    expect(melange.filter(libre)).toHaveLength(1)
    expect(texteCollage(melange, 'v', 'f')).toBe('Collé ; ce qui est verrouillé ou fixé en fond n\'est pas sélectionné.')
    expect(texteCollage(collage(copie([trait('a')]), { dx: 0, dy: 0, moi: 'moi', existantes }), 'v', 'f')).toBeNull()
  })
})

describe('ce qui bouge quand on pousse', () => {
  it('un point verrouillé repéré sur une image la suit quand on la pousse aux flèches ; un verrouillé choisi ne bouge pas', async () => {
    const { t, p } = await tableau([image('i', 5000), point('A', 20, 20, { lie: 'i', verrou: true }), point('B', 300, 300, { verrou: true }), trait('a', 0, 0, { verrou: true })])
    // Les flèches, comme App.pousser : ce que dit quiBouge, décalé de 4
    const bouge = quiBouge(page(t, p), new Set(['i']))
    expect(bouge.map(f => f.id).sort()).toEqual(['A', 'i'])
    await ecrire(t, p, bouge.map(f => ({ id: f.id, patch: { x: f.x + 4, y: f.y } })))
    expect(forme(t, p, 'i').x).toBe(4); expect(forme(t, p, 'A').x).toBe(24)
    // Toujours verrouillé, toujours sur son image
    expect(forme(t, p, 'A')).toMatchObject({ verrou: true, lie: 'i' })
    // Une sélection verrouillée (son menu ouvert) ne bouge pas, et son point non plus
    expect(quiBouge(page(t, p), new Set(['a', 'B']))).toEqual([])
    expect(quiBouge(page(t, p), new Set(['i', 'a'])).map(f => f.id).sort()).toEqual(['A', 'i'])
    // Une image verrouillée ne fait pas bouger ses points
    expect(quiBouge([image('v', 1, { verrou: true }), point('C', 0, 0, { lie: 'v' })], new Set(['v']))).toEqual([])
  })
})

describe('les images du fond sous un point ; compter les objets', () => {
  it('la plus haute d\'abord, les fixées seulement', () => {
    const l = [image('f1', -20, { fixe: true }), image('f2', -10, { fixe: true }), image('j', 6000), image('loin', -5, { fixe: true, x: 500 })]
    expect(fixesSous(l, 50, 25).map(f => f.id)).toEqual(['f2', 'f1'])
    expect(fixesSous(l, 50, 80)).toEqual([])
  })
  it('un point repéré sur une image du nombre compte avec elle', () => {
    expect(compterObjets([image('i', 1), point('A', 0, 0, { lie: 'i' }), point('B', 0, 0, { lie: 'autre' })])).toBe(2)
    expect(accorder(1, 'objet verrouillé sur cette page', 'objets verrouillés sur cette page')).toBe('1 objet verrouillé sur cette page')
    expect(accorder(3, 'objet verrouillé', 'objets verrouillés')).toBe('3 objets verrouillés')
  })
})

describe('les mots, Maj + L, la barre d\'actions', () => {
  it('messageVerrou et messageDetacher : la souris, la tablette graphique, l\'écran tactile', () => {
    expect(messageVerrou('mouse')).toBe('Clic droit dessus pour le déverrouiller.')
    expect(messageVerrou('pen', false)).toBe('Bouton du stylet dessus pour le déverrouiller.')
    expect(messageVerrou('pen', true)).toBe('Appui long dessus pour le déverrouiller.')
    expect(messageVerrou('touch', false)).toBe('Appui long dessus pour le déverrouiller.')
    expect(messageDetacher('mouse')).toBe('Clic droit dans le vide pour la détacher.')
    expect(messageDetacher('pen', false)).toBe('Bouton du stylet dans le vide pour la détacher.')
    expect(messageDetacher('pen', true)).toBe('Appui long dans le vide pour la détacher.')
    expect(messageDetacher('touch')).toBe('Appui long dans le vide pour la détacher.')
    expect(minuscule(messageVerrou('mouse'))).toBe('clic droit dessus pour le déverrouiller.')
  })
  it('Maj + L : la touche, et tenue en plein geste seulement avec une sélection', () => {
    const k = (key: string, o: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean } = {}) =>
      ({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...o })
    expect(toucheVerrou(k('L', { shiftKey: true }))).toBe(true)
    expect(toucheVerrou(k('l', { shiftKey: true }))).toBe(true)
    expect(toucheVerrou(k('l'))).toBe(false)
    expect(toucheVerrou(k('L', { shiftKey: true, ctrlKey: true }))).toBe(false)
    expect(toucheVerrou(k('L', { shiftKey: true, altKey: true }))).toBe(false)
    expect(toucheTenueEnGeste(k('L', { shiftKey: true }), true)).toBe(true)
    expect(toucheTenueEnGeste(k('L', { shiftKey: true }), false)).toBe(false)
  })
  it('la barre d\'actions ne se montre pas sur ce qui est verrouillé', () => {
    const base: EtatBarre = { pris: 1, partie: false, options: false, menu: false, mouvement: false, lecture: false, placement: false, seance: false, fenetre: false, outilSelection: true, doigtQuiDeplace: false }
    expect(barreVisible(base)).toBe(true)
    expect(barreVisible({ ...base, protege: false })).toBe(true)
    expect(barreVisible({ ...base, protege: true })).toBe(false)
  })
})

describe('le cadenas d\'un objet tourné (vérification « appareils » du lot 5)', () => {
  const img = (m: [number, number, number, number]): ImageForme =>
    ({ id: 'i', type: 'image', z: 1, auteur: 't', src: 's', x: 100, y: 100, l: 60, h: 40, m, verrou: true })
  const proche = (p: { x: number; y: number }, x: number, y: number) => { expect(p.x).toBeCloseTo(x, 6); expect(p.y).toBeCloseTo(y, 6) }

  it('une image droite : le coin haut droit de sa boîte, comme avant', () => {
    const f = img([4, 0, 0, 4])                                           // 240 × 160
    proche(coinHautDroit(coinsVus(f, { x: 0, y: 0, l: 0, h: 0 })), 340, 100)
    // écarté de 6 de chaque côté : le coin du cadre gris, comme le rectangle d'avant
    const q = ecarterCoins(coinsVus(f, { x: 0, y: 0, l: 0, h: 0 }), 6)
    proche(coinHautDroit(q), 346, 94)
    proche(q[0], 94, 94); proche(q[2], 346, 266)
  })

  it('une image tournée de 30° : un coin de l\'image, et non celui de la boîte droite (dans le vide)', () => {
    const a = Math.PI / 6, c = Math.cos(a), s = Math.sin(a)
    const f = img([4 * c, 4 * s, -4 * s, 4 * c])
    const coins = coinsVus(f, { x: 0, y: 0, l: 0, h: 0 })
    const p = coinHautDroit(coins)
    // le coin (l, 0) de l'image : le plus à droite, sur l'image
    proche(p, 100 + 240 * c, 100 + 240 * s)
    expect(coins.some(q => Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9)).toBe(true)
    // le coin de la boîte droite, lui, est loin de tout coin de l'image
    const xs = coins.map(q => q.x), ys = coins.map(q => q.y)
    const boite = { x: Math.max(...xs), y: Math.min(...ys) }
    expect(Math.hypot(boite.x - p.x, boite.y - p.y)).toBeGreaterThan(100)
    // écarté de 6 : le coin s'éloigne de 6 le long de chacun des deux côtés
    const q = coinHautDroit(ecarterCoins(coins, 6))
    expect(Math.hypot(q.x - p.x, q.y - p.y)).toBeCloseTo(6 * Math.SQRT2, 6)
  })

  it('une image retournée par une symétrie : le coin le plus en haut à droite à l\'écran', () => {
    const f = img([-4, 0, 0, 4])                                          // de x = −140 à 100
    proche(coinHautDroit(coinsVus(f, { x: 0, y: 0, l: 0, h: 0 })), 100, 100)
    const q = ecarterCoins(coinsVus(f, { x: 0, y: 0, l: 0, h: 0 }), 6)
    proche(coinHautDroit(q), 106, 94)
  })

  it('une formule tournée : le coin de son rectangle tourné ; droite, sa boîte', () => {
    const fo = { id: 'f', type: 'formule', z: 1, auteur: 't', x: 0, y: 0, latex: 'x', couleur: '#000', taille: 28, rotation: Math.PI / 2 } as Forme
    const b = { x: 0, y: 0, l: 100, h: 20 }
    // tournée de 90° (sens horaire à l'écran) autour de (0, 0) : de x = −20 à 0, de y = 0 à 100
    proche(coinHautDroit(coinsVus(fo, b)), 0, 0)
    const droite = { ...fo, rotation: undefined } as Forme
    proche(coinHautDroit(coinsVus(droite, b)), 100, 0)
  })

  it('un carré tourné de 45° : à égalité, le plus haut ; un côté nul ne pousse pas', () => {
    const r = [{ x: 0, y: -10 }, { x: 10, y: 0 }, { x: 0, y: 10 }, { x: -10, y: 0 }]
    proche(coinHautDroit(r), 0, -10)
    const plat = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 0 }, { x: 0, y: 0 }]
    for (const p of ecarterCoins(plat, 3)) { expect(Number.isFinite(p.x)).toBe(true); expect(Number.isFinite(p.y)).toBe(true) }
  })
})
