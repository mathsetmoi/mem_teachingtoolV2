// Essais au navigateur du morceau P9 du lot 3 : « Exporter en PDF » (la page,
// les pages choisies dans la trieuse, tout le tableau), chaque page cadrée sur
// son contenu, découpée en feuilles A4, à 200 ppp, hors connexion.
// - court : une page courte, par Ctrl + P (la fenêtre, pas l'impression du
//   navigateur) : une feuille portrait A4 (595,28 × 841,89 pt), une image à
//   200 ppp, le nom du fichier, le titre, le message ;
// - haute : une page très haute de lignes d'écriture : plusieurs feuilles,
//   rendues à 60 ppp, aucune coupe ne traverse une ligne (chaque ligne
//   d'encre une fois, entière ; une bande blanche au bas de chaque feuille) ;
// - large : une page large (paysage), une page très large (« réduite à … % ») ;
// - formules : des formules et une image, nettes (feuille rendue à 200 ppp,
//   comparée à la capture de l'écran à la même échelle) ;
// - vide : une page vide parmi d'autres (le message, pas de feuille blanche),
//   tout vide (pas de fichier) ;
// - fond : le fond coché ou non (le réglage gardé) ; les instruments posés
//   absents ;
// - noms : les noms des fichiers et les titres (tout, une page nommée, les
//   pages choisies) ; les menus (page, ⋯, vignette, bandeau de la trieuse) ;
//   la copie en image d'une page très haute propose le PDF ;
// - dense : 10 pages chargées : la taille du fichier, aucune tâche longue de
//   plus de 150 ms, la progression ; un trait écrit pendant l'export s'écrit
//   sans à-coup et n'est pas dans le PDF ;
// - doigt, clavier : la trieuse au doigt (« Choisir plusieurs », Exporter en
//   PDF) et au clavier (Ctrl + A, Ctrl + P, Entrée) ;
// - textes, impression : aucun « undefined » ni « NaN » (fenêtre ouverte) ; @media print ;
// - fichier, enligne : la version en un seul fichier (file://) et la version
//   en ligne (dist-pages, servie sur :4180) exportent aussi ;
// - photo : une feuille dominée par une photo part en JPEG.
// Serveur de développement sur :5173 ; dist/index.html et dist-pages construits.
// Une ligne « OK … » ou « ÉCHEC … » par vérification ; code de sortie 1 s'il
// y a un échec ou une erreur JS. node P9-pdf.mjs [section…] : seulement ces sections.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { ECRIRE } from './P9/ecriture.mjs'
import { construire } from './p4/scene.mjs'

