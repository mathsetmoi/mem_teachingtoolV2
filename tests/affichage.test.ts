// Les deux réglages de l'affichage de cet appareil (lot 5, K9) : le
// contraste renforcé, pour le vidéoprojecteur, et les noms sous les outils.
// - nomsOutilsVisibles : en « auto », l'écran décide (un TNI, une grande
//   tablette : oui ; le poste de la classe, l'iPad de 11 pouces, le
//   téléphone : non), d'après l'écran et non la fenêtre ; un choix l'emporte ;
//   les clés de stockage, seulement les deux nouvelles ;
// - le message qui dit, selon le pointeur, si le nom paraît encore au survol ;
// - le fond en contraste renforcé : les mêmes lignes aux mêmes places (les
//   mêmes niveaux, les mêmes fondus), plus opaques, de 2 px calées sur les
//   pixels entiers, des points de 3 px ; sans l'option, exactement comme
//   avant ;
// - le rendu : une figure jamais affichée sous 2 px d'écran en contraste, et
//   peindreSur (les vignettes, l'image copiée, le PDF) qui peint toujours
//   sans lui, pixel pour pixel (ici : appel pour appel) comme sans.
// Le contexte de dessin est simulé : il retient chaque appel et ce qui
// valait alors.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Camera } from '../src/camera'
import { TONS_CONTRASTE, TONS_NORMAUX, dessinerFond, renforcer } from '../src/fonds'
import { messageNomsOutils } from '../src/pointeurs'
import type { Ecran } from '../src/reglages'
import { choisirContraste, choisirNomsOutils, nomsOutilsVisibles, reglages } from '../src/reglages'
import { TELEPHONE } from '../src/navigateur'
import type { Figure, Fond, Forme } from '../src/types'
import { FONDS } from '../src/types'

/** Un contexte qui note tout : le nom de l'appel, ses arguments, et l'état
 *  (couleurs, largeur, alpha, tirets) au moment d'un stroke ou d'un fill */
function contexte() {
  const appels: string[] = []
  const pile: Record<string, unknown>[] = []
  let tirets: number[] = []
  const etat = () => `${ctx.strokeStyle}|${ctx.fillStyle}|${+ctx.lineWidth.toFixed(6)}|${+ctx.globalAlpha.toFixed(6)}|${tirets.map(t => +t.toFixed(4)).join(',')}`
  const noter = (nom: string) => (...a: unknown[]) => { appels.push(`${nom}(${a.map(x => typeof x === 'number' ? +x.toFixed(4) : typeof x === 'object' ? 'objet' : String(x)).join(',')})`) }
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineCap: '', lineJoin: '',
    shadowColor: '', shadowBlur: 0,
    save() { pile.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha, tirets }); appels.push('save') },
    restore() { const e = pile.pop(); if (e) { Object.assign(ctx, e); tirets = e.tirets as number[] } appels.push('restore') },
    stroke() { appels.push('stroke ' + etat()) },
    fill() { appels.push('fill ' + etat()) },
    setLineDash(t: number[]) { tirets = [...t] },
    beginPath: noter('beginPath'), closePath: noter('closePath'), moveTo: noter('moveTo'), lineTo: noter('lineTo'),
    rect: noter('rect'), arc: noter('arc'), roundRect: noter('roundRect'), fillRect: noter('fillRect'), strokeRect: noter('strokeRect'),
    fillText: noter('fillText'), translate: noter('translate'), rotate: noter('rotate'), setTransform: noter('setTransform'),
    transform: noter('transform'), clip: noter('clip'), drawImage: noter('drawImage'), clearRect: noter('clearRect'),
    measureText: () => ({ width: 10 }),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, appels }
}

function camera(x: number, y: number, z: number) {
  const cam = new Camera()
  cam.x = x; cam.y = y; cam.z = z
  return cam
}

/** L'opacité d'une couleur rgba (1 pour une couleur pleine) */
const alphaDe = (c: string) => Number(/rgba\([^)]*,\s*([\d.]+)\)/.exec(c)?.[1] ?? 1)

