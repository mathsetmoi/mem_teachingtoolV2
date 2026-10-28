// Un sommet choisi, puis on change de page et on revient : que fait Suppr ?
import { lancer, ouvrir, noter, bilan, POSER } from './lib.mjs'
const nav = await lancer()
const { page } = await ouvrir(nav, {}, 'pc')
const ev = (f, a) => page.evaluate(f, a)
const id = await ev(POSER, { x: 300, y: 200, l: 200, h: 120 })
await ev(() => window.__app.choisirOutil('selection'))
const s = await ev(() => window.__app.cam.versEcran(500, 200))
await page.mouse.click(s.x, s.y); await page.waitForTimeout(350)
await page.mouse.click(s.x, s.y); await page.waitForTimeout(200)
const a = await ev(() => ({ partie: window.__app.partie, menu: !document.querySelector('.menu-partie').hidden }))
await page.keyboard.press('PageDown')        // pas de page suivante : on en crée une
await ev(() => window.__app.nouvellePage()); await page.waitForTimeout(150)
// (Adapté aux gains rapides du lot 16 : la poubelle a quitté la barre des
// outils ; « rien à supprimer » se lit à la barre d'actions, cachée sans sélection)
const b = await ev(() => ({ partie: window.__app.partie, poubelle: (() => { const p = document.querySelector('.barre-actions'); return !p || p.hidden || !p.offsetWidth })() }))
await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
const c = await ev(() => ({ partie: window.__app.partie, menu: !document.querySelector('.menu-partie').hidden, rendu: window.__app.rendu.partie, poubelle: (() => { const p = document.querySelector('.barre-actions'); return !p || p.hidden || !p.offsetWidth })() }))
await page.keyboard.press('Delete'); await page.waitForTimeout(150)
const d = await ev(id => window.__app.forme(id).pts, id)
noter('Sommet choisi, aller-retour de page : plus rien n\'est choisi (rien à supprimer, Suppr n\'ôte pas le sommet)', b.poubelle && !c.partie && d.length === 8, JSON.stringify({ a, b, c, ptsApresSuppr: d }))
bilan()
await nav.close()
