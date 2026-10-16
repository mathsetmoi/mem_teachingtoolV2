// T7. La ligne du Drive nomme-t-elle le compte où est vraiment la dernière
// copie ? (on change de compte Google après une copie)
import { chromium, V, DEV, ok, info, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, etat, erreurs } from './commun.mjs'
import { FauxGoogle } from '../migration/faux-google.mjs'
const MIN = 60_000
const nav = await chromium.launch()
const g = new FauxGoogle()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await g.brancher(ctx)
const p = await ctx.newPage(); suivre(p, 'p')
await p.clock.install()
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await p.clock.fastForward(4000); await p.waitForTimeout(300)
async function choix(changer) {
  await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
  await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]')
  await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
  await p.click('dialog.dialogue-drive[open] .d-connecter')
  await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
  const qui = await p.textContent('dialog.dialogue-drive[open] .d-qui')
  await p.click('dialog.dialogue-drive[open] .d-annuler'); await p.waitForTimeout(300)
  return qui
}
g.choisi = 'prof@example.com'
info('connecté', await choix())
await ecrire(p, 300, 300)
await p.clock.fastForward(2 * MIN + 5000); await p.waitForTimeout(1500)
let e = await etat(p)
info('après la première copie', { ligne: e.lignes.find(l => l.startsWith('drive')), sur: g.sauvegardes('prof@example.com').length })
// Changer de compte Google (le bouton de la fenêtre « Copie sur le Drive… »), sans rien écrire de plus
g.choisi = 'autre@example.com'
info('changé', await choix())
await p.clock.fastForward(60_000); await p.waitForTimeout(500)
e = await etat(p)
const ligne = e.lignes.find(l => l.startsWith('drive'))
const ou = { 'prof@example.com': g.sauvegardes('prof@example.com').length, 'autre@example.com': g.sauvegardes('autre@example.com').length }
info('après le changement de compte', { ligne, sauvegardes: ou, fiche: await p.evaluate(async () => (await window.__registre.classeur(window.__app.classeur.id)).drive?.courriel) })
ok(!(/autre@example\.com\) : (à l'instant|il y a)/.test(ligne) && ou['autre@example.com'] === 0),
  `la ligne du Drive ne dit pas qu'une copie est sur le Drive de autre@example.com, qui n'en a aucune (« ${ligne} »)`, { ligne, ou })
console.log('erreurs JS :', erreurs)
await nav.close()
