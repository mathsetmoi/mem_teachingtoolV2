// Vérification « données et replay » du lot 3 : après la classe, deux heures
// plus tard, le professeur range ses pages pour le lendemain (Dupliquer la
// page ; dans la trieuse : insérer une page, changer un fond). Que propose
// ensuite « Publier le replay » (la séance choisie d'office, ses pages, ce
// que le film contient), et que dit la revue ?
import { chromium } from '../../../commun/playwright.mjs'
import { readFileSync } from 'node:fs'

const nav = await chromium.launch()
const erreurs = []
// Contrôle final du lot 3 : la sonde vérifie ce qu'elle ne faisait qu'afficher
const resultats = []
function verifier(nom, ok, detail = '') {
  resultats.push(!!ok)
  console.log(`${ok ? 'OK   ' : 'ÉCHEC'} ${nom}${detail !== '' && !ok ? ' — ' + JSON.stringify(detail) : ''}`)
}
const net = t => t.replace(/[  ]/g, ' ')
async function scenario(nom, organiser) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true })
  const page = await ctx.newPage()
  page.on('pageerror', e => erreurs.push(e.message))
  await page.goto('http://localhost:5173/')
  await page.waitForFunction(() => window.__app && window.__app.page && document.querySelector('.rang')?.textContent?.includes('/'))
  await page.waitForTimeout(500)
  // (Adapté au lot 6 : cette sonde vérifie le découpage des séances devinées
  // dans le film, qui ne sert plus qu'au document sans séances : on les met
  // hors service)
  await page.evaluate(() => { const t = window.__app.tableau; t.doc.transact(() => { t.seances.clear(); t.seanceDesPages.clear() }); t.seancesActives = false; window.__app.ui.maj() })
  await page.evaluate(() => { const vrai = Date.now.bind(Date); window.__dec = 0; Date.now = () => vrai() + window.__dec })
  const avancer = ms => page.evaluate(ms => { window.__dec += ms }, ms)
  const poser = id => page.evaluate(id => {
    const a = window.__app, t = a.tableau
    t.nouveauGeste()
    t.poser(a.page, { id, type: 'trait', x: 100 + Math.random() * 400, y: 100 + Math.random() * 300, z: Date.now(), auteur: t.moi, pts: [0, 0, 0.5, 60, 14, 0.5, 120, 0, 0.5], couleur: '#1b2230', taille: 3, opacite: 1, pression: false })
  }, id)
  // La classe : 5 gestes sur la page 1 (on la commence une demi-heure après sa création)
  await avancer(30 * 60_000)
  for (let i = 0; i < 5; i++) { await avancer(4000); await poser('c' + i); await page.waitForTimeout(40) }
  // Deux heures plus tard : on range
  await avancer(2 * 3600_000)
  await organiser(page)
  await page.waitForTimeout(300)
  // Publier
  await page.click('button[title="Publier le replay pour les élèves"]'); await page.waitForSelector('.dialogue-publier[open]')
  const d = await page.evaluate(() => {
    const s = document.querySelector('.dialogue-publier[open] .p-seance')
    return { choisie: s.options[s.selectedIndex].textContent, options: [...s.options].map(o => o.textContent).filter(t => /geste/.test(t)), pages: [...document.querySelectorAll('.p-pages input')].map(i => i.parentElement.textContent + (i.checked ? ' (cochée)' : '')) }
  })
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('.p-fichier')])
  const texte = readFileSync(await dl.path(), 'utf8')
  const film = await page.evaluate(async t => { const fm = await import('/src/revoir/format.ts'); const f = await fm.lireFilm(t); return { etapes: f.etapes, pages: f.pages, ordre: f.ordre, chapitres: f.chapitres } }, texte)
  const tiroir = await (async () => {
    await page.focus('.p-titre'); await page.keyboard.press('Escape'); await page.waitForTimeout(200)
    await page.click('button[title^="Revoir la construction"]'); await page.waitForTimeout(300)
    await page.getByRole('button', { name: /^Que revoir/ }).click(); await page.waitForTimeout(200)
    return page.evaluate(() => [...document.querySelectorAll('.revue-tiroir .revue-section')].filter(s => s.querySelector('h3')?.textContent === 'Séances').map(s => [...s.querySelectorAll('.revue-choix')].map(c => c.textContent.replace(/[  ]/g, ' '))))
  })()
  console.log(`\n== ${nom}`)
  console.log('Publier, séance choisie d\'office :', d.choisie.replace(/[  ]/g, ' '))
  console.log('Publier, toutes les séances      :', JSON.stringify(d.options.map(t => t.replace(/[  ]/g, ' '))))
  console.log('Publier, pages proposées         :', JSON.stringify(d.pages))
  console.log('le film « Enregistrer le fichier »:', JSON.stringify({ etapes: film.etapes.length, ops: film.etapes.map(e => e.o.map(o => o[0]).join('')), pages: film.pages.length, ordre: film.ordre.length, chapitres: film.chapitres }))
  console.log('revue, « Séances » du tiroir     :', JSON.stringify(tiroir))
  verifier(`${nom} : Publier choisit d'office le cours (5 gestes), seule séance proposée`, /· 5 gestes/.test(net(d.choisie)) && d.options.length === 1, d)
  verifier(`${nom} : … avec la seule page 1, cochée`, JSON.stringify(d.pages) === '["Page 1 (cochée)"]', d.pages)
  verifier(`${nom} : … et son film a les 5 gestes du cours`, film.etapes.length === 5 && film.pages.length === 1, { etapes: film.etapes.length, pages: film.pages.length })
  verifier(`${nom} : la revue compte pareil (une séance, 5 gestes)`, tiroir.flat().length === 1 && /5 gestes/.test(tiroir.flat()[0]), tiroir)
  await ctx.close()
}

