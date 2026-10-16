// 3 000 gestes réalistes : des traits de 40 à 120 points, sur 3 pages, 30 heures de cours sur trois semaines
export const FABRIQUER = async (total = 3000) => {
  const app = window.__app, t = app.tableau
  const t0 = performance.now()
  app.enLecture = true
  const pages = [app.page]
  for (let i = 0; i < 2; i++) { t.pageVue = ''; pages.push(t.ajouterPage('carreaux', i + 1)) }
  let n = 0
  for (let i = 0; i < total; i++) {
    const p = pages[Math.floor(i / 100) % 3]
    t.pageVue = p
    const np = 40 + (i * 7) % 80
    const pts = []
    for (let j = 0; j < np; j++) pts.push(j * 3, Math.sin(j / 5 + i) * 20, 0.3 + 0.4 * Math.abs(Math.sin(j / 7)))
    if (i % 60 === 59) { const f = t.formesDe(p); t.supprimer(p, [...f.keys()].slice(0, 5)) }
    else t.poser(p, { id: 'g' + n, type: 'trait', x: 40 + (n * 37) % 1100, y: 40 + (n * 53) % 650, z: n, auteur: t.moi, pts, couleur: ['#1b2230', '#1f5fbf', '#d0342c'][n % 3], taille: 3.5, opacite: 1, pression: true })
    n++
    window.__decalage += (i % 100 === 99) ? 6 * 3600_000 : 1500 + (i % 7) * 400
    if (i % 300 === 299) await new Promise(r => setTimeout(r, 0))
  }
  await new Promise(r => setTimeout(r, 50))
  window.__decalage = 0
  app.enLecture = false
  app.allerPage(pages[0]); app.rafraichir()
  return { film: t.film.length, ms: Math.round(performance.now() - t0), formes: pages.map(p => t.formesDe(p).size), pages }
}
export const CALME = async () => {
  const vues = []
  const obs = new PerformanceObserver(l => { for (const x of l.getEntries()) vues.push(x.startTime) })
  obs.observe({ type: 'longtask' })
  const t0 = performance.now()
  while (performance.now() - t0 < 20000) { await new Promise(q => setTimeout(q, 250)); const d = vues.length ? vues[vues.length - 1] : t0; if (performance.now() - d > 3000) break }
  obs.disconnect()
}
