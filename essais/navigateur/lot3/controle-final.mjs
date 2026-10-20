// Essais au navigateur des corrections du contrôle final du lot 3 :
// 1. la police d'écriture (Google Fonts) ne bloque plus le démarrage : un
//    réseau qui ne répond jamais (le proxy d'un lycée) ou coupé laisse
//    l'outil s'ouvrir, en un seul fichier (file://, dist/index.html), en
//    ligne (dist-pages, servie sur :4180) et au développement (:5173) ; la
//    police arrive quand le réseau répond ;
// 2. au TNI (1920 × 1080, 80 pages), deux doigts qui glissent font défiler
//    la trieuse, sans ouvrir ni déplacer de page ; deux doigts posés et levés
//    n'ouvrent rien ; un seul doigt défile toujours ;
// 3. à 1024 × 768, le nom de la page se lit dans le compteur (plus petit),
//    sans faire passer la barre à deux rangées ni bouger ses boutons d'une
//    page à l'autre ; à 1366, il garde sa taille.
// (Le fond changé et la page insérée dans la trieuse après le cours ou entre
// deux cours : section « seance » de donnees-corrections.mjs.)
// Il faut les deux versions construites (npm run build, npm run build:pages)
// et le serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … »
// par vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node controle-final.mjs [section…] (police, doigts, nom)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { spawn } from 'node:child_process'

const R = `${RACINE_DEPOT}`
const URL0 = 'http://localhost:5173/'
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push(!!ok)
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
const pause = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  const page = await ctx.newPage()
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await pause(400)
  return { ctx, page }
}

// ---------- 1. La police ne bloque pas le démarrage ----------
if (faire('police')) {
  // La version en ligne, servie comme sur GitHub Pages
  let serveur = null
  const enLigne = async () => { try { return (await fetch('http://127.0.0.1:4180/index.html')).ok } catch { return false } }
  if (!await enLigne()) {
    serveur = spawn('python3', ['-m', 'http.server', '4180', '--bind', '127.0.0.1', '--directory', R + '/dist-pages'], { stdio: 'ignore' })
    for (let k = 0; k < 30 && !await enLigne(); k++) await pause(200)
  }
  const locales = u => u.startsWith('file:') || u.startsWith('data:') || u.startsWith('blob:') || /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(u)
  for (const [version, url] of [['un seul fichier (file://)', `file://${R}/dist/index.html`], ['en ligne (dist-pages)', 'http://127.0.0.1:4180/index.html'], ['développement', URL0]]) {
    for (const mode of ['pend', 'coupe']) {
      const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
      const bloquees = []
      await ctx.route('**/*', r => {
        const u = r.request().url()
        if (locales(u)) return r.continue()
        bloquees.push(u)
        if (mode === 'coupe') return r.abort('internetdisconnected')
        // 'pend' : ne jamais répondre (le proxy qui retient les requêtes)
      })
      const page = await ctx.newPage()
      page.on('pageerror', e => erreurs.push(`police ${version} ${mode}: ${e.message}`))
      const t0 = Date.now()
      await page.goto(url, { waitUntil: 'commit' })
      const pret = await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 10000 }).then(() => true, () => false)
      const duree = Date.now() - t0
      // On écrit : un trait au Stylo, l'outil répond
      let traits = 0
      if (pret) {
        await page.keyboard.press('p')
        await page.mouse.move(500, 300); await page.mouse.down()
        for (let k = 1; k <= 12; k++) await page.mouse.move(500 + k * 15, 300 + Math.sin(k / 2) * 12)
        await page.mouse.up(); await pause(300)
        traits = await page.evaluate(() => document.querySelectorAll('#zone canvas').length)
      }
      const police = bloquees.some(u => u.includes('fonts.googleapis.com'))
      verifier(`${version}, réseau ${mode === 'pend' ? 'qui ne répond jamais' : 'coupé'} : l'outil s'ouvre (${duree} ms) et l'on écrit`, pret && duree < 8000 && traits > 0 && police, { pret, duree, police, bloquees: bloquees.slice(0, 3) })
      await ctx.close()
    }
  }
  // Réseau qui répond : la feuille de la police passe à « all » et la police s'applique
  {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
    const servie = []
    await ctx.route('**/*', r => {
      const u = r.request().url()
      if (locales(u)) return r.continue()
      if (u.includes('fonts.googleapis.com')) {
        servie.push(u)
        return r.fulfill({ status: 200, contentType: 'text/css', body: '@font-face { font-family: "Atkinson Hyperlegible"; src: local("DejaVu Sans"); font-weight: 400; } .police-essai { --chargee: 1; }' })
      }
      return r.abort('internetdisconnected')
    })
    const page = await ctx.newPage()
    await page.goto(`file://${R}/dist/index.html`, { waitUntil: 'commit' })
    await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 10000 }).catch(() => null)
    await pause(500)
    const lien = await page.evaluate(() => { const l = [...document.querySelectorAll('link[rel="stylesheet"]')].find(x => x.href.includes('fonts.googleapis.com')); return l ? { media: l.media, feuille: !!l.sheet } : null })
    verifier('Réseau qui répond : la feuille de la police est chargée et s\'applique (media « all »)', servie.length === 1 && lien?.media === 'all' && lien.feuille, { servie, lien })
    await ctx.close()
  }
  if (serveur) serveur.kill()
}

