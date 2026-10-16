// Essais au navigateur du morceau M7 du lot 2 : la barre d'actions au-dessus
// de ce qui est pris. Elle paraît tout de suite (outil Sélection : clic,
// Maj + clic, cadre, Ctrl + A, ce qu'on duplique ; doigt qui déplace : un
// toucher), juste au-dessus de l'objet (dessous s'il n'y a pas la place, en
// haut de la zone libre pour un objet plus haut que l'écran), dans la fenêtre,
// sans cacher l'objet ; elle suit la vue, se cache pendant un déplacement, un
// cadre, un lasso, un pincement, et revient au lâcher ; jamais sous le Stylo à
// la souris ou au stylet ; ni pendant la revue, la séance, l'éditeur d'une
// formule, un placement, le menu complet ou le menu d'un morceau. Contenu
// selon ce qui est pris et le pointeur ; « Ajouter » au doigt. Un stylet qui
// se pose sur la barre du doigt (Stylo en main) écrit, sans rien déclencher.
// Souris, tablette graphique (stylet CDP sans écran tactile), doigt (CDP),
// téléphone en portrait et en paysage, 1920 × 1080.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'

const S = `${RACINE_ESSAIS}`
const CAPTURES = S + '/lot2/captures'
const URL0 = 'http://localhost:5173/'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
const attendre = ms => new Promise(r => setTimeout(r, ms))
const { mkdirSync } = await import('node:fs')
mkdirSync(CAPTURES, { recursive: true })

async function charger(ctx, nom) {
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x) => { window.__msgs.push(t); return m(t, x) }
    a.reconnaissance = false
  })
  const cdp = await ctx.newCDPSession(page)
  return { page, cdp }
}
const contexte = (o = {}) => nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })

/** La barre : visible (ni hidden, ni visibility: hidden), son rectangle, ses boutons */
const BARRE = () => {
  const el = document.querySelector('.barre-actions'), r = el.getBoundingClientRect()
  const visible = !el.hidden && getComputedStyle(el).visibility !== 'hidden' && r.width > 0
  return {
    visible, rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
    role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
    boutons: [...el.querySelectorAll('button')].map(b => {
      const q = b.getBoundingClientRect()
      return { lib: b.querySelector('.libelle').textContent, titre: b.title, aria: b.getAttribute('aria-label'), pressed: b.getAttribute('aria-pressed'),
        actif: b.classList.contains('actif'), l: q.width, h: q.height, x: q.left + q.width / 2, y: q.top + q.height / 2 }
    }),
  }
}
/** Ce qui est pris, à l'écran (la boîte de app.objetsChoisis()). Depuis le
 *  lot 5 (K6), voulu ainsi : la barre se pose autour de l'EMPRISE de ce qui
 *  est pris, son cadre de taille et sa pastille ↻ compris (App.emprise), au
 *  -dessus de la pastille, pour ne jamais la couvrir */
const BOITE = () => {
  const a = window.__app, b = a.emprise ? a.emprise(a.objetsChoisis()) : a.boiteDuContenu(a.objetsChoisis())
  if (!b) return null
  const z = document.getElementById('zone').getBoundingClientRect()
  const p = a.cam.versEcran(b.x, b.y), q = a.cam.versEcran(b.x + b.l, b.y + b.h)
  return { left: z.left + p.x, top: z.top + p.y, right: z.left + q.x, bottom: z.top + q.y }
}
const ETAT = () => {
  const a = window.__app, pn = document.querySelector('.panneau-forme')
  return { n: a.formes.length, ids: a.formes.map(f => f.id), sel: [...a.selection].sort(), options: a.options, partie: !!a.partie, outil: a.outil,
    panneau: !pn.hidden, titre: pn.querySelector('.titre-selection')?.textContent ?? null, ajout: a.ajoutTactile,
    dialogue: !!document.querySelector('dialog[open]'), msgs: window.__msgs.slice(-3) }
}
const barre = page => page.evaluate(BARRE)
const boite = page => page.evaluate(BOITE)
const etat = page => page.evaluate(ETAT)
const bords = page => page.evaluate(() => {
  const o = document.querySelector('.barre-outils').getBoundingClientRect()
  // (lot 5, K10 : au téléphone en portrait, la barre des outils est posée en bas, plus large que haute)
  return { outils: o.right, outilsHaut: o.top, enBas: o.width > o.height, haut: document.querySelector('.barre-haut').getBoundingClientRect().bottom }
})
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
const POSER = o => {
  const a = window.__app, t = a.tableau
  const id = (o.type[0].toUpperCase()) + Math.random().toString(36).slice(2, 8)
  let f
  if (o.type === 'triangle') {
    f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: o.x, y: o.y }, { x: o.x + (o.l ?? 160), y: o.y }, { x: o.x, y: o.y + (o.h ?? 120) }] })
  } else if (o.type === 'formule') {
    f = { id, type: 'formule', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, latex: o.latex ?? 'x^2+1', couleur: '#1b2230', taille: 28 }
  } else {
    f = { id, type: 'trait', x: o.x, y: o.y, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 0, 0.5, 80, 0, 0.5, 120, 0, 0.5],
      couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }
  }
  t.nouveauGeste(); t.poser(a.page, f)
  return f.id
}
const poser = (page, o) => page.evaluate(POSER, o)
const outil = (page, o) => page.evaluate(o => window.__app.choisirOutil(o), o)
const vider = page => page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.rendu.redessinerDirect(); a.ui.maj() })
const pres = (a, b, e = 1.5) => Math.abs(a - b) <= e
/** Les deux rectangles ne se recouvrent pas */
const disjoints = (a, b) => a.bottom <= b.top + 0.5 || a.top >= b.bottom - 0.5 || a.right <= b.left + 0.5 || a.left >= b.right - 0.5
const dansFenetre = (r, vp) => r.left >= 7.5 && r.top >= 7.5 && r.right <= vp.width - 7.5 && r.bottom <= vp.height - 7.5
const cibles = b => b.boutons.length > 0 && b.boutons.every(x => x.l >= 44 && x.h >= 44)
const libelles = b => b.boutons.map(x => x.lib).join(',')
const titre = (b, lib) => b.boutons.find(x => x.lib === lib)?.titre
/** Au-dessus, à 10 px, centrée (sauf contre un bord) ; au doigt, à 30 px
 *  (corrections appareils du lot 2 : un doigt qui retouche l'objet un peu
 *  haut ne doit pas toucher la barre) */
