// ESSAI DU LOT 17 : les séances isolées (le classeur « Séances isolées » de
// chaque niveau), sur le serveur de développement (port 5173, ou DEV=…),
// l'horloge de Playwright. La bibliothèque : « 5ème » = { Fractions (le
// classeur de l'onglet), Symétrie }, « 4ème » (vide), « Brouillon » à la
// racine.
// A. « Bonjour ! » depuis Fractions : le lien « Séance isolée » (36 px) et
//    son petit texte « Hors chapitre : rangée dans « Séances isolées » de 5ème. » ;
// B. un clic : le classeur « Séances isolées » est créé dans le dossier 5ème,
//    s'ouvre, sa séance a commencé sans fenêtre, page blanche, le message
//    « Classeur « Séances isolées » créé en 5ème : … » ;
// C. le lendemain, depuis Fractions, « Séance isolée » ouvre le même classeur
//    (pas de doublon) et y commence une 2e séance ; la case « Commencer par
//    des automatismes » cochée ouvre le flash à l'arrivée ;
// D. « Bonjour ! » depuis « Séances isolées » : pas de lien, le gros bouton
//    « Nouvelle séance isolée en 5ème », « Séances isolées — changer de chapitre » ;
// E. « Chapitres de 5ème » : « Séances isolées · 2 séances · hors chapitre »
//    en dernier (même ouvert dans l'onglet) ;
// F. la bibliothèque, dossier 5ème : la carte en dernier (par date ET par
//    nom), la mention « Hors chapitre », le lecteur d'écran ;
// G. « Déplacer vers… » une séance isolée dans Fractions : elle y arrive à sa
//    date avec son film, Publier la propose ; la dernière séance qui part
//    envoie le classeur vide à la corbeille ;
// H. « Séance isolée » ensuite : un classeur neuf (la corbeille ignorée) ;
//    remettre l'ancien : deux cartes, les nouvelles séances vont dans le plus
//    récemment ouvert ;
// I. depuis « Brouillon » (racine) : « … dans « Séances isolées ». », le
//    classeur créé à la racine ;
// J. le menu ⋯ n'a pas d'entrée « Séance isolée » (décision : il ne tient
//    déjà pas sans défiler à 1366 × 657, la hauteur est mesurée et écrite) ;
//    « Bonjour ! » depuis Fractions mène au classeur isolé de 5ème ; au
//    téléphone (390 × 844), « Plus » non plus, et « Bonjour ! » a le lien,
//    entière sans défiler ;
// K. Publier depuis une séance isolée avec le niveau relié à un dossier : le
//    dossier proposé « … › Séances isolées », le titre « Séance du … », le nom
//    du fichier ;
// L. la version hors ligne (dist/index.html en file://, internet coupé :
//    `npm run build` d'abord) : le lien existe et crée le classeur.
// CAPTURES=<dossier> : quatre captures PNG pour le professeur (p5-*.png).
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { RACINE_DEPOT as RACINE } from '../commun/racines.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const CAPTURES = process.env.CAPTURES ?? null
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1500) : '') }
const norm = t => (t || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim()
const erreurs = []
const H = 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()
const ISOLEES = 'Séances isolées'

/** Dans la page : les messages du bas (toasts) notés au fil de l'eau, et la
 *  lecture d'un classeur de la bibliothèque dans sa base (ses séances, ce
 *  que Publier en montre : comme lot9/E1-ranger-seances.mjs) */
const OUTILS = () => {
  window.__toasts = []
  let dernier = ''
  setInterval(() => { const t = [...document.querySelectorAll('.toast')].map(x => x.textContent).join('|').replace(/[  ]/g, ' '); if (t && t !== dernier) { dernier = t; window.__toasts.push(t) } }, 15)
  window.__lire = async (id) => {
    const { Tableau } = await import('/src/document.ts'), ecr = await import('/src/classeurs/ecrivain.ts'), fichier = await import('/src/fichier.ts')
    const ex = await import('/src/revoir/exporter.ts')
    const f = await window.__registre.classeur(id)
    const fab = await ecr.ecrivain.fabriquerFichier(f.base, { nom: f.nom, id: f.id })
    const t = new Tableau(null); t.seancesActives = true
    t.lireEtat(fichier.lireTableau(new Uint8Array(await fab.fichier.arrayBuffer())).etat)
    const film = t.film.toArray().map(e => e.t)
    const explicites = ex.seancesDuTableau(t) ?? []
    const r = {
      fiche: { nom: f.nom, dossier: f.dossier, corbeille: !!f.corbeille, liste: (f.listeSeances ?? []).map(s => ({ id: s.id, debut: s.debut, pages: s.pages })) },
      seances: t.seancesDuClasseur().filter(s => s.pages.length).map(s => ({ id: s.id, debut: s.debut, pages: s.pages.length, gestes: explicites.find(e => e.id === s.id)?.gestes ?? 0 })),
      trie: film.every((v, i) => i === 0 || film[i - 1] <= v),
    }
    t.doc.destroy()
    return r
  }
}

const nav = await chromium.launch()
const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await c.addInitScript(OUTILS)
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: T0 })
const pret = async () => { await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(1500); await p.waitForTimeout(200) }
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
/** Le départ vers un autre classeur attend ses écritures (des minuteries : l'horloge avance) */
const attendreClasseur = async (nom) => {
  for (let k = 0; k < 60 && (await p.evaluate(() => window.__app?.classeur?.nom).catch(() => null)) !== nom; k++) {
    await p.clock.runFor(500).catch(() => {}); await p.waitForTimeout(100)
  }
  await pret()
}
const toasts = () => p.evaluate(() => window.__toasts.slice())
const viderToasts = () => p.evaluate(() => { window.__toasts.length = 0 })
const capture = async nom => { if (CAPTURES) await p.screenshot({ path: join(CAPTURES, nom) }) }
/** Les classeurs « Séances isolées » de la bibliothèque : { id, dossier, corbeille, ouvert } */
const isolees = () => p.evaluate(async nom => (await window.__registre.classeurs()).filter(f => f.nom === nom).map(f => ({ id: f.id, dossier: f.dossier, corbeille: !!f.corbeille, ouvert: f.ouvert })), ISOLEES)
const vueAccueil = () => p.evaluate(() => ({
  dlg: !!document.querySelector('dialog.dialogue-accueil[open]'),
  gros: document.querySelector('.accueil-nouvelle')?.textContent,
  chapitre: document.querySelector('.accueil-chapitre')?.textContent,
  lien: document.querySelector('.accueil-seance-isolee')?.textContent ?? null,
  hauteur: document.querySelector('.accueil-seance-isolee')?.getBoundingClientRect().height ?? 0,
  petit: document.querySelector('.accueil-isolee small')?.textContent ?? null,
}))
const allerA = async id => { await p.goto(`${DEV}?classeur=${id}`); await pret() }

