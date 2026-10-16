// VÉRIFICATION « DONNÉES ET REPLAY » DU LOT 5 (d3), dans l'application :
// A. Ctrl + Z / Ctrl + Y d'un réglage (verrouiller, grouper) : le film les
//    note-t-il « réglage », comme le geste qu'ils défont (D24) ?
// B. Le contraste renforcé ne laisse aucune trace dans les données (le
//    classeur, le film, l'image copiée, le film élève).
// C. Le film élève de d1 (tous les gestes du lot 5) dans le lecteur du lot 5
//    jusqu'au bout, sans erreur (rangé dans le dépôt : la lecture par le
//    lecteur d'avant le lot 5 est retirée).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot5/verif/donnees/sorties'
const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, (!c || process.env.DETAIL) && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 2500) : '') }
const erreurs = []
const suivre = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::|accounts\.google/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
}
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => { window.showOpenFilePicker = undefined })
await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
const P = await ctx.newPage(); suivre(P, 'tableau')
await P.goto(DEV)
await P.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
await P.waitForTimeout(600)
await P.evaluate(() => {
  const a = window.__app
  a.reconnaissance = false
  window.__poser = f => { const t = a.tableau; t.nouveauGeste(); t.poser(a.page, { z: Date.now() + Math.random(), auteur: t.moi, ...f }); return f.id }
  window.__prendre = ids => { a.choisirOutil('selection'); a.selection.clear(); a.options = null; for (const i of ids) a.selection.add(i); a.rendu.redessinerDirect(); a.ui.maj() }
})
const ligne = (x, y, l, o = {}) => { const pts = []; for (let i = 0; i <= 20; i++) pts.push(i * l / 20, Math.sin(i / 3) * 6, 0.5); return { type: 'trait', x, y, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false, ...o } }
const notes = () => P.evaluate(() => window.__app.tableau.film.toArray().map(e => e.reglage ? 'R' : e.coupe ? 'C' : e.seulOrdre ? 'O' : e.naissance ? 'N' : 'G').join(''))

// =====================================================================
console.log('=== A. Ctrl + Z d\'un réglage, dans l\'application ===')
for (let k = 0; k < 4; k++) { await P.evaluate(f => window.__poser(f), ligne(100, 100 + k * 60, 300, { id: 'E' + k })); await P.waitForTimeout(500) }
// Le lendemain (l'horloge de la page avance de 20 h : le film date ses étapes par Date.now)
await P.evaluate(() => { const d = Date.now.bind(Date); Date.now = () => d() + 20 * 3600e3 })
await P.evaluate(() => window.__prendre(['E0', 'E1']))
const n0 = await notes()
await P.evaluate(() => window.__app.grouper()); await P.waitForTimeout(500)
await P.keyboard.press('Control+z'); await P.waitForTimeout(500)
const nZ = await notes()
await P.keyboard.press('Control+y'); await P.waitForTimeout(500)
const nY = await notes()
await P.evaluate(() => window.__prendre(['E0', 'E1']))
await P.evaluate(() => window.__app.verrouiller(true)); await P.waitForTimeout(500)
await P.keyboard.press('Control+z'); await P.waitForTimeout(500)
const nV = await notes()
console.log(`  (notes du film : avant « ${n0} », grouper + Ctrl+Z « ${nZ.slice(n0.length)} », + Ctrl+Y « ${nY.slice(nZ.length)} », verrouiller + Ctrl+Z « ${nV.slice(nY.length)} »)`)
ok(nZ.slice(n0.length) === 'RR' && nY.slice(nZ.length) === 'R' && nV.slice(nY.length) === 'RR', 'Ctrl + Z et Ctrl + Y d\'un réglage sont notés « réglage » dans le film (ils ne changent rien à l\'image)', { grouperZ: nZ.slice(n0.length), Y: nY.slice(nZ.length), verrouillerZ: nV.slice(nY.length) })
const pub = await P.evaluate(async () => {
  const ex = await import('/src/revoir/exporter.ts')
  const t = window.__app.tableau
  const s = ex.seancesAPublier(t)
  const office = s[0]
  const f = ex.exporter(t, { de: office.de, a: office.a, pages: ex.pagesDeLaSeance(t, office), titre: 'x' })
  // Ce que montre chaque étape du film élève : l'image change-t-elle ? (verrou et groupe n'y paraissent pas)
  const sans = x => { const { verrou, groupe, ...r } = x; return JSON.stringify(r) }
  const muettes = []
  const vu = new Map(f.pages.flatMap(p => p.formes.map(x => [x.id, sans(x)])))
  f.etapes.forEach((e, k) => {
    const change = e.o.some(o => o[0] !== '=' || vu.get(o[1].id) !== sans(o[1]))
    for (const o of e.o) if (o[0] === '=') vu.set(o[1].id, sans(o[1]))
    if (!change) muettes.push(k)
  })
  return { seances: s.map(x => ({ gestes: x.gestes, de: x.de, a: x.a })), etapes: f.etapes.length, muettes }
})
ok(pub.seances.length === 1, 'Publier : une seule séance (celle d\'hier) ; le réglage défait aujourd\'hui n\'en fait pas une', pub)
ok(pub.muettes.length === 0, 'Le film élève choisi d\'office n\'a aucune étape qui ne montre rien', pub)

// La revue en classe : combien de gestes sur cette page ?
const revue = await P.evaluate(async () => {
  const pl = await import('/src/revue/planches.ts'), ba = await import('/src/revue/bande.ts')
  const t = window.__app.tableau
  const l = pl.lectureDe(t, () => t.ordre.toArray())
  return ba.compterGestes(l, { genre: 'page', page: window.__app.page })
})
ok(revue === 4, 'La revue de la page compte 4 gestes (les quatre traits), pas les réglages ni leurs Ctrl + Z / Ctrl + Y', { revue })

