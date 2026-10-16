// ESSAI DES SÉANCES ET DES CLASSES (lot 6), sur le serveur de
// développement : la fenêtre d'accueil remplie avec la bibliothèque. Le
// classeur « Fractions » rangé dans le dossier de classe « 5A » ; « 5B » a
// un classeur, « 4C » n'en a pas. Elle propose « Nouvelle séance avec la
// 5A », « Fractions — changer de chapitre » (la liste des chapitres de la
// classe, avec leur nombre de séances, et « + Nouveau chapitre… » : le nom
// seulement, rangé dans le dossier), « Une autre classe : 4C · 5B » (un clic
// ouvre le chapitre en cours de la classe et y commence une séance ; une
// classe sans classeur propose d'en créer un).
// Une ligne « ✓ » ou « ✗ ÉCHEC » par vérification ; code de sortie 1 s'il y
// a un échec ou une erreur JS.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 1200) : '') }
const erreurs = []
const nav = await chromium.launch()
const H = 3600_000
const T0 = new Date('2026-10-12T08:00:00').getTime()
const c = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await c.newPage()
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::|accounts\.google|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
await p.clock.install({ time: T0 })
const pret = async () => { await p.waitForFunction(() => window.__app?.page); await p.clock.runFor(1500); await p.waitForTimeout(200) }

await p.goto(DEV); await pret()
// La bibliothèque : 5A (avec ce classeur, renommé « Fractions »), 5B (un classeur « Symétrie »), 4C (vide)
const ids = await p.evaluate(async () => {
  const r = window.__registre, app = window.__app
  const { etatNeuf } = await import('/src/classeurs/neuf.ts')
  const { creerBase } = await import('/src/classeurs/bases.ts')
  const { idClasseur, baseDe } = await import('/src/classeurs/demarrage.ts')
  const t = Date.now()
  const dossier = (id, nom) => r.ajouterDossier({ id, nom, parent: null, couleur: 'bleu', etiquette: nom, cree: t })
  await dossier('d5a', '5A'); await dossier('d5b', '5B'); await dossier('d4c', '4C')
  await r.modifierClasseur(app.classeur.id, f => { f.dossier = 'd5a'; f.nom = 'Fractions' })
  const id = idClasseur()
  await r.creerClasseur({ id, base: baseDe(id), nom: 'Symétrie', dossier: 'd5b', etiquettes: [], cree: t, modifie: t, ouvert: t, pages: 1 }, async base => creerBase(base, await etatNeuf('blanc'), { id, nom: 'Symétrie' }))
  return { ici: app.classeur.id, symetrie: id }
})
const trait = async (x, y) => { await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x + 90, y + 36, { steps: 6 }); await p.mouse.up(); await p.clock.runFor(700) }
await trait(500, 300)
await p.clock.runFor(40_000)
await p.clock.setSystemTime(T0 + 30 * H)
await p.reload(); await pret()
const vue = await p.evaluate(() => ({
  dlg: !!document.querySelector('dialog.dialogue-accueil[open]'),
  gros: document.querySelector('.accueil-nouvelle')?.textContent,
  chapitre: document.querySelector('.accueil-chapitre')?.textContent,
  classes: [...document.querySelectorAll('.pastille-classe')].map(b => b.textContent),
}))
ok(vue.dlg && vue.gros === 'Nouvelle séance avec la 5A' && vue.chapitre === 'Fractions — changer de chapitre' && JSON.stringify(vue.classes) === '["4C","5B"]',
  'la fenêtre d\'accueil : « Nouvelle séance avec la 5A », « Fractions — changer de chapitre », « Une autre classe : 4C · 5B »', vue)

