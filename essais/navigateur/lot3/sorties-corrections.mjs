// Essais au navigateur des corrections « sorties » du lot 3 (le PDF et
// l'image copiée), par les vraies touches (Ctrl + P, Exporter) et les vrais
// fichiers (pdfinfo, pdfimages, pdftoppm) :
// 1. couleurs : une page chargée d'écriture (Seyès, puis page blanche) avec
//    de petites croix de couleur : dans le PDF, chaque croix a la couleur de
//    la feuille peinte sans palette (pas grise), et la feuille reste en
//    couleurs indexées (légère) ;
// 2. photo : la photo d'un énoncé (texte sombre sur papier beige) reste
//    lisible (la feuille en JPEG) ; une petite illustration en dégradés sur
//    une page d'écriture part en RVB sans perte (ses anneaux rouges gardés,
//    au pixel près) ; aucune tâche longue ;
// 3. paysage : une figure de 25 × 18,5 cm, une photo 4:3 : UNE feuille
//    paysage, pas deux ;
// 4. coupe : une figure qui commence vers le milieu d'une feuille et tient
//    sur une feuille passe entière sur la suivante ;
// 5. vides : un énoncé en haut, la correction un mètre plus bas : deux
//    feuilles, chacune écrite (pas de feuille blanche) ;
// 6. noms : un nom de point déplacé au-dessus de son sommet est sur l'image
//    copiée et dans le PDF ; sur une page haute, aucune coupe ne traverse
//    le nom d'un point ;
// 7. repère : les flèches des axes sont imprimées, dans la zone utile ;
// 8. encours : Ctrl + P pendant l'export de pages légères (une feuille toutes
//    les quelques centaines de millisecondes) : « Un export en PDF est déjà
//    en cours. » reste lisible (la progression ne le remplace pas aussitôt).
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
// node sorties-corrections.mjs [section…] (couleurs, photo, paysage, coupe, vides, noms, repere, encours)
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/sorties-travail/essai`
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 1500) : ''}`)
}
const erreurs = []
const nav = await chromium.launch()

async function ouvrir(nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  const page = await ctx.newPage()
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  await page.goto(URL0)
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(300)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
  return { ctx, page }
}

/** Ctrl + P, puis Exporter : le PDF téléchargé, enregistré sous ce nom */
async function exporter(page, nom) {
  await page.mouse.move(683, 384)
  await page.keyboard.press('Control+p')
  await page.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 3000 })
  const dl = page.waitForEvent('download', { timeout: 120000 })
  await page.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  await page.waitForTimeout(200)
  return f
}
const pages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f]).toString())?.[1])
const taillesPages = f => [...execFileSync('pdfinfo', ['-f', '1', '-l', '999', f]).toString().matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].map(m => [+m[1], +m[2]])
const images = f => execFileSync('pdfimages', ['-list', f]).toString().trim().split('\n').slice(2).map(l => {
  const c = l.trim().split(/\s+/)
  return { page: +c[0], couleur: c[5], enc: c[8], taille: c[14] }
})
/** Les feuilles du PDF rendues en PNG (base64), à ce nombre de points par pouce */
function rendre(f, ppp, nom) {
  const prefixe = `${D}/${nom}`
  const r = spawnSync('pdftoppm', ['-r', String(ppp), '-png', f, prefixe])
  if (r.status !== 0) throw new Error('pdftoppm : ' + r.stderr.toString())
  return readdirSync(D).filter(x => x.startsWith(nom + '-') && x.endsWith('.png')).sort().map(x => readFileSync(`${D}/${x}`).toString('base64'))
}