await p.goto(DEV); await pret()
const ids = await p.evaluate(async () => {
  const r = window.__registre, app = window.__app
  const { etatNeuf } = await import('/src/classeurs/neuf.ts')
  const { creerBase } = await import('/src/classeurs/bases.ts')
  const { idClasseur, baseDe } = await import('/src/classeurs/demarrage.ts')
  const t = Date.now()
  const dossier = (id, nom) => r.ajouterDossier({ id, nom, parent: null, couleur: '#3b6fb6', etiquette: nom, cree: t })
  await dossier('d5a', '5ème'); await dossier('d4a', '4ème')
  await r.modifierClasseur(app.classeur.id, f => { f.dossier = 'd5a'; f.nom = 'Fractions' })
  const neuf = async (nom, dossier) => {
    const id = idClasseur()
    await r.creerClasseur({ id, base: baseDe(id), nom, dossier, etiquettes: [], cree: t - 3 * 3600e3, modifie: t - 3600e3, ouvert: t - 3600e3, pages: 1 }, async base => creerBase(base, await etatNeuf('blanc'), { id, nom }))
    return id
  }
  return { ici: app.classeur.id, symetrie: await neuf('Symétrie', 'd5a'), brouillon: await neuf('Brouillon', null) }
})
await trait(500, 300)
await p.clock.runFor(40_000)
await p.clock.setSystemTime(T0 + 30 * H)
await p.reload(); await pret()

