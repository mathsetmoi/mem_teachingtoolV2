// Essai : les corrections de la vérification « régressions » du lot 5.
// A. Ctrl + Z et Ctrl + Y d'un réglage (verrouiller, grouper) sont des
//    réglages eux aussi : le lendemain d'un cours, Maj + L puis Ctrl + Z,
//    Ctrl + Y, Ctrl + Z, puis Ctrl + G, Ctrl + Z, Ctrl + Y ne font aucune
//    séance (Publier propose toujours le cours, avec ses trois gestes), la
//    revue de la page n'y gagne aucun geste, le film élève du cours ne
//    change pas ; un vrai geste (une flèche) défait et refait en reste deux.
// B. La couche directe, tout pris (Ctrl + A sur 2000 mots, 40 triangles,
//    10 formules dont une tournée, 20 images) : un seul stroke pour tous les
//    cadres en tirets (deux en contraste renforcé), et ils se voient (les
//    pixels bleus autour d'un mot, de la formule tournée) ; le cadre de
//    taille se garde (le même objet tant que rien ne change, survol compris)
//    et se recalcule dès que la sélection, la vue, la page ou la taille d'une
//    formule prise change, toujours égal à un calcul neuf.
// C. La gomme « seulement là où elle passe » sur une spirale de 5000 points
//    (et un long trait serré, un long trait du surligneur) : le rectangle
//    sale reste petit (sa moyenne et son 95e centile devant l'écran), le long
//    morceau se redessine par fenêtres ; au milieu du coup, rien ne reste de
//    l'encre effacée (pixels comparés à la peinture entière du lever, à 1 et
//    2 pixels par px) ; Ctrl + Z rend la spirale entière.
// Serveur de développement sur :5173 (window.__app). Une ligne « ✓ » ou
// « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y a un échec ou une
// erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/corrections-regressions'
const DEV = process.env.URL ?? 'http://localhost:5173/'
mkdirSync(D, { recursive: true })

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
async function contexte(o = {}, init) {
  const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
  await c.addInitScript(() => { window.showOpenFilePicker = undefined; window.showSaveFilePicker = undefined; Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 }) })
  if (init) await c.addInitScript(init)
  await c.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
  return c
}
async function ouvrir(ctx, nom) {
  const p = await ctx.newPage(); suivre(p, nom)
  await p.goto(DEV); await pret(p)
  await p.evaluate(() => document.fonts?.ready)
  await p.waitForTimeout(600)
  await p.evaluate(() => { window.__app.reconnaissance = false })
  return p
}

