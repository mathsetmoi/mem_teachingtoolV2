// T3. La copie sur le Drive quand l'écrivain tourne sur le fil principal
// (Worker absent, ou travailleur qui n'a pas démarré à temps) : l'état
// dit-il vrai ?
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, etat, erreurs } from './commun.mjs'
import { FauxGoogle } from '../migration/faux-google.mjs'
const MIN = 60_000
const nav = await chromium.launch()
const g = new FauxGoogle()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await ctx.addInitScript(() => { window.Worker = undefined })
await g.brancher(ctx)
const p = await ctx.newPage(); suivre(p, 'p')
await p.clock.install()
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await p.clock.fastForward(4000); await p.waitForTimeout(300)
// Connexion dans un clic (menu ⋯ → Copie sur le Drive… → Se connecter à Google)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="copie-drive"]')
await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
await p.click('dialog.dialogue-drive[open] .d-connecter')
await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
await p.click('dialog.dialogue-drive[open] .d-annuler')
await p.waitForTimeout(300)
info('mode de l\'écrivain', await p.evaluate(() => window.__ecrivain.mode))
await ecrire(p, 300, 300)
await p.waitForTimeout(300)
for (const minutes of [3, 12, 30]) {
  await p.clock.fastForward((minutes === 3 ? 3 : minutes === 12 ? 9 : 18) * MIN); await p.waitForTimeout(600)
  const e = await etat(p)
  const envois = g.requetes.filter(r => r.chemin.startsWith('/upload/')).length
  info(`${minutes} min après le trait`, { envois, mode: await p.evaluate(() => window.__ecrivain.mode), drive: e.drive.etat, enAttente: e.drive.enAttente, ligne: e.lignes.find(l => l.startsWith('drive')), court: e.court, niveau: e.niveau })
  if (minutes === 30) ok(envois > 0 || !/part bientôt/.test(e.lignes.find(l => l.startsWith('drive')) ?? ''),
    `30 min après le trait, aucune copie n'est partie (${envois} envoi) : la ligne du Drive ne doit pas dire « la première copie part bientôt »`, e.lignes)
}
console.log('erreurs JS :', erreurs)
await nav.close()
