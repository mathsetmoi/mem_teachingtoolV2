// ESSAI DE LA SÉANCE PRÉPARÉE À L'AVANCE (lot 25). Le serveur de
// développement (:5173, window.__app) ; l'heure est celle de Playwright
// (clock). Vendredi 13 novembre 2026, 10 h : une séance écrite ; puis :
// A. le menu du classeur propose « Préparer une séance… » ; la fenêtre (sans
//    emploi du temps : « Une autre date… ») crée la séance de lundi 8 h 05 ;
// B. le tableau la prépare : le compteur et l'étiquette en violet, « À
//    venir », le bandeau ; on y écrit (le décor) ;
// C. le menu ⋯ : « Commencer la séance maintenant », « Changer la date… »,
//    « Retour à aujourd'hui », qui revient à vendredi ;
// D. le menu du classeur la montre « à venir » et y ramène, modifiable ;
// E. lundi 8 h, au lancement : « Bonjour ! » propose « Commencer la séance
//    préparée » ; un clic : elle devient la séance du jour ;
// F. on écrit en classe ; le film élève part avec le décor déjà là, et ne
//    rejoue que le geste du cours.
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot25).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot25/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const VENDREDI = new Date('2026-11-13T10:00:00').getTime()
const LUNDI = new Date('2026-11-16T08:00:00').getTime()
const MENU = 'button.points'

const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: VENDREDI })
await p.goto(DEV)
await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(800)
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
await trait(500, 300)
const vendredi = await p.evaluate(() => window.__app.tableau.derniereSeance().id)

// A
await p.click('.bouton-classeur'); await p.clock.runFor(100)
const actions = await p.evaluate(() => [...document.querySelectorAll('.menu-seances .menu-item')].map(b => b.dataset.action))
ok(actions.includes('preparer-seance') && actions.indexOf('preparer-seance') === actions.indexOf('nouvelle-seance') + 1, 'A1) « Préparer une séance… » sous « Nouvelle séance »', actions)
await p.click('.menu-seances [data-action="preparer-seance"]'); await p.clock.runFor(200)
await p.waitForSelector('dialog.dialogue-preparer[open]')
const f = await p.evaluate(() => {
  const d = document.querySelector('dialog.dialogue-preparer')
  return { titre: d.querySelector('h2').textContent, lignes: [...d.querySelectorAll('.preparer-un-cours')].map(l => l.textContent), date: !d.querySelector('.preparer-date').hidden }
})
ok(/^Préparer une séance · /.test(f.titre) && f.lignes.length === 1 && /Une autre date/.test(f.lignes[0]) && f.date, 'A2) Sans emploi du temps : une date à choisir', f)
await p.fill('.preparer-date', '2026-11-16T08:05')
await p.fill('.dialogue-preparer .saisie-nom-seance', 'Fractions : additionner')
await p.screenshot({ path: SORTIE + '1-fenetre.png' })
await p.click('.dialogue-preparer button[type="submit"]')
// La fenêtre se ferme par un événement du navigateur (pas une minuterie) : on l'attend
await p.waitForFunction(() => !!window.__app.seancePreparee(), null, { timeout: 5000 }).catch(() => {})
await p.clock.runFor(300)

// B
let e = await p.evaluate(() => {
  const a = window.__app, s = a.seancePreparee()
  return { prep: s && { debut: s.debut, nom: s.nom, aVenir: s.aVenir }, jour: a.tableau.seanceDuJour()?.id, venir: document.querySelector('.rang')?.classList.contains('a-venir'),
    etiquette: document.querySelector('.rang-seance .texte')?.textContent, bandeau: !document.querySelector('.bandeau-preparation').hidden, page: a.pages.indexOf(a.page) + 1, n: a.pages.length }
})
ok(e.prep?.aVenir && e.prep.debut === new Date('2026-11-16T08:05:00').getTime() && e.prep.nom === 'Fractions : additionner', 'B1) La séance à venir, à la date du cours, avec son nom', e)
ok(e.jour === vendredi && e.venir && /^À venir · Fractions/.test(e.etiquette) && e.bandeau && e.page === 1 && e.n === 1, 'B2) On la prépare : compteur violet, « À venir », le bandeau, sa page 1', e)
await trait(400, 250); await trait(400, 350)
const l1 = await p.evaluate(() => window.__app.page)
const decor = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).keys()])
ok(decor.length === 2, 'B3) On y écrit : le décor', decor)
await p.screenshot({ path: SORTIE + '2-preparation.png' })

