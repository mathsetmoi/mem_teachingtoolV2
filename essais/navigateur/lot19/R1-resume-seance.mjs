// ESSAI DU LOT 19 : le résumé de la séance et le texte du cahier de textes.
// Gemini et le relais du Drive sont simulés (aucun appel réel). DEV=… pour le
// port ; CAPTURES=dossier pour garder les captures.
// A. Sans clé : le texte de l'outil (la date, le chapitre, « Fait en classe : »
//    avec le PDF noté et le texte tapé), « Rédaction automatique… ».
// B. La fenêtre « Rédaction automatique » : une fausse clé refusée, la clé
//    gardée dans ce navigateur, l'adresse de Pronote.
// C. Gemini rédige à l'ouverture de Publier : les images des pages et la
//    consigne partent, le texte rendu remplace celui de l'outil, gardé avec
//    la séance ; rouvrir ne redemande rien.
// D. Le professeur corrige le texte : il est gardé, Gemini ne le réécrit plus.
// E. Publier : le texte part dans le presse-papiers avec le lien,
//    « Copier et ouvrir Pronote » mène à l'adresse retenue.
// F. Gemini refuse (quota) : le texte de l'outil reste, le message le dit.
// G. La trieuse : la fiche d'une séance passée (sa durée, ce qui a été fait) ;
//    F2 propose un nom de page, Tab le prend.
// H. Aucune clé, aucun texte ne va dans le document hors de ses cartes.
import { mkdirSync } from 'node:fs'
import { chromium } from '../commun/playwright.mjs'

const DEV = process.env.DEV ?? 'http://localhost:5173/'
const CAPTURES = process.env.CAPTURES ?? ''
if (CAPTURES) mkdirSync(CAPTURES, { recursive: true })
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const erreurs = []
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, permissions: ['clipboard-read', 'clipboard-write'] })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))
const capture = async nom => { if (CAPTURES) await p.screenshot({ path: `${CAPTURES}/${nom}.png` }) }

// Gemini simulé
let gemini = { statut: 200, texte: '**Fait en classe :** démonstration : √2 n\'est pas rationnel ; correction de l\'exercice 12 p. 42.\nÀ faire : exercices 14 et 15 p. 43.' }
const demandes = []
await ctx.route(/generativelanguage\.googleapis\.com/, async r => {
  const u = new URL(r.request().url()), cle = r.request().headers()['x-goog-api-key']
  const rep = (statut, o) => r.fulfill({ status: statut, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) })
  if (cle === 'AIzaLimiteeLimiteeLimiteeLimiteeLimitee1') return rep(403, { error: { code: 403, message: 'Requests from referer https://mathsetmoi.github.io/ are blocked.', status: 'PERMISSION_DENIED', details: [{ reason: 'API_KEY_HTTP_REFERRER_BLOCKED' }] } })
  if (cle !== 'AIzaEssaiEssaiEssaiEssaiEssaiEssai12345') return rep(400, { error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } })
  if (r.request().method() === 'GET' && u.pathname.endsWith('/models')) return rep(200, { models: [
    { name: 'models/gemini-2.5-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.6-flash', supportedGenerationMethods: ['generateContent'] },
    { name: 'models/gemini-3.8-flash-lite', supportedGenerationMethods: ['generateContent'] },
  ] })
  const corps = JSON.parse(r.request().postData() ?? '{}')
  demandes.push({ chemin: u.pathname, corps })
  if (gemini.statut !== 200) return rep(gemini.statut, { error: { code: gemini.statut, message: 'Resource has been exhausted', status: 'RESOURCE_EXHAUSTED' } })
  return rep(200, { candidates: [{ content: { parts: [{ text: gemini.texte }] } }] })
})
// Le relais du Drive simulé (voir lot15/P1-publier-dossier.mjs)
await ctx.route(/accounts\.google\.com|www\.googleapis\.com/, r => r.fulfill({ status: 404, body: '{}' }))
await ctx.route(/script\.google\.com\/macros/, async r => {
  const u = new URL(r.request().url())
  const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(o) })
  if (u.searchParams.get('ping')) return rep({ relais: 'MEM Replay', version: 4, pret: true })
  return rep({ erreur: 'Séance introuvable ou pas encore arrivée sur le Drive.' })
})
await p.addInitScript(() => {
  const H = window.FileSystemHandle?.prototype
  if (H) { H.queryPermission = async () => 'granted'; H.requestPermission = async () => 'granted' }
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('classe', { create: true })
})
await p.goto(DEV); await p.waitForSelector('.rang'); await p.waitForTimeout(400)
await p.evaluate(() => {
  const r = window.__registre, memoire = new Map()
  const lire = r.reglage.bind(r), ecrire = r.ecrireReglage.bind(r)
  r.reglage = cle => memoire.has(cle) ? Promise.resolve(memoire.get(cle)) : lire(cle)
  r.ecrireReglage = (cle, v) => { if (cle.startsWith('replay-dossier:')) { memoire.set(cle, v); return Promise.resolve() } return ecrire(cle, v) }
})

