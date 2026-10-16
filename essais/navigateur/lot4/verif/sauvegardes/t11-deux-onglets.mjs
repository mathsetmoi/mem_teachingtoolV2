// T11. Deux onglets sur le même classeur : A écrit la clé, B annonce ses
// changements (au plus toutes les 5 s). B écrit deux traits à 1 s d'écart,
// puis on ferme B. Le second trait de B arrive-t-il sur la clé ?
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, suivre, pret, ecrire, entree, etat, opfsLire, lireMemc, attendreEcrites, nbEcrites, erreurs } from './commun.mjs'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
const a = await ctx.newPage(); suivre(a, 'A')
await a.goto(DEV); await pret(a); await a.waitForTimeout(500)
await entree(a, 'activer-cle')
await attendreEcrites(a, 1, 15000)
const nom = await a.evaluate(() => window.__ecritures[0].nom)
const id = await a.evaluate(() => window.__app.classeur.id)
const b = await ctx.newPage(); suivre(b, 'B')
await b.goto(DEV + '?classeur=' + id); await pret(b); await b.waitForTimeout(1500)
info('B', (await etat(b)).court)
await ecrire(b, 300, 300)
await b.waitForTimeout(1000)
await ecrire(b, 400, 350)
const idsB = await b.evaluate(() => window.__app.formes.map(f => f.id))
await b.waitForTimeout(800)
await b.close({ runBeforeUnload: true })
await a.waitForTimeout(45000)
const lu = lireMemc(await opfsLire(a, nom))
info('A', { court: (await etat(a)).court, ecritures: await nbEcrites(a) })
ok(idsB.every(i => lu.ids.includes(i)), `45 s après la fermeture de B : la clé a les deux traits de B (${lu.ids.filter(i => idsB.includes(i)).length} sur 2)`, { cle: lu.ids, b: idsB })
// Et dix minutes plus tard, A n'a rien changé : toujours pas ?
console.log('erreurs JS :', erreurs)
await nav.close()
