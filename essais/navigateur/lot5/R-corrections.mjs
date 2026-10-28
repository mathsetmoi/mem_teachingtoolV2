// ESSAI DES CORRECTIONS DES VÉRIFICATIONS DES RETOUCHES APRÈS LE LOT 5
// (les rapports « parcours », « regressions » et « conformite »).
// Comme le professeur, dans la VERSION CONSTRUITE (la version en ligne,
// dist-pages servie en http par cet essai, puis la version hors ligne, dist/index.html
// en file://), sans window.__app ; tout se lit à l'écran (l'outil de la
// zone, le message, les pixels du tableau et de la couche directe).
// 1. « Fixer en fond » juste après l'import rend l'outil qu'on avait : 3
//    façons d'importer × la souris et le stylet de la tablette graphique, le
//    bouton du message ; puis le menu ⋯ (le bouton du stylet sur l'image) ;
//    depuis la Gomme ; et l'encre vient au trait suivant. La Sélection
//    choisie (V) reste, et le message dit « P : reprendre le Stylo. ».
// 2. Le message ne couvre ni les coins ni les côtés du cadre : 1366 × 657 et
//    1280 × 689, un énoncé A4 en portrait et une image carrée, juste après
//    l'import ; le coin en haut à droite se tire (l'image s'agrandit, rien
//    n'est fixé) ; puis tournée de 50°, aucune poignée sous le message.
// 3. La touche de l'outil quitté : depuis la Gomme et les Formes (cercle),
//    l'image lâchée d'un clic dans le vide, la touche que dit le message rend
//    l'outil (« Échap deux fois », dit avant, ramenait à la Sélection).
// 4. Les mots de « Fixer en fond » avant tout appui sur le tableau : au doigt
//    sur un écran tactile, « appui long dessus », jamais « clic » ; à la
//    tablette graphique, « bouton du stylet dessus » ; un fichier déposé sur
//    un écran tactile : « Touchez le Stylo… », pas « P : … ».
// 5. « Détacher l'image du fond » depuis le Stylo : le message dit ↻ et
//    « P : reprendre le Stylo. » ; Fixer en fond de nouveau (⋯) rend le Stylo.
// 6. Le surligneur au démarrage couvre une ligne écrite (13 px à l'écran à
//    100 %, sa propre épaisseur « Moyen »), le Stylo reste « Fin » ; « Épais »
//    choisi au Surligneur ne change pas le Stylo.
// 7. Ctrl+Z, puis Ctrl+Y, d'un agrandissement par un coin, d'un quart de
//    tour : l'image reste prise (barre d'actions, pastille), et le même coin
//    l'agrandit de nouveau sans la déplacer.
// 8. Le README ne dit plus que la copie de la trieuse « s'ouvrira sur la vue
//    de son original ».
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS. Les deux versions construites doivent être à
// jour (la batterie les refait d'abord). CORRECTIONS_PAGES, CORRECTIONS_UN :
// d'autres versions construites (celle d'avant la correction, construite dans
// retouches/verif-corr/avant, pour voir l'essai y échouer) ; CORRECTIONS_LIEUX
// = ligne ou cle : une partie seulement. Captures dans retouches/verif-corr.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/retouches/verif-corr/captures'
mkdirSync(D, { recursive: true })
const LIEUX = (process.env.CORRECTIONS_LIEUX ?? 'ligne,cle').split(',')
const seul = n => !process.env.CORRECTIONS_PARTIES || process.env.CORRECTIONS_PARTIES.split(',').includes(String(n))

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const ecartAngle = (a, b) => +((((a - b) % 360) + 540) % 360 - 180).toFixed(1)

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
const PAGES = process.env.CORRECTIONS_PAGES ?? R + '/dist-pages'
const serveur = createServer((q, r) => {
  const chemin = normalize(join(PAGES, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(PAGES) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => serveur.listen(0, '127.0.0.1', f))
const URLS = { ligne: `http://127.0.0.1:${serveur.address().port}/index.html`, cle: 'file://' + (process.env.CORRECTIONS_UN ?? R + '/dist/index.html') }

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
async function contexte(url, l, h, o = {}) {
  const c = await nav.newContext({ viewport: { width: l, height: h }, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  if (url.startsWith('file:')) await c.grantPermissions(['clipboard-read', 'clipboard-write'])
  else await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(url).origin })
  return c
}
async function ouvrir(ctx, url, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(url)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
  await p.waitForTimeout(800)
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
  const toucher = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 }] })
  const doigt = { nom: 'doigt', survol: async () => {}, bas: (x, y) => toucher('touchStart', x, y), va: (x, y) => toucher('touchMove', x, y), haut: () => toucher('touchEnd') }
  return { p, souris, wacom, doigt }
}
async function clic(p, ptr, x, y) {
  await ptr.survol(x, y); await p.waitForTimeout(40)
  await ptr.bas(x, y); await p.waitForTimeout(40); await ptr.haut(x, y); await p.waitForTimeout(250)
}
async function clicSur(p, ptr, selecteur) {
  const b = await p.locator(selecteur).first().boundingBox({ timeout: 3000 }).catch(() => null)
  if (!b) { ok(false, `(introuvable à l'écran : ${selecteur})`); return false }
  await clic(p, ptr, b.x + b.width / 2, b.y + b.height / 2)
  return true
}
async function trait(p, ptr, x0, y0, x1, y1, n = 16) {
  await ptr.survol(x0, y0); await p.waitForTimeout(30)
  await ptr.bas(x0, y0)
  for (let k = 1; k <= n; k++) { await ptr.va(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n + Math.sin(k / 2) * 6); await p.waitForTimeout(8) }
  await ptr.haut(x1, y1); await p.waitForTimeout(350)
}
async function glisser(p, ptr, a, b, pas = 16) {
  await ptr.survol(a.x, a.y); await p.waitForTimeout(80)
  await ptr.bas(a.x, a.y)
  for (let k = 1; k <= pas; k++) { await ptr.va(a.x + (b.x - a.x) * k / pas, a.y + (b.y - a.y) * k / pas); await p.waitForTimeout(12) }
  await p.waitForTimeout(60)
  await ptr.haut(b.x, b.y); await p.waitForTimeout(350)
}
async function tourner(p, ptr, q, c, deg, pas = 20) {
  const r = Math.hypot(q.x - c.x, q.y - c.y), a0 = Math.atan2(q.y - c.y, q.x - c.x)
  await ptr.survol(q.x, q.y); await p.waitForTimeout(60)
  await ptr.bas(q.x, q.y)
  let f = q
  for (let k = 1; k <= pas; k++) { const t = a0 + deg * Math.PI / 180 * k / pas; f = { x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) }; await ptr.va(f.x, f.y); await p.waitForTimeout(12) }
  await p.waitForTimeout(80)
  await ptr.haut(f.x, f.y); await p.waitForTimeout(350)
}

