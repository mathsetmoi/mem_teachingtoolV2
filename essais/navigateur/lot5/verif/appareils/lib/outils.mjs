// Outils partagés des essais « par appareil » de la vérification du lot 5
// (souris, Wacom indirecte, doigt, TNI, téléphone). Repris des essais K6 et
// K10 : un contexte, la page ouverte en développement, trois pointeurs.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../../commun/racines.mjs'
import { chromium } from '../../../../commun/playwright.mjs'

export const S = `${RACINE_ESSAIS}`
export const V = S + '/lot5/verif/appareils'
export const DEV = 'http://localhost:5173/'
export const attendre = ms => new Promise(r => setTimeout(r, ms))
export const DEG = Math.PI / 180

export let echecs = 0
export const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 2000) : '') }
export const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 2000) : '')
export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

export const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })

export async function contexte(o = {}) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  try { await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' }) } catch { /* rien */ }
  return c
}

/** La page ouverte (les messages notés), et ses trois pointeurs */
export async function ouvrir(ctx, nom, o = {}) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => document.fonts?.ready)
  await p.waitForTimeout(600)
  await p.evaluate(async () => {
    const a = window.__app
    a.reconnaissance = false
    window.__msgs = []
    const m = a.ui.message.bind(a.ui)
    a.ui.message = (t, ...r) => { window.__msgs.push(t); return m(t, ...r) }
    const cv = Object.assign(document.createElement('canvas'), { width: 60, height: 40 }); const g = cv.getContext('2d')
    g.fillStyle = '#00c000'; g.fillRect(0, 0, 60, 40)
    a.tableau.doc.getMap('images').set('v-vert', cv.toDataURL('image/png'))
  })
  const cdp = await ctx.newCDPSession(p)
  const souris = {
    survol: (x, y) => p.mouse.move(x, y),
    bas: async (x, y, o = {}) => { await p.mouse.move(x, y); if (o.maj) await p.keyboard.down('Shift'); await p.mouse.down({ button: o.bouton ?? 'left' }) },
    va: (x, y) => p.mouse.move(x, y),
    haut: async (x, y, o = {}) => { await p.mouse.move(x, y); await p.mouse.up({ button: o.bouton ?? 'left' }); if (o.maj) await p.keyboard.up('Shift') },
  }
  const mod = o => (o.maj ? 8 : 0)
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0 }),
    bas: async (x, y, o = {}) => {
      const droit = o.bouton === 'right'
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0, force: 0, modifiers: mod(o) })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: droit ? 'right' : 'left', buttons: droit ? 2 : 1, clickCount: 1, force: 0.5, modifiers: mod(o) })
      stylet.o = o
    },
    va: (x, y) => { const droit = stylet.o?.bouton === 'right'; return cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: droit ? 'right' : 'left', buttons: droit ? 2 : 1, force: 0.5, modifiers: mod(stylet.o ?? {}) }) },
    haut: (x, y) => { const droit = stylet.o?.bouton === 'right'; return cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: droit ? 'right' : 'left', buttons: 0, clickCount: 1, modifiers: mod(stylet.o ?? {}) }) },
  }
  const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const doigt = {
    survol: async () => {},
    bas: (x, y) => toucher('touchStart', [[x, y]]),
    va: (x, y) => toucher('touchMove', [[x, y]]),
    haut: () => toucher('touchEnd', []),
    toucher,
  }
  return { p, cdp, souris, stylet, doigt }
}

// ---------- Ce qu'on pose ----------
export const PAGE_NEUVE = () => {
  const a = window.__app
  a.nouvellePage()
  a.choisirOutil('selection')
  a.selection.clear(); a.options = null
  a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
  a.rendu.toutRedessiner(); a.ui.maj()
}
const POSER = f => {
  const a = window.__app, t = a.tableau
  const id = f.id ?? 'V' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f, id })
  return id
}
export const image = (x, y, l, h, o = {}) => ({ type: 'image', src: 'v-vert', x, y, l: 60, h: 40, m: [l / 60, 0, 0, h / 40], ...o })
export const formule = (x, y, o = {}) => ({ type: 'formule', x, y, latex: '\\frac{123}{456}', couleur: '#d0342c', taille: 28, ...o })
export const trait = (x, y, l, o = {}) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o }
}
export const triangle = (x, y, o = {}) => ({ type: 'polygone', x, y, pts: [0, 0, 160, 0, 0, -160], ferme: true, couleur: '#1b2230', taille: 2.5, sommets: true, noms: ['A', 'B', 'C'], codage: true, ...o })

export async function poser(p, f) { const id = await p.evaluate(POSER, f); await p.waitForTimeout(50); return id }
export const sel = p => p.evaluate(() => [...window.__app.selection])
export const vider = p => p.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.fermerMenus?.(); a.rendu.redessinerDirect(); a.ui.maj() })
export const prendre = async (p, ids) => { await p.evaluate(ids => { const a = window.__app; a.selection.clear(); for (const id of ids) a.selection.add(id); a.rendu.toutRedessiner(); a.ui.maj() }, ids); await p.waitForTimeout(120) }
export const forme = (p, id) => p.evaluate(id => { const f = window.__app.forme(id); return f && JSON.parse(JSON.stringify(f)) }, id)
export const formes = p => p.evaluate(() => JSON.parse(JSON.stringify(window.__app.formes)))
export const pile = p => p.evaluate(() => window.__app.tableau.annulationDe(window.__app.page).undoStack.length)
export const msgs = p => p.evaluate(() => window.__msgs)
export const cadre = async p => { await p.waitForTimeout(80); return p.evaluate(() => window.__app.rendu.cadre && JSON.parse(JSON.stringify(window.__app.rendu.cadre))) }
export const vue = p => p.evaluate(() => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(); return { x: a.cam.x, y: a.cam.y, z: a.cam.z, left: r.left, top: r.top } })
export const versF = (v, w) => ({ x: v.left + v.x + w.x * v.z, y: v.top + v.y + w.y * v.z })
export const ecran = async (p, x, y) => versF(await vue(p), { x, y })

