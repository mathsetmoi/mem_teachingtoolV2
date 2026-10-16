// « › » devient « + » sur la dernière page ; l'annonce du numéro ; Page↓.
// Souris, doigt (double toucher), clavier.
import { ouvrir, preparer, etat, centre, verifier, pause, fin, doigtCDP, D } from './lib.mjs'

for (const [nom, o] of [['souris', {}], ['doigt', { hasTouch: true, viewport: { width: 1024, height: 768 } }]]) {
  const { ctx, page } = await ouvrir(o, nom)
  const P = await preparer(page, 3, { ici: 1, noms: { 2: 'Exercice 12 p. 84' } })
  await page.evaluate(id => window.__app.tableau.changerFond ? null : null, P[2])
  await pause(1300)
  const b = await centre(page, '[data-mode]')
  const tap = nom === 'doigt' ? (x, y) => page.touchscreen.tap(x, y) : (x, y) => page.mouse.click(x, y)
  // Double appui sur « › » depuis l'avant-dernière page : on va sur la dernière, rien n'est créé
  if (nom === 'souris') await page.mouse.dblclick(b.x, b.y)
  else { await page.touchscreen.tap(b.x, b.y); await pause(120); await page.touchscreen.tap(b.x, b.y) }
  await pause(200)
  let e = await etat(page)
  const ann = await page.evaluate(() => ({ num: document.querySelector('.annonce-page')?.textContent, vu: !document.querySelector('.annonce-page').hidden }))
  verifier(`${nom} : double appui sur « › » depuis la page 2 : la page 3, aucune page créée`, e.page === P[2] && e.pages.length === 3, { page: e.pages.indexOf(e.page) + 1, n: e.pages.length })
  verifier(`${nom} : l'annonce dit « 3 / 3 » et le nom`, ann.vu && /3 \/ 3/.test(ann.num) && /Exercice 12 p\. 84/.test(ann.num), ann)
  const mode = await page.evaluate(() => { const x = document.querySelector('[data-mode]'); return { mode: x.dataset.mode, titre: x.title } })
  verifier(`${nom} : sur la dernière page, « › » est en mode ajout`, mode.mode === 'ajout' && /en ajouter une/.test(mode.titre), mode)
  // Le premier appui sur le tableau efface l'annonce
  const z = await centre(page, '#zone')
  await page.evaluate(() => window.__app.choisirOutil('main') )
  await tap(z.x + 200, z.y + 150); await pause(250)
  const vu = await page.evaluate(() => !document.querySelector('.annonce-page').hidden && document.querySelector('.annonce-page').classList.contains('visible'))
  verifier(`${nom} : un appui sur le tableau efface l'annonce`, !vu)
  await pause(800)
  // « + » : une page après ; depuis les retouches d'après le lot 5, blanche
  // quel que soit le fond de la page courante (ici Seyès)
  await page.evaluate(id => window.__app.tableau.changerFond(id, 'seyes'), P[2]); await pause(100)
  await tap(b.x, b.y); await pause(300)
  e = await etat(page)
  const fond = await page.evaluate(() => window.__app.tableau.fondDe(window.__app.page))
  verifier(`${nom} : « + » sur la dernière page (en Seyès) : une page 4, blanche, on y est`, e.pages.length === 4 && e.page === e.pages[3] && fond === 'blanc', { n: e.pages.length, fond })
  // Page↓ sur la dernière page : rien, un message
  await page.keyboard.press('PageDown'); await pause(150)
  e = await etat(page)
  verifier(`${nom} : Page↓ sur la dernière page ne crée rien, le message le dit`, e.pages.length === 4 && /Dernière page/.test(e.msgs.at(-1)), e.msgs.at(-1))
  await page.keyboard.press('PageUp'); await pause(150)
  e = await etat(page)
  verifier(`${nom} : Page↑ : la page 3`, e.page === P[2])
  await ctx.close()
}
await fin()
