// ESSAI DE LA ROTATION D'UNE IMAGE IMPORTÉE (retouches après le lot 5,
// demande B du professeur : « la rotation sur une image ne fonctionne pas »).
// L'enquête (rotation/conclusion : d1 à d4) l'a reproduit : importée au Stylo
// (le bouton Image, Ctrl+V, un fichier déposé), l'image paraissait prise (son
// cadre en tirets) mais n'avait ni coins ni pastille ↻ (les poignées ne
// vivent qu'à l'outil Sélection), et le geste en rond écrivait de l'encre.
// Ce qui est vérifié, comme le professeur, dans la VERSION CONSTRUITE (la
// version en ligne, dist-pages servie en http par cet essai, puis la version hors ligne,
// dist/index.html en file://), sans window.__app, sans écran tactile
// (navigator.maxTouchPoints = 0), en 1366 × 768 et en 1024 × 768 :
// (B1) 3 façons d'importer × la souris et le stylet de la tablette graphique
//      (CDP pointerType 'pen', qui survole) × rien de plus / la touche V / le
//      bouton Sélection touché du pointeur : l'outil Sélection juste après
//      l'import, la pastille visible (lue dans les pixels de la couche
//      directe), le curseur « grab » sur elle puis « grabbing » en tournant,
//      l'image tournée de 40 ± 1° (lue dans les pixels : son coin rouge vu
//      de son centre), sans encre ajoutée, et Ctrl+Z la remet à 0° ; le
//      message de l'import et son « Fixer en fond » ;
//      puis P, le bouton Stylo touché au stylet, Échap deux fois : le Stylo
//      revient, et un trait sur l'image écrit sans la déplacer ;
// (B2) le message, la barre d'actions et la pastille ne se couvrent pas,
//      juste après l'import et à 177 % (Ctrl + molette) ;
// (B3) un écran tactile (hasTouch) : la souris, puis un doigt sur la pastille
//      DESSINÉE pour la souris (9 px sous son centre : avant, le côté du haut
//      déformait l'image) ; un doigt, puis le crayon (sans survol) sur celle
//      dessinée pour le doigt : l'image tourne, sans se déformer ;
// (B4) au Stylo, le bouton du stylet sur l'image ouvre le menu complet ; ⋯,
//      « Tourner d'un quart de tour à droite » (+90°), Ctrl+Z, « … à
//      gauche » (−90°), Ctrl+Z : 0°, sans encre ;
// (B5) « Fixer en fond » (le bouton du message) : le message dit qu'on la
//      tourne après « Détacher l'image du fond ».
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS. Les deux versions construites doivent être à
// jour (la batterie les refait d'abord). Captures dans retouches/rotation.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/retouches/rotation'
mkdirSync(D, { recursive: true })
// (ROTATION_LIEUX=ligne ou cle, ROTATION_TAILLES=1366 : une partie seulement ;
// ROTATION_PAGES, ROTATION_UN : d'autres versions construites, pour voir
// l'essai échouer sur celle d'avant ces retouches)
const LIEUX = (process.env.ROTATION_LIEUX ?? 'ligne,cle').split(',')
const TAILLES = (process.env.ROTATION_TAILLES ?? '1366,1024').split(',').filter(Boolean).map(Number)
// (ROTATION_TACTILE=0 : sans l'écran tactile ; ROTATION_TAILLES= (vide) : lui seul)
const TACTILE = process.env.ROTATION_TACTILE !== '0'

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const ecartAngle = (a, b) => +((((a - b) % 360) + 540) % 360 - 180).toFixed(1)