const auDessus = (b, o, ecart = 10) => pres(b.rect.bottom, o.top - ecart, 1.5)
const DOIGT = 30
const detail = (...x) => JSON.stringify(x)
async function clicBarre(page, lib) {
  const b = await barre(page), x = b.boutons.find(y => y.lib === lib)
  if (!x) return false
  await page.mouse.click(x.x, x.y); await page.waitForTimeout(100)
  return true
}

// =============== 1. Souris, outil Sélection ===============
{
  const vp = { width: 1366, height: 768 }
  const ctx = await contexte()
  const { page } = await charger(ctx, 'souris')
  const T1 = await poser(page, { type: 'trait', x: 300, y: 300 })
  const T2 = await poser(page, { type: 'trait', x: 300, y: 380 })
  const Tri = await poser(page, { type: 'triangle', x: 700, y: 250 })
  const F = await poser(page, { type: 'formule', x: 300, y: 470 })
  await outil(page, 'selection')
  await page.waitForTimeout(100)
  const s1 = await ecranDe(page, 360, 300)

  let b0 = await barre(page)
  verifier('Rien de sélectionné : pas de barre ; c\'est une barre d\'outils nommée', !b0.visible && b0.role === 'toolbar' && b0.label === 'Actions sur la sélection', detail(b0))

  // ----- Un clic sur un trait : la barre tout de suite, dès l'appui -----
  await page.mouse.move(s1.x, s1.y); await page.mouse.down(); await page.waitForTimeout(60)
  let b = await barre(page)
  verifier('Clic sur un trait : la barre paraît dès l\'appui', b.visible, detail(b))
  await page.mouse.up(); await page.waitForTimeout(80)
  b = await barre(page); let o = await boite(page); const bd = await bords(page)
  verifier('… au-dessus de l\'objet, à 10 px, sans le cacher, dans la fenêtre', b.visible && auDessus(b, o) && disjoints(b.rect, o) && dansFenetre(b.rect, vp), detail(b.rect, o))
  verifier('… centrée sur l\'objet, à droite de la barre d\'outils', pres((b.rect.left + b.rect.right) / 2, (o.left + o.right) / 2) && b.rect.left >= bd.outils + 7.5, detail(b.rect, o, bd))
  verifier('… Dupliquer, Copier, Supprimer, Options (pas d\'Ajouter à la souris)', libelles(b) === 'Dupliquer,Copier,Supprimer,Options', libelles(b))
  verifier('… titres avec le raccourci ; Options dit « clic droit »', titre(b, 'Dupliquer') === 'Dupliquer (Ctrl + D)' && titre(b, 'Copier') === 'Copier (Ctrl + C)'
    && titre(b, 'Supprimer') === 'Supprimer (Suppr)' && titre(b, 'Options') === 'Toutes les options (clic droit)' && b.boutons.every(x => x.aria === x.titre), detail(b.boutons))
  verifier('… des cibles d\'au moins 44 px (52 × 52)', cibles(b) && b.boutons.every(x => x.l >= 52 && x.h >= 52), detail(b.boutons.map(x => [x.l, x.h])))
  const premier = await page.evaluate(() => window.__msgs.slice(-1)[0])
  verifier('… et le message de la première prise apprend toujours le geste direct', /clic droit/.test(premier ?? ''), premier)

  // ----- Glisser l'objet : cachée, puis à sa nouvelle place -----
  await page.mouse.move(s1.x, s1.y); await page.mouse.down()
  await page.mouse.move(s1.x + 3, s1.y + 2); await page.waitForTimeout(40)
  b = await barre(page)
  verifier('Appui sur l\'objet, sous le seuil du glisser : la barre reste', b.visible)
  for (let k = 1; k <= 6; k++) await page.mouse.move(s1.x + 10 * k, s1.y + 8 * k)
  await page.waitForTimeout(60)
  b = await barre(page)
  verifier('Glisser l\'objet : la barre se cache pendant le déplacement', !b.visible)
  await page.mouse.up(); await page.waitForTimeout(120)
  b = await barre(page); o = await boite(page)
  const t1 = await page.evaluate(id => window.__app.forme(id), T1)
  verifier('… et revient au lâcher, au-dessus de la nouvelle place', b.visible && t1.x === 360 && t1.y === 348 && auDessus(b, o) && disjoints(b.rect, o), detail(t1.x, t1.y, b.rect, o))

  // ----- La molette, le zoom : elle suit -----
  await page.mouse.move(900, 600)
  await page.mouse.wheel(0, 120); await page.waitForTimeout(150)
  b = await barre(page); o = await boite(page)
  verifier('Molette (la vue défile) : la barre suit l\'objet', b.visible && auDessus(b, o) && pres((b.rect.left + b.rect.right) / 2, (o.left + o.right) / 2), detail(b.rect, o))
  await page.evaluate(() => window.__app.zoomer(1.25)); await page.waitForTimeout(80)
  b = await barre(page); o = await boite(page)
  verifier('Zoom (+) : elle suit, toujours au-dessus et centrée', b.visible && auDessus(b, o) && pres((b.rect.left + b.rect.right) / 2, (o.left + o.right) / 2), detail(b.rect, o))
  await page.keyboard.down('Control'); await page.mouse.wheel(0, -200); await page.keyboard.up('Control'); await page.waitForTimeout(150)
  b = await barre(page); o = await boite(page)
  verifier('Ctrl + molette : elle suit', b.visible && auDessus(b, o) && disjoints(b.rect, o), detail(b.rect, o))
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.vueChangee() }); await page.waitForTimeout(80)

  // ----- Les flèches poussent l'objet : elle suit -----
  o = await boite(page)
  await page.keyboard.press('Shift+ArrowRight'); await page.waitForTimeout(100)
  b = await barre(page); const o2 = await boite(page)
  verifier('Maj + → pousse l\'objet d\'1 cm : la barre le suit', b.visible && o2.left > o.left + 30 && auDessus(b, o2) && pres((b.rect.left + b.rect.right) / 2, (o2.left + o2.right) / 2), detail(b.rect, o2))

  // ----- Un objet en haut de l'écran : dessous -----
  await page.evaluate(id => { const a = window.__app, f = a.forme(id); a.cam.y = 95 - f.y * a.cam.z; a.vueChangee() }, T1)
  await page.waitForTimeout(80)
  b = await barre(page); o = await boite(page)
  verifier('Objet en haut de l\'écran (sous la barre du haut) : la barre passe dessous, à 10 px', b.visible && pres(b.rect.top, o.bottom + 10) && disjoints(b.rect, o) && dansFenetre(b.rect, vp), detail(b.rect, o))
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.vueChangee() })

  // ----- Hors de la vue : rien à montrer -----
  await page.evaluate(() => { const a = window.__app; a.cam.x = -3000; a.vueChangee() }); await page.waitForTimeout(60)
  b = await barre(page)
  verifier('L\'objet sorti de la vue : la barre s\'efface (on n\'agit pas sur ce qu\'on ne voit pas)', !b.visible, detail(b))
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.vueChangee() }); await page.waitForTimeout(60)
  verifier('… et revient avec lui', (await barre(page)).visible)

  // ----- Un objet plus haut que l'écran : en haut de la zone libre -----
  await vider(page)
  const sTri = await ecranDe(page, 700 + 80, 250)
  await page.mouse.click(sTri.x, sTri.y); await page.waitForTimeout(80)
  verifier('Clic sur le côté d\'un triangle : sa barre', (await barre(page)).visible && JSON.stringify((await etat(page)).sel) === JSON.stringify([Tri]))
  await page.evaluate(() => { const a = window.__app; a.cam.z = 9; a.cam.x = 683 - 760 * 9; a.cam.y = 384 - 310 * 9; a.vueChangee() })
  await page.waitForTimeout(80)
  b = await barre(page); o = await boite(page)
  verifier('Objet plus haut que l\'écran : la barre en haut de la zone libre, sous la barre du haut', b.visible && o.top < 0 && o.bottom > vp.height
    && pres(b.rect.top, bd.haut + 8) && dansFenetre(b.rect, vp), detail(b.rect, o, bd))
  await page.evaluate(() => { const a = window.__app; a.cam.x = 120; a.cam.y = 120; a.cam.z = 1; a.vueChangee() })
  await page.waitForTimeout(60)

  // ----- Un cadre en cours : cachée -----
  const v1 = await ecranDe(page, 250, 360), v2 = await ecranDe(page, 470, 400)
  await page.mouse.move(v1.x, v1.y); await page.mouse.down()
  for (let k = 1; k <= 6; k++) await page.mouse.move(v1.x + (v2.x - v1.x) * k / 6, v1.y + (v2.y - v1.y) * k / 6)
  await page.waitForTimeout(60)
  b = await barre(page)
  const cadre = await page.evaluate(() => !!window.__app.rendu.cadreSelection)
  verifier('Un cadre tiré depuis le vide (le triangle sélectionné) : la barre se cache pendant le cadre', cadre && !b.visible, detail(cadre, b.visible))
  await page.mouse.up(); await page.waitForTimeout(100)
  b = await barre(page); o = await boite(page); let e = await etat(page)
  verifier('… au lâcher, le trait entouré est pris et la barre paraît au-dessus de lui', JSON.stringify(e.sel) === JSON.stringify([T2]) && b.visible && auDessus(b, o) && disjoints(b.rect, o), detail(e.sel, b.rect, o))

  // ----- Dupliquer : elle passe sur la copie -----
  let e0 = await etat(page)
  await clicBarre(page, 'Dupliquer')
  e = await etat(page); b = await barre(page); o = await boite(page)
  const copie = e.sel[0]
  verifier('« Dupliquer » : une copie, sélectionnée seule, et la barre passe au-dessus d\'elle', e.n === e0.n + 1 && e.sel.length === 1 && copie !== T2 && e.ids.includes(copie)
    && b.visible && auDessus(b, o) && disjoints(b.rect, o), detail(e, b.rect, o))
  // ----- Copier -----
  await clicBarre(page, 'Copier')
  e = await etat(page)
  verifier('« Copier » : copié (le message le dit), la barre reste', e.msgs.includes('1 objet copié') && (await barre(page)).visible && e.n === e0.n + 1, detail(e.msgs))
  // ----- Supprimer : elle disparaît -----
  await clicBarre(page, 'Supprimer')
  e = await etat(page); b = await barre(page)
  verifier('« Supprimer » : la copie part, la barre disparaît', e.n === e0.n && !e.ids.includes(copie) && !b.visible && e.sel.length === 0, detail(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('… un Ctrl+Z la rend (une étape)', e.n === e0.n + 1 && e.ids.includes(copie), detail(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(80)

  // ----- Options : le menu complet, la barre se cache -----
  await page.mouse.click(s1.x + 60, s1.y + 48); await page.waitForTimeout(80)   // T1, à sa nouvelle place
  verifier('Clic sur T1 (déplacé) : sa barre', (await barre(page)).visible && (await etat(page)).sel.join() === T1)
  await clicBarre(page, 'Options')
  e = await etat(page); b = await barre(page)
  verifier('« Options » : le menu complet de l\'objet s\'ouvre, la barre se cache', e.panneau && e.options === T1 && !b.visible, detail(e, b.visible))
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  e = await etat(page)
  verifier('Échap : le menu et la sélection s\'en vont, pas de barre', !e.panneau && !e.sel.length && !(await barre(page)).visible, detail(e))

  // ----- Clic droit : le menu complet, pas la barre -----
  await page.mouse.click(s1.x + 60, s1.y + 48, { button: 'right' }); await page.waitForTimeout(80)
  e = await etat(page); b = await barre(page)
  verifier('Clic droit sur l\'objet : le menu complet, jamais la barre', e.panneau && e.options === T1 && !b.visible, detail(e, b.visible))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Maj + clic : plusieurs objets -----
  const s2 = await ecranDe(page, 360, 380)
  await page.mouse.click(s1.x + 60, s1.y + 48); await page.waitForTimeout(60)
  await page.keyboard.down('Shift'); await page.mouse.click(s2.x, s2.y); await page.keyboard.up('Shift'); await page.waitForTimeout(80)
  b = await barre(page); o = await boite(page); e = await etat(page)
  verifier('Maj + clic : deux objets, la barre au-dessus des deux', e.sel.length === 2 && b.visible && auDessus(b, o) && disjoints(b.rect, o), detail(e.sel, b.rect, o))
  verifier('… Dupliquer, Copier, Supprimer, Options ; « Supprimer les 2 objets »', libelles(b) === 'Dupliquer,Copier,Supprimer,Options' && titre(b, 'Supprimer') === 'Supprimer les 2 objets (Suppr)', detail(b.boutons))
  await clicBarre(page, 'Options')
  e = await etat(page)
  verifier('… « Options » ouvre leur menu commun « 2 objets », la barre se cache', e.panneau && e.options === '*' && e.titre === '2 objets' && !(await barre(page)).visible, detail(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Un sommet choisi (son menu) : pas de barre -----
  await page.mouse.click(sTri.x, sTri.y); await page.waitForTimeout(60)
  const sommet = await ecranDe(page, 860, 250)
  await page.mouse.click(sommet.x, sommet.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un sommet choisi (son menu ouvert) : pas de barre', e.partie && !(await barre(page)).visible, detail(e))
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(60)
  await outil(page, 'selection')

  // ----- Une formule : Modifier en tête ; l'éditeur ouvert, pas de barre -----
  const sF = await page.evaluate(id => { const a = window.__app, f = a.forme(id), bt = a.rendu.boite(f), z = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(bt.x + bt.l / 2, bt.y + bt.h / 2); return { x: z.left + s.x, y: z.top + s.y } }, F)
  await page.mouse.click(sF.x, sF.y); await page.waitForTimeout(100)
  b = await barre(page); o = await boite(page)
  verifier('Clic sur une formule : la barre commence par « Modifier »', b.visible && libelles(b) === 'Modifier,Dupliquer,Copier,Supprimer,Options'
    && titre(b, 'Modifier') === 'Modifier la formule (double-clic)' && auDessus(b, o) && disjoints(b.rect, o), detail(libelles(b), b.rect, o))
  await clicBarre(page, 'Modifier')
  e = await etat(page); b = await barre(page)
  verifier('« Modifier » : l\'éditeur de la formule s\'ouvre, la barre se cache', e.dialogue && !b.visible, detail(e, b.visible))
  await page.click('.dialogue-formule .secondaire'); await page.waitForTimeout(100)
  e = await etat(page); b = await barre(page)
  verifier('… l\'éditeur fermé (Annuler), la barre revient sur la formule', !e.dialogue && b.visible && JSON.stringify(e.sel) === JSON.stringify([F]), detail(e, b.visible))
  await page.mouse.dblclick(sF.x, sF.y); await page.waitForTimeout(120)
  e = await etat(page); b = await barre(page)
  verifier('Double-clic sur la formule : l\'éditeur, sans barre', e.dialogue && !b.visible, detail(e, b.visible))
  await page.fill('.dialogue-formule .saisie', 'x^3'); await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page); b = await barre(page)
  const latex = await page.evaluate(id => window.__app.forme(id).latex, F)
  verifier('… validée, la formule change et la barre revient', !e.dialogue && latex === 'x^3' && b.visible, detail(e, latex, b.visible))

  // ----- Placement, revue, séance : pas de barre -----
  await page.evaluate(() => { const a = window.__app; a.placement = { bouge() {}, clic() {}, annuler() {} }; a.ui.maj() })
  verifier('Un placement en cours (un clic attendu) : pas de barre', !(await barre(page)).visible)
  await page.evaluate(() => { const a = window.__app; a.placement = null; a.ui.maj() })
  verifier('… fini, elle revient', (await barre(page)).visible)
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(400)
  const enRevue = await page.evaluate(() => window.__app.enLecture)
  verifier('La revue ouverte : pas de barre', enRevue && !(await barre(page)).visible, detail(enRevue))
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  verifier('… la revue fermée, la barre revient sur ce qui est pris', !(await page.evaluate(() => window.__app.enLecture)) && (await barre(page)).visible)
  await page.click('button[title^="Automatismes"]'); await page.waitForTimeout(200)
  verifier('Une séance d\'automatismes : la barre ne se voit pas', await page.evaluate(() => document.body.classList.contains('en-seance')) && !(await barre(page)).visible)
  await page.click('.seance .fermer'); await page.waitForTimeout(150)
  verifier('… la séance fermée, elle revient', (await barre(page)).visible)
  await page.screenshot({ path: CAPTURES + '/M7-souris-formule.png' })

  // ----- Ctrl+A (Stylo en main) : la Sélection, la barre au-dessus de tout -----
  await outil(page, 'stylo')
  await page.mouse.move(1000, 650)
  await page.keyboard.press('Control+a'); await page.waitForTimeout(120)
  e = await etat(page); b = await barre(page); o = await boite(page)
  verifier('Ctrl+A (Stylo en main) : l\'outil Sélection, tout est pris, la barre au-dessus de tout', e.outil === 'selection' && e.sel.length === e.n && b.visible
    && auDessus(b, o) && disjoints(b.rect, o) && titre(b, 'Supprimer') === `Supprimer les ${e.n} objets (Suppr)`, detail(e, b.rect, o))
  await page.screenshot({ path: CAPTURES + '/M7-souris-tout.png' })
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(60)

  // ----- Stylo en main : jamais de barre -----
  e = await etat(page)
  verifier('Échap, Échap : le Stylo revient', e.outil === 'stylo' && !e.sel.length)
  await page.mouse.click(s1.x + 60, s1.y + 48, { button: 'right' }); await page.waitForTimeout(80)
  verifier('Stylo, clic droit sur T1 : le menu complet', (await etat(page)).panneau && !(await barre(page)).visible)
  e0 = await etat(page)
  await page.evaluate(() => [...document.querySelectorAll('.panneau-forme button')].find(x => x.textContent === 'Dupliquer').click()); await page.waitForTimeout(100)
  e = await etat(page); b = await barre(page)
  verifier('Stylo : « Dupliquer » du menu → la copie sélectionnée, sans barre', e.n === e0.n + 1 && e.sel.length === 1 && !e.panneau && !b.visible, detail(e, b.visible))
  await page.keyboard.press('Control+c'); await page.mouse.move(1000, 600); await page.waitForTimeout(50)
  await page.keyboard.press('Control+v'); await page.waitForTimeout(300)
  e = await etat(page); b = await barre(page)
  verifier('Stylo : Ctrl+C, Ctrl+V → le collage sélectionné, sans barre', e.n === e0.n + 2 && e.sel.length === 1 && !b.visible, detail(e, b.visible))
  const d0 = await ecranDe(page, 900, 600)
  await page.mouse.move(d0.x, d0.y); await page.mouse.down()
  for (let k = 1; k <= 8; k++) await page.mouse.move(d0.x + 12 * k, d0.y + 5 * k)
  await page.mouse.up(); await page.waitForTimeout(100)
  e = await etat(page); b = await barre(page)
  verifier('Stylo : un trait écrit relâche le collage, rien n\'est sélectionné, pas de barre', e.n === e0.n + 3 && !e.sel.length && !b.visible, detail(e, b.visible))
  await ctx.close()
}

// =============== 1 bis. Une droite, une image importée ===============
{
  const vp = { width: 1366, height: 768 }
  const ctx = await contexte()
  const { page } = await charger(ctx, 'droite-image')
  const D = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    const f = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: 500, y: 500 }, { x: 600, y: 500 }] })
    f.prolonge = 'droite'
    t.nouveauGeste(); t.poser(a.page, f)
    a.choisirOutil('selection')
    return f.id
  })
  const sD = await ecranDe(page, 900, 500)          // loin de ses deux points : une droite se prend sur toute sa longueur
  await page.mouse.click(sD.x, sD.y); await page.waitForTimeout(100)
  let b = await barre(page), e = await etat(page)
  const yD = (await ecranDe(page, 0, 500)).y
  verifier('Une droite prise loin de ses points : la barre au-dessus de la droite, dans la fenêtre', JSON.stringify(e.sel) === JSON.stringify([D]) && b.visible
    && b.rect.bottom <= yD - 9 && dansFenetre(b.rect, vp), detail(e.sel, b.rect, yD))
  await page.evaluate(() => { const a = window.__app; a.cam.x -= 2500; a.vueChangee() }); await page.waitForTimeout(80)
  b = await barre(page)
  verifier('… ses deux points sortis de la vue, la droite se voit encore : la barre reste, au-dessus d\'elle', b.visible && b.rect.bottom <= yD - 9 && dansFenetre(b.rect, vp), detail(b.rect))
  await page.evaluate(() => { const a = window.__app; a.cam.x += 2500; a.selection.clear(); a.choisirOutil('stylo') })
  const IMPORTER = async () => {
    const a = window.__app
    const cv = Object.assign(document.createElement('canvas'), { width: 160, height: 90 })
    const g = cv.getContext('2d'); g.fillStyle = '#1f5fbf'; g.fillRect(0, 0, 160, 90)
    const blob = await new Promise(r => cv.toBlob(r, 'image/png'))
    await a.importerImage(blob)
  }
  await page.evaluate(IMPORTER); await page.waitForTimeout(200)
  e = await etat(page)
  // (retouches après le lot 5 : importée au Stylo, l'image passe à l'outil
  // Sélection, avec sa barre, son cadre et sa pastille ↻ ; avant, elle
  // restait sélectionnée au Stylo, sans barre)
  b = await barre(page)
  verifier('Stylo en main, une image importée : l\'outil Sélection, sélectionnée, sa barre au-dessus d\'elle', e.sel.length === 1 && await page.evaluate(() => window.__app.outil) === 'selection' && b.visible && disjoints(b.rect, await boite(page)), detail(e, b.rect))
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.choisirOutil('selection') })
  await page.evaluate(IMPORTER); await page.waitForTimeout(200)
  e = await etat(page); b = await barre(page); const o = await boite(page)
  verifier('Sélection en main, une image importée : sélectionnée, sa barre au-dessus d\'elle', e.sel.length === 1 && b.visible && disjoints(b.rect, o) && dansFenetre(b.rect, vp), detail(e, b.rect, o))
  await ctx.close()
}

