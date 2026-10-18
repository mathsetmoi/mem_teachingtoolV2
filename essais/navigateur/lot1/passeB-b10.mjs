// Essais au navigateur du morceau B10 du lot 1 : la barre de gauche stable
// (poubelle grisée, barre qui défile), les messages sous les menus et les
// panneaux, leurs mots selon le pointeur, le double appui au doigt.
// Serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot1/shotsB10`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
// Les barres de défilement se voient (Playwright les cache par défaut)
const nav = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] })

let premiere = true
async function ouvrir(ctx, nom) {
  const page = await ctx.newPage(); surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  if (premiere) { premiere = false; await page.waitForTimeout(1500); await page.waitForFunction(() => window.__app && window.__app.page) }
  await page.waitForTimeout(100)
  return page
}
const ETAT = () => {
  const a = window.__app, t = document.querySelector('.toast')
  return { n: a.formes.length, film: a.tableau.film.length, sel: [...a.selection], partie: a.partie, options: a.options, outil: a.outil,
    panneau: !document.querySelector('.panneau-forme').hidden, toast: t.textContent, visible: t.classList.contains('visible'),
    dessus: t.classList.contains('dessus'), dialogues: document.querySelectorAll('dialog[open]').length }
}
const POSER = ({ x, y, l, h }) => {
  const app = window.__app
  const f = app.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + l, y }, { x: x + l, y: y + h }, { x, y: y + h }] })
  app.tableau.nouveauGeste(); app.tableau.poser(app.page, f)
  return f.id
}
const FORMULE = ({ x, y }) => {
  const app = window.__app, t = app.tableau
  const f = { id: 'F' + Math.random().toString(36).slice(2), type: 'formule', x, y, latex: 'x^2', couleur: '#1b2230', taille: 28, z: Date.now(), auteur: t.moi }
  t.nouveauGeste(); t.poser(app.page, f)
  return f.id
}
/** Un point du monde, à l'écran (coordonnées de la fenêtre) */
const ECRAN = ({ x, y }) => { const r = document.getElementById('zone').getBoundingClientRect(), e = window.__app.cam.versEcran(x, y); return { x: r.left + e.x, y: r.top + e.y } }
const RIEN = () => { const a = window.__app; a.selection.clear(); a.choisirPartie(null); a.options = null; a.ui.fermerMenuPartie(); a.rendu.redessinerDirect(); a.ui.maj() }
const BARRE = () => {
  const b = document.querySelector('.barre-outils'), r = b.getBoundingClientRect(), cs = getComputedStyle(b)
  const p = b.querySelector('.bouton.danger')
  return { rect: [r.left, r.top, r.width, r.height].map(v => Math.round(v * 100) / 100), sh: b.scrollHeight, ch: b.clientHeight, sw: cs.scrollbarWidth, os: cs.overscrollBehaviorY,
    // (adapté au lot 5, K10 : sans « Couleur » et « Autres outils », les deux
    // boutons de la mise en page du téléphone, cachés ici par la feuille de style)
    hauteurs: [...new Set([...b.querySelectorAll('.bouton:not(.seulement-telephone)')].filter(x => !x.hidden).map(x => Math.round(x.getBoundingClientRect().height * 100) / 100))],
    poubelle: { dom: !!p && b.contains(p), cache: p.hidden, disabled: p.disabled, aria: p.getAttribute('aria-disabled'), opacite: getComputedStyle(p).opacity, curseur: getComputedStyle(p).cursor } }
}
function outilsCdp(cdp) {
  const stylet = {
    bas: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 }),
    haut: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 }),
  }
  const touche = (type, pts, r = 8) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: r, radiusY: r, force: 0.5 })) })
  const tape = async (x, y) => { await touche('touchStart', [[x, y]]); await touche('touchEnd', []) }
  return { stylet, touche, tape }
}

