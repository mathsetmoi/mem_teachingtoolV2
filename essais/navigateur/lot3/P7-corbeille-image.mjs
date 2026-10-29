// Essais au navigateur du morceau P7 du lot 3 : la corbeille des pages (une
// vue de la trieuse), « Copier la page en image » et « Copier en image »
// (pour l'ENT et Pronote), l'écrivain de PDF (pur).
// - corbeille : deux pages supprimées (la poubelle de la barre du haut, puis
//   la trieuse), la page rechargée : la corbeille les montre avec leur date ;
//   Remettre (à sa place ; deux voisines supprimées ensemble reviennent dans
//   le bon ordre, quel que soit l'ordre des remises ; « Annuler ») ;
//   Supprimer définitivement (« Annuler » et Échap de la question ne font
//   rien ; confirmé, elle s'en va, même après un rechargement, Ctrl+Z ne la
//   rend pas, la revue la garde sous « Pages jetées ») ; Vider ; le fichier
//   .memc les emporte ; une page jetée comme au lot 2 (« avant cette
//   version », remise à la fin) ; une page effacée par l'ancienne
//   suppression n'y est pas ; la poubelle puis Ctrl+Z : la page revient et
//   sort de la corbeille ; au doigt (CDP) et au clavier (Tab, Entrée, Échap) ;
// - image : une page (traits, figures nommées, formules, une image) sur
//   carreaux puis Seyès, copiée par le menu de la page : un PNG de la taille
//   attendue (tailleImage), comparé à l'écran à 100 %, sans la règle posée ;
//   « Sans le fond » ; trois objets pris au cadre, copiés par le menu
//   complet : l'image n'a qu'eux ; sans ClipboardItem, ou la copie refusée :
//   le message et « Enregistrer l'image (.png) », qui télécharge un PNG ; le
//   menu d'une vignette ; la version en un seul fichier (file://) ;
// - PDF : un essai vitest hors du dépôt (lot3/P7/vt) écrit lot3/P7/essai.pdf,
//   lu par pdfinfo, pdfimages et pdftoppm.
// Serveur de développement sur :5173 ; dist/index.html construit (npm run
// build). Une ligne « OK … » ou « ÉCHEC … » par vérification ; code de sortie
// 1 s'il y a un échec ou une erreur JS.
// node P7-corbeille-image.mjs [section…] : seulement ces sections (corbeille,
// doigt, clavier, memc, image, repli, fichier, pdf, telephone)
// Adapté au lot 17 (la corbeille rangée par séance) : le titre « Corbeille
// du classeur », sa note, le nom du bouton « Corbeille du classeur : … », et
// sous chaque carte « Page N · séance du jour » (un classeur à une séance).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { execFileSync, execSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const S = `${RACINE_ESSAIS}`
const R = `${RACINE_DEPOT}`
const D = S + '/lot3/P7/navigateur'
mkdirSync(D, { recursive: true })
const SECTIONS = process.argv.slice(2)
const faire = s => !SECTIONS.length || SECTIONS.includes(s)
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail && !ok ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`)
}
const erreurs = []
function surveiller(page, nom) {
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(`${nom}: ${m.text()}`) })
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
/** Les espaces insécables des messages (« 2 pages », « 9 h 05 ») lus comme des espaces */
const net = t => (t ?? '').replace(/[  ]/g, ' ')

async function pret(page) {
  for (let k = 0; k < 2; k++) {
    await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(350)
  }
  await page.evaluate(() => {
    const a = window.__app, m = a.ui.message.bind(a.ui)
    window.__msgs = []
    a.ui.message = (t, x, d) => { window.__msgs.push(t); return m(t, x, d) }
    a.reconnaissance = false
  })
}
async function ouvrir(o = {}, nom = 'page', init = null) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
  if (init) await ctx.addInitScript(init)
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await pret(page)
  return { ctx, page }
}

/** n pages, un trait sur chacune (posé en son propre geste, après la
 *  création de la page : la revue y compte un geste à elle) ; noms : { indice: nom } */
const preparer = (page, n, o = {}) => page.evaluate(({ n, noms, ici }) => {
  const a = window.__app, t = a.tableau
  for (let k = 0; k < n; k++) {
    if (k) a.nouvellePage()
    t.nouveauGeste()
    const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 12, Math.sin(i / 3 + k) * 50, 0.5)
    t.poser(a.page, { id: 'w' + k, type: 'trait', x: 200, y: 260, z: Date.now(), auteur: t.moi, pts, couleur: k % 2 ? '#d64545' : '#1b2230', taille: 4, opacite: 1, pression: false })
  }
  for (const [i, nom] of Object.entries(noms || {})) t.renommerPage(a.pages[Number(i)], nom)
  a.allerPage(a.pages[ici ?? 0])
  return a.pages.slice()
}, { n, noms: o.noms, ici: o.ici })

const ETAT = () => {
  const a = window.__app, t = a.tableau
  const tr = document.querySelector('.trieuse'), co = document.querySelector('.trieuse-corbeille')
  const bc = document.querySelector('.trieuse-bouton-corbeille')
  const act = document.activeElement
  const d = document.querySelector('dialog[open]')
  return {
    trieuse: !!tr && !tr.hidden, corbeille: !!co && !co.hidden,
    page: a.page, pages: a.pages.slice(), dans: t.pagesDeLaCorbeille().map(x => x.id),
    entrees: t.etatDesPages().corbeille, noms: t.etatDesPages().noms,
    bouton: bc ? { texte: bc.textContent, nom: bc.getAttribute('aria-label') } : null,
    cartes: [...document.querySelectorAll('.trieuse-corbeille .carte-corbeille')].map(c => ({
      page: c.dataset.page, nom: c.querySelector('.corbeille-nom').textContent, date: c.querySelector('.corbeille-date').textContent,
      ou: c.querySelector('.corbeille-ou').textContent, canevas: !!c.querySelector('canvas'),
    })),
    vide: !document.querySelector('.corbeille-vide')?.hidden, vider: document.querySelector('.corbeille-vider')?.disabled ?? null,
    note: document.querySelector('.corbeille-note')?.textContent ?? '',
    titre: document.querySelector('.trieuse-corbeille h2')?.textContent ?? '',
    focus: act?.getAttribute?.('aria-label') || act?.textContent || '', focusPage: act?.dataset?.page ?? act?.closest?.('.carte-corbeille')?.dataset.page ?? null,
    question: d ? { titre: d.querySelector('h2')?.textContent, texte: d.querySelector('p')?.textContent, boutons: [...d.querySelectorAll('button')].map(b => b.textContent) } : null,
    msgs: (window.__msgs || []).slice(),
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
    rang: document.querySelector('.rang')?.textContent ?? '',
    n: a.formes.length,
  }
}
const etat = page => page.evaluate(ETAT)
const dernier = e => net(e.msgs.at(-1))
const attendreOuverte = page => page.waitForFunction(() => { const t = document.querySelector('.trieuse'); return t && !t.hidden }, null, { timeout: 3000 }).then(() => true, () => false)
const carteCorbeille = (page, id, quoi) => page.locator(`.trieuse-corbeille .carte-corbeille[data-page="${id}"] ${quoi}`)
const JETER = '.barre-haut button[aria-label="Supprimer cette page"]'
async function ouvrirCorbeille(page) {
  if (!await page.evaluate(() => !document.querySelector('.trieuse')?.hidden)) { await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200) }
  await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(250)
}
/** Le tiroir « Que revoir ? » de la revue : ses sections et leurs lignes */
async function lireTiroir(p) {
  await p.click('button[title^="Revoir la construction"]'); await p.waitForTimeout(250)
  await p.getByRole('button', { name: /^Que revoir/ }).click(); await p.waitForTimeout(150)
  const t = await p.evaluate(() => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) })))
  for (let i = 0; i < 4 && await p.evaluate(() => window.__app.enLecture); i++) { await p.keyboard.press('Escape'); await p.waitForTimeout(150) }
  return t
}

// =============== 1. La corbeille, à la souris ===============
let fichierMemc = null
if (faire('corbeille') || faire('memc')) {
  const { ctx, page } = await ouvrir({}, 'corbeille')
  const P = await preparer(page, 7, { noms: { 1: 'Exercice 12 p. 84', 4: 'Problème', 5: 'Fin de cours' }, ici: 1 })
  // La poubelle de la barre du haut : la page 2 (on arrive sur la 1)
  await page.waitForTimeout(650); await page.click(JETER); await page.waitForTimeout(300)
  // Dans la trieuse : la page 5 (« Problème »), par son menu
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(300)
  let e = await etat(page)
  verifier('Le bandeau de la trieuse : « Corbeille (1) », son nom « Corbeille du classeur : 1 page »', net(e.bouton?.texte) === 'Corbeille (1)' && net(e.bouton?.nom) === 'Corbeille du classeur : 1 page', e.bouton)
  const k5 = e.pages.indexOf(P[4])
  await page.locator('.trieuse .carte .carte-options').nth(k5).click(); await page.waitForTimeout(120)
  await page.locator('.trieuse .menu-vignette .menu-item', { hasText: 'Supprimer' }).click(); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Supprimée dans la trieuse : le bouton dit « Corbeille (2) » aussitôt', net(e.bouton?.texte) === 'Corbeille (2)' && net(e.bouton?.nom) === 'Corbeille du classeur : 2 pages', e.bouton)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  // Rechargée : la corbeille les garde
  await page.reload(); await pret(page)
  await ouvrirCorbeille(page)
  e = await etat(page)
  verifier('Après un rechargement : la vue de la corbeille montre les deux pages, la dernière supprimée d\'abord, avec leur nom',
    e.corbeille && JSON.stringify(e.cartes.map(c => c.page)) === JSON.stringify([P[4], P[1]]) && e.cartes[0].nom === 'Problème' && e.cartes[1].nom === 'Exercice 12 p. 84' && e.cartes.every(c => c.canevas), e.cartes)
  verifier('… avec leur date : « Supprimée aujourd\'hui à … »', e.cartes.every(c => /^Supprimée aujourd'hui à \d+ h \d\d$/.test(net(c.date))), e.cartes.map(c => c.date))
  verifier('… le titre « Corbeille du classeur », « Vider la corbeille » actif, la note, le focus sur le premier « Remettre »',
    e.titre === 'Corbeille du classeur' && e.vider === false && net(e.note) === 'Les séances et les pages supprimées de ce classeur attendent ici : Remettre les rend à leur place, avec toute leur histoire. Les classeurs supprimés, eux, sont dans la corbeille de la bibliothèque.' && /^Remettre « Problème »/.test(e.focus), e)
  // Lot 17 : sous chaque carte, sa place dans sa séance (ici la seule, celle du jour)
  verifier('… sous chaque carte, « Page N · séance du jour » (la page 2 d\'avant redevient la page 2)', net(e.cartes[1].ou) === 'Page 2 · séance du jour' && /^Page \d · séance du jour$/.test(net(e.cartes[0].ou)), e.cartes.map(c => c.ou))
  verifier('… la grille des pages est cachée, le bouton « Pages » dit « Revenir aux pages »', await page.evaluate(() => getComputedStyle(document.querySelector('.trieuse-grille')).display === 'none' && document.querySelector('.corbeille-retour').getAttribute('aria-label') === 'Revenir aux pages'))
  await page.waitForFunction(() => [...document.querySelectorAll('.trieuse-corbeille canvas')].every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 120) return true; return false }), null, { timeout: 5000 }).catch(() => {})
  verifier('… leurs vignettes sont peintes (l\'état actuel de la page : son trait)', await page.evaluate(() => [...document.querySelectorAll('.trieuse-corbeille canvas')].every(c => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] < 120 || d[i + 1] < 120) return true; return false })))
  await page.screenshot({ path: D + '/1-corbeille.png' })

  // Remettre « Exercice 12 p. 84 » : à sa place (la 2), sa carte a le focus ; « Annuler » ; Ctrl+Y
  await carteCorbeille(page, P[1], '.corbeille-remettre').click(); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Remettre : la page revient à sa place (la 2), on revient aux pages, sa carte a le focus ; « Page remise : c\'est la page 2 » avec Annuler',
    !e.corbeille && e.trieuse && e.pages[1] === P[1] && e.focusPage === P[1] && dernier(e) === 'Page remise : c\'est la page 2' && e.action.includes('Annuler') && net(e.bouton.texte) === 'Corbeille (1)', e)
  const film0 = await page.evaluate(() => window.__app.tableau.film.length)
  await page.locator('.toast button.action', { hasText: 'Annuler' }).click(); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('… « Annuler » : elle retourne dans la corbeille', !e.pages.includes(P[1]) && e.dans.includes(P[1]) && net(e.bouton.texte) === 'Corbeille (2)' && dernier(e) === 'Annulé : page remise', e)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(200)
  e = await etat(page)
  const etapes = await page.evaluate(k => window.__app.tableau.film.toArray().slice(k).map(x => !!x.seulOrdre), film0)
  verifier('… Ctrl+Y (rétablir, dans la trieuse) : elle revient ; aucune de ces étapes n\'est un geste (seulOrdre)', e.pages[1] === P[1] && !e.dans.includes(P[1]) && etapes.length >= 1 && etapes.every(x => x), { pages: e.pages, etapes })

  // Deux voisines supprimées ensemble (les pages 3 et 4), remises dans les deux ordres
  for (const [premiere, seconde, nom] of [[3, 2, 'la 4 d\'abord'], [2, 3, 'la 3 d\'abord']]) {
    const avant = (await etat(page)).pages
    const c3 = avant.indexOf(P[2]), c4 = avant.indexOf(P[3])
    await page.locator('.trieuse .carte').nth(c3).click({ modifiers: ['Control'] }); await page.waitForTimeout(80)
    await page.locator('.trieuse .carte').nth(c4).click({ modifiers: ['Control'] }); await page.waitForTimeout(80)
    await page.locator('.trieuse-choix button', { hasText: 'Supprimer' }).click(); await page.waitForTimeout(200)
    e = await etat(page)
    const parties = !e.pages.includes(P[2]) && !e.pages.includes(P[3]) && e.dans.includes(P[2]) && e.dans.includes(P[3])
    await ouvrirCorbeille(page)
    await carteCorbeille(page, P[premiere], '.corbeille-remettre').click(); await page.waitForTimeout(200)
    await ouvrirCorbeille(page)
    await carteCorbeille(page, P[seconde], '.corbeille-remettre').click(); await page.waitForTimeout(200)
    e = await etat(page)
    verifier(`Deux voisines (3 et 4) supprimées ensemble, remises ${nom} : elles reviennent dans le bon ordre, à leur place`, parties && JSON.stringify(e.pages) === JSON.stringify(avant), { avant, apres: e.pages })
  }

  // Supprimer définitivement « Problème » : « Annuler », Échap, puis confirmer
  await ouvrirCorbeille(page)
  await carteCorbeille(page, P[4], '.corbeille-supprimer').click(); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('« Supprimer définitivement » : une question, « Annuler » d\'abord (le focus y est), puis « Supprimer définitivement »',
    e.question?.titre === 'Supprimer définitivement cette page ?' && e.question.texte === 'Elle ne pourra plus être remise parmi les pages. Son histoire reste visible dans Revoir la construction (le classeur garde tout ce qui a été écrit).'
    && JSON.stringify(e.question.boutons) === '["Annuler","Supprimer définitivement"]' && e.focus === 'Annuler', e.question)
  await page.screenshot({ path: D + '/1-question.png' })
  await page.click('dialog[open] [data-a="annuler"]'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… « Annuler » : la question se ferme, rien ne change (la page est toujours dans la corbeille)', !e.question && e.corbeille && e.dans.includes(P[4]) && !e.entrees[P[4]]?.definitif, e)
  await carteCorbeille(page, P[4], '.corbeille-supprimer').click(); await page.waitForTimeout(150)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Échap dans la question : elle se ferme, la corbeille reste ouverte, rien ne change, le focus revient au bouton', !e.question && e.corbeille && e.trieuse && e.dans.includes(P[4]) && /^Supprimer définitivement « Problème »/.test(e.focus), e)
  await carteCorbeille(page, P[4], '.corbeille-supprimer').click(); await page.waitForTimeout(150)
  await page.click('dialog[open] [data-a="oui"]'); await page.waitForTimeout(250)
  e = await etat(page)
  verifier('… confirmé : elle quitte la corbeille, « Page supprimée définitivement » sans Annuler ; la corbeille est vide', !e.question && e.corbeille && !e.dans.includes(P[4]) && e.entrees[P[4]]?.definitif === true
    && dernier(e) === 'Page supprimée définitivement' && !e.action.includes('Annuler') && e.vide && e.vider === true && net(e.bouton.texte) === 'Corbeille', e)
  verifier('… « La corbeille est vide. » ; le focus va à « Pages »', await page.evaluate(() => document.querySelector('.corbeille-vide').textContent === 'La corbeille est vide.') && e.focus === 'Revenir aux pages', e.focus)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Échap : la corbeille revient aux pages (la trieuse reste), le focus au bouton « Corbeille »', e.trieuse && !e.corbeille && net(e.focus) === 'Corbeille du classeur : vide', e)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)

  // La poubelle, puis Supprimer définitivement : Ctrl+Z ne la rend plus
  await page.evaluate(p => window.__app.allerPage(p), P[6]); await page.waitForTimeout(100)
  await page.waitForTimeout(650); await page.click(JETER); await page.waitForTimeout(300)
  e = await etat(page)
  const arrivee = e.page
  await ouvrirCorbeille(page)
  await carteCorbeille(page, P[6], '.corbeille-supprimer').click(); await page.waitForTimeout(150)
  await page.click('dialog[open] [data-a="oui"]'); await page.waitForTimeout(200)
  await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Jetée à la poubelle puis supprimée définitivement : Ctrl+Z sur la page d\'arrivée ne la rend pas', e.page === arrivee && !e.pages.includes(P[6]) && !e.dans.includes(P[6]) && e.entrees[P[6]]?.definitif === true, e)
  await page.reload(); await pret(page)
  e = await etat(page)
  verifier('Rechargé : les pages supprimées définitivement sont toujours absentes (ni dans l\'ordre, ni dans la corbeille)', !e.pages.includes(P[4]) && !e.pages.includes(P[6]) && e.dans.length === 0, e)
  const tiroir = await lireTiroir(page)
  const jetees = tiroir.find(s => s.h === 'Pages jetées')
  verifier('La revue les garde sous « Pages jetées », avec leur histoire', jetees && jetees.lignes.length === 2 && jetees.lignes.every(l => /^Page jetée.*· \d+ gestes?$/.test(l)), JSON.stringify(tiroir))

  // Le fichier .memc : une page dans la corbeille (« Fin de cours »), les noms
  await page.evaluate(p => window.__app.allerPage(p), P[5]); await page.waitForTimeout(100)
  await page.waitForTimeout(650); await page.click(JETER); await page.waitForTimeout(300)
  await page.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined })
  const attente = page.waitForEvent('download')
  await page.keyboard.press('Control+s')
  const dl = await attente
  fichierMemc = D + '/' + dl.suggestedFilename()
  await dl.saveAs(fichierMemc)
  const octets = readFileSync(fichierMemc)
  const entete = JSON.parse(octets.subarray(0, octets.indexOf(0x0a)).toString('utf8'))
  verifier('« Enregistrer le tableau » : un .memc, toujours la version 1, l\'en-tête compte les pages de l\'ordre (4)', entete.v === 1 && entete.pages === 4, entete)
  await ctx.close()

  // Ouvert dans un autre navigateur
  const B = await ouvrir({}, 'memc ouvert')
  const fc = B.page.waitForEvent('filechooser', { timeout: 3000 })
  await B.page.keyboard.press('Control+o')
  await (await fc).setFiles(fichierMemc)
  await B.page.waitForSelector('dialog[open] [data-a="remplacer"]')
  await Promise.all([B.page.waitForEvent('load'), B.page.click('dialog[open] [data-a="remplacer"]')])
  await pret(B.page)
  await ouvrirCorbeille(B.page)
  e = await etat(B.page)
  verifier('« Ouvrir un tableau » ailleurs : la corbeille est là (« Fin de cours », sa date), les noms aussi, les pages définitives non',
    JSON.stringify(e.cartes.map(c => c.page)) === JSON.stringify([P[5]]) && e.cartes[0].nom === 'Fin de cours' && /^Supprimée aujourd'hui à /.test(net(e.cartes[0].date))
    && e.noms[P[1]] === 'Exercice 12 p. 84' && e.entrees[P[4]]?.definitif && e.entrees[P[6]]?.definitif, e)
  await carteCorbeille(B.page, P[5], '.corbeille-remettre').click(); await B.page.waitForTimeout(200)
  e = await etat(B.page)
  verifier('… et s\'y remet, à sa place (après la page 5 d\'alors, partie : à la suite de sa voisine qui reste)', e.pages.includes(P[5]) && e.dans.length === 0, e.pages)
  await B.page.keyboard.press('Escape'); await B.page.waitForTimeout(150)

  // Une page jetée « comme au lot 2 » (sans entrée), une page effacée par l'ancienne suppression
  const [lot2, effacee] = await B.page.evaluate(() => {
    const a = window.__app, t = a.tableau, o = t.ordre.toArray()
    const lot2 = o[1], effacee = o[2]
    t.doc.transact(() => t.ordre.delete(1, 1))
    t.supprimerPage(effacee)
    return [lot2, effacee]
  })
  await B.page.waitForTimeout(200)
  await ouvrirCorbeille(B.page)
  e = await etat(B.page)
  const c2 = e.cartes.find(c => c.page === lot2)
  verifier('Une page jetée comme au lot 2 : listée « Supprimée avant cette version · dernière écriture aujourd\'hui à … »', c2 && /^Supprimée avant cette version · dernière écriture aujourd'hui à \d+ h \d\d$/.test(net(c2.date)), e.cartes)
  verifier('Une page effacée par l\'ancienne suppression (Y.Map détruite) : absente, sans erreur', !e.cartes.some(c => c.page === effacee) && e.cartes.length === 1, e.cartes)
  await carteCorbeille(B.page, lot2, '.corbeille-remettre').click(); await B.page.waitForTimeout(200)
  e = await etat(B.page)
  verifier('… remise : à la fin (on ne sait pas où elle était)', e.pages[e.pages.length - 1] === lot2 && dernier(e) === `Page remise : c'est la page ${e.pages.length}`, e)
  await B.page.keyboard.press('Escape'); await B.page.waitForTimeout(150)

  // La poubelle de la barre du haut, puis Ctrl+Z : la page revient et sort de la corbeille
  await B.page.evaluate(p => window.__app.allerPage(p), lot2); await B.page.waitForTimeout(100)
  await B.page.waitForTimeout(650); await B.page.click(JETER); await B.page.waitForTimeout(250)
  e = await etat(B.page)
  const dedans = e.dans.includes(lot2) && !!e.entrees[lot2]
  verifier('La poubelle : « Page N supprimée » avec Annuler, la page dans la corbeille', dedans && /^Page \d supprimée$/.test(dernier(e)) && e.action.includes('Annuler'), e)
  await B.page.keyboard.press('Control+z'); await B.page.waitForTimeout(200)
  e = await etat(B.page)
  verifier('… Ctrl+Z juste après : elle revient, et quitte la corbeille (plus d\'entrée)', e.page === lot2 && e.pages.includes(lot2) && !e.dans.includes(lot2) && !e.entrees[lot2], e)
  await B.page.keyboard.press('Shift+P'); await attendreOuverte(B.page); await B.page.waitForTimeout(150)
  e = await etat(B.page)
  verifier('… et le bouton de la trieuse le dit : « Corbeille »', net(e.bouton.texte) === 'Corbeille' && net(e.bouton.nom) === 'Corbeille du classeur : vide', e.bouton)
  await B.page.keyboard.press('Escape'); await B.page.waitForTimeout(150)

  // Vider la corbeille (deux pages)
  await B.page.evaluate(() => { const a = window.__app, o = a.pages; a.tableau.jeterPages([o[1], o[2]]) })
  await ouvrirCorbeille(B.page)
  await B.page.click('.corbeille-vider'); await B.page.waitForTimeout(150)
  e = await etat(B.page)
  verifier('« Vider la corbeille » : la question dit combien (« Les 2 pages de la corbeille seront supprimées définitivement… »), Annuler d\'abord',
    e.question?.titre === 'Vider la corbeille ?' && /^Les 2 pages de la corbeille seront supprimées définitivement : elles ne pourront plus être remises parmi les pages\. Leur histoire reste visible dans Revoir la construction \(le classeur garde tout ce qui a été écrit\)\.$/.test(e.question.texte)
    && JSON.stringify(e.question.boutons) === '["Annuler","Vider la corbeille"]' && e.focus === 'Annuler', e.question)
  await B.page.click('dialog[open] [data-a="oui"]'); await B.page.waitForTimeout(250)
  e = await etat(B.page)
  verifier('… confirmé : « Corbeille vidée (2 pages) », la corbeille vide, le journal de la trieuse vidé', e.dans.length === 0 && dernier(e) === 'Corbeille vidée (2 pages)' && e.vide && e.cartes.length === 0, e)
  await B.page.keyboard.press('Control+z'); await B.page.waitForTimeout(150)
  e = await etat(B.page)
  verifier('… Ctrl+Z dans la trieuse ne rend rien (« Rien à annuler dans les pages »)', dernier(e) === 'Rien à annuler dans les pages' && e.dans.length === 0, e.msgs.slice(-2))
  await B.ctx.close()
}

