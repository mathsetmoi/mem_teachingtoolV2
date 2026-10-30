// T1. La clé, quand on ferme l'onglet (ou le navigateur) peu après le dernier
// trait : le dernier trait arrive-t-il sur la clé ? (le cas du poste remis à
// zéro : la base du navigateur ne passera pas la nuit)
// Remis à jour au contrôle final du lot 4 : cet essai attendait, d'avant
// « corrections sauvegardes », que l'onglet fermé (Playwright répondant
// « Quitter ») ait tout de même écrit le trait. Le comportement voulu depuis
// (README, « L'enregistrement automatique sur la clé », Fermer l'onglet) :
// fermer pose la question du navigateur (beforeunload) et l'écriture part
// aussitôt ; « Rester » : le trait est sur la clé en un instant ; « Quitter » :
// la page ne peut plus rien écrire, rien n'est perdu dans ce navigateur, et
// la prochaine ouverture du classeur l'écrit sur la clé. On ferme comme le
// professeur (CDP Page.close, qui passe par beforeunload).
import { lancerPersistant, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, suivre, pret, ecrire, entree, etat, opfsLire, lireMemc, formesIds, attendreEcrites, nbEcrites, erreurs } from './commun.mjs'
/** Ferme l'onglet ; la question du navigateur, s'il la pose, reçoit `reponse` ('rester' ou 'partir') */
async function fermer(p, reponse, attente = 1200) {
  const questions = []
  const surQuestion = d => { questions.push(d.type()); (reponse === 'rester' ? d.dismiss() : d.accept()).catch(() => {}) }
  p.on('dialog', surQuestion)
  const cdp = await p.context().newCDPSession(p)
  const t = Date.now()
  await cdp.send('Page.close').catch(() => {})
  await dort(attente)
  if (!p.isClosed()) { p.off('dialog', surQuestion); await cdp.detach().catch(() => {}) }
  return { questions, ferme: p.isClosed(), t }
}
// lancerPersistant, et non chromium.launch : voir commun/playwright.mjs (la poignée de la clé relue depuis IndexedDB)
const nav = await lancerPersistant()
for (const attente of [1500, 3000, 6000]) {
  const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
  await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
  let p = await ctx.newPage(); suivre(p, 'p')
  await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
  await entree(p, 'activer-cle')
  ok(await attendreEcrites(p, 1, 15000), `[attente ${attente} ms] la clé est activée, une première écriture`)
  const nom = await p.evaluate(() => window.__ecritures[0].nom)
  // Rester
  await ecrire(p, 300, 300)
  const id1 = (await formesIds(p)).at(-1)
  info('avant de fermer', { court: (await etat(p)).court })
  await p.waitForTimeout(attente)
  const n0 = await nbEcrites(p)
  let f = await fermer(p, 'rester', 300)
  ok(f.questions.length === 1 && f.questions[0] === 'beforeunload' && !f.ferme, `[attente ${attente} ms] fermer l'onglet ${attente} ms après le dernier trait : le navigateur pose sa question ; « Rester »`, f)
  const ecrit = await attendreEcrites(p, n0 + 1, 5000)
  ok(ecrit && lireMemc(await opfsLire(p, nom)).ids.includes(id1), `   … le trait est sur la clé en un instant`, { ecrit })
  // Quitter
  await ecrire(p, 360, 340)
  const id2 = (await formesIds(p)).at(-1)
  await p.waitForTimeout(attente)
  f = await fermer(p, 'partir', 1500)
  ok(f.questions.length === 1 && f.ferme, `   … un autre trait, fermer ${attente} ms après, « Quitter » : la question, et l'onglet se ferme`, f)
  const q = await ctx.newPage()
  await q.goto(DEV + 'outil-vide.html').catch(() => {})
  ok(!lireMemc(await opfsLire(q, nom)).ids.includes(id2), '   … la page ne pouvait plus rien écrire : la clé ne l\'a pas encore')
  await q.close()
  p = await ctx.newPage(); suivre(p, 'p2')
  await p.goto(DEV); await pret(p)
  ok((await formesIds(p)).includes(id2), '   … rouvert : le trait est dans ce navigateur (rien n\'est perdu)')
  ok(await attendreEcrites(p, 1, 30000) && lireMemc(await opfsLire(p, nom)).ids.includes(id2), '   … et il s\'écrit sur la clé, seul')
  await ctx.close()
}
console.log('erreurs JS :', erreurs)
await nav.close()
