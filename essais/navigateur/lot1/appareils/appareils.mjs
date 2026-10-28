// Corrections du rapport « appareils » (lot 1) : chaque défaut, à la souris,
// au stylet et au doigt, et ce qui ne devait pas changer.
import { lancer, ouvrir, noter, bilan, outils, ligne, touche, POSER, N } from '../verif/lib.mjs'

const nav = await lancer()
const ev = (page, f, a) => page.evaluate(f, a)
/** Un bloc d'essais : s'il s'arrête sur une erreur (le code sans la correction), on le note et on continue */
async function essai(f) {
  try { await f() } catch (e) { noter('Bloc interrompu par une erreur', false, String(e.message).split('\n')[0]) }
  for (const c of nav.contexts()) await c.close().catch(() => {})
}

const CERCLE = () => {
  const a = window.__app
  const f = a.nouvelleFigure({ type: 'cercle', x: 400, y: 300, r: 100 })
  f.sommets = true; f.noms = ['O']
  a.tableau.nouveauGeste(); a.tableau.poser(a.page, f)
  return f.id
}
const TRIANGLE = () => {
  const a = window.__app
  const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 700, y: 400 }, { x: 1000, y: 400 }, { x: 850, y: 200 }] })
  f.sommets = true; f.noms = ['A', 'B', 'C']
  a.tableau.nouveauGeste(); a.tableau.poser(a.page, f)
  return f.id
}
const etat = (page, id) => ev(page, id => {
  const a = window.__app, f = id && a.forme(id)
  return { sel: [...a.selection], partie: a.partie, x: f?.x, y: f?.y, cam: { x: a.cam.x, y: a.cam.y }, curseur: document.getElementById('zone').style.cursor }
}, id)
const ecranDe = (page, x, y) => ev(page, ([x, y]) => { const a = window.__app, s = a.cam.versEcran(x, y), r = document.getElementById('zone').getBoundingClientRect(); return { x: s.x + r.left, y: s.y + r.top } }, [x, y])
/** Où est le nom n° i d'une figure (écran de la page) */
const placeDuNom = (page, i) => ev(page, i => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect()
  const f = a.formes.find(f => f.type === 'polygone')
  for (let rayon = 14; rayon < 60; rayon += 2) for (let k = 0; k < 72; k++) {
    const s0 = a.cam.versEcran(...[f.x + f.pts[2 * i], f.y + f.pts[2 * i + 1]])
    const p = { x: s0.x + rayon * Math.cos(k * Math.PI / 36), y: s0.y + rayon * Math.sin(k * Math.PI / 36) }
    const pr = a.priseSous(p, { toutes: true })
    if (pr && pr.prise.quoi === 'nom' && pr.prise.i === i) return { x: p.x + r.left, y: p.y + r.top }
  }
  return null
}, i)

