// Le rendu d'une page des lots 1 à 4 (sans rien du lot 5) : peindreSur
// (vignettes, image copiée, PDF) et la scène de l'écran font-ils, appel pour
// appel (chemins compris), ce que faisait la version d'avant le lot 5 ?
// Rangé dans le dépôt, cette version (construite depuis un commit qui
// n'existe plus) est remplacée par une référence figée : rendu-reference.json,
// l'empreinte SHA-256 des appels de chaque cas, relevée sur la version d'avant
// le lot 5 en rangeant la batterie (la version actuelle donnait alors
// exactement les mêmes).
import { RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const NOUVEAU = `${RACINE_DEPOT}/src`
const REFERENCE = JSON.parse(readFileSync(new URL('./rendu-reference.json', import.meta.url), 'utf8')) as { peindreSur: string[]; dessinerForme: string }
const empreinte = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex')

let journal: string[] = []
function contexte() {
  const appels: string[] = []
  const pile: Record<string, unknown>[] = []
  let tirets: number[] = []
  const etat = () => `${ctx.strokeStyle}|${ctx.fillStyle}|${+ctx.lineWidth.toFixed(6)}|${+ctx.globalAlpha.toFixed(6)}|${tirets.map(t => +t.toFixed(4)).join(',')}|${ctx.lineCap}|${ctx.lineJoin}|${ctx.shadowBlur}`
  const fmt = (a: unknown[]) => a.map(x => typeof x === 'number' ? +x.toFixed(4) : x && typeof x === 'object' && (x as { cmd?: string[] }).cmd ? 'chemin[' + (x as { cmd: string[] }).cmd.join(';') + ']' : typeof x === 'object' ? 'objet' : String(x)).join(',')
  const noter = (nom: string) => (...a: unknown[]) => { appels.push(`${nom}(${fmt(a)})`) }
  const ctx = {
    fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1, font: '', textAlign: '', textBaseline: '', lineCap: '', lineJoin: '',
    shadowColor: '', shadowBlur: 0,
    save() { pile.push({ fillStyle: ctx.fillStyle, strokeStyle: ctx.strokeStyle, lineWidth: ctx.lineWidth, globalAlpha: ctx.globalAlpha, tirets, lineCap: ctx.lineCap, lineJoin: ctx.lineJoin, font: ctx.font }); appels.push('save') },
    restore() { const e = pile.pop(); if (e) { Object.assign(ctx, e); tirets = e.tirets as number[] } appels.push('restore') },
    stroke(...a: unknown[]) { appels.push('stroke ' + etat() + ' ' + fmt(a)) },
    fill(...a: unknown[]) { appels.push('fill ' + etat() + ' ' + fmt(a)) },
    setLineDash(t: number[]) { tirets = [...t] },
    beginPath: noter('beginPath'), closePath: noter('closePath'), moveTo: noter('moveTo'), lineTo: noter('lineTo'),
    rect: noter('rect'), arc: noter('arc'), roundRect: noter('roundRect'), fillRect: noter('fillRect'), strokeRect: noter('strokeRect'),
    fillText: (...a: unknown[]) => { appels.push(`fillText(${fmt(a)}) ${ctx.font} ${etat()}`) }, strokeText: noter('strokeText'), translate: noter('translate'), rotate: noter('rotate'), setTransform: noter('setTransform'),
    transform: noter('transform'), clip: noter('clip'), drawImage: noter('drawImage'), clearRect: noter('clearRect'), quadraticCurveTo: noter('quadraticCurveTo'), bezierCurveTo: noter('bezierCurveTo'), ellipse: noter('ellipse'),
    measureText: (t: string) => ({ width: 7 * String(t).length }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, appels }
}

async function renduDe(racine: string) {
  class FauxChemin { cmd: string[] = []
    moveTo(...a: number[]) { this.cmd.push('M' + a.map(v => +v.toFixed(3)).join(' ')) }
    lineTo(...a: number[]) { this.cmd.push('L' + a.map(v => +v.toFixed(3)).join(' ')) }
    arc(...a: unknown[]) { this.cmd.push('A' + a.map(v => typeof v === 'number' ? +v.toFixed(3) : String(v)).join(' ')) }
    quadraticCurveTo(...a: number[]) { this.cmd.push('Q' + a.map(v => +v.toFixed(3)).join(' ')) }
    bezierCurveTo(...a: number[]) { this.cmd.push('C' + a.map(v => +v.toFixed(3)).join(' ')) }
    closePath() { this.cmd.push('Z') } rect(...a: number[]) { this.cmd.push('R' + a.join(' ')) }
    addPath() { this.cmd.push('P') } ellipse(...a: number[]) { this.cmd.push('E' + a.join(' ')) } }
  const canevas = () => ({ className: '', width: 0, height: 0, style: {} as Record<string, string>, getContext: () => contexte().ctx, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 }) })
  vi.stubGlobal('Path2D', FauxChemin)
  vi.stubGlobal('window', { devicePixelRatio: 1, addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) })
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {} }))
  vi.stubGlobal('requestAnimationFrame', () => 1)
  vi.stubGlobal('cancelAnimationFrame', () => {})
  vi.stubGlobal('ResizeObserver', class { observe() {} })
  vi.stubGlobal('document', { createElement: (t: string) => t === 'canvas' ? canevas() : { className: '', style: {}, appendChild() {}, append() {} } })
  const { Rendu } = await import(racine + '/rendu')
  const { Camera } = await import(racine + '/camera')
  const cam = new Camera(); cam.x = 37; cam.y = -12; cam.z = 1.3
  const r = new Rendu(cam, { clientWidth: 800, clientHeight: 600, append() {}, appendChild() {} } as unknown as HTMLElement)
  r.pixels = () => ({ complete: true, naturalWidth: 10 } as unknown as HTMLImageElement)
  return { r, cam }
}

