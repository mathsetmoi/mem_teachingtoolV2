// ESSAI DE L’EMPLOI DU TEMPS (lot 23, lot 2 de l’audit), sur le serveur de
// développement (port 5173, ou DEV=…), l'horloge de Playwright. La
// bibliothèque : LFB › 2 › 2nde 3 = { 2_13_Probas, 2_12_Stats }, LFB › 1s ›
// 1re spé 2 = { 1s_04_Trigo }, LyFEL › 4e B = { 4_05_Pythagore }. La
// semaine du lundi 9 novembre 2026 est une semaine A.
// A. Lundi 10 h 12, l'onglet sur Trigo (séance d'hier) : « Bonjour ! » a le
//    créneau (LFB, salle B12, 10 h 05 – 11 h 00 · 2nde 3), « Nouvelle séance
//    en 2nde 3 », « 2_13_Probas », « Rester sur « 1s_04_Trigo » » ; le gros
//    bouton ouvre Probas sur une nouvelle séance, sans fenêtre ;
// B. Probas rechargé à 10 h 20 : pas de « Bonjour ! » (la séance a commencé
//    pendant ce créneau) ;
// C. 11 h 01, l'outil resté sur Probas : la bulle « 11 h 05 · 1re spé 2
//    arrive · Ouvrir 1s_04_Trigo » ; son bouton ouvre Trigo ; × la ferme ;
// E. 12 h 40, sans créneau : la fenêtre d'avant, et « Prochain cours : 14 h 05,
//    4e B · LyFEL · ouvrir 4_05_Pythagore » ;
// F. Mardi 12 h 03 (semaine A) : le créneau de la semaine A ; « On est en
//    semaine B » corrige, le mardi suivant devient A ;
// G. La fenêtre « Mon emploi du temps » par le menu ⋯ : la grille, un clic
//    dans une case vide ajoute un créneau, la classe se choisit, tout reste
//    après rechargement ; « Emploi du temps… » au menu ⋯ de la bibliothèque ;
// H. Importer de Pronote, un fichier .ics : la classe devinée, A et B, les
//    créneaux ajoutés ;
// I. Le lien synchronisé (le relais simulé) : gardé dans ce navigateur, et un
//    cours annulé aujourd'hui retire le créneau de « Bonjour ! » ;
// J. L'emploi du temps vide : « Saisir mon emploi du temps… » dans « Bonjour ! ».
// CAPTURES=<dossier> : des captures PNG pour le professeur.
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'
import { join } from 'node:path'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const CAPTURES = process.env.CAPTURES ?? null
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const erreurs = []
const H = 3600_000
/** Lundi 9 novembre 2026, à l'heure de l'ordinateur */
const lundi = (h, m = 0) => new Date(2026, 10, 9, h, m).getTime()

const OUTILS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
}

