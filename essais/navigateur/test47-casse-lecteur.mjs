// Essayer de CASSER la revue en classe (src/revue/) dans un vrai navigateur.
// Lancer avec le serveur de développement sur :5173.
//   node test47-casse-lecteur.mjs            tout
//   node test47-casse-lecteur.mjs frise      une seule partie (vide, pages, fermer, touches, double,
//                                            stylet, annuler, perf, mise, frise, rotation, jetees, theme)
// Chaque ÉCHEC marqué [DÉFAUT] est un défaut reproduit ; les autres vérifications sont des garde-fous.
import { ouvrirPage, ETAT, REVUE, BOUTON, tracer, verifier, fin, DOSSIER, dort, erreurs } from './test47-commun.mjs'
import { FABRIQUER, CALME } from './t47/fabrique.mjs'

const SEULEMENT = process.argv[2] || ''
const partie = nom => !SEULEMENT || SEULEMENT === nom
const memeEtat = (a, b) => Object.keys(a).filter(c => a[c] !== b[c])
// Ouvrir la revue. Adapté au lot 5 (K10, la mise en page du téléphone,
// voulue) : à 640 px de large au plus, le bouton « Revoir » n'est plus dans
// la barre du haut ; la revue s'ouvre par « Plus → Revoir la construction »
// (la même revue : les mesures qui suivent ne changent pas). Ailleurs, le
// bouton, comme avant.
const ouvrirLaRevue = async page => {
  if (page.viewportSize().width > 640) return page.getByRole('button', { name: BOUTON }).click()
  await page.locator('.barre-haut > .bouton.points').click()
  await page.locator('.menu-flottant[aria-label="Plus"] .menu-item[data-action="revue"]').click()
}

// =============================================================
// 1. Film vide, puis d'un seul trait
// =============================================================
if (partie('vide')) {
  const { ctx, page } = await ouvrirPage({ nom: 'vide' })
  const film0 = await page.evaluate(() => window.__app.tableau.film.length)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(100)
  const vide = await page.evaluate(() => ({ ouvert: window.__revue.ouvert, enLecture: window.__app.enLecture, toast: document.querySelector('.toast').textContent }))
  verifier('Film d\'une étape (tableau neuf) : message, pas de calque', film0 === 1 && !vide.ouvert && !vide.enLecture && /^Rien à revoir/.test(vide.toast), JSON.stringify({ film0, ...vide }))
  await tracer(page, 400, 300)
  await page.waitForTimeout(300)
  const avant = await page.evaluate(ETAT)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  const e = await page.evaluate(REVUE)
  verifier('Un seul trait : la revue s\'ouvre sur l\'affiche', e.ouvert && e.k === e.n - 1 && !e.enMarche, JSON.stringify(e))
  const compteur = await page.evaluate(() => document.querySelector('.revue-compteur').textContent)
  verifier('[DÉFAUT] Un seul trait tracé : le compteur et le bandeau disent « 1 geste »', e.total === 1 && /· 1 geste —/.test(e.bandeau), `compteur « ${compteur} », bandeau « ${e.bandeau.split(' —')[0]} »`)
  await page.keyboard.press(' ')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 5000 })
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 5000 })
  await page.keyboard.press('ArrowLeft'); await page.keyboard.press('End')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  const apres = await page.evaluate(ETAT)
  verifier('Un seul trait : document identique octet pour octet après Espace, →, ←, Fin, Échap', !memeEtat(avant, apres).length, memeEtat(avant, apres).join(',') || `${apres.octets} octets`)
  await ctx.close()
}