describe('les noms sous les outils, en « auto » : l\'écran décide', () => {
  const ecran = (o: Partial<Ecran>): Ecran => ({ points: 0, grossier: false, largeur: 1366, hauteur: 768, telephone: false, ...o })
  const auto = { nomsOutils: 'auto' as const }

  it('le poste de la classe (souris, tablette graphique : aucun point de toucher) : non, même sur un grand écran', () => {
    expect(nomsOutilsVisibles(auto, ecran({}))).toBe(false)
    expect(nomsOutilsVisibles(auto, ecran({ largeur: 1920, hauteur: 1080 }))).toBe(false)
    expect(nomsOutilsVisibles(auto, ecran({ largeur: 2560, hauteur: 1440 }))).toBe(false)
  })

  it('un TNI (1920 × 1080, tactile) et l\'iPad Pro 12,9 pouces (1024 × 1366) : oui, dans les deux sens', () => {
    expect(nomsOutilsVisibles(auto, ecran({ points: 10, largeur: 1920, hauteur: 1080 }))).toBe(true)
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, largeur: 1024, hauteur: 1366 }))).toBe(true)
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, largeur: 1366, hauteur: 1024 }))).toBe(true)
    // Un pointeur grossier sans points de toucher annoncés compte aussi
    expect(nomsOutilsVisibles(auto, ecran({ grossier: true, largeur: 1920, hauteur: 1080 }))).toBe(true)
  })

  it('l\'iPad de 11 pouces (820 × 1180) : non, en paysage comme en portrait (la plus petite dimension de l\'écran, 820)', () => {
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, grossier: true, largeur: 820, hauteur: 1180 }))).toBe(false)
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, grossier: true, largeur: 1180, hauteur: 820 }))).toBe(false)
    // 899 non, 900 oui : la frontière
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, largeur: 899, hauteur: 1400 }))).toBe(false)
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, largeur: 900, hauteur: 1400 }))).toBe(true)
  })

  it('un téléphone : non (même si son écran, en pixels, était grand)', () => {
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, grossier: true, largeur: 390, hauteur: 844, telephone: true }))).toBe(false)
    expect(nomsOutilsVisibles(auto, ecran({ points: 5, grossier: true, largeur: 1080, hauteur: 2400, telephone: true }))).toBe(false)
  })

  it('un choix l\'emporte sur l\'écran', () => {
    expect(nomsOutilsVisibles({ nomsOutils: '1' }, ecran({}))).toBe(true)
    expect(nomsOutilsVisibles({ nomsOutils: '0' }, ecran({ points: 10, largeur: 1920, hauteur: 1080 }))).toBe(false)
  })

  it('la requête du téléphone, écrite une fois (navigateur.ts) : étroit, ou bas sous le doigt', () => {
    expect(TELEPHONE).toBe('(max-width: 640px), (max-height: 500px) and (pointer: coarse)')
  })
})

describe('les réglages de l\'affichage, gardés sur l\'appareil', () => {
  afterEach(() => { vi.unstubAllGlobals(); reglages.contraste = false; reglages.nomsOutils = 'auto' })

  it('le contraste : \'mem-contraste\', \'1\' ou \'0\' ; les noms : \'mem-noms-outils\', écrite seulement quand on choisit ; aucune autre clé', () => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } })
    choisirContraste(true)
    expect(reglages.contraste).toBe(true)
    expect(m.get('mem-contraste')).toBe('1')
    choisirContraste(false)
    expect(m.get('mem-contraste')).toBe('0')
    expect(m.has('mem-noms-outils')).toBe(false)
    choisirNomsOutils(true)
    expect(reglages.nomsOutils).toBe('1')
    expect(m.get('mem-noms-outils')).toBe('1')
    choisirNomsOutils(false)
    expect(m.get('mem-noms-outils')).toBe('0')
    expect([...m.keys()].sort()).toEqual(['mem-contraste', 'mem-noms-outils'])
    // Un navigateur qui ne garde rien : le choix vaut pour cette fois
    vi.stubGlobal('localStorage', { getItem: () => { throw new Error('SecurityError') }, setItem: () => { throw new Error('SecurityError') } })
    expect(() => { choisirContraste(true); choisirNomsOutils(true) }).not.toThrow()
    expect(reglages.contraste).toBe(true)
  })

  it('au chargement : éteint et « auto » par défaut ; ce qui est gardé est relu ; une valeur abîmée est oubliée', async () => {
    const charger = async (m: Record<string, string>) => {
      vi.resetModules()
      vi.stubGlobal('localStorage', { getItem: (k: string) => m[k] ?? null, setItem: () => {} })
      return (await import('../src/reglages')).reglages
    }
    expect(await charger({})).toMatchObject({ contraste: false, nomsOutils: 'auto' })
    expect(await charger({ 'mem-contraste': '1', 'mem-noms-outils': '0' })).toMatchObject({ contraste: true, nomsOutils: '0' })
    expect(await charger({ 'mem-contraste': 'oui', 'mem-noms-outils': 'auto' })).toMatchObject({ contraste: false, nomsOutils: 'auto' })
    expect(await charger({ 'mem-noms-outils': '1' })).toMatchObject({ nomsOutils: '1' })
  })
})

