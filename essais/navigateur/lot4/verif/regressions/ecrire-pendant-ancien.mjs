// L'enregistrement automatique sur la clé retarde-t-il un trait ? Un classeur
// de 60 pages (300 traits chacune), la clé active (poignée de l'OPFS), on
// écrit pendant ~2 min 40 s sur une page vide avec de courtes pauses : on note
// les tâches longues, le retard des pointermove et les trous entre images,
// et quand la clé s'écrit (createWritable … close) par rapport aux traits.
import { chromium } from '../../../commun/playwright.mjs'
const dort = ms => new Promise(r => setTimeout(r, ms))
const URL0 = process.argv[2] || 'http://localhost:5173/'
const DUREE = Number(process.argv[3] || 165000)
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => {
  window.__cleLog = []
  window.showSaveFilePicker = async o => {
    const racine = await navigator.storage.getDirectory()
    const h = await racine.getFileHandle((o && o.suggestedName) || 'cle.memc', { create: true })
    const cw = h.createWritable.bind(h)
    h.createWritable = async (...a) => {
      const t0 = performance.now(); window.__cleLog.push({ quoi: 'createWritable', t: t0 })
      const w = await cw(...a)
      const close = w.close.bind(w)
      w.close = async () => { const r = await close(); window.__cleLog.push({ quoi: 'close', t: performance.now() }); return r }
      return w
    }
    h.queryPermission = async () => 'granted'
    h.requestPermission = async () => 'granted'
    return h
  }
})
const p = await ctx.newPage()
const erreurs = []
p.on('pageerror', e => erreurs.push(e.message))
p.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()) })
const pret = () => p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.goto(URL0); await pret(); await p.waitForTimeout(1000)
const t0 = Date.now()
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
  await attendre(4000)
})
console.log(`60 pages posées en ${Math.round((Date.now() - t0) / 1000)} s`)
await p.reload(); await pret(); await p.waitForTimeout(3000)
// Une page vide à la fin, pour écrire (les traits n'y coûtent presque rien)
await p.evaluate(() => { const a = window.__app; a.allerPage(a.pages[a.pages.length - 1]); a.nouvellePage() })
await p.waitForTimeout(800)
// La clé
const sansCle = process.argv[4] === 'sans'
if (!sansCle) {
const act = await p.evaluate(async () => { const r = await window.__cle.activer(); return { r, etat: window.__cle?.etat } })
console.log('activation :', JSON.stringify(act).slice(0, 300))
await p.waitForFunction(() => window.__cleLog.some(x => x.quoi === 'close'), null, { timeout: 60000 })
}
const taille = sansCle ? null : await p.evaluate(async () => { const r = await navigator.storage.getDirectory(); for await (const [n, h] of r.entries()) return { n, taille: (await h.getFile()).size } })
console.log('premier fichier écrit :', JSON.stringify(taille))
await p.waitForTimeout(2000)
if (process.argv[4] === 'forcer') await p.evaluate(() => { window.__forcer = true })
await p.evaluate(() => {
  window.__cleLog.length = 0
  window.__longues = []
  new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: false })
  window.__retards = []
  window.addEventListener('pointermove', e => { window.__retards.push({ t: e.timeStamp, d: performance.now() - e.timeStamp }) }, true)
  window.__images = []
  let avant = performance.now()
  const boucle = t => { window.__images.push({ t, d: t - avant }); avant = t; requestAnimationFrame(boucle) }
  requestAnimationFrame(boucle)
  const e = window.__ecrivain || { demander: async () => null }, d0 = e.demander.bind(e)
  window.__demandes = []
  e.demander = (d, o) => { const t = performance.now(); return d0(d, o).then(r => { window.__demandes.push([d.genre, Math.round(t), Math.round(performance.now())]); return r }) }
  window.__traits = []
  let bas = null
  window.addEventListener('pointerdown', e => { bas = e.timeStamp }, true)
  window.addEventListener('pointerup', e => { if (bas !== null) window.__traits.push([bas, e.timeStamp]); bas = null }, true)
  window.__app.choisirOutil('stylo')
  // Le pire : la clé s'écrit à chaque moment de calme (comme un classeur
  // dont la dernière écriture a été courte et dont le premier changement
  // pas écrit date de plus de 2 min)
  if (window.__forcer) setInterval(() => { const c = window.__cle; c.dureeDerniere = 0; if (c.premierNonEcrit !== null) c.premierNonEcrit = Date.now() - 200000 }, 200)
})
const cdpP = await ctx.newCDPSession(p)
await cdpP.send('Profiler.enable'); await cdpP.send('Profiler.setSamplingInterval', { interval: 1000 }); await cdpP.send('Profiler.start')
const t0Profil = await p.evaluate(() => performance.now())
const zone = await p.locator('#zone').boundingBox()
await p.screenshot({ path: 'ecrire-pendant-cle.png' })
console.log('page', await p.evaluate(() => JSON.stringify({ page: window.__app.page, n: window.__app.pages.length, idx: window.__app.pages.indexOf(window.__app.page), formes: window.__app.tableau.formesDe(window.__app.page)?.size, dialog: !!document.querySelector('dialog[open]'), biblio: document.body.className, outil: window.__app.outil })))
const debut = Date.now()
let k = 0
let graine = 7
const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 }
while (Date.now() - debut < DUREE) {
  const x0 = zone.x + 200 + (k % 12) * 60, y0 = zone.y + 200 + (Math.floor(k / 12) % 6) * 70
  await p.mouse.move(x0, y0); await p.mouse.down()
  for (let i = 0; i < 25; i++) { await p.mouse.move(x0 + i * 2, y0 + Math.sin(i / 2) * 15); await dort(8) }
  await p.mouse.up()
  k++
  if (k % 10 === 0) console.log('   ', Math.round((Date.now() - debut) / 1000), 's', await p.evaluate(() => { const c = window.__cle || {}; return JSON.stringify({ log: window.__cleLog.map(x => x.quoi).join(','), premier: c.premierNonEcrit && Math.round((Date.now() - c.premierNonEcrit) / 1000), en: c.enEcriture, min: c.minuterie, etat: c.etat?.etat, msg: c.etat?.message, duree: c.dureeDerniere, depuisFin: Math.round((Date.now() - c.finDerniere) / 1000), prochain: c.prochainEssai, echecs: c.echecs, attendBase: c.attendLaBase, trou: window.__app.tableau.trou, mode: window.__ecrivain?.mode }) }))
  // des pauses : souvent courtes, parfois 1,6 à 3 s (le calme vient)
  await dort(alea() < 0.25 ? 1600 + alea() * 1400 : 150 + alea() * 500)
  if (k % 60 === 0) await p.evaluate(() => { const a = window.__app; a.choisirOutil('stylo') })
}
await p.waitForTimeout(3000)
console.log('demandes à l\'écrivain :', JSON.stringify(await p.evaluate(() => window.__demandes)))
const r = await p.evaluate(() => ({ cle: window.__cleLog, longues: window.__longues, traits: window.__traits, retards: window.__retards, images: window.__images, etat: window.__cle?.etat }))
const dans = (t, [a, b]) => t >= a && t <= b
const pendantTrait = t => r.traits.some(tr => dans(t, tr))
console.log('traits :', r.traits.length, '; écritures de la clé :', JSON.stringify(r.cle.map(x => x.quoi + '@' + Math.round(x.t))))
for (const c of r.cle.filter(x => x.quoi === 'createWritable')) console.log('   createWritable pendant un trait ?', pendantTrait(c.t))
const longuesTrait = r.longues.filter(l => r.traits.some(([a, b]) => l.t < b && l.t + l.d > a))
console.log('tâches longues :', r.longues.length, JSON.stringify(r.longues.slice(0, 30)), '; dont pendant un trait :', JSON.stringify(longuesTrait))
const retTrait = r.retards.filter(x => pendantTrait(x.t))
retTrait.sort((a, b) => b.d - a.d)
console.log('retard des pointermove pendant les traits : max', Math.round(retTrait[0]?.d ?? 0), 'ms ; les 5 pires', JSON.stringify(retTrait.slice(0, 5).map(x => [Math.round(x.t), Math.round(x.d)])))
const imTrait = r.images.filter(x => pendantTrait(x.t)).sort((a, b) => b.d - a.d)
console.log('trous entre images pendant les traits : pires', JSON.stringify(imTrait.slice(0, 5).map(x => [Math.round(x.t), Math.round(x.d)])))
console.log('état de la clé :', JSON.stringify(r.etat))
const { profile } = await cdpP.send('Profiler.stop')
{
  // Les échantillons dans les tâches longues : les fonctions qui y prennent le temps (temps propre et cumulé)
  const parId = new Map(profile.nodes.map(n => [n.id, n]))
  const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id)
  let t = profile.startTime
  const debutPage = profile.startTime  // µs, horloge du profileur
  // repère : l'horloge du profileur et performance.now() de la page
  const tPage = await p.evaluate(() => performance.now())
  const decal = (profile.endTime / 1000) - tPage
  const fen = r.longues.map(l => [l.t, l.t + l.d])
  const propre = new Map(), cumul = new Map()
  for (let i = 0; i < profile.samples.length; i++) {
    t += profile.timeDeltas[i]
    const tp = t / 1000 - decal
    if (!fen.some(([a, b]) => tp >= a && tp <= b)) continue
    const n = parId.get(profile.samples[i])
    const nom = x => `${x.callFrame.functionName || '(anonyme)'} ${String(x.callFrame.url).split('/').pop()}:${x.callFrame.lineNumber}`
    propre.set(nom(n), (propre.get(nom(n)) || 0) + 1)
    const vus = new Set(); let id = n.id
    while (id !== undefined) { const x = parId.get(id); const k = nom(x); if (!vus.has(k)) { vus.add(k); cumul.set(k, (cumul.get(k) || 0) + 1) } id = parent.get(id) }
  }
  console.log('profil, temps propre (ms) :', JSON.stringify([...propre].sort((a, b) => b[1] - a[1]).slice(0, 12)))
  console.log('profil, temps cumulé (ms) :', JSON.stringify([...cumul].sort((a, b) => b[1] - a[1]).slice(0, 30)))
}
console.log('erreurs :', erreurs)
await nav.close()