// =============== 1. La barre de gauche, à la souris ===============
for (const h of [768, 700]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: h } })
  const page = await ouvrir(ctx, 'barre' + h)
  const b0 = await page.evaluate(BARRE)
  verifier(`${h} px de haut : chaque bouton de la barre garde 44 px, la barre défile (barre fine), sans entraîner la page`,
    b0.hauteurs.length === 1 && b0.hauteurs[0] === 44 && b0.sh > b0.ch && b0.sw === 'thin' && b0.os === 'contain', JSON.stringify(b0))
  verifier(`${h} px : la poubelle est dans la barre, grisée et désactivée sans sélection`,
    b0.poubelle.dom && !b0.poubelle.cache && b0.poubelle.disabled && b0.poubelle.aria === 'true' && b0.poubelle.opacite === '0.3' && b0.poubelle.curseur === 'default', JSON.stringify(b0.poubelle))
  if (h === 768) {
    // Une sélection : la poubelle s'allume, la barre ne bouge pas d'un pixel
    const A = await page.evaluate(POSER, { x: 500, y: 300, l: 200, h: 140 })
    await page.keyboard.press('v')
    const c = await page.evaluate(ECRAN, { x: 600, y: 300 })
    await page.mouse.click(c.x, c.y)
    await page.waitForTimeout(80)
    const b1 = await page.evaluate(BARRE)
    verifier('Une sélection : la poubelle s\'allume, la barre garde exactement sa place et sa taille',
      !b1.poubelle.disabled && b1.poubelle.aria === 'false' && b1.poubelle.opacite === '1' && JSON.stringify(b1.rect) === JSON.stringify(b0.rect), JSON.stringify({ avant: b0.rect, apres: b1.rect }))
    const m1 = await page.evaluate(ETAT)
    // Lot 2, M8 : « toutes ses options » (le menu complet)
    verifier('À la souris, prendre un objet : « Double-clic ou clic droit sur l\'objet : toutes ses options »', m1.toast === 'Double-clic ou clic droit sur l\'objet : toutes ses options', m1.toast)
    // Un morceau choisi seul (un sommet) : la poubelle reste allumée
    await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.choisirPartie(id, { quoi: 'sommet', i: 0 }); a.ui.maj() }, A)
    const b2 = await page.evaluate(BARRE)
    verifier('Un sommet choisi seul : la poubelle reste allumée', !b2.poubelle.disabled && JSON.stringify(b2.rect) === JSON.stringify(b0.rect), JSON.stringify(b2.poubelle))
    // Rien : grisée de nouveau ; un clic dessus ne fait rien
    await page.evaluate(RIEN)
    const n0 = await page.evaluate(() => window.__app.formes.length)
    await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 1e4)
    await page.waitForTimeout(50)
    const pb = await page.evaluate(() => { const r = document.querySelector('.barre-outils .bouton.danger').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
    await page.mouse.click(pb.x, pb.y)
    await page.waitForTimeout(50)
    const b3 = await page.evaluate(BARRE)
    verifier('Plus rien de choisi : la poubelle est grisée, un clic dessus ne fait rien', b3.poubelle.disabled && await page.evaluate(() => window.__app.formes.length) === n0)
    await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 0)

    // La barre défile : le choix des formes suit le bouton des Formes
    await page.keyboard.press('r')
    await page.waitForTimeout(50)
    const suit = async () => page.evaluate(() => {
      const f = document.querySelector('.barre-outils .bouton.outil.actif').getBoundingClientRect()
      const c = [...document.querySelectorAll('.choix-formes')].find(x => !x.hidden).getBoundingClientRect()
      return { bouton: f.top, choix: c.top }
    })
    const s0 = await suit()
    await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 60)
    await page.waitForTimeout(80)
    const s1 = await suit()
    verifier('La barre défile : le choix des formes suit son bouton', Math.abs(s0.choix - Math.max(8, s0.bouton - 6)) < 0.5 && Math.abs(s1.choix - Math.max(8, s1.bouton - 6)) < 0.5 && s1.bouton < s0.bouton - 50, JSON.stringify({ s0, s1 }))
    // La molette sur la barre la fait défiler, sans toucher au zoom du tableau
    await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 0)
    const z0 = await page.evaluate(() => [window.__app.cam.x, window.__app.cam.y, window.__app.cam.z].join())
    await page.mouse.move(40, 300)
    await page.mouse.wheel(0, 200)
    await page.waitForTimeout(200)
    const w = await page.evaluate(() => ({ st: document.querySelector('.barre-outils').scrollTop, cam: [window.__app.cam.x, window.__app.cam.y, window.__app.cam.z].join() }))
    verifier('La molette sur la barre la fait défiler, la vue du tableau ne bouge pas', w.st > 0 && w.cam === z0, JSON.stringify(w))
    await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 0)
    await page.screenshot({ path: `${D}/01-barre-${h}.png` })

    // Les messages passent sous les panneaux et les menus
    const z = await page.evaluate(() => {
      const zi = s => getComputedStyle(document.querySelector(s)).zIndex
      return { toast: zi('.toast'), panneau: zi('.panneau-forme'), instruments: zi('.choix-instruments'), partie: zi('.menu-partie'), flottant: zi('.menu-flottant') }
    })
    verifier('Le message (14) passe sous le panneau (15), les instruments (16), le menu d\'un morceau (22) et les petits menus (23)',
      z.toast === '14' && z.panneau === '15' && z.instruments === '16' && z.partie === '22' && z.flottant === '23', JSON.stringify(z))
    // Panneau ouvert, puis un message à bouton : là où ils se chevauchent, c'est le panneau qu'on touche
    await page.keyboard.press('v')
    await page.mouse.dblclick(c.x, c.y)
    await page.waitForTimeout(80)
    const chev = await page.evaluate(() => {
      const a = window.__app
      a.ui.message('Un message avec un bouton', { libelle: 'Changer', faire: () => { window.__change = true } })
      const act = document.querySelector('.toast .action').getBoundingClientRect()
      const cx = act.left + act.width / 2, cy = act.top + act.height / 2
      // Le panneau posé juste sur le bouton du message
      const p = document.querySelector('.panneau-forme'), b = p.querySelector('button')
      const pr = p.getBoundingClientRect(), br = b.getBoundingClientRect()
      p.style.left = (cx - (br.left - pr.left) - br.width / 2) + 'px'
      p.style.top = (cy - (br.top - pr.top) - br.height / 2) + 'px'
      const dessus = document.elementFromPoint(cx, cy)
      return { panneau: !p.hidden, bouton: dessus === b || b.contains(dessus), quoi: dessus?.className }
    })
    verifier('Panneau ouvert puis un message : au centre d\'un bouton du panneau, c\'est ce bouton qu\'on touche', chev.panneau && chev.bouton, JSON.stringify(chev))
    // Sans rien dessus, le bouton du message reçoit le clic
    await page.evaluate(RIEN)
    await page.waitForTimeout(50)
    const ac = await page.evaluate(() => {
      const act = document.querySelector('.toast .action').getBoundingClientRect()
      return { x: act.left + act.width / 2, y: act.top + act.height / 2 }
    })
    await page.mouse.click(ac.x, ac.y)
    await page.waitForTimeout(50)
    verifier('Sans panneau dessus, le bouton du message reçoit le clic et le message s\'en va', await page.evaluate(() => window.__change === true && !document.querySelector('.toast').classList.contains('visible')))

    // Le Segment en deux clics, à la souris
    await page.keyboard.press('l')
    await page.mouse.click(300, 650)
    await page.waitForTimeout(50)
    verifier('Segment, un clic : « Cliquez le second point (Échap pour annuler) »', (await page.evaluate(ETAT)).toast === 'Cliquez le second point (Échap pour annuler)')
    await page.keyboard.press('Escape')

    // La revue couvre tout : ses messages passent dessus ; après, plus dessus
    await page.keyboard.press('p')
    await page.mouse.move(300, 500); await page.mouse.down()
    for (let k = 1; k <= 10; k++) await page.mouse.move(300 + 20 * k, 500 + 4 * k)
    await page.mouse.up()
    await page.waitForTimeout(700)
    await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
    await page.waitForTimeout(200)
    const rv = await page.evaluate(() => {
      const a = window.__app
      a.ui.message('Pendant la revue')
      const t = document.querySelector('.toast')
      return { lecture: a.enLecture, revue: !document.querySelector('.revue').hidden, dessus: t.classList.contains('dessus'), z: getComputedStyle(t).zIndex, zr: getComputedStyle(document.querySelector('.revue')).zIndex }
    })
    await page.waitForTimeout(250)
    await page.screenshot({ path: `${D}/02-revue-message.png` })
    verifier('Revue ouverte : le message passe au-dessus d\'elle (30 > 28)', rv.lecture && rv.revue && rv.dessus && rv.z === '30' && rv.zr === '28', JSON.stringify(rv))
    await page.keyboard.press('Escape')
    await page.waitForTimeout(150)
    const ap = await page.evaluate(() => { const a = window.__app; a.ui.message('Après la revue'); const t = document.querySelector('.toast'); return { lecture: a.enLecture, dessus: t.classList.contains('dessus'), z: getComputedStyle(t).zIndex } })
    verifier('Revue fermée : le message repasse sous les panneaux', !ap.lecture && !ap.dessus && ap.z === '14', JSON.stringify(ap))

    // Le programme de construction : ses messages se voient au-dessus de son panneau
    await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click()
    await page.waitForTimeout(150)
    const pc = await page.evaluate(() => {
      const p = document.querySelector('.panneau-construction')
      p.querySelector('textarea').value = ''
      p.querySelector('.tout').click()
      const t = document.querySelector('.toast')
      return { ouvert: !p.hidden, toast: t.textContent, dessus: t.classList.contains('dessus') }
    })
    verifier('Programme de construction : son message passe au-dessus de son panneau', pc.ouvert && /^Écris d'abord le programme/.test(pc.toast) && pc.dessus, JSON.stringify(pc))
    await page.keyboard.press('Escape')
  }
  await ctx.close()
}

