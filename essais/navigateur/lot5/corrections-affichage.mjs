// ESSAI DES CORRECTIONS « AFFICHAGE » DU LOT 5 (rapport de vérification
// « affichage », deux constats).
// 1. Le PDF d'une page au papier millimétré n'avait aucune ligne au
//    millimètre : peint avec les seuils de l'écran (une famille sous 6 px CSS
//    est sautée, et 1 mm n'y fait que 3,8 px CSS à l'échelle réelle), il
//    n'imprimait que les 5 mm et les centimètres. Désormais la feuille d'un
//    PDF est peinte pour le papier (src/fonds.ts, OptionsFond.impression) :
//    A. le PDF au millimétré, passé dans pdftoppm à 254 ppp (100 px par cm),
//       a 10 lignes par centimètre, tous les 1 mm (à 0,13 mm près), sur une
//       rangée et sur une colonne sans encre ; les centimètres y restent les
//       plus marqués ; sans « imprimer le fond », la feuille est blanche ;
//    B. les grands et les petits carreaux y tombent à leur place (1 cm et
//       5 mm à 0,2 mm près : aux pixels CSS, un écart de 5 mm faisait 4,7 mm) ;
//    C. l'écran ne change pas : à 100 %, le tableau au millimétré n'a que
//       ses 5 mm et ses centimètres (une ligne tous les 20 px), jamais un
//       écran gris ; la copie en image non plus (seuils d'écran).
// 2. La case du PDF disait « Imprimer le fond de la page (carreaux, Seyès,
//    repère) » pour tous les fonds. Elle nomme désormais le fond de ce qu'on
//    exporte quand il n'y en a qu'un (src/sorties/mise-en-page.ts
//    texteCaseFond) :
//    D. une page au papier pointé : « Imprimer le fond de la page : Papier
//       pointé » ; « Tout le classeur » (une autre page au Seyès) : « Imprimer
//       le fond des pages (carreaux, Seyès, millimétré, pointé, repère…) » ;
//       retour à la page : le nom revient ; deux pages au réseau isométrique
//       choisies : « Imprimer le fond des pages : Réseau isométrique » ; une
//       page blanche : la liste des sortes. La case garde son réglage et agit
//       comme avant.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/corrections-affichage/essai'
const DEV = 'http://localhost:5173/'
rmSync(D, { recursive: true, force: true }); mkdirSync(D, { recursive: true })

let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const note = (m, d) => console.log('  ·', m, d !== undefined ? JSON.stringify(d).slice(0, 600) : '')
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const pret = p => p.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/') && window.__app?.page, null, { timeout: 30000 })

const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctx.addInitScript(() => { window.showOpenFilePicker = undefined })
await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
const P = await ctx.newPage(); suivre(P, 'tableau')
await P.goto(DEV); await pret(P); await P.waitForTimeout(500)
await P.evaluate(() => { window.__app.reconnaissance = false })

