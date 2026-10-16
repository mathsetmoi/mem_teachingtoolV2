// Essais au navigateur des corrections du contrôle final du lot 2 :
//  2. la barre d'actions se cache tant qu'un petit menu est ouvert (le menu
//     de la page, au clic droit ou à l'appui long dans le vide ; le menu du
//     zoom) et revient quand il se ferme ;
//  3. au doigt, un toucher DANS la barre moins de 300 ms après qu'elle a paru,
//     sans objet dessous, est avalé : la sélection reste, rien ne s'ouvre
//     (après un lasso, comme pour le second toucher d'un double appui) ; un
//     objet sous la barre se prend toujours ; passé 300 ms, « Options » ouvre
//     le menu complet ;
//  4. Ctrl+D (⌘D) dans un champ (la formule qu'on tape, le nom d'un sommet)
//     n'ouvre pas le marque-page du navigateur et ne duplique rien ;
//  5. pendant qu'on glisse un objet (ou qu'on entoure), Suppr, Retour arrière,
//     Ctrl+Z, Ctrl+Y, Ctrl+Maj+Z, Page↓ et les flèches ne font rien ; le lâcher
//     pose l'objet où on l'a mené ; après, Ctrl+Z et Suppr remarchent ;
//  6. « Modifier » du menu complet d'une formule : « (double-clic) » à la
//     souris, pas au doigt ;
//  8. la touche Menu du clavier et Maj+F10 : le menu complet de la sélection
//     (d'un objet, de plusieurs), le focus sur sa première entrée ; sans
//     sélection, le menu de la page au milieu de la vue ; jamais le menu du
//     navigateur ; rien dans un champ de saisie.
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

async function charger(nom, o = {}) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page, null, { timeout: 20000 })
  await page.waitForTimeout(400)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
    a.selection.clear(); a.options = null
    a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
    a.rendu.toutRedessiner(); a.ui.maj()
    // Les menus contextuels du navigateur : empêchés ou non
    window.__ctx = []
    window.addEventListener('contextmenu', e => window.__ctx.push(e.defaultPrevented), false)
  })
  const cdp = await ctx.newCDPSession(page)
  const touche = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id = 0]) => ({ x, y, id, radiusX: 8, radiusY: 8, force: 0.5 })) })
  return { ctx, page, touche }
}

/** Une forme posée telle quelle (un geste) ; rend son identifiant */
const poser = (page, f, id) => page.evaluate(([f, id]) => {
  const a = window.__app, t = a.tableau
  id = id || 'F' + Math.random().toString(36).slice(2)
  t.nouveauGeste(); t.poser(a.page, { id, z: Date.now() + Math.random(), auteur: t.moi, couleur: '#1b2230', taille: 4.5, ...f })
  return id
}, [f, id])
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
  const mz = document.querySelector('.menu-flottant[aria-label^="Zoom"]'), ba = document.querySelector('.barre-actions')
  const act = document.activeElement
  return {
    n: a.formes.length, pos: a.formes.map(f => f.id + ':' + Math.round(f.x) + ',' + Math.round(f.y)).sort(), sel: [...a.selection].sort(),
    page: a.page, pages: a.pages.length, cam: [a.cam.x, a.cam.y, a.cam.z], msgs: window.__msgs.slice(), options: a.options, geste: a.geste?.type ?? null,
    panneau: !pn.hidden, menuPage: !!mp && !mp.hidden, menuZoom: !!mz && !mz.hidden, barre: !!ba && !ba.hidden,
    menuPageRect: mp && !mp.hidden ? (r => ({ l: r.left, t: r.top, r: r.right, b: r.bottom }))(mp.getBoundingClientRect()) : null,
    focus: { tag: act?.tagName, txt: (act?.textContent || '').trim().slice(0, 40), panneau: pn.contains(act), menuPage: !!mp && mp.contains(act) },
    ctx: window.__ctx.slice(), pile: a.tableau.annulationDe?.(a.page)?.undoStack.length ?? null,
  }
})
const barreRect = page => page.evaluate(() => {
  const b = document.querySelector('.barre-actions')
  if (!b || b.hidden) return null
  const r = b.getBoundingClientRect(), op = b.querySelector('.action-options')?.getBoundingClientRect()
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, op: op && { x: op.left + op.width / 2, y: op.top + op.height / 2 } }
})
const presser = async (page, k, ms = 80) => { await page.keyboard.press(k); await page.waitForTimeout(ms) }
/** Un toucher sur un bouton de la barre, qui doit agir. Chrome, sous CDP,
 *  perd parfois le clic qu'il tire d'un toucher bref (environ une fois sur
 *  huit : pointerdown, pointerup, et aucun click) ; on retouche alors une
 *  fois, en le disant. Ce n'est pas l'appli qui est essayée là, mais le
 *  toucher synthétique. */
