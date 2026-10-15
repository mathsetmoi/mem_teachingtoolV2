// La rotation d'une image importée (retouches après le lot 5) : ce qui s'en
// calcule sans navigateur. La pastille DESSINÉE pour un autre pointeur se
// prend là où on la voit (poigneeDeLAppui : un doigt après la souris, le
// crayon de l'iPad après le doigt), au lieu du côté du cadre qui déformait
// l'image ; le quart de tour du menu ⋯ (quartDeTour : exact, dans le bon
// sens, une étape sur un tableau) ; et les mots des messages : l'import
// (messageImagePosee, selon le pointeur et l'outil d'avant) et « Fixer en
// fond » (messageFixe : on la tourne après « Détacher l'image du fond »).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appliquer, cadreDe, poigneeDeLAppui, poigneeSous, quartDeTour, rotation, transformerForme } from '../src/cadre'
import type { Cadre } from '../src/cadre'
import { POIGNEE, messageFixe, messageImagePosee } from '../src/pointeurs'
import type { TypePointeur } from '../src/pointeurs'
import { coinsImage, englobante } from '../src/geometrie'
import type { Boite } from '../src/geometrie'
import { boiteDe } from '../src/revoir/bobine'
import { Tableau } from '../src/document'
import type { Forme, Formule, ImageForme, Trait } from '../src/types'

const base = { z: 7, auteur: 'moi' }
const image = (o: Partial<ImageForme> = {}): ImageForme => ({ ...base, id: 'i', type: 'image', x: 300, y: 250, src: 'banque1', l: 300, h: 200, m: [1, 0, 0, 1], ...o })
const MESURE = { l: 60, h: 40 }
const zone: Boite = { x: -1000, y: -1000, l: 4000, h: 4000 }
const o = (pointeur: TypePointeur, z = 1) => ({
  boite: (f: Forme) => (f.type === 'formule' ? englobante(f, { x: f.x, y: f.y, ...MESURE }) : boiteDe(f)), mesure: () => MESURE, z, pointeur, zoneLibre: zone,
})
const cam = { x: 0, y: 0, z: 1 }
/** Le cadre d'une image pour ce pointeur, et le centre de sa pastille à l'écran */
const cadre = (p: TypePointeur, f = image()) => cadreDe([f], o(p))!
const au = (c: Cadre, dy: number) => ({ x: c.pastille.x, y: c.pastille.y + dy })

