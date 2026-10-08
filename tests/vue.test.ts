// La navigation et la vue : la molette, les raccourcis de zoom, « Tout voir »,
// la place des menus, et la session (la page et la vue de chaque page,
// retrouvées au rechargement, dans ce navigateur seulement).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ZOOM_MAX, ZOOM_MIN, vuePour, zoneEntreBarres } from '../src/camera'
import { PLAFOND_MOLETTE, lireMolette, toucheRecharger, toucheZoom } from '../src/navigateur'
import { positionMenu } from '../src/menus'
import { ecrireSession, lireSession, oublierSession } from '../src/session'
import { lire } from '../src/reglages'

/** Un localStorage en mémoire ; « bloque » : il refuse tout, comme en navigation privée */
function stockage(bloque = false) {
  const m = new Map<string, string>()
  let ecritures = 0
  const refus = () => { throw new Error('SecurityError') }
  return {
    get ecritures() { return ecritures },
    m,
    api: {
      getItem: (k: string) => bloque ? refus() : m.get(k) ?? null,
      setItem: (k: string, v: string) => { if (bloque) refus(); ecritures++; m.set(k, String(v)) },
      removeItem: (k: string) => { if (bloque) refus(); m.delete(k) },
    },
  }
}

const molette = (o: Partial<{ deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean }>) =>
  ({ deltaX: 0, deltaY: 0, deltaMode: 0, ctrlKey: false, metaKey: false, shiftKey: false, ...o })

describe('la molette', () => {
  it('défile par défaut, à la verticale ; Maj : à l\'horizontale', () => {
    expect(lireMolette(molette({ deltaY: 100 }), 800, 'defile')).toEqual({ dx: -0, dy: -100 })
    expect(lireMolette(molette({ deltaY: 100, shiftKey: true }), 800, 'defile')).toEqual({ dx: -100, dy: 0 })
    // Chrome a déjà converti Maj + molette en deltaX
    expect(lireMolette(molette({ deltaX: 100, shiftKey: true }), 800, 'defile')).toEqual({ dx: -100, dy: -0 })
  })

  it('compte les lignes (Firefox) et les pages', () => {
    expect(lireMolette(molette({ deltaY: 3, deltaMode: 1 }), 800, 'defile')).toEqual({ dx: -0, dy: -99 })
    expect(lireMolette(molette({ deltaY: 1, deltaMode: 2 }), 800, 'defile')).toEqual({ dx: -0, dy: -800 })
  })

  it('le glissement rapide au pavé (deltaY entier ≥ 50, Windows) défile, ne zoome pas', () => {
    expect(lireMolette(molette({ deltaY: 120 }), 800, 'defile')).toEqual({ dx: -0, dy: -120 })
  })

  it('Ctrl ou ⌘ + molette zoome : un cran de 100 = ×1,1 exactement, jamais plus par événement', () => {
    const r = lireMolette(molette({ deltaY: -100, ctrlKey: true }), 800, 'defile') as { zoom: number }
    expect(r.zoom).toBeCloseTo(1.1, 12)
    const r2 = lireMolette(molette({ deltaY: 100, metaKey: true }), 800, 'defile') as { zoom: number }
    expect(r2.zoom).toBeCloseTo(1 / 1.1, 12)
    const r3 = lireMolette(molette({ deltaY: -5000, ctrlKey: true }), 800, 'defile') as { zoom: number }
    expect(r3.zoom).toBeCloseTo(1.1, 12)
    expect(PLAFOND_MOLETTE).toBeCloseTo(9.531, 3)
  })

  it('le pincement du pavé (petits pas avec ctrlKey) reste continu', () => {
    const r = lireMolette(molette({ deltaY: -3.25, ctrlKey: true }), 800, 'defile') as { zoom: number }
    expect(r.zoom).toBeCloseTo(Math.exp(0.0325), 12)
  })

  it('réglage « zoome » : seule une molette à crans zoome ; le pavé et Maj défilent', () => {
    expect((lireMolette(molette({ deltaY: 100 }), 800, 'zoome') as { zoom: number }).zoom).toBeCloseTo(1 / 1.1, 12)
    expect((lireMolette(molette({ deltaY: -3, deltaMode: 1 }), 800, 'zoome') as { zoom: number }).zoom).toBeCloseTo(1.1, 12)
    expect(lireMolette(molette({ deltaY: 7.5 }), 800, 'zoome')).toEqual({ dx: -0, dy: -7.5 })
    expect(lireMolette(molette({ deltaY: 100, deltaX: 4 }), 800, 'zoome')).toEqual({ dx: -4, dy: -100 })
    expect(lireMolette(molette({ deltaY: 100, shiftKey: true }), 800, 'zoome')).toEqual({ dx: -100, dy: 0 })
  })
})

