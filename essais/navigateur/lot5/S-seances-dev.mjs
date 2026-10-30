// ESSAI DES SÉANCES EXPLICITES (lot 6), sur le serveur de développement
// (:5173, window.__app) : la séance d'un classeur neuf, « Séance de … reprise »
// (moins d'une heure), la fenêtre d'accueil (plus d'une heure : Échap la
// ferme sans rien changer, Entrée commence une séance), la page 1 blanche à
// 100 %, le bandeau « Reprendre » (et son Annuler, et Ctrl+Z), les pages de
// la séance seules au feuilletage, « Séance précédente » et ses vignettes,
// la lecture d'une séance passée (rien ne s'y écrit ; « Juste regarder » ;
// « Reprendre et écrire » à la souris et à la plume de la tablette
// graphique), « Copier dans la séance d'aujourd'hui », la trieuse rangée
// par séance, Publier (les pages de la séance), le menu ⋯ (Nouvelle séance,
// Renommer la séance…), la migration d'un classeur d'avant le lot 6.
// L'heure est celle de Playwright (clock) : le temps passe sans attendre.
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync } from 'node:fs'

const S = `${RACINE_ESSAIS}`
const D = S + '/lot6/essai-dev'
mkdirSync(D, { recursive: true })
const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const H = 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()   // un lundi

const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: T0 })
const pret = async () => { await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(800) }
const ouvrir = async () => { await p.goto(DEV); await pret() }
const recharger = async () => { await p.reload(); await pret() }
// La fenêtre d'accueil s'ouvre à la fin du démarrage, quelques dizaines de
// millisecondes (en vrai temps) après la page : on l'attend quand on la
// veut (depuis le lot 18, le démarrage fait un peu plus avant elle)
const accueilOuvert = (q = p) => q.waitForSelector('dialog.dialogue-accueil[open]', { timeout: 5000 }).catch(() => {})
const lire = () => p.evaluate(() => {
  const a = window.__app, t = a.tableau
  return {
    rang: [document.querySelector('.rang-seance .texte')?.textContent, document.querySelector('.rang')?.textContent].filter(Boolean).join(' · '), dlg: document.querySelector('dialog[open]')?.className ?? null,
    toast: document.querySelector('.toast.visible')?.textContent ?? '', seances: t.seancesDuClasseur().map(s => s.pages.length),
    page: a.page, i: a.pages.indexOf(a.page), n: a.pages.length, passee: a.enSeancePassee, formes: t.formesDe(a.page)?.size ?? -1,
    z: a.cam.z, lecture: !document.querySelector('.bandeau-lecture')?.hidden, reprise: !document.querySelector('.bandeau-reprise')?.hidden,
    texteReprise: document.querySelector('.bandeau-reprise .texte')?.textContent ?? '',
  }
})
const trait = async (x, y, type = 'mouse') => {
  if (type === 'pen') {
    const cdp = await c.newCDPSession(p)
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, pointerType: 'pen', button: 'left', buttons: 1, clickCount: 1, force: 0.5 })
    for (let k = 1; k <= 6; k++) await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: x + k * 15, y: y + k * 6, pointerType: 'pen', button: 'left', buttons: 1, force: 0.5 })
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: x + 90, y: y + 36, pointerType: 'pen', button: 'left', buttons: 0, clickCount: 1 })
    await cdp.detach()
  } else {
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up()
  }
  await p.clock.runFor(700)
}

// ---------- A. Un classeur neuf : sa séance, sans question ----------
await ouvrir()
let e = await lire()
ok(!e.dlg && e.seances.length === 1 && /^Séance du lun 12 oct 8h · 1 \/ 1$/.test(e.rang), 'classeur neuf : une séance, le compteur la dit, pas de fenêtre', e)
await trait(500, 300)
await p.evaluate(() => window.__app.tableau.renommerPage(window.__app.page, 'Cours'))
await p.click('button.nouvelle-page'); await p.clock.runFor(300)
await trait(500, 340)
await p.evaluate(() => window.__app.tableau.renommerPage(window.__app.page, 'Exercice 3'))
const lundi = await p.evaluate(() => ({ pages: window.__app.pages, p2: window.__app.page, formes: [...window.__app.tableau.formesDe(window.__app.page).keys()] }))