// =============================================================
// 2. Plusieurs pages, une page jetée, rejouée
// =============================================================
if (partie('pages')) {
  const { ctx, page } = await ouvrirPage({ nom: 'pages' })
  for (let i = 0; i < 3; i++) await tracer(page, 200, 150 + i * 80)
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(50)
  for (let i = 0; i < 3; i++) await tracer(page, 500, 150 + i * 80)
  const p2 = await page.evaluate(() => window.__app.page)
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(50)
  for (let i = 0; i < 2; i++) await tracer(page, 800, 150 + i * 80)
  await page.evaluate(p => window.__app.allerPage(p), p2); await page.waitForTimeout(50)
  await page.evaluate(() => window.__app.supprimerPage()); await page.waitForTimeout(50)
  await tracer(page, 200, 500)
  await page.waitForTimeout(300)
  const avant = await page.evaluate(ETAT)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  await page.locator('.revue-section', { has: page.locator('h3', { hasText: 'Pages jetées' }) }).locator('.revue-choix').first().click()
  await page.waitForTimeout(100)
  const jetee = await page.evaluate(() => {
    const r = window.__revue, b = r.bande
    const vus = []
    for (let k = 0; k < b.images.length; k++) { r.aller(k); vus.push(r.rendu.formes.length) }
    return { vus, ligne1: document.querySelector('.revue-ou .ligne1').textContent, genre: b.portion.genre }
  })
  verifier('Page jetée rejouée : ses trois traits paraissent un à un, sous le nom « Page jetée »', jetee.genre === 'page' && jetee.vus[jetee.vus.length - 1] === 3 && jetee.ligne1.startsWith('Page jetée'), JSON.stringify(jetee))
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  await page.locator('.revue-seance').first().click()
  await page.keyboard.press('4'); await page.keyboard.press('Home')
  for (let i = 0; i < 3; i++) { await page.keyboard.press(' '); await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 20000 }) }
  const seance = await page.evaluate(REVUE)
  verifier('Séance entière (pages 1, jetée, 2) lue jusqu\'au bout', seance.k === seance.n - 1 && seance.parties === 3, JSON.stringify(seance))
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const apres = await page.evaluate(ETAT)
  verifier('Pages : document identique octet pour octet', !memeEtat(avant, apres).length, memeEtat(avant, apres).join(','))
  // Un autre appareil jette la page affichée pendant la revue
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  await page.keyboard.press(' ')
  await page.evaluate(() => { const app = window.__app; app.nouvellePage() })
  await page.waitForTimeout(800)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  verifier('Écriture d\'ailleurs pendant la revue : pas d\'erreur, le tableau se relit à la fermeture', await page.evaluate(() => !window.__app.enLecture && window.__app.pages.includes(window.__app.page)))
  await ctx.close()
}