async function toucherBouton(page, touche, x, y) {
  await page.evaluate(() => { window.__clics = 0; if (!window.__ecouteClics) { window.__ecouteClics = true; document.addEventListener('click', () => window.__clics++, true) } })
  await touche('touchStart', [[x, y]]); await touche('touchEnd', []); await page.waitForTimeout(350)
  if (await page.evaluate(() => window.__clics)) return
  console.log('  (clic perdu par Chrome sous CDP : nouveau toucher)')
  await touche('touchStart', [[x, y]]); await touche('touchEnd', []); await page.waitForTimeout(350)
}

// =============== 2. La barre d'actions et un petit menu ouvert ===============
{
  const { ctx, page, touche } = await charger('barre-menus', { hasTouch: true })
  const T = await poser(page, trait(500, 400), 'T')
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const c = await ecranDe(page, 600, 400)
  await page.mouse.click(c.x, c.y); await page.waitForTimeout(150)
  let e = await etat(page)
  verifier('Souris, Sélection : un clic sur le trait le prend, la barre paraît', D(e.sel) === D([T]) && e.barre, e)
  const br = await barreRect(page)
  // Clic droit dans le vide, à gauche de la barre, à sa hauteur (là où le menu de la page la couvrirait)
  await page.mouse.click(br.l - 60, br.t + 5, { button: 'right' }); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Clic droit dans le vide : le menu de la page s\'ouvre et la barre se cache (un seul menu à la fois)', e.menuPage && !e.barre, e)
  verifier('… la sélection n\'a pas changé', D(e.sel) === D([T]), e.sel)
  await presser(page, 'Escape', 120)
  e = await etat(page)
  verifier('Échap ferme le menu de la page : la barre revient sur le trait', !e.menuPage && e.barre && D(e.sel) === D([T]), e)
  // Un appui ailleurs (dans le vide) ferme le menu sans rien faire d'autre : la barre revient
  await page.mouse.click(br.l - 60, br.t + 5, { button: 'right' }); await page.waitForTimeout(120)
  const v = await ecranDe(page, 900, 650)
  await page.mouse.click(v.x, v.y); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Un clic ailleurs ferme le menu de la page (sans désélectionner) : la barre revient', !e.menuPage && e.barre && D(e.sel) === D([T]), e)
  // Choisir une entrée : « Tout voir » ; la barre revient
  await page.mouse.click(br.l - 60, br.t + 5, { button: 'right' }); await page.waitForTimeout(120)
  await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].find(b => /Tout voir/.test(b.textContent)).click())
  await page.waitForTimeout(500)
  e = await etat(page)
  verifier('« Tout voir » choisi dans le menu de la page : le menu se ferme, la barre revient', !e.menuPage && e.barre, e)
  // Le menu du zoom (un menu à bouton) : la barre se cache, puis revient
  await page.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner(); a.ui.maj() })
  const bz = await page.evaluate(() => { const b = document.querySelector('.menu-flottant[aria-label^="Zoom"]'); const btn = [...document.querySelectorAll('button[aria-expanded]')].find(x => x.offsetParent && /zoom/i.test((x.title || '') + (x.getAttribute('aria-label') || ''))); if (!btn) return null; const r = btn.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  if (bz) {
    await page.mouse.click(bz.x, bz.y); await page.waitForTimeout(150)
    e = await etat(page)
    verifier('Le menu du zoom ouvert : la barre se cache', e.menuZoom && !e.barre, e)
    await presser(page, 'Escape', 120)
    e = await etat(page)
    verifier('… fermé (Échap) : la barre revient', !e.menuZoom && e.barre && D(e.sel) === D([T]), e)
  } else verifier('Le bouton du zoom existe', false)
  // Au doigt : l'appui long dans le vide ouvre le menu de la page, la barre se cache
  const t2 = await ecranDe(page, 600, 400)
  await touche('touchStart', [[t2.x, t2.y]]); await touche('touchEnd', []); await page.waitForTimeout(400)
  e = await etat(page)
  verifier('Doigt, Sélection : toucher le trait le prend, la barre paraît', D(e.sel) === D([T]) && e.barre, e)
  const vv = await ecranDe(page, 900, 600)
  await touche('touchStart', [[vv.x, vv.y]]); await page.waitForTimeout(650); await touche('touchEnd', []); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Appui long dans le vide : le menu de la page, sans la barre', e.menuPage && !e.barre, e)
  await presser(page, 'Escape', 150)
  e = await etat(page)
  verifier('… Échap : la barre revient', !e.menuPage && e.barre, e)
  await ctx.close()
}

// =============== 3. Toucher la barre juste après qu'elle a paru ===============
for (const delai of [120, 400]) {
  const { ctx, page, touche } = await charger('barre-tot-' + delai, { hasTouch: true })
  const tap = async (x, y, apres = 350) => { await touche('touchStart', [[x, y]]); await touche('touchEnd', []); await page.waitForTimeout(apres) }
  await poser(page, trait(250, 420, 120), 'TB')
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const l0 = await ecranDe(page, 200, 470), l1 = await ecranDe(page, 440, 395)
  const W = l1.x - l0.x, H = l1.y - l0.y
  await touche('touchStart', [[l0.x, l0.y]])
  for (const [u, v] of [[0.3, 0], [0.6, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5], [0.01, 0.05]]) await touche('touchMove', [[l0.x + W * u, l0.y + H * v]])
  await page.waitForTimeout(40)
  await touche('touchEnd', []); await page.waitForTimeout(delai)
  const br = await barreRect(page)
  if (!br?.op) { verifier(`Lasso au doigt : la barre paraît (${delai} ms)`, false); await ctx.close(); continue }
  // Avalé ou non, le premier toucher : s'il était rendu à la page, il
  // viderait la sélection dès l'appui (avant tout clic)
  if (delai < 300) await tap(br.op.x, br.op.y)
  else await toucherBouton(page, touche, br.op.x, br.op.y)
  const e = await etat(page)
  if (delai < 300) {
    verifier(`Lasso au doigt, « Options » touché ${delai} ms après : l'appui est avalé, la sélection reste, rien ne s'ouvre`, D(e.sel) === D(['TB']) && !e.panneau && !e.menuPage, e)
    verifier('… la barre est toujours là', e.barre, e)
    await toucherBouton(page, touche, br.op.x, br.op.y)
    const e2 = await etat(page)
    verifier('… un second toucher sur « Options » ouvre le menu complet', e2.panneau && D(e2.sel) === D(['TB']), e2)
  } else verifier(`Lasso au doigt, « Options » touché ${delai} ms après : le menu complet`, e.panneau && D(e.sel) === D(['TB']), e)
  await ctx.close()
}
{
  // Le second toucher d'un double appui qui tombe dans la barre (30 px au-dessus du trait)
  const { ctx, page, touche } = await charger('barre-double', { hasTouch: true })
  await poser(page, trait(400, 420, 200), 'TD')
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const p = await ecranDe(page, 500, 420)
  await touche('touchStart', [[p.x, p.y]]); await touche('touchEnd', []); await page.waitForTimeout(60)
  const br = await barreRect(page)
  const y2 = br ? br.b - 6 : p.y - 34
  await touche('touchStart', [[p.x, y2]]); await touche('touchEnd', []); await page.waitForTimeout(400)
  const e = await etat(page)
  verifier('Double appui au doigt dont le second toucher tombe dans la barre : la sélection reste', D(e.sel) === D(['TD']) && e.barre, { e, br, y2, p })
  // Un objet sous la barre : un toucher aussitôt le prend (il visait l'objet, pas la barre)
  await poser(page, trait(430, 380, 140), 'TH')
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.rendu.redessinerDirect(); a.ui.maj() })
  await page.waitForTimeout(100)
  await touche('touchStart', [[p.x, p.y]]); await touche('touchEnd', []); await page.waitForTimeout(80)
  const br2 = await barreRect(page)
  const h = await ecranDe(page, 500, 380)
  const sous = br2 && h.y > br2.t && h.y < br2.b
  await touche('touchStart', [[h.x, h.y]]); await touche('touchEnd', []); await page.waitForTimeout(400)
  const e2 = await etat(page)
  verifier('Un trait sous la barre, touché aussitôt après qu\'elle a paru : il est pris', !sous || D(e2.sel) === D(['TH']), { e2, br2, h })
  await ctx.close()
}