// Une page de lecture des pixels : lire(png) puis des mesures
const ana = await (await nav.newContext()).newPage()
await ana.setContent('<html><body></body></html>')
await ana.evaluate(() => {
  window.lire = async (b) => {
    const img = new Image(); img.src = b.startsWith('data:') ? b : 'data:image/png;base64,' + b; await img.decode()
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
    const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0)
    return { l: c.width, h: c.height, d: x.getImageData(0, 0, c.width, c.height).data }
  }
  /** La couleur moyenne d'un carré de 5 × 5 pixels centré en (x, y) */
  window.moyenne = async (b, x, y) => {
    const { l, d } = await window.lire(b)
    let r = 0, g = 0, bb = 0
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const k = ((y + j) * l + x + i) * 4; r += d[k]; g += d[k + 1]; bb += d[k + 2] }
    return [r, g, bb].map(v => Math.round(v / 25))
  }
  /** Combien de pixels passent le test (dans le rectangle, sinon partout) ; et leur étendue */
  window.compter = async (b, test, r) => {
    const { l, h, d } = await window.lire(b), f = new Function('r', 'g', 'b', 'return ' + test)
    r = r || { x0: 0, x1: l, y0: 0, y1: h }
    let n = 0, y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity
    for (let y = Math.max(0, r.y0); y < Math.min(h, r.y1); y++) for (let x = Math.max(0, r.x0); x < Math.min(l, r.x1); x++) {
      const k = (y * l + x) * 4
      if (f(d[k], d[k + 1], d[k + 2])) { n++; y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x) }
    }
    return { n, y0, y1, x0, x1, l, h }
  }
  /** L'écart moyen (sur 255) entre deux images dans un rectangle, et les pixels à plus de 12 */
  window.ecart = async (a, b, r) => {
    const A = await window.lire(a), B = await window.lire(b)
    let s = 0, n = 0, gros = 0
    for (let y = r.y0; y < r.y1; y++) for (let x = r.x0; x < r.x1; x++) {
      const k = (y * A.l + x) * 4, e = (Math.abs(A.d[k] - B.d[k]) + Math.abs(A.d[k + 1] - B.d[k + 1]) + Math.abs(A.d[k + 2] - B.d[k + 2])) / 3
      s += e; n++; if (e > 12) gros++
    }
    return { moyen: s / n, gros: gros / n }
  }
})

/** Dans la page : la mise en page de la page courante, comme la fait
 *  l'export (les droites prolongées ne sont pas des obstacles) ; et, si
 *  demandé, la feuille n peinte sans palette (PNG), la référence */
const MISE = async ([n, peindre]) => {
  const m = await import('/src/sorties/mise-en-page.ts')
  const a = window.__app, ap = a.ui.apercus
  const formes = [...a.tableau.formesDe(a.page).values()].sort((p, q) => p.z - q.z)
  await ap.mesurer(formes)
  const mp = m.mettreEnPage(ap.boite(formes), formes.filter(f => !(f.type === 'polygone' && f.prolonge)).map(f => ap.boite([f])).filter(Boolean))
  const f = mp.feuilles[n ?? 0], d = m.DPR_PDF, pap = mp.papier
  let png = null
  if (peindre) {
    await ap.preparer(formes, Math.ceil(mp.z * d * 20 - 1e-6) / 20)
    const c = document.createElement('canvas'); c.width = pap.px.l; c.height = pap.px.h
    const x = c.getContext('2d')
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height)
    const page = { fond: a.tableau.fondDe(a.page), origine: a.tableau.origineDe(a.page), formes }
    const u = pap.utile
    x.save(); x.beginPath(); x.rect(u.x * d, u.y * d, u.l * d, u.h * d); x.clip()
    ap.peindre(x, page, { x: f.cam.x - u.x, y: f.cam.y - u.y, z: f.cam.z }, { l: u.l, h: u.h, dpr: d, coin: { x: u.x, y: u.y }, fond: true, formes: [] })
    const ordre = [...formes.filter(g => g.type === 'image'), ...formes.filter(g => g.type !== 'image')]
    ap.peindre(x, page, f.cam, { l: pap.css.l, h: pap.css.h, dpr: d, fond: 'aucun', formes: ordre })
    x.restore()
    png = c.toDataURL('image/png')
  }
  return {
    orientation: pap.orientation, k: mp.k, d, cam: f.cam, utile: pap.utile, px: pap.px,
    bandes: mp.feuilles.map(g => [g.y0, g.y1]), png,
  }
}
/** Le pixel de la feuille (200 ppp) d'un point du monde */
const versPixel = (mise, x, y) => [Math.round((x * mise.cam.z + mise.cam.x) * mise.d), Math.round((y * mise.cam.z + mise.cam.y) * mise.d)]