// =============================================================
// 3. Fermer pendant un tracé, pendant la lecture, à la souris ; Échap
// =============================================================
if (partie('fermer')) {
  const { ctx, page } = await ouvrirPage({ nom: 'fermer' })
  await page.evaluate(async () => {
    const app = window.__app, t = app.tableau
    for (let i = 0; i < 6; i++) {
      t.poser(app.page, { id: 'tri' + i, type: 'polygone', x: 100 + i * 150, y: 300, z: i, auteur: t.moi, pts: [0, 0, 120, 0, 60, -100], ferme: true, couleur: '#1f5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
      await new Promise(r => setTimeout(r, 400))
    }
  })
  await page.waitForTimeout(300)
  await page.evaluate(() => { const app = window.__app; app.choisirOutil('selection'); app.selection.add('tri2'); app.basculerInstrument('regle'); app.rendu.toutRedessiner(); app.ui.maj() })
  await page.waitForTimeout(200)
  const avant = await page.evaluate(ETAT)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  await page.keyboard.press('1'); await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => !!window.__revue.trace, null, { timeout: 3000 })
  await page.getByRole('button', { name: 'Revenir au direct' }).click()
  await page.waitForTimeout(300)
  const ferme = await page.evaluate(() => ({ ouvert: window.__revue.ouvert, boucle: window.__revue.boucle, trace: window.__revue.trace, enLecture: window.__app.enLecture, focus: document.activeElement?.getAttribute('aria-label') }))
  verifier('Fermer à la souris en plein tracé : plus de boucle, focus rendu au bouton', !ferme.ouvert && !ferme.boucle && !ferme.trace && !ferme.enLecture && ferme.focus === BOUTON, JSON.stringify(ferme))
  const apres = await page.evaluate(ETAT)
  verifier('Sélection, outil, instruments, caméra, page : rendus tels quels', !memeEtat(avant, apres).length, memeEtat(avant, apres).join(','))
  // Échap : d'abord le tiroir, puis la revue
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  // (Adapté au lot 6 : les séances sont explicites, le tiroir n'a plus le choix du découpage ; le focus va sur sa case)
  await page.locator('.revue-tiroir input[type=checkbox]').focus()
  await page.keyboard.press('Escape')
  const e1 = await page.evaluate(() => ({ tiroir: !document.querySelector('.revue-tiroir').hidden, revue: window.__revue.ouvert }))
  await page.keyboard.press('Escape')
  const e2 = await page.evaluate(() => window.__revue.ouvert)
  verifier('Échap (focus dans le tiroir) ferme le tiroir, puis Échap ferme la revue', !e1.tiroir && e1.revue && !e2, JSON.stringify({ e1, e2 }))
  // Le stylo écrit de nouveau tout de suite après
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const f0 = await page.evaluate(() => window.__app.tableau.film.length)
  await tracer(page, 900, 120)                    // loin de la règle, qui se laisserait déplacer
  await page.waitForTimeout(200)
  verifier('Après la fermeture, le stylo écrit aussitôt', await page.evaluate(() => window.__app.tableau.film.length) > f0)
  await ctx.close()
}

// =============================================================
// 4. Les touches du tableau pendant la lecture ; Espace maintenue
// =============================================================
if (partie('touches')) {
  const { ctx, page } = await ouvrirPage({ nom: 'touches' })
  for (let i = 0; i < 8; i++) await tracer(page, 200 + (i % 4) * 150, 150 + Math.floor(i / 4) * 120, 120, 10)
  await page.evaluate(() => { const app = window.__app; app.choisirOutil('selection'); app.selection.add(app.rendu.formes[0].id); app.rendu.toutRedessiner(); app.ui.maj() })
  await page.waitForTimeout(300)
  const avant = await page.evaluate(ETAT)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  await page.keyboard.press(' ')
  for (const k of ['p', 'h', 'e', 'x', 'l', 'f', 'v', 'r', 'c', 'g', 'Delete', 'Backspace', 'Control+z', 'Control+Shift+z', 'Control+y', 'ArrowUp', 'ArrowDown', 'Shift+ArrowUp', 'Enter', 'Control+a', 'Control+x', 'Control+v', 'Control+d']) await page.keyboard.press(k)
  // Tab puis Entrée partout : aucun bouton caché du tableau n'est atteint
  for (let i = 0; i < 18; i++) { await page.keyboard.press('Tab'); if (await page.evaluate(() => !document.activeElement?.closest('.revue') && document.activeElement !== document.body)) break }
  const horsRevue = await page.evaluate(() => !document.activeElement?.closest('.revue') && document.activeElement !== document.body && document.activeElement?.getAttribute('aria-label'))
  await page.keyboard.press('Escape')
  await page.waitForTimeout(150)
  const apres = await page.evaluate(ETAT)
  verifier('Raccourcis du tableau pendant la lecture : sans effet sur le document, l\'outil, la sélection', !memeEtat(avant, apres).length, memeEtat(avant, apres).join(','))
  verifier('Tab ne mène jamais à un bouton du tableau', !horsRevue, String(horsRevue))
  // Espace maintenue : le clavier répète la touche (≈ 30 fois par seconde après une demi-seconde)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  await page.getByRole('button', { name: 'Rapide', exact: true }).click()       // un clic : le bouton rend la main
  const cdp = await ctx.newCDPSession(page)
  await page.evaluate(() => { window.__etats = []; const r = window.__revue, o = r.basculer.bind(r); r.basculer = () => { o(); window.__etats.push(r.enMarche ? 'lecture' : 'pause') } })
  const espace = { key: ' ', code: 'Space', text: ' ', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...espace })
  await dort(500)
  for (let i = 0; i < 6; i++) { await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...espace, autoRepeat: true }); await dort(33) }
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32 })
  const etats = await page.evaluate(() => window.__etats)
  verifier('[DÉFAUT] Espace maintenue ~0,7 s : une seule bascule (les répétitions du clavier sont ignorées)', etats.length === 1, `${etats.length} bascules : ${etats.join(' → ')}`)
  await page.keyboard.press('Escape')
  await ctx.close()
}

// =============================================================
// 5. Double-clic, double appui sur « Revoir »
// =============================================================
if (partie('double')) {
  const { ctx, page } = await ouvrirPage({ nom: 'double', hasTouch: true })
  for (let i = 0; i < 8; i++) await tracer(page, 200 + (i % 4) * 150, 150 + Math.floor(i / 4) * 120, 120, 10)
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: BOUTON }).dblclick()
  await page.waitForTimeout(60)
  const souris = await page.evaluate(REVUE)
  verifier('[DÉFAUT] Double-clic sur « Revoir » : la revue s\'ouvre en pause sur l\'affiche', !souris.enMarche && souris.k === souris.n - 1, JSON.stringify({ enMarche: souris.enMarche, k: souris.k, n: souris.n, bandeau: souris.bandeau }))
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  const b = await page.getByRole('button', { name: BOUTON }).boundingBox()
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(120)
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2)
  await page.waitForTimeout(60)
  const doigt = await page.evaluate(REVUE)
  await page.screenshot({ path: `${DOSSIER}/05-double-appui.png` })
  verifier('[DÉFAUT] Double appui au doigt (TNI) sur « Revoir » : la revue s\'ouvre en pause sur l\'affiche', !doigt.enMarche && doigt.k === doigt.n - 1, JSON.stringify({ enMarche: doigt.enMarche, k: doigt.k, n: doigt.n }))
  await ctx.close()
}

