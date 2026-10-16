// « Copier la page en image » : réussie (souris, menu de la page ; doigt,
// menu d'une vignette ; plusieurs objets, menu complet), refusée, ou sans
// ClipboardItem (repli « Enregistrer l'image (.png) »).
import { ouvrir, preparer, etat, carte, attendreOuverte, verifier, pause, fin, D } from './lib.mjs'
import { writeFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const lirePng = page => page.evaluate(async () => {
  try { for (const it of await navigator.clipboard.read()) if (it.types.includes('image/png')) { const b = await it.getType('image/png'); const bm = await createImageBitmap(b); return { l: bm.width, h: bm.height } } return null } catch (e) { return { err: String(e) } }
})
// 1. Réussie : souris, menu de la page ; plusieurs objets, menu complet
{
  const { ctx, page } = await ouvrir({ acceptDownloads: true }, 'image')
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  await preparer(page, 3, { ici: 1 })
  const z = await page.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left, y: r.top } })
  await page.mouse.click(z.x + 900, z.y + 550, { button: 'right' }); await pause(200)
  await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Copier la page en image' }).click(); await pause(1200)
  let img = await lirePng(page)
  let e = await etat(page)
  verifier('Souris : « Copier la page en image » (menu de la page) : un PNG, le message', img?.l > 100 && e.msgs.at(-1).startsWith('Image copiée'), { img, m: e.msgs.at(-1) })
  // Menu complet de la sélection : « Copier en image »
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.toutSelectionner(); a.ui.maj() }); await pause(200)
  const s = await page.evaluate(() => { const a = window.__app, f = a.formes[0]; const b = a.ui.apercus.boite([f]); const p = a.cam.versEcran ? a.cam.versEcran(b.x + b.l / 2, b.y + b.h / 2) : null; return p })
  await page.locator('.barre-actions button', { hasText: 'Options' }).click(); await pause(250)
  const entrees = await page.evaluate(() => [...document.querySelectorAll('.panneau button, #panneau button, .menu-complet button')].filter(b => b.offsetParent).map(b => b.textContent.trim()).slice(0, 30))
  // « Copier en image » est dans le petit menu ⋯ (Plus) du menu complet depuis les corrections « regressions »
  await page.locator('.panneau-forme .ligne button.plus').click(); await pause(300)
  await page.locator('.menu-plus .menu-item', { hasText: 'Copier en image' }).first().click(); await pause(1200)
  img = await lirePng(page); e = await etat(page)
  verifier('Barre d\'actions → Options → « Copier en image » : un PNG de la sélection', img?.l > 50 && e.msgs.at(-1).startsWith('Image copiée'), { img, m: e.msgs.at(-1), entrees })
  await ctx.close()
}
// 2. Refusée : le repli « Enregistrer l'image (.png) »
for (const [cas, init] of [['refusée', () => { navigator.clipboard.write = () => Promise.reject(new DOMException('refus', 'NotAllowedError')) }],
  ['sans ClipboardItem', () => { delete window.ClipboardItem }]]) {
  const { ctx, page } = await ouvrir({ acceptDownloads: true }, cas, init)
  await preparer(page, 2, { ici: 0, noms: { 0: 'Exercice 12 p. 84' } })
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await pause(400)
  const c = await carte(page, 0)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await pause(200)
  await page.locator('.menu-vignette .menu-item', { hasText: 'Copier en image' }).click(); await pause(800)
  let e = await etat(page)
  const boutons = await page.evaluate(() => [...document.querySelectorAll('.toast button')].map(b => b.textContent))
  verifier(`${cas} (menu d'une vignette) : le message le dit, avec « Enregistrer l'image (.png) » ; la trieuse reste`, e.ouverte && /refusée|ne sait pas/.test(e.msgs.at(-1)) && boutons.includes('Enregistrer l\'image (.png)'), { m: e.msgs.at(-1), boutons })
  const dl = page.waitForEvent('download', { timeout: 8000 })
  await page.locator('.toast button', { hasText: 'Enregistrer l\'image' }).click()
  const d = await dl
  const chemin = D + `/repli-${cas.replace(/\W/g, '')}.png`
  await d.saveAs(chemin)
  const f = execSync(`file "${chemin}"`).toString()
  verifier(`${cas} : le fichier « ${d.suggestedFilename()} » est un PNG`, /PNG image data/.test(f) && /\.png$/.test(d.suggestedFilename()), f)
  await ctx.close()
}
await fin()
