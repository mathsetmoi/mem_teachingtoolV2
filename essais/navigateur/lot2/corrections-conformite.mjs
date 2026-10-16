// Essais au navigateur des corrections « conformite » du lot 2 :
//  1. pendant une séance d'automatismes (le tableau caché sous son écran),
//     Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, Suppr, Retour arrière, Page↓, Page↑ et les
//     flèches ne changent ni la page cachée, ni la page montrée, ni la vue,
//     et ne disent rien ; la séance ouverte par son bouton comme par
//     seance.ouvrir(), et sur ses réglages comme pendant les questions ; la
//     séance fermée, Ctrl+Z, Ctrl+Y et Suppr remarchent ;
//  2. un menu ouvert au clic droit (ou à l'appui long) prend le clavier,
//     comme le menu du système : le menu de la page (↓, ↑, Début, Fin, Tab,
//     Maj+Tab y mènent, ← → ne font pas défiler le tableau derrière lui,
//     Entrée choisit) ; le menu complet d'un objet ou de plusieurs (↓, →,
//     Tab y mènent ; ← → ↑ ↓ passent d'un bouton à l'autre ; l'objet n'est
//     pas poussé ; Entrée et Espace agissent, et le focus reste dans le menu
//     quand il se refait) ; le menu d'un sommet ; le menu d'un bouton
//     (↓ y entre) ; « Options » de la barre pressée au clavier met le focus
//     dans le menu. Sans menu ouvert, les flèches poussent la sélection et
//     déplacent la vue comme avant ;
//  3. le menu complet porte le nom de ce qu'il règle (aria-label) : du trait,
//     de l'image, du segment, de la droite, de la demi-droite, du point, de
//     la ligne brisée, du cercle, de l'arc, de la figure (un polygone), de la
//     formule, des N objets.
// Serveur de développement sur :5173 (ou l'adresse en argument). Une ligne
// « OK … » ou « ÉCHEC … » par vérification ; code de sortie 1 s'il y a un
// échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = process.argv[2] || 'http://localhost:5173/'
const resultats = [], erreurs = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const nav = await chromium.launch()
const D = (...x) => JSON.stringify(x)
const PNG1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

async function charger(nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  await page.evaluate(PNG => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
    a.tableau.doc.getMap('images').set('png1', PNG)
    a.selection.clear(); a.options = null
    a.cam.x = 120; a.cam.y = 120; a.cam.z = 1
    a.rendu.toutRedessiner(); a.ui.maj()
  }, PNG1)
  return { ctx, page }
}

/** Une forme posée telle quelle (un geste) ; rend son identifiant */
const poser = (page, f) => page.evaluate(f => {
  const a = window.__app, t = a.tableau
  const id = 'F' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, couleur: '#1b2230', taille: 4.5, ...f })
  return id
}, f)
const trait = (x, y, l = 200) => {
  const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, 0, 0.5)
  return { type: 'trait', x, y, pts, opacite: 1, pression: false }
}
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => {
  const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y)
  return { x: r.left + s.x, y: r.top + s.y }
}, [x, y])
const etat = page => page.evaluate(() => {
  const a = window.__app, pn = document.querySelector('.panneau-forme'), mp = document.querySelector('.menu-flottant[aria-label="Page"]')
  const act = document.activeElement
  return {
    n: a.formes.length, pos: a.formes.map(f => f.id + ':' + f.x + ',' + f.y).sort(), sel: [...a.selection].sort(), page: a.page, pages: a.pages.length,
    cam: [a.cam.x, a.cam.y, a.cam.z], msgs: window.__msgs.slice(), options: a.options,
    panneau: !pn.hidden, label: pn.getAttribute('aria-label'), menuPage: !!mp && !mp.hidden,
    menuPartie: !document.querySelector('.menu-partie').hidden,
    focus: { tag: act?.tagName, txt: (act?.textContent || '').trim().slice(0, 40), titre: act?.title || '',
      panneau: pn.contains(act), menuPage: !!mp && mp.contains(act), menuPartie: document.querySelector('.menu-partie').contains(act) },
  }
})
const presser = async (page, k, ms = 60) => { await page.keyboard.press(k); await page.waitForTimeout(ms) }

