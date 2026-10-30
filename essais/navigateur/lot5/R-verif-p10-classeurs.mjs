// SONDE DE VÉRIFICATION reprise dans la batterie (corrections des vérifications
// des retouches après le lot 5) : ouvrir des classeurs : 100 %, au centre gardé.
// Copie de retouches/verif/parcours/p10-classeurs.mjs ; elle lit les versions construites du dépôt (voir R-verif/lib.mjs).
// Parcours 10 : ouvrir un classeur (la bibliothèque) ; une copie du
// classeur, dont aucune page n'a été regardée dans ce navigateur.
import { D, ok, note, demarrer, contexte, ouvrir, clic, clicSur, trait, ecran, session, lire, pret, fin, boite } from './R-verif/lib.mjs'

const LIEU = process.argv[2] ?? 'ligne'
const { serveur, URLS, nav } = await demarrer()
const url = URLS[LIEU], L = 1366
const ctx = await contexte(nav, url, L, 768)
const { p, souris, wacom } = await ouvrir(ctx, url, LIEU)
const molette = async (x, y, crans) => { await p.mouse.move(x, y); for (let i = 0; i < Math.abs(crans); i++) { await p.keyboard.down('Control'); await p.mouse.wheel(0, crans < 0 ? -100 : 100); await p.keyboard.up('Control'); await p.waitForTimeout(40) } await p.waitForTimeout(600) }
/** La boîte de l'encre sombre à l'écran */
const encre = () => p.evaluate(() => {
  const c = document.querySelector('canvas.couche-scene'), r = c.getBoundingClientRect(), k = c.width / r.width
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4; if (d[i + 3] > 200 && d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 140) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y } }
  return x2 < 0 ? null : { x1: Math.round(r.left + x1 / k), y1: Math.round(r.top + y1 / k), x2: Math.round(r.left + x2 / k), y2: Math.round(r.top + y2 / k) }
})

// Page 1 : un grand contenu (écrit à 40 %), page 2 : un petit
await molette(700, 400, 8)
note('zoom pour écrire grand', (await ecran(p)).zoom)
for (let k = 0; k < 6; k++) await trait(p, wacom, 160, 110 + k * 100, 1300, 130 + k * 100, 30)
await molette(700, 400, -8)
await clicSur(p, wacom, '.barre-haut > .nouvelle-page'); await p.waitForTimeout(600)
await trait(p, wacom, 500, 300, 700, 320)
await trait(p, wacom, 500, 340, 700, 360)
await p.keyboard.press('PageUp'); await p.waitForTimeout(600)
await molette(900, 300, -6)
const s0 = await session(p), id1 = s0.page, v1 = s0.vues[id1]
note('page 1 laissée à', { zoom: (await ecran(p)).zoom, v1 })

// La bibliothèque : dupliquer ce classeur, ouvrir la copie
await clicSur(p, wacom, '.bouton-classeur'); await p.waitForTimeout(200); await clicSur(p, wacom, '.menu-seances [data-action="bibliotheque"]')
await p.waitForSelector('.grille-classeurs li', { timeout: 10000 }); await p.waitForTimeout(400)
const opt = await boite(p, '.grille-classeurs li:has-text("Premier classeur") .options-classeur')
await clic(p, wacom, opt.x + opt.width / 2, opt.y + opt.height / 2); await p.waitForTimeout(250)
const dup = await boite(p, '.menu-flottant:not([hidden]) [data-action="dupliquer"]')
await clic(p, wacom, dup.x + dup.width / 2, dup.y + dup.height / 2)
await p.waitForFunction(() => [...document.querySelectorAll('.toast.visible')].some(t => t.textContent.includes('Classeur dupliqué')), null, { timeout: 30000 })
const ouvrirB = await boite(p, '.toast.visible button.action:has-text("Ouvrir")')
await Promise.all([p.waitForNavigation({ timeout: 20000 }), clic(p, wacom, ouvrirB.x + ouvrirB.width / 2, ouvrirB.y + ouvrirB.height / 2)])
await pret(p); await p.waitForTimeout(900)
let e = await ecran(p), en = await encre()
const zl = await p.evaluate(() => {
  const z = document.getElementById('zone').getBoundingClientRect()
  const o = document.querySelector('.barre-outils').getBoundingClientRect(), h = document.querySelector('.barre-haut').getBoundingClientRect(), b = document.querySelector('.barre-zoom').getBoundingClientRect()
  const x = o.right - z.left + 16, y = h.bottom - z.top + 12
  return { x, y, l: z.width - 16 - x, h: Math.min(b.top - z.top, z.height) - 12 - y }
})
note('la copie ouverte', { titre: await p.title(), e, encre: en, zoneLibre: zl })
ok(e.zoom === '100 %' && e.rang.startsWith('1 / 2') && en && Math.abs(en.x1 - (zl.x + 32)) < 8 && Math.abs(en.y1 - (zl.y + 32)) < 10, 'la copie : page 1 à 100 %, le grand contenu sur son coin en haut à gauche (32 px)', { e, en, zl })
await p.screenshot({ path: `${D}/p10-${LIEU}-copie-p1.png` })
await p.keyboard.press('PageDown'); await p.waitForTimeout(700)
e = await ecran(p); en = await encre()
note('la copie, page 2', { e, en })
ok(e.zoom === '100 %' && en && Math.abs((en.x1 + en.x2) / 2 - (zl.x + zl.l / 2)) < 8, 'la copie, page 2 : son petit contenu centré', { en, zl })
await p.screenshot({ path: `${D}/p10-${LIEU}-copie-p2.png` })

// Rouvrir l'original : page 1, 100 %, même centre
await clicSur(p, wacom, '.bouton-classeur'); await p.waitForTimeout(200); await clicSur(p, wacom, '.menu-seances [data-action="bibliotheque"]')
await p.waitForSelector('.grille-classeurs li', { timeout: 10000 }); await p.waitForTimeout(400)
const carte = await boite(p, '.grille-classeurs li:has-text("Premier classeur"):not(:has-text("copie")) .carte-classeur')
note('carte de l\'original', carte)
await Promise.all([p.waitForNavigation({ timeout: 20000 }), clic(p, wacom, carte.x + carte.width / 2, carte.y + 60)])
await pret(p); await p.waitForTimeout(900)
e = await ecran(p)
const s1 = await session(p)
note('l\'original rouvert', { titre: await p.title(), e, v: s1?.vues?.[s1?.page] })
ok(e.zoom === '100 %' && s1?.page === id1 && Math.abs(s1.vues[id1][0] - v1[0]) < 1 && Math.abs(s1.vues[id1][1] - v1[1]) < 1, 'l\'original rouvert : page 1, 100 %, même centre', { v1, v: s1?.vues?.[id1] })
await ctx.close()
await fin(nav, serveur)
