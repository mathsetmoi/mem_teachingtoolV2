// ESSAI DES RÉGLAGES PAR DÉFAUT (retouches après le lot 5, demande A du
// professeur) :
// (A1) le trait « Fin » au démarrage (TAILLES[0]) ;
// (A2) toute page neuve en « Page blanche » : le bouton Nouvelle page (+),
//      « › » sur la dernière page, la première page d'un classeur neuf (la
//      fenêtre « Nouveau classeur » coche Page blanche), la trieuse (Ajouter
//      une page ; Insérer une page avant / après… : le choix du fond reste
//      offert, Page blanche cochée d'office, le fond de la voisine dit),
//      « Envoyer vers… une nouvelle page » ; une page dupliquée garde son
//      fond ; les pages qui existent ne changent pas ;
// (A3) le zoom TOUJOURS à 100 % quand on ouvre un classeur ou qu'on change
//      de page, au centre où l'on était dans la page (la session garde le
//      centre, on le reprend à z = 1) ; une page jamais regardée et déjà
//      écrite s'ouvre à 100 % sur le début de son contenu (dans chaque sens :
//      centré s'il tient entre les barres, sinon son bord gauche / son haut à
//      32 px du bord de la zone libre) ; une page neuve, la vue neutre à
//      100 % ; « Tout voir » (Maj + 1) et le zoom à la main restent ; la revue
//      en classe et le lecteur élève ne changent pas.
// I.  La VERSION CONSTRUITE, comme le professeur, sans window.__app : la
//     version en ligne (dist-pages, servie en http par cet essai), puis la
//     version hors ligne (dist/index.html en file://). Tout se lit à l'écran : le
//     bouton d'épaisseur actif, le titre du bouton du fond, le pourcentage du
//     zoom, le compteur, les pixels du tableau, la session de ce navigateur
//     (localStorage, que l'application écrit d'après sa caméra).
// II. Le serveur de développement (:5173, window.__app), dans le détail.
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS. Les deux versions construites doivent être à
// jour (npm run build, npm run build:pages : la batterie les refait d'abord).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/retouches/defauts/essai'
const DEV = 'http://localhost:5173/'
mkdirSync(D, { recursive: true })
const seul = s => process.argv.length <= 2 || process.argv.slice(2).includes(s)

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 600) : '')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const proche = (a, b, e = 1) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= e

// La version en ligne, servie ici (comme GitHub Pages : des fichiers statiques)
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }
// (DEFAUTS_PAGES, DEFAUTS_UN : d'autres versions construites, pour voir l'essai
// échouer sur celle d'avant ces retouches)
const PAGES = process.env.DEFAUTS_PAGES ?? R + '/dist-pages'
const serveur = createServer((q, r) => {
  const chemin = normalize(join(PAGES, decodeURIComponent(new URL(q.url, 'http://x').pathname)))
  if (!chemin.startsWith(PAGES) || !existsSync(chemin) || chemin.endsWith('/')) { r.writeHead(404); r.end(); return }
  r.writeHead(200, { 'content-type': TYPES[extname(chemin)] ?? 'application/octet-stream' }); r.end(readFileSync(chemin))
})
await new Promise(f => serveur.listen(0, '127.0.0.1', f))
const EN_LIGNE = `http://127.0.0.1:${serveur.address().port}/index.html`
const UN = process.env.DEFAUTS_UN ?? R + '/dist/index.html'
const CLE_USB = 'file://' + UN

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
/** Un navigateur neuf (rien dans ses bases ni dans sa session). Au
 *  chargement, si on l'a demandé (« __oublier »), la session de ce navigateur
 *  est effacée AVANT que l'application la lise : comme le même classeur
 *  ouvert sur un autre ordinateur, où aucune page n'a encore été regardée.
 *  La demande passe par window.name (qui survit au rechargement), et non
 *  par localStorage : un script d'init de Playwright qui LIT localStorage au
 *  tout début du document, en file:// et la machine chargée (la batterie),
 *  le trouve parfois vide au premier rechargement, et l'application aussi
 *  (mesuré : 4 premiers rechargements sur 12 sous charge, 0 sur 12 sans ce
 *  script ou avec window.name ; voir retouches/defauts/ls-app2.mjs) ; elle
 *  repartait alors sans session et réannonçait la bibliothèque. Seul le
 *  rechargement qui oublie touche donc localStorage dans ce script. */
