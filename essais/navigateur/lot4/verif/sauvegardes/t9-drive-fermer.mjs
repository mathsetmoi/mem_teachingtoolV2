// T9. En ligne, sans clé (Firefox, iPad, ou Chrome sans clé), le Drive
// connecté : on ferme l'onglet 30 s après le dernier trait. Le trait
// est-il sur le Drive ? (le poste remis à zéro n'aura plus que lui)
// Remis à jour au contrôle final du lot 4 : la copie partait 2 minutes après
// le trait, et fermer l'onglet avant ne demandait rien (« corrections
// sauvegardes » n'avait traité que la clé). Le comportement voulu depuis
// (README, « La copie sur le Drive », Fermer l'onglet ; essai
// lot4/CF2-drive-fermer.mjs) : comme pour la clé, fermer pose la question
// du navigateur (beforeunload) et la copie part aussitôt ; « Rester » : elle
// est sur le Drive en un instant ; « Quitter » : la page ne peut plus rien
// envoyer, rien n'est perdu dans ce navigateur. On ferme comme le professeur
// (CDP Page.close, qui passe par beforeunload), et l'on reste.
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, suivre, pret, ecrire, etat, lireMemc, formesIds, erreurs } from './commun.mjs'
import { FauxGoogle } from '../migration/faux-google.mjs'
const MIN = 60_000
const nav = await chromium.launch()
const g = new FauxGoogle()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await g.brancher(ctx)
const p = await ctx.newPage(); suivre(p, 'p')
await p.goto(DEV); await pret(p); await p.waitForTimeout(3500)
await p.click('.barre-haut .bouton.points'); await p.waitForTimeout(150)
// (Adapté au lot 18 : « Copie sur le Drive… » n'est plus dans le menu ⋯ ; sa fenêtre s'ouvre par « Autres sauvegardes… » → « Choisir le compte ou arrêter… »)
await p.click('.menu-flottant:not([hidden]) .menu-item[data-action="autres-sauvegardes"]')
await p.waitForSelector('dialog.dialogue-autres[open] .as-compte')
await p.click('dialog.dialogue-autres[open] .as-compte')
await p.waitForSelector('dialog.dialogue-drive[open] .d-connecter')
await p.click('dialog.dialogue-drive[open] .d-connecter')
await p.waitForFunction(() => /^Connecté/.test(document.querySelector('dialog.dialogue-drive[open] .d-qui')?.textContent ?? ''), null, { timeout: 10000 }).catch(() => {})
await p.click('dialog.dialogue-drive[open] .d-annuler'); await p.waitForTimeout(300)
await ecrire(p, 300, 300)
await p.waitForTimeout(30000)
const ids = await formesIds(p)
const e = await etat(p)
info('30 s après le trait', { court: e.court, ligne: e.lignes.find(l => l.startsWith('drive')), bandeau: e.bandeau })
const questions = []
p.on('dialog', d => { questions.push(d.type()); d.dismiss().catch(() => {}) })
const cdp = await ctx.newCDPSession(p)
await cdp.send('Page.close').catch(() => {})
await dort(3000)
const s = g.sauvegardes()
const lu = s[0] ? lireMemc(s[0].octets) : null
ok(questions.length === 1 && questions[0] === 'beforeunload' && !p.isClosed(), 'onglet fermé 30 s après le dernier trait : le navigateur pose sa question ; « Rester »', { questions, ferme: p.isClosed() })
ok(lu && ids.every(i => lu.ids.includes(i)), `   … la copie du Drive a le trait (${s.length} sauvegarde)`, { drive: lu?.ids ?? null, page: ids })
console.log('erreurs JS :', erreurs)
await nav.close()
