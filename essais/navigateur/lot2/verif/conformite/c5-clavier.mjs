// Conformité lot 2 : réglage du flash d'automatismes et Ctrl+Z/Ctrl+V, collage d'une page à l'autre,
// Ctrl+X et collage multiple en une étape, la vue d'une page rendue
import { contexte, charger, etat, barre, boiteEcran, outil, poser, vider, verifier, note, fin, msgsDepuis, attendre } from './lib.mjs'

const ctx = await contexte()
const { page } = await charger(ctx, 'clavier')

// ---- Réglage d'un flash d'automatismes ouvert : Ctrl+Z ne doit rien changer ----
// (avant : la séance d'automatismes cachait le tableau ; le flash se règle
// maintenant dans une fenêtre, et se joue ensuite sur une page de la séance)
const S = await poser(page, { type: 'trait', x: 300, y: 300 })
await page.evaluate(() => window.__app.ui.flash.ouvrir())
await page.waitForTimeout(200)
let k = (await etat(page)).msgs
await page.keyboard.press('Control+z')
await page.waitForTimeout(100)
let e = await etat(page)
const ms = await msgsDepuis(page, k)
verifier('réglage du flash ouvert : Ctrl+Z ne défait rien sur la page', e.n === 1, { n: e.n, ms })
await page.evaluate(() => document.querySelector('dialog.dialogue-flash .annuler')?.click())
await page.waitForTimeout(100)
e = await etat(page)
note('après fermeture du réglage', { n: e.n })

// ---- Copier, autre page, coller ----
await vider(page)
await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
await outil(page, 'selection')
const A = await poser(page, { type: 'triangle', x: 400, y: 300 })
const B = await poser(page, { type: 'trait', x: 700, y: 300 })
await page.keyboard.press('Control+a')
await page.keyboard.press('Control+c')
await page.mouse.move(20, 400)  // sur la barre d'outils, hors du tableau
await page.keyboard.press('Control+v')
await page.waitForTimeout(400)
e = await etat(page)
verifier('Ctrl+V pointeur hors du tableau : collé (décalé de la source), 2 objets de plus', e.n === 4 && e.sel.length === 2, e)
const pos = await page.evaluate(() => window.__app.formes.map(f => ({ t: f.type, x: f.type === 'polygone' ? f.pts[0].x : f.x })))
note('positions', pos)
await page.keyboard.press('Control+z')
e = await etat(page)
verifier('Ctrl+Z retire tout le collage en une étape', e.n === 2, e.n)
// Ctrl+X : une étape
await page.keyboard.press('Control+a')
await page.keyboard.press('Control+x')
await page.waitForTimeout(100)
e = await etat(page)
verifier('Ctrl+X coupe tout', e.n === 0, e.n)
await page.keyboard.press('Control+z')
e = await etat(page)
verifier('Ctrl+Z rend ce qu\'on a coupé en une étape', e.n === 2, e.n)
// autre page
await page.evaluate(() => window.__app.nouvellePage())
await page.waitForTimeout(150)
await page.mouse.move(20, 400)
await page.keyboard.press('Control+v')
await page.waitForTimeout(400)
e = await etat(page)
const noms = await page.evaluate(() => window.__app.formes.filter(f => f.type === 'polygone').map(f => f.noms))
verifier('Ctrl+V sur une autre page : collé sur la page visible', e.n === 2 && e.pages === 2, { e, noms })

// ---- Vue d'une page supprimée puis rendue ----
await page.evaluate(() => { const a = window.__app; a.cam.x = -250; a.cam.y = -120; a.cam.z = 1.7; a.vueChangee?.(); a.rendu.toutRedessiner(); a.ui.maj() })
const vue = (await etat(page)).cam
// (Adapté aux réglages par défaut, retouches après le lot 5 : la page rendue revient à son centre, à 100 %, et non à 170 %)
const CENTRE_ECRAN = () => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { x: c.x, y: c.y } }
const centreAvant = await page.evaluate(CENTRE_ECRAN)
const P2 = (await etat(page)).page
await page.evaluate(() => window.__app.supprimerPage())
await page.waitForTimeout(100)
await page.evaluate(() => [...document.querySelectorAll('.toast button')].find(b => b.textContent === 'Annuler')?.click())
await page.waitForTimeout(400)
e = await etat(page)
const centreApres = await page.evaluate(CENTRE_ECRAN)
verifier('« Annuler » du message rend la page, à son centre, à 100 %', e.page === P2 && e.pages === 2 && vue.z === 1.7 && e.cam.z === 1 && Math.abs(centreApres.x - centreAvant.x) < 0.5 && Math.abs(centreApres.y - centreAvant.y) < 0.5, { vue, cam: e.cam, centreAvant, centreApres, page: e.page === P2 })

// ---- double-clic sur la poubelle : une seule page part ----
await page.evaluate(() => window.__app.nouvellePage())
await page.evaluate(() => window.__app.nouvellePage())
await page.waitForTimeout(100)
const n0 = (await etat(page)).pages
const jeter = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => b.title === 'Supprimer cette page'); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
await page.mouse.dblclick(jeter.x, jeter.y)
await page.waitForTimeout(200)
e = await etat(page)
verifier('double-clic sur la poubelle : une seule page supprimée', e.pages === n0 - 1, { avant: n0, apres: e.pages })

// ---- Ctrl+Y ne supprime pas de nouveau ----
await page.keyboard.press('Control+z')
await page.waitForTimeout(100)
const p1 = (await etat(page)).pages
await page.keyboard.press('Control+y')
await page.waitForTimeout(100)
e = await etat(page)
verifier('Ctrl+Y après le retour d\'une page ne la supprime pas', e.pages === p1 && p1 === n0, { n0, p1, e: e.pages })

// ---- Page seule : effacer, Annuler ----
const ctx2 = await contexte()
const { page: p } = await charger(ctx2, 'seule')
await poser(p, { type: 'trait', x: 300, y: 300 })
const tj = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(b => /Effacer la page|Supprimer cette page/.test(b.title)); return b.title })
verifier('page seule : la poubelle s\'appelle « Effacer la page »', tj === 'Effacer la page', tj)
await p.evaluate(() => window.__app.supprimerPage())
await p.waitForTimeout(100)
const t1 = await p.evaluate(() => document.querySelector('.toast')?.textContent)
let e2 = await etat(p)
verifier('page seule : « Page effacée » + Annuler, la page reste', e2.pages === 1 && e2.n === 0 && /Page effacée/.test(t1) && /Annuler/.test(t1), { t1, e2 })
await p.evaluate(() => [...document.querySelectorAll('.toast button')].find(b => b.textContent === 'Annuler')?.click())
await p.waitForTimeout(100)
e2 = await etat(p)
verifier('page seule : Annuler rend le contenu', e2.n === 1, e2.n)
await p.evaluate(() => { window.__app.viderPage() })
await p.evaluate(() => window.__app.supprimerPage())
const t2 = await msgsDepuis(p, 0)
verifier('page seule vide : « La page est déjà vide. »', t2.includes('La page est déjà vide.'), t2)

await fin()
