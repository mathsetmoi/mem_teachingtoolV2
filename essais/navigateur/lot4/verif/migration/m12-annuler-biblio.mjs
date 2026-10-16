// M12. Ctrl+Z, Ctrl+Y, Suppr pendant que la bibliothèque couvre le tableau :
// ils ne doivent pas toucher au classeur caché dessous
import { O, ok, dort, pret, lancer, suivre, erreurs, serveur, attendreServeur, echecs, constats, M } from './commun.mjs'
import { mkdirSync, mkdtempSync } from 'node:fs'
const srv = serveur(); await attendreServeur()
mkdirSync(M + 'profils', { recursive: true })
const ctx = await lancer(mkdtempSync(M + 'profils/m12-'))
ctx.on('page', x => suivre(x, 'm12'))
try {
  const p = await ctx.newPage()
  await p.goto(O + '/nouveau-dev/index.html'); await pret(p); await dort(1500)
  for (let i = 0; i < 3; i++) { await p.mouse.move(300, 300 + i * 50); await p.mouse.down(); for (let k = 1; k < 10; k++) await p.mouse.move(300 + k * 15, 300 + i * 50 + k); await p.mouse.up(); await dort(300) }
  const n0 = await p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
  // Choisir tout, puis ouvrir la bibliothèque
  await p.keyboard.press('Control+a'); await dort(200)
  await p.evaluate(() => window.__app.ui.ouvrirBibliotheque()); await p.waitForSelector('.bibliotheque', { state: 'visible' }); await dort(500)
  for (const k of ['Control+z', 'Control+z', 'Control+y', 'Delete', 'Backspace', 'Control+x']) { await p.keyboard.press(k); await dort(250) }
  const n1 = await p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
  ok(n1 === n0, `dans la bibliothèque, Ctrl+Z, Ctrl+Y, Suppr, Ctrl+X ne touchent pas au classeur dessous (${n0} → ${n1})`)
  await p.keyboard.press('Escape'); await dort(300)
  await p.keyboard.press('Control+z'); await dort(300)
  const n2 = await p.evaluate(() => window.__app.tableau.formesDe(window.__app.page).size)
  console.log('après la bibliothèque, Ctrl+Z :', n1, '→', n2)
} finally {
  console.log('erreurs JS :', erreurs.length ? [...new Set(erreurs)].slice(0, 12) : 'aucune')
  await ctx.close().catch(() => {}); srv.kill()
  console.log(echecs ? `${echecs} ÉCHEC(S)\n - ` + constats.join('\n - ') : 'tout est bon')
  process.exit(echecs ? 1 : 0)
}
