// ESSAI DE « COMPLÉTER LA SÉANCE » ET « ENVOYER LA PAGE VERS… » (lot 28).
// Le serveur de développement (:5173, window.__app) ; l'heure est celle de
// Playwright (clock). Lundi 9 novembre 2026, 8 h 05 : une séance écrite ;
// vendredi 13, 10 h : une autre séance, écrite. Puis :
// A. on regarde lundi : le bandeau de lecture a « Compléter la séance »,
//    le menu ⋯ aussi ;
// B. un trait sur la page de lundi : la question a trois boutons ;
//    « Compléter la séance » : le trait est sur la page de lundi elle-même,
//    le compteur et le bandeau sont verts ;
// C. une nouvelle page, pendant le complément, est à lundi ;
// D. « Terminer » : retour à vendredi, le message « complétée » propose de
//    publier ; lundi est de nouveau en lecture, vendredi n'a pas bougé ;
// E. « Envoyer la page vers… » (le menu de la page) : la fenêtre, vers
//    lundi, Copier : lundi a une page de plus, vendredi garde la sienne ;
// F. Déplacer vers lundi : la page quitte vendredi, « Annuler » la remet.
// Les captures vont dans SORTIE (par défaut essais/navigateur/sorties/lot28).
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const SORTIE = process.env.SORTIE ?? new URL('../sorties/lot28/', import.meta.url).pathname
mkdirSync(SORTIE, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const LUNDI = new Date('2026-11-09T08:05:00').getTime()
const VENDREDI = new Date('2026-11-13T10:00:00').getTime()
const MENU = 'button.points'

const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: LUNDI })
await p.goto(DEV)
await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(800)
// Une fenêtre se ferme par un événement du navigateur (pas une minuterie) : on l'attend
const fermee = async (sel) => { await p.waitForFunction(s => !document.querySelector(s), sel, { timeout: 5000 }).catch(() => {}); await p.waitForTimeout(80); await p.clock.runFor(300) }
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
await trait(500, 300)
const lundi = await p.evaluate(() => ({ id: window.__app.tableau.derniereSeance().id, page: window.__app.page }))

// Vendredi : une nouvelle séance, écrite
await p.clock.setSystemTime(VENDREDI)
await p.evaluate(() => window.__app.nouvelleSeance()); await p.clock.runFor(800)
// Le bandeau « Reprendre » de la séance qui commence : on le ferme
await p.evaluate(() => document.querySelector('.bandeau-reprise .fermer-seance')?.click())
await trait(500, 300)
const vendredi = await p.evaluate(() => ({ id: window.__app.tableau.derniereSeance().id, page: window.__app.page }))
ok(vendredi.id !== lundi.id, '0) Deux séances, lundi et vendredi', { lundi, vendredi })

// A
await p.evaluate(id => window.__app.voirPage(id), lundi.page); await p.clock.runFor(300)
let e = await p.evaluate(() => ({ lecture: window.__app.enSeancePassee, bouton: !!document.querySelector('.bandeau-lecture:not([hidden]) .completer-seance') }))
ok(e.lecture && e.bouton, 'A1) Lundi en lecture : le bandeau propose « Compléter la séance »', e)
await p.click(MENU); await p.clock.runFor(150)
const menu = await p.evaluate(() => [...document.querySelectorAll('.menu-item')].filter(b => b.offsetParent).map(b => b.dataset.action))
ok(menu.includes('completer-seance') && menu.includes('retour-aujourdhui'), 'A2) Le menu ⋯ : « Compléter la séance »', menu)
await p.keyboard.press('Escape'); await p.clock.runFor(150)

// B
await trait(450, 420)
await p.waitForSelector('dialog.dialogue-reprise[open]', { timeout: 3000 }).catch(() => {})
const boutons = await p.evaluate(() => [...document.querySelectorAll('dialog.dialogue-reprise[open] .actions button')].map(b => b.textContent))
ok(boutons.join('|') === 'Juste regarder|Compléter la séance|Reprendre et écrire', 'B1) La question a trois boutons', boutons)
await p.screenshot({ path: SORTIE + '1-question.png' })
await p.click('dialog.dialogue-reprise .completer-seance'); await fermee('dialog.dialogue-reprise')
e = await p.evaluate(id => {
  const a = window.__app
  return { page: a.page, formes: a.tableau.formesDe(id).size, comp: a.seanceCompletee()?.id, lecture: a.enSeancePassee,
    vert: document.querySelector('.rang')?.classList.contains('en-complement'), etiquette: document.querySelector('.rang-seance .texte')?.textContent,
    bandeau: !document.querySelector('.bandeau-complement').hidden, lectureBandeau: !document.querySelector('.bandeau-lecture').hidden }
}, lundi.page)
ok(e.page === lundi.page && e.formes === 2 && e.comp === lundi.id && !e.lecture, 'B2) « Compléter la séance » : le trait est sur la page de lundi', e)
ok(e.vert && /^Complément · /.test(e.etiquette) && e.bandeau && !e.lectureBandeau, 'B3) Le compteur, l\'étiquette et le bandeau en vert', e)
await p.screenshot({ path: SORTIE + '2-complement.png' })