// =============== 2. Tablette graphique (stylet CDP, écran non tactile) ===============
{
  const ctx = await contexte()
  const { page, cdp } = await charger(ctx, 'wacom')
  const tactile = await page.evaluate(() => navigator.maxTouchPoints)
  const stylet = {
    survol: (x, y) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'none', buttons: 0 }),
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  const T = await poser(page, { type: 'trait', x: 300, y: 300 })
  await poser(page, { type: 'trait', x: 300, y: 420 })
  const sT = await ecranDe(page, 360, 300)
  // Stylo : le bouton du stylet, puis Dupliquer
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await stylet.bas(sT.x, sT.y, { button: 'right', buttons: 2 }); await stylet.haut(sT.x, sT.y, { button: 'right', buttons: 0 }); await page.waitForTimeout(100)
  let e = await etat(page)
  verifier(`Tablette graphique (maxTouchPoints ${tactile}), Stylo : le bouton du stylet ouvre le menu complet, pas la barre`, tactile === 0 && e.panneau && e.options === T && !(await barre(page)).visible, detail(e))
  const e0 = await etat(page)
  await page.evaluate(() => [...document.querySelectorAll('.panneau-forme button')].find(x => x.textContent === 'Dupliquer').click()); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… « Dupliquer » du menu : la copie sélectionnée, jamais de barre sous le Stylo', e.n === e0.n + 1 && e.sel.length === 1 && !(await barre(page)).visible, detail(e))
  // Un trait au stylet : pas de barre
  const a0 = await ecranDe(page, 700, 500)
  await stylet.bas(a0.x, a0.y); for (let k = 1; k <= 8; k++) await stylet.va(a0.x + 10 * k, a0.y + 4 * k); await stylet.haut(a0.x + 80, a0.y + 32)
  await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… un trait au stylet : la copie relâchée, rien de pris, pas de barre', e.n === e0.n + 2 && !e.sel.length && !(await barre(page)).visible, detail(e))
  // La Sélection au stylet
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await stylet.survol(sT.x, sT.y - 40)
  await stylet.bas(sT.x, sT.y); await stylet.haut(sT.x, sT.y); await page.waitForTimeout(100)
  let b = await barre(page); const o = await boite(page)
  verifier('Sélection, un toucher du stylet sur le trait : la barre, au-dessus, sans le cacher', b.visible && auDessus(b, o) && disjoints(b.rect, o), detail(b.rect, o))
  verifier('… pas d\'Ajouter ; Options dit « bouton du stylet »', libelles(b) === 'Dupliquer,Copier,Supprimer,Options' && titre(b, 'Options') === 'Toutes les options (bouton du stylet)', detail(b.boutons))
  // Le stylet survole la barre puis touche « Copier » : à la Sélection, la barre est aussi au stylet
  const c = b.boutons.find(x => x.lib === 'Copier')
  await stylet.survol(c.x, c.y); await page.waitForTimeout(40)
  verifier('… le stylet qui survole la barre ne la cache pas', (await barre(page)).visible)
  await stylet.bas(c.x, c.y); await stylet.haut(c.x, c.y); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… à la Sélection, le stylet touche « Copier » : copié', e.msgs.includes('1 objet copié') && e.n === e0.n + 2, detail(e.msgs, e.n))
  // Glisser au stylet : cachée, puis revenue
  await stylet.bas(sT.x, sT.y); for (let k = 1; k <= 5; k++) await stylet.va(sT.x + 8 * k, sT.y + 6 * k)
  await page.waitForTimeout(60)
  const pendant = (await barre(page)).visible
  await stylet.haut(sT.x + 40, sT.y + 30); await page.waitForTimeout(120)
  b = await barre(page)
  verifier('Glisser le trait au stylet : cachée pendant, revenue au lâcher', !pendant && b.visible, detail(pendant, b.visible))
  // Un lasso au stylet : cachée pendant
  const l0 = await ecranDe(page, 250, 400)
  await stylet.bas(l0.x, l0.y)
  const tour = [[l0.x + 200, l0.y], [l0.x + 200, l0.y + 60], [l0.x, l0.y + 60], [l0.x + 2, l0.y + 4]]
  for (const [x, y] of tour) { for (let k = 1; k <= 4; k++) await stylet.va(x, y) }
  await page.waitForTimeout(40)
  const lasso = await page.evaluate(() => !!window.__app.rendu.lasso)
  verifier('Un lasso au stylet (le trait sélectionné) : la barre se cache pendant le lasso', lasso && !(await barre(page)).visible, detail(lasso))
  await stylet.haut(l0.x + 2, l0.y + 4); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… au lâcher, ce qui est entouré est pris, et la barre paraît', e.sel.length === 1 && (await barre(page)).visible, detail(e))
  await ctx.close()
}