async function contexte() {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await c.addInitScript(() => {
    window.showOpenFilePicker = undefined
    // Pas de choix de fichier pour la clé (file:// coche la case d'office) : le classeur se crée sans clé
    window.showSaveFilePicker = undefined
    if (window.name === '__oublier') {
      window.name = ''
      try { for (const k of Object.keys(localStorage)) if (k.startsWith('mem-session')) localStorage.removeItem(k) } catch { /* rien */ }
    }
  })
  await c.route(/accounts\.google\.com|apis\.google\.com|fonts\.g/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && document.querySelector('.zoom-texte')?.textContent, null, { timeout: 30000 })
async function charger(p, url) { await p.goto(url); await pret(p); await p.waitForTimeout(700) }
async function recharger(p, oublier = false) {
  if (oublier) await p.evaluate(() => { window.name = '__oublier' })
  await p.reload(); await pret(p); await p.waitForTimeout(700)
}

/** Ce que montre l'écran : l'épaisseur active, le fond, le zoom, le compteur */
// (Adapté aux gains rapides du lot 16 : l'épaisseur en main se lit sur le
// bouton de l'épaisseur, data-taille : « Fin », « Moyen », « Épais »)
const ECRAN = () => {
  const nom = document.querySelector('.barre-outils .bouton-epaisseur')?.dataset.taille ?? null
  return {
    taille: ['Fin', 'Moyen', 'Épais'].indexOf(nom), tailleNom: nom,
    fond: (document.querySelector('button.choix-fond')?.title ?? '').replace('Fond de la page : ', ''),
    zoom: (document.querySelector('.zoom-texte')?.textContent ?? '').replace(/\s/g, ' '),
    rang: (document.querySelector('.rang-numero')?.textContent ?? '').replace(/\s/g, ' '),
  }
}
const ecran = p => p.evaluate(ECRAN)
/** La session de ce classeur (celle du premier : « mem-session », d'un autre : « mem-session:<id> ») */
const session = p => p.evaluate(() => {
  const id = new URLSearchParams(location.search).get('classeur')
  for (const k of ['mem-session:' + id, 'mem-session']) { const t = localStorage.getItem(k); if (t) return { cle: k, ...JSON.parse(t) } }
  return null
})
/** La zone libre entre les barres (comme ui.zoneLibre : zoneEntreBarres, son
 *  premier choix, au poste de la classe), en coordonnées du tableau */
const ZONE = () => {
  const z = document.getElementById('zone').getBoundingClientRect()
  const o = document.querySelector('.barre-outils').getBoundingClientRect(), h = document.querySelector('.barre-haut').getBoundingClientRect(), b = document.querySelector('.barre-zoom').getBoundingClientRect()
  const x = o.right - z.left + 16, y = h.bottom - z.top + 12
  return { x, y, l: z.width - 16 - x, h: Math.min(b.top - z.top, z.height) - 12 - y }
}
/** La boîte de l'encre sombre (le noir du Stylo) sur les canevas du tableau, en px du tableau */
const ENCRE = () => {
  const z = document.getElementById('zone'), zr = z.getBoundingClientRect()
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity
  for (const c of z.querySelectorAll('canvas')) {
    const r = c.getBoundingClientRect()
    if (!c.width || !r.width) continue
    const k = c.width / r.width, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    for (let j = 0; j < c.height; j++) for (let i = 0; i < c.width; i++) {
      const n = (j * c.width + i) * 4
      if (d[n + 3] > 200 && d[n] < 90 && d[n + 1] < 90 && d[n + 2] < 110) {
        const x = r.left - zr.left + i / k, y = r.top - zr.top + j / k
        if (x < x1) x1 = x; if (y < y1) y1 = y; if (x > x2) x2 = x; if (y > y2) y2 = y
      }
    }
  }
  return x1 === Infinity ? null : { x: x1, y: y1, l: x2 - x1, h: y2 - y1 }
}
async function ecrire(p, x0, y0, x1, y1, n = 16) {
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 1; i <= n; i++) await p.mouse.move(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n + (i % 2) * 3)
  await p.mouse.up(); await p.waitForTimeout(150)
}
async function molette(p, x, y, crans, ctrl) {
  await p.mouse.move(x, y)
  for (let i = 0; i < Math.abs(crans); i++) {
    if (ctrl) await p.keyboard.down('Control')
    await p.mouse.wheel(0, crans < 0 ? -100 : 100)
    if (ctrl) await p.keyboard.up('Control')
    await p.waitForTimeout(40)
  }
  await p.waitForTimeout(600)              // la vue se note 400 ms après le dernier mouvement
}
async function choisirFond(p, fond) {
  await p.click('button.choix-fond')
  await p.waitForSelector('.menu-fonds:not([hidden])', { timeout: 5000 })
  await p.click(`.menu-fonds .fond-choix[data-fond="${fond}"]`)
  await p.waitForTimeout(200)
}
const aller = async (p, touche) => { await p.keyboard.press(touche); await p.waitForTimeout(500) }
const pageSuivante = async p => { await p.click('.barre-haut button[data-mode]'); await p.waitForTimeout(500) }
const pagePrecedente = async p => { await p.click('.barre-haut button[aria-label="Page précédente (Page ↑)"]'); await p.waitForTimeout(500) }
/** Aller à la page k (1, 2…) par Page↑ et Page↓ */
async function allerA(p, k) {
  for (let n = 0; n < 40; n++) {
    const i = Number((await ecran(p)).rang.split('/')[0])
    if (i === k) return
    await p.keyboard.press(i < k ? 'PageDown' : 'PageUp'); await p.waitForTimeout(350)
  }
}
const ENTREES_VIGNETTE = () => [...document.querySelectorAll('.menu-vignette .menu-item')].map(b => ({ t: b.querySelector('.libelle').firstChild.textContent, aide: b.querySelector('small')?.textContent ?? null, coche: b.getAttribute('aria-checked'), focus: document.activeElement === b }))

