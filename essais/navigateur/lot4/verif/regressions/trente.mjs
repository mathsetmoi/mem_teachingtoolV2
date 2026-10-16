// Démarrage avec 30 classeurs (chacun quelques pages et son aperçu), puis
// la bibliothèque ouverte depuis le classeur : le temps, les tâches longues.
import { chromium } from '../../../commun/playwright.mjs'
const DEV = 'http://localhost:5173/'
const nav = await chromium.launch()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
await ctx.addInitScript(() => {
  window.__longues = []
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__longues.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }) }).observe({ type: 'longtask', buffered: true }) } catch {}
})
const p = await ctx.newPage()
const erreurs = []; p.on('pageerror', e => erreurs.push(e.message))
const pret = () => p.waitForFunction(() => window.__surveillance && window.__app && window.__bibliotheque && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 })
await p.goto(DEV); await pret(); await p.waitForTimeout(500)
const mesure = async nom => {
  const res = []
  for (let i = 0; i < 3; i++) {
    const t0 = Date.now(); await p.reload(); await pret(); const pretMs = Date.now() - t0
    const n0 = await p.evaluate(() => Math.round(performance.now()))
    await p.waitForTimeout(6000)
    const l1 = await p.evaluate(() => window.__longues.splice(0))
    const t1 = Date.now()
    await p.evaluate(() => document.querySelector('.bouton-classeur').click())
    await p.waitForFunction(() => window.__bibliotheque.ouvert && document.querySelectorAll('.grille-classeurs.tous > li').length > 0, null, { timeout: 20000 })
    const biblioMs = Date.now() - t1
    await p.waitForTimeout(3000)
    const l2 = await p.evaluate(() => window.__longues.splice(0))
    const cartes = await p.evaluate(() => ({ n: document.querySelectorAll('.grille-classeurs.tous > li').length, images: [...document.querySelectorAll('.grille-classeurs.tous .apercu-image')].filter(i => !i.hidden && i.getAttribute('src')).length }))
    await p.evaluate(() => window.__bibliotheque.fermer()); await p.waitForTimeout(300)
    res.push({ pretMs, demarrage: l1.map(x => x.d), biblioMs, biblio: l2.map(x => x.d), cartes })
  }
  console.log(nom, JSON.stringify(res))
}
await mesure('1 classeur ')
// 29 classeurs de plus, 5 pages de 100 traits chacun, avec un aperçu
await p.evaluate(async () => {
  const dem = await import('/src/classeurs/demarrage.ts'), bases = await import('/src/classeurs/bases.ts')
  const Y = await import('/node_modules/.vite/deps/yjs.js').catch(() => null)
  const T = Date.now()
  // l'état d'un classeur : celui de l'onglet, rempli puis copié
  const t = window.__app.tableau
  const trait = (x, y) => { const pts = []; for (let i = 0; i < 40; i++) pts.push(i * 6, Math.sin(i / 3) * 30, 0.5); return { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false } }
  let page = t.ordre.get(0)
  for (let k = 0; k < 5; k++) { if (k) page = t.ajouterPage('carreaux', k); t.nouveauGeste(); t.doc.transact(() => { for (let i = 0; i < 100; i++) t.poser(page, trait((i % 10) * 60, Math.floor(i / 10) * 50)) }) }
  await t.attendreEcritures()
  const etat = window.__app.tableau.doc && (await import('/node_modules/.vite/deps/yjs.js')).encodeStateAsUpdate(window.__app.tableau.doc)
  const c = document.createElement('canvas'); c.width = 320; c.height = 200; const x = c.getContext('2d'); x.fillStyle = '#eef'; x.fillRect(0, 0, 320, 200); x.fillStyle = '#123'; x.fillRect(40, 40, 100, 60)
  const png = await new Promise(r => c.toBlob(r, 'image/png'))
  for (let i = 0; i < 29; i++) {
    const id = dem.idClasseur()
    const fiche = { id, base: dem.baseDe(id), nom: `Chapitre ${i + 1}`, dossier: null, etiquettes: [], cree: T - i * 3600e3, modifie: T - i * 600e3, ouvert: T - i * 60e3 - 1e7, pages: 5 }
    await window.__registre.creerClasseur(fiche, b => bases.creerBase(b, etat, { id, nom: fiche.nom }))
    await window.__registre.ecrireApercu(id, png)
  }
})
await mesure('30 classeurs')
console.log('erreurs', erreurs)
await nav.close()
