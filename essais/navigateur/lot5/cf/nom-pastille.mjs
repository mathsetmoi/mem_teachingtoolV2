// Contrôle final du lot 5 : la pastille ↻ d'une figure prise et le nom de son
// sommet du haut (lot 1 : le nom d'un point se tire à la main). Un triangle
// nommé A, B, C (nouvelleFigure, puis ses noms ; aussi le nom C déplacé à la main),
// pris d'un clic à la Sélection, à la souris puis au doigt ; on tire le nom C
// de 30 px vers la droite : le nom doit partir, la figure ne doit pas tourner.
import { RACINE_ESSAIS, RACINE_DEPOT } from '../../commun/racines.mjs'
import { chromium } from '../../commun/playwright.mjs'
const D = `${RACINE_ESSAIS}/lot5/cf/formule`
let echecs = 0
const ok = (c, m, d) => { if (!c) echecs++; console.log(c ? '✓' : '✗ ÉCHEC', m, d !== undefined ? '— ' + JSON.stringify(d).slice(0, 900) : '') }
const nav = await chromium.launch()
for (const [nom, o] of [['souris', {}], ['doigt', { hasTouch: true, viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 } }]]) {
  for (const [taille, decal] of [[170, null], [300, null], [170, { x: 0, y: -40 }], [170, { x: 30, y: -10 }]]) {
    const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 }, ...o })
    await ctx.route(/accounts\.google\.com|apis\.google\.com/, r => r.fulfill({ contentType: 'text/javascript', body: '' }))
    const p = await ctx.newPage(); await p.goto('http://localhost:5173/')
    await p.waitForFunction(() => window.__app && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 60000 }); await p.waitForTimeout(800)
    const cdp = await ctx.newCDPSession(p)
    const r = await p.evaluate(async ({ taille, decal }) => {
      const a = window.__app, t = a.tableau
      a.reconnaissance = false; a.cam.x = 0; a.cam.y = 0; a.cam.z = 1
      const f = a.nouvelleFigure({ type: 'polygone', ferme: true, pts: [{ x: 500, y: 560 }, { x: 700, y: 560 }, { x: 600, y: 560 - taille }] }); f.noms = ['A', 'B', 'C']; f.sommets = true; if (decal) f.posNoms = [null, null, decal]
      t.nouveauGeste(); t.poser(a.page, f)
      a.choisirOutil('selection'); a.selection.clear(); a.rendu.toutRedessiner(); a.ui.maj()
      const { placesDesNoms } = await import('/src/formes.ts')
      const q = placesDesNoms(a.forme(f.id))[2], z = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(q.x, q.y)
      const c = a.cam.versEcran(560, 560 - 10)
      return { id: f.id, noms: a.forme(f.id).noms, nomC: { x: z.left + s.x, y: z.top + s.y }, dedans: { x: z.left + c.x, y: z.top + c.y } }
    }, { taille, decal })
    // la prendre d'un clic (ou d'un toucher) sur son bord du bas
    const toucher = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y]) => ({ x, y, id: 1, radiusX: 8, radiusY: 8, force: 0.5 })) })
    if (nom === 'souris') await p.mouse.click(r.dedans.x, r.dedans.y)
    else { await toucher('touchStart', [[r.dedans.x, r.dedans.y]]); await p.waitForTimeout(60); await toucher('touchEnd', []) }
    await p.waitForTimeout(400)
    const avant = await p.evaluate(id => ({ sel: [...window.__app.selection], f: JSON.parse(JSON.stringify(window.__app.forme(id))), cadre: window.__app.cadreDeLaSelection?.() && JSON.parse(JSON.stringify(window.__app.cadreDeLaSelection())) }), r.id)
    const past = await p.evaluate(c => { const a = window.__app, z = document.getElementById('zone').getBoundingClientRect(), s = a.cam.versEcran(c.x, c.y); return { x: z.left + s.x, y: z.top + s.y } }, avant.cadre.pastille)
    const dist = Math.hypot(past.x - r.nomC.x, past.y - r.nomC.y)
    if (nom === 'souris') await p.mouse.move(r.nomC.x, r.nomC.y)
    await p.waitForTimeout(150)
    const curseur = await p.evaluate(() => document.getElementById('zone').style.cursor)
    await p.screenshot({ path: `${D}/nom-pastille-${nom}-${taille}.png`, clip: { x: Math.max(0, r.nomC.x - 200), y: Math.max(0, r.nomC.y - 120), width: 400, height: 300 } })
    // tirer le nom C de 30 px vers la droite
    if (nom === 'souris') { await p.mouse.down(); for (let k = 1; k <= 6; k++) { await p.mouse.move(r.nomC.x + 5 * k, r.nomC.y); await p.waitForTimeout(16) } await p.mouse.up() }
    else { await toucher('touchStart', [[r.nomC.x, r.nomC.y]]); for (let k = 1; k <= 6; k++) { await toucher('touchMove', [[r.nomC.x + 5 * k, r.nomC.y]]); await p.waitForTimeout(16) } await toucher('touchEnd', []) }
    await p.waitForTimeout(300)
    const apres = await p.evaluate(id => JSON.parse(JSON.stringify(window.__app.forme(id))), r.id)
    const tourne = JSON.stringify(apres.pts) !== JSON.stringify(avant.f.pts)
    const nomParti = JSON.stringify(apres.posNoms ?? null) !== JSON.stringify(avant.f.posNoms ?? null)
    ok(avant.sel.includes(r.id) && !tourne && nomParti, `${nom}, triangle de ${taille} de haut${decal ? ', nom C déplacé à la main ' + JSON.stringify(decal) : ''}, pris : tirer le nom de son sommet du haut déplace le nom (la figure ne tourne pas)`,
      { sel: avant.sel, id: r.id, distancePastilleNom: Math.round(dist * 10) / 10, curseur, tourne, nomParti, ptsAvant: avant.f.pts, ptsApres: apres.pts, posNoms: apres.posNoms ?? null })
    await ctx.close()
  }
}
await nav.close()
process.exit(echecs ? 1 : 0)
