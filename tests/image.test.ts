// L'image copiée (src/sorties/image.ts) : sa taille et le nom de son fichier.
// Jamais plus fine que l'écran à 100 % (2 pixels par unité, au dpr 2), au
// plus environ 4 millions de pixels et 4 096 pixels de côté : une page très
// haute reste lisible. Un nom de fichier propre partout (Windows compris).
import { describe, expect, it } from 'vitest'
import { COTE_IMAGE, MARGE_IMAGE, PIXELS_IMAGE, cameraDe, nomDeFichier, nomDeLImage, tailleImage, tresHaute } from '../src/sorties/image'

describe('tailleImage', () => {
  it('une petite page : à 100 % (2 pixels par unité, la marge comprise)', () => {
    const t = tailleImage({ l: 400, h: 300 })
    expect(t.z).toBe(1)
    expect(t).toEqual({ z: 1, l: (400 + 2 * MARGE_IMAGE) * 2, h: (300 + 2 * MARGE_IMAGE) * 2 })
  })

  it('une grande page : au plus environ 4 millions de pixels, sans déformer', () => {
    const t = tailleImage({ l: 3000, h: 2000 })
    expect(t.z).toBeLessThan(1)
    expect(t.l * t.h).toBeLessThanOrEqual(PIXELS_IMAGE * 1.002)
    expect(t.l * t.h).toBeGreaterThan(PIXELS_IMAGE * 0.99)
    expect(t.l / t.h).toBeCloseTo((3000 + 32) / (2000 + 32), 2)
    expect(Math.max(t.l, t.h)).toBeLessThanOrEqual(COTE_IMAGE)
  })

  it('une page très haute : 4 096 pixels de haut, des lettres encore lisibles (1 900 × 10 000 unités → 779 × 4 096)', () => {
    const t = tailleImage({ l: 1900 - 2 * MARGE_IMAGE, h: 10000 - 2 * MARGE_IMAGE })
    expect(t).toEqual({ z: expect.closeTo(0.2048, 6), l: 779, h: 4096 })
    // Une lettre de 60 unités : 25 px (12 avec un plafond de 2 000 px par côté)
    expect(Math.round(60 * t.z * 2)).toBe(25)
  })

  it('un seul point, ou une boîte abîmée : une petite image, jamais vide', () => {
    expect(tailleImage({ l: 0, h: 0 })).toEqual({ z: 1, l: 64, h: 64 })
    const t = tailleImage({ l: NaN, h: Infinity })
    expect(t.l).toBeGreaterThan(0); expect(t.h).toBeGreaterThan(0)
  })

  it('une page plus haute que trois fois sa largeur : le message propose le PDF (découpé en A4)', () => {
    expect(tresHaute({ l: 400, h: 1201 })).toBe(true)
    expect(tresHaute({ l: 400, h: 1200 })).toBe(false)
    expect(tresHaute({ l: 1900, h: 10000 })).toBe(true)
    expect(tresHaute({ l: 0, h: 10 })).toBe(true)
    expect(tresHaute(null)).toBe(false)
  })

  it('la caméra de l\'image met le coin de la boîte, moins la marge, en (0, 0)', () => {
    const cam = cameraDe({ x: 100, y: -40, l: 10, h: 10 }, 0.5)
    expect(cam.x + (100 - MARGE_IMAGE) * 0.5).toBeCloseTo(0, 9)
    expect(cam.y + (-40 - MARGE_IMAGE) * 0.5).toBeCloseTo(0, 9)
  })
})

describe('nomDeFichier', () => {
  it('les caractères interdits deviennent « - », les blancs se regroupent', () => {
    expect(nomDeFichier('Exercice 12 : a/b\\c*d?e<f>g|h"i', 'png')).toBe('Exercice 12 - a-b-c-d-e-f-g-h-i.png')
    expect(nomDeFichier('  Une\tpage\n  bien   nommée ', 'pdf')).toBe('Une page bien nommée.pdf')
    expect(nomDeFichier('« Citation »\u0007', 'png')).toBe('- Citation --.png')
  })

  it('60 caractères au plus avant l\'extension, sans point ni espace au bout', () => {
    const n = nomDeFichier('é'.repeat(80), 'png')
    expect(n).toBe('é'.repeat(60) + '.png')
    expect(nomDeFichier('Exercice 12 p. 84.', 'png')).toBe('Exercice 12 p. 84.png')
    expect(nomDeFichier('a'.repeat(59) + ' b', '.png')).toBe('a'.repeat(59) + '.png')
  })

  it('rien de lisible : « page »', () => {
    expect(nomDeFichier('', 'png')).toBe('page.png')
    expect(nomDeFichier('   ', 'png')).toBe('page.png')
  })

  it('le nom de l\'image : page-3.png, le nom de la page, objets-page-3.png', () => {
    expect(nomDeLImage(3, null, false)).toBe('page-3.png')
    expect(nomDeLImage(3, 'Exercice 12 p. 84', false)).toBe('Exercice 12 p. 84.png')
    expect(nomDeLImage(3, 'Exercice 12 p. 84', true)).toBe('objets-page-3.png')
  })
})