const URL0 = 'http://localhost:5173/'
const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/lot3/P9/navigateur'
rmSync(D, { recursive: true, force: true })
mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
const net = t => (t ?? '').replace(/[\u00a0\u202f]/g, ' ')
/** Le nom du classeur ouvert (lot 4 : le PDF de tout le classeur le porte) */
const nomDuClasseur = page => page.evaluate(() => window.__app.classeur.nom)
const AUJOURDHUI = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` })()

/** Le message de l'interface, noté (tous les messages, dans l'ordre) */
const NOTER = () => {
  const a = window.__app, m = a.ui.message.bind(a.ui)
  window.__msgs = []
  a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
  a.reconnaissance = false
}
async function pret(page) {
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(300)
  }
  await page.evaluate(NOTER)
}
async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await pret(page)
  return { ctx, page }
}
const msgs = page => page.evaluate(() => (window.__msgs || []).map(m => m.replace(/[\u00a0\u202f]/g, ' ')))
const dialogue = page => page.evaluate(() => {
  const net = t => t == null ? t : t.replace(/[\u00a0\u202f]/g, ' ')
  const d = document.querySelector('dialog[open]')
  if (!d) return null
  return {
    titre: d.querySelector('h2')?.textContent, classe: d.className,
    radios: [...d.querySelectorAll('input[type=radio]')].map(r => ({ v: r.value, c: r.checked, t: net(r.closest('label').textContent.trim()) })),
    seul: net(d.querySelector('.pdf-seul')?.textContent ?? null),
    fond: d.querySelector('input[name="pdf-fond"]')?.checked ?? null,
    caseFond: d.querySelector('.pdf-fond')?.textContent.trim(),
    note: d.querySelector('.pdf-note')?.textContent,
    boutons: [...d.querySelectorAll('button')].map(b => b.textContent),
    focus: document.activeElement?.textContent ?? '',
  }
})

/** Exporte : declencher() ouvre la fenêtre (ou lance l'export) ; choisir(page)
 *  règle la fenêtre ; puis « Exporter ». Rend le fichier enregistré, son nom
 *  proposé, la durée, ou null si aucun téléchargement */
async function exporter(page, nom, declencher, o = {}) {
  await declencher()
  await page.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 3000 }).catch(() => {})
  const fen = await dialogue(page)
  if (o.choisir) await o.choisir()
  const dl = page.waitForEvent('download', { timeout: o.attente ?? 90000 }).catch(() => null)
  const t0 = Date.now()
  if (o.clavier) await page.keyboard.press('Enter')
  else if (o.toucher) { const r = await page.locator('dialog[open] [data-a="exporter"]').boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2) }
  else await page.click('dialog[open] [data-a="exporter"]')
  if (o.pendant) await o.pendant()
  const d = await dl
  if (!d) return { fen, fichier: null }
  const fichier = `${D}/${nom}.pdf`
  await d.saveAs(fichier)
  await page.waitForTimeout(250)
  return { fen, fichier, propose: d.suggestedFilename(), ms: Date.now() - t0 }
}
function info(f) {
  const t = execFileSync('pdfinfo', [f]).toString()
  const taille = /Page size:\s+([\d.]+) x ([\d.]+) pts/.exec(t)
  return { texte: t, pages: Number(/Pages:\s+(\d+)/.exec(t)?.[1]), l: Number(taille?.[1]), h: Number(taille?.[2]), titre: /Title:\s+(.*)/.exec(t)?.[1]?.trim(), octets: statSync(f).size }
}
function images(f) {
  return execFileSync('pdfimages', ['-list', f]).toString().trim().split('\n').slice(2).map(l => {
    const c = l.trim().split(/\s+/)
    return { page: +c[0], l: +c[3], h: +c[4], couleur: c[5], enc: c[8], xppi: +c[12], yppi: +c[13] }
  })
}
/** Les feuilles rendues par pdftoppm (PNG), dans l'ordre */
function rendre(f, ppp, nom) {
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', f, `${D}/${nom}`])
  return readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort().map(x => `${D}/${x}`)
}
const b64 = f => readFileSync(f).toString('base64')

// L'analyseur : une page vierge qui lit des PNG et compte leurs pixels
const ana = await (await nav.newContext()).newPage()
await ana.setContent('<html><body></body></html>')
await ana.evaluate(() => {
  window.lire = async b => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0)
    return { l: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }
  }
  const lum = (d, i) => 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]
  /** Les rangées d'encre (luminance < seuil) d'un rectangle : leurs suites
   *  (deux suites séparées de moins de « joint » rangées blanches n'en font
   *  qu'une : le bas d'une lettre isolé par l'anticrénelage) */
  window.suites = async (b, r, seuil = 150, joint = 4) => {
    const { l, d } = await window.lire(b)
    const runs = []
    let debut = -1
    for (let y = r.y0; y < r.y1; y++) {
      let encre = false
      for (let x = r.x0; x < r.x1 && !encre; x++) if (lum(d, (y * l + x) * 4) < seuil) encre = true
      if (encre && debut < 0) debut = y
      if (!encre && debut >= 0) { runs.push([debut, y]); debut = -1 }
    }
    if (debut >= 0) runs.push([debut, r.y1])
    const unies = []
    for (const x of runs) { if (unies.length && x[0] - unies.at(-1)[1] < joint) unies.at(-1)[1] = x[1]; else unies.push([...x]) }
    return unies
  }
  /** Combien de pixels diffèrent entre deux images (de taille égale ; -1 sinon) */
  window.differents = async (ba, bb) => {
    const A = await window.lire(ba), B = await window.lire(bb)
    if (A.l !== B.l || A.h !== B.h) return -1
    let n = 0
    for (let i = 0; i < A.d.length; i += 4) if (A.d[i] !== B.d[i] || A.d[i + 1] !== B.d[i + 1] || A.d[i + 2] !== B.d[i + 2]) n++
    return n
  }
  /** Combien de pixels d'un rectangle passent ce test */
  window.compter = async (b, r, test) => {
    const { l, d } = await window.lire(b), f = new Function('r', 'g', 'b', 'return ' + test)
    let n = 0
    for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) { const i = (y * l + x) * 4; if (f(d[i], d[i + 1], d[i + 2])) n++ }
    return n
  }
  /** L'écart moyen (sur 255, en gris) entre un rectangle de A et le même de B,
   *  B décalé au mieux de ±k pixels */
  window.ecart = async (ba, ra, bb, rb, k = 4) => {
    const A = await window.lire(ba), B = await window.lire(bb)
    let meilleur = Infinity, ou = null
    for (let dy = -k; dy <= k; dy++) for (let dx = -k; dx <= k; dx++) {
      let s = 0, n = 0
      for (let y = 0; y < ra.h; y++) for (let x = 0; x < ra.l; x++) {
        const ia = ((ra.y + y) * A.l + ra.x + x) * 4, ib = ((rb.y + y + dy) * B.l + rb.x + x + dx) * 4
        s += Math.abs(lum(A.d, ia) - lum(B.d, ib)); n++
      }
      if (s / n < meilleur) { meilleur = s / n; ou = [dx, dy] }
    }
    // La netteté : les pixels gris (ni le papier, ni l'encre) des deux
    // rectangles ; une image floue en a beaucoup plus
    const gris = (I, r, dx, dy) => { let g = 0; for (let y = 0; y < ra.h; y++) for (let x = 0; x < ra.l; x++) { const v = lum(I.d, ((r.y + y + dy) * I.l + r.x + x + dx) * 4); if (v > 60 && v < 200) g++ } return g }
    return { ecart: meilleur, ou, grisA: gris(A, ra, 0, 0), grisB: ou ? gris(B, rb, ou[0], ou[1]) : 0 }
  }
})

/** La mise en page d'une page, comme l'export la calcule (le module, servi par Vite) */
const MISE = async (id) => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(id ?? a.page).values()]
  await ap.mesurer(formes)
  const b = ap.boite(formes)
  const obst = formes.filter(f => !(f.type === 'polygone' && f.prolonge)).map(f => ap.boite([f])).filter(Boolean)
  const mp = m.mettreEnPage(b, obst)
  return { mp, DPR: m.DPR_PDF, boite: b }
}
const ctrlP = page => async () => { await page.mouse.move(683, 384); await page.keyboard.press('Control+p') }
const menuDeLaPage = page => async () => { await page.mouse.click(1000, 600, { button: 'right' }); await page.waitForTimeout(150); await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Exporter la page en PDF' }).click() }
const menuFichier = page => async () => { await page.click('.barre-haut .bouton.points'); await page.waitForTimeout(100); await page.locator('.menu-flottant:not([hidden]) .menu-item[data-action="exporter-pdf"]').click() }
const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)

// =============== 1. Une page courte, par Ctrl + P ===============
if (faire('court')) {
  const { ctx, page } = await ouvrir({}, 'court')
  await page.evaluate(ECRIRE, { pages: 1, lignes: 4, mots: 6, fond: 'carreaux' })
  await page.evaluate(() => { const a = window.__app; a.tableau.poser(a.page, { id: 'tri', type: 'polygone', x: 300, y: 500, z: 99, auteur: a.tableau.moi, pts: [0, 0, 200, 30, 80, 160], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] }) })
  await page.evaluate(() => { window.__pd = null; window.__imprime = false; window.print = () => { window.__imprime = true }; window.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'p') window.__pd = e.defaultPrevented }) })
  const r = await exporter(page, 'court', ctrlP(page))
  const pd = await page.evaluate(() => ({ pd: window.__pd, imprime: window.__imprime }))
  verifier('Ctrl + P : la touche est empêchée (pas l\'impression du navigateur), la fenêtre « Exporter en PDF » s\'ouvre', pd.pd === true && !pd.imprime && r.fen?.titre === 'Exporter en PDF' && /dialogue-pdf/.test(r.fen.classe), { pd, fen: r.fen })
  verifier('… un tableau d\'une page : « La page 1 », la case du fond, la note, Annuler / Exporter (le focus sur Exporter)',
    // (corrections « affichage » du lot 5 : la case nomme le fond de la page,
    // ici les petits carreaux ; avant, « Imprimer le fond de la page
    // (carreaux, Seyès, repère) » pour tous les fonds ; l'original est dans
    // lot5/corrections-affichage/avant-adaptation/lot3_P9-pdf.mjs)
    r.fen?.seul === 'La page 1' && !r.fen.radios.length && r.fen.caseFond === 'Imprimer le fond de la page : Petits carreaux'
    && r.fen.note === 'Chaque page est cadrée sur son contenu, à sa taille réelle quand elle tient sur la feuille (1 cm sur la page = 1 cm sur le papier), sinon réduite pour tenir sur la feuille ; une page haute continue sur les feuilles suivantes. Les instruments ne sont pas imprimés.'
    && JSON.stringify(r.fen.boutons) === '["Annuler","Exporter"]' && r.fen.focus === 'Exporter', r.fen)
  verifier(`Le fichier se télécharge : « page-1-${AUJOURDHUI}.pdf »`, r.propose === `page-1-${AUJOURDHUI}.pdf`, r.propose)
  const i = info(r.fichier)
  verifier('pdfinfo : 1 page, A4 portrait (595,28 × 841,89 pt), titre « Page 1 », producteur MEM teachingtool', i.pages === 1 && i.l === 595.28 && i.h === 841.89 && i.titre === 'Page 1' && /Producer:\s+MEM teachingtool/.test(i.texte), i.texte)
  const im = images(r.fichier)
  verifier('pdfimages : une image de 1654 × 2339 en couleurs indexées, 200 ppp', im.length === 1 && im[0].l === 1654 && im[0].h === 2339 && im[0].couleur === 'index' && im[0].xppi === 200 && im[0].yppi === 200, im)
  const m = await msgs(page)
  verifier('Les messages : « Export en PDF : préparation… », « … feuille 1 sur 1… », puis « PDF prêt : page-1-….pdf (1 feuille A4, … Ko). »',
    m.includes('Export en PDF : préparation…') && m.includes('Export en PDF : feuille 1 sur 1…') && new RegExp(`^PDF prêt : page-1-${AUJOURDHUI}\\.pdf \\(1 feuille A4, \\d+ Ko\\)\\.$`).test(m.at(-1)), m)
  const [png] = rendre(r.fichier, 60, 'court')
  // À 60 ppp : la zone utile commence à 12 mm (28 px) ; l'écriture en haut, cadrée
  const runs = await ana.evaluate(([b]) => window.suites(b, { x0: 0, x1: 496, y0: 0, y1: 664 }), [b64(png)])
  verifier('pdftoppm : la feuille se rend ; l\'écriture est cadrée en haut de la zone utile (sous la marge de 12 mm), ses 4 lignes et le triangle', runs.length >= 5 && runs[0][0] >= 28 && runs[0][0] < 45, runs)
  // 1 cm = 1 cm : deux traits posés à 400 unités (10 cm) l'un de l'autre
  await page.evaluate(() => { const a = window.__app; a.nouvellePage(); const t = a.tableau
    for (const [id, x] of [['g', 100], ['d', 500]]) t.poser(a.page, { id, type: 'segment', x, y: 100, z: 1, auteur: t.moi, dx: 0, dy: 200, couleur: '#1b2230', taille: 2 }) })
  const r2 = await exporter(page, 'regle', ctrlP(page))
  const [png2] = rendre(r2.fichier, 200, 'regle')
  const cols = await ana.evaluate(async ([b]) => { const { l, d } = await window.lire(b); const y = 200; const xs = []; for (let x = 0; x < l; x++) { const i = (y * l + x) * 4; if (d[i] < 128) xs.push(x) } return xs }, [b64(png2)])
  const groupes = cols.reduce((g, x) => { if (g.length && x - g.at(-1).at(-1) <= 1) g.at(-1).push(x); else g.push([x]); return g }, []).map(g => (g[0] + g.at(-1)) / 2)
  const cm = groupes.length === 2 ? (groupes[1] - groupes[0]) / 200 * 25.4 / 10 : null
  verifier('À l\'échelle réelle : deux traits à 400 unités l\'un de l\'autre sont à 10 cm sur le papier (à 0,5 mm près)', cm !== null && Math.abs(cm - 10) < 0.05, { groupes, cm })
  verifier('… sur un tableau de deux pages, Ctrl + P propose « La page 2 » (coché) ou « Tout le classeur : 2 pages »',
    JSON.stringify(r2.fen?.radios) === JSON.stringify([{ v: 'page', c: true, t: 'La page 2' }, { v: 'tout', c: false, t: 'Tout le classeur : 2 pages' }]), r2.fen)
  // Annuler, Échap : rien ne part
  await ctrlP(page)(); await page.waitForTimeout(150)
  await page.click('dialog[open] [data-a="annuler"]'); await page.waitForTimeout(150)
  await ctrlP(page)(); await page.waitForTimeout(150)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  const n0 = (await msgs(page)).length
  await page.waitForTimeout(300)
  verifier('« Annuler » et Échap ferment la fenêtre sans rien exporter', !(await dialogue(page)) && (await msgs(page)).length === n0)
  await ctx.close()
}

// =============== 2. Une page très haute de lignes d'écriture ===============
if (faire('haute')) {
  const { ctx, page } = await ouvrir({}, 'haute')
  const LIGNES = 70
  await page.evaluate(ECRIRE, { pages: 1, lignes: LIGNES, mots: 7, pas: 72, haut: 30, fond: 'blanc' })
  const r = await exporter(page, 'haute', ctrlP(page), { choisir: async () => { await page.evaluate(() => { const c = document.querySelector('dialog[open] input[name="pdf-fond"]'); c.checked = false }) } })
  const i = info(r.fichier)
  const mise = await page.evaluate(MISE)
  verifier(`Une page de ${LIGNES} lignes (${Math.round(mise.boite.h / 40)} cm) : ${mise.mp.feuilles.length} feuilles A4 portrait, à l'échelle réelle`, i.pages === mise.mp.feuilles.length && i.pages >= 4 && i.l === 595.28 && mise.mp.k === 1, { i: i.pages, mp: mise.mp.feuilles.length, k: mise.mp.k })
  const pngs = rendre(r.fichier, 60, 'haute')
  // À 60 ppp : la zone utile de 12 mm (28 px) à 281 mm (664 px) en hauteur, de 28 à 468 px en largeur
  const toutes = []
  let bandes = true
  const feuilles = []
  for (const [k, f] of pngs.entries()) {
    const runs = await ana.evaluate(([b]) => window.suites(b, { x0: 28, x1: 468, y0: 20, y1: 664 }), [b64(f)])
    toutes.push(...runs.map(x => x[1] - x[0]))
    feuilles.push(runs)
    // La bande blanche au bas de chaque feuille (sauf la dernière) : entre la
    // dernière ligne et le bas de la zone utile, et la ligne d'avant finit loin du bord
    if (k < pngs.length - 1 && !(runs.length && 664 - runs.at(-1)[1] >= 2)) bandes = false
  }
  const med = [...toutes].sort((a, b) => a - b)[toutes.length >> 1]
  verifier(`À 60 ppp : chaque ligne d'écriture paraît une fois, entière (${LIGNES} suites d'encre en tout, toutes de la même hauteur)`, toutes.length === LIGNES && toutes.every(h => h >= med * 0.75 && h <= med * 1.3), { n: toutes.length, med, toutes })
  verifier('… aucune coupe ne traverse une ligne : une bande blanche au bas de chaque feuille', bandes, feuilles.map(x => x.at(-1)))
  // Une ligne coupée commencerait au bord même de la zone utile (la rangée 28)
  verifier('… les feuilles de suite reprennent sous le haut de la zone utile, sans ligne coupée en tête', feuilles.slice(1).every(x => x.length && x[0][0] >= 30 && x[0][0] < 28 + 42), feuilles.map(x => x[0]))
  // Le pied de page : de l'encre grise dans la marge du bas, à gauche et à droite
  const pied = await ana.evaluate(async ([b]) => [await window.compter(b, { x0: 28, x1: 200, y0: 664, y1: 702 }, 'r < 200'), await window.compter(b, { x0: 400, x1: 468, y0: 664, y1: 702 }, 'r < 200')], [b64(pngs[1])])
  verifier('Le pied de page est imprimé dans la marge du bas, à gauche (la page) et à droite (le numéro de la feuille)', pied[0] > 20 && pied[1] > 5, pied)
  const textes = await page.evaluate(async () => {
    const m = await import('/src/sorties/mise-en-page.ts')
    return [m.piedDePage({ numero: 1, nom: null, partie: 2, parties: 5, k: 1, feuille: 2, feuilles: 5 }), m.piedDePage({ numero: 3, nom: 'Exercice 12 p. 84', partie: 1, parties: 1, k: 0.72, feuille: 4, feuilles: 12 })]
  })
  verifier('… ses textes : « Page 1 (2/5) » · « 2 / 5 » ; « Page 3 · Exercice 12 p. 84 · réduite à 72 % » · « 4 / 12 »', textes[0].gauche === 'Page 1 (2/5)' && textes[0].droite === '2 / 5' && textes[1].gauche === 'Page 3 · Exercice 12 p. 84 · réduite à 72 %' && textes[1].droite === '4 / 12', textes)
  // Une grande figure à cheval sur la fin de la première feuille : on coupe au-dessus d'elle
  await page.evaluate(() => { const a = window.__app, t = a.tableau; a.nouvellePage()
    for (let l = 0; l < 8; l++) t.poser(a.page, { id: 's' + l, type: 'segment', x: 100, y: 100 + l * 80, z: l, auteur: t.moi, dx: 500, dy: 0, couleur: '#1b2230', taille: 3 })
    t.poser(a.page, { id: 'fig', type: 'cercle', x: 400, y: 1050, z: 50, auteur: t.moi, r: 180, couleur: '#2a8a4a', taille: 3 })
    t.poser(a.page, { id: 'bas', type: 'segment', x: 100, y: 1900, z: 51, auteur: t.moi, dx: 500, dy: 0, couleur: '#1b2230', taille: 3 }) })
  const r2 = await exporter(page, 'figure', ctrlP(page))
  const p2 = rendre(r2.fichier, 60, 'figure')
  const vert = await ana.evaluate(async (bs) => { const r = []; for (const b of bs) r.push(await window.compter(b, { x0: 28, x1: 468, y0: 20, y1: 664 }, 'g > r + 40 && g > b + 25')); return r }, p2.map(b64))
  verifier('Une grande figure (un cercle) qui passerait la fin de la feuille : la coupe se fait au-dessus d\'elle, elle est entière sur la feuille suivante', p2.length >= 2 && vert[0] === 0 && vert[1] > 100, vert)
  await ctx.close()
}