// =============== 2. Au doigt ===============
if (faire('doigt')) {
  const { ctx, page } = await ouvrir({ hasTouch: true }, 'doigt')
  const P = await preparer(page, 4, { noms: { 1: 'Deux' }, ici: 0 })
  await page.evaluate(p => { window.__app.tableau.jeterPages([p], { vue: { page: window.__app.page, depuis: window.__app.page } }) }, P[1])
  await page.waitForTimeout(150)
  const tap = async sel => { const r = await page.locator(sel).first().boundingBox(); await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await page.waitForTimeout(200) }
  await tap('.rang'); await attendreOuverte(page); await page.waitForTimeout(200)
  await tap('.trieuse-bouton-corbeille')
  let e = await etat(page)
  const tailles = await page.evaluate(() => [...document.querySelectorAll('.trieuse-corbeille button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent, h: r.height, l: r.width } }))
  verifier('Au doigt : le bouton « Corbeille (1) » touché ouvre la corbeille ; chaque bouton fait 44 px de haut au moins', e.corbeille && e.cartes.length === 1 && tailles.every(b => b.h >= 44 && b.l >= 44), tailles)
  await tap('.corbeille-supprimer')
  await tap('dialog[open] [data-a="annuler"]')
  e = await etat(page)
  verifier('… « Supprimer définitivement » puis « Annuler » touchés : rien ne change', !e.question && e.dans.includes(P[1]), e)
  await tap('.corbeille-remettre')
  e = await etat(page)
  verifier('… « Remettre » touché : la page revient à sa place, on revient aux pages', !e.corbeille && JSON.stringify(e.pages) === JSON.stringify(P) && dernier(e) === 'Page remise : c\'est la page 2', e)
  await tap('.trieuse-bouton-corbeille')
  await tap('.corbeille-retour')
  e = await etat(page)
  verifier('… « Pages » touché : retour aux pages', e.trieuse && !e.corbeille, e)
  await ctx.close()
}

// =============== 3. Au clavier ===============
if (faire('clavier')) {
  const { ctx, page } = await ouvrir({}, 'clavier')
  const P = await preparer(page, 5, { noms: { 2: 'Trois' }, ici: 0 })
  await page.evaluate(p => window.__app.tableau.jeterPages(p), [P[1], P[2]])
  await page.waitForTimeout(150)
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(200)
  // La grille a le focus (la page actuelle) ; Maj+Tab : ×, puis « Corbeille »
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab'); await page.waitForTimeout(60)
  let e = await etat(page)
  const surBouton = /^Corbeille du classeur : 2/.test(net(e.focus))
  await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Au clavier : Maj+Tab mène au bouton « Corbeille », Entrée l\'ouvre, le focus sur le premier « Remettre »', surBouton && e.corbeille && /^Remettre/.test(e.focus) && e.focusPage === e.cartes[0].page, e)
  const ordreTab = []
  for (let i = 0; i < 4; i++) { ordreTab.push((await etat(page)).focus); await page.keyboard.press('Tab'); await page.waitForTimeout(30) }
  verifier('… Tab parcourt les boutons : Remettre, Supprimer définitivement, Remettre, Supprimer définitivement', ordreTab.map(t => t.split(' ')[0]).join(',') === 'Remettre,Supprimer,Remettre,Supprimer', ordreTab)
  // Revenir au premier « Supprimer définitivement », Entrée : la question ; Échap la ferme
  await page.locator('.corbeille-supprimer').first().focus()
  await page.keyboard.press('Enter'); await page.waitForTimeout(150)
  e = await etat(page)
  const question = !!e.question && e.focus === 'Annuler'
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Entrée sur « Supprimer définitivement » : la question (focus sur Annuler) ; Échap la ferme, la corbeille reste, le focus revient', question && !e.question && e.corbeille && /^Supprimer définitivement/.test(e.focus) && e.dans.length === 2, e)
  // Les touches de la grille ne font rien ici
  await page.keyboard.press('Delete'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('Control+d'); await page.waitForTimeout(100)
  e = await etat(page)
  verifier('… Suppr, les flèches, Ctrl+D n\'agissent pas sur les pages depuis la corbeille', e.pages.length === 3 && e.dans.length === 2 && e.corbeille, e)
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Enter'); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('… Maj+Tab, Entrée sur « Remettre » : la page revient, sa carte a le focus dans la grille', !e.corbeille && e.pages.length === 4 && e.focusPage && e.pages.includes(e.focusPage) && /^Page remise/.test(dernier(e)), e)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('… Ctrl+Z dans la trieuse : la remise s\'annule (« Annulé : page remise »)', e.pages.length === 3 && e.dans.length === 2 && dernier(e) === 'Annulé : page remise', e)
  await ouvrirCorbeille(page)
  await page.keyboard.press('Escape'); await page.waitForTimeout(120)
  e = await etat(page)
  const retour = !e.corbeille && e.trieuse
  await page.keyboard.press('Escape'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Échap : la corbeille revient aux pages, puis la trieuse se ferme', retour && !e.trieuse, e)
  await ctx.close()
}

// =============== 4. Copier la page en image ===============
/** La page d'essai (comme lot3/p4/scene.mjs) : traits, surligneur, triangle
 *  ABC codé et rempli, cercle de centre O, droite (DE), segment MN, formules
 *  et une image */
const SCENE = async (fond) => {
  const a = window.__app, t = a.tableau, p = a.page
  const c = document.createElement('canvas'); c.width = 160; c.height = 100
  const x = c.getContext('2d')
  const g = x.createLinearGradient(0, 0, 160, 100); g.addColorStop(0, '#f2c14e'); g.addColorStop(1, '#3b6fb6')
  x.fillStyle = g; x.fillRect(0, 0, 160, 100)
  x.fillStyle = '#d64545'; x.beginPath(); x.arc(110, 45, 26, 0, Math.PI * 2); x.fill()
  const src = 'img-essai-p7'
  t.doc.getMap('images').set(src, c.toDataURL('image/png'))
  t.changerFond(p, fond)
  const zig = (id, x0, y0, n, couleur, taille, z) => {
    const pts = []
    for (let i = 0; i < n; i++) pts.push(i * 9, (i % 2 ? 16 : 0) + Math.sin(i / 3) * 6, 0.5)
    return { id, type: 'trait', x: x0, y: y0, z, auteur: t.moi, pts, couleur, taille, opacite: 1, pression: false }
  }
  t.poserPlusieurs(p, [
    { id: 'p7-image', type: 'image', src, l: 160, h: 100, m: [1.2, 0, 0, 1.2], x: 760, y: 420, z: 1, auteur: t.moi },
    zig('p7-t1', 180, 140, 30, '#1b2230', 3, 2),
    zig('p7-t2', 180, 200, 22, '#d64545', 6, 3),
    { ...zig('p7-t3', 200, 260, 26, '#ffe45c', 18, 4), opacite: 0.45 },
    { id: 'p7-tri', type: 'polygone', x: 300, y: 330, z: 5, auteur: t.moi, pts: [0, 0, 220, 30, 90, 170], ferme: true, couleur: '#1b5fbf', taille: 3, sommets: true, noms: ['A', 'B', 'C'], codage: true, fond: '#3b6fb6' },
    { id: 'p7-cer', type: 'cercle', x: 720, y: 250, z: 6, auteur: t.moi, r: 80, couleur: '#2a8a4a', taille: 3, sommets: true, noms: ['O'], codage: true },
    { id: 'p7-seg', type: 'polygone', x: 980, y: 160, z: 8, auteur: t.moi, pts: [0, 0, 160, 40], ferme: false, couleur: '#1b2230', taille: 3, sommets: true, noms: ['M', 'N'], styleNoms: [{ droit: true }, { taille: 30 }], stylePoints: [{ bout: 'fleche' }, { marque: 'croix' }] },
    { id: 'p7-f1', type: 'formule', latex: '\\overrightarrow{AB}+\\vec{u}', x: 980, y: 260, z: 9, auteur: t.moi, couleur: '#1b2230', taille: 34 },
    { id: 'p7-f2', type: 'formule', latex: '\\sqrt{2}\\approx 1{,}414', x: 980, y: 340, z: 10, auteur: t.moi, couleur: '#d64545', taille: 30 },
    { id: 'p7-f3', type: 'formule', latex: '\\dfrac{1}{2}+\\dfrac{3}{4}', x: 520, y: 520, z: 11, auteur: t.moi, couleur: '#1b5fbf', taille: 30 },
  ])
}
/** L'image du presse-papiers du système, gardée dans la page (window.__image) */
const LIRE_PRESSE = async () => {
  const items = await navigator.clipboard.read()
  const it = items.find(i => i.types.includes('image/png'))
  if (!it) return { types: items.flatMap(i => i.types) }
  const b = await it.getType('image/png')
  const img = new Image(); img.src = URL.createObjectURL(b); await img.decode()
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
  c.getContext('2d').drawImage(img, 0, 0)
  window.__image = c
  return { l: img.width, h: img.height, types: it.types }
}
/** Le presse-papiers vidé (un texte), pour reconnaître la copie suivante */
const VIDER_PRESSE = () => navigator.clipboard.writeText('rien')
/** Les octets RVBA de l'image du presse-papiers, et des mesures simples */
const MESURER_IMAGE = ({ x0, y0, l, h }) => {
  const c = window.__image, d = c.getContext('2d').getImageData(x0, y0, l, h).data
  let blancs = 0, rouges = 0, sombres = 0
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] === 255 && d[i + 1] === 255 && d[i + 2] === 255) blancs++
    if (d[i] > 180 && d[i + 1] < 120 && d[i + 2] < 120) rouges++
    if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) sombres++
  }
  return { blancs, rouges, sombres, n: l * h }
}
/** L'écart moyen (sur 255) entre l'image du presse-papiers et la capture de
 *  l'écran (en base64), découpée à partir de (x0, y0) */
