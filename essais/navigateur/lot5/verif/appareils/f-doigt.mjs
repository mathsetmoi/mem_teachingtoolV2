// Vérification par appareil, lot 5 : AU DOIGT. A. un iPad (1180 × 820,
// tactile, le doigt qui « déplace ») ; B. un TNI (1920 × 1080, tactile, le
// doigt qui dessine : aucun stylet vu).
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, image, trait, triangle, formule, prendre, sel, forme, pile, cadre, vue, versF, ecran, glisserF, tourner, msgs, vider } = L

const visibles = p => p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item, .panneau-options:not([hidden]) button, .options:not([hidden]) button')].filter(b => b.offsetWidth).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim()))
const boutons = p => p.evaluate(() => [...document.querySelectorAll('button')].filter(b => b.offsetWidth && b.getBoundingClientRect().width > 0).map(b => (b.textContent.trim() || b.getAttribute('aria-label') || '').slice(0, 30)))
const toucherCourt = async (d, x, y, ms = 60) => { await d.bas(x, y); await attendre(ms); await d.haut(); }
const appuiLong = async (d, x, y) => { await d.bas(x, y); await attendre(750); await d.haut(); await attendre(250) }

// =====================================================================
console.log('=== A. iPad, le doigt qui déplace ===')
{
  const ctx = await L.contexte({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, hasTouch: true })
  const { p, doigt } = await L.ouvrir(ctx, 'ipad')
  await p.evaluate(L.PAGE_NEUVE)
  await p.evaluate(() => window.__app.choisirDoigt('deplace'))
  const I = await poser(p, image(300, 250, 300, 200))
  await prendre(p, [I])
  // Un toucher dans le vide d'abord, pour que le dernier pointeur soit le doigt… sans vider la sélection : on survole par un toucher sur l'image
  let c0 = await ecran(p, 450, 350)
  await toucherCourt(doigt, c0.x, c0.y); await attendre(400)
  let k = await cadre(p)
  ok(k?.pointeur === 'touch' && (await sel(p)).includes(I), 'A1) le doigt : cadre aux poignées du doigt', { pointeur: k?.pointeur, sel: await sel(p) })
  // A2. Le coin pris à 18 px de son centre (portée 20 au doigt) : l'image grandit
  let s = await ecran(p, 600, 450), n0 = await pile(p)
  await glisserF(p, doigt, { x: s.x + 13, y: s.y + 12 }, { x: s.x + 113, y: s.y + 79 }, { n: 14, pas: 16 })
  let f = await forme(p, I)
  ok(f.m[0] > 5.5 && Math.abs((f.m[0] * f.l) / (f.m[3] * f.h) - 1.5) < 1e-3 && await pile(p) === n0 + 1, 'A2) le coin au doigt à 18 px : l\'image grandit, proportions gardées, une étape', { m: f.m, d: await pile(p) - n0 })
  await p.evaluate(() => window.__app.annuler()); await attendre(150)
  await prendre(p, [I])
  // A3. La pastille au doigt, 43° → 45° pile
  let t = await tourner(p, doigt, 43, { pendant: () => p.evaluate(() => window.__app.rendu.mesure?.texte), n: 20 })
  f = await forme(p, I)
  const a = Math.atan2(f.m[1], f.m[0]) / L.DEG
  ok(Math.abs(a - 45) < 1e-6, 'A3) la pastille au doigt : 43° → 45° pile', { a, t })
  await p.evaluate(() => window.__app.annuler()); await attendre(150)
  await prendre(p, [I])
  // A4. Le premier doigt sur la pastille tourne déjà, le second se pose et pince : rien ne tourne
  k = await cadre(p)
  const v = await vue(p), P0 = versF(v, k.cadre.pastille), C = versF(v, k.cadre.centre)
  const avant = JSON.stringify(await forme(p, I)); n0 = await pile(p)
  await doigt.toucher('touchStart', [[P0.x, P0.y, 1]]); await attendre(40)
  const R = Math.hypot(P0.x - C.x, P0.y - C.y), a0 = Math.atan2(P0.y - C.y, P0.x - C.x)
  for (let i = 1; i <= 8; i++) { const an = a0 + 30 * L.DEG * i / 8; await doigt.toucher('touchMove', [[C.x + R * Math.cos(an), C.y + R * Math.sin(an), 1]]); await attendre(16) }
  const pendant = await p.evaluate(() => ({ g: window.__app.geste?.type, t: window.__app.rendu.mesure?.texte }))
  const D1 = { x: C.x + R * Math.cos(a0 + 30 * L.DEG), y: C.y + R * Math.sin(a0 + 30 * L.DEG) }
  await doigt.toucher('touchStart', [[D1.x, D1.y, 1], [C.x + 120, C.y + 150, 2]]); await attendre(40)
  for (let i = 1; i <= 8; i++) { await doigt.toucher('touchMove', [[D1.x - i * 6, D1.y - i * 4, 1], [C.x + 120 + i * 8, C.y + 150 + i * 6, 2]]); await attendre(16) }
  const g2 = await p.evaluate(() => window.__app.geste?.type)
  await doigt.toucher('touchEnd', [[C.x + 120 + 64, C.y + 150 + 48, 2]]); await attendre(30)
  for (let i = 1; i <= 6; i++) { await doigt.toucher('touchMove', [[C.x + 184 + i * 6, C.y + 198 - i * 10, 2]]); await attendre(16) }
  await doigt.toucher('touchEnd', []); await attendre(250)
  ok(pendant.g === 'tourner' && g2 === 'pinch' && JSON.stringify(await forme(p, I)) === avant && await pile(p) === n0, 'A4) le doigt qui tourne puis un second qui pince : le pincement, l\'image ne tourne pas, aucune étape', { pendant, g2, pile: await pile(p) - n0 })
  // On remet la vue
  await p.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  // A5. Deux doigts posés sur l'image prise (le premier la saisit) : on pince, elle ne bouge pas
  await prendre(p, [I])
  c0 = await ecran(p, 400, 320)
  const avant5 = JSON.stringify(await forme(p, I))
  await doigt.toucher('touchStart', [[c0.x, c0.y, 1]]); await attendre(30)
  for (let i = 1; i <= 3; i++) { await doigt.toucher('touchMove', [[c0.x + i * 5, c0.y, 1]]); await attendre(16) }
  await doigt.toucher('touchStart', [[c0.x + 15, c0.y, 1], [c0.x + 200, c0.y + 50, 2]]); await attendre(30)
  for (let i = 1; i <= 8; i++) { await doigt.toucher('touchMove', [[c0.x + 15 - i * 5, c0.y, 1], [c0.x + 200 + i * 8, c0.y + 50, 2]]); await attendre(16) }
  await doigt.toucher('touchEnd', []); await attendre(250)
  ok(JSON.stringify(await forme(p, I)) === avant5, 'A5) deux doigts sur l\'image prise : on pince, elle ne bouge pas', { avant5, apres: await forme(p, I) })
  await p.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  // A6. L'appui long sur un triangle verrouillé, sous le Stylo (doigt qui déplace) : son menu court
  const T = await poser(p, triangle(800, 520))
  await prendre(p, [T]); await p.evaluate(id => window.__app.verrouiller(true, [id]), T); await attendre(150)
  await p.evaluate(() => window.__app.choisirOutil('stylo'))
  s = await ecran(p, 840, 470)
  await appuiLong(doigt, s.x, s.y)
  let b = await boutons(p)
  ok(b.some(x => /^Déverrouiller/.test(x)) && (await L.formes(p)).filter(g => g.type === 'trait').length === 0, 'A6) appui long au doigt (Stylo, doigt qui déplace) sur le verrouillé : son menu court, pas d\'encre', b.filter(x => /Verr|Déverr|Copier/.test(x)))
  // Toucher Déverrouiller
  const bd = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.offsetWidth && /^Déverrouiller/.test(b.textContent.trim())); const r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (bd) { await attendre(400); await toucherCourt(doigt, bd.x, bd.y); await attendre(300) }
  ok(!(await forme(p, T)).verrou, 'A6b) Déverrouiller au doigt', await forme(p, T))
  await vider(p)
  // A7. L'appui long sur l'image fixée en fond (Sélection) : le menu de la page, Détacher
  await p.evaluate(() => window.__app.choisirOutil('selection'))
  await p.evaluate(id => window.__app.fixerEnFond([id]), I); await attendre(150)
  await vider(p)
  s = await ecran(p, 380, 300)
  await appuiLong(doigt, s.x, s.y)
  let e = await visibles(p)
  ok(e.some(x => /Détacher l.image du fond/.test(x)), 'A7) appui long au doigt sur l\'image fixée : le menu de la page a Détacher', e)
  const dt = await p.evaluate(() => { const b = [...document.querySelectorAll('.menu-item')].find(b => b.offsetWidth && /Détacher l.image du fond/.test(b.textContent)); const r = b?.getBoundingClientRect(); return r && { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (dt) { await attendre(400); await toucherCourt(doigt, dt.x, dt.y); await attendre(300) }
  ok(!(await forme(p, I)).fixe && (await sel(p)).includes(I), 'A7b) Détacher au doigt : l\'image libre, prise', { f: (await forme(p, I)).fixe, sel: await sel(p) })
  // A8. L'appui long sur une poignée : rien
  await prendre(p, [I])
  await toucherCourt(doigt, ...Object.values(await ecran(p, 450, 350))); await attendre(400)
  s = await ecran(p, 600, 450)
  const av8 = JSON.stringify(await forme(p, I))
  await appuiLong(doigt, s.x, s.y)
  e = await visibles(p)
  ok(JSON.stringify(await forme(p, I)) === av8 && !e.length, 'A8) appui long sur un coin : aucun menu, rien ne change', e)
  // A9. Un groupe : un toucher le prend, un double toucher ouvre le menu du groupe
  await vider(p)
  const G1 = await poser(p, trait(300, 650, 80, { taille: 6 })), G2 = await poser(p, trait(450, 650, 80, { taille: 6 }))
  await prendre(p, [G1, G2]); await p.evaluate(() => window.__app.grouper()); await vider(p)
  s = await ecran(p, 340, 650)
  await toucherCourt(doigt, s.x, s.y); await attendre(500)
  const s1 = await sel(p)
  await toucherCourt(doigt, s.x, s.y, 40); await attendre(80); await toucherCourt(doigt, s.x, s.y, 40); await attendre(400)
  const titre = await p.evaluate(() => [...document.querySelectorAll('[aria-label^="Options du groupe"]')].filter(x => x.offsetWidth).map(x => x.getAttribute('aria-label')))
  ok(s1.length === 2 && titre.length === 1, 'A9) au doigt : un toucher prend le groupe, un double toucher ouvre « Options du groupe de 2 objets »', { s1, titre, sel: await sel(p) })
  await p.keyboard.press('Escape'); await attendre(200)
  await p.screenshot({ path: L.V + '/captures/f-ipad.png' })
  await ctx.close()
}

// =====================================================================
console.log('=== B. TNI, le doigt qui dessine ===')
{
  const ctx = await L.contexte({ viewport: { width: 1920, height: 1080 }, screen: { width: 1920, height: 1080 }, hasTouch: true })
  const { p, doigt } = await L.ouvrir(ctx, 'tni')
  await p.evaluate(L.PAGE_NEUVE)
  ok(await p.evaluate(() => document.body.classList.contains('noms-outils')), 'B0) TNI : les noms sous les outils allumés d\'office')
  const hors = await L.horsEcran(p)
  ok(!hors.length, 'B0b) TNI : rien hors de l\'écran', hors)
  ok(!(await p.evaluate(() => window.__app.doigtDeplace)), 'B0c) le doigt dessine (aucun stylet vu)')
  const I = await poser(p, image(400, 300, 300, 200))
  await prendre(p, [I])
  // B1. À la Sélection, le doigt : les grandes poignées, la pastille tourne de 90°
  let s = await ecran(p, 550, 400)
  await toucherCourt(doigt, s.x, s.y); await attendre(400)
  let k = await cadre(p)
  ok(k?.pointeur === 'touch', 'B1) TNI : les poignées du doigt', k?.pointeur)
  await tourner(p, doigt, 89, { n: 20 })
  let f = await forme(p, I)
  ok(Math.abs(f.m[0]) < 1e-9, 'B1b) TNI : la pastille au doigt, 89° → 90°', f.m)
  await p.evaluate(() => window.__app.annuler()); await attendre(150)
  // B2. Au Stylo, l'image encore prise : le doigt qui dessine, parti de son coin, écrit
  await p.evaluate(() => window.__app.choisirOutil('stylo'))
  await prendre(p, [I])
  s = await ecran(p, 700, 500)
  const n = (await L.formes(p)).length
  await glisserF(p, doigt, s, { x: s.x + 90, y: s.y + 40 }, { n: 12, pas: 16 })
  f = await forme(p, I)
  ok((await L.formes(p)).length === n + 1 && f.m[0] === 5, 'B2) TNI, Stylo : le doigt parti du coin de l\'image écrit', { n: (await L.formes(p)).length - n, m: f.m })
  // B3. L'appui long à la Sélection sur un objet verrouillé : son menu court
  await p.evaluate(() => window.__app.choisirOutil('selection'))
  const T = await poser(p, triangle(1000, 600))
  await p.evaluate(id => window.__app.verrouiller(true, [id]), T); await attendre(150)
  s = await ecran(p, 1040, 560)
  await appuiLong(doigt, s.x, s.y)
  let b = await boutons(p)
  ok(b.some(x => /^Déverrouiller/.test(x)), 'B3) TNI : appui long sur le verrouillé, son menu court', b.filter(x => /Verr|Déverr/.test(x)))
  await p.keyboard.press('Escape'); await attendre(200)
  // B4. La gomme partielle au doigt (doigt qui dessine)
  await p.evaluate(async () => {
    const b = window.__app.ui.outils.get('gomme')
    b.click(); await new Promise(r => setTimeout(r, 120)); b.click(); await new Promise(r => setTimeout(r, 200))
    const it = [...document.querySelectorAll('[role=menuitemradio]')].find(x => /seulement là où elle passe/.test(x.textContent))
    it?.click(); await new Promise(r => setTimeout(r, 200))
  })
  ok(await p.evaluate(() => window.__app.outil) === 'gomme' && await p.evaluate(() => localStorage.getItem('mem-gomme')) === 'zone', 'B4) la gomme « là où elle passe » en main')
  const W = await poser(p, trait(300, 800, 200, { taille: 5 }))
  const nt = (await L.formes(p)).filter(g => g.type === 'trait').length, n0 = await pile(p)
  s = await ecran(p, 400, 760)
  await glisserF(p, doigt, s, { x: s.x, y: s.y + 80 }, { n: 10, pas: 20 })
  await attendre(300)
  const nt2 = (await L.formes(p)).filter(g => g.type === 'trait').length
  ok(nt2 === nt + 1 && await pile(p) === n0 + 1, 'B4b) TNI : le doigt gomme « là où il passe », le trait en deux morceaux, une étape', { nt, nt2, d: await pile(p) - n0 })
  // B5. Un coup rapide (un seul mouvement, loin) au doigt : la coupe se fait quand même
  const W2 = await poser(p, trait(300, 900, 200, { taille: 5 }))
  const nt3 = (await L.formes(p)).filter(g => g.type === 'trait').length
  s = await ecran(p, 380, 860)
  await doigt.bas(s.x, s.y); await attendre(20)
  await doigt.va(s.x + 2, s.y + 80); await attendre(20)
  await doigt.haut(); await attendre(300)
  const nt4 = (await L.formes(p)).filter(g => g.type === 'trait').length
  ok(nt4 === nt3 + 1, 'B5) TNI : un coup de doigt rapide (deux points) coupe quand même', { nt3, nt4 })
  await p.screenshot({ path: L.V + '/captures/f-tni.png' })
  await ctx.close()
}
await L.fin()