// La version en ligne, servie ici (comme GitHub Pages : des fichiers statiques)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
const PAGES = process.env.ROTATION_PAGES ?? R + '/dist-pages'
const serveur = createServer((q, r) => {
  const chemin = normalize(join(PAGES, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(PAGES) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => serveur.listen(0, '127.0.0.1', f))
const URLS = { ligne: `http://127.0.0.1:${serveur.address().port}/index.html`, cle: 'file://' + (process.env.ROTATION_UN ?? R + '/dist/index.html') }

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
  // Les pointeurs : la souris de Playwright ; le stylet de la tablette
  // graphique par CDP (il survole avant de toucher ; son bouton latéral est
  // un clic droit) ; le doigt par CDP
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
  // Le crayon de l'iPad, qui ne survole pas : il se pose d'un coup
  const crayon = {
    nom: 'crayon', bas: (x, y) => pen('mousePressed', x, y, true), va: (x, y) => pen('mouseMoved', x, y, true), haut: (x, y) => pen('mouseReleased', x, y, false),
  }
  const toucher = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 }] })
  const doigt = { nom: 'doigt', bas: (x, y) => toucher('touchStart', x, y), va: (x, y) => toucher('touchMove', x, y), haut: () => toucher('touchEnd') }
  return { p, cdp, souris, wacom, crayon, doigt }
}
/** Un clic du pointeur sur ce point (il survole d'abord, comme en classe) */
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

// ---------- Ce qu'on lit à l'écran (aucun window.__app) ----------
const etat = p => p.evaluate(() => {
  const z = document.getElementById('zone')
  return { outil: z.dataset.outil, curseur: z.style.cursor || getComputedStyle(z).cursor, zoom: (document.querySelector('.zoom-texte')?.textContent ?? '').replace(/\s/g, ' '),
    toast: [...document.querySelectorAll('.toast.visible')].map(t => t.textContent.trim()).join(' | ') }
})
/** L'image dans la scène (900 × 600, verte, son coin haut gauche rouge) : sa
 *  boîte à l'écran, son centre, l'angle de son coin rouge vu du centre, son
 *  aire, et l'encre (des pixels sombres hors d'elle) */
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
/** La pastille ↻ dans la couche directe : le plus grand disque blanc opaque
 *  (les coins du cadre sont de petits carrés blancs), son centre à l'écran,
 *  son aire, et les pixels bleus (#3b6fb6) de son anneau et de sa flèche */
const PASTILLE = () => {
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
  const rr = Math.round(18 * k), x0 = Math.round(mieux.x), y0 = Math.round(mieux.y)
  let bleus = 0
  for (let y = y0 - rr; y <= y0 + rr; y++) for (let x = x0 - rr; x <= x0 + rr; x++) {
    if (x < 0 || y < 0 || x >= W || y >= H) continue
    const i = (y * W + x) * 4
    if (d[i + 3] > 150 && Math.abs(d[i] - 59) < 30 && Math.abs(d[i + 1] - 111) < 30 && Math.abs(d[i + 2] - 182) < 30) bleus++
  }
  return { x: r.left + mieux.x / k, y: r.top + mieux.y / k, aire: mieux.n / k / k, bleus: bleus / k / k }
}
const pastille = p => p.evaluate(PASTILLE)
const rect = (p, sel) => p.evaluate(s => {
  const el = document.querySelector(s)
  if (!el || el.hidden || getComputedStyle(el).display === 'none' || getComputedStyle(el).visibility === 'hidden') return null
  const r = el.getBoundingClientRect()
  return r.width && r.height ? { l: r.left, t: r.top, r: r.right, b: r.bottom } : null
}, sel)
const couvre = (a, b) => !!a && !!b && a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t
const disque = (q, r = 14) => q && { l: q.x - r, r: q.x + r, t: q.y - r, b: q.y + r }

/** Une image verte 900 × 600, son coin haut gauche rouge (pour lire l'angle) */
const fabriquer = p => p.evaluate(() => {
  const c = Object.assign(document.createElement('canvas'), { width: 900, height: 600 }); const g = c.getContext('2d')
  g.fillStyle = '#00c000'; g.fillRect(0, 0, 900, 600); g.fillStyle = '#e00000'; g.fillRect(0, 0, 220, 150)
  return c.toDataURL('image/png').split(',')[1]
})
/** Importer l'image : le bouton Image (touché du pointeur), Ctrl+V, ou le fichier déposé sur le tableau */
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
/** Tourner de deg degrés : appui sur q, un arc autour de c en 20 pas ; ce que dit l'écran pendant */
async function tourner(p, ptr, q, c, deg) {
  const R = Math.hypot(q.x - c.x, q.y - c.y), a0 = Math.atan2(q.y - c.y, q.x - c.x)
  await ptr.bas(q.x, q.y)
  let f = q
  for (let k = 1; k <= 20; k++) { const t = a0 + deg * Math.PI / 180 * k / 20; f = { x: c.x + R * Math.cos(t), y: c.y + R * Math.sin(t) }; await ptr.va(f.x, f.y); await p.waitForTimeout(12) }
  await p.waitForTimeout(80)
  const pendant = await etat(p)
  await ptr.haut(f.x, f.y); await p.waitForTimeout(350)
  return pendant
}
/** Revenir au départ : l'image retirée (Ctrl+Z de son import), le Stylo en main, rien dessous */
async function vider(p) {
  for (let i = 0; i < 4 && (await lire(p)).aire > 0; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(250) }
  await p.keyboard.press('Escape'); await p.waitForTimeout(80)
  await p.keyboard.press('p'); await p.waitForTimeout(150)
}