// =====================================================================
// I. LA VERSION CONSTRUITE : en ligne (http), puis la version hors ligne (file://)
// =====================================================================
async function parcours(url, nom) {
  console.log(`\n=== I. ${nom} : ${url}`)
  const ctx = await contexte()
  const p = await ctx.newPage(); suivre(p, nom)
  await charger(p, url)
  let e = await ecran(p)
  ok(e.taille === 0 && e.tailleNom === 'Fin', `${nom} — une session neuve : le trait « Fin » est choisi`, e)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('1 / 1'), `${nom} — … sur une page blanche, à 100 % (« 1 / 1 »)`, e)

  // La page 1, aux petits carreaux, un trait, zoomée et déplacée
  await choisirFond(p, 'carreaux')
  await ecrire(p, 520, 330, 720, 360)
  await molette(p, 640, 420, -5, true)
  await molette(p, 640, 420, 3, false)
  const s1 = await session(p), id1 = s1?.page, v1 = s1?.vues?.[id1]
  e = await ecran(p)
  ok(v1 && v1[2] > 1.5 && e.zoom === Math.round(v1[2] * 100) + ' %', `${nom} — la page 1 zoomée à la main (${e.zoom}) et déplacée : sa vue est dans la session`, { e, v1 })

  // Le bouton Nouvelle page (+) : blanche, à 100 %, même depuis une page quadrillée
  await p.click('.barre-haut > .nouvelle-page'); await p.waitForTimeout(500)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('2 / 2'), `${nom} — le bouton Nouvelle page (+), depuis les petits carreaux zoomés : une page blanche, à 100 %`, e)

  // « Envoyer vers… une nouvelle page à la fin » : blanche, à 100 %
  await ecrire(p, 560, 300, 760, 330)
  await p.keyboard.press('v'); await p.keyboard.press('Control+a'); await p.waitForTimeout(200)
  await p.mouse.click(660, 316, { button: 'right' }); await p.waitForTimeout(250)
  await p.click('.panneau-forme .ligne button.plus'); await p.waitForTimeout(100)
  await p.click('.menu-plus .menu-item:has-text("Envoyer vers…")')
  await p.waitForSelector('dialog.dialogue-envoi[open]', { timeout: 3000 }); await p.waitForTimeout(100)
  await p.click('dialog.dialogue-envoi[open] .destination[data-cible="fin"]'); await p.waitForTimeout(250)
  await p.click('.toast.visible button.action:has-text("Aller à la page 3")'); await p.waitForTimeout(500)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('3 / 3'), `${nom} — « Envoyer vers… une nouvelle page à la fin », puis « Aller à la page 3 » : une page blanche, à 100 %`, e)
  await p.keyboard.press('Escape'); await p.keyboard.press('p'); await p.waitForTimeout(100)

  // « › » sur la dernière page (en Seyès) : une page blanche (« › » ne crée
  // rien moins de 600 ms après un changement de page)
  await choisirFond(p, 'seyes')
  await p.waitForTimeout(700)
  await pageSuivante(p)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('4 / 4'), `${nom} — « › » sur la dernière page (en Seyès) : une page blanche de plus, à 100 %`, e)

  // Dupliquer la page (Ctrl + Maj + D) : la copie garde son fond
  await pagePrecedente(p)
  await p.keyboard.press('Control+Shift+D'); await p.waitForTimeout(500)
  e = await ecran(p)
  ok(e.fond === 'Seyès' && e.zoom === '100 %' && e.rang.startsWith('4 / 5'), `${nom} — « Dupliquer la page » (Ctrl + Maj + D) d'une page en Seyès : la copie reste en Seyès`, e)

  // La trieuse : Ajouter une page, puis Insérer une page après… (Page blanche cochée)
  await p.keyboard.press('Shift+P'); await p.waitForSelector('.trieuse .carte', { timeout: 5000 }); await p.waitForTimeout(400)
  await p.click('.trieuse-actions .trieuse-bouton[aria-label="Ajouter une page"]'); await p.waitForTimeout(300)
  await p.keyboard.press('Enter'); await p.waitForTimeout(700)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('6 / 6'), `${nom} — la trieuse, « Ajouter une page » (la dernière en Seyès) : une page blanche`, e)
  await p.keyboard.press('Shift+P'); await p.waitForSelector('.trieuse .carte', { timeout: 5000 }); await p.waitForTimeout(400)
  await p.click('.trieuse .carte:nth-child(1) .carte-options'); await p.waitForTimeout(150)
  await p.locator('.trieuse .menu-vignette .menu-item:has-text("Insérer une page après")').click(); await p.waitForTimeout(200)
  const m = await p.evaluate(ENTREES_VIGNETTE)
  const coche = m.filter(x => x.coche === 'true')
  ok(coche.length === 1 && coche[0].t === 'Page blanche' && coche[0].focus && m.find(x => x.t === 'Petits carreaux')?.aide === 'Celui de la page 1',
    `${nom} — « Insérer une page après… » la page 1 (petits carreaux) : les huit fonds, Page blanche cochée et sous le focus ; « Petits carreaux » dit « Celui de la page 1 »`, m)
  await p.keyboard.press('Enter'); await p.waitForTimeout(300)
  await p.keyboard.press('Enter'); await p.waitForTimeout(700)
  e = await ecran(p)
  ok(e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('2 / 7'), `${nom} — … Entrée : la page 2, blanche ; on y arrive à 100 %`, e)

  // La page 1 : ses petits carreaux, à 100 %, au centre où on l'a laissée
  await allerA(p, 1)
  e = await ecran(p)
  let s = await session(p), v = s?.vues?.[id1]
  ok(e.fond === 'Petits carreaux' && s?.page === id1, `${nom} — de retour sur la page 1 : elle a gardé ses petits carreaux`, e)
  ok(e.zoom === '100 %' && v && v[2] === 1 && proche(v[0], v1[0]) && proche(v[1], v1[1]), `${nom} — … à 100 % (et non plus à ${Math.round(v1[2] * 100)} %), au même centre`, { e, avant: v1, apres: v })
  await recharger(p)
  e = await ecran(p); s = await session(p); v = s?.vues?.[id1]
  ok(s?.page === id1 && e.zoom === '100 %' && e.rang.startsWith('1 / 7') && v && v[2] === 1 && proche(v[0], v1[0]) && proche(v[1], v1[1]), `${nom} — recharger : la page 1, à 100 %, au même centre`, { e, avant: v1, apres: v })
  // Zoomer à la main, recharger : 100 %, au même centre
  await molette(p, 900, 300, -4, true)
  const s2 = await session(p), v2 = s2?.vues?.[id1]
  await recharger(p)
  e = await ecran(p); s = await session(p); v = s?.vues?.[id1]
  ok(v2 && v2[2] > 1.4 && e.zoom === '100 %' && v && v[2] === 1 && proche(v[0], v2[0]) && proche(v[1], v2[1]), `${nom} — zoomée à ${Math.round((v2?.[2] ?? 0) * 100)} % autour d'un autre point, puis rechargée : 100 %, à ce centre-là`, { avant: v2, apres: v })

  // Une page jamais regardée, déjà écrite : 100 %, sur le début de son contenu
  await allerA(p, 7)
  await molette(p, 700, 420, 15, true)
  e = await ecran(p)
  await ecrire(p, 260, 150, 1250, 640, 30)
  await ecrire(p, 300, 640, 1200, 170, 30)
  note(`${nom} : la page 7, écrite de bord à bord à ${e.zoom}`)
  await recharger(p, true)
  e = await ecran(p)
  const zone = await p.evaluate(ZONE)
  let encre = await p.evaluate(ENCRE)
  ok(e.rang.startsWith('1 / 7') && e.zoom === '100 %' && encre && proche(encre.x + encre.l / 2, zone.x + zone.l / 2, 6) && proche(encre.y + encre.h / 2, zone.y + zone.h / 2, 6),
    `${nom} — la session perdue (un autre ordinateur), le classeur rouvert : la page 1, jamais regardée ici, à 100 %, son petit contenu centré entre les barres`, { e, zone, encre })
  await allerA(p, 7)
  e = await ecran(p); encre = await p.evaluate(ENCRE)
  ok(e.zoom === '100 %' && encre && proche(encre.x, zone.x + 32, 6) && proche(encre.y, zone.y + 32, 6) && encre.x + encre.l > zone.x + zone.l,
    `${nom} — … la page 7, jamais regardée ici et plus grande que l'écran : à 100 %, son coin en haut à gauche à 32 px du coin de la zone libre`, { e, zone, encre })
  await p.screenshot({ path: `${D}/${nom}-page-jamais-vue.png` })
  // Tout voir (Maj + 1) et le zoom à la main restent
  await p.mouse.move(700, 420)
  await p.keyboard.down('Shift'); await p.keyboard.press('Digit1'); await p.keyboard.up('Shift'); await p.waitForTimeout(700)
  e = await ecran(p); encre = await p.evaluate(ENCRE)
  ok(parseInt(e.zoom) < 100 && encre && encre.x >= zone.x - 2 && encre.x + encre.l <= zone.x + zone.l + 2, `${nom} — « Tout voir » (Maj + 1) : toute la page, à ${e.zoom}`, { e, encre })
  await molette(p, 700, 420, -2, true)
  const zMain = (await ecran(p)).zoom
  ok(zMain !== e.zoom, `${nom} — … et Ctrl + molette zoome encore (${zMain})`, zMain)
  await aller(p, 'PageUp'); await aller(p, 'PageDown')
  e = await ecran(p)
  ok(e.zoom === '100 %' && e.rang.startsWith('7 / 7'), `${nom} — quitter la page 7 et y revenir : de nouveau 100 %`, e)

  // Un nouveau classeur : page blanche, trait fin, 100 %
  await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]')
  await p.waitForSelector('.biblio-nouveau', { state: 'visible', timeout: 10000 }); await p.waitForTimeout(200)
  await p.click('.biblio-nouveau'); await p.waitForSelector('dialog.dialogue-nouveau[open]'); await p.waitForTimeout(150)
  const fonds = await p.evaluate(() => [...document.querySelectorAll('dialog.dialogue-nouveau[open] input[name="fond"]')].map(r => [r.value, r.checked]))
  ok(fonds.length === 8 && fonds.filter(f => f[1]).length === 1 && fonds.find(f => f[1])[0] === 'blanc', `${nom} — « Nouveau classeur » : la page blanche cochée d'office`, fonds)
  await p.fill('dialog.dialogue-nouveau[open] input[name="nom"]', 'Défauts ' + nom)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog.dialogue-nouveau[open] [data-a="creer"]')])
  await pret(p); await p.waitForTimeout(700)
  e = await ecran(p)
  const titre = await p.title()
  ok(titre.startsWith('Défauts ' + nom) && e.fond === 'Page blanche' && e.zoom === '100 %' && e.rang.startsWith('1 / 1') && e.tailleNom === 'Fin',
    `${nom} — « Créer et ouvrir » : le classeur neuf s'ouvre sur une page blanche, à 100 %, le trait fin`, { titre, e })
  await p.screenshot({ path: `${D}/${nom}-nouveau-classeur.png` })
  await ctx.close()
}
if (seul('construite')) {
  if (!existsSync(PAGES + '/index.html') || !existsSync(UN)) ok(false, 'Les versions construites manquent (npm run build, npm run build:pages)')
  else {
    await parcours(EN_LIGNE, 'en ligne')
    await parcours(CLE_USB, 'hors ligne')
  }
}

