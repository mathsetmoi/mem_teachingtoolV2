// Vérification par appareil, lot 5 : AU TÉLÉPHONE (portrait et paysage) : les
// menus du lot 5 (⋯ du menu complet avec Ordre, Protéger, Position ; menu
// court d'un verrouillé ; menu de la page et son fond ; menu de la Gomme ;
// Plus → Fond… ; Grouper au menu commun) dans l'écran, boutons de 44 px ; un
// objet pris : le cadre, la pastille, la barre d'actions ; Ctrl/Maj absents.
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, cadre, ecran, vider } = L

/** Ce qui est visible et cliquable dans les menus ouverts : boîte, taille, hors de l'écran ? */
const MESURE = () => {
  const W = innerWidth, H = innerHeight, r = { petits: [], hors: [], menus: [] }
  for (const m of document.querySelectorAll('.menu-flottant, .panneau-forme, .menu-partie, .barre-actions')) {
    if (m.hidden || !m.offsetWidth) continue
    const mb = m.getBoundingClientRect()
    const defile = m.scrollHeight > m.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(m).overflowY)
    r.menus.push({ m: m.getAttribute('aria-label') || m.className, b: [mb.left, mb.top, mb.right, mb.bottom].map(Math.round), defile })
    if (mb.left < -0.5 || mb.top < -0.5 || mb.right > W + 0.5 || mb.bottom > H + 0.5) r.hors.push({ menu: m.getAttribute('aria-label') || m.className, b: [mb.left, mb.top, mb.right, mb.bottom].map(Math.round) })
    for (const b of m.querySelectorAll('button, [role^=menuitem]')) {
      if (!b.offsetWidth) continue
      const st = getComputedStyle(b); if (st.visibility === 'hidden') continue
      const bb = b.getBoundingClientRect()
      const t = (b.getAttribute('aria-label') || b.textContent || '').trim().slice(0, 30)
      if (bb.height < 43.5 || bb.width < 43.5) r.petits.push({ t, l: Math.round(bb.width), h: Math.round(bb.height) })
      // hors du menu visible sans défilement possible
      if (!defile && (bb.bottom > mb.bottom + 1 || bb.top < mb.top - 1)) r.hors.push({ t, b: [bb.top, bb.bottom].map(Math.round), menu: [mb.top, mb.bottom].map(Math.round) })
    }
  }
  return r
}
const toucherCourt = async (d, x, y, ms = 60) => { await d.bas(x, y); await attendre(ms); await d.haut() }
const centre = (p, sel, re) => p.evaluate(({ sel, re }) => { const b = [...document.querySelectorAll(sel)].find(b => b.offsetWidth && [b.getAttribute('aria-label') || '', b.title || '', b.textContent.trim()].some(t => new RegExp(re).test(t))); if (!b) return null; b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, { sel, re })

for (const [l, h, dpr] of [[390, 844, 3], [844, 390, 3], [320, 568, 2], [568, 320, 2], [932, 430, 3]]) {
  const nom = `${l}×${h}`
  console.log('=== téléphone', nom)
  const ctx = await L.contexte({ viewport: { width: l, height: h }, screen: { width: l, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: dpr })
  const { p, doigt } = await L.ouvrir(ctx, nom)
  ok(await p.evaluate(() => document.body.classList.contains('telephone')), `${nom} : body.telephone`)
  await p.evaluate(L.PAGE_NEUVE)
  await p.evaluate(() => { const a = window.__app; a.cam.x = 40; a.cam.y = 40; a.cam.z = 0.6; a.rendu.toutRedessiner(); a.ui.maj() })
  const I = await poser(p, image(150, 200, 200, 140))
  const T1 = await poser(p, trait(150, 420, 120, { taille: 5 })), T2 = await poser(p, trait(150, 460, 120, { taille: 5 }))
  // 1. Le menu complet de l'image, par un toucher sur elle puis « Options »
  let s = await ecran(p, 250, 270)
  await toucherCourt(doigt, s.x, s.y); await attendre(500)
  ok((await sel(p)).includes(I), `${nom} : un toucher prend l'image`, await sel(p))
  let k = await cadre(p)
  const zl = await p.evaluate(() => window.__app.ui.zoneLibre())
  const past = k && L.versF(await L.vue(p), k.cadre.pastille)
  ok(k?.pointeur === 'touch' && past && past.x > zl.x && past.x < zl.x + zl.l && past.y > zl.y && past.y < zl.y + zl.h, `${nom} : le cadre du doigt, la pastille dans la zone libre`, { pointeur: k?.pointeur, past, zl })
  const opt = await centre(p, '.barre-actions button', 'Options')
  if (opt) { await attendre(350); await toucherCourt(doigt, opt.x, opt.y); await attendre(400) }
  const plus = await centre(p, '.panneau-forme button', '^Plus')
  if (plus) { await toucherCourt(doigt, plus.x, plus.y); await attendre(400) }
  let m = await p.evaluate(MESURE)
  const entreesPlus = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(b => b.offsetWidth).map(b => b.querySelector('.libelle')?.textContent ?? b.textContent))
  ok(!!opt && !!plus && entreesPlus.some(t => /premier plan/.test(t)) && !m.hors.length && !m.petits.length, `${nom} : le ⋯ du menu complet d'une image (Ordre, Protéger) dans l'écran, boutons ≥ 44 px`, { opt: !!opt, plus: !!plus, entreesPlus, m })
  await p.screenshot({ path: `${L.V}/captures/p-${nom}-plus-image.png` })
  // « Verrouiller » au doigt
  const ver = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'Verrouiller')
  if (ver) { await toucherCourt(doigt, ver.x, ver.y); await attendre(400) }
  ok((await forme(p, I)).verrou === true, `${nom} : Verrouiller au doigt`, await forme(p, I))
  // 2. L'appui long sur l'image verrouillée : son menu court
  await doigt.bas(s.x, s.y); await attendre(750); await doigt.haut(); await attendre(400)
  m = await p.evaluate(MESURE)
  const dev = await centre(p, 'button', '^Déverrouiller')
  ok(!!dev && !m.hors.length && !m.petits.length, `${nom} : l'appui long ouvre le menu court (Déverrouiller), dans l'écran, boutons ≥ 44 px`, { dev, m })
  await p.screenshot({ path: `${L.V}/captures/p-${nom}-menu-court.png` })
  if (dev) { await toucherCourt(doigt, dev.x, dev.y); await attendre(400) }
  ok(!(await forme(p, I)).verrou, `${nom} : Déverrouiller au doigt`)
  await p.evaluate(() => { const a = window.__app; a.ui.fermerMenus(); a.selection.clear(); a.ui.maj() })
  // 3. Fixer en fond, puis l'appui long sur elle : le menu de la page
  await p.evaluate(id => window.__app.fixerEnFond([id]), I); await attendre(200)
  await doigt.bas(s.x, s.y); await attendre(750); await doigt.haut(); await attendre(400)
  m = await p.evaluate(MESURE)
  const det = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'Détacher l.image du fond')
  ok(!!det && !m.hors.length && !m.petits.length, `${nom} : appui long sur l'image fixée : le menu de la page (Détacher), dans l'écran`, { det, m })
  await p.screenshot({ path: `${L.V}/captures/p-${nom}-menu-page.png` })
  if (det) { await toucherCourt(doigt, det.x, det.y); await attendre(400) }
  ok(!(await forme(p, I)).fixe, `${nom} : Détacher au doigt`)
  await p.evaluate(() => { const a = window.__app; a.ui.fermerMenus(); a.selection.clear(); a.ui.maj() })
  // 4. Grouper : deux traits pris (lasso), « Options », « Grouper »
  await prendre(p, [T1, T2])
  await p.evaluate(() => window.__app.ouvrirOptionsSelection()); await attendre(400)
  const gr = await centre(p, '.panneau-forme button', '^Grouper')
  m = await p.evaluate(MESURE)
  ok(!!gr && !m.hors.length && !m.petits.length, `${nom} : le menu commun a « Grouper », dans l'écran, boutons ≥ 44 px`, { gr, m })
  if (gr) { await toucherCourt(doigt, gr.x, gr.y); await attendre(400) }
  ok((await forme(p, T1)).groupe && (await forme(p, T1)).groupe === (await forme(p, T2)).groupe, `${nom} : Grouper au doigt`)
  await p.evaluate(() => { const a = window.__app; a.ui.fermerMenus(); a.selection.clear(); a.ui.maj() })
  // 5. Le menu de la Gomme : retoucher la Gomme
  const go = await centre(p, '.barre-outils button', '^Gomme')
  if (go) { await toucherCourt(doigt, go.x, go.y); await attendre(400); await toucherCourt(doigt, go.x, go.y); await attendre(400) }
  m = await p.evaluate(MESURE)
  const zone = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'seulement là où elle passe')
  ok(!!zone && !m.hors.length && !m.petits.length, `${nom} : le menu de la Gomme (retoucher la Gomme), dans l'écran, entrées ≥ 44 px`, { zone, m })
  if (zone) { await toucherCourt(doigt, zone.x, zone.y); await attendre(300) }
  const grande = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'Grande')
  if (!grande) { if (go) { await toucherCourt(doigt, go.x, go.y); await attendre(400) } }
  const grande2 = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'Grande')
  if (grande2) { await toucherCourt(doigt, grande2.x, grande2.y); await attendre(300) }
  ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === 'zone' && await p.evaluate(() => localStorage.getItem('mem-gomme-taille')) === 'grande', `${nom} : « là où elle passe », Grande, retenus`, await p.evaluate(() => [localStorage.getItem('mem-gomme'), localStorage.getItem('mem-gomme-taille')]))
  await p.evaluate(() => window.__app.ui.fermerMenus())
  // 6. Plus → Fond…
  const pl = await centre(p, 'button', '^Plus')
  if (pl) { await toucherCourt(doigt, pl.x, pl.y); await attendre(400) }
  const fo = await centre(p, '.menu-flottant:not([hidden]) .menu-item', 'Fond…')
  if (fo) { await toucherCourt(doigt, fo.x, fo.y); await attendre(500) }
  m = await p.evaluate(MESURE)
  const mm = await centre(p, '.menu-fonds:not([hidden]) .fond-choix', 'millimétré')
  ok(!!mm && !m.hors.length, `${nom} : Plus → Fond… : le menu des fonds dans l'écran`, { mm, m })
  await p.screenshot({ path: `${L.V}/captures/p-${nom}-fonds.png` })
  if (mm) { await toucherCourt(doigt, mm.x, mm.y); await attendre(300) }
  ok(await p.evaluate(() => window.__app.fond) === 'millimetre', `${nom} : papier millimétré choisi au doigt`, await p.evaluate(() => window.__app.fond))
  const hors = await L.horsEcran(p)
  ok(!hors.length, `${nom} : à la fin, rien hors de l'écran`, hors)
  await ctx.close()
}
await L.fin()