// =============== 1. Séance d'automatismes : aucune touche ne change le tableau caché ===============
for (const [maniere, ouvrir] of [['par son bouton', p => p.click('button[title^="Automatismes"]')], ['par seance.ouvrir()', p => p.evaluate(() => window.__app.ui.seance.ouvrir())]]) {
  const { ctx, page } = await charger('seance')
  // Deux pages ; sur la seconde, deux traits (deux gestes), le premier sélectionné
  await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.selection.clear(); a.cam.x = 120; a.cam.y = 120; a.rendu.toutRedessiner(); a.ui.maj() })
  const T1 = await poser(page, trait(300, 300)), T2 = await poser(page, trait(300, 420))
  await page.evaluate(id => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, T1)
  await page.waitForTimeout(200)
  // Une annulation à rétablir : Ctrl+Y aurait de quoi faire
  const avant0 = await etat(page)
  await ouvrir(page); await page.waitForTimeout(300)
  const ouverte = await page.evaluate(() => document.body.classList.contains('en-seance'))
  verifier(`Séance ouverte ${maniere} : le tableau est caché`, ouverte)
  await page.evaluate(() => { window.__msgs.length = 0 })
  const touches = ['Control+z', 'Control+y', 'Control+Shift+z', 'Meta+z', 'Delete', 'Backspace', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowRight', 'Home', 'End']
  for (const k of touches) {
    await presser(page, k, 40)
    const e = await etat(page)
    verifier(`Séance ouverte ${maniere}, sur ses réglages : ${k} ne change rien (formes, places, page, vue, sélection, aucun message)`,
      e.n === avant0.n && D(e.pos) === D(avant0.pos) && e.page === avant0.page && D(e.cam) === D(avant0.cam) && D(e.sel) === D(avant0.sel) && !e.msgs.length,
      { avant: avant0, apres: e })
  }
  // Pendant les questions (la séance lancée) : la séance garde ses touches
  // (Page↓, flèches), le tableau caché ne bouge toujours pas
  const lancee = await page.evaluate(() => {
    const b = [...document.querySelectorAll('.seance button')].find(x => /lancer|commencer/i.test(x.textContent))
    if (b) b.click()
    return !!b
  })
  await page.waitForTimeout(300)
  if (lancee) {
    for (const k of ['Control+z', 'Control+y', 'Delete', 'PageDown']) {
      await presser(page, k, 40)
      const e = await etat(page)
      verifier(`Séance lancée ${maniere} : ${k} ne change rien à la page cachée`,
        e.n === avant0.n && D(e.pos) === D(avant0.pos) && e.page === avant0.page && !e.msgs.length, { avant: avant0, apres: e })
    }
  } else verifier(`Séance ${maniere} : le bouton qui lance les questions existe`, false)
  await page.evaluate(() => window.__app.ui.seance.fermer()); await page.waitForTimeout(200)
  // Fermée, les touches remarchent
  await presser(page, 'Control+z', 80)
  let e = await etat(page)
  verifier(`Séance fermée (${maniere}) : Ctrl+Z défait le dernier trait`, e.n === avant0.n - 1 && !e.pos.some(p => p.startsWith(T2 + ':')), e)
  await presser(page, 'Control+y', 80)
  e = await etat(page)
  verifier(`… Ctrl+Y le rend`, e.n === avant0.n, e)
  await page.evaluate(id => { const a = window.__app; a.selection.clear(); a.selection.add(id); a.rendu.redessinerDirect(); a.ui.maj() }, T1)
  await presser(page, 'Delete', 80)
  e = await etat(page)
  verifier(`… Suppr efface le trait sélectionné`, e.n === avant0.n - 1 && !e.pos.some(p => p.startsWith(T1 + ':')), e)
  await ctx.close()
}