const nav = await chromium.launch()
const c = await nav.newContext({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: CAPTURES ? 2 : 1 })
await c.addInitScript(OUTILS)
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g|script\.google/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: lundi(8) - 30 * H })
const pret = async () => { await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(1500); await p.waitForTimeout(200) }
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
const attendreClasseur = async (nom) => {
  for (let k = 0; k < 60 && (await p.evaluate(() => window.__app?.classeur?.nom).catch(() => null)) !== nom; k++) {
    await p.clock.runFor(500).catch(() => {}); await p.waitForTimeout(100)
  }
  await pret()
}
const toasts = () => p.evaluate(() => window.__toasts.slice())
const capture = async nom => { if (CAPTURES) await p.screenshot({ path: join(CAPTURES, nom) }) }
const allerA = async id => { await p.goto(`${DEV}?classeur=${id}`); await pret() }
const vueAccueil = () => p.evaluate(() => ({
  dlg: !!document.querySelector('dialog.dialogue-accueil[open]'),
  creneau: document.querySelector('.accueil-creneau')?.textContent ?? null,
  gros: document.querySelector('.accueil-nouvelle')?.textContent,
  chapitre: document.querySelector('.accueil-nom-chapitre')?.textContent,
  rester: document.querySelector('.accueil-rester')?.textContent ?? null,
  continuer: document.querySelector('.accueil-continuer')?.textContent ?? null,
  prochain: document.querySelector('.accueil-prochain')?.textContent ?? null,
  semaine: document.querySelector('.accueil-semaine')?.textContent ?? null,
  saisir: document.querySelector('.accueil-saisir')?.textContent ?? null,
}))
const EDT = (creneaux, o = {}) => ({ v: 1, creneaux, couleurs: {}, correspondances: {}, lundiA: new Date(2026, 10, 9).getTime(), ...o })
const cr = (n, jour, debut, fin, dossier, o = {}) => ({ id: n.toString(16).padStart(16, '0'), jour, debut, fin, semaines: 'AB', dossier, nom: '', ...o })
const SEMAINE = [
  cr(1, 1, 605, 660, 'd2nde3', { salle: 'B12' }), cr(2, 1, 665, 720, 'd1spe2', { salle: 'B12' }), cr(3, 1, 845, 960, 'd4b', { salle: 'S3' }),
  cr(4, 2, 725, 780, 'd2nde3', { semaines: 'A', salle: 'A04' }), cr(5, 2, 725, 780, 'd2nde3', { semaines: 'B', nom: '2nde 3 (groupe 1)', salle: 'A04' }),
]
const poserEDT = e => p.evaluate(e => window.__registre.ecrireReglage('emploi-du-temps', e), e)

// ---------- La bibliothèque ----------
await p.goto(DEV); await pret()
const ids = await p.evaluate(async () => {
  const r = window.__registre, app = window.__app
  const { etatNeuf } = await import('/src/classeurs/neuf.ts')
  const { creerBase } = await import('/src/classeurs/bases.ts')
  const { idClasseur, baseDe } = await import('/src/classeurs/demarrage.ts')
  const t = Date.now()
  const dossier = (id, nom, parent, etiquette) => r.ajouterDossier({ id, nom, parent, couleur: '#3b6fb6', ...(etiquette ? { etiquette } : {}), cree: t })
  await dossier('lfb', 'LFB', null); await dossier('n2', '2', 'lfb', '2nde'); await dossier('d2nde3', '2nde 3', 'n2')
  await dossier('n1', '1s', 'lfb', '1re spé'); await dossier('d1spe2', '1re spé 2', 'n1')
  await dossier('lyfel', 'LyFEL', null); await dossier('d4b', '4e B', 'lyfel', '4ème')
  await r.modifierClasseur(app.classeur.id, f => { f.dossier = 'd1spe2'; f.nom = '1s_04_Trigo' })
  const neuf = async (nom, dossier, il) => {
    const id = idClasseur()
    await r.creerClasseur({ id, base: baseDe(id), nom, dossier, etiquettes: [], cree: t - 3 * 3600e3, modifie: t - il, ouvert: t - il, pages: 1, listeSeances: [{ id: 's' + nom, debut: t - il, pages: 1 }] }, async base => creerBase(base, await etatNeuf('blanc'), { id, nom }))
    return id
  }
  return { trigo: app.classeur.id, probas: await neuf('2_13_Probas', 'd2nde3', 3600e3), stats: await neuf('2_12_Stats', 'd2nde3', 30 * 86400e3), pythagore: await neuf('4_05_Pythagore', 'd4b', 3600e3) }
})
await trait(500, 300)
await p.clock.runFor(40_000)

