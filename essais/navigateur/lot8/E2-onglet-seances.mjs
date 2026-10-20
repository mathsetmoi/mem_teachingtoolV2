// ESSAI DU LOT 8 (suite) : le bouton « Séances » de la bibliothèque. Un
// classeur de trois séances (lundi, mercredi, vendredi) :
// G1. le bouton montre toutes les séances, la plus récente d'abord, rangées
//     par mois, avec le choix « Chapitre en cours » au départ ;
// G2. « Tous les chapitres » montre aussi celles d'un second classeur ;
// G3. un clic sur une séance ferme la bibliothèque et va à sa première page ;
// G4. Échap ramène aux cartes.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const JOUR = 24 * 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()   // un lundi

const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: T0 })
const pret = async () => { await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(800) }
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
const etat = () => p.evaluate(() => {
  const a = window.__app, t = a.tableau
  return {
    seances: t.seancesDuClasseur().map(s => ({ id: s.id, pages: s.pages })), page: a.page, passee: a.enSeancePassee,
    dlg: document.querySelector('dialog[open]')?.className ?? null, recherche: location.search,
  }
})
const voirBibliotheque = async () => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.clock.runFor(300)
}
const carte = '.grille-classeurs:not(.recents) .case-classeur.ouvert-ici'

// ---------- Un classeur de trois séances ----------
await p.goto(DEV); await pret()
await trait(500, 300)
for (let k = 0; k < 2; k++) {
  await p.clock.setSystemTime(T0 + (k + 1) * 2 * JOUR)
  await p.evaluate(() => window.__app.nouvelleSeance())
  await p.clock.runFor(300)
  await trait(500, 300 + 40 * (k + 1))
}
await p.clock.runFor(40_000)   // la fiche s'écrit au plus toutes les 30 s
let e = await etat()
ok(e.seances.length === 3 && e.seances.every(s => s.pages.length >= 1), 'trois séances dans le classeur', e.seances)

await voirBibliotheque()
await p.click('[data-action="seances"]'); await p.clock.runFor(300)
const v = await p.evaluate(() => {
  const el = document.querySelector('.biblio-vue-seances')
  return {
    vue: !!el && !el.hidden, cartes: getComputedStyle(document.querySelector('.biblio-corps')).display,
    lignes: [...document.querySelectorAll('.seance-ligne .seance-date')].map(x => x.textContent.replace(/\s/g, ' ')),
    mois: [...document.querySelectorAll('.seances-mois h4')].map(x => x.textContent),
    chapitre: document.querySelector('[data-action="seances-chapitre"]')?.getAttribute('aria-pressed'),
  }
})
ok(v.vue && v.cartes === 'none' && v.lignes.length === 3 && /^Ven 16 oct/.test(v.lignes[0]) && /^Lun 12 oct/.test(v.lignes[2]) && v.mois.length === 1 && v.mois[0] === 'Octobre 2026' && v.chapitre === 'true',
  'G1) Les trois séances, la plus récente d\'abord, par mois, « Chapitre en cours » choisi', v)

// G2. Un second classeur, vu avec « Tous les chapitres »
await p.evaluate(async () => {
  const f = (await window.__registre.classeurs())[0]
  await window.__registre.ajouterClasseur({ ...f, id: 'autre0123456789a', base: 'mem-teachingtool-classeur-autre0123456789a', nom: 'Autre chapitre', listeSeances: [{ id: 'zz', debut: Date.now() - 86400_000, pages: 2 }], seances: 1 })
})
await p.evaluate(() => window.__bibliotheque.charger()); await p.clock.runFor(300)
await p.click('[data-action="seances-tous"]'); await p.clock.runFor(200)
const n = await p.evaluate(() => document.querySelectorAll('.seance-ligne').length)
ok(n === 4, 'G2) « Tous les chapitres » montre aussi les séances de l\'autre classeur', n)
await p.click('[data-action="seances-chapitre"]'); await p.clock.runFor(200)

// G3. Un clic ouvre la séance
e = await etat()
const lundi = e.seances[0]
await p.click('.seance-ligne >> nth=2'); await p.clock.runFor(500)
const apres = await etat()
const ferme = await p.evaluate(() => !window.__bibliotheque.ouvert)
ok(ferme && apres.page === lundi.pages[0] && apres.passee === true, 'G3) Un clic : la bibliothèque se ferme, première page de la séance de lundi', { ferme, apres, lundi })

// G4. Échap ramène aux cartes
await voirBibliotheque()
await p.click('[data-action="seances"]'); await p.clock.runFor(200)
await p.keyboard.press('Escape'); await p.clock.runFor(200)
const g4 = await p.evaluate(() => ({ vue: !document.querySelector('.biblio-vue-seances').hidden, ouverte: window.__bibliotheque.ouvert, cartes: getComputedStyle(document.querySelector('.biblio-corps')).display }))
ok(!g4.vue && g4.ouverte && g4.cartes !== 'none', 'G4) Échap ramène aux cartes', g4)

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `\n✗ ${echecs} échec(s)` : '\n✓ Tout est passé')
process.exit(echecs ? 1 : 0)
