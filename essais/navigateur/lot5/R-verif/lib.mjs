// Outils communs des sondes de vérification des retouches après le lot 5,
// reprises dans la batterie (lot5/R-verif-*.mjs, corrections des
// vérifications) : la copie de retouches/verif/parcours/lib.mjs (et de
// conformite/lib.mjs, la même), à trois changements près : les captures vont
// dans retouches/verif-corr/sondes-captures ; les versions construites sont
// par défaut celles du dépôt (dist-pages, dist/index.html : la batterie les
// refait d'abord ; PARCOURS_PAGES, PARCOURS_UN pour d'autres) ; fin() sort
// avec le code 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import { chromium } from '../../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

export const P = `${RACINE_ESSAIS}/retouches/verif-corr`
export const D = P + '/sondes-captures'
mkdirSync(D, { recursive: true })

export let echecs = 0
export const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
export const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 1200) : '')
export const erreurs = []
export const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
export const ecartAngle = (a, b) => +((((a - b) % 360) + 540) % 360 - 180).toFixed(1)

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
const PAGES = process.env.PARCOURS_PAGES ?? `${RACINE_DEPOT}/dist-pages`
export async function demarrer() {
  const serveur = createServer((q, r) => {
    const chemin = normalize(join(PAGES, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
    if (!chemin.startsWith(PAGES) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
    r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
  })
  await new Promise(f => serveur.listen(0, '127.0.0.1', f))
  const URLS = { ligne: `http://127.0.0.1:${serveur.address().port}/index.html`, cle: 'file://' + (process.env.PARCOURS_UN ?? `${RACINE_DEPOT}/dist/index.html`) }
  const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
  return { serveur, URLS, nav }
}
export async function contexte(nav, url, l, h, o = {}) {
  const c = await nav.newContext({ viewport: { width: l, height: h }, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  if (url.startsWith('file:')) await c.grantPermissions(['clipboard-read', 'clipboard-write'])
  else await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin })
  return c
}
export const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
export async function ouvrir(ctx, url, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(url)
  await pret(p)
  await p.waitForTimeout(800)
  return { p, ...await pointeurs(ctx, p) }
}
export async function pointeurs(ctx, p) {
  const cdp = await ctx.newCDPSession(p)
  const pen = (type, x, y, appuye, bouton = 'left') => cdp.send('Input.dispatchMouseEvent', { type, x, y, pointerType: 'pen',
    button: type === 'mouseMoved' && !appuye ? 'none' : bouton, buttons: appuye ? (bouton === 'right' ? 2 : 1) : 0, force: appuye ? 0.45 : 0, clickCount: type === 'mouseMoved' ? 0 : 1 })
  const souris = {
    nom: 'souris', survol: (x, y) => p.mouse.move(x, y), bas: async (x, y) => { await p.mouse.move(x, y); await p.mouse.down() },
    va: (x, y) => p.mouse.move(x, y), haut: async (x, y) => { await p.mouse.move(x, y); await p.mouse.up() },
    clicDroit: (x, y) => p.mouse.click(x, y, { button: 'right' }),
  }
  const wacom = {
    nom: 'wacom', survol: (x, y) => pen('mouseMoved', x, y, false), bas: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true) },
    va: (x, y) => pen('mouseMoved', x, y, true), haut: (x, y) => pen('mouseReleased', x, y, false),
    clicDroit: async (x, y) => { await pen('mouseMoved', x, y, false); await pen('mousePressed', x, y, true, 'right'); await pen('mouseReleased', x, y, false, 'right') },
  }
  const crayon = {
    nom: 'crayon', survol: async () => {}, bas: (x, y) => pen('mousePressed', x, y, true), va: (x, y) => pen('mouseMoved', x, y, true), haut: (x, y) => pen('mouseReleased', x, y, false),
  }
  const toucher = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 }] })
  const doigt = { nom: 'doigt', survol: async () => {}, bas: (x, y) => toucher('touchStart', x, y), va: (x, y) => toucher('touchMove', x, y), haut: () => toucher('touchEnd') }
  return { cdp, souris, wacom, crayon, doigt }
}
export async function clic(p, ptr, x, y) {
  await ptr.survol(x, y); await p.waitForTimeout(40)
  await ptr.bas(x, y); await p.waitForTimeout(40); await ptr.haut(x, y); await p.waitForTimeout(250)
}
export async function boite(p, sel) { return p.locator(sel).first().boundingBox({ timeout: 3000 }).catch(() => null) }
export async function clicSur(p, ptr, selecteur) {
  const b = await boite(p, selecteur)
  if (!b) { ok(false, `(introuvable à l'écran : ${selecteur})`); return false }
  await clic(p, ptr, b.x + b.width / 2, b.y + b.height / 2)
  return true
}
export async function trait(p, ptr, x0, y0, x1, y1, n = 16) {
  await ptr.survol(x0, y0); await p.waitForTimeout(30)
  await ptr.bas(x0, y0)
  for (let k = 1; k <= n; k++) { await ptr.va(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n + Math.sin(k / 2) * 6); await p.waitForTimeout(8) }
  await ptr.haut(x1, y1); await p.waitForTimeout(350)
}

