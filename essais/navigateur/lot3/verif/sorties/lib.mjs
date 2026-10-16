// Outils communs des vérifications « sorties » (PDF, image copiée)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs'
export const S = `${RACINE_ESSAIS}`
export const V = S + '/lot3/verif/sorties'
export const R = `${RACINE_DEPOT}`
export const URL0 = 'http://localhost:5173/'
export const nav = await chromium.launch()
export const erreurs = []
export function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
export const NOTER = () => {
  const a = window.__app, m = a.ui.message.bind(a.ui)
  window.__msgs = []
  a.ui.message = (t, x, d) => { window.__msgs.push({ t, actions: x ? (Array.isArray(x) ? x : [x]).map(y => y.libelle) : [] }); return m(t, x, d) }
  a.reconnaissance = false
}
export async function pret(page) {
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(300)
  }
  await page.evaluate(NOTER)
}
export async function ouvrir(o = {}, nom = 'page', url = URL0, perms = ['clipboard-read', 'clipboard-write']) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  if (perms) await ctx.grantPermissions(perms)
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(url)
  if (url === URL0) await pret(page)
  return { ctx, page }
}
export const msgs = page => page.evaluate(() => (window.__msgs || []).map(m => ({ ...m, t: m.t.replace(/[  ]/g, ' ') })))
export async function exporter(page, dossier, nom, declencher, o = {}) {
  await declencher()
  await page.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 3000 }).catch(() => {})
  if (o.choisir) await o.choisir()
  const dl = page.waitForEvent('download', { timeout: o.attente ?? 120000 }).catch(() => null)
  const t0 = Date.now()
  await page.click('dialog[open] [data-a="exporter"]')
  if (o.pendant) await o.pendant()
  const d = await dl
  if (!d) return { fichier: null }
  const fichier = `${dossier}/${nom}.pdf`
  await d.saveAs(fichier)
  await page.waitForTimeout(250)
  return { fichier, propose: d.suggestedFilename(), ms: Date.now() - t0 }
}
export function info(f) {
  const r = spawnSync('pdfinfo', [f])
  const t = r.stdout.toString()
  const taille = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(t)
  return { texte: t, err: r.stderr.toString(), code: r.status, pages: Number(/Pages:\s+(\d+)/.exec(t)?.[1]), l: Number(taille?.[1]), h: Number(taille?.[2]), titre: /Title:\s+(.*)/.exec(t)?.[1]?.trim(), octets: statSync(f).size }
}
export function infoPages(f) {
  const r = spawnSync('pdfinfo', ['-f', '1', '-l', '9999', f]).stdout.toString()
  return [...r.matchAll(/Page\s+(\d+) size:\s+([\d.]+) x ([\d.]+) pts/g)].map(m => ({ p: +m[1], l: +m[2], h: +m[3] }))
}
export function images(f) {
  return execFileSync('pdfimages', ['-list', f]).toString().trim().split('\n').slice(2).map(l => {
    const c = l.trim().split(/\s+/)
    return { page: +c[0], l: +c[3], h: +c[4], couleur: c[5], enc: c[8], xppi: +c[12], yppi: +c[13], taille: c[14] }
  })
}
export function rendre(f, ppp, prefixe) {
  const dir = prefixe.replace(/\/[^/]*$/, ''), base = prefixe.replace(/^.*\//, '')
  for (const x of readdirSync(dir)) if (x.startsWith(base + '-') && x.endsWith('.png')) rmSync(dir + '/' + x)
  const r = spawnSync('pdftoppm', ['-r', String(ppp), '-png', f, prefixe])
  if (r.status !== 0) throw new Error('pdftoppm: ' + r.stderr.toString())
  return { fichiers: readdirSync(dir).filter(x => x.startsWith(base + '-') && x.endsWith('.png')).sort().map(x => `${dir}/${x}`), err: r.stderr.toString() }
}
export const b64 = f => readFileSync(f).toString('base64')
export async function analyseur() {
  const ana = await (await nav.newContext()).newPage()
  await ana.setContent('<html><body></body></html>')
  await ana.evaluate(() => {
    window.lire = async (b, type = 'image/png') => {
      const img = new Image(); img.src = `data:${type};base64,` + b; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0)
      return { l: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }
    }
    window.lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
    /** Les rangées (y) qui contiennent un pixel passant le test, en suites */
    window.rangees = async (b, test, r) => {
      const { l, h, d } = await window.lire(b), f = new Function('r', 'g', 'b', 'return ' + test)
      r = r || { x0: 0, x1: l, y0: 0, y1: h }
      const runs = []; let debut = -1
      for (let y = r.y0; y < r.y1; y++) {
        let ok = false
        for (let x = r.x0; x < r.x1 && !ok; x++) { const i = (y * l + x) * 4; if (f(d[i], d[i + 1], d[i + 2])) ok = true }
        if (ok && debut < 0) debut = y
        if (!ok && debut >= 0) { runs.push([debut, y]); debut = -1 }
      }
      if (debut >= 0) runs.push([debut, r.y1])
      return { l, h, runs }
    }
    window.colonnes = async (b, test, r) => {
      const { l, h, d } = await window.lire(b), f = new Function('r', 'g', 'b', 'return ' + test)
      r = r || { x0: 0, x1: l, y0: 0, y1: h }
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, n = 0
      for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const i = (y * l + x) * 4; if (f(d[i], d[i + 1], d[i + 2])) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) } }
      return { l, h, n, x0, x1, y0, y1 }
    }
    window.compter = async (b, test, r) => {
      const { l, h, d } = await window.lire(b), f = new Function('r', 'g', 'b', 'return ' + test)
      r = r || { x0: 0, x1: l, y0: 0, y1: h }
      let n = 0
      for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const i = (y * l + x) * 4; if (f(d[i], d[i + 1], d[i + 2])) n++ }
      return n
    }
  })
  return ana
}
export const resultats = []
// Contrôle final du lot 3 : un échec se voit aussi au code de sortie
process.on('exit', code => { if (!code && resultats.some(r => !r.ok)) process.exitCode = 1 })
export function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 2500) : ''}`)
}
export const ctrlP = page => async () => { await page.mouse.move(683, 384); await page.keyboard.press('Control+p') }
export const menuFichier = page => async () => { await page.click('.barre-haut .bouton.points'); await page.waitForTimeout(100); await page.locator('.menu-flottant:not([hidden]) .menu-item[data-action="exporter-pdf"]').click() }
export const mkdir = d => { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); return d }

/** Une photo d'essai (500 × 500, une illustration en dégradés, en JPEG), fabriquée
 *  dans le navigateur la première fois puis gardée dans essais/navigateur/sorties.
 *  (Rangé dans le dépôt : les essais prenaient deux images d'une bibliothèque de
 *  tiers, qui n'est pas dans le dépôt ; celle-ci les remplace, `graine` choisit
 *  laquelle.) Rend les octets du JPEG. */
export async function photoEssai(graine = 1) {
  const f = `${S}/sorties/photos/essai-${graine}.jpg`
  try { return readFileSync(f) } catch { /* pas encore faite */ }
  const ctx = await nav.newContext()
  const p = await ctx.newPage()
  const url = await p.evaluate(g => {
    let s = g * 7919
    const h = () => { s = (s * 16807) % 2147483647; return s / 2147483647 }
    const c = Object.assign(document.createElement('canvas'), { width: 500, height: 500 })
    const x = c.getContext('2d')
    const fond = x.createLinearGradient(0, 0, 500, 500)
    fond.addColorStop(0, `hsl(${h() * 360}, 60%, 85%)`); fond.addColorStop(1, `hsl(${h() * 360}, 55%, 35%)`)
    x.fillStyle = fond; x.fillRect(0, 0, 500, 500)
    for (let i = 0; i < 40; i++) {
      const cx = h() * 500, cy = h() * 500, r = 20 + h() * 120
      const d = x.createRadialGradient(cx, cy, 0, cx, cy, r)
      d.addColorStop(0, `hsla(${h() * 360}, ${50 + h() * 40}%, ${30 + h() * 50}%, 0.9)`); d.addColorStop(1, 'hsla(0, 0%, 50%, 0)')
      x.fillStyle = d; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill()
    }
    const im = x.getImageData(0, 0, 500, 500)
    for (let k = 0; k < im.data.length; k += 4) { const n = (h() - 0.5) * 12; im.data[k] += n; im.data[k + 1] += n; im.data[k + 2] += n }
    x.putImageData(im, 0, 0)
    return c.toDataURL('image/jpeg', 0.9)
  }, graine)
  await ctx.close()
  const o = Buffer.from(url.split(',')[1], 'base64')
  mkdirSync(`${S}/sorties/photos`, { recursive: true })
  ;(await import('node:fs')).writeFileSync(f, o)
  return o
}
