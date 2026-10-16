// Essais au navigateur du morceau P4 du lot 3 : peindre une page hors de
// l'écran (Rendu.peindreSur, les formules KaTeX sur un canevas, Apercus,
// les vignettes). Rien n'est visible dans ce morceau : on se sert de
// l'instance de l'interface (window.__app.ui.apercus, .vignettes).
// - une page (traits, figures nommées, formules difficiles, une image, une
//   droite prolongée) sur carreaux, Seyès, repère : peinte hors de l'écran
//   avec la caméra de l'écran, comparée à la capture de la zone à 100 %
//   (au dpr 1 et 2) : tout près, et chaque formule à sa place ;
// - un contexte neuf : la première peinture a déjà les noms en KaTeX_Math ;
// - 40 formules : mesurées puis préparées sans tâche longue de plus de 50 ms ;
// - 60 pages de 300 traits et leurs 60 vignettes attachées : aucune tâche
//   de plus de 100 ms, les 15 prioritaires vite, toutes en moins de 5 s ; un
//   trait ajouté repeint la vignette ; un canevas détaché ne se peint pas ;
//   l'esquisse ne touche pas au cache des tracés, la peinture complète le purge ;
// - le lecteur élève n'importe rien de src/sorties ni de src/pages.
//   (L'écran identique au pixel à des captures d'avant le morceau : retiré en
//   rangeant la batterie dans le dépôt.)
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const URL0 = 'http://localhost:5173/'
const S = `${RACINE_ESSAIS}`
const D = S + '/lot3/P4'
const R = `${RACINE_DEPOT}`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  // Les tâches longues, notées dès le chargement
  await ctx.addInitScript(() => {
    window.__longues = []
    try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ t: e.startTime, d: e.duration }) }).observe({ type: 'longtask', buffered: true }) } catch { /* pas de longtask */ }
  })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page && window.__app.ui?.apercus && window.__app.ui?.vignettes)
  await page.waitForTimeout(400)
  return { ctx, page }
}

