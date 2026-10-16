// Essais au navigateur de la revue en classe (src/revue/) et des retouches
// du lecteur des élèves. Lancer avec le serveur de développement sur :5173.
import { RACINE_ESSAIS, RACINE_DEPOT } from './commun/racines.mjs'
import { chromium } from './commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const DOSSIER = `${RACINE_ESSAIS}/shots`
mkdirSync(DOSSIER, { recursive: true })
const SEULEMENT = process.argv[2] || ''          // ex. « perf » pour ne lancer qu'une partie

const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok, detail })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
}
const dort = ms => new Promise(r => setTimeout(r, ms))
const erreurs = []
function surveiller(page, nom) {
  // Les polices de Google ne passent pas par le mandataire du bac à sable : ce n'est pas une erreur du code
  page.on('console', m => { if (m.type() === 'error' && !(/Failed to load resource/.test(m.text()) && !/localhost/.test(m.location().url))) erreurs.push(`${nom}: ${m.text()} @ ${m.location().url}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}

const navigateur = await chromium.launch()

// L'état du document, octet pour octet (avec le module yjs de l'application)
const ETAT = async () => {
  const url = performance.getEntriesByType('resource').map(e => e.name).find(n => /\/deps\/yjs\.js/.test(n))
  const Y = await import(url)
  const t = window.__app.tableau
  return {
    sv: Array.from(Y.encodeStateVector(t.doc)).join(','),
    film: t.film.length,
    pages: JSON.stringify(t.doc.getMap('pages').toJSON()),
    stockage: JSON.stringify({ l: Object.entries(localStorage), s: Object.entries(sessionStorage) }),
  }
}
const REVUE = () => {
  const r = window.__revue
  const b = r.bande
  return {
    ouvert: r.ouvert, k: r.k, n: b ? b.images.length : 0, enMarche: r.enMarche, mode: r.mode, arret: r.arret,
    trace: !!r.trace, boucle: r.boucle, allure: r.allure, vue: r.vue,
    parties: b ? b.parties.map(p => ({ debut: p.debut, fin: p.fin, page: p.page, titre: p.titre })) : [],
    bornes: b ? b.bornes : [], geste: b ? b.images[r.k].geste : null, gestes: b ? b.images.map(i => i.geste) : [], page: b ? b.images[r.k].p : null,
    cam: { x: r.cam.x, y: r.cam.y, z: r.cam.z },
    bandeau: r.bandeau.hidden ? '' : r.bandeau.textContent,
    portion: b ? { genre: b.portion.genre, page: b.portion.page } : null,
    total: b ? b.total : 0,
  }
}
/** La borne où mène un pas en avant, calculée ici sans le module */
function pasAttendu(e, k) {
  const i = e.bornes.findIndex(x => x > k)
  if (i < 0) return e.n - 1
  // Une ouverture de partie se traverse
  if (e.bornes[i] > 0 && !e.gestes[e.bornes[i]] && i + 1 < e.bornes.length) return e.bornes[i + 1]
  return e.bornes[i]
}

// =============================================================
// 1. Un tableau neuf : le bouton, et rien à revoir
// =============================================================
if (!SEULEMENT || SEULEMENT === 'neuf') {
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage(); surveiller(page, 'neuf')
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__revue && window.__app.page)
  const b = page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' })
  verifier('Le bouton « Revoir la construction… » existe', await b.count() === 1)
  verifier('L\'ancien libellé « Rejouer la construction du tableau » a disparu',
    await page.locator('[aria-label="Rejouer la construction du tableau"], [title="Rejouer la construction du tableau"]').count() === 0)
  const d = await b.locator('path').getAttribute('d')
  verifier('L\'icône du bouton est la nouvelle', d === 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4.2h4.2M10.5 9.5v5l4-2.5z', d)
  const film = await page.evaluate(() => window.__app.tableau.film.length)
  await b.click()
  await page.waitForTimeout(150)
  const toast = await page.locator('.toast').textContent()
  const vu = await page.evaluate(() => ({ revue: !document.querySelector('.revue').hidden, enLecture: window.__app.enLecture, toast: document.querySelector('.toast').classList.contains('visible') }))
  verifier('Tableau neuf : seulement le message, aucun calque', film < 2 && vu.toast && /^Rien à revoir pour l'instant/.test(toast) && !vu.revue && !vu.enLecture, `film=${film} toast=« ${toast} »`)
  await page.screenshot({ path: `${DOSSIER}/01-tableau-neuf-message.png` })
  await ctx.close()
}

// =============================================================
// 2. Un tableau avec son histoire
// =============================================================
/** Horloge du tableau décalée : on fabrique des séances sur plusieurs jours sans attendre */
const HORLOGE = (decalage) => {
  const vrai = Date.now.bind(Date)
  window.__decalage = decalage
  Date.now = () => vrai() + window.__decalage
}

/** L'histoire du tableau, construite avec l'API de l'application */
const HISTOIRE = async () => {
  const app = window.__app, t = app.tableau
  const pause = ms => new Promise(r => setTimeout(r, ms))
  let n = 0
  const id = () => 'pw' + (n++)
  const base = { auteur: t.moi }
  const trait = (x, y, l = 14) => ({ ...base, id: id(), type: 'trait', x, y, z: n, pts: Array.from({ length: 16 }, (_, i) => [i * l, Math.sin(i / 2) * 12, 0.5]).flat(), couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
  /** Un geste, puis un silence (fictif) avant le suivant */
  const geste = async (forme, silence = 600) => { t.poser(app.page, forme); await pause(20); window.__decalage += silence }
  const avancer = ms => { window.__decalage += ms }
  const p1 = app.page
  avancer(2000)
  // Séance A, avant-hier : page 1
  for (let i = 0; i < 5; i++) await geste(trait(80, 80 + i * 40), 600)
  await geste({ ...base, id: id(), type: 'formule', x: 420, y: 60, z: n, latex: '\\frac{a}{b} = 0{,}5', couleur: '#1f5fbf', taille: 32 }, 600)
  // Douze courtes séances, le même jour
  for (let s = 0; s < 12; s++) { avancer(25 * 60_000); await geste(trait(80 + s * 30, 400), 500) }
  // Séance B, hier : page 1, puis une page neuve et ses figures
  window.__decalage = -(24 * 3600_000) - 3 * 3600_000
  for (let i = 0; i < 3; i++) await geste(trait(400, 200 + i * 40), 700)
  app.nouvellePage(); await pause(20); avancer(800)
  const p2 = app.page
  await geste({ ...base, id: id(), type: 'polygone', x: 120, y: 120, z: n, pts: [0, 0, 250, 60], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['M', 'N'] }, 1200)
  await geste({ ...base, id: id(), type: 'cercle', x: 650, y: 260, z: n, r: 90, couleur: '#d0342c', taille: 3, sommets: true, noms: ['O'] }, 1200)
  const triangle = { ...base, id: 'triangle', type: 'polygone', x: 160, y: 420, z: n, pts: [0, 0, 220, 0, 90, -160], ferme: true, couleur: '#1f5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], codage: true, fond: '#1f5fbf' }
  await geste(triangle, 1200)
  await geste({ ...base, id: id(), type: 'cercle', x: 650, y: 260, z: n, r: 140, arc: { a0: 0.2, a1: 1.6 }, couleur: '#1e8a4c', taille: 3 }, 1200)
  await geste({ ...base, id: id(), type: 'polygone', x: 120, y: 560, z: n, pts: [0, 0, 120, 30], ferme: false, prolonge: 'demi', couleur: '#1b2230', taille: 3 }, 4 * 60_000)
  // Quatre minutes de silence : une autre partie, des gestes bien séparés (chacun son pas)
  for (let i = 0; i < 3; i++) await geste(trait(500, 480 + i * 40), 2500)
  await geste(trait(820, 480), 300)
  await geste(trait(820, 520), 600)
  // Séance C, aujourd'hui
  window.__decalage = -2 * 3600_000
  for (let i = 0; i < 2; i++) await geste(trait(860, 100 + i * 40), 700)
  app.nouvellePage(); await pause(20); avancer(700)
  const p3 = app.page
  for (let i = 0; i < 3; i++) await geste(trait(100, 100 + i * 50), 800)
  app.nouvellePage(); await pause(20); avancer(700)
  const p4 = app.page
  await geste(trait(300, 300), 700)
  app.allerPage(p2); await pause(20)
  // Deux gestes invisibles sur la page 2 : on jette les pages 3 et 4 en la regardant
  t.supprimerPage(p3); await pause(20); avancer(500)
  t.supprimerPage(p4); await pause(20); avancer(500)
  // Une image, une formule, des traits à intervalle connu, un trait loin
  const c = document.createElement('canvas'); c.width = 64; c.height = 48
  const g = c.getContext('2d'); g.fillStyle = '#e0a800'; g.fillRect(0, 0, 64, 48); g.fillStyle = '#1f5fbf'; g.fillRect(8, 8, 30, 20)
  t.doc.getMap('images').set('pw-image', c.toDataURL('image/png'))
  await geste({ ...base, id: id(), type: 'image', x: 900, y: 420, z: n, src: 'pw-image', l: 64, h: 48, m: [2, 0, 0, 2] }, 1500)
  await geste({ ...base, id: id(), type: 'formule', x: 880, y: 340, z: n, latex: 'x^2 + 1', couleur: '#1b2230', taille: 32 }, 1200)
  for (let i = 0; i < 4; i++) await geste(trait(380, 640 + i * 30), 1200)
  await geste(trait(4200, 2600), 1200)                  // hors du champ habituel
  // Séance D : un seul geste, sur la page 1
  avancer(40 * 60_000)
  app.allerPage(p1); await pause(20)
  await geste(trait(700, 600), 500)
  app.allerPage(p2); await pause(20)
  window.__decalage = 0
  // (Adapté au lot 6 : les séances de cette histoire sont devinées dans le
  // film, par le découpage d'avant ; le classeur est donc un classeur d'avant
  // le lot 6, sans séances explicites)
  t.doc.transact(() => { t.seances.clear(); t.seanceDesPages.clear() }); t.seancesActives = false; app.ui.maj(); await pause(20)
  return { p1, p2, p3, p4 }
}

let pages = null
if (!SEULEMENT || SEULEMENT === 'histoire') {
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(HORLOGE, -(2 * 24 * 3600_000) - 4 * 3600_000)
  const page = await ctx.newPage(); surveiller(page, 'histoire')
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__revue && window.__app.page)
  pages = await page.evaluate(HISTOIRE)
  await page.waitForTimeout(300)
  // (lot 3, P3 : le dernier changement de page de l'histoire fait paraître le
  // numéro de la page en grand, un peu plus d'une seconde, en haut au centre :
  // on attend qu'il soit parti avant de comparer l'écran au pixel près)
  await page.waitForFunction(() => { const a = document.querySelector('.annonce-page'); return !a || a.hidden }, null, { timeout: 5000 })

  // Rien ne saute : sans sélection ni instrument, l'écran est le même au pixel près
  {
    const zone = { x: 380, y: 140, width: 560, height: 420 }
    const imgAvant = await page.screenshot({ clip: zone })
    await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
    await page.waitForTimeout(150)
    const imgApres = await page.screenshot({ clip: zone })
    verifier('Rien ne saute : le centre de l\'écran est identique au pixel près', Buffer.compare(imgAvant, imgApres) === 0)
    await page.keyboard.press('Escape')
  }

  // Le décor : une figure choisie avec son panneau, un instrument, la Sélection, une vue décalée
  await page.evaluate(() => {
    const app = window.__app
    app.choisirOutil('selection')
    app.ouvrirOptions(app.forme('triangle'))
    app.basculerInstrument('regle')
    app.cam.x = 37; app.cam.y = -18; app.cam.z = 1.15
    app.rendu.toutRedessiner(); app.ui.maj()
  })
  await page.waitForTimeout(300)
  const avant = await page.evaluate(() => {
    const app = window.__app
    return {
      page: app.page, cam: { x: app.cam.x, y: app.cam.y, z: app.cam.z }, selection: [...app.selection], options: app.options, outil: app.outil,
      panneau: !document.querySelector('.panneau-forme').hidden, instruments: [...app.instruments.keys()], formes: app.rendu.formes.length,
      canevas: document.querySelectorAll('canvas').length,
    }
  })
  const etatAvant = await page.evaluate(ETAT)
  verifier('Le décor est en place (sélection, panneau, règle)', avant.selection.length === 1 && avant.panneau && avant.instruments.includes('regle'), JSON.stringify(avant))
  await page.screenshot({ path: `${DOSSIER}/02-tableau-avant.png` })
  // Ce qui est écrit dans le stockage du navigateur pendant la revue
  await page.evaluate(() => {
    window.__ecritures = 0
    for (const m of ['setItem', 'removeItem', 'clear']) {
      const o = Storage.prototype[m]
      Storage.prototype[m] = function (...a) { window.__ecritures++; return o.apply(this, a) }
    }
  })

  // ---------- Ouverture ----------
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await page.waitForTimeout(120)
  let e = await page.evaluate(REVUE)
  const geo = await page.evaluate(() => {
    const r = document.querySelector('.revue').getBoundingClientRect()
    const cadre = getComputedStyle(document.querySelector('.revue-cadre'))
    const et = document.querySelector('.revue-etiquette')
    return {
      r: [r.left, r.top, r.width, r.height], w: innerWidth, h: innerHeight,
      bord: cadre.borderTopWidth, couleur: cadre.borderTopColor, etiquette: et.textContent, etiquetteVue: et.getBoundingClientRect().width > 0,
      ligne1: document.querySelector('.revue-ou .ligne1').textContent, ligne2: document.querySelector('.revue-ou .ligne2').textContent,
      parties: document.querySelectorAll('.revue-partie').length, focus: document.activeElement?.getAttribute('aria-label'),
      appCam: { x: window.__app.cam.x, y: window.__app.cam.y, z: window.__app.cam.z }, appPage: window.__app.page,
    }
  })
  verifier('Le calque couvre tout l\'écran', geo.r[0] === 0 && geo.r[1] === 0 && geo.r[2] === geo.w && geo.r[3] === geo.h, geo.r.join(','))
  verifier('Cadre jaune de 6 px et étiquette REVOIR', geo.bord === '6px' && geo.couleur === 'rgb(255, 228, 92)' && geo.etiquette === 'REVOIR' && geo.etiquetteVue, `${geo.bord} ${geo.couleur}`)
  verifier('Ouvre en pause sur l\'image finale de la page affichée, dans sa dernière séance',
    e.ouvert && !e.enMarche && e.k === e.n - 1 && e.portion.genre === 'seance' && e.portion.page === geo.appPage && e.page === geo.appPage, JSON.stringify({ k: e.k, n: e.n, portion: e.portion }))
  verifier('Même vue que le tableau (même caméra)', e.cam.x === geo.appCam.x && e.cam.y === geo.appCam.y && e.cam.z === geo.appCam.z, JSON.stringify(e.cam))
  verifier('Bandeau d\'accueil avec la portion', /^Page 2 · aujourd'hui, \d{1,2}\sh\s\d{2} → \d{1,2}\sh\s\d{2} · \d+ gestes — Espace : revoir depuis le début · ← : remonter pas à pas$/.test(e.bandeau), e.bandeau)
  verifier('La frise montre les parties', geo.parties === e.parties.length && geo.parties >= 1, `${geo.parties}`)
  verifier('Pastille « Page N / M · jour · heure »', /^Page 2 \/ 2 · aujourd'hui · \d{1,2}\sh\s\d{2}$/.test(geo.ligne1), geo.ligne1)
  verifier('Le focus est sur Lire', geo.focus === 'Lire (Espace)', geo.focus)
  await page.screenshot({ path: `${DOSSIER}/03-revue-ouverte-affiche.png` })

  // ---------- Rien ne s'écrit : stylet, doigt, souris, clavier, collage, fichier lâché ----------
  const docAvant = await page.evaluate(ETAT)
  const sousLeDoigt = await page.evaluate(() => [[200, 300], [640, 400], [1000, 200], [60, 400], [1200, 60], [1200, 760]].every(([x, y]) => document.querySelector('.revue').contains(document.elementFromPoint(x, y))))
  verifier('Partout, c\'est la revue qui est sous le doigt', sousLeDoigt)
  await page.mouse.move(500, 300); await page.mouse.down(); await page.mouse.move(560, 340, { steps: 6 }); await page.mouse.move(620, 300, { steps: 6 }); await page.mouse.up()
  await page.mouse.dblclick(450, 470)
  await page.mouse.click(450, 470, { button: 'right' })
  await page.touchscreen.tap(700, 300).catch(() => {})
  await page.evaluate(() => {
    // Un stylet, par des événements de pointeur à l'endroit visé
    const el = document.elementFromPoint(300, 300)
    for (const [type, x] of [['pointerdown', 300], ['pointermove', 340], ['pointermove', 380], ['pointerup', 380]]) {
      el.dispatchEvent(new PointerEvent(type, { pointerType: 'pen', pointerId: 77, clientX: x, clientY: 300, bubbles: true, pressure: 0.5, button: 0, buttons: type === 'pointerup' ? 0 : 1 }))
    }
  })
  await page.waitForTimeout(400)
  await page.evaluate(() => window.__revue.pause(false))
  for (const k of ['Control+z', 'Control+y', 'Delete', 'Backspace', 'p', 'h', 'e', 'x', 'l', 'v', 'g', 'r']) await page.keyboard.press(k)
  const coller = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 4
    const blob = await new Promise(r => c.toBlob(r, 'image/png'))
    const f = new File([blob], 'colle.png', { type: 'image/png' })
    const dt = new DataTransfer(); dt.items.add(f)
    const ev = new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true })
    document.body.dispatchEvent(ev)
    const dt2 = new DataTransfer(); dt2.items.add(f)
    const cible = document.elementFromPoint(640, 400)
    const dessus = new DragEvent('dragover', { dataTransfer: dt2, bubbles: true, cancelable: true })
    cible.dispatchEvent(dessus)
    const lache = new DragEvent('drop', { dataTransfer: dt2, bubbles: true, cancelable: true })
    cible.dispatchEvent(lache)
    await new Promise(r => setTimeout(r, 300))
    return { dragover: dessus.defaultPrevented, drop: lache.defaultPrevented, images: window.__app.tableau.doc.getMap('images').size }
  })
  await page.waitForTimeout(300)
  const docApres = await page.evaluate(ETAT)
  const app2 = await page.evaluate(() => ({ outil: window.__app.outil, selection: [...window.__app.selection], tri: window.__app.forme('triangle')?.x }))
  verifier('Crayon, stylet, doigt, souris, clic droit, double-clic : rien d\'écrit', docAvant.sv === docApres.sv && docAvant.pages === docApres.pages && docAvant.film === docApres.film)
  verifier('Ctrl+Z, Ctrl+Y, Suppr, P, H, E… : sans effet sur le document ni sur l\'outil', app2.outil === 'selection' && app2.selection.length === 1 && app2.tri === 160, JSON.stringify(app2))
  verifier('Coller une image, lâcher un fichier : rien d\'importé, le navigateur n\'ouvre pas le fichier', coller.drop && coller.dragover && coller.images === 1, JSON.stringify(coller))

  // ---------- Espace depuis l'affiche ----------
  await page.evaluate(() => window.__revue.aller(window.__revue.bande.images.length - 1))
  const t0 = Date.now()
  await page.keyboard.press(' ')
  await page.waitForFunction(() => window.__revue.k > 0 && window.__revue.k < window.__revue.bande.images.length - 1, null, { timeout: 2000, polling: 5 }).catch(() => {})
  const delaiPremier = Date.now() - t0
  e = await page.evaluate(REVUE)
  verifier('Espace depuis l\'affiche repart du début et lit à l\'allure Rapide', e.enMarche && e.allure === 2 && e.k < 4, JSON.stringify({ k: e.k, allure: e.allure }))
  verifier('Quelque chose bouge en moins de 150 ms (mesuré depuis le script)', delaiPremier < 200, `${delaiPremier} ms`)
  const ecart = await page.evaluate(async () => {
    const r = window.__revue
    r.pause(false); r.aller(r.bande.images.length - 1)
    const t = performance.now()
    r.basculer()
    while (r.k !== 0 && r.k === r.bande.images.length - 1) await new Promise(q => requestAnimationFrame(q))
    while (r.k === 0) await new Promise(q => requestAnimationFrame(q))
    return performance.now() - t
  })
  verifier('Premier geste visible en moins de 150 ms (mesuré dans la page)', ecart < 150, `${ecart.toFixed(0)} ms`)
  await page.waitForTimeout(1500)
  await page.screenshot({ path: `${DOSSIER}/04-lecture-en-cours.png` })
  await page.keyboard.press('k')
  e = await page.evaluate(REVUE)
  verifier('K met en pause', !e.enMarche)
  await page.keyboard.press('K')
  e = await page.evaluate(REVUE)
  verifier('K relance', e.enMarche)
  await page.mouse.click(640, 380)
  await page.waitForTimeout(50)
  e = await page.evaluate(REVUE)
  verifier('Un appui bref sur la scène met en pause', !e.enMarche)

  // ---------- Fin de partie (séance d'hier, page 2 : deux parties) ----------
  await page.evaluate(() => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length === 2)
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[1] })
  })
  e = await page.evaluate(REVUE)
  verifier('La séance d\'hier, page 2 : deux parties (silence de 4 min)', e.parties.length === 2, JSON.stringify(e.parties))
  await page.keyboard.press('4')
  await page.keyboard.press(' ')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 15000 })
  e = await page.evaluate(REVUE)
  verifier('Avec l\'arrêt aux parties, la lecture s\'arrête sur la dernière image de la partie', e.k === e.parties[0].fin, `k=${e.k} fin=${e.parties[0].fin}`)
  verifier('Bandeau « Fin de « … ». Espace : continuer avec « … ». »', /^Fin de « Page 2 · \d{1,2}\sh\s\d{2} »\. Espace : continuer avec « Page 2 · \d{1,2}\sh\s\d{2} »\.$/.test(e.bandeau), e.bandeau)
  await page.screenshot({ path: `${DOSSIER}/05-fin-de-partie.png` })
  await page.keyboard.press(' ')
  await page.waitForTimeout(100)
  e = await page.evaluate(REVUE)
  verifier('Espace reprend', e.enMarche && e.k >= e.parties[1].debut)
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 15000 })
  e = await page.evaluate(REVUE)
  verifier('En fin de portion : bandeau « Fin. … »', e.k === e.n - 1 && e.bandeau === 'Fin. Espace : revoir depuis le début · Échap : revenir au direct.', e.bandeau)
  await page.keyboard.press('3')

  // ---------- → et ← (la télécommande) ----------
  await page.keyboard.press('Home')
  e = await page.evaluate(REVUE)
  let cible = pasAttendu(e, e.k)
  let traceVue = false
  await page.keyboard.press('ArrowRight')
  for (let i = 0; i < 200; i++) { const s = await page.evaluate(() => ({ m: window.__revue.enMarche, t: !!window.__revue.trace })); traceVue ||= s.t; if (!s.m) break; await dort(10) }
  e = await page.evaluate(REVUE)
  verifier('→ joue exactement un pas, tracé compris, puis s\'arrête', !e.enMarche && e.k === cible && traceVue, `k=${e.k} attendu=${cible} tracé=${traceVue}`)
  cible = pasAttendu(e, pasAttendu(e, e.k))
  await page.keyboard.press('PageDown')
  await dort(20)
  await page.keyboard.press('PageDown')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 8000 })
  e = await page.evaluate(REVUE)
  verifier('Un second appui pendant un pas le termine et joue le suivant (Page↓)', e.k === cible, `k=${e.k} attendu=${cible}`)
  // Depuis la fin d'une partie, → traverse l'ouverture de la suivante
  await page.evaluate(() => { const r = window.__revue; r.aller(r.bande.parties[0].fin) })
  e = await page.evaluate(REVUE)
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 8000 })
  const apres = await page.evaluate(REVUE)
  verifier('Depuis la fin d\'une partie, → traverse l\'ouverture et joue le premier pas de la suivante', apres.k > e.parties[1].debut && apres.geste === true, `k=${apres.k} ouverture=${e.parties[1].debut}`)
  await page.keyboard.press('ArrowLeft')
  e = await page.evaluate(REVUE)
  verifier('← revient à la borne précédente, ouverture de partie comprise, sans animation', e.k === e.parties[1].debut && !e.enMarche && !e.trace && e.geste === false, `k=${e.k}`)
  await page.keyboard.press('PageUp')
  e = await page.evaluate(REVUE)
  verifier('Page↑ recule aussi d\'une borne', e.k === e.parties[0].fin, `k=${e.k}`)

  // ---------- « Supprimer la page » : plus de geste invisible ----------
  // (Adapté après la relecture : les pages 3 et 4 jetées en regardant la page 2
  // ne font plus deux gestes invisibles dans la bande de la page 2.)
  const invis = await page.evaluate(() => {
    const r = window.__revue
    const seance = r.seances.find(x => x.pages.length >= 3) || r.seances[0]
    r.choisirPortion({ genre: 'seance', seance, page: seance.pages[0] })
    const b = r.bande
    let pareilles = 0
    for (let i = 1; i < b.images.length; i++) {
      const a = r.planches.lire(b.images[i - 1]), x = r.planches.lire(b.images[i])
      if (b.images[i].geste && b.images[i].p === b.images[i - 1].p && a.fond === x.fond && a.formes.length === x.formes.length && a.formes.every((f, q) => f === x.formes[q])) pareilles++
    }
    return { pareilles, n: b.images.length, total: b.total }
  })
  verifier('Les pages jetées en regardant la page 2 ne sont plus des gestes invisibles de sa bande', invis.pareilles === 0, JSON.stringify(invis))

  // ---------- Maj+→ : un geste visible, en sautant les étapes invisibles ----------
  // (Adapté : les étapes invisibles viennent ici de deux Ctrl+Z, faits en regardant
  // la page 2, qui retirent des traits de la page 1.)
  {
    const ctxI = await navigateur.newContext({ viewport: { width: 1280, height: 800 } })
    const pi = await ctxI.newPage()
    surveiller(pi, 'invisibles')
    await pi.goto(URL0)
    await pi.waitForFunction(() => window.__app && window.__revue && window.__app.page)
    await pi.evaluate(async () => {
      const app = window.__app, t = app.tableau, pause = ms => new Promise(r => setTimeout(r, ms))
      let n = 0
      const trait = (x, y) => ({ id: 'iv' + n++, type: 'trait', x, y, z: Date.now() + n, auteur: t.moi, pts: Array.from({ length: 16 }, (_, i) => [i * 14, Math.sin(i / 2) * 12, 0.5]).flat(), couleur: '#1b2230', taille: 4.5, opacite: 1, pression: false })
      const a = app.page
      for (let i = 0; i < 2; i++) { t.nouveauGeste(); t.poser(a, trait(100, 100 + i * 60)); await pause(300) }
      app.nouvellePage(); await pause(300)
      const b = app.page
      // Un geste sur la page 2 que Ctrl+Z ne reprend pas, puis deux Ctrl+Z (sur la page 1)
      // (Adapté au lot 2 : chaque page a sa pile, Ctrl+Z ne touche plus une autre
      // page ; on prend la pile de la page 1 en regardant la page 2, comme le
      // faisait l'ancien Ctrl+Z, pour les tableaux d'avant qui en ont.)
      const f = trait(400, 100)
      t.doc.transact(() => t.formesDe(b).set(f.id, f)); await pause(300)
      t.annulationDe(a).undo(); await pause(300)
      t.annulationDe(a).undo(); await pause(300)
      for (let i = 0; i < 2; i++) { t.nouveauGeste(); t.poser(b, trait(400, 200 + i * 60)); await pause(300) }
    })
    await pi.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
    await pi.waitForTimeout(200)
    const sauts = await pi.evaluate(() => {
      const r = window.__revue, b = r.bande
      // L'image juste avant les deux gestes invisibles
      let j = -1
      for (let i = 1; i + 2 < b.images.length; i++) {
        const a = r.planches.lire(b.images[i]), x = r.planches.lire(b.images[i + 1]), y = r.planches.lire(b.images[i + 2])
        if (a.formes.length === x.formes.length && x.formes.length === y.formes.length && a.formes.every((f, q) => f === x.formes[q] && f === y.formes[q])) { j = i; break }
      }
      r.aller(j)
      return { j, n: b.images.length }
    })
    await pi.keyboard.press('Shift+ArrowRight')
    let ei = await pi.evaluate(REVUE)
    verifier('Maj+→ avance d\'un geste visible en sautant les étapes invisibles', sauts.j > 0 && ei.k === sauts.j + 3, `départ=${sauts.j} arrivée=${ei.k}`)
    await pi.keyboard.press('Shift+ArrowLeft')
    ei = await pi.evaluate(REVUE)
    const pareil = await pi.evaluate(j => { const r = window.__revue, b = r.bande; const a = r.planches.lire(b.images[j]), x = r.planches.lire(b.images[r.k]); return a.formes.length === x.formes.length && a.formes.every((f, i) => f === x.formes[i]) }, sauts.j)
    verifier('Maj+← recule d\'un geste visible (l\'image d\'avant ce geste)', ei.k === sauts.j + 2 && pareil, `k=${ei.k}`)
    await ctxI.close()
  }

  // ---------- [ et ], Origine, Fin, AltGr, allures ----------
  await page.evaluate(() => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: null })
  })
  e = await page.evaluate(REVUE)
  verifier('Séance d\'aujourd\'hui entière : trois parties (page 2, page jetée avec son détour, page 2)', e.parties.length === 3, e.parties.map(p => p.titre).join(' | '))
  await page.keyboard.press('Home')
  await page.keyboard.press(']')
  e = await page.evaluate(REVUE)
  const p1 = e.parties[1]
  verifier('] va au début de la partie suivante, sur sa page, avant son premier geste', e.k === p1.debut && e.geste === false && e.page === p1.page, `k=${e.k}`)
  await page.evaluate(() => window.__revue.aller(window.__revue.k + 3))
  await page.keyboard.press('[')
  e = await page.evaluate(REVUE)
  verifier('Au milieu d\'une partie, [ revient à son début', e.k === p1.debut, `k=${e.k}`)
  await page.keyboard.press('[')
  e = await page.evaluate(REVUE)
  verifier('[ au début d\'une partie va à la précédente', e.k === 0, `k=${e.k}`)
  await page.keyboard.press('End')
  e = await page.evaluate(REVUE)
  const fin = e.k === e.n - 1
  await page.keyboard.press('Home')
  e = await page.evaluate(REVUE)
  verifier('Fin et Origine vont aux deux bouts', fin && e.k === 0)
  const altgr = await page.evaluate(() => {
    const r = window.__revue
    const frappe = (key, code) => { const ev = new KeyboardEvent('keydown', { key, code, ctrlKey: true, altKey: true, bubbles: true, cancelable: true }); document.body.dispatchEvent(ev); return ev.defaultPrevented }
    const a = frappe(']', 'Minus'); const k1 = r.k
    const b = frappe('[', 'Digit5'); const k2 = r.k
    return { a, b, k1, k2, debut: r.bande.parties[1].debut }
  })
  verifier('[ et ] marchent aussi en AZERTY via AltGr (Ctrl+Alt)', altgr.a && altgr.b && altgr.k1 === altgr.debut && altgr.k2 === 0, JSON.stringify(altgr))
  const allures = []
  for (const k of ['1', '2', '3', '4']) { await page.keyboard.press(k); allures.push((await page.evaluate(REVUE)).allure) }
  const azerty = await page.evaluate(() => {
    const ev = new KeyboardEvent('keydown', { key: '&', code: 'Digit1', bubbles: true, cancelable: true }); document.body.dispatchEvent(ev)
    return window.__revue.allure
  })
  await page.keyboard.press('+'); const plus = (await page.evaluate(REVUE)).allure
  await page.keyboard.press('-'); const moins = (await page.evaluate(REVUE)).allure
  verifier('1 à 4 (par la place de la touche, même en AZERTY), − et + changent l\'allure', allures.join() === '0,1,2,3' && azerty === 0 && plus === 1 && moins === 0, `${allures} azerty=${azerty} +=${plus} −=${moins}`)
  // Lot 1, passe A (changement voulu) : F5, qu'envoient les télécommandes, ne
  // recharge plus la page en plein cours, revue comprise ; Ctrl+± ne zoome plus
  // la page du navigateur, et dans la revue ne fait rien (ni allure, ni tableau).
  // F11 (plein écran) reste au navigateur.
  const nav = await page.evaluate(() => {
    const essai = init => { const ev = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }); document.body.dispatchEvent(ev); return ev.defaultPrevented }
    const z0 = window.__app.cam.z
    return { f5: essai({ key: 'F5', code: 'F5' }), f11: essai({ key: 'F11', code: 'F11' }), ctrlPlus: essai({ key: '+', code: 'Equal', ctrlKey: true }), ctrlMoins: essai({ key: '-', code: 'Minus', ctrlKey: true }), allure: window.__revue.allure, tableau: window.__app.cam.z === z0 }
  })
  verifier('F5 et Ctrl+± bloqués dans la revue, sans effet ; F11 reste au navigateur', nav.f5 && !nav.f11 && nav.ctrlPlus && nav.ctrlMoins && nav.allure === 0 && nav.tableau, JSON.stringify(nav))

  // ---------- L'allure : tout de suite, sans perdre la place ; l'écart suit le facteur ----------
  const mesures = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: null })
    const b = r.bande
    // Les quatre traits à environ 1,2 s d'intervalle, vers la fin de la séance
    let j = -1
    const pres = v => v > 1150 && v < 1300
    for (let i = b.images.length - 4; i > 2; i--) if (pres(b.attentes[i]) && pres(b.attentes[i + 1]) && pres(b.attentes[i + 2])) { j = i - 1; break }
    const ecarts = {}
    for (const allure of [0, 1, 2, 3]) {
      r.choisirAllure(allure)
      r.aller(j)
      r.lire()
      const vus = []
      let k = r.k
      while (vus.length < 3) {
        await new Promise(q => requestAnimationFrame(q))
        if (r.k !== k) { vus.push([r.k, performance.now()]); k = r.k }
        if (!r.enMarche) break
      }
      r.pause(false)
      ecarts[allure] = vus.length >= 3 && vus[2][0] === vus[1][0] + 1 ? { mesure: vus[2][1] - vus[1][1], attendu: r.ech[vus[2][0]] - r.ech[vus[1][0]] } : { mesure: -1, attendu: 0 }
    }
    // Changer d'allure en pleine attente : la place est gardée, la suite arrive vite
    r.choisirAllure(0); r.aller(j); r.lire()
    await new Promise(q => setTimeout(q, 300))
    const kAvant = r.k
    r.choisirAllure(3)
    const kJuste = r.k
    const t = performance.now()
    while (r.k === kJuste && performance.now() - t < 3000) await new Promise(q => requestAnimationFrame(q))
    const delai = performance.now() - t
    r.pause(false)
    return { j, ecarts, kAvant, kJuste, delai }
  })
  const facteurs = [0.5, 1, 3, 10]
  const base = mesures.ecarts[1].attendu
  const bons = Object.entries(mesures.ecarts).every(([a, v]) => Math.abs(v.mesure - v.attendu) <= Math.max(40, v.attendu * 0.12) && Math.abs(v.attendu - base / facteurs[a]) < 1)
  verifier('L\'écart mesuré entre deux images suit le facteur (0,5 / 1 / 3 / 10)', bons && base > 1100, Object.entries(mesures.ecarts).map(([a, v]) => `×${facteurs[a]} : ${v.attendu.toFixed(0)}→${v.mesure.toFixed(0)}`).join(' ; '))
  verifier('Le changement d\'allure s\'applique tout de suite, sans perdre la place', mesures.kAvant === mesures.kJuste && mesures.delai < 250, `k ${mesures.kAvant}=${mesures.kJuste}, suite en ${mesures.delai.toFixed(0)} ms`)
  await page.keyboard.press('3')

  // ---------- Le tracé progressif ----------
  const traces = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length === 2)
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[1] })
    r.choisirAllure(1)
    const b = r.bande
    const vus = {}
    const plafonds = []
    r.aller(0); r.lire()
    const t = performance.now()
    while ((r.k < b.parties[0].fin || r.trace) && performance.now() - t < 20000) {
      await new Promise(q => requestAnimationFrame(q))
      if (r.trace && r.enMarche && r.k + 1 < b.images.length) plafonds.push(r.trace.duree <= 0.85 * (r.ech[r.k + 1] - r.ech[r.k]) + 0.01)
      for (const f of r.rendu.formes) {
        if (!r.trace || !r.trace.ids.has(f.id)) continue
        const v = vus[f.id] ??= { type: f.type, etats: [] }
        if (f.type === 'polygone') { let l = 0; for (let i = 2; i + 1 < f.pts.length; i += 2) l += Math.hypot(f.pts[i] - f.pts[i - 2], f.pts[i + 1] - f.pts[i - 1]); v.etats.push({ n: f.pts.length, l, sommets: f.sommets, codage: !!f.codage, ferme: f.ferme, fond: f.fond ?? null, prolonge: f.prolonge ?? null }) }
        if (f.type === 'cercle') v.etats.push({ balayage: Math.abs(f.arc.a1 - f.arc.a0) })
        if (f.type === 'trait') v.etats.push({ n: f.pts.length })
      }
    }
    r.pause(false)
    return { vus: Object.values(vus), plafonds: plafonds.every(Boolean), n: plafonds.length }
  })
  const poly = traces.vus.filter(v => v.type === 'polygone')
  const cercles = traces.vus.filter(v => v.type === 'cercle')
  const croissant = (l, f) => l.length >= 2 && l.every((x, i) => !i || f(x) >= f(l[i - 1])) && f(l[l.length - 1]) > f(l[0])
  verifier('Un segment s\'allonge, un polygone se construit côté par côté sans noms ni codage', poly.length >= 3 && poly.every(p => croissant(p.etats, s => s.l)) && poly.some(p => croissant(p.etats, s => s.n)) && poly.every(p => p.etats.every(s => s.sommets === false && !s.codage && s.ferme === false && s.fond === null && s.prolonge === null)), JSON.stringify(poly.map(p => p.etats.map(s => s.n + ':' + s.l.toFixed(0)))))
  verifier('Un cercle s\'ouvre comme au compas', cercles.length >= 2 && cercles.every(c => croissant(c.etats, s => s.balayage)), JSON.stringify(cercles.map(c => c.etats.map(s => s.balayage.toFixed(2)))))
  verifier('Le tracé finit toujours avant le geste suivant', traces.plafonds && traces.n > 0, `${traces.n} images mesurées`)
  const traitTrace = await page.evaluate(async () => {
    const r = window.__revue
    const b = r.bande
    const j = b.images.findIndex((img, i) => i > b.parties[1].debut + 1 && img.geste)
    r.aller(j - 1)
    r.geste(1)
    const longueurs = []
    while (r.trace) { const f = r.rendu.formes.find(x => r.trace?.ids.has(x.id)); if (f) longueurs.push(f.pts.length); await new Promise(q => requestAnimationFrame(q)) }
    return longueurs
  })
  verifier('Un trait se dessine le long de sa longueur', traitTrace.length >= 3 && traitTrace[traitTrace.length - 1] > traitTrace[0], traitTrace.join(','))
  const coup = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[0] })
    const b = r.bande
    const res = []
    for (let i = 1; i < b.images.length; i++) {
      const avant = r.planches.lire(b.images[i - 1]), apres = r.planches.lire(b.images[i])
      const neuves = apres.formes.filter(f => !avant.formes.some(g => g.id === f.id))
      if (neuves.length === 1 && (neuves[0].type === 'formule' || neuves[0].type === 'image')) {
        r.aller(i - 1); r.geste(1)
        res.push({ type: neuves[0].type, trace: !!r.trace, k: r.k === i })
      }
    }
    return res
  })
  verifier('Formules et images apparaissent d\'un coup', coup.length === 2 && coup.every(c => !c.trace && c.k), JSON.stringify(coup))

  // ---------- La frise ----------
  const frise = await page.evaluate(() => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: null })
    const el = document.querySelector('.revue-frise').getBoundingClientRect()
    // Compter les lectures d'instantané, image d'écran par image d'écran
    window.__lectures = []
    window.__trame = 0
    const compter = () => { window.__trame++; window.__compteur = requestAnimationFrame(compter) }
    compter()
    const t = window.__app.tableau, o = t.pageA.bind(t)
    window.__pageA = o
    t.pageA = (...a) => { window.__lectures.push(window.__trame); return o(...a) }
    window.__longues = []
    window.__obs = new PerformanceObserver(l => { for (const x of l.getEntries()) window.__longues.push(x.duration) })
    window.__obs.observe({ type: 'longtask', buffered: false })
    r.planches.vider()
    return { x: el.left, y: el.top, l: el.width, h: el.height, n: r.bande.images.length }
  })
  await page.mouse.move(frise.x + 4, frise.y + frise.h / 2)
  await page.mouse.down()
  for (let i = 1; i <= 40; i++) { await page.mouse.move(frise.x + 4 + (frise.l - 8) * i / 40, frise.y + frise.h / 2); await dort(16) }
  await page.mouse.move(frise.x + frise.l * 0.6, frise.y + frise.h / 2, { steps: 10 })
  await page.waitForTimeout(50)
  const pendant = await page.evaluate(() => ({ traits: window.__revue.rendu.formes.filter(f => f.type === 'trait').length, formes: window.__revue.rendu.formes.length }))
  await page.mouse.up()
  await page.waitForTimeout(150)
  const apresLacher = await page.evaluate(() => window.__revue.rendu.formes.filter(f => f.type === 'trait').length)
  verifier('Pendant le glissé, les traits sont de simples lignes ; au lâcher, ils reprennent leur forme', pendant.traits === 0 && pendant.formes > 0 && apresLacher > 0, `${JSON.stringify(pendant)} → ${apresLacher} traits`)
  const glisse = await page.evaluate(() => {
    cancelAnimationFrame(window.__compteur)
    window.__obs.disconnect()
    window.__app.tableau.pageA = window.__pageA
    const par = {}
    for (const t of window.__lectures) par[t] = (par[t] || 0) + 1
    return { max: Math.max(0, ...Object.values(par)), lectures: window.__lectures.length, trames: Object.keys(par).length, longues: window.__longues, k: window.__revue.k, n: window.__revue.bande.images.length }
  })
  const attenduK = Math.round(0.6 * (glisse.n - 1))
  verifier('Glisser sur la frise montre l\'image visée', Math.abs(glisse.k - attenduK) <= 2, `k=${glisse.k} visé≈${attenduK}`)
  verifier('Au plus une lecture d\'instantané par image d\'écran pendant le glissé', glisse.max <= 1, `max=${glisse.max} sur ${glisse.trames} trames, ${glisse.lectures} lectures`)
  verifier('Pas de tâche longue (> 50 ms) pendant le glissé', glisse.longues.length === 0, JSON.stringify(glisse.longues))
  e = await page.evaluate(REVUE)
  const p2r = e.parties[2]
  const xPartie = frise.x + frise.l * ((p2r.debut + p2r.fin) / 2) / (e.n - 1)
  await page.mouse.click(xPartie, frise.y + frise.h / 2)
  await page.waitForTimeout(80)
  e = await page.evaluate(REVUE)
  verifier('Un appui sans glisser sur une partie mène à son début', e.k === p2r.debut, `k=${e.k} début=${p2r.debut}`)
  const valuetext = await page.locator('.revue-frise').getAttribute('aria-valuetext')
  verifier('aria-valuetext « Geste 45 sur 84 · Page 3 · partie 2 sur 4 »', /^Geste \d+ sur \d+ · (Page \d+|Page jetée|La page) · partie 3 sur 3$/.test(valuetext), valuetext)
  await page.keyboard.press('4')
  await page.locator('.revue-frise').focus()
  e = await page.evaluate(REVUE)
  cible = pasAttendu(e, e.k)
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => !window.__revue.enMarche, null, { timeout: 8000 })
  e = await page.evaluate(REVUE)
  verifier('Frise focalisée : → fait un pas, comme ailleurs', e.k === cible, `k=${e.k} attendu=${cible}`)

  // ---------- Que revoir ? ----------
  await page.keyboard.press('Home')
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  await page.waitForTimeout(100)
  const tiroir = await page.evaluate(() => {
    const t = document.querySelector('.revue-tiroir')
    return {
      ouvert: !t.hidden,
      sections: [...t.querySelectorAll('h3')].map(h => h.textContent),
      jours: [...t.querySelectorAll('h4')].map(h => h.textContent),
      choix: [...t.querySelectorAll('.revue-choix')].map(b => b.textContent),
      seances: t.querySelectorAll('.revue-seance').length,
      plus: !!t.querySelector('.revue-plus'),
      hauteur: t.getBoundingClientRect().bottom, barre: document.querySelector('.revue-barre').getBoundingClientRect().top,
      haut: t.getBoundingClientRect().top, pastille: document.querySelector('.revue-ou').getBoundingClientRect().bottom,
    }
  })
  verifier('Le tiroir : la page affichée (dernière séance, toute son histoire)', tiroir.sections[0] === 'Page 2' && tiroir.choix[0].startsWith('Sa dernière séance') && tiroir.choix[1].startsWith('Toute son histoire'), tiroir.choix.slice(0, 2).join(' | '))
  verifier('Les séances groupées par jour (Aujourd\'hui, Hier, jour daté), 12 puis « Plus anciennes »', tiroir.jours[0] === 'Aujourd\'hui' && tiroir.jours.includes('Hier') && tiroir.jours.some(j => /^[A-Z][a-zé]+ \d+ [a-zéû]+$/.test(j)) && tiroir.seances === 12 && tiroir.plus, `${tiroir.jours.join(', ')} ; ${tiroir.seances} séances`)
  verifier('Les « Pages jetées »', tiroir.sections.includes('Pages jetées') && tiroir.choix.some(c => /^Page jetéedernière écriture le \d+ \w+ à \d{1,2}\sh\s\d{2} · \d+ gestes?$/.test(c)), tiroir.choix.filter(c => c.startsWith('Page jetée')).join(' | '))
  verifier('Le tiroir tient entre la pastille et la barre', tiroir.hauteur <= tiroir.barre && tiroir.haut >= tiroir.pastille, `${tiroir.pastille} ≤ ${tiroir.haut} … ${tiroir.hauteur} ≤ ${tiroir.barre}`)
  await page.screenshot({ path: `${DOSSIER}/06-que-revoir.png` })
  await page.getByRole('button', { name: 'Plus anciennes' }).click()
  const plusAnciennes = await page.evaluate(() => document.querySelectorAll('.revue-tiroir .revue-seance').length)
  verifier('« Plus anciennes » ajoute des séances', plusAnciennes > 12, `${plusAnciennes}`)
  const nbAvant = await page.evaluate(() => window.__revue.seances.length)
  await page.locator('.revue-tiroir select').selectOption({ label: '2 min' })
  await page.waitForTimeout(50)
  const nbApres = await page.evaluate(() => ({ n: window.__revue.seances.length, lignes: document.querySelectorAll('.revue-tiroir .revue-seance').length, ouvert: !document.querySelector('.revue-tiroir').hidden }))
  verifier('Changer la pause (2 min) recalcule les séances', nbApres.n > nbAvant && nbApres.ouvert, `${nbAvant} → ${nbApres.n}`)
  await page.locator('.revue-tiroir select').selectOption({ label: '20 min' })
  await page.keyboard.press('Escape')
  const apresEchap = await page.evaluate(() => ({ tiroir: !document.querySelector('.revue-tiroir').hidden, revue: window.__revue.ouvert, focus: document.activeElement?.textContent }))
  verifier('Échap ferme le tiroir avant la revue, le focus revient sur « Que revoir ? »', !apresEchap.tiroir && apresEchap.revue && apresEchap.focus === 'Que revoir ?', JSON.stringify(apresEchap))
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  await page.locator('.revue-choix', { hasText: 'Page jetée' }).first().click()
  await page.waitForTimeout(100)
  e = await page.evaluate(REVUE)
  const jetee = await page.evaluate(() => ({ ligne1: document.querySelector('.revue-ou .ligne1').textContent, formes: window.__revue.rendu.formes.length, bandeau: document.querySelector('.revue-bandeau').textContent }))
  verifier('Revoir une page jetée montre son contenu d\'alors sous le nom « Page jetée », sur l\'affiche', e.portion.genre === 'page' && e.k === e.n - 1 && jetee.formes > 0 && jetee.ligne1.startsWith('Page jetée · '), `${jetee.ligne1} ; ${jetee.formes} formes ; ${jetee.bandeau}`)
  await page.screenshot({ path: `${DOSSIER}/07-page-jetee.png` })
  await page.getByRole('button', { name: /^Que revoir/ }).click()
  await page.locator('.revue-choix', { hasText: 'Sa dernière séance' }).click()
  e = await page.evaluate(REVUE)
  verifier('Choisir une ligne ouvre la portion sur son image finale', e.k === e.n - 1 && e.portion.genre === 'seance')

  // ---------- La vue : automatique, libre, et C ----------
  const vue = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: null })
    r.choisirAllure(3)
    r.aller(0); r.lire()
    const b = r.bande
    const changements = []
    let page = b.images[r.k].p
    const t = performance.now()
    while ((r.enMarche || r.k < b.parties[1].fin) && performance.now() - t < 15000) {
      await new Promise(q => requestAnimationFrame(q))
      if (!r.enMarche) r.lire()                            // l'arrêt en fin de partie : on continue
      const p = b.images[r.k].p
      if (p !== page) {
        page = p
        // La page entière tient dans la zone utile ?
        const formes = r.planches.lire(b.images[b.parties[Math.max(0, b.parties.findIndex(x => r.k >= x.debut && r.k <= x.fin))].fin]).formes
        const l = r.scene.clientWidth, h = r.scene.clientHeight - r.barre.offsetHeight - 24
        let ok = true
        for (const f of formes) {
          if (f.type !== 'trait') continue
          const x = f.x * r.cam.z + r.cam.x, y = f.y * r.cam.z + r.cam.y
          if (x < 0 || x > l || y < 60 || y > h) ok = false
        }
        changements.push({ z: r.cam.z, ok, vue: r.vue })
      }
      if (r.k >= b.parties[1].fin) r.pause(false)
    }
    return changements
  })
  verifier('Changement de page en lecture : la nouvelle page est cadrée entière, zoom 2 au plus', vue.length >= 1 && vue.every(c => c.z <= 2 && c.ok && c.vue === 'auto'), JSON.stringify(vue))
  await page.mouse.move(640, 300); await page.mouse.down(); await page.mouse.move(700, 340, { steps: 8 }); await page.mouse.up()
  e = await page.evaluate(REVUE)
  const libre = e.vue
  await page.keyboard.press('Shift+ArrowRight')
  const libre2 = (await page.evaluate(REVUE)).vue
  await page.keyboard.press('c')
  const auto = (await page.evaluate(REVUE)).vue
  verifier('Après un glisser, la vue reste libre jusqu\'à C', libre === 'libre' && libre2 === 'libre' && auto === 'auto', `${libre} ${libre2} ${auto}`)
  const pince = await page.evaluate(() => {
    const s = document.querySelector('.revue-scene')
    const ev = (type, id, x, y) => s.dispatchEvent(new PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: x, clientY: y, bubbles: true, isPrimary: id === 1 }))
    const z0 = window.__revue.cam.z
    ev('pointerdown', 1, 500, 400); ev('pointerdown', 2, 700, 400)
    ev('pointermove', 1, 450, 400); ev('pointermove', 2, 750, 400)
    ev('pointerup', 1, 450, 400); ev('pointerup', 2, 750, 400)
    return { z0, z1: window.__revue.cam.z, vue: window.__revue.vue }
  })
  verifier('Pincer zoome et rend la vue libre', pince.z1 > pince.z0 * 1.3 && pince.vue === 'libre', JSON.stringify(pince))
  await page.keyboard.press('c')
  const horsChamp = await page.evaluate(() => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length >= 3)
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[0] })
    const b = r.bande
    const j = b.images.length - 1                        // le trait écrit loin, en dernier
    r.aller(j - 1)
    r.cadrer(b.images[j - 1].p)
    // Une vue automatique qui ne montre pas l'endroit du prochain geste
    r.cam.x = 0; r.cam.y = 0; r.cam.z = 1
    r.vue = 'auto'
    r.geste(1)
    const f = r.planches.lire(b.images[j]).formes.find(x => x.x === 4200)
    const x = f.x * r.cam.z + r.cam.x, y = f.y * r.cam.z + r.cam.y
    return { x, y, l: r.scene.clientWidth, h: r.scene.clientHeight }
  })
  verifier('Un geste écrit hors champ, en vue automatique, ramène la vue sur lui', horsChamp.x > 0 && horsChamp.x < horsChamp.l && horsChamp.y > 0 && horsChamp.y < horsChamp.h, JSON.stringify(horsChamp))

  // ---------- Le message de l'application, et Publier ----------
  await page.evaluate(() => window.__app.ui.message('Message du tableau, au-dessus de la revue'))
  await page.waitForTimeout(250)
  const toastVu = await page.evaluate(() => {
    const t = document.querySelector('.toast'), r = document.querySelector('.revue')
    return { z: +getComputedStyle(t).zIndex, zr: +getComputedStyle(r).zIndex, visible: t.classList.contains('visible'), inert: t.inert, opacite: getComputedStyle(t).opacity }
  })
  await page.screenshot({ path: `${DOSSIER}/08-message-au-dessus.png` })
  verifier('Le message de l\'application (z 30) reste au-dessus de la revue (z 28)', toastVu.z === 30 && toastVu.zr === 28 && toastVu.visible && !toastVu.inert, JSON.stringify(toastVu))
  await page.evaluate(() => window.__app.ui.publication.ouvrir())
  await page.waitForTimeout(300)
  const publier = await page.evaluate(() => {
    const d = [...document.querySelectorAll('dialog')].find(x => x.open)
    return { ouvert: !!d, modal: d ? d.matches(':modal') : false, dessus: d ? d.contains(document.elementFromPoint(innerWidth / 2, innerHeight / 2)) : false }
  })
  await page.screenshot({ path: `${DOSSIER}/09-publier-au-dessus.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const apresPublier = await page.evaluate(() => ({ dialogue: [...document.querySelectorAll('dialog')].some(x => x.open), revue: window.__revue.ouvert }))
  verifier('La fenêtre Publier (showModal) s\'ouvre au-dessus, Échap la ferme sans fermer la revue', publier.ouvert && publier.modal && publier.dessus && !apresPublier.dialogue && apresPublier.revue, JSON.stringify({ publier, apresPublier }))

  // ---------- Fermeture : tout est comme avant ----------
  await page.keyboard.press('Escape')
  await page.waitForTimeout(200)
  const apresFermer = await page.evaluate(() => {
    const app = window.__app
    return {
      page: app.page, cam: { x: app.cam.x, y: app.cam.y, z: app.cam.z }, selection: [...app.selection], options: app.options, outil: app.outil,
      panneau: !document.querySelector('.panneau-forme').hidden, instruments: [...app.instruments.keys()], formes: app.rendu.formes.length,
      focus: document.activeElement?.getAttribute('aria-label'), enLecture: app.enLecture, revue: window.__revue.ouvert,
      instrumentsCaches: app.rendu.instrumentsCaches, inertes: [...document.querySelectorAll('[inert]')].length,
    }
  })
  const etatApres = await page.evaluate(ETAT)
  const ecritures = await page.evaluate(() => window.__ecritures)
  verifier('À la fermeture (Échap) : même page, même caméra, même sélection, même panneau, mêmes instruments, même outil',
    apresFermer.page === avant.page && JSON.stringify(apresFermer.cam) === JSON.stringify(avant.cam) && JSON.stringify(apresFermer.selection) === JSON.stringify(avant.selection)
    && apresFermer.options === avant.options && apresFermer.panneau === avant.panneau && JSON.stringify(apresFermer.instruments) === JSON.stringify(avant.instruments)
    && apresFermer.outil === avant.outil && !apresFermer.instrumentsCaches && apresFermer.inertes === 0, JSON.stringify(apresFermer))
  verifier('Le focus revient sur le bouton Revoir, le tableau se redessine', apresFermer.focus === 'Revoir la construction : une page, une séance, pas à pas' && apresFermer.formes === avant.formes && !apresFermer.enLecture, `${apresFermer.focus} ; ${apresFermer.formes} formes`)
  verifier('Vecteur d\'état Yjs identique octet pour octet après toute la session', etatApres.sv === etatAvant.sv, etatApres.sv.length + ' octets')
  verifier('Le film et les pages sont inchangés', etatApres.film === etatAvant.film && etatApres.pages === etatAvant.pages, `${etatAvant.film} → ${etatApres.film}`)
  verifier('Rien n\'a été écrit dans localStorage ni dans sessionStorage', ecritures === 0 && etatApres.stockage === etatAvant.stockage, `${ecritures} écritures`)
  await page.screenshot({ path: `${DOSSIER}/10-apres-fermeture.png` })

  // ---------- Revenir à la page, à la souris ; l'allure retenue ----------
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await page.keyboard.press('1')
  await page.getByRole('button', { name: 'Revenir au direct' }).click()
  const parBouton = await page.evaluate(() => ({ revue: window.__revue.ouvert, focus: document.activeElement?.getAttribute('aria-label') }))
  verifier('« Revenir au direct » ferme la revue et rend le focus au bouton Revoir', !parBouton.revue && parBouton.focus === 'Revoir la construction : une page, une séance, pas à pas', JSON.stringify(parBouton))
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  const allureRetenue = await page.evaluate(() => document.querySelector('.revue-allures button[aria-pressed="true"]').textContent)
  verifier('L\'allure retenue survit à une fermeture suivie d\'une réouverture', allureRetenue === 'Lent', allureRetenue)
  await page.keyboard.press('3')

  // ---------- Le programme de construction ----------
  await page.keyboard.press('Escape')
  const etatC = await page.evaluate(ETAT)
  await page.evaluate(() => window.__app.ui.constructeur.ouvrir())
  await page.locator('.panneau-construction textarea').fill('Tracer un segment [AB] de 5 cm.\nPlacer le milieu I de [AB].')
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click({ force: true })
  await page.waitForTimeout(100)
  const panneauFerme = await page.evaluate(() => document.querySelector('.panneau-construction').hidden)
  await page.keyboard.press('Home')
  await page.keyboard.press(' ')
  await page.waitForTimeout(300)
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('PageDown')
  await page.waitForTimeout(800)
  const pilote = await page.evaluate(REVUE)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(100)
  const etatC2 = await page.evaluate(ETAT)
  verifier('Programme de construction ouvert puis Revoir : le panneau se ferme', panneauFerme)
  verifier('Espace, → et Page↓ pilotent la revue, aucune étape de construction, aucune figure posée', pilote.k > 0 && etatC2.sv === etatC.sv && etatC2.pages === etatC.pages, `k=${pilote.k}`)

  // ---------- Fermer en plein tracé, en pleine lecture rapide ; rouvrir ----------
  const canevasAvant = await page.evaluate(() => { window.__revue.rendu.__marque = 'le même'; return document.querySelectorAll('canvas').length })
  const erreursAvant = erreurs.length
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await page.keyboard.press('4')
  await page.keyboard.press(' ')
  await page.waitForTimeout(250)
  const avantFermeture = await page.evaluate(REVUE)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const fermee = await page.evaluate(() => { const r = window.__revue; return { boucle: r.boucle, enMarche: r.enMarche, trace: r.trace, formes: r.rendu.formes.length, bande: !!r.bande, ouvert: r.ouvert, l: r.rendu.scene.width } })
  verifier('Fermer en pleine lecture rapide : boucle arrêtée, rien d\'affiché ensuite', avantFermeture.enMarche && fermee.boucle === 0 && !fermee.enMarche && fermee.trace === null && fermee.formes === 0 && !fermee.bande && !fermee.ouvert, JSON.stringify(fermee))
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await page.keyboard.press('1')
  await page.evaluate(() => { const r = window.__revue; r.aller(r.bande.images.length - 6); r.geste(1) })
  const enTrace = await page.evaluate(() => !!window.__revue.trace)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
  const fermee2 = await page.evaluate(() => { const r = window.__revue; return { boucle: r.boucle, trace: r.trace, formes: r.rendu.formes.length } })
  verifier('Fermer en plein tracé : aucune boucle ne reste, rien ne s\'affiche', enTrace && fermee2.boucle === 0 && fermee2.trace === null && fermee2.formes === 0, `tracé=${enTrace} ${JSON.stringify(fermee2)}`)
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  await page.waitForTimeout(150)
  const rouvert = await page.evaluate(() => ({ ouvert: window.__revue.ouvert, marque: window.__revue.rendu.__marque, canevas: document.querySelectorAll('canvas').length, formes: window.__revue.rendu.formes.length }))
  verifier('Rouvrir marche, avec le même Rendu et sans nouveaux canevas', rouvert.ouvert && rouvert.marque === 'le même' && rouvert.canevas === canevasAvant && rouvert.formes > 0, JSON.stringify({ ...rouvert, canevasAvant }))
  verifier('Aucune erreur dans la console pendant ces fermetures', erreurs.length === erreursAvant, erreurs.slice(erreursAvant).join(' | '))

  // ---------- Onglet caché 10 s pendant la lecture ----------
  await page.keyboard.press('1')
  await page.keyboard.press(' ')
  await page.waitForTimeout(500)
  // Chromium sans écran ne cache jamais un onglet : on reproduit ce que fait le
  // navigateur pour un onglet caché, qui ne donne plus aucune image d'écran
  const kGel = (await page.evaluate(() => {
    window.__vraiRAF = window.requestAnimationFrame.bind(window)
    window.__enAttente = []
    window.requestAnimationFrame = cb => { window.__enAttente.push(cb); return 1e6 + window.__enAttente.length }
    return window.__revue.k
  }))
  await dort(10_000)
  const kDegel = await page.evaluate(async () => {
    window.requestAnimationFrame = window.__vraiRAF
    const t = performance.now()
    for (const cb of window.__enAttente.splice(0)) cb(t)
    await new Promise(q => setTimeout(q, 60))
    return window.__revue.k
  })
  await page.waitForTimeout(400)
  const kSuite = (await page.evaluate(REVUE))
  verifier('Onglet caché 10 s : la lecture reprend là où elle était, sans rafale', kDegel - kGel <= 2 && kSuite.enMarche, `avant=${kGel} au retour=${kDegel}`)
  await page.keyboard.press(' ')

  // ---------- Une portion d'un seul geste ----------
  const seul = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances[0]
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[0] })
    const b = r.bande
    const res = { n: b.images.length, total: b.total, parties: b.parties.length }
    r.lire()
    const t = performance.now()
    while (r.enMarche && performance.now() - t < 3000) await new Promise(q => requestAnimationFrame(q))
    res.finLecture = r.k
    r.agir('debut'); res.debut = r.k
    r.agir('pasSuivant')
    while (r.enMarche) await new Promise(q => requestAnimationFrame(q))
    res.pas = r.k
    r.agir('pasPrecedent'); res.retour = r.k
    r.agir('fin'); res.fin = r.k
    r.agir('partieSuivante'); r.agir('partiePrecedente'); r.agir('gesteSuivant'); r.agir('gestePrecedent')
    const f = document.querySelector('.revue-frise')
    res.style = document.querySelector('.revue-rempli').style.width + ' ' + document.querySelector('.revue-tete').style.left
    res.valuetext = f.getAttribute('aria-valuetext')
    res.compteur = document.querySelector('.revue-compteur').textContent + ' ' + document.querySelector('.revue-compteur').title
    return res
  })
  verifier('Une portion d\'un seul geste : deux positions, lecture, pas, Origine/Fin, aucune division par zéro',
    seul.n === 2 && seul.total === 1 && seul.finLecture === 1 && seul.debut === 0 && seul.pas === 1 && seul.retour === 0 && seul.fin === 1 && !/NaN|Infinity/.test(JSON.stringify(seul)), JSON.stringify(seul))

  // ---------- Mise en page à 1024 × 768 ----------
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.evaluate(() => { const r = window.__revue; const s = r.seances.find(x => x.pages.length >= 3); r.choisirPortion({ genre: 'seance', seance: s, page: null }); r.fermerBandeau() })
  await page.waitForTimeout(200)
  const mise = await page.evaluate(() => {
    const barre = document.querySelector('.revue-barre').getBoundingClientRect()
    const boutons = [...document.querySelectorAll('.revue-barre button')].map(b => b.getBoundingClientRect())
    const lire = document.querySelector('.revue .b-lire').getBoundingClientRect()
    const rangees = new Set([...document.querySelectorAll('.revue-rangee > *')].map(x => Math.round(x.getBoundingClientRect().top / 20)))
    return {
      defilement: document.documentElement.scrollWidth > innerWidth || document.querySelector('.revue-barre').scrollWidth > document.querySelector('.revue-barre').clientWidth,
      hauteur: barre.height, minBouton: Math.min(...boutons.map(b => Math.min(b.width, b.height))), lire: Math.min(lire.width, lire.height),
      frise: document.querySelector('.revue-frise').getBoundingClientRect().height,
      pastille: parseFloat(getComputedStyle(document.querySelector('.revue-ou .ligne1')).fontSize),
      dedans: boutons.every(b => b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight),
      rangees: rangees.size,
    }
  })
  await page.screenshot({ path: `${DOSSIER}/11-revue-1024x768.png` })
  verifier('1024 × 768 : pas de défilement horizontal, barre sur deux rangées d\'environ 140 px', !mise.defilement && mise.hauteur >= 120 && mise.hauteur <= 160 && mise.rangees === 1, JSON.stringify(mise))
  verifier('Boutons d\'au moins 48 px, Lire d\'au moins 56 px, frise de 44 px, pastille d\'au moins 16 px', mise.minBouton >= 48 && mise.lire >= 56 && mise.frise === 44 && mise.pastille >= 16, JSON.stringify(mise))
  await page.setViewportSize({ width: 640, height: 760 })
  await page.waitForTimeout(200)
  const etroit = await page.evaluate(() => {
    const boutons = [...document.querySelectorAll('.revue-barre button, .revue-frise')].map(b => b.getBoundingClientRect())
    const barre = document.querySelector('.revue-barre')
    return {
      dedans: boutons.every(b => b.width > 0 && b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight),
      defilement: document.documentElement.scrollWidth > innerWidth || barre.scrollWidth > barre.clientWidth,
      hauteur: barre.getBoundingClientRect().height,
      chevauchent: boutons.some((a, i) => boutons.some((b, j) => i < j && a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1)),
    }
  })
  await page.screenshot({ path: `${DOSSIER}/12-revue-640-etroit.png` })
  verifier('Fenêtre étroite : les commandes passent à la ligne sans rien masquer', etroit.dedans && !etroit.defilement && !etroit.chevauchent, JSON.stringify(etroit))
  await page.setViewportSize({ width: 1280, height: 800 })
  await page.keyboard.press('Escape')

  // ---------- Mouvement réduit ----------
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  const reduit = await page.evaluate(async () => {
    const r = window.__revue
    const s = r.seances.find(x => x.pages.length === 2)
    r.choisirPortion({ genre: 'seance', seance: s, page: s.pages[1] })
    r.choisirAllure(1)
    r.aller(0); r.lire()
    let trace = false, repos = false
    const t = performance.now()
    while (performance.now() - t < 4000) {
      await new Promise(q => requestAnimationFrame(q))
      trace ||= !!r.trace
      repos ||= r.el.classList.contains('repos')
    }
    r.pause(false)
    return { trace, repos, k: r.k, transition: getComputedStyle(document.querySelector('.revue-barre')).transitionDuration }
  })
  verifier('Avec prefers-reduced-motion : aucun tracé, la barre ne s\'estompe pas', !reduit.trace && !reduit.repos && reduit.k > 2, JSON.stringify(reduit))
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  const repos = await page.evaluate(async () => {
    const r = window.__revue
    r.aller(0); r.choisirAllure(0); r.lire()
    await new Promise(q => setTimeout(q, 3400))
    const estompee = r.el.classList.contains('repos')
    r.el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }))
    const reveillee = !r.el.classList.contains('repos')
    r.pause(false)
    return { estompee, reveillee }
  })
  verifier('Pendant la lecture, la barre s\'estompe après 3 s et revient au moindre mouvement', repos.estompee && repos.reveillee, JSON.stringify(repos))
  await page.keyboard.press('Escape')

  // ---------- Après un rechargement, l'allure repart de Rapide ----------
  await page.reload()
  await page.waitForFunction(() => window.__app && window.__revue && window.__app.page && window.__app.tableau.film.length > 10)
  // (Adapté au lot 6 : rechargé plus d'une heure après la dernière séance, la
  // fenêtre d'accueil s'ouvre ; Échap la ferme)
  await page.waitForTimeout(300)
  if (await page.evaluate(() => !!document.querySelector('dialog.dialogue-accueil[open]'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(200) }
  await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
  const apresRechargement = await page.evaluate(() => document.querySelector('.revue-allures button[aria-pressed="true"]').textContent)
  verifier('Après un rechargement, l\'allure repart de « Rapide »', apresRechargement === 'Rapide', apresRechargement)
  await page.keyboard.press('Escape')
  await ctx.close()
}

// =============================================================
// 3. Un très long film : 20 000 étapes
// =============================================================
if (!SEULEMENT || SEULEMENT === 'perf') {
  const ctx = await navigateur.newContext({ viewport: { width: 1280, height: 800 } })
  await ctx.addInitScript(HORLOGE, -6 * 3600_000)
  const page = await ctx.newPage(); surveiller(page, 'perf')
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__revue && window.__app.page)
  const fabrique = await page.evaluate(async () => {
    const app = window.__app, t = app.tableau
    const t0 = performance.now()
    // Le tableau ne se relit pas pendant qu'on fabrique (on le relira à la fin)
    app.enLecture = true
    const pagesIds = [app.page]
    for (let i = 0; i < 3; i++) pagesIds.push(t.ajouterPage('carreaux', i + 1))
    // Des semaines de classe : chaque heure de cours (250 gestes) a sa page,
    // effacée à l'arrivée de la classe, et l'on gomme un peu en chemin
    let n = 0
    for (let i = 0; i < 20_000; i++) {
      const p = pagesIds[Math.floor(i / 250) % 4]
      t.pageVue = p
      const formes = t.formesDe(p)
      if (i % 250 === 0) t.supprimer(p, [...formes.keys()])
      else if (i % 40 === 39) t.supprimer(p, [...formes.keys()].slice(0, 10))
      else t.poser(p, { id: 'g' + n, type: 'trait', x: (n * 37) % 900, y: (n * 53) % 600, z: n, auteur: t.moi, pts: [0, 0, 0.5, 20, 10, 0.5, 40, 0, 0.5, 60, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
      n++
      window.__decalage += 900
      if (i % 500 === 499) await new Promise(r => setTimeout(r, 0))
    }
    await new Promise(r => setTimeout(r, 50))
    window.__decalage = 0
    app.enLecture = false
    app.allerPage(pagesIds[0]); app.rafraichir()
    return { film: t.film.length, ms: performance.now() - t0 }
  })
  verifier('Film synthétique fabriqué', fabrique.film >= 20_000, `${fabrique.film} étapes en ${(fabrique.ms / 1000).toFixed(1)} s`)
  const ouverture = await page.evaluate(() => {
    const t0 = performance.now()
    window.__revue.ouvrir(document.querySelector('[aria-label^="Revoir la construction"]'))
    const ms = performance.now() - t0
    return { ms, n: window.__revue.bande.images.length, parties: window.__revue.bande.parties.length }
  })
  verifier('20 000 étapes : l\'ouverture prend moins de 300 ms', ouverture.ms < 300, `${ouverture.ms.toFixed(0)} ms, ${ouverture.n} images, ${ouverture.parties} parties`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: `${DOSSIER}/13-film-20000.png` })
  // La séance entière, puis glisser sur la frise
  await page.evaluate(() => { const r = window.__revue; r.choisirPortion({ genre: 'seance', seance: r.seances[0], page: null }) })
  // Le tableau finit d'enregistrer ses 20 000 étapes dans le navigateur (y-indexeddb) avant la
  // mesure : on attend que la page ait passé quatre secondes sans aucune tâche longue
  const calme = await page.evaluate(async () => {
    const vues = []
    const obs = new PerformanceObserver(l => { for (const x of l.getEntries()) vues.push([Math.round(x.startTime), Math.round(x.duration)]) })
    obs.observe({ type: 'longtask' })
    const t0 = performance.now()
    while (performance.now() - t0 < 30_000) {
      await new Promise(q => setTimeout(q, 250))
      const derniere = vues.length ? vues[vues.length - 1][0] : t0
      if (performance.now() - derniere > 4000) break
    }
    obs.disconnect()
    return { attente: Math.round(performance.now() - t0), taches: vues.length, pire: Math.max(0, ...vues.map(v => v[1])) }
  })
  console.log('      (sans la revue, en attendant le calme :', JSON.stringify(calme), ')')
  const frise = await page.evaluate(() => {
    // Le temps que prend la revue elle-même pour chaque image visée, et chaque peinture
    const r = window.__revue, aller = r.aller.bind(r), rd = r.rendu, peindre = rd.peindre.bind(rd)
    window.__allers = []; window.__peintures = []
    r.aller = (...a) => { const t = performance.now(); aller(...a); window.__allers.push(performance.now() - t) }
    rd.peindre = () => { const t = performance.now(); peindre(); window.__peintures.push(performance.now() - t) }
    window.__longues = []
    window.__obs = new PerformanceObserver(l => { for (const x of l.getEntries()) window.__longues.push(x.duration) })
    window.__obs.observe({ type: 'longtask' })
    const el = document.querySelector('.revue-frise').getBoundingClientRect()
    return { x: el.left, y: el.top + el.height / 2, l: el.width }
  })
  await page.mouse.move(frise.x + 5, frise.y); await page.mouse.down()
  for (let i = 1; i <= 60; i++) { await page.mouse.move(frise.x + 5 + (frise.l - 10) * i / 60, frise.y); await dort(16) }
  await page.waitForTimeout(100)
  const glisse = await page.evaluate(() => ({ longues: window.__longues.splice(0), k: window.__revue.k, revue: Math.max(...window.__allers.splice(0)).toFixed(1) + ' ms au plus par image visée', peinture: Math.max(...window.__peintures.splice(0)).toFixed(1) + ' ms au plus par peinture' }))
  await page.mouse.up()
  await page.waitForTimeout(300)
  const lacher = await page.evaluate(() => window.__longues.splice(0))
  verifier('20 000 étapes : le glissé sur la frise reste fluide (aucune tâche > 50 ms pendant le glissé)', glisse.longues.length === 0, JSON.stringify(glisse))
  verifier('20 000 étapes : au lâcher, la page reprend sa vraie forme en une image (moins de 300 ms)', lacher.every(d => d < 300), JSON.stringify(lacher))
  const tresRapide = await page.evaluate(async () => {
    const r = window.__revue
    window.__longues = []
    r.aller(0); r.choisirAllure(3); r.lire()
    const gaps = []
    let t = performance.now()
    const t0 = t
    while (performance.now() - t0 < 3000) { await new Promise(q => requestAnimationFrame(q)); const m = performance.now(); gaps.push(m - t); t = m }
    r.pause(false)
    window.__obs.disconnect()
    gaps.sort((a, b) => b - a)
    return { k: r.k, pire: gaps[0], p95: gaps[Math.floor(gaps.length * 0.05)], longues: window.__longues }
  })
  verifier('20 000 étapes : la lecture Très rapide ne gèle pas l\'onglet', tresRapide.pire < 100 && tresRapide.k >= 20 && tresRapide.longues.length === 0, JSON.stringify(tresRapide))
  await ctx.close()
}

// =============================================================
// 4. Le lecteur des élèves
// =============================================================
if (!SEULEMENT || SEULEMENT === 'eleves') {
  const ctx = await navigateur.newContext({ viewport: { width: 1100, height: 800 } })
  await ctx.addInitScript(HORLOGE, -3 * 3600_000)
  const tab = await ctx.newPage(); surveiller(tab, 'tableau')
  await tab.goto(URL0)
  await tab.waitForFunction(() => window.__app && window.__app.page)
  const ids = await tab.evaluate(HISTOIRE)
  const fichier = await tab.evaluate(async ids => {
    const { exporter, seancesDuFilm } = await import('/src/revoir/exporter.ts')
    const { ecrireFilm } = await import('/src/revoir/format.ts')
    const t = window.__app.tableau
    const s = seancesDuFilm(t.film.toArray()).find(x => x.pages.length < 3 && x.gestes > 10)
    const film = exporter(t, { de: s.de, a: s.a, pages: [ids.p1, ids.p2], titre: 'Essai' })
    return ecrireFilm(film)
  }, ids)
  for (const [suffixe, nom] of [['', 'affiche'], ['?c=2', 'chapitre'], ['?continu=1', 'continu']]) {
    const page = await ctx.newPage(); surveiller(page, 'revoir' + suffixe)
    await page.goto(URL0 + 'revoir.html' + suffixe)
    await page.locator('input[type=file]').setInputFiles({ name: 'seance.mem', mimeType: 'application/json', buffer: Buffer.from(fichier) })
    await page.waitForFunction(() => window.__revoir && window.__revoir.bobine)
    await page.waitForTimeout(200)
    if (nom === 'affiche') {
      const carte = await page.evaluate(() => ({ h1: document.querySelector('.carte h1')?.textContent, visible: !document.querySelector('.carte').hidden, bouton: document.querySelector('.carte .grand')?.textContent }))
      verifier('Élèves : l\'affiche est inchangée', carte.visible && carte.h1 === 'Essai' && carte.bouton === 'Rejouer la séance', JSON.stringify(carte))
      await page.screenshot({ path: `${DOSSIER}/14-eleves-affiche.png` })
      await page.locator('.carte .secondaire').click()
      const b = page.locator('.b-vitesse')
      const noms = [await b.textContent()]
      for (let i = 0; i < 4; i++) { await b.click(); noms.push(await b.textContent()) }
      const label = await b.getAttribute('aria-label'), titre = await b.getAttribute('title')
      verifier('Élèves : le bouton d\'allure affiche Normal, puis Rapide, Très rapide, Lent', noms.join(',') === 'Normal,Rapide,Très rapide,Lent,Normal' && label === 'Allure : Normal' && titre === 'Allure de lecture', noms.join(','))
      // Les flèches sur la frise focalisée : un geste, sans double pas
      await page.keyboard.press('Home')
      await page.locator('.curseur').focus()
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50)
      const k1 = await page.evaluate(() => window.__revoir.k)
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(50)
      const k2 = await page.evaluate(() => window.__revoir.k)
      await page.keyboard.press('ArrowLeft')
      const k3 = await page.evaluate(() => window.__revoir.k)
      verifier('Élèves : les flèches sur la frise focalisée avancent d\'un geste, sans double pas', k1 === 1 && k2 === 2 && k3 === 1, `${k1} ${k2} ${k3}`)
      // Les icônes neuves, et la pause pleine dans le bouton principal
      const icones = await page.evaluate(() => {
        const lire = document.querySelector('.b-lire path').getAttribute('d')
        const avant = document.querySelector('.b-avant path').getAttribute('d')
        const chap = document.querySelector('.b-chap-apres path').getAttribute('d')
        return { lire, avant, chap }
      })
      verifier('Élèves : les icônes neuves s\'affichent', icones.lire === 'M9 6.5v11l8.5-5.5z' && icones.avant === 'M14.5 6.5L9 12l5.5 5.5' && icones.chap === 'M6 6.5l5.5 5.5L6 17.5M12.5 6.5L18 12l-5.5 5.5', JSON.stringify(icones))
      // Le tracé progressif des figures
      const trace = await page.evaluate(async () => {
        const w = window.__revoir, b = w.bobine
        document.querySelector('.b-lire').click()
        const pause = { d: document.querySelector('.b-lire path').getAttribute('d'), stroke: getComputedStyle(document.querySelector('.b-lire path')).stroke, width: getComputedStyle(document.querySelector('.b-lire svg')).strokeWidth }
        const vus = new Set()
        const t = performance.now()
        while (performance.now() - t < 12000 && w.k < b.n - 1) {
          await new Promise(q => requestAnimationFrame(q))
          // Fin de chapitre : on continue, comme l'élève
          if (!w.enMarche) document.querySelector('.carte:not([hidden]) .principal')?.click()
          const img = b.image(w.k)
          for (const f of w.rendu.formes) {
            const vraie = img.formes.find(x => x.id === f.id)
            if (vraie && vraie !== f && f.type !== 'trait') vus.add(f.type + (f.type === 'polygone' ? (f.sommets === false && vraie.sommets ? ':sans-noms' : '') : ''))
            if (vraie && vraie !== f && f.type === 'trait' && f.pts.length < vraie.pts.length) vus.add('trait')
          }
        }
        document.querySelector('.b-lire').click()
        return { vus: [...vus], pause }
      })
      verifier('Élèves : les figures se dessinent progressivement', trace.vus.includes('cercle') && trace.vus.some(v => v.startsWith('polygone')), trace.vus.join(','))
      verifier('Élèves : la pause pleine dans le bouton principal', trace.pause.d === 'M9 6.5v11M15 6.5v11' && trace.pause.stroke !== 'none' && trace.pause.width === '2.5px', JSON.stringify(trace.pause))
      await page.screenshot({ path: `${DOSSIER}/15-eleves-lecture.png` })
      // L'arrêt aux chapitres
      const chapitres = await page.evaluate(async () => {
        const w = window.__revoir, b = w.bobine
        document.querySelector('.b-cadrer').click()
        // Juste avant la fin du premier chapitre, à l'allure Très rapide
        while (document.querySelector('.b-vitesse').textContent !== 'Très rapide') document.querySelector('.b-vitesse').click()
        const fin = b.finDuChapitre(0)
        const curseur = document.querySelector('.curseur')
        curseur.value = String(Math.max(0, fin - 2)); curseur.dispatchEvent(new Event('input'))
        document.querySelector('.b-lire').click()
        const t = performance.now()
        while (w.enMarche && performance.now() - t < 8000) await new Promise(q => requestAnimationFrame(q))
        return { k: w.k, fin, carte: document.querySelector('.carte h2')?.textContent, n: b.chapitres.length }
      })
      verifier('Élèves : l\'arrêt aux chapitres est inchangé', chapitres.n > 1 && chapitres.k === chapitres.fin && /^Chapitre 2/.test(chapitres.carte), JSON.stringify(chapitres))
    } else if (nom === 'chapitre') {
      const carte = await page.evaluate(() => ({ h2: document.querySelector('.carte h2')?.textContent, k: window.__revoir.k }))
      verifier('Élèves : ?c=2 ouvre au chapitre 2', /^Chapitre 2/.test(carte.h2), JSON.stringify(carte))
    } else {
      const sansArret = await page.evaluate(async () => {
        const w = window.__revoir, b = w.bobine
        document.querySelector('.carte .principal').click()
        while (document.querySelector('.b-vitesse').textContent !== 'Très rapide') document.querySelector('.b-vitesse').click()
        const t = performance.now()
        while (w.enMarche && performance.now() - t < 20000) await new Promise(q => requestAnimationFrame(q))
        return { k: w.k, n: b.n, carte: document.querySelector('.carte h2')?.textContent }
      })
      verifier('Élèves : ?continu=1 lit d\'un seul tenant jusqu\'à la fin', sansArret.k === sansArret.n - 1 && sansArret.carte === 'Fin de la séance', JSON.stringify(sansArret))
    }
    await page.close()
  }
  await ctx.close()
}

await navigateur.close()
verifier('Aucune erreur JavaScript dans la console', erreurs.length === 0, erreurs.join(' | '))
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length} / ${resultats.length} vérifications réussies`)
if (echecs.length) { console.log('Échecs :'); for (const e of echecs) console.log(' - ' + e.nom + (e.detail ? ' — ' + e.detail : '')) }
process.exit(echecs.length ? 1 : 0)
