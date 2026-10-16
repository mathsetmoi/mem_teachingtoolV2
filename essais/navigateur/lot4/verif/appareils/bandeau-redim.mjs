// Le bandeau à l'écran quand la fenêtre change de taille (un vidéoprojecteur branché en plein cours) :
// suit-il le bouton du classeur, sans rien recouvrir ?
import { lancer, info, ok, dort, CAPTURES, suivre, DEV, ECOUTER_TOASTS } from './outils.mjs'
const MIN = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}:00`
const nav = await lancer()
const ctx = await nav.newContext({ viewport: { width: 1366, height: 768 } })
const p = await ctx.newPage(); suivre(p, 'redim')
await p.clock.install()
await p.goto(DEV); await p.waitForFunction(() => window.__surveillance && document.querySelector('.rang')?.textContent?.includes('/'), null, { timeout: 30000 }); await p.waitForTimeout(500)
const ecrire = y => p.evaluate(async y => { const t = window.__app.tableau, page = t.ordre.get(0); const pts = []; for (let i = 0; i < 30; i++) pts.push(i * 6, Math.sin(i / 3) * 20, 0.5); t.nouveauGeste(); t.poser(page, { id: 'T' + Math.random().toString(36).slice(2), type: 'trait', x: 300, y, z: Date.now(), auteur: t.moi, pts, couleur: '#1b2230', taille: 4, opacite: 1, pression: false }) }, y)
await ecrire(300); await p.clock.fastForward('02:31'); await p.waitForTimeout(300)
const GEO = () => {
  const b = document.querySelector('.bandeau-sauvegarde'); if (b.hidden) return null
  const rb = b.getBoundingClientRect(), autres = []
  for (const el of document.querySelectorAll('.barre button, .barre select, .bouton-classeur, .rang')) {
    if (b.contains(el) || !el.getClientRects().length || getComputedStyle(el).visibility === 'hidden') continue
    const r = el.getBoundingClientRect(); const x = Math.min(r.right, rb.right) - Math.max(r.left, rb.left), y = Math.min(r.bottom, rb.bottom) - Math.max(r.top, rb.top)
    if (x > 1 && y > 1) autres.push((el.getAttribute('aria-label') || el.title || el.className).slice(0, 30))
  }
  return { raison: b.dataset.raison, r: [Math.round(rb.left), Math.round(rb.top), Math.round(rb.right), Math.round(rb.bottom)], dansEcran: rb.right <= innerWidth && rb.left >= 0, recouvre: autres, forme: window.__app.ui.formeClasseur }
}
info('1366×768', await p.evaluate(GEO))
for (const [w, h] of [[960, 600], [1920, 1080], [1024, 768], [1366, 768]]) {
  await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(800)
  const g = await p.evaluate(GEO)
  ok(g && g.dansEcran && g.recouvre.length === 0, `redimensionné à ${w}×${h} : le bandeau suit (forme ${g?.forme}), dans l'écran, sans rien recouvrir`, g)
  await p.screenshot({ path: CAPTURES + `redim-${w}x${h}.png`, clip: { x: 0, y: 0, width: w, height: 260 } })
}
await nav.close()
