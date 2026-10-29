// Téléphone (portrait et paysage) : la trieuse, son menu, la corbeille, les
// fenêtres Envoyer vers… et PDF, l'annonce, le message : rien hors de l'écran.
import { ouvrir, preparer, etat, carte, centre, attendreOuverte, verifier, pause, fin, D } from './lib.mjs'

const HORS = () => {
  const W = window.innerWidth, H = window.innerHeight, hors = []
  // Un menu qui défile (en paysage, le menu d'une vignette a plus d'entrées
  // que l'écran n'a de hauteur) : ses entrées se lisent en le faisant
  // défiler ; c'est le menu lui-même qui doit tenir dans l'écran (mis à jour
  // au contrôle final)
  const defile = m => !!m && m.scrollHeight > m.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(m).overflowY)
  for (const el of document.querySelectorAll('.trieuse *, dialog[open] *, .menu-flottant:not([hidden]), .menu-flottant:not([hidden]) *, .toast.visible *, .annonce-page:not([hidden])')) {
    const menu = el.parentElement?.closest('.menu-flottant')
    if (menu && defile(menu)) continue
    // La vue de la corbeille défile aussi (lot 17 : sa note et sa case
    // « 30 jours » passent avant les lignes ; en paysage, toucher un bouton
    // du bas la fait défiler) : ce qui y est défilé hors de l'écran en
    // hauteur ne compte pas ; la largeur, si
    const corbeille = el.parentElement?.closest('.trieuse-corbeille')
    const seulementLargeur = !!corbeille && defile(corbeille)
    if (el.closest('[hidden]') || el.closest('.trieuse-grille') || el.closest('.corbeille-grille') || el.closest('.envoi-liste') || getComputedStyle(el).display === 'none' || el.closest('.trieuse')?.hidden) continue
    const r = el.getBoundingClientRect()
    if (!r.width || !r.height) continue
    if (r.left < -0.5 || r.right > W + 0.5 || (!seulementLargeur && (r.top < -0.5 || r.bottom > H + 0.5))) hors.push(`${el.tagName}.${el.className?.baseVal ?? el.className} ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)}`)
  }
  return { hors: hors.slice(0, 8), n: hors.length, sw: document.documentElement.scrollWidth, W }
}
for (const [nom, vp] of [['portrait', { width: 390, height: 844 }], ['paysage', { width: 844, height: 390 }], ['petit', { width: 360, height: 640 }]]) {
  const { ctx, page } = await ouvrir({ viewport: vp, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, nom)
  const P = await preparer(page, 9, { ici: 0, noms: { 0: 'Exercice 12 p. 84 : démontrer que le triangle ABC est rectangle en A' } })
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[1]) })
  await pause(150)
  let h = await page.evaluate(HORS)
  const ann = await page.evaluate(() => { const a = document.querySelector('.annonce-page'), r = a.getBoundingClientRect(), o = document.querySelector('.barre-outils, #outils, .outils')?.getBoundingClientRect(); return { vu: !a.hidden, r: [r.left, r.top, r.right, r.bottom].map(Math.round) } })
  verifier(`${nom} : l'annonce du numéro dans l'écran`, ann.vu && h.n === 0, { ann, h })
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[0]) }); await pause(1500)
  const rang = await centre(page, '.rang')
  await page.touchscreen.tap(rang.x, rang.y); await attendreOuverte(page); await pause(600)
  h = await page.evaluate(HORS)
  const lisible = await page.evaluate(() => { const c = document.querySelector('.trieuse .carte .carte-image').getBoundingClientRect(), n = getComputedStyle(document.querySelector('.carte-numero')).fontSize; return { l: Math.round(c.width), h: Math.round(c.height), n } })
  verifier(`${nom} : la trieuse tient dans l'écran ; vignettes de ${lisible.l} × ${lisible.h} px`, h.n === 0 && h.sw <= h.W && lisible.l >= 140, { h, lisible })
  await page.screenshot({ path: D + `/tel-${nom}-trieuse.png` })
  // Le menu d'une vignette (le bouton ⋯ de la dernière carte visible en bas)
  const opts = await page.evaluate(() => { const o = [...document.querySelectorAll('.trieuse .carte-options')], g = document.querySelector('.trieuse-grille').getBoundingClientRect(); const v = o.filter(x => { const r = x.getBoundingClientRect(); return r.bottom < g.bottom && r.top > g.top }); const r = v.at(-1).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await page.touchscreen.tap(opts.x, opts.y); await pause(250)
  h = await page.evaluate(HORS)
  const m = await page.evaluate(() => { const m = document.querySelector('.menu-vignette'); const r = m.getBoundingClientRect(); return { vu: !m.hidden, r: [r.left, r.top, r.right, r.bottom].map(Math.round), defile: m.scrollHeight > m.clientHeight + 1, oy: getComputedStyle(m).overflowY } })
  verifier(`${nom} : le menu d'une vignette (⋯ en bas) dans l'écran`, m.vu && h.n === 0, { m, h })
  await page.screenshot({ path: D + `/tel-${nom}-menu.png` })
  await page.keyboard.press('Escape'); await pause(100)
  // Choisir plusieurs, deux pages, le bandeau
  await page.locator('.trieuse-choisir').tap(); await pause(100)
  await page.touchscreen.tap((await carte(page, 1)).x, (await carte(page, 1)).y); await pause(100)
  await page.touchscreen.tap((await carte(page, 2)).x, (await carte(page, 2)).y); await pause(150)
  h = await page.evaluate(HORS)
  const e = await etat(page)
  verifier(`${nom} : « Choisir plusieurs » puis deux touchers : 2 pages choisies, le bandeau tient`, e.choisies.length === 2 && h.n === 0, { ch: e.choisies.length, h })
  await page.screenshot({ path: D + `/tel-${nom}-choix.png` })
  await page.locator('.trieuse-choix button', { hasText: 'Supprimer' }).tap(); await pause(200)
  h = await page.evaluate(HORS)
  verifier(`${nom} : Supprimer (bandeau) : 7 pages, le message dans l'écran`, (await etat(page)).pages.length === 7 && h.n === 0, h)
  await page.screenshot({ path: D + `/tel-${nom}-message.png` })
  // La corbeille
  await page.locator('.trieuse-bouton-corbeille').tap(); await pause(500)
  h = await page.evaluate(HORS)
  verifier(`${nom} : la corbeille tient dans l'écran`, h.n === 0, h)
  await page.screenshot({ path: D + `/tel-${nom}-corbeille.png` })
  await page.locator('.trieuse-corbeille button', { hasText: 'Supprimer définitivement' }).first().tap(); await pause(300)
  h = await page.evaluate(HORS)
  verifier(`${nom} : la question de la suppression définitive dans l'écran`, (await etat(page)).dialog.length === 1 && h.n === 0, h)
  await page.screenshot({ path: D + `/tel-${nom}-question.png` })
  await page.keyboard.press('Escape'); await pause(100)
  await page.keyboard.press('Escape'); await pause(100)
  // Exporter en PDF (bandeau) : la fenêtre
  await page.locator('.trieuse-actions > button', { hasText: 'Exporter en PDF' }).tap(); await pause(300)
  h = await page.evaluate(HORS)
  verifier(`${nom} : la fenêtre « Exporter en PDF » dans l'écran`, (await etat(page)).dialog.some(c => c.includes('pdf')) && h.n === 0, h)
  await page.screenshot({ path: D + `/tel-${nom}-pdf.png` })
  await page.keyboard.press('Escape'); await pause(100)
  await page.keyboard.press('Escape'); await pause(200)
  // Envoyer vers… : un objet pris (toucher le trait au doigt en Sélection)
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.toutSelectionner() }); await pause(300)
  const opt = await page.evaluate(() => [...document.querySelectorAll('.barre-actions button')].map(b => b.getAttribute('aria-label') || b.textContent))
  await page.locator('.barre-actions button', { hasText: 'Options' }).tap(); await pause(300)
  // « Envoyer vers… » est dans le petit menu ⋯ (Plus) du menu complet depuis les corrections « regressions »
  await page.locator('.panneau-forme .ligne button.plus').tap(); await pause(300)
  await page.locator('.menu-plus .menu-item', { hasText: 'Envoyer vers' }).first().tap(); await pause(400)
  h = await page.evaluate(HORS)
  verifier(`${nom} : barre d'actions → Options → Envoyer vers… : la fenêtre dans l'écran`, (await etat(page)).dialog.some(c => c.includes('envoi')) && h.n === 0, { opt, h })
  await page.screenshot({ path: D + `/tel-${nom}-envoi.png` })
  await page.keyboard.press('Escape')
  await ctx.close()
}
await fin()
