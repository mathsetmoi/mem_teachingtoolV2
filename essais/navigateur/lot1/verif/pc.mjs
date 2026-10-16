// PC de la classe : souris, tablette graphique (stylet sans écran tactile), clavier
import { lancer, ouvrir, noter, bilan, CAM, POSER, TRAIT, N, outils, ligne, touche } from './lib.mjs'

const nav = await lancer()
const { page, cdp } = await ouvrir(nav, {}, 'pc')
const { stylet, molette } = outils(cdp)
const ev = (f, a) => page.evaluate(f, a)

// ---------- Souris ----------
{
  const c0 = await ev(CAM)
  await molette(600, 400, 0, 100)
  await page.waitForTimeout(50)
  const c1 = await ev(CAM)
  noter('Molette : défile de 100 px, sans zoomer', c1.y === c0.y - 100 && c1.z === 1, JSON.stringify({ c0, c1 }))
  await molette(600, 400, 0, 100, { modifiers: 8 })
  await page.waitForTimeout(50)
  const c2 = await ev(CAM)
  noter('Maj + molette : à l\'horizontale', c2.x === c1.x - 100 && c2.y === c1.y, JSON.stringify(c2))
  await molette(600, 400, 0, -100, { modifiers: 2 })
  await page.waitForTimeout(50)
  const c3 = await ev(CAM)
  noter('Ctrl + molette : ×1,1 autour du pointeur', Math.abs(c3.z - 1.1) < 1e-9, JSON.stringify(c3))
  // Pavé tactile : deltas fins
  const c4a = await ev(CAM)
  for (let i = 0; i < 10; i++) await molette(600, 400, 0.5, 3.25)
  await page.waitForTimeout(50)
  const c4 = await ev(CAM)
  noter('Pavé (deltas fins) : défile, ne zoome pas', c4.z === c4a.z && Math.abs((c4a.y - c4.y) - 32.5) < 1e-6, JSON.stringify({ c4a, c4 }))
  // Pavé : deltas entiers de 50 et plus
  await molette(600, 400, 0, 50); await molette(600, 400, 0, 120)
  await page.waitForTimeout(50)
  const c5 = await ev(CAM)
  noter('Pavé (deltas entiers ≥ 50) : défile, ne zoome pas', c5.z === c4.z && c5.y === c4.y - 170, JSON.stringify(c5))
  // Pincement (ctrlKey, petits pas)
  await molette(600, 400, 0, -4.5, { modifiers: 2 })
  await page.waitForTimeout(50)
  const c6 = await ev(CAM)
  noter('Pincement du pavé : continu exp(0,045)', Math.abs(c6.z / c5.z - Math.exp(0.045)) < 1e-9, JSON.stringify(c6))
}
await ev(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })

// Bouton du milieu, outil Stylo : la vue bouge, aucune encre
{
  const n0 = await ev(N), c0 = await ev(CAM)
  await page.mouse.move(600, 400)
  await page.mouse.down({ button: 'middle' })
  await page.mouse.move(700, 450, { steps: 6 })
  await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(80)
  const n1 = await ev(N), c1 = await ev(CAM)
  noter('Bouton du milieu (Stylo) : la vue suit (100, 50), aucune encre', n1 === n0 && c1.x - c0.x === 100 && c1.y - c0.y === 50, JSON.stringify({ n0, n1, c0, c1 }))
  // Un simple clic du milieu : rien
  await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' })
  await page.waitForTimeout(80)
  noter('Clic du milieu : ni encre ni mouvement', (await ev(N)) === n0)
}

