// Essais au navigateur des corrections « regressions » du lot 3 : le menu
// complet d'un objet (ou de plusieurs) garde sa rangée d'onglets sur une
// ligne, comme avant le lot 3 ; « Copier en image » et « Envoyer vers… »
// sont dans le petit menu de son bouton ⋯ (Plus) ; le panneau ne se pose
// jamais sur la figure qu'il règle quand il a la place ailleurs ; pendant un
// placement (« Désigner », « Tracer »), la consigne passe au-dessus de lui.
// - rangée : rectangle, cercle, trait, formule, plusieurs objets, en
//   1366×768 et 1024×768 : une ligne (54 px de haut), pas plus large que
//   l'ancienne de plus d'un bouton ; ⋯ juste avant Supprimer, après Copier
//   (Couper pour plusieurs) ;
// - le menu ⋯ : à la souris (Copier en image : l'image est copiée ;
//   Envoyer vers… : la fenêtre), au clavier (Entrée, ↓, Échap rend le
//   focus à ⋯, le panneau reste), au doigt, au stylet d'une tablette
//   graphique ; il se ferme quand le panneau s'en va ;
// - « Désigner » (le cas de l'essai lot1/passeB-b69) : le panneau reste
//   au-dessus de la figure, ne cache pas le milieu de la droite, et un clic
//   au milieu de la droite la choisit ;
// - la consigne d'un placement se voit au-dessus du panneau (844×390, où le
//   panneau ouvert sur « Transformer » prend presque tout l'écran) ;
// - le panneau ne couvre pas la figure (rectangle à trois hauteurs, chaque
//   section, 1366×768 et 1024×768 ; et le rectangle « Main levée », dont la
//   rangée passait déjà sur deux lignes avant le lot 3) ;
// - téléphone : le panneau et le menu ⋯ restent dans l'écran.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const URL0 = 'http://localhost:5173/'
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
/** Une section : une exception (un bouton absent…) est un échec, la suite continue */
async function section(nom, f) {
  try { await f() } catch (e) { verifier(`${nom} : la section s'est arrêtée sur une erreur`, false, String(e.message ?? e).split('\n')[0]) }
}

async function ouvrir(o = {}, nom = 'page', vueNeutre = true) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(350)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  // La vue à 100 %, l'origine de la page en haut à gauche (sauf pour
  // « Désigner », qui garde la vue de départ de l'essai du lot 1)
  if (vueNeutre) await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.ui.maj() })
  return { ctx, page }
}

/** Pose un objet de cette sorte et le prend, menu complet ouvert ; rend son identifiant */
const POSER = (page, sorte, o = {}) => page.evaluate(([sorte, o]) => {
  const a = window.__app, t = a.tableau
  const x = o.x ?? 300, y = o.y ?? 250
  let f
  if (sorte === 'rectangle' || sorte === 'rectangle-brut') f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x, y }, { x: x + (o.l ?? 200), y }, { x: x + (o.l ?? 200), y: y + (o.h ?? 120) }, { x, y: y + (o.h ?? 120) }] })
  if (sorte === 'rectangle-brut') f.brut = { pts: [0, 0, 0.5, 10, 10, 0.5], taille: 4.5, pression: false }
  if (sorte === 'cercle') f = a.nouvelleFigure({ type: 'cercle', x: x + 70, y: y + 70, r: 70 })
  if (sorte === 'trait') { const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 8, 0, 0.5); f = { id: 'T' + Math.random().toString(36).slice(2, 8), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false } }
  if (sorte === 'formule') f = { id: 'F' + Math.random().toString(36).slice(2, 8), type: 'formule', x, y, z: Date.now(), auteur: t.moi, latex: '\\frac{1}{2}', couleur: '#1b2230', taille: 32 }
  if (sorte === 'plusieurs') {
    const ids = []
    for (const [dx, dy] of [[0, 0], [50, 80]]) { const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 6, 0, 0.5); const g = { id: 'T' + dx + Math.random().toString(36).slice(2, 6), type: 'trait', x: x + dx, y: y + dy, z: Date.now() + dx, auteur: t.moi, pts, couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false }; t.nouveauGeste(); t.poser(a.page, g); ids.push(g.id) }
    a.choisirOutil('selection'); a.selection.clear(); for (const id of ids) a.selection.add(id); a.options = '*'; a.ui.maj()
    return ids.join(',')
  }
  t.nouveauGeste(); t.poser(a.page, f)
  a.choisirOutil('selection'); a.selection.clear(); a.selection.add(f.id); a.options = f.id; a.ui.maj()
  return f.id
}, [sorte, o])