describe('les raccourcis du navigateur', () => {
  const k = (key: string, code: string, o: Partial<{ ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = { ctrlKey: true }) =>
    ({ key, code, ctrlKey: false, metaKey: false, altKey: false, ...o })

  it('Ctrl + « + », « − », « 0 », en QWERTY, en AZERTY et au pavé numérique', () => {
    expect(toucheZoom(k('=', 'Equal'))).toBe('plus')
    expect(toucheZoom(k('+', 'Equal'))).toBe('plus')
    expect(toucheZoom(k('+', 'NumpadAdd'))).toBe('plus')
    expect(toucheZoom(k('-', 'Minus'))).toBe('moins')
    expect(toucheZoom(k('-', 'Digit6'))).toBe('moins')            // AZERTY
    expect(toucheZoom(k(')', 'Minus'))).toBe('moins')             // AZERTY, la touche à droite du 0
    expect(toucheZoom(k('-', 'NumpadSubtract'))).toBe('moins')
    expect(toucheZoom(k('0', 'Digit0'))).toBe('zero')
    expect(toucheZoom(k('à', 'Digit0'))).toBe('zero')             // AZERTY
    expect(toucheZoom(k('0', 'Numpad0'))).toBe('zero')
    expect(toucheZoom(k('=', 'Equal', { metaKey: true }))).toBe('plus')
  })

  it('ni sans Ctrl, ni avec AltGr (Ctrl + Alt), ni pour une autre touche', () => {
    expect(toucheZoom(k('=', 'Equal', {}))).toBeNull()
    expect(toucheZoom(k('=', 'Equal', { ctrlKey: true, altKey: true }))).toBeNull()
    expect(toucheZoom(k('z', 'KeyW'))).toBeNull()
    expect(toucheZoom(k('6', 'Digit6'))).toBeNull()
  })

  it('F5 et Maj + F5 ne rechargent pas ; Ctrl + F5 reste au navigateur', () => {
    expect(toucheRecharger({ key: 'F5', ctrlKey: false, metaKey: false, altKey: false })).toBe(true)
    expect(toucheRecharger({ key: 'BrowserRefresh', ctrlKey: false, metaKey: false, altKey: false })).toBe(true)
    expect(toucheRecharger({ key: 'F5', ctrlKey: true, metaKey: false, altKey: false })).toBe(false)
    expect(toucheRecharger({ key: 'r', ctrlKey: true, metaKey: false, altKey: false })).toBe(false)
  })
})

describe('vuePour : cadrer une boîte', () => {
  const r = { x: 86, y: 82, l: 1264, h: 604 }

  it('un petit contenu reste au zoom maximal permis, centré', () => {
    const v = vuePour({ x: 2000, y: 1500, l: 100, h: 60 }, r, 1)
    expect(v.z).toBe(1)
    expect(2050 * v.z + v.x).toBeCloseTo(r.x + r.l / 2, 9)
    expect(1530 * v.z + v.y).toBeCloseTo(r.y + r.h / 2, 9)
  })

  it('un grand contenu entre entier, avec la marge', () => {
    const b = { x: -3000, y: -800, l: 5100, h: 2400 }
    const v = vuePour(b, r, 1)
    expect(v.z).toBeCloseTo(Math.min((r.l - 64) / b.l, (r.h - 64) / b.h), 12)
    expect(b.x * v.z + v.x).toBeGreaterThanOrEqual(r.x - 1e-9)
    expect((b.x + b.l) * v.z + v.x).toBeLessThanOrEqual(r.x + r.l + 1e-9)
    expect(b.y * v.z + v.y).toBeGreaterThanOrEqual(r.y - 1e-9)
    expect((b.y + b.h) * v.z + v.y).toBeLessThanOrEqual(r.y + r.h + 1e-9)
  })

  it('une boîte plate ou réduite à un point : pas de NaN', () => {
    const p = vuePour({ x: 10, y: 20, l: 0, h: 0 }, r, 2)
    expect(p.z).toBe(2)
    expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true)
    const h = vuePour({ x: 0, y: 0, l: 5000, h: 0 }, r, 2)
    expect(h.z).toBeCloseTo((r.l - 64) / 5000, 12)
  })

  it('le zoom reste entre ZOOM_MIN et ZOOM_MAX', () => {
    expect(vuePour({ x: 0, y: 0, l: 1e9, h: 1e9 }, r, 1).z).toBe(ZOOM_MIN)
    expect(vuePour({ x: 0, y: 0, l: 1, h: 1 }, r, 100).z).toBe(ZOOM_MAX)
  })
})