// ---------- A. Le lien dans « Bonjour ! » ----------
let v = await vueAccueil()
ok(v.dlg && v.gros === 'Nouvelle séance en 5ème' && v.chapitre === 'Fractions — changer de chapitre', 'A1) « Bonjour ! » depuis Fractions : « Nouvelle séance en 5ème », « Fractions — changer de chapitre »', v)
ok(v.lien === 'Séance isolée' && v.hauteur >= 36 && v.petit === 'Hors chapitre : rangée dans « Séances isolées » de 5ème.', 'A2) Le lien « Séance isolée » (36 px) et son petit texte « Hors chapitre : rangée dans « Séances isolées » de 5ème. »', v)
await capture('p5-1-bonjour.png')

// ---------- B. Un clic : le classeur créé, sans fenêtre ----------
await viderToasts()
await p.click('.accueil-seance-isolee')
await attendreClasseur(ISOLEES)
let e = await p.evaluate(async () => ({ nom: window.__app.classeur.nom, dossier: (await window.__registre.classeur(window.__app.classeur.id))?.dossier, dlg: !!document.querySelector('dialog[open]'), s: window.__app.tableau.seancesDuClasseur().length, fond: window.__app.fond, pages: window.__app.tableau.ordre.length }))
let l = await isolees()
let t = await toasts()
ok(e.nom === ISOLEES && e.dossier === 'd5a' && l.length === 1 && l[0].dossier === 'd5a', 'B1) Le classeur « Séances isolées » est créé dans le dossier 5ème (un seul) et s\'ouvre', { e, l })
ok(!e.dlg && e.s === 1 && e.fond === 'blanc' && e.pages === 1, 'B2) Sa séance a commencé sans fenêtre, une page blanche', e)
ok(t.some(x => /Classeur « Séances isolées » créé en 5ème : vos séances hors chapitre iront là\./.test(x)), 'B3) Le message : « Classeur « Séances isolées » créé en 5ème : vos séances hors chapitre iront là. »', t)
const idIsolees = l[0].id
await trait(500, 300)

// ---------- C. Le lendemain : le même classeur, une 2e séance, le flash ----------
await p.clock.setSystemTime(T0 + 60 * H)
await allerA(ids.ici)
v = await vueAccueil()
ok(v.dlg && v.lien === 'Séance isolée', 'C1) Le lendemain, « Bonjour ! » depuis Fractions a le lien', v)
await p.check('.accueil-automatismes')
await p.click('.accueil-seance-isolee')
await attendreClasseur(ISOLEES)
const flash = await p.waitForSelector('dialog.dialogue-flash[open]', { timeout: 5000 }).then(() => true, () => false)
e = await p.evaluate(() => ({ id: window.__app.classeur.id, s: window.__app.tableau.seancesDuClasseur().length }))
l = await isolees()
ok(e.id === idIsolees && l.length === 1, 'C2) Le même classeur s\'ouvre (pas de doublon)', { e, l })
ok(e.s === 2, 'C3) Une 2e séance y commence (la clé de l\'onglet)', e)
ok(flash, 'C4) La case « Commencer par des automatismes » cochée : le flash s\'ouvre à l\'arrivée')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
await trait(500, 300)

// ---------- D. « Bonjour ! » depuis « Séances isolées » ----------
await p.clock.runFor(40_000)
await p.clock.setSystemTime(T0 + 90 * H)
await p.reload(); await pret()
v = await vueAccueil()
ok(v.dlg && v.lien === null && v.petit === null && v.gros === 'Nouvelle séance isolée en 5ème' && v.chapitre === 'Séances isolées — changer de chapitre',
  'D) Depuis « Séances isolées » : pas de lien, « Nouvelle séance isolée en 5ème », « Séances isolées — changer de chapitre »', v)