// =============== 3. Au doigt (tablette tactile), le doigt qui déplace, Stylo en main ===============
{
  const vp = { width: 1024, height: 768 }
  const ctx = await contexte({ viewport: vp, hasTouch: true })
  const { page, cdp } = await charger(ctx, 'doigt')
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const tap = async (x, y) => { await touche('touchStart', [[x, y]]); await touche('touchEnd', []); await page.waitForTimeout(350) }
  const stylet = {
    bas: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5, ...o }),
    va: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5, ...o }),
    haut: (x, y, o = {}) => cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1, ...o }),
  }
  const A = await poser(page, { type: 'trait', x: 250, y: 300 })
  const B = await poser(page, { type: 'trait', x: 250, y: 420 })
  const C = await poser(page, { type: 'triangle', x: 600, y: 300, l: 120, h: 90 })
  await page.evaluate(() => { const a = window.__app; a.choisirDoigt('deplace'); a.choisirOutil('stylo') })
  const sA = await ecranDe(page, 310, 300), sB = await ecranDe(page, 310, 420), sC = await ecranDe(page, 660, 300)
  await tap(sA.x, sA.y)
  let b = await barre(page), o = await boite(page), e = await etat(page)
  verifier('Doigt qui déplace (Stylo en main) : un toucher sur un trait → la barre, avec « Ajouter »', JSON.stringify(e.sel) === JSON.stringify([A]) && b.visible
    && libelles(b) === 'Dupliquer,Copier,Supprimer,Ajouter,Options', detail(e.sel, libelles(b)))
  verifier('… au-dessus du trait (à 30 px au doigt), sans le cacher, dans la fenêtre ; cibles ≥ 44 px', auDessus(b, o, DOIGT) && disjoints(b.rect, o) && dansFenetre(b.rect, vp) && cibles(b), detail(b.rect, o))
  verifier('… les titres ne disent jamais « clic » au doigt ; « Ajouter » est un interrupteur éteint', b.boutons.every(x => !/clic/.test(x.titre)) && titre(b, 'Options') === 'Toutes les options'
    && titre(b, 'Ajouter') === 'Ajouter d\'autres objets : touchez-les' && b.boutons.find(x => x.lib === 'Ajouter').pressed === 'false', detail(b.boutons))
  // Ajouter, puis deux autres objets
  const aj = b.boutons.find(x => x.lib === 'Ajouter')
  await tap(aj.x, aj.y)
  b = await barre(page); e = await etat(page)
  const bAj = b.boutons.find(x => x.lib === 'Ajouter')
  verifier('« Ajouter » touché : le mode s\'allume (aria-pressed, surligné), le message le dit', e.ajout && bAj?.pressed === 'true' && bAj?.actif && e.msgs.some(m => /Touchez d'autres objets/.test(m)), detail(e, bAj))
  await tap(sB.x, sB.y); await tap(sC.x, sC.y)
  b = await barre(page); o = await boite(page); e = await etat(page)
  verifier('… toucher deux autres objets : trois pris, la barre au-dessus des trois', e.sel.length === 3 && e.ajout && b.visible && auDessus(b, o, DOIGT) && disjoints(b.rect, o)
    && titre(b, 'Supprimer') === 'Supprimer les 3 objets (Suppr)', detail(e, b.rect, o))
  await page.screenshot({ path: CAPTURES + '/M7-doigt-ajouter.png' })
  const vide = await ecranDe(page, 800, 540)
  await tap(vide.x, vide.y)
  e = await etat(page); b = await barre(page)
  verifier('… toucher le vide : le mode s\'éteint, la sélection se vide, plus de barre', !e.ajout && !e.sel.length && !b.visible, detail(e, b.visible))
  // Glisser au doigt un objet sélectionné : cachée pendant
  await tap(sA.x, sA.y)
  await touche('touchStart', [[sA.x, sA.y]])
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[sA.x + 9 * k, sA.y + 7 * k]])
  await page.waitForTimeout(40)
  const pendant = (await barre(page)).visible
  await touche('touchEnd', []); await page.waitForTimeout(120)
  b = await barre(page); o = await boite(page)
  verifier('Glisser au doigt le trait sélectionné : la barre se cache, puis revient au-dessus de lui', !pendant && b.visible && auDessus(b, o, DOIGT), detail(pendant, b.rect, o))
  // Deux doigts : cachée pendant le pincement, revenue après, à la bonne place
  await touche('touchStart', [[500, 600, 1]]); await touche('touchStart', [[500, 600, 1], [700, 600, 2]])
  for (let k = 1; k <= 6; k++) await touche('touchMove', [[500 - 6 * k, 600 - 5 * k, 1], [700 + 6 * k, 600 - 5 * k, 2]])
  await page.waitForTimeout(40)
  const pince = (await barre(page)).visible
  await touche('touchEnd', [[730, 570, 2]]); await touche('touchEnd', []); await page.waitForTimeout(120)
  b = await barre(page); o = await boite(page); e = await etat(page)
  const z = await page.evaluate(() => window.__app.cam.z)
  verifier('Pincer à deux doigts : la barre se cache pendant, puis revient à sa place (au-dessus de l\'objet zoomé)', !pince && b.visible && z > 1.05 && auDessus(b, o, DOIGT) && e.sel.length === 1, detail(pince, z, b.rect, o))
  // Un stylet qui se pose sur la barre du doigt (iPad) : il écrit, rien ne se déclenche
  const sup = b.boutons.find(x => x.lib === 'Supprimer')
  const e0 = await etat(page)
  await stylet.bas(sup.x, sup.y)
  for (let k = 1; k <= 8; k++) await stylet.va(sup.x + 6 * k, sup.y - 4 * k)
  await stylet.haut(sup.x + 48, sup.y - 32); await page.waitForTimeout(150)
  e = await etat(page); b = await barre(page)
  const dernier = await page.evaluate(() => { const a = window.__app, f = a.formes[a.formes.length - 1]; return { type: f.type, pts: f.pts?.length ?? 0 } })
  verifier('Le stylet posé sur « Supprimer » de la barre du doigt (Stylo en main) : rien n\'est supprimé, il écrit son trait, la barre s\'efface',
    e.ids.includes(A) && e.n === e0.n + 1 && dernier.type === 'trait' && dernier.pts >= 9 * 3 && !b.visible && !e.sel.length, detail(e, dernier, b.visible))
  // À la Sélection, au doigt : un lasso dans le vide la cache
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const sB2 = await ecranDe(page, 310, 420)          // la vue a été zoomée
  await tap(sB2.x, sB2.y)
  verifier('Sélection au doigt : un toucher → la barre avec « Ajouter »', (await barre(page)).visible && libelles(await barre(page)) === 'Dupliquer,Copier,Supprimer,Ajouter,Options')
  // Parti du vide sous le trait (la barre est au-dessus de lui), le lasso l'entoure
  const l0 = await ecranDe(page, 200, 470), l1 = await ecranDe(page, 440, 395)
  const W = l1.x - l0.x, Hh = l1.y - l0.y
  // Au rythme d'un écran tactile (un événement toutes les 16 ms) : envoyés
  // dans la même milliseconde, après le pincement, ces déplacements donnent
  // à Chrome un élan sans fin, et il supprimait parfois le clic du toucher
  // suivant (« Options », plus bas), ce qu'aucun vrai doigt ne fait
  await touche('touchStart', [[l0.x, l0.y]])
  for (const [u, v] of [[0.3, 0], [0.6, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5], [0.01, 0.05]]) { await touche('touchMove', [[l0.x + W * u, l0.y + Hh * v]]); await page.waitForTimeout(16) }
  await page.waitForTimeout(40)
  const lasso = await page.evaluate(() => !!window.__app.rendu.lasso)
  verifier('… un lasso au doigt en cours : la barre se cache', lasso && !(await barre(page)).visible, detail(lasso))
  await touche('touchEnd', []); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('… au lâcher, la barre paraît sur ce qui est entouré', JSON.stringify(e.sel) === JSON.stringify([B]) && (await barre(page)).visible, detail(e.sel))
  // « Options » au doigt. Un doigt qui touche la barre moins de 300 ms après
  // qu'elle a paru est rendu à la page (le second toucher d'un double appui,
  // corrections appareils du lot 2) : on la laisse paraître, comme on la voit
  await page.waitForTimeout(300)
  b = await barre(page)
  const op = b.boutons.find(x => x.lib === 'Options')
  await tap(op.x, op.y)
  e = await etat(page)
  verifier('« Options » touché : le menu complet, la barre se cache', e.panneau && !(await barre(page)).visible, detail(e))
  await page.screenshot({ path: CAPTURES + '/M7-doigt-options.png' })
  await ctx.close()
}

