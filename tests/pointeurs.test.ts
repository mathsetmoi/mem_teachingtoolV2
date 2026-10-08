// Souris, stylet, doigt : quand un appui devient un glisser, ce qu'est une
// paume, quand le stylet écrit sur l'écran lui-même, et le rôle du doigt
// (un réglage de cet appareil, gardé dans le navigateur).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DOUBLE_TOUCHER, SEUIL_GLISSER, contactLarge, depasseSeuil, doubleToucher, ecranTactile, messageOptions, messageReconnue, messageSecondPoint, nouveauDepart, typePointeur } from '../src/pointeurs'
import { choisirDoigt, leDoigtDeplace, lire, noterStyletDirect, reglages } from '../src/reglages'

describe('le seuil du glisser', () => {
  it('8 px au doigt, 6 au stylet, 4 à la souris ; un pointeur inconnu est une souris', () => {
    expect(SEUIL_GLISSER).toEqual({ mouse: 4, pen: 6, touch: 8 })
    expect(nouveauDepart(0, 0, 1, 'touch').seuil).toBe(8)
    expect(nouveauDepart(0, 0, 1, 'pen').seuil).toBe(6)
    expect(nouveauDepart(0, 0, 1, 'mouse').seuil).toBe(4)
    expect(typePointeur('')).toBe('mouse')
    expect(nouveauDepart(0, 0, 1, 'kinect').type).toBe('mouse')
  })

  it('un doigt qui tremble de 7 px ne glisse pas ; à 8 px, il glisse', () => {
    const d = nouveauDepart(100, 100, 3, 'touch')
    expect(depasseSeuil(d, 107, 100)).toBe(false)
    expect(depasseSeuil(d, 104, 104)).toBe(false)          // 5,7 px en diagonale
    expect(depasseSeuil(d, 108, 100)).toBe(true)
  })

  it('une fois parti, il le reste jusqu\'au lever, même revenu au départ', () => {
    const d = nouveauDepart(0, 0, 1, 'pen')
    expect(depasseSeuil(d, 5, 0)).toBe(false)
    expect(depasseSeuil(d, 0, 6)).toBe(true)
    expect(depasseSeuil(d, 0, 0)).toBe(true)
    expect(d.parti).toBe(true)
  })
})

describe('la paume et le stylet', () => {
  it('un contact de plus de 30 px CSS est une paume ; 0 ou 1 (taille inconnue) ne l\'est pas', () => {
    expect(contactLarge({ width: 50, height: 20 })).toBe(true)
    expect(contactLarge({ width: 20, height: 31 })).toBe(true)
    expect(contactLarge({ width: 30, height: 30 })).toBe(false)
    expect(contactLarge({ width: 1, height: 1 })).toBe(false)
    expect(contactLarge({ width: 0, height: 0 })).toBe(false)
  })

  it('le stylet écrit sur l\'écran lui-même quand l\'écran est tactile ; une tablette graphique, jamais', () => {
    expect(ecranTactile({ maxTouchPoints: 5 })).toBe(true)
    expect(ecranTactile({ maxTouchPoints: 0 })).toBe(false)
    expect(ecranTactile({})).toBe(false)
    expect(ecranTactile(undefined)).toBe(false)
  })
})