// ---------- L'analyse des images (une page à part) ----------
const ana = await nav.newPage()
await ana.setContent('<body></body>')
await ana.evaluate(() => {
  window.charger = async b64 => {
    const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode()
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0)
    window.img = { w: im.width, h: im.height, d: g.getImageData(0, 0, im.width, im.height).data }
    return { w: im.width, h: im.height }
  }
  const lum = i => { const d = window.img.d; return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] }
  /** La rangée (ou la colonne) de [debut, fin] la moins teintée : entre deux
   *  lignes du motif ; puis, sur elle, de a à b, les centres des passages
   *  teintés, et la luminance la plus sombre de chacun */
  window.profil = ({ col, debut, fin, a, b, seuil = 253 }) => {
    const { w } = window.img
    const idx = (u, t) => (col ? (t * w + u) : (u * w + t)) * 4
    let meilleure = debut, moins = Infinity
    for (let u = debut; u <= fin; u++) {
      let n = 0
      for (let t = a; t <= b; t++) if (lum(idx(u, t)) < seuil) n++
      if (n < moins) { moins = n; meilleure = u }
    }
    const centres = [], sombres = []
    let d0 = -1, min = 255
    for (let t = a; t <= b + 1; t++) {
      const l = t <= b ? lum(idx(meilleure, t)) : 255
      if (l < seuil) { if (d0 < 0) { d0 = t; min = 255 } min = Math.min(min, l) }
      else if (d0 >= 0) { centres.push((d0 + t - 1) / 2); sombres.push(Math.round(min)); d0 = -1 }
    }
    return { ligne: meilleure, teintes: moins, centres, sombres }
  }
  /** Les pixels teintés (luminance < 253) et gris (sans teinte : R ≈ G ≈ B, < 235) d'une zone */
  window.zone = ({ x, y, l, h }) => {
    const { w, d } = window.img
    let teintes = 0, n = 0, somme = 0
    for (let v = y; v < y + h; v++) for (let u = x; u < x + l; u++) {
      const i = (v * w + u) * 4, L = lum(i); n++; somme += L
      if (L < 253) teintes++
    }
    return { n, teintes, lum: Math.round(somme / n * 10) / 10 }
  }
})
const charger = f => ana.evaluate(b => window.charger(b), readFileSync(f).toString('base64'))
const ecarts = a => a.slice(1).map((x, i) => Math.round((x - a[i]) * 10) / 10)

/** Une page au fond donné, deux repères verticaux à 10 cm l'un de l'autre,
 *  en haut à gauche (le reste de la feuille sans encre) */
const PAGE = fond => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.changerFond(fond)
  const pose = f => { t.nouveauGeste(); t.poser(a.page, { id: 'ca' + Math.random().toString(36).slice(2), z: Date.now() + Math.random(), auteur: t.moi, ...f }) }
  pose({ type: 'segment', x: 100, y: 100, dx: 0, dy: 160, couleur: '#000000', taille: 2 })
  pose({ type: 'segment', x: 500, y: 100, dx: 0, dy: 160, couleur: '#000000', taille: 2 })
  // De quoi faire une page haute d'environ 20 cm (une feuille portrait) ;
  // ce petit trait tombe vers 21 cm du haut de la feuille, au milieu de sa largeur
  pose({ type: 'segment', x: 100, y: 900, dx: 4, dy: 0, couleur: '#000000', taille: 2 })
  a.ui.maj()
}
async function ouvrirFenetre(p) {
  await p.mouse.move(683, 384)
  await p.keyboard.press('Control+p')
  await p.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
}
async function exporterPdf(p, nom, avecFond) {
  await ouvrirFenetre(p)
  const caseFond = p.locator('dialog[open] input[name="pdf-fond"]')
  if (avecFond) await caseFond.check(); else await caseFond.uncheck()
  const dl = p.waitForEvent('download', { timeout: 240000 }).catch(() => null)
  await p.click('dialog[open] [data-a="exporter"]')
  const d = await dl
  if (!d) return null
  const f = `${D}/${nom}.pdf`
  await d.saveAs(f)
  return f
}
const raster = (f, nom, ppp = 254) => {
  execFileSync('pdftoppm', ['-r', String(ppp), '-png', '-f', '1', '-l', '1', f, `${D}/${nom}`])
  return `${D}/` + readdirSync(D).find(x => x.startsWith(nom + '-') && x.endsWith('.png'))
}

