// La barre d'actions au-dessus de ce qui est pris : ce qu'elle montre selon
// ce qui est pris et le pointeur, et où elle se pose (au-dessus de l'objet,
// dessous s'il n'y a pas la place, en haut de la zone libre pour un objet
// plus haut que l'écran, jamais sur la barre d'outils sauf sur un téléphone
// où elle n'y tient pas, toujours dans la fenêtre). Ce qui se voit dans le
// navigateur (quand elle paraît, qu'elle suit la vue) est vérifié par l'essai
// Playwright du morceau.
import { describe, expect, it } from 'vitest'
import { actionsDe, placeBarre } from '../src/barre-actions'
import { ICONES } from '../src/icones'

const ids = (l: { id: string }[]) => l.map(a => a.id)

describe('ce que montre la barre', () => {
  it('un objet : Dupliquer, Copier, Supprimer, Options ; au doigt, Ajouter avant Options', () => {
    expect(ids(actionsDe({ n: 1, formule: false }, 'mouse'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: false }, 'pen'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: false }, 'touch'))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('une formule : Modifier en tête ; six boutons au doigt', () => {
    expect(ids(actionsDe({ n: 1, formule: true }, 'mouse'))).toEqual(['modifier', 'dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 1, formule: true }, 'touch'))).toEqual(['modifier', 'dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('plusieurs objets : pas de Modifier, même si l\'un est une formule', () => {
    expect(ids(actionsDe({ n: 3, formule: true }, 'mouse'))).toEqual(['dupliquer', 'copier', 'supprimer', 'options'])
    expect(ids(actionsDe({ n: 3, formule: false }, 'touch'))).toEqual(['dupliquer', 'copier', 'supprimer', 'ajouter', 'options'])
  })

  it('les libellés courts, les titres avec le raccourci (⌘ sur Mac)', () => {
    const l = actionsDe({ n: 1, formule: true }, 'mouse', 'Ctrl')
    expect(l.map(a => a.libelle)).toEqual(['Modifier', 'Dupliquer', 'Copier', 'Supprimer', 'Options'])
    expect(l.map(a => a.titre)).toEqual(['Modifier la formule (double-clic)', 'Dupliquer (Ctrl + D)', 'Copier (Ctrl + C)',
      'Supprimer (Suppr)', 'Toutes les options (clic droit)'])
    expect(actionsDe({ n: 1, formule: false }, 'mouse', '⌘')[0].titre).toBe('Dupliquer (⌘ + D)')
    expect(actionsDe({ n: 4, formule: false }, 'mouse').find(a => a.id === 'supprimer')!.titre).toBe('Supprimer les 4 objets (Suppr)')
  })

  it('Options dit le geste direct du pointeur ; jamais « clic » au doigt', () => {
    const titre = (p: 'mouse' | 'pen' | 'touch') => actionsDe({ n: 1, formule: false }, p).find(a => a.id === 'options')!.titre
    expect(titre('mouse')).toBe('Toutes les options (clic droit)')
    expect(titre('pen')).toBe('Toutes les options (bouton du stylet)')
    expect(titre('touch')).toBe('Toutes les options')
    for (const a of actionsDe({ n: 1, formule: true }, 'touch')) expect(a.titre).not.toMatch(/clic/)
  })

  it('Ajouter est un interrupteur ; Supprimer seul est en danger ; chaque icône existe', () => {
    const l = actionsDe({ n: 1, formule: true }, 'touch')
    const ajouter = l.find(a => a.id === 'ajouter')!
    expect(ajouter.interrupteur).toBe(true)
    expect(ajouter.titre).toBe('Ajouter d\'autres objets : touchez-les')
    expect(l.filter(a => a.danger).map(a => a.id)).toEqual(['supprimer'])
    for (const a of l) expect(ICONES[a.icone], a.id).toBeTruthy()
    // Copier : deux feuilles décalées ; Dupliquer : les mêmes et un +
    expect(ICONES[l.find(a => a.id === 'copier')!.icone]).toBe('M8 8h11v11H8zM5 16V5h11')
    expect(ICONES[l.find(a => a.id === 'dupliquer')!.icone]).toBe('M8 8h11v11H8zM5 16V5h11M13.5 11v5M11 13.5h5')
  })
})

describe('où elle se pose', () => {
  const fenetre = { l: 1366, h: 768 }, bords = { gauche: 70, haut: 70 }
  const L = 280, H = 62
  const objet = (left: number, top: number, right: number, bottom: number) => ({ left, top, right, bottom })

  it('juste au-dessus, à 10 px, centrée sur l\'objet : elle ne le cache pas', () => {
    const p = placeBarre(objet(500, 400, 700, 480), L, H, bords, fenetre)
    expect(p).toEqual({ left: 600 - L / 2, top: 400 - 10 - H, dessous: false })
    expect(p.top + H).toBeLessThanOrEqual(400)
  })

  it('un objet en haut de l\'écran : dessous, à 10 px', () => {
    const p = placeBarre(objet(500, 100, 700, 180), L, H, bords, fenetre)
    expect(p).toEqual({ left: 600 - L / 2, top: 190, dessous: true })
  })

  it('juste la place au-dessus (le bas de la barre du haut plus 8 px) : au-dessus', () => {
    const top = bords.haut + 8 + H + 10
    expect(placeBarre(objet(500, top, 700, top + 50), L, H, bords, fenetre).dessous).toBe(false)
    expect(placeBarre(objet(500, top - 1, 700, top + 50), L, H, bords, fenetre).dessous).toBe(true)
  })

  it('un objet plus haut que l\'écran : en haut de la zone libre, sous la barre du haut', () => {
    const p = placeBarre(objet(400, 20, 900, 760), L, H, bords, fenetre)
    expect(p.top).toBe(bords.haut + 8)
    expect(p.dessous).toBe(false)
  })

  it('jamais à gauche de la barre d\'outils, jamais hors de la fenêtre', () => {
    expect(placeBarre(objet(60, 400, 100, 440), L, H, bords, fenetre).left).toBe(bords.gauche + 8)
    expect(placeBarre(objet(1340, 400, 1400, 440), L, H, bords, fenetre).left).toBe(fenetre.l - L - 8)
    const bas = placeBarre(objet(500, 700, 700, 900), L, H, bords, fenetre)
    expect(bas.top).toBe(700 - 10 - H)
  })

  it('un téléphone où elle ne tient pas à droite de la barre d\'outils : elle passe devant, à 8 px du bord', () => {
    const tel = { l: 390, h: 844 }
    // 304 px tiennent entre la barre d'outils (70) et le bord : à droite d'elle
    expect(placeBarre(objet(100, 500, 200, 540), 304, 60, { gauche: 70, haut: 162 }, tel).left).toBe(78)
    // 320 px n'y tiennent pas : devant elle, dans la fenêtre
    const p = placeBarre(objet(100, 500, 200, 540), 320, 60, { gauche: 70, haut: 162 }, tel)
    expect(p.left).toBe(8)
    expect(p.left + 320).toBeLessThanOrEqual(tel.l - 8)
  })
})