// ---------- Ce qu'on lit à l'écran ----------
const etat = p => p.evaluate(() => {
  const z = document.getElementById('zone')
  // (Adapté aux gains rapides du lot 16 : l'épaisseur en main se lit sur le
  // bouton de l'épaisseur, data-taille : « Fin », « Moyen », « Épais »)
  const sansBoutons = el => { const c = el.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return c.textContent.trim() }
  return { outil: z.dataset.outil, taille: document.querySelector('.barre-outils .bouton-epaisseur')?.dataset.taille ?? null,
    toast: [...document.querySelectorAll('.toast.visible')].map(sansBoutons).join(' | ') }
})
const LIRE = () => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let n = 0, sx = 0, sy = 0, nr = 0, rx = 0, ry = 0, x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1, encre = 0
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
    const i = (y * c.width + x) * 4, R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]
    const vert = G > 150 && R < 60 && B < 60, rouge = R > 180 && G < 60 && B < 60
    if (vert || rouge) { n++; sx += x; sy += y; if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y }
    if (rouge) { nr++; rx += x; ry += y }
    if (A > 200 && R < 90 && G < 90 && B < 140 && !vert && !rouge) encre++
  }
  if (!n || !nr) return { aire: 0, encre }
  const cx = sx / n, cy = sy / n
  return { x1: r.left + x1 / k, y1: r.top + y1 / k, x2: r.left + x2 / k, y2: r.top + y2 / k, cx: r.left + cx / k, cy: r.top + cy / k,
    angle: +(Math.atan2(ry / nr - cy, rx / nr - cx) * 180 / Math.PI).toFixed(1), aire: n * 4 / k / k, encre }
}
const lire = p => p.evaluate(LIRE)
/** Les taches blanches de la couche directe : les poignées du cadre (petits
 *  carrés des coins et des côtés) et la pastille (le plus grand disque) */
