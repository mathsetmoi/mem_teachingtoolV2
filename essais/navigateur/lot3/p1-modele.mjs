// Essais au navigateur du morceau P1 du lot 3 (le modèle des pages, rien de
// visible) : dans l'application réelle, la poubelle écrit l'entrée de la
// corbeille avec le retrait (étape seulOrdre), « Annuler » et Ctrl+Z la
// rendent et l'effacent ; les noms, la copie avec son histoire et la
// corbeille survivent au rechargement (IndexedDB) et au fichier .memc
// (Enregistrer, puis Ouvrir dans un autre navigateur) ; la revue s'ouvre et
// range la page supprimée définitivement sous « Pages jetées ».
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot3/p1/navigateur`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + detail : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
  page.on('pageerror', e => erreurs.push(`${nom}: ${e.message}`))
}
const nav = await chromium.launch()
// Lot 4 (C4) : « Ouvrir un classeur » (Ctrl + O) passe par showOpenFilePicker
// quand il existe, que Chromium sans fenêtre refuse (AbortError, même quand
// Playwright attend le choix de fichier) : cet essai ouvre ses fichiers par
// le choix de fichier d'avant, celui de Firefox, Safari et l'iPad
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { window.showOpenFilePicker = undefined }); return c } }
// Lot 4 (C9) : « Ouvrir un classeur » AJOUTE d'abord le classeur d'un fichier à la bibliothèque
// (une première fenêtre : [Annuler] [Remplacer « … »…] [Ajouter à la bibliothèque]). Ces essais
// remplacent celui qui est ouvert : on y choisit « Remplacer « … »… », et la question du lot 1,
// celle qu'ils vérifient, suit (adaptation de C9 : un comportement changé volontairement)
{ const nc = nav.newContext.bind(nav); nav.newContext = async (...a) => { const c = await nc(...a); await c.addInitScript(() => { new MutationObserver(() => { const b = document.querySelector('dialog[open] [data-a="remplacer-ouvert"]'); if (b) b.click() }).observe(document, { childList: true, subtree: true }) }); return c } }

async function pret(page) {
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(400)
}
async function ouvrir(nom) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await pret(page)
  return { ctx, page }
}

const JETER = '.barre-haut button[aria-label="Supprimer cette page"]'
const ETAT = () => {
  const a = window.__app, t = a.tableau
  const f = t.film.get(t.film.length - 1)
  return {
    page: a.page, pages: a.pages, rang: document.querySelector('.rang').textContent,
    corbeille: t.etatDesPages().corbeille, noms: t.etatDesPages().noms,
    dans: t.pagesDeLaCorbeille().map(x => x.id), film: t.film.length,
    derniere: { page: f.page, seulOrdre: !!f.seulOrdre },
    annuler: !document.querySelector('button[aria-label^="Annuler sur cette page"]').disabled,
  }
}
const etat = page => page.evaluate(ETAT)
const toast = page => page.evaluate(() => [...document.querySelector('.toast').children].map(l => l.textContent).join(' | '))
async function jeter(page) { await page.waitForTimeout(650); await page.click(JETER); await page.waitForTimeout(200) }

// =============== 1. La poubelle, « Annuler », Ctrl+Z : l'entrée de la corbeille ===============
const { ctx, page } = await ouvrir('tableau')
await page.evaluate(() => { window.__app.reconnaissance = false })
const [p1, p2, p3] = await page.evaluate(async () => {
  const a = window.__app, t = a.tableau, pause = ms => new Promise(r => setTimeout(r, ms))
  const poser = (id, x, y) => { t.nouveauGeste(); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 60, 10, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }
  const p1 = a.page; poser('a1', 100, 100); await pause(40); poser('a2', 100, 160); await pause(40)
  a.nouvellePage(); const p2 = a.page; poser('b1', 200, 200); await pause(40); a.changerFond('seyes'); await pause(40)
  a.nouvellePage(); const p3 = a.page; poser('c1', 150, 150); await pause(40)
  return [p1, p2, p3]
})
let film = (await etat(page)).film
const renomme = await page.evaluate(p => window.__app.tableau.renommerPage(p, '  Exercice 12\tp. 84 '), p1)
await page.waitForTimeout(100)
let e = await etat(page)
verifier('Renommer une page : le nom est mis au propre, aucune étape du film', renomme && e.noms[p1] === 'Exercice 12 p. 84' && e.film === film, JSON.stringify(e))

await page.evaluate(p => window.__app.allerPage(p), p2); await page.waitForTimeout(100)
await jeter(page)
e = await etat(page)
verifier('La poubelle : la page part, son entrée de corbeille dit sa voisine et sa place', JSON.stringify(e.pages) === JSON.stringify([p1, p3]) && e.corbeille[p2]?.apres === p1 && e.corbeille[p2]?.index === 1 && typeof e.corbeille[p2]?.t === 'number', JSON.stringify(e))
verifier('… l\'étape du film reste « seulOrdre », notée sur la page d\'arrivée', e.derniere.page === p1 && e.derniere.seulOrdre, JSON.stringify(e.derniere))
verifier('… elle est dans la corbeille ; « Page 2 supprimée » ; ↶ allumé', JSON.stringify(e.dans) === JSON.stringify([p2]) && (await toast(page)).includes('Page 2 supprimée') && e.annuler, JSON.stringify(e))
await page.click('.toast.visible button.action'); await page.waitForTimeout(200)
e = await etat(page)
verifier('« Annuler » : la page revient 2e, son entrée s\'efface, étape seulOrdre sur elle', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && e.page === p2 && !e.corbeille[p2] && e.dans.length === 0 && e.derniere.page === p2 && e.derniere.seulOrdre, JSON.stringify(e))
await jeter(page)
await page.keyboard.press('Control+z'); await page.waitForTimeout(200)
e = await etat(page)
verifier('Ctrl+Z juste après la poubelle : la page revient, son entrée s\'efface', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && e.page === p2 && !e.corbeille[p2] && e.rang === '2 / 3', JSON.stringify(e))

// La page 3 jetée pour de bon ; une copie de la page 1 ; la page 2 supprimée définitivement
await page.evaluate(p => window.__app.allerPage(p), p3); await page.waitForTimeout(100)
await jeter(page)
const q = await page.evaluate(async ps => {
  const a = window.__app, t = a.tableau, pause = ms => new Promise(r => setTimeout(r, ms))
  a.allerPage(ps[0]); await pause(60)
  const q = t.dupliquerPage(ps[0]); await pause(60)
  return q
}, [p1, p2, p3])
e = await etat(page)
// (lot 3, P3 : le compteur montre maintenant le nom de la page après son numéro)
verifier('Dupliquer la page 1 (document) : la copie juste après, nommée « … (copie) », étape notée sur elle', JSON.stringify(e.pages) === JSON.stringify([p1, q, p2]) && e.noms[q] === 'Exercice 12 p. 84 (copie)' && e.derniere.page === q && !e.derniere.seulOrdre && e.rang === '1 / 3 · Exercice 12 p. 84', JSON.stringify(e))
const copie = await page.evaluate(([p, q]) => { const t = window.__app.tableau; return { herite: t.herite(q), ids: [...t.formesDe(q).keys()].sort(), egal: JSON.stringify(t.formesDe(q).get('a1')) === JSON.stringify(t.formesDe(p).get('a1')), distinct: t.formesDe(q).get('a1') !== t.formesDe(p).get('a1'), pile: t.annulationDe(q).undoStack.length } }, [p1, q])
verifier('… mêmes identifiants, contenus égaux, objets distincts, herite, pile vide', copie.herite === p1 && JSON.stringify(copie.ids) === '["a1","a2"]' && copie.egal && copie.distinct && copie.pile === 0, JSON.stringify(copie))
const definitives = await page.evaluate(p => { const t = window.__app.tableau; t.jeterPages([p]); return t.supprimerDefinitivement([p]) }, p2)
await page.waitForTimeout(150)
e = await etat(page)
verifier('Supprimer définitivement (document) : marquée, hors de la corbeille, toujours dans le document', definitives === 1 && e.corbeille[p2]?.definitif === true && JSON.stringify(e.dans) === JSON.stringify([p3]) && await page.evaluate(p => window.__app.tableau.pages.has(p), p2), JSON.stringify(e))

// La revue s'ouvre et range les deux pages parties sous « Pages jetées »
const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
async function lireTiroir(p) {
  await p.click('button[title^="Revoir la construction"]'); await p.waitForTimeout(250)
  await p.getByRole('button', { name: /^Que revoir/ }).click(); await p.waitForTimeout(150)
  const t = await p.evaluate(TIROIR)
  for (let i = 0; i < 4 && await p.evaluate(() => window.__app.enLecture); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
  return t
}
let tiroir = await lireTiroir(page)
let jetees = tiroir.find(s => s.h === 'Pages jetées')
verifier('Revue : « Pages jetées » montre la page de la corbeille et la page définitive, avec leur histoire', jetees && jetees.lignes.length === 2 && jetees.lignes.every(l => /· \d+ gestes?$/.test(l)), JSON.stringify(tiroir))

// =============== 2. Après un rechargement ===============
await page.reload()
await pret(page)
e = await etat(page)
const apres = await page.evaluate(([p, q]) => { const t = window.__app.tableau; return { herite: t.herite(q), nom: t.nomDe(p), nomQ: t.nomDe(q), liste: t.pagesDeLaCorbeille() } }, [p1, q])
verifier('Rechargé : l\'ordre, les noms, la copie (herite) sont gardés', JSON.stringify(e.pages) === JSON.stringify([p1, q]) && apres.nom === 'Exercice 12 p. 84' && apres.nomQ === 'Exercice 12 p. 84 (copie)' && apres.herite === p1, JSON.stringify({ e, apres }))
verifier('… la corbeille aussi : la page 3 (avec son heure), la 2 définitive', apres.liste.length === 1 && apres.liste[0].id === p3 && typeof apres.liste[0].t === 'number' && !apres.liste[0].ancienne && e.corbeille[p2]?.definitif === true, JSON.stringify(apres))
const place = await page.evaluate(p => window.__app.tableau.remettrePage(p), p3)
await page.waitForTimeout(200)
e = await etat(page)
// p3 suivait p2 (définitive) ; p2 suivait la copie : p3 revient après la copie
verifier('Remettre la page 3 après le rechargement : après la copie (sa voisine définitive est sautée) ; l\'application la compte', place === 2 && JSON.stringify(e.pages) === JSON.stringify([p1, q, p3]) && /^\d+ \/ 3( · |$)/.test(e.rang) && !e.corbeille[p3] && e.derniere.page === p3 && e.derniere.seulOrdre, JSON.stringify(e))
verifier('… une page définitive ne revient pas', await page.evaluate(p => window.__app.tableau.remettrePage(p) === -1 && window.__app.tableau.rendrePage(p) === -1, p2))

// =============== 3. Le fichier .memc ===============
await page.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined })
const attente = page.waitForEvent('download')
await page.keyboard.press('Control+s')
const dl = await attente
const fichier = D + '/' + dl.suggestedFilename()
await dl.saveAs(fichier)
const octets = readFileSync(fichier)
const entete = JSON.parse(octets.subarray(0, octets.indexOf(0x0a)).toString('utf8'))
verifier('.memc : toujours la version 1, l\'en-tête compte les pages de l\'ordre (3)', entete.v === 1 && entete.pages === 3 && entete.format === 'mem-tableau', JSON.stringify(entete))
await ctx.close()

const B = await ouvrir('ouvert')
const fc = B.page.waitForEvent('filechooser', { timeout: 3000 })
await B.page.keyboard.press('Control+o')
await (await fc).setFiles(fichier)
await B.page.waitForSelector('dialog[open] [data-a="remplacer"]')
await Promise.all([B.page.waitForEvent('load'), B.page.click('dialog[open] [data-a="remplacer"]')])
await pret(B.page)
e = await etat(B.page)
const ouvert = await B.page.evaluate(([p, q]) => { const t = window.__app.tableau; return { herite: t.herite(q), nom: t.nomDe(p), nomQ: t.nomDe(q), ids: [...t.formesDe(q).keys()].sort() } }, [p1, q])
verifier('.memc rouvert ailleurs : l\'ordre, les noms, la copie et son héritage', JSON.stringify(e.pages) === JSON.stringify([p1, q, p3]) && ouvert.nom === 'Exercice 12 p. 84' && ouvert.nomQ === 'Exercice 12 p. 84 (copie)' && ouvert.herite === p1 && JSON.stringify(ouvert.ids) === '["a1","a2"]', JSON.stringify({ e, ouvert }))
verifier('… la corbeille : la page 2 définitive, rien d\'autre à reprendre', e.corbeille[p2]?.definitif === true && e.dans.length === 0, JSON.stringify(e))
tiroir = await lireTiroir(B.page)
jetees = tiroir.find(s => s.h === 'Pages jetées')
verifier('… sa revue range la page définitive sous « Pages jetées », avec son histoire', jetees && jetees.lignes.length === 1 && /· \d+ gestes?$/.test(jetees.lignes[0]), JSON.stringify(tiroir))
// Jeter dans ce tableau rouvert : la poubelle et Ctrl+Z marchent comme avant
await B.page.evaluate(p => window.__app.allerPage(p), q); await B.page.waitForTimeout(100)
await jeter(B.page)
e = await etat(B.page)
verifier('Dans le tableau rouvert, la poubelle met la copie dans la corbeille', JSON.stringify(e.pages) === JSON.stringify([p1, p3]) && JSON.stringify(e.dans) === JSON.stringify([q]) && e.corbeille[q]?.apres === p1, JSON.stringify(e))
await B.page.keyboard.press('Control+z'); await B.page.waitForTimeout(200)
e = await etat(B.page)
verifier('… et Ctrl+Z la rend', JSON.stringify(e.pages) === JSON.stringify([p1, q, p3]) && e.page === q && e.dans.length === 0, JSON.stringify(e))
await B.ctx.close()

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
