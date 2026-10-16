// La même page (formules, noms de points, écriture, une image) exportée en PDF par
// le serveur de développement, la version en un seul fichier (file://) et la
// version en ligne (dist-pages) : les feuilles sont-elles les mêmes ?
// Et « Copier la page en image » en file:// et en ligne.
import { nav, ouvrir, exporter, info, images, rendre, b64, verifier, ctrlP, mkdir, V, R, S, erreurs, surveiller, msgs, photoEssai } from './lib.mjs'
import { writeFileSync, readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'
// Lot 4 (C4) : « Ouvrir un classeur » (Ctrl + O) passe par showOpenFilePicker
// quand il existe, que Chromium sans fenêtre refuse (AbortError, même quand
// Playwright attend le choix de fichier) : cet essai ouvre ses fichiers par
// le choix de fichier d'avant, celui de Firefox, Safari et l'iPad
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.showOpenFilePicker = undefined }); return c } }
// Lot 4 (C9) : « Ouvrir un classeur » AJOUTE d'abord le classeur d'un fichier à la bibliothèque
// (une première fenêtre : [Annuler] [Remplacer « … »…] [Ajouter à la bibliothèque]). Ces essais
// remplacent celui qui est ouvert : on y choisit « Remplacer « … »… », et la question du lot 1,
// celle qu'ils vérifient, suit (adaptation de C9 : un comportement changé volontairement)
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true }) }); return c } }
const D = mkdir(V + '/out/versions')
const PHOTO = await photoEssai(2)   // (une illustration en dégradés de 500 × 500, voir lib.mjs)
const { ctx, page } = await ouvrir({}, 'dev')
await page.evaluate(async (src) => {
  const a = window.__app, t = a.tableau
  t.changerFond(a.page, 'seyes')
  const F = [['\\dfrac{a+b}{2}\\geqslant\\sqrt{ab}', 80, 100], ['\\int_0^1 x^2\\,dx=\\frac{1}{3}', 80, 200], ['\\vec{u}\\cdot\\vec{v}=\\|\\vec u\\|\\times\\|\\vec v\\|\\cos\\theta', 80, 300], ['\\boxed{\\Delta=b^2-4ac}', 80, 400], ['f(x)=\\begin{cases}x^2 & x\\geq0\\\\-x & x<0\\end{cases}', 80, 480]]
  F.forEach(([l, x, y], i) => t.poser(a.page, { id: 'f' + i, type: 'formule', x, y, z: 10 + i, auteur: t.moi, latex: l, couleur: i === 1 ? '#d64545' : '#1b2230', taille: 36 }))
  t.poser(a.page, { id: 'tri', type: 'polygone', x: 650, y: 140, z: 30, auteur: t.moi, pts: [0, 260, 300, 260, 120, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
  t.poser(a.page, { id: 'seg', type: 'polygone', x: 650, y: 520, z: 31, auteur: t.moi, pts: [0, 0, 260, 0], ferme: false, couleur: '#2e9e5b', taille: 3, sommets: true, noms: ['M', 'N'], styleNoms: [{ droit: true }, { taille: 40 }] })
  t.doc.getMap('images').set('im', src)
  t.poser(a.page, { id: 'im', type: 'image', src: 'im', l: 500, h: 500, m: [0.5, 0, 0, 0.5], x: 650, y: 620, z: 2, auteur: t.moi })
}, 'data:image/jpeg;base64,' + PHOTO.toString('base64'))
await page.waitForTimeout(1000)
const memc = await page.evaluate(async () => {
  const f = await import('/src/fichier.ts')
  const b = f.ecrireTableau(window.__app.tableau.doc, Date.now())
  const o = new Uint8Array(await b.arrayBuffer())
  let s = ''; for (let i = 0; i < o.length; i += 0x8000) s += String.fromCharCode(...o.subarray(i, i + 0x8000))
  return btoa(s)
})
writeFileSync(D + '/page.memc', Buffer.from(memc, 'base64'))
const rd = await exporter(page, D, 'dev', ctrlP(page))
await ctx.close()

async function version(url, nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(url)
  await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(600)
  const fc = page.waitForEvent('filechooser', { timeout: 5000 })
  await page.mouse.move(683, 384)
  await page.keyboard.press('Control+o')
  const ch = await fc
  await ch.setFiles(D + '/page.memc')
  await page.waitForSelector('dialog.dialogue-ouvrir[open]')
  await page.click('dialog[open] [data-a="remplacer"]')
  await page.waitForTimeout(2500)
  const r = await exporter(page, D, nom, ctrlP(page))
  // Copier la page en image
  await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  await page.screenshot({ path: D + '/' + nom + '-avant-menu.png' })
  await page.mouse.click(1100, 330, { button: 'right' }); await page.waitForTimeout(300)
  await page.screenshot({ path: D + '/' + nom + '-menu.png' })
  await page.locator('.menu-flottant .menu-item', { hasText: 'Copier la page en image' }).first().click({ timeout: 5000 })
  await page.waitForTimeout(1500)
  const toast = await page.evaluate(() => document.querySelector('.toast')?.textContent)
  const pp = await page.evaluate(async () => {
    try {
      const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
      if (!it) return null
      const b = await it.getType('image/png'); const bmp = await createImageBitmap(b)
      return { l: bmp.width, h: bmp.height }
    } catch (e) { return String(e) }
  })
  await ctx.close()
  return { r, toast, pp }
}
let serveur = null
const essai = async () => { try { return (await fetch('http://127.0.0.1:4180/index.html')).ok } catch { return false } }
if (!await essai()) {
  serveur = spawn('python3', ['-m', 'http.server', '4180', '--bind', '127.0.0.1', '--directory', R + '/dist-pages'], { stdio: 'ignore' })
  for (let k = 0; k < 30 && !await essai(); k++) await new Promise(r => setTimeout(r, 200))
}
const vf = await version('file://' + R + '/dist/index.html', 'fichier')
const ve = await version('http://127.0.0.1:4180/index.html', 'enligne')
serveur?.kill()
const ana = await (await nav.newContext()).newPage()
const comparer = async (a, b) => {
  const A = rendre(a, 200, D + '/c-' + a.replace(/.*\//, '').replace('.pdf', '')).fichiers[0]
  const B = rendre(b, 200, D + '/c-' + b.replace(/.*\//, '').replace('.pdf', '')).fichiers[0]
  return ana.evaluate(async ([a, b]) => {
    const lire = async s => { const i = new Image(); i.src = 'data:image/png;base64,' + s; await i.decode(); const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return { l: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data } }
    const A = await lire(a), B = await lire(b)
    if (A.l !== B.l || A.h !== B.h) return { taille: [A.l, A.h, B.l, B.h] }
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1
    for (let y = 0; y < A.h; y++) for (let x = 0; x < A.l; x++) { const i = (y * A.l + x) * 4; if (Math.abs(A.d[i] - B.d[i]) + Math.abs(A.d[i + 1] - B.d[i + 1]) + Math.abs(A.d[i + 2] - B.d[i + 2]) > 30) { n++; x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) } }
    return { differents: n, zone: [x0, y0, x1, y1] }
  }, [b64(A), b64(B)])
}
for (const [nom, v] of [['un seul fichier (file://)', vf], ['en ligne (dist-pages)', ve]]) {
  const i = v.r.fichier ? info(v.r.fichier) : null
  const c = v.r.fichier ? await comparer(rd.fichier, v.r.fichier) : null
  console.log(nom, v.r.propose, i?.pages, c, v.toast, v.pp)
  verifier(`Version ${nom} : un PDF A4, le même que celui du serveur de développement (formules, noms des points, image)`, i?.pages === 1 && c && c.differents < 200, c)
  verifier(`Version ${nom} : « Copier la page en image » met un PNG dans le presse-papiers`, v.pp && typeof v.pp === 'object' && v.pp.l > 100 && /Image copiée/.test(v.toast ?? ''), { pp: v.pp, toast: v.toast })
}
console.log(erreurs)
await nav.close()
