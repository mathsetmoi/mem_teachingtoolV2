// T12. Jamais pendant un trait, sans gel : l'écriture de la clé et la copie
// du Drive arrivent à échéance pendant un long trait (horloge réelle) ;
// les tâches longues du fil principal sont notées.
import { chromium, V, DEV, ok, info, dort, INIT, ECOUTER_TOASTS, suivre, pret, ecrire, entree, etat, attendreEcrites, erreurs } from './commun.mjs'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(INIT); await ctx.addInitScript(ECOUTER_TOASTS)
await ctx.addInitScript(() => { window.__longues = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ debut: performance.timeOrigin + e.startTime, duree: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true }) } catch {} })
const p = await ctx.newPage(); suivre(p, 'p')
await p.goto(DEV); await pret(p); await p.waitForTimeout(500)
// 20 pages chargées de traits, pour que l'écriture ait du travail
await p.evaluate(async () => {
  const a = window.__app, t = a.tableau
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 4, Math.sin(i / 5) * 30, 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 3, opacite: 1, pression: false } }
  for (let k = 0; k < 300; k++) t.poser(a.page, trait(50 + (k % 50) * 15, 50 + Math.floor(k / 50) * 8))
})
await p.waitForTimeout(1500)
await entree(p, 'activer-cle')
await attendreEcrites(p, 1, 30000)
await p.evaluate(() => { window.__longues = [] })
await ecrire(p, 300, 300)
const tTrait = Date.now()
await p.waitForTimeout(17000)
// Un long trait de 12 s, qui couvre l'échéance des 20 s
await p.mouse.move(200, 500); await p.mouse.down()
const debut = Date.now()
while (Date.now() - debut < 12000) { const k = (Date.now() - debut) / 40; await p.mouse.move(200 + (k % 600), 500 + Math.sin(k / 10) * 40); await p.waitForTimeout(16) }
await p.mouse.up()
const fin = Date.now()
await p.waitForTimeout(25000)
const w = await p.evaluate(() => window.__ecritures.map(e => ({ debut: e.debut, fin: e.fin })))
const longues = await p.evaluate(() => window.__longues)
const pendant = w.filter(x => x.debut >= debut && x.debut <= fin)
const apres = w.filter(x => x.debut > fin)
info('écritures', { echeance: tTrait + 20000 - debut, pendant: pendant.length, apresLeTrait: apres.map(x => x.debut - fin) })
ok(pendant.length === 0 && apres.length >= 1 && apres[0].debut - fin >= 19000, 'aucune écriture de la clé pendant le long trait (12 s, à cheval sur l\'échéance) ; elle part 20 s après lui (le trait est un changement)', { pendant, apres: apres.map(x => x.debut - fin) })
const pendantLongues = longues.filter(l => l.debut >= debut && l.debut <= fin + 5000 && l.duree > 100)
info('tâches longues pendant le trait et l\'écriture (> 100 ms)', pendantLongues)
console.log('erreurs JS :', erreurs)
await nav.close()