// C
await p.click(MENU); await p.clock.runFor(150)
const menu = await p.evaluate(() => [...document.querySelectorAll('.menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action))
ok(['commencer-seance', 'changer-date-seance', 'retour-aujourdhui'].every(x => menu.includes(x)), 'C1) Le menu ⋯ : commencer, changer la date, retour à aujourd\'hui', menu)
await p.click('.menu-item[data-action="retour-aujourdhui"]'); await p.clock.runFor(300)
e = await p.evaluate(() => ({ s: window.__app.seanceVue?.id, prep: !!window.__app.seancePreparee(), lecture: window.__app.enSeancePassee, bandeau: !document.querySelector('.bandeau-preparation').hidden }))
ok(e.s === vendredi && !e.prep && !e.lecture && !e.bandeau, 'C2) Retour à aujourd\'hui : vendredi, écrivable', e)

// D
await p.click('.bouton-classeur'); await p.clock.runFor(100)
const lignes = await p.evaluate(() => [...document.querySelectorAll('.menu-seances .menu-item[data-action="voir-seance"]')].map(b => ({ s: b.dataset.seance, aide: b.querySelector('small')?.textContent })))
const venir = lignes.find(x => x.s !== vendredi)
ok(lignes.length === 2 && /^à venir/.test(venir?.aide ?? ''), 'D1) Le menu du classeur la montre « à venir »', lignes)
await p.click(`.menu-seances [data-seance="${venir.s}"]`); await p.clock.runFor(300)
e = await p.evaluate(() => ({ prep: window.__app.seancePreparee()?.id, lecture: window.__app.enSeancePassee }))
ok(e.prep === venir.s && !e.lecture, 'D2) Un clic y ramène, modifiable', e)
await p.click('.bandeau-preparation .retour-aujourdhui'); await p.clock.runFor(1500)

// E
await p.clock.setSystemTime(LUNDI)
await p.reload()
await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(1500)
await p.waitForSelector('dialog.dialogue-accueil[open]', { timeout: 5000 }).catch(() => {})
const bonjour = await p.evaluate(() => {
  const d = document.querySelector('dialog.dialogue-accueil[open]')
  return d && { gros: d.querySelector('.accueil-nouvelle')?.textContent, preparee: !!d.querySelector('.accueil-preparee'), vide: d.querySelector('.accueil-nouvelle-vide')?.textContent, focus: document.activeElement?.classList.contains('accueil-preparee') }
})
ok(bonjour?.preparee && /Commencer la séance préparée/.test(bonjour.gros) && /Fractions : additionner · 1\spage/.test(bonjour.gros) && /^Nouvelle séance vide/.test(bonjour.vide ?? '') && bonjour.focus,
  'E1) « Bonjour ! » : « Commencer la séance préparée », choisi d\'office ; la séance vide en lien', bonjour)
await p.screenshot({ path: SORTIE + '3-bonjour.png' })
await p.click('.accueil-preparee'); await p.clock.runFor(400)
e = await p.evaluate(() => {
  const a = window.__app, s = a.tableau.derniereSeance()
  return { id: s.id, aVenir: s.aVenir, debut: s.debut, page: a.page, venir: document.querySelector('.rang')?.classList.contains('a-venir'), jour: a.tableau.seanceDuJour()?.id }
})
ok(e.id === venir.s && !e.aVenir && Math.abs(e.debut - LUNDI) < 10_000 && e.jour === venir.s, 'E2) Elle devient la séance du jour, qui commence maintenant', e)
ok(e.page === l1 && !e.venir, 'E3) Sur sa page 1, le violet parti', e)

// F
await p.clock.runFor(60_000)
await trait(600, 450)
await p.clock.runFor(1500)
const film = await p.evaluate(async id => {
  const x = await import('/src/revoir/exporter.ts')
  const t = window.__app.tableau
  const s = x.seancesDuTableau(t).find(z => z.id === id)
  const f = x.exporter(t, { de: s.de, a: s.a, pages: x.pagesAPublier(t, s), titre: '' }, { instruments: false })
  return { depart: f.pages.map(q => q.formes.length), etapes: f.etapes.length, publier: x.seancesAPublier(t).map(z => z.id) }
}, venir.s)
ok(film.depart.length === 1 && film.depart[0] === 2 && film.etapes === 1, 'F1) Le film élève : le décor au départ, seul le geste du cours se rejoue', film)
ok(film.publier[0] === venir.s && film.publier.includes(vendredi), 'F2) Publier propose la séance de lundi, puis vendredi', film)

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