/** Le panneau : sa boîte, ses lignes de boutons, sa rangée, la boîte de ce
 *  qu'il règle à l'écran et la part de cette boîte qu'il couvre */
const PANNEAU = page => page.evaluate(() => {
  const a = window.__app, p = document.querySelector('.panneau-forme'), r = p.getBoundingClientRect()
  const ligne = p.querySelector('.ligne')
  const boutons = [...ligne.querySelectorAll(':scope > button')]
  const lignes = new Set(boutons.map(b => Math.round(b.getBoundingClientRect().top))).size
  const formes = a.formes.filter(f => a.selection.has(f.id))
  const b = formes.length === 1 ? a.rendu.boite(formes[0]) : a.boiteDuContenu(formes), z = document.getElementById('zone').getBoundingClientRect()
  const e1 = a.cam.versEcran(b.x, b.y), e2 = a.cam.versEcran(b.x + b.l, b.y + b.h)
  const f = { left: z.left + e1.x, top: z.top + e1.y, right: z.left + e2.x, bottom: z.top + e2.y }
  const ix = Math.max(0, Math.min(r.right, f.right) - Math.max(r.left, f.left)), iy = Math.max(0, Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top))
  return {
    vu: !p.hidden, l: Math.round(r.width), h: Math.round(r.height), boite: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
    lignes, rangee: boutons.map(b => b.textContent.trim() || b.getAttribute('aria-label')),
    figure: [Math.round(f.left), Math.round(f.top), Math.round(f.right), Math.round(f.bottom)],
    couvre: Math.round(100 * ix * iy / Math.max(1, (f.right - f.left) * (f.bottom - f.top))),
    dansLEcran: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
  }
})
const MENU_PLUS = page => page.evaluate(() => {
  const m = document.querySelector('.menu-plus'), b = document.querySelector('.panneau-forme .ligne button.plus')
  const r = m?.getBoundingClientRect()
  return {
    ouvert: !!m && !m.hidden, entrees: m ? [...m.querySelectorAll('.menu-item .libelle')].map(x => x.firstChild?.textContent?.trim()) : [],
    aides: m ? [...m.querySelectorAll('.menu-item small')].map(x => x.textContent) : [],
    dansLEcran: !!r && r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5,
    expanded: b?.getAttribute('aria-expanded'), popup: b?.getAttribute('aria-haspopup'),
    focus: document.activeElement?.closest('.menu-plus') ? document.activeElement.querySelector('.libelle')?.firstChild?.textContent?.trim() : document.activeElement === b ? 'plus' : document.activeElement?.tagName,
    boite: r ? [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)] : null,
  }
})
/** La consigne (le message) se voit-elle, au-dessus de tout ? Le message ne
 *  prend aucun appui (pointer-events: none) : elementFromPoint passerait au
 *  travers ; on le rend touchable le temps de la mesure. */
const CONSIGNE = page => page.evaluate(() => {
  const t = document.querySelector('.toast'), r = t.getBoundingClientRect(), p = document.querySelector('.panneau-forme').getBoundingClientRect()
  t.style.pointerEvents = 'auto'
  const centre = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)
  t.style.pointerEvents = ''
  const croise = !(r.right <= p.left || r.left >= p.right || r.bottom <= p.top || r.top >= p.bottom)
  return { texte: t.textContent, visible: t.classList.contains('visible'), croise, dessus: centre === t || t.contains(centre), placement: !!window.__app.placement }
})
const centreDe = (page, sel) => page.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, sel)
const ECRAN = (page, x, y) => page.evaluate(([x, y]) => { const r = document.getElementById('zone').getBoundingClientRect(), e = window.__app.cam.versEcran(x, y); return { x: r.left + e.x, y: r.top + e.y } }, [x, y])