// ---------- 1. Le centre d'un cercle, le nom d'un sommet : on prend la figure ----------
await essai(async () => {
  const { page, ctx, cdp } = await ouvrir(nav, {}, 'souris')
  const { stylet } = outils(cdp)
  const c = await ev(page, CERCLE), t = await ev(page, TRIANGLE)
  await ev(page, () => window.__app.choisirOutil('selection'))
  await page.waitForTimeout(100)
  const o = await ecranDe(page, 400, 300)
  await page.mouse.move(o.x, o.y)
  const e0 = await etat(page, c)
  noter('Souris : le curseur est « move » au-dessus du centre O d\'un cercle non sélectionné, et le cercle s\'éclaire', e0.curseur === 'move' && await ev(page, () => window.__app.survol) === c, JSON.stringify(e0))
  await page.mouse.click(o.x, o.y); await page.waitForTimeout(350)
  let e = await etat(page, c)
  noter('Souris : un clic sur O prend le cercle entier (pas son centre)', e.sel.length === 1 && e.sel[0] === c && !e.partie, JSON.stringify(e))
  await page.mouse.click(o.x, o.y); await page.waitForTimeout(350)
  e = await etat(page, c)
  noter('… le clic suivant prend le centre (son menu s\'ouvre)', e.partie?.prise?.quoi === 'sommet' && await ev(page, () => !document.querySelector('.menu-partie').hidden), JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await ev(page, () => window.__app.choisirOutil('selection'))
  // Glisser depuis O d'un cercle non sélectionné : le cercle suit, pas la vue
  const cam0 = (await etat(page, c)).cam
  await page.mouse.move(o.x, o.y); await page.mouse.down(); await page.mouse.move(o.x + 60, o.y + 20, { steps: 6 }); await page.mouse.up()
  await page.waitForTimeout(150)
  e = await etat(page, c)
  noter('Souris : glisser depuis O d\'un cercle non sélectionné déplace le cercle, pas la vue', e.x === 460 && e.y === 320 && e.cam.x === cam0.x && e.cam.y === cam0.y, JSON.stringify(e))
  if (e.x !== 400) { await page.keyboard.press('Control+z'); await page.waitForTimeout(100) }
  // Le nom « A » d'un triangle non sélectionné
  await page.keyboard.press('Escape'); await ev(page, () => window.__app.choisirOutil('selection'))
  const pa = await placeDuNom(page, 0)
  await page.mouse.click(pa.x, pa.y); await page.waitForTimeout(350)
  e = await etat(page, t)
  noter('Souris : un clic sur le nom « A » d\'un triangle non sélectionné prend le triangle', e.sel.length === 1 && e.sel[0] === t && !e.partie, JSON.stringify(e))
  // Maj + clic sur O : le cercle s'ajoute, puis sort
  await page.keyboard.down('Shift'); await page.mouse.click(o.x, o.y); await page.keyboard.up('Shift'); await page.waitForTimeout(150)
  const s2 = (await etat(page, c)).sel
  await page.keyboard.down('Shift'); await page.mouse.click(o.x, o.y); await page.keyboard.up('Shift'); await page.waitForTimeout(150)
  const s3 = (await etat(page, c)).sel
  noter('Maj + clic sur O : le cercle entre dans la sélection, puis en sort', s2.length === 2 && s2.includes(c) && s3.length === 1 && s3[0] === t, JSON.stringify({ s2, s3 }))
  // Multi-sélection : glisser depuis O déplace les deux
  await page.keyboard.down('Shift'); await page.mouse.click(o.x, o.y); await page.keyboard.up('Shift'); await page.waitForTimeout(150)
  const tx0 = await ev(page, t => window.__app.forme(t).x, t)
  await page.mouse.move(o.x, o.y); await page.mouse.down(); await page.mouse.move(o.x + 40, o.y, { steps: 5 }); await page.mouse.up()
  await page.waitForTimeout(150)
  e = await etat(page, c)
  noter('Multi-sélection : glisser depuis O déplace toute la sélection', e.x === 440 && await ev(page, t => window.__app.forme(t).x, t) === tx0 + 40 && e.sel.length === 2, JSON.stringify(e))
  await page.keyboard.press('Escape')
  // Dans le vide : un clic vide la sélection (inchangé) ; glisser trace un cadre, la vue reste (lot 2, M2)
  await ev(page, () => window.__app.choisirOutil('selection'))
  await page.mouse.click(o.x, o.y); await page.waitForTimeout(350)
  const v = await ecranDe(page, 400, 600)
  await page.mouse.click(v.x, v.y); await page.waitForTimeout(350)
  noter('Un clic dans le vide vide toujours la sélection', (await etat(page, c)).sel.length === 0)
  const camA = (await etat(page, c)).cam
  await page.mouse.move(v.x, v.y); await page.mouse.down(); await page.mouse.move(v.x + 50, v.y + 20, { steps: 5 })
  const cadre = await ev(page, () => !!window.__app.rendu.cadreSelection)
  await page.mouse.up()
  const apres = await etat(page, c)
  noter('… et glisser dans le vide trace un cadre, la vue reste (lot 2)', cadre && apres.cam.x === camA.x && apres.cam.y === camA.y && apres.sel.length === 0, JSON.stringify({ cadre, apres }))
  // Au stylet (tablette graphique) : un clic sur O prend le cercle
  await page.keyboard.press('Escape'); await ev(page, () => window.__app.choisirOutil('selection'))
  const ici = await ev(page, c => ({ x: window.__app.forme(c).x, y: window.__app.forme(c).y }), c)
  const o2 = await ecranDe(page, ici.x, ici.y)
  await stylet.bas(o2.x, o2.y); await stylet.haut(o2.x, o2.y); await page.waitForTimeout(350)
  e = await etat(page, c)
  noter('Stylet : un appui sur O prend le cercle entier', e.sel.length === 1 && e.sel[0] === c && !e.partie, JSON.stringify(e))
  // Sous le Stylo, écrire tout près de O ne prend rien (pas de prise sous un outil de dessin)
  await page.keyboard.press('Escape'); await ev(page, () => window.__app.choisirOutil('stylo'))
  const n0 = await ev(page, N)
  await stylet.trace(ligne(o2.x + 4, o2.y + 4, 80, 0, 10)); await page.waitForTimeout(700)
  e = await etat(page, c)
  noter('Stylo : un trait qui part tout près de O s\'écrit, le cercle ne bouge pas', (await ev(page, N)) === n0 + 1 && e.x === ici.x && e.y === ici.y && !e.sel.length, JSON.stringify(e))
  await ctx.close()
})
// Au doigt qui déplace : toucher O choisit le cercle
await essai(async () => {
  const { page, ctx, cdp } = await ouvrir(nav, { hasTouch: true, viewport: { width: 1024, height: 768 } }, 'doigt')
  const { doigt } = outils(cdp)
  await ev(page, () => window.__app.choisirDoigt('deplace'))
  const c = await ev(page, CERCLE)
  await ev(page, () => window.__app.choisirOutil('stylo'))
  const o = await ecranDe(page, 400, 300)
  await doigt([[o.x, o.y]]); await page.waitForTimeout(400)
  let e = await etat(page, c)
  noter('Doigt qui déplace : toucher O d\'un cercle non sélectionné le choisit', e.sel.length === 1 && e.sel[0] === c, JSON.stringify(e))
  // Le doigt qui glisse depuis O d'un cercle non sélectionné déplace la vue (comme sur un objet)
  await doigt([[o.x, o.y + 200]]); await page.waitForTimeout(400)
  const cam0 = (await etat(page, c)).cam
  await doigt(ligne(o.x, o.y, 60, 0, 6)); await page.waitForTimeout(200)
  e = await etat(page, c)
  noter('… glisser au doigt depuis O d\'un cercle non sélectionné déplace la vue, le cercle reste', e.x === 400 && e.cam.x === cam0.x + 60, JSON.stringify(e))
  await ctx.close()
})

// ---------- 2. Le seuil du glisser pour les Formes et le long d'un instrument ----------
await essai(async () => {
  const { page, ctx, cdp } = await ouvrir(nav, { hasTouch: true, viewport: { width: 1366, height: 768 } }, 'seuil')
  const { stylet, doigt } = outils(cdp)
  await ev(page, () => window.__app.choisirDoigt('dessine'))
  for (const [type, pts, qui, attendu] of [
    ['rectangle', [[900, 200], [902, 201], [904, 203], [904, 203]], 'stylet', 0],
    ['cercle', [[900, 300], [903, 301], [905, 302]], 'stylet', 0],
    ['rectangle', [[700, 350], [703, 352], [705, 354]], 'doigt', 0],
    ['cercle', [[700, 250], [703, 252], [705, 254], [705, 254]], 'doigt', 0],
    ['rectangle', ligne(300, 200, 120, 80, 10), 'stylet', 1],
    ['cercle', ligne(300, 500, 60, 0, 10), 'doigt', 1],
  ]) {
    await ev(page, t => { const a = window.__app; a.typeForme = t; a.choisirOutil('forme') }, type)
    const n0 = await ev(page, N)
    let apercu = false
    if (qui === 'stylet') {
      await stylet.bas(...pts[0])
      for (const p of pts.slice(1)) { await stylet.va(...p); apercu ||= await ev(page, () => !!window.__app.rendu.apercu) }
      if (!attendu) await page.waitForTimeout(20)
      await stylet.haut(...pts.at(-1))
    } else {
      const { touche: t } = outils(cdp)
      await t('touchStart', [pts[0]])
      for (const p of pts.slice(1)) { await t('touchMove', [p]); apercu ||= await ev(page, () => !!window.__app.rendu.apercu) }
      await t('touchEnd', [])
    }
    await page.waitForTimeout(150)
    const n = await ev(page, N)
    const d = Math.hypot(pts.at(-1)[0] - pts[0][0], pts.at(-1)[1] - pts[0][1]).toFixed(1)
    noter(`Formes (${type}), ${qui}, ${d} px : ${attendu ? 'la figure est posée' : 'rien n\'est posé, pas d\'aperçu'}`, n === n0 + attendu && (attendu || !apercu), JSON.stringify({ n0, n, apercu }))
  }
  // Le long de la règle
  await ev(page, () => { const a = window.__app; a.choisirOutil('stylo'); a.basculerInstrument('regle') })
  await page.waitForTimeout(200)
  const b = await ev(page, () => { const a = window.__app, e = a.instruments.get('regle'); return a.cam.versEcran(e.x + 100, e.y) })
  let n0 = await ev(page, N)
  await stylet.trace([[b.x, b.y - 2], [b.x + 2, b.y - 2], [b.x + 4, b.y - 2]]); await page.waitForTimeout(200)
  noter('Stylet contre le bord de la règle, 4 px (sous 6 px) : pas de segment', (await ev(page, N)) === n0)
  n0 = await ev(page, N)
  await stylet.trace(ligne(b.x, b.y - 2, 120, 0, 12)); await page.waitForTimeout(200)
  const seg = await ev(page, () => { const f = window.__app.formes.at(-1); return { type: f.type, pts: f.pts } })
  noter('… 120 px le long du bord : le segment est posé (3 cm)', (await ev(page, N)) === n0 + 1 && seg.type === 'polygone' && Math.abs(seg.pts[2]) >= 112, JSON.stringify(seg))
  await ctx.close()
})

// ---------- 3. Le message « Stylet détecté … Changer » reste quand le premier trait est reconnu ----------
await essai(async () => {
  const { page, ctx, cdp } = await ouvrir(nav, { hasTouch: true, viewport: { width: 1024, height: 768 } }, 'detection')
  const { stylet } = outils(cdp)
  const c = [[400, 300], [600, 300], [600, 500], [400, 500], [400, 302]], pts = []
  for (let i = 0; i < 4; i++) for (let k = 0; k < 10; k++) pts.push([c[i][0] + (c[i + 1][0] - c[i][0]) * k / 10, c[i][1] + (c[i + 1][1] - c[i][1]) * k / 10])
  pts.push([400, 302])
  await stylet.bas(...pts[0])
  for (const p of pts.slice(1)) { await stylet.va(...p); await page.waitForTimeout(8) }
  await stylet.haut(...pts.at(-1))
  await page.waitForTimeout(400)
  const lire = () => ev(page, () => { const t = document.querySelector('.toast'); return { visible: t.classList.contains('visible'), lignes: [...t.children].map(l => l.textContent), bouton: !!t.querySelector('button.action') } })
  const a = await lire()
  noter('Premier stylet = un carré : les deux messages se voient, « Changer » compris', a.visible && a.lignes.length === 2 && /^Carré/.test(a.lignes[0]) && /Stylet détecté/.test(a.lignes[1]) && a.bouton, JSON.stringify(a))
  await page.waitForTimeout(3000)
  const b = await lire()
  noter('… 3,4 s plus tard, seul « Stylet détecté … Changer » reste', b.visible && b.lignes.length === 1 && /Stylet détecté/.test(b.lignes[0]) && b.bouton, JSON.stringify(b))
  await page.click('.toast button.action')
  await page.waitForTimeout(200)
  const m = await ev(page, () => ({ toast: document.querySelector('.toast').classList.contains('visible'), menu: !document.querySelector('[aria-label="Rôle du doigt"]').hidden }))
  noter('… « Changer » ouvre le réglage du doigt et ferme le message', !m.toast && m.menu, JSON.stringify(m))
  // Un message ordinaire chasse toujours le précédent ordinaire
  await page.keyboard.press('Escape')
  await ev(page, () => { window.__app.ui.message('un'); window.__app.ui.message('deux') })
  const d = await lire()
  noter('Sans message à action, le dernier message remplace le précédent', d.lignes.length === 1 && d.lignes[0] === 'deux', JSON.stringify(d))
  await ctx.close()
})

// ---------- 4. Un sommet choisi ne survit pas au changement de page ----------
await essai(async () => {
  const { page, ctx } = await ouvrir(nav, {}, 'partie')
  const id = await ev(page, POSER, { x: 300, y: 200, l: 200, h: 120 })
  await ev(page, () => window.__app.choisirOutil('selection'))
  const s = await ecranDe(page, 500, 200)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(350)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(200)
  // (Adapté aux gains rapides du lot 16 : la poubelle a quitté la barre des
  // outils ; « rien à supprimer » se lit à la barre d'actions, cachée sans sélection)
  const poubelle = () => ev(page, () => { const b = document.querySelector('.barre-actions'); return !b || b.hidden || !b.offsetWidth })
  const a = await ev(page, () => window.__app.partie)
  await ev(page, () => window.__app.nouvellePage()); await page.waitForTimeout(150)
  const b = { partie: await ev(page, () => window.__app.partie), grisee: await poubelle(), menu: await ev(page, () => !document.querySelector('.menu-partie').hidden) }
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  await page.keyboard.press('Delete'); await page.waitForTimeout(150)
  const pts = await ev(page, id => window.__app.forme(id).pts, id)
  noter('Sommet choisi puis autre page : rien de choisi, poubelle grisée, menu fermé ; au retour Suppr n\'ôte rien', !!a && !b.partie && b.grisee && !b.menu && pts.length === 8, JSON.stringify({ a, b, pts }))
  await ctx.close()
})

// ---------- 5. Le message de F5 reste sous les menus ----------
// (Retiré avec la séance d'automatismes, qui cachait le tableau : le flash
// se règle maintenant dans une fenêtre, puis se joue sur une page de la séance.)
await essai(async () => {
  const { page, ctx } = await ouvrir(nav, {}, 'seance')
  const z = await ev(page, () => getComputedStyle(document.querySelector('.toast')).zIndex)
  noter('Le message reste sous les menus (z-index 14)', z === '14', z)
  await ctx.close()
})

// ---------- 6. Le message de la figure reconnue, selon le pointeur ----------
await essai(async () => {
for (const qui of ['doigt', 'souris']) {
  const { page, ctx, cdp } = await ouvrir(nav, { hasTouch: qui === 'doigt', isMobile: qui === 'doigt', viewport: { width: 1024, height: 768 } }, qui)
  const { touche: t } = outils(cdp)
  await ev(page, () => window.__app.choisirDoigt('dessine'))
  const c = [[400, 300], [600, 300], [600, 500], [400, 500], [400, 302]], pts = []
  for (let i = 0; i < 4; i++) for (let k = 0; k < 10; k++) pts.push([c[i][0] + (c[i + 1][0] - c[i][0]) * k / 10, c[i][1] + (c[i + 1][1] - c[i][1]) * k / 10])
  pts.push([400, 302])
  if (qui === 'doigt') {
    await t('touchStart', [pts[0]])
    for (const p of pts.slice(1)) { await t('touchMove', [p]); await page.waitForTimeout(8) }
    await t('touchEnd', [])
  } else {
    await page.mouse.move(...pts[0]); await page.mouse.down()
    for (const p of pts.slice(1)) { await page.mouse.move(...p); await page.waitForTimeout(8) }
    await page.mouse.up()
  }
  await page.waitForTimeout(300)
  const r = await ev(page, () => ({ types: window.__app.formes.map(f => f.type), toast: document.querySelector('.toast').textContent }))
  const ok = qui === 'doigt' ? r.toast === 'Carré — ↶ (Annuler) pour garder le tracé à main levée' : r.toast === 'Carré — Ctrl+Z pour garder le tracé à main levée'
  noter(`Carré reconnu, ${qui} : le message ${qui === 'doigt' ? 'renvoie au bouton Annuler' : 'donne Ctrl+Z'}`, ok && r.types[0] === 'polygone', JSON.stringify(r))
  await ctx.close()
}
})

// ---------- 7. « Tout voir » sur un téléphone en paysage, et sur un ordinateur ----------
await essai(async () => {
for (const [w, h, mobile] of [[844, 390, true], [667, 375, true], [1366, 768, false]]) {
  const { page, ctx } = await ouvrir(nav, { viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile }, 'tv' + w)
  await ev(page, POSER, { x: 0, y: 0, l: 1600, h: 900 })
  await ev(page, POSER, { x: 700, y: 30, l: 200, h: 40 })
  await page.waitForTimeout(100)
  // Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : au
  // téléphone (844 × 390 et 667 × 375 au doigt), la barre du zoom est cachée,
  // et « Tout voir » est dans « Plus »
  const barreZoom = await ev(page, () => !!document.querySelector('button[title^="Tout voir"]')?.getClientRects().length)
  if (barreZoom) await page.click('button[title^="Tout voir"]')
  else { await page.click('.barre-haut > .bouton.points'); await page.waitForTimeout(250); await page.click('.menu-flottant[aria-label="Plus"] [data-action="tout-voir"]') }
  await page.waitForTimeout(500)
  const r = await ev(page, () => {
    const a = window.__app, z = a.rendu.scene.getBoundingClientRect(), b = a.boiteDuContenu()
    const R = s => document.querySelector(s).getBoundingClientRect()
    const h = R('.barre-haut'), zo = R('.barre-zoom'), o = R('.barre-outils')
    const p = a.cam.versEcran(b.x, b.y), q = a.cam.versEcran(b.x + b.l, b.y + b.h)
    const c = { l: p.x + z.left, t: p.y + z.top, r: q.x + z.left, b: q.y + z.top }
    const couvre = (k) => c.l < k.right && c.r > k.left && c.t < k.bottom && c.b > k.top
    return { zl: a.ui.zoneLibre(), contenu: c, sousHaut: couvre(h), sousZoom: couvre(zo), sousOutils: couvre(o), z: a.cam.z }
  })
  noter(`${w}×${h}, Tout voir : rien du contenu sous une barre`, !r.sousHaut && !r.sousZoom && !r.sousOutils, JSON.stringify(r))
  if (w === 1366) noter('… sur un ordinateur, la zone libre est celle d\'avant', JSON.stringify(r.zl) === JSON.stringify({ x: 86, y: 82, l: 1264, h: 604 }), JSON.stringify(r.zl))
  await ctx.close()
}
})

const d = bilan()
await nav.close()
process.exit(d.length ? 1 : 0)
