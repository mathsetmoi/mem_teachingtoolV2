// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : le cadre d'une image importée (coins, côtés, pastille).
// Copie de retouches/verif/parcours/p3-cadre.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 3 : l'énoncé importé, ses coins (Wacom, souris), le quart de tour
// à la Sélection (où va la pastille), écrire juste après un quart de tour.
import { D, ok, note, demarrer, contexte, ouvrir, clic, clicSur, trait, ecran, lire, pastille, coins, rect, couvre, disque,
  fabriquer, importer, glisser, tourner, ecartAngle, fin, boite } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const L = Number(process.argv[3] ?? 1366)
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU]
const ctx = await contexte(nav, url, L, 768)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const tag = `p3-${LIEU}-${L}`
const b64 = await fabriquer(p)

// Le coin en haut à droite, sous le message ?
await trait(p, wacom, 200, 700, 260, 710)   // le dernier pointeur : la Wacom
await wacom.survol(L - 200, 700); await p.waitForTimeout(150)
await importer(p, wacom, 'bouton', b64)
let a0 = await lire(p)
const t = await rect(p, '.toast.visible')
note('image et message', { img: [a0.x1, a0.y1, a0.x2, a0.y2], toast: t })
await p.screenshot({ path: `${D}/${tag}-coin-sous-toast.png`, clip: { x: a0.x2 - 80, y: a0.y1 - 60, width: 160, height: 120 } })
const coinHD = { x: a0.x2, y: a0.y1 }
ok(!(t && coinHD.x > t.l - 4 && coinHD.x < t.r + 4 && coinHD.y > t.t - 4 && coinHD.y < t.b + 4), 'le coin en haut à droite n\'est pas sous le message', { coinHD, t })

// Agrandir par le coin en bas à droite, à la Wacom
let c = { x: a0.x2, y: a0.y2 }
await wacom.survol(c.x, c.y); await p.waitForTimeout(150)
let e = await ecran(p)
note('curseur sur le coin bas droit (Wacom)', e.curseur)
await glisser(p, wacom, c, { x: c.x + 60, y: c.y + 40 })
let a1 = await lire(p)
ok(a1.aire > a0.aire * 1.1 && Math.abs((a1.x2 - a1.x1) / (a1.y2 - a1.y1) - (a0.x2 - a0.x1) / (a0.y2 - a0.y1)) < 0.03, `coin bas droit à la Wacom : aire ×${(a1.aire / a0.aire).toFixed(2)}, proportions gardées`, { a0, a1 })
// à la souris, le coin en haut à gauche vers l'intérieur
await souris.survol(a1.x1, a1.y1); await p.waitForTimeout(150)
e = await ecran(p)
note('curseur sur le coin haut gauche (souris)', e.curseur)
await glisser(p, souris, { x: a1.x1, y: a1.y1 }, { x: a1.x1 + 90, y: a1.y1 + 60 })
let a2 = await lire(p)
ok(a2.aire < a1.aire * 0.9, `coin haut gauche à la souris : aire ×${(a2.aire / a1.aire).toFixed(2)}`, { a2 })
// Ctrl+Z deux fois : la taille d'origine
await p.keyboard.press('Control+z'); await p.waitForTimeout(250); await p.keyboard.press('Control+z'); await p.waitForTimeout(250)
let a3 = await lire(p)
ok(Math.abs(a3.aire / a0.aire - 1) < 0.02, 'Ctrl+Z deux fois : la taille d\'origine', { a3 })

// Le quart de tour à la Sélection (bouton latéral), où va la pastille
await wacom.clicDroit(a3.cx, a3.cy + 30); await p.waitForTimeout(400)
await clicSur(p, wacom, '.panneau-forme .ligne button.plus'); await p.waitForTimeout(250)
await clicSur(p, wacom, '.menu-plus .menu-item[data-action="quart-gauche"]'); await p.waitForTimeout(500)
await wacom.survol(L - 60, 740); await p.waitForTimeout(300)
let a4 = await lire(p), q = await pastille(p)
e = await ecran(p)
const barre = await rect(p, '.barre-actions'), toast = await rect(p, '.toast.visible'), haut = await rect(p, '.barre-haut')
ok(Math.abs(ecartAngle(a4.angle, a3.angle) + 90) <= 1.5, `quart de tour à gauche (Sélection) : ${ecartAngle(a4.angle, a3.angle)}°`, { a4 })
note('après le quart de tour : pastille, barre, message, outil', { q, barre, toast, outil: e.outil, img: [a4.x1, a4.y1, a4.x2, a4.y2] })
ok(q && !couvre(disque(q), haut) && !couvre(disque(q), barre) && !couvre(disque(q), toast), 'la pastille se voit, hors des barres et du message', { q, haut, barre, toast })
await p.screenshot({ path: `${D}/${tag}-quart-selection.png` })
// tourner encore à la pastille (Wacom), -30°
if (q) {
  await tourner(p, wacom, q, { x: a4.cx, y: a4.cy }, -30)
  const a5 = await lire(p)
  ok(Math.abs(ecartAngle(a5.angle, a4.angle) + 30) <= 2, `puis la pastille à la Wacom : ${ecartAngle(a5.angle, a4.angle)}°`, { a5 })
  await p.keyboard.press('Control+z'); await p.waitForTimeout(250)
}
await p.keyboard.press('Control+z'); await p.waitForTimeout(250)
a4 = await lire(p)
ok(Math.abs(ecartAngle(a4.angle, a3.angle)) <= 1, 'Ctrl+Z : droite de nouveau', { a4 })

// Au Stylo : un quart de tour par le bouton latéral, puis écrire tout de suite (l'image encore prise ?)
await p.keyboard.press('p'); await p.waitForTimeout(200)
await wacom.clicDroit(a4.cx, a4.cy + 30); await p.waitForTimeout(400)
await clicSur(p, wacom, '.panneau-forme .ligne button.plus'); await p.waitForTimeout(250)
await clicSur(p, wacom, '.menu-plus .menu-item[data-action="quart-droite"]'); await p.waitForTimeout(500)
const a6 = await lire(p)
e = await ecran(p)
note('au Stylo, après le quart de tour : outil, barre', { outil: e.outil, barre: await rect(p, '.barre-actions') })
await trait(p, wacom, a6.cx - 120, a6.cy, a6.cx + 120, a6.cy + 20)
const a7 = await lire(p)
ok(a7.encre > a6.encre + 20 && Math.abs(a7.cx - a6.cx) < 1 && Math.abs(a7.cy - a6.cy) < 1, 'au Stylo, juste après le quart de tour, un trait sur l\'image écrit (sans la bouger)', { a6, a7 })
await p.screenshot({ path: `${D}/${tag}-ecrit-apres-quart.png` })

await ctx.close()
await fin(nav, serveur)
