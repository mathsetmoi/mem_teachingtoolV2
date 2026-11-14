// ESSAI DU LOT 26 : trois petits outils de classe.
// A. Touches 1, 2, 3 : le trait fin, moyen, épais de l'outil en main (le
//    Surligneur garde le sien), une bulle le dit ; Maj + 1 reste « tout voir ».
// B. Publier dans un dossier : un petit QR à côté du lien ; « Afficher le QR
//    en grand » ouvre le QR par-dessus la fenêtre, Échap le ferme et Publier
//    reste ouverte.
// C. « Fiche pour un élève absent… » : un PDF (une page de garde, puis la
//    page de la séance), et le message pour l'ENT copié, avec le lien.
// D. Rouverte, la fenêtre (complète) propose « Cette séance a déjà un lien » :
//    le QR en grand et la fiche, sans republier.
import { chromium } from '../commun/playwright.mjs'

const DEV = 'http://localhost:5173/'
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const erreurs = []
// Un nom de fichier accentué (« Séance du… ») : sans langue UTF-8, Chromium le
// remplace par « download »
const b = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, permissions: ['clipboard-read', 'clipboard-write'] })
const p = await ctx.newPage()
p.on('pageerror', e => erreurs.push(e.message))

let arrive = false
await ctx.route(/accounts\.google\.com|www\.googleapis\.com/, r => r.fulfill({ status: 404, body: '{}' }))
await ctx.route(/script\.google\.com\/macros/, async r => {
  const u = new URL(r.request().url())
  const rep = o => r.fulfill({ contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: typeof o === 'string' ? o : JSON.stringify(o) })
  if (u.searchParams.get('ping')) return rep({ relais: 'MEM Replay', version: 4, pret: true })
  const code = u.searchParams.get('code')
  if (!arrive || !code) return rep({ erreur: 'Séance introuvable ou pas encore arrivée sur le Drive.' })
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
// Le réglage « replay-dossier:… » reste en mémoire (voir lot15/P1)
await p.evaluate(() => {
  const r = window.__registre, memoire = new Map()
  const lire = r.reglage.bind(r), ecrire = r.ecrireReglage.bind(r)
  r.reglage = cle => memoire.has(cle) ? Promise.resolve(memoire.get(cle)) : lire(cle)
  r.ecrireReglage = (cle, v) => { if (cle.startsWith('replay-dossier:')) { memoire.set(cle, v); return Promise.resolve() } return ecrire(cle, v) }
})

// A. Les touches
const taille = () => p.evaluate(() => window.__app.tailleEnMain())
await p.mouse.move(640, 450)
ok(await taille() === 2.5, 'A1) Le trait part fin', await taille())
await p.keyboard.press('Digit2'); await p.waitForTimeout(100)
ok(await taille() === 4.5, 'A2) 2 : le trait moyen', await taille())
ok(/Trait moyen/.test(await p.textContent('body')), 'A3) Une bulle le dit')
ok(await p.getAttribute('[data-taille]', 'data-taille') === 'Moyen', 'A4) Le bouton d\'épaisseur le montre', await p.getAttribute('[data-taille]', 'data-taille'))
await p.keyboard.press('Digit3'); await p.waitForTimeout(50)
ok(await taille() === 9, 'A5) 3 : le trait épais', await taille())
// Le pavé numérique (Playwright l'envoie verrouillé : « Fin ») : l'événement tel que le donne un pavé qui donne des chiffres
const pave = (code, key) => p.evaluate(([code, key]) => (document.activeElement ?? document.body).dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true })), [code, key])
await pave('Numpad1', '1'); await p.waitForTimeout(50)
ok(await taille() === 2.5, 'A6) 1 du pavé numérique : le trait fin', await taille())
await p.keyboard.press('h'); await p.waitForTimeout(50)
const surl = await taille()
await p.keyboard.press('Digit1'); await p.waitForTimeout(50)
ok(surl === 4.5 && await taille() === 2.5, 'A7) Au Surligneur, la touche règle le sien', { surl, apres: await taille() })
await p.keyboard.press('p'); await p.waitForTimeout(50)
ok(await taille() === 2.5, 'A8) Le Stylo a gardé le sien', await taille())
await p.keyboard.press('Shift+Digit1'); await p.waitForTimeout(50)
ok(await taille() === 2.5, 'A9) Maj + 1 ne change pas l\'épaisseur', await taille())

