// ESSAI : reprendre un ancien tableau (.prof), sur le serveur de
// développement (port 5173). Les anciens tableaux sont fabriqués ici (une
// image dessinée dans un canevas, des traits, un texte, un post-it), avec
// leur film, comme ceux qu'un dossier rangé gardait.
// Adapté au deuxième lot de l'audit (lot 17, « à sa date ») : un ancien
// tableau se range à sa date entre les séances du classeur ouvert, sans
// rechargement ; la fenêtre montre où il ira ; « Ajouter à « … » » est le
// bouton principal dès qu'un tableau s'y range. Les sections B et C et le
// point A3 vérifiaient l'ancien comportement (au bout seulement, après un
// rechargement ; un plus ancien refusé) : ils vérifient le nouveau.
// A. Un ancien tableau ouvert : la fenêtre « Reprendre cet ancien tableau ? »
//    (sa séance, ses pages, où il irait dans le classeur ouvert) ; « Nouveau
//    classeur » : le classeur s'ajoute à la bibliothèque et s'ouvre ; une
//    séance, ses deux pages, son film à l'heure de chaque geste ; l'image
//    rognée, le surligneur, le texte en formule ; le bilan dit le post-it laissé.
// B. Le suivant (le lendemain) : « Ajouter à « Lundi » », principal ; la liste
//    le montre « ira ici » au-dessus de lundi ; sans rechargement, le classeur
//    a deux séances, chacune avec ses pages et ses gestes, que Publier
//    propose ; l'image qu'elles ont toutes deux n'est gardée qu'une fois.
// C. Un plus ancien que tout le classeur : il se range en premier (« ira ici »
//    sous lundi, « … 1 séance plus récente ») ; trois séances dans l'ordre des
//    dates, le film trié, Publier en propose trois.
// D. Lâché sur la page : reconnu ; mêlé à un classeur : refusé, et dit.
// E. Un fichier .prof qui n'en est pas un : refusé, et dit.
// F. Le même tableau rouvert : « est déjà dans « Lundi » », pas d'« Ajouter
//    à… », « Nouveau classeur » offert ; un tableau pendant une séance écrite :
//    « a déjà une séance écrite à ces heures-là » ; Annuler : rien n'a changé.
// G. Trois d'un coup dont un doublon : deux « ira ici », un « ne sera pas
//    ajouté » (barré), le survol du bouton le dit ; les deux entrent, le
//    message nomme le refusé ; aucun rechargement ; le bouton « Séances » de
//    la bibliothèque les montre à leur date.
// H. Un tableau plus récent que tout : il devient la dernière séance ; la page
//    qu'on regardait passe en séance passée (compteur ambre), sans rechargement.
// I. Au téléphone (390 × 844) : la fenêtre tient dans l'écran, les boutons
//    sont empilés, la ligne « ira ici » se voit sans défiler.
// J. L'enregistrement automatique (un fichier relié) : le fichier est réécrit
//    après l'ajout, comme pour tout changement.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const CAPTURES = process.env.CAPTURES_E2 || ''
let echecs = 0
const ok = (c, m, detail) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && detail !== undefined ? '— ' + JSON.stringify(detail).slice(0, 1500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|ERR_INTERNET_DISCONNECTED/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const ECOUTER_TOASTS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}
/** Un ancien tableau : deux pages, la première écrite en quatre gestes à
 *  partir de debut (une image rognée, deux traits dont un surligneur, un
 *  post-it posé puis retiré, un trait effacé, un texte), la seconde sans film */