// =============== 4. Ctrl+D dans un champ ===============
{
  const { ctx, page } = await charger('ctrl-d')
  await page.evaluate(() => { window.__ed = window.__app.ui.editerFormule('', 300, 300) })
  await page.waitForSelector('dialog .saisie')
  await page.focus('dialog .saisie')
  await page.keyboard.type('x^2')
  const n0 = (await etat(page)).n
  const prevenu = await page.evaluate(() => {
    const s = document.querySelector('dialog .saisie')
    const r = {}
    for (const [nom, o] of [['Ctrl+D', { ctrlKey: true }], ['⌘D', { metaKey: true }], ['Ctrl+Maj+D', { ctrlKey: true, shiftKey: true }], ['AltGr+D', { ctrlKey: true, altKey: true }]]) {
      const ev = new KeyboardEvent('keydown', { key: nom.includes('Maj') ? 'D' : 'd', code: 'KeyD', bubbles: true, cancelable: true, ...o })
      s.dispatchEvent(ev); r[nom] = ev.defaultPrevented
    }
    const c = new KeyboardEvent('keydown', { key: 'c', code: 'KeyC', bubbles: true, cancelable: true, ctrlKey: true })
    s.dispatchEvent(c); r['Ctrl+C'] = c.defaultPrevented
    return r
  })
  verifier('Formule qu\'on tape : Ctrl+D et ⌘D sont empêchés (pas de marque-page)', prevenu['Ctrl+D'] && prevenu['⌘D'] && prevenu['Ctrl+Maj+D'], prevenu)
  verifier('… AltGr+D (Ctrl+Alt) et Ctrl+C restent au champ', !prevenu['AltGr+D'] && !prevenu['Ctrl+C'], prevenu)
  await presser(page, 'Control+d', 150)
  const e = await etat(page)
  const val = await page.evaluate(() => document.querySelector('dialog .saisie')?.value)
  verifier('… Ctrl+D au clavier ne duplique rien et ne change pas le texte', e.n === n0 && val === 'x^2', { n: e.n, n0, val })
  await page.evaluate(() => document.querySelector('dialog .secondaire').click())
  // Le nom d'un sommet, dans le menu d'un sommet
  const P = await poser(page, { type: 'polygone', x: 300, y: 300, pts: [0, 0, 150, 0, 60, 120], ferme: true, sommets: true, noms: ['A', 'B', 'C'] }, 'P')
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('P'); a.rendu.redessinerDirect(); a.ui.maj() })
  const s0 = await ecranDe(page, 300, 300)
  await page.mouse.click(s0.x, s0.y, { button: 'right' }); await page.waitForTimeout(200)
  const champ = await page.$('.menu-partie input.saisie')
  if (champ) {
    await champ.focus()
    const r = await page.evaluate(() => { const s = document.activeElement; const ev = new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true, cancelable: true, ctrlKey: true }); s.dispatchEvent(ev); return { tag: s.tagName, p: ev.defaultPrevented } })
    verifier('Nom d\'un sommet : Ctrl+D est empêché', r.tag === 'INPUT' && r.p, r)
  } else verifier('Le menu du sommet A a son champ « Nom »', false, await etat(page))
  await ctx.close()
}

