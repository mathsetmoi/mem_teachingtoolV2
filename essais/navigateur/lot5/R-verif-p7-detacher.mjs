// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : « Détacher l'image du fond » puis la tourner ; plusieurs
// objets et un quart de tour ; un Ctrl+Z remet tout.
// Copie de retouches/verif/parcours/p7-detacher.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 7 : l'énoncé fixé en fond ; le tourner comme le dit le message
// (le bouton du stylet dessus, « Détacher l'image du fond ») ; puis
// plusieurs objets et un quart de tour ; des points sur l'image ; le surligneur.
import { D, ok, note, demarrer, contexte, ouvrir, clic, clicSur, trait, ecran, lire, pastille, rect, couvre, disque,
  fabriquer, importer, tourner, glisser, ecartAngle, fin, boite } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU], L = 1366
const ctx = await contexte(nav, url, L, 768)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const b64 = await fabriquer(p)
await trait(p, wacom, 200, 700, 260, 710)
await wacom.survol(L - 200, 650)
await importer(p, wacom, 'bouton', b64)
await clicSur(p, wacom, '.toast.visible button.action'); await p.waitForTimeout(300)
let e = await ecran(p)
note('fixée (message)', e.toast)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)   // le Stylo
e = await ecran(p)
note('Échap', e.outil)
const a0 = await lire(p)
// Le bouton du stylet sur l'image fixée : le menu de la page
await wacom.clicDroit(a0.cx, a0.cy); await p.waitForTimeout(400)
const entrees = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action ?? b.textContent.trim().slice(0, 30)))
note('menu du bouton du stylet sur l\'image fixée', entrees)
const det = await boite(p, '.menu-item[data-action="detacher-fond"]')
ok(!!det, 'le menu propose « Détacher l\'image du fond »')
if (det) await clic(p, wacom, det.x + det.width / 2, det.y + det.height / 2)
await p.waitForTimeout(400)
await wacom.survol(L - 60, 740); await p.waitForTimeout(250)
e = await ecran(p)
let q = await pastille(p)
note('détachée', { outil: e.outil, toast: e.toast, pastille: q })
ok(e.outil === 'selection' && q, 'détachée : Sélection, pastille visible')
if (q) {
  await tourner(p, wacom, q, { x: a0.cx, y: a0.cy }, 25)
  const a1 = await lire(p)
  ok(Math.abs(ecartAngle(a1.angle, a0.angle) - 25) <= 2, `tournée à la pastille : ${ecartAngle(a1.angle, a0.angle)}°`)
}
// Reprendre le Stylo : le message de détachement le dit-il ?
note('le message après « Détacher » dit-il comment reprendre le Stylo ?', e.toast)
await p.keyboard.press('p'); await p.waitForTimeout(200)

// Plusieurs objets : Ctrl+A puis quart de tour au bouton du stylet
await trait(p, wacom, 300, 120, 500, 130)
await p.keyboard.press('Control+a'); await p.waitForTimeout(300)
const tous0 = await lire(p)
e = await ecran(p)
note('Ctrl+A', { outil: e.outil, boiteEncre: tous0.boiteEncre })
await wacom.clicDroit(tous0.cx, tous0.cy); await p.waitForTimeout(400)
const menu = await rect(p, '.panneau-forme')
note('menu complet sur plusieurs objets', menu)
const plus = await boite(p, '.panneau-forme .ligne button.plus')
if (plus) { await clic(p, wacom, plus.x + plus.width / 2, plus.y + plus.height / 2); await p.waitForTimeout(250) }
const ent2 = await p.evaluate(() => [...document.querySelectorAll('.menu-plus .menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action ?? b.textContent.trim().slice(0, 30)))
note('⋯ de plusieurs objets', ent2)
const qg = await boite(p, '.menu-plus .menu-item[data-action="quart-gauche"]')
ok(!!qg, 'plusieurs objets : « Tourner d\'un quart de tour à gauche »')
if (qg) {
  await clic(p, wacom, qg.x + qg.width / 2, qg.y + qg.height / 2); await p.waitForTimeout(500)
  const t1 = await lire(p)
  note('après le quart de tour de tout', { img: [t1.x1, t1.y1, t1.x2, t1.y2], encre: t1.boiteEncre })
  await p.screenshot({ path: `${D}/p7-${LIEU}-quart-tout.png` })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(400)
  const t2 = await lire(p)
  ok(Math.abs(t2.cx - tous0.cx) < 1 && Math.abs(t2.angle - tous0.angle) < 1 && JSON.stringify(t2.boiteEncre) === JSON.stringify(tous0.boiteEncre), 'un Ctrl+Z remet tout', { t2: t2.boiteEncre, t0: tous0.boiteEncre })
}
await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(200)
e = await ecran(p)
note('outil après Échap Échap', e.outil)

// Le surligneur au départ (trait Fin) : son épaisseur à l'écran
await clicSur(p, wacom, '.barre-outils button[title^="Surligneur"]'); await p.waitForTimeout(200)
await trait(p, wacom, 300, 740, 700, 742, 20)
const ep = await p.evaluate(() => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(Math.round(500 * k), Math.round(700 * k), 1, Math.round(68 * k)).data
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 20 && !(d[i] > 245 && d[i + 1] > 245 && d[i + 2] > 245)) n++
  return n / k
})
note('épaisseur à l\'écran du surligneur au départ (px)', ep)
await p.screenshot({ path: `${D}/p7-${LIEU}-surligneur.png`, clip: { x: 250, y: 680, width: 500, height: 88 } })
await ctx.close()
await fin(nav, serveur)