// Une page écrite, pour la séance
await p.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5)
  for (let i = 0; i < 3; i++) { t.poser(a.page, { id: 'T' + i + Math.random().toString(36).slice(2), type: 'trait', x: 100 + i * 40, y: 100 + i * 50, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }); await new Promise(r => setTimeout(r, 40)) }
})

// B. Publier, le QR
await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]')
ok(!await p.isVisible('.p-deja'), 'B0) Pas encore publiée : pas de « déjà un lien »')
await p.check('input[name="p-lieu"][value="dossier"]')
await p.fill('.p-titre', 'Equations')
await p.fill('.p-nomfichier', 'Equations Essai')
await p.click('.p-choisir'); await p.waitForTimeout(300)
arrive = true
await p.click('.p-publier')
await p.waitForSelector('.p-resultat:not([hidden])', { timeout: 15000 })
const lien = await p.inputValue('.p-lien')
ok(/code=/.test(lien), 'B1) Le lien porte le code', lien)
ok(await p.isVisible('.p-qr svg'), 'B2) Un petit QR à côté du lien')
await p.click('.p-qr-grand')
await p.waitForSelector('dialog.qr-en-grand[open]')
const grand = await p.evaluate(() => { const s = document.querySelector('dialog.qr-en-grand svg').getBoundingClientRect(); return { l: s.width, titre: document.querySelector('.qr-titre').textContent } })
ok(grand.l >= 400, 'B3) Le QR en grand (au moins 400 px à 1280 × 900)', grand)
ok(/^Revoir la séance du /.test(grand.titre), 'B4) Il dit quelle séance', grand.titre)
await p.keyboard.press('Escape'); await p.waitForTimeout(150)
ok(!await p.$('dialog.qr-en-grand') && await p.isVisible('.dialogue-publier[open]'), 'B5) Échap le ferme ; Publier reste ouverte')

// C. La fiche
const attente = p.waitForEvent('download', { timeout: 30000 })
await p.click('.p-fiche')
const telecharge = await attente
const nom = telecharge.suggestedFilename()
ok(/^Séance du .+\.pdf$/.test(nom), 'C1) Le PDF a le nom de la séance', nom)
const chemin = await telecharge.path()
const { readFileSync } = await import('node:fs')
const pdf = readFileSync(chemin).toString('latin1')
const feuilles = (pdf.match(/\/Type\s*\/Page\b/g) ?? []).length
ok(pdf.startsWith('%PDF') && feuilles === 2, 'C2) Deux feuilles : la page de garde et la page de la séance', feuilles)
await p.waitForFunction(() => /Fiche téléchargée/.test(document.querySelector('.p-etat').textContent), null, { timeout: 10000 })
const copie = await p.evaluate(() => navigator.clipboard.readText())
ok(/^Bonjour,/.test(copie) && copie.includes(lien) && /PDF joint/.test(copie), 'C3) Le message pour l\'ENT est copié, avec le lien', copie)

// D. Rouverte : « Cette séance a déjà un lien »
await p.keyboard.press('Escape'); await p.waitForSelector('.dialogue-publier[open]', { state: 'detached' })
await p.click('button[title="Publier le replay pour les élèves"]'); await p.waitForSelector('.dialogue-publier[open]')
if (await p.isVisible('.p-modifier')) await p.click('.p-modifier')
await p.waitForTimeout(150)
ok(await p.isVisible('.p-deja') && await p.isHidden('.p-resultat'), 'D1) Rouverte : « Cette séance a déjà un lien »')
await p.click('.p-deja-qr'); await p.waitForSelector('dialog.qr-en-grand[open]')
ok(true, 'D2) Son QR en grand, sans republier')
await p.mouse.click(30, 30); await p.waitForTimeout(150)
ok(!await p.$('dialog.qr-en-grand'), 'D3) Un clic le ferme')

ok(!erreurs.length, 'Z) Aucune erreur dans la page', erreurs)
await b.close()
console.log(echecs ? `${echecs} échec(s)` : 'Tout est bon.')
process.exit(echecs ? 1 : 0)