// =====================================================================
console.log('=== A. Ctrl + Z et Ctrl + Y d\'un réglage, le lendemain d\'un cours ===')
{
  const ctx = await contexte({}, () => { const vrai = Date.now.bind(Date); window.__decalage = 0; Date.now = () => vrai() + window.__decalage })
  const p = await ouvrir(ctx, 'réglages')
  const etat = () => p.evaluate(async () => {
    const a = window.__app, film = a.tableau.film.toArray()
    const { seancesDuFilm } = await import('/src/revoir/exporter.ts')
    const { lectureDe } = await import('/src/revue/planches.ts')
    const { compterGestes } = await import('/src/revue/bande.ts')
    const l = lectureDe(a.tableau, () => a.tableau.ordre.toArray())
    return {
      n: film.length, reglages: film.map(e => !!e.reglage),
      seances: seancesDuFilm(film).map(x => ({ gestes: x.gestes, de: x.de, a: x.a })),
      gestesPage: compterGestes(l, { genre: 'page', page: a.page }),
      verrou: !!a.forme('m0')?.verrou, groupe: a.forme('m1')?.groupe ?? null,
    }
  })
  const filmEleve = () => p.evaluate(async () => {
    const a = window.__app, film = a.tableau.film.toArray()
    const { seancesDuFilm, exporterDetaille } = await import('/src/revoir/exporter.ts')
    const s = seancesDuFilm(film).at(-1)
    const r = exporterDetaille(a.tableau, { de: s.de, a: s.a, pages: s.pages, titre: 'essai' }, { instruments: false })
    return r.film.etapes.map(e => e.o.map(o => o[0] + (o[1]?.id ? ':' + o[1].id : '')).join(' '))
  })
  // Le cours : trois mots
  await p.evaluate(() => {
    const a = window.__app, t = a.tableau
    a.nouvellePage(); a.choisirOutil('stylo')
  })
  // (trois gestes à quelques secondes l'un de l'autre, comme on écrit)
  for (let k = 0; k < 3; k++) {
    await p.evaluate(k => {
      const a = window.__app, t = a.tableau
      window.__decalage += 4000
      const pts = []; for (let i = 0; i < 20; i++) pts.push(i * 5, Math.round(Math.sin(i) * 50) / 10, 0.5)
      t.nouveauGeste(); t.poser(a.page, { id: 'm' + k, type: 'trait', x: 300 + k * 150, y: 300, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false, z: Date.now() + k, auteur: t.moi })
    }, k)
    await p.waitForTimeout(150)
  }
  await p.waitForTimeout(400)
  const cours = await etat(), filmCours = await filmEleve()
  ok(cours.seances.length === 1 && cours.seances[0].gestes === 3 && cours.gestesPage === 3, 'A0) Le cours : une séance de trois gestes, trois gestes dans la revue de la page', cours)
  // Le lendemain
  await p.evaluate(() => { window.__decalage = 26 * 3600 * 1000 })
  await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('m0'); a.ui.maj() })
  await p.keyboard.press('Shift+L'); await p.waitForTimeout(300)
  const v = await etat()
  ok(v.verrou && v.reglages.at(-1) === true && v.n === cours.n + 1, 'A1) Maj + L : verrouillé, une étape du film notée « réglage »', v)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  const z1 = await etat()
  ok(!z1.verrou && z1.n === cours.n + 2 && z1.reglages.at(-1) === true, 'A2) Ctrl + Z : déverrouillé, et son étape est un réglage, pas un geste', z1)
  await p.keyboard.press('Control+y'); await p.waitForTimeout(300)
  const y1 = await etat()
  ok(y1.verrou && y1.reglages.at(-1) === true, 'A3) Ctrl + Y : reverrouillé, un réglage', y1)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  const z2 = await etat()
  ok(!z2.verrou && z2.reglages.at(-1) === true, 'A4) Ctrl + Z encore : un réglage', z2)
  // Grouper deux mots, se raviser, se raviser encore
  await p.evaluate(() => { const a = window.__app; a.selection.clear(); a.selection.add('m1'); a.selection.add('m2'); a.ui.maj() })
  await p.keyboard.press('Control+g'); await p.waitForTimeout(300)
  const g = await etat()
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  const gz = await etat()
  await p.keyboard.press('Control+y'); await p.waitForTimeout(300)
  const gy = await etat()
  ok(g.groupe && !gz.groupe && gy.groupe === g.groupe && gy.reglages.slice(-3).every(x => x), 'A5) Ctrl + G, Ctrl + Z, Ctrl + Y : groupé, dégroupé, regroupé, trois réglages', { g, gz, gy })
  ok(JSON.stringify(gy.seances) === JSON.stringify(cours.seances), 'A6) Aucune séance fantôme : le découpage en séances est celui du cours', { cours: cours.seances, apres: gy.seances })
  ok(gy.gestesPage === cours.gestesPage, `A7) La revue de la page : toujours ${cours.gestesPage} gestes`, { avant: cours.gestesPage, apres: gy.gestesPage })
  const filmApres = await filmEleve()
  ok(JSON.stringify(filmApres) === JSON.stringify(filmCours) && ['=:m0', '=:m1', '=:m2'].every(x => filmCours.includes(x)), 'A8) Le film élève de la séance proposée ne change pas : le cours, ses trois mots', { filmCours, filmApres })
  // La fenêtre Publier : la séance proposée d'office
  await p.evaluate(() => window.__app.ui.publication.ouvrir()); await p.waitForTimeout(800)
  const pub = await p.evaluate(() => { const s = document.querySelector('dialog[open] .p-seance'); return s ? { choisie: s.options[s.selectedIndex]?.textContent, toutes: [...s.options].map(o => o.textContent) } : null })
  ok(pub && pub.toutes.length === 1 && /· 3 gestes$/.test(pub.choisie), 'A9) Publier propose d\'office le cours, avec ses trois gestes, et lui seul', pub)
  await p.keyboard.press('Escape'); await p.waitForTimeout(300)
  // Un vrai geste, défait et refait : des gestes, comme avant
  await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.selection.clear(); a.selection.add('m0'); a.ui.maj(); document.getElementById('zone').focus?.() })
  const x0 = await p.evaluate(() => window.__app.forme('m0').x)
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600)
  await p.keyboard.press('Control+z'); await p.waitForTimeout(300)
  await p.keyboard.press('Control+y'); await p.waitForTimeout(300)
  const fin = await etat()
  const x1 = await p.evaluate(() => window.__app.forme('m0').x)
  ok(x1 !== x0 && fin.reglages.slice(-3).every(x => !x) && fin.seances.length === 2 && fin.seances[0].gestes === 3, 'A10) Une flèche, Ctrl + Z, Ctrl + Y : trois gestes (le lendemain a maintenant sa séance)', { x0, x1, fin })
  await ctx.close()
}