// Une séance passée (lundi), puis la séance du jour : un texte tapé, un PDF noté, des traits
const remplir = async (texte, pdf) => p.evaluate(async ({ texte, pdf }) => {
  const a = window.__app, t = a.tableau
  const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5)
  t.nouveauGeste()
  t.poser(a.page, { id: 'F' + Math.random().toString(36).slice(2), type: 'formule', x: 80, y: 60, z: Date.now(), auteur: t.moi, latex: '', couleur: '#1b2230', taille: 28, texte: [{ morceaux: [{ t: texte }] }] })
  if (pdf) t.noterActivite(a.page, 'pdf', pdf)
  for (let i = 0; i < 3; i++) { t.nouveauGeste(); t.poser(a.page, { id: 'T' + i + Math.random().toString(36).slice(2), type: 'trait', x: 100 + i * 40, y: 200 + i * 50, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }); await new Promise(r => setTimeout(r, 40)) }
  a.ui.maj()
}, { texte, pdf })
await remplir('Les nombres décimaux', null)
await p.evaluate(() => { window.__app.nouvelleSeance() }); await p.waitForTimeout(300)
await remplir('Exercice 12 p. 42', 'Manuel p. 42')

const ouvrir = async () => {
  if (await p.isVisible('.dialogue-publier[open]')) { await p.keyboard.press('Escape'); await p.waitForSelector('.dialogue-publier[open]', { state: 'detached' }) }
  await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]')
  await p.waitForTimeout(200)
}

// A. sans clé
await ouvrir()
const texteA = await p.inputValue('.p-texte-cahier')
ok(await p.isVisible('.p-cahier'), 'A1) Le texte pour le cahier de textes est dans Publier')
ok(/^\S+ \d+ \S+ · .+\nFait en classe : Manuel p\. 42 ; exercice 12 p\. 42\.$/.test(texteA), 'A2) Le texte de l\'outil : la date, le chapitre, ce qui a été fait', texteA)
ok(/Rédigé par l'outil/.test(await p.textContent('.p-cahier-qui')) && await p.isVisible('.p-redaction'), 'A3) « Rédigé par l\'outil » et « Rédaction automatique… »')
ok(demandes.length === 0, 'A4) Sans clé, rien ne part à Gemini', demandes.length)
await capture('1-publier-sans-cle')