describe('le rôle du doigt', () => {
  afterEach(() => { vi.unstubAllGlobals(); reglages.doigt = 'auto'; reglages.styletDirect = false })

  it('« Auto » : le doigt dessine, puis déplace dès qu\'un stylet a touché l\'écran', () => {
    expect(leDoigtDeplace({ doigt: 'auto', styletDirect: false })).toBe(false)
    expect(leDoigtDeplace({ doigt: 'auto', styletDirect: true })).toBe(true)
    expect(leDoigtDeplace({ doigt: 'dessine', styletDirect: true })).toBe(false)
    expect(leDoigtDeplace({ doigt: 'deplace', styletDirect: false })).toBe(true)
  })

  it('le choix est gardé sur l\'appareil ; choisir « Auto » oublie le stylet déjà vu', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } })
    noterStyletDirect(true)
    expect(m.get('mem-stylet-direct')).toBe('1')
    expect(leDoigtDeplace()).toBe(true)
    choisirDoigt('dessine')
    expect(m.get('mem-doigt')).toBe('dessine')
    expect(leDoigtDeplace()).toBe(false)
    choisirDoigt('auto')
    expect(m.get('mem-doigt')).toBe('auto')
    expect(m.get('mem-stylet-direct')).toBe('0')
    expect(reglages.styletDirect).toBe(false)
    expect(lire('mem-doigt', ['auto', 'dessine', 'deplace'], 'auto')).toBe('auto')
  })

  it('un navigateur qui ne garde rien : le choix vaut pour cette fois, sans erreur', () => {
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('SecurityError') } })
    expect(() => choisirDoigt('deplace')).not.toThrow()
    expect(leDoigtDeplace()).toBe(true)
    expect(lire('mem-doigt', ['auto', 'dessine', 'deplace'], 'auto')).toBe('auto')
  })
})

describe('le double appui au doigt', () => {
  const premier = { x: 200, y: 300, t: 1000 }

  it('moins de 300 ms après le lever du premier, à moins de 35 px : un double appui', () => {
    expect(DOUBLE_TOUCHER).toEqual({ ms: 300, px: 35 })
    expect(doubleToucher(premier, 200, 300, 1000)).toBe(true)
    expect(doubleToucher(premier, 220, 320, 1299)).toBe(true)      // 28 px, 299 ms
    expect(doubleToucher(premier, 234, 300, 1100)).toBe(true)
  })

  it('trop tard, trop loin, ou sans premier toucher : non', () => {
    expect(doubleToucher(premier, 200, 300, 1300)).toBe(false)
    expect(doubleToucher(premier, 235, 300, 1100)).toBe(false)
    expect(doubleToucher(premier, 225, 325, 1100)).toBe(false)     // 35,4 px en diagonale
    expect(doubleToucher(null, 200, 300, 1000)).toBe(false)
    expect(doubleToucher(premier, 200, 300, 900)).toBe(false)       // une horloge qui recule
  })
})

describe('les messages selon le pointeur', () => {
  it('les options : clic droit à la souris, bouton du stylet au stylet, deux touchers au doigt', () => {
    expect(messageOptions('mouse')).toBe('Double-clic ou clic droit sur l\'objet : ses options')
    expect(messageOptions('pen')).toBe('Double-clic ou bouton du stylet sur l\'objet : ses options')
    expect(messageOptions('touch')).toBe('Touchez deux fois l\'objet : ses options')
  })

  it('au doigt, jamais « clic », ni un « appui long » qui n\'existe pas', () => {
    for (const t of [messageOptions('touch'), messageSecondPoint('touch'), messageReconnue('Carré', 'touch')]) {
      expect(t).not.toMatch(/clic|appui long/i)
    }
    expect(messageSecondPoint('touch')).toBe('Touchez le second point (un autre outil annule)')
    expect(messageSecondPoint('mouse')).toBe('Cliquez le second point (Échap pour annuler)')
  })

  it('la figure reconnue : le bouton Annuler au doigt (sans clavier), le raccourci ailleurs', () => {
    expect(messageReconnue('Carré', 'touch')).toBe('Carré — ↶ (Annuler) pour garder le tracé à main levée')
    expect(messageReconnue('Carré', 'touch', '⌘')).not.toMatch(/Ctrl|⌘|\+Z/)
    expect(messageReconnue('Cercle', 'mouse')).toBe('Cercle — Ctrl+Z pour garder le tracé à main levée')
    expect(messageReconnue('Triangle', 'pen')).toBe('Triangle — Ctrl+Z pour garder le tracé à main levée')
    expect(messageReconnue('Carré', 'mouse', '⌘')).toBe('Carré — ⌘+Z pour garder le tracé à main levée')
  })
})