// =============== 3. Une page large, une page très large ===============
if (faire('large')) {
  const { ctx, page } = await ouvrir({}, 'large')
  await page.evaluate(() => { const a = window.__app, t = a.tableau
    t.poser(a.page, { id: 'l1', type: 'segment', x: 0, y: 0, z: 1, auteur: t.moi, dx: 1600, dy: 0, couleur: '#1b2230', taille: 3 })
    t.poser(a.page, { id: 'l2', type: 'segment', x: 0, y: 600, z: 2, auteur: t.moi, dx: 1600, dy: 0, couleur: '#1b2230', taille: 3 })
    a.nouvellePage()
    t.poser(a.page, { id: 'tl', type: 'segment', x: 0, y: 0, z: 1, auteur: t.moi, dx: 8000, dy: 300, couleur: '#d64545', taille: 6 }) })
  const r = await exporter(page, 'large', ctrlP(page), { choisir: () => page.check('dialog[open] input[value="tout"]') })
  const i = info(r.fichier)
  const m = await msgs(page)
  const nomC = await nomDuClasseur(page)
  verifier('Tout le classeur : « <nom du classeur> AAAA-MM-JJ.pdf », titre « <nom du classeur> · 9 octobre 2026 » (lot 4)', r.propose === `${nomC} ${AUJOURDHUI}.pdf` && new RegExp(`^${nomC} · \\d+(er)? \\S+ \\d{4}$`).test(i.titre), { p: r.propose, t: i.titre })
  verifier('Une page large (1 600 × 600 unités) et une très large : deux feuilles en paysage (841,89 × 595,28 pt)', i.pages === 2 && i.l === 841.89 && i.h === 595.28, i.texte)
  verifier('Le message dit la page très réduite : « La page 2 est très large : réduite à 14 %. »', /^PDF prêt : .* \d{4}-\d\d-\d\d\.pdf \(2 feuilles A4, .*\)\. La page 2 est très large : réduite à 14 %\.$/.test(m.at(-1)), m.at(-1))
  const mise = await page.evaluate(MISE, await page.evaluate(() => window.__app.pages[0]))
  verifier('… la page large est réduite à la largeur utile du paysage (273 mm) : k ≈ 0,68', Math.abs(mise.mp.k - 273 / (1616 * 0.25)) < 0.01 && mise.mp.papier.orientation === 'paysage', mise.mp.k)
  await ctx.close()
}