const FABRIQUER = () => {
  window.__ancien = (nom, debut) => {
    const cv = Object.assign(document.createElement('canvas'), { width: 400, height: 200 })
    const c = cv.getContext('2d')
    c.fillStyle = '#ffe9a8'; c.fillRect(0, 0, 400, 200); c.fillStyle = '#1f5fbf'; c.fillRect(200, 100, 200, 100)
    const png = cv.toDataURL('image/png')
    const MIN = 60000
    const vide = { points: [], segments: [], circles: [], rectangles: [], texts: [], freehands: [], curves: [], polygons: [], images: [], arcs: [], htmlPostits: [] }
    const trait = (id, x, y, o = {}) => ({ id, points: [{ x, y, p: 0.3 }, { x: x + 60, y: y + 20, p: 0.6 }, { x: x + 120, y, p: 0.5 }], color: '#e74c3c', width: 3, isHighlighter: false, z: id, ...o })
    const image = { id: 2, x: -300, y: -200, w: 200, h: 100, cx: 200, cy: 100, cw: 200, ch: 100, z: 1, srcRef: 'a1' }
    const t1 = trait(1, -300, 0), t3 = trait(3, -250, 50, { isHighlighter: true, width: 18, color: '#f1c40f' })
    const texte = { id: 4, x: 0, y: -200, content: '<span style="font-size: 0.736em;">(voir partie exercices )</span>', color: '#e74c3c', fontSize: 43.5, z: 4 }
    return JSON.stringify({
      id: 'drive_1', name: nom, enregistreLe: debut + 50 * MIN, preview: 'data:image/jpeg;base64,AAAA',
      data: {
        currentBgIndex: 0, assets: { a1: png }, nextId: 10, globalZ: 10,
        pages: [
          { ...vide, freehands: [t1, t3], images: [image], texts: [texte], panX: 700, panY: 300, zoom: 1,
            filmArchive: [{ ...vide, t: debut }],
            film: [
              { images: { '+': [image] }, t: debut + MIN },
              { freehands: { '+': [t1, trait(5, -200, 120)] }, htmlPostits: { '+': [{ id: 9, x: 0, y: 0, w: 150, h: 150, content: '' }] }, t: debut + 2 * MIN },
              { freehands: [t1, t3], htmlPostits: [], t: debut + 3 * MIN },
              { texts: [texte], t: debut + 4 * MIN },
            ] },
          { ...vide, freehands: [trait(7, 100, 100, { color: '#2d3436' })], panX: 700, panY: 300, zoom: 1 },
        ],
      },
    })
  }
  window.__ouvrirAnciens = liste => window.__fichiers.ouvrir(liste.map(([nom, debut]) => ({ fichier: new File([window.__ancien(nom, debut)], `${nom}.prof`) })))
  window.__ouvrirAncien = (nom, debut) => window.__ouvrirAnciens([[nom, debut]])
}
/** Les permissions accordées et le choix d'un fichier dans l'OPFS (section J) */
const INIT_FICHIERS = () => {
  const H = window.FileSystemHandle?.prototype
  if (!H) return
  H.queryPermission = async function () { return 'granted' }
  H.requestPermission = async function () { return 'granted' }
  window.showSaveFilePicker = async o => (await navigator.storage.getDirectory()).getFileHandle(o?.suggestedName || 'x.memc', { create: true })
  window.__fichierOpfs = async nom => { try { const f = await (await (await navigator.storage.getDirectory()).getFileHandle(nom)).getFile(); return { taille: f.size, date: f.lastModified } } catch { return null } }
}

