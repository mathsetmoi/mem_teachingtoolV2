// Outils communs des essais de régression du lot 2 (verif/)
import { chromium } from '../../commun/playwright.mjs'

export const URL0 = process.env.URL0 || 'http://localhost:5173/'
export const resultats = []
export function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
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
  })
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
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
    panneau: !pn.hidden, menuPage: !!pm && !pm.hidden, menuPartie: !!mp && !mp.hidden, barre: !!ba && !ba.hidden,
    page: a.page, pages: a.pages.length, cam: { x: a.cam.x, y: a.cam.y, z: a.cam.z }, geste: a.geste?.type ?? null,
    dernier: window.__msgs.slice(-1)[0] ?? null, msgs: window.__msgs.length, piste: a.tableau.piste.length, film: a.tableau.film.length,
  }
})
export const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
export const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
export async function fin() {
  if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
  const ko = resultats.filter(r => !r.ok).length
  console.log(`${resultats.length - ko} / ${resultats.length} vérifications passent`)
  await nav.close()
  process.exit(ko || erreurs.length ? 1 : 0)
}