const COMPARER = async ({ b64, x0, y0 }) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode()
  const c = window.__image
  const e = document.createElement('canvas'); e.width = c.width; e.height = c.height
  const ex = e.getContext('2d'); ex.drawImage(img, -x0, -y0)
  const de = ex.getImageData(0, 0, c.width, c.height).data, dc = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let s = 0
  for (let k = 0; k < de.length; k += 4) s += (Math.abs(de[k] - dc[k]) + Math.abs(de[k + 1] - dc[k + 1]) + Math.abs(de[k + 2] - dc[k + 2])) / 3
  return s / (c.width * c.height)
}
const SEUIL_MOYEN = 0.5
/** Ouvre le menu de la page (comme un clic droit dans le vide) et clique sur une entrée */
async function menuPage(page, texte) {
  await page.evaluate(() => { const a = window.__app; a.ui.ouvrirMenuPage(1300, 690, { x: 0, y: 0 }) })
  await page.waitForTimeout(100)
  const entrees = await page.evaluate(() => [...document.querySelector('.menu-flottant[aria-label="Page"]').children].map(c => c.tagName === 'HR' ? '─' : ((c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim() + (c.getAttribute('aria-disabled') === 'true' ? ' (grisée)' : ''))))
  if (texte) await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: texte }).click()
  await page.waitForTimeout(100)
  return entrees
}
const attendreMessage = (page, re) => page.waitForFunction(re => (window.__msgs || []).some(m => new RegExp(re).test(m)), re.source, { timeout: 8000 }).then(() => true, () => false)

