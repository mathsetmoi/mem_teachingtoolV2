// Les trois petits outils de classe : le QR du replay, la fiche pour un
// élève absent (son texte), les touches 1, 2, 3 de l'épaisseur.
import { describe, expect, it } from 'vitest'
import { matriceQr, svgQr } from '../src/publication/qr'
import { couperEnLignes, messageEleveAbsent, nomDeLaFiche, texteSansMarques } from '../src/publication/fiche-absent'
import { toucheEpaisseur } from '../src/navigateur'
import { LECTEUR_EN_LIGNE, lienEleveParCode } from '../src/publication/comptes'

const LIEN = 'https://mathsetmoi.github.io/mem_teachingtoolV2/revoir.html?r=mem&code=k7f3q'

describe('le QR du replay', () => {
  it('est carré, avec les trois repères aux coins', () => {
    const m = matriceQr(LIEN)
    const n = m.length
    expect(n).toBeGreaterThanOrEqual(21)
    expect((n - 17) % 4).toBe(0)
    for (const l of m) expect(l.length).toBe(n)
    // Un repère : un carré noir de 7 modules, bord plein
    const repere = (r: number, c: number) => [0, 6].every(k => [0, 1, 2, 3, 4, 5, 6].every(j => m[r + k][c + j] && m[r + j][c + k]))
    expect(repere(0, 0)).toBe(true)
    expect(repere(0, n - 7)).toBe(true)
    expect(repere(n - 7, 0)).toBe(true)
  })
  it('est le même pour le même lien, autre pour un autre', () => {
    expect(matriceQr(LIEN)).toEqual(matriceQr(LIEN))
    expect(matriceQr(LIEN)).not.toEqual(matriceQr(LIEN.replace('k7f3q', 'a1b2c')))
  })
  it('accepte un accent (le nom d\'une classe)', () => {
    expect(() => matriceQr(LIEN + '&c=Séance')).not.toThrow()
  })
  it('se dessine en SVG, avec sa taille', () => {
    const s = svgQr(LIEN, 104)
    expect(s).toMatch(/^<svg/)
    expect(s).toContain('width="104"')
    expect(s).toContain('aria-label="QR du lien du replay"')
  })
})

describe('le lien de la version hors ligne', () => {
  it('pointe sur le lecteur de la version en ligne', () => {
    expect(lienEleveParCode(LECTEUR_EN_LIGNE, 'mem', 'k7f3q')).toBe(LIEN)
  })
})

describe('la fiche pour un élève absent', () => {
  const f = { jour: 'lundi 16 novembre', chapitre: 'Fonctions affines', titre: 'Séance du 16 novembre', texte: '**Cours** : définition\n• Exercice 12 p. 87\n__À faire__ : exercice 18', lien: LIEN }
  it('ôte les marques de Pronote', () => {
    expect(texteSansMarques(f.texte)).toBe('Cours : définition\n• Exercice 12 p. 87\nÀ faire : exercice 18')
  })
  it('écrit le message pour l\'ENT, avec le lien', () => {
    const m = messageEleveAbsent(f)
    expect(m).toContain('Voici ce que nous avons fait le lundi 16 novembre (Fonctions affines) :')
    expect(m).toContain('• Exercice 12 p. 87')
    expect(m).toContain(`Pour revoir la séance : ${LIEN}`)
    expect(m).toContain('PDF joint')
    expect(m).not.toContain('**')
  })
  it('sans lien ni texte : le titre, pas de ligne de lien', () => {
    const m = messageEleveAbsent({ ...f, texte: '', lien: null })
    expect(m).toContain('Séance du 16 novembre')
    expect(m).not.toContain('revoir la séance')
  })
  it('nomme le PDF', () => {
    expect(nomDeLaFiche('16 novembre', 'Fonctions affines')).toBe('Séance du 16 novembre - Fonctions affines.pdf')
    expect(nomDeLaFiche('16 novembre', 'Pythagore : cours/exos')).toBe('Séance du 16 novembre - Pythagore cours exos.pdf')
  })
  it('coupe le texte en lignes', () => {
    const l = couperEnLignes('un deux trois quatre\n\ncinq', 9, t => t.length)
    expect(l).toEqual(['un deux', 'trois', 'quatre', '', 'cinq'])
  })
})

describe('les touches 1, 2, 3 de l\'épaisseur', () => {
  const k = (code: string, key: string, o: Partial<KeyboardEvent> = {}) => ({ code, key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...o })
  it('la rangée du haut, en AZERTY comme en QWERTY', () => {
    expect(toucheEpaisseur(k('Digit1', '&'))).toBe(0)
    expect(toucheEpaisseur(k('Digit2', 'é'))).toBe(1)
    expect(toucheEpaisseur(k('Digit3', '"'))).toBe(2)
    expect(toucheEpaisseur(k('Digit1', '1'))).toBe(0)
    expect(toucheEpaisseur(k('Digit4', "'"))).toBeNull()
  })
  it('le pavé numérique, seulement quand il donne des chiffres', () => {
    expect(toucheEpaisseur(k('Numpad2', '2'))).toBe(1)
    expect(toucheEpaisseur(k('Numpad1', 'End'))).toBeNull()
  })
  it('ni avec Maj (tout voir), ni avec Ctrl, ⌘ ou Alt', () => {
    expect(toucheEpaisseur(k('Digit1', '1', { shiftKey: true }))).toBeNull()
    expect(toucheEpaisseur(k('Digit2', 'é', { ctrlKey: true }))).toBeNull()
    expect(toucheEpaisseur(k('Digit2', '~', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(toucheEpaisseur(k('Digit3', '3', { metaKey: true }))).toBeNull()
  })
})