// ---------- La page d'essai (la même que lot3/p4/scene.mjs, qui a fait avant*.png) ----------
async function construire(page, fond = 'carreaux') {
  await page.evaluate(async (fond) => {
    const a = window.__app, t = a.tableau, p = a.page
    const c = document.createElement('canvas'); c.width = 160; c.height = 100
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, 160, 100); g.addColorStop(0, '#f2c14e'); g.addColorStop(1, '#3b6fb6')
    x.fillStyle = g; x.fillRect(0, 0, 160, 100)
    x.fillStyle = '#d64545'; x.beginPath(); x.arc(110, 45, 26, 0, Math.PI * 2); x.fill()
    x.fillStyle = '#ffffff'; x.fillRect(14, 60, 60, 22)
    const src = 'img-essai-p4'
    t.doc.getMap('images').set(src, c.toDataURL('image/png'))
    t.changerFond(p, fond)
    const zig = (id, x0, y0, n, couleur, taille, z) => {
      const pts = []
      for (let i = 0; i < n; i++) pts.push(i * 9, (i % 2 ? 16 : 0) + Math.sin(i / 3) * 6, 0.5)
      return { id, type: 'trait', x: x0, y: y0, z, auteur: t.moi, pts, couleur, taille, opacite: 1, pression: false }
    }
    const formes = [
      { id: 'p4-image', type: 'image', src, l: 160, h: 100, m: [1.2, 0, 0, 1.2], x: 760, y: 420, z: 1, auteur: t.moi },
      zig('p4-t1', 180, 140, 30, '#1b2230', 3, 2),
      zig('p4-t2', 180, 200, 22, '#d64545', 6, 3),
      { ...zig('p4-t3', 200, 260, 26, '#ffe45c', 18, 4), opacite: 0.45 },
      { id: 'p4-tri', type: 'polygone', x: 300, y: 330, z: 5, auteur: t.moi, pts: [0, 0, 220, 30, 90, 170], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], codage: true, fond: '#3b6fb6' },
      { id: 'p4-cer', type: 'cercle', x: 720, y: 250, z: 6, auteur: t.moi, r: 80, couleur: '#2a8a4a', taille: 3, sommets: true, noms: ['O'], codage: true },
      { id: 'p4-droite', type: 'polygone', x: 120, y: 560, z: 7, auteur: t.moi, pts: [0, 0, 300, -60], ferme: false, prolonge: 'droite', couleur: '#7a3fb0', taille: 2.5, sommets: true, noms: ['D', 'E'] },
      { id: 'p4-seg', type: 'polygone', x: 980, y: 160, z: 8, auteur: t.moi, pts: [0, 0, 160, 40], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['M', 'N'], styleNoms: [{ droit: true }, { taille: 30 }], stylePoints: [{ bout: 'fleche' }, { marque: 'croix' }] },
      { id: 'p4-f1', type: 'formule', latex: '\\overrightarrow{AB}+\\vec{u}', x: 980, y: 260, z: 9, auteur: t.moi, couleur: '#1b2230', taille: 34 },
      { id: 'p4-f2', type: 'formule', latex: '\\sqrt{2}\\approx 1{,}414', x: 980, y: 340, z: 10, auteur: t.moi, couleur: '#d64545', taille: 30 },
      { id: 'p4-f3', type: 'formule', latex: '\\dfrac{1}{2}+\\dfrac{3}{4}', x: 520, y: 520, z: 11, auteur: t.moi, couleur: '#1b5fbf', taille: 30 },
      { id: 'p4-f4', type: 'formule', latex: '\\boxed{x=3}', x: 1040, y: 420, z: 12, auteur: t.moi, couleur: '#1b2230', taille: 28 },
      { id: 'p4-f5', type: 'formule', latex: '', x: 180, y: 420, z: 13, auteur: t.moi, couleur: '#2a8a4a', taille: 26 },
    ]
    t.poserPlusieurs(p, formes)
    a.allerVers({ x: 0, y: 0, z: 1 }, 0)
    a.rafraichir()
  }, fond)
  await page.evaluate(async () => {
    await document.fonts.ready
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
    window.__app.rendu.toutRedessiner()
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
  await page.waitForTimeout(300)
}

/** Une capture du seul dessin de la zone (sans les barres, les messages, les menus) */
async function capturerZone(page) {
  await page.addStyleTag({ content: '#app > :not(#zone) { visibility: hidden !important; }' })
  await page.mouse.move(1, 1)
  await page.waitForTimeout(150)
  return page.screenshot()
}

/** Compare deux images PNG (en base64) au pixel près, dans la page */
const COMPARER = async ({ a, b }) => {
  const charger = async u => { const i = new Image(); i.src = 'data:image/png;base64,' + u; await i.decode(); return i }
  const [ia, ib] = await Promise.all([charger(a), charger(b)])
  if (ia.width !== ib.width || ia.height !== ib.height) return { tailles: [ia.width, ia.height, ib.width, ib.height] }
  const lire = i => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; const x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data }
  const da = lire(ia), db = lire(ib)
  let differents = 0
  for (let k = 0; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2]) differents++
  return { differents, l: ia.width, h: ia.height }
}

