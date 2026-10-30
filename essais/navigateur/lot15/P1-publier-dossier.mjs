// ESSAI DU LOT 15 : Publier dans un dossier de l'ordinateur (sans connexion Google).
// Le dossier choisi est un dossier de l'OPFS (showDirectoryPicker simulé) ; le
// relais du Drive est simulé : il répond « pas encore » tant que le fichier
// n'est pas « arrivé », puis sert le fichier trouvé par son code.
// A. Publier : le fichier « Titre [code].mem » est écrit, le lien porte le code.
// B. Le relais ne l'a pas encore : « En attente de Google Drive », puis « ✓ en ligne ».
// C. Republier sous un autre nom : même code, un seul fichier.
// D. Un relais pas à jour (version 3) est signalé avant d'écrire.
// E. Aucune connexion ni appel à l'API Drive de Google (le script de connexion peut se charger, sans effet).
// Publier en un clic (lot 16) :
// G. Tout est retenu (le dossier, le Drive) et une séance a déjà été rangée : la fenêtre
//    s'ouvre en résumé (la séance et ses pages, où va le replay), le focus sur Publier ;
//    Publier réécrit le fichier sous le même code, le lien ne change pas.
// H. « Modifier… » déplie la fenêtre complète.
// I. L'accord du dossier refusé : la fenêtre se déplie, dit de le choisir à nouveau, rien n'est écrit.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const erreurs = []
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))

let version = 4, arrive = false, appelsGoogle = 0
await ctx.route(/accounts\.google\.com|www\.googleapis\.com/, r => { if (!/gsi\/client/.test(r.request().url())) appelsGoogle++; return r.fulfill({ status: 404, body: '{}' }) })
await ctx.route(/script\.google\.com\/macros/, async r => {
  const u = new URL(r.request().url())
  const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) })
  if (u.searchParams.get('ping')) return rep({ relais: 'MEM Replay', version, pret: true })
  const code = u.searchParams.get('code')
  if (!code) return rep({ erreur: 'Lien incomplet.' })
  if (!arrive) return rep({ erreur: 'Séance introuvable ou pas encore arrivée sur le Drive.' })
  const texte = await p.evaluate(async c => {
    const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('classe', { create: true })
    for await (const [n, h] of d.entries()) if (h.kind === 'file' && n.endsWith(`[${c}].mem`)) return await (await h.getFile()).text()
    return null
  }, code)
  return rep(texte ?? { erreur: 'Séance introuvable.' })
})
await p.addInitScript(() => {
  const H = window.FileSystemHandle?.prototype
  if (H) { H.queryPermission = async () => 'granted'; H.requestPermission = async () => 'granted' }
  window.showDirectoryPicker = async () => (await navigator.storage.getDirectory()).getDirectoryHandle('classe', { create: true })
})
await p.goto(DEV); await p.waitForSelector('.rang'); await p.waitForTimeout(400)
// Le dossier choisi est une poignée de l'OPFS : la relire depuis IndexedDB fait
// tomber ce Chromium d'essai (SIGTRAP du navigateur, headless shell comme Chromium
// complet). En vrai Chrome, avec un vrai dossier, l'aller-retour marche (le lot 15
// en vit à chaque ouverture). Ici, le réglage « replay-dossier:… » reste en
// mémoire dans la page ; les autres réglages vont dans la base comme d'habitude.
await p.evaluate(() => {
  const r = window.__registre, memoire = new Map()
  const lire = r.reglage.bind(r), ecrire = r.ecrireReglage.bind(r)
  r.reglage = cle => memoire.has(cle) ? Promise.resolve(memoire.get(cle)) : lire(cle)
  r.ecrireReglage = (cle, v) => { if (cle.startsWith('replay-dossier:')) { memoire.set(cle, v); return Promise.resolve() } return ecrire(cle, v) }
})
await p.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5)
  for (let i = 0; i < 3; i++) { t.poser(a.page, { id: 'T' + i + Math.random().toString(36).slice(2), type: 'trait', x: 100 + i * 40, y: 100 + i * 50, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }); await new Promise(r => setTimeout(r, 40)) }
})
const liste = () => p.evaluate(async () => { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('classe', { create: true }), o = []; for await (const [n, h] of d.entries()) if (h.kind === 'file' && n.endsWith('.mem')) o.push(n); return o })
const etat = () => p.textContent('.p-etat')
await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]')