// ---------- J. Vide : le lien « Saisir mon emploi du temps… » ----------
await p.clock.setSystemTime(lundi(7, 30))
await p.reload(); await pret()
let v = await vueAccueil()
ok(v.dlg && v.saisir === 'Saisir mon emploi du temps…' && !v.creneau, 'J1) L\'emploi du temps vide : « Bonjour ! » a le lien « Saisir mon emploi du temps… », sans créneau', v)
await p.click('.accueil-saisir'); await p.waitForTimeout(300)
ok(await p.isVisible('dialog.dialogue-edt[open]'), 'J2) Le lien ouvre « Mon emploi du temps »')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- A. Lundi 10 h 12, l'onglet sur Trigo ----------
await poserEDT(EDT(SEMAINE))
await p.clock.setSystemTime(lundi(10, 12))
await p.reload(); await pret()
v = await vueAccueil()
ok(v.dlg && norm(v.creneau) === 'LFBen cours depuis 7 minutes · salle B12 · semaine A10 h 05 – 11 h 00 · 2nde 3', 'A1) Le créneau en tête : LFB, en cours depuis 7 minutes, salle B12, semaine A, 10 h 05 – 11 h 00 · 2nde 3', v)
ok(v.gros === 'Nouvelle séance en 2nde 3' && v.chapitre === '2_13_Probas' && v.rester === 'Rester sur « 1s_04_Trigo »' && v.continuer === null, 'A2) « Nouvelle séance en 2nde 3 », le chapitre en cours 2_13_Probas, « Rester sur « 1s_04_Trigo » » à la place de « Continuer »', v)
await capture('1-bonjour-creneau.png')
// La liste des chapitres : ceux de la 2nde 3
await p.click('.accueil-changer'); await p.waitForTimeout(200)
const chap = await p.evaluate(() => [...document.querySelectorAll('.accueil-un-chapitre .nom')].map(x => x.textContent))
ok(chap.join('|') === '2_13_Probas|2_12_Stats', 'A3) « changer de chapitre » : les chapitres de la 2nde 3', chap)
await p.click('.accueil-retour')
await p.click('.accueil-nouvelle')
await attendreClasseur('2_13_Probas')
let e = await p.evaluate(() => ({ dlg: !!document.querySelector('dialog[open]'), seances: window.__app.tableau.seancesDuClasseur().length, debut: window.__app.tableau.derniereSeance()?.debut }))
ok(!e.dlg && e.seances >= 1 && e.debut >= lundi(10), 'A4) Le gros bouton ouvre 2_13_Probas sur une séance d\'aujourd\'hui, sans fenêtre', e)
await trait(500, 300)

// ---------- B. Rechargé à 10 h 20 : on continue ----------
await p.clock.setSystemTime(lundi(10, 20))
await p.reload(); await pret()
v = await vueAccueil()
ok(!v.dlg, 'B1) Probas rechargé à 10 h 20 : pas de « Bonjour ! » (la séance a commencé pendant ce créneau)', v)

// ---------- C. 11 h 01, la bulle ----------
await p.clock.runFor(30_000)
await p.clock.setSystemTime(lundi(11, 1))
await p.clock.runFor(31_000); await p.waitForTimeout(300)
let b = await p.evaluate(() => document.querySelector('.bulle-edt')?.textContent ?? null)
ok(norm(b) === 'LFB · 11 h 05 · 1re spé 2 arriveOuvrir 1s_04_Trigo×', 'C1) 11 h 01 : la bulle « LFB · 11 h 05 · 1re spé 2 arrive · Ouvrir 1s_04_Trigo »', b)
const boite = await p.evaluate(() => { const r = document.querySelector('.bulle-edt').getBoundingClientRect(); return { haut: r.top, gauche: r.left, droite: r.right } })
ok(boite.haut > 40 && boite.gauche > 0 && boite.droite < 1366, 'C2) Elle est sous la barre du haut, dans l\'écran', boite)
await capture('3-bulle.png')
await p.click('.bulle-ouvrir')
await attendreClasseur('1s_04_Trigo')
e = await p.evaluate(() => ({ dlg: !!document.querySelector('dialog[open]'), debut: window.__app.tableau.derniereSeance()?.debut, bulle: !!document.querySelector('.bulle-edt') }))
ok(!e.dlg && e.debut >= lundi(11) && !e.bulle, 'C3) Son bouton ouvre 1s_04_Trigo sur une nouvelle séance, sans fenêtre ni bulle', e)

