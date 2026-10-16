// Point 5 : au téléphone, les vues plein écran et les fenêtres (trieuse, bibliothèque, revue, Exporter en PDF,
// éditeur de formule, Envoyer vers…, menu des fonds par Plus, menu de la Gomme) : boutons ≥ 44 px, rien hors de l'écran.
import * as O from './lib/outils.mjs'
const { ok, note, C } = O
const MESURER = () => {
  const W = innerWidth, H = innerHeight
  const vis = e => { const s = getComputedStyle(e); if (s.visibility === 'hidden' || s.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.getClientRects().length > 0 }
  const petits = [], dehors = []
  for (const b of document.querySelectorAll('button, [role=menuitem], [role=menuitemradio], [role=menuitemcheckbox], input:not([type=hidden]), select, a[href], [role=button], [role=tab]')) {
    if (!vis(b) || b.closest('[hidden]')) continue
    const r = b.getBoundingClientRect()
    // caché sous un autre (fenêtre modale au-dessus) : ne compte pas
    const cx = Math.min(W - 1, Math.max(0, r.left + r.width / 2)), cy = Math.min(H - 1, Math.max(0, r.top + r.height / 2))
    const dessus = document.elementFromPoint(cx, cy)
    if (dessus && !b.contains(dessus) && !dessus.contains(b) && r.left >= 0 && r.right <= W && r.top >= 0 && r.bottom <= H) continue
    const nom = (b.getAttribute('aria-label') || b.title || b.textContent || b.type || '').trim().replace(/\s+/g, ' ').slice(0, 40)
    if (b.type === 'checkbox' || b.type === 'radio') { const l = b.closest('label'); const rl = l ? l.getBoundingClientRect() : r; if (rl.height < 43.5) petits.push(`[case] ${nom || l?.textContent?.trim().slice(0, 40)} ${Math.round(rl.width)}×${Math.round(rl.height)}`); continue }
    if (b.type === 'text' || b.type === 'search' || b.type === 'number' || b.tagName === 'TEXTAREA') { if (r.height < 43.5) petits.push(`[champ] ${nom} h=${Math.round(r.height)}`); continue }
    if (r.width < 43.5 || r.height < 43.5) petits.push(`${nom} ${Math.round(r.width)}×${Math.round(r.height)} [${String(b.className).slice(0, 40)}]`)
    if (r.left < -0.5 || r.top < -0.5 || r.right > W + 0.5 || r.bottom > H + 0.5) {
      let p = b.parentElement, defile = false
      while (p) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY + s.overflowX) && (p.scrollHeight > p.clientHeight || p.scrollWidth > p.clientWidth)) { defile = true; break } p = p.parentElement }
      if (!defile) dehors.push(`${nom} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`)
    }
  }
  return { petits, dehors, deborde: document.documentElement.scrollWidth > W }
}
for (const [w, h] of [[320, 568], [390, 844], [844, 390]]) {
  const ctx = await O.contexte({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  const { p } = await O.ouvrir(ctx, `${w}x${h}`)
  console.log(`\n=== ${w} × ${h} ===`)
  const fermer = async () => { await p.keyboard.press('Escape'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300) }
  // de quoi revoir
  await p.evaluate(() => { const a = window.__app; a.cam.x = 40; a.cam.y = 100; a.rendu.toutRedessiner() })
  await O.poser(p, O.trait(40, 150, 150)); await O.poser(p, O.triangle(40, 250))
  // trieuse
  await p.evaluate(() => window.__app.ui.ouvrirTrieuse()); await p.waitForTimeout(700)
  note('trieuse', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-trieuse.png` })
  await fermer()
  // bibliothèque
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForTimeout(900)
  note('bibliothèque', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-biblio.png` })
  await fermer()
  // revue
  await p.locator('.barre-haut button[aria-label^="Plus"]').tap(); await p.waitForTimeout(300)
  await p.locator('[data-action="revue"]').first().tap(); await p.waitForTimeout(900)
  note('revue', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-revue.png` })
  await fermer()
  // Exporter en PDF
  await p.keyboard.press('Control+p'); await p.waitForTimeout(600)
  note('Exporter en PDF', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-pdf.png` })
  await fermer()
  // Fond… par Plus
  await p.locator('.barre-haut button[aria-label^="Plus"]').tap(); await p.waitForTimeout(300)
  const fond = p.locator('.menu-plus-tel [data-action="fond"], [role=menu] >> text=Fond…').first()
  if (await fond.count()) { await fond.tap(); await p.waitForTimeout(400); note('menu des fonds', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-fonds.png` }) }
  await fermer()
  // Gomme : menu
  const g = p.locator('.barre-outils button[title^="Gomme"]').first()
  await g.tap(); await p.waitForTimeout(300); await g.tap(); await p.waitForTimeout(400)
  note('menu de la Gomme', await p.evaluate(MESURER)); await p.screenshot({ path: C + `/captures/t12-${w}x${h}-gomme.png` })
  await fermer()
  await ctx.close()
}
await O.fin()