// ---------- E. « Chapitres de 5ème » : en dernier ----------
await p.click('.accueil-changer'); await p.waitForTimeout(200)
const liste = await p.evaluate(() => ({
  titre: document.querySelector('.accueil-liste h2')?.textContent,
  l: [...document.querySelectorAll('.accueil-chapitres button')].map(b => ({ t: b.textContent, isolees: b.classList.contains('isolees'), ici: b.getAttribute('aria-current') === 'true' })),
}))
const dernier = liste.l[liste.l.length - 1]
ok(liste.titre === 'Chapitres de 5ème' && liste.l.length === 4 && liste.l[0].t === '+ Nouveau chapitre…' && norm(dernier.t) === 'Séances isolées · 2 séances · hors chapitre' && dernier.isolees && dernier.ici
  && liste.l.slice(1, 3).every(x => !x.isolees && !/hors chapitre/.test(x.t)),
  'E) « Chapitres de 5ème » : « Séances isolées · 2 séances · hors chapitre » en dernier, même ouvert dans l\'onglet ; les chapitres sans mention', liste)
await capture('p5-2-chapitres.png')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- F. La bibliothèque, dossier 5ème ----------
const ouvrirBiblio = async () => {
  await p.evaluate(() => { if (!window.__bibliotheque.ouvert) window.__app.ui.ouvrirBibliotheque() })
  await p.waitForFunction(() => window.__bibliotheque.ouvert)
  await p.evaluate(() => window.__bibliotheque.charger())
  await p.waitForTimeout(300)
}
const cartes = () => p.evaluate(() => [...document.querySelectorAll('.grille-classeurs:not(.recents) .case-classeur')].map(li => ({
  nom: li.querySelector('.carte-nom-classeur')?.textContent, isolees: li.classList.contains('isolees'),
  mention: li.querySelector('.carte-hors-chapitre')?.hidden === false ? li.querySelector('.carte-hors-chapitre').textContent : null,
  lecteur: li.querySelector('.carte-classeur')?.getAttribute('aria-label') ?? '',
})))
const choisirTri = async tri => { await p.click('.biblio-tri'); await p.waitForTimeout(150); await p.click(`.menu-item[data-action="tri-${tri}"]`); await p.waitForTimeout(300) }
/** Entrer dans le dossier 5ème (sa carte, à la racine ; déjà dedans : rien) */
const dans5 = async () => {
  const icone = await p.$('.grille-classeurs.tous .case-dossier[data-dossier="d5a"] .dossier-icone')
  if (icone) { await icone.click(); await p.waitForTimeout(300) }
}
await ouvrirBiblio()
await dans5()
let k = await cartes()
ok(k.length === 3 && k[2].nom === ISOLEES && k[2].isolees && k[2].mention === 'Hors chapitre' && /^Séances isolées, hors chapitre, /.test(k[2].lecteur) && k.slice(0, 2).every(x => !x.isolees && x.mention === null && !/hors chapitre/.test(x.lecteur)),
  'F1) Dossier 5ème, « Modifiés récemment » : la carte « Séances isolées » en dernier (la plus récente pourtant), « Hors chapitre », le lecteur d\'écran le dit', k)