// =============== 2a. Le menu de la page, ouvert au clic droit dans le vide ===============
{
  const { ctx, page } = await charger('menu-page')
  await poser(page, trait(300, 300))
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await page.waitForTimeout(200)
  const v = await ecranDe(page, 700, 500)
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  let e0 = await etat(page)
  verifier('Menu de la page : ouvert au clic droit, le focus n\'y est pas encore', e0.menuPage && !e0.focus.menuPage, e0)
  await presser(page, 'ArrowDown')
  let e = await etat(page)
  // (lot 3, P3 : le menu de la page a des entrées de plus après « Tout voir »
  // — Dupliquer la page, puis d'autres morceaux du lot 3 — : on compare la
  // deuxième entrée active, puis la dernière entrée active réelle du menu,
  // chacune par son libellé seul, sans son aide, plus longue que les 40
  // caractères du focus lu)
  const entrees = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].map(b => ({ t: (b.querySelector('.libelle')?.firstChild?.textContent || b.textContent).trim(), dis: b.getAttribute('aria-disabled') })))
  const actives = entrees.filter(x => x.dis !== 'true')
  const premiere = actives[0], seconde = actives[1], derniere = actives[actives.length - 1]
  verifier('Menu de la page : ↓ met le focus sur sa première entrée active, sans faire défiler le tableau', e.menuPage && e.focus.menuPage && e.focus.txt.startsWith(premiere.t) && D(e.cam) === D(e0.cam), { e, entrees })
  await presser(page, 'ArrowDown')
  e = await etat(page)
  verifier('… ↓ encore : l\'entrée suivante', e.focus.menuPage && seconde.t.startsWith('Tout voir') && e.focus.txt.startsWith(seconde.t), { focus: e.focus, seconde })
  await presser(page, 'ArrowLeft'); await presser(page, 'ArrowRight')
  e = await etat(page)
  verifier('… ← et → ne font pas défiler le tableau derrière le menu, qui reste ouvert', e.menuPage && D(e.cam) === D(e0.cam), e)
  await presser(page, 'Escape')
  e = await etat(page)
  verifier('… Échap le ferme', !e.menuPage, e)

  // Les flèches sans menu ouvert déplacent toujours la vue
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(120)
  await page.mouse.click(v.x, v.y); await page.waitForTimeout(120)   // le menu se ferme
  e0 = await etat(page)
  await presser(page, 'ArrowDown', 400)
  e = await etat(page)
  verifier('Sans menu ouvert ni sélection, ↓ déplace la vue comme avant', !e.menuPage && e.cam[1] !== e0.cam[1], { e0: e0.cam, e: e.cam })

  // ↑ et Fin : la dernière entrée ; Début : la première
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  e0 = await etat(page)
  await presser(page, 'ArrowUp')
  e = await etat(page)
  verifier(`Menu de la page : ↑ met le focus sur la dernière entrée (${derniere.t})`, e.focus.menuPage && e.focus.txt.startsWith(derniere.t) && D(e.cam) === D(e0.cam), e)
  await presser(page, 'Home')
  e = await etat(page)
  verifier('… Début : la première entrée active', e.focus.menuPage && e.focus.txt.startsWith(premiere.t), e.focus)
  await presser(page, 'Escape')
  // Tab, Maj+Tab : dans le menu, pas dans la barre d'outils
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  await presser(page, 'Tab')
  e = await etat(page)
  verifier('Menu de la page : Tab mène dans le menu (pas sur « Stylo (P) »)', e.menuPage && e.focus.menuPage && e.focus.txt.startsWith(premiere.t), e.focus)
  await presser(page, 'Escape')
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  await presser(page, 'Shift+Tab')
  e = await etat(page)
  verifier(`… Maj+Tab : sa dernière entrée (${derniere.t})`, e.menuPage && e.focus.menuPage && e.focus.txt.startsWith(derniere.t), e.focus)
  // Entrée choisit : Tout sélectionner
  await presser(page, 'Home'); await presser(page, 'Enter', 150)
  e = await etat(page)
  verifier('… Début puis Entrée : « Tout sélectionner » choisi, le menu se ferme', !e.menuPage && e.sel.length === 1, e)

  // Le menu d'un bouton (le zoom), ouvert à la souris : ↓ y entre
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.ui.maj() })
  const bz = await page.evaluate(() => { const b = [...document.querySelectorAll('button[aria-expanded]')].find(x => x.offsetParent && /zoom/i.test(x.title + x.getAttribute('aria-label'))); return b && { t: b.title } })
  if (bz) {
    await page.click(`button[title="${bz.t}"]`); await page.waitForTimeout(150)
    e0 = await etat(page)
    await presser(page, 'ArrowDown')
    const f = await page.evaluate(() => { const a = document.activeElement; return { menu: !!a?.closest('.menu-flottant'), role: a?.getAttribute('role') } })
    e = await etat(page)
    verifier('Menu du zoom ouvert à la souris : ↓ entre dans le menu, la vue ne bouge pas', f.menu && /menuitem/.test(f.role || '') && D(e.cam) === D(e0.cam), { f, cam: [e0.cam, e.cam] })
    await presser(page, 'Escape')
  } else verifier('Le bouton du zoom existe', false)
  await ctx.close()
}