// =============== 4. Téléphone, portrait et paysage : une formule prise au doigt (six boutons) ===============
for (const vp of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
  const ctx = await contexte({ viewport: vp, hasTouch: true, isMobile: true })
  const { page, cdp } = await charger(ctx, `tel-${vp.width}`)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 0, radiusX: 8, radiusY: 8, force: 0.5 })) })
  const F = await page.evaluate(vp => {
    const a = window.__app, t = a.tableau
    const z = document.getElementById('zone').getBoundingClientRect()
    const w = a.cam.versMonde(vp.width / 2 - z.left - 40, vp.height / 2 - z.top)
    const f = { id: 'Ftel', type: 'formule', x: w.x, y: w.y, z: Date.now(), auteur: t.moi, latex: '\\frac{a}{b}+1', couleur: '#1b2230', taille: 28 }
    t.nouveauGeste(); t.poser(a.page, f)
    a.choisirOutil('selection')
    return f.id
  }, vp)
  await page.waitForTimeout(150)
  const sF = await page.evaluate(id => { const a = window.__app, f = a.forme(id), bt = a.rendu.boite(f), z = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(bt.x + bt.l / 2, bt.y + bt.h / 2); return { x: z.left + s.x, y: z.top + s.y } }, F)
  await touche('touchStart', [[sF.x, sF.y]]); await touche('touchEnd', []); await page.waitForTimeout(350)
  const b = await barre(page), o = await boite(page), bd = await bords(page), e = await etat(page)
  const nom = vp.width < vp.height ? 'Téléphone 390 × 844' : 'Paysage 844 × 390'
  verifier(`${nom} : une formule touchée → six boutons (Modifier … Ajouter, Options)`, JSON.stringify(e.sel) === JSON.stringify([F]) && b.visible
    && libelles(b) === 'Modifier,Dupliquer,Copier,Supprimer,Ajouter,Options', detail(e.sel, libelles(b)))
  verifier(`${nom} : la barre tient dans l'écran, sans cacher la formule, cibles ≥ 44 px`, dansFenetre(b.rect, vp) && disjoints(b.rect, o) && cibles(b), detail(b.rect, o, b.boutons.map(x => [x.l, x.h])))
  // Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : en
  // portrait, la barre des outils est en bas, sur toute la largeur ; la barre
  // d'actions reste alors au-dessus d'elle (et non à sa droite)
  verifier(`${nom} : … ${bd.enBas ? 'au-dessus de la barre des outils (en bas)' : 'à droite de la barre d\'outils'}, sous la barre du haut`,
    (bd.enBas ? b.rect.bottom <= bd.outilsHaut - 7.5 : b.rect.left >= bd.outils + 7.5) && b.rect.top >= bd.haut + 7.5, detail(b.rect, bd))
  await page.screenshot({ path: `${CAPTURES}/M7-telephone-${vp.width}x${vp.height}.png` })
  await ctx.close()
}