// =============================================================
// 6. Stylet et doigt réels (CDP) sur toute la revue
// =============================================================
if (partie('stylet')) {
  const { ctx, page } = await ouvrirPage({ nom: 'stylet', hasTouch: true })
  for (let i = 0; i < 6; i++) await tracer(page, 200 + (i % 3) * 200, 150 + Math.floor(i / 3) * 120, 120, 10)
  await page.waitForTimeout(300)
  const cdp = await ctx.newCDPSession(page)
  const stylet = async pts => {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pts[0][0], y: pts[0][1], pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
    for (const [x, y] of pts.slice(1)) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 })
    const [x, y] = pts[pts.length - 1]
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
  }
  const doigt = async pts => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1], id: 1 }] })
    for (const [x, y] of pts.slice(1)) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const f0 = await page.evaluate(() => window.__app.tableau.film.length)
  await stylet([[300, 520], [340, 540], [380, 520]])
  await page.waitForTimeout(300)
  const f1 = await page.evaluate(() => window.__app.tableau.film.length)
  const avant = await page.evaluate(ETAT)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(150)
  const z = await page.evaluate(() => { const q = s => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left, r.top] }; return { barre: q('.revue-barre'), frise: q('.revue-frise') } })
  for (const pts of [[[300, 300], [360, 340], [420, 300]], [[60, 40], [120, 60]], [[z.barre[0] + 5, z.barre[1] + 5], [z.barre[0] + 60, z.barre[1] + 8]], [[z.frise[0] + 10, z.frise[1] + 20], [z.frise[0] + 300, z.frise[1] + 20]], [[3, 400], [3, 600]], [[1277, 100], [1277, 300]]]) { await stylet(pts); await doigt(pts) }
  await page.waitForTimeout(700)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const apres = await page.evaluate(ETAT)
  verifier('Stylet et doigt réels partout sur la revue (scène, pastille, barre, frise, bords) : rien d\'écrit', f1 > f0 && !memeEtat(avant, apres).length, `contrôle hors revue ${f0}→${f1} ; ` + (memeEtat(avant, apres).join(',') || 'identique'))
  await ctx.close()
}

// =============================================================
// 7. Annuler sur une autre page : l'affiche ment
// =============================================================
if (partie('annuler')) {
  const { ctx, page } = await ouvrirPage({ nom: 'annuler' })
  for (let i = 0; i < 3; i++) await tracer(page, 300, 200 + i * 80)
  await page.waitForTimeout(500)
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(100)
  await tracer(page, 600, 300)
  await page.waitForTimeout(500)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(100)      // le trait de la page 2
  // Le 3e trait de la page 1, retiré en regardant la page 2. (Adapté au lot 2 :
  // Ctrl+Z n'agit plus que sur la page visible ; on simule l'ancien Ctrl+Z par
  // la pile de la page 1, comme dans un tableau d'avant.)
  await page.evaluate(() => window.__app.tableau.annulationDe(window.__app.pages[0]).undo()); await page.waitForTimeout(100)
  await page.evaluate(() => window.__app.allerPage(window.__app.pages[0])); await page.waitForTimeout(200)
  // (lot 3, P3 : le changement de page fait paraître son numéro en grand, un
  // peu plus d'une seconde, en haut au centre : on attend qu'il soit parti
  // avant de comparer l'écran au pixel près)
  await page.waitForFunction(() => { const a = document.querySelector('.annonce-page'); return !a || a.hidden }, null, { timeout: 5000 })
  const zone = { x: 200, y: 120, width: 600, height: 400 }
  const tableau = await page.evaluate(() => window.__app.rendu.formes.length)
  const imgT = await page.screenshot({ clip: zone, path: `${DOSSIER}/07-annuler-tableau.png` })
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(200)
  const revue = await page.evaluate(() => window.__revue.rendu.formes.length)
  const imgR = await page.screenshot({ clip: zone, path: `${DOSSIER}/07-annuler-revue.png` })
  verifier('[DÉFAUT] Après Ctrl+Z fait depuis une autre page, l\'affiche de la revue montre la page telle qu\'à l’écran', revue === tableau && Buffer.compare(imgT, imgR) === 0, `tableau : ${tableau} traits, affiche de la revue : ${revue} traits`)
  await ctx.close()
}