// =============== 2b. Le menu complet, ouvert au clic droit sur un objet ===============
{
  const { ctx, page } = await charger('menu-complet')
  const T = await poser(page, trait(300, 300))
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await page.waitForTimeout(200)
  const c = await ecranDe(page, 400, 300)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(150)
  let e0 = await etat(page)
  verifier('Menu complet : ouvert au clic droit sur le trait', e0.panneau && e0.options === T, e0)
  await presser(page, 'ArrowDown')
  let e = await etat(page)
  verifier('Menu complet : ↓ met le focus sur sa première entrée, sans pousser le trait ni bouger la vue', e.panneau && e.focus.panneau && D(e.pos) === D(e0.pos) && D(e.cam) === D(e0.cam), { e0, e })
  const premier = e.focus.txt || e.focus.titre
  await presser(page, 'ArrowRight')
  e = await etat(page)
  const second = e.focus.txt || e.focus.titre
  verifier('… → passe à l\'entrée suivante (le trait ne bouge pas)', e.focus.panneau && second !== premier && D(e.pos) === D(e0.pos), { premier, second })
  await presser(page, 'ArrowLeft')
  e = await etat(page)
  verifier('… ← revient à la précédente', e.focus.panneau && (e.focus.txt || e.focus.titre) === premier && D(e.pos) === D(e0.pos), e.focus)
  await presser(page, 'ArrowUp')
  e = await etat(page)
  verifier('… ↑ depuis la première : la dernière (le menu tourne)', e.focus.panneau && /Supprimer/.test(e.focus.titre) && D(e.pos) === D(e0.pos), e.focus)
  await presser(page, 'Home')
  e = await etat(page)
  verifier('… Début : la première', e.focus.panneau && (e.focus.txt || e.focus.titre) === premier, e.focus)
  // Entrée sur « Contour » : la section s'ouvre, le menu se refait, le focus y reste
  const versContour = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].findIndex(b => b.textContent.trim() === 'Contour'))
  for (let i = 0; i < versContour; i++) await presser(page, 'ArrowRight', 30)
  e = await etat(page)
  verifier('… le focus arrive sur « Contour »', e.focus.txt === 'Contour', e.focus)
  await presser(page, 'Enter', 150)
  e = await etat(page)
  const section = await page.evaluate(() => !!document.querySelector('.panneau-forme .section'))
  verifier('… Entrée l\'ouvre ; le menu refait garde le focus sur « Contour »', section && e.panneau && e.focus.panneau && e.focus.txt === 'Contour', { section, focus: e.focus })
  // Espace agit aussi (et n'arme pas « Espace + glisser »)
  await presser(page, ' ', 150)
  e = await etat(page)
  const section2 = await page.evaluate(() => !!document.querySelector('.panneau-forme .section'))
  const espace = await page.evaluate(() => window.__app.espace)
  verifier('… Espace sur « Contour » la referme, le focus reste, « Espace + glisser » n\'est pas armé', !section2 && e.focus.panneau && e.focus.txt === 'Contour' && !espace, { section2, focus: e.focus, espace })
  // ↓ jusqu'à une couleur : Entrée la donne au trait, le focus reste dans le menu
  await presser(page, 'Enter', 150)
  const rouge = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme button, .panneau-forme input, .panneau-forme select')].findIndex(b => b.classList.contains('pastille') && /rouge/i.test(b.title)))
  const ici = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme button, .panneau-forme input, .panneau-forme select')].indexOf(document.activeElement))
  for (let i = ici; i < rouge; i++) await presser(page, 'ArrowDown', 30)
  e = await etat(page)
  verifier('… ↓ mène jusqu\'à la pastille rouge de la section', e.focus.panneau && /rouge/i.test(e.focus.titre), e.focus)
  await presser(page, 'Enter', 150)
  e = await etat(page)
  const couleur = await page.evaluate(id => window.__app.formes.find(f => f.id === id)?.couleur, T)
  verifier('… Entrée : le trait devient rouge ; le menu refait garde le focus sur la pastille', couleur !== '#1b2230' && e.panneau && e.focus.panneau && /rouge/i.test(e.focus.titre), { couleur, focus: e.focus })
  verifier('… le trait n\'a jamais bougé', D(e.pos) === D(e0.pos), { avant: e0.pos, apres: e.pos })
  await presser(page, 'Escape', 100)

  // Tab depuis la page : dans le menu complet, pas sur « Stylo (P) »
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(150)
  e0 = await etat(page)
  verifier('Menu complet rouvert, focus hors du menu', e0.panneau && !e0.focus.panneau, e0.focus)
  await presser(page, 'Tab')
  e = await etat(page)
  verifier('Menu complet : Tab mène dans le menu (pas sur « Stylo (P) »)', e.panneau && e.focus.panneau, e.focus)
  await presser(page, 'Escape', 100)

  // À la souris, rien ne change : un clic sur « Contour » refait le menu sans
  // y garder le focus, et Espace arme toujours « Espace + glisser » (il
  // n'appuie pas sur le bouton cliqué)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(150)
  const sect = () => page.evaluate(() => !!document.querySelector('.panneau-forme .section'))
  const s0 = await sect()
  await page.locator('.panneau-forme button', { hasText: 'Contour' }).first().click(); await page.waitForTimeout(120)
  const s1 = await sect()
  e = await etat(page)
  await page.keyboard.down('Space'); await page.waitForTimeout(60)
  const esp = await page.evaluate(() => window.__app.espace)
  await page.keyboard.up('Space'); await page.waitForTimeout(120)
  const s2 = await sect()
  verifier('À la souris : « Contour » cliqué bascule la section ; le focus ne reste pas dans le menu refait ; Espace arme « Espace + glisser » sans rappuyer sur le bouton',
    s1 !== s0 && !e.focus.panneau && esp === true && s2 === s1, { s0, s1, s2, esp, focus: e.focus })
  await presser(page, 'Escape', 100)

  // Sans menu complet (le trait seulement pris : la barre d'actions), ↓ pousse le trait de 1 mm comme avant
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(150)
  e0 = await etat(page)
  await presser(page, 'ArrowDown')
  e = await etat(page)
  verifier('Sans menu complet, ↓ pousse toujours le trait pris', !e0.panneau && D(e.sel) === D([T]) && D(e.pos) !== D(e0.pos), { e0: e0.pos, e: e.pos })

  // « Options » de la barre pressé au clavier : le focus va dans le menu
  await page.evaluate(() => { document.querySelector('.barre-actions .action-options')?.focus() })
  await presser(page, 'Enter', 150)
  e = await etat(page)
  verifier('« Options » de la barre pressé au clavier : le menu complet s\'ouvre, le focus sur sa première entrée', e.panneau && e.focus.panneau, e.focus)
  await presser(page, 'Escape', 100)
  await ctx.close()
}