// =====================================================================
console.log('=== A. le PDF au papier millimétré : ses millimètres ===')
const mesures = {}
for (const fond of ['millimetre', 'grands-carreaux', 'carreaux']) {
  await P.evaluate(PAGE, fond); await P.waitForTimeout(200)
  const avec = await exporterPdf(P, fond + '-avec', true)
  if (!avec) { ok(false, `${fond} : pas de PDF`); continue }
  const im = raster(avec, fond + '-avec')
  const dim = await charger(im)
  // Le bas de la feuille, sans encre : de 14 cm à 24 cm du haut, à 2 cm des bords
  const rangee = await ana.evaluate(o => window.profil(o), { col: false, debut: 1800, fin: 1830, a: 300, b: 1650 })
  const colonne = await ana.evaluate(o => window.profil(o), { col: true, debut: 1200, fin: 1230, a: 1500, b: 2500 })
  mesures[fond] = { rangee: ecarts(rangee.centres), colonne: ecarts(colonne.centres), sombres: rangee.sombres, dim }
  note(`${fond} : écarts sur une rangée sans ligne (px à 100 px/cm)`, mesures[fond].rangee.slice(0, 30))
  note(`${fond} : écarts sur une colonne sans ligne`, mesures[fond].colonne.slice(0, 30))
  if (fond === 'millimetre') {
    const sans = await exporterPdf(P, fond + '-sans', false)
    await charger(raster(sans, fond + '-sans'))
    const blanc = await ana.evaluate(() => window.zone({ x: 300, y: 1500, l: 1300, h: 500 }))
    ok(blanc.teintes === 0, 'A) Sans « imprimer le fond », la feuille au millimétré est blanche hors de l\'encre', blanc)
  }
}
{
  const m = mesures.millimetre
  const tous = m ? [...m.rangee, ...m.colonne] : []
  const parCm = m ? m.rangee.length / ((1650 - 300) / 100) : 0
  ok(m && tous.length > 100 && tous.every(e => e >= 7 && e <= 13),
    `A) Papier millimétré : une ligne tous les 1 mm sur la feuille imprimée (écarts de ${Math.min(...tous)} à ${Math.max(...tous)} px à 100 px/cm)`, { rangee: m?.rangee.slice(0, 40), colonne: m?.colonne.slice(0, 40) })
  ok(parCm >= 9.6 && parCm <= 10.4, `A) Papier millimétré : ${parCm.toFixed(2)} lignes par centimètre sur une rangée de 13,5 cm (10 attendues)`, { n: m?.rangee.length })
  const moy = tous.reduce((s, x) => s + x, 0) / (tous.length || 1)
  ok(Math.abs(moy - 10) < 0.15, `A) … en moyenne ${moy.toFixed(3)} px (1 mm = 10 px) : rien ne dérive le long de la feuille`)
  // Les centimètres, les plus marqués : sur la rangée, une ligne sur dix est la plus sombre
  const s = m?.sombres ?? []
  const fonce = Math.min(...s), clair = Math.max(...s)
  const lesPlusSombres = s.map((v, i) => [v, m.rangee ? i : 0]).filter(([v]) => v <= fonce + 6).length
  ok(s.length > 100 && clair - fonce > 20 && Math.abs(lesPlusSombres - s.length / 10) <= 2,
    `A) Les centimètres y sont les lignes les plus marquées (${lesPlusSombres} sur ${s.length}, luminance ${fonce} contre ${clair} pour les millimètres)`, { s: s.slice(0, 40) })
}

console.log('=== B. les carreaux à leur place sur la feuille ===')
{
  const g = mesures['grands-carreaux'], p = mesures.carreaux
  ok(g && g.rangee.length > 8 && [...g.rangee, ...g.colonne].every(e => Math.abs(e - 100) <= 2), 'B) Grands carreaux : une ligne tous les 1 cm (à 0,2 mm près)', g)
  ok(p && p.rangee.length > 20 && [...p.rangee, ...p.colonne].every(e => Math.abs(e - 50) <= 2), 'B) Petits carreaux : une ligne tous les 5 mm (à 0,2 mm près ; aux pixels CSS, 4,7 mm)', p)
}