// ---------- E. 12 h 40 : le prochain cours ----------
await p.clock.setSystemTime(lundi(12, 40) + 2 * H)
await p.clock.setSystemTime(lundi(12, 40))
await allerA(ids.probas)
v = await vueAccueil()
// La séance de Probas date de 10 h 05 : plus d'une heure
ok(v.dlg && !v.creneau && v.chapitre === '2_13_Probas' && norm(v.prochain) === 'Prochain cours : 14 h 05, 4e B LyFEL · ouvrir 4_05_Pythagore', 'E1) 12 h 40 : la fenêtre d\'avant, avec « Prochain cours : 14 h 05, 4e B · LyFEL · ouvrir 4_05_Pythagore »', v)
await capture('2-bonjour-prochain.png')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- F. Mardi 12 h 03 : semaine A, puis « On est en semaine B » ----------
await p.clock.setSystemTime(new Date(2026, 10, 10, 12, 3).getTime())
await p.reload(); await pret()
v = await vueAccueil()
ok(v.dlg && /12 h 05 – 13 h 00 · 2nde 3$/.test(norm(v.creneau)) && /semaine A/.test(v.creneau) && norm(v.semaine) === 'Pas la bonne semaine ? On est en semaine B', 'F1) Mardi 12 h 03 : le créneau de la semaine A, et « Pas la bonne semaine ? On est en semaine B »', v)
await p.click('.accueil-changer-semaine'); await p.waitForTimeout(300)
const lundiA = await p.evaluate(async () => (await window.__registre.reglage('emploi-du-temps')).lundiA)
ok(lundiA === new Date(2026, 10, 16).getTime(), 'F2) L\'alternance repart : la semaine du 16 novembre devient A', new Date(lundiA).toString())
await p.reload(); await pret()
v = await vueAccueil()
ok(/2nde 3 \(groupe 1\)$/.test(norm(v.creneau)) && /semaine B/.test(v.creneau), 'F3) Rechargé : la semaine B, le groupe 1', v)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- G. La fenêtre « Mon emploi du temps » ----------
await p.evaluate(() => window.__app.ui.boutonFichier.click()); await p.waitForTimeout(400)
const entree = await p.evaluate(() => { const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden); const l = m ? [...m.querySelectorAll('.menu-item')].map(e => e.dataset.action) : []; return { l, i: l.indexOf('emploi-du-temps'), b: l.indexOf('bibliotheque') } })
ok(entree.i === entree.b + 1, 'G1) « Emploi du temps… » au menu ⋯ du tableau, juste sous « Bibliothèque des classeurs… »', entree)
await p.click('.menu-flottant:not([hidden]) [data-action="emploi-du-temps"]')
await p.waitForTimeout(400)
let g = await p.evaluate(() => ({
  dlg: !!document.querySelector('dialog.dialogue-edt[open]'),
  titre: document.querySelector('#edt-titre')?.textContent,
  cases: [...document.querySelectorAll('.edt-case b')].map(x => x.textContent),
  legende: document.querySelector('.edt-legende')?.textContent,
  etat: document.querySelector('.edt-etat')?.textContent,
  defile: document.querySelector('.dialogue-edt').scrollWidth > document.querySelector('.dialogue-edt').clientWidth,
}))
ok(g.dlg && g.titre === 'Mon emploi du temps' && g.cases.length === 4 && g.legende === 'LFBLyFEL', 'G2) La grille de la semaine B : 4 créneaux, la légende LFB et LyFEL', g)
ok(/Cette semaine \(du 9 novembre\) est une semaine B/.test(norm(g.etat)) && !g.defile, 'G3) « Cette semaine (du 9 novembre) est une semaine B », sans défilement de côté', g)
// Un clic sur une case vide : le mercredi à 9 h
const col = await p.$$('.edt-colonne')
const r = await col[2].boundingBox()
await p.mouse.click(r.x + r.width / 2, r.y + 1 * 48 + 10)
await p.waitForTimeout(300)
await p.selectOption('.edt-classe', 'd4b')
await p.fill('.edt-salle', 'S7'); await p.press('.edt-salle', 'Tab')
await p.waitForTimeout(400)
let cre = await p.evaluate(async () => (await window.__registre.reglage('emploi-du-temps')).creneaux.find(c => c.jour === 3))
ok(cre && cre.debut === 545 && cre.fin === 600 && cre.dossier === 'd4b' && cre.salle === 'S7', 'G4) Un clic sur une case vide (mercredi, 9 h) ajoute un créneau 9 h 05 – 10 h 00, la classe et la salle s\'enregistrent', cre)
const auto = await p.evaluate(() => document.querySelector('.edt-classeur label')?.textContent)
ok(/Le chapitre en cours \(4_05_Pythagore\)/.test(auto), 'G5) Le classeur : « Le chapitre en cours (4_05_Pythagore) » par défaut', auto)
await capture('4-fenetre-semaine.png')

