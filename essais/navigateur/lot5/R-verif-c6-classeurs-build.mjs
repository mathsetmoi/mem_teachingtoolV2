// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : les classeurs, version construite.
// Copie de retouches/verif/conformite/c6-classeurs-build.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// A2/A3 : Nouveau classeur (page blanche), retour à un classeur zoomé (100 %
// au même centre), la trieuse (aller à une page), « Insérer une page… ».
import { demarrer, contexte, ouvrir, ecran, ok, note, fin, D, clic, trait, session, pret } from './R-verif/lib.mjs'

const { serveur, URLS, nav } = await demarrer()
const molette = async (p, x, y, n) => { await p.mouse.move(x, y); await p.keyboard.down('Control'); for (let i = 0; i < Math.abs(n); i++) { await p.mouse.wheel(0, n > 0 ? -100 : 100); await p.waitForTimeout(40) } await p.keyboard.up('Control'); await p.waitForTimeout(500) }
const proche = (a, b, t = 2) => Math.abs(a - b) <= t

for (const [nom, url] of Object.entries(URLS)) {
  const ctx = await contexte(nav, url, 1366, 768)
  const { p, souris } = await ouvrir(ctx, url, nom)
  await trait(p, souris, 400, 300, 700, 380)
  await molette(p, 900, 500, 6)
  await p.mouse.move(600, 400); await p.waitForTimeout(1500)
  let s = await session(p); const v0 = s?.vues?.[s.page]
  let e = await ecran(p)
  note(`${nom} classeur 1 zoomé`, { zoom: e.zoom, v0 })
  // Nouveau classeur
  await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.biblio-nouveau', { state: 'visible', timeout: 10000 }); await p.waitForTimeout(300)
  await p.click('.biblio-nouveau'); await p.waitForSelector('dialog.dialogue-nouveau[open]'); await p.waitForTimeout(200)
  const coche = await p.evaluate(() => { const r = document.querySelector('dialog.dialogue-nouveau[open] input[name="fond"]:checked'); return r?.closest('label')?.textContent })
  ok(coche === 'Page blanche', `${nom} A2 : Nouveau classeur, « Page blanche » cochée`, coche)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), p.click('dialog.dialogue-nouveau[open] [data-a="creer"]')])
  await pret(p); await p.waitForTimeout(1000)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.taille === 'Fin' && e.rang.startsWith('1 / 1'), `${nom} A2 : le nouveau classeur s'ouvre sur une page blanche, trait Fin, 100 %`, e)
  // Revenir au premier classeur
  await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.carte-classeur', { state: 'visible', timeout: 10000 }); await p.waitForTimeout(400)
  const carte = p.locator('.carte-classeur', { hasText: 'Premier classeur' }).first()
  await Promise.all([p.waitForNavigation({ timeout: 20000 }).catch(() => null), carte.click()])
  await pret(p); await p.waitForTimeout(1000)
  e = await ecran(p); s = await session(p); const v1 = s?.vues?.[s.page]
  ok(e.zoom === '100 %' && v1 && proche(v1[0], v0[0]) && proche(v1[1], v0[1]), `${nom} A3 : de retour dans le premier classeur (laissé à ${Math.round(v0[2] * 100)} %) : 100 %, au même centre`, { e: e.zoom, v0, v1 })
  // Trieuse : aller à la page 2 (créée à 100 %), zoomer, revenir par la trieuse
  await p.click('button.nouvelle-page'); await p.waitForTimeout(700)
  await molette(p, 700, 400, -5)
  e = await ecran(p); note('page 2 dézoomée', e.zoom)
  await p.click('.rang'); await p.waitForTimeout(800)
  const vign = p.locator('.trieuse .carte').first()
  await vign.click(); await p.waitForTimeout(1200)
  e = await ecran(p)
  ok(e.rang.startsWith('1 / 2') && e.zoom === '100 %', `${nom} A3 : par la trieuse, la page 1 à 100 %`, e)
  await p.screenshot({ path: `${D}/c6-${nom}.png` })
  await ctx.close()
}
await fin(nav, serveur)