const norm = t => (t || '').replace(/[  ]/g, ' ')
const fenetre = p => p.evaluate(() => {
  const n = t => (t || '').replace(/[  ]/g, ' ')
  const d = document.querySelector('dialog[open]')
  return d ? {
    titre: d.querySelector('h2')?.textContent, texte: n(d.textContent),
    boutons: [...d.querySelectorAll('.actions button')].map(b => n(b.textContent)),
    principal: [...d.querySelectorAll('.actions button.principal')].map(b => n(b.textContent)),
    focus: n(document.activeElement?.textContent),
    aide: d.querySelector('.actions button[data-a="ajouter-ici"]')?.title ? n(d.querySelector('.actions button[data-a="ajouter-ici"]').title) : null,
    lignes: [...d.querySelectorAll('.apercu-seances li')].map(li => ({ genre: li.className, texte: n(li.textContent), courant: li.getAttribute('aria-current') })),
  } : null
})
/** Ouvre des anciens tableaux sans attendre : la promesse ne se tient qu'à la fermeture de la fenêtre (une page fermée avant la rejette) */
const lancer = (p, fn, arg) => { p.evaluate(fn, arg).catch(() => {}) }
const attendreFenetre = (p, titre) => p.waitForFunction(t => document.querySelector('dialog[open] h2')?.textContent === t, titre, { timeout: 20000 }).then(() => true, () => false)
const attendreToast = (p, re, timeout = 30000) => p.waitForFunction(s => (window.__toasts || []).some(t => new RegExp(s).test(t)), re.source, { timeout }).then(() => true, () => false)
const pret = p => p.waitForFunction(() => window.__app && window.__fichiers && window.__registre && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
/** La fenêtre « Bonjour ! » d'un classeur dont la dernière séance est passée : fermée */
const fermerBonjour = async p => {
  await p.waitForTimeout(400)
  if (await p.evaluate(() => !!document.querySelector('dialog[open]'))) { await p.keyboard.press('Escape'); await p.waitForTimeout(200) }
}
/** Le classeur ouvert : ses séances, leurs pages et leurs formes, son film */
const classeur = p => p.evaluate(async () => {
  const t = window.__app.tableau
  const { seancesDuTableau } = await import('/src/revoir/exporter.ts')
  const seances = t.seancesDuClasseur().map(s => ({ debut: s.debut, pages: s.pages.map(id => [...(t.formesDe(id)?.values() ?? [])].map(f => ({ type: f.type, opacite: f.opacite, latex: f.latex, l: f.l, h: f.h, src: f.src }))) }))
  const film = t.film.toArray().map(e => e.t)
  const banque = t.doc.getMap('images')
  return { seances, film, trie: [...film].sort((x, y) => x - y).join() === film.join(), gestes: (seancesDuTableau(t) ?? []).map(s => s.gestes).reverse(), images: [...banque.values()].map(v => v.length + ':' + v.slice(-30)), passee: window.__app.enSeancePassee, derniere: t.derniereSeance()?.debut, marque: window.__marque ?? null }
})
/** Le fichier de l'OPFS (section J) tel qu'il est quand `bon` le trouve bon, ou null passé le délai (lu toutes les secondes, sans promesse dans waitForFunction) */
const attendreFichier = async (p, nom, bon, delai) => {
  const fin = Date.now() + delai
  for (;;) {
    const f = await p.evaluate(n => window.__fichierOpfs(n), nom)
    if (f && bon(f)) return f
    if (Date.now() > fin) return f
    await p.waitForTimeout(1000)
  }
}
const attendreSeances = (p, n) => p.waitForFunction(n => window.__app?.tableau?.seancesDuClasseur().length === n, n, { timeout: 30000 }).then(() => true, () => false)
const capture = async (p, nom) => { if (CAPTURES) await p.screenshot({ path: `${CAPTURES}${nom}.png` }).catch(e => console.log('  (capture :', e.message, ')')) }

const navigateur = await chromium.launch()
try {
  const ctx = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(ECOUTER_TOASTS)
  await ctx.addInitScript(FABRIQUER)
  let p = await ctx.newPage(); suivre(p, 'A')
  await p.goto(DEV); await pret(p)
  const JOUR = 86400000, MIN = 60000
  const lundi = new Date(Date.now() - 3 * JOUR); lundi.setHours(8, 0, 0, 0)
  const L = lundi.getTime(), M = L + JOUR
  const dateCourte = t => p.evaluate(async t => (await import('/src/seances.ts')).dateCourteMajuscule(t), t)

  // =====================================================================
  console.log('\n— A. Un ancien tableau, dans un classeur neuf')
  lancer(p, L => window.__ouvrirAncien('Lundi', L), L)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'A1) La fenêtre « Reprendre cet ancien tableau ? »')
  let f = await fenetre(p)
  ok(/« Lundi » : séance du \w+ \d+(er)? \w+ \d{4}, 2 pages\./.test(f?.texte) && /avec ses traits, ses images, ses figures, ses textes et son film/.test(f?.texte), 'A2) Elle dit sa séance et ses pages', f)
  // Le classeur du démarrage est ouvert et l'ancien tableau s'y range (avant sa séance du jour) : « Ajouter à » est le bouton principal, à droite
  ok(f?.boutons.length === 3 && f.boutons[0] === 'Annuler' && f.boutons[1] === 'Nouveau classeur' && /^Ajouter à « .+ »$/.test(f.boutons[2]) && f.principal.join() === f.boutons[2] && f.focus === f.boutons[2],
    'A3) Annuler, Nouveau classeur, puis « Ajouter à « … » », principal et au clavier', f)
  ok(f?.lignes.some(l => l.genre === 'ici' && /« Lundi » · 2 pages — ira ici$/.test(l.texte) && l.courant === 'true') && /il se rangera à sa date :/.test(f?.texte), 'A3b) La liste montre où il irait (« ira ici »)', f?.lignes)
  await p.click('dialog[open] button[data-a="nouveau"]')
  ok(await attendreToast(p, /Classeur ajouté à la bibliothèque : « Lundi » \(2 pages\)\. « Lundi » : 2 pages, 3 traits, 1 image, 1 texte \(devenu une formule\), avec son film\. 1 objet \(cercles, polygones, courbes ou post-its\) n'a pas été repris\./), 'A4) Ajouté, et le bilan', await p.evaluate(() => window.__toasts))
  await attendreSeances(p, 1)
  await fermerBonjour(p)
  const fiches = await p.evaluate(async () => (await window.__registre.classeurs()).map(f => f.nom))
  ok(fiches.includes('Lundi'), 'A5) Le classeur « Lundi » est dans la bibliothèque', fiches)
  let c = await classeur(p)
  ok(c.seances.length === 1 && c.seances[0].debut === L && c.seances[0].pages.length === 2, 'A6) Une séance, au début du premier geste, avec ses deux pages', c.seances.map(s => [s.debut, s.pages.length]))
  const p1 = c.seances[0].pages[0] ?? []
  ok(p1.map(x => x.type).sort().join() === 'formule,image,trait,trait', 'A7) La page 1 : l\'image, deux traits (l\'effacé est parti), le texte', p1)
  ok(p1.some(x => x.type === 'trait' && x.opacite === 0.35), 'A8) Le surligneur reste un surligneur')
  ok(p1.some(x => x.type === 'formule' && x.latex === '\\text{(voir partie exercices )}'), 'A9) Le texte est une formule', p1)
  ok(p1.some(x => x.type === 'image' && x.l === 200 && x.h === 100), 'A10) L\'image rognée : la partie gardée seule (200 × 100)', p1)
  ok(JSON.stringify(c.film.slice(0, 2)) === JSON.stringify([L, L]) && c.film.includes(L + MIN) && c.film.includes(L + 4 * MIN) && c.gestes[0] === 5, 'A11) Le film : chaque geste à son heure', c)
  // Ce qu'on voit : la partie bleue de l'image (la partie gardée), en haut à gauche
  await p.screenshot({ path: 'sorties/E2-ancien-tableau-A.png' }).catch(() => {})
  const bleu = await p.evaluate(() => {
    const cv = document.querySelector('canvas'); const c = cv.getContext('2d'); const d = c.getImageData(0, 0, cv.width, cv.height).data
    let n = 0, j = 0
    for (let i = 0; i < d.length; i += 16) { if (d[i] < 60 && d[i + 1] > 70 && d[i + 1] < 120 && d[i + 2] > 160) n++; if (d[i] >= 253 && Math.abs(d[i + 1] - 233) < 4 && Math.abs(d[i + 2] - 168) < 4) j++ }
    return { n, j }
  })
  ok(bleu.n > 50 && bleu.j === 0, 'A12) On voit la partie gardée de l\'image (bleue), pas la partie rognée (jaune)', bleu)

  // =====================================================================
  console.log('\n— B. Le lendemain : ajouté au classeur ouvert, à sa date, sans rechargement')
  const avantB = await p.evaluate(async () => (await window.__registre.classeurs()).length)
  await p.evaluate(() => { window.__marque = 'B' })
  lancer(p, M => window.__ouvrirAncien('Mardi', M), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'B1) La fenêtre')
  f = await fenetre(p)
  ok(f?.boutons.includes('Ajouter à « Lundi »') && f.principal.join() === 'Ajouter à « Lundi »', 'B2) « Ajouter à « Lundi » », principal', f?.boutons)
  const dM = await dateCourte(M), dL = await dateCourte(L)
  ok(f?.lignes.map(l => l.genre).join() === 'ici,seance' && f.lignes[0].texte === `${dM} · « Mardi » · 2 pages — ira ici` && f.lignes[1].texte === `${dL} · 2 pages`, 'B2b) La liste : « ira ici » au-dessus de la séance de lundi', f?.lignes)
  await p.click('dialog[open] button[data-a="ajouter-ici"]')
  ok(await attendreToast(p, /^Séance ajoutée à « Lundi »\. « Mardi » : 2 pages, 3 traits, 1 image, 1 texte \(devenu une formule\), avec son film\./), 'B3) Le message : « Séance ajoutée à « Lundi ». » et le bilan', await p.evaluate(() => window.__toasts))
  ok(await attendreSeances(p, 2), 'B4) Deux séances aussitôt')
  c = await classeur(p)
  ok(c.marque === 'B' && !(await p.evaluate(() => !!document.querySelector('dialog[open]'))), 'B5) Aucun rechargement, aucune fenêtre « Bonjour ! »', c.marque)
  ok(c.seances.length === 2 && c.seances[1].debut === M && c.seances.every(s => s.pages.length === 2), 'B6) Deux séances, chacune avec ses deux pages', c.seances.map(s => [s.debut, s.pages.length]))
  ok(c.gestes.join() === '5,5' && c.trie, 'B7) Chacune a ses gestes dans le film, qui reste dans l\'ordre des heures', c.gestes)
  ok(c.images.length === 1, 'B8) La même image, reprise par les deux séances, n\'est gardée qu\'une fois', c.images)
  const aPublier = await p.evaluate(async () => (await import('/src/revoir/exporter.ts')).seancesAPublier(window.__app.tableau).length)
  ok(aPublier === 2, 'B9) Publier propose les deux séances', aPublier)
  const n = (await p.evaluate(async () => (await window.__registre.classeurs()).length))
  ok(n === avantB, 'B10) Aucun classeur de plus', [avantB, n])
  const fiche = await p.evaluate(async () => (await window.__registre.classeurs()).find(f => f.nom === 'Lundi'))
  ok(fiche?.listeSeances?.length === 2 && fiche.seances === 2 && fiche.pages === 4, 'B11) La fiche du classeur suit (ses séances, ses pages)', fiche && { l: fiche.listeSeances, s: fiche.seances, p: fiche.pages })

  // =====================================================================
  console.log('\n— C. Un plus ancien que tout le classeur : il se range en premier')
  lancer(p, L => window.__ouvrirAncien('Avant', L - 7 * 86400000), L)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'C1) La fenêtre')
  f = await fenetre(p)
  ok(f?.boutons.includes('Ajouter à « Lundi »') && f.principal.join() === 'Ajouter à « Lundi »' && !/a déjà une séance plus récente/.test(f.texte), 'C2) « Ajouter à « Lundi » » est là (plus de règle « la plus ancienne d\'abord »)', f)
  ok(f?.lignes.map(l => l.genre).join() === 'plus,seance,ici' && f.lignes[0].texte === '… 1 séance plus récente' && f.lignes[1].texte === `${dL} · 2 pages` && /« Avant » · 2 pages — ira ici$/.test(f.lignes[2].texte), 'C3) La liste : « … 1 séance plus récente », lundi, puis « ira ici »', f?.lignes)
  await capture(p, 'p6-un-ancien-a-sa-date')
  await p.click('dialog[open] button[data-a="ajouter-ici"]')
  ok(await attendreToast(p, /^Séance ajoutée à « Lundi »\. « Avant » : 2 pages/), 'C4) Ajoutée')
  await attendreSeances(p, 3)
  c = await classeur(p)
  ok(c.seances.map(s => s.debut).join() === [L - 7 * JOUR, L, M].join() && c.trie && c.gestes.join() === '5,5,5', 'C5) Trois séances dans l\'ordre des dates, le film trié, chacune ses gestes', { d: c.seances.map(s => s.debut), trie: c.trie, g: c.gestes })
  ok((await p.evaluate(async () => (await import('/src/revoir/exporter.ts')).seancesAPublier(window.__app.tableau).length)) === 3, 'C6) Publier en propose trois')
  ok(c.images.length === 1 && c.marque === 'B', 'C7) Toujours une seule image, pas de rechargement', [c.images.length, c.marque])

  // =====================================================================
  console.log('\n— D. Lâché sur la page ; mêlé à un classeur')
  await p.evaluate(M => window.__fichiers.lacher([new File([window.__ancien('Jeudi', M + 2 * 86400000)], 'Jeudi.prof')]), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'D1) Lâché : reconnu')
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  await p.evaluate(M => window.__fichiers.ouvrir([{ fichier: new File([window.__ancien('Jeudi', M)], 'Jeudi.prof') }, { fichier: new File(['x'], 'Autre.memc') }]), M)
  ok(await attendreToast(p, /Ouvrez les anciens tableaux \(\.prof\) à part/), 'D2) Mêlé à un classeur : refusé, et dit')

  // =====================================================================
  console.log('\n— E. Un faux .prof')
  await p.evaluate(() => window.__fichiers.ouvrir([{ fichier: new File(['{"rien": 1}'], 'Faux.prof') }]))
  ok(await attendreToast(p, /« Faux\.prof » : Ce fichier n'est pas un ancien tableau \(\.prof\) qu'on sait lire\./), 'E1) Refusé, et dit')
  ok(!(await p.evaluate(() => !!document.querySelector('dialog[open]'))), 'E2) Aucune fenêtre')

  // =====================================================================
  console.log('\n— F. Le même tableau rouvert ; un tableau pendant une séance écrite')
  const avantF = JSON.stringify(await classeur(p))
  lancer(p, M => window.__ouvrirAncien('Mardi', M), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'F1) La fenêtre')
  f = await fenetre(p)
  ok(new RegExp(`« Mardi » est déjà dans « Lundi » \\(séance du ${dM.charAt(0).toLowerCase() + dM.slice(1)}\\)\\.`).test(f?.texte) && !f.lignes.length, 'F2) « « Mardi » est déjà dans « Lundi » (séance du …). », sans liste', f)
  ok(!f?.boutons.some(b => b.startsWith('Ajouter')) && f?.boutons.join('|') === 'Annuler|Nouveau classeur' && f.principal.join() === 'Nouveau classeur', 'F3) Pas d\'« Ajouter à… » ; « Nouveau classeur » offert, principal', f?.boutons)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  lancer(p, M => window.__ouvrirAncien('Pendant', M + 2 * 60000), M)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'F4) Un tableau pendant la séance de mardi : la fenêtre')
  f = await fenetre(p)
  ok(new RegExp(`« Lundi » a déjà une séance écrite à ces heures-là \\(${dM} · 2 pages\\) : cet ancien tableau ne peut pas s'y ajouter\\.`).test(f?.texte) && !f.boutons.some(b => b.startsWith('Ajouter')), 'F5) « a déjà une séance écrite à ces heures-là (…) », pas d\'« Ajouter à… »', f)
  await p.keyboard.press('Escape')
  await p.waitForTimeout(300)
  ok(JSON.stringify(await classeur(p)) === avantF, 'F6) Annuler : rien n\'a changé (séances, film, images)')

  // =====================================================================
  console.log('\n— G. Trois d\'un coup, dont un doublon')
  lancer(p, ([L, M]) => window.__ouvrirAnciens([['Mardi (copie)', M], ['Jeudi', L - 4 * 86400000], ['Vendredi', L - 3 * 86400000]]), [L, M])
  ok(await attendreFenetre(p, 'Reprendre ces anciens tableaux ?'), 'G1) La fenêtre « Reprendre ces anciens tableaux ? »')
  f = await fenetre(p)
  ok(/3 anciens tableaux, du plus ancien au plus récent :/.test(f?.texte) && /ils se rangeront à leur date :/.test(f?.texte), 'G2) Trois anciens tableaux, « ils se rangeront à leur date : »', f?.texte)
  const genres = f?.lignes.map(l => l.genre) ?? []
  ok(genres.filter(g => g === 'ici').length === 2 && genres.filter(g => g === 'refuse').length === 1 && genres.filter(g => g === 'seance').length === 3, 'G3) Deux « ira ici », un refusé, les trois séances du classeur', f?.lignes)
  ok(f?.lignes[0].genre === 'refuse' && f.lignes[0].texte === `${dM} · « Mardi (copie) » · 2 pages — déjà dans « Lundi » : ne sera pas ajouté` && f.lignes[1].texte === `${dM} · 2 pages`, 'G4) Le doublon, barré, juste avant la séance qu\'il répète', f?.lignes.slice(0, 2))
  ok(f?.aide === 'Ajoute les 2 tableaux qui se rangent ; « Mardi (copie) » ne sera pas ajouté.', 'G5) Le survol du bouton le dit', f?.aide)
  await capture(p, 'p6-trois-anciens-dont-un-doublon')
  await p.click('dialog[open] button[data-a="ajouter-ici"]')
  ok(await attendreToast(p, /^2 séances ajoutées à « Lundi »\. « Jeudi » : 2 pages, .* « Vendredi » : 2 pages, .* « Mardi \(copie\) » n'a pas été ajouté : il est déjà dans « Lundi »\./), 'G6) « 2 séances ajoutées… », les bilans, et le refusé nommé', await p.evaluate(() => window.__toasts.slice(-2)))
  await capture(p, 'p6-apres-ajout')
  await attendreSeances(p, 5)
  c = await classeur(p)
  ok(c.seances.map(s => s.debut).join() === [L - 7 * JOUR, L - 4 * JOUR, L - 3 * JOUR, L, M].join() && c.trie && c.gestes.join() === '5,5,5,5,5' && c.marque === 'B', 'G7) Cinq séances à leur date, le film trié, sans rechargement', { d: c.seances.map(s => s.debut), trie: c.trie, g: c.gestes, m: c.marque })
  // Le bouton « Séances » de la bibliothèque (lot 8) les montre à leur date
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(300)
  await p.click('[data-action="seances"]'); await p.waitForTimeout(300)
  const vues = await p.evaluate(() => [...document.querySelectorAll('.seance-ligne .seance-date')].map(x => x.textContent.replace(/[  ]/g, ' ')))
  const attendues = []
  for (const t of [M, L, L - 3 * JOUR, L - 4 * JOUR, L - 7 * JOUR]) attendues.push(await dateCourte(t))
  ok(vues.join('|') === attendues.join('|'), 'G8) Le bouton « Séances » de la bibliothèque : les cinq, la plus récente d\'abord', { vues, attendues })
  await p.keyboard.press('Escape'); await p.waitForTimeout(200)
  await p.evaluate(() => { if (window.__bibliotheque.ouvert) window.__bibliotheque.fermer() })
  await p.waitForTimeout(300)

  // =====================================================================
  console.log('\n— H. Un tableau plus récent que tout')
  await p.evaluate(() => window.__app.retourAujourdhui())
  await p.waitForTimeout(200)
  c = await classeur(p)
  ok(c.passee === false && c.derniere === M, 'H1) (préparation) sur la séance du jour, celle de mardi', [c.passee, c.derniere])
  const HIER = L + 2 * JOUR
  lancer(p, H => window.__ouvrirAncien('Hier', H), HIER)
  ok(await attendreFenetre(p, 'Reprendre cet ancien tableau ?'), 'H2) La fenêtre')
  f = await fenetre(p)
  ok(f?.lignes[0].genre === 'ici' && f.lignes[1].texte === `${dM} · 2 pages` && f.lignes[2]?.genre === 'plus', 'H3) « ira ici » tout en haut, puis mardi, puis « … 3 séances plus anciennes »', f?.lignes)
  await p.click('dialog[open] button[data-a="ajouter-ici"]')
  ok(await attendreToast(p, /^Séance ajoutée à « Lundi »\. « Hier » : 2 pages/), 'H4) Ajoutée')
  await attendreSeances(p, 6)
  c = await classeur(p)
  const rang = await p.evaluate(() => ({ lecture: document.querySelector('.rang')?.classList.contains('en-lecture'), texte: (document.querySelector('.rang')?.textContent || '').replace(/[  ]/g, ' ') }))
  ok(c.derniere === HIER && c.passee === true && rang.lecture && c.marque === 'B' && c.trie, 'H5) Elle est la dernière séance ; la page qu\'on regardait est en séance passée (compteur ambre), sans rechargement', { derniere: c.derniere, passee: c.passee, rang, m: c.marque })

  // =====================================================================
  console.log('\n— I. Au téléphone (390 × 844)')
  const tel = await navigateur.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await tel.addInitScript(ECOUTER_TOASTS)
  await tel.addInitScript(FABRIQUER)
  const q = await tel.newPage(); suivre(q, 'I')
  await q.goto(DEV); await pret(q)
  lancer(q, L => window.__ouvrirAncien('Lundi', L), L)
  ok(await attendreFenetre(q, 'Reprendre cet ancien tableau ?'), 'I1) La fenêtre')
  const geo = await q.evaluate(() => {
    const d = document.querySelector('dialog[open]'), r = d.getBoundingClientRect()
    const b = [...d.querySelectorAll('.actions button')].map(x => { const k = x.getBoundingClientRect(); return { x: k.left, y: k.top, l: k.width, h: k.height } })
    const ici = d.querySelector('.apercu-seances li.ici')?.getBoundingClientRect()
    const liste = d.querySelector('.apercu-seances')?.getBoundingClientRect()
    return { dialogue: { x: r.left, y: r.top, l: r.width, h: r.height, droite: r.right }, boutons: b, ici: ici && { y: ici.top, bas: ici.bottom }, liste: liste && { y: liste.top, bas: liste.bottom }, ecran: { l: innerWidth, h: innerHeight } }
  })
  ok(geo.dialogue.x >= 8 && geo.dialogue.droite <= 382 && geo.dialogue.y >= 0 && geo.dialogue.y + geo.dialogue.h <= 844, 'I2) La fenêtre tient dans l\'écran (8 px de chaque côté)', geo.dialogue)
  ok(geo.boutons.length === 3 && geo.boutons.every((b, i) => i === 0 || b.y > geo.boutons[i - 1].y + 40) && geo.boutons.every(b => b.l > 300), 'I3) Les boutons sont empilés, pleine largeur', geo.boutons)
  ok(!!geo.ici && geo.ici.y >= geo.liste.y && geo.ici.bas <= geo.liste.bas + 1 && geo.ici.bas <= 844, 'I4) La ligne « ira ici » se voit sans défiler', geo)
  await capture(q, 'p6-telephone')
  await q.keyboard.press('Escape')
  await tel.close()

  // =====================================================================
  console.log('\n— J. L\'enregistrement automatique dans un fichier relié')
  const ctxJ = await navigateur.newContext({ viewport: { width: 1366, height: 768 } })
  await ctxJ.addInitScript(INIT_FICHIERS)
  await ctxJ.addInitScript(ECOUTER_TOASTS)
  await ctxJ.addInitScript(FABRIQUER)
  const r = await ctxJ.newPage(); suivre(r, 'J')
  await r.goto(DEV); await pret(r)
  await r.evaluate(() => window.__cle?.pret)
  const active = await r.evaluate(() => window.__cle.activer())
  const nomFichier = await r.evaluate(() => window.__cle.poignee?.name ?? null)
  const avantJ = await attendreFichier(r, nomFichier, f => f.taille > 0, 20000)
  ok(active === true && avantJ?.taille > 0, 'J1) (préparation) le classeur est relié à un fichier, écrit une première fois', { active, nomFichier, avantJ })
  await r.waitForTimeout(1200)
  lancer(r, L => window.__ouvrirAncien('Lundi', L), L)
  ok(await attendreFenetre(r, 'Reprendre cet ancien tableau ?'), 'J2) La fenêtre')
  await r.click('dialog[open] button[data-a="ajouter-ici"]')
  ok(await attendreToast(r, /^Séance ajoutée à « .+ »\. « Lundi » : 2 pages/), 'J3) Ajoutée au classeur ouvert')
  ok(await attendreSeances(r, 2), 'J4) Deux séances')
  // La clé écrit 20 s après le dernier changement, et pas avant vingt fois la
  // durée de sa dernière écriture (cle.ts, APRES_DERNIER, FOIS_LA_DUREE)
  const delai = await r.evaluate(() => Math.max(25000, (window.__cle.finDerniere ?? 0) + 20 * (window.__cle.dureeDerniere ?? 0) - Date.now() + 8000))
  console.log(`  (la clé réécrira dans ${Math.round(delai / 1000)} s au plus)`)
  const apresJ = await attendreFichier(r, nomFichier, f => f.date > (avantJ?.date ?? 0) && f.taille > 0, Math.min(delai, 150000))
  ok(!!apresJ && apresJ.taille > avantJ.taille, 'J5) Le fichier relié est réécrit après l\'ajout (plus récent, plus gros)', { avantJ, apresJ })
  await ctxJ.close()

  ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
} finally {
  await navigateur.close()
}
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