// C
await p.evaluate(() => window.__app.nouvellePage()); await p.clock.runFor(300)
await trait(500, 300)
e = await p.evaluate(ids => {
  const t = window.__app.tableau
  return { lundi: t.pagesDeLaSeance(ids.l).length, vendredi: t.pagesDeLaSeance(ids.v).length, ici: t.seanceDe(window.__app.page)?.id, comp: window.__app.seanceCompletee()?.id }
}, { l: lundi.id, v: vendredi.id })
ok(e.lundi === 2 && e.vendredi === 1 && e.ici === lundi.id && e.comp === lundi.id, 'C1) La page ajoutée est à lundi', e)

// D
await p.click('.bandeau-complement .terminer-complement'); await p.clock.runFor(400)
e = await p.evaluate(() => ({ page: window.__app.page, comp: window.__app.tableau.seanceEnComplement, toast: document.querySelector('.toast')?.textContent ?? '' }))
ok(e.page === vendredi.page && e.comp === null, 'D1) Terminer : retour à vendredi', e)
ok(/complétée/.test(e.toast) && /Publier la séance/.test(e.toast), 'D2) Le message : séance complétée, Publier la séance', e.toast)
await p.evaluate(id => window.__app.voirPage(id), lundi.page); await p.clock.runFor(300)
e = await p.evaluate(() => ({ lecture: window.__app.enSeancePassee, vert: document.querySelector('.rang')?.classList.contains('en-complement') }))
ok(e.lecture && !e.vert, 'D3) Lundi est de nouveau en lecture', e)
await p.evaluate(() => window.__app.retourAujourdhui()); await p.clock.runFor(300)

// E
await p.evaluate(() => window.__app.ui.ouvrirEnvoiPage()); await p.clock.runFor(300)
await p.waitForSelector('dialog.dialogue-envoi-page[open]', { timeout: 3000 }).catch(() => {})
e = await p.evaluate(() => {
  const d = document.querySelector('dialog.dialogue-envoi-page')
  return d && { titre: d.querySelector('h2').textContent, seances: [...d.querySelectorAll('.envoi-colonne:nth-child(2) .envoi-choix')].map(b => ({ t: b.textContent, off: b.disabled, sel: b.getAttribute('aria-selected') })) }
})
ok(!!e && /^Envoyer la page 1/.test(e.titre) && e.seances.length === 2 && e.seances.some(s => s.off && /cette séance/.test(s.t)), 'E1) La fenêtre : vendredi grisée (cette séance), lundi à choisir', e)
await p.screenshot({ path: SORTIE + '3-envoyer.png' })
await p.click('dialog.dialogue-envoi-page .valider-envoi-page'); await fermee('dialog.dialogue-envoi-page')
e = await p.evaluate(ids => {
  const t = window.__app.tableau
  return { lundi: t.pagesDeLaSeance(ids.l).length, vendredi: t.pagesDeLaSeance(ids.v).length, page: window.__app.page, toast: document.querySelector('.toast')?.textContent ?? '',
    complements: t.seancesDuClasseur().find(s => s.id === ids.l).complements.length }
}, { l: lundi.id, v: vendredi.id })
ok(e.lundi === 3 && e.vendredi === 1 && e.page === vendredi.page && /copiée dans la séance/.test(e.toast) && e.complements === 2, 'E2) Copier vers lundi : lundi a une page de plus (un complément), on reste sur vendredi', e)

// F
await p.evaluate(() => window.__app.ui.ouvrirEnvoiPage()); await p.clock.runFor(300)
await p.waitForSelector('dialog.dialogue-envoi-page[open]', { timeout: 3000 }).catch(() => {})
await p.check('dialog.dialogue-envoi-page input[value="deplacer"]')
const libelle = await p.textContent('dialog.dialogue-envoi-page .valider-envoi-page')
await p.click('dialog.dialogue-envoi-page .valider-envoi-page'); await fermee('dialog.dialogue-envoi-page')
e = await p.evaluate(ids => {
  const t = window.__app.tableau
  return { lundi: t.pagesDeLaSeance(ids.l).length, vendredi: t.pagesDeLaSeance(ids.v).length, ici: t.seanceDe(window.__app.page)?.id, toast: document.querySelector('.toast')?.textContent ?? '' }
}, { l: lundi.id, v: vendredi.id })
ok(libelle === 'Déplacer la page' && e.lundi === 4 && e.vendredi === 0 && e.ici === lundi.id && /déplacée/.test(e.toast), 'F1) Déplacer vers lundi : la page quitte vendredi', { libelle, ...e })
await p.evaluate(() => [...document.querySelectorAll('.toast .ligne')].pop()?.querySelector('button:last-of-type')?.click()); await p.clock.runFor(400)
e = await p.evaluate(ids => {
  const t = window.__app.tableau
  return { lundi: t.pagesDeLaSeance(ids.l).length, vendredi: t.pagesDeLaSeance(ids.v).length, page: window.__app.page }
}, { l: lundi.id, v: vendredi.id })
ok(e.lundi === 3 && e.vendredi === 1 && e.page === vendredi.page, 'F2) « Annuler » : la page revient dans vendredi', e)

ok(!erreurs.length, 'Aucune erreur dans la console', erreurs)
await nav.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon')
process.exit(echecs ? 1 : 0)