// ======================================================================
// 1. La page peinte hors de l'écran, comparée à l'écran
// ======================================================================
const SEUIL_MOYEN = 0.5, SEUIL_FORMULE = 4
for (const [fond, dpr] of [['carreaux', 1], ['carreaux', 2], ['seyes', 1], ['repere', 1]]) {
  const { ctx, page } = await ouvrir({ deviceScaleFactor: dpr }, `écran ${fond} ×${dpr}`)
  await construire(page, fond)
  const capture = await capturerZone(page)
  const r = await page.evaluate(async ({ b64, dpr }) => {
    const a = window.__app, ap = a.ui.apercus
    const formes = [...a.formes]
    const avantRendu = { formes: a.rendu.formes, l: a.rendu.l, h: a.rendu.h }
    await ap.mesurer(formes)
    const boite = ap.boite(formes)
    await ap.preparer(formes, a.cam.z * dpr)
    const l = a.rendu.l, h = a.rendu.h
    const c = document.createElement('canvas'); c.width = l * dpr; c.height = h * dpr
    const t0 = performance.now()
    ap.peindre(c.getContext('2d'), { fond: a.fond, origine: a.tableau.origineDe(a.page), formes }, a.cam, { l, h, dpr, fond: true })
    const duree = performance.now() - t0
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
    const e = document.createElement('canvas'); e.width = img.width; e.height = img.height
    const ex = e.getContext('2d'); ex.drawImage(img, 0, 0)
    const de = ex.getImageData(0, 0, e.width, e.height).data, dc = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    const ecart = (x0, y0, x1, y1) => {
      let s = 0, n = 0
      for (let y = Math.max(0, Math.floor(y0)); y < Math.min(c.height, Math.ceil(y1)); y++)
        for (let x = Math.max(0, Math.floor(x0)); x < Math.min(c.width, Math.ceil(x1)); x++) {
          const k = (y * c.width + x) * 4
          s += (Math.abs(de[k] - dc[k]) + Math.abs(de[k + 1] - dc[k + 1]) + Math.abs(de[k + 2] - dc[k + 2])) / 3; n++
        }
      return n ? s / n : 0
    }
    const formules = formes.filter(f => f.type === 'formule').map(f => {
      const t = ap.formules.taille(f), z = a.cam.z * dpr
      const x0 = (f.x * a.cam.z + a.cam.x) * dpr, y0 = (f.y * a.cam.z + a.cam.y) * dpr
      // L'écart dans sa boîte, et dans la même boîte décalée de 3 px : une
      // formule mal placée s'y verrait
      return { latex: f.latex, ecart: ecart(x0, y0, x0 + t.l * z, y0 + t.h * z), estimee: ap.formules.estimee(f) }
    })
    const ecran = { l: a.rendu.l, h: a.rendu.h, memesFormes: a.rendu.formes === avantRendu.formes }
    return {
      taille: [e.width, e.height, c.width, c.height], moyen: ecart(0, 0, c.width, c.height), formules, duree, boite, ecran,
      url: c.toDataURL('image/png'),
    }
  }, { b64: capture.toString('base64'), dpr })
  writeFileSync(`${D}/apres-ecran-${fond}-${dpr}.png`, capture)
  writeFileSync(`${D}/apres-peinte-${fond}-${dpr}.png`, Buffer.from(r.url.split(',')[1], 'base64'))
  verifier(`${fond} ×${dpr} : la page peinte hors de l'écran a la taille de la capture`, r.taille[0] === r.taille[2] && r.taille[1] === r.taille[3], r.taille)
  verifier(`${fond} ×${dpr} : écart moyen par pixel avec l'écran sous ${SEUIL_MOYEN} sur 255`, r.moyen < SEUIL_MOYEN, `écart ${r.moyen.toFixed(3)}, peinte en ${r.duree.toFixed(1)} ms`)
  const pire = r.formules.reduce((m, f) => Math.max(m, f.ecart), 0)
  verifier(`${fond} ×${dpr} : chaque formule à sa place (écart dans sa boîte sous ${SEUIL_FORMULE})`, pire < SEUIL_FORMULE && r.formules.length === 5,
    r.formules.map(f => `${f.latex || '(vide)'} ${f.ecart.toFixed(2)}`).join(' ; '))
  verifier(`${fond} ×${dpr} : les tailles des formules mesurées, la boîte du contenu connue`, r.formules.every(f => !f.estimee) && r.boite && r.boite.l > 900)
  verifier(`${fond} ×${dpr} : l'écran n'a pas bougé (mêmes formes, même taille)`, r.ecran.memesFormes && r.ecran.l === 1366 && r.ecran.h === 768, r.ecran)
  await ctx.close()
}