if (faire('image')) {
  const { ctx, page } = await ouvrir({ deviceScaleFactor: 2 }, 'image')
  // Le menu de la page sur une page vide : l'entrée grisée
  let entrees = await menuPage(page, null)
  await page.keyboard.press('Escape')
  // (Adapté au morceau P9 : « Exporter la page en PDF… » suit « Copier la page
  // en image », grisée elle aussi sur une page vide)
  verifier('Le menu de la page : … Dupliquer la page · Toutes les pages… · ─ · Copier la page en image (grisée sur une page vide) · Exporter la page en PDF…',
    JSON.stringify(entrees.slice(3)) === JSON.stringify(['─', 'Dupliquer la page', 'Toutes les pages…', '─', 'Copier la page en image (grisée)', 'Exporter la page en PDF… (grisée)']), entrees)
  for (const fond of ['carreaux', 'seyes']) {
    if (fond === 'seyes') await page.evaluate(() => window.__app.tableau.changerFond(window.__app.page, 'seyes'))
    else await page.evaluate(SCENE, fond)
    await page.waitForTimeout(200)
    // À 100 %, la boîte du contenu (moins la marge) en (100, 110) de la zone
    const b = await page.evaluate(async () => {
      const a = window.__app, ap = a.ui.apercus, formes = [...a.formes]
      await ap.mesurer(formes)
      const b = ap.boite(formes)
      a.cam.x = 100 - (b.x - 16); a.cam.y = 110 - (b.y - 16); a.cam.z = 1
      a.rafraichir()
      await document.fonts.ready
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      a.rendu.toutRedessiner()
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))
      const z = document.getElementById('zone').getBoundingClientRect()
      return { ...b, zx: z.left, zy: z.top }
    })
    const attendu = await page.evaluate(async b => (await import('/src/sorties/image.ts')).tailleImage(b), b)
    // La capture de l'écran (le seul dessin de la zone), avant de poser la règle
    await page.evaluate(() => { const s = document.createElement('style'); s.id = 'p7-cache'; s.textContent = '#app > :not(#zone) { visibility: hidden !important; }'; document.head.appendChild(s) })
    await page.mouse.move(1, 1); await page.waitForTimeout(200)
    const capture = await page.screenshot()
    await page.evaluate(() => document.getElementById('p7-cache')?.remove())
    // La règle posée sur la page : elle ne doit pas être dans l'image
    if (fond === 'carreaux') await page.evaluate(() => { const a = window.__app; if (!a.instrumentVisible('regle')) a.basculerInstrument('regle'); a.ui.maj() })
    await page.waitForTimeout(150)
    const regle = await page.evaluate(() => window.__app.instrumentVisible('regle'))
    await page.evaluate(VIDER_PRESSE)
    entrees = await menuPage(page, 'Copier la page en image')
    const ok = await attendreMessage(page, /^Image copiée/)
    const lu = await page.evaluate(LIRE_PRESSE)
    let e = await etat(page)
    verifier(`${fond} : « Copier la page en image » (menu de la page) : « Image copiée : collez-la dans l'ENT ou Pronote (Ctrl+V) » avec « Sans le fond »`,
      ok && e.msgs.includes('Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V)') && e.action.includes('Sans le fond'), e.msgs.slice(-3))
    verifier(`${fond} : le presse-papiers a un image/png de la taille attendue (tailleImage : ${attendu.l} × ${attendu.h}, à 100 %)`, lu.l === attendu.l && lu.h === attendu.h && attendu.z === 1, { lu, attendu })
    const ecart = await page.evaluate(COMPARER, { b64: capture.toString('base64'), x0: Math.round((b.zx + 100) * 2), y0: Math.round((b.zy + 110) * 2) })
    verifier(`${fond} : comparée à l'écran à 100 % (même zone), écart moyen sous ${SEUIL_MOYEN} sur 255${fond === 'carreaux' ? ', la règle posée n\'y est pas' : ''}`, ecart < SEUIL_MOYEN && (fond !== 'carreaux' || regle), `écart ${ecart.toFixed(3)}, règle ${regle}`)
    writeFileSync(`${D}/4-image-${fond}.png`, Buffer.from((await page.evaluate(() => window.__image.toDataURL())).split(',')[1], 'base64'))
    writeFileSync(`${D}/4-ecran-${fond}.png`, capture)
    if (fond === 'carreaux') {
      // Le coin bas gauche de l'image : la marge, sans rien d'écrit
      const coin = { x0: 0, y0: lu.h - 60, l: 60, h: 60 }
      const avec = await page.evaluate(MESURER_IMAGE, coin)
      // « Sans le fond » : le réglage change, l'image est copiée de nouveau
      await page.evaluate(VIDER_PRESSE)
      await page.evaluate(() => { window.__msgs = [] })
      await page.locator('.toast button.action', { hasText: 'Sans le fond' }).click()
      await attendreMessage(page, /^Image copiée/)
      const lu2 = await page.evaluate(LIRE_PRESSE)
      const sans = await page.evaluate(MESURER_IMAGE, coin)
      e = await etat(page)
      verifier('« Sans le fond » (le bouton du message) : copiée de nouveau, blanche là où était le quadrillage ; le message propose « Avec le fond »',
        lu2.l === lu.l && avec.blancs < avec.n && sans.blancs === sans.n && e.action.includes('Avec le fond') && await page.evaluate(() => localStorage.getItem('mem-sortie-fond')) === '0', { avec, sans, action: e.action })
      await page.locator('.toast button.action', { hasText: 'Avec le fond' }).click()
      await page.waitForTimeout(800)
      verifier('… « Avec le fond » le remet (réglage gardé : mem-sortie-fond = 1)', await page.evaluate(() => localStorage.getItem('mem-sortie-fond')) === '1')
      await page.evaluate(() => { const a = window.__app; if (a.instrumentVisible('regle')) a.basculerInstrument('regle') })
    }
  }
  // Une page blanche : pas de « Sans le fond »
  await page.evaluate(() => window.__app.tableau.changerFond(window.__app.page, 'blanc'))
  await page.evaluate(() => { window.__msgs = [] })
  await menuPage(page, 'Copier la page en image')
  await attendreMessage(page, /^Image copiée/)
  let e = await etat(page)
  verifier('Sur une page blanche : « Image copiée… » sans bouton (rien à ôter)', e.msgs.includes('Image copiée : collez-la dans l\'ENT ou Pronote (Ctrl+V)') && !e.action.length, e)

  // Trois objets pris au cadre, puis « Copier en image » du menu complet : l'image n'a qu'eux
  const T = await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    a.nouvellePage()
    a.allerVers({ x: 120, y: 120, z: 1 }, 0)
    const ids = []
    for (let k = 0; k < 3; k++) {
      t.nouveauGeste()
      const pts = []; for (let i = 0; i < 25; i++) pts.push(i * 12, Math.sin(i / 3) * 18, 0.5)
      t.poser(a.page, { id: 'c' + k, type: 'trait', x: 100, y: 80 + k * 70, z: k + 1, auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false })
      ids.push('c' + k)
    }
    t.nouveauGeste()
    t.poser(a.page, { id: 'loin', type: 'trait', x: 700, y: 500, z: 9, auteur: t.moi, pts: [0, 0, 0.5, 120, 40, 0.5], couleur: '#d64545', taille: 6, opacite: 1, pression: false })
    a.choisirOutil('selection')
    return ids
  })
  await page.waitForTimeout(150)
  const zr = await page.evaluate(() => { const r = document.getElementById('zone').getBoundingClientRect(); return { x: r.left, y: r.top } })
  // Le cadre (à la souris, depuis le vide) : de (180, 160) à (540, 400) à l'écran de la zone
  await page.mouse.move(zr.x + 190, zr.y + 165); await page.mouse.down()
  for (let k = 1; k <= 10; k++) await page.mouse.move(zr.x + 190 + 360 * k / 10, zr.y + 165 + 240 * k / 10)
  await page.mouse.up(); await page.waitForTimeout(150)
  const sel = await page.evaluate(() => [...window.__app.selection].sort())
  // Un objet rouge posé APRÈS, au milieu d'eux (non pris) : il ne doit pas être dans l'image
  await page.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'milieu', type: 'trait', x: 160, y: 140, z: 20, auteur: t.moi, pts: [0, 0, 0.5, 80, 30, 0.5, 160, 0, 0.5], couleur: '#d64545', taille: 8, opacite: 1, pression: false }); a.ui.maj() })
  const c1 = await page.evaluate(() => { const a = window.__app, f = a.formes.find(x => x.id === 'c1'), r = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(f.x + f.pts[12 * 3], f.y + f.pts[12 * 3 + 1]); return { x: r.left + s.x, y: r.top + s.y } })
  await page.mouse.click(c1.x, c1.y, { button: 'right' }); await page.waitForTimeout(150)
  const boutons = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].map(b => b.textContent || b.getAttribute('aria-label')))
  // (Adapté aux corrections « regressions » du lot 3 : « Copier en image »
  // et « Envoyer vers… » sont dans le petit menu du bouton ⋯ (Plus), juste
  // avant Supprimer, pour que la rangée reste sur une ligne)
  const plusOuvert = async () => {
    await page.locator('.panneau-forme .ligne button.plus').click(); await page.waitForTimeout(100)
    return page.evaluate(() => { const m = document.querySelector('.menu-plus'); return m && !m.hidden ? [...m.querySelectorAll('.menu-item')].map(b => ({ t: b.querySelector('.libelle').firstChild.textContent, aide: b.querySelector('small')?.textContent })) : [] })
  }
  const ep = await plusOuvert()
  // Lot 5 (K2) : le menu ⋯ a aussi la section Ordre, après « Envoyer vers… » ;
  // (K3) puis la section Protéger : « Verrouiller » (pas « Fixer en fond » :
  // ces trois objets ne sont pas des images) ; (retouches après le lot 5)
  // puis la section Position : les deux quarts de tour
  verifier('Trois objets pris au cadre ; leur menu complet : … Copier, Couper, ⋯, puis Supprimer ; le menu de ⋯ : Copier en image, Envoyer vers…, puis l\'ordre, Verrouiller et les quarts de tour', JSON.stringify(sel) === JSON.stringify(T)
    && JSON.stringify(boutons.slice(-4).map(t => t.replace(/^Plus :.*/, '⋯'))) === JSON.stringify(['Copier', 'Couper', '⋯', 'Supprimer les 3 objets (Suppr)'])
    && JSON.stringify(ep.map(x => x.t)) === JSON.stringify(['Copier en image', 'Envoyer vers…', 'Mettre au premier plan', 'Avancer', 'Reculer', 'Mettre à l\'arrière-plan', 'Verrouiller', 'Tourner d\'un quart de tour à gauche', 'Tourner d\'un quart de tour à droite']), { sel, boutons, ep })
  await page.evaluate(VIDER_PRESSE)
  await page.evaluate(() => { window.__msgs = [] })
  await page.locator('.menu-plus .menu-item', { hasText: 'Copier en image' }).click()
  await attendreMessage(page, /^Image copiée/)
  const lu = await page.evaluate(LIRE_PRESSE)
  const att = await page.evaluate(async ids => {
    const a = window.__app, ap = a.ui.apercus, formes = a.formes.filter(f => ids.includes(f.id))
    await ap.mesurer(formes)
    return (await import('/src/sorties/image.ts')).tailleImage(ap.boite(formes))
  }, T)
  const m = await page.evaluate(MESURER_IMAGE, { x0: 0, y0: 0, l: lu.l, h: lu.h })
  verifier('« Copier en image » : l\'image n\'a que les trois objets (sa taille est celle de leur boîte, rien de rouge ni de l\'objet posé loin)', lu.l === att.l && lu.h === att.h && m.rouges === 0 && m.sombres > 100, { lu, att, m })
  await page.keyboard.press('Escape'); await page.keyboard.press('Escape'); await page.waitForTimeout(100)
  // Le menu complet d'une formule : … Copier, Copier en image, Supprimer
  await page.evaluate(() => { const a = window.__app, t = a.tableau; t.nouveauGeste(); t.poser(a.page, { id: 'fx', type: 'formule', latex: 'x^2+1', x: 600, y: 120, z: 30, auteur: t.moi, couleur: '#1b2230', taille: 30 }); a.choisirOutil('selection'); a.selection.clear(); a.selection.add('fx'); a.options = 'fx'; a.ui.maj() })
  await page.waitForTimeout(100)
  const bf = await page.evaluate(() => [...document.querySelectorAll('.panneau-forme .ligne button')].map(b => b.textContent || b.getAttribute('aria-label')))
  const epf = await plusOuvert()
  verifier('Le menu complet d\'une formule : … Dupliquer, Copier, ⋯, Supprimer ; dans ⋯, « Copier en image », dont l\'aide parle de l\'ENT et de Pronote',
    JSON.stringify(bf.slice(-4).map(t => t.replace(/^Plus :.*/, '⋯'))) === JSON.stringify(['Dupliquer', 'Copier', '⋯', 'Supprimer (Suppr)'])
    && epf[0]?.t === 'Copier en image' && epf[0]?.aide === 'Une image PNG, à coller dans l\'ENT ou Pronote', { bf, epf })
  await page.keyboard.press('Escape'); await page.waitForTimeout(80)
  // Rien de pris : « Rien n'est sélectionné. »
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.maj(); window.__msgs = []; a.ui.copierEnImage('selection') })
  e = await etat(page)
  verifier('« Copier en image » sans rien de pris : « Rien n\'est sélectionné. »', dernier(e) === 'Rien n\'est sélectionné.', e.msgs)

  // Le menu d'une vignette : « Copier en image » avant « Supprimer » ; la trieuse reste ouverte
  await page.keyboard.press('Shift+P'); await attendreOuverte(page); await page.waitForTimeout(250)
  await page.locator('.trieuse .carte .carte-options').first().click(); await page.waitForTimeout(120)
  const ev = await page.evaluate(() => [...document.querySelector('.trieuse .menu-vignette').children].map(c => c.tagName === 'HR' ? '─' : c.classList.contains('menu-titre') ? '#' + c.textContent : (c.querySelector('.libelle')?.firstChild?.textContent ?? '').trim()))
  // (Adapté au morceau P9 : « Exporter en PDF… » entre « Copier en image » et « Supprimer »)
  verifier('Le menu d\'une vignette : … Repère · Mode nuit · ─ · Copier en image · Exporter en PDF… · Supprimer', JSON.stringify(ev.slice(-6)) === JSON.stringify(['Repère', 'Mode nuit', '─', 'Copier en image', 'Exporter en PDF…', 'Supprimer']), ev)
  await page.evaluate(VIDER_PRESSE)
  await page.evaluate(() => { window.__msgs = [] })
  await page.locator('.trieuse .menu-vignette .menu-item', { hasText: 'Copier en image' }).click()
  await attendreMessage(page, /^Image copiée/)
  const lv = await page.evaluate(LIRE_PRESSE)
  e = await etat(page)
  // (Le message laisse passer les appuis, sauf sur son bouton : on lit sa couche)
  const toastDessus = await page.evaluate(() => { const t = document.querySelector('.toast'); return t.classList.contains('visible') && Number(getComputedStyle(t).zIndex) > Number(getComputedStyle(document.querySelector('.trieuse')).zIndex) && !t.inert && !t.closest('[inert]') })
  verifier('« Copier en image » (vignette de la page 1) : la page copiée (sa taille), la trieuse reste ouverte, le message au-dessus d\'elle', e.trieuse && lv.l > 0 && dernier(e).startsWith('Image copiée') && toastDessus, { lv, e: e.msgs, toastDessus })
  await page.keyboard.press('Escape'); await page.waitForTimeout(150)
  await ctx.close()
}