const POIGNEES = () => {
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
    if (n / k / k > 12) amas.push({ x: r.left + sx / n / k, y: r.top + sy / n / k, aire: n / k / k })
  }
  return amas.sort((a, b) => b.aire - a.aire)
}
const poignees = p => p.evaluate(POIGNEES)
const rect = (p, sel) => p.evaluate(s => {
  const el = document.querySelector(s)
  if (!el || el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null
  const r = el.getBoundingClientRect()
  return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null
}, sel)
const couvre = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
const autour = (q, r) => ({ l: q.x - r, r: q.x + r, t: q.y - r, b: q.y + r })
const barreVisible = p => p.evaluate(() => { const b = document.querySelector('.barre-actions'); return !!b && !b.hidden && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0 })

/** Une image verte, son coin haut gauche rouge (pour lire l'angle) */
const fabriquer = (p, l = 900, h = 600) => p.evaluate(([l, h]) => {
  const c = Object.assign(document.createElement('canvas'), { width: l, height: h }); const g = c.getContext('2d')
  g.fillStyle = '#00c000'; g.fillRect(0, 0, l, h); g.fillStyle = '#e00000'; g.fillRect(0, 0, l * 0.24, h * 0.25)
  return c.toDataURL('image/png').split(',')[1]
}, [l, h])
async function importer(p, ptr, comment, b64) {
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
    await p.evaluate(b64 => {
      const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0))
      const dt = new DataTransfer(); dt.items.add(new File([bin], 'enonce.png', { type: 'image/png' }))
      const z = document.getElementById('zone')
      for (const t of ['dragenter', 'dragover', 'drop']) z.dispatchEvent(new DragEvent(t, { bubbles: true, cancelable: true, dataTransfer: dt, clientX: 700, clientY: 400 }))
    }, b64)
  }
  await p.waitForFunction(() => document.querySelector('.toast.visible')?.textContent?.includes('Image posée'), null, { timeout: 10000 }).catch(() => {})
  await p.waitForTimeout(500)
}
/** Une page neuve, le Stylo en main (le bouton +, du pointeur) */
async function pageNeuve(p, ptr) {
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(80)
  await p.keyboard.press('p'); await p.waitForTimeout(100)
  await clicSur(p, ptr, '.barre-haut > .nouvelle-page'); await p.waitForTimeout(600)
}
/** Le menu ⋯ de ce qui est pris : le clic droit (le bouton du stylet) sur lui, puis ⋯ */
async function menuPlus(p, ptr, x, y) {
  await ptr.clicDroit(x, y); await p.waitForTimeout(350)
  return clicSur(p, ptr, '.panneau-forme .ligne button.plus').then(async r => { await p.waitForTimeout(200); return r })
}