// =============== 5. Les touches pendant qu'on glisse un objet ===============
{
  const { ctx, page } = await charger('glisser-touches')
  const A = await poser(page, trait(300, 250), 'A')
  const B = await poser(page, trait(300, 400), 'B')
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  const b = await ecranDe(page, 400, 400)
  for (const k of ['Delete', 'Backspace', 'Control+z', 'Control+y', 'Control+Shift+z', 'PageDown', 'ArrowRight']) {
    const avant = await etat(page)
    await page.mouse.move(b.x, b.y); await page.mouse.down()
    for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + 5 * i, b.y + 4 * i)
    await page.waitForTimeout(50)
    const pendant0 = await etat(page)
    await presser(page, k, 100)
    const pendant = await etat(page)
    verifier(`Glisser B à la souris, ${k} : rien ne change (B toujours là et pris, même page, même pile)`,
      pendant.geste === 'deplacer' && pendant.n === avant.n && D(pendant.sel) === D(['B']) && pendant.page === avant.page && pendant.pile === pendant0.pile && pendant.msgs.length === pendant0.msgs.length,
      { avant, pendant })
    await page.mouse.up(); await page.waitForTimeout(150)
    const apres = await etat(page)
    const bAvant = avant.pos.find(p => p.startsWith('B:')), bApres = apres.pos.find(p => p.startsWith('B:'))
    const [x0, y0] = (bAvant ?? 'B:0,0').slice(2).split(',').map(Number), [x1, y1] = (bApres ?? 'B:NaN,NaN').slice(2).split(',').map(Number)
    verifier(`… au lâcher, B est posé 50, 40 plus loin`, x1 - x0 === 50 && y1 - y0 === 40, { bAvant, bApres })
    if (!bApres) break
    await page.evaluate(() => { window.__msgs.length = 0 })
    await page.mouse.move(b.x + 50, b.y + 40)
    b.x += 50; b.y += 40
  }
  // Après le lâcher, les touches remarchent
  let e0 = await etat(page)
  await presser(page, 'Control+z', 150)
  let e = await etat(page)
  verifier('Après le lâcher, Ctrl+Z défait le dernier déplacement de B', D(e.pos) !== D(e0.pos) && e.n === e0.n, { e0: e0.pos, e: e.pos })
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('B'); a.rendu.redessinerDirect(); a.ui.maj() })
  await presser(page, 'Delete', 150)
  e = await etat(page)
  verifier('… et Suppr efface B', e.n === e0.n - 1 && !e.pos.some(p => p.startsWith('B:')), e.pos)
  // Pendant un cadre (glisser depuis le vide) : Ctrl+Z ne défait rien
  e0 = await etat(page)
  const v0 = await ecranDe(page, 700, 150), v1 = await ecranDe(page, 900, 300)
  await page.mouse.move(v0.x, v0.y); await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(v0.x + (v1.x - v0.x) * i / 8, v0.y + (v1.y - v0.y) * i / 8)
  await presser(page, 'Control+z', 100)
  e = await etat(page)
  verifier('Pendant un cadre de sélection, Ctrl+Z ne défait rien', e.n === e0.n && e.pile === e0.pile && e.geste === 'zone', e)
  await page.mouse.up(); await page.waitForTimeout(100)
  await ctx.close()
}

