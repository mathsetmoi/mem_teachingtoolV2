// Ce que fait le fil principal pendant que la clé s'écrit (60 pages, 18 Mo) :
// une trace Chrome (devtools.timeline, v8, gc) pendant des traits continus,
// la fabrication du fichier lancée à la main dans le travailleur.
import { chromium } from '../../../commun/playwright.mjs'
import { writeFileSync } from 'node:fs'
const dort = ms => new Promise(r => setTimeout(r, ms))
const URL0 = process.argv[2] || 'http://localhost:5173/'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage()
await p.goto(URL0)
await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.evaluate(async () => {
  const t = window.__app.tableau
  const attendre = ms => new Promise(r => setTimeout(r, ms))
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 60; i++) pts.push(i * 6 + Math.random(), Math.sin(i / 3) * 30 + Math.random(), 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
  let page = t.ordre.get(0)
  for (let k = 0; k < 60; k++) {
    if (k) page = t.ajouterPage('carreaux', k)
    t.doc.transact(() => { for (let i = 0; i < 300; i++) t.poser(page, trait((i % 20) * 40, Math.floor(i / 20) * 40)) })
    await attendre(0)
  }
  await t.attendreEcritures(); await attendre(2000); await t.attendreEcritures()
})
await p.reload()
await p.waitForFunction(() => window.__app && window.__ecrivain && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.waitForTimeout(4000)
await p.evaluate(() => { const a = window.__app; a.allerPage(a.pages[a.pages.length - 1]); a.nouvellePage(); a.choisirOutil('stylo') })
// le travailleur démarré d'abord (un petit vecteur)
await p.evaluate(() => window.__ecrivain.vecteurDeLaBase(window.__app.tableau.base))
await p.waitForTimeout(1500)
await p.evaluate(() => {
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ t: Math.round(e.startTime), d: Math.round(e.duration), a: e.attribution?.map(x => x.containerType + ':' + x.name).join(',') }) }).observe({ type: 'longtask', buffered: false })
})
const cdp = await ctx.newCDPSession(p)
const evenements = []
cdp.on('Tracing.dataCollected', d => evenements.push(...d.value))
const fini = new Promise(r => cdp.once('Tracing.tracingComplete', r))
await cdp.send('Tracing.start', { categories: 'toplevel,devtools.timeline,disabled-by-default-devtools.timeline,v8,disabled-by-default-v8.gc,blink.user_timing,IndexedDB,blink', transferMode: 'ReportEvents' })
const zone = await p.locator('#zone').boundingBox()
const modes = process.argv[3] === 'sans' ? [false] : [true]
for (const avecCle of modes) {
  const fab = avecCle ? p.evaluate(async () => { const t0 = performance.now(); performance.mark('fab-debut'); const f = await window.__ecrivain.fabriquerFichier(window.__app.tableau.base, { nom: 'x', id: window.__app.classeur.id }, Date.now(), { travailleurSeul: true }); performance.mark('fab-fin'); return { ms: Math.round(performance.now() - t0), taille: f.fichier.size } }) : Promise.resolve(null)
  const debut = Date.now()
  let k = 0
  while (Date.now() - debut < 9000) {
    const x0 = zone.x + 200 + (k % 12) * 60, y0 = zone.y + 200 + (Math.floor(k / 12) % 6) * 70
    await p.mouse.move(x0, y0); await p.mouse.down()
    for (let i = 0; i < 25; i++) { await p.mouse.move(x0 + i * 2, y0 + Math.sin(i / 2) * 15); await dort(8) }
    await p.mouse.up(); await dort(100); k++
  }
  console.log('fabrication', JSON.stringify(await fab))
}
await cdp.send('Tracing.end')
await fini
const longues = await p.evaluate(() => window.__longues)
console.log('tâches longues :', JSON.stringify(longues))
// Les événements du fil principal de la page, longs
const fils = {}
for (const e of evenements) if (e.ph === 'M' && e.name === 'thread_name') fils[e.pid + ':' + e.tid] = e.args.name
const principal = Object.entries(fils).filter(([, n]) => n === 'CrRendererMain').map(([k]) => k)
const longs = evenements.filter(e => e.ph === 'X' && e.dur > 20000 && principal.includes(e.pid + ':' + e.tid)).sort((a, b) => b.dur - a.dur)
console.log('fils principaux :', principal)
for (const e of longs.slice(0, 25)) console.log(Math.round(e.dur / 1000), 'ms', e.name, JSON.stringify(e.args).slice(0, 200))
const gc = evenements.filter(e => principal.includes(e.pid + ':' + e.tid) && /GC|Scavenge|MarkCompact|MajorGC|MinorGC/i.test(e.name) && (e.dur ?? 0) > 5000)
console.log('GC du fil principal > 5 ms :', gc.length, JSON.stringify(gc.slice(0, 15).map(e => [e.name, Math.round(e.dur / 1000)])))
writeFileSync('trace-cle.json', JSON.stringify(evenements))
await nav.close()
// Les tâches de haut niveau du fil principal de plus de 40 ms, et ce qu'elles contiennent
const tous = evenements.filter(e => principal.includes(e.pid + ':' + e.tid) && e.ph === 'X')
const taches = tous.filter(e => /RunTask|ThreadControllerImpl/.test(e.name) && e.dur > 40000)
for (const t of taches) {
  const dedans = tous.filter(e => e.ts >= t.ts && e.ts + (e.dur || 0) <= t.ts + t.dur && e !== t && (e.dur || 0) > 3000).sort((a, b) => b.dur - a.dur).slice(0, 12)
  console.log('TÂCHE', Math.round(t.dur / 1000), 'ms :', dedans.map(e => `${e.name}(${Math.round(e.dur / 1000)}${e.args?.data?.functionName ? ' ' + e.args.data.functionName : ''}${e.args?.data?.url ? ' ' + String(e.args.data.url).split('/').pop() : ''}${e.args?.data?.type ? ' ' + e.args.data.type : ''})`).join(' | '))
}
