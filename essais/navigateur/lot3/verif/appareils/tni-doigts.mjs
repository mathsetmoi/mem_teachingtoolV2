// TNI 1920 × 1080, plusieurs doigts dans la trieuse. 80 pages : 40 tiennent
// sans défiler sur ce TNI (8 colonnes, 5 rangées), et la grille n'aurait rien
// à faire défiler (contrôle final du lot 3)
import { ouvrir, preparer, etat, carte, centre, attendreOuverte, verifier, pause, fin, doigtCDP } from './lib.mjs'

const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1920, height: 1080 } }, 'tni')
const cdp = await ctx.newCDPSession(page)
const doigts = doigtCDP(cdp)
const P = await preparer(page, 80, { ici: 0 })
const ouvrirT = async () => { await page.keyboard.press('Shift+P'); await attendreOuverte(page); await pause(400) }
await ouvrirT()
// (1) Deux doigts posés ensemble sur deux cartes, levés ensemble
let a = await carte(page, 6), b = await carte(page, 8)
await doigts('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await pause(80)
await doigts('touchEnd', []); await pause(400)
let e = await etat(page)
verifier('Deux doigts posés et levés ensemble : rien ne s\'ouvre (le second doigt arrête le toucher du premier)', e.ouverte && e.page === P[0], e.ouverte ? 'trieuse ouverte' : `page ${e.pages.indexOf(e.page) + 1}`)
if (!e.ouverte) await ouvrirT()
// (1 bis) Un doigt qui glisse vers le haut : la grille défile (le navigateur)
{
  const c = await carte(page, 12)
  const d0 = (await etat(page)).defilement
  await doigts('touchStart', [[c.x, c.y, 1]]); await pause(30)
  for (let k = 1; k <= 15; k++) { await doigts('touchMove', [[c.x, c.y - k * 20, 1]]); await pause(16) }
  await doigts('touchEnd', []); await pause(600)
  const e1 = await etat(page)
  verifier('Un doigt qui glisse vers le haut : la grille défile', e1.ouverte && e1.defilement > d0 + 100 && JSON.stringify(e1.pages) === JSON.stringify(P), { d0, d: e1.defilement })
  await page.evaluate(() => { document.querySelector('.trieuse-grille').scrollTop = 0 }); await pause(200)
}
// (2) Deux doigts glissent vers le haut : la grille défile, rien ne bouge
a = await carte(page, 12); b = await carte(page, 13)
const d0 = (await etat(page)).defilement
await doigts('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await pause(30)
for (let k = 1; k <= 15; k++) { await doigts('touchMove', [[a.x, a.y - k * 20, 1], [b.x, b.y - k * 20, 2]]); await pause(16) }
await doigts('touchEnd', []); await pause(600)
e = await etat(page)
verifier('Deux doigts qui glissent vers le haut : la grille défile, aucune page ne bouge ni ne s\'ouvre', e.ouverte && e.defilement > d0 + 100 && JSON.stringify(e.pages) === JSON.stringify(P), { d0, d: e.defilement, ouverte: e.ouverte })
// (3) Une main posée (un doigt immobile sur le vide du bandeau), l'autre fait un appui long et tire une page
await page.evaluate(() => { document.querySelector('.trieuse-grille').scrollTop = 0 }); await pause(200)
const pose = await centre(page, '.trieuse-tete h2')
a = await carte(page, 0); b = await carte(page, 3)
await doigts('touchStart', [[pose.x, pose.y, 1]]); await pause(50)
await doigts('touchStart', [[pose.x, pose.y, 1], [a.x, a.y, 2]]); await pause(650)
for (let k = 1; k <= 12; k++) { await doigts('touchMove', [[pose.x, pose.y, 1], [a.x + (b.left - 8 - a.x) * k / 12, a.y, 2]]); await pause(16) }
await doigts('touchEnd', [[pose.x, pose.y, 1]]); await pause(100) // relâche le doigt posé (CDP : les points cités se lèvent)
await doigts('touchEnd', []); await pause(300)
e = await etat(page)
verifier('Un doigt posé sur le bandeau, un autre tire la page 1 (appui long) entre la 3 et la 4', JSON.stringify(e.pages.slice(0, 4)) === JSON.stringify([P[1], P[2], P[0], P[3]]), e.pages.slice(0, 4).map(x => P.indexOf(x) + 1))
await page.keyboard.press('Control+z'); await pause(100)
// (4) Un doigt tire une page (appui long), un second doigt touche une autre carte : rien de plus
a = await carte(page, 0); b = await carte(page, 5)
const c9 = await carte(page, 9)
await doigts('touchStart', [[a.x, a.y, 1]]); await pause(650)
await doigts('touchMove', [[a.x + 30, a.y, 1]]); await pause(30)
await doigts('touchStart', [[a.x + 30, a.y, 1], [c9.x, c9.y, 2]]); await pause(60)
await doigts('touchEnd', [[c9.x, c9.y, 2]]); await pause(60)
for (let k = 1; k <= 12; k++) { await doigts('touchMove', [[a.x + 30 + (b.left - 8 - a.x - 30) * k / 12, a.y, 1]]); await pause(16) }
await doigts('touchEnd', []); await pause(300)
e = await etat(page)
verifier('Pendant qu\'un doigt tire la page 1, un second doigt touche la carte 10 : la page 1 arrive entre la 5 et la 6, la trieuse reste', e.ouverte && e.pages.indexOf(P[0]) === 4, { ouverte: e.ouverte, k: e.pages.indexOf(P[0]) + 1, page: e.pages.indexOf(e.page) + 1 })
await ctx.close()
await fin()