// =============== 4. Des formules et une image, nettes ===============
if (faire('formules')) {
  const { ctx, page } = await ouvrir({ deviceScaleFactor: 2 }, 'formules')
  await construire(page, 'blanc')
  const Z = 0.9449 * 200 / 96 / 2
  // L'écran à 1,9685 pixel par unité (le PDF à 200 ppp, à l'échelle réelle)
  await page.evaluate(z => { const a = window.__app; a.allerVers({ x: 40, y: -20, z }, 0); a.rafraichir() }, Z)
  await page.waitForTimeout(400)
  const ecran = await page.evaluate(() => {
    const r = id => { const a = window.__app, f = a.tableau.formesDe(a.page).get(id), z = a.cam.z, zone = document.getElementById('zone').getBoundingClientRect()
      return { x: (zone.left + f.x * z + a.cam.x) * 2, y: (zone.top + f.y * z + a.cam.y) * 2 } }
    return { f1: r('p4-f1'), f3: r('p4-f3'), f4: r('p4-f4'), img: r('p4-image') }
  })
  await page.addStyleTag({ content: '#app > :not(#zone) { visibility: hidden !important; } .toast { display: none !important; }' })
  await page.mouse.move(1, 1); await page.waitForTimeout(200)
  const capture = D + '/formules-ecran.png'
  await page.screenshot({ path: capture })
  await page.addStyleTag({ content: '#app > :not(#zone) { visibility: visible !important; }' })
  const r = await exporter(page, 'formules', ctrlP(page))
  const [png] = rendre(r.fichier, 200, 'formules')
  const mise = await page.evaluate(MISE)
  const f = mise.mp.feuilles[0], k = mise.DPR
  const pos = await page.evaluate(([c, d]) => { const a = window.__app, F = a.tableau.formesDe(a.page)
    const p = id => { const g = F.get(id); return { x: (g.x * c.z + c.x) * d, y: (g.y * c.z + c.y) * d } }
    return { f1: p('p4-f1'), f3: p('p4-f3'), f4: p('p4-f4'), img: p('p4-image') } }, [f.cam, k])
  const tailles = await page.evaluate(() => { const a = window.__app, ap = a.ui.apercus, F = a.tableau.formesDe(a.page)
    return Object.fromEntries(['p4-f1', 'p4-f3', 'p4-f4'].map(id => [id, ap.formules.taille(F.get(id))])) })
  const ecarts = {}
  for (const [cle, id] of [['f1', 'p4-f1'], ['f3', 'p4-f3'], ['f4', 'p4-f4']]) {
    const t = tailles[id], L = Math.floor(t.l * 1.9685) - 2, H = Math.floor(t.h * 1.9685) - 2
    ecarts[cle] = await ana.evaluate(([a, ra, b, rb]) => window.ecart(a, ra, b, rb, 4),
      [b64(capture), { x: Math.round(ecran[cle].x) + 1, y: Math.round(ecran[cle].y) + 1, l: L, h: H }, b64(png), { x: Math.round(pos[cle].x) + 1, y: Math.round(pos[cle].y) + 1 }])
  }
  if (process.env.P9_DEBUG) console.log(JSON.stringify({ ecran, pos, tailles }))
  verifier('Les formules du PDF (rendu à 200 ppp) sont celles de l\'écran à la même échelle : moins de 8 d\'écart moyen sur 255 dans leur boîte, aussi nettes (pas beaucoup plus de pixels gris : moins de 1,5 fois)',
    Object.values(ecarts).every(e => e.ecart < 8 && e.grisB <= e.grisA * 1.5), ecarts)
  console.log("      écarts des formules (sur 255) : " + Object.entries(ecarts).map(([k, e]) => k + " " + e.ecart.toFixed(2) + " (gris " + e.grisA + " / " + e.grisB + ")").join(", "))
  const eImg = await ana.evaluate(([a, ra, b, rb]) => window.ecart(a, ra, b, rb, 4),
    [b64(capture), { x: Math.round(ecran.img.x) + 4, y: Math.round(ecran.img.y) + 4, l: 360, h: 220 }, b64(png), { x: Math.round(pos.img.x) + 4, y: Math.round(pos.img.y) + 4 }])
  verifier('L\'image importée est nette : moins de 6 d\'écart moyen avec l\'écran à la même échelle', eImg.ecart < 6 && eImg.grisB <= eImg.grisA * 1.5, eImg)
  // La formule \sqrt de KaTeX (un SVG) et les noms des points : de l'encre, pas des rectangles gris
  const gris = await ana.evaluate(async ([b, p, t]) => window.compter(b, { x0: Math.round(p.x), x1: Math.round(p.x + t.l * 1.9685), y0: Math.round(p.y), y1: Math.round(p.y + t.h * 1.9685) }, 'r < 90'), [b64(png), pos.f3, tailles['p4-f3']])
  verifier('… une formule est écrite (de l\'encre foncée), pas un rectangle d\'attente', gris > 200, gris)
  await ctx.close()
}

