import { chromium } from '../../../commun/playwright.mjs'
const dort = ms => new Promise(r => setTimeout(r, ms))
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => {
  window.__cleLog = []
  window.showSaveFilePicker = async o => {
    const racine = await navigator.storage.getDirectory()
    const h = await racine.getFileHandle((o && o.suggestedName) || 'cle.memc', { create: true })
    const cw = h.createWritable.bind(h)
    h.createWritable = async (...a) => { window.__cleLog.push({ quoi: 'createWritable', t: performance.now() }); const w = await cw(...a); const close = w.close.bind(w); w.close = async () => { const r = await close(); window.__cleLog.push({ quoi: 'close', t: performance.now() }); return r }; return w }
    h.queryPermission = async () => 'granted'
    h.requestPermission = async () => 'granted'
    return h
  }
})
const p = await ctx.newPage()
p.on('pageerror', e => console.log('pageerror', e.message))
await p.goto('http://localhost:5173/')
await p.waitForFunction(() => window.__surveillance && window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.waitForTimeout(1000)
console.log(await p.evaluate(async () => { const r = await window.__cle.activer(); return JSON.stringify({ r, etat: window.__cle.etat, dispo: window.__cle.disponible }) }))
await p.waitForTimeout(3000)
const etat = () => p.evaluate(() => { const c = window.__cle; return JSON.stringify({ log: window.__cleLog.map(x => x.quoi), premier: c.premierNonEcrit, enEcriture: c.enEcriture, minuterie: c.minuterie, verrou: c.verrou, etat: c.etat.etat, duree: c.dureeDerniere, fin: c.finDerniere, calme: window.__app.calme, formes: window.__app.tableau.formesDe(window.__app.page)?.size, maintenant: Date.now() }) })
console.log('après activation', await etat())
await p.evaluate(() => window.__app.choisirOutil('stylo'))
const zone = await p.locator('#zone').boundingBox()
await p.mouse.move(zone.x + 300, zone.y + 300); await p.mouse.down()
for (let i = 0; i < 25; i++) { await p.mouse.move(zone.x + 300 + i * 4, zone.y + 300 + Math.sin(i / 2) * 15); await dort(8) }
await p.mouse.up()
await p.waitForTimeout(500)
console.log('après un trait', await etat())
for (let s = 0; s < 6; s++) { await p.waitForTimeout(5000); console.log(`+${5 * (s + 1)} s`, await etat()) }
await nav.close()