// =============================================================
// 8. Un long film : 3 000 gestes réalistes
// =============================================================
if (partie('perf')) {
  const { ctx, page } = await ouvrirPage({ nom: 'perf', horloge: -21 * 86400_000 })
  const fab = await page.evaluate(FABRIQUER)
  console.log('      (film fabriqué :', JSON.stringify(fab), ')')
  await page.evaluate(CALME)
  const ouvrir = () => page.evaluate(async (BOUTON) => {
    const b = document.querySelector(`[aria-label="${BOUTON}"]`)
    const longues = []; const obs = new PerformanceObserver(l => { for (const x of l.getEntries()) longues.push(Math.round(x.duration)) }); obs.observe({ type: 'longtask' })
    const t0 = performance.now()
    b.click()
    const sync = performance.now() - t0
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise(r => setTimeout(r, 0))
    const image = performance.now() - t0
    await new Promise(r => setTimeout(r, 200)); obs.disconnect()
    return { sync: Math.round(sync), image: Math.round(image), longues }
  }, BOUTON)
  const o1 = await ouvrir()
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  const o2 = await ouvrir()
  const tableau = await page.evaluate(async () => {
    const app = window.__app
    await new Promise(r => setTimeout(r, 0))
    return 0
  })
  verifier('3 000 gestes : ouvrir() rend la main en moins de 300 ms', o1.sync < 300, `1re ouverture : ${o1.sync} ms dans ouvrir(), première image à ${o1.image} ms (tâches ${o1.longues.join('/')}) ; 2e : ${o2.sync} / ${o2.image} ms`)
  const sauts = []
  await page.evaluate(() => { const r = window.__revue; r.choisirPortion({ genre: 'page', page: window.__app.page }) })
  const f = await page.evaluate(() => { const r = document.querySelector('.revue-frise').getBoundingClientRect(); return { x: r.left, y: r.top + r.height / 2, l: r.width } })
  for (const x of [0.5, 0.25, 0.75]) {
    const t1 = await page.evaluate(() => performance.now())
    await page.mouse.click(f.x + f.l * x, f.y)
    sauts.push(await page.evaluate(t1 => new Promise(r => requestAnimationFrame(() => r(Math.round(performance.now() - t1)))), t1))
  }
  for (const k of ['End', 'Home', ']', '[']) {
    const t1 = await page.evaluate(() => performance.now())
    await page.keyboard.press(k)
    sauts.push(await page.evaluate(t1 => new Promise(r => requestAnimationFrame(() => r(Math.round(performance.now() - t1)))), t1))
  }
  verifier('3 000 gestes : sauter au milieu (frise, Fin, Origine, [ ]) répond en moins de 150 ms', sauts.every(s => s < 150), sauts.join(' / ') + ' ms')
  await ctx.close()
}