// B. la fenêtre « Rédaction automatique »
await p.click('.p-redaction'); await p.waitForSelector('.dialogue-redaction[open]')
await capture('2-redaction')
await p.fill('.r-cle', 'pas une clé')
await p.click('.r-garder')
ok(/Ce n'est pas une clé/.test(await p.textContent('.r-etat')), 'B1) Une fausse clé est refusée', await p.textContent('.r-etat'))
// une clé d'une autre forme que « AIza… », collée avec des guillemets : c'est Gemini qui juge
await p.fill('.r-cle', ' "AQ.Ab8RN6Mauvaise-Mauvaise_Mauvaise.Mauvaise" ')
await p.click('.r-essayer'); await p.waitForFunction(() => /refuse la clé/.test(document.querySelector('.r-etat').textContent), null, { timeout: 5000 }).catch(() => {})
ok(/refuse la clé/.test(await p.textContent('.r-etat')), 'B2) « Essayer la clé » dit qu\'une clé est refusée par Gemini', await p.textContent('.r-etat'))
await p.fill('.r-cle', 'AIzaLimiteeLimiteeLimiteeLimiteeLimitee1')
await p.click('.r-essayer'); await p.waitForFunction(() => /certains sites/.test(document.querySelector('.r-etat').textContent), null, { timeout: 5000 }).catch(() => {})
ok(/limitée à certains sites.*Google dit : « Requests from referer/.test(await p.textContent('.r-etat')), 'B2b) Une clé limitée à certains sites : la raison, et ce que Google en dit', await p.textContent('.r-etat'))
await p.fill('.r-cle', '  AIzaEssaiEssaiEssai EssaiEssaiEssai12345\n')
await p.click('.r-essayer'); await p.waitForFunction(() => /La clé marche/.test(document.querySelector('.r-etat').textContent), null, { timeout: 5000 }).catch(() => {})
ok(/La clé marche/.test(await p.textContent('.r-etat')), 'B3) « Essayer la clé » : la clé marche')
await p.fill('.r-pronote-mem', 'exemple.index-education.net/pronote/professeur.html')
const avantC = demandes.length
await p.click('.r-garder'); await p.waitForSelector('.dialogue-redaction', { state: 'detached' })
ok(await p.evaluate(() => localStorage.getItem('mem-redaction-cle')) === 'AIzaEssaiEssaiEssaiEssaiEssaiEssai12345', 'B4) La clé est gardée dans ce navigateur')
ok(/"mem":"https:\/\/exemple\.index-education\.net\/pronote\/professeur\.html"/.test(await p.evaluate(() => localStorage.getItem('mem-pronote'))), 'B5) L\'adresse de Pronote est gardée (https ajouté)')

// C. Gemini rédige
await p.waitForFunction(() => /Rédigé par Gemini/.test(document.querySelector('.p-cahier-qui').textContent), null, { timeout: 10000 }).catch(() => {})
const texteC = await p.inputValue('.p-texte-cahier')
ok(/Rédigé par Gemini/.test(await p.textContent('.p-cahier-qui')), 'C1) « Rédigé par Gemini : relisez-le »', await p.textContent('.p-cahier-qui'))
ok(/· .+\nFait en classe : démonstration : √2 n'est pas rationnel ; correction de l'exercice 12 p\. 42\.\nÀ faire : exercices 14 et 15 p\. 43\.$/.test(texteC), 'C2) Le texte de Gemini, mis au propre, avec la date et le chapitre', texteC)
const d = demandes[avantC]
const parts = d?.corps?.contents?.[0]?.parts ?? []
ok(/gemini-3\.6-flash:generateContent$/.test(d?.chemin ?? ''), 'C3) Le modèle choisi : le gemini-X-flash le plus récent', d?.chemin)
ok(parts.filter(x => x.inline_data?.mime_type === 'image/jpeg' && x.inline_data.data.length > 1000).length === 1, 'C4) L\'image de la page part avec la consigne (une page : une image)', parts.map(x => Object.keys(x)))
ok(/Manuel p\. 42/.test(parts[0]?.text ?? '') && /N'invente rien/.test(parts[0]?.text ?? ''), 'C5) La consigne dit ce que l\'outil sait déjà')
const avantC6 = demandes.length
await ouvrir(); await p.waitForTimeout(600)
ok(demandes.length === avantC6 && await p.inputValue('.p-texte-cahier') === texteC, 'C6) Rouvrir Publier ne redemande rien : le texte est gardé avec la séance', demandes.length - avantC6)
await capture('3-publier-gemini')

// D. le professeur corrige
const corrige = texteC.replace('exercices 14 et 15', 'exercice 14')
await p.fill('.p-texte-cahier', corrige)
await p.click('.p-titre') // le champ perd le focus : « change »
ok(/Votre texte/.test(await p.textContent('.p-cahier-qui')), 'D1) « Votre texte, gardé avec la séance »')
await ouvrir(); await p.waitForTimeout(600)
ok(await p.inputValue('.p-texte-cahier') === corrige && demandes.length === avantC6, 'D2) Rouvrir garde le texte corrigé, sans demander à Gemini')