export const ECRAN = () => {
  const z = document.getElementById('zone')
  const t = [...document.querySelectorAll('.barre-outils .tailles .taille')]
  const i = t.findIndex(b => b.classList.contains('actif'))
  return {
    outil: z.dataset.outil, curseur: z.style.cursor || getComputedStyle(z).cursor,
    taille: t[i]?.title ?? null,
    fond: (document.querySelector('button.choix-fond')?.title ?? '').replace('Fond de la page : ', ''),
    zoom: (document.querySelector('.zoom-texte')?.textContent ?? '').replace(/\s/g, ' '),
    rang: (document.querySelector('.rang-numero')?.textContent ?? '').replace(/\s/g, ' '),
    toast: [...document.querySelectorAll('.toast.visible')].map(t => t.textContent.trim()).join(' | '),
  }
}
export const ecran = p => p.evaluate(ECRAN)
export const session = p => p.evaluate(() => {
  const id = new URLSearchParams(location.search).get('classeur')
  for (const k of ['mem-session:' + id, 'mem-session']) { const t = localStorage.getItem(k); if (t) return { cle: k, ...JSON.parse(t) } }
  return null
})
/** L'image verte (coin rouge) et l'encre sombre dans la couche de la scène */
export const LIRE = () => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0, sx = 0, sy = 0, nr = 0, rx = 0, ry = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, encre = 0
  let ex1 = 1e9, ey1 = 1e9, ex2 = -1, ey2 = -1
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
    const i = (y * c.width + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]
    const vert = G > 150 && R < 60 && B < 60, rouge = R > 180 && G < 60 && B < 60
    if (vert || rouge) { n++; sx += x; sy += y; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y }
    if (rouge) { nr++; rx += x; ry += y }
    if (A > 200 && R < 90 && G < 90 && B < 140 && !vert && !rouge) { encre++; if (x < ex1) ex1 = x; if (x > ex2) ex2 = x; if (y < ey1) ey1 = y; if (y > ey2) ey2 = y }
  }
  const e = encre ? { x1: r.left + ex1 / k, y1: r.top + ey1 / k, x2: r.left + ex2 / k, y2: r.top + ey2 / k } : null
  if (!n || !nr) return { aire: 0, encre, boiteEncre: e }
  const cx = sx / n, cy = sy / n
  return { x1: r.left + x1 / k, y1: r.top + y1 / k, x2: r.left + x2 / k, y2: r.top + y2 / k, cx: r.left + cx / k, cy: r.top + cy / k,
    angle: +(Math.atan2(ry / nr - cy, rx / nr - cx) * 180 / Math.PI).toFixed(1), aire: n * 4 / k / k, encre, boiteEncre: e }
}
export const lire = p => p.evaluate(LIRE)
export const PASTILLE = () => {
  const c = document.querySelector('canvas.couche-direct'), r = c.getBoundingClientRect(), k = c.width / r.width
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data
  const blanc = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 200 && d[i * 4] > 235 && d[i * 4 + 1] > 235 && d[i * 4 + 2] > 235) blanc[i] = 1
  let mieux = null
  const pile = []
  for (let i = 0; i < W * H; i++) {
    if (blanc[i] !== 1) continue
    let n = 0, sx = 0, sy = 0
    blanc[i] = 2; pile.push(i)
    while (pile.length) {
      const j = pile.pop(), x = j % W, y = (j - x) / W
      n++; sx += x; sy += y
      for (const v of [j - 1, j + 1, j - W, j + W]) if (v >= 0 && v < W * H && blanc[v] === 1 && Math.abs((v % W) - x) <= 1) { blanc[v] = 2; pile.push(v) }
    }
    if (!mieux || n > mieux.n) mieux = { n, x: sx / n, y: sy / n }
  }
  if (!mieux) return null
  return { x: r.left + mieux.x / k, y: r.top + mieux.y / k, aire: mieux.n / k / k }
}
export const pastille = p => p.evaluate(PASTILLE)
/** Les petits carrés blancs des coins du cadre (couche directe) */
export const COINS = () => {
  const c = document.querySelector('canvas.couche-direct'), r = c.getBoundingClientRect(), k = c.width / r.width
  const W = c.width, H = c.height, d = c.getContext('2d').getImageData(0, 0, W, H).data
  const blanc = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) if (d[i * 4 + 3] > 200 && d[i * 4] > 235 && d[i * 4 + 1] > 235 && d[i * 4 + 2] > 235) blanc[i] = 1
  const amas = [], pile = []
  for (let i = 0; i < W * H; i++) {
    if (blanc[i] !== 1) continue
    let n = 0, sx = 0, sy = 0
    blanc[i] = 2; pile.push(i)
    while (pile.length) {
      const j = pile.pop(), x = j % W, y = (j - x) / W
      n++; sx += x; sy += y
      for (const v of [j - 1, j + 1, j - W, j + W]) if (v >= 0 && v < W * H && blanc[v] === 1 && Math.abs((v % W) - x) <= 1) { blanc[v] = 2; pile.push(v) }
    }
    if (n > 4) amas.push({ x: r.left + sx / n / k, y: r.top + sy / n / k, aire: n / k / k })
  }
  return amas.sort((a, b) => b.aire - a.aire)
}
export const coins = p => p.evaluate(COINS)
export const rect = (p, sel) => p.evaluate(s => {
  const el = document.querySelector(s)
  if (!el || el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null
  const r = el.getBoundingClientRect()
  return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null
}, sel)
export const couvre = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
export const disque = (q, r = 14) => q && { l: q.x - r, r: q.x + r, t: q.y - r, b: q.y + r }

export const fabriquer = (p, l = 900, h = 600) => p.evaluate(([l, h]) => {
  const c = Object.assign(document.createElement('canvas'), { width: l, height: h }); const g = c.getContext('2d')
  g.fillStyle = '#00c000'; g.fillRect(0, 0, l, h); g.fillStyle = '#e00000'; g.fillRect(0, 0, l * 0.24, h * 0.25)
  return c.toDataURL('image/png').split(',')[1]
}, [l, h])
export async function importer(p, ptr, comment, b64, ou = { x: 700, y: 400 }) {
  if (comment === 'bouton') {
    const b = await p.locator('button[title^="Importer une image"]').boundingBox()
    const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), clic(p, ptr, b.x + b.width / 2, b.y + b.height / 2)])
    await fc.setFiles({ name: 'enonce.png', mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') })
  } else if (comment === 'coller') {
    await p.evaluate(async b64 => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': new Blob([bin], { type: 'image/png' }) })])
    }, b64)
    await p.keyboard.press('Control+v')
  } else {
    await p.evaluate(([b64, ou]) => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const dt = new DataTransfer(); dt.items.add(new File([bin], 'enonce.png', { type: 'image/png' }))
      const z = document.getElementById('zone')
      for (const t of ['dragenter', 'dragover', 'drop']) z.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: ou.x, clientY: ou.y }))
    }, [b64, ou])
  }
  await p.waitForFunction(() => document.querySelector('.toast.visible')?.textContent?.includes('Image posée'), null, { timeout: 10000 }).catch(() => {})
  await p.waitForTimeout(500)
}
export async function tourner(p, ptr, q, c, deg, pas = 20) {
  const R = Math.hypot(q.x - c.x, q.y - c.y), a0 = Math.atan2(q.y - c.y, q.x - c.x)
  await ptr.survol(q.x, q.y); await p.waitForTimeout(60)
  await ptr.bas(q.x, q.y)
  let f = q
  for (let k = 1; k <= pas; k++) { const t = a0 + deg * Math.PI / 180 * k / pas; f = { x: c.x + R * Math.cos(t), y: c.y + R * Math.sin(t) }; await ptr.va(f.x, f.y); await p.waitForTimeout(12) }
  await p.waitForTimeout(80)
  const pendant = await ecran(p)
  await ptr.haut(f.x, f.y); await p.waitForTimeout(350)
  return pendant
}
export async function glisser(p, ptr, a, b, pas = 16) {
  await ptr.survol(a.x, a.y); await p.waitForTimeout(80)
  await ptr.bas(a.x, a.y)
  for (let k = 1; k <= pas; k++) { await ptr.va(a.x + (b.x - a.x) * k / pas, a.y + (b.y - a.y) * k / pas); await p.waitForTimeout(12) }
  await p.waitForTimeout(60)
  const pendant = await ecran(p)
  await ptr.haut(b.x, b.y); await p.waitForTimeout(350)
  return pendant
}
/** Le point du monde au centre du canevas, calculé de ce qu'on voit : la
 *  session (mem-session) note [cx, cy, z] de la page courante */
export async function vueSession(p) {
  const s = await session(p)
  return s ? { page: s.page, v: s.vues?.[s.page] } : null
}
export async function fin(nav, serveur) {
  await nav.close(); serveur.close()
  if (erreurs.length) { echecs++; console.log('✗ ÉCHEC erreurs JS :', erreurs.slice(0, 10)) } else console.log('✓ aucune erreur JS')
  console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
  process.exit(echecs ? 1 : 0)
}