// ---------- H. Importer de Pronote : un fichier .ics ----------
const d = (k, j, h, m) => { const x = new Date(2026, 10, 9 + 7 * k + j, h, m); const z = n => String(n).padStart(2, '0'); return `${x.getFullYear()}${z(x.getMonth() + 1)}${z(x.getDate())}T${z(h)}${z(m)}00` }
const ev = (deb, fin, s, salle, extra = []) => ['BEGIN:VEVENT', `DTSTART:${deb}`, `DTEND:${fin}`, `SUMMARY:${s}`, `LOCATION:${salle}`, ...extra, 'END:VEVENT']
const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', ...[0, 1, 2, 3].flatMap(k => [
  ...ev(d(k, 3, 8, 5), d(k, 3, 9, 0), 'MATHEMATIQUES - 2NDE3', 'B12'),
  ...(k % 2 ? [] : ev(d(k, 4, 10, 5), d(k, 4, 11, 0), 'MATHEMATIQUES - 1G2 SPE', 'B10')),
]), 'END:VCALENDAR'].join('\r\n')
await p.click('.edt-pronote'); await p.waitForTimeout(200)
await p.check('.edt-mode-fichier')
await p.setInputFiles('.edt-fichier', { name: 'Edt_LFB.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics) })
await p.click('.edt-lire'); await p.waitForTimeout(400)
let lignes = await p.evaluate(() => [...document.querySelectorAll('.edt-table tbody tr')].map(tr => [...tr.cells].slice(0, 3).map(x => x.textContent).join(' | ') + ' | ' + tr.querySelector('select').selectedOptions[0].textContent))
ok(lignes.length === 2 && lignes[0] === 'Jeu 8 h 05 – 9 h 00 · A et B | MATHEMATIQUES - 2NDE3 | B12 | LFB › 2 › 2nde 3' && lignes[1] === 'Ven 10 h 05 – 11 h 00 · B | MATHEMATIQUES - 1G2 SPE | B10 | Ne pas importer', 'H1) « Vérifier les créneaux » : jeudi A et B (la 2nde 3 devinée), vendredi une semaine sur deux, celle du 9 novembre, devenue B (classe à choisir)', lignes)
await capture('5-pronote-verifier.png')
await p.selectOption('.edt-table tbody tr:nth-child(2) select', 'd1spe2')
await p.click('.edt-importer'); await p.waitForTimeout(400)
let tout = await p.evaluate(async () => (await window.__registre.reglage('emploi-du-temps')))
const venus = tout.creneaux.filter(c => c.pronote)
ok(venus.length === 2 && venus.some(c => c.jour === 4 && c.debut === 485 && c.dossier === 'd2nde3' && c.semaines === 'AB') && venus.some(c => c.jour === 5 && c.semaines === 'B' && c.dossier === 'd1spe2'), 'H2) Importés : les deux créneaux, avec leur classe et leurs semaines', venus)
ok(tout.correspondances['MATHEMATIQUES - 1G2 SPE'] === 'd1spe2', 'H3) L\'outil se souvient de la classe de « MATHEMATIQUES - 1G2 SPE »', tout.correspondances)
ok(await p.isVisible('.edt-grille'), 'H4) Retour à la grille')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- I. Le lien synchronisé (relais simulé) ----------
// Aujourd'hui (mardi 10) : le cours de 12 h 05 de la 2nde 3 est annulé
const icsLien = ['BEGIN:VCALENDAR', 'VERSION:2.0', ...[0, 1, 2].flatMap(k => ev(d(k, 1, 12, 5), d(k, 1, 13, 0), 'MATHEMATIQUES - 2NDE3', 'A04', k === 0 ? ['STATUS:CANCELLED'] : [])), 'END:VCALENDAR'].join('\r\n')
let demandes = 0
await c.route(/script\.google\.com/, route => { demandes++; route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ics: icsLien }) }) })
await poserEDT({ ...tout, creneaux: SEMAINE, correspondances: { 'MATHEMATIQUES - 2NDE3': 'd2nde3' } })
await p.evaluate(() => window.__app.ui.boutonFichier.click()); await p.waitForTimeout(400)
await p.click('.menu-flottant:not([hidden]) [data-action="emploi-du-temps"]')
await p.waitForTimeout(400)
await p.click('.edt-pronote'); await p.waitForTimeout(200)
await p.fill('.edt-lien', 'https://0123456a.index-education.net/pronote/ical/mesinformations.ics?icalsecurise=ABC')
await p.click('.edt-lire'); await p.waitForTimeout(600)
lignes = await p.evaluate(() => [...document.querySelectorAll('.edt-table tbody tr')].map(tr => tr.cells[0].textContent))
ok(demandes >= 1 && lignes.length === 1 && lignes[0] === 'Mar 12 h 05 – 13 h 00 · A et B', 'I1) Le lien lu par le relais : le mardi 12 h 05 (le cours annulé ne compte pas)', { demandes, lignes })
await p.click('.edt-importer'); await p.waitForTimeout(400)
const garde = await p.evaluate(() => JSON.parse(localStorage.getItem('mem-teachingtool-pronote')))
ok(garde?.liens?.LFB?.includes('index-education.net') && garde.lus.LFB.cours.length >= 2, 'I2) Le lien et les cours des semaines qui viennent sont gardés dans ce navigateur (pas dans la bibliothèque)', garde && { liens: garde.liens })
const dansIndex = JSON.stringify(await p.evaluate(async () => window.__registre.reglage('emploi-du-temps')))
ok(!dansIndex.includes('index-education'), 'I3) La bibliothèque ne garde pas le lien')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.clock.setSystemTime(new Date(2026, 10, 10, 12, 3).getTime() + 90 * 60_000)
await p.clock.setSystemTime(new Date(2026, 10, 10, 12, 3).getTime())
await allerA(ids.probas)
v = await vueAccueil()
ok(v.dlg && !v.creneau, 'I4) Mardi 12 h 03, le cours annulé dans Pronote : « Bonjour ! » ne propose pas la 2nde 3', v)
await p.keyboard.press('Escape')
// Le témoin : sans le lien, la semaine type propose bien la 2nde 3
await c.unroute(/script\.google\.com/)
await p.evaluate(() => localStorage.removeItem('mem-teachingtool-pronote'))
await allerA(ids.probas)
v = await vueAccueil()
ok(v.dlg && /2nde 3/.test(v.creneau ?? ''), 'I5) Le témoin : sans le lien, la semaine type propose la 2nde 3 à cette heure', v)
await p.keyboard.press('Escape')

