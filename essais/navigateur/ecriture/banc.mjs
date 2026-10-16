// =============================================================
// LE BANC : ÉCRIRE EN DIRECT, PUIS REJOUER (élève et revue), ET TOUT FILMER
// node banc.mjs [sortie.json]
// 1. Le tableau (http://localhost:5173) : un stylet (pointerType « pen »,
//    avec pression) écrit « Bonjour » puis « été » à la vitesse d'une main.
//    On filme chaque image d'écran et on note le temps de chaque point.
// 2. Le film élève est fabriqué comme « Voir comme un élève » (exporter),
//    écrit en fichier .mem, et ouvert dans revoir.html (fichier choisi).
//    Même caméra que le tableau : les images se comparent pixel à pixel.
// 3. La revue en classe est ouverte sur le même tableau, à l'allure
//    Normale puis Rapide (celle qu'elle prend d'office).
// =============================================================
import { chromium } from '../commun/playwright.mjs'
import fs from 'node:fs'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { ecrire, evenements } from './ecriture.mjs'
import { installer, journal } from './enregistreur.mjs'

const ICI = path.dirname(new URL(import.meta.url).pathname)
const SORTIE = process.argv[2] || path.join(ICI, 'mesures.json')
const ADRESSE = 'http://localhost:5173'
const CADRE = { x: 170, y: 220, l: 300, h: 200 }       // le mot, en monde
const PAS = Number(process.env.PAS || 5)               // ms entre deux échantillons du stylet (200 Hz)
const VITESSE = Number(process.env.VITESSE || 1)

const dormir = ms => new Promise(r => setTimeout(r, ms))

// ---------- Ce qu'on écrit ----------
const mot1 = ecrire('Bonjour', { x: 200, y: 300 }, { graine: 7, vitesse: VITESSE })
const mot2 = ecrire('été', { x: 214, y: 392 }, { graine: 11, vitesse: VITESSE })
mot2[0].attente = 950                                  // on passe à la ligne
const traits = [...mot1, ...mot2]
const evts = evenements(traits, PAS)

const navigateur = await chromium.launch()
const contexte = await navigateur.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
const tableau = await contexte.newPage()
tableau.on('pageerror', e => console.log('ERREUR tableau', e.message))
await tableau.goto(ADRESSE + '/')
await tableau.waitForFunction(() => window.__app && window.__revue !== undefined || window.__app)
await tableau.waitForTimeout(800)
const cam = await tableau.evaluate(() => ({ x: window.__app.cam.x, y: window.__app.cam.y, z: window.__app.cam.z }))
const ecran = (x, y) => ({ x: x * cam.z + cam.x, y: y * cam.z + cam.y })

// ---------- 1. Le direct ----------
await tableau.evaluate(journal)
await tableau.evaluate(installer, ['tableau', CADRE])
const cdp = await contexte.newCDPSession(tableau)
await tableau.waitForTimeout(300)
const retards = []
const envois = []
const t0 = performance.now() + 200
for (const e of evts) {
  const cible = t0 + e.t
  const w = cible - performance.now()
  // On rend la main à Node à chaque fois (sinon rien ne part) ; on n'attend
  // pas la réponse du navigateur (elle vient à l'image suivante, 16 ms plus tard)
  if (w > 1.5) await dormir(w - 1.2)
  else await new Promise(r => setImmediate(r))
  retards.push(performance.now() - cible)
  const s = ecran(e.x, e.y)
  if (e.type === 'bas') envois.push(cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: s.x, y: s.y, button: 'left', buttons: 1, clickCount: 1, pointerType: 'pen', force: e.p }))
  else if (e.type === 'bouge') envois.push(cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: s.x, y: s.y, button: 'left', buttons: 1, pointerType: 'pen', force: e.p }))
  else envois.push(cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: s.x, y: s.y, button: 'left', buttons: 0, clickCount: 1, pointerType: 'pen' }))
}
await Promise.all(envois)
await tableau.waitForTimeout(1500)
const direct = await tableau.evaluate(() => {
  window.__enr.actif = false
  const film = window.__app.tableau.film.toArray().map(e => ({ t: e.t, page: e.page }))
  return { enr: window.__enr, journal: { ev: window.__journal.ev, traits: window.__journal.traits }, film, reco: window.__app.reconnaissance }
})
// Ce que l'enregistreur a gardé du direct est rapatrié : on le libère, pour que la
// revue (sur la même page) ne paie pas un grand ménage de la mémoire en pleine lecture
await tableau.evaluate(() => { window.__enr = null; window.__journal.ev = []; window.__journal.traits = [] })
retards.sort((a, b) => a - b)
console.log(`direct : ${direct.journal.traits.length} traits posés pour ${traits.length} écrits, ${direct.enr.frames.length} images, retard d'envoi médian ${retards[retards.length >> 1].toFixed(2)} ms, max ${retards[retards.length - 1].toFixed(1)} ms`)