// Les largeurs de la rangée avant le lot 3 (e965b2d, mesurées en 1366×768)
const ANCIENNES = { rectangle: 728, cercle: 706, trait: 467, formule: 502, plusieurs: 601 }
// Lot 5 (K4-groupes) : le menu commun de plusieurs objets a un bouton de plus,
// « Grouper » (ou « Dégrouper »), juste après « Couleur, épaisseur » : sa
// rangée, un peu plus serrée, peut avoir ce bouton de plus (100 px au plus)
// et doit encore tenir sur une ligne
const EN_PLUS = { plusieurs: 100 }

// ----- 1. La rangée sur une ligne -----
await section('1. La rangée sur une ligne', async () => {
  for (const [L, H] of [[1366, 768], [1024, 768]]) {
    const { ctx, page } = await ouvrir({ viewport: { width: L, height: H } }, `rangee-${L}`)
    for (const sorte of Object.keys(ANCIENNES)) {
      await page.evaluate(() => { const a = window.__app; for (const f of [...a.formes]) { a.tableau.nouveauGeste(); a.tableau.supprimer(a.page, [f.id]) } a.selection.clear(); a.options = null; a.ui.maj() })
      await POSER(page, sorte)
      await page.waitForTimeout(120)
      const p = await PANNEAU(page)
      const n = p.rangee.length
      const avant = sorte === 'plusieurs' ? 'Couper' : 'Copier'
      verifier(`${L}×${H} ${sorte} : la rangée tient sur une ligne (54 px de haut), pas plus large que l'ancienne d'un bouton`, p.vu && p.lignes === 1 && p.h <= 56 && p.l <= ANCIENNES[sorte] + 44 + (EN_PLUS[sorte] ?? 0), p)
      verifier(`${L}×${H} ${sorte} : ni « Copier en image » ni « Envoyer vers… » dans la rangée ; ⋯ entre ${avant} et Supprimer`,
        !p.rangee.includes('Copier en image') && !p.rangee.includes('Envoyer vers…') && p.rangee[n - 3] === avant && /^Plus/.test(p.rangee[n - 2] ?? '') && /^Supprimer/.test(p.rangee[n - 1] ?? ''), p.rangee)
    }
    await ctx.close()
  }
})