// =====================================================================
for (const lieu of LIEUX) for (const L of TAILLES) {
  const url = URLS[lieu], nom = `${lieu === 'ligne' ? 'en ligne' : 'hors ligne'} ${L}×768`
  console.log(`\n=== ${nom} : ${url}`)
  const ctx = await contexte(url, L, 768)
  const { p, souris, wacom } = await ouvrir(ctx, url, nom)
  ok(await p.evaluate(() => navigator.maxTouchPoints) === 0 && await p.evaluate(() => !('__app' in window) || !window.__app), `${nom} — pas d'écran tactile, pas de window.__app`)
  ok((await etat(p)).outil === 'stylo', `${nom} — au démarrage, le Stylo`)
  const b64 = await fabriquer(p)

  // ---------- B1 : 3 façons d'importer × 2 pointeurs × 3 façons de rester / prendre la Sélection ----------
  for (const ptr of [souris, wacom]) for (const comment of ['bouton', 'coller', 'deposer']) for (const outil of ['rien', 'v', 'bouton-sel']) {
    const cas = `${nom}, ${ptr.nom}, ${comment === 'bouton' ? 'bouton Image' : comment === 'coller' ? 'Ctrl+V' : 'fichier déposé'}, ${outil === 'rien' ? 'rien de plus' : outil === 'v' ? 'touche V' : 'bouton Sélection'}`
    await ptr.survol(L - 160, 650); await p.waitForTimeout(120)
    await importer(p, ptr, comment, b64)
    const e0 = await etat(p), v0 = await lire(p)
    ok(e0.outil === 'selection' && v0.aire > 50000, `${cas} : l'outil Sélection juste après l'import`, { e0, v0 })
    ok(e0.toast.includes('Image posée : ses coins l\'agrandissent, ↻ la tourne. P : reprendre le Stylo.') && e0.toast.includes('Fixer en fond'),
      `   … le message : « Image posée : ses coins l'agrandissent, ↻ la tourne. P : reprendre le Stylo. », et « Fixer en fond »`, e0.toast)
    // Le message, la barre d'actions et la pastille ne se couvrent pas (le pointeur loin de l'image)
    let q = await pastille(p)
    const toast = await rect(p, '.toast.visible'), barre = await rect(p, '.barre-actions')
    const ecart = ptr === wacom ? 28 : 24
    ok(q && q.aire > 150 && q.bleus > 20 && Math.abs(q.x - v0.cx) < 3 && Math.abs(q.y - (v0.y1 - ecart)) < 4, `   … la pastille ↻ se voit, ${ecart} px au-dessus du milieu de l'image`, { q, v0 })
    ok(toast && barre && !couvre(toast, barre) && !couvre(toast, disque(q)) && !couvre(barre, disque(q)), '   … le message, la barre d\'actions et la pastille ne se couvrent pas', { toast, barre, q })
    if (outil === 'v') { await p.keyboard.press('v'); await p.waitForTimeout(250) }
    if (outil === 'bouton-sel') { await clicSur(p, ptr, 'button[title^="Sélectionner et déplacer"]'); await p.waitForTimeout(200) }
    // (sans pastille visible, comme avant ces retouches : là où elle serait)
    const attendue = { x: v0.cx, y: v0.y1 - ecart }
    await ptr.survol((q ?? attendue).x + 120, (q ?? attendue).y - 10); await p.waitForTimeout(80)
    q = (await pastille(p)) ?? attendue
    await ptr.survol(q.x, q.y); await p.waitForTimeout(150)
    const e1 = await etat(p)
    ok(e1.outil === 'selection' && e1.curseur === 'grab', `   … sur la pastille, le curseur « grab »`, e1)
    const pendant = await tourner(p, ptr, q, { x: v0.cx, y: v0.cy }, 40)
    const v1 = await lire(p), da = ecartAngle(v1.angle, v0.angle)
    ok(pendant.curseur === 'grabbing', '   … « grabbing » pendant qu\'on tourne', pendant)
    ok(Math.abs(da - 40) <= 1 && v1.encre === v0.encre && Math.abs(v1.aire / v0.aire - 1) < 0.03, `   … l'image a tourné de 40 ± 1° (${da}°), sans encre ajoutée, sans se déformer`, { v0, v1 })
    await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
    const v2 = await lire(p)
    ok(Math.abs(ecartAngle(v2.angle, v0.angle)) <= 0.5 && v2.encre === v0.encre, '   … Ctrl+Z la remet à 0°', { v0, v2 })
    if (ptr === wacom && outil === 'rien') await p.screenshot({ path: `${D}/${lieu}-${L}-${comment}-wacom.png` })
    await vider(p)
  }

  // ---------- B1 : reprendre le Stylo (P, le bouton Stylo au stylet, Échap deux fois), puis écrire sur l'image ----------
  for (const voie of ['P', 'bouton Stylo', 'Échap deux fois']) {
    await wacom.survol(L - 160, 650); await p.waitForTimeout(100)
    await importer(p, wacom, 'bouton', b64)
    const o1 = (await etat(p)).outil
    if (voie === 'P') await p.keyboard.press('p')
    if (voie === 'Échap deux fois') { await p.keyboard.press('Escape'); await p.waitForTimeout(100); await p.keyboard.press('Escape') }
    if (voie === 'bouton Stylo') await clicSur(p, wacom, '.barre-outils button[title^="Stylo"]')
    await p.waitForTimeout(250)
    const o2 = (await etat(p)).outil, a = await lire(p)
    // Un trait au stylet en plein milieu de l'image
    const x0 = a.cx - 80, y0 = a.cy
    await wacom.bas(x0, y0)
    for (let k = 1; k <= 16; k++) await wacom.va(x0 + k * 10, y0 + Math.sin(k / 2) * 18)
    await wacom.haut(x0 + 160, y0); await p.waitForTimeout(400)
    const b = await lire(p)
    ok(o1 === 'selection' && o2 === 'stylo' && b.encre > a.encre + 20 && Math.abs(b.aire / a.aire - 1) < 0.02 && Math.abs(b.cx - a.cx) < 1 && Math.abs(b.cy - a.cy) < 1,
      `${nom}, ${voie} : le Stylo revient (${o1} → ${o2}) ; un trait au stylet sur l'image écrit et ne la déplace pas`, { o1, o2, a, b })
    await vider(p)
  }

  // ---------- B2 : à 177 % (Ctrl + molette), le message, la barre d'actions et la pastille ne se couvrent pas ----------
  for (const ptr of [souris, wacom]) {
    await ptr.survol(L - 160, 650); await p.waitForTimeout(100)
    await importer(p, ptr, 'bouton', b64)
    for (let k = 0; k < 6; k++) { await p.mouse.move(L / 2, 384); await p.keyboard.down('Control'); await p.mouse.wheel(0, -100); await p.keyboard.up('Control'); await p.waitForTimeout(100) }
    // Le pointeur s'éloigne de l'image (le stylet survole : ses poignées)
    await ptr.survol(L - 40, 740); await p.waitForTimeout(500)
    const e = await etat(p), q = await pastille(p), toast = await rect(p, '.toast.visible'), barre = await rect(p, '.barre-actions')
    ok(e.zoom === '177 %' && e.toast.includes('Image posée'), `${nom}, ${ptr.nom} : à 177 %, le message de l'import est encore là`, e)
    ok(q && q.bleus > 20 && toast && barre && !couvre(toast, barre) && !couvre(toast, disque(q)) && !couvre(barre, disque(q)),
      '   … le message, la barre d\'actions et la pastille (en bas de ce qu\'on voit) ne se couvrent pas', { q, toast, barre })
    if (ptr === wacom) await p.screenshot({ path: `${D}/${lieu}-${L}-177.png` })
    await p.keyboard.press('Control+0'); await p.waitForTimeout(700)
    await vider(p)
  }

  // ---------- B4 : au Stylo, le bouton du stylet ouvre le menu complet ; « Tourner d'un quart de tour » ----------
  await wacom.survol(L - 160, 650); await p.waitForTimeout(100)
  await importer(p, wacom, 'bouton', b64)
  await p.keyboard.press('p'); await p.waitForTimeout(200)
  const a0 = await lire(p)
  await wacom.clicDroit(a0.cx, a0.cy + 40); await p.waitForTimeout(350)
  const menu = await rect(p, '.panneau-forme')
  await clicSur(p, wacom, '.panneau-forme .ligne button.plus'); await p.waitForTimeout(200)
  const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-plus .menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action ?? b.textContent.trim()))
  ok(menu && (await etat(p)).outil === 'stylo' && entrees.includes('quart-gauche') && entrees.includes('quart-droite') && !entrees.includes('redresser'),
    `${nom} — au Stylo, le bouton du stylet sur l'image : le menu complet ; son ⋯ a « Tourner d'un quart de tour à gauche » et « … à droite » (pas « Remettre droit » : elle est droite)`, entrees)
  const texte = await p.evaluate(() => [...document.querySelectorAll('.menu-plus .menu-item[data-action^="quart"]')].map(b => b.querySelector('.libelle').firstChild.textContent))
  ok(JSON.stringify(texte) === JSON.stringify(['Tourner d\'un quart de tour à gauche', 'Tourner d\'un quart de tour à droite']), '   … leurs libellés', texte)
  await clicSur(p, wacom, '.menu-plus .menu-item[data-action="quart-droite"]'); await p.waitForTimeout(400)
  let a1 = await lire(p)
  ok(Math.abs(ecartAngle(a1.angle, a0.angle) - 90) <= 1 && a1.encre === a0.encre && Math.abs(a1.cx - a0.cx) < 2 && Math.abs(a1.cy - a0.cy) < 2,
    `   … « à droite » : +90° (${ecartAngle(a1.angle, a0.angle)}°) autour de son centre, sans encre`, { a0, a1 })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  let a2 = await lire(p)
  ok(Math.abs(ecartAngle(a2.angle, a0.angle)) <= 0.5, '   … Ctrl+Z : 0° (une étape)', a2)
  await wacom.clicDroit(a0.cx, a0.cy + 40); await p.waitForTimeout(350)
  await clicSur(p, wacom, '.panneau-forme .ligne button.plus'); await p.waitForTimeout(200)
  await clicSur(p, wacom, '.menu-plus .menu-item[data-action="quart-gauche"]'); await p.waitForTimeout(400)
  a1 = await lire(p)
  ok(Math.abs(ecartAngle(a1.angle, a0.angle) + 90) <= 1 && a1.encre === a0.encre, `   … « à gauche » : −90° (${ecartAngle(a1.angle, a0.angle)}°)`, { a0, a1 })
  // Tournée, son ⋯ a aussi « Remettre droit »
  await wacom.clicDroit(a1.cx, a1.cy); await p.waitForTimeout(350)
  await clicSur(p, wacom, '.panneau-forme .ligne button.plus'); await p.waitForTimeout(200)
  const e2 = await p.evaluate(() => [...document.querySelectorAll('.menu-plus .menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action ?? ''))
  ok(e2.includes('quart-gauche') && e2.includes('redresser'), '   … tournée, son ⋯ a aussi « Remettre droit »', e2)
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  a2 = await lire(p)
  ok(Math.abs(ecartAngle(a2.angle, a0.angle)) <= 0.5, '   … Ctrl+Z : 0°', a2)

  // ---------- B5 : « Fixer en fond » (le bouton du message de l'import) ----------
  await vider(p)
  await wacom.survol(L - 160, 650); await p.waitForTimeout(100)
  await importer(p, wacom, 'bouton', b64)
  await clicSur(p, wacom, '.toast.visible button.action')
  await p.waitForTimeout(300)
  const ef = await etat(p)
  ok(ef.toast.includes('Image fixée en fond : écrivez et entourez par-dessus. Pour la tourner ou la déplacer : bouton du stylet dessus, puis « Détacher l\'image du fond ».'),
    `${nom} — « Fixer en fond » : le message dit qu'on la tourne après « Détacher l'image du fond » (dans les mots du stylet)`, ef.toast)
  await vider(p)
  await ctx.close()
}

// =====================================================================
// B3 : un écran tactile (un ordinateur à écran tactile, un TNI, un iPad)
for (const lieu of TACTILE ? LIEUX : []) {
  const url = URLS[lieu], nom = `${lieu === 'ligne' ? 'en ligne' : 'hors ligne'}, écran tactile`
  console.log(`\n=== ${nom}`)
  const ctx = await contexte(url, 1366, 768, { hasTouch: true })
  const { p, souris, doigt, crayon } = await ouvrir(ctx, url, nom)
  const b64 = await fabriquer(p)
  await souris.survol(1200, 650); await p.waitForTimeout(100)
  await importer(p, souris, 'bouton', b64)
  await souris.survol(1100, 120); await p.waitForTimeout(250)
  const v0 = await lire(p), q = await pastille(p)
  ok((await etat(p)).outil === 'selection' && q && Math.abs(q.y - (v0.y1 - 24)) < 4, `${nom} — importée à la souris : la Sélection, la pastille de la souris (24 px au-dessus)`, { q, v0 })
  // Un doigt 9 px sous le centre de la pastille dessinée
  const qs = q ?? { x: v0.cx, y: v0.y1 - 24 }
  await tourner(p, doigt, { x: qs.x, y: qs.y + 9 }, { x: v0.cx, y: v0.cy }, 40)
  let v1 = await lire(p)
  ok(Math.abs(ecartAngle(v1.angle, v0.angle) - 40) <= 1.5 && Math.abs(v1.aire / v0.aire - 1) < 0.03 && v1.encre === v0.encre,
    `${nom} — la souris, puis un doigt sur la pastille dessinée (9 px sous son centre) : l'image tourne (${ecartAngle(v1.angle, v0.angle)}°), sans se déformer`, { v0, v1 })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  // Un doigt reprend l'image (la pastille du doigt, 36 px au-dessus), puis le crayon, sans survol, 12 px au-dessus de son centre
  await doigt.bas(v0.cx, v0.cy + 60); await p.waitForTimeout(40); await doigt.haut(); await p.waitForTimeout(450)
  const qd = await pastille(p)
  ok(qd && Math.abs(qd.y - (v0.y1 - 36)) < 4, `${nom} — un doigt reprend l'image : la pastille du doigt (36 px au-dessus)`, { qd, v0 })
  const qc = qd ?? { x: v0.cx, y: v0.y1 - 36 }
  await tourner(p, crayon, { x: qc.x, y: qc.y - 12 }, { x: v0.cx, y: v0.cy }, 40)
  v1 = await lire(p)
  ok(Math.abs(ecartAngle(v1.angle, v0.angle) - 40) <= 1.5 && Math.abs(v1.aire / v0.aire - 1) < 0.03 && v1.encre === v0.encre,
    `${nom} — le doigt, puis le crayon (sans survol) sur la pastille dessinée (12 px au-dessus de son centre) : l'image tourne (${ecartAngle(v1.angle, v0.angle)}°), sans se déformer`, { v0, v1 })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  const v2 = await lire(p)
  ok(Math.abs(ecartAngle(v2.angle, v0.angle)) <= 0.5, `${nom} — Ctrl+Z : 0°`, v2)
  await p.screenshot({ path: `${D}/${lieu}-tactile.png` })
  await ctx.close()
}

await nav.close()
serveur.close()
if (erreurs.length) { echecs++; console.log('✗ ÉCHEC erreurs JS :', erreurs.slice(0, 10)) } else console.log('✓ aucune erreur JS')
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