// Espace + glisser, le focus sur le bouton « Nouvelle page » (qu'on vient de cliquer)
{
  await page.click('button[title="Nouvelle page"]')
  await page.waitForTimeout(100)
  const p0 = await ev(() => window.__app.pages.length)
  const n0 = await ev(N), c0 = await ev(CAM)
  const focus = await ev(() => document.activeElement?.getAttribute('title'))
  await page.keyboard.down(' ')
  await page.mouse.move(600, 400)
  await page.mouse.down()
  await page.mouse.move(650, 420, { steps: 5 })
  await page.mouse.up()
  await page.keyboard.up(' ')
  await page.waitForTimeout(150)
  const p1 = await ev(() => window.__app.pages.length)
  const n1 = await ev(N), c1 = await ev(CAM)
  noter('Espace + glisser (focus sur « Nouvelle page ») : la vue suit, aucune encre, pas de page en plus',
    p1 === p0 && n1 === n0 && c1.x - c0.x === 50 && c1.y - c0.y === 20, JSON.stringify({ focus, p0, p1, n0, n1, c0, c1 }))
}

// ---------- Clavier AZERTY ----------
await page.mouse.move(600, 400)
{
  await ev(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  // Ctrl + « = » (touche Equal en AZERTY, à droite de « ) »)
  await touche(cdp, '=', 'Equal', 2, { vk: 187 })
  const z1 = (await ev(CAM)).z
  noter('AZERTY Ctrl + « = » : zoome le tableau', Math.abs(z1 - 1.25) < 1e-9, String(z1))
  // Ctrl + Maj + « = » donne « + »
  await touche(cdp, '+', 'Equal', 10, { vk: 187 })
  const z2 = (await ev(CAM)).z
  noter('AZERTY Ctrl + « + » (Maj) : zoome', Math.abs(z2 - 1.5625) < 1e-9, String(z2))
  // Ctrl + « - » (touche 6)
  await touche(cdp, '-', 'Digit6', 2, { vk: 54 })
  const z3 = (await ev(CAM)).z
  noter('AZERTY Ctrl + « - » (touche 6) : dézoome', Math.abs(z3 - 1.25) < 1e-9, String(z3))
  // Pavé numérique
  await touche(cdp, '+', 'NumpadAdd', 2, { vk: 107 })
  await touche(cdp, '-', 'NumpadSubtract', 2, { vk: 109 })
  const z4 = (await ev(CAM)).z
  noter('Pavé numérique Ctrl + « + » puis « − »', Math.abs(z4 - 1.25) < 1e-9, String(z4))
  // Ctrl + « à » (touche 0)
  await touche(cdp, 'à', 'Digit0', 2, { vk: 48 })
  await page.waitForTimeout(400)
  const z5 = (await ev(CAM)).z
  noter('AZERTY Ctrl + « à » (touche 0) : 100 %', z5 === 1, String(z5))
  await touche(cdp, '0', 'Numpad0', 2, { vk: 96 })
  // Maj + 1, Maj + 2
  const id = await ev(POSER, { x: 3000, y: 3000, l: 200, h: 100 })
  await touche(cdp, '1', 'Digit1', 8, { vk: 49, text: '1' })
  await page.waitForTimeout(400)
  const tv = await ev(() => { const a = window.__app, c = a.cam; const r = a.ui.zoneLibre(); return { z: c.z, cx: (r.x + r.l / 2 - c.x) / c.z, cy: (r.y + r.h / 2 - c.y) / c.z } })
  noter('AZERTY Maj + 1 : tout voir (centré sur le contenu)', tv.z === 1 && Math.abs(tv.cx - 3100) < 1, JSON.stringify(tv))
  await ev(id => { const a = window.__app; a.choisirOutil('selection'); a.selection.add(id); a.ui.maj() }, id)
  await touche(cdp, '2', 'Digit2', 8, { vk: 50, text: '2' })
  await page.waitForTimeout(400)
  const vs = await ev(() => { const a = window.__app, c = a.cam; const r = a.ui.zoneLibre(); return { z: c.z, cx: (r.x + r.l / 2 - c.x) / c.z, cy: (r.y + r.h / 2 - c.y) / c.z } })
  noter('AZERTY Maj + 2 : voir la sélection (200 % au plus, centrée)', vs.z === 2 && Math.abs(vs.cx - 3100) < 1 && Math.abs(vs.cy - 3050) < 1, JSON.stringify(vs))
  await ev(() => { const a = window.__app; a.selection.clear(); a.choisirOutil('stylo') })
  // Flèches sans sélection
  const f0 = await ev(CAM)
  await touche(cdp, 'ArrowRight', 'ArrowRight', 0, { vk: 39 })
  await page.waitForTimeout(300)
  const f1 = await ev(CAM)
  noter('→ sans sélection : la vue montre ce qui est à droite', f1.x < f0.x && f1.y === f0.y, JSON.stringify({ f0, f1 }))
  // F5
  await touche(cdp, 'F5', 'F5', 0, { vk: 116 })
  const t = await ev(() => document.querySelector('.toast').textContent)
  noter('F5 : message « Ctrl+R »', /Ctrl\+R/.test(t), t)
}

// F5 pendant une séance d'automatismes : le message se voit-il ?
{
  await page.click('button[title^="Automatismes"]')
  await page.waitForTimeout(400)
  const enSeance = await ev(() => document.body.classList.contains('en-seance'))
  const avant = page.url()
  await touche(cdp, 'F5', 'F5', 0, { vk: 116 })
  await page.waitForTimeout(300)
  const r = await ev(() => {
    const t = document.querySelector('.toast'), b = t.getBoundingClientRect()
    t.style.pointerEvents = 'auto'
    const dessus = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2)
    t.style.pointerEvents = ''
    return { visible: t.classList.contains('visible'), texte: t.textContent, voit: t.contains(dessus), dessus: dessus?.className, zToast: getComputedStyle(t).zIndex }
  })
  noter('Séance d\'automatismes : F5 bloqué ET son message lisible', enSeance && page.url() === avant && r.visible && r.voit, JSON.stringify({ enSeance, ...r }))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  await ev(() => { document.querySelector('.seance .fermer, .seance button[title*="ermer"]')?.click() })
  await page.waitForTimeout(200)
  await ev(() => window.__app.seance)
}

