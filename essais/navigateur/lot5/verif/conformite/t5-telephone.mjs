// Point 5 : la mise en page du téléphone ; boutons ≥ 44 px, rien hors de l'écran, dans plusieurs états.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const MESURER = () => {
  const W = innerWidth, H = innerHeight
  const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none' || !e.offsetParent && s.position !== 'fixed') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
  const petits = [], dehors = []
  for (const b of document.querySelectorAll('button, [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], input, select, a[href]')) {
    if (!vis(b)) continue
    if (b.closest('[hidden]')) continue
    const r = b.getBoundingClientRect()
    // un bouton masqué par un ancêtre défilant hors de vue n'est pas compté comme dehors
    const nom = (b.getAttribute('aria-label') || b.title || b.textContent || '').trim().slice(0, 40)
    if (r.width < 43.5 || r.height < 43.5) petits.push(`${nom} ${Math.round(r.width)}×${Math.round(r.height)} [${b.className}]`)
    if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) {
      let p = b.parentElement, defile = false
      while (p) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY + s.overflowX)) { defile = true; break } p = p.parentElement }
      if (!defile) dehors.push(`${nom} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`)
    }
  }
  return { W, H, petits, dehors, html: document.documentElement.scrollWidth > W || document.documentElement.scrollHeight > H }
}
const tailles = [[320, 568], [375, 667], [390, 844], [844, 390], [568, 320], [932, 430]]
for (const [w, h] of tailles) {
  const ctx = await O.contexte({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const { p, doigt } = await O.ouvrir(ctx, `${w}x${h}`)
  const tap = async (sel) => { const r = await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(250) }
  console.log(`\n=== ${w} × ${h} ===`)
  note('repos', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-repos.png` })
  // Plus
  await tap('.barre-haut button[aria-label^="Plus"]')
  note('Plus ouvert', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-plus.png` })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Autres outils
  await tap('.barre-outils button[aria-label^="Autres outils"]')
  note('Autres outils', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-autres.png` })
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Couleur
  await tap('.barre-outils button[aria-label^="Couleur"]')
  note('Couleur', await p.evaluate(MESURER))
  await p.keyboard.press('Escape'); await p.waitForTimeout(150)
  // Un objet pris : barre d'actions et menu complet
  await p.evaluate(O.IMAGES)
  await p.evaluate(() => { const a = window.__app; a.cam.x = 40; a.cam.y = 80; a.cam.z = 1; a.rendu.toutRedessiner() })
  const T = await O.poser(p, O.trait(20, 120, 150))
  await p.evaluate(id => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, T)
  await p.waitForTimeout(300)
  note('barre d\'actions', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-barre.png` })
  // menu complet par Options
  const opt = p.locator('.barre-actions button', { hasText: 'Options' })
  if (await opt.count()) { await p.waitForTimeout(400); const r = await opt.first().boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(300) }
  note('menu complet', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-menu.png` })
  const plus = p.locator('.panneau-forme .ligne button.plus')
  if (await plus.count() && await plus.isVisible()) { const r = await plus.boundingBox(); await p.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(300)
    note('⋯ du menu complet', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t5-${w}x${h}-menuplus.png` }) }
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await O.vider(p)
  // menu de la page : appui long dans le vide
  const z = await O.ecran(p, 100, 300)
  await doigt('touchStart', [[z.x, z.y]]); await p.waitForTimeout(800); await doigt('touchEnd', []); await p.waitForTimeout(300)
  note('menu de la page', await p.evaluate(MESURER))
  await p.screenshot({ path: C + `/captures/t5-${w}x${h}-page.png` })
  await p.keyboard.press('Escape')
  await ctx.close()
}
await O.fin()