// =====================================================================
console.log('=== B. La couche directe, tout pris ===')
{
  const ctx = await contexte()
  const p = await ouvrir(ctx, 'tout pris')
  await p.evaluate(() => {
    const a = window.__app, t = a.tableau
    a.nouvellePage(); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.changerFond('carreaux')
    const cv = Object.assign(document.createElement('canvas'), { width: 400, height: 300 }); const g = cv.getContext('2d')
    for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${i * 9},60%,60%)`; g.fillRect((i % 8) * 50, Math.floor(i / 8) * 60, 50, 60) }
    t.doc.getMap('images').set('cr-img', cv.toDataURL('image/png'))
    const formes = []; let z = Date.now()
    for (let k = 0; k < 20; k++) formes.push({ id: 'img' + k, type: 'image', src: 'cr-img', l: 400, h: 300, m: [0.25, 0, 0, 0.25], x: 900 + (k % 4) * 105, y: 80 + Math.floor(k / 4) * 80, z: z++, auteur: t.moi })
    for (let k = 0; k < 2000; k++) {
      const pts = []; for (let i = 0; i < 30; i++) pts.push(Math.round(i * 16) / 10, Math.round(Math.sin(i / 3 + k) * 60) / 10, Math.round((0.4 + (i % 5) / 10) * 100) / 100)
      formes.push({ id: 'w' + k, type: 'trait', x: 90 + (k % 25) * 30, y: 90 + Math.floor(k / 25) * 6.5, pts, couleur: '#1b2230', taille: 2.5, opacite: 1, pression: true, z: z++, auteur: t.moi })
    }
    for (let k = 0; k < 40; k++) formes.push({ id: 'p' + k, type: 'polygone', x: 100 + (k % 10) * 75, y: 640 + Math.floor(k / 10) * 2, pts: [0, 0, 50, 0, 25, -40], ferme: true, couleur: '#1f5fbf', taille: 1.5, sommets: true, noms: ['A' + k, 'B' + k, 'C' + k], z: z++, auteur: t.moi })
    for (let k = 0; k < 10; k++) formes.push({ id: 'f' + k, type: 'formule', x: 920 + (k % 2) * 200, y: 520 + Math.floor(k / 2) * 30, latex: 'x^2+' + k, couleur: '#1b2230', taille: 22, z: z++, auteur: t.moi, ...(k === 3 ? { rotation: 0.6 } : {}) })
    t.nouveauGeste(); t.poserPlusieurs(a.page, formes)
  })
  await p.waitForTimeout(1200)
  await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.rendu.toutRedessiner() })
  await p.mouse.move(700, 400); await p.waitForTimeout(100)
  await p.keyboard.press('Control+a'); await p.waitForTimeout(500)
  const compter = contraste => p.evaluate(async c => {
    const a = window.__app, r = a.rendu
    r.contraste = c
    const cd = r.cd, n = { stroke: 0, save: 0, setLineDash: 0, rect: 0 }
    const garde = {}
    for (const k of Object.keys(n)) { garde[k] = cd[k]; cd[k] = function (...x) { n[k]++; return garde[k].apply(this, x) } }
    try { r.avantDirect?.(); r.peindreDirect() } finally { for (const k of Object.keys(n)) cd[k] = garde[k] }
    const pris = a.selection.size
    const med = l => { const s = [...l].sort((x, y) => x - y); return +s[Math.floor(s.length / 2)].toFixed(2) }
    const t = []; for (let i = 0; i < 15; i++) { r.avantDirect?.(); const t0 = performance.now(); r.peindreDirect(); t.push(performance.now() - t0) }
    return { ...n, pris, ms: med(t) }
  }, contraste)
  const n0 = await compter(false), n1 = await compter(true)
  ok(n0.pris >= 2070 && n0.stroke < 40 && n0.save < 40, `B1) ${n0.pris} objets pris : ${n0.stroke} strokes et ${n0.save} save pour toute la couche directe (un cadre par objet en faisait ${n0.pris} de chaque)`, n0)
  ok(n1.stroke < 50 && n1.save < 40 && n1.rect >= 2000, `B2) En contraste renforcé : ${n1.stroke} strokes, ${n1.save} save, un rectangle par objet (${n1.rect})`, n1)
  note('peindreDirect, tout pris (ms, médiane)', { normal: n0.ms, contraste: n1.ms })
  await p.evaluate(() => { const a = window.__app; a.rendu.contraste = false; a.rendu.redessinerDirect() })
  await p.waitForTimeout(200)
  // Les cadres se voient : du bleu sur le cadre d'un mot, et sur celui de la formule tournée
  const vus = await p.evaluate(() => {
    const a = window.__app, r = a.rendu, c = r.direct, g = c.getContext('2d'), k = c.width / r.l
    const img = g.getImageData(0, 0, c.width, c.height).data
    const bleu = (x, y) => { const i = 4 * (Math.round(y * k) * c.width + Math.round(x * k)); return img[i + 3] > 100 && img[i + 2] > img[i] + 40 }
    // Le mot w0 : le bord de sa boîte agrandie de 6 px
    const b = r.boite(a.forme('w0')), m = 6
    let sur = 0, tous = 0
    for (let x = b.x - m; x <= b.x + b.l + m; x += 1) for (const y of [b.y - m, b.y + b.h + m]) { tous++; for (const d of [-1, 0, 1]) if (bleu(x + a.cam.x, y + d + a.cam.y)) { sur++; break } }
    // La formule tournée : le milieu de chacun de ses quatre côtés
    const f = a.forme('f3'), bf = r.boiteFormule(f), rot = f.rotation, co = Math.cos(rot), si = Math.sin(rot)
    const coin = (x, y) => ({ x: f.x + x * co - y * si, y: f.y + x * si + y * co })
    const q = [coin(bf.x - f.x - m, bf.y - f.y - m), coin(bf.x - f.x + bf.l + m, bf.y - f.y - m), coin(bf.x - f.x + bf.l + m, bf.y - f.y + bf.h + m), coin(bf.x - f.x - m, bf.y - f.y + bf.h + m)]
    let cotes = 0
    for (let i = 0; i < 4; i++) {
      const A = q[i], B = q[(i + 1) % 4]
      let vu = 0
      for (let s = 0.2; s <= 0.8; s += 0.02) { const x = A.x + (B.x - A.x) * s + a.cam.x, y = A.y + (B.y - A.y) * s + a.cam.y; for (const d of [-1, 0, 1]) if (bleu(x + d, y) || bleu(x, y + d)) { vu++; break } }
      if (vu >= 10) cotes++
    }
    return { sur, tous, cotes }
  })
  ok(vus.sur / vus.tous > 0.4 && vus.cotes === 4, `B3) Les cadres en tirets se voient : ${vus.sur} / ${vus.tous} du bord d'un mot en bleu, les quatre côtés de la formule tournée`, vus)
  // Le cadre de taille gardé, et toujours juste
  const cadres = await p.evaluate(async () => {
    const a = window.__app
    const neuf = () => { a.cadreRetenu = null; return a.cadreDeLaSelection() }
    const r = {}
    const c1 = a.cadreDeLaSelection(), c2 = a.cadreDeLaSelection()
    r.meme = c1 === c2 && !!c1
    r.justeAuDepart = JSON.stringify(c2) === JSON.stringify(neuf())
    // la sélection change, de même taille : un autre cadre
    a.selection.clear(); a.selection.add('w0'); a.selection.add('w1')
    const d1 = a.cadreDeLaSelection()
    a.selection.delete('w1'); a.selection.add('w2')
    const d2 = a.cadreDeLaSelection()
    r.selectionSuivie = d1 !== d2 && JSON.stringify(d2) === JSON.stringify(neuf()) && JSON.stringify(d1) !== JSON.stringify(d2)
    // la vue bouge
    const e1 = a.cadreDeLaSelection(); a.cam.x += 37; const e2 = a.cadreDeLaSelection()
    r.vueSuivie = e1 !== e2 && JSON.stringify(e2) === JSON.stringify(neuf()); a.cam.x -= 37
    // la page change : un mot pris se déplace (par le document)
    const f1 = a.cadreDeLaSelection()
    a.tableau.nouveauGeste(); a.tableau.modifier(a.page, [{ id: 'w2', patch: { x: a.forme('w2').x + 50 } }])
    await new Promise(q => setTimeout(q, 50))
    const f2 = a.cadreDeLaSelection()
    r.pageSuivie = f1 !== f2 && JSON.stringify(f2) === JSON.stringify(neuf()) && f2.coins[1].x > f1.coins[1].x
    // une formule prise seule, que KaTeX remet à une autre taille
    a.selection.clear(); a.selection.add('f0')
    const g1 = a.cadreDeLaSelection()
    const el = [...document.querySelectorAll('.couche-formules > *')].find(e => e.textContent.includes('0') && !e.hidden)
    const avant = el ? el.style.fontSize : null
    if (el) el.style.fontSize = '60px'
    const g2 = a.cadreDeLaSelection()
    r.formuleSuivie = !!el && g1 !== g2 && JSON.stringify(g2) === JSON.stringify(neuf())
    if (el) el.style.fontSize = avant
    // un ensemble ordinaire mis à la place (les essais d'avant le font) : juste, sans rien garder
    a.selection = new Set(['w0', 'w3']); a.rendu.selection = a.selection
    const h1 = a.cadreDeLaSelection()
    a.selection.delete('w3'); a.selection.add('w4')
    const h2 = a.cadreDeLaSelection()
    r.ensembleOrdinaire = JSON.stringify(h2) === JSON.stringify(neuf()) && JSON.stringify(h1) !== JSON.stringify(h2)
    return r
  })
  ok(cadres.meme && cadres.justeAuDepart, 'B4) Le cadre de taille se garde (le même objet relu deux fois), égal à un calcul neuf', cadres)
  ok(cadres.selectionSuivie && cadres.vueSuivie && cadres.pageSuivie && cadres.formuleSuivie && cadres.ensembleOrdinaire,
    'B5) Il se recalcule quand la sélection (même de même taille), la vue, la page ou la taille d\'une formule prise change, et sur un ensemble ordinaire mis à la place', cadres)
  // Le survol, tout pris : aucun recalcul du cadre tant que rien ne change
  await p.reload(); await pret(p); await p.waitForTimeout(800)
  await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1; a.rendu.toutRedessiner() })
  await p.mouse.move(700, 400); await p.keyboard.press('Control+a'); await p.waitForTimeout(400)
  const r0 = await p.evaluate(() => { window.__r0 = window.__app.cadreRetenu; return !!window.__r0 })
  for (let i = 0; i < 40; i++) { await p.mouse.move(300 + i * 7, 300 + Math.sin(i / 5) * 40); await p.waitForTimeout(8) }
  const survol = await p.evaluate(() => ({ meme: window.__app.cadreRetenu === window.__r0, pris: window.__app.selection.size }))
  ok(r0 && survol.meme && survol.pris > 2000, 'B6) Quarante mouvements de souris au survol, tout pris : le cadre n\'est pas recalculé', survol)
  await ctx.close()
}