await capture('p5-3-bibliotheque.png')
await choisirTri('nom')
k = await cartes()
ok(k.map(x => x.nom).join('|') === 'Fractions|Symétrie|Séances isolées', 'F2) « Nom (A → Z) » : Fractions, Symétrie, puis « Séances isolées » en dernier quand même', k.map(x => x.nom))
await choisirTri('modifie')
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- G. « Déplacer vers… » un chapitre ----------
// Depuis Fractions (le classeur isolé n'est plus celui de l'onglet)
await allerA(ids.ici)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
const carte = id => `.grille-classeurs:not(.recents) .case-classeur[data-cle="${id}"]`
const deplier = async id => {
  if (await p.getAttribute(carte(id) + ' .carte-seances-bascule', 'aria-expanded') !== 'true') { await p.click(carte(id) + ' .carte-seances-bascule'); await p.waitForTimeout(200) }
}
const attendreFin = async () => { await p.waitForFunction(() => !window.__bibliotheque.seancesOccupees, null, { timeout: 15000 }); await p.waitForTimeout(300) }
const deplacerVers = async (id, k, cible) => {
  await deplier(id)
  await p.click(`${carte(id)} .carte-seance-ligne >> nth=${k} >> .options-seance`); await p.waitForTimeout(200)
  await p.click('.menu-item[data-action="deplacer-seance"]'); await p.waitForTimeout(300)
  await p.click(`.dialogue-deplacer-seance label:has-text("${cible}")`)
  await p.click('.dialogue-deplacer-seance button[type="submit"]')
  await attendreFin()
}
await viderToasts()
await ouvrirBiblio()
await dans5()
const avant = await p.evaluate(id => window.__lire(id), idIsolees)
const partie = avant.seances[avant.seances.length - 1]
await deplacerVers(idIsolees, 0, 'Fractions')
let fr = await p.evaluate(id => window.__lire(id), ids.ici)
let iso = await p.evaluate(id => window.__lire(id), idIsolees)
t = await toasts()
const arrivee = fr.seances.find(s => s.debut === partie.debut)
ok(avant.seances.length === 2 && iso.seances.length === 1 && !iso.fiche.corbeille && !!arrivee && arrivee.gestes === partie.gestes && fr.trie && t.some(x => /est dans « Fractions »/.test(x)),
  'G1) La séance isolée la plus récente part dans Fractions, à sa date, avec son film ; « Séances isolées » reste', { avant: avant.seances, fr: fr.seances, iso: iso.seances, t })
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.evaluate(() => window.__app.ui.publication.ouvrir({ complet: true }))
await p.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
const options = await p.evaluate(() => [...document.querySelectorAll('.p-seance option')].map(o => o.textContent))
ok(options.length === 2 && options.some(o => /14 octobre/.test(o)), 'G2) Publier, dans Fractions, propose la séance arrivée (mercredi 14 octobre)', options)
await p.keyboard.press('Escape'); await p.waitForSelector('.dialogue-publier[open]', { state: 'detached' })
await viderToasts()
await ouvrirBiblio()
await dans5()
await deplacerVers(idIsolees, 0, 'Fractions')
fr = await p.evaluate(id => window.__lire(id), ids.ici)
iso = await p.evaluate(id => window.__lire(id), idIsolees)
t = await toasts()
ok(fr.seances.length === 3 && fr.trie && iso.fiche.corbeille && t.some(x => /« Séances isolées », vide, est dans la corbeille/.test(x)),
  'G3) La dernière séance part : « Séances isolées », vide, va dans la corbeille', { fr: fr.seances.length, iso: iso.fiche, t })
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- H. Un classeur neuf ; l'ancien remis ----------
await p.clock.setSystemTime(T0 + 120 * H)
await p.reload(); await pret()
await viderToasts()
v = await vueAccueil()
ok(v.dlg && v.lien === 'Séance isolée', 'H1) « Bonjour ! » depuis Fractions a toujours le lien', v)
await p.click('.accueil-seance-isolee')
await attendreClasseur(ISOLEES)
l = await isolees()
const neuf = await p.evaluate(() => window.__app.classeur.id)
t = await toasts()
ok(neuf !== idIsolees && l.length === 2 && l.find(x => x.id === neuf)?.dossier === 'd5a' && !l.find(x => x.id === neuf).corbeille && l.find(x => x.id === idIsolees).corbeille && t.some(x => /créé en 5ème/.test(x)),
  'H2) Un classeur « Séances isolées » neuf, dans 5ème (celui de la corbeille est ignoré), le message', { neuf, idIsolees, l, t })