describe('le message des noms sous les outils, selon le pointeur', () => {
  it('allumés : « Noms sous les outils » ; éteints : le survol à la souris et au stylet qui survole, pas au doigt ni au TNI', () => {
    expect(messageNomsOutils(true, 'mouse', false)).toBe('Noms sous les outils')
    expect(messageNomsOutils(true, 'touch', true)).toBe('Noms sous les outils')
    expect(messageNomsOutils(false, 'mouse', false)).toBe('Outils sans noms (leur nom paraît au survol)')
    expect(messageNomsOutils(false, 'mouse', true)).toBe('Outils sans noms (leur nom paraît au survol)')
    // La tablette graphique (Wacom, sans écran) : son stylet survole
    expect(messageNomsOutils(false, 'pen', false)).toBe('Outils sans noms (leur nom paraît au survol)')
    // Le stylet sur l'écran (iPad, TNI) et le doigt : pas de survol
    expect(messageNomsOutils(false, 'pen', true)).toBe('Outils sans noms')
    expect(messageNomsOutils(false, 'touch', true)).toBe('Outils sans noms')
  })
})

describe('le fond en contraste renforcé', () => {
  it('chaque couleur plus opaque (× 1,8, au plus 0,9), les lignes de 2 px, les points de 3 px, la marge et les axes plus épais', () => {
    expect(renforcer('rgba(80, 130, 200, 0.28)')).toBe('rgba(80, 130, 200, 0.504)')
    expect(renforcer('rgba(70, 110, 190, 0.55)')).toBe('rgba(70, 110, 190, 0.9)')
    expect(renforcer('#1b2230')).toBe('#1b2230')
    for (const k of ['bleu', 'bleuFort', 'violet', 'rouge', 'mmFin', 'mmMoyen', 'mmFort', 'point'] as const) {
      const a = alphaDe(TONS_NORMAUX[k]), b = alphaDe(TONS_CONTRASTE[k])
      expect(b, k).toBeCloseTo(Math.min(0.9, a * 1.8), 3)
      expect(b, k).toBeGreaterThan(a)
    }
    // Les tons du millimétré restent dans leur ordre : le centimètre, le plus marqué
    expect(alphaDe(TONS_CONTRASTE.mmFin)).toBeLessThan(alphaDe(TONS_CONTRASTE.mmMoyen))
    expect(alphaDe(TONS_CONTRASTE.mmMoyen)).toBeLessThan(alphaDe(TONS_CONTRASTE.mmFort))
    expect(TONS_CONTRASTE).toMatchObject({ ligne: 2, cotePoint: 3 })
    expect(TONS_CONTRASTE.marge).toBeGreaterThan(TONS_NORMAUX.marge)
    expect(TONS_CONTRASTE.axes).toBeGreaterThan(TONS_NORMAUX.axes)
  })

  it('sans l\'option, ou avec contraste: false, exactement les appels d\'avant ; avec, les mêmes lignes et points (les mêmes niveaux, les mêmes fondus), seuls leurs tons et leurs largeurs changent', () => {
    for (const f of FONDS) {
      for (const z of [0.1, 0.3, 0.75, 1, 1.6, 4, 20]) {
        const cam = camera(-37.3 * z, 51.9 * z, z)
        const o = cam.versMonde(683, 384)
        const peindre = (opt?: { contraste?: boolean }) => {
          const c = contexte()
          if (opt) dessinerFond(c.ctx, f.id, cam, 1366, 768, o, opt)
          else dessinerFond(c.ctx, f.id, cam, 1366, 768, o)
          return c.appels
        }
        const avant = peindre(), faux = peindre({ contraste: false }), fort = peindre({ contraste: true })
        expect(faux, `${f.id} z=${z}`).toEqual(avant)
        // Autant d'appels, dans le même ordre (les mêmes familles), et les
        // mêmes alphas de fondu : seuls les tons, les largeurs et le calage
        // au pixel changent
        expect(fort.length, `${f.id} z=${z}`).toBe(avant.length)
        const genre = (a: string) => a.replace(/\(.*$/, '').replace(/ .*$/, '')
        expect(fort.map(genre), `${f.id} z=${z}`).toEqual(avant.map(genre))
        const fondus = (l: string[]) => l.filter(a => a.startsWith('stroke ') || a.startsWith('fill ')).map(a => a.split('|')[3])
        expect(fondus(fort), `${f.id} z=${z}`).toEqual(fondus(avant))
        if (f.id === 'blanc') expect(fort).toEqual(avant)
      }
    }
  })

  it('les lignes : 2 px, sur des pixels entiers (sans le demi-pixel des lignes de 1 px) ; les points : 3 px, centrés sur leur pixel', () => {
    const lignes = (fond: Fond, contraste: boolean) => {
      const c = contexte()
      dessinerFond(c.ctx, fond, camera(0, 0, 1), 1366, 768, undefined, { contraste })
      return c.appels
    }
    const n = lignes('carreaux', false), k = lignes('carreaux', true)
    expect(n.filter(a => a.startsWith('stroke ')).every(a => a.split('|')[2] === '1')).toBe(true)
    expect(k.filter(a => a.startsWith('stroke ')).every(a => a.split('|')[2] === '2')).toBe(true)
    expect(n).toContain('moveTo(20.5,0)')
    expect(k).toContain('moveTo(20,0)')
    expect(k.filter(a => a.startsWith('moveTo(')).every(a => !/\.5[,)]/.test(a))).toBe(true)
    const p = lignes('pointe', true)
    // Le point du centimètre (40, 40) : de 39 à 42, 3 px
    expect(p).toContain('rect(39,39,3,3)')
    expect(lignes('pointe', false)).toContain('rect(39,39,2,2)')
    // L'isométrique : ses horizontales aussi
    expect(lignes('iso', true).filter(a => a.startsWith('stroke ')).every(a => a.split('|')[2] === '2')).toBe(true)
  })
})