// ---------- K. Un établissement qui n'est pas un dossier du haut : « Autre… » ----------
// Comme chez le professeur : les niveaux de LFB (« 3 ») sont en haut de la
// bibliothèque, sans dossier « LFB » ; on tape son nom.
await p.evaluate(async () => {
  const r = window.__registre, t = Date.now()
  await r.ajouterDossier({ id: 'n3', nom: '3', parent: null, couleur: '#3b6fb6', cree: t })
  await r.ajouterDossier({ id: 'd3c', nom: '3C', parent: 'n3', couleur: '#3b6fb6', cree: t })
  localStorage.removeItem('mem-teachingtool-pronote')
})
await poserEDT(EDT([]))
const ouvrirImport = async () => {
  await p.evaluate(() => window.__app.ui.boutonFichier.click()); await p.waitForTimeout(400)
  await p.click('.menu-flottant:not([hidden]) [data-action="emploi-du-temps"]'); await p.waitForTimeout(400)
  await p.click('.edt-pronote'); await p.waitForTimeout(200)
}
const puces = () => p.evaluate(() => [...document.querySelectorAll('.edt-etab-choix')].map(b => ({ nom: b.dataset.nom ?? b.textContent, couleur: b.querySelector('i')?.style.background ?? null })))
await ouvrirImport()
let etabs = await puces()
ok(JSON.stringify(etabs.map(x => x.nom)) === '["3","LFB","LyFEL","Autre…"]' && new Set(etabs.filter(x => x.couleur).map(x => x.couleur)).size === 3 && await p.isHidden('.edt-etab-autre'),
  'K1) « Ces cours sont à : » les dossiers du haut, chacun sa couleur, puis « Autre… » (le champ caché)', etabs)