// =============== 2. Au stylet (tablette graphique) ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ouvrir(ctx, 'stylet')
  const cdp = await ctx.newCDPSession(page)
  const { stylet } = outilsCdp(cdp)
  await page.evaluate(POSER, { x: 500, y: 300, l: 200, h: 140 })
  await page.keyboard.press('v')
  const c = await page.evaluate(ECRAN, { x: 600, y: 300 })
  await stylet.bas(c.x, c.y); await stylet.haut(c.x, c.y)
  await page.waitForTimeout(80)
  const e = await page.evaluate(ETAT)
  verifier('Au stylet, prendre un objet : « Double-clic ou bouton du stylet sur l\'objet : toutes ses options »', e.sel.length === 1 && e.toast === 'Double-clic ou bouton du stylet sur l\'objet : toutes ses options', e.toast)
  await ctx.close()
}

// =============== 3. Au doigt ===============
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, hasTouch: true })
  const page = await ouvrir(ctx, 'doigt')
  const cdp = await ctx.newCDPSession(page)
  const { tape, touche } = outilsCdp(cdp)
  const A = await page.evaluate(POSER, { x: 500, y: 300, l: 200, h: 140 })
  const B = await page.evaluate(POSER, { x: 900, y: 300, l: 160, h: 140 })
  const F = await page.evaluate(FORMULE, { x: 500, y: 560 })
  await page.waitForTimeout(300)
  const n0 = (await page.evaluate(ETAT)).n
  // Le doigt dessine (Auto, aucun stylet) ; outil Sélection
  await page.keyboard.press('v')
  const cA = await page.evaluate(ECRAN, { x: 600, y: 300 })
  await tape(cA.x, cA.y)
  await page.waitForTimeout(400)
  const e1 = await page.evaluate(ETAT)
  // Lot 2, M8 : l'appui long existe maintenant au doigt (outil Sélection,
  // doigt qui déplace) ; c'est lui que le message apprend
  verifier('Au doigt, prendre un objet : « Appui long sur l\'objet : toutes ses options », sans « clic »', e1.sel[0] === A && e1.toast === 'Appui long sur l\'objet : toutes ses options' && !/clic/i.test(e1.toast), e1.toast)
  verifier('Un seul toucher : pas de panneau', !e1.panneau && !e1.options)
  // Deux touchers rapprochés, tout de suite : le panneau de l'objet
  await tape(cA.x, cA.y); await tape(cA.x + 20, cA.y + 12)
  await page.waitForTimeout(400)
  const e2 = await page.evaluate(ETAT)
  verifier('Outil Sélection, deux touchers à 23 px sur la figure : son panneau s\'ouvre', e2.panneau && e2.options === A && e2.sel.length === 1 && e2.n === n0, JSON.stringify({ panneau: e2.panneau, options: e2.options }))
  await page.screenshot({ path: `${D}/03-double-appui.png` })
  await page.evaluate(RIEN)
  // Trop lents : non
  await tape(cA.x, cA.y); await page.waitForTimeout(380); await tape(cA.x, cA.y)
  await page.waitForTimeout(400)
  const e3 = await page.evaluate(ETAT)
  verifier('Deux touchers à 380 ms d\'écart : pas de panneau', !e3.panneau && !e3.options, JSON.stringify({ panneau: e3.panneau }))
  await page.evaluate(RIEN)
  // Un toucher puis, tout de suite, un glisser : l'objet se déplace, pas de panneau
  {
    const x0 = await page.evaluate(id => window.__app.forme(id).x, A)
    await tape(cA.x, cA.y)
    await touche('touchStart', [[cA.x, cA.y]]); for (let k = 1; k <= 6; k++) await touche('touchMove', [[cA.x + 5 * k, cA.y]]); await touche('touchEnd', [])
    await page.waitForTimeout(400)
    const e = await page.evaluate(ETAT), x1 = await page.evaluate(id => window.__app.forme(id).x, A)
    verifier('Un toucher puis aussitôt un glisser de 30 px : la figure suit, pas de panneau', !e.panneau && x1 - x0 === 30, JSON.stringify({ panneau: e.panneau, dx: x1 - x0 }))
    await page.keyboard.press('Control+z')
    await page.evaluate(RIEN)
  }
  // Un appui tenu (450 ms) puis un toucher : pas un double appui
  await touche('touchStart', [[cA.x, cA.y]]); await page.waitForTimeout(450); await touche('touchEnd', []); await tape(cA.x, cA.y)
  await page.waitForTimeout(400)
  const e3b = await page.evaluate(ETAT)
  verifier('Un appui tenu 450 ms puis un toucher : pas de panneau', !e3b.panneau && !e3b.options, JSON.stringify({ panneau: e3b.panneau }))
  await page.evaluate(RIEN)
  // Trop loin : non
  await tape(cA.x - 60, cA.y); await tape(cA.x + 60, cA.y)
  await page.waitForTimeout(400)
  verifier('Deux touchers à 120 px l\'un de l\'autre sur la même figure : pas de panneau', !(await page.evaluate(ETAT)).panneau)
  await page.evaluate(RIEN)
  // Sur deux objets différents : non
  const cB = await page.evaluate(ECRAN, { x: 900, y: 360 })
  const cA2 = await page.evaluate(ECRAN, { x: 700, y: 360 })
  await page.evaluate(() => window.__app.cam.z)
  {
    // Les deux bords en vis-à-vis rapprochés à l'écran : un dézoom
    await page.evaluate(() => { const a = window.__app; a.cam.z = 0.12; a.rendu.toutRedessiner(); a.ui.maj() })
    const p1 = await page.evaluate(ECRAN, { x: 700, y: 360 }), p2 = await page.evaluate(ECRAN, { x: 900, y: 360 })
    await tape(p1.x, p1.y); await tape(p2.x, p2.y)
    await page.waitForTimeout(400)
    const e4 = await page.evaluate(ETAT)
    verifier(`Deux touchers à ${Math.round(p2.x - p1.x)} px, sur deux figures différentes : pas de panneau`, !e4.panneau && p2.x - p1.x < 35, JSON.stringify({ panneau: e4.panneau, d: p2.x - p1.x }))
    await page.evaluate(() => { const a = window.__app; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
    await page.evaluate(RIEN)
  }
  void cB; void cA2
  // Une formule : deux touchers l'ouvrent dans l'éditeur, une seule fois
  const cF = await page.evaluate(ECRAN, { x: 515, y: 575 })
  await tape(cF.x, cF.y); await tape(cF.x + 3, cF.y + 2)
  await page.waitForTimeout(400)
  const e5 = await page.evaluate(() => ({ dialogues: document.querySelectorAll('dialog[open]').length, formule: !!document.querySelector('dialog[open].dialogue-formule') }))
  verifier('Outil Sélection, deux touchers sur une formule : son éditeur s\'ouvre, une seule fois', e5.dialogues === 1 && e5.formule, JSON.stringify(e5))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)

  // Le doigt qui dessine, outil Stylo (le double-clic au Stylo, B7) : la
  // formule s'ouvre et reste ouverte (le clic tiré du second toucher ne la referme pas)
  await page.keyboard.press('p')
  const nF = await page.evaluate(ETAT)
  await tape(cF.x, cF.y); await tape(cF.x + 3, cF.y + 2)
  await page.waitForTimeout(400)
  const e5b = await page.evaluate(() => ({ dialogues: document.querySelectorAll('dialog[open]').length, formule: !!document.querySelector('dialog[open].dialogue-formule'), n: window.__app.formes.length, film: window.__app.tableau.film.length }))
  verifier('Le doigt qui dessine, outil Stylo, deux touchers sur une formule : son éditeur s\'ouvre et reste ouvert, aucun point', e5b.dialogues === 1 && e5b.formule && e5b.n === nF.n && e5b.film === nF.film, JSON.stringify(e5b))
  // (Adapté au catalogue : l'éditeur a une rangée de symboles de plus, et
  // plus haut, il couvrirait la figure touchée ensuite ; Échap ne le ferme
  // pas : on le ferme par « Annuler », comme corrections-conformite)
  await page.evaluate(() => document.querySelector('dialog[open].dialogue-formule .secondaire')?.click())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)

  // Le doigt qui déplace, outil Stylo : deux touchers, le panneau, et pas d'encre
  await page.evaluate(() => { window.__app.choisirDoigt('deplace'); window.__app.choisirOutil('stylo') })
  await page.evaluate(RIEN)
  const f0 = await page.evaluate(ETAT)
  await tape(cA.x, cA.y); await tape(cA.x + 10, cA.y + 5)
  await page.waitForTimeout(400)
  const e6 = await page.evaluate(ETAT)
  verifier('Le doigt qui déplace, outil Stylo : deux touchers, le panneau de la figure, aucune encre', e6.panneau && e6.options === A && e6.n === f0.n && e6.film === f0.film, JSON.stringify({ panneau: e6.panneau, n: [f0.n, e6.n], film: [f0.film, e6.film] }))
  await page.evaluate(RIEN)
  // Un glisser puis un toucher : pas un double appui (la vue a bougé)
  const cam0 = await page.evaluate(() => window.__app.cam.x)
  await touche('touchStart', [[cA.x, cA.y]]); for (let k = 1; k <= 4; k++) await touche('touchMove', [[cA.x + 10 * k, cA.y]]); await touche('touchEnd', [])
  await tape(cA.x + 40, cA.y)
  await page.waitForTimeout(400)
  const e7 = await page.evaluate(ETAT)
  verifier('Un glisser du doigt puis un toucher : la vue a bougé, pas de panneau', !e7.panneau && await page.evaluate(() => window.__app.cam.x) !== cam0)
  await page.evaluate(() => window.__app.choisirDoigt('auto'))

  // Le Segment en deux appuis, au doigt qui dessine
  await page.evaluate(RIEN)
  await page.keyboard.press('l')
  await tape(300, 680)
  await page.waitForTimeout(80)
  const e8 = await page.evaluate(ETAT)
  verifier('Segment au doigt, un toucher : « Touchez le second point (un autre outil annule) »', e8.toast === 'Touchez le second point (un autre outil annule)', e8.toast)
  await page.keyboard.press('p')
  const nA = (await page.evaluate(ETAT)).n
  await page.keyboard.press('l')
  await tape(500, 680)
  await page.waitForTimeout(80)
  verifier('Un autre outil a bien annulé le premier point (le toucher suivant recommence un trait)', (await page.evaluate(ETAT)).n === nA)
  await page.keyboard.press('Escape')
  await ctx.close()
}