// L'ancien remis de la corbeille : deux classeurs, les nouvelles séances vont dans le plus récemment ouvert
const choix = await p.evaluate(async ([ancien, neuf]) => {
  const r = window.__registre
  await r.modifierClasseur(ancien, f => { delete f.corbeille })
  const m = await import('/src/classeurs/isolees.ts')
  const [fiches, dossiers] = await Promise.all([r.classeurs(), r.dossiers()])
  return { choisi: m.classeurSeancesIsolees('d5a', fiches, dossiers)?.id, ouverts: fiches.filter(f => f.nom === 'Séances isolées').map(f => [f.id, f.ouvert]) }
}, [idIsolees, neuf])
await ouvrirBiblio()
await dans5()
k = await cartes()
ok(choix.choisi === neuf && k.length === 4 && k.slice(2).every(x => x.nom === ISOLEES && x.mention === 'Hors chapitre') && k.slice(0, 2).every(x => x.nom !== ISOLEES),
  'H3) L\'ancien remis : deux cartes « Hors chapitre » en queue ; les nouvelles séances isolées iront dans le plus récemment ouvert', { choix, k: k.map(x => x.nom) })
await p.evaluate(id => window.__registre.modifierClasseur(id, f => { f.corbeille = { t: Date.now() } }), idIsolees)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)

// ---------- I. Depuis « Brouillon », à la racine ----------
await allerA(ids.brouillon)
await p.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
await trait(500, 300)
await p.clock.runFor(40_000)
await p.clock.setSystemTime(T0 + 150 * H)
await p.reload(); await pret()
await viderToasts()
v = await vueAccueil()
ok(v.dlg && v.gros === 'Nouvelle séance' && v.lien === 'Séance isolée' && v.petit === 'Hors chapitre : rangée dans « Séances isolées ».', 'I1) Depuis « Brouillon » (sans dossier) : « Nouvelle séance », le lien, « Hors chapitre : rangée dans « Séances isolées ». »', v)
await p.click('.accueil-seance-isolee')
await attendreClasseur(ISOLEES)
e = await p.evaluate(async () => ({ id: window.__app.classeur.id, dossier: (await window.__registre.classeur(window.__app.classeur.id))?.dossier, s: window.__app.tableau.seancesDuClasseur().length, dlg: !!document.querySelector('dialog[open]') }))
t = await toasts()
ok(e.dossier === null && e.id !== neuf && e.s === 1 && !e.dlg && t.some(x => /Classeur « Séances isolées » créé : vos séances hors chapitre iront là\./.test(x)),
  'I2) Un classeur « Séances isolées » à la racine, sa séance commencée ; « Classeur « Séances isolées » créé : … »', { e, t })

// ---------- J. Le menu ⋯ (pas d'entrée : il ne tient déjà pas sans défiler) ----------
await p.setViewportSize({ width: 1366, height: 657 })
await allerA(ids.ici)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(200)
const menu = await p.evaluate(() => {
  const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
  const r = m.getBoundingClientRect()
  return { entrees: [...m.querySelectorAll('.menu-item[data-action]')].map(x => x.dataset.action), hauteur: Math.round(r.height), bas: Math.round(r.bottom), fenetre: innerHeight, contenu: m.scrollHeight, place: m.clientHeight }
})
ok(!menu.entrees.includes('seance-isolee') && menu.entrees.indexOf('renommer-seance') === menu.entrees.indexOf('nouvelle-seance') + 1,
  `J1) Le menu ⋯ n'a pas d'entrée « Séance isolée » (mesuré à 1366 × 657 : ${menu.contenu} px de contenu pour ${menu.place} px de place, il défile déjà)`, menu)
await p.keyboard.press('Escape'); await p.waitForTimeout(200)
// « Bonjour ! » depuis Fractions mène au classeur isolé de 5ème (le neuf)
await p.clock.setSystemTime(T0 + 180 * H)
await p.reload(); await pret()
await p.click('.accueil-seance-isolee')
await attendreClasseur(ISOLEES)
e = await p.evaluate(() => ({ id: window.__app.classeur.id, dlg: !!document.querySelector('dialog[open]') }))
ok(e.id === neuf && !e.dlg, 'J2) « Séance isolée » depuis Fractions mène au classeur « Séances isolées » de 5ème (le plus récemment ouvert), sans question', { e, neuf })
await p.setViewportSize({ width: 1366, height: 768 })