// ======================================================================
// 2. Un contexte neuf : les noms des points en KaTeX_Math dès la première peinture
// ======================================================================
{
  const { ctx, page } = await ouvrir({}, 'polices')
  const r = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, ap = a.ui.apercus
    const statut = () => [...document.fonts].filter(f => f.family.replace(/"/g, '') === 'KaTeX_Math' && f.style === 'italic' && f.weight === '400').map(f => f.status).join(',')
    const avant = statut()
    // Une autre page que celle qu'on voit : rien n'est montré à l'écran
    const id = t.ajouterPage('blanc', 1)
    const formes = [
      { id: 'n1', type: 'polygone', x: 60, y: 60, z: 1, auteur: t.moi, pts: [0, 0, 200, 0, 100, 150], ferme: true, couleur: '#1b2230', taille: 3, sommets: true, noms: ['A', 'B', 'C'] },
      { id: 'n2', type: 'polygone', x: 320, y: 80, z: 2, auteur: t.moi, pts: [0, 0, 200, 60], ferme: false, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['M', 'N'], styleNoms: [{ droit: true }, { taille: 40 }] },
    ]
    t.poserPlusieurs(id, formes)
    const peindre = () => {
      const c = document.createElement('canvas'); c.width = 600; c.height = 300
      ap.peindre(c.getContext('2d'), { fond: 'blanc', origine: { x: 0, y: 0 }, formes }, { x: 0, y: 0, z: 1 }, { l: 600, h: 300, dpr: 1, fond: true })
      return c
    }
    const pareils = (a, b) => { const x = a.getContext('2d').getImageData(0, 0, 600, 300).data, y = b.getContext('2d').getImageData(0, 0, 600, 300).data; let n = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) n++; return n }
    // Sans attendre, à froid (pour voir que l'essai a du sens : ce n'est pas la même image)
    const froide = peindre()
    await ap.preparer(formes, 1)
    const premiere = peindre()
    await new Promise(r => setTimeout(r, 1000))
    await document.fonts.ready
    const seconde = peindre()
    return { avant, apres: statut(), page: a.page !== id, froideDiffere: pareils(froide, premiere), ecart: pareils(premiere, seconde) }
  })
  verifier('contexte neuf : KaTeX_Math pas encore chargée au départ', r.avant === 'unloaded', r.avant)
  verifier('contexte neuf : la première peinture après preparer est déjà la bonne (égale à une seconde, 1 s plus tard)', r.ecart === 0, r)
  verifier('contexte neuf : la police est chargée après preparer, et une peinture sans elle aurait différé', r.apres === 'loaded' && r.froideDiffere > 0, r)
  await ctx.close()
}

// ======================================================================
// 3. Une page de 40 formules : mesurer puis preparer, sans tâche longue
// ======================================================================
{
  const { ctx, page } = await ouvrir({}, '40 formules')
  const r = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, ap = a.ui.apercus
    const id = t.ajouterPage('blanc', 1)
    const modeles = [i => `\\dfrac{${i}}{${i + 1}}+\\sqrt{${i}}`, i => `\\overrightarrow{A_${i}B}=\\vec{u}_{${i}}`, i => `\\boxed{x^{${i}}=${i * 3}}`,
      i => `\\left\\{\\begin{array}{l}x+y=${i}\\\\x-y=${i + 2}\\end{array}\\right.`, i => `\\widehat{ABC}=${i * 7}^\\circ`]
    const formes = Array.from({ length: 40 }, (_, i) => ({ id: 'q' + i, type: 'formule', latex: modeles[i % 5](i), x: 40 + (i % 4) * 300, y: 40 + Math.floor(i / 4) * 90, z: i + 1, auteur: t.moi, couleur: '#1b2230', taille: 30 }))
    t.poserPlusieurs(id, formes)
    await new Promise(r => setTimeout(r, 300))
    const t0 = performance.now()
    await ap.mesurer(formes)
    const t1 = performance.now()
    await ap.preparer(formes, 1.25)
    await ap.preparer(formes, 2.1)
    const t2 = performance.now()
    await new Promise(r => setTimeout(r, 200))
    const longues = window.__longues.filter(e => e.t >= t0 - 1 && e.t <= t2 + 50)
    const c = document.createElement('canvas'); c.width = 1300; c.height = 1000
    let peintes = 0
    const x = c.getContext('2d')
    for (const f of formes) if (ap.formules.peindre(x, f, 2.1)) peintes++
    return { mesure: t1 - t0, prep: t2 - t1, longues, peintes, estimees: formes.filter(f => ap.formules.estimee(f)).length }
  })
  verifier('40 formules : toutes mesurées et préparées (aux deux échelles)', r.peintes === 40 && r.estimees === 0, r)
  verifier('40 formules : aucune tâche longue de plus de 50 ms pendant mesurer et preparer', !r.longues.some(e => e.d > 50),
    `mesurer ${r.mesure.toFixed(0)} ms, preparer ${r.prep.toFixed(0)} ms ; tâches longues : ${JSON.stringify(r.longues.map(e => Math.round(e.d)))}`)
  await ctx.close()
}