// =====================================================================
// II. LE SERVEUR DE DÉVELOPPEMENT, DANS LE DÉTAIL (window.__app)
// =====================================================================
async function ouvrirDev(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV)
  await p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })
  await p.waitForTimeout(500)
  await p.evaluate(() => { window.__app.reconnaissance = false; window.__msgs = []; const u = window.__app.ui, m = u.message.bind(u); u.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) } })
  return p
}
/** La vue de l'écran : le point du monde au centre, le zoom */
const VUE = () => { const a = window.__app, c = a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2); return { cx: c.x, cy: c.y, z: a.cam.z, page: a.page, fond: a.fond } }
const vue = p => p.evaluate(VUE)
/** Un trait posé sur une page, sans y aller (comme un document d'ailleurs) */
const POSER = ({ page, traits }) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  for (const [x, y, l, h] of traits) t.poser(page, { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, l / 2, h / 2, 0.5, l, h, 0.5], couleur: '#1b2230', taille: 2.5, opacite: 1, pression: false })
}

if (seul('dev')) {
  console.log('\n=== II. Le serveur de développement')
  const ctx = await contexte()
  let p = await ouvrirDev(ctx, 'dev')

  // A1 et le départ
  let d = await p.evaluate(() => { const a = window.__app; return { taille: a.taille, fin: a.taille === 2.5, bouton: document.querySelector('.barre-outils .bouton-epaisseur')?.dataset.taille, fond: a.fond, rendu: a.rendu.fond, z: a.cam.z, x: a.cam.x, y: a.cam.y, pages: a.pages.length } })
  ok(d.taille === 2.5 && d.bouton === 'Fin', 'A1. Une session neuve : app.taille vaut 2,5 (TAILLES[0], « Fin »), le bouton de l\'épaisseur la montre', d)
  ok(d.fond === 'blanc' && d.rendu === 'blanc' && d.pages === 1 && d.z === 1 && d.x === 120 && d.y === 120, 'A2/A3. … une seule page, blanche (le rendu aussi), en vue neutre à 100 %', d)
  // Le trait fin tracé : un trait de 2,5
  await ecrire(p, 500, 300, 700, 330)
  d = await p.evaluate(() => window.__app.formes.filter(f => f.type === 'trait').map(f => f.taille))
  ok(d.length === 1 && d[0] === 2.5, '   … le premier trait écrit au Stylo a l\'épaisseur fine (2,5)', d)

  // A2 : chaque façon de créer une page
  const fondDe = id => p.evaluate(id => window.__app.tableau.fondDe(id), id)
  await p.evaluate(() => window.__app.changerFond('carreaux'))
  const p1 = (await vue(p)).page
  await p.click('.barre-haut > .nouvelle-page'); await p.waitForTimeout(400)
  d = await vue(p)
  ok(d.fond === 'blanc' && d.page !== p1 && d.z === 1, 'A2. Le bouton Nouvelle page, depuis une page aux petits carreaux : une page blanche', d)
  await p.evaluate(() => window.__app.changerFond('seyes'))
  const p2 = d.page
  await p.waitForTimeout(700)                                    // « › » ne crée rien 600 ms après un changement de page
  await pageSuivante(p)
  d = await vue(p)
  const p3 = d.page
  ok(d.fond === 'blanc' && p3 !== p2, 'A2. « › » sur la dernière page (en Seyès) : une page blanche', d)
  // Envoyer vers… une nouvelle page juste après, à la fin
  await p.evaluate(() => window.__app.changerFond('pointe'))
  await ecrire(p, 500, 300, 700, 330)
  await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.toutSelectionner() })
  await p.evaluate(() => { const a = window.__app; a.cam.z = 1.7; a.cam.x = 40; a.cam.y = -60; a.rendu.toutRedessiner() })
  const vSource = await vue(p)
  d = await p.evaluate(() => {
    const a = window.__app, avant = a.pages
    a.envoyerSelection('apres', false)
    const apres = a.pages.find(x => !avant.includes(x))
    a.toutSelectionner(); const avant2 = a.pages
    a.envoyerSelection('fin', true)
    const fin = a.pages.find(x => !avant2.includes(x))
    return { apres, fin, fApres: a.tableau.fondDe(apres), fFin: a.tableau.fondDe(fin), ordre: a.pages, ici: a.page, fondIci: a.fond }
  })
  ok(d.fApres === 'blanc' && d.fFin === 'blanc' && d.fondIci === 'pointe' && d.ordre[d.ordre.indexOf(d.ici) + 1] === d.apres && d.ordre.at(-1) === d.fin,
    'A2. « Envoyer vers… une nouvelle page juste après » et « … à la fin », depuis une page au papier pointé : deux pages blanches (celle d\'où l\'on envoie garde le sien)', d)
  await p.evaluate(fin => window.__app.allerPage(fin), d.fin); await p.waitForTimeout(200)
  let w = await vue(p)
  ok(w.z === 1 && proche(w.cx, vSource.cx, 0.01) && proche(w.cy, vSource.cy, 0.01), `A3. … la nouvelle page s'ouvre sur le centre de celle d'où l'on envoie (${Math.round(vSource.z * 100)} %), à 100 %`, { source: vSource, w })
  // « Aller à la page N » vers une page dont la vue est loin des objets : 100 %, les objets à l'écran
  await p.evaluate(p3 => { window.__app.allerPage(p3); window.__app.choisirOutil('stylo') }, p3); await p.waitForTimeout(150)
  await ecrire(p, 520, 300, 720, 330)
  d = await p.evaluate(p1 => {
    const a = window.__app
    a.vues.set(p1, { cx: 9000, cy: 9000, z: 0.5 })
    a.choisirOutil('selection'); a.toutSelectionner()
    a.envoyerSelection(p1, false)
    return true
  }, p1)
  await p.click('.toast.visible button.action:has-text("Aller à la page 1")', { timeout: 5000 }); await p.waitForTimeout(600)
  d = await p.evaluate(() => {
    const a = window.__app, r = a.ui.zoneLibre(), sel = a.formes.filter(f => a.selection.has(f.id)), b = a.boiteDuContenu(sel)
    const q = a.cam.versEcran(b.x, b.y), s = a.cam.versEcran(b.x + b.l, b.y + b.h)
    return { z: a.cam.z, n: sel.length, dedans: q.x >= r.x - 1 && q.y >= r.y - 1 && s.x <= r.x + r.l + 1 && s.y <= r.y + r.h + 1 }
  })
  ok(d.z === 1 && d.n === 1 && d.dedans, 'A3. « Aller à la page 1 » d\'un envoi, sa vue loin de ce qui arrive : la vue s\'y porte à 100 %, l\'objet entier entre les barres', d)
  await p.keyboard.press('Escape'); await p.evaluate(() => window.__app.choisirOutil('stylo'))

  // La trieuse : Ajouter une page ; Insérer avant / après… (Page blanche d'office, un autre fond possible)
  await p.evaluate(p3 => { window.__app.allerPage(p3); window.__app.changerFond('repere') }, p3); await p.waitForTimeout(150)
  await p.keyboard.press('Shift+P'); await p.waitForSelector('.trieuse .carte', { timeout: 5000 }); await p.waitForTimeout(400)
  let avant = await p.evaluate(() => window.__app.pages)
  await p.click('.trieuse-actions .trieuse-bouton[aria-label="Ajouter une page"]'); await p.waitForTimeout(300)
  d = await p.evaluate(av => { const a = window.__app, n = a.pages.find(x => !av.includes(x)); return { n, fond: a.tableau.fondDe(n), derniere: a.pages.at(-1) === n, avantDerniere: a.tableau.fondDe(av.at(-1)) } }, avant)
  ok(d.fond === 'blanc' && d.derniere, `A2. La trieuse, « Ajouter une page » (la dernière : ${d.avantDerniere}) : une page blanche à la fin`, d)
  const k3 = (await p.evaluate(() => window.__app.pages)).indexOf(p3) + 1
  for (const [cote, entree, choix, attendu] of [['après', 'Insérer une page après', null, 'blanc'], ['avant', 'Insérer une page avant', 'Seyès', 'seyes']]) {
    avant = await p.evaluate(() => window.__app.pages)
    await p.click(`.trieuse .carte:nth-child(${k3}) .carte-options`); await p.waitForTimeout(150)
    await p.locator(`.trieuse .menu-vignette .menu-item:has-text("${entree}")`).click(); await p.waitForTimeout(200)
    const m = await p.evaluate(ENTREES_VIGNETTE)
    const titre = await p.evaluate(() => document.querySelector('.menu-vignette .menu-titre')?.textContent)
    const c = m.filter(x => x.coche === 'true')
    ok(m.length === 8 && c.length === 1 && c[0].t === 'Page blanche' && c[0].focus && m.find(x => x.t === 'Repère')?.aide === `Celui de la page ${k3}` && m.filter(x => x.aide).length === 1,
      `A2. « ${entree}… » la page ${k3} (au repère) : « ${titre} », les huit fonds, Page blanche cochée et sous le focus, « Repère » dit « Celui de la page ${k3} »`, m)
    if (choix) await p.locator(`.trieuse .menu-vignette .menu-item:has-text("${choix}")`).click()
    else await p.keyboard.press('Enter')
    await p.waitForTimeout(250)
    d = await p.evaluate(av => { const a = window.__app, n = a.pages.find(x => !av.includes(x)); return { n, fond: a.tableau.fondDe(n), rang: a.pages.indexOf(n) } }, avant)
    ok(d.fond === attendu, `A2. … ${choix ? `« ${choix} » choisi à la place : la page insérée ${cote} est en Seyès` : 'Entrée : la page insérée ' + cote + ' est blanche'}`, d)
  }
  // Dupliquer dans la trieuse : la copie garde son fond
  avant = await p.evaluate(() => window.__app.pages)
  await p.click(`.trieuse .carte:nth-child(${(await p.evaluate(p3 => window.__app.pages.indexOf(p3), p3)) + 1}) .carte-options`); await p.waitForTimeout(150)
  await p.locator('.trieuse .menu-vignette .menu-item:has-text("Dupliquer")').first().click(); await p.waitForTimeout(250)
  d = await p.evaluate(av => { const a = window.__app, n = a.pages.find(x => !av.includes(x)); return { fond: a.tableau.fondDe(n) } }, avant)
  ok(d.fond === 'repere', 'A2. La trieuse, « Dupliquer » une page au repère : la copie reste au repère', d)
  await p.keyboard.press('Escape'); await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  await p.evaluate(() => { if (document.body.classList.contains('en-trieuse')) window.__app.ui.trieuse?.fermer?.() }); await p.waitForTimeout(200)

  // Dupliquer la page (Ctrl + Maj + D) : le fond gardé, à 100 % au centre de l'original
  await p.evaluate(p1 => { const a = window.__app; a.allerPage(p1); a.changerFond('millimetre'); a.cam.z = 1.8; a.cam.x = -300; a.cam.y = 50; a.rendu.toutRedessiner() }, p1); await p.waitForTimeout(150)
  const vOrig = await vue(p)
  await p.mouse.move(700, 400)
  await p.keyboard.press('Control+Shift+D'); await p.waitForTimeout(400)
  w = await vue(p)
  ok(w.page !== p1 && w.fond === 'millimetre' && w.z === 1 && proche(w.cx, vOrig.cx, 0.01) && proche(w.cy, vOrig.cy, 0.01), '« Dupliquer la page » (Ctrl + Maj + D) d\'une page au millimétré, à 180 % : la copie, au millimétré, s\'ouvre à 100 % au même centre', { vOrig, w })
  // Les pages qui existaient ne changent pas
  d = await p.evaluate(ids => ids.map(id => window.__app.tableau.fondDe(id)), [p1, p2, p3])
  ok(JSON.stringify(d) === '["millimetre","seyes","repere"]', 'Les pages qui existaient gardent leur fond (millimétré, Seyès, repère)', d)

  // A3 : changer de page et recharger donnent 100 % au même centre
  await p.evaluate(p2 => { const a = window.__app; a.allerPage(p2); a.cam.z = 2.2; a.cam.x = -900; a.cam.y = -400; a.rendu.toutRedessiner() }, p2)
  await p.mouse.move(700, 400); await p.mouse.wheel(0, 120); await p.waitForTimeout(600)
  const vP2 = await vue(p)
  await aller(p, 'PageDown'); await aller(p, 'PageUp')
  w = await vue(p)
  ok(w.page === p2 && w.z === 1 && proche(w.cx, vP2.cx, 0.01) && proche(w.cy, vP2.cy, 0.01), 'A3. Page↓ puis Page↑ : la page reprend son centre, à 100 % (et non 220 %)', { vP2, w })
  const zt = await p.evaluate(() => document.querySelector('.zoom-texte').textContent.replace(/\s/g, ' '))
  ok(zt === '100 %', '   … le pourcentage dit « 100 % »', zt)
  await p.evaluate(() => window.__app.zoomer(1.6)); await p.waitForTimeout(600)
  const vZ = await vue(p)
  await p.reload(); await p.waitForFunction(() => window.__app?.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
  w = await vue(p)
  ok(vZ.z > 1.5 && w.page === p2 && w.z === 1 && proche(w.cx, vZ.cx, 0.02) && proche(w.cy, vZ.cy, 0.02), 'A3. Zoomée à 160 %, rechargée : la même page, à 100 %, au même centre', { vZ, w })
  const sess = await p.evaluate(() => JSON.parse(localStorage.getItem('mem-session')))
  ok(sess?.v === 1 && Array.isArray(sess.vues[p2]) && sess.vues[p2].length === 3, '   … la session garde son format (v: 1, [cx, cy, z] par page)', sess)

  // A3 : une page jamais regardée et déjà écrite
  const neuves = await p.evaluate(() => {
    const a = window.__app, t = a.tableau, n = a.pages.length
    return [t.ajouterPage('blanc', n), t.ajouterPage('blanc', n + 1), t.ajouterPage('blanc', n + 2), t.ajouterPage('blanc', n + 3)]
  })
  await p.evaluate(POSER, { page: neuves[0], traits: [[-500, -300, 3000, 2000], [2300, 1600, 400, 300]] })        // grande dans les deux sens
  await p.evaluate(POSER, { page: neuves[1], traits: [[700, 400, 200, 80]] })                                      // petite
  await p.evaluate(POSER, { page: neuves[2], traits: [[100, 50, 300, 2500]] })                                     // haute et étroite
  await p.evaluate(() => new Promise(r => setTimeout(r, 300)))
  const cadrage = id => p.evaluate(id => {
    const a = window.__app
    a.allerPage(id)
    const r = a.ui.zoneLibre(), b = a.boiteDuContenu(), q = a.cam.versEcran(b.x, b.y), s = a.cam.versEcran(b.x + b.l, b.y + b.h)
    return { z: a.cam.z, r, b, gauche: q.x - r.x, haut: q.y - r.y, cx: (q.x + s.x) / 2 - (r.x + r.l / 2), cy: (q.y + s.y) / 2 - (r.y + r.h / 2) }
  }, id)
  d = await cadrage(neuves[0])
  ok(d.z === 1 && proche(d.gauche, 32, 0.01) && proche(d.haut, 32, 0.01), 'A3. Une page jamais regardée, plus grande que l\'écran : à 100 %, son coin en haut à gauche à 32 px du coin de la zone libre', d)
  d = await cadrage(neuves[1])
  ok(d.z === 1 && proche(d.cx, 0, 0.01) && proche(d.cy, 0, 0.01), 'A3. … une page au petit contenu : à 100 %, centré entre les barres', d)
  d = await cadrage(neuves[2])
  ok(d.z === 1 && proche(d.cx, 0, 0.01) && proche(d.haut, 32, 0.01), 'A3. … un contenu haut et étroit : à 100 %, centré en largeur, son haut à 32 px', d)
  d = await p.evaluate(id => { const a = window.__app; a.allerPage(id); return { z: a.cam.z, x: a.cam.x, y: a.cam.y } }, neuves[3])
  ok(d.z === 1 && d.x === 120 && d.y === 120, 'A3. … une page neuve, vide : la vue neutre, à 100 %', d)
  // Tout voir et le zoom à la main restent
  d = await p.evaluate(async id => { const a = window.__app; a.allerPage(id); a.toutVoir(); await new Promise(r => setTimeout(r, 450)); const z1 = a.cam.z; a.zoomer(1.5); return { z1, z2: a.cam.z } }, neuves[0])
  ok(d.z1 < 0.5 && proche(d.z2, d.z1 * 1.5, 1e-9), `A3. « Tout voir » montre encore toute la grande page (${Math.round(d.z1 * 100)} %), le zoom à la main marche`, d)
  // Un fichier ouvert (les vues oubliées), rechargé : la page de départ, jamais regardée, à 100 % sur son début
  await p.evaluate(id => { const a = window.__app; a.allerPage(id); const o = a.tableau.ordre; const i = o.toArray().indexOf(id); a.tableau.doc.transact(() => { o.delete(i, 1); o.insert(0, [id]) }) }, neuves[0])
  await p.waitForTimeout(300)
  await p.evaluate(() => { window.__app.oublierVues(); window.__app.arreterSession() })
  await p.reload(); await p.waitForFunction(() => window.__app?.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
  d = await p.evaluate(() => {
    const a = window.__app, r = a.ui.zoneLibre(), b = a.boiteDuContenu(), q = a.cam.versEcran(b.x, b.y)
    return { premiere: a.page === a.pages[0], z: a.cam.z, gauche: q.x - r.x, haut: q.y - r.y }
  })
  ok(d.premiere && d.z === 1 && proche(d.gauche, 32, 0.01) && proche(d.haut, 32, 0.01), 'A3. Les vues oubliées (un classeur ouvert d\'un fichier), rechargé : la première page, grande, à 100 % sur son coin en haut à gauche', d)

  // La revue en classe ne change pas : elle reprend la vue du tableau, zoom compris
  // (un trait d'abord : la revue s'ouvre sur la dernière séance, qui finit sur cette page)
  await p.evaluate(() => { const a = window.__app; a.allerPage(a.pages[0]); a.choisirOutil('stylo'); a.cam.z = 0.6; a.cam.x = 200; a.cam.y = 150; a.rendu.toutRedessiner() })
  await ecrire(p, 600, 420, 760, 450)
  await p.waitForTimeout(400)
  await p.click('.barre-haut button[aria-label^="Revoir la construction"]'); await p.waitForTimeout(900)
  d = await p.evaluate(() => { const rv = window.__app.ui.revue; return { ouverte: document.body.classList.contains('en-revue') || !rv?.el?.hidden, z: rv?.cam?.z, x: rv?.cam?.x, y: rv?.cam?.y } })
  await p.keyboard.press('Escape'); await p.waitForTimeout(400)
  ok(d.z === 0.6 && d.x === 200 && d.y === 150, 'La revue en classe ne change pas : ouverte sur la page qu\'on regarde, elle en reprend la vue, zoom compris (60 %)', d)
  await ctx.close()

  // Le lecteur élève ne change pas : son accueil garde ses petits carreaux
  const c2 = await contexte()
  const l = await c2.newPage(); suivre(l, 'lecteur')
  await l.goto(DEV + 'revoir.html'); await l.waitForTimeout(1200)
  d = await l.evaluate(() => {
    const c = document.querySelector('.scene canvas'), x = c.getContext('2d').getImageData(0, 0, c.width, Math.min(c.height, 200)).data
    let bleus = 0
    for (let i = 0; i < x.length; i += 4) if (x[i + 3] > 0 && x[i + 2] > x[i] + 20 && x[i + 2] < 250) bleus++
    return { bleus, carte: !!document.querySelector('.carte') }
  })
  ok(d.bleus > 500 && d.carte, 'Le lecteur élève ne change pas : son accueil (« Revoir une séance ») garde ses petits carreaux', d)
  await c2.close()

  // Un nouveau classeur, au serveur de développement : une page blanche, 100 %, le trait fin
  const c3 = await contexte()
  p = await ouvrirDev(c3, 'dev-classeur')
  await p.evaluate(() => window.__app.zoomer(1.7))
  await p.click('.bouton-classeur'); await p.click('.menu-seances [data-action="bibliotheque"]'); await p.waitForSelector('.biblio-nouveau', { state: 'visible', timeout: 10000 }); await p.waitForTimeout(200)
  await p.click('.biblio-nouveau'); await p.waitForSelector('dialog.dialogue-nouveau[open]'); await p.waitForTimeout(150)
  d = await p.evaluate(() => (document.querySelector('dialog.dialogue-nouveau[open] input[name="fond"]:checked'))?.value)
  ok(d === 'blanc', '« Nouveau classeur » : Page blanche cochée', d)
  await Promise.all([p.waitForNavigation({ timeout: 20000 }), p.click('dialog.dialogue-nouveau[open] [data-a="creer"]')])
  await p.waitForFunction(() => window.__app?.page && window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
  d = await p.evaluate(() => { const a = window.__app; return { pages: a.pages.length, fond: a.fond, z: a.cam.z, taille: a.taille, film: a.tableau.film.length, naissance: !!a.tableau.film.get(0)?.naissance, autre: a.classeur.base !== 'mem-tableau-local' } })
  ok(d.autre && d.pages === 1 && d.fond === 'blanc' && d.z === 1 && d.taille === 2.5 && d.film === 1 && d.naissance, 'Le classeur neuf : une page blanche (sa naissance au film), à 100 %, le trait fin', d)
  await c3.close()
}

await nav.close()
serveur.close()
if (erreurs.length) { echecs++; console.log('✗ ÉCHEC erreurs JS :', erreurs.slice(0, 10)) } else console.log('✓ aucune erreur JS')
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
