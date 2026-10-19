// ESSAI DU LOT 8 : les séances sous la carte d'un classeur, dans la
// bibliothèque. Le serveur de développement (:5173, window.__app) ; l'heure
// est celle de Playwright (clock). Un classeur de trois séances (lundi,
// mercredi, vendredi) :
// A. sa fiche garde la liste de ses séances ;
// B. la carte dit « 3 séances » ; un clic la déplie : la plus récente
//    d'abord, avec ses pages ;
// C. un clic sur une séance du classeur ouvert ferme la bibliothèque et va
//    à sa première page (en lecture : séance passée) ;
// D. le menu de la carte (« Voir les séances » / « Cacher les séances »),
//    pour le clavier ;
// E. arriver par l'adresse ?classeur=…&seance=… : sans la fenêtre d'accueil,
//    sur la première page de la séance, et l'adresse l'oublie ;
// F. une séance qui n'existe plus : on arrive comme d'habitude.
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

// ---------- A. La fiche garde la liste ----------
let fiche = await p.evaluate(async () => { const l = await window.__registre.classeurs(); const f = l[0]; return { id: f.id, liste: f.listeSeances ?? null, seances: f.seances ?? null } })
ok(fiche.liste?.length === 3 && fiche.seances === 3 && fiche.liste.every(s => s.pages >= 1 && s.debut > 0), 'A) La fiche garde ses trois séances (date, pages)', fiche)
const idClasseur = fiche.id

// ---------- B. La carte, dépliée ----------
await voirBibliotheque()
const b = await p.evaluate(sel => {
  const x = document.querySelector(sel + ' .carte-seances-bascule')
  return x ? { texte: x.textContent.replace(/[  ]/g, ' '), ouvert: x.getAttribute('aria-expanded'), vu: !x.hidden && x.offsetHeight > 0, liste: !document.querySelector(sel + ' .carte-seances-liste').hidden } : null
}, carte)
ok(b && /^3 séances/.test(b.texte) && b.vu && b.ouvert === 'false' && !b.liste, 'B1) La carte dit « 3 séances », repliée', b)
await p.click(carte + ' .carte-seances-bascule'); await p.clock.runFor(200)
const l = await p.evaluate(sel => [...document.querySelectorAll(sel + ' .carte-seance')].map(x => x.textContent.replace(/\s/g, ' ')), carte)
ok(l.length === 3 && /^Ven 16 oct/.test(l[0]) && /^Mer 14 oct/.test(l[1]) && /^Lun 12 oct/.test(l[2]) && l.every(t => /1\spage/.test(t)), 'B2) Dépliée : la plus récente d\'abord, avec ses pages', l)
const ariaOuvert = await p.getAttribute(carte + ' .carte-seances-bascule', 'aria-expanded')
ok(ariaOuvert === 'true', 'B3) aria-expanded dit « dépliée »', ariaOuvert)
const dansLaGrille = await p.evaluate(sel => document.querySelectorAll(sel).length, '.grille-classeurs:not(.recents) .case-classeur')
ok(dansLaGrille >= 1, 'B4) La carte est toujours dans la grille', dansLaGrille)

// ---------- C. Un clic sur une séance du classeur ouvert ----------
e = await etat()
const lundi = e.seances[0]
await p.click(carte + ' .carte-seance >> nth=2')   // « Lun 12 oct »
await p.clock.runFor(500)
const apres = await etat()
const ferme = await p.evaluate(() => !window.__bibliotheque.ouvert)
ok(ferme && apres.page === lundi.pages[0] && apres.passee === true, 'C) La bibliothèque se ferme, on est sur la première page de la séance de lundi (en lecture)', { ferme, apres, lundi })

// ---------- D. Le menu de la carte ----------
await voirBibliotheque()
await p.click(carte + ' .options-classeur'); await p.clock.runFor(200)
let menu = await p.evaluate(() => [...document.querySelectorAll('.menu-item[data-action="voir-seances"]')].map(x => x.textContent.replace(/[  ]/g, ' ')))
ok(menu.length === 1 && /^Cacher les séances/.test(menu[0]), 'D1) Le menu : « Cacher les séances » (elles sont dépliées)', menu)
await p.click('.menu-item[data-action="voir-seances"]'); await p.clock.runFor(200)
const replie = await p.evaluate(sel => document.querySelector(sel + ' .carte-seances-liste').hidden, carte)
ok(replie, 'D2) Elles se replient')
await p.click(carte + ' .options-classeur'); await p.clock.runFor(200)
menu = await p.evaluate(() => [...document.querySelectorAll('.menu-item[data-action="voir-seances"]')].map(x => x.textContent.replace(/[  ]/g, ' ')))
ok(menu.length === 1 && /^Voir les séances \(3 séances\)/.test(menu[0]), 'D3) Le menu : « Voir les séances (3 séances) »', menu)
await p.keyboard.press('Escape'); await p.clock.runFor(200)

// ---------- E. Arriver sur une séance par l'adresse ----------
const mercredi = e.seances[1]
await p.goto(`${DEV}?classeur=${idClasseur}&seance=${mercredi.id}`); await pret()
const arrive = await etat()
ok(!arrive.dlg && arrive.page === mercredi.pages[0] && arrive.passee === true && !/seance=/.test(arrive.recherche) && /classeur=/.test(arrive.recherche),
  'E) On arrive sur la séance de mercredi, sans fenêtre d\'accueil, et l\'adresse oublie la séance', arrive)

// ---------- F. Une séance qui n'existe plus ----------
await p.goto(`${DEV}?classeur=${idClasseur}&seance=0000000000000000`); await pret()
const f = await etat()
ok(f.dlg === null || /accueil/.test(f.dlg), 'F) Une séance inconnue : on arrive comme d\'habitude', f)

ok(!erreurs.length, 'Aucune erreur dans la page', erreurs)
await nav.close()
console.log(echecs ? `\n✗ ${echecs} échec(s)` : '\n✓ Tout est passé')
process.exit(echecs ? 1 : 0)
