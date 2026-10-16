// Sonde : iPad Pro 12,9 pouces (noms sous les outils allumés d'office),
// portrait et paysage, et un TNI à 1920 × 1080 : les barres ne se chevauchent
// pas, les menus du lot 5 (Gomme, fonds, ⋯) ne passent pas sous la barre du
// haut, le cadre et sa pastille ne sont pas sous une barre.
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, prendre, cadre } = L
const BOITES = () => {
  const r = s => { const e = document.querySelector(s); if (!e || !e.getClientRects().length || e.hidden) return null; const b = e.getBoundingClientRect(); return { s, l: b.left, t: b.top, r: b.right, b: b.bottom } }
  return ['.barre-outils', '.barre-haut', '.barre-zoom', '.barre-classeur'].map(r).filter(Boolean)
}
const inter = (a, b) => a.l < b.r - 0.5 && a.r > b.l + 0.5 && a.t < b.b - 0.5 && a.b > b.t + 0.5
for (const [nom, l, h] of [['iPad Pro portrait', 1024, 1366], ['iPad Pro paysage', 1366, 1024], ['TNI', 1920, 1080]]) {
  const ctx = await L.contexte({ viewport: { width: l, height: h }, screen: { width: l, height: h }, hasTouch: true, isMobile: nom !== 'TNI', deviceScaleFactor: nom === 'TNI' ? 1 : 2 })
  const { p, doigt } = await L.ouvrir(ctx, nom)
  ok(await p.evaluate(() => document.body.classList.contains('noms-outils')), `${nom} : noms sous les outils allumés`)
  const bs = await p.evaluate(BOITES)
  const ch = []
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) if (inter(bs[i], bs[j])) ch.push([bs[i].s, bs[j].s])
  ok(!ch.length, `${nom} : les barres ne se chevauchent pas`, { ch, bs })
  const haut = bs.find(b => b.s === '.barre-haut')
  for (const [quoi, ouvrir] of [['Gomme', () => window.__app.ui.ouvrirMenuGomme(false)], ['fonds', () => document.querySelector('.choix-fond')?.click()], ['⋯', () => window.__app.ui.boutonFichier.click()]]) {
    await p.evaluate(ouvrir); await attendre(400)
    const m = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(m => !m.hidden && m.offsetWidth); const b = m?.getBoundingClientRect(); return b && { l: b.left, t: b.top, r: b.right, b: b.bottom } })
    // (Adapté au contrôle final du lot 5 : le menu des fonds, comme le ⋯, s'ouvre
    // sous son bouton, qui est dans la barre du haut, et passe AU-DESSUS d'elle
    // quand elle a deux rangées (noms sous les outils) : il se voit en entier.
    // Seul le menu de la Gomme, qui part de la barre des outils, ne doit pas la
    // croiser. L'original dans lot5/cf/avant-adaptation.)
    ok(m && !(quoi === 'Gomme' && inter(m, haut)) && m.b <= h && m.t >= 0, `${nom} : le menu ${quoi} dans l'écran, pas sous la barre du haut`, { m, haut })
    await p.keyboard.press('Escape'); await attendre(200)
  }
  await p.evaluate(L.PAGE_NEUVE)
  await p.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.rendu.toutRedessiner(); a.ui.maj() })
  // une image tout en haut à gauche : la pastille passe-t-elle sous la barre du haut ou celle des outils ?
  const I = await poser(p, image(110, 90, 300, 200))
  await prendre(p, [I])
  const s = await L.ecran(p, 250, 190)
  await doigt.bas(s.x, s.y); await attendre(50); await doigt.haut(); await attendre(400)
  const k = await cadre(p)
  const past = k && L.versF(await L.vue(p), k.cadre.pastille)
  const sous = await p.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest('.barre-haut, .barre-outils, .barre-classeur, .barre-actions')?.className ?? null, past ?? { x: 0, y: 0 })
  ok(past && !sous, `${nom} : la pastille d'une image en haut à gauche n'est sous aucune barre`, { past, sous, dessous: k?.cadre.dessous })
  await p.screenshot({ path: `${L.V}/captures/ipadpro-${nom.replace(/ /g, '-')}.png` })
  await ctx.close()
}
await L.fin()