function page(): unknown[] {
  const pts: number[] = []
  for (let i = 0; i < 60; i++) pts.push(i * 3.1, Math.sin(i / 5) * 20, 0.3 + (i % 7) / 10)
  const ferme: number[] = []
  for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; ferme.push(Math.cos(a) * 30 - 30, Math.sin(a) * 30, 0.5) }
  ferme.push(0, 0, 0.5)
  return [
    { id: 'img1', type: 'image', x: 50, y: 60, z: 5, auteur: 'a', src: 'data:image/png;base64,AAAA', l: 300, h: 200, m: [1, 0, 0, 1] },
    { id: 't1', type: 'trait', x: 10, y: 20, z: 1, auteur: 'a', pts, couleur: '#1b2230', taille: 2.5, opacite: 1, pression: true },
    { id: 't2', type: 'trait', x: 200, y: 220, z: 3, auteur: 'a', pts: ferme, couleur: '#d64545', taille: 4, opacite: 1, pression: false },
    { id: 'sur', type: 'trait', x: 100, y: 120, z: 4, auteur: 'a', pts: [0, 0, 0.5, 100, 0, 0.5], couleur: '#f2c94c', taille: 18, opacite: 0.4, pression: false },
    { id: 'tri', type: 'polygone', x: 100, y: 100, z: 2, auteur: 'a', pts: [0, 0, 200, 0, 100, -150], ferme: true, couleur: '#1b2230', taille: 1.5, sommets: true, noms: ['A', 'B', 'C'], codage: true, fond: '#3b6fb6' },
    { id: 'car', type: 'polygone', x: 400, y: 100, z: 6, auteur: 'a', pts: [0, 0, 100, 0, 100, 100, 0, 100], ferme: true, couleur: '#1f5fbf', taille: 2, sommets: true, noms: ['E', 'F', 'G', 'H'], codage: true, tirets: true },
    { id: 'pt', type: 'polygone', x: 600, y: 300, z: 7, auteur: 'a', pts: [0, 0], ferme: false, couleur: '#1b2230', taille: 2, sommets: true, noms: ['M'], marque: 'croix' },
    { id: 'dr', type: 'polygone', x: 20, y: 400, z: 8, auteur: 'a', pts: [0, 0, 100, 30], ferme: false, couleur: '#1b2230', taille: 1.5, prolonge: 'droite', sommets: true, noms: ['P', 'Q'] },
    { id: 'c1', type: 'cercle', x: 300, y: 400, z: 9, auteur: 'a', r: 60, couleur: '#1b2230', taille: 1.5, sommets: true, noms: ['O'] },
    { id: 'arc', type: 'cercle', x: 500, y: 450, z: 10, auteur: 'a', r: 40, couleur: '#1b2230', taille: 1.5, arc: { a0: 0.2, a1: 2.5 } },
    { id: 'seg', type: 'segment', x: 10, y: 10, z: 11, auteur: 'a', dx: 100, dy: 50, couleur: '#d64545', taille: 0.5 },
    { id: 'fx', type: 'formule', x: 120, y: 500, z: 12, auteur: 'a', latex: '\\frac{a}{b}', couleur: '#1b2230', taille: 24 },
    { id: 'img2', type: 'image', x: -50, y: 300, z: 0.5, auteur: 'a', src: 'data:image/png;base64,BBBB', l: 100, h: 100, m: [0.5, 0.2, -0.2, 0.5] },
  ]
}

describe('rendu identique sur une page sans rien du lot 5', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.resetModules() })
  it('peindreSur, avec et sans fond, fond par fond, esquisse', async () => {
    const { r } = await renduDe(NOUVEAU)
    const b: string[][] = []
    for (const fond of ['carreaux', 'seyes', 'repere', 'blanc'] as const) {
      r.fond = fond
      for (const fondImpr of [true, false] as const) for (const esquisse of [false, true]) {
        const c = contexte()
        r.peindreSur(c.ctx, { l: 400, h: 300, dpr: 2, fond: fondImpr, formes: page() as never, esquisse,
          formule: (cc: CanvasRenderingContext2D, f: { id: string; x: number; y: number }) => { cc.fillText('F' + f.id, f.x, f.y) } })
        b.push(c.appels)
      }
    }
    expect(b.length).toBe(REFERENCE.peindreSur.length)
    const ecarts = b.map((x, i) => empreinte(x) === REFERENCE.peindreSur[i] ? null : i).filter(i => i !== null)
    expect(ecarts, 'les cas dont les appels diffèrent de la référence').toEqual([])
  })
  it('dessinerForme direct (scène de l\'écran) : chaque forme', async () => {
    const { r } = await renduDe(NOUVEAU)
    const tout: string[] = []
    for (const f of page() as never[]) {
      if ((f as { type: string }).type === 'formule') continue
      const c = contexte()
      ;(r as unknown as { dessinerForme: (c: CanvasRenderingContext2D, f: unknown, d: unknown) => void }).dessinerForme(c.ctx, f, null)
      ;(r as unknown as { dessinerForme: (c: CanvasRenderingContext2D, f: unknown, d: unknown) => void }).dessinerForme(c.ctx, f, { dx: 3, dy: -4 })
      tout.push(...c.appels)
    }
    expect(tout.length).toBeGreaterThan(100)
    expect(empreinte(tout)).toBe(REFERENCE.dessinerForme)
  })
})