describe('zoneEntreBarres : ce qu\'on voit entre les barres', () => {
  // Les barres mesurées dans l'application (gauche, haut, droite, bas)
  const B = (l: number, t: number, r: number, b: number) => ({ left: l, top: t, right: r, bottom: b })
  const dans = (z: { x: number; y: number; l: number; h: number }, b: { left: number; top: number; right: number; bottom: number }) =>
    z.x < b.right && z.x + z.l > b.left && z.y < b.bottom && z.y + z.h > b.top

  it('un ordinateur, une tablette : entre les trois barres, comme avant', () => {
    expect(zoneEntreBarres(1366, 768, { outils: B(12, 12, 70, 756), haut: B(525, 12, 1354, 70), zoom: B(1138, 698, 1354, 756) }))
      .toEqual({ x: 86, y: 82, l: 1264, h: 604 })
    expect(zoneEntreBarres(390, 844, { outils: B(12, 128, 70, 832), haut: B(12, 12, 378, 162), zoom: B(162, 774, 378, 832) }))
      .toEqual({ x: 86, y: 174, l: 288, h: 588 })
  })

  it('un téléphone en paysage : sous la barre du haut et à côté de celle du zoom, jamais dessous', () => {
    for (const [l, h, haut, zoom] of [[844, 390, B(88, 12, 832, 116), B(616, 320, 832, 378)], [667, 375, B(88, 12, 655, 116), B(439, 305, 655, 363)],
      [740, 360, B(88, 12, 728, 116), B(512, 290, 728, 348)]] as const) {
      const z = zoneEntreBarres(l, h, { outils: B(12, 12, 70, h - 12), haut, zoom })
      expect(z.y).toBe(128)
      expect(z.l).toBeGreaterThanOrEqual(200)
      expect(z.h).toBeGreaterThanOrEqual(200)
      expect(dans(z, haut) || dans(z, zoom)).toBe(false)
      expect(z.y + z.h).toBe(h - 12)
    }
  })

  it('plus petit encore : sous la barre du haut jusqu\'en bas ; presque rien : toute la zone dans cette dimension seulement', () => {
    const z = zoneEntreBarres(568, 320, { outils: B(12, 12, 70, 308), haut: B(88, 12, 556, 116), zoom: B(340, 250, 556, 308) })
    expect(z).toEqual({ x: 86, y: 128, l: 466, h: 180 })
    const t = zoneEntreBarres(568, 240, { outils: B(12, 12, 70, 228), haut: B(88, 12, 556, 116), zoom: B(340, 170, 556, 228) })
    expect(t).toEqual({ x: 86, y: 16, l: 466, h: 208 })
  })

  it('sans barres (cachées) : toute la zone, avec la marge', () => {
    expect(zoneEntreBarres(1000, 700, { outils: null, haut: null, zoom: null })).toEqual({ x: 16, y: 12, l: 968, h: 676 })
  })
})

describe('la place d\'un menu', () => {
  const fenetre = { l: 1366, h: 768 }

  it('au-dessus de son ancre, aligné à droite', () => {
    const p = positionMenu({ left: 1140, top: 700, right: 1354, bottom: 756 }, 260, 270, 'dessus', fenetre)
    expect(p).toEqual({ left: 1354 - 260, top: 700 - 270 - 6 })
  })

  it('jamais à moins de 8 px des bords ; de l\'autre côté s\'il n\'y a pas la place', () => {
    expect(positionMenu({ left: 10, top: 700, right: 100, bottom: 756 }, 260, 270, 'dessus', fenetre).left).toBe(8)
    expect(positionMenu({ left: 1000, top: 40, right: 1100, bottom: 80 }, 260, 270, 'dessus', fenetre).top).toBe(86)
    expect(positionMenu({ left: 1000, top: 700, right: 1100, bottom: 740 }, 260, 270, 'dessous', fenetre).top).toBe(700 - 270 - 6)
    expect(positionMenu({ left: 1200, top: 100, right: 1250, bottom: 140 }, 260, 270, 'droite', fenetre).left).toBe(1200 - 260 - 6)
    const petit = positionMenu({ left: 0, top: 0, right: 40, bottom: 40 }, 500, 900, 'dessous', { l: 390, h: 844 })
    expect(petit.left).toBe(8); expect(petit.top).toBe(8)
  })
})