/** Des lignes d'écriture (des zigzags), le même tableau d'un passage à l'autre */
const ECRIRE = ({ lignes, mots, x0 = 120, y0 = 120, pas = 72, fond = 'blanc', couleur = '#1b2230', prefixe = 'e' }) => {
  const a = window.__app, t = a.tableau
  let s = 12345
  const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
  t.changerFond(a.page, fond)
  const formes = []
  for (let l = 0; l < lignes; l++) {
    let x = x0
    for (let m = 0; m < mots; m++) {
      const n = 18 + Math.floor(hasard() * 14), pts = []
      for (let i = 0; i < n; i++) pts.push(i * 2.6, (i % 2 ? 30 * (0.55 + hasard() * 0.45) : hasard() * 4), 0.5)
      formes.push({ id: `${prefixe}${l}-${m}`, type: 'trait', x, y: y0 + l * pas, z: l * 100 + m, auteur: t.moi, pts, couleur: m % 7 ? couleur : '#d64545', taille: 3, opacite: 1, pression: false })
      x += n * 2.6 + 10 + hasard() * 8
    }
  }
  t.nouveauGeste()
  t.poserPlusieurs(a.page, formes)
}

// ---------- 1. Les petites marques de couleur sur une page chargée ----------
if (faire('couleurs')) {
  const marques = [['#d64545', 'rouge'], ['#2e9e5b', 'verte'], ['#e8891c', 'orange'], ['#1b5fbf', 'bleue'], ['#8e44ad', 'violette']]
  for (const [fond, lignes, mots] of [['seyes', 13, 9], ['blanc', 20, 12]]) {
    const { ctx, page } = await ouvrir('couleurs')
    await page.evaluate(ECRIRE, { lignes, mots, fond })
    await page.evaluate((marques) => {
      const a = window.__app, t = a.tableau
      t.poser(a.page, { id: 'surl', type: 'trait', x: 120, y: 140, z: 5000, auteur: t.moi, pts: [0, 0, 0.5, 600, 0, 0.5], couleur: '#ffd400', taille: 24, opacite: 0.35, pression: false })
      marques.forEach(([c], i) => {
        const x = 1150, y = 140 + i * 140
        t.poser(a.page, { id: 'm' + i + 'a', type: 'trait', x, y, z: 6000 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, 16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
        t.poser(a.page, { id: 'm' + i + 'b', type: 'trait', x, y: y + 16, z: 6100 + i, auteur: t.moi, pts: [0, 0, 0.5, 16, -16, 0.5], couleur: c, taille: 3, opacite: 1, pression: false })
      })
    }, marques)
    await page.waitForTimeout(500)
    const mise = await page.evaluate(MISE, [0, true])
    const f = await exporter(page, `couleurs-${fond}`)
    const [png] = rendre(f, 200, `couleurs-${fond}`)
    const im = images(f)
    const ecarts = []
    for (let i = 0; i < marques.length; i++) {
      const [x, y] = versPixel(mise, 1158, 148 + i * 140)
      const lu = await ana.evaluate(([b, x, y]) => window.moyenne(b, x, y), [png, x, y])
      const ref = await ana.evaluate(([b, x, y]) => window.moyenne(b, x, y), [mise.png, x, y])
      ecarts.push({ marque: marques[i][1], lu, ref, ecart: Math.round(Math.hypot(lu[0] - ref[0], lu[1] - ref[1], lu[2] - ref[2])) })
    }
    verifier(`${fond} (${lignes} lignes de ${mots} mots) : chaque petite croix de couleur garde sa couleur dans le PDF (à moins de 12 de la feuille peinte sans palette)`, ecarts.every(e => e.ecart < 12), ecarts)
    verifier(`… la feuille chargée reste en couleurs indexées (légère : ${im[0]?.taille})`, im.length === 1 && im[0].couleur === 'index', im)
    await ctx.close()
  }
}

// ---------- 2. Les photos ----------
if (faire('photo')) {
  // La photo d'un énoncé, seule sur une page de carreaux (720 × 540 unités)
  {
    const { ctx, page } = await ouvrir('enonce')
    await page.evaluate(async () => {
      const a = window.__app, t = a.tableau
      t.changerFond(a.page, 'carreaux')
      const c = document.createElement('canvas'); c.width = 1600; c.height = 1200
      const x = c.getContext('2d')
      const g = x.createLinearGradient(0, 0, 1600, 1200); g.addColorStop(0, '#e8e2d4'); g.addColorStop(1, '#c9c2b0')
      x.fillStyle = g; x.fillRect(0, 0, 1600, 1200)
      x.fillStyle = '#2a2a33'; x.font = '48px serif'
      for (let l = 0; l < 14; l++) x.fillText('Exercice ' + (l + 1) + ' : on considère la fonction f définie sur R', 80, 120 + l * 75)
      const im = x.getImageData(0, 0, 1600, 1200)
      let s = 2463534242
      const h = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 24) & 255) / 255 }
      for (let i = 0; i < im.data.length; i += 4) { const b = (h() + h() + h() - 1.5) * 6; for (let k = 0; k < 3; k++) im.data[i + k] = Math.max(0, Math.min(255, im.data[i + k] + b + (h() - 0.5) * 3)) }
      x.putImageData(im, 0, 0)
      t.doc.getMap('images').set('ph', c.toDataURL('image/jpeg', 0.9))
      t.poser(a.page, { id: 'photo', type: 'image', src: 'ph', l: 1600, h: 1200, m: [0.45, 0, 0, 0.45], x: 0, y: 0, z: 1, auteur: t.moi })
    })
    await page.waitForTimeout(1200)
    const mise = await page.evaluate(MISE, [0, true])
    const f = await exporter(page, 'enonce')
    const [png] = rendre(f, 200, 'enonce')
    const im = images(f)
    const sombre = 'Math.round(0.299 * r + 0.587 * g + 0.114 * b) < 100'
    const zone = { x0: 0, x1: mise.px.l, y0: 0, y1: Math.round((mise.utile.y + mise.utile.h) * mise.d) }
    const lu = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [png, sombre, zone])
    const ref = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [mise.png, sombre, zone])
    verifier('La photo d\'un énoncé : la feuille part en JPEG', im.length === 1 && im[0].enc === 'jpeg', im)
    verifier('… le texte sombre de la photo reste sombre (au moins 85 % des pixels sombres de la feuille peinte sans palette)', lu.n >= 0.85 * ref.n && ref.n > 10000, { pdf: lu.n, ref: ref.n })
    // Le pied de page reste gris (pas beige) : des pixels gris foncé en bas à gauche
    const pied = await ana.evaluate(([b, z]) => window.compter(b, 'r < 140 && Math.abs(r - b) < 30 && b > r - 5', z), [png, { x0: Math.round(mise.utile.x * mise.d), x1: Math.round(mise.utile.x * mise.d) + 200, y0: mise.px.h - 120, y1: mise.px.h - 20 }])
    verifier('… le pied de page « Page 1 » reste gris foncé', pied.n > 30, pied)
    await ctx.close()
  }
  // Une petite illustration en dégradés, avec des anneaux rouges, sur une page d'écriture
  {
    const { ctx, page } = await ouvrir('illustration')
    await page.evaluate(ECRIRE, { lignes: 6, mots: 6, fond: 'carreaux' })
    await page.evaluate(async () => {
      const a = window.__app, t = a.tableau
      const c = document.createElement('canvas'); c.width = 500; c.height = 500
      const x = c.getContext('2d')
      const g = x.createRadialGradient(250, 250, 20, 250, 250, 330); g.addColorStop(0, '#c8e65a'); g.addColorStop(0.6, '#5aa0c8'); g.addColorStop(1, '#1d3c5a')
      x.fillStyle = g; x.fillRect(0, 0, 500, 500)
      x.strokeStyle = '#c8282d'; x.lineWidth = 7
      for (let k = 0; k < 9; k++) { x.beginPath(); x.ellipse(80 + (k * 53) % 340, 90 + (k * 97) % 320, 22, 13, k, 0, 7); x.stroke() }
      t.doc.getMap('images').set('illu', c.toDataURL('image/png'))
      t.poser(a.page, { id: 'illu', type: 'image', src: 'illu', l: 500, h: 500, m: [0.3, 0, 0, 0.3], x: 120, y: 600, z: 5, auteur: t.moi })
    })
    await page.waitForTimeout(800)
    const mise = await page.evaluate(MISE, [0, true])
    const longues = []
    await page.evaluate(() => { window.__longues = []; new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push(Math.round(e.duration)) }).observe({ type: 'longtask', buffered: false }) })
    const f = await exporter(page, 'illustration')
    longues.push(...await page.evaluate(() => window.__longues))
    const [png] = rendre(f, 200, 'illustration')
    const im = images(f)
    verifier('Une petite illustration sur une page d\'écriture : la feuille part en RVB sans perte (ni 256 couleurs, ni JPEG)', im.length === 1 && im[0].couleur === 'rgb' && im[0].enc === 'image', im)
    const [x0, y0] = versPixel(mise, 120, 600), [x1, y1] = versPixel(mise, 270, 750)
    const e = await ana.evaluate(([a, b, r]) => window.ecart(a, b, r), [png, mise.png, { x0: x0 + 2, x1: x1 - 2, y0: y0 + 2, y1: y1 - 2 }])
    verifier('… l\'illustration est celle de la feuille peinte sans palette (écart moyen < 1 sur 255)', e.moyen < 1 && e.gros < 0.01, e)
    const rouge = 'r > 150 && g < 80 && b < 80'
    const zone = { x0, x1, y0, y1 }
    const rl = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [png, rouge, zone])
    const rr = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [mise.png, rouge, zone])
    verifier('… ses anneaux rouges sont là', rr.n > 100 && rl.n >= 0.95 * rr.n, { pdf: rl.n, ref: rr.n })
    verifier('… aucune tâche longue de plus de 150 ms pendant l\'export', longues.every(t => t <= 150), longues)
    await ctx.close()
  }
}

