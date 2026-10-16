// Outils communs des essais par appareil (vérification du lot 3)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

export const URL0 = 'http://localhost:5173/'
export const D = `${RACINE_ESSAIS}/lot3/verif/conformite/sorties`
mkdirSync(D, { recursive: true })
export const pause = ms => new Promise(r => setTimeout(r, ms))
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

export async function ouvrir(o = {}, nom = 'page', init) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  if (init) await page.addInitScript(init)
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

/** n pages, un trait sur chacune ; noms ; on regarde la page `ici` */
export const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: k % 2 ? '#d64545' : '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici })

export const ETAT = () => {
  const a = window.__app, t = a.tableau, tr = document.querySelector('.trieuse')
  const act = document.activeElement
  return {
    ouverte: !!tr && !tr.hidden, enTrieuse: document.body.classList.contains('en-trieuse'),
    cartes: [...document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')].map(c => c.dataset.page),
    focus: act?.getAttribute?.('aria-label') ?? null, focusPage: act?.dataset?.page ?? null, focusTag: act?.tagName,
    page: a.page, pages: a.pages.slice(), n: a.formes.length, film: t.film.length, outil: a.outil,
    msgs: (window.__msgs || []).slice(),
    toast: [...document.querySelector('.toast').children].map(l => l.textContent).join(' | '),
    fantome: !!document.querySelector('.trieuse-fantome'),
    defilement: document.querySelector('.trieuse-grille')?.scrollTop ?? 0,
    annonce: !document.querySelector('.annonce-page').hidden,
    choisies: [...document.querySelectorAll('.trieuse .carte[aria-selected="true"]')].map(c => c.dataset.page),
    menu: [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).map(m => m.getAttribute('aria-label')),
    dialog: [...document.querySelectorAll('dialog[open]')].map(d => d.className),
    corbeille: t.pagesDeLaCorbeille ? t.pagesDeLaCorbeille().map(x => x.id ?? x) : null,
  }
}
export const etat = page => page.evaluate(ETAT)
export const carte = (page, i, fx = 0.5, fy = 0.5) => page.evaluate(([i, fx, fy]) => {
  const c = document.querySelectorAll('.trieuse .carte:not(.trieuse-fantome)')[i]
  if (!c) return null
  const r = c.getBoundingClientRect()
  return { x: r.left + r.width * fx, y: r.top + r.height * fy, l: r.width, h: r.height, top: r.top, left: r.left }
}, [i, fx, fy])
export const centre = (page, sel) => page.evaluate(sel => {
  const e = typeof sel === 'string' ? document.querySelector(sel) : null
  if (!e) return null
  const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }
}, sel)
export const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)
export const attendreFermee = page => page.waitForFunction(() => document.querySelector('.trieuse')?.hidden, null, { timeout: 3000 }).then(() => true, () => false)

/** Le stylet d'une tablette graphique, par CDP */
export function plumeCDP(cdp) {
  return (type, x, y, appuye, bouton = 'left') => cdp.send('Input.dispatchMouseEvent', {
    type, x, y, pointerType: 'pen',
    button: type === 'mouseMoved' ? (appuye ? bouton : 'none') : bouton,
    buttons: appuye ? (bouton === 'right' ? 2 : 1) : 0,
    clickCount: type === 'mouseMoved' ? 0 : 1, force: appuye ? 0.5 : 0,
  })
}
/** Le doigt, par CDP (plusieurs doigts : [[x, y, id]]) */
export function doigtCDP(cdp) {
  return (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 1]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 0.5 })) })
}

export async function fin() {
  await nav.close()
  for (const x of erreurs) verifier('Aucune erreur JS', false, x)
  if (!erreurs.length) verifier('Aucune erreur JS', true)
  const rates = resultats.filter(r => !r.ok).length
  console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
  // Contrôle final du lot 3 : un échec se voit aussi au code de sortie
  if (rates) process.exitCode = 1
}
