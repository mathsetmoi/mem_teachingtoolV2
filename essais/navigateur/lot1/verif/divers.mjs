// Cas aux bords : changer de page avec un sommet choisi, F5 sous une fenêtre, règle et seuil, flèches avec un sommet choisi
import { lancer, ouvrir, noter, bilan, CAM, POSER, TRAIT, N, outils, ligne, touche } from './lib.mjs'

const nav = await lancer()
const { page, cdp } = await ouvrir(nav, {}, 'pc')
const { stylet } = outils(cdp)
const ev = (f, a) => page.evaluate(f, a)

// Un sommet choisi (son menu ouvert), puis Page ↓ : la poubelle doit être grisée sur la page d'après
{
  const id = await ev(POSER, { x: 300, y: 200, l: 200, h: 120 })
  await ev(() => window.__app.choisirOutil('selection'))
  const s = await ev(() => window.__app.cam.versEcran(500, 200))
  await page.mouse.click(s.x, s.y)            // prend la figure
  await page.waitForTimeout(350)
  await page.mouse.click(s.x, s.y)            // le menu du sommet
  await page.waitForTimeout(200)
  const a = await ev(() => ({ partie: window.__app.partie, menu: !document.querySelector('.menu-partie').hidden }))
  await ev(() => window.__app.nouvellePage())
  await page.waitForTimeout(200)
  const b = await ev(() => {
    const p = document.querySelector('button[title^="Supprimer la sélection"]')
    return { partie: window.__app.partie, sel: window.__app.selection.size, n: window.__app.formes.length, poubelle: { disabled: p.disabled, aria: p.getAttribute('aria-disabled') }, menu: !document.querySelector('.menu-partie').hidden }
  })
  noter('Sommet choisi puis nouvelle page (vide) : la poubelle est grisée', a.partie && a.menu && b.poubelle.disabled, JSON.stringify({ a, b }))
  await page.keyboard.press('Delete')
  await ev(() => window.__app.pageSuivante(-1))
  await page.waitForTimeout(150)
  const c = await ev(id => ({ partie: window.__app.partie, ici: !!window.__app.forme(id), pts: window.__app.forme(id)?.pts }), id)
  noter('… et de retour sur la page 1, rien n\'a été supprimé', c.ici && c.pts.length === 8, JSON.stringify(c))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape')
}

// F5 pendant qu'une fenêtre (formule) est ouverte : le message se voit-il ?
{
  await ev(() => window.__app.choisirOutil('formule'))
  await page.mouse.click(700, 500)
  await page.waitForTimeout(300)
  const ouvert = await ev(() => !!document.querySelector('dialog[open]'))
  await touche(cdp, 'F5', 'F5', 0, { vk: 116 })
  await page.waitForTimeout(250)
  const r = await ev(() => {
    const t = document.querySelector('.toast'), b = t.getBoundingClientRect()
    t.style.pointerEvents = 'auto'
    const dessus = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    t.style.pointerEvents = ''
    return { visible: t.classList.contains('visible'), voit: t.contains(dessus), dessus: dessus?.tagName + '.' + dessus?.className }
  })
  noter('Fenêtre de formule ouverte : F5 bloqué et son message lisible', ouvert && r.visible && r.voit, JSON.stringify({ ouvert, ...r }))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
}

// Le stylet posé contre le bord de la règle, qui tremble de 4 px (sous le seuil de 6 px) : pas de segment
{
  await ev(() => { const a = window.__app; a.choisirOutil('stylo'); a.basculerInstrument('regle') })
  await page.waitForTimeout(200)
  const bord = await ev(() => {
    const a = window.__app, e = a.instruments.get('regle')
    return { e, ecran: a.cam.versEcran(e.x + 100, e.y) }
  })
  const n0 = await ev(N)
  await stylet.trace([[bord.ecran.x, bord.ecran.y - 2], [bord.ecran.x + 2, bord.ecran.y - 2], [bord.ecran.x + 4, bord.ecran.y - 2]])
  await page.waitForTimeout(200)
  const r = await ev(() => { const f = window.__app.formes.at(-1); return { n: window.__app.formes.length, type: f?.type, pts: f?.pts } })
  noter('Stylet contre le bord de la règle, tremblement de 4 px (sous 6 px) : pas de segment', r.n === n0, JSON.stringify({ n0, bord: bord.e, ...r }))
  await ev(() => window.__app.basculerInstrument('regle'))
}

// Le message de reconnaissance au doigt (tablette sans clavier) : il parle de Ctrl+Z
bilan()
await nav.close()
