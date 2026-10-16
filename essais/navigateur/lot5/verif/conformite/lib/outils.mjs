// Aides partagées des essais de conformité du lot 5 (vérification).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { chromium } from '../../../../commun/playwright.mjs'
export const S = `${RACINE_ESSAIS}`
export const C = S + '/lot5/verif/conformite'
export const DEV = 'http://localhost:5173/'
export const attendre = ms => new Promise(r => setTimeout(r, ms))
export let echecs = 0
export const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 2500) : '') }
export const note = (m, d) => console.log('·', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 3000) : '')
export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
export const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
export async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
  return c
}
export async function ouvrir(ctx, nom = 'p', url = DEV) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(url)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
  await p.waitForFunction(() => window.__app && window.__app.page)
  await p.waitForTimeout(400)
  await p.evaluate(() => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  })
  const cdp = await ctx.newCDPSession(p)
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
    bouton: async (x, y) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
      await attendre(60)
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
      await attendre(120)
    },
  }
  const doigt = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  return { p, cdp, stylet, doigt }
}
export const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
export const IMAGES = () => {
  const unie = (c) => { const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 60, 40); return cv.toDataURL('image/png') }
  const b = window.__app.tableau.doc.getMap('images')
  b.set('cf-vert', unie('#00c000')); b.set('cf-magenta', unie('#e000e0'))
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'K' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
export async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(40); return id }
export const image = (src, x, y, l, h, o = {}) => ({ type: 'image', src: 'cf-' + src, x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
export const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 8, opacite: 1, pression: false, ...o }
}
export const triangle = (x, y, o = {}) => ({ type: 'polygone', x, y, pts: [0, 150, 200, 150, 0, 0], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], ...o })
export const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: 'x^2+3x-1', couleur: '#1b2230', taille: 40, ...o })
const ECRAN = ({ x, y }) => { const s = window.__app.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }
export const ecran = (p, x, y) => p.evaluate(ECRAN, { x, y })
export const sel = p => p.evaluate(() => [...window.__app.selection])
export const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
export const msgs = p => p.evaluate(() => (window.__msgs || []).slice())
export const viderMsgs = p => p.evaluate(() => { window.__msgs = [] })
export const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
export const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
export const ETAT = () => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), pm = document.querySelector('.menu-flottant[aria-label="Page"]'), ba = document.querySelector('.barre-actions')
  return {
    sel: [...a.selection], options: a.options, outil: a.outil,
    panneau: !pn.hidden, label: pn.getAttribute('aria-label'), menuPage: !!pm && !pm.hidden, barre: !!ba && !ba.hidden,
    titre: pn.hidden ? null : pn.querySelector('.titre-selection')?.textContent ?? null,
    boutons: pn.hidden ? [] : [...pn.querySelectorAll('.ligne button')].map(b => b.textContent || b.getAttribute('aria-label')),
  }
}
export const etat = p => p.evaluate(ETAT)
export const ENTREES = sel => {
  const m = document.querySelector(sel)
  if (!m || m.hidden) return null
  return [...m.children].map(b => b.matches('hr') ? { filet: true } : b.matches('.menu-titre') ? { titre: b.textContent }
    : { t: b.querySelector('.libelle')?.firstChild?.textContent ?? b.textContent, role: b.getAttribute('role'), aide: b.querySelector('small')?.textContent, touche: b.querySelector('.touche')?.textContent, inactif: b.getAttribute('aria-disabled') === 'true', action: b.dataset.action, title: b.title })
}
export async function clicDroit(p, x, y) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, { button: 'right' }); await p.waitForTimeout(150) }
export async function clic(p, x, y, o) { const s = await ecran(p, x, y); await p.mouse.click(s.x, s.y, o); await p.waitForTimeout(100) }
export async function glisser(p, x1, y1, x2, y2, pendant) {
  const a = await ecran(p, x1, y1), b = await ecran(p, x2, y2)
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= 10; k++) { await p.mouse.move(a.x + (b.x - a.x) * k / 10, a.y + (b.y - a.y) * k / 10); if (k === 5 && pendant) await pendant() }
  await p.mouse.up(); await p.waitForTimeout(120)
}
export async function glisserEcran(p, a, b, n = 10) {
  await p.mouse.move(a.x, a.y); await p.mouse.down()
  for (let k = 1; k <= n; k++) await p.mouse.move(a.x + (b.x - a.x) * k / n, a.y + (b.y - a.y) * k / n)
  await p.mouse.up(); await p.waitForTimeout(150)
}
export async function fin() {
  if (erreurs.length) { console.log('Erreurs JS :', erreurs); }
  console.log(`\n${echecs} échec(s), ${erreurs.length} erreur(s) JS`)
  await nav.close()
}