appelsGoogle = 0 // (le chargement de la page peut préparer Google ; Publier, lui, n'y touche pas)
// A. dossier choisi, nom
await p.check('input[name="p-lieu"][value="dossier"]')
ok(await p.isVisible('.p-nomfichier'), 'A1) Le nom du fichier est proposé')
// L'OPFS de l'environnement d'essai refuse les noms accentués (« Séance du… ») :
// un titre sans accent, qui sera le nom du fichier écrit en résumé (G)
await p.fill('.p-titre', 'Equations')
await p.fill('.p-nomfichier', 'Equations Essai')
await p.click('.p-choisir'); await p.waitForTimeout(300)
ok(!/aucun dossier/.test(await p.textContent('.p-chemin')), 'A2) Le dossier choisi s\'affiche', await p.textContent('.p-chemin'))
await p.click('.p-publier')
await p.waitForFunction(() => /En attente de Google Drive/.test(document.querySelector('.p-etat').textContent), null, { timeout: 15000 })
let fichiers = await liste()
const m = fichiers[0]?.match(/^Equations Essai \[([a-z0-9]{8})\]\.mem$/)
ok(fichiers.length === 1 && !!m, 'A3) Le fichier « Titre [code].mem » est écrit', fichiers)
const lien = await p.inputValue('.p-lien')
ok(m && lien.includes('code=' + m[1]) && /[?&]r=/.test(lien), 'A4) Le lien porte le code', lien)
ok(await p.isVisible('.p-ouvrir-pronote') && /Tester le lien/.test(await p.textContent('.p-ouvrir')), 'A5) « Copier et ouvrir Pronote » et « Tester le lien »')
// B. le fichier arrive
arrive = true
await p.waitForFunction(() => /Le replay est en ligne/.test(document.querySelector('.p-etat').textContent), null, { timeout: 20000 })
ok(true, 'B1) « ✓ Le replay est en ligne » une fois arrivé')
// C. republier sous un autre nom
await p.fill('.p-nomfichier', 'Equations Final')
await p.click('.p-publier')
await p.waitForFunction(async () => { const d = await (await navigator.storage.getDirectory()).getDirectoryHandle('classe', { create: true }); for await (const [n] of d.entries()) if (n.startsWith('Equations Final')) return true; return false }, null, { timeout: 15000 })
await p.waitForTimeout(800)
fichiers = await liste()
ok(fichiers.length === 1 && fichiers[0] === `Equations Final [${m?.[1]}].mem`, 'C1) Republier garde le même code, un seul fichier', fichiers)
ok(await p.inputValue('.p-lien') === lien, 'C2) Le lien ne change pas')
// D. relais pas à jour
version = 3
await p.check('.p-nouveau').catch(() => {})
await p.click('.p-publier')
await p.waitForFunction(() => /pas à jour/.test(document.querySelector('.p-etat').textContent), null, { timeout: 15000 })
ok(true, 'D1) Un relais pas à jour est signalé')
fichiers = await liste()
ok(fichiers.length === 1, 'D2) Rien n\'est écrit avant', fichiers)
// E
ok(appelsGoogle === 0, 'E1) Aucun appel à l\'API de Google', appelsGoogle)
// G. Publier en un clic : tout est retenu, la fenêtre s'ouvre en résumé
version = 4
const rouvrir = async (resume = true) => {
  await p.keyboard.press('Escape'); await p.waitForSelector('.dialogue-publier[open]', { state: 'detached' })
  await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector(resume ? '.dialogue-publier.resume[open]' : '.dialogue-publier[open]')
}
await rouvrir(false)
ok(await p.isVisible('.dialogue-publier.resume[open]'), 'G1) La fenêtre s\'ouvre en résumé')
const resumeSeance = await p.textContent('.p-resume-seance'), resumeLieu = await p.textContent('.p-resume-lieu')
ok(/^Séance du .+ · 1 page$/.test(resumeSeance), 'G2) La séance et ses pages', resumeSeance)
ok(/Rangé dans « .+ » · Drive personnel/.test(resumeLieu), 'G3) Le dossier et le Drive', resumeLieu)
ok(!await p.isVisible('.p-seance') && !await p.isVisible('.p-choisir') && !await p.isVisible('.p-fichier') && await p.isVisible('.p-apercu') && await p.isVisible('.p-verifier'), 'G4) La séance, « Choisir… » et « Enregistrer le fichier » sont repliés ; « Voir comme un élève » et les vérifications restent')
const focus = await p.evaluate(() => document.activeElement?.className ?? '')
ok(/p-publier/.test(focus), 'G5) Le focus est sur Publier', focus)
const tient = await p.evaluate(() => { const d = document.querySelector('.dialogue-publier'); return { scroll: d.scrollHeight, client: d.clientHeight, fenetre: innerHeight } })
ok(tient.scroll <= tient.client, 'G6) La fenêtre en résumé tient sans défiler (1280 × 900 ici)', tient)
await p.click('.p-publier')
await p.waitForFunction(() => /Le replay est en ligne/.test(document.querySelector('.p-etat').textContent), null, { timeout: 20000 })
fichiers = await liste()
ok(fichiers.length === 1 && fichiers[0] === `Equations [${m?.[1]}].mem`, 'G7) Publier réécrit le fichier sous le même code, au nom du titre', fichiers)
ok(await p.inputValue('.p-lien') === lien, 'G8) Le lien ne change pas')
// H. « Modifier… » déplie
await rouvrir()
await p.click('.p-modifier'); await p.waitForTimeout(100)
ok(!await p.isVisible('.dialogue-publier.resume') && await p.isVisible('.p-choisir') && await p.isVisible('.p-seance'), 'H1) « Modifier… » remontre la séance et « Choisir… »')
ok(await p.isVisible('.p-lieu') && (await p.isVisible('.p-drive-retenu') || await p.isVisible('.p-comptes')), 'H2) « Où ranger » et le Drive sont revenus')
ok(!await p.isVisible('.p-resume') && await p.isVisible('.p-fichier'), 'H3) Le résumé est caché, « Enregistrer le fichier » revient')
// I. l'accord du dossier perdu
await p.evaluate(() => { window.FileSystemHandle.prototype.requestPermission = async () => 'denied' })
await rouvrir()
const avantI = await liste()
await p.click('.p-publier')
await p.waitForFunction(() => /Choisir…/.test(document.querySelector('.p-etat').textContent), null, { timeout: 15000 })
ok(!await p.isVisible('.dialogue-publier.resume') && await p.isVisible('.p-choisir'), 'I1) L\'accord refusé : la fenêtre se déplie')
ok(/n'est plus accessible/.test(await etat()), 'I2) Le message dit de choisir le dossier à nouveau', await etat())
ok(JSON.stringify(await liste()) === JSON.stringify(avantI), 'I3) Rien n\'est écrit', await liste())
ok(erreurs.length === 0, 'F) Aucune erreur de page', erreurs)
await b.close()
console.log(echecs ? `\n${echecs} échec(s)` : '\nTout passe')
process.exit(echecs ? 1 : 0)