// ---------- 3. Une page plus large que haute tient sur une feuille paysage ----------
if (faire('paysage')) {
  for (const [nom, poser] of [
    ['un triangle de 25 × 18,5 cm', () => {
      const a = window.__app, t = a.tableau
      t.changerFond(a.page, 'carreaux')
      t.poser(a.page, { id: 'tri', type: 'polygone', x: 100, y: 100, z: 1, auteur: t.moi, pts: [0, 740, 1000, 740, 420, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
    }],
    ['une photo 4:3 (1 000 × 750 unités)', () => {
      const a = window.__app, t = a.tableau
      const c = document.createElement('canvas'); c.width = 400; c.height = 300
      const x = c.getContext('2d'); x.fillStyle = '#88aacc'; x.fillRect(0, 0, 400, 300); x.fillStyle = '#334'; x.fillRect(40, 40, 320, 220)
      t.doc.getMap('images').set('p43', c.toDataURL('image/png'))
      t.poser(a.page, { id: 'p43', type: 'image', src: 'p43', l: 400, h: 300, m: [2.5, 0, 0, 2.5], x: 0, y: 0, z: 1, auteur: t.moi })
    }],
  ]) {
    const { ctx, page } = await ouvrir('paysage')
    await page.evaluate(poser)
    await page.waitForTimeout(600)
    const f = await exporter(page, 'paysage')
    const t = taillesPages(f)
    verifier(`${nom} : une seule feuille, en paysage (841,89 × 595,28 pt)`, t.length === 1 && Math.round(t[0][0]) === 842 && Math.round(t[0][1]) === 595, t)
    const m = await page.evaluate(() => window.__msgs.at(-1))
    verifier(`… le message : « 1 feuille A4 », et la réduction au pied si elle n'est pas à l'échelle réelle`, /\(1 feuille A4/.test(m), m)
    await ctx.close()
  }
}

// ---------- 4. Une figure qui tiendrait sur la feuille suivante n'est pas coupée ----------
if (faire('coupe')) {
  const { ctx, page } = await ouvrir('coupe')
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.changerFond(a.page, 'carreaux')
    const f = []
    let s = 5
    const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
    const ligne = (y, id) => { let x = 40; for (let m = 0; m < 6; m++) { const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 2.6, i % 2 ? 26 : hasard() * 3, 0.5); f.push({ id: id + m, type: 'trait', x, y, z: f.length, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); x += 70 } }
    for (let l = 0; l < 7; l++) ligne(l * 72, 'a' + l)
    // Le triangle ABC : de y = 560 à 1 200 (16 cm : il tient sur une feuille de 26,9 cm)
    f.push({ id: 'tri', type: 'polygone', x: 60, y: 560, z: 900, auteur: t.moi, pts: [0, 640, 560, 640, 240, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'] })
    for (let l = 0; l < 8; l++) ligne(1320 + l * 72, 'b' + l)
    t.nouveauGeste(); t.poserPlusieurs(a.page, f)
  })
  await page.waitForTimeout(500)
  const f = await exporter(page, 'coupe')
  const feuilles = rendre(f, 50, 'coupe')
  const bleu = 'r < 80 && g < 140 && b > 150'
  const n = []
  for (const png of feuilles) n.push(await ana.evaluate(([b, t]) => window.compter(b, t), [png, bleu]))
  const avec = n.filter(x => x.n > 0)
  verifier('Le triangle (16 cm) qui commence vers le milieu de la feuille 1 est entier sur une seule feuille (aucun trait bleu sur la feuille 1)', n[0].n === 0 && avec.length === 1, n.map(x => x.n))
  // Entier : de son nom C (en haut) à la base AB, environ 17 cm, soit plus de 320 pixels à 50 ppp
  verifier('… et il y est entier (du nom C à la base [AB])', avec.length === 1 && avec[0].y1 - avec[0].y0 > 320, avec[0])
  await ctx.close()
}

// ---------- 5. Un grand vide de la page infinie ne fait pas de feuille blanche ----------
if (faire('vides')) {
  const { ctx, page } = await ouvrir('vides')
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.changerFond(a.page, 'carreaux')
    const f = []
    const bloc = (y0, id) => { for (let l = 0; l < 5; l++) { let x = 40; for (let m = 0; m < 6; m++) { const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 2.6, i % 2 ? 26 : 2, 0.5); f.push({ id: id + l + '-' + m, type: 'trait', x, y: y0 + l * 72, z: f.length, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false }); x += 70 } } }
    bloc(0, 'enonce')
    bloc(4200, 'corr')
    t.nouveauGeste(); t.poserPlusieurs(a.page, f)
  })
  await page.waitForTimeout(500)
  const f = await exporter(page, 'vides')
  const feuilles = rendre(f, 40, 'vides')
  const encre = []
  for (const png of feuilles) encre.push((await ana.evaluate(([b]) => window.compter(b, 'r < 90 && g < 90 && b < 110', { x0: 0, x1: 330, y0: 20, y1: 440 }), [png])).n)
  verifier('Un énoncé en haut, la correction un mètre plus bas : deux feuilles, chacune écrite (pas de feuille blanche entre les deux)', feuilles.length === 2 && encre.every(n => n > 50), encre)
  // Les cinq lignes de la correction sont toutes sur la feuille 2, en haut
  const lignes = await ana.evaluate(async ([b]) => {
    const { l, h, d } = await window.lire(b)
    const runs = []; let debut = -1
    for (let y = 0; y < h - 60; y++) {
      let ok = false
      for (let x = 0; x < 330 && !ok; x++) { const k = (y * l + x) * 4; if (d[k] < 90 && d[k + 1] < 90 && d[k + 2] < 110) ok = true }
      if (ok && debut < 0) debut = y
      if (!ok && debut >= 0) { runs.push([debut, y]); debut = -1 }
    }
    // Les morceaux d'une même ligne (les pointes du zigzag) : à moins de 6 pixels
    const lignes = []
    for (const r of runs) { if (lignes.length && r[0] - lignes.at(-1)[1] < 6) lignes.at(-1)[1] = r[1]; else lignes.push([...r]) }
    return lignes
  }, [feuilles[1]])
  verifier('… la feuille 2 commence juste au-dessus de la correction (ses 5 lignes, la première en haut de la feuille)', lignes.length === 5 && lignes[0][0] < 40, lignes)
  const m = await page.evaluate(() => window.__msgs.at(-1))
  verifier('… le message : « 2 feuilles A4 »', /\(2 feuilles A4/.test(m), m)
  await ctx.close()
}

// ---------- 6. Les noms des points ----------
if (faire('noms')) {
  {
    const { ctx, page } = await ouvrir('noms')
    await page.evaluate(() => {
      const a = window.__app, t = a.tableau
      // Le nom de C déplacé à 66 unités au-dessus de son sommet
      t.poser(a.page, { id: 'tri', type: 'polygone', x: 300, y: 300, z: 1, auteur: t.moi, pts: [0, 300, 360, 300, 160, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], posNoms: [null, null, { x: 0, y: -66 }] })
    })
    await page.waitForTimeout(400)
    await page.evaluate(() => window.__app.ui.copierEnImage('page'))
    await page.waitForTimeout(800)
    const copie = await page.evaluate(async () => {
      const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png'))
      const b = await it.getType('image/png'); const bmp = await createImageBitmap(b)
      const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height; c.getContext('2d').drawImage(bmp, 0, 0)
      const im = await import('/src/sorties/image.ts')
      const a = window.__app, ap = a.ui.apercus
      const formes = [...a.tableau.formesDe(a.page).values()]
      const bo = ap.boite(formes), tl = im.tailleImage(bo), cam = im.cameraDe(bo, tl.z)
      // Le centre du nom C : (460, 234) dans le monde
      return { png: c.toDataURL('image/png'), x: Math.round((460 * cam.z + cam.x) * 2), y: Math.round((234 * cam.z + cam.y) * 2) }
    })
    const bleu = 'r < 90 && g < 150 && b > 150'
    const c = await ana.evaluate(([b, t, x, y]) => window.compter(b, t, { x0: x - 25, x1: x + 25, y0: y - 25, y1: y + 25 }), [copie.png, bleu, copie.x, copie.y])
    const bord = await ana.evaluate(([b, t]) => window.compter(b, t, { x0: 0, x1: 4000, y0: 0, y1: 3 }), [copie.png, bleu])
    verifier('L\'image copiée montre le nom C, déplacé au-dessus de son sommet, entier (rien au ras du bord du haut)', c.n > 40 && bord.n === 0, { c: c.n, bord: bord.n })
    const mise = await page.evaluate(MISE, [0, false])
    const f = await exporter(page, 'noms')
    const [png] = rendre(f, 200, 'noms')
    const [x, y] = versPixel(mise, 460, 234)
    const p = await ana.evaluate(([b, t, x, y]) => window.compter(b, t, { x0: x - 30, x1: x + 30, y0: y - 30, y1: y + 30 }), [png, bleu, x, y])
    verifier('… et le PDF aussi', p.n > 60, p)
    await ctx.close()
  }
  {
    // Une page haute de lignes et de triangles nommés : aucune coupe ne traverse un nom
    const { ctx, page } = await ouvrir('haute')
    await page.evaluate(() => {
      const a = window.__app, t = a.tableau
      t.changerFond(a.page, 'seyes')
      let s = 777
      const hasard = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
      const formes = []
      let y = 100, n = 0
      for (let bloc = 0; bloc < 14; bloc++) {
        if (bloc % 3 !== 1) {
          const lignes = 2 + Math.floor(hasard() * 5)
          for (let l = 0; l < lignes; l++) {
            let x = 60
            for (let m = 0; m < 6; m++) {
              const k = 18 + Math.floor(hasard() * 12), pts = []
              for (let i = 0; i < k; i++) pts.push(i * 2.6, (i % 2 ? 30 * (0.55 + hasard() * 0.45) : hasard() * 4), 0.5)
              formes.push({ id: `w${n++}`, type: 'trait', x, y, z: n, auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
              x += k * 2.6 + 14
            }
            y += 64
          }
        } else {
          const h = 180 + Math.floor(hasard() * 260)
          formes.push({ id: `t${n++}`, type: 'polygone', x: 120, y: y + 20, z: n, auteur: t.moi, pts: [0, h, 360, h, 160, 0], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A' + bloc, 'B' + bloc, 'C' + bloc], posNoms: [null, null, { x: 0, y: -60 }] })
          y += h + 80
        }
      }
      t.nouveauGeste(); t.poserPlusieurs(a.page, formes)
    })
    await page.waitForTimeout(600)
    const r = await page.evaluate(async () => {
      const m = await import('/src/sorties/mise-en-page.ts')
      const { boiteDesNoms } = await import('/src/sorties/apercu.ts')
      const a = window.__app, ap = a.ui.apercus
      const formes = [...a.tableau.formesDe(a.page).values()]
      await ap.mesurer(formes)
      const mp = m.mettreEnPage(ap.boite(formes), formes.map(f => ap.boite([f])).filter(Boolean))
      const noms = formes.filter(f => f.type === 'polygone').map(f => boiteDesNoms(f))
      const coupes = mp.feuilles.slice(0, -1).map(f => f.y1)
      return { feuilles: mp.feuilles.length, traverses: coupes.filter(c => noms.some(b => b.y < c && b.y + b.h > c)) }
    })
    verifier(`Une page haute (${r.feuilles} feuilles) de triangles aux noms déplacés au-dessus : aucune coupe ne traverse un nom`, r.feuilles > 2 && r.traverses.length === 0, r)
    await ctx.close()
  }
}

// ---------- 7. Les flèches des axes du repère ----------
if (faire('repere')) {
  const { ctx, page } = await ouvrir('repere')
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.changerFond(a.page, 'repere', { x: 400, y: 600 })
    const pts = []
    for (let i = 0; i <= 60; i++) { const X = -3 + i * 0.1; pts.push(X * 40, -(X * X / 2) * 40, 0.5) }
    t.poser(a.page, { id: 'courbe', type: 'trait', x: 400, y: 600, z: 1, auteur: t.moi, pts, couleur: '#d64545', taille: 3, opacite: 1, pression: false })
  })
  await page.waitForTimeout(500)
  const mise = await page.evaluate(MISE, [0, false])
  const f = await exporter(page, 'repere')
  const [png] = rendre(f, 200, 'repere')
  const d = mise.d, u = mise.utile
  const [ox, oy] = versPixel(mise, 400, 600)
  const fonce = 'r < 80 && g < 80 && b < 100'
  // Au bout de l'axe des abscisses (les 30 derniers pixels de la zone utile) :
  // une flèche fait 10 px CSS de haut (environ 20 pixels), l'axe seul 3 ou 4
  const xd = Math.round((u.x + u.l) * d)
  const droite = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [png, fonce, { x0: xd - 30, x1: xd, y0: oy - 20, y1: oy + 20 }])
  const yh = Math.round(u.y * d)
  const haut = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [png, fonce, { x0: ox - 20, x1: ox + 20, y0: yh, y1: yh + 30 }])
  verifier('Repère imprimé : la flèche de l\'axe des abscisses est au bout de la zone utile', droite.n > 200 && droite.y1 - droite.y0 >= 14, droite)
  verifier('… et celle de l\'axe des ordonnées en haut', haut.n > 200 && haut.x1 - haut.x0 >= 14, haut)
  // Rien dans les marges (le fond reste dans la zone utile)
  const marge = await ana.evaluate(([b, t, z]) => window.compter(b, t, z), [png, 'r < 200', { x0: xd + 4, x1: mise.px.l, y0: 0, y1: mise.px.h }])
  verifier('… rien n\'est peint dans la marge de droite', marge.n === 0, marge)
  await ctx.close()
}

// ---------- 8. « Déjà en cours » reste lisible ----------
if (faire('encours')) {
  const { ctx, page } = await ouvrir('encours')
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    for (let p = 0; p < 12; p++) {
      if (p) a.nouvellePage()
      t.poser(a.page, { id: 'l' + p, type: 'trait', x: 100, y: 100, z: 1, auteur: t.moi, pts: [0, 0, 0.5, 300, 40, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
    }
    a.allerPage(a.pages[0])
  })
  await page.waitForTimeout(500)
  await page.mouse.move(683, 384)
  await page.keyboard.press('Control+p')
  await page.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 3000 })
  await page.check('dialog[open] input[value="tout"]')
  const dl = page.waitForEvent('download', { timeout: 60000 }).catch(() => null)
  await page.click('dialog[open] [data-a="exporter"]')
  await page.waitForTimeout(250)
  await page.keyboard.press('Control+p')
  const lus = []
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(200); lus.push(await page.evaluate(() => document.querySelector('.toast')?.textContent ?? window.__msgs.at(-1))) }
  const fen = await page.evaluate(() => !!document.querySelector('dialog.dialogue-pdf[open]'))
  const d = await dl
  const dernier = await page.evaluate(() => window.__msgs.at(-1))
  verifier('Ctrl + P pendant l\'export de 12 pages légères : pas de seconde fenêtre ; « Un export en PDF est déjà en cours. » reste à l\'écran plus d\'une seconde', !fen && lus.every(t => t === 'Un export en PDF est déjà en cours.'), { fen, lus })
  verifier('… puis l\'export finit et le dit', !!d && /^PDF prêt : .* \d{4}-\d\d-\d\d\.pdf \(12 feuilles A4/.test(dernier), dernier)
  await ctx.close()
}

const echecs = resultats.filter(r => !r.ok).length
if (erreurs.length) console.log('ÉCHEC Erreurs JS :', erreurs)
else console.log('OK    Aucune erreur JS')
console.log(`\n${resultats.length - echecs} / ${resultats.length} vérifications réussies`)
await nav.close()
process.exit(echecs || erreurs.length ? 1 : 0)