// ---------- Le rendu, sous Node ----------
// Un Rendu se construit sur un élément : on lui en donne un faux, avec des
// canevas qui ne peignent rien (seule compte la peinture qu'on demande, sur
// le contexte qui note tout).
async function rendu() {
  class FauxChemin { moveTo() {} lineTo() {} arc() {} closePath() {} rect() {} }
  const canevas = () => ({ className: '', width: 0, height: 0, style: {} as Record<string, string>, getContext: () => contexte().ctx })
  vi.stubGlobal('Path2D', FauxChemin)
  vi.stubGlobal('window', { devicePixelRatio: 1 })
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal('ResizeObserver', class { observe() {} })
  vi.stubGlobal('document', { createElement: (t: string) => t === 'canvas' ? canevas() : { className: '', style: {}, appendChild() {} } })
  const { Rendu } = await import('../src/rendu')
  const cam = camera(0, 0, 1)
  const r = new Rendu(cam, { clientWidth: 800, clientHeight: 600, append() {} } as unknown as HTMLElement)
  return { r, cam }
}

const TRIANGLE: Figure = { id: 'tri', type: 'polygone', x: 100, y: 100, z: 1, auteur: 'moi', pts: [0, 0, 200, 0, 100, -150], ferme: true, couleur: '#1b2230', taille: 1, sommets: true, noms: ['A', 'B', 'C'] } as Figure
const SEGMENT = { id: 'seg', type: 'segment', x: 10, y: 10, z: 2, auteur: 'moi', dx: 100, dy: 50, couleur: '#d64545', taille: 0.5 } as unknown as Forme