// =============== 4. Le menu du doigt suit la barre qui défile ===============
// (contrôle final du lot 5 : sur un écran qu'on touche, la barre replie ses
// couleurs dans « Couleur » quand elle ne tient pas dans la hauteur ; à
// 700 px de haut, elle ne défile plus que d'une dizaine de pixels, et plus
// bas, où elle défilerait davantage, le menu du doigt (253 px) ne tient plus
// à la hauteur de son bouton : il suit donc un défilement de 10 px, et non
// plus de 80)
{
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 700 }, hasTouch: true })
  const page = await ouvrir(ctx, 'menu-doigt')
  const bouton = '.barre-outils button[aria-haspopup=menu]'
  await page.click(bouton)
  await page.waitForTimeout(80)
  const pos = () => page.evaluate(s => {
    const b = document.querySelector(s).getBoundingClientRect(), m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
    return { bouton: b.top, menu: m ? m.getBoundingClientRect().top : null }
  }, bouton)
  const p0 = await pos()
  await page.evaluate(() => document.querySelector('.barre-outils').scrollTop = 80)
  await page.waitForTimeout(80)
  const p1 = await pos()
  verifier('Barre qui défile, menu du doigt ouvert : il reste à la hauteur de son bouton', p0.menu !== null && p1.menu !== null && Math.abs(p0.menu - p0.bouton) < 1 && Math.abs(p1.menu - p1.bouton) < 1 && p1.bouton < p0.bouton - 5, JSON.stringify({ p0, p1 }))
  await page.screenshot({ path: `${D}/04-menu-doigt.png` })
  await ctx.close()
}

await nav.close()
verifier('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
process.exit(echecs.length ? 1 : 0)