// ---------- B. Moins d'une heure : on reste, un message le dit ----------
await p.clock.runFor(40 * 60_000)
await recharger()
e = await lire()
ok(!e.dlg && e.page === lundi.p2 && /Séance de 8 h reprise/.test(e.toast), '« Séance de 8 h reprise » sans fenêtre, sur la même page', e)

// ---------- C. Plus d'une heure : la fenêtre d'accueil ; Échap ----------
await p.clock.setSystemTime(T0 + 30 * H)                     // mardi 14 h
await recharger()
await accueilOuvert()
e = await lire()
const accueil = await p.evaluate(() => ({ titre: document.querySelector('.dialogue-accueil h2')?.textContent, gros: document.querySelector('.accueil-nouvelle')?.textContent, focus: document.activeElement?.className, continuer: document.querySelector('.accueil-continuer')?.textContent }))
ok(e.dlg?.includes('dialogue-accueil') && accueil.titre === 'Bonjour !' && /Nouvelle séance/.test(accueil.gros) && /accueil-nouvelle/.test(accueil.focus) && /Continuer la séance de lundi 8 h/.test(accueil.continuer ?? ''),
  'plus d\'une heure : « Bonjour ! », le gros bouton choisi d\'office, « Continuer la séance de lundi 8 h »', { e, accueil })
ok(e.page === lundi.p2, 'la dernière page reste derrière la fenêtre', e)
await p.keyboard.press('Escape'); await p.clock.runFor(200)
e = await lire()
ok(!e.dlg && e.seances.length === 1 && e.page === lundi.p2 && e.formes === 1, 'Échap : la fenêtre se ferme, rien ne change', e)

// ---------- D. Entrée : une nouvelle séance, page 1 blanche à 100 % ----------
await recharger()
await accueilOuvert()
await p.evaluate(() => window.__app.cam.z = 1.7)
await p.keyboard.press('Enter'); await p.clock.runFor(300)
e = await lire()
ok(!e.dlg && JSON.stringify(e.seances) === '[2,1]' && e.i === 0 && e.n === 1 && e.formes === 0 && e.z === 1 && /^Séance du mar 13 oct 14h · 1 \/ 1$/.test(e.rang), 'Entrée : nouvelle séance, page 1 blanche à 100 %, compteur « Séance du mar 13 oct 14h · 1 / 1 »', e)
ok(e.reprise && /^Lundi 8 h s'est arrêté page 2 · « Exercice 3 »\.$/.test(e.texteReprise), 'le bandeau « Lundi 8 h s\'est arrêté page 2 · « Exercice 3 ». »', e)
const page1 = e.page

// ---------- E. Reprendre la page (et Annuler, et Ctrl+Z) ----------
await p.click('.bandeau-reprise .principal'); await p.clock.runFor(300)
e = await lire()
let q = e.page
const copie = await p.evaluate(q => { const t = window.__app.tableau; return { nom: t.nomDe(q), herite: t.herite(q), formes: [...t.formesDe(q).keys()] } }, q)
ok(JSON.stringify(e.seances) === '[2,1]' && e.i === 0 && q !== page1 && copie.nom === 'Exercice 3' && copie.herite === lundi.p2 && JSON.stringify(copie.formes) === JSON.stringify(lundi.formes) && !e.reprise,
  'Reprendre : la copie remplace la page 1 vide, même nom, même contenu, hérite le passé', { e, copie })
ok(/Page reprise de lundi/.test(e.toast) && /Annuler/.test(e.toast), 'message « Page reprise de lundi · Annuler »', e.toast)
await p.click('.toast button.action'); await p.clock.runFor(300)
e = await lire()
ok(e.page === page1 && JSON.stringify(e.seances) === '[2,1]' && e.formes === 0, 'Annuler : la page 1 blanche revient', e)
await p.evaluate(() => window.__app.reprendrePage(window.__app.tableau.seancesDuClasseur()[0].pages[1])); await p.clock.runFor(300)
q = (await lire()).page
await p.keyboard.press('Control+z'); await p.clock.runFor(300)
e = await lire()
ok(e.page === page1 && e.formes === 0 && JSON.stringify(e.seances) === '[2,1]', 'Ctrl+Z sur la page reprise toute neuve : la page 1 blanche revient', e)