// ----- 2. Le menu ⋯ à la souris -----
await section('2. Le menu ⋯ à la souris', async () => {
  {
    const { ctx, page } = await ouvrir({ permissions: ['clipboard-read', 'clipboard-write'] }, 'souris')
    await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.allerPage(a.pages[0]) })
    await page.waitForTimeout(200)
    const id = await POSER(page, 'rectangle')
    await page.waitForTimeout(150)
    let e = await MENU_PLUS(page)
    verifier('⋯ : un bouton qui ouvre un menu (aria-haspopup="menu", aria-expanded="false")', e.popup === 'menu' && e.expanded === 'false', e)
    const plus = await centreDe(page, '.panneau-forme .ligne button.plus')
    await page.mouse.click(plus?.x ?? 0, plus?.y ?? 0)
    await page.waitForTimeout(120)
    e = await MENU_PLUS(page)
    // Lot 5 (K2) : le menu ⋯ a aussi la section Ordre, après un filet (les quatre entrées) ;
    // (K3) puis, après un autre filet, la section Protéger (« Verrouiller » : un rectangle n'est pas une image) ;
    // (retouches après le lot 5) puis la section Position : les deux quarts de tour (le rectangle a la pastille ↻)
    verifier('Clic sur ⋯ : son menu — Copier en image · Envoyer vers…, avec leur aide (ENT et Pronote ; une autre page), puis l\'ordre (premier plan, avancer, reculer, arrière-plan), Verrouiller et les quarts de tour, dans l\'écran', e.ouvert && JSON.stringify(e.entrees) === '["Copier en image","Envoyer vers…","Mettre au premier plan","Avancer","Reculer","Mettre à l\'arrière-plan","Verrouiller","Tourner d\'un quart de tour à gauche","Tourner d\'un quart de tour à droite"]'
      && /ENT ou Pronote/.test(e.aides[0] ?? '') && /autre page/.test(e.aides[1] ?? '') && e.dansLEcran && e.expanded === 'true', e)
    const p = await PANNEAU(page)
    verifier('… le panneau reste ouvert, sous le menu', p.vu, p)
    await page.mouse.click(plus.x, plus.y)
    await page.waitForTimeout(100)
    e = await MENU_PLUS(page)
    verifier('Un second clic sur ⋯ referme le menu', !e.ouvert && e.expanded === 'false', e)
    await page.mouse.click(plus.x, plus.y)
    await page.waitForTimeout(100)
    await page.locator('.menu-plus .menu-item', { hasText: 'Copier en image' }).click()
    await page.waitForTimeout(800)
    const img = await page.evaluate(async () => { try { const it = await navigator.clipboard.read(); return it[0]?.types ?? [] } catch (x) { return String(x) } })
    e = await MENU_PLUS(page)
    verifier('« Copier en image » du menu ⋯ : une image PNG dans le presse-papiers, le message de l\'ENT, le menu fermé', Array.isArray(img) && img.includes('image/png') && !e.ouvert
      && await page.evaluate(() => window.__msgs.some(m => m.startsWith('Image copiée'))), { img, msgs: await page.evaluate(() => window.__msgs) })
    await page.mouse.click(plus.x, plus.y)
    await page.waitForTimeout(100)
    await page.locator('.menu-plus .menu-item', { hasText: 'Envoyer vers…' }).click()
    await page.waitForTimeout(300)
    const fen = await page.evaluate(() => !!document.querySelector('dialog[open]'))
    verifier('« Envoyer vers… » du menu ⋯ : la fenêtre des destinations s\'ouvre', fen)
    await page.keyboard.press('Escape'); await page.waitForTimeout(150)
    // Le menu ⋯ ouvert, l'objet n'est plus pris (Échap n'y est pour rien : on
    // retire la sélection par le programme) : le menu s'en va avec le panneau
    await page.mouse.click(plus.x, plus.y); await page.waitForTimeout(100)
    await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.ui.maj() })
    await page.waitForTimeout(100)
    e = await MENU_PLUS(page)
    verifier('Le panneau s\'en va (plus rien de pris) : le menu ⋯ se ferme avec lui', !e.ouvert, e)
    // Un clic sur le tableau ferme le menu ⋯ et ne pose rien
    await page.evaluate(id => { const a = window.__app; a.selection.add(id); a.options = id; a.ui.maj() }, id)
    await page.waitForTimeout(100)
    await page.mouse.click(plus.x, plus.y); await page.waitForTimeout(100)
    const n0 = await page.evaluate(() => window.__app.formes.length)
    await page.mouse.click(1100, 650); await page.waitForTimeout(150)
    e = await MENU_PLUS(page)
    verifier('Un clic sur le tableau ferme le menu ⋯, sans rien poser', !e.ouvert && await page.evaluate(() => window.__app.formes.length) === n0, e)
    await ctx.close()
  }
})

// ----- 3. Au clavier -----
await section('3. Au clavier', async () => {
  {
    const { ctx, page } = await ouvrir({}, 'clavier')
    await POSER(page, 'cercle')
    await page.waitForTimeout(150)
    await page.focus('.panneau-forme .ligne button.plus')
    await page.keyboard.press('Enter')
    await page.waitForTimeout(120)
    let e = await MENU_PLUS(page)
    verifier('Clavier : Entrée sur ⋯ ouvre le menu, le focus sur « Copier en image »', e.ouvert && e.focus === 'Copier en image', e)
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60)
    e = await MENU_PLUS(page)
    verifier('… ↓ mène à « Envoyer vers… »', e.focus === 'Envoyer vers…', e)
    await page.keyboard.press('Escape'); await page.waitForTimeout(100)
    e = await MENU_PLUS(page)
    const p = await PANNEAU(page)
    verifier('… Échap ferme le menu seul : le focus revient à ⋯, le panneau reste', !e.ouvert && e.focus === 'plus' && p.vu, { e, p: p.vu })
    await page.keyboard.press('Enter'); await page.waitForTimeout(100)
    await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60)
    await page.keyboard.press('Enter'); await page.waitForTimeout(300)
    verifier('… Entrée, ↓, Entrée : la fenêtre « Envoyer vers… »', await page.evaluate(() => !!document.querySelector('dialog[open]')))
    await ctx.close()
  }
})