// ---------- 2. Le film élève ----------
const exporte = await tableau.evaluate(async () => {
  const { exporter } = await import('/src/revoir/exporter.ts')
  const { ecrireFilm } = await import('/src/revoir/format.ts')
  const app = window.__app
  const film = app.tableau.film.toArray()
  // la séance commence au premier trait (pas à la création de la page)
  const de = film.findIndex((e, i) => i > 0)
  const f = exporter(app.tableau, { de, a: film.length - 1, pages: [app.page], titre: 'Banc écriture' })
  const texte = await ecrireFilm(f)
  return { film: f, texte }
})
fs.writeFileSync(path.join(ICI, 'banc.mem'), exporte.texte)
console.log(`film élève : ${exporte.film.etapes.length} gestes, fichier .mem ${exporte.texte.length} octets`)

const revoir = await contexte.newPage()
revoir.on('pageerror', e => console.log('ERREUR revoir', e.message))
await revoir.goto(ADRESSE + '/revoir.html')
await revoir.waitForSelector('input[type=file]', { state: 'attached' })
await revoir.setInputFiles('input[type=file]', { name: 'banc.mem', mimeType: 'application/json', buffer: Buffer.from(exporte.texte) })
await revoir.waitForFunction(() => window.__revoir?.bobine)
await revoir.waitForTimeout(500)
// La même caméra que le tableau
await revoir.evaluate(c => { const r = window.__revoir; r.cam.x = c.x; r.cam.y = c.y; r.cam.z = c.z; r.rendu.toutRedessiner() }, cam)
await revoir.waitForTimeout(200)
const infoRevoir = await revoir.evaluate(() => {
  const b = window.__revoir.bobine
  return { n: b.n, temps: b.temps, delais: Array.from({ length: b.n }, (_, k) => b.delai(k)), scene: [window.__revoir.rendu.l, window.__revoir.rendu.h] }
})
await revoir.evaluate(installer, ['revoir', CADRE])
await revoir.click('[data-a=lire]')
await revoir.waitForFunction(() => !window.__revoir.enMarche && window.__revoir.k === window.__revoir.bobine.n - 1, null, { timeout: 60000 })
await revoir.waitForTimeout(1500)
const eleve = await revoir.evaluate(() => { window.__enr.actif = false; return window.__enr })
console.log(`revoir : ${eleve.frames.length} images`)

// ---------- 3. La revue en classe ----------
const revues = {}
await tableau.bringToFront()
await tableau.evaluate(() => window.__revue.ouvrir())
await tableau.waitForTimeout(700)
for (const [nom, touche] of [['normal', '2'], ['rapide', '3']]) {
  await tableau.keyboard.press(touche)
  await tableau.waitForTimeout(200)
  await tableau.evaluate(installer, ['revue', CADRE])
  await tableau.keyboard.press(' ')
  await tableau.waitForTimeout(300)
  await tableau.waitForFunction(() => !window.__revue.enMarche && !window.__revue.trace, null, { timeout: 60000 })
  await tableau.waitForTimeout(1200)
  revues[nom] = await tableau.evaluate(() => {
    window.__enr.actif = false
    const r = window.__revue
    return { enr: window.__enr, n: r.bande.images.length, attentes: Array.from(r.bande.attentes), ech: Array.from(r.ech) }
  })
  console.log(`revue ${nom} : ${revues[nom].enr.frames.length} images, ${revues[nom].n} images de bande`)
}

fs.writeFileSync(SORTIE, JSON.stringify({ cadre: CADRE, cam, pas: PAS, ecrits: traits.map(t => ({ lettre: t.lettre, rang: t.rang, attente: t.attente, ech: t.ech })),
  retards, direct, exporte: { film: exporte.film, taille: exporte.texte.length }, infoRevoir, eleve, revues }))
console.log('écrit', SORTIE)
await navigateur.close()