for (const lieu of LIEUX) {
  const url = URLS[lieu], nom = lieu === 'ligne' ? 'en ligne' : 'hors ligne'
  console.log(`\n=== ${nom} : ${url}`)

  // =================================================================
  // 1. « Fixer en fond » rend l'outil qu'on avait
  if (seul(1)) {
    const ctx = await contexte(url, 1366, 768)
    const { p, souris, wacom } = await ouvrir(ctx, url, `${nom} 1`)
    ok(await p.evaluate(() => navigator.maxTouchPoints) === 0 && await p.evaluate(() => !('__app' in window) || !window.__app), `${nom} — pas d'écran tactile, pas de window.__app`)
    const b64 = await fabriquer(p)
    for (const ptr of [souris, wacom]) for (const comment of ['bouton', 'coller', 'deposer']) {
      const cas = `${nom}, ${ptr.nom}, ${comment === 'bouton' ? 'bouton Image' : comment === 'coller' ? 'Ctrl+V' : 'fichier déposé'}`
      await ptr.survol(1200, 650); await p.waitForTimeout(100)
      await importer(p, ptr, comment, b64)
      const e0 = await etat(p), a = await lire(p)
      await clicSur(p, ptr, '.toast.visible button.action'); await p.waitForTimeout(300)
      const e1 = await etat(p)
      await trait(p, ptr, a.cx - 150, a.cy + 40, a.cx + 150, a.cy + 60)
      const b = await lire(p)
      ok(e0.outil === 'selection' && e1.outil === 'stylo' && e1.toast.startsWith('Image fixée en fond : écrivez et entourez par-dessus.') && b.encre > a.encre + 20 && Math.abs(b.cx - a.cx) < 1,
        `${cas} : « Fixer en fond » du message rend le Stylo (${e0.outil} → ${e1.outil}) ; le trait sur l'image écrit (${a.encre} → ${b.encre} px d'encre) sans la déplacer`, { e0, e1, a, b })
      if (ptr === wacom && comment === 'bouton') await p.screenshot({ path: `${D}/${lieu}-1-fixer-trait.png` })
      await pageNeuve(p, ptr)
    }
    // Le menu ⋯ de l'image (le bouton du stylet sur elle, puis ⋯, « Fixer en fond »)
    await wacom.survol(1200, 650)
    await importer(p, wacom, 'bouton', b64)
    let a = await lire(p)
    await menuPlus(p, wacom, a.cx, a.cy)
    await clicSur(p, wacom, '.menu-plus .menu-item[data-action="fixer"]'); await p.waitForTimeout(300)
    let e = await etat(p)
    await trait(p, wacom, a.cx - 150, a.cy + 40, a.cx + 150, a.cy + 60)
    let b = await lire(p)
    ok(e.outil === 'stylo' && e.toast.includes('bouton du stylet dessus') && b.encre > a.encre + 20, `${nom} — le ⋯ de l'image qu'on vient d'importer, « Fixer en fond » : le Stylo revient, le trait écrit`, { e, a: a.encre, b: b.encre })
    // Depuis la Gomme : la Gomme revient
    await pageNeuve(p, wacom)
    await clicSur(p, wacom, '.barre-outils button[title^="Gomme"]'); await p.waitForTimeout(150)
    await wacom.survol(1200, 650)
    await importer(p, wacom, 'bouton', b64)
    await clicSur(p, wacom, '.toast.visible button.action'); await p.waitForTimeout(300)
    e = await etat(p)
    ok(e.outil === 'gomme' && !e.toast.includes('reprendre'), `${nom} — importée depuis la Gomme, fixée : la Gomme revient`, e)
    // La Sélection choisie (V après l'import) reste ; le message dit comment reprendre le Stylo
    await pageNeuve(p, wacom)
    await wacom.survol(1200, 650)
    await importer(p, wacom, 'bouton', b64)
    await p.keyboard.press('v'); await p.waitForTimeout(150)
    await clicSur(p, wacom, '.toast.visible button.action'); await p.waitForTimeout(300)
    e = await etat(p)
    ok(e.outil === 'selection' && e.toast.endsWith('« Détacher l\'image du fond ». P : reprendre le Stylo.'), `${nom} — la Sélection choisie (V) reste après « Fixer en fond » ; le message ajoute « P : reprendre le Stylo. »`, e)
    await p.keyboard.press('p'); await p.waitForTimeout(150)
    a = await lire(p)
    await trait(p, wacom, a.cx - 150, a.cy + 40, a.cx + 150, a.cy + 60)
    b = await lire(p)
    ok((await etat(p)).outil === 'stylo' && b.encre > a.encre + 20, `${nom} — … P, puis le trait écrit`, { a: a.encre, b: b.encre })
    await ctx.close()
  }

  // =================================================================
  // 2. Le message ne couvre ni les coins ni les côtés du cadre
  if (seul(2)) for (const [L, H] of [[1366, 657], [1280, 689]]) {
    const ctx = await contexte(url, L, H)
    const { p, souris, wacom } = await ouvrir(ctx, url, `${nom} 2 ${L}×${H}`)
    for (const [il, ih] of [[600, 850], [800, 800]]) for (const ptr of [wacom, souris]) {
      const cas = `${nom}, ${L}×${H}, image ${il}×${ih}, ${ptr.nom}`
      const b64 = await fabriquer(p, il, ih)
      await ptr.survol(L - 150, H - 60); await p.waitForTimeout(120)
      await importer(p, ptr, 'bouton', b64)
      await ptr.survol(L - 40, H - 30); await p.waitForTimeout(350)
      const a = await lire(p), t = await rect(p, '.toast.visible'), q = await poignees(p)
      const portee = ptr === wacom ? 12 : 10
      const coins = [[a.x1, a.y1], [a.x2, a.y1], [a.x2, a.y2], [a.x1, a.y2]].map(([x, y]) => ({ x, y }))
      const cotes = [0, 1, 2, 3].map(i => ({ x: (coins[i].x + coins[(i + 1) % 4].x) / 2, y: (coins[i].y + coins[(i + 1) % 4].y) / 2 }))
      const sous = [...coins, ...cotes].filter(c => couvre(t, autour(c, portee)))
      ok(t && q.length >= 9 && !sous.length && !q.some(c => couvre(t, autour(c, portee))), `${cas} : le message ne couvre ni les coins, ni les côtés, ni la pastille`, { t, sous, img: [a.x1, a.y1, a.x2, a.y2].map(Math.round), q: q.length })
      const el = await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e ? (e.closest('.toast') ? 'toast' : e.closest('#zone') ? 'zone' : e.tagName) : null }, { x: a.x2 - 2, y: a.y1 + 1 })
      // Le coin en haut à droite se tire : l'image s'agrandit, rien n'est fixé
      await glisser(p, ptr, { x: a.x2 - 1, y: a.y1 + 1 }, { x: a.x2 + 50, y: a.y1 - 30 })
      const b = await lire(p), e = await etat(p)
      ok(el === 'zone' && b.aire > a.aire * 1.05 && !e.toast.includes('fixée'), `${cas} : le coin en haut à droite est sur le tableau, et le tirer agrandit l'image (×${(b.aire / a.aire).toFixed(2)})`, { el, aire: [a.aire, b.aire], toast: e.toast })
      if (il === 600 && ptr === wacom) await p.screenshot({ path: `${D}/${lieu}-2-${L}x${H}-coin.png` })
      // Tournée de 50° (la pastille) : aucune poignée sous le message
      await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
      const pa = (await poignees(p))[0]
      if (pa) await tourner(p, ptr, pa, { x: a.cx, y: a.cy }, 50)
      await ptr.survol(L - 40, H - 30); await p.waitForTimeout(350)
      const c = await lire(p), t2 = await rect(p, '.toast.visible'), q2 = await poignees(p)
      ok(Math.abs(ecartAngle(c.angle, a.angle) - 50) <= 2 && q2.length >= 9 && (!t2 || !q2.some(k => couvre(t2, autour(k, portee)))),
        `${cas} : tournée de 50° (${ecartAngle(c.angle, a.angle)}°), aucune poignée sous le message`, { t2, q2: q2.map(k => [Math.round(k.x), Math.round(k.y)]) })
      for (let i = 0; i < 4 && (await lire(p)).aire > 0; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(250) }
      await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(150)
    }
    await ctx.close()
  }

  // =================================================================
  // 3. La touche de l'outil quitté, l'image lâchée d'un clic dans le vide
  if (seul(3)) {
    const ctx = await contexte(url, 1366, 768)
    const { p, wacom } = await ouvrir(ctx, url, `${nom} 3`)
    const b64 = await fabriquer(p)
    for (const [outil, choisir, touche, mot] of [['gomme', 'e', 'e', 'E : reprendre la Gomme.'], ['forme', 'c', 'c', 'C : reprendre les Formes.'], ['surligneur', 'h', 'h', 'H : reprendre le Surligneur.']]) {
      await p.keyboard.press(choisir); await p.waitForTimeout(150)
      await wacom.survol(1200, 650)
      await importer(p, wacom, 'bouton', b64)
      const e0 = await etat(p)
      await clic(p, wacom, 1250, 470); await p.waitForTimeout(250)   // l'image lâchée
      const lachee = !(await barreVisible(p))
      await p.keyboard.press(touche); await p.waitForTimeout(200)
      const e1 = await etat(p)
      ok(e0.toast === `Image posée : ses coins l'agrandissent, ↻ la tourne. ${mot}` && !e0.toast.includes('Échap') && lachee && e1.outil === outil,
        `${nom} — depuis ${outil} : « ${e0.toast} » ; l'image lâchée, la touche ${touche.toUpperCase()} rend l'outil (${e1.outil})`, { e0, e1, lachee })
      for (let i = 0; i < 4 && (await lire(p)).aire > 0; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(250) }
      await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(150)
    }
    await ctx.close()
  }

  // =================================================================
  // 4. Les mots, avant tout appui sur le tableau (écran tactile, tablette graphique)
  if (seul(4)) {
    for (const [qui, o] of [['doigt', { hasTouch: true }], ['wacom', {}]]) {
      const ctx = await contexte(url, 1180, 820, o)
      const ptrs = await ouvrir(ctx, url, `${nom} 4 ${qui}`)
      const p = ptrs.p, ptr = ptrs[qui]
      const b64 = await fabriquer(p)
      await importer(p, ptr, 'bouton', b64)
      const e0 = await etat(p)
      await clicSur(p, ptr, '.toast.visible button.action'); await p.waitForTimeout(400)
      const e1 = await etat(p)
      if (qui === 'doigt') ok(e0.toast.endsWith('Touchez le Stylo pour écrire de nouveau.') && e1.toast.includes('appui long dessus') && !/clic/i.test(e1.toast) && e1.outil === 'stylo',
        `${nom} — écran tactile, au doigt, premier geste : « Fixer en fond » dit « appui long dessus », jamais « clic » ; le Stylo revient`, { e0, e1 })
      else ok(e0.toast.endsWith('P : reprendre le Stylo.') && e1.toast.includes('bouton du stylet dessus') && e1.outil === 'stylo',
        `${nom} — tablette graphique, premier geste : « Fixer en fond » dit « bouton du stylet dessus » ; le Stylo revient`, { e0, e1 })
      await ctx.close()
    }
    // Un fichier déposé sur un écran tactile, rien n'a touché le tableau
    const ctx = await contexte(url, 1180, 820, { hasTouch: true })
    const { p } = await ouvrir(ctx, url, `${nom} 4 déposé`)
    const b64 = await fabriquer(p)
    await importer(p, null, 'deposer', b64)
    const e = await etat(p)
    ok(e.toast === 'Image posée : ses coins l\'agrandissent, ↻ la tourne. Touchez le Stylo pour écrire de nouveau.', `${nom} — un fichier déposé sur un écran tactile, premier geste : « Touchez le Stylo… », pas « P : … »`, e)
    await ctx.close()
  }

  // =================================================================
  // 5. « Détacher l'image du fond » depuis le Stylo
  if (seul(5)) {
    const ctx = await contexte(url, 1366, 768)
    const { p, wacom } = await ouvrir(ctx, url, `${nom} 5`)
    const b64 = await fabriquer(p)
    await wacom.survol(1200, 650)
    await importer(p, wacom, 'bouton', b64)
    await clicSur(p, wacom, '.toast.visible button.action'); await p.waitForTimeout(300)
    const a0 = await lire(p)
    ok((await etat(p)).outil === 'stylo', `${nom} — fixée : le Stylo`)
    await wacom.clicDroit(a0.cx, a0.cy); await p.waitForTimeout(400)
    await clicSur(p, wacom, '.menu-item[data-action="detacher-fond"]'); await p.waitForTimeout(400)
    await wacom.survol(1320, 740); await p.waitForTimeout(250)
    let e = await etat(p)
    ok(e.outil === 'selection' && e.toast === 'Image détachée du fond : elle se déplace de nouveau, ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.',
      `${nom} — détachée depuis le Stylo : la Sélection ; le message dit ↻ et « P : reprendre le Stylo. »`, e)
    const q = (await poignees(p))[0]
    if (q) await tourner(p, wacom, q, { x: a0.cx, y: a0.cy }, 30)
    const a1 = await lire(p)
    ok(Math.abs(ecartAngle(a1.angle, a0.angle) - 30) <= 2, `${nom} — … elle se tourne à la pastille (${ecartAngle(a1.angle, a0.angle)}°)`)
    await menuPlus(p, wacom, a1.cx, a1.cy)
    await clicSur(p, wacom, '.menu-plus .menu-item[data-action="fixer"]'); await p.waitForTimeout(300)
    e = await etat(p)
    await trait(p, wacom, a1.cx - 120, a1.cy, a1.cx + 120, a1.cy + 20)
    const a2 = await lire(p)
    ok(e.outil === 'stylo' && a2.encre > a1.encre + 20, `${nom} — … refixée (⋯) : le Stylo revient, le trait écrit`, { e, encre: [a1.encre, a2.encre] })
    await ctx.close()
  }

  // =================================================================
  // 6. Le surligneur au démarrage
  if (seul(6)) {
    const ctx = await contexte(url, 1366, 768)
    const { p, wacom } = await ouvrir(ctx, url, `${nom} 6`)
    await clicSur(p, wacom, '.barre-outils button[title^="Surligneur"]'); await p.waitForTimeout(200)
    const e0 = await etat(p)
    await trait(p, wacom, 300, 300, 1000, 300, 30)
    const ep = await p.evaluate(() => {
      const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
      const d = c.getContext('2d').getImageData(Math.round(900 * k), Math.round(260 * k), 1, Math.round(80 * k)).data
      let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20 && !(d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245)) n++
      return +(n / k).toFixed(1)
    })
    await clicSur(p, wacom, '.barre-outils button[title^="Stylo"]'); await p.waitForTimeout(150)
    const e1 = await etat(p)
    ok(e0.outil === 'surligneur' && e0.taille === 'Moyen' && ep >= 12 && e1.taille === 'Fin', `${nom} — au démarrage, le Surligneur montre « Moyen » et couvre une ligne (${ep} px à l'écran) ; le Stylo reste « Fin »`, { e0, ep, e1 })
    await clicSur(p, wacom, '.barre-outils button[title^="Surligneur"]'); await p.waitForTimeout(150)
    // (Adapté aux gains rapides du lot 16 : « Épais » est dans le menu du
    // bouton de l'épaisseur, qu'on ouvre d'abord)
    await clicSur(p, wacom, '.barre-outils .bouton-epaisseur'); await p.waitForTimeout(200)
    await clicSur(p, wacom, '.menu-epaisseur .menu-item[title="Épais"]'); await p.waitForTimeout(150)
    const e2 = await etat(p)
    await clicSur(p, wacom, '.barre-outils button[title^="Stylo"]'); await p.waitForTimeout(150)
    const e3 = await etat(p)
    ok(e2.taille === 'Épais' && e3.taille === 'Fin', `${nom} — « Épais » au Surligneur ne change pas le Stylo (${e3.taille})`, { e2, e3 })
    await ctx.close()
  }

  // =================================================================
  // 7. Ctrl+Z et Ctrl+Y d'une transformation : l'image reste prise
  if (seul(7)) {
    const ctx = await contexte(url, 1366, 768)
    const { p, souris, wacom } = await ouvrir(ctx, url, `${nom} 7`)
    const b64 = await fabriquer(p)
    for (const ptr of [souris, wacom]) {
      await ptr.survol(1200, 650)
      await importer(p, ptr, 'bouton', b64)
      const a = await lire(p)
      await glisser(p, ptr, { x: a.x2, y: a.y2 }, { x: a.x2 + 60, y: a.y2 + 40 })
      const b = await lire(p)
      await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
      await ptr.survol(1300, 730); await p.waitForTimeout(200)
      const c = await lire(p), barre = await barreVisible(p), q = (await poignees(p)).length
      ok(b.aire > a.aire * 1.1 && Math.abs(c.aire / a.aire - 1) < 0.02 && barre && q >= 9, `${nom}, ${ptr.nom} — agrandie par un coin (×${(b.aire / a.aire).toFixed(2)}), Ctrl+Z : elle reste prise (barre d'actions, ${q} poignées)`, { barre, q })
      await glisser(p, ptr, { x: c.x2, y: c.y2 }, { x: c.x2 + 30, y: c.y2 + 20 })
      const d = await lire(p)
      ok(d.aire > c.aire * 1.05 && Math.abs((d.x1 - c.x1)) < 2 && Math.abs(d.y1 - c.y1) < 2, `${nom}, ${ptr.nom} — … le même coin l'agrandit de nouveau (×${(d.aire / c.aire).toFixed(2)}) sans la déplacer`, { c, d })
      await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
      await p.keyboard.press('Control+y'); await p.waitForTimeout(400)
      const e = await lire(p)
      ok(Math.abs(e.aire / d.aire - 1) < 0.02 && await barreVisible(p), `${nom}, ${ptr.nom} — Ctrl+Z puis Ctrl+Y : refaite, elle reste prise`)
      // Un quart de tour (⋯), Ctrl+Z
      await menuPlus(p, ptr, e.cx, e.cy)
      await clicSur(p, ptr, '.menu-plus .menu-item[data-action="quart-droite"]'); await p.waitForTimeout(400)
      const f = await lire(p)
      await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
      await ptr.survol(1300, 730); await p.waitForTimeout(200)
      const g = await lire(p)
      // (le menu complet, d'où vient le quart de tour, reste ouvert : la barre
      // d'actions ne paraît qu'une fois fermé)
      const menuOuvert = !!(await rect(p, '.panneau-forme'))
      ok(Math.abs(ecartAngle(f.angle, e.angle) - 90) <= 1 && Math.abs(ecartAngle(g.angle, e.angle)) <= 0.5 && (await barreVisible(p) || menuOuvert) && (await poignees(p)).length >= 9,
        `${nom}, ${ptr.nom} — un quart de tour, Ctrl+Z : 0°, elle reste prise (ses poignées, ${menuOuvert ? 'son menu complet' : 'sa barre d\'actions'})`, { e, f, g, barre: await barreVisible(p), menuOuvert, q: (await poignees(p)).length })
      await pageNeuve(p, ptr)
    }
    await ctx.close()
  }
}

// 8. Le README
if (seul(8)) {
  const readme = readFileSync(R + '/README.md', 'utf-8')
  ok(!readme.includes('vue de son original') && readme.includes('La copie s\'ouvrira au centre de son original, à 100 %'), 'README — la copie de la trieuse s\'ouvre « au centre de son original, à 100 % », plus « sur la vue de son original »')
  ok(!readme.includes('**Échap deux fois** l\'outil d\'avant'), 'README — l\'import ne promet plus « Échap deux fois » pour l\'outil d\'avant')
}

await nav.close()
serveur.close()
if (erreurs.length) { echecs++; console.log('✗ ÉCHEC erreurs JS :', erreurs.slice(0, 10)) } else console.log('✓ aucune erreur JS')
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