describe('la session de ce navigateur', () => {
  let s: ReturnType<typeof stockage>
  beforeEach(() => { s = stockage(); vi.stubGlobal('localStorage', s.api); oublierSession() })
  afterEach(() => { vi.unstubAllGlobals() })

  it('rien de gardé : null', () => {
    expect(lireSession()).toBeNull()
  })

  it('écrit la page vue et les vues des pages qui existent encore, puis les relit', () => {
    const vues = new Map([['a', { cx: 100.123, cy: -20, z: 2 }], ['b', { cx: 0, cy: 0, z: 1 }], ['partie', { cx: 5, cy: 5, z: 1 }]])
    ecrireSession('b', vues, ['a', 'b'])
    expect(JSON.parse(s.m.get('mem-session')!)).toEqual({ v: 1, page: 'b', vues: { a: [100.12, -20, 2], b: [0, 0, 1] } })
    const l = lireSession()!
    expect(l.page).toBe('b')
    expect([...l.vues.keys()]).toEqual(['a', 'b'])
    expect(l.vues.get('a')).toEqual({ cx: 100.12, cy: -20, z: 2 })
  })

  it('ne réécrit pas ce qui est déjà écrit', () => {
    const vues = new Map([['a', { cx: 1, cy: 2, z: 1 }]])
    ecrireSession('a', vues, ['a'])
    ecrireSession('a', vues, ['a'])
    expect(s.ecritures).toBe(1)
    vues.set('a', { cx: 1, cy: 3, z: 1 })
    ecrireSession('a', vues, ['a'])
    expect(s.ecritures).toBe(2)
  })

  it('rejette ce qui est mal formé ; borne le zoom', () => {
    for (const brut of ['{pas du json', '[]', 'null', '{"v":2,"page":"a","vues":{}}', '{"v":1,"page":3,"vues":{}}', '{"v":1,"page":"a","vues":[]}']) {
      s.m.set('mem-session', brut)
      expect(lireSession()).toBeNull()
    }
    s.m.set('mem-session', JSON.stringify({ v: 1, page: 'a', vues: { a: [1, 2, 500], b: [1, 2], c: ['x', 1, 1], d: [1, 2, -1], e: [0, 0, 0.01] } }))
    const l = lireSession()!
    expect([...l.vues.keys()]).toEqual(['a', 'e'])
    expect(l.vues.get('a')!.z).toBe(ZOOM_MAX)
    expect(l.vues.get('e')!.z).toBe(ZOOM_MIN)
  })

  it('oublierSession efface tout', () => {
    ecrireSession('a', new Map([['a', { cx: 1, cy: 2, z: 1 }]]), ['a'])
    oublierSession()
    expect(s.m.has('mem-session')).toBe(false)
    expect(lireSession()).toBeNull()
  })

  it('un navigateur qui refuse de garder quoi que ce soit : rien ne casse', () => {
    vi.stubGlobal('localStorage', stockage(true).api)
    expect(lireSession()).toBeNull()
    expect(() => ecrireSession('a', new Map([['a', { cx: 1, cy: 2, z: 1 }]]), ['a'])).not.toThrow()
    expect(() => oublierSession()).not.toThrow()
  })
})

describe('les réglages de cet appareil', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('une valeur permise est lue ; une autre, ou rien, donne la valeur par défaut', () => {
    const s = stockage()
    vi.stubGlobal('localStorage', s.api)
    s.m.set('mem-molette', 'zoome')
    expect(lire('mem-molette', ['defile', 'zoome'], 'defile')).toBe('zoome')
    s.m.set('mem-molette', 'n\'importe quoi')
    expect(lire('mem-molette', ['defile', 'zoome'], 'defile')).toBe('defile')
    s.m.delete('mem-molette')
    expect(lire('mem-molette', ['defile', 'zoome'], 'defile')).toBe('defile')
  })

  it('stockage bloqué : la valeur par défaut, sans erreur', () => {
    vi.stubGlobal('localStorage', stockage(true).api)
    expect(lire('mem-molette', ['defile', 'zoome'], 'zoome')).toBe('zoome')
  })
})
