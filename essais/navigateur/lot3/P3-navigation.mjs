// Essais au navigateur du morceau P3 du lot 3 : se déplacer entre les pages
// (« › » qui ajoute une page sur la dernière, Page↓ qui n'en crée pas et le
// dit, le numéro en grand au changement de page, le nom dans le compteur),
// « Dupliquer la page » depuis le tableau (le menu de la page à la souris et
// à la tablette graphique, Ctrl + Maj + D ; « Annuler » et Ctrl+Z sur la
// copie), et la garde du tableau caché (body.en-trieuse posé à la main : plus
// rien n'écrit sur la page cachée).
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/p3/navigateur`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const pause = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()
// Lot 4 (C4) : « Ouvrir un classeur » (Ctrl + O) passe par showOpenFilePicker
// quand il existe, que Chromium sans fenêtre refuse (AbortError, même quand
// Playwright attend le choix de fichier) : cet essai ouvre ses fichiers par
// le choix de fichier d'avant, celui de Firefox, Safari et l'iPad
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.showOpenFilePicker = undefined }); return c } }

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(300)
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

const TITRE_AJOUT = 'Page suivante : en ajouter une (c\'est la dernière)'
// (Adapté aux réglages par défaut, retouches après le lot 5 : une page neuve
// est blanche, quel que soit le fond de celle d'où l'on vient ; on arrive sur
// une page toujours à 100 %, à son centre gardé : la copie d'une page zoomée
// à 150 % s'ouvre à 100 % au même centre, et l'original aussi quand on y
// revient. « Même vue » devient « même centre, à 100 % ».)
const memeCentre100 = (e, e0) => e.cam.z === 1 && Math.abs(e.centre.x - e0.centre.x) <= 0.02 && Math.abs(e.centre.y - e0.centre.y) <= 0.02
const ETAT = () => {
  const a = window.__app, t = a.tableau
  const ap = document.querySelector('.barre-haut button[data-mode]')
  const an = document.querySelector('.annonce-page')
  return {
    page: a.page, pages: a.pages.slice(), n: a.formes.length, ids: a.formes.map(f => f.id).sort(), fond: a.fond, outil: a.outil,
    cam: { x: Math.round(a.cam.x * 100) / 100, y: Math.round(a.cam.y * 100) / 100, z: Math.round(a.cam.z * 1000) / 1000 },
    // (retouches après le lot 5) le point du monde au centre de l'écran : on revient sur une page à son centre, à 100 %
    centre: (c => ({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100 }))(a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2)),
    rang: document.querySelector('.rang').textContent, titreRang: document.querySelector('.rang').title,
    mode: ap?.dataset.mode, titreApres: ap?.getAttribute('aria-label'), iconeApres: ap?.querySelector('path')?.getAttribute('d'),
    annonce: { cachee: an.hidden, visible: an.classList.contains('visible'), numero: an.querySelector('.annonce-numero').textContent, nom: an.querySelector('.annonce-nom').textContent },
    film: t.film.length, msgs: (window.__msgs || []).slice(), sel: [...a.selection],
    toast: [...document.querySelector('.toast').children].map(l => l.textContent).join(' | '),
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
    menuPage: !document.querySelector('.menu-flottant[aria-label="Page"]').hidden,
    menus: [...document.querySelectorAll('.menu-flottant')].filter(m => !m.hidden).length + (document.querySelector('.panneau-forme').hidden ? 0 : 1),
    barreActions: !!document.querySelector('.barre-actions') && !document.querySelector('.barre-actions').hidden,
    peutAnnuler: !document.querySelector('button[aria-label^="Annuler sur cette page"]').disabled,
  }
}
const etat = page => page.evaluate(ETAT)
const APRES = '.barre-haut button[data-mode]'
/** Un trait posé comme un geste, sur la page qu'on regarde */
const poser = (page, id, x = 200, y = 200) => page.evaluate(({ id, x, y }) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 40, 12, 0.5, 80, 0, 0.5, 120, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
}, { id, x, y })
/** Un tracé à la souris, en zigzag : de l'écriture, que rien ne redresse */
async function ecrireSouris(page, x, y, attenteApresBas = 0) {
  await page.mouse.move(x, y); await page.mouse.down()
  if (attenteApresBas) await page.waitForTimeout(attenteApresBas)
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 8, y + (i % 2 ? 14 : 0))
  await page.mouse.up(); await page.waitForTimeout(80)
}
/** Le point de l'écran d'un point du monde */
const ecranDe = (page, x, y) => page.evaluate(([x, y]) => { const a = window.__app, r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(x, y); return { x: r.left + s.x, y: r.top + s.y } }, [x, y])
/** Attend que l'annonce soit cachée ; rend le temps mis (ms), ou null */
async function attendreFinAnnonce(page, max = 2500) {
  const t0 = Date.now()
  while (Date.now() - t0 < max) {
    if (await page.evaluate(() => document.querySelector('.annonce-page').hidden)) return Date.now() - t0
    await pause(25)
  }
  return null
}

// =============== 1. « › » sur la dernière page, Page↓, le numéro en grand, le nom ===============
{
  const { ctx, page } = await ouvrir({}, 'souris')
  // Au chargement : pas d'annonce (on ne change pas de page, on arrive)
  let vus = []
  for (let k = 0; k < 5; k++) { vus.push(await page.evaluate(() => !document.querySelector('.annonce-page').hidden)); await pause(80) }
  verifier('Au chargement : le numéro de la page ne s\'annonce pas', vus.every(v => !v), JSON.stringify(vus))
  let e = await etat(page)
  verifier('Une seule page : « › » est déjà le bouton d\'ajout (c\'est la dernière)', e.mode === 'ajout' && e.titreApres === TITRE_AJOUT, JSON.stringify(e))

  // Trois pages : la 1 (un trait), la 2, la 3 (Seyès, zoomée)
  const [p1, p2, p3] = await page.evaluate(async () => {
    const a = window.__app, pause = ms => new Promise(r => setTimeout(r, ms))
    const p1 = a.page
    a.nouvellePage(); const p2 = a.page
    a.nouvellePage(); const p3 = a.page
    a.changerFond('seyes'); a.zoomer(2); await pause(30)
    return [p1, p2, p3]
  })
  await poser(page, 'c1', 300, 300)
  await page.evaluate(p => window.__app.allerPage(p), p2); await page.waitForTimeout(100)
  e = await etat(page)
  const iconeSuivante = e.iconeApres
  verifier('Page 2 sur 3 : « › » mène à la page suivante (« Page suivante (Page ↓) », chevron seul)', e.mode === 'suivante' && e.titreApres === 'Page suivante (Page ↓)' && iconeSuivante === 'M9 6l6 6-6 6', JSON.stringify(e))
  await page.waitForTimeout(650)
  await page.click(APRES); await page.waitForTimeout(150)
  e = await etat(page)
  const plus = await page.evaluate(() => document.querySelector('.barre-haut button[aria-label="Nouvelle page"] path').getAttribute('d'))
  verifier('Sur la dernière page : « › » change d\'icône (le chevron et un petit +, distincte du + de « Nouvelle page ») et de nom',
    e.page === p3 && e.mode === 'ajout' && e.titreApres === TITRE_AJOUT && e.iconeApres !== iconeSuivante && e.iconeApres !== plus && e.iconeApres.startsWith('M5 6l6 6-6 6'), JSON.stringify({ e, plus }))
  const noms = await page.evaluate(() => ({
    nouvelle: [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '').includes('Nouvelle page')).length,
    suivante: [...document.querySelectorAll('button')].filter(b => (b.getAttribute('aria-label') || '').startsWith('Page suivante')).length,
  }))
  verifier('… « Nouvelle page » reste le nom d\'un seul bouton ; le titre de « › » commence toujours par « Page suivante »', noms.nouvelle === 1 && noms.suivante === 1, JSON.stringify(noms))
  const places = await page.evaluate(() => [...document.querySelectorAll('.barre-haut > *')].map(b => Math.round(b.getBoundingClientRect().left)))
  await page.evaluate(p => window.__app.allerPage(p), p1); await page.waitForTimeout(100)
  const places1 = await page.evaluate(() => [...document.querySelectorAll('.barre-haut > *')].map(b => Math.round(b.getBoundingClientRect().left)))
  verifier('Aucun bouton de la barre ne bouge entre la page 1 et la dernière (la poubelle reste sous la main)', JSON.stringify(places) === JSON.stringify(places1), JSON.stringify({ places, places1 }))
  await page.evaluate(p => window.__app.allerPage(p), p3); await page.waitForTimeout(700)

  // Un clic sur « › » de la dernière page : une 4e page, juste après, au même fond, en vue neutre
  const film0 = (await etat(page)).film
  await page.click(APRES); await page.waitForTimeout(200)
  e = await etat(page)
  const p4 = e.page
  verifier('Un clic sur « › » de la dernière page : une 4e page juste après, on y est, « 4 / 4 »',
    e.pages.length === 4 && e.pages[3] === p4 && JSON.stringify(e.pages.slice(0, 3)) === JSON.stringify([p1, p2, p3]) && e.rang === '4 / 4' && e.n === 0, JSON.stringify(e))
  verifier('… blanche (la page d\'où l\'on vient est en Seyès), en vue neutre (x 120, y 120, 100 %)', e.fond === 'blanc' && e.cam.x === 120 && e.cam.y === 120 && e.cam.z === 1, JSON.stringify(e))
  verifier('… une seule naissance dans le film', e.film >= film0 + 1, JSON.stringify({ film0, film: e.film }))

  // Double-clic sur « › » depuis l'avant-dernière : on arrive sur la dernière, sans page de plus
  await page.evaluate(p => window.__app.allerPage(p), p3); await page.waitForTimeout(700)
  await page.dblclick(APRES); await page.waitForTimeout(250)
  e = await etat(page)
  verifier('Double-clic sur « › » depuis l\'avant-dernière : la dernière page, aucune page de plus', e.pages.length === 4 && e.page === p4, JSON.stringify(e))
  await page.evaluate(p => window.__app.allerPage(p), p3); await page.waitForTimeout(700)
  await page.click(APRES); await page.waitForTimeout(300); await page.click(APRES); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Deux clics à 300 ms sur « › » depuis l\'avant-dernière : la dernière page, aucune page de plus', e.pages.length === 4 && e.page === p4, JSON.stringify(e))

  // Page↓ sur la dernière page : rien, et un message, au plus une fois toutes les 5 s
  await page.evaluate(() => { window.__msgs.length = 0 })
  await page.keyboard.press('PageDown'); await page.waitForTimeout(120)
  await page.keyboard.press('PageDown'); await page.waitForTimeout(120)
  e = await etat(page)
  const dits = e.msgs.filter(m => m === 'Dernière page : le bouton Page suivante en ajoute une.').length
  verifier('Page↓ sur la dernière page : aucune page créée, on reste dessus', e.pages.length === 4 && e.page === p4, JSON.stringify(e))
  verifier('… « Dernière page : le bouton Page suivante en ajoute une. », une seule fois pour deux Page↓', dits === 1 && e.toast.includes('Dernière page : le bouton Page suivante en ajoute une.'), JSON.stringify(e.msgs))

  // L'annonce : Page↑ depuis la 3 → « 2 / 4 », en haut au centre de la zone libre, puis elle s'efface
  await page.evaluate(p => window.__app.allerPage(p), p3)
  await attendreFinAnnonce(page)
  const t0 = Date.now()
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  e = await etat(page)
  const place = await page.evaluate(() => {
    const a = window.__app, an = document.querySelector('.annonce-page'), r = an.getBoundingClientRect(), z = document.getElementById('zone').getBoundingClientRect(), l = a.ui.zoneLibre()
    const h = document.querySelector('.barre-haut').getBoundingClientRect()
    return { cx: r.left + r.width / 2, top: r.top, attendu: { cx: z.left + l.x + l.l / 2, top: z.top + l.y + 16 }, sousLaBarre: r.top >= h.bottom, milieu: z.top + z.height / 2, bas: r.bottom,
      pe: getComputedStyle(an).pointerEvents, z: getComputedStyle(an).zIndex, aria: an.getAttribute('aria-hidden'), taille: getComputedStyle(an.querySelector('.annonce-numero')).fontSize, opacite: Number(getComputedStyle(an).opacity) }
  })
  verifier('Page↑ : l\'annonce « 2 / 4 » paraît', e.page === p2 && !e.annonce.cachee && e.annonce.visible && e.annonce.numero === '2 / 4' && e.annonce.nom === '', JSON.stringify(e.annonce))
  verifier('… en haut au centre de ce qu\'on voit (16 px sous le haut de la zone libre), sous la barre, loin du milieu', Math.abs(place.cx - place.attendu.cx) < 2 && Math.abs(place.top - place.attendu.top) < 2 && place.sousLaBarre && place.bas < place.milieu, JSON.stringify(place))
  verifier('… en grand (48 px), sans prendre d\'appui (pointer-events: none), cachée aux lecteurs d\'écran, sous le message (z-index 13)', place.taille === '48px' && place.pe === 'none' && place.aria === 'true' && place.z === '13', JSON.stringify(place))
  const duree = await attendreFinAnnonce(page)
  const total = duree === null ? null : Date.now() - t0
  verifier('… puis elle disparaît, en moins de 1,4 s', total !== null && total < 1400 && total > 800, JSON.stringify({ total }))
  await page.screenshot({ path: D + '/annonce.png' })

  // Elle ne prend aucun appui : un trait commencé dessous s'écrit, et l'efface aussitôt
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await page.keyboard.press('PageDown'); await page.waitForTimeout(80)
  await page.keyboard.press('PageUp'); await page.waitForTimeout(200)
  const r = await page.evaluate(() => { const b = document.querySelector('.annonce-page').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2, vu: !document.querySelector('.annonce-page').hidden } })
  const n0 = (await etat(page)).n
  await page.mouse.move(r.x - 40, r.y); await page.mouse.down(); await page.waitForTimeout(40)
  const pendant = await page.evaluate(() => ({ visible: document.querySelector('.annonce-page').classList.contains('visible') }))
  for (let i = 1; i <= 10; i++) await page.mouse.move(r.x - 40 + i * 8, r.y + (i % 2 ? 10 : 0))
  await page.waitForTimeout(140)
  const apres = await page.evaluate(() => ({ cachee: document.querySelector('.annonce-page').hidden }))
  await page.mouse.up(); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Un trait commencé sur l\'annonce, 200 ms après Page↑ : il s\'écrit (elle ne prend aucun appui)', r.vu && e.n === n0 + 1 && e.page === p2, JSON.stringify({ r, n0, n: e.n }))
  verifier('… et l\'annonce s\'efface dès l\'appui (fondu de 120 ms)', !pendant.visible && apres.cachee, JSON.stringify({ pendant, apres }))

  // Le nom : dans le compteur et dans l'annonce
  await page.evaluate(p => window.__app.tableau.renommerPage(p, 'Exercice 12'), p2); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('Un nom posé par renommerPage paraît tout de suite dans le compteur : « 2 / 4 · Exercice 12 », entier dans son titre', e.rang === '2 / 4 · Exercice 12' && e.titreRang.includes('Exercice 12'), JSON.stringify(e))
  await page.keyboard.press('PageDown'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Sans nom, le compteur dit exactement « 3 / 4 »', e.rang === '3 / 4' && e.page === p3, JSON.stringify(e.rang))
  await page.keyboard.press('PageUp'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('… et l\'annonce montre le numéro et le nom', e.annonce.numero === '2 / 4' && e.annonce.nom === 'Exercice 12' && e.annonce.visible, JSON.stringify(e.annonce))
  await page.screenshot({ path: D + '/annonce-nom.png' })
  // Un long nom : coupé par des points de suspension, entier dans le titre
  const long = 'Exercice 12 p. 84 : démontrer que le triangle ABC est rectangle'
  await page.evaluate(([p, n]) => window.__app.tableau.renommerPage(p, n), [p2, long]); await page.waitForTimeout(100)
  const coupe = await page.evaluate(() => { const n = document.querySelector('.rang-nom'); return { coupe: n.scrollWidth > n.clientWidth + 1, ellipse: getComputedStyle(n).textOverflow, titre: document.querySelector('.rang').title, l: Math.round(n.getBoundingClientRect().width) } })
  verifier('Un long nom est coupé par des points de suspension dans le compteur, entier dans son titre', coupe.coupe && coupe.ellipse === 'ellipsis' && coupe.titre.includes(long.slice(0, 60)), JSON.stringify(coupe))
  await page.screenshot({ path: D + '/compteur-nom-long.png', clip: { x: 300, y: 0, width: 1066, height: 80 } })

  // « Nouvelle page » deux fois de suite sur la dernière page
  await page.evaluate(p => window.__app.allerPage(p), p4); await page.waitForTimeout(100)
  await page.click('.barre-haut button[aria-label="Nouvelle page"]'); await page.waitForTimeout(100)
  await page.click('.barre-haut button[aria-label="Nouvelle page"]'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Nouvelle page » marche deux fois de suite sur la dernière page', e.pages.length === 6 && e.page === e.pages[5] && e.rang === '6 / 6', JSON.stringify(e))

  // Dans la revue : un changement de page n'annonce rien
  await attendreFinAnnonce(page)
  await page.evaluate(() => { window.__app.enLecture = true })
  await page.evaluate(p => window.__app.allerPage(p), p1); await page.waitForTimeout(80)
  const sousRevue = await page.evaluate(() => document.querySelector('.annonce-page').hidden)
  await page.evaluate(() => { window.__app.enLecture = false })
  verifier('Le tableau caché (la revue) : un changement de page ne s\'annonce pas', sousRevue)

  // Au rechargement : on reprend la page qu'on regardait (la 2, pas la
  // première où mène d'abord le chargement), sans annonce, avec son nom
  await page.evaluate(p => window.__app.allerPage(p), p2)
  await attendreFinAnnonce(page)
  await page.reload()
  vus = []
  for (let k = 0; k < 40; k++) {
    vus.push(await page.evaluate(() => !!document.querySelector('.annonce-page') && !document.querySelector('.annonce-page').hidden))
    if (k > 12 && await page.evaluate(() => !!window.__app?.page)) break
    await pause(50)
  }
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  for (let k = 0; k < 8; k++) { vus.push(await page.evaluate(() => !document.querySelector('.annonce-page').hidden)); await pause(100) }
  e = await page.evaluate(() => ({ rang: document.querySelector('.rang').textContent, page: window.__app.page }))
  verifier('Au rechargement : on reprend la page 2, sans annonce (le chargement passe par la première sans rien dire)', vus.every(v => !v) && e.page === p2, JSON.stringify({ vus, e }))
  verifier('… le nom est gardé (la carte des noms, dans le document) et revient dans le compteur', e.rang.startsWith('2 / 6 · Exercice 12'), JSON.stringify(e))
  await page.keyboard.press('PageUp'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… puis un changement de page s\'annonce de nouveau', e.annonce.visible && e.annonce.numero === '1 / 6', JSON.stringify(e.annonce))
  await ctx.close()
}

// =============== 2. Téléphone : le nom caché, aucun débordement ===============
{
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'telephone')
  const [p1] = await page.evaluate(() => { const a = window.__app, p1 = a.page; a.nouvellePage(); a.nouvellePage(); return [p1] })
  await page.evaluate(p => { window.__app.tableau.renommerPage(p, 'Exercice 12 p. 84 : le triangle rectangle'); window.__app.allerPage(p) }, p1)
  await page.waitForTimeout(150)
  const t = await page.evaluate(() => {
    const n = document.querySelector('.rang-nom'), an = document.querySelector('.annonce-page')
    return { nomVu: getComputedStyle(n).display !== 'none', rang: document.querySelector('.rang').textContent, largeur: document.documentElement.scrollWidth, fenetre: innerWidth,
      barre: Math.round(document.querySelector('.barre-haut').getBoundingClientRect().right), taille: getComputedStyle(an.querySelector('.annonce-numero')).fontSize,
      annonce: an.hidden ? null : (() => { const r = an.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } })(),
      outils: Math.round(document.querySelector('.barre-outils').getBoundingClientRect().right),
      boiteOutils: (() => { const r = document.querySelector('.barre-outils').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom } })() }
  })
  verifier('Téléphone 390 × 844 : le nom ne s\'affiche pas dans le compteur', !t.nomVu && t.rang.startsWith('1 / 3'), JSON.stringify(t))
  verifier('… aucun débordement horizontal (la page, la barre du haut, l\'annonce)', t.largeur <= t.fenetre && t.barre <= t.fenetre && (!t.annonce || (t.annonce.l >= 0 && t.annonce.r <= t.fenetre)), JSON.stringify(t))
  // Adapté au lot 5 (K10, la mise en page du téléphone, voulue) : la barre
  // des outils y est posée en bas, sur toute la largeur ; l'annonce, en haut
  // de ce qu'on voit, ne la couvre pas (sa boîte ne touche pas celle de la
  // barre) au lieu d'être à sa droite
  const o = t.boiteOutils, an = t.annonce
  verifier('… l\'annonce en 34 px, dans ce qu\'on voit du tableau (elle ne couvre pas la barre d\'outils, un long nom se coupe)', t.taille === '34px' && an && !(an.l < o.r && an.r > o.l && an.t < o.b && an.b > o.t), JSON.stringify(t))
  await page.screenshot({ path: D + '/telephone.png' })
  await ctx.close()
}

// =============== 3. Dupliquer la page : menu de la page, Ctrl + Maj + D, « Annuler », Ctrl+Z ===============
{
  const { ctx, page } = await ouvrir({}, 'dupliquer')
  const p1 = await page.evaluate(() => window.__app.page)
  await poser(page, 'a1', 200, 200); await page.waitForTimeout(40); await poser(page, 'a2', 260, 320)
  const p2 = await page.evaluate(() => { const a = window.__app, p1 = a.page; a.nouvellePage(); const p2 = a.page; a.allerPage(p1); return p2 })
  await page.evaluate(() => { const a = window.__app; a.changerFond('carreaux'); a.zoomer(1.5); a.cam.x -= 37; a.rendu.toutRedessiner(); a.ui.maj() })
  await page.waitForTimeout(200)
  let e0 = await etat(page)
  // Clic droit dans le vide, à la souris
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const vide = await ecranDe(page, 700, 500)
  await page.mouse.click(vide.x, vide.y, { button: 'right' }); await page.waitForTimeout(120)
  const menu = await page.evaluate(() => {
    const m = document.querySelector('.menu-flottant[aria-label="Page"]')
    return { vu: !m.hidden, enfants: [...m.children].map(x => x.tagName === 'HR' ? '─' : (x.querySelector('.libelle')?.firstChild?.textContent ?? '')),
      touche: [...m.querySelectorAll('.menu-item')].find(b => b.textContent.includes('Dupliquer la page'))?.querySelector('.touche')?.textContent,
      aide: [...m.querySelectorAll('.menu-item')].find(b => b.textContent.includes('Dupliquer la page'))?.querySelector('small')?.textContent }
  })
  verifier('Menu de la page : Coller ici · Tout sélectionner · Tout voir · ─ · Dupliquer la page', menu.vu && JSON.stringify(menu.enfants.slice(0, 5)) === JSON.stringify(['Coller ici', 'Tout sélectionner', 'Tout voir', '─', 'Dupliquer la page']), JSON.stringify(menu))
  verifier('… sa touche (Ctrl + Maj + D) et son aide', menu.touche === 'Ctrl + Maj + D' && menu.aide === 'Une copie juste après, avec toute son histoire (Revoir la montre se construire)', JSON.stringify(menu))
  await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Dupliquer la page' }).click(); await page.waitForTimeout(200)
  let e = await etat(page)
  const q1 = e.page
  verifier('« Dupliquer la page » : on arrive sur la copie, juste après l\'original', e.pages.length === 3 && e.pages[1] === q1 && q1 !== p1 && e.pages[0] === p1 && e.pages[2] === p2 && e.rang === '2 / 3', JSON.stringify(e))
  verifier('… mêmes formes (mêmes identifiants), même fond, même centre (à 100 %, l\'original étant à 150 %)', JSON.stringify(e.ids) === JSON.stringify(e0.ids) && e.fond === 'carreaux' && e0.cam.z === 1.5 && memeCentre100(e, e0), JSON.stringify({ e: [e.ids, e.fond, e.cam], e0: [e0.ids, e0.fond, e0.cam] }))
  verifier('… « Page 1 dupliquée : vous êtes sur la copie (page 2) » avec « Annuler »', e.toast.includes('Page 1 dupliquée : vous êtes sur la copie (page 2)') && JSON.stringify(e.action) === '["Annuler"]', JSON.stringify(e))
  verifier('… l\'annonce « 2 / 3 » ; ↶ allumé sur la copie (Ctrl+Z la retire)', e.annonce.numero === '2 / 3' && e.peutAnnuler, JSON.stringify(e))
  const herite = await page.evaluate(q => window.__app.tableau.herite(q), q1)
  verifier('… la copie hérite de l\'original (son histoire)', herite === p1, herite)
  // « Annuler » du message
  await page.click('.toast.visible button.action'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('« Annuler » du message : la copie part, on revient sur l\'original (son centre, à 100 %), « Copie retirée »', JSON.stringify(e.pages) === JSON.stringify([p1, p2]) && e.page === p1 && e.toast.includes('Copie retirée') && memeCentre100(e, e0), JSON.stringify(e))
  const dansCorbeille = await page.evaluate(q => window.__app.tableau.dansLaCorbeille(q), q1)
  verifier('… elle ne va pas dans la corbeille', !dansCorbeille)

  // Ctrl + Maj + D, puis Ctrl+Z sur la copie
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(200)
  e = await etat(page)
  const q2 = e.page
  verifier('Ctrl + Maj + D : la copie, juste après, mêmes formes', e.pages.length === 3 && e.pages[1] === q2 && q2 !== p1 && JSON.stringify(e.ids) === JSON.stringify(e0.ids) && e.toast.includes('vous êtes sur la copie (page 2)'), JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Ctrl+Z sur la copie toute neuve : elle part, on revient sur l\'original, « Copie retirée », son « Annuler » s\'en va', JSON.stringify(e.pages) === JSON.stringify([p1, p2]) && e.page === p1 && e.toast.includes('Copie retirée') && e.action.length === 0, JSON.stringify(e))
  verifier('… l\'original n\'a pas changé (mêmes formes, même centre, à 100 %), ↶ s\'y grise de nouveau', JSON.stringify(e.ids) === JSON.stringify(e0.ids) && memeCentre100(e, e0), JSON.stringify(e))

  // Écrire sur la copie : « Annuler » le dit ; Ctrl+Z défait l'écriture, puis retire la copie
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(200)
  const q3 = (await etat(page)).page
  await ecrireSouris(page, 500, 600)
  e = await etat(page)
  verifier('(un trait écrit sur la copie)', e.page === q3 && e.n === e0.n + 1, JSON.stringify(e))
  await page.click('.toast.visible button.action'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Annuler » après avoir écrit sur la copie : rien ne part, « Vous avez écrit sur la copie : ↶ défait d\'abord… »', e.pages.length === 3 && e.page === q3 && e.n === e0.n + 1 && e.toast.includes('Vous avez écrit sur la copie : ↶ défait d\'abord ce que vous y avez écrit.'), JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z : d\'abord le trait', e.pages.length === 3 && e.page === q3 && e.n === e0.n, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Ctrl+Z encore : la copie part, retour sur l\'original', e.pages.length === 2 && e.page === p1 && e.toast.includes('Copie retirée'), JSON.stringify(e))

  // L'original parti : la copie ne se retire plus ainsi (le seul exemplaire visible)
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(200)
  const q4 = (await etat(page)).page
  await page.evaluate(([p, q]) => { const t = window.__app.tableau; t.jeterPage(p, q) }, [p1, q4]); await page.waitForTimeout(100)
  await page.click('.toast.visible button.action').catch(() => {}); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('L\'original supprimé : « Annuler » de la copie ne la retire pas, « La copie ne peut plus être retirée ainsi… »', e.pages.includes(q4) && e.page === q4 && e.msgs.includes('La copie ne peut plus être retirée ainsi : supprimez-la (poubelle).'), JSON.stringify(e))
  // Ctrl+Z sur la copie : la marque de la suppression (posée sur la page
  // d'arrivée, comme la poubelle) passe d'abord : l'original revient ; la
  // copie, elle, reste (sa marque est partie avec l'original)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Ctrl+Z sur la copie rend d\'abord l\'original supprimé depuis elle ; la copie reste', JSON.stringify(e.pages) === JSON.stringify([p1, q4, p2]) && e.page === p1 && e.toast.includes('Page 1 rétablie'), JSON.stringify(e))
  await page.evaluate(q => window.__app.allerPage(q), q4); await page.waitForTimeout(100)
  await page.evaluate(() => { window.__msgs.length = 0 })
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… revenu sur la copie, Ctrl+Z ne la retire plus : « Rien à annuler sur cette page »', e.pages.includes(q4) && e.page === q4 && e.msgs.includes('Rien à annuler sur cette page'), JSON.stringify(e))

  // Une page nommée : la copie s'appelle « … (copie) »
  await page.evaluate(p => { window.__app.allerPage(p); window.__app.tableau.renommerPage(p, 'Ex 5') }, p2); await page.waitForTimeout(100)
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Une page nommée « Ex 5 » : la copie s\'appelle « Ex 5 (copie) », dans le compteur', e.rang.endsWith('· Ex 5 (copie)'), JSON.stringify(e.rang))

  // Une fenêtre ouverte (l'éditeur d'une formule) : Ctrl + Maj + D ne fait rien
  const n0 = (await etat(page)).pages.length
  await page.evaluate(() => { window.__edition = window.__app.ui.editerFormule('', 300, 300) }); await page.waitForTimeout(150)
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Dans l\'éditeur d\'une formule : Ctrl + Maj + D ne duplique rien', e.pages.length === n0, JSON.stringify(e.pages.length))
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  await page.click('dialog[open] .secondaire').catch(() => {})
  await page.waitForTimeout(100)

  // Pendant un trait : Ctrl + Maj + D ne fait rien
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await page.mouse.move(600, 600); await page.mouse.down(); await page.mouse.move(640, 620)
  const avantTrait = (await etat(page)).pages.length
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(100)
  const pendantTrait = (await etat(page)).pages.length
  await page.mouse.move(680, 600); await page.mouse.up(); await page.waitForTimeout(100)
  verifier('Pendant un trait : Ctrl + Maj + D ne duplique rien', pendantTrait === avantTrait, JSON.stringify({ avantTrait, pendantTrait }))
  await ctx.close()
}

// =============== 4. À la tablette graphique : le bouton du stylet ouvre le menu de la page ===============
{
  const { ctx, page } = await ouvrir({}, 'wacom')
  const cdp = await ctx.newCDPSession(page)
  const p1 = await page.evaluate(() => window.__app.page)
  await poser(page, 'w1', 300, 300)
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  const v = await ecranDe(page, 800, 450)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: v.x, y: v.y, pointerType: 'pen', button: 'none', buttons: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: v.x, y: v.y, pointerType: 'pen', button: 'right', buttons: 2, clickCount: 1, force: 0.5 })
  await page.waitForTimeout(60)
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: v.x, y: v.y, pointerType: 'pen', button: 'right', buttons: 0, clickCount: 1 })
  await page.waitForTimeout(150)
  let e = await etat(page)
  verifier('Tablette graphique : le bouton du stylet dans le vide ouvre le menu de la page, sans encre', e.menuPage && e.n === 1, JSON.stringify(e))
  const b = await page.evaluate(() => { const r = [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].find(x => x.textContent.includes('Dupliquer la page')).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b.x, y: b.y, pointerType: 'pen', button: 'none', buttons: 0 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: b.x, y: b.y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b.x, y: b.y, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
  await page.waitForTimeout(200)
  e = await etat(page)
  verifier('… « Dupliquer la page » touché à la plume : on est sur la copie, avec le trait', e.pages.length === 2 && e.page === e.pages[1] && e.page !== p1 && JSON.stringify(e.ids) === '["w1"]' && !e.menuPage, JSON.stringify(e))
  await ctx.close()
}

// =============== 5. La garde du tableau caché (body.en-trieuse posé à la main) ===============
{
  const { ctx, page } = await ouvrir({}, 'garde')
  await poser(page, 'g1', 300, 300)
  const p2 = await page.evaluate(() => { const a = window.__app, p1 = a.page; a.nouvellePage(); const p2 = a.page; a.allerPage(p1); return p2 })
  await page.waitForTimeout(1500)
  // Le trait pris à la Sélection, copié (Ctrl+C)
  await page.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.add('g1'); a.rendu.redessinerDirect(); a.ui.maj() })
  await page.keyboard.press('Control+c'); await page.waitForTimeout(150)
  let e0 = await etat(page)
  verifier('(avant : la barre d\'actions se montre sur le trait pris)', e0.barreActions && e0.sel.length === 1, JSON.stringify(e0))
  await page.evaluate(() => { document.body.classList.add('en-trieuse'); window.__app.ui.maj() })
  await page.waitForTimeout(80)
  let e = await etat(page)
  verifier('La trieuse (en-trieuse) : la barre d\'actions se cache (elle compte comme une fenêtre)', !e.barreActions, JSON.stringify(e))
  e0 = await etat(page)
  const essais = [['Control+v', 400], ['Control+z', 120], ['Delete', 120], ['Backspace', 120], ['p', 60], ['e', 60], ['h', 60], ['v', 60], ['l', 60], ['r', 60],
    ['Control+Shift+D', 150], ['Control+d', 150], ['Control+a', 100], ['PageDown', 150], ['PageUp', 150], ['Control+Equal', 100], ['Control+Minus', 100], ['ArrowRight', 200], ['ContextMenu', 120]]
  for (const [k, ms] of essais) {
    await page.keyboard.press(k); await page.waitForTimeout(ms)
    e = await etat(page)
    verifier(`Sous la trieuse, ${k} ne change rien (formes, film, outil, page, vue, menus)`,
      JSON.stringify(e.ids) === JSON.stringify(e0.ids) && e.film === e0.film && e.outil === e0.outil && e.page === e0.page && JSON.stringify(e.pages) === JSON.stringify(e0.pages) && JSON.stringify(e.cam) === JSON.stringify(e0.cam) && e.menus === 0,
      JSON.stringify({ avant: e0, apres: e }))
  }
  // Le collage par l'événement paste (ce que fait Ctrl+V dans un navigateur qui le donne)
  await page.evaluate(() => {
    const d = new DataTransfer(); d.setData('text/plain', '')
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: d, bubbles: true }))
  })
  await page.waitForTimeout(300)
  e = await etat(page)
  verifier('Sous la trieuse, l\'événement paste ne colle pas la copie gardée', JSON.stringify(e.ids) === JSON.stringify(e0.ids) && e.film === e0.film, JSON.stringify(e))
  // Le clic droit sur la zone, à la souris et au stylet
  const v = await ecranDe(page, 700, 500)
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Sous la trieuse, un clic droit sur la zone n\'ouvre aucun menu', e.menus === 0 && !e.menuPage && e.film === e0.film, JSON.stringify(e))
  // Ctrl + O : aucun choix de fichier
  let fichier = false
  page.once('filechooser', () => { fichier = true })
  await page.keyboard.press('Control+o'); await page.waitForTimeout(500)
  verifier('Sous la trieuse, Ctrl + O n\'ouvre pas de fichier', !fichier)
  // Un changement de page (la trieuse va sur une page) : pas d'annonce
  await page.evaluate(p => window.__app.allerPage(p), p2); await page.waitForTimeout(100)
  const an = await page.evaluate(() => document.querySelector('.annonce-page').hidden)
  verifier('Sous la trieuse, un changement de page ne s\'annonce pas', an)
  // Dupliquer par l'application elle-même : rien
  const nPages = (await etat(page)).pages.length
  await page.evaluate(() => window.__app.dupliquerLaPage()); await page.waitForTimeout(100)
  verifier('Sous la trieuse, dupliquerLaPage ne fait rien', (await etat(page)).pages.length === nPages)
  // Ctrl + S reste permis
  await page.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined })
  const tel = page.waitForEvent('download', { timeout: 4000 }).then(() => true).catch(() => false)
  await page.keyboard.press('Control+s')
  verifier('Sous la trieuse, Ctrl + S enregistre toujours le tableau', await tel)

  // La classe retirée : tout remarche
  await page.evaluate(p => { document.body.classList.remove('en-trieuse'); const a = window.__app; a.allerPage(p); a.choisirOutil('selection'); a.selection.clear(); a.selection.add('g1'); a.rendu.redessinerDirect(); a.ui.maj() }, e0.page)
  await page.waitForTimeout(200)
  e = await etat(page)
  verifier('La classe retirée : la barre d\'actions revient', e.barreActions, JSON.stringify(e))
  const n1 = e.n
  await page.keyboard.press('Control+v'); await page.waitForTimeout(400)
  e = await etat(page)
  verifier('… Ctrl+V colle', e.n === n1 + 1, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Ctrl+Z défait', e.n === n1, JSON.stringify(e))
  await page.keyboard.press('p'); await page.waitForTimeout(60)
  e = await etat(page)
  verifier('… P reprend le Stylo', e.outil === 'stylo', JSON.stringify(e.outil))
  await page.mouse.click(v.x, v.y, { button: 'right' }); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… le clic droit dans le vide ouvre le menu de la page', e.menuPage, JSON.stringify(e))
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  const pages0 = (await etat(page)).pages.length
  await page.keyboard.press('Control+Shift+D'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('… Ctrl + Maj + D duplique la page', e.pages.length === pages0 + 1, JSON.stringify(e.pages.length))
  await ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