// =====================================================================
console.log('=== C. La gomme là où elle passe, sur de longs traits ===')
const PAGE_LONGS = () => {
  const a = window.__app, t = a.tableau
  a.nouvellePage(); a.selection.clear(); a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100
  const spir = []; for (let i = 0; i < 5000; i++) { const u = i / 5000, rr = 20 + 200 * u, th = u * 50 * Math.PI; spir.push(r1(rr * Math.cos(th)), r1(rr * Math.sin(th) * 0.9), r2(0.3 + 0.4 * Math.abs(Math.sin(i / 50)))) }
  const serre = []; for (let i = 0; i < 1300; i++) serre.push(r1(i * 0.6 + Math.sin(i / 30) * 3), r1(Math.sin(i / 90) * 20), r2(0.3 + 0.4 * Math.abs(Math.sin(i / 50))))
  const surl = []; for (let i = 0; i < 400; i++) surl.push(r1(i * 1.8), r1(Math.sin(i / 60) * 8), 0.5)
  const l = [
    { id: 'spirale', type: 'trait', x: 330, y: 380, pts: spir, couleur: '#1b2230', taille: 3, opacite: 1, pression: true },
    { id: 'serre', type: 'trait', x: 600, y: 160, pts: serre, couleur: '#1f5fbf', taille: 3, opacite: 1, pression: false },
    { id: 'surl', type: 'trait', x: 600, y: 300, pts: surl, couleur: '#ffd400', taille: 15, opacite: 0.35, pression: false },
    { id: 'serre2', type: 'trait', x: 600, y: 520, pts: serre.map((v, i) => i % 3 === 1 ? -v : v), couleur: '#1b2230', taille: 8, opacite: 1, pression: true },
  ].map((f, k) => ({ ...f, z: Date.now() + k, auteur: t.moi }))
  t.nouveauGeste(); t.poserPlusieurs(a.page, l)
  a.choisirOutil('gomme')
  window.__aire = []; window.__fenetres = 0; window.__zones = []; window.__scenes = []
  const r = a.rendu, pz = r.peindreZone.bind(r), dp = r.dessinerPres?.bind(r), ps = r.peindreScene.bind(r)
  r.peindreZone = () => { const z = r.zoneSale; window.__aire.push((z.x1 - z.x0) * (z.y1 - z.y0)); const t0 = performance.now(); pz(); window.__zones.push(performance.now() - t0) }
  if (dp) r.dessinerPres = (...x) => { window.__fenetres++; return dp(...x) }
  r.peindreScene = () => { const t0 = performance.now(); ps(); window.__scenes.push(performance.now() - t0) }
}
for (const dsf of [1, 2]) {
  const ctx = await contexte({ deviceScaleFactor: dsf }, () => localStorage.setItem('mem-gomme', 'zone'))
  const p = await ouvrir(ctx, 'gomme ' + dsf)
  await p.evaluate(PAGE_LONGS)
  await p.waitForTimeout(700)
  const zr = await p.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left, y: r.top } })
  const lire = () => p.evaluate(() => { const c = window.__app.rendu.scene; (window.__img ??= []).push(c.getContext('2d').getImageData(0, 0, c.width, c.height).data) })
  const coups = []
  for (const [x0, y0, dx, dy, n] of [[150, 380, 6, 0.3, 75], [620, 120, 1.2, 3.4, 130], [700, 250, 0.5, 3, 120], [180, 200, 4, 3.2, 90]]) {
    await p.evaluate(() => { window.__img = [] })
    await p.mouse.move(zr.x + x0, zr.y + y0); await p.mouse.down()
    for (let i = 0; i <= n; i++) { await p.mouse.move(zr.x + x0 + i * dx, zr.y + y0 + i * dy + Math.sin(i / 6) * 12); await p.waitForTimeout(8) }
    await p.waitForTimeout(150)
    const enCours = await p.evaluate(() => window.__app.rendu.coupe?.caches.size ?? 0)
    await lire()
    await p.mouse.up(); await p.waitForTimeout(300)
    await lire()
    coups.push({ enCours, ...(await p.evaluate(() => {
      const [A, B] = window.__img
      let max = 0, forts = 0, encre = 0
      for (let i = 0; i < A.length; i += 4) {
        const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]))
        if (d > max) max = d
        if (d > 40) forts++
        // De l'encre restée : du papier à la peinture entière, une encre franche au coup
        if ((B[i] + B[i + 1] + B[i + 2]) / 3 > 200 && (A[i] + A[i + 1] + A[i + 2]) / 3 < 120) encre++
      }
      return { max, forts, encre, pixels: A.length / 4 }
    })) })
  }
  const enCours = coups.filter(c => c.enCours > 0).length
  ok(enCours >= 2 && coups.every(c => c.encre === 0 && c.forts <= c.pixels * 0.0002), `C1) À ${dsf} pixel(s) par px : au milieu du coup, rien ne reste de l'encre effacée, et presque rien ne diffère de la peinture entière du lever (${coups.map(c => c.forts).join(', ')} pixels)`, coups)
  const m = await p.evaluate(() => {
    const l = [...window.__aire].sort((a, b) => a - b), c = window.__app.rendu.scene
    const z = window.__zones, s = window.__scenes
    return { n: l.length, moy: Math.round(l.reduce((s, x) => s + x, 0) / l.length), p95: l[Math.floor(l.length * 0.95)], ecran: c.width * c.height, fenetres: window.__fenetres,
      zoneMoy: +(z.reduce((a, b) => a + b, 0) / z.length).toFixed(2), sceneMoy: s.length ? +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2) : null, traits: window.__app.formes.length }
  })
  ok(m.n > 100 && m.moy < m.ecran * 0.03 && m.p95 < m.ecran * 0.08, `C2) Le rectangle sale reste petit : ${(100 * m.moy / m.ecran).toFixed(1)} % de l'écran en moyenne, ${(100 * m.p95 / m.ecran).toFixed(1)} % au 95e centile (avant : la boîte entière de chaque morceau neuf, presque toute la spirale)`, m)
  ok(m.fenetres > 50, `C3) Le long morceau se redessine par fenêtres de ses points (${m.fenetres} fois), et non par son contour entier à chaque mouvement`, m)
  note('peinture du rectangle sale contre peinture entière (ms, moyennes)', { zone: m.zoneMoy, scene: m.sceneMoy, traits: m.traits })
  if (dsf === 1) {
    // Ctrl + Z, quatre fois : la page d'avant les coups (la spirale entière)
    for (let i = 0; i < 4; i++) { await p.keyboard.press('Control+z'); await p.waitForTimeout(150) }
    const r = await p.evaluate(() => { const a = window.__app; return { n: a.formes.length, spirale: a.forme('spirale')?.pts.length } })
    ok(r.n === 4 && r.spirale === 15000, 'C4) Quatre Ctrl + Z : les quatre longs traits entiers, la spirale avec ses 5000 points', r)
  }
  await ctx.close()
}

ok(!erreurs.length, 'Aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est vert')
process.exit(echecs ? 1 : 0)
