// Essais au navigateur du morceau M4 du lot 2 : supprimer une page sans
// question, et la rendre (« Annuler » du message, ou Ctrl+Z / ↶ juste après,
// sur la page où l'on arrive). La page revient à sa place, entière (mêmes
// formes, même fond, même vue, même pile) ; jamais de tableau sans page ; la
// revue (tiroir, comptes, « Sa dernière séance ») et le film élève (Publier,
// « Voir comme un élève ») ne voient ni le jet ni le retour ; le .memc garde
// la page rendue, pas la jetée.
// Serveur de développement sur :5173. Une ligne « OK … » ou « ÉCHEC … » par
// vérification ; code de sortie 1 s'il y a un échec ou une erreur JS.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../commun/racines.mjs'
import { chromium } from '../commun/playwright.mjs'
import { mkdirSync, readFileSync } from 'node:fs'

const URL0 = 'http://localhost:5173/'
const D = `${RACINE_ESSAIS}/lot2/m4`
mkdirSync(D, { recursive: true })
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push({ nom, ok: !!ok })
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + detail : ''}`)
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

async function ouvrir(o = {}, nom = 'page') {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true, ...o })
  const page = await ctx.newPage()
  surveiller(page, nom)
  await page.goto(URL0)
  await page.waitForFunction(() => window.__app && window.__app.page)
  await page.waitForTimeout(400)
  return { ctx, page }
}

// ---------- Ce qu'on lit dans la page ----------
const JETER = '.barre-haut button[aria-label="Supprimer cette page"], .barre-haut button[aria-label="Effacer la page"]'
const ETAT = () => {
  const a = window.__app, t = a.tableau
  const b = s => document.querySelector(`button[aria-label^="${s}"]`)
  const j = document.querySelector('.barre-haut button[aria-label="Supprimer cette page"], .barre-haut button[aria-label="Effacer la page"]')
  return {
    page: a.page, pages: a.pages, n: a.formes.length, ids: a.formes.map(f => f.id).sort(), fond: a.fond, z: Math.round(a.cam.z * 1000) / 1000,
    centre: (c => ({ x: Math.round(c.x * 100) / 100, y: Math.round(c.y * 100) / 100 }))(a.cam.versMonde(a.rendu.l / 2, a.rendu.h / 2)),
    annuler: !b('Annuler sur cette page').disabled, retablir: !b('Rétablir sur cette page').disabled,
    rang: document.querySelector('.rang').textContent, dialogues: document.querySelectorAll('dialog[open]').length,
    titreJeter: j?.title, film: t.film.length,
    action: [...document.querySelectorAll('.toast button.action')].filter(x => x.closest('.toast').classList.contains('visible')).map(x => x.textContent),
  }
}
const etat = page => page.evaluate(ETAT)
const TOAST = () => [...document.querySelector('.toast').children].map(l => l.textContent).join(' | ')
const toast = page => page.evaluate(TOAST)
const viderToast = page => page.evaluate(() => { for (const l of [...document.querySelector('.toast').children]) l.textContent = '' })
/** Un trait posé comme un geste, sur la page qu'on regarde */
const POSER = ({ id, x, y }) => {
  const a = window.__app, t = a.tableau
  t.nouveauGeste()
  t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 40, 12, 0.5, 80, 0, 0.5, 120, 12, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
}
const poser = (page, id, x = 200, y = 200) => page.evaluate(POSER, { id, x, y })
/** Un tracé à la souris, en zigzag : de l'écriture, que rien ne redresse */
async function ecrireSouris(page, x, y) {
  await page.mouse.move(x, y); await page.mouse.down()
  for (let i = 1; i <= 12; i++) await page.mouse.move(x + i * 8, y + (i % 2 ? 14 : 0))
  await page.mouse.up(); await page.waitForTimeout(80)
}
/** Un clic sur la poubelle de la barre du haut, assez loin du précédent */
async function jeter(page) { await page.waitForTimeout(650); await page.click(JETER); await page.waitForTimeout(150) }
async function cliquerAnnulerDuMessage(page) { await page.click('.toast.visible button.action'); await page.waitForTimeout(150) }

// =============== 1. Souris : jeter, « Annuler », Ctrl+Z, double-clic ===============
{
  const { ctx, page } = await ouvrir({}, 'souris')
  await page.evaluate(() => { window.__app.reconnaissance = false })
  // Trois pages : la 1 (un trait), la 2 (deux traits, Seyès, zoom 200 %), la 3 (un trait)
  const [p1, p2, p3] = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, pause = ms => new Promise(r => setTimeout(r, ms))
    const poser = (id, x, y) => { t.nouveauGeste(); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 60, 10, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }
    const p1 = a.page; poser('a1', 100, 100); await pause(30)
    a.nouvellePage(); const p2 = a.page; poser('b1', 200, 200); poser('b2', 300, 260); a.changerFond('seyes'); a.zoomer(2); await pause(30)
    a.nouvellePage(); const p3 = a.page; poser('c1', 150, 150); await pause(30)
    // (Adapté aux réglages par défaut, retouches après le lot 5 : on arrive
    // sur une page toujours à 100 % ; la page 2 se zoome de nouveau à 200 %,
    // à la main, une fois qu'on y est. Rendue, elle revient au même centre,
    // à 100 % : « sa vue (200 %) » devient « son centre, à 100 % ».)
    a.allerPage(p2); a.zoomer(2); await pause(30)
    // La page 1 n'a rien à défaire : ↶ ne s'y allumera que par le jet
    t.annulationDe(p1).clear()
    window.__carteP2 = t.pages.get(p2); window.__formeB1 = t.formesDe(p2).get('b1')
    return [p1, p2, p3]
  })
  let e = await etat(page)
  const centreDepart = e.centre
  verifier('Départ : sur la page 2 de 3, Seyès, 200 %', e.page === p2 && e.pages.length === 3 && e.fond === 'seyes' && e.z === 2 && e.titreJeter === 'Supprimer cette page', JSON.stringify(e))

  await jeter(page)
  e = await etat(page)
  verifier('La poubelle : aucune question (pas de dialog[open]), la page part tout de suite', e.dialogues === 0 && e.pages.length === 2 && !e.pages.includes(p2), JSON.stringify(e))
  verifier('… on arrive sur la page d\'avant (la 1), « 1 / 2 »', e.page === p1 && e.rang === '1 / 2', JSON.stringify(e))
  verifier('… le message « Page 2 supprimée » avec le bouton « Annuler »', (await toast(page)).includes('Page 2 supprimée') && JSON.stringify(e.action) === '["Annuler"]', await toast(page))
  verifier('… ↶ s\'allume sur la page d\'arrivée (elle n\'avait rien à défaire)', e.annuler, JSON.stringify(e))
  const film = await page.evaluate(() => { const f = window.__app.tableau.film.toArray().at(-1); return { page: f.page, seulOrdre: f.seulOrdre } })
  verifier('… le film note une étape seulOrdre, sur la page d\'arrivée', film.page === p1 && film.seulOrdre === true, JSON.stringify(film))

  await cliquerAnnulerDuMessage(page)
  e = await etat(page)
  const meme = await page.evaluate(p => { const t = window.__app.tableau; return t.pages.get(p) === window.__carteP2 && t.formesDe(p).get('b1') === window.__formeB1 }, p2)
  verifier('« Annuler » : la page 2 revient 2e, affichée', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && e.page === p2 && e.rang === '2 / 3', JSON.stringify(e))
  verifier('… avec ses formes (mêmes identifiants, mêmes objets), son fond, son centre (à 100 %)', JSON.stringify(e.ids) === '["b1","b2"]' && meme && e.fond === 'seyes' && e.z === 1 && JSON.stringify(e.centre) === JSON.stringify(centreDepart), JSON.stringify({ e, meme }))
  verifier('… le message « Page 2 rétablie »', (await toast(page)).includes('Page 2 rétablie'), await toast(page))
  // Sa pile marche encore
  await page.keyboard.press('Control+z'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('La pile de la page rendue marche encore : Ctrl+Z retire son dernier trait', JSON.stringify(e.ids) === '["b1"]', JSON.stringify(e.ids))
  await page.keyboard.press('Control+y'); await page.waitForTimeout(120)
  verifier('… et Ctrl+Y le rend', JSON.stringify((await etat(page)).ids) === '["b1","b2"]')

  // Ctrl+Z sur la page 1 au lieu du bouton
  await jeter(page)
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Ctrl+Z sur la page où l\'on arrive : la page 2 revient à sa place, affichée, entière (son centre, à 100 %)', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && e.page === p2 && JSON.stringify(e.ids) === '["b1","b2"]' && e.fond === 'seyes' && e.z === 1 && JSON.stringify(e.centre) === JSON.stringify(centreDepart), JSON.stringify(e))
  verifier('… « Page 2 rétablie », et le message « Annuler » d\'avant s\'en va', (await toast(page)).includes('Page 2 rétablie') && e.action.length === 0, JSON.stringify({ t: await toast(page), a: e.action }))
  const rien = await page.evaluate(p => { const a = window.__app, avant = a.pages.join(); return { r: a.rendrePage(p), meme: a.pages.join() === avant } }, p2)
  verifier('« Annuler » après un Ctrl+Z qui l\'a déjà rendue : rien', rien.r === false && rien.meme, JSON.stringify(rien))
  await page.keyboard.press('PageUp'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('La page 1, la page 2 rendue : ↶ s\'y grise de nouveau (rien d\'autre à défaire)', e.page === p1 && !e.annuler, JSON.stringify(e))
  await viderToast(page)
  await page.keyboard.press('Control+y'); await page.waitForTimeout(120)
  e = await etat(page)
  verifier('Ctrl+Y sur la page 1 ne jette pas la page 2 de nouveau', e.pages.length === 3 && (await toast(page)).includes('Rien à rétablir'), JSON.stringify({ e, t: await toast(page) }))

  // Écrire sur la page 1 après le jet : Ctrl+Z retire le trait, puis rend la page
  await page.keyboard.press('PageDown'); await page.waitForTimeout(120)
  await jeter(page)
  await page.evaluate(() => window.__app.choisirOutil('stylo'))
  await ecrireSouris(page, 400, 450)
  e = await etat(page)
  verifier('Après le jet, un trait écrit sur la page 1', e.page === p1 && e.n === 2, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Premier Ctrl+Z : le trait part, la page 2 reste jetée', e.page === p1 && e.n === 1 && e.pages.length === 2 && e.annuler, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Second Ctrl+Z : la page 2 revient, affichée', e.page === p2 && JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]), JSON.stringify(e))

  // Jeter la première page : on arrive sur l'ancienne 2e
  await page.keyboard.press('PageUp'); await page.waitForTimeout(120)
  await jeter(page)
  e = await etat(page)
  verifier('Jeter la 1re page : on arrive sur l\'ancienne 2e, « Page 1 supprimée »', e.page === p2 && JSON.stringify(e.pages) === JSON.stringify([p2, p3]) && (await toast(page)).includes('Page 1 supprimée'), JSON.stringify(e))
  await page.click('button[aria-label^="Annuler sur cette page"]'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('↶ (le bouton) la rend en tête, affichée', e.page === p1 && JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]), JSON.stringify(e))

  // Double-clic sur la poubelle : une seule page jetée
  await page.keyboard.press('PageDown'); await page.waitForTimeout(700)
  await page.dblclick(JETER); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Double-clic sur la poubelle avec 3 pages : une seule page jetée', e.pages.length === 2 && !e.pages.includes(p2) && e.page === p1, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  await page.waitForTimeout(700)
  await page.click(JETER); await page.waitForTimeout(300); await page.click(JETER); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Deux clics à 300 ms : une seule page jetée', e.pages.length === 2 && e.page === p1, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)

  // Deux pages jetées de suite : deux Ctrl+Z, dans l'ordre inverse, chacune à sa place
  e = await etat(page)
  verifier('(on est revenu sur la page 2, trois pages)', e.page === p2 && e.pages.length === 3, JSON.stringify(e))
  await jeter(page)                 // la 2 → on arrive sur la 1
  await jeter(page)                 // la 1 → on arrive sur la 3
  e = await etat(page)
  verifier('Deux pages jetées de suite : il reste la 3, affichée', JSON.stringify(e.pages) === JSON.stringify([p3]) && e.page === p3 && e.titreJeter === 'Effacer la page', JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Premier Ctrl+Z : la page 1 revient en tête, affichée', JSON.stringify(e.pages) === JSON.stringify([p1, p3]) && e.page === p1, JSON.stringify(e))
  await page.keyboard.press('Control+z'); await page.waitForTimeout(150)
  e = await etat(page)
  verifier('Second Ctrl+Z : la page 2 revient après la 1', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p3]) && e.page === p2 && e.titreJeter === 'Supprimer cette page', JSON.stringify(e))

  // Rendre après avoir ajouté une page : après sa voisine d'avant
  await jeter(page)
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(150)
  const p4 = (await etat(page)).page
  await cliquerAnnulerDuMessage(page)
  e = await etat(page)
  verifier('« Annuler » après une page ajoutée : la page 2 revient juste après la 1', JSON.stringify(e.pages) === JSON.stringify([p1, p2, p4, p3]) && e.page === p2, JSON.stringify(e))
  await ctx.close()
}

// =============== 2. Une seule page : jamais jetée ===============
{
  const { ctx, page } = await ouvrir({}, 'seule')
  await page.evaluate(() => { window.__app.reconnaissance = false; window.__app.choisirOutil('stylo') })
  let e = await etat(page)
  verifier('Une seule page : la poubelle dit « Effacer la page »', e.titreJeter === 'Effacer la page' && e.pages.length === 1, JSON.stringify(e))
  await jeter(page)
  e = await etat(page)
  verifier('Page vide : « La page est déjà vide. », rien d\'autre', (await toast(page)).includes('La page est déjà vide.') && e.pages.length === 1 && e.dialogues === 0 && e.action.length === 0, JSON.stringify(e))
  await ecrireSouris(page, 300, 300)
  await jeter(page)
  e = await etat(page)
  verifier('Avec un trait : la page est effacée, « Page effacée · Annuler », sans question', e.n === 0 && e.pages.length === 1 && e.dialogues === 0 && (await toast(page)).includes('Page effacée') && JSON.stringify(e.action) === '["Annuler"]', JSON.stringify(e))
  await cliquerAnnulerDuMessage(page)
  e = await etat(page)
  verifier('« Annuler » rend le trait', e.n === 1, JSON.stringify(e))
  await jeter(page)
  await ecrireSouris(page, 300, 500)
  await cliquerAnnulerDuMessage(page)
  e = await etat(page)
  verifier('Effacée puis réécrite : « Annuler » ne défait rien d\'invisible, et le dit', e.n === 1 && (await toast(page)).includes('La page a changé depuis'), JSON.stringify({ e, t: await toast(page) }))
  await page.evaluate(() => window.__app.nouvellePage()); await page.waitForTimeout(150)
  verifier('Deux pages : la poubelle redit « Supprimer cette page »', (await etat(page)).titreJeter === 'Supprimer cette page')
  await ctx.close()
}

// =============== 3. Au doigt (tablette) ===============
{
  const { ctx, page } = await ouvrir({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true }, 'doigt')
  await page.evaluate(() => { const a = window.__app; a.nouvellePage(); a.nouvellePage() })
  await page.waitForTimeout(150)
  let e = await etat(page)
  const p3 = e.page
  const b = await page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 } }, JETER)
  await page.waitForTimeout(650)
  await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(80); await page.touchscreen.tap(b.x, b.y); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Doigt : deux touchers rapides sur la poubelle jettent une seule page', e.pages.length === 2 && !e.pages.includes(p3) && e.dialogues === 0, JSON.stringify(e))
  const a = await page.evaluate(() => { const r = document.querySelector('.toast.visible button.action').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, h: r.height } })
  await page.touchscreen.tap(a.x, a.y); await page.waitForTimeout(200)
  e = await etat(page)
  verifier('Doigt : toucher « Annuler » rend la page', e.pages.length === 3 && e.page === p3, JSON.stringify(e))
  await ctx.close()
}

// =============== 4. Revue, Publier, .memc ===============
{
  const { ctx, page } = await ouvrir({}, 'revue')
  await page.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
  const [p1, p2, p3] = await page.evaluate(async () => {
    const a = window.__app, t = a.tableau, pause = ms => new Promise(r => setTimeout(r, ms))
    const poser = (id, x, y) => { t.nouveauGeste(); t.poser(a.page, { id, type: 'trait', x, y, z: Date.now() + Math.random(), auteur: t.moi, pts: [0, 0, 0.5, 60, 10, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false }) }
    const p1 = a.page
    for (let i = 0; i < 3; i++) { poser('a' + i, 100, 100 + i * 50); await pause(60) }
    a.nouvellePage(); await pause(60); const p2 = a.page
    for (let i = 0; i < 2; i++) { poser('b' + i, 200, 100 + i * 50); await pause(60) }
    a.nouvellePage(); await pause(60); const p3 = a.page
    poser('c0', 300, 300); await pause(60)
    a.allerPage(p2); await pause(60)
    return [p1, p2, p3]
  })
  const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
  async function lireTiroir() {
    await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(250)
    await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(150)
    const t = await page.evaluate(TIROIR)
    for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) }
    return t
  }
  async function lirePublier() {
    await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
    const options = await page.$$eval('.p-seance option', l => l.map(o => o.textContent.replace(/[  ]/g, ' ')))
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.p-fichier')])
    const contenu = readFileSync(await dl.path(), 'utf8')
    const film = await page.evaluate(async t => { const fm = await import('/src/revoir/format.ts'); const f = await fm.lireFilm(t); return { etapes: f.etapes.map(e => ({ dt: e.dt, p: e.p, o: e.o.map(o => o[0] + (o[1]?.id ?? '')) })), ordre: f.ordre, pages: f.pages.map(p => ({ id: p.id, formes: p.formes.map(x => x.id) })), chapitres: f.chapitres } }, contenu)
    await page.focus('.p-titre'); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150)
    return { options, film }
  }
  const tiroirA = await lireTiroir()
  const publierA = await lirePublier()
  verifier('Avant : le tiroir et Publier se lisent (3 pages, une séance de 6 gestes)', tiroirA.length >= 2 && publierA.options.length === 1 && /· 6 gestes$/.test(tiroirA.find(x => x.h === 'Séances')?.lignes[0]) && publierA.film.etapes.length > 6, JSON.stringify({ tiroirA, o: publierA.options, n: publierA.film.etapes.length }))

  // Cinq minutes plus tard, on jette la page 2 ; une minute après, « Annuler »
  await page.evaluate(() => { window.__dec = 5 * 60_000 })
  await jeter(page)
  await page.evaluate(() => { window.__dec = 6 * 60_000 })
  await cliquerAnnulerDuMessage(page)
  let e = await etat(page)
  verifier('(la page 2 est revenue, affichée)', e.page === p2 && e.pages.length === 3, JSON.stringify(e))
  const tiroirB = await lireTiroir()
  verifier('Revue après jeter-rendre : le tiroir dit exactement la même chose (gestes de chaque ligne, « Sa dernière séance » finit à l\'heure du dernier vrai geste, aucune page jetée)', JSON.stringify(tiroirB) === JSON.stringify(tiroirA), JSON.stringify({ tiroirA, tiroirB }))
  const publierB = await lirePublier()
  verifier('Publier après jeter-rendre : la même séance, « · N gestes » inchangé', JSON.stringify(publierB.options) === JSON.stringify(publierA.options), JSON.stringify({ a: publierA.options, b: publierB.options }))
  verifier('… et le même film élève', JSON.stringify(publierB.film) === JSON.stringify(publierA.film))

  // Un trait de plus sur la page rendue : un geste de plus, rien ne se redessine, aucun pas vide
  await page.evaluate(() => { window.__dec = 7 * 60_000 })
  await poser(page, 'b9', 400, 400); await page.waitForTimeout(150)
  const publierC = await lirePublier()
  const f = publierC.film
  verifier('Un trait sur la page rendue : le film élève a un geste de plus, sur elle, qui ne pose que ce trait', f.etapes.length === publierA.film.etapes.length + 1 && f.etapes.at(-1).p === p2 && JSON.stringify(f.etapes.at(-1).o) === '["=b9"]', JSON.stringify(f.etapes.at(-1)))
  verifier('… le reste du film élève est inchangé : aucun pas vide, aucune page redessinée', JSON.stringify(f.etapes.slice(0, -1)) === JSON.stringify(publierA.film.etapes) && f.etapes.every(x => x.o.length === 1), JSON.stringify(f.etapes.map(x => x.o)))
  const gestes = s => Number((s.match(/· (\d+) geste/) || [])[1])
  verifier('… « · N gestes » de la séance : un de plus', gestes(publierC.options[0]) === gestes(publierA.options[0]) + 1, JSON.stringify(publierC.options))
  // « Voir comme un élève »
  await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
  const [ap] = await Promise.all([ctx.waitForEvent('page'), page.click('.p-apercu')])
  surveiller(ap, 'apercu')
  await ap.waitForSelector('.carte h1', { timeout: 8000 })
  verifier('« Voir comme un élève » s\'ouvre sur la séance', (await ap.textContent('.carte h1')).length > 0)
  await ap.close()
  await page.focus('.p-titre'); await page.keyboard.press('Escape').catch(() => {}); await page.waitForTimeout(150)

  // La page 3, jetée pour de bon : « Pages jetées », avec toute son histoire
  await page.evaluate(p => window.__app.allerPage(p), p2); await page.waitForTimeout(100)
  const tiroirC = await lireTiroir()
  await page.evaluate(p => window.__app.allerPage(p), p3); await page.waitForTimeout(100)
  await page.evaluate(() => { window.__dec = 9 * 60_000 })
  await jeter(page)
  e = await etat(page)
  verifier('(la page 3 est jetée, on est sur la 2)', e.page === p2 && JSON.stringify(e.pages) === JSON.stringify([p1, p2]), JSON.stringify(e))
  const tiroirD = await lireTiroir()
  const jetees = tiroirD.find(s => s.h === 'Pages jetées')
  verifier('Revue : la page jetée est dans « Pages jetées », avec son geste', jetees && jetees.lignes.length === 1 && /· 1 geste$/.test(jetees.lignes[0]), JSON.stringify(jetees))
  // (la liste des pages de la séance dit maintenant « et page jetée » : c'est voulu)
  const sansPages = t => JSON.stringify(t.filter(s => s.h !== 'Pages jetées').map(s => ({ ...s, lignes: s.lignes.map(l => l.replace(/^(.*?→ \d+ h \d+).*?(· \d+ gestes?)$/, '$1 $2')) })))
  verifier('… et rien d\'autre ne change dans le tiroir (le jet n\'est un geste ni pour la page 2, ni pour la séance : mêmes heures, mêmes gestes)', sansPages(tiroirD) === sansPages(tiroirC) && tiroirD.find(s => s.h === 'Séances').lignes[0].includes('pages 1, 2 et page jetée'), JSON.stringify({ tiroirC, tiroirD }))
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(250)
  await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(150)
  await page.locator('.revue-section', { has: page.locator('h3', { hasText: 'Pages jetées' }) }).locator('.revue-choix').first().click()
  await page.waitForTimeout(150)
  const r = await page.evaluate(() => { const b = window.__revue.bande; window.__revue.aller(b.images.length - 1); return { total: b.total, page: b.portion.page, n: window.__revue.rendu.formes.length, ligne1: document.querySelector('.revue-ou .ligne1').textContent } })
  verifier('… on la revoit : son geste, sa dernière image', r.total === 1 && r.page === p3 && r.n === 1 && r.ligne1.startsWith('Page jetée'), JSON.stringify(r))
  for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) }

  // Enregistrer, puis ouvrir ailleurs : la page rendue est là, la jetée non
  await page.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined })
  const attente = page.waitForEvent('download')
  await page.keyboard.press('Control+s')
  const dl = await attente
  const fichier = D + '/' + dl.suggestedFilename()
  await dl.saveAs(fichier)
  await ctx.close()
  const B = await ouvrir({}, 'ouvert')
  const fc = B.page.waitForEvent('filechooser', { timeout: 3000 })
  await B.page.keyboard.press('Control+o')
  await (await fc).setFiles(fichier)
  await B.page.waitForSelector('dialog[open] [data-a="remplacer"]')
  await Promise.all([B.page.waitForEvent('load'), B.page.click('dialog[open] [data-a="remplacer"]')])
  await B.page.waitForFunction(() => window.__app && window.__app.page); await B.page.waitForTimeout(400)
  const o = await B.page.evaluate(ps => { const a = window.__app, t = a.tableau; return { pages: a.pages, n2: t.formesDe(ps[1])?.size, fond: t.fondDe(ps[1]), dans: t.pages.has(ps[2]) } }, [p1, p2, p3])
  verifier('.memc rouvert : la page rendue est là (avec son trait de plus), la jetée non', JSON.stringify(o.pages) === JSON.stringify([p1, p2]) && o.n2 === 3, JSON.stringify(o))
  await B.page.evaluate(p => window.__app.allerPage(p), p2); await B.page.waitForTimeout(100)
  await B.page.click('button[title^="Revoir la construction"]'); await B.page.waitForTimeout(250)
  await B.page.getByRole('button', { name: /^Que revoir/ }).click(); await B.page.waitForTimeout(150)
  const tiroirE = await B.page.evaluate(TIROIR)
  const j2 = tiroirE.find(s => s.h === 'Pages jetées')
  verifier('… sa revue range la page jetée dans « Pages jetées », avec son histoire', j2 && j2.lignes.length === 1 && /· 1 geste$/.test(j2.lignes[0]), JSON.stringify(tiroirE))
  await B.ctx.close()
}

await nav.close()
const echecs = resultats.filter(r => !r.ok)
console.log(`\n${resultats.length - echecs.length}/${resultats.length} OK`)
if (erreurs.length) console.log('ÉCHEC : erreurs JS :\n' + erreurs.join('\n'))
process.exit(echecs.length || erreurs.length ? 1 : 0)