// changer de chapitre : la liste de la classe
await p.click('.accueil-changer'); await p.waitForTimeout(200)
const liste = await p.evaluate(() => ({ titre: document.querySelector('.accueil-liste h2')?.textContent, l: [...document.querySelectorAll('.accueil-chapitres button')].map(b => b.textContent) }))
ok(liste.titre === 'Chapitre de la 5A' && liste.l[0] === '+ Nouveau chapitre…' && liste.l.length === 2 && /^Fractions · 1 séance$/.test(liste.l[1]), '« changer de chapitre » : « Chapitre de la 5A », « + Nouveau chapitre… », « Fractions · 1 séance »', liste)
// Le chapitre de cet onglet : une nouvelle séance ici
await p.click('.accueil-un-chapitre.ici'); await p.waitForTimeout(150); await p.clock.runFor(300)
let e = await p.evaluate(() => ({ s: window.__app.tableau.seancesDuClasseur().length, dlg: !!document.querySelector('dialog[open]'), rang: [document.querySelector('.rang-seance .texte').textContent, document.querySelector('.rang').textContent].filter(Boolean).join(' · ') }))
ok(e.s === 2 && !e.dlg && /^Séance du mar 13 oct 14h · 1 \/ 1$/.test(e.rang), 'choisir le chapitre ouvert : une nouvelle séance', e)
await trait(500, 300)

// Une autre classe : 5B, son chapitre en cours, une séance qui commence
await p.clock.setSystemTime(T0 + 60 * H)
await p.reload(); await pret()
await p.click('.pastille-classe >> text=5B')
// Le départ attend ses écritures (des minuteries : l'horloge de l'essai avance)
// (le rappel d'enregistrer le classeur qu'on quitte, s'il vient : « Ouvrir sans enregistrer »)
for (let k = 0; k < 40 && !p.url().includes(ids.symetrie); k++) {
  await p.clock.runFor(500).catch(() => {}); await p.waitForTimeout(100)
  await p.evaluate(() => [...document.querySelectorAll('dialog[open] button')].find(b => b.textContent === 'Ouvrir sans enregistrer')?.click()).catch(() => {})
}
await pret()
e = await p.evaluate(() => ({ url: location.href, nom: window.__app.classeur.nom, dlg: !!document.querySelector('dialog[open]'), s: window.__app.tableau.seancesDuClasseur().length, rang: [document.querySelector('.rang-seance .texte').textContent, document.querySelector('.rang').textContent].filter(Boolean).join(' · ') }))
ok(e.url.includes(ids.symetrie) && e.nom === 'Symétrie' && !e.dlg && e.s === 1 && /^Séance du mer 14 oct 20h · 1 \/ 1$/.test(e.rang), '« 5B » : le chapitre en cours de la 5B s\'ouvre, sa séance commence, sans question', e)

// Une classe sans classeur : « Nouveau chapitre » dans son dossier ; et « + Nouveau chapitre… »
await trait(500, 300)
await p.clock.setSystemTime(T0 + 90 * H)
await p.reload(); await pret()
await p.click('.pastille-classe >> text=4C'); await p.waitForTimeout(300)
const neuf = await p.evaluate(() => ({ titre: document.querySelector('dialog.dialogue-chapitre h2')?.textContent, dans: document.querySelector('dialog.dialogue-chapitre .dans')?.textContent, fonds: document.querySelector('dialog.dialogue-chapitre .fonds')?.hidden }))
ok(neuf.titre === 'Nouveau chapitre' && /4C/.test(neuf.dans ?? '') && neuf.fonds === true, 'une classe sans classeur : « Nouveau chapitre » (le nom seulement), dans le dossier 4C', neuf)
await p.fill('dialog.dialogue-chapitre input[name="nom"]', 'Proportionnalité')
await p.click('dialog.dialogue-chapitre [data-a="creer"]')
await p.waitForFunction(() => window.__app?.classeur?.nom === 'Proportionnalité', null, { timeout: 15000 }).catch(() => {})
await pret()
e = await p.evaluate(async () => ({ nom: window.__app.classeur.nom, dossier: (await window.__registre.classeur(window.__app.classeur.id))?.dossier, dlg: !!document.querySelector('dialog[open]'), s: window.__app.tableau.seancesDuClasseur().length, fond: window.__app.fond }))
ok(e.nom === 'Proportionnalité' && e.dossier === 'd4c' && !e.dlg && e.s === 1 && e.fond === 'blanc', 'le nouveau chapitre s\'ouvre, rangé dans le dossier 4C, page blanche, sa séance commencée', e)

ok(!erreurs.length, 'aucune erreur JS', erreurs)
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'tout est vert')
process.exit(echecs ? 1 : 0)
