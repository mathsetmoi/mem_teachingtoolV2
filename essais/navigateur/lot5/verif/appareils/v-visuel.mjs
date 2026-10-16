// Vérification par appareil, lot 5 : des captures à regarder (le cadre d'une
// image tournée, d'un groupe, d'une formule tournée, le cadenas au survol, le
// contraste, les noms sous les outils au poste de la classe, le téléphone).
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, cadre, ecran, glisser, tourner, vider } = L
const cap = (p, n) => p.screenshot({ path: `${L.V}/captures/v-${n}.png` })

{
  const ctx = await L.contexte({ viewport: { width: 1366, height: 768 } })
  const { p, souris, stylet } = await L.ouvrir(ctx, 'visuel')
  await p.evaluate(L.PAGE_NEUVE)
  const I = await poser(p, image(250, 200, 240, 160))
  const T = await poser(p, triangle(600, 420))
  const F = await poser(p, formule(800, 200))
  const W = await poser(p, trait(300, 500, 150, { taille: 3 }))
  await prendre(p, [I])
  await p.mouse.move(370, 300)
  await tourner(p, souris, 30)
  await prendre(p, [I]); await p.mouse.move(200, 650); await attendre(200)
  await cap(p, '1-image-tournee')
  // la formule tournée
  await prendre(p, [F])
  await tourner(p, souris, -20, { rayon: 120 })
  await prendre(p, [F]); await attendre(200)
  await cap(p, '2-formule-tournee')
  // groupe : triangle, trait, formule
  await prendre(p, [T, W, F])
  await p.keyboard.press('Control+g'); await attendre(200)
  await p.mouse.move(200, 700); await attendre(200)
  await cap(p, '3-groupe')
  await tourner(p, souris, 45)
  await prendre(p, [T, W, F]); await p.mouse.move(200, 700); await attendre(200)
  await cap(p, '4-groupe-tourne-45')
  const t = await forme(p, T)
  note('triangle après 45° du groupe', { pts: t.pts, x: t.x, y: t.y, noms: t.noms, posNoms: t.posNoms ?? t.placeNoms })
  // le contraste
  await p.evaluate(() => window.__app.choisirContraste(true)); await attendre(300)
  await cap(p, '5-groupe-contraste')
  await p.evaluate(() => window.__app.choisirContraste(false)); await attendre(200)
  // verrouillé + survol : le cadenas
  await vider(p)
  await prendre(p, [I]); await p.keyboard.press('Shift+L'); await attendre(200)
  const s = await ecran(p, 370, 280)
  await p.mouse.move(s.x, s.y); await attendre(300)
  await cap(p, '6-cadenas-survol')
  // survol au stylet
  await p.mouse.move(5, 400); await attendre(100)
  await stylet.survol(s.x + 5, s.y + 5); await attendre(300)
  ok(await p.evaluate(() => !!window.__app.rendu.cadenas), 'V6) le cadenas paraît au survol de la Wacom', await p.evaluate(() => window.__app.rendu.cadenas && JSON.parse(JSON.stringify(window.__app.rendu.cadenas))))
  await cap(p, '6b-cadenas-survol-stylet')
  await ctx.close()
}
{
  // noms sous les outils, choisis au poste de la classe
  for (const [l, h] of [[1366, 768], [1366, 657], [1024, 768], [1024, 657]]) {
    const ctx = await L.contexte({ viewport: { width: l, height: h } })
    await ctx.addInitScript(() => localStorage.setItem('mem-noms-outils', '1'))
    const { p } = await L.ouvrir(ctx, 'noms')
    const hors = await L.horsEcran(p)
    const barre = await p.evaluate(() => { const b = document.querySelector('.barre-outils'); const r = b.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, sh: b.scrollHeight, ch: b.clientHeight, ov: getComputedStyle(b).overflowY } })
    // chaque outil atteignable : dans la barre visible, ou la barre défile
    const outils = await p.evaluate(() => [...document.querySelectorAll('.barre-outils button')].filter(b => b.offsetWidth).map(b => { const r = b.getBoundingClientRect(); return { t: b.title.slice(0, 16), bottom: Math.round(r.bottom) } }))
    const H = h
    const caches = outils.filter(o => o.bottom > H)
    // (Adapté au contrôle final du lot 5 : les pastilles de couleur et les épaisseurs sont
    // dans la barre des outils, qui défile, mais n'ont pas la classe « bouton » ; l'original
    // dans lot5/cf/avant-adaptation.)
    ok(!hors.filter(x => !/barre-outils|bouton|pastille|taille/.test(x.q) || x.b[3] <= H).length && (caches.length === 0 || (barre.sh > barre.ch && /auto|scroll/.test(barre.ov))), `N) ${l}×${h}, noms sous les outils choisis : rien hors d'écran (sinon la barre défile)`, { hors, barre, caches })
    await p.screenshot({ path: `${L.V}/captures/v-noms-${l}x${h}.png` })
    await ctx.close()
  }
}
await L.fin()