// ----- 4. Au doigt, au stylet d'une tablette graphique -----
await section('4. Au doigt, au stylet d\'une tablette graphique', async () => {
  {
    const { ctx, page } = await ouvrir({ hasTouch: true }, 'doigt')
    await POSER(page, 'rectangle')
    await page.waitForTimeout(150)
    const plus = await centreDe(page, '.panneau-forme .ligne button.plus')
    await page.touchscreen.tap(plus.x, plus.y); await page.waitForTimeout(200)
    let e = await MENU_PLUS(page)
    verifier('Doigt : un toucher sur ⋯ ouvre le menu', e.ouvert, e)
    const env = await centreDe(page, '.menu-plus .menu-item:nth-of-type(2)')
    await page.touchscreen.tap(env.x, env.y); await page.waitForTimeout(400)
    verifier('Doigt : « Envoyer vers… » ouvre la fenêtre', await page.evaluate(() => !!document.querySelector('dialog[open]')))
    await ctx.close()
  }
  {
    const { ctx, page } = await ouvrir({}, 'wacom')
    const cdp = await ctx.newCDPSession(page)
    await POSER(page, 'rectangle')
    await page.waitForTimeout(150)
    const stylet = async (x, y) => {
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen' })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1, pointerType: 'pen', force: 0.5 })
      await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1, pointerType: 'pen' })
    }
    const plus = await centreDe(page, '.panneau-forme .ligne button.plus')
    await stylet(plus.x, plus.y); await page.waitForTimeout(150)
    let e = await MENU_PLUS(page)
    verifier('Tablette graphique : le stylet ouvre le menu ⋯', e.ouvert, e)
    const env = await centreDe(page, '.menu-plus .menu-item:nth-of-type(2)')
    await stylet(env.x, env.y); await page.waitForTimeout(300)
    verifier('Tablette graphique : « Envoyer vers… » ouvre la fenêtre', await page.evaluate(() => !!document.querySelector('dialog[open]')))
    await ctx.close()
  }
})