describe('le rendu en contraste renforcé', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

  it('une figure : jamais affichée sous 2 px d\'écran (lineWidth = max(taille, 2 / z)) ; plus épaisse, elle garde la sienne ; sans contraste, la sienne', async () => {
    const { r, cam } = await rendu()
    const largeurs = (z: number, contraste: boolean, f: Figure = TRIANGLE) => {
      cam.z = z; r.contraste = contraste
      const c = contexte()
      r.dessinerFigure(c.ctx, f, null)
      return c.appels.filter(a => a.startsWith('stroke ')).map(a => Number(a.split('|')[2]))
    }
    expect(largeurs(1, false)[0]).toBe(1)
    expect(largeurs(1, true)[0]).toBe(2)
    expect(largeurs(0.5, true)[0]).toBe(4)
    expect(largeurs(4, true)[0]).toBe(1)                         // 1 monde = 4 px d'écran : déjà assez
    expect(largeurs(1, true, { ...TRIANGLE, taille: 6 })[0]).toBe(6)
  })

  it('peindreSur (vignettes, image copiée, PDF) : toujours sans contraste, appel pour appel comme sans, et le rendu le retrouve après', async () => {
    const { r, cam } = await rendu()
    r.fond = 'carreaux'
    for (const fond of ['carreaux', 'millimetre', 'pointe', 'repere'] as Fond[]) {
      for (const z of [0.4, 1, 2.5]) {
        cam.z = z
        r.fond = fond
        const peindre = (contraste: boolean) => {
          r.contraste = contraste
          const c = contexte()
          r.peindreSur(c.ctx, { l: 400, h: 300, dpr: 2, fond: true, formes: [TRIANGLE, SEGMENT] })
          return c.appels
        }
        const sans = peindre(false), avec = peindre(true)
        expect(avec, `${fond} z=${z}`).toEqual(sans)
        expect(r.contraste).toBe(true)
      }
    }
  })
})

// ---------- La couche directe, tout pris (la vérification des régressions du lot 5) ----------
// Un cadre en tirets par objet pris, chacun avec son save, ses tirets, son
// stroke et son restore, triplait la couche directe d'une page de 2000 mots
// toute prise. Les cadres tiennent maintenant en UN chemin, tracé une fois
// (deux en contraste renforcé : blanc dessous, bleu dessus), comme avant le
// lot 5 ; chaque objet garde son rectangle (ses tirets repartent à chacun).
describe('la couche directe, tout pris', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })

  const traits = (n: number) => Array.from({ length: n }, (_, k) => ({
    id: 'w' + k, type: 'trait', x: 20 + (k % 40) * 30, y: 20 + Math.floor(k / 40) * 12, z: k, auteur: 'moi',
    pts: [0, 0, 0.5, 10, 3, 0.5, 20, 0, 0.5], couleur: '#1b2230', taille: 2.5, opacite: 1, pression: false,
  }) as unknown as Forme)

  it('500 mots pris : un seul stroke pour tous les cadres en tirets (deux en contraste), un rectangle chacun ; une formule tournée a le sien, tourné', async () => {
    const { r } = await rendu()
    const formes: Forme[] = [...traits(500), { id: 'f', type: 'formule', x: 300, y: 300, z: 999, auteur: 'moi', latex: 'x^2', couleur: '#000', taille: 20, rotation: 0.5 } as unknown as Forme]
    for (const contraste of [false, true]) {
      r.contraste = contraste
      r.formes = formes
      r.selection = new Set(formes.map(f => f.id))
      const c = contexte()
      ;(r as unknown as { cd: CanvasRenderingContext2D }).cd = c.ctx
      ;(r as unknown as { peindreDirect(): void }).peindreDirect()
      const strokes = c.appels.filter(a => a.startsWith('stroke '))
      const tirets = strokes.filter(a => a.split('|')[4] !== '')
      expect(c.appels.filter(a => a.startsWith('rect(')).length, `contraste ${contraste}`).toBe(500)
      expect(strokes.length, `contraste ${contraste}`).toBe(contraste ? 2 : 1)
      expect(tirets.length).toBe(1)
      expect(c.appels.filter(a => a === 'save').length).toBeLessThanOrEqual(1)
      // La formule tournée : quatre coins (un moveTo, trois lineTo), refermés
      const i = c.appels.findIndex(a => a.startsWith('moveTo('))
      expect(c.appels.slice(i, i + 5).map(a => a.split('(')[0])).toEqual(['moveTo', 'lineTo', 'lineTo', 'lineTo', 'closePath'])
    }
  })
})