// =============== 6. « Modifier » du menu d'une formule ===============
{
  const { ctx, page, touche } = await charger('formule-titre', { hasTouch: true })
  await poser(page, { type: 'formule', x: 400, y: 350, latex: 'x^2+1', taille: 28 }, 'FX')
  await page.evaluate(() => window.__app.choisirOutil('selection'))
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => { const el = [...document.querySelectorAll('.formule, .katex')].map(x => x.getBoundingClientRect()).find(r => r.width > 5); return el && { x: el.left + el.width / 2, y: el.top + el.height / 2 } })
  const c = r ?? await ecranDe(page, 420, 365)
  await page.mouse.click(c.x, c.y, { button: 'right' }); await page.waitForTimeout(200)
  const titre = () => page.evaluate(() => { const b = [...document.querySelectorAll('.panneau-forme button')].find(x => x.textContent.trim() === 'Modifier'); return b ? { t: b.title, a: b.getAttribute('aria-label') } : null })
  let t = await titre()
  verifier('Souris : « Modifier » du menu de la formule dit « (double-clic) »', t && /double-clic/.test(t.t), t)
  await presser(page, 'Escape', 150)
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.maj() })
  await touche('touchStart', [[c.x, c.y]]); await page.waitForTimeout(650); await touche('touchEnd', []); await page.waitForTimeout(250)
  const e = await etat(page)
  t = await titre()
  verifier('Doigt (appui long) : le menu de la formule s\'ouvre, « Modifier » ne parle pas de double-clic', e.panneau && t && !/clic/.test(t.t) && !/clic/.test(t.a ?? ''), { e, t })
  await ctx.close()
}

