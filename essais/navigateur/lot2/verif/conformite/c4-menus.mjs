// Conformité lot 2 : menus d'une formule et de plusieurs objets, majorité dans le cadre,
// Maj + glisser, Ajouter au doigt, stylet sur écran (appui long), double-clic au stylet
import { contexte, charger, etat, barre, boiteEcran, outil, poser, vider, verifier, note, fin, msgsDepuis, attendre } from './lib.mjs'

// ===== Souris =====
{
  const ctx = await contexte()
  const { page, stylet, cdp } = await charger(ctx, 'menus')
  const m = page.mouse
  await outil(page, 'selection')
  const F = await poser(page, { type: 'formule', x: 300, y: 300, latex: 'x^2+1' })
  await page.waitForTimeout(200)
  let b = await boiteEcran(page, F)
  note('formule', b)
  await m.click((b.left + b.right) / 2, (b.top + b.bottom) / 2, { button: 'right' })
  await page.waitForTimeout(80)
  let e = await etat(page)
  const items = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne > button')].map(x => x.textContent || x.getAttribute('aria-label')))
  verifier('formule : clic droit ouvre son menu (Modifier, Dupliquer, Copier, Supprimer)', e.panneau && items.includes('Modifier') && items.includes('Dupliquer') && items.includes('Copier') && items.some(t => /Supprimer/.test(t)), { items, label: e.panneauLabel })
  await page.keyboard.press('Escape')
  // barre d'une formule seule : Modifier en tête
  await m.click((b.left + b.right) / 2, (b.top + b.bottom) / 2)
  let br = await barre(page)
  verifier('barre d\'une formule : Modifier, Dupliquer, Copier, Supprimer, Options', br && br.boutons.map(x => x.libelle).join('|') === 'Modifier|Dupliquer|Copier|Supprimer|Options', br?.boutons.map(x => x.libelle))
  // double-clic : éditeur
  await m.dblclick((b.left + b.right) / 2, (b.top + b.bottom) / 2)
  await page.waitForTimeout(200)
  const dlg = await page.evaluate(() => !!document.querySelector('dialog[open].dialogue-formule'))
  e = await etat(page)
  verifier('formule : double-clic ouvre l\'éditeur, la barre se cache', dlg && !e.barre, { dlg, barre: e.barre })
  await page.evaluate(() => { const d = document.querySelector('dialog[open]'); [...d.querySelectorAll('button')].find(x => x.textContent === 'Annuler')?.click() })
  await page.waitForTimeout(150)

  // ---- plusieurs objets ----
  await vider(page)
  const A = await poser(page, { type: 'trait', x: 300, y: 300, l: 100 })
  const B = await poser(page, { type: 'triangle', x: 500, y: 300 })
  const C = await poser(page, { type: 'trait', x: 300, y: 450, l: 100 })
  await page.keyboard.press('Control+a')
  e = await etat(page)
  br = await barre(page)
  verifier('Ctrl+A : 3 objets, barre « Supprimer les 3 objets »', e.sel.length === 3 && br?.boutons.some(x => x.titre === 'Supprimer les 3 objets (Suppr)'), br?.boutons.map(x => x.titre))
  b = await boiteEcran(page, A)
  await m.click((b.left + b.right) / 2, (b.top + b.bottom) / 2, { button: 'right' })
  await page.waitForTimeout(80)
  e = await etat(page)
  const itemsM = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne > *')].map(x => x.textContent || x.getAttribute('aria-label')))
  verifier('plusieurs : clic droit → « 3 objets », Couleur/épaisseur, Dupliquer, Copier, Couper, Supprimer', e.panneau && e.sel.length === 3 && itemsM[0] === '3 objets' && ['Dupliquer', 'Copier', 'Couper'].every(t => itemsM.includes(t)) && itemsM.some(t => /Supprimer les 3/.test(t)) && itemsM.some(t => /Couleur/.test(t)), itemsM)
  // couleur en une étape
  await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne > button')].find(x => /Couleur/.test(x.textContent)).click())
  await page.waitForTimeout(60)
  const pastilles = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .section .pastille')].map(x => x.getAttribute('aria-label')))
  note('pastilles', pastilles)
  await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .section .pastille')].find(x => x.getAttribute('aria-pressed') !== 'true' && !/noir/i.test(x.getAttribute('aria-label'))).click())
  await page.waitForTimeout(60)
  const couleurs = await page.evaluate(() => window.__app.formes.map(f => f.couleur))
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+z')
  const couleurs2 = await page.evaluate(() => window.__app.formes.map(f => f.couleur))
  verifier('plusieurs : une couleur pour tous, un seul Ctrl+Z la rend', new Set(couleurs).size === 1 && couleurs2.join() !== couleurs.join() && new Set(couleurs2).size === 1, { couleurs, couleurs2 })

  // ---- majorité dans le cadre ----
  await vider(page)
  const L = await poser(page, { type: 'trait', x: 300, y: 300, l: 200 })
  b = await boiteEcran(page, L)
  // 40 % dedans
  await m.move(b.left - 20, b.top - 30); await m.down(); await m.move(b.left + 0.4 * (b.right - b.left), b.bottom + 30, { steps: 5 }); await m.up()
  e = await etat(page)
  verifier('cadre sur 40 % d\'un trait : pas pris', !e.sel.includes(L), e.sel)
  await m.move(b.left - 20, b.top - 30); await m.down(); await m.move(b.left + 0.6 * (b.right - b.left), b.bottom + 30, { steps: 5 }); await m.up()
  e = await etat(page)
  verifier('cadre sur 60 % d\'un trait : pris', e.sel.includes(L), e.sel)
  // Maj + glisser ajoute
  const L2 = await poser(page, { type: 'trait', x: 300, y: 500, l: 100 })
  const b2 = await boiteEcran(page, L2)
  await page.keyboard.down('Shift')
  await m.move(b2.left - 20, b2.top - 30); await m.down(); await m.move(b2.right + 20, b2.bottom + 30, { steps: 5 }); await m.up()
  await page.keyboard.up('Shift')
  e = await etat(page)
  verifier('Maj + glisser ajoute à la sélection', e.sel.includes(L) && e.sel.includes(L2), e.sel)
  await page.keyboard.down('Control')
  await page.evaluate(id => { window.__app.selection.clear(); window.__app.selection.add(id); window.__app.ui.maj() }, L)
  await m.move(b2.left - 20, b2.top - 30); await m.down(); await m.move(b2.right + 20, b2.bottom + 30, { steps: 5 }); await m.up()
  await page.keyboard.up('Control')
  e = await etat(page)
  verifier('Ctrl + glisser ajoute à la sélection', e.sel.includes(L) && e.sel.includes(L2), e.sel)

  // ---- petite figure dans un grand cadre ----
  await vider(page)
  await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  const R = await poser(page, { type: 'rect', x: 200, y: 150, l: 700, h: 450 })
  const t = await poser(page, { type: 'triangle', x: 400, y: 300, l: 120, h: 100 })
  const bt = await boiteEcran(page, t), bR = await boiteEcran(page, R)
  await m.click(bt.left + 25, bt.top + 30)
  e = await etat(page)
  verifier('clic dans le petit triangle (dans le grand cadre) : le triangle', e.sel.length === 1 && e.sel[0] === t, { sel: e.sel, t, R })
  await m.click(bR.right - 60, bR.bottom - 60)
  e = await etat(page)
  verifier('clic dans le vide du grand cadre : le cadre', e.sel.length === 1 && e.sel[0] === R, { sel: e.sel, R })
  // glisser depuis l'intérieur du grand cadre déjà sélectionné : le déplace
  const x0 = (await page.evaluate(id => window.__app.formes.find(f => f.id === id).pts?.[0]?.x ?? window.__app.formes.find(f => f.id === id).x, R))
  await m.move(bR.right - 60, bR.bottom - 60); await m.down(); await m.move(bR.right - 20, bR.bottom - 40, { steps: 5 }); await m.up()
  const x1 = (await page.evaluate(id => { const f = window.__app.formes.find(f => f.id === id); return f.pts?.[0]?.x ?? f.x }, R))
  note('cadre déplacé ?', x0, x1)
  // non sélectionné : glisser depuis l'intérieur entoure
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  const bt2 = await boiteEcran(page, t)
  await m.move(bt2.left - 30, bt2.top - 30); await m.down(); await m.move(bt2.right + 30, bt2.bottom + 30, { steps: 6 }); await m.up()
  e = await etat(page)
  verifier('glisser depuis l\'intérieur du grand cadre non sélectionné : cadre de sélection autour du triangle', e.sel.length === 1 && e.sel[0] === t, { sel: e.sel })

  // ---- clic sur le sommet d'une figure non sélectionnée (e) ----
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  const sommet = await page.evaluate(id => { const a = window.__app, f = a.formes.find(x => x.id === id), z = a.rendu.scene.getBoundingClientRect(); const p = a.sommetsDe(f)[0]; const s = a.cam.versEcran(p.x, p.y); return { x: z.left + s.x, y: z.top + s.y } }, t)
  await m.click(sommet.x, sommet.y)
  e = await etat(page)
  const partie = await page.evaluate(() => window.__app.partie)
  verifier('(e) clic sur le sommet d\'une figure non sélectionnée : prend la figure', e.sel.includes(t) && !partie, { sel: e.sel, partie })

  // ---- Double-clic au stylet (Wacom) ----
  await vider(page)
  const W = await poser(page, { type: 'trait', x: 300, y: 300, l: 200 })
  const bw = await boiteEcran(page, W)
  const cx = (bw.left + bw.right) / 2, cy = (bw.top + bw.bottom) / 2
  await stylet.survol(cx, cy)
  await stylet.bas(cx, cy, { clickCount: 1 }); await stylet.haut(cx, cy, { clickCount: 1 })
  await attendre(60)
  await stylet.bas(cx, cy, { clickCount: 2 }); await stylet.haut(cx, cy, { clickCount: 2 })
  await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Wacom : double-clic à la Sélection ouvre le menu complet', e.panneau, e)
  await page.keyboard.press('Escape')
}

