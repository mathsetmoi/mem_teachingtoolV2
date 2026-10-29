// T8. Le jeton expiré, le professeur n'a jamais publié depuis ce navigateur
// (il ne se sert que de la copie sur le Drive) : le clic du bandeau
// reprend-il le compte choisi la première fois (login_hint) ?
import { chromium, V, DEV, ok, info, INIT, ECOUTER_TOASTS, toasts, suivre, pret, ecrire, etat, erreurs } from './commun.mjs'
import { FauxGoogle } from '../migration/faux-google.mjs'
const MIN = 60_000
const nav = await chromium.launch()
const g = new FauxGoogle()
g.expire = 200
g.choisi = 'prof@example.org'
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await g.brancher(ctx)
const p = await ctx.newPage(); suivre(p, 'p')
await p.clock.install()
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
await p.clock.fastForward(4000); await p.waitForTimeout(300)
// Menu ⋯ → Autres sauvegardes… → Choisir le compte ou arrêter… (lot 18) : le Drive du lycée, se connecter (le compte du lycée choisi dans la liste de Google)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
// (Adapté au lot 18 : « Copie sur le Drive… » n'est plus dans le menu ⋯ ; sa fenêtre s'ouvre par « Autres sauvegardes… » → « Choisir le compte ou arrêter… »)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"]')
await p.waitForSelector('dialog.dialogue-autres[open] .as-compte')
await p.click('dialog.dialogue-autres[open] .as-compte')
await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
await p.check('dialog.dialogue-drive[open] input[name=d-compte][value=lfb]')
await p.click('dialog.dialogue-drive[open] .d-connecter')
await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
await p.click('dialog.dialogue-drive[open] .d-valider'); await p.waitForTimeout(500)
info('première connexion', g.gis[0])
await ecrire(p, 300, 300)
await p.clock.fastForward(2 * MIN + 5000); await p.waitForTimeout(1500)
info('la copie', { lycee: g.sauvegardes('prof@example.org').length, ligne: (await etat(p)).lignes.find(l => l.startsWith('drive')) })
// Une heure plus tard (ici 61 s) : le jeton a expiré ; un trait, 2 min sans geste : le bandeau
await ecrire(p, 400, 300)
await p.clock.fastForward(2 * MIN + 30_000); await p.waitForTimeout(800)
let e = await etat(p)
info('jeton expiré', { bandeau: e.bandeau, court: e.court, memoire: await p.evaluate(() => localStorage.getItem('tableau-mem:compte-google:lfb')) })
await p.click('.bandeau-sauvegarde .bouton-bandeau[data-etat-action="connecter-drive"]')
await p.waitForTimeout(600)
const second = g.gis[1]
ok(second && second.hint === 'prof@example.org' && second.prompt === '', `le clic « Se connecter à Google » reprend le compte choisi la première fois : login_hint « ${second?.hint} », prompt « ${second?.prompt} »`, g.gis)
console.log('erreurs JS :', erreurs)
await nav.close()