describe('poigneeDeLAppui : la pastille qu\'on voit se prend, même peinte pour un autre pointeur', () => {
  it('souris puis doigt : la pastille de la souris (24 px) est sous le côté du haut du cadre du doigt ; l\'appui la prend', () => {
    const vu = cadre('mouse'), doigt = cadre('touch')
    expect(vu.pastille.y).toBe(250 - POIGNEE.ecart.mouse)
    expect(doigt.pastille.y).toBe(250 - POIGNEE.ecart.touch)
    // Le défaut : 9 px sous le centre de la pastille dessinée, le doigt seul prend le côté du haut (il déformait)
    expect(poigneeSous(doigt, au(vu, 9), cam, 'touch')).toEqual({ quoi: 'cote', i: 0 })
    expect(poigneeDeLAppui(doigt, au(vu, 9), cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toEqual({ quoi: 'pastille', i: 0 })
    // Partout dans le disque dessiné (rayon 11 à la souris)
    for (const dy of [-11, -6, 0, 6, 9, 11]) {
      expect(poigneeDeLAppui(doigt, au(vu, dy), cam, 'touch', { cadre: vu, pointeur: 'mouse' })?.quoi).toBe('pastille')
    }
    // Hors du disque, plus près du bord du cadre que de la pastille : le côté (le plus proche, comme poigneeSous)
    expect(poigneeDeLAppui(doigt, au(vu, 16), cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toEqual({ quoi: 'cote', i: 0 })
  })

  it('doigt puis crayon (sans survol) : la pastille du doigt (36 px), plus loin que celle du crayon (28 px), se prend', () => {
    const vu = cadre('touch'), crayon = cadre('pen')
    // 12 px au-dessus du centre dessiné : hors de la portée du crayon seul (sa pastille est 20 px plus bas)
    expect(poigneeSous(crayon, au(vu, -12), cam, 'pen')).toBeNull()
    expect(poigneeDeLAppui(crayon, au(vu, -12), cam, 'pen', { cadre: vu, pointeur: 'touch' })).toEqual({ quoi: 'pastille', i: 0 })
    for (const dy of [-16, -8, 0, 8, 16]) {
      expect(poigneeDeLAppui(crayon, au(vu, dy), cam, 'pen', { cadre: vu, pointeur: 'touch' })?.quoi).toBe('pastille')
    }
  })

  it('le même pointeur, ou rien de peint : comme poigneeSous ; les coins et les côtés restent les leurs', () => {
    const c = cadre('mouse')
    for (const s of [au(c, 0), au(c, 9), { x: 450, y: 252 }, { x: 600, y: 450 }, { x: 450, y: 350 }]) {
      expect(poigneeDeLAppui(c, s, cam, 'mouse', null)).toEqual(poigneeSous(c, s, cam, 'mouse'))
      expect(poigneeDeLAppui(c, s, cam, 'mouse', { cadre: c, pointeur: 'mouse' })).toEqual(poigneeSous(c, s, cam, 'mouse'))
    }
    // Souris puis doigt : un coin, un côté loin de la pastille dessinée restent un coin, un côté
    const vu = cadre('mouse'), doigt = cadre('touch')
    expect(poigneeDeLAppui(doigt, { x: 612, y: 462 }, cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toEqual({ quoi: 'coin', i: 2 })
    expect(poigneeDeLAppui(doigt, { x: 450, y: 452 }, cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toEqual({ quoi: 'cote', i: 2 })
    // Au milieu de l'image : rien (l'objet se prend, ailleurs)
    expect(poigneeDeLAppui(doigt, { x: 450, y: 350 }, cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toBeNull()
  })

  it('un cadre peint autour d\'un autre centre (la sélection a changé depuis) ne compte pas', () => {
    const vu = cadre('mouse', image({ x: 340 })), doigt = cadre('touch')
    expect(poigneeDeLAppui(doigt, { x: 490, y: 235 }, cam, 'touch', { cadre: vu, pointeur: 'mouse' })).toEqual(poigneeSous(doigt, { x: 490, y: 235 }, cam, 'touch'))
    expect(poigneeDeLAppui(doigt, { x: 490, y: 235 }, cam, 'touch', { cadre: vu, pointeur: 'mouse' })?.quoi).not.toBe('pastille')
  })

  it('une image tournée, à 200 % : la pastille dessinée au-dessus de SON haut se prend aussi', () => {
    const t = transformerForme(image(), rotation({ x: 450, y: 350 }, Math.PI / 6)) as ImageForme
    const z2 = { x: -300, y: -200, z: 2 }
    const vu = cadreDe([t], o('mouse', 2))!, doigt = cadreDe([t], o('touch', 2))!
    const s = { x: vu.pastille.x * 2 - 300, y: vu.pastille.y * 2 - 200 }
    // 8 px vers le cadre, le long du filet : le côté du haut, au doigt seul
    const f = { x: vu.filet[0].x - vu.pastille.x, y: vu.filet[0].y - vu.pastille.y }, lf = Math.hypot(f.x, f.y)
    const s8 = { x: s.x + f.x / lf * 8, y: s.y + f.y / lf * 8 }
    expect(poigneeSous(doigt, s8, z2, 'touch')?.quoi).toBe('cote')
    expect(poigneeDeLAppui(doigt, s8, z2, 'touch', { cadre: vu, pointeur: 'mouse' })?.quoi).toBe('pastille')
    // Le centre ne dépend pas du pointeur : elle tourne autour du même point
    expect(doigt.centre.x).toBeCloseTo(vu.centre.x); expect(doigt.centre.y).toBeCloseTo(vu.centre.y)
  })
})

describe('quartDeTour : exact, dans le bon sens', () => {
  it('à droite : ↻ à l\'écran (l\'axe des y descend) ; à gauche : ↺ ; quatre font un tour', () => {
    const c = { x: 100, y: 50 }
    expect(appliquer(quartDeTour(c, 'droite'), { x: 110, y: 50 })).toEqual({ x: 100, y: 60 })
    expect(appliquer(quartDeTour(c, 'gauche'), { x: 110, y: 50 })).toEqual({ x: 100, y: 40 })
    expect(quartDeTour(c, 'droite').slice(0, 4)).toEqual([0, 1, -1, 0])
    expect(quartDeTour(c, 'gauche').slice(0, 4)).toEqual([0, -1, 1, 0])
    let f: Forme = image()
    for (let k = 0; k < 4; k++) f = transformerForme(f, quartDeTour({ x: 450, y: 350 }, 'droite'))
    expect((f as ImageForme).m.map(v => v + 0)).toEqual([1, 0, 0, 1])
    expect(f.x).toBeCloseTo(300, 9); expect(f.y).toBeCloseTo(250, 9)
  })

  it('une image : son cadre tourne avec elle autour de son centre, ses coefficients 0 et ±1', () => {
    const i = image()
    const g = transformerForme(i, quartDeTour({ x: 450, y: 350 }, 'gauche')) as ImageForme
    expect(g.m.map(v => v + 0)).toEqual([0, -1, 1, 0])
    const c = coinsImage(g)
    // Le haut de l'image va à gauche (sens direct) : le coin haut gauche passe en bas à gauche
    expect(c[0].x).toBeCloseTo(350); expect(c[0].y).toBeCloseTo(500)
    const k = cadreDe([g], o('pen'))!
    expect(k.centre.x).toBeCloseTo(450); expect(k.centre.y).toBeCloseTo(350)
  })

  describe('sur un tableau : une étape d\'annulation, comme la pastille', () => {
    let horloge = new Date('2026-10-14T08:00:00').getTime()
    beforeEach(() => { vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(horloge) })
    afterEach(() => vi.useRealTimers())
    const attendre = async (ms: number) => { horloge += ms; vi.setSystemTime(horloge); await Promise.resolve(); await Promise.resolve() }

    it('une image, une formule et un trait tournés ensemble : une étape, un geste du film ; Ctrl+Z rend 0°', async () => {
      const t = new Tableau(null)
      const p = t.ajouterPage('blanc', 0); t.pageVue = p
      await attendre(30 * 60_000)
      const formule: Formule = { ...base, id: 'f', type: 'formule', x: 10, y: 20, latex: 'x', couleur: '#d0342c', taille: 28 }
      const trait: Trait = { ...base, id: 't', type: 'trait', x: 100, y: 100, pts: [0, 0, 0.3, 40, 0, 0.6], couleur: '#1b2230', taille: 3, opacite: 1, pression: true }
      for (const f of [image(), formule, trait]) { t.nouveauGeste(); t.poser(p, f); await attendre(800) }
      const pile = () => t.annulationDe(p)!.undoStack.length, film = () => t.film.length
      const p0 = pile(), f0 = film()
      const M = quartDeTour({ x: 300, y: 300 }, 'droite')
      t.nouveauGeste(); t.remplacer(p, [...t.formesDe(p)!.values()].map(f => transformerForme(f, M))); await attendre(800)
      expect(pile()).toBe(p0 + 1); expect(film()).toBe(f0 + 1)
      expect((t.formesDe(p)!.get('i') as ImageForme).m.map(v => v + 0)).toEqual([0, 1, -1, 0])
      expect((t.formesDe(p)!.get('f') as Formule).rotation).toBeCloseTo(Math.PI / 2)
      t.annuler(p); await attendre(800)
      expect((t.formesDe(p)!.get('i') as ImageForme).m).toEqual([1, 0, 0, 1])
      expect('rotation' in (t.formesDe(p)!.get('f') as Formule)).toBe(false)
    })
  })
})

describe('les messages : l\'import d\'une image, « Fixer en fond »', () => {
  it('l\'import : ses coins, sa pastille ; P au clavier, le bouton au doigt ; rien à reprendre depuis la Sélection', () => {
    const T = 'Image posée : ses coins l\'agrandissent, ↻ la tourne.'
    expect(messageImagePosee('mouse', 'stylo')).toBe(T + ' P : reprendre le Stylo.')
    // La tablette graphique (pas d'écran tactile) : le clavier est là
    expect(messageImagePosee('pen', 'stylo', false)).toBe(T + ' P : reprendre le Stylo.')
    // Le crayon de l'iPad, le doigt : pas de clavier, jamais « clic »
    expect(messageImagePosee('pen', 'stylo', true)).toBe(T + ' Touchez le Stylo pour écrire de nouveau.')
    expect(messageImagePosee('touch', 'stylo', true)).toBe(T + ' Touchez le Stylo pour écrire de nouveau.')
    // Ctrl+V : un clavier, quel que soit le dernier pointeur
    expect(messageImagePosee('touch', 'stylo', true, true)).toBe(T + ' P : reprendre le Stylo.')
    // Un autre outil : sa touche le rend (corrections des vérifications :
    // « Échap deux fois » ramenait à la Sélection quand l'image était déjà lâchée)
    expect(messageImagePosee('mouse', 'surligneur')).toBe(T + ' H : reprendre le Surligneur.')
    expect(messageImagePosee('touch', 'formule', true)).toBe(T + ' Touchez votre outil pour le reprendre.')
    expect(messageImagePosee('mouse', 'selection')).toBe(T)
    for (const p of ['mouse', 'pen', 'touch'] as const) for (const d of [false, true]) {
      expect(messageImagePosee(p, 'stylo', d)).not.toMatch(/MEM teachingtool|à l’écran/)
      if (p === 'touch' || (p === 'pen' && d)) expect(messageImagePosee(p, 'stylo', d)).not.toMatch(/clic/i)
    }
  })

  it('« Fixer en fond » : pour la tourner, d\'abord « Détacher l\'image du fond », dans les mots du pointeur', () => {
    expect(messageFixe('mouse', 1)).toBe('Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : clic droit dessus, puis « Détacher l\'image du fond ».')
    expect(messageFixe('pen', 1, false)).toBe('Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : bouton du stylet dessus, puis « Détacher l\'image du fond ».')
    expect(messageFixe('pen', 1, true)).toBe('Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : appui long dessus, puis « Détacher l\'image du fond ».')
    expect(messageFixe('touch', 1, true)).toContain('appui long dessus, puis « Détacher l\'image du fond »')
    expect(messageFixe('mouse', 3)).toBe('3 images fixées en fond : écrivez et entourez par-dessus. Pour les tourner ou les déplacer : clic droit dans le vide, puis « Détacher le fond ».')
  })
})