// ----- 5. « Désigner » (le cas de lot1/passeB-b69) -----
await section('5. « Désigner » (le cas de lot1/passeB-b69)', async () => {
  for (const [L, H] of [[1366, 768], [1024, 768], [1280, 800]]) {
    const { ctx, page } = await ouvrir({ viewport: { width: L, height: H }, hasTouch: true }, `designer-${L}`, false)
    const seg = await page.evaluate(() => {
      const a = window.__app
      const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 300, y: 250 }, { x: 500, y: 250 }, { x: 500, y: 370 }, { x: 300, y: 370 }] }); a.tableau.nouveauGeste(); a.tableau.poser(a.page, f)
      const g = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: 700, y: 200 }, { x: 700, y: 500 }] }); a.tableau.nouveauGeste(); a.tableau.poser(a.page, g)
      return g.id
    })
    await page.keyboard.press('v')
    const surA = await ECRAN(page, 400, 250)
    await page.mouse.dblclick(surA.x, surA.y); await page.waitForTimeout(150)
    await page.click('.panneau-forme button:has-text("Transformer")'); await page.waitForTimeout(80)
    await page.click('.panneau-forme .designer-axe'); await page.waitForTimeout(150)
    const p = await PANNEAU(page)
    const milieu = await ECRAN(page, 700, 350)
    const cache = await page.evaluate(([x, y]) => !!document.elementFromPoint(x, y)?.closest('.panneau-forme'), [milieu.x, milieu.y])
    // Depuis le lot 5 (K6), voulu ainsi : le menu complet compte le cadre de
    // taille et la pastille ↻ du rectangle comme une part de lui (au-dessus
    // de lui, à 24 px) ; le menu de 255 px, « Transformer » ouvert, n'y tient
    // plus au-dessus et se pose dessous, sans couvrir le rectangle : le
    // milieu de la droite reste à viser
    verifier(`${L}×${H} « Désigner » : le panneau reste au-dessus (ou au-dessous) du rectangle, sans le couvrir (une ligne d'onglets), et ne cache pas le milieu de la droite`, (p.boite[3] <= p.figure[1] || p.boite[1] >= p.figure[3]) && p.lignes === 1 && !cache, { p, cache })
    const consigne = await CONSIGNE(page)
    verifier(`${L}×${H} … la consigne « Clique sur la droite qui sert d'axe. » se voit, rien ne la couvre`, consigne.visible && consigne.dessus && /droite qui sert d'axe/.test(consigne.texte), consigne)
    await page.mouse.click(milieu.x, milieu.y); await page.waitForTimeout(120)
    const r = await page.evaluate(id => ({ axe: document.querySelector('.panneau-forme .t-axe')?.value === 'seg:' + id, placement: !!window.__app.placement, panneau: !document.querySelector('.panneau-forme').hidden }), seg)
    verifier(`${L}×${H} … un clic au milieu de la droite la choisit ; le panneau reste`, r.axe && !r.placement && r.panneau, r)
    await ctx.close()
  }
})

// ----- 6. La consigne d'un placement au-dessus du panneau (petit écran) -----
await section('6. La consigne d\'un placement au-dessus du panneau (petit écran)', async () => {
  for (const [L, H, tactile] of [[844, 390, true], [1024, 600, false]]) {
    const { ctx, page } = await ouvrir({ viewport: { width: L, height: H }, hasTouch: tactile, isMobile: tactile }, `consigne-${L}`)
    await page.evaluate(() => {
      const a = window.__app
      const g = a.nouvelleFigure({ type: 'polygone', ferme: false, pts: [{ x: 600, y: 60 }, { x: 600, y: 300 }] }); a.tableau.nouveauGeste(); a.tableau.poser(a.page, g)
    })
    await POSER(page, 'rectangle', { x: 250, y: 120, l: 160, h: 90 })
    await page.waitForTimeout(150)
    await page.click('.panneau-forme button:has-text("Transformer")'); await page.waitForTimeout(80)
    for (const quoi of ['.designer-axe', '.tracer-axe']) {
      await page.click('.panneau-forme ' + quoi); await page.waitForTimeout(250)
      const c = await CONSIGNE(page)
      // (retouches après le lot 5 : au poste de la classe, le message se place
      // lui aussi hors du menu complet, voir UI.placerToast ; au téléphone
      // couché, il n'y a pas la place : il le croise, au-dessus de lui)
      verifier(`${L}×${H} ${quoi === '.designer-axe' ? '« Désigner »' : '« Tracer »'} : la consigne se lit ${tactile ? 'au-dessus du panneau (qui la croise)' : 'à côté du panneau, ou au-dessus de lui'}`, c.placement && c.visible && c.dessus && (tactile ? c.croise : true), c)
      await page.keyboard.press('Escape'); await page.waitForTimeout(120)
      if (await page.evaluate(() => document.querySelector('.panneau-forme').hidden)) {
        await POSER(page, 'rectangle', { x: 250, y: 120, l: 160, h: 90 }); await page.waitForTimeout(100)
        await page.click('.panneau-forme button:has-text("Transformer")'); await page.waitForTimeout(80)
      }
    }
    // Après le placement, un message ordinaire repasse sous le panneau
    await page.evaluate(() => window.__app.ui.message('Un message ordinaire.'))
    await page.waitForTimeout(80)
    verifier(`${L}×${H} … un message ordinaire, hors placement, repasse sous les panneaux`, await page.evaluate(() => !document.querySelector('.toast').classList.contains('dessus')))
    await ctx.close()
  }
})

