// Les instruments au replay, de bout en bout, dans le navigateur.
// 1. En direct : le compas (pointe, écarter, Maj + mine, un arc à la tête), un
//    trait, le compas rangé ; la règle (déplacer, tourner, tracer le long du
//    bord) ; le rapporteur (déplacer, tourner : mesurer) ; le constructeur
//    « médiatrice » avec les instruments ; un dernier trait ; puis on range le
//    rapporteur (après le dernier geste : l'épilogue de la page, rejoué ; la
//    règle reste).
//    Le témoin du rendu est espionné : on sait exactement ce que la classe a vu.
// 2. Le film élève (.mem) ; le lecteur des élèves le rejoue à l'allure Normale.
//    À chaque image d'écran de la manipulation, l'état montré doit être celui
//    du direct au même instant réel (entre l'image d'avant et celle d'après).
// 3. La revue en classe, de même.
// 4. Pixels : la couche des instruments de l'image finale (lecteur et revue),
//    redessinée sur le tableau avec sa caméra, contre celle du direct.
// 5. Latence : pendant un trait au stylo, la couche des instruments ne se
//    repeint pas ; le témoin coûte moins d'1 µs par image ; le lever n'écrit
//    pas dans le document.
// Le serveur de développement doit tourner sur :5173.
import { chromium } from '../commun/playwright.mjs'
import { writeFileSync } from 'node:fs'
const ICI = new URL('.', import.meta.url).pathname
const URL0 = 'http://localhost:5173/'
const navigateur = await chromium.launch()
const erreurs = []
let echecs = 0
const verifier = (nom, ok, detail = '') => { if (!ok) echecs++; console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`) }
const surveiller = (p, nom) => {
  p.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
  p.on('console', m => { if (m.type() === 'error' && /localhost/.test(m.location().url)) erreurs.push(`${nom}: ${m.text()}`) })
}
const dort = ms => new Promise(r => setTimeout(r, ms))

const ctx = await navigateur.newContext({ viewport: { width: 1400, height: 860 }, deviceScaleFactor: 1 })
const page = await ctx.newPage()
surveiller(page, 'tableau')
await page.goto(URL0)
await page.waitForFunction(() => window.__app && window.__app.page)
// Juste après une modification du code, le serveur peut encore recharger la page une fois
await page.waitForTimeout(1500)
await page.waitForFunction(() => window.__app && window.__app.page)
await page.waitForTimeout(300)

// ---------- L'espion : chaque peinture de la couche des instruments ----------
await page.evaluate(() => {
  const app = window.__app, r = app.rendu
  const temoin = r.temoin
  window.__vus = []
  window.__peintures = 0
  r.temoin = (i, a, t) => {
    window.__peintures++
    temoin(i, a, t)
    // L'heure de l'image d'écran, sur l'horloge des étapes (Date.now())
    window.__vus.push({ d: Date.now() - (performance.now() - t), l: [...i.map(x => ({ c: 0, n: x.nom, ...x.etat, q: x.actif })), ...a.map(x => ({ c: 1, n: x.nom, ...x.etat, q: x.actif }))] })
  }
  // Les écritures de la piste : jamais pendant le lever du pointeur
  window.__ecrituresPiste = 0
  app.tableau.piste.observe(() => window.__ecrituresPiste++)
  window.__leverSync = []
  window.addEventListener('pointerup', () => { const n = window.__ecrituresPiste; queueMicrotask(() => window.__leverSync.push(window.__ecrituresPiste - n)) }, true)
  app.viderPage()
  for (const n of ['regle', 'equerre', 'rapporteur', 'compas']) if (app.instrumentVisible(n)) app.basculerInstrument(n)
  app.choisirOutil('stylo')
  app.cam.x = 10; app.cam.y = 10; app.cam.z = 0.8
  app.rendu.toutRedessiner()
})
await page.waitForTimeout(300)
const zone = await page.evaluate(() => { const b = document.getElementById('zone').getBoundingClientRect(); return { x: b.left, y: b.top } })
const versEcran = async w => { const p = await page.evaluate(w => window.__app.cam.versEcran(w.x, w.y), w); return { x: p.x + zone.x, y: p.y + zone.y } }
const etat = nom => page.evaluate(n => ({ ...window.__app.instruments.get(n) }), nom)
/** Un glisser au pointeur, une image (16 ms) entre deux points, en coordonnées monde */
async function glisser(pts, { maj = false, image = 16 } = {}) {
  const e = []
  for (const w of pts) e.push(await versEcran(w))
  await page.mouse.move(e[0].x, e[0].y)
  if (maj) await page.keyboard.down('Shift')
  await page.mouse.down()
  for (let i = 1; i < e.length; i++) { await page.mouse.move(e[i].x, e[i].y); await dort(image) }
  await page.mouse.up()
  if (maj) await page.keyboard.up('Shift')
}
const ligne = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => { const u = (1 - Math.cos(Math.PI * i / n)) / 2; return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u } })
const montrer = nom => page.evaluate(n => { if (!window.__app.instrumentVisible(n)) window.__app.basculerInstrument(n) }, nom)
const ranger = nom => page.evaluate(n => { if (window.__app.instrumentVisible(n)) window.__app.basculerInstrument(n) }, nom)
const etapes = () => page.evaluate(() => window.__app.tableau.film.length)
const trait = async (a, b) => { await glisser(ligne(a, b, 14).map((p, i) => ({ x: p.x, y: p.y + 12 * Math.sin(i / 2) }))) }

// ---------- 1. En direct ----------
const debutSeance = await etapes()
await trait({ x: 100, y: 120 }, { x: 260, y: 140 })                     // un premier mot : la séance commence
await dort(900)
// Le compas
await montrer('compas'); await dort(1200)
let c = await etat('compas')
let parties = await page.evaluate(e => window.__parties(e), c)
await glisser(ligne(parties.P, { x: 420, y: 420 }, 24))                  // la pointe le pose
await dort(500)
c = await etat('compas'); parties = await page.evaluate(e => window.__parties(e), c)
await glisser(ligne(parties.M, { x: c.x + 170, y: c.y - 20 }, 20))       // la mine l'écarte
await dort(400)
c = await etat('compas'); parties = await page.evaluate(e => window.__parties(e), c)
await glisser(Array.from({ length: 20 }, (_, i) => ({ x: c.x + c.r * Math.cos(c.a + i * 0.05), y: c.y + c.r * Math.sin(c.a + i * 0.05) })), { maj: true })   // Maj + mine : le lever et le tourner
await dort(500)
c = await etat('compas'); parties = await page.evaluate(e => window.__parties(e), c)
// La tête ↻ : un arc d'environ 140°, dans le sens indirect (vers le haut de l'écran)
const T0 = parties.T, rT = Math.hypot(T0.x - c.x, T0.y - c.y), aT = Math.atan2(T0.y - c.y, T0.x - c.x)
const tete = Array.from({ length: 50 }, (_, i) => ({ x: c.x + rT * Math.cos(aT - i * 0.05), y: c.y + rT * Math.sin(aT - i * 0.05) }))
let captureArc = null
{
  const e = []
  for (const w of tete) e.push(await versEcran(w))
  await page.mouse.move(e[0].x, e[0].y); await page.mouse.down()
  for (let i = 1; i < e.length; i++) {
    await page.mouse.move(e[i].x, e[i].y); await dort(16)
    if (i === 30) { await page.screenshot({ path: `${ICI}e2e-direct-arc.png` }); captureArc = await page.evaluate(() => ({ d: Date.now(), a: window.__app.instruments.get('compas').a })) }
  }
  await page.mouse.up()
}
const arcPose = await page.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].find(f => f.type === 'cercle'))
verifier('direct : le compas a tracé un arc', !!arcPose?.arc, arcPose ? `r = ${arcPose.r.toFixed(1)}, ${((arcPose.arc.a1 - arcPose.arc.a0) * 180 / Math.PI).toFixed(0)}°` : '')
await dort(700)
await trait({ x: 520, y: 640 }, { x: 680, y: 660 })                     // un trait à main levée
await dort(600)
await ranger('compas')                                                   // le compas rangé
await dort(900)
// La règle
await montrer('regle'); await dort(800)
let r = await etat('regle')
const u = a => ({ x: Math.cos(a), y: Math.sin(a) }), v = a => ({ x: -Math.sin(a), y: Math.cos(a) })
const pt = (e, s, t) => ({ x: e.x + u(e.a).x * s + v(e.a).x * t, y: e.y + u(e.a).y * s + v(e.a).y * t })
await glisser(ligne(pt(r, 200, 40), { x: 160 + 200, y: 520 + 40 }, 30))   // on la déplace
await dort(400)
r = await etat('regle')
const pastille = pt(r, 860, 52)
const cible = { x: r.x + Math.cos(-0.35) * Math.hypot(860, 52), y: r.y + Math.sin(-0.35) * Math.hypot(860, 52) }
await glisser(Array.from({ length: 26 }, (_, i) => { const a0 = Math.atan2(pastille.y - r.y, pastille.x - r.x), a1 = Math.atan2(cible.y - r.y, cible.x - r.x), a = a0 + (a1 - a0) * i / 25, d = Math.hypot(860, 52); return { x: r.x + d * Math.cos(a), y: r.y + d * Math.sin(a) } }))   // on la tourne
await dort(500)
r = await etat('regle')
const nAvantBord = await etapes()
await glisser(ligne(pt(r, 40, -5), pt(r, 400, -5), 40))                   // le crayon le long du bord
const segPose = await page.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].pop())
verifier('direct : un segment le long de la règle', segPose?.type === 'polygone' && (await etapes()) > nAvantBord, segPose ? `${(Math.hypot(segPose.pts[2], segPose.pts[3]) / 40).toFixed(1)} cm` : '')
await dort(800)
// L'équerre : on la pose, on la tourne, on trace le long de son côté de l'angle droit, on la range
await montrer('equerre'); await dort(600)
let q = await etat('equerre')
await glisser(ligne(pt(q, 80, -40), { x: 750 + 80, y: 700 - 40 }, 24))
await dort(300)
q = await etat('equerre')
{
  const d = Math.hypot(416, 22), a0 = Math.atan2(-22, 416)
  await glisser(Array.from({ length: 22 }, (_, i) => { const a = a0 - i * 0.0125; return { x: q.x + d * Math.cos(a), y: q.y + d * Math.sin(a) } }))
}
await dort(300)
q = await etat('equerre')
const nAvantEquerre = await etapes()
await glisser(ligne(pt(q, -6, -30), pt(q, -6, -230), 30))
const segEquerre = await page.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].pop())
verifier('direct : un segment le long de l\'équerre', segEquerre?.type === 'polygone' && (await etapes()) > nAvantEquerre && Math.abs(q.a + 15 * Math.PI / 180) < 1e-9, segEquerre ? `${(Math.hypot(segEquerre.pts[2], segEquerre.pts[3]) / 40).toFixed(1)} cm, équerre à ${(-q.a * 180 / Math.PI).toFixed(0)}°` : '')
await dort(600)
await ranger('equerre')
await dort(700)
// Le rapporteur : on le pose, on le tourne pour mesurer
await montrer('rapporteur'); await dort(700)
let p = await etat('rapporteur')
await glisser(ligne(pt(p, 0, -80), { x: 900, y: 500 - 80 }, 26))
await dort(300)
p = await etat('rapporteur')
const pr = pt(p, 276, 0)
await glisser(Array.from({ length: 30 }, (_, i) => { const a = -i * 0.03; return { x: p.x + 276 * Math.cos(a), y: p.y + 276 * Math.sin(a) } }))
const mesure = await page.evaluate(() => window.__app.instruments.get('rapporteur').a)
verifier('direct : le rapporteur mesure au degré', Number.isInteger(Math.round(-mesure * 180 / Math.PI * 1e6) / 1e6), `${(-mesure * 180 / Math.PI).toFixed(3)}°`)
await dort(400)
await trait({ x: 100, y: 300 }, { x: 240, y: 300 })
await dort(700)
// Le constructeur : la médiatrice, avec les instruments
await page.evaluate(async () => {
  document.querySelector('[aria-label^="Programme de construction"]').click()
  await new Promise(r => setTimeout(r, 100))
  const p = document.querySelector('.panneau-construction')
  const coche = p.querySelector('.instruments input'); if (!coche.checked) coche.click()
  const ex = p.querySelector('.existants input'); if (ex.checked) ex.click()
  p.querySelector('textarea').value = 'Trace un segment [AB] de 6 cm.\nTrace la médiatrice de [AB].'
  p.querySelector('textarea').dispatchEvent(new Event('input'))
  p.querySelector('.tout').click()
})
await dort(300)
const ou = await versEcran({ x: 300, y: 820 })
await page.mouse.click(ou.x, ou.y)
for (let i = 0; i < 300; i++) {
  await dort(100)
  if (await page.evaluate(() => document.querySelector('.panneau-construction .suivante')?.textContent?.includes('terminée'))) break
}
await dort(1300)                                                         // les instruments du constructeur se rangent
await page.evaluate(() => document.querySelector('.panneau-construction .fermer').click())
await dort(500)
// Latence : un trait au stylo, instruments à l'écran ; la couche des instruments ne se repeint pas
const avantTrait = await page.evaluate(() => window.__peintures)
{
  const a = await versEcran({ x: 1000, y: 650 })
  await page.mouse.move(a.x, a.y); await page.mouse.down()
  const pendant = []
  for (let i = 1; i <= 40; i++) { await page.mouse.move(a.x + i * 4, a.y + Math.sin(i / 3) * 10); await dort(8); pendant.push(await page.evaluate(() => window.__peintures)) }
  await page.mouse.up()
  verifier('latence : la couche des instruments ne se repeint pas pendant un trait', pendant.every(n => n === avantTrait), `${pendant[pendant.length - 1] - avantTrait} peinture(s) pendant 40 points`)
}
await dort(300)
const finSeance = await etapes()
await dort(1500)
await ranger('rapporteur')                                              // après le dernier geste : l'épilogue
await dort(600)
// La fin : ce que montre la couche des instruments quand la classe quitte la page
const dernier = await page.evaluate(async () => {
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
  const app = window.__app, cv = document.querySelector('.couche-instruments')
  return { png: cv.toDataURL(), cam: { x: app.cam.x, y: app.cam.y, z: app.cam.z }, inst: [...app.instruments].map(([n, e]) => ({ n, ...e })) }
})
await page.screenshot({ path: `${ICI}e2e-direct-fin.png` })

// Le coût du témoin, et le lever
// L'horloge du navigateur est arrondie (100 µs) : on mesure le témoin en boucle, sur une piste à part
const cout = await page.evaluate(async () => {
  const { Piste } = await import('/src/piste.ts')
  const p = new Piste(() => {}, () => 'p')
  const l = [{ nom: 'regle', etat: { x: 0, y: 0, a: 0, r: 0 }, actif: null }, { nom: 'rapporteur', etat: { x: 5, y: 5, a: 0, r: 0 }, actif: null }]
  const N = 20000, mediane = v => v.sort((a, b) => a - b)[v.length >> 1]
  const im = [], bo = []
  let vider = 0, base = 1e6
  // Cinq essais (le premier chauffe le compilateur) : on garde la médiane
  for (let essai = 0; essai < 5; essai++) {
    let t0 = performance.now()
    for (let i = 0; i < N; i++) p.peinture(l, [], base + i * 16)
    im.push((performance.now() - t0) / N * 1000)
    base += N * 16 + 1000
    t0 = performance.now()
    for (let i = 0; i < N; i++) { l[0] = { nom: 'regle', etat: { x: i * 0.3, y: Math.sin(i / 9) * 30, a: i * 1e-4, r: 0 }, actif: 'corps' }; p.peinture(l, [], base + i * 16) }
    bo.push((performance.now() - t0) / N * 1000)
    base += N * 16 + 1000
    t0 = performance.now(); p.vider(); vider = performance.now() - t0
    l[0] = { nom: 'regle', etat: { x: 0, y: 0, a: 0, r: 0 }, actif: null }
  }
  return { immobile: mediane(im), bouge: mediane(bo), vider }
})
verifier('latence : le témoin coûte moins d\'1 µs par image', cout.immobile < 1 && cout.bouge < 1, `immobile ${cout.immobile.toFixed(2)} µs, en mouvement ${cout.bouge.toFixed(2)} µs ; la simplification, hors de l'image : ${cout.vider.toFixed(1)} ms pour ${20000} poses`)
const leve = await page.evaluate(() => window.__leverSync)
verifier('latence : aucun lever n\'écrit la piste dans le document', leve.every(n => n === 0), `${leve.length} levers`)

// ---------- 2. Le film élève ----------
const exp = await page.evaluate(async ({ de, a }) => {
  const E = await import('/src/revoir/exporter.ts'), F = await import('/src/revoir/format.ts')
  const app = window.__app, t = app.tableau
  const choix = { de, a, pages: [app.page], titre: 'Instruments' }
  const { film, sources } = E.exporterDetaille(t, choix)
  const sans = E.exporter(t, choix, { instruments: false })
  const texte = await F.ecrireFilm(film), texteSans = await F.ecrireFilm(sans)
  const heures = t.film.toArray().map(e => e.t)
  return { texte, texteSans, sources, heures, json: JSON.stringify(film).length, jsonSans: JSON.stringify(sans).length, piste: t.piste.length, avant: film.avant ?? 0 }
}, { de: debutSeance, a: finSeance - 1 })
writeFileSync(`${ICI}e2e-seance.mem`, exp.texte)
const vus = await page.evaluate(() => window.__vus)
console.log(`  film : ${exp.sources.length} gestes, .mem ${exp.texte.length} o (sans instruments ${exp.texteSans.length} o, +${((exp.texte.length / exp.texteSans.length - 1) * 100).toFixed(0)} %), piste ${exp.piste} morceaux, ${vus.length} peintures notées`)

/** L'état du direct à l'heure D : ce que montraient la peinture d'avant et celle d'après */
function encadrer(D) {
  let i = 0
  while (i + 1 < vus.length && vus[i + 1].d <= D) i++
  return [vus[i], vus[Math.min(vus.length - 1, i + 1)]]
}
const cle = x => x.n + (x.c ? '+' : '')
/** Le replay montre-t-il, pour chaque instrument, une pose entre celles du direct juste avant et juste après ?
 *  (à la simplification près : 0,5 unité et 2 mrad, et à la milliseconde près des heures notées) */
function conforme(l, D, tol = 0.8) {
  const [a, b] = encadrer(D)
  const pa = new Map(a.l.map(x => [cle(x), x])), pb = new Map(b.l.map(x => [cle(x), x]))
  const ecarts = []
  for (const x of l) {
    const y = pa.get(cle(x)), z = pb.get(cle(x)) ?? y
    if (!y && !z) { ecarts.push(`${cle(x)} absent du direct`); continue }
    const y2 = y ?? z
    const entre = (v, p, q, t) => v >= Math.min(p, q) - t && v <= Math.max(p, q) + t
    const ang = (v, p, q) => { const k = Math.round((p - v) / (2 * Math.PI)); return v + k * 2 * Math.PI }
    const ok = entre(x.x, y2.x, z.x, tol) && entre(x.y, y2.y, z.y, tol) && entre(ang(x.a, y2.a, z.a), y2.a, z.a, 0.006) && entre(x.r, y2.r, z.r, tol)
    if (!ok) ecarts.push(`${cle(x)} (${x.x.toFixed(1)}, ${x.y.toFixed(1)}, ${x.a.toFixed(3)}, ${x.r.toFixed(1)}) hors de [(${y2.x.toFixed(1)}, ${y2.y.toFixed(1)}, ${y2.a.toFixed(3)}, ${y2.r.toFixed(1)}) ; (${z.x.toFixed(1)}, ${z.y.toFixed(1)}, ${z.a.toFixed(3)}, ${z.r.toFixed(1)})]`)
  }
  // Rien de visible au direct qui manque au replay
  for (const y of a.l) if (!l.some(x => cle(x) === cle(y)) && (pb.has(cle(y)))) ecarts.push(`${cle(y)} manque au replay`)
  return ecarts
}

// ---------- 2b. Le lecteur des élèves ----------
const eleve = await ctx.newPage()
surveiller(eleve, 'lecteur')
await eleve.goto(URL0 + 'revoir.html')
await eleve.locator('input[type=file]').setInputFiles({ name: 'seance.mem', mimeType: 'application/json', buffer: Buffer.from(exp.texte) })
await eleve.waitForFunction(() => window.__revoir && window.__revoir.bobine)
await eleve.evaluate(() => {
  const w = window.__revoir, r = w.rendu
  window.__notes = []
  const noter = quoi => {
    const t = w.enTrace, now = performance.now()
    const l = [...r.instruments.map(x => ({ c: 0, n: x.nom, ...x.etat, q: x.actif })), ...r.instrumentsAnimes.map(x => ({ c: 1, n: x.nom, ...x.etat, q: x.actif }))]
    let tau = null, reel = null, k = w.k
    if (t && t.geste) {
      // Avant son début (le minuteur a sonné un rien trop tôt), c'est encore l'attente
      tau = Math.min(1, (now - t.debut) / t.duree) * t.total
      // (à la frontière τ = 0, le lecteur et ce relevé peuvent tomber de part et d'autre : on la laisse)
      if (tau >= 2 && tau < t.geste.duree) reel = t.geste.instant(tau); else tau = null
    }
    const a = r.apercu
    window.__notes.push({ quoi, now, k, tau, reel, l, apercu: a ? { type: a.type, x: a.x, y: a.y, r: a.r, arc: a.arc, pts: a.pts } : null, formes: r.formes.length })
  }
  const ri = r.redessinerInstruments.bind(r), rd = r.redessinerDirect.bind(r)
  r.redessinerInstruments = () => { noter('i'); ri() }
  r.redessinerDirect = () => { noter('d'); rd() }
})
const bob = await eleve.evaluate(() => {
  const b = window.__revoir.bobine
  return { n: b.n, avec: b.avecInstruments, gestes: Array.from({ length: b.n }, (_, k) => b.geste(k) ? { attente: b.geste(k).attente, duree: b.geste(k).duree } : null), duree: b.duree, sans: null }
})
verifier('lecteur : le film montre les instruments', bob.avec && bob.gestes.some(g => g), `${bob.gestes.filter(g => g).length} images avec manipulation, durée ${(bob.duree / 1000).toFixed(1)} s`)
// Lecture d'un bout à l'autre, à l'allure Normale, sans arrêt aux chapitres
await eleve.evaluate(() => { document.querySelector('.carte [data-a="lire"]').click() })
for (let i = 0; i < 600; i++) {
  await dort(250)
  const fin = await eleve.evaluate(() => !window.__revoir.enMarche && window.__revoir.k === window.__revoir.bobine.n - 1 && !window.__revoir.enTrace)
  if (fin) break
  if (i === 40) await eleve.screenshot({ path: `${ICI}e2e-lecteur-en-cours.png` })
}
const notes = await eleve.evaluate(() => window.__notes)
const finaleSansEquerre = l => l.length && l[l.length - 1].l.some(x => x.n === 'equerre')
/** L'heure (du tableau) du début de la fenêtre de l'image k du lecteur : chaque
 *  fenêtre se coupe juste après son étape (APRES_L_ETAPE, 50 ms : la dernière
 *  pose d'un geste est peinte une image d'écran après lui) */
const APRES = 50
const debutFenetre = k => k === 1 ? exp.heures[exp.sources[0]] + APRES - exp.avant : exp.heures[exp.sources[k - 2]] + APRES
let comparees = 0
const hors = []
for (const n of notes) {
  if (n.reel === null || n.quoi !== 'i') continue
  comparees++
  const e = conforme(n.l, debutFenetre(n.k) + n.reel)
  if (e.length) hors.push(`image ${n.k}, τ = ${n.tau.toFixed(0)} : ${e.join(' ; ')}`)
}
verifier('lecteur : pendant chaque manipulation, les instruments sont ceux du direct au même instant', comparees > 50 && hors.length === 0, `${comparees} images d'écran comparées${hors.length ? ', ' + hors.length + ' écarts : ' + hors.slice(0, 3).join(' | ') : ''}`)
// L'arc pousse sous la mine
// (relevé quand la couche « direct » est demandée : les instruments et l'aperçu de cette image sont alors posés tous deux)
const arcs = notes.filter(n => n.quoi === 'd' && n.apercu?.type === 'cercle' && n.apercu.arc)
const sousMine = arcs.filter(n => { const cp = n.l.find(x => x.n === 'compas'); return cp && Math.abs(cp.a - n.apercu.arc.a1) < 0.005 })
const loin = arcs.filter(n => !sousMine.includes(n)).slice(0, 6).map(n => { const cp = n.l.find(x => x.n === 'compas'); return `k${n.k} ${n.quoi} τ=${n.tau?.toFixed(0)} a=${cp?.a.toFixed(4)} c=${cp?.c} a1=${n.apercu.arc.a1.toFixed(4)}` })
verifier('lecteur : l\'arc pousse sous la mine du compas', arcs.length > 10 && sousMine.length >= arcs.length - 2, `${sousMine.length} / ${arcs.length} ${loin.join(' | ')}`)
// Après la manipulation, l'arc n'est pas redessiné
const kArc = await eleve.evaluate(() => { const b = window.__revoir.bobine; for (let k = 1; k < b.n; k++) if (b.tracees(k).size) return k; return -1 })
verifier('lecteur : l\'arc paru n\'est pas réesquissé', kArc > 0, `image ${kArc}`)
// Le compas a disparu au rangement
const compasApres = await eleve.evaluate(() => { const b = window.__revoir.bobine; const r = []; for (let k = 0; k < b.n; k++) r.push(b.instruments(k).has('compas')); return r })
const kRange = compasApres.lastIndexOf(true) + 1
verifier('lecteur : le compas disparaît au rangement, et ne revient pas', kRange > 1 && kRange < compasApres.length && compasApres.slice(kRange).every(x => !x), `présent jusqu'à l'image ${kRange - 1}`)
// Le constructeur : ses instruments passent aussi
verifier('lecteur : les instruments du constructeur sont rejoués', notes.some(n => n.l.some(x => x.c === 1 && x.n === 'compas')) && notes.some(n => n.l.some(x => x.c === 1 && x.n === 'regle')))
verifier('lecteur : l\'équerre est rejouée, puis rangée', notes.some(n => n.l.some(x => x.n === 'equerre')) && !finaleSansEquerre(notes))
// Le trait le long de la règle accompagne la règle
verifier('lecteur : le trait le long de la règle est rejoué', notes.some(n => n.apercu?.type === 'polygone' && n.l.some(x => x.n === 'regle' && !x.c)))
// L'image finale
const finale = await eleve.evaluate(() => { const r = window.__revoir.rendu; return [...r.instruments.map(x => ({ c: 0, n: x.nom, ...x.etat, q: x.actif })), ...r.instrumentsAnimes.map(x => ({ c: 1, n: x.nom, ...x.etat, q: x.actif }))] })
console.log('  direct à la fin        :', JSON.stringify(dernier.inst))
console.log('  lecteur à la fin       :', JSON.stringify(finale))
await eleve.screenshot({ path: `${ICI}e2e-lecteur-fin.png` })

// Un pas à pas au milieu de l'arc, pour la capture
await eleve.evaluate(k => { const c = document.querySelector('.curseur'); c.value = String(k - 1); c.dispatchEvent(new Event('input')) }, kArc)
await dort(300)
const gArc = bob.gestes[kArc]
// Le milieu de l'arc, sur le temps montré de la manipulation
const miArc = await eleve.evaluate(k => { const g = window.__revoir.bobine.geste(k); let a = -1, b = -1; for (let t = 0; t <= g.duree; t += 10) if (g.apercuA(t)) { if (a < 0) a = t; b = t } return (a + b) / 2 }, kArc)
await eleve.keyboard.press('ArrowRight')
await dort(Math.max(0, miArc))
await eleve.screenshot({ path: `${ICI}e2e-lecteur-arc.png` })
await dort(gArc.duree)

// ---------- 3. La revue en classe ----------
await page.getByRole('button', { name: 'Revoir la construction : une page, une séance, pas à pas' }).click()
await page.waitForFunction(() => window.__revue && window.__revue.ouvert && window.__revue.bande)
const rev = await page.evaluate(() => {
  const w = window.__revue, b = w.bande, r = w.rendu
  window.__notesRevue = []
  const film = w.film
  const noter = () => {
    const t = w.trace, now = w.maintenant, j = w.k
    let tau = null, reel = null, debutF = null
    if (t && t.geste) {
      const fait = Math.min(1, (now - t.debut) / t.duree)
      if (fait >= 0 && fait < t.partManip && fait * t.duree >= 2) {
        tau = (t.partManip > 0 ? fait / t.partManip : 1) * t.geste.duree
        reel = t.geste.instant(tau)
        const img = b.images[j], av = b.images[j - 1]
        const fin = film[img.main ?? img.e].t
        debutF = film[av.e]?.t ?? -Infinity
        if (!av.geste) debutF = Math.max(debutF, fin - 60000)
        debutF += 50                     // APRES_L_ETAPE
      }
    }
    const l = [...r.instruments.map(x => ({ c: 0, n: x.nom, ...x.etat, q: x.actif })), ...r.instrumentsAnimes.map(x => ({ c: 1, n: x.nom, ...x.etat, q: x.actif }))]
    window.__notesRevue.push({ now, j, tau, reel, debutF, l })
  }
  const ri = r.redessinerInstruments.bind(r)
  r.redessinerInstruments = () => { noter(); ri() }
  return { n: b.images.length, manips: b.manips ? b.manips.filter(Boolean).length : 0 }
})
verifier('revue : la bande rejoue les instruments', rev.manips > 0, `${rev.manips} images avec manipulation sur ${rev.n}`)
await page.evaluate(() => { const w = window.__revue; w.choisirAllure(1); w.arretAuxParties = false; w.aller(0); w.basculer() })
for (let i = 0; i < 600; i++) {
  await dort(250)
  const fin = await page.evaluate(() => !window.__revue.enMarche && !window.__revue.trace)
  if (fin) break
  if (i === 30) await page.screenshot({ path: `${ICI}e2e-revue-en-cours.png` })
}
const notesRevue = await page.evaluate(() => window.__notesRevue)
let compareesR = 0
const horsR = []
for (const n of notesRevue) {
  if (n.reel === null) continue
  compareesR++
  const e = conforme(n.l, n.debutF + n.reel)
  if (e.length) horsR.push(`image ${n.j}, τ = ${n.tau.toFixed(0)} : ${e.join(' ; ')}`)
}
verifier('revue : pendant chaque manipulation, les instruments sont ceux du direct au même instant', compareesR > 50 && horsR.length === 0, `${compareesR} images d'écran comparées${horsR.length ? ', ' + horsR.length + ' écarts : ' + horsR.slice(0, 3).join(' | ') : ''}`)
const finaleRevue = await page.evaluate(() => { const r = window.__revue.rendu; return [...r.instruments.map(x => ({ c: 0, n: x.nom, ...x.etat, q: x.actif })), ...r.instrumentsAnimes.map(x => ({ c: 1, n: x.nom, ...x.etat, q: x.actif }))] })
await page.screenshot({ path: `${ICI}e2e-revue-fin.png` })
await page.keyboard.press('Escape')
await dort(300)

// ---------- 4. Les pixels de l'image finale ----------
/** La couche des instruments du tableau, redessinée avec ces instruments et la caméra du dernier geste */
async function couche(l) {
  return page.evaluate(async ({ l, cam }) => {
    const app = window.__app, r = app.rendu
    const garde = { i: r.instruments, a: r.instrumentsAnimes, t: r.temoin, x: app.cam.x, y: app.cam.y, z: app.cam.z }
    r.temoin = null
    app.cam.x = cam.x; app.cam.y = cam.y; app.cam.z = cam.z
    r.instruments = l.filter(x => !x.c).map(x => ({ nom: x.n, etat: { x: x.x, y: x.y, a: x.a, r: x.r }, actif: x.q }))
    r.instrumentsAnimes = l.filter(x => x.c).map(x => ({ nom: x.n, etat: { x: x.x, y: x.y, a: x.a, r: x.r }, actif: x.q }))
    r.redessinerInstruments()
    await new Promise(ok => requestAnimationFrame(() => requestAnimationFrame(ok)))
    const png = document.querySelector('.couche-instruments').toDataURL()
    r.instruments = garde.i; r.instrumentsAnimes = garde.a; r.temoin = garde.t
    app.cam.x = garde.x; app.cam.y = garde.y; app.cam.z = garde.z
    r.toutRedessiner()
    return png
  }, { l, cam: dernier.cam })
}
/** Combien de pixels diffèrent, et de combien au plus */
async function ecart(a, b) {
  return page.evaluate(async ({ a, b }) => {
    const lire = async s => { const i = new Image(); i.src = s; await i.decode(); const c = new OffscreenCanvas(i.width, i.height), x = c.getContext('2d'); x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data }
    const p = await lire(a), q = await lire(b)
    let n = 0, max = 0, encre = 0
    for (let i = 0; i < p.length; i += 4) {
      const d = Math.max(Math.abs(p[i] - q[i]), Math.abs(p[i + 1] - q[i + 1]), Math.abs(p[i + 2] - q[i + 2]), Math.abs(p[i + 3] - q[i + 3]))
      if (p[i + 3]) encre++
      if (d) { n++; max = Math.max(max, d) }
    }
    return { n, max, encre }
  }, { a, b })
}
const direct = dernier.png
const memeEtat = await couche(dernier.inst.map(x => ({ c: 0, n: x.n, x: x.x, y: x.y, a: x.a, r: x.r, q: null })))
const e0 = await ecart(direct, memeEtat)
verifier('pixels : la couche redessinée avec l\'état du direct est celle du direct (témoin de la méthode)', e0.n === 0, `${e0.n} pixels diffèrent sur ${e0.encre} encrés`)
const dLecteur = await ecart(direct, await couche(finale))
verifier('pixels : à l\'image finale, la couche du lecteur est celle du direct', dLecteur.n === 0, `${dLecteur.n} pixels diffèrent (au plus de ${dLecteur.max}) sur ${dLecteur.encre} encrés`)
const dRevue = await ecart(direct, await couche(finaleRevue))
verifier('pixels : à l\'image finale, la couche de la revue est celle du direct', dRevue.n === 0, `${dRevue.n} pixels diffèrent (au plus de ${dRevue.max}) sur ${dRevue.encre} encrés`)

// ---------- 5. Ce qui reste ----------
verifier('aucune erreur JS', erreurs.length === 0, erreurs.slice(0, 5).join(' | '))
writeFileSync(`${ICI}e2e-resultats.json`, JSON.stringify({ mem: exp.texte.length, memSans: exp.texteSans.length, piste: exp.piste, gestes: exp.sources.length, peintures: vus.length, temoin: cout, lecteur: { comparees, hors: hors.length }, revue: { comparees: compareesR, hors: horsR.length }, pixels: { lecteur: dLecteur, revue: dRevue } }, null, 2))
await navigateur.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est vert.')
process.exit(echecs ? 1 : 0)
