// Vérification « données et replay » du lot 3 : un .memc écrit par la version
// d'avant le lot 3 (pages jetées du lot 2, sans entrée de corbeille), et un
// .memc d'avant le lot 2 (une page effacée à l'ancienne), ouverts par Ctrl+O
// dans la version du lot 3 : les pages, la corbeille (trieuse), la remise,
// la revue, Publier, et après un rechargement.
// Les deux fichiers (ancien-lot2.memc, ancien-efface.memc, avec les
// identifiants de leurs pages dans ancien-*.json) sont des références
// figées : écrits par la version d'avant le lot 3, ils sont versionnés à côté
// de cet essai depuis qu'il est rangé dans le dépôt (la version d'avant se
// construisait depuis un commit qui n'existe plus).
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../../commun/racines.mjs'
import { chromium } from '../../../commun/playwright.mjs'
import { readFileSync } from 'node:fs'

const D = `${RACINE_ESSAIS}/lot3/verif/donnees`
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
const net = t => (t ?? '').replace(/[  ]/g, ' ')
const erreurs = []
const resultats = []
function verifier(nom, ok, detail = '') { resultats.push(!!ok); console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail ? ' — ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)) : ''}`) }
async function pret(page) {
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 15000 })
  await page.waitForTimeout(500)
}
async function ouvrirFichier(fichier) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', e => erreurs.push(e.message))
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) erreurs.push(m.text()) })
  await page.goto('http://localhost:5173/')
  await pret(page)
  const fc = page.waitForEvent('filechooser', { timeout: 3000 })
  await page.keyboard.press('Control+o')
  await (await fc).setFiles(fichier)
  await page.waitForSelector('dialog[open] [data-a="remplacer"]')
  await Promise.all([page.waitForEvent('load'), page.click('dialog[open] [data-a="remplacer"]')])
  await pret(page)
  return { ctx, page }
}
const TIROIR = () => [...document.querySelectorAll('.revue-tiroir .revue-section')].map(s => ({ h: s.querySelector('h3')?.textContent, lignes: [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' ')) }))
async function tiroir(page) {
  await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(200)
  const t = await page.evaluate(TIROIR)
  for (let i = 0; i < 4 && await page.evaluate(() => window.__app.enLecture); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150) }
  return t
}
const CORBEILLE = () => [...document.querySelectorAll('.carte-corbeille')].map(c => ({ page: c.dataset.page, nom: c.querySelector('.corbeille-nom').textContent, date: c.querySelector('.corbeille-date').textContent }))

// ---------- 1. Le tableau du lot 2 ----------
{
  const ids = JSON.parse(readFileSync(D + '/ancien-lot2.json', 'utf8'))
  const { ctx, page } = await ouvrirFichier(D + '/ancien-lot2.memc')
  let e = await page.evaluate(() => ({ pages: window.__app.pages, rang: document.querySelector('.rang').textContent, dans: window.__app.tableau.pagesDeLaCorbeille().map(x => x.id) }))
  verifier('lot 2 : l\'ordre est celui du fichier (a, d) ; b et c dans la corbeille', JSON.stringify(e.pages) === JSON.stringify([ids.a, ids.d]) && e.dans.length === 2 && e.dans.includes(ids.b) && e.dans.includes(ids.c), { e, ids })
  // La trieuse, puis la corbeille
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
  const bouton = await page.evaluate(() => { const b = document.querySelector('.trieuse-bouton-corbeille'); return b ? { t: b.textContent, a: b.getAttribute('aria-label') } : null })
  verifier('le bouton de la corbeille compte 2 pages', bouton && /Corbeille\s*\(2\)/.test(net(bouton.t)), bouton)
  await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(500)
  const cartes = await page.evaluate(CORBEILLE)
  verifier('la corbeille montre b et c, « Supprimée avant cette version »', cartes.length === 2 && cartes.every(c => /avant cette version/.test(net(c.date))), cartes)
  // Remettre c : sans entrée, à la fin
  await page.click(`.carte-corbeille[data-page="${ids.c}"] .corbeille-remettre`); await page.waitForTimeout(500)
  e = await page.evaluate(() => ({ pages: window.__app.pages, msgs: [...document.querySelectorAll('.toast')].map(t => t.textContent) }))
  verifier('remettre c : à la fin', JSON.stringify(e.pages) === JSON.stringify([ids.a, ids.d, ids.c]), e)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  if (await page.evaluate(() => document.body.classList.contains('en-trieuse'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  const c0 = await page.evaluate(id => ({ ids: [...window.__app.tableau.formesDe(id).keys()].sort(), fond: window.__app.tableau.fondDe(id) }), ids.c)
  verifier('c revient avec son contenu et son fond', JSON.stringify(c0.ids) === '["c0","c1"]' && c0.fond === 'blanc', c0)
  // La revue : b sous « Pages jetées », c a toute son histoire
  const t = await tiroir(page)
  const jetees = t.find(s => s.h === 'Pages jetées')
  verifier('la revue : b sous « Pages jetées » (2 gestes)', jetees && jetees.lignes.length === 1 && /2 gestes$/.test(jetees.lignes[0]), t)
  // Publier la séance 1 (celle où b a été écrite) : le fichier part sans erreur
  await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
  const seances = await page.$$eval('.dialogue-publier[open] select option', l => l.map(o => o.textContent)).catch(() => [])
  const cases = await page.$$eval('.p-pages input', l => l.map(i => ({ v: i.value, c: i.checked })))
  console.log('Publier : séances', JSON.stringify(seances), 'pages', JSON.stringify(cases.map(c => [Object.keys(ids).find(k => ids[k] === c.v), c.c])))
  await page.focus('.p-titre'); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
  // Recharger : la corbeille reste (b seule)
  await page.reload(); await pret(page)
  e = await page.evaluate(() => ({ pages: window.__app.pages, dans: window.__app.tableau.pagesDeLaCorbeille().map(x => x.id) }))
  verifier('après un rechargement : a, d, c ; b toujours dans la corbeille', JSON.stringify(e.pages) === JSON.stringify([ids.a, ids.d, ids.c]) && JSON.stringify(e.dans) === JSON.stringify([ids.b]), e)
  await ctx.close()
}

// ---------- 2. Le tableau d'avant le lot 2 (une page effacée) ----------
{
  const ids = JSON.parse(readFileSync(D + '/ancien-efface.json', 'utf8'))
  const { ctx, page } = await ouvrirFichier(D + '/ancien-efface.memc')
  const e = await page.evaluate(() => ({ pages: window.__app.pages, dans: window.__app.tableau.pagesDeLaCorbeille().map(x => x.id) }))
  verifier('avant le lot 2 : une page, corbeille vide', JSON.stringify(e.pages) === JSON.stringify([ids.a]) && e.dans.length === 0, e)
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
  const bouton = await page.evaluate(() => document.querySelector('.trieuse-bouton-corbeille')?.textContent)
  await page.click('.trieuse-bouton-corbeille'); await page.waitForTimeout(400)
  const cartes = await page.evaluate(CORBEILLE)
  verifier('la corbeille est vide, sans plantage', cartes.length === 0, { bouton, cartes })
  await page.keyboard.press('Escape'); await page.waitForTimeout(200); await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  const t = await tiroir(page)
  console.log('tiroir', JSON.stringify(t))
  await ctx.close()
}
await nav.close()
console.log(`${resultats.filter(x => x).length}/${resultats.length} OK`)
// Contrôle final du lot 3 : un échec se voit aussi au code de sortie
if (resultats.some(x => !x)) process.exitCode = 1
if (erreurs.length) console.log('erreurs JS :', erreurs)