// =============== 2c. Plusieurs objets, et le menu d'un sommet ===============
{
  const { ctx, page } = await charger('menu-plusieurs')
  const A = await poser(page, trait(300, 300)), B = await poser(page, trait(300, 420))
  const P = await poser(page, { type: 'polygone', x: 700, y: 300, pts: [0, 0, 150, 0, 75, -120], ferme: true, sommets: true, noms: ['A', 'B', 'C'] })
  await page.evaluate(([a, b]) => { const x = window.__app; x.choisirOutil('selection'); x.selection.clear(); x.selection.add(a); x.selection.add(b); x.rendu.redessinerDirect(); x.ui.maj() }, [A, B])
  await page.waitForTimeout(200)
  const c = await ecranDe(page, 400, 300)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(150)
  let e0 = await etat(page)
  verifier('Plusieurs objets : le menu « 2 objets » ouvert au clic droit', e0.panneau && e0.label === 'Options des 2 objets', e0)
  await presser(page, 'ArrowDown')
  let e = await etat(page)
  verifier('… ↓ met le focus dans le menu, sans pousser les deux traits', e.focus.panneau && D(e.pos) === D(e0.pos) && D(e.cam) === D(e0.cam), { e0, e })
  await presser(page, 'Escape', 100)
  // Le menu d'un sommet (clic droit sur le sommet A du triangle)
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.ui.maj() })
  const s = await ecranDe(page, 700, 300)
  await page.mouse.click(s.x, s.y, { button: 'right' }); await page.waitForTimeout(150)
  e0 = await etat(page)
  verifier('Menu d\'un sommet ouvert au clic droit', e0.menuPartie, e0)
  await presser(page, 'ArrowDown')
  e = await etat(page)
  verifier('… ↓ met le focus dans le menu du sommet, sans bouger la figure ni la vue', e.menuPartie && e.focus.menuPartie && D(e.pos) === D(e0.pos) && D(e.cam) === D(e0.cam), { e0, e })
  await presser(page, 'Escape', 100)
  await ctx.close()
}

