// Sonde : les petits menus (menu ⋯ de la barre du haut, menu de la page,
// menu ⋯ du menu complet, menu de la Gomme, menu des fonds) au poste de la
// classe et ailleurs : dans la fenêtre, et leurs entrées sans se chevaucher
// (une entrée tassée dont le texte déborde sur la suivante).
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, prendre, vider } = L

/** Les menus flottants visibles : leur boîte, défile-t-il, les entrées qui se chevauchent ou débordent */
const MESURER = () => {
  const r = []
  for (const m of document.querySelectorAll('.menu-flottant, .menu-partie, .panneau-forme')) {
    if (m.hidden || !m.offsetWidth) continue
    const b = m.getBoundingClientRect()
    const items = [...m.querySelectorAll(':scope > .menu-item, :scope > * > .menu-item, .menu-item')].filter(i => i.offsetWidth)
    const tasses = []
    for (const i of items) {
      // le contenu de l'entrée dépasse sa boîte (texte tassé)
      const ib = i.getBoundingClientRect()
      let bas = ib.top
      for (const c of i.querySelectorAll('*')) { const cb = c.getBoundingClientRect(); if (cb.height) bas = Math.max(bas, cb.bottom) }
      if (bas > ib.bottom + 1) tasses.push({ t: (i.textContent || '').trim().slice(0, 40), h: Math.round(ib.height), deborde: Math.round(bas - ib.bottom) })
    }
    r.push({ menu: m.getAttribute('aria-label') || m.className, boite: [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom)],
      defile: m.scrollHeight > m.clientHeight + 1, hors: b.left < -0.5 || b.top < -0.5 || b.right > innerWidth + 0.5 || b.bottom > innerHeight + 0.5, n: items.length, tasses })
  }
  return r
}
const fermer = async p => { await p.keyboard.press('Escape'); await attendre(150); await p.keyboard.press('Escape'); await attendre(150) }

const APPAREILS = process.env.REEL ? [
  { nom: 'Chrome sur 1366×768 (fenêtre 1366×657)', o: { viewport: { width: 1366, height: 657 } } },
  { nom: 'Chrome sur 1366×768, barre des favoris (1366×625)', o: { viewport: { width: 1366, height: 625 } } },
  { nom: 'Chrome sur 1024×768 (fenêtre 1024×657)', o: { viewport: { width: 1024, height: 657 } } },
] : [
  { nom: 'classe 1366×768', o: { viewport: { width: 1366, height: 768 } } },
  { nom: 'vidéoprojecteur 1024×768', o: { viewport: { width: 1024, height: 768 } } },
  { nom: '1280×720', o: { viewport: { width: 1280, height: 720 } } },
  { nom: 'iPad 1180×820', o: { viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true } },
  { nom: 'TNI 1920×1080', o: { viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true } },
  { nom: 'téléphone 390×844', o: { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } },
  { nom: 'téléphone 844×390', o: { viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 } },
  { nom: 'téléphone 568×320', o: { viewport: { width: 568, height: 320 }, screen: { width: 568, height: 320 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
  { nom: 'téléphone 320×568', o: { viewport: { width: 320, height: 568 }, screen: { width: 320, height: 568 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 } },
]
const rapport = (nom, quoi, r) => {
  const mauvais = r.filter(m => m.hors || m.tasses.length)
  ok(!mauvais.length, `${nom} : ${quoi}`, mauvais.length ? mauvais : r.map(m => ({ menu: m.menu, boite: m.boite, defile: m.defile })))
}

for (const ap of APPAREILS) {
  console.log('===', ap.nom)
  const ctx = await L.contexte(ap.o)
  const { p } = await L.ouvrir(ctx, ap.nom)
  await p.evaluate(L.PAGE_NEUVE)
  const W = ap.o.viewport.width, H = ap.o.viewport.height
  // De quoi remplir les sections du lot 5 : une image fixée, un verrouillé
  const I = await poser(p, image(200, 150, 160, 100))
  await p.evaluate(id => window.__app.fixerEnFond([id]), I)
  const T = await poser(p, triangle(260, 350))
  await p.evaluate(id => window.__app.verrouiller(true, [id]), T)
  const J = await poser(p, image(330, 160, 120, 90))
  await vider(p)
  // 1. Le menu ⋯ de la barre du haut (ou « Plus » au téléphone)
  await p.evaluate(() => window.__app.ui.boutonFichier.click())
  await attendre(300)
  rapport(ap.nom, 'le menu ⋯ / Plus de la barre du haut', await p.evaluate(MESURER))
  await fermer(p)
  // 2. Le menu de la page, au clic droit (ou appui long) en bas à droite de l'écran
  for (const [x, y] of [[W - 30, H - 30], [W / 2, H / 2], [W - 30, 120]]) {
    await p.evaluate(({ x, y }) => window.__app.ui.ouvrirMenuPage(x, y, window.__app.cam.versMonde(x, y)), { x, y }).catch(e => note('ouvrirMenuPage', e.message))
    await attendre(250)
    rapport(ap.nom, `le menu de la page ouvert en (${Math.round(x)}, ${Math.round(y)})`, await p.evaluate(MESURER))
    await fermer(p)
  }
  // 3. Le menu complet d'une image libre, puis son ⋯
  await prendre(p, [J])
  await p.evaluate(id => window.__app.ouvrirOptions(window.__app.forme(id)), J); await attendre(300)
  await p.evaluate(() => { const b = [...document.querySelectorAll('.panneau-forme button')].find(b => b.offsetWidth && /^Plus/.test(b.title || b.getAttribute('aria-label') || '')); b?.click() })
  await attendre(300)
  rapport(ap.nom, 'le menu complet d\'une image et son ⋯', await p.evaluate(MESURER))
  await p.screenshot({ path: `${L.V}/captures/menus-${ap.nom.replace(/[^\w]+/g, '-')}-plus-image.png` })
  await fermer(p); await vider(p)
  // 4. Le menu de la Gomme
  await p.evaluate(() => window.__app.ui.ouvrirMenuGomme?.(false)); await attendre(250)
  rapport(ap.nom, 'le menu de la Gomme', await p.evaluate(MESURER))
  await fermer(p)
  // 5. Le menu des fonds
  await p.evaluate(() => { const b = document.querySelector('.choix-fond'); if (b && b.offsetWidth) b.click() })
  await attendre(400)
  const fonds = await p.evaluate(MESURER)
  if (fonds.length) rapport(ap.nom, 'le menu des fonds', fonds)
  await fermer(p)
  await ctx.close()
}
await L.fin()
