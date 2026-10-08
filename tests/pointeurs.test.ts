// Souris, stylet, doigt : quand un appui devient un glisser, ce qu'est une
// paume, quand le stylet écrit sur l'écran lui-même, l'appui long, le
// toucher à deux ou trois doigts, et les réglages du doigt (gardés dans le
// navigateur de cet appareil).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { APPUI_LONG, DOUBLE_CLIC_PLUME, DOUBLE_TOUCHER, PRISE_GLISSER, SEUIL_GLISSER, TOLERANCE_PRISE, TOUCHER_DOIGTS, ToucherADoigts, contactLarge, depasseSeuil, doubleToucher, ecranTactile, messageOptions, messageReconnue, messageSecondPoint, nouveauDepart, procheDuPremier, typePointeur } from '../src/pointeurs'
import { choisirDoigt, choisirGestes, leDoigtDeplace, lire, noterStyletDirect, reglages } from '../src/reglages'

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

describe('la prise d\'un objet', () => {
  it('on prend à 6 px à la souris, 10 au stylet, 20 au doigt', () => {
    expect(TOLERANCE_PRISE).toEqual({ mouse: 6, pen: 10, touch: 20 })
  })

  it('on saisit (pour l\'emporter) plus près : 6 px à la souris et au stylet, 10 au doigt', () => {
    expect(PRISE_GLISSER).toEqual({ mouse: 6, pen: 6, touch: 10 })
    // Saisir n'est jamais plus large que prendre, ni plus serré que le seuil du glisser
    for (const k of ['mouse', 'pen', 'touch'] as const) {
      expect(PRISE_GLISSER[k]).toBeLessThanOrEqual(TOLERANCE_PRISE[k])
      expect(PRISE_GLISSER[k]).toBeGreaterThanOrEqual(SEUIL_GLISSER[k])
    }
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

describe('le double-clic au Stylo, sur une figure ou une formule', () => {
  const premier = { x: 200, y: 300 }

  it('dans le rayon du double-clic du système : 4 px à la souris, 5 au stylet, 14 au doigt', () => {
    expect(DOUBLE_CLIC_PLUME).toEqual({ ms: 300, duree: 250, px: { mouse: 4, pen: 5, touch: 14 } })
    expect(procheDuPremier(premier, 200, 300, 'mouse')).toBe(true)
    expect(procheDuPremier(premier, 202, 302, 'mouse')).toBe(true)      // 2,8 px
    expect(procheDuPremier(premier, 204, 300, 'mouse')).toBe(false)
    expect(procheDuPremier(premier, 203, 303, 'pen')).toBe(true)        // 4,2 px
    expect(procheDuPremier(premier, 210, 302, 'touch')).toBe(true)      // 10,2 px
  })

  it('deux points qu\'on écrit serrés (un « : », un tréma) ne sont jamais un double-clic', () => {
    expect(procheDuPremier(premier, 200, 308, 'pen')).toBe(false)       // « : » à 8 px
    expect(procheDuPremier(premier, 207, 300, 'pen')).toBe(false)       // deux points à 7 px sur une formule
    expect(procheDuPremier(premier, 200, 308, 'mouse')).toBe(false)
    expect(procheDuPremier(premier, 220, 302, 'touch')).toBe(false)     // au doigt, à 20 px
    expect(procheDuPremier(premier, 214, 300, 'touch')).toBe(false)
  })
})

describe('les messages selon le pointeur', () => {
  it('les options : clic droit à la souris, bouton du stylet à la tablette graphique, appui long au stylet sur l\'écran et au doigt', () => {
    expect(messageOptions('mouse')).toBe('Double-clic ou clic droit sur l\'objet : toutes ses options')
    expect(messageOptions('pen', false)).toBe('Double-clic ou bouton du stylet sur l\'objet : toutes ses options')
    expect(messageOptions('pen', true)).toBe('Appui long ou double-clic sur l\'objet : toutes ses options')
    expect(messageOptions('touch')).toBe('Appui long sur l\'objet : toutes ses options')
    expect(messageOptions('touch', false)).toBe(messageOptions('touch', true))
    // Sans écran tactile (Node, l'ordinateur de la classe), le stylet est celui d'une tablette graphique
    expect(messageOptions('pen')).toBe(messageOptions('pen', false))
    expect(messageOptions('mouse', true)).toBe(messageOptions('mouse', false))
  })

  it('au doigt, jamais « clic » ; l\'appui long y existe maintenant', () => {
    for (const t of [messageOptions('touch'), messageSecondPoint('touch'), messageReconnue('Carré', 'touch')]) {
      expect(t).not.toMatch(/clic/i)
    }
    expect(messageOptions('touch')).toMatch(/^Appui long/)
    // L'Apple Pencil n'a pas de bouton : on ne lui en parle pas
    expect(messageOptions('pen', true)).not.toMatch(/bouton/)
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

describe('l\'appui long', () => {
  it('500 ms, comme Excalidraw et tldraw ; plus long que le double appui', () => {
    expect(APPUI_LONG).toBe(500)
    expect(APPUI_LONG).toBeGreaterThan(DOUBLE_TOUCHER.ms)
  })
})

describe('le toucher à deux ou trois doigts', () => {
  /** Des doigts posés à ces heures et ces places, levés à ces heures ; ce que
   *  rend le lever du dernier */
  function toucher(doigts: { t: number; x?: number; y?: number; leve: number; va?: [number, number] }[]) {
    const r = new ToucherADoigts()
    doigts.forEach((d, i) => r.poser(i, d.x ?? 100 * (i + 1), d.y ?? 300, d.t))
    doigts.forEach((d, i) => { if (d.va) r.bouger(i, (d.x ?? 100 * (i + 1)) + d.va[0], (d.y ?? 300) + d.va[1]) })
    const ordre = doigts.map((d, i) => ({ i, t: d.leve })).sort((a, b) => a.t - b.t)
    return ordre.map(o => r.lever(o.i, o.t))
  }

  it('posés presque ensemble, levés en moins de 300 ms, le tout en moins de 450 ms, sans bouger de 8 px', () => {
    expect(TOUCHER_DOIGTS).toEqual({ arrivee: 150, duree: 300, total: 450, px: 8 })
    expect(TOUCHER_DOIGTS.px).toBe(SEUIL_GLISSER.touch)
  })

  it('un toucher net à deux doigts annule, à trois rétablit ; au lever du dernier seulement', () => {
    expect(toucher([{ t: 1000, leve: 1120 }, { t: 1010, leve: 1130 }])).toEqual([null, 'annuler'])
    expect(toucher([{ t: 1000, leve: 1100 }, { t: 1020, leve: 1180 }, { t: 1040, leve: 1150 }])).toEqual([null, null, 'retablir'])
    // Un tremblement de 7 px, deux doigts levés à 60 ms d'écart : encore un toucher
    expect(toucher([{ t: 0, leve: 120, va: [7, 0] }, { t: 5, leve: 180, va: [0, -3] }])).toEqual([null, 'annuler'])
  })

  it('refusés : un pincement, un doigt qui glisse, un doigt resté posé, un second trop tard, quatre doigts, un seul', () => {
    // Un pincement : l'écart change de 30 px (chaque doigt de 15)
    expect(toucher([{ t: 0, leve: 200, va: [-15, 0] }, { t: 10, leve: 210, va: [15, 0] }])).toEqual([null, null])
    // Un doigt qui glisse de 9 px (ou de 8, le seuil)
    expect(toucher([{ t: 0, leve: 150, va: [9, 0] }, { t: 10, leve: 160 }])).toEqual([null, null])
    expect(toucher([{ t: 0, leve: 150 }, { t: 10, leve: 160, va: [0, 8] }])).toEqual([null, null])
    // Un doigt resté posé 400 ms (et deux doigts tenus 500 ms)
    expect(toucher([{ t: 0, leve: 400 }, { t: 10, leve: 120 }])).toEqual([null, null])
    expect(toucher([{ t: 0, leve: 500 }, { t: 0, leve: 500 }])).toEqual([null, null])
    // Un second doigt arrivé 200 ms après le premier
    expect(toucher([{ t: 0, leve: 250 }, { t: 200, leve: 300 }])).toEqual([null, null])
    // Quatre doigts, un seul
    expect(toucher([{ t: 0, leve: 100 }, { t: 5, leve: 100 }, { t: 10, leve: 100 }, { t: 15, leve: 110 }])).toEqual([null, null, null, null])
    expect(toucher([{ t: 0, leve: 100 }])).toEqual([null])
    // Aux limites : le dernier posé à 149 ms et levé 299 ms plus tard, le
    // tout en 448 ms (moins de 450) ; une milliseconde de plus, c'est trop long
    expect(toucher([{ t: 0, leve: 290 }, { t: 149, leve: 448 }])).toEqual([null, 'annuler'])
    expect(toucher([{ t: 0, leve: 290 }, { t: 149, leve: 449 }])).toEqual([null, null])
    expect(toucher([{ t: 0, leve: 100 }, { t: 150, leve: 200 }])).toEqual([null, null])
  })

  it('un doigt posé après qu\'un autre s\'est levé n\'est pas du même toucher', () => {
    const r = new ToucherADoigts()
    r.poser(1, 100, 100, 0)
    r.poser(2, 200, 100, 20)
    expect(r.lever(1, 60)).toBe(null)
    r.poser(3, 300, 100, 80)
    expect(r.lever(2, 100)).toBe(null)
    expect(r.lever(3, 150)).toBe(null)
    // Le suivant repart de zéro
    r.poser(4, 100, 100, 1000); r.poser(5, 200, 100, 1010)
    expect(r.lever(4, 1100)).toBe(null)
    expect(r.lever(5, 1110)).toBe('annuler')
  })

  it('oublier (une paume, un stylet, un appui long) : les doigts déjà posés ne comptent plus', () => {
    const r = new ToucherADoigts()
    r.poser(1, 100, 100, 0); r.poser(2, 200, 100, 10)
    r.oublier()
    expect(r.lever(1, 100)).toBe(null)
    expect(r.lever(2, 110)).toBe(null)
    // Un doigt inconnu, ou levé deux fois : rien
    expect(r.lever(9, 120)).toBe(null)
    r.poser(3, 100, 100, 500); r.poser(4, 200, 100, 510)
    expect(r.lever(3, 600)).toBe(null)
    expect(r.lever(3, 600)).toBe(null)
    expect(r.lever(4, 610)).toBe('annuler')
  })
})

describe('le réglage des gestes à deux et trois doigts', () => {
  afterEach(() => { vi.unstubAllGlobals(); reglages.gestes = false })

  it('gardé sur l\'appareil, sous sa propre clé ; un navigateur qui ne garde rien ne casse rien', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } })
    choisirGestes(true)
    expect(reglages.gestes).toBe(true)
    expect(m.get('mem-gestes-doigts')).toBe('1')
    choisirGestes(false)
    expect(m.get('mem-gestes-doigts')).toBe('0')
    expect(lire('mem-gestes-doigts', ['1', '0'], '1')).toBe('0')
    // Les autres clés ne bougent pas
    expect([...m.keys()]).toEqual(['mem-gestes-doigts'])
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('SecurityError') } })
    expect(() => choisirGestes(true)).not.toThrow()
    expect(reglages.gestes).toBe(true)
  })

  it('allumés au départ sur un écran tactile, éteints ailleurs (sous Node, pas d\'écran tactile)', async () => {
    vi.resetModules()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} })
    vi.stubGlobal('navigator', { maxTouchPoints: 10 })
    expect((await import('../src/reglages')).reglages.gestes).toBe(true)
    vi.resetModules()
    vi.stubGlobal('navigator', { maxTouchPoints: 0 })
    expect((await import('../src/reglages')).reglages.gestes).toBe(false)
    // Un choix gardé l'emporte
    vi.resetModules()
    vi.stubGlobal('localStorage', { getItem: (k: string) => k === 'mem-gestes-doigts' ? '0' : null, setItem: () => {} })
    vi.stubGlobal('navigator', { maxTouchPoints: 10 })
    expect((await import('../src/reglages')).reglages.gestes).toBe(false)
  })
})
