// La calculatrice NumWorks : une image marquée sur la page. Son écran qui
// change est une étape du film (le replay le montre), jamais une étape
// d'annulation ; elle se copie et se colle en restant une calculatrice ; la
// page de l'émulateur se prépare pour qu'on puisse copier son écran.
import { describe, expect, it } from 'vitest'
import { strToU8 } from 'fflate'
import { Tableau } from '../src/document'
import type { ImageForme } from '../src/types'
import { validerCopie } from '../src/presse-papiers'
import { cadreDe, poigneeSous, zonesDesPoignees } from '../src/cadre'
import { empreinte, echelleDePose, ecranDuDessin, HAUTEUR, LARGEURS } from '../src/calculatrice/dessin'
import { rangerLesVoisins, ressembleAEmulateur } from '../src/calculatrice/emulateurs'
import { estCalculatrice, matriceCss, pagePourLeCadre } from '../src/calculatrice/vivantes'

const attendre = async () => { await Promise.resolve(); await Promise.resolve() }

const calculatrice = (id = 'C1'): ImageForme => ({ id, type: 'image', x: 10, y: 20, z: 1, auteur: 'moi', src: 'calc-accueil-lycee',
  l: 360, h: 660, m: [0.5, 0, 0, 0.5], calculatrice: 'lycee' })

describe('l\'écran de la calculatrice dans le film', () => {
  it('un écran neuf est une étape du film sur sa page, pas une étape d\'annulation', async () => {
    const t = new Tableau(null)
    await t.charger()
    const a = t.ordre.get(0)
    t.pageVue = a
    t.nouveauGeste(); t.poser(a, calculatrice())
    await attendre()
    const film = t.film.length, pile = t.annulationDe(a)!.undoStack.length
    t.ecranDeCalculatrice(a, 'C1', 'calc-lycee-x')
    await attendre()
    expect(t.formesDe(a)!.get('C1')).toMatchObject({ src: 'calc-lycee-x', calculatrice: 'lycee', x: 10 })
    expect(t.film.length).toBe(film + 1)
    expect(t.film.get(t.film.length - 1).page).toBe(a)
    expect(t.annulationDe(a)!.undoStack.length).toBe(pile)
    // Le même écran ne fait rien de plus
    t.ecranDeCalculatrice(a, 'C1', 'calc-lycee-x')
    await attendre()
    expect(t.film.length).toBe(film + 1)
  })

  it('une image ordinaire, ou une calculatrice partie, ne change pas', async () => {
    const t = new Tableau(null)
    await t.charger()
    const a = t.ordre.get(0)
    t.pageVue = a
    const { calculatrice: _, ...image } = calculatrice('I1')
    t.nouveauGeste(); t.poser(a, image as ImageForme)
    await attendre()
    const film = t.film.length
    t.ecranDeCalculatrice(a, 'I1', 'calc-lycee-x')
    t.ecranDeCalculatrice(a, 'absente', 'calc-lycee-x')
    await attendre()
    expect(t.formesDe(a)!.get('I1')!).toMatchObject({ src: 'calc-accueil-lycee' })
    expect(t.film.length).toBe(film)
  })
})