export async function glisser(p, ptr, a, b, o = {}) {
  const v = await vue(p), A = versF(v, a), B = versF(v, b), n = o.n ?? 12
  await ptr.survol(A.x, A.y); await attendre(30)
  await ptr.bas(A.x, A.y, o)
  if (o.tenir) await attendre(o.tenir)
  for (let k = 1; k <= n; k++) { await ptr.va(A.x + (B.x - A.x) * k / n, A.y + (B.y - A.y) * k / n); await attendre(o.pas ?? 8) }
  await attendre(60)
  const r = o.pendant ? await o.pendant() : undefined
  await ptr.haut(B.x, B.y, o); await p.waitForTimeout(150)
  return r
}
/** Glisser en coordonnées de la fenêtre */
export async function glisserF(p, ptr, A, B, o = {}) {
  const n = o.n ?? 12
  await ptr.survol(A.x, A.y); await attendre(30)
  await ptr.bas(A.x, A.y, o)
  if (o.tenir) await attendre(o.tenir)
  for (let k = 1; k <= n; k++) { await ptr.va(A.x + (B.x - A.x) * k / n, A.y + (B.y - A.y) * k / n); await attendre(o.pas ?? 8) }
  await attendre(60)
  const r = o.pendant ? await o.pendant() : undefined
  await ptr.haut(B.x, B.y, o); await p.waitForTimeout(150)
  return r
}
export async function tourner(p, ptr, angle, o = {}) {
  const c = (await cadre(p)).cadre
  const v = await vue(p), C = versF(v, c.centre), P0 = versF(v, c.pastille)
  const a0 = Math.atan2(P0.y - C.y, P0.x - C.x), r0 = Math.hypot(P0.x - C.x, P0.y - C.y)
  const R = o.rayon ? o.rayon * v.z : r0, n = o.n ?? 24
  await ptr.survol(P0.x, P0.y); await attendre(30)
  await ptr.bas(P0.x, P0.y, o)
  if (o.rayon) for (let k = 1; k <= 6; k++) { const r = r0 + (R - r0) * k / 6; await ptr.va(C.x + r * Math.cos(a0), C.y + r * Math.sin(a0)); await attendre(8) }
  let fin = P0
  for (let k = 1; k <= n; k++) { const t = a0 + angle * DEG * k / n; fin = { x: C.x + R * Math.cos(t), y: C.y + R * Math.sin(t) }; await ptr.va(fin.x, fin.y); await attendre(8) }
  await attendre(60)
  const r = o.pendant ? await o.pendant() : undefined
  await ptr.haut(fin.x, fin.y, o); await p.waitForTimeout(150)
  return r
}
export const rect = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden || !e.offsetWidth) return null; const r = e.getBoundingClientRect(); return { left: r.left, top: r.top, right: r.right, bottom: r.bottom } }, sel)
export const couvre = (a, b) => !!a && !!b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
export const coinsImage = f => { const [a, b, c, d] = f.m; return [{ x: f.x, y: f.y }, { x: f.x + a * f.l, y: f.y + b * f.l }, { x: f.x + a * f.l + c * f.h, y: f.y + b * f.l + d * f.h }, { x: f.x + c * f.h, y: f.y + d * f.h }] }
/** Les entrées visibles d'un menu (textes) */
export const entrees = (p, sel = '.menu:not([hidden])') => p.evaluate(s => [...document.querySelectorAll(s + ' [role^=menuitem], ' + s + ' button')].filter(b => b.offsetWidth).map(b => (b.getAttribute('aria-label') || b.textContent).trim()), sel)
/** Tous les éléments visibles hors de la fenêtre (boutons, menus) */
export const horsEcran = p => p.evaluate(() => {
  const W = innerWidth, H = innerHeight, r = []
  for (const e of document.querySelectorAll('button, [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], .menu, .barre-actions, .toast, .message')) {
    if (!e.offsetWidth || !e.offsetHeight) continue
    const st = getComputedStyle(e); if (st.visibility === 'hidden' || st.display === 'none') continue
    const b = e.getBoundingClientRect()
    if (b.width < 1 || b.height < 1) continue
    // dans un conteneur qui défile : on regarde le conteneur
    if (b.left < -0.5 || b.top < -0.5 || b.right > W + 0.5 || b.bottom > H + 0.5) r.push({ q: e.className || e.tagName, t: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40), b: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] })
  }
  return r
})
export async function fin() {
  console.log(erreurs.length ? '✗ ERREURS JS : ' + erreurs.join(' | ') : '✓ aucune erreur JS')
  await nav.close()
  console.log(`${echecs} échec(s)`)
  process.exit(echecs || erreurs.length ? 1 : 0)
}