// =============== 5. Au vidéoprojecteur, 1920 × 1080 ===============
{
  const vp = { width: 1920, height: 1080 }
  const ctx = await contexte({ viewport: vp })
  const { page } = await charger(ctx, '1920')
  await poser(page, { type: 'triangle', x: 600, y: 400, l: 260, h: 200 })
  await poser(page, { type: 'trait', x: 650, y: 520 })
  await outil(page, 'selection')
  const s = await ecranDe(page, 730, 400)
  await page.mouse.click(s.x, s.y); await page.waitForTimeout(150)
  const b = await barre(page), o = await boite(page)
  const style = await page.evaluate(() => { const c = getComputedStyle(document.querySelector('.barre-actions')); return { fond: c.backgroundColor, ombre: c.boxShadow, z: c.zIndex } })
  verifier('1920 × 1080 : la barre au-dessus du triangle, discrète (le gris des barres, l\'ombre plate), sous les menus', b.visible && auDessus(b, o) && disjoints(b.rect, o)
    && style.fond === 'rgb(246, 248, 251)' && !/rgba\(27, 34, 48/.test(style.ombre) && style.z === '15', detail(b.rect, o, style))
  await page.screenshot({ path: CAPTURES + '/M7-barre-1920.png' })
  await page.screenshot({ path: CAPTURES + '/M7-barre-1920-gros-plan.png', clip: { x: Math.max(0, b.rect.left - 40), y: Math.max(0, b.rect.top - 40), width: b.rect.right - b.rect.left + 80, height: o.bottom - b.rect.top + 80 } })
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} vérifications réussies`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