describe('la calculatrice comme objet de la page', () => {
  it('se reconnaît, et reste une calculatrice une fois copiée', () => {
    const f = calculatrice()
    expect(estCalculatrice(f)).toBe(true)
    expect(estCalculatrice({ ...f, calculatrice: undefined })).toBe(false)
    const PNG = 'data:image/png;base64,iVBORw0KGgo='
    const c = validerCopie({ v: 1, formes: [f], images: { 'calc-accueil-lycee': PNG }, page: 'p', centre: { x: 0, y: 0 }, t: 1 })!
    expect(c.formes[0]).toMatchObject({ type: 'image', calculatrice: 'lycee' })
    const autre = validerCopie({ v: 1, formes: [{ ...f, calculatrice: 'casio' }], images: { 'calc-accueil-lycee': PNG }, page: 'p', centre: { x: 0, y: 0 }, t: 1 })!
    expect(autre.formes[0]).not.toHaveProperty('calculatrice')
  })

  it('sa vraie calculatrice suit l\'image : sa matrice, le déplacement, la transformation en cours', () => {
    const f = calculatrice()
    expect(matriceCss(f, null, null)).toBe('matrix(0.5, 0, 0, 0.5, 10, 20)')
    expect(matriceCss(f, { dx: 5, dy: -5 }, null)).toBe('matrix(0.5, 0, 0, 0.5, 15, 15)')
    // Doublée autour de l'origine du monde
    expect(matriceCss(f, null, [2, 0, 0, 2, 0, 0])).toBe('matrix(1, 0, 0, 1, 20, 40)')
  })

  it('prise seule, elle n\'a que ses quatre coins : ni pastilles ↻ ↺, ni côtés', () => {
    const o = { boite: () => null, mesure: () => ({ l: 0, h: 0 }), z: 1, pointeur: 'mouse' as const, zoneLibre: { x: -1000, y: -1000, l: 4000, h: 4000 } }
    const k = cadreDe([calculatrice()], o)!
    expect([k.fixe, k.cotes, k.coins.length]).toEqual([true, false, 4])
    expect(poigneeSous(k, k.pastille, { x: 0, y: 0, z: 1 }, 'mouse')).toBeNull()
    expect(poigneeSous(k, k.coins[2], { x: 0, y: 0, z: 1 }, 'mouse')).toEqual({ quoi: 'coin', i: 2 })
    expect(zonesDesPoignees(k, 'mouse', 1)).toHaveLength(4)
    // Une image ordinaire garde les siennes
    const { calculatrice: _, ...image } = calculatrice()
    expect(cadreDe([image as ImageForme], o)!.fixe).toBeUndefined()
  })

  it('a la largeur de la vraie calculatrice, et son écran en 4:3', () => {
    expect(LARGEURS).toEqual({ lycee: 314, college: 356 })
    expect(ecranDuDessin(314)).toEqual({ x: 20, y: 60, l: 274, h: 205.5 })
  })

  it('se pose aux trois quarts de la vue, jamais plus grande que nature à ce zoom', () => {
    expect(echelleDePose(800, 1) * HAUTEUR).toBeCloseTo(600)
    expect(echelleDePose(8000, 1)).toBeCloseTo(1.2)
  })

  it('deux écrans identiques ont la même empreinte', () => {
    expect(empreinte('abc')).toBe(empreinte('abc'))
    expect(empreinte('abc')).not.toBe(empreinte('abd'))
  })
})

describe('la page de l\'émulateur', () => {
  it('reçoit en tête la ligne qui garde l\'image des canevas', () => {
    const p = pagePourLeCadre('<!doctype html><html><head><title>NumWorks</title></head><body></body></html>')
    expect(p.indexOf('preserveDrawingBuffer')).toBeGreaterThan(p.indexOf('<head>'))
    expect(p.indexOf('preserveDrawingBuffer')).toBeLessThan(p.indexOf('<title>'))
    expect(pagePourLeCadre('<!DOCTYPE html><body>x</body>').startsWith('<!DOCTYPE html><script>')).toBe(true)
  })

  it('n\'est prise que si elle ressemble à l\'émulateur de NumWorks', () => {
    expect(ressembleAEmulateur('<html><title>NumWorks Simulator</title></html>')).toBe(true)
    expect(ressembleAEmulateur('<html><title>Une autre page</title></html>')).toBe(false)
    expect(ressembleAEmulateur('numworks, mais pas une page')).toBe(false)
  })

  it('donnée dans un .zip, elle range ses scripts et ses styles voisins', () => {
    const fichiers = {
      'emu/index.html': strToU8(''),
      'emu/epsilon.js': strToU8('var a = "</script>"; Module()'),
      'emu/style.css': strToU8('body{margin:0}'),
    }
    const html = '<html><head><link rel="stylesheet" href="style.css"></head><body><script src="./epsilon.js"></script><script src="https://ailleurs/x.js"></script></body></html>'
    const r = rangerLesVoisins(html, 'emu/index.html', fichiers)
    expect(r).toContain('<style>body{margin:0}</style>')
    expect(r).toContain('<script>var a = "<\\/script>"; Module()</script>')
    expect(r).toContain('<script src="https://ailleurs/x.js"></script>')
  })
})