// ---------- F. On ne feuillette que la séance du jour ----------
await trait(400, 300)
await p.click('button.nouvelle-page'); await p.clock.runFor(300)
await trait(420, 320)
e = await lire()
ok(e.i === 1 && e.n === 2 && /· 2 \/ 2$/.test(e.rang), 'mardi : 2 / 2', e)
await p.keyboard.press('PageUp'); await p.keyboard.press('PageUp'); await p.clock.runFor(200)
e = await lire()
ok(e.i === 0 && !e.passee, 'Page↑ s\'arrête à la page 1 de la séance du jour', e)

// ---------- G. Séance précédente, Voir la page, la lecture ----------
await p.click('button.seance-precedente'); await p.clock.runFor(300)
const tiroir = await p.evaluate(() => ({ titre: document.querySelector('.tiroir-seance h3')?.textContent, n: document.querySelectorAll('.tiroir-vignette').length, choisie: document.querySelector('.tiroir-vignette[aria-selected="true"]')?.dataset.page }))
ok(/^Séance du lun 12 oct 8h · 2 pages$/.test(tiroir.titre) && tiroir.n === 2 && tiroir.choisie === lundi.p2, '« Séance précédente » : ses deux vignettes, la dernière écrite choisie', tiroir)
await p.click('.tiroir-actions .secondaire'); await p.clock.runFor(300)
e = await lire()
ok(e.passee && e.page === lundi.p2 && e.lecture && /^Lun 12 oct 8h · en lecture · page 2/.test(e.rang), 'Voir la page : en lecture, « Lun 12 oct 8h · en lecture » sur « page 2 », le bandeau le dit', e)
const avantLecture = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].map(f => JSON.stringify(f)).sort().join())
await trait(600, 450)
e = await lire()
ok(e.dlg?.includes('dialogue-reprise') && /Cette page est dans la séance de lundi/.test(await p.textContent('dialog[open]')), 'un trait sur lundi : « Cette page est dans la séance de lundi »', e)
await p.click('dialog[open] .secondaire'); await p.waitForTimeout(150); await p.clock.runFor(200)
const apres1 = await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].map(f => JSON.stringify(f)).sort().join())
e = await lire()
ok(!e.dlg && apres1 === avantLecture && e.passee, '« Juste regarder » : la page de lundi n\'a pas changé', e)
await p.keyboard.press('Delete'); await p.keyboard.press('Control+z'); await p.clock.runFor(300)
ok((await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).values()].map(f => JSON.stringify(f)).sort().join())) === avantLecture, 'Ctrl+Z en lecture ne change rien', null)
// À la plume de la tablette graphique (sans écran), « Reprendre et écrire »
await trait(600, 470, 'pen')
e = await lire()
ok(!!e.dlg?.includes('dialogue-reprise'), 'à la plume : la même question', e)
await p.click('dialog[open] .principal'); await p.waitForTimeout(150); await p.clock.runFor(300)
e = await lire()
const ecrit = await p.evaluate(p2 => ({ lundi: [...window.__app.tableau.formesDe(p2).values()].map(f => JSON.stringify(f)).sort().join(), ici: window.__app.tableau.formesDe(window.__app.page).size, herite: window.__app.tableau.herite(window.__app.page) }), lundi.p2)
ok(!e.passee && e.formes === 2 && ecrit.ici === 2 && ecrit.herite === lundi.p2 && ecrit.lundi === avantLecture && JSON.stringify(e.seances) === '[2,3]' && e.i === 1,
  '« Reprendre et écrire » : le trait part sur la copie, dans la séance du jour, après la page où l\'on était ; lundi ne change pas', { e, ecrit })

