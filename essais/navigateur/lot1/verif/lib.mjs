// Outils communs aux sondes de vérification du lot 1 (aucun fichier du dépôt n'est touché)
import { chromium } from '../../commun/playwright.mjs'

export const URL0 = 'http://localhost:5173/'
export const resultats = []
export function noter(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok, detail })
  console.log(`${ok ? 'OK   ' : 'DÉFAUT'} ${nom}${detail ? ' — ' + detail : ''}`)
}
export const erreurs = []
export function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
export async function lancer() { return chromium.launch() }

/** Un contexte neuf (stockage vide) et la page chargée */
export async function ouvrir(nav, o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  const cdp = await ctx.newCDPSession(page)
  return { ctx, page, cdp }
}
export async function recharger(page) {
  await page.reload()
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(300)
}

export const CAM = () => { const c = window.__app.cam; return { x: c.x, y: c.y, z: c.z } }

/** Un rectangle posé sur la page (monde) */
export const POSER = ({ x, y, l, h }) => {
  const app = window.__app
  const f = app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }] })
  app.tableau.nouveauGeste(); app.tableau.poser(app.page, f)
  return f.id
}
export const TRAIT = ({ x, y }) => {
  const app = window.__app, t = app.tableau
  const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 8, 0, 0.5)
  const f = { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  t.nouveauGeste(); t.poser(app.page, f)
  return f.id
}
export const N = () => window.__app.formes.length

/** Le stylet, le doigt et la souris par le protocole de Chrome */
export function outils(cdp) {
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0 }),
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
    async trace(pts) { await this.bas(...pts[0]); for (const p of pts.slice(1)) await this.va(...p); await this.haut(...pts[pts.length - 1]) },
  }
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const doigt = async (pts, r = 8) => {
    await touche('touchStart', [pts[0]], r)
    for (const p of pts.slice(1)) await touche('touchMove', [p], r)
    await touche('touchEnd', [])
  }
  const molette = (x, y, deltaX, deltaY, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX, deltaY, ...o })
  return { stylet, touche, doigt, molette }
}
export const ligne = (x, y, dx, dy, n = 8) => Array.from({ length: n + 1 }, (_, k) => [x + dx * k / n, y + dy * k / n])

/** Une touche par CDP : key, code, modificateurs (1 Alt, 2 Ctrl, 4 Meta, 8 Maj) */
export async function touche(cdp, key, code, modifiers = 0, o = {}) {
  const base = { key, code, modifiers, windowsVirtualKeyCode: o.vk ?? 0, ...o }
  await cdp.send('Input.dispatchKeyEvent', { type: o.text ? 'keyDown' : 'rawKeyDown', ...base })
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base, text: undefined })
}

export function bilan() {
  const d = resultats.filter(r => !r.ok)
  console.log(`\n${resultats.length - d.length}/${resultats.length} sans défaut`)
  if (erreurs.length) console.log('ERREURS JS :\n' + erreurs.join('\n'))
  return d
}