// =============================================================
// 9. Mise en page : TNI 1024 × 768, téléphone 390 × 844
// =============================================================
if (partie('mise')) {
  for (const vp of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const { ctx, page } = await ouvrirPage({ nom: 'mise' + vp.width, viewport: vp, hasTouch: true, isMobile: vp.width < 500, horloge: -3 * 86400_000 })
    await page.evaluate(async () => {
      const app = window.__app, t = app.tableau
      let n = 0
      const trait = (x, y) => ({ id: 'm' + (n++), type: 'trait', x, y, z: n, auteur: t.moi, pts: Array.from({ length: 16 }, (_, i) => [i * 10, Math.sin(i / 2) * 12, 0.5]).flat(), couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
      for (let s = 0; s < 3; s++) {
        for (let i = 0; i < 10; i++) { t.poser(app.page, trait(30 + (i % 3) * 110, 60 + i * 30)); await new Promise(r => setTimeout(r, 0)); window.__decalage += 1500 }
        app.nouvellePage(); await new Promise(r => setTimeout(r, 0))
        for (let i = 0; i < 4; i++) { t.poser(app.page, trait(30, 60 + i * 30)); await new Promise(r => setTimeout(r, 0)); window.__decalage += 1500 }
        window.__decalage += 86400_000
      }
      window.__decalage = 0
    })
    await page.waitForTimeout(300)
    await ouvrirLaRevue(page)
    await page.waitForTimeout(200)
    const mesure = () => page.evaluate(() => {
      const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 }
      const cibles = [...document.querySelectorAll('.revue button, .revue select, .revue input, .revue-frise')].filter(vis)
      const petites = cibles.map(c => { const r = (c.closest('label') || c).getBoundingClientRect(); return `${c.getAttribute('aria-label') || c.textContent.trim().slice(0, 20)} ${Math.round(r.width)}×${Math.round(r.height)}` }).filter((x, i) => { const r = (cibles[i].closest('label') || cibles[i]).getBoundingClientRect(); return r.width < 40 || r.height < 40 })
      const dehors = cibles.filter(c => { const r = c.getBoundingClientRect(); return r.left < 0 || r.right > innerWidth + 0.5 || r.top < 0 || r.bottom > innerHeight + 0.5 }).length
      return { petites, dehors, defile: document.documentElement.scrollWidth > innerWidth }
    })
    const m1 = await mesure()
    await page.getByRole('button', { name: /^Que revoir/ }).click()
    await page.waitForTimeout(150)
    const m2 = await mesure()
    await page.screenshot({ path: `${DOSSIER}/09-mise-${vp.width}.png` })
    verifier(`${vp.width} × ${vp.height} : cibles ≥ 40 px, rien hors de l'écran, pas de défilement (revue et tiroir)`, !m1.petites.length && !m2.petites.length && !m1.dehors && !m2.dehors && !m1.defile && !m2.defile, JSON.stringify({ m1, m2 }))
    await ctx.close()
  }
}

// =============================================================
// 10. La frise d'une longue histoire : 30 séances sur une page
// =============================================================
if (partie('frise')) {
  for (const vp of [{ width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const { ctx, page } = await ouvrirPage({ nom: 'frise' + vp.width, viewport: vp, horloge: -40 * 86400_000 })
    await page.evaluate(async () => {
      const app = window.__app, t = app.tableau
      let n = 0
      const trait = (x, y) => ({ id: 'f' + (n++), type: 'trait', x, y, z: n, auteur: t.moi, pts: Array.from({ length: 16 }, (_, i) => [i * 10, Math.sin(i / 2) * 12, 0.5]).flat(), couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
      // La première séance construit la notion (200 gestes), les 29 suivantes y reviennent un peu
      for (let s = 0; s < 30; s++) {
        for (let i = 0; i < (s ? 3 : 200); i++) { t.poser(app.page, trait(50 + (i % 20) * 40, 50 + s * 20)); await new Promise(r => setTimeout(r, 0)); window.__decalage += 1500 }
        window.__decalage += 86400_000
      }
      window.__decalage = 0
    })
    await page.waitForTimeout(300)
    await ouvrirLaRevue(page)
    await page.waitForTimeout(100)
    await page.getByRole('button', { name: /^Que revoir/ }).click()
    await page.locator('.revue-choix', { hasText: 'Toute son histoire' }).click()
    await page.waitForTimeout(200)
    const m = await page.evaluate(() => {
      const f = document.querySelector('.revue-frise').getBoundingClientRect()
      const cases = [...document.querySelectorAll('.revue-partie')].map(c => c.getBoundingClientRect())
      const r = window.__revue, b = r.bande
      const attendue = (b.parties[0].fin - b.parties[0].debut + 1) / b.images.length * f.width
      const compteur = document.querySelector('.revue-compteur').getBoundingClientRect()
      const sous = document.elementFromPoint(compteur.left + compteur.width / 2, compteur.top + compteur.height / 2)
      return { frise: [Math.round(f.left), Math.round(f.right)], finCases: Math.round(cases[cases.length - 1].right), premiere: Math.round(cases[0].width), premiereAttendue: Math.round(attendue), compteurCache: !sous?.classList.contains('revue-compteur'), sous: sous?.className }
    })
    const c = await page.evaluate(() => { const r = document.querySelectorAll('.revue-partie')[19].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, dedans: r.left + r.width / 2 < innerWidth } })
    await page.mouse.click(Math.min(c.x, vp.width - 2), c.y)
    await page.waitForTimeout(100)
    const ici = await page.evaluate(() => { const r = window.__revue; return { partie: r.bande.parties.findIndex(p => r.k >= p.debut && r.k <= p.fin) + 1, k: r.k, tete: Math.round(document.querySelector('.revue-tete').getBoundingClientRect().left), caseIci: Math.round(document.querySelector('.revue-partie.ici').getBoundingClientRect().left) } })
    await page.screenshot({ path: `${DOSSIER}/10-frise-30-seances-${vp.width}.png` })
    const heure = await page.evaluate(() => {
      const el = document.querySelector('.revue-ou .ligne1'), t = el.firstChild, texte = t.textContent
      const m = /\d{1,2}\sh\s\d{2}$/.exec(texte)
      const r = document.createRange(); r.setStart(t, m.index); r.setEnd(t, texte.length)
      const lignes = new Set([...r.getClientRects()].map(x => Math.round(x.top)))
      return { texte, lignes: lignes.size }
    })
    if (vp.width < 500) verifier('[DÉFAUT] 390 px : l\'heure de la pastille reste sur une ligne (espaces insécables)', heure.lignes === 1, `« ${heure.texte} » : l'heure tient sur ${heure.lignes} lignes`)
    verifier(`[DÉFAUT] ${vp.width} px, 30 séances : chaque case de la frise a la largeur de sa partie et reste dans la frise`, m.finCases <= m.frise[1] + 1 && Math.abs(m.premiere - m.premiereAttendue) < 20, `frise ${m.frise[0]}→${m.frise[1]} px, cases jusqu'à ${m.finCases} px ; 1re partie (200 gestes / 288) : ${m.premiere} px au lieu de ${m.premiereAttendue} px${m.compteurCache ? ' ; compteur recouvert par ' + m.sous : ''}`)
    verifier(`[DÉFAUT] ${vp.width} px : toucher la 20e case mène à la 20e partie`, ici.partie === 20, `arrivée dans la partie ${ici.partie} (k=${ici.k}) ; tête à x=${ici.tete}, case surlignée à x=${ici.caseIci}`)
    await ctx.close()
  }
}

// =============================================================
// 11. Tourner la tablette, tiroir ouvert
// =============================================================
if (partie('rotation')) {
  for (const [a, b] of [[{ width: 768, height: 1024 }, { width: 1024, height: 768 }], [{ width: 390, height: 844 }, { width: 844, height: 390 }]]) {
    const { ctx, page } = await ouvrirPage({ nom: 'rotation', viewport: a, horloge: -3 * 86400_000 })
    await page.evaluate(async () => {
      const app = window.__app, t = app.tableau
      let n = 0
      for (let s = 0; s < 8; s++) { for (let i = 0; i < 4; i++) { t.poser(app.page, { id: 'r' + (n++), type: 'trait', x: 50 + i * 60, y: 50 + s * 30, z: n, auteur: t.moi, pts: [0, 0, 0.5, 40, 5, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false }); await new Promise(r => setTimeout(r, 0)); window.__decalage += 1000 } window.__decalage += 3600_000 }
      window.__decalage = 0
    })
    await page.waitForTimeout(200)
    await ouvrirLaRevue(page)
    await page.waitForTimeout(150)
    await page.getByRole('button', { name: /^Que revoir/ }).click()
    await page.waitForTimeout(150)
    await page.setViewportSize(b)
    await page.waitForTimeout(300)
    const m = await page.evaluate(() => { const t = document.querySelector('.revue-tiroir').getBoundingClientRect(); return { haut: Math.round(t.top), bas: Math.round(t.bottom), titre: Math.round(document.querySelector('.revue-tiroir h2').getBoundingClientRect().top) } })
    await page.screenshot({ path: `${DOSSIER}/11-rotation-${b.width}.png` })
    verifier(`[DÉFAUT] Tiroir ouvert, ${a.width}×${a.height} → ${b.width}×${b.height} : le tiroir reste dans l'écran`, m.haut >= 0, `haut du tiroir à ${m.haut} px (titre à ${m.titre} px), bas à ${m.bas} px`)
    await ctx.close()
  }
}

// =============================================================
// 12. Beaucoup de pages jetées
// =============================================================
if (partie('jetees')) {
  const { ctx, page } = await ouvrirPage({ nom: 'jetees' })
  await page.evaluate(async () => {
    const app = window.__app, t = app.tableau
    for (let i = 0; i < 15; i++) {
      app.nouvellePage(); await new Promise(r => setTimeout(r, 0))
      t.poser(app.page, { id: 'j' + i, type: 'trait', x: 100, y: 100 + i * 20, z: i, auteur: t.moi, pts: [0, 0, 0.5, 80, 5, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
      await new Promise(r => setTimeout(r, 0))
      app.supprimerPage(); await new Promise(r => setTimeout(r, 0))
    }
  })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: BOUTON }).click()
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  const t = await page.evaluate(() => { const s = [...document.querySelectorAll('.revue-section')].find(x => x.querySelector('h3')?.textContent === 'Pages jetées'); return { lignes: s ? s.querySelectorAll('.revue-choix').length : 0, plus: !!s?.querySelector('.revue-plus') } })
  verifier('[DÉFAUT] 15 pages jetées : toutes atteignables dans « Pages jetées » (ou un bouton « Plus anciennes »)', t.lignes === 15 || t.plus, JSON.stringify(t))
  await ctx.close()
}

// =============================================================
// 13. Thème sombre du système
// =============================================================
if (partie('theme')) {
  const images = {}
  for (const scheme of ['light', 'dark']) {
    const { ctx, page } = await ouvrirPage({ nom: 'theme-' + scheme, colorScheme: scheme })
    await page.evaluate(() => { const app = window.__app, t = app.tableau; for (let i = 0; i < 5; i++) t.poser(app.page, { id: 'd' + i, type: 'trait', x: 300, y: 200 + i * 40, z: i, auteur: t.moi, pts: [0, 0, 0.5, 100, 10, 0.5, 200, 0, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) })
    await page.waitForTimeout(200)
    await page.getByRole('button', { name: BOUTON }).click()
    await page.waitForTimeout(300)
    await page.evaluate(() => { document.querySelector('.revue-bandeau').hidden = true; document.querySelector('.revue-ou .ligne1').textContent = 'x' })
    images[scheme] = await page.screenshot({ path: `${DOSSIER}/13-theme-${scheme}.png` })
    await ctx.close()
  }
  verifier('Système en thème sombre : la revue reste claire comme le tableau (color-scheme: light), lisible', Buffer.compare(images.light, images.dark) === 0)
}


// =============================================================
// 14. Revoir pendant qu'un programme de construction s'anime
// =============================================================
if (partie('construction')) {
  const { ctx, page } = await ouvrirPage({ nom: 'construction' })
  const fantomes = []
  await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click()
  for (const delai of [250, 1700, 3200]) {
    if (await page.locator('.panneau-construction').isHidden()) await page.getByRole('button', { name: 'Programme de construction, étape par étape' }).click()
    await page.evaluate(() => { const b = document.querySelector('.panneau-construction .recommencer'); if (b && !b.closest('[hidden]')) b.click() })
    await page.locator('.panneau-construction select').selectOption({ index: 1 })
    await page.locator('.panneau-construction .tout').click()
    await page.waitForTimeout(50)
    if (await page.evaluate(() => !!window.__app.placement)) await page.mouse.click(400, 450)
    await page.waitForTimeout(delai)
    const f0 = await page.evaluate(() => window.__app.tableau.film.length)
    await page.getByRole('button', { name: BOUTON }).click()
    await page.waitForTimeout(2500)
    const f1 = await page.evaluate(() => window.__app.tableau.film.length)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(1200)
    const apres = await page.evaluate(() => ({ animes: window.__app.rendu.instrumentsAnimes.map(i => i.nom), panneau: !document.querySelector('.panneau-construction').hidden }))
    fantomes.push(`${delai} ms : film ${f0}→${f1}, panneau ${apres.panneau ? 'ouvert' : 'fermé'}, instruments animés restés : [${apres.animes}]`)
    if (apres.animes.length) await page.screenshot({ path: `${DOSSIER}/14-instrument-fantome-${delai}.png` })
    await page.evaluate(() => { window.__app.rendu.instrumentsAnimes = []; window.__app.rendu.redessinerInstruments() })
  }
  verifier('Revoir pendant une construction animée : rien ne s\'écrit pendant la revue', fantomes.every(f => /film (\d+)→\1,/.test(f)), fantomes.join(' ; '))
  verifier('[DÉFAUT] Revoir pendant une construction animée : au retour, aucun instrument fantôme sur le tableau', fantomes.every(f => /\[\]$/.test(f)), fantomes.join(' ; '))
  await ctx.close()
}

verifier('Aucune erreur JavaScript dans la console', erreurs.length === 0, erreurs.join(' | '))
await fin()