// ---------- H. Copier dans la séance d'aujourd'hui ----------
await p.evaluate(() => window.__app.voirPage(window.__app.tableau.seancesDuClasseur()[0].pages[0])); await p.clock.runFor(200)
const jourAvant = await p.evaluate(() => window.__app.tableau.seancesDuClasseur()[1].pages.map(x => window.__app.tableau.formesDe(x).size))
await p.evaluate(() => { const a = window.__app; a.choisirOutil('selection'); a.toutSelectionner() }); await p.clock.runFor(100)
const source = await p.evaluate(() => [...window.__app.selection].map(id => { const f = window.__app.tableau.formesDe(window.__app.page).get(id); return [f.x, f.y] }))
await p.evaluate(() => window.__app.copierVersAujourdhui()); await p.clock.runFor(300)
e = await lire()
const colles = await p.evaluate(() => [...window.__app.selection].map(id => { const f = window.__app.tableau.formesDe(window.__app.page).get(id); return [f.x, f.y] }))
ok(!e.passee && JSON.stringify(colles) === JSON.stringify(source) && /Copié dans la page 2/.test(e.toast), 'Copier dans la séance d\'aujourd\'hui : sur la page du jour, à la même place', { e, source, colles, jourAvant })
await p.evaluate(() => window.__app.choisirOutil('stylo'))

// ---------- I. La trieuse rangée par séance ----------
await p.keyboard.press('Escape')
await p.keyboard.press('Shift+P'); await p.clock.runFor(400)
const tr = await p.evaluate(() => ({ titre: document.querySelector('.trieuse-seance-du-jour')?.textContent, cartes: document.querySelectorAll('.trieuse-grille .carte').length, reprises: document.querySelectorAll('.trieuse-grille .carte.reprise').length, passees: [...document.querySelectorAll('.trieuse-une-seance summary')].map(x => x.textContent) }))
ok(tr.titre === 'Aujourd\'hui · mar 13 oct 14h' && tr.cartes === 3 && tr.reprises === 1 && tr.passees.length === 1 && /^Lun 12 oct 8h · 2\s+pages$/.test(tr.passees[0]), 'la trieuse : la séance du jour en haut (3 pages, une reprise marquée), lundi replié dessous', tr)
await p.click('.trieuse-une-seance summary'); await p.clock.runFor(300)
await p.click('.trieuse-vignette-passee >> nth=0'); await p.clock.runFor(300)
e = await lire()
ok(e.passee && e.i === 0 && !(await p.evaluate(() => document.body.classList.contains('en-trieuse'))), 'clic sur une page de lundi : la trieuse se ferme, la page en lecture', e)
await p.click('.bandeau-lecture .retour-aujourdhui'); await p.clock.runFor(200)
e = await lire()
ok(!e.passee && e.i === 1, '« Retour à aujourd\'hui » : la page du jour où l\'on était', e)

// ---------- J. Publier : la séance du jour et SES pages ----------
await p.evaluate(() => window.__app.ui.publication.ouvrir()); await p.clock.runFor(400)
const pub = await p.evaluate(() => ({ options: [...document.querySelectorAll('.p-seance option')].map(o => o.textContent), cases: [...document.querySelectorAll('.p-pages label')].map(l => (l.querySelector('input').checked ? '☑ ' : '☐ ') + l.textContent), decoupe: !document.querySelector('.p-decoupage')?.closest('label')?.hidden }))
ok(/aujourd'hui/.test(pub.options[0]) && pub.options.length === 2 && pub.cases.length === 3 && pub.cases.every(x => x.startsWith('☑')) && pub.cases.some(x => /reprise de lundi/.test(x)) && !pub.decoupe,
  'Publier : la séance du jour d\'abord, ses trois pages cochées (une reprise de lundi), sans découpage', pub)
await p.keyboard.press('Escape'); await p.clock.runFor(200)