await scenario('Dupliquer la page (Ctrl + Maj + D)', async page => {
  await page.mouse.move(700, 500)
  await page.keyboard.press('Control+Shift+D')
})
await scenario('Trieuse : Ctrl + D sur la page 1', async page => {
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(600)
  await page.keyboard.press('Control+d'); await page.waitForTimeout(400)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
  if (await page.evaluate(() => document.body.classList.contains('en-trieuse'))) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  console.log('pages après Ctrl + D :', await page.evaluate(() => window.__app.pages.length))
})
await scenario('Trieuse : Insérer une page après', async page => {
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(500)
  await page.evaluate(() => {
    const a = window.__app, t = a.tableau
    t.pageVue = a.page
  })
  // le bouton « Ajouter une page » du bandeau de la trieuse
  await page.getByRole('button', { name: 'Ajouter une page' }).click(); await page.waitForTimeout(300)
  await page.keyboard.press('Escape'); await page.waitForTimeout(300)
})
await scenario('Trieuse : changer le fond de la page 1 (Seyès)', async page => {
  // Par le vrai menu de la vignette (la touche Menu, puis « Seyès ») : un rangement (contrôle final)
  await page.keyboard.press('Shift+P'); await page.waitForTimeout(600)
  await page.keyboard.press('ContextMenu'); await page.waitForTimeout(300)
  await page.getByRole('menuitemradio', { name: /Seyès/ }).click(); await page.waitForTimeout(300)
  for (let k = 0; k < 3 && await page.evaluate(() => document.body.classList.contains('en-trieuse')); k++) { await page.keyboard.press('Escape'); await page.waitForTimeout(300) }
  verifier('Le fond de la page 1 est Seyès', await page.evaluate(() => window.__app.tableau.fondDe(window.__app.pages[0])) === 'seyes')
})
await nav.close()
if (erreurs.length) console.log('ÉCHEC erreurs JS :', erreurs)
const rates = resultats.filter(x => !x).length
console.log(`\n${resultats.length - rates} / ${resultats.length} vérifications réussies`)
if (rates || erreurs.length) process.exitCode = 1