// ---------- Tablette graphique (stylet, écran non tactile) ----------
await page.goto('about:blank'); await page.goto('http://localhost:5173/')
await page.waitForFunction(() => window.__app && window.__app.page); await page.waitForTimeout(300)
await ev(() => { const a = window.__app; a.nouvellePage(); a.choisirOutil('stylo'); a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
{
  const info = await ev(() => ({ max: navigator.maxTouchPoints, cache: document.querySelector('.barre-outils button[aria-haspopup=menu]').hidden }))
  // Survol, puis trait avec pression
  await stylet.survol(400, 300); await stylet.survol(420, 310)
  await stylet.trace(ligne(400, 300, 200, 30).map(([x, y]) => [x, y]))
  await page.waitForTimeout(200)
  const r = await ev(() => { const a = window.__app; const t = a.formes.at(-1); return { n: a.formes.length, type: t?.type, pression: t?.pression, doigt: localStorage.getItem('mem-doigt'), direct: localStorage.getItem('mem-stylet-direct'), deplace: a.doigtDeplace, toast: document.querySelector('.toast').textContent } })
  noter('Tablette graphique (maxTouchPoints 0) : le trait s\'écrit avec la pression, « Auto » ne bascule pas, aucun message',
    info.max === 0 && info.cache && r.type === 'trait' && r.pression === true && !r.deplace && r.direct !== '1' && !/Stylet détecté/.test(r.toast), JSON.stringify({ info, r }))
}
// Stylet à 5 px d'un sommet de la figure sélectionnée (outil Stylo) : trait, figure intacte, curseur sans « move »
{
  const id = await ev(POSER, { x: 300, y: 200, l: 200, h: 120 })
  await ev(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, id)
  const s = await ev(() => window.__app.cam.versEcran(500, 200))
  await stylet.survol(s.x + 4, s.y + 3)
  const curseur = await ev(() => document.getElementById('zone').style.cursor)
  const f0 = await ev(id => JSON.stringify(window.__app.forme(id).pts), id)
  const n0 = await ev(N)
  await stylet.trace(ligne(s.x + 4, s.y + 3, 40, 30))
  await page.waitForTimeout(150)
  const f1 = await ev(id => JSON.stringify(window.__app.forme(id).pts), id)
  noter('Stylo à 5 px d\'un sommet de la figure sélectionnée : curseur normal, trait posé, figure intacte', curseur !== 'move' && f1 === f0 && (await ev(N)) === n0 + 1, JSON.stringify({ curseur }))
}
// Bouton latéral du stylet (= clic droit) sur une figure : son panneau, aucune encre
{
  const id = await ev(POSER, { x: 300, y: 450, l: 160, h: 80 })
  const s = await ev(() => window.__app.cam.versEcran(380, 450))
  const n0 = await ev(N)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: s.x, y: s.y, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: s.x, y: s.y, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
  await page.waitForTimeout(200)
  const r = await ev(() => ({ n: window.__app.formes.length, options: window.__app.options, panneau: !document.querySelector('.panneau-forme')?.hidden, toast: document.querySelector('.toast').textContent }))
  noter('Bouton latéral du stylet sur une figure : son panneau, aucune encre', r.n === n0 && r.options === id && r.panneau, JSON.stringify(r))
  // Un appui du stylet ailleurs : le panneau se ferme, aucune encre
  await stylet.bas(900, 600); await stylet.haut(900, 600)
  await page.waitForTimeout(400)
  const r2 = await ev(() => ({ n: window.__app.formes.length, options: window.__app.options }))
  noter('Panneau ouvert, un toucher du stylet ailleurs : le panneau se ferme, aucune encre', r2.n === n0 && r2.options === null, JSON.stringify(r2))
}
// Bout gomme du stylet avec l'outil Sélection, puis avec un segment en attente
{
  const t = await ev(TRAIT, { x: 700, y: 300 })
  await ev(() => window.__app.choisirOutil('selection'))
  const s = await ev(() => window.__app.cam.versEcran(760, 300))
  const r = await ev(({ x, y }) => {
    const z = document.getElementById('zone'), app = window.__app
    const e = (type, dx, o) => z.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 77, clientX: x + dx, clientY: y, bubbles: true, cancelable: true, pressure: 0.5, ...o }))
    e('pointerdown', 0, { button: 5, buttons: 32 }); e('pointermove', 8, { button: -1, buttons: 32 }); e('pointerup', 8, { button: 5, buttons: 0 })
    return { outil: app.outil, data: z.dataset.outil, sel: app.selection.size, geste: app.geste }
  }, s)
  const ici = await ev(t => !!window.__app.forme(t), t)
  noter('Bout gomme, outil Sélection : le trait s\'efface, l\'outil reste la Sélection', !ici && r.outil === 'selection' && r.data === 'selection', JSON.stringify(r))
  await page.keyboard.press('Control+z')
  await page.waitForTimeout(100)
  noter('… un Ctrl+Z le rend', await ev(t => !!window.__app.forme(t), t))
}
// Formes (rectangle) : un toucher du stylet qui tremble de 5 px (sous le seuil de 6 px) ne doit rien poser
{
  await ev(() => { const a = window.__app; a.typeForme = 'rectangle'; a.choisirOutil('forme') })
  const n0 = await ev(N)
  await stylet.trace([[900, 200], [902, 201], [904, 203], [904, 203]])
  await page.waitForTimeout(150)
  const r = await ev(() => { const f = window.__app.formes.at(-1); return { n: window.__app.formes.length, type: f?.type, pts: f?.pts } })
  noter('Formes, rectangle : un toucher du stylet qui tremble de 5 px (sous 6 px) ne pose rien', r.n === n0, JSON.stringify({ n0, ...r }))
  await ev(() => { const a = window.__app; a.typeForme = 'cercle'; a.choisirOutil('forme') })
  const n1 = await ev(N)
  await stylet.trace([[900, 300], [903, 301], [905, 302]])
  await page.waitForTimeout(150)
  const r2 = await ev(() => { const f = window.__app.formes.at(-1); return { n: window.__app.formes.length, type: f?.type, r: f?.r } })
  noter('Formes, cercle : un toucher du stylet qui tremble de 5,4 px (sous 6 px) ne pose rien', r2.n === n1, JSON.stringify({ n1, ...r2 }))
}

bilan()
await nav.close()