// ---------- K. Le menu ⋯ : Renommer la séance, Nouvelle séance ----------
await p.click('button.points'); await p.clock.runFor(200)
const menu = await p.evaluate(() => [...document.querySelectorAll('[data-action="nouvelle-seance"], [data-action="renommer-seance"], [data-action="seance-precedente"]')].map(x => x.textContent))
ok(menu.length === 2, 'le menu ⋯ : Nouvelle séance, Renommer la séance… (Séance précédente : à côté de l\'étiquette ; au menu seulement sur un écran qu\'on touche)', menu)
await p.click('[data-action="renommer-seance"]'); await p.clock.runFor(200)
await p.fill('.saisie-nom-seance', 'Activité d\'intro'); await p.keyboard.press('Enter'); await p.waitForTimeout(150); await p.clock.runFor(300)
e = await lire()
ok(/^Activité d'intro · 2 \/ 3( · Exercice 3)?$/.test(e.rang), 'Renommer la séance : le compteur dit son nom', e)
await p.click('button.points'); await p.clock.runFor(200)
await p.click('[data-action="nouvelle-seance"]'); await p.clock.runFor(300)
e = await lire()
ok(JSON.stringify(e.seances) === '[2,3,1]' && e.formes === 0 && e.reprise, '« Nouvelle séance » du menu : une troisième séance, sa page 1', e)
await p.click('.bandeau-reprise .fermer-seance'); await p.clock.runFor(100)
ok(!(await lire()).reprise, 'le bandeau « Reprendre » se ferme d\'un ×', null)
// Une nouvelle séance sans rien écrire ne se double pas
await p.evaluate(() => window.__app.nouvelleSeance()); await p.clock.runFor(200)
ok(JSON.stringify((await lire()).seances) === '[2,3,1]', 'une séance vide ne se double pas', await lire())

// ---------- L. La migration d'un classeur d'avant le lot 6 ----------
const c2 = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p2 = await c2.newPage()
p2.on('pageerror', x => erreurs.push('migration: ' + x.message))
await p2.clock.install({ time: T0 })
await p2.goto(DEV); await p2.waitForFunction(() => window.__app?.page); await p2.clock.runFor(800)
const ecrire = async (x, y) => { await p2.mouse.move(x, y); await p2.mouse.down(); await p2.mouse.move(x + 80, y + 30, { steps: 5 }); await p2.mouse.up(); await p2.clock.runFor(700) }
await ecrire(500, 300)
await p2.clock.setSystemTime(T0 + 50 * H); await p2.clock.runFor(100)
await p2.click('button.nouvelle-page'); await p2.clock.runFor(300)
await ecrire(500, 320)
await p2.clock.setSystemTime(T0 + 50 * H + 30 * 60_000); await p2.clock.runFor(100)
await p2.evaluate(() => window.__app.allerPage(window.__app.tableau.ordre.get(0))); await p2.clock.runFor(100)
await ecrire(500, 380)
// Plus de séances : un classeur d'avant le lot 6
await p2.evaluate(() => { const t = window.__app.tableau; t.doc.transact(() => { t.seances.clear(); t.seanceDesPages.clear() }) })
await p2.clock.runFor(2000)
await p2.clock.setSystemTime(T0 + 60 * H)
await p2.reload(); await p2.waitForFunction(() => window.__app?.page); await p2.clock.runFor(800)
await accueilOuvert(p2)
const mig = await p2.evaluate(() => { const t = window.__app.tableau; return { s: t.seancesDuClasseur().map(s => ({ debut: s.debut, pages: s.pages.length, ancienne: s.ancienne })), ordre: t.ordre.length, dlg: !!document.querySelector('dialog.dialogue-accueil[open]'), rang: [document.querySelector('.rang-seance .texte').textContent, document.querySelector('.rang').textContent].filter(Boolean).join(' · ') } })
ok(mig.s.length === 2 && mig.s[0].pages === 1 && mig.s[1].pages === 1 && mig.s.every(s => s.ancienne) && mig.ordre === 2 && mig.dlg,
  'migration : les deux séances d\'avant (lundi, mercredi) deviennent des séances, chaque page dans celle où elle est née ; la fenêtre d\'accueil', mig)
await c2.close()

ok(!erreurs.length, 'aucune erreur JS', erreurs)
await p.screenshot({ path: D + '/fin.png' })
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est vert')
process.exit(echecs ? 1 : 0)