// E. publier
await p.check('input[name="p-lieu"][value="dossier"]').catch(() => {})
await p.fill('.p-titre', 'Equations'); await p.fill('.p-nomfichier', 'Equations Essai')
if (await p.isVisible('.p-choisir')) { await p.click('.p-choisir'); await p.waitForTimeout(300) }
await p.click('.p-publier')
await p.waitForSelector('.p-resultat:not([hidden])', { timeout: 15000 })
await p.waitForTimeout(400)
const lien = await p.inputValue('.p-lien')
const copie = await p.evaluate(() => navigator.clipboard.readText())
ok(copie.startsWith(corrige + '\nRevoir la séance : ' + lien), 'E1) Après Publier, le texte et le lien sont déjà dans le presse-papiers', copie)
ok(await p.isVisible('.p-copie-faite'), 'E2) La fenêtre dit que c\'est copié')
const href = await p.getAttribute('.p-ouvrir-pronote', 'href')
ok(await p.isVisible('.p-ouvrir-pronote') && href === 'https://exemple.index-education.net/pronote/professeur.html', 'E3) « Copier et ouvrir Pronote » mène au Pronote retenu', href)
await p.evaluate(() => navigator.clipboard.writeText('rien'))
const [onglet] = await Promise.all([ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null), p.click('.p-ouvrir-pronote')])
await p.waitForTimeout(300)
ok(!!onglet && (await p.evaluate(() => navigator.clipboard.readText())).startsWith(corrige), 'E4) Le clic copie le texte et ouvre Pronote dans un onglet')
if (onglet) await onglet.close()
await capture('4-publie')

// F. Gemini refuse : le texte de l'outil reste
await p.evaluate(() => { const a = window.__app; a.tableau.textesCahier.clear() })
gemini = { statut: 429 }
await ouvrir()
await p.waitForFunction(() => /quota/.test(document.querySelector('.p-cahier-qui').textContent), null, { timeout: 10000 }).catch(() => {})
ok(/quota/.test(await p.textContent('.p-cahier-qui')) && /Fait en classe : Manuel p\. 42/.test(await p.inputValue('.p-texte-cahier')), 'F1) Quota atteint : le message le dit, le texte de l\'outil reste', await p.textContent('.p-cahier-qui'))
await p.keyboard.press('Escape')

// G. la trieuse
await p.keyboard.press('Escape').catch(() => {})
await p.evaluate(() => window.__app.ui.ouvrirTrieuse(false))
await p.waitForTimeout(300)

const resume = await p.textContent('.trieuse-une-seance .trieuse-seance-resume').catch(() => '')
ok(/\d+ min · Les nombres décimaux/.test(resume ?? ''), 'G1) La fiche de la séance passée : sa durée, ce qui a été fait', resume)
await capture('5-trieuse')
await p.dblclick('.trieuse .carte .carte-nom').catch(() => {})
if (!await p.isVisible('.carte-saisie')) { await p.click('.trieuse .carte'); await p.keyboard.press('F2') }
await p.waitForSelector('.carte-saisie', { timeout: 3000 }).catch(() => {})
const place = await p.getAttribute('.carte-saisie', 'placeholder').catch(() => null)
ok(place === 'Manuel p. 42 (Tab pour le prendre)', 'G2) F2 propose un nom de page : ce qui y a été posé', place)
await p.keyboard.press('Tab')
ok(await p.inputValue('.carte-saisie').catch(() => '') === 'Manuel p. 42', 'G3) Tab prend le nom proposé')
await p.keyboard.press('Escape')
await p.evaluate(() => { document.querySelector('dialog[open]')?.close?.() })
await p.keyboard.press('Escape').catch(() => {})

// H. le document : la clé n'y est pas
const doc = await p.evaluate(() => { const t = window.__app.tableau; return JSON.stringify({ a: t.activites.toJSON(), c: t.textesCahier.toJSON(), autres: [...t.doc.share.keys()] }) })
ok(!/AIza/.test(doc) && /Manuel p\. 42/.test(doc), 'H1) Les activités sont dans le document, la clé jamais', doc.slice(0, 300))

ok(!erreurs.length, 'Aucune erreur de page', erreurs)
await b.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout passe')
process.exit(echecs ? 1 : 0)