// =============== 5. Une page vide parmi d'autres ; tout vide ===============
if (faire('vide')) {
  const { ctx, page } = await ouvrir({}, 'vide')
  await page.evaluate(ECRIRE, { pages: 1, lignes: 3, mots: 5 })
  await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage(); a.nouvellePage() })
  await page.evaluate(ECRIRE, { pages: 1, lignes: 3, mots: 5, nouvelle: false })
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[0]) })
  const r = await exporter(page, 'vide', menuFichier(page))
  const i = info(r.fichier), m = await msgs(page)
  verifier('Tout le classeur (pages 1 à 4, les 2 et 3 vides) : 2 feuilles, pas de feuille blanche', i.pages === 2, i.pages)
  verifier('… le message : « Les pages 2 et 3 sont vides : elles ne sont pas dans le PDF. »', /\(2 feuilles A4, [^)]*\)\. Les pages 2 et 3 sont vides : elles ne sont pas dans le PDF\.$/.test(m.at(-1)), m.at(-1))
  verifier('… la fenêtre ouverte par le menu ⋯ dit « Tout le classeur : 4 pages », sans choix', r.fen?.seul === 'Tout le classeur : 4 pages' && !r.fen.radios.length, r.fen)
  await page.evaluate(() => { const a = window.__app; a.allerPage(a.pages[1]) })
  await page.waitForTimeout(700)
  const r2 = await exporter(page, 'vide2', ctrlP(page), { attente: 4000 })
  const m2 = await msgs(page)
  verifier('La page vide seule (Ctrl + P) : pas de fichier, « Rien à exporter : la page est vide. »', !r2.fichier && m2.at(-1) === 'Rien à exporter : la page est vide.', m2.slice(-2))
  await page.mouse.click(1000, 600, { button: 'right' }); await page.waitForTimeout(150)
  const grisees = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].filter(b => /Copier la page en image|Exporter la page en PDF/.test(b.textContent)).map(b => b.getAttribute('aria-disabled')))
  await page.keyboard.press('Escape')
  verifier('Sur une page vide (parmi d\'autres), « Copier la page en image » et « Exporter la page en PDF… » sont grisées', JSON.stringify(grisees) === '["true","true"]', grisees)
  await ctx.close()
  // Un tableau neuf, d'une seule page vide : l'entrée du menu de la page est grisée
  const { ctx: ctx2, page: page2 } = await ouvrir({}, 'vide-seule')
  await page2.mouse.click(1000, 600, { button: 'right' }); await page2.waitForTimeout(150)
  const grise = await page2.evaluate(() => [...document.querySelectorAll('.menu-flottant[aria-label="Page"] .menu-item')].find(b => b.textContent.includes('Exporter la page en PDF'))?.getAttribute('aria-disabled'))
  await page2.keyboard.press('Escape')
  verifier('Un tableau d\'une seule page, vide : « Exporter la page en PDF… » est grisée', grise === 'true', grise)
  await ctx2.close()
}

// =============== 6. Le fond imprimé ou non ; les instruments absents ===============
if (faire('fond')) {
  const { ctx, page } = await ouvrir({}, 'fond')
  await page.evaluate(ECRIRE, { pages: 1, lignes: 3, mots: 5, fond: 'carreaux' })
  const bleus = async f => ana.evaluate(([b]) => window.compter(b, { x0: 30, x1: 460, y0: 30, y1: 660 }, 'b > r + 8 && r > 170'), [b64(rendre(f, 60, f.split('/').pop().replace('.pdf', ''))[0])])
  const r1 = await exporter(page, 'fond-oui', ctrlP(page))
  verifier('La case du fond est cochée au départ (le réglage gardé)', r1.fen?.fond === true, r1.fen)
  const b1 = await bleus(r1.fichier)
  const r2 = await exporter(page, 'fond-non', ctrlP(page), { choisir: () => page.uncheck('dialog[open] input[name="pdf-fond"]') })
  const b2 = await bleus(r2.fichier)
  verifier('Fond coché : les carreaux sur toute la zone utile ; décoché : la feuille blanche', b1 > 20000 && b2 < 100, { b1, b2 })
  const garde = await page.evaluate(() => ({ cle: localStorage.getItem('mem-sortie-fond'), ap: window.__app.ui.apercus.fondImprime() }))
  await page.reload(); await pret(page)
  const r3 = await exporter(page, 'fond-garde', ctrlP(page))
  verifier('… le choix est gardé (clé « mem-sortie-fond », partagée avec l\'image copiée), même après un rechargement', garde.cle === '0' && !garde.ap && r3.fen?.fond === false, { garde, fen: r3.fen })
  // Les instruments posés : le PDF est le même, au pixel près
  await page.evaluate(() => { const a = window.__app; for (const n of ['regle', 'equerre', 'rapporteur']) if (!a.instrumentVisible(n)) a.basculerInstrument(n); a.ui.maj() })
  await page.waitForTimeout(300)
  const poses = await page.evaluate(() => ['regle', 'equerre', 'rapporteur'].every(n => window.__app.instrumentVisible(n)))
  const r4 = await exporter(page, 'instruments', ctrlP(page))
  const [pa] = rendre(r3.fichier, 100, 'sans-instr'), [pb] = rendre(r4.fichier, 100, 'avec-instr')
  const diff = await ana.evaluate(([a, b]) => window.differents(a, b), [b64(pa), b64(pb)])
  verifier('Les instruments posés (règle, équerre, rapporteur) ne sont pas imprimés : la feuille est la même qu\'avant de les poser, au pixel près', poses && diff === 0, { poses, diff })
  await ctx.close()
}