// ---------- 2. Deux doigts dans la trieuse, au TNI ----------
if (faire('doigts')) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1920, height: 1080 } }, 'tni')
  const cdp = await ctx.newCDPSession(page)
  const doigts = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y, id]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) })
  const P = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    for (let k = 0; k < 80; k++) {
      if (k) a.nouvellePage()
      t.nouveauGeste()
      t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: k, auteur: t.moi, pts: [0, 0, 0.5, 120, 40, 0.5, 240, 0, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
    }
    a.allerPage(a.pages[0])
    return a.pages.slice()
  })
  const ETAT = () => ({
    ouverte: !document.querySelector('.trieuse')?.hidden, page: window.__app.page, pages: window.__app.pages.slice(),
    defilement: document.querySelector('.trieuse-grille')?.scrollTop ?? 0,
    peut: (g => g ? g.scrollHeight - g.clientHeight : 0)(document.querySelector('.trieuse-grille')),
  })
  const carte = i => page.evaluate(i => { const r = document.querySelectorAll('.trieuse .carte')[i].getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, i)
  /** La i-ème carte entièrement visible dans la grille (après un défilement) */
  const visible = i => page.evaluate(i => {
    const g = document.querySelector('.trieuse-grille').getBoundingClientRect()
    const r = [...document.querySelectorAll('.trieuse .carte')].map(c => c.getBoundingClientRect()).filter(r => r.top >= g.top && r.bottom <= g.bottom)[i]
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
  }, i)
  await page.keyboard.press('Shift+P'); await pause(800)
  let e = await page.evaluate(ETAT)
  verifier('80 pages au TNI : la grille a de quoi défiler', e.ouverte && e.peut > 400, e.peut)
  // Deux doigts posés et levés ensemble
  let a = await carte(6), b = await carte(8)
  await doigts('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await pause(80)
  await doigts('touchEnd', []); await pause(500)
  e = await page.evaluate(ETAT)
  verifier('Deux doigts posés et levés ensemble : aucune page ne s\'ouvre', e.ouverte && e.page === P[0], { ouverte: e.ouverte, page: P.indexOf(e.page) + 1 })
  // Deux doigts qui glissent vers le haut
  a = await carte(12); b = await carte(13)
  await doigts('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await pause(30)
  for (let k = 1; k <= 15; k++) { await doigts('touchMove', [[a.x, a.y - k * 20, 1], [b.x, b.y - k * 20, 2]]); await pause(16) }
  await doigts('touchEnd', []); await pause(600)
  e = await page.evaluate(ETAT)
  verifier('Deux doigts qui glissent de 300 px vers le haut : la grille défile d\'autant, rien ne s\'ouvre ni ne bouge', e.ouverte && Math.abs(e.defilement - 300) <= 30 && JSON.stringify(e.pages) === JSON.stringify(P) && e.page === P[0], { d: e.defilement, ouverte: e.ouverte })
  // Puis vers le bas, de 100 px
  const d1 = e.defilement
  a = await visible(0); b = await visible(1)
  await doigts('touchStart', [[a.x, a.y, 1], [b.x, b.y, 2]]); await pause(30)
  for (let k = 1; k <= 5; k++) { await doigts('touchMove', [[a.x, a.y + k * 20, 1], [b.x, b.y + k * 20, 2]]); await pause(16) }
  await doigts('touchEnd', []); await pause(600)
  e = await page.evaluate(ETAT)
  verifier('… puis vers le bas : elle remonte', Math.abs(d1 - e.defilement - 100) <= 20, { d1, d: e.defilement })
  // Un doigt seul défile toujours
  await page.evaluate(() => { document.querySelector('.trieuse-grille').scrollTop = 0 }); await pause(200)
  a = await carte(12)
  await doigts('touchStart', [[a.x, a.y, 1]]); await pause(30)
  for (let k = 1; k <= 15; k++) { await doigts('touchMove', [[a.x, a.y - k * 20, 1]]); await pause(16) }
  await doigts('touchEnd', []); await pause(600)
  e = await page.evaluate(ETAT)
  verifier('Un doigt seul défile toujours (le navigateur)', e.ouverte && e.defilement > 150 && e.page === P[0], { d: e.defilement })
  await ctx.close()
}

// ---------- 3. Le nom de la page dans le compteur, à 1024 × 768 ----------
if (faire('nom')) {
  const positions = page => page.evaluate(() => [...document.querySelectorAll('.barre-haut > *')].map(b => { const r = b.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)].join(',') }))
  const compteur = page => page.evaluate(() => {
    const n = document.querySelector('.rang-nom'), b = document.querySelector('.barre-haut')
    return { texte: document.querySelector('.rang').textContent, visible: getComputedStyle(n).display !== 'none' && n.getBoundingClientRect().width >= 56, l: Math.round(n.getBoundingClientRect().width), police: getComputedStyle(n).fontSize, serre: n.classList.contains('serre'), hauteur: Math.round(b.getBoundingClientRect().height) }
  })
  // (Lot 5, K8 : la liste déroulante des fonds est devenue un bouton de
  // 44 px, la barre du haut a 115 px de moins ; à 1024 × 768 le nom se lit
  // désormais en entier, à sa taille : le compteur ne se resserre qu'à
  // 910 px et moins, essayé à 900 × 768. Adapté volontairement.)
  // (Adapté au catalogue : la barre du haut a un bouton de plus, 46 px ; le
  // compteur se resserre dès 970 px environ, et à 900 px le nom n'a plus la
  // place : le cas resserré est essayé à 950 × 768.)
  // (Adapté aux outils de classe : un bouton de plus, « Classe », 46 px ;
  // le compteur se resserre dès 1 016 px environ : le cas resserré passe à
  // 990 × 768.)
  for (const [l, h, serre] of [[1024, 768, false], [990, 768, true], [1366, 768, false]]) {
    const { ctx, page } = await ouvrir({ viewport: { width: l, height: h } }, `nom ${l}`)
    const h0 = (await compteur(page)).hauteur
    await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage(); a.tableau.renommerPage(a.pages[1], 'Exercice 12 p. 84'); a.allerPage(a.pages[0]) })
    await pause(1500)
    const p1 = await positions(page)
    await page.evaluate(() => window.__app.allerPage(window.__app.pages[1])); await pause(1500)
    const c = await compteur(page), p2 = await positions(page)
    verifier(`${l} × ${h} : « 2 / 3 · Exercice 12 p. 84 » se lit dans le compteur${serre ? ' (plus petit)' : ''}, la barre garde une rangée`, c.visible && c.texte === '2 / 3 · Exercice 12 p. 84' && c.serre === serre && c.hauteur === h0, c)
    verifier(`${l} × ${h} : de la page 1 (sans nom) à la page 2 (nommée), aucun bouton de la barre ne bouge`, JSON.stringify(p1) === JSON.stringify(p2), { p1, p2 })
    await ctx.close()
  }
}

await nav.close()
const rates = resultats.filter(x => !x).length
console.log(`\n${resultats.length - rates}/${resultats.length} vérifications`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(rates || erreurs.length ? 1 : 0)
