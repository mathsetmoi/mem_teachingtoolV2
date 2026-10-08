// Le menu commun d'une sélection de plusieurs objets : ce qu'il propose
// (seulement ce que le code sait appliquer à chacun), ce qu'il marque actif
// (ce que TOUS les objets concernés ont déjà), et ce que change chaque choix,
// objet par objet. Le menu lui-même (ouvert au clic droit, une étape
// d'annulation pour tous) se vérifie dans le navigateur.
import { describe, expect, it } from 'vitest'
import { TAILLES_FORMULE, aCouleur, aEpaisseur, change, changerCouleur, changerEpaisseur, changerPointilles, epaisseurPour, habillageCommun } from '../src/habillage'
import type { Cercle, Forme, Formule, ImageForme, Polygone, Segment, Trait } from '../src/types'

const base = { z: 1, auteur: 'moi', x: 0, y: 0 }
const NOIR = '#1b2230', ROUGE = '#d0342c'
const TAILLES = [2.5, 4.5, 9]
const trait = (o: Partial<Trait> = {}): Trait => ({ ...base, id: 't', type: 'trait', pts: [0, 0, 0.5, 10, 0, 0.5], couleur: NOIR, taille: 4.5, opacite: 1, pression: false, ...o })
const surligneur = (o: Partial<Trait> = {}): Trait => trait({ id: 's', taille: 22.5, opacite: 0.35, ...o })
const triangle = (o: Partial<Polygone> = {}): Polygone => ({ ...base, id: 'p', type: 'polygone', pts: [0, 0, 10, 0, 0, 10], ferme: true, couleur: NOIR, taille: 4.5, ...o })
const cercle = (o: Partial<Cercle> = {}): Cercle => ({ ...base, id: 'c', type: 'cercle', r: 20, couleur: NOIR, taille: 4.5, ...o })
const formule = (o: Partial<Formule> = {}): Formule => ({ ...base, id: 'f', type: 'formule', latex: 'x', couleur: NOIR, taille: 28, ...o })
const image = (): ImageForme => ({ ...base, id: 'i', type: 'image', src: 'a', l: 10, h: 10, m: [1, 0, 0, 1] })
const segment = (o: Partial<Segment> = {}): Segment => ({ ...base, id: 'g', type: 'segment', dx: 10, dy: 0, couleur: NOIR, taille: 4.5, ...o })

describe('ce que règle le menu commun', () => {
  it('la couleur : tout, sauf une image ; l\'épaisseur : les traits, les figures, les anciens segments', () => {
    expect([trait(), triangle(), cercle(), formule(), segment(), image()].map(aCouleur)).toEqual([true, true, true, true, true, false])
    expect([trait(), triangle(), cercle(), formule(), segment(), image()].map(aEpaisseur)).toEqual([true, true, true, false, true, false])
  })

  it('un trait de surligneur prend cinq fois l\'épaisseur choisie, comme au surligneur', () => {
    expect(epaisseurPour(trait(), 9)).toBe(9)
    expect(epaisseurPour(surligneur(), 9)).toBe(45)
    expect(epaisseurPour(triangle(), 2.5)).toBe(2.5)
  })

  it('trois tailles pour une formule : Petite 20, Normale 28 (celle de la pose), Grande 40', () => {
    expect(TAILLES_FORMULE.map(t => [t.nom, t.valeur])).toEqual([['Petite', 20], ['Normale', 28], ['Grande', 40]])
  })
})

describe('ce qui est actif : ce que tous ont déjà', () => {
  it('trois traits noirs moyens : le noir et le moyen ; pas de pointillés sans figure', () => {
    expect(habillageCommun([trait(), trait(), trait()], TAILLES)).toEqual({ couleurs: true, couleur: NOIR, epaisseurs: true, taille: 4.5, pointilles: null })
  })

  it('un trait rouge parmi des noirs : aucune couleur active', () => {
    expect(habillageCommun([trait(), trait({ couleur: ROUGE })], TAILLES).couleur).toBeNull()
  })

  it('un surligneur à 22,5 et un trait à 4,5 ont la même taille de la barre (moyen)', () => {
    expect(habillageCommun([trait(), surligneur()], TAILLES).taille).toBe(4.5)
    expect(habillageCommun([trait({ taille: 9 }), surligneur()], TAILLES).taille).toBeNull()
  })

  it('une image ne compte ni pour la couleur ni pour l\'épaisseur ; une formule pour la couleur seulement', () => {
    expect(habillageCommun([image(), trait({ couleur: ROUGE })], TAILLES)).toMatchObject({ couleur: ROUGE, taille: 4.5 })
    expect(habillageCommun([formule({ couleur: ROUGE }), trait({ couleur: ROUGE, taille: 9 })], TAILLES)).toMatchObject({ couleur: ROUGE, taille: 9, epaisseurs: true })
  })

  it('deux images : rien à régler', () => {
    expect(habillageCommun([image(), image()], TAILLES)).toEqual({ couleurs: false, couleur: null, epaisseurs: false, taille: null, pointilles: null })
  })

  it('des formules seules : la couleur, pas d\'épaisseur', () => {
    expect(habillageCommun([formule(), formule()], TAILLES)).toMatchObject({ couleurs: true, couleur: NOIR, epaisseurs: false, taille: null })
  })

  it('les pointillés : actifs si toutes les figures en ont (les traits ne comptent pas)', () => {
    expect(habillageCommun([triangle({ tirets: true }), cercle({ tirets: true }), trait()], TAILLES).pointilles).toBe(true)
    expect(habillageCommun([triangle({ tirets: true }), cercle()], TAILLES).pointilles).toBe(false)
  })
})

describe('ce que change chaque choix, objet par objet', () => {
  const tous: Forme[] = [trait(), surligneur(), triangle(), cercle(), formule(), segment(), image()]

  it('une couleur : tous sauf l\'image', () => {
    expect(tous.map(changerCouleur(ROUGE))).toEqual([{ couleur: ROUGE }, { couleur: ROUGE }, { couleur: ROUGE }, { couleur: ROUGE }, { couleur: ROUGE }, { couleur: ROUGE }, null])
  })

  it('une épaisseur : le surligneur ×5 ; ni la formule (ses caractères), ni l\'image', () => {
    expect(tous.map(changerEpaisseur(9))).toEqual([{ taille: 9 }, { taille: 45 }, { taille: 9 }, { taille: 9 }, null, { taille: 9 }, null])
  })

  it('les pointillés : les figures seules', () => {
    expect(tous.map(changerPointilles(true))).toEqual([null, null, { tirets: true }, { tirets: true }, null, null, null])
  })

  it('un objet qui a déjà ce réglage n\'est pas réécrit (pas d\'étape pour rien)', () => {
    expect(change(trait(), { couleur: NOIR })).toBe(false)
    expect(change(trait(), { couleur: ROUGE })).toBe(true)
    expect(change(triangle(), { tirets: false })).toBe(false)         // sans pointillés, l'absence vaut non
    expect(change(triangle(), { tirets: true })).toBe(true)
    expect(change(triangle({ tirets: true }), { tirets: true })).toBe(false)
  })
})
