// Les fonctions des lots 1 à 3 dans un classeur qui n'est PAS le premier
// (créé comme le fait la bibliothèque) : dessin à la souris, annulation par
// page, pages, session après rechargement, nom de page, corbeille de pages,
// copie de page, Ctrl + S (téléchargement), revue, export PDF, retour au
// premier et retour à B, rien ne passe d'un classeur à l'autre.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { gunzipSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
const DEV = process.argv[2] || 'http://localhost:5173/'
const dort = ms => new Promise(r => setTimeout(r, ms))
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? 'OK   ' : 'ÉCHEC', m, !c && d !== undefined ? '— ' + JSON.stringify(d).slice(0, 800) : '') }
const nav = await chromium.launch({ env: { ...process.env, LANG: 'C.UTF-8', LC_ALL: 'C.UTF-8' } })
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
await ctx.addInitScript(() => { try { delete window.showSaveFilePicker; delete window.showOpenFilePicker; delete Window.prototype.showSaveFilePicker; delete Window.prototype.showOpenFilePicker } catch {} ; window.showSaveFilePicker = undefined })
const erreurs = []
const suivre = p => { p.on('pageerror', e => erreurs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_CERT|net::/.test(m.text())) erreurs.push(m.text()) }) }
const pret = p => p.waitForFunction(() => window.__surveillance && window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 })
let p = await ctx.newPage(); suivre(p)
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
const premier = await p.evaluate(() => window.__app.classeur.id)
// Le premier : un trait rouge (pour voir qu'il ne passe pas dans B)
await p.evaluate(async () => {
  const t = window.__app.tableau
  t.nouveauGeste(); t.poser(window.__app.page, { id: 'ROUGE', type: 'trait', x: 50, y: 50, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 50, 50, 0.5], couleur: '#c24a4a', taille: 4, opacite: 1, pression: false })
  await t.attendreEcritures()
})
const B = await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts'), neuf = await import('/src/classeurs/neuf.ts')
  const etat = await neuf.etatNeuf('carreaux'), T = Date.now()
  const id = dem.idClasseur()
  const fiche = { id, base: dem.baseDe(id), nom: 'Symétrie centrale', dossier: null, etiquettes: [], cree: T, modifie: T, ouvert: 0, pages: 1 }
  await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
  return id
})
await p.goto(DEV + '?classeur=' + B); await pret(p); await p.waitForTimeout(800)
ok(await p.evaluate(() => window.__app.classeur.nom) === 'Symétrie centrale' && await p.evaluate(() => window.__app.tableau.base.startsWith('mem-teachingtool-classeur-')), 'B ouvert (sa base à lui)')
ok(await p.evaluate(() => [...window.__app.tableau.formesDe(window.__app.page).keys()].length) === 0, 'B ne contient pas le trait du premier')
await p.evaluate(() => window.__app.choisirOutil('stylo'))
const zone = await p.locator('#zone').boundingBox()
const trait = async (x, y) => { await p.mouse.move(zone.x + x, zone.y + y); await p.mouse.down(); for (let i = 1; i <= 15; i++) { await p.mouse.move(zone.x + x + i * 8, zone.y + y + Math.sin(i / 2) * 14); await dort(10) } await p.mouse.up(); await dort(250) }
await trait(300, 300); await trait(300, 380); await trait(300, 460)
const n1 = () => p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
ok(await n1() === 3, 'trois traits à la souris', await n1())
await p.keyboard.press('Control+z'); await dort(300)
ok(await n1() === 2, 'Ctrl + Z : deux', await n1())
await p.keyboard.press('Control+y'); await dort(300)
ok(await n1() === 3, 'Ctrl + Y : trois', await n1())
const page1 = await p.evaluate(() => window.__app.page)
await p.evaluate(() => window.__app.nouvellePage()); await dort(400)
const page2 = await p.evaluate(() => window.__app.page)
await trait(500, 300)
ok(page2 !== page1 && await n1() === 1, 'page 2 : un trait')
await p.evaluate(id => window.__app.allerPage(id), page1); await dort(400)
await p.keyboard.press('Control+z'); await dort(300)
ok(await n1() === 2 && await p.evaluate(id => window.__app.tableau.formesDe(id).size, page2) === 1, 'annulation par page : Ctrl + Z sur la page 1 ne touche pas la page 2')
await p.keyboard.press('Control+y'); await dort(300)
// le nom de la page 2, la session
await p.evaluate(id => window.__app.tableau.renommerPage(id, 'Exercice 12'), page2)
await p.evaluate(id => window.__app.allerPage(id), page2); await dort(1500)
await p.reload(); await pret(p); await p.waitForTimeout(800)
ok(await p.evaluate(() => window.__app.classeur.id) === B && new URL(p.url()).searchParams.get('classeur') === B, 'rechargé : toujours B (l\'adresse)')
ok(await p.evaluate(() => window.__app.page) === page2, 'rechargé : la page qu\'on regardait (la session de B)', await p.evaluate(() => window.__app.page))
ok(await p.evaluate(() => document.querySelector('.rang')?.textContent || '').then(t => t.includes('Exercice 12')), 'le nom de la page dans le compteur', await p.evaluate(() => document.querySelector('.rang')?.textContent))
// corbeille de pages : supprimer la page 2 puis la remettre
await p.evaluate(() => window.__app.supprimerPage()); await dort(500)
ok(await p.evaluate(() => window.__app.pages.length) === 1 && await p.evaluate(() => window.__app.tableau.pagesDeLaCorbeille().length) === 1, 'page 2 dans la corbeille des pages')
await p.evaluate(id => window.__app.tableau.remettrePage(id), page2); await dort(400)
ok(await p.evaluate(() => window.__app.pages.length) === 2, 'remise')
// copie de page
await p.evaluate(id => window.__app.allerPage(id), page1); await dort(300)
await p.evaluate(() => window.__app.dupliquerLaPage()); await dort(500)
ok(await p.evaluate(() => window.__app.pages.length) === 3 && await p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size) === 3, 'page 1 dupliquée (3 traits)')
// Ctrl + S : téléchargement
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 20000 }), p.keyboard.press('Control+s')])
const nom = dl.suggestedFilename()
ok(/^Symétrie centrale \d{4}-\d\d-\d\d \d\dh\d\d\.memc$/.test(nom), 'Ctrl + S : « ' + nom + ' »')
const chemin = `${RACINE_ESSAIS}/lot4/verif/regressions/B.memc`
await dl.saveAs(chemin)
const octets = readFileSync(chemin), fin = octets.indexOf(10)
const entete = JSON.parse(octets.subarray(0, fin).toString())
ok(entete.format === 'mem-tableau' && entete.v === 1 && entete.pages === 3 && entete.id === B && entete.nom === 'Symétrie centrale', 'son en-tête', entete)
gunzipSync(octets.subarray(fin + 1))
await dort(800)
const ligne = await p.evaluate(() => window.__surveillance.texte.lignes.find(l => l.quoi === 'fichier')?.texte)
ok(/fichier/i.test(ligne || '') && !/Jamais/.test(ligne || ''), 'l\'état dit le fichier : ' + ligne)
// la revue
await p.evaluate(() => document.querySelector('button[title^="Revoir la construction"]')?.click()); await dort(1500)
const revue = await p.evaluate(() => ({ ouvert: !document.querySelector('.revue').hidden, texte: document.querySelector('.revue-bandeau')?.textContent || document.querySelector('.revue')?.textContent?.slice(0, 200) }))
ok(revue.ouvert, 'la revue s\'ouvre : ' + (revue.texte || '').slice(0, 120))
await p.keyboard.press('Escape'); await dort(800)
// Export PDF de tout le classeur
await p.evaluate(() => window.__app.ui.exporterPdf('tout')); await dort(600)
const [pdf] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.evaluate(() => document.querySelector('dialog.dialogue-pdf[open] button.principal')?.click())])
ok(/^Symétrie centrale \d{4}-\d\d-\d\d\.pdf$/.test(pdf.suggestedFilename()), 'PDF : ' + pdf.suggestedFilename())
// vers le premier, puis retour à B
await p.goto(DEV + '?classeur=' + premier); await pret(p); await p.waitForTimeout(800)
const pr = await p.evaluate(() => ({ id: window.__app.classeur.id, formes: [...window.__app.tableau.formesDe(window.__app.page).keys()], pages: window.__app.pages.length, base: window.__app.tableau.base }))
ok(pr.id === premier && pr.base === 'mem-tableau-local' && pr.pages === 1 && pr.formes.length === 1 && pr.formes[0] === 'ROUGE', 'le premier : intact, rien de B', pr)
ok(await p.evaluate(() => window.__app.peutAnnuler()) === false, 'le premier : rien à annuler (pas la pile de B)')
await p.goto(DEV + '?classeur=' + B); await pret(p); await p.waitForTimeout(800)
const b2 = await p.evaluate(() => ({ pages: window.__app.pages.length, n: window.__app.pages.map(id => window.__app.tableau.formesDe(id).size) }))
ok(b2.pages === 3 && b2.n.join() === '3,3,1', 'B : intact', b2)
// la session du premier : pas celle de B
const sessions = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('mem-session')))
ok(sessions.includes('mem-session') && sessions.includes('mem-session:' + B), 'deux sessions : mem-session et mem-session:<B>', sessions)
console.log('erreurs JS :', erreurs)
ok(!erreurs.length, 'aucune erreur JS')
await nav.close()
console.log(echecs ? `${echecs} ÉCHEC(S)` : 'Tout est vert.')