// =============== 5. Le repli : pas de ClipboardItem, copie refusée ===============
if (faire('repli')) {
  for (const [nom, init, attendu] of [
    ['sans ClipboardItem', () => { Object.defineProperty(window, 'ClipboardItem', { value: undefined, configurable: true, writable: true }) }, 'Ce navigateur ne sait pas copier une image.'],
    ['copie refusée', () => { if (navigator.clipboard) navigator.clipboard.write = () => Promise.reject(new DOMException('Refusé', 'NotAllowedError')) }, 'La copie de l\'image a été refusée.'],
  ]) {
    const { ctx, page } = await ouvrir({}, nom, init)
    await preparer(page, 2, { noms: { 1: 'Exercice 12 : p. 84' }, ici: 1 })
    await menuPage(page, 'Copier la page en image')
    await attendreMessage(page, new RegExp('^' + attendu.replace(/[.()]/g, '\\$&') + '$'))
    const e = await etat(page)
    verifier(`${nom} : « ${attendu} » avec « Enregistrer l'image (.png) »`, dernier(e) === attendu && e.action.includes('Enregistrer l\'image (.png)'), e)
    const att = page.waitForEvent('download', { timeout: 8000 })
    await page.locator('.toast button.action', { hasText: 'Enregistrer l\'image' }).click()
    const dl = await att.catch(() => null)
    let png = false, nomFichier = ''
    if (dl) {
      nomFichier = dl.suggestedFilename()
      const f = D + '/5-' + nomFichier
      await dl.saveAs(f)
      const o = readFileSync(f)
      png = o.length > 1000 && o[0] === 0x89 && o.subarray(1, 4).toString() === 'PNG'
    }
    await page.waitForTimeout(150)
    const e2 = await etat(page)
    verifier(`… « Enregistrer l'image (.png) » télécharge un PNG nommé d'après la page (« Exercice 12 - p. 84.png »)`, png && nomFichier === 'Exercice 12 - p. 84.png' && dernier(e2) === 'Image enregistrée : Exercice 12 - p. 84.png', { nomFichier, png, m: e2.msgs.slice(-2) })
    await ctx.close()
  }
}