// =====================================================================
console.log('=== B. Le contraste renforcé ne laisse aucune trace ===')
await P.evaluate(() => { window.__app.selection.clear(); window.__app.ui.maj() })
await P.evaluate(f => window.__poser(f), { id: 'FO', type: 'formule', x: 500, y: 400, latex: 'x^2', couleur: '#d0342c', taille: 32, rotation: 0.4 }); await P.waitForTimeout(600)
const releve = () => P.evaluate(async () => {
  const fi = await import('/src/fichier.ts'), im = await import('/src/sorties/image.ts'), ex = await import('/src/revoir/exporter.ts')
  const a = window.__app, t = a.tableau, ui = a.ui
  const b = fi.lireTableau(new Uint8Array(await fi.ecrireTableau(t.doc, 0).arrayBuffer())).etat
  let h = 0; for (const x of b) h = (h * 31 + x) >>> 0
  const png = await im.imagePng(ui.apercus, ui.pageAPeindre(a.page), { fond: true })
  const pb = new Uint8Array(await png.arrayBuffer()); let hp = 0; for (const x of pb) hp = (hp * 31 + x) >>> 0
  const s = ex.seancesDuFilm(t.film.toArray())[0]
  const film = JSON.stringify(ex.exporter(t, { de: s.de, a: s.a, pages: t.ordre.toArray(), titre: 'x' }))
  let hf = 0; for (let i = 0; i < film.length; i++) hf = (hf * 31 + film.charCodeAt(i)) >>> 0
  const cles = Object.keys(localStorage).filter(k => k.startsWith('mem')).sort()
  return { memc: [b.length, h], png: [pb.length, hp], film: hf, etapes: t.film.length, cles, body: document.body.classList.contains('contraste') }
})
const sans = await releve()
await P.evaluate(() => window.__app.ui.choisirContraste(true)); await P.waitForTimeout(300)
// La revue s'ouvre en contraste, et se referme
await P.click('button[title^="Revoir la construction"]'); await P.waitForTimeout(800)
await P.evaluate(() => { const rv = window.__app.ui.revue; for (let j = 0; j < rv.bande.images.length; j++) rv.aller(j, true) })
for (let i = 0; i < 4 && await P.evaluate(() => window.__app.enLecture); i++) { await P.keyboard.press('Escape'); await P.waitForTimeout(150) }
const avec = await releve()
ok(avec.body && !sans.body, 'Le contraste renforcé est allumé (body.contraste)')
ok(sans.memc[0] === avec.memc[0] && sans.memc[1] === avec.memc[1] && sans.etapes === avec.etapes, 'Le classeur (le document Yjs du .memc) et son film : identiques, octet pour octet', { sans, avec })
ok(sans.png[1] === avec.png[1], 'La page copiée en image : identique', { sans: sans.png, avec: avec.png })
ok(sans.film === avec.film, 'Le film élève : identique')
ok(JSON.stringify(avec.cles.filter(k => !sans.cles.includes(k))) === '["mem-contraste"]' || avec.cles.join() === sans.cles.join(), 'Une seule clé de stockage nouvelle : mem-contraste', { sans: sans.cles, avec: avec.cles })
await P.evaluate(() => window.__app.ui.choisirContraste(false))

// =====================================================================
console.log('=== C. Le film élève de d1 dans les deux lecteurs ===')
const texte = readFileSync(D + '/d1.mem', 'utf8')
async function lire(url, nom) {
  const L = await ctx.newPage(); suivre(L, nom)
  await L.goto(url)
  await L.locator('input[type=file]').setInputFiles({ name: 'd1.mem', mimeType: 'application/json', buffer: Buffer.from(texte) })
  await L.waitForTimeout(1500)
  const ouvert = await L.evaluate(() => ({ titre: document.title, abime: /abîmé|illisible/.test(document.body.textContent) }))
  await L.keyboard.press('Home'); await L.waitForTimeout(200)
  for (let k = 0; k < 90; k++) { await L.keyboard.press('ArrowRight'); await L.waitForTimeout(60) }
  await L.keyboard.press('End'); await L.waitForTimeout(1200)
  const fin = await L.evaluate(() => {
    const c = [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
    let encre = 0, vert = 0
    for (let i = 0; i < d.length; i += 4) { if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 110) encre++; if (d[i + 1] > 130 && d[i] < 80 && d[i + 2] < 80) vert++ }
    const formules = [...document.querySelectorAll('.katex')].length
    return { encre, vert, formules }
  })
  await L.close()
  return { ouvert, fin }
}
const nouveau = await lire(DEV + 'revoir.html', 'lecteur')
ok(nouveau.ouvert.titre.startsWith('Lot 5, données') && !nouveau.ouvert.abime && nouveau.fin.encre > 200 && nouveau.fin.vert > 100 && nouveau.fin.formules > 0, 'Le lecteur du lot 5 lit le film jusqu\'au bout (encre, images, formules)', nouveau)
// (Ici, la version d'avant le lot 5 relisait ce fichier : retiré en rangeant la
// batterie dans le dépôt ; elle se construisait depuis un commit qui n'existe plus.)

await nav.close()
ok(erreurs.length === 0, 'Aucune erreur JS', erreurs)
console.log(echecs ? `\n${echecs} ÉCHEC(S)` : '\nTout est vert')
process.exit(echecs ? 1 : 0)