// =============== 7. Les noms, les titres, les menus ; l'image d'une page très haute ===============
if (faire('noms')) {
  const { ctx, page } = await ouvrir({}, 'noms')
  await page.evaluate(ECRIRE, { pages: 7, lignes: 2, mots: 4 })
  await page.evaluate(() => { const a = window.__app; a.tableau.renommerPage(a.pages[2], 'Exercice 12 p. 84'); a.allerPage(a.pages[2]) })
  await page.waitForTimeout(700)
  // Le menu de la page
  await page.mouse.click(1000, 600, { button: 'right' }); await page.waitForTimeout(150)
  const entrees = await page.evaluate(() => [...document.querySelector('.menu-flottant[aria-label="Page"]').children].map(c => c.tagName === 'HR' ? '─' : (c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim() + (c.querySelector('.touche') ? ' [' + c.querySelector('.touche').textContent + ']' : '')))
  await page.keyboard.press('Escape')
  verifier('Le menu de la page : … Dupliquer la page · Toutes les pages… · ─ · Copier la page en image · Exporter la page en PDF… (Ctrl + P)',
    JSON.stringify(entrees.slice(3)) === JSON.stringify(['─', 'Dupliquer la page [Ctrl + Maj + D]', 'Toutes les pages… [Maj + P]', '─', 'Copier la page en image', 'Exporter la page en PDF… [Ctrl + P]']), entrees)
  const r1 = await exporter(page, 'nommee', menuDeLaPage(page))
  verifier('Une page nommée : « Exercice 12 p. 84.pdf », titre « Page 3 · Exercice 12 p. 84 » ; la fenêtre dit « La page 3 · Exercice 12 p. 84 »',
    r1.propose === 'Exercice 12 p. 84.pdf' && info(r1.fichier).titre === 'Page 3 · Exercice 12 p. 84' && r1.fen?.radios[0]?.t === 'La page 3 · Exercice 12 p. 84' && r1.fen.radios[1]?.t === 'Tout le classeur : 7 pages', { p: r1.propose, fen: r1.fen })
  // Le menu ⋯
  await page.click('.barre-haut .bouton.points'); await page.waitForTimeout(100)
  // (Adapté au lot 4, morceau C10 : la ligne du Drive du bloc de l'état porte son bouton quand une copie
  // attend, « Se connecter à Google » ; les entrées du menu sont les autres)
  // (Adapté au lot 5, morceau K9 : « Cet appareil » et ses deux cases entrent volontairement au bout du menu ⋯ ; lot5/K9-affichage.mjs les vérifie)
  const fichier = await page.evaluate(() => [...document.querySelectorAll('.menu-flottant.menu-large:not([hidden]) .menu-item:not(.action-etat):not([data-action="contraste"]):not([data-action="noms-outils"]):not([data-action="nouvelle-seance"]):not([data-action="renommer-seance"]):not([data-action="seance-precedente"]):not([data-action="retour-aujourdhui"])')].map(e => ({ l: e.querySelector('.libelle').firstChild.textContent, aide: e.querySelector('small')?.textContent })))
  await page.keyboard.press('Escape')
  // (Adapté au lot 4, morceau C4 : Chromium a showSaveFilePicker ; l'entrée
  // « Enregistrer automatiquement dans un fichier… » suit « Enregistrer le classeur… »)
  // (Adapté au lot 4, morceau C5 : « Bibliothèque des classeurs… » en tête)
  // (Adapté au lot 4, morceau C10 : « Copie sur le Drive… » avant « Ouvrir un classeur… »)
  verifier('Le menu ⋯ : Enregistrer le classeur… · (la clé, lot 4) · Ouvrir un classeur… · Exporter le classeur en PDF… (avec son aide)',
    JSON.stringify(fichier.map(x => x.l)) === JSON.stringify(['Bibliothèque des classeurs…', 'Enregistrer le classeur…', 'Enregistrer automatiquement dans un fichier…', 'Copie sur le Drive…', 'Ouvrir un classeur…', 'Exporter le classeur en PDF…']) && fichier[5].aide === 'Toutes les pages, cadrées sur leur contenu, en feuilles A4 à imprimer ou à déposer dans l\'ENT.', fichier)
  // La trieuse : les pages 2, 5 et 7 choisies (Ctrl + clic), « Exporter en PDF » du bandeau des pages choisies
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(250)
  const bandeau = await page.evaluate(() => [...document.querySelectorAll('.trieuse-actions .trieuse-bouton')].filter(b => b.offsetParent).map(b => b.getAttribute('aria-label')))
  verifier('Le bandeau de la trieuse : « Exporter en PDF » (tout le tableau), avant la corbeille', bandeau.includes('Exporter en PDF') && bandeau.indexOf('Exporter en PDF') === bandeau.findIndex(x => /^Corbeille/.test(x)) - 1, bandeau)
  for (const k of [1, 4, 6]) { await page.locator('.trieuse .carte').nth(k).click({ modifiers: ['Control'] }); await page.waitForTimeout(60) }
  const bandeau2 = await page.evaluate(() => [...document.querySelectorAll('.trieuse-actions .trieuse-bouton')].filter(b => b.offsetParent).map(b => b.getAttribute('aria-label')))
  verifier('… des pages choisies : un seul « Exporter en PDF », celui des pages choisies (entre Supprimer et Tout désélectionner)',
    bandeau2.filter(x => x === 'Exporter en PDF').length === 1 && bandeau2[bandeau2.indexOf('Exporter en PDF') - 1] === 'Supprimer' && bandeau2[bandeau2.indexOf('Exporter en PDF') + 1] === 'Tout désélectionner', bandeau2)
  const r2 = await exporter(page, 'choisies', () => page.locator('.trieuse-choix .trieuse-bouton', { hasText: 'Exporter en PDF' }).click())
  const i2 = info(r2.fichier)
  verifier(`Les pages choisies (2, 5 et 7) : « Les pages 2, 5 et 7 », « pages-2-5-7-${AUJOURDHUI}.pdf », titre « Pages 2, 5 et 7 », 3 feuilles`,
    r2.fen?.seul === 'Les pages 2, 5 et 7' && r2.propose === `pages-2-5-7-${AUJOURDHUI}.pdf` && i2.titre === 'Pages 2, 5 et 7' && i2.pages === 3, { fen: r2.fen, p: r2.propose, t: i2.titre, n: i2.pages })
  verifier('… la trieuse est restée ouverte pendant l\'export, ses pages toujours choisies', await page.evaluate(() => !document.querySelector('.trieuse').hidden && document.querySelectorAll('.trieuse .carte[aria-selected="true"]').length === 3))
  // Le menu d'une vignette choisie parmi plusieurs, puis d'une seule page
  await page.locator('.trieuse .carte .carte-options').nth(4).click(); await page.waitForTimeout(120)
  const mv = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette .menu-item')].map(b => b.querySelector('.libelle')?.firstChild?.textContent.trim()))
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  verifier('Le menu d\'une page choisie parmi plusieurs : Dupliquer · Exporter en PDF… · Supprimer', JSON.stringify(mv) === JSON.stringify(['Dupliquer', 'Exporter en PDF…', 'Supprimer']), mv)
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  await page.locator('.trieuse .carte .carte-options').nth(3).click(); await page.waitForTimeout(120)
  const mv1 = await page.evaluate(() => [...document.querySelectorAll('.trieuse .menu-vignette .menu-item')].map(b => b.querySelector('.libelle')?.firstChild?.textContent.trim()))
  verifier('Le menu d\'une vignette : … Copier en image · Exporter en PDF… · Supprimer', JSON.stringify(mv1.slice(-3)) === JSON.stringify(['Copier en image', 'Exporter en PDF…', 'Supprimer']), mv1)
  const r3 = await exporter(page, 'vignette', () => page.locator('.trieuse .menu-vignette .menu-item', { hasText: 'Exporter en PDF' }).click())
  verifier(`Depuis le menu de la vignette 4 : « La page 4 » coché, « page-4-${AUJOURDHUI}.pdf », titre « Page 4 »`, r3.fen?.radios[0]?.t === 'La page 4' && r3.fen.radios[0].c && r3.propose === `page-4-${AUJOURDHUI}.pdf` && info(r3.fichier).titre === 'Page 4', { fen: r3.fen, p: r3.propose })
  // Plus de cinq pages choisies : « pages-AAAA-MM-JJ.pdf »
  await page.keyboard.press('Control+a'); await page.waitForTimeout(80)
  const r4 = await exporter(page, 'six', () => page.keyboard.press('Control+p'))
  verifier(`Ctrl + A puis Ctrl + P dans la trieuse : les 7 pages choisies, « pages-${AUJOURDHUI}.pdf », titre « 7 pages de « <nom du classeur> » »`, r4.fen?.seul === 'Les pages 1, 2, 3, 4, 5, 6 et 7' && r4.propose === `pages-${AUJOURDHUI}.pdf` && info(r4.fichier).titre === `7 pages de « ${await nomDuClasseur(page)} »`, { fen: r4.fen, p: r4.propose })
  // Ctrl + P sans pages choisies, dans la trieuse : tout le tableau
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  await page.keyboard.press('Control+p'); await page.waitForTimeout(200)
  const f5 = await dialogue(page)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  verifier('Ctrl + P dans la trieuse, rien de choisi : « Tout le classeur : 7 pages » (la trieuse reste ouverte derrière)', f5?.seul === 'Tout le classeur : 7 pages' && await page.evaluate(() => !document.querySelector('.trieuse').hidden), f5)
  // Le bouton du bandeau (tout le tableau)
  const r5 = await exporter(page, 'bandeau', () => page.locator('.trieuse-actions > .trieuse-bouton', { hasText: 'Exporter en PDF' }).click())
  verifier('« Exporter en PDF » du bandeau : tout le classeur, 7 feuilles', r5.fen?.seul === 'Tout le classeur : 7 pages' && info(r5.fichier).pages === 7, r5.fen)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  // L'image d'une page très haute : le message propose « Exporter en PDF »
  await page.evaluate(() => { const a = window.__app, t = a.tableau; a.nouvellePage()
    t.poser(a.page, { id: 'h', type: 'segment', x: 100, y: 0, z: 1, auteur: t.moi, dx: 0, dy: 4000, couleur: '#1b2230', taille: 3 })
    t.poser(a.page, { id: 'h2', type: 'segment', x: 100, y: 0, z: 2, auteur: t.moi, dx: 400, dy: 0, couleur: '#1b2230', taille: 3 }) })
  await page.waitForTimeout(700)
  await page.mouse.click(1000, 600, { button: 'right' }); await page.waitForTimeout(150)
  await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Copier la page en image' }).click()
  await page.waitForFunction(() => window.__msgs.some(m => m.startsWith('Image copiée')), null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(100)
  const actions = await page.evaluate(() => [...document.querySelectorAll('.toast.visible button.action')].map(b => b.textContent))
  verifier('Une page plus haute que trois fois sa largeur, copiée en image : le message propose « Exporter en PDF »', actions.includes('Exporter en PDF'), actions)
  const haute = await page.evaluate(() => window.__app.pages.indexOf(window.__app.page) + 1)
  const r6 = await exporter(page, 'depuis-image', () => page.locator('.toast button.action', { hasText: 'Exporter en PDF' }).click())
  verifier(`… qui ouvre la fenêtre de cette page (« La page ${haute} ») et la découpe en feuilles A4`, r6.fen?.radios[0]?.t === `La page ${haute}` && info(r6.fichier).pages >= 4, { haute, fen: r6.fen })
  await ctx.close()
}

// =============== 8. Dix pages chargées ; un trait écrit pendant l'export ===============
if (faire('dense')) {
  const { ctx, page } = await ouvrir({}, 'dense')
  const ids = await page.evaluate(ECRIRE, { pages: 10, lignes: 26, mots: 16, pas: 40, haut: 20, ech: 1.6, fond: 'seyes' })
  const n = await page.evaluate(() => window.__app.formes.length)
  // On regarde la dernière page : on y écrit pendant l'export, dans un vide
  // (trois lignes d'écriture retirées)
  await page.evaluate(() => { const a = window.__app, t = a.tableau; a.allerPage(a.pages.at(-1))
    t.supprimer(a.page, [...t.formesDe(a.page).values()].filter(f => f.y > 500 && f.y < 680).map(f => f.id)) })
  await page.waitForTimeout(800)
  await page.evaluate(() => { window.__longues = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask' }) })
  const vu = await page.evaluate(() => { const a = window.__app, z = a.cam.z, zone = document.getElementById('zone').getBoundingClientRect(); return { x: zone.left + a.cam.x + 400 * z, y: zone.top + a.cam.y + 580 * z, z } })
  let gestes = null
  const r = await exporter(page, 'dense', ctrlP(page), {
    choisir: () => page.check('dialog[open] input[value="tout"]'),
    pendant: async () => {
      // Que l'export soit bien parti (sa deuxième feuille), puis un trait à la souris
      await page.waitForFunction(() => window.__msgs.some(m => /feuille 2 sur/.test(m)), null, { timeout: 20000 }).catch(() => {})
      await page.evaluate(() => { window.__images = []; const f = t => { window.__images.push(t); if (window.__images.length < 400) requestAnimationFrame(f) }; requestAnimationFrame(f) })
      const durees = []
      await page.mouse.move(vu.x, vu.y); await page.mouse.down()
      for (let k = 1; k <= 30; k++) { const t0 = Date.now(); await page.mouse.move(vu.x + k * 8, vu.y + Math.sin(k / 3) * 10); durees.push(Date.now() - t0); await page.waitForTimeout(16) }
      await page.mouse.up()
      const images = await page.evaluate(() => window.__images.slice(0, 60))
      const ecarts = images.slice(1).map((t, i) => t - images[i])
      gestes = { durees, maxImage: Math.max(...ecarts), msgs: (await msgs(page)).filter(m => /feuille/.test(m)).length }
    },
  })
  const i = info(r.fichier), m = await msgs(page)
  const longues = await page.evaluate(() => window.__longues)
  const feuilleMo = i.octets / i.pages / 1024 / 1024
  console.log(`      10 pages de ${n} traits (Seyès) : ${i.pages} feuilles, ${(i.octets / 1024 / 1024).toFixed(2)} Mo (${Math.round(feuilleMo * 1024)} Ko par feuille), en ${r.ms} ms ; tâches longues : ${JSON.stringify(longues)}`)
  verifier('10 pages chargées (plus de 400 traits chacune, Seyès) : 10 feuilles, de l\'ordre de 0,3 Mo par feuille', i.pages === 10 && n > 400 && feuilleMo > 0.1 && feuilleMo < 0.6, { n, pages: i.pages, feuilleMo })
  verifier('… aucune tâche longue de plus de 150 ms pendant l\'export', longues.every(d => d <= 150), longues)
  const prog = m.filter(x => /^Export en PDF : feuille \d+ sur 10…$/.test(x))
  verifier('… le message de progression change à chaque feuille (« feuille 1 sur 10… » … « feuille 10 sur 10… »)', prog.includes('Export en PDF : feuille 1 sur 10…') && prog.includes('Export en PDF : feuille 10 sur 10…') && new Set(prog).size === 10, prog)
  verifier('Un trait écrit pendant l\'export s\'écrit sans à-coup (chaque mouvement traité en moins de 120 ms, pas d\'image d\'écran sautée de plus de 120 ms)', gestes && Math.max(...gestes.durees) < 120 && gestes.maxImage < 120, gestes)
  const ecrit = await page.evaluate(() => { const a = window.__app; return a.formes.filter(f => f.type === 'trait' && !String(f.id).startsWith('e')).length })
  // La dernière feuille (la page où l'on a écrit) : le vide sous l'écriture reste vide
  const mise = await page.evaluate(MISE, ids.at(-1))
  const derniere = rendre(r.fichier, 100, 'dense').at(-1)
  const f = mise.mp.feuilles[0], k = 100 / 96
  const zoneTrait = { x0: Math.round((400 * f.cam.z + f.cam.x) * k), x1: Math.round((660 * f.cam.z + f.cam.x) * k), y0: Math.round((560 * f.cam.z + f.cam.y) * k), y1: Math.round((620 * f.cam.z + f.cam.y) * k) }
  const encre = await ana.evaluate(([b, z]) => window.compter(b, z, 'r < 120 && g < 120'), [b64(derniere), zoneTrait])
  verifier('… il est bien sur la page, mais pas dans le PDF (pas même à moitié) : les formes ont été prises au lancement', ecrit === 1 && encre === 0, { ecrit, encre, zoneTrait })
  // Un second export pendant le premier : refusé, dit
  await ctx.close()
}

// =============== 9. Au doigt, au clavier ===============
if (faire('doigt')) {
  const { ctx, page } = await ouvrir({ hasTouch: true, viewport: { width: 1024, height: 768 } }, 'doigt')
  await page.evaluate(ECRIRE, { pages: 4, lignes: 2, mots: 4 })
  const tap = async (sel, n = 0) => { const r = await page.locator(sel).nth(n).boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(220) }
  await tap('.rang'); await attendreOuverte(page); await page.waitForTimeout(250)
  await tap('.trieuse-choisir')
  await tap('.trieuse .carte', 1); await tap('.trieuse .carte', 3)
  const choisies = await page.evaluate(() => [...document.querySelectorAll('.trieuse .carte[aria-selected="true"]')].map(c => c.querySelector('.carte-numero').textContent))
  const r = await exporter(page, 'doigt', () => tap('.trieuse-choix .trieuse-bouton[aria-label="Exporter en PDF"]'), { toucher: true })
  verifier('Au doigt : « Choisir plusieurs », les pages 2 et 4 touchées, « Exporter en PDF » puis « Exporter » touchés : « pages-2-4-….pdf », 2 feuilles',
    JSON.stringify(choisies) === '["2","4"]' && r.fen?.seul === 'Les pages 2 et 4' && r.propose === `pages-2-4-${AUJOURDHUI}.pdf` && info(r.fichier).pages === 2, { choisies, fen: r.fen, p: r.propose })
  const tailles = await page.evaluate(() => [...document.querySelectorAll('.trieuse-actions .trieuse-bouton')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height))
  verifier('… les boutons du bandeau font 44 px de haut au moins', tailles.every(h => h >= 44), tailles)
  await ctx.close()
}
if (faire('clavier')) {
  const { ctx, page } = await ouvrir({}, 'clavier')
  await page.evaluate(ECRIRE, { pages: 3, lignes: 2, mots: 4 })
  await page.waitForTimeout(700)
  // Ctrl + P, Tab jusqu'au choix « Tout le classeur », flèche, Entrée sur Exporter
  await ctrlP(page)(); await page.waitForTimeout(150)
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab')
  const sur = await page.evaluate(() => ({ v: document.activeElement?.value, type: document.activeElement?.type }))
  await page.keyboard.press('ArrowDown'); await page.waitForTimeout(60)
  const choix = await page.evaluate(() => document.querySelector('dialog[open] input[value="tout"]').checked)
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab')
  const surExporter = await page.evaluate(() => document.activeElement?.textContent)
  const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await page.keyboard.press('Enter')
  const d = await dl
  verifier('Au clavier : Maj+Tab mène au choix « La page 1 », ↓ prend « Tout le classeur », Tab mène à Exporter, Entrée exporte les 3 pages',
    sur.type === 'radio' && choix && surExporter === 'Exporter' && d?.suggestedFilename() === `${await nomDuClasseur(page)} ${AUJOURDHUI}.pdf`, { sur, choix, surExporter, d: d?.suggestedFilename() })
  // Pendant l'export, un second : « Un export en PDF est déjà en cours. »
  await page.evaluate(ECRIRE, { pages: 6, lignes: 26, mots: 16, pas: 40, haut: 20, ech: 1.6, nouvelle: 'toujours' })
  await ctrlP(page)(); await page.waitForTimeout(150)
  await page.check('dialog[open] input[value="tout"]')
  const dl2 = page.waitForEvent('download', { timeout: 60000 }).catch(() => null)
  await page.click('dialog[open] [data-a="exporter"]'); await page.waitForTimeout(300)
  await ctrlP(page)(); await page.waitForTimeout(150)
  const pendant = { fen: !!(await dialogue(page)), m: (await msgs(page)).at(-1) }
  await dl2
  verifier('Ctrl + P pendant un export : pas de seconde fenêtre, « Un export en PDF est déjà en cours. »', !pendant.fen && pendant.m === 'Un export en PDF est déjà en cours.', pendant)
  await ctx.close()
}

// =============== 10. Les textes ; l'impression du navigateur ===============
if (faire('textes')) {
  const { ctx, page } = await ouvrir({}, 'textes')
  await page.evaluate(ECRIRE, { pages: 2, lignes: 2, mots: 4 })
  await ctrlP(page)(); await page.waitForTimeout(200)
  const tout = await page.evaluate(() => document.body.innerText + [...document.querySelectorAll('[title],[aria-label]')].map(e => e.title + e.getAttribute('aria-label')).join(' ') + document.querySelector('dialog[open]')?.textContent)
  verifier('Fenêtre ouverte : aucun texte ne dit « undefined », « NaN » ni « [object Object] »', !/\bundefined\b|\bNaN\b|\[object Object\]/.test(tout) && /1 cm sur la page = 1 cm sur le papier/.test(tout))
  await page.keyboard.press('Escape')
  await page.emulateMedia({ media: 'print' })
  const imp = await page.evaluate(() => ({ app: getComputedStyle(document.getElementById('app')).display, avant: getComputedStyle(document.body, '::before').content }))
  await page.emulateMedia({ media: 'screen' })
  verifier('À l\'impression du navigateur (Fichier › Imprimer) : le tableau et les barres cachés, une seule phrase « Pour imprimer : ⋯ → Exporter le classeur en PDF. »', imp.app === 'none' && imp.avant === '"Pour imprimer : ⋯ → Exporter le classeur en PDF."', imp)
  // Ni pendant la revue
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
  await page.evaluate(() => window.__app.ui.exporterPdf({ page: window.__app.page })); await page.waitForTimeout(150)
  verifier('Pendant la revue en classe, l\'export ne s\'ouvre pas', !(await dialogue(page)))
  await ctx.close()
}

// =============== 11. La version en un seul fichier, la version en ligne ===============
async function versionConstruite(url, nom, fichier) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await ctx.newPage()
  const avant = erreurs.length
  surveiller(page, nom)
  await page.goto(url)
  await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(600)
  // Deux traits au Stylo, et une formule par l'outil Formule
  for (const y of [250, 350]) {
    await page.mouse.move(400, y); await page.mouse.down()
    for (let k = 1; k <= 14; k++) await page.mouse.move(400 + k * 18, y + Math.sin(k / 2) * 20)
    await page.mouse.up(); await page.waitForTimeout(250)
  }
  // Une formule (l'outil Formule : F, un clic, la saisie, Entrée)
  await page.keyboard.press('f'); await page.mouse.click(500, 480); await page.waitForTimeout(300)
  await page.keyboard.type('\\frac{1}{2}+\\sqrt{x}'); await page.keyboard.press('Enter'); await page.waitForTimeout(400)
  const formules = await page.evaluate(() => document.querySelectorAll('#zone .formule').length)
  const dl = page.waitForEvent('download', { timeout: 30000 }).catch(() => null)
  await page.keyboard.press('Control+p'); await page.waitForTimeout(200)
  await page.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  let i = null
  if (d) { await d.saveAs(`${D}/${fichier}.pdf`); i = info(`${D}/${fichier}.pdf`) }
  let encre = 0
  if (i) { const [png] = rendre(`${D}/${fichier}.pdf`, 60, fichier); encre = await ana.evaluate(([b]) => window.compter(b, { x0: 0, x1: 490, y0: 0, y1: 490 }, 'r < 100'), [b64(png)]) }
  verifier(`${nom} : deux traits et une formule, Ctrl + P puis Exporter : un PDF d'une feuille A4 qui se rend, sans erreur JS`,
    formules === 1 && i && i.pages === 1 && [595.28, 841.89].includes(i.l) && encre > 200 && erreurs.length === avant, { formules, i: i?.texte, encre, e: erreurs.slice(avant) })
  await ctx.close()
}
if (faire('fichier')) {
  const UN = R + '/dist/index.html'
  if (!existsSync(UN)) verifier('dist/index.html existe (npm run build)', false)
  else await versionConstruite('file://' + UN, 'La version en un seul fichier (file://)', 'un-seul-fichier')
}
if (faire('enligne')) {
  let serveur = null
  const essai = async () => { try { return (await fetch('http://127.0.0.1:4180/index.html')).ok } catch { return false } }
  if (!await essai()) {
    serveur = spawn('python3', ['-m', 'http.server', '4180', '--bind', '127.0.0.1', '--directory', R + '/dist-pages'], { stdio: 'ignore' })
    for (let k = 0; k < 30 && !await essai(); k++) await new Promise(r => setTimeout(r, 200))
  }
  await versionConstruite('http://127.0.0.1:4180/index.html', 'La version en ligne (dist-pages, :4180)', 'en-ligne')
  serveur?.kill()
}

// =============== 12. Une feuille dominée par une photo : en JPEG ===============
if (faire('photo')) {
  const { ctx, page } = await ouvrir({}, 'photo')
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    // Une « photo » : du bruit coloré (aucune palette de 256 couleurs ne la couvre)
    const c = document.createElement('canvas'); c.width = 600; c.height = 450
    const x = c.getContext('2d'), im = x.createImageData(600, 450)
    let s = 2463534242
    const h = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 24) & 255 }
    for (let i = 0; i < im.data.length; i += 4) { im.data[i] = h(); im.data[i + 1] = h(); im.data[i + 2] = h(); im.data[i + 3] = 255 }
    x.putImageData(im, 0, 0)
    t.doc.getMap('images').set('photo-p9', c.toDataURL('image/png'))
    t.poser(a.page, { id: 'photo', type: 'image', src: 'photo-p9', l: 600, h: 450, m: [1.2, 0, 0, 1.2], x: 0, y: 0, z: 1, auteur: t.moi })
    t.poser(a.page, { id: 'legende', type: 'segment', x: 0, y: 600, z: 2, auteur: t.moi, dx: 700, dy: 0, couleur: '#1b2230', taille: 3 })
    a.nouvellePage()
    t.poser(a.page, { id: 'ecrit', type: 'segment', x: 0, y: 0, z: 1, auteur: t.moi, dx: 500, dy: 200, couleur: '#1b2230', taille: 3 })
    a.allerPage(a.pages[0])
  })
  await page.waitForTimeout(600)
  const r = await exporter(page, 'photo', menuFichier(page))
  const im = r.fichier ? images(r.fichier) : []
  verifier('Une feuille dominée par une photo part en JPEG (RVB, 200 ppp), la feuille d\'écriture en couleurs indexées', im.length === 2 && im[0].enc === 'jpeg' && im[0].couleur === 'rgb' && im[0].xppi === 200 && im[1].couleur === 'index', im)
  let rendu = true
  try { rendre(r.fichier, 40, 'photo') } catch { rendu = false }
  verifier('… le PDF se rend (pdftoppm)', rendu)
  await ctx.close()
}

await nav.close()
verifier('Aucune erreur JS', erreurs.length === 0, erreurs)
const echecs = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - echecs} / ${resultats.length} vérifications réussies`)
process.exit(echecs ? 1 : 0)
