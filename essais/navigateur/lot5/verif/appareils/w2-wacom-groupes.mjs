// Vérification par appareil, lot 5 : la Wacom et les groupes, l'ordre, Remettre
// droit, la gomme partielle au bout gomme sur un groupe, la mesure de la pastille.
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, pile, cadre, vue, versF, ecran, glisserF, tourner, msgs, vider } = L
const titres = p => p.evaluate(() => [...document.querySelectorAll('.panneau-forme')].filter(x => x.offsetWidth && !x.hidden).map(x => x.getAttribute('aria-label')))

const ctx = await L.contexte()
const { p, stylet, cdp } = await L.ouvrir(ctx, 'wacom2')
await p.evaluate(L.PAGE_NEUVE)
const A = await poser(p, trait(300, 300, 100, { taille: 5 })), F = await poser(p, formule(450, 260)), T = await poser(p, triangle(300, 560))
await prendre(p, [A, F, T]); await p.keyboard.press('Control+g'); await attendre(200); await vider(p)
// G1. Le bouton du stylet sur un membre : le menu du groupe
let s = await ecran(p, 350, 300)
await stylet.survol(s.x, s.y); await stylet.bas(s.x, s.y, { bouton: 'right' }); await attendre(30); await stylet.haut(s.x, s.y); await attendre(300)
ok((await titres(p)).includes('Options du groupe de 3 objets') && (await sel(p)).length === 3, 'G1) le bouton du stylet sur un membre : le menu du groupe', { t: await titres(p), sel: await sel(p) })
await p.keyboard.press('Escape'); await attendre(150); await vider(p)
// G2. Double appui du stylet sur la formule du groupe : son éditeur
const fb = await p.evaluate(id => { const e = [...document.querySelectorAll('.formule, [data-id]')].find(x => x.dataset?.id === id) ; const r = e?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, F)
const cf = fb ?? await ecran(p, 470, 280)
for (let i = 0; i < 2; i++) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: cf.x, y: cf.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: i + 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: cf.x, y: cf.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: i + 1 })
  await attendre(60)
}
await attendre(500)
const edit = await p.evaluate(() => !!document.querySelector('dialog[open]'))
ok(edit && meme(await sel(p), [F]), 'G2) double appui du stylet sur la formule du groupe : son éditeur, elle seule prise', { edit, sel: await sel(p) })
await p.keyboard.press('Escape'); await attendre(300)
await vider(p)
// G3. Double appui du stylet sur le trait du groupe : le menu du groupe
s = await ecran(p, 350, 300)
for (let i = 0; i < 2; i++) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: s.x, y: s.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: i + 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: s.x, y: s.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: i + 1 })
  await attendre(60)
}
await attendre(500)
ok((await titres(p)).includes('Options du groupe de 3 objets'), 'G3) double appui du stylet sur un trait du groupe : le menu du groupe', await titres(p))
await p.keyboard.press('Escape'); await attendre(150); await vider(p)
// G4. Le groupe tourné de 90° au stylet : la formule tourne (rotation π/2), le triangle aussi, une étape
await prendre(p, [A, F, T])
const n0 = await pile(p)
const t = await tourner(p, stylet, 91, { pendant: () => p.evaluate(() => window.__app.rendu.mesure?.texte) })
const ff = await forme(p, F)
ok(Math.abs(ff.rotation - Math.PI / 2) < 1e-9 && await pile(p) === n0 + 1 && t === '↻ 90°', 'G4) le groupe tourné de 90° (sens horaire) au stylet : la formule a sa rotation, « ↻ 90° », une étape', { rot: ff.rotation, t, d: await pile(p) - n0 })
// G5. Le bout gomme « là où elle passe » sur le trait du groupe : les morceaux restent du groupe
await p.evaluate(async () => {
  const b = window.__app.ui.outils.get('gomme')
  b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }))
  await new Promise(r => setTimeout(r, 200))
  ;[...document.querySelectorAll('[role=menuitemradio]')].find(x => /seulement là où elle passe/.test(x.textContent))?.click()
  await new Promise(r => setTimeout(r, 200))
  window.__app.choisirOutil('selection')
})
const fa = await forme(p, A)
// le trait du groupe, maintenant vertical : ses points
const pa = []; for (let i = 0; i < fa.pts.length; i += 3) pa.push({ x: fa.x + fa.pts[i], y: fa.y + fa.pts[i + 1] })
const mil = pa[Math.floor(pa.length / 2)]
const v = await vue(p)
await p.evaluate(({ a, b }) => {
  const z = document.getElementById('zone')
  const ev = (type, x, y, o) => z.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'pen', isPrimary: true, clientX: x, clientY: y, pressure: 0.5, ...o }))
  ev('pointerdown', a.x, a.y, { button: 5, buttons: 32 })
  for (let k = 1; k <= 12; k++) ev('pointermove', a.x + (b.x - a.x) * k / 12, a.y, { button: -1, buttons: 32 })
  ev('pointerup', b.x, b.y, { button: 5, buttons: 0 })
}, { a: versF(v, { x: mil.x - 40, y: mil.y }), b: versF(v, { x: mil.x + 40, y: mil.y }) })
await attendre(300)
const traits = (await L.formes(p)).filter(g => g.type === 'trait')
ok(traits.length === 2 && traits.every(x => x.groupe === fa.groupe), 'G5) le bout gomme coupe le trait du groupe : deux morceaux, tous deux du groupe', traits.map(x => ({ id: x.id, g: x.groupe })))
// G6. Remettre droit : une image tournée, au stylet par le menu ⋯
const I = await poser(p, image(700, 200, 200, 120))
await prendre(p, [I])
await tourner(p, stylet, 25)
await prendre(p, [I])
await p.evaluate(id => window.__app.ouvrirOptions(window.__app.forme(id)), I); await attendre(300)
const plus = await p.evaluate(() => { const b = [...document.querySelectorAll('.panneau-forme button')].find(b => b.offsetWidth && /^Plus/.test(b.title)); const r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
await stylet.survol(plus.x, plus.y); await stylet.bas(plus.x, plus.y); await attendre(30); await stylet.haut(plus.x, plus.y); await attendre(300)
const rd = await p.evaluate(() => { const b = [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].find(b => b.offsetWidth && /Remettre droit/.test(b.textContent)); const r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
const avantRd = await forme(p, I)
if (rd) { await stylet.survol(rd.x, rd.y); await stylet.bas(rd.x, rd.y); await attendre(30); await stylet.haut(rd.x, rd.y); await attendre(300) }
const apresRd = await forme(p, I)
const cx = f => { const [a, b, c, d] = f.m; return { x: f.x + (a * f.l + c * f.h) / 2, y: f.y + (b * f.l + d * f.h) / 2 } }
ok(!!rd && Math.abs(apresRd.m[1]) < 1e-9 && Math.abs(apresRd.m[2]) < 1e-9 && Math.hypot(cx(apresRd).x - cx(avantRd).x, cx(apresRd).y - cx(avantRd).y) < 1e-6, 'G6) Remettre droit au stylet : rotation nulle, même centre', { rd: !!rd, m: apresRd.m })
await L.fin()
function meme(a, b) { return JSON.stringify([...a].sort()) === JSON.stringify([...b].sort()) }
