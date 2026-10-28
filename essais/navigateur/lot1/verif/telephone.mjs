// Téléphone (portrait et paysage) : la barre de gauche défile au doigt, rien ne se chevauche
// Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : la barre des
// outils n'y a plus que sept boutons de 44 px (Stylo, Gomme, Sélection,
// Couleur, Annuler, Rétablir, Autres outils), en bas en portrait, à gauche
// en paysage ; les pastilles des couleurs sont dans le menu « Couleur », en
// 44 × 44 (au lieu de 44 × 34 dans la barre). On mesure donc les boutons
// VISIBLES de la barre (getClientRects, et non la propriété hidden, que la
// feuille de style ne pose pas), puis les pastilles dans leur menu. La
// barre défile encore si elle ne tient pas (elle tient : sept boutons).
import { lancer, ouvrir, noter, bilan, CAM, POSER, N, outils, ligne } from './lib.mjs'
const nav = await lancer()
for (const [l, h, nom] of [[390, 844, 'portrait'], [844, 390, 'paysage']]) {
  const { page, cdp, ctx } = await ouvrir(nav, { viewport: { width: l, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 }, nom)
  const { touche, doigt } = outils(cdp)
  const ev = (f, a) => page.evaluate(f, a)
  await ev(() => window.__app.choisirDoigt('dessine'))
  const geo = await ev(() => {
    const r = s => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)] }
    const o = document.querySelector('.barre-outils')
    const vus = l => l.filter(b => b.getClientRects().length)
    const t = l => vus(l).map(b => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)])
    return { outils: r('.barre-outils'), haut: r('.barre-haut'), zoom: r('.barre-zoom'), sh: o.scrollHeight, ch: o.clientHeight,
      // (gains rapides, lot 16 : les pastilles sont dans une grille, cachée au téléphone)
      tailles: t([...o.querySelectorAll(':scope > button:not(.pastille)')]), pastillesDansLaBarre: vus([...o.querySelectorAll('.grille-pastilles > .pastille')]).length }
  })
  noter(`${nom} : les sept boutons de la barre des outils font 44 × 44 (pas de pastilles dans la barre : elles sont dans « Couleur »)`,
    geo.tailles.length === 7 && geo.tailles.every(([w, h]) => w === 44 && h === 44) && geo.pastillesDansLaBarre === 0, JSON.stringify(geo))
  // Les pastilles, dans le menu « Couleur » : 44 × 44
  await page.tap('.barre-outils > .bouton-couleur'); await page.waitForTimeout(250)
  const pastilles = await ev(() => [...document.querySelectorAll('.menu-couleur .case-couleur.pastille')].map(b => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]))
  noter(`${nom} : les quatre pastilles des couleurs, dans le menu « Couleur », en 44 × 44`, pastilles.length === 4 && pastilles.every(([w, h]) => w === 44 && h === 44), JSON.stringify(pastilles))
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  noter(`${nom} : la barre des outils ne chevauche pas la barre du haut`, !(geo.outils[0] < geo.haut[2] && geo.outils[2] > geo.haut[0] && geo.outils[1] < geo.haut[3] && geo.outils[3] > geo.haut[1]), JSON.stringify(geo))
  await page.screenshot({ path: `tel-${nom}.png` })
  // Faire défiler la barre au doigt
  if (geo.sh > geo.ch) {
    const x = (geo.outils[0] + geo.outils[2]) / 2, y0 = geo.outils[3] - 30
    const c0 = await ev(CAM), n0 = await ev(N), st0 = await ev(() => document.querySelector('.barre-outils').scrollTop)
    await doigt(ligne(x, y0, 0, -150, 10))
    await page.waitForTimeout(400)
    const st1 = await ev(() => document.querySelector('.barre-outils').scrollTop), c1 = await ev(CAM), n1 = await ev(N)
    noter(`${nom} : un glisser du doigt sur la barre la fait défiler, sans toucher à la page`, st1 > st0 && n1 === n0 && JSON.stringify(c1) === JSON.stringify(c0), JSON.stringify({ st0, st1, n0, n1 }))
  }
  await ctx.close()
}
bilan()
await nav.close()