await p.click('.edt-etab-plus'); await p.waitForTimeout(100)
await p.fill('.edt-etab-autre', 'Lycée F')
ok(await p.isVisible('.edt-etab-autre') && await p.getAttribute('.edt-etab-plus', 'aria-pressed') === 'true', 'K2) « Autre… » montre le champ du nom')
await p.check('.edt-mode-fichier')
const ics3 = ['BEGIN:VCALENDAR', 'VERSION:2.0', ...[0, 1, 2].flatMap(k => ev(d(k, 0, 15, 5), d(k, 0, 16, 0), 'MATHEMATIQUES - 3C', 'C2')), 'END:VCALENDAR'].join('\r\n')
await p.setInputFiles('.edt-fichier', { name: 'Edt.ics', mimeType: 'text/calendar', buffer: Buffer.from(ics3) })
await p.click('.edt-lire'); await p.waitForTimeout(400)
lignes = await p.evaluate(() => [...document.querySelectorAll('.edt-table tbody tr')].map(tr => tr.querySelector('select').selectedOptions[0].textContent))
ok(lignes.length === 1 && lignes[0] === '3 › 3C', 'K3) Aucun dossier à ce nom : la classe 3C devinée parmi tous les dossiers', lignes)
await p.click('.edt-importer'); await p.waitForTimeout(400)
tout = await p.evaluate(async () => (await window.__registre.reglage('emploi-du-temps')))
ok(tout.creneaux.length === 1 && tout.creneaux[0].dossier === 'd3c' && tout.creneaux[0].etablissement === 'Lycée F', 'K4) Le créneau importé : la 3C, à « Lycée F »', tout.creneaux)
const legendeK = await p.evaluate(() => document.querySelector('.edt-legende')?.textContent)
ok(legendeK === 'Lycée F', 'K5) La légende de la semaine dit « Lycée F » (pas « 3 »)', legendeK)
await p.click('.edt-pronote'); await p.waitForTimeout(200)
etabs = await puces()
ok(etabs.some(x => x.nom === 'Lycée F'), 'K6) Ensuite « Lycée F » est proposé comme les autres', etabs)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- G6. Au menu ⋯ de la bibliothèque ----------
await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
await p.waitForFunction(() => window.__bibliotheque.ouvert, null, { timeout: 10000 })
await p.waitForTimeout(300)
await p.evaluate(() => { const b = [...document.querySelectorAll('.bibliotheque button')].find(x => x.getAttribute('aria-haspopup') === 'menu' && /Autres|⋯|Plus/.test(x.getAttribute('aria-label') || x.title || x.textContent)) || document.querySelector('.biblio-bandeau [aria-haspopup="menu"]'); b.click() })
await p.waitForTimeout(250)
await p.click('.menu-flottant:not([hidden]) [data-action="emploi-du-temps"]')
await p.waitForTimeout(400)
ok(await p.isVisible('dialog.dialogue-edt[open]'), 'G6) « Emploi du temps… » au menu ⋯ de la bibliothèque ouvre la fenêtre')

ok(!erreurs.length, 'Aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout est bon.')
process.exit(echecs ? 1 : 0)