console.log('=== C. l\'écran et l\'image copiée ne changent pas ===')
{
  await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('millimetre') })
  await P.evaluate(() => { const a = window.__app; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner() })
  await P.waitForTimeout(300)
  const ecran = await P.evaluate(() => {
    const c = window.__app.rendu.scene
    const g = c.getContext('2d'), dpr = c.width / c.getBoundingClientRect().width
    const y = Math.round(300 * dpr) + 3
    const d = g.getImageData(0, y, c.width, 1).data
    const xs = []; let debut = -1
    for (let x = 0; x <= c.width; x++) {
      const i = x * 4, teinte = x < c.width && (d[i + 3] > 0 && 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2] < 250)
      if (teinte && debut < 0) debut = x
      if (!teinte && debut >= 0) { xs.push((debut + x - 1) / 2 / dpr); debut = -1 }
    }
    return { dpr, ecarts: xs.slice(1).map((x, i) => Math.round(x - xs[i])) }
  })
  const e = ecran.ecarts.filter(x => x > 0)
  ok(e.length > 10 && e.filter(x => x < 15).length <= 2, 'C) À l\'écran, à 100 %, le millimétré n\'a que ses 5 mm et ses centimètres (une ligne tous les 20 px), comme avant', ecran)
}

console.log('=== D. la case du fond nomme le fond ===')
const libelle = p => p.evaluate(() => document.querySelector('dialog[open] .pdf-fond')?.textContent.trim() ?? null)
{
  // Un classeur de deux pages au moins : la page au pointé, puis une au Seyès
  await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('seyes'); a.nouvellePage(); a.changerFond('pointe') })
  await ouvrirFenetre(P)
  const l1 = await libelle(P)
  ok(l1 === 'Imprimer le fond de la page : Papier pointé', 'D) Une page au papier pointé : « Imprimer le fond de la page : Papier pointé »', l1)
  await P.check('dialog[open] input[name="pdf-quoi"][value="tout"]')
  const l2 = await libelle(P)
  ok(l2 === 'Imprimer le fond des pages (carreaux, Seyès, millimétré, pointé, repère…)', 'D) « Tout le classeur » (plusieurs fonds) : « Imprimer le fond des pages (carreaux, Seyès, millimétré, pointé, repère…) »', l2)
  await P.check('dialog[open] input[name="pdf-quoi"][value="page"]')
  const l3 = await libelle(P)
  ok(l3 === l1, 'D) Revenir à « La page » : le nom du fond revient', l3)
  const coche = await P.evaluate(() => document.querySelector('dialog[open] input[name="pdf-fond"]').checked)
  await P.click('dialog[open] [data-a="annuler"]')
  // Deux pages au réseau isométrique, choisies (comme dans la trieuse)
  const deux = await P.evaluate(() => { const a = window.__app, r = []; for (let i = 0; i < 2; i++) { a.nouvellePage(); a.changerFond('iso'); r.push(a.page) } return r })
  await P.evaluate(ids => window.__app.ui.exporterPdf({ pages: ids }), deux)
  await P.waitForSelector('dialog.dialogue-pdf[open]', { timeout: 5000 })
  const l4 = await libelle(P)
  ok(l4 === 'Imprimer le fond des pages : Réseau isométrique', 'D) Deux pages au réseau isométrique choisies : « Imprimer le fond des pages : Réseau isométrique »', l4)
  await P.keyboard.press('Escape')
  await P.waitForTimeout(150)
  await P.evaluate(() => { const a = window.__app; a.nouvellePage(); a.changerFond('blanc') })
  await ouvrirFenetre(P)
  const l5 = await libelle(P)
  ok(l5 === 'Imprimer le fond de la page (carreaux, Seyès, millimétré, pointé, repère…)', 'D) Une page blanche : la liste des sortes de fonds', l5)
  const coche2 = await P.evaluate(() => document.querySelector('dialog[open] input[name="pdf-fond"]').checked)
  ok(coche === coche2 && coche === await P.evaluate(() => localStorage.getItem('mem-sortie-fond') !== '0'), 'D) La case garde le réglage gardé (clé « mem-sortie-fond »)', { coche, coche2 })
  const aucunAncien = await P.evaluate(() => !!document.querySelector('dialog.dialogue-pdf[open]') && !document.body.textContent.includes('(carreaux, Seyès, repère)'))
  ok(aucunAncien, 'D) L\'ancien libellé « (carreaux, Seyès, repère) » ne paraît plus (fenêtre ouverte)')
  await P.keyboard.press('Escape')
}

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
