// La mise en page du téléphone (lot 5, K10), dans ce qu'elle a de pur : la
// zone libre quand la barre des outils est posée en bas (« Tout voir », la
// pastille ↻), la barre d'actions et le menu complet qui restent au-dessus
// de la barre du bas, la requête du téléphone. Ce qui se voit (les barres,
// les menus « Plus », « Couleur » et « Autres outils », 44 px, rien qui se
// chevauche, l'écran qu'on tourne) est vérifié par l'essai Playwright
// lot5/K10-telephone.mjs.
import { describe, expect, it } from 'vitest'
import { zoneEntreBarres } from '../src/camera'
import { placeBarre } from '../src/barre-actions'
import { positionPanneau } from '../src/menus'
import { TELEPHONE } from '../src/navigateur'

const B = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b })
const R = B

describe('la requête du téléphone', () => {
  it('une seule, écrite une fois : 640 px de large au plus, ou basse sous le doigt', () => {
    expect(TELEPHONE).toBe('(max-width: 640px), (max-height: 500px) and (pointer: coarse)')
  })
})

describe('zoneEntreBarres : la barre des outils posée en bas', () => {
  it('en portrait (390 × 844) : du bord gauche jusqu\'au-dessus de la barre du bas, sous la barre du haut', () => {
    const z = zoneEntreBarres(390, 844, { outils: B(12, 774, 378, 832), haut: B(12, 12, 378, 70), zoom: null })
    expect(z).toEqual({ x: 16, y: 82, l: 358, h: 774 - 12 - 82 })
  })

  it('le plus petit (320 × 568, la barre à 4 px des bords) : rien sous la barre du bas', () => {
    const z = zoneEntreBarres(320, 568, { outils: B(4, 516, 316, 564), haut: B(12, 12, 308, 70), zoom: null })
    expect(z.y + z.h).toBeLessThanOrEqual(516)
    expect(z.x).toBe(16)
    expect(z.l).toBe(320 - 32)
  })

  it('en paysage (la barre à gauche, plus haute que large) : comme avant, à droite d\'elle', () => {
    const z = zoneEntreBarres(844, 390, { outils: B(12, 28, 70, 362), haut: B(525, 12, 832, 70), zoom: null })
    expect(z).toEqual({ x: 86, y: 82, l: 844 - 16 - 86, h: 390 - 12 - 82 })
  })

  it('une barre des outils à gauche n\'est jamais prise pour une barre du bas (le poste de la classe ne change pas)', () => {
    expect(zoneEntreBarres(1366, 768, { outils: B(12, 12, 70, 756), haut: B(525, 12, 1354, 70), zoom: B(1138, 698, 1354, 756) }))
      .toEqual({ x: 86, y: 82, l: 1264, h: 604 })
  })
})

describe('placeBarre : au-dessus de la barre du bas', () => {
  const fenetre = { l: 390, h: 844 }
  it('un objet juste au-dessus de la barre du bas : la barre d\'actions au-dessus de lui, jamais sur la barre du bas', () => {
    const p = placeBarre(R(40, 700, 200, 760), 260, 60, { gauche: 0, haut: 70, bas: 774 }, fenetre, 30)
    expect(p.top + 60).toBeLessThanOrEqual(774 - 8)
    expect(p.top).toBe(700 - 30 - 60)
  })

  it('pas la place au-dessus (un objet sous la barre du haut) : dessous, mais pas sur la barre du bas ; sinon en haut', () => {
    const p = placeBarre(R(40, 80, 200, 740), 260, 60, { gauche: 0, haut: 70, bas: 774 }, fenetre, 30)
    expect(p.top + 60).toBeLessThanOrEqual(774 - 8)
    expect(p.dessous).toBe(false)
    expect(p.top).toBe(78)
  })

  it('sans bas (le poste de la classe) : exactement comme avant', () => {
    const avant = placeBarre(R(500, 700, 700, 740), 300, 60, { gauche: 70, haut: 70 }, { l: 1366, h: 768 })
    const avecBas = placeBarre(R(500, 700, 700, 740), 300, 60, { gauche: 70, haut: 70, bas: 768 }, { l: 1366, h: 768 })
    expect(avecBas).toEqual(avant)
  })
})

describe('positionPanneau : le menu complet au-dessus de la barre du bas', () => {
  it('jamais sur la barre du bas, même ramené dans l\'écran', () => {
    const p = positionPanneau(R(40, 690, 200, 760), 374, 104, { l: 390, h: 844 }, { gauche: 8, haut: 76, bas: 774 })
    expect(p.top + 104).toBeLessThanOrEqual(774 - 8)
    expect(p.left).toBe(8)
  })

  it('sans bas : exactement comme avant', () => {
    const a = positionPanneau(R(400, 600, 700, 740), 600, 120, { l: 1366, h: 768 }, { gauche: 78, haut: 76 })
    const b = positionPanneau(R(400, 600, 700, 740), 600, 120, { l: 1366, h: 768 }, { gauche: 78, haut: 76, bas: 768 })
    expect(b).toEqual(a)
  })
})