// ===== Doigt : Ajouter, doigt qui déplace, appui long seuil =====
{
  const ctx = await contexte({ hasTouch: true })
  const { page, touche, stylet } = await charger(ctx, 'doigt2')
  const toucher = async (x, y, ms = 60) => { await touche('touchStart', [[x, y, 1]]); await attendre(ms); await touche('touchEnd', []); await page.waitForTimeout(400) }
  await outil(page, 'selection')
  const A = await poser(page, { type: 'trait', x: 300, y: 300, l: 150 })
  const B = await poser(page, { type: 'trait', x: 300, y: 450, l: 150 })
  const C = await poser(page, { type: 'trait', x: 600, y: 450, l: 150 })
  const ba = await boiteEcran(page, A), bb = await boiteEcran(page, B), bc = await boiteEcran(page, C)
  await toucher((ba.left + ba.right) / 2, (ba.top + ba.bottom) / 2)
  let br = await barre(page)
  const aj = br.boutons.find(x => x.libelle === 'Ajouter')
  await toucher(aj.x, aj.y)
  br = await barre(page)
  verifier('Ajouter : bouton enfoncé (aria-pressed=true)', br?.boutons.find(x => x.libelle === 'Ajouter')?.pressed === 'true', br?.boutons.map(x => [x.libelle, x.pressed]))
  await toucher((bb.left + bb.right) / 2, (bb.top + bb.bottom) / 2)
  let e = await etat(page)
  verifier('Ajouter : le toucher suivant ajoute', e.sel.length === 2 && e.sel.includes(A) && e.sel.includes(B), e.sel)
  // lasso ajoute aussi
  const tour = []
  for (let k = 0; k <= 24; k++) { const a = (k / 24) * 2 * Math.PI; tour.push([(bc.left + bc.right) / 2 + 110 * Math.cos(a), (bc.top + bc.bottom) / 2 + 40 * Math.sin(a)]) }
  await touche('touchStart', [[tour[0][0], tour[0][1], 1]])
  for (const p of tour.slice(1)) { await touche('touchMove', [[p[0], p[1], 1]]); await attendre(16) }
  await touche('touchEnd', []); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ajouter : le lasso ajoute', e.sel.length === 3, e.sel)
  await toucher(1100, 650)
  e = await etat(page)
  br = await barre(page)
  verifier('Ajouter : un toucher dans le vide l\'éteint et vide la sélection', !e.sel.length && !(await page.evaluate(() => window.__app.ajoutTactile)), e.sel)

  // appui long à 400 ms : rien
  await touche('touchStart', [[(ba.left + ba.right) / 2, (ba.top + ba.bottom) / 2, 1]]); await attendre(400)
  e = await etat(page)
  verifier('appui de 400 ms : pas encore de menu', !e.panneau, e.panneau)
  await touche('touchEnd', []); await page.waitForTimeout(400)
  // appui long qui bouge de 12 px : rien
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  await touche('touchStart', [[1000, 600, 1]]); await attendre(100)
  await touche('touchMove', [[1012, 600, 1]]); await attendre(600)
  e = await etat(page)
  verifier('appui qui glisse de 12 px puis tient : pas de menu', !e.menuPage && !e.panneau, e)
  await touche('touchEnd', []); await page.waitForTimeout(200)

  // doigt qui déplace, sous le Stylo : toucher l'intérieur d'un triangle le prend, la barre paraît
  await page.evaluate(() => window.__app.choisirDoigt('deplace'))
  const Tri = await poser(page, { type: 'triangle', x: 800, y: 150, l: 250, h: 200 })
  await outil(page, 'stylo')
  const bt = await boiteEcran(page, Tri)
  await toucher(bt.left + 40, bt.top + 60)
  e = await etat(page)
  verifier('doigt qui déplace (Stylo) : toucher l\'intérieur d\'un triangle le prend, barre avec Ajouter', e.sel.includes(Tri) && e.barre && (await barre(page))?.boutons.some(x => x.libelle === 'Ajouter'), e)
  // appui long du doigt qui déplace sous le Stylo
  await touche('touchStart', [[bt.left + 40, bt.top + 60, 1]]); await attendre(650)
  e = await etat(page)
  verifier('doigt qui déplace (Stylo) : appui long ouvre le menu complet', e.panneau, e)
  await touche('touchEnd', []); await page.waitForTimeout(200)
  await toucher(1200, 700)
  // Stylet sur l'écran (iPad) à la Sélection : appui long
  await outil(page, 'selection')
  await page.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
  await stylet.bas((ba.left + ba.right) / 2, (ba.top + ba.bottom) / 2); await attendre(650)
  e = await etat(page)
  verifier('stylet sur l\'écran, Sélection : appui long ouvre le menu', e.panneau, e)
  await stylet.haut((ba.left + ba.right) / 2, (ba.top + ba.bottom) / 2); await page.waitForTimeout(200)
  const ms = await msgsDepuis(page, 0)
  note('messages', ms)
  // stylet sur l'écran au Stylo : jamais
  await page.keyboard.press('Escape')
  await outil(page, 'stylo')
  await stylet.bas(1000, 300); await attendre(700)
  e = await etat(page)
  verifier('stylet sur l\'écran, Stylo : appui tenu n\'ouvre rien', !e.panneau && !e.menuPage, e)
  await stylet.haut(1000, 300); await page.waitForTimeout(450)
}
await fin()
