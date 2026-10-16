// Outils communs de la vérification de conformité du lot 2
import { chromium } from '../../../commun/playwright.mjs'

export const URL0 = process.env.URL0 || 'http://localhost:5173/'
export const resultats = []
export function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
export const note = (...x) => console.log('  · ' + x.map(v => typeof v === 'string' ? v : JSON.stringify(v)).join(' '))
export const erreurs = []
export function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
export const nav = await chromium.launch()
export const attendre = ms => new Promise(r => setTimeout(r, ms))

export async function charger(ctx, nom, url = URL0) {
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(url)
  await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
  await page.waitForTimeout(500)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    survol: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  return { page, cdp, touche, stylet }
}
export const contexte = (o = {}) => nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })

export const etat = page => page.evaluate(() => {
  const a = window.__app
  const pn = document.querySelector('.panneau-forme'), pm = document.querySelector('.menu-flottant[aria-label="Page"]')
  const mp = document.querySelector('.menu-partie'), ba = document.querySelector('.barre-actions')
  return {
    n: a.formes.length, types: a.formes.map(f => f.type), ids: a.formes.map(f => f.id), sel: [...a.selection], options: a.options, outil: a.outil,
    panneau: !pn.hidden, panneauLabel: pn.getAttribute('aria-label'), menuPage: !!pm && !pm.hidden, menuPartie: !!mp && !mp.hidden, barre: !!ba && !ba.hidden,
    page: a.page, pages: a.pages.length, cam: { x: a.cam.x, y: a.cam.y, z: a.cam.z }, geste: a.geste?.type ?? null,
    dernier: window.__msgs.slice(-1)[0] ?? null, msgs: window.__msgs.length,
  }
})
export const barre = page => page.evaluate(() => {
  const ba = document.querySelector('.barre-actions')
  if (!ba || ba.hidden) return null
  const r = ba.getBoundingClientRect()
  return {
    rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
    boutons: [...ba.querySelectorAll('button')].map(b => {
      const q = b.getBoundingClientRect()
      return { libelle: b.querySelector('.libelle')?.textContent, titre: b.title, aria: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'), l: q.width, h: q.height, x: q.left + q.width / 2, y: q.top + q.height / 2 }
    }),
  }
})
export const boiteEcran = (page, id) => page.evaluate(id => {
  const a = window.__app, f = a.formes.find(x => x.id === id)
  const b = a.rendu.boite(f), z = a.rendu.scene.getBoundingClientRect()
  const p = a.cam.versEcran(b.x, b.y), q = a.cam.versEcran(b.x + b.l, b.y + b.h)
  return { left: z.left + p.x, top: z.top + p.y, right: z.left + q.x, bottom: z.top + q.y }
}, id)
export const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
export const mondeDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect()
  return a.cam.versMonde(x - r.left, y - r.top)
}, [x, y])
export const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)

/** Pose une forme (monde) et rend son id. o.type : trait | triangle | rect | cercle | formule */
export const poser = (page, o) => page.evaluate(o => {
  const a = window.__app, t = a.tableau
  const id = 'X' + Math.random().toString(36).slice(2, 8)
  let f
  if (o.type === 'triangle') f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + (o.l ?? 160), y: o.y }, { x: o.x, y: o.y + (o.h ?? 120) }] })
  else if (o.type === 'rect') f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + o.l, y: o.y }, { x: o.x + o.l, y: o.y + o.h }, { x: o.x, y: o.y + o.h }] })
  else if (o.type === 'cercle') f = a.nouvelleFigure({ type: 'cercle', x: o.x, y: o.y, r: o.r })
  else if (o.type === 'formule') f = { id, type: 'formule', x: o.x, y: o.y, latex: o.latex ?? 'x^2+1', couleur: '#1b2230', taille: 28, z: Date.now(), auteur: t.moi }
  else {
    const l = o.l ?? 120
    f = { id, type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, l / 3, 0, 0.5, 2 * l / 3, 0, 0.5, l, 0, 0.5],
      couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}, o)
export const vider = page => page.evaluate(() => { const a = window.__app; a.selection.clear(); a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, a.formes.map(f => f.id)); a.ui.maj() })
export const msgsDepuis = (page, k) => page.evaluate(k => window.__msgs.slice(k), k)
export async function fin() {
  if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
  const ko = resultats.filter(r => !r.ok).length
  console.log(`${resultats.length - ko} / ${resultats.length} vérifications passent`)
  await nav.close()
  process.exit(ko || erreurs.length ? 1 : 0)
}