// =============== 3. Le nom du menu complet ===============
{
  const { ctx, page } = await charger('noms')
  const cas = [
    ['trait', trait(200, 200), 'Options du trait'],
    ['trait de surligneur', { ...trait(200, 260), opacite: 0.35, taille: 22.5 }, 'Options du trait'],
    ['image', { type: 'image', src: 'png1', l: 200, h: 150, m: [1, 0, 0, 1], x: 500, y: 200 }, "Options de l'image"],
    ['segment', { type: 'polygone', x: 200, y: 400, pts: [0, 0, 150, 0], ferme: false }, 'Options du segment'],
    ['droite', { type: 'polygone', x: 200, y: 450, pts: [0, 0, 150, 0], ferme: false, prolonge: 'droite' }, 'Options de la droite'],
    ['demi-droite', { type: 'polygone', x: 200, y: 500, pts: [0, 0, 150, 0], ferme: false, prolonge: 'demi' }, 'Options de la demi-droite'],
    ['point', { type: 'polygone', x: 900, y: 500, pts: [0, 0], ferme: false, sommets: true }, 'Options du point'],
    ['ligne brisée', { type: 'polygone', x: 200, y: 550, pts: [0, 0, 50, 30, 100, 0], ferme: false }, 'Options de la ligne brisée'],
    ['cercle', { type: 'cercle', x: 900, y: 300, r: 60 }, 'Options du cercle'],
    ['arc', { type: 'cercle', x: 1100, y: 300, r: 60, arc: { a0: 0, a1: 2 } }, "Options de l'arc"],
    ['triangle', { type: 'polygone', x: 700, y: 600, pts: [0, 0, 150, 0, 75, -120], ferme: true }, 'Options de la figure'],
    ['formule', { type: 'formule', x: 1000, y: 600, latex: 'x^2', taille: 28 }, 'Options de la formule'],
  ]
  for (const [nom, f, attendu] of cas) {
    const id = await poser(page, f)
    await page.evaluate(id => { const a = window.__app; a.ouvrirOptions(a.formes.find(x => x.id === id)) }, id)
    await page.waitForTimeout(60)
    const e = await etat(page)
    verifier(`Le menu complet d'un(e) ${nom} s'appelle « ${attendu} »`, e.panneau && e.label === attendu, { label: e.label, panneau: e.panneau })
  }
  await ctx.close()
}

await nav.close()
if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
const ko = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - ko} / ${resultats.length} vérifications passent`)
process.exit(ko || erreurs.length ? 1 : 0)
