// Copier la page en image : presse-papiers, message, taille ; repli refusé
import { ouvrir, etat, verifier, fin, pause, D, nav } from './lib.mjs'

async function scene(page) {
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    const trait = (id, x, y, l = 400) => { t.nouveauGeste(); const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, Math.sin(i / 2) * 20, 0.5); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) }
    trait('a1', 100, 100); trait('a2', 100, 200)
  })
  await pause(300)
}
const { page, ctx } = await ouvrir()
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'http://localhost:5173' })
await scene(page)
await page.mouse.click(900, 600, { button: 'right' }); await pause(300)
await page.locator('.menu-flottant .menu-item', { hasText: 'Copier la page en image' }).click()
await pause(1500)
let e = await etat(page)
console.log('message', e.toast)
verifier('Message « Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V) »', e.toast.startsWith('Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V)'), e.toast)
const img = await page.evaluate(async () => {
  const items = await navigator.clipboard.read()
  const b = await items[0].getType('image/png')
  const bm = await createImageBitmap(b)
  return { types: items[0].types, l: bm.width, h: bm.height, taille: b.size }
})
console.log('presse-papiers', img)
verifier('Une image PNG de taille raisonnable', img.types.includes('image/png') && img.l > 600 && img.l < 4100, img)

// Repli : sans autorisation (un autre contexte)
const ctx2 = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
const p2 = await ctx2.newPage()
await p2.goto('http://localhost:5173/')
await p2.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
await pause(400)
await p2.evaluate(() => { navigator.clipboard.write = () => Promise.reject(new DOMException('refus', 'NotAllowedError')) })
await scene(p2)
await p2.mouse.click(900, 600, { button: 'right' }); await pause(300)
await p2.locator('.menu-flottant .menu-item', { hasText: 'Copier la page en image' }).click()
await pause(800)
const t2 = await p2.evaluate(() => document.querySelector('.toast').innerText)
console.log('refus', t2)
const dl = p2.waitForEvent('download')
await p2.locator('.toast button', { hasText: 'Enregistrer' }).click()
const f = await dl
console.log('fichier', f.suggestedFilename())
await pause(300)
console.log('après', await p2.evaluate(() => document.querySelector('.toast').innerText))
verifier('Repli « Enregistrer l\'image (.png) »', /Enregistrer l'image \(\.png\)/.test(t2) && f.suggestedFilename() === 'page-1.png', t2)
await fin()