// ----- 7. Le panneau ne couvre pas la figure qu'il règle -----
await section('7. Le panneau ne couvre pas la figure qu\'il règle', async () => {
  for (const [L, H] of [[1366, 768], [1024, 768]]) {
    for (const sorte of ['rectangle', 'rectangle-brut']) {
      for (const fy of [120, 250, 420]) {
        const { ctx, page } = await ouvrir({ viewport: { width: L, height: H } }, `couvre-${L}`)
        await POSER(page, sorte, { x: 300, y: fy, l: 160, h: 100 })
        await page.waitForTimeout(120)
        const pire = []
        for (const s of [null, 'Sommets', 'Codage', 'Contour', 'Fond', 'Transformer']) {
          if (s) { await page.click(`.panneau-forme .ligne button:has-text("${s}")`); await page.waitForTimeout(100) }
          const p = await PANNEAU(page)
          // Une place libre existe-t-elle (au-dessus sous la barre du haut, en
          // dessous, à droite, à gauche de la barre d'outils, à 14 px) ? Sinon
          // (un panneau haut sur un petit écran), il ne doit pas en couvrir
          // plus qu'avant le lot 3 (en dessous, ramené dans l'écran)
          const [fx1, fy1, fx2, fy2] = p.figure, barre = await page.evaluate(() => document.querySelector('.barre-outils').getBoundingClientRect().right + 8)
          const libre = fy1 - 14 - p.h >= 76 || fy2 + 14 + p.h <= H - 8 || fx2 + 14 + p.l <= L - 8 || fx1 - 14 - p.l >= barre
          let ancien = fy1 - p.h - 14
          if (ancien < 76) ancien = Math.min(fy2 + 14, H - p.h - 8)
          ancien = Math.max(8, ancien)
          const couvreAvant = Math.round(100 * Math.max(0, Math.min(ancien + p.h, fy2) - Math.max(ancien, fy1)) / (fy2 - fy1))
          if (!p.dansLEcran || (libre ? p.couvre > 0 : p.couvre > couvreAvant)) pire.push({ s, couvre: p.couvre, libre, couvreAvant, boite: p.boite, figure: p.figure, dansLEcran: p.dansLEcran })
          else if (!libre) console.log(`  (${L}×${H} ${sorte} à y ${fy}, ${s} : aucune place libre ; il couvre ${p.couvre} % de la figure, contre ${couvreAvant} % avant le lot 3)`)
          if (s && s !== 'Sommets' && s !== 'Codage') { await page.click(`.panneau-forme .ligne button:has-text("${s}")`); await page.waitForTimeout(80) }
        }
        verifier(`${L}×${H} ${sorte} à y ${fy} : le panneau, chaque section ouverte, ne couvre pas la figure quand il a la place (sinon moins qu'avant) et reste dans l'écran`, !pire.length, pire)
        await ctx.close()
      }
    }
  }
})

// ----- 8. Téléphone : le panneau et le menu ⋯ dans l'écran -----
await section('8. Téléphone : le panneau et le menu ⋯ dans l\'écran', async () => {
  {
    const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }, 'telephone')
    await POSER(page, 'plusieurs', { x: 60, y: 300 })
    await page.waitForTimeout(150)
    const p = await PANNEAU(page)
    const plus = await centreDe(page, '.panneau-forme .ligne button.plus')
    await page.touchscreen.tap(plus.x, plus.y); await page.waitForTimeout(200)
    const e = await MENU_PLUS(page)
    verifier('Téléphone : le menu de plusieurs objets et son menu ⋯ restent dans l\'écran', p.vu && p.dansLEcran && e.ouvert && e.dansLEcran, { p, e })
    await ctx.close()
  }
})

await nav.close()
for (const e of erreurs) console.log('ÉCHEC erreur JS : ' + e)
const ko = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - ko}/${resultats.length} vérifications réussies${erreurs.length ? `, ${erreurs.length} erreur(s) JS` : ''}`)
process.exit(ko || erreurs.length ? 1 : 0)