// Au téléphone (390 × 844) : « Plus » sans l'entrée non plus, « Bonjour ! » a le lien
{
  const ct = await nav.newContext({ viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 })
  await ct.addInitScript(OUTILS)
  const q = await ct.newPage()
  q.on('pageerror', x => erreurs.push('téléphone : ' + x.message))
  await q.clock.install({ time: T0 })
  await q.goto(DEV); await q.waitForFunction(() => window.__app?.page); await q.clock.runFor(1500); await q.waitForTimeout(200)
  await q.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
  await q.click('.barre-haut > .bouton.points'); await q.waitForTimeout(200)
  const plus = await q.evaluate(() => {
    const m = [...document.querySelectorAll('.menu-flottant')].find(x => !x.hidden)
    return { nom: m?.getAttribute('aria-label'), entrees: [...m.querySelectorAll('.menu-item[data-action]')].map(x => x.dataset.action) }
  })
  ok(plus.nom === 'Plus' && plus.entrees.includes('nouvelle-seance') && !plus.entrees.includes('seance-isolee'), 'J3) Au téléphone, « Plus » n\'a pas d\'entrée « Séance isolée » non plus', plus)
  await q.keyboard.press('Escape'); await q.waitForTimeout(200)
  // Un trait au doigt, plus d'une heure : « Bonjour ! »
  await q.touchscreen.tap(200, 500); await q.clock.runFor(700)
  await q.evaluate(async () => { const a = window.__app, t = a.tableau; t.poser(a.page, { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x: 100, y: 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 40, 5, 0.5, 80, 0, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) })
  await q.clock.runFor(40_000)
  await q.clock.setSystemTime(T0 + 30 * H)
  await q.reload(); await q.waitForFunction(() => window.__app?.page); await q.clock.runFor(1500); await q.waitForTimeout(300)
  const tel = await q.evaluate(() => {
    const d = document.querySelector('dialog.dialogue-accueil[open]'), r = d?.getBoundingClientRect()
    return { dlg: !!d, lien: document.querySelector('.accueil-seance-isolee')?.textContent ?? null, petit: document.querySelector('.accueil-isolee small')?.textContent ?? null,
      entier: !!d && r.top >= 0 && r.bottom <= innerHeight && d.scrollHeight <= d.clientHeight + 1, largeur: Math.round(r?.width ?? 0) }
  })
  ok(tel.dlg && tel.lien === 'Séance isolée' && tel.petit === 'Hors chapitre : rangée dans « Séances isolées ».' && tel.entier, `J4) Au téléphone, « Bonjour ! » a le lien et reste entière sans défiler (${tel.largeur} px de large)`, tel)
  if (CAPTURES) await q.screenshot({ path: join(CAPTURES, 'p5-4-telephone.png') })
  await ct.close()
}

// ---------- K. Publier depuis une séance isolée, le niveau relié à un dossier ----------
// (le classeur isolé de 5ème est ouvert dans l'onglet depuis J2)
await p.evaluate(async () => {
  const r = window.__registre
  await r.ecrireReglage('emplacements', [{ id: '0123456789abcdef', genre: 'ordinateur', dossier: 'd5a', nom: 'Cle 5eme', cree: Date.now() }])
  // La poignée du dossier relié : un dossier de l'OPFS, gardé en mémoire (la
  // relire depuis IndexedDB fait tomber ce Chromium d'essai, voir lot15)
  const lire = r.reglage.bind(r)
  r.reglage = async cle => cle === 'emplacement-poignee:0123456789abcdef' ? (await navigator.storage.getDirectory()).getDirectoryHandle('Cle 5eme', { create: true }) : lire(cle)
  const H = window.FileSystemHandle?.prototype
  if (H) { H.queryPermission = async () => 'granted'; H.requestPermission = async () => 'granted' }
})
await trait(500, 300)
await p.evaluate(() => window.__app.ui.publication.ouvrir({ complet: true }))
await p.waitForSelector('.dialogue-publier[open]', { timeout: 10000 })
const pub = await p.evaluate(() => ({
  chemin: document.querySelector('.p-chemin')?.textContent, titre: document.querySelector('.p-titre')?.value, fichier: document.querySelector('.p-nomfichier')?.value,
  seance: document.querySelector('.p-seance option:checked')?.textContent ?? '',
}))
ok(pub.chemin === 'Cle 5eme › Séances isolées', 'K1) Publier propose le dossier du chapitre « Cle 5eme › Séances isolées »', pub)
ok(/^Séance du \d{1,2} \S+$/.test(pub.titre ?? '') && pub.fichier === pub.titre, 'K2) Le titre « Séance du 17 octobre » (la date, comme toute séance) et le nom du fichier qui le suit', pub)
await p.keyboard.press('Escape'); await p.waitForSelector('.dialogue-publier[open]', { state: 'detached' })

ok(!erreurs.length, 'Aucune erreur JS (serveur de développement)', erreurs)
await c.close()

// ---------- L. La version hors ligne ----------
const DIST = join(RACINE, 'dist/index.html')
if (!existsSync(DIST)) ok(false, 'L) dist/index.html manque : npm run build')
else {
  const erreursL = []
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.route(/^https?:/, r => r.abort())
  await ctx.addInitScript(OUTILS)
  const q = await ctx.newPage()
  q.on('pageerror', x => erreursL.push(x.message))
  q.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|Failed to load resource/.test(m.text())) erreursL.push(m.text()) })
  await q.clock.install({ time: T0 })
  const pretL = async () => { await q.waitForSelector('button[title^="Importer une image ou un PDF"]', { state: 'attached', timeout: 30000 }); await q.clock.runFor(1500); await q.waitForTimeout(300) }
  await q.goto(pathToFileURL(DIST).href); await pretL()
  await q.evaluate(() => { for (const d of document.querySelectorAll('dialog[open]')) d.close() })
  await q.mouse.move(500, 300); await q.mouse.down(); await q.mouse.move(590, 336, { steps: 6 }); await q.mouse.up(); await q.clock.runFor(700)
  await q.clock.runFor(40_000)
  await q.clock.setSystemTime(T0 + 30 * H)
  await q.reload(); await pretL()
  const hl = await q.evaluate(() => ({ dlg: !!document.querySelector('dialog.dialogue-accueil[open]'), lien: document.querySelector('.accueil-seance-isolee')?.textContent ?? null, petit: document.querySelector('.accueil-isolee small')?.textContent ?? null }))
  ok(hl.dlg && hl.lien === 'Séance isolée' && hl.petit === 'Hors chapitre : rangée dans « Séances isolées ».', 'L1) Version hors ligne (file://) : « Bonjour ! » a le lien « Séance isolée »', hl)
  await q.evaluate(() => { window.__toasts.length = 0 })
  await q.click('.accueil-seance-isolee')
  for (let k = 0; k < 60 && !(await q.evaluate(() => /^Séances isolées — /.test(document.title)).catch(() => false)); k++) {
    await q.clock.runFor(500).catch(() => {}); await q.waitForTimeout(100)
  }
  await pretL()
  const arriveL = await q.evaluate(() => ({ titre: document.title, bouton: document.querySelector('.bouton-classeur')?.textContent ?? '', dlg: !!document.querySelector('dialog[open]'), toasts: window.__toasts.slice() }))
  ok(/^Séances isolées — MEM teachingtool$/.test(arriveL.titre) && !arriveL.dlg && arriveL.toasts.some(x => /Classeur « Séances isolées » créé : vos séances hors chapitre iront là\./.test(x)),
    'L2) Version hors ligne : le classeur « Séances isolées » est créé et s\'ouvre, sans fenêtre, le message le dit', arriveL)
  ok(!erreursL.length, 'L3) Aucune erreur JS (version hors ligne)', erreursL)
  await ctx.close()
}

await nav.close()
console.log(echecs ? `\n✗ ${echecs} échec(s)` : '\n✓ Tout est passé')
process.exit(echecs ? 1 : 0)
