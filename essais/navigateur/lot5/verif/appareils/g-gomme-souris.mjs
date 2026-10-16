// Vérification par appareil, lot 5 : la gomme partielle à la SOURIS, ses
// réglages par son menu (clic droit sur son bouton, E), retenus au
// rechargement ; le cercle à la taille choisie ; le trait entier par défaut.
import * as L from './lib/outils.mjs'
const { ok, note, attendre, poser, trait, triangle, image, formule, pile, ecran, glisserF } = L
const ctx = await L.contexte()
let { p, souris } = await L.ouvrir(ctx, 'gomme-souris')
await p.evaluate(L.PAGE_NEUVE)
ok(await p.evaluate(() => localStorage.getItem('mem-gomme')) === null, 'S0) rien de retenu au départ')
// S1. Par défaut : le trait entier
const A = await poser(p, trait(300, 300, 200, { taille: 4 }))
await p.evaluate(() => window.__app.choisirOutil('gomme'))
let s = await ecran(p, 400, 260)
await glisserF(p, souris, s, { x: s.x, y: s.y + 80 })
ok(!(await L.formes(p)).some(f => f.id === A), 'S1) par défaut, la gomme efface le trait entier')
// S2. Le menu au clic droit sur le bouton de la Gomme ; les tailles grisées en mode trait entier
const b = await p.evaluate(() => { const r = window.__app.ui.outils.get('gomme').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
await p.mouse.click(b.x, b.y, { button: 'right' }); await attendre(300)
const etat = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(x => x.offsetWidth).map(x => ({ t: x.querySelector('.libelle')?.textContent ?? x.textContent, coche: x.getAttribute('aria-checked'), gris: x.getAttribute('aria-disabled') })))
ok(etat.length === 5 && etat[0].coche === 'true' && etat.slice(2).every(x => x.gris === 'true'), 'S2) clic droit sur la Gomme : son menu, « trait entier » coché, les tailles grisées', etat)
// choisir « là où elle passe », puis Petite
await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].find(x => /seulement là où/.test(x.textContent)).click()); await attendre(200)
await p.keyboard.press('e'); await attendre(300)
const etat2 = await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].filter(x => x.offsetWidth).map(x => ({ t: x.querySelector('.libelle')?.textContent ?? x.textContent, coche: x.getAttribute('aria-checked'), gris: x.getAttribute('aria-disabled'), focus: document.activeElement === x })))
ok(etat2.length === 5 && etat2[1].coche === 'true' && etat2.slice(2).every(x => x.gris !== 'true') && etat2.some(x => x.focus), 'S2b) E, la Gomme en main : son menu, le focus sur l\'entrée cochée, les tailles actives', etat2)
await p.evaluate(() => [...document.querySelectorAll('.menu-flottant:not([hidden]) .menu-item')].find(x => /Petite/.test(x.textContent)).click()); await attendre(200)
ok(await p.evaluate(() => [localStorage.getItem('mem-gomme'), localStorage.getItem('mem-gomme-taille')].join()) === 'zone,petite', 'S3) retenu : zone, petite', await p.evaluate(() => [localStorage.getItem('mem-gomme'), localStorage.getItem('mem-gomme-taille')]))
// S4. Le cercle de la gomme : 6 px d'écran ; un coup coupe le trait sur 12 px environ
const B = await poser(p, trait(300, 400, 200, { taille: 4 }))
s = await ecran(p, 400, 360)
await souris.survol(s.x, s.y + 20); await attendre(80)
const r = await p.evaluate(() => window.__app.rendu.gomme?.r * window.__app.cam.z)
let n0 = await pile(p)
await glisserF(p, souris, s, { x: s.x, y: s.y + 80 })
const morceaux = (await L.formes(p)).filter(f => f.type === 'trait')
const bouts = morceaux.map(f => { const xs = []; for (let i = 0; i < f.pts.length; i += 3) xs.push(f.x + f.pts[i]); return [Math.min(...xs), Math.max(...xs)] }).sort((a, b) => a[0] - b[0])
const trou = bouts.length === 2 ? bouts[1][0] - bouts[0][1] : null
ok(Math.abs(r - 6) < 1e-6 && morceaux.length === 2 && trou > 12 && trou < 22 && await pile(p) === n0 + 1, 'S4) petite : un cercle de 6 px, le trait coupé en deux (un trou de 12 + l\'épaisseur), une étape', { r, n: morceaux.length, trou, bouts })
// S5. Le rechargement garde le mode et la taille
await p.reload(); await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page)
await attendre(600)
await p.evaluate(() => window.__app.choisirOutil('gomme'))
s = await ecran(p, 400, 360)
await p.mouse.move(s.x, s.y); await p.mouse.move(s.x + 2, s.y + 2); await attendre(100)
const r2 = await p.evaluate(() => window.__app.rendu.gomme?.r * window.__app.cam.z)
ok(Math.abs(r2 - 6) < 1e-6 && await p.evaluate(() => window.__app.ui.outils.get('gomme').title).then(t => /là où elle passe/i.test(t)), 'S5) après rechargement : la gomme « là où elle passe », petite (cercle de 6 px), le titre le dit', { r2, titre: await p.evaluate(() => window.__app.ui.outils.get('gomme').title) })
// S6. Une figure, une image, une formule sous la gomme partielle : rien, et le message une fois
await p.evaluate(L.PAGE_NEUVE); await p.evaluate(() => window.__app.choisirOutil('gomme'))
await p.evaluate(() => { window.__msgs = []; const m = window.__app.ui.message.bind(window.__app.ui); window.__app.ui.message = (t, ...r) => { window.__msgs.push(t); return m(t, ...r) } })
const T = await poser(p, triangle(300, 400)), F = await poser(p, formule(600, 300))
const n1 = (await L.formes(p)).length
s = await ecran(p, 380, 400)
await glisserF(p, souris, { x: s.x, y: s.y - 30 }, { x: s.x, y: s.y + 30 })
s = await ecran(p, 620, 315)
await glisserF(p, souris, { x: s.x - 30, y: s.y }, { x: s.x + 30, y: s.y })
const m = await L.msgs(p)
ok((await L.formes(p)).length === n1 && m.filter(x => /ne coupe que l'écriture/.test(x)).length === 1, 'S6) la gomme partielle passe sur une figure et une formule : rien n\'est effacé, le message une seule fois', m)
await L.fin()