// =============== 6. La version en un seul fichier (file://) ===============
if (faire('fichier')) {
  const UN = R + '/dist/index.html'
  if (!existsSync(UN)) verifier('dist/index.html existe (npm run build)', false)
  else {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await ctx.newPage()
    const avant = erreurs.length
    surveiller(page, 'file://')
    await page.goto('file://' + UN)
    await page.waitForFunction(() => document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
    await page.waitForTimeout(500)
    // Un trait au Stylo (l'outil du départ), puis un clic droit dans le vide : le menu de la page
    await page.mouse.move(500, 300); await page.mouse.down()
    for (let k = 1; k <= 12; k++) await page.mouse.move(500 + k * 15, 300 + Math.sin(k / 2) * 30)
    await page.mouse.up(); await page.waitForTimeout(300)
    await page.mouse.click(1000, 600, { button: 'right' }); await page.waitForTimeout(200)
    await page.locator('.menu-flottant[aria-label="Page"] .menu-item', { hasText: 'Copier la page en image' }).click()
    await page.waitForTimeout(2500)
    const texte = await page.evaluate(() => [...document.querySelectorAll('.toast .ligne')].map(l => l.textContent).join(' | '))
    const reussie = /Image copiée : collez-la dans l'ENT ou Pronote \(Ctrl\+V\)/.test(texte)
    const repli = /(Ce navigateur ne sait pas copier une image\.|La copie de l'image a été refusée\.)Enregistrer l'image \(\.png\)/.test(texte)
    let png = null
    if (reussie) png = await page.evaluate(async () => { const it = (await navigator.clipboard.read()).find(i => i.types.includes('image/png')); return it ? (await it.getType('image/png')).size : 0 })
    verifier('file:// (la version en un seul fichier) : la copie réussit (un PNG dans le presse-papiers) ou se replie, sans erreur JS', (reussie && png > 1000) || repli, { texte, png })
    verifier('… aucune erreur JS en file://', erreurs.length === avant, erreurs.slice(avant))
    await ctx.close()
  }
}

// =============== 7. L'écrivain de PDF (vitest hors du dépôt, puis poppler) ===============
if (faire('pdf')) {
  const pdf = S + '/lot3/P7/essai.pdf'
  let ok = true
  try { execSync(`npx vitest run -c ${S}/lot3/P7/vt/vitest.config.mjs`, { cwd: R, stdio: 'pipe' }) } catch (e) { ok = false; console.log(String(e.stdout ?? e)) }
  verifier('L\'essai vitest hors du dépôt (lot3/P7/vt) écrit lot3/P7/essai.pdf', ok && existsSync(pdf))
  const info = execFileSync('pdfinfo', [pdf]).toString()
  verifier('pdfinfo : 2 pages, A4 (595.28 x 841.89 pts), PDF 1.4, le titre avec ses accents, le producteur',
    /Pages:\s+2\n/.test(info) && /Page size:\s+595\.28 x 841\.89 pts \(A4\)/.test(info) && /PDF version:\s+1\.4/.test(info) && /Title:\s+Essai — feuille indexée et feuille JPEG \(été\)/.test(info) && /Producer:\s+MEM teachingtool/.test(info), info)
  const liste = execFileSync('pdfimages', ['-list', pdf]).toString().trim().split('\n').slice(2).map(l => l.trim().split(/\s+/))
  verifier('pdfimages -list : une image indexée (Flate), une JPEG, 1654 × 2339 chacune, 200 ppp',
    liste.length === 2 && liste[0][5] === 'index' && liste[0][8] === 'image' && liste[1][5] === 'rgb' && liste[1][8] === 'jpeg'
    && liste.every(l => l[3] === '1654' && l[4] === '2339' && l[12] === '200' && l[13] === '200'), liste)
  let rendu = true
  try { execFileSync('pdftoppm', ['-r', '40', '-png', pdf, D + '/7-essai'], { stdio: 'pipe' }) } catch { rendu = false }
  verifier('pdftoppm : les deux feuilles se rendent sans erreur', rendu && existsSync(D + '/7-essai-1.png') && existsSync(D + '/7-essai-2.png'))
}

// =============== 8. Le téléphone ===============
if (faire('telephone')) {
  const { ctx, page } = await ouvrir({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }, 'telephone')
  await preparer(page, 4, { noms: { 1: 'Exercice 12 p. 84 : démontrer que le triangle est rectangle' }, ici: 0 })
  await page.evaluate(() => { const a = window.__app; a.tableau.jeterPages([a.pages[1], a.pages[2]]) })
  // Le menu complet de trois objets : il passe à la ligne sans déborder
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    for (let k = 0; k < 2; k++) { t.nouveauGeste(); t.poser(a.page, { id: 'm' + k, type: 'trait', x: 60, y: 200 + k * 40, z: 50 + k, auteur: t.moi, pts: [0, 0, 0.5, 100, 10, 0.5], couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) }
    a.choisirOutil('selection'); a.selection.clear(); for (const id of ['w0', 'm0', 'm1']) a.selection.add(id); a.options = '*'; a.ui.maj()
  })
  await page.waitForTimeout(150)
  const pm = await page.evaluate(() => { const p = document.querySelector('.panneau-forme'), r = p.getBoundingClientRect(); return { left: r.left, right: r.right, h: r.height, vu: !p.hidden, scroll: document.documentElement.scrollWidth, boutons: [...p.querySelectorAll('.ligne button')].map(b => { const x = b.getBoundingClientRect(); return { t: b.textContent || b.getAttribute('aria-label'), right: x.right } }) } })
  // (Adapté aux corrections « regressions » : « Copier en image » est dans le menu de ⋯)
  verifier('Téléphone : le menu complet de trois objets passe à la ligne, ⋯ (Copier en image) compris, sans déborder', pm.vu && pm.left >= 0 && pm.right <= 390 && pm.scroll <= 390 && pm.boutons.some(b => /^Plus :/.test(b.t)) && pm.boutons.every(b => b.right <= 390), pm)
  await page.screenshot({ path: D + '/8-telephone-menu.png' })
  await page.evaluate(() => { const a = window.__app; a.selection.clear(); a.options = null; a.ui.maj() })
  const r = await page.locator('.rang').boundingBox()
  await page.touchscreen.tap(r.x + r.width / 2, r.y + r.height / 2); await attendreOuverte(page); await page.waitForTimeout(250)
  const b = await page.locator('.trieuse-bouton-corbeille').boundingBox()
  await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(300)
  const c = await page.evaluate(() => {
    const el = document.querySelector('.trieuse-corbeille')
    const boutons = [...el.querySelectorAll('button')].map(x => { const r = x.getBoundingClientRect(); return { t: x.textContent, left: r.left, right: r.right, h: r.height } })
    const cartes = [...el.querySelectorAll('.carte-corbeille')].map(x => { const r = x.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top } })
    return { vu: !el.hidden, scroll: document.documentElement.scrollWidth, boutons, cartes }
  })
  verifier('Téléphone : la corbeille en deux colonnes, rien ne déborde, des boutons de 44 px', c.vu && c.scroll <= 390 && c.cartes.length === 2 && Math.abs(c.cartes[0].top - c.cartes[1].top) < 2
    && c.boutons.every(x => x.left >= 0 && x.right <= 390 && x.h >= 44), c)
  await page.screenshot({ path: D + '/8-telephone-corbeille.png' })
  await ctx.close()
}

await nav.close()
for (const x of erreurs) verifier('Aucune erreur JS', false, x)
if (!erreurs.length) verifier('Aucune erreur JS', true)
const rates = resultats.filter(r => !r.ok).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
process.exit(rates ? 1 : 0)