// =============== 8. La touche Menu et Maj+F10 ===============
{
  const { ctx, page } = await charger('touche-menu')
  await poser(page, trait(400, 300), 'M1')
  await poser(page, trait(400, 450), 'M2')
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('M1'); a.rendu.redessinerDirect(); a.ui.maj() })
  await page.waitForTimeout(150)
  await presser(page, 'Shift+F10', 200)
  let e = await etat(page)
  verifier('Maj+F10, un trait sélectionné : son menu complet s\'ouvre, le focus sur sa première entrée', e.panneau && e.options === 'M1' && e.focus.panneau, e)
  verifier('… le menu du navigateur ne s\'ouvre pas', e.ctx.every(p => p), e.ctx)
  await presser(page, 'Escape', 150)
  e = await etat(page)
  verifier('… Échap le ferme', !e.panneau, e)
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('M1'); a.selection.add('M2'); a.rendu.redessinerDirect(); a.ui.maj() })
  await presser(page, 'ContextMenu', 200)
  e = await etat(page)
  verifier('Touche Menu, deux traits sélectionnés : leur menu commun, le focus dedans', e.panneau && e.options !== null && e.options !== 'M1' && e.options !== 'M2' && D(e.sel) === D(['M1', 'M2']) && e.focus.panneau, e)
  verifier('… le menu du navigateur ne s\'ouvre pas', e.ctx.every(p => p), e.ctx)
  await presser(page, 'Escape', 150)
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.rendu.redessinerDirect(); a.ui.maj() })
  await page.waitForTimeout(100)
  await presser(page, 'ContextMenu', 200)
  e = await etat(page)
  const zone = await page.evaluate(() => { const z = document.getElementById('zone').getBoundingClientRect(); const r = window.__app.ui.zoneLibre(); return { x: z.left + r.x + r.l / 2, y: z.top + r.y + r.h / 2 } })
  // (lot 3, P7 : le menu de la page a reçu un filet et « Copier la page en
  // image » ; plus haut, il ne tient plus sous le milieu d'une vue de 768 px
  // et remonte juste assez pour rester dans l'écran, comme tout menu : son
  // coin est au milieu de la vue, ou son bas à 8 px du bas de l'écran)
  verifier('Touche Menu sans sélection : le menu de la page s\'ouvre au milieu de la vue, le focus sur sa première entrée',
    e.menuPage && e.focus.menuPage && Math.abs(e.menuPageRect.l - zone.x - 6) < 4
    && (Math.abs(e.menuPageRect.t - zone.y) < 4 || (e.menuPageRect.t < zone.y && Math.abs(e.menuPageRect.b - (768 - 8)) < 2)), { e, zone })
  verifier('… le menu du navigateur ne s\'ouvre pas', e.ctx.every(p => p), e.ctx)
  // Coller ici colle au milieu de la vue : Tout sélectionner prend les deux traits
  await presser(page, 'Escape', 150)
  await presser(page, 'Shift+F10', 200)
  e = await etat(page)
  verifier('Maj+F10 sans sélection : le menu de la page', e.menuPage && e.focus.menuPage, e)
  await presser(page, 'Escape', 150)
  // Dans un champ de saisie : rien de MEM (le menu du navigateur y garde Coller)
  await page.evaluate(() => { window.__ed = window.__app.ui.editerFormule('', 300, 300) })
  await page.waitForSelector('dialog .saisie')
  await page.focus('dialog .saisie')
  await page.evaluate(() => { const a = window.__app; a.selection.add('M1'); a.ui.maj() })
  await presser(page, 'Shift+F10', 200)
  e = await etat(page)
  verifier('Maj+F10 dans le champ d\'une formule : ni le menu complet ni celui de la page', !e.panneau && !e.menuPage, e)
  await page.evaluate(() => document.querySelector('dialog .secondaire').click())
  // Pendant qu'on glisse un objet : rien
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.maj() })
  const p = await ecranDe(page, 500, 300)
  await page.mouse.move(p.x, p.y); await page.mouse.down()
  for (let i = 1; i <= 6; i++) await page.mouse.move(p.x + 6 * i, p.y + 3 * i)
  await presser(page, 'ContextMenu', 150)
  e = await etat(page)
  verifier('Touche Menu pendant qu\'on glisse un trait : aucun menu', !e.panneau && !e.menuPage && e.geste === 'deplacer', e)
  await page.mouse.up()
  await ctx.close()
}

if (erreurs.length) console.log('ÉCHEC erreurs JS : ' + JSON.stringify(erreurs.slice(0, 10)))
const ko = resultats.filter(r => !r.ok).length
console.log(`${resultats.length - ko} / ${resultats.length} vérifications réussies`)
await nav.close()
process.exit(ko || erreurs.length ? 1 : 0)