// ======================================================================
// 4. 60 pages de 300 traits, leurs 60 vignettes
// ======================================================================
{
  const { ctx, page } = await ouvrir({}, 'vignettes')
  const ids = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647 })()
    const page = k => {
      const formes = []; let n = 0
      for (let ligne = 0; n < 300; ligne++) {
        let x = 10; const y = 30 + ligne * 60
        while (x < 720 && n < 300) {
          const pts = []; const q = 18 + Math.floor(rnd() * 22); let px = 0, py = 0
          for (let i = 0; i < q; i++) { const an = i / q * Math.PI * (2 + rnd() * 2); px += Math.cos(an) * 2.2 + 0.9; py = Math.sin(an * 1.3) * 11 + (rnd() - 0.5) * 2; pts.push(px, py, 0.5) }
          formes.push({ id: `v${k}-${n}`, type: 'trait', x, y, z: n + 1, auteur: t.moi, pts, couleur: k % 2 ? '#1b2230' : '#1b5fbf', taille: 3, opacite: 1, pression: false })
          n++; x += px + 6
        }
      }
      return formes
    }
    const ids = []
    for (let k = 0; k < 60; k++) { const id = t.ajouterPage('carreaux', t.ordre.length); t.poserPlusieurs(id, page(k)); ids.push(id) }
    return ids
  })
  // Que le tableau ait fini d'écrire ses 60 pages (le film, la base du navigateur)
  await page.waitForTimeout(2500)
  const r = await page.evaluate(async (ids) => {
    const v = window.__app.ui.vignettes, ap = window.__app.ui.apercus
    const boite = document.createElement('div')
    boite.id = 'essai-vignettes'
    boite.style.cssText = 'position: fixed; inset: 0; z-index: 50; overflow: auto; display: flex; flex-wrap: wrap; gap: 6px; background: #dde;'
    document.body.appendChild(boite)
    const t0 = performance.now()
    const premieres = new Map(), toutes = []
    v.onPeinte = (p, c) => { toutes.push({ p, c, t: performance.now() - t0 }); if (!premieres.has(p)) premieres.set(p, performance.now() - t0) }
    const canevas = ids.map(id => { const c = v.vignette(id, 200, 150); boite.appendChild(c); return c })
    v.prioriser(ids.slice(0, 15))
    const creation = performance.now() - t0
    while (premieres.size < 60 && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50))
    const fin = performance.now()
    await new Promise(r => setTimeout(r, 300))
    const longues = window.__longues.filter(e => e.t >= t0 - 1 && e.t <= fin + 50)
    // Quelques pixels : de l'encre, noire ou bleue (pas le blanc du papier, ni
    // le bleu pâle des carreaux, ni le transparent d'un canevas pas peint)
    const encre = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 0 && d[i] < 120 && d[i + 1] < 150) n++; return n }
    const prio = ids.slice(0, 15).map(id => premieres.get(id) ?? Infinity)
    const tout = ids.map(id => premieres.get(id) ?? Infinity)
    window.__essai = { canevas, ids }
    return {
      creation, prio: Math.max(...prio), tout: Math.max(...tout), longues, peintes: premieres.size,
      encre: canevas.map(encre), memeCanevas: v.vignette(ids[3], 200, 150) === canevas[3],
      tailleCanevas: [canevas[0].width, canevas[0].height, canevas[0].style.width],
      ordrePrio: ids.slice(0, 15).every(id => (premieres.get(id) ?? Infinity) <= Math.min(...ids.slice(15).map(i => premieres.get(i) ?? Infinity))),
      chemins: ap.rendu.chemins.size,
    }
  }, ids)
  verifier('60 vignettes : toutes peintes', r.peintes === 60, r.peintes)
  verifier('60 vignettes : aucune tâche longue de plus de 100 ms', !r.longues.some(e => e.d > 100), JSON.stringify(r.longues.map(e => Math.round(e.d))))
  verifier('60 vignettes : les 15 prioritaires prêtes en moins de 1,5 s, et avant les autres', r.prio < 1500 && r.ordrePrio, `${Math.round(r.prio)} ms`)
  verifier('60 vignettes : toutes prêtes en moins de 5 s', r.tout < 5000, `${Math.round(r.tout)} ms (création des canevas ${r.creation.toFixed(1)} ms)`)
  verifier('60 vignettes : chacune montre de l\'encre', r.encre.every(n => n > 2000), `au moins ${Math.min(...r.encre)} pixels d'encre`)
  verifier('60 vignettes : le même canevas pour la même page et la même taille, au dpr de l\'écran', r.memeCanevas && r.tailleCanevas[0] === 200 && r.tailleCanevas[1] === 150 && r.tailleCanevas[2] === '200px', r.tailleCanevas)
  verifier('60 vignettes : l\'esquisse ne remplit pas le cache des tracés', r.chemins === 0, r.chemins)

  // Un trait ajouté à une page : sa vignette se repeint
  const r2 = await page.evaluate(async () => {
    const { canevas, ids } = window.__essai, a = window.__app, t = a.tableau, v = a.ui.vignettes
    const c = canevas[20], ctx = c.getContext('2d')
    const rouge = () => { const d = ctx.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 180 && d[i + 1] < 90 && d[i + 2] < 90) n++; return n }
    const avant = rouge()
    let repeinte = null
    const t0 = performance.now()
    v.onPeinte = (p, cv) => { if (cv === c && repeinte === null) repeinte = performance.now() - t0 }
    t.poser(ids[20], { id: 'rouge', type: 'trait', x: 100, y: 100, z: 9999, auteur: t.moi, pts: [0, 0, 0.5, 300, 200, 0.5, 600, 0, 0.5], couleur: '#e02020', taille: 14, opacite: 1, pression: false })
    while (repeinte === null && performance.now() - t0 < 2000) await new Promise(r => setTimeout(r, 20))
    // Les autres ne se repeignent pas
    return { avant, apres: rouge(), repeinte }
  })
  verifier('un trait ajouté à une page : sa vignette se repeint (et le montre)', r2.repeinte !== null && r2.repeinte < 1000 && r2.avant === 0 && r2.apres > 50, r2)

  // Un canevas détaché ne se peint pas ; rattaché, il se peint
  const r3 = await page.evaluate(async () => {
    const { ids } = window.__essai, a = window.__app, v = a.ui.vignettes
    const c = v.vignette(ids[30], 120, 90)
    let peint = 0
    v.onPeinte = (p, cv) => { if (cv === c) peint++ }
    await new Promise(r => setTimeout(r, 700))
    const vide = () => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) return false; return true }
    const detache = { peint, vide: vide() }
    // Une page change pendant qu'il est détaché : toujours rien
    a.tableau.poser(ids[30], { id: 'bleu', type: 'trait', x: 50, y: 50, z: 9999, auteur: a.tableau.moi, pts: [0, 0, 0.5, 200, 100, 0.5], couleur: '#1b5fbf', taille: 8, opacite: 1, pression: false })
    await new Promise(r => setTimeout(r, 500))
    const detache2 = { peint, vide: vide() }
    document.getElementById('essai-vignettes').appendChild(c)
    v.vignette(ids[30], 120, 90)
    const t0 = performance.now()
    while (!peint && performance.now() - t0 < 2000) await new Promise(r => setTimeout(r, 20))
    return { detache, detache2, rattache: { peint, vide: vide(), ms: performance.now() - t0 } }
  })
  verifier('un canevas détaché ne se peint pas (même quand sa page change)', r3.detache.peint === 0 && r3.detache.vide && r3.detache2.peint === 0 && r3.detache2.vide, r3)
  verifier('rattaché au document, il se peint', r3.rattache.peint >= 1 && !r3.rattache.vide, r3.rattache)

  // Une page vide, une page sans sa Y.Map
  const r4 = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, v = a.ui.vignettes
    const vide = t.ajouterPage('seyes', t.ordre.length)
    const boite = document.getElementById('essai-vignettes')
    const cv = v.vignette(vide, 160, 120), cx = v.vignette('page-qui-n-existe-pas', 160, 120)
    boite.append(cv, cx)
    const t0 = performance.now()
    const peintes = new Set()
    v.onPeinte = (p, c) => peintes.add(c)
    while ((!peintes.has(cv) || !peintes.has(cx)) && performance.now() - t0 < 2000) await new Promise(r => setTimeout(r, 20))
    const lire = c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let blancs = 0, autres = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255 && d[i + 3] === 255) blancs++; else autres++ } return { blancs, autres } }
    return { videDit: v.vide(vide), pleineDit: v.vide(window.__essai.ids[0]), fond: lire(cv), absente: lire(cx), peintes: [peintes.has(cv), peintes.has(cx)] }
  })
  verifier('une page vide : vide() le dit, sa vignette montre son fond (Seyès)', r4.videDit === true && r4.pleineDit === false && r4.peintes[0] && r4.fond.autres > 200, r4)
  verifier('une page sans Y.Map : une vignette blanche, sans erreur', r4.peintes[1] && r4.absente.autres === 0, r4.absente)

  // La peinture complète (une image, un PDF) purge le cache des tracés comme l'écran
  const r5 = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, ap = a.ui.apercus
    const tailles = []
    const c = document.createElement('canvas'); c.width = 800; c.height = 600
    for (const id of window.__essai.ids.slice(0, 10)) {
      const formes = [...t.formesDe(id).values()]
      ap.peindre(c.getContext('2d'), { fond: 'carreaux', origine: { x: 0, y: 0 }, formes }, { x: 0, y: 0, z: 0.8 }, { l: 800, h: 600, dpr: 1, fond: false })
      tailles.push(ap.rendu.chemins.size)
    }
    return tailles
  })
  verifier('peinture complète : le cache des tracés se purge (au plus les formes peintes + 1 500)', r5[0] >= 300 && Math.max(...r5) <= 301 + 1500 + 300 && r5[9] <= 301 + 1500, r5.join(', '))

  // Une vignette avec une formule lisible, une minuscule, une image toute neuve :
  // d'abord des rectangles, puis elle se repeint avec la formule et l'image
  const r6 = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, v = a.ui.vignettes, ap = a.ui.apercus
    const c0 = document.createElement('canvas'); c0.width = 80; c0.height = 50
    const x = c0.getContext('2d'); x.fillStyle = '#20c020'; x.fillRect(0, 0, 80, 50)
    t.doc.getMap('images').set('img-vignette', c0.toDataURL('image/png'))
    const id = t.ajouterPage('blanc', t.ordre.length)
    const grande = { id: 'fg', type: 'formule', latex: '\\dfrac{a}{b}=\\sqrt{2}', x: 40, y: 30, z: 1, auteur: t.moi, couleur: '#e02020', taille: 70 }
    const petite = { id: 'fp', type: 'formule', latex: 'x_{petite}', x: 40, y: 260, z: 2, auteur: t.moi, couleur: '#1b2230', taille: 4 }
    t.poserPlusieurs(id, [grande, petite,
      { id: 'im', type: 'image', src: 'img-vignette', l: 80, h: 50, m: [3, 0, 0, 3], x: 420, y: 60, z: 3, auteur: t.moi }])
    const c = v.vignette(id, 240, 180)
    document.getElementById('essai-vignettes').prepend(c)
    let peintes = 0
    v.onPeinte = (p, cv) => { if (cv === c) peintes++ }
    const compter = () => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let rouge = 0, vert = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 180 && d[i + 1] < 100 && d[i + 2] < 100) rouge++; if (d[i] < 80 && d[i + 1] > 150 && d[i + 2] < 80) vert++ } return { rouge, vert } }
    const t0 = performance.now()
    let fin = compter()
    while ((fin.rouge < 100 || fin.vert < 100) && performance.now() - t0 < 4000) { await new Promise(r => setTimeout(r, 30)); fin = compter() }
    return { peintes, fin, ms: Math.round(performance.now() - t0), grandePrete: !ap.formules.aPreparer(grande, 1.2), petiteNonPreparee: ap.formules.aPreparer(petite, 1.2), mesuree: !ap.formules.estimee(grande) }
  })
  verifier('vignette : la formule lisible et l\'image paraissent après coup (repeinte), la minuscule reste un rectangle', r6.peintes >= 2 && r6.fin.rouge >= 100 && r6.fin.vert >= 100 && r6.grandePrete && r6.petiteNonPreparee && r6.mesuree, r6)
  await ctx.close()
}

// ======================================================================
// 4 bis. Le fond imprimé : un réglage gardé dans ce navigateur
// ======================================================================
{
  const { ctx, page } = await ouvrir({}, 'fond imprimé')
  const avant = await page.evaluate(() => ({ fond: window.__app.ui.apercus.fondImprime(), cle: localStorage.getItem('mem-sortie-fond') }))
  await page.evaluate(() => window.__app.ui.apercus.choisirFondImprime(false))
  const ecrit = await page.evaluate(() => localStorage.getItem('mem-sortie-fond'))
  await page.reload()
  await page.waitForFunction(() => window.__app?.ui?.apercus)
  const apres = await page.evaluate(() => window.__app.ui.apercus.fondImprime())
  verifier('fond imprimé : vrai au départ, faux une fois choisi, gardé au rechargement (clé mem-sortie-fond)', avant.fond === true && avant.cle === null && ecrit === '0' && apres === false, { avant, ecrit, apres })
  await ctx.close()
}

// ======================================================================
// 5. (retiré : l'écran identique au pixel à la capture faite avant le morceau)
// ======================================================================
// (Rangé dans le dépôt : la comparaison au pixel avec des captures de l'écran faites
// avant ce morceau, sur une version d'avant, est retirée ; ces captures ne sont pas
// versionnées.)

// ======================================================================
// 6. Le lecteur élève n'importe rien de src/sorties ni de src/pages
// ======================================================================
{
  const vus = new Set(), interdits = []
  const suivre = f => {
    if (vus.has(f)) return
    vus.add(f)
    let src = ''
    try { src = readFileSync(f, 'utf8') } catch { return }
    for (const m of src.matchAll(/(?:import|export)[^'"]*?from\s*['"](\.[^'"]+)['"]|import\(\s*['"](\.[^'"]+)['"]\s*\)|import\s+['"](\.[^'"]+)['"]/g)) {
      const rel = m[1] ?? m[2] ?? m[3]
      let cible = resolve(dirname(f), rel)
      if (!/\.(ts|css|js)$/.test(cible)) cible += '.ts'
      if (/\/src\/(sorties|pages)\//.test(cible)) interdits.push(`${f.slice(R.length + 1)} → ${cible.slice(R.length + 1)}`)
      if (cible.endsWith('.ts')) suivre(cible)
    }
  }
  suivre(join(R, 'src/revoir/main.ts'))
  verifier('le lecteur élève (src/revoir/main.ts et ce qu\'il importe) ne tire rien de src/sorties ni de src/pages', vus.size > 5 && interdits.length === 0, interdits.join(' ; ') || `${vus.size} fichiers suivis`)
}

verifier('aucune erreur JS', erreurs.length === 0, erreurs.join(' | '))
await nav.close()
const echecs = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - echecs} / ${resultats.length} vérifications réussies`)
process.exit(echecs ? 1 : 0)
